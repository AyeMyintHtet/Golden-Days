import { ChevronDown, Sun } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import InstallAppButton from "./InstallAppButton";

export default function AppHeader({ onAbout }: { onAbout: () => void }) {
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
