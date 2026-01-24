import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Load price history from localStorage
const loadPriceHistory = () => {
  try {
    const saved = localStorage.getItem('priceHistory')
    return saved ? JSON.parse(saved) : {}
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
    console.error('Error saving price history:', error)
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
  const [selectedItem, setSelectedItem] = useState(null)

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
        <Button variant="outline" size="sm">
          <TrendingUp className="w-4 h-4 mr-2" />
          Price History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Price History & Analytics</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalItems}</p>
                    <p className="text-sm text-gray-600">Items Tracked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
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
            
            <Card>
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
            
            <Card>
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

          {/* Price History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Price Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Old Price</TableHead>
                    <TableHead>New Price</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(priceHistory)
                    .filter(([_, data]) => data.changes.length > 0)
                    .sort(([_, a], [__, b]) => new Date(b.changes[0].date) - new Date(a.changes[0].date))
                    .slice(0, 10)
                    .map(([itemId, data]) => (
                      data.changes.map((change, index) => (
                        <TableRow key={`${itemId}-${index}`}>
                          <TableCell className="font-medium">{data.itemName}</TableCell>
                          <TableCell>₹{change.oldPrice}</TableCell>
                          <TableCell>₹{change.newPrice}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={change.change > 0 ? "destructive" : "default"}
                              className={change.change > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}
                            >
                              {change.change > 0 ? '+' : ''}₹{change.change} ({change.changePercent}%)
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(change.date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    ))}
                </TableBody>
              </Table>
              
              {Object.keys(priceHistory).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No price history available yet. Price changes will be tracked automatically.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
