require('dotenv').config({ path: 'e:/foodie-tech/client/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work if no RPC
  if (error) {
     // Try a simple select from a guess
     const { error: err2 } = await supabase.from('order_status_history').select('*').limit(1);
     console.log('order_status_history exists?', !err2);
     
     const { error: err3 } = await supabase.from('order_history').select('*').limit(1);
     console.log('order_history exists?', !err3);
  }
}

check();
