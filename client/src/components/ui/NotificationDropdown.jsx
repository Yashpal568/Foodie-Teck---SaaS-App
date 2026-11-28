import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { timeAgo } from '@/utils/formatters'
import {
  Bell,
  BellRing,
  X,
  Clock,
  ChefHat,
  DollarSign,
  CheckCircle,
  AlertCircle,
  CheckCheck,
  Trash2,
  PackageX,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
  { id: 'service', label: 'Service' },
]

const getNotificationStyle = (type) => {
  switch (type) {
    case 'waiter_call':
      return {
        icon: <BellRing className="w-4 h-4 text-amber-600" />,
        bg: 'bg-amber-50 border-amber-200/80',
        tabTarget: 'tables',
        actionLabel: 'Tables',
      }
    case 'new_order':
      return {
        icon: <ChefHat className="w-4 h-4 text-indigo-600" />,
        bg: 'bg-indigo-50 border-indigo-200/80',
        tabTarget: 'orders',
        actionLabel: 'Orders & KDS',
      }
    case 'order_status':
      return {
        icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50 border-emerald-200/80',
        tabTarget: 'orders',
        actionLabel: 'Orders & KDS',
      }
    case 'payment':
      return {
        icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50 border-emerald-200/80',
        tabTarget: 'orders',
        actionLabel: 'Orders',
      }
    case 'inventory_alert':
      return {
        icon: <PackageX className="w-4 h-4 text-rose-600" />,
        bg: 'bg-rose-50 border-rose-200/80',
        tabTarget: 'menu',
        actionLabel: 'Menu Stock',
      }
    case 'alert':
      return {
        icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
        bg: 'bg-rose-50 border-rose-200/80',
        tabTarget: null,
        actionLabel: null,
      }
    default:
      return {
        icon: <Clock className="w-4 h-4 text-slate-600" />,
        bg: 'bg-slate-100 border-slate-200/80',
        tabTarget: null,
        actionLabel: null,
      }
  }
}

