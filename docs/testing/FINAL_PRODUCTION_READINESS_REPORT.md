# Servora — Final Production Readiness & Pre-Deployment Verification Report

**Verification Date:** 2026-11-27  
**Auditor Scope:** Git state & diff verification, legacy admin credential audit, full `190`-commit Git history secret audit & `git filter-repo` remediation plan, deployment config audit (Vercel, Cloudflare Workers/Pages, Express 5 API), Supabase migrations & staging readiness, Nodemailer `10.6.1` compatibility & SMTP smoke-test plan, and Production Go/No-Go criteria.  
**Controlled Staging Verdict:** **READY FOR CONTROLLED STAGING ROLLOUT AFTER COMPLETING OWNER ENVIRONMENT & DOMAIN ACTIONS BELOW**  
**Production Cutover Verdict:** **NO-GO UNTIL ALL CRITICAL PRODUCTION GATES IN SECTION 9 ARE PROVEN GREEN**

> **Permitted Status Taxonomy Used Strictly Throughout:**  
> `FIXED AND VERIFIED` · `IMPLEMENTED BUT NOT LIVE-VERIFIED` · `REQUIRES OWNER ACTION` · `BLOCKED` · `NOT IMPLEMENTED`

---

## 1. Current Git State & Working Tree Verification

| Check | Verified Result | Status |
|---|---|---|
| **Canonical Git Root** | `E:\foodie-tech\.git` | `FIXED AND VERIFIED` |
| **Current Checked-Out Branch** | `main` at `e5b52f3` (`e5b52f301b47c3e17a6b9b478dab4edb1586d520`), tracking `origin/main` cleanly | `FIXED AND VERIFIED` |
| **Synced Remote & Branch Refs (`git show-ref`)** | `refs/heads/main`, `refs/heads/security/servora-production-hardening`, `refs/remotes/origin/main`, `refs/remotes/origin/security/servora-production-hardening`, and `refs/remotes/origin/HEAD` all point identically to `e5b52f301b47c3e17a6b9b478dab4edb1586d520`; `refs/remotes/origin/feature/backend-foundation` sits at `4542de2e`. | `FIXED AND VERIFIED` |
| **GitHub `origin/main` Untouched** | Zero local commits since `e5b52f3`; nothing pushed, reset, stashed, or rewritten during this check. | `FIXED AND VERIFIED` |

### Exact Uncommitted Workspace Files (`git status -s` & `git diff`)
1. `CLOUDFLARE_DEPLOYMENT_GUIDE.md` (`M`): Replaced obsolete `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD` (`admin123`) table entries (`-2/+2` lines) with `VITE_APP_URL` and `VITE_API_URL`.
2. `server/package.json` (`M`): Upgraded `"nodemailer"` from `"^9.0.5"` → `"^10.6.1"`.
3. `server/package-lock.json` (`M`): Updated resolved `nodemailer` `9.1.1` → `10.6.1` (`engines.node >= 20.0.0`).
4. `server/tests/email-nodemailer.test.js` (`??`): Added Nodemailer `10.6.1` `streamTransport` MIME serialization & `email.service.js` template/guard tests (`2` test cases).
5. `docs/testing/FINAL_PRODUCTION_READINESS_REPORT.md` (`M`): This updated pre-deployment & staging verification report.
*(Note: `client/src/components/dashboard/QRCodeManagement.jsx`, `client/src/services/table.service.js`, and `client/src/utils/tableSecurity.js` also show `M` in `git status -s` purely from Windows CRLF/LF autocrlf stat conversion with `0` content diff lines in `git diff`.)*

- **Branch Placement Recommendation:** When authorized to commit, commit these updates onto **`security/servora-production-hardening`** for staging review first, then fast-forward / PR-merge into **`main`** once staging gates pass so both branches stay aligned.

---

## 2. Legacy Admin Credential Remediation Audit

Searched the entire workspace (`git grep`) for `VITE_ADMIN_PASSWORD`, `VITE_ADMIN_EMAIL`, `admin123`, `servora_admin_auth`, `servora_admin_token`, and `admin@servora.com`:

