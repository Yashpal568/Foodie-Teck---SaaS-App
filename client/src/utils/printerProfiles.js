/**
 * Hardware-Independent Printer Profile System, Connection Types,
 * Untrusted Name Sanitization, and Per-Restaurant / Per-Terminal Station Routing.
 */

export const PRINT_STATIONS = {
  BILLING: 'billing',
  KITCHEN: 'kitchen',
  BAR: 'bar',
}

export const CONNECTION_METHODS = [
  { id: 'usb', label: 'USB Direct' },
  { id: 'ethernet', label: 'Ethernet / LAN' },
  { id: 'wifi', label: 'Wi-Fi Network' },
  { id: 'browser', label: 'Browser / OS Driver' },
]

/**
 * Detailed hardware profiles accounting for DPI, printable dot width,
 * margins, character encoding, ESC/POS, QR/barcode, cutter, and cash drawer.
 */
export const HARDWARE_PROFILE_TEMPLATES = {
  'thermal-80-usb': {
    id: 'thermal-80-usb',
    label: '80mm Thermal Printer (USB • ESC/POS)',
    printerType: 'thermal_escpos',
    connectionMethod: 'usb',
    paperWidthId: '80mm',
    paperWidthMm: 80,
    printableWidthMm: 72,
    dpi: 203,
    printableDots: 576,
    marginsMm: { top: 2, right: 4, bottom: 4, left: 4 },
    encoding: 'CP437',
    charsPerLine: 42,
    escPosCompatible: true,
    qrSupported: true,
    barcodeSupported: true,
    hasCutter: true,
    hasCashDrawer: true,
    commandMode: 'ESC_POS',
  },
  'thermal-80-network': {
    id: 'thermal-80-network',
    label: '80mm Thermal Printer (Ethernet / Wi-Fi • ESC/POS)',
    printerType: 'thermal_escpos',
    connectionMethod: 'ethernet',
    paperWidthId: '80mm',
    paperWidthMm: 80,
    printableWidthMm: 72,
    dpi: 203,
    printableDots: 576,
    marginsMm: { top: 2, right: 4, bottom: 4, left: 4 },
    encoding: 'CP437',
    charsPerLine: 42,
    escPosCompatible: true,
    qrSupported: true,
    barcodeSupported: true,
    hasCutter: true,
    hasCashDrawer: true,
    commandMode: 'ESC_POS',
  },
  'thermal-58-compact': {
    id: 'thermal-58-compact',
    label: '58mm Compact Thermal Printer (USB / Wi-Fi • ESC/POS)',
    printerType: 'thermal_escpos',
    connectionMethod: 'usb',
    paperWidthId: '58mm',
    paperWidthMm: 58,
    printableWidthMm: 48,
    dpi: 203,
    printableDots: 384,
    marginsMm: { top: 2, right: 5, bottom: 4, left: 5 },
    encoding: 'CP437',
    charsPerLine: 32,
    escPosCompatible: true,
    qrSupported: true,
    barcodeSupported: true,
    hasCutter: false,
    hasCashDrawer: false,
    commandMode: 'ESC_POS',
  },
  'office-a4': {
    id: 'office-a4',
    label: 'Standard Office Printer (A4 • PDF)',
    printerType: 'standard_office',
    connectionMethod: 'browser',
    paperWidthId: 'a4',
    paperWidthMm: 210,
    printableWidthMm: 178,
    dpi: 300,
    printableDots: 2100,
    marginsMm: { top: 16, right: 16, bottom: 16, left: 16 },
    encoding: 'UTF-8',
    charsPerLine: 72,
    escPosCompatible: false,
    qrSupported: true,
    barcodeSupported: true,
    hasCutter: false,
    hasCashDrawer: false,
    commandMode: 'PDF_SPOOL',
  },
  'office-a5': {
    id: 'office-a5',
    label: 'Standard Office Printer (A5 • PDF)',
    printerType: 'standard_office',
    connectionMethod: 'browser',
    paperWidthId: 'a5',
    paperWidthMm: 148,
    printableWidthMm: 124,
    dpi: 300,
    printableDots: 1464,
    marginsMm: { top: 12, right: 12, bottom: 12, left: 12 },
    encoding: 'UTF-8',
    charsPerLine: 52,
    escPosCompatible: false,
    qrSupported: true,
    barcodeSupported: true,
    hasCutter: false,
    hasCashDrawer: false,
    commandMode: 'PDF_SPOOL',
  },
  'office-letter': {
    id: 'office-letter',
    label: 'Standard Office / Microsoft Print to PDF (Letter)',
    printerType: 'virtual_pdf',
    connectionMethod: 'browser',
    paperWidthId: 'letter',
    paperWidthMm: 215.9,
    printableWidthMm: 183.9,
    dpi: 300,
    printableDots: 2172,
    marginsMm: { top: 16, right: 16, bottom: 16, left: 16 },
    encoding: 'UTF-8',
    charsPerLine: 74,
    escPosCompatible: false,
    qrSupported: true,
    barcodeSupported: true,
    hasCutter: false,
    hasCashDrawer: false,
    commandMode: 'BROWSER_PRINT',
  },
}

