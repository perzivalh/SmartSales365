import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const FAVORITES_STORAGE_KEY = "smartsales365.favorites.v1";

type FavoritesContextValue = {
  favorites: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

function loadInitialFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === "string");
  } catch (error) {
    console.error("No se pudieron cargar los favoritos guardados", error);
    return [];
  }
}

export function FavoritesProvider({ children }: Props) {
  const [favorites, setFavorites] = useState<string[]>(() => loadInitialFavorites());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("No se pudieron guardar los favoritos", error);
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (productId: string) => favorites.includes(productId),
    [favorites],
  );

  const addFavorite = useCallback((productId: string) => {
    setFavorites((previous) => {
      if (previous.includes(productId)) return previous;
      return [productId, ...previous];
    });
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    setFavorites((previous) => previous.filter((id) => id !== productId));
  }, []);

  const toggleFavorite = useCallback(
    (productId: string) => {
      setFavorites((previous) => {
        if (previous.includes(productId)) {
          return previous.filter((id) => id !== productId);
        }
        return [productId, ...previous];
      });
    },
    [],
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      addFavorite,
      removeFavorite,
      clearFavorites,
    }),
    [favorites, isFavorite, toggleFavorite, addFavorite, removeFavorite, clearFavorites],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export { FavoritesContext };
