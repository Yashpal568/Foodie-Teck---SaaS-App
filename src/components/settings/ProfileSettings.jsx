import React from 'react'
import { Camera, Mail, MapPin, LogOut } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
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
    <div className="space-y-6">
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
                  {profileData.name?.charAt(0) || 'R'}
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
    </div>
  )
}
