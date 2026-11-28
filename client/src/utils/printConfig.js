/**
 * Centralized Receipt Print Configuration, Dynamic Dimension Calculator,
 * Browser Printer Capability Inspector, and Universal PDF Generator.
 *
 * Ensures Live Preview, Print Receipt Now, Download PDF, Save as PDF,
 * Microsoft Print to PDF, and physical thermal printers share one
 * authoritative paper-size and layout specification.
 */

import {
  computeReceiptTotals,
  escapeHtml,
  getRestaurantReceiptHeader,
} from './receiptHelpers'
import {
  buildEscPosReceiptCommands,
  createQzTrayBridge,
  validatePrintJob,
} from './qzTrayBridge'
import {
  loadTerminalPrinterConfig,
  PRINT_STATIONS,
  resolveStationPrinterRoute,
} from './printerProfiles'

export const PAPER_SIZES = {
  '80mm': {
    id: '80mm',
    label: '80mm',
    subLabel: '(Standard)',
    category: 'thermal',
    widthMm: 80,
    printableWidthMm: 72,
    charsPerLine: 42,
    heightMm: null,
    marginMm: 4,
    minHeightMm: 115,
    description: '80mm thermal roll (72mm printable)',
  },
  '58mm': {
    id: '58mm',
    label: '58mm',
    subLabel: '(Compact)',
    category: 'thermal',
    widthMm: 58,
    printableWidthMm: 48,
    charsPerLine: 32,
    heightMm: null,
    marginMm: 5,
    minHeightMm: 115,
    description: '58mm compact thermal roll (48mm printable)',
  },
  a4: {
    id: 'a4',
    label: 'A4',
    subLabel: '(210×297)',
    category: 'standard',
    widthMm: 210,
    printableWidthMm: 178,
    charsPerLine: 72,
    heightMm: 297,
    marginMm: 16,
    minHeightMm: 297,
    description: 'A4 standard sheet',
  },
  a5: {
    id: 'a5',
    label: 'A5',
    subLabel: '(148×210)',
    category: 'standard',
    widthMm: 148,
    printableWidthMm: 124,
    charsPerLine: 52,
    heightMm: 210,
    marginMm: 12,
    minHeightMm: 210,
    description: 'A5 standard sheet',
  },
  letter: {
    id: 'letter',
    label: 'Letter',
    subLabel: '(8.5×11")',
    category: 'standard',
    widthMm: 215.9,
    printableWidthMm: 183.9,
    charsPerLine: 74,
    heightMm: 279.4,
    marginMm: 16,
    minHeightMm: 279.4,
    description: 'US Letter sheet',
  },
}

export const DEFAULT_PAPER_SIZE_ID = '80mm'

export function getPaperSizePreset(paperSizeId) {
  return PAPER_SIZES[paperSizeId] || PAPER_SIZES[DEFAULT_PAPER_SIZE_ID]
}

/**
 * Browser fallback profiles (used when QZ Tray native bridge is not running).
 * Never fabricates USB/LAN connectivity or hardware readiness.
 */
export const PRINTER_PROFILES = [
  {
    id: 'browser-pdf',
    name: 'Browser Print / Save as PDF',
    label: 'Browser Print / Save as PDF (Default)',
    printerType: 'browser_dialog',
    configuredPaperWidth: '80mm',
    printableWidthMm: 72,
    commandMode: 'BROWSER_PRINT',
    connectionStatus: 'browser_only',
    source: 'browser-fallback',
    recommendedPaper: '80mm',
    capabilities: {
      supportsRawEscPos: false,
      supportsCashDrawer: false,
      supportsCustomRollSizes: true,
      driverReportedPapers: [],
      isDefault: true,
    },
  },
  {
    id: 'microsoft-print-to-pdf',
    name: 'Microsoft Print to PDF',
    label: 'Microsoft Print to PDF (Letter / A4 Driver)',
    printerType: 'virtual_pdf',
    configuredPaperWidth: 'letter',
    printableWidthMm: 183.9,
    commandMode: 'BROWSER_PRINT',
    connectionStatus: 'browser_only',
    source: 'browser-fallback',
    recommendedPaper: 'letter',
    capabilities: {
      supportsRawEscPos: false,
      supportsCashDrawer: false,
      supportsCustomRollSizes: false,
      driverReportedPapers: ['Letter', 'A4', 'A5', 'Legal'],
      isDefault: false,
    },
  },
  {
    id: 'standard-office',
    name: 'Standard Office Printer',
    label: 'Standard Office Printer (A4 / Letter)',
    printerType: 'standard_office',
    configuredPaperWidth: 'a4',
    printableWidthMm: 178,
    commandMode: 'BROWSER_PRINT',
    connectionStatus: 'browser_only',
    source: 'browser-fallback',
    recommendedPaper: 'a4',
    capabilities: {
      supportsRawEscPos: false,
      supportsCashDrawer: false,
      supportsCustomRollSizes: false,
      driverReportedPapers: ['A4', 'A5', 'Letter'],
      isDefault: false,
    },
  },
]

