import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { ServerResponse, type IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Image, Video } from "@imagekit/react";
import { handleAlbumApi } from "../server/album-api";
import { createImageKitAlbum } from "../server/imagekit";
import { createSession, sessionCookie, sessionExpiry } from "../server/session";
import { imageKitSource } from "../src/lib/imagekit";
import media from "../server/media-index.json";
import { canCacheMedia } from "../src/lib/media-cache";

// Fake keys only. These checks never open a port or contact ImageKit.
const env = {
  VITE_IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/goldendays/",
  IMAGEKIT_PRIVATE_KEY: "private_test_key_not_a_real_credential",
  ALBUM_PASSWORD: "test-family-password-long-enough",
  ALBUM_SESSION_SECRET:
    "test-session-secret-with-more-than-thirty-two-characters",
  VERCEL: "1",
};

async function request(
  url: string,
  options: {
    method?: string;
    cookie?: string;
    origin?: string;
    ip?: string;
    remoteAddress?: string;
    body?: unknown;
    environment?: typeof env;
  } = {},
) {
  const req = Readable.from(
    options.body === undefined
      ? []
      : [Buffer.from(JSON.stringify(options.body))],
  ) as IncomingMessage;
  req.method = options.method ?? "GET";
  req.url = url;
  req.socket = {
    remoteAddress: options.remoteAddress ?? "203.0.113.1",
  } as IncomingMessage["socket"];
  req.headers = {
    host: "album.example.com",
    "x-vercel-forwarded-for": options.ip ?? "203.0.113.1",
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.cookie ? { cookie: options.cookie } : {}),
    ...(options.body !== undefined
      ? { "content-type": "application/json" }
      : {}),
  };
  const res = new ServerResponse(req);
  let body = "";
  res.end = ((value: string) => {
    body = value;
    return res;
  }) as typeof res.end;
  await handleAlbumApi(req, res, options.environment ?? env);
  return {
    status: res.statusCode,
    body: JSON.parse(body),
    headers: res.getHeaders(),
  };
}

function validSignature(link: string) {
  const url = new URL(link);
  const signature = url.searchParams.get("ik-s");
  const expiry = url.searchParams.get("ik-t");
  assert.ok(Number(expiry) * 1000 > Date.now() + 14 * 60_000);
  url.searchParams.delete("ik-s");
  url.searchParams.delete("ik-t");
  url.searchParams.delete("ik-attachment");
  url.searchParams.delete("ik-attachment-filename");
  const value = url.href.replace(env.VITE_IMAGEKIT_URL_ENDPOINT, "") + expiry;
  assert.equal(
    signature,
    createHmac("sha1", env.IMAGEKIT_PRIVATE_KEY).update(value).digest("hex"),
  );
}

test("numbered files retain stable IDs and omit video 327 when more files are added", () => {
  assert.ok(media.length >= 560);
  assert.equal(media[0].file, "1.mp4");
  assert.equal(media[1].file, "2.mp4");
  assert.equal(media[2].file, "3.webp");
  const ids = media.map((item) => Number.parseInt(item.file));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    ids,
    Array.from({ length: Math.max(...ids) }, (_, i) => i + 1).filter(
      (id) => id !== 327,
    ),
  );
});

test("an unauthenticated client cannot read the album or sign arbitrary media", async () => {
  const result = await request("/api/album?file=other-album/private.webp");
  assert.equal(result.status, 401);
  assert.equal(result.headers["cache-control"], "no-store");
  assert.ok(!JSON.stringify(result.body).includes("ik-s="));
});

test("missing private configuration fails closed without exposing secrets", async () => {
  const result = await request("/api/album?action=session", {
    environment: { ...env, IMAGEKIT_PRIVATE_KEY: "" },
  });
  assert.equal(result.status, 503);
  assert.ok(!JSON.stringify(result.body).includes(env.ALBUM_SESSION_SECRET));
});

test("cross-origin login and logout are rejected", async () => {
  for (const action of ["login", "logout"]) {
    const result = await request(`/api/album?action=${action}`, {
      method: "POST",
      origin: "https://untrusted.example",
      body: { password: env.ALBUM_PASSWORD },
    });
    assert.equal(result.status, 403);
    assert.equal(result.headers["set-cookie"], undefined);
  }
});

