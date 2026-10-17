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
//   public/scenes/world/world-*-garage.glb the workshop inside the garage,
//                                        its own maps in it (below)
//   public/scenes/world/props-*-garage.bin its props, apart from the city's
//   public/scenes/world/garage-boards-*.webp the shop wall's photographs,
//                                        only while GARAGE_PHOTOS_ENABLED is
//                                        on (it is not: none is written)
//   public/scenes/world/garage-layout.json its cameras, paths, lights,
//                                        sectors, portals and collision
//   src/data/world-assets.js             their URLs, with a content hash so
//                                        a rebuilt city replaces a cached one
//
// Only the road keeps a roughness map and a normal map: the site's wet-road
// shader reads them for the puddles and to bend its mirror. Every other
// surface is flat paint or the facade shader, so their maps would be bytes
// nobody draws; but for the workshop's own surfaces (GARAGE_MAPS), whose
// maps ride in its pack and nowhere else. Budgets from the
// brief are asserted here, so a build that outgrows them fails loudly.
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { NodeIO, Primitive, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, meshopt, prune, textureCompress } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
// The garage's one photograph switch, the site's own (B3's): while it is
// off, no photo board, atlas or URL goes into what the workshop ships.
import { GARAGE_PHOTOS_ENABLED } from "../src/components/garage/features.js";

const SOURCE = "design/night-city-world/world-source.glb";
const OUT = "public/scenes/world";
// The core (what the hero needs, and every named piece) may weigh no more
// than the whole city did before it grew, so the city goes live no later;
// the packs that stream in behind it have their own.
const BUDGET = { high: 2.6e6, phone: 1.2e6 };
const PACK_BUDGET = { high: 2.2e6, phone: 1.0e6 };
// Japantown is the densest district (its street, lanes, roofs and outer
// row), so its pack may carry more.
const PACK_BUDGET_OF = { japantown: { high: 2.6e6, phone: 1.2e6 } };
// One pack per district (scripts/blender/ncw/finish.py, PACK_OF), in the
// order the page streams them: nearest the shots the reader meets first.
const PACK_ORDER = ["core", "south", "canyon", "plaza", "deck", "corpo", "afterlife", "santo", "japantown", "mega"];
// The workshop inside the garage is a pack too (worldPackUrl[tier].garage),
// but the page asks for it on its own as the reader nears the Garage
// section, with its props (worldPackPropsUrl) (and, only while the
// section's photographs are on, its boards' atlas, worldGarageBoardsUrl);
// the maps its materials keep, slot by slot, which
// every other pack and surface has taken off. Each of its materials says
// what it needs on itself (glTF extras: runtime, slots, params, wrap), and
// design/night-city-world/garage-materials.json is the manifest of them.
const GARAGE = "garage";
const GARAGE_MAPS = {
  NCW_garage_workshop_wall: ["baseColor"],
  NCW_garage_workshop_floor: ["baseColor", "metallicRoughness", "normal"],
  // The old room's Adam Smasher print, on its own surface by the bench.
  NCW_garage_identity_poster: ["baseColor"],
};
const keeps = (material, slot) => (GARAGE_MAPS[material.getName()] ?? []).includes(slot);
const TIERS = {
  high: { size: 1024, quality: 82, dropDetail: false },
  phone: { size: 512, quality: 76, dropDetail: true },
};

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

