import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { IncomingMessage } from "node:http";

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export type AlbumEnvironment = Record<string, string | undefined>;

export function configurationReady(env: AlbumEnvironment) {
  return Boolean(
    env.IMAGEKIT_PRIVATE_KEY?.trim() &&
    (env.ALBUM_PASSWORD?.length ?? 0) >= 16 &&
    (env.ALBUM_SESSION_SECRET?.length ?? 0) >= 32 &&
    /^https:\/\/ik\.imagekit\.io\/[a-zA-Z0-9_-]+\/?$/.test(
      env.VITE_IMAGEKIT_URL_ENDPOINT ?? "",
    ),
  );
}

export function passwordMatches(password: string, env: AlbumEnvironment) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(password), digest(env.ALBUM_PASSWORD ?? ""));
}

function signature(value: string, env: AlbumEnvironment) {
  // Changing either secret or the family password invalidates existing sessions.
  const key = createHmac("sha256", env.ALBUM_SESSION_SECRET ?? "")
    .update(env.ALBUM_PASSWORD ?? "")
    .digest();
  return createHmac("sha256", key).update(value).digest("base64url");
}

function cookieName(env: AlbumEnvironment) {
  return env.VERCEL === "1" || env.NODE_ENV === "production"
    ? "__Secure-golden-days-session"
    : "golden-days-session";
}

export function sessionCookie(
  token: string,
  env: AlbumEnvironment,
  clear = false,
) {
  const secure = cookieName(env).startsWith("__Secure-") ? "; Secure" : "";
  return `${cookieName(env)}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure}`;
}

export function createSession(env: AlbumEnvironment) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const value = `${expiresAt}.${randomBytes(18).toString("base64url")}`;
  return {
    token: `${value}.${signature(value, env)}`,
    expiresAt: expiresAt * 1000,
  };
}

export function sessionExpiry(request: IncomingMessage, env: AlbumEnvironment) {
  const token = (request.headers.cookie ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName(env)}=`))
    ?.slice(cookieName(env).length + 1);
  if (!token || !/^\d{10}\.[\w-]{24}\.[\w-]{43}$/.test(token)) return null;
  const [expiry, nonce, supplied] = token.split(".");
  const expiresAt = Number(expiry);
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now || expiresAt > now + SESSION_SECONDS) return null;
  const expected = signature(`${expiry}.${nonce}`, env);
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    ? expiresAt * 1000
    : null;
}
