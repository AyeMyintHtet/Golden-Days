import ImageKit from "@imagekit/nodejs";
import media from "./media-index.json";
import type { AlbumEnvironment } from "./session";

export function createImageKitAlbum(env: AlbumEnvironment) {
  const imagekit = new ImageKit({ privateKey: env.IMAGEKIT_PRIVATE_KEY! });
  // Stable within a five-minute window, with at least fifteen minutes to load.
  const expiresAt = (Math.floor(Date.now() / 300_000) + 4) * 300_000;
  const signed = (
    file: string,
    transformation: Parameters<
      typeof imagekit.helper.buildSrc
    >[0]["transformation"],
    download = false,
  ) => {
    const signedUrl = imagekit.helper.buildSrc({
      urlEndpoint: env.VITE_IMAGEKIT_URL_ENDPOINT!,
      src: `/${file}`,
      transformationPosition: "path",
      transformation,
      signed: true,
      expiresIn: Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)),
    });
    if (!download) return signedUrl;
    // ImageKit excludes disposition flags from signature validation. Sign the
    // exact content URL first, then add these delivery-only parameters.
    const attachment = new URL(signedUrl);
    attachment.searchParams.set("ik-attachment", "true");
    attachment.searchParams.set(
      "ik-attachment-filename",
      file.replace(/\.[^.]+$/, ""),
    );
    return attachment.href;
  };
  const imageSize = (size: number) => [
    {
      width: size,
      height: size,
      crop: "at_max" as const,
      quality: 80,
      format: "webp" as const,
    },
  ];
  const items = media.map(({ file }) => {
    const video = file.endsWith(".mp4");
    return {
      id: file.replace(/\.[^.]+$/, ""),
      kind: video ? "video" : "photo",
      // A neutral local cover avoids spending video processing units on posters.
      thumbnail: video
        ? "/images/video-cover.svg"
        : signed(file, imageSize(320)),
      ...(video ? {} : { thumbnailLarge: signed(file, imageSize(640)) }),
      src: signed(file, video ? [{ original: true }] : imageSize(2560)),
      downloadUrl: signed(file, [{ original: true }], true),
      ...(video ? { playback: "file" } : {}),
    };
  });
  return { items, expiresAt };
}
