/**
 * Official QZ Tray v2.x Native Printer Bridge & ESC/POS Command Builder.
 *
 * - Uses the official `qz-tray` client library (`qz.websocket`, `qz.security`,
 *   `qz.printers`, `qz.configs`, `qz.print`).
 * - Configures documented certificate & SHA-512 server-side signing promises
 *   (private key never resides in frontend code).
 * - Reuses healthy connections, reconnects on drop, verifies exact printer names,
 *   and serializes concurrent print jobs.
 */

import qzTrayPkg from 'qz-tray'
import { sanitizePrinterName } from './printerProfiles'

/**
 * Validate a print job payload before dispatching to either QZ Tray or Browser PDF.
 */
export function validatePrintJob({ paperSizeId, copies = 1, receiptData, printerProfile } = {}) {
  const errors = []
  const allowedPapers = new Set(['80mm', '58mm', 'a4', 'a5', 'letter'])
  if (!allowedPapers.has(paperSizeId)) {
    errors.push(`Unsupported paper size "${String(paperSizeId)}"`)
  }
  const numCopies = Number(copies)
  if (!Number.isInteger(numCopies) || numCopies < 1 || numCopies > 5) {
    errors.push('Copies must be an integer between 1 and 5')
  }
  if (!receiptData || !receiptData.header || !Array.isArray(receiptData.items)) {
    errors.push('Receipt payload is missing header or items')
  }
  if (
    printerProfile?.commandMode === 'ESC_POS' &&
    !['80mm', '58mm'].includes(paperSizeId)
  ) {
    errors.push('ESC/POS raw command mode only supports 58mm or 80mm thermal rolls')
  }
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Infer printer type, printable width, DPI, encoding, and command mode from real OS/driver metadata.
 * Never claims loaded physical roll width is auto-detected; uses driver name/profile defaults.
 */
export function classifyDiscoveredPrinter(rawPrinter) {
  const rawName =
    typeof rawPrinter === 'string'
      ? rawPrinter
      : rawPrinter?.name || rawPrinter?.printerName || 'Unknown Printer'
  const name = sanitizePrinterName(rawName, 'Unknown Printer')
  const driver = sanitizePrinterName(rawPrinter?.driver || '', '')
  const connectionRaw = String(rawPrinter?.connection || '').toLowerCase()
  const lower = `${name} ${driver}`.toLowerCase()

  const isVirtualPdf =
    lower.includes('microsoft print to pdf') ||
    lower.includes('xps document writer') ||
    lower.includes('fax') ||
    lower.includes('onenote') ||
    lower.includes('adobe pdf')

  const isOfficeModelHint =
    lower.includes('laserjet') ||
    lower.includes('officejet') ||
    lower.includes('deskjet') ||
    lower.includes('ecotank') ||
    lower.includes('inkjet') ||
    lower.includes('pixma') ||
    lower.includes('workforce') ||
    lower.includes('mfc-') ||
    lower.includes('hl-')

  const is58mmHint =
    lower.includes('58') || lower.includes('2 inch') || lower.includes('2"')

  const isThermalHint =
    !isVirtualPdf &&
    !isOfficeModelHint &&
    (lower.includes('tm-t') ||
      lower.includes('tm-m') ||
      lower.includes('tsp') ||
      lower.includes('bixolon') ||
      lower.includes('rongta') ||
      lower.includes('xprinter') ||
      lower.includes('pos-80') ||
      lower.includes('pos-58') ||
      lower.includes('pos80') ||
      lower.includes('pos58') ||
      lower.includes('thermal') ||
      lower.includes('receipt') ||
      lower.includes('80mm') ||
      lower.includes('58mm'))

  const isMicrosoftPdf = lower.includes('microsoft print to pdf')
  const printerType = isVirtualPdf
    ? 'virtual_pdf'
    : isThermalHint
      ? 'thermal_escpos'
      : 'standard_office'

  const configuredPaperWidth = isThermalHint
    ? is58mmHint
      ? '58mm'
      : '80mm'
    : 'a4'

  const printableWidthMm =
    configuredPaperWidth === '58mm'
      ? 48
      : configuredPaperWidth === '80mm'
        ? 72
        : 178

  const printableDots =
    configuredPaperWidth === '58mm'
      ? 384
      : configuredPaperWidth === '80mm'
        ? 576
        : 2100

  const connectionMethod = connectionRaw.includes('wifi') || lower.includes('wifi')
    ? 'wifi'
    : connectionRaw.includes('net') || connectionRaw.includes('ip') || lower.includes('lan')
      ? 'ethernet'
      : isVirtualPdf
        ? 'browser'
        : 'usb'

  const driverReportedPapers = Array.isArray(rawPrinter?.paperSizes)
    ? rawPrinter.paperSizes
    : isMicrosoftPdf
      ? ['Letter', 'A4', 'A5', 'Legal']
      : []

  return {
    id: `qz:${name}`,
    name,
    label: isThermalHint
      ? `${name} (Thermal • ${configuredPaperWidth})`
      : isVirtualPdf
        ? `${name} (Virtual Driver)`
        : `${name} (Office / Standard)`,
    printerType,
    connectionMethod,
    configuredPaperWidth,
    printableWidthMm,
    dpi: isThermalHint ? 203 : 300,
    printableDots,
    encoding: isThermalHint ? 'CP437' : 'UTF-8',
    commandMode: isThermalHint ? 'ESC_POS' : 'PDF_SPOOL',
    connectionStatus: 'connected',
    source: 'qz-tray',
    capabilities: {
      supportsRawEscPos: isThermalHint,
      supportsCashDrawer: isThermalHint && !is58mmHint,
      supportsCutter: isThermalHint && !is58mmHint,
      supportsQr: true,
      supportsCustomRollSizes: !isVirtualPdf,
      driverReportedPapers,
      isDefault: Boolean(rawPrinter?.default),
      connection: rawPrinter?.connection || null,
      driver: driver || null,
    },
  }
}

/**
 * Build raw ESC/POS receipt or KOT commands for 58mm (32 cols) or 80mm (42 cols) thermal printers.
 */
export function buildEscPosReceiptCommands(receiptData, options = {}) {
  const paperWidth = options.paperWidth === '58mm' ? '58mm' : '80mm'
  const cols = paperWidth === '58mm' ? 32 : 42
  const station = options.station || 'billing' // 'billing' | 'kitchen' | 'bar'
  const includeGst = options.includeGst ?? true
  const showFeedbackQr = options.showFeedbackQr ?? true
  const openCashDrawer = options.openCashDrawer ?? false
  const autoCut = options.autoCut ?? true
  const qrUrl = options.qrUrl || ''

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

  const padLine = (left, right) => {
    const l = String(left || '')
    const r = String(right || '')
    const space = Math.max(1, cols - l.length - r.length)
    return `${l.slice(0, Math.max(1, cols - r.length - 1))}${' '.repeat(space)}${r}\n`
  }

  const sep = `${'-'.repeat(cols)}\n`
  const ESC = '\x1B'
  const GS = '\x1D'

  const cmds = []
  cmds.push(`${ESC}@`) // Initialize printer
  cmds.push(`${ESC}a\x01`) // Center align
  cmds.push(`${ESC}E\x01`) // Bold on

  if (station === 'kitchen' || station === 'bar') {
    cmds.push(`*** ${station.toUpperCase()} KOT ***\n`)
  }
  cmds.push(`${String(header.name || 'Restaurant').toUpperCase()}\n`)
  cmds.push(`${ESC}E\x00`) // Bold off

  if (station === 'billing') {
    if (header.address) cmds.push(`${header.address}\n`)
    if (header.gstin) cmds.push(`GSTIN: ${header.gstin}\n`)
    if (header.phone) cmds.push(`Ph: ${header.phone}\n`)
  }

  cmds.push(`${ESC}a\x00`) // Left align
  cmds.push(sep)
  const dt = new Date(createdAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  cmds.push(padLine(`Bill: ${invoiceCode}`, dt))
  cmds.push(padLine(`Tbl ${tableNo} (${modeLabel})`, String(guestLabel).slice(0, 14)))
  if (guestCount) cmds.push(`Guests: ${guestCount}\n`)
  cmds.push(sep)
  cmds.push(padLine(station === 'billing' ? 'QTY ITEM' : 'QTY DISH', station === 'billing' ? 'AMT' : 'NOTE'))

  ;(items || []).forEach((item) => {
    const qty = Number(item.quantity || 1)
    const name = `${qty}x ${item.name || item.item_name || 'Dish'}${
      item.variant && item.variant !== 'full' ? ` (${item.variant})` : ''
    }`
    if (station === 'billing') {
      const amt = (Number(item.price || 0) * qty).toFixed(2)
      cmds.push(padLine(name, amt))
    } else {
      cmds.push(padLine(name, item.notes ? String(item.notes).slice(0, 10) : 'PREP'))
    }
  })

  if (station === 'billing') {
    cmds.push(sep)
    cmds.push(padLine('Subtotal:', totals.subtotal.toFixed(2)))
    if (discountAmount > 0) {
      cmds.push(padLine('Discount:', `-${discountAmount.toFixed(2)}`))
    }
    if (includeGst && totals.hasTax) {
      cmds.push(padLine(`CGST (${totals.halfRate}%):`, totals.cgst.toFixed(2)))
      cmds.push(padLine(`SGST (${totals.halfRate}%):`, totals.sgst.toFixed(2)))
    }
    cmds.push(`${ESC}E\x01`)
    cmds.push(padLine('NET PAYABLE:', `INR ${totals.grandTotal.toFixed(2)}`))
    cmds.push(`${ESC}E\x00`)
    cmds.push(sep)

    cmds.push(`${ESC}a\x01`) // Center align
    cmds.push(`Paid via: ${resolvedPayMethod}\n`)
    cmds.push(`Thank you for dining with us!\n`)

    if (showFeedbackQr && qrUrl) {
      const qrBytes = qrUrl.length + 3
      const pL = String.fromCharCode(qrBytes % 256)
      const pH = String.fromCharCode(Math.floor(qrBytes / 256))
      cmds.push(`${GS}(k\x04\x00\x31\x41\x32\x00`) // Model 2
      cmds.push(`${GS}(k\x03\x00\x31\x43\x05`) // Module size 5
      cmds.push(`${GS}(k\x03\x00\x31\x45\x31`) // Error correction M
      cmds.push(`${GS}(k${pL}${pH}\x31\x50\x30${qrUrl}`) // Store data
      cmds.push(`${GS}(k\x03\x00\x31\x51\x30`) // Print QR
      cmds.push('Scan for e-bill & feedback\n')
    }

    cmds.push('POWERED BY SERVORA\n\n\n')
  } else {
    cmds.push('\n\n')
  }

  if (autoCut) {
    cmds.push(`${GS}V\x42\x00`) // Partial cut
  }

  if (openCashDrawer && station === 'billing') {
    cmds.push(`${ESC}p\x00\x19\xFA`) // Cash drawer kick pulse
  }

  return cmds.join('')
}

/**
 * Request a digital RSA-SHA512 signature from Servora's authenticated backend
 * (/api/print/qz-sign). Private key is never exposed to frontend code.
 */
export async function requestServerPrintSignature(
  toSign,
  { apiBaseUrl = '', accessToken = '', restaurantId = '' } = {}
) {
  if (!accessToken || !toSign) return null
  try {
    const res = await fetch(`${apiBaseUrl}/api/print/qz-sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ toSign, ...(restaurantId ? { restaurantId } : {}) }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.signature || null
  } catch {
    return null
  }
}

/**
 * QZ Tray Bridge powered by the official `qz-tray` v2.x client.
 */
export function createQzTrayBridge(options = {}) {
  const timeoutMs = Number(options.timeoutMs || 2500)
  const apiBaseUrl = options.apiBaseUrl || ''
  const getAccessToken = options.getAccessToken || (() => '')
  const getRestaurantId = options.getRestaurantId || (() => '')
  const injectedQz = options.qzClient || null
  const listeners = new Set()
  let connectionState = 'disconnected'
  let securityConfigured = false
  let jobQueue = Promise.resolve()

  const enqueuePrintJob = (task) => {
    const next = jobQueue.then(task, task)
    jobQueue = next.catch(() => {})
    return next
  }

  const emitState = (nextState, detail = null) => {
    connectionState = nextState
    listeners.forEach((cb) => {
      try {
        cb({ state: nextState, detail })
      } catch {
        // ignore listener errors
      }
    })
  }

  const getQzClient = () => {
    if (injectedQz) return injectedQz
    if (typeof window !== 'undefined' && window.qz) return window.qz
    return qzTrayPkg || null
  }

  const configureSecurity = (qz) => {
    if (!qz?.security || securityConfigured) return
    if (typeof qz.security.setCertificatePromise === 'function') {
      qz.security.setCertificatePromise((resolve, reject) => {
        fetch(`${apiBaseUrl}/api/print/qz-certificate`)
          .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Certificate HTTP ${r.status}`))))
          .then((cert) => resolve(cert))
          .catch((err) => reject(err))
      })
    }
    if (typeof qz.security.setSignatureAlgorithm === 'function') {
      qz.security.setSignatureAlgorithm('SHA512')
    }
    if (typeof qz.security.setSignaturePromise === 'function') {
      qz.security.setSignaturePromise((toSign) => async (resolve, reject) => {
        try {
          const token = await Promise.resolve(getAccessToken())
          const restaurantId = await Promise.resolve(getRestaurantId())
          const sig = await requestServerPrintSignature(toSign, {
            apiBaseUrl,
            accessToken: token,
            restaurantId,
          })
          if (sig) resolve(sig)
          else reject(new Error('Server QZ Tray signature unavailable'))
        } catch (err) {
          reject(err)
        }
      })
    }
    if (typeof qz.websocket?.setClosedCallbacks === 'function') {
      qz.websocket.setClosedCallbacks(() => emitState('disconnected'))
    }
    if (typeof qz.websocket?.setErrorCallbacks === 'function') {
      qz.websocket.setErrorCallbacks((err) => emitState('error', { error: err?.message || String(err) }))
    }
    securityConfigured = true
  }

  const ensureConnected = async () => {
    const qz = getQzClient()
    if (!qz?.websocket) {
      throw new Error('Official QZ Tray client unavailable')
    }
    configureSecurity(qz)
    if (typeof qz.websocket.isActive === 'function' && qz.websocket.isActive()) {
      if (connectionState !== 'connected') emitState('connected')
      return qz
    }
    emitState('connecting')
    await Promise.race([
      qz.websocket.connect({ retries: 0, delay: 0 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('QZ Tray connection timeout')), timeoutMs)
      ),
    ])
    emitState('connected')
    return qz
  }

  return {
    getConnectionState: () => connectionState,

    onStatusChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    async ensureConnected() {
      return ensureConnected()
    },

    async findExactPrinter(exactName) {
      const safeName = sanitizePrinterName(exactName, '')
      if (!safeName) return null
      const qz = await ensureConnected()
      if (typeof qz.printers?.find !== 'function') return null
      try {
        const matched = await qz.printers.find(safeName)
        if (!matched) return null
        const matchedName = typeof matched === 'string' ? matched : matched?.name
        if (String(matchedName || '').toLowerCase() !== safeName.toLowerCase()) {
          return null
        }
        return matchedName
      } catch {
        return null
      }
    },

    async discoverPrinters() {
      try {
        const qz = await ensureConnected()
        const rawList =
          typeof qz.printers?.details === 'function'
            ? await qz.printers.details()
            : await qz.printers.find()
        const printers = (Array.isArray(rawList) ? rawList : []).map(
          classifyDiscoveredPrinter
        )
        emitState('connected', { count: printers.length, transport: 'qz-tray' })
        return {
          connected: true,
          transport: 'qz-tray',
          printers,
          error: null,
        }
      } catch (err) {
        emitState('disconnected', { error: err?.message || 'QZ Tray unavailable' })
        return {
          connected: false,
          transport: 'none',
          printers: [],
          error: err?.message || 'QZ Tray daemon is not running',
        }
      }
    },

    async reconnectWithBackoff(maxAttempts = 2) {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        emitState('reconnecting', { attempt, maxAttempts })
        const res = await this.discoverPrinters()
        if (res.connected) return res
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 350))
        }
      }
      return {
        connected: false,
        transport: 'none',
        printers: [],
        error: 'QZ Tray reconnection failed',
      }
    },

    async disconnect() {
      const qz = getQzClient()
      if (qz?.websocket?.isActive?.()) {
        try {
          await qz.websocket.disconnect()
        } catch {
          // ignore
        }
      }
      emitState('disconnected')
    },

    async printRawEscPos(printerName, rawCommands, copies = 1) {
      return enqueuePrintJob(async () => {
        const safeName = sanitizePrinterName(printerName)
        const qz = await ensureConnected()
        const cfg = qz.configs.create(safeName, { copies })
        await qz.print(cfg, [{ type: 'raw', format: 'plain', data: rawCommands }])
        return { printed: true, mode: 'qz-raw-escpos' }
      })
    },

    async printPdfBase64(printerName, pdfBase64, paperPreset, pageHeightMm, copies = 1) {
      return enqueuePrintJob(async () => {
        const safeName = sanitizePrinterName(printerName)
        const qz = await ensureConnected()
        const cfg = qz.configs.create(safeName, {
          copies,
          units: 'mm',
          size: { width: paperPreset.widthMm, height: pageHeightMm },
          scaleContent: false,
          margins: 0,
        })
        await qz.print(cfg, [
          { type: 'pixel', format: 'pdf', flavor: 'base64', data: pdfBase64 },
        ])
        return { printed: true, mode: 'qz-pdf-spool' }
      })
    },
  }
}
