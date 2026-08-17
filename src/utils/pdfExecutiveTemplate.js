import { jsPDF } from 'jspdf'
import { getServoraLogoBase64 } from './pdfLogo'

/**
 * Unified Executive PDF Template Generator for Servora Intelligence Reports
 * Adheres to enterprise audit aesthetics, midnight slate dark hero, geometric watermarks, and auto-pagination.
 */
export async function createExecutivePDF({
  reportTitle = 'Executive Intelligence Report',
  reportSubtitle = 'Real-time performance velocity, transaction ledger, and operational insights',
  tagline = 'SERVORA INTELLIGENCE SUITE  •  EXECUTIVE FINANCIAL AUDIT',
  restaurantName = 'Tiger Bistro',
  badgeText = 'VERIFIED AUDIT',
  timeRangeLabel = 'LAST 30 DAYS',
  primaryAccent = [99, 102, 241], // Indigo-500
  secondaryAccent = [16, 185, 129], // Emerald-500
  watermarkSubtext = 'FINANCIAL INTELLIGENCE • VERIFIED AUDIT'
}) {
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
      doc.text(watermarkSubtext, pageWidth / 2, pageHeight / 2 + 14, {
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
  doc.setFillColor(primaryAccent[0], primaryAccent[1], primaryAccent[2])
  doc.rect(0, 0, pageWidth * 0.6, 2.5, 'F')
  doc.setFillColor(secondaryAccent[0], secondaryAccent[1], secondaryAccent[2])
  doc.rect(pageWidth * 0.6, 0, pageWidth * 0.4, 2.5, 'F')

  // Servora Logo Image (Left)
  const iconX = 14
  const iconY = 10
  const iconSize = 14
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', iconX, iconY, iconSize, iconSize)
  } else {
    doc.setFillColor(primaryAccent[0], primaryAccent[1], primaryAccent[2])
    doc.roundedRect(iconX, iconY, iconSize, iconSize, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('S', iconX + iconSize / 2, iconY + iconSize / 2 + 3.2, { align: 'center' })
  }

  // Left Header Text
  const textStartX = iconX + iconSize + 4.5
  doc.setTextColor(165, 180, 252) // Indigo-200
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text(tagline, textStartX, 15)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(reportTitle, textStartX, 23.5)

  doc.setTextColor(148, 163, 184) // Slate-400
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(reportSubtitle, textStartX, 30)

  // Right Header Content (Restaurant Name & Badges)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(safeRestaurantName, pageWidth - 14, 16, { align: 'right' })

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${generatedDate} • ${generatedTime}`, pageWidth - 14, 21.5, { align: 'right' })

  // Status Chip on Dark Header
  const bW = 26
  const bH = 5
  const bX = pageWidth - 14 - bW
  const bY = 26

  doc.setFillColor(15, 45, 35) // Deep emerald container
  doc.roundedRect(bX, bY, bW, bH, 1.2, 1.2, 'F')
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(0.3)
  doc.roundedRect(bX, bY, bW, bH, 1.2, 1.2, 'S')

  doc.setTextColor(52, 211, 153)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text(badgeText, bX + bW / 2, bY + 3.5, { align: 'center' })

  // Time Range Pill
  const pillW = 24
  const pillX = bX - pillW - 3
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(pillX, bY, pillW, bH, 1.2, 1.2, 'F')
  doc.setTextColor(203, 213, 225)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text(timeRangeLabel, pillX + pillW / 2, bY + 3.5, { align: 'center' })

  /**
   * Helper for continuation page header in autoTable didDrawPage
   */
  const handleContinuationPage = (data) => {
    if (data.pageNumber > 1) {
      drawWatermark()

      // Continuation Page Slim Header Bar
      doc.setFillColor(11, 15, 25)
      doc.rect(0, 0, pageWidth, 12, 'F')
      
      doc.setFillColor(primaryAccent[0], primaryAccent[1], primaryAccent[2])
      doc.rect(0, 0, pageWidth, 1.2, 'F')

      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 14, 2, 8, 8)
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(`SERVORA | ${reportTitle.toUpperCase()}`, 25, 8)
      } else {
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(`SERVORA | ${reportTitle.toUpperCase()}`, 14, 8)
      }

      doc.setTextColor(148, 163, 184)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(`${safeRestaurantName} • Page ${data.pageNumber}`, pageWidth - 14, 8, { align: 'right' })
    }
  }

  /**
   * Helper to stamp footers on all pages
   */
  const finalizeFooters = () => {
    const totalPages = typeof doc.getNumberOfPages === 'function' 
      ? doc.getNumberOfPages() 
      : (doc.internal?.pages ? Math.max(1, doc.internal.pages.length - 1) : 1)

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      const footerY = pageHeight - 9
      
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(14, footerY - 3, pageWidth - 14, footerY - 3)

      doc.setTextColor(148, 163, 184)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.text('CONFIDENTIAL • SYSTEM GENERATED FINANCIAL AUDIT REPORT • SERVORA INTELLIGENCE OS', 14, footerY + 1)
      
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, footerY + 1, { align: 'right' })
    }
  }

  return {
    doc,
    pageWidth,
    pageHeight,
    safeRestaurantName,
    fmtPdfCurrency,
    drawWatermark,
    handleContinuationPage,
    finalizeFooters
  }
}
