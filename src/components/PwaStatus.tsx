import { LoaderCircle, WifiOff } from "lucide-react";

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
  if (online && !needsUpdate && !usingSavedAlbum) return null;
  return (
    <div className="pwa-status" role="status" aria-live="polite">
      {!online || usingSavedAlbum ? (
        <>
          <WifiOff size={18} aria-hidden="true" />
          <p>
            {online
              ? "Showing your saved album."
              : "You’re offline. Saved photos are still available."}
          </p>
          {online && (
            <button className="button button-outline" onClick={onRetry}>
              Retry connection
            </button>
          )}
        </>
      ) : (
        <>
          <p>
            {status === "error"
              ? "The update couldn’t finish. Please try again."
              : "A fresh version of Golden Days is ready."}
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
              {status === "error" ? "Try again" : "Update"}
            </button>
            <button
              className="button button-outline"
              disabled={status === "updating"}
              onClick={onLater}
            >
              Later
            </button>
          </div>
        </>
      )}
    </div>
  );
}
