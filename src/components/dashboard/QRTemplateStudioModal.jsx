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
import { supabase } from '@/lib/supabase'
import { getCachedRestaurantId } from '@/lib/api'

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

// 🛠️ Dynamic Canvas Standee Generator (300 DPI) with Proportional 1:1 Preview Matching
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

  const aspectRatio = height / width
  const isSquare = aspectRatio < 1.15

  const W = width
  const H = height

  // 1. Fill Background & Outer Card Border
  const cardRadius = Math.round(W * 0.075)
  ctx.fillStyle = colors.bg
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, cardRadius)
  ctx.fill()

  ctx.strokeStyle = colors.cardBorder
  ctx.lineWidth = Math.max(4, Math.round(W * 0.0055))
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, cardRadius)
  ctx.stroke()

  // 2. Corner Bracket Accents (cleanly inset inside the card corners)
  const margin = Math.round(W * 0.038)
  const bracketOffset = Math.round(W * 0.045)
  const bracketLen = Math.round(W * 0.045)
  ctx.lineWidth = Math.max(2, Math.round(W * 0.004))
  ctx.strokeStyle = colors.accent
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Top-Left
  ctx.beginPath()
  ctx.moveTo(bracketOffset, bracketOffset + bracketLen)
  ctx.lineTo(bracketOffset, bracketOffset)
  ctx.lineTo(bracketOffset + bracketLen, bracketOffset)
  ctx.stroke()

  // Top-Right
  ctx.beginPath()
  ctx.moveTo(W - bracketOffset - bracketLen, bracketOffset)
  ctx.lineTo(W - bracketOffset, bracketOffset)
  ctx.lineTo(W - bracketOffset, bracketOffset + bracketLen)
  ctx.stroke()

  // Bottom-Left
  ctx.beginPath()
  ctx.moveTo(bracketOffset, H - bracketOffset - bracketLen)
  ctx.lineTo(bracketOffset, H - bracketOffset)
  ctx.lineTo(bracketOffset + bracketLen, H - bracketOffset)
  ctx.stroke()

  // Bottom-Right
  ctx.beginPath()
  ctx.moveTo(W - bracketOffset - bracketLen, H - bracketOffset)
  ctx.lineTo(W - bracketOffset, H - bracketOffset)
  ctx.lineTo(W - bracketOffset, H - bracketOffset - bracketLen)
  ctx.stroke()

  // Generate QR Code image upfront
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    scale: 14,
    color: { dark: '#000000', light: '#ffffff' }
  })
  const qrImg = new Image()
  qrImg.src = qrDataUrl
  await new Promise((resolve) => {
    qrImg.onload = resolve
    qrImg.onerror = resolve
  })

  // Pre-load logo image if provided
  let loadedLogoImg = null
  if (restaurantLogo) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = restaurantLogo
      await new Promise((resolve) => {
        img.onload = () => { loadedLogoImg = img; resolve() }
        img.onerror = resolve
      })
    } catch {
      loadedLogoImg = null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 🔲 1. DEDICATED SQUARE LAYOUT (3" × 3" / Compact Disc / Sticker)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isSquare) {
    const padTop = Math.round(H * 0.035)
    const padBottom = Math.round(H * 0.035)
    const padX = margin + Math.round(W * 0.035)

    // --- Header (Top Bar: Logo + Name left, Table Pill right) ---
    const headerY = margin + padTop
    const logoSize = Math.round(W * 0.13)

    if (loadedLogoImg) {
      const logoX = padX
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(logoX, headerY, logoSize, logoSize, Math.round(logoSize * 0.28))
      ctx.clip()
      ctx.drawImage(loadedLogoImg, logoX, headerY, logoSize, logoSize)
      ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = Math.max(2, Math.round(W * 0.0035))
      ctx.beginPath()
      ctx.roundRect(logoX, headerY, logoSize, logoSize, Math.round(logoSize * 0.28))
      ctx.stroke()
    } else {
      const logoX = padX
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.roundRect(logoX, headerY, logoSize, logoSize, Math.round(logoSize * 0.28))
      ctx.fill()
      ctx.fillStyle = colors.bg
      ctx.font = `bold ${Math.round(logoSize * 0.5)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(restaurantName.charAt(0).toUpperCase(), logoX + logoSize / 2, headerY + logoSize / 2)
    }

    // Name + Standee subtext
    const textLeftX = padX + logoSize + Math.round(W * 0.02)
    const nameFontSize = Math.round(W * 0.04)
    ctx.fillStyle = colors.text
    ctx.font = `900 ${nameFontSize}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(restaurantName.toUpperCase(), textLeftX, headerY + Math.round(H * 0.008))

    const subFontSize = Math.round(W * 0.022)
    ctx.fillStyle = colors.subText
    ctx.font = `bold ${subFontSize}px sans-serif`
    ctx.fillText('TABLE STANDEE', textLeftX, headerY + nameFontSize + Math.round(H * 0.015))

    // Table Pill on Right
    const tableText = `TABLE #${tableNumber}`
    const pillFontSize = Math.round(W * 0.03)
    ctx.font = `bold ${pillFontSize}px sans-serif`
    const pillTextW = ctx.measureText(tableText).width
    const pillW = pillTextW + Math.round(W * 0.05)
    const pillH = Math.round(W * 0.065)
    const pillX = W - padX - pillW
    const pillY = headerY + (logoSize - pillH) / 2

    ctx.fillStyle = colors.pillBg
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
    ctx.fill()
    ctx.strokeStyle = colors.pillBorder
    ctx.lineWidth = Math.max(1.5, Math.round(W * 0.003))
    ctx.stroke()
    ctx.fillStyle = colors.pillText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(tableText, pillX + pillW / 2, pillY + pillH / 2)

    const headerBottom = headerY + logoSize

    // --- Footer (Bottom: Action Pill + Powered by) ---
    const footerBottom = H - margin - padBottom
    const servoraFontSize = Math.round(W * 0.02)
    const servoraY = footerBottom - servoraFontSize
    ctx.fillStyle = colors.subText
    ctx.font = `bold ${servoraFontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('POWERED BY SERVORA CLOUD POS', W / 2, servoraY)

    const actionText = '📸 SCAN CAMERA TO ORDER'
    const actionFontSize = Math.round(W * 0.026)
    ctx.font = `900 ${actionFontSize}px sans-serif`
    const actionW = ctx.measureText(actionText).width + Math.round(W * 0.07)
    const actionH = Math.round(W * 0.062)
    const actionY = servoraY - Math.round(H * 0.02) - actionH

    ctx.fillStyle = colors.badgeBg
    ctx.beginPath()
    ctx.roundRect((W - actionW) / 2, actionY, actionW, actionH, Math.round(actionH * 0.32))
    ctx.fill()
    ctx.fillStyle = colors.badgeText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(actionText, W / 2, actionY + actionH / 2)

    const footerTop = actionY

    // --- Centerpiece (QR Plate in middle) ---
    const availH = footerTop - headerBottom
    const qrBoxSize = Math.round(Math.min(W * 0.58, availH * 0.85))
    const qrBoxY = headerBottom + (availH - qrBoxSize) / 2
    const qrBoxX = (W - qrBoxSize) / 2

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, Math.round(qrBoxSize * 0.12))
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = Math.max(2, Math.round(W * 0.003))
    ctx.stroke()

    const qrPad = Math.round(qrBoxSize * 0.07)
    ctx.drawImage(qrImg, qrBoxX + qrPad, qrBoxY + qrPad, qrBoxSize - qrPad * 2, qrBoxSize - qrPad * 2)

    return canvas
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 📱 2. STANDARD / PORTRAIT & TALL STANDEE LAYOUT (Proportional 1:1 Match)
  // ─────────────────────────────────────────────────────────────────────────────

  // --- SECTION 1: HEADER (Top) ---
  const padTop = Math.round(H * 0.038)
  let curY = margin + padTop

  // 1. Logo / Circular Monogram
  const logoSize = Math.round(W * 0.14)
  const logoX = (W - logoSize) / 2

  if (loadedLogoImg) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(logoX, curY, logoSize, logoSize, Math.round(logoSize * 0.28))
    ctx.clip()
    ctx.drawImage(loadedLogoImg, logoX, curY, logoSize, logoSize)
    ctx.restore()

    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = Math.max(2, Math.round(W * 0.004))
    ctx.beginPath()
    ctx.roundRect(logoX, curY, logoSize, logoSize, Math.round(logoSize * 0.28))
    ctx.stroke()
  } else {
    ctx.fillStyle = colors.accent
    ctx.beginPath()
    ctx.roundRect(logoX, curY, logoSize, logoSize, Math.round(logoSize * 0.28))
    ctx.fill()
    ctx.fillStyle = colors.bg
    ctx.font = `bold ${Math.round(logoSize * 0.5)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(restaurantName.charAt(0).toUpperCase(), W / 2, curY + logoSize / 2)
  }
  curY += logoSize + Math.round(H * 0.015)

  // 2. Restaurant Name
  const nameFontSize = Math.min(Math.round(W * 0.048), Math.round((W * 0.78) / (restaurantName.length * 0.58)))
  ctx.fillStyle = colors.text
  ctx.font = `900 ${nameFontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(restaurantName.toUpperCase(), W / 2, curY)
  curY += nameFontSize + Math.round(H * 0.008)

  // 3. Contactless Dining Subtitle (Green Dot + Text)
  const subFontSize = Math.round(W * 0.022)
  const subText = 'CONTACTLESS DINING'
  ctx.font = `900 ${subFontSize}px sans-serif`
  const subTextW = ctx.measureText(subText).width
  const dotR = Math.round(subFontSize * 0.28)
  const dotGap = Math.round(W * 0.012)
  const totalSubW = dotR * 2 + dotGap + subTextW
  const subStartX = (W - totalSubW) / 2

  // Green Dot
  ctx.fillStyle = '#10b981'
  ctx.beginPath()
  ctx.arc(subStartX + dotR, curY + subFontSize / 2, dotR, 0, Math.PI * 2)
  ctx.fill()

  // Subtitle Text
  ctx.fillStyle = colors.subText
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(subText, subStartX + dotR * 2 + dotGap, curY)

  const headerBottom = curY + subFontSize

  // --- SECTION 3: FOOTER (Bottom) ---
  const padBottom = Math.round(H * 0.035)
  const footerBottomEdge = H - margin - padBottom

  // 1. Powered by Servora Cloud POS
  const servoraFontSize = Math.round(W * 0.018)
  const servoraY = footerBottomEdge - servoraFontSize
  const pText = 'POWERED BY '
  const sText = 'SERVORA CLOUD POS'

  ctx.font = `bold ${servoraFontSize}px sans-serif`
  const pW = ctx.measureText(pText).width
  ctx.font = `900 ${servoraFontSize}px sans-serif`
  const sW = ctx.measureText(sText).width
  const footStartX = (W - (pW + sW)) / 2

  ctx.font = `bold ${servoraFontSize}px sans-serif`
  ctx.fillStyle = colors.subText
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(pText, footStartX, servoraY)

  ctx.font = `900 ${servoraFontSize}px sans-serif`
  ctx.fillStyle = colors.accent || '#818cf8'
  ctx.fillText(sText, footStartX + pW, servoraY)

  // 2. Optional Wi-Fi Pill
  const hasWifi = showWifi && (wifiNetwork || wifiPassword)
  let wifiPillTop = servoraY
  let wifiPillH = 0

  if (hasWifi) {
    const gapFootWifi = Math.round(H * 0.014)
    wifiPillH = Math.round(W * 0.052)
    wifiPillTop = servoraY - gapFootWifi - wifiPillH

    const wifiText = `📶 Wi-Fi: ${wifiNetwork || 'Guest'} ${wifiPassword ? `• Pass: ${wifiPassword}` : ''}`
    const wifiFontSize = Math.round(W * 0.022)
    ctx.font = `bold ${wifiFontSize}px sans-serif`
    const wifiMetrics = ctx.measureText(wifiText)
    const wifiPillW = Math.min(W * 0.85, Math.max(wifiMetrics.width + Math.round(W * 0.06), Math.round(W * 0.35)))
    const wifiPillX = (W - wifiPillW) / 2

    ctx.fillStyle = colors.pillBg
    ctx.beginPath()
    ctx.roundRect(wifiPillX, wifiPillTop, wifiPillW, wifiPillH, wifiPillH / 2)
    ctx.fill()
    ctx.strokeStyle = colors.pillBorder
    ctx.lineWidth = Math.max(1.5, Math.round(W * 0.003))
    ctx.stroke()

    ctx.fillStyle = colors.pillText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(wifiText, W / 2, wifiPillTop + wifiPillH / 2)
  }

  // 3. Custom Tagline
  const gapTagline = Math.round(H * 0.014)
  const taglineFontSize = Math.round(W * 0.026)
  const taglineY = (hasWifi ? wifiPillTop : servoraY) - gapTagline - taglineFontSize

  ctx.fillStyle = colors.subText
  ctx.font = `500 ${taglineFontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(tagline, W / 2, taglineY)

  const footerTop = taglineY

  // --- SECTION 2: CENTERPIECE (Table Pill + QR Code + Scan Badge in my-auto) ---
  const availCenterSpace = footerTop - headerBottom

  // Sizing of Centerpiece items
  const pillFontSize = Math.round(W * 0.035)
  const tableText = `TABLE #${tableNumber}`
  ctx.font = `bold ${pillFontSize}px sans-serif`
  const pillTextWidth = ctx.measureText(tableText).width
  const pillWidth = Math.max(pillTextWidth + Math.round(W * 0.09), Math.round(W * 0.3))
  const pillHeight = Math.round(W * 0.068)

  const gapPillQR = Math.round(H * 0.016)

  // QR Plate Box Size: prominent ~60% of card width
  const qrBoxSize = Math.round(Math.min(W * 0.62, availCenterSpace * 0.55))

  const gapQRBadge = Math.round(H * 0.016)

  const badgeText = '📸 SCAN TO ORDER'
  const badgeFontSize = Math.round(W * 0.026)
  ctx.font = `900 ${badgeFontSize}px sans-serif`
  const badgeWidth = Math.min(W * 0.78, ctx.measureText(badgeText).width + Math.round(W * 0.075))
  const badgeHeight = Math.round(W * 0.056)

  // Total Centerpiece Height
  const centerTotalH = pillHeight + gapPillQR + qrBoxSize + gapQRBadge + badgeHeight

  // Start Y position so the entire centerpiece is centered vertically in available space
  const centerStartY = headerBottom + Math.max(12, (availCenterSpace - centerTotalH) / 2)

  // 1. Draw Table Pill
  const pillX = (W - pillWidth) / 2
  ctx.fillStyle = colors.pillBg
  ctx.beginPath()
  ctx.roundRect(pillX, centerStartY, pillWidth, pillHeight, pillHeight / 2)
  ctx.fill()
  ctx.strokeStyle = colors.pillBorder
  ctx.lineWidth = Math.max(2, Math.round(W * 0.0035))
  ctx.stroke()

  ctx.fillStyle = colors.pillText
  ctx.font = `bold ${pillFontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(tableText, W / 2, centerStartY + pillHeight / 2)

  // 2. Draw QR Code Plate Box
  const qrBoxY = centerStartY + pillHeight + gapPillQR
  const qrBoxX = (W - qrBoxSize) / 2

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, Math.round(qrBoxSize * 0.12))
  ctx.fill()

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
  ctx.lineWidth = Math.max(2, Math.round(W * 0.003))
  ctx.stroke()

  const qrPadding = Math.round(qrBoxSize * 0.08)
  ctx.drawImage(qrImg, qrBoxX + qrPadding, qrBoxY + qrPadding, qrBoxSize - qrPadding * 2, qrBoxSize - qrPadding * 2)

  // 3. Draw Scan to Order Badge
  const badgeY = qrBoxY + qrBoxSize + gapQRBadge
  const badgeX = (W - badgeWidth) / 2

  ctx.fillStyle = colors.badgeBg
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, Math.round(badgeHeight * 0.32))
  ctx.fill()

  ctx.fillStyle = colors.badgeText
  ctx.font = `900 ${badgeFontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeText, W / 2, badgeY + badgeHeight / 2)

  return canvas
}


export default function QRTemplateStudioModal({
  open,
  onOpenChange,
  qrCodes = [],
  restaurantProfile = null,
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
  const [profile, setProfile] = useState(() => restaurantProfile || {})
  const dropdownRef = useRef(null)
  const tableButtonRefs = useRef([])

  // Keep profile in sync and fetch logo if missing
  useEffect(() => {
    if (restaurantProfile && (restaurantProfile.logo_url || restaurantProfile.avatar || restaurantProfile.name)) {
      setProfile(restaurantProfile)
    }
  }, [restaurantProfile])

  useEffect(() => {
    if (open && (!profile.logo_url && !profile.avatar)) {
      const loadProfile = async () => {
        try {
          const rid = restaurantProfile?.id || getCachedRestaurantId() || (typeof window !== 'undefined' ? window.location.pathname.split('/console/')[1] : null) || 'tigerbistro99@gmail.com'
          const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
          if (rid && rid !== 'demo-merchant' && rid !== 'demo') {
            let q = null
            if (rid.includes('@')) {
              q = supabase.from('restaurants').select('*').eq('email', rid.toLowerCase()).maybeSingle()
            } else if (isUUID(rid)) {
              q = supabase.from('restaurants').select('*').eq('id', rid).maybeSingle()
            }
            if (q) {
              const { data } = await q
              if (data) {
                setProfile(prev => ({ ...data, ...prev, logo_url: data.logo_url || prev.logo_url }))
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load restaurant profile in studio modal:', e)
        }
      }
      loadProfile()
    }
  }, [restaurantProfile, open, profile.logo_url])

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
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://servora-kappa.vercel.app'
  }

  const restaurantName = profile?.name || profile?.business_name || restaurantProfile?.name || restaurantProfile?.business_name || 'Tiger Bistro'
  const restaurantLogo = profile?.logo_url || profile?.avatar || profile?.logo || restaurantProfile?.logo_url || restaurantProfile?.avatar || restaurantProfile?.logo || ''

  // Compute Active Dimensions (Inches to 300 DPI Canvas Pixels)
  const wInches = selectedFormat === 'custom'
    ? Math.max(1.5, Math.min(18, parseFloat(customWidthInches) || 4))
    : currentFormat.widthInches
  const hInches = selectedFormat === 'custom'
    ? Math.max(1.5, Math.min(24, parseFloat(customHeightInches) || 6))
    : currentFormat.heightInches
  const activeWidth = selectedFormat === 'custom'
    ? Math.round(wInches * 300)
    : currentFormat.canvasW
  const activeHeight = selectedFormat === 'custom'
    ? Math.round(hInches * 300)
    : currentFormat.canvasH

  // Aspect ratio calculation for the preview container
  const previewRatio = activeHeight / (activeWidth || 1)
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640
  const maxPreviewH = isMobileScreen ? 400 : 500
  const maxPreviewW = isMobileScreen ? 280 : 360

  let computedPreviewW = isMobileScreen ? 250 : 320
  let computedPreviewH = Math.round(computedPreviewW * previewRatio)

  if (computedPreviewH > maxPreviewH) {
    computedPreviewH = maxPreviewH
    computedPreviewW = Math.max(140, Math.round(computedPreviewH / previewRatio))
  } else if (computedPreviewW > maxPreviewW) {
    computedPreviewW = maxPreviewW
    computedPreviewH = Math.round(computedPreviewW * previewRatio)
  }

  // Micro scale factor for typography & QR sizing inside preview
  const isNarrowCard = computedPreviewW < 240
  const isSquareCard = previewRatio < 1.15

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

  // 📥 2. Export All Tables in Bulk Print-Ready PDF (Vector-Sharp 300 DPI)
  const handleDownloadBulkPDF = async () => {
    if (targetQRs.length === 0) return
    setIsExporting(true)
    setExportProgress(`Initializing 300 DPI PDF Engine for ${targetQRs.length} tables...`)

    try {
      const orientation = wInches > hInches ? 'landscape' : 'portrait'
      const pdf = new jsPDF({
        orientation,
        unit: 'in',
        format: [wInches, hInches]
      })

      const printW = wInches
      const printH = hInches
      const xOffset = 0
      const yOffset = 0

      for (let i = 0; i < targetQRs.length; i++) {
        const qr = targetQRs[i]
        setExportProgress(`Rendering Table #${qr.tableNumber} Standee (${i + 1}/${targetQRs.length})...`)

        const canvas = await generateStandeeCanvas({
          themeId: selectedTheme,
          canvasWidth: activeWidth,
          canvasHeight: activeHeight,
          restaurantName,
          restaurantLogo,
          tableNumber: qr.tableNumber,
          qrUrl: qr.url,
          tagline: customTagline,
          wifiNetwork,
          wifiPassword,
          showWifi
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage()

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, printW, printH)
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

  const [mobileTab, setMobileTab] = useState('configure') // 'configure' | 'preview'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-6xl! w-[96vw]! sm:w-[92vw]! max-h-[95dvh] sm:max-h-[90vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200/80 shadow-2xl overflow-hidden"
        showCloseButton={true}
      >
        {/* 🌟 Top Header Bar — Compact on Mobile 🌟 */}
        <div className="shrink-0 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-3 pr-8 sm:pr-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                  <span className="hidden sm:inline">Print-Ready Table Standee Studio</span>
                  <span className="sm:hidden">Standee Studio</span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                    PRO 300 DPI
                  </span>
                </DialogTitle>
                <DialogDescription className="hidden sm:block text-xs text-slate-500 font-medium">
                  Design luxury acrylic table tents, wooden blocks, and custom-sized restaurant standees.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 shrink-0">
              {targetQRs.length} {targetQRs.length === 1 ? 'Table' : 'Tables'} Ready
            </Badge>
          </div>

          {/* 📱 Mobile Tab Switcher — only visible on small screens */}
          <div className="flex sm:hidden mt-3 bg-slate-100 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setMobileTab('configure')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mobileTab === 'configure'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              ⚙️ Configure
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mobileTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              👁 Preview
            </button>
          </div>
        </div>

        {/* 🌟 Scrollable Studio Body 🌟 */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-6 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
            
            {/* 🎛️ LEFT CONTROLS PANEL (5 Columns) — hidden on mobile when Preview tab active */}
            <div className={`lg:col-span-5 space-y-4 sm:space-y-6 pb-2 ${mobileTab === 'preview' ? 'hidden sm:block' : 'block'}`}>
              
              {/* 1. Template Ambiance & Theme */}
              <div className="space-y-2 sm:space-y-2.5">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
                  <Label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-600" />
                    1. Luxury Standee Theme ({TEMPLATE_THEMES.length})
                  </Label>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold overflow-x-auto max-w-full">
                    {['all', 'luxury', 'nature', 'vibrant', 'minimal'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setThemeFilter(cat)}
                        className={`px-1.5 sm:px-2 py-0.5 rounded-md capitalize transition-all cursor-pointer whitespace-nowrap ${
                          themeFilter === cat 
                            ? 'bg-white text-slate-900 shadow-xs font-black' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1 no-scrollbar">
                  {filteredThemes.map((theme) => {
                    const isSelected = selectedTheme === theme.id
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left border transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 ring-2 ring-indigo-600/30 bg-indigo-50/40 shadow-sm scale-[1.02]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span 
                              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-white/20 shadow-xs shrink-0" 
                              style={{ backgroundColor: theme.hex.accent }}
                            />
                            <span className="font-bold text-[11px] sm:text-xs text-slate-900 truncate">{theme.name}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-500 mt-1 font-medium truncate">
                          {theme.badge}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Standee Form Factor & Dimensions */}
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  2. Form Factor & Dimensions
                </Label>

                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {FORM_FACTORS.map((format) => {
                    const isSelected = selectedFormat === format.id
                    return (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => setSelectedFormat(format.id)}
                        className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 ring-2 ring-indigo-600/30 bg-indigo-50/40 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        } ${format.id === 'custom' ? 'col-span-2' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] sm:text-xs text-slate-900">{format.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block mt-0.5 truncate">
                          {format.sub}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Custom Dimensions Editor */}
                {selectedFormat === 'custom' && (
                  <div className="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl space-y-3 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        Custom Canvas Dimensions (Inches)
                      </span>
                      <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        {activeWidth} × {activeHeight} px (300 DPI)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-[10px] font-bold text-slate-600">Width (Inches)</Label>
                        <Input 
                          type="number"
                          step="0.1"
                          min="1.5"
                          max="18"
                          value={customWidthInches}
                          onChange={(e) => setCustomWidthInches(e.target.value)}
                          className="h-9 text-xs rounded-xl bg-white border-slate-200 font-bold text-slate-900"
                          placeholder="4.0"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-slate-600">Height (Inches)</Label>
                        <Input 
                          type="number"
                          step="0.1"
                          min="1.5"
                          max="24"
                          value={customHeightInches}
                          onChange={(e) => setCustomHeightInches(e.target.value)}
                          className="h-9 text-xs rounded-xl bg-white border-slate-200 font-bold text-slate-900"
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
                <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  {/* Top row: label + jump selector + counter */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Table <strong className="text-slate-900">#{currentPreviewQR.tableNumber}</strong>
                      </span>
                    </div>

                    {/* Quick Jump + Counter */}
                    <div className="flex items-center gap-2 relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
                        className="h-7 px-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                      >
                        <span>#{currentPreviewQR.tableNumber}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isTableDropdownOpen ? 'rotate-180 text-indigo-600' : 'text-slate-500'}`} />
                      </button>

                      {isTableDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-2 z-50 w-64 p-3 bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl rounded-2xl animate-in fade-in-50 zoom-in-95 duration-150 space-y-2">
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
                            className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto no-scrollbar p-1"
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

                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                        {previewTableIndex + 1}/{targetQRs.length}
                      </span>
                    </div>
                  </div>

                  {/* Stepper: Chevrons + scrollable pill track */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={previewTableIndex === 0}
                      onClick={() => setPreviewTableIndex(prev => Math.max(0, prev - 1))}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                      title="Previous Table"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div 
                      className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {targetQRs.map((qr, idx) => (
                        <button
                          key={qr.tableNumber}
                          ref={(el) => { tableButtonRefs.current[idx] = el }}
                          type="button"
                          onClick={() => setPreviewTableIndex(idx)}
                          className={`h-9 min-w-9 px-2.5 rounded-xl font-black text-[11px] transition-all cursor-pointer shrink-0 flex items-center justify-center border ${
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
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                      title="Next Table"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 📥 EXPORT ACTION BUTTONS — hidden on mobile (shown in sticky footer instead) */}
              <div className="hidden sm:block pt-2 space-y-2.5">
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

            {/* 🖼️ RIGHT LIVE VISUAL STAND PREVIEW (7 Columns) — shown on lg or when preview tab active on mobile */}
            <div className={`lg:col-span-7 flex flex-col items-center justify-center bg-slate-200/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-10 border border-slate-300/80 min-h-80 sm:min-h-120 lg:min-h-140 ${mobileTab === 'configure' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 sm:mb-5 flex items-center gap-1.5 text-center">
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live 1:1 Print Preview ({wInches}" × {hInches}" • {activeWidth} × {activeHeight} px)</span>
                <span className="sm:hidden">Live Preview • {wInches}" × {hInches}"</span>
              </div>

              {/* 🌟 DYNAMIC ADAPTIVE LIVE VISUAL STANDEE PREVIEW CARD 🌟 */}
              <div 
                className={`relative overflow-hidden transition-all duration-300 flex flex-col items-center text-center justify-between border-2 ${activeTheme.bgColor} ${activeTheme.cardBorder} rounded-[2.2rem] shadow-2xl`}
                style={{ 
                  boxSizing: 'border-box',
                  width: `${computedPreviewW}px`,
                  height: `${computedPreviewH}px`,
                  padding: isSquareCard ? '16px 14px' : (isNarrowCard ? '16px 12px' : '22px 18px'),
                }}
              >
                {/* Corner Accents */}
                <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400/40 pointer-events-none" />
                <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400/40 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400/40 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400/40 pointer-events-none" />

                {isSquareCard ? (
                  /* 🔲 DEDICATED COMPACT 3" × 3" SQUARE BLOCK / STICKER LAYOUT */
                  <>
                    {/* 1. Top Compact Header: Brand Logo, Name & Table Pill */}
                    <div className="flex items-center justify-between w-full px-1 pt-0.5">
                      <div className="flex items-center gap-2 text-left min-w-0">
                        {restaurantLogo ? (
                          <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/20 shadow-xs shrink-0">
                            <img src={restaurantLogo} alt="Logo" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                            {restaurantName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className={`font-black uppercase tracking-tight text-xs leading-tight truncate ${activeTheme.textColor}`}>
                            {restaurantName}
                          </h3>
                          <span className={`text-[7.5px] font-bold uppercase tracking-wider block ${activeTheme.subTextColor}`}>
                            Table Standee
                          </span>
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-full border shadow-xs font-black text-[10px] uppercase tracking-wider shrink-0 ${activeTheme.pillBorder}`}>
                        <span>Table #{currentPreviewQR.tableNumber}</span>
                      </div>
                    </div>

                    {/* 2. Centerpiece: High-Res QR Code Plate */}
                    <div className="my-auto py-1 flex flex-col items-center">
                      <div className={`p-2.5 rounded-2xl ${activeTheme.qrBg} shadow-xl flex items-center justify-center w-36 h-36`}>
                        <img 
                          src={currentPreviewQR.qrImageUrl} 
                          alt={`QR Code for Table ${currentPreviewQR.tableNumber}`} 
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                    </div>

                    {/* 3. Bottom Action Pill & Footer */}
                    <div className="w-full space-y-1.5 pb-0.5">
                      <div className={`px-3.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider mx-auto inline-block ${activeTheme.accentBg} shadow-xs`}>
                        <span>📸 Scan Camera to Order</span>
                      </div>

                      <div className="flex items-center justify-center gap-1 text-[7px] font-black uppercase tracking-widest opacity-60 text-slate-400">
                        <span>Powered by</span>
                        <span className="text-indigo-400 font-bold">Servora Cloud POS</span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* 📱 STANDARD & TALL STANDEE LAYOUT */
                  <>
                    {/* 1. Header: Brand Logo & Restaurant Name */}
                    <div className="space-y-1.5 w-full pt-0.5">
                      {restaurantLogo ? (
                        <div 
                          className="mx-auto rounded-2xl overflow-hidden border-2 border-white/20 shadow-md shrink-0"
                          style={{ 
                            width: isNarrowCard ? '36px' : '48px', 
                            height: isNarrowCard ? '36px' : '48px' 
                          }}
                        >
                          <img src={restaurantLogo} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div 
                          className="mx-auto rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0"
                          style={{ 
                            width: isNarrowCard ? '36px' : '48px', 
                            height: isNarrowCard ? '36px' : '48px',
                            fontSize: isNarrowCard ? '14px' : '18px'
                          }}
                        >
                          {restaurantName.charAt(0)}
                        </div>
                      )}
                      
                      <div>
                        <h3 
                          className={`font-black uppercase tracking-tight leading-tight ${activeTheme.textColor}`}
                          style={{ fontSize: isNarrowCard ? '13px' : '16px' }}
                        >
                          {restaurantName}
                        </h3>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span 
                            className={`font-black uppercase tracking-widest ${activeTheme.subTextColor}`}
                            style={{ fontSize: isNarrowCard ? '7px' : '8px' }}
                          >
                            Contactless Dining
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Centerpiece: Table Pill & High-Res QR Code */}
                    <div className="my-auto space-y-2 flex flex-col items-center">
                      <div 
                        className={`rounded-full border shadow-md font-black uppercase tracking-wider ${activeTheme.pillBorder}`}
                        style={{ 
                          padding: isNarrowCard ? '3px 12px' : '5px 18px',
                          fontSize: isNarrowCard ? '11px' : '13px'
                        }}
                      >
                        <span>Table #{currentPreviewQR.tableNumber}</span>
                      </div>

                      <div 
                        className={`rounded-2xl ${activeTheme.qrBg} shadow-xl flex items-center justify-center`}
                        style={{
                          padding: isNarrowCard ? '6px' : '10px',
                          width: isNarrowCard ? `${Math.min(computedPreviewW * 0.75, 130)}px` : `${Math.min(computedPreviewW * 0.65, 155)}px`,
                          height: isNarrowCard ? `${Math.min(computedPreviewW * 0.75, 130)}px` : `${Math.min(computedPreviewW * 0.65, 155)}px`,
                        }}
                      >
                        <img 
                          src={currentPreviewQR.qrImageUrl} 
                          alt={`QR Code for Table ${currentPreviewQR.tableNumber}`} 
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>

                      <div 
                        className={`rounded-xl font-black uppercase tracking-wider ${activeTheme.accentBg} shadow-sm`}
                        style={{ 
                          padding: isNarrowCard ? '3px 10px' : '4px 14px',
                          fontSize: isNarrowCard ? '8px' : '10px'
                        }}
                      >
                        <span>📸 Scan to Order</span>
                      </div>
                    </div>

                    {/* 3. Instructions & Wi-Fi Footer */}
                    <div className="w-full space-y-1.5 pb-0.5">
                      <p 
                        className={`font-medium leading-tight mx-auto px-2 ${activeTheme.subTextColor}`}
                        style={{ fontSize: isNarrowCard ? '9px' : '11px' }}
                      >
                        {customTagline}
                      </p>

                      {showWifi && (wifiNetwork || wifiPassword) && (
                        <div 
                          className={`rounded-xl border font-bold inline-flex items-center gap-1.5 ${activeTheme.pillBorder}`}
                          style={{ 
                            padding: isNarrowCard ? '2px 8px' : '4px 12px',
                            fontSize: isNarrowCard ? '8px' : '10px'
                          }}
                        >
                          <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Wi-Fi: <strong className={activeTheme.textColor}>{wifiNetwork || 'Guest'}</strong></span>
                          {wifiPassword && <span>• Pass: <strong className={activeTheme.textColor}>{wifiPassword}</strong></span>}
                        </div>
                      )}

                      <div className="pt-0.5 flex items-center justify-center gap-1 text-[7.5px] font-black uppercase tracking-widest opacity-60 text-slate-400">
                        <span>Powered by</span>
                        <span className="text-indigo-400 font-bold">Servora Cloud POS</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <p className="text-[10px] text-slate-500 font-semibold mt-4 text-center">
                💡 High-resolution 300 DPI: export directly into acrylic table tents, wooden blocks, or custom frames.
              </p>
            </div>
          </div>
        </div>

        {/* 📱 STICKY MOBILE EXPORT FOOTER — only visible on small screens */}
        <div className="sm:hidden shrink-0 bg-white border-t border-slate-200 px-4 py-3 space-y-2.5 safe-area-inset-bottom">
          {exportProgress && (
            <p className="text-[11px] text-center font-bold text-indigo-600 animate-pulse">
              {exportProgress}
            </p>
          )}
          <div className={`grid gap-2 ${targetQRs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button
              onClick={handleDownloadSinglePNG}
              disabled={isExporting}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-wide shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Table #{currentPreviewQR.tableNumber}</span>
            </Button>

            {targetQRs.length > 1 && (
              <Button
                onClick={handleDownloadBulkPDF}
                disabled={isExporting}
                className="h-11 rounded-xl bg-slate-900 hover:bg-black text-amber-400 font-black text-[11px] uppercase tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <FileText className="w-3.5 h-3.5 text-amber-400" />}
                <span>All {targetQRs.length} PDF</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
