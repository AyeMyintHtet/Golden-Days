export type MediaKind = "photo" | "video";
export type MediaFilter = "all" | MediaKind;
export type Collection = "all" | "favorites";

export interface Memory {
  id: string;
  kind: MediaKind;
  thumbnail: MediaLink;
  thumbnailLarge?: MediaLink;
  src: MediaLink;
  playback?: "file" | "iframe";
  downloadUrl?: MediaLink;
}

// Demo content only. Array order is the gallery order; no media metadata is needed.
export const memories: Memory[] = [
  {
    id: "m01",
    kind: "photo",
    thumbnail: "/images/thumbnails/golden-temple-320.webp",
    thumbnailLarge: "/images/thumbnails/golden-temple-640.webp",
    src: "/images/golden-temple.jpg",
  },
  {
    id: "m02",
    kind: "photo",
    thumbnail: "/images/thumbnails/temple-320.webp",
    thumbnailLarge: "/images/thumbnails/temple-640.webp",
    src: "/images/temple.jpg",
  },
  {
    id: "m03",
    kind: "photo",
    thumbnail: "/images/thumbnails/evening-320.webp",
    thumbnailLarge: "/images/thumbnails/evening-640.webp",
    src: "/images/evening.jpg",
  },
  {
    id: "m04",
    kind: "photo",
    thumbnail: "/images/thumbnails/food-320.webp",
    thumbnailLarge: "/images/thumbnails/food-640.webp",
    src: "/images/food.jpg",
  },
  {
    id: "m05",
    kind: "photo",
    thumbnail: "/images/thumbnails/green-320.webp",
    thumbnailLarge: "/images/thumbnails/green-640.webp",
    src: "/images/green.jpg",
  },
  {
    id: "m06",
    kind: "photo",
    thumbnail: "/images/thumbnails/journey-320.webp",
    thumbnailLarge: "/images/thumbnails/journey-640.webp",
    src: "/images/journey.jpg",
  },
  {
    id: "m07",
    kind: "video",
    thumbnail: "/images/video-poster.svg",
    src: "/images/sample-video.mp4",
  },
  {
    id: "m08",
    kind: "photo",
    thumbnail: "/images/thumbnails/river-320.webp",
    thumbnailLarge: "/images/thumbnails/river-640.webp",
    src: "/images/river.jpg",
  },
  {
    id: "m09",
    kind: "photo",
    thumbnail: "/images/thumbnails/city-320.webp",
    thumbnailLarge: "/images/thumbnails/city-640.webp",
    src: "/images/city.jpg",
  },
  {
    id: "m10",
    kind: "photo",
    thumbnail: "/images/thumbnails/market-320.webp",
    thumbnailLarge: "/images/thumbnails/market-640.webp",
    src: "/images/market.jpg",
  },
  {
    id: "m11",
    kind: "photo",
    thumbnail: "/images/thumbnails/street-320.webp",
    thumbnailLarge: "/images/thumbnails/street-640.webp",
    src: "/images/street.jpg",
  },
];

export function filterMemories(
  items: Memory[],
  options: {
    collection: Collection;
    kind: MediaFilter;
    favorites: string[];
  },
) {
  const { collection, kind, favorites } = options;
  return items.filter(
    (memory) =>
      (collection !== "favorites" || favorites.includes(memory.id)) &&
      (kind === "all" || memory.kind === kind),
  );
}
import type { MediaLink } from "../lib/media";
