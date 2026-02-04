import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Timer } from "lucide-react"

const TrackOrderButton = React.forwardRef(({ 
  className, 
  isActive = false, 
  onClick, 
  orderStatus = "preparing",
  showLabel = true,
  ...props 
}, ref) => {
  const statusColors = {
    preparing: "bg-blue-500",
    ready: "bg-green-500", 
    served: "bg-emerald-500",
    finished: "bg-gray-400"
  }

  return (
    <Button
      ref={ref}
      variant={isActive ? "default" : "outline"}
      size={showLabel ? "default" : "sm"}
      className={cn(
        "relative transition-all duration-200 ease-in-out",
        "font-medium tracking-tight",
        isActive 
          ? "bg-gradient-to-r from-blue-600 to-blue-700 border-blue-600 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm" 
          : "bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center gap-2">
        {/* Timer Icon */}
        <Timer className={cn(
          "transition-transform duration-200",
          isActive && "animate-pulse"
        )} />
        
        {/* Status Indicator */}
        {isActive && (
          <div className="absolute -top-1 -right-1">
            <div className={cn(
              "h-2 w-2 rounded-full",
              statusColors[orderStatus]
            )} />
          </div>
        )}
        
        {/* Label */}
        {showLabel && (
          <span className="font-medium">
            Track Order
          </span>
        )}
      </div>
    </Button>
  )
})
TrackOrderButton.displayName = "TrackOrderButton"

export { TrackOrderButton }