/**
 * Sanitize untrusted printer names / OS strings before display or storage.
 */
export function sanitizePrinterName(rawName, fallback = 'Unnamed Printer') {
  const cleaned = String(rawName ?? '')
    .replace(/[\x00-\x1F\x7F<>]/g, '')
    .trim()
    .slice(0, 96)
  return cleaned || fallback
}

const TERMINAL_ID_STORAGE_KEY = 'servora_pos_terminal_id'

export function getOrCreateTerminalId() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'terminal-default'
  }
  const existing = window.localStorage.getItem(TERMINAL_ID_STORAGE_KEY)
  if (existing && /^[a-z0-9_-]{3,40}$/i.test(existing)) {
    return existing
  }
  const generated = `term-${Math.random().toString(36).slice(2, 8)}`
  window.localStorage.setItem(TERMINAL_ID_STORAGE_KEY, generated)
  return generated
}

export function getTerminalConfigStorageKey(restaurantId, terminalId) {
  const safeRid = String(restaurantId || 'default').replace(/[^a-z0-9_-]/gi, '_')
  const safeTid = String(terminalId || 'terminal-default').replace(/[^a-z0-9_-]/gi, '_')
  return `servora_printer_cfg_${safeRid}_${safeTid}`
}

export function createDefaultTerminalConfig(restaurantId = 'default', terminalId = 'terminal-default') {
  return {
    restaurantId: String(restaurantId || 'default'),
    terminalId: String(terminalId || 'terminal-default'),
    terminalLabel: 'Main Billing Counter',
    updatedAt: null,
    stations: {
      [PRINT_STATIONS.BILLING]: {
        station: PRINT_STATIONS.BILLING,
        enabled: true,
        printerId: 'browser-pdf',
        printerName: 'Browser Print / Save as PDF',
        templateId: 'thermal-80-usb',
        connectionMethod: 'browser',
        paperWidthId: '80mm',
        printableWidthMm: 72,
        copies: 1,
        autoCut: true,
        openCashDrawer: true,
        alignmentVerified: false,
      },
      [PRINT_STATIONS.KITCHEN]: {
        station: PRINT_STATIONS.KITCHEN,
        enabled: false,
        printerId: 'browser-pdf',
        printerName: 'Kitchen Printer (Not Configured)',
        templateId: 'thermal-80-network',
        connectionMethod: 'ethernet',
        paperWidthId: '80mm',
        printableWidthMm: 72,
        copies: 1,
        autoCut: true,
        openCashDrawer: false,
        alignmentVerified: false,
      },
      [PRINT_STATIONS.BAR]: {
        station: PRINT_STATIONS.BAR,
        enabled: false,
        printerId: 'browser-pdf',
        printerName: 'Bar Printer (Not Configured)',
        templateId: 'thermal-58-compact',
        connectionMethod: 'wifi',
        paperWidthId: '58mm',
        printableWidthMm: 48,
        copies: 1,
        autoCut: false,
        openCashDrawer: false,
        alignmentVerified: false,
      },
    },
  }
}

