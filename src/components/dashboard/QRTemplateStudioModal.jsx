import React, { useState, useRef, useEffect } from 'react'
import { 
  Download, 
  Printer, 
  Sparkles, 
  QrCode, 
  Palette, 
  Layers, 
  Wifi, 
  CheckCircle2, 
  FileText, 
  Image as ImageIcon,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  ShieldCheck,
  Building,
  Smartphone,
  Eye,
  Loader2,
  Sliders,
  Maximize2,
  RotateCcw,
  Sparkle
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

// 🎨 8 High-End Restaurant Design Themes
export const TEMPLATE_THEMES = [
  {
    id: 'royal_gold',
    name: 'Royal Obsidian',
    category: 'luxury',
    badge: 'Fine Dining & Steakhouse',
    bgColor: 'bg-zinc-950',
    cardBorder: 'border-amber-400/40 shadow-[0_0_40px_rgba(245,158,11,0.15)]',
    accentColor: 'text-amber-400',
    accentBg: 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950',
    qrBg: 'bg-white',
    textColor: 'text-white',
    subTextColor: 'text-zinc-400',
    pillBorder: 'border-amber-500/30 bg-zinc-900/90 text-amber-300',
    hex: {
      bg: '#09090b',
      cardBorder: '#b45309',
      accent: '#f59e0b',
      text: '#ffffff',
      subText: '#a1a1aa',
      pillBg: '#18181b',
      pillBorder: '#d97706',
      pillText: '#fbbf24',
      badgeBg: '#f59e0b',
      badgeText: '#09090b'
    }
  },
  {
    id: 'botanical_emerald',
    name: 'Botanical Emerald',
    category: 'nature',
    badge: 'Organic Cafe & Bistro',
    bgColor: 'bg-[#062016]',
    cardBorder: 'border-emerald-400/40 shadow-[0_0_40px_rgba(16,185,129,0.15)]',
    accentColor: 'text-emerald-400',
    accentBg: 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950',
    qrBg: 'bg-white',
    textColor: 'text-white',
    subTextColor: 'text-emerald-200/80',
    pillBorder: 'border-emerald-500/30 bg-emerald-900/90 text-emerald-300',
    hex: {
      bg: '#062016',
      cardBorder: '#059669',
      accent: '#10b981',
      text: '#ffffff',
      subText: '#a7f3d0',
      pillBg: '#064e3b',
      pillBorder: '#10b981',
      pillText: '#6ee7b7',
      badgeBg: '#10b981',
      badgeText: '#062016'
    }
  },
  {
    id: 'crimson_bistro',
    name: 'Crimson Bistro',
    category: 'vibrant',
    badge: 'Pizzeria, Grill & Wine',
    bgColor: 'bg-[#180808]',
    cardBorder: 'border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.15)]',
    accentColor: 'text-rose-400',
    accentBg: 'bg-gradient-to-r from-rose-500 to-amber-500 text-white',
    qrBg: 'bg-white',
    textColor: 'text-white',
    subTextColor: 'text-rose-200/80',
    pillBorder: 'border-rose-500/30 bg-rose-950/90 text-rose-300',
    hex: {
      bg: '#180808',
      cardBorder: '#be123c',
      accent: '#f43f5e',
      text: '#ffffff',
      subText: '#fecdd3',
      pillBg: '#4c0519',
      pillBorder: '#f43f5e',
      pillText: '#fda4af',
      badgeBg: '#f43f5e',
      badgeText: '#ffffff'
    }
  },
  {
    id: 'minimal_white',
    name: 'Crisp Porcelain',
    category: 'minimal',
    badge: 'Modern Clean & Nordic',
    bgColor: 'bg-slate-50',
    cardBorder: 'border-slate-300 shadow-xl',
    accentColor: 'text-slate-900',
    accentBg: 'bg-slate-900 text-white',
    qrBg: 'bg-white border-2 border-slate-200',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-500',
    pillBorder: 'border-slate-300 bg-white text-slate-800',
    hex: {
      bg: '#f8fafc',
      cardBorder: '#cbd5e1',
      accent: '#0f172a',
      text: '#0f172a',
      subText: '#64748b',
      pillBg: '#ffffff',
      pillBorder: '#cbd5e1',
      pillText: '#0f172a',
      badgeBg: '#0f172a',
      badgeText: '#ffffff'
    }
  },
  {
    id: 'midnight_sapphire',
    name: 'Midnight Sapphire',
    category: 'vibrant',
    badge: 'Rooftop Bar & Cocktail',
    bgColor: 'bg-[#030712]',
    cardBorder: 'border-sky-500/40 shadow-[0_0_40px_rgba(14,165,233,0.15)]',
    accentColor: 'text-sky-400',
    accentBg: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950',
    qrBg: 'bg-white',
    textColor: 'text-white',
    subTextColor: 'text-sky-200/80',
    pillBorder: 'border-sky-500/30 bg-sky-950/90 text-sky-300',
    hex: {
      bg: '#030712',
      cardBorder: '#0284c7',
      accent: '#0ea5e9',
      text: '#ffffff',
      subText: '#bae6fd',
      pillBg: '#082f49',
      pillBorder: '#0ea5e9',
      pillText: '#7dd3fc',
      badgeBg: '#0ea5e9',
      badgeText: '#030712'
    }
  },
  {
    id: 'japanese_zen',
    name: 'Kyoto Terracotta',
    category: 'nature',
    badge: 'Ramen, Izakaya & Asian',
    bgColor: 'bg-[#1c1917]',
    cardBorder: 'border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.15)]',
    accentColor: 'text-orange-400',
    accentBg: 'bg-gradient-to-r from-orange-400 to-amber-500 text-slate-950',
    qrBg: 'bg-white',
    textColor: 'text-white',
    subTextColor: 'text-orange-200/80',
    pillBorder: 'border-orange-500/30 bg-orange-950/90 text-orange-300',
    hex: {
      bg: '#1c1917',
      cardBorder: '#c2410c',
      accent: '#f97316',
      text: '#ffffff',
      subText: '#fed7aa',
      pillBg: '#431407',
      pillBorder: '#ea580c',
      pillText: '#fdba74',
      badgeBg: '#f97316',
      badgeText: '#1c1917'
    }
  },
  {
    id: 'amethyst_velvet',
    name: 'Amethyst Velvet',
    category: 'luxury',
    badge: 'Nightclub & Shisha Lounge',
    bgColor: 'bg-[#0f0728]',
    cardBorder: 'border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.15)]',
    accentColor: 'text-purple-400',
    accentBg: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white',
    qrBg: 'bg-white',
    textColor: 'text-white',
    subTextColor: 'text-purple-200/80',
    pillBorder: 'border-purple-500/30 bg-purple-950/90 text-purple-300',
    hex: {
      bg: '#0f0728',
      cardBorder: '#7e22ce',
      accent: '#a855f7',
      text: '#ffffff',
      subText: '#e9d5ff',
      pillBg: '#3b0764',
      pillBorder: '#a855f7',
      pillText: '#d8b4fe',
      badgeBg: '#a855f7',
      badgeText: '#ffffff'
    }
  },
  {
    id: 'artisan_walnut',
    name: 'Artisan Roastery',
    category: 'minimal',
    badge: 'Specialty Coffee & Craft',
    bgColor: 'bg-[#1c140c]',
    cardBorder: 'border-yellow-600/40 shadow-[0_0_40px_rgba(234,179,8,0.15)]',
    accentColor: 'text-yellow-400',
    accentBg: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950',
    qrBg: 'bg-white',
    textColor: 'text-white',
    subTextColor: 'text-amber-200/80',
    pillBorder: 'border-yellow-600/30 bg-[#2e1d0e] text-yellow-300',
    hex: {
      bg: '#1c140c',
      cardBorder: '#a16207',
      accent: '#eab308',
      text: '#ffffff',
      subText: '#fde68a',
      pillBg: '#2e1d0e',
      pillBorder: '#ca8a04',
      pillText: '#fef08a',
      badgeBg: '#eab308',
      badgeText: '#1c140c'
    }
  }
]

// 📐 Form Factor Presets & Custom Dimensions
export const FORM_FACTORS = [
  {
    id: 'table_tent_4x6',
    name: '4" × 6" Table Tent',
    sub: 'Standard Acrylic L/T-Stand',
    widthInches: 4,
    heightInches: 6,
    canvasW: 1200,
    canvasH: 1800,
    aspectClass: 'w-[320px] min-h-[480px]'
  },
  {
    id: 'table_sign_5x7',
    name: '5" × 7" Large Standee',
    sub: 'Dining Table & Bar Top',
    widthInches: 5,
    heightInches: 7,
    canvasW: 1500,
    canvasH: 2100,
    aspectClass: 'w-[340px] min-h-[476px]'
  },
  {
    id: 'compact_square_3x3',
    name: '3" × 3" Compact Disc',
    sub: 'Wooden Block / Sticker',
    widthInches: 3,
    heightInches: 3,
    canvasW: 1200,
    canvasH: 1200,
    aspectClass: 'w-[310px] min-h-[310px]'
  },
  {
    id: 'a5_card',
    name: 'A5 Menu Insert',
    sub: '148 × 210 mm Cardstock',
    widthInches: 5.8,
    heightInches: 8.3,
    canvasW: 1400,
    canvasH: 2000,
    aspectClass: 'w-[330px] min-h-[470px]'
  },
  {
    id: 'custom',
    name: 'Custom Dimensions',
    sub: 'Set exact Width & Height',
    widthInches: 4,
    heightInches: 6,
    canvasW: 1200,
    canvasH: 1800,
    aspectClass: 'w-[320px] min-h-[480px]'
  }
]

// 🛠️ Dynamic Canvas Standee Generator (300 DPI)
async function generateStandeeCanvas({
  themeId,
  canvasWidth,
  canvasHeight,
  restaurantName,
  restaurantLogo,
  tableNumber,
  qrUrl,
  tagline,
  wifiNetwork,
  wifiPassword,
  showWifi
}) {
  const width = canvasWidth || 1200
  const height = canvasHeight || 1800

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const activeThemeObj = TEMPLATE_THEMES.find(t => t.id === themeId) || TEMPLATE_THEMES[0]
  const colors = activeThemeObj.hex

  const isSquare = height / width < 1.15
  const scale = Math.min(width / 1200, height / 1800)

  // 1. Fill Background
  ctx.fillStyle = colors.bg
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, Math.max(30, 60 * scale))
  ctx.fill()

  // 2. Luxury Outer Frame & Corner Accents
  const margin = Math.max(24, 40 * scale)
  ctx.strokeStyle = colors.cardBorder
  ctx.lineWidth = Math.max(4, 8 * scale)
  ctx.beginPath()
  ctx.roundRect(margin, margin, width - margin * 2, height - margin * 2, Math.max(20, 50 * scale))
  ctx.stroke()

  // Decorative Corner Angles
  const cornerLength = Math.max(40, 80 * scale)
  ctx.lineWidth = Math.max(6, 14 * scale)
  ctx.strokeStyle = colors.accent
  ctx.beginPath(); ctx.moveTo(margin, margin + cornerLength); ctx.lineTo(margin, margin); ctx.lineTo(margin + cornerLength, margin); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(width - margin - cornerLength, margin); ctx.lineTo(width - margin, margin); ctx.lineTo(width - margin, margin + cornerLength); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(margin, height - margin - cornerLength); ctx.lineTo(margin, height - margin); ctx.lineTo(margin + cornerLength, height - margin); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(width - margin - cornerLength, height - margin); ctx.lineTo(width - margin, height - margin); ctx.lineTo(width - margin, height - margin - cornerLength); ctx.stroke();

  // 3. Draw Brand Logo or Circular Monogram Seal
  let yPos = isSquare ? margin + 40 * scale : margin + 70 * scale
  const logoSize = Math.max(70, (isSquare ? 100 : 130) * scale)

  if (restaurantLogo) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = restaurantLogo
      await new Promise((resolve) => {
        img.onload = () => {
          const logoX = (width - logoSize) / 2
          ctx.save()
          ctx.beginPath()
          ctx.arc(logoX + logoSize / 2, yPos + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          ctx.drawImage(img, logoX, yPos, logoSize, logoSize)
          ctx.restore()
          
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = Math.max(3, 6 * scale)
          ctx.beginPath()
          ctx.arc(logoX + logoSize / 2, yPos + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
          ctx.stroke()
          
          yPos += logoSize + (isSquare ? 20 : 35) * scale
          resolve()
        }
        img.onerror = () => {
          drawMonogram()
          resolve()
        }
      })
    } catch (e) {
      drawMonogram()
    }
  } else {
    drawMonogram()
  }

  function drawMonogram() {
    const logoX = (width - logoSize) / 2
    ctx.fillStyle = colors.accent
    ctx.beginPath()
    ctx.arc(logoX + logoSize / 2, yPos + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = colors.bg
    ctx.font = `bold ${Math.round(54 * scale)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(restaurantName.charAt(0).toUpperCase(), width / 2, yPos + logoSize / 2)
    yPos += logoSize + (isSquare ? 20 : 35) * scale
  }

  // 4. Draw Restaurant Name & Subtitle
  ctx.fillStyle = colors.text
  const nameFontSize = Math.max(26, Math.min(48 * scale, (width * 0.75) / (restaurantName.length * 0.6)))
  ctx.font = `900 ${Math.round(nameFontSize)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(restaurantName.toUpperCase(), width / 2, yPos)
  yPos += (isSquare ? 30 : 40) * scale

  ctx.fillStyle = colors.subText
  ctx.font = `bold ${Math.max(14, Math.round(22 * scale))}px sans-serif`
  ctx.fillText('• CONTACTLESS DINING •', width / 2, yPos)
  yPos += (isSquare ? 35 : 55) * scale

  // 5. Draw Table Number Pill
  const tableText = `TABLE #${tableNumber}`
  ctx.font = `bold ${Math.max(20, Math.round(34 * scale))}px sans-serif`
  const textWidth = ctx.measureText(tableText).width
  const pillWidth = Math.max(textWidth + 60 * scale, 240 * scale)
  const pillHeight = Math.max(42, 60 * scale)
  const pillX = (width - pillWidth) / 2

  ctx.fillStyle = colors.pillBg
  ctx.beginPath()
  ctx.roundRect(pillX, yPos, pillWidth, pillHeight, pillHeight / 2)
  ctx.fill()
  ctx.strokeStyle = colors.pillBorder
  ctx.lineWidth = Math.max(2, 4 * scale)
  ctx.stroke()

  ctx.fillStyle = colors.pillText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(tableText, width / 2, yPos + pillHeight / 2)
  yPos += pillHeight + (isSquare ? 25 : 40) * scale

  // 6. Generate Vector QR Code
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    scale: 12,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  })

  const qrImg = new Image()
  qrImg.src = qrDataUrl
  await new Promise((resolve) => {
    qrImg.onload = () => {
      const qrBoxSize = Math.max(240, (isSquare ? 420 : 500) * scale)
      const qrBoxX = (width - qrBoxSize) / 2
      
      // White plate
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(qrBoxX, yPos, qrBoxSize, qrBoxSize, Math.max(20, 36 * scale))
      ctx.fill()

      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = Math.max(3, 5 * scale)
      ctx.stroke()

      const qrPadding = Math.max(16, 26 * scale)
      ctx.drawImage(qrImg, qrBoxX + qrPadding, yPos + qrPadding, qrBoxSize - qrPadding * 2, qrBoxSize - qrPadding * 2)
      
      yPos += qrBoxSize + (isSquare ? 20 : 35) * scale
      resolve()
    }
  })

  // 7. Draw "Scan Camera to Order" Badge
  const actionText = '📸 SCAN CAMERA TO ORDER'
  ctx.font = `900 ${Math.max(14, Math.round(22 * scale))}px sans-serif`
  const actionWidth = ctx.measureText(actionText).width + 40 * scale
  const actionHeight = Math.max(32, 46 * scale)
  const actionX = (width - actionWidth) / 2

  ctx.fillStyle = colors.badgeBg
  ctx.beginPath()
  ctx.roundRect(actionX, yPos, actionWidth, actionHeight, actionHeight / 2)
  ctx.fill()

  ctx.fillStyle = colors.badgeText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(actionText, width / 2, yPos + actionHeight / 2)
  yPos += actionHeight + (isSquare ? 20 : 35) * scale

  // 8. Custom Tagline
  ctx.fillStyle = colors.subText
  ctx.font = `500 ${Math.max(14, Math.round(22 * scale))}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(tagline, width / 2, yPos)
  yPos += (isSquare ? 30 : 40) * scale

  // 9. Wi-Fi (if enabled)
  if (showWifi && (wifiNetwork || wifiPassword)) {
    const wifiText = `📶 Wi-Fi: ${wifiNetwork || 'Guest'} ${wifiPassword ? `• Pass: ${wifiPassword}` : ''}`
    ctx.font = `bold ${Math.max(13, Math.round(20 * scale))}px sans-serif`
    
    const wifiMetrics = ctx.measureText(wifiText)
    const wifiPillW = Math.max(wifiMetrics.width + 40 * scale, 240 * scale)
    const wifiPillH = Math.max(30, 42 * scale)
    const wifiPillX = (width - wifiPillW) / 2

    ctx.fillStyle = colors.pillBg
    ctx.beginPath()
    ctx.roundRect(wifiPillX, yPos, wifiPillW, wifiPillH, wifiPillH / 2)
    ctx.fill()
    ctx.strokeStyle = colors.pillBorder
    ctx.lineWidth = Math.max(2, 3 * scale)
    ctx.stroke()

    ctx.fillStyle = colors.pillText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(wifiText, width / 2, yPos + wifiPillH / 2)
    yPos += wifiPillH + 20 * scale
  }

  // 10. Footer: Powered by Servora Cloud POS
  ctx.fillStyle = colors.subText
  ctx.font = `bold ${Math.max(11, Math.round(16 * scale))}px sans-serif`
  ctx.fillText('POWERED BY SERVORA CLOUD POS', width / 2, height - Math.max(30, 50 * scale))

  return canvas
}

export default function QRTemplateStudioModal({
  open,
  onOpenChange,
  qrCodes = [],
  restaurantProfile = {},
  selectedSingleQR = null
}) {
  const [selectedTheme, setSelectedTheme] = useState('royal_gold')
  const [themeFilter, setThemeFilter] = useState('all')
  const [selectedFormat, setSelectedFormat] = useState('table_tent_4x6')
  const [customWidthInches, setCustomWidthInches] = useState('4.0')
  const [customHeightInches, setCustomHeightInches] = useState('6.0')
  const [customTagline, setCustomTagline] = useState('Scan with camera to browse our menu & order.')
  const [wifiNetwork, setWifiNetwork] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [showWifi, setShowWifi] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [previewTableIndex, setPreviewTableIndex] = useState(0)
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const dropdownRef = useRef(null)
  const tableButtonRefs = useRef([])

  // Auto-scroll the active table button smoothly into the center of the track
  useEffect(() => {
    if (tableButtonRefs.current[previewTableIndex]) {
      tableButtonRefs.current[previewTableIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [previewTableIndex])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsTableDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeTheme = TEMPLATE_THEMES.find(t => t.id === selectedTheme) || TEMPLATE_THEMES[0]
  const currentFormat = FORM_FACTORS.find(f => f.id === selectedFormat) || FORM_FACTORS[0]

  const targetQRs = selectedSingleQR ? [selectedSingleQR] : qrCodes
  const currentPreviewQR = targetQRs[previewTableIndex] || targetQRs[0] || {
    tableNumber: 1,
    url: `${window.location.origin}/menu?table=1`,
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://servora.app'
  }

  const restaurantName = restaurantProfile.name || restaurantProfile.business_name || 'Tiger Bistro'
  const restaurantLogo = restaurantProfile.avatar || restaurantProfile.logo_url || ''

  // Compute Active Dimensions
  const activeWidth = selectedFormat === 'custom'
    ? Math.max(600, Math.min(3600, Math.round(parseFloat(customWidthInches || 4) * 300)))
    : currentFormat.canvasW
  const activeHeight = selectedFormat === 'custom'
    ? Math.max(600, Math.min(5400, Math.round(parseFloat(customHeightInches || 6) * 300)))
    : currentFormat.canvasH

  // Filtered themes
  const filteredThemes = themeFilter === 'all' 
    ? TEMPLATE_THEMES 
    : TEMPLATE_THEMES.filter(t => t.category === themeFilter)

  // 📥 1. Export Standee as 300 DPI PNG via HTML5 Canvas
  const handleDownloadSinglePNG = async () => {
    setIsExporting(true)
    setExportProgress('Generating 300 DPI print canvas...')

    try {
      const canvas = await generateStandeeCanvas({
        themeId: selectedTheme,
        canvasWidth: activeWidth,
        canvasHeight: activeHeight,
        restaurantName,
        restaurantLogo,
        tableNumber: currentPreviewQR.tableNumber,
        qrUrl: currentPreviewQR.url,
        tagline: customTagline,
        wifiNetwork,
        wifiPassword,
        showWifi
      })

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image blob.')
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${restaurantName.toLowerCase().replace(/\s+/g, '-')}-table-${currentPreviewQR.tableNumber}-standee.png`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 200)
      }, 'image/png', 1.0)
    } catch (err) {
      console.error('Error generating image:', err)
      alert(`Failed to generate print image: ${err.message}`)
    } finally {
      setIsExporting(false)
      setExportProgress('')
    }
  }

  // 📄 2. Export All Tables as Print-Ready Multi-Page PDF
  const handleDownloadBulkPDF = async () => {
    if (targetQRs.length === 0) return
    setIsExporting(true)
    setExportProgress('Preparing multi-page PDF...')

    try {
      const pdf = new jsPDF({
        orientation: activeWidth > activeHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      for (let i = 0; i < targetQRs.length; i++) {
        setExportProgress(`Rendering Table #${targetQRs[i].tableNumber} (${i + 1}/${targetQRs.length})...`)
        
        const canvas = await generateStandeeCanvas({
          themeId: selectedTheme,
          canvasWidth: activeWidth,
          canvasHeight: activeHeight,
          restaurantName,
          restaurantLogo,
          tableNumber: targetQRs[i].tableNumber,
          qrUrl: targetQRs[i].url,
          tagline: customTagline,
          wifiNetwork,
          wifiPassword,
          showWifi
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage()

        const imgWidth = 140
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        const xOffset = (210 - imgWidth) / 2
        const yOffset = (297 - imgHeight) / 2

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight)
      }

      setExportProgress('Saving PDF document...')
      pdf.save(`${restaurantName.toLowerCase().replace(/\s+/g, '-')}-all-table-standees.pdf`)
    } catch (err) {
      console.error('Error generating bulk PDF:', err)
      alert(`Failed to generate PDF: ${err.message}`)
    } finally {
      setIsExporting(false)
      setExportProgress('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!max-w-[1200px] !w-[96vw] max-h-[94vh] flex flex-col p-0 rounded-[2.5rem] bg-slate-50 border border-slate-200/80 shadow-2xl overflow-hidden"
        showCloseButton={true}
      >
        {/* 🌟 Top Header Bar 🌟 */}
        <div className="shrink-0 bg-white border-b border-slate-200/80 px-6 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Print-Ready Table Standee Studio</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                  Pro 300 DPI
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Design luxury acrylic table tents, wooden blocks, and custom-sized restaurant standees.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-8">
            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-xs px-3 py-1">
              {targetQRs.length} {targetQRs.length === 1 ? 'Table' : 'Tables'} Ready
            </Badge>
          </div>
        </div>

        {/* 🌟 Scrollable 2-Column Studio Body 🌟 */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* 🎛️ LEFT CONTROLS PANEL (5 Columns) */}
            <div className="lg:col-span-5 space-y-6 pb-6">
              
              {/* 1. Template Ambiance & Theme */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-600" />
                    1. Luxury Standee Theme ({TEMPLATE_THEMES.length})
                  </Label>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[9px] font-black">
                    <button
                      type="button"
                      onClick={() => setThemeFilter('all')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${themeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeFilter('luxury')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${themeFilter === 'luxury' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Luxury
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeFilter('nature')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${themeFilter === 'nature' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Bistro
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeFilter('minimal')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${themeFilter === 'minimal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Clean
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto no-scrollbar pr-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {filteredThemes.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        selectedTheme === theme.id 
                          ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-sm' 
                          : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 truncate">{theme.name}</span>
                        {/* 🌟 Soft Subtle Blinking Live Beacon Dot 🌟 */}
                        <div className="relative flex h-3 w-3 items-center justify-center shrink-0">
                          {selectedTheme === theme.id && (
                            <span 
                              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-30"
                              style={{ backgroundColor: theme.hex.accent }}
                            />
                          )}
                          <span 
                            className={`relative inline-flex rounded-full transition-all duration-300 ${
                              selectedTheme === theme.id ? 'h-2 w-2 opacity-75 ring-1 ring-white/80' : 'h-1.5 w-1.5 opacity-40'
                            }`}
                            style={{ 
                              backgroundColor: theme.hex.accent,
                              boxShadow: selectedTheme === theme.id ? `0 0 6px ${theme.hex.accent}80` : 'none'
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold truncate">{theme.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Standee Form Factor & Custom Sizing */}
              <div className="space-y-2.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  2. Form Factor & Dimensions
                </Label>
                
                <div className="grid grid-cols-2 gap-2">
                  {FORM_FACTORS.map(format => (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedFormat === format.id
                          ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900 truncate">{format.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{format.sub}</p>
                    </button>
                  ))}
                </div>

                {/* Custom Sizing Inputs (if custom chosen) */}
                {selectedFormat === 'custom' && (
                  <div className="p-3.5 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl space-y-2 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between text-[11px] font-black text-indigo-900">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        Custom Canvas Dimensions (Inches)
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600">
                        {activeWidth} × {activeHeight} px (300 DPI)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-[10px] font-bold text-slate-600">Width (Inches)</Label>
                        <Input 
                          type="number"
                          step="0.1"
                          min="2"
                          max="12"
                          value={customWidthInches}
                          onChange={(e) => setCustomWidthInches(e.target.value)}
                          className="h-9 text-xs rounded-xl bg-white border-slate-200 font-bold"
                          placeholder="4.0"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-slate-600">Height (Inches)</Label>
                        <Input 
                          type="number"
                          step="0.1"
                          min="2"
                          max="18"
                          value={customHeightInches}
                          onChange={(e) => setCustomHeightInches(e.target.value)}
                          className="h-9 text-xs rounded-xl bg-white border-slate-200 font-bold"
                          placeholder="6.0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Custom Tagline */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Call-to-Action Subtitle
                </Label>
                <Input 
                  value={customTagline} 
                  onChange={(e) => setCustomTagline(e.target.value)}
                  placeholder="Scan with camera to order..."
                  className="h-11 rounded-xl bg-white border-slate-200 text-xs font-bold text-slate-900"
                />
              </div>

              {/* 4. Optional Guest Wi-Fi Tag */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Print Guest Wi-Fi Info</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showWifi} 
                    onChange={(e) => setShowWifi(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                {showWifi && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Input 
                      placeholder="Wi-Fi SSID (Name)"
                      value={wifiNetwork}
                      onChange={(e) => setWifiNetwork(e.target.value)}
                      className="h-9 text-xs rounded-lg"
                    />
                    <Input 
                      placeholder="Password"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* 5. Luxury Table Navigation Controller */}
              {targetQRs.length > 1 && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Selected Table: <strong className="text-slate-900">#{currentPreviewQR.tableNumber}</strong>
                      </span>
                    </div>

                    {/* Custom Luxury Popover Quick Jump Selector */}
                    <div className="flex items-center gap-2 relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
                        className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <span>Table #{currentPreviewQR.tableNumber}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTableDropdownOpen ? 'rotate-180 text-indigo-600' : 'text-slate-500'}`} />
                      </button>

                      {isTableDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-2 z-50 w-72 p-3.5 bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl rounded-2xl animate-in fade-in-50 zoom-in-95 duration-150 space-y-2.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Jump to Table</span>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">{targetQRs.length} Tables</span>
                          </div>

                          {targetQRs.length > 8 && (
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <Input 
                                placeholder="Filter table number..."
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                className="h-8 pl-8 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                                autoFocus
                              />
                            </div>
                          )}

                          <div 
                            className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto no-scrollbar p-1"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                          >
                            {targetQRs
                              .filter(qr => !tableSearch || qr.tableNumber.toString().includes(tableSearch))
                              .map((qr) => {
                                const actualIdx = targetQRs.findIndex(q => q.tableNumber === qr.tableNumber)
                                const isSelected = previewTableIndex === actualIdx
                                return (
                                  <button
                                    key={qr.tableNumber}
                                    type="button"
                                    onClick={() => {
                                      setPreviewTableIndex(actualIdx)
                                      setIsTableDropdownOpen(false)
                                      setTableSearch('')
                                    }}
                                    className={`h-9 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center border ${
                                      isSelected
                                        ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm font-black ring-2 ring-amber-400/30'
                                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                                    }`}
                                  >
                                    #{qr.tableNumber}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60">
                        {previewTableIndex + 1}/{targetQRs.length}
                      </span>
                    </div>
                  </div>

                  {/* Stepper Bar with Chevrons and Scrollable Track */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={previewTableIndex === 0}
                      onClick={() => setPreviewTableIndex(prev => Math.max(0, prev - 1))}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                      title="Previous Table"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div 
                      className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {targetQRs.map((qr, idx) => (
                        <button
                          key={qr.tableNumber}
                          ref={(el) => (tableButtonRefs.current[idx] = el)}
                          type="button"
                          onClick={() => setPreviewTableIndex(idx)}
                          className={`h-10 min-w-10 px-3.5 rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 flex items-center justify-center border shadow-2xs ${
                            previewTableIndex === idx 
                              ? 'bg-slate-900 text-amber-400 border-slate-900 ring-2 ring-amber-400/30 scale-105 shadow-sm' 
                              : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          #{qr.tableNumber}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={previewTableIndex === targetQRs.length - 1}
                      onClick={() => setPreviewTableIndex(prev => Math.min(targetQRs.length - 1, prev + 1))}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                      title="Next Table"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 📥 EXPORT ACTION BUTTONS */}
              <div className="pt-2 space-y-2.5">
                <Button
                  onClick={handleDownloadSinglePNG}
                  disabled={isExporting}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>Download Table #{currentPreviewQR.tableNumber} Standee (300 DPI PNG)</span>
                </Button>

                {targetQRs.length > 1 && (
                  <Button
                    onClick={handleDownloadBulkPDF}
                    disabled={isExporting}
                    className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-black text-amber-400 font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <FileText className="w-4 h-4 text-amber-400" />}
                    <span>Download All {targetQRs.length} Tables (Print-Ready PDF)</span>
                  </Button>
                )}

                {exportProgress && (
                  <p className="text-[11px] text-center font-bold text-indigo-600 animate-pulse">
                    {exportProgress}
                  </p>
                )}
              </div>
            </div>

            {/* 🖼️ RIGHT LIVE VISUAL STAND PREVIEW (7 Columns) */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-200/60 rounded-3xl p-6 sm:p-10 border border-slate-300/80 min-h-[580px]">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live 1:1 Print Preview ({Math.round(activeWidth / 300 * 10) / 10}" × {Math.round(activeHeight / 300 * 10) / 10}")</span>
              </div>

              {/* 🌟 LIVE VISUAL STANDEE PREVIEW CARD 🌟 */}
              <div 
                className={`relative overflow-hidden transition-all duration-300 flex flex-col items-center text-center justify-between border-2 ${activeTheme.bgColor} ${activeTheme.cardBorder} p-7 rounded-[2.5rem]`}
                style={{ 
                  boxSizing: 'border-box',
                  width: selectedFormat === 'compact_square_3x3' ? '310px' : '330px',
                  minHeight: selectedFormat === 'compact_square_3x3' ? '310px' : '480px'
                }}
              >
                {/* Corner Accents */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-amber-400/40 pointer-events-none" />
                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-amber-400/40 pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-amber-400/40 pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-amber-400/40 pointer-events-none" />

                {/* 1. Header: Brand Logo & Restaurant Name */}
                <div className="space-y-2 w-full pt-1">
                  {restaurantLogo ? (
                    <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden border-2 border-white/20 shadow-md">
                      <img src={restaurantLogo} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
                      {restaurantName.charAt(0)}
                    </div>
                  )}
                  
                  <div>
                    <h3 className={`text-lg sm:text-xl font-black uppercase tracking-tight leading-tight ${activeTheme.textColor}`}>
                      {restaurantName}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${activeTheme.subTextColor}`}>
                        Contactless Dining
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Centerpiece: Table Pill & High-Res QR Code */}
                <div className="my-3.5 space-y-3 flex flex-col items-center">
                  <div className={`px-5 py-1.5 rounded-full border shadow-md font-black text-sm uppercase tracking-wider ${activeTheme.pillBorder}`}>
                    <span>Table #{currentPreviewQR.tableNumber}</span>
                  </div>

                  <div className={`p-3.5 rounded-3xl ${activeTheme.qrBg} shadow-2xl flex items-center justify-center`}>
                    <img 
                      src={currentPreviewQR.qrImageUrl} 
                      alt={`QR Code for Table ${currentPreviewQR.tableNumber}`} 
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>

                  <div className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${activeTheme.accentBg} shadow-sm`}>
                    <span>📸 Scan Camera to Order</span>
                  </div>
                </div>

                {/* 3. Instructions & Wi-Fi Footer */}
                <div className="w-full space-y-2.5 pb-1">
                  <p className={`text-[11px] font-medium leading-tight max-w-[280px] mx-auto ${activeTheme.subTextColor}`}>
                    {customTagline}
                  </p>

                  {showWifi && (wifiNetwork || wifiPassword) && (
                    <div className={`px-3.5 py-1.5 rounded-xl border text-[10px] font-bold inline-flex items-center gap-2 ${activeTheme.pillBorder}`}>
                      <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Wi-Fi: <strong className={activeTheme.textColor}>{wifiNetwork || 'Guest'}</strong></span>
                      {wifiPassword && <span>• Pass: <strong className={activeTheme.textColor}>{wifiPassword}</strong></span>}
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-widest opacity-60 text-slate-400">
                    <span>Powered by</span>
                    <span className="text-indigo-400 font-bold">Servora Cloud POS</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-semibold mt-4 text-center">
                💡 High-resolution 300 DPI: export directly into acrylic table tents, wooden blocks, or custom frames.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
