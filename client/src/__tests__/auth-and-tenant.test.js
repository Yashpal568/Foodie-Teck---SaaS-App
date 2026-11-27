import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockState = {
  user: null,
  userError: null,
  rpcResult: false,
  restaurantRow: null,
  restaurantError: null,
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockState.user },
        error: mockState.userError,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
    rpc: vi.fn(async (fn) => {
      if (fn === 'is_platform_admin') {
        return { data: mockState.rpcResult, error: null }
      }
      return { data: null, error: null }
    }),
    from: vi.fn(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data: mockState.restaurantRow,
          error: mockState.restaurantError,
        }),
      }
      return chain
    }),
  },
}))

import {
  verifyAdminSession,
  hasTrustedAdminClaim,
  clearLegacyAdminStorage,
} from '@/lib/adminAuth'
import {
  verifyMerchantAccess,
  isDemoRestaurantSlug,
} from '@/lib/merchantAuth'

describe('Admin RBAC Hardening (client/src/lib/adminAuth.js)', () => {
  beforeEach(() => {
    mockState.user = null
    mockState.userError = null
    mockState.rpcResult = false
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('clears tampered legacy storage keys and rejects unauthenticated sessions', async () => {
    window.sessionStorage.setItem('servora_admin_auth', 'true')
    window.sessionStorage.setItem('servora_admin_token', 'SYS-ADM-2026-KEY')

    const result = await verifyAdminSession()
    expect(result.authenticated).toBe(false)
    expect(result.reason).toBe('unauthenticated')
    expect(window.sessionStorage.getItem('servora_admin_auth')).toBeNull()
    expect(window.sessionStorage.getItem('servora_admin_token')).toBeNull()
  })

  it('rejects privilege escalation via user_metadata spoofing', async () => {
    mockState.user = {
      id: 'user-attacker',
      email: 'merchant@servora.test',
      user_metadata: { role: 'SUPER_ADMIN' },
      app_metadata: { role: 'MERCHANT' },
    }
    mockState.rpcResult = false

    expect(hasTrustedAdminClaim(mockState.user)).toBe(false)
    const result = await verifyAdminSession()
    expect(result.authenticated).toBe(false)
    expect(result.reason).toBe('forbidden')
  })

  it('authorizes verified app_metadata SUPER_ADMIN users', async () => {
    mockState.user = {
      id: 'user-admin',
      email: 'ops@servora.test',
      app_metadata: { role: 'SUPER_ADMIN' },
    }

    const result = await verifyAdminSession()
    expect(result.authenticated).toBe(true)
    expect(result.role).toBe('SUPER_ADMIN')
  })

  it('authorizes admin when server RPC is_platform_admin returns true', async () => {
    mockState.user = { id: 'user-db-admin', email: 'db@servora.test', app_metadata: {} }
    mockState.rpcResult = true

    const result = await verifyAdminSession()
    expect(result.authenticated).toBe(true)
    expect(result.role).toBe('PLATFORM_ADMIN')
  })

  it('clearLegacyAdminStorage strips both sessionStorage and localStorage keys', () => {
    window.localStorage.setItem('servora_admin_user', '{"role":"ADMIN"}')
    clearLegacyAdminStorage()
    expect(window.localStorage.getItem('servora_admin_user')).toBeNull()
  })
})

describe('Merchant Tenant Isolation (client/src/lib/merchantAuth.js)', () => {
  const TENANT_A = '3a10e567-9e10-4c27-aadd-64e84cd8694c'
  const TENANT_B = '9b21f678-1111-4c27-aadd-64e84cd86999'

  beforeEach(() => {
    mockState.user = null
    mockState.userError = null
    mockState.restaurantRow = null
    mockState.restaurantError = null
    window.sessionStorage.clear()
  })

  it('keeps demo-merchant isolated without touching production tenant UUIDs', async () => {
    expect(isDemoRestaurantSlug('demo-merchant')).toBe(true)
    expect(isDemoRestaurantSlug(TENANT_A)).toBe(false)

    const res = await verifyMerchantAccess('demo-merchant')
    expect(res.authorized).toBe(true)
    expect(res.isDemo).toBe(true)
  })

  it('ignores spoofed sessionStorage restaurant ID & fallback_auth_email when unauthenticated', async () => {
    window.sessionStorage.setItem('servora_restaurant_id', TENANT_A)
    window.sessionStorage.setItem('fallback_auth_email', 'owner-a@servora.test')

    const res = await verifyMerchantAccess(TENANT_A)
    expect(res.authorized).toBe(false)
    expect(res.reason).toBe('unauthenticated')
    expect(window.sessionStorage.getItem('fallback_auth_email')).toBeNull()
  })

  it('blocks Merchant A from accessing Merchant B console (cross-tenant rejection)', async () => {
    mockState.user = { id: 'owner-a-uid', app_metadata: { role: 'MERCHANT' } }
    mockState.restaurantRow = { id: TENANT_B, owner_id: 'owner-b-uid', business_name: 'Bistro B' }

    const res = await verifyMerchantAccess(TENANT_B)
    expect(res.authorized).toBe(false)
    expect(res.reason).toBe('forbidden_cross_tenant')
  })

  it('fails closed when DB tenant lookup errors', async () => {
    mockState.user = { id: 'owner-a-uid', app_metadata: {} }
    mockState.restaurantError = { message: 'Supabase outage' }

    const res = await verifyMerchantAccess(TENANT_A)
    expect(res.authorized).toBe(false)
    expect(res.reason).toBe('tenant_not_found')
  })

  it('grants access when user.id matches restaurant.owner_id', async () => {
    mockState.user = { id: 'owner-a-uid', app_metadata: {} }
    mockState.restaurantRow = { id: TENANT_A, owner_id: 'owner-a-uid', business_name: 'Cafe A' }

    const res = await verifyMerchantAccess(TENANT_A)
    expect(res.authorized).toBe(true)
    expect(res.isDemo).toBe(false)
    expect(res.restaurantId).toBe(TENANT_A)
  })

  it('fails closed on expired or invalid JWTs for both admin and merchant verification', async () => {
    mockState.user = null
    mockState.userError = { message: 'JWT expired', status: 401 }

    const adminRes = await verifyAdminSession()
    expect(adminRes.authenticated).toBe(false)
    expect(adminRes.reason).toBe('unauthenticated')

    const merchRes = await verifyMerchantAccess(TENANT_A)
    expect(merchRes.authorized).toBe(false)
    expect(merchRes.reason).toBe('unauthenticated')
  })
})
