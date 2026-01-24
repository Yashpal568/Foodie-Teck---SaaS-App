import { useState } from 'react'
import { QrCode, Download, Plus, Table, Smartphone, Scan, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

// QR Code generator using QRServer API
const generateQRCode = async (restaurantId, tableNumber) => {
  const url = `http://localhost:5173/menu?restaurant=${restaurantId}&table=${tableNumber}`
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&format=jpeg&margin=20&color=000000&bgcolor=FFFFFF`
  
  try {
    const response = await fetch(qrApiUrl)
    if (!response.ok) throw new Error('Failed to generate QR code')
    
    const blob = await response.blob()
    const qrImageUrl = URL.createObjectURL(blob)
    
    return {
      url,
      qrImageUrl,
      qrBlob: blob,
      tableNumber,
      restaurantId
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    // Fallback to placeholder
    return {
      url,
      qrImageUrl: null,
      qrBlob: null,
      tableNumber,
      restaurantId
    }
  }
}

export default function QRCodeManagement() {
  const [tableCount, setTableCount] = useState(10)
  const [qrCodes, setQrCodes] = useState([])
  const [restaurantId, setRestaurantId] = useState('restaurant-123')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('generate')

  const generateAllQRCodes = async () => {
    setIsGenerating(true)
    try {
      const codes = []
      for (let i = 1; i <= tableCount; i++) {
        const qrCode = await generateQRCode(restaurantId, i)
        codes.push(qrCode)
      }
      setQrCodes(codes)
    } catch (error) {
      console.error('Error generating QR codes:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQRCode = (qrCode) => {
    if (!qrCode.qrBlob) {
      alert('QR code not available for download')
      return
    }
    
    const url = URL.createObjectURL(qrCode.qrBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-table-${qrCode.tableNumber}-${restaurantId}.jpeg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAllQRCodes = async () => {
    if (qrCodes.length === 0) return
    
    setIsGenerating(true)
    try {
      for (const qrCode of qrCodes) {
        downloadQRCode(qrCode)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (error) {
      console.error('Error downloading QR codes:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">QR Code Management</h1>
            <p className="text-gray-600">Generate QR codes for your restaurant tables</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            {qrCodes.length} Generated
          </Badge>
          {qrCodes.length > 0 && (
            <Button onClick={downloadAllQRCodes} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Table className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{tableCount}</p>
                <p className="text-sm text-gray-600">Total Tables</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{qrCodes.length}</p>
                <p className="text-sm text-gray-600">QR Codes Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{qrCodes.length > 0 ? 'Ready' : 'Pending'}</p>
                <p className="text-sm text-gray-600">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate QR Codes</TabsTrigger>
          <TabsTrigger value="manage" disabled={qrCodes.length === 0}>
            Manage QR Codes {qrCodes.length > 0 && `(${qrCodes.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-600" />
                QR Code Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="restaurantId" className="text-sm font-medium">Restaurant ID</Label>
                  <Input
                    id="restaurantId"
                    value={restaurantId}
                    onChange={(e) => setRestaurantId(e.target.value)}
                    placeholder="Enter your restaurant ID"
                    disabled={isGenerating}
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500">This ID will be used in the QR code URLs</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tableCount" className="text-sm font-medium">Number of Tables</Label>
                  <Input
                    id="tableCount"
                    type="number"
                    min="1"
                    max="100"
                    value={tableCount}
                    onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
                    disabled={isGenerating}
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500">Generate QR codes for this many tables</p>
                </div>
              </div>
              
              <Separator />
              
              <Button 
                onClick={generateAllQRCodes} 
                className="w-full h-12"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full mr-2"></div>
                    Generating QR Codes...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Codes for {tableCount} Tables
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                How to Use QR Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Generate QR Codes</p>
                      <p className="text-sm text-gray-600">Enter your restaurant ID and number of tables</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Download & Print</p>
                      <p className="text-sm text-gray-600">Download JPEG files and print them</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Place on Tables</p>
                      <p className="text-sm text-gray-600">Put QR codes on each table</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600">4</span>
                    </div>
                    <div>
                      <p className="font-medium">Customers Scan</p>
                      <p className="text-sm text-gray-600">Customers scan to view your menu</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {/* Generated QR Codes */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Generated QR Codes ({qrCodes.length})
                </CardTitle>
                <Button onClick={downloadAllQRCodes} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription className="flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  Each QR code will open your menu with the correct table number when scanned by customers.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
                {qrCodes.map((qrCode) => (
                  <Card key={qrCode.tableNumber} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="text-center space-y-4">
                        <div className="w-40 h-40 bg-gray-50 rounded-lg mx-auto flex items-center justify-center overflow-hidden border-2 border-gray-200">
                          {qrCode.qrImageUrl ? (
                            <img 
                              src={qrCode.qrImageUrl} 
                              alt={`QR Code for Table ${qrCode.tableNumber}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-center">
                              <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">QR Code</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              Table {qrCode.tableNumber}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-gray-500 space-y-1">
                            <p className="truncate">{qrCode.url}</p>
                            <p>Restaurant: {qrCode.restaurantId}</p>
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadQRCode(qrCode)}
                          className="w-full"
                          disabled={!qrCode.qrBlob}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download JPEG
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
