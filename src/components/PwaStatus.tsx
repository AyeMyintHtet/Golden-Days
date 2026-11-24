import { LoaderCircle, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PwaStatusProps {
  online: boolean;
  needsUpdate: boolean;
  status: "idle" | "updating" | "error";
  usingSavedAlbum: boolean;
  onUpdate: () => void;
  onLater: () => void;
  onRetry: () => void;
}

export default function PwaStatus({
  online,
  needsUpdate,
  status,
  usingSavedAlbum,
  onUpdate,
  onLater,
  onRetry,
}: PwaStatusProps) {
  const { t } = useTranslation();
  if (online && !needsUpdate && !usingSavedAlbum) return null;
  return (
    <div className="pwa-status" role="status" aria-live="polite">
      {!online || usingSavedAlbum ? (
        <>
          <WifiOff size={18} aria-hidden="true" />
          <p>{online ? t("pwa.saved") : t("pwa.offline")}</p>
          {online && (
            <button className="button button-outline" onClick={onRetry}>
              {t("pwa.retry")}
            </button>
          )}
        </>
      ) : (
        <>
          <p>
            {status === "error" ? t("pwa.updateError") : t("pwa.updateReady")}
          </p>
          <div className="pwa-status-actions">
            <button
              className="button button-gold"
              onClick={onUpdate}
              disabled={status === "updating"}
            >
              {status === "updating" && (
                <LoaderCircle size={16} className="spin" />
              )}
              {t(status === "error" ? "common.tryAgain" : "pwa.update")}
            </button>
            <button
              className="button button-outline"
              disabled={status === "updating"}
              onClick={onLater}
            >
              {t("common.later")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
