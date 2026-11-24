import { useEffect, useRef, useState } from "react";
import { Video as ImageKitVideo } from "@imagekit/react";
import { imageKitSource } from "../lib/imagekit";
import MemoryLoader from "./MemoryLoader";
import {
  CACHE_VIDEO,
  canWarmVideo,
  forgetCachedMedia,
} from "../lib/media-cache";

interface VideoPlayerProps {
  src: string;
  poster: string;
  label: string;
}

export default function VideoPlayer({ src, poster, label }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cors, setCors] = useState(true);
  const imagekit = imageKitSource(src);
  const Video = imagekit ? ImageKitVideo : "video";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Restore the source after React Strict Mode's development cleanup, too.
    if (!video.getAttribute("src")) video.setAttribute("src", src);
    function pauseWhenHidden() {
      if (document.hidden) video?.pause();
    }
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, cors]);

  return (
    <div className="video-player">
      <Video
        key={cors ? "cors" : "direct"}
        ref={videoRef}
        crossOrigin={cors ? "anonymous" : undefined}
        {...(imagekit ?? { src })}
        poster={poster}
        controls
        playsInline
        preload="none"
        hidden={failed}
        aria-label={label}
        onPlay={() => setBuffering(true)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onPause={() => setBuffering(false)}
        onEnded={() => {
          setBuffering(false);
          if (cors && canWarmVideo(navigator) && "serviceWorker" in navigator)
            navigator.serviceWorker.controller?.postMessage({
              type: CACHE_VIDEO,
              url: src,
            });
        }}
        onError={() => {
          setBuffering(false);
          if (
            cors &&
            new URL(src, window.location.href).origin !== window.location.origin
          ) {
            setCors(false);
          } else {
            setFailed(true);
          }
        }}
      />
      {buffering && !failed && (
        <span className="video-buffering">
          <MemoryLoader label="Loading video…" compact />
        </span>
      )}
      {failed && (
        <div className="viewer-error">
          <p>This video couldn’t load.</p>
          <button
            className="button button-gold"
            onClick={async () => {
              setFailed(false);
              await forgetCachedMedia(src, "video");
              videoRef.current?.load();
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
