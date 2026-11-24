import { ChevronDown, LogOut, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle";
import InstallAppButton from "./InstallAppButton";
import { useAlbumSession } from "./AlbumAccess";

export default function AppHeader({ onAbout }: { onAbout: () => void }) {
  const { t } = useTranslation();
  const { signOut } = useAlbumSession();
  return (
    <header className="topbar">
      <div className="topbar-location">
        <span className="topbar-title">
          <Sun size={18} />
          <span>{t("app.familyAlbum")}</span>
        </span>
        <span className="breadcrumb-divider">/</span>
        <span className="breadcrumb-current">{t("app.city")}</span>
      </div>
      <div className="topbar-right">
        <InstallAppButton />
        <ThemeToggle />
        {signOut && (
          <button
            className="icon-button"
            onClick={signOut}
            aria-label={t("app.signOut")}
          >
            <LogOut size={19} />
          </button>
        )}
        <button
          className="family-button"
          onClick={onAbout}
          aria-label={t("app.about")}
        >
          <span className="avatar-stack">
            <span>♡</span>
            <span>☀</span>
            <span>✿</span>
          </span>
          <span>{t("app.usTogether")}</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}
