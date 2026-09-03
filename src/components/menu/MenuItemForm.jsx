import { useState } from 'react'
import { 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Check, 
  Sparkles, 
  DollarSign, 
  Tag, 
  Layers, 
  Eye, 
  Smartphone, 
  Monitor, 
  Flame, 
  Leaf, 
  Drumstick, 
  CheckCircle2,
  AlertCircle,
  Link,
  Utensils,
  ChevronRight,
  Palette
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { currencies } from '@/components/ui/currency-selector'
import { toast } from 'sonner'

// High-resolution curated culinary food presets (Verified Food Photos)
const FOOD_IMAGE_PRESETS = [
  { id: 'tandoori', label: 'Tandoor & Tikka', url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80', type: 'VEG' },
  { id: 'gravy', label: 'Butter Gravy / Dal', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', type: 'VEG' },
  { id: 'burger', label: 'Gourmet Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', type: 'NON_VEG' },
  { id: 'pizza', label: 'Woodfired Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', type: 'VEG' },
  { id: 'pasta', label: 'Artisan Pasta', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80', type: 'VEG' },
  { id: 'biryani', label: 'Royal Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80', type: 'NON_VEG' },
  { id: 'dessert', label: 'Chocolate Fudge', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', type: 'VEG' },
  { id: 'coffee', label: 'Cold Coffee / Latte', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80', type: 'VEG' },
  { id: 'cooler', label: 'Mojito / Mocktail', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80', type: 'VEG' },
  { id: 'rolls', label: 'Rolls & Wraps', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', type: 'VEG' }
]

export default function MenuItemForm({ item = null, onSave, onCancel, currency = 'INR', categories = [] }) {
  const defaultCategory = item?.category || (categories && categories.length > 0 ? categories[0] : 'Main Course')
  
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price !== undefined ? item.price : '',
    halfPrice: item?.halfPrice !== undefined ? item.halfPrice : '',
    category: defaultCategory,
    type: item?.type || 'VEG',
    isInStock: item?.isInStock !== undefined ? item.isInStock : true,
    quantity: item?.quantity ?? '',
    photo: item?.photo || ''
  })

  const [imagePreview, setImagePreview] = useState(item?.photo || '')
  const [isUploading, setIsUploading] = useState(false)
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  // Get currency symbol
  const currencyConfig = currencies.find(c => c.code === currency) || currencies[0]
  const currencySymbol = currencyConfig.symbol || '₹'

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSelectPresetImage = (url) => {
    setImagePreview(url)
    setFormData(prev => ({ ...prev, photo: url }))
    toast.success('✨ Preset culinary background applied!')
  }

  const handleApplyCustomUrl = () => {
    if (customImageUrl.trim()) {
      setImagePreview(customImageUrl.trim())
      setFormData(prev => ({ ...prev, photo: customImageUrl.trim() }))
      toast.success('🌐 Image URL applied successfully!')
      setShowUrlInput(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be under 5MB')
        return
      }

      setIsUploading(true)
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 800
          const MAX_HEIGHT = 800
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
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75)
          setImagePreview(compressedDataUrl)
          setFormData(prev => ({ ...prev, photo: compressedDataUrl }))
          setIsUploading(false)
          toast.success('📷 Dish photo uploaded successfully!')
        }
        if (typeof event.target?.result === 'string') {
          img.src = event.target.result
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImagePreview('')
    setFormData(prev => ({ ...prev, photo: '' }))
    setCustomImageUrl('')
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Please enter a dish name')
      return
    }

    if (!formData.price || isNaN(formData.price) || Number(formData.price) <= 0) {
      toast.error('Please specify a valid full price')
      return
    }

    const menuItemData = {
      _id: item?._id || item?.id || undefined,
      id: item?.id || item?._id || undefined,
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category || 'Main Course',
      type: formData.type || 'VEG',
      isInStock: formData.isInStock,
      in_stock: formData.isInStock,
      quantity: formData.quantity ? Number(formData.quantity) : undefined,
      halfPrice: formData.halfPrice ? Number(formData.halfPrice) : undefined,
      photo: formData.photo || '',
      price: Math.max(0, parseFloat(formData.price) || 0),
      createdAt: item?.createdAt || item?.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onSave(menuItemData)
  }

  const isFormValid = Boolean(formData.name.trim() && formData.price && Number(formData.price) > 0)

  return (
    <div className="w-full max-w-6xl mx-auto pb-16 font-['Roboto',sans-serif] select-none animate-in fade-in duration-200">
      
      {/* ── 1. Executive Glassmorphic Top Navbar / Breadcrumb Bar ── */}
      <div className="sticky top-0 z-30 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3.5 bg-white/85 backdrop-blur-md border-b border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
        
        {/* Left: Breadcrumbs & Page Identity */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-9 w-9 p-0 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shrink-0 transition-transform active:scale-95"
            title="Back to Inventory & Menu"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <span>Inventory & Menu</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-indigo-600 font-extrabold">{item ? 'Edit Dish' : 'Dish Studio'}</span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-tight">
                {item ? `Edit "${item.name}"` : 'Create New Menu Dish'}
              </h1>
              <Badge className={`${formData.isInStock ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'} font-bold text-[10px] py-0.5 px-2 rounded-md hidden sm:inline-flex`}>
                {formData.isInStock ? '● Live on Menu' : '○ Out of Stock'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isUploading}
            className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{item ? 'Update Dish' : 'Save & Publish Dish'}</span>
          </Button>
        </div>

      </div>

      {/* ── 2. Asymmetric Form Studio (70% Form / 30% Live Card Preview) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Clean Organized Form Sections (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Section 1: Core Dish Identity */}
          <div className="p-5.5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>1. Dish Identity & Classification</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">* Required fields</span>
            </div>

            {/* Dish Name */}
            <div className="space-y-1.5">
              <Label htmlFor="dishName" className="text-xs font-bold text-slate-800">
                Dish Name <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="dishName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. Dal Makhani Bukhara, Butter Chicken Roast, Margherita Pizza..."
                className="h-10 text-sm font-bold text-slate-900 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl transition-all shadow-inner"
                required
                autoFocus
              />
            </div>

            {/* Dietary Type & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Dietary Classification Segmented Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Dietary Classification <span className="text-rose-600">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('type', 'VEG')}
                    className={`h-10 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formData.type === 'VEG'
                        ? 'bg-emerald-50/90 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    </span>
                    <span>Vegetarian</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInputChange('type', 'NON_VEG')}
                    className={`h-10 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formData.type === 'NON_VEG'
                        ? 'bg-rose-50/90 border-rose-400 text-rose-900 shadow-xs ring-1 ring-rose-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-rose-600 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    </span>
                    <span>Non-Veg</span>
                  </button>
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Category Section <span className="text-rose-600">*</span>
                </Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(val) => handleInputChange('category', val)}
                >
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-slate-50/70 border-slate-200">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-medium text-xs">
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-xs font-bold text-slate-800">
                  Description & Ingredients (Optional)
                </Label>
                <span className="text-[10px] font-semibold text-slate-400">
                  {formData.description.length}/250 characters
                </span>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value.slice(0, 250))}
                placeholder="Describe the preparation, signature spices, portion size or accompaniments..."
                rows={2}
                className="text-xs p-3 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl resize-none shadow-inner leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: Pricing & Portion Architecture */}
          <div className="p-5.5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>2. Pricing & Portion Architecture</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                GST / VAT calculated at checkout
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Full Plate Price */}
              <div className="space-y-1.5">
                <Label htmlFor="fullPrice" className="text-xs font-bold text-slate-800">
                  Full Plate Price ({currencySymbol}) <span className="text-rose-600">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    {currencySymbol}
                  </span>
                  <Input
                    id="fullPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    className="pl-8.5 h-10 text-sm font-black text-slate-950 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Half Plate Price */}
              <div className="space-y-1.5">
                <Label htmlFor="halfPrice" className="text-xs font-bold text-slate-800">
                  Half / Medium Portion Price ({currencySymbol}) <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    {currencySymbol}
                  </span>
                  <Input
                    id="halfPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.halfPrice}
                    onChange={(e) => handleInputChange('halfPrice', e.target.value)}
                    placeholder="Leave blank if full only"
                    className="pl-8.5 h-10 text-sm font-bold text-slate-800 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl"
                  />
                </div>
              </div>

            </div>

            {/* Availability Switch */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block">Kitchen Stock Availability</span>
                <p className="text-[11px] text-slate-500 font-medium">
                  When enabled, this item is live for ordering on POS and customer QR menu.
                </p>
              </div>
              <Switch
                checked={formData.isInStock}
                onCheckedChange={(checked) => handleInputChange('isInStock', checked)}
              />
            </div>
          </div>

          {/* Section 3: Dish Photography & Background Presets */}
          <div className="p-5.5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  3. Dish Background Photography
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                1-Tap Food Presets or Upload
              </span>
            </div>

            {/* Curated Background Preset Gallery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Choose from Ready-to-Use Culinary Background Presets:</span>
                </Label>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  1-Tap Instant Apply
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                {FOOD_IMAGE_PRESETS.map((preset) => {
                  const isSelected = imagePreview === preset.url
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPresetImage(preset.url)}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all aspect-video cursor-pointer shadow-2xs ${
                        isSelected 
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-102' 
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                      title={`Apply ${preset.label}`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-1.5">
                        <span className="text-[9px] font-black text-white truncate leading-none">
                          {preset.label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Photo Preview or Upload Box */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 group">
                  <img
                    src={imagePreview}
                    alt={formData.name || 'Menu preview'}
                    className="w-full h-48 sm:h-56 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-4">
                    <div className="text-white">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Active Photo</span>
                      <span className="text-xs font-black">{formData.name || 'Dish Image'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="h-8 px-2.5 rounded-xl font-bold text-xs bg-white/90 text-slate-800 hover:bg-white cursor-pointer"
                      >
                        <Link className="w-3.5 h-3.5 mr-1" /> Change URL
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeImage}
                        className="h-8 px-3 rounded-xl font-bold text-xs shadow-md cursor-pointer active:scale-95"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 rounded-2xl p-6 text-center transition-all relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-2 text-indigo-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h5 className="font-extrabold text-xs text-slate-900">
                    {isUploading ? 'Compressing & uploading image...' : 'Or upload your own custom dish photograph'}
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Drag & drop file here or click to browse. Max 5MB (PNG, JPG, WebP).
                  </p>
                </div>
              )}

              {/* Web Image URL Option */}
              {showUrlInput && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2 animate-in fade-in">
                  <Input
                    placeholder="Paste web image URL (e.g. https://...)..."
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-200 rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="h-9 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    Apply URL
                  </Button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Side: Sticky Live Interactive Preview (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="sticky top-20 space-y-4">
            
            {/* Live Preview Header Card */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span className="font-black text-xs uppercase tracking-wider">Live Customer Preview</span>
              </div>
              <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                Real-Time
              </span>
            </div>

            {/* Mobile QR Menu Card Mockup with Background Visuals */}
            <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-md hover:shadow-lg transition-all group">
              
              {/* Image or Placeholder with High-Gloss Presentation */}
              <div className="w-full h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-center text-slate-400 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 w-full h-full flex flex-col items-center justify-center">
                    <ImageIcon className="w-10 h-10 mx-auto mb-1 text-slate-500 opacity-60" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Select a Preset Above
                    </span>
                  </div>
                )}

                {/* Dietary Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1.5 ${
                    formData.type === 'VEG' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-rose-600 text-white'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    {formData.type === 'VEG' ? 'VEG' : 'NON-VEG'}
                  </span>
                </div>

                {/* Stock Status Tag */}
                {!formData.isInStock && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                    <span className="px-3 py-1 bg-rose-600 text-white text-xs font-black rounded-lg uppercase tracking-wider shadow-lg">
                      Sold Out / Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Card Details */}
              <div className="p-4.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      {formData.category || 'Category'}
                    </span>
                    <h4 className="font-black text-sm text-slate-950 leading-snug">
                      {formData.name || 'Dish Name'}
                    </h4>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-slate-950 block">
                      {currencySymbol}{formData.price ? Number(formData.price).toFixed(2) : '0.00'}
                    </span>
                    {formData.halfPrice && Number(formData.halfPrice) > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 block mt-0.5">
                        Half: {currencySymbol}{Number(formData.halfPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {formData.description || 'Appetizing dish description will appear here on customer phones and digital menus.'}
                </p>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>POS Terminal: Ready</span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    1-Tap Ordering
                  </span>
                </div>
              </div>

            </div>

            {/* Pro Tip Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-950 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-indigo-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Executive Menu Pro Tip:</span>
              </div>
              <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                Dishes with high-resolution food photography receive up to <strong>35% more customer selections</strong> on digital QR menus!
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* ── 3. Sticky Bottom Action Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-3 px-6 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            {isFormValid ? (
              <span className="text-emerald-700 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Ready to publish "{formData.name}" ({currencySymbol}{formData.price})
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Please fill in required Name and Price fields to publish
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-9 px-5 rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
            >
              Discard Changes
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || isUploading}
              className="h-9 px-7 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{item ? 'Save Changes' : 'Publish Dish to Menu'}</span>
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
