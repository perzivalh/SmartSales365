import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

import { getOrders } from "../../api/orders";
import { OrderStatusBadge } from "../../components/orders/OrderStatusBadge";
import { useAuth } from "../../hooks/useAuth";
import type { Order } from "../../types/api";
import { formatCurrency } from "../../utils/currency";

type InvoiceExportFormat = "pdf" | "excel" | "html";

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getStatusLabel(status: Order["status"]) {
  switch (status) {
    case "PAID":
      return "PAGADO";
    case "PENDING_PAYMENT":
      return "PENDIENTE";
    case "FAILED":
      return "FALLIDO";
    case "CANCELED":
      return "CANCELADO";
    default:
      return status;
  }
}

function buildInvoiceHtml(order: Order): string {
  const itemsRows = order.items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${item.product_name}</strong><br/>
          <span style="color:#5f6b7a;font-size:12px;">${item.product_sku}</span>
        </td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(Number(item.unit_price))}</td>
        <td>${formatCurrency(Number(item.total_price))}</td>
      </tr>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Factura ${order.number}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background:#0b1731; color:#f4f6fb; margin:0; padding:32px; }
        .invoice { background:#111f3f; border-radius:24px; padding:32px; border:1px solid rgba(255,255,255,0.08); }
        .header { display:flex; justify-content:space-between; align-items:flex-start; }
        .badge { padding:6px 16px; border-radius:999px; font-size:12px; letter-spacing:0.2em; border:1px solid rgba(255,255,255,0.2); }
        table { width:100%; border-collapse:collapse; margin-top:24px; }
        th, td { padding:12px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:left; }
        th { letter-spacing:0.2em; font-size:11px; text-transform:uppercase; color:#8b96ac; }
        .totals { margin-top:24px; width:100%; max-width:320px; margin-left:auto; }
        .totals div { display:flex; justify-content:space-between; padding:6px 0; }
        .totals div.total { font-size:18px; font-weight:600; border-top:1px solid rgba(255,255,255,0.15); margin-top:12px; padding-top:12px; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <div>
            <h2 style="margin:0 0 6px;font-size:28px;">SmartSales365</h2>
            <p style="margin:0;color:#a4b1c8;font-size:13px;">Av. Comercio 123 · Santa Cruz, Bolivia<br/>ventas@smartsales365.com · +591 70000001</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 4px;color:#a4b1c8;">Factura</p>
            <h3 style="margin:0;font-size:22px;">${order.number}</h3>
            <span class="badge">${order.status.replaceAll("_", " ")}</span>
          </div>
        </div>

        <div style="display:flex; gap:32px; margin-top:28px; flex-wrap:wrap;">
          <div style="flex:1; min-width:220px;">
            <p style="margin:0; color:#8b96ac; letter-spacing:0.3em; font-size:11px;">Cliente</p>
            <p style="margin:6px 0 0; font-size:16px;">${order.customer_name}</p>
            <p style="margin:4px 0 0; font-size:13px; color:#a4b1c8;">${order.customer_email ?? ""} · ${order.customer_phone ?? ""}</p>
          </div>
          <div style="flex:1; min-width:220px;">
            <p style="margin:0; color:#8b96ac; letter-spacing:0.3em; font-size:11px;">Destino</p>
            <p style="margin:6px 0 0; font-size:15px;">
              ${order.shipping_address_line1}${order.shipping_address_line2 ? " - " + order.shipping_address_line2 : ""}<br/>
              ${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal_code}<br/>
              ${order.shipping_country}
            </p>
          </div>
          <div style="flex:1; min-width:200px;">
            <p style="margin:0; color:#8b96ac; letter-spacing:0.3em; font-size:11px;">Datos</p>
            <p style="margin:6px 0 0; font-size:14px;">Fecha emisión: ${formatDate(order.created_at)}</p>
            <p style="margin:4px 0 0; font-size:14px;">Pagado: ${formatDate(order.paid_at)}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Uds</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="totals">
          <div><span>Subtotal</span><span>${formatCurrency(Number(order.subtotal_amount))}</span></div>
          <div><span>Descuento</span><span>- ${formatCurrency(Number(order.discount_amount))}</span></div>
          <div><span>Impuestos</span><span>${formatCurrency(Number(order.tax_amount))}</span></div>
          <div><span>Envío</span><span>${formatCurrency(Number(order.shipping_amount))}</span></div>
          <div class="total"><span>Total</span><span>${formatCurrency(Number(order.total_amount))}</span></div>
        </div>
      </div>
    </body>
  </html>`;
}

function downloadBlob(content: Blob, filename: string) {
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportInvoicePdf(order: Order) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const marginX = 45;
  const marginY = 50;
  const contentWidth = width - marginX * 2;
  const statusLabel = getStatusLabel(order.status);

  doc.setFillColor(6, 21, 43);
  doc.rect(0, 0, width, 120, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("SmartSales365", marginX, 60);
  doc.setFontSize(12);
  doc.text(`Factura ${order.number}`, width - marginX, 42, { align: "right" });
  doc.text(`Estado: ${statusLabel}`, width - marginX, 62, { align: "right" });

  const blockWidth = contentWidth / 3 - 10;
  let cursorY = 150;
  doc.setFontSize(12);
  doc.setTextColor(20, 32, 61);

  const clientLines = doc.splitTextToSize(
    `${order.customer_name || "-"}\n${order.customer_email ?? ""}\n${order.customer_phone ?? ""}`,
    blockWidth,
  );
  const destinationLines = doc.splitTextToSize(
    `${order.shipping_address_line1}${order.shipping_address_line2 ? " - " + order.shipping_address_line2 : ""}\n${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal_code}\n${order.shipping_country}`,
    blockWidth,
  );
  const dataLines = doc.splitTextToSize(
    `Fecha emisión: ${formatDate(order.created_at)}\nPagado: ${formatDate(order.paid_at)}\nMoneda: ${order.currency}`,
    blockWidth,
  );

  function drawBlock(title: string, lines: string | string[], column: number) {
    const x = marginX + column * (blockWidth + 10);
    doc.setFontSize(10);
    doc.setTextColor(128, 138, 158);
    doc.text(title.toUpperCase(), x, cursorY);
    doc.setFontSize(12);
    doc.setTextColor(20, 32, 61);
    doc.text(lines, x, cursorY + 16);
  }

  drawBlock("Cliente", clientLines, 0);
  drawBlock("Destino", destinationLines, 1);
  drawBlock("Datos", dataLines, 2);

  cursorY += Math.max(clientLines.length, destinationLines.length, dataLines.length) * 14 + 40;
  doc.setDrawColor(225, 229, 238);
  doc.setFillColor(245, 247, 252);
  doc.rect(marginX, cursorY, contentWidth, 28, "F");

  doc.setFontSize(10);
  doc.setTextColor(120, 128, 149);
  const columns = [
    { label: "# / Producto", x: marginX + 10, align: "left" as const },
    { label: "SKU", x: marginX + contentWidth * 0.44, align: "left" as const },
    { label: "Cant.", x: marginX + contentWidth * 0.66, align: "right" as const },
    { label: "Precio", x: marginX + contentWidth * 0.8, align: "right" as const },
    { label: "Total", x: marginX + contentWidth * 0.92, align: "right" as const },
  ];
  columns.forEach((column) => {
    doc.text(column.label, column.x, cursorY + 18, { align: column.align });
  });

  cursorY += 40;
  doc.setTextColor(20, 32, 61);
  doc.setFontSize(11);
  order.items.forEach((item, index) => {
    const productLines = doc.splitTextToSize(`${index + 1}. ${item.product_name}`, contentWidth * 0.34);
    doc.text(productLines, marginX + 10, cursorY, { baseline: "top" });
    doc.text(item.product_sku, marginX + contentWidth * 0.44, cursorY, { align: "left" });
    doc.text(String(item.quantity), marginX + contentWidth * 0.66, cursorY, { align: "right" });
    doc.text(formatCurrency(Number(item.unit_price)), marginX + contentWidth * 0.8, cursorY, { align: "right" });
    doc.text(formatCurrency(Number(item.total_price)), marginX + contentWidth * 0.92, cursorY, { align: "right" });
    cursorY += productLines.length * 14 + 10;
    if (cursorY > height - 170) {
      doc.addPage();
      cursorY = marginY;
    }
  });

  cursorY += 10;
  const totalsX = marginX + contentWidth * 0.55;
  doc.setFontSize(12);
  const totals = [
    ["Subtotal", formatCurrency(Number(order.subtotal_amount))],
    ["Descuento", `- ${formatCurrency(Number(order.discount_amount))}`],
    ["Impuestos", formatCurrency(Number(order.tax_amount))],
    ["Envío", formatCurrency(Number(order.shipping_amount))],
  ];
  totals.forEach(([label, value]) => {
    doc.text(label, totalsX, cursorY);
    doc.text(value, marginX + contentWidth, cursorY, { align: "right" });
    cursorY += 18;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TOTAL", totalsX, cursorY + 6);
  doc.text(formatCurrency(Number(order.total_amount)), marginX + contentWidth, cursorY + 6, { align: "right" });

  doc.save(`${order.number}.pdf`);
}

function exportInvoiceFile(order: Order, format: Exclude<InvoiceExportFormat, "pdf">) {
  const html = buildInvoiceHtml(order);
  const blob =
    format === "excel"
      ? new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" })
      : new Blob([html], { type: "text/html;charset=utf-8" });
  const extension = format === "excel" ? "xls" : "html";
  downloadBlob(blob, `${order.number}.${extension}`);
}

export function OrdersHistoryPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [exporting, setExporting] = useState<InvoiceExportFormat | null>(null);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedId) ?? null, [orders, selectedId]);

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getOrders({ page_size: 50 });
      setOrders(response.results);
      setSelectedId((current) => current ?? response.results[0]?.id ?? null);
    } catch (requestError) {
      console.error(requestError);
      setError("No pudimos cargar tus pedidos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadOrders();
    }
  }, [isAuthenticated, loadOrders]);

  const handleExport = useCallback(
    (format: InvoiceExportFormat) => {
      if (!selectedOrder) return;
      try {
        setExporting(format);
        if (format === "pdf") {
          exportInvoicePdf(selectedOrder);
        } else {
          exportInvoiceFile(selectedOrder, format);
        }
      } catch (exportError) {
        console.error(exportError);
      } finally {
        setExporting(null);
      }
    },
    [selectedOrder],
  );

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl rounded-[28px] border border-white/10 bg-[rgba(7,26,52,0.88)] px-8 py-16 text-center shadow-[0_40px_80px_rgba(3,10,23,0.55)]">
        <h2 className="text-2xl font-semibold text-white">Inicia sesion para ver tus pedidos</h2>
        <p className="mt-3 text-sm text-slate-300">
          Crea una cuenta o inicia sesion para llevar un registro de tus compras y descargar comprobantes cuando lo necesites.
        </p>
        <button
          type="button"
          className="mt-6 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:scale-105"
          onClick={() => navigate("/login", { state: { from: { pathname: "/orders" } } })}
        >
          Iniciar sesion
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl rounded-[28px] border border-primary/30 bg-[rgba(7,26,52,0.85)] px-8 py-16 text-center text-primary shadow-[0_40px_80px_rgba(3,10,23,0.55)]">
        Cargando tus pedidos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-[28px] border border-red-500/40 bg-red-900/40 px-8 py-16 text-center text-sm text-red-100 shadow-[0_40px_80px_rgba(3,10,23,0.55)]">
        <p className="text-base font-semibold">{error}</p>
        <button
          type="button"
          className="rounded-full bg-red-600 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500"
          onClick={() => loadOrders()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-[28px] border border-white/10 bg-[rgba(7,26,52,0.88)] px-8 py-16 text-center shadow-[0_40px_80px_rgba(3,10,23,0.55)]">
        <h2 className="text-2xl font-semibold text-white">Aun no tienes pedidos</h2>
        <p className="mt-3 text-sm text-slate-300">Explora nuestro catalogo y realiza tu primera compra.</p>
        <button
          type="button"
          className="mt-6 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:scale-105"
          onClick={() => navigate("/", { state: { targetSection: "catalogo" } })}
        >
          Ver productos
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <section className="flex h-[calc(100vh-220px)] min-h-0 flex-col space-y-4 px-[10px]">
        <header>
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
            Mis pedidos
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-white">Historial de compras</h1>
          <p className="mt-2 text-sm text-slate-300">Selecciona un pedido para ver el detalle completo y descargar tu comprobante.</p>
        </header>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-2 thin-scrollbar">
          {orders.map((order) => (
            <button
              type="button"
              key={order.id}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                order.id === selectedId
                  ? "border-primary/60 bg-primary/15 text-white"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-primary/40 hover:bg-primary/10"
              }`}
              onClick={() => setSelectedId(order.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{order.number}</p>
                  <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(Number(order.total_amount))}</p>
            </button>
          ))}
        </div>
      </section>

      <aside className="flex h-[calc(100vh-220px)] min-h-0 flex-col px-[10px]">
        {selectedOrder ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto rounded-[28px] border border-white/10 bg-gradient-to-br from-[#08132b] to-[#0f2550] p-6 text-white shadow-[0_20px_60px_rgba(1,6,17,0.65)] thin-scrollbar">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Factura</p>
                  <p className="text-3xl font-semibold mt-1">{selectedOrder.number}</p>
                  <p className="text-sm text-white/70">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              <div className="mt-6 grid gap-6 text-sm text-white/80 md:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Cliente</p>
                  <p className="mt-1 font-semibold text-white">{selectedOrder.customer_name || "Cliente"}</p>
                  <p>{selectedOrder.customer_email ?? "sin correo"}</p>
                  <p>{selectedOrder.customer_phone ?? "sin telefono"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Destino</p>
                  <p className="mt-1 font-semibold text-white">
                    {selectedOrder.shipping_address_line1}
                    {selectedOrder.shipping_address_line2 ? `, ${selectedOrder.shipping_address_line2}` : ""}
                  </p>
                  <p>
                    {selectedOrder.shipping_city}, {selectedOrder.shipping_state} {selectedOrder.shipping_postal_code}
                  </p>
                  <p>{selectedOrder.shipping_country}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Resumen</p>
                  <p className="mt-1">Pagado: {formatDate(selectedOrder.paid_at)}</p>
                  <p>Total: <span className="font-semibold text-white">{formatCurrency(Number(selectedOrder.total_amount))}</span></p>
                  <p>Notas: {selectedOrder.notes || "Sin notas"}</p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                <table className="w-full min-w-[520px] text-sm text-white/80">
                  <thead className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                    <tr>
                      <th className="px-4 py-3 text-left">Producto</th>
                      <th className="px-4 py-3 text-left">SKU</th>
                      <th className="px-4 py-3 text-right">Cant.</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id} className="border-t border-white/5">
                        <td className="px-4 py-3 font-semibold text-white">{item.product_name}</td>
                        <td className="px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/60">{item.product_sku}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unit_price))}</td>
                        <td className="px-4 py-3 text-right font-semibold text-white">{formatCurrency(Number(item.total_price))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-2 text-sm text-white/80 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-white">{formatCurrency(Number(selectedOrder.subtotal_amount))}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-emerald-300">
                    <span>Descuento</span>
                    <span>-{formatCurrency(Number(selectedOrder.discount_amount))}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Impuestos</span>
                    <span>{formatCurrency(Number(selectedOrder.tax_amount))}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Envío</span>
                    <span>{formatCurrency(Number(selectedOrder.shipping_amount))}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-lg font-semibold text-white">
                    <span>Total</span>
                    <span>{formatCurrency(Number(selectedOrder.total_amount))}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Exportar factura</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleExport("pdf")}
                      disabled={exporting === "pdf"}
                    >
                      {exporting === "pdf" ? "PDF..." : "PDF"}
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleExport("excel")}
                      disabled={exporting === "excel"}
                    >
                      {exporting === "excel" ? "Excel..." : "Excel"}
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleExport("html")}
                      disabled={exporting === "html"}
                    >
                      {exporting === "html" ? "HTML..." : "HTML"}
                    </button>
                  </div>
                  {selectedOrder.receipt_url ? (
                    <button
                      type="button"
                      className="mt-3 w-full rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary transition hover:bg-primary/10"
                      onClick={() => window.open(selectedOrder.receipt_url ?? "", "_blank")}
                    >
                      Ticket Stripe
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 w-full rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
                    onClick={loadOrders}
                  >
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-200">
            Selecciona un pedido para ver sus detalles.
          </div>
        )}
      </aside>
    </div>
  );
}
