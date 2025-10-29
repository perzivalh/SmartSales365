import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getProductById } from "../../api/products";
import type { Product } from "../../types/api";
import { formatCurrency } from "../../utils/currency";
import styles from "./ProductDetailPage.module.css";

const IMAGE_PLACEHOLDER = "https://via.placeholder.com/600x600?text=SmartSales365";

type DetailTab = "description" | "specifications";

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<DetailTab>("description");

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

  if (loading) {
    return <div className={styles.state}>Cargando producto...</div>;
  }

  if (error || !product) {
    return <div className={styles.state}>{error ?? "No se encontro el producto solicitado."}</div>;
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link to="/">Inicio</Link>
        <span>/</span>
        <Link to={`/categories/${product.category}`}>{product.category_name}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <section className={styles.overview}>
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            <img src={selectedImage?.url ?? IMAGE_PLACEHOLDER} alt={product.name} />
          </div>
          {images.length > 1 ? (
            <div className={styles.thumbnails}>
              {images.map((image, index) => (
                <button
                  key={image.id ?? index}
                  type="button"
                  className={`${styles.thumbnail} ${index === selectedImageIndex ? styles.thumbnailActive : ""}`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img src={image.url} alt={`Vista ${index + 1}`} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className={styles.summary}>
          <span className={styles.summaryCategory}>{product.category_name}</span>
          <h1 className={styles.summaryTitle}>{product.name}</h1>

          <div className={styles.priceBlock}>
            <span className={styles.price}>{formatCurrency(product.price)}</span>
            <span className={`${styles.stockBadge} ${product.is_active ? styles.stockAvailable : styles.stockUnavailable}`}>
              {product.is_active ? "En stock" : "No disponible"}
            </span>
          </div>

          <p className={styles.summaryDescription}>{product.short_description}</p>

          <div className={styles.summaryActions}>
            <button type="button" className={`${styles.ctaButton} ${styles.ctaPrimary}`}>
              Anadir al carrito
            </button>
            <button type="button" className={`${styles.ctaButton} ${styles.ctaSecondary}`}>
              Comprar ahora
            </button>
          </div>

          {product.features.length > 0 ? (
            <div className={styles.featureHighlight}>
              <h2>Caracteristicas clave</h2>
              <ul className={styles.featureList}>
                {product.features.map((feature) => (
                  <li key={feature.id ?? feature.label}>{feature.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </section>

      <section className={styles.details}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "description" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("description")}
          >
            Descripcion
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "specifications" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("specifications")}
          >
            Especificaciones
          </button>
        </div>

        <div className={styles.tabPanel}>
          {activeTab === "description" ? (
            <p>{product.long_description || "Este producto aun no tiene una descripcion detallada."}</p>
          ) : (
            <div className={styles.specGrid}>
              {specificationItems.map((item) => (
                <div key={item.label} className={styles.specItem}>
                  <span className={styles.specLabel}>{item.label}</span>
                  <span className={styles.specValue}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

