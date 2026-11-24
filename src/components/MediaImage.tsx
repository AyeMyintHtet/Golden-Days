import { useCallback, useState, type ImgHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { ImageOff } from "lucide-react";
import { Image as ImageKitImage } from "@imagekit/react";
import { resolveMediaUrl, type MediaLink } from "../lib/media";
import { forgetCachedMedia } from "../lib/media-cache";
import { imageKitSource } from "../lib/imagekit";
import MemoryLoader from "./MemoryLoader";

interface MediaImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width"
> {
  width?: number;
  src: MediaLink;
  alt: string;
  retryable?: boolean;
  loadingEffect?: "shimmer" | "three";
}

export default function MediaImage({ src, ...props }: MediaImageProps) {
  const resolvedSrc = resolveMediaUrl(src);
  return <ImageContent key={resolvedSrc} {...props} src={resolvedSrc} />;
}

function ImageContent({
  src,
  alt,
  className = "",
  loading = "lazy",
  retryable = false,
  loadingEffect = "shimmer",
  srcSet,
  sizes,
  onLoad,
  onError,
  ...imageProps
}: Omit<MediaImageProps, "src"> & { src: string | null }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error",
  );
  const [attempt, setAttempt] = useState(0);
  const captureImage = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) setStatus("loaded");
  }, []);
  const imagekit = imageKitSource(src);
  const Picture = imagekit ? ImageKitImage : "img";

  return (
    <span className={`media-image ${className}`} data-status={status}>
      {status === "loading" &&
        (loadingEffect === "three" ? (
          <MemoryLoader compact />
        ) : (
          <span className="image-skeleton" aria-hidden="true" />
        ))}
      {status === "error" && (
        <span className="image-fallback">
          <ImageOff size={24} aria-hidden="true" />
          <span>{t("media.imageUnavailable")}</span>
          {retryable && src && (
            <button
              className="button button-gold"
              onClick={async () => {
                setStatus("loading");
                await forgetCachedMedia(src, "image");
                setAttempt((current) => current + 1);
              }}
            >
              {t("common.tryAgain")}
            </button>
          )}
        </span>
      )}
      {src && (
        <picture key={`${src}:${attempt}`}>
          {srcSet && <source srcSet={srcSet} sizes={sizes} />}
          <Picture
            {...imageProps}
            ref={captureImage}
            {...(imagekit
              ? {
                  ...imagekit,
                  responsive: false,
                  crossOrigin: "anonymous" as const,
                }
              : { src })}
            alt={alt}
            loading={loading}
            decoding="async"
            onLoad={(event) => {
              setStatus("loaded");
              onLoad?.(event);
            }}
            onError={(event) => {
              setStatus("error");
              onError?.(event);
            }}
          />
        </picture>
      )}
    </span>
  );
}