const NotificationDropdown = ({ restaurantId = 'demo-merchant', onNavigateTab = null }) => {
  const {
    isDemo,
    isLiveConnected,
    notifications,
    unreadCount,
    isOpen,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    toggleNotifications,
    closeNotifications,
  } = useNotifications(restaurantId)

  const triggerRef = useRef(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [panelPos, setPanelPos] = useState({ top: 64, right: 16 })
  const [nowTick, setNowTick] = useState(() => Date.now())

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return
    const rect = triggerRef.current.getBoundingClientRect()
    const top = Math.max(12, Math.round(rect.bottom + 10))
    const right = Math.max(12, Math.round(window.innerWidth - rect.right))
    setPanelPos({ top, right })
  }, [])

  // Recalculate floating coordinates when opened, resized, or scrolled
  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    setNowTick(Date.now())

    const handleKey = (e) => {
      if (e.key === 'Escape') closeNotifications()
    }
    const tickInterval = setInterval(() => setNowTick(Date.now()), 30000)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('keydown', handleKey)
    return () => {
      clearInterval(tickInterval)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, updatePosition, closeNotifications])

  const filteredNotifications = useMemo(() => {
    // Depend on nowTick only to refresh relative time labels seamlessly
    void nowTick
    return notifications.filter((n) => {
      if (activeFilter === 'unread') return !n.read
      if (activeFilter === 'orders') return n.type === 'new_order' || n.type === 'order_status' || n.type === 'payment'
      if (activeFilter === 'service') return n.type === 'waiter_call' || n.type === 'inventory_alert' || n.type === 'alert'
      return true
    })
  }, [notifications, activeFilter, nowTick])

  const portalRoot = typeof document !== 'undefined' ? document.body : null

  return (
    <div className="relative">
      {/* Bell Trigger */}
      <Button
        ref={triggerRef}
        variant="outline"
        size="icon"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        onClick={toggleNotifications}
        className="relative h-8.5 w-8.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-2xs group cursor-pointer"
      >
        <Bell className={`w-4 h-4 transition-transform ${unreadCount > 0 ? 'group-hover:rotate-12' : 'group-hover:scale-105'}`} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-black bg-rose-500 text-white border-2 border-white shadow-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Portal Dropdown escapes Navbar's backdrop-blur stacking context so headers/KDS toolbars never clip it */}
      {isOpen && portalRoot && createPortal(
        <>
          {/* Click-outside Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-slate-900/10 backdrop-blur-[1px]"
            onClick={closeNotifications}
          />

          {/* Floating Notification Popover */}
          <div
            role="dialog"
            aria-label="Notifications panel"
            style={{
              top: `${panelPos.top}px`,
              right: window.innerWidth >= 640 ? `${panelPos.right}px` : '12px',
              left: window.innerWidth >= 640 ? 'auto' : '12px',
            }}
            className="fixed sm:w-[420px] max-h-[min(560px,calc(100vh-88px))] flex flex-col bg-white rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-200/90 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Notifications</h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isDemo
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                        : isLiveConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDemo
                          ? 'bg-indigo-500 animate-pulse'
                          : isLiveConnected
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-slate-400'
                      }`}
                    />
                    {isDemo ? 'Demo Feed' : isLiveConnected ? 'Live Sync' : 'Synced'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      title="Mark all as read"
                      className="h-7 px-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mr-1" />
                      Read all
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllNotifications}
                      title="Clear all notifications"
                      className="h-7 px-2 text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeNotifications}
                    aria-label="Close notifications"
                    className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Dynamic Filter Tabs */}
              <div className="flex items-center gap-1.5 mt-3">
                {FILTER_TABS.map((tab) => {
                  const isActive = activeFilter === tab.id
                  const badgeCount =
                    tab.id === 'all'
                      ? notifications.length
                      : tab.id === 'unread'
                        ? unreadCount
                        : tab.id === 'orders'
                          ? notifications.filter((n) => n.type === 'new_order' || n.type === 'order_status' || n.type === 'payment').length
                          : notifications.filter((n) => n.type === 'waiter_call' || n.type === 'inventory_alert' || n.type === 'alert').length
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {badgeCount > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                            isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                          }`}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scrollable Notifications List */}
            <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2 bg-slate-50/40">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200/80 shadow-2xs">
                    <Bell className="w-6 h-6 text-slate-300" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    {activeFilter === 'all' ? 'All caught up!' : `No ${activeFilter} alerts`}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {activeFilter === 'all'
                      ? 'Live orders, table service calls, and stock alerts for this dashboard appear here.'
                      : 'Switch filters above to view other dashboard activity.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const style = getNotificationStyle(notification.type)
                  return (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.read) markAsRead(notification.id)
                        if (onNavigateTab && style.tabTarget) {
                          onNavigateTab(style.tabTarget)
                          closeNotifications()
                        }
                      }}
                      className={`group relative p-3.5 rounded-xl cursor-pointer transition-all border ${
                        !notification.read
                          ? 'bg-white border-indigo-200/80 shadow-xs hover:border-indigo-300'
                          : 'bg-white/75 border-slate-200/70 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${style.bg}`}>
                          {style.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs leading-snug truncate ${!notification.read ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {!notification.read && (
                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                              )}
                              <button
                                type="button"
                                aria-label="Dismiss notification"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  clearNotification(notification.id)
                                }}
                                className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11.5px] text-slate-500 font-medium mt-0.5 leading-relaxed line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                <Clock className="w-3 h-3" />
                                {timeAgo(notification.timestamp)}
                              </span>
                              {notification.tableNumber && notification.tableNumber !== '?' && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9.5px] font-bold">
                                  Table {notification.tableNumber}
                                </span>
                              )}
                            </div>

                            {onNavigateTab && style.actionLabel && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                {style.actionLabel}
                                <ArrowUpRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-white flex items-center justify-between text-[11px] shrink-0">
              <span className="font-semibold text-slate-500">
                {unreadCount} unread of {notifications.length}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200 bg-slate-50">
                {isDemo ? 'Sandbox Isolated' : 'Tenant Scoped'}
              </Badge>
            </div>
          </div>
        </>,
        portalRoot
      )}
    </div>
  )
}

export default NotificationDropdown
