import type { Memory } from "../data/memories";
import { parseMemories } from "./media";
import { explicitlySignedOut } from "./album-session";

const ALBUM_CACHE = "golden-days-album-v1";

export async function readSavedAlbum(url: string): Promise<Memory[] | null> {
  try {
    if (!("caches" in globalThis)) return null;
    const cache = await caches.open(ALBUM_CACHE);
    const response = await cache.match(url);
    return response ? parseMemories(await response.json(), url) : null;
  } catch {
    return null;
  }
}

export async function saveAlbum(
  url: string,
  items: Memory[],
  cacheControl: string | null,
) {
  try {
    if (!("caches" in globalThis)) return;
    if (import.meta.env.VITE_AUTH_REQUIRED === "true" && explicitlySignedOut())
      return;
    const cache = await caches.open(ALBUM_CACHE);
    if (/(?:^|,)\s*no-store(?:\s|,|$)/i.test(cacheControl ?? "")) {
      await cache.delete(url);
      return;
    }
    await cache.put(
      url,
      new Response(JSON.stringify(items), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    if (
      import.meta.env.VITE_AUTH_REQUIRED === "true" &&
      explicitlySignedOut()
    ) {
      await cache.delete(url);
      return;
    }
    // This app has one album; do not accumulate old endpoint snapshots.
    for (const request of await cache.keys())
      if (request.url !== url) await cache.delete(request);
  } catch {
    // The live album remains usable when local storage is full or blocked.
  }
}

export async function forgetSavedAlbum(url: string) {
  try {
    if (!("caches" in globalThis)) return;
    const cache = await caches.open(ALBUM_CACHE);
    await cache.delete(url);
  } catch {
    // Storage is optional.
  }
}