/**
 * Inspect what printer capabilities the current browser runtime actually exposes.
 * Never fabricates USB printer discovery, loaded roll width, or online readiness.
 */
export function detectBrowserPrintCapabilities() {
  const hasWindow = typeof window !== 'undefined'
  const hasNavigator = typeof navigator !== 'undefined'
  return {
    canPrintViaBrowserDialog: hasWindow && typeof window.print === 'function',
    canDetectInstalledPrinters: false,
    canDetectPaperWidth: false,
    canDetectReadiness: false,
    hasWebUSB: hasNavigator && 'usb' in navigator,
    hasWebSerial: hasNavigator && 'serial' in navigator,
    limitationNote:
      "Prints via your browser's native print dialog. Select your installed printer, paper size, and scaling options in the print dialog.",
  }
}

/**
 * Universal Printer Adapter supporting:
 * A. Browser-native printing (default active path: exact-size PDF + Chrome/Edge print dialog)
 * B. Optional Native QZ Tray bridge (only when nativeBridge or enableNativeBridge: true is passed)
 */
export function createPrinterAdapter(nativeBridge = null, adapterOptions = {}) {
  const enableNativeBridge = Boolean(adapterOptions?.enableNativeBridge)
  const bridge = nativeBridge || (enableNativeBridge ? createQzTrayBridge(adapterOptions) : null)

  let activePrintCleanup = null
  let isPrintJobLaunching = false

  const printPdfViaBrowser = async (pdfDoc) => {
    if (!pdfDoc || typeof pdfDoc.output !== 'function') {
      throw new Error('Invalid PDF document for browser printing')
    }

    if (isPrintJobLaunching) {
      return { mode: 'pdf-iframe', skippedDuplicate: true }
    }

    isPrintJobLaunching = true
    pdfDoc.autoPrint({ variant: 'non-conform' })
    const blob = pdfDoc.output('blob')
    const blobUrl = URL.createObjectURL(blob)

    if (typeof document === 'undefined') {
      isPrintJobLaunching = false
      return { mode: 'pdf-iframe', blobUrl }
    }

    // Clean up any previous lingering print iframe before creating a new one
    if (typeof activePrintCleanup === 'function') {
      activePrintCleanup()
    }

    return new Promise((resolve, reject) => {
      const printFrame = document.createElement('iframe')
      printFrame.setAttribute('data-servora-print-frame', 'true')
      printFrame.setAttribute('aria-hidden', 'true')
      printFrame.style.position = 'fixed'
      printFrame.style.right = '0'
      printFrame.style.bottom = '0'
      printFrame.style.width = '1px'
      printFrame.style.height = '1px'
      printFrame.style.opacity = '0'
      printFrame.style.pointerEvents = 'none'
      printFrame.style.border = '0'

      let triggered = false
      let cleanedUp = false
      let fallbackCleanupTimer = null
      let loadTimeoutTimer = null

      const cleanup = () => {
        if (cleanedUp) return
        cleanedUp = true
        if (fallbackCleanupTimer) clearTimeout(fallbackCleanupTimer)
        if (loadTimeoutTimer) clearTimeout(loadTimeoutTimer)
        try {
          printFrame.contentWindow?.removeEventListener?.('afterprint', cleanup)
        } catch {
          // Ignore cross-origin/PDF viewer listener cleanup issues
        }
        if (typeof window !== 'undefined') {
          window.removeEventListener('afterprint', cleanup)
        }
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame)
        }
        URL.revokeObjectURL(blobUrl)
        if (activePrintCleanup === cleanup) {
          activePrintCleanup = null
        }
      }

      activePrintCleanup = cleanup

      const triggerPrintDialog = () => {
        if (triggered || cleanedUp) return
        triggered = true
        if (loadTimeoutTimer) clearTimeout(loadTimeoutTimer)
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus()
            printFrame.contentWindow?.print()
          } catch {
            // PDF autoPrint OpenAction handles print dialog automatically
          } finally {
            isPrintJobLaunching = false
            resolve({ mode: 'pdf-iframe', blobUrl })
          }
        }, 200)
        try {
          printFrame.contentWindow?.addEventListener?.('afterprint', cleanup, { once: true })
        } catch {
          // Ignore if PDF viewer restricts contentWindow events
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('afterprint', cleanup, { once: true })
        }
        fallbackCleanupTimer = setTimeout(cleanup, 120000)
      }

      // Attach handlers BEFORE assigning src and appending to prevent load race conditions
      printFrame.onload = triggerPrintDialog
      printFrame.onerror = () => {
        isPrintJobLaunching = false
        cleanup()
        reject(new Error('Failed to load receipt PDF in browser print frame'))
      }

      loadTimeoutTimer = setTimeout(() => {
        if (!triggered && !cleanedUp) {
          triggerPrintDialog()
        }
      }, 4000)

      printFrame.src = blobUrl
      document.body.appendChild(printFrame)
    })
  }

  return {
    getCapabilities() {
      if (nativeBridge && typeof nativeBridge.getCapabilities === 'function') {
        return nativeBridge.getCapabilities()
      }
      return detectBrowserPrintCapabilities()
    },

    listProfiles() {
      if (nativeBridge && typeof nativeBridge.listPrinters === 'function') {
        return nativeBridge.listPrinters()
      }
      return PRINTER_PROFILES
    },

    async discoverPrinters() {
      const browserCaps = detectBrowserPrintCapabilities()
      if (typeof bridge?.discoverPrinters !== 'function') {
        return {
          connected: false,
          transport: 'none',
          printers: PRINTER_PROFILES,
          discoveredCount: 0,
          capabilities: browserCaps,
        }
      }

      const result = await bridge.discoverPrinters()
      if (!result?.connected) {
        return {
          connected: false,
          transport: result?.transport || 'none',
          printers: PRINTER_PROFILES,
          discoveredCount: 0,
          capabilities: browserCaps,
          error: result?.error || null,
        }
      }

      const discovered = Array.isArray(result.printers) ? result.printers : []
      return {
        connected: true,
        transport: result.transport || 'qz-tray',
        printers: [...discovered, ...PRINTER_PROFILES],
        discoveredCount: discovered.length,
        capabilities: {
          ...browserCaps,
          canDetectInstalledPrinters: true,
          canDetectReadiness: true,
          canDetectPaperWidth: false, // Driver models expose paper forms; loaded physical roll is never fabricated
          limitationNote:
            'QZ Tray connected. Real installed printers enumerated; select physical roll width (58mm/80mm) matching loaded paper.',
        },
      }
    },

    async printPdf(pdfDoc, options = {}) {
      if (nativeBridge && typeof nativeBridge.printPdf === 'function') {
        return nativeBridge.printPdf(pdfDoc, options)
      }
      return printPdfViaBrowser(pdfDoc)
    },

    async printReceipt({
      receiptData,
      paperSizeId = DEFAULT_PAPER_SIZE_ID,
      printerProfile = null,
      options = {},
    }) {
      const preset = getPaperSizePreset(paperSizeId)
      const copies = Math.max(1, Number(options.copies || 1))
      const isThermalPaper = preset.category === 'thermal'

      const validation = validatePrintJob({
        paperSizeId,
        copies,
        receiptData,
        printerProfile,
      })
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '))
      }

      // A. Native QZ Tray ESC/POS path for compatible thermal hardware
      if (
        printerProfile?.source === 'qz-tray' &&
        printerProfile?.commandMode === 'ESC_POS' &&
        printerProfile?.capabilities?.supportsRawEscPos &&
        isThermalPaper &&
        typeof bridge?.printRawEscPos === 'function'
      ) {
        const rawCommands = buildEscPosReceiptCommands(receiptData, {
          paperWidth: preset.id,
          station: options.station || 'billing',
          includeGst: options.includeGst ?? true,
          showFeedbackQr: options.showFeedbackQr ?? true,
          autoCut: options.autoCut ?? true,
          openCashDrawer:
            Boolean(options.openCashDrawer) &&
            Boolean(printerProfile?.capabilities?.supportsCashDrawer),
          qrUrl: options.qrUrl || '',
        })
        return bridge.printRawEscPos(printerProfile.name, rawCommands, copies)
      }

      // Generate exact sized PDF once for both QZ PDF spooling & browser fallback
      const pdfDoc = await generateReceiptPdfDoc(receiptData, paperSizeId, options)

      // B. Native QZ Tray PDF spool path for non-ESC/POS printers discovered by QZ Tray
      if (
        printerProfile?.source === 'qz-tray' &&
        typeof bridge?.printPdfBase64 === 'function'
      ) {
        const base64 = pdfDoc.output('datauristring').split(',')[1]
        const pageHeightMm = calculateReceiptHeightMm(receiptData, paperSizeId, options)
        return bridge.printPdfBase64(
          printerProfile.name,
          base64,
          preset,
          pageHeightMm,
          copies
        )
      }

      // C. Browser fallback
      return printPdfViaBrowser(pdfDoc)
    },
  }
}

