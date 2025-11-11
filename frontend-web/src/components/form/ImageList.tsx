import type { ChangeEvent } from "react";
import { useMemo } from "react";

export type ImageItem = {
  id?: string;
  url: string;
  position: number;
  is_cover: boolean;
  mime_type?: string | null;
  size_bytes?: number | null;
  file?: File | null;
  previewUrl?: string | null;
};

type Props = {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  error?: string;
};

const TEN_MB = 10 * 1024 * 1024;
const primaryButtonClass =
  "rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90";
const neutralButtonClass =
  "rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

function resequence(images: ImageItem[]): ImageItem[] {
  return images.map((image, index) => ({ ...image, position: index }));
}

function formatFileSize(size?: number | null): string {
  if (!size && size !== 0) {
    return "-";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function revokePreview(image?: ImageItem) {
  if (image?.previewUrl) {
    URL.revokeObjectURL(image.previewUrl);
  }
}

export function ImageList({ images, onChange, error }: Props) {
  const hasOversizedImage = useMemo(
    () =>
      images.some((image) => {
        const size = image.file?.size ?? image.size_bytes ?? 0;
        return size > TEN_MB;
      }),
    [images],
  );

  function updateImage(index: number, patch: Partial<ImageItem>) {
    const next = images.map((image, imageIndex) => {
      if (imageIndex !== index) {
        return patch.is_cover ? { ...image, is_cover: false } : image;
      }
      return { ...image, ...patch };
    });
    onChange(resequence(next));
  }

  function handleToggleCover(index: number) {
    if (images[index]?.is_cover) {
      return;
    }
    updateImage(index, { is_cover: true });
  }

  function handleRemove(index: number) {
    revokePreview(images[index]);
    const next = resequence(images.filter((_, imageIndex) => imageIndex !== index));
    if (next.length > 0 && !next.some((image) => image.is_cover)) {
      next[0] = { ...next[0], is_cover: true };
    }
    onChange(next);
  }

  function handleAdd() {
    const next: ImageItem[] = [
      ...images,
      {
        url: "",
        position: images.length,
        is_cover: images.length === 0,
        mime_type: undefined,
        size_bytes: undefined,
        file: null,
        previewUrl: null,
      },
    ];
    onChange(resequence(next));
  }

  function handleMove(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) {
      return;
    }
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(newIndex, 0, item);
    onChange(resequence(next));
  }

  function handleFileChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    revokePreview(images[index]);
    const previewUrl = URL.createObjectURL(file);

    updateImage(index, {
      file,
      previewUrl,
      mime_type: file.type,
      size_bytes: file.size,
      url: images[index]?.url ?? "",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">Imagenes del producto</span>
        <button type="button" className={primaryButtonClass} onClick={handleAdd}>
          Anadir imagen
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {images.map((image, index) => {
          const previewSource = image.previewUrl ?? image.url;
          return (
            <div key={image.id ?? index} className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/20">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/5 text-sm font-semibold text-white/70 sm:w-48">
                  {previewSource ? (
                    <img src={previewSource} alt={`Imagen ${index + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <span>Sin imagen</span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90">
                      {previewSource ? "Cambiar imagen" : "Seleccionar imagen"}
                      <input type="file" accept="image/*" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => handleFileChange(index, event)} />
                    </label>
                    <div className="flex flex-col text-sm text-white/70">
                      <span>{image.mime_type ?? image.file?.type ?? "-"}</span>
                      <span>{formatFileSize(image.size_bytes ?? image.file?.size ?? undefined)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/80">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="coverImage"
                        checked={image.is_cover}
                        onChange={() => handleToggleCover(index)}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      Portada
                    </label>

                    <div className="inline-flex items-center gap-2">
                      <button type="button" onClick={() => handleMove(index, -1)} disabled={index === 0} className={neutralButtonClass}>
                        Subir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === images.length - 1}
                        className={neutralButtonClass}
                      >
                        Bajar
                      </button>
                    </div>

                    <button
                      type="button"
                      className="rounded-full border border-red-400/60 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                      onClick={() => handleRemove(index)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasOversizedImage ? (
        <div className="rounded-2xl border border-amber-400/50 bg-amber-500/15 px-4 py-3 text-sm text-amber-200">
          Una o mas imagenes superan los 10MB. Reduce el tamano antes de guardar.
        </div>
      ) : null}
      {error ? <div className="text-sm font-semibold text-red-400">{error}</div> : null}
    </div>
  );
}
