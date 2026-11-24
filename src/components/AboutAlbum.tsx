import { Heart, Sun, X } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import Dialog from "./Dialog";

export default function AboutAlbum({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog className="about-dialog" onClose={onClose} labelledBy="about-title">
      <div className="about-content">
        <button
          className="icon-button about-close"
          onClick={onClose}
          aria-label={t("about.close")}
        >
          <X size={21} />
        </button>
        <span className="about-sun">
          <Sun size={37} strokeWidth={1.2} />
        </span>
        <span className="eyebrow">{t("about.eyebrow")}</span>
        <h2 id="about-title">
          <Trans i18nKey="about.title" />
        </h2>
        <p>{t("about.description")}</p>
        <div className="about-note">
          <strong>{t("app.together")}</strong>
          <p>{t("about.note")}</p>
        </div>
        <span className="about-signoff">
          <Trans
            i18nKey="about.signoff"
            components={{ heart: <Heart size={14} /> }}
          />
        </span>
      </div>
    </Dialog>
  );
}
