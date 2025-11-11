import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { uploadProductImage } from "../../api/products";
import type { ProductPayload } from "../../api/products";
import type { Category } from "../../types/api";
import type { ImageItem } from "../form/ImageList";
import { ImageList } from "../form/ImageList";
import { FormInput } from "../form/FormInput";
import { Select } from "../form/Select";
import { Textarea } from "../form/Textarea";
import { TagList } from "../form/TagList";

const FEATURE_LIMIT = 20;

const numericFieldMessages = {
  positive: "El valor no puede ser negativo.",
  required: "Introduce un numero valido.",
};

const sectionClass = "space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 text-white";
const primaryButtonClass =
  "h-12 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/40 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "h-12 rounded-full border border-white/25 px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

const imageSchema = z
  .object({
    id: z.string().optional(),
    url: z.string().optional().default(""),
    position: z.number().min(0, "La posicion no puede ser negativa."),
    is_cover: z.boolean(),
    mime_type: z
      .union([z.string().trim(), z.literal(""), z.null()])
      .optional()
      .transform((value) => {
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed.length === 0 ? undefined : trimmed;
        }
        return undefined;
      }),
    size_bytes: z
      .number({
        invalid_type_error: numericFieldMessages.required,
      })
      .min(0, numericFieldMessages.positive)
      .optional(),
    file: z.any().optional(),
    previewUrl: z.string().optional().nullable().default(null),
  })
  .superRefine((item, ctx) => {
    const hasRemote = typeof item.url === "string" && item.url.trim().length > 0;
    const hasFile = Boolean(item.file);
    if (!hasRemote && !hasFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona una imagen o carga un archivo.",
        path: ["url"],
      });
    }
  })
  .transform((item) => ({
    ...item,
    url: typeof item.url === "string" ? item.url.trim() : "",
    position: Number.isFinite(item.position) ? item.position : 0,
    size_bytes:
      typeof item.size_bytes === "number" && Number.isFinite(item.size_bytes) ? item.size_bytes : item.file?.size ?? undefined,
    file: item.file ?? null,
    previewUrl: item.previewUrl ?? null,
  })) as z.ZodType<ImageItem>;

const formSchemaBase = z.object({
  category: z.string().min(1, "Selecciona una categoria."),
  name: z.string().min(1, "Introduce el nombre del producto."),
  sku: z.string().min(1, "Introduce el SKU."),
  short_description: z
    .string()
    .min(1, "Describe brevemente el producto.")
    .max(160, "La descripcion corta admite hasta 160 caracteres."),
  long_description: z.string().min(1, "Agrega la descripcion completa del producto."),
  price: z
    .number({
      invalid_type_error: numericFieldMessages.required,
    })
    .min(0, numericFieldMessages.positive),
  stock: z
    .number({
      invalid_type_error: numericFieldMessages.required,
    })
    .min(0, numericFieldMessages.positive),
  width_cm: z
    .number({
      invalid_type_error: numericFieldMessages.required,
    })
    .min(0, numericFieldMessages.positive),
  height_cm: z
    .number({
      invalid_type_error: numericFieldMessages.required,
    })
    .min(0, numericFieldMessages.positive),
  weight_kg: z
    .number({
      invalid_type_error: numericFieldMessages.required,
    })
    .min(0, numericFieldMessages.positive),
  is_active: z.boolean(),
  images: z.array(imageSchema).min(1, "Agrega al menos una imagen del producto."),
  features: z
    .array(z.string().min(1, "La caracteristica no puede estar vacia."))
    .max(FEATURE_LIMIT, `Puedes registrar hasta ${FEATURE_LIMIT} caracteristicas.`),
});

const formSchema = formSchemaBase.superRefine((values, context) => {
  const coverCount = values.images.filter((image) => image.is_cover).length;
  if (coverCount === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Marca una imagen como portada.",
      path: ["images"],
    });
  }
  if (coverCount > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Solo una imagen puede ser portada.",
      path: ["images"],
    });
  }
});

export type ProductFormValues = z.infer<typeof formSchema>;

