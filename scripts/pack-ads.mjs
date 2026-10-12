// scripts/pack-ads.mjs: the city's adverts as one atlas.
//
// Sixteen wide adverts (3:2) in a 4 x 4 grid over eight tall ones (2:3) laid
// on their sides in two rows along the foot: public/scenes/world/ads.webp
// (2048 x 2048) and ads-phone.webp (half that each way). src/world/materials.js, billboard(), reads the
// same layout. The art is original, drawn for the city with the codex-image
// skill (design/night-city-world/ads/generate.sh and generate-2.sh hold the briefs): no brand,
// no words, in the flat graphic style of the show's billboards.
import sharp from "sharp";
import { join } from "node:path";

const WIDE = ["can", "noodle", "eye", "shoe", "idol", "bike", "pill", "cat", "glyphs", "disc", "travel", "burger", "phones", "robodog", "arcade", "mask"];
const TALL = ["drink", "hand", "fish", "fight", "tower", "scent", "blade", "column"];
const dir = process.argv[2] ?? "design/night-city-world/ads";
const W = 512;
const H = 341;
const layers = [];
for (const [i, name] of WIDE.entries()) {
  const input = await sharp(join(dir, `${name}.webp`)).resize(W, H, { fit: "cover" }).toBuffer();
  layers.push({ input, left: (i % 4) * W, top: Math.floor(i / 4) * H });
}
for (const [i, name] of TALL.entries()) {
  // Two steps: sharp turns before it resizes, whatever order they are asked in.
  const upright = await sharp(join(dir, `${name}.webp`)).resize(H, W, { fit: "cover" }).toBuffer();
  const input = await sharp(upright).rotate(90).toBuffer();
  layers.push({ input, left: (i % 4) * W, top: 4 * H + 1 + Math.floor(i / 4) * H });
}
const atlas = await sharp({ create: { width: 4 * W, height: 2048, channels: 3, background: "#000" } }).composite(layers).png().toBuffer();
await sharp(atlas).webp({ quality: 80 }).toFile("public/scenes/world/ads.webp");
await sharp(atlas).resize(1024, 1024).webp({ quality: 76 }).toFile("public/scenes/world/ads-phone.webp");
console.log("ads.webp, ads-phone.webp");
