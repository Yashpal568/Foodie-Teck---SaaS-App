import React, { useState, useEffect, useRef } from 'react'
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  ShieldCheck, 
  CreditCard, 
  Store, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Save, 
  Lock,
  Smartphone, 
  Landmark,
  Eye, 
  EyeOff, 
  CheckCircle2,
  Loader2, 
  ShoppingCart, 
  Users, 
  X, 
  Info,
  LogOut,
  Percent, 
  Receipt, 
  Crown,
  ArrowRight,
  Trash2,
  Plus,
  AlertCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

import UpgradePlanModal from './UpgradePlanModal'
import TaxSettings from '../settings/TaxSettings'
import SecuritySettings from '../settings/SecuritySettings'
import NotificationSettings from '../settings/NotificationSettings'
import BillingSettings from '../settings/BillingSettings'
import ProfileSettings from '../settings/ProfileSettings'
import { 
  fetchGstSettings, 
  saveGstSettings, 
  getCachedRestaurantId,
  getMyRestaurant,
  updateRestaurantProfile,
  supabase
} from '@/lib/api'

export default function Settings({ activeItem, setActiveItem, navigate, restaurantId, plan, onUpgradeClick }) {
  const profileRef = useRef(null)
  const coverRef = useRef(null)

  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTabState] = useState('profile')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    avatar: '',
    cover: ''
  })

  const [securityData, setSecurityData] = useState({
    mfaEnabled: true,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [billingData, setBillingData] = useState({
    paymentMethods: [],
    plan: 'Starter',
    price: '999'
  })

  const [gstData, setGstData] = useState({
    enabled: false,
    rate: '5',
    label: 'GST'
  })

  const [notifications, setNotifications] = useState({
    orders: true,
    revenue: true,
    inventory: false,
    customers: true
  })

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  const [isAddCardOpen, setIsAddCardOpen] = useState(false)
  const [addCardError, setAddCardError] = useState('')
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'CREDIT_CARD',
    name: '',
    number: '',
    expiry: '',
    cvv: '',
    upiId: '',
    accountNumber: '',
    ifsc: ''
  })

  const loadCloudConfig = async () => {
    try {
      setLoading(true)

      let restaurant = null

      if (restaurantId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)
        if (isUUID) {
          const { data } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .maybeSingle()
          restaurant = data
        } else if (restaurantId.includes('@')) {
          const { data } = await supabase
            .from('restaurants')
            .select('*')
            .eq('email', restaurantId.toLowerCase())
            .maybeSingle()
          restaurant = data
        }
      }

      if (!restaurant) {
        restaurant = await getMyRestaurant()
      }

      if (restaurant) {
        setProfileData({
          name: restaurant.business_name || '',
          email: restaurant.email || '',
          phone: restaurant.phone || '',
          address: restaurant.address || '',
          description: restaurant.description || '',
          avatar: restaurant.logo_url || '',
          cover: restaurant.cover_url || ''
        })

        const gst = await fetchGstSettings(restaurant.id)
        if (gst) {
          setGstData({
            enabled: gst.enabled,
            rate: (gst.rate || 0).toString(),
            label: gst.label || 'GST'
          })
        }

        let planName = 'Starter'
        let planPrice = '999'
        try {
          const joinedSubs = restaurant.subscriptions
          const activeSub = Array.isArray(joinedSubs)
            ? joinedSubs
                .filter(s => !['Cancelled', 'CANCELLED', 'cancelled', 'Rejected'].includes(s.status))
                .sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime())[0]
            : null

          if (activeSub?.plan_name) {
            planName = activeSub.plan_name
            planPrice = activeSub.price
              ? activeSub.price.toString()
              : (activeSub.plan_name === 'Professional' ? '2499' : activeSub.plan_name === 'Enterprise' ? '4999' : '999')
          } else {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('plan_name, price, status')
              .eq('restaurant_id', restaurant.id)
              .not('status', 'in', '("Cancelled","CANCELLED","cancelled","Rejected")')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (sub?.plan_name) {
              planName = sub.plan_name
              planPrice = sub.price
                ? sub.price.toString()
                : (sub.plan_name === 'Professional' ? '2499' : sub.plan_name === 'Enterprise' ? '4999' : '999')
            } else {
              const { data: verif } = await supabase
                .from('payment_verifications')
                .select('plan_name, status')
                .eq('restaurant_id', restaurant.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              if (verif?.plan_name) {
                planName = verif.plan_name
                planPrice = planName === 'Professional' ? '2499' : planName === 'Enterprise' ? '4999' : '999'
              }
            }
          }
        } catch (e) {
          console.warn('Could not load subscription:', e)
        }

        setBillingData(prev => ({
          ...prev,
          plan: planName,
          price: planPrice
        }))

        try {
          const { data: pms } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('created_at', { ascending: true })
          if (pms) {
            setBillingData(prev => ({ ...prev, paymentMethods: pms }))
          }
        } catch (e) {
          console.warn('Could not load payment methods:', e)
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
      showToast('Cloud sync warning: Using cached settings.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const lastLoadedId = React.useRef(null)
  useEffect(() => {
    if (!restaurantId) return
    if (lastLoadedId.current === restaurantId) return
    lastLoadedId.current = restaurantId
    loadCloudConfig()
  }, [restaurantId])

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result !== 'string') return

        const img = new Image()
        img.src = result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 800
          const MAX_HEIGHT = 800
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          const compressedData = canvas.toDataURL('image/jpeg', 0.6)

          setProfileData(prev => ({
            ...prev,
            [type]: compressedData
          }))
          showToast(`${type === 'avatar' ? 'Logo' : 'Cover'} updated in preview. Click Save to deploy.`, 'success')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const targetRid = restaurantId || getCachedRestaurantId()
    
    try {
      if (targetRid) {
        await updateRestaurantProfile(targetRid, {
          name: profileData.name,
          phone: profileData.phone,
          address: profileData.address,
          description: profileData.description,
          avatar: profileData.avatar,
          cover: profileData.cover
        })

        await saveGstSettings(targetRid, gstData)

        showToast('Settings successfully synchronized to cloud.', 'success')
      }
    } catch (err) {
      console.error('Save failed:', err)
      showToast(`Save failed: ${err.message || 'Database update error.'}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!securityData.newPassword || !securityData.confirmPassword) {
      showToast('Please fill all password fields.', 'error')
      return;
    }
    if (securityData.newPassword !== securityData.confirmPassword) {
      showToast('New passwords do not match.', 'error')
      return;
    }
    if (securityData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error')
      return;
    }

    setIsSaving(true)
    
    try {
      const { error: passError } = await supabase.auth.updateUser({
        password: securityData.newPassword
      })
      if (passError) throw passError
      
      setSecurityData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
      showToast('Password updated successfully.', 'success')
    } catch (err) {
      console.error('Password update failed:', err)
      if (err.message && err.message.toLowerCase().includes('different from the old password')) {
        showToast('Please choose a new password that is different from your current one.', 'error')
      } else {
        showToast(`Password update failed: ${err.message}`, 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    if (window.confirm('Discard all unsaved changes and reload settings?')) {
      loadCloudConfig()
      showToast('Changes discarded.', 'success')
    }
  }

  const handleRemoveCard = async (id) => {
    try {
      await supabase.from('payment_methods').delete().eq('id', id)
      setBillingData(prev => ({
        ...prev,
        paymentMethods: prev.paymentMethods.filter(pm => pm.id !== id)
      }))
      showToast('Payment method removed.', 'success')
    } catch (e) {
      showToast('Failed to remove payment method.', 'error')
    }
  }

  const handleSignOut = async () => {
    sessionStorage.clear()
    localStorage.removeItem('servora_restaurant_id')
    localStorage.removeItem('servora_user_email')
    try { await supabase.auth.signOut() } catch (e) {}
    if (navigate) navigate('/login', { replace: true })
  }

  const handleAddCard = async (e) => {
    e.preventDefault()
    setAddCardError('')
    
    let details = {}
    
    if (newPaymentMethod.type === 'CREDIT_CARD' || newPaymentMethod.type === 'DEBIT_CARD') {
      if (!newPaymentMethod.number || newPaymentMethod.number.length < 15) {
        setAddCardError('Please enter a valid card number.')
        return
      }
      if (!newPaymentMethod.expiry || !newPaymentMethod.expiry.includes('/')) {
        setAddCardError('Expiry date must be in MM/YY format.')
        return
      }
      details = {
        name: newPaymentMethod.name,
        last4: newPaymentMethod.number.slice(-4),
        expiry: newPaymentMethod.expiry
      }
    } else if (newPaymentMethod.type === 'UPI') {
      if (!newPaymentMethod.upiId || !newPaymentMethod.upiId.includes('@')) {
        setAddCardError('Please enter a valid UPI handle.')
        return
      }
      details = { upiId: newPaymentMethod.upiId }
    } else if (newPaymentMethod.type === 'ACCOUNT_TRANSFER') {
      if (!newPaymentMethod.accountNumber || !newPaymentMethod.ifsc) {
        setAddCardError('Account number and IFSC are required.')
        return
      }
      details = {
        accountNumber: newPaymentMethod.accountNumber,
        ifsc: newPaymentMethod.ifsc
      }
    }

    setIsSaving(true)
    try {
      const targetRid = restaurantId || getCachedRestaurantId()
      const { data, error } = await supabase.from('payment_methods').insert({
        restaurant_id: targetRid,
        type: newPaymentMethod.type,
        details: details
      }).select().single()

      if (error) throw error

      setBillingData(prev => ({
        ...prev,
        paymentMethods: [...(prev.paymentMethods || []), data]
      }))

      setNewPaymentMethod({ type: 'CREDIT_CARD', name: '', number: '', expiry: '', cvv: '', upiId: '', accountNumber: '', ifsc: '' })
      setIsAddCardOpen(false)
      showToast('Payment method successfully added.', 'success')
    } catch (e) {
      console.error(e)
      setAddCardError('Database error. Please make sure you have run the schema update script.')
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile & Brand', icon: Store },
    { id: 'notifications', label: 'Alerts & Chimes', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
    { id: 'tax', label: 'GST & Taxes', icon: Percent }
  ]

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f8fafc] relative selection:bg-indigo-500 selection:text-white">
      {/* 🌟 AMBIENT GLOW MESH IN BACKGROUND 🌟 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-10 left-1/4 w-125 h-125 bg-indigo-500/5 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-1/4 w-100 h-100 bg-purple-500/5 rounded-full blur-[140px]" />
      </div>

      {/* 🔔 FLOATING LUXURY NOTIFICATION TOAST 🔔 */}
      <div className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 z-100 transition-all duration-500 pointer-events-none transform",
        toast.show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-6 scale-95"
      )}>
        <div className={cn(
          "px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-2xl border flex items-center gap-3.5 min-w-[320px]",
          toast.type === 'success' 
            ? "bg-slate-950/95 text-white border-slate-800 shadow-slate-950/30" 
            : "bg-rose-950/95 text-white border-rose-800 shadow-rose-950/30"
        )}>
          {toast.type === 'success' ? (
            <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/40 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-rose-500/20 rounded-xl flex items-center justify-center border border-rose-500/40 shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
          )}
          <div className="flex flex-col">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Servora Cloud Sync</p>
            <p className="text-xs font-bold tracking-tight text-white">{toast.message}</p>
          </div>
        </div>
      </div>

      {/* 💻 STICKY DESKTOP COMMAND HUB HEADER (H-20) 💻 */}
      <div className="hidden lg:flex sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-2xl h-20 items-center px-8 shadow-xs transition-all">
        <div className="flex flex-1 items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          
          {/* Brand & Sync Indicator */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-black leading-none tracking-tight text-slate-900">
                  Restaurant Settings
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Real-time Cloud Synced
                  </span>
                </div>
              </div>
            </div>
            
            <Separator orientation="vertical" className="h-8 bg-slate-200" />

            {/* Segmented Desktop Glass Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTabState} className="w-auto">
              <TabsList className="h-12 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner flex gap-1">
                {tabs.map(tab => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className="rounded-xl px-4 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-slate-600 hover:text-slate-900 h-9 flex items-center gap-2 cursor-pointer"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleDiscard}
              className="h-11 px-4 text-xs font-bold rounded-xl border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer"
            >
              <X className="h-4 w-4 mr-1.5" />
              Discard
            </Button>

            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 px-6 text-xs font-black uppercase tracking-wider rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4 text-amber-300" />
              )}
              <span>{isSaving ? 'Deploying Changes...' : 'Save Changes'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 📱 MOBILE STICKY TAB SCROLLER 📱 */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">Settings</h2>
              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Cloud Connected</p>
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="h-9 px-3.5 text-[11px] font-black uppercase tracking-wider rounded-xl bg-indigo-600 text-white shadow-sm"
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1 text-amber-300" />}
            Save
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabState(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 border",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                  : "bg-slate-100/80 text-slate-600 border-slate-200/80 hover:bg-slate-200"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 📂 MAIN SETTINGS CONTENT AREA 📂 */}
      <div className="flex-1 p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-6 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTabState} className="w-full">
          <TabsList className="hidden"><></></TabsList>

          <TabsContent value="profile" className="mt-0 outline-none">
            <ProfileSettings 
              profileData={profileData} 
              setProfileData={setProfileData} 
              coverRef={coverRef} 
              profileRef={profileRef} 
              handleImageUpload={handleImageUpload} 
              handleSignOut={handleSignOut} 
            />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0 outline-none">
            <NotificationSettings 
              notifications={notifications} 
              setNotifications={setNotifications} 
            />
          </TabsContent>

          <TabsContent value="security" className="mt-0 outline-none">
            <SecuritySettings 
              securityData={securityData} 
              setSecurityData={setSecurityData} 
              isSaving={isSaving}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              handlePasswordUpdate={handlePasswordUpdate}
            />
          </TabsContent>

          <TabsContent value="billing" className="mt-0 outline-none">
            <BillingSettings 
              billingData={billingData}
              setShowUpgradeModal={setShowUpgradeModal}
              isAddCardOpen={isAddCardOpen}
              setIsAddCardOpen={setIsAddCardOpen}
              newPaymentMethod={newPaymentMethod}
              setNewPaymentMethod={setNewPaymentMethod}
              addCardError={addCardError}
              handleAddCard={handleAddCard}
              handleRemoveCard={handleRemoveCard}
              isSaving={isSaving}
            />
          </TabsContent>

          <TabsContent value="tax" className="mt-0 outline-none">
            <TaxSettings 
              gstData={gstData} 
              setGstData={setGstData} 
              isSaving={isSaving} 
              handleSave={handleSave} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 🚀 UPGRADE SUBSCRIPTION MODAL 🚀 */}
      <UpgradePlanModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlanName={billingData.plan}
        restaurantId={restaurantId}
        merchantEmail={profileData.email}
        merchantName={profileData.name}
        onUpgradeSuccess={() => {
          loadCloudConfig()
          showToast('Plan upgraded successfully!', 'success')
        }}
      />
    </div>
  )
}
