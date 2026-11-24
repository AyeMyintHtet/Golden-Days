import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { RangeRequestsPlugin } from "workbox-range-requests";
import {
  CACHE_VIDEO,
  canCacheMedia,
  canWarmVideo,
  mediaCacheLimits,
} from "./lib/media-cache";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (PrecacheEntry | string)[];
};

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("activate", (event) => {
  // Drop the old, larger video cache when upgrading this worker.
  event.waitUntil(caches.delete("golden-days-videos-v1").catch(() => false));
});

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [
      /^\/api(?:\/|$)/,
      /^\/images(?:\/|$)/,
      /^\/(?:auth|login|oauth|callback)(?:\/|$)/,
    ],
  }),
);

const imageCache = new CacheFirst({
  cacheName: mediaCacheLimits.image.cacheName,
  plugins: [
    {
      // Readable CORS responses let us enforce the server policy and file limit.
      requestWillFetch: async ({ request }) =>
        request.mode === "no-cors" &&
        new URL(request.url).origin !== self.location.origin
          ? new Request(request, { mode: "cors", credentials: "omit" })
          : request,
      cacheWillUpdate: async ({ response }) =>
        canCacheMedia(response, "image") ? response : null,
      // Providers without CORS still display normally, without app caching.
      handlerDidError: async ({ request }) => fetch(request),
    },
    new ExpirationPlugin({
      ...mediaCacheLimits.image,
      purgeOnQuotaError: true,
    }),
  ],
});

const videoCache = new CacheFirst({
  cacheName: mediaCacheLimits.video.cacheName,
  plugins: [
    {
      fetchDidSucceed: async ({ request, response }) => {
        // A background fill has no destination. Cancel it at the headers if
        // the file is too large or disallows storage; streamed playback continues.
        if (request.destination === "" && !canCacheMedia(response, "video")) {
          await response.body?.cancel();
          throw new Error("Video is not eligible for local caching");
        }
        return response;
      },
      cacheWillUpdate: async ({ response }) =>
        canCacheMedia(response, "video") ? response : null,
      handlerDidError: async ({ request, error }) => {
        if (request.destination === "video") return fetch(request);
        throw error;
      },
    },
    new ExpirationPlugin({
      ...mediaCacheLimits.video,
      purgeOnQuotaError: true,
    }),
    new RangeRequestsPlugin(),
  ],
});

registerRoute(({ request }) => request.destination === "image", imageCache);
registerRoute(({ request }) => request.destination === "video", videoCache);

let warmingVideo = false;

async function cacheVideo(url: string, event: ExtendableMessageEvent) {
  if (warmingVideo || !canWarmVideo(self.navigator)) return;
  warmingVideo = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const request = new Request(url, {
      mode: "cors",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const [response, done] = videoCache.handleAll({ event, request });
    // Consume neither a second player nor a second copy in page memory.
    const discard = response.then((result) => {
      void result.body?.cancel().catch(() => {});
    });
    await Promise.all([discard, done]);
  } catch {
    // Storage, connectivity, or CORS failures must never interrupt playback.
  } finally {
    clearTimeout(timeout);
    warmingVideo = false;
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
    return;
  }
  if (
    event.origin !== self.location.origin ||
    event.data?.type !== CACHE_VIDEO ||
    typeof event.data.url !== "string"
  )
    return;
  try {
    const url = new URL(event.data.url, self.location.href);
    if (url.protocol === "http:" || url.protocol === "https:")
      event.waitUntil(cacheVideo(url.href, event));
  } catch {
    // Ignore invalid media messages.
  }
});
