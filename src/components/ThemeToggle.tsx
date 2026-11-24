import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

type Theme = "light" | "dark";
type CurtainTransition = { phase: "closing" | "opening"; theme: Theme };

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#191612" : "#f8f5ef");
  try {
    localStorage.setItem("golden-days:theme", theme);
  } catch {
    /* Keep the choice for this visit when storage is unavailable. */
  }
}

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [transition, setTransition] = useState<CurtainTransition | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const transitioning = transition !== null;

  useEffect(() => {
    if (!transitioning) return;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    const overflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = "hidden";
    return () => {
      if (root) root.inert = wasInert;
      document.body.style.overflow = overflow;
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [transitioning]);

  useEffect(() => {
    if (!transition) return;
    const nextTheme = transition.theme;
    function finish() {
      applyTheme(nextTheme);
      setTheme(nextTheme);
      setTransition(null);
    }
    function onVisibilityChange() {
      if (document.hidden) finish();
    }
    // Animation events can be missed when a phone suspends the PWA.
    const timeout = window.setTimeout(finish, 1400);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", finish);
    window.addEventListener("pageshow", finish);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", finish);
      window.removeEventListener("pageshow", finish);
    };
  }, [transition]);

  function switchTheme() {
    if (transition) return;
    const nextTheme = theme === "light" ? "dark" : "light";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyTheme(nextTheme);
      setTheme(nextTheme);
      return;
    }
    previousFocus.current = document.activeElement as HTMLElement | null;
    setTransition({ phase: "closing", theme: nextTheme });
  }

  return (
    <>
      <button
        className="theme-toggle"
        onClick={switchTheme}
        disabled={transitioning}
        aria-label={t(
          theme === "light" ? "theme.switchDark" : "theme.switchLight",
        )}
        aria-pressed={theme === "dark"}
        title={t(theme === "light" ? "theme.switchDark" : "theme.switchLight")}
      >
        {theme === "dark" ? (
          <Moon size={17} aria-hidden="true" />
        ) : (
          <Sun size={17} aria-hidden="true" />
        )}
        <span>{t(theme === "dark" ? "theme.dark" : "theme.light")}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {t(theme === "dark" ? "theme.darkStatus" : "theme.lightStatus")}
      </span>
      {transition &&
        createPortal(
          <div
            className="theme-curtain"
            data-phase={transition.phase}
            aria-hidden="true"
          >
            <div
              className="curtain-panel curtain-left"
              onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget) return;
                if (
                  transition.phase === "closing" &&
                  event.animationName === "curtain-close-left"
                ) {
                  applyTheme(transition.theme);
                  setTheme(transition.theme);
                  setTransition({ ...transition, phase: "opening" });
                } else if (
                  transition.phase === "opening" &&
                  event.animationName === "curtain-open-left"
                ) {
                  setTransition(null);
                }
              }}
            />
            <div className="curtain-panel curtain-right" />
          </div>,
          document.body,
        )}
    </>
  );
}
