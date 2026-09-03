import { useState, useEffect } from 'react'
import { 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Save, 
  Layers, 
  FolderPlus, 
  Check, 
  Sparkles, 
  CheckCircle2,
  FolderTree,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

import DeleteConfirmModal from './DeleteConfirmModal'
import { getCategories, syncCategories } from '@/lib/api'

const QUICK_PRESETS = [
  'Tandoor & Kebabs',
  'Sizzlers',
  'Chinese & Bowls',
  'Mocktails & Shakes',
  'Chef Specials',
  'Combo Meals'
]

export default function CategoryManager({ onCategoriesChange, showLabel = true, restaurantId }) {
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)

  // Load categories from Supabase / Local Storage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const cloudCategories = await getCategories(restaurantId)
        if (cloudCategories && cloudCategories.length > 0) {
          const names = cloudCategories.map(c => typeof c === 'string' ? c : c.name)
          setCategories(names)
          if (onCategoriesChange) onCategoriesChange(names)
        } else {
          const defaults = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Breads & Rice']
          setCategories(defaults)
          if (restaurantId && restaurantId !== 'null' && !restaurantId.includes('@')) {
            await syncCategories(restaurantId, defaults)
          }
          if (onCategoriesChange) onCategoriesChange(defaults)
        }
      } catch (err) {
        console.warn('Fallback to default categories:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [restaurantId])

  const saveAndSync = async (updated) => {
    setCategories(updated)
    if (onCategoriesChange) onCategoriesChange(updated)
    
    if (restaurantId) {
      try {
        await syncCategories(restaurantId, updated)
      } catch (err) {
        console.error('Failed to sync categories:', err)
      }
    }
  }

  const addCategory = (nameToAdd) => {
    const catName = (typeof nameToAdd === 'string' ? nameToAdd : newCategory).trim()
    if (!catName) {
      toast.error('Please enter a category name')
      return
    }

    if (categories.some(c => c.toLowerCase() === catName.toLowerCase())) {
      toast.error(`Category "${catName}" already exists!`)
      return
    }

    const updated = [...categories, catName]
    saveAndSync(updated)
    toast.success(`✨ Category "${catName}" added!`)
    setNewCategory('')
  }

  const deleteCategory = (category) => {
    setCategoryToDelete(category)
  }

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return
    const updated = categories.filter(cat => cat !== categoryToDelete)
    saveAndSync(updated)
    toast.success(`Category "${categoryToDelete}" deleted`)
    setCategoryToDelete(null)
  }

  const startEdit = (category) => {
    setEditingCategory(category)
    setEditValue(category)
  }

  const saveEdit = () => {
    if (!editValue.trim()) {
      toast.error('Category name cannot be empty')
      return
    }

    if (editValue.trim() !== editingCategory) {
      const updated = categories.map(cat => cat === editingCategory ? editValue.trim() : cat)
      saveAndSync(updated)
      toast.success(`Category renamed to "${editValue.trim()}"`)
    }
    setEditingCategory(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setEditValue('')
  }

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className="tooltip-wrapper inline-block">
            {!showLabel ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-slate-100 rounded-xl cursor-pointer">
                    <FolderTree className="w-4 h-4 text-indigo-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-semibold">Manage Categories</TooltipContent>
              </Tooltip>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8.5 rounded-xl bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                <span>Categories ({categories.length})</span>
              </Button>
            )}
          </div>
        </DialogTrigger>

        <DialogContent showCloseButton={false} className="max-w-3xl! w-[92vw] max-h-[85vh] h-[80vh] p-0 overflow-hidden rounded-3xl border-slate-200/90 shadow-2xl bg-[#f8fafc] flex flex-col font-['Roboto',sans-serif]">
          
          {/* ── 1. Executive Studio Header ── */}
          <div className="bg-slate-950 text-white px-6 py-4.5 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white">
                    Menu Category Architecture
                  </DialogTitle>
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-bold py-0.5 px-2">
                    Floor & QR Taxonomy
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Organize dining sections, tandoor, gravies, and bar items across POS Terminal & Digital QR Menus.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-8.5 h-8.5 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── 2. Add New Category Bar & Quick Presets ── */}
          <div className="p-6 pb-3 bg-white border-b border-slate-200/80 space-y-3.5 shrink-0">
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Create New Menu Category
              </span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <FolderPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Enter category name (e.g. Charcoal Tandoor, Sizzlers, Cocktails)..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                    className="pl-9.5 h-10 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white transition-all shadow-inner"
                  />
                </div>
                <Button 
                  onClick={() => addCategory()}
                  className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Category
                </Button>
              </div>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Add:</span>
              {QUICK_PRESETS.map((preset) => {
                const isExisting = categories.includes(preset)
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => !isExisting && addCategory(preset)}
                    disabled={isExisting}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                      isExisting
                        ? 'bg-slate-100 text-slate-400 border-slate-200/60 cursor-default opacity-60'
                        : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80 cursor-pointer active:scale-95'
                    }`}
                  >
                    <span>{isExisting ? '✓' : '+'}</span>
                    <span>{preset}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── 3. Current Categories Grid / List ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Active Categories ({categories.length})
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Drag or rename to update customer QR menu order
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((category, idx) => {
                const isEditing = editingCategory === category
                return (
                  <div 
                    key={category} 
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-2.5"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                          className="h-8 text-xs font-bold rounded-lg border-indigo-400 focus:ring-1 focus:ring-indigo-500"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          onClick={saveEdit}
                          className="h-8 w-8 p-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                          title="Save Changes"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={cancelEdit}
                          className="h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-100 shrink-0"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 font-mono font-extrabold text-[10px] flex items-center justify-center shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-950 truncate tracking-tight">
                              {category}
                            </h5>
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active on POS & QR Menu
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(category)}
                            className="w-8 h-8 p-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Rename Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCategory(category)}
                            className="w-8 h-8 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {categories.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <FolderTree className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-xs text-slate-700">No categories defined</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Add a category above to organize your dishes.</p>
              </div>
            )}
          </div>

          {/* ── 4. Bottom Sticky Footer ── */}
          <div className="px-6 py-3 bg-white border-t border-slate-200/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{categories.length} categories active across digital menu and kitchen KOTs</span>
            </div>

            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-8.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 cursor-pointer"
            >
              Done
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      <DeleteConfirmModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category?"
        itemName={categoryToDelete || ''}
        description="Deleting this category will unassign items currently under it. Are you sure you want to proceed?"
      />
    </TooltipProvider>
  )
}
