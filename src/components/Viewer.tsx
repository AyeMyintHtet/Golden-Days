import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Play,
  Share2,
  X,
} from "lucide-react";
import { type Memory } from "../data/memories";
import MediaImage from "./MediaImage";
import Dialog from "./Dialog";
import ViewerPhoto from "./ViewerPhoto";
import VideoPlayer from "./VideoPlayer";
import EmbedVideo from "./EmbedVideo";
import { getDownloadUrl, isEmbeddedVideo, resolveMediaUrl } from "../lib/media";

interface ViewerProps {
  children?: ReactNode;
  items: Memory[];
  currentId: string;
  favorites: string[];
  onChange: (id: string) => void;
  onClose: () => void;
  onFavorite: (id: string) => void;
  onDownload: (items: Memory[]) => void;
  onShare: (memory: Memory) => void;
}

export default function Viewer(props: ViewerProps) {
  const index = props.items.findIndex(
    (memory) => memory.id === props.currentId,
  );
  const memory = props.items[index];
  const filmstrip = useRef<HTMLElement>(null);
  const { items, currentId, onChange } = props;
  const step = useCallback(
    (direction: number) => {
      if (items.length > 1)
        onChange(items[(index + direction + items.length) % items.length].id);
    },
    [items, index, onChange],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("video, input, textarea, select")
      )
        return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        step(event.key === "ArrowRight" ? 1 : -1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);

  useEffect(() => {
    filmstrip.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentId]);

  if (!memory) return null;
  const favorite = props.favorites.includes(memory.id);
  const label = `${memory.kind === "video" ? "Video" : "Photo"} ${index + 1}`;
  const src = resolveMediaUrl(memory.src);
  const embedded = isEmbeddedVideo(memory);
  const downloadable = Boolean(getDownloadUrl(memory));
  const stripStart = Math.max(0, Math.min(index - 5, props.items.length - 11));
  const stripItems = props.items.slice(stripStart, stripStart + 11);

  return (
    <Dialog className="viewer-backdrop" label={label} onClose={props.onClose}>
      <motion.div
        className="viewer"
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 10, scale: 0.98 }}
      >
        <header className="viewer-header">
          <div>
            <span className="viewer-eyebrow">BANGKOK, TOGETHER</span>
            <span className="viewer-counter">
              {index + 1} <span>/ {props.items.length}</span>
            </span>
          </div>
          <div className="viewer-actions">
            <button
              className={`icon-button ${favorite ? "is-favorite" : ""}`}
              onClick={() => props.onFavorite(memory.id)}
              aria-label={
                favorite ? "Remove from favorites" : "Add to favorites"
              }
              aria-pressed={favorite}
            >
              <Heart size={20} fill={favorite ? "currentColor" : "none"} />
            </button>
            {downloadable && (
              <button
                className="icon-button"
                onClick={() => props.onDownload([memory])}
                aria-label="Download this memory"
              >
                <Download size={20} />
              </button>
            )}
            <button
              className="icon-button"
              onClick={() => props.onShare(memory)}
              aria-label="Share this memory"
            >
              <Share2 size={19} />
            </button>
            <span className="viewer-divider" />
            <button
              className="icon-button"
              onClick={props.onClose}
              aria-label="Close viewer"
            >
              <X size={23} />
            </button>
          </div>
        </header>

        <div className="viewer-stage">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="viewer-media"
              key={memory.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {!src ? (
                <div className="viewer-error">
                  <p>This media link is unavailable.</p>
                </div>
              ) : embedded ? (
                <EmbedVideo
                  key={src}
                  src={src}
                  poster={memory.thumbnail}
                  label={label}
                />
              ) : memory.kind === "video" ? (
                <VideoPlayer
                  key={src}
                  src={src}
                  poster={resolveMediaUrl(memory.thumbnail) ?? ""}
                  label={label}
                />
              ) : (
                <ViewerPhoto src={memory.src} label={label} onNavigate={step} />
              )}
            </motion.div>
          </AnimatePresence>
          {props.items.length > 1 && (
            <>
              <button
                className="viewer-nav previous"
                onClick={() => step(-1)}
                aria-label="Previous memory"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                className="viewer-nav next"
                onClick={() => step(1)}
                aria-label="Next memory"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}
        </div>

        <nav
          ref={filmstrip}
          className="viewer-filmstrip"
          aria-label="Choose a memory"
        >
          {stripItems.map((item, itemIndex) => (
            <button
              key={item.id}
              className={`filmstrip-item ${item.id === memory.id ? "active" : ""}`}
              aria-label={`View ${item.kind === "video" ? "video" : "photo"} ${stripStart + itemIndex + 1}`}
              aria-current={item.id === memory.id ? "true" : undefined}
              onClick={() => props.onChange(item.id)}
            >
              <MediaImage
                src={item.thumbnail}
                alt=""
                loading="lazy"
                fetchPriority="low"
              />
              {item.kind === "video" && <Play size={14} fill="currentColor" />}
            </button>
          ))}
        </nav>
      </motion.div>
      {props.children}
    </Dialog>
  );
}
