# Servora — QA & Security Verification Report

**Verification Date:** 2026-11-27  
**Branch:** `security/servora-production-hardening` (`client/.git`)  
**Scope:** Automated unit/integration tests, production build, ESLint compliance on modified files, dependency vulnerability remediation (`npm audit`), and verification status ledger.

---

## 1. Automated Test Execution Results

### 1.1 Frontend Security & Service Regression Suite (`Vitest` + `jsdom`, mocked Supabase/fetch)
**Command:** `npm --prefix client test -- --run`  
**Result:** **2 passed test files · 22 passed tests · 0 failed** (Duration: `2.21s`)

| Test File | Covered Security / Integrity Controls | Cases Passed |
|---|---|---|
| `client/src/__tests__/auth-and-tenant.test.js` | Admin RBAC (`verifyAdminSession`, `hasTrustedAdminClaim`, `clearLegacyAdminStorage`): strips legacy `sessionStorage` markers, rejects unauthenticated sessions, blocks `user_metadata` role spoofing, authorizes verified `app_metadata` and `is_platform_admin` RPC; Merchant Isolation (`verifyMerchantAccess`, `isDemoRestaurantSlug`): isolates `demo-merchant`, ignores spoofed `sessionStorage` IDs/`fallback_auth_email`, blocks cross-tenant access, fails closed on DB error, allows matching `owner_id`. | 10 / 10 |
| `client/src/__tests__/billing-order-upload.test.js` | Billing (`calculateBillPreview`, `createServerInvoice`, `settleInvoicePayment`): integer-paise calculation marked non-authoritative, negative/invalid input rejection, fails loudly on HTTP 500 or network error (zero fake `INV-*`/`PAID`); Ordering (`createOrder`, `updateOrderStatus`): empty/negative/bounds rejection, strict `demo-merchant` sandbox isolation, `create_validated_order` RPC invocation + idempotency key deduplication, fail-loud stock error propagation, `VALID_ORDER_TRANSITIONS` enforcement; Cloudinary (`validateImageAsset`, `sanitizeFolderPath`, `uploadToCloudinary`): blocks `image/svg+xml`, `text/html`, empty/oversized (`> 5 MB`) payloads, sanitizes path traversal (`..`), requires auth outside demo. | 12 / 12 |

### 1.2 Backend API Security & Billing Engine Suite (`node --test`, mocked Supabase/email adapter over real Express 5 HTTP app)
**Command:** `npm --prefix server test`  
**Result:** **2 suites · 10 passed tests · 0 failed** (Duration: `420.59ms`)

| Test File | Covered Express & Financial Controls | Cases Passed |
|---|---|---|
| `server/tests/security-and-billing.test.js` | CORS policy rejects untrusted origins (`403`/error); `/api/admin/session` returns `401` unauthenticated, `403` when `user_metadata` tries to spoof `SUPER_ADMIN`, `200` for verified `app_metadata` `SUPER_ADMIN`; `/api/email/status` & `/api/email/test` enforce admin-only (`401`/`403`); `/api/email/forgot-password` strips untrusted phishing `resetUrl` domains; `/api/billing/calculate` blocks cross-tenant requests (`403`), hydrates authoritative DB prices against spoofed client prices, rejects negative prices/zero quantities/`>100%` discounts; `processPayment` deduplicates retries via `idempotencyKey`. | 10 / 10 |

---

## 2. Build, Lint & Dependency Audit Status

| Check | Baseline Before Hardening | Final Verified Result | Notes |
|---|---|---|---|
| **Production Build** (`npm --prefix client run build`) | Passing | **Passed (`✓ built in 13.06s`, exit 0)** | Built `client/dist/` cleanly across 3,357 modules. |
| **Targeted ESLint on Modified/Added Files** | Pre-existing repo had 404 total lint problems across all client files | **0 errors, 6 warnings** across all 25 modified/added client source, service, route, script & test files | Untouched pre-existing UI files retain legacy unused-var/empty-catch lint items (left untouched to keep hardening diff surgical). |
| **Client `npm audit`** (`npm --prefix client audit fix`) | 20 vulnerabilities (2 low, 3 moderate, 15 high) | **0 vulnerabilities (`found 0 vulnerabilities`)** | Resolved safely without `--force` even after installing `vitest` and `jsdom`. |
| **Server `npm audit`** (`npm --prefix server audit fix`) | 5 vulnerabilities (1 critical `proxy-addr`, 3 high, 1 moderate `qs`) | **1 high remaining (`nodemailer` <= 10.1.3)** | 4/5 resolved (`proxy-addr`, `body-parser`, `brace-expansion`, `qs`). Upgrading `nodemailer` requires major bump to `10.6.1` (not `--force`-applied). |

---

## 3. Environment Coverage & Remaining Verification Boundaries
- **Verified with Automated Tests:** Frontend auth/RBAC/tenant logic (`adminAuth.js`, `merchantAuth.js`), billing fail-loud behavior, order validation & state transitions, Cloudinary validation rules, Express 5 CORS/JWT/RBAC/tenant middleware, password-reset URL sanitization, and payment idempotency.
- **Not Production-Verified (Requires Owner Action in Staging/Supabase):**
  - Execution and live RLS policy enforcement of `supabase/migrations/20261127000001_security_hardening_rls.sql` and `20261127000002_atomic_order_and_data_integrity.sql` against live Supabase Postgres.
  - Real Gmail SMTP delivery and live Cloudflare Pages / Vercel production deployment smoke testing after secret rotation.
