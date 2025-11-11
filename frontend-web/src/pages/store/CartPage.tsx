import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { formatCurrency } from "../../utils/currency";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";

export function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, subtotal, originalSubtotal, savings, updateQuantity, removeItem } = useCart();
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const isEmpty = items.length === 0;
  const summary = useMemo(() => {
    const tax = 0;
    const shipping = 0;
    return {
      tax,
      shipping,
      total: subtotal + tax + shipping,
    };
  }, [subtotal]);

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-[rgba(7,26,52,0.88)] px-8 py-16 text-center shadow-[0_40px_80px_rgba(3,10,23,0.55)]">
        <h2 className="text-2xl font-semibold text-white">Tu carrito esta vacio</h2>
        <p className="mt-3 text-sm text-slate-300">
          Agrega productos desde nuestro catalogo y vuelve aqui para completar tu compra.
        </p>
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-white">Carrito de compras</h1>
          <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
            {items.length} {items.length === 1 ? "producto" : "productos"}
          </span>
        </header>

        <div className="space-y-4">
          {items.map((item) => {
            const hasPromotion = (item.originalPrice ?? item.price) > item.price;
            return (
            <article
              key={item.productId}
              className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-[rgba(7,18,36,0.88)] p-5 shadow-[0_25px_60px_rgba(3,10,23,0.45)] backdrop-blur"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#081c35]">
                  <img
                    src={item.imageUrl ?? "https://via.placeholder.com/200x200?text=Producto"}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-white">{item.name}</h2>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300">
                      {item.sku}
                    </span>
                    {hasPromotion ? (
                      <span className="rounded-full bg-primary/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
                        {item.promotionLabel ? `Promo · ${item.promotionLabel}` : "Promoción"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-300">
                    Precio unitario:{" "}
                    <span className="font-semibold text-white">{formatCurrency(item.price)}</span>
                    {hasPromotion ? (
                      <span className="ml-3 text-xs text-white/60 line-through">
                        {formatCurrency((item.originalPrice ?? item.price))}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-slate-300">
                    Stock disponible: <span className="font-semibold text-white">{item.stock ?? "-"}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-200 transition hover:bg-white/10 hover:text-white"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    aria-label="Disminuir cantidad"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M5 11h14v2H5z" />
                    </svg>
                  </button>
                  <span className="text-lg font-semibold text-white">{item.quantity}</span>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-200 transition hover:bg-white/10 hover:text-white"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    aria-label="Incrementar cantidad"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-lg font-semibold text-white">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    {hasPromotion ? (
                      <div className="text-xs text-white/60 line-through">
                        {formatCurrency((item.originalPrice ?? item.price) * item.quantity)}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => removeItem(item.productId)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </article>
          );
          })}
        </div>
      </section>

      <aside className="h-fit rounded-[28px] border border-white/10 bg-[rgba(7,18,36,0.88)] p-6 shadow-[0_35px_70px_rgba(3,10,23,0.5)]">
        {authMessage ? (
          <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-900/30 px-4 py-3 text-xs font-semibold text-amber-200">
            {authMessage}
          </div>
        ) : null}
        <h2 className="text-2xl font-semibold text-white">Resumen</h2>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          {savings > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <span>Subtotal sin descuentos</span>
                <span className="font-semibold text-white">{formatCurrency(originalSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-300">
                <span>Ahorro promocional</span>
                <span>-{formatCurrency(savings)}</span>
              </div>
            </>
          ) : null}
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Impuestos</span>
            <span className="font-semibold text-white">{formatCurrency(summary.tax)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Envio</span>
            <span className="font-semibold text-white">{summary.shipping === 0 ? "Gratis" : formatCurrency(summary.shipping)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
            <span>Total</span>
            <span>{formatCurrency(summary.total)}</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
          onClick={() => {
            if (!isAuthenticated) {
              setAuthMessage("Necesitas iniciar sesion para completar tu compra.");
              navigate("/login", {
                state: { from: { pathname: "/checkout" }, message: "Inicia sesion para completar tu compra." },
              });
              return;
            }
            navigate("/checkout");
          }}
        >
          Continuar al pago
        </button>
      </aside>
    </div>
  );
}
