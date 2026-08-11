import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Clock, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Plus, 
  X, 
  RefreshCw, 
  Grid, 
  Filter,
  Home,
  Edit,
  Sparkles,
  Activity,
  Search,
  Eye,
  CreditCard,
  QrCode,
  Receipt,
  Utensils,
  Check
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useOrderManagement, ORDER_STATUS } from '@/hooks/useOrderManagement'
import { 
  getTableSessions, 
  updateTableStatus as updateTableAPI, 
  getQRCodes,
  fetchOrders,
  updateOrderStatus,
  ensureValidRestaurantUUID,
  supabase 
} from '@/lib/api'

const statusConfig = {
  available: {
    label: 'Available',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bgColor: 'bg-emerald-50/40',
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    description: 'Ready for seating'
  },
  occupied: {
    label: 'Occupied',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-50/40',
    icon: <Users className="w-5 h-5 text-blue-500" />,
    description: 'Active dining session'
  },
  billing: {
    label: 'Billing',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-50/40',
    icon: <CreditCard className="w-5 h-5 text-amber-500" />,
    description: 'Reviewing check'
  },
  'needs-cleaning': {
    label: 'Cleanup',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    bgColor: 'bg-orange-50/40',
    icon: <Sparkles className="w-5 h-5 text-orange-500" />,
    description: 'Turnover in progress'
  },
  reserved: {
    label: 'Reserved',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    bgColor: 'bg-purple-50/40',
    icon: <Calendar className="w-5 h-5 text-purple-500" />,
    description: 'Upcoming booking'
  }
};

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

import UpgradePlanModal from './UpgradePlanModal'
import { getPlanDetails } from '@/utils/planLimits'

const formatCurrency = (val) => `₹${val || 0}`;

