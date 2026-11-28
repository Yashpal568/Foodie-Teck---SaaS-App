# SERVORA — 100-RESTAURANT LOAD & STRESS TEST GUIDE

## 1. Safety Guard & Production Isolation

The production Supabase project (`oliuhzkbnxjiwkrdlcfv`) is **permanently denylisted** in [tests/load/safety-guard.js](file:///e:/foodie-tech/tests/load/safety-guard.js).

All seed, QR, load, realtime, cancellation, isolation, inventory, and cleanup commands refuse to execute if:
- Any env var or staging env file references `oliuhzkbnxjiwkrdlcfv` or `servora.quantumesh.in`.
- No dedicated staging env file exists (never falls back to `client/.env`, `server/.env`, `.env`, `.env.production`, or `.env.cloudflare`).
- `STAGING_SUPABASE_PROJECT_REF` mismatches `STAGING_SUPABASE_URL`.
- Placeholder values (`your-staging-project-ref`) remain unmodified.

---

## 2. Staging Prerequisites

1. Provision a **separate** Supabase staging project (distinct Project Ref from `oliuhzkbnxjiwkrdlcfv`).
2. Apply baseline schema (`client/src/docs/supabase_schema_and_rls.sql`) and migrations `20261127000001` through `20261127000005` cleanly in exact order on staging.
3. Apply the reproducible least-privilege staging grants script [tests/load/sql/staging_table_grants.sql](file:///e:/foodie-tech/tests/load/sql/staging_table_grants.sql) on a fresh staging DB (`GRANT USAGE`, `service_role` full access, `authenticated` DML gated by RLS, narrow read-only `anon` `SELECT` exclusively on `menu_categories`, `menu_items`, `gst_settings`, and `subscription_plans`).
4. Copy [tests/load/.env.staging.example](file:///e:/foodie-tech/tests/load/.env.staging.example) to `tests/load/.env.staging` (gitignored) and fill in your **staging-only** Project Ref, URL, `anon` key, and `service_role` key.

---

## 3. Architecture

All scripts live under [tests/load/](file:///e:/foodie-tech/tests/load/config.js) using existing repository dependencies (`@supabase/supabase-js`, `qrcode`, Node built-ins) and reuse Servora's real cryptographic QR signatures ([tableSecurity.js](file:///e:/foodie-tech/client/src/utils/tableSecurity.js)):

- [safety-guard.js](file:///e:/foodie-tech/tests/load/safety-guard.js) — hard production denylist (`oliuhzkbnxjiwkrdlcfv`) & isolated env enforcement
- [config.js](file:///e:/foodie-tech/tests/load/config.js) — load profiles (`normal`, `busy`, `peak`), stepped ramp-up (`25 -> 100 -> 250 -> 500 -> 1000`), circuit breaker thresholds, pause/abort file controls
- [lib/supabase-staging.js](file:///e:/foodie-tech/tests/load/lib/supabase-staging.js) — staging anon/admin clients and `signInStagingMerchant` with GoTrue rate-limit backoff retries
- [seed-restaurants.js](file:///e:/foodie-tech/tests/load/seed-restaurants.js) — seeds `LOADTEST_RESTAURANT_001`..`LOADTEST_RESTAURANT_100` (`10-15` tables, `20-50` menu items with finite stock, `NULL` unlimited stock, `half_price` variants, and out-of-stock items)
- [generate-qr-codes.js](file:///e:/foodie-tech/tests/load/generate-qr-codes.js) — writes signed table/master QR PNGs under `artifacts/load-test/qr-codes/<runId>/` plus CSV/JSON manifests
- [generate-customers.js](file:///e:/foodie-tech/tests/load/generate-customers.js) — executes the 8-step public QR customer flow using `get_public_restaurant_profile`, `get_public_table_numbers`, `claim_public_table_session`, `create_validated_order`, and `get_public_order_status`
- [order-load-test.js](file:///e:/foodie-tech/tests/load/order-load-test.js) — stepped-concurrency load runner with token-bucket RPS cap and automatic circuit breaker
- [realtime-load-test.js](file:///e:/foodie-tech/tests/load/realtime-load-test.js) — live authenticated WebSocket `postgres_changes` latency & cross-tenant leak test
- [cancellation-test.js](file:///e:/foodie-tech/tests/load/cancellation-test.js) — atomic stock restore, multi-variant `Full + Half`, `NULL` preservation, concurrent cancellation races, multi-open-order table lock tests
- [tenant-isolation-test.js](file:///e:/foodie-tech/tests/load/tenant-isolation-test.js) — uses normal merchant JWTs (never `service_role`) across tenants + suspended merchant checks with GoTrue login pacing (`350ms`)
- [inventory-verification.js](file:///e:/foodie-tech/tests/load/inventory-verification.js) — full DB reconciliation (`initialQuantity - nonCancelledOrderedQty === currentQuantity`)
- [cleanup.js](file:///e:/foodie-tech/tests/load/cleanup.js) — explicit `--confirm` deletion of ONLY records matching the run's manifest

---

## 4. Documented CLI Commands

Run from `E:\foodie-tech`:

| Task | Command |
|---|---|
| Validate staging isolation | `npm run load:verify-env` |
| Offline zero-write dry run | `npm run load:dry-run` |
| Seed 100 staging restaurants | `npm run load:seed` |
| Generate PNG QRs + CSV/JSON manifest | `npm run load:qr -- --manifest=<runId>` |
| Run Normal traffic profile | `npm run load:normal -- --manifest=<runId>` |
| Run Busy traffic profile | `npm run load:busy -- --manifest=<runId>` |
| Run Peak traffic profile | `npm run load:peak -- --manifest=<runId>` |
| Run live Realtime WebSocket test | `npm run load:realtime -- --manifest=<runId>` |
| Run cancellation & race suite | `npm run load:cancellation -- --manifest=<runId>` |
| Run 100-tenant RLS isolation suite | `npm run load:isolation -- --manifest=<runId>` |
| Reconcile DB inventory counts | `npm run load:inventory -- --manifest=<runId>` |
| Cleanup (requires `--confirm`) | `node tests/load/cleanup.js --manifest=<runId> --confirm` |

### Execution & Safety Notes
- **Pause / Abort During Load:** Create `artifacts/load-test/PAUSE` to pause cleanly (delete to resume), or `artifacts/load-test/ABORT` / `Ctrl+C` (`SIGINT`) to abort cleanly.
- **Forensic Preservation:** Failed or circuit-broken runs never auto-delete test data so inventory/order reconciliation can run against the preserved staging state.
- **Cleanup CLI Flag Parsing:** On Windows shells where `npm run load:cleanup -- --confirm` may swallow `--confirm`, run `node tests/load/cleanup.js --manifest=<runId> --confirm` directly.
- **Compute Sizing:** Free/Nano Supabase tiers comfortably sustain up to ~500 concurrent VUs; upgrade Supabase compute before executing `load:peak` (`2,500` VUs), otherwise the `p95 > 8000ms` circuit breaker will safely abort around `1,000` VUs.
