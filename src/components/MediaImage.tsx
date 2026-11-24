import { useCallback, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { resolveMediaUrl, type MediaLink } from "../lib/media";
import { forgetCachedMedia } from "../lib/media-cache";

interface MediaImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  src: MediaLink;
  alt: string;
  retryable?: boolean;
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
  onLoad,
  onError,
  ...imageProps
}: Omit<MediaImageProps, "src"> & { src: string | null }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error",
  );
  const [attempt, setAttempt] = useState(0);
  const captureImage = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) setStatus("loaded");
  }, []);

  return (
    <span className={`media-image ${className}`} data-status={status}>
      {status === "loading" && (
        <span className="image-skeleton" aria-hidden="true" />
      )}
      {status === "error" && (
        <span className="image-fallback">
          <ImageOff size={24} aria-hidden="true" />
          <span>Image unavailable</span>
          {retryable && src && (
            <button
              className="button button-gold"
              onClick={async () => {
                setStatus("loading");
                await forgetCachedMedia(src, "image");
                setAttempt((current) => current + 1);
              }}
            >
              Try again
            </button>
          )}
        </span>
      )}
      {src && (
        <img
          {...imageProps}
          key={`${src}:${attempt}`}
          ref={captureImage}
          src={src}
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
      )}
    </span>
  );
}