test("production login rejects an insecure origin, wrong passwords, and oversized bodies", async () => {
  assert.equal(
    (
      await request("/api/album?action=login", {
        method: "POST",
        origin: "http://album.example.com",
        body: { password: env.ALBUM_PASSWORD },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/album?action=login", {
        method: "POST",
        origin: "https://album.example.com",
        body: { password: "wrong" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/album?action=login", {
        method: "POST",
        origin: "https://album.example.com",
        body: { password: "x".repeat(3000) },
      })
    ).status,
    400,
  );
});

test("successful login issues a secure HttpOnly cookie and never returns its token", async () => {
  const result = await request("/api/album?action=login", {
    method: "POST",
    origin: "https://album.example.com",
    body: { password: env.ALBUM_PASSWORD },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.authenticated, true);
  const cookie = String(result.headers["set-cookie"]);
  for (const flag of ["HttpOnly", "SameSite=Strict", "Secure", "Path=/api"])
    assert.ok(cookie.includes(flag));
  assert.ok(!JSON.stringify(result.body).includes("token"));
});

test("a configured six-digit family code can open the album without weakening session cookies", async () => {
  const environment = { ...env, ALBUM_PASSWORD: "123456" };
  const session = await request("/api/album?action=session", { environment });
  assert.equal(session.status, 200);
  assert.equal(session.body.authenticated, false);
  const login = await request("/api/album?action=login", {
    method: "POST",
    origin: "https://album.example.com",
    ip: "203.0.113.20",
    body: { password: environment.ALBUM_PASSWORD },
    environment,
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.authenticated, true);
  assert.match(
    String(login.headers["set-cookie"]),
    /HttpOnly; SameSite=Strict/,
  );
  for (const password of ["", "12345", "1".repeat(257)]) {
    const invalid = await request("/api/album?action=session", {
      environment: { ...env, ALBUM_PASSWORD: password },
    });
    assert.equal(invalid.status, 503);
  }
});

test("repeated failures are throttled, expire, and reset after a successful sign-in", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const login = (password: string, ip = "203.0.113.30") =>
    request("/api/album?action=login", {
      method: "POST",
      origin: "https://album.example.com",
      ip,
      body: { password },
    });
  for (let i = 0; i < 5; i++) assert.equal((await login("wrong")).status, 401);
  const blocked = await login(env.ALBUM_PASSWORD);
  assert.equal(blocked.status, 429);
  assert.equal(Number(blocked.headers["retry-after"]), 900);
  assert.equal(blocked.headers["set-cookie"], undefined);
  assert.equal((await login(env.ALBUM_PASSWORD, "203.0.113.31")).status, 200);
  now += 15 * 60_000 + 1;
  assert.equal((await login(env.ALBUM_PASSWORD)).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await login("wrong")).status, 401);
  assert.equal((await login(env.ALBUM_PASSWORD)).status, 200);
  assert.equal((await login("wrong")).status, 401);
});

test("local clients cannot bypass the login limit by spoofing forwarded addresses", async () => {
  for (let i = 0; i < 6; i++) {
    const result = await request("/api/album?action=login", {
      method: "POST",
      origin: "https://album.example.com",
      ip: `203.0.113.${50 + i}`,
      remoteAddress: "203.0.113.40",
      environment: { ...env, VERCEL: "0" },
      body: { password: "wrong" },
    });
    assert.equal(result.status, i < 5 ? 401 : 429);
  }
});

test("tampering with a session or changing the family password revokes access", () => {
  const { token } = createSession(env);
  const req = {
    headers: { cookie: sessionCookie(token, env) },
  } as IncomingMessage;
  assert.ok(sessionExpiry(req, env));
  assert.equal(
    sessionExpiry(req, {
      ...env,
      ALBUM_PASSWORD: "a-different-family-password",
    }),
    null,
  );
  req.headers.cookie = sessionCookie(
    token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"),
    env,
  );
  assert.equal(sessionExpiry(req, env), null);
});

test("authenticated album responses are private and contain only correctly signed variants", async () => {
  const result = await request("/api/album", {
    cookie: sessionCookie(createSession(env).token, env),
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers["cache-control"], "private, no-cache");
  assert.equal(result.headers.vary, "Cookie");
  assert.equal(result.body.length, media.length);
  const serialized = JSON.stringify(result.body);
  assert.ok(!serialized.includes(env.IMAGEKIT_PRIVATE_KEY));
  assert.ok(!serialized.includes(env.ALBUM_PASSWORD));
  for (const item of result.body) {
    validSignature(item.src);
    validSignature(item.downloadUrl);
    if (item.kind === "photo") {
      validSignature(item.thumbnail);
      validSignature(item.thumbnailLarge);
    } else assert.match(item.src, /tr:orig-true/);
  }
});

test("React SDK preserves server signatures for images, videos, and attachment URLs", () => {
  const album = createImageKitAlbum(env);
  for (const item of [
    album.items[0],
    album.items.find((item) => item.kind === "photo")!,
  ]) {
    for (const link of [item.src, item.downloadUrl]) {
      const props = imageKitSource(link, env.VITE_IMAGEKIT_URL_ENDPOINT)!;
      const shared = { ...props, urlEndpoint: env.VITE_IMAGEKIT_URL_ENDPOINT };
      const markup =
        item.kind === "video"
          ? renderToStaticMarkup(createElement(Video, shared))
          : renderToStaticMarkup(
              createElement(Image, { ...shared, alt: "", responsive: false }),
            );
      const rendered = markup
        .match(/ src="([^"]+)"/)?.[1]
        .replaceAll("&amp;", "&");
      assert.equal(rendered, link);
      validSignature(rendered!);
    }
  }
  assert.equal(
    imageKitSource(
      "https://ik.imagekit.io/another-account/1.webp",
      env.VITE_IMAGEKIT_URL_ENDPOINT,
    ),
    null,
  );
});

test("sign-out clears the cookie and write methods cannot modify the album", async () => {
  const logout = await request("/api/album?action=logout", {
    method: "POST",
    origin: "https://album.example.com",
  });
  assert.equal(logout.status, 200);
  assert.match(String(logout.headers["set-cookie"]), /Max-Age=0/);
  assert.equal(
    (
      await request("/api/album", {
        method: "POST",
        origin: "https://album.example.com",
      })
    ).status,
    405,
  );
});

test("offline private copies still reject no-store, failed, and oversized responses", () => {
  const headers = {
    "Content-Type": "image/webp",
    "Content-Length": "30000",
    "Cache-Control": "public, max-age=900, must-revalidate",
  };
  assert.equal(canCacheMedia(new Response(null, { headers }), "image"), false);
  assert.equal(
    canCacheMedia(new Response(null, { headers }), "image", true),
    true,
  );
  assert.equal(
    canCacheMedia(
      new Response(null, {
        headers: { ...headers, "Cache-Control": "no-store" },
      }),
      "image",
      true,
    ),
    false,
  );
  assert.equal(
    canCacheMedia(new Response(null, { headers, status: 401 }), "image", true),
    false,
  );
  assert.equal(
    canCacheMedia(
      new Response(null, {
        headers: { ...headers, "Content-Length": String(3 * 1024 * 1024) },
      }),
      "image",
      true,
    ),
    false,
  );
});
