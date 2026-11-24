import { AnimatePresence, motion } from "motion/react";
import { Check, Download, Heart, Images, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Memory } from "../data/memories";
import MediaImage from "./MediaImage";
import { getDownloadUrl, resolveMediaUrl } from "../lib/media";

const PAGE_SIZE = 10;

interface GalleryProps {
  items: Memory[];
  favorites: string[];
  selected: Set<string>;
  selecting: boolean;
  compact: boolean;
  onOpen: (id: string) => void;
  onFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  onDownload: (items: Memory[]) => void;
  onReset: () => void;
}

interface MemoryCardProps extends Omit<GalleryProps, "items" | "onReset"> {
  memory: Memory;
  index: number;
  featuredLoading: boolean;
}

function MemoryCard({
  memory,
  index,
  featuredLoading,
  ...props
}: MemoryCardProps) {
  const { t } = useTranslation();
  const favorite = props.favorites.includes(memory.id);
  const selected = props.selected.has(memory.id);
  const label = t(
    memory.kind === "video" ? "media.videoLabel" : "media.photoLabel",
    { number: index + 1 },
  );
  const downloadable = Boolean(getDownloadUrl(memory));
  const thumbnail = resolveMediaUrl(memory.thumbnail);
  const thumbnailLarge = resolveMediaUrl(memory.thumbnailLarge);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, delay: Math.min(index, 7) * 0.035 }}
      className={`memory-card ${selected ? "is-selected" : ""}`}
    >
      <button
        className="memory-open"
        disabled={props.selecting && !downloadable}
        onClick={() =>
          props.selecting ? props.onSelect(memory.id) : props.onOpen(memory.id)
        }
        aria-label={
          props.selecting
            ? t(selected ? "media.deselect" : "media.select", { label })
            : t("media.open", { label })
        }
        aria-pressed={props.selecting ? selected : undefined}
      >
        <MediaImage
          src={memory.thumbnail}
          srcSet={
            thumbnail && thumbnailLarge
              ? `${thumbnail} 320w, ${thumbnailLarge} 640w`
              : undefined
          }
          sizes={
            props.compact
              ? "(min-width: 1150px) 18vw, (min-width: 700px) 25vw, 33vw"
              : "(min-width: 1150px) 23vw, (min-width: 700px) 33vw, 50vw"
          }
          alt={label}
          loadingEffect={featuredLoading ? "three" : "shimmer"}
          loading={index < 2 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : "auto"}
        />
        {memory.kind === "video" && (
          <span className="video-play">
            <Play size={21} fill="currentColor" />
          </span>
        )}
      </button>
      {props.selecting ? (
        downloadable && (
          <button
            className={`selection-check ${selected ? "checked" : ""}`}
            aria-label={t(selected ? "media.deselect" : "media.select", {
              label,
            })}
            aria-pressed={selected}
            onClick={() => props.onSelect(memory.id)}
          >
            {selected && <Check size={16} />}
          </button>
        )
      ) : (
        <div className="card-actions">
          <button
            className={`card-action favorite-action ${favorite ? "is-favorite" : ""}`}
            aria-label={t(
              favorite ? "media.removeFavorite" : "media.saveFavorite",
              { label },
            )}
            aria-pressed={favorite}
            onClick={() => props.onFavorite(memory.id)}
          >
            <Heart size={16} fill={favorite ? "currentColor" : "none"} />
          </button>
          {downloadable && (
            <button
              className="card-action download-action"
              aria-label={t("media.download", { label })}
              onClick={() => props.onDownload([memory])}
            >
              <Download size={16} />
            </button>
          )}
        </div>
      )}
    </motion.article>
  );
}

export default function Gallery(props: GalleryProps) {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [autoLoad, setAutoLoad] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const visibleItems = props.items.slice(0, visibleCount);
  const firstPhotoIndex = visibleItems.findIndex(
    (memory) => memory.kind === "photo",
  );
  const hasMore = visibleItems.length < props.items.length;

  useEffect(() => {
    // Keep the first view capped at ten, even when the sentinel starts nearby.
    function enableAutoLoad() {
      setAutoLoad(true);
    }
    window.addEventListener("scroll", enableAutoLoad, {
      passive: true,
      once: true,
    });
    return () => window.removeEventListener("scroll", enableAutoLoad);
  }, []);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || !autoLoad || !("IntersectionObserver" in window))
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, autoLoad, visibleCount, props.items.length]);

  if (!props.items.length)
    return (
      <motion.div
        className="empty-state"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className="empty-icon">
          <Images size={31} strokeWidth={1.3} />
        </span>
        <h2>{t("library.emptyTitle")}</h2>
        <p>{t("library.emptyDescription")}</p>
        <button className="button button-gold" onClick={props.onReset}>
          {t("library.showAll")}
        </button>
      </motion.div>
    );

  return (
    <div className={`gallery ${props.compact ? "is-compact" : ""}`}>
      <div className="memory-grid">
        <AnimatePresence>
          {visibleItems.map((memory, index) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              index={index}
              featuredLoading={index === firstPhotoIndex}
              favorites={props.favorites}
              selected={props.selected}
              selecting={props.selecting}
              compact={props.compact}
              onOpen={props.onOpen}
              onFavorite={props.onFavorite}
              onSelect={props.onSelect}
              onDownload={props.onDownload}
            />
          ))}
        </AnimatePresence>
      </div>
      {hasMore && (
        <div ref={loadMoreRef} className="gallery-more">
          <button
            className="button button-outline"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            {t("library.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
