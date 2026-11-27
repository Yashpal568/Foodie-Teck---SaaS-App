# Servora — Security & Production Hardening Audit Report

**Audit Date:** 2026-11-27  
**Branch:** `security/servora-production-hardening` (under `client/` repository; root directory is uninitialized outside `client/.git`)  
**Audited Scope:** Frontend (`client/`), Backend (`server/`), Database & RLS (`client/src/docs/supabase_schema_and_rls.sql`), Deployment Configs (`vercel.json`, `wrangler.json`, `.env*`), Dependencies (`npm audit`), ESLint, and Git History (`client/.git`).

---

## Executive Summary

A full repository-level inspection of Servora's actual source code identified **24 security, reliability, and data-integrity vulnerabilities**:
- **Critical:** 8
- **High:** 9
- **Medium:** 5
- **Low:** 2

Most critically: administrator authentication occurs purely in browser JavaScript with credentials exposed in repository configuration files; `MerchantProtectedRoute` and `LoginPage` allow unauthenticated access to any real restaurant console without password verification; Supabase RLS policies widely use `USING (true)` / `WITH CHECK (true)` permitting cross-tenant read/write and self-approval of paid subscriptions; and billing/order services silently simulate `PAID` settlements and persisted orders when backend/database calls fail.

---

## Detailed Findings

### Critical Severity

#### CRIT-01: Privileged Admin Credentials Exposed in Tracked Config, Templates & Git History
- **Affected Files & Locations:**
  - `client/wrangler.json` (`vars.VITE_ADMIN_EMAIL`, `vars.VITE_ADMIN_PASSWORD`)
  - `wrangler.json` (`vars.VITE_ADMIN_EMAIL`, `vars.VITE_ADMIN_PASSWORD`)
  - `.env.cloudflare`, `.env.example`, `.env.production`
  - `client/.env.cloudflare`, `client/.env.example`, `client/.env`
  - `client/src/vite-env.d.ts` (lines 6–7)
  - `client/src/pages/admin/AdminLoginPage.jsx` (lines 30–31 fallback literals)
  - Git commits `1425b77`, `9451876`, `045b66e`, `08a3dc3` in `client/.git`
- **Technical Explanation:** Vite inlines every `VITE_*` variable into the compiled client bundle, making `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD` publicly readable by anyone downloading static JS assets from `https://servora.quantumesh.in`. Fallbacks in `AdminLoginPage.jsx` also embed default credentials directly in source.
- **Business Impact:** Any internet user can inspect the production JS bundle or tracked repo configs to extract platform owner login credentials and take over the entire multi-tenant platform.
- **Recommended Fix:** Remove all `VITE_ADMIN_*` variables from Vite env files, `wrangler.json`, `vite-env.d.ts`, and `AdminLoginPage.jsx`; authenticate admins strictly via Supabase Auth (`app_metadata.role`) + server verification; rotate exposed credentials and rewrite/scrub history only with owner authorization.
- **Verification Method:** Bundle grep (`VITE_ADMIN`), env template audit, and authenticated vs unauthenticated admin login tests.
- **Status:** Fixed in Repository Config & Code (`REQUIRES OWNER ACTION` to rotate exposed legacy credentials, delete `VITE_ADMIN_*` from live Cloudflare/Vercel dashboards, and optionally scrub `client/.git` history per `SECRET_ROTATION_GUIDE.md`).

#### CRIT-02: Client-Side Admin Authentication & Forged `sessionStorage` Tokens
- **Affected Files & Locations:**
  - `client/src/pages/admin/AdminLoginPage.jsx` (lines 24–41)
  - `client/src/components/admin/AdminProtectedRoute.jsx` (lines 12–36)
  - `client/src/components/admin/AdminHeader.jsx` (lines 627, 644–648)
- **Technical Explanation:** Admin login compares credentials in client JavaScript and mints a pseudo-token `adm_<ts>_<rand>` stored in `sessionStorage.servora_admin_token` and `servora_admin_auth = 'true'`. `AdminProtectedRoute` grants entry based on those client-mutable storage keys or `session.user.user_metadata.role === 'SUPER_ADMIN'` (which users can self-modify via `supabase.auth.updateUser()`). Logout only removes `servora_admin_token`.
- **Business Impact:** Any browser user can set `sessionStorage.setItem('servora_admin_auth', 'true')` and `sessionStorage.setItem('servora_admin_token', 'anything')` in DevTools (or update their own `user_metadata`) to gain full Admin dashboard access without logging in.
- **Recommended Fix:** Require real Supabase Auth sign-in (`signInWithPassword` + `getUser()` server JWT validation), verify `app_metadata.role` and server-side `is_platform_admin()` RPC/DB table, and revoke the Supabase session on logout.
- **Verification Method:** Vitest security tests verifying manipulated `sessionStorage` / `user_metadata` cannot authorize `AdminProtectedRoute`, and backend `/api/admin` or RPC verification rejects non-admins.
- **Status:** FIXED AND TESTED (automated tests in `client/src/__tests__/auth-and-tenant.test.js` and `server/tests/security-and-billing.test.js`; live `SUPER_ADMIN` claim assignment required per `SECRET_ROTATION_GUIDE.md`).