| Finding Location | Classification | Runtime Impact | Status |
|---|---|---|---|
| **Active Runtime Auth (`AdminProtectedRoute.jsx`, `AdminLoginPage.jsx`, `adminAuth.js`, `AdminHeader.jsx`, `server/middleware/security.js`)** | Clean | **Zero dependency** on `VITE_ADMIN_*`, `'admin123'`, or storage flags. Admin access relies exclusively on server-verified Supabase JWT (`app_metadata.role` ∈ `{'SUPER_ADMIN','ADMIN','PLATFORM_ADMIN'}`), `private.platform_admins`, and `/api/admin/session`. | `FIXED AND VERIFIED` |
| `client/src/lib/adminAuth.js` (`LEGACY_ADMIN_KEYS`) | Defensive cleanup constant | Lists `['servora_admin_token', 'servora_admin_auth', 'servora_admin_user']` strictly to **delete** stale keys via `clearLegacyAdminStorage()`. Verified by `auth-and-tenant.test.js`. | `FIXED AND VERIFIED` |
| `client/src/lib/audit.js:10` | Non-auth fallback log label | Uses `'admin@servora.com'` only as a fallback `actor` display string when `session?.user?.email` is absent in client audit logging; grants zero privileges. | `FIXED AND VERIFIED` |
| `docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md`, `docs/security/*`, `docs/testing/*` | Historical audit / rotation documentation | Documents removed legacy credentials and cleanup steps. | `FIXED AND VERIFIED` |

### Hosting Dashboard Cleanup Checklist (`REQUIRES OWNER ACTION`)
- **Cloudflare Dashboard (`Workers & Pages` → `servora` → `Settings` → `Variables and Secrets`):**
  1. Delete `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD` if present in **Production** or **Preview** environments.
  2. Verify `VITE_APP_URL=https://servora.quantumesh.in` and (after backend deploy) `VITE_API_URL=<https-backend-url>`.
- **Vercel Dashboard (`Project Settings` → `Environment Variables`):**
  1. Delete `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD` across **Production**, **Preview**, and **Development** scopes.
  2. Confirm **no** `SUPABASE_SERVICE_ROLE_KEY` or `SMTP`/`GMAIL` secrets exist in Vercel/Cloudflare frontend env vars.
- **Credential Rotation:** Rotate any admin mailbox/login password that previously reused the legacy shared credential (`SECRET_ROTATION_GUIDE.md`).

---

## 3. Full Git History Secret Audit & Safe `git filter-repo` Cleanup Plan

Scanned all **`190` reachable commits** (`git rev-list --all`) without exposing secret values:

| Secret Category | Affected Commits & File Paths | Genuine vs Placeholder | Rotation Required |
|---|---|---|---|
| **Legacy Admin Password (`VITE_ADMIN_PASSWORD` / `'admin123'`)** | `671fe38`..`b8a7503c`, `1425b770`, `9451876d`, `c5006ae7`, `22d1d9b0`: `.env.cloudflare` (deleted in `a4e4800d`), `.env.example`, `src/pages/admin/AdminLoginPage.jsx`, `src/lib/adminSupabase.js`, `src/vite-env.d.ts` | Legacy active/fallback password literal | **Yes** (rotate credential & clear dashboard vars) |
| **Supabase Anon JWT (`JWT(role=anon)`)** | `1425b770`..`e5b52f3`: `.env.cloudflare`, `.env.example`, `wrangler.json`, `client/wrangler.json`, `src/lib/supabase.js`, `client/scripts/*` | Public client `anon` key (`role="anon"`), protected by RLS | No |
| **Supabase Service-Role Key / SMTP / DB Passwords / JWT Secrets / Private Keys / Tokens** | `a4e4800d`..`e5b52f3` (`server/lib/supabase.js`, `server/.env.example`, docs) | Code expressions (`process.env.*`), doc identifiers, and `.env.example` placeholders only (**`0` genuine secrets in all 190 commits**) | Local `server/.env` App Password / service-role rotation recommended only if ever shared externally |

