import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <Dialog className="pwa-dialog" labelledBy="install-title" onClose={onClose}>
      <div className="pwa-dialog-content">
        <button
          className="icon-button pwa-dialog-close"
          onClick={onClose}
          aria-label={t("install.close")}
        >
          <X size={21} />
        </button>
        <img src="/icons/icon-192.png" width={64} height={64} alt="" />
        <h2 id="install-title">{t("install.title")}</h2>
        <p>{t("install.description")}</p>
        <ol className="install-instructions">
          <li>
            <strong>{t("install.iosTitle")}</strong>
            <span>
              <Trans i18nKey="install.iosSteps" components={{ bold: <b /> }} />
            </span>
          </li>
          <li>
            <strong>{t("install.androidTitle")}</strong>
            <span>
              <Trans
                i18nKey="install.androidSteps"
                components={{ bold: <b /> }}
              />
            </span>
          </li>
        </ol>
        <button className="button button-gold" onClick={onClose}>
          {t("install.gotIt")}
        </button>
      </div>
    </Dialog>
  );
}

export default function InstallAppButton() {
  const { t } = useTranslation();
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
          aria-label={t("install.label")}
          title={t("install.label")}
          disabled={installing}
          onClick={install}
        >
          {installing ? (
            <LoaderCircle size={17} className="spin" aria-hidden="true" />
          ) : (
            <Download size={17} aria-hidden="true" />
          )}
          <span>{t("install.button")}</span>
        </button>
      )}
      {showHelp && <InstallHelp onClose={() => setShowHelp(false)} />}
    </>
  );
}
