import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Current Supabase Credentials
const SUPABASE_URL = 'https://rmkvqwoxmghhywcutxgd.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_piHtT3ltcRk1H46kxmHLwQ_WPSoI6FK'

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

function formatSqlValue(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean' || typeof val === 'number') return val
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
  return `'${String(val).replace(/'/g, "''")}'`
}

async function exportAllData() {
  console.log('📦 Starting Supabase Data Export & Master Script Generator...')
  
  // Read schema SQL
  const schemaPath = path.resolve(process.cwd(), 'src/docs/supabase_schema_and_rls.sql')
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8')

  let fullSql = `-- ==============================================================================
-- 🚀 SERVORA MASTER 1-CLICK DATABASE SCHEMA & COMPLETE DATA RESTORE SCRIPT
-- Generated on: ${new Date().toISOString()}
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open your NEW Supabase Project -> SQL Editor -> New Query.
-- 2. Paste this ENTIRE file and click "RUN".
-- 3. It will automatically create all tables, configure RLS, and restore all data!
-- ==============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 1: CREATE TABLES, EXTENSIONS & RLS POLICIES
-- ══════════════════════════════════════════════════════════════════════════════

${schemaSql}

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 2: RESTORE ALL EXISTING DATA
-- ══════════════════════════════════════════════════════════════════════════════

`

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.warn(`⚠️ Table ${table} skipped or not accessible:`, error.message)
        continue
      }

      if (!data || data.length === 0) {
        console.log(`ℹ️ Table "${table}" has 0 rows.`)
        continue
      }

      console.log(`✅ Exporting "${table}": ${data.length} rows found`)

      fullSql += `-- ── Data for: ${table} (${data.length} rows) ──\n`
      
      for (const row of data) {
        const columns = Object.keys(row)
        const values = Object.values(row).map(formatSqlValue)
        
        fullSql += `INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`
      }
      fullSql += '\n'
    } catch (err) {
      console.error(`Error exporting ${table}:`, err)
    }
  }

  const outputPath = path.resolve(process.cwd(), 'src/docs/restore_all_data.sql')
  fs.writeFileSync(outputPath, fullSql, 'utf-8')
  console.log(`\n🎉 Master 1-Click Setup File Ready! Saved to: ${outputPath}`)
}

exportAllData()