### Coordinated Git History Rewrite Procedure (`REQUIRES OWNER ACTION` — Do NOT Run Unannounced)
- **Affected Refs:** `refs/heads/main`, `refs/heads/security/servora-production-hardening`, `refs/remotes/origin/main`, `refs/remotes/origin/security/servora-production-hardening`, and historical branch `refs/remotes/origin/feature/backend-foundation` (`4542de2e`).
- **Preconditions & Backup:**
  1. Freeze pushes/merges across collaborators (`Yashpal568/Foodie-Teck---SaaS-App`).
  2. Create full bare mirror backup outside workspace: `git clone --mirror https://github.com/Yashpal568/Foodie-Teck---SaaS-App.git servora-repo-backup.git`.
- **Execution Plan (`git-filter-repo`):**
  1. Prepare an untracked replacement rules file outside the repo (containing legacy fallback literal strings mapped to `REDACTED_LEGACY_CREDENTIAL`).
  2. Run on a fresh clone:
     ```bash
     git filter-repo --invert-paths --path .env.cloudflare
     git filter-repo --replace-text ../replacements.txt
     ```
  3. Verify `git log --all -S` shows zero residual `.env.cloudflare` blobs or literal strings, and verify latest tree matches pre-rewrite `HEAD` (`git diff`).
- **Force-Push & Coordination Implications:**
  - Every rewritten commit SHA changes; force-pushing (`git push --force --all`) breaks existing local clones/PRs and requires deleting/re-creating open feature branches and having all developers fresh-clone (`git clone`) rather than `git pull`.
  - Ask GitHub Support / clear GitHub object caches for cached commit views if external exposure cleanup is required, and **still rotate** the legacy credential regardless of rewrite.

---

## 4. Deployment Configuration & Environment Matrix

### Authoritative Hosting Topology
- **Current Live Custom Domain (`https://servora.quantumesh.in`):** Currently DNS-routed to **Vercel** (`server: Vercel`, serving pre-consolidation bundle `assets/index-C-W8ryYD.js`), where `vercel.json` at repo root configures `"buildCommand": "cd client && npm install && npm run build"`, `"outputDirectory": "client/dist"`, `"framework": "vite"`, SPA rewrite `/(.*) -> /index.html"`, and strict headers (`X-Frame-Options: DENY`). *(Fallback `client/vercel.json` exists only if Vercel Root Directory is explicitly set to `client`.)*
- **Cloudflare Workers Static Assets (`https://servora.yash38688.workers.dev`):** Root `wrangler.json` (`name: "servora"`, `assets.directory: "./client/dist"`, `not_found_handling: "single-page-application"`) is deployed and serving updated bundle `assets/index-CIVk6RRy.js`. `client/wrangler.json` (`assets.directory: "./dist"`) is aligned for `client/` root builds.
- **Authoritative Frontend Decision Required:** Designate **either** **Vercel** (fix Vercel Root Directory `.` + `vercel.json` build on `main`) **or** **Cloudflare Workers** (attach custom domain `servora.quantumesh.in` to `servora` Worker in Cloudflare Dashboard and remove Vercel DNS) as the single canonical production frontend host so deployments cannot drift.
- **Backend Express 5 API (`server/server.js`):** Not yet deployed externally; listens on `process.env.PORT || 5000`, mounts `/api/email`, `/api/billing`, `/api/admin/session`, `helmet()`, `requestContext`, rate limiting (`180 req/min` global `/api`, `15 req/min` `/api/email`), and `initExpiryCron()`.
- **Backend CORS Allowlist (`server/server.js`):** `https://servora.quantumesh.in`, `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`, `process.env.FRONTEND_URL`, and comma-separated `process.env.ALLOWED_ORIGINS`. Unlisted origins fail closed (`403`).

### Required Environment Variables (Zero Secret Values Exposed)

