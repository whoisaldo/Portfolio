// scripts/pack-ads.mjs: the city's adverts as one atlas.
//
// Eight wide adverts (3:2) in a 4 x 2 grid over four tall ones (2:3) laid on
// their sides along the foot: public/scenes/world/ads.webp (2048 x 1024) and
// ads-phone.webp (half that). src/world/materials.js, billboard(), reads the
// same layout. The art is original, drawn for the city with the codex-image
// skill (design/night-city-world/ads/generate.sh holds the briefs): no brand,
// no words, in the flat graphic style of the show's billboards.
import sharp from "sharp";
import { join } from "node:path";

const WIDE = ["can", "noodle", "eye", "shoe", "idol", "bike", "pill", "cat"];
const TALL = ["drink", "hand", "fish", "fight"];
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
  layers.push({ input, left: i * W, top: 2 * H + 1 });
}
const atlas = await sharp({ create: { width: 4 * W, height: 1024, channels: 3, background: "#000" } }).composite(layers).png().toBuffer();
await sharp(atlas).webp({ quality: 80 }).toFile("public/scenes/world/ads.webp");
await sharp(atlas).resize(1024, 512).webp({ quality: 76 }).toFile("public/scenes/world/ads-phone.webp");
console.log("ads.webp, ads-phone.webp");