// The core's long lists and its named signs, out of the JSON. A GLB's JSON
// is text nobody compresses on the way (it is inside the file), a node with
// a mesh costs about a kilobyte and a half of it before its first triangle,
// and a number in an extra about five bytes. So, in the core only, after
// everything else has been done to it:
//
//   the named signs (sign_<name>, ninety-odd quads, a node and a mesh each)
//   become one mesh, `signs_named`, each sign's place in the list in its
//   vertices' colour as the street's batches have it, with `names` and `wh`
//   (each sign's width and height, metres) on the node. Every vertex is
//   written where the site would have put it from the sign's own node, to
//   the bit, and the list is in the order the nodes had: a sign's turn is
//   its place in the site's atlas and the beat it flickers on;
//
//   the street signs' ids (signs_index: `ids`, st_<size>_<n> with _b for a
//   back) become three numbers each on a mesh of points: `_ID`, n's low 16
//   bits, twice the size's place in `sizes` plus one for a back, and n's
//   high 16 bits (the plaza's own ids start at 700000);
//
//   the people standing about (anchor_people: `stand`) become eight numbers
//   each on a mesh of points: `_XZ`, x and then z in centimetres plus
//   131072 as a low and a high 16 bits, and `_YAP`, y in centimetres, the
//   yaw in thousandths of a radian, the pose and a zero.
//
// src/world/city.js reads them back (inflate, and the signs' unpack) into
// what the builder wrote. A list that does not fit its numbers exactly is
// left as it was, and the site reads either.
async function compactCore(document) {
  const root = document.getRoot();
  const buffer = root.listBuffers()[0];
  const accessor = (type, array, normalized = false) => document.createAccessor().setType(type).setArray(array).setNormalized(normalized).setBuffer(buffer);
  const points = (node, attributes) => {
    const prim = document.createPrimitive().setMode(Primitive.Mode.POINTS);
    for (const [name, [type, array]] of Object.entries(attributes)) prim.setAttribute(name, accessor(type, array));
    node.setMesh(document.createMesh(node.getName()).addPrimitive(prim));
  };

  const signs = root.listScenes()[0].listChildren().filter((n) => n.getName().startsWith("sign_") && n.getMesh());
  if (signs.length) {
    const first = signs[0].getMesh().listPrimitives()[0];
    const like = (semantic) => first.getAttribute(semantic);
    const position = [];
    const color = [];
    const index = [];
    const normal = [];
    const uv = [];
    const wh = [];
    signs.forEach((node, k) => {
      const prim = node.getMesh().listPrimitives()[0];
      for (const semantic of ["NORMAL", "TEXCOORD_0"]) {
        const a = prim.getAttribute(semantic);
        if (a.getComponentType() !== like(semantic).getComponentType() || a.getNormalized() !== like(semantic).getNormalized()) throw new Error(`${node.getName()}: its ${semantic} is not stored as the other signs' is`);
      }
      const m = node.getWorldMatrix();
      const pos = prim.getAttribute("POSITION");
      const base = position.length / 3;
      for (let i = 0; i < pos.getCount(); i++) {
        // As three.js puts a vertex through its node's matrix.
        const [x, y, z] = pos.getElement(i, []);
        position.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        color.push(k % 256, Math.floor(k / 256), 0, 255);
      }
      normal.push(...prim.getAttribute("NORMAL").getArray());
      uv.push(...prim.getAttribute("TEXCOORD_0").getArray());
      index.push(...Array.from(prim.getIndices().getArray(), (i) => base + i));
      wh.push(node.getExtras().w, node.getExtras().h);
    });
    const prim = document.createPrimitive()
      .setMaterial(first.getMaterial())
      .setIndices(accessor("SCALAR", new Uint16Array(index)))
      .setAttribute("POSITION", accessor("VEC3", new Float32Array(position)))
      .setAttribute("NORMAL", accessor(like("NORMAL").getType(), new (like("NORMAL").getArray().constructor)(normal), like("NORMAL").getNormalized()))
      .setAttribute("TEXCOORD_0", accessor("VEC2", new (like("TEXCOORD_0").getArray().constructor)(uv), like("TEXCOORD_0").getNormalized()))
      .setAttribute("COLOR_0", accessor("VEC4", new Uint8Array(color), true));
    const batch = document.createNode("signs_named")
      .setMesh(document.createMesh("signs_named").addPrimitive(prim))
      .setExtras({ names: signs.map((n) => n.getName().slice(5)), wh });
    root.listScenes()[0].addChild(batch);
    for (const node of signs) node.dispose();
  }

  const signsIndex = root.listNodes().find((n) => n.getName() === "signs_index");
  const ids = signsIndex?.getExtras().ids ?? [];
  const sizes = [];
  const codes = ids.map((id) => {
    const m = /^st_([a-z]+)_(\d+)(_b)?$/.exec(id);
    if (!m || +m[2] > 0xffffffff) return null;
    if (!sizes.includes(m[1])) sizes.push(m[1]);
    return [+m[2] % 65536, sizes.indexOf(m[1]) * 2 + (m[3] ? 1 : 0), Math.floor(+m[2] / 65536)];
  });
  if (ids.length && codes.every(Boolean)) {
    points(signsIndex, { _ID: ["VEC3", new Uint16Array(codes.flat())] });
    signsIndex.setExtras({ ...signsIndex.getExtras(), ids: undefined, sizes });
  }

  const people = root.listNodes().find((n) => n.getName() === "anchor_people");
  const stand = people?.getExtras().stand ?? [];
  const xz = [];
  const yap = [];
  let exact = stand.length > 0;
  for (let i = 0; i + 4 < stand.length; i += 5) {
    const [x, y, z, yaw, pose] = stand.slice(i, i + 5);
    const X = Math.round(x * 100) + 131072;
    const Z = Math.round(z * 100) + 131072;
    const Y = Math.round(y * 100);
    const A = Math.round(yaw * 1000);
    exact &&= (X - 131072) / 100 === x && (Z - 131072) / 100 === z && Y / 100 === y && A / 1000 === yaw && Number.isInteger(pose)
      && X >= 0 && X < 262144 && Z >= 0 && Z < 262144 && Math.abs(Y) < 32768 && Math.abs(A) < 32768 && Math.abs(pose) < 32768;
    xz.push(X % 65536, Math.floor(X / 65536), Z % 65536, Math.floor(Z / 65536));
    yap.push(Y, A, pose, 0);
  }
  if (exact) {
    points(people, { _XZ: ["VEC4", new Uint16Array(xz)], _YAP: ["VEC4", new Int16Array(yap)] });
    people.setExtras({ ...people.getExtras(), stand: undefined });
  }
  await document.transform(prune({ keepLeaves: true, keepExtras: true, keepAttributes: true }));
}

