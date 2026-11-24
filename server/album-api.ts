import type { IncomingMessage, ServerResponse } from "node:http";
import { createImageKitAlbum } from "./imagekit.js";
import { beginLoginAttempt } from "./login-attempts.js";
import {
  configurationReady,
  createSession,
  passwordMatches,
  sessionCookie,
  sessionExpiry,
  type AlbumEnvironment,
} from "./session.js";

type ApiRequest = IncomingMessage & { body?: unknown };

async function readPassword(request: ApiRequest) {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    return null;
  let body = request.body;
  if (body === undefined) {
    let text = "";
    for await (const chunk of request) {
      text += chunk.toString();
      if (Buffer.byteLength(text) > 2048) return null;
    }
    body = text;
  }
  if (typeof body === "string") {
    if (Buffer.byteLength(body) > 2048) return null;
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (!body || typeof body !== "object" || !("password" in body)) return null;
  const password = body.password;
  return typeof password === "string" && password.length <= 256
    ? password
    : null;
}

export async function handleAlbumApi(
  request: ApiRequest,
  response: ServerResponse,
  env: AlbumEnvironment = process.env,
) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  const send = (status: number, body: unknown) => {
    response.statusCode = status;
    response.end(JSON.stringify(body));
  };
  const action =
    new URL(
      request.url ?? "/api/album",
      "https://local.invalid",
    ).searchParams.get("action") ?? "album";
  const method = action === "login" || action === "logout" ? "POST" : "GET";
  if (!["album", "session", "login", "logout"].includes(action))
    return send(404, { error: "Not found." });
  if (request.method !== method) {
    response.setHeader("Allow", method);
    return send(405, { error: "Method not allowed." });
  }
  if (method === "POST") {
    // No cross-origin login or sign-out, even before a session exists.
    try {
      const origin = new URL(request.headers.origin ?? "");
      if (
        origin.host !== request.headers.host ||
        !["http:", "https:"].includes(origin.protocol) ||
        ((env.VERCEL === "1" || env.NODE_ENV === "production") &&
          origin.protocol !== "https:")
      )
        return send(403, { error: "Request not allowed." });
    } catch {
      return send(403, { error: "Request not allowed." });
    }
  }
  if (action === "logout") {
    response.setHeader("Set-Cookie", sessionCookie("", env, true));
    return send(200, { authenticated: false });
  }
  if (!configurationReady(env))
    return send(503, { error: "Album setup is incomplete." });

  if (action === "login") {
    const attempt = beginLoginAttempt(request, env);
    if (attempt.retryAfter > 0) {
      response.setHeader("Retry-After", String(attempt.retryAfter));
      return send(429, {
        error: "Too many sign-in attempts. Please try again later.",
      });
    }
    try {
      const password = await readPassword(request);
      if (password === null)
        return send(400, { error: "Enter your family password." });
      if (!passwordMatches(password, env))
        return send(401, {
          error: "That password didn’t match. Please try again.",
        });
      attempt.reset?.();
      const session = createSession(env);
      response.setHeader("Set-Cookie", sessionCookie(session.token, env));
      return send(200, { authenticated: true, expiresAt: session.expiresAt });
    } catch {
      return send(400, { error: "The sign-in request couldn’t be read." });
    }
  }
  const expiresAt = sessionExpiry(request, env);
  if (action === "session")
    return send(200, { authenticated: Boolean(expiresAt), expiresAt });
  if (!expiresAt)
    return send(401, { error: "Please sign in to open your family album." });
  try {
    const album = createImageKitAlbum(env);
    // Shared caches must never store private manifests. The app deliberately
    // retains a local copy on this trusted device for its offline album.
    response.setHeader("Cache-Control", "private, no-cache");
    response.setHeader("Vary", "Cookie");
    response.setHeader("X-Media-Expires-At", String(album.expiresAt));
    return send(200, album.items);
  } catch {
    return send(503, { error: "Your album couldn’t open. Please try again." });
  }
}
