import { useRef, useState } from "react";
import type { MediaLink } from "../lib/media";
import MediaImage from "./MediaImage";

interface ViewerPhotoProps {
  src: MediaLink;
  label: string;
  onNavigate: (direction: number) => void;
}

export default function ViewerPhoto({
  src,
  label,
  onNavigate,
}: ViewerPhotoProps) {
  const [zoomed, setZoomed] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <MediaImage
      src={src}
      alt={label}
      className={zoomed ? "zoomed-photo" : ""}
      loading="eager"
      fetchPriority="high"
      retryable
      loadingEffect="three"
      onDoubleClick={() => setZoomed((current) => !current)}
      onTouchStart={(event) => {
        touchStart.current =
          event.touches.length === 1
            ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
            : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (
          !start ||
          zoomed ||
          event.touches.length ||
          !event.changedTouches.length
        )
          return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5)
          onNavigate(dx < 0 ? 1 : -1);
      }}
    />
  );
}
