import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useCart } from "../../hooks/useCart";

import { getCategoryById } from "../../api/categories";
import { getProducts } from "../../api/products";
import type { Category, Product } from "../../types/api";
import { formatCurrency } from "../../utils/currency";
import { resolvePromotionPricing } from "../../utils/promotions";
import { FavoriteButton } from "../../components/products/FavoriteButton";

const IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80";

export function CategoryListingPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    const id = categoryId;
    async function loadCategory() {
      try {
        const data = await getCategoryById(id);
        setCategory(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError("No pudimos encontrar esta categoria.");
      }
    }
    loadCategory();
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId) return;
    const id = categoryId;
    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const response = await getProducts({
          category_id: id,
          search: search || undefined,
          is_active: true,
          ordering: "-created_at",
          page: 1,
          page_size: 24,
        });
        setProducts(response.results);
      } catch (fetchError) {
        console.error(fetchError);
        setError("No pudimos cargar los productos de esta categoria.");
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [categoryId, search]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleReset = () => {
    setSearchInput("");
    setSearch("");
  };

  const handleOpenProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, productId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenProduct(productId);
    }
  };

  const handleAddToCart = (product: Product) => {
    const pricing = resolvePromotionPricing(product);
    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: pricing.finalPrice,
      originalPrice: pricing.originalPrice,
      promotionLabel: pricing.label,
      imageUrl: product.cover_image_url ?? product.images[0]?.url ?? IMAGE_PLACEHOLDER,
      stock: product.stock,
    });
  };

  if (!categoryId) {
    return (
      <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-slate-200">
        Selecciona una categoria valida.
      </div>
    );
  }

  if (error && !category) {
    return (
      <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-slate-200">
        {error}
      </div>
    );
  }

  const heroImage = category?.image_url || IMAGE_PLACEHOLDER;

  return (
    <div className="flex flex-col gap-10">
      <header className="relative overflow-hidden rounded-[42px] bg-[#071a36] shadow-hero">
        <img src={heroImage} alt={category?.name ?? "Categoria"} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081c35]/95 via-[#081c35]/70 to-transparent" />
        <div className="relative z-20 flex flex-col gap-6 px-8 py-10 md:flex-row md:items-center md:justify-between md:px-14 lg:px-20">
          <div className="max-w-2xl space-y-5">
            <span className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 md:text-sm">
              Categoria
            </span>
            <h1 className="text-3xl font-semibold text-white md:text-4xl lg:text-5xl">{category?.name ?? "Categoria"}</h1>
            <p className="max-w-xl text-base text-slate-200/90 md:text-lg">
              {category?.description || "Explora los productos destacados de esta categoria."}
            </p>
            <form className="flex flex-wrap items-center gap-3" onSubmit={handleSearch}>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar dentro de la categoria"
                className="min-w-[220px] flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-slate-100 placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:scale-[1.02]"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
              >
                Limpiar
              </button>
            </form>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center font-semibold text-primary">
          Cargando productos...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-500/40 bg-red-900/30 px-6 py-12 text-center font-semibold text-red-200">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center font-semibold text-slate-200">
          No hay productos dentro de esta categoria por ahora.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const pricing = resolvePromotionPricing(product);
              return (
              <article
                key={product.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenProduct(product.id)}
                onKeyDown={(event) => handleCardKeyDown(event, product.id)}
                className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#061327] shadow-[0_45px_90px_rgba(3,10,23,0.5)] transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_60px_120px_rgba(3,10,23,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040d1f]"
              >
              <div className="absolute inset-0">
                <img
                  src={product.cover_image_url ?? product.images[0]?.url ?? IMAGE_PLACEHOLDER}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#041024] via-[#061a35]/65 to-transparent" />
              <div
                className="absolute right-4 top-4 z-20"
                onClickCapture={(event) => event.stopPropagation()}
                onKeyDownCapture={(event) => event.stopPropagation()}
              >
                <FavoriteButton productId={product.id} size="sm" />
              </div>
              <div className="relative z-10 flex h-full flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <span className="inline-flex items-center rounded-full bg-[#ffd700] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#041024] shadow-md shadow-[#ffd700]/30">
                    Nuevo
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/70">
                    {category?.name ?? product.category_name ?? "Categoria"}
                  </span>
                </div>

                <div className="mt-auto space-y-2">
                  <h2 className="text-2xl font-semibold leading-tight text-white">{product.name}</h2>
                  <p className="text-sm text-primary/70">{product.short_description}</p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-white">{formatCurrency(pricing.finalPrice)}</span>
                      {pricing.hasPromotion ? (
                        <span className="text-sm text-white/60 line-through">{formatCurrency(pricing.originalPrice)}</span>
                      ) : null}
                    </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/40 transition hover:scale-105"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2s-.9-2-2-2m0 2zm12 0c0-1.1-.9-2-2-2s-2 .9-2 2s.9 2 2 2s2-.9 2-2m2-16H5.21l-.2-1.01C4.93 2.42 4.52 2 4 2H2v2h1l3.6 7.59l-1.35 2.44C4.52 14.37 5.48 16 7 16h12v-2H7l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48c0-.55-.45-1-1-1Z"
                        />
                      </svg>
                      Añadir
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg shadow-primary/20 transition hover:scale-110"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenProduct(product.id);
                      }}
                      aria-label={`Ver ${product.name}`}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 5c-5 0-9.27 3.11-11 7.5C2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5Zm0 12a4.5 4.5 0 1 1 0-9a4.5 4.5 0 0 1 0 9Zm0-7a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5Z"
                        />
                      </svg>
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
