// scripts/make-stickers.mjs: cut the homepage's stickers.
//
// A sticker here is die-cut: the mark itself, with a white border that
// follows its outline, the way a vinyl sticker on a laptop lid is cut. Doing
// that in CSS takes a stack of drop-shadows that goes ragged on thin parts
// (a knife's point, a kunai's ring). Baking it is one pass, here, and the
// page ships a PNG per sticker.
//
// The border is the mark's alpha grown outward: blurred, then cut at a low
// threshold, which rounds it the way a cutting plotter would. Marks that are
// white, or that live on a white ground, sit on a backing shape first, or the
// border would swallow them.
//
// Sources are in design/stickers/ (where each came from is in
// src/front/Stickers.jsx). Run by hand and commit the output:
//   node scripts/make-stickers.mjs
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SRC = new URL("../design/stickers/", import.meta.url).pathname;
const OUT = new URL("../src/assets/front/stickers/", import.meta.url).pathname;
const EXP = new URL("../src/assets/PreviousExperience/", import.meta.url).pathname;
const LOGO = new URL("../src/assets/front/logos/", import.meta.url).pathname;

// The mark's longest side, before the border. Shown at 40 to 64 CSS pixels,
// so this is about 3x.
const SIZE = 200;
// The white border, in source pixels: about 3 CSS pixels at display size.
const BORDER = 9;

// `backing`: a shape the mark sits on, with `pad` of it showing round the
// mark. `fit` scales the mark inside a circle so its corners clear the edge.
const STICKERS = {
  claude: { file: SRC + "claude.svg" },
  openai: { file: SRC + "openai.svg", backing: { shape: "circle", color: "#ffffff", pad: 0.24 } },
  kiro: { file: SRC + "kiro.svg" },
  nvidia: { file: SRC + "nvidia.svg", backing: { shape: "round", color: "#000000", pad: 0.2 } },
  // AMD's wordmark in white on AMD red, the way AMD shows it.
  amd: { file: SRC + "amd.svg", width: 300, backing: { shape: "round", color: "#de0030", pad: 0.22 } },
  porsche: { file: SRC + "porsche.svg" },
  // On white: the rings alone cut hollow, with the page showing through each.
  audi: { file: SRC + "audi.svg", width: 300, backing: { shape: "round", color: "#ffffff", pad: 0.1 } },
  ie: { file: SRC + "ie.svg" },
  jackal: { file: SRC + "jackal.png", oval: true },
  aws: { file: EXP + "awslogosvg.norm.png" },
  philips: { file: EXP + "PhilipsLogo.svg" },
  pinnatec: { file: LOGO + "pinnatec-mark.png", backing: { shape: "circle", color: "#18322a", pad: 0.3 } },
  eddies: { file: SRC + "eddies.png" },
  gourd: { file: SRC + "gourd.png" },
  daggers: { file: SRC + "daggers.png" },
  jett: { file: SRC + "jett.png" },
  "badge-s4": { file: SRC + "badge-s4.png", width: 300 },
  "badge-s6": { file: SRC + "badge-s6.png", width: 300 },
};

const clear = { r: 0, g: 0, b: 0, alpha: 0 };

/** The mark as RGBA, trimmed, its longest side `size`. */
async function mark(file, size) {
  const trimmed = await sharp(file, { density: 600 }).ensureAlpha().trim({ threshold: 1 }).toBuffer();
  return sharp(trimmed).resize(size, size, { fit: "inside" }).png().toBuffer();
}

/** A mark cut to the ellipse inside its box: Jackal's oval badge comes on a
 *  white square, and the square's corners should not be part of the cut. */
async function inOval(buf) {
  const { width, height } = await sharp(buf).metadata();
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}"/></svg>`);
  return sharp(buf).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

/** The mark centred on a filled shape. */
async function onBacking(buf, { shape, color, pad }) {
  const { width, height } = await sharp(buf).metadata();
  const p = Math.round(Math.max(width, height) * pad);
  let w = width + 2 * p;
  let h = height + 2 * p;
  if (shape === "circle") w = h = Math.ceil(Math.hypot(width, height)) + p;
  const r = shape === "circle" ? Math.min(w, h) / 2 : Math.min(w, h) * 0.22;
  const backing = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="${color}"/></svg>`);
  return sharp(backing)
    .composite([{ input: buf, left: Math.round((w - width) / 2), top: Math.round((h - height) / 2) }])
    .png()
    .toBuffer();
}

/** The die cut: the mark on a white silhouette grown BORDER pixels out. */
async function dieCut(buf) {
  const pad = BORDER + 4;
  const { data, info } = await sharp(buf)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: clear })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const alpha = Buffer.alloc(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  // A Gaussian edge falls to 3% about 1.9 sigma out, so cutting there grows
  // the shape by BORDER. Then a touch of blur to antialias the cut.
  // extractChannel: libvips hands a blurred single band back as sRGB.
  const one = (img) => img.extractChannel(0).raw().toBuffer();
  const grown = await one(sharp(alpha, { raw: { width, height, channels: 1 } }).blur(BORDER / 1.9));
  for (let i = 0; i < grown.length; i++) grown[i] = grown[i] > 8 ? 255 : 0;
  const edge = await one(sharp(grown, { raw: { width, height, channels: 1 } }).blur(0.8));
  const white = Buffer.alloc(width * height * 4);
  for (let i = 0; i < edge.length; i++) {
    white[i * 4] = white[i * 4 + 1] = white[i * 4 + 2] = 255;
    white[i * 4 + 3] = edge[i];
  }
  return sharp(white, { raw: { width, height, channels: 4 } })
    .composite([{ input: buf, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

mkdirSync(OUT, { recursive: true });
for (const [name, s] of Object.entries(STICKERS)) {
  let buf = await mark(s.file, s.width ?? SIZE);
  if (s.oval) buf = await inOval(buf);
  if (s.backing) buf = await onBacking(buf, s.backing);
  const out = await dieCut(buf);
  const info = await sharp(out).toFile(OUT + name + ".png");
  console.log(`${name}.png ${info.width}x${info.height} ${(info.size / 1024).toFixed(1)} KB`);
}
