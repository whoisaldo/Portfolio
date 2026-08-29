// scripts/optimize-images.mjs: the portfolio's image pipeline.
//
//   npm run images
//
// Encodes every referenced asset in src/assets into AVIF/WebP (plus a JPEG
// fallback for key art), emits a 320px modal thumbnail and a 20px LQIP for
// each, then regenerates two data modules:
//
//   src/data/lqip.js    key -> base64 WebP data URI
//   src/data/images.js  key -> { src, width, height, lqip, avif, webp, thumb }
//
// sharp is a devDependency and is imported by this script ONLY. Nothing under
// src/ imports it, so `vite build` on CI never needs it: the encoded files and
// the two generated modules are committed to the repo.
//
// Idempotent: an output is rewritten only when it is older than its source, so
// re-running is close to free. Sources that have already been converted and
// deleted are reported as such rather than failing the run; restore them with
// `git checkout -- <path>` if you need to re-encode.
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "src/assets");
const DATA = path.join(ROOT, "src/data");

// ---------------------------------------------------------------------------
// What we encode.
//
// Derived from the `../assets/...` imports in src/data/projects.js. Only files
// that something actually renders are listed; the unreferenced originals were
// deleted, not left to rot. `assertNoStrayImports()` below re-checks the data
// modules on every run so a newly added raw import can't silently skip the
// pipeline.
//
// Two filenames here are load-bearing and deliberately not "fixed": the folder
// `MoopsBookStore 2` carries a space and a 2, and FacialRegocnition is
// misspelled. Both are referenced by string; renaming either breaks the build.
//
//   keyart: 1536x1024 (3:2) generated device-mockup plates, ~90% near-black.
//            Photographic, so AVIF is very happy with them. Gets a JPEG
//            fallback because these are the hero images.
//   ui     : product screenshots, text-heavy, up to 3200x2000. Capped at 1600.
// ---------------------------------------------------------------------------
const SOURCES = [
  ["keyart", "KeyArt/KeyArt_EternalReverse.png"],
  ["keyart", "KeyArt/KeyArt_Exerly.png"],
  ["keyart", "KeyArt/KeyArt_EternalExchange.png"],
  ["keyart", "KeyArt/KeyArt_Moops.png"],
  ["keyart", "KeyArt/KeyArt_EternalMonitor.png"],
  ["keyart", "KeyArt/KeyArt_EternalRichPresence.png"],
  ["keyart", "KeyArt/KeyArt_FaceAnalytics.png"],
  ["keyart", "KeyArt/KeyArt_SignatureCuts.png"],

  ["ui", "EternalReverseStudio/EternalReverseLanding2026.png"],
  ["ui", "EternalReverseStudio/EternalReverseProducts2026.png"],
  ["ui", "EternalReverseStudio/EternalReverseProductEternalMonitor2026.png"],
  ["ui", "EternalReverseStudio/EternalReverseProductExerly2026.png"],
  ["ui", "EternalReverseStudio/EternalReverseAbout2026.png"],

  ["ui", "ExerlyFitness/ExerlyWebLanding2026.png"],
  ["ui", "ExerlyFitness/ExerlyWebDayLogged2026.png"],
  ["ui", "ExerlyFitness/ExerlyWebFeatures2026.png"],
  ["ui", "ExerlyFitness/ExerlyWebIOS2026.png"],
  ["ui", "ExerlyFitness/ExerlyFitnessPhoneView1.png"],
  ["ui", "ExerlyFitness/ExerlyFitnessPhoneView2.png"],
  ["ui", "ExerlyFitness/ExerlyFitnessPhoneView3.png"],

  ["ui", "EternalExchange/EternalExchangeLanding.png"],
  ["ui", "EternalExchange/EternalExchangeEMCValues.png"],
  ["ui", "EternalExchange/EternalExchangeHowItWorks.png"],
  ["ui", "EternalExchange/EternalExchangeFeatures.png"],
  ["ui", "EternalExchange/EternalExchangeInstall.png"],

  ["ui", "MoopsBookStore 2/moopsbooks_Landing2026.png"],
  ["ui", "MoopsBookStore 2/moopsbooks_Browse2026.png"],

  ["ui", "SignatureCuts/SignatureCutsWebView.png"],
  ["ui", "SignatureCuts/SignatureCutsPhoneView.png"],

  ["ui", "EternalRichPresence/EternalRichPresenceWebLanding.png"],
  ["ui", "EternalRichPresence/EternalRichPresenceWebFeatures.png"],
  ["ui", "EternalRichPresence/EternalRichPresenceWebSetup.png"],
  ["ui", "EternalRichPresence/EternalRichPresenceDiscordProfileView.png"],
  ["ui", "EternalRichPresence/EternalRichPresenceTerminal.png"],

  ["ui", "EternalMonitor/EternalMonitorWebLanding.png"],
  ["ui", "EternalMonitor/EternalMonitorWebFeatures.png"],
  ["ui", "EternalMonitor/EternalMonitorPCView.png"],
  ["ui", "EternalMonitor/EternalMonitorIpadView.png"],

  ["ui", "Facial/FacialRecognitionFrontPage.png"],
  ["ui", "Facial/FacialRecognitionHappy.png"],
  ["ui", "Facial/FacialRegocnitionAngryFace.png"],
];

