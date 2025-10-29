import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { getCategories } from "../../api/categories";
import { getProducts } from "../../api/products";
import { useAuth } from "../../hooks/useAuth";
import type { Category, Product } from "../../types/api";
import { formatCurrency } from "../../utils/currency";
import styles from "./HomePage.module.css";

const HERO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80";

const PROMO_CARDS = [
  {
    id: "returns",
    title: "Devoluciones en 30 dias",
    description: "Compra con tranquilidad. Si algo no es perfecto, lo solucionamos sin complicaciones.",
    action: "Ver politicas",
  },
  {
    id: "financing",
    title: "Financiacion sin stress",
    description: "Lleva tus productos hoy y paga en cuotas flexibles, aprobacion rapida y sin letra pequeña.",
    action: "Ver opciones",
  },
  {
    id: "support",
    title: "Soporte especializado",
    description: "Nuestro equipo te acompana antes, durante y despues de la compra para que nada falle.",
    action: "Contactar ahora",
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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

  const heroSlides = useMemo(() => {
    if (heroProducts.length > 0) return heroProducts;
    return products.slice(0, 5);
  }, [heroProducts, products]);

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

  const featuredCategories = useMemo(
    () => categories.slice(0, 7),
    [categories],
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleResetFilters() {
    setSearchInput("");
    setSearch("");
    setSelectedCategory("all");
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

  const handleNextSlide = () => {
    if (heroSlides.length === 0) return;
    setActiveSlide((previous) => (previous + 1) % heroSlides.length);
  };

  const handlePrevSlide = () => {
    if (heroSlides.length === 0) return;
    setActiveSlide((previous) => (previous - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleScrollToCatalog = () => {
    const element = document.getElementById("catalogo");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} id="sobre">
        <div className={styles.heroViewport}>
          {heroSlides.length === 0 ? (
            <article className={`${styles.heroSlide} ${styles.heroSlideActive}`}>
              <div className={styles.heroContent}>
                <span className={styles.heroBadge}>Experiencias inteligentes</span>
                <h1>Productos listos para enamorar a tus clientes.</h1>
                <p>
                  Actualiza tu catalogo con imagenes de impacto, fichas completas y una experiencia pensada para convertir visitas en ventas.
                </p>
                <div className={styles.heroActions}>
                  <button type="button" className={`${styles.heroButton} ${styles.heroButtonPrimary}`} onClick={handleScrollToCatalog}>
                    Ver catalogo
                  </button>
                  <button type="button" className={`${styles.heroButton} ${styles.heroButtonSecondary}`} onClick={handlePrimaryAction}>
                    {isAuthenticated ? "Gestionar catalogo" : "Iniciar sesion"}
                  </button>
                </div>
              </div>
              <div className={styles.heroMedia}>
                <img src={HERO_FALLBACK_IMAGE} alt="Destacado SmartSales365" />
              </div>
            </article>
          ) : (
            heroSlides.map((product, index) => {
              const mainImage =
                product.cover_image_url || product.images.find((image) => image.is_cover)?.url || product.images[0]?.url || HERO_FALLBACK_IMAGE;
              return (
                <article
                  key={product.id}
                  className={`${styles.heroSlide} ${index === activeSlide ? styles.heroSlideActive : ""}`}
                >
                  <div className={styles.heroContent}>
                    <span className={styles.heroBadge}>Nueva llegada</span>
                    <h1>{product.name}</h1>
                    <p>{product.short_description || "Explora nuestras ultimas novedades para sorprender a tus clientes."}</p>
                    <div className={styles.heroActions}>
                      <button
                        type="button"
                        className={`${styles.heroButton} ${styles.heroButtonPrimary}`}
                        onClick={() => handleOpenProduct(product.id)}
                      >
                        Ver producto
                      </button>
                      <button
                        type="button"
                        className={`${styles.heroButton} ${styles.heroButtonSecondary}`}
                        onClick={handleScrollToCatalog}
                      >
                        Ver catalogo
                      </button>
                    </div>
                  </div>
                  <div className={styles.heroMedia}>
                    <img src={mainImage} alt={product.name} />
                  </div>
                </article>
              );
            })
          )}
        </div>

        {heroSlides.length > 1 ? (
          <div className={styles.heroControls}>
            <button type="button" onClick={handlePrevSlide} aria-label="Anterior" className={styles.heroControlButton}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M14.71 6.71L13.29 5.29L6.59 12L13.29 18.71L14.71 17.29L10.41 13H18V11H10.41L14.71 6.71Z" />
              </svg>
            </button>
            <div className={styles.heroDots}>
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`${styles.heroDot} ${index === activeSlide ? styles.heroDotActive : ""}`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Ver destacado ${index + 1}`}
                />
              ))}
            </div>
            <button type="button" onClick={handleNextSlide} aria-label="Siguiente" className={styles.heroControlButton}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M9.29 17.29L10.71 18.71L17.41 12L10.71 5.29L9.29 6.71L13.59 11H6V13H13.59L9.29 17.29Z" />
              </svg>
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.categoriesSection} id="categorias">
        <div className={styles.sectionHeader}>
          <div>
            <h2>Nuestras colecciones</h2>
            <p>Organiza tu vista rapidamente entrando en cada categoria.</p>
          </div>
        </div>
        <div className={styles.categoryRow}>
          {featuredCategories.length === 0 ? (
            <div className={styles.categoryEmpty}>Aun no hay categorias registradas.</div>
          ) : (
            featuredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={styles.categoryCard}
                onClick={() => handleNavigateCategory(category.id)}
              >
                <img
                  src={category.image_url || HERO_FALLBACK_IMAGE}
                  alt={category.name}
                  className={styles.categoryImage}
                />
                <div className={styles.categoryOverlay} />
                <span className={styles.categoryName}>{category.name}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className={styles.promotions} id="promociones">
        <div className={styles.sectionHeader}>
          <div>
            <h2>No te lo pierdas</h2>
            <p>Beneficios listos para darle confianza a tus clientes.</p>
          </div>
        </div>
        <div className={styles.promoGrid}>
          {PROMO_CARDS.map((promo) => (
            <article key={promo.id} className={styles.promoCard}>
              <h3>{promo.title}</h3>
              <p>{promo.description}</p>
              <button type="button" className={styles.promoButton}>
                {promo.action}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.catalog} id="catalogo">
        <div className={styles.sectionHeader}>
          <div>
            <h2>Explora todo el catalogo</h2>
            <p>Busca por nombre, SKU o filtra por categoria.</p>
          </div>
          <button type="button" className={styles.sectionButton} onClick={handlePrimaryAction}>
            {isAuthenticated ? "Gestionar catalogo" : "Iniciar sesion"}
          </button>
        </div>

        <form className={styles.searchRow} onSubmit={handleSearch}>
          <div className={styles.searchField}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.473 6.473 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.02 14 5 11.98 5 9.5S7.02 5 9.5 5 14 7.02 14 9.5 11.98 14 9.5 14z"
              />
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Buscar productos por nombre o SKU"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="all">Todas las categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.actionButton}>
            Buscar
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleResetFilters}>
            Limpiar
          </button>
        </form>

        {loading ? (
          <div className={styles.loading}>Cargando catalogo...</div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : products.length === 0 ? (
          <div className={styles.emptyState}>No encontramos productos para los filtros seleccionados.</div>
        ) : (
          <div className={styles.productGrid}>
            {products.map((product) => (
              <article key={product.id} className={styles.productCard}>
                <div className={styles.productImageWrapper}>
                  <img
                    className={styles.productImage}
                    src={product.cover_image_url ?? product.images[0]?.url ?? HERO_FALLBACK_IMAGE}
                    alt={product.name}
                  />
                </div>
                <div className={styles.productBody}>
                  <span className={styles.productCategory}>{product.category_name}</span>
                  <h3 className={styles.productTitle}>{product.name}</h3>
                  <p className={styles.productDescription}>{product.short_description}</p>
                  <div className={styles.productFooter}>
                    <span className={styles.price}>{formatCurrency(product.price)}</span>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => handleOpenProduct(product.id)}
                    >
                      Ver producto
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

