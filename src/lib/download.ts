import type { Memory } from "../data/memories";
import { getDownloadUrl } from "./media";
import { imageKitSource } from "./imagekit";
import i18n from "../i18n";

class DownloadError extends Error {}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function filename(memory: Memory, url: string, blob: Blob) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  let extension = extensions[blob.type.split(";")[0].toLowerCase()];
  if (!extension) {
    try {
      const path = decodeURIComponent(
        new URL(url, window.location.origin).pathname,
      );
      extension =
        path
          .match(/\.(jpe?g|png|webp|avif|gif|mp4|webm|mov)$/i)?.[1]
          .toLowerCase() ?? "";
    } catch {
      /* Extensionless endpoints use a media-type fallback. */
    }
  }
  const id = memory.id.replace(/[^a-zA-Z0-9_-]/g, "_") || "memory";
  return `${memory.kind}-${id}.${extension || (memory.kind === "video" ? "mp4" : "jpg")}`;
}

export async function downloadMemories(
  items: Memory[],
  onProgress?: (completed: number, total: number) => void,
) {
  if (!items.length) return;
  if (items.length === 1) {
    const url = getDownloadUrl(items[0]);
    // ImageKit's signed attachment response lets the browser stream large
    // originals straight to disk, without buffering a video in phone memory.
    if (
      url &&
      imageKitSource(url) &&
      new URL(url).searchParams.get("ik-attachment") === "true"
    ) {
      const link = document.createElement("a");
      link.href = url;
      link.rel = "noopener noreferrer";
      link.target = "_blank";
      document.body.append(link);
      link.click();
      link.remove();
      return;
    }
  }
  const maxBytes = 32 * 1024 * 1024;
  const limitMessage = i18n.t("download.limit");
  if (items.length > 20) throw new DownloadError(limitMessage);
  const urls = items.map((memory) => {
    const url = getDownloadUrl(memory);
    if (!url) throw new DownloadError(i18n.t("download.noFile"));
    return { memory, url };
  });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  let receivedBytes = 0;
  let completed = 0;
  async function fetchFile(url: string) {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new DownloadError(i18n.t("download.fileError"));
    const contentType =
      response.headers.get("Content-Type")?.toLowerCase() ?? "";
    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json")
    ) {
      throw new DownloadError(i18n.t("download.pageLink"));
    }
    const declaredBytes = Number(response.headers.get("Content-Length"));
    if (
      Number.isFinite(declaredBytes) &&
      declaredBytes > maxBytes - receivedBytes
    )
      throw new DownloadError(limitMessage);
    let blob: Blob;
    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          receivedBytes += value.byteLength;
          if (receivedBytes > maxBytes) throw new DownloadError(limitMessage);
          chunks.push(value);
        }
        blob = new Blob(chunks, { type: contentType });
      } finally {
        reader.releaseLock();
      }
    } else {
      // Do not buffer an unknown-size file on browsers without streaming bodies.
      if (!(declaredBytes > 0)) throw new DownloadError(limitMessage);
      blob = await response.blob();
      receivedBytes += blob.size;
      if (receivedBytes > maxBytes) throw new DownloadError(limitMessage);
    }
    if (controller.signal.aborted)
      throw new DOMException(i18n.t("download.error"), "AbortError");
    onProgress?.(++completed, items.length);
    return blob;
  }

  try {
    if (items.length === 1) {
      const { memory, url } = urls[0];
      const blob = await fetchFile(url);
      saveBlob(blob, filename(memory, url, blob));
      return;
    }

    const entries: Record<string, Uint8Array> = {};
    // Bound simultaneous requests instead of fetching an entire album at once.
    for (let offset = 0; offset < urls.length; offset += 3) {
      await Promise.all(
        urls.slice(offset, offset + 3).map(async ({ memory, url }) => {
          const blob = await fetchFile(url);
          entries[filename(memory, url, blob)] = new Uint8Array(
            await blob.arrayBuffer(),
          );
        }),
      );
    }
    const { zip } = await import("fflate");
    const archive = await new Promise<Uint8Array>((resolve, reject) => {
      zip(entries, { level: 0 }, (error, data) =>
        error ? reject(error) : resolve(data),
      );
    });
    saveBlob(
      new Blob([archive], { type: "application/zip" }),
      "golden-days-bangkok.zip",
    );
  } catch (error) {
    if (controller.signal.aborted)
      throw new DownloadError(i18n.t("download.timeout"));
    throw error instanceof DownloadError
      ? error
      : new DownloadError(i18n.t("download.error"));
  } finally {
    window.clearTimeout(timeout);
    controller.abort();
  }
}
