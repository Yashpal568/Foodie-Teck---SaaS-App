# SERVORA — CORE SaaS ACCEPTANCE TEST REPORT

**Test Date:** 2026-11-27  
**Repository:** `E:\foodie-tech` (`main` @ `e5b52f3` + local security, onboarding, realtime, and launch-blocker fixes)  
**Architecture Under Test:** Direct-Supabase Serverless SaaS (React + Vite + Supabase Auth + PostgreSQL + RLS + Realtime), **without requiring Express**  
**Configured Supabase Host Inspected:** `oliuhzkbnxjiwkrdlcfv.supabase.co` (Shared across `client/.env` & `server/.env`)  

---

## 1. Environment & Staging Boundary Disclosure

- **Staging Availability Check:**
  - `client/.env` and `server/.env` both point to `oliuhzkbnxjiwkrdlcfv.supabase.co` (single live Supabase project).
  - `.env.production` and `client/.env.cloudflare` contain placeholder hosts (`your-project-ref.supabase.co`).
  - `supabase/config.toml` does not exist (`False`), and no local Supabase Docker stack (`54321`/`54322`) or local Vite server (`5173`) is running in this shell.
- **Compliance with Safety Rules:** Because **no isolated staging Supabase project is configured** and production database modifications (`INSERT`/`UPDATE`/`DELETE` on `auth.users`, `restaurants`, `menu_items`, `orders`, `table_sessions`) or remote migrations are strictly prohibited, **live multi-tenant write scenarios against Postgres remain `BLOCKED`**—never simulated as passing.
- **Evidence Executed Today (Post-Fix Verification Run):**
  1. Live read-only HTTPS REST/RPC probes against `oliuhzkbnxjiwkrdlcfv.supabase.co` (verifying RLS isolation & active SQL RPCs).
  2. Client Vitest test suite (`npm --prefix client test -- --run`): **`6` test files passed, `45` tests passed, `0` failed** (`3.63s`).
  3. Server security & billing test suite (`npm --prefix server test`): **`3` suites / `17` tests passed, `0` failed, `0` cancelled, `0` skipped** (`444.84ms`).
  4. Production Vite bundle check (`npm --prefix client run build`): **`3358` modules transformed, built in `11.40s` (`exit code 0`)**.
  5. Direct source inspection of components, services, hooks, and SQL migrations.

---

## 2. 15-Scenario Acceptance Test Matrix

