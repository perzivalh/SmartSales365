import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";

import { getOrders, updateOrderFulfillment } from "../../api/orders";
import { Modal } from "../../components/common/Modal";
import { OrderStatusBadge } from "../../components/orders/OrderStatusBadge";
import { OrderFulfillmentBadge } from "../../components/orders/OrderFulfillmentBadge";
import type { Order, OrderStatus, OrderFulfillmentStatus } from "../../types/api";
import { formatCurrency } from "../../utils/currency";

const STATUS_FILTERS: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "PENDING_PAYMENT", label: "Pendiente" },
  { value: "PAID", label: "Pagados" },
  { value: "FAILED", label: "Fallidos" },
  { value: "CANCELED", label: "Cancelados" },
];

const FULFILLMENT_STATUS_FILTERS: Array<{ value: "all" | OrderFulfillmentStatus; label: string }> = [
  { value: "all", label: "Entrega: todas" },
  { value: "PENDING", label: "Entrega pendiente" },
  { value: "PROCESSING", label: "En proceso" },
  { value: "IN_TRANSIT", label: "En camino" },
  { value: "DELIVERED", label: "Entregado" },
];

const FULFILLMENT_STATUS_OPTIONS: Array<{ value: OrderFulfillmentStatus; label: string }> = [
  { value: "PENDING", label: "Pendiente" },
  { value: "PROCESSING", label: "En proceso" },
  { value: "IN_TRANSIT", label: "En camino" },
  { value: "DELIVERED", label: "Entregado" },
];

