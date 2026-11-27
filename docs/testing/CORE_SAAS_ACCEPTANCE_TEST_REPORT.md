# SERVORA — CORE SaaS ACCEPTANCE TEST REPORT

**Test Date:** 2026-11-27  
**Repository:** `E:\foodie-tech` (`main` @ `e5b52f3` + local security, onboarding, and realtime fixes)  
**Architecture Under Test:** Direct-Supabase Serverless SaaS (React + Vite + Supabase Auth + PostgreSQL + RLS + Realtime), **without requiring Express**  
**Configured Supabase Host Inspected:** `oliuhzkbnxjiwkrdlcfv.supabase.co` (Shared across `client/.env` & `server/.env`)  

---

## 1. Environment & Staging Boundary Disclosure

- **Staging Availability Check:**
  - `client/.env` and `server/.env` both point to `oliuhzkbnxjiwkrdlcfv.supabase.co` (single live Supabase project).
  - `.env.production` and `client/.env.cloudflare` contain placeholder hosts (`your-project-ref.supabase.co`).
  - `supabase/config.toml` does not exist (`False`), and no local Supabase Docker stack (`54321`/`54322`) or local Vite server (`5173`) is running in this shell.
- **Compliance with Safety Rules:** Because **no isolated staging Supabase project is configured** and production database modifications (`INSERT`/`UPDATE`/`DELETE` on `auth.users`, `restaurants`, `menu_items`, `orders`, `table_sessions`) are strictly prohibited, **live multi-tenant write scenarios against Postgres could NOT be executed and are marked `BLOCKED`**—never simulated as passing.
- **Evidence Executed Today:**
  1. Live read-only HTTPS REST/RPC probes against `oliuhzkbnxjiwkrdlcfv.supabase.co` (verifying RLS isolation & active SQL RPCs).
  2. Client Vitest test suite (`npm --prefix client test -- --run`: `5` files, `37` tests).
  3. Server security & billing test suite (`npm --prefix server test`: `3` suites, `16` subtests).
  4. Direct source inspection of components, services, hooks, and migrations.

---

## 2. 15-Scenario Acceptance Test Matrix

