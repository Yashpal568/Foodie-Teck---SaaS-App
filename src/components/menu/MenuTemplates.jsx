import { useState } from 'react'
import { Copy, Store, Coffee, Pizza, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

const menuTemplates = {
  restaurant: {
    name: 'Full Restaurant',
    icon: Store,
    description: 'Complete restaurant menu with appetizers, main courses, desserts, and beverages',
    categories: ['Starters', 'Main Course', 'Desserts', 'Beverages'],
    sampleItems: [
      { name: 'Soup of the Day', category: 'Starters', price: 120, type: 'VEG', description: 'Fresh daily soup with seasonal vegetables' },
      { name: 'Grilled Chicken', category: 'Main Course', price: 350, type: 'NON_VEG', description: 'Tender grilled chicken with herbs and spices' },
      { name: 'Pasta Alfredo', category: 'Main Course', price: 280, type: 'VEG', description: 'Classic Italian pasta with creamy Alfredo sauce' },
      { name: 'Chocolate Cake', category: 'Desserts', price: 150, type: 'VEG', description: 'Rich chocolate cake with ganache' },
      { name: 'Fresh Juice', category: 'Beverages', price: 80, type: 'VEG', description: 'Freshly squeezed fruit juice' }
    ]
  },
  cafe: {
    name: 'Cafe',
    icon: Coffee,
    description: 'Cafe essentials with coffee, sandwiches, and pastries',
    categories: ['Coffee', 'Sandwiches', 'Pastries', 'Beverages'],
    sampleItems: [
      { name: 'Cappuccino', category: 'Coffee', price: 120, type: 'VEG', description: 'Espresso with steamed milk foam' },
      { name: 'Club Sandwich', category: 'Sandwiches', price: 180, type: 'NON_VEG', description: 'Classic club sandwich with fresh vegetables' },
      { name: 'Croissant', category: 'Pastries', price: 60, type: 'VEG', description: 'Buttery French croissant' },
      { name: 'Iced Tea', category: 'Beverages', price: 80, type: 'VEG', description: 'Refreshing iced tea with lemon' }
    ]
  },
  pizzeria: {
    name: 'Pizzeria',
    icon: Pizza,
    description: 'Pizza restaurant with various toppings and sides',
    categories: ['Pizza', 'Starters', 'Beverages', 'Desserts'],
    sampleItems: [
      { name: 'Margherita Pizza', category: 'Pizza', price: 250, type: 'VEG', description: 'Classic margherita with fresh mozzarella' },
      { name: 'Pepperoni Pizza', category: 'Pizza', price: 320, type: 'NON_VEG', description: 'Spicy pepperoni with mozzarella' },
      { name: 'Garlic Bread', category: 'Starters', price: 120, type: 'VEG', description: 'Garlic bread with herbs and cheese' },
      { name: 'Soft Drink', category: 'Beverages', price: 60, type: 'VEG', description: 'Assorted soft drinks' }
    ]
  },
  quickService: {
    name: 'Quick Service',
    icon: Utensils,
    description: 'Fast food menu with burgers, wraps, and sides',
    categories: ['Burgers', 'Wraps', 'Sides', 'Beverages'],
    sampleItems: [
      { name: 'Classic Burger', category: 'Burgers', price: 150, type: 'NON_VEG', description: 'Juicy beef patty with lettuce and tomato' },
      { name: 'Veg Wrap', category: 'Wraps', price: 120, type: 'VEG', description: 'Fresh vegetables in a soft tortilla' },
      { name: 'French Fries', category: 'Sides', price: 80, type: 'VEG', description: 'Crispy golden French fries' },
      { name: 'Soda', category: 'Beverages', price: 40, type: 'VEG', description: 'Cold soda with ice' }
    ]
  }
}

export default function MenuTemplates({ onApplyTemplate, currentItemsCount }) {
  const [isOpen, setIsOpen] = useState(false)

  const applyTemplate = (templateKey) => {
    const template = menuTemplates[templateKey]
    const items = template.sampleItems.map((item, index) => ({
      _id: Date.now().toString() + index,
      restaurantId: 'restaurant-123',
      name: item.name,
      description: `Delicious ${item.name.toLowerCase()} from our ${template.name.toLowerCase()} menu`,
      price: item.price,
      photo: '',
      category: item.category,
      type: item.type,
      isInStock: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    onApplyTemplate(items, template.categories)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50 border-gray-200">
          <Copy className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full w-screen max-h-[95vh] h-[92vh] flex flex-col p-0">
        {/* Fixed Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-white flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Menu Templates
          </DialogTitle>
        </div>
        
        {/* Alert Bar */}
        {currentItemsCount > 0 && (
          <div className="px-8 py-3 bg-blue-50 border-b border-blue-200">
            <p className="text-sm text-blue-800">
              You currently have {currentItemsCount} menu items. Applying a template will add these sample items to your existing menu.
            </p>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {Object.entries(menuTemplates).map(([key, template]) => {
              const Icon = template.icon
              return (
                <Card 
                  key={key} 
                  className="group bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer h-full flex flex-col"
                >
                  <CardContent className="p-4 flex flex-col h-full">
                    {/* Icon Section */}
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Template Name */}
                    <div className="text-center mb-3">
                      <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                    </div>

                    {/* Categories */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {template.categories.map(cat => (
                          <Badge 
                            key={cat} 
                            variant="secondary" 
                            className="bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors px-2 py-0.5 text-xs"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Sample Items */}
                    <div className="flex-1">
                      <div className="text-center mb-2">
                        <p className="text-xs font-semibold text-gray-800">Sample Items ({template.sampleItems.length})</p>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {template.sampleItems.map(item => (
                          <div key={item.name} className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.description}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="text-xs font-bold text-gray-900">₹{item.price}</p>
                              <Badge 
                                variant={item.type === 'VEG' ? 'default' : 'destructive'}
                                className={item.type === 'VEG' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}
                              >
                                {item.type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Apply Button */}
                    <div className="mt-4">
                      <Button 
                        onClick={() => applyTemplate(key)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 py-2 text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Apply Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
