import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Edit3, Trash2, Users, TrendingUp, Zap, Crown, 
  Rocket, Star, Shield, Check, ChevronRight, BarChart3,
  ArrowUpRight, Sparkles, Package, X, Save
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

const defaultPlans = [
  { 
    id: 'PLN-1', name: "Starter", price: 1499, tableLimit: 10, color: "slate", popular: false,
    desc: "Essential features for smaller venues.",
    features: ["Up to 10 Tables", "QR Code Menus", "Basic Analytics", "Order Management", "Email Support"]
  },
  { 
    id: 'PLN-2', name: "Professional", price: 2999, tableLimit: 30, color: "blue", popular: true,
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
  PLN1: { gradient: 'from-slate-900 to-slate-700', accent: '#94a3b8', icon: Package, badge: 'bg-slate-100 text-slate-600' },
  PLN2: { gradient: 'from-blue-950 to-blue-700', accent: '#60a5fa', icon: Rocket, badge: 'bg-blue-100 text-blue-700' },
  PLN3: { gradient: 'from-violet-950 to-purple-700', accent: '#a78bfa', icon: Crown, badge: 'bg-violet-100 text-violet-700' },
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
    const stored = JSON.parse(localStorage.getItem('servora_subscription_plans'))
    const activePlans = stored || defaultPlans
    if (!stored) localStorage.setItem('servora_subscription_plans', JSON.stringify(defaultPlans))
    setPlans(activePlans)

    const pollMetrics = () => {
      const subs = JSON.parse(localStorage.getItem('servora_db_subscriptions') || '[]')
      const metrics = {}
      activePlans.forEach(p => {
        const count = subs.filter(s => s.tier === p.name).length
        metrics[p.id] = { subscribers: count, mrr: count * p.price }
      })
      setLiveMetrics(metrics)
    }
    pollMetrics()
    const timer = setInterval(pollMetrics, 2000)
    return () => clearInterval(timer)
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

  const handleDelete = (id) => {
    const remaining = plans.filter(p => p.id !== id)
    setPlans(remaining)
    localStorage.setItem('servora_subscription_plans', JSON.stringify(remaining))
  }

  const handleSave = () => {
    if (!planName || !planPrice || !planLimit) return
    let updated = [...plans]
    const newObj = {
      id: planId, name: planName, price: parseInt(planPrice),
      tableLimit: parseInt(planLimit),
      color: editMode ? updated.find(p => p.id === planId)?.color || 'slate' : 'slate',
      desc: planDesc, popular: false,
      features: editMode ? updated.find(p => p.id === planId)?.features || [] : []
    }
    if (editMode) updated = updated.map(p => p.id === planId ? { ...p, ...newObj } : p)
    else updated.push(newObj)
    setPlans(updated)
    localStorage.setItem('servora_subscription_plans', JSON.stringify(updated))
    setDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans">
      
      {/* ── Hero Header ── */}
      <div className="relative bg-slate-950 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDBoNnY2aC02di02em0xMiAwaDZ2NmgtNnYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')]" />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 px-8 py-10 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Left Title */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Platform Tier Control</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                Subscription <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Plans</span>
              </h1>
              <p className="text-slate-400 font-bold text-sm mt-3 max-w-md leading-relaxed">
                Manage your platform's pricing tiers, track live subscriber counts, and monitor Monthly Recurring Revenue in real time.
              </p>
            </div>

            {/* Right Stats */}
            <div className="flex items-stretch gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 backdrop-blur-xl text-center min-w-[120px]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Merchants</p>
                <p className="text-3xl font-black text-white tracking-tighter">{totalSubs}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400">LIVE</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 backdrop-blur-xl text-center min-w-[140px]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Platform MRR</p>
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 tracking-tighter">
                  ₹{totalMRR.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[9px] font-bold text-emerald-400">STREAMING</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 backdrop-blur-xl text-center min-w-[100px]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Active Tiers</p>
                <p className="text-3xl font-black text-white tracking-tighter">{plans.length}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-[9px] font-bold text-amber-400">NODES</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {plans.length} tier{plans.length !== 1 ? 's' : ''} configured · Metrics refresh every 2s
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button 
                  onClick={openNewPlan}
                  className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Provision New Tier
                </button>
              </DialogTrigger>

              {/* ── Create / Edit Dialog ── */}
              <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-hidden">
                <div className="bg-slate-950 px-8 pt-8 pb-6">
                  <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                        {editMode ? <Edit3 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-blue-400" />}
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-black text-white tracking-tight leading-none">
                          {editMode ? 'Modify Tier Architecture' : 'Deploy New Tier Node'}
                        </DialogTitle>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">Global Plan Mutation</p>
                      </div>
                    </div>
                  </DialogHeader>
                </div>

                <div className="p-8 bg-white space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Tier Name</label>
                    <input 
                      type="text" value={planName} onChange={e => setPlanName(e.target.value)} 
                      placeholder="e.g. Enterprise Plus"
                      className="w-full h-14 bg-slate-50 rounded-2xl px-5 text-sm font-bold text-slate-900 border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Monthly Price (₹)</label>
                      <input 
                        type="number" value={planPrice} onChange={e => setPlanPrice(e.target.value)} 
                        placeholder="1499"
                        className="w-full h-14 bg-slate-50 rounded-2xl px-5 text-sm font-bold text-slate-900 border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Max Tables</label>
                      <input 
                        type="number" value={planLimit} onChange={e => setPlanLimit(e.target.value)} 
                        placeholder="10"
                        className="w-full h-14 bg-slate-50 rounded-2xl px-5 text-sm font-bold text-slate-900 border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Marketing Description</label>
                    <input 
                      type="text" value={planDesc} onChange={e => setPlanDesc(e.target.value)} 
                      placeholder="Feature summary for merchants..."
                      className="w-full h-14 bg-slate-50 rounded-2xl px-5 text-sm font-bold text-slate-900 border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300" 
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <button 
                      onClick={handleSave}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {editMode ? 'Commit Architecture Update' : 'Launch Tier Globally'}
                    </button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* ── Plan Cards ── */}
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
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  onMouseEnter={() => setHoveredPlan(p.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className="relative group cursor-default"
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-xl shadow-amber-400/40">
                        <Star className="w-3 h-3 fill-current" /> Most Popular
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div className={`rounded-[2.5rem] overflow-hidden shadow-xl transition-all duration-500 ${isPopular ? 'shadow-blue-500/20 ring-2 ring-blue-400/30' : 'shadow-slate-200/60'} ${isHovered ? 'shadow-2xl -translate-y-2' : ''}`}>

                    {/* Dark top section */}
                    <div className={`bg-gradient-to-br ${config.gradient} p-8 relative overflow-hidden`}>
                      {/* BG Orb */}
                      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-2xl"
                        style={{ background: config.accent }} />
                      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 blur-3xl"
                        style={{ background: config.accent }} />

                      <div className="relative z-10">
                        {/* Tier header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center">
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white uppercase tracking-tight">{p.name}</h3>
                              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{p.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Active</span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-white/50">₹</span>
                            <span className="text-5xl font-black text-white tracking-tighter leading-none">{p.price.toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-1">Per month · Billed Monthly</p>
                        </div>

                        {/* Description */}
                        <p className="text-sm font-bold text-white/60 leading-relaxed mt-4">{p.desc}</p>
                      </div>
                    </div>

                    {/* White bottom section */}
                    <div className="bg-white p-8 space-y-6">
                      {/* Live Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Merchants</p>
                          </div>
                          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{metrics.subscribers}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">MRR</p>
                          </div>
                          <p className="text-xl font-black tracking-tighter leading-none" style={{ color: config.accent }}>
                            ₹{metrics.mrr.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Features */}
                      {p.features && p.features.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Included Features</p>
                          <div className="space-y-1.5">
                            {p.features.slice(0, 4).map((f, fi) => (
                              <div key={fi} className="flex items-center gap-2.5">
                                <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5 text-emerald-500 stroke-[3px]" />
                                </div>
                                <span className="text-xs font-bold text-slate-600">{f}</span>
                              </div>
                            ))}
                            {p.features.length > 4 && (
                              <div className="flex items-center gap-2.5">
                                <div className="w-4 h-4 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                  <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                                </div>
                                <span className="text-xs font-bold text-blue-500">+{p.features.length - 4} more features</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Table limit pill */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Table Limit</span>
                        <span className="text-[11px] font-black text-slate-900 uppercase">
                          {p.tableLimit === 9999 ? '∞ Unlimited' : `${p.tableLimit} Tables`}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-2">
                        <button 
                          onClick={() => openModifyPlan(p)}
                          className="flex-1 h-12 rounded-xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Modify
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="h-12 w-12 rounded-xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95 transition-all flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Empty state / Add new card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: plans.length * 0.08 + 0.1 }}
          >
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button 
                  onClick={openNewPlan}
                  className="w-full h-full min-h-[400px] rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/50 hover:bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 flex flex-col items-center justify-center gap-4 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 group-hover:bg-blue-50 border border-slate-200 group-hover:border-blue-200 flex items-center justify-center transition-all duration-300">
                    <Plus className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors stroke-[2.5px]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-400 group-hover:text-slate-700 uppercase tracking-widest transition-colors">New Tier</p>
                    <p className="text-[10px] font-bold text-slate-300 group-hover:text-slate-400 mt-1 transition-colors">Click to provision</p>
                  </div>
                </button>
              </DialogTrigger>
            </Dialog>
          </motion.div>
        </div>

        {/* Bottom info bar */}
        <div className="mt-12 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-400" />
            <p className="text-xs font-bold text-slate-500">Plan changes take effect immediately for new subscribers. Existing subscribers are grandfathered until next renewal.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Sync Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