// ---------------------------------------------------------------------------
// Encoder settings.
//
// Key art is photographic and mostly black: AVIF q52 measures 42.9 dB PSNR at
// ~26 KB, comfortably better than WebP q78 at ~39 KB, so the AVIF is both the
// smaller and the higher-fidelity candidate.
//
// UI screenshots are the opposite problem: small anti-aliased text is exactly
// what AVIF's aggressive settings smear. WebP q82 with smart subsampling is
// the dependable candidate here and is what lands in <img src>; AVIF is held
// at a deliberately generous q65 so it stays an enhancement rather than a
// downgrade. Do not push these two numbers down to chase bytes.
//
// (sharp/libvips ignores `chromaSubsampling` on AVIF output: verified, the
// bytes are identical either way, so it is not passed.)
// ---------------------------------------------------------------------------
const PROFILES = {
  keyart: {
    widths: [1600, 1024],
    avif: { quality: 52, effort: 6 },
    webp: { quality: 78, effort: 6 },
    jpegWidth: 1600,
    jpeg: { quality: 82, mozjpeg: true },
  },
  ui: {
    widths: [1600],
    avif: { quality: 65, effort: 6 },
    webp: { quality: 82, effort: 6, smartSubsample: true },
    jpegWidth: null,
    jpeg: null,
  },
};

const THUMB_WIDTH = 320;
const THUMB = { quality: 75, effort: 6, smartSubsample: true };

// 20px wide. These are not only placeholders: the redesign blurs them up as an
// ambient backplate behind each plate, so quality is set high enough that the
// gradient reads correctly. At this size q90 still costs ~300 bytes.
const LQIP_WIDTH = 20;
const LQIP = { quality: 90, effort: 6, smartSubsample: true };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "KeyArt/KeyArt_Exerly.png" -> "KeyArt/KeyArt_Exerly", the stable key. */
const keyOf = (rel) => rel.replace(/\.[^.]+$/, "");

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

async function sizeOf(file) {
  try {
    return (await fs.stat(file)).size;
  } catch {
    return 0;
  }
}

/** True when `out` exists and is at least as new as `src`. */
async function isFresh(out, src) {
  try {
    const [o, s] = await Promise.all([fs.stat(out), fs.stat(src)]);
    return o.mtimeMs >= s.mtimeMs;
  } catch {
    return false;
  }
}

/**
 * Encode one variant, skipping the work when the output is already current.
 * Returns { bytes, width, height, skipped }.
 */
async function encode(src, out, width, format, options) {
  if (await isFresh(out, src)) {
    const meta = await sharp(out).metadata();
    return { bytes: await sizeOf(out), width: meta.width, height: meta.height, skipped: true };
  }
  const info = await sharp(src)
    // withoutEnlargement keeps a 1536px-wide plate at 1536 rather than
    // upscaling it to the 1600 bucket. The filename records the bucket; the
    // srcset descriptor written into images.js records the real width.
    .resize({ width, withoutEnlargement: true })
    [format](options)
    .toFile(out);
  return { bytes: info.size, width: info.width, height: info.height, skipped: false };
}

/**
 * Guard against an image being added to the data layer without going through
 * this pipeline: any surviving raw raster import in the data modules should
 * either be in SOURCES or be one of the logos we deliberately leave alone.
 */
async function assertNoStrayImports() {
  const known = new Set(SOURCES.map(([, rel]) => rel));
  const stray = [];
  for (const file of ["projects.js", "experience.js", "profile.js"]) {
    const full = path.join(DATA, file);
    if (!existsSync(full)) continue;
    const text = await fs.readFile(full, "utf8");
    for (const m of text.matchAll(/["']\.\.\/assets\/([^"']+\.(?:png|jpe?g))["']/gi)) {
      const rel = m[1];
      if (known.has(rel) || rel.startsWith("PreviousExperience/")) continue;
      stray.push(`${file} -> ${rel}`);
    }
  }
  if (stray.length) {
    console.warn("\n  ! raw image imports not handled by this pipeline:");
    for (const s of stray) console.warn(`      ${s}`);
    console.warn("    Add them to SOURCES, or leave them if that is intentional.\n");
  }
}

