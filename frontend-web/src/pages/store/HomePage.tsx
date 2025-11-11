import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

import { getCategories } from "../../api/categories";
import { getProducts } from "../../api/products";
import { getPromotions } from "../../api/promotions";
import { getProductRecommendations } from "../../api/recommendations";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { FavoriteButton } from "../../components/products/FavoriteButton";
import type { Category, Product, ProductRecommendation, Promotion } from "../../types/api";
import { formatCurrency } from "../../utils/currency";
import { resolvePromotionPricing } from "../../utils/promotions";

const HERO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80";

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [recommendationSummary, setRecommendationSummary] = useState("");
  const [recommendationStrategy, setRecommendationStrategy] = useState<"personalized" | "top_sellers" | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (fetchError) {
        console.error(fetchError);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadHeroProducts() {
      try {
        const response = await getProducts({
          is_active: true,
          ordering: "-created_at",
          page: 1,
          page_size: 5,
        });
        setHeroProducts(response.results);
      } catch (fetchError) {
        console.error(fetchError);
      }
    }
    loadHeroProducts();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const response = await getProducts({
          search: search || undefined,
          category_id: selectedCategory !== "all" ? selectedCategory : undefined,
          is_active: true,
          ordering: "-created_at",
          page: 1,
          page_size: 20,
        });
        setProducts(response.results);
      } catch (fetchError) {
        console.error(fetchError);
        setError("No pudimos cargar los productos en este momento.");
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [search, selectedCategory]);

  useEffect(() => {
    let cancelled = false;
    async function loadRecommendations() {
      setLoadingRecommendations(true);
      try {
        const response = await getProductRecommendations();
        if (cancelled) return;
        setRecommendations(response.products);
        setRecommendationSummary(response.summary);
        setRecommendationStrategy(response.strategy);
      } catch (fetchError) {
        if (cancelled) return;
        console.error(fetchError);
        try {
          const fallback = await getProducts({ ordering: "-created_at", page: 1, page_size: 6, is_active: true });
          if (cancelled) return;
          const fallbackRecommendations: ProductRecommendation[] = fallback.results.map((product) => ({
            ...product,
            metrics: {
              units_sold: product.stock ?? 0,
              total_revenue: product.price ?? "0",
              category_name: product.category_name,
            },
          }));
          setRecommendations(fallbackRecommendations);
          setRecommendationStrategy("top_sellers");
          setRecommendationSummary("Top ventas del catalogo, actualizadas recientemente.");
        } catch (fallbackError) {
          if (!cancelled) {
            console.error(fallbackError);
            setRecommendations([]);
            setRecommendationSummary("");
            setRecommendationStrategy(null);
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingRecommendations(false);
        }
      }
    }
    void loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    async function loadPromotions() {
      setLoadingPromotions(true);
      try {
        const response = await getPromotions({ status: "active", ordering: "-start_date", page_size: 6 });
        if (cancelled) return;
        setActivePromotions(response.results);
        const ids = Array.from(new Set(response.results.flatMap((promotion) => promotion.products)));
        const productsResponse =
          ids.length > 0
            ? await getProducts({ ids })
            : await getProducts({ has_promotion: true, page_size: 6, ordering: "-updated_at" });
        if (cancelled) return;
        setPromoProducts(productsResponse.results);
      } catch (fetchError) {
        if (!cancelled) {
          console.error(fetchError);
          setActivePromotions([]);
          setPromoProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingPromotions(false);
        }
      }
    }
    void loadPromotions();
    return () => {
      cancelled = true;
    };
  }, []);

  const heroSlides = useMemo(() => (heroProducts.length > 0 ? heroProducts : products.slice(0, 5)), [heroProducts, products]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((previous) => (previous + 1) % heroSlides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    if (activeSlide >= heroSlides.length) {
      setActiveSlide(0);
    }
  }, [heroSlides.length, activeSlide]);

  const featuredCategories = useMemo(() => categories.slice(0, 6), [categories]);

  const recommendationSummaryText = useMemo(() => {
    if (!recommendationStrategy) {
      return isAuthenticated
        ? "Activa tu perfil comprando productos para recibir sugerencias personalizadas."
        : "Mostramos los productos mas vendidos de SmartSales365.";
    }
    if (recommendationStrategy === "personalized") {
      return recommendationSummary || "Basado en tus ultimas compras y categorias favoritas.";
    }
    return recommendationSummary || "Mostramos los productos mas vendidos esta semana.";
  }, [recommendationStrategy, recommendationSummary, isAuthenticated]);

  const recommendationBadgeLabel = useMemo(() => {
    if (recommendationStrategy === "personalized") return "IA Personalizada";
    if (recommendationStrategy === "top_sellers") return "Top ventas";
    return null;
  }, [recommendationStrategy]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleResetFilters() {
    setSearchInput("");
    setSearch("");
    setSelectedCategory("all");
  }

  function handleAddProductToCart(product: Product, quantity = 1) {
    const pricing = resolvePromotionPricing(product);
    addItem(
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: pricing.finalPrice,
        originalPrice: pricing.originalPrice,
        promotionLabel: pricing.label,
        imageUrl: product.cover_image_url ?? product.images[0]?.url ?? HERO_FALLBACK_IMAGE,
        stock: product.stock,
      },
      quantity,
    );
  }

  function handleNavigateCategory(categoryId: string) {
    navigate(`/categories/${categoryId}`);
  }

  function handleOpenProduct(productId: string) {
    navigate(`/products/${productId}`);
  }

  function handlePrimaryAction() {
    if (isAuthenticated) {
      navigate("/admin/products");
    } else {
      navigate("/login", { state: { from: { pathname: "/admin/products" } } });
    }
  }

  function handleScrollToCatalog() {
    const element = document.getElementById("catalogo");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handlePrevSlide() {
    setActiveSlide((previous) => (previous - 1 + heroSlides.length) % heroSlides.length);
  }

  function handleNextSlide() {
    setActiveSlide((previous) => (previous + 1) % heroSlides.length);
  }

  return (
    <div className="flex flex-col gap-16 text-slate-100 lg:gap-20">
      <section className="mt-2" id="sobre">
        <div className="relative w-full overflow-hidden rounded-[42px] bg-[#071a36] shadow-[0_60px_120px_rgba(3,10,23,0.6)] min-h-[520px] sm:min-h-[560px] md:min-h-0 md:aspect-[16/7]">
          {heroSlides.length === 0 ? (
            <article className="absolute inset-0 flex flex-col justify-center gap-6 bg-gradient-to-r from-[#081c35]/95 via-[#081c35]/70 to-transparent px-8 py-8 md:px-14 lg:px-18">
              <span className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 md:text-sm">
                Nueva llegada
              </span>
              <h1 className="text-4xl font-semibold text-white md:text-5xl lg:text-6xl">
                Tu tienda conectada, productos listos para sorprender a tus clientes.
              </h1>
              <p className="max-w-xl text-base text-slate-200/90 md:text-lg">
                Explora el catalogo de SmartSales365 con imagenes de alta calidad, descripciones completas y una experiencia
                pensada para convertir visitas en ventas.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 font-semibold text-white shadow-lg shadow-primary/40 transition hover:scale-[1.02]"
                  onClick={handleScrollToCatalog}
                >
                  Ver catalogo
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/20 bg-white/10 px-6 py-3 font-semibold text-slate-100 backdrop-blur transition hover:bg-white/15"
                  onClick={handlePrimaryAction}
                >
                  {isAuthenticated ? "Gestionar catalogo" : "Iniciar sesion"}
                </button>
              </div>
            </article>
          ) : (
            heroSlides.map((product, index) => (
              <article
                key={product.id}
                className={clsx(
                  "absolute inset-0 grid items-center gap-8 px-6 py-10 transition-all duration-500 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:px-10 lg:px-16",
                  index === activeSlide ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <img src={product.cover_image_url ?? HERO_FALLBACK_IMAGE} alt={product.name} className="absolute inset-0 h-full w-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#081c35]/95 via-[#081c35]/70 to-transparent" />
                <div className="absolute right-6 top-6 z-30 hidden md:block">
                  <FavoriteButton productId={product.id} />
                </div>
                <div className="relative z-20 flex h-full flex-col justify-center gap-6">
                  <span className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 md:text-sm">
                    {product.active_promotion?.name ?? "Nueva llegada"}
                  </span>
                  <h1 className="text-3xl font-semibold text-white md:text-5xl lg:text-6xl">{product.name}</h1>
                  <p className="max-w-xl text-base text-slate-200/90 md:text-lg">
                    {product.short_description || "Explora nuestras ultimas novedades para sorprender a tus clientes."}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      className="rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 font-semibold text-white shadow-lg shadow-primary/40 transition hover:scale-[1.02]"
                      onClick={() => handleOpenProduct(product.id)}
                    >
                      Ver producto
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 bg-white/10 px-6 py-3 font-semibold text-slate-100 backdrop-blur transition hover:bg-white/15"
                      onClick={handleScrollToCatalog}
                    >
                      Ver catalogo
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}

          {heroSlides.length > 1 ? (
            <>
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="Anterior"
                className="pointer-events-auto absolute left-6 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-slate-200 shadow-md backdrop-blur transition hover:bg-white/20 md:flex"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M14.71 6.71 13.29 5.3 6.59 12l6.7 6.71 1.42-1.42L10.41 13H18v-2h-7.59Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="Siguiente"
                className="pointer-events-auto absolute right-6 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-slate-200 shadow-md backdrop-blur transition hover:bg-white/20 md:flex"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="m9.29 17.29 1.42 1.42L17.41 12l-6.7-6.71L9.29 6.71 13.59 11H6v2h7.59z" />
                </svg>
              </button>
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={clsx("pointer-events-auto h-2 rounded-full transition-all", index === activeSlide ? "w-8 bg-primary" : "w-2 bg-primary/30")}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Ver destacado ${index + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-6" id="categorias">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold text-white">Categorias destacadas</h2>
            <p className="text-sm text-slate-300">Explora las lineas mas populares de SmartSales365.</p>
          </div>
        </div>
        {featuredCategories.length === 0 ? (
          <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-slate-200">
            Aun no hay categorias registradas.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory thin-scrollbar sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-4 xl:grid-cols-6">
            {featuredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="group relative flex w-[80vw] max-w-[280px] flex-shrink-0 flex-col snap-start overflow-hidden rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.88)] shadow-card transition hover:-translate-y-1 sm:w-full sm:max-w-none sm:flex-shrink"
                onClick={() => handleNavigateCategory(category.id)}
              >
                <img
                  src={category.image_url || HERO_FALLBACK_IMAGE}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover opacity-40 transition group-hover:opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,18,32,0.9)] via-transparent to-transparent" />
                <span className="relative z-10 m-6 inline-flex rounded-full bg-[rgba(6,18,32,0.85)] px-5 py-2 text-sm font-semibold text-slate-100">
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5" id="recomendaciones">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold text-white">Recomendaciones para ti</h2>
            <p className="mt-1 text-sm text-slate-300">Descubre sugerencias actualizadas segun tu actividad.</p>
          </div>
          {recommendationBadgeLabel && isAuthenticated ? (
            <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
              {recommendationBadgeLabel}
            </span>
          ) : null}
        </div>
        {isAuthenticated ? (
          loadingRecommendations ? (
            <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center font-semibold text-primary">
              Generando recomendaciones...
            </div>
          ) : recommendations.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0 xl:grid-cols-3">
              {recommendations.map((product) => {
                const imageUrl = product.cover_image_url ?? product.images[0]?.url ?? HERO_FALLBACK_IMAGE;
                const contextualHint =
                  recommendationStrategy === "personalized"
                    ? `Basado en tus compras en ${product.metrics.category_name ?? "esta categoria"}.`
                    : `${product.metrics.units_sold ?? 0} ventas recientes.`;
                const pricing = resolvePromotionPricing(product);
                const finalPrice = pricing.finalPrice;
                const originalPrice = pricing.originalPrice;
                const hasPromotion = pricing.hasPromotion;
                return (
                  <article
                    key={product.id}
                    className="relative flex min-w-[300px] flex-shrink-0 snap-center gap-4 rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.88)] p-5 shadow-card transition hover:-translate-y-1 md:min-w-0 md:flex-shrink"
                  >
                    <div className="absolute right-4 top-4 z-20">
                      <FavoriteButton productId={product.id} size="sm" />
                    </div>
                    <button
                      type="button"
                      className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#041024]"
                      onClick={() => handleOpenProduct(product.id)}
                    >
                      <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        {hasPromotion ? (
                          <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                            Promo
                          </span>
                        ) : null}
                        <h3 className="mt-2 text-lg font-semibold text-white">{product.name}</h3>
                        <p className="mt-1 text-xs text-primary/70">{contextualHint}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold text-primary">{formatCurrency(finalPrice)}</span>
                          {hasPromotion ? (
                            <span className="text-xs text-white/60 line-through">{formatCurrency(originalPrice)}</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
                          onClick={() => handleAddProductToCart(product)}
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-sm text-slate-300">
              Todavía no podemos recomendar productos. Comienza a comprar para entrenar tus sugerencias.
            </div>
          )
        ) : (
          <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-sm text-slate-300">
            Inicia sesion para que SmartSales365 genere recomendaciones inteligentes segun tus compras.
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="rounded-full bg-primary px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
                onClick={() => navigate("/login")}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5" id="promociones">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold text-white">Promociones activas</h2>
            <p className="text-sm text-slate-300">
              {activePromotions.length > 0 ? "Mira lo que esta en oferta este ciclo." : "Activa tus campañas para verlas aquí."}
            </p>
          </div>
          {activePromotions.length > 0 ? (
            <span className="rounded-full border border-primary/35 bg-primary/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
              {activePromotions.length} promos
            </span>
          ) : null}
        </div>
        {loadingPromotions ? (
          <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center font-semibold text-primary">
            Cargando promociones...
          </div>
        ) : promoProducts.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:pb-0 xl:grid-cols-3">
            {promoProducts.map((product) => {
              const pricing = resolvePromotionPricing(product);
              const finalPrice = pricing.finalPrice;
              const originalPrice = pricing.originalPrice;
              const hasPromotion = pricing.hasPromotion;
              const imageUrl = product.cover_image_url ?? product.images[0]?.url ?? HERO_FALLBACK_IMAGE;
              return (
                <article
                  key={product.id}
                  className="group relative flex min-w-[300px] flex-shrink-0 snap-center flex-col overflow-hidden rounded-[28px] border border-primary/30 bg-[rgba(6,18,36,0.95)] p-6 shadow-card transition hover:-translate-y-1 md:min-w-0 md:flex-shrink"
                >
                  <img src={imageUrl} alt={product.name} className="absolute inset-0 h-full w-full object-cover opacity-20" />
                  <div className="absolute right-4 top-4 z-20">
                    <FavoriteButton productId={product.id} size="sm" />
                  </div>
                  <div className="relative z-10 flex h-full flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                        {product.active_promotion?.name ?? "Promoción"}
                      </span>
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                        
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white">{product.name}</h3>
                      <p className="mt-2 text-sm text-white/70">{product.short_description || "Oferta limitada disponible en línea."}</p>
                    </div>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-primary">{formatCurrency(finalPrice)}</span>
                      {hasPromotion ? (
                        <span className="text-sm text-white/60 line-through">{formatCurrency(originalPrice)}</span>
                      ) : null}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
                        onClick={() => handleAddProductToCart(product)}
                      >
                        Añadir
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:bg-white/10"
                        onClick={() => handleOpenProduct(product.id)}
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-sm text-slate-300">
            Aún no hay productos con promociones activas.
          </div>
        )}
      </section>

      <section className="flex flex-col gap-6" id="catalogo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold text-white">Explora todo el catalogo</h2>
            <p className="text-sm text-slate-300">Busca por nombre, SKU o filtra por categoría.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
            onClick={handlePrimaryAction}
          >
            {isAuthenticated ? "Gestionar catalogo" : "Iniciar sesion"}
          </button>
        </div>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]" onSubmit={handleSearch}>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.473 6.473 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.02 14 5 11.98 5 9.5S7.02 5 9.5 5 14 7.02 14 9.5 11.98 14 9.5 14z"
              />
            </svg>
            <input
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
              placeholder="Buscar productos por nombre o SKU"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>
          <select
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
          >
            Buscar
          </button>
          <button
            type="button"
            className="rounded-2xl border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
            onClick={handleResetFilters}
          >
            Limpiar
          </button>
        </form>

        {loading ? (
          <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center font-semibold text-primary">
            Cargando catalogo...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-900/40 px-6 py-12 text-center text-sm text-red-100">{error}</div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-sm text-slate-300">
            No encontramos productos para los filtros seleccionados.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const finalPrice = Number(product.final_price ?? product.price);
              const originalPrice = Number(product.price);
              const hasPromotion = finalPrice < originalPrice - 0.01;
              return (
                <article
                  key={product.id}
                  className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#061327] shadow-[0_45px_90px_rgba(3,10,23,0.5)] transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_60px_120px_rgba(3,10,23,0.6)]"
                >
                  <div className="absolute inset-0">
                    <img
                      src={product.cover_image_url ?? product.images[0]?.url ?? HERO_FALLBACK_IMAGE}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#041024] via-[#061a35]/65 to-transparent" />
                  <div className="absolute right-4 top-4 z-20">
                    <FavoriteButton productId={product.id} size="sm" />
                  </div>
                  <div className="relative z-10 flex h-full flex-col justify-between p-6">
                    <div className="flex items-start justify-between">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] ${
                          hasPromotion
                            ? "bg-emerald-400 text-[#041024] shadow-md shadow-emerald-400/40"
                            : "bg-[#ffd700] text-[#041024] shadow-md shadow-[#ffd700]/30"
                        }`}
                      >
                        {hasPromotion ? "En promocion" : "Disponible"}
                      </span>
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/70">
                        
                      </span>
                    </div>

                    <div className="mt-auto space-y-2">
                      <h3 className="text-2xl font-semibold leading-tight text-white">{product.name}</h3>
                      <p className="text-sm text-primary/70">{product.short_description}</p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold text-primary">{formatCurrency(finalPrice)}</span>
                        {hasPromotion ? (
                          <span className="text-sm text-white/60 line-through">{formatCurrency(originalPrice)}</span>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
                          onClick={() => handleOpenProduct(product.id)}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:scale-105"
                          onClick={() => handleAddProductToCart(product)}
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
      </section>
    </div>
  );
}
