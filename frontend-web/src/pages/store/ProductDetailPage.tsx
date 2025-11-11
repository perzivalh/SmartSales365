import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";

import { useCart } from "../../hooks/useCart";
import { resolvePromotionPricing } from "../../utils/promotions";
import { FavoriteButton } from "../../components/products/FavoriteButton";
import { getProductById } from "../../api/products";
import type { Product } from "../../types/api";
import { formatCurrency } from "../../utils/currency";

const IMAGE_PLACEHOLDER = "https://via.placeholder.com/600x600?text=SmartSales365";

type DetailTab = "description" | "specifications";

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<DetailTab>("description");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!productId) {
      setError("Producto no encontrado.");
      setLoading(false);
      return;
    }
    const id = productId as string;
    let isMounted = true;

    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        const response = await getProductById(id);
        if (isMounted) {
          setProduct(response);
          setSelectedImageIndex(0);
        }
      } catch (requestError) {
        console.error(requestError);
        if (isMounted) {
          setError("No se pudo cargar los datos del producto.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProduct();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const images = useMemo(() => {
    if (!product) return [];
    return product.images.length > 0
      ? product.images
      : [
          {
            id: "placeholder",
            url: IMAGE_PLACEHOLDER,
            position: 0,
            is_cover: true,
            mime_type: "image/png",
            size_bytes: null,
          },
        ];
  }, [product]);

  const selectedImage = images[selectedImageIndex] ?? images[0];

  const specificationItems = useMemo(
    () => [
      { label: "SKU", value: product?.sku ?? "Sin especificar" },
      { label: "Ancho", value: `${product?.width_cm ?? 0} cm` },
      { label: "Alto", value: `${product?.height_cm ?? 0} cm` },
      { label: "Peso", value: `${product?.weight_kg ?? 0} kg` },
      { label: "Stock", value: product?.stock ?? 0 },
      { label: "Estado", value: product?.is_active ? "Disponible" : "Inactivo" },
    ],
    [product],
  );

  const increaseQuantity = () => setQuantity((prev) => Math.min(product?.stock ?? 99, prev + 1));
  const decreaseQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  useEffect(() => {
    setQuantity(1);
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    const pricing = resolvePromotionPricing(product);
    addItem(
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: pricing.finalPrice,
        originalPrice: pricing.originalPrice,
        promotionLabel: pricing.label,
        imageUrl: product.cover_image_url ?? product.images[0]?.url ?? IMAGE_PLACEHOLDER,
        stock: product.stock,
      },
      quantity,
    );
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center font-semibold text-primary">
        Cargando producto...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="rounded-3xl border border-primary/35 bg-[rgba(7,26,52,0.85)] px-6 py-12 text-center text-slate-200">
        {error ?? "No se encontro el producto solicitado."}
      </div>
    );
  }

  const pricing = resolvePromotionPricing(product);
  const finalPriceValue = pricing.finalPrice;
  const originalPriceValue = pricing.originalPrice;
  const hasPromotion = pricing.hasPromotion;
  const activePromotion = product.active_promotion;

  return (
    <div className="space-y-12">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
        <Link to="/" className="hover:text-white">
          Inicio
        </Link>
        <span>/</span>
        <Link to={`/categories/${product.category}`} className="hover:text-white">
          {product.category_name}
        </Link>
        <span>/</span>
        <span className="text-white">{product.name}</span>
      </nav>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-7 xl:grid-cols-2 lg:gap-16">
        <div className="lg:col-span-3 xl:col-span-1">
          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#081a32] shadow-[0_45px_90px_rgba(3,10,23,0.55)] aspect-[4/3]">
              <img
                src={selectedImage?.url ?? IMAGE_PLACEHOLDER}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <button
                    key={image.id ?? index}
                    type="button"
                    className={clsx(
                      "overflow-hidden rounded-2xl border-2 transition",
                      index === selectedImageIndex
                        ? "border-primary ring-2 ring-primary/60 ring-offset-2 ring-offset-[#061327]"
                        : "border-transparent opacity-70 hover:opacity-100",
                    )}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`Vista ${index + 1}`}
                  >
                    <img src={image.url} alt={`Vista ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="lg:col-span-4 xl:col-span-1 space-y-8">
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">{product.category_name}</span>
            <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold text-primary">{formatCurrency(finalPriceValue)}</span>
                {hasPromotion ? (
                  <span className="text-xl font-medium text-slate-500 line-through">
                    {formatCurrency(originalPriceValue)}
                  </span>
                ) : null}
              </div>
              <FavoriteButton productId={product.id} />
            </div>
            {hasPromotion && activePromotion ? (
              <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                <p className="font-semibold uppercase tracking-[0.32em]">Promocion activa</p>
                <p className="text-primary/90">
                  {activePromotion.name} · {activePromotion.discount_type === "PERCENT" ? `${activePromotion.discount_value}%` : `-${formatCurrency(Number(activePromotion.discount_value))}`}
                </p>
                {activePromotion.end_date ? (
                  <p className="text-xs text-primary/70">Vigente hasta {new Date(activePromotion.end_date).toLocaleDateString()}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Caracteristicas clave</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {(product.features.length > 0 ? product.features : [{ id: "placeholder", label: "Informacion en proceso de actualización." }])
                .slice(0, 4)
                .map((feature) => (
                  <li key={feature.id ?? feature.label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M9.55 17.6L4.4 12.45l1.41-1.41l3.74 3.74l8.59-8.59l1.42 1.41z"
                        />
                      </svg>
                    </span>
                    <span>{feature.label}</span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="space-y-4 rounded-[24px] border border-white/15 bg-[#0b1d38]/70 p-6 shadow-[0_35px_70px_rgba(3,10,23,0.45)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center overflow-hidden rounded-xl border border-white/15">
                <button
                  type="button"
                  className="px-4 py-3 text-white/70 transition hover:text-primary"
                  onClick={decreaseQuantity}
                  aria-label="Disminuir cantidad"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M5 11h14v2H5z" />
                  </svg>
                </button>
                <span className="px-6 text-lg font-semibold text-white">{quantity}</span>
                <button
                  type="button"
                  className="px-4 py-3 text-white/70 transition hover:text-primary"
                  onClick={increaseQuantity}
                  aria-label="Incrementar cantidad"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-sky-500" onClick={handleAddToCart}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2s-.9-2-2-2m0 2zm12 0c0-1.1-.9-2-2-2s-2 .9-2 2s.9 2 2 2s2-.9 2-2m2-16H5.21l-.2-1.01C4.93 2.42 4.52 2 4 2H2v2h1l3.6 7.59l-1.35 2.44C4.52 14.37 5.48 16 7 16h12v-2H7l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48c0-.55-.45-1-1-1Z"
                  />
                </svg>
                      Anadir al carrito
              </button>
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary px-6 py-3 text-base font-semibold text-primary transition hover:bg-primary/10" onClick={handleBuyNow}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 21c-4.41 0-8-3.59-8-8c0-3.06 1.72-5.73 4.24-7.03l1.42 1.42C7.42 8.15 6 10.4 6 13c0 3.31 2.69 6 6 6s6-2.69 6-6c0-2.2-1.2-4.11-2.97-5.15L14 9V3h6l-2.1 2.1C19.65 6.06 21 8.37 21 11c0 4.41-3.59 8-8 8Z"
                />
              </svg>
              Comprar ahora
            </button>
          </div>
        </aside>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#071a36]/60 shadow-[0_35px_70px_rgba(3,10,23,0.45)] backdrop-blur">
        <div className="border-b border-white/10">
          <nav className="-mb-px flex space-x-6 px-6">
            <button
              type="button"
              className={clsx(
                "py-4 text-lg font-semibold transition",
                activeTab === "description"
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-slate-400 hover:text-white",
              )}
              onClick={() => setActiveTab("description")}
            >
              Descripción
            </button>
            <button
              type="button"
              className={clsx(
                "py-4 text-lg font-semibold transition",
                activeTab === "specifications"
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-slate-400 hover:text-white",
              )}
              onClick={() => setActiveTab("specifications")}
            >
              Especificaciones
            </button>
          </nav>
        </div>

        <div className="px-6 py-8 text-base leading-relaxed text-slate-200 md:px-10">
          {activeTab === "description" ? (
            <div className="space-y-4">
              <p>
                {product.long_description ||
                  "Estamos preparando una descripción detallada de este producto para ti. Vuelve pronto para conocer todas sus características."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {specificationItems.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{item.label}</p>
                  <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