const IN_FLIGHT_PRINT_KEYS = new Set()

/**
 * Automatic station-routed printing without requiring per-bill printer selection.
 * Reuses active QZ connection (or reconnects once), verifies exact saved printer exists,
 * prevents duplicate concurrent retries, and returns honest structured failure reasons.
 */
export async function autoPrintStationReceipt({
  restaurantId,
  terminalId,
  station = PRINT_STATIONS.BILLING,
  receiptData,
  printerAdapter,
  options = {},
}) {
  const config = loadTerminalPrinterConfig(restaurantId, terminalId)
  const route = resolveStationPrinterRoute(config, station)

  if (!route.isConfigured) {
    return {
      printed: false,
      reason: 'NOT_CONFIGURED',
      station,
      route,
      message: `No printer configured for ${station.toUpperCase()} station on this terminal.`,
    }
  }

  const dedupeKey = `${restaurantId}:${terminalId}:${station}:${receiptData?.invoiceCode || 'BILL'}`
  if (IN_FLIGHT_PRINT_KEYS.has(dedupeKey)) {
    return {
      printed: false,
      reason: 'DUPLICATE_IN_FLIGHT',
      station,
      route,
      message: 'Print job is already in progress for this receipt.',
    }
  }

  IN_FLIGHT_PRINT_KEYS.add(dedupeKey)
  try {
    const discovery = await printerAdapter.discoverPrinters()
    if (!discovery.connected) {
      return {
        printed: false,
        reason: 'BRIDGE_UNAVAILABLE',
        station,
        route,
        message: 'Local QZ Tray printing service is unavailable. Use PDF/Browser fallback or start QZ Tray.',
      }
    }

    const matchedPrinter = discovery.printers.find(
      (p) =>
        p.source === 'qz-tray' &&
        (p.id === route.printerId ||
          String(p.name || '').toLowerCase() === String(route.printerName || '').toLowerCase())
    )

    if (!matchedPrinter) {
      return {
        printed: false,
        reason: 'PRINTER_NOT_FOUND',
        station,
        route,
        message: `Saved printer "${route.printerName}" is offline or was renamed.`,
      }
    }

    const printRes = await printerAdapter.printReceipt({
      receiptData,
      paperSizeId: route.paperWidthId,
      printerProfile: matchedPrinter,
      options: {
        station,
        copies: options.copies ?? route.copies,
        includeGst: options.includeGst ?? true,
        showFeedbackQr: options.showFeedbackQr ?? (station === PRINT_STATIONS.BILLING),
        qrDataUrl: options.qrDataUrl || '',
        qrUrl: options.qrUrl || '',
        autoCut: route.autoCut,
        openCashDrawer: route.openCashDrawer && station === PRINT_STATIONS.BILLING,
      },
    })

    return {
      printed: true,
      reason: 'OK',
      station,
      route,
      mode: printRes?.mode || matchedPrinter.commandMode,
      printerName: matchedPrinter.name,
    }
  } catch (err) {
    return {
      printed: false,
      reason: 'PRINT_JOB_REJECTED',
      station,
      route,
      message: err?.message || 'Printer rejected the job.',
    }
  } finally {
    IN_FLIGHT_PRINT_KEYS.delete(dedupeKey)
  }
}

