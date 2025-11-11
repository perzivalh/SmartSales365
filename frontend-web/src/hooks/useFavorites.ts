import { useContext } from "react";

import { FavoritesContext } from "../contexts/FavoritesContext";

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  }
  return context;
}
