import { motion } from "motion/react";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <motion.section
      className="album-intro"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      aria-label={t("intro.label")}
    >
      <div className="intro-copy">
        <span className="eyebrow">
          <span className="little-line" /> {t("intro.eyebrow")}
        </span>
        <h1>
          <Trans i18nKey="intro.title" />
          <span className="heading-sparkle">
            <Sparkles size={34} strokeWidth={1.1} />
          </span>
        </h1>
        <p>
          <Trans
            i18nKey="intro.description"
            components={{ br: <br className="desktop-break" /> }}
          />
        </p>
        <div className="album-meta">
          <span>
            <Images size={15} />
            {loading
              ? t("access.openingAlbum")
              : t("intro.count", { count: total })}
          </span>
          <span className="meta-dot">·</span>
          <span>
            <Heart size={14} />
            {t("intro.family")}
          </span>
        </div>
      </div>
      {photos.length > 0 && (
        <button
          className="intro-postcards"
          onClick={() => onOpen(photos[0].id)}
          aria-label={t("intro.openAlbum")}
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
            <span>{t("intro.adventures")}</span>
          </span>
          <span className="postcard postcard-front">
            <MediaImage
              src={photos[0].thumbnailLarge ?? photos[0].thumbnail}
              alt=""
              loading="lazy"
              fetchPriority="low"
            />
            <span>{t("intro.withLove")}</span>
          </span>
          <span className="postcards-orbit">
            <Sun size={29} strokeWidth={1.2} />
          </span>
        </button>
      )}
    </motion.section>
  );
}
