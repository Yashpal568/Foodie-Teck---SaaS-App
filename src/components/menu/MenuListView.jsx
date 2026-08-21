import { useState } from 'react'
import { Edit2, Trash2, Search, Plus, Image as ImageIcon, Eye, MoreHorizontal, ToggleLeft, ToggleRight, Filter, X, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPrice } from '@/components/ui/currency-selector'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

export default function MenuListView({ 
  items, 
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

  const categories = ['All', 'Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads']
  const types = ['All', 'VEG', 'NON_VEG']
  const stockStatuses = ['All', 'In Stock', 'Out of Stock']

  const typeConfig = {
    VEG: {
      label: 'VEG',
      color: 'bg-green-100 text-green-800 border-green-200',
      dotColor: 'bg-green-500'
    },
    NON_VEG: {
      label: 'NON-VEG',
      color: 'bg-red-100 text-red-800 border-red-200',
      dotColor: 'bg-red-500'
    },
    'NON-VEG': {
      label: 'NON-VEG',
      color: 'bg-red-100 text-red-800 border-red-200',
      dotColor: 'bg-red-500'
    },
    EGG: {
      label: 'EGG',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      dotColor: 'bg-yellow-500'
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

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Menu Items Table Card */}
        <Card className="border-none shadow-md bg-white overflow-hidden ring-1 ring-gray-100">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-3 border-b border-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Menu Items
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-none font-bold ml-1 text-[10px] px-2 py-0.5">
                    {items.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Manage and organize your restaurant catalog</p>
              </div>
              
              <div className="relative w-full md:w-80 group">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <Input
                  placeholder="Search products, categories, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 bg-gray-50/50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-200 transition-all h-11 rounded-xl text-sm font-medium shadow-sm group-hover:bg-gray-50"
                />
              </div>
            </div>
          </CardHeader>

          {/* Filters Toolstrip */}
          <div className="px-4 py-3 bg-gray-50/30 border-b border-gray-50 overflow-x-auto no-scrollbar scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max">
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
                <Filter className="w-3.5 h-3.5 text-gray-400 ml-2" />
                <div className="h-4 w-px bg-gray-100 mx-1" />
                
                <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 text-xs font-bold w-30">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category} className="text-xs">{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-4 w-px bg-gray-100" />

                <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 text-xs font-bold w-27.5">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map(type => (
                      <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-4 w-px bg-gray-100" />

                <Select value={stockFilter} onValueChange={onStockFilterChange}>
                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 text-xs font-bold w-27.5">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockStatuses.map(status => (
                      <SelectItem key={status} value={status} className="text-xs">{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  onSearchChange('')
                  onCategoryFilterChange('All')
                  onTypeFilterChange('All')
                  onStockFilterChange('All')
                }}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 h-10 px-3"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          <CardContent className="p-0 md:p-0">
            {items.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-600 mb-4 text-sm max-w-xs mx-auto">
                  {searchTerm || categoryFilter !== 'All' || typeFilter !== 'All' || stockFilter !== 'All'
                    ? 'Try adjusting your filters or search terms to find what you are looking for'
                    : 'Get started by adding your first menu item to your restaurant'
                  }
                </p>
                {!searchTerm && categoryFilter === 'All' && typeFilter === 'All' && stockFilter === 'All' && (
                  <Button onClick={onAddNew} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="">
                {/* Desktop Table View */}
                <div className="hidden md:block rounded-md border border-gray-100">
                  <Table className="">
                    <TableHeader className="">
                      <TableRow className="">
                        <TableHead className="w-20">Image</TableHead>
                        <TableHead className="">Item Name</TableHead>
                        <TableHead className="">Category</TableHead>
                        <TableHead className="">Type</TableHead>
                        <TableHead className="">Price</TableHead>
                        <TableHead className="">Stock</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="">
                      {items.map((item) => {
                        const config = getTypeConfig(item.type)
                        
                        return (
                          <TableRow key={item._id} className="hover:bg-gray-50/50">
                            <TableCell className="">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden ring-1 ring-gray-100">
                                {item.photo ? (
                                  <img src={item.photo} alt={item.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-gray-300" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell className="">
                              <div className="">
                                <div className="font-bold text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500 line-clamp-1 max-w-50">
                                  {item.description}
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell className="">
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50/50 border-gray-100">
                                {item.category}
                              </Badge>
                            </TableCell>
                            
                            <TableCell className="">
                              <Badge className={`${config.color} text-[10px] font-bold border-none shadow-sm`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor} mr-1.5 animate-pulse`}></div>
                                {config.label}
                              </Badge>
                            </TableCell>
                            
                            <TableCell className="font-bold text-gray-900">
                              <div>{formatPrice(item.price, currency)}</div>
                              {item.halfPrice && (
                                <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                                  Half: {formatPrice(item.halfPrice, currency)}
                                </div>
                              )}
                            </TableCell>
                            
                            <TableCell className="">
                              <Badge 
                                variant={item.isInStock ? "default" : "destructive"}
                                className={item.isInStock ? "bg-green-100 text-green-800 border-none text-[10px] font-bold" : "text-[10px] font-bold border-none"}
                              >
                                {item.isInStock ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                              {item.quantity !== undefined && item.quantity !== null && (
                                <div className="mt-1 text-[10px] font-semibold text-gray-500">
                                  Qty: {item.quantity}
                                </div>
                              )}
                            </TableCell>
                            
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => handleItemClick(item)} className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="">
                                    <p>View Details</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => onEdit(item)} className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="">
                                    <p>Edit Item</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => onToggleStock(item._id, !item.isInStock)}
                                      className={`h-8 w-10 p-0 transition-colors ${
                                        item.isInStock 
                                          ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' 
                                          : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                      }`}
                                    >
                                      {item.isInStock ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="">
                                    <p>{item.isInStock ? 'Disable' : 'Enable'}</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => onDelete(item)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="">
                                    <p>Delete Item</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List View (Premium Shadcn Redesign) */}
                <div className="md:hidden space-y-3 px-4 pb-4">
                  {items.map((item) => {
                    const config = getTypeConfig(item.type)
                    
                    return (
                      <Card key={item._id} className="overflow-hidden border-slate-200/60 shadow-sm transition-all hover:shadow-md bg-white">
                        <div className="flex items-stretch h-27.5">
                          {/* Left: Image (Full height) */}
                          <div className="relative w-28 h-full shrink-0 bg-slate-50 border-r border-slate-100">
                            {item.photo ? (
                              <img src={item.photo} alt={item.name} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-slate-200" />
                              </div>
                            )}
                            {!item.isInStock && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                                <Badge variant="destructive" className="text-[9px] uppercase font-black px-1.5 py-0">Out</Badge>
                              </div>
                            )}
                          </div>
                          
                          {/* Right: Content */}
                          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">{item.name}</h4>
                                <div className="flex flex-col items-end shrink-0">
                                  <span className="font-black text-slate-900 text-sm">{formatPrice(item.price, currency)}</span>
                                  {item.halfPrice && (
                                    <span className="text-[9px] text-slate-500 font-bold">H: {formatPrice(item.halfPrice, currency)}</span>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-[11px] text-slate-500 line-clamp-1 mb-2 font-medium">{item.description}</p>
                              
                              <div className="flex flex-wrap gap-1.5">
                                <Badge className={`${config.color} text-[9px] font-bold uppercase border-none shadow-none px-1.5 py-0 h-4`}>
                                   <div className={`w-1 h-1 rounded-full ${config.dotColor} mr-1`}></div>
                                   {config.label}
                                </Badge>
                                <Badge variant="secondary" className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 border-none px-1.5 py-0 h-4 hover:bg-slate-200">
                                   {item.category}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                              <div className="flex flex-col gap-0.5">
                                <Badge variant={item.isInStock ? "default" : "secondary"} className={item.isInStock ? "bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-bold uppercase h-5 px-2 shadow-sm w-fit" : "text-[9px] font-bold uppercase h-5 px-2 text-slate-400 w-fit"}>
                                  {item.isInStock ? 'Live' : 'Hidden'}
                                </Badge>
                                {item.quantity !== undefined && item.quantity !== null && (
                                  <span className="text-[9px] font-bold text-slate-500 ml-0.5">Qty: {item.quantity}</span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-0.5">
                                <Button size="icon" variant="ghost" onClick={() => handleItemClick(item)} className="h-6 w-6 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                   <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => onEdit(item)} className="h-6 w-6 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50">
                                   <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md text-slate-400 hover:bg-slate-100">
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl">
                                    <DropdownMenuItem onClick={() => onToggleStock(item._id, !item.isInStock)} className="py-2.5 cursor-pointer">
                                      {item.isInStock ? <ToggleRight className="w-4 h-4 mr-2 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 mr-2 text-slate-400" />}
                                      <span className="text-xs font-semibold">{item.isInStock ? 'Mark Out of Stock' : 'Mark In Stock'}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="" />
                                    <DropdownMenuItem onClick={() => onDelete(item._id)} className="py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      <span className="text-xs font-semibold">Delete Item</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
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