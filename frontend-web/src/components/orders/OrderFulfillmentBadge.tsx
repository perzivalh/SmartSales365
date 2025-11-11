import clsx from "clsx";

import type { OrderFulfillmentStatus } from "../../types/api";

const STATUS_CONFIG: Record<OrderFulfillmentStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-slate-500/15 text-slate-200 border border-slate-400/30",
  },
  PROCESSING: {
    label: "En proceso",
    className: "bg-indigo-500/15 text-indigo-200 border border-indigo-400/30",
  },
  IN_TRANSIT: {
    label: "En camino",
    className: "bg-cyan-500/15 text-cyan-200 border border-cyan-400/30",
  },
  DELIVERED: {
    label: "Entregado",
    className: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  },
};

export function OrderFulfillmentBadge({ status }: { status: OrderFulfillmentStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em]",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