| # | Test Scenario | Live DB Execution Status | Code & Automated Evidence Status | Relevant Files & Functions | Actual DB / API / Test Evidence |
|---|---|---|---|---|---|
| 1 | **Register Restaurant A** | **`BLOCKED`** *(No staging DB; prod writes prohibited)* | **`PASS` (Mock/Unit)** | `RegisterPage.jsx` (`handleSubmit`), `LoginPage.jsx` | Defers `restaurants` insert to first login if Confirm Email returns `session: null`, respecting `restaurants_owner_insert`. Blocked on live test without staging auth. |
| 2 | **Register Restaurant B** | **`BLOCKED`** *(No staging DB)* | **`PASS` (Mock/Unit)** | `RegisterPage.jsx`, `merchantAuth.js`, `auth-and-tenant.test.js` | `auth-and-tenant.test.js` (`11/11` pass) verifies strict `owner_id === user.id` check and multi-tenant isolation. |
| 3 | **Complete their onboarding (Plan + UTR + Dashboard setup)** | **`BLOCKED`** *(Requires live auth + Admin UTR approval)* | **`PARTIAL / MANUAL GATE`** | `PricingPage.jsx` (`selectPlan`), `Dashboard.jsx` (`verifyAuthAndPlan`), `adminDataService.js` (`approveMerchantPayment`), `OnboardingChecklist.jsx` | `PricingPage.jsx` inserts `PENDING_APPROVAL` subscription/UTR under RLS. **Blocker:** `Dashboard.jsx` locks console behind `<SubscriptionLockOverlay />` until a human Admin approves UTR in `/admin/verifications` (also requires Confirm Email UX choice). |
| 4 | **Create separate menus & categories** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Code + Public Read Verified)** | `MenuManagement.jsx`, `CategoryManager.jsx`, `menu.service.js` | Live read-only probe confirmed public catalog policies work (`menu_items` = `3` rows, `menu_categories` = `2` rows). Owner write RLS enforces `private.owns_restaurant(restaurant_id)`. |
| 5 | **Create separate tables & QR codes** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Unit Tested)** | `QRCodeManagement.jsx`, `table.service.js` (`configureRestaurantTables`), `tableSecurity.js` | `table-config.test.js` (`4/4` pass) verifies non-destructive sync of `table_sessions` + `qr_codes` preserving active tables and dynamic origin URL generation. |
| 6 | **Open both restaurants' public QR menus** | **`PARTIAL / PASS` (Read-Only Live RPC)** | **`PASS` (6-col RPC; `000003` pending)** | `CustomerMenu.jsx`, `restaurant.service.js` (`getRestaurantProfile`), `20261127000002` | Live probe confirmed `rpc/get_public_restaurant_profile` returns `HTTP 200` (`id, business_name, description, logo_url, cover_url, status`), `rpc/get_public_table_numbers` returns `5` rows (`HTTP 200`), `gst_settings` returns `2` rows (`HTTP 200`). `20261127000003` (`gstin`) is not yet applied on live DB. |
| 7 | **Submit customer orders for both** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Unit + Demo E2E Store + Live RPC Guard)** | `CustomerMenu.jsx` (`placeOrder`), `order.service.js` (`createOrder`), `20261127000002` (`create_validated_order`) | Live `rpc/create_validated_order` exists and rejects invalid zero-UUID restaurant cleanly (`HTTP 400` `P0001`: `"Restaurant unavailable or suspended"`). `billing-order-upload.test.js` (`12/12`) & `realtime-orders-and-floor.test.js` (`4/4`) pass. |
| 8 | **Verify orders reach only correct merchant dashboard** | **`BLOCKED`** *(No isolated two-tenant live accounts)* | **`PASS` (Unit + RLS + Server Tests)** | `useOrderManagement.js` (`restaurant_id` filter), `20261127000001` (`orders_tenant_select`) | Live probe confirmed `anon_select_orders` returns `0` rows (`[]`). `20261127000001` enforces `private.owns_restaurant(restaurant_id)` on `orders` and `order_items`. Client hook queries `eq('restaurant_id', validId)`. |
| 9 | **Verify KDS updates & order status transitions** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Unit + State Machine Verified)** | `OrderManagement.jsx`, `order.service.js` (`VALID_ORDER_TRANSITIONS`, `updateOrderStatus`) | `billing-order-upload.test.js` verifies invalid jump rejection (`PENDING -> FINISHED` rejected) and valid transitions; `realtime-orders-and-floor.test.js` verifies persistent state updates across KDS & tracking in demo mode. |
| 10 | **Verify table management & table completion** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Fixed Today + Unit Tested)** | `useTableSessions.js`, `TableStatus.jsx`, `TableSessions.jsx`, `order.service.js` | `useTableSessions` reconciles active `orders` onto Live Floor tables (`occupied` / `billing`). `realtime-orders-and-floor.test.js` proves Table 7 & Table 9 mark `occupied` on order and return to `available` on `FINISHED`. Note: updated `000002` `UPSERT` SQL must be applied in live Supabase for unseeded DB tables. |
| 11 | **Print thermal receipts** | **`PASS` (Code + Unit Tested; Browser Print Dialog)** | **`PASS` (Math + Header Tested)** | `OrderManagement.jsx` (`handlePrintReceipt`), `receiptHelpers.js` (`computeReceiptTotals`, `getRestaurantReceiptHeader`, `escapeHtml`) | Works **100% directly on Supabase** via isolated `<iframe>` print—zero Express dependency. `receipt-helpers.test.js` (`6/6` pass) verifies blank GSTIN omission, uppercase GSTIN normalization, and dynamic CGST/SGST splits. *(Secondary `POSBillPreviewModal.jsx:65` still needs `escapeHtml(item.name)`.)* |
| 12 | **Verify analytics & cancelled-order handling** | **`BLOCKED`** *(Live DB read/write skipped)* | **`FAIL` (`AnalyticsDashboard.jsx` & Stock Restore)** | `OverviewCards.jsx`, `useOrderManagement.js`, `AnalyticsDashboard.jsx`, `order.service.js` | **Mixed Result:** `OverviewCards.jsx` (`renderToString` SSR test + Pending Orders card pass) & `useOrderManagement.js` exclude `CANCELLED` from `Today's Revenue`. **Failures:** `AnalyticsDashboard.jsx` (`lines 89,106,249,291`) still counts `CANCELLED` in analytics totals/charts and keeps `'tigerbistro99@gmail.com'` fallback (`line 131`); `order.service.js` does not restore decremented `menu_items.quantity` on `CANCELLED`. |
| 13 | **Test unauthorized cross-tenant reads & writes** | **`PARTIAL / PASS` (`anon` Blocked Live)** | **`PASS` (Unit + Server Middleware)** | `20261127000001`, `security-middleware.test.js`, `auth-and-tenant.test.js` | Live DB `anon` `SELECT` returned `0` rows across `restaurants`, `orders`, `customers`, `table_sessions`, `subscriptions`, `payment_verifications`, `notifications`, `qr_codes`; `is_platform_admin` returned `HTTP 401` (`42501`); `create_validated_order` rejected fake UUID (`HTTP 400`). Authenticated Tenant A vs Tenant B write attempt in live Supabase remains **`BLOCKED`**. |
| 14 | **Verify Supabase Realtime updates** | **`BLOCKED`** *(No two-browser live staging session run)* | **`PASS` (Code + Cross-Tab Fallback Verified)** | `useOrderManagement.js`, `useTableSessions.js`, `OrderTracking.jsx` | Subscribes to `postgres_changes` (`orders`, `order_items`, `table_sessions`), `BroadcastChannel`, `storage` events, and `5s`/`8s` fallback polling intervals so delayed/dropped WebSocket frames still recover cleanly. |
| 15 | **Refresh browser sessions & auth persistence** | **`BLOCKED`** *(No live authenticated browser run in pass)* | **`PASS` (Code + Mock Verified)** | `MerchantProtectedRoute.jsx`, `merchantAuth.js`, `CustomerMenu.jsx`, `OrderTracking.jsx` | `MerchantProtectedRoute` re-checks `supabase.auth.getUser()` + `onAuthStateChange` (`TOKEN_REFRESHED` / `SIGNED_OUT`), never trusting `sessionStorage` alone. Customer menu hydrates `activeOrderId` & `servora_order_<id>` across refreshes. |

