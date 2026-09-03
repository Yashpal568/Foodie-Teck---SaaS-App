import { useState } from 'react'
import { 
  Download, 
  Upload, 
  FileText, 
  AlertCircle, 
  FileSpreadsheet, 
  ArrowDownUp, 
  CheckCircle2, 
  FileCode, 
  X, 
  Layers, 
  Sparkles, 
  Trash2,
  TableProperties
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// Convert data to Excel format (CSV with BOM that Excel opens properly)
const exportToExcel = (data, filename) => {
  const headers = ['Name', 'Description', 'Price', 'Half Price', 'Category', 'Type', 'In Stock', 'Restaurant ID', 'Created At']
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      `"${String(item.name || '').replace(/"/g, '""')}"`,
      `"${String(item.description || '').replace(/"/g, '""')}"`,
      item.price || 0,
      item.halfPrice || '',
      `"${String(item.category || 'Main Course').replace(/"/g, '""')}"`,
      `"${item.type || 'VEG'}"`,
      item.isInStock !== false && item.in_stock !== false ? 'Yes' : 'No',
      `"${item.restaurantId || ''}"`,
      `"${item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString() : ''}"`
    ].join(','))
  ].join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Create sample Excel template
const createExcelTemplate = () => {
  const template = [
    ['Name', 'Description', 'Price', 'Half Price', 'Category', 'Type', 'In Stock'],
    ['Dal Makhani Bukhara', 'Slow-cooked overnight black lentils with churned butter', '280', '160', 'Main Course', 'VEG', 'Yes'],
    ['Butter Chicken Roast', 'Tender chicken pieces simmered in rich tomato gravy', '380', '220', 'Main Course', 'NON_VEG', 'Yes'],
    ['Crispy Kurkure Paneer', 'Crispy cottage cheese fingers with mint dip', '240', '140', 'Starters', 'VEG', 'Yes'],
    ['Garlic Butter Naan', 'Tandoori flatbread brushed with fresh garlic butter', '65', '', 'Breads', 'VEG', 'Yes'],
    ['Hazelnut Cold Coffee', 'Chilled blended espresso with hazelnut notes', '140', '', 'Beverages', 'VEG', 'Yes']
  ]

  const csvContent = template.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'servora_menu_import_template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('📥 Menu Import Spreadsheet Template downloaded!')
}

const SAMPLE_CSV = `Name,Description,Price,Half Price,Category,Type,In Stock
"Crispy Kurkure Paneer","Crunchy golden cottage cheese fingers with mint dip",240,140,Starters,VEG,Yes
"Dal Makhani Bukhara","Slow-cooked overnight black lentils with churned butter",280,160,Main Course,VEG,Yes
"Butter Chicken Roast","Tender chicken simmered in rich creamy tomato gravy",380,220,Main Course,NON_VEG,Yes
"Garlic Butter Naan","Freshly baked tandoori bread with garlic butter",65,,Breads,VEG,Yes
"Sizzling Brownie","Warm fudge brownie topped with vanilla ice cream",180,,Desserts,VEG,Yes`

