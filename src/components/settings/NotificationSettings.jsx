import React from 'react'
import { 
  Bell, 
  ShoppingCart, 
  Percent, 
  Store, 
  Users, 
  Volume2, 
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

export default function NotificationSettings({ notifications, setNotifications }) {
  const notifConfigs = [
    { 
      key: 'orders', 
      title: 'Real-Time Table Orders Feed', 
      desc: 'Receive instant chimes, desktop alerts, and automatic kitchen receipts when guests order.', 
      icon: ShoppingCart,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      badge: 'Loud Chime + Popup'
    },
    { 
      key: 'revenue', 
      title: 'Daily Sales & Revenue Summaries', 
      desc: 'Get end-of-day sales rollups, top dish rankings, and milestone push reports.', 
      icon: Percent,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      badge: 'Daily Rollup'
    },
    { 
      key: 'inventory', 
      title: 'Low Stock & Menu Out-of-Stock Alerts', 
      desc: 'Get notified immediately when menu items are toggled unavailable by kitchen staff.', 
      icon: Store,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      badge: 'Immediate Push'
    },
    { 
      key: 'customers', 
      title: 'Guest Concierge & Waiter Call Chimes', 
      desc: 'Play prominent audio alerts when diners at tables tap "Call Waiter" on their phones.', 
      icon: Users,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      badge: 'High Priority Alert'
    },
  ]

  return (
    <Card className="border border-slate-200/80 shadow-md rounded-[2rem] bg-white overflow-hidden animate-in fade-in-50 duration-500">
      <CardHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-xs">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-lg font-black text-slate-900 tracking-tight">Audio & Real-Time Alert Engine</CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Customize real-time sound chimes and system events for your dining room.
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold shrink-0">
          <Volume2 className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span>Web Audio Synthesizer Active</span>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notifConfigs.map(({ key, title, desc, icon: Icon, color, badge }) => (
            <div 
              key={key} 
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                notifications[key] 
                  ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-xs' 
                  : 'bg-white border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
                    <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                      {badge}
                    </span>
                  </div>
                </div>

                <Switch 
                  checked={notifications[key]} 
                  onCheckedChange={(val) => setNotifications({...notifications, [key]: val})}
                  className="data-[state=checked]:bg-indigo-600 shrink-0"
                />
              </div>

              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
