# Servora — Hardened Production Architecture

**Stack:** React 19 + Vite 7 (`client/`) · Node.js + Express 5 (`server/`) · Supabase (PostgreSQL + Auth + Realtime) · Cloudinary · Cloudflare Pages / Vercel

---

## 1. Repository Layout Note
The active workspace contains:
- `client/` — Tracked by `client/.git` (branch `security/servora-production-hardening`). Contains SPA frontend, service modules, unit tests (`Vitest`), build config (`vite.config.js`), and Cloudflare `_headers`.
- `server/` — Node/Express backend API providing authoritative billing calculations, GST tax rules, invoice ledger persistence, idempotent split-payment settlement, transactional email/PDF dispatch, and scheduled subscription expiry scans.
- `supabase/migrations/` — Authoritative database hardening migrations (`20261127000001_security_hardening_rls.sql`, `20261127000002_atomic_order_and_data_integrity.sql`).
- `docs/` — Security audit, RLS matrix, secret rotation, incident response, migration, deployment, and QA documentation.

> **Operational Note:** Before pushing upstream, ensure root `server/`, `supabase/`, and `docs/` directories are initialized or synced into the main monorepo remote alongside `client/` if deploying from a single Git repository.

---

## 2. Trust Boundaries & Security Architecture

```text
+-------------------------------------------------------------------------+
| Public Customer Browser (https://servora.quantumesh.in/menu?restaurant=) |
| - Untrusted by default                                                  |
| - Reads menu & restaurant non-PII profile via RLS / safe RPC            |
| - Places order via `create_validated_order` RPC (authoritative prices)  |
| - Tracks single order via `get_public_order_status` RPC                 |
| - Calls waiter via `request_waiter_assistance` RPC                      |
+-----------------------------------+-------------------------------------+
                                    | HTTPS (Supabase Anon Key + JWT / RPC)
                                    v
+-------------------------------------------------------------------------+
| Authenticated Merchant Console (/console/:id) & Admin (/admin/*)        |
| - Merchant: `verifyMerchantAccess()` checks `getUser()` + `owner_id`    |
| - Admin: `verifyAdminSession()` checks `app_metadata.role` + RPC        |
| - Demo Sandbox: Isolated strictly to slug `'demo-merchant'` / `'demo'`  |
| - Billing/POS calls Express API with Supabase Bearer JWT                |
+-------------------+-----------------------------------+-----------------+
                    | Bearer JWT                        | JWT / Anon RLS
                    v                                   v
+-----------------------------------+   +---------------------------------+
| Express Security Layer (`server/`)|   | Supabase Postgres + RLS (`DB`)  |
| - Helmet + Origin CORS Allowlist  |   | - `private.is_platform_admin()` |
| - Request ID + JSON Body Cap      |   | - `private.owns_restaurant()`   |
| - Sliding-Window Rate Limiters    |   | - Row-locked atomic stock TX    |
| - `requireAuth`, `requireAdmin`,  |   | - UTR unique index & trigger    |
|   `requireRestaurantAccess`       |   | - Immutable `audit_logs`        |
+-------------------+---------------+   +----------------+----------------+
                    | Service Role Key                   ^
                    +------------------------------------+
```

---

## 3. Core Subsystem Design

### 3.1 Authentication & RBAC
- **Platform Admins:** Authenticated exclusively via `supabase.auth.signInWithPassword`. `client/src/lib/adminAuth.js` (`verifyAdminSession`) verifies the server-fetched user via `supabase.auth.getUser()` and permits entry only if `user.app_metadata.role` is in `{'SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN'}` or `supabase.rpc('is_platform_admin')` returns `true`. Legacy `sessionStorage` markers and `user_metadata` claims are cleared and ignored.
- **Merchants:** `client/src/lib/merchantAuth.js` (`verifyMerchantAccess`) verifies `getUser()` and asserts `restaurant.owner_id === user.id` (or trusted admin claim). Database or auth lookup errors fail closed (`authorized: false`).
- **Demo Sandbox:** `'demo-merchant'` and `'demo'` operate in an isolated in-memory/browser sandbox (`isDemoRestaurantSlug`) that does not trigger production tenant DB mutations or bypass real UUID guards.

### 3.2 Authoritative Billing, Tax & Payment Ledger
- **Preview vs Settlement:** `client/src/services/billing.service.js` exposes `calculateBillPreview` (explicitly marked `isPreview: true, authoritative: false` using integer-paise arithmetic) while `createServerInvoice` and `settleInvoicePayment` require authenticated Express API responses (`/api/billing/*`) and throw explicit errors on failure instead of returning fake `PAID` states.
- **Server Pipeline (`server/services/`):**
  - `billing.engine.js` hydrates prices from `menu_items` in Supabase when tenant/item UUIDs exist, validates stock availability (`is_in_stock`), enforces non-negative finite amounts and percentage bounds, and computes GST/CGST/SGST/IGST in integer paise.
  - `invoice.service.js` persists issued/paid invoices to Supabase `invoices` when configured.
  - `payment.service.js` deduplicates retries via `idempotencyKey`, verifies `invoice.restaurantId === restaurantId`, and updates `table_sessions` (`status: 'available'`, `current_order_id: null`) and `orders` (`payment_status: 'PAID'`, `status: 'FINISHED'`).

### 3.3 Atomic Ordering & Stock Safety
- `client/src/services/order.service.js` (`createOrder`) calls `supabase.rpc('create_validated_order', ...)` whenever all items reference `menu_items` UUIDs.
- Inside PostgreSQL, `create_validated_order`:
  1. Checks `(restaurant_id, idempotency_key)` to prevent duplicate submission on retries.
  2. Locks requested `menu_items` rows in deterministic UUID order (`FOR UPDATE`) to prevent deadlocks and overselling races.
  3. Validates restaurant ownership, stock quantity (`>= requested`), computes subtotal/GST/total server-side, inserts `orders` + `order_items`, updates `table_sessions` and `notifications` in a single atomic transaction.
- `updateOrderStatus` validates state changes against `VALID_ORDER_TRANSITIONS` (`PENDING -> PREPARING -> READY -> SERVED -> BILL_REQUESTED -> FINISHED`).

### 3.4 Media Uploads (Cloudinary)
- `client/src/services/cloudinary.service.js` rejects non-raster MIME types (blocking SVG/HTML XSS payloads), limits payloads to `5 MB` (`MAX_UPLOAD_BYTES`), enforces authenticated user sessions outside `'demo-merchant'`, and sanitizes upload paths into `servora/tenants/<restaurant_uuid>/...`.