| # | Test Scenario | Live DB Execution Status | Code & Automated Evidence Status | Relevant Files & Functions | Actual DB / API / Test Evidence |
|---|---|---|---|---|---|
| 1 | **Register Restaurant A** | **`BLOCKED`** *(No staging DB; prod writes prohibited)* | **`PASS` (Mock/Unit)** | `RegisterPage.jsx` (`handleSubmit`), `LoginPage.jsx` | Defers `restaurants` insert to first login if Confirm Email returns `session: null`, respecting `restaurants_owner_insert`. Blocked on live test without staging auth. |
| 2 | **Register Restaurant B** | **`BLOCKED`** *(No staging DB)* | **`PASS` (Mock/Unit)** | `RegisterPage.jsx`, `merchantAuth.js`, `auth-and-tenant.test.js` | `auth-and-tenant.test.js` (`11/11` pass) verifies strict `owner_id === user.id` check and multi-tenant isolation. |
| 3 | **Complete their onboarding (Plan + UTR + Dashboard setup)** | **`BLOCKED`** *(Requires live auth + Admin UTR approval)* | **`PARTIAL / MANUAL GATE`** | `PricingPage.jsx` (`selectPlan`), `Dashboard.jsx` (`verifyAuthAndPlan`), `adminDataService.js` (`approveMerchantPayment`), `OnboardingChecklist.jsx` | `PricingPage.jsx` inserts `PENDING_APPROVAL` subscription/UTR under RLS. **Blocker:** `Dashboard.jsx` locks console behind `<SubscriptionLockOverlay />` until a human Admin approves UTR in `/admin/verifications` (plus Admin KPI `Active Merchants` card now reflects live suspended count in `AdminDashboardPage.jsx:416`). |
| 4 | **Create separate menus & categories** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Code + Suspension Guard + Public Read)** | `MenuManagement.jsx`, `CategoryManager.jsx`, `menu.service.js`, `20261127000004` | Live read-only probe confirmed public catalog policies work (`menu_items` = `3` rows, `menu_categories` = `2` rows). `menu.service.js` (`createMenuItem`, `toggleMenuItemStock`) now enforces `assertMerchantOperational`, backed by active-workspace SQL RLS in `20261127000004` (pending SQL apply). |
| 5 | **Create separate tables & QR codes** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Unit Tested + Suspension Guard)** | `QRCodeManagement.jsx`, `table.service.js` (`configureRestaurantTables`), `tableSecurity.js` | `table-config.test.js` (`4/4` pass) verifies non-destructive sync of `table_sessions` + `qr_codes` preserving active tables and dynamic origin URL generation. `configureRestaurantTables` now enforces `assertMerchantOperational`. |
| 6 | **Open both restaurants' public QR menus** | **`PARTIAL / PASS` (Read-Only Live RPC)** | **`PASS` (6-col RPC; `000003` pending)** | `CustomerMenu.jsx`, `restaurant.service.js` (`getRestaurantProfile`), `20261127000002` | Live probe confirmed `rpc/get_public_restaurant_profile` returns `HTTP 200` (`id, business_name, description, logo_url, cover_url, status`), `rpc/get_public_table_numbers` returns `5` rows (`HTTP 200`), `gst_settings` returns `2` rows (`HTTP 200`). `20261127000003` (`gstin`) is not yet applied on live DB. |
| 7 | **Submit customer orders for both** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Unit + Demo E2E Store + Live RPC Guard)** | `CustomerMenu.jsx` (`placeOrder`), `order.service.js` (`createOrder`), `20261127000002` (`create_validated_order`) | Live `rpc/create_validated_order` exists and rejects invalid zero-UUID restaurant cleanly (`HTTP 400` `P0001`: `"Restaurant unavailable or suspended"`). `billing-order-upload.test.js` (`12/12`) & `realtime-orders-and-floor.test.js` (`5/5`) pass. |
| 8 | **Verify orders reach only correct merchant dashboard** | **`BLOCKED`** *(No isolated two-tenant live accounts)* | **`PASS` (Unit + RLS + Server Tests)** | `useOrderManagement.js` (`restaurant_id` filter), `20261127000001` (`orders_tenant_select`) | Live probe confirmed `anon_select_orders` returns `0` rows (`[]`). `20261127000001` enforces `private.owns_restaurant(restaurant_id)` on `orders` and `order_items`. Client hook queries `eq('restaurant_id', validId)`. |
| 9 | **Verify KDS updates & order status transitions** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Unit + State Machine + Cancel Lock)** | `OrderManagement.jsx`, `order.service.js` (`VALID_ORDER_TRANSITIONS`, `updateOrderStatus`), `20261127000004` | `billing-order-upload.test.js` verifies invalid jump rejection (`PENDING -> FINISHED` rejected) and valid transitions; `launch-blockers.test.js` verifies concurrent transition deduplication and idempotent `CANCELLED`; `realtime-orders-and-floor.test.js` (`5/5`) verifies persistent KDS updates. |
| 10 | **Verify table management & table completion** | **`BLOCKED`** *(Live write prohibited)* | **`PASS` (Unit Tested + Multi-Order Safe Release)** | `useTableSessions.js`, `TableStatus.jsx`, `TableSessions.jsx`, `order.service.js` | `useTableSessions` reconciles active `orders` onto Live Floor tables (`occupied` / `billing`). `realtime-orders-and-floor.test.js` proves Table 7 & Table 9 occupancy; `launch-blockers.test.js` proves cancelling one order on Table 5 keeps Table 5 `occupied` while another active order remains, and frees Table 8 when last order cancels. Updated `000002` `UPSERT` SQL must still be applied in Supabase. |
| 11 | **Print thermal receipts** | **`PASS` (Code + Unit Tested; Browser Print Dialog)** | **`PASS` (Math + Header + XSS Escaping)** | `OrderManagement.jsx` (`handlePrintReceipt`), `POSBillPreviewModal.jsx`, `receiptHelpers.js` (`computeReceiptTotals`, `getRestaurantReceiptHeader`, `escapeHtml`) | Works **100% directly on Supabase** via isolated `<iframe>` print—zero Express dependency. `receipt-helpers.test.js` (`6/6` pass) verifies blank GSTIN omission, uppercase GSTIN normalization, and CGST/SGST splits. `POSBillPreviewModal.jsx:65-66` now also escapes `item.name` and `item.variant` with `escapeHtml(...)`. |
| 12 | **Verify analytics & cancelled-order handling** | **`BLOCKED`** *(Live DB read/write skipped; `000004` pending)* | **`PASS` (Fixed + Unit Tested)** | `analyticsHelpers.js`, `AnalyticsDashboard.jsx`, `DashboardRealtimeAnalytics.jsx`, `OverviewCards.jsx`, `order.service.js`, `20261127000004` | **Fixed today:** `analyticsHelpers.js` + `AnalyticsDashboard.jsx` + `DashboardRealtimeAnalytics.jsx` now exclude `CANCELLED` orders from revenue, AOV, hourly peaks, trends, categories, and custom date ranges; removed hardcoded `'tigerbistro99@gmail.com'` fallback (`AnalyticsDashboard.jsx`). `order.service.js` + `20261127000004` (`cancel_order_and_restore_inventory`) atomically & idempotently restore finite `menu_items.quantity` while ignoring `NULL`/unlimited inventory (`launch-blockers.test.js` `7/7` pass). |
| 13 | **Test unauthorized cross-tenant reads & writes (and Suspended Lockout)** | **`PARTIAL / PASS` (`anon` Blocked Live)** | **`PASS` (Unit + Middleware + RLS Migration + UI Lock)** | `20261127000001`, `20261127000004`, `Dashboard.jsx`, `merchantAuth.js`, `SuspensionOverlay.jsx`, `server/middleware/security.js` | Live `anon` `SELECT` returned `0` rows on private tenant tables. Today's fix wires `setIsSuspended` in `Dashboard.jsx`, restricts suspended merchants to `<SuspensionOverlay />`, `<HelpSupport />`, Account Status, and Sign Out, blocks mutations in `merchantAuth.assertMerchantOperational` + `server/middleware/security.js` (`403` tested in `security-and-billing.test.js`), and tightens RLS writes via `20261127000004`. Authenticated live Tenant A vs B probe in Supabase remains **`BLOCKED`**. |
| 14 | **Verify Supabase Realtime updates** | **`BLOCKED`** *(No two-browser live staging session run)* | **`PASS` (Code + Cross-Tab + Suspension Listener)** | `useOrderManagement.js`, `useTableSessions.js`, `OrderTracking.jsx`, `Dashboard.jsx` | Subscribes to `postgres_changes` (`orders`, `order_items`, `table_sessions`, and now `restaurants` status updates in `Dashboard.jsx`), `BroadcastChannel`, `storage` events, and fallback polling intervals. |
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
| `POST /rest/v1/rpc/get_public_restaurant_profile` *(valid live UUID)* | `200` | Keys: `id, business_name, description, logo_url, cover_url, status` | `000002` RPC active; **`000003` (`gstin`) & `000004` (`cancel_order_and_restore_inventory`) not yet applied on live DB**. |
| `POST /rest/v1/rpc/get_public_table_numbers` *(valid live UUID)* | `200` | `5` table rows | Public table picker works without exposing `table_sessions`. |
| `POST /rest/v1/rpc/is_platform_admin` *(anon)* | `401` | Postgres `42501` permission denied | Admin RPC execution revoked from `anon`. |
| `POST /rest/v1/rpc/create_validated_order` *(zero UUID)* | `400` | `P0001: "Restaurant unavailable or suspended"` | Atomic RPC validates tenant existence & blocks invalid/suspended targets. |

