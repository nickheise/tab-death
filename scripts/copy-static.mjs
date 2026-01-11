import { mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve("dist");

await mkdir(dist, { recursive: true });

const files = [
  "manifest.json",
  "popup.html",
  "popup.js",
  "prompt.html",
  "prompt.js",
];

await Promise.all(
  files.map(async (file) => {
    await copyFile(resolve(file), resolve(dist, file));
  })
);
