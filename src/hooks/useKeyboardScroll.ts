import { useEffect, useRef } from "react";

export default function useKeyboardScroll(enabled: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const input = inputRef.current;
    if (!enabled || !container || !input) return;

    const viewport = window.visualViewport;
    let fullHeight = window.innerHeight;
    let width = window.innerWidth;
    let frame = 0;
    let timer = 0;

    function cancelPending() {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    }

    const update = () => {
      cancelPending();
      frame = window.requestAnimationFrame(() => {
        if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
        const height = viewport?.height ?? window.innerHeight;
        const covered = Math.max(0, window.innerHeight - height);
        const focused = document.activeElement === input;
        if (window.innerWidth !== width) {
          width = window.innerWidth;
          fullHeight = window.innerHeight;
        }

        const keyboardOpen = fullHeight - height > 100 || covered > 100;
        if (!keyboardOpen || (!focused && covered < 100)) {
          container.style.removeProperty("--keyboard-scroll-space");
          fullHeight = window.innerHeight;
          return;
        }
        if (!focused) return;

        // Leave enough room to scroll the field to the visible screen's center.
        container.style.setProperty(
          "--keyboard-scroll-space",
          `${covered + height / 2}px`,
        );
        // Let the keyboard's resize animation and native input panning settle.
        timer = window.setTimeout(() => {
          if (document.activeElement !== input) return;
          const rect = input.getBoundingClientRect();
          const center =
            (viewport?.offsetTop ?? 0) +
            (viewport?.height ?? window.innerHeight) / 2;
          const distance = rect.top + rect.height / 2 - center;
          if (Math.abs(distance) < 2) return;
          window.scrollBy({
            top: distance,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
          });
        }, 120);
      });
    };

    function focus() {
      fullHeight = window.innerHeight;
      update();
    }

    input.addEventListener("focus", focus);
    // Keep the extra space until the keyboard closes so tapping Submit works.
    input.addEventListener("blur", cancelPending);
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      cancelPending();
      input.removeEventListener("focus", focus);
      input.removeEventListener("blur", cancelPending);
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      container.style.removeProperty("--keyboard-scroll-space");
    };
  }, [enabled]);

  return { containerRef, inputRef };
}
