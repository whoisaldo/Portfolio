// scripts/optimize-world.mjs: the city's two GLBs, from one Blender export.
//
// `npm run world:assets`, after scripts/blender/build_night_city_world.py has
// written design/night-city-world/world-source.glb. Produces:
//
//   public/scenes/world/world-high.glb   desktop: everything, 1K WebP maps
//   public/scenes/world/world-phone.glb  phone: no `detail` meshes (the rails,
//                                        units, lanterns and clutter tagged in
//                                        Blender), 512 px maps
//   public/scenes/world/moon.webp        the intro's moon still, for the
//                                        Contact shot's moon
//   public/scenes/world/holo.webp        the avenue's holographic figure
//   public/scenes/world/earth.webp       the portrait plate's Earth, for the
//                                        intro's voxel moon
//   public/scenes/world/ad-*.webp        the avenue's two big screens
//   public/scenes/world/koi-*.webp       the holographic koi over the avenue
//   public/scenes/world/shops-*.webp     the rooms behind the shop windows
//   public/scenes/world/logos.webp       corpo row's logos, one atlas
//   src/data/world-assets.js             their URLs, with a content hash so
//                                        a rebuilt city replaces a cached one
//
// Only the road keeps a roughness map: the site's wet-road shader reads it
// for the puddles. Every other surface is flat paint or the facade shader,
// so their roughness maps would be bytes nobody draws. Budgets from the
// brief are asserted here, so a build that outgrows them fails loudly.
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, meshopt, prune, textureCompress } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const SOURCE = "design/night-city-world/world-source.glb";
const OUT = "public/scenes/world";
const BUDGET = { high: 3.5e6, phone: 1.5e6 };
const TIERS = {
  high: { size: 1024, quality: 82, dropDetail: false },
  phone: { size: 512, quality: 76, dropDetail: true },
};

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

await mkdir(OUT, { recursive: true });
const sizes = {};

for (const [tier, opts] of Object.entries(TIERS)) {
  const document = await io.read(SOURCE);
  const root = document.getRoot();

  // Roughness maps: the road's only.
  for (const material of root.listMaterials()) {
    if (material.getName() !== "NCW_asphalt") material.setMetallicRoughnessTexture(null);
  }

  // The phone drops everything Blender tagged as detail.
  if (opts.dropDetail) {
    for (const node of root.listNodes()) {
      if (node.getExtras()?.detail === 1) node.dispose();
    }
  }

  await document.transform(
    // keepLeaves: the anchors and cameras are empty nodes, and they are the
    // whole point of reading this file by name. keepAttributes: the facades'
    // UVs are window cells and their colours are per-building parameters for
    // the site's shaders, which no glTF texture references.
    prune({ keepLeaves: true, keepExtras: true, keepAttributes: true }),
    // Materials are not merged: the site dresses each one by its name, and
    // two that happen to match in Blender (the garage's walls and the
    // street's concrete) are lit differently on the site.
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [opts.size, opts.size], quality: opts.quality }),
    meshopt({ encoder: MeshoptEncoder, level: "high", quantizePosition: 16, quantizeNormal: 10, quantizeTexcoord: 14 }),
  );
  const path = `${OUT}/world-${tier}.glb`;
  await io.write(path, document);
  sizes[tier] = (await stat(path)).size;
  let triangles = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) triangles += (prim.getIndices()?.getCount() ?? 0) / 3;
  }
  console.log(`world-${tier}.glb: ${(sizes[tier] / 1e6).toFixed(2)} MB, ${root.listMeshes().length} meshes, ` +
    `${triangles.toLocaleString()} triangles, ${root.listTextures().length} textures`);
  if (sizes[tier] > BUDGET[tier]) {
    throw new Error(`world-${tier}.glb is ${(sizes[tier] / 1e6).toFixed(2)} MB, over its ${BUDGET[tier] / 1e6} MB budget`);
  }
}

// The moon: the intro's own still, for the disc over the Contact shot.
const moonPath = `${OUT}/moon.webp`;
await sharp("design/night-city-garage/textures/moon.jpg").webp({ quality: 86 }).toFile(moonPath);
console.log(`moon.webp: ${Math.round((await stat(moonPath)).size / 1024)} KB`);

// The holographic figure at the end of the avenue: an original generated
// image (design/night-city-world/README.md records how), additive on black.
const holoPath = `${OUT}/holo.webp`;
await sharp("design/night-city-world/textures/holo-figure.jpg").resize(768, 1152).webp({ quality: 82 }).toFile(holoPath);
console.log(`holo.webp: ${Math.round((await stat(holoPath)).size / 1024)} KB`);

