# Servora — Production Deployment Guide

**Target Frontend Production URL:** `https://servora.quantumesh.in`  
**Build Tooling:** Vite 7 (`client/dist`) · Express 5 (`server/server.js`) · Supabase PostgreSQL Migrations (`supabase/migrations/`)

> **Important:** Automated changes on branch `security/servora-production-hardening` have NOT been deployed to production. Execute the sequence below in staging first, then production.

---

## 1. Required Environment Variables

### 1.1 Frontend (`client` — Cloudflare Pages / Vercel Build Env)
Never set any `VITE_ADMIN_*` or service-role key in frontend env vars.

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Production Supabase project URL (`https://<ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public Supabase `anon` key (protected by Postgres RLS). |
| `VITE_API_URL` | Yes (for live POS settlement & SMTP email) | HTTPS base URL of the Express backend (`https://api.servora.quantumesh.in` or host URL). Must NOT contain `localhost`. |
| `VITE_PLATFORM_UPI_ID` | Recommended | Merchant subscription payment VPA shown in `UPIPaymentModal` / `SubscriptionLockOverlay`. |
| `VITE_CLOUDINARY_CLOUD_NAME` | Recommended | Cloudinary cloud name (`vub5bfcq` default if omitted). |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Recommended | Cloudinary upload preset (`servora_menu` default if omitted). |

### 1.2 Backend (`server/.env` — Node Host Only)
| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production` (disables verbose non-prod stack exposure). |
| `PORT` | Optional | Listening port (defaults to `5000`). |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase `service_role` JWT (`server/lib/supabase.js` refuses fallback). |
| `FRONTEND_URL` | Yes | `https://servora.quantumesh.in` (trusted redirect base for email links & CORS). |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated origin allowlist, e.g. `https://servora.quantumesh.in,https://www.servora.quantumesh.in`. |
| `EMAIL_USER` / `GMAIL_USER` | Yes (for email) | Authenticated sender mailbox. |
| `EMAIL_PASS` / `GMAIL_APP_PASSWORD` | Yes (for email) | Rotated Google App Password. |

### 1.3 Utility Scripts (`client/scripts/`)
`export_database_data.js` and `verify_new_database.js` require runtime environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, plus `NEW_SUPABASE_*` for migration scripts) and will exit non-zero if unset.

---

## 2. Deployment & Rollout Sequence

### Phase 1: Database Preparation & Migrations
1. Take a full logical backup/snapshot in Supabase Dashboard.
2. Execute `supabase/migrations/20261127000001_security_hardening_rls.sql` and `supabase/migrations/20261127000002_atomic_order_and_data_integrity.sql` in **staging** first (see `docs/migrations/PRODUCTION_MIGRATION_PLAN.md`).
3. Ensure every existing real restaurant row in `public.restaurants` has a valid `owner_id` matching its merchant `auth.users.id`, and grant `app_metadata.role = 'SUPER_ADMIN'` to authorized platform admins.

### Phase 2: Backend API Deployment (`server/`)
1. Install production dependencies: `npm --prefix server ci --omit=dev`.
2. Run verification tests before start: `npm --prefix server test`.
3. Deploy `server/server.js` behind HTTPS reverse proxy (or PaaS such as Render/Railway/Fly/Cloudflare Tunnel) with `NODE_ENV=production`.
4. Verify `/api/health` returns `200`, while `/api/admin/session` returns `401` without a Bearer token.

### Phase 3: Frontend Build & Cloudflare Pages / Vercel Deployment (`client/`)
1. Remove any legacy `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD` from hosting dashboards.
2. Install & verify locally:
   ```bash
   npm --prefix client ci
   npm --prefix client test -- --run
   npm --prefix client run build
   ```
3. Confirm no `VITE_ADMIN_` or legacy password strings appear in `client/dist/`.
4. Deploy `client/dist` (`wrangler pages deploy client/dist` or Vercel `vercel.json`). Security headers are defined in both `client/public/_headers` (Cloudflare Pages) and `vercel.json` (Vercel):
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `X-Frame-Options: SAMEORIGIN` (`_headers`) / `DENY` (`vercel.json`).

---

## 3. Post-Deploy Smoke Checks
1. **Admin Auth Gate:** Visit `/admin/dashboard` logged out -> redirected to `/admin/login`. Setting `sessionStorage.servora_admin_auth='true'` does not unlock access. Sign in with `SUPER_ADMIN` `app_metadata` account -> loads cleanly.
2. **Merchant Tenant Isolation:** Log in as Restaurant A -> visit `/console/<restaurant_b_uuid>` -> access denied / redirected. Visit `/console/demo-merchant` -> isolated sandbox works without touching tenant DB rows.
3. **Public QR Customer Menu:** Scan existing QR (`/menu?restaurant=<uuid>`) logged out -> menu loads, `table_sessions` numbers load, `create_validated_order` places order at authoritative DB prices, and Waiter Call triggers dashboard notification.
4. **POS Billing:** Without backend `VITE_API_URL`, POS split-payment settlement displays explicit error instead of faking `PAID`; with authenticated backend, invoice generates & settles idempotently.
