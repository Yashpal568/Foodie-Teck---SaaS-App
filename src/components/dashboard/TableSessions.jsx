import { useState, useEffect, useMemo } from 'react'
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
  QrCode
} from 'lucide-react'
import TableMobileNavbar from './TableMobileNavbar'
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
  supabase 
} from '@/lib/api'

const statusConfig = {
  available: {
    label: 'Available',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bgColor: 'bg-emerald-50/30',
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    description: 'Ready for seating'
  },
  occupied: {
    label: 'Occupied',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-50/30',
    icon: <Users className="w-5 h-5 text-blue-500" />,
    description: 'Active dining session'
  },
  billing: {
    label: 'Billing',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-50/30',
    icon: <CreditCard className="w-5 h-5 text-amber-500" />,
    description: 'Reviewing guest check'
  },
  'needs-cleaning': {
    label: 'Cleanup',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    bgColor: 'bg-orange-50/30',
    icon: <Sparkles className="w-5 h-5 text-orange-500" />,
    description: 'Turnover in progress'
  },
  reserved: {
    label: 'Reserved',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    bgColor: 'bg-purple-50/30',
    icon: <Calendar className="w-5 h-5 text-purple-500" />,
    description: 'Upcoming booking'
  }
};

const formatDuration = (isoString) => {
  if (!isoString) return '0 min';
  const start = new Date(isoString).getTime();
  const now = new Date().getTime();
  const diff = Math.floor((now - start) / 60000);
  return `${diff} min`;
};

const formatCurrency = (val) => `₹${val || 0}`;

