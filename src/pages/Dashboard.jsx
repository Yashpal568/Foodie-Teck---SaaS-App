import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import OverviewCards from "../components/dashboard/OverviewCards";
import RecentOrders from "../components/dashboard/RecentOrders";
import TableStatus from "../components/dashboard/TableStatus";
import TableSessions from "../components/dashboard/TableSessions";
import MenuManagement from "../components/menu/MenuManagement";
import QRCodeManagement from "../components/dashboard/QRCodeManagement";
import OrderManagement from "../components/dashboard/OrderManagement";
import AnalyticsDashboard from "../components/dashboard/AnalyticsDashboard";
import CustomerManagement from "../components/dashboard/CustomerManagement";
import HelpSupport from "../components/dashboard/HelpSupport";
import Documentation from "../components/dashboard/Documentation";
import ReleaseNotes from "../components/dashboard/ReleaseNotes";
import VideoTutorials from "../components/dashboard/VideoTutorials";
import SettingsPage from "../components/dashboard/Settings";
import { useRestaurantProfile } from "../hooks/useRestaurantProfile";

import PlanLockOverlay from "../components/dashboard/PlanLockOverlay";
import ModuleLockOverlay from "../components/dashboard/ModuleLockOverlay";
import SubscriptionLockOverlay from "../components/dashboard/SubscriptionLockOverlay";
import SuspensionOverlay from "../components/dashboard/SuspensionOverlay";
import UpgradePlanModal from "../components/dashboard/UpgradePlanModal";
import { getPlanDetails } from "@/utils/planLimits";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

