# Golden Days · Bangkok memories

A mobile-first React family album with a cream, gold, and latte theme, dark mode, an installable PWA, and private ImageKit media delivery.

## Current setup

- React 19, TypeScript, Vite, Motion, and Lucide.
- Official `@imagekit/react` image/video components and `@imagekit/nodejs` server-side URL signing.
- Vercel Node serverless function at `api/album.ts`. The same handler is available through Vite development middleware.
- `server/media-index.json` includes 560 numbered files: 527 WebP photos and 33 MP4 videos. `327.mp4` is intentionally omitted at the owner's request; its local copy is unchanged. Other IDs are not renumbered. IDs remain stable when links expire or renew, so favorites and shared album links survive refreshes.
- Three.js provides a small, lazy-loaded gold postcard loading animation.
- Workbox handles the app shell, limited media caching, and offline notices.

## Local configuration

`.env.local` is gitignored and excluded from Vercel source uploads. A local copy has been prepared with the endpoint and randomly generated family/session secrets. Keep these values private.

| Variable                     | Purpose                                               | Visible to the browser? |
| ---------------------------- | ----------------------------------------------------- | ----------------------- |
| `VITE_MEDIA_URL`             | `/api/album`                                          | Yes                     |
| `VITE_IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/goldendays/`                  | Yes                     |
| `VITE_AUTH_REQUIRED`         | `true` for the family album                           | Yes                     |
| `IMAGEKIT_PRIVATE_KEY`       | ImageKit signing key                                  | No, server only         |
| `ALBUM_PASSWORD`             | Shared family password, at least 16 characters        | No, server only         |
| `ALBUM_SESSION_SECRET`       | Random session-signing secret, at least 32 characters | No, server only         |

Putting a value in an environment file does not make it secret if its name starts with `VITE_`. Never give private keys or passwords that prefix. Do not commit or share `.env.local`.

For a fresh checkout, copy `.env.example` to `.env.local` and fill the three server-only values. A private key or password is never sent back in the API response. Incomplete configuration fails closed and shows an album setup notice.

Run these yourself when ready:

```sh
npm install
npm run dev
```

Restart your existing development server after changing environment variables. The app is available at the URL Vite prints. No development server or production build is started automatically.

## Required ImageKit settings

Before sharing the album, enable **Restrict unsigned URLs → Restrict all requests** separately for **images and videos** in ImageKit. Uploaded family files should be private. Marking files private alone can still allow named transformations; enforcing signatures on every request closes that path.

A React login page or an environment variable cannot protect an otherwise public ImageKit URL. Confirm that an unsigned link such as `/goldendays/3.webp` is rejected, and that a server-signed link works.

The backend signs only the files and fixed image variants in the local media index. It exposes no upload, arbitrary-path signing, or public private-key endpoint. Content remains hosted by ImageKit; these access controls are not end-to-end encryption.

