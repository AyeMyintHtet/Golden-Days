import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile(
  new URL("../public/favicon.svg", import.meta.url),
);
const output = new URL("../public/icons/", import.meta.url);
await mkdir(output, { recursive: true });

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(source, { density: 600 })
    .resize(size, size)
    .flatten({ background: "#f5ead4" })
    .png()
    .toFile(new URL(name, output).pathname);
}

const inset = await sharp(source, { density: 600 })
  .resize(384, 384)
  .png()
  .toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#f5ead4" },
})
  .composite([{ input: inset, left: 64, top: 64 }])
  .flatten({ background: "#f5ead4" })
  .png()
  .toFile(new URL("maskable-512.png", output).pathname);
console.log("Created app, maskable, and Apple touch icons.");
