import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, X } from "lucide-react";
import Dialog from "./Dialog";

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function InstallHelp({ onClose }: { onClose: () => void }) {
  return (
    <Dialog className="pwa-dialog" labelledBy="install-title" onClose={onClose}>
      <div className="pwa-dialog-content">
        <button
          className="icon-button pwa-dialog-close"
          onClick={onClose}
          aria-label="Close install instructions"
        >
          <X size={21} />
        </button>
        <img src="/icons/icon-192.png" width={64} height={64} alt="" />
        <h2 id="install-title">Keep the good days close.</h2>
        <p>Add Golden Days to your home screen and open it like an app.</p>
        <ol className="install-instructions">
          <li>
            <strong>On iPhone or iPad</strong>
            <span>
              Open this page in Safari. Tap <b>Share</b>, then{" "}
              <b>Add to Home Screen</b>.
            </span>
          </li>
          <li>
            <strong>On Android or a computer</strong>
            <span>
              Open your browser’s menu and choose <b>Install app</b> or{" "}
              <b>Add to Home Screen</b>, when available.
            </span>
          </li>
        </ol>
        <button className="button button-gold" onClick={onClose}>
          Got it
        </button>
      </div>
    </Dialog>
  );
}

export default function InstallAppButton() {
  const [installed, setInstalled] = useState(isStandalone);
  const [installing, setInstalling] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const prompt = useRef<InstallPromptEvent | null>(null);

  useEffect(() => {
    function capturePrompt(event: Event) {
      event.preventDefault();
      prompt.current = event as InstallPromptEvent;
    }
    function appInstalled() {
      prompt.current = null;
      setInstalled(true);
      setShowHelp(false);
    }
    const displayMode = window.matchMedia("(display-mode: standalone)");
    function modeChanged() {
      setInstalled(isStandalone());
    }
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", appInstalled);
    if (typeof displayMode.addEventListener === "function")
      displayMode.addEventListener("change", modeChanged);
    else displayMode.addListener(modeChanged);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", appInstalled);
      if (typeof displayMode.removeEventListener === "function")
        displayMode.removeEventListener("change", modeChanged);
      else displayMode.removeListener(modeChanged);
    };
  }, []);

  useEffect(() => {
    if (!installing) return;
    const timeout = window.setTimeout(() => setInstalling(false), 30_000);
    return () => window.clearTimeout(timeout);
  }, [installing]);

  async function install() {
    if (installing) return;
    const event = prompt.current;
    if (!event) {
      setShowHelp(true);
      return;
    }
    prompt.current = null;
    setInstalling(true);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      setShowHelp(true);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <>
      {!installed && (
        <button
          className="install-button"
          aria-label="Install Golden Days"
          title="Install Golden Days"
          disabled={installing}
          onClick={install}
        >
          {installing ? (
            <LoaderCircle size={17} className="spin" aria-hidden="true" />
          ) : (
            <Download size={17} aria-hidden="true" />
          )}
          <span>Install</span>
        </button>
      )}
      {showHelp && <InstallHelp onClose={() => setShowHelp(false)} />}
    </>
  );
}
