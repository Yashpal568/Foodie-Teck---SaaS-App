# Servora — Supabase RLS & Access Control Matrix

**Source Migrations:**
- `supabase/migrations/20261127000001_security_hardening_rls.sql`
- `supabase/migrations/20261127000002_atomic_order_and_data_integrity.sql`

All RLS helpers (`private.is_platform_admin()`, `private.owns_restaurant(uuid)`) execute inside the unexposed `private` schema with `SET search_path = ''`, explicit `(SELECT auth.uid())` checks, and `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`. Admin privileges rely solely on server-controlled `auth.jwt() -> 'app_metadata' ->> 'role'` or `private.platform_admins` (never `user_metadata`).

---

## Table-by-Table Access Matrix

| Table | RLS | `anon` (Public Guest) | `authenticated` (Merchant Owner) | Platform Admin (`is_platform_admin()`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `restaurants` | Enabled | Denied direct; uses `get_public_restaurant_profile(uuid)` | `SELECT`, `INSERT`, `UPDATE` own (`owner_id = auth.uid()`) | Full `SELECT`, `INSERT`, `UPDATE` | Protects owner email, phone, and `owner_id`. |
| `subscription_plans` | Enabled | `SELECT` active plans | `SELECT` active plans | Full `ALL` | Public catalog pricing view only. |
| `subscriptions` | Enabled | Denied | `SELECT` own; `INSERT` `PENDING_APPROVAL` only | Full `ALL` | Trigger blocks non-admin status -> `Active`/`Approved`. |
| `payment_verifications` | Enabled | Denied | `SELECT` own; `INSERT` `PENDING_APPROVAL` only | `SELECT`, `UPDATE` (`APPROVED`/`REJECTED`) | Partial unique index prevents UTR replay. |
| `payment_methods` | Enabled | Denied | `ALL` own (`owns_restaurant`) | Full `ALL` | Sensitive billing metadata isolated per tenant. |
| `menu_categories` | Enabled | `SELECT` | `ALL` own | Full `ALL` | Public customer menu visibility. |
| `menu_items` | Enabled | `SELECT` | `ALL` own | Full `ALL` | Stock & price authority locked to merchant + RPC. |
| `table_sessions` | Enabled | Denied direct; uses `get_public_table_numbers(uuid)` | `ALL` own | Full `ALL` | Prevents leaking guest counts / active order IDs. |
| `qr_codes` | Enabled | Denied | `ALL` own | Full `ALL` | Merchant generates signed URLs for floor printouts. |
| `orders` | Enabled | Denied direct; uses `create_validated_order` & `get_public_order_status` RPCs | `SELECT`, `INSERT`, `UPDATE` own | Full `ALL` (only admin may `DELETE`) | Prevents cross-tenant reads & ₹0 client price tampering. |
| `order_items` | Enabled | Denied direct; inserted inside `create_validated_order` RPC | `SELECT`, `INSERT` own | Full `ALL` | Bound atomically to parent `orders.restaurant_id`. |
| `gst_settings` | Enabled | `SELECT` | `ALL` own | Full `ALL` | Needed for menu cart tax preview display. |
| `customers` | Enabled | Denied | `ALL` own | Full `ALL` | Protects customer names, emails, and phones. |
| `support_tickets` | Enabled | Denied | `ALL` own | Full `ALL` | Tenant-isolated support cases. |
| `ticket_replies` | Enabled | Denied | `ALL` on own tickets | Full `ALL` | Joins against `support_tickets.restaurant_id`. |
| `notifications` | Enabled | Denied direct; created inside order/waiter RPCs | `ALL` own | Full `ALL` | Stops cross-tenant notification spoofing. |
| `waiter_calls` | Enabled | Denied direct; creates via `request_waiter_assistance` RPC | `ALL` own | Full `ALL` | Validates restaurant existence on call creation. |
| `audit_logs` | Enabled | Denied | `SELECT` own; append-only `INSERT` | `SELECT` all; append-only `INSERT` | `UPDATE`/`DELETE` denied for all client roles. |
| `invoices` | Enabled | Denied | `SELECT` own | Full `ALL` | Written authoritatively by backend / admin. |

---

## Staging Verification & Rollback Procedure

1. **Pre-Flight Backup:** Take a logical `pg_dump` or Supabase dashboard PITR checkpoint before running migrations.
2. **Apply Migrations in Order:** Run `20261127000001_security_hardening_rls.sql` then `20261127000002_atomic_order_and_data_integrity.sql` in Staging Supabase SQL Editor.
3. **Seed Platform Admin:** Insert the verified owner Auth UUID/email into `private.platform_admins` AND set `raw_app_meta_data = raw_app_meta_data || '{"role":"SUPER_ADMIN"}'::jsonb` on `auth.users`.
4. **Verify Cross-Tenant Isolation:** Run queries with Merchant A JWT trying to read/update Merchant B rows (must return 0 rows / permission error) and public `anon` key querying `/rest/v1/customers` & `/rest/v1/orders` (must return `[]`).
5. **Rollback:** Restore previous policies or rollback via PITR snapshot if an integration regression occurs; never re-enable `USING (true)` on `subscriptions`, `payment_verifications`, `customers`, or `orders`.
