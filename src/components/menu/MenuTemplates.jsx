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
    categories: ['Starters', 'Main Course', 'Desserts', 'Beverages'],
    sampleItems: [
      { name: 'Soup of the Day', category: 'Starters', price: 120, type: 'VEG' },
      { name: 'Grilled Chicken', category: 'Main Course', price: 350, type: 'NON_VEG' },
      { name: 'Pasta Alfredo', category: 'Main Course', price: 280, type: 'VEG' },
      { name: 'Chocolate Cake', category: 'Desserts', price: 150, type: 'VEG' },
      { name: 'Fresh Juice', category: 'Beverages', price: 80, type: 'VEG' }
    ]
  },
  cafe: {
    name: 'Cafe',
    icon: Coffee,
    categories: ['Coffee', 'Sandwiches', 'Pastries', 'Beverages'],
    sampleItems: [
      { name: 'Cappuccino', category: 'Coffee', price: 120, type: 'VEG' },
      { name: 'Club Sandwich', category: 'Sandwiches', price: 180, type: 'NON_VEG' },
      { name: 'Croissant', category: 'Pastries', price: 60, type: 'VEG' },
      { name: 'Iced Tea', category: 'Beverages', price: 80, type: 'VEG' }
    ]
  },
  pizzeria: {
    name: 'Pizzeria',
    icon: Pizza,
    categories: ['Pizza', 'Starters', 'Beverages', 'Desserts'],
    sampleItems: [
      { name: 'Margherita Pizza', category: 'Pizza', price: 250, type: 'VEG' },
      { name: 'Pepperoni Pizza', category: 'Pizza', price: 320, type: 'NON_VEG' },
      { name: 'Garlic Bread', category: 'Starters', price: 120, type: 'VEG' },
      { name: 'Soft Drink', category: 'Beverages', price: 60, type: 'VEG' }
    ]
  },
  quickService: {
    name: 'Quick Service',
    icon: Utensils,
    categories: ['Burgers', 'Wraps', 'Sides', 'Beverages'],
    sampleItems: [
      { name: 'Classic Burger', category: 'Burgers', price: 150, type: 'NON_VEG' },
      { name: 'Veg Wrap', category: 'Wraps', price: 120, type: 'VEG' },
      { name: 'French Fries', category: 'Sides', price: 80, type: 'VEG' },
      { name: 'Soda', category: 'Beverages', price: 40, type: 'VEG' }
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
        <Button variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Menu Templates</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {currentItemsCount > 0 && (
            <Alert>
              <AlertDescription>
                You currently have {currentItemsCount} menu items. Applying a template will add these sample items to your existing menu.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(menuTemplates).map(([key, template]) => {
              const Icon = template.icon
              return (
                <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Categories:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.categories.map(cat => (
                            <Badge key={cat} variant="secondary" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Sample Items ({template.sampleItems.length}):</p>
                        <div className="space-y-1">
                          {template.sampleItems.slice(0, 3).map(item => (
                            <div key={item.name} className="flex justify-between text-xs">
                              <span>{item.name}</span>
                              <span className="text-gray-500">₹{item.price}</span>
                            </div>
                          ))}
                          {template.sampleItems.length > 3 && (
                            <p className="text-xs text-gray-500">...and {template.sampleItems.length - 3} more</p>
                          )}
                        </div>
                      </div>

                      <Button 
                        onClick={() => applyTemplate(key)}
                        className="w-full mt-3"
                        size="sm"
                      >
                        <Copy className="w-4 h-4 mr-2" />
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
