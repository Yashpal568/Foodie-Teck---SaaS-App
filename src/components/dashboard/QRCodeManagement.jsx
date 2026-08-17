import { useState, useEffect } from 'react'
import { 
  QrCode, 
  Download, 
  Plus, 
  Minus,
  Table, 
  Smartphone, 
  Scan, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Menu, 
  Cloud, 
  Sparkles,
  ShieldCheck,
  Copy,
  ExternalLink,
  Search,
  Layers,
  Settings2,
  Check,
  Zap,
  Trash2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Sidebar from '../layout/Sidebar'
import Logo from '@/components/ui/Logo'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import QRCode from 'qrcode'
import { getCachedRestaurantId, getMyRestaurant, bulkSaveQRCodes, supabase, ensureValidRestaurantUUID } from '@/lib/api'
import { generateTableSignature } from '@/utils/tableSecurity'
import UpgradePlanModal from './UpgradePlanModal'
import QRTemplateStudioModal from './QRTemplateStudioModal'
import { getPlanDetails } from '@/utils/planLimits'

// Cryptographic table QR generator (Instant Client-Side Base64 Data URL)
const generateQRCode = async (restaurantId, tableNumber) => {
  const sig = generateTableSignature(restaurantId, tableNumber)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const url = `${origin}/menu?restaurant=${restaurantId}&table=${tableNumber}&sig=${sig}`
  
  let qrDataUrl = ''
  try {
    qrDataUrl = await QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
  } catch (err) {
    qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&format=png&margin=1`
  }

  return {
    url,
    signature: sig,
    qrImageUrl: qrDataUrl,
    qrDataUrl: qrDataUrl,
    tableNumber: Number(tableNumber),
    restaurantId,
    generatedAt: new Date().toISOString()
  }
}

// Load QR codes dynamically without flooding database rows
const loadQRCodesFromStorage = async (restaurantId, limit = 10) => {
  try {
    if (!restaurantId) return []
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    const validId = isUUID(restaurantId) ? restaurantId : (await ensureValidRestaurantUUID(restaurantId) || restaurantId)
    
    // Check if table count is stored in localStorage cache
    const cachedCount = localStorage.getItem(`servora_table_count_${validId}`) || localStorage.getItem(`servora_table_count_${restaurantId}`)
    
    // Default to 10 tables if unlimited or not set (instead of 9,999!)
    let countToGenerate = cachedCount ? parseInt(cachedCount) : 10
    if (isNaN(countToGenerate) || countToGenerate <= 0) countToGenerate = 10
    
    if (isUUID(validId)) {
      try {
        const { data } = await supabase.from('qr_codes').select('table_number').eq('restaurant_id', validId).order('table_number', { ascending: true })
        if (data && data.length > 0) {
          countToGenerate = Math.max(countToGenerate, data.length)
        }
      } catch (e) {}
    }

    const targetCount = Math.min(countToGenerate, limit > 0 ? limit : 10)
    const codes = []
    for (let i = 1; i <= targetCount; i++) {
      codes.push(await generateQRCode(validId, i))
    }
    return codes
  } catch (error) {
    console.error('Error loading QR codes:', error)
  }
  return []
}

export default function QRCodeManagement({ activeItem, setActiveItem, navigate, plan, restaurantId: propRestaurantId }) {
  const planDetails = getPlanDetails(plan?.name)
  const tableLimit = planDetails.tableLimit
  const initialRid = propRestaurantId || getCachedRestaurantId() || (typeof window !== 'undefined' ? window.location.pathname.split('/console/')[1] : null) || 'test2@gmail.com'
  const [restaurantId, setRestaurantId] = useState(initialRid)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [restaurantProfile, setRestaurantProfile] = useState({})
  const [isStudioOpen, setIsStudioOpen] = useState(false)
  const [selectedStudioQR, setSelectedStudioQR] = useState(null)
  
  const effectiveLimit = tableLimit || 10
  const [tableCount, setTableCount] = useState(10)
  const [qrCodes, setQrCodes] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [copiedTableId, setCopiedTableId] = useState(null)
  const [showConfigDrawer, setShowConfigDrawer] = useState(false)

  // Fetch valid UUID & restaurant profile
  useEffect(() => {
    const repairSession = async () => {
      const target = propRestaurantId || restaurantId || getCachedRestaurantId()
      if (target) {
        const uuid = await ensureValidRestaurantUUID(target)
        if (uuid) setRestaurantId(uuid)

        try {
          const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
          let res = await getMyRestaurant()
          if (!res || (!res.logo_url && !res.avatar)) {
            let q = null
            if (target.includes('@')) {
              q = supabase.from('restaurants').select('*').eq('email', target.toLowerCase()).maybeSingle()
            } else if (uuid && isUUID(uuid)) {
              q = supabase.from('restaurants').select('*').eq('id', uuid).maybeSingle()
            } else if (isUUID(target)) {
              q = supabase.from('restaurants').select('*').eq('id', target).maybeSingle()
            }
            if (q) {
              const { data } = await q
              if (data) res = data
            }
          }
          if (res) setRestaurantProfile(res)
        } catch (e) {
          console.warn('Could not fetch restaurant profile for QR templates:', e)
        }
      }
    }
    repairSession()
  }, [propRestaurantId, restaurantId])

  // Load QR codes dynamically
  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      if (!restaurantId) return
      const savedQRCodes = await loadQRCodesFromStorage(restaurantId, effectiveLimit)
      if (isMounted && savedQRCodes && savedQRCodes.length > 0) {
        setQrCodes(savedQRCodes)
        setTableCount(Math.min(savedQRCodes.length, effectiveLimit))
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [restaurantId, effectiveLimit])

  // Generate / Regenerate All QR Codes
  const generateAllQRCodes = async () => {
    if (tableCount > effectiveLimit) {
      setShowUpgradeModal(true)
      return
    }
    setIsGenerating(true)
    try {
      const activeRid = restaurantId || (await ensureValidRestaurantUUID(propRestaurantId || 'test2@gmail.com'))
      const codes = []
      const targetCount = Math.min(tableCount, effectiveLimit)
      for (let i = 1; i <= targetCount; i++) {
        const qrCode = await generateQRCode(activeRid, i)
        codes.push(qrCode)
      }
      setQrCodes(codes)
      setShowConfigDrawer(false)
      
      // Save table count to cache
      localStorage.setItem(`servora_table_count_${activeRid}`, String(targetCount))
      if (propRestaurantId && propRestaurantId !== activeRid) {
        localStorage.setItem(`servora_table_count_${propRestaurantId}`, String(targetCount))
      }
      
      // Non-blocking sync to table sessions
      const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
      if (isUUID(activeRid)) {
        bulkSaveQRCodes(activeRid, codes).catch(() => {})
      }
      
      window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { qrCodes: codes } }))
    } catch (error) {
      console.error('Error generating QR codes:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Copy Menu URL to clipboard
  const handleCopyUrl = (qr) => {
    navigator.clipboard.writeText(qr.url)
    setCopiedTableId(qr.tableNumber)
    setTimeout(() => setCopiedTableId(null), 2000)
  }

  // Download raw QR image
  const downloadQRCode = async (qrCode) => {
    try {
      const a = document.createElement('a')
      a.href = qrCode.qrDataUrl || qrCode.qrImageUrl
      a.download = `table-${qrCode.tableNumber}-qr.png`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
      }, 100)
    } catch (error) {
      console.error('Error downloading QR code:', error)
    }
  }

  // Filtered QR codes
  const filteredQRs = qrCodes.filter(qr => 
    !searchFilter || qr.tableNumber.toString().includes(searchFilter)
  )

  const isAtLimit = qrCodes.length >= effectiveLimit

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28">
      {/* 🌟 Master Sticky Command Header 🌟 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            
            {/* Left Title & Status Beacon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-linear-to-tr from-indigo-600 via-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    QR Fleet Command
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Signatures
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate sm:whitespace-normal">
                  Cryptographically secured QR codes & print-ready standees for your dining tables.
                </p>
              </div>
            </div>

            {/* Right Action Hub (Clean, Responsive & Minimal) */}
            <div className="flex items-center gap-2 sm:gap-2.5 self-start md:self-center flex-wrap sm:flex-nowrap">
              
              {/* Plan Fleet Counter Pill */}
              <div className="h-9 sm:h-10 px-3 rounded-xl bg-slate-100/90 border border-slate-200/90 flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Table className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] sm:text-xs font-black text-slate-900">
                  {qrCodes.length} <span className="text-slate-400 font-medium">/ {effectiveLimit >= 9999 ? '∞' : effectiveLimit}</span>
                </span>
              </div>

              {/* Add / Change Tables Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className="h-9 sm:h-10 px-3 rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-bold text-[11px] sm:text-xs text-slate-700 shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
              >
                {showConfigDrawer ? (
                  <>
                    <X className="w-3.5 h-3.5 text-slate-500" />
                    <span>Close</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Add / Change Tables</span>
                  </>
                )}
              </Button>

              {/* 🌟 HERO ACTION: Print Standee Studio */}
              <Button 
                onClick={() => { setSelectedStudioQR(null); setIsStudioOpen(true); }}
                disabled={qrCodes.length === 0}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-black hover:to-indigo-900 text-amber-400 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md shadow-slate-900/15 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 border border-amber-400/20 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Standee Studio</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">

        {/* 🌟 3 Compact Professional Stat Cards 🌟 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Card 1: Active Fleet & Capacity Progress */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Dining Fleet</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900 leading-tight">{qrCodes.length}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      / {effectiveLimit >= 9999 ? '∞' : `${effectiveLimit} max`}
                    </span>
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Slim Capacity Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-slate-400">
                <span>Capacity Utilized</span>
                <span className="text-indigo-600 font-black">
                  {effectiveLimit >= 9999 ? 'Unlimited' : `${Math.round((qrCodes.length / effectiveLimit) * 100)}%`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, (qrCodes.length / effectiveLimit) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Security & Signature Verification */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Security</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900 leading-tight">SHA-256</span>
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Signed
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 pt-0.5">
              <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-200/60 rounded-md">✓ Anti-Spoof</span>
              <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-200/60 rounded-md">✓ Table Nonce</span>
              <span className="text-slate-400 ml-auto font-medium">Tamper-proof</span>
            </div>
          </div>

          {/* Card 3: 300 DPI Standee Studio */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between space-y-2.5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Standee Studio</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900 leading-tight">8 Themes</span>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                      300 DPI
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setSelectedStudioQR(null); setIsStudioOpen(true); }}
                className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Studio</span>
                <span>→</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center -space-x-1">
                {['#f59e0b', '#10b981', '#f43f5e', '#0ea5e9', '#a855f7', '#0f172a'].map((color, i) => (
                  <div 
                    key={i} 
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs" 
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-[9px] font-bold text-slate-400">Acrylic Tents & Blocks</span>
            </div>
          </div>
        </div>

        {/* ⚙️ Expandable Fleet Configurator Panel (if toggled or empty) */}
        {(showConfigDrawer || qrCodes.length === 0) && (
          <div className="p-5 sm:p-7 bg-linear-to-br from-white to-indigo-50/40 rounded-2xl sm:rounded-3xl border border-indigo-200/80 shadow-lg animate-in fade-in-50 duration-200 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-indigo-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-600" />
                  <span>Configure Table Capacity</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Set the total number of dining tables for your restaurant. QR codes will be cryptographically generated and synced.
                </p>
              </div>

              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-xs px-3 py-1 self-start sm:self-auto">
                Plan Limit: {effectiveLimit >= 9999 ? 'Unlimited' : `${effectiveLimit} Tables`}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
              
              {/* Table Stepper Controller */}
              <div className="md:col-span-6 space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Total Dining Tables
                </Label>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setTableCount(prev => Math.max(1, prev - 1))}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <Input
                    type="number"
                    min="1"
                    max={effectiveLimit}
                    value={tableCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      setTableCount(Math.min(effectiveLimit, Math.max(1, val)))
                    }}
                    className="h-11 sm:h-12 text-center text-base sm:text-lg font-black rounded-xl sm:rounded-2xl bg-white border-slate-200"
                  />

                  <button
                    type="button"
                    onClick={() => setTableCount(prev => Math.min(effectiveLimit, prev + 1))}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="md:col-span-6 flex flex-col justify-end pt-1 md:pt-6">
                <Button
                  onClick={generateAllQRCodes}
                  disabled={isGenerating}
                  className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating & Signing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate & Sync {tableCount} Table Codes</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 Unified Table Fleet Section 🌟 */}
        {qrCodes.length > 0 && (
          <div className="space-y-4">
            
            {/* Filter & Quick Search Bar */}
            <div className="p-3.5 sm:p-4 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              
              {/* Search Table */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Filter table number (e.g. 5)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-9 sm:h-10 pl-9 rounded-xl sm:rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs font-bold text-slate-500">
                  Showing {filteredQRs.length} of {qrCodes.length} Tables
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedStudioQR(null); setIsStudioOpen(true); }}
                  className="text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl cursor-pointer"
                >
                  Bulk Print PDF →
                </Button>
              </div>
            </div>

            {/* 🌟 Grid of Table QR Cards (Responsive for iPad & Desktop) 🌟 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredQRs.map((qr) => (
                <div 
                  key={qr.tableNumber}
                  className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-xl transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between space-y-3.5 sm:space-y-4 relative overflow-hidden"
                >
                  {/* Top Bar: Table Pill & Signature Verification */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-900 text-amber-400 border border-slate-800 font-black text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl shadow-xs">
                        Table #{qr.tableNumber}
                      </Badge>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  </div>

                  {/* Centerpiece: QR Code on Crisp White Frame */}
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-inner">
                    <img 
                      src={qr.qrImageUrl} 
                      alt={`Table ${qr.tableNumber}`} 
                      className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* URL Text / Copy Button */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(qr)}
                      className="w-full h-8 px-2.5 sm:px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] sm:text-[11px] font-mono text-slate-600 flex items-center justify-between transition-all cursor-pointer"
                      title="Click to copy menu link"
                    >
                      <span className="truncate">table={qr.tableNumber}&sig={qr.signature?.slice(0, 8)}...</span>
                      {copiedTableId === qr.tableNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <Button 
                      onClick={() => { setSelectedStudioQR(qr); setIsStudioOpen(true); }}
                      className="h-9 sm:h-10 rounded-xl bg-slate-900 hover:bg-black text-amber-400 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Standee</span>
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={() => downloadQRCode(qr)}
                      className="h-9 sm:h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>PNG</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      {/* 🌟 UPGRADE PLAN MODAL 🌟 */}
      <UpgradePlanModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlanName={planDetails.name}
        limitType="tables"
        currentUsage={qrCodes.length}
        maxLimit={tableLimit}
        restaurantId={restaurantId}
        merchantName={restaurantProfile.name || "Restaurant Admin"}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false)
        }}
      />

      {/* 🌟 PRINT-READY QR STANDEE TEMPLATE STUDIO MODAL 🌟 */}
      <QRTemplateStudioModal
        open={isStudioOpen}
        onOpenChange={setIsStudioOpen}
        qrCodes={qrCodes}
        restaurantProfile={restaurantProfile}
        selectedSingleQR={selectedStudioQR}
      />
    </div>
  )
}
