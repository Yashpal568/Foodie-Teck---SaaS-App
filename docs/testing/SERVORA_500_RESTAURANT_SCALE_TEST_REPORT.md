# SERVORA SCALE TEST 2.0 — 500-RESTAURANT SCALE & STRESS TEST REPORT

**Report Date:** 2026-11-28  
**Repository:** `E:\foodie-tech`  
**Target Environment:** `Servora-Staging` — Project Ref `mhkxdidwmycsibdjflxz` (`South Asia (Mumbai) (ap-south-1)`, Free Tier / Nano Compute)  
**Production Isolation:** Verified (`oliuhzkbnxjiwkrdlcfv` and `servora.quantumesh.in` strictly blocked and untouched)  
**Run ID:** `s2_20261128_500r`

---

## 1. Exact Synthetic Dataset Created & Validated

- **Restaurants & Synthetic Merchant Owners:** `500` (`LOADTEST_RESTAURANT_001` through `LOADTEST_RESTAURANT_500`)
- **Tables & Unique Signed QR Codes:** `5,000` tables (`10` per restaurant), **`5,000` table QR PNGs** + **`500` master menu QR PNGs** generated via [tableSecurity.js](file:///e:/foodie-tech/client/src/utils/tableSecurity.js) (`0` signature failures; tampered signatures and cross-restaurant substitutions rejected for all `5,000` entries)
- **Menu Categories:** `3,000` (`6` per restaurant)
- **Menu Items (`50,000` total, `100` per restaurant):**
  - **Finite Stock (`quantity != NULL`):** `25,000`
  - **Unlimited Stock (`quantity = NULL`):** `24,500`
  - **Out-of-Stock (`is_in_stock = false`):** `500`
  - **Half/Full Variants (`half_price != NULL`):** `16,500`

---

## 2. Executive Summary (PASS / HALTED / BLOCKED / NOT TESTED)

| Component / Stage | Status | Measured Scope & Outcome | Artifact |
|---|---|---|---|
| **Staging Env & Safety Guard** | **PASS** | Positive verification on `mhkxdidwmycsibdjflxz`; production refs blocked | Console output |
| **500-Tenant Seed & 5,000 QR Generation** | **PASS** | `500` restaurants, `50,000` items, `5,000` table QR PNGs (`0` signature failures) | [qr-manifest](file:///e:/foodie-tech/artifacts/load-test/manifests/qr-manifest-s2_20261128_500r.json) |
| **Pre-Load Inventory Baseline (`500` tenants)** | **PASS** | `500/500` tenants checked (`100%`), `0` failures, `77.64 RPS`, `p50=99.92ms`, `p95=136.19ms` | [pre-load inventory](file:///e:/foodie-tech/artifacts/load-test/reports/s2_20261128_500r/inventory-reconciliation-s2_20261128_500r.json) |
| **Inventory Race & Concurrency Suite** | **PASS** | `6/6` passed (`100%`), `0` negative stock / race / restoration failures (`p50=698.06ms`, `p95=1089.39ms`) | [scale2-inventory-concurrency](file:///e:/foodie-tech/artifacts/load-test/reports/s2_20261128_500r/scale2-inventory-concurrency-s2_20261128_500r.json) |
| **Merchant Operations, Billing & Table Lifecycle** | **PASS** | `10/10` end-to-end journeys passed (`100%`), `0` failures (`p50=3102.64ms`, `p95=3645.44ms`) | [scale2-merchant-ops-lifecycle](file:///e:/foodie-tech/artifacts/load-test/reports/s2_20261128_500r/scale2-merchant-ops-lifecycle-s2_20261128_500r.json) |
| **Multi-Tenant RLS & Realtime (`50` stratified channels)** | **PASS (sampled `50/500`)** | `201/201` RLS/anon/suspended checks (`0` leaks, `p95=91.75ms`); `50/50` Realtime `INSERT` (`p95=631.03ms`, `0` leaks, `369.02ms` reconnect recovery) | [scale2-realtime-isolation](file:///e:/foodie-tech/artifacts/load-test/reports/s2_20261128_500r/scale2-realtime-isolation-s2_20261128_500r.json) |
| **Baseline Load (`500` VUs across `500` tenants)** | **HALTED BY CIRCUIT BREAKER** | `500` actual VUs across `331` touched tenants, `3,805/3,805` HTTP 200 (`100%`), `106.49 RPS`, `637` orders (`0` failed/dupes/lost), **rolling `p95=10984.52ms > 8000ms`** (overall `p50=1849.48ms`, `p95=13074.42ms`, `p99=16638.7ms`, `max=21410.09ms`) | [scale2-staged-concurrency](file:///e:/foodie-tech/artifacts/load-test/reports/s2_20261128_500r/scale2-staged-concurrency-s2_20261128_500r.json) |
| **Stages 1–7 (`1,000` to `100,000` VUs)** | **BLOCKED / NOT TESTED** | Intentionally stopped after Baseline `500`-VU latency breaker on Free Nano compute; **100,000 VUs were NOT tested** | [k6 blueprint](file:///e:/foodie-tech/tests/load/k6/servora-scale2.js) |
| **Post-Load Inventory Reconciliation (`500` tenants)** | **PASS** | `500/500` tenants reconciled (`50,000` items, `720` total DB orders), `0` failures (`p50=108.92ms`, `p95=2666.82ms`) | [inventory-reconciliation](file:///e:/foodie-tech/artifacts/load-test/reports/s2_20261128_500r/inventory-reconciliation-s2_20261128_500r.json) |
| **Staging Cleanup & Zero-Residue Verification** | **PASS** | Deleted `500` restaurants, `500` auth users, `50,000` items, `5,000` QRs/sessions, `720` orders (`0` errors; all 12 tables = `0`) | [cleanup-s2_20261128_500r.json](file:///e:/foodie-tech/artifacts/load-test/reports/cleanup-s2_20261128_500r.json) |

---

## 3. Staged Concurrency Measurements & Capacity Analysis

| Stage | Target VUs | Actual Active VUs | Status | RPS | Total Requests (`% OK`) | Orders (`Created / Failed / Dupes / Lost`) | `p50` / `p95` / `p99` Latency (ms) |
|---|---:|---:|---|---:|---:|---|---:|
| **Baseline** | 500 | 500 | **HALTED (`p95 > 8000ms`)** | 106.49 | 3,805 (`100%`) | `637 / 0 / 0 / 0` (`500/500` sampled verified in DB) | `1849.48 / 13074.42 / 16638.70` |
| **Stage 1** | 1,000 | 0 | **BLOCKED / NOT TESTED** | — | — | — | — |
| **Stage 2** | 5,000 | 0 | **BLOCKED / NOT TESTED** | — | — | — | — |
| **Stage 3** | 10,000 | 0 | **BLOCKED / NOT TESTED** | — | — | — | — |
| **Stage 4** | 25,000 | 0 | **BLOCKED / NOT TESTED** | — | — | — | — |
| **Stage 5** | 50,000 | 0 | **BLOCKED / NOT TESTED** | — | — | — | — |
| **Stage 6** | 75,000 | 0 | **BLOCKED / NOT TESTED** | — | — | — | — |
| **Stage 7** | 100,000 | 0 | **BLOCKED / NOT TESTED** | — | — | — | — |

### Why Baseline (`500` VUs) Saturated Here vs `lt_20261128035636_ywg2` (`100` Tenants)
- With `500` tenants x `100` menu items (`50,000` active dishes), each virtual customer browse executed `menu_items` `SELECT` returning `100` rows plus `get_public_restaurant_profile`, `claim_public_table_session`, `create_validated_order`, and `get_public_order_status`. Jumping straight to `500` simultaneous VUs over 4 seconds pushed Free Tier / Nano compute CPU & Postgres working set above the `8,000ms` rolling `p95` latency breaker (`10,984.52ms`), even though **`0` HTTP errors, `0` dropped orders, `0` duplicate orders, and `0` connection-slot errors** occurred (`dbHealthProbe: 95.99ms`, `ok: true` post-stage).

---

## 4. Verified Functional Lifecycles & Edge Cases

1. **Inventory Concurrency ([scale2-inventory-and-concurrency.js](file:///e:/foodie-tech/tests/load/scale2-inventory-and-concurrency.js)):**
   - Simultaneous `Promise.all` orders on the same finite dish (`half` & `full` variants) and multi-variant cancellations reconciled deterministically.
   - Last-unit race (`quantity = 1` vs `5` concurrent customer orders): **exactly 1 won**, `4` failed cleanly, stock settled at `0` (never negative), cancellation restored `1`.
   - Mid-run unavailability toggle (`is_in_stock = false`) blocked subsequent live customer orders immediately.
   - Simultaneous same-table orders preserved `table_sessions.status = 'occupied'` across triple concurrent cancellations on the first order until the second order cancelled cleanly.
   - Unlimited (`NULL`) stock stayed `NULL`; out-of-stock and cross-tenant item injection were rejected.
2. **Merchant Operations, Billing & Table Lifecycle ([scale2-merchant-ops-and-lifecycle.js](file:///e:/foodie-tech/tests/load/scale2-merchant-ops-and-lifecycle.js)):**
   - Exercised `10/10` end-to-end journeys using an isolated ephemeral Express staging server (`http://127.0.0.1:5059`, connected strictly to `mhkxdidwmycsibdjflxz` with SMTP disabled) and real merchant JWTs:
     - Signed table QR verification & tamper rejection -> `get_public_restaurant_profile` -> `claim_public_table_session` -> concurrent `create_validated_order` #1 & #2 -> Merchant dashboard receipt -> KDS `PREPARING -> READY -> SERVED -> BILL_REQUESTED` with live `get_public_order_status` sync -> `/api/billing/calculate` -> `/api/billing/invoice/generate` -> `/api/billing/payment/settle` (`UPI`, idempotent `X-Idempotency-Key` + replay verified `PAID`) -> premature table-release guard verified while Order #2 remained open -> table cleared to `'available'` after Order #2 finished -> reclaimed by new guest.
3. **Realtime & Multi-Tenant Isolation ([scale2-realtime-and-isolation.js](file:///e:/foodie-tech/tests/load/scale2-realtime-and-isolation.js)):**
   - `201/201` authenticated cross-tenant RLS, `anon` raw-PII (`restaurants`), and `Suspended` merchant operational write/order block assertions passed across `50` stratified merchant JWTs spanning tenants `001`–`500`.
   - `50/50` (`100%`) simultaneous `postgres_changes` `INSERT` broadcasts delivered within `638.71ms` (`p50=354.11ms`, `p95=631.03ms`, `readyViaSystemAck: 50`, `crossTenantLeaks: 0`), plus WebSocket disconnect & reconnect recovery passed (`369.02ms`).
   - *Honest Coverage Note:* Realtime WebSocket subscriptions and JWT ring probes were executed across **`50` stratified merchants (`001`–`500`)** rather than `500` simultaneous Auth logins in one run due to Supabase Free-tier GoTrue burst token rate limits (~34 logins/min).

---

## 5. Infrastructure Limitations & Required Approval for 5,000 – 100,000 VUs

1. **Supabase Staging Tier (`mhkxdidwmycsibdjflxz`):** Free Tier Nano compute cannot sustain `>= 500` VUs at `100` items/tenant without >8s `p95` latency queuing. Reaching `5,000`–`100,000` VUs requires explicit user approval to upgrade staging Supabase compute (dedicated CPU/RAM, expanded PgBouncer pool, and Auth rate limits).
2. **Load Generator Capacity:** Current workstation (`12` CPUs, `15.35 GB` RAM, `k6` not installed locally) cannot simulate `50,000`–`100,000` concurrent TLS sockets from a single Node process due to OS ephemeral port exhaustion. Distributed shards using [servora-scale2.js](file:///e:/foodie-tech/tests/load/k6/servora-scale2.js) + [docker-compose.distributed.yml](file:///e:/foodie-tech/tests/load/k6/docker-compose.distributed.yml) across 4+ cloud VMs (`25,000` VUs each) are prepared and awaiting explicit infrastructure approval.

---

## 6. Cleanup Verification (`cleanup-s2_20261128_500r.json`)

- **Deleted Counts:** `500` restaurants, `500` auth users, `50,000` menu items, `3,000` categories, `5,000` QR codes, `5,000` table sessions, `720` orders (+ `order_items`), `500` GST settings, `500` customers, `500` subscriptions, `500` payment verifications (`0` errors in `27.8s`).
- **Post-Cleanup State (`mhkxdidwmycsibdjflxz`):** `0` rows remaining across all `12` inspected tables (`restaurants`, `orders`, `order_items`, `menu_items`, `menu_categories`, `qr_codes`, `table_sessions`, `customers`, `gst_settings`, `subscriptions`, `payment_verifications`, `invoices`) and `authUsersTotal = 0`.
