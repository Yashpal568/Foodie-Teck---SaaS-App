import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Edit3, Trash2, Users, TrendingUp, Zap, Crown, 
  Rocket, Star, Shield, Check, ChevronRight, BarChart3,
  ArrowUpRight, Sparkles, Package, X, Save, Layers, Lock, Infinity,
  IndianRupee, Store, FileCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { supabase, ensureAdminSession } from '@/lib/adminSupabase'
import { toast } from 'sonner'

const defaultPlans = [
  { 
    id: 'PLN-1', name: "Starter", price: 999, tableLimit: 10, color: "slate", popular: false,
    desc: "Essential features for smaller cafes & fast-service dining.",
    features: ["Up to 10 Dining Tables", "Instant QR Code Menus", "Live Order Notifications", "Basic Sales Analytics", "Email Support"]
  },
  { 
    id: 'PLN-2', name: "Professional", price: 2499, tableLimit: 30, color: "indigo", popular: true,
    desc: "The complete operating system for active restaurants.",
    features: ["Up to 30 Dining Tables", "Dynamic QR Menus & Sessions", "Realtime Kitchen Display", "Customer CRM & History", "Financial & MRR Tracking", "Priority WhatsApp & Phone Support"]
  },
  { 
    id: 'PLN-3', name: "Enterprise", price: 4999, tableLimit: 9999, color: "purple", popular: false,
    desc: "Maximum control for high-volume dining & restaurant chains.",
    features: ["Unlimited Tables & Outlets", "Multi-Branch Management", "Full Analytics & AI Forecast", "Customer Loyalty & Promotions", "Dedicated Account Manager", "24/7 Priority SLA Support"]
  },
]

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
  const [loading, setLoading] = useState(true)

  const fetchPlansAndMetrics = async () => {
    try {
      setLoading(true)
      let activePlans = defaultPlans
      try {
        const { data: dbPlans } = await supabase.from('subscription_plans').select('*')
        if (dbPlans && dbPlans.length > 0) {
          activePlans = dbPlans.map(p => ({
            id: p.id || `PLN-${p.name}`,
            name: p.name,
            price: parseInt(p.price || 999),
            tableLimit: parseInt(p.table_limit || p.tableLimit || 30),
            color: p.color || 'indigo',
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
        const { data: subs } = await supabase.from('subscriptions').select('*')
        const metrics = {}
        activePlans.forEach(p => {
          const matchingSubs = (subs || []).filter(s => (s.plan_name || '').toUpperCase() === p.name.toUpperCase())
          const count = matchingSubs.length
          const mrr = matchingSubs.reduce((acc, sub) => acc + parseInt(sub.price || p.price || 0), 0)
          metrics[p.id] = { subscribers: count, mrr: mrr }
        })
        setLiveMetrics(metrics)
      } catch (err) {
        console.error("Failed to load plan metrics:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ensureAdminSession()
    fetchPlansAndMetrics()

    const channel = supabase
      .channel('public:admin_plans_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, fetchPlansAndMetrics)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const totalMRR = Object.values(liveMetrics).reduce((a, m) => a + (m.mrr || 0), 0)
  const totalSubs = Object.values(liveMetrics).reduce((a, m) => a + (m.subscribers || 0), 0)

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

  const handleDelete = async (id) => {
    const remaining = plans.filter(p => p.id !== id)
    setPlans(remaining)
    try {
      await supabase.from('subscription_plans').delete().eq('id', id)
    } catch (err) {
      console.warn('Supabase plan delete fallback:', err)
    }
    toast.success('Subscription Tier Deleted', { description: `Plan ID ${id} removed.` })
  }

  const handleSave = async () => {
    if (!planName || !planPrice || !planLimit) {
      toast.error('Missing Required Fields', { description: 'Please fill in Name, Monthly Price, and Table Limit.' })
      return
    }
    let updated = [...plans]
    const newObj = {
      id: planId,
      name: planName,
      price: parseInt(planPrice),
      tableLimit: parseInt(planLimit),
      color: editMode ? updated.find(p => p.id === planId)?.color || 'indigo' : 'indigo',
      desc: planDesc || 'Complete feature access for restaurant venues.',
      popular: editMode ? updated.find(p => p.id === planId)?.popular || false : false,
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
        description: planDesc,
        features: newObj.features,
        color: newObj.color,
        popular: newObj.popular
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
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans select-none">
      
      {/* ─── ⚡ CLEAN ENTERPRISE PAGE HEADER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Subscription Plans
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Plan Engine
            </Badge>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Configure SaaS pricing tiers, manage table quotas, and monitor subscriber distribution across merchant stores.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            onClick={openNewPlan}
            size="sm"
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Provision New Plan
          </Button>
        </div>
      </div>

      {/* ─── 📊 REFINED SHADCN KPI METRIC CARDS ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Metric 1: Total Subscribers */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Subscribers</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {totalSubs}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active Merchant Subscriptions</span>
            </p>
          </div>
        </Card>

        {/* Metric 2: Platform MRR */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Platform MRR</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              ₹{totalMRR.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                Live Revenue Run-Rate
              </span>
            </p>
          </div>
        </Card>

        {/* Metric 3: Active Tiers */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Tiers</span>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1.5">
              {plans.length} <span className="text-xs font-semibold text-slate-400">deployed</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Available at merchant checkout
            </p>
          </div>
        </Card>
      </div>

      {/* ─── 📦 SUBSCRIPTION PLAN CARDS GRID ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {plans.map((p, idx) => {
            const metrics = liveMetrics[p.id] || { subscribers: 0, mrr: 0 }
            const isPopular = p.popular

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className="flex flex-col h-full"
              >
                <Card className={`rounded-2xl bg-white shadow-xs flex flex-col justify-between h-full hover:shadow-md transition-all relative overflow-hidden ${
                  isPopular 
                    ? 'border-2 border-indigo-500/80 ring-4 ring-indigo-500/10' 
                    : 'border border-slate-200/90'
                }`}>
                  {/* Popular Pill */}
                  {isPopular && (
                    <div className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1 flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Most Popular Plan
                    </div>
                  )}

                  <div className="p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-mono text-[9px] font-bold">
                            {p.id}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.desc}</p>
                      </div>
                    </div>

                    {/* Price Block */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400">₹</span>
                        <span className="text-3xl font-black text-slate-900 tracking-tight ml-0.5">
                          {p.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
                      </div>
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                        {p.tableLimit === 9999 ? 'Unlimited Tables' : `${p.tableLimit} Tables`}
                      </Badge>
                    </div>

                    {/* Live Metric Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Subscribers</span>
                        <p className="text-base font-black text-slate-900 mt-0.5">{metrics.subscribers}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">MRR Yield</span>
                        <p className="text-base font-black text-indigo-600 mt-0.5">₹{metrics.mrr.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Feature Checklist */}
                    <div className="space-y-2.5 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                      <div className="space-y-2">
                        {p.features?.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-2 text-xs text-slate-700">
                            <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3px]" />
                            </div>
                            <span className="font-medium">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Button 
                      onClick={() => openModifyPlan(p)}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      Edit Tier
                    </Button>

                    <Button 
                      onClick={() => handleDelete(p.id)}
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Dashed New Tier Card */}
        <button 
          onClick={openNewPlan}
          className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 hover:bg-white hover:border-indigo-400 hover:shadow-sm transition-all p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer min-h-[350px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 flex items-center justify-center transition-all group-hover:scale-105">
            <Plus className="w-6 h-6 stroke-[2.5px]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Provision New Tier
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Add a new custom SaaS pricing tier
            </p>
          </div>
        </button>
      </div>

      {/* ─── 🛡️ PROVISION / EDIT PLAN DIALOG ───────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 border-slate-200 bg-white font-sans space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editMode ? 'Modify Plan Architecture' : 'Provision New Subscription Plan'}
            </DialogTitle>
            <p className="text-xs text-slate-500">Configure global pricing, table capacity, and marketing copy.</p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Plan Name</label>
              <Input 
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                placeholder="e.g. Starter, Growth, Enterprise"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Monthly Price (₹)</label>
                <Input 
                  type="number"
                  value={planPrice}
                  onChange={e => setPlanPrice(e.target.value)}
                  placeholder="2499"
                  className="h-9 text-xs font-mono font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Max Tables</label>
                <Input 
                  type="number"
                  value={planLimit}
                  onChange={e => setPlanLimit(e.target.value)}
                  placeholder="30 or 9999 for unlimited"
                  className="h-9 text-xs font-mono font-bold rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Marketing Description</label>
              <Input 
                value={planDesc}
                onChange={e => setPlanDesc(e.target.value)}
                placeholder="Summary for merchant checkout..."
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center gap-2">
            <Button 
              onClick={() => setDialogOpen(false)}
              variant="outline"
              size="sm"
              className="w-1/2 h-9 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              size="sm"
              className="w-1/2 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              {editMode ? 'Save Changes' : 'Launch Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
