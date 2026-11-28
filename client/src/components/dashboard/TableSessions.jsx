import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Check,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useOrderManagement, ORDER_STATUS } from "@/hooks/useOrderManagement";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { computeReceiptTotals } from "@/utils/receiptHelpers";
import ThermalReceiptModal from "@/components/receipt/ThermalReceiptModal";
import SplitPaymentModal from "@/components/pos/SplitPaymentModal";
import {
  getTableSessions,
  updateTableStatus as updateTableAPI,
  configureRestaurantTables,
  getQRCodes,
  fetchOrders,
  updateOrderStatus,
  ensureValidRestaurantUUID,
  supabase,
} from "@/lib/api";

const statusConfig = {
  available: {
    label: "Available",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bgColor: "bg-emerald-50/40",
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    description: "Ready for seating",
  },
  occupied: {
    label: "Occupied",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    bgColor: "bg-blue-50/40",
    icon: <Users className="w-5 h-5 text-blue-500" />,
    description: "Active dining session",
  },
  billing: {
    label: "Billing",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    bgColor: "bg-amber-50/40",
    icon: <CreditCard className="w-5 h-5 text-amber-500" />,
    description: "Reviewing check",
  },
  "needs-cleaning": {
    label: "Cleanup",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    bgColor: "bg-orange-50/40",
    icon: <Sparkles className="w-5 h-5 text-orange-500" />,
    description: "Turnover in progress",
  },
  reserved: {
    label: "Reserved",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    bgColor: "bg-purple-50/40",
    icon: <Calendar className="w-5 h-5 text-purple-500" />,
    description: "Upcoming booking",
  },
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
  return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
};

import UpgradePlanModal from "./UpgradePlanModal";
import { getPlanDetails } from "@/utils/planLimits";

import { formatCurrencyExact as formatCurrency } from "@/utils/formatters";

