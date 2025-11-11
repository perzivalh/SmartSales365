import clsx from "clsx";

import type { OrderStatus } from "../../types/api";

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: "Pendiente",
    className: "bg-amber-500/15 text-amber-300 border border-amber-400/30",
  },
  PAID: {
    label: "Pagado",
    className: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30",
  },
  FAILED: {
    label: "Fallido",
    className: "bg-red-500/15 text-red-300 border border-red-400/30",
  },
  CANCELED: {
    label: "Cancelado",
    className: "bg-slate-500/15 text-slate-300 border border-slate-400/30",
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING_PAYMENT;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