---

## 3. Actual Live Database / API Probe Results (`oliuhzkbnxjiwkrdlcfv.supabase.co`)

Executed read-only against the configured Supabase REST/RPC API on `2026-11-27` (keys redacted; zero rows inserted or mutated):

| Probe Target | HTTP Status | Observed Response | Interpretation |
|---|---|---|---|
| `GET /rest/v1/restaurants?select=id,business_name&limit=3` | `200` | `[]` (`0` rows) | Hardened RLS `000001` blocks unauthenticated `anon` read of tenant PII/business records. |
| `GET /rest/v1/orders?select=id,restaurant_id,status&limit=3` | `200` | `[]` (`0` rows) | Hardened RLS `000001` blocks unauthenticated `anon` read of `orders`. |
| `GET /rest/v1/customers?select=id&limit=3` | `200` | `[]` (`0` rows) | Customer PII isolated from `anon`. |
| `GET /rest/v1/table_sessions?select=id,table_number,status&limit=3` | `200` | `[]` (`0` rows) | Table sessions isolated from `anon`; public menu reads table numbers via RPC only. |
| `GET /rest/v1/subscriptions` / `payment_verifications` / `notifications` / `qr_codes` | `200` | `[]` (`0` rows each) | Private billing/QR/notification tables protected from `anon`. |
| `GET /rest/v1/menu_items` / `menu_categories` / `gst_settings` / `subscription_plans` | `200` | `3`, `2`, `2`, `1` rows | Public QR menu & pricing catalog tables readable as intended. |
| `POST /rest/v1/rpc/get_public_restaurant_profile` *(valid live UUID)* | `200` | Keys: `id, business_name, description, logo_url, cover_url, status` | `000002` RPC active; **`000003` (`gstin`) not yet applied on live DB**. |
| `POST /rest/v1/rpc/get_public_table_numbers` *(valid live UUID)* | `200` | `5` table rows | Public table picker works without exposing `table_sessions`. |
| `POST /rest/v1/rpc/is_platform_admin` *(anon)* | `401` | Postgres `42501` permission denied | Admin RPC execution revoked from `anon`. |
| `POST /rest/v1/rpc/create_validated_order` *(zero UUID)* | `400` | `P0001: "Restaurant unavailable or suspended"` | Atomic RPC validates tenant existence & blocks invalid/suspended targets. |

---

## 4. Automated Test Evidence Run in This Pass

- `npm --prefix client test -- --run`: **PASS (`5 test files passed, 37 tests passed, 0 failed`)**
  - `auth-and-tenant.test.js` (`11`), `billing-order-upload.test.js` (`12`), `receipt-helpers.test.js` (`6`), `table-config.test.js` (`4`), `realtime-orders-and-floor.test.js` (`4` — includes SSR `renderToString(<OverviewCards />)` and demo persistence/Table 7 occupancy).
