import type { ChangeEvent } from "react";
import { useMemo } from "react";

import styles from "./ImageList.module.css";

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
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Imagenes del producto</span>
        <button type="button" className={styles.addButton} onClick={handleAdd}>
          Anadir imagen
        </button>
      </div>

      <div className={styles.list}>
        {images.map((image, index) => {
          const previewSource = image.previewUrl ?? image.url;
          return (
            <div key={image.id ?? index} className={styles.card}>
              <div className={styles.cardContent}>
                <div className={styles.preview}>
                  {previewSource ? <img src={previewSource} alt={`Imagen ${index + 1}`} /> : <span>Sin imagen</span>}
                </div>

                <div className={styles.details}>
                  <div className={styles.fileRow}>
                    <label className={styles.fileButton}>
                      {previewSource ? "Cambiar imagen" : "Seleccionar imagen"}
                      <input type="file" accept="image/*" onChange={(event) => handleFileChange(index, event)} />
                    </label>
                    <div className={styles.metaInfo}>
                      <span>{image.mime_type ?? image.file?.type ?? "-"}</span>
                      <span>{formatFileSize(image.size_bytes ?? image.file?.size ?? undefined)}</span>
                    </div>
                  </div>

                  <div className={styles.controls}>
                    <label className={styles.coverToggle}>
                      <input
                        type="radio"
                        name="coverImage"
                        checked={image.is_cover}
                        onChange={() => handleToggleCover(index)}
                      />
                      Portada
                    </label>

                    <div className={styles.moveGroup}>
                      <button type="button" onClick={() => handleMove(index, -1)} disabled={index === 0}>
                        Subir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === images.length - 1}
                      >
                        Bajar
                      </button>
                    </div>

                    <button type="button" className={styles.removeButton} onClick={() => handleRemove(index)}>
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
        <div className={styles.warning}>Una o mas imagenes superan los 10MB. Reduce el tamano antes de guardar.</div>
      ) : null}
      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
  );
}



