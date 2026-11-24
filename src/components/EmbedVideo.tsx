import { useEffect, useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import type { MediaLink } from "../lib/media";
import MediaImage from "./MediaImage";

interface EmbedVideoProps {
  src: string;
  poster: MediaLink;
  label: string;
}

export default function EmbedVideo({ src, poster, label }: EmbedVideoProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );

  useEffect(() => {
    function stopWhenHidden() {
      if (document.hidden) {
        setStatus("idle");
      }
    }
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", stopWhenHidden);
  }, []);

  return (
    <div className="embed-player">
      <div className="embed-frame">
        {status === "idle" ? (
          <button
            className="embed-start"
            onClick={() => {
              setStatus("loading");
            }}
            aria-label={`Open player for ${label}`}
          >
            <MediaImage src={poster} alt="" loading="eager" />
            <span className="embed-play-label">
              <Play size={24} fill="currentColor" aria-hidden="true" />
              <span>Open video player</span>
            </span>
          </button>
        ) : status === "error" ? (
          <div className="viewer-error">
            <p>This video couldn’t load.</p>
            <button
              className="button button-gold"
              onClick={() => setStatus("idle")}
            >
              Try again
            </button>
          </div>
        ) : (
          <iframe
            src={src}
            title={label}
            loading="lazy"
            allow="fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setStatus("ready")}
            onError={() => {
              setStatus("error");
            }}
          />
        )}
        {status === "loading" && (
          <span className="video-buffering" role="status">
            <LoaderCircle className="spin" size={24} />
            <span className="sr-only">Loading video player</span>
          </span>
        )}
      </div>
      <a
        className="embed-external"
        href={src}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open video in a new tab
      </a>
    </div>
  );
}
