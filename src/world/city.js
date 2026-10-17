// src/world/city.js: the Blender kit, brought in and lit.
//
// Loads the tier's GLB (src/data/world-assets.js), swaps every material for
// the city's own by name (src/world/materials.js), merges the signs into one
// atlas-textured draw (src/world/signs.js) and the big screens into another
// (src/world/ads.js), bakes the light those signs and
// strips throw onto the street (src/world/spill.js), and reads back the
// named empties: the shot cameras and their targets, the anchors (the curb,
// the bay, the billboard, the towers, the moon) and the road the car drives.
//
// The parsed GLB is cached across builds, so an intro replay or a restored
// WebGL context rebuilds from memory; each build owns its GPU resources and
// hands them back in dispose().
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { worldModelUrl, worldPackUrl, worldShopsUrl } from "../data/world-assets.js";
import { createProps, opaqueOrder, preloadProps } from "./props.js";
import { bitmapTexture } from "./pictures.js";
import { fetchUnpacked } from "./fetched.js";
import { createMaterialKit, NEON } from "./materials.js";
import { markBytes } from "./progress.js";
import { createSigns } from "./signs.js";
import { createBake } from "./spill.js";
import { createRoadMaterial, MIRROR_UNIFORMS } from "./road.js";
import { createRoad } from "./road-path.js";
import { dressHolo, preloadHolo } from "./holo.js";
import { dressMoon, preloadMoon } from "./moon.js";
import { createAds, preloadAds } from "./ads.js";
import { createBoards } from "./boards.js";
import { createFloods } from "./floods.js";
import { createTowers } from "./towers.js";
import { createLogos, preloadLogos } from "./logos.js";
import { createGarage, createGarageVisibility, garageCellSector, garageLights } from "./garage.js";
import { GARAGE_PHOTOS_ENABLED } from "../components/garage/features.js";
import { createGarageMaterials } from "./garage-materials.js";
import { appendMeshesSteps, asOneRun, attributeKey, mergeMeshes, mergeMeshesSteps, joinSteps, createCells, cutSteps, Tiled, toFloat } from "./merge.js";
import { LAMPS } from "./glsl.js";

/** Layers: 0 is everything, REFLECT is what the wet road mirrors, and
 *  MIRROR_ONLY is drawn in the mirror and nowhere else (the car's stand-in). */
export const REFLECT_LAYER = 2;
export const MIRROR_LAYER = 3;

const cache = new Map();
// A generator run to its end, and what it returned.
const drain = (steps) => {
  let r;
  while (!(r = steps.next()).done);
  return r.value;
};
// (load) A mesh as meshes of PIECE triangles or fewer, for work done a
// piece at a time: each shares the mesh's attributes, has a stretch of its
// index and stands where it does. One without an index is itself.
const PIECE = 8192;
function piecesOf(mesh) {
  const index = mesh.geometry.index;
  if (!index || index.count <= PIECE * 3) return [mesh];
  const out = [];
  for (let i = 0; i < index.count; i += PIECE * 3) {
    const g = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(mesh.geometry.attributes)) g.setAttribute(k, a);
    g.setIndex(new THREE.BufferAttribute(index.array.subarray(i, Math.min(index.count, i + PIECE * 3)), 1));
    const piece = new THREE.Mesh(g, mesh.material);
    piece.name = mesh.name;
    piece.matrixAutoUpdate = false;
    piece.matrix.copy(mesh.matrixWorld);
    piece.matrixWorld.copy(mesh.matrixWorld);
    out.push(piece);
  }
  return out;
}
// (load) What a geometry's arrays come to, for the GPU.
const bytesOf = (geometry) => Object.values(geometry.attributes).reduce((n, a) => n + a.array.byteLength, geometry.index?.array.byteLength ?? 0);
// The cells the kit is drawn by, metres on a side, and the fewest triangles
// a material needs before it is cut to them (see the merge below).
const CELL = 12;
const CELL_MIN_TRIS = 0;

// The signs across the rooftop's roof, which its puddles hold and its steam
// is lit by.
const ROOF_SIGNS = new Set(["sign_ripperdoc", "sign_afterlife"]);
// The colour each of the garage's painted walls lights the room.
const GARAGE_WALLS = { garage_wall_back: NEON.amber, garage_wall_magenta: NEON.pink, garage_wall_cyan: NEON.cyan };

// The builder's small lamps (kit.py, light): per lamp [x, y, z] in
// decimetres, a hue's index, the power in tenths; for the bake, metres and
// linear colour.
const LIGHT_HUES = ["pink", "magenta", "cyan", "teal", "blue", "amber", "red", "green", "white", "purple", "yellow"]
  .map((k) => new THREE.Color(NEON[k]));
function lampPoints(flat = []) {
  const out = [];
  for (let i = 0; i + 4 < flat.length; i += 5) {
    const c = LIGHT_HUES[flat[i + 3]] ?? LIGHT_HUES[8];
    out.push(flat[i] / 10, flat[i + 1] / 10, flat[i + 2] / 10, c.r, c.g, c.b, flat[i + 4] / 10);
  }
  return out;
}

/** The core's long lists come as vertices (scripts/optimize-world.mjs,
 *  compactCore, where each layout is): back onto their nodes as the builder
 *  wrote them, the street signs' ids and the people standing about. */
