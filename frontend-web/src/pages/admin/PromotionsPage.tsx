import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { getPromotions, createPromotion, updatePromotion, deletePromotion } from "../../api/promotions";
import type { PromotionPayload } from "../../api/promotions";
import type { Promotion } from "../../types/api";
import { getCategories } from "../../api/categories";
import { getProducts } from "../../api/products";
import type { Category, Product } from "../../types/api";
import { FormInput } from "../../components/form/FormInput";
import { Textarea } from "../../components/form/Textarea";
import { Modal } from "../../components/common/Modal";
import { formatCurrency } from "../../utils/currency";

const promotionSchema = z.object({
  name: z.string().min(1, "Introduce un nombre"),
  description: z.string().optional(),
  discount_type: z.enum(["PERCENT", "AMOUNT"]),
  discount_value: z.coerce.number().positive("El descuento debe ser mayor a 0"),
  scope: z.enum(["GLOBAL", "CATEGORY", "PRODUCT"]),
  categories: z.array(z.string()).optional(),
  products: z.array(z.string()).optional(),
  start_date: z.string().min(1, "Selecciona una fecha de inicio"),
  end_date: z.string().optional(),
  is_active: z.boolean(),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoString(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return date.toISOString();
}

function nowInputValue(): string {
  return toLocalInput(new Date().toISOString());
}

type SelectionItem = {
  id: string;
  label: string;
  helper?: string;
};

type SelectionListProps = {
  label: string;
  items: SelectionItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

function SelectionList({ label, items, selected, onChange, placeholder }: SelectionListProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(term) || (item.helper ? item.helper.toLowerCase().includes(term) : false),
    );
  }, [items, search]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((value) => value !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const toggleAll = () => {
    const filteredIds = filtered.map((item) => item.id);
    const allSelected = filteredIds.every((id) => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter((id) => !filteredIds.includes(id)));
    } else {
      const merged = new Set([...selected, ...filteredIds]);
      onChange(Array.from(merged));
    }
  };

  return (
    <div className="space-y-2 rounded-3xl border border-white/15 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white">{label}</span>
        <button
          type="button"
          className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white hover:text-white"
          onClick={toggleAll}
        >
          {filtered.every((item) => selected.includes(item.id)) && filtered.length > 0 ? "Quitar filtrados" : "Seleccionar filtrados"}
        </button>
      </div>
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder ?? "Buscar..."}
        className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <div className="max-h-52 space-y-2 overflow-y-auto pr-1 thin-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-xs text-white/60">No hay coincidencias.</div>
        ) : (
          filtered.map((item) => (
            <label key={item.id} className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10">
              <div>
                <span className="font-semibold text-white">{item.label}</span>
                {item.helper ? <p className="text-xs text-white/60">{item.helper}</p> : null}
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-white/5 text-primary focus:ring-primary"
                checked={selected.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [detailPromotion, setDetailPromotion] = useState<Promotion | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: "",
      description: "",
      discount_type: "PERCENT",
      discount_value: 10,
      scope: "GLOBAL",
      categories: [],
      products: [],
      start_date: nowInputValue(),
      end_date: "",
      is_active: true,
    },
  });

  const currentScope = watch("scope");
  const categoriesSelection = watch("categories") ?? [];
  const productsSelection = watch("products") ?? [];
  const categoryOptions = useMemo<SelectionItem[]>(() => categories.map((category) => ({ id: category.id, label: category.name })), [categories]);
  const productOptions = useMemo<SelectionItem[]>(() => products.map((product) => ({ id: product.id, label: product.name, helper: product.sku })), [products]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [promotionsResponse, categoriesResponse, productsResponse] = await Promise.all([
          getPromotions({ page_size: 100, ordering: "-created_at" }),
          getCategories(),
          getProducts({ is_active: true, page_size: 100 }),
        ]);
        setPromotions(promotionsResponse.results);
        setCategories(categoriesResponse);
        setProducts(productsResponse.results);
      } catch (fetchError) {
        console.error(fetchError);
        setError("No se pudieron cargar las promociones.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const promotionRows = useMemo(() => promotions, [promotions]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    reset({
      name: "",
      description: "",
      discount_type: "PERCENT",
      discount_value: 10,
      scope: "GLOBAL",
      categories: [],
      products: [],
      start_date: nowInputValue(),
      end_date: "",
      is_active: true,
    });
  };

  const openCreateModal = () => {
    setEditing(null);
    reset({
      name: "",
      description: "",
      discount_type: "PERCENT",
      discount_value: 10,
      scope: "GLOBAL",
      categories: [],
      products: [],
      start_date: nowInputValue(),
      end_date: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (promotion: Promotion) => {
    setEditing(promotion);
    reset({
      name: promotion.name,
      description: promotion.description ?? "",
      discount_type: promotion.discount_type,
      discount_value: Number(promotion.discount_value),
      scope: promotion.scope,
      categories: promotion.categories,
      products: promotion.products,
      start_date: toLocalInput(promotion.start_date),
      end_date: toLocalInput(promotion.end_date),
      is_active: promotion.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (promotion: Promotion) => {
    const confirmed = window.confirm(`Eliminar la promoción ${promotion.name}?`);
    if (!confirmed) return;
    try {
      await deletePromotion(promotion.id);
      setPromotions((previous) => previous.filter((item) => item.id !== promotion.id));
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar la promoción.");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload: PromotionPayload = {
      name: values.name.trim(),
      description: values.description?.trim() ?? "",
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      scope: values.scope,
      categories: values.scope === "CATEGORY" ? values.categories ?? [] : [],
      products: values.scope === "PRODUCT" ? values.products ?? [] : [],
      start_date: new Date(values.start_date).toISOString(),
      end_date: values.end_date ? toIsoString(values.end_date) : null,
      is_active: values.is_active,
    };

    try {
      if (editing) {
        const updated = await updatePromotion(editing.id, payload);
        setPromotions((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createPromotion(payload);
        setPromotions((previous) => [created, ...previous]);
      }
      closeModal();
    } catch (submitError) {
      console.error(submitError);
      setError("No se pudo guardar la promoción.");
    }
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-3 px-[10px] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Promociones</h1>
          <p className="text-sm text-white/60">Crea descuentos por temporada y controla su vigencia.</p>
        </div>
        <button
          type="button"
          className="h-12 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/40 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={openCreateModal}
        >
          Nueva promoción
        </button>
      </header>

      {error ? (
        <div className="mx-[10px] rounded-3xl border border-red-500/40 bg-red-500/15 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.28em] text-red-100">
          {error}
        </div>
      ) : null}

      <div className="flex h-[calc(100vh-220px)] flex-col px-[10px]">
        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/65">
            Cargando promociones...
          </div>
        ) : promotionRows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            No hay promociones registradas.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar">
            <table className="w-full min-w-[880px] text-sm text-white/85">
              <thead className="sticky top-0 z-10 bg-[#06152b]/90 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50 backdrop-blur">
                <tr>
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left">Descuento</th>
                  <th className="px-5 py-3 text-left">Alcance</th>
                  <th className="px-5 py-3 text-left">Vigencia</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {promotionRows.map((promotion) => {
                  const isPercent = promotion.discount_type === "PERCENT";
                  const discountLabel = isPercent
                    ? `${promotion.discount_value}%`
                    : formatCurrency(Number(promotion.discount_value));
                  return (
                    <tr key={promotion.id} className="border-b border-white/5 last:border-transparent transition hover:bg-white/5">
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-white">{promotion.name}</div>
                          <div className="text-xs text-white/55">
                            {promotion.description ? promotion.description.slice(0, 80) : "Sin descripción"}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-white/75">{isPercent ? "Porcentaje" : "Monto fijo"}</td>
                      <td className="px-5 py-4 text-white font-semibold">{discountLabel}</td>
                      <td className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                        {promotion.scope === "GLOBAL"
                          ? "GLOBAL"
                          : promotion.scope === "CATEGORY"
                            ? `Categorías (${promotion.categories.length})`
                            : `Productos (${promotion.products.length})`}
                      </td>
                      <td className="px-5 py-4 text-white/70">
                        {new Date(promotion.start_date).toLocaleDateString()}{" "}
                        {promotion.end_date ? `→ ${new Date(promotion.end_date).toLocaleDateString()}` : "→ Indefinida"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${
                            promotion.is_active ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-200"
                          }`}
                        >
                          {promotion.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white shadow-lg shadow-white/10 transition hover:bg-white/10"
                            onClick={() => setDetailPromotion(promotion)}
                            title="Ver detalle"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                fill="currentColor"
                                d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7s11-7 11-7s-3.367-7-11-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9Z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                            onClick={() => openEditModal(promotion)}
                            title="Editar promoción"
                          >
                            <img src="/icons/edit.svg" alt="Editar" width={18} height={18} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500"
                            onClick={() => handleDelete(promotion)}
                            title="Eliminar promoción"
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

      <Modal open={isModalOpen} title={editing ? "Editar promoción" : "Nueva promoción"} onClose={closeModal}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FormInput label="Nombre" {...register("name")} error={errors.name?.message} />
          <Textarea label="Descripción" rows={3} {...register("description")} error={errors.description?.message} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-white/80">
              <span className="font-semibold">Tipo de descuento</span>
              <select
                className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white outline-none"
                {...register("discount_type")}
              >
                <option value="PERCENT">Porcentaje</option>
                <option value="AMOUNT">Monto fijo</option>
              </select>
            </label>
            <FormInput
              label={watch("discount_type") === "PERCENT" ? "Valor (%)" : "Valor (monto)"}
              type="number"
              step="0.01"
              {...register("discount_value")}
              error={errors.discount_value?.message}
            />
          </div>

          <label className="flex flex-col gap-2 text-sm text-white/80">
            <span className="font-semibold">Alcance</span>
            <select
              className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white outline-none"
              {...register("scope")}
            >
              <option value="GLOBAL">Global</option>
              <option value="CATEGORY">Categorías específicas</option>
              <option value="PRODUCT">Productos específicos</option>
            </select>
          </label>

          {currentScope === "CATEGORY" ? (
            <div>
              <SelectionList
                label="Categorías"
                items={categoryOptions}
                selected={categoriesSelection}
                onChange={(next) => setValue("categories", next, { shouldDirty: true })}
                placeholder="Buscar categoría..."
              />
              {errors.categories ? (
                <span className="text-xs font-semibold text-red-400">{errors.categories.message}</span>
              ) : null}
            </div>
          ) : null}

          {currentScope === "PRODUCT" ? (
            <div>
              <SelectionList
                label="Productos"
                items={productOptions}
                selected={productsSelection}
                onChange={(next) => setValue("products", next, { shouldDirty: true })}
                placeholder="Buscar por nombre o SKU..."
              />
              {errors.products ? (
                <span className="text-xs font-semibold text-red-400">{errors.products.message}</span>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-white/80">
              <span className="font-semibold">Inicio</span>
              <input
                type="datetime-local"
                className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white outline-none"
                {...register("start_date")}
              />
              {errors.start_date ? (
                <span className="text-xs font-semibold text-red-400">{errors.start_date.message}</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm text-white/80">
              <span className="font-semibold">Fin (opcional)</span>
              <input
                type="datetime-local"
                className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white outline-none"
                {...register("end_date")}
              />
              {errors.end_date ? (
                <span className="text-xs font-semibold text-red-400">{errors.end_date.message}</span>
              ) : null}
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm text-white/80">
            <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary" {...register("is_active")} />
            Promoción activa
          </label>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="h-12 rounded-full border border-white/25 px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-12 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/40 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : editing ? "Actualizar promoción" : "Crear promoción"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(detailPromotion)} title={detailPromotion?.name ?? ""} onClose={() => setDetailPromotion(null)}>
        {detailPromotion ? (
          <div className="space-y-4 text-white/80">
            <p className="text-sm text-white/70">{detailPromotion.description || "Sin descripción"}</p>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Tipo</p>
                <p className="font-semibold text-white">
                  {detailPromotion.discount_type === "PERCENT" ? "Porcentaje" : "Monto fijo"} ·{" "}
                  {detailPromotion.discount_type === "PERCENT"
                    ? `${detailPromotion.discount_value}%`
                    : formatCurrency(Number(detailPromotion.discount_value))}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Alcance</p>
                <p className="font-semibold text-white">
                  {detailPromotion.scope === "GLOBAL"
                    ? "Global"
                    : detailPromotion.scope === "CATEGORY"
                      ? `Categorías (${detailPromotion.category_names.length})`
                      : `Productos (${detailPromotion.product_names.length})`}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Vigencia</p>
                <p>
                  {new Date(detailPromotion.start_date).toLocaleString()}{" "}
                  {detailPromotion.end_date ? `→ ${new Date(detailPromotion.end_date).toLocaleString()}` : "→ sin fecha fin"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Estado</p>
                <p className="font-semibold text-white">{detailPromotion.is_active ? "Activa" : "Inactiva"}</p>
              </div>
            </div>
            {detailPromotion.scope === "CATEGORY" ? (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Categorías incluidas</p>
                <ul className="mt-2 space-y-1 text-sm text-white">
                  {detailPromotion.category_names.map((name) => (
                    <li key={name} className="rounded-full border border-white/15 px-3 py-1">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {detailPromotion.scope === "PRODUCT" ? (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Productos incluidos</p>
                <ul className="mt-2 space-y-1 text-sm text-white">
                  {detailPromotion.product_names.map((name) => (
                    <li key={name} className="rounded-full border border-white/15 px-3 py-1">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