// The workshop's pack, checked as it is written: its sectors survived as
// tags, each of its own surfaces kept the maps and UVs it is drawn with and
// no other texture came along, and none of it leaked into the core.
const garageReport = {};
async function garageCheck(document, size, triangles) {
  const root = document.getRoot();
  const sectors = {};
  for (const node of root.listNodes()) {
    const e = node.getExtras() ?? {};
    if (!GARAGE_PHOTOS_ENABLED && (/^garage_board_/.test(node.getName()) || e.assetKind === "personal-photo")) {
      throw new Error(`world-*-garage.glb: ${node.getName()} is a photograph, and the garage's photographs are off`);
    }
    if (!node.getMesh()) continue;
    if (e.proto) continue;
    if (!e.visibilitySector) throw new Error(`world-*-garage.glb: ${node.getName()} has no visibilitySector`);
    sectors[e.visibilitySector] = (sectors[e.visibilitySector] ?? 0) + 1;
  }
  const maps = {};
  for (const material of root.listMaterials()) {
    const name = material.getName();
    if (!GARAGE_PHOTOS_ENABLED && /^NCW_garage_shop_photos/.test(name)) throw new Error(`world-*-garage.glb: ${name} ships while the garage's photographs are off`);
    const slots = {
      baseColor: material.getBaseColorTexture(), metallicRoughness: material.getMetallicRoughnessTexture(),
      normal: material.getNormalTexture(), emissive: material.getEmissiveTexture(),
    };
    for (const [slot, tex] of Object.entries(slots)) {
      if (tex && !keeps(material, slot)) throw new Error(`world-*-garage.glb: ${name} kept a ${slot} map it is not allowed`);
      if (!tex && keeps(material, slot)) throw new Error(`world-*-garage.glb: ${name} lost its ${slot} map`);
      if (tex) {
        const img = tex.getSize();
        maps[`${name}.${slot}`] = { image: tex.getName() || tex.getURI(), size: img, mime: tex.getMimeType(), bytes: tex.getImage().byteLength,
          sha256: createHash("sha256").update(tex.getImage()).digest("hex").slice(0, 16) };
      }
    }
    if (/^NCW_garage_(workshop_wall|workshop_floor|threshold_wet|identity_poster|shop_photos)$/.test(name)) {
      const ex = material.getExtras() ?? {};
      const slotsOf = typeof ex.slots === "string" ? JSON.parse(ex.slots) : ex.slots;
      if (!ex.runtime || !Array.isArray(slotsOf)) throw new Error(`world-*-garage.glb: ${name} has no runtime/slots extras`);
      // The photographs' map is fetched apart (worldGarageBoardsUrl), not embedded.
      const embedded = name === "NCW_garage_shop_photos" ? [] : slotsOf;
      if (JSON.stringify(embedded) !== JSON.stringify(GARAGE_MAPS[name] ?? [])) throw new Error(`world-*-garage.glb: ${name}'s slots extras ${JSON.stringify(slotsOf)} disagree with the pack's maps`);
      extrasOf[name] = { runtime: ex.runtime, slots: slotsOf, wrap: ex.wrap, params: typeof ex.params === "string" ? JSON.parse(ex.params) : ex.params,
        ...(ex.assetKind ? { assetKind: ex.assetKind } : {}) };
    }
    if (GARAGE_MAPS[name]) {
      const prims = root.listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => p.getMaterial() === material);
      if (!prims.length || prims.some((p) => !p.getAttribute("TEXCOORD_0"))) throw new Error(`world-*-garage.glb: ${name} has no UV0`);
    }
  }
  const reused = [...new Set(root.listMaterials().map((m) => m.getName()).filter((n) => !/^NCW_garage_(workshop|threshold|identity_poster|shop_photos)/.test(n)))].sort();
  return { bytes: size, triangles, sectors, maps, reused };
}
const extrasOf = {};

