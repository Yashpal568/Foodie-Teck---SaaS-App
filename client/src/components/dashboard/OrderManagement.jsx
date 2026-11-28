import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Clock,
  ChefHat,
  CheckCircle,
  CheckCircle2,
  X,
  AlertCircle,
  RefreshCw,
  Filter,
  Users,
  User,
  DollarSign,
  TrendingUp,
  Calendar,
  Bell,
  Receipt,
  Search,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Package,
  Utensils,
  Coffee,
  Pizza,
  Printer,
  Plus,
  LayoutGrid,
  Kanban,
  List,
  Sparkles,
  Flame,
  Check,
  Eye,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Tag,
  Download,
  CalendarDays,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  History,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useOrderManagement,
  ORDER_STATUS,
  ORDER_STATUS_CONFIG,
} from "@/hooks/useOrderManagement";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { fetchMenuItems } from "@/lib/api";
import {
  computeReceiptTotals,
  getRestaurantReceiptHeader,
} from "@/utils/receiptHelpers";
import {
  getAutoAdvanceInfo,
  doesOrderBelongToTable,
} from "@/utils/orderPipelineHelpers";
import ThermalReceiptModal from "@/components/receipt/ThermalReceiptModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function AutoAdvanceCountdown({ order, autoEnabled, variant = "kanban" }) {
  const [now, setNow] = useState(() => Date.now());
  const statusUpper = String(order?.status || "").toUpperCase();
  const active =
    autoEnabled &&
    [ORDER_STATUS.PREPARING, ORDER_STATUS.READY].includes(statusUpper);

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, order?.id, statusUpper]);

  if (!active) return null;
  const autoInfo = getAutoAdvanceInfo(order, now, { autoEnabled });
  if (!autoInfo.canAutoAdvance) return null;

  if (variant === "list") {
    return (
      <span
        className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold tabular-nums ${
          statusUpper === ORDER_STATUS.PREPARING
            ? "bg-orange-50 border-orange-200 text-orange-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}
      >
        {autoInfo.formattedCountdown}
      </span>
    );
  }

  if (variant === "grid") {
    return (
      <div
        className={`flex items-center justify-between px-2 py-0.5 rounded-md border text-[9.5px] font-bold tabular-nums ${
          statusUpper === ORDER_STATUS.PREPARING
            ? "bg-orange-50 border-orange-200/70 text-orange-700"
            : "bg-emerald-50 border-emerald-200/70 text-emerald-700"
        }`}
      >
        <span>
          Auto → {autoInfo.nextStatus === ORDER_STATUS.READY ? "Ready" : "Served"}
        </span>
        <span>{autoInfo.formattedCountdown}</span>
      </div>
    );
  }

  return (
    <div
      className={`mb-2 px-2.5 py-1 rounded-lg border flex items-center justify-between text-[10px] font-bold tabular-nums ${
        statusUpper === ORDER_STATUS.PREPARING
          ? "bg-orange-50 border-orange-200/80 text-orange-700"
          : "bg-emerald-50 border-emerald-200/80 text-emerald-700"
      }`}
    >
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>
          Auto → {autoInfo.nextStatus === ORDER_STATUS.READY ? "Ready" : "Served"}
        </span>
      </span>
      <span>{autoInfo.formattedCountdown}</span>
    </div>
  );
}