/**
 * Normalize receipt data from any order/POS payload into one canonical view-model.
 */
export function normalizeReceiptData(order = {}, profile = null, options = {}) {
  const header = getRestaurantReceiptHeader(profile)
  const totals = computeReceiptTotals(order, profile)
  const items = order?.items || order?.order_items || []
  const tableNo = order?.tableNumber || order?.table_number || '1'
  const rawOrderId = String(order?.id || 'INV001')
  const orderRef = rawOrderId.slice(-4).toUpperCase()
  const invoiceCode = order?.invoiceNumber || `#INV-${rawOrderId.slice(-6).toUpperCase()}`
  const createdAt = new Date(order?.createdAt || order?.created_at || Date.now())

  const modeLabel =
    String(order?.order_type || order?.orderType || 'Dine-In')
      .replace(/_/g, '-')
      .toUpperCase() === 'TAKEAWAY'
      ? 'Takeaway'
      : 'Dine-In'

  const guestLabel =
    order?.steward ||
    order?.customerName ||
    order?.customer_name ||
    `Table ${tableNo} Guest`

  const rawGuestCount =
    order?.guest_count ?? order?.guestCount ?? order?.guests ?? null
  const guestCount =
    rawGuestCount !== null && rawGuestCount !== undefined && Number(rawGuestCount) > 0
      ? Number(rawGuestCount)
      : null

  const externalPay = options.paymentMethod
  const orderMethod = order?.paymentMethod || order?.payment_method
  const resolvedPayMethod = externalPay
    ? String(externalPay).toUpperCase()
    : orderMethod
      ? String(orderMethod).toUpperCase()
      : order?.payment_status === 'PAID' || order?.status === 'FINISHED'
        ? 'PAID'
        : 'COUNTER'

  const discountAmount = Number(order?.discountAmount || order?.discount || 0)

  return {
    header,
    totals,
    items,
    tableNo,
    orderRef,
    invoiceCode,
    createdAt,
    modeLabel,
    guestLabel,
    guestCount,
    resolvedPayMethod,
    discountAmount,
  }
}

