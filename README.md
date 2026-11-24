# Golden Days

A mobile-first React photo album with public sample media and an optional server album endpoint. No personal photos or videos are included. Authentication and cloud storage must be supplied by the server.

## Open locally

From the project folder, install the locked dependencies if needed, then start the app yourself:

```sh
npm ci
```

```sh
npm run dev
```

Open the address Vite prints. The development server is bound to `127.0.0.1` and is not started automatically.

## Check Chrome installation locally

The regular development command does not expose the PWA manifest or register a development worker, so Chrome’s automatic PWA install promotion is not expected there. Use the separate local PWA mode yourself:

```sh
npm run dev:pwa
```

Open **http://127.0.0.1:5174/** in a regular Chrome window. This mode serves the app manifest and a module service worker. Its separate port keeps test workers and media caches away from ordinary development on port 5173. If port 5174 is occupied, the command stops rather than choosing a different origin.

Click or tap the page and leave it open for at least 30 seconds. Chrome decides when to offer the native install prompt; the app’s **Install** button uses it once available. Chrome may also offer installation through its address-bar icon or menu. Use a regular browsing window, and check that the app is not already installed for this origin. If the button first opens instructions, close them and try again after Chrome has evaluated the page.

Chrome developer tools → **Application → Manifest** should show Golden Days and its 192 px / 512 px icons. **Application → Service Workers** should show the local worker. If the browser reports an error, use that exact error to diagnose the local setup. This mode is for installation and worker-logic checks; a complete offline launch still requires checking the deployed production app, because development JavaScript modules are not precached as a production bundle. If using a remote album server, allow the port-5174 origin in its CORS configuration.

