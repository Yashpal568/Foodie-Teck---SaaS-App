import React, { useMemo, useState, useEffect } from 'react'
import {
  Users, Search, TrendingUp, TrendingDown, ShoppingBag, Calendar,
  Mail, Phone, Filter, Download, UserPlus, Clock, ChevronRight, Star,
  Activity, CreditCard, PieChart as PieIcon, RefreshCw, AlertTriangle,
  Target, Flame, Heart, Crown, BarChart2, Layers, Bell, ChevronUp,
  ChevronDown, Eye, CheckCircle2, Sparkles, Repeat2, UserCheck,
  BadgeDollarSign, Percent, Zap,
} from 'lucide-react'
import { useOrderManagement } from '@/hooks/useOrderManagement'
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile'
import { getCustomers } from '@/lib/api'

import PremiumLock from './PremiumLock'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { cn } from '@/lib/utils'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getServoraLogoBase64 } from '@/utils/pdfLogo'

// ── Tier metadata ────────────────────────────────────────────────────────────
const TIER_META = {
  VIP:       { icon: Crown,         label: 'VIP',      bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Regular:   { icon: Repeat2,       label: 'Regular',  bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200'  },
  New:       { icon: UserPlus,      label: 'New',      bg: 'bg-teal-50',  text: 'text-teal-700',  border: 'border-teal-200'  },
  'At Risk': { icon: AlertTriangle, label: 'At Risk',  bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200'   },
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600', 'from-teal-500 to-emerald-600',
  'from-blue-500 to-indigo-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600', 'from-cyan-500 to-sky-600',
]
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

const loyaltyScore = (c) => {
  let s = 0
  s += c.visits >= 10 ? 40 : c.visits >= 5 ? 25 : c.visits >= 2 ? 10 : 3
  s += c.totalSpent >= 50000 ? 35 : c.totalSpent >= 20000 ? 22 : c.totalSpent >= 5000 ? 12 : 4
  const days = (Date.now() - new Date(c.lastVisit).getTime()) / 86400000
  s += days <= 7 ? 25 : days <= 30 ? 15 : days <= 60 ? 5 : 0
  return Math.min(s, 100)
}

const fmtCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`
const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

const exportCSV = (list) => {
  const header = ['Name', 'Email', 'Phone', 'Tier', 'Visits', 'Total Spent', 'Loyalty Score', 'Last Visit', 'Health']
  const rows = list.map(c => [
    c.name, c.email, c.phone, c.tag, c.visits,
    c.totalSpent, loyaltyScore(c), new Date(c.lastVisit).toLocaleDateString(), c.health,
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'customers.csv'; a.click()
  URL.revokeObjectURL(url)
}

const exportPDF = async (list, stats = {}, restaurantName = 'Tiger Bistro') => {
  const logoImg = await getServoraLogoBase64()

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  const pageWidth = doc.internal.pageSize.getWidth()   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm

  const safeRestaurantName = (restaurantName || 'Tiger Bistro').toUpperCase()
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const generatedTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  // Format currency cleanly without Unicode font corruption
  const fmtPdfCurrency = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN')}`

  // ── High-Impact Watermark ──
  const drawWatermark = () => {
    try {
      if (doc.saveGraphicsState) doc.saveGraphicsState()
      
      // Circular decorative watermark geometry in center
      doc.setDrawColor(243, 246, 251)
      doc.setLineWidth(0.6)
      doc.circle(pageWidth / 2, pageHeight / 2, 45, 'S')
      doc.circle(pageWidth / 2, pageHeight / 2, 40, 'S')

      doc.setTextColor(240, 244, 250)
      doc.setFontSize(36)
      doc.setFont('helvetica', 'bold')
      doc.text('SERVORA OS', pageWidth / 2, pageHeight / 2 - 4, {
        align: 'center',
        angle: 45
      })
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(242, 246, 251)
      doc.text('CUSTOMER INTELLIGENCE • VERIFIED CRM', pageWidth / 2, pageHeight / 2 + 14, {
        align: 'center',
        angle: 45
      })
      if (doc.restoreGraphicsState) doc.restoreGraphicsState()
    } catch {
      // Fallback
    }
  }

  // 1. Watermark on Page 1
  drawWatermark()

  // 2. Executive Dark Architecture Header (Height: 44mm)
  doc.setFillColor(11, 15, 25) // Ultra Deep Midnight Slate
  doc.rect(0, 0, pageWidth, 44, 'F')

  // Top Dual Glow Accent Bar (2.5mm)
  doc.setFillColor(13, 148, 136) // Teal-600
  doc.rect(0, 0, pageWidth * 0.6, 2.5, 'F')
  doc.setFillColor(245, 158, 11) // Amber-500
  doc.rect(pageWidth * 0.6, 0, pageWidth * 0.4, 2.5, 'F')

  // Servora Logo Image (Left)
  const iconX = 14
  const iconY = 10
  const iconSize = 14
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', iconX, iconY, iconSize, iconSize)
  } else {
    doc.setFillColor(13, 148, 136)
    doc.roundedRect(iconX, iconY, iconSize, iconSize, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('S', iconX + iconSize / 2, iconY + iconSize / 2 + 3.2, { align: 'center' })
  }

  // Left Header Text
  const textStartX = iconX + iconSize + 4.5
  doc.setTextColor(153, 246, 228) // Teal-200
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVORA INTELLIGENCE SUITE  •  GUEST LIFETIME VALUE AUDIT', textStartX, 15)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer Intelligence Report', textStartX, 23.5)

  doc.setTextColor(148, 163, 184) // Slate-400
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Comprehensive guest directory, loyalty breakdown & lifetime value analysis', textStartX, 30)

  // Right Header Content (Restaurant Name & Badges)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(safeRestaurantName, pageWidth - 14, 16, { align: 'right' })

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${generatedDate} • ${generatedTime}`, pageWidth - 14, 22.5, { align: 'right' })

  // Confidential Badge Pill on Top Right
  const badgeText = 'CONFIDENTIAL CRM'
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  const bWidth = doc.getTextWidth(badgeText) + 8
  const bHeight = 5
  const bX = pageWidth - 14 - bWidth
  const bY = 27
  doc.setFillColor(245, 158, 11) // Amber
  doc.roundedRect(bX, bY, bWidth, bHeight, 1.2, 1.2, 'F')
  doc.setTextColor(15, 23, 42) // Dark text
  doc.text(badgeText, bX + bWidth / 2, bY + 3.6, { align: 'center' })

  // ── 3. Section Title 1: Key CRM Performance Indicators ──
  const sec1Y = 51
  doc.setFillColor(13, 148, 136) // Teal bar
  doc.rect(14, sec1Y, 2.5, 5, 'F')

  doc.setTextColor(15, 23, 42) // Slate-900
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('EXECUTIVE GUEST INTELLIGENCE & LTV METRICS', 19, sec1Y + 4)

  // ── 4. Luxury 4-Card Hero Metric Grid (Y: 58mm to 80mm) ──
  const cardY = 58
  const cardH = 22
  const cardSpacing = 4
  const totalCardsW = pageWidth - 28 // 182mm
  const cardW = (totalCardsW - (3 * cardSpacing)) / 4 // 42.5mm each

  const totalRev = stats.revenue !== undefined ? stats.revenue : list.reduce((s, c) => s + (c.totalSpent || 0), 0)
  const totalCount = stats.total !== undefined ? stats.total : list.length
  const vipCount = stats.vip !== undefined ? stats.vip : list.filter(c => c.tag === 'VIP').length
  const retRate = stats.retention !== undefined ? stats.retention : (list.length > 0 ? ((list.filter(c => c.visits > 1).length / list.length) * 100).toFixed(1) : '0')

  const kpis = [
    {
      pill: 'TOTAL CUSTOMERS',
      val: String(totalCount),
      sub: 'Active Profiles',
      subColor: [99, 102, 241],
      accent: [99, 102, 241], // Indigo
    },
    {
      pill: 'CUMULATIVE LTV',
      val: fmtPdfCurrency(totalRev),
      sub: 'Lifetime Spend',
      subColor: [5, 150, 105],
      accent: [16, 185, 129], // Emerald
    },
    {
      pill: 'VIP CHAMPIONS',
      val: `${vipCount} Members`,
      sub: `${totalCount > 0 ? Math.round((vipCount / totalCount) * 100) : 0}% High LTV Tier`,
      subColor: [180, 83, 9],
      accent: [245, 158, 11], // Amber
    },
    {
      pill: 'REPEAT RATE',
      val: `${retRate}%`,
      sub: 'Retention Ratio',
      subColor: [13, 148, 136],
      accent: [13, 148, 136], // Teal
    }
  ]

  kpis.forEach((kpi, idx) => {
    const cX = 14 + idx * (cardW + cardSpacing)
    
    // Card background
    doc.setFillColor(248, 250, 252) // Slate-50
    doc.roundedRect(cX, cardY, cardW, cardH, 2.5, 2.5, 'F')
    
    // Card border
    doc.setDrawColor(226, 232, 240) // Slate-200
    doc.setLineWidth(0.3)
    doc.roundedRect(cX, cardY, cardW, cardH, 2.5, 2.5, 'S')

    // Top colored indicator strip (2mm)
    doc.setFillColor(kpi.accent[0], kpi.accent[1], kpi.accent[2])
    doc.roundedRect(cX, cardY, cardW, 2, 1, 1, 'F')

    // Label Pill
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.text(kpi.pill, cX + 3.5, cardY + 6.5)

    // Main Value
    doc.setTextColor(15, 23, 42) // Slate-900
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.text(kpi.val, cX + 3.5, cardY + 12.5)

    // Subtext
    doc.setTextColor(kpi.subColor[0], kpi.subColor[1], kpi.subColor[2])
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text(kpi.sub, cX + 3.5, cardY + 17.5)
  })

  // ── 5. Section Title 2: Customer Registry & Loyalty Breakdown ──
  const sec2Y = 87
  doc.setFillColor(245, 158, 11) // Amber bar
  doc.rect(14, sec2Y, 2.5, 5, 'F')

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('CUSTOMER DIRECTORY & RETENTION MATRIX', 19, sec2Y + 4)

  const countBadge = `${list.length} Registered Diners`
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(countBadge, pageWidth - 14, sec2Y + 4, { align: 'right' })

  // ── 6. High-Impact Customer Directory Table ──
  const tableHeaders = [['#', 'Customer Name', 'Contact Info', 'Tier', 'Visits', 'Total Spend (LTV)', 'Loyalty', 'Health']]
  
  const tableRows = list.map((c, index) => [
    String(index + 1).padStart(2, '0'),
    c.name || 'Guest Customer',
    c.email || c.phone || '—',
    c.tag || 'New',
    String(c.visits || 1),
    fmtPdfCurrency(c.totalSpent),
    `${loyaltyScore(c)}/100`,
    c.health || 'Healthy'
  ])

  autoTable(doc, {
    startY: 94,
    head: tableHeaders,
    body: tableRows,
    theme: 'plain',
    margin: { left: 14, right: 14, bottom: 18 },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      halign: 'left',
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
      textColor: [30, 41, 59],
      lineColor: [238, 242, 246],
      lineWidth: 0.15,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 252], // Subtle Slate-50 zebra
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, fontStyle: 'bold', textColor: [148, 163, 184], cellPadding: { top: 3.2, bottom: 3.2, left: 1, right: 1 } },
      1: { halign: 'left', cellWidth: 38, fontStyle: 'bold', textColor: [15, 23, 42] },
      2: { halign: 'left', cellWidth: 34, textColor: [71, 85, 105] },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 16, fontStyle: 'bold', textColor: [71, 85, 105] },
      5: { halign: 'right', cellWidth: 26, fontStyle: 'bold', textColor: [15, 23, 42] },
      6: { halign: 'center', cellWidth: 16, fontStyle: 'bold', textColor: [99, 102, 241] },
      7: { halign: 'center', cellWidth: 20 },
    },
    didParseCell: function (data) {
      // Suppress default text in Tier and Health columns to prevent double-text overlay
      if (data.section === 'body' && (data.column.index === 3 || data.column.index === 7)) {
        data.cell.text = [] // Suppress default text rendering
      }
    },
    didDrawCell: function (data) {
      // Custom Crisp Pill Badges for Tier (index 3) and Health (index 7)
      if (data.section === 'body') {
        // Tier Pill
        if (data.column.index === 3) {
          const rawText = String(data.cell.raw || '').toUpperCase()
          let bgColor = [240, 253, 250] // Teal-50
          let borderColor = [153, 246, 228]
          let textColor = [13, 148, 136]

          if (rawText.includes('VIP')) {
            bgColor = [254, 243, 199] // Amber-50
            borderColor = [253, 230, 138]
            textColor = [180, 83, 9]
          } else if (rawText.includes('REGULAR')) {
            bgColor = [239, 246, 255] // Blue-50
            borderColor = [191, 219, 254]
            textColor = [29, 78, 216]
          } else if (rawText.includes('RISK')) {
            bgColor = [255, 241, 242] // Rose-50
            borderColor = [254, 205, 211]
            textColor = [225, 29, 72]
          }

          const cell = data.cell
          const pillW = cell.width - 4
          const pillH = 5
          const pillX = cell.x + 2
          const pillY = cell.y + (cell.height - pillH) / 2

          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
          doc.roundedRect(pillX, pillY, pillW, pillH, 1.2, 1.2, 'F')
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
          doc.setLineWidth(0.2)
          doc.roundedRect(pillX, pillY, pillW, pillH, 1.2, 1.2, 'S')

          doc.setTextColor(textColor[0], textColor[1], textColor[2])
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')
          doc.text(rawText, cell.x + cell.width / 2, pillY + 3.5, { align: 'center' })
        }

        // Health Pill
        if (data.column.index === 7) {
          const rawText = String(data.cell.raw || '').toUpperCase()
          let bgColor = [236, 253, 245] // Emerald-50
          let borderColor = [167, 243, 208]
          let textColor = [5, 150, 105]

          if (rawText.includes('RISK') || rawText.includes('CHURN')) {
            bgColor = [255, 241, 242] // Rose-50
            borderColor = [254, 205, 211]
            textColor = [220, 38, 38]
          }

          const cell = data.cell
          const pillW = cell.width - 4
          const pillH = 5
          const pillX = cell.x + 2
          const pillY = cell.y + (cell.height - pillH) / 2

          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
          doc.roundedRect(pillX, pillY, pillW, pillH, 1.2, 1.2, 'F')
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
          doc.setLineWidth(0.2)
          doc.roundedRect(pillX, pillY, pillW, pillH, 1.2, 1.2, 'S')

          doc.setTextColor(textColor[0], textColor[1], textColor[2])
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')
          doc.text(rawText, cell.x + cell.width / 2, pillY + 3.5, { align: 'center' })
        }
      }
    },
    didDrawPage: function (data) {
      if (data.pageNumber > 1) {
        drawWatermark()

        // Continuation Page Slim Header Bar
        doc.setFillColor(11, 15, 25)
        doc.rect(0, 0, pageWidth, 12, 'F')
        
        doc.setFillColor(13, 148, 136)
        doc.rect(0, 0, pageWidth, 1.2, 'F')

        if (logoImg) {
          doc.addImage(logoImg, 'PNG', 14, 2, 8, 8)
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text('SERVORA | CUSTOMER INTELLIGENCE REPORT', 25, 8)
        } else {
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text('SERVORA | CUSTOMER INTELLIGENCE REPORT', 14, 8)
        }

        doc.setTextColor(148, 163, 184)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.text(`${safeRestaurantName} • Page ${data.pageNumber}`, pageWidth - 14, 8, { align: 'right' })
      }
    }
  })

  // ── 7. Multi-Page Footer Stamp ──
  const totalPages = typeof doc.getNumberOfPages === 'function' 
    ? doc.getNumberOfPages() 
    : (doc.internal?.pages ? Math.max(1, doc.internal.pages.length - 1) : 1)

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    
    // Footer divider
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11)

    // Left
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text('CONFIDENTIAL • FOR AUTHORIZED RESTAURANT OPERATORS ONLY', 14, pageHeight - 6.5)

    // Center
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text('POWERED BY SERVORA RESTAURANT OS', pageWidth / 2, pageHeight - 6.5, { align: 'center' })

    // Right
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6.5, { align: 'right' })
  }

  const filename = `${safeRestaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_customer_intelligence_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}



// ── Reusable: Stat card ──────────────────────────────────────────────────────
const BG_MAP = {
  teal:   'bg-teal-50 text-teal-600 ring-teal-100',
  amber:  'bg-amber-50 text-amber-600 ring-amber-100',
  blue:   'bg-blue-50 text-blue-600 ring-blue-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  red:    'bg-red-50 text-red-600 ring-red-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
}

const StatCard = ({ icon: Icon, label, value, color = 'teal', trend = undefined, badge = undefined }) => {
  const cls = BG_MAP[color] || BG_MAP.teal
  const textCls = cls.split(' ')[1]
  return (
    <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center ring-1', cls)}>
            <Icon className="w-5 h-5" />
          </div>
          {badge && <Badge variant="outline" className={cn('text-[10px] font-bold', textCls)}>{badge}</Badge>}
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className={cn('text-2xl font-black', textCls)}>{value}</p>
          {trend !== undefined && (
            <span className={cn('text-[10px] font-bold flex items-center', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
              {trend >= 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Loyalty bar ──────────────────────────────────────────────────────────────
const LoyaltyBar = ({ score }) => {
  const color = score >= 75 ? 'bg-amber-500' : score >= 45 ? 'bg-teal-500' : score >= 20 ? 'bg-blue-400' : 'bg-gray-300'
  const label = score >= 75 ? 'Champion' : score >= 45 ? 'Loyal' : score >= 20 ? 'Engaged' : 'Newcomer'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Loyalty Score</span>
        <span className="text-[10px] font-bold text-gray-700">{label} · {score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ── Customer profile dialog ───────────────────────────────────────────────────
const CustomerProfileDialog = ({ customer, children }) => {
  const score = loyaltyScore(customer)
  const tier = TIER_META[customer.tag] || TIER_META.New
  const TierIcon = tier.icon
  const spendData = (customer.orders || []).slice(-6).map((o, i) => ({
    name: `#${i + 1}`,
    amount: Number(o.total || o.revenue || 0),
  }))
  const metrics = [
    { label: 'Total Spent',     value: fmtCurrency(customer.totalSpent),                                       icon: CreditCard },
    { label: 'Total Visits',    value: customer.visits,                                                        icon: Repeat2    },
    { label: 'Avg Order',       value: customer.visits > 0 ? fmtCurrency(customer.totalSpent / customer.visits) : '₹0', icon: ShoppingBag },
    { label: 'Days Since Visit',value: daysSince(customer.lastVisit),                                          icon: Calendar   },
  ]
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Customer Profile — {customer.name}</DialogTitle>
        <DialogDescription className="sr-only">Full profile of {customer.name}</DialogDescription>
        {/* Hero */}
        <div className="bg-linear-to-br from-slate-800 to-slate-900 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-5">
            <div className={cn('w-16 h-16 rounded-2xl bg-linear-to-br flex items-center justify-center text-2xl font-black text-white shadow-xl', avatarColor(customer.name))}>
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{customer.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className="border border-white/20 bg-white/10 text-white text-xs font-bold">
                  <TierIcon className="w-3 h-3 mr-1" />{customer.tag}
                </Badge>
                <Badge variant="outline" className={cn('border-white/20 text-white/80 text-xs', customer.health === 'Healthy' ? 'bg-green-500/20' : 'bg-red-500/20')}>
                  {customer.health === 'Healthy'
                    ? <CheckCircle2 className="w-3 h-3 mr-1 text-green-400" />
                    : <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />}
                  {customer.health}
                </Badge>
              </div>
              {customer.email && <p className="text-white/60 text-xs mt-1 truncate">{customer.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">Loyalty</p>
              <p className="text-3xl font-black text-white">{score}</p>
              <p className="text-[10px] text-white/40">out of 100</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          <LoyaltyBar score={score} />
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics.map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Icon className="w-3.5 h-3.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
                </div>
                <p className="text-sm font-black text-gray-900">{value}</p>
              </div>
            ))}
          </div>
          {/* Contact */}
          {(customer.email || customer.phone) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</h4>
              <div className="flex flex-wrap gap-2">
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                    <Mail className="w-4 h-4" />{customer.email}
                  </a>
                )}
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                    <Phone className="w-4 h-4" />{customer.phone}
                  </a>
                )}
              </div>
            </div>
          )}
          {/* Spend sparkline */}
          {spendData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Spending History</h4>
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)', fontSize: 11 }} />
                    <Area type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={2} fill="url(#spendGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {/* Recent Orders */}
          {customer.orders?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Orders</h4>
              <div className="rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {customer.orders.slice(-4).reverse().map((order, i) => (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Order #{String(order.id || '').slice(-6)}</p>
                      <p className="text-[11px] text-gray-400">{new Date(order.createdAt || order.created_at || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">{fmtCurrency(order.total || order.revenue)}</p>
                      <Badge variant="outline" className="text-[10px] h-4 mt-0.5 border-teal-100 text-teal-600">Dine-In</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const CustomerManagement = ({ plan = 'Basic', activeItem, setActiveItem, navigate, restaurantId = 'default' }) => {
  const isPremium = true
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState('All Tiers')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [sortBy, setSortBy] = useState('totalSpent')
  const [sortDir, setSortDir] = useState('desc')

  const { orderHistory, loading: ordersLoading, refreshOrders } = useOrderManagement(restaurantId)
  const { profile } = useRestaurantProfile(restaurantId)
  const restaurantName = profile?.name || profile?.business_name || 'Tiger Bistro'
  const [dbCustomers, setDbCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(true)

  useEffect(() => { setIsMounted(true) }, [])

  useEffect(() => {
    if (!restaurantId || restaurantId === 'default') return
    setCustomersLoading(true)
    getCustomers(restaurantId)
      .then(data => setDbCustomers(data || []))
      .catch(() => setDbCustomers([]))
      .finally(() => setCustomersLoading(false))
  }, [restaurantId])

  // ── Core data derivation ────────────────────────────────────────────────
  const { customers, chartData, stats } = useMemo(() => {
    const history = orderHistory || []
    const rawCustomers = dbCustomers || []
    const spendMap = {}
    const visitsMap = {}
    history.forEach(order => {
      const name = order.customerName || order.customer_name || 'Guest Customer'
      if (name) {
        spendMap[name] = (spendMap[name] || 0) + (Number(order.total) || 0)
        visitsMap[name] = (visitsMap[name] || 0) + 1
      }
    })
    const buildFromDB = rawCustomers.map(c => {
      const name = c.name || 'Guest Customer'
      const totalSpent = spendMap[name] || 0
      const visits = visitsMap[name] || 1
      let tag = 'New'
      if (visits > 5 || totalSpent > 10000) tag = 'VIP'
      else if (visits > 1) tag = 'Regular'
      const daysAgo = daysSince(c.last_visit || c.created_at || Date.now())
      const health = daysAgo > 45 ? 'At Risk' : 'Healthy'
      return {
        id: c.id || Math.random().toString(), name, email: c.email || '', phone: c.phone || '',
        visits, totalSpent, lastVisit: c.last_visit || c.created_at || new Date().toISOString(),
        firstVisit: c.created_at || new Date().toISOString(), tag, health, status: 'Active', orders: [],
      }
    }).sort((a, b) => b.totalSpent - a.totalSpent)

    const map = {}
    history.forEach(order => {
      const name = order.customerName || order.customer_name || 'Guest Customer'
      const dateRaw = order.createdAt || order.created_at || new Date().toISOString()
      if (!map[name]) {
        map[name] = {
          id: order.id || Math.random().toString(), name, visits: 0, totalSpent: 0,
          lastVisit: dateRaw, firstVisit: dateRaw, email: order.customerEmail || '',
          phone: order.customerPhone || order.phone || '', tag: 'New', health: 'Healthy', orders: [], status: 'Active',
        }
      }
      map[name].visits += 1
      map[name].totalSpent += (Number(order.total) || 0)
      map[name].orders.push(order)
      if (new Date(dateRaw) > new Date(map[name].lastVisit)) map[name].lastVisit = dateRaw
    })
    const fallbackList = Object.values(map).map(c => {
      let tag = 'New'
      if (c.visits > 5 || c.totalSpent > 10000) tag = 'VIP'
      else if (c.visits > 1) tag = 'Regular'
      const daysAgo = daysSince(c.lastVisit)
      if (daysAgo > 45) tag = 'At Risk'
      return { ...c, tag, health: daysAgo > 45 ? 'At Risk' : 'Healthy' }
    }).sort((a, b) => b.totalSpent - a.totalSpent)

    const finalList = buildFromDB.length > 0 ? buildFromDB : fallbackList
    const dailySignups = {}
    rawCustomers.forEach(c => {
      if (!c.created_at) return
      const key = new Date(c.created_at).toISOString().split('T')[0]
      dailySignups[key] = (dailySignups[key] || 0) + 1
    })
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const k = d.toISOString().split('T')[0]
      last7Days.push({ date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), count: dailySignups[k] || 0 })
    }
    const retentionRate = finalList.length > 0 ? (finalList.filter(c => c.visits > 1).length / finalList.length) * 100 : 0
    const totalRevenue = finalList.reduce((s, c) => s + (c.totalSpent || 0), 0)
    const totalVisits = Math.max(finalList.reduce((s, c) => s + c.visits, 0), 1)
    const avgOrderVal = finalList.length > 0 ? totalRevenue / totalVisits : 0
    return {
      customers: finalList,
      chartData: last7Days,
      stats: {
        total: finalList.length,
        vip: finalList.filter(c => c.tag === 'VIP').length,
        regular: finalList.filter(c => c.tag === 'Regular').length,
        new: finalList.filter(c => c.tag === 'New').length,
        atRisk: finalList.filter(c => c.health === 'At Risk').length,
        retention: retentionRate.toFixed(1),
        revenue: totalRevenue,
        avgOrderVal,
      },
    }
  }, [dbCustomers, orderHistory])

  const filteredCustomers = useMemo(() => {
    let list = customers.filter(c => {
      const q = searchTerm.toLowerCase()
      const matchSearch = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      const matchTier = tierFilter === 'All Tiers' || c.tag === tierFilter || (tierFilter === 'At Risk' && c.health === 'At Risk')
      return matchSearch && matchTier
    })
    list = [...list].sort((a, b) => {
      const va = sortBy === 'score' ? loyaltyScore(a) : (a[sortBy] ?? 0)
      const vb = sortBy === 'score' ? loyaltyScore(b) : (b[sortBy] ?? 0)
      return sortDir === 'desc' ? vb - va : va - vb
    })
    return list
  }, [customers, searchTerm, tierFilter, sortBy, sortDir])

  const segmentData = [
    { name: 'VIP', value: stats.vip, fill: '#f59e0b' },
    { name: 'Regular', value: stats.regular, fill: '#3b82f6' },
    { name: 'New', value: stats.new, fill: '#0d9488' },
    { name: 'At Risk', value: stats.atRisk, fill: '#ef4444' },
  ].filter(s => s.value > 0)

  const tierRevenueData = useMemo(() => {
    const map = { VIP: 0, Regular: 0, New: 0, 'At Risk': 0 }
    customers.forEach(c => { map[c.tag] = (map[c.tag] || 0) + c.totalSpent })
    return Object.entries(map).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
  }, [customers])

  const topCustomers = useMemo(() => [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5), [customers])
  const atRiskCustomers = useMemo(() => customers.filter(c => c.health === 'At Risk').slice(0, 4), [customers])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }
  const SortIcon = ({ col }) => sortBy === col
    ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline ml-1" /> : <ChevronUp className="w-3 h-3 inline ml-1" />)
    : null

  // ── Header ─────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="hidden lg:block sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-8 py-5 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            <span>Dashboard</span><ChevronRight className="w-3 h-3" /><span className="text-teal-600">Customer Intelligence</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Customer CRM
            <Badge className="bg-teal-50 text-teal-700 border-teal-100 text-[10px] font-bold">
              <Sparkles className="w-3 h-3 mr-1" />PRO
            </Badge>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex -space-x-2">
            {customers.slice(0, 4).map((c, i) => (
              <div key={i} className={cn('w-8 h-8 rounded-full border-2 border-white bg-linear-to-br flex items-center justify-center text-[10px] font-bold text-white shadow-sm', avatarColor(c.name))}>
                {c.name.charAt(0)}
              </div>
            ))}
            {customers.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">+{customers.length - 4}</div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl border-gray-200 h-10 font-semibold shadow-none">
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={() => exportCSV(customers)} className="font-medium cursor-pointer">Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPDF(customers, stats, restaurantName)} className="font-medium cursor-pointer text-teal-600 focus:text-teal-700">Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white h-10 font-semibold shadow-none"
            onClick={() => { setIsRefreshing(true); refreshOrders?.(); setTimeout(() => setIsRefreshing(false), 1500) }}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />Sync
          </Button>
        </div>
      </div>
    </div>
  )

  // ── Overview tab ────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 6 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Users}           label="Total Customers"  value={stats.total}                       color="teal"   trend={12} badge="All" />
        <StatCard icon={Crown}           label="VIP Members"       value={stats.vip}                         color="amber"  badge="VIP" />
        <StatCard icon={Activity}        label="Retention Rate"    value={`${stats.retention}%`}             color="blue"   trend={3}  badge="Live" />
        <StatCard icon={CreditCard}      label="Lifetime Revenue"  value={fmtCurrency(stats.revenue)}        color="indigo" badge="LTV" />
        <StatCard icon={BadgeDollarSign} label="Avg Order Value"   value={fmtCurrency(stats.avgOrderVal)}    color="violet" badge="AOV" />
        <StatCard icon={AlertTriangle}   label="At-Risk Customers" value={stats.atRisk}                      color="red"    badge="Risk" />
      </div>

      {/* Growth chart + Segment donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 p-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-600" />Customer Growth</CardTitle>
            <CardDescription className="text-xs">New customers over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-60">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={180}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,.08)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2.5} fill="url(#growthGrad)" dot={{ fill: '#0d9488', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 p-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><PieIcon className="w-4 h-4 text-blue-600" />Customer Segments</CardTitle>
            <CardDescription className="text-xs">Distribution by loyalty tier</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center">
            <div className="h-40 w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={140}>
                  <PieChart>
                    <Pie
                      data={segmentData.length > 0 ? segmentData : [{ name: 'No data', value: 1, fill: '#e5e7eb' }]}
                      innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value"
                    >
                      {(segmentData.length > 0 ? segmentData : [{ fill: '#e5e7eb' }]).map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="w-full grid grid-cols-2 gap-2 mt-2">
              {[{ label: 'VIP', color: 'bg-amber-400' }, { label: 'Regular', color: 'bg-blue-500' }, { label: 'New', color: 'bg-teal-500' }, { label: 'At Risk', color: 'bg-red-400' }].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', s.color)} /><span className="text-[11px] text-gray-500">{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top customers leaderboard + At-risk alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 p-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" />Top Customers</CardTitle>
            <CardDescription className="text-xs">Ranked by lifetime value</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Users className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No customers yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {topCustomers.map((c, i) => {
                  const tier = TIER_META[c.tag] || TIER_META.New
                  const TierIcon = tier.icon
                  const score = loyaltyScore(c)
                  return (
                    <CustomerProfileDialog key={c.id} customer={c}>
                      <div className="flex items-center gap-4 p-4 hover:bg-gray-50/70 cursor-pointer transition-colors group">
                        <div className="w-7 text-center">
                          {i === 0 ? <Crown className="w-5 h-5 text-amber-400 mx-auto" />
                            : i === 1 ? <span className="text-sm font-black text-gray-400">2</span>
                            : <span className="text-sm font-bold text-gray-300">{i + 1}</span>}
                        </div>
                        <div className={cn('w-10 h-10 rounded-xl bg-linear-to-br flex items-center justify-center text-sm font-black text-white shadow-sm', avatarColor(c.name))}>
                          {c.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                            <Badge variant="outline" className={cn('text-[10px] py-0 h-4 border', tier.text, tier.border)}>
                              <TierIcon className="w-2.5 h-2.5 mr-0.5" />{c.tag}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-linear-to-r from-teal-400 to-teal-600 rounded-full" style={{ width: `${score}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 font-semibold">{score}/100</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">{fmtCurrency(c.totalSpent)}</p>
                          <p className="text-[10px] text-gray-400">{c.visits} visits</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                      </div>
                    </CustomerProfileDialog>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 p-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-red-500" />At-Risk Alerts</CardTitle>
            <CardDescription className="text-xs">Haven't visited in 45+ days</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {atRiskCustomers.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-400">
                <CheckCircle2 className="w-8 h-8 mb-2 text-green-400" />
                <p className="text-sm font-medium">All customers are active!</p>
              </div>
            ) : atRiskCustomers.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                <div className={cn('w-9 h-9 rounded-xl bg-linear-to-br flex items-center justify-center text-sm font-black text-white shadow-sm shrink-0', avatarColor(c.name))}>
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{c.name}</p>
                  <p className="text-[10px] text-red-500 font-semibold">{daysSince(c.lastVisit)}d since last visit</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 shrink-0">Risk</Badge>
              </div>
            ))}
            {atRiskCustomers.length > 0 && (
              <Button size="sm" variant="outline" className="w-full rounded-xl border-red-100 text-red-600 hover:bg-red-50 text-xs font-semibold">
                Send Re-engagement Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Tier */}
      {tierRevenueData.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 p-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><BarChart2 className="w-4 h-4 text-indigo-600" />Revenue by Customer Tier</CardTitle>
            <CardDescription className="text-xs">Lifetime revenue breakdown across loyalty tiers</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-50">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierRevenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,.08)', fontSize: 12 }}
                    formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {tierRevenueData.map((_, i) => (
                      <Cell key={i} fill={['#f59e0b', '#3b82f6', '#0d9488', '#ef4444'][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ── Segments tab ────────────────────────────────────────────────────────
  const renderSegments = () => {
    const segs = [
      { key: 'VIP',      label: 'VIP Champions',    desc: 'High spend & frequent visitors',   icon: Crown,         color: 'amber', count: stats.vip,     revenue: customers.filter(c => c.tag === 'VIP').reduce((s, c) => s + c.totalSpent, 0) },
      { key: 'Regular',  label: 'Regular Guests',   desc: 'Multiple repeat visits',           icon: Repeat2,       color: 'blue',  count: stats.regular, revenue: customers.filter(c => c.tag === 'Regular').reduce((s, c) => s + c.totalSpent, 0) },
      { key: 'New',      label: 'New Customers',    desc: 'First-time or single visit',       icon: UserPlus,      color: 'teal',  count: stats.new,     revenue: customers.filter(c => c.tag === 'New').reduce((s, c) => s + c.totalSpent, 0) },
      { key: 'At Risk',  label: 'At-Risk Customers',desc: "Haven't visited in 45+ days",     icon: AlertTriangle, color: 'red',   count: stats.atRisk,  revenue: customers.filter(c => c.health === 'At Risk').reduce((s, c) => s + c.totalSpent, 0) },
    ]
    const CM = {
      amber: { card: 'border-amber-100 bg-amber-50/30', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-400' },
      blue:  { card: 'border-blue-100 bg-blue-50/30',   icon: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-100 text-blue-700 border-blue-200',   bar: 'bg-blue-400'  },
      teal:  { card: 'border-teal-100 bg-teal-50/30',   icon: 'bg-teal-100 text-teal-600',   badge: 'bg-teal-100 text-teal-700 border-teal-200',   bar: 'bg-teal-500'  },
      red:   { card: 'border-red-100 bg-red-50/30',     icon: 'bg-red-100 text-red-600',     badge: 'bg-red-100 text-red-700 border-red-200',     bar: 'bg-red-400'   },
    }
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {segs.map(seg => {
            const c = CM[seg.color]; const Icon = seg.icon
            const pct = stats.total > 0 ? Math.round((seg.count / stats.total) * 100) : 0
            const segC = customers.filter(cu => seg.key === 'At Risk' ? cu.health === 'At Risk' : cu.tag === seg.key)
            return (
              <Card key={seg.key} className={cn('border shadow-sm rounded-2xl overflow-hidden', c.card)}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.icon)}><Icon className="w-5 h-5" /></div>
                    <Badge className={cn('text-[10px] border', c.badge)}>{pct}% of base</Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{seg.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{seg.desc}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Members</p>
                      <p className="text-xl font-black text-gray-900">{seg.count}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Revenue</p>
                      <p className="text-sm font-black text-gray-900">{fmtCurrency(seg.revenue)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-semibold mb-1">
                      <span>Share of customer base</span><span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-100">
                      <div className={cn('h-full rounded-full transition-all', c.bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {segC.length > 0 && (
                    <div className="flex -space-x-2">
                      {segC.slice(0, 5).map((cu, i) => (
                        <div key={i} className={cn('w-7 h-7 rounded-full border-2 border-white bg-linear-to-br flex items-center justify-center text-[9px] font-black text-white', avatarColor(cu.name))}>
                          {cu.name.charAt(0)}
                        </div>
                      ))}
                      {segC.length > 5 && <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500">+{segC.length - 5}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        {/* Avg LTV per segment */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 p-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><Target className="w-4 h-4 text-violet-600" />Average LTV per Segment</CardTitle>
            <CardDescription className="text-xs">Average lifetime value per customer by tier</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {segs.map(seg => {
              const c = CM[seg.color]
              const avgLTV = seg.count > 0 ? seg.revenue / seg.count : 0
              const maxLTV = Math.max(...segs.map(s => s.count > 0 ? s.revenue / s.count : 0), 1)
              const pct = Math.round((avgLTV / maxLTV) * 100)
              return (
                <div key={seg.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">{seg.label}</span>
                    <span className="text-xs font-black text-gray-900">{fmtCurrency(avgLTV)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700', c.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Insights tab ────────────────────────────────────────────────────────
  const renderInsights = () => {
    const avgVisitFreq = customers.length > 0 ? (customers.reduce((s, c) => s + c.visits, 0) / customers.length).toFixed(1) : '0'
    const churnRisk = stats.atRisk
    const healthyPct = stats.total > 0 ? Math.round(((stats.total - stats.atRisk) / stats.total) * 100) : 0
    const vipRevenuePct = stats.total > 0
      ? Math.round((customers.filter(c => c.tag === 'VIP').reduce((s, c) => s + c.totalSpent, 0) / Math.max(stats.revenue, 1)) * 100)
      : 0
    const radarData = [
      { subject: 'Retention',   A: parseFloat(String(stats.retention || '0')),                               fullMark: 100 },
      { subject: 'VIP %',       A: stats.total > 0 ? Math.round((stats.vip / stats.total) * 100) : 0,       fullMark: 100 },
      { subject: 'Health',      A: healthyPct,                                                                fullMark: 100 },
      { subject: 'Engagement',  A: Math.min(parseFloat(String(avgVisitFreq)) * 10, 100),                     fullMark: 100 },
      { subject: 'LTV Index',   A: Math.min(Math.round(stats.avgOrderVal / 1000), 100),                     fullMark: 100 },
    ]
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Repeat2}      label="Avg Visit Frequency"  value={`${avgVisitFreq}x`}              color="teal" />
          <StatCard icon={TrendingDown} label="Churn Risk Count"      value={churnRisk}                       color="red" />
          <StatCard icon={Heart}        label="Overall Health"        value={`${healthyPct}%`}                color="blue" />
          <StatCard icon={ShoppingBag}  label="Avg Order Value"       value={fmtCurrency(stats.avgOrderVal)}  color="violet" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-50 p-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-600" />Business Health Radar</CardTitle>
              <CardDescription className="text-xs">Multi-dimensional performance score</CardDescription>
            </CardHeader>
            <CardContent className="p-4 h-70">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Radar name="Your Restaurant" dataKey="A" stroke="#0d9488" fill="#0d9488" fillOpacity={0.12} strokeWidth={2} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <div className="space-y-4">
            {[
              { icon: UserCheck,    title: 'Loyalty Program Health',  desc: `${stats.vip} VIP members driving ${vipRevenuePct}% of revenue`,                                                          accent: 'border-amber-100 bg-amber-50/30',  iconCls: 'bg-amber-100 text-amber-600' },
              { icon: Percent,      title: 'Retention Analysis',       desc: `${stats.retention}% of customers have repeat visits — above the 60% industry average`,                                    accent: 'border-teal-100 bg-teal-50/30',    iconCls: 'bg-teal-100 text-teal-600' },
              { icon: AlertTriangle,title: 'Churn Risk Alert',          desc: `${churnRisk} customer${churnRisk !== 1 ? 's' : ''} at risk. Re-engage within 7 days to recover revenue.`,                 accent: 'border-red-100 bg-red-50/30',      iconCls: 'bg-red-100 text-red-600' },
              { icon: Sparkles,     title: 'Growth Opportunity',        desc: `Converting ${stats.new} new customers to regulars could increase LTV by an estimated 3–5×`,                              accent: 'border-violet-100 bg-violet-50/30',iconCls: 'bg-violet-100 text-violet-600' },
            ].map(({ icon: Icon, title, desc, accent, iconCls }) => (
              <div key={title} className={cn('flex items-start gap-4 p-4 rounded-xl border', accent)}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconCls)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Registry tab ────────────────────────────────────────────────────────
  const renderDatabase = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-gray-50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Database Registry</CardTitle>
                <CardDescription className="text-xs">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found</CardDescription>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-gray-200 shadow-none font-semibold">
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => exportCSV(filteredCustomers)} className="font-medium cursor-pointer">Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPDF(filteredCustomers, stats, restaurantName)} className="font-medium cursor-pointer text-teal-600 focus:text-teal-700">Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50 bg-gray-50/50">
                <TableHead className="font-bold text-gray-500 text-xs">Customer</TableHead>
                <TableHead className="font-bold text-gray-500 text-xs">Tier</TableHead>
                <TableHead className="font-bold text-gray-500 text-xs cursor-pointer hover:text-teal-600" onClick={() => toggleSort('visits')}>Visits<SortIcon col="visits" /></TableHead>
                <TableHead className="font-bold text-gray-500 text-xs">Health</TableHead>
                <TableHead className="font-bold text-gray-500 text-xs cursor-pointer hover:text-teal-600" onClick={() => toggleSort('score')}>Loyalty<SortIcon col="score" /></TableHead>
                <TableHead className="font-bold text-gray-500 text-xs">Last Visit</TableHead>
                <TableHead className="font-bold text-gray-500 text-xs cursor-pointer hover:text-teal-600 text-right" onClick={() => toggleSort('totalSpent')}>LTV<SortIcon col="totalSpent" /></TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No customers match your filter</p>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.map((customer, idx) => {
                const tier = TIER_META[customer.tag] || TIER_META.New
                const score = loyaltyScore(customer)
                const scoreColor = score >= 75 ? 'bg-amber-400' : score >= 45 ? 'bg-teal-500' : score >= 20 ? 'bg-blue-400' : 'bg-gray-300'
                return (
                  <TableRow key={idx} className="group hover:bg-gray-50/70 transition-colors border-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-xl bg-linear-to-br flex items-center justify-center text-sm font-black text-white shadow-sm', avatarColor(customer.name))}>
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{customer.name}</div>
                          <div className="text-[11px] text-gray-400 truncate max-w-40">{customer.email || customer.phone || '—'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px] font-bold border', tier.text, tier.bg, tier.border)}>
                        {customer.tag}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Repeat2 className="w-3 h-3 text-gray-300" />
                        <span className="text-sm font-semibold text-gray-700">{customer.visits}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold', customer.health === 'Healthy' ? 'text-green-600' : 'text-red-500')}>
                        <div className={cn('w-1.5 h-1.5 rounded-full', customer.health === 'Healthy' ? 'bg-green-500' : 'bg-red-400')} />
                        {customer.health}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', scoreColor)} style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500">{score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-gray-700">{new Date(customer.lastVisit).toLocaleDateString('en-IN')}</div>
                      <div className="text-[10px] text-gray-400">{daysSince(customer.lastVisit)}d ago</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-black text-gray-900">{fmtCurrency(customer.totalSpent)}</span>
                    </TableCell>
                    <TableCell>
                      <CustomerProfileDialog customer={customer}>
                        <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </CustomerProfileDialog>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )

  if (ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">Synchronizing Database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 w-full pb-32 lg:pb-12 relative overflow-hidden">
      {!isPremium && <PremiumLock navigate={navigate} setActiveItem={setActiveItem} />}
      <div className={cn('transition-all duration-700', !isPremium && 'blur-xl grayscale-[0.5] opacity-50 pointer-events-none scale-[0.98]')}>

        {renderHeader()}
        <div className="px-4 md:px-8 space-y-6 relative">
          <Tabs defaultValue="overview" className="w-full shadow-none border-0" onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <TabsList className="bg-white border p-1 h-11 rounded-xl shadow-sm border-gray-100 w-full sm:w-auto overflow-x-auto shrink-0">
                <TabsTrigger value="overview" className="rounded-lg px-4 data-[state=active]:bg-teal-600 data-[state=active]:text-white shadow-none transition-all text-xs font-semibold gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />Overview
                </TabsTrigger>
                <TabsTrigger value="segments" className="rounded-lg px-4 data-[state=active]:bg-teal-600 data-[state=active]:text-white shadow-none transition-all text-xs font-semibold gap-1.5">
                  <Layers className="w-3.5 h-3.5" />Segments
                </TabsTrigger>
                <TabsTrigger value="insights" className="rounded-lg px-4 data-[state=active]:bg-teal-600 data-[state=active]:text-white shadow-none transition-all text-xs font-semibold gap-1.5">
                  <Zap className="w-3.5 h-3.5" />Insights
                </TabsTrigger>
                <TabsTrigger value="database" className="rounded-lg px-4 data-[state=active]:bg-teal-600 data-[state=active]:text-white shadow-none transition-all text-xs font-semibold gap-1.5">
                  <Users className="w-3.5 h-3.5" />Registry
                </TabsTrigger>
              </TabsList>
              {activeTab === 'database' && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email…"
                      className="pl-10 h-10 rounded-xl border-gray-100 bg-white shadow-sm text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="rounded-xl border-gray-200 shadow-none w-full sm:w-35 h-10 bg-white text-sm">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <SelectValue placeholder="All Tiers" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-100 shadow-2xl rounded-2xl p-1">
                      <SelectItem value="All Tiers" className="rounded-xl font-bold py-2.5 text-sm">All Tiers</SelectItem>
                      <SelectItem value="VIP" className="rounded-xl font-bold py-2.5 text-sm text-amber-600">VIP Members</SelectItem>
                      <SelectItem value="Regular" className="rounded-xl font-bold py-2.5 text-sm text-blue-600">Regulars</SelectItem>
                      <SelectItem value="New" className="rounded-xl font-bold py-2.5 text-sm text-teal-600">New Signups</SelectItem>
                      <SelectItem value="At Risk" className="rounded-xl font-bold py-2.5 text-sm text-red-600">At Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <TabsContent value="overview" className="shadow-none border-0 focus-visible:outline-none">
              {renderOverview()}
            </TabsContent>
            
            <TabsContent value="segments" className="shadow-none border-0 focus-visible:outline-none">
              {renderSegments()}
            </TabsContent>

            <TabsContent value="insights" className="shadow-none border-0 focus-visible:outline-none">
              {renderInsights()}
            </TabsContent>
            
            <TabsContent value="database" className="shadow-none border-0 focus-visible:outline-none">
              {renderDatabase()}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default CustomerManagement