function inflate(scene) {
  const read = (name, to) => {
    const o = scene.getObjectByName(name);
    if (!o?.isPoints) return;
    Object.assign(o.userData, to(o.geometry.attributes, o.userData));
    o.visible = false;
  };
  read("signs_index", ({ _id }, { sizes }) => ({
    ids: Array.from({ length: _id.count }, (_, i) => `st_${sizes[_id.getY(i) >> 1]}_${_id.getX(i) + _id.getZ(i) * 65536}${_id.getY(i) & 1 ? "_b" : ""}`),
  }));
  read("anchor_people", ({ _xz, _yap }) => {
    const stand = [];
    for (let i = 0; i < _xz.count; i++) {
      stand.push((_xz.getX(i) + _xz.getY(i) * 65536 - 131072) / 100, _yap.getX(i) / 100, (_xz.getZ(i) + _xz.getW(i) * 65536 - 131072) / 100, _yap.getY(i) / 1000, _yap.getZ(i));
    }
    return { stand };
  });
  return scene;
}

export function preloadCity(tier) {
  if (!cache.has(tier)) {
    // The kit, and the rooms its shop windows look into; and the towers'
    // logos, which the city is built with (asked for here, with the rest,
    // and not once the rest is in, when the city waited 0.3 s on them).
    const pending = Promise.all([
      // (load: gzipped beside the plain file; src/world/fetched.js.)
      fetchUnpacked(worldModelUrl[tier], (got, total) => markBytes("city", got, total))
        .then((data) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(data, ""))
        .then((gltf) => inflate(gltf.scene)),
      // (load: decoded as it lands, off the page's thread; src/world/pictures.js.)
      bitmapTexture(worldShopsUrl[tier], false),
      preloadProps(tier),
      preloadLogos(),
    ])
      .then(([scene, shops, props]) => ({ scene, shops, props }))
      .catch((err) => {
        cache.delete(tier);
        throw err;
      });
    cache.set(tier, pending);
  }
  return cache.get(tier);
}

/** The districts that stream in behind the core (BIBLE.md, "How it
 *  loads"): each pack's GLB, fetched once and kept like the core's. */
const packCache = new Map();
// The garage's room is a pack too, but not one of these: it is not streamed
// with the districts, it is asked for by the garage's own readiness
// (world-scene.js, prepareGarage), after the hero is up and as the reader
// heads for it.
export const GARAGE_PACK = "garage";
export const PACKS = Object.keys(worldPackUrl.high).filter((name) => name !== GARAGE_PACK);
export const hasGaragePack = (tier) => Boolean(worldPackUrl[tier]?.[GARAGE_PACK]);
export function preloadPack(tier, pack) {
  const key = `${tier}:${pack}`;
  if (!packCache.has(key)) {
    const p = new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(worldPackUrl[tier][pack])
      .then((gltf) => gltf.scene)
      .catch((err) => {
        packCache.delete(key);
        throw err;
      });
    packCache.set(key, p);
  }
  return packCache.get(key);
}

