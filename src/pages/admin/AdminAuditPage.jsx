import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Database, ShieldAlert, CheckCircle, Clock, Filter, Trash2, DownloadCloud } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminAuditPage() {
  const [search, setSearch] = useState('')
  const [logs, setLogs] = useState([])
  const [isClearing, setIsClearing] = useState(false)

  const loadLogs = () => {
    const raw = localStorage.getItem('servora_db_audits') || '[]'
    setLogs(JSON.parse(raw).reverse())
  }

  useEffect(() => {
    loadLogs()
    window.addEventListener('platformConfigUpdated', loadLogs)
    return () => window.removeEventListener('platformConfigUpdated', loadLogs)
  }, [])

  const handleClearLogs = () => {
    setIsClearing(true)
    setTimeout(() => {
      localStorage.setItem('servora_db_audits', '[]')
      setLogs([])
      setIsClearing(false)
    }, 1000)
  }

  const filtered = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.performer.toLowerCase().includes(search.toLowerCase()) ||
    l.target?.toLowerCase().includes(search.toLowerCase())
  )

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-rose-500 text-white shadow-rose-500/20'
      case 'WARNING': return 'bg-amber-500 text-white shadow-amber-500/20'
      case 'SECURITY': return 'bg-indigo-500 text-white shadow-indigo-500/20'
      default: return 'bg-emerald-500 text-white shadow-emerald-500/20'
    }
  }

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-12 font-sans overflow-hidden">
      {/* ─── Header Node ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none uppercase italic">Nuclear Audit Trail</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-2">Platform Action Immutability Logs</p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             onClick={handleClearLogs}
             disabled={isClearing}
             className="h-12 px-6 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 uppercase text-[10px] font-black tracking-widest transition-all gap-2"
           >
              <Trash2 className="w-4 h-4" /> Purge Trail
           </Button>
           <Button className="h-12 px-8 rounded-2xl bg-slate-950 hover:bg-black text-white font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-800">
              <DownloadCloud className="w-4 h-4 text-blue-400" /> Export Forensic Pack
           </Button>
        </div>
      </div>

      {/* ─── Metrics Bar ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { icon: Database, label: 'Stored Transactions', val: logs.length, color: 'blue' },
           { icon: ShieldAlert, label: 'Security Breaches', val: logs.filter(l => l.severity === 'CRITICAL').length, color: 'rose' },
           { icon: Clock, label: 'Last Mutation', val: logs[0]?.time || 'Idle', color: 'emerald' }
         ].map((m, i) => (
           <Card key={i} className="border-2 border-slate-100 rounded-[2rem] p-6 flex items-center gap-5 bg-white group hover:border-blue-100 transition-all">
              <div className={`w-14 h-14 rounded-2xl bg-${m.color}-50 text-${m.color}-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                 <m.icon className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m.label}</p>
                 <p className="text-2xl font-black text-slate-950">{m.val}</p>
              </div>
           </Card>
         ))}
      </div>

      {/* ─── Search Node ───────────────────────────────────────────── */}
      <div className="bg-white border-2 border-slate-100 flex items-center gap-4 px-6 py-4 rounded-[1.5rem] w-full max-w-2xl shadow-xl shadow-slate-200/20">
         <Search className="w-5 h-5 text-slate-400" />
         <input 
            type="text" 
            placeholder="Search Action Trail, Performer ID, or Target Node..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-black tracking-tight"
         />
      </div>

      {/* ─── The Main Trail ────────────────────────────────────────── */}
      <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-100">
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Action Protocol</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Performer Node</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target Node</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Integrity Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  <AnimatePresence>
                     {filtered.map((log, idx) => (
                        <motion.tr 
                          key={log.id} 
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: Math.min(idx * 0.05, 1) }}
                          className="group hover:bg-slate-50 transition-colors"
                        >
                           <td className="px-10 py-6">
                              <div className="space-y-1">
                                 <p className="text-sm font-black text-slate-900 tracking-tight">{log.date || 'Today'}</p>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.time}</p>
                              </div>
                           </td>
                           <td className="px-10 py-6">
                              <p className="text-sm font-black text-slate-800 tracking-tight leading-none italic">{log.action}</p>
                           </td>
                           <td className="px-10 py-6">
                              <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">{log.performer}</p>
                           </td>
                           <td className="px-10 py-6">
                              <div className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest inline-block border border-slate-200">
                                 {log.target || 'N/A'}
                              </div>
                           </td>
                           <td className="px-10 py-6 text-right">
                              <div className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${getSeverityColor(log.severity)}`}>
                                 {log.severity === 'NOMINAL' ? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                 {log.severity}
                              </div>
                           </td>
                        </motion.tr>
                     ))}
                  </AnimatePresence>
                  {filtered.length === 0 && (
                     <tr>
                        <td colSpan={5} className="py-32 text-center space-y-4 opacity-30">
                           <Database className="w-16 h-16 mx-auto text-slate-300" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 tracking-[0.4em]">Zero Mutations Tracked in Buffer</p>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}
