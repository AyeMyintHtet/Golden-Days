import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const project = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "golden-days-api-"));

try {
  writeFileSync(join(temporary, "package.json"), '{"type":"module"}');
  symlinkSync(
    join(project, "node_modules"),
    join(temporary, "node_modules"),
    "dir",
  );
  const files = [
    "api/album.ts",
    ...readdirSync(join(project, "server"))
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
      .map((file) => `server/${file}`),
  ];
  for (const file of files) {
    const target = join(temporary, file.replace(/\.ts$/, ".js"));
    mkdirSync(dirname(target), { recursive: true });
    // Emit only the API modules. No Vite build, HTTP server, or env file loads.
    const { outputText } = ts.transpileModule(
      readFileSync(join(project, file), "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      },
    );
    writeFileSync(target, outputText);
  }
  copyFileSync(
    join(project, "server/media-index.json"),
    join(temporary, "server/media-index.json"),
  );

  const probe = `
    import assert from "node:assert/strict";
    import { ServerResponse } from "node:http";
    import { Readable } from "node:stream";
    import handler from "./api/album.js";

    async function request(url, options = {}) {
      const req = Readable.from([]);
      req.url = url;
      req.method = options.body ? "POST" : "GET";
      req.body = options.body;
      req.headers = {
        host: "album.example.com",
        origin: "https://album.example.com",
        "content-type": "application/json",
        ...(options.cookie ? { cookie: options.cookie } : {}),
      };
      const res = new ServerResponse(req);
      let body;
      res.end = (value) => { body = JSON.parse(value); return res; };
      await handler(req, res);
      return { status: res.statusCode, headers: res.getHeaders(), body };
    }

    assert.equal((await request("/api/album?action=session")).status, 503);
    Object.assign(process.env, {
      VITE_IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/goldendays/",
      IMAGEKIT_PRIVATE_KEY: "fake-runtime-key-never-contact-a-provider",
      ALBUM_PASSWORD: "123456",
      ALBUM_SESSION_SECRET: "fake-runtime-session-secret-with-at-least-thirty-two-characters",
    });
    const session = await request("/api/album?action=session");
    assert.equal(session.status, 200);
    assert.equal(session.body.authenticated, false);
    assert.equal((await request("/api/album")).status, 401);
    const login = await request("/api/album?action=login", {
      body: { password: process.env.ALBUM_PASSWORD },
    });
    assert.equal(login.status, 200);
    assert.match(String(login.headers["set-cookie"]), /HttpOnly; SameSite=Strict/);
    const album = await request("/api/album", { cookie: login.headers["set-cookie"] });
    assert.equal(album.status, 200);
    assert.ok(album.body.length >= 560);
    assert.ok(album.body.every((item) => item.src.includes("ik-s=")));
    console.log("Native Node API: startup, configuration, session, login, and signed album passed.");
  `;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", probe],
    {
      cwd: temporary,
      encoding: "utf8",
      timeout: 15_000,
      // Never inherit actual private keys or passwords into this check.
      env: { NODE_ENV: "production", VERCEL: "1" },
    },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  process.stdout.write(result.stdout);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