#### CRIT-03: Authentication & Tenant Isolation Bypass in `LoginPage.jsx` & `MerchantProtectedRoute.jsx`
- **Affected Files & Locations:**
  - `client/src/pages/marketing/LoginPage.jsx` (lines 21–33, 84–155)
  - `client/src/components/auth/MerchantProtectedRoute.jsx` (lines 35–91)
- **Technical Explanation:** `LoginPage.jsx` ignores passwords entirely (`supabase.auth.signInWithPassword(...).catch(() => {})` runs unawaited in the background) and grants immediate access to any email in `KNOWN_RESTAURANTS` or `restaurants` table, even auto-creating rows in `restaurants` on login. Worse, `MerchantProtectedRoute.jsx` authorizes ANY visitor to `/console/<restaurant_uuid_or_email>` merely if a matching record exists in `restaurants` (with zero active auth session), if `sessionStorage.servora_restaurant_id` matches, or when DB verification throws an error.
- **Business Impact:** Complete horizontal privilege escalation (IDOR) and unauthenticated console takeover across all real merchant tenants.
- **Recommended Fix:** Require awaited `supabase.auth.signInWithPassword`, verify `supabase.auth.getUser()` server-validated JWT inside `MerchantProtectedRoute`, enforce strict `restaurant.owner_id === user.id` ownership, remove `KNOWN_RESTAURANTS` auth bypass, isolate demo mode strictly to `/console/demo-merchant`, and fail closed on DB/session errors.
- **Verification Method:** Unit/integration tests for password rejection, expired sessions, cross-tenant `/console/:otherId` rejection, and demo isolation.
- **Status:** FIXED AND TESTED (`client/src/__tests__/auth-and-tenant.test.js`).

#### CRIT-04: Wide-Open Supabase RLS Policies (`USING (true)` / `WITH CHECK (true)`)
- **Affected Files & Locations:**
  - `client/src/docs/supabase_schema_and_rls.sql` (lines 324–352)
- **Technical Explanation:** Policies `"Public restaurants all"`, `"Public subscriptions all"`, `"Public payment_verifications all"`, `"Public payment_methods all"`, `"Public audit_logs all"`, `"Owners waiter calls"`, and `"Ticket replies"` allow `FOR ALL USING (true) WITH CHECK (true)`, and child operational tables (`orders`, `order_items`, `customers`, `menu_items`, etc.) lack strict tenant ownership policies.
- **Business Impact:** Any anonymous client using the public `VITE_SUPABASE_ANON_KEY` can read all merchant PII, orders, and revenue; self-approve `payment_verifications` / `subscriptions`; delete menu items; or corrupt `audit_logs`.
- **Recommended Fix:** Create versioned Postgres SQL migration replacing all permissive `true` policies with role-scoped (`TO anon`, `TO authenticated`) ownership predicates (`owner_id = (SELECT auth.uid())`), `is_platform_admin()`, read-only public views/RPCs for customer menus, and strict immutable constraints on `audit_logs`, `payment_verifications`, and `subscriptions`.
- **Verification Method:** Migration SQL verification script + `RLS_SECURITY_MATRIX.md` + automated cross-tenant & self-approval policy test checks.
- **Status:** IMPLEMENTED BUT NOT PRODUCTION-VERIFIED (Migrations `20261127000001_security_hardening_rls.sql` & `20261127000002_atomic_order_and_data_integrity.sql` authored; `REQUIRES OWNER ACTION` to execute against staging/live Supabase DB).

#### CRIT-05: Fake Payment Settlement (`PAID`) & Invoice Fallback in `billing.service.js`
- **Affected Files & Locations:**
  - `client/src/services/billing.service.js` (lines 125–202)
- **Technical Explanation:** In production (`!isLocal` and no `VITE_API_URL`), `getApiBaseUrl()` returns `null`. When `settleInvoicePayment` or `createServerInvoice` runs, the `fetch` call fails and the catch block falls through to return `{ success: true, invoice: { status: 'PAID' }, settlement: { balanceDue: 0, isFullyPaid: true } }`.
- **Business Impact:** POS checkouts silently fabricate `"PAID"` invoices without backend verification, payment ledger persistence, or tax calculation integrity.
- **Recommended Fix:** Remove fake `PAID` and fake `INV-*` fallbacks; throw explicit errors/unavailable states when authoritative billing API cannot process settlement; separate non-authoritative `calculateBillPreview` (`isPreview: true`) from server settlement; attach Bearer JWT auth headers on all billing requests.
- **Verification Method:** Automated Vitest unit/integration tests ensuring network/500 failure never resolves `{ success: true, invoice: { status: 'PAID' } }`.
- **Status:** FIXED AND TESTED (`client/src/__tests__/billing-order-upload.test.js`).

