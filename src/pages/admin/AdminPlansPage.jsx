import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Edit3, Trash2, Users, TrendingUp, Zap, Crown, 
  Rocket, Star, Shield, Check, ChevronRight, BarChart3,
  ArrowUpRight, Sparkles, Package, X, Save, Layers, Lock, Infinity
} from 'lucide-react'
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
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const defaultPlans = [
  { 
    id: 'PLN-1', name: "Starter", price: 999, tableLimit: 10, color: "slate", popular: false,
    desc: "Essential features for smaller venues.",
    features: ["Up to 10 Tables", "QR Code Menus", "Basic Analytics", "Order Management", "Email Support"]
  },
  { 
    id: 'PLN-2', name: "Professional", price: 2499, tableLimit: 30, color: "blue", popular: true,
    desc: "The sweet spot for active dining rooms.",
    features: ["Up to 30 Tables", "QR Code Menus", "Advanced Analytics", "CRM Module", "Revenue Tracking", "Priority Support"]
  },
  { 
    id: 'PLN-3', name: "Enterprise", price: 4999, tableLimit: 9999, color: "violet", popular: false,
    desc: "Maximum control for high-volume chains.",
    features: ["Unlimited Tables", "QR Code Menus", "Full Analytics Suite", "CRM + Marketing", "Revenue + Forecasting", "Custom Integrations", "24/7 Dedicated Support"]
  },
]

const planConfig = {
  PLN1: { gradient: 'from-slate-900 via-slate-850 to-slate-900', accent: '#64748b', icon: Package, border: 'border-slate-800' },
  PLN2: { gradient: 'from-indigo-950 via-blue-900 to-slate-950', accent: '#6366f1', icon: Rocket, border: 'border-indigo-500/30' },
  PLN3: { gradient: 'from-purple-950 via-violet-900 to-slate-950', accent: '#a855f7', icon: Crown, border: 'border-purple-500/30' },
}