type ProductFormProps = {
  categories: Category[];
  defaultValues?: Partial<ProductFormValues>;
  submitLabel: string;
  onSubmit: (payload: ProductPayload) => Promise<void>;
  onCancel: () => void;
};

const emptyFormValues: ProductFormValues = {
  category: "",
  name: "",
  sku: "",
  short_description: "",
  long_description: "",
  price: 0,
  stock: 0,
  width_cm: 0,
  height_cm: 0,
  weight_kg: 0,
  is_active: true,
  images: [],
  features: [],
};

function normalizeImages(images?: ImageItem[] | null): ImageItem[] {
  if (!Array.isArray(images)) {
    return [];
  }
  return images
    .map((image) => ({
      ...image,
      url: image.url ?? "",
      mime_type: image.mime_type ?? undefined,
      size_bytes: image.size_bytes ?? undefined,
      previewUrl: image.previewUrl ?? null,
      file: image.file ?? null,
    }))
    .filter((image) => image.url || image.previewUrl || image.file)
    .map((image, index) => ({ ...image, position: index }));
}

function buildDefaultValues(overrides?: Partial<ProductFormValues>): ProductFormValues {
  if (!overrides) {
    return emptyFormValues;
  }
  return {
    ...emptyFormValues,
    ...overrides,
    price: typeof overrides.price === "number" && Number.isFinite(overrides.price) ? overrides.price : emptyFormValues.price,
    stock: typeof overrides.stock === "number" && Number.isFinite(overrides.stock) ? overrides.stock : emptyFormValues.stock,
    width_cm:
      typeof overrides.width_cm === "number" && Number.isFinite(overrides.width_cm) ? overrides.width_cm : emptyFormValues.width_cm,
    height_cm:
      typeof overrides.height_cm === "number" && Number.isFinite(overrides.height_cm)
        ? overrides.height_cm
        : emptyFormValues.height_cm,
    weight_kg:
      typeof overrides.weight_kg === "number" && Number.isFinite(overrides.weight_kg)
        ? overrides.weight_kg
        : emptyFormValues.weight_kg,
    is_active: overrides.is_active ?? emptyFormValues.is_active,
    images: normalizeImages(overrides.images),
    features: overrides.features ? overrides.features.map((feature) => feature.trim()).filter(Boolean) : [],
  };
}

function toProductPayload(values: ProductFormValues): ProductPayload {
  const normalizedImages = normalizeImages(values.images);

  const images = normalizedImages.map((image, index) => ({
    id: image.id,
    url: image.url.trim(),
    position: index,
    is_cover: image.is_cover,
    mime_type: image.mime_type ?? undefined,
    size_bytes:
      typeof image.size_bytes === "number" && Number.isFinite(image.size_bytes) ? image.size_bytes : image.file?.size ?? undefined,
  }));

  const features = values.features
    .map((feature) => feature.trim())
    .filter((feature, index, all) => feature.length > 0 && all.indexOf(feature) === index)
    .map((label) => ({ label }));

  return {
    category: values.category,
    name: values.name.trim(),
    sku: values.sku.trim(),
    short_description: values.short_description.trim(),
    long_description: values.long_description.trim(),
    price: values.price,
    stock: Math.round(values.stock),
    width_cm: values.width_cm,
    height_cm: values.height_cm,
    weight_kg: values.weight_kg,
    is_active: values.is_active,
    images,
    features,
  };
}

