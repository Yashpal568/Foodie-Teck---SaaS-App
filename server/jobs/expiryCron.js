const cron = require('node-cron')
const { supabase } = require('../lib/supabase')
const { sendSubscriptionExpiryEmail } = require('../services/email.service')

/**
 * Scans all merchant subscriptions in Supabase and sends automated expiry notifications.
 */
async function runSubscriptionExpiryScan() {
  const logEntries = []
  let totalScanned = 0
  let totalNotified = 0

  try {
    console.log('[EXPIRY CRON] Starting subscription expiry scan...')

    // 1. Fetch all active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, restaurant_id, plan_name, status, end_date, price')
      .neq('status', 'REJECTED')

    if (subError) {
      console.error('[EXPIRY CRON] Failed to fetch subscriptions:', subError.message)
      return { success: false, error: subError.message, totalScanned: 0, totalNotified: 0 }
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[EXPIRY CRON] No active subscriptions found.')
      return { success: true, message: 'No subscriptions found to scan', totalScanned: 0, totalNotified: 0, log: [] }
    }

    totalScanned = subscriptions.length

    // 2. Fetch restaurant profiles to get email and business names
    const restIds = subscriptions.map(s => s.restaurant_id).filter(Boolean)
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, business_name, email')
      .in('id', restIds)

    const restMap = (restaurants || []).reduce((acc, r) => {
      acc[r.id] = r
      return acc
    }, {})

    const now = Date.now()

    for (const sub of subscriptions) {
      if (!sub.end_date) continue

      const expTime = new Date(sub.end_date).getTime()
      const diffMs = expTime - now
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      const isExpired = diffMs <= 0

      const restaurant = restMap[sub.restaurant_id] || {}
      const merchantEmail = restaurant.email
      const merchantName = restaurant.business_name || 'Servora Merchant'

      // We notify at specific milestones: 7 days, 3 days, 1 day, or freshly expired
      let shouldNotify = false
      let alertReason = ''

      if (isExpired && sub.status === 'Active') {
        shouldNotify = true
        alertReason = 'Expired today'
        // Auto-update status in database if expired
        try {
          await supabase
            .from('subscriptions')
            .update({ status: 'EXPIRED' })
            .eq('id', sub.id)
        } catch (e) {}
      } else if (daysRemaining === 7) {
        shouldNotify = true
        alertReason = '7 days until expiration'
      } else if (daysRemaining === 3) {
        shouldNotify = true
        alertReason = '3 days until expiration'
      } else if (daysRemaining === 1) {
        shouldNotify = true
        alertReason = '1 day until expiration (Urgent)'
      }

      if (shouldNotify && merchantEmail && merchantEmail.includes('@')) {
        try {
          const emailResult = await sendSubscriptionExpiryEmail({
            email: merchantEmail,
            merchantName,
            planName: sub.plan_name || 'PRO',
            daysRemaining: Math.max(0, daysRemaining),
            isExpired,
            expiryDate: sub.end_date,
            restaurantId: sub.restaurant_id
          })

          totalNotified++
          logEntries.push({
            restaurantId: sub.restaurant_id,
            merchantName,
            email: merchantEmail,
            daysRemaining,
            alertReason,
            status: emailResult.mode || 'dispatched'
          })

          console.log(`[EXPIRY CRON] Notification dispatched to ${merchantEmail} (${alertReason})`)
        } catch (err) {
          console.error(`[EXPIRY CRON] Failed to email ${merchantEmail}:`, err.message)
        }
      }
    }

    console.log(`[EXPIRY CRON] Scan completed. Scanned: ${totalScanned}, Notified: ${totalNotified}`)
    return {
      success: true,
      totalScanned,
      totalNotified,
      log: logEntries
    }
  } catch (err) {
    console.error('[EXPIRY CRON] Unexpected error:', err)
    return { success: false, error: err.message, totalScanned, totalNotified, log: logEntries }
  }
}

/**
 * Initializes the background recurring cron schedule.
 */
function initExpiryCron() {
  // Run daily at 09:00 AM server time
  cron.schedule('0 9 * * *', async () => {
    console.log('[EXPIRY CRON] Running scheduled 09:00 AM daily expiry scan...')
    await runSubscriptionExpiryScan()
  })

  console.log('⏳ Subscription Expiry Background Cron Initialized (Scheduled: 09:00 AM Daily)')
}

module.exports = {
  initExpiryCron,
  runSubscriptionExpiryScan
}
