import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

const MemoryScene = lazy(() => import("./MemoryScene"));

class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MemoryLoader({
  label,
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [delayed, setDelayed] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => {
    setUnavailable(true);
    setReady(false);
  }, []);
  useEffect(() => {
    // Cached images finish before downloading or mounting the 3D scene.
    const timer = window.setTimeout(() => setDelayed(true), 250);
    return () => window.clearTimeout(timer);
  }, []);
  const hints = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const animate =
    reducedMotion === false &&
    !hints.connection?.saveData &&
    !["2g", "slow-2g"].includes(hints.connection?.effectiveType ?? "") &&
    !(hints.deviceMemory && hints.deviceMemory <= 2) &&
    !(hints.hardwareConcurrency && hints.hardwareConcurrency <= 2);
  return (
    <span
      className={`memory-loader ${compact ? "memory-loader--compact" : ""}`}
      role="status"
      data-animated={animate}
    >
      <span className="memory-loader__art" aria-hidden="true">
        {(!ready || !animate || unavailable) && (
          <span className="memory-loader__fallback">
            <span />
          </span>
        )}
        {delayed && animate && !unavailable && (
          <SceneBoundary onError={onUnavailable}>
            <Suspense fallback={null}>
              <MemoryScene onReady={onReady} onUnavailable={onUnavailable} />
            </Suspense>
          </SceneBoundary>
        )}
      </span>
      <span className={compact ? "sr-only" : "memory-loader__label"}>
        {label ?? t("media.opening")}
      </span>
    </span>
  );
}
