import { useState } from 'react'
import { Plus, X, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currencies } from '@/components/ui/currency-selector'
import ImageStorage from '@/utils/imageStorage'

export default function MenuItemForm({ item = null, onSave, onCancel, currency = 'INR', categories = [] }) {
  const defaultCategory = item?.category || (categories && categories.length > 0 ? categories[0] : 'Main Course')
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    category: defaultCategory,
    type: item?.type || 'VEG',
    isInStock: item?.isInStock !== undefined ? item.isInStock : true,
    quantity: item?.quantity ?? '',
    halfPrice: item?.halfPrice ?? '',
    photo: item?.photo || ''
  })

  const [imagePreview, setImagePreview] = useState(item?.photo || '')
  const [isUploading, setIsUploading] = useState(false)

  // Get currency symbol
  const currencyConfig = currencies.find(c => c.code === currency) || currencies[0]
  const currencySymbol = currencyConfig.symbol

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setIsUploading(true)
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 600
          const MAX_HEIGHT = 600
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          // Very aggressive compression: jpeg at 60% quality ensures very low KB size
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6)
          setImagePreview(compressedDataUrl)
          setFormData(prev => ({ ...prev, photo: compressedDataUrl }))
          setIsUploading(false)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImagePreview('')
    setFormData(prev => ({ ...prev, photo: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const menuItemData = {
      _id: item?._id || item?.id || undefined,
      tempPhoto: undefined,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      type: formData.type,
      isInStock: formData.isInStock,
      quantity: formData.quantity,
      halfPrice: formData.halfPrice,
      photo: formData.photo,
      price: Math.max(0, parseFloat(formData.price) || 0),
      createdAt: item?.createdAt || new Date(),
      updatedAt: new Date()
    }

    if (!item) {
      // For new items, we'll save the image after getting the ID from parent
      menuItemData.tempPhoto = formData.photo // Temporary storage
    }

    onSave(menuItemData)
  }

  const isFormValid = Boolean(formData.name && formData.price)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {item ? 'Edit Menu Item' : 'Add New Menu Item'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Dish Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter dish name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Full Plate Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="halfPrice">Half Plate Price (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                <Input
                  id="halfPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.halfPrice}
                  onChange={(e) => handleInputChange('halfPrice', e.target.value)}
                  className="pl-8"
                  placeholder="Leave blank if N/A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Stock Quantity (Optional)</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                placeholder="Leave blank for infinite"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the dish, ingredients, preparation method..."
              rows={3}
            />
          </div>

          {/* Category and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VEG">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      Vegetarian
                    </div>
                  </SelectItem>
                  <SelectItem value="NON_VEG">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      Non-Vegetarian
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="stock">Availability</Label>
              <p className="text-sm text-gray-600">Toggle to show/hide this item from the menu</p>
            </div>
            <Switch
              id="stock"
              checked={formData.isInStock}
              onCheckedChange={(checked) => handleInputChange('isInStock', checked)}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Menu item"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload a photo of the dish</p>
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <Button type="button" variant="outline" disabled={isUploading}>
                      {isUploading ? 'Uploading...' : <><Upload className="w-4 h-4 mr-2" /> Choose File</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={!isFormValid || isUploading}>
              {item ? 'Update Item' : 'Add Item'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
