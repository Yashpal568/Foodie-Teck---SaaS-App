# SERVORA — LAUNCH BLOCKER FIX REPORT (POST-REVIEW EDITION)

**Date:** 2026-11-27  
**Repository:** `E:\foodie-tech` (`main` @ `e5b52f3` + local uncommitted changes)  
**Architecture Preserved:** React + Vite + Supabase Auth + PostgreSQL + RLS + Realtime (no migration of core restaurant workflows to Express; Express remains optional/gated for hosted billing)

---

## 1. Confirmed Fixes

All launch blockers from the Core SaaS Acceptance Test plus multi-tenant UI/broadcast & suspension-bypass gaps caught during pre-merge review have been resolved locally:

### A. Analytics `CANCELLED` Exclusion & Hardcoded Fallback Removal
- Created [analyticsHelpers.js](file:///e:/foodie-tech/client/src/utils/analyticsHelpers.js) (`isCancelledOrder`, `filterBillableOrders`, `getOrderTimestamp`, `getOrderTotal`, `computeAnalyticsSummary`, `computeCustomDateRangeStats`, `computeRevenueTrend`, `computeHourlyPeakData`).
- Updated [AnalyticsDashboard.jsx](file:///e:/foodie-tech/client/src/components/dashboard/AnalyticsDashboard.jsx) to remove hardcoded `'tigerbistro99@gmail.com'` / `'Tiger Bistro'` fallbacks and use `analyticsHelpers`.
- Updated [DashboardRealtimeAnalytics.jsx](file:///e:/foodie-tech/client/src/components/dashboard/DashboardRealtimeAnalytics.jsx) to exclude `CANCELLED` orders from `categoryData` while preserving tenant and date filters.

### B. Atomic & Idempotent Cancellation Inventory Restoration
- Added migration [20261127000004_cancellation_inventory_and_suspension_rls.sql](file:///e:/foodie-tech/supabase/migrations/20261127000004_cancellation_inventory_and_suspension_rls.sql):
  - Adds `inventory_restored BOOLEAN NOT NULL DEFAULT FALSE` and `inventory_restored_at TIMESTAMPTZ` on `public.orders`.
  - Adds `SECURITY DEFINER` (`SET search_path = ''`) RPC `public.cancel_order_and_restore_inventory(UUID)`:
    - Serializes concurrent cancellations with `FOR UPDATE` on `orders` and `menu_items`.
    - Enforces `private.owns_restaurant(v_order.restaurant_id)` and rejects non-admin cancellation on `Suspended` restaurants.
    - Returns idempotently (`already_cancelled: TRUE`, `restored: FALSE`) on repeat cancellation calls.
    - Validates allowed transitions (`PENDING`, `ORDERED`, `PREPARING`, `READY` -> `CANCELLED`).
    - Restores finite `menu_items.quantity` (`WHERE quantity IS NOT NULL`), leaving `NULL` (unlimited) stock untouched, and releases `table_sessions` only if no other active orders remain on the same table.
- Updated [order.service.js](file:///e:/foodie-tech/client/src/services/order.service.js):
  - Single cancellation entry point (`updateOrderStatus`) used across all merchant KDS/modal cancellation paths.
  - Invokes `cancel_order_and_restore_inventory` first, with a concurrency-safe conditional fallback (`inFlightStatusTransitions`, `restoredInventoryOrderIds`, `.in('status', ['PENDING', 'ORDERED', 'PREPARING', 'READY'])`).

### C. Full Suspension Enforcement & UI Lockout
- Wired `setIsSuspended` cleanly in [Dashboard.jsx](file:///e:/foodie-tech/client/src/pages/Dashboard.jsx) (with real-time `restaurants` status listener), locking operational routes behind [SuspensionOverlay.jsx](file:///e:/foodie-tech/client/src/components/dashboard/SuspensionOverlay.jsx) while preserving Support Tickets (`<HelpSupport />`), read-only Account/Subscription Status, and Sign Out.
- Added `isRestaurantSuspended` and `assertMerchantOperational` in [merchantAuth.js](file:///e:/foodie-tech/client/src/lib/merchantAuth.js).
- Enforced suspension at API & DB layers via [security.js](file:///e:/foodie-tech/server/middleware/security.js) (`403`) and `20261127000004` (`private.is_restaurant_active(UUID)` RLS).

### D. Multi-Tenant & Demo Sandbox Isolation + KDS UI Refinement
- Fixed real user email/session/storage leaks into `demo-merchant` and sibling tenants across [Navbar.jsx](file:///e:/foodie-tech/client/src/components/layout/Navbar.jsx), [Dashboard.jsx](file:///e:/foodie-tech/client/src/pages/Dashboard.jsx), [MenuManagement.jsx](file:///e:/foodie-tech/client/src/components/menu/MenuManagement.jsx), [QRCodeManagement.jsx](file:///e:/foodie-tech/client/src/components/dashboard/QRCodeManagement.jsx), [Settings.jsx](file:///e:/foodie-tech/client/src/components/dashboard/Settings.jsx), [HelpSupport.jsx](file:///e:/foodie-tech/client/src/components/dashboard/HelpSupport.jsx), [CustomerMenu.jsx](file:///e:/foodie-tech/client/src/pages/CustomerMenu.jsx), and realtime channels ([OrderNotification.jsx](file:///e:/foodie-tech/client/src/components/dashboard/OrderNotification.jsx), [WaiterCallBanner.jsx](file:///e:/foodie-tech/client/src/components/dashboard/WaiterCallBanner.jsx), [useNotifications.js](file:///e:/foodie-tech/client/src/hooks/useNotifications.js)).
- Redesigned [OrderManagement.jsx](file:///e:/foodie-tech/client/src/components/dashboard/OrderManagement.jsx) top control center & filter toolbar with installed shadcn/ui primitives (`Tabs`, `Badge`, `Button`, `Input`, `Select`, `Separator`, `Tooltip`) and replaced `"Day & Date History"` with `"Order History"`.

---

## 2. Issues Discovered During Pre-Merge Security & Regression Review

The final pre-merge code, SQL, and service audit uncovered **5 additional hardening gaps**:

1. **Self-Unsuspension Privilege Escalation on `public.restaurants`:** Baseline policy `restaurants_owner_update` (`000001:173`) allowed authenticated owners to update their own `restaurants.status` directly back to `'Active'` via PostgREST.
2. **Remaining Unguarded Operational Tables in `000004` RLS:** `order_items` (`INSERT`), `gst_settings`, `payment_methods`, `notifications`, and `waiter_calls` still permitted writes by suspended owners alongside the initial 6 tables.
3. **Uncovered Client Merchant Write Services & `GET /api/billing/invoice/:id`:**
   - `updateMenuItem`, `deleteMenuItem`, `bulkAddMenuItems`, `bulkReplaceMenuItems`, `syncCategories` (`menu.service.js`), `updateRestaurantProfile` (`restaurant.service.js`), `saveGstSettings` / `recordPriceChange` (`admin.service.js`), `markAllNotificationsRead` / `clearNotifications` (`notification.service.js`), `syncTableSession` / `acknowledgeAllWaiterCalls` / `updateTableStatus` (`table.service.js`), and fallback non-cancelled transitions in `updateOrderStatus` (`order.service.js`) lacked `assertMerchantOperational`.
   - `GET /api/billing/invoice/:id` (`server/routes/billing.routes.js`) checked `owner_id` without checking `status === 'Suspended'`.
   - `table.service.js:222` still published to a `waiter-toasts:rid=all` broadcast channel.
4. **Migration `000004` Re-run Idempotency & Table-Number Overflow Guard:** Newly created `*_tenant_select` / `*_tenant_write` policies lacked preceding `DROP POLICY IF EXISTS` on re-runs, and `REGEXP_REPLACE(...)::INT` lacked a digit-length guard (`^\d{1,6}$`).
5. **Same-Item Variant Aggregation in Client Fallback Cancellation:** In orders containing two lines sharing one `menu_item_id` (e.g., Full + Half), `restoreFiniteOrderInventory` queried `menu_items` separately per line instead of summing quantities by `menu_item_id` first.

---

## 3. Additional Fixes Implemented During Review

- **Migration `000004` Hardening ([20261127000004_cancellation_inventory_and_suspension_rls.sql](file:///e:/foodie-tech/supabase/migrations/20261127000004_cancellation_inventory_and_suspension_rls.sql)):**
  - Added `BEFORE UPDATE ON public.restaurants` trigger `trg_guard_restaurant_status` (`private.guard_restaurant_status_update()`, `SECURITY DEFINER SET search_path = ''`) blocking non-admin edits to `status` / `owner_id` or updates on `Suspended` rows.
  - Tightened RLS write policies on `order_items`, `gst_settings`, `payment_methods`, `notifications`, and `waiter_calls` (preserving `SELECT` and leaving `support_tickets` / `ticket_replies` open), added idempotent `DROP POLICY IF EXISTS` before every `CREATE POLICY`, added `^\d{1,6}$` regex check before integer cast on `table_number`, and documented an emergency rollback section.
- **Complete Client Write Guards & Variant Aggregation:**
  - Added `assertMerchantOperational` to all remaining merchant write functions across [menu.service.js](file:///e:/foodie-tech/client/src/services/menu.service.js), [restaurant.service.js](file:///e:/foodie-tech/client/src/services/restaurant.service.js), [admin.service.js](file:///e:/foodie-tech/client/src/services/admin.service.js), [notification.service.js](file:///e:/foodie-tech/client/src/services/notification.service.js), [table.service.js](file:///e:/foodie-tech/client/src/services/table.service.js), and [order.service.js](file:///e:/foodie-tech/client/src/services/order.service.js).
  - Pre-aggregated line quantities per `menu_item_id` in `restoreFiniteOrderInventory` and removed `waiter-toasts:rid=all` from `table.service.js`.
- **Server Invoice Route Suspension Guard:** Updated `GET /api/billing/invoice/:id` in [billing.routes.js](file:///e:/foodie-tech/server/routes/billing.routes.js#L148-L159) to return `403` when `rest.status === 'Suspended'`.
- **Expanded Regression Tests:** Added multi-item + same-ID variant cancellation and multi-service suspension tests in [launch-blockers.test.js](file:///e:/foodie-tech/client/src/__tests__/launch-blockers.test.js#L305-L370) and suspended invoice read rejection (`403`) in [security-and-billing.test.js](file:///e:/foodie-tech/server/tests/security-and-billing.test.js#L377-L398).

---

## 4. Test & Verification Results (Post-Final-Edit Run)

1. **Client Vitest Suite (`npm --prefix client test -- --run`):**
   - **Result:** `Test Files  6 passed (6)` | `Tests  47 passed (47)` | `0 failed` (`3.99s`)
   - Files: `receipt-helpers.test.js` (`6`), `auth-and-tenant.test.js` (`12`), `table-config.test.js` (`4`), `billing-order-upload.test.js` (`12`), `launch-blockers.test.js` (`8`), `realtime-orders-and-floor.test.js` (`5`).
2. **Server Node Test Suite (`npm --prefix server test`):**
   - **Result:** `# tests 17` | `# suites 3` | `# pass 17` | `# fail 0` | `# cancelled 0` | `# skipped 0` (`451.39ms`).
3. **Production Frontend Build (`npm --prefix client run build`):**
   - **Result:** `✓ 3359 modules transformed.` | `✓ built in 12.13s` | `exit code 0`.
4. **Static SQL & Migration Check:**
   - Verified `BEGIN;` / `COMMIT;`, `SET search_path = ''` on all `SECURITY DEFINER` functions, and matching `DROP POLICY IF EXISTS` guards across `000001`–`000004`.

---

## 5. Remaining Risks

1. **Unverified Live Postgres Execution (`000002` Upsert, `000003`, `000004`):** Because no isolated staging Supabase project is currently configured (`oliuhzkbnxjiwkrdlcfv.supabase.co` is the sole DB), trigger `trg_guard_restaurant_status`, RPC `cancel_order_and_restore_inventory`, and updated RLS write restrictions have only been verified statically and via mocked Vitest/Node tests—not yet executed against live PostgreSQL.
2. **Case Sensitivity Variance in Pre-Existing `000002` / `000003` RPCs:** `000002` (`create_validated_order`, `get_public_restaurant_profile`) and `000003` check `COALESCE(status, 'Active') <> 'Suspended'` (exact TitleCase), whereas `000004` uses `LOWER(...) = 'suspended'` (case-insensitive). Existing Admin flows set `'Suspended'`, matching both safely.
3. **Express POS Dependency Notice:** `POS & Smart Billing` remains gated when `VITE_API_URL` / hosted Express `server/` is unavailable; `Orders & KDS` operates directly through Supabase.

---

## 6. Exact Production Deployment Prerequisites

1. Provision/connect an **isolated staging Supabase project** and run migrations in exact order:
   - `20261127000001_security_hardening_rls.sql`
   - `20261127000002_atomic_order_and_data_integrity.sql` (latest version with table upsert)
   - `20261127000003_restaurant_gstin.sql`
   - `20261127000004_cancellation_inventory_and_suspension_rls.sql`
2. Execute a live staging two-tenant smoke test:
   - Register/approve Tenant A and Tenant B (confirming Email + Admin UTR approval).
   - Place finite-stock + unlimited-stock orders, cancel once + attempt concurrent/repeat cancel, and verify stock restores once.
   - Suspend Tenant B and verify: Dashboard locks behind `<SuspensionOverlay />`, Support Ticket creation works, direct Supabase `UPDATE restaurants SET status='Active'` fails with trigger error, direct operational table writes fail via RLS, and Tenant A remains unaffected.
3. Commit and deploy the rebuilt `client/dist` bundle cleanly to **one authoritative host** (Cloudflare/Vercel pointing to the same release) before onboarding paying merchants.
