const PDFDocument = require('pdfkit')

/**
 * Generates an executive PDF Tax Invoice & Purchase Summary for Servora subscriptions.
 * @param {Object} data - Purchase and subscription details
 * @returns {Promise<Buffer>} - Resolves to PDF buffer
 */
function generatePurchaseInvoicePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' })
      const buffers = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers)
        resolve(pdfData)
      })

      const merchantName = data.merchantName || data.businessName || 'Valued Merchant'
      const merchantEmail = data.merchantEmail || data.email || 'merchant@servora.app'
      const planName = (data.planName || data.plan || 'PRO').toUpperCase()
      const amount = Number(data.amount || data.price || 2499)
      const utrNumber = data.utrNumber || data.utr || 'N/A'
      const invoiceNumber = data.invoiceNumber || `SRV-${Date.now().toString().slice(-6)}`
      const issueDate = data.issueDate ? new Date(data.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      const validUntil = data.validUntil ? new Date(data.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

      // Colors
      const primaryDark = '#0F172A' // Slate 900
      const accentBlue = '#2563EB'  // Blue 600
      const lightSlate = '#64748B'  // Slate 500
      const borderSlate = '#E2E8F0' // Slate 200

      // Header Brand
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor(accentBlue)
        .text('SERVORA', 40, 45)

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(lightSlate)
        .text('Next-Gen Autonomous Restaurant Management Platform', 40, 72)
        .text('Servora Technologies Inc. • billing@servora.app • servora.quantumesh.in', 40, 85)

      // Right Header - INVOICE Title
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text('TAX INVOICE', 380, 45, { align: 'right' })

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(accentBlue)
        .text(`INVOICE #: ${invoiceNumber}`, 380, 70, { align: 'right' })

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(lightSlate)
        .text(`Date: ${issueDate}`, 380, 85, { align: 'right' })
        .text(`Payment Status: PAID`, 380, 98, { align: 'right' })

      // Divider
      doc
        .strokeColor(borderSlate)
        .lineWidth(1)
        .moveTo(40, 120)
        .lineTo(555, 120)
        .stroke()

      // Merchant Info & Payment Info
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text('BILLED TO (MERCHANT)', 40, 135)

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text(merchantName, 40, 155)

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(lightSlate)
        .text(`Email: ${merchantEmail}`, 40, 170)
        .text(`Restaurant ID: ${data.restaurantId || 'Assigned Node'}`, 40, 183)

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text('PAYMENT DETAILS', 340, 135)

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(lightSlate)
        .text(`Method: UPI Instant Transfer / QR`, 340, 155)
        .text(`UTR / Reference #: ${utrNumber}`, 340, 170)
        .text(`Coverage Period: 30 Days (Until ${validUntil})`, 340, 183)

      // Divider
      doc
        .strokeColor(borderSlate)
        .lineWidth(1)
        .moveTo(40, 215)
        .lineTo(555, 215)
        .stroke()

      // Table Header
      const tableTop = 230
      doc
        .rect(40, tableTop, 515, 26)
        .fillColor('#F8FAFC')
        .fill()

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text('PLAN DESCRIPTION', 50, tableTop + 8)
        .text('BILLING CYCLE', 270, tableTop + 8)
        .text('QTY', 380, tableTop + 8)
        .text('AMOUNT (INR)', 450, tableTop + 8, { align: 'right' })

      // Table Rows
      const rowTop = tableTop + 35
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text(`Servora ${planName} Subscription Tier`, 50, rowTop)

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor(lightSlate)
        .text('Complete KDS, Interactive Digital QR Menu, Realtime Telemetry, Live Order Streams', 50, rowTop + 14)

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(primaryDark)
        .text('30 Days Active', 270, rowTop)
        .text('1', 380, rowTop)
        .text(`Rs. ${amount.toLocaleString('en-IN')}`, 450, rowTop, { align: 'right' })

      // Divider
      const subTotalTop = rowTop + 45
      doc
        .strokeColor(borderSlate)
        .lineWidth(1)
        .moveTo(40, subTotalTop)
        .lineTo(555, subTotalTop)
        .stroke()

      // Total Breakdown
      const summaryTop = subTotalTop + 15
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(lightSlate)
        .text('Subtotal:', 350, summaryTop)
        .text(`Rs. ${amount.toLocaleString('en-IN')}`, 450, summaryTop, { align: 'right' })

      doc
        .text('Estimated GST / Tax (Included):', 350, summaryTop + 16)
        .text('Rs. 0.00', 450, summaryTop + 16, { align: 'right' })

      // Grand Total Box
      doc
        .rect(340, summaryTop + 35, 215, 32)
        .fillColor('#EFF6FF')
        .fill()

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(accentBlue)
        .text('GRAND TOTAL PAID:', 350, summaryTop + 45)
        .text(`Rs. ${amount.toLocaleString('en-IN')}`, 450, summaryTop + 45, { align: 'right' })

      // Terms & Footer
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text('Terms & Subscription Policy', 40, 480)

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor(lightSlate)
        .text('1. Subscription is valid for 30 consecutive calendar days from the activation timestamp.', 40, 498)
        .text('2. Features including table QR limits and menu limits are governed by the active plan tier.', 40, 510)
        .text('3. For support, invoice amendments, or technical help, please contact support@servora.app.', 40, 522)

      // Signature / Stamp Area
      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text('AUTHORIZED SIGNATORY', 400, 580, { align: 'right' })
        .font('Helvetica')
        .fillColor(lightSlate)
        .text('Servora Automated Billing Engine', 400, 595, { align: 'right' })
        .text(`Verified at: ${new Date().toISOString()}`, 400, 608, { align: 'right' })

      // Page Border Accent
      doc
        .rect(0, 0, 595.28, 8)
        .fillColor(accentBlue)
        .fill()

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  generatePurchaseInvoicePDF
}