export function loadTerminalPrinterConfig(restaurantId, terminalId = getOrCreateTerminalId()) {
  const defaults = createDefaultTerminalConfig(restaurantId, terminalId)
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults
  }
  try {
    const raw = window.localStorage.getItem(getTerminalConfigStorageKey(restaurantId, terminalId))
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaults
    if (parsed.restaurantId && String(parsed.restaurantId) !== String(restaurantId || 'default')) {
      return defaults
    }
    return {
      ...defaults,
      ...parsed,
      terminalLabel: sanitizePrinterName(parsed.terminalLabel, defaults.terminalLabel),
      stations: {
        ...defaults.stations,
        ...(parsed.stations || {}),
      },
    }
  } catch {
    return defaults
  }
}

export function saveTerminalPrinterConfig(restaurantId, terminalId, nextConfig) {
  const key = getTerminalConfigStorageKey(restaurantId, terminalId)
  const payload = {
    ...createDefaultTerminalConfig(restaurantId, terminalId),
    ...nextConfig,
    restaurantId: String(restaurantId || 'default'),
    terminalId: String(terminalId || 'terminal-default'),
    terminalLabel: sanitizePrinterName(nextConfig?.terminalLabel, 'Main Billing Counter'),
    updatedAt: new Date().toISOString(),
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, JSON.stringify(payload))
  }
  return payload
}

/**
 * Resolve the configured station printer & paper profile for Billing, Kitchen, or Bar.
 */
export function resolveStationPrinterRoute(config, station = PRINT_STATIONS.BILLING) {
  const stationCfg = config?.stations?.[station] || config?.stations?.[PRINT_STATIONS.BILLING]
  const template =
    HARDWARE_PROFILE_TEMPLATES[stationCfg?.templateId] ||
    HARDWARE_PROFILE_TEMPLATES['thermal-80-usb']

  return {
    station,
    enabled: Boolean(stationCfg?.enabled),
    printerId: String(stationCfg?.printerId || 'browser-pdf'),
    printerName: sanitizePrinterName(stationCfg?.printerName, template.label),
    paperWidthId: stationCfg?.paperWidthId || template.paperWidthId,
    printableWidthMm: Number(stationCfg?.printableWidthMm || template.printableWidthMm),
    copies: Math.max(1, Math.min(5, Number(stationCfg?.copies || 1))),
    openCashDrawer: Boolean(stationCfg?.openCashDrawer && template.hasCashDrawer),
    autoCut: Boolean(stationCfg?.autoCut && template.hasCutter),
    alignmentVerified: Boolean(stationCfg?.alignmentVerified),
    isConfigured:
      Boolean(stationCfg?.enabled) &&
      String(stationCfg?.printerId || 'browser-pdf').startsWith('qz:'),
    template,
  }
}

/**
 * Sync saved terminal printer configuration from authenticated backend (/api/print/config)
 * and cache locally so configurations survive browser restarts & storage clears.
 */
export async function syncTerminalPrinterConfigFromServer(
  restaurantId,
  terminalId = getOrCreateTerminalId(),
  { apiBaseUrl = '', accessToken = '' } = {}
) {
  const local = loadTerminalPrinterConfig(restaurantId, terminalId)
  if (!restaurantId || !accessToken) return local
  try {
    const res = await fetch(
      `${apiBaseUrl}/api/print/config?restaurantId=${encodeURIComponent(restaurantId)}&terminalId=${encodeURIComponent(terminalId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return local
    const data = await res.json()
    if (data?.config && String(data.config.restaurantId) === String(restaurantId)) {
      return saveTerminalPrinterConfig(restaurantId, terminalId, data.config)
    }
    return local
  } catch {
    return local
  }
}

/**
 * Persist terminal printer configuration locally and durably on the server.
 */
export async function saveTerminalPrinterConfigToServer(
  restaurantId,
  terminalId,
  nextConfig,
  { apiBaseUrl = '', accessToken = '' } = {}
) {
  const savedLocal = saveTerminalPrinterConfig(restaurantId, terminalId, nextConfig)
  if (!restaurantId || !accessToken) {
    return { config: savedLocal, syncedToServer: false }
  }
  try {
    const res = await fetch(`${apiBaseUrl}/api/print/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(savedLocal),
    })
    return { config: savedLocal, syncedToServer: res.ok }
  } catch {
    return { config: savedLocal, syncedToServer: false }
  }
}
