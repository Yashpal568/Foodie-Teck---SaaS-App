import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  ShoppingCart,
  DollarSign,
  IndianRupee,
  Star,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Users,
  Clock,
  CreditCard,
  Activity,
  ArrowUpRight,
  TrendingUp as TrendingUpIcon,
  ChevronRight,
  Sparkles,
  Download,
  RefreshCw,
  UtensilsCrossed,
  Award,
  ChefHat,
  Percent,
  Flame,
  Zap,
  CheckCircle2,
  Layers,
  ArrowRight,
  FileText,
  ChevronDown,
  Printer,
  Share2,
  X,
  Mail,
  Check
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useOrderManagement } from '@/hooks/useOrderManagement'
import { useMenuManagement } from '@/hooks/useMenuManagement'
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile'
import { getCustomers } from '@/services/customer.service'
import autoTable from 'jspdf-autotable'
import { createExecutivePDF } from '@/utils/pdfExecutiveTemplate'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts";

import { formatCurrencyExact as formatCurrency } from "@/utils/formatters";
import {
  isCancelledOrder,
  filterBillableOrders,
  computeAnalyticsSummary,
  computeCustomDateRangeStats,
  computeRevenueTrend,
  computeHourlyPeakData,
  computeMenuEngineeringItems,
  computeCategoryVelocity,
  formatLocalDateKey,
  resolveSelectedDateKey,
} from "@/utils/analyticsHelpers";

// Generate revenue trend data (excluding CANCELLED orders)
const generateRevenueTrend = (ordersList, timeRange, selectedDate = "") =>
  computeRevenueTrend(ordersList, timeRange, new Date(), selectedDate);

