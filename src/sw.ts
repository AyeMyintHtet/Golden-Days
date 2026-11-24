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
  CLEAR_PRIVATE_MEDIA,
  ENABLE_PRIVATE_MEDIA,
  canCacheMedia,
  canWarmVideo,
  mediaCacheLimits,
} from "./lib/media-cache";
import { imageKitSource } from "./lib/imagekit";

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

let privateCachingAllowed = true;

function isPrivateImageKitCopy(url: string) {
  const source = imageKitSource(url);
  return Boolean(
    source &&
    /^[a-f0-9]{40}$/.test(source.queryParameters["ik-s"] ?? "") &&
    Number(source.queryParameters["ik-t"]) > 0,
  );
}

function cachedMedia(request: Request, response?: Response) {
  if (!privateCachingAllowed) return null;
  if (isPrivateImageKitCopy(request.url)) {
    const expiry = Number(new URL(request.url).searchParams.get("ik-t")) * 1000;
    // Online requests must have unexpired authorization. Offline saved copies
    // deliberately remain on this signed-in device until sign-out or eviction.
    if (self.navigator.onLine && expiry <= Date.now()) return null;
  }
  return response;
}

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
      cachedResponseWillBeUsed: async ({ request, cachedResponse }) =>
        cachedMedia(request, cachedResponse),
      cacheWillUpdate: async ({ request, response }) =>
        privateCachingAllowed &&
        canCacheMedia(response, "image", isPrivateImageKitCopy(request.url))
          ? response
          : null,
      cacheDidUpdate: async ({ cacheName, request }) => {
        if (!privateCachingAllowed)
          await (await caches.open(cacheName)).delete(request);
      },
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
        if (
          request.destination === "" &&
          !canCacheMedia(response, "video", isPrivateImageKitCopy(request.url))
        ) {
          await response.body?.cancel();
          throw new Error("Video is not eligible for local caching");
        }
        return response;
      },
      cachedResponseWillBeUsed: async ({ request, cachedResponse }) =>
        cachedMedia(request, cachedResponse),
      cacheWillUpdate: async ({ request, response }) =>
        privateCachingAllowed &&
        canCacheMedia(response, "video", isPrivateImageKitCopy(request.url))
          ? response
          : null,
      cacheDidUpdate: async ({ cacheName, request }) => {
        if (!privateCachingAllowed)
          await (await caches.open(cacheName)).delete(request);
      },
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
let videoWarmController: AbortController | null = null;

async function cacheVideo(url: string, event: ExtendableMessageEvent) {
  if (warmingVideo || !privateCachingAllowed || !canWarmVideo(self.navigator))
    return;
  warmingVideo = true;
  const controller = new AbortController();
  videoWarmController = controller;
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
    videoWarmController = null;
  }
}

self.addEventListener("message", (event) => {
  if (
    event.origin === self.location.origin &&
    event.data?.type === CLEAR_PRIVATE_MEDIA
  ) {
    privateCachingAllowed = false;
    videoWarmController?.abort();
    event.waitUntil(
      (async () => {
        const names = await caches.keys();
        await Promise.all(
          names
            .filter((name) => /^golden-days-(images|videos|album)-/.test(name))
            .map((name) => caches.delete(name)),
        );
        event.ports[0]?.postMessage({ ok: true });
      })(),
    );
    return;
  }
  if (
    event.origin === self.location.origin &&
    event.data?.type === ENABLE_PRIVATE_MEDIA
  ) {
    privateCachingAllowed = true;
    return;
  }
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