const TableSessions = ({
  activeItem,
  setActiveItem,
  navigate,
  restaurantId,
  plan,
}) => {
  const planDetails = getPlanDetails(plan?.name);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [tableOrder, setTableOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [resolvedId, setResolvedId] = useState(null);
  const { profile: restaurantProfile } = useRestaurantProfile(restaurantId);
  const [receiptBillingOrder, setReceiptBillingOrder] = useState(null);
  const [settlementBillingTable, setSettlementBillingTable] = useState(null);
  const [showConfigTablesModal, setShowConfigTablesModal] = useState(false);
  const [configTableCount, setConfigTableCount] = useState(8);
  const [savingTables, setSavingTables] = useState(false);

  // Live 1-Second Ticker for Exact Serve Duration
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Resolve Restaurant UUID
  useEffect(() => {
    async function resolve() {
      if (!restaurantId) return;
      const valid = await ensureValidRestaurantUUID(restaurantId);
      setResolvedId(valid || restaurantId);
    }
    resolve();
  }, [restaurantId]);

  // Fetch Floor Plan Data
  const initializeFloorPlan = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const pathId =
        typeof window !== "undefined"
          ? window.location.pathname.split("/console/")[1]
          : null;
      const targetInput = restaurantId || pathId || "demo-merchant";
      const validId = await ensureValidRestaurantUUID(targetInput);
      const targetRid = validId || targetInput;
      setResolvedId(targetRid);

      const [cloudQRs, cloudSessions, cloudOrders] = await Promise.all([
        getQRCodes(targetRid),
        getTableSessions(targetRid),
        fetchOrders(targetRid),
      ]);

      // Derive tables dynamically from restaurant's configured table_sessions, qr_codes, and active dine-in orders
      const activeQRs = cloudQRs && cloudQRs.length > 0 ? cloudQRs : [];
      const configuredTableNums = new Set();
      (cloudSessions || []).forEach((s) => {
        const n = Number(s.table_number);
        if (n > 0) configuredTableNums.add(n);
      });
      activeQRs.forEach((q) => {
        const n = Number(q.tableNumber || q.table_number);
        if (n > 0) configuredTableNums.add(n);
      });
      (cloudOrders || []).forEach((o) => {
        const isActive =
          o.status === "PENDING" ||
          o.status === "PREPARING" ||
          o.status === "READY" ||
          o.status === "SERVED" ||
          o.status === "BILL_REQUESTED";
        const n = Number(String(o.table_number || "").replace(/\D/g, ""));
        if (isActive && n > 0) configuredTableNums.add(n);
      });

      const activeStatuses = ['PENDING', 'ORDERED', 'PREPARING', 'READY', 'SERVED', 'BILL_REQUESTED']
      const extraOrderTables = (cloudOrders || [])
        .filter((o) => activeStatuses.includes(String(o.status || '').toUpperCase()))
        .map((o) => parseInt(String(o.table_number || o.tableNumber || '').replace(/\D/g, ''), 10))
        .filter((n) => Number.isInteger(n) && n > 0)
      extraOrderTables.forEach((n) => configuredTableNums.add(n))

      const sortedTableNums = Array.from(configuredTableNums).sort(
        (a, b) => a - b,
      );
      if (sortedTableNums.length > 0) {
        setConfigTableCount(sortedTableNums.length);
      }

      const baseTables = sortedTableNums.map((tableNum) => {
        const matchingQR = activeQRs.find(
          (q) => Number(q.tableNumber || q.table_number) === tableNum,
        );
        return {
          table_number: tableNum,
          url: matchingQR?.url || "",
        };
      });

      const mergedTables = baseTables
        .map((qr) => {
          const session =
            (cloudSessions || []).find(
              (s) => Number(s.table_number) === Number(qr.table_number),
            ) || {};
          const matchingOrders = (cloudOrders || []).filter(
            (o) =>
              parseInt(String(o.table_number || o.tableNumber || '').replace(/\D/g, ''), 10) === Number(qr.table_number) &&
              activeStatuses.includes(String(o.status || '').toUpperCase()),
          );
          const primaryOrder = matchingOrders[0] || null;
          const consolidatedOrder =
            matchingOrders.length > 1
              ? {
                  ...primaryOrder,
                  order_items: matchingOrders.flatMap(
                    (o) => o.order_items || o.items || [],
                  ),
                  items: matchingOrders.flatMap(
                    (o) => o.order_items || o.items || [],
                  ),
                  subtotal: matchingOrders.reduce(
                    (sum, o) => sum + Number(o.subtotal || o.total || 0),
                    0,
                  ),
                  tax: matchingOrders.reduce(
                    (sum, o) => sum + Number(o.tax || 0),
                    0,
                  ),
                  total: matchingOrders.reduce(
                    (sum, o) => sum + Number(o.total || o.total_amount || 0),
                    0,
                  ),
                  consolidatedCount: matchingOrders.length,
                }
              : primaryOrder;

          const hasBillRequest = matchingOrders.some(
            (o) => String(o.status || '').toUpperCase() === 'BILL_REQUESTED',
          );
          const derivedStatus = consolidatedOrder
            ? hasBillRequest
              ? 'billing'
              : session.status === 'billing'
                ? 'billing'
                : 'occupied'
            : session.status || 'available';

          return {
            id: qr.table_number,
            name: `Table ${qr.table_number}`,
            tableNumber: qr.table_number,
            qrUrl: qr.url || "",
            status: derivedStatus,
            customers: session.customers || (consolidatedOrder ? (consolidatedOrder.guests || 1) : 0),
            currentOrder: consolidatedOrder || null,
            sessionStart:
              session.session_start || consolidatedOrder?.created_at || consolidatedOrder?.createdAt || null,
            lastActivity: session.last_activity || null,
            restaurantId: targetRid,
            needsCleaning: derivedStatus === "needs-cleaning",
          };
        })
        .sort((a, b) => a.tableNumber - b.tableNumber);

      setTables(mergedTables);
    } catch (err) {
      console.error("Initialization Error:", err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    initializeFloorPlan(true);

    // 1. Cross-tab & Window Realtime Event Listeners
    const handleQRUpdated = () => {
      initializeFloorPlan(false);
    };

    const handleNewOrderEvent = () => {
      initializeFloorPlan(false);
    };

    const handleStorageEvent = (e) => {
      if (
        e.key === "servora_latest_order" ||
        e.key === "servora_demo_table_sessions_v1" ||
        (e.key && e.key.startsWith("servora_qr_codes_"))
      ) {
        initializeFloorPlan(false);
      }
    };

    window.addEventListener("qrCodesUpdated", handleQRUpdated);
    window.addEventListener("tableSessionsUpdated", handleQRUpdated);
    window.addEventListener("servora_new_order", handleNewOrderEvent);
    window.addEventListener("newOrderCreated", handleNewOrderEvent);
    window.addEventListener("orderStatusUpdated", handleNewOrderEvent);
    window.addEventListener("storage", handleStorageEvent);

    let floorChannel = null;
    const isUuid =
      resolvedId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        resolvedId,
      );
    if (isUuid) {
      floorChannel = supabase
        .channel(`floor-plan-${resolvedId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "table_sessions",
            filter: `restaurant_id=eq.${resolvedId}`,
          },
          () => {
            initializeFloorPlan();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "qr_codes",
            filter: `restaurant_id=eq.${resolvedId}`,
          },
          () => {
            initializeFloorPlan();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${resolvedId}`,
          },
          () => {
            initializeFloorPlan();
          },
        )
        .subscribe();
    }

    return () => {
      if (floorChannel) supabase.removeChannel(floorChannel);
      window.removeEventListener("qrCodesUpdated", handleQRUpdated);
      window.removeEventListener("tableSessionsUpdated", handleQRUpdated);
      window.removeEventListener("servora_new_order", handleNewOrderEvent);
      window.removeEventListener("newOrderCreated", handleNewOrderEvent);
      window.removeEventListener("orderStatusUpdated", handleNewOrderEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [resolvedId, initializeFloorPlan]);

  // Fetch details for View Table POS Modal
  useEffect(() => {
    async function loadTablePOSDetails() {
      if (!selectedTable || !resolvedId) {
        setTableOrder(null);
        return;
      }

      setLoadingOrder(true);
      try {
        const allOrders = await fetchOrders(resolvedId);
        // Find active order for this table
        const matchingOrder = allOrders.find(
          (o) =>
            String(o.table_number) === String(selectedTable.tableNumber) &&
            (o.status === "PENDING" ||
              o.status === "PREPARING" ||
              o.status === "READY" ||
              o.status === "SERVED" ||
              o.status === "BILL_REQUESTED"),
        );
        setTableOrder(matchingOrder || null);
      } catch (err) {
        console.error("Error fetching table order:", err);
      } finally {
        setLoadingOrder(false);
      }
    }

    loadTablePOSDetails();
  }, [selectedTable, resolvedId]);

  // Compute Stats
  const stats = useMemo(() => {
    return {
      totalTables: tables.length,
      available: tables.filter((t) => t.status === "available").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      billing: tables.filter((t) => t.status === "billing").length,
      needsCleaning: tables.filter((t) => t.status === "needs-cleaning").length,
      reserved: tables.filter((t) => t.status === "reserved").length,
    };
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesSearch = t.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || t.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tables, searchTerm, filterStatus]);

  const handleStatusChange = async (tableNumber, newStatus) => {
    const existing = tables.find(
      (t) => String(t.tableNumber) === String(tableNumber),
    );
    if (!existing) return;

    if (newStatus === "available") {
      await handleMarkTableAvailable(existing);
      return;
    }

    const updatedTarget = {
      ...existing,
      status: newStatus,
      needsCleaning: newStatus === "needs-cleaning",
    };

    setTables((current) =>
      current.map((t) =>
        String(t.tableNumber) === String(tableNumber) ? updatedTarget : t,
      ),
    );

    if (
      selectedTable &&
      String(selectedTable.tableNumber) === String(tableNumber)
    ) {
      setSelectedTable((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              needsCleaning: newStatus === "needs-cleaning",
            }
          : null,
      );
    }

    await syncTableToCloud(updatedTarget);
  };

  const handleConfigureTables = async () => {
    const parsed = parseInt(configTableCount, 10);
    const limit = planDetails?.tableLimit || 9999;
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      toast.error("Please enter a valid number of tables (1 - 100).");
      return;
    }
    if (limit < 9999 && parsed > limit) {
      toast.error(
        `Your ${planDetails.name} allows up to ${limit} tables. Upgrade to add more.`,
      );
      setShowConfigTablesModal(false);
      setShowUpgradeModal(true);
      return;
    }
    setSavingTables(true);
    try {
      const targetRid = resolvedId || restaurantId || "demo-merchant";
      await configureRestaurantTables(targetRid, parsed);
      await initializeFloorPlan();
      setShowConfigTablesModal(false);
      toast.success(
        `Floor updated to ${parsed} ${parsed === 1 ? "table" : "tables"}. Single Universal QR stays synced!`,
      );
    } catch (err) {
      toast.error(err.message || "Failed to configure tables.");
    } finally {
      setSavingTables(false);
    }
  };

  const syncTableToCloud = async (table) => {
    if (!resolvedId || !table) return;
    const orderId =
      typeof table.currentOrder === "string"
        ? table.currentOrder
        : table.currentOrder?.id || null;
    try {
      await updateTableAPI(resolvedId, table.tableNumber, {
        status: table.status,
        customers: table.customers || 0,
        current_order_id: orderId,
        session_start: table.sessionStart || null,
        last_activity: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to sync floor update:", err);
    }
  };

  const handleMarkTableAvailable = async (table, { silent = false } = {}) => {
    if (!table) return;
    const updated = {
      ...table,
      status: "available",
      customers: 0,
      currentOrder: null,
      sessionStart: null,
      needsCleaning: false,
    };

    // 1. Immediately update local UI state
    setTables((current) =>
      current.map((t) =>
        String(t.tableNumber) === String(table.tableNumber) ? updated : t,
      ),
    );

    // 2. Close the modal for the cleared table so it cannot loop back into "Request Cleaning"
    if (String(selectedTable?.tableNumber) === String(table.tableNumber)) {
      setSelectedTable(null);
    }

    // 3. Advance ALL active orders on this table cleanly to FINISHED so re-fetch doesn't override back to 'occupied'
    try {
      const targetRid = resolvedId || restaurantId || "demo-merchant";
      const allOrders = await fetchOrders(targetRid).catch(() => []);
      const activeStatuses = new Set([
        "PENDING",
        "ORDERED",
        "PREPARING",
        "READY",
        "SERVED",
        "BILL_REQUESTED",
      ]);
      const targetNum = parseInt(String(table.tableNumber || "").replace(/\D/g, ""), 10);
      const matchingOrders = (allOrders || []).filter((o) => {
        const oNum = parseInt(String(o.table_number || o.tableNumber || "").replace(/\D/g, ""), 10);
        return oNum === targetNum && activeStatuses.has(String(o.status || "").toUpperCase());
      });

      // Fallback to activeOrderObj if fetchOrders missed it
      const fallbackObj =
        (String(selectedTable?.tableNumber) === String(table.tableNumber) && tableOrder) ||
        (typeof table.currentOrder === "object" ? table.currentOrder : null);
      if (fallbackObj?.id && !matchingOrders.some((o) => String(o.id) === String(fallbackObj.id))) {
        matchingOrders.push(fallbackObj);
      }

      for (const ord of matchingOrders) {
        const ordId = ord.id;
        if (!ordId) continue;
        const curStatus = String(ord.status || "").toUpperCase();
        if (curStatus === "PENDING" || curStatus === "ORDERED") {
          await updateOrderStatus(ordId, "PREPARING");
          await updateOrderStatus(ordId, "READY");
          await updateOrderStatus(ordId, "SERVED");
        } else if (curStatus === "PREPARING") {
          await updateOrderStatus(ordId, "READY");
          await updateOrderStatus(ordId, "SERVED");
        } else if (curStatus === "READY") {
          await updateOrderStatus(ordId, "SERVED");
        }
        await updateOrderStatus(ordId, "FINISHED");
      }
      setTableOrder(null);
    } catch (err) {
      console.warn("Could not finish order on table reset:", err);
    }

    // 4. Sync the cleared table session to cloud
    if (resolvedId) {
      try {
        await updateTableAPI(resolvedId, table.tableNumber, {
          status: "available",
          customers: 0,
          current_order_id: null,
          session_start: null,
          last_activity: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Failed to sync table reset to cloud:", err);
      }
    }

    if (!silent) {
      toast.success(`Table ${table.tableNumber} marked clean & available`, {
        description: "Ready for new guests.",
      });
    }
  };

  const handleSettleAndClearPOS = async () => {
    if (!selectedTable) return;
    const clearedTableNum = selectedTable.tableNumber;
    try {
      await handleMarkTableAvailable(selectedTable, { silent: true });
      toast.success(
        `🎉 Table ${clearedTableNum} Settled & Cleared!`,
        {
          description: "Table is now available for new guests.",
        },
      );
    } catch (e) {
      console.error("Error settling table:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]/50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold text-slate-600 uppercase tracking-widest text-[10px]">
            Loading POS Table Console...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-transparent">
        <div className="px-4 md:px-6 lg:px-8 pt-4 md:pt-5 pb-1">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.08)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-indigo-100/60 via-blue-50/40 to-transparent blur-2xl"
            />
            <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Floor Sync
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.18em]">
                      Executive Table Hub
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                    Table Session Management
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Live serve time tracking, POS table billing &amp; instant seating controls.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="h-9 px-3.5 rounded-xl text-xs font-bold border-indigo-200/80 bg-indigo-50/70 text-indigo-700 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>
                      {stats.totalTables} /{" "}
                      {planDetails.tableLimit >= 9999
                        ? "∞"
                        : planDetails.tableLimit}{" "}
                      Tables
                    </span>
                  </Badge>

                  {planDetails?.tableLimit < 9999 && (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <span>⚡ Renew</span>
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9 px-3.5 bg-white border-slate-200/90 text-slate-700 font-semibold shadow-xs hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
                  onClick={() => {
                    setConfigTableCount(tables.length || 8);
                    setShowConfigTablesModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Configure Tables
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9 px-3.5 bg-white border-slate-200/90 text-slate-700 font-semibold shadow-xs hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
                  onClick={initializeFloorPlan}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Sync Floor
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl h-9 px-4 font-bold shadow-sm shadow-indigo-500/20 cursor-pointer"
                  onClick={() => setActiveItem("qr-codes")}
                >
                  <QrCode className="w-4 h-4 mr-1.5" />
                  Universal QR
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:px-8 lg:py-5 space-y-5 pb-32 lg:pb-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <Card className="border border-slate-200/70 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] bg-white rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Capacity
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Tables
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5 leading-tight">
                {stats.totalTables}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200/70 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] bg-white rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                  Ready
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Available
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5 leading-tight">
                {stats.available}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200/70 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] bg-white rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                  Dining
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Occupied
              </p>
              <p className="text-2xl font-black text-blue-600 mt-0.5 leading-tight">
                {stats.occupied}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200/70 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] bg-white rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                  Billing
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Billing
              </p>
              <p className="text-2xl font-black text-amber-600 mt-0.5 leading-tight">
                {stats.billing}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200/70 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] bg-white rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600">
                  Turnover
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cleanup
              </p>
              <p className="text-2xl font-black text-rose-600 mt-0.5 leading-tight">
                {stats.needsCleaning}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Single-Row Search, View Switcher & Status Filter */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="relative w-full lg:w-80 xl:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tables by number or name..."
                className="pl-10 h-10 rounded-xl bg-white border-slate-200 shadow-xs text-sm focus-visible:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <TabsList className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/70 w-full lg:w-auto">
              <TabsTrigger
                value="overview"
                className="rounded-lg px-4 py-1.5 text-xs font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all flex-1 lg:flex-initial"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="grid"
                className="rounded-lg px-4 py-1.5 text-xs font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all flex-1 lg:flex-initial"
              >
                Grid View
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="rounded-lg px-4 py-1.5 text-xs font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all flex-1 lg:flex-initial"
              >
                POS List View
              </TabsTrigger>
            </TabsList>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-44 h-10 rounded-xl border-slate-200 bg-white shadow-xs text-xs font-semibold text-slate-700">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Tables ({stats.totalTables})
                </SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied (Dining)</SelectItem>
                <SelectItem value="billing">Billing Check</SelectItem>
                <SelectItem value="needs-cleaning">Cleanup Required</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="overview" className="mt-6">
            {!loading && tables.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                  <Grid className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  No Dining Tables Configured Yet
                </h3>
                <p className="text-sm text-slate-500 mt-1.5 mb-5 max-w-sm">
                  Create your restaurant tables here. Customers scanning your Single Universal QR will immediately pick from these live tables.
                </p>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 h-10 font-bold"
                  onClick={() => {
                    setConfigTableCount(8);
                    setShowConfigTablesModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Restaurant Tables
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredTables.map((table) => {
                const config =
                  statusConfig[table.status] || statusConfig.available;
                const liveServeTime = formatLiveDuration(
                  table.sessionStart,
                  currentTime,
                );
                const isOccupied =
                  table.status === "occupied" || table.status === "billing";
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
                      className={`min-h-40 group-[.sidebar-collapsed]:min-h-50 w-full rounded-4xl group-[.sidebar-collapsed]:rounded-[24px] p-4 group-[.sidebar-collapsed]:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 cursor-pointer ${
                        isOccupied
                          ? "bg-linear-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/30 shadow-[0_8px_30px_rgb(79,70,229,0.25)] hover:shadow-[0_12px_40px_rgb(79,70,229,0.4)]"
                          : "bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300"
                      }`}
                      onClick={() => setSelectedTable(table)}
                    >
                      {/* Section 1: Header Row */}
                      <div className="flex items-start justify-between gap-2 relative z-10">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[15px] font-black tracking-tight leading-none ${isOccupied ? "text-white" : "text-zinc-900"}`}
                            >
                              Table {table.tableNumber}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${isOccupied ? "text-indigo-200 bg-indigo-500/20 border border-indigo-500/30" : "text-indigo-500 bg-indigo-50 border border-indigo-100"}`}
                            >
                              T{table.tableNumber}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] group-[.sidebar-collapsed]:text-xs font-semibold truncate mt-0.5 group-[.sidebar-collapsed]:mt-1 ${isOccupied ? "text-indigo-200" : "text-zinc-400"}`}
                          >
                            {isOccupied
                              ? activeOrder?.customer_name || "Dine-in Customer"
                              : "Table Available"}
                          </p>
                        </div>

                        {/* Status Badge */}
                        {isOccupied ? (
                          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-2 group-[.sidebar-collapsed]:px-2.5 py-0.5 group-[.sidebar-collapsed]:py-1 rounded-full text-[9px] font-black uppercase shadow-sm shrink-0">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>ACTIVE</span>
                          </div>
                        ) : (
                          <Badge
                            className={`${config.color} bg-white shadow-sm border border-emerald-100 px-2 group-[.sidebar-collapsed]:px-2.5 py-0.5 group-[.sidebar-collapsed]:py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0`}
                          >
                            {config.label}
                          </Badge>
                        )}
                      </div>

                      {/* Background Ambient Glow for Occupied */}
                      {isOccupied && (
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
                      )}

                      {/* Section 2: Metrics Strip or Idle Box */}
                      {isOccupied ? (
                        <div className="space-y-1.5 group-[.sidebar-collapsed]:space-y-2 mt-2.5 group-[.sidebar-collapsed]:mt-4 relative z-10 flex-1 flex flex-col justify-center">
                          {/* Time & Guests Row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/10 backdrop-blur-md text-white font-mono text-[11px] font-bold px-2 group-[.sidebar-collapsed]:px-2.5 py-1 group-[.sidebar-collapsed]:py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 min-w-0 truncate shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                              <span className="truncate pt-0.5">
                                {liveServeTime || "0m"}
                              </span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md text-white text-[11px] font-bold px-2 group-[.sidebar-collapsed]:px-2.5 py-1 group-[.sidebar-collapsed]:py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 justify-center shrink-0 shadow-sm">
                              <Users className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                              <span className="pt-0.5">
                                {table.customers || 1} Guest
                              </span>
                            </div>
                          </div>

                          {/* Order Item & Total Summary Box */}
                          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl group-[.sidebar-collapsed]:rounded-3xl p-2.5 group-[.sidebar-collapsed]:p-3 space-y-1 group-[.sidebar-collapsed]:space-y-1.5 shadow-sm">
                            <div className="flex justify-between items-center text-[10px] group-[.sidebar-collapsed]:text-[11px] font-semibold truncate">
                              <span className="truncate text-white">
                                {activeOrder?.order_items?.[0]
                                  ? `${activeOrder.order_items[0].quantity}x ${activeOrder.order_items[0].name}`
                                  : "Dine-in Order"}
                              </span>
                              {activeOrder?.order_items?.length > 1 && (
                                <span className="text-[9px] group-[.sidebar-collapsed]:text-[10px] text-indigo-100 bg-indigo-500/40 px-1 group-[.sidebar-collapsed]:px-1.5 rounded-md">
                                  +{activeOrder.order_items.length - 1}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center font-black text-[12px] group-[.sidebar-collapsed]:text-[13px] pt-1 group-[.sidebar-collapsed]:pt-1.5 border-t border-dashed border-white/20">
                              <span className="text-indigo-300 text-[9px] uppercase tracking-widest">
                                Bill Total
                              </span>
                              <span className="text-white font-sans tracking-tight">
                                ₹{activeOrder?.total || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 group-[.sidebar-collapsed]:py-6 mt-2.5 group-[.sidebar-collapsed]:mt-4 flex-1 flex flex-col items-center justify-center text-center bg-zinc-50/80 rounded-2xl group-[.sidebar-collapsed]:rounded-3xl border border-dashed border-zinc-200">
                          <div className="w-7 h-7 group-[.sidebar-collapsed]:w-8 group-[.sidebar-collapsed]:h-8 bg-white rounded-full shadow-sm flex items-center justify-center mb-1.5 group-[.sidebar-collapsed]:mb-2">
                            <Utensils className="w-3.5 h-3.5 group-[.sidebar-collapsed]:w-4 group-[.sidebar-collapsed]:h-4 text-zinc-300" />
                          </div>
                          <p className="text-[11px] group-[.sidebar-collapsed]:text-[13px] font-bold text-zinc-600">
                            {table.status === "needs-cleaning"
                              ? "Cleanup in Progress"
                              : table.status === "reserved"
                                ? "Reserved Table"
                                : "Ready for Seating"}
                          </p>
                          <p className="text-[9px] group-[.sidebar-collapsed]:text-[10px] text-zinc-400 font-semibold mt-0.5">
                            {table.status === "needs-cleaning"
                              ? "Mark ready once cleaned"
                              : "Scan QR code to order"}
                          </p>
                        </div>
                      )}

                      {/* Section 3: Footer Controls */}
                      <div className="flex items-center gap-2 pt-2.5 group-[.sidebar-collapsed]:pt-4 mt-1 group-[.sidebar-collapsed]:mt-2 relative z-10">
                        <Button
                          size="sm"
                          className={`flex-1 ${
                            isOccupied
                              ? "bg-white hover:bg-indigo-50 text-indigo-950 font-black shadow-[0_4px_14px_0_rgb(255,255,255,0.25)]"
                              : "bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-bold shadow-sm"
                          } h-8 group-[.sidebar-collapsed]:h-9 rounded-xl text-xs transition-all duration-200 hover:-translate-y-0.5`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTable(table);
                          }}
                        >
                          <Receipt
                            className={`w-3.5 h-3.5 mr-1.5 ${isOccupied ? "text-indigo-600" : "text-zinc-400"}`}
                          />{" "}
                          VIEW TABLE
                        </Button>

                        {isOccupied && (
                          <Button
                            size="sm"
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold h-8 group-[.sidebar-collapsed]:h-9 w-8 group-[.sidebar-collapsed]:w-9 p-0 rounded-xl shadow-sm shrink-0 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTable(table);
                            }}
                          >
                            <CreditCard className="w-3.5 h-3.5 group-[.sidebar-collapsed]:w-4 group-[.sidebar-collapsed]:h-4" />
                          </Button>
                        )}

                        {table.status === "needs-cleaning" && (
                          <Button
                            size="sm"
                            className="bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 h-8 group-[.sidebar-collapsed]:h-9 rounded-xl text-[9px] group-[.sidebar-collapsed]:text-[10px] font-bold text-white px-2 group-[.sidebar-collapsed]:px-3 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkTableAvailable(table);
                            }}
                          >
                            MARK READY
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            )}
          </TabsContent>

          <TabsContent value="grid" className="mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {filteredTables.map((t) => {
                const liveTime = formatLiveDuration(
                  t.sessionStart,
                  currentTime,
                );
                return (
                  <div
                    key={t.id}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-3 border-2 ${statusConfig[t.status].bgColor} border-slate-200/60 transition-all cursor-pointer hover:scale-105 shadow-sm`}
                    onClick={() => setSelectedTable(t)}
                  >
                    <span className="text-xl font-black text-gray-900">
                      T-{t.tableNumber}
                    </span>
                    {liveTime && (
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded-md mt-1 shadow-xs border border-blue-100">
                        {liveTime}
                      </span>
                    )}
                    <Badge
                      className={`mt-2 text-[9px] ${statusConfig[t.status].color}`}
                    >
                      {t.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-8">
            <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
                        Table
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
                        Guests Seated
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
                        Served Duration
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
                        POS Control
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTables.map((t) => {
                      const liveTime = formatLiveDuration(
                        t.sessionStart,
                        currentTime,
                      );
                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-gray-900">
                            {t.name}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={statusConfig[t.status].color}>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                            {t.customers ? `${t.customers} Guests` : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono font-bold text-blue-600">
                            {liveTime || "Idle"}
                          </td>
                          <td className="px-6 py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl h-8 px-3 font-bold border-slate-200"
                              onClick={() => setSelectedTable(t)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-600" />{" "}
                              View POS Table
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 🧾 PREMIUM VIEW TABLE & POS CHECK MODAL */}
      <Dialog
        open={!!selectedTable}
        onOpenChange={(open) => !open && setSelectedTable(null)}
      >
        <DialogContent className="sm:max-w-120 p-0 overflow-hidden border border-zinc-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-[32px] bg-white/60 backdrop-blur-3xl">
          <DialogDescription className="sr-only">
            Manage table session, view active orders, and perform checkout
            actions.
          </DialogDescription>
          {selectedTable && (
            <div className="flex flex-col h-full w-full bg-white/70">
              {/* Header */}
              <div className="p-7 pb-5 flex items-center justify-between border-b border-zinc-100/80 bg-linear-to-b from-white to-zinc-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-linear-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-[0_8px_16px_-6px_rgba(99,102,241,0.5)] flex items-center justify-center text-lg font-black text-white border border-indigo-400/30">
                    T-{selectedTable.tableNumber}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                      Table {selectedTable.tableNumber}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        variant="secondary"
                        className={`${statusConfig[selectedTable.status].color} bg-white border shadow-sm px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-bold`}
                      >
                        {selectedTable.status}
                      </Badge>
                      {selectedTable.customers > 0 && (
                        <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5 bg-zinc-100/80 px-2 py-0.5 rounded-md">
                          <Users className="w-3.5 h-3.5" />{" "}
                          {selectedTable.customers} Guests
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">
                          Session Duration
                        </p>
                        <p className="text-3xl font-black tracking-tighter text-indigo-950">
                          {formatLiveDuration(
                            selectedTable.sessionStart,
                            currentTime,
                          ) || "0m 0s"}
                        </p>
                      </div>
                    </div>
                    {selectedTable.sessionStart && (
                      <div className="flex flex-col items-center relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">
                          Seated At
                        </p>
                        <p className="text-sm font-bold text-indigo-900 bg-white/80 px-3 py-1 rounded-xl backdrop-blur-md shadow-sm border border-white">
                          {new Date(
                            selectedTable.sessionStart,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Order Items Breakdown */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[13px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-zinc-400" /> Active
                      Order Check
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
                      <span className="text-xs font-semibold tracking-wide text-zinc-400">
                        Syncing live orders...
                      </span>
                    </div>
                  ) : tableOrder && tableOrder.order_items?.length > 0 ? (
                    <div className="bg-white rounded-[24px] border border-zinc-200/60 p-6 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-[24px]"></div>
                      <div className="space-y-4 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                        {tableOrder.order_items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-start text-sm group"
                          >
                            <div className="flex gap-3">
                              <span className="font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {item.quantity}x
                              </span>
                              <span className="font-semibold text-zinc-800 pt-0.5">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-bold text-zinc-900 pt-0.5">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-5 mt-3 border-t border-dashed border-zinc-200 space-y-2.5 text-[13px]">
                        <div className="flex justify-between text-zinc-500 font-medium">
                          <span>Subtotal</span>
                          <span className="text-zinc-700">
                            {formatCurrency(tableOrder.subtotal)}
                          </span>
                        </div>
                        {tableOrder.tax > 0 && (
                          <div className="flex justify-between text-zinc-500 font-medium">
                            <span>Tax & Fees</span>
                            <span className="text-zinc-700">
                              {formatCurrency(tableOrder.tax)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-xl font-black tracking-tight text-zinc-900 pt-3 mt-1 border-t border-zinc-100">
                          <span>Total</span>
                          <span className="text-indigo-600">
                            {formatCurrency(tableOrder.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 bg-linear-to-b from-zinc-50/50 to-zinc-100/50 rounded-[24px] border border-dashed border-zinc-200 text-center flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <Receipt className="w-6 h-6 text-zinc-300" />
                      </div>
                      <p className="text-sm text-zinc-500 font-bold tracking-tight">
                        No active orders placed yet.
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Guests can scan the QR code to order.
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick POS Actions */}
                <div className="space-y-3 pt-6">
                  {selectedTable.status === "occupied" && (
                    <Button
                      className="w-full bg-linear-to-r from-zinc-900 to-zinc-800 hover:from-black hover:to-zinc-900 text-white h-14 rounded-3xl font-bold text-[13px] tracking-wide shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                      onClick={async () => {
                        const targetTableNum = selectedTable.tableNumber;
                        const activeOrd = tableOrder;
                        await handleStatusChange(targetTableNum, "billing");
                        if (activeOrd) {
                          setSelectedTable(null);
                          setReceiptBillingOrder({
                            ...activeOrd,
                            tableNumber: targetTableNum,
                          });
                        }
                      }}
                    >
                      <CreditCard className="w-4 h-4 mr-2" /> GENERATE CHECK &
                      BILL
                    </Button>
                  )}

                  {selectedTable.status === "billing" && (
                    <div className="space-y-2.5">
                      {tableOrder && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full bg-white h-11 rounded-2xl font-bold text-xs tracking-wide border-slate-200 text-slate-800 hover:bg-slate-50 cursor-pointer"
                          onClick={() => {
                            const activeOrd = tableOrder;
                            const targetTableNum = selectedTable.tableNumber;
                            setSelectedTable(null);
                            setReceiptBillingOrder({
                              ...activeOrd,
                              tableNumber: targetTableNum,
                            });
                          }}
                        >
                          <Receipt className="w-4 h-4 mr-2 text-indigo-600" /> PRINT BILL RECEIPT
                        </Button>
                      )}
                      <Button
                        className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-14 rounded-3xl font-bold text-[13px] tracking-wide shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                        onClick={() => {
                          if (tableOrder) {
                            const targetTable = selectedTable;
                            const activeOrd = tableOrder;
                            setSelectedTable(null);
                            setSettlementBillingTable({
                              table: targetTable,
                              order: activeOrd,
                            });
                          } else {
                            handleSettleAndClearPOS();
                          }
                        }}
                      >
                        <Check className="w-4 h-4 mr-2" /> SETTLE BILL & FREE
                        TABLE
                      </Button>
                    </div>
                  )}

                  {selectedTable.status === "needs-cleaning" && (
                    <Button
                      className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-14 rounded-3xl font-bold text-[13px] tracking-wide shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                      onClick={() => handleMarkTableAvailable(selectedTable)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> MARK TABLE READY
                    </Button>
                  )}

                  {selectedTable.status !== "needs-cleaning" &&
                    selectedTable.status !== "available" &&
                    !tableOrder && (
                      <Button
                        variant="outline"
                        className="w-full bg-white/60 h-14 rounded-3xl font-bold text-[13px] tracking-wide border-zinc-200/80 text-zinc-600 hover:bg-indigo-50/50 hover:text-indigo-700 hover:border-indigo-200 transition-all duration-300 shadow-sm hover:shadow-[0_8px_16px_-6px_rgba(99,102,241,0.2)] hover:-translate-y-0.5 group"
                        onClick={() =>
                          handleStatusChange(
                            selectedTable.tableNumber,
                            "needs-cleaning",
                          )
                        }
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-zinc-400 group-hover:text-indigo-500 transition-colors duration-300" />{" "}
                        REQUEST CLEANING
                      </Button>
                    )}

                  {selectedTable.status === "available" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 px-4 py-3 text-xs font-bold text-emerald-700">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Table is clean and ready for guests</span>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full bg-white/80 h-12 rounded-3xl font-bold text-[13px] tracking-wide border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        onClick={() => setSelectedTable(null)}
                      >
                        CLOSE
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Configure Tables Modal */}
      <Dialog
        open={showConfigTablesModal}
        onOpenChange={setShowConfigTablesModal}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">
              Configure Restaurant Tables
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Set the total number of dining tables for this restaurant. Tables sync live with your Single Universal QR and Table Sessions without disturbing occupied tables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Total Dining Tables (1 - {planDetails.tableLimit >= 9999 ? 100 : planDetails.tableLimit})
              </label>
              <Input
                type="number"
                min={1}
                max={planDetails.tableLimit >= 9999 ? 100 : planDetails.tableLimit}
                value={configTableCount}
                onChange={(e) => setConfigTableCount(e.target.value)}
                className="h-11 rounded-xl font-bold text-base"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[4, 8, 12, 16, 24].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setConfigTableCount(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    Number(configTableCount) === preset
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {preset} Tables
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowConfigTablesModal(false)}
              disabled={savingTables}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
              onClick={handleConfigureTables}
              disabled={savingTables}
            >
              {savingTables ? "Syncing Floor..." : "Save & Sync Tables"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlanName={planDetails.name}
        limitType="tables"
        currentUsage={stats.totalTables}
        maxLimit={planDetails.tableLimit}
        restaurantId={restaurantId}
        merchantEmail=""
        merchantName="Restaurant Admin"
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false);
        }}
      />

      {/* Connected Thermal Receipt & Bill Print Modal */}
      <ThermalReceiptModal
        open={!!receiptBillingOrder}
        onClose={() => setReceiptBillingOrder(null)}
        order={receiptBillingOrder}
        profile={restaurantProfile}
        onProceedToSettle={
          receiptBillingOrder
            ? () => {
                const targetTable =
                  selectedTable ||
                  tables.find(
                    (t) =>
                      String(t.tableNumber) ===
                      String(receiptBillingOrder.tableNumber),
                  );
                if (targetTable) {
                  setSettlementBillingTable({
                    table: targetTable,
                    order: receiptBillingOrder,
                  });
                }
              }
            : undefined
        }
      />

      {/* Connected Payment Settlement & Table Clear Modal */}
      {settlementBillingTable && (
        <SplitPaymentModal
          isOpen={!!settlementBillingTable}
          onClose={() => setSettlementBillingTable(null)}
          restaurantId={resolvedId || restaurantId}
          restaurantProfile={restaurantProfile}
          tableNumber={settlementBillingTable.table.tableNumber}
          cartItems={
            settlementBillingTable.order?.order_items ||
            settlementBillingTable.order?.items ||
            []
          }
          calculation={(() => {
            const totals = computeReceiptTotals(
              settlementBillingTable.order,
              restaurantProfile,
            );
            return {
              pricing: {
                subtotal: totals.subtotal,
                taxes: {
                  totalTax: totals.tax,
                  cgst: totals.cgst,
                  sgst: totals.sgst,
                  rate: totals.gstRate,
                },
                grandTotal: totals.grandTotal,
                discount: { amount: Number(settlementBillingTable.order?.discount || 0) },
              },
            };
          })()}
          customerName={
            settlementBillingTable.order?.customerName ||
            settlementBillingTable.order?.customer_name ||
            `Table ${settlementBillingTable.table.tableNumber} Guest`
          }
          existingOrderId={settlementBillingTable.order?.id}
          onSuccessSettlement={async () => {
            const settledTable = settlementBillingTable.table;
            await handleMarkTableAvailable(settledTable, { silent: true });
          }}
        />
      )}
    </div>
  );
};

export default TableSessions;
