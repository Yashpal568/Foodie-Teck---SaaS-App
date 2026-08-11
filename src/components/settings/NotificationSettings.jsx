import React from 'react'
import { Bell, ShoppingCart, Percent, Store, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

export default function NotificationSettings({ notifications, setNotifications }) {
  return (
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
  )
}