#### CRIT-06: Silent Subscription Activation Fallback in `Dashboard.jsx`
- **Affected Files & Locations:**
  - `client/src/pages/Dashboard.jsx` (lines 227–233, 252–268)
- **Technical Explanation:** When checking subscription status throws a network/DB error, `Dashboard.jsx` sets `plan = "All-in-One Unlimited"`, `utrNumber: 'ACTIVE-FALLBACK'`, `status: 'Active'`, and `isExpired = false`. Additionally, the Realtime subscription listens to ALL rows of `subscriptions` without filtering by `restaurant_id`.
- **Business Impact:** Blocked/unpaid accounts or error states bypass the subscription paywall, and Realtime approval events from Tenant B can trigger reloads/checks on Tenant A.
- **Recommended Fix:** Fail safely on verification error with an explicit retry UI instead of granting free paid plans, and scope realtime filters strictly to `restaurant_id=eq.${uuid}`.
- **Verification Method:** Unit/component tests verifying DB/network error states do not unlock `Dashboard` as active subscription.
- **Status:** IMPLEMENTED BUT NOT PRODUCTION-VERIFIED (Implemented in `Dashboard.jsx` and `SubscriptionLockOverlay.jsx`; build & lint clean).

#### CRIT-07: Non-Atomic Order Creation, Client-Trusted Prices & Race-Prone Inventory in `order.service.js`
- **Affected Files & Locations:**
  - `client/src/services/order.service.js` (lines 5–216)
- **Technical Explanation:** `createOrder` trusts client-supplied `item.price` and `gstRate`, inserts `orders`, separately updates `table_sessions`, separately inserts `order_items`, then executes unsynchronized N+1 `select` + `update` queries per item on `menu_items`. On DB failure, it fabricates a synthetic `ord-*` object as if persisted, and lacks idempotency keys.
- **Business Impact:** Attackers can submit ₹0 prices for expensive dishes; network failures create half-written orders without items or double-deduct stock on retry; DB write failures appear successful to customers.
- **Recommended Fix:** Implement an atomic Postgres RPC `create_validated_order` using `idempotency_key`, authoritative `menu_items` price/stock lookup with row locking (`FOR UPDATE`), integer/numeric precision, single-transaction insertion (`orders`, `order_items`, `table_sessions`, `notifications`), and fail loudly on real tenant DB errors (keeping demo strictly isolated).
- **Verification Method:** SQL RPC + Vitest tests verifying server price enforcement, idempotency deduplication, atomic rollback semantics, and non-silent errors.
- **Status:** FIXED AND TESTED on client/fallback (`client/src/__tests__/billing-order-upload.test.js`); live Postgres RPC requires `20261127000002` migration execution.

#### CRIT-08: Unauthenticated Express Backend API (`server/`) with Open CORS & In-Memory Financial Ledgers
- **Affected Files & Locations:**
  - `server/server.js` (lines 16–24)
  - `server/routes/billing.routes.js` (all endpoints)
  - `server/routes/email.routes.js` (all endpoints)
  - `server/lib/supabase.js` (line 4 anon-key fallback)
- **Technical Explanation:** `app.use(cors())` opens CORS to `*`; `express.json()` has no size limit; `/api/billing/*` and `/api/email/*` require zero authentication or tenant authorization (`POST /api/email/forgot-password` accepts arbitrary phishing `resetUrl`; `POST /api/billing/payment/settle` lets any unauthenticated caller settle invoices; invoices/tax rules are stored only in process RAM `Map`).
- **Business Impact:** Public email spam/phishing relay abuse, unauthorized financial manipulation, and silent loss of billing/invoice state on server restarts.
- **Recommended Fix:** Enforce CORS origin allowlist, body limits, rate limiting, request IDs, strict Zod/input validation, Supabase JWT + role/tenant ownership middleware on protected routes, DB-backed invoice/payment/tax persistence when Supabase service role is configured, and strict validation of email `resetUrl` against trusted origins.
- **Verification Method:** Express route security tests verifying 401/403 on missing/cross-tenant JWTs, 400 on negative prices/phishing URLs, and 429 on rate limits.
- **Status:** FIXED AND TESTED (`server/tests/security-and-billing.test.js` — 10/10 tests passing against mocked Supabase/SMTP adapters).

---

### High Severity (Remediation Summary)

