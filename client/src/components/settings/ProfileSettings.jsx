import React from 'react'
import { 
  Camera, 
  Mail, 
  MapPin, 
  LogOut, 
  Store, 
  Phone, 
  Sparkles, 
  Globe, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Image as ImageIcon,
  Flame,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export default function ProfileSettings({ 
  profileData, 
  setProfileData, 
  coverRef, 
  profileRef, 
  handleImageUpload, 
  handleSignOut 
}) {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* Hidden file inputs */}
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

      {/* 🌟 1. RESTAURANT BRAND & COVER SHOWCASE CARD 🌟 */}
      <Card className="border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 rounded-[2rem] bg-white overflow-hidden">
        {/* Panoramic Cover Banner with Ambient Dark Overlay */}
        <div className="relative h-56 sm:h-64 md:h-72 w-full bg-slate-900 overflow-hidden group">
          {profileData.cover ? (
            <img 
              src={profileData.cover} 
              alt="Restaurant Cover" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
              <div className="text-center text-slate-500 space-y-2">
                <ImageIcon className="w-12 h-12 mx-auto opacity-40" />
                <p className="text-xs font-semibold uppercase tracking-widest">No Cover Banner Uploaded</p>
              </div>
            </div>
          )}

          {/* Gradient Lighting Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-black/30 pointer-events-none" />

          {/* Floating Change Cover Action */}
          <div className="absolute top-4 right-4 z-20">
            <Button 
              onClick={() => coverRef.current?.click()}
              className="h-10 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" /> 
              <span>Change Cover</span>
            </Button>
          </div>

          {/* Cover Quality Badge */}
          <div className="absolute top-4 left-4 z-20">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-black uppercase tracking-widest text-emerald-400 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Cover Live on Menu</span>
            </div>
          </div>
        </div>

        {/* Brand Avatar & Core Overview Header */}
        <CardContent className="px-6 sm:px-8 pt-0 pb-8 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-5 -mt-16 sm:-mt-20 mb-8">
            {/* Avatar with Camera Overlay */}
            <div className="relative group rounded-3xl border-4 border-white bg-white shadow-2xl inline-block shrink-0">
              <Avatar className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-slate-100">
                <AvatarImage src={profileData.avatar} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-black uppercase">
                  {profileData.name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>

              {/* Upload Logo Camera Button */}
              <button 
                onClick={() => profileRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 hover:bg-black text-amber-400 rounded-2xl shadow-xl border-2 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
                title="Change Brand Logo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Restaurant Title & Meta Tags */}
            <div className="flex-1 pb-1 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {profileData.name || 'Servora Restaurant'}
                  </h2>
                  <Badge className="bg-amber-50 text-amber-800 border border-amber-300/80 font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Verified Merchant
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" /> 
                    {profileData.email || 'No email configured'}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" /> 
                    {profileData.address || 'Address not specified'}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 shadow-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>POS & Digital Menu Active</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-6" />

          {/* 📝 PROFILE INFORMATION FORM FIELDS 📝 */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Restaurant Public Information
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                These business details are visible on your customer digital menus, invoices, and QR landing pages.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Business Name */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-indigo-500" />
                  Business Name
                </Label>
                <Input 
                  value={profileData.name} 
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  placeholder="e.g. Tiger Bistro & Cafe"
                  className="h-12 rounded-xl border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-900 shadow-xs transition-all" 
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  Direct Phone Number
                </Label>
                <Input 
                  value={profileData.phone} 
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  placeholder="+91 98881 03888"
                  className="h-12 rounded-xl border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-900 shadow-xs transition-all" 
                />
              </div>

              {/* Contact Email */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  Contact Email
                </Label>
                <Input 
                  value={profileData.email} 
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  placeholder="tigerbistro99@gmail.com"
                  className="h-12 rounded-xl border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-900 shadow-xs transition-all" 
                />
              </div>

              {/* Tagline / Culinary Specialty */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Tagline & Specialty
                </Label>
                <Input 
                  value={profileData.description} 
                  onChange={(e) => setProfileData({...profileData, description: e.target.value})}
                  placeholder="Authentic Fine Dining & Cocktails"
                  className="h-12 rounded-xl border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-900 shadow-xs transition-all" 
                />
              </div>

              {/* Physical Address */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Physical Outlet Address
                </Label>
                <Input 
                  value={profileData.address} 
                  onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                  placeholder="e.g. Shop 12, Main Market, Rudrapur, Uttarakhand"
                  className="h-12 rounded-xl border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-900 shadow-xs transition-all" 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ⚠️ 2. ACCOUNT SECURITY & SESSION DANGER ZONE ⚠️ */}
      <Card className="border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/20 to-white shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-rose-900 tracking-tight flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-600" />
              Account Session Management
            </h4>
            <p className="text-xs text-rose-700/80 font-medium">
              Terminate active login session from this device. You will need to sign in again with your credentials.
            </p>
          </div>

          <Button 
            onClick={handleSignOut}
            variant="outline"
            className="h-11 px-5 rounded-xl border-rose-300 text-rose-700 bg-white hover:bg-rose-600 hover:text-white hover:border-rose-600 font-bold text-xs uppercase tracking-wider transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out of Console
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