| Variable Name | Location / Host | Public vs Secret | Verified Local State (`client/.env` / `server/.env`) | Notes |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (`client/.env`, Vercel, Cloudflare `wrangler.json`) | Public | `<SET>` | Supabase project HTTPS URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend (`client/.env`, Vercel, Cloudflare `wrangler.json`) | Public (`anon` role) | `<SET>` | Protected by Postgres RLS |
| `VITE_APP_URL` | Frontend (`client/.env`, Vercel, Cloudflare `wrangler.json`) | Public | `<SET>` | `https://servora.quantumesh.in` (prevents `localhost` QR URLs) |
| `VITE_API_URL` | Frontend (Vercel, Cloudflare runtime/build) | Public | **Unset** (`REQUIRES OWNER ACTION`) | Required for live POS billing/invoices & backend SMTP triggers |
| `VITE_CLOUDINARY_CLOUD_NAME` | Frontend (`client/.env`, Vercel, Cloudflare) | Public | `<SET>` | Cloudinary unsigned upload target |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Frontend (`client/.env`, Vercel, Cloudflare) | Public | `<SET>` | Unsigned upload preset |
| `VITE_PLATFORM_UPI_ID` | Frontend (Vercel, Cloudflare) | Public (optional) | Unset (defaults in UI) | Platform UPI VPA shown in subscription checkout |
| `NODE_ENV` | Backend (`server/` host) | Config (`production`) | Unset (`REQUIRES OWNER ACTION`) | Suppresses stack/verbose error output |
| `PORT` | Backend (`server/.env` / PaaS) | Config | `<SET>` | Defaults to `5000` |
| `SUPABASE_URL` | Backend (`server/.env` / PaaS) | Public | `<SET>` | Must match project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend (`server/.env` / PaaS) | **SECRET (Server-Only)** | **MISSING** (`REQUIRES OWNER ACTION`) | Critical: `server/lib/supabase.js` falls back to `anon` without it, breaking protected server tenant checks & cron under RLS |
| `FRONTEND_URL` | Backend (`server/.env` / PaaS) | Config | `<SET>` | Must be `https://servora.quantumesh.in` in prod (CORS & trusted email links) |
| `ALLOWED_ORIGINS` | Backend (`server/` host) | Config | Unset (recommended) | Comma-separated staging/www origins |
| `GMAIL_USER` | Backend (`server/.env` / PaaS) | Config / Secret | `<SET>` | Sender Gmail address |
| `GMAIL_APP_PASSWORD` | Backend (`server/.env` / PaaS) | **SECRET (Server-Only)** | `<SET>` | 16-char Google App Password (simulation mode activates if omitted) |
| `EMAIL_FROM` | Backend (`server/.env` / PaaS) | Config | `<SET>` | Display sender header |
| `INSTANCE_ID`, `JWT_SECRET` | Local `server/.env` | Unused legacy keys | `<SET>` | Not referenced anywhere in `server/`; clean up on host |

---

## 5. Staging Readiness, Migrations & Incomplete Features

### Migration Execution Order & Preconditions
1. `supabase/migrations/20261127000001_security_hardening_rls.sql` — creates `private` schema, `private.platform_admins` (RLS enabled), `private.is_platform_admin()`, `private.owns_restaurant()`, `public.is_platform_admin()`, drops permissive policies, enforces strict tenant/admin RLS on all 19 tables.
2. `supabase/migrations/20261127000002_atomic_order_and_data_integrity.sql` — adds order/menu integrity columns & indexes, quarantines duplicate non-`REJECTED` UTRs before `idx_payment_verifications_utr_unique`, adds `guard_subscription_status_transition()`, `DROP FUNCTION IF EXISTS` guards, and creates `claim_public_table_session`, `request_waiter_assistance`, `create_validated_order`, `get_public_order_status`, and initial 6-column `get_public_restaurant_profile`.
3. `supabase/migrations/20261127000003_restaurant_gstin.sql` — adds `gstin` on `restaurants` & `gst_settings` and **must run after `000002`** because it recreates `get_public_restaurant_profile(UUID)` with the 7th `gstin` return column.

