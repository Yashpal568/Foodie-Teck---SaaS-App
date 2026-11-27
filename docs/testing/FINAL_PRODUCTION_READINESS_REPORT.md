# Servora — Final Production Readiness & Security Verification Report

**Verification Date:** 2026-11-27  
**Auditor Scope:** Git integrity, SQL migrations, authentication & tenant isolation, billing/ordering logic, dependency advisories, production environment configuration, build, and automated tests.  
**Live Deployment Verdict:** **NOT READY FOR UNATTENDED PRODUCTION CUTOVER — READY FOR CONTROLLED STAGING ROLLOUT AFTER RESOLVING BLOCKERS BELOW**

> **Permitted Status Taxonomy Used Strictly Throughout:**  
> `FIXED AND VERIFIED` · `IMPLEMENTED BUT NOT LIVE-VERIFIED` · `REQUIRES OWNER ACTION` · `BLOCKED` · `NOT IMPLEMENTED`

---

## 1. Git Repository Integrity

| Item | Verified State | Status |
|---|---|---|
| **Actual Git Repository Root** | `E:\foodie-tech\client` (`client/.git` is the sole Git repository in the workspace) | `REQUIRES OWNER ACTION` |
| **Root Directory (`E:\foodie-tech\`)** | `Test-Path .git` = `False` (`server/`, `supabase/`, `docs/`, root `wrangler.json`, root `vercel.json`, root `.env.example`, root `.gitignore` are NOT inside any Git repository) | `REQUIRES OWNER ACTION` |
| **Active Branch (`client/.git`)** | `security/servora-production-hardening` (branched from `main` at `b8a7503`, remote `origin`: `https://github.com/Yashpal568/Foodie-Teck---SaaS-App.git`) | `FIXED AND VERIFIED` |
| **Remote / Push / Merge State** | Local working tree changes remain uncommitted on `security/servora-production-hardening`; zero commits pushed to `main` or `origin` | `FIXED AND VERIFIED` |
| **Tracked Secret Config Alert (`client/.git`)** | `.env.cloudflare` was modified (`M .env.cloudflare`) with placeholders and added to `.gitignore`, but remains **indexed/tracked** in `client/.git` until `git -C client rm --cached .env.cloudflare` is run before committing | `REQUIRES OWNER ACTION` |

### Complete File Inventory

#### A. Modified Tracked Files in `client/.git` (`M`)
`client/.env.cloudflare`, `client/.env.example`, `client/.gitignore`, `client/eslint.config.js`, `client/package-lock.json`, `client/package.json`, `client/public/_headers`, `client/scripts/export_database_data.js`, `client/scripts/verify_new_database.js`, `client/src/App.jsx`, `client/src/components/admin/AdminHeader.jsx`, `client/src/components/admin/AdminProtectedRoute.jsx`, `client/src/components/auth/MerchantProtectedRoute.jsx`, `client/src/components/dashboard/OrderManagement.jsx`, `client/src/components/dashboard/OrderNotification.jsx`, `client/src/components/dashboard/QRCodeManagement.jsx`, `client/src/components/dashboard/QRTemplateStudioModal.jsx`, `client/src/components/dashboard/Settings.jsx`, `client/src/components/dashboard/SubscriptionLockOverlay.jsx`, `client/src/components/dashboard/UPIPaymentModal.jsx`, `client/src/components/layout/Layout.jsx`, `client/src/components/layout/Sidebar.jsx`, `client/src/components/order/OrderTracking.jsx`, `client/src/components/pos/POSBillPreviewModal.jsx`, `client/src/components/pos/SplitPaymentModal.jsx`, `client/src/components/settings/NotificationSettings.jsx`, `client/src/components/settings/TaxSettings.jsx`, `client/src/components/ui/Logo.jsx`, `client/src/components/ui/NotificationDropdown.jsx`, `client/src/components/ui/dialog.jsx`, `client/src/docs/supabase_schema_and_rls.sql`, `client/src/hooks/useNotifications.js`, `client/src/hooks/useRestaurantProfile.js`, `client/src/lib/adminSupabase.js`, `client/src/lib/supabase.js`, `client/src/pages/CustomerMenu.jsx`, `client/src/pages/Dashboard.jsx`, `client/src/pages/admin/AdminLoginPage.jsx`, `client/src/pages/marketing/LoginPage.jsx`, `client/src/services/admin.service.js`, `client/src/services/billing.service.js`, `client/src/services/cloudinary.service.js`, `client/src/services/email.service.js`, `client/src/services/menu.service.js`, `client/src/services/order.service.js`, `client/src/services/restaurant.service.js`, `client/src/services/table.service.js`, `client/src/utils/tableSecurity.js`, `client/src/vite-env.d.ts`, `client/vite.config.js`, `client/wrangler.json`

#### B. Added / Untracked Files in `client/.git` (`??`)
- `client/src/__tests__/auth-and-tenant.test.js`
- `client/src/__tests__/billing-order-upload.test.js`
- `client/src/__tests__/receipt-helpers.test.js`
- `client/src/components/dashboard/WaiterCallBanner.jsx`
- `client/src/components/ui/ErrorBoundary.jsx`
- `client/src/lib/adminAuth.js`
- `client/src/lib/merchantAuth.js`
- `client/src/utils/hotelBellAudio.js`
- `client/src/utils/receiptHelpers.js`

#### C. Ignored Files in `client/.git` (`!!`)
- `client/.env`, `client/dist/`, `client/node_modules/`

#### D. Files Outside `client/.git` (Workspace Root `E:\foodie-tech\`)
- **Migrations (`supabase/migrations/`):**
  - `supabase/migrations/20261127000001_security_hardening_rls.sql`
  - `supabase/migrations/20261127000002_atomic_order_and_data_integrity.sql`
  - `supabase/migrations/20261127000003_restaurant_gstin.sql`
- **Backend (`server/`):** `server/server.js`, `server/lib/supabase.js`, `server/middleware/security.js`, `server/routes/billing.routes.js`, `server/routes/email.routes.js`, `server/services/{billing.engine.js,email.service.js,invoice.service.js,payment.service.js,pdf.service.js,tax.engine.js}`, `server/jobs/expiryCron.js`, `server/tests/security-and-billing.test.js`, `server/package.json`, `server/package-lock.json`, `server/.gitignore`, `server/.env`
- **Documentation (`docs/`):**
  - `docs/security/{SECURITY_AUDIT_REPORT.md,RLS_SECURITY_MATRIX.md,SECRET_ROTATION_GUIDE.md,INCIDENT_RESPONSE.md}`
  - `docs/architecture/PRODUCTION_ARCHITECTURE.md`
  - `docs/migrations/PRODUCTION_MIGRATION_PLAN.md`
  - `docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md`
  - `docs/testing/{QA_VERIFICATION_REPORT.md,FINAL_PRODUCTION_READINESS_REPORT.md}`
- **Root Configs (`E:\foodie-tech\`):** `.env.example`, `.env.cloudflare`, `.env.production`, `.gitignore`, `vercel.json`, `wrangler.json`

> **Git Remediation Needed (`REQUIRES OWNER ACTION`):** Because `server/`, `supabase/`, and `docs/` sit outside `client/.git`, committing inside `client/` alone will **not** version-control the backend or SQL migrations. Consolidate into a single monorepo or push `server/`/`supabase/`/`docs/` into dedicated branches before release.

---

## 2. SQL Migration Verification

All three migrations in `supabase/migrations/` were inspected line-by-line against [supabase_schema_and_rls.sql](file:///e:/foodie-tech/client/src/docs/supabase_schema_and_rls.sql) and live application queries:

| Migration / Control | Findings & Compatibility Check | Status |
|---|---|---|
| `20261127000001_security_hardening_rls.sql` | Creates unexposed `private` schema, `private.platform_admins`, `private.is_platform_admin()`, `private.owns_restaurant(uuid)`, `public.is_platform_admin()` (`SECURITY DEFINER`, `SET search_path = ''`, `REVOKE` public execute). Enables RLS and drops legacy `USING (true)` policies across all 19 tables (`restaurants`, `subscriptions`, `subscription_plans`, `payment_verifications`, `payment_methods`, `menu_categories`, `menu_items`, `table_sessions`, `qr_codes`, `orders`, `order_items`, `gst_settings`, `customers`, `support_tickets`, `ticket_replies`, `notifications`, `waiter_calls`, `audit_logs`, `invoices`). | `IMPLEMENTED BUT NOT LIVE-VERIFIED` |
| `20261127000002_atomic_order_and_data_integrity.sql` | Adds idempotency/payment/notes/variant/stock columns, hot tenant indexes, unique idempotency index `idx_orders_idempotency_unique`, non-rejected UTR unique index `idx_payment_verifications_utr_unique`, `guard_subscription_status_transition()` trigger, `get_public_restaurant_profile`, `get_public_table_numbers`, `request_waiter_assistance`, deadlock-safe `FOR UPDATE` RPC `create_validated_order`, and `get_public_order_status`. | `IMPLEMENTED BUT NOT LIVE-VERIFIED` |
| `20261127000003_restaurant_gstin.sql` | Adds optional `gstin` on `restaurants` & `gst_settings`. **Verification catch fixed during audit:** added explicit `DROP FUNCTION IF EXISTS public.get_public_restaurant_profile(UUID);` before recreating with `gstin` column (PostgreSQL rejects `CREATE OR REPLACE FUNCTION` when `RETURNS TABLE` columns change) and preserved `COALESCE(r.status, 'Active') <> 'Suspended'`. | `IMPLEMENTED BUT NOT LIVE-VERIFIED` |
| **Accidental Lockout Audit** | - **Public QR Customers:** Menu/categories/gst read directly (`anon`); restaurant profile, table picker, order submission, waiter calls, and order status use granted `SECURITY DEFINER` RPCs without exposing merchant PII.<br>- **Restaurant Owners:** Permitted on all tenant tables via `owner_id = (SELECT auth.uid())` — **pre-migration backfill required if any legacy restaurant row has `owner_id IS NULL`** (`PRODUCTION_MIGRATION_PLAN.md`).<br>- **Administrators:** Permitted via `app_metadata.role` (`SUPER_ADMIN`/`ADMIN`/`PLATFORM_ADMIN`) or `private.platform_admins`. **Requires assigning `app_metadata.role` before cutover.**<br>- **Signup Flow Caveat:** `RegisterPage.jsx` expects an immediate session from `signUp`; if Supabase "Confirm email" is enabled without DB trigger backfill, initial client inserts wait until confirmation.<br>- **Multi-User Staff Accounts:** Separate non-owner kitchen/staff user accounts do not exist in schema. | `IMPLEMENTED BUT NOT LIVE-VERIFIED` (`Staff RBAC: NOT IMPLEMENTED`) |
| **Live Supabase / Staging Execution** | No staging database credentials available in workspace; production DB intentionally untouched. Rollback instructions documented in [RLS_SECURITY_MATRIX.md](file:///e:/foodie-tech/docs/security/RLS_SECURITY_MATRIX.md) and [PRODUCTION_MIGRATION_PLAN.md](file:///e:/foodie-tech/docs/migrations/PRODUCTION_MIGRATION_PLAN.md). | `BLOCKED` |

---

## 3. Authentication & Authorization Verification

| Scenario | Evidence & Method | Status |
|---|---|---|
| Unauthenticated admin access (`AdminProtectedRoute` / `/api/admin/session`) | Verified in `auth-and-tenant.test.js` (`verifyAdminSession` -> `unauthenticated`) and `security-and-billing.test.js` (`GET /api/admin/session` -> `401`, `/api/email/status` -> `401`) using mocked Supabase Auth. | `FIXED AND VERIFIED` *(Mocked Auth)* |
| Authenticated non-admin access / `user_metadata` role spoofing | Verified in `auth-and-tenant.test.js` (`forbidden`) and `security-and-billing.test.js` (`403` on `/api/admin/session` and `/api/email/test`) even with `user_metadata.role = 'SUPER_ADMIN'`. | `FIXED AND VERIFIED` *(Mocked Auth)* |
| Valid platform admin access (`app_metadata.role` / `is_platform_admin` RPC) | Verified in `auth-and-tenant.test.js` and `security-and-billing.test.js` (`200`, `user.role = 'SUPER_ADMIN'`). | `FIXED AND VERIFIED` *(Mocked Auth)* |
| Merchant A accessing Merchant B (client route guard & backend API) | Verified in `auth-and-tenant.test.js` (`forbidden_cross_tenant`) and `security-and-billing.test.js` (`POST /api/billing/calculate` -> `403`, `GET /api/billing/invoice/:id` -> `403`). | `FIXED AND VERIFIED` *(Mocked Auth)* |
| Expired JWT handling | Verified in `auth-and-tenant.test.js` (`JWT expired` -> fail closed) and `security-and-billing.test.js` (`GET /api/admin/session` -> `401`). | `FIXED AND VERIFIED` *(Mocked Auth)* |
| Invalid / malformed JWT handling | Verified in `security-and-billing.test.js` (`Bearer invalid.jwt` -> `401`). | `FIXED AND VERIFIED` *(Mocked Auth)* |
| Database verification failure (fail-closed) | Verified in `auth-and-tenant.test.js` (`tenant_not_found` -> `authorized: false`) and `security-and-billing.test.js` (`requireRestaurantAccess` DB error -> `503`). | `FIXED AND VERIFIED` *(Mocked DB)* |
| Demo merchant isolation (`demo-merchant`) | Verified in `auth-and-tenant.test.js`, `billing-order-upload.test.js`, and live localhost browser inspection on `/console/demo-merchant?tab=orders` (no RPC/tenant DB writes). | `FIXED AND VERIFIED` |
| Forged `sessionStorage` / `fallback_auth_email` cleanup | Verified in `auth-and-tenant.test.js` (clears `servora_admin_auth`, `servora_admin_token`, `servora_admin_user`, `fallback_auth_email` before rejecting). | `FIXED AND VERIFIED` |

---

## 4. Billing, Ordering & Upload Verification

| Scenario | Evidence & Method | Status |
|---|---|---|
| Failed payment / backend unreachable (`createServerInvoice`, `settleInvoicePayment`) | Verified in `billing-order-upload.test.js`: HTTP `500`/`502` and network exceptions throw explicit errors and never fabricate `{ status: 'PAID' }` or `INV-*`. | `FIXED AND VERIFIED` |
| Duplicate order / payment submission (Idempotency) | Verified in `billing-order-upload.test.js` (`create_validated_order` called once on retry with same `idempotencyKey`) and `security-and-billing.test.js` (`processPayment` returns `idempotentReplay: true` with 1 payment). | `FIXED AND VERIFIED` |
| Invalid menu item price / negative price / >100% discount | Verified in `billing-order-upload.test.js` (`calculateBillPreview` & `createOrder` reject upfront) and `security-and-billing.test.js` (`calculateBill` throws & server overrides spoofed `₹1` price with DB price `₹140`). | `FIXED AND VERIFIED` |
| Out-of-stock item rejection | Verified in `billing-order-upload.test.js` (RPC error propagated cleanly) and `security-and-billing.test.js` (`Cold Coffee` with `is_in_stock: false` returns `400`). | `FIXED AND VERIFIED` |
| Unauthorized cross-tenant invoice read (`GET /api/billing/invoice/:id`) | Verified in `security-and-billing.test.js` (Merchant A requesting Merchant B invoice -> `403`). | `FIXED AND VERIFIED` |
| Cloudinary SVG/XSS/oversized/unauthenticated uploads | Verified in `billing-order-upload.test.js` (`image/svg+xml`, `text/html`, empty, `> 5 MB`, traversal `..`, and unauthenticated non-demo uploads blocked). | `FIXED AND VERIFIED` |
| Duplicate UTR rejection (`idx_payment_verifications_utr_unique`) | Client regex `^[A-Z0-9]{10,22}$` and error-message mapping implemented in `UPIPaymentModal.jsx`; DB uniqueness index authored in `20261127000002`, not tested against live Postgres. | `IMPLEMENTED BUT NOT LIVE-VERIFIED` |
| Concurrent inventory updates (`FOR UPDATE` row lock) | Implemented in `create_validated_order` SQL RPC (deterministic UUID lock order) and fallback `.gte('quantity', qty)`; live concurrent race testing blocked without live Postgres instance. | `IMPLEMENTED BUT NOT LIVE-VERIFIED` |
| Unauthorized subscription activation | Protected by RLS (`subscriptions_admin_update`, `subscriptions_tenant_insert_pending`) and trigger `guard_subscription_status_transition()` in SQL; fail-closed UI implemented in `Dashboard.jsx`; not live DB tested. | `IMPLEMENTED BUT NOT LIVE-VERIFIED` |

---

## 5. Dependency Security Analysis

| Package Workspace | Audit Result | Details & Recommendation | Status |
|---|---|---|---|
| **Client (`client/`)** | **0 vulnerabilities** (`npm --prefix client audit`) | All 20 baseline vulnerabilities cleanly resolved via non-breaking `npm audit fix`. Verified after adding `vitest` and `jsdom`. | `FIXED AND VERIFIED` |
| **Server (`server/`) — Non-breaking** | 4 of 5 fixed (`proxy-addr` critical, `body-parser`, `brace-expansion`, `qs`) | Resolved cleanly via `npm --prefix server audit fix`. | `FIXED AND VERIFIED` |
| **Server (`server/`) — `nodemailer@9.1.1`** | **1 high vulnerability remaining** (`range <= 10.1.3`) | Advisories include `GHSA-v53p-9fqp-m79j` / `GHSA-prgh-xp8r-p3m5` (`addressparser` quadratic ReDoS, CVSS 7.5), `GHSA-6vj9-mwq6-2f5v` (TLS servername DNS cache reuse), and parser/reply advisories fixed in `nodemailer >= 10.1.4` (`10.6.1`, `isSemVerMajor: true`). Exposure is partially mitigated because `/api/email/*` routes are `requireAuth` + `requireAdmin` (except `/forgot-password`, which enforces `EMAIL_REGEX` + rate limiting) and `email.service.js` only uses `createTransport`, `verify()`, and `sendMail()`. **Not blindly upgraded** because major bump requires live SMTP regression testing. | `REQUIRES OWNER ACTION` |

---

## 6. Production Configuration Audit (Keys Checked — Zero Secrets Printed)

| Area | Verified Configuration State | Gaps / Action Required | Status |
|---|---|---|---|
| **Frontend Env Exposure (`client/`)** | Zero `VITE_ADMIN_*` keys in `.env*`, `wrangler.json`, `client/wrangler.json`, `vite-env.d.ts`, or compiled `client/dist/assets/*.js`. | Remove legacy `VITE_ADMIN_EMAIL` & `VITE_ADMIN_PASSWORD` from live Cloudflare Pages / Vercel dashboards; set `VITE_PLATFORM_UPI_ID` cleanly. | `FIXED AND VERIFIED` / `REQUIRES OWNER ACTION` |
| **Missing Production API Config (`VITE_API_URL`)** | `VITE_API_URL` is absent in `.env.production`, `.env.cloudflare`, `wrangler.json`, and `client/wrangler.json`. | **Deployment Blocker for live POS settlement & SMTP email:** without `VITE_API_URL` pointing to the HTTPS Express backend, `createServerInvoice`, `settleInvoicePayment`, `sendForgotPasswordEmail`, `sendPurchaseSummaryEmail`, and `sendTestEmail` intentionally fail closed (`Backend unconfigured`). | `REQUIRES OWNER ACTION` |
| **Backend Env (`server/.env`)** | `server/.env` has `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FRONTEND_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`, plus unused `INSTANCE_ID` & `JWT_SECRET`. | **Critical Deployment Blocker:** `SUPABASE_SERVICE_ROLE_KEY` is **missing** in `server/.env`. Once hardened RLS (`20261127000001`) is active, `requireRestaurantAccess` and `expiryCron` require `SUPABASE_SERVICE_ROLE_KEY`; otherwise fallback to `SUPABASE_ANON_KEY` causes tenant lookup denial (`403`) on protected billing routes. Also add `ALLOWED_ORIGINS` if preview domains are needed and remove unused `INSTANCE_ID`/`JWT_SECRET`. | `REQUIRES OWNER ACTION` |
| **CORS Policy (`server/server.js`)** | Allows `https://servora.quantumesh.in`, localhost/127.0.0.1 (`5173`, `4173`), `FRONTEND_URL`, and comma-separated `ALLOWED_ORIGINS`. Unlisted origins fail (`CORS policy`). | Ensure production `FRONTEND_URL=https://servora.quantumesh.in` and add `https://www.servora.quantumesh.in` / staging host to `ALLOWED_ORIGINS`. | `FIXED AND VERIFIED` |
| **Static Host Routing & Security Headers** | `client/public/_headers` (Cloudflare) & `vercel.json` (Vercel) include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`, and SPA fallback rewrites. | Ensure Cloudflare Pages / Vercel builds from `client` with `dist` output directory. | `FIXED AND VERIFIED` |

---

## 7. Automated Tests, Build & E2E Scope Matrix

### Executed Automated Checks (Post-Final-Code-Edit)
- **Client Unit/Security Tests (`npm --prefix client test -- --run`):** **29/29 passed** (3 files: `auth-and-tenant.test.js` [11], `billing-order-upload.test.js` [12], `receipt-helpers.test.js` [6]; duration `3.42s`, **mocked Supabase/fetch**).
- **Server Security & Billing Tests (`npm --prefix server test`):** **14/14 passed** (2 suites in `security-and-billing.test.js`; duration `1.37s`, real Express 5 HTTP requests with **mocked Supabase/SMTP**).
- **Production Frontend Build (`npm --prefix client run build`):** **`✓ built in 14.02s`** (exit `0`, 3,358 modules).

### Live E2E Workflow Coverage Ledger (Honest Boundary)

| Workflow | Status | Notes |
|---|---|---|
| Demo Console Orders Kanban & Dynamic Bill Receipt UI (`localhost:5173/console/demo-merchant?tab=orders`) | `FIXED AND VERIFIED` | Verified visually in real Chrome browser (`0` console errors) plus unit-tested in `receipt-helpers.test.js`. |
| Merchant Login, Live Dashboard, Subscription Lock, Admin Dashboard (`Supabase Auth` + `app_metadata`) | `IMPLEMENTED BUT NOT LIVE-VERIFIED` | Covered by mocked unit/HTTP tests & Vite build; live Supabase E2E login not executed (`BLOCKED` on live staging credentials & SQL migration run). |
| Public QR Menu, Live Order Placement, Kitchen Updates, Invoice/Payment Persistence | `IMPLEMENTED BUT NOT LIVE-VERIFIED` | Covered by SQL migration + mocked client/server suites; live Postgres RPC/trigger/RLS execution `BLOCKED` pending staging run. **Regression risk noted:** after hardened RLS, anonymous guests on `OrderTracking.jsx` will no longer receive realtime `postgres_changes` updates on `orders` and rely on the 30s `get_public_order_status` RPC poll unless an authenticated/broadcast notification channel is added later. |

---

## 8. Deployment Blockers & Required Owner Actions Checklist

### Hard Deployment Blockers (Must Complete Before Production Rollout)
1. **Provision Backend Runtime Environment (`REQUIRES OWNER ACTION`):** Set `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`, `FRONTEND_URL=https://servora.quantumesh.in`, rotated `GMAIL_APP_PASSWORD`, and `ALLOWED_ORIGINS`, and deploy the Express backend (`server/`).
2. **Set Frontend API URL (`REQUIRES OWNER ACTION`):** Configure `VITE_API_URL` in Cloudflare Pages / Vercel so POS billing, invoices, and password-reset emails work in production; delete `VITE_ADMIN_EMAIL` & `VITE_ADMIN_PASSWORD` from hosting dashboards.
3. **Run SQL Migrations in Staging -> Production (`REQUIRES OWNER ACTION`):** Backfill any `restaurants.owner_id IS NULL`, deduplicate any conflicting UTRs, assign `raw_app_meta_data.role = 'SUPER_ADMIN'` to platform admins, and apply `20261127000001`, `20261127000002`, and `20261127000003` in numeric order (`PRODUCTION_MIGRATION_PLAN.md`).
4. **Rotate Compromised Credentials (`REQUIRES OWNER ACTION`):** Rotate legacy admin password, Supabase `service_role` key, and SMTP App Password (`SECRET_ROTATION_GUIDE.md`), untrack `client/.env.cloudflare` (`git -C client rm --cached .env.cloudflare`), and resolve Git workspace structure for `server/`, `supabase/`, and `docs/`.
5. **Verify & Upgrade `nodemailer` (`REQUIRES OWNER ACTION`):** Test `nodemailer@10.6.1` in staging against Gmail SMTP and bump `"nodemailer"` in `server/package.json` cleanly once verified.
