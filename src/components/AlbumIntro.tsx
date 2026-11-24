import { motion } from "motion/react";
import { Heart, Images, Sparkles, Sun } from "lucide-react";
import type { Memory } from "../data/memories";
import MediaImage from "./MediaImage";

interface AlbumIntroProps {
  photos: Memory[];
  total: number;
  loading: boolean;
  onOpen: (id: string) => void;
}

export default function AlbumIntro({
  photos,
  total,
  loading,
  onOpen,
}: AlbumIntroProps) {
  return (
    <motion.section
      className="album-intro"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      aria-label="Bangkok trip introduction"
    >
      <div className="intro-copy">
        <span className="eyebrow">
          <span className="little-line" /> ONE CITY. SO MANY LITTLE MEMORIES.
        </span>
        <h1>
          Bangkok, <em>together.</em>
          <span className="heading-sparkle">
            <Sparkles size={34} strokeWidth={1.1} />
          </span>
        </h1>
        <p>
          The places we went. The things we laughed at.
          <br className="desktop-break" /> The days we’ll keep coming back to.
        </p>
        <div className="album-meta">
          <span>
            <Images size={15} />
            {loading ? "Opening your album…" : `${total} little memories`}
          </span>
          <span className="meta-dot">·</span>
          <span>
            <Heart size={14} />
            One happy family
          </span>
        </div>
      </div>
      {photos.length > 0 && (
        <button
          className="intro-postcards"
          onClick={() => onOpen(photos[0].id)}
          aria-label="Open the Bangkok photo album"
        >
          <span className="postcard postcard-back">
            <MediaImage
              src={
                (photos[1] ?? photos[0]).thumbnailLarge ??
                (photos[1] ?? photos[0]).thumbnail
              }
              alt=""
              loading="lazy"
              fetchPriority="low"
            />
            <span>little adventures</span>
          </span>
          <span className="postcard postcard-front">
            <MediaImage
              src={photos[0].thumbnailLarge ?? photos[0].thumbnail}
              alt=""
              loading="lazy"
              fetchPriority="low"
            />
            <span>Bangkok, with love ♡</span>
          </span>
          <span className="postcards-orbit">
            <Sun size={29} strokeWidth={1.2} />
          </span>
        </button>
      )}
    </motion.section>
  );
}