// The avenue's two big screens and its holographic koi: original generated
// images (see the design README), the words set over them on the site.
const imagePaths = {};
for (const [name, src, w, h, q] of [
  ["ad-kiroshi", "design/night-city-world/textures/ad-kiroshi.jpg", 768, 1152, 82],
  ["ad-nicola", "design/night-city-world/textures/ad-nicola.jpg", 768, 1152, 82],
  ["koi-magenta", "design/night-city-world/textures/holo-koi-magenta.jpg", 1024, 683, 80],
  ["koi-cyan", "design/night-city-world/textures/holo-koi-cyan.jpg", 1024, 683, 80],
]) {
  const path = `${OUT}/${name}.webp`;
  await sharp(src).resize(w, h, { fit: "cover" }).webp({ quality: q }).toFile(path);
  imagePaths[name] = path;
  console.log(`${name}.webp: ${Math.round((await stat(path)).size / 1024)} KB`);
}

// Earth over the intro's voxel moon (src/world/voxel-moon.js): the portrait
// plate's own Earth, cropped square round the disc and its thin atmosphere
// (centre 505, 564 and radius 450 in the 1024 by 1536 plate, measured off
// the rim), so the moon the city draws shows the Earth the painting does.
const earthPath = `${OUT}/earth.webp`;
await sharp("src/assets/Intro/MoonPortrait.png")
  .extract({ left: 505 - 450, top: 564 - 450, width: 900, height: 900 })
  .resize(512, 512)
  .webp({ quality: 90 })
  .toFile(earthPath);
console.log(`earth.webp: ${Math.round((await stat(earthPath)).size / 1024)} KB`);

// The shops' interiors: eight original generated rooms (see the design
// README), four across and two down, one atlas per tier. The site shows them
// through the shop windows with interior mapping (src/world/materials.js).
const SHOPS = ["ramen", "konbini", "cyberware", "izakaya", "pharmacy", "arcade", "clinic", "dumplings"];
const shopPaths = {};
for (const [tier, cw, ch] of [["high", 512, 440], ["phone", 256, 220]]) {
  const tiles = await Promise.all(SHOPS.map((n) => sharp(`design/night-city-world/textures/shops/${n}.jpg`).resize(cw, ch).toBuffer()));
  const path = `${OUT}/shops-${tier}.webp`;
  await sharp({ create: { width: cw * 4, height: ch * 2, channels: 3, background: "#000" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % 4) * cw, top: Math.floor(i / 4) * ch })))
    .webp({ quality: 80 })
    .toFile(path);
  shopPaths[tier] = path;
  console.log(`shops-${tier}.webp: ${Math.round((await stat(path)).size / 1024)} KB`);
}