function Dashboard() {
  const { restaurantId: urlId } = useParams();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("dashboard");
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
  const [resolvedId, setResolvedId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const { profile } = useRestaurantProfile(dashboardEmail);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  // Resolve ID (Email -> UUID)
  useEffect(() => {
    async function resolve() {
      if (!dashboardEmail || dashboardEmail === "guest") return;
      if (dashboardEmail.includes("@")) {
        const { data } = await supabase
          .from("restaurants")
          .select("id")
          .eq("email", dashboardEmail.toLowerCase())
          .maybeSingle();
        if (data?.id) setResolvedId(data.id);
      } else {
        setResolvedId(dashboardEmail);
      }
    }
    resolve();
  }, [dashboardEmail]);

  const restaurantId = resolvedId || dashboardEmail;

  const [daysRemaining, setDaysRemaining] = useState(30);
  const [isExpired, setIsExpired] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // Verify Auth & Plan Status
  const verifyAuthAndPlan = useCallback(async () => {
    if (!urlId) {
      setIsLoading(false);
      return;
    }

    // Wait until the email→UUID resolution completes before proceeding
    // This prevents double-firing with stale email IDs
    const isEmailUrl = urlId.includes('@')
    if (isEmailUrl && !resolvedId) {
      // Resolution still in progress, do not run yet
      return;
    }

    try {
      const activeRestaurantId = resolvedId || profile?.id || urlId;

      // ── Single merged query: fetch restaurant + subscriptions in one round trip ──
      let rest = null;
      if (activeRestaurantId && activeRestaurantId !== "guest") {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeRestaurantId);
        const isEmail = activeRestaurantId.includes("@");

        let q = null;
        if (isEmail) {
          q = supabase
            .from("restaurants")
            .select("id")
            .eq("email", activeRestaurantId.toLowerCase())
            .maybeSingle();
        } else if (isUUID) {
          q = supabase
            .from("restaurants")
            .select("id")
            .eq("id", activeRestaurantId)
            .maybeSingle();
        }

        if (q) {
          const { data } = await q;
          rest = data;
          
          
          // Try fetching subscriptions separately to prevent 400 Bad Request on join failure
          if (rest?.id) {
            try {
              const { data: subData } = await supabase
                .from("subscriptions")
                .select("id, plan_name, status, price, start_date, end_date, utr_number, created_at")
                .eq("restaurant_id", rest.id)
              
              if (subData) {
                rest.subscriptions = subData;
              }
            } catch (e) {
              // Silently ignore if subscriptions table doesn't exist
              rest.subscriptions = [];
            }
          }
        }
      }

      // Check local storage approval override first (fast path — no DB needed)
      const isApprovedLocally =
        localStorage.getItem(`servora_approved_${activeRestaurantId}`) ||
        (userEmail && localStorage.getItem(`servora_approved_${userEmail}`)) ||
        (urlId && localStorage.getItem(`servora_approved_${urlId}`));

      const subsList = JSON.parse(localStorage.getItem("servora_subscriptions") || "[]");
      const localSub = subsList.find(
        (s) =>
          s.restaurant_id === activeRestaurantId ||
          s.restaurant_id === userEmail ||
          s.restaurant_id === urlId ||
          s.id === `sub-${activeRestaurantId}`,
      );

      if (isApprovedLocally === "true" || localSub?.status === "Active" || localSub?.status === "Approved") {
        setIsExpired(false);
        setSubDetails({ pendingApproval: false, utrNumber: localSub?.utr_number || "", status: "Active" });
        setPlan({ name: localSub?.plan_name || "Starter", purchaseDate: new Date().toISOString() });
        setIsLoading(false);
        return;
      }

      // Use the subscription data from the joined query result
      const subscriptions = Array.isArray(rest?.subscriptions) ? rest.subscriptions : [];
      const subscription = subscriptions.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;

      if (subscription) {
        const isApproved =
          subscription.status === "Approved" ||
          subscription.status === "Active";
        const isPending =
          subscription.status === "PENDING_APPROVAL" ||
          subscription.status === "PENDING_PAYMENT";
        setSubDetails({
          pendingApproval: isPending,
          utrNumber: subscription.utr_number || "",
          status: subscription.status || "PENDING_APPROVAL",
        });

        setPlan({
          name: subscription.plan_name || "Starter",
          purchaseDate: subscription.start_date || subscription.created_at,
        });

        const purchaseDate = new Date(
          subscription.start_date || subscription.created_at || Date.now(),
        );
        const expiryDate = new Date(
          subscription.end_date ||
            purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000,
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
        // No subscription record found at all (brand new signup)
        // Show the plan selector so the user can choose and pay
        setPlan({ name: 'Professional', purchaseDate: new Date().toISOString() });
        setSubDetails({ pendingApproval: false, utrNumber: '', status: 'NO_SUBSCRIPTION' });
        setIsExpired(true);
      }
    } catch (err) {
      console.warn("verifyAuthAndPlan error:", err);
      // On error, don't lock out the merchant — grant default access instead
      setPlan({ name: "Starter", purchaseDate: new Date().toISOString() });
      setIsExpired(false);
    } finally {
      setIsLoading(false);
    }
  }, [urlId, resolvedId, profile, userEmail]);

  useEffect(() => {
    verifyAuthAndPlan();

    const handleSync = () => {
      verifyAuthAndPlan();
    };

    window.addEventListener("platformConfigUpdated", handleSync);
    window.addEventListener("storage", handleSync);

    // Supabase Realtime Listener on subscriptions table for instant approval unlock
    const activeTargetId = resolvedId || profile?.id || urlId;
    let channel = null;
    if (activeTargetId && activeTargetId !== "guest") {
      channel = supabase
        .channel(`public:dashboard_sub_realtime_${activeTargetId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
          },
          (payload) => {
            const status = payload?.new ? payload.new["status"] : undefined;
            if (status === "Approved" || status === "Active") {
              verifyAuthAndPlan();
            }
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

  if (!plan) {
    return <PlanLockOverlay />;
  }

  if (isSuspended) {
    return <SuspensionOverlay />;
  }

  if (isExpired) {
    return (
      <SubscriptionLockOverlay
        planName={plan.name}
        expiredSince={plan.purchaseDate}
        pendingApproval={subDetails.pendingApproval}
        utrNumber={subDetails.utrNumber}
        restaurantId={resolvedId || profile?.id || urlId}
        merchantEmail={
          userEmail ||
          (profile ? profile["email"] : "") ||
          (dashboardEmail?.includes("@")
            ? dashboardEmail
            : "claudegptusert@gmail.com")
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
              <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
                  {/* Left: breadcrumb + title */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <LayoutDashboard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                        Overview
                      </span>
                    </div>
                    <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">
                      Restaurant Dashboard
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-1 truncate">
                      Real-time performance monitoring ·{" "}
                      {new Date().toLocaleDateString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Right: Quick Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleRefresh}
                      className={`flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all ${isRefreshing ? "opacity-60" : ""}`}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                      />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `/menu?restaurant=${restaurantId}&table=1`,
                          "_blank",
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                    >
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                      Live Menu
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setActiveItem("analytics")}
                      className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Analytics
                    </button>
                    <button
                      onClick={() => setActiveItem("orders")}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-slate-900/20 whitespace-nowrap"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      New Order
                    </button>
                  </div>
                </div>
              </div>

              {/* ── MAIN CONTENT AREA ── */}
              <div className="flex-1 p-3 sm:p-4 lg:p-6 xl:p-8">
                {/* ── 3-COLUMN GRID: metrics / orders / tables ── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6">
                  {/* ── LEFT: Metrics + Recent Orders ── */}
                  <div className="xl:col-span-8 flex flex-col gap-5">
                    {/* KPI Metric Cards */}
                    <OverviewCards restaurantId={restaurantId} />

                    {/* Quick shortcuts row */}
                    <div className="grid grid-cols-3 gap-3">
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
                          className={`flex flex-col items-center gap-2 p-3 bg-white border ${item.border} rounded-xl hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 text-center group`}
                        >
                          <div className={`p-2 ${item.bg} rounded-lg`}>
                            <item.icon className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 whitespace-nowrap leading-tight">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Recent Orders */}
                    <RecentOrders
                      restaurantId={restaurantId}
                      onViewAll={() => setActiveItem("orders")}
                    />
                  </div>

                  {/* ── RIGHT: Table Status Panel ── */}
                  <div className="xl:col-span-4">
                    {/* Table Status Header */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
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
                      <div className="p-4 xl:max-h-[calc(100vh-17rem)] xl:overflow-y-auto">
                        <TableStatus restaurantId={restaurantId} />
                      </div>
                    </div>
                  </div>
                </div>
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
            restaurantId={profile?.id}
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
          />
        );

      case "releases":
        return (
          <ReleaseNotes
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
          />
        );

      case "tutorials":
        return (
          <VideoTutorials
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
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
      />
    );
  }

  return (
    <>
      <Layout
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        currency={currency}
        onCurrencyChange={setCurrency}
        restaurantId={urlId}
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
        currentPlanName={plan?.name || "Starter"}
        limitType={upgradeLimitType}
        restaurantId={resolvedId || profile?.id || urlId}
        merchantEmail={userEmail || (profile ? profile["email"] : "")}
        merchantName={profile?.business_name || "Servora Merchant"}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false);
          verifyAuthAndPlan();
        }}
      />
    </>
  );
}

export default Dashboard;