Reference: [Chrome installation criteria](https://web.dev/articles/install-criteria), [Vite PWA development mode](https://vite-pwa-org.netlify.app/guide/development).

## Stack

| Part                 | Setup                                                    |
| -------------------- | -------------------------------------------------------- |
| UI                   | React 19 and TypeScript                                  |
| Development          | Vite                                                     |
| Installable app      | vite-plugin-pwa and Workbox                              |
| Animation and icons  | Motion and Lucide React                                  |
| Fonts                | Locally bundled DM Sans and Cormorant Garamond           |
| Downloads            | fflate, loaded when creating a ZIP                       |
| Thumbnail generation | Sharp, run locally                                       |
| Media                | Local sample files or an optional HTTP(S) album endpoint |

## Included

- Install button, home-screen icons, standalone app mode, an offline interface, and user-controlled app updates.
- Mobile below 900 px: glass bottom navigation for memories, photos, videos, and favorites. No sidebar, hamburger menu, or duplicate media filter tabs.
- Desktop at 900 px and above: fixed sidebar and media filter tabs. Selection controls and two grid sizes work on both layouts.
- Light and dark themes with a curtain transition. The theme switches only after the curtains close; reduced-motion preferences switch immediately. The choice is saved in this browser, with the device preference used on a first visit.
- Full-screen viewer with keyboard navigation, touch swipes, filmstrip previews, double-click photo zoom, and manual video playback. There is no viewer zoom button or slideshow button.
- Favorites stored by stable media ID on this browser, synchronized between its tabs. New visitors start with no favorites; existing saved choices are retained.
- Direct/signed media URLs, explicitly encoded URLs, and click-to-load iframe video players.
- Single-file downloads and ZIP downloads for selected memories.
- Share links to individual memories; shared local links only work where the development site is reachable.
- Reduced-motion support, keyboard focus controls, and lazy-loaded responsive WebP thumbnails.
- The gallery initially renders at most 10 items. After scrolling begins, an observer adds the next 10 when the end is within 600 px of the viewport. This repeats until the album ends; a load-more button remains as a fallback. Changing collection or media type resets the gallery to 10 items.
- Full-size photos load when opened. Image placeholders fade into the photo; failed viewer images can be retried. Eligible loaded images are kept in a bounded browser cache for later visits.
- Videos use posters and `preload="none"`, load on play, show buffering feedback, and release their source when closed. Videos pause when the page is hidden.
- The viewer mounts at most 11 filmstrip thumbnails and loads only the active full-size media file.
- Downloads use up to three simultaneous requests and report progress; ZIP code loads only for multiple files.

## Install as an app

The header’s install button opens the browser’s native installation prompt when available. Otherwise, it shows platform instructions. In an installed standalone window, that button is hidden.

- **iPhone/iPad:** open the deployed site in Safari, choose **Share**, then **Add to Home Screen**.
- **Android/desktop:** use the header’s install button or the browser’s install menu, when supported.

The hosting deployment must generate and serve the production Vite output over HTTPS. The manifest is generated by `vite-plugin-pwa`, which compiles `src/sw.ts` and injects the app-shell precache list using `injectManifest`. These outputs are not static files in `public/`. PWA service-worker registration is disabled in ordinary development. The explicit `npm run dev:pwa` mode enables local manifest and worker checks on a separate port. The ordinary app UI can still be checked locally. Real installation, offline launch, and update prompts require verification against the deployed production app; no production build or deployment has been performed here.

The service worker caches the app shell, bundled fonts, and installation icons at installation. It also caches eligible media as described below, without pre-downloading the album. The last successfully validated album list is saved separately so a server-backed album can reopen offline. A connection refreshes that list; iframe players remain uncached. Favorites and theme preferences remain browser-local.

When a new service worker is waiting, an update banner offers **Update** or **Later**. The app does not automatically reload while someone is viewing memories. An offline status message stays visible above the gallery and inside the photo viewer. Previously cached photos remain viewable; items that were never loaded need a connection.

App icons are generated from `public/favicon.svg`. To regenerate the 192 px, 512 px, maskable, and Apple touch icons:

```sh
npm run pwa:icons
```

`public/_headers` prevents stale caching of `sw.js` and `manifest.webmanifest` on Cloudflare Pages. A different host must provide equivalent headers. The current app is configured for hosting at the site root (`/`).

Reference: [PWA installation requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [Vite PWA React integration](https://vite-pwa-org.netlify.app/frameworks/react).

## Media cache for returning visitors

Media files use the browser’s Cache Storage API through Workbox, not cookies. This runs after a service worker controls the page. Ordinary development keeps its worker disabled; the separate `dev:pwa` mode enables it for local checks.

- **Images:** cache-first for successfully loaded thumbnails and photos, up to 180 files, 2 MiB per file, with a maximum age of 30 days.
- **Direct videos:** up to 2 complete files, 8 MiB per file, with a maximum age of 7 days. Cached files support byte-range requests so seeking continues to work.
- **Video fills:** after playback finishes, the worker attempts to cache the complete file in the background, one at a time, with a 20-second deadline. Background fills are skipped when the browser reports Data Saver, 2G, an offline connection, or at most 2 GB of device memory. Streamed `206` fragments cannot be cached as a complete video; this can require an additional full request. Larger videos and files without a readable size continue streaming without being stored.
- **Limits:** only readable `200` image/video responses with a valid `Content-Length` are eligible. Responses marked `no-store`, `no-cache`, `must-revalidate`, or `max-age=0` are skipped. Old entries expire and media caches can be purged if storage runs out. Browsers can also evict site data; this is a performance cache, not a backup.

Remote media needs CORS permission to enter this cache. Images and videos fall back to normal uncached loading when a provider blocks CORS. Iframe players remain controlled by their provider and are never downloaded into this cache. No file is prefetched just because its record appears in the album manifest.

Cache keys retain the complete URL and signed query parameters. Renewed signed URLs get separate cache entries; use versioned URLs when replacing a file so visitors receive the new content. Local copies can remain until eviction or expiry. A future sign-out/account-switch flow must clear the app’s media caches. Visitors can clear them now by removing this site’s data in their browser settings.

To check a deployed HTTPS site yourself: open a few images, finish a small direct video, then return to the same URLs. Inspect **Application → Cache Storage** in browser developer tools for `golden-days-images-v1` and `golden-days-videos-v2`. Video seeking, storage eviction, CORS, and cache reuse still need to be verified against your actual host; no local server or production build has been started here.

Reference: [Workbox cached audio and video](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video), [Vite PWA custom service workers](https://vite-pwa-org.netlify.app/guide/inject-manifest).

## Offline album behavior

After a successful server response, the app saves its validated album records in `golden-days-album-v1`. On a later visit it can show those records immediately while checking the server. Offline visits use the saved list without waiting for a network request. Reconnecting refreshes the list automatically; a temporary server failure keeps the saved copy and offers **Retry connection**.

The **You’re offline** notice does not block navigation, favorites, or previously cached photos, and remains visible in the photo viewer. Both the app shell and the relevant media must have been cached before an offline launch. A thumbnail and its full-size photo are separate files: opening a full-size photo once saves that viewing copy when eligible; a preview alone does not download the original. Browser eviction and the media-cache limits still apply. Downloads of uncached files and iframe videos require a connection.

The snapshot keeps original media IDs and exact signed URLs. An API response marked `no-store` removes its saved snapshot, and a revoked/deleted album response (401, 403, 404, or 410) is not restored from old records. An offline first visit shows a connection prompt instead of substituting another album. A future sign-out flow must clear the saved album and media caches together.

## Phone and PWA checks

The app and worker share JavaScript syntax targets for Safari 14, Chrome/Edge 87, and Firefox 78. These are compilation targets, not a claim that physical devices have been tested. Native installation and media codecs still depend on the phone and browser.

- A missed curtain animation event or a suspended PWA finishes the theme change and releases the page lock. Install and update controls have recovery deadlines.
- Browsers without native modal dialogs use a focus-managed fallback. Older media-query listeners are supported, and viewport-height fallbacks and safe-area padding cover older phone layouts.
- Gallery cards do not run layout measurements for every update. Supported browsers skip off-screen photo rendering; touch layouts use lighter glass effects and avoid hover zoom.
- Storage failures fall back to ordinary image/video requests. Large old video-cache entries are removed when the new worker activates, and cached video size is capped to reduce range-request memory use.
- A React error boundary offers **Reload album** if rendering fails. It cannot prevent operating-system memory termination or failures before JavaScript loads.

Please check the deployed HTTPS PWA on an actual iPhone and Android phone: reopen offline after viewing photos; switch theme while backgrounding and resuming; rotate portrait/landscape; seek a cached video; try a limited download; and reopen with limited storage. Confirm that cached images remain visible with the offline notice. No local server, browser preview, or production build has been run automatically. You can use `npm run dev:pwa` yourself for local installation checks; full offline verification still belongs on the deployed production app.

References: [WebKit storage behavior](https://webkit.org/blog/14403/updates-to-storage-policy/), [off-screen rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility), [video codec compatibility](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs).

## Replace the sample media

Put website copies in `public/images/` and update the simple album records in `src/data/memories.ts`. Keep the original phone media separate. The gallery follows the record order and requires no names, descriptions, dates, or locations.

Generate small previews locally after adding website copies:

```sh
npm run media:thumbnails
```

This creates 320 px and 640 px WebP previews in `public/images/thumbnails/` without overwriting source files. Set each record's `thumbnail` to its 320 px preview and optional `thumbnailLarge` to its 640 px preview; keep `src` pointing to the full viewing copy. Videos need a small poster image as their `thumbnail`.

For Cloudflare Pages, `public/_headers` caches hashed application assets for one year and media privately in the visitor's browser for one day. This file is not used by Vite's development server. A future R2 media endpoint must set its own cache headers and support byte-range requests for video seeking.

Downloads are limited to 20 files and 32 MiB total per operation, including single-file downloads. A streaming byte counter also enforces this limit when Content-Length is missing; requests time out after two minutes. ZIP creation runs asynchronously. Larger files and a whole multi-gigabyte album need a server-managed streaming download rather than browser buffering.

Before adding personal media to a hosted site, implement server-side access checks and private object storage. The sample UI alone does not protect files.

## Connect server media

Either replace the local records in `src/data/memories.ts`, or copy `.env.example` to `.env.local` and set `VITE_MEDIA_URL` to an endpoint returning a JSON array. Restart your development server after changing this environment variable. With an endpoint configured, failed requests restore the last saved album when available. Without a saved copy, the app shows a retry action rather than substituting sample photos. The endpoint returns the album manifest once; the 10-item scroll pagination controls rendering and lazy media loading in the browser. Server-side cursor/page pagination is not implemented, and no backend endpoint is included.

```json
[
  {
    "id": "photo-001",
    "kind": "photo",
    "thumbnail": "https://media.example.com/thumbs/photo-001-320.webp",
    "thumbnailLarge": "https://media.example.com/thumbs/photo-001-640.webp",
    "src": "https://media.example.com/photos/photo-001.webp?token=signed-token"
  },
  {
    "id": "video-001",
    "kind": "video",
    "thumbnail": "https://media.example.com/posters/video-001.webp",
    "src": "https://media.example.com/videos/video-001.mp4",
    "playback": "file"
  },
  {
    "id": "video-002",
    "kind": "video",
    "thumbnail": "https://media.example.com/posters/video-002.webp",
    "src": "https://player.example.com/embed/video-002",
    "playback": "iframe",
    "downloadUrl": "https://media.example.com/download/video-002.mp4"
  }
]
```

Use the iframe's **src URL**, not an HTML iframe snippet. The player is created only after a click and removed when closed or when the page is hidden. An external-open link remains available because providers can block iframe embedding. An iframe record's `downloadUrl` is optional: without a separate file URL, it remains viewable and favoritable but is excluded from download selection.

Any link field can also be an explicitly encoded object:

```ts
{ encoding: "uri", value: encodeURIComponent("https://media.example.com/photo.webp?token=a%2Bb") }
{ encoding: "base64", value: "aHR0cHM6Ly9tZWRpYS5leGFtcGxlLmNvbS92aWRlby5tcDQ=" }
```

Encoding is decoded once. Plain URL strings, including their signed query parameters and percent escapes, are preserved. Base64 and URL-safe Base64 wrappers contain a UTF-8 URL; encoding does not provide encryption or authentication. Relative paths and HTTP(S) URLs are supported. Relative links in a server manifest resolve against that endpoint; local sample paths resolve against the website. Invalid schemes and malformed links show an unavailable-media state. Album requests time out after 15 seconds and can be retried.

Keep `id` unchanged when URLs are renewed or files move, so favorites and share links remain valid. Every record requires a unique non-empty string ID, `kind`, `src`, and `thumbnail`. No title, date, description, or location is needed. Missing thumbnails should be generated on the server rather than loading every full-size image in the grid.

The album endpoint must allow your website's origin if hosted elsewhere. Cross-origin downloads and persistent app media caching additionally require the media server's CORS permission; ordinary image/video viewing alone does not imply that permission. Media cache eligibility also requires a correct `Content-Type` and readable `Content-Length`. Use a same-origin endpoint for cookie-based access or signed media URLs for remote private files. Direct video files need browser-supported codecs, correct content types, and byte-range support. Expired signed links must be renewed by your server. No provider credentials are stored in the client.

## Code organization

- `App.tsx` owns album navigation, selection, and download actions. `AppHeader` and `AlbumIntro` contain their presentation.
- `Gallery` owns the 10-item rendering batches. `ViewerPhoto`, `VideoPlayer`, and `EmbedVideo` keep playback and gesture state with the active media.
- `Dialog` shares native modal focus handling, Escape dismissal, and scroll locking across the viewer and information dialogs.
- `InstallAppButton` handles installation. `PwaStatus` handles connection and app-update notices. `usePwaStatus` owns connection and update state so the notice can render in the gallery or viewer without re-registering the worker. `sw.ts` owns the app-shell/media cache; `lib/media-cache.ts` defines its eligibility rules and limits. `lib/album-cache.ts` saves the validated album snapshot.
- `useMemories` and `useFavorites` connect React to fetching and browser storage; `lib/` holds media validation and download helpers.

Keep derived values out of state, update user actions in event handlers, and use effects for browser/network synchronization with cleanup. Media components use keys to reset local state when their source changes. Loading and theme transitions use a single status instead of overlapping flags. References: [React state structure](https://react.dev/learn/choosing-the-state-structure), [effects guidance](https://react.dev/learn/you-might-not-need-an-effect).

## Checks

```sh
npm run typecheck
```

TypeScript checks cover the React app and service worker separately. URL decoding, manifest validation, favorite persistence/filtering, download helpers, and media-cache eligibility have been checked without starting a server. Real provider playback, authentication, and CORS need to be verified against your eventual server.

Project workflow: do not run `npm run build` for testing or start localhost automatically. Ask the owner to check UI changes locally.

## Sample credits

Photos are public stock images from Unsplash, used as visual placeholders. They depict Thailand and do not document the family's actual trip. The flower clip is the CC0 demo video from [MDN](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4); its illustrated thumbnail is a placeholder. All sample assets are stored locally so gallery viewing does not contact a photo service.

Photo source identifiers: `photo-1508009603885-50cf7c579365`, `photo-1528181304800-259b08848526`, `photo-1552465011-b4e21bf6e79a`, `photo-1563492065599-3520f775eeed`, `photo-1520250497591-112f2f40a3f4`, `photo-1519451241324-20b4ea2c4220`, `photo-1504214208698-ea1916a2195a`, `photo-1523731407965-2430cd12f5e4`, `photo-1512553353614-82a7370096dc`, `photo-1559314809-0d155014e29e`.