export async function createCity(scene, renderer, shared, { tier, quality, reduced = false, signs: signWords = null }) {
  const [{ scene: source, shops: shopSource, props: propsBuffer }] = await Promise.all([preloadCity(tier), preloadHolo(), preloadMoon(), preloadAds(), preloadLogos()]);
  const root = source.clone(true);
  root.name = "night_city";
  root.updateMatrixWorld(true);

  const anchors = new Map();
  const signMeshes = [];
  const adMeshes = [];
  const named = {};
  const meshes = [];
  const protoMeshes = [];
  const signBatches = [];
  let namedBatch = null;
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  root.traverse((o) => {
    if (/^(cam_|anchor_|car_|logo_|lamp_)/.test(o.name)) {
      o.matrixWorld.decompose(pos, quat, scl);
      anchors.set(o.name, { position: pos.clone(), quaternion: quat.clone(), extras: o.userData });
    }
    if (!o.isMesh) return;
    if (o.name.startsWith("proto_")) protoMeshes.push(o);
    else if (o.name.startsWith("sign_")) signMeshes.push(o);
    else if (o.name === "signs_named") namedBatch = o;
    else if (o.name.startsWith("ad_")) adMeshes.push(o);
    else if (/^NCW_sign(\.\d+)?$/.test(o.material?.name ?? "") && o.geometry.attributes.color) signBatches.push(o);
    else if (/^(board_|crown_|holo_figure|moon_disc|garage_door|garage_screen)/.test(o.name)) named[o.name] = o;
    else meshes.push(o);
  });

  // The maps the kit carries, reused by name.
  const maps = {};
  root.traverse((o) => {
    if (!o.isMesh || !o.material?.map) return;
    const n = o.material.name;
    if (n === "NCW_sidewalk") maps.sidewalk = o.material.map;
    if (/^NCW_(facade_t\d|garage_wall_(back|magenta|cyan))$/.test(n)) maps[n.slice(4)] = o.material.map ?? o.material.emissiveMap;
    if (n === "NCW_concrete") maps.concrete = o.material.map;
    if (n === "NCW_asphalt") {
      maps.asphalt = o.material.map;
      maps.asphaltNormal = o.material.normalMap;
      maps.asphaltRough = o.material.roughnessMap;
    }
  });
  for (const m of Object.values(maps)) {
    if (!m) continue;
    m.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    m.wrapS = m.wrapT = THREE.RepeatWrapping;
  }
  maps.shops = shopSource.clone();
  maps.shops.flipY = false;
  maps.shops.colorSpace = THREE.SRGBColorSpace;
  maps.shops.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  maps.shops.needsUpdate = true;

  const kit = createMaterialKit(shared, { maps, reduced });
  // The workshop's own surfaces, from the garage pack's own pictures as it
  // is dressed (src/world/garage-materials.js).
  const garageMats = createGarageMaterials(shared, { kit, maxAnisotropy: renderer.capabilities.getMaxAnisotropy() });
  garageMats.setRects(garageLights());
  const road = createRoadMaterial(shared, { maps, reflection: quality.reflection > 0, reduced });
  const paint = createRoadMaterial(shared, { maps, reflection: quality.reflection > 0, paint: true, reduced });

  // Swap materials; note what glows (for the light bake) and what the wet
  // road should mirror. The core's meshes now, a streamed pack's later.
  const oldMaterials = new Set();
  // A tube of one colour joins the one neon material (materials.js
  // neonAll): its colour, and whether it flickers, onto its vertices.
  const NEON_LINEAR = Object.fromEntries(Object.entries(NEON).map(([k, hex]) => [k, new THREE.Color(hex)]));
  const neonAs = (mesh, name) => {
    const hue = name.slice(5);
    const c = NEON_LINEAR[hue] ?? new THREE.Color("#ffffff");
    const flicker = hue === "white" || hue === "amber" ? 0 : 1;
    const n = mesh.geometry.attributes.position.count;
    const arr = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b, flicker], i * 4);
    mesh.geometry.setAttribute("color", new THREE.BufferAttribute(arr, 4));
    return kit.neonAll();
  };
  // A surface (materials.js surface()) reads its colours only if it is
  // tinted and its UVs only for a map or a shutter: a mesh's colours or
  // UVs its surface does not read are left off its geometry (what it reads
  // in their place, three's defaults, goes nowhere), so that the surfaces
  // are as few vertex layouts, and render pipelines, as can be (ANGLE's
  // Metal backend keeps 96 a frame: see Baked in props.js).
  const unread = (mesh) => {
    const u = mesh.material.uniforms;
    if (!u?.uKind) return;
    const g = mesh.geometry;
    const drop = [...(u.uTinted.value ? [] : ["color"]), ...(u.uHasMap.value || u.uShutter.value ? [] : ["uv"])].filter((name) => g.attributes[name]);
    if (!drop.length) return;
    // (A geometry of its own over the rest: a GLB's may be shared.)
    const out = new THREE.BufferGeometry();
    out.index = g.index;
    for (const [name, attribute] of Object.entries(g.attributes)) if (!drop.includes(name)) out.setAttribute(name, attribute);
    for (const group of g.groups) out.addGroup(group.start, group.count, group.materialIndex);
    out.setDrawRange(g.drawRange.start, g.drawRange.count);
    mesh.geometry = out;
  };
  const dress = (meshes) => {
    const sources = [];
    for (const mesh of meshes) {
      const name = mesh.material.name.replace(/^NCW_/, "").replace(/\.\d+$/, "");
      const assetKind = mesh.userData.assetKind ?? mesh.material.userData?.assetKind
        ?? (/garage_board|shop_photos/.test(`${mesh.name} ${name}`) ? "personal-photo" : /garage_screen|garage_identity_poster/.test(`${mesh.name} ${name}`) ? "identity-art" : null);
      if (assetKind) mesh.userData.assetKind = assetKind;
      // (A workshop material's pictures are the garage's now: not the
      // pack's to dispose of with its material.)
      const own = garageMats.owns(mesh.material);
      if (!own) oldMaterials.add(mesh.material);
      const mat = own ? garageMats.forName(mesh.material) : name === "asphalt" ? road.material : name === "paint" ? paint.material : name.startsWith("neon_") ? neonAs(mesh, name) : kit.forName(mesh.material.name);
      if (mat) mesh.material = mat;
      unread(mesh);
      if (name.startsWith("neon_")) {
        sources.push({ mesh, color: new THREE.Color(NEON[name.slice(5)] || "#ffffff"), intensity: 1.0 });
        mesh.layers.enable(REFLECT_LAYER);
      } else if (name === "tube") {
        // The garage's tubes, pink, cyan and white together: their light in
        // the bake as the room's mix.
        sources.push({ mesh, color: new THREE.Color("#e0a8e6"), intensity: 0.8 });
        mesh.layers.enable(REFLECT_LAYER);
      } else if (name.startsWith("garage_wall_")) {
        // The garage's painted walls carry its tubes, as the viewer's room
        // does: their light in the bake, each wall its own.
        sources.push({ mesh, color: new THREE.Color(GARAGE_WALLS[name]), intensity: name === "garage_wall_back" ? 0.5 : 1.6 });
      } else if (name === "shop") {
        sources.push({ mesh, color: new THREE.Color("#ffb070"), intensity: 0.5 });
        mesh.layers.enable(REFLECT_LAYER);
      } else if (name === "lantern") {
        sources.push({ mesh, color: new THREE.Color("#ff4a2a"), intensity: 1.2 });
        mesh.layers.enable(REFLECT_LAYER);
      } else if (name === "billboard") {
      // A billboard's light on the street under it, as a sign's is.
      sources.push({ mesh, color: new THREE.Color("#c87ad8"), intensity: 0.8 });
      mesh.layers.enable(REFLECT_LAYER);
    } else if (name === "lobby") {
        sources.push({ mesh, color: new THREE.Color("#dfe8ff"), intensity: 0.5 });
        mesh.layers.enable(REFLECT_LAYER);
      } else if (name.startsWith("facade") || name === "awning" || name === "corporate") {
        mesh.layers.enable(REFLECT_LAYER);
      }
      mesh.matrixAutoUpdate = false;
    }
    return sources;
  };
  const sources = dress(meshes);

  // The props: each prototype dressed in the kit's material by name, then
  // instanced where the props file puts them (src/world/props.js).
  // Meshopt's quantised positions carry their scale in the node, so each
  // prototype's node is baked into a plain geometry of its own first.
  const dressProtos = (list) => {
    for (const mesh of list) {
      oldMaterials.add(mesh.material);
      const pname = mesh.material.name.replace(/^NCW_/, "").replace(/\.\d+$/, "");
      mesh.geometry = mergeMeshes([mesh], null);
      mesh.userData.hue = pname.startsWith("neon_") ? pname.slice(5) : null;
      mesh.material = pname.startsWith("neon_") ? neonAs(mesh, pname) : kit.forName(mesh.material.name) ?? mesh.material;
      unread(mesh);
      mesh.removeFromParent();
    }
  };
  dressProtos(protoMeshes);
  const visibility = createGarageVisibility(anchors);
  const props = createProps(protoMeshes, propsBuffer, { phone: tier === "phone", reflectLayer: REFLECT_LAYER, visibleBox: visibility.test, visibilityKey: () => visibility.inside ? visibility.passKey : null });
  renderer.setOpaqueSort(opaqueOrder);
  sources.push(...props.sources);
  root.add(props.group);

  // The street's standard signs come batched (the builder's kit.sign): each
  // face's index in signs_index's ids is in its vertices' colour, three
  // bytes. Cut back into a mesh per face, they are signs like any other.
  const streetIds = root.getObjectByName("signs_index")?.userData?.ids ?? [];
  // (load: a generator, some faces a step, for a district's signs once the
  // city is live; unpack runs it through.)
  function* unpackSteps(batches, ids = streetIds) {
    const out = [];
    for (const batch of batches) {
      batch.updateWorldMatrix(true, false);
      const g = batch.geometry;
      const pos = g.attributes.position;
      const col = g.attributes.color;
      const index = g.index;
      const byFace = new Map();
      const count = index ? index.count : pos.count;
      for (let i = 0; i < count; i++) {
        const v = index ? index.getX(i) : i;
        const id = Math.round(col.getX(v) * 255) + 256 * Math.round(col.getY(v) * 255) + 65536 * Math.round(col.getZ(v) * 255);
        if (!byFace.has(id)) byFace.set(id, []);
        byFace.get(id).push(v);
      }
      let since = 0;
      for (const [id, list] of byFace) {
        const name = ids[id];
        if (!name) continue;
        if (++since % 16 === 0) yield;
        const verts = [...new Set(list)];
        const remap = new Map(verts.map((v, k) => [v, k]));
        const face = new THREE.BufferGeometry();
        for (const attr of ["position", "normal", "uv"]) {
          const a = g.attributes[attr];
          const arr = new Float32Array(verts.length * a.itemSize);
          verts.forEach((v, k) => {
            for (let c = 0; c < a.itemSize; c++) arr[k * a.itemSize + c] = a.getComponent(v, c);
          });
          face.setAttribute(attr, new THREE.BufferAttribute(arr, a.itemSize));
        }
        face.setIndex(list.map((v) => remap.get(v)));
        const m = new THREE.Mesh(face);
        m.name = "sign_" + name;
        m.matrixWorld.copy(batch.matrixWorld);
        m.matrixWorldAutoUpdate = false;
        m.matrixAutoUpdate = false;
        // Its size, from its corners (uv 0,0 to 1,0 across, to 0,1 up).
        const uv = face.attributes.uv;
        const p = face.attributes.position;
        const at = (u, t) => {
          for (let k = 0; k < uv.count; k++) if (Math.abs(uv.getX(k) - u) < 1e-3 && Math.abs(uv.getY(k) - t) < 1e-3) return new THREE.Vector3().fromBufferAttribute(p, k).applyMatrix4(batch.matrixWorld);
          return null;
        };
        const o = at(0, 0) ?? at(0, 1);
        const a = at(1, 0) ?? at(1, 1);
        const b = at(0, 1) ?? at(0, 0);
        m.userData = { w: o && a ? o.distanceTo(a) : 1, h: o && b ? o.distanceTo(b) : 1 };
        out.push(m);
      }
      oldMaterials.add(batch.material);
      batch.removeFromParent();
      batch.geometry.dispose();
    }
    return out;
  }
  const unpack = (batches, ids = streetIds) => drain(unpackSteps(batches, ids));
  // The signs with a name of their own come the same way, in one batch of
  // their own (signs_named: `names`, and each one's width and height as the
  // builder gave them): before the street's, in the builder's order.
  if (namedBatch) {
    const { names, wh } = namedBatch.userData;
    const order = new Map(names.map((name, k) => ["sign_" + name, k]));
    for (const m of unpack([namedBatch], names).sort((a, b) => order.get(a.name) - order.get(b.name))) {
      const k = order.get(m.name);
      m.userData = { w: wh[k * 2], h: wh[k * 2 + 1] };
      signMeshes.push(m);
    }
  }
  const unpacked = unpack(signBatches);
  signMeshes.push(...unpacked);

  // Signs: one atlas, one draw, and their light in the bake.
  const signs = createSigns(signMeshes, shared, {
    maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    reduced,
    atlas: tier === "phone" ? 2048 : 4096,
    density: tier === "phone" ? 0.5 : 1,
    overrides: signWords,
    allStreet: true,
  });
  signs.mesh.layers.enable(REFLECT_LAYER);
  sources.push(...signs.sources);
  for (const m of signMeshes) {
    oldMaterials.add(m.material);
    m.removeFromParent();
  }
  root.add(signs.mesh);

  // The floors that trace what glows over them (src/world/wet.js): the
  // rooftop's roof its signs, the garage's floor its tubes.
  const roofSigns = signs.frames.filter((f) => ROOF_SIGNS.has(f.name));
  kit.wet.roof?.set(roofSigns.map((f) => ({ ...f, tint: f.color.clone().multiplyScalar(1.6) })), signs.texture);
  kit.wet.garage?.set(garageLights());
  const roofLights = [...new Map(roofSigns.map((f) => [f.name, f])).values()].map((f) => ({
    position: f.corner.clone().addScaledVector(f.u, 0.5).addScaledVector(f.v, 0.5),
    color: f.color.clone().multiplyScalar(0.9),
  }));

  // The avenue's two big screens: one draw, and their light in the bake too.
  const ads = await createAds(adMeshes, shared, {
    reduced,
    maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    cell: tier === "phone" ? 256 : 512,
  });
  ads.mesh.layers.enable(REFLECT_LAYER);
  sources.push(...ads.sources);
  for (const m of adMeshes) {
    oldMaterials.add(m.material);
    m.removeFromParent();
  }
  root.add(ads.mesh);

  // The kit's lamps (lamp_<name>), for lampsAt in src/world/glsl.js.
  const lamps = [...anchors].filter(([n]) => n.startsWith("lamp_")).slice(0, LAMPS);
  lamps.forEach(([, a], i) => {
    const reach = a.extras?.reach ?? 8;
    shared.uLamps.value[i].set(a.position.x, a.position.y, a.position.z, reach);
    shared.uLampColors.value[i].set(a.extras?.color ?? "#ffffff").multiplyScalar(a.extras?.power ?? 1);
  });
  for (let i = lamps.length; i < LAMPS; i++) shared.uLamps.value[i].set(0, -1e4, 0, 0);

  // The light: every emissive triangle, pooled on the ground. A streamed
  // pack adds its own and the maps are rebaked into the same textures (the
  // car reads the spill's pixels, src/world/car.js).
  // (load: worked out on a worker while the rest of the city is built, 0.1
  // to 0.15 s of the page's thread on the way to the city's first frame;
  // `light.ready` resolves once its maps are in, and the bake goes on from
  // it for the districts. The same maps to the bit; spill.js.)
  const bake = createBake();
  const points = [];
  for (const [n, a] of anchors) if (n.startsWith("anchor_lights_")) points.push(lampPoints(a.extras?.lights));
  const light = bake.finishElsewhere(sources, points);
  props.disposeBake();
  shared.uSpill.value = light.spill;
  shared.uSpillBounds.value.copy(light.bounds);
  road.setStreaks(light.streaks, light.streakBounds);
  paint.setStreaks(light.streaks, light.streakBounds);

  // One draw per material (see merge.js): merged, its index in the order of
  // CELL-metre cells of ground, and of those only the cells a camera holds
  // are drawn, so the city's size does not cost every frame. What the bake
  // needed from the meshes one by one it has had; from here the kit is
  // static.
  // Per material, the merged geometry of every part of the city that has
  // arrived: a streamed pack's share is merged into it and the cells cut
  // again, so a material is one draw however many packs it came in.
  const merged = new Map();
  const cells = createCells(CELL);
  cells.visibleBox = visibility.test;
  cells.visibilityKey = () => visibility.inside ? visibility.passKey : null;
  cells.partition = garageCellSector;
  // The wet road's mirror draws only what glows or is glazed (the reflect
  // layer), so it saw straight through every other wall to the signs
  // behind it. Each wall's merged mesh gets a twin for the mirror alone:
  // the same geometry, near black, one cheap draw. The page's own two
  // mirrored shots (the hero, the garage's street) were composed without
  // them and keep that picture: the twins are shown only to a camera that
  // is driven (a drive, a walk, the braindance), see setOccluders.
  const OCCLUDES = new Set(["trim", "concrete", "castconcrete", "plaster", "corrugated", "container", "tankplate", "dark", "glass_dark", "door", "door_panel", "board_frame"]);
  // A twin's face lying flat within 0.3 m over the plane the mirror is drawn
  // in (a bed under wet paving, a slab under a raised road, a kerb's cap)
  // hides nothing standing behind it, but in the mirror it is a black lid
  // over everything above it: its corners go just under the plane, where
  // the mirror's near plane cuts them. Walls are drawn as they stand.
  const occluder = quality.reflection > 0
    ? new THREE.ShaderMaterial({
      name: "occluder",
      side: THREE.DoubleSide,
      uniforms: { uMirrorY: MIRROR_UNIFORMS.uMirrorY },
      vertexShader: /* glsl */ `
        uniform float uMirrorY;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vec3 n = mat3(modelMatrix) * normal;
          if (abs(n.y) > 0.9 * length(n) && w.y > uMirrorY - 0.05 && w.y < uMirrorY + 0.3) w.y = uMirrorY - 0.1;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: "void main() { gl_FragColor = vec4(0.004, 0.006, 0.011, 1.0); }",
    })
    : null;
  const occluders = new THREE.Group();
  occluders.name = "occluders";
  occluders.visible = false;
  root.add(occluders);
  // (load: worked out a material at a time, out of sight, and put in the
  // city by the returned commit in one go: a streamed district's merge is
  // spread over the page's frames, addPack. mergeInto does it at once.)
  function* mergeSteps(meshes) {
    root.updateMatrixWorld(true);
    const groups = new Map();
    for (const mesh of meshes) {
      // (The garage's room is cut into rooms of its own, visibility sectors
      // the camera's portals choose between, so a piece of it never joins
      // a batch of the city's or of another room's.)
      const sector = mesh.userData.visibilitySector ?? "";
      const key = `${mesh.material.uuid}|${attributeKey(mesh.geometry)}|${mesh.layers.mask}|${mesh.renderOrder}|${sector}|${mesh.userData.assetKind ?? ""}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(mesh);
    }
    const made = [];
    for (const [key, list] of groups) {
      yield;
      const prev = merged.get(key);
      if (prev?.mesh.runs) {
        // (load: a district's part of a material the city already draws in
        // tiles is added to the end of it, its own triangles cut to the
        // cells and their runs after the old ones, where all of the
        // material was merged and cut again, a district at a time, and all
        // of it sent to the GPU again.)
        const untiled = prev.mesh.runs.cell.length === 1 && prev.mesh.runs.cell[0] === -1;
        const kit = { geometry: prev.whole, vertices: prev.vertices ?? prev.whole.attributes.position.count, indices: prev.indices ?? prev.whole.index.count, runs: prev.mesh.runs };
        // A material with work of its own on a geometry's first draw (the
        // shops' trades) is given a new one, as a merge made whole was.
        // Where the material can do that work a step at a time (the shops:
        // materials.js `deal`), it is done here, out of sight, rather than
        // in the first frame that draws it.
        const fresh = list[0].material.onBeforeRender !== THREE.Material.prototype.onBeforeRender;
        const append = yield* appendMeshesSteps(kit, list, root, cells, { untiled, fresh });
        made.push({ key, list, prev, append, bytes: append.bytes });
        const deal = fresh ? list[0].material.userData.deal?.(append.geometry, prev.mesh) : null;
        if (deal) while (!deal.next().done) yield;
        continue;
      }
      let whole = yield* mergeMeshesSteps(list, root);
      if (prev) {
        yield;
        const both = yield* joinSteps([prev.whole, whole]);
        whole.dispose();
        yield;
        both.computeBoundingSphere();
        both.computeBoundingBox();
        whole = both;
        yield;
      }
      // What blends is drawn whole, in the order it was built: its picture
      // depends on that order. (As the one instance, where it stands, of
      // an instanced mesh: the props' panes of its glass are instanced, and
      // so it is their program and render pipeline, not one of its own;
      // ANGLE's Metal backend keeps 96 a frame, see Baked in props.js. An
      // instance's matrix of ones and noughts moves no vertex by a bit.)
      const material = list[0].material;
      const mesh = material.transparent ? new THREE.InstancedMesh(whole, material, 1) : new Tiled(whole, material, cells, yield* cutSteps(whole, cells, CELL_MIN_TRIS));
      mesh.name = `kit_${material.name}`;
      mesh.layers.mask = list[0].layers.mask;
      mesh.renderOrder = list[0].renderOrder;
      mesh.matrixAutoUpdate = false;
      if (list[0].userData.assetKind) mesh.userData.assetKind = list[0].userData.assetKind;
      // Which room it is, kept once the meshes it was made of are gone.
      if (list[0].userData.visibilitySector) {
        mesh.userData.sector = list[0].userData.visibilitySector;
        mesh.name = `kit_${material.name}_${mesh.userData.sector}`;
      }
      if (occluder && OCCLUDES.has(material.name) && !mesh.layers.isEnabled(REFLECT_LAYER)) {
        const twin = mesh.runs ? new Tiled(whole, occluder, cells, mesh.runs) : new THREE.Mesh(whole, occluder);
        twin.name = `occ_${material.name}`;
        twin.layers.set(MIRROR_LAYER);
        twin.matrixAutoUpdate = false;
        if (mesh.userData.sector) twin.userData.sector = mesh.userData.sector;
        if (mesh.userData.assetKind) twin.userData.assetKind = mesh.userData.assetKind;
        mesh.userData.twin = twin;
      }
      made.push({ key, list, whole, mesh, prev, bytes: bytesOf(whole) });
    }
    const commit = () => {
      for (const { key, list, whole, mesh, prev, append } of made) {
        if (append) {
          append.send();
          const twin = prev.mesh.userData.twin;
          if (append.grown) {
            prev.mesh.geometry = append.geometry;
            if (twin) twin.geometry = append.geometry;
            prev.whole.dispose();
          }
          prev.mesh.setRuns(append.runs);
          twin?.setRuns(append.runs);
          merged.set(key, { whole: append.geometry, mesh: prev.mesh, vertices: append.vertices, indices: append.indices });
          for (const part of list) part.removeFromParent();
          continue;
        }
        if (prev) {
          prev.mesh.removeFromParent();
          prev.mesh.userData.twin?.removeFromParent();
          prev.whole.dispose();
          // (The glass's instance matrix and vertex arrays; its material
          // is the props' too.)
          if (prev.mesh.isInstancedMesh) prev.mesh.dispose();
        }
        root.add(mesh);
        if (mesh.userData.twin) occluders.add(mesh.userData.twin);
        merged.set(key, { whole, mesh });
        for (const part of list) part.removeFromParent();
      }
    };
    // (load: what the commit will draw, each mesh with the geometry it will
    // draw then, its twin's too, and the bytes the GPU is to be sent for
    // it: a whole geometry's, or a part's added into room. `send` marks a
    // part added into room to be sent.)
    commit.drawn = made.flatMap(({ whole, mesh, prev, append, bytes }) => {
      const object = append ? prev.mesh : mesh;
      const geometry = append ? append.geometry : whole;
      const twin = object.userData.twin;
      return [{ object, geometry, bytes, send: append?.send }, ...(twin ? [{ object: twin, geometry, bytes: 0 }] : [])];
    });
    return commit;
  }
  const mergeInto = (meshes) => drain(mergeSteps(meshes))();
  mergeInto(meshes);

  // Placeholders for the named pieces the other modules dress.
  for (const mesh of Object.values(named)) {
    oldMaterials.add(mesh.material);
    mesh.material = kit.surface("placeholder", { color: "#101014" });
  }
  const dressed = [];
  if (named.holo_figure) {
    dressed.push(await dressHolo(named.holo_figure, shared, { reduced }));
    named.holo_figure.layers.enable(REFLECT_LAYER);
  }
  const moonDisc = named.moon_disc ? await dressMoon(named.moon_disc, shared, { reflectLayer: REFLECT_LAYER }) : null;
  if (moonDisc) dressed.push(moonDisc);
  const boards = createBoards(Object.entries(named).filter(([n]) => n.startsWith("board_")).map(([, m]) => m), shared, { reduced, reflectLayer: REFLECT_LAYER });
  const floods = createFloods(anchors, shared, { reflectLayer: REFLECT_LAYER });
  if (floods.group) root.add(floods.group);
  const towers = createTowers(Object.entries(named).filter(([n]) => n.startsWith("crown_")).map(([, m]) => m), shared, { reflectLayer: REFLECT_LAYER, anchors });
  const logos = await createLogos(anchors, shared, { reflectLayer: REFLECT_LAYER, maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()) });
  root.add(logos.mesh);
  const garage = await createGarage(named, shared, { reduced, reflectLayer: REFLECT_LAYER });
  root.add(garage.mesh);
  dressed.push(boards, floods, towers, logos, garage);
  // (What no module dressed keeps its placeholder, a surface: its
  // quantized numbers made the floats the GPU made of them, as the kit's
  // are, and drawn as the kit's surfaces are, so as their program and
  // render pipeline.)
  for (const mesh of Object.values(named)) {
    if (mesh.material.name !== "placeholder") continue;
    mesh.geometry = toFloat(mesh.geometry);
    asOneRun(mesh);
  }

  scene.add(root);
  const packSigns = [];
  const packsAdded = [];
  const pendingPacks = new Map();
  const garageSolids = [];

  // The road the car drives: world points, sampled a metre apart in Blender.
  const roadNode = root.getObjectByName("road_spline");
  const path = createRoad(roadNode?.userData?.points || []);

  return {
    root,
    anchors,
    named,
    visibility,
    maps,
    road: path,
    boards,
    towers,
    logos,
    garage,
    garageMaterials: garageMats,
    garageSolids,
    moonDisc,
    kit,
    roadMaterial: road,
    roadMaterials: [road, paint],
    signs,
    props,
    roofLights,
    light,
    /**
     * A streamed pack (src/world/world-scene.js loads them after the first
     * frame): dressed in the core's materials, its signs on the core's
     * atlas, its light added to the bake, its meshes handed to `beforeMerge`
     * (the clearance field) and then merged into the core's own, material
     * by material, tile by tile.
     */
    async addPack(name, packScene, { beforeMerge = null, between = async () => {}, ready = null, placements = null, validate = null } = {}) {
      if (packsAdded.includes(name)) return name;
      const pending = pendingPacks.get(name);
      if (pending) {
        if (ready) await ready(pending.drawn);
        pending.commit();
        return name;
      }
      // (load: in pieces, `between()` resolving when the page has a moment
      // between its frames: its parts made, its light baked and its kit
      // merged out of sight, then all of it put in the city in one go, so
      // the district appears in one frame as it did and no frame waits for
      // its build. Every piece is a step of a few milliseconds at most, and
      // before it goes in `ready(drawn)` is given what will then be drawn,
      // each { object, geometry, bytes }, to make its programs and send its
      // buffers to the GPU out of sight.)
      const run = async (steps) => {
        let r;
        while (!(r = steps.next()).done) await between();
        return r.value;
      };
      const pack = packScene.clone(true);
      pack.name = `pack_${name}`;
      pack.updateMatrixWorld(true);
      const kitMeshes = [];
      const batches = [];
      const packProtos = [];
      const packNamed = [];
      const packSolids = [];
      const hidden = [];
      pack.traverse((o) => {
        if (!o.isMesh) return;
        if (!GARAGE_PHOTOS_ENABLED && (/^garage_board_(bmw|bench|competitions)$/.test(o.name) || /^NCW_garage_shop_photos(?:\.\d+)?$/.test(o.material?.name ?? ""))) hidden.push(o);
        else if (/^(collide_garage_|nav_garage_floor_)/.test(o.name)) {
          hidden.push(o);
          if (o.name.startsWith("collide_")) packSolids.push({ name: o.name, box: new THREE.Box3().setFromObject(o), ...o.userData });
        } else if (o.name === "garage_screen") packNamed.push(o);
        else if (o.name.startsWith("proto_")) packProtos.push(o);
        else if (/^NCW_sign(\.\d+)?$/.test(o.material?.name ?? "") && o.geometry.attributes.color) batches.push(o);
        else kitMeshes.push(o);
      });
      for (const node of hidden) node.removeFromParent();
      const more = [];
      for (const mesh of kitMeshes) {
        more.push(...dress([mesh]));
        await between();
      }
      for (const mesh of packProtos) {
        dressProtos([mesh]);
        await between();
      }
      // Validate resources before adding light, props or geometry to shared
      // state. A failed map load can retry without duplicating a room.
      if (validate) validate();
      for (const node of packNamed) if (node.name === "garage_screen") await garage.bindScreen(node);
      let heldProps = null;
      if (placements) heldProps = props.addPlacements([...protoMeshes, ...packProtos], placements, { hold: true });
      else if (packProtos.length) heldProps = props.addProtos(packProtos, { hold: true });
      if (heldProps) more.push(...heldProps.sources);
      await between();
      const faces = await run(unpackSteps(batches));
      const heldSigns = await run(signs.addFacesSteps(faces));
      if (heldSigns) more.push(...heldSigns.sources);
      await run(bake.addSteps(more));
      pack.traverse((o) => {
        if (o.name.startsWith("anchor_lights_")) bake.addPoints(lampPoints(o.userData.lights));
      });
      await between();
      const next = await bake.finishSliced(between);
      props.disposeBake();
      heldProps?.disposeBake?.();
      await between();
      // The clearance field a few thousand triangles at a time: the same
      // triangles as the meshes whole (each its highest point over the
      // cells it covers), so the same field.
      if (beforeMerge) {
        for (const mesh of kitMeshes) {
          for (const piece of piecesOf(mesh)) {
            beforeMerge(piece);
            await between();
          }
        }
      }
      const commitKit = await run(mergeSteps(kitMeshes));
      const drawnProps = heldProps ? await run(heldProps.prepare()) : [];
      const drawn = [...commitKit.drawn, ...drawnProps.map((d) => ({ ...d, bytes: bytesOf(d.geometry) + (d.extra ?? []).reduce((n, a) => n + a.array.byteLength, 0) }))];
      if (heldSigns) drawn.push({ object: heldSigns.mesh, geometry: heldSigns.geometry, bytes: bytesOf(heldSigns.geometry) });
      const commit = () => {
      // ---- the district, in one go ----
      heldProps?.commit();
      garageSolids.push(...packSolids);
      for (const node of packNamed) {
        named[node.name]?.removeFromParent();
        named[node.name] = node;
        root.add(node);
      }
      protoMeshes.push(...packProtos);
      if (heldSigns) {
        const mesh = heldSigns.commit();
        // (Every pack's faces after the first join the first's mesh.)
        if (!packSigns.includes(mesh)) {
          mesh.layers.enable(REFLECT_LAYER);
          mesh.visible = signs.mesh.visible;
          root.add(mesh);
          packSigns.push(mesh);
        }
      }
      light.spill.image.data.set(next.spill.image.data);
      light.spill.needsUpdate = true;
      light.streaks.image.data.set(next.streaks.image.data);
      light.streaks.needsUpdate = true;
      next.dispose();
      commitKit();
      for (const f of faces) f.geometry.dispose();
      packsAdded.push(name);
        pendingPacks.delete(name);
      };
      // A shader/upload failure retries this staged transaction. It does
      // not rebake the same sources or append duplicate props/geometry.
      pendingPacks.set(name, { drawn, commit });
      if (ready) await ready(drawn);
      commit();
      return name;
    },
    /** (load) The light bake's working arrays let go: every district is in. */
    releaseBake() {
      bake.release();
    },
    /** The walls' dark twins in the road's mirror: on for a driven camera. */
    setOccluders(on) {
      occluders.visible = on;
    },
    setSignsVisible(on) {
      signs.mesh.visible = on;
      for (const m of packSigns) m.visible = on;
      for (const w of Object.values(kit.wet)) w.setSigns(on);
    },
    /** The `wet` switch: the road's sheen and mirror are the road's own;
     *  this is the rooftop's standing water. */
    setWet(on) {
      kit.wet.roof?.setWet(on);
    },
    dispose() {
      scene.remove(root);
      const geos = new Set();
      root.traverse((o) => {
        if (o.isMesh) geos.add(o.geometry);
      });
      for (const m of [...signMeshes, ...adMeshes, ...protoMeshes]) geos.add(m.geometry);
      geos.forEach((g) => g.dispose());
      oldMaterials.forEach((m) => {
        m.map?.dispose?.();
        m.normalMap?.dispose?.();
        m.roughnessMap?.dispose?.();
        m.metalnessMap?.dispose?.();
        m.dispose();
      });
      for (const m of Object.values(maps)) m?.dispose?.();
      garageMats.dispose();
      kit.dispose();
      road.dispose();
      paint.dispose();
      dressed.forEach((d) => d.dispose());
      signs.dispose();
      occluder?.dispose();
      ads.dispose();
      props.dispose();
      light.dispose();
    },
  };
}
