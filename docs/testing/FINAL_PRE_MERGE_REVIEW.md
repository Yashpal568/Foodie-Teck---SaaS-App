# SERVORA — FINAL PRE-MERGE SECURITY & REGRESSION REVIEW

**Review Date:** 2026-11-27  
**Repository:** `E:\foodie-tech` (`main` @ `e5b52f3` + local uncommitted workspace changes)  
**Reviewer Scope:** Full diff inspection (38 modified files, 4 new files), SQL migrations `000001`–`000004`, cancellation & suspension write paths, client/server test suites, and production build.  
**Live Prod Safety:** Zero commits, pushes, merges, deployments, production SQL runs, or history rewrites performed.

---

## Verdict: `SAFE TO MERGE AFTER STAGING`

**Rationale:** Every launch blocker, multi-tenant isolation leak, cancellation race condition, and suspension bypass found during this review is fixed locally and verified across automated unit/integration tests (`47/47` client Vitest, `17/17` server Node tests, `vite build` `3359` modules cleanly transformed) plus static SQL audits. Merge to mainline and deploy cleanly **only after running the staged SQL migrations (`000002`–`000004`) and the 2-tenant live smoke checklist against an isolated staging Supabase project.**

---

## 1. Complete Diff & Architecture Integrity Inspection

Inspected `git status -s` and `git diff --stat` across all **38 modified** and **4 untracked** files:

| Domain | Files Inspected | Verdict & Findings |
|---|---|---|
| **Core Workflow Preservation** | `Dashboard.jsx`, `order.service.js`, `menu.service.js`, `table.service.js`, `OrderManagement.jsx`, `CustomerMenu.jsx` | Existing direct-Supabase architecture (`React + Vite + Supabase Auth + RLS + Realtime`) is preserved intact. No core workflow requires Express. `OrderManagement.jsx` top header & toolbar redesigned using installed shadcn/ui primitives (`Tabs`, `Badge`, `Button`, `Input`, `Select`, `Separator`, `Tooltip`) with `"Day & Date History"` replaced cleanly by `"Order History"`. |
| **Tenant & Demo Isolation** | `Navbar.jsx`, `Dashboard.jsx`, `MenuManagement.jsx`, `QRCodeManagement.jsx`, `Settings.jsx`, `HelpSupport.jsx`, `CustomerMenu.jsx`, `OrderNotification.jsx`, `WaiterCallBanner.jsx`, `useNotifications.js`, `restaurant.service.js` | Fixed demo/real email leak (`yash38688@gmail.com` inside `demo-merchant`), removed unscoped `localStorage` branding keys (`servora_restaurant_logo`/`cover`/`name`), eliminated `'all'` broadcast channels, and enforced strict `restaurant_id` matching across all tabs & storage listeners. |
| **Analytics Accuracy** | `analyticsHelpers.js`, `AnalyticsDashboard.jsx`, `DashboardRealtimeAnalytics.jsx` | `CANCELLED` orders excluded across KPI totals, AOV, hourly peaks, trends, categories, custom date ranges, and exports; hardcoded `'tigerbistro99@gmail.com'` removed. |
| **Privileged Credential Hygiene** | Full diff & open config scan | Zero secrets, service-role keys, SMTP credentials, or hardcoded admin credentials added to client bundles or committed files. |

---

## 2. Database Migration & SQL Security Review (`000001`–`000004`)

Audited `20261127000001_security_hardening_rls.sql`, `20261127000002_atomic_order_and_data_integrity.sql`, `20261127000003_restaurant_gstin.sql`, and `20261127000004_cancellation_inventory_and_suspension_rls.sql`:

