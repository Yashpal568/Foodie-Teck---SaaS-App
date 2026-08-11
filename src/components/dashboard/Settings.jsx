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
            <input type="file" ref={coverRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
            <input type="file" ref={profileRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

            <Card className="border border-border/60 shadow-sm bg-white overflow-hidden flex flex-col">
              <div 
                className="h-32 bg-muted relative overflow-hidden bg-center bg-cover transition-all border-b border-border/50"
                style={{ backgroundImage: profileData.cover ? `url(${profileData.cover})` : 'none' }}
              >
                <Button 
                  onClick={() => coverRef.current?.click()}
                  variant="secondary" 
                  size="sm"
                  className="absolute right-4 top-4 h-8 bg-background/80 hover:bg-background/100 backdrop-blur-sm text-xs font-medium"
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5" /> 
                  Change Cover
                </Button>
              </div>

              <CardContent className="px-6 pt-0 pb-8 relative z-10 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 -mt-12 mb-8">
                  <div className="relative group rounded-full border-4 border-background bg-background shadow-sm inline-block">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profileData.avatar} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold uppercase">
                        {profileData.name.charAt(0) || 'R'}
                      </AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => profileRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full shadow-md border-2 border-background flex items-center justify-center hover:bg-primary/90 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 pb-1 flex flex-col sm:flex-row justify-between items-start sm:items-center sm:pl-2 gap-2">
                    <div>
                      <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                        {profileData.name || 'Restaurant Name'}
                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold h-5 px-1.5">Verified</Badge>
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium">
                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 opacity-70" /> {profileData.email || 'No email set'}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 opacity-70" /> {profileData.address || 'Location not specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Name</Label>
                    <Input 
                      value={profileData.name} 
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      placeholder="e.g. Royal Bistro"
                      className="h-9 font-medium" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</Label>
                    <Input 
                      value={profileData.phone} 
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+91 9876543210"
                      className="h-9 font-medium" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Email</Label>
                    <Input 
                      value={profileData.email} 
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      placeholder="owner@restaurant.com"
                      className="h-9 font-medium" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagline</Label>
                    <Input 
                      value={profileData.description} 
                      onChange={(e) => setProfileData({...profileData, description: e.target.value})}
                      placeholder="Authentic Fine Dining"
                      className="h-9 font-medium" 
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Physical Address</Label>
                    <Input 
                      value={profileData.address} 
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      placeholder="Plot 45, MG Road, New Delhi"
                      className="h-9 font-medium" 
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-muted/30 border-t border-border/50 flex justify-between items-center mt-auto">
                  <Button 
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Sign Out
                  </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0 outline-none">
            <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Notification Alerts</CardTitle>
                    <CardDescription className="text-sm text-slate-500 font-medium">Configure real-time push events and system alerts.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-100">
                {[
                  { key: 'orders', title: 'New Customer Orders Feed', desc: 'Receive instant chimes and popups when customers place QR orders.', icon: ShoppingCart },
                  { key: 'revenue', title: 'Daily Revenue Summaries', desc: 'Get daily sales rollups and daily target milestone alerts.', icon: Percent },
                  { key: 'inventory', title: 'Low Inventory & Stock Alerts', desc: 'Get notified when menu items are toggled out of stock.', icon: Store },
                  { key: 'customers', title: 'Customer Concierge & Waiter Calls', desc: 'Hear loud chimes when guests press Call Waiter from table.', icon: Users },
                ].map(({ key, title, desc, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between p-5 hover:bg-slate-50/60 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notifications[key]} 
                      onCheckedChange={(val) => setNotifications({...notifications, [key]: val})}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white flex flex-col overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shadow-inner">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Password Security</CardTitle>
                      <CardDescription className="text-sm text-slate-500 font-medium">Change your account login password.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5 flex-1">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Current Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter current password" 
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                      className="h-11 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-semibold text-slate-900" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">New Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        autoComplete="new-password"
                        placeholder="Min. 8 characters" 
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                        className="h-11 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-semibold text-slate-900 pr-10" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Confirm Password</Label>
                    <Input 
                      type="password" 
                      autoComplete="new-password"
                      placeholder="Confirm new password" 
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                      className="h-11 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-semibold text-slate-900" 
                    />
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    onClick={handlePasswordUpdate}
                    disabled={isSaving || !securityData.newPassword || !securityData.confirmPassword}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {isSaving ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Account Protection</CardTitle>
                      <CardDescription className="text-sm text-slate-500 font-medium">Session verification & two-step alerts.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Two-Factor Push Security</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Require device authorization on new logins.</p>
                    </div>
                    <Switch 
                      checked={securityData.mfaEnabled} 
                      onCheckedChange={(val) => setSecurityData({...securityData, mfaEnabled: val})}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-800">Your account authentication session is encrypted and active.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-0 outline-none">
            <div className="space-y-6">
              <Card className="border-0 shadow-lg overflow-hidden text-white rounded-2xl">
                <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 relative">
                  <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                    <Crown className="w-48 h-48 text-white mix-blend-overlay" />
                  </div>
                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-2.5">
                      <Badge className="bg-white/20 text-white border border-white/30 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md backdrop-blur-md shadow-sm hover:bg-white/30">
                        Active Subscription
                      </Badge>
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                        {billingData.plan} Plan
                      </h2>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black text-white tracking-tight drop-shadow-sm">₹{billingData.price}</span>
                        <span className="text-xs text-white/80 font-bold uppercase tracking-wider">/month</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => setShowUpgradeModal(true)}
                      className="bg-white hover:bg-slate-50 text-indigo-600 font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/20 border-0 h-11 px-6 rounded-xl transition-all"
                    >
                      <Crown className="w-4 h-4 mr-2 text-indigo-500" />
                      Upgrade Plan
                      <ArrowRight className="w-4 h-4 ml-2 text-indigo-500/70" />
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="border-border shadow-sm overflow-hidden bg-card text-card-foreground">
                <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between py-5 bg-muted/20">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Payout & Billing Methods</CardTitle>
                    <CardDescription>Manage bank accounts for payouts and corporate cards for billing.</CardDescription>
                  </div>
                  <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Method
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-xl p-6">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Add Payment Method</DialogTitle>
                        <DialogDescription>Save a new payment method for subscription billing.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddCard} className="space-y-4 mt-4">
                        {addCardError && (
                          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md font-medium border border-destructive/20">{addCardError}</div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Method Type</Label>
                          <select
                            value={newPaymentMethod.type}
                            onChange={(e) => setNewPaymentMethod({...newPaymentMethod, type: e.target.value})}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="DEBIT_CARD">Debit Card</option>
                            <option value="UPI">UPI</option>
                            <option value="ACCOUNT_TRANSFER">Account Transfer</option>
                          </select>
                        </div>
                        
                        {(newPaymentMethod.type === 'CREDIT_CARD' || newPaymentMethod.type === 'DEBIT_CARD') && (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Cardholder Name</Label>
                              <Input 
                                placeholder="JOHN DOE"
                                value={newPaymentMethod.name}
                                onChange={(e) => setNewPaymentMethod({...newPaymentMethod, name: e.target.value.toUpperCase()})}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Card Number</Label>
                              <Input 
                                placeholder="4000 0000 0000 0000"
                                maxLength={16}
                                value={newPaymentMethod.number}
                                onChange={(e) => setNewPaymentMethod({...newPaymentMethod, number: e.target.value.replace(/\D/g, '')})}
                                className="h-9 tracking-widest"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Expiry (MM/YY)</Label>
                                <Input 
                                  placeholder="12/28"
                                  maxLength={5}
                                  value={newPaymentMethod.expiry}
                                  onChange={(e) => setNewPaymentMethod({...newPaymentMethod, expiry: e.target.value})}
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">CVV</Label>
                                <Input 
                                  placeholder="123"
                                  maxLength={3}
                                  value={newPaymentMethod.cvv}
                                  onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cvv: e.target.value.replace(/\D/g, '')})}
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {newPaymentMethod.type === 'UPI' && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">UPI Handle</Label>
                            <Input 
                              placeholder="username@upi"
                              value={newPaymentMethod.upiId}
                              onChange={(e) => setNewPaymentMethod({...newPaymentMethod, upiId: e.target.value})}
                              className="h-9"
                            />
                          </div>
                        )}

                        {newPaymentMethod.type === 'ACCOUNT_TRANSFER' && (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Account Number</Label>
                              <Input 
                                placeholder="1234567890"
                                value={newPaymentMethod.accountNumber}
                                onChange={(e) => setNewPaymentMethod({...newPaymentMethod, accountNumber: e.target.value.replace(/\D/g, '')})}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">IFSC Code</Label>
                              <Input 
                                placeholder="SBIN0001234"
                                value={newPaymentMethod.ifsc}
                                onChange={(e) => setNewPaymentMethod({...newPaymentMethod, ifsc: e.target.value.toUpperCase()})}
                                className="h-9"
                              />
                            </div>
                          </>
                        )}

                        <Button type="submit" disabled={isSaving} className="w-full h-9 mt-2">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Method'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800">Payout Accounts (Receiving Earnings)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {billingData.paymentMethods?.filter(m => m.type === 'UPI' || m.type === 'ACCOUNT_TRANSFER').length > 0 ? (
                        billingData.paymentMethods.filter(m => m.type === 'UPI' || m.type === 'ACCOUNT_TRANSFER').map(method => (
                          <div key={method.id} className="p-4 bg-background rounded-lg border flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-8 bg-muted rounded border border-border flex items-center justify-center">
                                {method.type === 'UPI' && <Smartphone className="w-5 h-5 text-muted-foreground" />}
                                {method.type === 'ACCOUNT_TRANSFER' && <Landmark className="w-5 h-5 text-muted-foreground" />}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {method.type === 'UPI' ? method.details.upiId : `Acct ending in ${method.details.accountNumber?.slice(-4)}`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {method.type === 'UPI' ? 'Verified UPI' : `IFSC: ${method.details.ifsc}`}
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveCard(method.id)} 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full p-4 text-center bg-muted/20 border border-dashed rounded-lg">
                          <p className="text-sm text-muted-foreground">No payout accounts configured.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800">Billing Methods (Paying Subscriptions)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {billingData.paymentMethods?.filter(m => m.type === 'CREDIT_CARD' || m.type === 'DEBIT_CARD').length > 0 ? (
                        billingData.paymentMethods.filter(m => m.type === 'CREDIT_CARD' || m.type === 'DEBIT_CARD').map(method => (
                          <div key={method.id} className="p-4 bg-background rounded-lg border flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-8 bg-muted rounded border border-border flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {method.type.replace('_', ' ')} ending in {method.details.last4}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Expires {method.details.expiry}
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveCard(method.id)} 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full p-4 text-center bg-muted/20 border border-dashed rounded-lg">
                          <p className="text-sm text-muted-foreground">No billing cards saved.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tax" className="mt-0 outline-none">
            <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">GST & Tax Configuration</CardTitle>
                    <CardDescription className="text-sm text-slate-500 font-medium">Define tax percentage automatically added to customer orders.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", gstData.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")}>
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{gstData.enabled ? 'GST Enabled' : 'GST Disabled'}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Toggle to {gstData.enabled ? 'disable' : 'enable'} tax on customer bills.</p>
                    </div>
                  </div>
                  <Switch
                    checked={gstData.enabled}
                    onCheckedChange={(val) => setGstData(p => ({...p, enabled: val}))}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>

                <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-6 transition-all", !gstData.enabled && "opacity-40 pointer-events-none")}>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">GST Rate (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="28"
                        step="0.5"
                        placeholder="5"
                        value={gstData.rate}
                        onChange={(e) => setGstData(p => ({...p, rate: e.target.value}))}
                        className="h-12 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-bold text-lg text-slate-900 pr-10"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      {['5', '12', '18', '28'].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setGstData(p => ({...p, rate: r}))}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                            gstData.rate === r ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {r}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bill Tax Label</Label>
                    <Input
                      type="text"
                      placeholder="e.g. GST, SGST+CGST"
                      value={gstData.label}
                      onChange={(e) => setGstData(p => ({...p, label: e.target.value}))}
                      className="h-12 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-semibold text-slate-900 px-4"
                    />
                    <p className="text-xs text-slate-400 font-medium">This text is shown on the customer's digital bill.</p>
                  </div>
                </div>

                {gstData.enabled && Number(gstData.rate) > 0 && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-2">Live Customer Order Preview</p>
                    <div className="flex justify-between text-xs text-slate-600 font-semibold">
                      <span>Subtotal (Items)</span>
                      <span>₹500.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-700 font-bold">
                      <span>{gstData.label || 'GST'} ({gstData.rate}%)</span>
                      <span>₹{(500 * Number(gstData.rate) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-emerald-200">
                      <span>Total Payable</span>
                      <span>₹{(500 + 500 * Number(gstData.rate) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save Tax Settings
                </Button>
              </CardContent>
            </Card>
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
