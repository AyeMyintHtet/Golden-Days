import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const directory = process.argv[2];
// Omitted from the website at the owner's request; the local copy is retained.
const excluded = new Set(["327.mp4"]);
if (!directory)
  throw new Error(
    "Pass the folder containing the numbered WebP and MP4 files.",
  );
const files = (await readdir(directory))
  .filter((name) => /^\d+\.(webp|mp4)$/.test(name) && !excluded.has(name))
  .sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
const ids = new Set();
const media = [];
for (const file of files) {
  const id = path.parse(file).name;
  if (ids.has(id)) throw new Error(`Duplicate media number: ${id}`);
  ids.add(id);
  media.push({ file, bytes: (await stat(path.join(directory, file))).size });
}
if (!media.length) throw new Error("No numbered media found.");
await mkdir("server", { recursive: true });
await writeFile(
  "server/media-index.json",
  JSON.stringify(media, null, 2) + "\n",
);
console.log(
  `Indexed ${media.length} files in numeric order. No media was copied.`,
);