| Check | Status | Details & Evidence |
|---|---|---|
| **Migration Ordering & Safety** | **PASS (Additive & Transactional)** | All 4 files wrap DDL/DML inside `BEGIN; ... COMMIT;`. `000002` adds order/menu columns + atomic RPCs -> `000003` adds `gstin` columns and drops/recreates `get_public_restaurant_profile(UUID)` cleanly with 7 columns -> `000004` adds `orders.inventory_restored` / `inventory_restored_at`, `private.is_restaurant_active(UUID)`, `public.cancel_order_and_restore_inventory(UUID)`, `trg_guard_restaurant_status`, and suspension write locks. Zero destructive column drops or data truncation. |
| **`SECURITY DEFINER` & `search_path`** | **PASS** | Verified statically: every `SECURITY DEFINER` helper/RPC across `000001`–`000004` explicitly sets `SET search_path = ''` and schema-qualifies all references (`public.*`, `private.*`). |
| **RPC Grants & Authorization** | **PASS** | `public.cancel_order_and_restore_inventory(UUID)` revokes `PUBLIC, anon` and grants `EXECUTE` strictly to `authenticated`. Inside the function body, it enforces `private.owns_restaurant(v_order.restaurant_id)` and rejects non-admin suspended workspaces. `private.is_restaurant_active(UUID)` revokes `PUBLIC, anon`. |
| **Self-Unsuspension Trigger (`000004` Added Fix)** | **FIXED IN REVIEW** | Review detected that `restaurants_owner_update` (`000001:173`) allowed owners to update their own `status` back to `'Active'`. Added `private.guard_restaurant_status_update()` (`BEFORE UPDATE ON public.restaurants`) in `000004` blocking non-admin edits to `status`/`owner_id` and writes while `Suspended`. |
| **Policy Conflicts & Re-Run Idempotency** | **FIXED IN REVIEW** | Review ensured every `CREATE POLICY` in `000004` has preceding `DROP POLICY IF EXISTS` on both baseline (`000001`) and `000004` policy names, and hardened `table_number` regex (`^\d{1,6}$`) against integer overflow. |
| **Admin & Support Access While Suspended** | **PASS** | `support_tickets_tenant_all`, `ticket_replies_tenant_all`, and `SELECT` on `restaurants`/`subscriptions` remain untouched so suspended merchants can view plan/account status and communicate with platform support, while platform admins retain `(private.is_platform_admin() OR ...)` override on every policy. |
| **Rollback Procedure** | **DOCUMENTED** | Non-destructive rollback SQL reference added to [20261127000004_cancellation_inventory_and_suspension_rls.sql](file:///e:/foodie-tech/supabase/migrations/20261127000004_cancellation_inventory_and_suspension_rls.sql#L332-L339) and staging prerequisites documented below. |

---

## 3. Cancellation Path Audit & Inventory Restoration Behavior

Traced every order cancellation entry point across client, admin, and server:
- **Entry Points:** [OrderManagement.jsx](file:///e:/foodie-tech/client/src/components/dashboard/OrderManagement.jsx) (`lines 1497, 1804, 2080` across Grid, Kanban, List/Detail views) -> [useOrderManagement.js](file:///e:/foodie-tech/client/src/hooks/useOrderManagement.js) (`updateStatus`) -> [order.service.js](file:///e:/foodie-tech/client/src/services/order.service.js) (`updateOrderStatus`).
- **Admin & Server:** Verified no alternate admin food-order cancellation UI or Express order-cancellation endpoint bypasses `updateOrderStatus` (`server/routes/billing.routes.js` only handles invoices/tax/payments).
- **Atomicity, Concurrency & Multi-Item Safety:**
  - **SQL RPC path (`000004`):** Locks target `orders` row `FOR UPDATE`, validates cancellable status (`PENDING|ORDERED|PREPARING|READY`), checks idempotency (`status = 'CANCELLED' OR inventory_restored = TRUE`), loops deterministically (`ORDER BY oi.menu_item_id ASC`) with `FOR UPDATE` on `menu_items`, increments only finite `quantity IS NOT NULL` rows, preserves `NULL`/unlimited items untouched, and frees `table_sessions` only when zero open sibling orders exist on that table.
  - **Client fallback path (`order.service.js`):** Deduplicates concurrent clicks (`inFlightStatusTransitions`), enforces atomic `.in('status', ['PENDING', 'ORDERED', 'PREPARING', 'READY'])` DB transition when supported, tracks `restoredInventoryOrderIds`, and **pre-aggregates quantities per `menu_item_id`** (fixed in review) so multi-line orders containing both Full + Half variants of the same finite item + second finite items + `NULL` unlimited items restore exact quantities without double-restoration. Historical order rows remain intact.

---

## 4. Suspension Enforcement Matrix Across Services & Layers

| Layer / Operation | Guards Present | Status |
|---|---|---|
| **Dashboard UI ([Dashboard.jsx](file:///e:/foodie-tech/client/src/pages/Dashboard.jsx))** | `setIsSuspended` wired from `restaurants.status` + live Supabase Realtime listener; operational screens locked behind `<SuspensionOverlay />`, allowing only Support (`<HelpSupport />`), read-only Account/Subscription Status, & Sign Out. | **PASS** |
| **Menu & Categories ([menu.service.js](file:///e:/foodie-tech/client/src/services/menu.service.js))** | `createMenuItem`, `updateMenuItem`, `toggleMenuItemStock`, `deleteMenuItem`, `bulkAddMenuItems`, `bulkReplaceMenuItems`, `syncCategories` all enforce `assertMerchantOperational` + RLS `000004`. | **PASS (Hardened in Review)** |
| **Tables & QR Fleet ([table.service.js](file:///e:/foodie-tech/client/src/services/table.service.js))** | `configureRestaurantTables`, `bulkSaveQRCodes`, `syncTableSession`, `acknowledgeAllWaiterCalls`, and non-guest `updateTableStatus` enforce `assertMerchantOperational` + RLS `000004`. | **PASS (Hardened in Review)** |
| **Orders & KDS ([order.service.js](file:///e:/foodie-tech/client/src/services/order.service.js))** | `updateOrderStatus` (all transitions + `cancel_order_and_restore_inventory` RPC) & `000004` `orders`/`order_items` RLS + `create_validated_order` RPC block suspended writes. | **PASS (Hardened in Review)** |
| **Restaurant Profile & GST ([restaurant.service.js](file:///e:/foodie-tech/client/src/services/restaurant.service.js), [admin.service.js](file:///e:/foodie-tech/client/src/services/admin.service.js))** | `updateRestaurantProfile`, `saveGstSettings`, `recordPriceChange` enforce `assertMerchantOperational` + `trg_guard_restaurant_status` + `gst_settings` RLS `000004`. | **PASS (Hardened in Review)** |
| **Notifications & Payment Methods ([notification.service.js](file:///e:/foodie-tech/client/src/services/notification.service.js), `000004`)** | `markAllNotificationsRead` & `clearNotifications` enforce `assertMerchantOperational`; `notifications`, `waiter_calls`, and `payment_methods` write policies restricted in `000004`. | **PASS (Hardened in Review)** |
| **Express Server ([security.js](file:///e:/foodie-tech/server/middleware/security.js), [billing.routes.js](file:///e:/foodie-tech/server/routes/billing.routes.js))** | `requireRestaurantAccess` and `GET /api/billing/invoice/:id` reject suspended restaurants with HTTP `403`. | **PASS (Hardened in Review)** |

---

## 5. Regression Tests Executed (Post-Final-Edit)

All commands executed locally after the final code & SQL edits:

- **Client Vitest Suite (`npm --prefix client test -- --run`):**
  - **PASS:** `Test Files  6 passed (6)` | `Tests  47 passed (47)` | `0 failed` | Duration `3.99s`
  - Breakdown: `receipt-helpers.test.js` (`6`), `auth-and-tenant.test.js` (`12`), `table-config.test.js` (`4`), `billing-order-upload.test.js` (`12`), `launch-blockers.test.js` (`8`), `realtime-orders-and-floor.test.js` (`5`).
- **Server Node Test Suite (`npm --prefix server test`):**
  - **PASS:** `# tests 17` | `# suites 3` | `# pass 17` | `# fail 0` | `# cancelled 0` | `# skipped 0` | Duration `451.39ms`.
- **Production Vite Build (`npm --prefix client run build`):**
  - **PASS:** `✓ 3359 modules transformed.` | `✓ built in 12.13s` | `exit code 0`.
- **SQL Static Verification:** Verified `BEGIN;`/`COMMIT;`, `SET search_path = ''` on all `SECURITY DEFINER` definitions, and idempotent `DROP POLICY IF EXISTS` parity across `000001`–`000004`.

---

## 6. Required Pre-Production Staging Sequence

Before merging and deploying to production:
1. Connect an **isolated staging Supabase database** and apply `000001` -> `000002` (upsert update) -> `000003` -> `000004`.
2. Run a live two-tenant staging verification covering: order cancellation of multi-item (finite + unlimited) carts, concurrent cancel retry idempotency, direct suspended `restaurants`/`menu_items` write rejection in SQL RLS, and browser demo-mode profile isolation (`demo@servora.app`).
3. Deploy rebuilt `client/dist` cleanly to the single authoritative production host after staging passes.
