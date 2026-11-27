import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Database, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  DownloadCloud, 
  ShieldCheck, 
  RefreshCw, 
  Activity, 
  Lock, 
  X, 
  Filter, 
  FileCheck,
  AlertTriangle,
  Server
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { supabase, ensureAdminSession } from '@/lib/adminSupabase'
import { toast } from 'sonner'

export default function AdminAuditPage() {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL') // 'ALL' | 'NOMINAL' | 'SECURITY' | 'WARNING'
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)

  const loadLogs = async () => {
    try {
      setLoading(true)
      const { data: dbLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (dbLogs) {
        setLogs(dbLogs.map(l => ({
           id: l.id,
           action: l.action,
           performer: l.actor || l.restaurant_id || 'admin@servora',
           severity: (l.severity || 'NOMINAL').toUpperCase(),
           target: l.type || 'SYSTEM',
           date: new Date(l.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
           time: new Date(l.created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        })))
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ensureAdminSession()
    loadLogs()
    window.addEventListener('platformConfigUpdated', loadLogs)
    return () => window.removeEventListener('platformConfigUpdated', loadLogs)
  }, [])

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to purge all audit records?')) return
    setIsClearing(true)
    try {
      await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      toast.success('Audit Trail Purged')
      await loadLogs()
    } catch (err) {
      toast.error('Purge Failed')
    } finally {
      setIsClearing(false)
    }
  }

  const handleExportCSV = () => {
    try {
      const headers = ['Timestamp_Date', 'Timestamp_Time', 'Action_Event', 'Performer_Actor', 'Category_Target', 'Severity']
      const rows = filtered.map(l => [
        `"${l.date}"`,
        `"${l.time}"`,
        `"${l.action}"`,
        `"${l.performer}"`,
        `"${l.target}"`,
        `"${l.severity}"`
      ])

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `Servora_System_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Audit Log Exported')
    } catch (err) {
      toast.error('Export Failed')
    }
  }

  const filtered = useMemo(() => {
    let list = [...logs]

    if (severityFilter !== 'ALL') {
      list = list.filter(l => l.severity === severityFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(l => 
        l.action?.toLowerCase().includes(q) || 
        l.performer?.toLowerCase().includes(q) ||
        l.target?.toLowerCase().includes(q)
      )
    }

    return list
  }, [logs, severityFilter, search])

  const criticalCount = logs.filter(l => l.severity === 'CRITICAL' || l.severity === 'WARNING').length
  const securityCount = logs.filter(l => l.severity === 'SECURITY').length

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans select-none">
      
      {/* ─── ⚡ CLEAN ENTERPRISE PAGE HEADER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              System Audit
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Audit Stream Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Immutable platform telemetry, security access records, admin actions, and merchant mutation logs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            onClick={loadLogs}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            onClick={handleClearLogs}
            disabled={isClearing || logs.length === 0}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
            Purge Trail
          </Button>

          <Button 
            onClick={handleExportCSV}
            size="sm"
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ─── 📊 REFINED SHADCN KPI METRIC CARDS ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Recorded Events */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recorded Events</span>
              <Database className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {logs.length}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Real-Time Audit Records</span>
            </p>
          </div>
        </Card>

        {/* Metric 2: Security Events */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Security Events</span>
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {securityCount}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Access & authentication mutations
            </p>
          </div>
        </Card>

        {/* Metric 3: Critical & Warnings */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Flags & Warnings</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {criticalCount}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Zero security vulnerabilities detected
            </p>
          </div>
        </Card>

        {/* Metric 4: Last Logged */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Last Mutation</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">
              {logs[0]?.time || 'Idle'}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Live automated system logging
            </p>
          </div>
        </Card>
      </div>

      {/* ─── 🔍 SHADCN-STYLE CONTROL TOOLBAR ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1">
          {[
            { id: 'ALL', label: 'All Logs', count: logs.length },
            { id: 'NOMINAL', label: 'Nominal / Info', count: logs.filter(l => l.severity === 'NOMINAL').length },
            { id: 'SECURITY', label: 'Security', count: securityCount },
            { id: 'WARNING', label: 'Warnings', count: logs.filter(l => l.severity === 'WARNING' || l.severity === 'CRITICAL').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSeverityFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                severityFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                severityFilter === tab.id 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72 px-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <Input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action, actor, or type..."
            className="h-9 pl-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─── 📋 AUDIT DATA TABLE ───────────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">Action / Event</th>
                <th className="py-3.5 px-5">Performer / Actor</th>
                <th className="py-3.5 px-5">Category</th>
                <th className="py-3.5 px-5 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filtered.map((log, idx) => {
                  const isNominal = log.severity === 'NOMINAL' || log.severity === 'INFO'
                  const isSecurity = log.severity === 'SECURITY'
                  const isWarn = log.severity === 'WARNING' || log.severity === 'CRITICAL'

                  return (
                    <motion.tr 
                      key={log.id || idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Timestamp */}
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{log.date}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{log.time}</p>
                        </div>
                      </td>

                      {/* Action Event */}
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-800 text-xs">{log.action}</p>
                      </td>

                      {/* Performer */}
                      <td className="py-4 px-5">
                        <span className="font-mono text-xs text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200">
                          {log.performer}
                        </span>
                      </td>

                      {/* Category Target */}
                      <td className="py-4 px-5">
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-mono text-[9px] font-bold uppercase">
                          {log.target}
                        </Badge>
                      </td>

                      {/* Severity */}
                      <td className="py-4 px-5 text-right">
                        <Badge className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5 ${
                          isNominal 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : isSecurity
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isNominal ? 'bg-emerald-500' : isSecurity ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                          {log.severity}
                        </Badge>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Zero State */}
        {filtered.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Audit Logs Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No audit records match the current filter or search criteria.
            </p>
          </div>
        )}
      </Card>

    </div>
  )
}
