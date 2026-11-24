export const imageKitEndpoint =
  import.meta.env?.VITE_IMAGEKIT_URL_ENDPOINT?.trim() ?? "";

export function imageKitSource(
  src: string | null,
  configuredEndpoint = imageKitEndpoint,
) {
  if (!src || !configuredEndpoint) return null;
  try {
    const url = new URL(src);
    const endpoint = new URL(configuredEndpoint);
    const prefix = endpoint.pathname.replace(/\/$/, "") + "/";
    if (url.origin !== endpoint.origin || !url.pathname.startsWith(prefix))
      return null;
    // The server already signed each exact variant. Never add client transforms
    // or new responsive widths to these URLs, which would break the signature.
    return {
      src: url.origin + url.pathname,
      queryParameters: Object.fromEntries(url.searchParams),
    };
  } catch {
    return null;
  }
}
