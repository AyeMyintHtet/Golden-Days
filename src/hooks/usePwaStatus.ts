import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function usePwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [status, setStatus] = useState<"idle" | "updating" | "error">("idle");
  const {
    needRefresh: [needsUpdate, setNeedsUpdate],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    function connectionChanged() {
      setOnline(navigator.onLine);
    }
    window.addEventListener("online", connectionChanged);
    window.addEventListener("offline", connectionChanged);
    window.addEventListener("pageshow", connectionChanged);
    document.addEventListener("visibilitychange", connectionChanged);
    return () => {
      window.removeEventListener("online", connectionChanged);
      window.removeEventListener("offline", connectionChanged);
      window.removeEventListener("pageshow", connectionChanged);
      document.removeEventListener("visibilitychange", connectionChanged);
    };
  }, []);

  useEffect(() => {
    if (status !== "updating") return;
    const timeout = window.setTimeout(() => setStatus("error"), 15_000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function update() {
    if (status === "updating") return;
    setStatus("updating");
    try {
      await updateServiceWorker(true);
    } catch {
      setStatus("error");
    }
  }

  return {
    online,
    needsUpdate,
    status,
    onUpdate: update,
    onLater: () => setNeedsUpdate(false),
  };
}