/**
 * Calculate exact physical height (mm) for thermal rolls based on actual content length,
 * or return the fixed sheet height for standard paper sizes (A4, A5, Letter).
 */
export function calculateReceiptHeightMm(receiptData, paperSizeId = DEFAULT_PAPER_SIZE_ID, options = {}) {
  const preset = getPaperSizePreset(paperSizeId)
  if (preset.category === 'standard' && preset.heightMm) {
    return preset.heightMm
  }

  const isCompact = preset.id === '58mm'
  const { header, items, totals, discountAmount, guestCount } = receiptData
  const { includeGst = true, showFeedbackQr = true } = options

  const nameCharsPerLine = isCompact ? 20 : 28
  const addrCharsPerLine = isCompact ? 26 : 36
  const itemCharsPerLine = isCompact ? 17 : 26

  const nameLines = Math.max(1, Math.ceil((header.name || '').length / nameCharsPerLine))
  const headerHeightMm =
    12 +
    nameLines * 4.5 +
    (header.address ? Math.ceil(header.address.length / addrCharsPerLine) * 3.6 : 0) +
    (header.gstin ? 4 : 0) +
    (header.phone ? 4 : 0)

  const metaHeightMm = 14 + (guestCount ? 4 : 0)

  const itemsHeightMm =
    9 +
    (items || []).reduce((sum, item) => {
      const qty = Number(item?.quantity || 1)
      const label = `${qty}x ${item?.name || item?.item_name || 'Dish'}${
        item?.variant && item.variant !== 'full' ? ` (${item.variant})` : ''
      }`
      const wrappedLines = Math.max(1, Math.ceil(label.length / itemCharsPerLine))
      return sum + wrappedLines * 4.2 + 2
    }, 0)

  const totalsHeightMm =
    14 +
    (discountAmount > 0 ? 4 : 0) +
    (includeGst && totals?.hasTax ? 8.5 : 0)

  const qrHeightMm = showFeedbackQr ? (isCompact ? 24 : 26) : 0
  const footerHeightMm = 18 + qrHeightMm + 10 // generous bottom safety padding

  return Math.max(
    preset.minHeightMm,
    Math.ceil(headerHeightMm + metaHeightMm + itemsHeightMm + totalsHeightMm + footerHeightMm)
  )
}

/**
 * Generate isolated print HTML & CSS matching the selected paper preset.
 */
