import { ChevronDown, LogOut, Sun } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import InstallAppButton from "./InstallAppButton";
import { useAlbumSession } from "./AlbumAccess";

export default function AppHeader({ onAbout }: { onAbout: () => void }) {
  const { signOut } = useAlbumSession();
  return (
    <header className="topbar">
      <div className="topbar-location">
        <span className="topbar-title">
          <Sun size={18} />
          <span>Our family album</span>
        </span>
        <span className="breadcrumb-divider">/</span>
        <span className="breadcrumb-current">Bangkok</span>
      </div>
      <div className="topbar-right">
        <InstallAppButton />
        <ThemeToggle />
        {signOut && (
          <button
            className="icon-button"
            onClick={signOut}
            aria-label="Sign out of family album"
          >
            <LogOut size={19} />
          </button>
        )}
        <button
          className="family-button"
          onClick={onAbout}
          aria-label="About our family album"
        >
          <span className="avatar-stack">
            <span>♡</span>
            <span>☀</span>
            <span>✿</span>
          </span>
          <span>Us, together</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}
