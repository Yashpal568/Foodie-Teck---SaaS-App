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
  AlertCircle
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
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

export default function Settings({ activeItem, setActiveItem, navigate, restaurantId }) {
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

      // ── Step 1: Resolve restaurant record ──────────────────────────────
      // Prefer the restaurantId prop (UUID from the URL) — fall back to getMyRestaurant()
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

      // Final fallback to session-based lookup
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

        // ── Step 2: Resolve subscription plan ─────────────────────────────
        let planName = 'Starter'
        let planPrice = '999'
        try {
          // 2a. Try joined subscriptions (freshest — any non-cancelled status)
          const joinedSubs = restaurant.subscriptions
          const activeSub = Array.isArray(joinedSubs)
            ? joinedSubs
                .filter(s => !['Cancelled', 'CANCELLED', 'cancelled', 'Rejected'].includes(s.status))
                .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0))[0]
            : null

          if (activeSub?.plan_name) {
            planName = activeSub.plan_name
            planPrice = activeSub.price
              ? activeSub.price.toString()
              : (activeSub.plan_name === 'Professional' ? '2499' : activeSub.plan_name === 'Enterprise' ? '4999' : '999')
          } else {
            // 2b. Direct query — broaden filter to all non-cancelled statuses
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
              // 2c. Check payment_verifications as last resort
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

        // Load Payment Methods
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

        const savedNotifs = localStorage.getItem(`servora_notifs_${restaurant.id}`)
        if (savedNotifs) {
          try { setNotifications(JSON.parse(savedNotifs)) } catch (e) {}
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
    // Only reload if restaurantId has actually changed to a real value
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
          
          // Compress to JPEG with 60% quality to ensure lightning fast DB saves
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

        localStorage.setItem(`servora_notifs_${targetRid}`, JSON.stringify(notifications))

        showToast('Settings saved & synchronized successfully.', 'success')
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
    if (window.confirm('Discard all unsaved changes and reload?')) {
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
    await supabase.auth.signOut()
    if (navigate) navigate('/login')
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

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50 relative">
      <div className={cn(
        "fixed top-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 pointer-events-none transform",
        toast.show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-6 scale-95"
      )}>
        <div className={cn(
          "px-6 py-4 rounded-2xl shadow-xl backdrop-blur-xl border flex items-center gap-4 min-w-[300px]",
          toast.type === 'success' 
            ? "bg-slate-900/95 text-white border-slate-800" 
            : "bg-rose-600 text-white border-rose-500"
        )}>
          {toast.type === 'success' ? (
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">System Notice</p>
            <p className="text-[12px] font-bold tracking-tight">{toast.message}</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16 items-center px-6 shadow-sm">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                <SettingsIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold leading-none tracking-tight text-foreground">Restaurant Settings</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Cloud Synced</span>
                </div>
              </div>
            </div>
            
            <Separator orientation="vertical" className="h-6" />

            <Tabs value={activeTab} onValueChange={setActiveTabState} className="w-auto">
              <TabsList className="h-9 p-1 bg-muted/50 rounded-md border border-border/50">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'notifications', label: 'Alerts', icon: Bell },
                  { id: 'security', label: 'Security', icon: ShieldCheck },
                  { id: 'billing', label: 'Billing', icon: CreditCard },
                  { id: 'tax', label: 'Taxes', icon: Percent }
                ].map(tab => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className="rounded-sm px-3 text-[11px] font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground h-7"
                  >
                    <tab.icon className="h-3.5 w-3.5 mr-1.5" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleDiscard}
              size="sm"
              className="h-9 text-xs font-medium hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Discard
            </Button>

            <Button 
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>



      <div className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="lg:hidden sticky top-0 -mx-4 px-4 sm:-mx-8 sm:px-8 z-40 bg-[#f8fafc] pb-2 pt-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'notifications', label: 'Alerts', icon: Bell },
              { id: 'security', label: 'Security', icon: ShieldCheck },
              { id: 'billing', label: 'Billing', icon: CreditCard },
              { id: 'tax', label: 'GST Tax', icon: Percent }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTabState(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all",
                  activeTab === tab.id 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "bg-slate-100 text-slate-500 hover:text-slate-800"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTabState} className="w-full">
          <TabsList className="hidden"><></></TabsList>

          <TabsContent value="profile" className="mt-0 space-y-6 outline-none">
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
