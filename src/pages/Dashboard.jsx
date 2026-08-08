import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import OverviewCards from '../components/dashboard/OverviewCards'
import RecentOrders from '../components/dashboard/RecentOrders'
import TableStatus from '../components/dashboard/TableStatus'
import TableSessions from '../components/dashboard/TableSessions'
import MenuManagement from '../components/menu/MenuManagement'
import QRCodeManagement from '../components/dashboard/QRCodeManagement'
import OrderManagement from '../components/dashboard/OrderManagement'
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard'
import CustomerManagement from '../components/dashboard/CustomerManagement'
import HelpSupport from '../components/dashboard/HelpSupport'
import Documentation from '../components/dashboard/Documentation'
import ReleaseNotes from '../components/dashboard/ReleaseNotes'
import VideoTutorials from '../components/dashboard/VideoTutorials'
import SettingsPage from '../components/dashboard/Settings'
import { useRestaurantProfile } from '../hooks/useRestaurantProfile'
import DashboardMobileNavbar from '../components/dashboard/DashboardMobileNavbar'
import PlanLockOverlay from '../components/dashboard/PlanLockOverlay'
import ModuleLockOverlay from '../components/dashboard/ModuleLockOverlay'
import SubscriptionLockOverlay from '../components/dashboard/SubscriptionLockOverlay'
import SuspensionOverlay from '../components/dashboard/SuspensionOverlay'
import UpgradePlanModal from '../components/dashboard/UpgradePlanModal'
import { getPlanDetails } from '@/utils/planLimits'
import { ChefHat, QrCode, ShoppingCart, Users, BarChart3, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function Dashboard() {
  const { restaurantId: urlId } = useParams()
  const navigate = useNavigate()
  const [activeItem, setActiveItem] = useState('dashboard')
  const [currency, setCurrency] = useState('INR') // Default to Indian Rupee
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [plan, setPlan] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeLimitType, setUpgradeLimitType] = useState('general')
  
  const [subDetails, setSubDetails] = useState({ pendingApproval: false, utrNumber: '', status: 'Active' })

  // Database-First: Derive context completely from the authenticated URL and Supabase session
  const dashboardEmail = urlId || 'guest'
  const [resolvedId, setResolvedId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const { profile } = useRestaurantProfile(dashboardEmail)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
    })
  }, [])

  // Resolve ID (Email -> UUID)
  useEffect(() => {
    async function resolve() {
      if (!dashboardEmail || dashboardEmail === 'guest') return
      if (dashboardEmail.includes('@')) {
        const { data } = await supabase
          .from('restaurants')
          .select('id')
          .eq('email', dashboardEmail.toLowerCase())
          .maybeSingle()
        if (data?.id) setResolvedId(data.id)
      } else {
        setResolvedId(dashboardEmail)
      }
    }
    resolve()
  }, [dashboardEmail])

  const restaurantId = resolvedId || dashboardEmail

  const [daysRemaining, setDaysRemaining] = useState(30)
  const [isExpired, setIsExpired] = useState(false)
  const [isSuspended, setIsSuspended] = useState(false)

  // Verify Auth & Plan Status
  const verifyAuthAndPlan = useCallback(async () => {
    if (!urlId) {
      setIsLoading(false)
      return
    }

    try {
      const activeRestaurantId = resolvedId || profile?.id || urlId

      // 1. Fetch Restaurant Status
      if (activeRestaurantId && activeRestaurantId !== 'guest') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeRestaurantId)
        const isEmail = activeRestaurantId.includes('@')
        
        let query = null
        if (isEmail) {
          query = supabase.from('restaurants').select('*').eq('email', activeRestaurantId.toLowerCase()).maybeSingle()
        } else if (isUUID) {
          query = supabase.from('restaurants').select('*').eq('id', activeRestaurantId).maybeSingle()
        }

        if (query) {
          const { data: rest } = await query
          if (rest && rest.status === 'Suspended') {
            setIsSuspended(true)
            setIsLoading(false)
            return
          }
        }
      }

      // Check local storage approval override first
      const isApprovedLocally = 
        localStorage.getItem(`servora_approved_${activeRestaurantId}`) || 
        (userEmail && localStorage.getItem(`servora_approved_${userEmail}`)) ||
        (urlId && localStorage.getItem(`servora_approved_${urlId}`))

      const subsList = JSON.parse(localStorage.getItem('servora_subscriptions') || '[]')
      const localSub = subsList.find(s => 
        s.restaurant_id === activeRestaurantId || 
        s.restaurant_id === userEmail ||
        s.restaurant_id === urlId ||
        s.id === `sub-${activeRestaurantId}`
      )

      if (isApprovedLocally === 'true' || localSub?.status === 'Active' || localSub?.status === 'Approved') {
        setIsExpired(false)
        setSubDetails({ pendingApproval: false, utrNumber: localSub?.utr_number || '', status: 'Active' })
        setPlan({ name: localSub?.plan_name || 'Professional', purchaseDate: new Date().toISOString() })
        setIsLoading(false)
        return
      }

      // 2. Fetch Subscription & UTR status by activeRestaurantId or urlId
      const targetQuery = urlId && urlId !== activeRestaurantId 
        ? `restaurant_id.eq.${activeRestaurantId},restaurant_id.eq.${urlId}` 
        : `restaurant_id.eq.${activeRestaurantId}`

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .or(targetQuery)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subscription) {
        const isApproved = subscription.status === 'Approved' || subscription.status === 'Active'
        const isPending = subscription.status === 'PENDING_APPROVAL' || subscription.status === 'PENDING_PAYMENT'
        setSubDetails({
           pendingApproval: isPending,
           utrNumber: subscription.utr_number || '',
           status: subscription.status || 'PENDING_APPROVAL'
        })

        setPlan({ 
           name: subscription.plan_name || 'Professional', 
           purchaseDate: subscription.start_date || subscription.created_at
        })
        
        const purchaseDate = new Date(subscription.start_date || subscription.created_at || Date.now())
        const expiryDate = new Date(subscription.end_date || purchaseDate.getTime() + (30 * 24 * 60 * 60 * 1000))
        const now = new Date()
        
        const timeDiff = expiryDate.getTime() - now.getTime()
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        setDaysRemaining(daysLeft)
        if (!isApproved || daysLeft <= 0) {
          setIsExpired(true)
        } else {
          setIsExpired(false)
        }
      } else {
         // No subscription record exists yet for this restaurant
         setSubDetails({
            pendingApproval: false,
            utrNumber: '',
            status: 'NO_SUBSCRIPTION'
         })
         setPlan({ name: 'Professional', purchaseDate: new Date() })
         setIsExpired(true)
      }
    } catch (err) {
      console.warn('verifyAuthAndPlan error:', err)
      setPlan({ name: 'Professional', purchaseDate: new Date() })
      setIsExpired(true)
    } finally {
      setIsLoading(false)
    }
  }, [urlId, resolvedId, profile, userEmail])

  useEffect(() => {
    verifyAuthAndPlan()

    const handleSync = () => {
      verifyAuthAndPlan()
    }

    window.addEventListener('platformConfigUpdated', handleSync)
    window.addEventListener('storage', handleSync)

    // Supabase Realtime Listener on subscriptions table for instant approval unlock
    const activeTargetId = resolvedId || profile?.id || urlId
    let channel = null
    if (activeTargetId && activeTargetId !== 'guest') {
      channel = supabase
        .channel(`public:dashboard_sub_realtime_${activeTargetId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'subscriptions'
        }, (payload) => {
          const status = payload?.new ? payload.new['status'] : undefined
          if (status === 'Approved' || status === 'Active') {
            verifyAuthAndPlan()
          }
        })
        .subscribe()
    }

    return () => {
      window.removeEventListener('platformConfigUpdated', handleSync)
      window.removeEventListener('storage', handleSync)
      if (channel) supabase.removeChannel(channel)
    }
  }, [verifyAuthAndPlan, resolvedId, profile, urlId])

  if (isLoading) return null // Quick flash prevention

  if (!plan) {
    return <PlanLockOverlay />
  }

  if (isSuspended) {
    return <SuspensionOverlay />
  }

  if (isExpired) {
    return (
      <SubscriptionLockOverlay 
        planName={plan.name} 
        expiredSince={plan.purchaseDate} 
        pendingApproval={subDetails.pendingApproval}
        utrNumber={subDetails.utrNumber}
        restaurantId={resolvedId || profile?.id || urlId}
        merchantEmail={userEmail || (profile ? profile['email'] : '') || (dashboardEmail?.includes('@') ? dashboardEmail : 'claudegptusert@gmail.com')}
        merchantName={profile?.business_name || 'Servora Merchant'}
        onCheckStatus={verifyAuthAndPlan}
      />
    )
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('orderUpdated'))
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return (
          <div className="flex flex-col min-h-screen bg-[#f8fafc]/50 pb-20 lg:pb-0 font-sans">
            <DashboardMobileNavbar 
              activeItem={activeItem}
              setActiveItem={setActiveItem}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
            
            <div className="p-4 md:p-10 space-y-10">
              {/* Premium Dashboard Header */}
              <div className="hidden lg:flex items-end justify-between gap-6">
                <div className="space-y-1.5 translate-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-blue-600 rounded-full" />
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                      Dashboard
                    </h1>
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] pl-5 opacity-70">
                    Welcome back! Monitoring your restaurant's performance.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-3xl border border-white shadow-sm">
                  <button 
                    onClick={() => window.open(`/menu?restaurant=${restaurantId}&table=1`, '_blank')}
                    className="px-6 py-3 text-slate-600 text-[13px] font-black uppercase tracking-wider rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live Menu
                  </button>
                  <button 
                    onClick={() => setActiveItem('analytics')}
                    className="px-6 py-3 text-slate-600 text-[13px] font-black uppercase tracking-wider rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    Analytics
                  </button>
                  <button 
                    onClick={() => setActiveItem('orders')}
                    className="px-8 py-4 bg-slate-900 text-white text-[13px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    New Order
                  </button>
                </div>
              </div>

              {/* Responsive Grid Layout */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
                  <div className="lg:col-span-8 space-y-10">
                    <OverviewCards restaurantId={restaurantId} />
                    
                    <div className="space-y-4">
                       <div className="flex items-center justify-between px-2">
                         <h3 className="text-xl font-black text-slate-900 leading-none">Activity Feed</h3>
                         <button onClick={() => setActiveItem('orders')} className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</button>
                       </div>
                       <RecentOrders restaurantId={restaurantId} />
                    </div>
                  </div>
                  
                  <div className="lg:col-span-4 lg:sticky lg:top-10 h-fit">
                    <TableStatus restaurantId={restaurantId} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'qr-codes':
        return <QRCodeManagement 
          plan={plan}
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
          restaurantId={resolvedId || profile?.id || urlId}
        />
      
      case 'menu':
        return <MenuManagement 
          currency={currency} 
          onCurrencyChange={setCurrency} 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
          plan={plan}
        />
      
      case 'orders':
        return <OrderManagement 
          restaurantId={restaurantId} 
          activeItem={activeItem} 
          setActiveItem={setActiveItem} 
          navigate={navigate}
        />
      
      case 'tables':
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
        )
      
      case 'analytics':
        return <AnalyticsDashboard 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
          restaurantId={profile?.id}
          plan={plan}
        />
      
      case 'customers':
        if (plan?.name !== 'Enterprise' && plan?.name !== 'Professional') {
          return (
            <div className="h-full flex flex-col items-center justify-center p-6">
              <ModuleLockOverlay 
                featureName="Customer Management & CRM"
                requiredPlan="Professional"
                price="₹2,499"
              />
              <Button
                size="lg"
                onClick={() => {
                  setUpgradeLimitType('crm')
                  setShowUpgradeModal(true)
                }}
                className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Upgrade to Professional (₹2,499)
              </Button>
            </div>
          )
        }
        return <CustomerManagement 
          plan={plan} 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
          restaurantId={restaurantId}
        />
      
      case 'help':
        return <HelpSupport 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
          restaurantId={profile?.id || restaurantId}
        />
      
      case 'docs':
        return <Documentation 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
        />
      
      case 'releases':
        return <ReleaseNotes 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
        />
      
      case 'tutorials':
        return <VideoTutorials 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
        />
      
      case 'settings':
        return (
          <SettingsPage 
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            navigate={navigate}
            restaurantId={restaurantId}
            plan={plan}
            onUpgradeClick={() => {
              setUpgradeLimitType('general')
              setShowUpgradeModal(true)
            }}
          />
        )
      
      default:
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900">{activeItem}</h1>
            <p className="text-gray-600">Page content coming soon...</p>
          </div>
        )
    }
  }

  if (activeItem === 'docs' || activeItem === 'releases' || activeItem === 'tutorials') {
    const Component = 
      activeItem === 'docs' ? Documentation : 
      activeItem === 'releases' ? ReleaseNotes :
      VideoTutorials;

    return (
      <Component 
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        navigate={navigate}
      />
    )
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
          setUpgradeLimitType('general')
          setShowUpgradeModal(true)
        }}
      >
        {renderContent()}
      </Layout>

      {/* Global Upgrade Plan Modal */}
      <UpgradePlanModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlanName={plan?.name || 'Starter'}
        limitType={upgradeLimitType}
        restaurantId={resolvedId || profile?.id || urlId}
        merchantEmail={userEmail || (profile ? profile['email'] : '')}
        merchantName={profile?.business_name || 'Servora Merchant'}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false)
          verifyAuthAndPlan()
        }}
      />
    </>
  )
}

export default Dashboard
