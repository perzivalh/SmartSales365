import { useCallback, useEffect, useMemo, useState } from "react";

import { createProduct, deleteProduct, getProducts, updateProduct, type ProductPayload } from "../../api/products";
import { getCategories } from "../../api/categories";
import type { Category, Product } from "../../types/api";
import { Modal } from "../../components/common/Modal";
import { ProductForm, type ProductFormValues } from "../../components/products/ProductForm";
import { formatCurrency } from "../../utils/currency";

type StatusFilter = "all" | "active" | "inactive";

const primaryButtonClass =
  "h-12 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/40 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70";

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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      setCategories(response);
    } catch (fetchError) {
      console.error(fetchError);
      setError("No se pudieron cargar las categorias.");
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProducts({
        search: search.trim() || undefined,
        category_id: selectedCategory !== "all" ? selectedCategory : undefined,
        is_active:
          statusFilter === "all" ? undefined : statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
        ordering: "-created_at",
        page: 1,
        page_size: 50,
      });
      setProducts(response.results);
    } catch (fetchError) {
      console.error(fetchError);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, statusFilter]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingProduct(null);
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async (product: Product) => {
    const confirmation = window.confirm(`Eliminar el producto ${product.name}?`);
    if (!confirmation) return;
    try {
      await deleteProduct(product.id);
      await loadProducts();
      if (editingProduct?.id === product.id) {
        closeForm();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar el producto.");
    }
  };

  const handleCreate = useCallback(
    async (payload: ProductPayload) => {
      try {
        await createProduct(payload);
        await loadProducts();
        closeForm();
      } catch (submitError) {
        console.error(submitError);
        setError("No se pudo crear el producto.");
      }
    },
    [closeForm, loadProducts],
  );

  const handleUpdate = useCallback(
    async (payload: ProductPayload) => {
      if (!editingProduct) return;
      try {
        await updateProduct(editingProduct.id, payload);
        await loadProducts();
        closeForm();
      } catch (submitError) {
        console.error(submitError);
        setError("No se pudo actualizar el producto.");
      }
    },
    [closeForm, editingProduct, loadProducts],
  );

  const handleSubmit = async (payload: ProductPayload) => {
    if (editingProduct) {
      await handleUpdate(payload);
    } else {
      await handleCreate(payload);
    }
  };

  const formDefaults = useMemo(
    () => (editingProduct ? toFormValues(editingProduct) : undefined),
    [editingProduct],
  );

  const modalTitle = editingProduct ? "Editar producto" : "Crear producto";
  const modalDescription = editingProduct
    ? "Modifica la informacion, imagenes y caracteristicas del producto seleccionado."
    : "Registra un nuevo producto completando la informacion requerida. Al publicarlo se mostrara en la tienda.";
  const modalSubmitLabel = editingProduct ? "Actualizar producto" : "Guardar producto";
  const hasProducts = products.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-3 px-[10px] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Productos</h1>
          <p className="text-sm text-white/60">Administra tu catalogo, controla el stock y publica nuevas referencias.</p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={openCreateModal}>
          Nuevo producto
        </button>
      </header>

      {error ? (
        <div className="mx-[10px] rounded-3xl border border-red-500/40 bg-red-500/15 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.28em] text-red-100">
          {error}
        </div>
      ) : null}

      <div className="flex h-[calc(100vh-220px)] flex-col gap-4 px-[10px]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_auto]">
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.473 6.473 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.02 14 5 11.98 5 9.5S7.02 5 9.5 5 14 7.02 14 9.5 11.98 14 9.5 14z"
              />
            </svg>
            <input
              className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-white/50"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
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
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Publicado</option>
            <option value="inactive">Inactivo</option>
          </select>
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
              onClick={() => void loadProducts()}
              aria-label="Actualizar productos"
            >
              <img src="/icons/refresh.svg" alt="Actualizar productos" width={18} height={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/65">
            Cargando productos...
          </div>
        ) : !hasProducts ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            No hay productos registrados.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar">
            <table className="w-full min-w-[900px] text-sm text-white/85">
              <thead className="sticky top-0 z-10 bg-[#06152b]/90 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50 backdrop-blur">
                <tr>
                  <th className="px-5 py-3 text-left">Producto</th>
                  <th className="px-5 py-3 text-left">Categoria</th>
                  <th className="px-5 py-3 text-left">Precio</th>
                  <th className="px-5 py-3 text-left">Promoción</th>
                  <th className="px-5 py-3 text-left">Stock</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const activePromotion = product.active_promotion;
                  const finalPrice = Number(product.final_price ?? product.price);
                  const originalPrice = Number(product.price);
                  const hasPromotion = Boolean(activePromotion) && finalPrice < originalPrice;
                  return (
                  <tr key={product.id} className="border-b border-white/5 last:border-transparent transition hover:bg-white/5">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {product.cover_image_url ? (
                          <img
                            src={product.cover_image_url}
                            alt={product.name}
                            className="h-14 w-14 rounded-2xl border border-white/10 object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/55">
                            SIN
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white">{product.name}</p>
                          <p className="text-xs uppercase tracking-[0.3em] text-white/60">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-white/75">{product.category_name}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{formatCurrency(finalPrice)}</span>
                        {hasPromotion ? (
                          <span className="text-xs text-white/60 line-through">{formatCurrency(originalPrice)}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-white/70">
                      {hasPromotion ? (
                        <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                          {activePromotion?.name ?? "Activa"}
                        </span>
                      ) : (
                        <span className="text-xs uppercase tracking-[0.3em] text-white/40">Sin promoción</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-white/75">{product.stock}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${
                          product.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {product.is_active ? "Publicado" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                          onClick={() => handleEdit(product)}
                          title="Editar producto"
                        >
                          <img src="/icons/edit.svg" alt="Editar" width={18} height={18} />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500"
                          onClick={() => handleDelete(product)}
                          title="Eliminar producto"
                        >
                          <img src="/icons/delete.svg" alt="Eliminar" width={18} height={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={isFormOpen} title={modalTitle} onClose={closeForm}>
        <div className="space-y-6">
          <p className="text-sm text-slate-500">{modalDescription}</p>
          <ProductForm
            categories={categories}
            defaultValues={formDefaults}
            submitLabel={modalSubmitLabel}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </div>
      </Modal>
    </div>
  );
}
