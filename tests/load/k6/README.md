# Servora Scale Test 2.0 — Distributed k6 Runner Guide

## Safety Guard
`servora-scale2.js` permanently blocks `oliuhzkbnxjiwkrdlcfv` and `servora.quantumesh.in`. Only `Servora-Staging` (`mhkxdidwmycsibdjflxz`) or an explicitly verified staging project may be passed via `STAGING_URL`.

## Prerequisites for 5,000 – 100,000 Concurrent VUs
1. **Staged Supabase Compute Upgrade (Requires Explicit User Approval):** Free Tier / Nano compute (~0.5 GB RAM, shared CPU, limited pool slots) saturates around `500–1,000` concurrent VUs (`p95 > 8s`). Testing `5,000–100,000` VUs requires an approved staging compute upgrade (Large/2XL+ with high PgBouncer pool capacity and dedicated connection limits).
2. **Distributed Generator Cluster (Requires Explicit User Approval):** One workstation hits local ephemeral port exhaustion and TLS socket limits well below `100,000` concurrent HTTPS VUs. Use `docker-compose.distributed.yml` across 4+ shards (`25,000` VUs each) or k6 Cloud.

## Single-Machine Dry Check (when k6 is installed)
```bash
k6 run \
  -e STAGING_URL="https://mhkxdidwmycsibdjflxz.supabase.co" \
  -e STAGING_ANON_KEY="$STAGING_SUPABASE_ANON_KEY" \
  -e MANIFEST_PATH="../../artifacts/load-test/manifests/manifest-scale2.json" \
  -e TARGET_PEAK_VUS=500 \
  tests/load/k6/servora-scale2.js
```

## Distributed Multi-Shard Execution (50,000 – 100,000 VUs, Approval Required)
```bash
STAGING_SUPABASE_URL="https://mhkxdidwmycsibdjflxz.supabase.co" \
STAGING_SUPABASE_ANON_KEY="$STAGING_SUPABASE_ANON_KEY" \
docker compose -f tests/load/k6/docker-compose.distributed.yml up --scale k6-shard-1=1 --scale k6-shard-2=1 --scale k6-shard-3=1 --scale k6-shard-4=1
```
