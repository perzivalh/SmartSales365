import { useCallback, useEffect, useMemo, useState } from "react";

import type { ProductPayload } from "../../api/products";
import { createProduct, deleteProduct, getProducts, updateProduct } from "../../api/products";
import { getCategories } from "../../api/categories";
import type { Category, Product } from "../../types/api";
import { Modal } from "../../components/common/Modal";
import { ProductForm } from "../../components/products/ProductForm";
import type { ProductFormValues } from "../../components/products/ProductForm";
import { ProductTable } from "../../components/products/ProductTable";
import styles from "./ProductsPage.module.css";

type StatusFilter = "all" | "active" | "inactive";

function toFormValues(product: Product): Partial<ProductFormValues> {
  return {
    category: product.category,
    name: product.name,
    sku: product.sku,
    short_description: product.short_description,
    long_description: product.long_description,
    price: Number(product.price),
    stock: product.stock,
    width_cm: Number(product.width_cm),
    height_cm: Number(product.height_cm),
    weight_kg: Number(product.weight_kg),
    is_active: product.is_active,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      position: image.position,
      is_cover: image.is_cover,
      mime_type: image.mime_type ?? undefined,
      size_bytes: image.size_bytes ?? undefined,
    })),
    features: product.features.map((feature) => feature.label),
  };
}
export function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      setCategories(response);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Error al cargar categorias.");
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProducts({
        search: search || undefined,
        category_id: selectedCategory !== "all" ? selectedCategory : undefined,
        is_active:
          statusFilter === "all"
            ? undefined
            : statusFilter === "active"
            ? true
            : statusFilter === "inactive"
            ? false
            : undefined,
        page: 1,
        ordering: "-created_at",
      });
      setProducts(response.results);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Error al cargar productos.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const closeForm = useCallback(() => {
    setEditingProduct(null);
    setIsFormOpen(false);
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleCreate = useCallback(
    async (payload: ProductPayload) => {
      setError(null);
      try {
        await createProduct(payload);
        await fetchProducts();
        closeForm();
      } catch (submitError) {
        console.error(submitError);
        setError("No se pudo crear el producto.");
      }
    },
    [fetchProducts, closeForm],
  );

  const handleUpdate = useCallback(
    async (payload: ProductPayload) => {
      if (!editingProduct) return;
      setError(null);
      try {
        await updateProduct(editingProduct.id, payload);
        await fetchProducts();
        closeForm();
      } catch (submitError) {
        console.error(submitError);
        setError("No se pudo actualizar el producto.");
      }
    },
    [editingProduct, fetchProducts, closeForm],
  );

  const handleSubmit = async (payload: ProductPayload) => {
    if (editingProduct) {
      await handleUpdate(payload);
    } else {
      await handleCreate(payload);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(`¿Eliminar el producto ${product.name}?`);
    if (!confirmed) return;
    setError(null);
    try {
      await deleteProduct(product.id);
      await fetchProducts();
      if (editingProduct?.id === product.id) {
        closeForm();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar el producto.");
    }
  };

  const formTitle = editingProduct ? "Editar producto" : "Nuevo producto";
  const submitLabel = editingProduct ? "Actualizar producto" : "Crear producto";
  const formDescription = editingProduct
    ? "Actualiza la informacion, imagenes y caracteristicas del producto seleccionado."
    : "Registra un nuevo producto completando los campos requeridos.";

  const formDefaults = useMemo(
    () => (editingProduct ? toFormValues(editingProduct) : undefined),
    [editingProduct],
  );

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Productos</h1>
          <p className={styles.subtitle}>Gestiona el catalogo de productos disponibles en tu tienda.</p>
        </div>
        <div className={styles.toolbar}>
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
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
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Cualquier estado</option>
            <option value="active">Publicado</option>
            <option value="inactive">Inactivo</option>
          </select>
          <button className={styles.primaryButton} type="button" onClick={openCreateModal}>
            Crear producto
          </button>
        </div>
      </div>

      {error ? <div className={styles.alert}>{error}</div> : null}

      <div className={styles.tableContainer}>
        <ProductTable products={products} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      <Modal open={isFormOpen} title={formTitle} onClose={closeForm}>
        <p className={styles.modalDescription}>{formDescription}</p>
        <ProductForm
          categories={categories}
          defaultValues={formDefaults}
          submitLabel={submitLabel}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  );
}
