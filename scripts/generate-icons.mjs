// Rasterize public/assets/logomark.svg → 5 PWA icon PNGs via sharp
import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgPath = resolve(root, "public/assets/logomark.svg");
const svgBuffer = readFileSync(svgPath);

mkdirSync(resolve(root, "public/icons"), { recursive: true });

const BG = { r: 13, g: 15, b: 19, alpha: 1 };

async function rasterize(size) {
  return sharp(svgBuffer, { density: 512 })
    .resize(size, size)
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

async function compositeOnBg(size) {
  const fg = await rasterize(size);
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: fg, blend: "over" }])
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

async function maskable(size) {
  const innerSize = Math.round(size * 0.6);
  const fg = await rasterize(innerSize);
  const offset = Math.round((size - innerSize) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: fg, top: offset, left: offset, blend: "over" }])
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

const targets = [
  { path: "public/icons/apple-touch-icon.png", buf: () => compositeOnBg(180) },
  { path: "public/apple-touch-icon.png",       buf: () => compositeOnBg(180) },
  { path: "public/icons/icon-192.png",          buf: () => compositeOnBg(192) },
  { path: "public/icons/icon-512.png",          buf: () => compositeOnBg(512) },
  { path: "public/icons/icon-maskable-512.png", buf: () => maskable(512) },
];

for (const t of targets) {
  const outPath = resolve(root, t.path);
  const buf = await t.buf();
  await sharp(buf).toFile(outPath);
  console.log(`wrote ${t.path}`);
}