export function ProductForm({ categories, defaultValues, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  const resolvedDefaults = useMemo(() => buildDefaultValues(defaultValues), [defaultValues]);
  const blankDefaults = useMemo(() => buildDefaultValues(), []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: resolvedDefaults,
    mode: "onBlur",
  });

  useEffect(() => {
    reset(resolvedDefaults);
  }, [resolvedDefaults, reset]);

  const featureValues = useWatch({ control, name: "features" }) ?? [];
  const imageValues = useWatch({ control, name: "images" }) ?? [];

  const handleFeatureChange = useCallback(
    (values: string[]) => {
      setValue("features", values, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const handleCancel = useCallback(() => {
    imageValues.forEach((image) => {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
    onCancel();
    reset(blankDefaults);
  }, [onCancel, reset, blankDefaults, imageValues]);

  const submitForm = handleSubmit(async (values) => {
    clearErrors("images");
    const nextImages: ImageItem[] = [];

    try {
      for (const image of values.images) {
        if (image.file) {
          const response = await uploadProductImage(image.file);
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
          nextImages.push({
            ...image,
            url: response.url,
            mime_type: response.mime_type ?? image.file.type,
            size_bytes: response.size_bytes ?? image.file.size,
            previewUrl: response.url,
            file: null,
          });
        } else {
          nextImages.push(image);
        }
      }
    } catch (uploadError) {
      console.error(uploadError);
      setError("images", { type: "manual", message: "No se pudo subir una o mas imagenes. Intenta nuevamente." });
      return;
    }

    setValue("images", nextImages, { shouldDirty: true });
    const payload = toProductPayload({ ...values, images: nextImages });
    await onSubmit(payload);
  });

  return (
    <form className="space-y-8" onSubmit={submitForm} noValidate>
      <section className={sectionClass}>
        <h3 className="text-xl font-semibold text-white">Informacion basica</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Categoria" {...register("category")} error={errors.category?.message}>
            <option value="">Selecciona una categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <FormInput label="Nombre" placeholder="Ej. Lavadora 9kg" {...register("name")} error={errors.name?.message} />
          <FormInput label="SKU" placeholder="Ej. SKU-001" {...register("sku")} error={errors.sku?.message} />
          <FormInput
            label="Precio"
            type="number"
            min={0}
            step="0.01"
            {...register("price", { valueAsNumber: true })}
            error={errors.price?.message}
            helperText="Introduce el precio final en bolivianos."
          />
          <FormInput
            label="Stock disponible"
            type="number"
            min={0}
            step={1}
            {...register("stock", { valueAsNumber: true })}
            error={errors.stock?.message}
            helperText="Cantidad de unidades en el inventario."
          />
        </div>

        <label className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80">
          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary" {...register("is_active")} />
          Publicar producto al guardar
        </label>
      </section>

      <section className={sectionClass}>
        <h3 className="text-xl font-semibold text-white">Descripciones</h3>
        <Textarea
          label="Descripcion corta"
          rows={3}
          placeholder="Frase comercial para destacar el producto."
          {...register("short_description")}
          error={errors.short_description?.message}
        />
        <Textarea
          label="Descripcion completa"
          rows={6}
          placeholder="Detalle caracteristicas, condiciones comerciales y garantia."
          {...register("long_description")}
          error={errors.long_description?.message}
        />
      </section>

      <section className={sectionClass}>
        <h3 className="text-xl font-semibold text-white">Dimensiones y envio</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput
            label="Ancho (cm)"
            type="number"
            min={0}
            step="0.1"
            {...register("width_cm", { valueAsNumber: true })}
            error={errors.width_cm?.message}
            helperText="Usado para calcular embalaje y envios."
          />
          <FormInput
            label="Altura (cm)"
            type="number"
            min={0}
            step="0.1"
            {...register("height_cm", { valueAsNumber: true })}
            error={errors.height_cm?.message}
          />
          <FormInput
            label="Peso (kg)"
            type="number"
            min={0}
            step="0.1"
            {...register("weight_kg", { valueAsNumber: true })}
            error={errors.weight_kg?.message}
          />
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-white">Imagenes</h3>
          <span className="text-xs font-semibold text-white/70">
            {imageValues.length === 1 ? "1 imagen cargada" : `${imageValues.length} imagenes cargadas`}
          </span>
        </div>
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <ImageList images={field.value ?? []} onChange={(items) => field.onChange(items)} error={errors.images?.message} />
          )}
        />
      </section>

      <section className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-white">Caracteristicas</h3>
          <span className="text-xs font-semibold text-white/70">
            {featureValues.length}/{FEATURE_LIMIT} caracteristicas
          </span>
        </div>
        <TagList label="Lista de caracteristicas" values={featureValues} onChange={handleFeatureChange} error={errors.features?.message} />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" className={secondaryButtonClass} onClick={handleCancel} disabled={isSubmitting}>
          Cancelar
        </button>
        <button type="submit" className={primaryButtonClass} disabled={isSubmitting || (!isDirty && !defaultValues)}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
