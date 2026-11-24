import { useCallback, useEffect, useState } from "react";
import {
  FAVORITES_KEY,
  parseFavorites,
  readFavorites,
  saveFavorites,
  toggleFavoriteId,
} from "../lib/favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(readFavorites);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    function syncFavorites(event: StorageEvent) {
      if (event.key === FAVORITES_KEY || event.key === null)
        setFavorites(parseFavorites(event.newValue));
    }
    window.addEventListener("storage", syncFavorites);
    return () => window.removeEventListener("storage", syncFavorites);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) => toggleFavoriteId(current, id));
  }, []);

  return { favorites, toggleFavorite };
}
