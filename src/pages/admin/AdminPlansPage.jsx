import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Settings2, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'

const defaultPlans = [
  { id: 'PLN-1', name: "Starter", price: 1499, tableLimit: 10, color: "slate", popular: false, desc: "Essential features for smaller venues." },
  { id: 'PLN-2', name: "Professional", price: 2999, tableLimit: 30, color: "blue", popular: true, desc: "The sweet spot for active dining rooms." },
  { id: 'PLN-3', name: "Enterprise", price: 4999, tableLimit: 9999, color: "indigo", popular: false, desc: "Maximum control for high-volume chains." },
]

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([])
  const [liveMetrics, setLiveMetrics] = useState({})
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  const [planId, setPlanId] = useState('')
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('')
  const [planLimit, setPlanLimit] = useState('')
  const [planDesc, setPlanDesc] = useState('')

  useEffect(() => {
    // 1. Load active system plans
    const stored = JSON.parse(localStorage.getItem('servora_subscription_plans'))
    const activePlans = stored || defaultPlans
    if (!stored) localStorage.setItem('servora_subscription_plans', JSON.stringify(defaultPlans))
    
    setPlans(activePlans)

    // 2. Poll live database to map exact subscribers and exact MRR generation to each node
    const pollMetrics = () => {
        const subs = JSON.parse(localStorage.getItem('servora_db_subscriptions') || '[]')
        const metrics = {}
        
        activePlans.forEach(p => {
            const subscribersCount = subs.filter(s => s.tier === p.name).length
            metrics[p.id] = {
                subscribers: subscribersCount,
                mrr: subscribersCount * p.price
            }
        })
        setLiveMetrics(metrics)
    }
    
    pollMetrics()
    const timer = setInterval(pollMetrics, 2000)
    return () => clearInterval(timer)
  }, [])

  const openNewPlan = () => {
      setEditMode(false)
      setPlanId(`PLN-${Date.now().toString().slice(-4)}`)
      setPlanName('')
      setPlanPrice('')
      setPlanLimit('')
      setPlanDesc('')
      setDialogOpen(true)
  }

  const openModifyPlan = (p) => {
      setEditMode(true)
      setPlanId(p.id)
      setPlanName(p.name)
      setPlanPrice(p.price)
      setPlanLimit(p.tableLimit)
      setPlanDesc(p.desc || '')
      setDialogOpen(true)
  }

  const handleDelete = (id) => {
      const remaining = plans.filter(p => p.id !== id)
      setPlans(remaining)
      localStorage.setItem('servora_subscription_plans', JSON.stringify(remaining))
  }

  const handleSave = () => {
      if (!planName || !planPrice || !planLimit) return

      let updated = [...plans]
      const newObj = {
          id: planId,
          name: planName,
          price: parseInt(planPrice),
          tableLimit: parseInt(planLimit),
          color: editMode ? updated.find(p => p.id === planId)?.color || 'slate' : 'slate',
          desc: planDesc,
          popular: false
      }

      if (editMode) {
          updated = updated.map(p => p.id === planId ? { ...p, ...newObj } : p)
      } else {
          updated.push(newObj)
      }

      setPlans(updated)
      localStorage.setItem('servora_subscription_plans', JSON.stringify(updated))
      setDialogOpen(false)
  }

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Subscription Topography</h1>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Platform Tier Control</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogTrigger asChild>
              <Button onClick={openNewPlan} className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest px-6 shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2">
                 <Plus className="w-4 h-4" /> Provision New Tier
              </Button>
           </DialogTrigger>
           
           <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-slate-200 shadow-2xl">
              <DialogHeader className="mb-6">
                 <DialogTitle className="text-2xl font-black text-slate-950 tracking-tight">{editMode ? 'Modify Architecture' : 'Deploy Tier Node'}</DialogTitle>
                 <p className="text-xs uppercase font-black tracking-widest text-slate-500 mt-1">Global Plan Mutation</p>
              </DialogHeader>
              
              <div className="space-y-4 mb-8">
                 <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Tier Designation Name</label>
                    <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Enterprise Plus" className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold text-slate-900 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Monthly Cost (₹)</label>
                       <input type="number" value={planPrice} onChange={e => setPlanPrice(e.target.value)} placeholder="1499" className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold text-slate-900 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Max Tables Allowed</label>
                       <input type="number" value={planLimit} onChange={e => setPlanLimit(e.target.value)} placeholder="10" className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold text-slate-900 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Marketing Description</label>
                    <input type="text" value={planDesc} onChange={e => setPlanDesc(e.target.value)} placeholder="Feature summary for sales page" className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold text-slate-900 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                 </div>
              </div>

              <DialogFooter>
                 <Button onClick={handleSave} className="w-full h-12 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest shadow-xl">
                    {editMode ? 'Commit Hotfix' : 'Launch Tier Globally'}
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AnimatePresence>
        {plans.map((p, idx) => {
          const metrics = liveMetrics[p.id] || { subscribers: 0, mrr: 0 }
          
          return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`p-8 rounded-[2.5rem] bg-white border border-${p.color}-100 shadow-xl shadow-${p.color}-900/5 relative overflow-hidden group`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${p.color}-50 rounded-full blur-3xl pointer-events-none group-hover:bg-${p.color}-100 transition-colors duration-700`} />
            
            <div className="relative z-10 space-y-8">
               <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                     <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-lg sm:text-xl font-black uppercase tracking-[0.2em] text-${p.color}-600 break-words max-w-[140px] leading-tight`}>{p.name}</h3>
                        <Badge variant="outline" className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border-emerald-200`}>
                           Active
                        </Badge>
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node ID: {p.id}</p>
                     <p className="text-[10px] font-bold text-slate-500 leading-tight pt-1">Limit: {p.tableLimit === 9999 ? 'Infinite' : p.tableLimit} Tables</p>
                  </div>
                  <div className="text-right">
                     <p className="text-3xl font-black text-slate-950 tracking-tighter leading-none">₹{p.price}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Monthly</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active Clusters</p>
                     <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{metrics.subscribers}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Live MRR Impact</p>
                     <p className={`text-xl font-black text-${p.color}-600 tracking-tighter leading-none`}>₹{metrics.mrr.toLocaleString('en-IN')}</p>
                  </div>
               </div>

               <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <Button onClick={() => openModifyPlan(p)} variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest bg-white hover:bg-slate-50 transition-colors">
                     <Edit3 className="w-4 h-4 mr-2" /> Modify Specs
                  </Button>
                  <Button onClick={() => handleDelete(p.id)} variant="ghost" className="h-12 w-12 p-0 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors shrink-0">
                     <Trash2 className="w-5 h-5" />
                  </Button>
               </div>
            </div>
          </motion.div>
        )})}
        </AnimatePresence>
      </div>
    </div>
  )
}