type DownloadFormat = "pdf" | "excel" | "html";

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<"all" | OrderFulfillmentStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingFulfillment, setUpdatingFulfillment] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOrders({ page_size: 100 });
      setOrders(response.results);
      setSelectedId((current) => current ?? response.results[0]?.id ?? null);
    } catch (requestError) {
      console.error(requestError);
      setError("No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesFulfillment =
        fulfillmentFilter === "all" || order.fulfillment_status === fulfillmentFilter;
      const matchesSearch =
        term.length === 0 ||
        order.number.toLowerCase().includes(term) ||
        order.customer_email.toLowerCase().includes(term) ||
        order.customer_name.toLowerCase().includes(term);
      return matchesStatus && matchesFulfillment && matchesSearch;
    });
  }, [orders, search, statusFilter, fulfillmentFilter]);

  useEffect(() => {
    if (!selectedId && filteredOrders.length > 0) {
      setSelectedId(filteredOrders[0].id);
      return;
    }
    if (selectedId && filteredOrders.every((order) => order.id !== selectedId)) {
      setSelectedId(filteredOrders[0]?.id ?? null);
      setDetailOpen(false);
    }
  }, [filteredOrders, selectedId]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedId) ?? null,
    [filteredOrders, selectedId],
  );

  useEffect(() => {
    if (detailOpen && !selectedOrder) {
      setDetailOpen(false);
    }
  }, [detailOpen, selectedOrder]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedId(orderId);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
  };

  const handleFulfillmentUpdate = async (status: OrderFulfillmentStatus) => {
    if (!selectedOrder) return;
    setUpdatingFulfillment(true);
    try {
      const updated = await updateOrderFulfillment(selectedOrder.id, status);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    } catch (requestError) {
      console.error(requestError);
      alert("No se pudo actualizar el estado de entrega.");
    } finally {
      setUpdatingFulfillment(false);
    }
  };

  const downloadBlob = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = (format: DownloadFormat) => {
    if (!selectedOrder) return;
    const order = selectedOrder;
    const createdAt = new Date(order.created_at).toLocaleString();
    if (format === "html") {
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Pedido ${order.number}</title>
<style>
body{font-family:'Segoe UI',sans-serif;background:#010b17;margin:0;padding:32px;color:#f8fafc;}
.card{background:rgba(11,37,77,0.92);border-radius:28px;padding:28px;margin-bottom:24px;box-shadow:0 20px 60px rgba(1,5,18,0.55);}
.grid{display:flex;flex-wrap:wrap;gap:20px;}
.panel{flex:1 1 320px;background:rgba(6,21,43,0.85);border-radius:22px;padding:20px;}
.badge{display:inline-flex;padding:6px 16px;border-radius:999px;background:#0ba375;color:#031224;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;}
th,td{padding:10px;border-bottom:1px solid rgba(255,255,255,0.12);text-align:left;}
.items{background:rgba(2,12,28,0.9);border-radius:18px;padding:18px;margin-top:16px;}
</style>
</head>
<body>
  <div class="card">
    <h1 style="margin:0 0 4px 0;">Pedido ${order.number}</h1>
    <p style="margin:0 0 8px 0;color:rgba(248,250,252,0.7);">${createdAt}</p>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span class="badge">${order.status.replace("_", " ")}</span>
      <strong style="font-size:20px;">${formatCurrency(Number(order.total_amount))}</strong>
    </div>
  </div>
  <div class="grid">
    <div class="panel">
      <h2>Información del cliente</h2>
      <p><strong>Nombre:</strong> ${order.customer_name}</p>
      <p><strong>Email:</strong> ${order.customer_email}</p>
      ${order.customer_phone ? `<p><strong>Teléfono:</strong> ${order.customer_phone}</p>` : ""}
      <p style="margin-top:16px;text-transform:uppercase;letter-spacing:0.35em;font-size:12px;color:rgba(248,250,252,0.7);">Envío</p>
      <p>${order.shipping_address_line1}${order.shipping_address_line2 ? `, ${order.shipping_address_line2}` : ""}, ${order.shipping_city}${
        order.shipping_state ? `, ${order.shipping_state}` : ""
      } - ${order.shipping_country}</p>
      ${order.notes ? `<div class="items"><strong>Notas:</strong><p>${order.notes}</p></div>` : ""}
    </div>
    <div class="panel">
      <h2>Detalle de artículos</h2>
      <div class="items">
        ${order.items
          .map(
            (item) => `<div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <div>
              <strong>${item.product_name}</strong>
              <p style="margin:2px 0 0 0;text-transform:uppercase;letter-spacing:0.3em;font-size:11px;color:rgba(248,250,252,0.65);">${
                item.product_sku
              }</p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0;">${item.quantity} uds</p>
              <strong>${formatCurrency(Number(item.total_price))}</strong>
            </div>
          </div>`
          )
          .join("")}
      </div>
      <table>
        <tbody>
          <tr><td>Subtotal</td><td>${formatCurrency(Number(order.subtotal_amount))}</td></tr>
          <tr><td>Impuestos</td><td>${formatCurrency(Number(order.tax_amount))}</td></tr>
          <tr><td>Envío</td><td>${formatCurrency(Number(order.shipping_amount))}</td></tr>
          <tr><th>Total</th><th>${formatCurrency(Number(order.total_amount))}</th></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
      downloadBlob(html, "text/html;charset=utf-8", `pedido-${order.number}.html`);
      return;
    }

    if (format === "excel") {
      const excel = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /></head><body>
        <table border="1" style="border-collapse:collapse">
          <tr><th colspan="2">Pedido</th></tr>
          <tr><td>Número</td><td>${order.number}</td></tr>
          <tr><td>Fecha</td><td>${createdAt}</td></tr>
          <tr><td>Cliente</td><td>${order.customer_name}</td></tr>
          <tr><td>Email</td><td>${order.customer_email}</td></tr>
          <tr><th colspan="2">Artículos</th></tr>
          ${order.items
            .map((item) => `<tr><td>${item.product_name} (${item.product_sku})</td><td>${item.quantity} uds - ${formatCurrency(Number(item.total_price))}</td></tr>`)
            .join("")}
          <tr><td>Subtotal</td><td>${formatCurrency(Number(order.subtotal_amount))}</td></tr>
          <tr><td>Impuestos</td><td>${formatCurrency(Number(order.tax_amount))}</td></tr>
          <tr><td>Envío</td><td>${formatCurrency(Number(order.shipping_amount))}</td></tr>
          <tr><td>Total</td><td>${formatCurrency(Number(order.total_amount))}</td></tr>
        </table>
      </body></html>`;
      downloadBlob(`\ufeff${excel}`, "application/vnd.ms-excel", `pedido-${order.number}.xls`);
      return;
    }

    if (format === "pdf") {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 46;

      // Background
      doc.setFillColor(2, 9, 24);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Accent circles
      doc.setFillColor(15, 60, 130);
      doc.circle(pageWidth - 90, 80, 60, "F");
      doc.setFillColor(7, 33, 86);
      doc.circle(pageWidth - 30, 10, 40, "F");

      let cursorY = margin;
      const textColor = {
        primary: [248, 250, 252] as [number, number, number],
        secondary: [148, 163, 184] as [number, number, number],
      };
      const setColor = (color: [number, number, number]) => doc.setTextColor(color[0], color[1], color[2]);

      // Header card
      const headerHeight = 130;
      doc.setFillColor(7, 33, 86);
      doc.roundedRect(margin, cursorY, pageWidth - margin * 2, headerHeight, 28, 28, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      setColor(textColor.primary);
      doc.text("SmartSales365", margin + 28, cursorY + 36);
      doc.setFontSize(18);
      doc.text(`Pedido ${order.number}`, margin + 28, cursorY + 70);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(210, 225, 255);
      doc.text(createdAt, margin + 28, cursorY + 90);

      // Status pill
      doc.setFillColor(order.status === "PAID" ? 11 : 180, order.status === "PAID" ? 163 : 53, order.status === "PAID" ? 117 : 41);
      doc.roundedRect(pageWidth - margin - 130, cursorY + 32, 110, 30, 12, 12, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(3, 12, 28);
      doc.text(order.status.replace(/_/g, " "), pageWidth - margin - 75, cursorY + 52, { align: "center" });

      setColor(textColor.primary);
      doc.setFontSize(26);
      doc.text(formatCurrency(Number(order.total_amount)), pageWidth - margin - 28, cursorY + 90, { align: "right" });

      cursorY += headerHeight + 30;

      const drawSectionTitle = (title: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        setColor(textColor.secondary);
        doc.text(title.toUpperCase(), margin, cursorY);
        cursorY += 16;
      };

      const drawCard = (height: number, body: (startY: number) => void) => {
        doc.setFillColor(5, 19, 48);
        doc.roundedRect(margin, cursorY, pageWidth - margin * 2, height, 24, 24, "F");
        setColor(textColor.primary);
        const innerY = cursorY + 26;
        body(innerY);
        cursorY += height + 28;
      };

      drawSectionTitle("Información del cliente");
      drawCard(140, (startY) => {
        let y = startY;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(`Nombre: ${order.customer_name}`, margin + 20, y);
        y += 20;
        doc.text(`Email: ${order.customer_email}`, margin + 20, y);
        y += 20;
        if (order.customer_phone) {
          doc.text(`Teléfono: ${order.customer_phone}`, margin + 20, y);
          y += 20;
        }
        doc.text("Envío:", margin + 20, y);
        const address = `${order.shipping_address_line1}${order.shipping_address_line2 ? `, ${order.shipping_address_line2}` : ""}, ${order.shipping_city}${
          order.shipping_state ? `, ${order.shipping_state}` : ""
        } - ${order.shipping_country}`;
        const wrapped = doc.splitTextToSize(address, pageWidth - margin * 2 - 60);
        doc.text(wrapped, margin + 80, y);
      });

      drawSectionTitle("Detalle de artículos");
      const tableX = margin;
      const tableWidth = pageWidth - margin * 2;
      const headerY = cursorY + 8;
      const rowHeight = 28;

      // Table header
      doc.setFillColor(10, 39, 88);
      doc.roundedRect(tableX, headerY, tableWidth, rowHeight, 12, 12, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
        setColor(textColor.primary);
      doc.text("Producto", tableX + 20, headerY + 18);
      doc.text("Cantidad", tableX + tableWidth - 220, headerY + 18);
      doc.text("Subtotal", tableX + tableWidth - 90, headerY + 18);

      let bodyY = headerY + rowHeight + 10;
      doc.setFont("helvetica", "normal");
      order.items.forEach((item, index) => {
        const isEven = index % 2 === 0;
        doc.setFillColor(isEven ? 6 : 3, isEven ? 24 : 16, isEven ? 58 : 40);
        doc.roundedRect(tableX, bodyY, tableWidth, rowHeight - 4, 10, 10, "F");
        setColor(textColor.primary);
        doc.text(item.product_name, tableX + 20, bodyY + 18);
        setColor(textColor.secondary);
        doc.setFontSize(9);
        doc.text(item.product_sku, tableX + 20, bodyY + 30);
        doc.setFontSize(11);
        setColor(textColor.primary);
        doc.text(`${item.quantity} uds`, tableX + tableWidth - 220, bodyY + 18);
        doc.text(formatCurrency(Number(item.total_price)), tableX + tableWidth - 90, bodyY + 18);
        bodyY += rowHeight + 6;
      });

      cursorY = bodyY + 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      setColor(textColor.primary);
      doc.text("Resumen de montos", margin, cursorY);
      cursorY += 10;
      doc.setFillColor(10, 32, 74);
      doc.roundedRect(margin, cursorY, tableWidth, 90, 20, 20, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const summaryY = cursorY + 30;
      setColor(textColor.secondary);
      doc.text("Subtotal", margin + 20, summaryY);
      doc.text("Impuestos", margin + 20, summaryY + 20);
      doc.text("Envío", margin + 20, summaryY + 40);
      setColor(textColor.primary);
      setColor(textColor.primary);
      doc.text(formatCurrency(Number(order.subtotal_amount)), pageWidth - margin - 20, summaryY, { align: "right" });
      doc.text(formatCurrency(Number(order.tax_amount)), pageWidth - margin - 20, summaryY + 20, { align: "right" });
      doc.text(formatCurrency(Number(order.shipping_amount)), pageWidth - margin - 20, summaryY + 40, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text("Total", margin + 20, summaryY + 70);
      doc.text(formatCurrency(Number(order.total_amount)), pageWidth - margin - 20, summaryY + 70, { align: "right" });

      doc.save(`pedido-${order.number}.pdf`);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-3 px-[10px] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Pedidos</h1>
          <p className="text-sm text-white/60">Supervisa tus ventas y verifica el estado de cobro en tiempo real.</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">{orders.length} pedidos</span>
      </header>

      {error ? (
        <div className="mx-[10px] rounded-3xl border border-red-500/40 bg-red-500/15 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.28em] text-red-100">
          {error}
        </div>
      ) : null}

      <div className="flex h-[calc(100vh-220px)] flex-col gap-4 px-[10px]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.45fr)_minmax(0,0.45fr)_auto]">
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.473 6.473 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.02 14 5 11.98 5 9.5S7.02 5 9.5 5 14 7.02 14 9.5 11.98 14 9.5 14z"
              />
            </svg>
            <input
              className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-white/50"
              placeholder="Buscar por numero, email o cliente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | OrderStatus)}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
            value={fulfillmentFilter}
            onChange={(event) => setFulfillmentFilter(event.target.value as "all" | OrderFulfillmentStatus)}
          >
            {FULFILLMENT_STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
              onClick={() => loadOrders()}
              aria-label="Actualizar pedidos"
            >
              <img src="/icons/refresh.svg" alt="Actualizar pedidos" width={18} height={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/65">
            Cargando pedidos...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            No hay pedidos que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar">
            <table className="w-full min-w-[860px] text-sm text-white/85">
              <thead className="sticky top-0 z-10 bg-[#06152b]/90 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50 backdrop-blur">
                <tr>
                  <th className="px-5 py-3 text-left">Pedido</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Pago</th>
                  <th className="px-5 py-3 text-left">Entrega</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Fecha</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`border-b border-white/5 last:border-transparent transition hover:bg-white/5 ${
                      selectedId === order.id ? "bg-white/10" : ""
                    }`}
                  >
                    <td className="px-5 py-4 font-semibold text-white">{order.number}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-white">{order.customer_name}</div>
                        <div className="text-xs text-white/60">{order.customer_email}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-4">
                      <OrderFulfillmentBadge status={order.fulfillment_status} />
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-white">{formatCurrency(Number(order.total_amount))}</td>
                    <td className="px-5 py-4 text-right text-white/70">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-primary hover:text-white"
                        onClick={() => handleSelectOrder(order.id)}
                        title="Ver detalle"
                      >
                        <img src="/icons/view.svg" alt="Ver detalle" width={18} height={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={Boolean(selectedOrder) && detailOpen} title={selectedOrder ? `Pedido ${selectedOrder.number}` : ""} onClose={closeDetail}>
        {selectedOrder ? (
          <div className="space-y-6 text-white">
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#0b254d]/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Resumen</p>
                <p className="text-2xl font-semibold text-white">{selectedOrder.number}</p>
                <p className="text-sm text-white/70">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <OrderStatusBadge status={selectedOrder.status} />
                <OrderFulfillmentBadge status={selectedOrder.fulfillment_status} />
                <p className="text-lg font-semibold text-white">{formatCurrency(Number(selectedOrder.total_amount))}</p>
                <select
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                  value={selectedOrder.fulfillment_status}
                  onChange={(event) => handleFulfillmentUpdate(event.target.value as OrderFulfillmentStatus)}
                  disabled={updatingFulfillment}
                >
                  {FULFILLMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-3xl border border-white/10 bg-[#0b254d]/60 px-6 py-5 text-sm text-white/80">
                <h3 className="text-base font-semibold text-white">Informacion del cliente</h3>
                <p>
                  <span className="font-semibold text-white">Nombre:</span> {selectedOrder.customer_name}
                </p>
                <p>
                  <span className="font-semibold text-white">Email:</span> {selectedOrder.customer_email}
                </p>
                {selectedOrder.customer_phone ? (
                  <p>
                    <span className="font-semibold text-white">Telefono:</span> {selectedOrder.customer_phone}
                  </p>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Envio</p>
                  <p className="mt-1">
                    {selectedOrder.shipping_address_line1}
                    {selectedOrder.shipping_address_line2 ? `, ${selectedOrder.shipping_address_line2}` : ""}, {selectedOrder.shipping_city}
                    {selectedOrder.shipping_state ? `, ${selectedOrder.shipping_state}` : ""} - {selectedOrder.shipping_country}
                  </p>
                </div>
                {selectedOrder.notes ? (
                  <p className="rounded-2xl border border-white/10 bg-[#0b254d]/50 px-4 py-3 text-sm text-white">
                    <span className="font-semibold text-white">Notas:</span> {selectedOrder.notes}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-[#0b254d]/60 px-6 py-5 text-sm text-white/80">
                <h3 className="text-base font-semibold text-white">Detalle de articulos</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto thin-scrollbar pr-1">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between rounded-2xl border border-white/10 bg-[#06152b] px-4 py-3 text-white/85">
                      <div>
                        <p className="font-semibold text-white">{item.product_name}</p>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/60">{item.product_sku}</p>
                      </div>
                      <div className="text-right">
                        <p>{item.quantity} uds</p>
                        <p className="font-semibold text-white">{formatCurrency(Number(item.total_price))}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#06152b] px-4 py-3 text-white/90">
                  <p>
                    <span className="font-semibold text-white">Subtotal:</span> {formatCurrency(Number(selectedOrder.subtotal_amount))}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Impuestos:</span> {formatCurrency(Number(selectedOrder.tax_amount))}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Envio:</span> {formatCurrency(Number(selectedOrder.shipping_amount))}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    Total: {formatCurrency(Number(selectedOrder.total_amount))}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/15"
                  onClick={() => handleDownload("pdf")}
                >
                  Descargar PDF
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/15"
                  onClick={() => handleDownload("excel")}
                >
                  Descargar Excel
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/15"
                  onClick={() => handleDownload("html")}
                >
                  Descargar HTML
                </button>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                {selectedOrder.receipt_url ? (
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-5 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
                    onClick={() => window.open(selectedOrder.receipt_url ?? "", "_blank")}
                  >
                    Ver comprobante
                  </button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-5 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
                  onClick={() => loadOrders()}
                >
                  Refrescar estado
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