const getConfig = (idx) => {
  const keys = Object.keys(planConfig)
  return planConfig[keys[idx % keys.length]] || planConfig.PLN1
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([])
  const [liveMetrics, setLiveMetrics] = useState({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [planId, setPlanId] = useState('')
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('')
  const [planLimit, setPlanLimit] = useState('')
  const [planDesc, setPlanDesc] = useState('')
  const [hoveredPlan, setHoveredPlan] = useState(null)

  useEffect(() => {
    const fetchPlansAndMetrics = async () => {
      let activePlans = defaultPlans
      try {
        const { data: dbPlans } = await supabase.from('subscription_plans').select('*')
        if (dbPlans && dbPlans.length > 0) {
          activePlans = dbPlans.map(p => ({
            id: p.id || `PLN-${p.name}`,
            name: p.name,
            price: parseInt(p.price || 999),
            tableLimit: parseInt(p.table_limit || p.tableLimit || 30),
            color: p.color || 'blue',
            popular: p.popular || false,
            desc: p.description || p.desc || 'Complete feature access for venues.',
            features: p.features || ["QR Code Menus", "Analytics", "Order Management"]
          }))
        }
      } catch (err) {
        console.warn('Using default plans:', err)
      }
      setPlans(activePlans)

      try {
        const { data: subs } = await supabase.from('subscriptions').select('plan_name, price')
        const metrics = {}
        activePlans.forEach(p => {
          const matchingSubs = (subs || []).filter(s => (s.plan_name || '').toUpperCase() === p.name.toUpperCase())
          const count = matchingSubs.length
          const mrr = matchingSubs.reduce((acc, sub) => acc + parseInt(sub.price || p.price || 0), 0)
          metrics[p.id] = { subscribers: count, mrr: mrr }
        })
        setLiveMetrics(metrics)
      } catch (err) {
        console.error("Failed to load plan metrics from Supabase:", err)
      }
    }
    fetchPlansAndMetrics()

    const channel = supabase
      .channel('public:admin_plans_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => fetchPlansAndMetrics())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const totalMRR = Object.values(liveMetrics).reduce((a, m) => a + m.mrr, 0)
  const totalSubs = Object.values(liveMetrics).reduce((a, m) => a + m.subscribers, 0)

  const openNewPlan = () => {
    setEditMode(false)
    setPlanId(`PLN-${Date.now().toString().slice(-4)}`)
    setPlanName(''); setPlanPrice(''); setPlanLimit(''); setPlanDesc('')
    setDialogOpen(true)
  }

  const openModifyPlan = (p) => {
    setEditMode(true)
    setPlanId(p.id); setPlanName(p.name); setPlanPrice(p.price)
    setPlanLimit(p.tableLimit); setPlanDesc(p.desc || '')
    setDialogOpen(true)
  }

  const handleDelete = async (id) => {
    const remaining = plans.filter(p => p.id !== id)
    setPlans(remaining)
    try {
      await supabase.from('subscription_plans').delete().eq('id', id)
    } catch (err) {
      console.warn('Supabase plan delete fallback:', err)
    }
    toast.success('Subscription Tier Deleted', { description: `Plan ID ${id} removed from system.` })
  }

  const handleSave = async () => {
    if (!planName || !planPrice || !planLimit) {
      toast.error('Missing Required Fields', { description: 'Please fill in Name, Monthly Price, and Max Table Limit.' })
      return
    }
    let updated = [...plans]
    const newObj = {
      id: planId, name: planName, price: parseInt(planPrice),
      tableLimit: parseInt(planLimit),
      color: editMode ? updated.find(p => p.id === planId)?.color || 'slate' : 'slate',
      desc: planDesc, popular: false,
      features: editMode ? updated.find(p => p.id === planId)?.features || ["QR Code Menus", "Analytics", "Order Management"] : ["QR Code Menus", "Analytics", "Order Management"]
    }
    if (editMode) updated = updated.map(p => p.id === planId ? { ...p, ...newObj } : p)
    else updated.push(newObj)
    setPlans(updated)

    try {
      await supabase.from('subscription_plans').upsert({
        id: planId,
        name: planName,
        price: parseInt(planPrice),
        table_limit: parseInt(planLimit),
        description: planDesc
      })
    } catch (err) {
      console.warn('Supabase plan save fallback:', err)
    }

    setDialogOpen(false)
    toast.success(editMode ? 'Tier Architecture Updated' : 'New Subscription Tier Provisioned', {
      description: `${planName} (₹${planPrice}/mo) saved globally.`
    })
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-slate-50/50 font-sans pb-32"
    >
      
      {/* ── Header Section ── */}
      <div className="relative bg-linear-to-br from-slate-950 via-indigo-950 to-slate-950 text-white overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            
            {/* Left Title Block */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                </div>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[9px] font-black uppercase tracking-[0.25em] px-3 py-1">
                  Platform Tier Architecture
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                Subscription <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-blue-400 to-teal-400">Plans</span>
              </h1>
              <p className="text-slate-400 font-medium text-xs md:text-sm max-w-xl leading-relaxed">
                Configure SaaS pricing tiers, monitor live subscriber distribution across merchant clusters, and calculate Monthly Recurring Revenue (MRR) yields.
              </p>
            </div>

            {/* Right Live Metrics Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-2xl text-center min-w-30 shadow-xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Subscribers</p>
                <p className="text-3xl font-black text-white tracking-tighter">{totalSubs}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">LIVE</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-2xl text-center min-w-37.5 shadow-xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Platform MRR</p>
                <p className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-teal-300 tracking-tighter">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">REALTIME</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-2xl text-center min-w-27.5 shadow-xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Active Tiers</p>
                <p className="text-3xl font-black text-white tracking-tighter">{plans.length}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">NODES</span>
                </div>
              </div>
            </div>

          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Layers className="w-4 h-4 text-indigo-400" />
               {plans.length} Pricing Tiers Deployed Across Merchant Nodes
            </p>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={openNewPlan}
                  className="h-11 px-6 rounded-2xl bg-linear-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/25 active:scale-95 transition-all gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Provision New Tier
                </Button>
              </DialogTrigger>

              {/* ── Provision / Edit Plan Dialog Modal ── */}
              <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-0 border-slate-200/80 shadow-2xl overflow-hidden font-sans">
                <div className="bg-linear-to-br from-slate-950 to-indigo-950 px-8 pt-8 pb-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  <DialogHeader className="text-left">
                    <div className="flex items-center gap-3.5 mb-2">
                      <div className="w-11 h-11 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center shrink-0">
                        {editMode ? <Edit3 className="w-5 h-5 text-indigo-400" /> : <Plus className="w-5 h-5 text-indigo-400" />}
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-black text-white tracking-tight leading-none">
                          {editMode ? 'Modify Tier Architecture' : 'Provision New Subscription Tier'}
                        </DialogTitle>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Global SaaS Tier Mutation</p>
                      </div>
                    </div>
                  </DialogHeader>
                </div>

                <div className="p-8 bg-white space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">Tier Name</label>
                    <input 
                      type="text" 
                      value={planName} 
                      onChange={e => setPlanName(e.target.value)} 
                      placeholder="e.g. Starter, Pro, Enterprise"
                      className="w-full h-13 bg-slate-50 rounded-2xl px-5 text-sm font-bold text-slate-900 border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">Monthly Price (₹)</label>
                      <input 
                        type="number" 
                        value={planPrice} 
                        onChange={e => setPlanPrice(e.target.value)} 
                        placeholder="2499"
                        className="w-full h-13 bg-slate-50 rounded-2xl px-5 text-sm font-mono font-black text-slate-900 border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">Max Tables (Limit)</label>
                      <input 
                        type="number" 
                        value={planLimit} 
                        onChange={e => setPlanLimit(e.target.value)} 
                        placeholder="30 or 9999 for unlimited"
                        className="w-full h-13 bg-slate-50 rounded-2xl px-5 text-sm font-mono font-black text-slate-900 border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">Marketing Description</label>
                    <input 
                      type="text" 
                      value={planDesc} 
                      onChange={e => setPlanDesc(e.target.value)} 
                      placeholder="Feature summary for merchant checkout..."
                      className="w-full h-13 bg-slate-50 rounded-2xl px-5 text-sm font-bold text-slate-900 border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400" 
                    />
                  </div>

                  <DialogFooter className="pt-3">
                    <Button 
                      onClick={handleSave}
                      className="w-full h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {editMode ? 'Commit Architecture Update' : 'Launch Subscription Tier'}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </div>

      {/* ── Subscription Plan Cards Grid ── */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {plans.map((p, idx) => {
              const metrics = liveMetrics[p.id] || { subscribers: 0, mrr: 0 }
              const config = getConfig(idx)
              const Icon = config.icon
              const isPopular = p.popular
              const isHovered = hoveredPlan === p.id

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  onMouseEnter={() => setHoveredPlan(p.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className="relative group cursor-default flex flex-col"
                >
                  {/* Popular Highlight Badge */}
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <div className="flex items-center gap-1.5 bg-linear-to-r from-amber-400 to-orange-400 text-slate-950 text-[9px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full shadow-lg shadow-amber-400/30">
                        <Star className="w-3 h-3 fill-current" /> Most Popular
                      </div>
                    </div>
                  )}

                  {/* Main Card Container */}
                  <div className={`rounded-[2.5rem] bg-white border-2 overflow-hidden shadow-xl transition-all duration-300 flex-1 flex flex-col ${
                    isPopular ? 'border-indigo-400/80 ring-4 ring-indigo-500/10 shadow-indigo-500/10' : 'border-slate-200/80 shadow-slate-200/60'
                  } ${isHovered ? 'shadow-2xl -translate-y-2 border-indigo-400' : ''}`}>

                    {/* Dark Header Banner */}
                    <div className={`bg-linear-to-br ${config.gradient} p-8 text-white relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-36 h-36 rounded-full opacity-20 blur-3xl" style={{ background: config.accent }} />
                      
                      <div className="relative z-10 space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-inner">
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">{p.name}</h3>
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{p.id}</p>
                            </div>
                          </div>

                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[8px] font-black uppercase tracking-widest px-2.5 py-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" /> Active Node
                          </Badge>
                        </div>

                        {/* Pricing */}
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-white/60">₹</span>
                            <span className="text-5xl font-black text-white tracking-tighter leading-none">{p.price.toLocaleString('en-IN')}</span>
                            <span className="text-xs font-bold text-white/50 uppercase tracking-wider ml-1">/ month</span>
                          </div>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">Billed Monthly &bull; Cancel Anytime</p>
                        </div>

                        {/* Description */}
                        <p className="text-xs font-bold text-white/70 leading-relaxed border-t border-white/10 pt-4">
                           {p.desc || 'Complete feature access for restaurant venues.'}
                        </p>
                      </div>
                    </div>

                    {/* White Details Body */}
                    <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                      
                      <div className="space-y-6">
                        {/* Live Subscriber & MRR Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Subscribers</p>
                            </div>
                            <p className="text-3xl font-black text-slate-950 tracking-tighter leading-none">{metrics.subscribers}</p>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">MRR Yield</p>
                            </div>
                            <p className="text-xl font-black text-indigo-600 tracking-tighter leading-none">
                              ₹{metrics.mrr.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>

                        {/* Table Limit Box */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Table Capacity</span>
                          <span className="text-xs font-black text-slate-950 uppercase flex items-center gap-1">
                            {p.tableLimit === 9999 ? (
                               <><Infinity className="w-4 h-4 text-indigo-600" /> Unlimited</>
                            ) : (
                               `${p.tableLimit} Max Tables`
                            )}
                          </span>
                        </div>

                        {/* Feature Checklist */}
                        {p.features && p.features.length > 0 && (
                          <div className="space-y-2.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Included Features</p>
                            <div className="space-y-2">
                              {p.features.map((f, fi) => (
                                <div key={fi} className="flex items-center gap-2.5">
                                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3 stroke-[3px]" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">{f}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                        <Button 
                          onClick={() => openModifyPlan(p)}
                          className="flex-1 h-11 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all gap-2 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Modify Tier
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleDelete(p.id)}
                          className="h-11 w-11 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all shrink-0 p-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* New Tier Placeholder Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: plans.length * 0.08 + 0.1 }}
            className="flex flex-col h-full min-h-105"
          >
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button 
                  onClick={openNewPlan}
                  className="w-full h-full rounded-[2.5rem] border-2 border-dashed border-slate-300 bg-white/60 hover:bg-white hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col items-center justify-center gap-4 group p-8 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                    <Plus className="w-8 h-8 text-indigo-600 stroke-[2.5px]" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 uppercase tracking-widest transition-colors">Provision New Tier</p>
                    <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors">Click to configure custom SaaS tier node</p>
                  </div>
                </button>
              </DialogTrigger>
            </Dialog>
          </motion.div>
        </div>

        {/* Footer info bar */}
        <div className="mt-12 p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
            <p className="text-xs font-bold text-slate-600">Plan updates take effect immediately for new subscribers. Existing subscribers are grandfathered until next renewal cycle.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Supabase Live Sync Active</span>
          </div>
        </div>

      </div>
    </motion.div>
  )
}
