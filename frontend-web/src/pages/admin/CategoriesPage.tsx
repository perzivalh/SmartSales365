import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  uploadCategoryImage,
} from "../../api/categories";
import type { CategoryPayload } from "../../api/categories";
import type { Category } from "../../types/api";
import { Modal } from "../../components/common/Modal";
import { FormInput } from "../../components/form/FormInput";
import { Textarea } from "../../components/form/Textarea";

const schema = z.object({
  name: z.string().min(1, "Introduce un nombre."),
  description: z.string().optional().or(z.literal("")),
  image_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const primaryButtonClass =
  "h-12 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/40 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70";
const secondaryButtonClass =
  "h-12 rounded-full border border-white/25 px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [hasRemovedImage, setHasRemovedImage] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", image_url: "" },
  });

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError("No se pudieron cargar las categorias.");
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetPreviewState = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImagePreview(null);
    setPendingImageFile(null);
    setHasRemovedImage(false);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    reset({ name: "", description: "", image_url: "" });
    resetPreviewState();
  };

  const openCreateModal = () => {
    setEditing(null);
    reset({ name: "", description: "", image_url: "" });
    resetPreviewState();
    setIsFormOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const payload: CategoryPayload = {
      name: values.name.trim(),
      description: values.description?.trim() ?? "",
    };
    try {
      let finalImageUrl = editing?.image_url ?? "";
      if (pendingImageFile) {
        const uploadResponse = await uploadCategoryImage(pendingImageFile);
        finalImageUrl = uploadResponse.url;
      } else if (hasRemovedImage) {
        finalImageUrl = "";
      }
      payload.image_url = finalImageUrl || null;

      if (editing) {
        await updateCategory(editing.id, payload);
      } else {
        await createCategory(payload);
      }
      await loadCategories();
      closeForm();
    } catch (submitError) {
      console.error(submitError);
      setError("No se pudo guardar la categoria.");
    }
  });

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(`Eliminar la categoria ${category.name}?`);
    if (!confirmed) return;
    try {
      await deleteCategory(category.id);
      await loadCategories();
      if (editing?.id === category.id) {
        closeForm();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar la categoria.");
    }
  };

  const handleEdit = (category: Category) => {
    setEditing(category);
    reset({ name: category.name, description: category.description ?? "", image_url: category.image_url ?? "" });
    setImagePreview(category.image_url ?? null);
    setPendingImageFile(null);
    setHasRemovedImage(false);
    setIsFormOpen(true);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    if (!file) return;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImagePreview(url);
    setPendingImageFile(file);
    setHasRemovedImage(false);
  };

  const handleRemoveImage = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImagePreview(null);
    setPendingImageFile(null);
    setHasRemovedImage(true);
  };

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    [],
  );

  const modalTitle = editing ? "Editar categoria" : "Nueva categoria";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-3 px-[10px] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Categorias</h1>
          <p className="text-sm text-white/60">Organiza tus productos y mejora la experiencia de navegacion.</p>
        </div>
        <button
          type="button"
          className="h-12 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/40 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={openCreateModal}
        >
          Crear categoria
        </button>
      </header>

      {error ? (
        <div className="mx-[10px] rounded-3xl border border-red-500/40 bg-red-500/15 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.28em] text-red-100">
          {error}
        </div>
      ) : null}

      <div className="flex h-[calc(100vh-220px)] flex-col px-[10px]">
        {categories.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
            No hay categorias registradas.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar">
            <table className="w-full min-w-[720px] text-sm text-white/85">
              <thead className="sticky top-0 z-10 bg-[#06152b]/90 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50 backdrop-blur">
                <tr>
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Imagen</th>
                  <th className="px-5 py-3 text-left">Descripcion</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-white/5 last:border-transparent transition hover:bg-white/5">
                    <td className="px-5 py-4 font-semibold text-white">{category.name}</td>
                    <td className="px-5 py-4">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="h-14 w-14 rounded-full border border-white/10 object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/55">
                          sin
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-white/80">{category.description || "Sin descripcion"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                          onClick={() => handleEdit(category)}
                          title="Editar categoria"
                        >
                          <img src="/icons/edit.svg" alt="Editar" width={18} height={18} />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500"
                          onClick={() => handleDelete(category)}
                          title="Eliminar categoria"
                        >
                          <img src="/icons/delete.svg" alt="Eliminar" width={18} height={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={isFormOpen} title={modalTitle} onClose={closeForm}>
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FormInput label="Nombre" {...register("name")} error={errors.name?.message} />
          <Textarea label="Descripcion" rows={4} {...register("description")} error={errors.description?.message} />

          <div className="space-y-3">
            <FormInput label="Imagen" type="url" placeholder="https://..." {...register("image_url")} error={errors.image_url?.message} />
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-primary hover:text-white">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                Subir archivo
              </label>
              {(imagePreview || (editing && editing.image_url && !hasRemovedImage)) && (
                <button
                  type="button"
                  className="rounded-full border border-red-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-400 transition hover:bg-red-500/10"
                  onClick={handleRemoveImage}
                >
                  Quitar imagen
                </button>
              )}
            </div>
            {imagePreview || (editing && editing.image_url && !hasRemovedImage) ? (
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
                <img src={imagePreview ?? editing?.image_url ?? ""} alt="Previsualizacion" className="max-h-52 w-full object-cover" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" className={secondaryButtonClass} onClick={closeForm} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : editing ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
