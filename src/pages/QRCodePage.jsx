import { useState, useEffect } from 'react'
import { QrCode, Download, Plus, Table, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNavigate } from 'react-router-dom'

// Convert blob to base64 data URL
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// QR Code generator using QRServer API
const generateQRCode = async (restaurantId, tableNumber) => {
  const url = `http://localhost:5173/menu?restaurant=${restaurantId}&table=${tableNumber}`
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&format=jpeg&margin=10`
  
  try {
    const response = await fetch(qrApiUrl)
    if (!response.ok) throw new Error('Failed to generate QR code')
    
    const blob = await response.blob()
    const qrImageUrl = URL.createObjectURL(blob)
    const qrDataUrl = await blobToBase64(blob)
    
    return {
      url,
      qrImageUrl,
      qrDataUrl, // Store base64 data URL for persistence
      qrBlob: blob,
      tableNumber,
      restaurantId,
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    // Fallback to placeholder
    return {
      url,
      qrImageUrl: null,
      qrDataUrl: null,
      qrBlob: null,
      tableNumber,
      restaurantId,
      generatedAt: new Date().toISOString()
    }
  }
}

// Save QR codes to localStorage
const saveQRCodesToStorage = (restaurantId, qrCodes) => {
  try {
    // Convert QR codes to storable format (exclude blobs, keep data URLs)
    const storableQRCodes = qrCodes.map(qr => ({
      url: qr.url,
      qrDataUrl: qr.qrDataUrl,
      tableNumber: qr.tableNumber,
      restaurantId: qr.restaurantId,
      generatedAt: qr.generatedAt
    }))
    
    const data = {
      restaurantId,
      qrCodes: storableQRCodes,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem(`qrCodes_${restaurantId}`, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving QR codes:', error)
  }
}

// Load QR codes from localStorage
const loadQRCodesFromStorage = (restaurantId) => {
  try {
    const saved = localStorage.getItem(`qrCodes_${restaurantId}`)
    if (saved) {
      const data = JSON.parse(saved)
      return data.qrCodes || []
    }
  } catch (error) {
    console.error('Error loading QR codes:', error)
  }
  return []
}

export default function QRCodePage() {
  const navigate = useNavigate()
  const [tableCount, setTableCount] = useState(10)
  const [qrCodes, setQrCodes] = useState([])
  const [restaurantId, setRestaurantId] = useState('restaurant-123')
  const [isGenerating, setIsGenerating] = useState(false)

  // Load QR codes from localStorage on component mount
  useEffect(() => {
    const savedQRCodes = loadQRCodesFromStorage(restaurantId)
    if (savedQRCodes.length > 0) {
      // Recreate blob URLs from stored data URLs
      const restoredQRCodes = savedQRCodes.map(qr => ({
        ...qr,
        qrImageUrl: qr.qrDataUrl, // Use data URL as image source
        qrBlob: null // Blob is not needed for display
      }))
      setQrCodes(restoredQRCodes)
    }
  }, [restaurantId])

  // Save QR codes to localStorage whenever they change
  useEffect(() => {
    if (qrCodes.length > 0) {
      saveQRCodesToStorage(restaurantId, qrCodes)
    }
  }, [qrCodes, restaurantId])

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

  const clearQRCodes = () => {
    setQrCodes([])
    try {
      localStorage.removeItem(`qrCodes_${restaurantId}`)
    } catch (error) {
      console.error('Error clearing QR codes:', error)
    }
  }

  const downloadQRCode = async (qrCode) => {
    try {
      console.log('Downloading QR code for table:', qrCode.tableNumber)
      
      let blob
      
      if (qrCode.qrDataUrl) {
        // Convert data URL back to blob
        const response = await fetch(qrCode.qrDataUrl)
        blob = await response.blob()
      } else if (qrCode.qrBlob) {
        // Use existing blob
        blob = qrCode.qrBlob
      } else {
        throw new Error('No QR code data available')
      }
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-table-${qrCode.tableNumber}-${qrCode.restaurantId}.jpeg`
      a.style.display = 'none'
      
      // Trigger download
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
      
      console.log('QR code downloaded successfully')
    } catch (error) {
      console.error('Error downloading QR code:', error)
      alert('Failed to download QR code. Please try again.')
    }
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
              <div className="flex gap-2">
                <Button onClick={downloadAllQRCodes} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
                <Button onClick={clearQRCodes} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  Clear All
                </Button>
              </div>
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
                        disabled={!qrCode.qrDataUrl && !qrCode.qrBlob}
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