- `npm --prefix server test`: **PASS (`3 suites / 16 subtests passed, 0 failed`)**
  - `email-nodemailer.test.js`, `security-middleware.test.js`, `billing-engine.test.js`.

---

## 5. Remaining Blockers

1. **No Isolated Staging Supabase Project (Test Blocker):** Authenticated Tenant A vs Tenant B write isolation, end-to-end Supabase Realtime order delivery, and post-onboarding menu/order writes against real Supabase remain unexecuted because only a single production project (`oliuhzkbnxjiwkrdlcfv.supabase.co`) is configured.
2. **Pending SQL on Live Supabase:** `20261127000003_restaurant_gstin.sql` (`gstin` on `get_public_restaurant_profile`) and the updated `INSERT ... ON CONFLICT` table-session upsert in `20261127000002` must be executed in Supabase.
3. **Suspension Enforcement Gap in Console (`Dashboard.jsx:112`):** `_setIsSuspended` is never called (`restaurants.status` is not fetched in `verifyAuthAndPlan`), so suspended restaurants lose public QR ordering (`000002`) but still keep dashboard console access.
4. **Cancelled Orders in `AnalyticsDashboard.jsx` & Stock Restore (`order.service.js`):** `AnalyticsDashboard.jsx` (`lines 89, 106-116, 249, 291`) includes `CANCELLED` orders in chart/aggregate revenue (and retains `'tigerbistro99@gmail.com'` fallback at `line 131`); cancelling an order does not replenish decremented `menu_items.quantity`.
5. **Frontend Hosting Split-Brain & Express-Optional POS Gap:** Authoritative domain must point cleanly to one deployed `client/dist` bundle (today's fixes are local only), and `POS & Smart Billing` (`SplitPaymentModal`) throws `VITE_API_URL missing` without a hosted Express `server/` (whereas **`Orders & KDS`** handles receipt printing & table settlement directly via Supabase).
6. **Manual Onboarding Gate (UTR Approval):** New merchants require manual Admin UTR verification in `/admin/verifications` (`approveMerchantPayment`) before `<SubscriptionLockOverlay />` unlocks their dashboard.

---

## 6. Direct Launch Questions

### Can a new restaurant independently onboard and accept QR orders?
**Not fully self-serve (`ONLY WITH ADMIN APPROVAL`).** A new restaurant can sign up (`/register`), pick a plan (`/pricing`), and submit a UPI UTR number without developer help, **but** [Dashboard.jsx](file:///e:/foodie-tech/client/src/pages/Dashboard.jsx#L185-L228) keeps the restaurant locked behind `<SubscriptionLockOverlay />` until a platform Admin manually verifies the UTR and clicks **Approve** in `/admin/verifications`. Once approved by the Admin, the restaurant can independently configure tables, QR codes, menu items, and accept live QR orders cleanly through Supabase without Express.

### Is the product ready for a limited paid QR-ordering launch?
**Not immediately as-is (`CONDITIONAL — READY AFTER 4 QUICK LAUNCH STEPS`).** Core QR ordering, KDS, live floor tracking, and thermal receipt printing (`OrderManagement.jsx`) work on the Supabase-first architecture, **but** before onboarding the first paying pilot customer you must:
1. **Deploy today's fixed `client/` build** (fixing `OverviewCards` crash, `OrderTracking` session sync, and `Live Floor` Table 7 occupancy) to **one authoritative host**.
2. **Apply `20261127000003` & updated `20261127000002` SQL** on Supabase and run **one live authenticated two-tenant smoke test** (confirming Confirm Email UX, Tenant A vs Tenant B write isolation, QR scan → order → KDS → thermal print).
3. **Fix two small code bugs:** wire `restaurants.status === 'Suspended'` to `_setIsSuspended(true)` in [Dashboard.jsx](file:///e:/foodie-tech/client/src/pages/Dashboard.jsx#L112) and filter `status !== 'CANCELLED'` + remove `'tigerbistro99@gmail.com'` fallback in [AnalyticsDashboard.jsx](file:///e:/foodie-tech/client/src/components/dashboard/AnalyticsDashboard.jsx#L131).
4. **Scope the launch honestly:** direct pilot restaurants to use **`Orders & KDS`** for billing/thermal receipts (or deploy `server/` + `VITE_API_URL` if exposing `POS & Smart Billing` settle) and require human Admin UTR checks until automated payment webhooks are integrated.
