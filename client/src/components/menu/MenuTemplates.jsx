import { useState } from 'react'
import { 
  Copy, 
  Store, 
  Coffee, 
  Pizza, 
  Utensils, 
  Sparkles, 
  Check, 
  X, 
  ChevronRight, 
  Flame, 
  Layers,
  ChefHat
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const menuTemplates = {
  restaurant: {
    id: 'restaurant',
    name: 'Full Dine-In Restaurant',
    tagline: 'Multi-Cuisine & Family Dining',
    icon: Store,
    accentColor: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    badge: 'Popular',
    description: 'Complete multi-course catalog with starters, charcoal tandoor, main course gravies, breads & desserts.',
    categories: ['Starters', 'Main Course', 'Breads & Rice', 'Desserts', 'Beverages'],
    sampleItems: [
      { name: 'Crispy Kurkure Paneer', category: 'Starters', price: 240, type: 'VEG', description: 'Crunchy golden cottage cheese fingers with mint dip' },
      { name: 'Dal Makhani Bukhara', category: 'Main Course', price: 280, type: 'VEG', description: 'Slow-cooked overnight black lentils with churned butter' },
      { name: 'Butter Chicken Roast', category: 'Main Course', price: 380, type: 'NON_VEG', description: 'Tender chicken simmered in rich creamy tomato gravy' },
      { name: 'Garlic Butter Naan', category: 'Breads & Rice', price: 65, type: 'VEG', description: 'Freshly baked tandoori bread with garlic butter' },
      { name: 'Sizzling Brownie & Ice Cream', category: 'Desserts', price: 180, type: 'VEG', description: 'Warm fudge brownie topped with vanilla ice cream' }
    ]
  },
  cafe: {
    id: 'cafe',
    name: 'Artisan Cafe & Roastery',
    tagline: 'Coffee, Pastries & Sandwiches',
    icon: Coffee,
    accentColor: 'from-blue-600 to-indigo-700',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
    badge: 'Trending',
    description: 'Craft espresso beverages, sourdough gourmet sandwiches, baked croissants and chilled coolers.',
    categories: ['Specialty Coffee', 'Gourmet Sandwiches', 'Bakery & Pastries', 'Coolers'],
    sampleItems: [
      { name: 'Hazelnut Cappuccino', category: 'Specialty Coffee', price: 160, type: 'VEG', description: 'Double espresso with textured milk & roasted hazelnut' },
      { name: 'Grilled Pesto Panini', category: 'Gourmet Sandwiches', price: 220, type: 'VEG', description: 'Herb pesto, fresh mozzarella & sun-dried tomatoes' },
      { name: 'Smoked Chicken Bagel', category: 'Gourmet Sandwiches', price: 260, type: 'NON_VEG', description: 'Toasted bagel with cream cheese & smoked chicken' },
      { name: 'Butter Croissant', category: 'Bakery & Pastries', price: 110, type: 'VEG', description: 'Flaky French layered pastry baked fresh daily' },
      { name: 'Peach Passion Iced Tea', category: 'Coolers', price: 140, type: 'VEG', description: 'Brewed black tea with peach puree & fresh mint' }
    ]
  },
  pizzeria: {
    id: 'pizzeria',
    name: 'Italian Pizzeria & Bistro',
    tagline: 'Woodfired Pizzas & Pastas',
    icon: Pizza,
    accentColor: 'from-rose-500 to-red-700',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
    badge: 'Classic',
    description: 'Neapolitan wood-fired pizzas, artisanal pasta sauces, stuffed cheesy garlic breads and tiramisu.',
    categories: ['Woodfired Pizza', 'Pasta', 'Starters', 'Beverages'],
    sampleItems: [
      { name: 'Margherita Con Bufala', category: 'Woodfired Pizza', price: 290, type: 'VEG', description: 'San Marzano tomato sauce, fresh buffalo mozzarella & basil' },
      { name: 'Spicy Pepperoni Diablo', category: 'Woodfired Pizza', price: 390, type: 'NON_VEG', description: 'Italian cured pepperoni, jalapenos & hot honey drizzle' },
      { name: 'Creamy Fettuccine Alfredo', category: 'Pasta', price: 320, type: 'VEG', description: 'Handcrafted pasta in rich parmesan cream sauce' },
      { name: 'Cheesy Garlic Pull-Apart', category: 'Starters', price: 180, type: 'VEG', description: 'Herb butter baguette stuffed with melted mozzarella' },
      { name: 'Italian Sparkling Lemonade', category: 'Beverages', price: 120, type: 'VEG', description: 'Fizzy Sicilian lemon cooler with rosemary' }
    ]
  },
  quickService: {
    id: 'quickService',
    name: 'Gourmet QSR & Burgers',
    tagline: 'Fast Food, Loaded Wraps & Shakes',
    icon: Utensils,
    accentColor: 'from-emerald-500 to-teal-700',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    badge: 'High Speed',
    description: 'Fast-paced street food format with smash burgers, loaded fries, spiced wraps and thick shakes.',
    categories: ['Smash Burgers', 'Loaded Wraps', 'Sides & Fries', 'Thick Shakes'],
    sampleItems: [
      { name: 'Crunchy Zinger Burger', category: 'Smash Burgers', price: 190, type: 'NON_VEG', description: 'Crispy fried chicken breast, chipotle mayo & slaw' },
      { name: 'Tandoori Paneer Roll', category: 'Loaded Wraps', price: 160, type: 'VEG', description: 'Charred paneer cubes in roomali roti with mint chutney' },
      { name: 'Peri-Peri Loaded Fries', category: 'Sides & Fries', price: 140, type: 'VEG', description: 'Crisp potato fries dusted with African peri-peri spice' },
      { name: 'Belgian Chocolate Shake', category: 'Thick Shakes', price: 160, type: 'VEG', description: 'Thick blended ice cream shake with chocolate shavings' },
      { name: 'Chilled Cold Coffee', category: 'Thick Shakes', price: 120, type: 'VEG', description: 'Creamy iced coffee topped with cocoa powder' }
    ]
  }
}

export default function MenuTemplates({ restaurantId, onApplyTemplate, currentItemsCount = 0, showLabel = true }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('restaurant')
  const [isApplying, setIsApplying] = useState(false)

  const activeTemplate = menuTemplates[selectedTemplateKey] || menuTemplates.restaurant

  const handleApply = (templateKey) => {
    const key = templateKey || selectedTemplateKey
    const template = menuTemplates[key]
    if (!template) return

    setIsApplying(true)
    try {
      const items = template.sampleItems.map((item, index) => ({
        _id: `tpl_${Date.now()}_${index}`,
        id: `tpl_${Date.now()}_${index}`,
        restaurantId: restaurantId,
        name: item.name,
        description: item.description || `Freshly prepared ${item.name.toLowerCase()} from our kitchen.`,
        price: Number(item.price),
        category: item.category,
        type: item.type,
        isInStock: true,
        in_stock: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      onApplyTemplate(items, template.categories)
      toast.success(`🎉 "${template.name}" template applied successfully!`, {
        description: `Added ${items.length} curated dishes across ${template.categories.length} categories.`
      })
      setIsOpen(false)
    } catch (err) {
      console.error('Template application failed:', err)
      toast.error('Failed to apply menu template')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="tooltip-wrapper inline-block">
          {!showLabel ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-slate-100 rounded-xl cursor-pointer">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-semibold">Menu Templates Studio</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8.5 rounded-xl bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Menu Templates</span>
            </Button>
          )}
        </div>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-5xl! w-[94vw] max-h-[90vh] h-[85vh] p-0 overflow-hidden rounded-3xl border-slate-200/90 shadow-2xl bg-[#f8fafc] flex flex-col font-['Roboto',sans-serif]">
        
        {/* ── 1. Executive Studio Header ── */}
        <div className="bg-slate-950 text-white px-6 py-4.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white">
                  Menu Templates & Starter Kits
                </DialogTitle>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-bold py-0.5 px-2">
                  Enterprise Catalog
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Apply pre-built, industry-standard dish blueprints tailored for your restaurant format.
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

        {/* ── 2. Information Context Banner ── */}
        {currentItemsCount > 0 && (
          <div className="px-6 py-2.5 bg-indigo-50/90 border-b border-indigo-100/90 flex items-center justify-between text-xs text-indigo-950 shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0"></span>
              <span>
                You currently have <strong>{currentItemsCount} active dishes</strong> in your menu. Applying a template will seamlessly append these sample items without overwriting existing data.
              </span>
            </div>
            <span className="font-extrabold text-[11px] text-indigo-700 bg-white/80 border border-indigo-200 px-2 py-0.5 rounded-md shrink-0 ml-2">
              Non-Destructive Import
            </span>
          </div>
        )}

        {/* ── 3. Main Templates Grid (Spacious & Interactive) ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
            {Object.entries(menuTemplates).map(([key, template]) => {
              const Icon = template.icon
              const isSelected = selectedTemplateKey === key
              return (
                <div
                  key={key}
                  onClick={() => setSelectedTemplateKey(key)}
                  className={`relative rounded-2xl border-2 transition-all duration-200 flex flex-col bg-white overflow-hidden cursor-pointer shadow-xs hover:shadow-md ${
                    isSelected 
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 scale-[1.01]' 
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Top Category Accent Line */}
                  <div className={`h-1.5 w-full bg-linear-to-r ${template.accentColor}`} />

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Badge & Icon Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${template.iconBg}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-extrabold text-[10px] py-0.5 px-2">
                          {template.badge}
                        </Badge>
                      </div>

                      {/* Title & Tagline */}
                      <h4 className="font-black text-sm text-slate-900 tracking-tight">{template.name}</h4>
                      <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">{template.tagline}</p>
                      <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>

                      {/* Categories Chips */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Included Categories ({template.categories.length})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {template.categories.map((cat) => (
                            <span 
                              key={cat} 
                              className="text-[10px] font-bold bg-slate-100/80 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200/60"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Sample Items List */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                          Curated Items ({template.sampleItems.length})
                        </span>
                        {template.sampleItems.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="p-1.5 rounded-lg bg-slate-50/80 border border-slate-200/60 flex items-center justify-between gap-1.5 text-[11px]"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'VEG' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span className="font-semibold text-slate-800 truncate text-[11px]">{item.name}</span>
                            </div>
                            <span className="font-extrabold text-slate-950 text-[11px] shrink-0">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Apply Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApply(key)
                        }}
                        disabled={isApplying}
                        className={`w-full h-8.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                            : 'bg-slate-900 hover:bg-black text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply Template (+{template.sampleItems.length})</span>
                      </Button>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 4. Bottom Sticky Footer ── */}
        <div className="px-6 py-3 bg-white border-t border-slate-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Selected: <strong>{activeTemplate.name}</strong> ({activeTemplate.sampleItems.length} dishes)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="h-8.5 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={() => handleApply(selectedTemplateKey)}
              disabled={isApplying}
              className="h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 shadow-sm shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Apply {activeTemplate.name}</span>
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