- **Required Preconditions:** Database backup/PITR verified; every active `public.restaurants` row has `owner_id` mapped to `auth.users.id`; platform admin accounts carry `raw_app_meta_data.role = 'SUPER_ADMIN'` (or row in `private.platform_admins`).
- **Rollback Plan:** Column/index additions are additive. If an RLS regression occurs in staging, apply targeted policy adjustments per [RLS_SECURITY_MATRIX.md](file:///e:/foodie-tech/docs/security/RLS_SECURITY_MATRIX.md) or restore the pre-migration snapshot; **never** re-introduce `FOR ALL USING (true)`.

### Staging End-to-End Test Checklist (`BLOCKED` until Staging Backend + Migrations Configured)
- **Authentication & Authorization:** Unauthenticated `/admin/*` redirects to `/admin/login`; `user_metadata` role spoofing fails (`403`); valid `SUPER_ADMIN` `app_metadata` unlocks `/admin/dashboard`; Merchant signup → `/pricing` → UPI Payment modal (`UPIPaymentModal`) → `/console/:id` verification gate.
- **Multi-Tenant Isolation:** Brand-new Merchant A starts with `₹0` revenue, `0` orders, `0` tables (zero demo data leak); Merchant A requesting Merchant B `/console/<id>`, `/api/billing/calculate`, or `/api/billing/invoice/:id` receives denied/`403`/`0` rows.
- **Ordering, Inventory & Tables:** Merchant configures `N` dining tables (`configureRestaurantTables`); Universal QR (`/menu?restaurant=<id>&sig=...`) encodes production origin; guest selects Table 1 (`claim_public_table_session`), places order (`create_validated_order` overrides client price with DB price, decrements finite stock atomically, rejects out-of-stock/replay); KDS advances `PENDING` → `FINISHED`.
- **Billing & Dynamic Receipts:** Server-side `POST /api/billing/calculate`, `/api/billing/invoice`, `/api/billing/settle` persist authoritative totals and idempotency keys (`SUPABASE_SERVICE_ROLE_KEY` active); receipt renders dynamic address/phone/optional GSTIN cleanly (`receiptHelpers.js`).
- **Email & RLS:** `GET /api/email/status` (`SUPER_ADMIN` only) reports live Gmail SMTP connected; admin payment approval triggers PDF invoice dispatch.

### Explicitly Incomplete / Known Limitations
1. **Multi-User Kitchen & Staff RBAC (`NOT IMPLEMENTED`):** `private.owns_restaurant(uuid)` strictly permits `restaurants.owner_id = auth.uid()` (plus platform admins). Dedicated waiter/chef user logins with scoped permissions are not yet implemented.
2. **Anonymous Guest Order Tracking Realtime & Item Details (`IMPLEMENTED BUT LIMITED`):** Under hardened RLS, unauthenticated guests in [OrderTracking.jsx](file:///e:/foodie-tech/client/src/components/order/OrderTracking.jsx#L56-L130) cannot read `public.orders` directly or receive `postgres_changes` events (`filter: id=eq.${orderId}`), so updates arrive via a **30-second interval poll** calling `get_public_order_status` (returning summary fields with `items: []`).

---

## 6. Email Verification & Safe Real-Inbox SMTP Smoke-Test Procedure

- **Nodemailer Version & Audit:** `nodemailer@10.6.1` (`server/package.json` `"^10.6.1"`); `npm --prefix server audit` = **`0` vulnerabilities**.
- **Code Compatibility Verified:** `server/services/email.service.js` uses `nodemailer.createTransport({ service: 'gmail', host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } })`, `transporter.verify()`, and `transporter.sendMail()`, verified against Node `v22.14.0` in `server/tests/email-nodemailer.test.js` (`16/16` server tests pass).
- **Safe Real-Inbox Smoke Test Procedure (Run ONLY After Explicit Owner Approval & Staging Secret Setup):**
  1. Ensure `server/.env` (or staging secret store) has valid `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, rotated `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`, and `FRONTEND_URL`.
  2. Start the server in staging and authenticate as a `SUPER_ADMIN` user (`ADMIN_JWT`).
  3. Verify SMTP handshake without sending mail:
     `GET <BACKEND_URL>/api/email/status` with `Authorization: Bearer <ADMIN_JWT>` → confirm `configured: true`, `status: "Connected to Gmail SMTP"`.
  4. Dispatch one controlled test email to an owner-controlled inbox:
     `POST <BACKEND_URL>/api/email/test` with `Authorization: Bearer <ADMIN_JWT>` and `{ "email": "<owner-test-inbox>" }` → confirm `mode: "live"` and inbox receipt (`SPF`/`DKIM`/HTML rendering).
  5. Test one `sendPurchaseSummaryEmail` staging approval flow to confirm PDF attachment (`SRV-INV-*.pdf`) renders cleanly in the owner inbox.

---

## 7. Automated Tests & Build Status (Current Verified Runs)

- **Server Tests (`npm --prefix server test`):** `16/16` passed across `3` suites (`Nodemailer v10 Compatibility & Email Service Tests` [2], `Servora Server Security Middleware & Tenant Isolation` [7], `Authoritative Billing Engine & Payment Idempotency` [7]), `0` failed.
- **Client Tests (`npm --prefix client test -- --run`):** `33/33` passed across `4` files (`auth-and-tenant.test.js` [11], `billing-order-upload.test.js` [12], `table-config.test.js` [4], `receipt-helpers.test.js` [6]), mocked Supabase/fetch.
- **Security Audits:** `npm --prefix server audit` → `0` vulnerabilities; `npm --prefix client audit` → `0` vulnerabilities.
- **Live Supabase Anonymous Probes (Read-Only):** All 10 private tables returned `0` rows; `private.platform_admins` blocked (`HTTP 406 PGRST106`); `is_platform_admin` denied (`401 42501`); all 6 public RPCs reachable.

---

## 8. Remaining Owner Actions Summary

1. Choose canonical frontend host (**Vercel** vs **Cloudflare Workers**) and ensure `https://servora.quantumesh.in` serves the latest build (`assets/index-CIVk6RRy.js` or newer).
2. Provision `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, and rotated `GMAIL_USER`/`GMAIL_APP_PASSWORD` on backend host, deploy `server/`, and configure `VITE_API_URL` on frontend host.
3. Clean any legacy `VITE_ADMIN_*` entries from Vercel/Cloudflare dashboards and rotate legacy shared admin passwords.
4. Approve whether to commit the 5 clean local workspace updates onto `security/servora-production-hardening` → `main`, and decide separately on executing the `git filter-repo` history cleanup.
5. Authorize and execute the controlled Staging E2E & real-inbox SMTP smoke tests.

---

## 9. Production Cutover Go / No-Go Criteria

Production cutover is **NO-GO** until every gate below is verified green:
1. `[ ]` Express backend (`server/`) live over HTTPS with valid `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`, strict `ALLOWED_ORIGINS`, and `VITE_API_URL` wired in frontend build.
2. `[ ]` `https://servora.quantumesh.in` verified serving the hardened frontend bundle (no stale Vercel/Cloudflare split-brain deployment).
3. `[ ]` Legacy `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD` purged from hosting dashboards and old shared admin credentials rotated.
4. `[ ]` All `3` migrations (`000001` → `000002` → `000003`) confirmed applied in strict numeric order with zero `restaurants.owner_id IS NULL` gaps.
5. `[ ]` Live staging E2E walkthrough completed cleanly: Signup → Plan Purchase & UTR → Admin Notification & Approval → Zero-leak Merchant Dashboard → Menu & Tables → Customer QR Order (`create_validated_order`) → KDS Completion → Server POS Invoice & Settlement → Real-inbox Nodemailer `10.6.1` SMTP email delivery.
