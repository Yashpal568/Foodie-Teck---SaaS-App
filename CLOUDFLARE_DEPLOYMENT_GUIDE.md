# 🌐 Cloudflare Pages Complete Deployment Guide for Servora

This guide provides step-by-step instructions to deploy the **Servora** frontend application onto **Cloudflare Pages** with high performance, edge caching, and zero 404 routing issues.

---

## 📋 Pre-configured Files in the Project
The repository is already pre-configured with:
1. **`client/public/_redirects`**: Ensures single-page application (SPA) client-side routing works on all routes (`/* /index.html 200`).
2. **`client/public/_headers`**: Enforces security headers and 1-year immutable caching for static bundles.
3. **`wrangler.json`**: Official Cloudflare configuration file.
4. **`.env.example`**: Standardized environment variables reference.

---

## 🚀 Method 1: Git Integration (Recommended • Automatic CI/CD)

Whenever you push to GitHub/GitLab, Cloudflare Pages will automatically build and deploy your application.

### Step 1: Push Code to GitHub / GitLab
Make sure your repository has the latest code pushed:
```bash
git add .
git commit -m "Configure Cloudflare Pages deployment"
git push origin main
```

### Step 2: Create Cloudflare Pages Project
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your repository (e.g. `foodie-tech` or `servora`).

### Step 3: Configure Build Settings
Fill in the deployment settings:
- **Project Name**: `servora` (or your preferred name)
- **Production Branch**: `main`
- **Framework Preset**: `Vite`
- **Root Directory**: `client`  *(Note: if building from monorepo root, set root directory to `.` and output to `client/dist`)*
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist` (or `client/dist` if root was `.`)

### Step 4: Add Environment Variables
Under **Environment Variables** (Production), click **Add variable** and add:

| Variable Name | Value | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://oliuhzkbnxjiwkrdlcfv.supabase.co` | Supabase Cloud Database URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsIn...` | Supabase Public Anon Key |
| `VITE_CLOUDINARY_CLOUD_NAME` | `vub5bfcq` | Cloudinary Image Hosting |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `servora_menu` | Cloudinary Preset |
| `VITE_ADMIN_EMAIL` | `admin@servora.com` | Master Admin Email |
| `VITE_ADMIN_PASSWORD` | `admin123` | Master Admin Password |
| `NODE_VERSION` | `20` | Node.js version |

### Step 5: Deploy
Click **Save and Deploy**. Cloudflare will build the site in ~30 seconds and provide you with a live URL like `https://servora.pages.dev`.

---

## ⚡ Method 2: Direct CLI Deployment with Wrangler (Fastest • No Git required)

If you want to deploy directly from your local terminal:

### Step 1: Install Wrangler CLI (if not installed)
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
npx wrangler login
```

### Step 3: Build the Project
```bash
npm run build
```

### Step 4: Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy client/dist --project-name=servora
```

---

## 🌍 Custom Domain Setup (Optional)
1. Go to your project in **Cloudflare Dashboard** -> **Workers & Pages** -> **servora** -> **Custom domains**.
2. Click **Set up a custom domain**.
3. Enter your domain (e.g. `app.yourrestaurant.com` or `servora.in`).
4. Cloudflare will automatically provision a free SSL/TLS certificate.