export function buildReceiptPrintHtml(receiptData, paperSizeId = DEFAULT_PAPER_SIZE_ID, options = {}) {
  const preset = getPaperSizePreset(paperSizeId)
  const isCompact = preset.id === '58mm'
  const isStandard = preset.category === 'standard'
  const pageHeightMm = calculateReceiptHeightMm(receiptData, paperSizeId, options)
  const copies = Math.max(1, Number(options.copies || 1))
  const includeGst = options.includeGst ?? true
  const showFeedbackQr = options.showFeedbackQr ?? true
  const qrDataUrl = options.qrDataUrl || ''

  const {
    header,
    totals,
    items,
    tableNo,
    invoiceCode,
    createdAt,
    modeLabel,
    guestLabel,
    guestCount,
    resolvedPayMethod,
    discountAmount,
  } = receiptData

  const dateText = createdAt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: isCompact ? '2-digit' : 'short',
    year: isStandard ? 'numeric' : undefined,
  })
  const timeText = createdAt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const rowsHtml = items
    .map((item) => {
      const qty = Number(item.quantity || 1)
      const name = escapeHtml(item.name || item.item_name || 'Dish')
      const amt = (Number(item.price || 0) * qty).toFixed(2)
      const variant =
        item.variant && item.variant !== 'full'
          ? ` <span class="variant">(${escapeHtml(item.variant)})</span>`
          : ''
      return `<div class="line-row"><span class="item-name">${qty}x ${name}${variant}</span><span class="item-amt">${amt}</span></div>`
    })
    .join('')

  const singleSlipHtml = `
    <div class="slip">
      <div class="hdr">
        <div class="rest-name">${escapeHtml(header.name).toUpperCase()}</div>
        ${header.address ? `<div class="rest-sub">${escapeHtml(header.address)}</div>` : ''}
        ${header.gstin ? `<div class="rest-sub">GSTIN: ${escapeHtml(header.gstin)}</div>` : ''}
        ${header.phone ? `<div class="rest-sub">Ph: ${escapeHtml(header.phone)}</div>` : ''}
      </div>
      <div class="sep"></div>
      <div class="meta-row"><span>Bill No: ${escapeHtml(invoiceCode)}</span><span>${escapeHtml(`${dateText}, ${timeText}`)}</span></div>
      <div class="meta-row"><span>Table: Table ${escapeHtml(tableNo)} (${escapeHtml(modeLabel)})</span><span>${escapeHtml(guestLabel)}</span></div>
      ${guestCount ? `<div class="meta-row"><span>Guests: ${guestCount}</span><span></span></div>` : ''}
      <div class="sep"></div>
      <div class="col-hdr"><span>QTY ITEM</span><span>AMT</span></div>
      ${rowsHtml}
      <div class="sep"></div>
      <div class="line-row muted"><span>Subtotal:</span><span>${totals.subtotal.toFixed(2)}</span></div>
      ${discountAmount > 0 ? `<div class="line-row muted"><span>Discount:</span><span>-${discountAmount.toFixed(2)}</span></div>` : ''}
      ${
        includeGst && totals.hasTax
          ? `<div class="line-row muted"><span>CGST (${totals.halfRate}%):</span><span>${totals.cgst.toFixed(2)}</span></div>
             <div class="line-row muted"><span>SGST (${totals.halfRate}%):</span><span>${totals.sgst.toFixed(2)}</span></div>`
          : ''
      }
      <div class="net-row"><span>NET PAYABLE:</span><span>₹${totals.grandTotal.toFixed(2)}</span></div>
      <div class="sep"></div>
      <div class="pay-status">Paid via: ${escapeHtml(resolvedPayMethod)}</div>
      <div class="thanks">Thank you for dining with us! Visit again.</div>
      ${
        showFeedbackQr && qrDataUrl
          ? `<div class="qr-wrap"><img src="${qrDataUrl}" alt="E-bill QR" width="64" height="64" /><div class="qr-caption">Scan for e-bill &amp; feedback</div></div>`
          : ''
      }
      <div class="powered">POWERED BY SERVORA</div>
    </div>
  `

  const copiesHtml = Array.from({ length: copies }, () => singleSlipHtml).join('')
  const fontSizePx = isStandard ? 13 : isCompact ? 10 : 11.5

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(header.name)} - ${escapeHtml(invoiceCode)}</title>
    <style>
      @page {
        size: ${preset.widthMm}mm ${pageHeightMm}mm;
        margin: 0;
      }
      @media print {
        html, body {
          width: ${preset.widthMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .slip {
          width: ${preset.widthMm}mm !important;
          max-width: ${preset.widthMm}mm !important;
          margin: 0 !important;
        }
      }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body {
        width: ${preset.widthMm}mm;
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
        font-size: ${fontSizePx}px;
        line-height: 1.45;
      }
      .slip {
        width: ${preset.widthMm}mm;
        max-width: ${preset.widthMm}mm;
        padding: ${preset.marginMm}mm;
        page-break-inside: avoid;
        overflow-wrap: anywhere;
      }
      .slip + .slip { page-break-before: always; }
      .hdr { text-align: center; }
      .rest-name { font-size: ${isStandard ? 18 : isCompact ? 12 : 14}px; font-weight: 800; }
      .rest-sub { font-size: ${isStandard ? 11 : isCompact ? 9 : 10}px; color: #475569; margin-top: 2px; }
      .sep { border-top: 1px dashed #cbd5e1; margin: 7px 0; }
      .meta-row, .line-row, .col-hdr, .net-row { display: flex; justify-content: space-between; gap: 6px; }
      .meta-row { font-size: ${isStandard ? 11 : isCompact ? 9 : 10}px; color: #334155; }
      .col-hdr { font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 5px; }
      .line-row { margin-bottom: 4px; }
      .line-row.muted { color: #475569; }
      .item-name { flex: 1; min-width: 0; overflow-wrap: anywhere; word-break: break-word; font-weight: 600; }
      .item-amt { font-weight: 700; white-space: nowrap; }
      .net-row { margin-top: 5px; padding-top: 5px; border-top: 1px solid #0f172a; font-weight: 900; font-size: ${isStandard ? 15 : isCompact ? 11.5 : 13}px; }
      .pay-status, .thanks, .qr-wrap, .powered { text-align: center; }
      .qr-wrap { margin-top: 8px; }
      .powered { font-size: 8.5px; color: #94a3b8; letter-spacing: 0.08em; margin-top: 8px; }
    </style>
  </head>
  <body>${copiesHtml}</body>
</html>`
}

/**
 * Universal PDF builder shared by Print Receipt Now, Download PDF, Save as PDF,
 * Microsoft Print to PDF, and physical thermal printers.
 */
export async function generateReceiptPdfDoc(
  receiptData,
  paperSizeId = DEFAULT_PAPER_SIZE_ID,
  options = {}
) {
  const { jsPDF } = await import('jspdf')
  const preset = getPaperSizePreset(paperSizeId)
  const isCompact = preset.id === '58mm'
  const isStandard = preset.category === 'standard'
  const widthMm = preset.widthMm
  const marginMm = preset.marginMm
  const contentWidth = widthMm - marginMm * 2
  const pageHeightMm = calculateReceiptHeightMm(receiptData, paperSizeId, options)
  const pageCount = Math.max(1, Number(options.copies || 1))
  const includeGst = options.includeGst ?? true
  const showFeedbackQr = options.showFeedbackQr ?? true
  const qrDataUrl = options.qrDataUrl || ''

  const {
    header,
    totals,
    items,
    tableNo,
    invoiceCode,
    createdAt,
    modeLabel,
    guestLabel,
    guestCount,
    resolvedPayMethod,
    discountAmount,
  } = receiptData

  const dateText = createdAt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: isCompact ? '2-digit' : 'short',
    year: isStandard ? 'numeric' : undefined,
  })
  const timeText = createdAt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  const formattedDateTime = `${dateText}, ${timeText}`

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthMm, pageHeightMm],
  })

  // Signal PDF viewers & thermal print drivers to match the PDF's exact physical size
  pdf.internal.events.subscribe('putCatalog', () => {
    pdf.internal.write('/ViewerPreferences <</PickTrayByPDFSize true /PrintScaling /None>>')
  })

  const headerFontSize = isStandard ? 15 : isCompact ? 9 : 11
  const bodyFontSize = isStandard ? 9.5 : isCompact ? 6.5 : 7.5
  const totalFontSize = isStandard ? 12 : isCompact ? 8 : 9.5
  const lineStep = isStandard ? 4.8 : 3.5

  const renderCopy = () => {
    let y = isStandard ? marginMm : 9.5
    const maxY = pageHeightMm - marginMm - 4

    const ensureSpace = (neededMm) => {
      if (isStandard && y + neededMm > maxY) {
        pdf.addPage([widthMm, pageHeightMm], 'portrait')
        y = marginMm
      }
    }

    const drawDashedRule = (ruleY) => {
      pdf.setDrawColor(203, 213, 225) // #cbd5e1
      pdf.setLineWidth(0.25)
      if (typeof pdf.setLineDashPattern === 'function') {
        pdf.setLineDashPattern([1.1, 1.1], 0)
      }
      pdf.line(marginMm, ruleY, widthMm - marginMm, ruleY)
      if (typeof pdf.setLineDashPattern === 'function') {
        pdf.setLineDashPattern([], 0)
      }
    }

    const drawSolidRule = (ruleY) => {
      pdf.setDrawColor(226, 232, 240) // #e2e8f0
      pdf.setLineWidth(0.25)
      pdf.line(marginMm, ruleY, widthMm - marginMm, ruleY)
    }

    // Header
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('courier', 'bold')
    pdf.setFontSize(headerFontSize)
    const restLines = pdf.splitTextToSize(header.name.toUpperCase(), contentWidth)
    pdf.text(restLines, widthMm / 2, y, { align: 'center' })
    y += restLines.length * (isStandard ? 5.8 : 4)

    pdf.setFont('courier', 'normal')
    pdf.setFontSize(bodyFontSize)
    pdf.setTextColor(71, 85, 105)
    if (header.address) {
      const addrLines = pdf.splitTextToSize(header.address, contentWidth)
      pdf.text(addrLines, widthMm / 2, y, { align: 'center' })
      y += addrLines.length * lineStep
    }
    if (header.gstin) {
      pdf.text(`GSTIN: ${header.gstin}`, widthMm / 2, y, { align: 'center' })
      y += lineStep
    }
    if (header.phone) {
      pdf.text(`Ph: ${header.phone}`, widthMm / 2, y, { align: 'center' })
      y += lineStep
    }

    y += 2.5
    drawDashedRule(y)
    y += lineStep + 1

    // Metadata
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('courier', 'bold')
    pdf.text(`Bill No: ${invoiceCode}`, marginMm, y)
    pdf.setFont('courier', 'normal')
    pdf.setTextColor(71, 85, 105)
    pdf.text(formattedDateTime, widthMm - marginMm, y, { align: 'right' })
    y += lineStep + 0.3
    pdf.text(`Table: Table ${tableNo} (${modeLabel})`, marginMm, y)
    pdf.text(guestLabel.slice(0, isStandard ? 28 : 14), widthMm - marginMm, y, {
      align: 'right',
    })
    y += lineStep + 0.3
    if (guestCount) {
      pdf.text(`Guests: ${guestCount}`, marginMm, y)
      y += lineStep
    }

    y += 1.5
    drawDashedRule(y)
    y += lineStep + 1.2

    // Items header
    pdf.setTextColor(100, 116, 139)
    pdf.setFont('courier', 'bold')
    pdf.text('QTY ITEM', marginMm, y)
    pdf.text('AMT', widthMm - marginMm, y, { align: 'right' })
    y += 2
    drawSolidRule(y)
    y += lineStep + 0.6
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('courier', 'normal')

    const itemTextWidth = contentWidth - (isStandard ? 28 : 15)
    items.forEach((item) => {
      const qty = Number(item.quantity || 1)
      const label = `${qty}x ${item.name || item.item_name || 'Dish'}${
        item.variant && item.variant !== 'full' ? ` (${item.variant})` : ''
      }`
      const amt = (Number(item.price || 0) * qty).toFixed(2)
      const wrapped = pdf.splitTextToSize(label, itemTextWidth)

      ensureSpace(wrapped.length * lineStep + 2)
      pdf.text(wrapped[0], marginMm, y)
      pdf.setFont('courier', 'bold')
      pdf.text(amt, widthMm - marginMm, y, { align: 'right' })
      pdf.setFont('courier', 'normal')
      y += lineStep
      for (let idx = 1; idx < wrapped.length; idx += 1) {
        pdf.text(wrapped[idx], marginMm + 2, y)
        y += lineStep
      }
    })

    ensureSpace(34)
    y += 1.5
    drawDashedRule(y)
    y += lineStep + 1

    // Totals
    pdf.setTextColor(71, 85, 105)
    pdf.text('Subtotal:', marginMm, y)
    pdf.text(totals.subtotal.toFixed(2), widthMm - marginMm, y, { align: 'right' })
    y += lineStep
    if (discountAmount > 0) {
      pdf.text('Discount:', marginMm, y)
      pdf.text(`-${discountAmount.toFixed(2)}`, widthMm - marginMm, y, {
        align: 'right',
      })
      y += lineStep
    }
    if (includeGst && totals.hasTax) {
      pdf.text(`CGST (${totals.halfRate}%):`, marginMm, y)
      pdf.text(totals.cgst.toFixed(2), widthMm - marginMm, y, { align: 'right' })
      y += lineStep
      pdf.text(`SGST (${totals.halfRate}%):`, marginMm, y)
      pdf.text(totals.sgst.toFixed(2), widthMm - marginMm, y, { align: 'right' })
      y += lineStep
    }

    y += 1
    drawSolidRule(y)
    y += lineStep + 0.8
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('courier', 'bold')
    pdf.setFontSize(totalFontSize)
    pdf.text('NET PAYABLE:', marginMm, y)
    pdf.text(`INR ${totals.grandTotal.toFixed(2)}`, widthMm - marginMm, y, {
      align: 'right',
    })
    y += lineStep + 1.5
    drawDashedRule(y)
    y += lineStep + 1.5

    pdf.setFont('courier', 'normal')
    pdf.setFontSize(bodyFontSize)
    pdf.setTextColor(71, 85, 105)
    const payPrefix = 'Paid via: '
    const payFull = `${payPrefix}${resolvedPayMethod}`
    const payFullW = pdf.getTextWidth(payFull)
    const payStartX = (widthMm - payFullW) / 2
    pdf.text(payPrefix, payStartX, y)
    pdf.setFont('courier', 'bold')
    pdf.setTextColor(15, 23, 42)
    pdf.text(resolvedPayMethod, payStartX + pdf.getTextWidth(payPrefix), y)
    pdf.setFont('courier', 'normal')
    pdf.setTextColor(71, 85, 105)

    y += lineStep + 1.2
    pdf.text('Thank you for dining with us! Visit again.', widthMm / 2, y, { align: 'center' })
    y += lineStep + 2

    if (showFeedbackQr && qrDataUrl) {
      const qrSize = isStandard ? 20 : isCompact ? 12 : 13.5
      ensureSpace(qrSize + 16)
      pdf.setDrawColor(226, 232, 240)
      pdf.rect((widthMm - qrSize) / 2 - 0.8, y - 0.8, qrSize + 1.6, qrSize + 1.6)
      pdf.addImage(qrDataUrl, 'PNG', (widthMm - qrSize) / 2, y, qrSize, qrSize)
      y += qrSize + 4
      pdf.setTextColor(148, 163, 184)
      pdf.text(
        isCompact ? 'Scan for E-Bill' : 'Scan for e-bill & feedback',
        widthMm / 2,
        y,
        { align: 'center' }
      )
      y += lineStep + 1.5
    }

    pdf.setTextColor(148, 163, 184)
    pdf.setFontSize(isStandard ? 7.5 : 6)
    pdf.text('POWERED BY SERVORA', widthMm / 2, y + 2, { align: 'center' })
    pdf.setTextColor(15, 23, 42)
  }

  for (let copyIdx = 0; copyIdx < pageCount; copyIdx += 1) {
    if (copyIdx > 0) {
      pdf.addPage([widthMm, pageHeightMm], 'portrait')
    }
    renderCopy()
  }

  return pdf
}