export default function OrderManagement({
  restaurantId,
  activeItem,
  setActiveItem,
  navigate,
  navIntent = null,
}) {
  const {
    orders,
    orderHistory,
    loading,
    refreshOrders,
    updateStatus,
    createOrder,
  } = useOrderManagement(restaurantId);
  const { profile } = useRestaurantProfile(restaurantId);

  // Main Navigation Mode: 'kitchen' (Live KDS Queue) | 'history' (Date & Day Wise Journal)
  const [mainTab, setMainTab] = useState(navIntent?.mainTab || "kitchen");

  // View states for Live Kitchen
  const [viewMode, setViewMode] = useState("kanban"); // 'grid' | 'kanban' | 'list'
  const [statusFilter, setStatusFilter] = useState("ACTIVE"); // 'ACTIVE' | 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'BILL_REQUESTED' | 'FINISHED' | 'CANCELLED'
  const [searchQuery, setSearchQuery] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("ALL"); // 'ALL' | 'DINE_IN' | 'TAKEAWAY'
  const [sortBy, setSortBy] = useState("NEWEST"); // 'NEWEST' | 'URGENT' | 'AMOUNT_DESC'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Checklist for kitchen items (orderId-itemIndex -> boolean)
  const [checkedItems, setCheckedItems] = useState({});

  // History date filters & accordion expanded states
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState(
    navIntent?.dateFilter || "ALL",
  ); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [historyCustomDate, setHistoryCustomDate] = useState(
    navIntent?.customDate || "",
  );
  const [expandedDates, setExpandedDates] = useState({}); // dateKey -> boolean

  useEffect(() => {
    if (!navIntent) return;
    if (navIntent.mainTab) setMainTab(navIntent.mainTab);
    if (navIntent.dateFilter) setHistoryDateFilter(navIntent.dateFilter);
    if (navIntent.customDate !== undefined)
      setHistoryCustomDate(navIntent.customDate);
  }, [navIntent]);

  // Modals state
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [billingTableModal, setBillingTableModal] = useState(null); // { tableNumber, triggeredOrderId }
  const [billingPaymentMethod, setBillingPaymentMethod] = useState("UPI"); // 'UPI' | 'CASH' | 'CARD'
  const [isSettlingTableBill, setIsSettlingTableBill] = useState(false);
  const [timelineOrder, setTimelineOrder] = useState(null);
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);

  // Menu catalog for manual order punching
  const [catalogItems, setCatalogItems] = useState([]);
  const [manualTableNumber, setManualTableNumber] = useState("1");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCart, setManualCart] = useState([]);

  // Load menu items for manual punch
  useEffect(() => {
    if (restaurantId && restaurantId !== "guest") {
      fetchMenuItems(restaurantId)
        .then((items) => setCatalogItems(Array.isArray(items) ? items : []))
        .catch(() => {});
    }
  }, [restaurantId]);

  // Merge active orders and history (Deduplicated by ID)
  const allAvailableOrders = useMemo(() => {
    const map = new Map();
    orderHistory.forEach((o) => {
      if (o && o.id) map.set(o.id, o);
    });
    orders.forEach((o) => {
      if (o && o.id) map.set(o.id, o);
    });
    return Array.from(map.values());
  }, [orders, orderHistory]);

  // Filter and sort active queue orders
  const processedOrders = useMemo(() => {
    return allAvailableOrders
      .filter((order) => {
        // 1. Status Filter
        if (statusFilter === "ACTIVE") {
          if (
            [ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(
              order.status,
            )
          )
            return false;
        } else if (statusFilter !== "ALL") {
          if (order.status !== statusFilter) return false;
        }

        // 2. Order Type Filter
        if (orderTypeFilter === "DINE_IN") {
          if (order.order_type === "TAKEAWAY" || order.orderType === "takeaway")
            return false;
        } else if (orderTypeFilter === "TAKEAWAY") {
          if (order.order_type !== "TAKEAWAY" && order.orderType !== "takeaway")
            return false;
        }

        // 3. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const tableStr = String(
            order.tableNumber || order.table_number || "",
          ).toLowerCase();
          const orderIdStr = String(order.id || "").toLowerCase();
          const customerStr = String(
            order.customerName || order.customer_name || "",
          ).toLowerCase();
          const itemsStr = (order.items || [])
            .map((i) => i.name?.toLowerCase() || "")
            .join(" ");

          const matches =
            tableStr.includes(q) ||
            `table ${tableStr}`.includes(q) ||
            `t${tableStr}`.includes(q) ||
            orderIdStr.includes(q) ||
            customerStr.includes(q) ||
            itemsStr.includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(
          a.createdAt || a.created_at || a.completedAt || 0,
        ).getTime();
        const timeB = new Date(
          b.createdAt || b.created_at || b.completedAt || 0,
        ).getTime();
        const totalA = Number(a.total || a.total_amount || 0);
        const totalB = Number(b.total || b.total_amount || 0);

        if (sortBy === "URGENT") {
          const isAActive = ![
            ORDER_STATUS.FINISHED,
            ORDER_STATUS.CANCELLED,
          ].includes(a.status);
          const isBActive = ![
            ORDER_STATUS.FINISHED,
            ORDER_STATUS.CANCELLED,
          ].includes(b.status);
          if (isAActive && !isBActive) return -1;
          if (!isAActive && isBActive) return 1;
          return timeA - timeB;
        } else if (sortBy === "NEWEST") {
          return timeB - timeA;
        } else if (sortBy === "AMOUNT_DESC") {
          return totalB - totalA;
        }
        return timeB - timeA;
      });
  }, [allAvailableOrders, statusFilter, orderTypeFilter, searchQuery, sortBy]);

  // Check if an order was settled/paid in advance
  const isOrderPrepaid = useCallback((order) => {
    if (!order) return false;
    return (
      order.payment_status === "PAID" ||
      order.is_prepaid === true ||
      order.paymentStatus === "PAID" ||
      order.isPrepaid === true ||
      (typeof order.notes === "string" &&
        order.notes.includes("BILLING DONE")) ||
      (typeof order.specialInstructions === "string" &&
        order.specialInstructions.includes("BILLING DONE"))
    );
  }, []);

  // ── Date & Day-Wise Grouping for History ──
  const ordersByDate = useMemo(() => {
    const groups = {};
    const todayStr = new Date().toLocaleDateString("en-CA");
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString("en-CA");

    const sorted = [...allAvailableOrders].sort((a, b) => {
      const timeA = new Date(
        a.createdAt || a.created_at || a.completedAt || 0,
      ).getTime();
      const timeB = new Date(
        b.createdAt || b.created_at || b.completedAt || 0,
      ).getTime();
      return timeB - timeA;
    });

    sorted.forEach((order) => {
      const raw =
        order.createdAt || order.created_at || order.completedAt || order.date;
      let dateKey = "Earlier Orders";
      let dateObj = null;

      if (raw) {
        try {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            dateKey = d.toLocaleDateString("en-CA");
            dateObj = d;
          }
        } catch (e) {}
      }

      // Filter by historyDateFilter
      if (historyDateFilter === "TODAY" && dateKey !== todayStr) return;
      if (historyDateFilter === "YESTERDAY" && dateKey !== yesterdayStr) return;
      if (
        historyDateFilter === "CUSTOM" &&
        historyCustomDate &&
        dateKey !== historyCustomDate
      )
        return;
      if (historyDateFilter === "WEEK") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (dateObj && dateObj < weekAgo) return;
      }
      if (historyDateFilter === "MONTH") {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        if (dateObj && dateObj < monthAgo) return;
      }

      // Filter by historySearchQuery
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const tableStr = String(
          order.tableNumber || order.table_number || "",
        ).toLowerCase();
        const orderIdStr = String(order.id || "").toLowerCase();
        const customerStr = String(
          order.customerName || order.customer_name || "",
        ).toLowerCase();
        const itemsStr = (order.items || [])
          .map((i) => i.name?.toLowerCase() || "")
          .join(" ");
        const matches =
          tableStr.includes(q) ||
          `table ${tableStr}`.includes(q) ||
          orderIdStr.includes(q) ||
          customerStr.includes(q) ||
          itemsStr.includes(q);
        if (!matches) return;
      }

      if (!groups[dateKey]) {
        let displayTitle = dateObj
          ? dateObj.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "Historical Archive";

        let relativeLabel = "";
        if (dateKey === todayStr) relativeLabel = "Today";
        else if (dateKey === yesterdayStr) relativeLabel = "Yesterday";

        groups[dateKey] = {
          dateKey,
          displayTitle,
          relativeLabel,
          timestamp: dateObj ? dateObj.getTime() : 0,
          orders: [],
          totalRevenue: 0,
          totalItems: 0,
          completedCount: 0,
          cancelledCount: 0,
        };
      }

      const total = Number(order.total || order.total_amount || 0);
      const itemsCount = (order.items || order.order_items || []).length;

      groups[dateKey].orders.push(order);
      if (order.status !== ORDER_STATUS.CANCELLED) {
        groups[dateKey].totalRevenue += total;
      }
      groups[dateKey].totalItems += itemsCount;
      if (order.status === ORDER_STATUS.FINISHED)
        groups[dateKey].completedCount++;
      if (order.status === ORDER_STATUS.CANCELLED)
        groups[dateKey].cancelledCount++;
    });

    return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
  }, [
    allAvailableOrders,
    historyDateFilter,
    historyCustomDate,
    historySearchQuery,
  ]);

  // Total History Metrics (Accurate Precision & Real-Time Sync)
  const historyMetrics = useMemo(() => {
    let totalSales = 0;
    let totalOrders = 0;
    let todaySales = 0;
    const todayStr = new Date().toLocaleDateString("en-CA");

    ordersByDate.forEach((g) => {
      totalSales += Number(g.totalRevenue || 0);
      totalOrders += g.orders.length;
      if (g.dateKey === todayStr) {
        todaySales += Number(g.totalRevenue || 0);
      }
    });
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    return { totalSales, totalOrders, avgOrderValue, todaySales };
  }, [ordersByDate]);

  // Toggle Day Group Accordion
  const toggleDateGroup = (dateKey) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey] === undefined ? false : !prev[dateKey], // Default open if undefined
    }));
  };

  const isDateExpanded = (dateKey) => {
    return expandedDates[dateKey] !== false; // Default open
  };

  // Real-time counts
  const activeCount = useMemo(() => {
    return allAvailableOrders.filter(
      (o) =>
        ![ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(o.status),
    ).length;
  }, [allAvailableOrders]);

  const prepCount = useMemo(() => {
    return allAvailableOrders.filter((o) => o.status === ORDER_STATUS.PREPARING)
      .length;
  }, [allAvailableOrders]);

  const readyCount = useMemo(() => {
    return allAvailableOrders.filter((o) => o.status === ORDER_STATUS.READY)
      .length;
  }, [allAvailableOrders]);

  const billCount = useMemo(() => {
    return allAvailableOrders.filter(
      (o) => o.status === ORDER_STATUS.BILL_REQUESTED,
    ).length;
  }, [allAvailableOrders]);

  const completedTodayCount = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return allAvailableOrders.filter((o) => {
      if (o.status !== ORDER_STATUS.FINISHED) return false;
      const raw = o.completedAt || o.created_at || o.createdAt;
      if (!raw) return false;
      try {
        return new Date(raw).toLocaleDateString("en-CA") === today;
      } catch {
        return false;
      }
    }).length;
  }, [allAvailableOrders]);

  // Handle Order Status Transition
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateStatus(orderId, newStatus);
      const label = ORDER_STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Order status updated to "${label}"`, {
        description: `Order #${String(orderId).slice(-5).toUpperCase()}`,
      });
    } catch (e) {
      console.error("Failed to update status:", e);
      toast.error("Failed to update order status");
    }
  };

  // Open Consolidated Table Billing Studio immediately when merchant clicks "Bill"
  const handleGenerateTableBill = async (order) => {
    if (!order) return;
    const targetTable = String(order.tableNumber || order.table_number || "1");
    setBillingPaymentMethod("UPI");
    setBillingTableModal({
      tableNumber: targetTable,
      triggeredOrderId: order.id,
    });
    try {
      if (String(order.status || "").toUpperCase() === ORDER_STATUS.SERVED) {
        await updateStatus(order.id, ORDER_STATUS.BILL_REQUESTED);
      }
    } catch (e) {
      console.error("Failed to mark table bill requested:", e);
    }
  };

  const handleSettleTableBill = async (tableOrders, grandTotal = 0) => {
    if (
      !Array.isArray(tableOrders) ||
      tableOrders.length === 0 ||
      isSettlingTableBill
    )
      return;
    setIsSettlingTableBill(true);
    try {
      for (const ord of tableOrders) {
        await updateStatus(ord.id, ORDER_STATUS.FINISHED);
      }
      const tNum =
        billingTableModal?.tableNumber ||
        tableOrders[0]?.tableNumber ||
        tableOrders[0]?.table_number ||
        "1";
      toast.success(
        `Table ${tNum} settled (${billingPaymentMethod}) • ₹${Number(grandTotal || 0).toFixed(2)}`,
        {
          description: `${tableOrders.length} ${tableOrders.length === 1 ? "order" : "orders"} closed & table released.`,
        },
      );
      setBillingTableModal(null);
    } catch (e) {
      console.error("Table bill settlement error:", e);
      toast.error("Failed to settle table bill");
    } finally {
      setIsSettlingTableBill(false);
    }
  };

  // ── 5-Minute Automated Kitchen Stage Progression (PREPARING -> READY -> SERVED) ──
  // Intentionally stops at SERVED so billing NEVER auto-closes while guests remain at table.
  const [autoKitchenFlow, setAutoKitchenFlow] = useState(() => {
    try {
      const saved = window.localStorage?.getItem(
        `servora_kds_auto5m_${restaurantId || "default"}`,
      );
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  const autoTransitionInFlightRef = useRef(new Set());

  const toggleAutoKitchenFlow = () => {
    setAutoKitchenFlow((prev) => {
      const next = !prev;
      try {
        window.localStorage?.setItem(
          `servora_kds_auto5m_${restaurantId || "default"}`,
          String(next),
        );
      } catch {
        // ignore storage error
      }
      toast.info(
        next
          ? "Auto 5-minute kitchen progression enabled"
          : "Auto 5-minute kitchen progression paused",
      );
      return next;
    });
  };

  useEffect(() => {
    if (!autoKitchenFlow || mainTab !== "kitchen") return;

    const checkDueTransitions = () => {
      const now = Date.now();
      for (const order of orders) {
        const info = getAutoAdvanceInfo(order, now, {
          autoEnabled: autoKitchenFlow,
        });
        if (!info.canAutoAdvance || !info.isDue || !info.nextStatus) continue;

        const key = `${order.id}:${info.nextStatus}`;
        if (autoTransitionInFlightRef.current.has(key)) continue;
        autoTransitionInFlightRef.current.add(key);

        updateStatus(order.id, info.nextStatus)
          .then(() => {
            toast.success(
              `Table ${order.tableNumber || order.table_number || "1"} moved to "${info.nextLabel}"`,
              {
                description: `Auto 5m timer completed • Order #${String(order.id).slice(-5).toUpperCase()}`,
              },
            );
          })
          .catch(() => {})
          .finally(() => {
            autoTransitionInFlightRef.current.delete(key);
          });
      }
    };

    checkDueTransitions();
    const timer = setInterval(checkDueTransitions, 2000);
    return () => clearInterval(timer);
  }, [autoKitchenFlow, mainTab, orders, updateStatus]);

  // Handle Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrders();
      toast.success("Orders synchronized with live cloud");
    } catch (e) {
      toast.error("Failed to refresh orders");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Toggle item strike-through for chefs
  const toggleItemChecked = (orderId, itemIndex) => {
    const key = `${orderId}-${itemIndex}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Calculate elapsed time & urgency
  const getElapsedInfo = (createdAt) => {
    if (!createdAt) return { text: "Just now", urgency: "normal" };
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    if (isNaN(created)) return { text: "Just now", urgency: "normal" };

    const diffSec = Math.max(0, Math.floor((now - created) / 1000));
    const diffMins = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return { text: "Just now", urgency: "fresh" };
    if (diffMins < 10) return { text: `${diffMins}m ago`, urgency: "fresh" };
    if (diffMins < 20) return { text: `${diffMins}m ago`, urgency: "normal" };
    if (diffMins < 60) return { text: `${diffMins}m ago`, urgency: "warning" };
    if (diffHours < 24)
      return {
        text: `${diffHours}h ${diffMins % 60}m ago`,
        urgency: "delayed",
      };
    return { text: `${diffDays}d ago`, urgency: "delayed" };
  };

  // Handle Manual Order Submission
  const handleCreateManualOrder = async () => {
    if (manualCart.length === 0) {
      toast.error("Please add at least one dish to the order");
      return;
    }

    const total = manualCart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const newOrderData = {
      table_number: parseInt(manualTableNumber) || 1,
      customer_name:
        manualCustomerName.trim() || `Table ${manualTableNumber} Guest`,
      items: manualCart.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        variant: item.variant || "full",
        notes: item.notes || "",
      })),
      total: total,
      status: ORDER_STATUS.ORDERED,
      order_type: "DINE_IN",
    };

    try {
      await createOrder(newOrderData);
      toast.success(`🎉 Order created for Table ${manualTableNumber}!`);
      setShowManualOrderModal(false);
      setManualCart([]);
      setManualCustomerName("");
      refreshOrders();
    } catch (err) {
      toast.error("Failed to create order");
    }
  };

  // Add item to manual order cart
  const addItemToManualCart = (item, variant = "full") => {
    const price =
      variant === "half" && item.halfPrice ? item.halfPrice : item.price;
    const name = variant === "half" ? `${item.name} (Half)` : item.name;
    const cartId = `${item.id || item._id}-${variant}`;

    setManualCart((prev) => {
      const existing = prev.find((i) => i.cartId === cartId);
      if (existing) {
        return prev.map((i) =>
          i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        { ...item, cartId, name, price, variant, quantity: 1, notes: "" },
      ];
    });
  };

  const updateManualItemQuantity = (cartId, delta) => {
    setManualCart((prev) => {
      return prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Open Receipt Print Modal
  const handlePrintReceipt = (order) => {
    if (!order) return;
    setReceiptOrder(order);
  };

  // Export Day Orders to CSV
  const exportDayOrdersCSV = (dayGroup) => {
    const headers = [
      "Order ID",
      "Table",
      "Time",
      "Customer Name",
      "Status",
      "Items",
      "Total (INR)",
    ];
    const rows = dayGroup.orders.map((o) => [
      `"${o.id}"`,
      `"Table ${o.tableNumber || o.table_number || 1}"`,
      `"${new Date(o.createdAt || o.created_at).toLocaleTimeString()}"`,
      `"${o.customerName || o.customer_name || "Guest"}"`,
      `"${o.status}"`,
      `"${(o.items || []).map((i) => `${i.quantity}x ${i.name}`).join("; ")}"`,
      Number(o.total || 0).toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Orders_${dayGroup.dateKey}_${profile?.name || "Restaurant"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`📥 Exported orders for ${dayGroup.displayTitle}`);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-16">
        {/* ── 1. shadcn Studio Top Control Center ── */}
        <header className="bg-white/95 border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 pt-3.5 pb-3">
            {/* Row 1: Title Cluster + Primary Navigation & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left: Icon + Title + Status Badge + Subtitle */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs ring-1 ring-slate-900/10 shrink-0">
                  {mainTab === "kitchen" ? (
                    <ChefHat className="w-5 h-5" />
                  ) : (
                    <History className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-bold text-slate-950 tracking-tight truncate">
                      {mainTab === "kitchen"
                        ? "Live Kitchen & Orders"
                        : "Order History"}
                    </h1>
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50/80 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full gap-1.5 shrink-0"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Cloud Sync
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {mainTab === "kitchen"
                      ? "Real-time KOT ticket queue, prep stages & table settlement."
                      : "Complete chronological order archive and daily revenue log."}
                  </p>
                </div>
              </div>

              {/* Right: shadcn Tabs Mode Switcher + Compact Studio Actions */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                <Tabs value={mainTab} onValueChange={setMainTab}>
                  <TabsList className="h-9 bg-slate-100/90 border border-slate-200/70 p-1 rounded-xl">
                    <TabsTrigger
                      value="kitchen"
                      className="h-7 px-3 rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs cursor-pointer"
                    >
                      <ChefHat className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Live Queue</span>
                      <Badge
                        variant="secondary"
                        className="h-4.5 min-w-5 px-1.5 text-[10px] font-bold bg-slate-200/70 text-slate-800 rounded-full"
                      >
                        {activeCount}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="h-7 px-3 rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-violet-600" />
                      <span>Order History</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Separator
                  orientation="vertical"
                  className="h-5 hidden sm:block bg-slate-200"
                />

                <div className="flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleAutoKitchenFlow}
                        className={`h-8.5 px-2.5 rounded-xl border font-bold text-[11px] gap-1.5 cursor-pointer transition-all ${
                          autoKitchenFlow
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <Clock
                          className={`w-3.5 h-3.5 ${autoKitchenFlow ? "text-emerald-600 animate-pulse" : "text-slate-400"}`}
                        />
                        <span className="hidden sm:inline">Auto 5m:</span>
                        <span>{autoKitchenFlow ? "ON" : "OFF"}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Auto-advance Cooking → Ready → Served every 5 mins (stops
                      at Served until guest requests bill)
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                        aria-label="Refresh orders"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh Live Orders</TooltipContent>
                  </Tooltip>

                  <Button
                    size="sm"
                    onClick={() => setShowManualOrderModal(true)}
                    className="h-8.5 px-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create POS Order</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Row 2: Cleanly Fitted Toolbar (Zero Overflow / Zero Scroll Chevrons) */}
            {mainTab === "kitchen" ? (
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
                {/* Stage Filter Strip using shadcn Tabs */}
                <Tabs
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  className="min-w-0"
                >
                  <TabsList className="h-auto w-full xl:w-auto flex flex-wrap justify-start gap-1 bg-slate-100/80 border border-slate-200/70 p-1 rounded-xl">
                    {[
                      {
                        id: "ACTIVE",
                        label: "Active",
                        count: activeCount,
                        dot: "",
                      },
                      {
                        id: "ORDERED",
                        label: "Placed",
                        count: allAvailableOrders.filter((o) =>
                          [ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(
                            o.status,
                          ),
                        ).length,
                        dot: "bg-blue-500",
                      },
                      {
                        id: "PREPARING",
                        label: "Cooking",
                        count: prepCount,
                        dot: "bg-orange-500",
                      },
                      {
                        id: "READY",
                        label: "Ready",
                        count: readyCount,
                        dot: "bg-emerald-500",
                      },
                      {
                        id: "BILL_REQUESTED",
                        label: "Billing",
                        count: billCount,
                        dot: "bg-amber-500",
                      },
                      {
                        id: "FINISHED",
                        label: "Completed",
                        count: completedTodayCount,
                        dot: "bg-slate-400",
                      },
                      {
                        id: "ALL",
                        label: "All",
                        count: allAvailableOrders.length,
                        dot: "bg-slate-300",
                      },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold gap-1.5 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs cursor-pointer"
                      >
                        {tab.dot && (
                          <span
                            className={`size-1.5 rounded-full shrink-0 ${tab.dot}`}
                          />
                        )}
                        <span>{tab.label}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 tabular-nums">
                          {tab.count}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Right Controls: Search + Sort + View Mode */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                  <div className="relative flex-1 sm:w-52 lg:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search table, item, #ID..."
                      className="pl-8 pr-7 h-8.5 bg-slate-50/70 border-slate-200/90 rounded-xl text-xs font-medium focus-visible:ring-slate-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8.5 w-[142px] bg-white border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 text-xs font-medium shadow-lg">
                      <SelectItem
                        value="NEWEST"
                        className="cursor-pointer font-medium"
                      >
                        ⏱️ Newest First
                      </SelectItem>
                      <SelectItem
                        value="URGENT"
                        className="cursor-pointer font-medium"
                      >
                        ⚡ Oldest (Urgent)
                      </SelectItem>
                      <SelectItem
                        value="AMOUNT_DESC"
                        className="cursor-pointer font-medium"
                      >
                        💰 Highest Amount
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Tabs value={viewMode} onValueChange={setViewMode}>
                    <TabsList className="h-8.5 bg-slate-100/90 border border-slate-200/70 p-0.5 rounded-xl">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="grid"
                            className="h-7 w-7 p-0 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs cursor-pointer"
                            aria-label="Kitchen Grid View"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Kitchen Grid View</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="kanban"
                            className="h-7 w-7 p-0 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs cursor-pointer"
                            aria-label="Kanban Board View"
                          >
                            <Kanban className="w-3.5 h-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Kanban Pipeline</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="list"
                            className="h-7 w-7 p-0 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs cursor-pointer"
                            aria-label="Table List View"
                          >
                            <List className="w-3.5 h-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Compact List View</TooltipContent>
                      </Tooltip>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            ) : (
              /* Order History Toolbar */
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Tabs
                    value={historyDateFilter}
                    onValueChange={(val) => {
                      setHistoryDateFilter(val);
                      if (val !== "CUSTOM") setHistoryCustomDate("");
                    }}
                  >
                    <TabsList className="h-auto flex flex-wrap justify-start gap-1 bg-slate-100/80 border border-slate-200/70 p-1 rounded-xl">
                      {[
                        { id: "ALL", label: "All Dates" },
                        { id: "TODAY", label: "Today" },
                        { id: "YESTERDAY", label: "Yesterday" },
                        { id: "WEEK", label: "Last 7 Days" },
                        { id: "MONTH", label: "Last 30 Days" },
                      ].map((f) => (
                        <TabsTrigger
                          key={f.id}
                          value={f.id}
                          className="h-7 px-3 rounded-lg text-xs font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xs cursor-pointer"
                        >
                          {f.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>

                  {/* Custom Single-Date Calendar Filter */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all ${
                      historyDateFilter === "CUSTOM" && historyCustomDate
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-slate-50/90 border-slate-200/80 text-slate-600"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <input
                      type="date"
                      aria-label="Filter order history by specific date"
                      max={new Date().toLocaleDateString("en-CA")}
                      value={historyCustomDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHistoryCustomDate(val);
                        if (val) setHistoryDateFilter("CUSTOM");
                      }}
                      className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                    />
                    {historyCustomDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryCustomDate("");
                          setHistoryDateFilter("ALL");
                        }}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label="Clear selected date"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Filter history by table, dish, #ID..."
                    className="pl-8 pr-7 h-8.5 bg-slate-50/70 border-slate-200/90 rounded-xl text-xs font-medium focus-visible:ring-slate-400"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Clear history search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── 3. Main Content Area ── */}
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {mainTab === "history" ? (
            /* ═══════════════════════════════════════════════════════════════
             ORDER HISTORY VIEW (DATE & DAY WISE CHRONOLOGICAL JOURNAL)
             ═══════════════════════════════════════════════════════════════ */
            <div className="space-y-6">
              {/* Top Summary Metric Cards (4-Column Balanced Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Total Filtered Sales
                      </span>
                      <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                        ₹
                        {Number(historyMetrics.totalSales).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md w-fit">
                        <Receipt className="w-3 h-3" />
                        <span>
                          {historyMetrics.totalOrders} Invoices Settled
                        </span>
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Today's Live Collection
                      </span>
                      <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                        ₹
                        {Number(historyMetrics.todaySales).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Live Dining Revenue</span>
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Total Orders Logged
                      </span>
                      <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                        {historyMetrics.totalOrders}{" "}
                        <span className="text-sm font-bold text-slate-500">
                          Orders
                        </span>
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md w-fit">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span>100% Synced to DB</span>
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Avg Ticket Size (AOV)
                      </span>
                      <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                        ₹
                        {Number(historyMetrics.avgOrderValue).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md w-fit">
                        <Tag className="w-3 h-3 text-amber-600" />
                        <span>Per Table Average</span>
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-100 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Date Group Accordions */}
              {ordersByDate.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center max-w-lg mx-auto shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    No History Records Found
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try expanding your date filter or clearing your search
                    query.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ordersByDate.map((dayGroup) => {
                    const isExpanded = isDateExpanded(dayGroup.dateKey);
                    return (
                      <Card
                        key={dayGroup.dateKey}
                        className="overflow-hidden border border-slate-200/90 rounded-3xl bg-white shadow-xs"
                      >
                        {/* Day Group Header Bar */}
                        <div
                          onClick={() => toggleDateGroup(dayGroup.dateKey)}
                          className="p-4.5 bg-linear-to-r from-slate-50 via-white to-slate-50 hover:bg-slate-100/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-500/20 shrink-0">
                              <CalendarDays className="w-5 h-5" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2.5">
                                <h3 className="font-black text-sm sm:text-base text-slate-950 tracking-tight">
                                  {dayGroup.displayTitle}
                                </h3>
                                {dayGroup.relativeLabel && (
                                  <span className="inline-flex items-center gap-1 bg-indigo-100/90 text-indigo-900 border border-indigo-200 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                    {dayGroup.relativeLabel}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                {dayGroup.orders.length} orders recorded •{" "}
                                {dayGroup.totalItems} total dishes served
                              </p>
                            </div>
                          </div>

                          {/* Day Aggregate Stats & Action Tools */}
                          <div className="flex items-center gap-3.5 self-end sm:self-center">
                            <div className="text-right bg-emerald-50/80 border border-emerald-200/70 px-3.5 py-1.5 rounded-xl">
                              <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                                Day Revenue
                              </span>
                              <span className="text-base font-black text-emerald-950 tracking-tight">
                                ₹
                                {Number(dayGroup.totalRevenue).toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </span>
                            </div>

                            <div
                              className="flex items-center gap-1.5 pl-2 border-l border-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportDayOrdersCSV(dayGroup)}
                                className="h-8.5 px-3 rounded-xl border-slate-200 font-bold text-xs bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                                title="Download Day CSV Spreadsheet"
                              >
                                <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />{" "}
                                Export CSV
                              </Button>

                              <button
                                onClick={() =>
                                  toggleDateGroup(dayGroup.dateKey)
                                }
                                className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-2xs hover:bg-slate-50 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Day Orders Table / List */}
                        {isExpanded && (
                          <div className="divide-y divide-slate-100 bg-white">
                            {dayGroup.orders.map((order) => {
                              const items =
                                order.items || order.order_items || [];
                              const isPrepaidOrder = isOrderPrepaid(order);
                              const cleanCustomer =
                                String(
                                  order.customerName ||
                                    order.customer_name ||
                                    "Walk-in Guest",
                                )
                                  .replace(/\s*•\s*PAID/gi, "")
                                  .trim() || "Walk-in Guest";

                              // Detect payment method
                              let payMethod =
                                order.paymentMethod ||
                                order.payment_method ||
                                (isPrepaidOrder ? "CASH" : "");
                              if (
                                typeof order.notes === "string" &&
                                order.notes.includes("UPI")
                              )
                                payMethod = "UPI";
                              else if (
                                typeof order.notes === "string" &&
                                order.notes.includes("CARD")
                              )
                                payMethod = "CARD";

                              return (
                                <div
                                  key={order.id}
                                  className="p-4 sm:px-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
                                >
                                  {/* Order Metadata & Items */}
                                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                    {/* Table Avatar Badge */}
                                    <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white font-black text-xs flex flex-col items-center justify-center shrink-0 shadow-xs">
                                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">
                                        TBL
                                      </span>
                                      <span className="text-sm font-black leading-tight">
                                        {order.tableNumber ||
                                          order.table_number ||
                                          "1"}
                                      </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-extrabold text-xs text-slate-950">
                                          Table{" "}
                                          {order.tableNumber ||
                                            order.table_number ||
                                            "1"}
                                        </span>

                                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                          #
                                          {String(order.id)
                                            .slice(-6)
                                            .toUpperCase()}
                                        </span>

                                        <span className="text-[11px] font-bold text-slate-500">
                                          •{" "}
                                          {new Date(
                                            order.createdAt || order.created_at,
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>

                                        {/* Customer Tag */}
                                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded-md">
                                          👤 {cleanCustomer}
                                        </span>

                                        {/* Paid Status Badge */}
                                        {isPrepaidOrder ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-md shadow-xs">
                                            ✓ PAID{" "}
                                            {payMethod ? `(${payMethod})` : ""}
                                          </span>
                                        ) : (
                                          <Badge
                                            className={`${ORDER_STATUS_CONFIG[order.status]?.color} border-none text-[9px] font-bold uppercase py-0.5 px-2 rounded-md`}
                                          >
                                            {ORDER_STATUS_CONFIG[order.status]
                                              ?.label || order.status}
                                          </Badge>
                                        )}
                                      </div>

                                      {/* Items Chips */}
                                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        {items.map((item, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-50 text-slate-800 px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs"
                                          >
                                            <span className="font-black text-indigo-700 bg-indigo-50 px-1 rounded">
                                              {item.quantity}x
                                            </span>
                                            <span className="font-medium text-slate-900">
                                              {item.name}
                                            </span>
                                            {item.variant &&
                                              item.variant !== "full" && (
                                                <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200/50">
                                                  Half
                                                </span>
                                              )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Amount & Action Button */}
                                  <div className="flex items-center justify-between lg:justify-end gap-4 self-end lg:self-center w-full lg:w-auto pt-2.5 lg:pt-0 border-t lg:border-none border-slate-100 shrink-0">
                                    <div className="text-left lg:text-right">
                                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                        Total Billed
                                      </span>
                                      <span className="text-base font-black text-slate-950 tracking-tight">
                                        ₹
                                        {Number(
                                          order.total ||
                                            order.total_amount ||
                                            0,
                                        ).toFixed(2)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setReceiptOrder(order)}
                                        className="h-8.5 px-3 rounded-xl border-indigo-200 text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
                                      >
                                        <Receipt className="w-3.5 h-3.5 mr-1" />{" "}
                                        View Receipt
                                      </Button>

                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                          handlePrintReceipt(order)
                                        }
                                        className="w-8.5 h-8.5 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-2xs"
                                        title="Print Thermal Bill Receipt"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setTimelineOrder(order)}
                                        className="w-8.5 h-8.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                        title="Order Timeline"
                                      >
                                        <Calendar className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════════
             LIVE KITCHEN QUEUE VIEWS (GRID, KANBAN, POS LIST)
             ═══════════════════════════════════════════════════════════════ */
            <div>
              {loading && processedOrders.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
                  <h3 className="text-base font-bold text-slate-800">
                    Synchronizing Kitchen Tickets...
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Connecting to live dining floor
                  </p>
                </div>
              ) : processedOrders.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-sm mt-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-inner">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    No Orders In Queue
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {searchQuery
                      ? `No orders matching "${searchQuery}". Try searching for another table or item.`
                      : statusFilter === "ACTIVE"
                        ? "All kitchen tickets have been cleared! Great job, chef."
                        : `No orders found in "${statusFilter}" category.`}
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="rounded-xl font-bold text-xs"
                      >
                        Clear Search
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setShowManualOrderModal(true)}
                      className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create POS Order
                    </Button>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                /* KDS Grid View Mode - Balanced 5-Column Professional Ticket Sizing */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3">
                  <AnimatePresence>
                    {processedOrders.map((order) => {
                      const elapsed = getElapsedInfo(
                        order.createdAt || order.created_at,
                      );
                      const items = order.items || order.order_items || [];
                      const isFinished = [
                        ORDER_STATUS.FINISHED,
                        ORDER_STATUS.CANCELLED,
                      ].includes(order.status);
                      const checkedCount = items.filter(
                        (_, idx) => checkedItems[`${order.id}-${idx}`],
                      ).length;
                      const progressPct =
                        items.length > 0
                          ? Math.round((checkedCount / items.length) * 100)
                          : 0;

                      // Top status accent color
                      const statusAccentClass =
                        order.status === ORDER_STATUS.PREPARING
                          ? "border-t-3 border-t-orange-500"
                          : order.status === ORDER_STATUS.READY
                            ? "border-t-3 border-t-emerald-500"
                            : order.status === ORDER_STATUS.SERVED
                              ? "border-t-3 border-t-purple-600"
                              : order.status === ORDER_STATUS.BILL_REQUESTED
                                ? "border-t-3 border-t-amber-500"
                                : order.status === ORDER_STATUS.FINISHED
                                  ? "border-t-3 border-t-slate-300 opacity-80"
                                  : order.status === ORDER_STATUS.CANCELLED
                                    ? "border-t-3 border-t-rose-500 opacity-75"
                                    : "border-t-3 border-t-indigo-600";

                      return (
                        <motion.div
                          key={order.id}
                          layout
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.12 }}
                          className="h-full"
                        >
                          <Card
                            className={`h-full overflow-hidden border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between bg-white ${statusAccentClass}`}
                          >
                            {/* Ticket Header Banner */}
                            <div>
                              <div className="p-2 px-3 border-b border-slate-100 flex items-start justify-between gap-1.5 bg-slate-50/70">
                                {/* Table Badge & Identity */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black text-[11px] tracking-tight shadow-xs shrink-0">
                                      Table{" "}
                                      {order.tableNumber ||
                                        order.table_number ||
                                        "1"}
                                    </span>
                                    {isOrderPrepaid(order) && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[8px] uppercase tracking-wider shadow-2xs shrink-0 flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />{" "}
                                        PAID
                                      </span>
                                    )}
                                    <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                                      #
                                      {String(order.id).slice(-4).toUpperCase()}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-slate-600">
                                    <Users className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      {order.customerName ||
                                        order.customer_name ||
                                        "Guest"}
                                    </span>
                                  </div>

                                  {order.notes &&
                                    order.notes.includes("BILLING DONE") && (
                                      <div className="mt-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[8px] font-bold border border-emerald-200 truncate">
                                        ✅ {order.notes}
                                      </div>
                                    )}
                                </div>

                                {/* Status & Timer Column */}
                                <div className="flex flex-col items-end gap-0.5 shrink-0">
                                  <Badge
                                    className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.2 border-none shadow-xs rounded-md ${
                                      order.status === ORDER_STATUS.PREPARING
                                        ? "bg-orange-500 text-white"
                                        : order.status === ORDER_STATUS.READY
                                          ? "bg-emerald-500 text-white"
                                          : order.status === ORDER_STATUS.SERVED
                                            ? "bg-purple-600 text-white"
                                            : order.status ===
                                                ORDER_STATUS.BILL_REQUESTED
                                              ? "bg-amber-500 text-white"
                                              : order.status ===
                                                  ORDER_STATUS.FINISHED
                                                ? "bg-slate-200 text-slate-700"
                                                : order.status ===
                                                    ORDER_STATUS.CANCELLED
                                                  ? "bg-rose-500 text-white"
                                                  : "bg-indigo-600 text-white"
                                    }`}
                                  >
                                    {ORDER_STATUS_CONFIG[order.status]?.label ||
                                      order.status}
                                  </Badge>

                                  <div
                                    className={`flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.2 rounded-md ${
                                      elapsed.urgency === "delayed"
                                        ? "bg-rose-100 text-rose-700 font-extrabold"
                                        : elapsed.urgency === "warning"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    <Clock className="w-2 h-2" />
                                    <span>{elapsed.text}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Items Checklist (KOT Chef View) */}
                              <div className="p-2 px-3 bg-white">
                                <div className="flex items-center justify-between pb-1 mb-1 border-b border-dashed border-slate-200 text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                                  <span>KOT Items ({items.length})</span>
                                  {items.length > 0 && !isFinished && (
                                    <span className="text-indigo-600 font-extrabold">
                                      {checkedCount}/{items.length} Ready
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1 min-h-[40px] max-h-[85px] overflow-y-auto pr-0.5">
                                  {items.length === 0 ? (
                                    <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                                      No items recorded
                                    </div>
                                  ) : (
                                    items.map((item, idx) => {
                                      const isChecked =
                                        checkedItems[`${order.id}-${idx}`];
                                      return (
                                        <div
                                          key={idx}
                                          onClick={() =>
                                            !isFinished &&
                                            toggleItemChecked(order.id, idx)
                                          }
                                          className={`flex items-start gap-1.5 p-0.5 rounded transition-all select-none ${
                                            isFinished
                                              ? "opacity-80"
                                              : "cursor-pointer hover:bg-slate-50 active:scale-[0.99]"
                                          } ${isChecked ? "bg-emerald-50/60" : ""}`}
                                        >
                                          <div
                                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 font-black text-[9px] transition-colors shadow-2xs ${
                                              isChecked
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-900 text-white"
                                            }`}
                                          >
                                            {isChecked ? (
                                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            ) : (
                                              `${item.quantity || 1}x`
                                            )}
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                              <span
                                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                  item.type === "NON_VEG"
                                                    ? "bg-rose-500"
                                                    : "bg-emerald-500"
                                                }`}
                                              ></span>

                                              <h4
                                                className={`text-[11px] font-semibold text-slate-900 leading-tight truncate ${
                                                  isChecked
                                                    ? "line-through text-slate-400"
                                                    : ""
                                                }`}
                                              >
                                                {item.name}
                                              </h4>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1 mt-0.2">
                                              {item.variant &&
                                                item.variant !== "full" && (
                                                  <span className="text-[7.5px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded">
                                                    Half
                                                  </span>
                                                )}
                                              {item.notes && (
                                                <span className="text-[7.5px] font-medium text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                                                  {item.notes}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <span className="text-[11px] font-bold text-slate-700 shrink-0">
                                            ₹
                                            {Number(
                                              (item.price || 0) *
                                                (item.quantity || 1),
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Card Footer Actions (Always Anchored at Bottom) */}
                            <div className="p-2 px-3 border-t border-slate-100 bg-slate-50/70 mt-auto">
                              <div className="flex items-center justify-between mb-1.5">
                                <div>
                                  <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Grand Total
                                  </span>
                                  <span className="text-xs font-black text-slate-900 tracking-tight">
                                    ₹
                                    {Number(
                                      order.total || order.total_amount || 0,
                                    ).toFixed(2)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handlePrintReceipt(order)}
                                    className="w-6 h-6 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Print Thermal Receipt"
                                  >
                                    <Printer className="w-3 h-3" />
                                  </Button>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-6 h-6 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="min-w-[175px] rounded-xl shadow-xl border border-slate-200/90 bg-white p-1 text-xs font-semibold z-50"
                                    >
                                      <DropdownMenuItem
                                        onClick={() => handlePrintReceipt(order)}
                                        className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 whitespace-nowrap"
                                      >
                                        <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                        <span>View Bill Receipt</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setTimelineOrder(order)}
                                        className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 whitespace-nowrap"
                                      >
                                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <span>Order Timeline</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                      {!isFinished && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleStatusUpdate(
                                              order.id,
                                              ORDER_STATUS.CANCELLED,
                                            )
                                          }
                                          className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-rose-600 hover:bg-rose-50/70 focus:text-rose-700 whitespace-nowrap"
                                        >
                                          <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                          <span>Cancel Order</span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {/* Primary Stage Transition Button */}
                              <div>
                                {[
                                  ORDER_STATUS.ORDERED,
                                  ORDER_STATUS.PENDING,
                                ].includes(order.status) && (
                                  <Button
                                    onClick={() =>
                                      handleStatusUpdate(
                                        order.id,
                                        ORDER_STATUS.PREPARING,
                                      )
                                    }
                                    className="w-full h-7 rounded-lg bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-[10.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <ChefHat className="w-3 h-3" />
                                    <span>Start Preparing</span>
                                  </Button>
                                )}

                                {order.status === ORDER_STATUS.PREPARING && (
                                  <div className="space-y-1">
                                    <AutoAdvanceCountdown
                                      order={order}
                                      autoEnabled={autoKitchenFlow}
                                      variant="grid"
                                    />
                                    <Button
                                      onClick={() =>
                                        handleStatusUpdate(
                                          order.id,
                                          ORDER_STATUS.READY,
                                        )
                                      }
                                      className="w-full h-7 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-[10.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      <span>Mark Ready</span>
                                    </Button>
                                  </div>
                                )}

                                {order.status === ORDER_STATUS.READY && (
                                  <div className="space-y-1">
                                    {!isOrderPrepaid(order) && (
                                      <AutoAdvanceCountdown
                                        order={order}
                                        autoEnabled={autoKitchenFlow}
                                        variant="grid"
                                      />
                                    )}
                                    <Button
                                      onClick={() =>
                                        handleStatusUpdate(
                                          order.id,
                                          isOrderPrepaid(order)
                                            ? ORDER_STATUS.FINISHED
                                            : ORDER_STATUS.SERVED,
                                        )
                                      }
                                      className={`w-full h-7 rounded-lg bg-linear-to-r ${isOrderPrepaid(order) ? "from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800" : "from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"} text-white font-bold text-[10.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1`}
                                    >
                                      {isOrderPrepaid(order) ? (
                                        <CheckCircle className="w-3 h-3" />
                                      ) : (
                                        <Utensils className="w-3 h-3" />
                                      )}
                                      <span>
                                        {isOrderPrepaid(order)
                                          ? "Serve & Handover (Paid ✅)"
                                          : "Serve to Table"}
                                      </span>
                                    </Button>
                                  </div>
                                )}

                                {(order.status === ORDER_STATUS.SERVED ||
                                  order.status ===
                                    ORDER_STATUS.BILL_REQUESTED) &&
                                  (isOrderPrepaid(order) ? (
                                    <Button
                                      onClick={() =>
                                        handleStatusUpdate(
                                          order.id,
                                          ORDER_STATUS.FINISHED,
                                        )
                                      }
                                      className="w-full min-w-0 h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] uppercase tracking-wide shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                      <span className="truncate">
                                        Handover & Clear (Paid ✅)
                                      </span>
                                    </Button>
                                  ) : (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                          handleGenerateTableBill(order)
                                        }
                                        className="h-7 px-2 rounded-lg border-slate-200 bg-white text-slate-800 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 font-bold text-[10px] uppercase cursor-pointer shrink-0 flex items-center gap-1"
                                      >
                                        <Receipt className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span>Bill</span>
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          handleStatusUpdate(
                                            order.id,
                                            ORDER_STATUS.FINISHED,
                                          )
                                        }
                                        className="flex-1 min-w-0 h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-tight shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                      >
                                        <DollarSign className="w-3 h-3 shrink-0" />
                                        <span className="truncate">
                                          Pay & Clear
                                        </span>
                                      </Button>
                                    </div>
                                  ))}

                                {order.status === ORDER_STATUS.FINISHED && (
                                  <Button
                                    variant="outline"
                                    onClick={() => setReceiptOrder(order)}
                                    className="w-full h-7 rounded-lg bg-white border-slate-200 text-slate-600 font-bold text-[10.5px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <Receipt className="w-3 h-3 text-indigo-600" />
                                    <span>Completed</span>
                                  </Button>
                                )}

                                {order.status === ORDER_STATUS.CANCELLED && (
                                  <Button
                                    disabled
                                    className="w-full h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/60 font-bold text-[10.5px] uppercase tracking-wider opacity-90 flex items-center justify-center gap-1"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Cancelled</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : viewMode === "kanban" ? (
                /* Executive Kanban Pipeline Board Mode matching Reference Design */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[
                    {
                      statusKey: ORDER_STATUS.ORDERED,
                      title: "New Incoming",
                      subtitle: "Awaiting Kitchen",
                      dotColor: "bg-blue-400",
                      topBorder: "border-t-blue-500",
                      orders: processedOrders.filter((o) =>
                        [ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(
                          o.status,
                        ),
                      ),
                      nextStatus: ORDER_STATUS.PREPARING,
                      nextLabel: "Start Cooking",
                      nextIcon: ChefHat,
                      btnClass: "bg-orange-600 hover:bg-orange-700",
                    },
                    {
                      statusKey: ORDER_STATUS.PREPARING,
                      title: "Kitchen Cooking",
                      subtitle: "Chef on the Pass",
                      dotColor: "bg-orange-400",
                      topBorder: "border-t-orange-500",
                      orders: processedOrders.filter(
                        (o) => o.status === ORDER_STATUS.PREPARING,
                      ),
                      nextStatus: ORDER_STATUS.READY,
                      nextLabel: "Plated & Ready",
                      nextIcon: Check,
                      btnClass: "bg-emerald-600 hover:bg-emerald-700",
                    },
                    {
                      statusKey: ORDER_STATUS.READY,
                      title: "Ready for Service",
                      subtitle: "Hot & Plated",
                      dotColor: "bg-emerald-400",
                      topBorder: "border-t-emerald-500",
                      orders: processedOrders.filter(
                        (o) => o.status === ORDER_STATUS.READY,
                      ),
                      nextStatus: ORDER_STATUS.SERVED,
                      nextLabel: "Serve to Table",
                      nextIcon: Utensils,
                      btnClass: "bg-indigo-600 hover:bg-indigo-700",
                    },
                    {
                      statusKey: ORDER_STATUS.SERVED,
                      title: "Dining / Billing",
                      subtitle: "Served & Ready to Settle",
                      dotColor: "bg-amber-400",
                      topBorder: "border-t-amber-500",
                      orders: processedOrders.filter((o) =>
                        [
                          ORDER_STATUS.SERVED,
                          ORDER_STATUS.BILL_REQUESTED,
                        ].includes(o.status),
                      ),
                      nextStatus: ORDER_STATUS.FINISHED,
                      nextLabel: "Mark Paid & Clear",
                      nextIcon: DollarSign,
                      btnClass: "bg-emerald-600 hover:bg-emerald-700",
                    },
                  ].map((col) => {
                    const NextIcon = col.nextIcon;
                    return (
                      <div
                        key={col.title}
                        className="bg-slate-100/65 rounded-2xl p-2.5 border border-slate-200/80 flex flex-col lg:h-[calc(100vh-220px)] min-h-[520px]"
                      >
                        {/* Column Header Card (shadcn Studio style) */}
                        <div className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/80 mb-2.5 flex items-center justify-between shadow-2xs shrink-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ring-4 ring-slate-100 ${col.dotColor}`}
                            />
                            <div className="min-w-0">
                              <h3 className="font-semibold text-[13px] text-slate-950 leading-tight truncate tracking-tight">
                                {col.title}
                              </h3>
                              <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                                {col.subtitle}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="h-6 min-w-6 px-2 rounded-full bg-slate-100 border border-slate-200/70 text-slate-800 text-[11px] font-semibold justify-center shrink-0 tabular-nums"
                          >
                            {col.orders.length}
                          </Badge>
                        </div>

                        {/* Card Column Body */}
                        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 no-scrollbar">
                          {col.orders.length === 0 ? (
                            <div className="h-52 rounded-2xl border border-dashed border-slate-200 bg-white/60 flex flex-col items-center justify-center text-center p-4">
                              <div className="w-9 h-9 rounded-xl border border-slate-200/80 bg-white text-slate-400 flex items-center justify-center mb-2.5 shadow-2xs">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                No Tickets in Stage
                              </span>
                              <span className="text-[11px] text-slate-400 mt-0.5">
                                Pipeline stage is currently clear
                              </span>
                            </div>
                          ) : (
                            col.orders.map((order) => {
                              const items =
                                order.items || order.order_items || [];
                              const elapsed = getElapsedInfo(
                                order.createdAt || order.created_at,
                              );
                              const isBillReq =
                                order.status === ORDER_STATUS.BILL_REQUESTED;

                              return (
                                <Card
                                  key={order.id}
                                  className={`bg-white rounded-2xl border border-slate-200/85 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-slate-300/80 transition-[transform,box-shadow,border-color] duration-200 ease-out will-change-transform flex flex-col justify-between overflow-hidden border-t-[3px] ${col.topBorder}`}
                                >
                                  {/* Card Body */}
                                  <div className="p-3.5 pb-2.5">
                                    {/* Top Row: Table + Order ID + Elapsed Time */}
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="bg-slate-950 text-white font-semibold text-[11px] px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0 tracking-tight">
                                          Table{" "}
                                          {order.tableNumber ||
                                            order.table_number ||
                                            "1"}
                                        </span>
                                        {isOrderPrepaid(order) && (
                                          <Badge className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white border-none font-bold text-[9px] uppercase tracking-wider shrink-0 flex items-center gap-0.5 whitespace-nowrap">
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />{" "}
                                            PAID
                                          </Badge>
                                        )}
                                        <span className="text-[11px] font-mono font-medium text-slate-400 whitespace-nowrap truncate">
                                          #
                                          {String(order.id)
                                            .replace(/^ord-/i, "")
                                            .slice(-4)
                                            .toUpperCase()}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 whitespace-nowrap shrink-0">
                                        <Clock
                                          className={`w-3 h-3 shrink-0 ${
                                            elapsed.urgency === "delayed"
                                              ? "text-rose-500"
                                              : elapsed.urgency === "warning"
                                                ? "text-amber-500"
                                                : "text-slate-400"
                                          }`}
                                        />
                                        <span
                                          className={`text-[10.5px] font-medium whitespace-nowrap tabular-nums ${
                                            elapsed.urgency === "delayed"
                                              ? "text-rose-600 font-semibold"
                                              : elapsed.urgency === "warning"
                                                ? "text-amber-600"
                                                : "text-slate-500"
                                          }`}
                                        >
                                          {elapsed.text}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Customer Info Row */}
                                    <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 text-[11.5px]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0">
                                          <User className="w-3 h-3 text-slate-500" />
                                        </div>
                                        <span className="font-medium text-slate-700 truncate">
                                          {order.customerName ||
                                            order.customer_name ||
                                            "Guest Customer"}
                                        </span>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="px-2 py-0 rounded-md border-slate-200 bg-slate-50/70 text-[9px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap shrink-0"
                                      >
                                        {order.order_type ||
                                          order.orderType ||
                                          "DINE-IN"}
                                      </Badge>
                                    </div>

                                    {order.notes &&
                                      order.notes.includes("BILLING DONE") && (
                                        <div className="mb-2 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[9.5px] font-semibold border border-emerald-200 truncate">
                                          ✅ {order.notes}
                                        </div>
                                      )}

                                    {/* KOT Items List */}
                                    <div className="space-y-1.5 min-h-[36px]">
                                      {items.slice(0, 4).map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between gap-2 text-[11.5px]"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="min-w-[20px] h-[18px] px-1 rounded bg-slate-900 text-white text-[9.5px] font-bold flex items-center justify-center shrink-0">
                                              {item.quantity}x
                                            </span>
                                            <span className="font-semibold text-slate-800 truncate">
                                              {item.name}
                                            </span>
                                            {item.variant &&
                                              item.variant !== "full" && (
                                                <span className="text-[9px] text-indigo-600 font-semibold bg-indigo-50 px-1 rounded shrink-0">
                                                  {item.variant}
                                                </span>
                                              )}
                                          </div>
                                          <span className="text-[11.5px] font-semibold text-slate-700 tabular-nums shrink-0">
                                            ₹
                                            {Number(item.price || 0) *
                                              Number(item.quantity || 1)}
                                          </span>
                                        </div>
                                      ))}
                                      {items.length > 4 && (
                                        <span className="text-[10px] font-semibold text-indigo-600 block pt-0.5">
                                          +{items.length - 4} more items
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Card Footer Actions */}
                                  <div className="px-3.5 pt-2.5 pb-3.5 border-t border-slate-100 mt-auto">
                                    <div className="flex items-center justify-between mb-2.5">
                                      <div>
                                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-1">
                                          TOTAL AMOUNT
                                        </span>
                                        <span className="text-sm font-black text-slate-900 tracking-tight tabular-nums">
                                          ₹
                                          {Number(
                                            order.total ||
                                              order.total_amount ||
                                              0,
                                          ).toFixed(2)}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-0.5 shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            handlePrintReceipt(order)
                                          }
                                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                          title="Print Thermal Receipt"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                        </Button>

                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                            >
                                              <MoreVertical className="w-3.5 h-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent
                                            align="end"
                                            className="min-w-[175px] rounded-xl shadow-xl border border-slate-200/90 bg-white p-1 text-xs font-semibold z-50"
                                          >
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handlePrintReceipt(order)
                                              }
                                              className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 whitespace-nowrap"
                                            >
                                              <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                              <span>View Bill Receipt</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                setTimelineOrder(order)
                                              }
                                              className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 whitespace-nowrap"
                                            >
                                              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                              <span>Order Timeline</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleStatusUpdate(
                                                  order.id,
                                                  ORDER_STATUS.CANCELLED,
                                                )
                                              }
                                              className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-rose-600 hover:bg-rose-50/70 focus:text-rose-700 whitespace-nowrap"
                                            >
                                              <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                              <span>Cancel Order</span>
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>

                                    {/* Auto 5m Kitchen Timer Pill or Seated/Billing Indicator */}
                                    {autoKitchenFlow &&
                                      [
                                        ORDER_STATUS.PREPARING,
                                        ORDER_STATUS.READY,
                                      ].includes(order.status) &&
                                      !(
                                        isOrderPrepaid(order) &&
                                        order.status === ORDER_STATUS.READY
                                      ) && (
                                        <AutoAdvanceCountdown
                                          order={order}
                                          autoEnabled={autoKitchenFlow}
                                          variant="kanban"
                                        />
                                      )}

                                    {/* Dining / Billing Status Chip (Unified Studio Bar) */}
                                    {[
                                      ORDER_STATUS.SERVED,
                                      ORDER_STATUS.BILL_REQUESTED,
                                    ].includes(order.status) &&
                                      !isOrderPrepaid(order) && (
                                        <div
                                          className={`mb-2.5 px-2.5 py-1.5 rounded-xl border text-[10.5px] font-semibold flex items-center justify-between ${
                                            isBillReq
                                              ? "bg-amber-50/90 border-amber-200/80 text-amber-800"
                                              : "bg-slate-50 border-slate-200/80 text-slate-600"
                                          }`}
                                        >
                                          <span className="flex items-center gap-1.5">
                                            <span
                                              className={`w-1.5 h-1.5 rounded-full ${isBillReq ? "bg-amber-500 animate-pulse" : "bg-indigo-500"}`}
                                            />
                                            <span>
                                              {isBillReq
                                                ? "Bill Requested"
                                                : "Served at Table"}
                                            </span>
                                          </span>
                                          <span className="text-[10px] font-medium opacity-80">
                                            {isBillReq
                                              ? "Ready to settle"
                                              : "Open check"}
                                          </span>
                                        </div>
                                      )}

                                    {/* Primary Stage Transition Button (Unified Bottom-Side Approach) */}
                                    {[
                                      ORDER_STATUS.SERVED,
                                      ORDER_STATUS.BILL_REQUESTED,
                                    ].includes(order.status) &&
                                    !isOrderPrepaid(order) ? (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() =>
                                            handleGenerateTableBill(order)
                                          }
                                          className="h-9 px-3 rounded-xl border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 text-slate-800 font-semibold text-xs cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs transition-colors"
                                          title="Open Table Bill & Payment Settlement"
                                        >
                                          <Receipt className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Bill</span>
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            handleStatusUpdate(
                                              order.id,
                                              ORDER_STATUS.FINISHED,
                                            )
                                          }
                                          className="flex-1 min-w-0 h-9 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                          <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                          <span className="truncate">
                                            Mark Paid & Clear
                                          </span>
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        onClick={() =>
                                          handleStatusUpdate(
                                            order.id,
                                            isOrderPrepaid(order) &&
                                              [
                                                ORDER_STATUS.READY,
                                                ORDER_STATUS.SERVED,
                                              ].includes(order.status)
                                              ? ORDER_STATUS.FINISHED
                                              : col.nextStatus,
                                          )
                                        }
                                        className={`w-full h-9 rounded-xl ${
                                          isOrderPrepaid(order) &&
                                          [
                                            ORDER_STATUS.READY,
                                            ORDER_STATUS.SERVED,
                                          ].includes(order.status)
                                            ? "bg-emerald-600 hover:bg-emerald-700"
                                            : col.btnClass
                                        } text-white font-semibold text-xs shadow-xs active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5`}
                                      >
                                        <NextIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">
                                          {isOrderPrepaid(order) &&
                                          [
                                            ORDER_STATUS.READY,
                                            ORDER_STATUS.SERVED,
                                          ].includes(order.status)
                                            ? "Serve & Handover (Paid ✅)"
                                            : col.nextLabel}
                                        </span>
                                      </Button>
                                    )}
                                  </div>
                                </Card>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* High-End POS Table List Mode */
                <Card className="rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/90 border-b border-slate-200/80">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider py-3.5 pl-4">
                            Table / Mode
                          </TableHead>
                          <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">
                            Order ID
                          </TableHead>
                          <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">
                            Time & Age
                          </TableHead>
                          <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">
                            Customer
                          </TableHead>
                          <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">
                            Ordered Items
                          </TableHead>
                          <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">
                            Amount
                          </TableHead>
                          <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">
                            Status
                          </TableHead>
                          <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider text-right pr-4">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedOrders.map((order) => {
                          const items = order.items || order.order_items || [];
                          const elapsed = getElapsedInfo(
                            order.createdAt || order.created_at,
                          );
                          const totalItemsCount = items.reduce(
                            (sum, i) => sum + (Number(i.quantity) || 1),
                            0,
                          );

                          return (
                            <TableRow
                              key={order.id}
                              className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 group"
                            >
                              {/* Table & Type */}
                              <TableCell className="py-3 pl-4">
                                <div className="flex flex-col items-start gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="bg-slate-900 text-white font-black text-xs px-2.5 py-0.5 rounded-lg shadow-2xs whitespace-nowrap">
                                      Table{" "}
                                      {order.tableNumber ||
                                        order.table_number ||
                                        "1"}
                                    </span>
                                    {isOrderPrepaid(order) && (
                                      <span className="bg-emerald-600 text-white font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs">
                                        PAID ✅
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                                    {order.order_type ||
                                      order.orderType ||
                                      "DINE-IN"}
                                  </span>
                                </div>
                              </TableCell>

                              {/* Order ID */}
                              <TableCell className="py-3">
                                <span className="font-mono text-xs text-slate-600 font-bold bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md">
                                  #{String(order.id).slice(-6).toUpperCase()}
                                </span>
                              </TableCell>

                              {/* Time & Elapsed */}
                              <TableCell className="py-3">
                                <div className="flex flex-col">
                                  <span className="text-xs text-slate-800 font-bold">
                                    {new Date(
                                      order.createdAt || order.created_at,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    <span
                                      className={`text-[10px] font-bold ${
                                        elapsed.urgency === "delayed"
                                          ? "text-rose-600 font-black"
                                          : elapsed.urgency === "warning"
                                            ? "text-amber-600 font-bold"
                                            : "text-slate-400 font-medium"
                                      }`}
                                    >
                                      {elapsed.text}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Customer */}
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6.5 h-6.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-800 truncate max-w-32">
                                    {order.customerName ||
                                      order.customer_name ||
                                      "Guest Customer"}
                                  </span>
                                </div>
                              </TableCell>

                              {/* Ordered Items Breakdown */}
                              <TableCell className="py-3 max-w-xs">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100 shrink-0">
                                      {totalItemsCount}{" "}
                                      {totalItemsCount === 1
                                        ? "Dish"
                                        : "Dishes"}
                                    </span>
                                    <span className="text-xs text-slate-700 font-medium truncate max-w-56">
                                      {items
                                        .map((i) => `${i.quantity}x ${i.name}`)
                                        .join(", ")}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Amount */}
                              <TableCell className="py-3">
                                <span className="font-black text-sm text-slate-900 tracking-tight">
                                  ₹
                                  {Number(
                                    order.total || order.total_amount || 0,
                                  ).toFixed(2)}
                                </span>
                              </TableCell>

                              {/* Status */}
                              <TableCell className="py-3">
                                <Badge
                                  className={`border-none font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit ${
                                    [
                                      ORDER_STATUS.ORDERED,
                                      ORDER_STATUS.PENDING,
                                    ].includes(order.status)
                                      ? "bg-blue-100/90 text-blue-700"
                                      : order.status === ORDER_STATUS.PREPARING
                                        ? "bg-orange-100/90 text-orange-700"
                                        : order.status === ORDER_STATUS.READY
                                          ? "bg-emerald-100/90 text-emerald-700"
                                          : order.status === ORDER_STATUS.SERVED
                                            ? "bg-indigo-100/90 text-indigo-700"
                                            : order.status ===
                                                ORDER_STATUS.BILL_REQUESTED
                                              ? "bg-amber-100/90 text-amber-700 ring-1 ring-amber-300 animate-pulse"
                                              : order.status ===
                                                  ORDER_STATUS.FINISHED
                                                ? "bg-slate-100 text-slate-600"
                                                : "bg-rose-100/90 text-rose-700"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      [
                                        ORDER_STATUS.ORDERED,
                                        ORDER_STATUS.PENDING,
                                      ].includes(order.status)
                                        ? "bg-blue-500"
                                        : order.status ===
                                            ORDER_STATUS.PREPARING
                                          ? "bg-orange-500"
                                          : order.status === ORDER_STATUS.READY
                                            ? "bg-emerald-500"
                                            : order.status ===
                                                ORDER_STATUS.SERVED
                                              ? "bg-indigo-500"
                                              : order.status ===
                                                  ORDER_STATUS.BILL_REQUESTED
                                                ? "bg-amber-500"
                                                : order.status ===
                                                    ORDER_STATUS.FINISHED
                                                  ? "bg-slate-400"
                                                  : "bg-rose-500"
                                    }`}
                                  />
                                  <span>
                                    {ORDER_STATUS_CONFIG[order.status]?.label ||
                                      order.status}
                                  </span>
                                </Badge>
                              </TableCell>

                              {/* Action Buttons */}
                              <TableCell className="py-3 pr-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Thermal Print Button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handlePrintReceipt(order)}
                                    className="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Print Receipt"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </Button>

                                  {/* Stage Action Button */}
                                  {[
                                    ORDER_STATUS.ORDERED,
                                    ORDER_STATUS.PENDING,
                                  ].includes(order.status) && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          order.id,
                                          ORDER_STATUS.PREPARING,
                                        )
                                      }
                                      className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <ChefHat className="w-3 h-3" />
                                      <span>Cook</span>
                                    </Button>
                                  )}

                                  {order.status === ORDER_STATUS.PREPARING && (
                                    <div className="flex items-center gap-1.5">
                                      <AutoAdvanceCountdown
                                        order={order}
                                        autoEnabled={autoKitchenFlow}
                                        variant="list"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleStatusUpdate(
                                            order.id,
                                            ORDER_STATUS.READY,
                                          )
                                        }
                                        className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>Ready</span>
                                      </Button>
                                    </div>
                                  )}

                                  {order.status === ORDER_STATUS.READY && (
                                    <div className="flex items-center gap-1.5">
                                      {!isOrderPrepaid(order) && (
                                        <AutoAdvanceCountdown
                                          order={order}
                                          autoEnabled={autoKitchenFlow}
                                          variant="list"
                                        />
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleStatusUpdate(
                                            order.id,
                                            isOrderPrepaid(order)
                                              ? ORDER_STATUS.FINISHED
                                              : ORDER_STATUS.SERVED,
                                          )
                                        }
                                        className={`h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-linear-to-r ${isOrderPrepaid(order) ? "from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800" : "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"} text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1`}
                                      >
                                        {isOrderPrepaid(order) ? (
                                          <CheckCircle className="w-3 h-3" />
                                        ) : (
                                          <Utensils className="w-3 h-3" />
                                        )}
                                        <span>
                                          {isOrderPrepaid(order)
                                            ? "Handover (Paid)"
                                            : "Serve"}
                                        </span>
                                      </Button>
                                    </div>
                                  )}

                                  {(order.status === ORDER_STATUS.SERVED ||
                                    order.status ===
                                      ORDER_STATUS.BILL_REQUESTED) &&
                                    (isOrderPrepaid(order) ? (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleStatusUpdate(
                                            order.id,
                                            ORDER_STATUS.FINISHED,
                                          )
                                        }
                                        className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Clear (Paid)</span>
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleGenerateTableBill(order)
                                          }
                                          className="h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase border-slate-200 bg-white text-slate-800 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 cursor-pointer flex items-center gap-1"
                                        >
                                          <Receipt className="w-3 h-3 text-amber-600" />
                                          <span>Bill</span>
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            handleStatusUpdate(
                                              order.id,
                                              ORDER_STATUS.FINISHED,
                                            )
                                          }
                                          className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          <span>Mark Paid</span>
                                        </Button>
                                      </div>
                                    ))}

                                  {/* 3-Dots Menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="min-w-[175px] rounded-xl shadow-xl border border-slate-200/90 bg-white p-1 text-xs font-semibold z-50"
                                    >
                                      <DropdownMenuItem
                                        onClick={() => handlePrintReceipt(order)}
                                        className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 whitespace-nowrap"
                                      >
                                        <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                        <span>View Bill Receipt</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setTimelineOrder(order)}
                                        className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 whitespace-nowrap"
                                      >
                                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <span>Order Timeline</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                      {order.status !== ORDER_STATUS.FINISHED &&
                                        order.status !==
                                          ORDER_STATUS.CANCELLED && (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleStatusUpdate(
                                                order.id,
                                                ORDER_STATUS.CANCELLED,
                                              )
                                            }
                                            className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-rose-600 hover:bg-rose-50/70 focus:text-rose-700 whitespace-nowrap"
                                          >
                                            <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                            <span>Cancel Order</span>
                                          </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* ── 3B. Consolidated Table Billing & Settlement Sheet (shadcn Studio Drawer) ── */}
        <Sheet
          open={!!billingTableModal}
          onOpenChange={(open) => !open && setBillingTableModal(null)}
        >
          <SheetContent
            side="right"
            overlayClassName="z-[1050] bg-slate-950/45 backdrop-blur-[3px]"
            className="z-[1100] w-full sm:max-w-[460px] p-0 gap-0 flex flex-col bg-slate-50 border-l border-slate-200/90 shadow-[-24px_0_64px_rgba(15,23,42,0.22)] [&>button:last-of-type]:text-slate-400 [&>button:last-of-type]:hover:text-white [&>button:last-of-type]:hover:bg-white/10 [&>button:last-of-type]:top-4 [&>button:last-of-type]:right-4 [&>button:last-of-type]:rounded-lg [&>button:last-of-type]:p-1"
          >
            {billingTableModal &&
              (() => {
                const tNum = billingTableModal.tableNumber;
                const openTableOrders = orders.filter(
                  (o) =>
                    doesOrderBelongToTable(o, tNum) &&
                    ![ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(
                      String(o.status || "").toUpperCase(),
                    ),
                );
                const effectiveOrders =
                  openTableOrders.length > 0
                    ? openTableOrders
                    : allAvailableOrders.filter(
                        (o) =>
                          String(o.id) ===
                          String(billingTableModal.triggeredOrderId),
                      );

                const combinedItems = effectiveOrders.flatMap(
                  (o) => o.items || o.order_items || [],
                );
                const combinedRawSubtotal = combinedItems.reduce(
                  (sum, i) =>
                    sum + Number(i.price || 0) * Number(i.quantity || 1),
                  0,
                );
                const consolidatedOrder = {
                  id: effectiveOrders[0]?.id || `TBL-${tNum}`,
                  tableNumber: tNum,
                  table_number: tNum,
                  items: combinedItems,
                  order_items: combinedItems,
                  subtotal: combinedRawSubtotal,
                  total:
                    effectiveOrders.reduce(
                      (s, o) => s + Number(o.total || o.total_amount || 0),
                      0,
                    ) || combinedRawSubtotal,
                  createdAt:
                    effectiveOrders[0]?.createdAt ||
                    effectiveOrders[0]?.created_at ||
                    new Date().toISOString(),
                };
                const header = getRestaurantReceiptHeader(profile);
                const totals = computeReceiptTotals(consolidatedOrder, profile);
                const paymentOptions = [
                  {
                    id: "UPI",
                    label: "UPI / QR",
                    hint: "Instant QR & VPA settlement",
                    icon: Smartphone,
                  },
                  {
                    id: "CASH",
                    label: "Cash",
                    hint: "Cash drawer tender settlement",
                    icon: Banknote,
                  },
                  {
                    id: "CARD",
                    label: "Card",
                    hint: "EDC / Tap card terminal",
                    icon: CreditCard,
                  },
                ];
                const activePayOption =
                  paymentOptions.find((p) => p.id === billingPaymentMethod) ||
                  paymentOptions[0];
                const totalUnits = combinedItems.reduce(
                  (acc, i) => acc + Number(i.quantity || 1),
                  0,
                );

                return (
                  <>
                    <SheetHeader className="bg-slate-950 text-white px-5 py-3.5 pr-12 border-b border-slate-800/90 space-y-0 shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <SheetTitle className="text-[15px] font-semibold tracking-tight text-white truncate">
                            Table {tNum} • Final Bill & Settlement
                          </SheetTitle>
                          <SheetDescription className="text-[11.5px] text-slate-400 mt-0.5">
                            {effectiveOrders.length} active{" "}
                            {effectiveOrders.length === 1 ? "order" : "orders"}{" "}
                            consolidated • {totalUnits}{" "}
                            {totalUnits === 1 ? "item" : "items"}
                          </SheetDescription>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-2.5 bg-slate-50">
                      {/* Studio Hero Balance & Restaurant Folio Card */}
                      <Card className="py-0 gap-0 rounded-2xl border-slate-200/85 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                        <CardContent className="p-3.5 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-950 uppercase tracking-wider truncate">
                                {header.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                                {header.gstin
                                  ? `GSTIN: ${header.gstin}`
                                  : "Dine-In Consolidated Folio"}
                              </p>
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold text-[10.5px] px-2.5 py-0.5 rounded-full shrink-0 gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Ready to Settle
                            </Badge>
                          </div>

                          <Separator className="bg-slate-100" />

                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                Amount Due
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                Inclusive of applicable taxes
                              </span>
                            </div>
                            <span className="text-2xl font-black text-slate-950 tabular-nums tracking-tight leading-none">
                              ₹{totals.grandTotal.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Consolidated Itemized Ledger Card */}
                      <Card className="py-0 gap-0 rounded-2xl border-slate-200/85 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                        <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Itemized Check
                          </span>
                          <Badge
                            variant="secondary"
                            className="h-5 px-2 text-[10px] font-semibold bg-white border border-slate-200/80 text-slate-600 tabular-nums"
                          >
                            {totalUnits} {totalUnits === 1 ? "item" : "items"}
                          </Badge>
                        </div>
                        <CardContent className="p-0">
                          <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto no-scrollbar px-3.5">
                            {combinedItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-3 py-2 text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="min-w-[24px] h-5 px-1.5 rounded-md bg-slate-950 text-white text-[10px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                                    {item.quantity || 1}x
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 truncate">
                                      {item.name || item.item_name}
                                    </p>
                                    <p className="text-[10.5px] text-slate-400 tabular-nums">
                                      ₹{Number(item.price || 0).toFixed(2)} each
                                      {item.variant && item.variant !== "full"
                                        ? ` • ${item.variant}`
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                                  ₹
                                  {(
                                    Number(item.price || 0) *
                                    Number(item.quantity || 1)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="bg-slate-50/70 border-t border-slate-100 px-3.5 py-2.5 space-y-1 text-xs">
                            <div className="flex justify-between text-slate-500">
                              <span>Subtotal</span>
                              <span className="font-semibold text-slate-800 tabular-nums">
                                ₹{totals.subtotal.toFixed(2)}
                              </span>
                            </div>
                            {totals.hasTax && (
                              <>
                                <div className="flex justify-between text-slate-500">
                                  <span>CGST ({totals.halfRate}%)</span>
                                  <span className="tabular-nums">
                                    ₹{totals.cgst.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                  <span>SGST ({totals.halfRate}%)</span>
                                  <span className="tabular-nums">
                                    ₹{totals.sgst.toFixed(2)}
                                  </span>
                                </div>
                              </>
                            )}
                            <Separator className="my-1 bg-slate-200/70" />
                            <div className="flex justify-between items-center pt-0.5">
                              <span className="text-xs font-bold text-slate-950 uppercase tracking-wide">
                                Net Payable
                              </span>
                              <span className="text-base font-black text-emerald-700 tabular-nums">
                                ₹{totals.grandTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* shadcn Studio Payment Method Segmented Selector */}
                      <Card className="py-0 gap-0 rounded-2xl border-slate-200/85 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Payment Method
                            </span>
                            <span className="text-[10.5px] font-medium text-slate-400 truncate">
                              {activePayOption.hint}
                            </span>
                          </div>
                          <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 grid grid-cols-3 gap-1">
                            {paymentOptions.map(
                              ({ id, label, icon: PayIcon }) => {
                                const selected = billingPaymentMethod === id;
                                return (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => setBillingPaymentMethod(id)}
                                    className={`h-8.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                      selected
                                        ? "bg-white text-slate-950 shadow-xs ring-1 ring-slate-900/10"
                                        : "text-slate-500 hover:text-slate-900"
                                    }`}
                                  >
                                    <PayIcon
                                      className={`w-3.5 h-3.5 ${selected ? "text-slate-950" : "text-slate-400"}`}
                                    />
                                    <span>{label}</span>
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <SheetFooter className="bg-white border-t border-slate-200/80 px-4 py-3 flex-col sm:flex-col sm:space-x-0 gap-2 shrink-0">
                      <Button
                        type="button"
                        disabled={
                          isSettlingTableBill || effectiveOrders.length === 0
                        }
                        onClick={() =>
                          handleSettleTableBill(
                            effectiveOrders,
                            totals.grandTotal,
                          )
                        }
                        className="w-full h-10 rounded-xl bg-slate-950 hover:bg-emerald-600 transition-colors text-white font-semibold text-xs tracking-wide shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>
                          {isSettlingTableBill
                            ? "Settling Table..."
                            : `Collect ₹${totals.grandTotal.toFixed(2)} via ${billingPaymentMethod} & Clear Table`}
                        </span>
                      </Button>

                      <div className="grid grid-cols-2 gap-2 w-full">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handlePrintReceipt(consolidatedOrder)}
                          className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Print Bill</span>
                        </Button>
                        {typeof setActiveItem === "function" ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setBillingTableModal(null);
                              setActiveItem("pos");
                            }}
                            className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                          >
                            Open POS Register
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBillingTableModal(null)}
                            className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </SheetFooter>
                  </>
                );
              })()}
          </SheetContent>
        </Sheet>

        {/* ── 4. Thermal Receipt Studio Modal (80mm / 58mm Print Ready) ── */}
        <ThermalReceiptModal
          open={!!receiptOrder}
          onClose={() => setReceiptOrder(null)}
          order={receiptOrder}
          profile={profile}
          paymentMethod={billingPaymentMethod}
        />

        {/* ── 5. Create Quick POS Order Modal ── */}
        <Dialog
          open={showManualOrderModal}
          onOpenChange={setShowManualOrderModal}
        >
          <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-white">
                    Create Walk-In / POS Order
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 mt-0.5">
                    Quickly send new orders directly to kitchen queue
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Select Table Number
                  </label>
                  <Select
                    value={manualTableNumber}
                    onValueChange={setManualTableNumber}
                  >
                    <SelectTrigger className="h-10 rounded-xl font-bold">
                      <SelectValue placeholder="Select Table" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl font-medium">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(
                        (num) => (
                          <SelectItem key={num} value={String(num)}>
                            Table {num}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Guest Name (Optional)
                  </label>
                  <Input
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Menu Items Catalog Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">
                  Add Dishes from Menu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {catalogItems.map((item) => (
                    <div
                      key={item.id || item._id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <h5 className="font-bold text-xs text-slate-900 truncate">
                          {item.name}
                        </h5>
                        <span className="text-[11px] font-bold text-indigo-600">
                          ₹{item.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.halfPrice && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addItemToManualCart(item, "half")}
                            className="h-7 px-2 text-[10px] font-bold text-amber-700 bg-amber-50"
                          >
                            + Half (₹{item.halfPrice})
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => addItemToManualCart(item, "full")}
                          className="h-7 px-2.5 text-[11px] font-bold bg-slate-900 hover:bg-black text-white"
                        >
                          + Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Preview */}
              {manualCart.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-2">
                    Order Items ({manualCart.length})
                  </h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {manualCart.map((item) => (
                      <div
                        key={item.cartId}
                        className="flex items-center justify-between text-xs font-bold bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs"
                      >
                        <span>
                          {item.name} (₹{item.price})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateManualItemQuantity(item.cartId, -1)
                            }
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateManualItemQuantity(item.cartId, 1)
                            }
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                          <span className="w-16 text-right font-black">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-indigo-200/60 font-black text-sm text-indigo-950">
                    <span>Grand Total:</span>
                    <span>
                      ₹
                      {manualCart
                        .reduce((sum, i) => sum + i.price * i.quantity, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShowManualOrderModal(false)}
                className="rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateManualOrder}
                disabled={manualCart.length === 0}
                className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-5"
              >
                Send to Kitchen (KOT)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── 6. Order Timeline & Audit Stepper Modal ── */}
        <Dialog
          open={!!timelineOrder}
          onOpenChange={(open) => !open && setTimelineOrder(null)}
        >
          <DialogContent
            showCloseButton={false}
            className="max-w-md p-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-2xl"
          >
            {timelineOrder &&
              (() => {
                const currentStatus = String(
                  timelineOrder.status || "PENDING",
                ).toUpperCase();
                const isCancelled = currentStatus === ORDER_STATUS.CANCELLED;
                const historyList = Array.isArray(timelineOrder.statusHistory)
                  ? timelineOrder.statusHistory
                  : Array.isArray(timelineOrder.status_history)
                    ? timelineOrder.status_history
                    : [];

                const findStageTs = (keys) => {
                  for (let i = historyList.length - 1; i >= 0; i -= 1) {
                    if (
                      keys.includes(
                        String(historyList[i]?.status || "").toUpperCase(),
                      ) &&
                      historyList[i]?.timestamp
                    ) {
                      return historyList[i].timestamp;
                    }
                  }
                  return null;
                };

                const steps = [
                  {
                    keys: ["PENDING", "ORDERED"],
                    label: "Order Placed",
                    desc: "Received in kitchen queue",
                    icon: ShoppingBag,
                  },
                  {
                    keys: ["PREPARING", "COOKING"],
                    label: "Kitchen Cooking",
                    desc: "Chef started preparation",
                    icon: ChefHat,
                  },
                  {
                    keys: ["READY"],
                    label: "Plated & Ready",
                    desc: "Ready on the hot pass",
                    icon: CheckCircle2,
                  },
                  {
                    keys: ["SERVED"],
                    label: "Served at Table",
                    desc: "Delivered to guest table",
                    icon: Utensils,
                  },
                  {
                    keys: ["BILL_REQUESTED", "BILLING"],
                    label: "Bill Requested",
                    desc: "Check ready for settlement",
                    icon: Receipt,
                  },
                  {
                    keys: ["FINISHED", "FINISHED_CLOSED", "COMPLETED"],
                    label: "Paid & Settled",
                    desc: "Table check closed cleanly",
                    icon: DollarSign,
                  },
                ];

                let currentIdx = steps.findIndex((s) =>
                  s.keys.includes(currentStatus),
                );
                if (currentIdx === -1) currentIdx = 0;

                const formatTs = (iso) => {
                  if (!iso) return null;
                  const d = new Date(iso);
                  if (Number.isNaN(d.getTime())) return null;
                  return d.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  });
                };

                return (
                  <>
                    <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <DialogTitle className="text-sm font-bold tracking-tight text-white truncate">
                            Order Timeline • Table{" "}
                            {timelineOrder.tableNumber ||
                              timelineOrder.table_number ||
                              "1"}
                          </DialogTitle>
                          <DialogDescription className="text-[11px] text-slate-400 font-mono">
                            #{String(timelineOrder.id).slice(-6).toUpperCase()}{" "}
                            •{" "}
                            {timelineOrder.customerName ||
                              timelineOrder.customer_name ||
                              "Guest"}
                          </DialogDescription>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTimelineOrder(null)}
                        className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                        title="Close Timeline"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Current Status
                          </span>
                          <span className="font-bold text-slate-950">
                            {ORDER_STATUS_CONFIG[currentStatus]?.label ||
                              currentStatus}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Order Total
                          </span>
                          <span className="font-bold text-slate-950 tabular-nums">
                            ₹
                            {Number(
                              timelineOrder.total ||
                                timelineOrder.total_amount ||
                                0,
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {isCancelled ? (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
                          <X className="w-5 h-5 text-rose-600 shrink-0" />
                          <div>
                            <p className="font-bold">Order Cancelled</p>
                            <p className="text-[11px] text-rose-700 mt-0.5">
                              Cancelled at{" "}
                              {formatTs(
                                timelineOrder.updated_at ||
                                  timelineOrder.updatedAt,
                              ) || "Recorded"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 pl-1">
                          {steps.map((step, idx) => {
                            const StepIcon = step.icon;
                            const isCompleted =
                              idx < currentIdx ||
                              (currentIdx === steps.length - 1 &&
                                idx === currentIdx);
                            const isActive =
                              idx === currentIdx &&
                              currentIdx < steps.length - 1;
                            const stageTs =
                              findStageTs(step.keys) ||
                              (idx === 0
                                ? timelineOrder.createdAt ||
                                  timelineOrder.created_at
                                : null) ||
                              (isActive || idx === currentIdx
                                ? timelineOrder.updated_at ||
                                  timelineOrder.updatedAt
                                : null);
                            const formattedTime =
                              isCompleted || isActive
                                ? formatTs(stageTs)
                                : null;

                            return (
                              <div
                                key={step.label}
                                className="flex items-start gap-3 relative"
                              >
                                {idx < steps.length - 1 && (
                                  <div
                                    className={`absolute left-3.5 top-7 bottom-0 w-px ${isCompleted ? "bg-emerald-500" : "bg-slate-200"}`}
                                  />
                                )}
                                <div
                                  className={`relative z-10 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                    isCompleted
                                      ? "bg-emerald-600 border-emerald-600 text-white"
                                      : isActive
                                        ? "bg-slate-950 border-slate-950 text-amber-400 ring-4 ring-amber-500/15"
                                        : "bg-slate-50 border-slate-200 text-slate-400"
                                  }`}
                                >
                                  {isCompleted ? (
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  ) : (
                                    <StepIcon className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pb-2.5 flex items-start justify-between gap-2">
                                  <div>
                                    <p
                                      className={`text-xs font-semibold ${isCompleted || isActive ? "text-slate-950" : "text-slate-400"}`}
                                    >
                                      {step.label}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      {step.desc}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    {isActive && (
                                      <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold uppercase px-1.5 py-0">
                                        Current
                                      </Badge>
                                    )}
                                    {formattedTime && (
                                      <span className="block text-[10px] font-mono text-slate-500 mt-0.5 tabular-nums">
                                        {formattedTime}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <DialogFooter className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const target = timelineOrder;
                          setTimelineOrder(null);
                          setReceiptOrder(target);
                        }}
                        className="h-8 rounded-lg border-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        View Bill Receipt
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setTimelineOrder(null)}
                        className="h-8 px-4 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        Done
                      </Button>
                    </DialogFooter>
                  </>
                );
              })()}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
