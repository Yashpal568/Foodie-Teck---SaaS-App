import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/layout/Layout";
import OverviewCards from "../components/dashboard/OverviewCards";
import RecentOrders from "../components/dashboard/RecentOrders";
import TableStatus from "../components/dashboard/TableStatus";
import TableSessions from "../components/dashboard/TableSessions";
import MenuManagement from "../components/menu/MenuManagement";
import QRCodeManagement from "../components/dashboard/QRCodeManagement";
import OrderManagement from "../components/dashboard/OrderManagement";
import AnalyticsDashboard from "../components/dashboard/AnalyticsDashboard";
import DashboardRealtimeAnalytics from "../components/dashboard/DashboardRealtimeAnalytics";
import CustomerManagement from "../components/dashboard/CustomerManagement";
import HelpSupport from "../components/dashboard/HelpSupport";
import Documentation from "../components/dashboard/Documentation";
import ReleaseNotes from "../components/dashboard/ReleaseNotes";
import VideoTutorials from "../components/dashboard/VideoTutorials";
import SettingsPage from "../components/dashboard/Settings";
import OnboardingChecklist from "../components/dashboard/OnboardingChecklist";
import { useRestaurantProfile } from "../hooks/useRestaurantProfile";

import ModuleLockOverlay from "../components/dashboard/ModuleLockOverlay";
import SubscriptionLockOverlay from "../components/dashboard/SubscriptionLockOverlay";
import SuspensionOverlay from "../components/dashboard/SuspensionOverlay";
import UpgradePlanModal from "../components/dashboard/UpgradePlanModal";
import POSTerminal from "../components/pos/POSTerminal";
import { getPlanDetails } from "@/utils/planLimits";
import { generateRestaurantSignature } from "@/utils/tableSecurity";
import {
  ChefHat,
  QrCode,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  RefreshCw,
  ExternalLink,
  LayoutDashboard,
  TrendingUp,
  Zap,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, getCachedSession } from '@/lib/supabase';

