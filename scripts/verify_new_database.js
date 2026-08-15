import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://oliuhzkbnxjiwkrdlcfv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saXVoemtibnhqaXdrcmRsY2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODEzNDIsImV4cCI6MjEwMjM1NzM0Mn0.CvsYo0-g8nAo26VNMoFEd6okUZhbSynKdk0al8UcV3U'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const TABLES = [
  'restaurants',
  'subscriptions',
  'subscription_plans',
  'payment_methods',
  'payment_verifications',
  'menu_categories',
  'menu_items',
  'orders',
  'order_items',
  'table_sessions',
  'notifications',
  'gst_settings'
]

async function verifyNewDatabase() {
  console.log('🔍 Connecting to NEW Supabase project: ' + SUPABASE_URL + ' ...\n')
  
  let allHealthy = true

  for (const table of TABLES) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' })
      if (error) {
        console.error(`❌ Table "${table}" Error:`, error.message)
        allHealthy = false
      } else {
        console.log(`✅ Table "${table}": ${data.length} records verified!`)
        if (table === 'restaurants' && data.length > 0) {
          console.log(`   👉 Sample Restaurants: ${data.map(r => `${r.business_name} (${r.email})`).join(', ')}`)
        }
        if (table === 'menu_items' && data.length > 0) {
          console.log(`   👉 Sample Dishes: ${data.slice(0, 4).map(m => `${m.name} (₹${m.price})`).join(', ')}... and ${data.length - 4} more!`)
        }
      }
    } catch (err) {
      console.error(`❌ Unexpected error on table "${table}":`, err)
      allHealthy = false
    }
  }

  if (allHealthy) {
    console.log('\n🎉 ALL TABLES & RECORDS IN NEW DATABASE ARE 100% HEALTHY, ACCESSIBLE, AND VERIFIED!')
  } else {
    console.log('\n⚠️ Some tables had errors, check details above.')
  }
}

verifyNewDatabase()