const TableSessions = ({ activeItem, setActiveItem, navigate, restaurantId }) => {
  const { updateStatus } = useOrderManagement()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  // Compute Stats
  const stats = useMemo(() => {
    return {
      totalTables: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      needsCleaning: tables.filter(t => t.status === 'needs-cleaning').length,
      reserved: tables.filter(t => t.status === 'reserved').length
    }
  }, [tables]);

  // Combined Search and Filter
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tables, searchTerm, filterStatus]);

  const handleStatusChange = async (tableNumber, newStatus) => {
    setTables(current => {
      const updated = current.map(t => t.tableNumber === tableNumber ? { ...t, status: newStatus } : t);
      const target = updated.find(t => t.tableNumber === tableNumber);
      if (target) syncTableToCloud(target);
      return [...updated];
    });
  };

  const syncTableToCloud = async (table) => {
    if (!restaurantId) return;
    try {
      await updateTableAPI(restaurantId, table.tableNumber, {
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
    setTables(current => current.map(t => t.tableNumber === table.tableNumber ? updated : t));
    await syncTableToCloud(updated);
  };

  const handleRefreshTables = async () => {
    setLoading(true);
    try {
      const cloudSessions = await getTableSessions(restaurantId);
      setTables(current => current.map(t => {
        const session = cloudSessions.find(s => s.table_number === t.tableNumber) || {};
        return {
          ...t,
          status: session.status || 'available',
          customers: session.customers || 0,
          currentOrder: session.current_order_id || null,
          sessionStart: session.session_start || null,
          lastActivity: session.last_activity || null,
          needsCleaning: session.status === 'needs-cleaning'
        };
      }));
    } finally {
      setLoading(false);
    }
  };

  const completeAllOrders = async () => {
    if (!confirm('This will mark all tables as available and complete all active orders. Continue?')) return;
    try {
      setLoading(true);
      const updates = tables.map(t => ({
        ...t,
        status: 'available',
        customers: 0,
        currentOrder: null,
        sessionStart: null,
        needsCleaning: false
      }));
      setTables(updates);
      await Promise.all(updates.map(t => syncTableToCloud(t)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!restaurantId) return;

    const initializeFloorPlan = async () => {
      setLoading(true);
      try {
        const [cloudQRs, cloudSessions] = await Promise.all([
          getQRCodes(restaurantId),
          getTableSessions(restaurantId)
        ]);

        if (cloudQRs.length === 0) {
          setTables([]);
          return;
        }

        const mergedTables = cloudQRs.map(qr => {
          const session = cloudSessions.find(s => s.table_number === qr.table_number) || {};
          return {
            id: qr.table_number,
            name: `Table ${qr.table_number}`,
            tableNumber: qr.table_number,
            qrUrl: qr.url,
            status: session.status || 'available',
            customers: session.customers || 0,
            currentOrder: session.current_order_id || null,
            sessionStart: session.session_start || null,
            lastActivity: session.last_activity || null,
            restaurantId: restaurantId,
            needsCleaning: session.status === 'needs-cleaning'
          };
        }).sort((a, b) => a.tableNumber - b.tableNumber);

        setTables(mergedTables);
      } catch (err) {
        console.error('Initialization Error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeFloorPlan();

    const floorChannel = supabase
      .channel(`floor-plan-${restaurantId}`)
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'table_sessions',
        filter: `restaurant_id=eq.${restaurantId}`
      }, (payload) => {
        const { 
          table_number, 
          status, 
          customers, 
          current_order_id, 
          session_start, 
          last_activity 
        } = payload.new || {};

        if (!table_number) return;

        setTables(current => current.map(t => 
          t.tableNumber === table_number 
            ? { 
                ...t, 
                status: status || 'available', 
                customers: customers || 0,
                currentOrder: current_order_id || null,
                sessionStart: session_start || null,
                lastActivity: last_activity || null,
                needsCleaning: status === 'needs-cleaning'
              } 
            : t
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(floorChannel); };
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]/50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold text-slate-600 uppercase tracking-widest text-[10px]">Checking Table Sessions...</p>
        </div>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <TableMobileNavbar 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
          onRefresh={handleRefreshTables}
          onAddTable={() => setActiveItem('qr-codes')}
        />
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-6">
          <div className="w-24 h-24 bg-blue-100/50 rounded-full flex items-center justify-center animate-pulse">
            <QrCode className="w-12 h-12 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Floor Plan is Empty</h2>
            <p className="text-slate-500 max-w-sm mx-auto font-medium">To start using the Table Hub, you first need to generate and sync your QR codes for your tables.</p>
          </div>
          <Button 
            className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-bold transition-all hover:scale-105 active:scale-110"
            onClick={() => setActiveItem('qr-codes')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            GO TO QR STUDIO
          </Button>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Ready & Enterprise Aligned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <TableMobileNavbar 
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        navigate={navigate}
        onRefresh={handleRefreshTables}
        onAddTable={() => setActiveItem('qr-codes')}
      />

      <div className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Floor Management</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-none">Table Hub</h1>
              <p className="text-xs text-gray-500 font-medium mt-1.5 max-w-sm">Manage table sessions, availability and seating in real-time.</p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button variant="outline" size="sm" className="rounded-xl h-9 px-3" onClick={completeAllOrders}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete All
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl h-9 px-3" onClick={handleRefreshTables}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Cloud
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl h-9 px-3" onClick={() => setActiveItem('qr-codes')}>
                <Plus className="w-4 h-4 mr-2" />
                Manage QR
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 pb-32 lg:pb-8">
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
                 <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-100">Live</Badge>
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occupied</p>
               <p className="text-xl md:text-2xl font-black text-blue-600 mt-0.5">{stats.occupied}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-4 md:p-6">
               <div className="flex items-center justify-between mb-3">
                 <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5"/></div>
                 <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-100">Cleanup</Badge>
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cleaning</p>
               <p className="text-xl md:text-2xl font-black text-orange-600 mt-0.5">{stats.needsCleaning}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-4 md:p-6">
               <div className="flex items-center justify-between mb-3">
                 <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Calendar className="w-5 h-5"/></div>
                 <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-100">Booked</Badge>
               </div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reserved</p>
               <p className="text-xl md:text-2xl font-black text-purple-600 mt-0.5">{stats.reserved}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <Input 
               placeholder="Search tables..." 
               className="pl-10 h-11 rounded-xl border-gray-100" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48 h-11 rounded-xl border-gray-100">
               <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="all">All Status</SelectItem>
               <SelectItem value="available">Available</SelectItem>
               <SelectItem value="occupied">Occupied</SelectItem>
               <SelectItem value="billing">Billing</SelectItem>
               <SelectItem value="needs-cleaning">Cleanup</SelectItem>
               <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto h-12 p-1.5 bg-gray-100 rounded-2xl">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white">Overview</TabsTrigger>
            <TabsTrigger value="grid" className="rounded-xl data-[state=active]:bg-white">Grid</TabsTrigger>
            <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-white">List</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.map(table => {
                const config = statusConfig[table.status] || statusConfig.available;
                return (
                  <Card key={table.id} className={`group border-2 ${config.bgColor} border-transparent hover:border-blue-200 transition-all rounded-2xl cursor-pointer`} onClick={() => setSelectedTable(table)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm ring-1 ring-gray-100">{config.icon}</div>
                        <Badge className={`${config.color} border shadow-none px-2 rounded-lg text-[10px]`}>{config.label}</Badge>
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{table.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100/50 space-y-2">
                         {table.customers > 0 && (
                           <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                             <Users className="w-3.5 h-3.5" /> <span>{table.customers} guests</span>
                           </div>
                         )}
                         {table.sessionStart && (
                           <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                             <Clock className="w-3.5 h-3.5" /> <span>{formatDuration(table.sessionStart)}</span>
                           </div>
                         )}
                      </div>

                      <div className="mt-4">
                        <Progress value={table.status === 'occupied' ? 100 : 0} className="h-1.5 bg-white/50" />
                      </div>

                      <div className="mt-4 flex gap-2">
                        {table.status === 'needs-cleaning' && (
                          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 rounded-lg text-[10px] font-bold" onClick={(e) => {
                            e.stopPropagation();
                            handleMarkTableAvailable(table);
                          }}>MARK READY</Button>
                        )}
                        {table.status === 'billing' && (
                          <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 h-8 rounded-lg text-[10px] font-bold" onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(table.tableNumber, 'needs-cleaning');
                          }}>MARK CLEANING</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="grid" className="mt-8">
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
               {filteredTables.map(t => (
                 <div key={t.id} className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 border-2 ${statusConfig[t.status].bgColor} transition-all cursor-pointer hover:scale-105`} onClick={() => setSelectedTable(t)}>
                    <span className="text-lg font-black text-gray-900">{t.tableNumber}</span>
                    <div className={`w-2 h-2 rounded-full mt-2 ${statusConfig[t.status].color.split(' ')[0]}`} />
                 </div>
               ))}
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
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Guests</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Time</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {filteredTables.map(t => (
                           <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-gray-900">{t.name}</td>
                              <td className="px-6 py-4"><Badge className={statusConfig[t.status].color}>{t.status}</Badge></td>
                              <td className="px-6 py-4 text-sm text-gray-600 font-medium">{t.customers || '-'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{t.sessionStart ? formatDuration(t.sessionStart) : '-'}</td>
                              <td className="px-6 py-4">
                                 <Button variant="ghost" size="sm" onClick={() => setSelectedTable(t)}><Eye className="w-4 h-4 text-gray-400"/></Button>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedTable && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <Card className="max-w-md w-full border-0 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`h-24 ${statusConfig[selectedTable.status].bgColor} flex items-center justify-center`}>
               <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl font-black text-gray-900">
                  {selectedTable.tableNumber}
               </div>
            </div>
            <CardContent className="p-6 space-y-6">
               <div className="text-center space-y-1">
                 <h3 className="text-xl font-black text-gray-900">Table {selectedTable.tableNumber}</h3>
                 <Badge className={`${statusConfig[selectedTable.status].color} rounded-lg`}>{selectedTable.status.toUpperCase()}</Badge>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Guests</p>
                     <p className="font-bold text-gray-900">{selectedTable.customers || 0} People</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Session</p>
                     <p className="font-bold text-gray-900">{selectedTable.sessionStart ? formatDuration(selectedTable.sessionStart) : 'No Active Session'}</p>
                  </div>
               </div>

               <div className="space-y-3">
                  {selectedTable.status === 'needs-cleaning' ? (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-2xl font-bold text-xs tracking-widest" onClick={() => handleMarkTableAvailable(selectedTable)}>
                      MARK AS READY
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full h-12 rounded-2xl font-bold text-xs tracking-widest border-2" onClick={() => handleStatusChange(selectedTable.tableNumber, 'needs-cleaning')}>
                       REQUEST CLEANING
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full h-12 rounded-2xl font-bold text-xs tracking-widest text-gray-400" onClick={() => setSelectedTable(null)}>
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

export default TableSessions