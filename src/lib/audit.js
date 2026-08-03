/**
 * Nuclear Audit Engine
 * Manages the platform action immutability logs.
 */
import { supabase } from '@/lib/supabase'

export const logAdminAction = async (action, target = 'SYSTEM', severity = 'NOMINAL') => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const actorEmail = session?.user?.email || 'admin@servora.com'
    
    await supabase.from('audit_logs').insert({
      action: action,
      type: 'ADMIN_ACTION',
      actor: actorEmail,
      severity: severity
    })
    
    // Broadcast update for any live dashboard listeners
    window.dispatchEvent(new Event('platformConfigUpdated'))
    
    console.log(`[AUDIT] Action: ${action} | Performer: ${actorEmail} | Severity: ${severity}`)
  } catch (error) {
    console.error('Audit Engine Failure:', error)
  }
}
