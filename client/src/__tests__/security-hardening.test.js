import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const CLIENT_ROOT = process.cwd()
const REPO_ROOT = path.resolve(CLIENT_ROOT, '..')

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walkFiles(full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

describe('Phase 6 — IP & Production Security Hardening Verification', () => {
  it('1-3. Enforces disabled production source maps, console/debugger stripping, and clean dist artifacts', () => {
    const viteCfg = fs.readFileSync(path.join(CLIENT_ROOT, 'vite.config.js'), 'utf8')
    expect(viteCfg).toContain('sourcemap: false')
    expect(viteCfg).toContain('minify: "esbuild"')
    expect(viteCfg).toContain('drop: ["console", "debugger"]')
    expect(viteCfg).toContain('legalComments: "none"')

    const distDir = path.join(CLIENT_ROOT, 'dist')
    if (fs.existsSync(distDir)) {
      const distFiles = walkFiles(distDir)
      const mapFiles = distFiles.filter((f) => f.endsWith('.map'))
      expect(mapFiles).toEqual([])

      const jsFiles = distFiles.filter((f) => f.endsWith('.js'))
      expect(jsFiles.length).toBeGreaterThan(0)
      for (const jsFile of jsFiles) {
        const content = fs.readFileSync(jsFile, 'utf8')
        expect(content).not.toMatch(/sourceMappingURL=/)
        expect(content).not.toMatch(/SERVICE_ROLE|APP_PASSWORD|JWT_SECRET/)
        expect(content).not.toMatch(/console\.log\(|console\.debug\(/)
      }
    }
  })

  it('2. Ensures no server-side secrets exist in client/src', () => {
    const srcFiles = walkFiles(path.join(CLIENT_ROOT, 'src')).filter(
      (f) => !f.includes('__tests__')
    )
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8')
      expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|GMAIL_APP_PASSWORD|JWT_SECRET/)
    }
  })

  it('7-10. Enforces SECURITY DEFINER search_path, REVOKE ALL, and atomic order validation in migrations', () => {
    const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations')
    const sqlFiles = walkFiles(migrationsDir).filter((f) => f.endsWith('.sql'))
    expect(sqlFiles.length).toBeGreaterThan(0)

    for (const sqlFile of sqlFiles) {
      const sql = fs.readFileSync(sqlFile, 'utf8').replace(/--.*$/gm, '')
      const definerCount = (sql.match(/SECURITY DEFINER/gi) || []).length
      const searchPathCount = (sql.match(/SET search_path\s*=\s*''/gi) || []).length
      expect(searchPathCount).toBeGreaterThanOrEqual(definerCount)
    }

    const atomicSql = fs.readFileSync(
      path.join(migrationsDir, '20261127000002_atomic_order_and_data_integrity.sql'),
      'utf8'
    )
    expect(atomicSql).toContain('CREATE OR REPLACE FUNCTION public.create_validated_order')
    expect(atomicSql).toContain('p_idempotency_key')
    expect(atomicSql).toMatch(/REVOKE (ALL|EXECUTE) ON FUNCTION public\.create_validated_order/)
    expect(atomicSql).toContain('Insufficient stock')
  })

  it('4-6. Confirms server API routes enforce authentication, ownership, CORS, and rate limiting', () => {
    const serverSrc = fs.readFileSync(path.join(REPO_ROOT, 'server/server.js'), 'utf8')
    expect(serverSrc).toContain('app.use(helmet())')
    expect(serverSrc).toContain('createRateLimiter')
    expect(serverSrc).toContain('requireAuth')
    expect(serverSrc).toContain('requireAdmin')

    const billingRoutes = fs.readFileSync(path.join(REPO_ROOT, 'server/routes/billing.routes.js'), 'utf8')
    expect(billingRoutes).toContain('router.use(billingLimiter)')
    expect(billingRoutes).toContain('router.use(requireAuth)')
    expect(billingRoutes).toContain('requireRestaurantAccess')

    const printRoutes = fs.readFileSync(path.join(REPO_ROOT, 'server/routes/print.routes.js'), 'utf8')
    expect(printRoutes).toContain('requireAuth')
    expect(printRoutes).toContain('requireMerchantSigner')
  })

  it('11. Protects public menu_items.quantity from anonymous exposure while preserving availability & atomic checkout', () => {
    const stockMig = fs.readFileSync(
      path.join(REPO_ROOT, 'supabase/migrations/20261128000003_protect_public_stock_quantity.sql'),
      'utf8'
    )
    expect(stockMig).toContain('REVOKE SELECT ON public.menu_items FROM anon')
    expect(stockMig).toContain('GRANT SELECT ON public.menu_items TO authenticated')
    expect(stockMig).not.toContain("'quantity', m.quantity")
    expect(stockMig).toContain('m.quantity > 0')

    const menuService = fs.readFileSync(path.join(CLIENT_ROOT, 'src/services/menu.service.js'), 'utf8')
    expect(menuService).toContain("const selectCols = hasSession")

    const customerMenu = fs.readFileSync(path.join(CLIENT_ROOT, 'src/pages/CustomerMenu.jsx'), 'utf8')
    expect(customerMenu).not.toContain('available in stock')
    expect(customerMenu).toContain('fetchPublicMenuItems')
  })

  it('12. Enforces authenticated cross-tenant menu_items SELECT isolation via split RLS policies', () => {
    const isoMig = fs.readFileSync(
      path.join(REPO_ROOT, 'supabase/migrations/20261128000004_isolate_authenticated_menu_select.sql'),
      'utf8'
    )
    expect(isoMig).toContain('DROP POLICY IF EXISTS "menu_items_public_select" ON public.menu_items')
    expect(isoMig).toContain('FOR SELECT TO anon')
    expect(isoMig).toContain('FOR SELECT TO authenticated')
    expect(isoMig).toContain('private.owns_restaurant(restaurant_id)')

    const menuService = fs.readFileSync(path.join(CLIENT_ROOT, 'src/services/menu.service.js'), 'utf8')
    expect(menuService).toContain('export const fetchPublicMenuItems')
  })
})