---

## 4. Automated Test & Build Evidence Run After Launch-Blocker Fixes

- `npm --prefix client test -- --run`: **PASS (`Test Files  6 passed (6)`, `Tests  45 passed (45)`, `0 failed`, `3.63s`)**
  - `receipt-helpers.test.js` (`6`), `table-config.test.js` (`4`), `auth-and-tenant.test.js` (`11`), `billing-order-upload.test.js` (`12`), `launch-blockers.test.js` (`7`), `realtime-orders-and-floor.test.js` (`5`).
- `npm --prefix server test`: **PASS (`tests 17`, `suites 3`, `pass 17`, `fail 0`, `cancelled 0`, `skipped 0`, `444.84ms`)**
  - `email-nodemailer.test.js`, `security-and-billing.test.js` (includes HTTP `403` rejection for `Suspended` merchant workspace), `billing-engine.test.js`.
- `npm --prefix client run build`: **PASS (`✓ 3358 modules transformed.`, `✓ built in 11.40s`, `exit code 0`)**.

---

## 5. Remaining Blockers (Non-Code / Deployment & Staging Gates)

All 3 code launch blockers identified previously (`AnalyticsDashboard` cancelled-order exclusion + hardcoded fallback removal, `order.service.js` finite inventory cancellation restoration, and `Dashboard.jsx` suspension wiring + multi-layer guardrails) are now **FIXED and regression-tested locally**. The remaining blockers are strictly environmental / SQL rollout / operational gates:

