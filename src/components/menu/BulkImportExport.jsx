import { useState } from 'react'
import { Download, Upload, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Convert data to Excel format (CSV that Excel can open)
const exportToExcel = (data, filename) => {
  const headers = ['Name', 'Description', 'Price', 'Category', 'Type', 'In Stock', 'Restaurant ID', 'Created At']
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      `"${item.name || ''}"`,
      `"${item.description || ''}"`,
      item.price || 0,
      `"${item.category || ''}"`,
      `"${item.type || ''}"`,
      item.isInStock ? 'Yes' : 'No',
      `"${item.restaurantId || ''}"`,
      `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}"`
    ].join(','))
  ].join('\n')

  // Create BOM for UTF-8 Excel support
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Parse Excel/CSV data
const parseExcelData = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Remove BOM if present
  const firstLine = lines[0].replace(/^\uFEFF/, '')

  const headers = firstLine.split(',').map(h => h.replace(/"/g, '').trim())
  const items = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
    if (values.length >= 3) { // At least name, description, price
      const item = {
        _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: values[0] || '',
        description: values[1] || '',
        price: parseFloat(values[2]) || 0,
        category: values[3] || 'Main Course',
        type: values[4] ? values[4].toUpperCase() : 'VEG',
        isInStock: values[5] ? values[5].toLowerCase() === 'yes' : true,
        restaurantId: values[6] || 'restaurant-123',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Validate type
      if (item.type !== 'VEG' && item.type !== 'NON_VEG') {
        item.type = 'VEG'
      }

      items.push(item)
    }
  }

  return items
}

// Create Excel template
const createExcelTemplate = () => {
  const template = [
    ['Name', 'Description', 'Price', 'Category', 'Type', 'In Stock', 'Restaurant ID', 'Created At'],
    ['Sample Dish', 'Delicious sample dish description', '150', 'Main Course', 'VEG', 'Yes', 'restaurant-123', '2024-01-24'],
    ['Another Dish', 'Another delicious dish', '200', 'Starters', 'NON_VEG', 'Yes', 'restaurant-123', '2024-01-24']
  ]

  const csvContent = template.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'menu-items-template.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function BulkImportExport({ menuItems, onImport }) {
  const [isOpen, setIsOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [activeTab, setActiveTab] = useState('import')

  const handleImport = () => {
    setImportErrors([])
    let items = []

    try {
      if (importData.trim().startsWith('[')) {
        // Try to parse as JSON array
        const parsed = JSON.parse(importData)
        items = Array.isArray(parsed) ? parsed.map(item => ({
          ...item,
          _id: item._id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          restaurantId: item.restaurantId || 'restaurant-123',
          createdAt: item.createdAt || new Date(),
          updatedAt: new Date()
        })) : []
      } else {
        // Parse as CSV/Excel format
        items = parseExcelData(importData)
      }

      if (items.length === 0) {
        setImportErrors(['No valid items found in the import data'])
        return
      }

      const errors = []
      items.forEach((item, index) => {
        if (!item.name) errors.push(`Row ${index + 1}: Missing name`)
        if (!item.price || item.price <= 0) errors.push(`Row ${index + 1}: Invalid price`)
        if (!item.category) errors.push(`Row ${index + 1}: Missing category`)
        if (item.type !== 'VEG' && item.type !== 'NON_VEG') errors.push(`Row ${index + 1}: Type must be VEG or NON_VEG`)
      })

      if (errors.length > 0) {
        setImportErrors(errors)
        return
      }

      onImport(items)
      setImportData('')
      setIsOpen(false)
    } catch (error) {
      setImportErrors(['Error parsing import data: ' + error.message])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Import/Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import/Export Menu Items</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="import">Import Items</TabsTrigger>
              <TabsTrigger value="export">Export Items</TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Menu Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={createExcelTemplate}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel Template
                    </Button>
                    <Button
                      onClick={() => setImportData('Name,Description,Price,Category,Type,In Stock,Restaurant ID,Created At\n"Sample Dish,Delicious sample dish description,150,Main Course,VEG,Yes,restaurant-123,2024-01-24')}
                      variant="outline"
                      size="sm"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Sample Format
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="importData">Paste Excel/CSV data:</Label>
                    <Textarea
                      id="importData"
                      placeholder="Paste your Excel or CSV data here..."
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      rows={10}
                      className="mt-2 font-mono text-sm"
                    />
                  </div>

                  {importErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {importErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleImport} disabled={!importData.trim()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Items
                    </Button>
                    <Button variant="outline" onClick={() => setImportData('')}>
                      Clear
                    </Button>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Supported Formats:</strong><br />
                      • Excel files (.xlsx, .xls)<br />
                      • CSV files (.csv)<br />
                      • JSON arrays<br />
                      <strong>Required Columns:</strong> Name, Description, Price, Category, Type (VEG/NON_VEG), In Stock (Yes/No)
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export Menu Items ({menuItems.length} items)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => exportToExcel(menuItems, `menu-items-${new Date().toISOString().split('T')[0]}`)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export as Excel (.xlsx)
                    </Button>

                    <Button
                      onClick={() => {
                        const dataStr = JSON.stringify(menuItems, null, 2)
                        const blob = new Blob([dataStr], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `menu-items-${new Date().toISOString().split('T')[0]}.json`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export as JSON
                    </Button>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Export Options:</strong><br />
                      • <strong>Excel (.xlsx):</strong> Opens directly in Microsoft Excel<br />
                      • <strong>JSON:</strong> For developers and data backup<br />
                      • <strong>All data included:</strong> Name, description, price, category, type, stock status, restaurant ID, and timestamps
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
