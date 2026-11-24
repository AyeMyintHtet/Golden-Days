import type { IncomingMessage } from "node:http";
import type { AlbumEnvironment } from "./session.js";

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_CLIENTS = 1_000;
const attempts = new Map<string, { count: number; expiresAt: number }>();

// This is a per-process safeguard. Use Vercel Firewall for a deployment-wide
// limit; function instances do not share this map and restarts clear it.
export function beginLoginAttempt(
  request: IncomingMessage,
  env: AlbumEnvironment,
) {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.expiresAt <= now) attempts.delete(key);
  }

  // Only trust the platform's forwarded address when running on Vercel.
  const forwarded = request.headers["x-vercel-forwarded-for"];
  const client =
    (env.VERCEL === "1" && typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : request.socket?.remoteAddress) || "unknown";
  const entry = attempts.get(client);
  if (entry && entry.count >= MAX_ATTEMPTS) {
    return { retryAfter: Math.ceil((entry.expiresAt - now) / 1_000) };
  }
  if (!entry && attempts.size >= MAX_CLIENTS) return { retryAfter: 60 };

  const current = entry ?? { count: 0, expiresAt: now + WINDOW_MS };
  // Reserve before reading the body so simultaneous requests also count.
  current.count += 1;
  attempts.set(client, current);
  return { retryAfter: 0, reset: () => attempts.delete(client) };
}
