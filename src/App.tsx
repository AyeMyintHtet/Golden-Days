import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Camera,
  Check,
  CheckCheck,
  Download,
  Film,
  Grid2X2,
  Grid3X3,
  Heart,
  Images,
  LoaderCircle,
  Sun,
  X,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import AppHeader from "./components/AppHeader";
import AlbumIntro from "./components/AlbumIntro";
import Gallery from "./components/Gallery";
import Viewer from "./components/Viewer";
import AboutAlbum from "./components/AboutAlbum";
import PwaStatus from "./components/PwaStatus";
import MemoryLoader from "./components/MemoryLoader";
import {
  filterMemories,
  type Collection,
  type MediaFilter,
  type Memory,
} from "./data/memories";
import { useFavorites } from "./hooks/useFavorites";
import { useMemories } from "./hooks/useMemories";
import { usePwaStatus } from "./hooks/usePwaStatus";
import { getDownloadUrl } from "./lib/media";
import { downloadMemories } from "./lib/download";

function initialViewer() {
  const id = new URLSearchParams(window.location.hash.slice(1)).get("memory");
  return id ? { id, scope: "all" as const } : null;
}

export default function App() {
  const [collection, setCollection] = useState<Collection>("all");
  const [kind, setKind] = useState<MediaFilter>("all");
  const [compact, setCompact] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<{
    id: string;
    scope: "all" | "visible";
  } | null>(initialViewer);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [toast, setToast] = useState("");
  const downloadInProgress = useRef(false);
  const { favorites, toggleFavorite } = useFavorites();
  const { memories, loading, error, retry, usingSavedAlbum } = useMemories();
  const pwa = usePwaStatus();
  const items = filterMemories(memories, {
    collection,
    kind,
    favorites,
  });
  const viewerItems = viewer?.scope === "all" ? memories : items;
  const viewerId =
    viewer && viewerItems.some((item) => item.id === viewer.id)
      ? viewer.id
      : viewer?.scope === "visible"
        ? viewerItems[0]?.id
        : undefined;
  const photos = memories.filter((memory) => memory.kind === "photo");
  const videos = memories.filter((memory) => memory.kind === "video");
  const closeAbout = useCallback(() => setAboutOpen(false), []);
  const closeViewer = useCallback(() => {
    setViewer(null);
    if (window.location.hash.startsWith("#memory="))
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onHashChange() {
      setViewer(initialViewer());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!viewer || loading || error) return;
    if (!viewerId) closeViewer();
    else if (viewer.id !== viewerId)
      setViewer((current) => (current ? { ...current, id: viewerId } : null));
  }, [viewer, viewerId, loading, error, closeViewer]);

  function changeFavorite(id: string) {
    if (
      viewer?.scope === "visible" &&
      collection === "favorites" &&
      favorites.includes(id) &&
      viewer.id === id
    ) {
      const index = items.findIndex((item) => item.id === id);
      const remaining = items.filter((item) => item.id !== id);
      if (!remaining.length) closeViewer();
      else
        setViewer({
          id: remaining[Math.min(index, remaining.length - 1)].id,
          scope: "visible",
        });
    }
    toggleFavorite(id);
  }

  function navigate(nextCollection: Collection, nextKind: MediaFilter) {
    setCollection(nextCollection);
    setKind(nextKind);
    setSelected(new Set());
    setSelecting(false);
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function changeFilter(nextKind: MediaFilter) {
    setKind(nextKind);
    setSelected(new Set());
  }

  async function download(requested: Memory[]) {
    if (downloadInProgress.current || !requested.length) return;
    downloadInProgress.current = true;
    setDownloading(true);
    setDownloadProgress("Preparing your memories…");
    try {
      await downloadMemories(requested, (completed, total) => {
        setDownloadProgress(
          completed < total
            ? `Preparing ${completed} of ${total} memories…`
            : total > 1
              ? "Packing your download…"
              : "Finishing your download…",
        );
      });
      setToast(
        requested.length === 1
          ? "Your download has started."
          : `${requested.length} memories packed into one download.`,
      );
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "The download couldn’t finish. Please try again.",
      );
    } finally {
      downloadInProgress.current = false;
      setDownloading(false);
    }
  }

  async function share(memory: Memory) {
    const url = new URL(window.location.href);
    url.hash = `memory=${memory.id}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: "Golden Days · A family memory",
          url: url.href,
        });
      else {
        await navigator.clipboard.writeText(url.href);
        setToast("Memory link copied. Share a little sunshine.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setToast("Sharing is unavailable in this browser.");
    }
  }

  const currentTitle =
    collection === "favorites"
      ? "Your favorites"
      : kind === "video"
        ? "Little moments in motion"
        : kind === "photo"
          ? "Our photographs"
          : "All the good moments";
  const downloadableItems = items.filter((memory) =>
    Boolean(getDownloadUrl(memory)),
  );
  const selectedItems = downloadableItems.filter((memory) =>
    selected.has(memory.id),
  );

  const pwaNotice = (
    <PwaStatus {...pwa} usingSavedAlbum={usingSavedAlbum} onRetry={retry} />
  );
  const notification = (
    <AnimatePresence>
      {(toast || downloading) && (
        <motion.div
          className="toast"
          role="status"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
        >
          {downloading ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Check size={17} />
          )}
          <span>{downloading ? downloadProgress : toast}</span>
          {!downloading && (
            <button
              onClick={() => setToast("")}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to memories
      </a>
      <div className="app-shell">
        <Sidebar
          collection={collection}
          kind={kind}
          photoCount={photos.length}
          videoCount={videos.length}
          favoriteCount={
            favorites.filter((id) =>
              memories.some((memory) => memory.id === id),
            ).length
          }
          onNavigate={navigate}
        />

        <div className="main-shell">
          <AppHeader onAbout={() => setAboutOpen(true)} />

          <main id="main" className="main-content">
            <AlbumIntro
              photos={photos}
              total={memories.length}
              loading={loading}
              onOpen={(id) => setViewer({ id, scope: "all" })}
            />

            <section className="memory-library" aria-labelledby="library-title">
              <div className="library-heading">
                <div>
                  <span className="eyebrow section-eyebrow">
                    THE MEMORY BOX
                  </span>
                  <h2 id="library-title">
                    {currentTitle}
                    <span className="title-dot">.</span>
                  </h2>
                </div>
              </div>

              <div className="library-toolbar">
                <div
                  className="media-tabs"
                  role="group"
                  aria-label="Filter by media type"
                >
                  {(
                    [
                      { value: "all", label: "All memories", icon: Images },
                      { value: "photo", label: "Photos", icon: Camera },
                      { value: "video", label: "Videos", icon: Film },
                    ] as const
                  ).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      className={`media-tab ${kind === value ? "active" : ""}`}
                      aria-pressed={kind === value}
                      onClick={() => changeFilter(value)}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <div className="toolbar-actions">
                  <button
                    className={`icon-button select-toggle ${selecting ? "is-active" : ""}`}
                    aria-label={
                      selecting ? "Cancel selection" : "Select memories"
                    }
                    aria-pressed={selecting}
                    onClick={() => {
                      setSelecting(!selecting);
                      setSelected(new Set());
                    }}
                  >
                    {selecting ? <X size={19} /> : <CheckCheck size={19} />}
                  </button>
                  <span className="toolbar-separator" />
                  <button
                    className="icon-button grid-toggle"
                    aria-label={
                      compact ? "Use comfortable grid" : "Use compact grid"
                    }
                    aria-pressed={compact}
                    onClick={() => setCompact(!compact)}
                  >
                    {compact ? <Grid2X2 size={19} /> : <Grid3X3 size={19} />}
                  </button>
                </div>
              </div>

              {selecting && (
                <div className="selection-toolbar">
                  <span>
                    <Check size={16} />
                    {selectedItems.length} selected
                  </span>
                  <button
                    disabled={!downloadableItems.length}
                    onClick={() =>
                      setSelected(
                        selectedItems.length === downloadableItems.length
                          ? new Set()
                          : new Set(
                              downloadableItems.map((memory) => memory.id),
                            ),
                      )
                    }
                  >
                    {selectedItems.length === downloadableItems.length &&
                    downloadableItems.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                  <button
                    className="button button-gold"
                    disabled={!selectedItems.length || downloading}
                    onClick={() => download(selectedItems)}
                  >
                    {downloading ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                    Download
                    {selectedItems.length > 0 && ` (${selectedItems.length})`}
                  </button>
                </div>
              )}

              <div className="sr-only" role="status" aria-live="polite">
                {items.length} {items.length === 1 ? "memory" : "memories"}{" "}
                shown
              </div>
              {loading ? (
                <div className="catalog-status" role="status">
                  <MemoryLoader label="Loading your memories…" />
                </div>
              ) : error ? (
                <div className="catalog-status" role="alert">
                  <p>
                    {pwa.online
                      ? "Your album couldn’t load."
                      : "No saved album yet. Connect to load your memories."}
                  </p>
                  <button className="button button-gold" onClick={retry}>
                    Try again
                  </button>
                </div>
              ) : (
                <Gallery
                  key={`${collection}:${kind}`}
                  items={items}
                  favorites={favorites}
                  selected={selected}
                  selecting={selecting}
                  compact={compact}
                  onOpen={(id) => setViewer({ id, scope: "visible" })}
                  onFavorite={changeFavorite}
                  onSelect={toggleSelected}
                  onDownload={download}
                  onReset={() => navigate("all", "all")}
                />
              )}
            </section>

            <footer className="album-footer">
              <Sun size={19} strokeWidth={1.2} />
              <span>
                A little collection of our favorite <em>remember whens.</em>
              </span>
              <Heart size={14} />
              <small>Made for the memories</small>
            </footer>
          </main>
        </div>

        <nav className="mobile-nav" aria-label="Quick navigation">
          {(
            [
              {
                label: "Memories",
                icon: Images,
                collection: "all",
                kind: "all",
              },
              {
                label: "Photos",
                icon: Camera,
                collection: "all",
                kind: "photo",
              },
              { label: "Videos", icon: Film, collection: "all", kind: "video" },
              {
                label: "Favorites",
                icon: Heart,
                collection: "favorites",
                kind: "all",
              },
            ] as const
          ).map((item) => (
            <button
              key={item.label}
              className={
                collection === item.collection &&
                (item.collection === "favorites" || kind === item.kind)
                  ? "active"
                  : ""
              }
              aria-current={
                collection === item.collection &&
                (item.collection === "favorites" || kind === item.kind)
                  ? "page"
                  : undefined
              }
              onClick={() => navigate(item.collection, item.kind)}
            >
              <item.icon size={21} strokeWidth={1.6} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence>
        {viewer && viewerId && (
          <Viewer
            items={viewerItems}
            currentId={viewerId}
            favorites={favorites}
            onChange={(id) =>
              setViewer((current) => (current ? { ...current, id } : null))
            }
            onClose={closeViewer}
            onFavorite={changeFavorite}
            onDownload={download}
            onShare={share}
          >
            {pwaNotice}
            {notification}
          </Viewer>
        )}
      </AnimatePresence>
      {aboutOpen && <AboutAlbum onClose={closeAbout} />}
      {!viewerId && (
        <>
          {pwaNotice}
          {notification}
        </>
      )}
    </>
  );
}
