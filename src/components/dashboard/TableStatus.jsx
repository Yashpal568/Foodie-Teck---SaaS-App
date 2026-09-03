import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Eye, 
  CreditCard, 
  Sparkles, 
  X, 
  Utensils, 
  Check,
  Activity,
  Receipt,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTableSessions } from '@/hooks/useTableSessions'
import { 
  fetchOrders, 
  updateOrderStatus, 
  updateTableStatus as updateTableAPI,
  ensureValidRestaurantUUID 
} from '@/lib/api'

const statusConfig = {
  occupied: {
    label: 'Occupied',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    bgColor: 'bg-blue-50/50 border-blue-200'
  },
  available: {
    label: 'Available',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bgColor: 'bg-emerald-50/50 border-emerald-200'
  },
  'needs-cleaning': {
    label: 'Needs Cleaning',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    bgColor: 'bg-amber-50/50 border-amber-200'
  },
  reserved: {
    label: 'Reserved',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    bgColor: 'bg-purple-50/50 border-purple-200'
  },
  billing: {
    label: 'Billing Check',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    bgColor: 'bg-purple-50/50 border-purple-200'
  }
}

/** Live Duration Formatter with Minutes & Seconds */
const formatLiveDuration = (sessionStartISO, currentTime) => {
  if (!sessionStartISO) return null;
  const start = new Date(sessionStartISO).getTime();
  const diffSec = Math.max(0, Math.floor((currentTime - start) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  }
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
};

import { formatCurrencyExact as formatCurrency } from '@/utils/formatters'

const TableStatus = ({ restaurantId = 'default' }) => {
  const { tables: rawTables, stats, refreshTables } = useTableSessions(restaurantId)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableOrder, setTableOrder] = useState(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [resolvedId, setResolvedId] = useState(null)

  // Live 1-second ticker for customer serve duration
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Resolve ID
  useEffect(() => {
    async function resolve() {
      if (!restaurantId) return
      const valid = await ensureValidRestaurantUUID(restaurantId)
      setResolvedId(valid || restaurantId)
    }
    resolve()
  }, [restaurantId])

  // Fallback to 10 default tables if 0 configured
  const displayTables = useMemo(() => {
    if (rawTables && rawTables.length > 0) return rawTables
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      table_number: i + 1,
      tableNumber: i + 1,
      status: 'available',
      customers: 0,
      session_start: null
    }))
  }, [rawTables])

  // Fetch Order for View Table POS Modal
  useEffect(() => {
    async function loadOrder() {
      if (!selectedTable || !resolvedId) {
        setTableOrder(null)
        return
      }

      const tableNum = selectedTable.table_number || selectedTable.tableNumber
      setLoadingOrder(true)
      try {
        const allOrders = await fetchOrders(resolvedId)
        const active = allOrders.find(o => 
          String(o.table_number) === String(tableNum) &&
          (o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY' || o.status === 'SERVED' || o.status === 'BILL_REQUESTED')
        )
        setTableOrder(active || null)
      } catch (err) {
        console.error('Error fetching table order on Dashboard:', err)
      } finally {
        setLoadingOrder(false)
      }
    }

    loadOrder()
  }, [selectedTable, resolvedId])

  const handleStatusChange = async (tableNumber, newStatus) => {
    if (!resolvedId) return
    
    // Optimistic UI update so the modal refreshes instantly
    setSelectedTable(prev => prev ? { ...prev, status: newStatus } : null)

    try {
      await updateTableAPI(resolvedId, tableNumber, {
        status: newStatus,
        last_activity: new Date().toISOString()
      })
      refreshTables()
    } catch (e) {
      console.error('Error changing table status:', e)
      refreshTables() // Revert on error
    }
  }

  const handleSettleTable = async () => {
    if (!selectedTable || !resolvedId) return
    const tableNum = selectedTable.table_number || selectedTable.tableNumber
    try {
      if (tableOrder) {
        await updateOrderStatus(tableOrder.id, 'FINISHED')
      }
      await updateTableAPI(resolvedId, tableNum, {
        status: 'available',
        customers: 0,
        current_order_id: null,
        session_start: null,
        last_activity: new Date().toISOString()
      })
      refreshTables()
      setSelectedTable(null)
      if (window['toast']) {
        window['toast'].success(`🎉 Table ${tableNum} Settled & Cleared!`, {
          description: 'Table is now available for new guests.'
        })
      }
    } catch (e) {
      console.error('Error settling table:', e)
    }
  }

  return (
    <div className="space-y-4">
      {/* Compact Table Stats Strip */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {['available', 'occupied', 'billing', 'needs-cleaning'].map((status) => {
          const colorMap = {
            'available': 'text-emerald-600',
            'occupied': 'text-indigo-600',
            'billing': 'text-purple-600',
            'needs-cleaning': 'text-amber-600'
          };
          return (
            <div key={status} className="bg-white border border-slate-200/80 shadow-2xs px-1.5 py-2.5 rounded-2xl flex flex-col items-center text-center hover:shadow-xs transition-all duration-200">
              <p className={`text-base sm:text-lg font-black leading-none ${colorMap[status]}`}>{stats[status] || 0}</p>
              <p className="text-[8.5px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1 text-center truncate w-full">
                {statusConfig[status].label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Table Cards Grid (Always Clean 2-Column Responsive Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5">
            {displayTables.map((table) => {
              const tableNum = table.table_number || table.tableNumber
              const statusKey = table.status || 'available'
              const status = statusConfig[statusKey] || statusConfig.available
              const sessionStart = table.session_start || table.sessionStart
              const liveServeTime = formatLiveDuration(sessionStart, currentTime)
              const isOccupied = statusKey === 'occupied' || statusKey === 'billing'
              
              return (
                <motion.div
                  key={table.id || tableNum}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                >
                  <div 
                    className={`w-full rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-300 cursor-pointer min-h-[160px] ${
                      isOccupied 
                        ? 'bg-linear-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/30 shadow-[0_8px_25px_rgb(79,70,229,0.2)] hover:shadow-[0_12px_35px_rgb(79,70,229,0.35)]' 
                        : 'bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedTable(table)}
                  >
                    {/* Section 1: Header Row */}
                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm sm:text-base font-black tracking-tight leading-none ${isOccupied ? 'text-white' : 'text-slate-900'}`}>Table {tableNum}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${isOccupied ? 'text-indigo-200 bg-indigo-500/20 border border-indigo-500/30' : 'text-indigo-600 bg-indigo-50 border border-indigo-100'}`}>T{tableNum}</span>
                        </div>
                        <p className={`text-[11px] font-semibold truncate mt-1 ${isOccupied ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {isOccupied ? 'Dine-in Customer' : 'Available'}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {isOccupied ? (
                        <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-xs shrink-0">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                          </span>
                          <span>ACTIVE</span>
                        </div>
                      ) : (
                        <Badge className={`${status.color} bg-white shadow-2xs border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0`}>
                          {status.label}
                        </Badge>
                      )}
                    </div>

                    {/* Background Ambient Glow for Occupied */}
                    {isOccupied && (
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
                    )}

                    {/* Section 2: Metrics Strip or Idle Box */}
                    {isOccupied ? (
                      <div className="space-y-2 my-2.5 relative z-10 flex-1 flex flex-col justify-center">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-white/10 backdrop-blur-md text-white font-mono text-[10.5px] font-bold px-2 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 min-w-0 overflow-hidden shadow-xs">
                            <Clock className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                            <span className="truncate">{liveServeTime || '0m'}</span>
                          </div>
                          <div className="bg-white/10 backdrop-blur-md text-white text-[10.5px] font-bold px-2 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 justify-center shrink-0 shadow-xs">
                            <Users className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                            <span className="whitespace-nowrap">{table.customers || 1} {table.customers > 1 ? 'Guests' : 'Guest'}</span>
                          </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-2 px-3 flex justify-between items-center text-xs font-bold shadow-xs">
                          <span className="text-indigo-300 text-[10px] uppercase tracking-wider">Active Check</span>
                          <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Running
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 my-2.5 flex-1 flex flex-col items-center justify-center text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                        <div className="w-7 h-7 bg-white rounded-full shadow-2xs flex items-center justify-center mb-1">
                          <Utensils className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-700">Ready for Seating</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">Scan QR code to order</p>
                      </div>
                    )}

                    {/* Section 3: Footer Controls */}
                    <div className="flex items-center gap-2 pt-1 mt-auto relative z-10">
                      <Button 
                        size="sm" 
                        className={`flex-1 ${
                          isOccupied 
                            ? 'bg-white hover:bg-slate-100 text-slate-900 font-black shadow-xs' 
                            : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold shadow-2xs'
                        } h-8 rounded-xl text-xs transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTable(table);
                        }}
                      >
                        <Receipt className={`w-3.5 h-3.5 ${isOccupied ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span>VIEW TABLE</span>
                      </Button>
                      
                      {isOccupied && (
                        <Button 
                          size="sm" 
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold h-8 w-8 p-0 rounded-xl shadow-xs shrink-0 flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTable(table);
                          }}
                          title="Quick Actions"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {table.status === 'needs-cleaning' && (
                        <Button size="sm" className="bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 h-8 rounded-xl text-[9px] font-bold text-white px-2 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer" onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(tableNum, 'available');
                        }}>MARK READY</Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

      {/* 🧾 PREMIUM VIEW TABLE & POS CHECK MODAL */}
      <Dialog open={!!selectedTable} onOpenChange={(open) => !open && setSelectedTable(null)}>
        <DialogContent className="sm:max-w-120 p-0 overflow-hidden border border-zinc-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-[32px] bg-white/60 backdrop-blur-3xl">
          <DialogTitle className="sr-only">Table Management</DialogTitle>
          <DialogDescription className="sr-only">
            Manage table session, view active orders, and perform checkout actions.
          </DialogDescription>
          {selectedTable && (
            <div className="flex flex-col h-full w-full bg-white/70">
              {/* Header */}
              <div className="p-7 pb-5 flex items-center justify-between border-b border-zinc-100/80 bg-linear-to-b from-white to-zinc-50/30">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-linear-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-[0_8px_16px_-6px_rgba(99,102,241,0.5)] flex items-center justify-center text-lg font-black text-white border border-indigo-400/30">
                      T-{selectedTable.table_number || selectedTable.tableNumber}
                   </div>
                   <div>
                     <h3 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                       Table {selectedTable.table_number || selectedTable.tableNumber}
                     </h3>
                     <div className="flex items-center gap-2 mt-1.5">
                       <Badge variant="secondary" className={`${statusConfig[selectedTable.status || 'available'].color} bg-white border shadow-sm px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-bold`}>
                         {selectedTable.status || 'available'}
                       </Badge>
                       {selectedTable.customers > 0 && (
                         <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5 bg-zinc-100/80 px-2 py-0.5 rounded-md">
                           <Users className="w-3.5 h-3.5" /> {selectedTable.customers} Guests
                         </span>
                       )}
                     </div>
                   </div>
                 </div>
              </div>

              <div className="p-7 space-y-8 max-h-[72vh] overflow-y-auto">
                 {/* Live Customer Minutes Count Widget */}
                 <div className="relative overflow-hidden rounded-[24px] bg-linear-to-br from-indigo-50 via-white to-blue-50/50 p-6 border border-indigo-100/50 shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Clock className="w-24 h-24" />
                    </div>
                    <div className="relative flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-500">
                            <Clock className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">Session Duration</p>
                            <p className="text-3xl font-black tracking-tighter text-indigo-950">
                              {formatLiveDuration(selectedTable.session_start || selectedTable.sessionStart, currentTime) || '0m 0s'}
                            </p>
                          </div>
                       </div>
                       {(selectedTable.session_start || selectedTable.sessionStart) && (
                         <div className="flex flex-col items-center relative z-10">
                           <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Seated At</p>
                           <p className="text-sm font-bold text-indigo-900 bg-white/80 px-3 py-1 rounded-xl backdrop-blur-md shadow-sm border border-white">
                             {new Date(selectedTable.session_start || selectedTable.sessionStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Active Order Items Breakdown */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[13px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-zinc-400" /> Active Order Check
                      </h4>
                      {tableOrder && (
                        <Badge className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-0 text-[10px] tracking-wider px-2.5 py-0.5 font-bold shadow-none">
                          ORDER #{tableOrder.id.slice(-6)}
                        </Badge>
                      )}
                    </div>

                    {loadingOrder ? (
                      <div className="py-12 bg-zinc-50/50 rounded-[24px] border border-dashed border-zinc-200 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                        </div>
                        <span className="text-xs font-semibold tracking-wide text-zinc-400">Syncing live orders...</span>
                      </div>
                    ) : tableOrder && tableOrder.order_items?.length > 0 ? (
                      <div className="bg-white rounded-[24px] border border-zinc-200/60 p-6 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-[24px]"></div>
                         <div className="space-y-4 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                            {tableOrder.order_items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start text-sm group">
                                 <div className="flex gap-3">
                                   <span className="font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">{item.quantity}x</span>
                                   <span className="font-semibold text-zinc-800 pt-0.5">{item.name}</span>
                                 </div>
                                 <span className="font-bold text-zinc-900 pt-0.5">{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                            ))}
                         </div>
                         
                         <div className="pt-5 mt-3 border-t border-dashed border-zinc-200 space-y-2.5 text-[13px]">
                            <div className="flex justify-between text-zinc-500 font-medium">
                               <span>Subtotal</span>
                               <span className="text-zinc-700">{formatCurrency(tableOrder.subtotal)}</span>
                            </div>
                            {tableOrder.tax > 0 && (
                              <div className="flex justify-between text-zinc-500 font-medium">
                                 <span>Tax & Fees</span>
                                 <span className="text-zinc-700">{formatCurrency(tableOrder.tax)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xl font-black tracking-tight text-zinc-900 pt-3 mt-1 border-t border-zinc-100">
                               <span>Total</span>
                               <span className="text-indigo-600">{formatCurrency(tableOrder.total)}</span>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className="py-12 bg-linear-to-b from-zinc-50/50 to-zinc-100/50 rounded-[24px] border border-dashed border-zinc-200 text-center flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                           <Receipt className="w-6 h-6 text-zinc-300" />
                         </div>
                         <p className="text-sm text-zinc-500 font-bold tracking-tight">No active orders placed yet.</p>
                         <p className="text-xs text-zinc-400 mt-1">Guests can scan the QR code to order.</p>
                      </div>
                    )}
                 </div>

                 {/* Quick POS Actions */}
                 <div className="space-y-3 pt-6">
                    {selectedTable.status === 'occupied' && (
                      <Button className="w-full bg-linear-to-r from-zinc-900 to-zinc-800 hover:from-black hover:to-zinc-900 text-white h-14 rounded-3xl font-bold text-[13px] tracking-wide shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200" onClick={() => handleStatusChange(selectedTable.table_number || selectedTable.tableNumber, 'billing')}>
                        <CreditCard className="w-4 h-4 mr-2" /> GENERATE CHECK & BILL
                      </Button>
                    )}

                    {selectedTable.status === 'billing' && (
                      <Button className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-14 rounded-3xl font-bold text-[13px] tracking-wide shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200" onClick={handleSettleTable}>
                        <Check className="w-4 h-4 mr-2" /> SETTLE BILL & FREE TABLE
                      </Button>
                    )}

                    {selectedTable.status === 'needs-cleaning' ? (
                      <Button className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-14 rounded-3xl font-bold text-[13px] tracking-wide shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200" onClick={() => handleStatusChange(selectedTable.table_number || selectedTable.tableNumber, 'available')}>
                        <Sparkles className="w-4 h-4 mr-2" /> MARK TABLE READY
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full bg-white/60 h-14 rounded-3xl font-bold text-[13px] tracking-wide border-zinc-200/80 text-zinc-600 hover:bg-indigo-50/50 hover:text-indigo-700 hover:border-indigo-200 transition-all duration-300 shadow-sm hover:shadow-[0_8px_16px_-6px_rgba(99,102,241,0.2)] hover:-translate-y-0.5 group" onClick={() => handleStatusChange(selectedTable.table_number || selectedTable.tableNumber, 'needs-cleaning')}>
                        <Sparkles className="w-4 h-4 mr-2 text-zinc-400 group-hover:text-indigo-500 transition-colors duration-300" /> REQUEST CLEANING
                      </Button>
                    )}
                 </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TableStatus