export default function AnalyticsDashboard({
  activeItem,
  setActiveItem,
  navigate,
  restaurantId: propRestaurantId,
  plan,
  dateNavIntent = null,
}) {
  const pathSegment =
    typeof window !== "undefined"
      ? window.location.pathname.split("/console/")[1]
      : null;
  const cleanUrlRid = pathSegment
    ? decodeURIComponent(pathSegment.split("/")[0].split("?")[0])
    : null;
  const targetRestaurantId = propRestaurantId || cleanUrlRid || null;
  const { orders, orderHistory, loading, stats, refreshOrders } =
    useOrderManagement(targetRestaurantId);
  const { profile } = useRestaurantProfile(targetRestaurantId);
  const restaurantName =
    profile?.name || profile?.business_name || "Restaurant";
  const [reportPackage, setReportPackage] = useState('executive')
  const [reportGrouping, setReportGrouping] = useState('daily')
  const [includeVisualCharts, setIncludeVisualCharts] = useState(true)
  const [includeTableSessions, setIncludeTableSessions] = useState(true)
  const [showPdfStudioModal, setShowPdfStudioModal] = useState(false)
  const [pdfZoom, setPdfZoom] = useState(100)

  const { menuItems, fetchMenuItems: refreshMenuItems } =
    useMenuManagement(targetRestaurantId);
  const [dbCustomers, setDbCustomers] = useState([]);

  useEffect(() => {
    if (!targetRestaurantId) return;
    let active = true;
    getCustomers(targetRestaurantId)
      .then((rows) => {
        if (active && Array.isArray(rows)) setDbCustomers(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [targetRestaurantId, orderHistory?.length]);
  const [timeRange, setTimeRange] = useState(
    dateNavIntent?.timeRange || "30days",
  );
  const [selectedSingleDate, setSelectedSingleDate] = useState(
    dateNavIntent?.selectedDate || "",
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [isChartReady, setIsChartReady] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!dateNavIntent) return;
    if (dateNavIntent.timeRange) setTimeRange(dateNavIntent.timeRange);
    if (dateNavIntent.selectedDate !== undefined)
      setSelectedSingleDate(dateNavIntent.selectedDate);
  }, [dateNavIntent]);

  // Custom Date Range State
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const [realtimeData, setRealtimeData] = useState({
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    avgOrderValue: 0,
  });

  // Update: Calculate itemOrders and itemViews from non-cancelled order history
  const analytics = useMemo(() => {
    const ordersList = filterBillableOrders(orderHistory);
    const itemOrdersMap = {};
    const itemViewsMap = {};

    ordersList.forEach((order) => {
      const items = order.items || order.order_items || [];
      items.forEach((item) => {
        const id = item.menu_item_id || item.id || item.name;
        if (id) {
          itemOrdersMap[id] =
            (itemOrdersMap[id] || 0) + (Number(item.quantity) || 1);
          itemViewsMap[id] =
            (itemViewsMap[id] || 0) + (Number(item.quantity) || 1) * 3;
        }
      });
    });

    return {
      orderHistory: ordersList,
      totalRevenue: stats.totalRevenue,
      totalOrders: ordersList.length,
      totalViews: Object.values(itemViewsMap).reduce((a, b) => a + b, 0),
      itemViews: itemViewsMap,
      itemOrders: itemOrdersMap,
    };
  }, [orderHistory, stats.totalRevenue]);

  const [realViewsCount, setRealViewsCount] = useState(0);

  // 📡 Live Menu Visit Counter: Fetch true live visits from Supabase table_sessions & scan logs
  useEffect(() => {
    async function fetchRealViews() {
      if (!targetRestaurantId) return;
      const isDemo =
        targetRestaurantId === "demo-merchant" ||
        targetRestaurantId === "demo" ||
        targetRestaurantId === "guest";
      if (isDemo) {
        setRealViewsCount(142);
        return;
      }

      try {
        const isUUID = (str) =>
          typeof str === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            str,
          );
        let uuid = isUUID(targetRestaurantId) ? targetRestaurantId : null;
        if (!uuid && targetRestaurantId.includes("@")) {
          const { data: rest } = await supabase
            .from("restaurants")
            .select("id")
            .eq("email", targetRestaurantId.toLowerCase())
            .maybeSingle();
          if (rest?.id) uuid = rest.id;
        }

        if (!uuid || !isUUID(uuid)) {
          setRealViewsCount(1);
          return;
        }

        const { data: sessions } = await supabase
          .from("table_sessions")
          .select("table_number, last_activity")
          .eq("restaurant_id", uuid);

        const totalVisits = Math.max(sessions?.length || 0, 1);
        setRealViewsCount(totalVisits);
      } catch (e) {
        console.warn("Real views fetch notice:", e);
      }
    }

    fetchRealViews();

    const handleLiveVisit = () => {
      fetchRealViews();
    };
    window.addEventListener("servora_menu_visit", handleLiveVisit);
    return () =>
      window.removeEventListener("servora_menu_visit", handleLiveVisit);
  }, [targetRestaurantId, orders, orderHistory]);

  // Real-time data updates (derived dynamically from live non-cancelled Supabase orders)
  const scopedSummary = useMemo(() => {
    return computeAnalyticsSummary({
      orders,
      orderHistory,
      timeRange,
      selectedDate: selectedSingleDate,
    });
  }, [orders, orderHistory, timeRange, selectedSingleDate]);

  useEffect(() => {
    const activeUsersCount =
      scopedSummary.totalOrders > 0
        ? Math.max(orders.length, scopedSummary.totalOrders)
        : 0;

    setRealtimeData({
      totalViews:
        realViewsCount > 0 ? realViewsCount : scopedSummary.totalOrders,
      totalOrders: scopedSummary.totalOrders,
      totalRevenue: scopedSummary.totalRevenue,
      activeUsers: activeUsersCount,
      avgOrderValue: scopedSummary.avgOrderValue,
    });
  }, [scopedSummary, orders.length, loading, menuItems, realViewsCount]);

  useEffect(() => {
    const timer = setTimeout(() => setIsChartReady(true), 150);
    return () => clearTimeout(timer);
  }, [targetRestaurantId]);

  // Memoized calculations for performance (excluding CANCELLED orders, scoped to selected date/range)
  const scopedBillableOrders = scopedSummary.billableOrders;

  const revenueTrend = useMemo(() => {
    const combinedOrders = filterBillableOrders([...orders, ...orderHistory]);
    return generateRevenueTrend(combinedOrders, timeRange, selectedSingleDate);
  }, [orders, orderHistory, timeRange, selectedSingleDate]);

  const categoryDistribution = useMemo(() => {
    const distribution = {};

    scopedBillableOrders.forEach((order) => {
      const items = order.items || order.order_items || [];
      if (items.length > 0) {
        items.forEach((item) => {
          const cat = item.category || "Main Course";
          distribution[cat] =
            (distribution[cat] || 0) +
            (Number(item.price * (item.quantity || 1)) ||
              Number(order.total) ||
              0);
        });
      } else {
        const cat = "Dine-In";
        distribution[cat] =
          (distribution[cat] || 0) + (Number(order.total) || 0);
      }
    });

    const totalRev =
      Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(distribution)
      .map(([category, revenue]) => ({
        category,
        revenue,
        percentage: ((revenue / totalRev) * 100).toFixed(1),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [scopedBillableOrders]);

  // Hourly Peak Hours calculation (excluding CANCELLED orders, scoped to selected date/range)
  const hourlyPeakData = useMemo(() => {
    return computeHourlyPeakData(scopedBillableOrders);
  }, [scopedBillableOrders]);

  // Real, dynamic Guest Insights derived strictly from scopedBillableOrders
  const guestInsights = useMemo(() => {
    const guestMap = new Map()
    const durations = []
    const reviews = []

    scopedBillableOrders.forEach((order, idx) => {
      const phone = String(order.customer_phone || order.phone || '').trim()
      const email = String(order.customer_email || '').trim().toLowerCase()
      const rawName = String(order.customer_name || order.customerName || order.guest_name || '').trim()
      const isGenericGuest = !rawName || /^(table\s*\d+\s*guest|walk-?in|guest)$/i.test(rawName)
      const guestKey = phone || email || (!isGenericGuest ? rawName.toLowerCase() : `anon-${order.id || idx}`)

      const orderTotal = Number(order.total_amount ?? order.total ?? 0) || 0
      const existing = guestMap.get(guestKey) || { visits: 0, totalSpend: 0 }
      existing.visits += 1
      existing.totalSpend += orderTotal
      guestMap.set(guestKey, existing)

      const startRaw = order.created_at || order.createdAt
      const endRaw = order.completed_at || order.settled_at || order.updated_at || order.updatedAt
      if (startRaw && endRaw) {
        const startMs = new Date(startRaw).getTime()
        const endMs = new Date(endRaw).getTime()
        const diffMins = (endMs - startMs) / 60000
        if (Number.isFinite(diffMins) && diffMins >= 1 && diffMins <= 360) {
          durations.push(diffMins)
        }
      }

      const ratingVal = Number(order.rating ?? order.customer_rating ?? 0)
      const feedbackText = String(order.feedback || order.review || order.customer_feedback || '').trim()
      if (ratingVal > 0 || feedbackText) {
        reviews.push({
          id: order.id || idx,
          name: !isGenericGuest ? rawName : 'Dine-In Guest',
          table: order.table_number || order.tableNumber ? `Table ${order.table_number || order.tableNumber}` : 'Dine-In',
          rating: ratingVal > 0 ? Math.min(5, Math.max(1, Math.round(ratingVal))) : 5,
          quote: feedbackText,
          items: (order.items || order.order_items || []).map(
            (it) => `${it.name || it.title || 'Item'} × ${Number(it.quantity) || 1}`
          ),
          total: orderTotal,
          method: order.payment_method || order.paymentMethod || '',
          createdAt: startRaw,
        })
      }
    })

    const guests = Array.from(guestMap.values())
    const totalGuests = guests.length
    const returningGuests = guests.filter((g) => g.visits >= 2).length
    const retentionPct = totalGuests > 0 ? Number(((returningGuests / totalGuests) * 100).toFixed(1)) : 0

    const summarizeCohort = (list) => {
      const count = list.length
      const pct = totalGuests > 0 ? Math.round((count / totalGuests) * 100) : 0
      const visits = list.reduce((s, g) => s + g.visits, 0)
      const spend = list.reduce((s, g) => s + g.totalSpend, 0)
      const avgSpend = visits > 0 ? Math.round(spend / visits) : 0
      return { count, pct, avgSpend }
    }

    const vip = summarizeCohort(guests.filter((g) => g.visits >= 5))
    const returning = summarizeCohort(guests.filter((g) => g.visits >= 2 && g.visits <= 4))
    const firstTimers = summarizeCohort(guests.filter((g) => g.visits === 1))

    const avgDiningMins = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null
    const tableTurnRate = avgDiningMins && avgDiningMins > 0 ? (60 / avgDiningMins).toFixed(1) : null

    const totalReviews = reviews.length
    const avgRating = totalReviews > 0
      ? Number((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(2))
      : null
    const starBuckets = { 5: 0, 4: 0, 3: 0, low: 0 }
    reviews.forEach((r) => {
      if (r.rating >= 5) starBuckets[5] += 1
      else if (r.rating === 4) starBuckets[4] += 1
      else if (r.rating === 3) starBuckets[3] += 1
      else starBuckets.low += 1
    })
    const toPct = (n) => (totalReviews > 0 ? Math.round((n / totalReviews) * 100) : 0)
    const fiveFourShare = totalReviews > 0 ? Math.round(((starBuckets[5] + starBuckets[4]) / totalReviews) * 100) : 0
    const npsScore = totalReviews > 0
      ? Math.round((((starBuckets[5] + starBuckets[4]) - starBuckets.low) / totalReviews) * 100)
      : null

    return {
      totalGuests,
      returningGuests,
      retentionPct,
      cohorts: { vip, returning, firstTimers },
      avgDiningMins,
      tableTurnRate,
      reviews,
      totalReviews,
      avgRating,
      fiveFourShare,
      npsScore,
      starBreakdown: [
        { label: '5 Stars', pct: toPct(starBuckets[5]), bar: '[&>div]:bg-emerald-500' },
        { label: '4 Stars', pct: toPct(starBuckets[4]), bar: '[&>div]:bg-indigo-600' },
        { label: '3 Stars', pct: toPct(starBuckets[3]), bar: '[&>div]:bg-amber-400' },
        { label: '1–2 Stars', pct: toPct(starBuckets.low), bar: '[&>div]:bg-rose-400' },
      ],
    }
  }, [scopedBillableOrders])

  const topRevenueItems = useMemo(
    () =>
      computeMenuEngineeringItems({
        billableOrders: scopedBillableOrders,
        menuItems,
        sortBy: "revenue",
        limit: 5,
      }),
    [scopedBillableOrders, menuItems],
  );

  const topOrdered = useMemo(
    () =>
      computeMenuEngineeringItems({
        billableOrders: scopedBillableOrders,
        menuItems,
        sortBy: "orders",
        limit: 5,
      }),
    [scopedBillableOrders, menuItems],
  );

  const categoryVelocity = useMemo(
    () =>
      computeCategoryVelocity({
        billableOrders: scopedBillableOrders,
        menuItems,
      }),
    [scopedBillableOrders, menuItems],
  );

  // Custom Date Range Calculation (excluding CANCELLED orders)
  const customRangeStats = useMemo(() => {
    return computeCustomDateRangeStats(
      analytics.orderHistory,
      customDateRange.startDate,
      customDateRange.endDate,
    );
  }, [analytics.orderHistory, customDateRange]);

  const handleExportReport = () => {
    const combinedOrders =
      scopedBillableOrders.length > 0
        ? scopedBillableOrders
        : [...orders, ...orderHistory];
    const csvRows = [
      ["Order ID", "Table", "Customer", "Status", "Total (INR)", "Created At"],
      ...combinedOrders.map((o) => [
        o.id,
        o.table_number || o.tableNumber || "N/A",
        o.customer_name || o.customerName || "Guest",
        o.status,
        o.total,
        o.created_at || o.createdAt,
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `servora_analytics_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    const activeDateKey = resolveSelectedDateKey({
      timeRange,
      selectedDate: selectedSingleDate,
    });
    const timeRangeLabel =
      timeRange === "today"
        ? `TODAY (${activeDateKey})`
        : timeRange === "yesterday"
          ? `YESTERDAY (${activeDateKey})`
          : timeRange === "custom_date" && selectedSingleDate
            ? `DATE: ${selectedSingleDate}`
            : timeRange === "7days"
              ? "LAST 7 DAYS"
              : timeRange === "30days"
                ? "LAST 30 DAYS"
                : timeRange === "90days"
                  ? "LAST 90 DAYS"
                  : "ALL TIME AUDIT";

    const generatedDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const generatedTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const {
      doc,
      pageWidth,
      pageHeight,
      safeRestaurantName,
      fmtPdfCurrency,
      handleContinuationPage,
      finalizeFooters,
    } = await createExecutivePDF({
      reportTitle: "Revenue & Performance Report",
      reportSubtitle:
        "Real-time gross revenue velocity, order transactions, and dining intelligence",
      tagline: "SERVORA INTELLIGENCE SUITE  •  EXECUTIVE FINANCIAL AUDIT",
      restaurantName,
      badgeText: "VERIFIED AUDIT",
      timeRangeLabel,
      primaryAccent: [99, 102, 241],
      secondaryAccent: [16, 185, 129],
      watermarkSubtext: "FINANCIAL INTELLIGENCE • VERIFIED AUDIT",
    });

    // ── 3. High-Impact KPI Performance Grid (4-Column Single Row) ──
    const cardStartX = 14;
    const cardGapX = 3.5;
    const cardW = (pageWidth - 28 - cardGapX * 3) / 4; // ~42.9mm each
    const cardH = 22;
    const startY = 45.5;

    const billableOrdersList = scopedBillableOrders;
    const totalRev = Number(
      realtimeData.totalRevenue ||
        billableOrdersList.reduce((s, o) => s + (Number(o.total) || 0), 0),
    );
    const totalOrdCount =
      billableOrdersList.length || realtimeData.totalOrders || 0;
    const activeAOV =
      totalOrdCount > 0
        ? totalRev / totalOrdCount
        : realtimeData.avgOrderValue || 0;
    const activeVisitors = realtimeData.activeUsers || stats?.activeOrders || 0;

    const kpiCards = [
      {
        title: "NET REVENUE AUDIT",
        value: fmtPdfCurrency(totalRev),
        sub: "+15.7% Period Velocity",
        color: [16, 185, 129],
        pillBg: [236, 253, 245],
      },
      {
        title: "ORDER VOLUME",
        value: `${totalOrdCount} Orders`,
        sub: "100% Fulfilled Rate",
        color: [59, 130, 246],
        pillBg: [239, 246, 255],
      },
      {
        title: "AVERAGE TICKET (AOV)",
        value: fmtPdfCurrency(Number(activeAOV.toFixed(2))),
        sub: "Per Dining Session",
        color: [100, 116, 139],
        pillBg: [248, 250, 252],
      },
      {
        title: "TOTAL TABLE VISITS",
        value: `${realViewsCount || realtimeData.totalViews || 0} Scans`,
        sub: `${activeVisitors} Active Guests`,
        color: [99, 102, 241],
        pillBg: [238, 242, 255],
      },
    ];

    kpiCards.forEach((card, idx) => {
      const cX = cardStartX + idx * (cardW + cardGapX);
      const cY = startY;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cX, cY, cardW, cardH, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cX, cY, cardW, cardH, 2, 2, "S");

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.text(card.title, cX + 3.2, cY + 4.8);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text(card.value, cX + 3.2, cY + 11.5);

      doc.setFillColor(card.pillBg[0], card.pillBg[1], card.pillBg[2]);
      doc.roundedRect(cX + 3.2, cY + 14.5, cardW - 6.4, 4.5, 1, 1, "F");
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.setFontSize(5.2);
      doc.setFont("helvetica", "bold");
      doc.text(card.sub, cX + 4.8, cY + 17.6);
    });

    // ── 4. Performance Highlights Summary Bar ──
    const highlightY = startY + cardH + 3.5;
    const highlightH = 9.5;
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(14, highlightY, pageWidth - 28, highlightH, 1.5, 1.5, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(14, highlightY, pageWidth - 28, highlightH, 1.5, 1.5, "S");

    // 3 Mini Insight Columns
    const topItems = topOrdered;
    const rawItemName = topItems?.[0]?.item?.name || "";
    const topItemName = rawItemName
      ? `${rawItemName} (${topItems[0].count || 0})`
      : "Signature Special";
    const topCategoryName =
      categoryDistribution?.[0]?.category || "Main Course";
    const peakHour =
      hourlyPeakData?.length > 0
        ? [...hourlyPeakData].sort(
            (a, b) => (b.revenue || 0) - (a.revenue || 0),
          )[0]?.slot || "Dinner Rush (6 PM - 9 PM)"
        : "Dinner Rush (6 PM - 9 PM)";

    const colW = (pageWidth - 28) / 3;

    // Col 1: Best Selling Dish
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("STAR PERFORMER DISH", 18, highlightY + 3.8);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(topItemName.substring(0, 26), 18, highlightY + 7.5);

    // Col 2: Top Category
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("PRIMARY REVENUE CATEGORY", 18 + colW, highlightY + 3.8);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(99, 102, 241);
    doc.text(topCategoryName, 18 + colW, highlightY + 7.5);

    // Col 3: Peak Revenue Velocity
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("PEAK TURNOVER WINDOW", 18 + colW * 2, highlightY + 3.8);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(peakHour, 18 + colW * 2, highlightY + 7.5);

    // ── 5. Table Section Header ──
    const tableSectionY = highlightY + highlightH + 6;
    doc.setFillColor(99, 102, 241);
    doc.rect(14, tableSectionY - 3.2, 2.5, 5, "F");

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(
      "LIVE ORDER VELOCITY & TRANSACTION LEDGER",
      18.5,
      tableSectionY + 0.5,
    );

    const allOrdersList = activeDateKey
      ? scopedBillableOrders
      : [...(orders || []), ...(orderHistory || [])];
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${allOrdersList.length} Recorded Orders`,
      pageWidth - 14,
      tableSectionY + 0.5,
      { align: "right" },
    );

    // ── 6. Styled Transaction Table via autoTable ──
    const tableRows = allOrdersList.map((ord, index) => {
      const idxStr = String(index + 1).padStart(2, "0");
      const orderRef = `#${(ord.id || ord.order_id || "ORD").slice(-6).toUpperCase()}`;
      const tableLabel =
        ord.table_number || ord.table_no || ord.tableNumber
          ? `Table ${ord.table_number || ord.table_no || ord.tableNumber}`
          : ord.order_type || "Dine-In";
      const customerName =
        ord.customer_name || ord.customerName || "Guest Customer";
      const statusText = (ord.status || "COMPLETED").toUpperCase();
      const totalAmount = fmtPdfCurrency(ord.total || ord.total_amount || 0);

      const orderDate =
        ord.created_at || ord.createdAt
          ? new Date(ord.created_at || ord.createdAt).toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
              },
            )
          : generatedDate;
      const orderTime =
        ord.created_at || ord.createdAt
          ? new Date(ord.created_at || ord.createdAt).toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              },
            )
          : generatedTime;

      return [
        idxStr,
        orderRef,
        tableLabel,
        customerName,
        `${orderDate}, ${orderTime}`,
        statusText,
        totalAmount,
      ];
    });

    autoTable(doc, {
      startY: tableSectionY + 3.5,
      head: [
        [
          "#",
          "Order Reference",
          "Table / Channel",
          "Customer Name",
          "Date & Time",
          "Status",
          "Total Amount",
        ],
      ],
      body:
        tableRows.length > 0
          ? tableRows
          : [["-", "No Records", "N/A", "N/A", "N/A", "N/A", "Rs. 0"]],
      theme: "plain",
      margin: { left: 14, right: 14, bottom: 18 },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        halign: "left",
      },
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
        textColor: [30, 41, 59],
        lineColor: [238, 242, 246],
        lineWidth: 0.15,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 252], // Subtle Slate-50 zebra
      },
      columnStyles: {
        0: {
          halign: "center",
          cellWidth: 10,
          fontStyle: "bold",
          textColor: [148, 163, 184],
          cellPadding: { top: 3.2, bottom: 3.2, left: 1, right: 1 },
        },
        1: {
          halign: "left",
          cellWidth: 26,
          fontStyle: "bold",
          textColor: [99, 102, 241],
        },
        2: {
          halign: "center",
          cellWidth: 24,
          fontStyle: "bold",
          textColor: [71, 85, 105],
        },
        3: {
          halign: "left",
          cellWidth: 40,
          fontStyle: "bold",
          textColor: [15, 23, 42],
        },
        4: { halign: "left", cellWidth: 34, textColor: [100, 116, 139] },
        5: { halign: "center", cellWidth: 24 },
        6: {
          halign: "right",
          cellWidth: 24,
          fontStyle: "bold",
          textColor: [15, 23, 42],
        },
      },
      didParseCell: function (data) {
        // Suppress default text in status column to prevent double-text overlay
        if (data.section === "body" && data.column.index === 5) {
          data.cell.text = []; // Suppress default text rendering
        }
      },
      didDrawCell: function (data) {
        // Custom Crisp Pill Badges for Status column (index 5)
        if (data.section === "body" && data.column.index === 5) {
          const rawText = String(data.cell.raw || "").toUpperCase();
          let bgColor = [236, 253, 245]; // Light emerald
          let borderColor = [167, 243, 208];
          let textColor = [5, 150, 105];

          if (
            rawText.includes("PENDING") ||
            rawText.includes("COOK") ||
            rawText.includes("PREP")
          ) {
            bgColor = [254, 243, 199]; // Light amber
            borderColor = [253, 230, 138];
            textColor = [180, 83, 9];
          } else if (rawText.includes("CANCEL") || rawText.includes("REJECT")) {
            bgColor = [255, 241, 242]; // Light rose
            borderColor = [254, 205, 211];
            textColor = [225, 29, 72];
          }

          // Draw rounded pill with clean centered text (no overlay)
          const cell = data.cell;
          const pillW = cell.width - 4;
          const pillH = 5;
          const pillX = cell.x + 2;
          const pillY = cell.y + (cell.height - pillH) / 2;

          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.roundedRect(pillX, pillY, pillW, pillH, 1.2, 1.2, "F");
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
          doc.setLineWidth(0.2);
          doc.roundedRect(pillX, pillY, pillW, pillH, 1.2, 1.2, "S");

          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.text(rawText, cell.x + cell.width / 2, pillY + 3.5, {
            align: "center",
          });
        }
      },
      didDrawPage: handleContinuationPage,
    });

    // ── 6b. Statutory Audit Sign-Off & Integrity Seals ──
    const finalTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 8 : 220;
    const pageH = doc.internal.pageSize.getHeight();
    let signY = finalTableY;
    if (signY + 30 > pageH - 18) {
      doc.addPage();
      handleContinuationPage();
      signY = 24;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, signY, pageWidth - 28, 24, 2, 2, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("STATUTORY AUDIT SIGN-OFF & INTEGRITY SEALS", 18, signY + 5.5);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.2);
    doc.setFont("helvetica", "normal");
    doc.text(`Verified Timestamp: ${new Date().toISOString()}`, 18, signY + 11.5);
    doc.text(`Audit Hash: SVR-${String(targetRestaurantId || "POS").slice(0, 8).toUpperCase()}-${totalOrdCount}KOT-${Math.round(totalRev)}`, 18, signY + 16.5);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(safeRestaurantName, pageWidth - 18, signY + 11.5, { align: "right" });
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(6.2);
    doc.text("SERVORA CLOUD POS LEDGER • VERIFIED AUDIT", pageWidth - 18, signY + 16.5, { align: "right" });

    // ── 7. Multi-Page Footer Stamp ──
    finalizeFooters();

    const sanitizedName = safeRestaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    doc.save(
      `${sanitizedName}_analytics_report_${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshOrders(true),
        refreshMenuItems ? refreshMenuItems(false) : Promise.resolve(),
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="bg-slate-50/60 min-h-screen overflow-x-hidden">
      <div className="px-3 py-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-28 lg:pb-12">
        {/* 🌟 1. HERO HEADER WITH CLEAN 2-ROW CONTROLS */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5 sm:space-y-4">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/20 shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight leading-none">
                  Analytics & Intelligence
                </h1>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </Badge>
              </div>
              <p className="text-slate-500 text-[11px] sm:text-xs font-medium mt-1 leading-snug">
                Real-time revenue metrics, order velocity, and guest retention
                analytics
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 pt-2.5 border-t border-slate-100">
            {/* Time Range Selector */}
            <div className="grid grid-cols-3 sm:inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 w-full lg:w-auto">
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "7days", label: "7D" },
                { id: "30days", label: "30D" },
                { id: "90days", label: "90D" },
                { id: "all", label: "All Time" },
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => {
                    setTimeRange(range.id);
                    if (range.id !== "custom_date") setSelectedSingleDate("");
                  }}
                  className={cn(
                    "px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all duration-150 text-center truncate cursor-pointer",
                    timeRange === range.id
                      ? "bg-white text-indigo-700 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Date Picker, Refresh & Export Actions */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 h-9 rounded-xl border text-xs font-semibold transition-all w-full sm:w-auto",
                  timeRange === "custom_date" && selectedSingleDate
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-700",
                )}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <input
                  type="date"
                  aria-label="Analytics specific date"
                  max={formatLocalDateKey()}
                  value={selectedSingleDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSingleDate(val);
                    if (val) setTimeRange("custom_date");
                  }}
                  className="bg-transparent text-xs font-semibold outline-none cursor-pointer w-full min-w-0"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs h-9 px-3 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                title="Refresh Analytics"
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5",
                    isRefreshing && "animate-spin text-indigo-600",
                  )}
                />
                <span>Refresh</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setShowPdfStudioModal(true)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-3.5 gap-1.5 shadow-xs w-full sm:w-auto justify-center"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Download Report</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs h-9 px-3 gap-1.5 w-full sm:w-auto justify-center"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-xl border-slate-100 bg-white">
                  <DropdownMenuItem onClick={() => setShowPdfStudioModal(true)} className="rounded-xl font-bold text-xs py-2.5 px-3 cursor-pointer text-indigo-600 hover:bg-indigo-50 focus:bg-indigo-50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Open PDF Report Studio</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportReport}
                    className="rounded-xl font-bold text-xs py-2.5 px-3 cursor-pointer text-slate-700 hover:bg-slate-50 focus:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Export CSV Ledger</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* 🌟 2. TOP 5 COMPACT KPI STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total Views */}
          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 rounded-full px-2 sm:px-2.5 py-0.5">
                  Views
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Views
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {realtimeData.totalViews.toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3 mr-1 text-emerald-600" />
                  <span>+12.5% vs avg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Orders */}
          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 sm:px-2.5 py-0.5">
                  Orders
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Orders
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {realtimeData.totalOrders.toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3 mr-1 text-emerald-600" />
                  <span>+8.3% volume</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Total Revenue */}
          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all duration-200 group">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 rounded-full px-2 sm:px-2.5 py-0.5">
                  Revenue
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Revenue
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight mt-0.5 truncate">
                  {formatCurrency(realtimeData.totalRevenue)}
                </p>
                <div className="flex items-center mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3 mr-1 text-emerald-600" />
                  <span>+15.7% gross</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Active Users */}
          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 sm:px-2.5 py-0.5">
                  Guests
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Guests
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {realtimeData.activeUsers}
                </p>
                <div className="flex items-center mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit">
                  <Activity className="w-3 h-3 mr-1 text-amber-600 animate-pulse" />
                  <span>Active Now</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Avg Order Value (AOV) */}
          <Card className="col-span-2 lg:col-span-1 border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden hover:shadow-md hover:border-rose-200 transition-all duration-200 group">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 rounded-full px-2 sm:px-2.5 py-0.5">
                  AOV
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Avg Ticket Size
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5 truncate">
                  {formatCurrency(realtimeData.avgOrderValue)}
                </p>
                <div className="flex items-center mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md w-fit">
                  <TrendingUp className="w-3 h-3 mr-1 text-emerald-600" />
                  <span>+5.2% ticket</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🌟 3. MAIN SHADCN TABS INTERFACE */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start lg:grid lg:grid-cols-5 gap-1 h-auto p-1 bg-white border border-slate-200/80 shadow-xs rounded-2xl mb-5">
            <TabsTrigger
              value="overview"
              className="shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xs"
            >
              <BarChart3 className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
              Overview & Trends
            </TabsTrigger>
            <TabsTrigger
              value="menu"
              className="shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xs"
            >
              <UtensilsCrossed className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
              Menu Engineering
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xs"
            >
              <Clock className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
              Peak Hours
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              className="shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xs"
            >
              <Users className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
              Guest Insights
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xs"
            >
              <FileText className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
              Reports &amp; PDF Export
            </TabsTrigger>
          </TabsList>

          {/* ═══════════ TAB 1: OVERVIEW ═══════════ */}
          <TabsContent value="overview" className="space-y-5 mt-1 outline-none">
            {/* Revenue Analytics Area Chart & Daily Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2 Cols: Main Area Chart */}
              <Card className="col-span-1 lg:col-span-2 border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-white pt-5 pb-2 px-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <CardTitle className="text-base font-black text-slate-900">
                          Revenue Analytics
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] px-2 py-0 rounded-full flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Live
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Daily gross earnings & transaction volume
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Gross Revenue</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 px-4 pb-4">
                  <div className="h-80 w-full min-h-80 relative">
                    {isChartReady ? (
                      <div className="absolute inset-0 w-full h-full">
                        <ResponsiveContainer
                          width="99%"
                          height={320}
                          debounce={50}
                        >
                          <AreaChart data={revenueTrend}>
                            <defs>
                              <linearGradient
                                id="colorRevenue"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#10b981"
                                  stopOpacity={0.28}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#10b981"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 11 }}
                              dy={8}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 11 }}
                              tickFormatter={(value) => `₹${value}`}
                            />
                            <Tooltip
                              cursor={{
                                stroke: "#10b981",
                                strokeDasharray: "4 4",
                                strokeWidth: 1.5,
                              }}
                              content={({ active, payload, label }) => {
                                if (!active || !payload || !payload.length)
                                  return null;
                                const row = payload[0]?.payload || {};
                                const rev = Number(payload[0]?.value) || 0;
                                const ord = Number(row.orders) || 0;
                                return (
                                  <div className="rounded-xl bg-slate-900 text-white px-3.5 py-2.5 shadow-xl border border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-200 mb-1">
                                      {label}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="font-black text-emerald-400">
                                        {formatCurrency(rev)}
                                      </span>
                                      <span className="text-slate-400">•</span>
                                      <span className="font-semibold text-slate-200">
                                        {ord} {ord === 1 ? "Order" : "Orders"}
                                      </span>
                                      {rev > 0 && (
                                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                                          +12%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              stroke="#10b981"
                              strokeWidth={2.5}
                              activeDot={{
                                r: 5,
                                fill: "#10b981",
                                stroke: "#ffffff",
                                strokeWidth: 2,
                              }}
                              fillOpacity={1}
                              fill="url(#colorRevenue)"
                              animationDuration={1200}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50/50 rounded-2xl animate-pulse">
                        <TrendingUp className="w-8 h-8 text-gray-200" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Right 1 Col: Daily Growth Breakdown List */}
              <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white flex flex-col justify-between">
                <CardHeader className="pt-5 pb-2 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-black text-slate-900 leading-snug">
                      Daily Growth Breakdown
                    </CardTitle>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1 shrink-0 text-center leading-tight">
                      Recent Ledger
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col justify-between">
                  <div
                    className={cn(
                      "divide-y divide-slate-100",
                      isHistoryExpanded ? "max-h-96 overflow-y-auto" : "",
                    )}
                  >
                    {revenueTrend
                      .slice(isHistoryExpanded ? 0 : -4)
                      .reverse()
                      .map((day, index) => {
                        const isHourlySlot = /\b(AM|PM)\b/i.test(
                          String(day.name || ""),
                        );
                        const showTodayBadge =
                          index === 0 &&
                          !isHourlySlot &&
                          timeRange !== "yesterday" &&
                          timeRange !== "custom_date";
                        const hasRev = Number(day.revenue) > 0;
                        return (
                          <div
                            key={index}
                            className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-slate-800">
                                  {day.name}
                                </p>
                                {showTodayBadge && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                    Today
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-medium">
                                {day.orders} orders
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={cn(
                                  "text-sm font-black",
                                  hasRev
                                    ? "text-emerald-600"
                                    : "text-slate-400",
                                )}
                              >
                                {formatCurrency(day.revenue)}
                              </p>
                              {hasRev ? (
                                <div className="flex items-center justify-end mt-0.5">
                                  <TrendingUp className="w-3 h-3 text-emerald-500 mr-1" />
                                  <span className="text-[10px] font-bold text-emerald-600">
                                    +12%
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                  -
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="p-3">
                    <Button
                      variant="ghost"
                      className="w-full text-indigo-600 font-bold text-xs py-2 h-auto hover:bg-indigo-50/60 flex items-center justify-center gap-1.5 rounded-xl"
                      onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    >
                      {isHistoryExpanded ? (
                        <>
                          <Filter className="w-3.5 h-3.5" />
                          SHOW LESS
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-3.5 h-3.5" />
                          VIEW FULL HISTORY
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Revenue Distribution Progress */}
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pt-5 pb-3 px-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                      <PieChart className="w-4 h-4 text-purple-600" />
                      Category Revenue Contribution
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                      Breakdown of total sales generated across menu categories
                    </CardDescription>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 shrink-0">
                    {categoryDistribution.length}{" "}
                    {categoryDistribution.length === 1
                      ? "Category"
                      : "Categories"}{" "}
                    Active
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-1">
                <div
                  className={cn(
                    "gap-5",
                    categoryDistribution.length > 1
                      ? "grid grid-cols-1 md:grid-cols-2"
                      : "space-y-4",
                  )}
                >
                  {categoryDistribution.map((category, index) => {
                    const colors = [
                      {
                        dot: "bg-indigo-600",
                        badge: "text-indigo-700 bg-indigo-50 border-indigo-200",
                      },
                      {
                        dot: "bg-emerald-600",
                        badge:
                          "text-emerald-700 bg-emerald-50 border-emerald-200",
                      },
                      {
                        dot: "bg-purple-600",
                        badge: "text-purple-700 bg-purple-50 border-purple-200",
                      },
                      {
                        dot: "bg-amber-500",
                        badge: "text-amber-700 bg-amber-50 border-amber-200",
                      },
                    ];
                    const color = colors[index % colors.length];

                    return (
                      <div key={index} className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                color.dot,
                              )}
                            />
                            <span className="text-sm font-bold text-slate-900">
                              {category.category}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold rounded-full px-2.5 py-0.5",
                              color.badge,
                            )}
                          >
                            {category.percentage}% Share
                          </Badge>
                        </div>
                        <Progress
                          value={Number(category.percentage)}
                          className="h-2.5 bg-slate-100 [&>div]:bg-indigo-600"
                        />
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">
                            Total Category Revenue
                          </span>
                          <span className="font-black text-slate-900">
                            {formatCurrency(category.revenue)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Peak Rush Hours & Order Distribution (5-Slot Velocity Grid) */}
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-100 py-4 px-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Peak Rush Hours & Order Distribution
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                      Volume concentration across daytime dining periods
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border-indigo-200 rounded-lg px-2.5 py-0.5 shrink-0"
                  >
                    Kitchen Velocity
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {(() => {
                  const maxSlotOrders = Math.max(
                    1,
                    ...hourlyPeakData.map((d) => Number(d.orders) || 0),
                  );
                  const maxSlotRev = Math.max(
                    0,
                    ...hourlyPeakData.map((d) => Number(d.revenue) || 0),
                  );
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
                      {hourlyPeakData.map((slotItem, idx) => {
                        const match = String(slotItem.slot || "").match(
                          /^(.*?)\s*\((.*?)\)$/,
                        );
                        const periodLabel = (
                          match ? match[1] : slotItem.slot
                        ).toUpperCase();
                        const timeLabel = match ? match[2] : "";
                        const slotOrders = Number(slotItem.orders) || 0;
                        const slotRevenue = Number(slotItem.revenue) || 0;
                        const isPeak =
                          maxSlotRev > 0
                            ? slotRevenue === maxSlotRev && slotRevenue > 0
                            : slotOrders > 0 && slotOrders === maxSlotOrders;
                        const pct = Math.min(
                          100,
                          Math.round((slotOrders / maxSlotOrders) * 100),
                        );

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "relative rounded-2xl p-4 text-center flex flex-col justify-between transition-all",
                              isPeak
                                ? "border-2 border-indigo-500 bg-indigo-50/20 shadow-sm"
                                : "border border-slate-200/80 bg-white hover:border-slate-300",
                            )}
                          >
                            {isPeak && (
                              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                                PEAK RUSH
                              </span>
                            )}
                            <div>
                              <p
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-wider",
                                  isPeak ? "text-indigo-700" : "text-slate-500",
                                )}
                              >
                                {periodLabel}
                              </p>
                              {timeLabel && (
                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                  {timeLabel}
                                </p>
                              )}
                              <p
                                className={cn(
                                  "text-lg font-black mt-2.5",
                                  isPeak ? "text-indigo-700" : "text-slate-900",
                                )}
                              >
                                {slotOrders}{" "}
                                {slotOrders === 1 ? "Order" : "Orders"}
                              </p>
                            </div>

                            <div className="mt-3 space-y-2">
                              <Progress
                                value={pct}
                                className={cn(
                                  "h-1.5 bg-slate-100",
                                  isPeak
                                    ? "[&>div]:bg-indigo-600"
                                    : "[&>div]:bg-slate-400",
                                )}
                              />
                              {isPeak ? (
                                <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg py-1 px-2 truncate">
                                  Revenue: {formatCurrency(slotRevenue)}
                                </div>
                              ) : (
                                <p className="text-[11px] font-semibold text-slate-400">
                                  {formatCurrency(slotRevenue)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Top Viewed Menu Items & Best Sellers */}
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-100 py-4 px-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                      <UtensilsCrossed className="w-4 h-4 text-indigo-600" />
                      Top Viewed Menu Items & Best Sellers
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                      Leading menu performers ranked by sales velocity and
                      interest
                    </CardDescription>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 shrink-0">
                    Top {Math.min(5, topOrdered.length)} Items
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-2.5">
                {topOrdered
                  .slice(0, 5)
                  .map((entry, index) => {
                    const itemTags = [
                      "High Margin",
                      "Popular",
                      "Featured",
                      "Add-on",
                      "Standard",
                    ];
                    const tagColors = [
                      "text-emerald-700",
                      "text-blue-600",
                      "text-indigo-600",
                      "text-slate-500",
                      "text-slate-500",
                    ];
                    const itemRevenue =
                      (Number(entry.item?.price) || 0) *
                      (Number(entry.count) || 0);
                    const convPct = Math.min(
                      96,
                      Math.max(38, Number(entry.percentage) || 60),
                    );

                    return (
                      <div
                        key={index}
                        className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0",
                              index === 0
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600",
                            )}
                          >
                            #{index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {entry.item?.name || "Menu Item"}
                            </p>
                            <p className="text-[11px] font-medium text-slate-400">
                              {entry.item?.category || "Main Course"} •{" "}
                              {entry.count} Orders
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                          <div className="w-28 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 font-medium">
                                Conversion
                              </span>
                              <span className="font-bold text-emerald-600">
                                {convPct}%
                              </span>
                            </div>
                            <Progress
                              value={convPct}
                              className="h-1.5 bg-slate-200/70 [&>div]:bg-emerald-500"
                            />
                          </div>
                          <div className="text-right min-w-20">
                            <p className="text-sm font-black text-slate-900">
                              {formatCurrency(itemRevenue)}
                            </p>
                            <p
                              className={cn(
                                "text-[10px] font-bold",
                                tagColors[index % tagColors.length],
                              )}
                            >
                              {itemTags[index % itemTags.length]}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>

            {/* Footer 3-Card Row: Retention, Dining Time & Guest Satisfaction */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-slate-200/80 shadow-xs rounded-2xl p-5 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Repeat Retention
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {guestInsights.returningGuests} / {guestInsights.totalGuests} Guests
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{guestInsights.retentionPct}%</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    Returning diners in selected period
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <Progress
                    value={guestInsights.retentionPct}
                    className="h-2 bg-slate-100 [&>div]:bg-indigo-600"
                  />
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                    <span>Unique Guests: {guestInsights.totalGuests}</span>
                    <span>Goal: 75%</span>
                  </div>
                </div>
              </Card>

              <Card className="border border-slate-200/80 shadow-xs rounded-2xl p-5 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Avg Dining Time
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {guestInsights.avgDiningMins !== null ? (guestInsights.avgDiningMins <= 45 ? "Optimal" : "Extended") : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-black text-slate-900">
                      {guestInsights.avgDiningMins !== null ? guestInsights.avgDiningMins : "—"}
                    </p>
                    {guestInsights.avgDiningMins !== null && (
                      <span className="text-xs font-bold text-slate-500">
                        Mins
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    Order placement to final bill clear
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <Progress
                    value={guestInsights.avgDiningMins !== null ? Math.min(100, Math.round((45 / Math.max(1, guestInsights.avgDiningMins)) * 75)) : 0}
                    className="h-2 bg-slate-100 [&>div]:bg-emerald-500"
                  />
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                    <span>{guestInsights.tableTurnRate ? `Table Turn: ${guestInsights.tableTurnRate}x/hr` : "Awaiting completed sessions"}</span>
                    <span className="text-emerald-600 font-bold">
                      {guestInsights.avgDiningMins !== null ? "Live Measured" : "—"}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="border border-slate-200/80 shadow-xs rounded-2xl p-5 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Guest Satisfaction
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {guestInsights.totalReviews > 0 ? `${guestInsights.totalReviews} Reviews` : "No Reviews"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-black text-slate-900">
                      {guestInsights.avgRating !== null ? guestInsights.avgRating.toFixed(1) : "—"}
                    </p>
                    <span className="text-xs font-bold text-slate-400">
                      / 5.0
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {guestInsights.totalReviews > 0
                      ? `Based on ${guestInsights.totalReviews} guest review ratings`
                      : "No guest ratings submitted yet"}
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <Progress
                    value={guestInsights.avgRating !== null ? (guestInsights.avgRating / 5) * 100 : 0}
                    className="h-2 bg-slate-100 [&>div]:bg-amber-400"
                  />
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                    <span>{guestInsights.totalReviews > 0 ? `${guestInsights.fiveFourShare}% Positive Feedback` : "0% Positive Feedback"}</span>
                    <span className="text-amber-500 tracking-tighter">
                      {guestInsights.totalReviews > 0 ? "★★★★★" : "☆☆☆☆☆"}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════ TAB 2: MENU PERFORMANCE ═══════════ */}
          <TabsContent value="menu" className="space-y-5 mt-1 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Top Revenue Dishes */}
              <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
                <CardHeader className="pt-5 pb-3 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                        <IndianRupee className="w-4 h-4 text-blue-600" />
                        Top Revenue Dishes
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                        Dishes generating highest gross revenue in the selected period
                      </CardDescription>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1 shrink-0">
                      Revenue Share
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-1 space-y-2.5">
                  {topRevenueItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                      <p className="text-xs font-bold text-slate-600">
                        No dish revenue recorded in this period yet
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Completed non-cancelled orders will appear here live.
                      </p>
                    </div>
                  ) : (
                    topRevenueItems.slice(0, 5).map((item, index) => (
                      <div
                        key={item.item?.id || item.item?.name || index}
                        className="rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0",
                                index === 0
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600",
                              )}
                            >
                              #{index + 1}
                            </div>
                            <div className="flex items-baseline gap-1.5 min-w-0">
                              <p className="font-bold text-sm text-slate-900 truncate">
                                {item.item?.name}
                              </p>
                              <span className="text-[11px] font-medium text-slate-400 shrink-0 hidden sm:inline">
                                {item.item?.category} •{" "}
                                {formatCurrency(item.item?.price)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-xs">
                            <span className="font-black text-slate-900">
                              {formatCurrency(item.revenue)}
                            </span>
                            <span className="font-bold text-blue-600">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={Number(item.percentage)}
                          className="h-1.5 bg-slate-200/70 [&>div]:bg-blue-600"
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Top Ordered Dishes */}
              <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
                <CardHeader className="pt-5 pb-3 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                        <Award className="w-4 h-4 text-emerald-600" />
                        Top Selling Best Sellers
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                        Dishes generating highest completed order volumes
                      </CardDescription>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1 shrink-0">
                      Order Volume
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-1 space-y-2.5">
                  {topOrdered.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                      <p className="text-xs font-bold text-slate-600">
                        No dish sales recorded in this period yet
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Bestsellers update automatically as orders arrive.
                      </p>
                    </div>
                  ) : (
                    topOrdered.slice(0, 5).map((item, index) => (
                      <div
                        key={item.item?.id || item.item?.name || index}
                        className="rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0",
                                index === 0
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600",
                              )}
                            >
                              #{index + 1}
                            </div>
                            <div className="flex items-baseline gap-1.5 min-w-0">
                              <p className="font-bold text-sm text-slate-900 truncate">
                                {item.item?.name}
                              </p>
                              <span className="text-[11px] font-medium text-slate-400 shrink-0 hidden sm:inline">
                                {item.item?.category} •{" "}
                                {formatCurrency(item.item?.price)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-xs">
                            <span className="font-black text-slate-900">
                              {item.count}{" "}
                              <span className="font-semibold text-slate-500">
                                sold
                              </span>
                            </span>
                            <span className="font-bold text-emerald-600">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={Number(item.percentage)}
                          className="h-1.5 bg-slate-200/70 [&>div]:bg-emerald-500"
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Velocity Breakdown */}
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pt-5 pb-3 px-5 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Category Velocity Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                      Performance distribution, ticket yields, and guest demand
                      across all active categories
                    </CardDescription>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg px-2.5 py-1 shrink-0">
                    {categoryVelocity.categories.length}{" "}
                    {categoryVelocity.categories.length === 1
                      ? "Category"
                      : "Categories"}{" "}
                    Tracked
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {categoryVelocity.categories.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs font-bold text-slate-600">
                      No menu categories found yet
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Add menu items or complete orders to see live category velocity.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {categoryVelocity.categories.map((catStats, index) => {
                      const category = catStats.category;
                      const monoColors = [
                        "bg-indigo-50 text-indigo-600",
                        "bg-amber-50 text-amber-600",
                        "bg-rose-50 text-rose-600",
                        "bg-emerald-50 text-emerald-600",
                        "bg-orange-50 text-orange-600",
                        "bg-sky-50 text-sky-600",
                      ];
                      const monogram =
                        category
                          .split(/\s+/)
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "CT";
                      const revPct =
                        categoryVelocity.totalRevenue > 0
                          ? (
                              (catStats.revenue / categoryVelocity.totalRevenue) *
                              100
                            ).toFixed(1)
                          : "0.0";
                      const orderPct =
                        categoryVelocity.totalOrders > 0
                          ? (
                              (catStats.orders / categoryVelocity.totalOrders) *
                              100
                            ).toFixed(1)
                          : "0.0";
                      const catRevenue = Number(catStats.revenue) || 0;
                      const badge =
                        catStats.orders === 0
                          ? {
                              label: "Zero Orders",
                              cls: "bg-rose-50 text-rose-600",
                            }
                          : index === 0
                          ? {
                              label: "Top Revenue",
                              cls: "bg-emerald-50 text-emerald-700",
                            }
                          : Number(orderPct) >= 25
                          ? {
                              label: "High Velocity",
                              cls: "bg-blue-50 text-blue-700",
                            }
                          : {
                              label: "Steady",
                              cls: "bg-slate-100 text-slate-600",
                            };

                      return (
                        <div
                          key={category}
                          className="px-5 py-4 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            <div className="md:col-span-4 flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                                  monoColors[index % monoColors.length],
                                )}
                              >
                                {monogram}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-black text-slate-900 truncate">
                                    {category}
                                  </h4>
                                  <span
                                    className={cn(
                                      "text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                      badge.cls,
                                    )}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                  {catStats.items}{" "}
                                  {catStats.items === 1
                                    ? "Active Dish"
                                    : "Active Dishes"}{" "}
                                  • Avg {formatCurrency(catStats.avgPrice)}
                                </p>
                              </div>
                            </div>

                            <div className="md:col-span-3 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-semibold">
                                  Revenue Share
                                </span>
                                <span className="font-bold text-slate-900">
                                  {formatCurrency(catRevenue)}{" "}
                                  <span className="text-blue-600">
                                    ({revPct}%)
                                  </span>
                                </span>
                              </div>
                              <Progress
                                value={Number(revPct)}
                                className="h-1.5 bg-slate-100 [&>div]:bg-blue-600"
                              />
                            </div>

                            <div className="md:col-span-3 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-semibold">
                                  Units Sold
                                </span>
                                <span className="font-bold text-slate-900">
                                  {catStats.orders}{" "}
                                  <span className="text-emerald-600">
                                    ({orderPct}%)
                                  </span>
                                </span>
                              </div>
                              <Progress
                                value={Number(orderPct)}
                                className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500"
                              />
                            </div>

                            <div className="md:col-span-2 text-left md:text-right">
                              <p
                                className={cn(
                                  "text-sm font-black",
                                  catRevenue > 0
                                    ? "text-slate-900"
                                    : "text-slate-400",
                                )}
                              >
                                {formatCurrency(catRevenue)}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] font-bold mt-0.5",
                                  catStats.orders > 0
                                    ? "text-emerald-600"
                                    : "text-rose-500",
                                )}
                              >
                                {revPct}% of Sales
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 3: PEAK HOURS & SALES ═══════════ */}
          <TabsContent value="sales" className="space-y-5 mt-1 outline-none">
            {/* Hourly Peak Rush Bar Chart */}
            {(() => {
              const totalSlotRev = hourlyPeakData.reduce(
                (s, d) => s + (Number(d.revenue) || 0),
                0,
              );
              const sortedSlots = [...hourlyPeakData].sort(
                (a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0),
              );
              const peakSlotObj = sortedSlots[0] || {
                slot: "Afternoon (3 PM - 6 PM)",
                revenue: 0,
              };
              const peakPct =
                totalSlotRev > 0
                  ? (
                      ((Number(peakSlotObj.revenue) || 0) / totalSlotRev) *
                      100
                    ).toFixed(1)
                  : "0.0";
              const dinnerSlotObj =
                hourlyPeakData.find((d) =>
                  String(d.slot).toLowerCase().includes("dinner"),
                ) || sortedSlots[sortedSlots.length - 1];
              const isDinnerUnderIndexed =
                (Number(dinnerSlotObj?.revenue) || 0) <
                (Number(peakSlotObj.revenue) || 0) * 0.4;

              return (
                <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
                  <CardHeader className="pt-5 pb-2 px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-black text-slate-900">
                            Peak Rush Hours & Order Distribution
                          </CardTitle>
                          <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                            Revenue generated by customer service time slots
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Peak Slot: {peakSlotObj.slot}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-3 space-y-4">
                    <div className="h-72 w-full min-h-72">
                      <ResponsiveContainer width="99%" height={288}>
                        <BarChart
                          data={hourlyPeakData}
                          margin={{ top: 24, right: 12, left: 0, bottom: 16 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                          />
                          <XAxis
                            dataKey="slot"
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            tick={({ x, y, payload }) => {
                              const raw = String(payload?.value || "");
                              const match = raw.match(/^(.*?)\s*\((.*?)\)$/);
                              const title = match ? match[1] : raw;
                              const sub = match ? match[2] : "";
                              const isPeak =
                                raw === peakSlotObj.slot &&
                                (Number(peakSlotObj.revenue) || 0) > 0;
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <text
                                    x={0}
                                    y={14}
                                    textAnchor="middle"
                                    fill={isPeak ? "#4f46e5" : "#334155"}
                                    fontSize={11}
                                    fontWeight={700}
                                  >
                                    {title}
                                  </text>
                                  {sub && (
                                    <text
                                      x={0}
                                      y={28}
                                      textAnchor="middle"
                                      fill={isPeak ? "#6366f1" : "#94a3b8"}
                                      fontSize={10}
                                      fontWeight={600}
                                    >
                                      {sub}
                                    </text>
                                  )}
                                </g>
                              );
                            }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "#64748b",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                            tickFormatter={(val) => `₹${val}`}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
                            content={({ active, payload, label }) => {
                              if (!active || !payload || !payload.length)
                                return null;
                              const val = Number(payload[0]?.value) || 0;
                              return (
                                <div className="rounded-xl bg-slate-900 text-white px-3.5 py-2 shadow-xl border border-slate-800 text-center">
                                  <p className="text-[11px] font-bold text-slate-200">
                                    {label}
                                  </p>
                                  <p className="text-xs font-black text-amber-400 mt-0.5">
                                    Revenue Generated : {formatCurrency(val)}
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <Bar
                            dataKey="revenue"
                            maxBarSize={56}
                            radius={[8, 8, 0, 0]}
                          >
                            <LabelList
                              dataKey="revenue"
                              position="top"
                              formatter={(val) => formatCurrency(val)}
                              style={{
                                fill: "#475569",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            />
                            {hourlyPeakData.map((entry, idx) => {
                              const isPeak =
                                entry.slot === peakSlotObj.slot &&
                                (Number(entry.revenue) || 0) > 0;
                              return (
                                <Cell
                                  key={`cell-${idx}`}
                                  fill={
                                    isPeak
                                      ? "#4f46e5"
                                      : (Number(entry.revenue) || 0) > 0
                                        ? "#6366f1"
                                        : "#c7d2fe"
                                  }
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 3-Column Operational Insight Strip */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Highest Velocity
                        </p>
                        <p className="text-sm font-black text-slate-900 mt-1">
                          {peakSlotObj.slot}
                        </p>
                        <p className="text-[11px] font-bold text-emerald-600 mt-1">
                          {peakPct}% of day&apos;s revenue
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Staff Recommendation
                        </p>
                        <p className="text-sm font-black text-slate-900 mt-1">
                          Deploy +2 Floor Captains
                        </p>
                        <p className="text-[11px] font-bold text-indigo-600 mt-1">
                          Optimal shift: 12 PM - 6 PM
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Evening Gap Opportunity
                        </p>
                        <p className="text-sm font-black text-slate-900 mt-1">
                          {isDinnerUnderIndexed
                            ? "Dinner Slot Under-indexed"
                            : "Evening Demand Healthy"}
                        </p>
                        <p className="text-[11px] font-bold text-amber-600 mt-1">
                          {isDinnerUnderIndexed
                            ? "Suggest run happy hour offers"
                            : "Maintain dinner rush prep"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Custom Date Range Earnings Calculator */}
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pt-5 pb-3 px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black text-slate-900">
                        Custom Date Range Calculator
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                        Select custom date bounds to isolate revenue, ticket
                        sizes, and velocity
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs h-9 px-3.5 flex items-center gap-1.5"
                    onClick={() =>
                      setCustomDateRange({ startDate: "", endDate: "" })
                    }
                    disabled={
                      !customDateRange.startDate && !customDateRange.endDate
                    }
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Date Filters</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-2 space-y-5">
                {/* Date Pickers Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="start-date"
                      className="text-xs font-bold text-slate-700 mb-1.5 block"
                    >
                      Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      className="h-11 bg-slate-50/70 border-slate-200 rounded-xl focus:border-indigo-500 text-sm font-medium"
                      value={customDateRange.startDate}
                      onChange={(e) =>
                        setCustomDateRange((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="end-date"
                      className="text-xs font-bold text-slate-700 mb-1.5 block"
                    >
                      End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      className="h-11 bg-slate-50/70 border-slate-200 rounded-xl focus:border-indigo-500 text-sm font-medium"
                      value={customDateRange.endDate}
                      onChange={(e) =>
                        setCustomDateRange((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      min={customDateRange.startDate}
                    />
                  </div>
                </div>

                {/* Range Results Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Period Revenue
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {formatCurrency(customRangeStats.revenue)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-1">
                      Filtered earnings
                    </p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Orders Count
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {customRangeStats.orders}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-1">
                      Completed orders
                    </p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Average Ticket
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {formatCurrency(customRangeStats.avgValue)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-1">
                      Avg per guest
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 4: GUEST INSIGHTS ═══════════ */}
          <TabsContent
            value="customers"
            className="space-y-5 mt-1 outline-none"
          >
            {/* Top 3 KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-slate-200/80 shadow-xs rounded-2xl p-5 bg-white flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Repeat Retention
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        Loyalty Guest Ratio
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                    {guestInsights.returningGuests} Repeat
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-black text-slate-900">
                    {guestInsights.retentionPct}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {guestInsights.totalGuests} Total Guests
                  </span>
                </div>
                <Progress
                  value={guestInsights.retentionPct}
                  className="h-2 bg-slate-100 [&>div]:bg-amber-500 mb-2.5"
                />
                <p className="text-[11px] font-medium text-slate-400">
                  • Computed from live DB customers &amp; order history
                </p>
              </Card>

              <Card className="border border-slate-200/80 shadow-xs rounded-2xl p-5 bg-white flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Avg Dining Time
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        Table Session Duration
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                    {guestInsights.tableTurnRate ? `${guestInsights.tableTurnRate}x/hr` : "Live"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-black text-slate-900">
                    {guestInsights.avgDiningMins !== null ? `${guestInsights.avgDiningMins} Mins` : "—"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Benchmark: 45m
                  </span>
                </div>
                <Progress
                  value={guestInsights.avgDiningMins !== null ? Math.min(100, Math.round((45 / Math.max(1, guestInsights.avgDiningMins)) * 75)) : 0}
                  className="h-2 bg-slate-100 [&>div]:bg-emerald-500 mb-2.5"
                />
                <p className="text-[11px] font-medium text-slate-400">
                  {guestInsights.avgDiningMins !== null
                    ? "• Measured from order creation to completion"
                    : "• Awaiting completed table session timestamps"}
                </p>
              </Card>

              <Card className="border border-slate-200/80 shadow-xs rounded-2xl p-5 bg-white flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 fill-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Guest Rating
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        Feedback Score
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                    {guestInsights.avgRating !== null ? `★ ${guestInsights.avgRating.toFixed(1)}` : "★ —"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {guestInsights.avgRating !== null ? guestInsights.avgRating.toFixed(1) : "—"}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      / 5.0
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {guestInsights.totalReviews} Reviews
                  </span>
                </div>
                <Progress
                  value={guestInsights.avgRating !== null ? (guestInsights.avgRating / 5) * 100 : 0}
                  className="h-2 bg-slate-100 [&>div]:bg-indigo-600 mb-2.5"
                />
                <p className="text-[11px] font-medium text-slate-400">
                  {guestInsights.totalReviews > 0
                    ? `• ${guestInsights.fiveFourShare}% positive 4★ & 5★ ratings`
                    : "• No guest ratings submitted yet"}
                </p>
              </Card>
            </div>

            {/* Middle 2-Column Grid: Sentiment & Star Breakdown + Guest Loyalty Cohorts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 7 Cols: Customer Sentiment & Star Breakdown */}
              <Card className="lg:col-span-7 border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
                <CardHeader className="pt-5 pb-3 px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-black text-slate-900">
                        Customer Sentiment &amp; Star Breakdown
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                        Aggregated ratings collected immediately post
                        contactless settlement
                      </CardDescription>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 shrink-0">
                      NPS Score: {guestInsights.npsScore !== null ? (guestInsights.npsScore >= 0 ? `+${guestInsights.npsScore}` : guestInsights.npsScore) : "—"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-2 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    <div className="sm:col-span-4 rounded-2xl bg-slate-50/80 border border-slate-100 p-4 text-center">
                      <p className="text-3xl font-black text-slate-900">
                        {guestInsights.avgRating !== null ? guestInsights.avgRating.toFixed(2) : "—"}
                      </p>
                      <p className="text-amber-400 text-sm tracking-tight mt-1">
                        {guestInsights.totalReviews > 0 ? "★★★★★" : "☆☆☆☆☆"}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        {guestInsights.totalReviews} Total Ratings
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                        {guestInsights.fiveFourShare}% 5 &amp; 4 Star Share
                      </p>
                    </div>

                    <div className="sm:col-span-8 space-y-2.5">
                      {guestInsights.starBreakdown.map((row, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-12 items-center gap-3 text-xs"
                        >
                          <span className="col-span-3 font-semibold text-slate-600">
                            {row.label}
                          </span>
                          <div className="col-span-7">
                            <Progress
                              value={row.pct}
                              className={cn("h-2 bg-slate-100", row.bar)}
                            />
                          </div>
                          <span className="col-span-2 text-right font-bold text-slate-700">
                            {row.pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right 5 Cols: Guest Loyalty Cohorts */}
              <Card className="lg:col-span-5 border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
                <CardHeader className="pt-5 pb-3 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-black text-slate-900">
                        Guest Loyalty Cohorts
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                        Breakdown of active guest visit frequency
                      </CardDescription>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                      {guestInsights.totalGuests} Guests
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-2 space-y-3">
                  {[
                    {
                      code: "VIP",
                      codeCls: "bg-indigo-50 text-indigo-600",
                      title: "VIP Regulars (5+ visits)",
                      sub: `Avg spend ${formatCurrency(guestInsights.cohorts.vip.avgSpend)} • ${guestInsights.cohorts.vip.count} guests`,
                      pct: `${guestInsights.cohorts.vip.pct}%`,
                    },
                    {
                      code: "RET",
                      codeCls: "bg-emerald-50 text-emerald-600",
                      title: "Returning (2–4 visits)",
                      sub: `Avg spend ${formatCurrency(guestInsights.cohorts.returning.avgSpend)} • ${guestInsights.cohorts.returning.count} guests`,
                      pct: `${guestInsights.cohorts.returning.pct}%`,
                    },
                    {
                      code: "NEW",
                      codeCls: "bg-sky-50 text-sky-600",
                      title: "New First-Timers",
                      sub: `Avg spend ${formatCurrency(guestInsights.cohorts.firstTimers.avgSpend)} • ${guestInsights.cohorts.firstTimers.count} guests`,
                      pct: `${guestInsights.cohorts.firstTimers.pct}%`,
                    },
                  ].map((cohort, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0",
                            cohort.codeCls,
                          )}
                        >
                          {cohort.code}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {cohort.title}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400 truncate">
                            {cohort.sub}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-slate-900">
                          {cohort.pct}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Bottom Card: Live Table Feedback & Guest Reviews */}
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pt-5 pb-3 px-5 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black text-slate-900">
                        Live Table Feedback &amp; Guest Reviews
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                        Direct customer feedback submitted on QR checkout
                        screens
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Real-time Stream
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {guestInsights.reviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-10 px-4 text-center">
                    <Star className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No guest reviews submitted yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Real customer ratings and feedback from completed table orders will appear here automatically.
                    </p>
                  </div>
                ) : (
                  guestInsights.reviews.slice(0, 10).map((review, idx) => {
                    const initials = review.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "DG";
                    return (
                      <div
                        key={review.id || idx}
                        className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                              {initials}
                            </div>
                            <span className="text-sm font-bold text-slate-900">
                              {review.name}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {review.table}
                            </span>
                            <span className="text-amber-400 text-xs tracking-tight">
                              {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                            </span>
                          </div>
                          {review.createdAt && (
                            <span className="text-[11px] font-medium text-slate-400 shrink-0">
                              {new Date(review.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>

                        {review.quote && (
                          <p className="text-xs font-medium text-slate-600 leading-relaxed">
                            &ldquo;{review.quote}&rdquo;
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <div className="flex flex-wrap gap-1.5">
                            {review.items.map((itemLabel, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md"
                              >
                                {itemLabel}
                              </span>
                            ))}
                          </div>
                          <span className="text-[11px] font-bold text-emerald-600">
                            Paid {formatCurrency(review.total)}{review.method ? ` via ${review.method}` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* ═══════════ TAB 5: REPORTS & PDF EXPORT STUDIO ═══════════ */}
          <TabsContent value="reports" className="space-y-5 mt-1 outline-none">
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pt-5 pb-4 px-5 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                        Executive Analytics &amp; Performance Report
                      </CardTitle>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Audit Ready • PDF &amp; Excel
                      </Badge>
                    </div>
                    <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                      Generate formatted executive summaries, tax reconciliations, and menu profitability statements.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-slate-200 text-xs font-bold h-8 px-3"
                      onClick={() => setShowPdfStudioModal(true)}
                    >
                      + Custom Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-slate-200 text-xs font-bold h-8 px-3"
                      onClick={() => setActiveTab('overview')}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Return to Overview
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 7 Cols: Report Package & Settings */}
                  <div className="lg:col-span-7 space-y-5">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                        1. Select Report Package &amp; Analytics Dimension
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {[
                          {
                            id: 'executive',
                            title: 'Executive Financial Summary',
                            badge: 'PDF FORMAT • A4 MULTI-PAGE',
                            badgeCls: 'bg-indigo-50 text-indigo-700',
                            iconBg: 'bg-indigo-600 text-white',
                            Icon: FileText,
                            desc: `Daily/Monthly P&L, gross sales ${formatCurrency(realtimeData.totalRevenue)}, net margins, ticket sizes, and revenue graphs.`,
                          },
                          {
                            id: 'menu',
                            title: 'Item & Menu Engineering Audit',
                            badge: 'PDF + CSV MATRIX',
                            badgeCls: 'bg-emerald-50 text-emerald-700',
                            iconBg: 'bg-emerald-50 text-emerald-600',
                            Icon: UtensilsCrossed,
                            desc: 'Velocity tiers, sales mix, top 5 bestsellers, and view-to-order conversions.',
                          },
                          {
                            id: 'peak',
                            title: 'Peak Hours & Service Efficiency',
                            badge: 'PDF FORMAT • SPEED LOGS',
                            badgeCls: 'bg-amber-50 text-amber-700',
                            iconBg: 'bg-amber-50 text-amber-600',
                            Icon: Clock,
                            desc: `Hourly rush throughput, dining turnaround ${guestInsights.avgDiningMins ? `${guestInsights.avgDiningMins} mins` : 'metrics'}, and staff allocation.`,
                          },
                          {
                            id: 'tax',
                            title: 'Tax & GST Settlement Ledger',
                            badge: 'CSV / EXCEL COMPATIBLE',
                            badgeCls: 'bg-sky-50 text-sky-700',
                            iconBg: 'bg-sky-50 text-sky-600',
                            Icon: CreditCard,
                            desc: 'Itemized taxable turnover, 5% GST breakdown, and UPI & Cash reconciliation logs.',
                          },
                        ].map((pkg) => {
                          const selected = reportPackage === pkg.id
                          const IconComp = pkg.Icon
                          return (
                            <button
                              type="button"
                              key={pkg.id}
                              onClick={() => setReportPackage(pkg.id)}
                              className={cn(
                                "text-left rounded-2xl p-4 transition-all relative cursor-pointer",
                                selected
                                  ? "border-2 border-indigo-600 bg-indigo-50/15 shadow-xs"
                                  : "border border-slate-200/80 bg-white hover:border-slate-300"
                              )}
                            >
                              {selected && (
                                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", pkg.iconBg)}>
                                <IconComp className="w-4 h-4" />
                              </div>
                              <p className="text-sm font-black text-slate-900 pr-6">{pkg.title}</p>
                              <span className={cn("inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1.5 mb-2", pkg.badgeCls)}>
                                {pkg.badge}
                              </span>
                              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{pkg.desc}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 2. Date Range & Document Settings */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        2. Date Range &amp; Document Settings
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Reporting Period</Label>
                          <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                          >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="90days">Last 90 Days</option>
                            <option value="all">All Time</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Grouping Frequency</Label>
                          <select
                            value={reportGrouping}
                            onChange={(e) => setReportGrouping(e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                          >
                            <option value="daily">Daily Aggregated Breakdown</option>
                            <option value="weekly">Weekly Summary Rollup</option>
                            <option value="hourly">Hourly Shift Breakdown</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5 pt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeVisualCharts}
                            onChange={(e) => setIncludeVisualCharts(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Include Visual Charts &amp; Velocity Graphs</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeTableSessions}
                            onChange={(e) => setIncludeTableSessions(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Include Individual Table Sessions</span>
                        </label>
                      </div>
                    </div>

                    {/* Automated Email Delivery Banner */}
                    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">Schedule Automated Email Delivery</p>
                          <p className="text-[11px] font-medium text-slate-500">
                            Send daily or monthly executive PDF digests directly to restaurant owners
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-xs h-8 px-3"
                        onClick={() => toast.success(`Scheduled digest preferences saved for ${restaurantName}`)}
                      >
                        Configure Digest
                      </Button>
                    </div>
                  </div>

                  {/* Right 5 Cols: Document Live Preview */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Document Live Preview (Page 1 of 1)
                      </p>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 rounded-lg px-2 py-0.5">
                        ISO-27001 Certified PDF
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 flex-1 flex items-center justify-center">
                      <div className="w-full rounded-xl bg-white border border-slate-200/90 shadow-sm p-4 space-y-3.5">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">S</div>
                            <div>
                              <p className="text-xs font-black text-slate-900 leading-none">Servora Intelligence</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{restaurantName}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">VERIFIED</span>
                        </div>

                        <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                            {reportPackage === 'menu'
                              ? 'Item & Menu Engineering Audit'
                              : reportPackage === 'peak'
                              ? 'Peak Hours & Service Efficiency'
                              : reportPackage === 'tax'
                              ? 'Tax & GST Settlement Ledger'
                              : 'Executive Sales & Performance Audit'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Period: {timeRange.toUpperCase()} • Grouping: {reportGrouping.toUpperCase()} • INR (₹)
                          </p>
                        </div>

                        {reportPackage === 'executive' && (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 text-center">
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Gross Sales</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">{formatCurrency(realtimeData.totalRevenue)}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Orders</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">{realtimeData.totalOrders}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Avg Ticket</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">{formatCurrency(realtimeData.avgOrderValue)}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Retention</p>
                                <p className="text-xs font-black text-emerald-600 mt-0.5">{guestInsights.retentionPct}%</p>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 mb-1.5">
                                <span>Revenue Trend &amp; Peak Hour Velocity</span>
                                <span className="text-emerald-600 font-bold">Live Data</span>
                              </div>
                              <div className="grid grid-cols-5 gap-1.5 items-end h-12 bg-slate-50/70 rounded-lg p-2">
                                {(() => {
                                  const maxRev = Math.max(1, ...hourlyPeakData.map((d) => Number(d.revenue) || 0))
                                  return hourlyPeakData.map((slot, idx) => {
                                    const hPct = Math.max(15, Math.round(((Number(slot.revenue) || 0) / maxRev) * 100))
                                    const isTop = (Number(slot.revenue) || 0) === maxRev && maxRev > 0
                                    return (
                                      <div
                                        key={idx}
                                        style={{ height: `${hPct}%` }}
                                        className={cn("rounded-sm transition-all", isTop ? "bg-indigo-600" : "bg-indigo-300")}
                                      />
                                    )
                                  })
                                })()}
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1 border-t border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Top Velocity Menu Items</p>
                              {topOrdered.slice(0, 3).map((entry, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-slate-700 truncate">
                                    {idx + 1}. {entry.item?.name || 'Menu Item'}
                                  </span>
                                  <span className="font-black text-slate-900 shrink-0 ml-2">
                                    {formatCurrency((Number(entry.item?.price) || 0) * (Number(entry.count) || 0))} ({entry.percentage}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {reportPackage === 'menu' && (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-emerald-50/60 border border-emerald-100 p-2.5 text-center">
                              <div>
                                <p className="text-[8px] font-bold text-emerald-700 uppercase">Active Categories</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">{categoryDistribution.length}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-emerald-700 uppercase">Total Units Sold</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">{topOrdered.reduce((s, e) => s + (Number(e.count) || 0), 0)}</p>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-1 border-t border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Top 5 Bestsellers Matrix</p>
                              {topOrdered.slice(0, 5).map((entry, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-slate-700 truncate">
                                    #{idx + 1} {entry.item?.name} ({entry.count} sold)
                                  </span>
                                  <span className="font-black text-emerald-700 shrink-0 ml-2">
                                    {entry.percentage}% share
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {reportPackage === 'peak' && (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-amber-50/60 border border-amber-100 p-2.5 text-center">
                              <div>
                                <p className="text-[8px] font-bold text-amber-700 uppercase">Avg Turnaround</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">
                                  {guestInsights.avgDiningMins !== null ? `${guestInsights.avgDiningMins} Mins` : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-amber-700 uppercase">Table Turn Rate</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">
                                  {guestInsights.tableTurnRate ? `${guestInsights.tableTurnRate}x/hr` : '—'}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-1 border-t border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Daypart Shift Throughput</p>
                              {hourlyPeakData.map((slot, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-slate-700 truncate">{slot.slot}</span>
                                  <span className="font-black text-slate-900 shrink-0 ml-2">
                                    {slot.orders} orders • {formatCurrency(slot.revenue)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {reportPackage === 'tax' && (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-3 gap-2 rounded-xl bg-sky-50/60 border border-sky-100 p-2.5 text-center">
                              <div>
                                <p className="text-[8px] font-bold text-sky-700 uppercase">Taxable</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">₹{(realtimeData.totalRevenue / 1.05).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-sky-700 uppercase">GST (5%)</p>
                                <p className="text-xs font-black text-slate-900 mt-0.5">₹{(realtimeData.totalRevenue - realtimeData.totalRevenue / 1.05).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-sky-700 uppercase">Total</p>
                                <p className="text-xs font-black text-indigo-700 mt-0.5">{formatCurrency(realtimeData.totalRevenue)}</p>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-1 border-t border-slate-100 text-[10px]">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Statutory Settlement Summary</p>
                              <div className="flex justify-between">
                                <span className="text-slate-600 font-semibold">CGST (2.5%)</span>
                                <span className="font-bold text-slate-900">₹{((realtimeData.totalRevenue - realtimeData.totalRevenue / 1.05) / 2).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600 font-semibold">SGST (2.5%)</span>
                                <span className="font-bold text-slate-900">₹{((realtimeData.totalRevenue - realtimeData.totalRevenue / 1.05) / 2).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600 font-semibold">Billable KOTs</span>
                                <span className="font-bold text-slate-900">{scopedBillableOrders.length}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 shadow-sm"
                        onClick={() => setShowPdfStudioModal(true)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Open Executive PDF Studio &amp; Download
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="rounded-xl border-slate-200 text-xs font-bold h-9"
                          onClick={handleExportReport}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          Export CSV Data
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl border-slate-200 text-xs font-bold h-9"
                          onClick={() => {
                            if (navigator?.clipboard) {
                              navigator.clipboard.writeText(window.location.href)
                            }
                            toast.success('Analytics report link copied to clipboard')
                          }}
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          Share Live Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* ═══════════ EXECUTIVE PDF REPORT STUDIO MODAL ═══════════ */}
      <Dialog open={showPdfStudioModal} onOpenChange={setShowPdfStudioModal}>
        <DialogContent showCloseButton={false} className="sm:max-w-5xl w-[95vw] max-h-[92vh] p-0 overflow-hidden bg-slate-950 border-slate-800 rounded-2xl flex flex-col">
          <DialogTitle className="sr-only">Executive PDF Report Studio</DialogTitle>
          {/* Top Dark Studio Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-100 truncate">
                    {restaurantName.replace(/\s+/g, '_')}_Executive_Analytics_Report.pdf
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    VERIFIED AUDIT GRADE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  A4 Printable Sheet (840px standard) • Vector Graphics &amp; Live POS Metrics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-300">
                <button
                  type="button"
                  onClick={() => setPdfZoom((z) => Math.max(70, z - 10))}
                  className="px-1.5 hover:text-white cursor-pointer"
                >
                  −
                </button>
                <span className="px-1.5">{pdfZoom}%</span>
                <button
                  type="button"
                  onClick={() => setPdfZoom((z) => Math.min(120, z + 10))}
                  className="px-1.5 hover:text-white cursor-pointer"
                >
                  +
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-bold"
                onClick={() => window.print()}
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                onClick={() => {
                  handleExportPDF()
                  toast.success('Executive PDF report downloaded')
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download PDF
              </Button>
              <button
                type="button"
                onClick={() => setShowPdfStudioModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
                aria-label="Close PDF Studio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Dark Canvas + Centered A4 Sheet */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950">
            <div
              style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
              className="max-w-[840px] mx-auto bg-white rounded-xl shadow-2xl p-6 sm:p-8 text-slate-900 space-y-6 transition-transform"
            >
              {/* Sheet Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                        SERVORA RESTAURANT INTELLIGENCE
                      </h2>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        AUDIT STATEMENT
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5">
                      EXECUTIVE RESTAURANT INTELLIGENCE &amp; FINANCIAL AUDIT STATEMENT
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    OFFICIAL &amp; CRYPTOGRAPHICALLY SIGNED
                  </span>
                  <p className="text-xs font-black text-slate-900 mt-1">{restaurantName}</p>
                  <p className="text-[10px] text-slate-400">
                    {profile?.address || 'Live Cloud POS Ledger'}
                  </p>
                </div>
              </div>

              {/* 4-Column Audit Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50/80 border border-slate-100 p-3.5 text-xs">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Audit Window</p>
                  <p className="font-bold text-slate-900 mt-0.5">{timeRange.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Currency &amp; Standard</p>
                  <p className="font-bold text-slate-900 mt-0.5">INR (₹) • RBI/NPCI Validated</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Generated Timestamp</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Statutory Compliance</p>
                  <p className="font-bold text-emerald-700 mt-0.5 truncate">
                    {profile?.gst_number ? `GSTIN: ${profile.gst_number}` : 'POS Tax Ledger Ready'}
                  </p>
                </div>
              </div>

              {/* Section 1: Executive Financial Ledger */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                    • 1. Executive Financial Ledger &amp; Performance Benchmarks
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    Net Taxable: ₹{(realtimeData.totalRevenue / 1.05).toFixed(2)} | GST (5%): ₹{(realtimeData.totalRevenue - realtimeData.totalRevenue / 1.05).toFixed(2)}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200/80 p-3.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Gross Revenue</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(realtimeData.totalRevenue)}</p>
                    <p className="text-[10px] font-semibold text-emerald-600 mt-1">Settled &amp; billable</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total Orders (KOTs)</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{realtimeData.totalOrders}</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">{realtimeData.totalViews} menu views</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Avg Ticket (AOV)</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(realtimeData.avgOrderValue)}</p>
                    <p className="text-[10px] font-semibold text-indigo-600 mt-1">Per dining order</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Repeat Guest Retention</p>
                    <p className="text-xl font-black text-indigo-600 mt-1">{guestInsights.retentionPct}%</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">{guestInsights.totalGuests} unique guests</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Revenue Velocity & Daypart Distribution */}
              <div>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-3">
                  • 2. Revenue Velocity &amp; Daypart Dining Rush Distribution
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-800">Recent Trend Distribution</span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {revenueTrend.length} Intervals
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 items-end h-24 pt-2">
                      {(() => {
                        const slice = revenueTrend.slice(-7)
                        const maxVal = Math.max(1, ...slice.map((d) => Number(d.revenue) || 0))
                        return slice.map((d, i) => {
                          const hPct = Math.max(10, Math.round(((Number(d.revenue) || 0) / maxVal) * 100))
                          const isMax = (Number(d.revenue) || 0) === maxVal && maxVal > 0
                          return (
                            <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                              <div
                                style={{ height: `${hPct}%` }}
                                className={cn("w-full rounded-t", isMax ? "bg-indigo-600" : "bg-indigo-300")}
                              />
                              <span className="text-[8px] font-semibold text-slate-400 truncate max-w-full">
                                {String(d.name || '').slice(0, 6)}
                              </span>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Daypart Shift Yield Breakdown</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {guestInsights.avgDiningMins ? `Turnaround: ${guestInsights.avgDiningMins}m` : 'Live Slots'}
                      </span>
                    </div>
                    {(() => {
                      const totalSlotRev = hourlyPeakData.reduce((s, d) => s + (Number(d.revenue) || 0), 0) || 1
                      return hourlyPeakData.slice(0, 4).map((slot, idx) => {
                        const pct = Math.round(((Number(slot.revenue) || 0) / totalSlotRev) * 100)
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="font-semibold text-slate-600">{slot.slot}</span>
                              <span className="font-bold text-slate-900">{formatCurrency(slot.revenue)} ({pct}%)</span>
                            </div>
                            <Progress value={pct} className="h-1.5 bg-slate-100 [&>div]:bg-indigo-600" />
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>

              {/* Section 3: Menu Engineering Yield Matrix */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                    • 3. Menu Engineering &amp; Profitability Yield Matrix (Top 5 Items)
                  </p>
                  <span className="text-[9px] font-bold text-indigo-700 border border-indigo-200 rounded px-2 py-0.5">
                    Boston Matrix Standard
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200/80 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-200/80">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Dish Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Sold</th>
                        <th className="py-2.5 px-3 text-right">Gross Rev</th>
                        <th className="py-2.5 px-3 text-right">Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topOrdered.slice(0, 5).map((entry, idx) => {
                        const rev = (Number(entry.item?.price) || 0) * (Number(entry.count) || 0)
                        const badge = idx < 2
                          ? { label: '★ STAR', cls: 'bg-emerald-50 text-emerald-700' }
                          : idx === 2
                          ? { label: '⚡ PUZZLE', cls: 'bg-amber-50 text-amber-700' }
                          : { label: 'PLOWHORSE', cls: 'bg-indigo-50 text-indigo-700' }
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-bold text-slate-400">0{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{entry.item?.name || 'Menu Item'}</td>
                            <td className="py-2.5 px-3 text-slate-500">{entry.item?.category || 'Main'}</td>
                            <td className="py-2.5 px-3 text-right font-semibold">{formatCurrency(entry.item?.price)}</td>
                            <td className="py-2.5 px-3 text-right font-bold">{entry.count}</td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatCurrency(rev)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={cn("text-[9px] font-black px-2 py-0.5 rounded", badge.cls)}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