const TableSessions = ({ activeItem, setActiveItem, navigate, restaurantId, plan }) => {
  const planDetails = getPlanDetails(plan?.name)
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [tableOrder, setTableOrder] = useState(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [resolvedId, setResolvedId] = useState(null)

  // Live 1-Second Ticker for Exact Serve Duration
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Resolve Restaurant UUID
  useEffect(() => {
    async function resolve() {
      if (!restaurantId) return
      const valid = await ensureValidRestaurantUUID(restaurantId)
      setResolvedId(valid || restaurantId)
    }
    resolve()
  }, [restaurantId])

  // Fetch Floor Plan Data
  const initializeFloorPlan = useCallback(async () => {
    setLoading(true);
    try {
      const pathId = typeof window !== 'undefined' ? window.location.pathname.split('/console/')[1] : null
      const targetInput = restaurantId || pathId || 'test2@gmail.com'
      const validId = await ensureValidRestaurantUUID(targetInput)
      const targetRid = validId || targetInput

      const [cloudQRs, cloudSessions, cloudOrders] = await Promise.all([
        getQRCodes(targetRid),
        getTableSessions(targetRid),
        fetchOrders(targetRid)
      ]);

      // Check cloud QRs, then cached QRs, then session count, then default
      let activeQRs = (cloudQRs && cloudQRs.length > 0) ? cloudQRs : null;
      if (!activeQRs) {
        try {
          const cached = localStorage.getItem(`servora_qr_codes_${targetRid}`) || localStorage.getItem(`servora_qr_codes_${restaurantId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              activeQRs = parsed;
            }
          }
        } catch (e) {}
      }

      // Determine total tables count
      let highestTableNum = 10;
      if (activeQRs && activeQRs.length > 0) {
        highestTableNum = Math.max(...activeQRs.map(q => Number(q.tableNumber || q.table_number || 1)));
      } else if (cloudSessions && cloudSessions.length > 0) {
        highestTableNum = Math.max(...cloudSessions.map(s => Number(s.table_number || 1)));
      } else if (planDetails.tableLimit > 10) {
        highestTableNum = planDetails.tableLimit;
      }

      const totalCount = Math.max(highestTableNum, (activeQRs ? activeQRs.length : 10));
      const baseTables = Array.from({ length: totalCount }, (_, i) => {
        const tableNum = i + 1;
        const matchingQR = (activeQRs || []).find(q => Number(q.tableNumber || q.table_number) === tableNum);
        return {
          table_number: tableNum,
          url: matchingQR?.url || ''
        };
      });

      const mergedTables = baseTables.map(qr => {
        const session = (cloudSessions || []).find(s => String(s.table_number) === String(qr.table_number)) || {};
        const activeOrder = (cloudOrders || []).find(o => 
          String(o.table_number) === String(qr.table_number) &&
          (o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY' || o.status === 'SERVED' || o.status === 'BILL_REQUESTED')
        );

        return {
          id: qr.table_number,
          name: `Table ${qr.table_number}`,
          tableNumber: qr.table_number,
          qrUrl: qr.url || '',
          status: session.status || (activeOrder ? 'occupied' : 'available'),
          customers: session.customers || (activeOrder ? 2 : 0),
          currentOrder: activeOrder || null,
          sessionStart: session.session_start || activeOrder?.created_at || null,
          lastActivity: session.last_activity || null,
          restaurantId: targetRid,
          needsCleaning: session.status === 'needs-cleaning'
        };
      }).sort((a, b) => a.tableNumber - b.tableNumber);

      setTables(mergedTables);
    } catch (err) {
      console.error('Initialization Error:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, planDetails.tableLimit]);

  useEffect(() => {
    initializeFloorPlan();

    // 1. Cross-tab & Window Realtime Event Listeners
    const handleQRUpdated = () => {
      initializeFloorPlan();
    };

    const handleNewOrderEvent = () => {
      initializeFloorPlan();
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'servora_latest_order' || (e.key && e.key.startsWith('servora_qr_codes_'))) {
        initializeFloorPlan();
      }
    };

    window.addEventListener('qrCodesUpdated', handleQRUpdated);
    window.addEventListener('servora_new_order', handleNewOrderEvent);
    window.addEventListener('storage', handleStorageEvent);

    let floorChannel = null;
    if (resolvedId) {
      floorChannel = supabase
        .channel(`floor-plan-${resolvedId}`)
        .on('postgres_changes', {
          event: '*', 
          schema: 'public', 
          table: 'table_sessions',
          filter: `restaurant_id=eq.${resolvedId}`
        }, () => {
          initializeFloorPlan();
        })
        .on('postgres_changes', {
          event: '*', 
          schema: 'public', 
          table: 'qr_codes',
          filter: `restaurant_id=eq.${resolvedId}`
        }, () => {
          initializeFloorPlan();
        })
        .on('postgres_changes', {
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `restaurant_id=eq.${resolvedId}`
        }, () => {
          initializeFloorPlan();
        })
        .subscribe();
    }

    return () => { 
      if (floorChannel) supabase.removeChannel(floorChannel); 
      window.removeEventListener('qrCodesUpdated', handleQRUpdated);
      window.removeEventListener('servora_new_order', handleNewOrderEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [resolvedId, initializeFloorPlan]);

  // Fetch details for View Table POS Modal
  useEffect(() => {
    async function loadTablePOSDetails() {
      if (!selectedTable || !resolvedId) {
        setTableOrder(null)
        return
      }

      setLoadingOrder(true)
      try {
        const allOrders = await fetchOrders(resolvedId)
        // Find active order for this table
        const matchingOrder = allOrders.find(o => 
          String(o.table_number) === String(selectedTable.tableNumber) &&
          (o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY' || o.status === 'SERVED' || o.status === 'BILL_REQUESTED')
        )
        setTableOrder(matchingOrder || null)
      } catch (err) {
        console.error('Error fetching table order:', err)
      } finally {
        setLoadingOrder(false)
      }
    }

    loadTablePOSDetails()
  }, [selectedTable, resolvedId])

  // Compute Stats
  const stats = useMemo(() => {
    return {
      totalTables: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      billing: tables.filter(t => t.status === 'billing').length,
      needsCleaning: tables.filter(t => t.status === 'needs-cleaning').length,
      reserved: tables.filter(t => t.status === 'reserved').length
    }
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tables, searchTerm, filterStatus]);

  const handleStatusChange = async (tableNumber, newStatus) => {
    setTables(current => {
      const updated = current.map(t => String(t.tableNumber) === String(tableNumber) ? { ...t, status: newStatus } : t);
      const target = updated.find(t => String(t.tableNumber) === String(tableNumber));
      if (target) syncTableToCloud(target);
      return [...updated];
    });
  };

  const syncTableToCloud = async (table) => {
    if (!resolvedId) return;
    try {
      await updateTableAPI(resolvedId, table.tableNumber, {
        status: table.status,
        customers: table.customers || 0,
        current_order_id: table.currentOrder,
        session_start: table.sessionStart,
        last_activity: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to sync floor update:', err);
    }
  };

  const handleMarkTableAvailable = async (table) => {
    const updated = {
      ...table,
      status: 'available',
      customers: 0,
      currentOrder: null,
      sessionStart: null,
      needsCleaning: false
    };
    setTables(current => current.map(t => String(t.tableNumber) === String(table.tableNumber) ? updated : t));
    await syncTableToCloud(updated);
    if (selectedTable?.tableNumber === table.tableNumber) {
      setSelectedTable(null)
    }
  };

  const handleSettleAndClearPOS = async () => {
    if (!selectedTable) return
    try {
      if (tableOrder) {
        await updateOrderStatus(tableOrder.id, 'FINISHED')
      }
      await handleMarkTableAvailable(selectedTable)
      if (window['toast']) {
        window['toast'].success(`🎉 Table ${selectedTable.tableNumber} Settled & Cleared!`, {
          description: 'Table is now available for new guests.'
        })
      }
    } catch (e) {
      console.error('Error settling table:', e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]/50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold text-slate-600 uppercase tracking-widest text-[10px]">Loading POS Table Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">


      <div className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Executive POS Table Hub</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-none">Floor POS Management</h1>
              <p className="text-xs text-gray-500 font-medium mt-1.5 max-w-sm">Live serve time tracking, POS table billing & instant seating controls.</p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="flex items-center gap-1.5 mr-2">
                <Badge variant="outline" className="h-9 px-3 text-xs font-bold border-indigo-200 bg-indigo-50 text-indigo-800 flex items-center gap-1">
                  <span>{stats.totalTables} / {planDetails.tableLimit >= 9999 ? '∞' : planDetails.tableLimit} Tables</span>
                </Badge>

                {planDetails?.name === 'Starter' && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <span>⚡ Upgrade</span>
                  </button>
                )}
              </div>

              <Button variant="outline" size="sm" className="rounded-xl h-9 px-3 border-slate-200" onClick={initializeFloorPlan}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync POS Floor
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl h-9 px-3 font-bold" onClick={() => setActiveItem('qr-codes')}>
                <Plus className="w-4 h-4 mr-2" />
                Manage QR Codes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 pb-32 lg:pb-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-4 md:p-6">
               <div className="flex items-center justify-between mb-3">
                 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Home className="w-5 h-5"/></div>
                 <Badge variant="outline" className="text-[10px]">Capacity</Badge>
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Tables</p>
               <p className="text-xl md:text-2xl font-black text-gray-900 mt-0.5">{stats.totalTables}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-4 md:p-6">
               <div className="flex items-center justify-between mb-3">
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5"/></div>
                 <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-100">Ready</Badge>
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available</p>
               <p className="text-xl md:text-2xl font-black text-emerald-600 mt-0.5">{stats.available}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-4 md:p-6">
               <div className="flex items-center justify-between mb-3">
                 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users className="w-5 h-5"/></div>
                 <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-100">Dining</Badge>
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occupied</p>
               <p className="text-xl md:text-2xl font-black text-blue-600 mt-0.5">{stats.occupied}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-4 md:p-6">
               <div className="flex items-center justify-between mb-3">
                 <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5"/></div>
                 <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-100">Billing</Badge>
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Billing</p>
               <p className="text-xl md:text-2xl font-black text-amber-600 mt-0.5">{stats.billing}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-4 md:p-6">
               <div className="flex items-center justify-between mb-3">
                 <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5"/></div>
                 <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-100">Turnover</Badge>
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cleanup</p>
               <p className="text-xl md:text-2xl font-black text-orange-600 mt-0.5">{stats.needsCleaning}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <Input 
               placeholder="Search tables by number or name..." 
               className="pl-10 h-11 rounded-xl border-gray-200 focus-visible:ring-blue-500" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-52 h-11 rounded-xl border-gray-200">
               <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="all">All Tables</SelectItem>
               <SelectItem value="available">Available</SelectItem>
               <SelectItem value="occupied">Occupied (Dining)</SelectItem>
               <SelectItem value="billing">Billing Check</SelectItem>
               <SelectItem value="needs-cleaning">Cleanup Required</SelectItem>
               <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto h-12 p-1.5 bg-gray-100 rounded-2xl">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white font-bold">Overview</TabsTrigger>
            <TabsTrigger value="grid" className="rounded-xl data-[state=active]:bg-white font-bold">Grid View</TabsTrigger>
            <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-white font-bold">POS List View</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTables.map(table => {
                const config = statusConfig[table.status] || statusConfig.available;
                const liveServeTime = formatLiveDuration(table.sessionStart, currentTime);
                const isOccupied = table.status === 'occupied' || table.status === 'billing';
                const activeOrder = table.currentOrder;

                return (
                  <motion.div
                    key={table.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div 
                      className={`min-h-[200px] w-full bg-white rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-200 cursor-pointer ${
                        isOccupied 
                          ? 'border-2 border-rose-300 shadow-md shadow-rose-950/5 ring-4 ring-rose-500/5' 
                          : 'border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedTable(table)}
                    >
                      {/* Top Corner Subtle Status Dot */}
                      {isOccupied && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
                      )}

                      {/* Section 1: Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900 tracking-tight leading-none">Table {table.tableNumber}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">T{table.tableNumber}</span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-400 truncate mt-1">
                            {isOccupied ? (activeOrder?.customer_name || 'Dine-in Customer') : 'Available'}
                          </p>
                        </div>

                        {/* Status Badge */}
                        {isOccupied ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-2xs shrink-0">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
                            </span>
                            <span>LIVE</span>
                          </div>
                        ) : (
                          <Badge className={`${config.color} shadow-2xs border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0`}>
                            {config.label}
                          </Badge>
                        )}
                      </div>

                      {/* Section 2: Metrics Strip or Idle Box */}
                      {isOccupied ? (
                        <div className="space-y-2">
                          {/* Time & Guests Row */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-slate-100/90 text-slate-900 font-mono text-[10px] font-black px-2 py-1 rounded-xl border border-slate-200/70 flex items-center gap-1 min-w-0 truncate">
                              <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate">{liveServeTime || '0m'}</span>
                            </div>
                            <div className="bg-slate-100/90 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-xl border border-slate-200/70 flex items-center gap-1 justify-center shrink-0">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>{table.customers || 1} Guest</span>
                            </div>
                          </div>

                          {/* Order Item & Total Summary Box */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 space-y-0.5">
                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium truncate">
                              <span className="truncate">{activeOrder?.order_items?.[0] ? `${activeOrder.order_items[0].quantity}x ${activeOrder.order_items[0].name}` : 'Dine-in Order'}</span>
                              {activeOrder?.order_items?.length > 1 && <span className="text-[9px] text-slate-400">+{activeOrder.order_items.length - 1}</span>}
                            </div>
                            <div className="flex justify-between items-center font-black text-xs pt-0.5 border-t border-slate-200/50">
                              <span className="text-slate-400 text-[9px] uppercase tracking-wider">Check</span>
                              <span className="text-rose-600 font-mono">₹{activeOrder?.total || 0}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-5 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center">
                          <p className="text-xs font-bold text-slate-500">Ready for Seating</p>
                          <p className="text-[10px] text-slate-400 font-medium">Scan QR code to begin</p>
                        </div>
                      )}

                      {/* Section 3: Footer Controls */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
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
                          <Receipt className="w-3.5 h-3.5 mr-1 text-rose-400" /> {isOccupied ? 'POS CHECK' : 'VIEW POS'}
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

                        {table.status === 'needs-cleaning' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8.5 rounded-xl text-[10px] font-bold text-white px-2.5" onClick={(e) => {
                            e.stopPropagation();
                            handleMarkTableAvailable(table);
                          }}>READY</Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="grid" className="mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
               {filteredTables.map(t => {
                 const liveTime = formatLiveDuration(t.sessionStart, currentTime);
                 return (
                   <div key={t.id} className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-3 border-2 ${statusConfig[t.status].bgColor} border-slate-200/60 transition-all cursor-pointer hover:scale-105 shadow-sm`} onClick={() => setSelectedTable(t)}>
                      <span className="text-xl font-black text-gray-900">T-{t.tableNumber}</span>
                      {liveTime && (
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded-md mt-1 shadow-xs border border-blue-100">
                          {liveTime}
                        </span>
                      )}
                      <Badge className={`mt-2 text-[9px] ${statusConfig[t.status].color}`}>{t.status}</Badge>
                   </div>
                 )
               })}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-8">
             <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                         <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Table</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Guests Seated</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Served Duration</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">POS Control</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {filteredTables.map(t => {
                           const liveTime = formatLiveDuration(t.sessionStart, currentTime);
                           return (
                             <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900">{t.name}</td>
                                <td className="px-6 py-4"><Badge className={statusConfig[t.status].color}>{t.status}</Badge></td>
                                <td className="px-6 py-4 text-sm text-gray-600 font-medium">{t.customers ? `${t.customers} Guests` : '-'}</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-blue-600">{liveTime || 'Idle'}</td>
                                <td className="px-6 py-4">
                                   <Button variant="outline" size="sm" className="rounded-xl h-8 px-3 font-bold border-slate-200" onClick={() => setSelectedTable(t)}>
                                     <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-600"/> View POS Table
                                   </Button>
                                </td>
                             </tr>
                           )
                         })}
                      </tbody>
                   </table>
                </div>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 🧾 EXECUTIVE VIEW TABLE & POS CHECK MODAL */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <Card className="max-w-lg w-full border-0 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-200 bg-white">
            {/* Header */}
            <div className={`p-6 ${statusConfig[selectedTable.status].bgColor} border-b border-slate-100 flex items-center justify-between`}>
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-xl font-black text-slate-900 border border-slate-100">
                    T-{selectedTable.tableNumber}
                 </div>
                 <div>
                   <h3 className="text-lg font-black text-slate-900">Table {selectedTable.tableNumber}</h3>
                   <div className="flex items-center gap-2 mt-1">
                     <Badge className={`${statusConfig[selectedTable.status].color} rounded-lg text-[10px]`}>
                       {selectedTable.status.toUpperCase()}
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
               {/* Live Customer Minutes Count Widget */}
               <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
                       <Clock className="w-5 h-5 animate-pulse" />
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Served Duration</p>
                       <p className="text-xl font-mono font-black tracking-tight text-emerald-400">
                         {formatLiveDuration(selectedTable.sessionStart, currentTime) || 'No Active Session'}
                       </p>
                     </div>
                  </div>
                  {selectedTable.sessionStart && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                      Started: {new Date(selectedTable.sessionStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  )}
               </div>

               {/* Active Order Items Breakdown */}
               <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Utensils className="w-3.5 h-3.5 text-blue-600" /> Active POS Order Check
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

               {/* Quick POS Actions */}
               <div className="space-y-2 pt-2 border-t border-slate-100">
                  {selectedTable.status === 'occupied' && (
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 rounded-2xl font-bold text-xs tracking-wider" onClick={() => handleStatusChange(selectedTable.tableNumber, 'billing')}>
                      <CreditCard className="w-4 h-4 mr-2" /> GENERATE CHECK / MARK BILLING
                    </Button>
                  )}

                  {selectedTable.status === 'billing' && (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-2xl font-bold text-xs tracking-wider shadow-lg shadow-emerald-500/20" onClick={handleSettleAndClearPOS}>
                      <Check className="w-4 h-4 mr-2" /> SETTLE BILL & FREE TABLE
                    </Button>
                  )}

                  {selectedTable.status === 'needs-cleaning' ? (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-2xl font-bold text-xs tracking-wider" onClick={() => handleMarkTableAvailable(selectedTable)}>
                      <Sparkles className="w-4 h-4 mr-2" /> MARK TABLE READY
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full h-11 rounded-2xl font-bold text-xs border-slate-200 text-slate-700" onClick={() => handleStatusChange(selectedTable.tableNumber, 'needs-cleaning')}>
                      <Sparkles className="w-4 h-4 mr-2 text-orange-500" /> REQUEST TABLE CLEANING
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

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlanName={planDetails.name}
        limitType="tables"
        currentUsage={stats.totalTables}
        maxLimit={planDetails.tableLimit}
        restaurantId={restaurantId}
        merchantName="Restaurant Admin"
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false)
        }}
      />
    </div>
  )
}

export default TableSessions