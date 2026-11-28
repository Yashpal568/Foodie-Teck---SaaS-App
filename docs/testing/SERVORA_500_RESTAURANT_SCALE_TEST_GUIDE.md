# SERVORA SCALE TEST 2.0 — 500-RESTAURANT SCALE & STRESS TEST GUIDE

## 1. Environment Safety & Denylist Enforcement

- **Approved Staging Project:** `Servora-Staging` (`STAGING_SUPABASE_PROJECT_REF=mhkxdidwmycsibdjflxz`) via dedicated gitignored `tests/load/.env.staging`.
- **Permanently Blocked Targets:** Production project `oliuhzkbnxjiwkrdlcfv` and production domain `servora.quantumesh.in`.
- **Hard Guards:** Every script under [tests/load/](file:///e:/foodie-tech/tests/load/safety-guard.js) validates project isolation via `validateStagingEnvironment()` before any seed, QR generation, customer/merchant test, billing simulation, or cleanup operation. Never falls back to `client/.env`, `server/.env`, `.env.production`, or `.env`.

---

## 2. Scale Test 2.0 Architecture (`500` Tenants / `50,000` Dishes / `5,000` QRs)

- **Seed & QR Pipeline:**
  - [seed-restaurants.js](file:///e:/foodie-tech/tests/load/seed-restaurants.js) — seeds `500` synthetic restaurants (`LOADTEST_RESTAURANT_001`–`500`) in paced parallel batches of `8` with GoTrue rate-limit retries (`--min-tables=10 --max-tables=10 --min-items=100 --max-items=100`), producing `5,000` tables & `50,000` menu items (`finite`, `NULL` unlimited, `is_in_stock=false`, `half_price` variants).
  - [generate-qr-codes.js](file:///e:/foodie-tech/tests/load/generate-qr-codes.js) — generates all `5,000` table QR PNGs + `500` master menu PNGs in bounded parallel batches of `25` using Servora's real HMAC signatures ([tableSecurity.js](file:///e:/foodie-tech/client/src/utils/tableSecurity.js)), rejecting both tampered signatures and cross-tenant substitutions.
- **Scale 2.0 Verification & Load Modules:**
  - [scale2-inventory-and-concurrency.js](file:///e:/foodie-tech/tests/load/scale2-inventory-and-concurrency.js) — tests simultaneous dish & variant races, last-unit (`qty=1`) race conditions, mid-run item unavailability toggles during ordering, `NULL` unlimited stock, out-of-stock/cross-tenant guards, same-table simultaneous orders, concurrent triple cancellations, and cross-restaurant cancellations.
  - [scale2-merchant-ops-and-lifecycle.js](file:///e:/foodie-tech/tests/load/scale2-merchant-ops-and-lifecycle.js) — exercises merchant login, dashboard receipt, KDS transitions (`PREPARING -> READY -> SERVED -> BILL_REQUESTED`), an isolated ephemeral Express staging server for [billing.routes.js](file:///e:/foodie-tech/server/routes/billing.routes.js) (`/api/billing/calculate`, `/invoice/generate`, idempotent `/payment/settle`), premature table-release protection, session release, and guest reclaim.
  - [scale2-realtime-and-isolation.js](file:///e:/foodie-tech/tests/load/scale2-realtime-and-isolation.js) — stratified multi-tenant RLS isolation checks across tenants spanning `001`–`500`, `anon` raw-PII blocking, suspended merchant write/order blocking, simultaneous `postgres_changes` CDC channels, and WebSocket disconnect/reconnect recovery.
  - [scale2-staged-load.js](file:///e:/foodie-tech/tests/load/scale2-staged-load.js) — progressive concurrency runner (`500 -> 1,000 -> 5,000 -> 10,000 -> 25,000 -> 50,000 -> 75,000 -> 100,000` VUs) with automatic circuit breaker (`maxErrorRate: 15%`, `maxConsecutiveFailures: 25`, `maxP95LatencyMs: 8000ms`), pause/abort control files, and stage-end DB order persistence checks.
  - [inventory-verification.js](file:///e:/foodie-tech/tests/load/inventory-verification.js) — paginating concurrent reconciliation across all `500` tenants / `50,000` items.
  - [cleanup.js](file:///e:/foodie-tech/tests/load/cleanup.js) — chunked `40`-UUID batch deletes & batched Auth user deletion (`--confirm`), avoiding PostgREST URI length limits.

---

## 3. Distributed `k6` Blueprint (`5,000` – `100,000` VUs)

For concurrency beyond single-workstation sockets and Supabase Free/Nano compute:
- Load script: [tests/load/k6/servora-scale2.js](file:///e:/foodie-tech/tests/load/k6/servora-scale2.js)
- 4-shard distributed runner topology (`4 x 25,000 = 100,000` VUs): [tests/load/k6/docker-compose.distributed.yml](file:///e:/foodie-tech/tests/load/k6/docker-compose.distributed.yml)
- Setup & prerequisites (requires explicit user approval before provisioning upgraded staging compute or multi-VM k6 shards): [tests/load/k6/README.md](file:///e:/foodie-tech/tests/load/k6/README.md)

---

## 4. Exact Execution Sequence

```bash
# 1. Verify isolated staging project (mhkxdidwmycsibdjflxz)
npm run load:verify-env

# 2. Seed 500 restaurants, 5,000 tables, 50,000 menu items
node tests/load/seed-restaurants.js --restaurants=500 --min-tables=10 --max-tables=10 --min-items=100 --max-items=100 --run-id=<runId>

# 3. Generate & validate all 5,000 table QR PNGs (+ 500 master QRs)
node tests/load/generate-qr-codes.js --manifest=<runId>

# 4. Run functional, concurrency, merchant lifecycle, and Realtime/RLS suites
node tests/load/inventory-verification.js --manifest=<runId>
node tests/load/scale2-inventory-and-concurrency.js --manifest=<runId>
node tests/load/scale2-merchant-ops-and-lifecycle.js --manifest=<runId>
node tests/load/scale2-realtime-and-isolation.js --manifest=<runId> --realtime-clients=50

# 5. Progressive concurrency (stops automatically if circuit breaker trips)
node tests/load/scale2-staged-load.js --manifest=<runId>

# 6. Post-load reconciliation & cleanup
node tests/load/inventory-verification.js --manifest=<runId>
node tests/load/cleanup.js --manifest=<runId> --confirm
```
