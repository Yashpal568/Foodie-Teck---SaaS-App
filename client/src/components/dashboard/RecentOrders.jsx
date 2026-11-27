import React, { useMemo } from 'react'
import { Clock, CheckCircle, AlertCircle, ChefHat, Utensils, ReceiptText, ArrowRight } from 'lucide-react'
import { useOrderManagement, ORDER_STATUS } from '@/hooks/useOrderManagement'

const STATUS_CONFIG = {
  [ORDER_STATUS?.ORDERED ?? 'ORDERED']: {
    label: 'New Order',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Clock,
  },
  [ORDER_STATUS?.PREPARING ?? 'PREPARING']: {
    label: 'Preparing',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: ChefHat,
  },
  [ORDER_STATUS?.READY ?? 'READY']: {
    label: 'Ready',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: CheckCircle,
  },
  [ORDER_STATUS?.SERVED ?? 'SERVED']: {
    label: 'Served',
    color: 'bg-violet-500',
    textColor: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    icon: Utensils,
  },
  [ORDER_STATUS?.BILL_REQUESTED ?? 'BILL_REQUESTED']: {
    label: 'Bill Req.',
    color: 'bg-rose-500',
    textColor: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    icon: ReceiptText,
  },
  [ORDER_STATUS?.FINISHED ?? 'FINISHED']: {
    label: 'Finished',
    color: 'bg-slate-400',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: CheckCircle,
  },
  [ORDER_STATUS?.CANCELLED ?? 'CANCELLED']: {
    label: 'Cancelled',
    color: 'bg-red-400',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertCircle,
  },
}

const DEFAULT_STATUS = {
  label: 'Placed',
  color: 'bg-slate-400',
  textColor: 'text-slate-600',
  bgColor: 'bg-slate-50',
  borderColor: 'border-slate-200',
  icon: Clock,
}

function getRelativeTime(dateStr) {
  if (!dateStr) return 'recently'
  try {
    const d = new Date(dateStr).getTime()
    if (isNaN(d)) return 'recently'
    const diff = Math.floor((Date.now() - d) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  } catch {
    return 'recently'
  }
}

export default function RecentOrders({ restaurantId = 'default', onViewAll }) {
  const { orders: activeOrders, orderHistory, loading } = useOrderManagement(restaurantId)

  const orders = useMemo(() => {
    const all = [...(activeOrders || []), ...(orderHistory || [])]
    return all
      .sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime()
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime()
        return timeB - timeA
      })
      .slice(0, 5)
  }, [activeOrders, orderHistory])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <ReceiptText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Orders</h3>
            <p className="text-[10px] text-slate-400 font-medium">Latest activity across all tables</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors group cursor-pointer"
        >
          View All
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Order List */}
      <div className="p-2 sm:p-3 space-y-1.5 flex-1">
        {loading ? (
          // Skeleton loaders
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse bg-slate-50/50 rounded-xl">
              <div className="w-9 h-9 bg-slate-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-200 rounded-full w-1/3" />
                <div className="h-2.5 bg-slate-200 rounded-full w-1/2" />
              </div>
              <div className="w-16 h-3 bg-slate-200 rounded-full" />
            </div>
          ))
        ) : orders.length > 0 ? (
          orders.map((order) => {
            const status = STATUS_CONFIG[order.status] || DEFAULT_STATUS
            const tableLabel = order.tableId || order.table_number || order.tableNumber || 'TA'
            const itemCount = order.items?.length || order.order_items?.length || 0
            const total = Number(order.total_amount || order.total || order.final_amount || 0)
            const orderTime = order.created_at || order.createdAt

            return (
              <div
                key={order.id}
                className="px-3.5 py-2.5 flex items-center gap-3.5 hover:bg-slate-50/90 rounded-xl border border-transparent hover:border-slate-100 transition-all duration-200 group"
              >
                {/* Table Avatar */}
                <div className={`w-9 h-9 ${status.bgColor} border ${status.borderColor} rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs`}>
                  <span className={`text-[10px] font-black ${status.textColor} uppercase tracking-tight`}>
                    T{tableLabel}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {order.customerName || `Table ${tableLabel}`}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {itemCount} items · ₹{total.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Status + Time */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {/* Status pill */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${status.bgColor} ${status.borderColor}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                    <span className={`text-[9px] font-black uppercase tracking-wide ${status.textColor}`}>
                      {status.label}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium tabular-nums">
                    {getRelativeTime(orderTime)}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100">
              <ReceiptText className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-xs font-bold text-slate-400">No recent orders</p>
            <p className="text-[11px] text-slate-300 mt-0.5 font-medium">Orders will appear here in real-time</p>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      {orders.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Showing latest {orders.length} orders
          </span>
          <button
            onClick={onViewAll}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            All Orders
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