// ---------------------------------------------------------------------------
// Generated modules
// ---------------------------------------------------------------------------

/** A unique, readable JS identifier for a generated import. */
function identFor(key, suffix, taken) {
  const base = `${key.replace(/[^a-zA-Z0-9]+/g, "_")}_${suffix}`;
  let ident = base.replace(/^(\d)/, "_$1");
  let n = 2;
  while (taken.has(ident)) ident = `${base}_${n++}`;
  taken.add(ident);
  return ident;
}

function writeLqipModule(entries) {
  const body = entries
    .map((e) => `  ${JSON.stringify(e.key)}: "${e.lqip}",`)
    .join("\n");
  return `// GENERATED by scripts/optimize-images.mjs. Do not edit by hand.
//
// A 20px-wide WebP for every encoded image, inlined as a base64 data URI and
// keyed by its path under src/assets without the extension. Roughly 300 bytes
// each, so the whole map is a rounding error in the bundle.
//
// These are more than placeholders: the redesign scales them up behind each
// key-art plate as an ambient backplate, which is why they are encoded at a
// quality that keeps the gradient honest.
export const lqip = {
${body}
};

export default lqip;
`;
}

function writeImagesModule(entries) {
  const taken = new Set();
  const byFile = new Map(); // asset path -> identifier, so a file is imported once
  const imports = [];
  const bodies = [];

  // A screenshot's <img> fallback is the same file as its 1600w WebP candidate;
  // importing it twice would just be noise.
  const importOnce = (file, key, suffix) => {
    const existing = byFile.get(file);
    if (existing) return existing;
    const ident = identFor(key, suffix, taken);
    byFile.set(file, ident);
    imports.push(`import ${ident} from "../assets/${file}";`);
    return ident;
  };

  for (const e of entries) {
    const fields = [`    width: ${e.width},`, `    height: ${e.height},`];

    for (const format of ["avif", "webp"]) {
      const widths = Object.keys(e[format]).map(Number).sort((a, b) => a - b);
      if (!widths.length) continue;
      const pairs = widths.map(
        (w) => `${w}: ${importOnce(e[format][w], e.key, `${w}${format}`)}`,
      );
      fields.push(`    ${format}: { ${pairs.join(", ")} },`);
    }

    fields.unshift(`    src: ${importOnce(e.fallbackFile, e.key, e.fallbackSuffix)},`);
    fields.push(`    thumb: ${importOnce(e.thumbFile, e.key, "thumb")},`);
    fields.push(`    lqip: lqip[${JSON.stringify(e.key)}],`);
    fields.push(`    lqipKey: ${JSON.stringify(e.key)},`);

    bodies.push([`  ${JSON.stringify(e.key)}: {`, ...fields, `  },`].join("\n"));
  }

  return `// GENERATED by scripts/optimize-images.mjs. Do not edit by hand.
//
// Every encoded variant, keyed by the source path under src/assets without its
// extension. Vite fingerprints and emits each import, so nothing here needs
// sharp at build time.
//
// Entry shape, matching what src/components/projects/ProjectImage.jsx consumes:
//
//   {
//     src,      // URL for <img src>: mozjpeg for key art, WebP for screenshots
//     width,    // intrinsic size of the largest variant, for CLS
//     height,
//     avif,     // { <width>: url } -> srcset candidates
//     webp,     // { <width>: url }
//     thumb,    // 320px WebP, for the modal thumbnail rail
//     lqip,     // 20px base64 data URI, usable straight in url("...")
//     lqipKey,  // key into src/data/lqip.js
//   }
import { lqip } from "./lqip";

${imports.join("\n")}

export const images = {
${bodies.join("\n")}
};

/** Look up one image entry. Throws loudly rather than rendering a blank box. */
export function img(key) {
  const entry = images[key];
  if (!entry) throw new Error(\`img(): unknown image key "\${key}"\`);
  return entry;
}

export { lqip };
export default images;
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await assertNoStrayImports();

  const entries = [];
  const missing = [];
  const rows = [];
  let beforeTotal = 0;
  let afterTotal = 0;
  let encoded = 0;
  let skipped = 0;

  for (const [cls, rel] of SOURCES) {
    const src = path.join(ASSETS, rel);
    const key = keyOf(rel);

    if (!existsSync(src)) {
      // Already converted and pruned. Confirm the derived files are still
      // there so a genuinely lost asset does not pass silently.
      const profile = PROFILES[cls];
      const probe = path.join(ASSETS, `${key}-${profile.widths[0]}.webp`);
      missing.push({ key, ok: existsSync(probe) });
      continue;
    }

    const profile = PROFILES[cls];
    const before = await sizeOf(src);
    beforeTotal += before;

    const out = { avif: {}, webp: {} };
    let width = 0;
    let height = 0;
    let after = 0;

    for (const w of profile.widths) {
      for (const format of ["avif", "webp"]) {
        const file = `${key}-${w}.${format}`;
        const r = await encode(src, path.join(ASSETS, file), w, format, profile[format]);
        out[format][r.width] = file;
        after += r.bytes;
        r.skipped ? skipped++ : encoded++;
        if (r.width > width) {
          width = r.width;
          height = r.height;
        }
      }
    }

    let fallbackFile = `${key}-${profile.widths[0]}.webp`;
    let fallbackSuffix = `${profile.widths[0]}webpSrc`;
    if (profile.jpeg) {
      fallbackFile = `${key}-${profile.jpegWidth}.jpg`;
      fallbackSuffix = "jpg";
      const r = await encode(src, path.join(ASSETS, fallbackFile), profile.jpegWidth, "jpeg", profile.jpeg);
      after += r.bytes;
      r.skipped ? skipped++ : encoded++;
    }

    const thumbFile = `${key}-${THUMB_WIDTH}.webp`;
    const t = await encode(src, path.join(ASSETS, thumbFile), THUMB_WIDTH, "webp", THUMB);
    after += t.bytes;
    t.skipped ? skipped++ : encoded++;

    const lqipBuf = await sharp(src).resize({ width: LQIP_WIDTH }).webp(LQIP).toBuffer();
    const lqipUri = `data:image/webp;base64,${lqipBuf.toString("base64")}`;

    afterTotal += after;
    rows.push({ cls, key, before, after, width, height, lqip: lqipBuf.length });
    entries.push({
      key,
      cls,
      width,
      height,
      avif: out.avif,
      webp: out.webp,
      fallbackFile,
      fallbackSuffix,
      thumbFile,
      lqip: lqipUri,
    });
  }

  // The generated modules describe the whole set, so they can only be rewritten
  // when the whole set is present. After a normal run the sources are pruned
  // and every later run lands here, verifies the derived files and stops.
  if (missing.length) {
    const lost = missing.filter((m) => !m.ok);
    console.log("");
    console.log(`  ${missing.length} source(s) already converted and pruned; ${entries.length} still present.`);
    if (lost.length) {
      console.error(`  ! derived files missing for: ${lost.map((m) => m.key).join(", ")}`);
      process.exitCode = 1;
    }
    if (entries.length) {
      console.log("  Encoded the present sources, but left src/data/{lqip,images}.js alone,");
      console.log("  regenerating from a partial set would drop the pruned images.");
      console.log("  Restore them all with `git checkout -- src/assets` to rebuild the modules.");
    }
    console.log("");
    return;
  }

  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(path.join(DATA, "lqip.js"), writeLqipModule(entries));
  await fs.writeFile(path.join(DATA, "images.js"), writeImagesModule(entries));

  // ---- summary --------------------------------------------------------
  rows.sort((a, b) => b.before - a.before);
  const w = Math.max(...rows.map((r) => r.key.length));
  console.log("");
  console.log(`  ${"class".padEnd(7)}${"image".padEnd(w + 2)}${"before".padStart(10)}${"after".padStart(10)}${"saved".padStart(8)}`);
  console.log(`  ${"-".repeat(7 + w + 2 + 28)}`);
  for (const r of rows) {
    const pct = `${(100 - (100 * r.after) / r.before).toFixed(0)}%`;
    console.log(`  ${r.cls.padEnd(7)}${r.key.padEnd(w + 2)}${kb(r.before).padStart(10)}${kb(r.after).padStart(10)}${pct.padStart(8)}`);
  }
  const lqipTotal = rows.reduce((n, r) => n + r.lqip, 0);
  console.log(`  ${"-".repeat(7 + w + 2 + 28)}`);
  console.log(`  ${"TOTAL".padEnd(7 + w + 2)}${mb(beforeTotal).padStart(10)}${mb(afterTotal).padStart(10)}${`${(100 - (100 * afterTotal) / beforeTotal).toFixed(1)}%`.padStart(8)}`);
  console.log("");
  console.log(`  ${rows.length} images · ${encoded} encoded · ${skipped} already current`);
  console.log(`  LQIP: ${rows.length} inline previews, ${kb(lqipTotal)} raw / ~${kb((lqipTotal * 4) / 3)} base64`);
  console.log(`  wrote src/data/lqip.js and src/data/images.js`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
