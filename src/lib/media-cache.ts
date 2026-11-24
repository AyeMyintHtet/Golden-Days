export const mediaCacheLimits = {
  image: {
    cacheName: "golden-days-images-v1",
    maxEntries: 180,
    maxAgeSeconds: 30 * 24 * 60 * 60,
    maxBytes: 2 * 1024 * 1024,
  },
  video: {
    cacheName: "golden-days-videos-v2",
    maxEntries: 2,
    maxAgeSeconds: 7 * 24 * 60 * 60,
    maxBytes: 8 * 1024 * 1024,
  },
};

export const CACHE_VIDEO = "CACHE_VIDEO";
export const CLEAR_PRIVATE_MEDIA = "CLEAR_PRIVATE_MEDIA";
export const ENABLE_PRIVATE_MEDIA = "ENABLE_PRIVATE_MEDIA";

interface DeviceHints {
  onLine?: boolean;
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

export function canWarmVideo(device: DeviceHints) {
  return (
    device.onLine !== false &&
    !device.connection?.saveData &&
    !["slow-2g", "2g"].includes(device.connection?.effectiveType ?? "") &&
    !(device.deviceMemory && device.deviceMemory <= 2)
  );
}

export async function forgetCachedMedia(url: string, kind: "image" | "video") {
  try {
    if (!("caches" in globalThis)) return;
    const cache = await caches.open(mediaCacheLimits[kind].cacheName);
    await cache.delete(new URL(url, globalThis.location.href).href);
  } catch {
    // Retry normally when site storage is unavailable.
  }
}

export function canCacheMedia(
  response: Response,
  kind: "image" | "video",
  privateOfflineCopy = false,
) {
  const size = Number(response.headers.get("content-length"));
  const policy = response.headers.get("cache-control") ?? "";
  const type = response.headers.get("content-type") ?? "";
  return (
    response.status === 200 &&
    !response.headers.has("content-range") &&
    type.toLowerCase().startsWith(`${kind}/`) &&
    !/(?:^|,)\s*(?:no-store|no-cache)(?:\s*=|\s*(?:,|$))/i.test(policy) &&
    (privateOfflineCopy ||
      !/(?:^|,)\s*must-revalidate(?:\s*(?:,|$))/i.test(policy)) &&
    !/(?:^|,)\s*max-age\s*=\s*"?0+"?(?:\s|,|$)/i.test(policy) &&
    Number.isSafeInteger(size) &&
    size > 0 &&
    size <= mediaCacheLimits[kind].maxBytes
  );
}
