import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://oljccgojviapjwjuosqb.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ppH6g98cr2XokpPIVLcM7w_9AjqVTiA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkQRCodes() {
  const restaurantId = '13e5407a-d560-4a10-8c2b-6ce22f6c7e4a'
  console.log(`Checking QR Codes for Restaurant: ${restaurantId}`)
  
  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('restaurant_id', restaurantId)
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`Found ${data.length} QR Codes:`, data)
  }
}

checkQRCodes()
