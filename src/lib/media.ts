import type { Memory } from "../data/memories";

export type MediaLink = string | { value: string; encoding: "uri" | "base64" };

// Decode only explicit wrappers. Decoding an ordinary signed URL can break its signature.
export function resolveMediaUrl(link: MediaLink | undefined): string | null {
  if (!link) return null;
  try {
    let value: string;
    if (typeof link === "string") value = link;
    else if (typeof link !== "object" || typeof link.value !== "string")
      return null;
    else if (link.encoding === "uri") value = decodeURIComponent(link.value);
    else if (link.encoding === "base64") {
      const encoded = link.value.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(encoded), (character) =>
        character.charCodeAt(0),
      );
      value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } else return null;

    value = value.trim();
    if (!value || /[\u0000-\u001f\u007f\\<>]/.test(value)) return null;
    const url = new URL(value, "https://local.invalid");
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return value;
  } catch {
    return null;
  }
}

export function isEmbeddedVideo(memory: Memory) {
  return memory.kind === "video" && memory.playback === "iframe";
}

export function getDownloadUrl(memory: Memory) {
  return resolveMediaUrl(
    memory.downloadUrl ?? (isEmbeddedVideo(memory) ? undefined : memory.src),
  );
}

export function parseMemories(value: unknown, baseUrl?: string): Memory[] {
  if (!Array.isArray(value))
    throw new Error("The album response must be a list of media.");
  const ids = new Set<string>();
  function resolveLink(link: unknown) {
    const url = resolveMediaUrl(link as MediaLink);
    return url && baseUrl && !/^https?:/i.test(url)
      ? new URL(url, baseUrl).href
      : url;
  }
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object")
      throw new Error("An album item is invalid.");
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string" || !item.id.trim() || ids.has(item.id)) {
      throw new Error("Every album item needs a unique, stable ID.");
    }
    if (item.kind !== "photo" && item.kind !== "video")
      throw new Error("An album item has an unknown media type.");
    if (
      item.playback != null &&
      (item.kind !== "video" ||
        !["file", "iframe"].includes(String(item.playback)))
    ) {
      throw new Error("The video playback type is invalid.");
    }
    const src = resolveLink(item.src);
    const thumbnail = resolveLink(item.thumbnail);
    const thumbnailLarge =
      item.thumbnailLarge == null
        ? undefined
        : resolveLink(item.thumbnailLarge);
    const downloadUrl =
      item.downloadUrl == null
        ? undefined
        : resolveLink(item.downloadUrl);
    if (!src || !thumbnail || thumbnailLarge === null || downloadUrl === null)
      throw new Error("An album item has an invalid media link.");
    ids.add(item.id);
    return {
      id: item.id,
      kind: item.kind,
      src,
      thumbnail,
      ...(thumbnailLarge ? { thumbnailLarge } : {}),
      ...(downloadUrl ? { downloadUrl } : {}),
      ...(item.playback
        ? { playback: item.playback as "file" | "iframe" }
        : {}),
    };
  });
}
