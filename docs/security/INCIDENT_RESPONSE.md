# Servora — Security Incident Response Runbook

**System:** Servora Restaurant Management & QR Ordering SaaS (`https://servora.quantumesh.in`)  
**Owner Contact:** Platform Owner / Security Lead  
**Scope:** Credential compromise, unauthorized admin/tenant access, payment UTR fraud, email relay abuse, or DB anomaly.

---

## 1. Severity Classification

| Level | Criteria | Target Containment SLA |
|---|---|---|
| **SEV-1 (Critical)** | Exposed admin or `SUPABASE_SERVICE_ROLE_KEY`, unauthorized cross-tenant DB read/write, fraudulent `Active`/`Approved` subscription activation, or active phishing via `/api/email`. | Immediate (< 15 minutes) |
| **SEV-2 (High)** | Single merchant account takeover, Cloudinary spam/malicious file upload attempt, sustained API DoS (`429` surge), or corrupted order/inventory batch. | < 1 hour |
| **SEV-3 (Medium)** | Repeated failed admin logins, single duplicate UTR rejection, or misconfigured CORS warning. | < 24 hours |

---

## 2. Immediate Containment Playbooks

### A. Suspected Admin Account or Legacy Credential Compromise
1. **Revoke Sessions Immediately:** In Supabase Dashboard -> Authentication -> Users -> select affected admin user -> **Sign out all sessions / Ban temporarily**.
2. **Audit Privileged Actions:** Query `public.audit_logs` and `public.payment_verifications` for approvals or role changes after the suspected timestamp:
   ```sql
   SELECT id, actor, action, details, created_at
   FROM public.audit_logs
   ORDER BY created_at DESC
   LIMIT 100;
   ```
3. **Verify `app_metadata` Integrity:** Ensure no unauthorized user acquired `role` claims in `auth.users`:
   ```sql
   SELECT id, email, raw_app_meta_data
   FROM auth.users
   WHERE raw_app_meta_data->>'role' IN ('SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN');
   ```
4. Follow `docs/security/SECRET_ROTATION_GUIDE.md` to rotate admin credentials and `SUPABASE_SERVICE_ROLE_KEY`.

### B. Suspected Cross-Tenant Data Access or Subscription Tampering
1. Confirm migrations `20261127000001_security_hardening_rls.sql` and `20261127000002_atomic_order_and_data_integrity.sql` are active:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```
2. Verify no permissive `USING (true)` policies remain:
   ```sql
   SELECT schemaname, tablename, policyname, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public'
     AND (qual = 'true' OR with_check = 'true');
   ```
3. Check `subscriptions` and `payment_verifications` for unauthorized status changes or duplicate UTRs:
   ```sql
   SELECT restaurant_id, status, utr_number, updated_at
   FROM public.subscriptions
   ORDER BY updated_at DESC
   LIMIT 50;
   ```

### C. Suspected Payment UTR Fraud / Invoice Replay
1. Check `payment_verifications` for matching `UPPER(TRIM(utr_number))` and compare against real bank/UPI statement.
2. Mark fraudulent submission `'REJECTED'` in Admin Verifications (which frees `idx_payment_verifications_utr_unique` only for legitimate non-rejected records) and downgrade/suspend the associated `subscriptions` and `restaurants.is_suspended` flags.

### D. Backend Email / API Abuse
1. Inspect structured JSON request logs (`requestId`, `method`, `path`, `status`, `durationMs` from `server/middleware/security.js`).
2. Confirm `ALLOWED_ORIGINS` / `FRONTEND_URL` excludes untrusted domains and `NODE_ENV=production` is set.
3. Temporarily revoke the SMTP App Password if email quota is spammed, then inspect `/api/email/forgot-password` request volume.

---

## 3. Recovery & Post-Incident Checklist
- Confirm `private.is_platform_admin()`, `private.owns_restaurant(uuid)`, and `private.guard_subscription_status_transition()` remain intact.
- Confirm frontend build in `client/dist/` passes verification with zero `VITE_ADMIN_*` tokens.
- Document root cause, blast radius, affected tenants, and preventive regression test before closing incident.
