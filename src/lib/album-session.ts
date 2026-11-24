const ACCESS_UNTIL = "golden-days:offline-until";
export const SIGNED_OUT = "golden-days:signed-out";
let accessDenied = false;

export function enablePrivateMediaCache() {
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.controller?.postMessage({
      type: ENABLE_PRIVATE_MEDIA,
    });
}

export async function clearPrivateAlbumData() {
  // Stop in-flight worker writes before acknowledging the purge.
  const worker =
    "serviceWorker" in navigator && navigator.serviceWorker.controller;
  if (worker) {
    await new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      const finish = () => {
        window.clearTimeout(timeout);
        channel.port1.close();
        resolve();
      };
      const timeout = window.setTimeout(finish, 2000);
      channel.port1.onmessage = finish;
      worker.postMessage({ type: CLEAR_PRIVATE_MEDIA }, [channel.port2]);
    }).catch(() => {});
  }
  try {
    if (!("caches" in globalThis)) return;
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => /^golden-days-(images|videos|album)-/.test(name))
        .map((name) => caches.delete(name)),
    );
  } catch {
    /* A blocked storage API must not prevent signing out. */
  }
}

export function offlineAccessUntil() {
  try {
    return localStorage.getItem(SIGNED_OUT) === "1"
      ? 0
      : Number(localStorage.getItem(ACCESS_UNTIL)) || 0;
  } catch {
    return 0;
  }
}

export function explicitlySignedOut() {
  if (accessDenied) return true;
  try {
    return localStorage.getItem(SIGNED_OUT) === "1";
  } catch {
    return false;
  }
}

export function rememberAccess(expiresAt: number) {
  accessDenied = false;
  try {
    localStorage.removeItem(SIGNED_OUT);
    localStorage.setItem(ACCESS_UNTIL, String(expiresAt));
  } catch {
    /* Cookies still work when optional offline storage is blocked. */
  }
}

export function forgetAccess() {
  accessDenied = true;
  try {
    localStorage.removeItem(ACCESS_UNTIL);
    localStorage.setItem(SIGNED_OUT, "1");
  } catch {
    /* The server session is still signed out when connected. */
  }
}

export async function sessionRequest(
  action: "session" | "login" | "logout",
  password?: string,
  signal?: AbortSignal,
) {
  const url = new URL(
    import.meta.env.VITE_MEDIA_URL || "/api/album",
    location.href,
  );
  if (url.origin !== location.origin)
    throw new Error("Family sign-in requires a same-origin album endpoint.");
  url.searchParams.set("action", action);
  return fetch(url, {
    method: action === "session" ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(action === "login" ? { "Content-Type": "application/json" } : {}),
    },
    ...(action === "login" ? { body: JSON.stringify({ password }) } : {}),
    signal,
  });
}
import { CLEAR_PRIVATE_MEDIA, ENABLE_PRIVATE_MEDIA } from "./media-cache";
