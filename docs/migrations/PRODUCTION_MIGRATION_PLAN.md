# Servora — Production Migration Plan & Runbook

**Migration Files:**
1. `supabase/migrations/20261127000001_security_hardening_rls.sql`
2. `supabase/migrations/20261127000002_atomic_order_and_data_integrity.sql`

**Constraint Compliance:** Non-destructive schema evolution (`ADD COLUMN IF NOT EXISTS`, index additions, trigger guard, RPC definitions, `DROP POLICY IF EXISTS` + tenant-scoped `CREATE POLICY`). No tables are dropped and no existing restaurant UUIDs or customer URLs are modified.

---

## 1. Pre-Migration Data Audit (MUST RUN BEFORE APPLYING MIGRATIONS)

Because hardened RLS uses `owner_id = (SELECT auth.uid())`, check for any orphaned or null `owner_id` rows on `public.restaurants` and duplicate UTRs before enforcement:

```sql
-- 1. Identify restaurants lacking owner_id (they would lose merchant write access once strict RLS is enabled)
SELECT id, business_name, email, owner_id
FROM public.restaurants
WHERE owner_id IS NULL;

-- 2. Backfill owner_id from auth.users by verified email if needed
UPDATE public.restaurants r
SET owner_id = u.id
FROM auth.users u
WHERE r.owner_id IS NULL
  AND LOWER(r.email) = LOWER(u.email);

-- 3. Detect pre-existing duplicate UTRs that would violate idx_payment_verifications_utr_unique
SELECT UPPER(TRIM(utr_number)) AS normalized_utr, COUNT(*) AS cnt, ARRAY_AGG(id) AS ids
FROM public.payment_verifications
WHERE UPPER(COALESCE(status, '')) <> 'REJECTED'
  AND NULLIF(TRIM(utr_number), '') IS NOT NULL
GROUP BY UPPER(TRIM(utr_number))
HAVING COUNT(*) > 1;
```
Resolve any duplicate non-rejected UTR records (mark duplicates `'REJECTED'`) before running migration `20261127000002`.

```sql
-- 4. Grant platform admin role in trusted app_metadata (never user_metadata)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "SUPER_ADMIN"}'::jsonb
WHERE email = '<verified-admin-email>';
```

---

## 2. Migration Execution Order

1. **Snapshot / PITR Check:** Confirm Supabase Point-in-Time Recovery or manual `pg_dump` backup completes.
2. **Apply Migration 1:** Run `supabase/migrations/20261127000001_security_hardening_rls.sql`.
   - Creates `private` schema helpers: `private.is_platform_admin()` and `private.owns_restaurant(uuid)` (`SECURITY DEFINER`, `SET search_path = ''`, public execute revoked).
   - Creates `public.is_platform_admin()` for authenticated clients (`SECURITY DEFINER`, `SET search_path = ''`).
   - Enables RLS and replaces permissive `true` policies across all 19 operational tables.
3. **Apply Migration 2:** Run `supabase/migrations/20261127000002_atomic_order_and_data_integrity.sql`.
   - Adds `idempotency_key`, `payment_status`, `payment_method`, `is_prepaid`, `notes` on `orders`, `variant` on `order_items`, `half_price` & `quantity` non-negative check constraints on `menu_items`.
   - Creates hot RLS/lookup indexes plus partial unique indexes `idx_orders_idempotency_unique` and `idx_payment_verifications_utr_unique`.
   - Installs trigger `guard_subscription_status_transition()` blocking non-admin promotion of subscriptions to `Active`/`Approved`.
   - Creates atomic RPC `create_validated_order(...)` and public non-PII RPCs (`get_public_restaurant_profile`, `get_public_table_numbers`, `request_waiter_assistance`, `get_public_order_status`).

---

## 3. Post-Migration Verification Queries

Run in Supabase SQL Editor after applying both migrations:

```sql
-- Expect 0 rows: confirm no permissive USING(true) or WITH CHECK(true) policies remain on public tables
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true');

-- Confirm all required RPC functions exist
SELECT proname, prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'private')
  AND proname IN (
    'is_platform_admin',
    'owns_restaurant',
    'guard_subscription_status_transition',
    'create_validated_order',
    'get_public_restaurant_profile',
    'get_public_table_numbers',
    'request_waiter_assistance',
    'get_public_order_status'
  );
```

Also verify unauthenticated (`anon`) access boundaries in staging:
- `SELECT id, business_name, logo_url, cover_url` via `get_public_restaurant_profile` succeeds.
- Direct `anon` `UPDATE public.subscriptions SET status = 'Active'` fails with RLS/trigger error.
- Authenticated Tenant A reading `orders` where `restaurant_id = <Tenant B>` returns `0` rows.

---

## 4. Rollback Notes
- Schema column/index additions are additive and backward compatible with prior reads.
- If emergency application compatibility rollback is required for an individual policy during cutover, follow the targeted steps in `docs/security/RLS_SECURITY_MATRIX.md` rather than restoring blanket `FOR ALL USING (true)` policies.
