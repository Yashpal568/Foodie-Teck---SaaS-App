import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Package, 
  Loader2, 
  X, 
  Sparkles, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  History,
  Tag
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { logPriceChange as apiLogPriceChange, fetchPriceHistory, getCachedRestaurantId } from '@/lib/api'

// Record price change directly to Supabase DB
export const recordPriceChange = async (itemId, itemName, oldPrice, newPrice, restaurantId) => {
  try {
     if (restaurantId) {
        await apiLogPriceChange(restaurantId, itemId, itemName, oldPrice, newPrice)
     }
  } catch (error) {
     console.error('Error logging price change to Supabase:', error)
  }
}

export default function PriceHistory({ menuItems = [], showLabel = true }) {
  const [isOpen, setIsOpen] = useState(false)
  const [priceHistory, setPriceHistory] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const loadRealTimeHistory = async () => {
    const rid = getCachedRestaurantId()
    if (!rid) return
    
    setIsLoading(true)
    try {
      const history = await fetchPriceHistory(rid)
      setPriceHistory(history || {})
    } catch (err) {
      console.error('Failed to fetch real-time price history:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadRealTimeHistory()
    }
  }, [isOpen])

  const getOverallStats = () => {
    let totalIncreases = 0
    let totalDecreases = 0
    let totalChangesCount = 0

    Object.values(priceHistory).forEach(item => {
      if (item.changes && item.changes.length > 0) {
        totalChangesCount += item.changes.length
        item.changes.forEach(c => {
          if (c.change > 0) totalIncreases++
          else if (c.change < 0) totalDecreases++
        })
      }
    })

    const trackedItemsCount = Math.max(menuItems.length, Object.keys(priceHistory).length)
    return { totalIncreases, totalDecreases, totalItems: trackedItemsCount, totalChanges: totalChangesCount }
  }

  const stats = getOverallStats()

  // Flattened changes sorted by date descending
  const recentChanges = []
  Object.entries(priceHistory).forEach(([itemId, data]) => {
    if (data.changes && data.changes.length > 0) {
      data.changes.forEach(change => {
        recentChanges.push({
          itemId,
          itemName: data.itemName || 'Menu Item',
          ...change
        })
      })
    }
  })
  recentChanges.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="tooltip-wrapper inline-block">
          {!showLabel ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-slate-100 rounded-xl cursor-pointer">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-semibold">Price History & Intelligence</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8.5 rounded-xl bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Price History</span>
            </Button>
          )}
        </div>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-4xl! w-[92vw] max-h-[88vh] h-[82vh] p-0 overflow-hidden rounded-3xl border-slate-200/90 shadow-2xl bg-[#f8fafc] flex flex-col font-['Roboto',sans-serif]">
        
        {/* ── 1. Executive Studio Header ── */}
        <div className="bg-slate-950 text-white px-6 py-4.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white">
                  Price History & Yield Intelligence
                </DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold py-0.5 px-2">
                  Live Audit Trail
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Audit price revisions, cost fluctuations, and margin dynamics across your active menu.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-8.5 h-8.5 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── 2. Top Summary Metric Cards (4-Column Balanced Grid) ── */}
        <div className="p-6 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Items Monitored</span>
                <h3 className="text-2xl font-black text-slate-950 mt-0.5">
                  {stats.totalItems} <span className="text-xs font-bold text-slate-500">Dishes</span>
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 shrink-0">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Price Increases</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                  +{stats.totalIncreases}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Price Decreases</span>
                <h3 className="text-2xl font-black text-rose-600 mt-0.5">
                  -{stats.totalDecreases}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Revisions</span>
                <h3 className="text-2xl font-black text-slate-950 mt-0.5">
                  {stats.totalChanges} <span className="text-xs font-bold text-slate-500">Logs</span>
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 shrink-0">
                <History className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* ── 3. Main Content: Price Log Table / Catalog Reference ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
            
            {/* Table Header Bar */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                  Price Revision Journal & Audit Log
                </h4>
              </div>
              {isLoading && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing DB...</span>
                </div>
              )}
            </div>

            {recentChanges.length > 0 ? (
              <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-slate-100/60 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <div className="col-span-4">Dish Name</div>
                  <div className="col-span-2 text-right">Previous Price</div>
                  <div className="col-span-2 text-right">New Price</div>
                  <div className="col-span-2 text-center">Price Delta</div>
                  <div className="col-span-2 text-right">Revision Date</div>
                </div>

                {recentChanges.map((change, idx) => {
                  const isUp = Number(change.change) > 0
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-slate-50/80 transition-colors text-xs">
                      <div className="col-span-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span className="truncate">{change.itemName}</span>
                      </div>
                      <div className="col-span-2 text-right font-medium text-slate-500">
                        ₹{Number(change.oldPrice).toFixed(2)}
                      </div>
                      <div className="col-span-2 text-right font-black text-slate-950">
                        ₹{Number(change.newPrice).toFixed(2)}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={`inline-flex items-center gap-0.5 text-[11px] font-black px-2 py-0.5 rounded-md ${
                          isUp 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isUp ? '+' : ''}₹{Math.abs(Number(change.change)).toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-2 text-right text-slate-500 font-semibold text-[11px]">
                        {change.date ? new Date(change.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Informative State with Current Active Menu Pricing Reference */
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="font-black text-base text-slate-900">Automated Price Tracking is Active</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Whenever you edit dish prices in the Menu Editor, Servora will automatically record price delta logs, margin shifts, and audit timestamps right here.
                  </p>
                </div>

                {menuItems.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">
                      Current Base Prices ({Math.min(5, menuItems.length)} of {menuItems.length} active dishes)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {menuItems.slice(0, 6).map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate pr-2">{item.name}</span>
                          <span className="font-black text-slate-950 shrink-0">₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── 4. Bottom Sticky Footer ── */}
        <div className="px-6 py-3 bg-white border-t border-slate-200/90 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-slate-500">
            Real-time audit log synced with Supabase Database
          </span>

          <Button
            type="button"
            onClick={() => setIsOpen(false)}
            className="h-8.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold px-5 cursor-pointer"
          >
            Close Intelligence Suite
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
