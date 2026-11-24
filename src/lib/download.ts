import type { Memory } from "../data/memories";
import { getDownloadUrl } from "./media";

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
  const maxBytes = 32 * 1024 * 1024;
  const limitMessage =
    "Choose fewer or smaller files: up to 20 files and 32 MB per download.";
  if (items.length > 20) throw new Error(limitMessage);
  const urls = items.map((memory) => {
    const url = getDownloadUrl(memory);
    if (!url) throw new Error("This video does not have a downloadable file.");
    return { memory, url };
  });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  let receivedBytes = 0;
  let completed = 0;
  async function fetchFile(url: string) {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error("This file could not be downloaded. Please try again.");
    const contentType =
      response.headers.get("Content-Type")?.toLowerCase() ?? "";
    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json")
    ) {
      throw new Error(
        "This link opens a page instead of a downloadable media file.",
      );
    }
    const declaredBytes = Number(response.headers.get("Content-Length"));
    if (
      Number.isFinite(declaredBytes) &&
      declaredBytes > maxBytes - receivedBytes
    )
      throw new Error(limitMessage);
    let blob: Blob;
    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          receivedBytes += value.byteLength;
          if (receivedBytes > maxBytes) throw new Error(limitMessage);
          chunks.push(value);
        }
        blob = new Blob(chunks, { type: contentType });
      } finally {
        reader.releaseLock();
      }
    } else {
      // Do not buffer an unknown-size file on browsers without streaming bodies.
      if (!(declaredBytes > 0)) throw new Error(limitMessage);
      blob = await response.blob();
      receivedBytes += blob.size;
      if (receivedBytes > maxBytes) throw new Error(limitMessage);
    }
    if (controller.signal.aborted)
      throw new DOMException("Download cancelled", "AbortError");
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
      throw new Error(
        "The download took too long. Please try a smaller selection.",
      );
    throw error;
  } finally {
    window.clearTimeout(timeout);
    controller.abort();
  }
}
