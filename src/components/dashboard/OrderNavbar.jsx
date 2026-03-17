import { RefreshCw, Calendar, Bell, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NotificationDropdown from '@/components/ui/NotificationDropdown'

export default function OrderNavbar({ onRefresh, onShowHistory }) {
  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 transition-all">
      <div className="px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Header Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em] mb-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Inventory & Operations</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-none">
                Order Management
              </h1>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1.5 max-w-sm">
              Manage and track restaurant orders in real-time.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button 
                onClick={onRefresh} 
                variant="outline" 
                size="sm" 
                className="h-9 px-3 rounded-xl bg-gray-50/50 hover:bg-white ring-1 ring-inset ring-gray-100 transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Refresh</span>
            </Button>
            
            <NotificationDropdown />
            
            <Button 
              size="sm"
              onClick={onShowHistory}
              className="bg-purple-600 hover:bg-purple-700 text-white h-9 px-3 rounded-xl shadow-lg shadow-purple-600/20 transition-all font-semibold"
            >
              <Calendar className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Order History</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
