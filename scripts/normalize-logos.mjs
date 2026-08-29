// scripts/normalize-logos.mjs: normalise the Experience logos.
//
//   node scripts/normalize-logos.mjs
//
// The five company logos come from five different places and share nothing:
//
//   awslogosvg.svg            1280x960 SVG, opaque #000 ground, width="100%"
//                             with only a viewBox (so no intrinsic width)
//   PhilipsLogo.svg            139x177 SVG, transparent, blue fills
//   NEULOGO.png                750x750 PNG, transparent, red seal
//   Topchoicerealtylogo.jpeg   225x225 JPEG, opaque #000 ground
//   RobertDefalcoRealty.webp   512x512 WebP, opaque #000 ground
//
// Two problems that no amount of CSS fixes properly:
//
//   1. Baked-in padding. Each asset has a different amount of dead margin
//      around its mark, so rendering them all at one CSS height makes some
//      look twice the weight of others. `trim()` removes the uniform border:
//      black for the opaque three, transparent for the other two.
//   2. The opaque black grounds. They vanish against the ink page under
//      `mix-blend-mode: screen`, but relying on a blend mode makes the mark
//      hostage to whatever is painted behind it. Deriving alpha from luminance
//      bakes the transparency in: black -> transparent, bright -> opaque.
//      These marks are all light-on-black, so luminance is the right key.
//
// Output is a transparent PNG per logo at a consistent cap height, written
// beside the source as `<name>.norm.png`. Sources are kept; rerun after
// replacing one.
import sharp from "sharp";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(root, "src/assets/PreviousExperience");
const CAP = 160; // rendered at ~56-64 CSS px, so 160 covers 2x

// `keyOnLuminance` is for the assets that ship an opaque black ground.
const SOURCES = [
  { file: "awslogosvg.svg", keyOnLuminance: true },
  { file: "PhilipsLogo.svg", keyOnLuminance: false },
  { file: "NEULOGO.png", keyOnLuminance: false },
  { file: "Topchoicerealtylogo.jpeg", keyOnLuminance: true },
  { file: "RobertDefalcoRealty.webp", keyOnLuminance: true },
];

for (const { file, keyOnLuminance } of SOURCES) {
  const src = join(DIR, file);
  const out = src.replace(/\.(svg|png|jpe?g|webp)$/i, ".norm.png");

  // density matters for the SVGs: rasterise well above the target so the
  // trim and the downscale both have pixels to work with.
  let img = sharp(src, { density: 600 }).ensureAlpha();

  if (keyOnLuminance) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      // Fully transparent below the floor, ramping to opaque. The ramp keeps
      // antialiased edges soft instead of producing a hard jagged cutout.
      data[i + 3] = lum <= 12 ? 0 : Math.min(255, Math.round((lum - 12) * 3.2));
    }
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }

  const info = await img
    .trim({ threshold: 1 })
    .resize({ height: CAP, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toFile(out);

  const before = statSync(src).size;
  console.log(
    `${file.padEnd(28)} -> ${out.split("/").pop().padEnd(30)} ${info.width}x${info.height}  ${(before / 1024).toFixed(0)}KB -> ${(info.size / 1024).toFixed(0)}KB`
  );
}

console.log(
  "\nwrote " +
    readdirSync(DIR).filter((f) => f.endsWith(".norm.png")).length +
    " normalised logos"
);
