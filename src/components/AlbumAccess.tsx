import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowRight, LockKeyhole, Sun } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import {
  explicitlySignedOut,
  forgetAccess,
  offlineAccessUntil,
  rememberAccess,
  sessionRequest,
  SIGNED_OUT,
  clearPrivateAlbumData,
  enablePrivateMediaCache,
} from "../lib/album-session";
import ThemeToggle from "./ThemeToggle";
import MemoryLoader from "./MemoryLoader";
import useKeyboardScroll from "../hooks/useKeyboardScroll";

const SessionContext = createContext<{ signOut?: () => void }>({});
export const useAlbumSession = () => useContext(SessionContext);

export default function AlbumAccess({ children }: { children: ReactNode }) {
  return import.meta.env.VITE_AUTH_REQUIRED === "true" ? (
    <PrivateAlbumAccess>{children}</PrivateAlbumAccess>
  ) : (
    children
  );
}

function PrivateAlbumAccess({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<
    "checking" | "ready" | "locked" | "unavailable" | "setup"
  >("checking");
  const [expiresAt, setExpiresAt] = useState(0);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const signingIn = useRef(false);
  const { containerRef, inputRef } = useKeyboardScroll(status === "locked");

  const acceptSession = useCallback((expiry: number) => {
    rememberAccess(expiry);
    enablePrivateMediaCache();
    setExpiresAt(expiry);
    setStatus("ready");
    setMessage("");
  }, []);

  const checkSession = useCallback(async () => {
    if (signingIn.current) return;
    requestRef.current?.abort();
    if (explicitlySignedOut()) {
      setStatus("locked");
      if (navigator.onLine) void sessionRequest("logout").catch(() => {});
      return;
    }
    if (!navigator.onLine) {
      const savedExpiry = offlineAccessUntil();
      if (savedExpiry > Date.now()) {
        setExpiresAt(savedExpiry);
        setStatus("ready");
      } else setStatus("unavailable");
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await sessionRequest(
        "session",
        undefined,
        controller.signal,
      );
      if (response.status === 503) {
        setStatus("setup");
        return;
      }
      if (!response.ok) throw new Error("Session unavailable");
      const session = await response.json();
      if (controller.signal.aborted) return;
      if (
        session.authenticated === true &&
        Number(session.expiresAt) > Date.now()
      ) {
        acceptSession(Number(session.expiresAt));
      } else {
        forgetAccess();
        setStatus("locked");
        await clearPrivateAlbumData();
      }
    } catch {
      if (requestRef.current !== controller) return;
      const savedExpiry = offlineAccessUntil();
      if (savedExpiry > Date.now()) {
        setExpiresAt(savedExpiry);
        setStatus("ready");
      } else setStatus("unavailable");
    } finally {
      window.clearTimeout(timeout);
    }
  }, [acceptSession]);

  useEffect(() => {
    void checkSession();
    const resume = () => {
      if (!document.hidden) void checkSession();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === SIGNED_OUT && event.newValue === "1") {
        requestRef.current?.abort();
        setStatus("locked");
        setPassword("");
      }
    };
    const revoked = () => {
      forgetAccess();
      setStatus("locked");
      void clearPrivateAlbumData();
    };
    window.addEventListener("online", resume);
    window.addEventListener("storage", storage);
    window.addEventListener("golden-days:unauthorized", revoked);
    document.addEventListener("visibilitychange", resume);
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
      window.removeEventListener("online", resume);
      window.removeEventListener("storage", storage);
      window.removeEventListener("golden-days:unauthorized", revoked);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [checkSession]);

  useEffect(() => {
    if (status !== "ready") return;
    const timer = window.setTimeout(
      () => {
        forgetAccess();
        setStatus("locked");
        void clearPrivateAlbumData();
        void sessionRequest("logout").catch(() => {});
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [status, expiresAt]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    signingIn.current = true;
    setMessage("");
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await sessionRequest(
        "login",
        password,
        controller.signal,
      );
      if (response.status === 503) {
        setStatus("setup");
        return;
      }
      if (response.status === 401) {
        setMessage(t("access.wrongPassword"));
        return;
      }
      if (response.status === 429) {
        const seconds = Number(response.headers.get("Retry-After"));
        const minutes = Math.max(1, Math.ceil((seconds || 60) / 60));
        setMessage(t("access.tooManyAttempts", { count: minutes }));
        return;
      }
      if (!response.ok) throw new Error("Sign-in unavailable");
      const session = await response.json();
      if (
        session.authenticated !== true ||
        !(Number(session.expiresAt) > Date.now())
      )
        throw new Error("Invalid session");
      await clearPrivateAlbumData();
      if (controller.signal.aborted) return;
      setPassword("");
      acceptSession(Number(session.expiresAt));
    } catch {
      setMessage(t("access.connectionError"));
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
      signingIn.current = false;
    }
  }

  function signOut() {
    requestRef.current?.abort();
    requestRef.current = null;
    forgetAccess();
    setStatus("locked");
    setPassword("");
    void clearPrivateAlbumData();
    void sessionRequest("logout").catch(() => {});
  }

  if (status === "ready")
    return (
      <SessionContext.Provider value={{ signOut }}>
        {children}
      </SessionContext.Provider>
    );

  return (
    <main className="album-access" ref={containerRef}>
      <div className="access-theme">
        <ThemeToggle />
      </div>
      <section className="access-card" aria-labelledby="access-title">
        <span className="access-sun">
          <Sun size={30} strokeWidth={1.3} />
        </span>
        <span className="eyebrow">{t("access.eyebrow")}</span>
        <h1 id="access-title">
          <Trans i18nKey="access.title" />
        </h1>
        {status === "checking" ? (
          <MemoryLoader label={t("access.openingAlbum")} />
        ) : status === "setup" ? (
          <p role="status">{t("access.setup")}</p>
        ) : status === "unavailable" ? (
          <>
            <p>{t("access.offline")}</p>
            <button
              className="button button-gold"
              onClick={() => {
                setStatus("checking");
                void checkSession();
              }}
            >
              {t("common.tryAgain")}
            </button>
          </>
        ) : (
          <>
            <p>
              <Trans i18nKey="access.welcome" />
            </p>
            <form onSubmit={signIn} className="access-form">
              <label htmlFor="family-password">{t("access.password")}</label>
              <div className="access-input">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  ref={inputRef}
                  id="family-password"
                  type="password"
                  inputMode="numeric"
                  enterKeyHint="go"
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby={message ? "access-message" : undefined}
                />
              </div>
              {message && (
                <p id="access-message" className="access-message" role="alert">
                  {message}
                </p>
              )}
              <button
                className="button button-gold"
                type="submit"
                disabled={submitting}
              >
                {t(submitting ? "access.opening" : "access.enter")}
                <ArrowRight size={17} />
              </button>
            </form>
            <span className="access-note">
              <LockKeyhole size={12} /> {t("access.familyOnly")}
            </span>
          </>
        )}
      </section>
    </main>
  );
}