1. **No Isolated Staging Supabase Project (Live Write Test Blocker):** Authenticated Tenant A vs Tenant B write isolation, live Supabase Realtime multi-browser delivery, and live RPC execution remain unexecuted because only one production project (`oliuhzkbnxjiwkrdlcfv.supabase.co`) is configured.
2. **Pending SQL Migrations on Supabase (`000002` Upsert + `000003` + `000004`):** `20261127000003_restaurant_gstin.sql`, updated `20261127000002` table-session upsert, and `20261127000004_cancellation_inventory_and_suspension_rls.sql` must be reviewed and applied in staging first, then live Supabase, before DB-enforced RPC cancellation and RLS suspension blocking take effect on Postgres.
3. **Frontend Deployment Sync & Express-Optional POS Scope:** Today's local changes are uncommitted and undeployed; one authoritative domain must serve the rebuilt `client/dist`. `POS & Smart Billing` (`billing.service.js` / `SplitPaymentModal`) remains gated unless an Express `server/` (`VITE_API_URL`) is deployed (`Orders & KDS` operates 100% directly on Supabase).
4. **Manual Onboarding Gate (UTR Approval):** New merchants remain behind `<SubscriptionLockOverlay />` until an Admin verifies their submitted UPI UTR in `/admin/verifications`.

---

## 6. Direct Launch Assessment (Post-Fix)

- **Code & Architecture Readiness:** **PASS for Direct-Supabase Pilot** once SQL migrations `000002` (upsert update), `000003`, and `000004` plus the rebuilt `client/dist` are verified in an isolated staging environment and deployed cleanly.
- **Staging Verification Gate:** Before serving paying customers, spin up/connect a staging Supabase instance, apply `000002` + `000003` + `000004`, and run the live 2-tenant end-to-end walkthrough (Signup → UTR approval → Menu & finite stock → QR scan → Order → Cancel finite vs unlimited stock → Suspend workspace lockout → Receipt print). See [LAUNCH_BLOCKER_FIX_REPORT.md](file:///e:/foodie-tech/docs/testing/LAUNCH_BLOCKER_FIX_REPORT.md) for the complete remediation summary.
