require('dotenv').config({ path: 'e:/foodie-tech/client/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('menu_items').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns in menu_items:', Object.keys(data[0]));
  } else {
    console.log('No data in menu_items, testing a direct query for price_history...');
    const { error: err2 } = await supabase.from('menu_items').select('price_history').limit(1);
    console.log('price_history column exists?', !err2);
  }
}

check();
