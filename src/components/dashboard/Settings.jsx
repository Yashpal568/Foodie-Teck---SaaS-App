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
  CardTitle 
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
import SettingsMobileNavbar from './SettingsMobileNavbar'
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
    newPassword: ''
  })

  const [billingData, setBillingData] = useState({
    cards: [
      { id: 1, type: 'Visa', last4: '8849', expiry: '12/28', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg' }
    ],
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
  const [newCardData, setNewCardData] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: ''
  })

  const loadCloudConfig = async () => {
    try {
      setLoading(true)
      const restaurant = await getMyRestaurant()
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

        const sub = restaurant.subscriptions?.[0]
        if (sub) {
          setBillingData(prev => ({
            ...prev,
            plan: sub.plan_name || 'Starter',
            price: (sub.price || 999).toLocaleString()
          }))
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

  useEffect(() => {
    loadCloudConfig()
  }, [])

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result !== 'string') return

        setProfileData(prev => ({
          ...prev,
          [type]: result
        }))
        showToast(`${type === 'avatar' ? 'Logo' : 'Cover'} updated in preview. Click Save to deploy.`, 'success')
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

        if (securityData.newPassword) {
          const { error: passError } = await supabase.auth.updateUser({
            password: securityData.newPassword
          })
          if (passError) throw passError
          setSecurityData(prev => ({ ...prev, currentPassword: '', newPassword: '' }))
        }

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

  const handleDiscard = () => {
    if (window.confirm('Discard all unsaved changes and reload?')) {
      loadCloudConfig()
      showToast('Changes discarded.', 'success')
    }
  }

  const handleRemoveCard = (id) => {
    setBillingData(prev => ({
      ...prev,
      cards: prev.cards.filter(card => card.id !== id)
    }))
    showToast('Payment method removed.', 'success')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    if (navigate) navigate('/login')
  }

  const handleAddCard = (e) => {
    e.preventDefault()
    setAddCardError('')
    
    if (!newCardData.number || newCardData.number.length < 16) {
      setAddCardError('Please enter a valid 16-digit card number.')
      return
    }

    if (!newCardData.expiry || !newCardData.expiry.includes('/')) {
      setAddCardError('Expiry date must be in MM/YY format.')
      return
    }

    const newCard = {
      id: Date.now(),
      type: newCardData.number.startsWith('4') ? 'Visa' : 'Mastercard',
      last4: newCardData.number.slice(-4),
      expiry: newCardData.expiry,
      logo: newCardData.number.startsWith('4') 
        ? 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg'
        : 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg'
    }

    setBillingData(prev => ({
      ...prev,
      cards: [...prev.cards, newCard]
    }))

    setNewCardData({ name: '', number: '', expiry: '', cvv: '' })
    setIsAddCardOpen(false)
    showToast(`${newCard.type} card successfully added.`, 'success')
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

      <div className="hidden lg:flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 h-20 sticky top-0 z-40">
        <div className="flex items-center gap-8 h-full">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">Restaurant Settings</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Cloud Synchronization</span>
              </div>
            </div>
          </div>
          
          <Separator orientation="vertical" className="h-7 opacity-60" />

          <Tabs value={activeTab} onValueChange={setActiveTabState} className="h-full">
            <div className="h-full flex items-center">
              <TabsList className="bg-slate-100/70 p-1 rounded-xl border border-slate-200/50 gap-1 h-11">
                {[
                  { id: 'profile', label: 'Profile & Details', icon: User },
                  { id: 'notifications', label: 'Alerts', icon: Bell },
                  { id: 'security', label: 'Security', icon: ShieldCheck },
                  { id: 'billing', label: 'Subscription & Billing', icon: CreditCard },
                  { id: 'tax', label: 'GST & Taxes', icon: Percent }
                ].map(tab => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className="px-4 rounded-lg border-none data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-all h-full"
                  >
                    <tab.icon className="w-3.5 h-3.5 mr-2" /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>

        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            onClick={handleDiscard}
            className="h-10 px-5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 border-slate-200 transition-all"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Discard
          </Button>

          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-[11px] uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      <SettingsMobileNavbar 
        isSaving={isSaving}
        onSave={handleSave}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
      />

      <div className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="lg:hidden sticky top-20 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 p-2 overflow-x-auto no-scrollbar">
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

            <Card className="border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
              <div 
                className="h-44 sm:h-52 bg-gradient-to-r from-indigo-600 via-purple-600 to-slate-800 relative overflow-hidden bg-center bg-cover transition-all"
                style={{ backgroundImage: profileData.cover ? `url(${profileData.cover})` : 'none' }}
              >
                <Button 
                  onClick={() => coverRef.current?.click()}
                  variant="secondary" 
                  size="sm"
                  className="absolute right-4 top-4 bg-white/90 hover:bg-white text-slate-800 font-bold text-[11px] uppercase tracking-wider rounded-xl backdrop-blur-md shadow-sm border border-white/40 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> 
                  Change Cover Banner
                </Button>
              </div>

              <CardContent className="px-6 sm:px-8 pb-8 -mt-14 relative z-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8 text-center sm:text-left">
                  <div className="relative group rounded-2xl border-4 border-white bg-white shadow-md">
                    <Avatar className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl">
                      <AvatarImage src={profileData.avatar} className="object-cover" />
                      <AvatarFallback className="bg-indigo-50 text-indigo-600 text-3xl font-black uppercase">
                        {profileData.name.charAt(0) || 'R'}
                      </AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => profileRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-9 h-9 bg-indigo-600 text-white rounded-xl shadow-md border-2 border-white flex items-center justify-center hover:bg-indigo-700 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 pb-1">
                    <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {profileData.name || 'Restaurant Name'}
                      </h2>
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg">
                        Verified Merchant
                      </Badge>
                    </div>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-xs text-slate-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {profileData.email || 'No email set'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {profileData.address || 'Location not specified'}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="mb-8" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-indigo-500" /> Business / Restaurant Name
                    </Label>
                    <Input 
                      value={profileData.name} 
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      placeholder="e.g. Royal Bistro"
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white transition-all px-4" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Phone Number
                    </Label>
                    <Input 
                      value={profileData.phone} 
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+91 9876543210"
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white transition-all px-4" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Contact Email Address
                    </Label>
                    <Input 
                      value={profileData.email} 
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      placeholder="owner@restaurant.com"
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white transition-all px-4" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-500" /> Short Description / Tagline
                    </Label>
                    <Input 
                      value={profileData.description} 
                      onChange={(e) => setProfileData({...profileData, description: e.target.value})}
                      placeholder="Authentic North Indian & Chinese Fine Dining"
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white transition-all px-4" 
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Full Physical Address
                    </Label>
                    <Input 
                      value={profileData.address} 
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      placeholder="Plot 45, MG Road, Connaught Place, New Delhi"
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white transition-all px-4" 
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                  <Button 
                    onClick={handleSignOut}
                    variant="outline"
                    className="h-10 px-4 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Sign Out Account
                  </Button>

                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0 outline-none">
            <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 tracking-tight">Notification Alerts</CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">Configure real-time push events and system alerts.</CardDescription>
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
              <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white">
                <CardHeader className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black text-slate-900 tracking-tight">Password & Password Security</CardTitle>
                      <CardDescription className="text-xs text-slate-500 font-medium">Update your account login password.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Min. 8 characters" 
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                        className="h-12 bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-900 pr-10" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSave}
                    disabled={isSaving || !securityData.newPassword}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {isSaving ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white">
                <CardHeader className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black text-slate-900 tracking-tight">Account Protection</CardTitle>
                      <CardDescription className="text-xs text-slate-500 font-medium">Session verification & two-step alerts.</CardDescription>
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
              <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-900 text-white overflow-hidden p-6 sm:p-8 relative">
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <Badge className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-lg">
                      Active Subscription
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {billingData.plan} Plan
                    </h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">₹{billingData.price}</span>
                      <span className="text-xs text-slate-300 font-bold">/month</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4 text-amber-300" />
                    Upgrade Plan
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 tracking-tight">Saved Payment Methods</CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">Manage corporate cards and UPI handles.</CardDescription>
                  </div>
                  <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Card
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border-0 shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-black">Add Payment Card</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">Save a new credit or debit card for subscription billing.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddCard} className="space-y-4 mt-4">
                        {addCardError && (
                          <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">{addCardError}</p>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Cardholder Name</Label>
                          <Input 
                            placeholder="JOHN DOE"
                            value={newCardData.name}
                            onChange={(e) => setNewCardData({...newCardData, name: e.target.value.toUpperCase()})}
                            className="h-11 rounded-xl"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Card Number</Label>
                          <Input 
                            placeholder="4000 0000 0000 0000"
                            maxLength={16}
                            value={newCardData.number}
                            onChange={(e) => setNewCardData({...newCardData, number: e.target.value.replace(/\D/g, '')})}
                            className="h-11 rounded-xl tracking-widest"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Expiry (MM/YY)</Label>
                            <Input 
                              placeholder="12/28"
                              maxLength={5}
                              value={newCardData.expiry}
                              onChange={(e) => setNewCardData({...newCardData, expiry: e.target.value})}
                              className="h-11 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">CVV</Label>
                            <Input 
                              placeholder="123"
                              maxLength={3}
                              value={newCardData.cvv}
                              onChange={(e) => setNewCardData({...newCardData, cvv: e.target.value.replace(/\D/g, '')})}
                              className="h-11 rounded-xl"
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl mt-2 cursor-pointer">
                          Save Card
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {billingData.cards.map(card => (
                      <div key={card.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1">
                            <img src={card.logo} className="h-4 object-contain" alt={card.type} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{card.type} ending in {card.last4}</p>
                            <p className="text-[11px] text-slate-500 font-semibold">Expires {card.expiry}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveCard(card.id)}
                          className="text-slate-400 hover:text-rose-600 p-2 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tax" className="mt-0 outline-none">
            <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 tracking-tight">GST & Tax Configuration</CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">Define tax percentage automatically added to customer orders.</CardDescription>
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
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">GST Rate (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="28"
                        step="0.5"
                        placeholder="5"
                        value={gstData.rate}
                        onChange={(e) => setGstData(p => ({...p, rate: e.target.value}))}
                        className="h-12 bg-slate-50/50 border-slate-200 rounded-xl font-bold text-lg text-slate-900 pr-10"
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
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bill Tax Label</Label>
                    <Input
                      type="text"
                      placeholder="e.g. GST, SGST+CGST"
                      value={gstData.label}
                      onChange={(e) => setGstData(p => ({...p, label: e.target.value}))}
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-900"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">This text is shown on the customer's digital bill.</p>
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
