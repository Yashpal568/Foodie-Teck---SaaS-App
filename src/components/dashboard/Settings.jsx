import React, { useState, useEffect, useRef } from 'react'
import { 
  User, Settings as SettingsIcon, Bell, 
  ShieldCheck, CreditCard, Store, 
  Mail, Phone, MapPin, Camera, 
  Trash2, Save, Globe, Lock,
  Smartphone, Eye, EyeOff, CheckCircle2,
  ChevronRight, Sparkles, Building2, Languages,
  DollarSign, Plus, RefreshCcw, Loader2, ArrowLeft,
  ShoppingCart, Users, X, Instagram, Twitter, Facebook, Clock, Activity, ExternalLink, AlertCircle, LogOut,
  Percent, Receipt, ToggleLeft, ToggleRight, Info
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
import { saveAndClearWorkspace } from '@/utils/workspace'
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

  // Data States
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
    plan: 'Loading...',
    price: '...'
  })

  // GST / Tax Configuration State
  const [gstData, setGstData] = useState({
    enabled: false,
    rate: '',
    label: 'GST'
  })

  // Notification Overlay State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  // Add Asset Modal State
  const [isAddCardOpen, setIsAddCardOpen] = useState(false)
  const [addCardError, setAddCardError] = useState('')
  const [newCardData, setNewCardData] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: ''
  })

  // Load Configuration from Supabase
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

        // Hydrate GST
        const gst = await fetchGstSettings(restaurant.id)
        if (gst) {
          setGstData({
            enabled: gst.enabled,
            rate: (gst.rate || 0).toString(),
            label: gst.label || 'GST'
          })
        }

        // Hydrate Plan (from subscriptions relation if exists, fallback to localStorage cache)
        const sub = restaurant.subscriptions?.[0]
        if (sub) {
          setBillingData(prev => ({
            ...prev,
            plan: sub.plan_name,
            price: sub.price.toLocaleString()
          }))
        } else {
          // Fallback to local cache for plan if not in DB yet
          const activePlan = JSON.parse(localStorage.getItem('servora_plan') || '{}')
          if (activePlan.name) {
            setBillingData(prev => ({
              ...prev,
              plan: activePlan.name,
              price: activePlan.price.toLocaleString()
            }))
          }
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
      showToast('Synchronization error: Cloud unavailable.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCloudConfig()
  }, [])

  const [notifications, setNotifications] = useState({
    orders: true,
    revenue: true,
    inventory: false,
    customers: true
  })

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
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const restaurantId = getCachedRestaurantId()
    
    try {
      if (restaurantId) {
        // 1. Update Profile in Supabase
        await updateRestaurantProfile(restaurantId, {
          name: profileData.name,
          phone: profileData.phone,
          address: profileData.address,
          description: profileData.description,
          avatar: profileData.avatar,
          cover: profileData.cover
        })

        // 2. Update GST in Supabase
        await saveGstSettings(restaurantId, gstData)

        // 3. Optional: Sync local storage for faster UI identity
        const user = JSON.parse(localStorage.getItem('servora_user') || '{}')
        localStorage.setItem('servora_user', JSON.stringify({
          ...user,
          businessName: profileData.name,
          phone: profileData.phone
        }))

        showToast('Settings successfully synchronized to Supabase Cloud.', 'success')
      }
    } catch (err) {
      console.error('Save failed:', err)
      showToast('Synchronization failed: Cloud database update error.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    if (window.confirm('Discard all unsynchronized administrative changes?')) {
      window.location.reload()
    }
  }

  // Financial Handlers
  const handleRemoveCard = (id) => {
    setBillingData(prev => ({
      ...prev,
      cards: prev.cards.filter(card => card.id !== id)
    }))
  }

  const handleSignOut = async () => {
    // Terminate secure session state and save snapshot
    saveAndClearWorkspace()
    localStorage.removeItem('userProfile')
    await supabase.auth.signOut()
    // Reroute to authentication gate
    navigate('/login')
  }

  const handleAddCard = (e) => {
    e.preventDefault()
    setAddCardError('')
    
    // Validate structural integrity
    if (!newCardData.number || newCardData.number.length < 16) {
      setAddCardError('Invalid Account Number: Insufficient length detected.')
      return
    }

    if (!newCardData.expiry || !newCardData.expiry.includes('/')) {
      setAddCardError('Lifecycle Breach: Ensure MM/YY format is correctly defined.')
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

    // Reset and Close
    setNewCardData({ name: '', number: '', expiry: '', cvv: '' })
    setIsAddCardOpen(false)
    showToast(`${newCard.type} Asset successfully integrated and hardened.`, 'success')
  }

  const handleUpgrade = () => {
    showToast('Initializing Upgrade Protocol: Contacting Servora Relations...', 'success')
  }

  const handleTransactionLogs = () => {
    showToast('Fiscal encryption layer active. No external sessions detected.', 'error')
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f8fafc] relative">
      {/* Servora Platform Notification Engine */}
      <div className={cn(
        "fixed top-32 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 pointer-events-none transform",
        toast.show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-8 scale-90"
      )}>
        <div className={cn(
          "px-8 py-5 rounded-[2rem] shadow-2xl backdrop-blur-3xl border flex items-center gap-5 min-w-[320px]",
          toast.type === 'success' 
            ? "bg-slate-900/95 text-white border-white/10" 
            : "bg-rose-500/95 text-white border-rose-400/20"
        )}>
          {toast.type === 'success' ? (
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">System Event</p>
            <p className="text-[13px] font-bold tracking-tight">{toast.message}</p>
          </div>
        </div>
      </div>
      {/* 
        PREMIUM UNIFIED SETTINGS NAVBAR 
        Integrates Title, Tabs, and Actions into a single professional bar.
      */}
      <div className="hidden lg:flex items-center justify-between px-8 bg-white/70 backdrop-blur-xl border-b border-gray-100/50 h-20 sticky top-0 z-40 transition-all">
        <div className="flex items-center gap-10 h-full">
          {/* Page Identity */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white rounded-[1.25rem] shadow-sm border border-gray-100 flex items-center justify-center text-blue-600 transition-all hover:scale-105 active:scale-95 group">
              <SettingsIcon className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-1">Configuration</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Admin Channel</span>
              </div>
            </div>
          </div>
          
          <Separator orientation="vertical" className="h-8 opacity-50" />

          {/* Premium Glass-Capsule Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTabState} className="h-full">
            <div className="h-full flex items-center">
              <TabsList className="bg-slate-50/50 p-1 rounded-2xl border border-slate-100/50 gap-1 h-12">
                {[
                  { id: 'profile', label: 'Identity', icon: User },
                  { id: 'notifications', label: 'Alerts', icon: Bell },
                  { id: 'security', label: 'Defenses', icon: ShieldCheck },
                  { id: 'billing', label: 'Treasury', icon: CreditCard },
                  { id: 'tax', label: 'GST / Tax', icon: Percent }
                ].map(tab => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className="px-5 rounded-xl border-none data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-bold text-[10px] uppercase tracking-wider text-slate-400 transition-all hover:text-slate-600 h-full"
                  >
                    <tab.icon className="w-3.5 h-3.5 mr-2" /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>

        {/* Executive Actions */}
        <div className="flex items-center gap-3">
           <Button 
             variant="ghost" 
             onClick={handleDiscard}
             className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all group border border-transparent hover:border-rose-100"
           >
             <X className="w-3.5 h-3.5 mr-2 group-hover:rotate-90 transition-transform" />
             Rollback
           </Button>

           <Button 
             onClick={handleSave}
             disabled={isSaving}
             className="bg-slate-900 hover:bg-black text-white font-bold h-10 px-8 rounded-xl shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap text-[10px] uppercase tracking-wider flex items-center gap-2 group disabled:opacity-70 border-b-2 border-black"
           >
             {isSaving ? (
               <Loader2 className="w-3.5 h-3.5 animate-spin" />
             ) : (
               <Save className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
             )}
             <span>{isSaving ? 'Syncing...' : 'Deploy Changes'}</span>
           </Button>
        </div>
      </div>

      <SettingsMobileNavbar 
        isSaving={isSaving}
        onSave={handleSave}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
      />

      <div className="flex-1 p-0 overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTabState} className="w-full h-full flex flex-col">
          <TabsList className="hidden"><></></TabsList>

          <div className="w-full max-w-[1600px] mx-auto lg:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Redesigned Premium Mobile Tab Navigation */}
            <div className="lg:hidden sticky top-20 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-2 overflow-x-auto no-scrollbar scroll-smooth">
              <div className="flex gap-2 min-w-max px-2">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'notifications', label: 'Alerts', icon: Bell },
                  { id: 'security', label: 'Security', icon: ShieldCheck },
                  { id: 'billing', label: 'Billing', icon: CreditCard },
                  { id: 'tax', label: 'GST / Tax', icon: Percent }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabState(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition-all duration-300",
                      activeTab === tab.id 
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 scale-105" 
                        : "bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100/50"
                    )}
                  >
                    <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-blue-400" : "text-slate-400")} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-8 space-y-8">

            {/* Profile Tab Content */}
            <TabsContent value="profile" className="mt-0 outline-none">
              <input 
                type="file" 
                ref={coverRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'cover')} 
              />
              <input 
                type="file" 
                ref={profileRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'avatar')} 
              />

              <Card className="border-0 shadow-2xl shadow-blue-500/5 ring-1 ring-gray-100 rounded-[3rem] overflow-hidden bg-white">
                {/* Compact Immersive Cover Photography Section */}
                <div 
                  className="h-48 sm:h-56 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden bg-center bg-cover transition-all duration-700"
                  style={{ backgroundImage: profileData.cover ? `url(${profileData.cover})` : 'none' }}
                >
                  {!profileData.cover && (
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse" />
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all duration-500" />
                  
                  <Button 
                    onClick={() => coverRef.current?.click()}
                    variant="secondary" 
                    className="absolute right-6 top-6 sm:right-8 sm:bottom-8 h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-white/90 backdrop-blur-xl text-slate-900 border border-white/20 hover:bg-white transition-all shadow-2xl hover:scale-105 active:scale-95 z-20 group"
                  >
                    <Camera className="w-4 h-4 mr-2 text-blue-600 group-hover:rotate-12 transition-transform" /> 
                    Change Cover
                  </Button>
                </div>

                <CardContent className="px-6 sm:px-12 pb-12 -mt-12 sm:-mt-16 relative z-10 text-center sm:text-left">
                  {/* Scaled Identity Header: Responsive Orchestration */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 mb-12">
                    <div className="relative group shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] rounded-full border-[8px] sm:border-[12px] border-white bg-white">
                      <Avatar className="w-32 h-32 sm:w-44 sm:h-44 shadow-2xl transition-transform group-hover:scale-[1.03] duration-700">
                        <AvatarImage src={profileData.avatar || "/api/placeholder/192/192"} className="aspect-square h-full w-full object-cover" />
                        <AvatarFallback className="bg-slate-50 text-slate-200 text-4xl sm:text-5xl font-black italic tracking-tighter uppercase">
                          {profileData.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Fixed Camera Trigger for Mobile/Touch */}
                      <button 
                        onClick={() => profileRef.current?.click()}
                        className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-xl shadow-2xl border-2 sm:border-4 border-white flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 active:scale-90 z-30 shadow-blue-500/40"
                      >
                        <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      {/* Desktop Hover Overlay */}
                      <div className="hidden sm:flex absolute inset-0 bg-black/40 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-md cursor-pointer pointer-events-none">
                        <Sparkles className="w-10 h-10 animate-pulse" />
                      </div>
                    </div>

                    <div className="flex-1 pb-2 flex flex-col items-center sm:items-start">
                      <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase">
                          {profileData.name}
                        </h3>
                        <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] shadow-xl shadow-blue-500/30">
                          Administrator
                        </Badge>
                      </div>

                      <div className="flex flex-wrap justify-center sm:justify-start gap-3 items-center">
                        <div className="flex items-center gap-3 text-slate-500 font-bold text-[11px] uppercase tracking-wider bg-slate-50/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-slate-100/50 shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                          <Mail className="w-3.5 h-3.5 opacity-60" />
                          {profileData.email}
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 font-bold text-[11px] uppercase tracking-wider bg-slate-50/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-slate-100/50 shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          {profileData.address || 'Address not set'}
                        </div>
                      </div>
                    </div>

                    <div className="sm:mb-6 px-6 py-4 rounded-[2rem] bg-emerald-50/50 border border-emerald-100 shadow-sm flex items-center gap-3 transition-transform hover:scale-105">
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">Platform Verified</span>
                    </div>
                  </div>

                  {/* Redesigned Compact Identity Terminal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 bg-slate-50/30 p-6 sm:p-10 rounded-[2.5rem] border border-slate-100/50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Profile Identity</Label>
                        <User className="w-3 h-3 text-blue-500 opacity-40" />
                      </div>
                      <Input 
                        value={profileData.name} 
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="h-14 bg-white border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all text-base shadow-lg shadow-slate-200/10 px-6 border-2 focus:border-blue-500/50" 
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Nexus Terminal (Phone)</Label>
                        <Smartphone className="w-3 h-3 text-indigo-500 opacity-40" />
                      </div>
                      <Input 
                        value={profileData.phone} 
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="h-14 bg-white border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all text-base shadow-lg shadow-slate-200/10 px-6 border-2 focus:border-indigo-500/50" 
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Communication Node (Mail)</Label>
                        <Mail className="w-3 h-3 text-blue-500 opacity-40" />
                      </div>
                      <Input 
                        value={profileData.email} 
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="h-14 bg-white border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all text-base shadow-lg shadow-slate-200/10 px-6 border-2 focus:border-blue-500/50" 
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Restaurant Description</Label>
                        <Info className="w-3 h-3 text-indigo-500 opacity-40" />
                      </div>
                      <Input 
                        value={profileData.description} 
                        onChange={(e) => setProfileData({...profileData, description: e.target.value})}
                        className="h-14 bg-white border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all text-base shadow-lg shadow-slate-200/10 px-6 border-2 focus:border-indigo-500/50" 
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Physical Address</Label>
                        <MapPin className="w-3 h-3 text-blue-500 opacity-40" />
                      </div>
                      <Input 
                        value={profileData.address} 
                        onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                        className="h-14 bg-white border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all text-base shadow-lg shadow-slate-200/10 px-6 border-2 focus:border-blue-500/50" 
                      />
                    </div>
                  </div>

                  {/* Red Button Sign Out for Mobile Users */}
                  <div className="mt-8">
                     <Button 
                        onClick={handleSignOut}
                        variant="destructive"
                        className="w-full sm:w-auto h-16 sm:h-auto sm:px-8 py-3 rounded-2xl sm:rounded-xl font-black uppercase tracking-widest text-xs sm:text-[10px] bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100/50 shadow-xl shadow-rose-500/10 transition-all flex items-center justify-center gap-3 active:scale-95 group mx-auto sm:mx-0 sm:ml-auto"
                     >
                        <LogOut className="w-5 h-5 sm:w-4 sm:h-4 opacity-70 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                        Secure Session Logout
                     </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="notifications" className="mt-0 outline-none animate-in fade-in duration-500">
              <Card className="border-0 shadow-2xl shadow-slate-200/50 ring-1 ring-gray-100 rounded-[3rem] bg-white overflow-hidden">
                <CardHeader className="px-12 pt-12 border-b border-gray-50 pb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Alert Engine</CardTitle>
                      <CardDescription className="text-slate-500 font-bold text-sm">Real-time operational stream for enterprise activities.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {Object.entries(notifications).map(([key, value], idx) => (
                    <div key={key} className="flex items-center justify-between p-10 lg:p-14 hover:bg-slate-50/50 transition-all group border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 bg-white text-slate-400 rounded-3xl flex items-center justify-center border border-slate-100 group-hover:scale-110 group-hover:text-blue-600 transition-all duration-500 shadow-sm">
                          {key === 'orders' ? <ShoppingCart className="w-6 h-6" /> : 
                           key === 'revenue' ? <DollarSign className="w-6 h-6" /> : 
                           key === 'inventory' ? <Store className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-slate-900 tracking-tight text-xl capitalize">{key} Operational Feed</h4>
                          <p className="text-sm font-bold text-slate-400">Deploy instant push events for all {key} activities.</p>
                        </div>
                      </div>
                      <Switch 
                        checked={value} 
                        onCheckedChange={(val) => setNotifications({...notifications, [key]: val})}
                        className="data-[state=checked]:bg-blue-600 scale-150 mx-2"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0 outline-none animate-in zoom-in-95 duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Security Key Card */}
                  <Card className="border-0 shadow-2xl shadow-slate-200/50 ring-1 ring-gray-100 rounded-[3rem] bg-white">
                    <CardHeader className="px-12 pt-12 pb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm shadow-rose-500/5">
                          <Lock className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-slate-900 tracking-tight">Key Rotation</CardTitle>
                      </div>
                      <CardDescription className="text-slate-500 font-bold mt-2 ml-16 text-base">Authorize credential refresh protocol.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-12 pb-14 space-y-10 mt-4 ml-0 lg:ml-16">
                      <div className="space-y-4">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Administrator Password</Label>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          value={securityData.currentPassword}
                          onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                          className="h-16 bg-slate-50/50 border-slate-100 rounded-2xl font-bold shadow-sm px-8" 
                        />
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Hardened Instance</Label>
                        <div className="relative group">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            value={securityData.newPassword}
                            onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                            className="h-16 bg-slate-50/50 border-slate-100 rounded-2xl font-bold shadow-sm px-8" 
                          />
                          <button onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-all p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <Button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full h-16 rounded-[1.5rem] font-bold bg-slate-900 hover:bg-black text-white shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.98] text-xl tracking-tight"
                      >
                        {isSaving ? 'Authorizing...' : 'Authorize Refresh'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Cloud MFA Card */}
                  <Card className="border-0 shadow-2xl rounded-[3rem] bg-slate-900 text-white relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-transparent to-indigo-600/30 opacity-60" />
                    <Sparkles className="absolute -top-16 -right-16 w-64 h-64 text-white/5 rotate-12 group-hover:scale-125 transition-all duration-[2000ms] blur-sm" />
                    <CardHeader className="px-12 pt-12 relative z-10">
                      <div className="flex gap-4 items-center mb-2">
                         <div className="w-14 h-14 rounded-[1.5rem] bg-blue-500/20 flex items-center justify-center border border-white/10 backdrop-blur-3xl shadow-2xl">
                            <ShieldCheck className="w-8 h-8 text-blue-400" />
                         </div>
                         <div>
                           <CardTitle className="text-3xl font-bold tracking-tighter">Hardened MFA</CardTitle>
                           <CardDescription className="text-slate-400 font-bold text-base">Physical identifier required.</CardDescription>
                         </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-12 pb-14 space-y-12 mt-10 relative z-10">
                      <div className="p-10 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 space-y-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-8">
                          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-bold text-xl text-slate-100 tracking-tight">Identity Tunnel Synchronized</p>
                          </div>
                        </div>
                        <Separator className="bg-white/10" />
                        <div className="flex items-center justify-between group/row">
                          <p className="text-base font-bold text-slate-300 tracking-tight">
                            {securityData.mfaEnabled ? 'Push Authentication Enabled' : 'MFA currently deactivated'}
                          </p>
                          <Switch 
                            checked={securityData.mfaEnabled} 
                            onCheckedChange={(val) => setSecurityData({...securityData, mfaEnabled: val})}
                            className="data-[state=checked]:bg-blue-500 border-white/10 scale-150" 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="billing" className="mt-0 outline-none w-full animate-in fade-in duration-500">
               <Card className="border-0 shadow-2xl shadow-slate-200/50 ring-1 ring-gray-100 rounded-[3rem] bg-white overflow-hidden">
                <div className="p-24 text-center bg-slate-50 border-b border-gray-100 relative group overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-1000" />
                   <div className="w-28 h-28 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto mb-12 border border-slate-100 group-hover:scale-110 transition-all duration-700 relative z-10">
                      <CreditCard className="w-12 h-12 text-blue-600" />
                   </div>
                   <h2 className="text-5xl font-bold text-slate-900 tracking-tighter relative z-10">{billingData.plan} License</h2>
                   <div className="flex items-baseline justify-center gap-1 mt-6 relative z-10">
                      <span className="text-7xl font-bold text-slate-900 tracking-tight">₹{billingData.price}</span>
                      <span className="text-slate-400 text-2xl font-bold ml-4">/ mo</span>
                   </div>
                   <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-16 relative z-10">
                      <Button 
                        onClick={handleUpgrade}
                        className="h-16 px-16 rounded-[1.5rem] font-bold bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/40 active:scale-95 transition-all text-xl group"
                      >
                        Upgrade Scope
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleTransactionLogs}
                        className="h-16 px-12 rounded-[1.5rem] font-bold bg-white border-slate-200 text-slate-600 shadow-xl hover:bg-slate-50 transition-all text-xl border-b-[6px] hover:border-b-[2px] active:scale-95 group"
                      >
                        Transaction Logs
                      </Button>
                   </div>
                </div>
                <CardContent className="p-20">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                       {billingData.cards.map(card => (
                         <div key={card.id} className="p-12 bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl shadow-slate-200/50 flex items-center justify-between group hover:border-blue-500 transition-all cursor-pointer relative overflow-hidden">
                           <div className="flex items-center gap-10 relative z-10">
                              <div className="w-24 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-white group-hover:scale-110 transition-all duration-500 shadow-sm">
                                 <img src={card.logo} className="w-14 opacity-80" alt={card.type} />
                              </div>
                              <div>
                                 <p className="font-bold text-slate-900 text-3xl leading-none tracking-tighter">{card.type} • {card.last4}</p>
                                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-3">Verified • {card.expiry}</p>
                              </div>
                           </div>
                           <Button 
                             onClick={() => handleRemoveCard(card.id)}
                             variant="ghost" 
                             size="icon" 
                             className="w-16 h-16 rounded-[2rem] text-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-rose-100 shadow-2xl"
                           >
                              <Trash2 className="w-8 h-8" />
                           </Button>
                         </div>
                       ))}
                       <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                         <DialogTrigger asChild>
                           <button 
                             className="p-12 bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-6 group hover:bg-white hover:border-blue-500 hover:shadow-2xl transition-all duration-700 outline-none min-h-[160px]"
                           >
                              <div className="w-20 h-20 rounded-[2rem] bg-white shadow-2xl border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors">
                                 <Plus className="w-12 h-12 stroke-[3px]" />
                              </div>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attach Asset</span>
                           </button>
                         </DialogTrigger>
                         <DialogContent className="max-w-md rounded-[2.5rem] border-0 shadow-2xl p-0 overflow-hidden bg-white">
                            <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                               <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
                               <DialogHeader className="relative z-10">
                                 <DialogTitle className="text-2xl font-bold tracking-tight">Secure Asset Integration</DialogTitle>
                                 <DialogDescription className="text-slate-400 font-bold">Transmit financial identifiers to the vault.</DialogDescription>
                               </DialogHeader>
                            </div>
                            <form onSubmit={handleAddCard} className="p-10 space-y-6">
                               {addCardError && (
                                 <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                   <div className="w-8 h-8 bg-rose-500/10 rounded-full flex items-center justify-center shrink-0">
                                     <X className="w-4 h-4 text-rose-600" />
                                   </div>
                                   <p className="text-[11px] font-black text-rose-700 uppercase tracking-wider italic">{addCardError}</p>
                                 </div>
                               )}
                               <div className="space-y-3">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cardholder Authority</Label>
                                  <Input 
                                    placeholder="JOHN DOE"
                                    value={newCardData.name}
                                    onChange={(e) => setNewCardData({...newCardData, name: e.target.value.toUpperCase()})}
                                    className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold px-6 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                  />
                               </div>
                               <div className="space-y-3">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Account Number</Label>
                                  <Input 
                                    placeholder="•••• •••• •••• ••••"
                                    maxLength={16}
                                    value={newCardData.number}
                                    onChange={(e) => setNewCardData({...newCardData, number: e.target.value.replace(/\D/g, '')})}
                                    className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold px-6 focus:ring-4 focus:ring-blue-500/5 transition-all text-lg tracking-widest"
                                  />
                               </div>
                               <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lifecycle (MM/YY)</Label>
                                     <Input 
                                       placeholder="12/28"
                                       maxLength={5}
                                       value={newCardData.expiry}
                                       onChange={(e) => setNewCardData({...newCardData, expiry: e.target.value})}
                                       className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold px-6 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                     />
                                  </div>
                                  <div className="space-y-3">
                                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Security Code</Label>
                                     <Input 
                                       placeholder="•••"
                                       maxLength={3}
                                       value={newCardData.cvv}
                                       onChange={(e) => setNewCardData({...newCardData, cvv: e.target.value.replace(/\D/g, '')})}
                                       className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold px-6 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                     />
                                  </div>
                               </div>
                               <div className="pt-4">
                                  <Button type="submit" className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                                     Harden Asset
                                  </Button>
                               </div>
                            </form>
                         </DialogContent>
                       </Dialog>
                    </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── GST / TAX CONFIGURATION TAB ─── */}
            <TabsContent value="tax" className="mt-0 outline-none animate-in fade-in duration-500">
              <div className="space-y-8">
                {/* Hero Card */}
                <Card className="border-0 shadow-2xl shadow-emerald-500/5 ring-1 ring-gray-100 rounded-[3rem] overflow-hidden bg-white">
                  <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 p-10 sm:p-14 text-white relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
                    <Percent className="absolute right-10 top-10 w-32 h-32 text-white/5" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black uppercase tracking-tighter">GST / Tax Configuration</h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Billing Engine</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-xl">
                        Define your restaurant's tax policy. When enabled, the configured GST rate will be applied automatically on every customer order and displayed transparently in the checkout modal.
                        <span className="block mt-2 text-emerald-400 italic">This field is optional — if disabled or set to 0%, no tax will be charged.</span>
                      </p>
                    </div>
                  </div>

                  <CardContent className="p-8 sm:p-14 space-y-10">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${ gstData.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Percent className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{gstData.enabled ? 'GST Collection Active' : 'GST Disabled'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Toggle to {gstData.enabled ? 'disable' : 'enable'} tax on orders</p>
                        </div>
                      </div>
                      <Switch
                        checked={gstData.enabled}
                        onCheckedChange={(val) => setGstData(p => ({...p, enabled: val}))}
                        className="data-[state=checked]:bg-emerald-500 scale-150 mx-2"
                      />
                    </div>

                    {/* GST Rate Input */}
                    <div className={`space-y-4 transition-all duration-500 ${gstData.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                            <Percent className="w-3 h-3" /> GST Rate (%)
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="28"
                              step="0.5"
                              placeholder="e.g. 5, 12, 18, 28"
                              value={gstData.rate}
                              onChange={(e) => setGstData(p => ({...p, rate: e.target.value}))}
                              className="h-16 bg-white border-slate-100 border-2 rounded-2xl font-black text-2xl text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all px-6 pr-16 shadow-sm"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">%</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 pl-1">Common rates: 5% · 12% · 18% · 28%</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                            <Receipt className="w-3 h-3" /> Tax Label (shown on bill)
                          </Label>
                          <Input
                            type="text"
                            placeholder="e.g. GST, SGST+CGST, VAT"
                            value={gstData.label}
                            onChange={(e) => setGstData(p => ({...p, label: e.target.value}))}
                            className="h-16 bg-white border-slate-100 border-2 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all px-6 shadow-sm"
                          />
                          <p className="text-[10px] font-bold text-slate-400 pl-1">This label appears in the customer's order summary.</p>
                        </div>
                      </div>

                      {/* Live Preview */}
                      {gstData.enabled && Number(gstData.rate) > 0 && (
                        <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4">Live Preview — Customer Bill</p>
                          <div className="flex justify-between text-sm text-slate-600 font-bold">
                            <span>Subtotal</span><span>₹100.00</span>
                          </div>
                          <div className="flex justify-between text-sm text-emerald-700 font-black">
                            <span>{gstData.label || 'GST'} ({gstData.rate}%)</span>
                            <span>₹{(100 * Number(gstData.rate) / 100).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-emerald-100">
                            <span>Total Amount</span>
                            <span>₹{(100 + 100 * Number(gstData.rate) / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info Banner */}
                    <div className="flex items-start gap-4 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                      <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
                        GST is optional and fully controllable. If you do not set a rate or disable this toggle, <strong>no tax will be shown or charged</strong> to your customers. Each restaurant operates under an isolated tax policy.
                      </p>
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full sm:w-auto h-14 px-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      {isSaving ? 'Saving GST Policy...' : 'Save Tax Configuration'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            </div>
          </div>
        </Tabs>
      </div>

      {/* Unified Platform Footer */}
      <div className="py-24 text-center opacity-40 hover:opacity-100 transition-opacity">
        <Separator className="mb-16 opacity-30 mx-32" />
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 text-slate-200 animate-[spin_20s_linear_infinite]" />
          <p className="text-[12px] font-bold text-slate-900 uppercase tracking-widest">
            Servora Enterprise Architectural Core
          </p>
        </div>
      </div>
    </div>
  )
}
