import { Camera, Film, Heart, Images, Sun } from "lucide-react";
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
  return (
    <a className="brand" href="#main" aria-label="Golden Days home">
      <span className="brand-icon">
        <Sun size={26} strokeWidth={1.5} />
      </span>
      <span>
        golden days<span className="brand-period">.</span>
        <small>A LITTLE CLOSER, ALWAYS</small>
      </span>
    </a>
  );
}

export default function Sidebar(props: SidebarProps) {
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
      label: "All memories",
      icon: Images,
      count: photoCount + videoCount,
      collection: "all" as const,
      kind: "all" as const,
    },
    {
      label: "Photos",
      icon: Camera,
      count: photoCount,
      collection: "all" as const,
      kind: "photo" as const,
    },
    {
      label: "Videos",
      icon: Film,
      count: videoCount,
      collection: "all" as const,
      kind: "video" as const,
    },
    {
      label: "Favorites",
      icon: Heart,
      count: favoriteCount,
      collection: "favorites" as const,
      kind: "all" as const,
    },
  ];

  return (
    <aside className="sidebar" aria-label="Album navigation">
      <div className="sidebar-brand">
        <Brand />
      </div>

      <div className="sidebar-section-label">YOUR LITTLE WORLD</div>
      <nav className="library-nav" aria-label="Library">
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
                <span className="nav-count">{count}</span>
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
            the good old days
            <br />
            are happening now.
          </span>
        </div>
        <span className="postcard-tape" />
        <Sun className="postcard-sun" size={29} strokeWidth={1.3} />
      </div>
    </aside>
  );
}