export default function BulkImportExport({ restaurantId, menuItems = [], onImport, showLabel = true }) {
  const [isOpen, setIsOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [activeTab, setActiveTab] = useState('import')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleImport = () => {
    setImportErrors([])
    let items = []

    const parseExcelWithId = (csvText) => {
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) return []
      
      const result = []
      // CSV parsing handling quotes
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i]
        const values = []
        let inQuotes = false
        let current = ''

        for (let j = 0; j < row.length; j++) {
          const char = row[j]
          if (char === '"' && (j === 0 || row[j - 1] !== '\\')) {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))

        if (values.length >= 3 && values[0]) {
          const name = values[0] || ''
          const description = values[1] || ''
          const price = parseFloat(values[2]) || 0
          const halfPrice = values[3] ? parseFloat(values[3]) : undefined
          const category = values[4] || 'Main Course'
          const rawType = (values[5] || 'VEG').toUpperCase()
          const type = rawType.includes('NON') ? 'NON_VEG' : 'VEG'
          const inStockVal = values[6] ? values[6].toLowerCase() : 'yes'
          const isInStock = inStockVal !== 'no' && inStockVal !== 'false'

          result.push({
            _id: `imp_${Date.now()}_${i}`,
            id: `imp_${Date.now()}_${i}`,
            name,
            description,
            price,
            halfPrice: !isNaN(halfPrice) && halfPrice > 0 ? halfPrice : undefined,
            category,
            type,
            isInStock,
            in_stock: isInStock,
            restaurantId: restaurantId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
      }
      return result
    }

    try {
      setIsProcessing(true)
      if (importData.trim().startsWith('[')) {
        const parsed = JSON.parse(importData)
        items = Array.isArray(parsed) ? parsed.map((item, index) => ({
          ...item,
          _id: item._id || item.id || `imp_${Date.now()}_${index}`,
          id: item.id || item._id || `imp_${Date.now()}_${index}`,
          restaurantId: restaurantId,
          isInStock: item.isInStock !== false && item.in_stock !== false
        })) : []
      } else {
        items = parseExcelWithId(importData)
      }

      if (items.length === 0) {
        setImportErrors(['No valid menu items found in the import data. Make sure at least Name and Price are provided.'])
        setIsProcessing(false)
        return
      }

      const errors = []
      items.forEach((item, index) => {
        if (!item.name) errors.push(`Row ${index + 1}: Missing dish name`)
        if (isNaN(item.price) || item.price <= 0) errors.push(`Row ${index + 1} ("${item.name || 'Dish'}"): Price must be greater than 0`)
      })

      if (errors.length > 0) {
        setImportErrors(errors)
        setIsProcessing(false)
        return
      }

      onImport(items)
      toast.success(`🎉 Successfully imported ${items.length} dishes into your menu!`, {
        description: `Items are now active in POS Terminal and QR Menu.`
      })
      setImportData('')
      setIsOpen(false)
    } catch (error) {
      setImportErrors(['Error parsing import spreadsheet: ' + error.message])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="tooltip-wrapper inline-block">
          {!showLabel ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-slate-100 rounded-xl cursor-pointer">
                    <ArrowDownUp className="w-4 h-4 text-slate-700" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-semibold">Bulk Import & Export</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8.5 rounded-xl bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Import / Export</span>
            </Button>
          )}
        </div>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-4xl! w-[92vw] max-h-[88vh] h-[82vh] p-0 overflow-hidden rounded-3xl border-slate-200/90 shadow-2xl bg-[#f8fafc] flex flex-col font-['Roboto',sans-serif]">
        
        {/* ── 1. Executive Studio Header ── */}
        <div className="bg-slate-950 text-white px-6 py-4.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white">
                  Bulk Menu Import & Export Hub
                </DialogTitle>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-bold py-0.5 px-2">
                  Excel & CSV Sync
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Batch import dishes from spreadsheet or download full catalog backups in 1 click.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-8.5 h-8.5 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── 2. Segmented Pill Switcher ── */}
        <div className="px-6 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'import'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Spreadsheets</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Menu Catalog ({menuItems.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Current Database: <strong>{menuItems.length} Dishes</strong></span>
          </div>
        </div>

        {/* ── 3. Main Tab Content ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'import' ? (
            
            /* ═══════════════════════════════════════════════════════════════
               IMPORT TAB (TWO-COLUMN STUDIO)
               ═══════════════════════════════════════════════════════════════ */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Data Paste Editor */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={createExcelTemplate}
                      className="h-8 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/70"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download Excel Template
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setImportData(SAMPLE_CSV)}
                      className="h-8 px-3 rounded-xl border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-100"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      Load Sample Demo Data
                    </Button>
                  </div>

                  {importData && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImportData('')}
                      className="h-8 px-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                    </Button>
                  )}
                </div>

                {/* Textarea Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-extrabold text-slate-800">
                      Paste CSV / Excel Spreadsheet Rows:
                    </Label>
                    <span className="text-[11px] font-bold text-slate-400">
                      {importData.split('\n').filter(Boolean).length > 1 
                        ? `~${importData.split('\n').filter(Boolean).length - 1} dishes detected` 
                        : 'Headers: Name, Description, Price, Category, Type'}
                    </span>
                  </div>

                  <Textarea
                    placeholder={`Paste CSV data or Excel columns here...\nExample:\nName,Description,Price,Half Price,Category,Type,In Stock\n"Paneer Tikka","Tandoori paneer",240,140,Starters,VEG,Yes`}
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    className="h-52 font-mono text-xs p-3.5 bg-white rounded-2xl border-slate-200 focus:border-indigo-500 shadow-inner resize-none leading-relaxed"
                  />
                </div>

                {/* Validation Errors */}
                {importErrors.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Spreadsheet Parsing Errors ({importErrors.length}):</span>
                    </div>
                    <ul className="text-xs list-disc list-inside space-y-0.5 text-rose-800 pl-1 font-medium max-h-24 overflow-y-auto">
                      {importErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              {/* Right Column: Column Schema Guide */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Spreadsheet Schema</h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <div className="flex justify-between items-center font-bold text-slate-900">
                        <span>1. Name <span className="text-rose-600">*</span></span>
                        <span className="text-[10px] text-slate-400">Text</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">e.g. Crispy Kurkure Paneer</p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <div className="flex justify-between items-center font-bold text-slate-900">
                        <span>2. Price <span className="text-rose-600">*</span></span>
                        <span className="text-[10px] text-slate-400">Number</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">e.g. 240 or 240.00</p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <div className="flex justify-between items-center font-bold text-slate-900">
                        <span>3. Category</span>
                        <span className="text-[10px] text-slate-400">Text</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Starters, Main Course, Breads, etc.</p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <div className="flex justify-between items-center font-bold text-slate-900">
                        <span>4. Type</span>
                        <span className="text-[10px] text-slate-400">VEG / NON_VEG</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Auto-detected from "VEG" or "NON_VEG"</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Auto-creates categories if they don't exist!</span>
                  </div>
                </div>
              </div>

            </div>

          ) : (

            /* ═══════════════════════════════════════════════════════════════
               EXPORT TAB
               ═══════════════════════════════════════════════════════════════ */
            <div className="max-w-3xl mx-auto space-y-6 py-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-950">Export Active Menu Catalog</h3>
                <p className="text-xs text-slate-500">
                  Export all {menuItems.length} dishes with full descriptions, prices, categories, and stock status.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Excel Export Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-sm text-slate-950">Excel & CSV Spreadsheet</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Clean formatted CSV spreadsheet compatible with Microsoft Excel, Google Sheets, and Apple Numbers.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => exportToExcel(menuItems, `servora_menu_${new Date().toISOString().split('T')[0]}`)}
                    className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 cursor-pointer"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download CSV Spreadsheet
                  </Button>
                </div>

                {/* JSON Backup Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-sm text-slate-950">JSON Database Snapshot</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Raw JSON database dump for technical backups, cross-store migrations, or API integrations.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const dataStr = JSON.stringify(menuItems, null, 2)
                      const blob = new Blob([dataStr], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `servora_menu_backup_${new Date().toISOString().split('T')[0]}.json`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                      toast.success('📥 Menu JSON database archive downloaded!')
                    }}
                    className="w-full h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download JSON Backup
                  </Button>
                </div>

              </div>
            </div>

          )}
        </div>

        {/* ── 4. Bottom Sticky Action Footer ── */}
        <div className="px-6 py-3 bg-white border-t border-slate-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            {activeTab === 'import' ? (
              <span>Ready to parse pasted spreadsheet rows</span>
            ) : (
              <span>Total items available for export: <strong>{menuItems.length}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="h-8.5 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>

            {activeTab === 'import' && (
              <Button
                type="button"
                onClick={handleImport}
                disabled={isProcessing || !importData.trim()}
                className="h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 shadow-sm shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                <span>{isProcessing ? 'Importing...' : 'Import Dishes to Menu'}</span>
              </Button>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
