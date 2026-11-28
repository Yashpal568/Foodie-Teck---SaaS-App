import React, { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Printer,
  RefreshCw,
  Ruler,
  Save,
  Settings2,
  Wifi,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  CONNECTION_METHODS,
  getOrCreateTerminalId,
  HARDWARE_PROFILE_TEMPLATES,
  loadTerminalPrinterConfig,
  PRINT_STATIONS,
  saveTerminalPrinterConfigToServer,
} from '@/utils/printerProfiles'
import { supabase } from '@/lib/supabase'
import {
  generateReceiptPdfDoc,
  getPaperSizePreset,
  normalizeReceiptData,
  PAPER_SIZES,
} from '@/utils/printConfig'

const WIZARD_STEPS = [
  'Detect Bridge & Printers',
  'Station & Connection',
  'Paper & Hardware Profile',
  'Test Receipt & Save',
]

export default function PrinterSetupWizard({
  open,
  onClose,
  restaurantId,
  profile,
  printerAdapter,
  discoveredPrinters = [],
  bridgeConnected = false,
  onRescanBridge,
  onSaved,
}) {
  const terminalId = useMemo(() => getOrCreateTerminalId(), [])
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState(() =>
    loadTerminalPrinterConfig(restaurantId, terminalId)
  )
  const [activeStation, setActiveStation] = useState(PRINT_STATIONS.BILLING)
  const [isTesting, setIsTesting] = useState(false)

  const stationCfg = config.stations[activeStation] || config.stations[PRINT_STATIONS.BILLING]
  const activeTemplate =
    HARDWARE_PROFILE_TEMPLATES[stationCfg.templateId] ||
    HARDWARE_PROFILE_TEMPLATES['thermal-80-usb']
  const paperPreset = getPaperSizePreset(stationCfg.paperWidthId)

  const updateStation = (patch) => {
    setConfig((prev) => ({
      ...prev,
      stations: {
        ...prev.stations,
        [activeStation]: {
          ...prev.stations[activeStation],
          ...patch,
        },
      },
    }))
  }

  const handleTemplateSelect = (templateId) => {
    const tpl = HARDWARE_PROFILE_TEMPLATES[templateId]
    if (!tpl) return
    updateStation({
      templateId: tpl.id,
      paperWidthId: tpl.paperWidthId,
      printableWidthMm: tpl.printableWidthMm,
      connectionMethod: tpl.connectionMethod,
      autoCut: tpl.hasCutter,
      openCashDrawer: tpl.hasCashDrawer && activeStation === PRINT_STATIONS.BILLING,
    })
  }

  const handleRunTestReceipt = async () => {
    setIsTesting(true)
    try {
      const testOrder = {
        id: 'TEST-ALIGN-01',
        tableNumber: 'TEST',
        guest_count: 2,
        customerName: `${config.terminalLabel} (${activeStation.toUpperCase()})`,
        order_type: 'DINE_IN',
        paymentMethod: 'TEST',
        subtotal: 100,
        tax: 5,
        total: 105,
        gst_rate: 5,
        items: [
          { name: 'Alignment Check Dish (Standard)', price: 100, quantity: 1 },
        ],
      }
      const normalized = normalizeReceiptData(testOrder, profile)
      const selectedPrinter =
        discoveredPrinters.find((p) => p.id === stationCfg.printerId) || null

      if (selectedPrinter?.source === 'qz-tray' && printerAdapter) {
        await printerAdapter.printReceipt({
          receiptData: normalized,
          paperSizeId: stationCfg.paperWidthId,
          printerProfile: selectedPrinter,
          options: {
            station: activeStation,
            copies: 1,
            includeGst: true,
            showFeedbackQr: false,
            autoCut: stationCfg.autoCut,
            openCashDrawer: false,
          },
        })
      } else {
        const pdf = await generateReceiptPdfDoc(normalized, stationCfg.paperWidthId, {
          copies: 1,
          includeGst: true,
          showFeedbackQr: false,
        })
        await printerAdapter?.printPdf(pdf)
      }
      toast.success(`Test receipt generated for ${paperPreset.label}`)
    } catch (err) {
      toast.error(err?.message || 'Failed to generate test receipt')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    let accessToken = ''
    try {
      const { data } = await supabase.auth.getSession()
      accessToken = data?.session?.access_token || ''
    } catch {
      accessToken = ''
    }
    const { config: saved, syncedToServer } = await saveTerminalPrinterConfigToServer(
      restaurantId,
      terminalId,
      config,
      { apiBaseUrl: import.meta.env?.VITE_API_URL || '', accessToken }
    )
    toast.success(
      `Saved ${activeStation.toUpperCase()} printer setup for ${saved.terminalLabel}${
        syncedToServer ? ' (synced to cloud)' : ''
      }`
    )
    onSaved?.(saved, activeStation)
    onClose?.()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[1360] bg-slate-950/60 backdrop-blur-sm"
        className="z-[1400] w-[95vw] sm:max-w-[640px] p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl gap-0"
      >
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-indigo-300 flex items-center justify-center shrink-0">
              <Settings2 className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] font-bold text-white truncate">
                POS Printer Setup Wizard
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 truncate">
                Terminal ID: {terminalId} • Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step]}
              </DialogDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Stepper Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 grid grid-cols-4 gap-2">
          {WIZARD_STEPS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(idx)}
              className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                idx === step
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : idx < step
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-white text-slate-500 border border-slate-200/80'
              }`}
            >
              {idx + 1}. {label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4 min-h-[290px]">
          {step === 0 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Native Bridge Status:{' '}
                    <span className={bridgeConnected ? 'text-emerald-700' : 'text-slate-600'}>
                      {bridgeConnected ? 'QZ Tray Connected' : 'Not Detected (Manual / Browser Mode)'}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {bridgeConnected
                      ? 'Installed printers discovered from your operating system.'
                      : 'Install QZ Tray for silent USB/LAN ESC/POS printing, or configure manual paper profiles below.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRescanBridge}
                  className="h-8 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Scan
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Terminal Name
                  </label>
                  <Input
                    value={config.terminalLabel}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, terminalLabel: e.target.value }))
                    }
                    placeholder="e.g. Main Billing Counter"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Select Discovered / Target Printer
                  </label>
                  <Select
                    value={stationCfg.printerId}
                    onValueChange={(val) => {
                      const found = discoveredPrinters.find((p) => p.id === val)
                      updateStation({
                        printerId: val,
                        printerName: found?.name || found?.label || 'Browser / OS Print Dialog',
                        paperWidthId: found?.configuredPaperWidth || stationCfg.paperWidthId,
                      })
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1450]">
                      {discoveredPrinters.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Routing Station
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: PRINT_STATIONS.BILLING, label: 'Customer Billing' },
                    { id: PRINT_STATIONS.KITCHEN, label: 'Kitchen (KOT)' },
                    { id: PRINT_STATIONS.BAR, label: 'Bar (KOT)' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActiveStation(st.id)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        activeStation === st.id
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Connection Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CONNECTION_METHODS.map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => updateStation({ connectionMethod: cm.id })}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        stationCfg.connectionMethod === cm.id
                          ? 'bg-slate-950 text-white border-slate-950'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Wifi className="w-3 h-3" />
                      <span>{cm.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Hardware & Paper Profile
                </label>
                <Select value={stationCfg.templateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[1450]">
                    {Object.values(HARDWARE_PROFILE_TEMPLATES).map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                        {tpl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Paper Width</span>
                  <strong className="text-slate-900">{activeTemplate.paperWidthMm}mm</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Printable Area</span>
                  <strong className="text-slate-900">
                    {activeTemplate.printableWidthMm}mm ({activeTemplate.printableDots} dots)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Resolution / Font</span>
                  <strong className="text-slate-900">
                    {activeTemplate.dpi} DPI • {activeTemplate.charsPerLine} cols
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Command Mode</span>
                  <strong className="text-slate-900">{activeTemplate.commandMode}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Auto-Cutter ({activeTemplate.hasCutter ? 'Supported' : 'N/A'})</span>
                  <input
                    type="checkbox"
                    checked={stationCfg.autoCut}
                    disabled={!activeTemplate.hasCutter}
                    onChange={(e) => updateStation({ autoCut: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Cash Drawer ({activeTemplate.hasCashDrawer ? 'Supported' : 'N/A'})</span>
                  <input
                    type="checkbox"
                    checked={stationCfg.openCashDrawer}
                    disabled={!activeTemplate.hasCashDrawer}
                    onChange={(e) => updateStation({ openCashDrawer: e.target.checked })}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-indigo-600" />
                      Run Test Receipt & Verify Alignment
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Outputs a test slip at {paperPreset.label} ({activeTemplate.printableWidthMm}mm printable width).
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isTesting}
                    onClick={handleRunTestReceipt}
                    className="h-9 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isTesting ? 'Running...' : 'Run Test Receipt'}</span>
                  </Button>
                </div>

                <label className="flex items-center gap-2 pt-2 border-t border-slate-200/80 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stationCfg.alignmentVerified}
                    onChange={(e) => updateStation({ alignmentVerified: e.target.checked })}
                  />
                  <span>I verified the receipt margins, QR code, and paper width alignment</span>
                </label>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Configuration saves per restaurant (<code>{restaurantId || 'default'}</code>) and terminal (<code>{terminalId}</code>).
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="h-9 rounded-xl text-xs font-semibold gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>

          {step < WIZARD_STEPS.length - 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