await mkdir(OUT, { recursive: true });
const sizes = {};
const tagged = new Set(["core"]);
for (const node of (await io.read(SOURCE)).getRoot().listNodes()) {
  const p = node.getExtras()?.pack;
  if (p) tagged.add(p);
}
const PACKS = [...PACK_ORDER.filter((p) => tagged.has(p)), ...[...tagged].filter((p) => !PACK_ORDER.includes(p)).sort()];

for (const [tier, opts] of Object.entries(TIERS)) for (const pack of PACKS) {
  const document = await io.read(SOURCE);
  const root = document.getRoot();

  // This pack's nodes only. The core keeps everything not tagged for a
  // pack (the named pieces, anchors, cameras, prototypes, the hero's
  // districts); a pack keeps only its districts' meshes, and no textures:
  // its materials are the core's, which the site already has.
  for (const node of root.listNodes()) {
    const p = node.getExtras()?.pack;
    const mine = pack === "core" ? !p || p === "core" : p === pack;
    if (!mine) node.dispose();
  }
  if (pack !== "core") {
    for (const material of root.listMaterials()) {
      const own = pack === GARAGE;
      if (!(own && keeps(material, "baseColor"))) material.setBaseColorTexture(null);
      material.setEmissiveTexture(null);
      if (!(own && keeps(material, "metallicRoughness"))) material.setMetallicRoughnessTexture(null);
      if (!(own && keeps(material, "normal"))) material.setNormalTexture(null);
    }
  }

  // Roughness and normal maps: the road's only. Its shader reads both (the
  // puddles, and the mirror bent by the asphalt); every other surface is lit
  // by the city's own flat light and never samples them.
  for (const material of root.listMaterials()) {
    if (material.getName() !== "NCW_asphalt") {
      if (!keeps(material, "metallicRoughness")) material.setMetallicRoughnessTexture(null);
      if (!keeps(material, "normal")) material.setNormalTexture(null);
    }
  }

  // What each surface reads from its vertices (src/world/materials.js and
  // road.js): UVs only where a picture, a window cell, a stripe or the
  // road's maps are drawn from them, colours only where a building's own
  // numbers ride on them (and the glow's and the road paint's, their
  // colour). Plain paint and the
  // neon read neither, so theirs are bytes nobody reads, and without them a
  // box's corners weld.
  const PLAIN = ["metal", "dark", "roof", "kerb", "board_frame", "door", "hazard", "tool_red", "glass_dark"];
  // Colour, no UVs: the trim's colour is its building's.
  const COLOR_ONLY = ["trim"];
  const UV_ONLY = ["sidewalk", "concrete", "garage_wall", "facade_t0", "facade_t1", "facade_t2", "garage_wall_back",
    "garage_wall_magenta", "garage_wall_cyan", "lantern", "asphalt",
    "garage_workshop_wall", "garage_workshop_floor", "garage_threshold_wet", "garage_identity_poster", "garage_shop_photos"];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const n = (prim.getMaterial()?.getName() ?? "").replace(/^NCW_/, "").replace(/\.\d+$/, "");
      const plain = PLAIN.includes(n) || n.startsWith("neon_");
      if (plain || UV_ONLY.includes(n)) {
        const color = prim.getAttribute("COLOR_0");
        if (color) {
          prim.setAttribute("COLOR_0", null);
          if (!color.listParents().some((p) => p !== root)) color.dispose();
        }
      }
      if (plain || n === "glow" || COLOR_ONLY.includes(n)) {
        const uv = prim.getAttribute("TEXCOORD_0");
        if (uv) {
          prim.setAttribute("TEXCOORD_0", null);
          if (!uv.listParents().some((p) => p !== root)) uv.dispose();
        }
      }
    }
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
  if (pack === "core") await compactCore(document);
  const path = pack === "core" ? `${OUT}/world-${tier}.glb` : `${OUT}/world-${tier}-${pack}.glb`;
  await io.write(path, document);
  // The core's model also gzipped beside it, which the page fetches
  // (src/world/fetched.js): a third of it is JSON and quantised geometry.
  if (pack === "core") await writeFile(`${path}.gz`, gzipSync(await readFile(path), { level: 9 }));
  const size = (await stat(path)).size;
  if (pack === "core") sizes[tier] = size;
  sizes[`${tier}-${pack}`] = size;
  let triangles = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) triangles += (prim.getIndices()?.getCount() ?? 0) / 3;
  }
  console.log(`${path.split("/").pop()}: ${(size / 1e6).toFixed(2)} MB, ${root.listMeshes().length} meshes, ` +
    `${triangles.toLocaleString()} triangles, ${root.listTextures().length} textures`);
  if (pack === GARAGE) garageReport[tier] = await garageCheck(document, size, triangles);
  const budget = pack === "core" ? BUDGET[tier] : (PACK_BUDGET_OF[pack] ?? PACK_BUDGET)[tier];
  if (size > budget) {
    throw new Error(`${path.split("/").pop()} is ${(size / 1e6).toFixed(2)} MB, over its ${budget / 1e6} MB budget`);
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
  ["koi-amber-side", "design/night-city-world/textures/holo-koi-amber-side.jpg", 1024, 683, 82],
  ["koi-amber-top", "design/night-city-world/textures/holo-koi-amber-top.jpg", 1024, 683, 82],
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

// The props (scripts/blender/ncw/props.py): every instance as eight 16-bit
// numbers (prototype, x and z to 5 cm, y to 2 cm, yaw, stretch up, scale
// across, district) after a JSON header naming the prototypes and their
// reach. A phone leaves out the prototypes tagged detail, as its GLB leaves
// out the meshes.
const props = JSON.parse(await readFile("design/night-city-world/props-source.json", "utf8"));
const propPaths = {};
for (const [tier, opts] of Object.entries(TIERS)) {
  const keep = props.instances.filter((i) => !(opts.dropDetail && props.protos[i[0]].detail));
  const header = Buffer.from(JSON.stringify({ protos: props.protos, districts: props.districts, count: keep.length }));
  const pad = (4 - ((4 + header.length) % 4)) % 4;
  const buf = Buffer.alloc(4 + header.length + pad + keep.length * 16);
  buf.writeUInt32LE(header.length + pad, 0);
  header.copy(buf, 4);
  buf.fill(32, 4 + header.length, 4 + header.length + pad);
  let o = 4 + header.length + pad;
  const q = (v) => Math.max(-32767, Math.min(32767, Math.round(v)));
  for (const [pi, x, y, z, yaw, sy, sxz, di] of keep) {
    for (const v of [pi, x * 20, y * 50, z * 20, yaw * 10430.2, sy * 100, sxz * 1000, di]) {
      buf.writeInt16LE(q(v), o);
      o += 2;
    }
  }
  propPaths[tier] = `${OUT}/props-${tier}.bin`;
  await writeFile(propPaths[tier], buf);
  // And gzipped beside it, which the page fetches: two thirds smaller.
  await writeFile(`${propPaths[tier]}.gz`, gzipSync(buf, { level: 9 }));
  console.log(`props-${tier}.bin: ${keep.length} props, ${Math.round(buf.length / 1024)} KB`);
}
// The workshop's props, packed the same way from its own list, which
// garage-layout.json carries.
const layout = JSON.parse(await readFile("design/night-city-world/garage-layout.json", "utf8"));
// Sorted by sector, each sector one run the header names, so the site can
// draw (and cull) a sector's props as one.
const garageProps = layout.props_table;
for (const [tier, opts] of Object.entries(TIERS)) {
  const keep = garageProps.instances.filter((i) => !(opts.dropDetail && garageProps.protos[i[0]].detail))
    .map((row, i) => [row, i]).sort((a, b) => a[0][7] - b[0][7] || a[1] - b[1]).map(([row]) => row);
  const sectorRuns = [];
  keep.forEach((row, i) => {
    const sector = garageProps.districts[row[7]];
    if (sectorRuns.at(-1)?.sector === sector) sectorRuns.at(-1).count++;
    else sectorRuns.push({ sector, start: i, count: 1 });
  });
  const header = Buffer.from(JSON.stringify({ protos: garageProps.protos, districts: garageProps.districts, count: keep.length, pack: GARAGE, sectorRuns }));
  const pad = (4 - ((4 + header.length) % 4)) % 4;
  const buf = Buffer.alloc(4 + header.length + pad + keep.length * 16);
  buf.writeUInt32LE(header.length + pad, 0);
  header.copy(buf, 4);
  buf.fill(32, 4 + header.length, 4 + header.length + pad);
  let o = 4 + header.length + pad;
  const q = (v) => Math.max(-32767, Math.min(32767, Math.round(v)));
  for (const [pi, x, y, z, yaw, sy, sxz, di] of keep) {
    for (const v of [pi, x * 20, y * 50, z * 20, yaw * 10430.2, sy * 100, sxz * 1000, di]) {
      buf.writeInt16LE(q(v), o);
      o += 2;
    }
  }
  const path = `${OUT}/props-${tier}-garage.bin`;
  await writeFile(path, buf);
  await writeFile(`${path}.gz`, gzipSync(buf, { level: 9 }));
  propPaths[`${tier}-garage`] = path;
  console.log(`props-${tier}-garage.bin.gz: ${keep.length} props, ${Math.round((await stat(`${path}.gz`)).size / 1024)} KB`);
}

// The shop wall's photographs, while the Garage section's photographs are
// on (they are not, and then nothing is written): its own "Also in the
// shop" pictures (src/data/life.js, from src/assets/photos), centre-cropped
// to one aspect, PHOTO_TILES' order four across and two down, one atlas a
// tier. They are already on the site; nothing here is a new picture.
const garagePhotoPaths = {};
async function photoAtlas(atlas) {
  const PHOTO_BUDGET = { high: 0.8e6, phone: 0.25e6 };
  for (const [tier, cw, ch] of [["high", 512, 384], ["phone", 256, 192]]) {
    const tiles = await Promise.all(atlas.tiles.map((n) => sharp(`src/assets/photos/${n}.jpg`).rotate().resize(cw, ch, { fit: "cover" }).toBuffer()));
    const path = `${OUT}/garage-boards-${tier}.webp`;
    await sharp({ create: { width: cw * atlas.cols, height: ch * atlas.rows, channels: 3, background: "#000" } })
      .composite(tiles.map((input, i) => ({ input, left: (i % atlas.cols) * cw, top: Math.floor(i / atlas.cols) * ch })))
      .webp({ quality: 80 })
      .toFile(path);
    garagePhotoPaths[tier] = path;
    const bytes = (await stat(path)).size;
    console.log(`garage-boards-${tier}.webp: ${Math.round(bytes / 1024)} KB`);
    if (bytes > PHOTO_BUDGET[tier]) throw new Error(`garage-boards-${tier}.webp is over its ${PHOTO_BUDGET[tier] / 1e6} MB budget`);
  }
}
if (GARAGE_PHOTOS_ENABLED) await photoAtlas(layout.photo_atlas);
else if (layout.photo_atlas || layout.boards?.length) throw new Error("garage-layout.json has photo boards while the garage's photographs are off");
// The manifest of the workshop's own materials (agents' contract, schema
// version 1): for each, its runtime, its UVs and what its vertices carry,
// its parameters, and each map slot (where it comes from, its image, colour
// space, wrap, size and hash at each tier). The site reads the same facts
// off the materials' glTF extras; this is what a reviewer reads, and the
// two are checked to agree as it is written.
const embeddedSlot = (name, slot, colorSpace, wrap = "repeat") => {
  const at = (tier) => garageReport[tier].maps[`${name}.${slot}`];
  return {
    source: "embedded", image: at("high").image, colorSpace, wrap,
    size: Object.fromEntries(Object.keys(TIERS).map((t) => [t, at(t).size?.[0] ?? null])),
    sha256: Object.fromEntries(Object.keys(TIERS).map((t) => [t, at(t).sha256])),
    bytes: Object.fromEntries(Object.keys(TIERS).map((t) => [t, at(t).bytes])),
  };
};
const SPACE = { baseColor: "srgb", metallicRoughness: "linear", normal: "linear" };
const materialsDoc = {
  version: 1,
  pack: GARAGE,
  generatedFrom: execSync("git rev-parse --short HEAD").toString().trim(),
  note: "Generated by npm run world:assets (scripts/optimize-world.mjs) from the garage pack it writes. uv: UV0; rects are [u0, v0, u1, v1] in glTF's UV (v down the image).",
  materials: {
    NCW_garage_workshop_floor: {
      ...extrasOf.NCW_garage_workshop_floor, uv: ["UV0"], tangents: false, vertexColor: false,
      uvMapping: "world-projected: u = x / 5 m, v = -z / 5 m (repeat); the office's floor the same",
      slots: Object.fromEntries(GARAGE_MAPS.NCW_garage_workshop_floor.map((slot) => [slot, embeddedSlot("NCW_garage_workshop_floor", slot, SPACE[slot])])),
    },
    NCW_garage_workshop_wall: {
      ...extrasOf.NCW_garage_workshop_wall, uv: ["UV0"], tangents: false, vertexColor: false,
      uvMapping: "atlas: u 1 per 2.8 m along a wall (repeat); v 0..0.5 the tiled dado (its first 1.4 m), v 0.5..1 a 1.4 m strip of block, repeated up the wall (v never repeats)",
      slots: { baseColor: embeddedSlot("NCW_garage_workshop_wall", "baseColor", "srgb") },
    },
    NCW_garage_threshold_wet: {
      ...extrasOf.NCW_garage_threshold_wet, uv: ["UV0"], tangents: false, vertexColor: false,
      uvMapping: "world-projected as the floor; the strip x 452 to 454.5, z -218 to -212", slots: {},
    },
    NCW_garage_identity_poster: {
      ...extrasOf.NCW_garage_identity_poster, uv: ["UV0"], tangents: false, vertexColor: false,
      uvMapping: "the whole picture once over its quad (clamp); the mesh garage_identity_poster",
      source: layout.art.map((a) => a.source),
      slots: { baseColor: embeddedSlot("NCW_garage_identity_poster", "baseColor", "srgb", "clamp") },
    },
    ...(GARAGE_PHOTOS_ENABLED ? {
      NCW_garage_shop_photos: {
        ...extrasOf.NCW_garage_shop_photos, uv: ["UV0"], tangents: false, vertexColor: false,
        slots: {
          baseColor: {
            source: "external", url: "worldGarageBoardsUrl", colorSpace: "srgb", wrap: "clamp",
            size: { high: 2048, phone: 1024 },
            sha256: Object.fromEntries(await Promise.all(Object.entries(garagePhotoPaths).map(async ([t, path]) => [t, createHash("sha256").update(await readFile(path)).digest("hex").slice(0, 16)]))),
            bytes: Object.fromEntries(await Promise.all(Object.entries(garagePhotoPaths).map(async ([t, path]) => [t, (await stat(path)).size]))),
          },
        },
        meshes: layout.boards.map((b) => b.mesh),
        rects: Object.fromEntries(layout.boards.map((b) => [b.id, Object.fromEntries(b.photos.map((ph) => [ph.id, ph.uv]))])),
      },
    } : {}),
  },
  photographs: GARAGE_PHOTOS_ENABLED ? "on: the boards' atlas is fetched apart (worldGarageBoardsUrl)" : "off (src/components/garage/features.js): no board, atlas or URL",
  reused: garageReport.high.reused,
  sectors: Object.keys(garageReport.high.sectors).sort(),
  budgets: Object.fromEntries(Object.keys(TIERS).map((tier) => [tier, { triangles: garageReport[tier].triangles, bytes: garageReport[tier].bytes,
    ceilingBytes: PACK_BUDGET[tier] }])),
};
await writeFile("design/night-city-world/garage-materials.json", `${JSON.stringify(materialsDoc, null, 1)}\n`);

// The layout for the page, without the props table its bin carries.
const { props_table: _table, ...pageLayout } = layout;
await writeFile(`${OUT}/garage-layout.json`, JSON.stringify(pageLayout));
console.log(`garage: high ${(sizes[`high-${GARAGE}`] / 1e6).toFixed(2)} MB, phone ${(sizes[`phone-${GARAGE}`] / 1e6).toFixed(2)} MB ` +
  "(design/night-city-world/garage-materials.json)");

// What the drive, the walk and a richer braindance will read later (README,
// "Exports for later"); the page does not load them.
for (const name of ["road-graph.json", "collision.json", "districts.json", "anchors.json"]) {
  await writeFile(`${OUT}/${name}`, await readFile(`design/night-city-world/${name}`));
}

const revision = async (path) => createHash("sha256").update(await readFile(path)).digest("hex").slice(0, 12);
const base = "/scenes/world/";
const metadata = `// Generated by npm run world:assets (scripts/optimize-world.mjs). Do not edit.
export const worldModelUrl = {
  high: "${base}world-high.glb.gz?v=${await revision(`${OUT}/world-high.glb.gz`)}",
  phone: "${base}world-phone.glb.gz?v=${await revision(`${OUT}/world-phone.glb.gz`)}",
};
// The districts that stream in behind the core, in the order they load:
// south first (behind the hero), then the districts the page's sections
// look at, nearest first.
export const worldPackUrl = {
${(await Promise.all(Object.keys(TIERS).map(async (tier) => `  ${tier}: {\n${(await Promise.all(PACKS.filter((p) => p !== "core").map(async (p) => `    ${p}: "${base}world-${tier}-${p}.glb?v=${await revision(`${OUT}/world-${tier}-${p}.glb`)}",`))).join("\n")}\n  },`))).join("\n")}
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
// The workshop's props and its boards' photographs, fetched with its pack
// (worldPackUrl[tier].garage) as the reader nears the Garage section, and
// its layout (cameras, paths, lights, sectors, portals, collision) for the
// tools and the braindance.
export const worldPackPropsUrl = {
  high: { garage: "${base}props-high-garage.bin.gz?v=${await revision(`${propPaths["high-garage"]}.gz`)}" },
  phone: { garage: "${base}props-phone-garage.bin.gz?v=${await revision(`${propPaths["phone-garage"]}.gz`)}" },
};
${GARAGE_PHOTOS_ENABLED ? `export const worldGarageBoardsUrl = {
  high: "${base}garage-boards-high.webp?v=${await revision(garagePhotoPaths.high)}",
  phone: "${base}garage-boards-phone.webp?v=${await revision(garagePhotoPaths.phone)}",
};` : "// No worldGarageBoardsUrl: the garage's photographs are off."}
export const worldGarageLayoutUrl = "${base}garage-layout.json?v=${await revision(`${OUT}/garage-layout.json`)}";
export const worldPropsUrl = {
  high: "${base}props-high.bin.gz?v=${await revision(`${propPaths.high}.gz`)}",
  phone: "${base}props-phone.bin.gz?v=${await revision(`${propPaths.phone}.gz`)}",
};
`;
const metadataPath = "src/data/world-assets.js";
if ((await readFile(metadataPath, "utf8").catch(() => "")) !== metadata) await writeFile(metadataPath, metadata);
console.log(`budgets: core high ${(sizes.high / 1e6).toFixed(2)} / ${BUDGET.high / 1e6} MB, phone ${(sizes.phone / 1e6).toFixed(2)} / ${BUDGET.phone / 1e6} MB; ` +
  `packs high ${(PACKS.slice(1).filter((p) => p !== GARAGE).reduce((a, p) => a + sizes[`high-${p}`], 0) / 1e6).toFixed(2)} MB, phone ${(PACKS.slice(1).filter((p) => p !== GARAGE).reduce((a, p) => a + sizes[`phone-${p}`], 0) / 1e6).toFixed(2)} MB`);
