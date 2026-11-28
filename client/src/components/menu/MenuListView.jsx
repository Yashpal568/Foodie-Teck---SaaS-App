import { useMemo, useState, useEffect } from 'react'
import { Edit2, Trash2, Search, Plus, Image as ImageIcon, Eye, EyeOff, MoreHorizontal, ToggleLeft, ToggleRight, Filter, List, LayoutGrid, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPrice } from '@/components/ui/currency-selector'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

const PAGE_SIZE = 12

export default function MenuListView({ 
  items = [], 
  currency, 
  onEdit, 
  onDelete, 
  onToggleStock, 
  onAddNew,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  typeFilter,
  onTypeFilterChange,
  stockFilter,
  onStockFilterChange
}) {
  const [selectedItem, setSelectedItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'grid'
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const categories = useMemo(() => {
    const base = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads']
    const fromItems = items.map(i => String(i.category || '').trim()).filter(Boolean)
    return ['All', ...Array.from(new Set([...base, ...fromItems]))]
  }, [items])
  const types = ['All', 'VEG', 'NON_VEG']
  const stockStatuses = ['All', 'In Stock', 'Out of Stock']

  useEffect(() => {
    setCurrentPage(1)
  }, [items.length, searchTerm, categoryFilter, typeFilter, stockFilter])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return items.slice(start, start + PAGE_SIZE)
  }, [items, safePage])

  const pageStart = items.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(safePage * PAGE_SIZE, items.length)

  const getItemId = (item) => String(item?._id || item?.id || item?.name || '')
  const getSkuTag = (item) => {
    const cat = String(item?.category || 'ITM').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'ITM'
    const tail = String(item?._id || item?.id || '01').replace(/[^A-Za-z0-9]/g, '').slice(-2).toUpperCase() || '01'
    return `#${cat}-${tail}`
  }

  const getStockBadge = (item) => {
    if (!item?.isInStock) {
      return {
        label: 'Out of Stock',
        pillClass: 'bg-rose-50 text-rose-600 border-rose-200/70',
        dotClass: 'bg-rose-500',
      }
    }
    const qty = item?.quantity !== undefined && item?.quantity !== null ? Number(item.quantity) : null
    if (qty !== null && qty > 0 && qty <= 3) {
      return {
        label: 'Low Stock',
        pillClass: 'bg-amber-50 text-amber-700 border-amber-200/70',
        dotClass: 'bg-amber-500',
      }
    }
    return {
      label: 'In Stock',
      pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      dotClass: 'bg-emerald-500',
    }
  }

  const toggleSelectAllPage = () => {
    const pageIds = paginatedItems.map(getItemId)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExportCsv = () => {
    const rows = [
      ['Name', 'Category', 'Type', 'Price', 'Half Price', 'Status', 'Quantity'],
      ...items.map((i) => [
        `"${String(i.name || '').replace(/"/g, '""')}"`,
        `"${String(i.category || '')}"`,
        `"${String(i.type || 'VEG')}"`,
        Number(i.price || 0),
        i.halfPrice ? Number(i.halfPrice) : '',
        i.isInStock ? 'In Stock' : 'Out of Stock',
        i.quantity ?? '',
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `servora-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const typeConfig = {
    VEG: {
      label: 'VEG',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      dotColor: 'bg-emerald-500'
    },
    NON_VEG: {
      label: 'NON-VEG',
      color: 'bg-rose-50 text-rose-700 border-rose-200/70',
      dotColor: 'bg-rose-500'
    },
    'NON-VEG': {
      label: 'NON-VEG',
      color: 'bg-rose-50 text-rose-700 border-rose-200/70',
      dotColor: 'bg-rose-500'
    },
    EGG: {
      label: 'EGG',
      color: 'bg-amber-50 text-amber-700 border-amber-200/70',
      dotColor: 'bg-amber-500'
    }
  }

  const getTypeConfig = (rawType) => {
    if (!rawType) return typeConfig.VEG
    const normalized = String(rawType).toUpperCase().replace('-', '_')
    return typeConfig[normalized] || typeConfig[rawType] || typeConfig.VEG
  }

  const handleItemClick = (item) => {
    setSelectedItem(item)
    setShowDetailModal(true)
  }

  const closeModal = () => {
    setShowDetailModal(false)
    setSelectedItem(null)
  }

  const allPageSelected =
    paginatedItems.length > 0 && paginatedItems.every((it) => selectedIds.has(getItemId(it)))

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="border border-slate-200/80 shadow-xs bg-white overflow-hidden rounded-2xl">
          {/* Desktop Card Header */}
          <CardHeader className="hidden md:block p-4 sm:p-5 pb-3 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Menu Items</span>
                  <Badge variant="secondary" className="bg-orange-50 text-orange-600 border border-orange-200/60 font-bold text-[10.5px] px-2 py-0.5 rounded-full">
                    {items.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Manage, price, and organize your restaurant catalog and real-time inventory
                </p>
              </div>
              
              <div className="relative w-full md:w-80 group">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                <Input
                  placeholder="Search products, categories, SKU, or tags..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 bg-slate-50/80 border-slate-200/80 focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-colors h-10 rounded-xl text-xs sm:text-sm font-medium"
                />
              </div>
            </div>
          </CardHeader>

          {/* Desktop Filters + List/Grid Toggle + Export Bar */}
          <div className="hidden md:flex px-4 sm:px-5 py-3 bg-white border-b border-slate-100 flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </span>

              <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                <SelectTrigger className="h-8.5 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 w-auto min-w-[130px] px-3 cursor-pointer">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category} className="text-xs">
                      {category === 'All' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                <SelectTrigger className="h-8.5 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 w-auto min-w-[110px] px-3 cursor-pointer">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {type === 'All' ? 'All Types' : type === 'NON_VEG' ? 'Non-Veg' : 'Veg'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={onStockFilterChange}>
                <SelectTrigger className="h-8.5 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 w-auto min-w-[135px] px-3 cursor-pointer">
                  <SelectValue placeholder="All Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  {stockStatuses.map(status => (
                    <SelectItem key={status} value={status} className="text-xs">
                      {status === 'All' ? 'All Stock Status' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() => {
                  onSearchChange('')
                  onCategoryFilterChange('All')
                  onTypeFilterChange('All')
                  onStockFilterChange('All')
                }}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-8 px-3 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export</span>
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            {/* Mobile Clean Search + Category Pills + Veg Only + View Switcher (Matches Reference Image 2) */}
            <div className="md:hidden p-3.5 pb-2 space-y-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search products, SKU, or tags..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-9 bg-slate-50/90 border-slate-200/80 focus:bg-white h-10 rounded-xl text-xs font-medium"
                />
                {(searchTerm || categoryFilter !== 'All' || typeFilter !== 'All' || stockFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange('')
                      onCategoryFilterChange('All')
                      onTypeFilterChange('All')
                      onStockFilterChange('All')
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-600 px-1.5 py-0.5 rounded bg-orange-50"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {categories.map((cat) => {
                  const active = categoryFilter === cat
                  const count = cat === 'All' ? items.length : items.filter((i) => i.category === cat).length
                  if (cat !== 'All' && count === 0) return null
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onCategoryFilterChange(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onTypeFilterChange(typeFilter === 'VEG' ? 'All' : 'VEG')}
                  className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer"
                >
                  <span
                    className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${
                      typeFilter === 'VEG' ? 'bg-emerald-700 justify-end' : 'bg-slate-200 justify-start'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-white shadow-2xs" />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-[3px] border border-emerald-600 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    </span>
                    <span>Veg Only</span>
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-400">
                    Showing {items.length} items
                  </span>
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                      className={`h-6.5 w-6.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        viewMode === 'list' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                      className={`h-6.5 w-6.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-14 px-4">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3.5">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">No menu items found</h3>
                <p className="text-slate-500 mb-4 text-xs sm:text-sm max-w-xs mx-auto">
                  {searchTerm || categoryFilter !== 'All' || typeFilter !== 'All' || stockFilter !== 'All'
                    ? 'Try adjusting your filters or search terms to find what you are looking for'
                    : 'Get started by adding your first menu item to your restaurant'}
                </p>
                {!searchTerm && categoryFilter === 'All' && typeFilter === 'All' && stockFilter === 'All' && (
                  <Button onClick={onAddNew} className="bg-orange-600 hover:bg-orange-700 rounded-xl">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add First Item
                  </Button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              /* ── GRID VIEW (Matches Reference Image 4) ── */
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItems.map((item) => {
                  const config = getTypeConfig(item.type)
                  const stockBadge = getStockBadge(item)
                  const qtyDisplay = item.quantity !== undefined && item.quantity !== null ? ` (${item.quantity})` : ''
                  return (
                    <div
                      key={getItemId(item)}
                      className="rounded-2xl border border-slate-200/85 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 flex flex-col justify-between group"
                    >
                      <div>
                        <div
                          onClick={() => handleItemClick(item)}
                          className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                        >
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt={item.name}
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-10 h-10 text-slate-300" />
                            </div>
                          )}
                          {/* Top Left Floating Badges */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900/75 backdrop-blur-xs text-white text-[9.5px] font-bold uppercase tracking-wider">
                              {item.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase flex items-center gap-1 shadow-xs ${config.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                              {config.label}
                            </span>
                          </div>
                          {/* Top Right Stock Badge */}
                          <div className="absolute top-2.5 right-2.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border shadow-xs flex items-center gap-1 ${stockBadge.pillClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stockBadge.dotClass}`} />
                              {stockBadge.label}{qtyDisplay}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              onClick={() => handleItemClick(item)}
                              className="font-bold text-slate-900 text-sm leading-snug cursor-pointer hover:text-orange-600 transition-colors"
                            >
                              {item.name}
                            </h4>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9.5px] font-mono font-semibold shrink-0">
                              {getSkuTag(item)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                            {item.description || 'Freshly prepared restaurant specialty.'}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/40">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs text-slate-500 font-medium">
                            Full: <strong className="text-sm font-extrabold text-slate-900">{formatPrice(item.price, currency)}</strong>
                          </span>
                          {item.halfPrice && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Half: {formatPrice(item.halfPrice, currency)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => onEdit(item)} className="h-7 w-7 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 cursor-pointer">
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit Item</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onToggleStock(item._id, !item.isInStock)}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                              >
                                {item.isInStock ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{item.isInStock ? 'Hide from menu' : 'Show on menu'}</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => onDelete(item)} className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete Item</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Quick Add New Dish Dashed Card */}
                <button
                  type="button"
                  onClick={onAddNew}
                  className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 hover:bg-orange-50/30 hover:border-orange-300 transition-colors p-6 flex flex-col items-center justify-center text-center min-h-[270px] cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 group-hover:text-orange-600 group-hover:border-orange-200 flex items-center justify-center mb-3 shadow-2xs transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Quick Add New Dish</p>
                  <p className="text-xs text-slate-400 max-w-[210px] mt-1 leading-relaxed">
                    Create a new recipe, set variants, pricing, and live inventory sync
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 group-hover:border-orange-300 group-hover:text-orange-700 shadow-2xs transition-colors">
                    Create Item +
                  </span>
                </button>
              </div>
            ) : (
              /* ── LIST VIEW (Matches Reference Image 3) ── */
              <div>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="w-10 pl-5">
                          <input
                            type="checkbox"
                            aria-label="Select all items on page"
                            checked={allPageSelected}
                            onChange={toggleSelectAllPage}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </TableHead>
                        <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Item Details</TableHead>
                        <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Category</TableHead>
                        <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Type</TableHead>
                        <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Pricing</TableHead>
                        <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Live Stock</TableHead>
                        <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 text-center">Online Status</TableHead>
                        <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 text-right pr-5">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item) => {
                        const rowId = getItemId(item)
                        const config = getTypeConfig(item.type)
                        const stockBadge = getStockBadge(item)
                        const isChecked = selectedIds.has(rowId)
                        
                        return (
                          <TableRow key={rowId} className={`border-slate-100 transition-colors ${isChecked ? 'bg-indigo-50/30' : 'hover:bg-slate-50/70'}`}>
                            <TableCell className="pl-5">
                              <input
                                type="checkbox"
                                aria-label={`Select ${item.name}`}
                                checked={isChecked}
                                onChange={() => toggleSelectRow(rowId)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-3 py-0.5">
                                <div
                                  onClick={() => handleItemClick(item)}
                                  className="w-11 h-11 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/70 shrink-0 cursor-pointer"
                                >
                                  {item.photo ? (
                                    <img src={item.photo} alt={item.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageIcon className="w-5 h-5 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      onClick={() => handleItemClick(item)}
                                      className="font-bold text-slate-900 text-sm cursor-pointer hover:text-orange-600 transition-colors truncate"
                                    >
                                      {item.name}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[9.5px] font-mono font-semibold shrink-0">
                                      {getSkuTag(item)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-400 line-clamp-1 max-w-[300px] mt-0.5">
                                    {item.description}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50/70 border-blue-200/60 px-2.5 py-0.5 rounded-md">
                                {item.category}
                              </Badge>
                            </TableCell>
                            
                            <TableCell>
                              <Badge variant="outline" className={`${config.color} text-[10px] font-bold px-2 py-0.5 rounded-md`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} mr-1.5`} />
                                {config.label}
                              </Badge>
                            </TableCell>
                            
                            <TableCell className="font-bold text-slate-900 tabular-nums">
                              <div className="text-sm">{formatPrice(item.price, currency)}</div>
                              {item.halfPrice && (
                                <div className="text-[10.5px] font-medium text-slate-400 mt-0.5">
                                  Half: {formatPrice(item.halfPrice, currency)}
                                </div>
                              )}
                            </TableCell>
                            
                            <TableCell>
                              <Badge variant="outline" className={`${stockBadge.pillClass} text-[10px] font-bold px-2 py-0.5 rounded-md`}>
                                {stockBadge.label}
                              </Badge>
                              {item.quantity !== undefined && item.quantity !== null && (
                                <div className="mt-1 text-[10.5px] font-semibold text-slate-400 tabular-nums">
                                  Qty: {item.quantity}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onToggleStock(item._id, !item.isInStock)}
                                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                  >
                                    {item.isInStock ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{item.isInStock ? 'Visible on menu (click to hide)' : 'Hidden from menu (click to show)'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            
                            <TableCell className="text-right pr-5">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" onClick={() => onEdit(item)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 cursor-pointer">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit Item</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" onClick={() => onDelete(item)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Delete Item</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List View (Matches Reference Image 3) */}
                <div className="md:hidden space-y-3 p-3.5">
                  {paginatedItems.map((item) => {
                    const config = getTypeConfig(item.type)
                    const stockBadge = getStockBadge(item)
                    const qty = item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : null
                    const isLowOrOut = !item.isInStock || (qty !== null && qty <= 3)

                    return (
                      <div
                        key={getItemId(item)}
                        className="rounded-2xl border border-slate-200/85 bg-white p-3 shadow-2xs space-y-2.5"
                      >
                        <div className="flex gap-3">
                          {/* Left: Square Dish Image with Floating Category */}
                          <div
                            onClick={() => handleItemClick(item)}
                            className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 cursor-pointer"
                          >
                            {item.photo ? (
                              <img src={item.photo} alt={item.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-slate-300" />
                              </div>
                            )}
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[8px] font-bold uppercase tracking-wider max-w-[72px] truncate">
                              {item.category}
                            </span>
                          </div>

                          {/* Right: SKU, Stock Pill, Name, Desc, Price */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5 mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotColor}`} />
                                <span className="text-[10px] font-mono font-semibold text-slate-400 truncate">
                                  {getSkuTag(item)}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border shrink-0 ${stockBadge.pillClass}`}>
                                {stockBadge.label}{qty !== null ? ` (${qty})` : ''}
                              </span>
                            </div>

                            <h4
                              onClick={() => handleItemClick(item)}
                              className="font-bold text-slate-900 text-sm leading-snug truncate cursor-pointer"
                            >
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                              {item.description}
                            </p>

                            <div className="flex items-center justify-between mt-1.5">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-900">
                                  {formatPrice(item.price, currency)} <span className="font-medium text-slate-400">Full</span>
                                </span>
                                {item.halfPrice && (
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {formatPrice(item.halfPrice, currency)} Half
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => onToggleStock(item._id, !item.isInStock)}
                                className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                                title={item.isInStock ? 'Hide item' : 'Show item'}
                              >
                                {item.isInStock ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Inventory Level / Restock / Edit Bar */}
                        <div className={`rounded-xl px-3 py-2 flex items-center justify-between gap-2 ${
                          isLowOrOut ? 'bg-amber-50/70 border border-amber-200/70' : 'bg-slate-50 border border-slate-100'
                        }`}>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {isLowOrOut ? 'Low / Out of Stock' : 'Inventory Level'}
                          </span>
                          <div className="flex items-center gap-2">
                            {qty !== null && (
                              <span className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-0.5 tabular-nums">
                                {qty}
                              </span>
                            )}
                            {isLowOrOut && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => onEdit(item)}
                                className="h-7 px-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold cursor-pointer"
                              >
                                + Restock
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(item)}
                              className="h-7 px-2.5 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pagination & Selection Footer */}
            {items.length > 0 && (
              <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500 font-medium">
                  Showing <strong className="text-slate-800">{pageStart} to {pageEnd}</strong> of{' '}
                  <strong className="text-slate-800">{items.length}</strong> menu items • Selected{' '}
                  <strong className="text-slate-800">{selectedIds.size}</strong> items
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 rounded-lg border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      type="button"
                      size="sm"
                      variant={page === safePage ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 w-8 p-0 rounded-lg text-xs font-bold cursor-pointer ${
                        page === safePage
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 rounded-lg border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          {selectedItem && (
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
              <DialogHeader className="">
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {selectedItem.photo ? (
                      <img
                        src={selectedItem.photo}
                        alt={selectedItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedItem.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getTypeConfig(selectedItem.type).color}>
                        <div className={`w-2 h-2 rounded-full ${getTypeConfig(selectedItem.type).dotColor} mr-1`}></div>
                        {getTypeConfig(selectedItem.type).label}
                      </Badge>
                      <Badge variant="outline">{selectedItem.category}</Badge>
                      {!selectedItem.isInStock && (
                        <Badge variant="destructive">Out of Stock</Badge>
                      )}
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription className="">
                  Detailed information and settings for {selectedItem.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Item Image */}
                <div className="w-full h-48 sm:h-64 bg-gray-100 rounded-2xl overflow-hidden ring-1 ring-gray-100">
                  {selectedItem.photo ? (
                    <img
                      src={selectedItem.photo}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-200" />
                    </div>
                  )}
                </div>

                {/* Item Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-2xl ring-1 ring-gray-100">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pricing</h4>
                    <div className="flex flex-col gap-1">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(selectedItem.price, currency)} <span className="text-sm font-normal text-gray-500">Full</span>
                      </p>
                      {selectedItem.halfPrice && (
                        <p className="text-lg font-bold text-gray-700">
                          {formatPrice(selectedItem.halfPrice, currency)} <span className="text-xs font-normal text-gray-500">Half</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Availability</h4>
                    <div className="flex flex-col gap-2 items-start">
                      <Badge 
                        variant={selectedItem.isInStock ? "default" : "destructive"}
                        className={selectedItem.isInStock 
                          ? "bg-green-100 text-green-700 border-none px-3 py-1 text-[10px] font-bold h-7" 
                          : "px-3 py-1 text-[10px] font-bold border-none h-7"}
                      >
                        {selectedItem.isInStock ? 'AVAILABLE' : 'OUT OF STOCK'}
                      </Badge>
                      {selectedItem.quantity !== undefined && selectedItem.quantity !== null && (
                        <Badge variant="outline" className="text-[10px] font-semibold text-gray-600 bg-white border-gray-200">
                          Stock: {selectedItem.quantity} units
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-1">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedItem.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-1">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</h4>
                    <p className="text-gray-900 font-bold">{selectedItem.category}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Type</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${typeConfig[selectedItem.type].dotColor}`}></div>
                      <p className="text-gray-900 font-bold">{typeConfig[selectedItem.type].label}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-1 border-t pt-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Created On</h4>
                    <p className="text-gray-600 text-sm">{new Date(selectedItem.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Updated</h4>
                    <p className="text-gray-600 text-sm">{new Date(selectedItem.updatedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                  <Button 
                    onClick={() => { onEdit(selectedItem); closeModal(); }}
                    className="flex-1 h-12 text-sm font-bold rounded-xl bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all active:scale-95"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Item
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { onToggleStock(selectedItem._id, !selectedItem.isInStock); closeModal(); }}
                    className={`flex-1 h-12 text-sm font-bold rounded-xl border-2 transition-all active:scale-95 ${
                      selectedItem.isInStock 
                        ? 'text-yellow-600 border-yellow-100 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200' 
                        : 'text-green-600 border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                    }`}
                  >
                    {selectedItem.isInStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { onDelete(selectedItem._id); closeModal(); }}
                    className="h-12 sm:w-12 sm:px-0 text-sm font-bold rounded-xl bg-red-50 text-red-600 border-none hover:bg-red-100 transition-all active:scale-95 shadow-none"
                  >
                    <Trash2 className="w-5 h-5 sm:mx-auto" />
                    <span className="sm:hidden ml-2">Delete Item</span>
                  </Button>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </TooltipProvider>
  )
}