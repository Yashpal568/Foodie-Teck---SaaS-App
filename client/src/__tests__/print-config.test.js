import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import QRCode from 'qrcode'
import {
  buildReceiptPrintHtml,
  calculateReceiptHeightMm,
  createPrinterAdapter,
  DEFAULT_PAPER_SIZE_ID,
  detectBrowserPrintCapabilities,
  generateReceiptPdfDoc,
  getPaperSizePreset,
  normalizeReceiptData,
  PAPER_SIZES,
  PRINTER_PROFILES,
} from '../utils/printConfig'
import {
  buildEscPosReceiptCommands,
  classifyDiscoveredPrinter,
} from '../utils/qzTrayBridge'

const sampleProfile = {
  id: 'demo-merchant',
  business_name: 'Servora Demo Kitchen',
  address: '124 MG Road, Indiranagar, Bengaluru',
  phone: '+91 98765 43210',
  gstin: '29AABCS1234F1Z5',
  gstEnabled: true,
  gstRate: 5,
}

const sampleOrder = {
  id: 'ord-test-013C51',
  tableNumber: '5',
  guest_count: 4,
  customerName: 'Table 5 Guest',
  order_type: 'DINE_IN',
  paymentMethod: 'UPI',
  subtotal: 520,
  tax: 26,
  total: 546,
  gst_rate: 5,
  items: [
    { name: 'Crispy Paneer Burger', price: 180, quantity: 1 },
    { name: 'Farmhouse Special Pizza (10")', price: 340, quantity: 1, variant: 'full' },
  ],
}

