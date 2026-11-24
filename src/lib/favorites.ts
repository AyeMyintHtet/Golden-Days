export const FAVORITES_KEY = "golden-days:favorites";
const LEGACY_KEY = "golden-days:demo-favorites";

export function parseFavorites(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "null");
    return Array.isArray(parsed)
      ? [
          ...new Set(
            parsed.filter(
              (id): id is string =>
                typeof id === "string" && Boolean(id.trim()),
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}

export function readFavorites(): string[] {
  try {
    return parseFavorites(
      localStorage.getItem(FAVORITES_KEY) ?? localStorage.getItem(LEGACY_KEY),
    );
  } catch {
    return [];
  }
}

export function saveFavorites(ids: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* Favorites still work in memory when storage is unavailable. */
  }
}

export function toggleFavoriteId(ids: string[], id: string) {
  if (!id.trim()) return ids;
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
