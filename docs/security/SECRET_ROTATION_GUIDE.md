# Servora — Secret Rotation & Credential Remediation Guide

**Date:** 2026-11-27  
**Branch:** `security/servora-production-hardening` (`client/.git`)  
**Policy:** Zero secret values are printed in this document. Only affected locations and required owner actions are listed.

---

## 1. Exposed Credentials Inventory & Remediation Status

| Secret / Credential Class | Previously Exposed Locations | Codebase Status | Required Owner Action |
|---|---|---|---|
| **Legacy Admin Login Credentials** (`VITE_ADMIN_EMAIL`, `VITE_ADMIN_PASSWORD`, hardcoded fallback literals) | `client/wrangler.json`, `wrangler.json`, `.env.cloudflare`, `.env.example`, `.env.production`, `client/.env.cloudflare`, `client/.env.example`, `client/.env`, `client/src/pages/admin/AdminLoginPage.jsx`, `client/.git` commits (`1425b77`, `9451876`, `045b66e`, `08a3dc3`) | Removed from active source files, templates, `wrangler.json`, and `vite-env.d.ts`. Added `.env.cloudflare` to `.gitignore` and `client/.gitignore`. | **Rotate immediately:** Change password on any personal/admin mailbox reusing the legacy password; provision real Supabase Auth admin account(s) with `app_metadata.role = 'SUPER_ADMIN'`. |
| **Admin Pseudo-Token Key** (`SYS-ADM-2026-KEY`, `servora_admin_token`) | `client/src/lib/adminSupabase.js`, `client/src/components/admin/AdminProtectedRoute.jsx`, `client/src/components/admin/AdminHeader.jsx` | Removed; replaced by server-verified Supabase Auth JWT + `app_metadata.role` / `public.is_platform_admin()`. | Clear existing browser sessions; no external provider secret tied to this static token. |
| **Backend Server Secrets** (`SUPABASE_SERVICE_ROLE_KEY`, SMTP / Gmail app password) | `server/.env` (untracked/local runtime environment) | Verified excluded from `client/`; `server/lib/supabase.js` no longer falls back to hardcoded project URL or key. | **Rotate prior to production cutover** if `server/.env` was ever shared or backed up externally. Set fresh `SUPABASE_SERVICE_ROLE_KEY` and SMTP App Password in backend secret store only. |
| **Supabase Anon Key** (`VITE_SUPABASE_ANON_KEY`) | `client/src/lib/supabase.js`, `client/scripts/export_database_data.js`, `client/scripts/verify_new_database.js` | Helper scripts updated to read from `process.env`. Note: `VITE_SUPABASE_ANON_KEY` is intentionally a public client key whose security relies on Postgres RLS. | Keep `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages / Vercel env vars; apply RLS migrations `20261127000001` and `20261127000002` before rotation/cutover. Optionally rotate the anon key alongside JWT secret only during scheduled downtime. |
| **Hardcoded Merchant Email Directory** (`KNOWN_RESTAURANTS`) | `client/src/pages/marketing/LoginPage.jsx`, `client/src/services/restaurant.service.js` | Removed from frontend bundle. | Notify affected test/merchant accounts if passwords were weak, since legacy login did not enforce password checks prior to this patch. |
| **Hardcoded Personal UPI VPA** | `client/src/components/dashboard/UPIPaymentModal.jsx`, `client/src/components/dashboard/SubscriptionLockOverlay.jsx` | Externalized to `import.meta.env.VITE_PLATFORM_UPI_ID`. | Configure dedicated merchant settlement VPA in `VITE_PLATFORM_UPI_ID` inside Cloudflare/Vercel build variables. |

---

## 2. Step-by-Step Rotation Procedure (Owner Execution Order)

### Step 1: Provision Real Supabase Platform Admin Account(s)
Do **not** create admin accounts by writing `user_metadata`. Set `app_metadata.role` via the Supabase Dashboard Service Role or SQL Editor:
```sql
-- Execute in Supabase Dashboard -> SQL Editor (privileged postgres role)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "SUPER_ADMIN"}'::jsonb
WHERE email = 'your-new-admin@yourdomain.com';
```
Verify in Supabase Dashboard -> Authentication -> Users that the admin user uses a new, unique password (>= 16 characters) and MFA enabled.

### Step 2: Rotate Backend Service Credentials (`server/`)
1. In **Supabase Dashboard -> Project Settings -> API**, rotate the `service_role` key once ready to update backend runtime environment variables.
2. In your Google Workspace / Gmail account, revoke the existing App Password (`GMAIL_APP_PASSWORD` / SMTP credential) and generate a new App Password dedicated to Servora transactional email.
3. Update secrets in your backend hosting provider (**never** commit `server/.env`).

### Step 3: Clean Deployment Platform Variables (Cloudflare Pages & Vercel)
1. Open Cloudflare Pages / Workers (`servora.quantumesh.in`) environment settings and **delete** `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD`.
2. Ensure only public frontend runtime variables are present:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (HTTPS URL of deployed backend API)
   - `VITE_PLATFORM_UPI_ID`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
3. Trigger a fresh frontend build after database migrations and credential rotation.

### Step 4: Optional Git History Scrubbing (Requires Coordinated Team Re-clone)
Because `client/.git` commits `1425b77`, `9451876`, `045b66e`, and `08a3dc3` previously contained legacy env values:
1. Rotate all exposed credentials **first** (history scrubbing alone is never sufficient once pushed).
2. Untrack `.env.cloudflare` from index on the hardening branch when committing:
   ```bash
   git -C client rm --cached .env.cloudflare
   ```
3. To purge historical blobs permanently from GitHub (`https://github.com/Yashpal568/Foodie-Teck---SaaS-App`), schedule a brief maintenance window and run `git filter-repo` (removing `.env.cloudflare` / `.env.production` / replacing leaked strings in `wrangler.json` and `.env.example`), then force-push all branches with collaborator re-cloning.
