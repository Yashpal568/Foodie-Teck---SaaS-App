import { useState } from 'react'
import { QrCode, Download, Plus, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Simple QR code generator (placeholder - in production, use a proper QR library)
const generateQRCode = (restaurantId, tableNumber) => {
  const url = `https://foodie-tech.com/menu/${restaurantId}?table=${tableNumber}`
  return {
    url,
    qrData: btoa(url), // Simple encoding for demo
    tableNumber
  }
}

export default function QRCodeGenerator({ restaurantId = 'restaurant-123' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tableCount, setTableCount] = useState(10)
  const [qrCodes, setQrCodes] = useState([])
  const [selectedTable, setSelectedTable] = useState('')

  const generateAllQRCodes = () => {
    const codes = []
    for (let i = 1; i <= tableCount; i++) {
      codes.push(generateQRCode(restaurantId, i))
    }
    setQrCodes(codes)
  }

  const downloadQRCode = (qrCode) => {
    // In production, generate actual QR image
    const data = {
      restaurant: restaurantId,
      table: qrCode.tableNumber,
      url: qrCode.url,
      generatedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-table-${qrCode.tableNumber}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAllQRCodes = () => {
    const data = {
      restaurant: restaurantId,
      tables: qrCodes.map(qr => ({
        table: qr.tableNumber,
        url: qr.url,
        qrData: qr.qrData
      })),
      generatedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `all-qr-codes-${restaurantId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="w-4 h-4 mr-2" />
          QR Codes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Generate QR Codes for Tables</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">QR Code Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tableCount">Number of Tables</Label>
                  <Input
                    id="tableCount"
                    type="number"
                    min="1"
                    max="100"
                    value={tableCount}
                    onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="restaurantId">Restaurant ID</Label>
                  <Input
                    id="restaurantId"
                    value={restaurantId}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              
              <Button onClick={generateAllQRCodes} className="w-full">
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Codes for {tableCount} Tables
              </Button>
            </CardContent>
          </Card>

          {/* Generated QR Codes */}
          {qrCodes.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Generated QR Codes ({qrCodes.length})</CardTitle>
                  <Button onClick={downloadAllQRCodes} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    <strong>Note:</strong> This is a demo implementation. In production, these would be actual QR code images that customers can scan.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {qrCodes.map((qrCode) => (
                    <Card key={qrCode.tableNumber} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="text-center space-y-3">
                          <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                            <div className="text-center">
                              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">QR Code</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-medium">Table {qrCode.tableNumber}</p>
                            <p className="text-xs text-gray-500 truncate">{qrCode.url}</p>
                          </div>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => downloadQRCode(qrCode)}
                            className="w-full"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <strong>How to use QR codes:</strong><br />
              1. Generate QR codes for each table<br />
              2. Download and print the QR codes<br />
              3. Place them on each table<br />
              4. Customers scan to view your menu<br />
              5. Each QR code opens the menu with the correct table number
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}
