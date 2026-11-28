import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  MessageCircle,
  Minus,
  Plus,
  Printer,
  QrCode,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  createPrinterAdapter,
  DEFAULT_PAPER_SIZE_ID,
  generateReceiptPdfDoc,
  getPaperSizePreset,
  normalizeReceiptData,
  PAPER_SIZES,
} from "@/utils/printConfig";
import {
  generateRestaurantSignature,
  getPublicMenuOrigin,
} from "@/utils/tableSecurity";

/**
 * Browser-Native Receipt Print Modal supporting thermal rolls (80mm, 58mm)
 * and standard sheets (A4, A5, Letter) via the browser's print dialog and PDF export.
 */
export default function ThermalReceiptModal({
  open,
  onClose,
  order,
  profile,
  paymentMethod: externalPaymentMethod,
  onProceedToSettle,
  printerBridge = null,
}) {
  const printerAdapter = useMemo(
    () => createPrinterAdapter(printerBridge),
    [printerBridge],
  );

  const [paperSizeId, setPaperSizeId] = useState(DEFAULT_PAPER_SIZE_ID);
  const [copies, setCopies] = useState(1);
  const [includeGst, setIncludeGst] = useState(true);
  const [showFeedbackQr, setShowFeedbackQr] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [printSuccessAnim, setPrintSuccessAnim] = useState(false);

  const paperPreset = useMemo(
    () => getPaperSizePreset(paperSizeId),
    [paperSizeId],
  );
  const isCompact = paperPreset.id === "58mm";
  const isStandard = paperPreset.category === "standard";

  const receiptData = useMemo(
    () =>
      normalizeReceiptData(order || {}, profile, {
        paymentMethod: externalPaymentMethod,
      }),
    [order, profile, externalPaymentMethod],
  );

  const {
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
  } = receiptData;

  const formattedDateTime = useMemo(() => {
    const datePart = createdAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: isCompact ? "2-digit" : "short",
      year: isStandard ? "numeric" : undefined,
    });
    const timePart = createdAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  }, [createdAt, isCompact, isStandard]);

  const qrTargetUrl = useMemo(() => {
    // Point receipt QR to the safe demo menu (not the live restaurant/table ordering URL)
    // to prevent off-premise order spam from printed bills until the rating page is built.
    const origin = getPublicMenuOrigin();
    const demoSlug = "demo-merchant";
    const sig = generateRestaurantSignature(demoSlug);
    return `${origin}/menu?restaurant=${demoSlug}${sig ? `&sig=${encodeURIComponent(sig)}` : ""}`;
  }, []);

  useEffect(() => {
    if (!open || !showFeedbackQr) return;
    let cancelled = false;
    QRCode.toDataURL(qrTargetUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, showFeedbackQr, qrTargetUrl]);

  if (!order) return null;

  const handlePrintNow = async () => {
    setIsPrintingPdf(true);
    setPrintSuccessAnim(true);
    try {
      await printerAdapter.printReceipt({
        receiptData,
        paperSizeId,
        options: {
          copies,
          includeGst,
          showFeedbackQr,
          qrDataUrl,
          qrUrl: qrTargetUrl,
        },
      });
      toast.success(`Prepared ${copies}x ${paperPreset.label} print dialog`);
      setTimeout(() => {
        setPrintSuccessAnim(false);
      }, 2200);
    } catch (err) {
      console.error("Receipt print error:", err);
      setPrintSuccessAnim(false);
      toast.error("Failed to prepare print document");
    } finally {
      setIsPrintingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const pdf = await generateReceiptPdfDoc(receiptData, paperSizeId, {
        copies,
        includeGst,
        showFeedbackQr,
        qrDataUrl,
      });
      pdf.save(
        `${header.name.replace(/[^a-z0-9]+/gi, "_")}_${invoiceCode.replace("#", "")}_${paperPreset.id}.pdf`,
      );
      toast.success(`Downloaded ${paperPreset.label} PDF receipt`);
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF receipt");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendWhatsApp = async () => {
    const lines = [
      `*${header.name}* — ${invoiceCode}`,
      `Table: Table ${tableNo} (${modeLabel})${guestCount ? ` • Guests: ${guestCount}` : ""}`,
      ...items.map(
        (i) =>
          `• ${i.quantity || 1}x ${i.name || i.item_name} — ₹${(Number(i.price || 0) * Number(i.quantity || 1)).toFixed(2)}`,
      ),
      includeGst && totals.hasTax
        ? `Subtotal: ₹${totals.subtotal.toFixed(2)} | Tax: ₹${totals.tax.toFixed(2)}`
        : null,
      `*Net Payable: ₹${totals.grandTotal.toFixed(2)}* (${resolvedPayMethod})`,
      `Thank you for dining with us!`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard?.writeText(lines);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp receipt share (copied to clipboard)");
  };

  const previewWidthClass = isCompact
    ? "w-full max-w-[238px] px-3.5 pt-5 pb-4 text-[10px]"
    : isStandard
      ? paperPreset.id === "a5"
        ? "w-full max-w-[340px] px-6 pt-6 pb-5 text-[11.5px]"
        : "w-full max-w-[390px] px-7 pt-7 pb-6 text-[12px]"
      : "w-full max-w-[310px] px-5 pt-6 pb-5 text-[11px]";

  const thermalSizes = [PAPER_SIZES["80mm"], PAPER_SIZES["58mm"]];
  const standardSizes = [PAPER_SIZES.a4, PAPER_SIZES.a5, PAPER_SIZES.letter];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[1250] bg-slate-950/55 backdrop-blur-sm"
        className="z-[1300] w-[95vw] sm:max-w-[820px] p-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl gap-0"
      >
        {/* Clean Header */}
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Printer className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] font-bold text-slate-900 tracking-tight truncate">
                Print Receipt ({paperPreset.label}
                {isCompact ? " Compact" : isStandard ? " Sheet" : ""})
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5 truncate">
                Table {tableNo} • Folio #{orderRef} • Ready for{" "}
                {paperPreset.description}
              </DialogDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Split Pane: Live Paper Preview + Printer Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-[1.08fr_0.92fr]">
          {/* Left: Paper Preview Tray */}
          <div className="bg-slate-100/85 p-5 sm:p-6 flex items-start justify-center border-b md:border-b-0 md:border-r border-slate-200/80 max-h-[75vh] overflow-y-auto no-scrollbar">
            <div
              data-testid="thermal-paper-preview"
              data-paper-width={paperPreset.id}
              className={`bg-white font-mono text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] border border-slate-200/70 transition-all duration-200 relative select-text ${previewWidthClass}`}
            >
              {/* Brand Header */}
              <div className="text-center space-y-0.5">
                <h2
                  className={`font-black text-slate-950 uppercase tracking-wide leading-snug ${
                    isStandard
                      ? "text-base"
                      : isCompact
                        ? "text-xs"
                        : "text-[14px]"
                  }`}
                >
                  {header.name}
                </h2>
                {header.address && (
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {header.address}
                  </p>
                )}
                {header.gstin && (
                  <p className="text-[10px] text-slate-600 font-medium">
                    GSTIN: {header.gstin}
                  </p>
                )}
                {header.phone && (
                  <p className="text-[10px] text-slate-500">
                    Ph: {header.phone}
                  </p>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 my-2.5" />

              {/* Invoice Metadata */}
              <div className="space-y-1 text-[10px] text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    Bill No: {invoiceCode}
                  </span>
                  <span className="tabular-nums shrink-0">
                    {formattedDateTime}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>
                    Table: Table {tableNo} ({modeLabel})
                  </span>
                  <span className="truncate max-w-[125px] text-right">
                    {guestLabel}
                  </span>
                </div>
                {guestCount && (
                  <div className="flex items-center justify-between gap-2">
                    <span>Guests: {guestCount}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 my-2.5" />

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 mb-1.5 border-b border-slate-100">
                  <span>QTY ITEM</span>
                  <span>AMT</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((item, idx) => {
                    const qty = Number(item.quantity || 1);
                    const lineTotal = Number(item.price || 0) * qty;
                    return (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 font-semibold text-slate-800 leading-snug">
                          <span>
                            {qty}x {item.name || item.item_name || "Dish"}
                          </span>
                          {item.variant && item.variant !== "full" && (
                            <span className="block text-[9px] text-amber-600 font-normal">
                              ({item.variant})
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                          {lineTotal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-2.5" />

              {/* Totals & Conditional GST */}
              <div className="space-y-1 text-[10.5px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">
                    {totals.subtotal.toFixed(2)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount:</span>
                    <span className="tabular-nums">
                      -{discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {includeGst && totals.hasTax && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST ({totals.halfRate}%):</span>
                      <span className="tabular-nums">
                        {totals.cgst.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST ({totals.halfRate}%):</span>
                      <span className="tabular-nums">
                        {totals.sgst.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-baseline pt-1.5 mt-1 border-t border-slate-200 font-black text-slate-950 text-[12.5px]">
                  <span>NET PAYABLE:</span>
                  <span className="tabular-nums">
                    ₹{totals.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-2.5" />

              <div className="text-center space-y-2">
                <p className="text-[10px] font-medium text-slate-600">
                  Paid via:{" "}
                  <span className="font-bold text-slate-900">
                    {resolvedPayMethod}
                  </span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Thank you for dining with us! Visit again.
                </p>

                {showFeedbackQr && (
                  <div className="pt-1 flex flex-col items-center gap-1">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan for e-bill & feedback"
                        className="w-12 h-12 rounded border border-slate-200 bg-white p-0.5"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-slate-950 text-white flex items-center justify-center">
                        <QrCode className="w-7 h-7" />
                      </div>
                    )}
                    <span className="text-[9px] text-slate-400">
                      {isCompact
                        ? "Scan for E-Bill"
                        : "Scan for e-bill & feedback"}
                    </span>
                  </div>
                )}

                <p className="text-[8.5px] text-slate-400 tracking-[0.14em] pt-1">
                  POWERED BY SERVORA
                </p>
              </div>

              {!isStandard && (
                <div
                  aria-hidden="true"
                  className="absolute left-0 right-0 -bottom-[6px] h-[6px]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 6px 0, transparent 4px, #ffffff 4.5px)",
                    backgroundSize: "12px 6px",
                  }}
                />
              )}
            </div>
          </div>

          {/* Right: Paper & Browser Print Controls */}
          <div className="p-5 sm:p-6 bg-white flex flex-col justify-between gap-4">
            <div className="space-y-3.5">
              {/* Browser Printing Info */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Browser Print Dialog
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Ready
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-snug">
                  Select your installed printer and paper settings in your
                  browser&apos;s print dialog. Use <strong>Download PDF</strong>{" "}
                  for exact {paperPreset.label} dimensions.
                </p>
              </div>

              {/* Paper Width (Thermal + Standard) & Copies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Paper Size
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Copies
                    </span>
                    <div className="h-8 rounded-lg border border-slate-200 bg-white flex items-center gap-1 px-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setCopies((c) => Math.max(1, c - 1))}
                        disabled={copies <= 1}
                        className="w-6 h-6 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-xs font-bold text-slate-900 tabular-nums min-w-[16px] text-center">
                        {copies}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setCopies((c) => Math.min(5, c + 1))}
                        disabled={copies >= 5}
                        className="w-6 h-6 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Thermal Rolls */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/70">
                  {thermalSizes.map((opt) => {
                    const active = paperSizeId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaperSizeId(opt.id)}
                        className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                          active
                            ? "bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-300"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className="block text-[11px] font-bold leading-tight">
                          {opt.label}
                        </span>
                        <span className="block text-[9.5px] font-medium leading-tight opacity-85">
                          {opt.subLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Standard Sheets */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/70">
                  {standardSizes.map((opt) => {
                    const active = paperSizeId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaperSizeId(opt.id)}
                        className={`py-1 px-1 rounded-lg text-center transition-all cursor-pointer ${
                          active
                            ? "bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-300"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className="block text-[10.5px] font-bold leading-tight">
                          {opt.label}
                        </span>
                        <span className="block text-[9px] font-medium leading-tight opacity-80">
                          {opt.subLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checklist Toggles */}
              <div className="space-y-2 pt-0.5">
                {[
                  {
                    id: "gst",
                    label: "Include GST Breakdown",
                    checked: includeGst,
                    toggle: () => setIncludeGst((v) => !v),
                  },
                  {
                    id: "qr",
                    label: "Show Customer / Feedback QR",
                    checked: showFeedbackQr,
                    toggle: () => setShowFeedbackQr((v) => !v),
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="checkbox"
                    aria-checked={opt.checked}
                    onClick={opt.toggle}
                    className="w-full flex items-center justify-between py-1 text-left cursor-pointer group"
                  >
                    <span className="text-xs font-medium text-slate-700 group-hover:text-slate-950">
                      {opt.label}
                    </span>
                    <span
                      className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors ${
                        opt.checked
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-slate-300 text-transparent"
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                disabled={isPrintingPdf}
                onClick={handlePrintNow}
                className={`w-full h-11 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 ease-out active:scale-[0.98] ${
                  isPrintingPdf || printSuccessAnim
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                    : "bg-slate-950 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-md text-white shadow-sm"
                }`}
              >
                {isPrintingPdf || printSuccessAnim ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>Receipt Printing in Progress...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Print Receipt Now</span>
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadPdf}
                  className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] transition-all duration-200 text-slate-700 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {isDownloadingPdf ? "Generating..." : "Download PDF"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendWhatsApp}
                  className="h-9 rounded-xl border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] transition-all duration-200 text-slate-700 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send WhatsApp</span>
                </Button>
              </div>

              {onProceedToSettle && (
                <Button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    onProceedToSettle?.();
                  }}
                  className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Proceed to Payment Settlement</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
