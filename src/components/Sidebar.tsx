import { Camera, Film, Heart, Images, Sun } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import type { Collection, MediaFilter } from "../data/memories";

interface SidebarProps {
  collection: Collection;
  kind: MediaFilter;
  photoCount: number;
  videoCount: number;
  favoriteCount: number;
  onNavigate: (collection: Collection, kind: MediaFilter) => void;
}

export function Brand() {
  const { t } = useTranslation();
  return (
    <a className="brand" href="#main" aria-label={t("app.home")}>
      <span className="brand-icon">
        <Sun size={26} strokeWidth={1.5} />
      </span>
      <span>
        {t("app.name")}
        <span className="brand-period">{t("common.fullStop")}</span>
        <small>{t("app.tagline")}</small>
      </span>
    </a>
  );
}

export default function Sidebar(props: SidebarProps) {
  const { t } = useTranslation();
  const {
    collection,
    kind,
    photoCount,
    videoCount,
    favoriteCount,
    onNavigate,
  } = props;
  const links = [
    {
      label: t("nav.all"),
      icon: Images,
      count: photoCount + videoCount,
      collection: "all" as const,
      kind: "all" as const,
    },
    {
      label: t("nav.photos"),
      icon: Camera,
      count: photoCount,
      collection: "all" as const,
      kind: "photo" as const,
    },
    {
      label: t("nav.videos"),
      icon: Film,
      count: videoCount,
      collection: "all" as const,
      kind: "video" as const,
    },
    {
      label: t("nav.favorites"),
      icon: Heart,
      count: favoriteCount,
      collection: "favorites" as const,
      kind: "all" as const,
    },
  ];

  return (
    <aside className="sidebar" aria-label={t("nav.album")}>
      <div className="sidebar-brand">
        <Brand />
      </div>

      <div className="sidebar-section-label">{t("nav.yourWorld")}</div>
      <nav className="library-nav" aria-label={t("nav.library")}>
        {links.map(
          ({
            label,
            icon: Icon,
            count,
            collection: nextCollection,
            kind: nextKind,
          }) => {
            const active =
              collection === nextCollection &&
              (nextCollection === "favorites" || kind === nextKind);
            return (
              <button
                key={label}
                className={`nav-link ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(nextCollection, nextKind)}
              >
                <Icon size={19} strokeWidth={1.65} />
                <span>{label}</span>
                <span className="nav-count">
                  {t("common.number", { value: count })}
                </span>
              </button>
            );
          },
        )}
      </nav>

      <div className="sidebar-postcard" aria-hidden="true">
        <div className="postcard-photo">
          <img
            src="/images/thumbnails/evening-320.webp"
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
          <span>
            <Trans i18nKey="nav.postcard" />
          </span>
        </div>
        <span className="postcard-tape" />
        <Sun className="postcard-sun" size={29} strokeWidth={1.3} />
      </div>
    </aside>
  );
}
