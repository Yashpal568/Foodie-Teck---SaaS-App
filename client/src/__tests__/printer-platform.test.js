import { describe, it, expect, beforeEach } from 'vitest'
import {
  HARDWARE_PROFILE_TEMPLATES,
  PRINT_STATIONS,
  createDefaultTerminalConfig,
  loadTerminalPrinterConfig,
  resolveStationPrinterRoute,
  sanitizePrinterName,
  saveTerminalPrinterConfig,
} from '../utils/printerProfiles'
import {
  buildEscPosReceiptCommands,
  classifyDiscoveredPrinter,
  createQzTrayBridge,
  validatePrintJob,
} from '../utils/qzTrayBridge'
import {
  autoPrintStationReceipt,
  createPrinterAdapter,
  normalizeReceiptData,
} from '../utils/printConfig'

/**
 * In-memory ESC/POS & PDF Printer Emulator for hardware-independent verification.
 */
function createEscPosEmulator({ paperWidth = '80mm' } = {}) {
  const maxCols = paperWidth === '58mm' ? 32 : 42
  const jobs = []
  return {
    jobs,
    parseRawJob(raw, copies = 1) {
      const hasInit = raw.includes('\x1B@')
      const hasQr = raw.includes('\x1D(k')
      const hasCut = raw.includes('\x1DV\x42\x00')
      const hasDrawerKick = raw.includes('\x1Bp\x00\x19\xFA')
      const stripped = raw
        .replace(/\x1B[@aE][^\n]?/g, '')
        .replace(/\x1Bp\x00\x19\xFA/g, '')
        .replace(/\x1DV\x42\x00/g, '')
        .replace(/\x1D\(k[^\n]*/g, '')
      const lines = stripped.split('\n').filter(Boolean)
      const maxLineLength = lines.reduce((m, l) => Math.max(m, l.length), 0)
      const parsed = {
        hasInit,
        hasQr,
        hasCut,
        hasDrawerKick,
        maxLineLength,
        exceedsColumnLimit: maxLineLength > maxCols,
        lines,
        copies,
      }
      jobs.push(parsed)
      return parsed
    },
  }
}

const sampleProfile = {
  id: 'rest-emulator-1',
  business_name: 'Servora Royal Kitchen',
  address: '42 Indiranagar, Bengaluru',
  phone: '+91 98765 43210',
  gstin: '29AABCS1234F1Z5',
  gstEnabled: true,
  gstRate: 5,
}

const sampleOrder = {
  id: 'ord-emul-991',
  tableNumber: '12',
  guest_count: 3,
  customerName: 'Table 12 Guest',
  order_type: 'DINE_IN',
  paymentMethod: 'CARD',
  subtotal: 600,
  tax: 30,
  total: 630,
  gst_rate: 5,
  items: [
    { name: 'Tandoori Paneer Platter', price: 320, quantity: 1 },
    { name: 'Butter Garlic Naan', price: 140, quantity: 2 },
  ],
}

describe('Universal Restaurant Printing Platform & Emulator Suite', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defines hardware profiles with DPI, printable dot widths, margins, encoding, cutter, and drawer capabilities', () => {
    const p80 = HARDWARE_PROFILE_TEMPLATES['thermal-80-usb']
    expect(p80.paperWidthMm).toBe(80)
    expect(p80.printableWidthMm).toBe(72)
    expect(p80.dpi).toBe(203)
    expect(p80.printableDots).toBe(576)
    expect(p80.encoding).toBe('CP437')
    expect(p80.hasCutter).toBe(true)
    expect(p80.hasCashDrawer).toBe(true)

    const p58 = HARDWARE_PROFILE_TEMPLATES['thermal-58-compact']
    expect(p58.paperWidthMm).toBe(58)
    expect(p58.printableWidthMm).toBe(48)
    expect(p58.printableDots).toBe(384)
    expect(p58.charsPerLine).toBe(32)
    expect(p58.hasCashDrawer).toBe(false)

    const a4 = HARDWARE_PROFILE_TEMPLATES['office-a4']
    expect(a4.escPosCompatible).toBe(false)
    expect(a4.dpi).toBe(300)
  })

  it('isolates printer & station routing configs per restaurant and per billing terminal', () => {
    const restACfg = createDefaultTerminalConfig('rest-a', 'counter-1')
    restACfg.terminalLabel = 'Counter 1 <script>'
    restACfg.stations[PRINT_STATIONS.BILLING].paperWidthId = '58mm'
    restACfg.stations[PRINT_STATIONS.KITCHEN].enabled = true
    restACfg.stations[PRINT_STATIONS.KITCHEN].printerName = 'Kitchen-LAN-80'

    const savedA = saveTerminalPrinterConfig('rest-a', 'counter-1', restACfg)
    expect(savedA.terminalLabel).toBe('Counter 1 script') // sanitized <> removed

    const loadedA = loadTerminalPrinterConfig('rest-a', 'counter-1')
    const loadedOtherTerminal = loadTerminalPrinterConfig('rest-a', 'counter-2')
    const loadedOtherRest = loadTerminalPrinterConfig('rest-b', 'counter-1')

    expect(loadedA.stations[PRINT_STATIONS.BILLING].paperWidthId).toBe('58mm')
    expect(loadedOtherTerminal.stations[PRINT_STATIONS.BILLING].paperWidthId).toBe('80mm')
    expect(loadedOtherRest.stations[PRINT_STATIONS.KITCHEN].enabled).toBe(false)

    const kitchenRoute = resolveStationPrinterRoute(loadedA, PRINT_STATIONS.KITCHEN)
    expect(kitchenRoute.enabled).toBe(true)
    expect(kitchenRoute.printerName).toBe('Kitchen-LAN-80')
    expect(kitchenRoute.openCashDrawer).toBe(false)
  })

  it('sanitizes untrusted printer names and validates print jobs against unsupported configurations', () => {
    expect(sanitizePrinterName('EPSON\x00<img src=x> TM-T82')).toBe('EPSONimg src=x TM-T82')
    expect(sanitizePrinterName('   ', 'Fallback')).toBe('Fallback')

    const data = normalizeReceiptData(sampleOrder, sampleProfile)
    expect(validatePrintJob({ paperSizeId: 'invalid-roll', copies: 1, receiptData: data }).valid).toBe(false)
    expect(validatePrintJob({ paperSizeId: '80mm', copies: 99, receiptData: data }).valid).toBe(false)
    expect(
      validatePrintJob({
        paperSizeId: 'a4',
        copies: 1,
        receiptData: data,
        printerProfile: { commandMode: 'ESC_POS' },
      }).valid
    ).toBe(false)
  })

  it('validates 58mm, 80mm, and Kitchen KOT ESC/POS output through the printer emulator', async () => {
    const data = normalizeReceiptData(sampleOrder, sampleProfile)

    const emulator80 = createEscPosEmulator({ paperWidth: '80mm' })
    const raw80 = buildEscPosReceiptCommands(data, {
      paperWidth: '80mm',
      station: 'billing',
      openCashDrawer: true,
      autoCut: true,
      showFeedbackQr: true,
      qrUrl: 'https://servora.quantumesh.in/menu/rest-1?table=12',
    })
    const parsed80 = emulator80.parseRawJob(raw80, 1)
    expect(parsed80.hasInit).toBe(true)
    expect(parsed80.hasQr).toBe(true)
    expect(parsed80.hasCut).toBe(true)
    expect(parsed80.hasDrawerKick).toBe(true)
    expect(parsed80.exceedsColumnLimit).toBe(false)

    const emulator58 = createEscPosEmulator({ paperWidth: '58mm' })
    const raw58 = buildEscPosReceiptCommands(data, {
      paperWidth: '58mm',
      station: 'billing',
      openCashDrawer: false,
      autoCut: false,
      showFeedbackQr: true,
      qrUrl: 'https://servora.quantumesh.in/menu/rest-1?table=12',
    })
    const parsed58 = emulator58.parseRawJob(raw58, 1)
    expect(parsed58.exceedsColumnLimit).toBe(false)
    expect(parsed58.hasDrawerKick).toBe(false)
    expect(parsed58.hasCut).toBe(false)

    // Kitchen KOT format omits billing totals & never opens cash drawer
    const rawKitchen = buildEscPosReceiptCommands(data, {
      paperWidth: '80mm',
      station: 'kitchen',
      openCashDrawer: true,
      autoCut: true,
    })
    const parsedKitchen = emulator80.parseRawJob(rawKitchen, 1)
    expect(parsedKitchen.hasDrawerKick).toBe(false)
    expect(parsedKitchen.lines.join('\n')).toContain('*** KITCHEN KOT ***')
    expect(parsedKitchen.lines.join('\n')).not.toContain('NET PAYABLE')
  })

  it('handles QZ Tray connection failures and reconnection gracefully without breaking POS', async () => {
    const bridge = createQzTrayBridge({ timeoutMs: 50 })
    const states = []
    const unsub = bridge.onStatusChange((ev) => states.push(ev.state))

    const res = await bridge.reconnectWithBackoff(2)
    expect(res.connected).toBe(false)
    expect(res.printers).toEqual([])
    expect(states).toContain('reconnecting')
    expect(states[states.length - 1]).toBe('disconnected')
    unsub()

    // Adapter still returns browser fallback profiles when bridge fails
    const adapter = createPrinterAdapter(bridge)
    const discovery = await adapter.discoverPrinters()
    expect(discovery.connected).toBe(false)
    expect(discovery.printers.length).toBeGreaterThanOrEqual(3)
  })

  it('never misclassifies office inkjet/laser printers as ESC/POS thermal and rejects tampered cross-restaurant configs', () => {
    const ecotank = classifyDiscoveredPrinter({ name: 'EPSON EcoTank L3250 Series' })
    expect(ecotank.printerType).toBe('standard_office')
    expect(ecotank.capabilities.supportsRawEscPos).toBe(false)
    expect(ecotank.capabilities.supportsCashDrawer).toBe(false)

    const hpLaser = classifyDiscoveredPrinter({ name: 'HP LaserJet Pro M404n' })
    expect(hpLaser.printerType).toBe('standard_office')
    expect(hpLaser.configuredPaperWidth).toBe('a4')

    // Tampered storage payload with mismatched restaurantId must be rejected
    window.localStorage.setItem(
      'servora_printer_cfg_rest-target_term-1',
      JSON.stringify({ restaurantId: 'rest-attacker', terminalLabel: 'Spoofed' })
    )
    const loaded = loadTerminalPrinterConfig('rest-target', 'term-1')
    expect(loaded.restaurantId).toBe('rest-target')
    expect(loaded.terminalLabel).toBe('Main Billing Counter')
  })

  it('integrates official qz-tray lifecycle (cert, SHA512 signature, exact printer match, reconnect, job rejection)', async () => {
    let active = false
    let certCallback = null
    let sigCallback = null
    let connectCalls = 0
    let failPrint = false
    const printedJobs = []

    const mockQzClient = {
      security: {
        setCertificatePromise: (fn) => { certCallback = fn },
        setSignatureAlgorithm: () => {},
        setSignaturePromise: (fn) => { sigCallback = fn },
      },
      websocket: {
        isActive: () => active,
        connect: async () => {
          connectCalls += 1
          active = true
        },
        disconnect: async () => { active = false },
        setClosedCallbacks: () => {},
        setErrorCallbacks: () => {},
      },
      printers: {
        details: async () => [
          { name: 'EPSON TM-T82III Receipt', default: true },
          { name: 'Rongta RP58 58mm Thermal' },
        ],
        find: async (name) => {
          if (name === 'EPSON TM-T82III Receipt') return 'EPSON TM-T82III Receipt'
          return null
        },
      },
      configs: {
        create: (printer, opts) => ({ printer, opts }),
      },
      print: async (cfg, data) => {
        if (failPrint) throw new Error('Paper cover open')
        printedJobs.push({ cfg, data })
      },
    }

    const bridge = createQzTrayBridge({
      qzClient: mockQzClient,
      apiBaseUrl: '',
      getAccessToken: () => '',
      getRestaurantId: () => 'rest-emulator-1',
    })

    // Connects once and reuses active connection
    await bridge.ensureConnected()
    await bridge.ensureConnected()
    expect(connectCalls).toBe(1)
    expect(typeof certCallback).toBe('function')
    expect(typeof sigCallback).toBe('function')

    // Missing signature rejects cleanly instead of hanging
    await expect(
      new Promise((resolve, reject) => sigCallback('challenge')(resolve, reject))
    ).rejects.toThrow('Server QZ Tray signature unavailable')

    // Exact printer lookup
    expect(await bridge.findExactPrinter('EPSON TM-T82III Receipt')).toBe('EPSON TM-T82III Receipt')
    expect(await bridge.findExactPrinter('Renamed-Printer')).toBeNull()

    // Connection drop + reconnect recovery
    await bridge.disconnect()
    expect(mockQzClient.websocket.isActive()).toBe(false)
    const rec = await bridge.reconnectWithBackoff(2)
    expect(rec.connected).toBe(true)

    // Printer job rejection propagates honestly
    failPrint = true
    await expect(bridge.printRawEscPos('EPSON TM-T82III Receipt', 'DATA', 1)).rejects.toThrow('Paper cover open')
    failPrint = false
  })

  it('routes Billing, Kitchen KOT, and Bar KOT automatically and handles NOT_CONFIGURED, PRINTER_NOT_FOUND, BRIDGE_UNAVAILABLE, and duplicate retries', async () => {
    const data = normalizeReceiptData(sampleOrder, sampleProfile)

    // 1. Unconfigured first-time terminal returns NOT_CONFIGURED
    const uncfgAdapter = createPrinterAdapter({
      discoverPrinters: async () => ({ connected: true, printers: [] }),
    })
    const uncfgRes = await autoPrintStationReceipt({
      restaurantId: 'rest-emulator-1',
      terminalId: 'term-new',
      station: PRINT_STATIONS.BILLING,
      receiptData: data,
      printerAdapter: uncfgAdapter,
    })
    expect(uncfgRes.printed).toBe(false)
    expect(uncfgRes.reason).toBe('NOT_CONFIGURED')

    // 2. Save multi-station configuration (Billing = 80mm, Kitchen = 80mm LAN, Bar = 58mm)
    const cfg = createDefaultTerminalConfig('rest-emulator-1', 'term-main')
    cfg.stations[PRINT_STATIONS.BILLING] = {
      ...cfg.stations[PRINT_STATIONS.BILLING],
      enabled: true,
      printerId: 'qz:Billing-80',
      printerName: 'Billing-80',
      paperWidthId: '80mm',
      openCashDrawer: true,
    }
    cfg.stations[PRINT_STATIONS.KITCHEN] = {
      ...cfg.stations[PRINT_STATIONS.KITCHEN],
      enabled: true,
      printerId: 'qz:Kitchen-80',
      printerName: 'Kitchen-80',
      paperWidthId: '80mm',
      openCashDrawer: false,
    }
    cfg.stations[PRINT_STATIONS.BAR] = {
      ...cfg.stations[PRINT_STATIONS.BAR],
      enabled: true,
      printerId: 'qz:Bar-58',
      printerName: 'Bar-58',
      paperWidthId: '58mm',
      openCashDrawer: false,
    }
    saveTerminalPrinterConfig('rest-emulator-1', 'term-main', cfg)

    // 3. Bridge unavailable returns BRIDGE_UNAVAILABLE
    const offlineRes = await autoPrintStationReceipt({
      restaurantId: 'rest-emulator-1',
      terminalId: 'term-main',
      station: PRINT_STATIONS.BILLING,
      receiptData: data,
      printerAdapter: createPrinterAdapter({
        discoverPrinters: async () => ({ connected: false, printers: [] }),
      }),
    })
    expect(offlineRes.printed).toBe(false)
    expect(offlineRes.reason).toBe('BRIDGE_UNAVAILABLE')

    // 4. Renamed/missing printer returns PRINTER_NOT_FOUND
    const missingPrinterRes = await autoPrintStationReceipt({
      restaurantId: 'rest-emulator-1',
      terminalId: 'term-main',
      station: PRINT_STATIONS.BILLING,
      receiptData: data,
      printerAdapter: createPrinterAdapter({
        discoverPrinters: async () => ({
          connected: true,
          printers: [{ id: 'qz:Other-Printer', name: 'Other-Printer', source: 'qz-tray' }],
        }),
      }),
    })
    expect(missingPrinterRes.printed).toBe(false)
    expect(missingPrinterRes.reason).toBe('PRINTER_NOT_FOUND')

    // 5. Successful multi-station routing + duplicate in-flight lock
    const dispatched = []
    let releaseLock
    const slowBridge = {
      discoverPrinters: async () => ({
        connected: true,
        printers: [
          {
            id: 'qz:Billing-80',
            name: 'Billing-80',
            source: 'qz-tray',
            commandMode: 'ESC_POS',
            capabilities: { supportsRawEscPos: true, supportsCashDrawer: true },
          },
          {
            id: 'qz:Kitchen-80',
            name: 'Kitchen-80',
            source: 'qz-tray',
            commandMode: 'ESC_POS',
            capabilities: { supportsRawEscPos: true, supportsCashDrawer: false },
          },
        ],
      }),
      printRawEscPos: async (printerName, raw) => {
        if (printerName === 'Billing-80') {
          await new Promise((r) => { releaseLock = r })
        }
        dispatched.push({ printerName, raw })
        return { printed: true, mode: 'qz-raw-escpos' }
      },
    }
    const liveAdapter = createPrinterAdapter(slowBridge)

    const p1 = autoPrintStationReceipt({
      restaurantId: 'rest-emulator-1',
      terminalId: 'term-main',
      station: PRINT_STATIONS.BILLING,
      receiptData: data,
      printerAdapter: liveAdapter,
    })
    // Wait a tick for p1 to acquire in-flight lock, then attempt duplicate retry
    await new Promise((r) => setTimeout(r, 15))
    const pDup = await autoPrintStationReceipt({
      restaurantId: 'rest-emulator-1',
      terminalId: 'term-main',
      station: PRINT_STATIONS.BILLING,
      receiptData: data,
      printerAdapter: liveAdapter,
    })
    expect(pDup.printed).toBe(false)
    expect(pDup.reason).toBe('DUPLICATE_IN_FLIGHT')

    releaseLock?.()
    const billDone = await p1
    expect(billDone.printed).toBe(true)
    expect(billDone.printerName).toBe('Billing-80')

    const kitchenDone = await autoPrintStationReceipt({
      restaurantId: 'rest-emulator-1',
      terminalId: 'term-main',
      station: PRINT_STATIONS.KITCHEN,
      receiptData: data,
      printerAdapter: liveAdapter,
    })
    expect(kitchenDone.printed).toBe(true)
    expect(kitchenDone.printerName).toBe('Kitchen-80')
    expect(dispatched.find((d) => d.printerName === 'Kitchen-80').raw).toContain('*** KITCHEN KOT ***')
    expect(dispatched.find((d) => d.printerName === 'Billing-80').raw).toContain('NET PAYABLE')
  })
})
