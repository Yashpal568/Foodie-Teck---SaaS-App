/**
 * Nuclear Audit Engine
 * Manages the platform action immutability logs.
 */
export const logAdminAction = (action, target = 'SYSTEM', severity = 'NOMINAL') => {
  try {
    const admin = JSON.parse(localStorage.getItem('servora_admin_user') || '{"email": "admin@servora"}')
    const existing = JSON.parse(localStorage.getItem('servora_db_audits') || '[]')
    
    const now = new Date()
    const log = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      performer: admin.email || 'SYSTEM_CRON',
      action,
      target,
      severity
    }
    
    // Maintain a rolling buffer of 1000 logs
    const updated = [log, ...existing].slice(0, 1000)
    localStorage.setItem('servora_db_audits', JSON.stringify(updated))
    
    // Broadcast update
    window.dispatchEvent(new Event('platformConfigUpdated'))
    
    console.log(`[AUDIT] Action: ${action} | Performer: ${log.performer} | Severity: ${severity}`)
  } catch (error) {
    console.error('Audit Engine Failure:', error)
  }
}
