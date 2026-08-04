import { useState } from 'react'
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Menu Item?", 
  itemName = "", 
  description = "This action is permanent and cannot be undone. The dish will be removed immediately from your live restaurant catalog.",
  isDeleting = false 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-2xl shadow-red-500/10 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Red Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-red-600 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 text-center">
          {/* Animated Warning Icon Badge */}
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 border-2 border-red-100 dark:border-red-900/50 flex items-center justify-center shadow-inner relative group">
            <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping opacity-75" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30 text-white relative">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            {title}
          </h3>

          {/* Item Name Highlight Tag */}
          {itemName && (
            <div className="my-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-900/40 text-sm font-semibold max-w-full truncate">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="truncate">"{itemName}"</span>
            </div>
          )}

          {/* Warning Description */}
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 px-2">
            {description}
          </p>

          {/* Action Buttons (Shadcn Studio Styling) */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 h-11 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-all shadow-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 h-11 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
