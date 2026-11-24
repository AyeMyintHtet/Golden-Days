import { useEffect, useState } from "react";
import { memories as sampleMemories, type Memory } from "../data/memories";
import { parseMemories, resolveMediaUrl } from "../lib/media";
import {
  forgetSavedAlbum,
  readSavedAlbum,
  saveAlbum,
} from "../lib/album-cache";

export function useMemories() {
  const endpoint = import.meta.env.VITE_MEDIA_URL?.trim();
  const [album, setAlbum] = useState<{
    items: Memory[];
    status: "loading" | "ready" | "saved" | "error";
  }>(() => ({
    items: endpoint ? [] : sampleMemories,
    status: endpoint ? "loading" : "ready",
  }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    let active = true;
    let timeout: number | undefined;
    let cacheTimeout: number | undefined;
    setAlbum((current) =>
      current.items.length ? current : { ...current, status: "loading" },
    );
    async function load() {
      let saved: Memory[] | null = null;
      try {
        const resolved = resolveMediaUrl(endpoint);
        if (!resolved) throw new Error("Invalid album endpoint");
        const url = new URL(resolved, window.location.href).href;
        // A blocked storage API must not hold up the live album request.
        saved = await Promise.race([
          readSavedAlbum(url),
          new Promise<null>((resolve) => {
            cacheTimeout = window.setTimeout(() => resolve(null), 1000);
          }),
        ]);
        window.clearTimeout(cacheTimeout);
        if (!active) return;
        if (!navigator.onLine) {
          setAlbum(
            saved !== null
              ? { items: saved, status: "saved" }
              : { items: [], status: "error" },
          );
          return;
        }
        if (saved !== null) setAlbum({ items: saved, status: "ready" });
        timeout = window.setTimeout(() => controller.abort(), 15_000);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });
        if (!response.ok) {
          // Do not restore a revoked or deleted album from its old snapshot.
          if ([401, 403, 404, 410].includes(response.status)) {
            saved = null;
            void forgetSavedAlbum(url);
          }
          throw new Error("Album request failed");
        }
        const items = parseMemories(await response.json(), url);
        if (!active || controller.signal.aborted) return;
        setAlbum({ items, status: "ready" });
        void saveAlbum(url, items, response.headers.get("Cache-Control"));
      } catch {
        if (active)
          setAlbum(
            saved !== null
              ? { items: saved, status: "saved" }
              : { items: [], status: "error" },
          );
      } finally {
        window.clearTimeout(cacheTimeout);
        window.clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      active = false;
      window.clearTimeout(cacheTimeout);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [endpoint, attempt]);

  useEffect(() => {
    if (!endpoint) return;
    function reconnect() {
      setAttempt((current) => current + 1);
    }
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [endpoint]);

  return {
    memories: album.items,
    loading: album.status === "loading",
    error: album.status === "error",
    usingSavedAlbum: album.status === "saved",
    retry: () => setAttempt((current) => current + 1),
  };
}
