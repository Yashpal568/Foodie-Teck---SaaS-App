import { useState } from 'react'
import { Bell, X, Check, Clock, ChefHat, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useNotifications } from '@/hooks/useNotifications'

const NotificationDropdown = ({ restaurantId }) => {
  const { 
    notifications, 
    unreadCount, 
    isOpen, 
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAllNotifications,
    toggleNotifications 
  } = useNotifications(restaurantId)

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order':
        return <Bell className="w-4 h-4 text-blue-600" />
      case 'order_status':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'payment':
        return <DollarSign className="w-4 h-4 text-yellow-600" />
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      {/* Notification Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleNotifications}
        className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/80 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50/50 hover:shadow-lg transition-all shadow-sm group"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg shadow-red-500/20"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[1px]" 
            onClick={toggleNotifications}
          />
          
          {/* Dropdown Box */}
          <div className="fixed sm:absolute top-20 sm:top-14 left-4 right-4 sm:left-auto sm:right-0 sm:w-[420px] bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Notifications</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Your live updates</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-8 text-[11px] font-black text-blue-600 hover:bg-blue-50 rounded-xl"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="h-8 text-[11px] font-black text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                >
                  Clear all
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[450px] overflow-y-auto scrollbar-hide py-2">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Bell className="w-8 h-8 text-slate-200" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">All caught up!</h4>
                  <p className="text-sm text-slate-400 px-8">You don't have any notifications at the moment.</p>
                </div>
              ) : (
                <div className="px-3 space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative p-4 rounded-2xl cursor-pointer transition-all border border-transparent ${
                        !notification.read 
                          ? 'bg-blue-50/40 hover:bg-blue-50/60 border-blue-100/50 shadow-sm' 
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id)
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
                           !notification.read ? 'bg-white border-blue-100' : 'bg-slate-100 border-slate-200'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm tracking-tight ${
                                !notification.read ? 'font-black text-slate-900' : 'font-bold text-slate-600'
                              }`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {formatTime(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 ml-4">
                              {!notification.read && (
                                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-lg shadow-blue-500/50 animate-pulse"></div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  clearNotification(notification.id)
                                }}
                                className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 hover:text-rose-500 text-slate-300 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
                 <Badge variant="outline" className="bg-white border-slate-100 text-slate-500 font-black px-4 py-1.5 rounded-xl shadow-sm">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                 </Badge>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationDropdown
