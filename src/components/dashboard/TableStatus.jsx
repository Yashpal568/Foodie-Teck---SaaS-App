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
  Receipt
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const { tables: rawTables, stats, loading, refreshTables } = useTableSessions(restaurantId)
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
    try {
      await updateTableAPI(resolvedId, tableNumber, {
        status: newStatus,
        last_activity: new Date().toISOString()
      })
      refreshTables()
    } catch (e) {
      console.error('Error changing table status:', e)
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
      <div className="grid grid-cols-4 gap-2">
        {['available', 'occupied', 'billing', 'needs-cleaning'].map((status) => (
          <div key={status} className={`${statusConfig[status].bgColor} px-2 py-2.5 rounded-xl border flex flex-col items-center text-center`}>
            <p className="text-lg font-black text-slate-900 leading-none">{stats[status] || 0}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 leading-tight">
              {statusConfig[status].label.split(' ').map((w, i) => <span key={i} className="block">{w}</span>)}
            </p>
          </div>
        ))}
      </div>

      {/* Table Cards */}
      <div className="grid grid-cols-1 gap-3">
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
                    className={`w-full bg-white rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-200 cursor-pointer space-y-3 ${
                      isOccupied 
                        ? 'border-2 border-rose-300 shadow-sm ring-2 ring-rose-500/5' 
                        : 'border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedTable(table)}
                  >
                    {/* Top Accent Line */}
                    {isOccupied && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
                    )}

                    {/* Section 1: Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 tracking-tight leading-none whitespace-nowrap">Table {tableNum}</span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">T{tableNum}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-400 truncate mt-1">
                          {isOccupied ? 'Dine-in Customer' : 'Available'}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {isOccupied ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow-2xs shrink-0">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
                          </span>
                          <span>LIVE</span>
                        </div>
                      ) : (
                        <Badge className={`${status.color} shadow-2xs border border-emerald-200 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0`}>
                          {status.label}
                        </Badge>
                      )}
                    </div>

                    {/* Section 2: Metrics Strip or Idle Box */}
                    {isOccupied ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 text-slate-900 font-mono text-[11px] font-black px-2.5 py-1 rounded-xl border border-slate-200/70 flex items-center gap-1.5 min-w-0 truncate">
                            <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{liveServeTime || '0m'}</span>
                          </div>
                          <div className="bg-slate-50 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-200/70 flex items-center gap-1.5 justify-center shrink-0">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{table.customers || 1} Guest</span>
                          </div>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2 px-3 flex justify-between items-center font-black text-xs">
                          <span className="text-slate-400 text-[10px] uppercase tracking-wider">Active Check</span>
                          <span className="text-rose-600 font-mono font-black text-xs">Running</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3.5 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center">
                        <p className="text-xs font-bold text-slate-500">Ready for Seating</p>
                        <p className="text-[10px] text-slate-400 font-medium">Scan QR code to begin</p>
                      </div>
                    )}

                    {/* Section 3: Footer Controls */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <Button 
                        size="sm" 
                        className={`flex-1 ${
                          isOccupied 
                            ? 'bg-slate-900 hover:bg-slate-800 text-white font-black' 
                            : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold'
                        } h-8.5 rounded-xl text-xs transition-all shadow-2xs`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTable(table);
                        }}
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> {isOccupied ? 'POS CHECK' : 'VIEW POS'}
                      </Button>
                      
                      {isOccupied && (
                        <Button 
                          size="sm" 
                          className="bg-rose-500 hover:bg-rose-600 text-white font-bold h-8.5 w-8.5 p-0 rounded-xl shadow-xs shrink-0 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTable(table);
                          }}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

      {/* 🧾 DASHBOARD POS VIEW TABLE MODAL */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <Card className="max-w-lg w-full border-0 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-200 bg-white">
            {/* Modal Header */}
            <div className={`p-6 ${statusConfig[selectedTable.status || 'available'].bgColor} border-b border-slate-100 flex items-center justify-between`}>
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-xl font-black text-slate-900 border border-slate-100">
                    T-{selectedTable.table_number || selectedTable.tableNumber}
                 </div>
                 <div>
                   <h3 className="text-lg font-black text-slate-900">Table {selectedTable.table_number || selectedTable.tableNumber}</h3>
                   <div className="flex items-center gap-2 mt-1">
                     <Badge className={`${statusConfig[selectedTable.status || 'available'].color} rounded-lg text-[10px]`}>
                       {(selectedTable.status || 'available').toUpperCase()}
                     </Badge>
                     {selectedTable.customers > 0 && (
                       <span className="text-xs font-bold text-slate-600">• {selectedTable.customers} Guests</span>
                     )}
                   </div>
                 </div>
               </div>
               <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-400 hover:bg-white" onClick={() => setSelectedTable(null)}>
                 <X className="w-5 h-5" />
               </Button>
            </div>

            <CardContent className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
               {/* Live Minute Counter Widget */}
               <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
                       <Clock className="w-5 h-5 animate-pulse" />
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Served Duration</p>
                       <p className="text-xl font-mono font-black tracking-tight text-emerald-400">
                         {formatLiveDuration(selectedTable.session_start || selectedTable.sessionStart, currentTime) || 'No Active Session'}
                       </p>
                     </div>
                  </div>
               </div>

               {/* Active Order Breakdown */}
               <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Utensils className="w-3.5 h-3.5 text-blue-600" /> Active POS Order Details
                    </h4>
                    {tableOrder && (
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                        Order #{tableOrder.id.slice(-6)}
                      </Badge>
                    )}
                  </div>

                  {loadingOrder ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400 animate-pulse">Loading active order details...</div>
                  ) : tableOrder && tableOrder.order_items?.length > 0 ? (
                    <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                       <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {tableOrder.order_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                               <div className="font-semibold text-slate-800">
                                 {item.quantity}x {item.name}
                               </div>
                               <span className="font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                       </div>
                       
                       <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-500">
                             <span>Subtotal</span>
                             <span className="font-semibold">{formatCurrency(tableOrder.subtotal)}</span>
                          </div>
                          {tableOrder.tax > 0 && (
                            <div className="flex justify-between text-slate-500">
                               <span>GST Tax</span>
                               <span className="font-semibold">{formatCurrency(tableOrder.tax)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                             <span>Total Bill</span>
                             <span className="text-blue-600">{formatCurrency(tableOrder.total)}</span>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                       <p className="text-xs text-slate-500 font-medium">No pending order active for this table session.</p>
                    </div>
                  )}
               </div>

               {/* Quick POS Controls */}
               <div className="space-y-2 pt-2 border-t border-slate-100">
                  {selectedTable.status === 'occupied' && (
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 rounded-2xl font-bold text-xs tracking-wider" onClick={() => handleStatusChange(selectedTable.table_number || selectedTable.tableNumber, 'billing')}>
                      <CreditCard className="w-4 h-4 mr-2" /> MARK BILLING CHECK
                    </Button>
                  )}

                  {selectedTable.status === 'billing' && (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-2xl font-bold text-xs tracking-wider shadow-lg shadow-emerald-500/20" onClick={handleSettleTable}>
                      <Check className="w-4 h-4 mr-2" /> SETTLE BILL & FREE TABLE
                    </Button>
                  )}

                  <Button variant="ghost" className="w-full h-10 rounded-2xl font-bold text-xs text-slate-400" onClick={() => setSelectedTable(null)}>
                     CLOSE PANEL
                  </Button>
               </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default TableStatus
