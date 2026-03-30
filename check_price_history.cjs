require('dotenv').config({ path: 'e:/foodie-tech/client/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { error } = await supabase.from('price_history').select('*').limit(1);
  console.log('price_history exists?', !error);
  if (error) console.log('Error:', error.message);
}

check();
