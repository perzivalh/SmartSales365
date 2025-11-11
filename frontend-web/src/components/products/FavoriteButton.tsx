import clsx from "clsx";

import { useFavorites } from "../../hooks/useFavorites";

type Props = {
  productId: string;
  className?: string;
  size?: "sm" | "md";
};

export function FavoriteButton({ productId, className, size = "md" }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(productId);

  return (
    <button
      type="button"
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={clsx(
        "flex items-center justify-center rounded-full border transition hover:scale-110",
        size === "sm" ? "h-9 w-9" : "h-11 w-11",
        active
          ? "border-transparent bg-[#ff5b5b] text-white shadow-lg shadow-[#ff5b5b]/40"
          : "border-transparent bg-white/25 text-[#0b1c34] shadow-lg shadow-black/40",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        toggleFavorite(productId);
      }}
    >
      <svg width={size === "sm" ? 16 : 20} height={size === "sm" ? 16 : 20} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d={
            active
              ? "M12.1 18.55c-3.4-3.2-5.6-5.25-5.6-7.6C6.5 9.36 7.86 8 9.5 8c.96 0 1.9.45 2.6 1.17c.7-.72 1.64-1.17 2.6-1.17c1.64 0 3 1.36 3 2.95c0 2.35-2.2 4.4-5.6 7.6l-.5.45z"
              : "M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3A5.49 5.49 0 0 0 2 8.5c0 3.57 3.4 6.46 8.55 11.22L12 21.35l1.45-1.32C18.6 14.96 22 12.07 22 8.5A5.49 5.49 0 0 0 16.5 3Zm-4.4 15.24l-.1.1l-.1-.1C7.14 13.24 4 10.39 4 8.5A3.5 3.5 0 0 1 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5A3.5 3.5 0 0 1 20 8.5c0 1.89-3.14 4.74-7.9 9.74Z"
          }
        />
      </svg>
    </button>
  );
}
