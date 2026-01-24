import { useState } from 'react'
import { Edit2, Trash2, Search, Plus, Image as ImageIcon, Eye, MoreHorizontal, ToggleLeft, ToggleRight, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={stockFilter} onValueChange={onStockFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Menu Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || categoryFilter !== 'All' || typeFilter !== 'All' || stockFilter !== 'All'
                    ? 'Try adjusting your filters or search terms'
                    : 'Get started by adding your first menu item'
                  }
                </p>
                {!searchTerm && categoryFilter === 'All' && typeFilter === 'All' && stockFilter === 'All' && (
                  <Button onClick={onAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Menu Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const config = typeConfig[item.type]
                      
                      return (
                        <TableRow key={item._id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                              {item.photo ? (
                                <img
                                  src={item.photo}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-300" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500 line-clamp-1 max-w-[200px]">
                                {item.description}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <Badge className={config.color}>
                              <div className={`w-2 h-2 rounded-full ${config.dotColor} mr-1`}></div>
                              {config.label}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="font-medium">
                            {formatPrice(item.price, currency)}
                          </TableCell>
                          
                          <TableCell>
                            <Badge 
                              variant={item.isInStock ? "default" : "destructive"}
                              className={item.isInStock ? "bg-green-100 text-green-800 border-green-200" : ""}
                            >
                              {item.isInStock ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleItemClick(item)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View item details</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onEdit(item)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit menu item</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onToggleStock(item._id, !item.isInStock)}
                                    className={`h-8 w-10 p-0 ${
                                      item.isInStock 
                                        ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' 
                                        : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                    }`}
                                  >
                                    {item.isInStock ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{item.isInStock ? 'Mark as out of stock' : 'Mark as in stock'}</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onDelete(item._id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete menu item</p>
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