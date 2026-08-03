/**
 * Nuclear Audit Engine
 * Manages the platform action immutability logs.
 */
import { supabase } from '@/lib/supabase'

export const logAdminAction = async (action, target = 'SYSTEM', severity = 'NOMINAL') => {
  try {
    const admin = JSON.parse(localStorage.getItem('servora_admin_user') || '{"email": "admin@servora"}')
    
    await supabase.from('audit_logs').insert({
      action: action,
      type: 'ADMIN_ACTION',
      actor: admin.email || 'SYSTEM_CRON',
      severity: severity
    })
    
    // Broadcast update for any live dashboard listeners
    window.dispatchEvent(new Event('platformConfigUpdated'))
    
    console.log(`[AUDIT] Action: ${action} | Performer: ${admin.email} | Severity: ${severity}`)
  } catch (error) {
    console.error('Audit Engine Failure:', error)
  }
}