// Corpo row's logos: the Experience section's own marks (src/assets/
// PreviousExperience), from the sources rather than the 160 px normalised
// set, keyed to transparency the way scripts/normalize-logos.mjs keys the
// ones on an opaque black ground (by luminance), trimmed, and packed on
// shelves 440 px tall into one RGBA atlas. They are lit signs on a dark
// tower, so each is its dark-ground form: Pawtograder's white husky without
// its black disc, and AWS's white wordmark and orange smile without the
// white cloud (the traced SVG's cloud and ground paths dropped and its navy
// letters turned white, which is how AWS draws itself on dark). world-
// assets.js carries each mark's rectangle and shape.
const LOGOS = [
  { slug: "philips-zero-touch", file: "PhilipsLogo.svg" },
  { slug: "pinnatec-auto", file: "PinnatecAuto.png" },
  { slug: "pawtograder", file: "Pawtograder.png", key: true },
  { slug: "aws-cloudformation", file: "awslogosvg.svg", dark: true },
  { slug: "top-choice-realty", file: "Topchoicerealtylogo.jpeg", key: true },
  { slug: "robert-defalco-realty", file: "RobertDefalcoRealty.webp", key: true },
  { slug: "northeastern", file: "NEULOGO.png" },
];
function darkGroundSvg(svg) {
  for (const path of svg.match(/<path[\s\S]*?\/>/g) ?? []) {
    const fill = (path.match(/fill="([^"]+)"/) || [])[1];
    if (["#000000", "#FEFDFD", "#F7F8F8"].includes(fill)) svg = svg.replace(path, "");
    else if (!["#FD9D0D", "#FC9E15"].includes(fill)) svg = svg.replace(path, path.replace(/fill="[^"]+"/, 'fill="#FFFFFF"'));
  }
  return Buffer.from(svg);
}
const LOGO_H = 440;
const LOGO_W = 2048;
const logoTiles = [];
for (const { slug, file, key, dark } of LOGOS) {
  const src = `src/assets/PreviousExperience/${file}`;
  let img = sharp(dark ? darkGroundSvg(await readFile(src, "utf8")) : src, { density: 900 }).ensureAlpha();
  if (key) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      // Never more opaque than the source already was.
      data[i + 3] = Math.min(data[i + 3], lum <= 12 ? 0 : Math.min(255, Math.round((lum - 12) * 3.2)));
    }
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  const trimmed = await img.trim({ threshold: 1 }).png().toBuffer();
  const tile = await sharp(trimmed).resize({ height: LOGO_H, width: 1000, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
  logoTiles.push({ slug, buffer: tile.data, w: tile.info.width, h: tile.info.height });
}
// Shelves, 16 px of clear space round each mark so mipmaps never bleed.
const PAD_L = 16;
let lx = 0;
let ly = 0;
for (const t of logoTiles) {
  if (lx + t.w + PAD_L * 2 > LOGO_W) {
    lx = 0;
    ly += LOGO_H + PAD_L * 2;
  }
  t.x = lx + PAD_L;
  t.y = ly + PAD_L;
  lx += t.w + PAD_L * 2;
}
const LOGO_ATLAS_H = ly + LOGO_H + PAD_L * 2;
const logosPath = `${OUT}/logos.webp`;
await sharp({ create: { width: LOGO_W, height: LOGO_ATLAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(logoTiles.map((t) => ({ input: t.buffer, left: t.x, top: t.y })))
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(logosPath);
console.log(`logos.webp: ${LOGO_W}x${LOGO_ATLAS_H}, ${Math.round((await stat(logosPath)).size / 1024)} KB`);

const revision = async (path) => createHash("sha256").update(await readFile(path)).digest("hex").slice(0, 12);
const base = "/scenes/world/";
const metadata = `// Generated by npm run world:assets (scripts/optimize-world.mjs). Do not edit.
export const worldModelUrl = {
  high: "${base}world-high.glb?v=${await revision(`${OUT}/world-high.glb`)}",
  phone: "${base}world-phone.glb?v=${await revision(`${OUT}/world-phone.glb`)}",
};
export const worldMoonUrl = "${base}moon.webp?v=${await revision(moonPath)}";
export const worldHoloUrl = "${base}holo.webp?v=${await revision(holoPath)}";
export const worldEarthUrl = "${base}earth.webp?v=${await revision(earthPath)}";
export const worldAdUrl = {
  kiroshi: "${base}ad-kiroshi.webp?v=${await revision(imagePaths["ad-kiroshi"])}",
  nicola: "${base}ad-nicola.webp?v=${await revision(imagePaths["ad-nicola"])}",
};
export const worldKoiUrl = [
  "${base}koi-magenta.webp?v=${await revision(imagePaths["koi-magenta"])}",
  "${base}koi-cyan.webp?v=${await revision(imagePaths["koi-cyan"])}",
];
export const worldLogos = {
  url: "${base}logos.webp?v=${await revision(logosPath)}",
  // Each mark's rectangle in the atlas (u, v, width, height, all 0..1, v
  // down) and its aspect (width over height).
  marks: {
${logoTiles.map((t) => `    "${t.slug}": { rect: [${(t.x / LOGO_W).toFixed(5)}, ${(t.y / LOGO_ATLAS_H).toFixed(5)}, ${(t.w / LOGO_W).toFixed(5)}, ${(t.h / LOGO_ATLAS_H).toFixed(5)}], aspect: ${(t.w / t.h).toFixed(4)} },`).join("\n")}
  },
};
export const worldShopsUrl = {
  high: "${base}shops-high.webp?v=${await revision(shopPaths.high)}",
  phone: "${base}shops-phone.webp?v=${await revision(shopPaths.phone)}",
};
`;
const metadataPath = "src/data/world-assets.js";
if ((await readFile(metadataPath, "utf8").catch(() => "")) !== metadata) await writeFile(metadataPath, metadata);
console.log(`budgets: high ${(sizes.high / 1e6).toFixed(2)} / 3.5 MB, phone ${(sizes.phone / 1e6).toFixed(2)} / 1.5 MB`);
