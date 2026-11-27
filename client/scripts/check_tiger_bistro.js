import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://oliuhzkbnxjiwkrdlcfv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saXVoemtibnhqaXdrcmRsY2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODEzNDIsImV4cCI6MjEwMjM1NzM0Mn0.CvsYo0-g8nAo26VNMoFEd6okUZhbSynKdk0al8UcV3U'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkTigerBistro() {
  const { data: rest } = await supabase.from('restaurants').select('*').eq('email', 'tigerbistro99@gmail.com')
  console.log('🐯 Restaurant Record:', rest)

  if (rest && rest.length > 0) {
    const rid = rest[0].id
    const { data: subs } = await supabase.from('subscriptions').select('*').eq('restaurant_id', rid)
    console.log('📋 Subscriptions for Tiger Bistro:', subs)
  }
}

checkTigerBistro()
