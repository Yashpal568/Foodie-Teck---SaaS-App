# SERVORA — ARCHITECTURE-AWARE SaaS MARKET READINESS REPORT

**Audit Date:** 2026-11-27  
**Repository:** `E:\foodie-tech`  
**Local Branch / Base Commit:** `main` (`e5b52f3` + local security, onboarding, and realtime fixes)  
**Target Supabase Project Probed (Read-Only):** `oliuhzkbnxjiwkrdlcfv.supabase.co`  
**Audit Method:** Direct code & Git history inspection (`a4e4800^` vs `a4e4800` vs `e5b52f3` + current workspace), read-only HTTP REST/RPC probe against live Supabase, client Vitest suite (`37` tests), server unit tests (`16` tests), dependency audits (`0` vulnerabilities), and `vite build`. No push, deployment, production migration, credential change, or history rewrite was performed.

---

## Executive Summary

Servora was built as a **serverless React + Vite + Supabase SaaS** (**Supabase Auth, PostgreSQL, RLS, and Realtime**). The Express server (`server/`) was added later in `a4e4800` for optional/future server-authoritative POS invoicing, Nodemailer SMTP dispatch, and automated expiry cron notifications.

Reassessing the **actual built architecture**:
- **Core QR Ordering, KDS Order Management, Thermal Receipt Printing (`OrderManagement.jsx`), Menu & Category CRUD, QR Generation, Live Floor Tables, Waiter Calls, Analytics, and Admin Approvals operate directly on Supabase without requiring the Express backend.**
- Live read-only probing of `oliuhzkbnxjiwkrdlcfv.supabase.co` today confirms that hardened RLS (`20261127000001`) and the core public RPCs (`20261127000002`) **are already live**, blocking unauthenticated `anon` reads on `restaurants`, `orders`, `customers`, `table_sessions`, `subscriptions`, `payment_verifications`, `notifications`, and `qr_codes` while allowing public `menu_items`, `menu_categories`, `gst_settings`, `subscription_plans`, `get_public_restaurant_profile`, `get_public_table_numbers`, `claim_public_table_session`, and `get_public_order_status`.
- Meanwhile, Express-only POS billing ([SplitPaymentModal.jsx](file:///e:/foodie-tech/client/src/components/pos/SplitPaymentModal.jsx) → [billing.service.js](file:///e:/foodie-tech/client/src/services/billing.service.js)) and Express SMTP ([email.service.js](file:///e:/foodie-tech/client/src/services/email.service.js)) remain non-operational in production without `VITE_API_URL` and `server/` deployment, because `a4e4800` intentionally removed insecure client-side invoice fabrication.

---

## 1. Original Operating Architecture & Dependency Matrix

### Git History Proof (`a4e4800^` → `a4e4800` → `e5b52f3`)
1. **Original Architecture (Pre-`a4e4800`):** 100% React + Vite talking directly to Supabase Auth, PostgREST, Storage, and Realtime WebSockets. Even pre-hardening `src/services/billing.service.js` (`a4e4800^`) had client-side fallbacks when no Express server was running.
2. **Hardening & Monorepo Consolidation (`a4e4800`, 2026-11-27 11:31 IST):** Moved frontend to `client/`, introduced `server/`, added PostgreSQL migrations `20261127000001`–`000003`, locked down permissive RLS policies into owner/admin + `SECURITY DEFINER` RPCs, and changed [billing.service.js](file:///e:/foodie-tech/client/src/services/billing.service.js) to fail closed (`VITE_API_URL missing`) for `createServerInvoice` and `settleInvoicePayment` rather than fabricating fake invoices.
3. **Onboarding & QR Origin Fixes (`e5b52f3` + Current Workspace):** Fixed deferred restaurant provisioning after email confirmation (`LoginPage.jsx`), post-registration `/pricing` flow, multi-tenant cache isolation, dynamic `window.location.origin` QR URLs (`tableSecurity.js`), and today's fixes in `OrderTracking.jsx`, `order.service.js`, `useOrderManagement.js`, `useTableSessions.js`, `TableStatus.jsx`, `TableSessions.jsx`, and `OverviewCards.jsx` (including the new **Pending Orders** card).

### Architecture Dependency Matrix

| Product Area | Primary Runtime | Uses Express (`server/`)? | Requires Postgres RPC / Hardened RLS? | Notes / Impact of Recent Hardening |
|---|---|---|---|---|
| Merchant Signup, Login & Session | Supabase Auth + `restaurants` | No | Yes (`restaurants_owner_insert`) | With Confirm Email ON, `restaurants` insert defers safely to first login (`LoginPage.jsx`). |
| Plan Selection & Manual UPI/UTR Submission | Supabase `subscription_plans`, `subscriptions`, `payment_verifications` | No | Yes (`subscriptions_tenant_insert_pending`) | Works purely via Supabase; Admin manually approves UTR via `approveMerchantPayment`. |
| Profile, Logo, Cover & GST Config | Supabase `restaurants`, `gst_settings`, Storage | No | Partial (`000003` pending for DB `gstin` on public RPC) | `gst_settings` is live & public-read; `gstin` also caches in `localStorage` cleanly until `000003` runs. |
| Menu & Category CRUD | Supabase `menu_items`, `menu_categories`, Storage/Cloudinary | No | Yes (`menu_items_tenant_*`) | Fully Supabase-native; public `SELECT` active on live DB. |
| QR Code Generation & Table Config | Frontend QR generator + Supabase `qr_codes`, `table_sessions` | No | Yes (`qr_codes_tenant_all`) | Uses dynamic `window.location.origin` (`tableSecurity.js`). |
| Customer QR Menu Browsing | Supabase `get_public_restaurant_profile`, `menu_items`, `get_public_table_numbers`, `gst_settings` | No | Yes (`000002` live; `000003` adds `gstin`) | **Hardened change:** Direct `anon` `SELECT restaurants` returns `[]`; menu reads via `get_public_restaurant_profile` RPC. |
| Customer Cart & Order Submission | Supabase `create_validated_order` RPC | No | Yes (`000002` `create_validated_order`) | **Hardened change:** Direct `anon` `INSERT orders` blocked by RLS; UUID menu items route through atomic `create_validated_order` RPC. Non-UUID custom items fall back to client path which fails for `anon` under RLS. |
| Waiter Call Requests & Kitchen Alerts | Supabase `request_waiter_assistance` RPC + Realtime | No | Yes (`000002` RPC) | Atomically inserts `waiter_calls` + `notifications`. |
| Customer Order Tracking (`OrderTracking.jsx`) | Supabase `get_public_order_status` RPC + Realtime / `sessionStorage` | No | Yes (`000002` RPC) | **Broken by `a4e4800`, FIXED today:** `anon` `SELECT orders` blocked by RLS & `demo-ord-*` threw `400 Bad Request`; `initialOrder` + `sessionStorage` preserve items cleanly while RPC tracks status. |
| Merchant KDS & Order Management (`OrderManagement.jsx`) | Supabase `orders`, `order_items`, `table_sessions`, Realtime | No | Yes (`orders_tenant_*`) | Works 100% without Express, including bill preview, thermal iframe printing (`receiptHelpers.js`), CSV export, and table completion (`FINISHED`). |
| Live Floor & Table Management (`TableStatus.jsx`, `TableSessions.jsx`) | Supabase `table_sessions` + active `orders` + Realtime | No | Yes (`table_sessions_tenant_all` + `claim_public_table_session`) | **Hardened breakage (`000001` blocked `anon` table claim) mitigated today:** `useTableSessions` reconciles active `orders` directly onto floor tables; SQL `000002` updated locally to `UPSERT`. |
| Dashboard KPIs (`OverviewCards.jsx`) & Analytics | Supabase queries + client aggregation | No | Yes (`orders_tenant_select`) | Includes **Pending Orders** card (fixed today); `AnalyticsDashboard.jsx` still needs `CANCELLED` filter + removal of legacy `'tigerbistro99@gmail.com'` fallback string. |
| Server-Side POS Billing & Split Settlement (`POSTerminal` → `SplitPaymentModal`) | **Express API** (`/api/billing/*`) | **YES (Mandatory)** | Yes (`invoices` table via service role) | Fails in prod without `VITE_API_URL` + hosted `server/` + `SUPABASE_SERVICE_ROLE_KEY`. |
| Custom Branded SMTP Emails & Expiry Cron | **Express API** (`/api/email/*`, `expiryCron.js`) | **YES (Mandatory)** | Uses `supabase-js` | Auth password-reset still uses native `supabase.auth.resetPasswordForEmail` directly; custom SMTP & daily expiry cron require Express. |
| Supabase Edge Functions | None | N/A | N/A | `0` Edge Functions exist in `supabase/`. |

---

## 2. Verification of Existing Direct-Supabase Workflows (13 Core Workflows)

| # | Core Supabase Workflow | Current Status | Verification Basis & Exact Conditions |
|---|---|---|---|
| 1 | **Merchant signup & login** | **PASS (Code + Unit Tested)** | `RegisterPage.jsx`, `LoginPage.jsx`, `MerchantProtectedRoute.jsx`; `auth-and-tenant.test.js` passes. Defers `restaurants` insert to first login if Confirm Email is ON. |
| 2 | **Restaurant onboarding (`/pricing` → UTR)** | **PASS (Code Verified; Manual Admin Gate)** | `PricingPage.jsx` inserts `PENDING_APPROVAL` row into `subscriptions` & `payment_verifications`; allowed under live `subscriptions_tenant_insert_pending` RLS. Requires Admin approval unless trial/webhook is added. |
| 3 | **Restaurant profile management** | **PASS (Code Verified)** | `ProfileSettings.jsx` + `TaxSettings.jsx` + `restaurant.service.js` update own row via `restaurants_owner_update`. |
| 4 | **Menu & category CRUD** | **PASS (Code + Live Public Read Verified)** | `MenuManagement.jsx`, `CategoryManager.jsx`, `menu.service.js`; live `anon` `SELECT` verified `menu_items` (3 rows) and `menu_categories` (2 rows). |
| 5 | **QR code generation** | **PASS (Code + Unit Tested)** | `QRCodeManagement.jsx`, `tableSecurity.js`; uses `window.location.origin`; unit tests in `table-config.test.js` pass (`4/4`). |
| 6 | **Customer QR menu access** | **PARTIAL / PASS (6-col Live RPC)** | Live `get_public_restaurant_profile` returns `HTTP 200` (`id, business_name, description, logo_url, cover_url, status`); `000003` migration pending only for public `gstin` return. |
| 7 | **Cart & order submission** | **PASS (Code + Unit + Live RPC Exists)** | `CustomerMenu.jsx`, `order.service.js`; `billing-order-upload.test.js` (`12/12` pass); `create_validated_order` verified present (`000002`). Full live DB write-order test not executed under read-only audit rules. |
| 8 | **Merchant order management (`OrderManagement.jsx`)** | **PASS (Code + Demo Store Verified)** | Direct Supabase `orders` + `order_items`, thermal print (`receiptHelpers.js`), CSV export — zero Express dependency. `realtime-orders-and-floor.test.js` verifies order persistence & state updates. |
| 9 | **Kitchen order updates (KDS transitions)** | **PASS (Code + Unit Tested)** | `useOrderManagement.js`, `order.service.js` (`VALID_ORDER_TRANSITIONS`); `billing-order-upload.test.js` + `realtime-orders-and-floor.test.js` pass. |
| 10 | **Order status tracking (`OrderTracking.jsx`)** | **PASS (Fixed Today — Code Verified)** | Non-UUID `demo-ord-*` skip stops `400 Bad Request`; `initialOrder` + `sessionStorage` + `get_public_order_status` RPC (live `HTTP 200`) + 5s polling + `BroadcastChannel` work without Express. |
| 11 | **Restaurant analytics & KPIs (`OverviewCards` / `AnalyticsDashboard`)** | **PARTIAL (Analytics Filter Gap)** | Works 100% via Supabase; `OverviewCards.jsx` + `useOrderManagement.js` exclude `CANCELLED`, while `AnalyticsDashboard.jsx` still counts `CANCELLED` in `orderHistory` charts and retains `'tigerbistro99@gmail.com'` fallback (`line 131`). |
| 12 | **Table management & Live Floor** | **PASS (Fixed Today — Code Verified)** | `useTableSessions.js`, `TableStatus.jsx`, `TableSessions.jsx` now derive table occupancy dynamically from active `orders` + `table_sessions`. Updated `000002` `UPSERT` SQL needs live execution for unseeded DB rows. |
| 13 | **Supabase Realtime subscriptions** | **PASS (Code Verified + Fallback Polling)** | Realtime channels + `BroadcastChannel` + `8000ms`/`5000ms` safety polling verified in hooks; live two-browser WebSocket latency test against staging Supabase remains `BLOCKED` pending authenticated staging run. |

---

## 3. Feature Separation: Core Supabase vs Express vs Future

### A. Existing Core Supabase Functionality (Operational Without Express)
- Merchant Signup, Login, Password Recovery link (`supabase.auth.resetPasswordForEmail`), Workspace Isolation
- Menu Categories, Menu Items, Half/Full Variants, Stock Availability Toggles, Image Upload
- Universal QR & Per-Table Signed QR Codes + Print Standee Studio
- Customer Digital Menu, Cart, Atomic Order Placement (`create_validated_order`), Live Order Status Tracking, Concierge/Waiter Calls
- Orders & KDS Pipeline (`Pending` → `Preparing` → `Ready` → `Served` → `Bill Requested` → `Finished` / `Cancelled`)
- **Thermal Bill Preview & Printing + Order Settlement directly inside `OrderManagement.jsx` ("Orders & KDS") and `TableStatus.jsx` ("View Table")**
- Live Floor Table Management, `Pending Orders` KPI, CRM List, Analytics CSV/PDF Exports
- Platform Admin Manual UTR Subscription Approval & Customer Directory (via Supabase Auth admin role)

### B. Optional / Non-Operational Express Backend Features
- **POS Server Invoice Creation (`POST /api/billing/invoice/generate`) & Payment Settlement (`POST /api/billing/payment/settle`):** Used ONLY by `POSTerminal.jsx` → `SplitPaymentModal.jsx`. **Not required** for a small restaurant to operate because `OrderManagement.jsx` and `TableStatus.jsx` already calculate subtotal/CGST/SGST (`computeReceiptTotals`), print thermal receipts, and mark tables `Finished`. *(Small restaurants only lose split-bill/standalone walk-in POS invoice numbers until `server/` is hosted.)*
- **Branded Custom Email Delivery (`/api/email/*` via Nodemailer):** Used for branded purchase summary PDF emails, expiry reminder emails, and admin test diagnostics. Non-blocking (`approveMerchantPayment` catches errors); Supabase Auth still handles core password-reset emails natively.
- **Automated Daily Expiry Cron (`server/jobs/expiryCron.js`):** Sends 7/3/1/0-day emails and flips `subscriptions.status = 'EXPIRED'`. Client `Dashboard.jsx` independently checks `end_date` at runtime (`verifyAuthAndPlan`), so expiry lock works even without cron.
- **Express Admin Auth Check (`/api/admin/session`):** Optional backend mirror of Supabase `app_metadata.role`.

### C. Future Enterprise Enhancements
- Multi-user kitchen/waiter/cashier PIN & role-based access control (RBAC)
- Payment gateway webhooks (Razorpay/Cashfree auto-verification & recurring UPI AutoPay)
- Dish custom modifiers/add-ons, FSSAI field, tax-inclusive MRP mode, Z-report shift cash drawer
- Invoice refund/credit-note ledger & DB sequence (`INV-FY-...`)
- Offline PWA / IndexedDB POS queueing, delivery aggregators (Swiggy/Zomato), multi-outlet chains, hotel PMS/room-folio suite.

---

## 4. Actual RLS & Security Validation (`oliuhzkbnxjiwkrdlcfv.supabase.co`)

### Directly Observed Live Database Behavior (Read-Only Probe Today)
- **`restaurants`, `orders`, `customers`, `table_sessions`, `payment_verifications`, `subscriptions`, `notifications`, `qr_codes`:** Unauthenticated `anon` queries returned `HTTP 200` with **`0` rows (`[]`)** — confirming `20261127000001` RLS policies are **actively enforced** on live Supabase (no tenant PII, customer phone/emails, or private orders are exposed to `anon`).
- **`menu_items` (`3` rows), `menu_categories` (`2` rows), `gst_settings` (`2` rows), `subscription_plans` (`1` row):** Intentionally public-readable for QR menus & `/pricing` (`HTTP 200`).
- **Public RPCs (`get_public_restaurant_profile`, `get_public_table_numbers`, `get_public_order_status`, `claim_public_table_session`):** Live and callable by `anon` (`HTTP 200`).
- **Admin Privilege Guard (`is_platform_admin`):** Live and rejects `anon` with **`HTTP 401` (`42501`)**.
- **Pending SQL on Live DB:** Live `get_public_restaurant_profile` returns `6` columns (without `gstin`), proving `20261127000003_restaurant_gstin.sql` and today's `UPSERT` enhancement in `20261127000002` remain pending execution on live Supabase.

### Security Scope Boundary (Code-Reviewed vs Live-Tested)
- **Verified Live:** Anonymous RLS isolation across all private tenant tables, public RPC availability, and admin RPC rejection for `anon`.
- **Verified by Code + Unit/Mock Tests (Requires Authenticated Two-Tenant Staging Test):** Cross-tenant Tenant A vs Tenant B write rejection (`owns_restaurant`), authenticated `order_items` isolation, admin UI mutation (`app_metadata.role`), and server billing cross-tenant `403` guards (`billing-engine.test.js`, `security-middleware.test.js`).

---

## 5. Honest Reclassification of Previously Reported Blockers

| Previous Blocker | Breaks Core Supabase Product? | Express-Only Feature? | Classification & Impact on Initial Pilot Restaurants |
|---|---|---|---|
| **Missing `VITE_API_URL`** | **No** (QR menu, KDS, thermal receipts in `OrderManagement`, onboarding, table floor all work without it) | **Yes** (`POSTerminal` → `SplitPaymentModal` & custom SMTP) | **Express Feature Only.** Pilot restaurants can process QR orders & print receipts via `Orders & KDS` without Express; temporarily hide/label `POS & Smart Billing` settle until `server/` deploys, or deploy `server/`. |
| **Missing `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`** | **No** (Vite app never uses it) | **Yes** (`server/` cron & `/api/billing/*`) | **Express Deployment Prerequisite Only.** Only needed when deploying `server/`. |
| **In-memory `invoiceCounters` (`server/`)** | **No** (does not touch `OrderManagement` thermal receipts) | **Yes** (`server/services/invoice.service.js`) | **Compliance Issue for Express POS Only.** Must swap to DB sequence before enabling Express GST invoicing in production; does **not** block QR ordering pilot using `OrderManagement` receipts. |
| **Merchant suspension UI (`Dashboard.jsx:112` `_setIsSuspended`)** | **Yes** (public QR ordering stops in live DB, but active console stays open) | No (Core Supabase Dashboard) | **Core SaaS Control Bug (High).** Public diners are already blocked once suspended, so new orders stop, but suspended owners can still log into dashboard UI. Quick 5-line fix recommended before wide rollout. |
| **Cancelled order revenue in `AnalyticsDashboard.jsx`** | **Partial** (`OverviewCards` & `useOrderManagement` stats fixed today; `AnalyticsDashboard.jsx` still counts `CANCELLED`) | No (Core Supabase Analytics) | **Core Reporting Bug (Medium–High).** Causes inflated sales charts if orders are cancelled; quick filter fix (`status !== 'CANCELLED'`). Pilots remain functional if noted. |
| **Stock restoration on `CANCELLED` (`order.service.js`)** | **Only if finite inventory quantities are set** | No (Core Supabase Inventory) | **Data-Integrity Gap (Medium).** Restaurants leaving stock quantity unlimited (`null`) and using the manual In-Stock toggle are unaffected; high priority if counting dish portions. |
| **Missing refunds (`/api/billing`)** | **No** | **Yes** (Express billing ledger) | **Financial Feature Gap (Low for QR Pilot).** Core QR ordering settles pay-at-counter; cash/UPI refunds happen directly at the register. |
| **Multi-user staff RBAC** | **No** (works on single owner account/tablet) | Future Core / Supabase Auth | **Product Gap by Segment.** Acceptable for single-owner small restaurants/cafes; blocks multi-shift full-service restaurants requiring separate cashier/kitchen logins. |
| **Offline support (`serviceWorker`/`indexedDB`)** | **No** | Future Capability | **Architecture Gap (Operational Requirement).** Requires reliable Wi-Fi/4G at the restaurant; never market offline support. |
| **Hotel / PMS / Room-folio features** | **No** | Future Enterprise | **Out-of-Scope Segment.** Irrelevant to restaurant SaaS pilot; blocks selling to hotels/resorts. |

---

## 6. Lifecycle Test Summary (Without Express Backend)

| Check / Lifecycle Step | Method & Environment | Outcome |
|---|---|---|
| Client Unit & Flow Suites (`npm --prefix client test -- --run`) | Vitest (`5` files, `37` tests): receipts, tenant isolation mocks, table config, demo order persistence & Table 7 occupancy, order transitions, Pending Orders card | **PASS (`37/37`)** |
| Frontend Production Build (`npm --prefix client run build`) | Vite `7.3.8` (`client/dist/` generated cleanly in `12.42s`) | **PASS** |
| Dependency Audits (`client` & `server`) | `npm audit` on both workspaces | **PASS (`0` vulnerabilities)** |
| Live Supabase Anonymous RLS & RPC Probe | Live HTTPS REST/RPC probe against `oliuhzkbnxjiwkrdlcfv.supabase.co` | **PASS** (Private tables return `0` rows to `anon`; public RPCs `000002` active; `000003` GSTIN RPC pending) |
| Live Authenticated Two-Tenant Merchant → Customer QR → KDS Lifecycle | End-to-end authenticated write test on live Supabase | **BLOCKED** (Prohibited/unexecuted in this audit pass; browser QA subagent also previously hit `429` quota and Confirm Email must be verified) |
| Express POS Server Invoicing (`SplitPaymentModal`) & Live SMTP Email | Live staging checkout & Gmail inbox delivery | **BLOCKED / NOT DEPLOYED** (`server/` not hosted; `VITE_API_URL` unset) |

---

## 7. Revised Market Readiness Verdicts (By Product & Segment)

| Offering / Market Segment | Verdict | Reasoning |
|---|---|---|
| **1. Core QR Ordering SaaS** *(QR scan → Digital Menu → Atomic Order → Live Tracking → KDS)* | **`READY FOR ASSISTED PILOT`** *(after deploying today's build + running `000003` / updated `000002` SQL)* | Core Supabase architecture, live RLS (`000001`), atomic order RPC (`000002`), OrderTracking fix, Live Floor sync, and Pending Orders KPI are built and working without Express. |
| **2. Basic Restaurant Management** *(Menu, Categories, Tables, Thermal Bill Print via Orders & KDS, Basic Sales)* | **`LIMITED PILOT READY`** | Fully Supabase-native once `Dashboard.jsx` suspension check & `AnalyticsDashboard.jsx` `CANCELLED` filter are patched and Express-only POS billing is clearly gated/hidden or deployed. |
| **3. Restaurant POS & Financial Operations** *(`POSTerminal` → `SplitPaymentModal` → Tax Invoices → Refunds → Z-Reports)* | **`NOT READY`** | Throws `VITE_API_URL missing` until `server/` deploys with `SUPABASE_SERVICE_ROLE_KEY`; in-memory invoice counter resets on restart; zero refunds/day-end Z-reports/FSSAI field/CA tax audit. |
| **4. Subscription SaaS Operations** *(Self-Serve Signup → Payment → Auto Activation → Expiry → Suspension)* | **`ONLY WITH MANUAL ADMIN SUPPORT`** | Paid activation requires human admin UTR check (`approveMerchantPayment`), `Dashboard.jsx:112` does not lock suspended consoles, and expiry cron is undeployed. |
| **5. Multi-Outlet Restaurants** | **`NOT READY`** | Single-restaurant-per-login data model; no branch switcher, shared catalog push, or HQ reporting. |
| **6. Hotels and Resorts** | **`NOT READY` (`NOT IMPLEMENTED`)** | Zero PMS integration, room-charge folio billing, room QR mode, or multi-department staff routing. |

---

## Explicit Answers to Key Ownership Questions

1. **Can an existing restaurant continue using the original Supabase architecture?**  
   **Yes.** Existing restaurants using **QR Ordering, Menu & Category Management, QR Codes, Table Sessions, Live Floor, Orders & KDS (`OrderManagement.jsx`), Order Tracking, CRM, and Analytics** operate directly on Supabase without requiring Express. Only the **`POS & Smart Billing` (`POSTerminal` → `SplitPaymentModal`)** payment settlement button and custom SMTP emails require Express today.

2. **Can a new restaurant onboard and start accepting QR orders?**  
   **Yes, with manual Admin UTR approval** *(provided live Supabase has `Confirm Email` configured cleanly with the deferred workspace provisioning in `LoginPage.jsx` / `RegisterPage.jsx`, and the admin clicks Approve on their submitted UTR in `/admin/verifications`)*. Without Express, only optional welcome/purchase PDF emails fail silently (`non-blocking`).

3. **Which features genuinely require the Express backend?**  
   Only:
   - Server-authoritative POS invoice generation (`/api/billing/invoice/generate`) & payment settlement (`/api/billing/payment/settle`) used by `POSTerminal.jsx` → `SplitPaymentModal.jsx`.
   - Custom Nodemailer SMTP emails (`/api/email/*` for purchase summary PDFs, branded password reset, expiry reminders, admin test emails).
   - Scheduled automated daily `expiryCron.js` job & Express admin/billing APIs.

4. **Can we safely launch a limited QR-ordering pilot?**  
   **Yes — as a closely assisted Limited Pilot (1–5 friendly single-owner venues)** once:
   - Today's client fixes (`OrderTracking.jsx`, `order.service.js`, `useOrderManagement.js`, `useTableSessions.js`, `TableStatus.jsx`, `OverviewCards.jsx`) are deployed cleanly to **one authoritative host** (eliminating Vercel vs Cloudflare split-brain),
   - Updated `20261127000002` (`UPSERT` table session) and `20261127000003` (`gstin`) are applied in Supabase,
   - `POS & Smart Billing` is either backed by a live Express `server/` (`VITE_API_URL`) or temporarily routed/hidden in favor of **`Orders & KDS` billing & thermal printing**, and
   - Pilot restaurants understand it is online-only (broadband/4G required) and owner-operated on one login.

5. **What minimum fixes are necessary before accepting paying commercial customers?**  
   **Minimum Pre-Commercial Checklist:**
   1. **Apply `20261127000003_restaurant_gstin.sql` & updated `20261127000002` `UPSERT` SQL** on live Supabase, and verify one full authenticated Tenant A vs Tenant B + QR order → KDS → thermal print lifecycle E2E test.
   2. **Resolve frontend split-brain** (single authoritative Cloudflare Pages or Vercel origin) + scrub legacy admin env vars in hosting dashboards.
   3. **Fix remaining core bugs:** Wire `_setIsSuspended` to `restaurants.status` in `Dashboard.jsx:112`, filter `CANCELLED` in `AnalyticsDashboard.jsx` & remove `'tigerbistro99@gmail.com'` fallback (`line 131`), remove 16 hardcoded dummy items in `POSTerminal.jsx:188-206`, and escape `item.name` in `POSBillPreviewModal.jsx:65`.
   4. **Decide POS Scope Clearly:** Either **deploy `server/`** (`SUPABASE_SERVICE_ROLE_KEY`, persistent PostgreSQL invoice counter replacing `invoiceCounters` Map, fix `expiryCron.js:64` case check, set `VITE_API_URL`), **OR** gate `POSTerminal` settlement clearly until backend billing + GST/FSSAI compliance (with CA review) is completed.