Reference: [ImageKit React SDK](https://imagekit.io/docs/integration/react), [ImageKit media security](https://imagekit.io/docs/media-delivery-basic-security).

## Family sign-in

The album requires one shared family password. The server verifies it and issues a seven-day, HMAC-authenticated session cookie with `HttpOnly`, `SameSite=Strict`, and `Secure` on Vercel/production. The cookie is scoped to `/api`. The browser never receives the cookie token in JSON or stores a password in local storage.

Login and logout require same-origin POST requests. Other methods and cross-origin changes are rejected. Changing the family password or session secret invalidates existing sessions. Keep the generated high-entropy password; for additional abuse protection, Vercel Firewall can rate-limit the login endpoint.

Signed media URLs are valid for approximately 15–20 minutes. The app refreshes its manifest before expiry and when returning from the background. URL signatures remain unchanged when passed through the React SDK. Signatures are bearer access: a copied valid link can be used until it expires.

Signing out removes the app's saved album and media caches, stops new cache writes, and signs out other open tabs. It cannot delete downloaded files, screenshots, or every copy retained by the browser's HTTP cache.

## Vercel deployment

Create a Vercel project with this directory as its root and the Vite framework preset. Add the environment variables from `.env.example` to the project's production environment; enter real private values only in Vercel's environment settings. Include preview values only if previews should access the family album.

Vercel deploys `api/album.ts` as a Node function and the Vite output as static files. `vercel.json` adds content security, no-referrer, framing, and MIME-sniffing protections and keeps the service worker and manifest updateable. The theme initializer is a local script so the policy does not need inline JavaScript.

No deployment has been performed automatically. Verify the deployed HTTPS app on your family's actual Myanmar networks before relying on it.

## Media delivery and downloads

- The first gallery batch contains at most 10 records. Scrolling near its end adds another 10, with a manual load-more fallback. Filtering resets the visible batch.
- Only visible thumbnails load. The first visible photo is prioritized; full viewing images load only when opened.
- Each photo has server-signed 320 px and 640 px previews. The browser chooses between them using native `picture`/`srcset` sizing. The SDK's automatic responsive transformations are disabled for already signed URLs because changing a transformation would invalidate its signature.
- Viewer images fit within a 2560 px square to limit decoded memory on phones. Original dimensions and bytes remain available through the download button.
- Videos use their already converted H.264/AAC MP4 files with `orig-true`, `preload="none"`, manual playback, and a neutral local cover. No video thumbnails or transcodes are requested from ImageKit, avoiding extra video processing units. Uploaded video posters can be added later.
- Video playback pauses when hidden and releases its source when closed. Iframe video records remain supported for other providers.
- Single ImageKit downloads use attachment URLs and the browser's download manager, allowing large originals without buffering them in JavaScript. Delivery-only attachment flags are added after signing the content URL, matching ImageKit's signature validation.
- Selected ZIP downloads remain limited to 20 files and 32 MiB, with at most three concurrent requests, a timeout, and lazy-loaded ZIP code.

To regenerate the file list after changing local files:

```sh
npm run media:index -- /absolute/path/to/bkk-fam-after-compile
```

This records filenames and sizes without copying personal media into the project. Uploads on ImageKit must match these exact names. Free ImageKit accounts currently limit each video upload to 100 MB; larger files need a smaller website copy or a suitable plan.

Reference: [Original delivery and attachment downloads](https://imagekit.io/docs/core-delivery-features).

## Extra videos still on your phone

1. AirDrop the originals into a separate folder on your Mac.
2. Make H.264/AAC MP4 website copies, normally at 1080p/30 fps. On ImageKit Free, each video must be under 100 MB; the limit is per file. Keep the originals separate.
3. Continue numbering from `562.mp4`. Do not rename the existing files or reuse `327`, which is intentionally excluded.
4. Add the new numbered copies to the compiled folder and upload them to ImageKit under exactly the same filenames, with no random filename suffix. Stay within the account's total storage allowance.
5. Run `npm run media:index -- /absolute/path/to/bkk-fam-after-compile` and redeploy the project. The gallery counts and filters update from the index, while existing favorite IDs remain unchanged.

## Loading animation and phone performance

The featured gallery photo, active viewer, and album-opening state use the gold 3D postcard loader. Ordinary tiles retain inexpensive shimmer placeholders. Three.js loads only when a loader lasts over 250 ms; cached images avoid that download. The large 3D chunks are excluded from installation precaching.

The scene is 160 px, capped at 30 frames per second and a 1.5 pixel ratio, pauses when hidden, and disposes its GPU resources when removed. Reduced motion, Data Saver, reported low memory/CPU capability, unsupported WebGL, and chunk-loading failures use a CSS fallback. The gallery does not create a WebGL renderer for each image.

The mobile layout retains its glass bottom navigation. Desktop retains the sidebar. Light/dark themes, the curtain transition, favorites, keyboard navigation, touch swipes, selection, and share links remain available.

## PWA, saved media, and privacy

On Android/desktop, use the app's install button or supported browser menu. On iPhone/iPad, use Safari → Share → Add to Home Screen. Installation and production offline behavior require HTTPS. For a separate local PWA check, run `npm run dev:pwa` yourself; its default port is 5174.

The service worker caches the app shell, local fonts, and icons. It saves media only after use, never the whole album in advance. Previously viewed eligible photos remain available offline on a previously signed-in device until the local session expires or data is removed. A visible offline notice remains in the album and viewer.

| Saved media            | Bound                                |
| ---------------------- | ------------------------------------ |
| Images                 | 180 files, 2 MiB each, up to 30 days |
| Complete direct videos | 2 files, 8 MiB each, up to 7 days    |
| Album manifest         | One validated local snapshot         |

Private signed ImageKit responses use `must-revalidate`. The worker rejects expired signed URLs while online. To provide the requested offline viewing, this app deliberately keeps eligible already-authorized copies on the signed-in device for offline use; link expiry does not erase saved bytes. This is application-managed offline storage, not a guarantee of remote revocation. Other providers retain the stricter cache policy; `no-store`, `no-cache`, zero-age, partial, oversized, failed, and unreadable responses are not saved.

A failed server connection can reuse a saved album. A 401/403 signs the app out and clears saved private data. Deleted or revoked manifests are not restored. Sign-out prevents late worker and manifest writes from recreating those caches. The non-secret offline-expiry marker in local storage is only a UI allowance for saved copies; the server always verifies the HttpOnly cookie for new URLs.

Small completed videos may receive a bounded background cache fill. Data Saver, slow networks, low-memory hints, and the 8 MiB limit disable or constrain this. A fill may make one additional full request. Large videos stream without persistent app caching. Browsers can evict all site storage; this cache is not a backup.

## Checks

```sh
npm run typecheck
npm run test:security
```

The security tests use fake credentials and in-memory requests. They open no server port, contact no media provider, and cover unauthorized access, configuration failures, CSRF, session cookies/tampering, secret rotation, signed variants, React SDK URL preservation, download signing, and cache policy limits.

Project workflow: do not run `npm run build` as a test, and do not start localhost automatically. Ask the owner to check UI changes. Actual iPhone/Android playback, the 3D fallback, installation, offline re-entry, multi-tab sign-out, and downloads still require the owner's browser checks.

## Code organization

- `api/album.ts`: Vercel entry point; `server/` owns authentication, signing, and the media index.
- `AlbumAccess`: sign-in and session lifecycle; `album-session.ts` owns browser session requests and local-data cleanup.
- `useMemories`: validated manifest loading, renewal, reconnects, and offline fallback.
- `MediaImage`, `VideoPlayer`, and `AlbumIntro`: official React SDK integration with native lazy loading.
- `MemoryLoader` and `MemoryScene`: delayed, isolated 3D loading with a static fallback.
- `Gallery` and `Viewer`: visible batches and a bounded filmstrip; `useFavorites` keeps IDs browser-local.
- `sw.ts`, `media-cache.ts`, and `album-cache.ts`: offline behavior and bounded storage.

The old local sample records remain available for development when the album endpoint is explicitly unset and family authentication is disabled. They are public stock placeholders, not the family's actual trip. The live configuration uses ImageKit and never falls back to sample images after an API failure.
