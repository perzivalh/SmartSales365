import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getCategoryById } from "../../api/categories";
import { getProducts } from "../../api/products";
import type { Category, Product } from "../../types/api";
import { formatCurrency } from "../../utils/currency";
import styles from "./CategoryListingPage.module.css";

const IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80";

export function CategoryListingPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

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

  if (!categoryId) {
    return <div className={styles.state}>Selecciona una categoria valida.</div>;
  }

  if (error && !category) {
    return <div className={styles.state}>{error}</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Categoria</span>
          <h1>{category?.name ?? "Categoria"}</h1>
          <p>{category?.description || "Explora los productos destacados de esta categoria."}</p>
          <form className={styles.heroSearch} onSubmit={handleSearch}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar dentro de la categoria"
            />
            <button type="submit">Buscar</button>
            <button type="button" onClick={handleReset} className={styles.heroReset}>
              Limpiar
            </button>
          </form>
        </div>
        <div className={styles.heroImage}>
          <img src={category?.image_url || IMAGE_PLACEHOLDER} alt={category?.name ?? "Categoria"} />
        </div>
      </header>

      {loading ? (
        <div className={styles.state}>Cargando productos...</div>
      ) : error ? (
        <div className={styles.state}>{error}</div>
      ) : products.length === 0 ? (
        <div className={styles.state}>No hay productos dentro de esta categoria por ahora.</div>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <article key={product.id} className={styles.card}>
              <div className={styles.cardMedia}>
                <img src={product.cover_image_url ?? product.images[0]?.url ?? IMAGE_PLACEHOLDER} alt={product.name} />
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>{category?.name}</span>
                <h2>{product.name}</h2>
                <p>{product.short_description}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.cardPrice}>{formatCurrency(product.price)}</span>
                  <button type="button" onClick={() => handleOpenProduct(product.id)}>
                    Ver detalle
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
