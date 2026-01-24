import { useState } from 'react'
import { QrCode, Download, Plus, Table, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNavigate } from 'react-router-dom'

// QR Code generator using QRServer API
const generateQRCode = async (restaurantId, tableNumber) => {
  const url = `https://foodie-tech.com/menu/${restaurantId}?table=${tableNumber}`
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&format=jpeg&margin=10`
  
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

export default function QRCodePage() {
  const navigate = useNavigate()
  const [tableCount, setTableCount] = useState(10)
  const [qrCodes, setQrCodes] = useState([])
  const [restaurantId, setRestaurantId] = useState('restaurant-123')
  const [isGenerating, setIsGenerating] = useState(false)

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
      // Create a ZIP file with all QR codes (simplified version)
      for (const qrCode of qrCodes) {
        downloadQRCode(qrCode)
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100))
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
            <Home className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">QR Code Generator</h1>
            <p className="text-gray-600">Generate QR codes for your restaurant tables</p>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code Configuration
          </CardTitle>
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
                disabled={isGenerating}
              />
            </div>
            <div>
              <Label htmlFor="restaurantId">Restaurant ID</Label>
              <Input
                id="restaurantId"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                placeholder="Enter your restaurant ID"
                disabled={isGenerating}
              />
            </div>
          </div>
          
          <Button 
            onClick={generateAllQRCodes} 
            className="w-full"
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
                <strong>QR Codes Generated:</strong> Each QR code will open your menu with the correct table number when scanned by customers.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {qrCodes.map((qrCode) => (
                <Card key={qrCode.tableNumber} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="text-center space-y-3">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto flex items-center justify-center overflow-hidden">
                        {qrCode.qrImageUrl ? (
                          <img 
                            src={qrCode.qrImageUrl} 
                            alt={`QR Code for Table ${qrCode.tableNumber}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center">
                            <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">QR Code</p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <p className="font-medium">Table {qrCode.tableNumber}</p>
                        <p className="text-xs text-gray-500 truncate">{qrCode.url}</p>
                        <p className="text-xs text-gray-400">Restaurant: {qrCode.restaurantId}</p>
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
  )
}
