import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

interface DialogProps {
  children: ReactNode;
  className: string;
  label?: string;
  labelledBy?: string;
  onClose: () => void;
}

const focusableSelector =
  'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

export default function Dialog({
  children,
  className,
  label,
  labelledBy,
  onClose,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const overflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    let nativeModal = false;
    try {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
        nativeModal = true;
      }
    } catch {
      // Older WebViews can expose the method without supporting modal dialogs.
    }
    setFallback(!nativeModal);
    if (!nativeModal) {
      dialog.setAttribute("open", "");
      dialog.dataset.fallback = "true";
      if (root) root.inert = true;
      (dialog.querySelector<HTMLElement>(focusableSelector) ?? dialog).focus();
    }
    document.body.style.overflow = "hidden";
    return () => {
      if (nativeModal) dialog.close();
      else {
        dialog.removeAttribute("open");
        if (root) root.inert = wasInert;
        if (previousFocus?.isConnected)
          previousFocus.focus({ preventScroll: true });
      }
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
    <>
      {fallback && (
        <div
          className="dialog-fallback-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <motion.dialog
        ref={ref}
        className={`app-dialog ${className}`}
        aria-label={label}
        aria-labelledby={labelledBy}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        data-fallback={fallback ? "true" : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onKeyDown={(event) => {
          if (!fallback) return;
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Tab") {
            const elements = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                focusableSelector,
              ),
            ).filter((element) => element.getClientRects().length > 0);
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (!first) {
              event.preventDefault();
              event.currentTarget.focus();
            } else if (
              event.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === event.currentTarget)
            ) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {children}
      </motion.dialog>
    </>,
    document.body,
  );
}
