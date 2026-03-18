import React, { useState } from 'react'
import { 
  Menu, Save, Loader2, 
  Settings as SettingsIcon, 
  RefreshCw 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription 
} from '@/components/ui/sheet'
import Sidebar from '../layout/Sidebar'

export default function SettingsMobileNavbar({ 
  onSave, 
  isSaving, 
  activeItem,
  setActiveItem 
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access dashboard routes</SheetDescription>
            </SheetHeader>
            <Sidebar 
              activeItem={activeItem} 
              setActiveItem={(item) => {
                setActiveItem(item)
                setIsOpen(false)
              }} 
              isCollapsed={false}
              setIsCollapsed={() => {}}
              isMobile={true}
            />
          </SheetContent>
        </Sheet>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <SettingsIcon className="w-2.5 h-2.5 text-purple-600" />
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-[0.2em] leading-none">Administration</span>
          </div>
          <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">Settings Hub</h1>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => window.location.reload()}
          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
          title="Rollback Changes"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
        
        <Button 
          onClick={onSave}
          disabled={isSaving}
          className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 px-4 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 opacity-60" />
          )}
          <span>{isSaving ? 'Syncing' : 'Deploy'}</span>
        </Button>
      </div>
    </div>
  )
}
