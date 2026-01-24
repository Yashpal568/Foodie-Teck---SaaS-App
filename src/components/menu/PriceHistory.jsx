import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Calendar, DollarSign, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

// Load price history from localStorage
const loadPriceHistory = () => {
  try {
    const saved = localStorage.getItem('priceHistory')
    if (saved) {
      return JSON.parse(saved)
    }
    
    // Return sample data for testing if no saved data
    return {
      '1': {
        itemName: 'Butter Chicken',
        changes: [
          {
            date: new Date('2024-01-20').toISOString(),
            oldPrice: 200,
            newPrice: 250,
            change: 50,
            changePercent: '25.00'
          }
        ]
      },
      '2': {
        itemName: 'Paneer Tikka',
        changes: [
          {
            date: new Date('2024-01-15').toISOString(),
            oldPrice: 150,
            newPrice: 180,
            change: 30,
            changePercent: '20.00'
          }
        ]
      }
    }
  } catch (error) {
    console.error('Error loading price history:', error)
    return {}
  }
}

// Save price history to localStorage
const savePriceHistory = (history) => {
  try {
    localStorage.setItem('priceHistory', JSON.stringify(history))
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // If quota exceeded, try to clear old data and save again
      console.warn('LocalStorage quota exceeded for price history, clearing old data...')
      try {
        // Clear any old data that might be taking up space
        const keys = Object.keys(localStorage)
        for (const key of keys) {
          if (key.startsWith('temp_') || key.startsWith('image_')) {
            localStorage.removeItem(key)
          }
        }
        // Try saving again
        localStorage.setItem('priceHistory', JSON.stringify(history))
      } catch (retryError) {
        console.error('Still unable to save price history to localStorage:', retryError)
        // Fallback: show error to user but don't crash
        alert('Storage quota exceeded. Please clear some data or try again later.')
      }
    } else {
      console.error('Error saving price history:', error)
    }
  }
}

// Record price change
export const recordPriceChange = (itemId, itemName, oldPrice, newPrice) => {
  const history = loadPriceHistory()
  if (!history[itemId]) {
    history[itemId] = { itemName, changes: [] }
  }
  
  history[itemId].changes.unshift({
    date: new Date().toISOString(),
    oldPrice,
    newPrice,
    change: newPrice - oldPrice,
    changePercent: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2)
  })
  
  // Keep only last 10 changes per item
  if (history[itemId].changes.length > 10) {
    history[itemId].changes = history[itemId].changes.slice(0, 10)
  }
  
  savePriceHistory(history)
}

export default function PriceHistory({ menuItems }) {
  const [isOpen, setIsOpen] = useState(false)
  const [priceHistory, setPriceHistory] = useState({})

  useEffect(() => {
    setPriceHistory(loadPriceHistory())
  }, [])

  const getItemHistory = (itemId) => {
    return priceHistory[itemId] || { itemName: '', changes: [] }
  }

  const getOverallStats = () => {
    let totalIncreases = 0
    let totalDecreases = 0
    let totalItems = 0

    Object.values(priceHistory).forEach(item => {
      if (item.changes.length > 0) {
        totalItems++
        const latestChange = item.changes[0]
        if (latestChange.change > 0) totalIncreases++
        else if (latestChange.change < 0) totalDecreases++
      }
    })

    return { totalIncreases, totalDecreases, totalItems }
  }

  const stats = getOverallStats()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50 border-gray-200">
          <TrendingUp className="w-4 h-4 mr-2" />
          Price History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-blue-600" />
            Price History & Analytics
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                    <p className="text-sm text-gray-600">Items Tracked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.totalIncreases}</p>
                    <p className="text-sm text-gray-600">Price Increases</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.totalDecreases}</p>
                    <p className="text-sm text-gray-600">Price Decreases</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {Object.values(priceHistory).reduce((sum, item) => sum + item.changes.length, 0)}
                    </p>
                    <p className="text-sm text-gray-600">Total Changes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Price History Table */}
          <Card className="shadow-sm border flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Price Changes</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Item Name</TableHead>
                    <TableHead className="w-[15%]">Old Price</TableHead>
                    <TableHead className="w-[15%]">New Price</TableHead>
                    <TableHead className="w-[20%]">Change</TableHead>
                    <TableHead className="w-[25%]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(priceHistory)
                    .filter(([_, data]) => data.changes.length > 0)
                    .sort(([_, a], [__, b]) => new Date(b.changes[0].date) - new Date(a.changes[0].date))
                    .slice(0, 10)
                    .map(([itemId, data]) => (
                      data.changes.map((change, index) => (
                        <TableRow key={`${itemId}-${index}`} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{data.itemName}</TableCell>
                          <TableCell className="text-gray-700">₹{change.oldPrice}</TableCell>
                          <TableCell className="text-gray-900 font-medium">₹{change.newPrice}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={change.change > 0 ? "destructive" : "default"}
                              className={change.change > 0 ? "bg-red-100 text-red-800 border-red-200" : "bg-green-100 text-green-800 border-green-200"}
                            >
                              {change.change > 0 ? '+' : ''}₹{Math.abs(change.change)} ({change.changePercent}%)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(change.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                    ))}
                </TableBody>
              </Table>
              
              {Object.keys(priceHistory).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <TrendingUp className="w-12 h-12 text-gray-300" />
                    <p className="text-lg font-medium">No price history available yet</p>
                    <p className="text-sm">Price changes will be tracked automatically when you modify menu item prices</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