1. **HIGH-01 — Exposed Supabase Legacy / Migration Project Ref in `client/scripts/export_database_data.js` & Unvalidated Scripts** (`client/scripts/export_database_data.js`, `verify_new_database.js`): Hardcoded project URLs/publishable keys and unguarded bulk exports. *Status:* Fixed (`process.env` required cleanly; script fails cleanly if env vars unset).
2. **HIGH-02 — Merchant PII Directory Hardcoded in Frontend Bundle** (`KNOWN_RESTAURANTS` in `LoginPage.jsx` and `restaurant.service.js`): Exposes 10+ real customer/merchant emails and UUIDs in public client JS. *Status:* Fixed & Verified (0 matches in `client/dist/assets/*.js`).
3. **HIGH-03 — Unvalidated Cloudinary Asset Uploads** (`client/src/services/cloudinary.service.js`): Permitted arbitrary MIME types including SVG XSS/HTML uploads without file size caps or tenant folder scoping. *Status:* FIXED AND TESTED (`client/src/__tests__/billing-order-upload.test.js` enforces 5 MB cap, raster MIME allowlist, path sanitization, and auth check).
4. **HIGH-04 — Cross-Tenant Realtime Subscription & PII Exposure on Public Menu** (`restaurant.service.js`, `Dashboard.jsx`, `SubscriptionLockOverlay.jsx`): *Status:* Implemented (`get_public_restaurant_profile` RPC limits public columns; realtime channels scoped to `restaurant_id=eq.${uuid}`; requires applying `20261127000002` migration for full DB RPC backing).
5. **HIGH-05 — Server Invoice & Payment State Mismatch + In-Memory Counter Reset** (`server/services/invoice.service.js`, `payment.service.js`): `table_sessions` updated `active_order_id`/`'AVAILABLE'` instead of `current_order_id`/`'available'`, and lacked idempotency keys or integer paise math. *Status:* FIXED AND TESTED (`server/tests/security-and-billing.test.js` passes; Supabase `invoices` persistence added).
6. **HIGH-06 — Silent Error Swallowing & Fake Success in `menu.service.js` & `email.service.js`**: *Status:* Fixed & Build-Verified (explicit errors returned/thrown on real failures instead of fake `{ success: true, simulated: true }` or `DEFAULT_SAMPLE_MENU` masking).
7. **HIGH-07 — Missing Order State Machine Enforcement** (`client/src/services/order.service.js`): *Status:* FIXED AND TESTED (`VALID_ORDER_TRANSITIONS` state machine verified in Vitest).
8. **HIGH-08 — Duplicate UTR Replay & Client-Side Subscription Creation** (`UPIPaymentModal.jsx`, `20261127000002_atomic_order_and_data_integrity.sql`): *Status:* Implemented (strict UTR regex + authenticated user check on client; `idx_payment_verifications_utr_unique` + `guard_subscription_status_transition` trigger authored in SQL migration; requires live migration execution).
9. **HIGH-09 — 1 Critical & 18 High `npm audit` Dependency Vulnerabilities**: *Status:* Resolved for `client/` (**20 -> 0 vulnerabilities**) and 4/5 resolved for `server/` (critical `proxy-addr`, `body-parser`, `brace-expansion`, `qs` patched). 1 high vulnerability remains in `server/` (`nodemailer` <= 10.1.3 requiring breaking major upgrade to `10.6.1`).

---

### Medium & Low Severity (Remediation Summary)

1. **MED-01 — Baseline ESLint Errors/Warnings Across Client & Scripts**: All **25** modified/added client source, service, script & test files now pass ESLint with **0 errors** (6 hook dependency warnings remain; pre-existing untouched UI files still retain legacy lint items).
2. **MED-02 — Missing Automated Security & Regression Test Suite**: *Status:* FIXED AND TESTED (`22` Vitest client tests + `10` Node HTTP/billing server tests passing).
3. **MED-03 — Personal Payment VPA (`upiId`) Hardcoded in Frontend UI**: *Status:* Implemented (`VITE_PLATFORM_UPI_ID` externalized in `UPIPaymentModal.jsx` and `SubscriptionLockOverlay.jsx`).
4. **MED-04 — Floating-Point Arithmetic in Client & Server Pricing**: *Status:* FIXED AND TESTED (integer-paise arithmetic in `calculateBillPreview` and `server/services/billing.engine.js`/`payment.service.js`).
5. **MED-05 — Missing Security Headers on Static Hosts**: *Status:* Implemented (`client/public/_headers` and `vercel.json` hardened).
6. **LOW-01 — Loose Utility Scripts in Repo Root/Client**: Tracked cleanup recommendation (`client/fix.cjs`, `client/fix3.cjs`, test PNGs, `0.26.0` artifact).
7. **LOW-02 — Missing Environment Validation at Startup (`server/lib/supabase.js`, `client/src/lib/supabase.js`)**: *Status:* Implemented (`server/lib/supabase.js` removes fallback keys completely; `client/src/lib/supabase.js` warns clearly on missing env vars).
