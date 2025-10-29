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
import styles from "./CrudPage.module.css";

const schema = z.object({
  name: z.string().min(1, "Introduce un nombre."),
  description: z.string().optional().or(z.literal("")),
  image_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
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

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError("No se pudieron cargar las categorias.");
    }
  }

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

  async function handleDelete(category: Category) {
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
  }

  function handleEdit(category: Category) {
    setEditing(category);
    reset({
      name: category.name,
      description: category.description,
      image_url: category.image_url ?? "",
    });
    resetPreviewState();
    setImagePreview(category.image_url || null);
    setPendingImageFile(null);
    setHasRemovedImage(!category.image_url);
    setIsFormOpen(true);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setImagePreview(previewUrl);
    setPendingImageFile(file);
    setHasRemovedImage(false);
  }

  function handleRemoveImage() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImagePreview(null);
    setPendingImageFile(null);
    setHasRemovedImage(true);
  }

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
    <div>
      <div className={styles.headerRow}>
        <div className={styles.header}>
          <h1 className={styles.title}>Categorias</h1>
          <p className={styles.subtitle}>
            Organiza tus productos en colecciones y mejora la navegacion.
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateModal}>
          Crear categoria
        </button>
      </div>

      {error ? <div className={styles.alert}>{error}</div> : null}

      <section className={`${styles.card} ${styles.listCard}`}>
        {categories.length === 0 ? (
          <div className={styles.empty}>No hay categorias registradas.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Imagen</th>
                <th>Descripcion</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>
                    {category.image_url ? (
                      <img src={category.image_url} alt={category.name} className={styles.tableThumb} />
                    ) : (
                      <span className={styles.tablePlaceholder}>Sin imagen</span>
                    )}
                  </td>
                  <td>{category.description}</td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" className={styles.button} onClick={() => handleEdit(category)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.danger}`}
                        onClick={() => handleDelete(category)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal open={isFormOpen} title={modalTitle} onClose={closeForm}>
        <form className={styles.form} onSubmit={onSubmit}>
          <FormInput label="Nombre" {...register("name")} error={errors.name?.message} />
          <Textarea label="Descripcion" rows={4} {...register("description")} error={errors.description?.message} />

          <div className={styles.imageField}>
            <span className={styles.imageLabel}>Imagen de categoria</span>
            <input
              id="category-image-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className={styles.fileInput}
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className={styles.imagePreview}>
                <img src={imagePreview} alt="Vista previa categoria" />
                <div className={styles.imagePreviewActions}>
                  <label htmlFor="category-image-input" className={styles.imageChangeButton}>
                    Cambiar
                  </label>
                  <button type="button" className={styles.imageRemoveButton} onClick={handleRemoveImage}>
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <label htmlFor="category-image-input" className={styles.imageDropzone}>
                <span>Selecciona una imagen desde tu equipo</span>
                <small>Formatos aceptados: PNG, JPG, WEBP.</small>
              </label>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancel} onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : editing ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
