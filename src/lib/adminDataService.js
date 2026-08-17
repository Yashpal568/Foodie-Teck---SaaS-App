/**
 * SERVORA — Real-Time Platform Admin Data Engine
 * 100% Dynamic data directly from Supabase DB tables:
 * - restaurants
 * - subscriptions
 * - payment_verifications
 */
import { supabase } from './supabase'
import { sendPurchaseSummaryEmail } from '@/services/email.service'

export const getAdminPlatformData = async () => {
  let dbRestaurants = []
  let dbSubscriptions = []
  let dbVerifications = []

  // 1. Fetch from Supabase DB
  try {
    const { data: rData } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
    if (rData) dbRestaurants = rData
  } catch (e) {
    console.warn('Admin restaurants fetch notice:', e)
  }

  try {
    const { data: sData } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
    if (sData) dbSubscriptions = sData
  } catch (e) {
    console.warn('Admin subscriptions fetch notice:', e)
  }

  try {
    const { data: vData } = await supabase.from('payment_verifications').select('*').order('created_at', { ascending: false })
    if (vData) dbVerifications = vData
  } catch (e) {
    console.warn('Admin verifications fetch notice:', e)
  }

  // 2. Build Pending Verifications List
  const pendingItems = []

  // From DB verifications
  dbVerifications.forEach(v => {
    const st = (v.status || '').toUpperCase()
    if (st === 'PENDING_APPROVAL' || st === 'PENDING') {
      const rest = dbRestaurants.find(r => r.id === v.restaurant_id || r.email?.toLowerCase() === v.email?.toLowerCase())
      pendingItems.push({
        id: v.id,
        restaurantId: v.restaurant_id,
        merchant: rest?.business_name || v.merchant_name || 'Merchant Node',
        email: v.email || rest?.email || 'N/A',
        plan: (v.plan_name || 'PRO').toUpperCase(),
        amount: parseInt(v.amount || 2499),
        utr: v.utr_number || 'N/A',
        createdAt: new Date(v.created_at || Date.now()).toLocaleString()
      })
    }
  })

  // From Subscriptions table (if any pending sub not already in pendingItems)
  dbSubscriptions.forEach(s => {
    const st = (s.status || '').toUpperCase()
    if (st === 'PENDING_APPROVAL' || st === 'PENDING_PAYMENT' || st === 'PENDING') {
      const rest = dbRestaurants.find(r => r.id === s.restaurant_id)
      if (!pendingItems.some(i => i.restaurantId === s.restaurant_id || (i.utr === s.utr_number && i.utr !== 'N/A'))) {
        pendingItems.push({
          id: `sub-${s.id || s.restaurant_id}`,
          restaurantId: s.restaurant_id,
          merchant: rest?.business_name || 'Merchant Node',
          email: rest?.email || s.restaurant_id || 'N/A',
          plan: (s.plan_name || 'PRO').toUpperCase(),
          amount: parseInt(s.price || 2499),
          utr: s.utr_number || 'N/A',
          createdAt: new Date(s.start_date || s.created_at || Date.now()).toLocaleString()
        })
      }
    }
  })

  return {
    restaurants: dbRestaurants,
    subscriptions: dbSubscriptions,
    pendingVerifications: pendingItems
  }
}

export const recordNewMerchant = async (restaurantObj) => {
  try {
    await supabase.from('restaurants').upsert(restaurantObj, { onConflict: 'id' })
    window.dispatchEvent(new Event('platformConfigUpdated'))
  } catch (e) {
    console.warn('recordNewMerchant notice:', e)
  }
}

export const recordPendingPayment = async (paymentObj) => {
  try {
    await supabase.from('payment_verifications').insert({
      restaurant_id: paymentObj.restaurantId,
      merchant_name: paymentObj.merchantName,
      email: paymentObj.merchantEmail,
      plan_name: paymentObj.planName,
      amount: paymentObj.amount,
      utr_number: paymentObj.utrNumber,
      status: 'PENDING_APPROVAL',
      created_at: new Date().toISOString()
    })

    window.dispatchEvent(new Event('platformConfigUpdated'))
  } catch (e) {
    console.warn('recordPendingPayment notice:', e)
  }
}

export const approveMerchantPayment = async (item) => {
  const now = new Date()
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    if (item.restaurantId) {
      let isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.restaurantId)
      
      // If restaurantId is email, resolve actual UUID from DB
      if (!isUUID && item.email && item.email.includes('@')) {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('id')
          .eq('email', item.email.toLowerCase())
          .maybeSingle()
        if (rest?.id) {
          item.restaurantId = rest.id
          isUUID = true
        }
      }

      // Ensure parent row exists in restaurants table FIRST to satisfy foreign key
      if (isUUID) {
        await supabase.from('restaurants').upsert({
          id: item.restaurantId,
          business_name: item.merchant || 'Servora Merchant',
          email: (item.email && item.email.includes('@')) ? item.email.toLowerCase() : `merchant-${item.restaurantId.substring(0, 8)}@servora.app`,
          status: 'Active'
        }, { onConflict: 'id' })

        const subPayload = {
          restaurant_id: item.restaurantId,
          plan_name: item.plan || 'PRO',
          price: item.amount || 2499,
          status: 'Active',
          start_date: now.toISOString(),
          end_date: endDate,
          utr_number: item.utr || ''
        }

        await supabase
          .from('subscriptions')
          .upsert(subPayload, { onConflict: 'restaurant_id' })
      }

      await supabase.from('payment_verifications').update({ 
        status: 'APPROVED', 
        approved_at: now.toISOString() 
      }).or(`utr_number.eq.${item.utr},restaurant_id.eq.${item.restaurantId}`)

      // Automatically dispatch Purchase Summary & PDF Tax Invoice to merchant email
      const targetEmail = item.email || (item.merchantEmail && item.merchantEmail.includes('@') ? item.merchantEmail : null)
      if (targetEmail) {
        try {
          await sendPurchaseSummaryEmail({
            email: targetEmail,
            merchantName: item.merchant || 'Servora Merchant',
            planName: item.plan || 'PRO',
            amount: item.amount || 2499,
            utrNumber: item.utr || 'N/A',
            startDate: now.toISOString(),
            endDate: endDate,
            restaurantId: item.restaurantId
          })
        } catch (mailErr) {
          console.warn('[AdminDataService] Purchase summary email note:', mailErr.message)
        }
      }

      window.dispatchEvent(new Event('platformConfigUpdated'))
    }
  } catch (e) {
    console.error('approveMerchantPayment error:', e)
  }
}
