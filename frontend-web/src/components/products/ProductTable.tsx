import { formatCurrency } from "../../utils/currency";
import type { Product } from "../../types/api";

type Props = {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

const statusBaseClass =
  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]";
const actionButtonClass =
  "rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/75 transition hover:border-white/40 hover:text-white";

export function ProductTable({ products, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="px-6 py-14 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
        Cargando productos...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-6 py-14 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
        No hay productos registrados todavia.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-5 sm:p-7">
      <div className="grid gap-4 md:hidden">
        {products.map((product) => {
          const activePromotion = product.active_promotion;
          const finalPrice = Number(product.final_price ?? product.price);
          const originalPrice = Number(product.price);
          const hasPromotion = Boolean(activePromotion) && finalPrice < originalPrice;
          return (
          <article key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-black/20">
            <div className="flex items-start gap-3">
              {product.cover_image_url ? (
                <img
                  src={product.cover_image_url}
                  alt={product.name}
                  className="h-16 w-16 flex-shrink-0 rounded-2xl border border-white/10 object-cover object-center"
                />
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40">
                  SIN
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-white">{product.name}</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                    {product.sku}
                  </span>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">{product.category_name}</p>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-white">{formatCurrency(finalPrice)}</p>
                  {hasPromotion ? (
                    <p className="text-xs text-white/60 line-through">{formatCurrency(originalPrice)}</p>
                  ) : null}
                </div>
                {hasPromotion ? (
                  <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                    {activePromotion?.name ?? "Promo"}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60">Stock: {product.stock}</span>
                <span
                  className={`${statusBaseClass} ${
                    product.is_active ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {product.is_active ? "Publicado" : "Inactivo"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className={actionButtonClass} onClick={() => onEdit(product)}>
                  Editar
                </button>
                <button
                  type="button"
                  className={`${actionButtonClass} border-red-500/60 text-red-200 hover:border-red-400 hover:text-red-100`}
                  onClick={() => onDelete(product)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </article>
        );
        })}
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] divide-y divide-white/10 text-sm text-slate-200">
            <thead className="bg-white/5 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Precio</th>
                <th className="px-4 py-3 text-left">Promoción</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {products.map((product) => {
                const activePromotion = product.active_promotion;
                const finalPrice = Number(product.final_price ?? product.price);
                const originalPrice = Number(product.price);
                const hasPromotion = Boolean(activePromotion) && finalPrice < originalPrice;
                return (
                <tr key={product.id} className="transition hover:bg-white/10">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {product.cover_image_url ? (
                        <img
                          src={product.cover_image_url}
                          alt={product.name}
                          className="h-14 w-14 flex-shrink-0 rounded-2xl border border-white/10 object-cover object-center shadow-inner shadow-black/30"
                        />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40">
                          SIN
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{product.name}</p>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-white/70">{product.category_name}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{formatCurrency(finalPrice)}</span>
                      {hasPromotion ? (
                        <span className="text-xs text-white/60 line-through">{formatCurrency(originalPrice)}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-white/70">
                    {hasPromotion ? (
                      <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                        {activePromotion?.name ?? "Activa"}
                      </span>
                    ) : (
                      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Sin promoción</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-white/70">{product.stock}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`${statusBaseClass} ${
                        product.is_active ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {product.is_active ? "Publicado" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className={actionButtonClass} onClick={() => onEdit(product)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`${actionButtonClass} border-red-500/60 text-red-200 hover:border-red-400 hover:text-red-100`}
                        onClick={() => onDelete(product)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
