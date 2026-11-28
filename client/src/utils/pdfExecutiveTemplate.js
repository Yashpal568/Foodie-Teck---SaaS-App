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

  // 2. Floating Rounded Executive Dark Navy Hero Card (Margins: 14mm L/R, 10mm Top, Height: 31mm)
  const heroX = 14
  const heroY = 10
  const heroW = pageWidth - 28
  const heroH = 31

  doc.setFillColor(18, 24, 48)
  doc.roundedRect(heroX, heroY, heroW, heroH, 3, 3, 'F')

  // Left Pill Tagline
  doc.setFillColor(35, 44, 78)
  doc.roundedRect(heroX + 6, heroY + 4.5, 72, 4.5, 1.5, 1.5, 'F')
  doc.setTextColor(165, 180, 252)
  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'bold')
  doc.text(tagline, heroX + 8.5, heroY + 7.6)

  // Left Main Title & Subtitle
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16.5)
  doc.setFont('helvetica', 'bold')
  doc.text(reportTitle, heroX + 6, heroY + 16.5)

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7.2)
  doc.setFont('helvetica', 'normal')
  doc.text(reportSubtitle, heroX + 6, heroY + 22.5, { maxWidth: 105 })

  // Right Header Content (Restaurant Badge, Name, Timestamp & Status Pills)
  const rightEdge = heroX + heroW - 6
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.text(safeRestaurantName, rightEdge, heroY + 9.5, { align: 'right' })

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(6.6)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${generatedDate} • ${generatedTime}`, rightEdge, heroY + 14.8, { align: 'right' })

  // Status Chip on Dark Header
  const bW = 26
  const bH = 5
  const bX = rightEdge - bW
  const bY = heroY + 18.5

  doc.setFillColor(15, 45, 35)
  doc.roundedRect(bX, bY, bW, bH, 1.2, 1.2, 'F')
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(0.3)
  doc.roundedRect(bX, bY, bW, bH, 1.2, 1.2, 'S')

  doc.setTextColor(52, 211, 153)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text(badgeText, bX + bW / 2, bY + 3.4, { align: 'center' })

  // Time Range Pill
  const pillW = 24
  const pillX = bX - pillW - 2.5
  doc.setFillColor(35, 44, 78)
  doc.roundedRect(pillX, bY, pillW, bH, 1.2, 1.2, 'F')
  doc.setTextColor(203, 213, 225)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text(timeRangeLabel, pillX + pillW / 2, bY + 3.4, { align: 'center' })

  /**
   * Helper for continuation page header in autoTable didDrawPage
   */
  const handleContinuationPage = (data) => {
    const pageNum = data?.pageNumber || (typeof doc.getNumberOfPages === 'function' ? doc.getNumberOfPages() : 2)
    if (pageNum > 1) {
      drawWatermark()

      // Clean White Continuation Page Header (matches reference Page 2)
      doc.setFillColor(15, 23, 42)
      doc.roundedRect(14, 7, 5, 5, 1, 1, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.text('S', 16.5, 10.6, { align: 'center' })

      doc.setTextColor(15, 23, 42)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`SERVORA  |  ${reportTitle.toUpperCase()}`, 21.5, 10.6)

      doc.setTextColor(100, 116, 139)
      doc.setFontSize(7.2)
      doc.setFont('helvetica', 'normal')
      doc.text(`${safeRestaurantName}  •  Page ${pageNum}`, pageWidth - 14, 10.6, { align: 'right' })

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(14, 14.5, pageWidth - 14, 14.5)
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
