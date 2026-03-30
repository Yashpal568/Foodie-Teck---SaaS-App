import { useState, useEffect } from 'react'
import { QrCode, Download, Plus, Table, Smartphone, Scan, CheckCircle, AlertCircle, RefreshCw, Menu, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Sidebar from '../layout/Sidebar'
import Logo from '@/components/ui/Logo'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import { getCachedRestaurantId, getMyRestaurant, bulkSaveQRCodes } from '@/lib/api'

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
  const url = `${window.location.origin}/menu?restaurant=${restaurantId}&table=${tableNumber}`
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&format=jpeg&margin=20&color=000000&bgcolor=FFFFFF`
  
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

export default function QRCodeManagement({ activeItem, setActiveItem, navigate, plan }) {
  const tableLimit = plan?.name === 'Enterprise' ? 1000 : plan?.name === 'Professional' ? 30 : 10
  const user = JSON.parse(localStorage.getItem('servora_user') || '{}')
  const [restaurantId, setRestaurantId] = useState(getCachedRestaurantId())
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle')

  // Initial ID Fixer: If we only have an email, go get the UUID
  useEffect(() => {
    const repairSession = async () => {
      if (!restaurantId || restaurantId.includes('@')) {
        console.log('Detected legacy ID (email). Fetching UUID...')
        const profile = await getMyRestaurant()
        if (profile) {
          setRestaurantId(profile.id)
          // Update session for the whole app
          localStorage.setItem('servora_user', JSON.stringify({ ...user, restaurantId: profile.id }))
        }
      }
    }
    repairSession()
  }, [])

  const [tableCount, setTableCount] = useState(tableLimit > 10 ? 10 : tableLimit)
  const [qrCodes, setQrCodes] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('generate')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      // Emit event to notify TableSessions component
      window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { qrCodes } }))
    } else {
      // Also emit event when QR codes are cleared
      window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { qrCodes: [] } }))
    }
  }, [qrCodes, restaurantId])

  const handleSyncToCloud = async (codesToSync = qrCodes) => {
    if (!restaurantId || codesToSync.length === 0) return
    setIsSyncing(true)
    setSyncStatus('syncing')
    try {
      await bulkSaveQRCodes(restaurantId, codesToSync)
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 3000)
    } catch (error) {
      console.error('Cloud Sync Error:', error)
      setSyncStatus('idle')
      if (error.code === '42501' || error.status === 403) {
        alert('CRITICAL: Supabase RLS Violation! Your "qr_codes" table is locked. Please enable "INSERT" and "UPDATE" permissions for researchers/owners in your Supabase dashboard SQL Editor.')
      } else {
        alert(`Cloud Sync Failed: ${error.message || 'Check connection'}`)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const generateAllQRCodes = async () => {
    if (tableCount > tableLimit) {
      alert(`Your current plan only supports up to ${tableLimit} tables.`)
      return
    }
    setIsGenerating(true)
    try {
      const codes = []
      for (let i = 1; i <= tableCount; i++) {
        const qrCode = await generateQRCode(restaurantId || user.email, i)
        codes.push(qrCode)
      }
      setQrCodes(codes)
      
      // SYNC TO CLOUD IMMEDIATELY
      await handleSyncToCloud(codes)
      
      console.log('Generated and Synced QR codes:', codes.length, 'codes')
      // Emit event to notify TableSessions component
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { qrCodes: codes } }))
      }, 100)
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
      // Emit event to notify TableSessions component
      window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { qrCodes: [] } }))
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile Navbar */}
      <div className="lg:hidden sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-xl">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-none">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Access all dashboard sections</SheetDescription>
              <Sidebar 
                activeItem={activeItem} 
                setActiveItem={(item) => {
                  setActiveItem(item)
                  setMobileMenuOpen(false)
                }} 
                isCollapsed={false}
                setIsCollapsed={() => {}}
                isMobile={true}
                restaurantId={restaurantId}
              />
            </SheetContent>
          </Sheet>
          <Logo subtitle="QR Codes" />
        </div>
        <div className="flex items-center gap-1">
          <NotificationDropdown restaurantId={restaurantId} />
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center ml-1">
            <span className="text-[10px] font-bold text-blue-700">JD</span>
          </div>
        </div>
      </div>

      {/* Desktop Section Header */}
      <div className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Header Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600 uppercase tracking-[0.2em] mb-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>Digital Access</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-none">
                QR Code Management
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-1.5 max-w-sm">
                Generate and manage QR codes for your restaurant tables.
              </p>
            </div>

            {/* Action Tools */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <Badge 
                variant="outline" 
                className={`h-9 px-3 text-xs font-semibold transition-all ${syncStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-purple-700 border-purple-200 bg-purple-50/50'}`}
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                ) : syncStatus === 'success' ? (
                  <CheckCircle className="w-3 h-3 mr-2" />
                ) : (
                  <QrCode className="w-3.5 h-3.5 mr-2" />
                )}
                {isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Cloud Verified' : `${qrCodes.length} Generated`}
              </Badge>
              {qrCodes.length > 0 && (
                <>
                  <Button 
                    onClick={() => handleSyncToCloud()} 
                    variant="outline" 
                    size="sm" 
                    disabled={isSyncing}
                    className="h-9 px-3 rounded-xl bg-gray-50/50 hover:bg-white ring-1 ring-inset ring-gray-100 transition-all font-bold text-[10px] uppercase tracking-wider"
                  >
                    <Cloud className="w-3.5 h-3.5 mr-2" />
                    Force Sync
                  </Button>
                  <Button onClick={downloadAllQRCodes} variant="outline" size="sm" className="h-9 px-3 rounded-xl bg-gray-50/50 hover:bg-white ring-1 ring-inset ring-gray-100 transition-all">
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                  <Button onClick={clearQRCodes} size="sm" className="h-9 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all font-semibold">
                    Clear All
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-32 lg:pb-8">

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
                    readOnly
                    placeholder="Enter your restaurant ID"
                    disabled={isGenerating}
                    className="h-11 bg-slate-50 text-slate-500 font-bold border-dashed cursor-not-allowed uppercase tracking-widest text-[10px]"
                  />
                  <p className="text-xs text-gray-500">This ID will be used in the QR code URLs</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tableCount" className="text-sm font-medium">Number of Tables</Label>
                  <Input
                    id="tableCount"
                    type="number"
                    min="1"
                    max={tableLimit}
                    value={tableCount}
                    onChange={(e) => setTableCount(Math.min(parseInt(e.target.value) || 1, tableLimit))}
                    disabled={isGenerating}
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500">Your current plan supports up to {tableLimit} tables.</p>
                </div>
              </div>
              
              <Separator className="my-2" />
              
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
              <Alert className="bg-blue-50/50 border-blue-100" variant="default">
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
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
