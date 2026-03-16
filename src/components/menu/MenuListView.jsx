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
    }
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Menu Items</h2>
            <p className="text-gray-600">Manage your restaurant menu</p>
          </div>
        </div>

        {/* Menu Items Table Card */}
        <Card className="border-none shadow-md bg-white overflow-hidden ring-1 ring-gray-100">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-3 border-b border-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                Menu Items
                <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-100 font-bold ml-1">
                  {items.length}
                </Badge>
              </CardTitle>
              
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 bg-gray-50/50 border-gray-100 focus:bg-white transition-all h-10 rounded-lg text-sm"
                />
              </div>
            </div>
          </CardHeader>

          {/* Filters Toolstrip */}
          <div className="px-4 py-3 bg-gray-50/30 border-b border-gray-50 overflow-x-auto no-scrollbar scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max">
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
                <Filter className="w-3.5 h-3.5 text-gray-400 ml-2" />
                <div className="h-4 w-[1px] bg-gray-100 mx-1" />
                
                <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 text-xs font-bold w-[120px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category} className="text-xs">{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-4 w-[1px] bg-gray-100" />

                <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 text-xs font-bold w-[110px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map(type => (
                      <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-4 w-[1px] bg-gray-100" />

                <Select value={stockFilter} onValueChange={onStockFilterChange}>
                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 text-xs font-bold w-[110px]">
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
                        <TableHead className="w-[80px]">Image</TableHead>
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
                        const config = typeConfig[item.type]
                        
                        return (
                          <TableRow key={item._id} className="hover:bg-gray-50/50">
                            <TableCell className="">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden ring-1 ring-gray-100">
                                {item.photo ? (
                                  <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
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
                                <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">
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
                            
                            <TableCell className="font-black text-gray-900">
                              {formatPrice(item.price, currency)}
                            </TableCell>
                            
                            <TableCell className="">
                              <Badge 
                                variant={item.isInStock ? "default" : "destructive"}
                                className={item.isInStock ? "bg-green-100 text-green-800 border-none text-[10px] font-bold" : "text-[10px] font-bold border-none"}
                              >
                                {item.isInStock ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                            </TableCell>
                            
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => handleItemClick(item)} className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Details</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => onEdit(item)} className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
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
                                  <TooltipContent>
                                    <p>{item.isInStock ? 'Disable' : 'Enable'}</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => onDelete(item._id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
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

                {/* Mobile Card List View */}
                <div className="md:hidden space-y-4 px-4 pb-4">
                  {items.map((item) => {
                    const config = typeConfig[item.type]
                    
                    return (
                      <div key={item._id} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 flex flex-col gap-4 active:scale-[0.98] transition-all">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 ring-1 ring-gray-100">
                            {item.photo ? (
                              <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-gray-200" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-black text-gray-900 leading-tight truncate">{item.name}</h4>
                              <p className="font-black text-orange-600 whitespace-nowrap">{formatPrice(item.price, currency)}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <Badge className={`${config.color} text-[10px] font-bold border-none shadow-none px-2 py-0 h-5`}>
                                <div className={`w-1 h-1 rounded-full ${config.dotColor} mr-1`}></div>
                                {config.label}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase text-gray-400 border-gray-100 bg-gray-50/50 px-2 py-0 h-5">
                                {item.category}
                              </Badge>
                            </div>
                            
                            <p className="text-xs text-gray-500 line-clamp-1 mt-1 font-medium">{item.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={item.isInStock ? "default" : "destructive"}
                              className={item.isInStock ? "bg-green-100 text-green-700 border-none text-[10px] font-black h-7" : "text-[10px] font-black border-none h-7"}
                            >
                              {item.isInStock ? 'LIVE' : 'OUT'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleItemClick(item)} className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => onEdit(item)} className="h-9 w-9 rounded-xl hover:bg-orange-50 hover:text-orange-600">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onToggleStock(item._id, !item.isInStock)}
                              className={`h-9 w-9 rounded-xl ${
                                item.isInStock ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {item.isInStock ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => onDelete(item._id)} className="h-9 w-9 rounded-xl text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
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
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
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
                      <Badge className={typeConfig[selectedItem.type].color}>
                        <div className={`w-2 h-2 rounded-full ${typeConfig[selectedItem.type].dotColor} mr-1`}></div>
                        {typeConfig[selectedItem.type].label}
                      </Badge>
                      <Badge variant="outline">{selectedItem.category}</Badge>
                      {!selectedItem.isInStock && (
                        <Badge variant="destructive">Out of Stock</Badge>
                      )}
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Detailed information and settings for {selectedItem.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Item Image */}
                <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  {selectedItem.photo ? (
                    <img
                      src={selectedItem.photo}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Price</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(selectedItem.price, currency)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Availability</h4>
                    <Badge 
                      variant={selectedItem.isInStock ? "default" : "destructive"}
                      className={selectedItem.isInStock ? "bg-green-100 text-green-800 border-green-200" : ""}
                    >
                      {selectedItem.isInStock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedItem.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Category</h4>
                    <p className="text-gray-600">{selectedItem.category}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Type</h4>
                    <p className="text-gray-600">{selectedItem.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Created</h4>
                    <p className="text-gray-600">{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Last Updated</h4>
                    <p className="text-gray-600">{new Date(selectedItem.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    onClick={() => { onEdit(selectedItem); closeModal(); }}
                    className="px-6 py-3 text-base font-medium"
                  >
                    <Edit2 className="w-5 h-5 mr-2" />
                    Edit Item
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { onToggleStock(selectedItem._id, !selectedItem.isInStock); closeModal(); }}
                    className={`px-6 py-3 text-base font-medium ${
                      selectedItem.isInStock 
                        ? 'text-yellow-600 border-yellow-600 hover:bg-yellow-50 hover:text-yellow-700' 
                        : 'text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    {selectedItem.isInStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { onDelete(selectedItem._id); closeModal(); }}
                    className="px-6 py-3 text-base font-medium"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete Item
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