describe('Universal Receipt Printing Engine & Paper Configurations', () => {
  it('exposes centralized thermal (80mm, 58mm) and standard (A4, A5, Letter) presets with safe default', () => {
    expect(PAPER_SIZES['80mm'].widthMm).toBe(80)
    expect(PAPER_SIZES['58mm'].widthMm).toBe(58)
    expect(PAPER_SIZES.a4.widthMm).toBe(210)
    expect(PAPER_SIZES.a4.heightMm).toBe(297)
    expect(PAPER_SIZES.a5.widthMm).toBe(148)
    expect(PAPER_SIZES.a5.heightMm).toBe(210)
    expect(PAPER_SIZES.letter.widthMm).toBe(215.9)
    expect(PAPER_SIZES.letter.heightMm).toBe(279.4)

    expect(getPaperSizePreset('unknown-size').id).toBe(DEFAULT_PAPER_SIZE_ID)
    expect(getPaperSizePreset(undefined).id).toBe('80mm')
  })

  it('never fabricates hardware printer detection or USB readiness and supports custom adapter bridges', () => {
    const caps = detectBrowserPrintCapabilities()
    expect(caps.canDetectInstalledPrinters).toBe(false)
    expect(caps.canDetectPaperWidth).toBe(false)
    expect(caps.canDetectReadiness).toBe(false)
    expect(caps.limitationNote).toContain("browser's native print dialog")

    expect(PRINTER_PROFILES.some((p) => p.label.includes('USB - Ready'))).toBe(false)

    const customAdapter = createPrinterAdapter({
      getCapabilities: () => ({ canDetectInstalledPrinters: true, bridge: 'qz-tray' }),
      listPrinters: () => [{ id: 'usb-epson', label: 'Epson Native Bridge' }],
    })
    expect(customAdapter.getCapabilities().bridge).toBe('qz-tray')
    expect(customAdapter.listProfiles()[0].id).toBe('usb-epson')
  })

  it('dynamically calculates taller thermal receipt heights for long orders, long names, GST, and QR codes', () => {
    const baseData = normalizeReceiptData(sampleOrder, sampleProfile)
    const short80 = calculateReceiptHeightMm(baseData, '80mm', { includeGst: false, showFeedbackQr: false })
    const withQr80 = calculateReceiptHeightMm(baseData, '80mm', { includeGst: true, showFeedbackQr: true })
    expect(withQr80).toBeGreaterThan(short80)

    const longOrder = {
      ...sampleOrder,
      items: Array.from({ length: 24 }, (_, idx) => ({
        name: `Chef Signature Slow-Cooked Kashmiri Rogan Josh Bowl #${idx + 1} with Extra Saffron Naan`,
        price: 250,
        quantity: 2,
      })),
    }
    const longProfile = {
      ...sampleProfile,
      business_name: 'The Grand Royal Heritage Dining Pavilion & Artisanal Spice Kitchen Pvt Ltd',
    }
    const longData = normalizeReceiptData(longOrder, longProfile)
    const long58Height = calculateReceiptHeightMm(longData, '58mm', { includeGst: true, showFeedbackQr: true })
    const long80Height = calculateReceiptHeightMm(longData, '80mm', { includeGst: true, showFeedbackQr: true })

    expect(long80Height).toBeGreaterThan(220)
    expect(long58Height).toBeGreaterThan(long80Height)
    expect(calculateReceiptHeightMm(longData, 'a4')).toBe(297)
    expect(calculateReceiptHeightMm(longData, 'a5')).toBe(210)
    expect(calculateReceiptHeightMm(longData, 'letter')).toBe(279.4)
  })

  it('generates isolated print HTML with explicit @page dimensions and zero margin', () => {
    const data = normalizeReceiptData(sampleOrder, sampleProfile)
    const html80 = buildReceiptPrintHtml(data, '80mm', { copies: 2 })
    const expectedH80 = calculateReceiptHeightMm(data, '80mm')

    expect(html80).toContain(`size: 80mm ${expectedH80}mm;`)
    expect(html80).toContain('margin: 0;')
    expect(html80).toContain('Guests: 4')
    expect(html80).toContain('.slip + .slip { page-break-before: always; }')

    const html58 = buildReceiptPrintHtml(data, '58mm', { copies: 1 })
    const expectedH58 = calculateReceiptHeightMm(data, '58mm')
    expect(html58).toContain(`size: 58mm ${expectedH58}mm;`)
  })

  it('produces actual PDFs with exact physical dimensions for 80mm, 58mm, A4, A5, Letter, long receipts, and multi-copy', async () => {
    const data = normalizeReceiptData(sampleOrder, sampleProfile)
    const qrUrl = await QRCode.toDataURL('https://servora.quantumesh.in/menu/demo-merchant?table=5', {
      width: 140,
      margin: 1,
    })

    // 80mm single copy
    const pdf80 = await generateReceiptPdfDoc(data, '80mm', {
      copies: 1,
      includeGst: true,
      showFeedbackQr: true,
      qrDataUrl: qrUrl,
    })
    expect(Math.round(pdf80.internal.pageSize.getWidth())).toBe(80)
    expect(Math.round(pdf80.internal.pageSize.getHeight())).toBe(
      calculateReceiptHeightMm(data, '80mm', { includeGst: true, showFeedbackQr: true })
    )
    expect(pdf80.getNumberOfPages()).toBe(1)
    expect(pdf80.output()).toContain('/PickTrayByPDFSize true')

    // 58mm single copy
    const pdf58 = await generateReceiptPdfDoc(data, '58mm', {
      copies: 1,
      includeGst: true,
      showFeedbackQr: true,
      qrDataUrl: qrUrl,
    })
    expect(Math.round(pdf58.internal.pageSize.getWidth())).toBe(58)
    expect(Math.round(pdf58.internal.pageSize.getHeight())).toBe(
      calculateReceiptHeightMm(data, '58mm', { includeGst: true, showFeedbackQr: true })
    )

    // Multiple copies (3 copies -> 3 pages)
    const pdfMulti = await generateReceiptPdfDoc(data, '80mm', { copies: 3, qrDataUrl: qrUrl })
    expect(pdfMulti.getNumberOfPages()).toBe(3)

    // Standard sheets (A4, A5, Letter)
    const pdfA4 = await generateReceiptPdfDoc(data, 'a4', { qrDataUrl: qrUrl })
    expect(Math.round(pdfA4.internal.pageSize.getWidth())).toBe(210)
    expect(Math.round(pdfA4.internal.pageSize.getHeight())).toBe(297)

    const pdfA5 = await generateReceiptPdfDoc(data, 'a5', { qrDataUrl: qrUrl })
    expect(Math.round(pdfA5.internal.pageSize.getWidth())).toBe(148)
    expect(Math.round(pdfA5.internal.pageSize.getHeight())).toBe(210)

    const pdfLetter = await generateReceiptPdfDoc(data, 'letter', { qrDataUrl: qrUrl })
    expect(Number(pdfLetter.internal.pageSize.getWidth().toFixed(1))).toBe(215.9)
    expect(Number(pdfLetter.internal.pageSize.getHeight().toFixed(1))).toBe(279.4)

    // Long receipt auto-paginates cleanly on A5 without clipping
    const longOrder = {
      ...sampleOrder,
      items: Array.from({ length: 35 }, (_, i) => ({
        name: `Artisanal Long Dish Name Item #${i + 1} with Garlic Naan`,
        price: 199,
        quantity: 1,
      })),
    }
    const longPdfA5 = await generateReceiptPdfDoc(
      normalizeReceiptData(longOrder, sampleProfile),
      'a5',
      { qrDataUrl: qrUrl }
    )
    expect(longPdfA5.getNumberOfPages()).toBeGreaterThan(1)
  })

  it('wires both ThermalReceiptModal and SplitPaymentModal to the centralized printConfig engine', () => {
    const modalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/receipt/ThermalReceiptModal.jsx'),
      'utf8'
    )
    const splitSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/pos/SplitPaymentModal.jsx'),
      'utf8'
    )
    expect(modalSrc).toContain('generateReceiptPdfDoc')
    expect(modalSrc).toContain('createPrinterAdapter')
    expect(modalSrc).not.toContain('discoverPrinters')
    expect(modalSrc).not.toContain('PrinterSetupWizard')
    expect(splitSrc).toContain('generateReceiptPdfDoc')
    expect(splitSrc).toContain('createPrinterAdapter')
    expect(splitSrc).not.toContain('size: auto;')
  })

  it('classifies QZ Tray discovered printers, builds 58mm/80mm ESC/POS commands, and routes via native bridge when connected', async () => {
    const epson = classifyDiscoveredPrinter({ name: 'EPSON TM-T82III Receipt', default: true })
    expect(epson.printerType).toBe('thermal_escpos')
    expect(epson.configuredPaperWidth).toBe('80mm')
    expect(epson.printableWidthMm).toBe(72)
    expect(epson.capabilities.supportsRawEscPos).toBe(true)
    expect(epson.capabilities.supportsCashDrawer).toBe(true)

    const pos58 = classifyDiscoveredPrinter({ name: 'Rongta RP58 58mm Thermal' })
    expect(pos58.configuredPaperWidth).toBe('58mm')
    expect(pos58.printableWidthMm).toBe(48)

    const msPdf = classifyDiscoveredPrinter({ name: 'Microsoft Print to PDF' })
    expect(msPdf.printerType).toBe('virtual_pdf')
    expect(msPdf.capabilities.supportsCustomRollSizes).toBe(false)
    expect(msPdf.capabilities.supportsCashDrawer).toBe(false)

    const data = normalizeReceiptData(sampleOrder, sampleProfile)
    const esc80 = buildEscPosReceiptCommands(data, {
      paperWidth: '80mm',
      openCashDrawer: true,
      showFeedbackQr: true,
      qrUrl: 'https://servora.quantumesh.in/menu/demo',
    })
    expect(esc80).toContain('SERVORA DEMO KITCHEN')
    expect(esc80).toContain('\x1B@')
    expect(esc80).toContain('\x1D(k') // native QR
    expect(esc80).toContain('\x1Bp\x00\x19\xFA') // cash drawer pulse

    const esc58NoDrawer = buildEscPosReceiptCommands(data, {
      paperWidth: '58mm',
      openCashDrawer: false,
      showFeedbackQr: false,
    })
    expect(esc58NoDrawer).not.toContain('\x1Bp\x00\x19\xFA')

    let rawCalled = null
    let pdfCalled = null
    const mockBridge = {
      discoverPrinters: async () => ({
        connected: true,
        transport: 'wss://localhost:8181',
        printers: [epson, msPdf],
      }),
      printRawEscPos: async (printerName, raw, copies) => {
        rawCalled = { printerName, raw, copies }
        return { printed: true, mode: 'qz-raw-escpos' }
      },
      printPdfBase64: async (printerName, base64, preset, heightMm, copies) => {
        pdfCalled = { printerName, width: preset.widthMm, heightMm, copies }
        return { printed: true, mode: 'qz-pdf-spool' }
      },
    }

    const adapter = createPrinterAdapter(mockBridge)
    const discovery = await adapter.discoverPrinters()
    expect(discovery.connected).toBe(true)
    expect(discovery.discoveredCount).toBe(2)

    const rawRes = await adapter.printReceipt({
      receiptData: data,
      paperSizeId: '80mm',
      printerProfile: epson,
      options: { copies: 2, openCashDrawer: true },
    })
    expect(rawRes.mode).toBe('qz-raw-escpos')
    expect(rawCalled.printerName).toBe('EPSON TM-T82III Receipt')
    expect(rawCalled.copies).toBe(2)

    const pdfRes = await adapter.printReceipt({
      receiptData: data,
      paperSizeId: 'a4',
      printerProfile: msPdf,
      options: { copies: 1 },
    })
    expect(pdfRes.mode).toBe('qz-pdf-spool')
    expect(pdfCalled.width).toBe(210)
    expect(pdfCalled.heightMm).toBe(297)
  })

  it('defaults createPrinterAdapter() to browser-only mode without QZ Tray probing and formats all 5 paper sizes with @media print CSS', async () => {
    const defaultAdapter = createPrinterAdapter()
    const discovery = await defaultAdapter.discoverPrinters()
    expect(discovery.connected).toBe(false)
    expect(discovery.discoveredCount).toBe(0)

    const largeItems = Array.from({ length: 32 }, (_, idx) => ({
      name: `Chef Special Paneer Tikka Masala Bowl #${idx + 1}`,
      quantity: 2,
      price: 220,
    }))
    const largeOrder = {
      ...sampleOrder,
      items: largeItems,
      discountAmount: 150,
      paymentMethod: 'SPLIT (UPI + CASH)',
    }
    const largeData = normalizeReceiptData(largeOrder, sampleProfile)
    expect(largeData.discountAmount).toBe(150)
    expect(largeData.resolvedPayMethod).toBe('SPLIT (UPI + CASH)')

    const height58 = calculateReceiptHeightMm(largeData, '58mm')
    const height80 = calculateReceiptHeightMm(largeData, '80mm')
    expect(height58).toBeGreaterThan(220)
    expect(height80).toBeGreaterThan(200)
    expect(calculateReceiptHeightMm(largeData, 'a4')).toBe(297)
    expect(calculateReceiptHeightMm(largeData, 'a5')).toBe(210)
    expect(calculateReceiptHeightMm(largeData, 'letter')).toBe(279.4)

    for (const sizeId of ['58mm', '80mm', 'a4', 'a5', 'letter']) {
      const html = buildReceiptPrintHtml(largeData, sizeId, {
        copies: 1,
        includeGst: true,
        showFeedbackQr: false,
      })
      const preset = PAPER_SIZES[sizeId]
      expect(html).toContain('@media print')
      expect(html).toContain(`size: ${preset.widthMm}mm`)
      expect(html).toContain('margin: 0;')
      expect(html).toContain('overflow-wrap: anywhere')
      expect(html).toContain('SPLIT (UPI + CASH)')
      expect(html).toContain('Discount:')
    }

    const pdf80 = await generateReceiptPdfDoc(largeData, '80mm', { showFeedbackQr: false })
    expect(Math.round(pdf80.internal.pageSize.getWidth())).toBe(80)
    expect(pdf80.internal.pageSize.getHeight()).toBeGreaterThan(200)

    const settingsSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/dashboard/Settings.jsx'),
      'utf8'
    )
    expect(settingsSrc).not.toContain('PrinterSetupWizard')

    const kdsSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/dashboard/OrderManagement.jsx'),
      'utf8'
    )
    expect(kdsSrc).not.toContain('Print Kitchen KOT')

    const printConfigSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/utils/printConfig.js'),
      'utf8'
    )
    expect(printConfigSrc).toContain('isPrintJobLaunching')
    expect(printConfigSrc).toContain('data-servora-print-frame')
    expect(printConfigSrc).toContain('afterprint')
    expect(printConfigSrc).toContain('printFrame.onerror')

    // Verify 100-item dynamic receipt height & multi-page A4 generation
    const hundredItems = Array.from({ length: 100 }, (_, idx) => ({
      name: `Signature Dish Item #${idx + 1}`,
      quantity: 1,
      price: 150,
    }))
    const hundredData = normalizeReceiptData({ ...sampleOrder, items: hundredItems }, sampleProfile)
    const hundredHeight80 = calculateReceiptHeightMm(hundredData, '80mm')
    expect(hundredHeight80).toBeGreaterThan(600)
    const hundredPdf80 = await generateReceiptPdfDoc(hundredData, '80mm', { showFeedbackQr: false })
    expect(hundredPdf80.internal.pageSize.getHeight()).toBeGreaterThan(600)
    const hundredPdfA4 = await generateReceiptPdfDoc(hundredData, 'a4', { showFeedbackQr: false })
    expect(hundredPdfA4.getNumberOfPages()).toBeGreaterThanOrEqual(2)
  })
})
