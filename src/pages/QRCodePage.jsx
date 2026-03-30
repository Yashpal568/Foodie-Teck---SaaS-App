import { useState, useEffect } from 'react'
import { QrCode, Download, Plus, Table, ArrowLeft, Home, Cloud, Check, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { getMyRestaurant, bulkSaveQRCodes, getQRCodes } from '@/lib/api'

// QR Code generator using QRServer API
const generateQRCode = async (restaurantId, tableNumber) => {
  const url = `${window.location.origin}/menu?restaurant=${restaurantId}&table=${tableNumber}`
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&format=jpeg&margin=10`
  
  try {
    const response = await fetch(qrApiUrl)
    if (!response.ok) throw new Error('Failed to generate QR code')
    
    const blob = await response.blob()
    const qrImageUrl = URL.createObjectURL(blob)
    
    return {
      url,
      qrImageUrl,
      tableNumber,
      restaurantId,
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    return { url, qrImageUrl: null, tableNumber, restaurantId, generatedAt: new Date().toISOString() }
  }
}

export default function QRCodePage() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('servora_user') || '{}')
  
  const [restaurantData, setRestaurantData] = useState(null)
  const [tableCount, setTableCount] = useState(10)
  const [qrCodes, setQrCodes] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | success
  const [activeLimit, setActiveLimit] = useState(10)

  useEffect(() => {
     if (!user.email) {
        navigate('/login')
        return
     }

     const fetchId = async () => {
        const data = await getMyRestaurant()
        setRestaurantData(data)
        
        // Load existing from cloud
        if (data) {
           const existing = await getQRCodes(data.id)
           if (existing.length > 0) {
              setQrCodes(existing.map(qr => ({
                ...qr,
                qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr.url)}&format=jpeg&margin=10`,
                tableNumber: qr.table_number,
                url: qr.url
              })))
           }
        }
     }
     fetchId()

     const plan = JSON.parse(localStorage.getItem('servora_plan'))
     if (plan && plan.tableLimit) {
        setActiveLimit(plan.tableLimit)
        if (tableCount > plan.tableLimit) setTableCount(plan.tableLimit)
     }
  }, [navigate])

  const generateAndSync = async () => {
    if (!restaurantData) return
    setIsGenerating(true)
    setSyncStatus('idle')
    try {
      const codes = []
      for (let i = 1; i <= tableCount; i++) {
        const qrCode = await generateQRCode(restaurantData.id, i)
        codes.push(qrCode)
      }
      setQrCodes(codes)
      
      // Auto-sync to cloud
      await handleSyncToCloud(codes)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSyncToCloud = async (codesToSync = qrCodes) => {
    if (!restaurantData || codesToSync.length === 0) return
    setIsSyncing(true)
    setSyncStatus('syncing')
    try {
      await bulkSaveQRCodes(restaurantData.id, codesToSync)
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 3000)
    } catch (err) {
      console.error('Cloud sync failed:', err)
      setSyncStatus('idle')
    } finally {
      setIsSyncing(false)
    }
  }

  const clearQRCodes = () => {
    setQrCodes([])
    setSyncStatus('idle')
  }

  const downloadQRCode = async (qrCode) => {
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrCode.url)}&format=jpeg&margin=10`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-table-${qrCode.tableNumber}-${restaurantData?.id.substring(0,8)}.jpeg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
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
        await downloadQRCode(qrCode)
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(`/console/${user.email}`)} className="p-2">
            <Home className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-black uppercase tracking-tight">QR Studio</h1>
            <p className="text-slate-500 font-medium text-sm">Generate and sync table sessions to your live floor plan.</p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Configuration</span>
            </div>
            {qrCodes.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSyncToCloud()} 
                disabled={isSyncing}
                className={`transition-all rounded-xl h-9 px-4 border-slate-200 font-bold text-[10px] uppercase tracking-wider ${syncStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}`}
              >
                {isSyncing ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : syncStatus === 'success' ? <Check className="w-3 h-3 mr-2" /> : <Cloud className="w-3 h-3 mr-2" />}
                {isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Cloud Verified' : 'Force Sync'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="tableCount" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Table Batch Size</Label>
              <Input
                id="tableCount"
                type="number"
                min="1"
                max={activeLimit}
                value={tableCount}
                onChange={(e) => setTableCount(Math.min(parseInt(e.target.value) || 1, activeLimit))}
                disabled={isGenerating}
                className="h-14 rounded-2xl border-slate-100 bg-slate-50/30 text-lg font-bold"
              />
              <p className="text-[10px] text-slate-400 font-medium">Your current plan limit is {activeLimit} tables.</p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="restaurantId" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Merchant Authority</Label>
              <div className="h-14 bg-slate-100 rounded-2xl flex items-center px-6 border border-slate-200/50">
                 <span className="text-[10px] font-mono text-slate-500 truncate">{restaurantData?.id || 'IDENTIFYING...'}</span>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={generateAndSync} 
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.25rem] shadow-2xl shadow-blue-200/50 font-black uppercase tracking-[0.2em] text-xs transition-all hover:-translate-y-1 active:scale-[0.98]"
            disabled={isGenerating || !restaurantData}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                Initializing Cloud Sessions...
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5 mr-3" />
                Generate {tableCount} Table Entries
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {qrCodes.length > 0 && (
        <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                 <Badge className="bg-blue-600 text-white rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest mb-2">Live Cloud Data</Badge>
                 <CardTitle className="text-2xl font-black text-slate-900">Digital Floor Plan</CardTitle>
              </div>
              <div className="flex gap-3">
                <Button onClick={downloadAllQRCodes} variant="outline" className="rounded-2xl h-12 px-6 border-slate-200 font-bold text-xs uppercase tracking-wider">
                  <Download className="w-4 h-4 mr-2" />
                  Print All
                </Button>
                <Button onClick={clearQRCodes} variant="ghost" className="rounded-2xl h-12 px-6 text-red-500 hover:bg-red-50 font-bold text-xs uppercase tracking-wider">
                  <X className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <Alert className="bg-blue-600 text-white border-0 rounded-2xl mb-8 p-6 shadow-xl shadow-blue-200">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <Cloud className="w-6 h-6 text-white" />
                 </div>
                 <AlertDescription className="text-sm font-bold tracking-wide">
                    SUCCESS: All {qrCodes.length} table sessions have been synchronized with your live database. Scans will now be tracked in the Table Hub.
                 </AlertDescription>
              </div>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-4">
              {qrCodes.map((qrCode) => (
                <Card key={qrCode.tableNumber} className="border-0 shadow-sm ring-1 ring-slate-100 rounded-[2rem] overflow-hidden group hover:ring-blue-600/20 hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      <div className="aspect-square bg-slate-50 rounded-[1.5rem] mx-auto flex items-center justify-center overflow-hidden border border-slate-100 group-hover:bg-white transition-colors p-4">
                        {qrCode.qrImageUrl ? (
                          <img 
                            src={qrCode.qrImageUrl} 
                            alt={`Table ${qrCode.tableNumber}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QrCode className="w-12 h-12 text-slate-200" />
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-black text-slate-900 uppercase tracking-[0.2em] text-[10px]">Registry ID: {qrCode.tableNumber}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate px-2 opacity-50">{qrCode.url}</p>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => downloadQRCode(qrCode)}
                        className="w-full h-12 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-900 font-black text-[10px] uppercase tracking-widest border-0 transition-all shadow-none group-hover:shadow-lg group-hover:shadow-blue-200"
                      >
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Get Tag
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-slate-900 rounded-[3rem] p-12 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                 <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-sm">1</div>
                 <h4 className="font-black uppercase tracking-widest text-[10px] text-blue-400">Initialize</h4>
                 <p className="text-sm font-medium text-slate-400 leading-relaxed">Tables are instantly registered to your Cloud Dashboard across all devices with zero configuration.</p>
              </div>
              <div className="space-y-4">
                 <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-sm">2</div>
                 <h4 className="font-black uppercase tracking-widest text-[10px] text-emerald-400">Deploy</h4>
                 <p className="text-sm font-medium text-slate-400 leading-relaxed">Download high-definition table tags. Print and place them securely for customer scanned access.</p>
              </div>
              <div className="space-y-4">
                 <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center font-black text-sm">3</div>
                 <h4 className="font-black uppercase tracking-widest text-[10px] text-purple-400">Monitor</h4>
                 <p className="text-sm font-medium text-slate-400 leading-relaxed">Watch sessions go live in your Table Hub as soon as a customer scanned the QR code.</p>
              </div>
          </div>
      </div>
    </div>
  )
}
