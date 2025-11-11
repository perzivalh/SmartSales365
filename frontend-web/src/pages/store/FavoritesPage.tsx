import { useEffect, useMemo, useState } from "react";

import { getProducts } from "../../api/products";
import type { Product } from "../../types/api";
import { formatCurrency } from "../../utils/currency";
import { resolvePromotionPricing } from "../../utils/promotions";
import { useFavorites } from "../../hooks/useFavorites";
import { useCart } from "../../hooks/useCart";
import { useNavigate } from "react-router-dom";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80";

export function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFavorites() {
      if (favorites.length === 0) {
        setProducts([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await getProducts({ ids: favorites });
        if (cancelled) return;
        const orderMap = new Map(favorites.map((id, index) => [id, index]));
        const sorted = response.results
          .filter((product) => orderMap.has(product.id))
          .sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!));
        setProducts(sorted);
      } catch (fetchError) {
        if (!cancelled) {
          console.error(fetchError);
          setError("No se pudieron cargar tus productos favoritos.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  const emptyMessage = useMemo(() => {
    if (favorites.length === 0) return "Todavia no tienes productos marcados como favoritos.";
    if (error) return error;
    if (!loading && products.length === 0) return "Algunos productos ya no estan disponibles en el catalogo.";
    return null;
  }, [favorites.length, error, loading, products.length]);

  const handleAddToCart = (product: Product) => {
    const pricing = resolvePromotionPricing(product);
    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: pricing.finalPrice,
      originalPrice: pricing.originalPrice,
      promotionLabel: pricing.label,
      imageUrl: product.cover_image_url ?? product.images[0]?.url ?? FALLBACK_IMAGE,
      stock: product.stock,
    });
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="rounded-[42px] border border-white/10 bg-[rgba(7,26,52,0.9)] px-8 py-10 shadow-[0_40px_80px_rgba(3,10,23,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Perfil</p>
            <h1 className="text-3xl font-semibold text-white">Mis favoritos</h1>
            <p className="text-sm text-slate-300">Tus productos guardados para comprar despues.</p>
          </div>
          {products.length > 0 ? (
            <span className="rounded-full border border-white/20 px-4 py-1 text-sm font-semibold text-white/80">
              {products.length} productos
            </span>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center font-semibold text-primary">
          Cargando favoritos...
        </div>
      ) : emptyMessage ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-sm text-slate-300">
          {emptyMessage}
          {favorites.length === 0 ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="rounded-full bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
                onClick={() => navigate("/", { state: { targetSection: "catalogo" } })}
              >
                Ir al catalogo
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const pricing = resolvePromotionPricing(product);
            return (
              <article
                key={product.id}
                className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#061327] shadow-[0_45px_90px_rgba(3,10,23,0.5)] transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_60px_120px_rgba(3,10,23,0.6)]"
              >
                <div className="absolute inset-0">
                  <img
                    src={product.cover_image_url ?? product.images[0]?.url ?? FALLBACK_IMAGE}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#041024] via-[#061a35]/65 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between p-6">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white">
                      Favorito
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/70 transition hover:bg-white/20"
                      onClick={() => removeFavorite(product.id)}
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="mt-auto space-y-2">
                    <h3 className="text-2xl font-semibold leading-tight text-white">{product.name}</h3>
                    <p className="text-sm text-primary/70">{product.short_description || product.category_name}</p>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-primary">{formatCurrency(pricing.finalPrice)}</span>
                      {pricing.hasPromotion ? (
                        <span className="text-sm text-white/60 line-through">{formatCurrency(pricing.originalPrice)}</span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
                        onClick={() => handleAddToCart(product)}
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
