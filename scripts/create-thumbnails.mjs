import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const directory = path.resolve("public/images");
const output = path.join(directory, "thumbnails");
await mkdir(output, { recursive: true });

// Run locally on website copies. Originals are never overwritten.
for (const file of await readdir(directory)) {
  if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
  const name = path.parse(file).name;
  for (const width of [320, 640]) {
    await sharp(path.join(directory, file))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(output, `${name}-${width}.webp`));
  }
  console.log(`Created thumbnails: ${name}`);
}
