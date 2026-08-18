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

  // 2. Build Deduplicated Pending Verifications List
  const pendingItems = []
  const seenKeys = new Set()

  // Track all approved identifiers so they NEVER appear in pending
  const approvedUtrs = new Set()
  const approvedRestIds = new Set()
  const approvedEmails = new Set()

  dbVerifications.forEach(v => {
    const st = (v.status || '').toUpperCase()
    if (st === 'APPROVED' || st === 'ACTIVE') {
      if (v.utr_number && v.utr_number !== 'N/A') approvedUtrs.add(v.utr_number.trim())
      if (v.restaurant_id) approvedRestIds.add(v.restaurant_id.trim())
      if (v.email) approvedEmails.add(v.email.trim().toLowerCase())
    }
  })

  dbSubscriptions.forEach(s => {
    const st = (s.status || '').toUpperCase()
    if (st === 'ACTIVE' || st === 'APPROVED') {
      if (s.restaurant_id) approvedRestIds.add(s.restaurant_id.trim())
      if (s.utr_number && s.utr_number !== 'N/A') approvedUtrs.add(s.utr_number.trim())
    }
  })

  // From DB verifications
  dbVerifications.forEach(v => {
    const st = (v.status || '').toUpperCase()
    if (st === 'PENDING_APPROVAL' || st === 'PENDING' || st === 'PENDING_PAYMENT') {
      const rest = dbRestaurants.find(r => r.id === v.restaurant_id || (r.email && v.email && r.email.toLowerCase() === v.email.toLowerCase()))
      const restId = v.restaurant_id || rest?.id || v.email
      const cleanUtr = (v.utr_number || '').trim()
      const cleanEmail = (v.email || rest?.email || '').trim().toLowerCase()

      // If already approved anywhere, skip
      if (cleanUtr && approvedUtrs.has(cleanUtr)) return
      if (restId && approvedRestIds.has(restId)) return
      if (cleanEmail && approvedEmails.has(cleanEmail)) return

      // Primary deduplication key
      const key = cleanUtr && cleanUtr !== 'N/A' 
        ? `utr:${cleanUtr}` 
        : restId 
          ? `rest:${restId}` 
          : `email:${cleanEmail}`

      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        if (cleanEmail) seenKeys.add(`email:${cleanEmail}`)
        if (restId) seenKeys.add(`rest:${restId}`)
        if (cleanUtr && cleanUtr !== 'N/A') seenKeys.add(`utr:${cleanUtr}`)

        pendingItems.push({
          id: v.id,
          restaurantId: restId,
          merchant: rest?.business_name || v.merchant_name || 'Merchant Node',
          email: v.email || rest?.email || 'N/A',
          plan: (v.plan_name || 'PRO').toUpperCase(),
          amount: parseInt(v.amount || 2499),
          utr: v.utr_number || 'N/A',
          createdAt: new Date(v.created_at || Date.now()).toLocaleString()
        })
      }
    }
  })

  // From Subscriptions table (if any pending sub not already in pendingItems)
  dbSubscriptions.forEach(s => {
    const st = (s.status || '').toUpperCase()
    if (st === 'PENDING_APPROVAL' || st === 'PENDING_PAYMENT' || st === 'PENDING') {
      const rest = dbRestaurants.find(r => r.id === s.restaurant_id)
      const restId = s.restaurant_id
      const cleanUtr = (s.utr_number || '').trim()
      const cleanEmail = (rest?.email || '').trim().toLowerCase()

      // If already approved anywhere, skip
      if (cleanUtr && approvedUtrs.has(cleanUtr)) return
      if (restId && approvedRestIds.has(restId)) return
      if (cleanEmail && approvedEmails.has(cleanEmail)) return

      const key = cleanUtr && cleanUtr !== 'N/A' 
        ? `utr:${cleanUtr}` 
        : restId 
          ? `rest:${restId}` 
          : `email:${cleanEmail}`

      if (!seenKeys.has(key) && !seenKeys.has(`rest:${restId}`) && (!cleanEmail || !seenKeys.has(`email:${cleanEmail}`))) {
        seenKeys.add(key)
        if (cleanEmail) seenKeys.add(`email:${cleanEmail}`)
        if (restId) seenKeys.add(`rest:${restId}`)
        if (cleanUtr && cleanUtr !== 'N/A') seenKeys.add(`utr:${cleanUtr}`)

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
    const cleanUtr = (paymentObj.utrNumber || '').trim()
    const cleanEmail = (paymentObj.merchantEmail || '').trim().toLowerCase()

    // Check if an existing pending verification row exists for this restaurant or UTR
    let existingId = null
    if (paymentObj.restaurantId) {
      const { data: ex } = await supabase
        .from('payment_verifications')
        .select('id')
        .eq('restaurant_id', paymentObj.restaurantId)
        .eq('status', 'PENDING_APPROVAL')
        .maybeSingle()
      if (ex?.id) existingId = ex.id
    }

    if (!existingId && cleanUtr) {
      const { data: exUtr } = await supabase
        .from('payment_verifications')
        .select('id')
        .eq('utr_number', cleanUtr)
        .maybeSingle()
      if (exUtr?.id) existingId = exUtr.id
    }

    if (existingId) {
      await supabase.from('payment_verifications').update({
        merchant_name: paymentObj.merchantName,
        email: cleanEmail,
        plan_name: paymentObj.planName,
        amount: paymentObj.amount,
        utr_number: cleanUtr,
        status: 'PENDING_APPROVAL',
        created_at: new Date().toISOString()
      }).eq('id', existingId)
    } else {
      await supabase.from('payment_verifications').insert({
        restaurant_id: paymentObj.restaurantId,
        merchant_name: paymentObj.merchantName,
        email: cleanEmail,
        plan_name: paymentObj.planName,
        amount: paymentObj.amount,
        utr_number: cleanUtr,
        status: 'PENDING_APPROVAL',
        created_at: new Date().toISOString()
      })
    }

    // Insert admin notification record
    try {
      await supabase.from('notifications').insert({
        title: '💳 UTR Payment Verification Needed',
        message: `${paymentObj.merchantName} submitted UTR #${cleanUtr} for ${paymentObj.planName} (₹${paymentObj.amount})`,
        type: 'payment_verification',
        is_read: false,
        created_at: new Date().toISOString()
      })
    } catch (nErr) {}

    // Broadcast across windows & tabs
    window.dispatchEvent(new Event('platformConfigUpdated'))
    try {
      localStorage.setItem('servora_admin_payment_alert', JSON.stringify({
        id: Date.now(),
        merchant: paymentObj.merchantName,
        email: cleanEmail,
        utr: cleanUtr,
        plan: paymentObj.planName,
        amount: paymentObj.amount,
        time: Date.now()
      }))
    } catch (lsErr) {}
  } catch (e) {
    console.warn('recordPendingPayment notice:', e)
  }
}

export const approveMerchantPayment = async (item) => {
  const now = new Date()
  const daysToGrant = item.daysToGrant || 30
  const endDate = new Date(now.getTime() + daysToGrant * 24 * 60 * 60 * 1000).toISOString()

  try {
    const cleanUtr = item.utr && item.utr !== 'N/A' ? item.utr.trim() : ''
    let effectiveRestId = item.restaurantId
    let isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveRestId)

    // If restaurantId is not a UUID, try to resolve it from email
    if (!isUUID && item.email && item.email.includes('@')) {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id')
        .eq('email', item.email.toLowerCase())
        .maybeSingle()
      if (rest?.id) {
        effectiveRestId = rest.id
        isUUID = true
      }
    }

    // 1. Update/Insert Subscriptions table (Safe check without relying on non-existent unique constraint)
    if (effectiveRestId) {
      const { data: existingSubs } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('restaurant_id', effectiveRestId)

      if (existingSubs && existingSubs.length > 0) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'Active',
            plan_name: item.plan || 'PRO',
            price: item.amount || 2499,
            start_date: now.toISOString(),
            end_date: endDate,
            utr_number: cleanUtr
          })
          .eq('restaurant_id', effectiveRestId)
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            restaurant_id: effectiveRestId,
            plan_name: item.plan || 'PRO',
            price: item.amount || 2499,
            status: 'Active',
            start_date: now.toISOString(),
            end_date: endDate,
            utr_number: cleanUtr
          })
      }
    }

    // Also update any subscription row matching this UTR
    if (cleanUtr) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'Active',
          start_date: now.toISOString(),
          end_date: endDate
        })
        .eq('utr_number', cleanUtr)
    }

    // 2. Mark ALL matching payment_verifications rows as APPROVED
    if (cleanUtr) {
      await supabase.from('payment_verifications').update({ 
        status: 'APPROVED', 
        approved_at: now.toISOString() 
      }).eq('utr_number', cleanUtr)
    }

    if (effectiveRestId) {
      await supabase.from('payment_verifications').update({ 
        status: 'APPROVED', 
        approved_at: now.toISOString() 
      }).eq('restaurant_id', effectiveRestId)
    }

    if (item.email && item.email.includes('@')) {
      await supabase.from('payment_verifications').update({ 
        status: 'APPROVED', 
        approved_at: now.toISOString() 
      }).eq('email', item.email.toLowerCase())
    }

    if (item.id && !item.id.toString().startsWith('sub-')) {
      await supabase.from('payment_verifications').update({ 
        status: 'APPROVED', 
        approved_at: now.toISOString() 
      }).eq('id', item.id)
    }

    // 3. Mark restaurant status as 'Active'
    if (effectiveRestId && isUUID) {
      await supabase.from('restaurants').update({ status: 'Active' }).eq('id', effectiveRestId)
    }

    // 4. Automatically dispatch Purchase Summary & PDF Tax Invoice to merchant email
    const targetEmail = item.email || (item.merchantEmail && item.merchantEmail.includes('@') ? item.merchantEmail : null)
    if (targetEmail) {
      try {
        await sendPurchaseSummaryEmail({
          email: targetEmail,
          merchantName: item.merchant || 'Servora Merchant',
          planName: item.plan || 'PRO',
          amount: item.amount || 2499,
          utrNumber: cleanUtr || 'N/A',
          startDate: now.toISOString(),
          endDate: endDate,
          restaurantId: effectiveRestId
        })
      } catch (mailErr) {
        console.warn('[AdminDataService] Purchase summary email note:', mailErr.message)
      }
    }

    window.dispatchEvent(new Event('platformConfigUpdated'))
  } catch (e) {
    console.error('approveMerchantPayment error:', e)
  }
}