function Dashboard() {
  const { restaurantId: urlId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const [activeItem, setActiveItemState] = useState(currentTab);

  // Sync state with URL search param on browser Back/Forward navigation
  useEffect(() => {
    if (currentTab && currentTab !== activeItem) {
      setActiveItemState(currentTab);
    }
  }, [currentTab]);

  const setActiveItem = useCallback((tab) => {
    setActiveItemState(tab);
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  }, [setSearchParams]);
  const [currency, setCurrency] = useState("INR"); // Default to Indian Rupee
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [plan, setPlan] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLimitType, setUpgradeLimitType] = useState("general");

  const [subDetails, setSubDetails] = useState({
    pendingApproval: false,
    utrNumber: "",
    status: "Active",
  });

  // Database-First: Derive context completely from the authenticated URL and Supabase session
  const dashboardEmail = urlId || "guest";
  const isDemoMode = urlId === "demo-merchant" || urlId === "demo" || dashboardEmail === "demo-merchant" || dashboardEmail === "demo" || dashboardEmail === "guest";
  const [resolvedId, setResolvedId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const { profile } = useRestaurantProfile(dashboardEmail);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setUserEmail("");
      return;
    }
    let mounted = true;
    getCachedSession().then(({ data: { user } }) => {
      if (mounted) {
        setUserEmail(user?.email || "");
      }
    });
    return () => { mounted = false; };
  }, [isDemoMode, urlId]);

  // Resolve ID (Email -> UUID), strictly resetting on route/tenant changes
  useEffect(() => {
    let active = true;
    setResolvedId(null);
    async function resolve() {
      if (!dashboardEmail || dashboardEmail === "guest") return;
      if (dashboardEmail === "demo-merchant" || dashboardEmail === "demo") {
        if (active) setResolvedId("demo-merchant");
        return;
      }
      if (dashboardEmail.includes("@")) {
        const { data } = await supabase
          .from("restaurants")
          .select("id")
          .eq("email", dashboardEmail.toLowerCase())
          .maybeSingle();
        if (active && data?.id) setResolvedId(data.id);
      } else {
        if (active) setResolvedId(dashboardEmail);
      }
    }
    resolve();
    return () => { active = false; };
  }, [dashboardEmail]);

  const restaurantId = resolvedId || dashboardEmail;

  const [_daysRemaining, setDaysRemaining] = useState(30);
  const [isExpired, setIsExpired] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedSubView, setSuspendedSubView] = useState(null); // null | 'support' | 'account'
  const [verificationError, setVerificationError] = useState(null);

  // Verify Auth & Plan Status
  const verifyAuthAndPlan = useCallback(async () => {
    setVerificationError(null);
    if (!urlId) {
      setIsLoading(false);
      return;
    }

    // ── Live Demo Merchant Bypass (Isolated Demo Sandbox) ──
    const isDemo = urlId === "demo-merchant" || urlId === "demo" || dashboardEmail === "demo-merchant" || dashboardEmail === "demo";
    if (isDemo) {
      setIsSuspended(false);
      setIsExpired(false);
      setSubDetails({ pendingApproval: false, utrNumber: "DEMO-LIVE-PREVIEW", status: "Active" });
      setPlan({ name: "All-in-One Unlimited", purchaseDate: new Date().toISOString() });
      setIsLoading(false);
      return;
    }

    // Wait until the email→UUID resolution completes before proceeding
    const isEmailUrl = urlId.includes('@');
    if (isEmailUrl && !resolvedId) {
      return;
    }

    try {
      const activeRestaurantId = resolvedId || profile?.id || urlId;

      let fetchedSubscriptions = [];
      let fetchedStatus = profile?.status || '';
      if (activeRestaurantId && activeRestaurantId !== "guest") {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeRestaurantId);
        const isEmail = activeRestaurantId.includes("@");

        let q = null;
        if (isEmail) {
          q = supabase
            .from("restaurants")
            .select("id, status, email, business_name")
            .eq("email", activeRestaurantId.toLowerCase())
            .maybeSingle();
        } else if (isUUID) {
          q = supabase
            .from("restaurants")
            .select("id, status, email, business_name")
            .eq("id", activeRestaurantId)
            .maybeSingle();
        }

        if (q) {
          const { data, error: restErr } = await q;
          if (restErr) throw restErr;
          const rest = data;
          if (rest?.status) {
            fetchedStatus = rest.status;
          }
          
          if (rest?.id) {
            const { data: subData, error: subErr } = await supabase
              .from("subscriptions")
              .select("id, plan_name, status, price, start_date, end_date, utr_number, created_at")
              .eq("restaurant_id", rest.id);
            
            if (subErr) throw subErr;
            if (subData) {
              fetchedSubscriptions = subData;
            }
          }
        }
      }

      const accountSuspended = String(fetchedStatus || '').trim().toLowerCase() === 'suspended';
      setIsSuspended(accountSuspended);

      // Use authoritative database subscription record as source of truth
      const subscriptions = Array.isArray(fetchedSubscriptions) ? fetchedSubscriptions : [];
      const subscription = subscriptions.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] || null;

      if (subscription) {
        const upperSubStatus = String(subscription.status || "").toUpperCase();
        const isApproved =
          upperSubStatus === "APPROVED" ||
          upperSubStatus === "ACTIVE";
        const isPending =
          (upperSubStatus === "PENDING_APPROVAL" ||
            upperSubStatus === "PENDING_PAYMENT") &&
          Boolean(subscription.utr_number);
        setSubDetails({
          pendingApproval: isPending,
          utrNumber: subscription.utr_number || "",
          status: subscription.status || "PENDING_APPROVAL",
        });

        setPlan({
          name: subscription.plan_name || "All-in-One Unlimited",
          purchaseDate: subscription.start_date || subscription.created_at,
        });

        const purchaseDate = new Date(
          subscription.start_date || subscription.created_at || Date.now(),
        );
        const expiryDate = new Date(
          subscription.end_date ||
            purchaseDate.getTime() + 90 * 24 * 60 * 60 * 1000,
        );
        const now = new Date();

        const timeDiff = expiryDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        setDaysRemaining(daysLeft);
        if (!isApproved || daysLeft <= 0) {
          setIsExpired(true);
        } else {
          setIsExpired(false);
        }
      } else {
        // No active subscription record in database: lock dashboard and prompt subscription
        setPlan(null);
        setSubDetails({ pendingApproval: false, utrNumber: '', status: 'NO_SUBSCRIPTION' });
        setIsExpired(true);
      }
    } catch (err) {
      console.error("verifyAuthAndPlan error:", err);
      // Fail safely on verification error — NEVER silently grant paid access
      setPlan(null);
      setIsExpired(true);
      setVerificationError(err?.message || "Unable to verify active subscription. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }, [urlId, resolvedId, profile]);

  useEffect(() => {
    verifyAuthAndPlan();

    const handleSync = () => {
      verifyAuthAndPlan();
    };

    window.addEventListener("platformConfigUpdated", handleSync);
    window.addEventListener("storage", handleSync);

    // Supabase Realtime Listener strictly scoped to active tenant UUID (subscriptions + restaurant status)
    const activeTargetId = resolvedId || profile?.id || urlId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(activeTargetId || ''));
    let channel = null;
    if (isUUID) {
      channel = supabase
        .channel(`public:dashboard_sub_realtime_${activeTargetId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
            filter: `restaurant_id=eq.${activeTargetId}`,
          },
          (payload) => {
            const status = payload?.new ? payload.new["status"] : undefined;
            if (status === "Approved" || status === "Active" || status === "APPROVED" || status === "ACTIVE") {
              verifyAuthAndPlan();
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "restaurants",
            filter: `id=eq.${activeTargetId}`,
          },
          () => {
            verifyAuthAndPlan();
          },
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener("platformConfigUpdated", handleSync);
      window.removeEventListener("storage", handleSync);
      if (channel) supabase.removeChannel(channel);
    };
  }, [verifyAuthAndPlan, resolvedId, profile, urlId]);

  if (isLoading) return null; // Quick flash prevention

  if (verificationError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-lg space-y-4">
          <h2 className="text-xl font-black text-slate-900">Verification Unavailable</h2>
          <p className="text-sm text-slate-600">{verificationError}</p>
          <Button onClick={verifyAuthAndPlan} className="w-full h-11 rounded-xl bg-slate-900 text-white font-bold">
            Retry Verification
          </Button>
        </div>
      </div>
    );
  }

  if (isSuspended) {
    const handleSuspendedSignOut = async () => {
      try {
        await supabase.auth.signOut();
      } catch {}
      navigate("/login", { replace: true });
    };

    if (suspendedSubView === "support") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <div className="bg-rose-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold">
              Account Suspended — Restricted Support Access Only
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 bg-white/10 text-white border-white/20 text-xs" onClick={() => setSuspendedSubView(null)}>
                Back to Suspension Notice
              </Button>
              <Button size="sm" variant="outline" className="h-8 bg-white/10 text-white border-white/20 text-xs" onClick={handleSuspendedSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
          <HelpSupport
            activeItem="help"
            setActiveItem={() => setSuspendedSubView("support")}
            navigate={navigate}
            restaurantId={resolvedId || profile?.id || urlId}
          />
        </div>
      );
    }

    if (suspendedSubView === "account") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-black text-slate-900">Account & Subscription Status</h2>
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-black">SUSPENDED</Badge>
            </div>
            <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p><strong className="text-slate-900">Business:</strong> {profile?.business_name || "Merchant Workspace"}</p>
              <p><strong className="text-slate-900">Account Email:</strong> {userEmail || profile?.email || "—"}</p>
              <p><strong className="text-slate-900">Plan:</strong> {plan?.name || "All-in-One Unlimited"}</p>
              <p><strong className="text-slate-900">Subscription Status:</strong> {subDetails.status}</p>
              {subDetails.utrNumber && (
                <p><strong className="text-slate-900">Latest UTR Ref:</strong> <span className="font-mono">{subDetails.utrNumber}</span></p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Operational screens (Orders, KDS, Menu, Tables, QR, Analytics) remain locked while your workspace is suspended.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button className="flex-1 bg-slate-950 text-white" onClick={() => setSuspendedSubView("support")}>
                Open Support Ticket
              </Button>
              <Button variant="outline" onClick={() => setSuspendedSubView(null)}>
                Back
              </Button>
              <Button variant="ghost" className="text-rose-600" onClick={handleSuspendedSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <SuspensionOverlay
        restaurantName={profile?.business_name || ""}
        onOpenSupport={() => setSuspendedSubView("support")}
        onOpenAccount={() => setSuspendedSubView("account")}
        onSignOut={handleSuspendedSignOut}
      />
    );
  }

  if (!plan || isExpired) {
    return (
      <SubscriptionLockOverlay
        planName={plan?.name || "All-in-One Unlimited"}
        expiredSince={plan?.purchaseDate || new Date()}
        pendingApproval={subDetails.pendingApproval}
        utrNumber={subDetails.utrNumber}
        restaurantId={resolvedId || profile?.id || urlId}
        merchantEmail={
          userEmail ||
          (profile ? profile["email"] : "") ||
          (dashboardEmail?.includes("@")
            ? dashboardEmail
            : "support@servora.in")
        }
        merchantName={profile?.business_name || "Servora Merchant"}
        onCheckStatus={verifyAuthAndPlan}
      />
    );
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("orderUpdated"));
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const renderContent = () => {
    switch (activeItem) {
      case "dashboard":
        return (
          <div className="flex flex-col min-h-screen">
            {/* ── PAGE CONTENT ── */}
            <div className="flex flex-col gap-0 flex-1">
              {/* ── HERO HEADER BAND ── */}
              <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-3 sm:py-4">
                <div className="flex items-center justify-between gap-3">
                  {/* Left: breadcrumb + title */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <LayoutDashboard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                        Overview
                      </span>
                    </div>
                    <h1 className="text-lg md:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none truncate">
                      Restaurant Dashboard
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-1 truncate hidden sm:block">
                      Real-time performance monitoring ·{" "}
                      {new Date().toLocaleDateString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Right: Quick Actions — scrollable row on small screens */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
                    <button
                      onClick={handleRefresh}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${isRefreshing ? "opacity-60" : ""}`}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                      />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                      onClick={() => {
                        const sig = generateRestaurantSignature(restaurantId)
                        window.open(
                          `/menu?restaurant=${restaurantId}&sig=${sig}`,
                          "_blank",
                        )
                      }}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                    >
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                      <span className="hidden sm:inline">Live Menu</span>
                      <span className="sm:hidden">Menu</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setActiveItem("analytics")}
                      className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Analytics
                    </button>
                    <button
                      onClick={() => setActiveItem("orders")}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-slate-900/20 whitespace-nowrap"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">New Order</span>
                      <span className="sm:hidden">Order</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── MAIN CONTENT AREA ── */}
              <div className="flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 lg:space-y-6">
                {/* ── 0. ONBOARDING CHECKLIST ── */}
                <OnboardingChecklist profile={profile} onSetupClick={() => setActiveItem('settings')} />

                {/* ── 1. FULL WIDTH KPI OVERVIEW CARDS ── */}
                <OverviewCards restaurantId={restaurantId} />

                {/* ── 2. OPERATIONAL SPLIT GRID: Shortcuts & Recent Orders (Left) + Live Floor Tables (Right) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 xl:gap-6 items-stretch">
                  {/* ── LEFT: Shortcuts + Recent Orders ── */}
                  <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 flex flex-col gap-4 lg:gap-5 min-w-0 h-full">
                    {/* Quick shortcuts row */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
                      {[
                        {
                          label: "Manage Orders",
                          icon: ShoppingCart,
                          color: "text-blue-600",
                          bg: "bg-blue-50",
                          border: "border-blue-100",
                          action: "orders",
                        },
                        {
                          label: "Edit Menu",
                          icon: ChefHat,
                          color: "text-amber-600",
                          bg: "bg-amber-50",
                          border: "border-amber-100",
                          action: "menu",
                        },
                        {
                          label: "View Analytics",
                          icon: BarChart3,
                          color: "text-violet-600",
                          bg: "bg-violet-50",
                          border: "border-violet-100",
                          action: "analytics",
                        },
                      ].map((item) => (
                        <button
                          key={item.action}
                          onClick={() => setActiveItem(item.action)}
                          className={`flex flex-col items-center gap-1.5 p-2 sm:p-3 bg-white border ${item.border} rounded-xl hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 text-center group cursor-pointer`}
                        >
                          <div className={`p-1.5 sm:p-2 ${item.bg} rounded-lg`}>
                            <item.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.color}`} />
                          </div>
                          <span className="text-[9px] sm:text-xs font-semibold text-slate-700 group-hover:text-slate-900 whitespace-nowrap leading-tight">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Recent Orders */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <RecentOrders
                        restaurantId={restaurantId}
                        onViewAll={() => setActiveItem("orders")}
                      />
                    </div>
                  </div>

                  {/* ── RIGHT: Live Floor Table Status Panel (Split View) ── */}
                  <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 flex flex-col min-w-0 h-full">
                    {/* Table Status Header */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1 h-full">
                      <div className="px-4 sm:px-5 py-4 border-b border-slate-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <Users className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">
                              Live Floor
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Real-time table status
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">
                            Live
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-3 sm:p-4 flex-1 overflow-y-auto scrollbar-thin max-h-95">
                        <TableStatus restaurantId={restaurantId} />
                      </div>

                      {/* Matching Footer Bar for perfect bottom alignment */}
                      <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between shrink-0 mt-auto">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Floor Management
                        </span>
                        <button
                          onClick={() => setActiveItem("tables")}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          Table Sessions
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 3. REAL-TIME ANALYTICS & PIE CHART SECTION ── */}
                <DashboardRealtimeAnalytics
                  restaurantId={restaurantId || resolvedId || profile?.id}
                  onNavigateAnalytics={() => setActiveItem("analytics")}
                />
              </div>
            </div>
          </div>
        );

      case "qr-codes":
        return (
          <QRCodeManagement
            plan={plan}
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={resolvedId || profile?.id || urlId}
          />
        );

      case "menu":
        return (
          <MenuManagement
            currency={currency}
            onCurrencyChange={setCurrency}
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            plan={plan}
            restaurantId={isDemoMode ? "demo-merchant" : (resolvedId || profile?.id || urlId)}
          />
        );

      case "pos":
        return (
          <POSTerminal
            restaurantId={resolvedId || profile?.id || urlId}
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
          />
        );

      case "orders":
        return (
          <OrderManagement
            restaurantId={restaurantId}
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
          />
        );

      case "tables":
        return (
          <div className="h-full">
            <TableSessions
              activeItem={activeItem}
              setActiveItem={setActiveItem}
              navigate={navigate}
              restaurantId={resolvedId || profile?.id || urlId}
              plan={plan}
            />
          </div>
        );

      case "analytics": {
        const analyticsPlanDetails = getPlanDetails(plan?.name)
        if (!analyticsPlanDetails.advancedAnalytics) {
          return (
            <ModuleLockOverlay
              featureName="Advanced Analytics"
              requiredPlan="Professional"
              price="₹2,499"
              featureKey="analytics"
              onUpgradeClick={() => {
                setUpgradeLimitType("analytics")
                setShowUpgradeModal(true)
              }}
            />
          )
        }
        return (
          <AnalyticsDashboard
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={restaurantId || resolvedId || profile?.id}
            plan={plan}
          />
        )
      }

      case "customers": {
        const crmPlanDetails = getPlanDetails(plan?.name)
        if (!crmPlanDetails.crmUnlocked) {
          return (
            <ModuleLockOverlay
              featureName="Customer CRM"
              requiredPlan="Professional"
              price="₹2,499"
              featureKey="crm"
              onUpgradeClick={() => {
                setUpgradeLimitType("crm")
                setShowUpgradeModal(true)
              }}
            />
          )
        }
        return (
          <CustomerManagement
            plan={plan}
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={restaurantId}
          />
        )
      }

      case "help":
        return (
          <HelpSupport
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={profile?.id || restaurantId}
          />
        );

      case "docs":
        return (
          <Documentation
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={isDemoMode ? "demo-merchant" : (resolvedId || urlId)}
          />
        );

      case "releases":
        return (
          <ReleaseNotes
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={isDemoMode ? "demo-merchant" : (resolvedId || urlId)}
          />
        );

      case "tutorials":
        return (
          <VideoTutorials
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={isDemoMode ? "demo-merchant" : (resolvedId || urlId)}
          />
        );

      case "settings":
        return (
          <SettingsPage
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={restaurantId}
            plan={plan}
            onUpgradeClick={() => {
              setUpgradeLimitType("general");
              setShowUpgradeModal(true);
            }}
          />
        );

      default:
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900">{activeItem}</h1>
            <p className="text-gray-600">Page content coming soon...</p>
          </div>
        );
    }
  };

  if (
    activeItem === "docs" ||
    activeItem === "releases" ||
    activeItem === "tutorials"
  ) {
    const Component =
      activeItem === "docs"
        ? Documentation
        : activeItem === "releases"
          ? ReleaseNotes
          : VideoTutorials;

    return (
      <Component
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        navigate={navigate}
        restaurantId={isDemoMode ? "demo-merchant" : (resolvedId || urlId)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {isDemoMode && (
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-md relative z-1000 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>✨ Live Merchant Console Demo — Full Enterprise Features Active</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/menu')} 
              className="underline hover:text-blue-100 transition-colors font-semibold cursor-pointer"
            >
              Open Live Customer Menu →
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className="px-3 py-1 rounded-full bg-white text-blue-700 hover:bg-blue-50 font-black shadow-xs active:scale-95 transition-all text-xs cursor-pointer"
            >
              Launch Your Restaurant
            </button>
          </div>
        </div>
      )}

      <Layout
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        currency={currency}
        onCurrencyChange={setCurrency}
        restaurantId={isDemoMode ? "demo-merchant" : (resolvedId || urlId)}
        plan={plan}
        onUpgradeClick={() => {
          setUpgradeLimitType("general");
          setShowUpgradeModal(true);
        }}
      >
        {renderContent()}
      </Layout>

      {/* Global Upgrade Plan Modal */}
      <UpgradePlanModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlanName={plan?.name || "All-in-One Unlimited"}
        limitType={upgradeLimitType}
        restaurantId={isDemoMode ? "demo-merchant" : (resolvedId || profile?.id || urlId)}
        merchantEmail={isDemoMode ? "demo@servora.app" : (profile?.email || userEmail || "")}
        merchantName={isDemoMode ? "Servora Demo Kitchen" : (profile?.business_name || "Servora Merchant")}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false);
          verifyAuthAndPlan();
        }}
      />
    </div>
  );
}

export default Dashboard;
