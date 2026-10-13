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
import { createProps, preloadProps } from "./props.js";
import { bitmapTexture } from "./pictures.js";
import { fetchUnpacked } from "./fetched.js";
import { createMaterialKit, NEON } from "./materials.js";
import { markBytes } from "./progress.js";
import { createSigns } from "./signs.js";
import { createBake } from "./spill.js";
import { createRoadMaterial } from "./road.js";
import { createRoad } from "./road-path.js";
import { dressHolo, preloadHolo } from "./holo.js";
import { dressMoon, preloadMoon } from "./moon.js";
import { createAds, preloadAds } from "./ads.js";
import { createBoards } from "./boards.js";
import { createFloods } from "./floods.js";
import { createTowers } from "./towers.js";
import { createLogos, preloadLogos } from "./logos.js";
import { createGarage, garageLights } from "./garage.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { appendPart, attributeKey, mergeMeshes, createCells, cutToCells, Tiled } from "./merge.js";
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
// The cells the kit is drawn by, metres on a side, and the fewest triangles
// a material needs before it is cut to them (see the merge below).
const CELL = 48;
const CELL_MIN_TRIS = 3000;

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
export const PACKS = Object.keys(worldPackUrl.high);
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
  const road = createRoadMaterial(shared, { maps, reflection: quality.reflection > 0 });
  const paint = createRoadMaterial(shared, { maps, reflection: quality.reflection > 0, paint: true });

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
  const dress = (meshes) => {
    const sources = [];
    for (const mesh of meshes) {
      const name = mesh.material.name.replace(/^NCW_/, "").replace(/\.\d+$/, "");
      oldMaterials.add(mesh.material);
      const mat = name === "asphalt" ? road.material : name === "paint" ? paint.material : name.startsWith("neon_") ? neonAs(mesh, name) : kit.forName(mesh.material.name);
      if (mat) mesh.material = mat;
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
      mesh.removeFromParent();
    }
  };
  dressProtos(protoMeshes);
  const props = createProps(protoMeshes, propsBuffer, { phone: tier === "phone", reflectLayer: REFLECT_LAYER });
  sources.push(...props.sources);
  root.add(props.group);

  // The street's standard signs come batched (the builder's kit.sign): each
  // face's index in signs_index's ids is in its vertices' colour, three
  // bytes. Cut back into a mesh per face, they are signs like any other.
  const streetIds = root.getObjectByName("signs_index")?.userData?.ids ?? [];
  const unpack = (batches, ids = streetIds) => {
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
      for (const [id, list] of byFace) {
        const name = ids[id];
        if (!name) continue;
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
  };
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
  const bake = createBake();
  bake.add(sources);
  for (const [n, a] of anchors) if (n.startsWith("anchor_lights_")) bake.addPoints(lampPoints(a.extras?.lights));
  const light = bake.finish();
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
  // The wet road's mirror draws only what glows or is glazed (the reflect
  // layer), so it saw straight through every other wall to the signs
  // behind it. Each wall's merged mesh gets a twin for the mirror alone:
  // the same geometry, near black, one cheap draw. The page's own two
  // mirrored shots (the hero, the garage's street) were composed without
  // them and keep that picture: the twins are shown only to a camera that
  // is driven (a drive, a walk, the braindance), see setOccluders.
  const OCCLUDES = new Set(["trim", "concrete", "castconcrete", "plaster", "corrugated", "container", "tankplate", "dark", "glass_dark", "door", "door_panel", "board_frame"]);
  const occluder = quality.reflection > 0
    ? new THREE.ShaderMaterial({
      name: "occluder",
      side: THREE.DoubleSide,
      vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
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
      const key = `${mesh.material.uuid}|${attributeKey(mesh.geometry)}|${mesh.layers.mask}|${mesh.renderOrder}`;
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
        const part = mergeMeshes(list, root);
        yield;
        const untiled = prev.mesh.runs.cell.length === 1 && prev.mesh.runs.cell[0] === -1;
        const partRuns = untiled ? { cell: Int32Array.of(-1), start: Int32Array.of(0), count: Int32Array.of(part.index.count) } : cutToCells(part, cells, 0);
        yield;
        const kit = { geometry: prev.whole, vertices: prev.vertices ?? prev.whole.attributes.position.count, indices: prev.indices ?? prev.whole.index.count, runs: prev.mesh.runs };
        made.push({ key, list, prev, append: appendPart(kit, part, partRuns) });
        part.dispose();
        continue;
      }
      let whole = mergeMeshes(list, root);
      if (prev) {
        yield;
        const both = mergeGeometries([prev.whole, whole], false);
        whole.dispose();
        yield;
        both.computeBoundingSphere();
        both.computeBoundingBox();
        whole = both;
        yield;
      }
      // What blends is drawn whole, in the order it was built: its picture
      // depends on that order.
      const material = list[0].material;
      const mesh = material.transparent ? new THREE.Mesh(whole, material) : new Tiled(whole, material, cells, cutToCells(whole, cells, CELL_MIN_TRIS));
      mesh.name = `kit_${material.name}`;
      mesh.layers.mask = list[0].layers.mask;
      mesh.renderOrder = list[0].renderOrder;
      mesh.matrixAutoUpdate = false;
      if (occluder && OCCLUDES.has(material.name) && !mesh.layers.isEnabled(REFLECT_LAYER)) {
        const twin = mesh.runs ? new Tiled(whole, occluder, cells, mesh.runs) : new THREE.Mesh(whole, occluder);
        twin.name = `occ_${material.name}`;
        twin.layers.set(MIRROR_LAYER);
        twin.matrixAutoUpdate = false;
        mesh.userData.twin = twin;
      }
      made.push({ key, list, whole, mesh, prev });
    }
    return () => {
      for (const { key, list, whole, mesh, prev, append } of made) {
        if (append) {
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
        }
        root.add(mesh);
        if (mesh.userData.twin) occluders.add(mesh.userData.twin);
        merged.set(key, { whole, mesh });
        for (const part of list) part.removeFromParent();
      }
    };
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

  scene.add(root);
  const packSigns = [];
  const packsAdded = [];

  // The road the car drives: world points, sampled a metre apart in Blender.
  const roadNode = root.getObjectByName("road_spline");
  const path = createRoad(roadNode?.userData?.points || []);

  return {
    root,
    anchors,
    named,
    maps,
    road: path,
    boards,
    towers,
    logos,
    garage,
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
    async addPack(name, packScene, { beforeMerge = null, between = async () => {} } = {}) {
      // (load: in pieces, `between()` resolving when the page has a moment
      // between its frames: its parts made, its light baked and its kit
      // merged out of sight, then all of it put in the city in one go, so
      // the district appears in one frame as it did and no frame waits for
      // its build.)
      const pack = packScene.clone(true);
      pack.name = `pack_${name}`;
      pack.updateMatrixWorld(true);
      const kitMeshes = [];
      const batches = [];
      const packProtos = [];
      pack.traverse((o) => {
        if (!o.isMesh) return;
        if (o.name.startsWith("proto_")) packProtos.push(o);
        else if (/^NCW_sign(\.\d+)?$/.test(o.material?.name ?? "") && o.geometry.attributes.color) batches.push(o);
        else kitMeshes.push(o);
      });
      const more = dress(kitMeshes);
      await between();
      // The prototypes only this district places came with it: its props
      // are drawn from now on, and light its streets in the bake.
      let heldProps = null;
      if (packProtos.length) {
        dressProtos(packProtos);
        protoMeshes.push(...packProtos);
        await between();
        heldProps = props.addProtos(packProtos, { hold: true });
        more.push(...heldProps.sources);
        await between();
      }
      const faces = unpack(batches);
      await between();
      const heldSigns = signs.addFaces(faces, { hold: true });
      if (heldSigns) more.push(...heldSigns.sources);
      await between();
      bake.add(more);
      pack.traverse((o) => {
        if (o.name.startsWith("anchor_lights_")) bake.addPoints(lampPoints(o.userData.lights));
      });
      await between();
      const next = await bake.finishSliced(between);
      props.disposeBake();
      await between();
      beforeMerge?.(pack);
      await between();
      const merging = mergeSteps(kitMeshes);
      let step;
      let t = performance.now();
      while (!(step = merging.next()).done) {
        if (performance.now() - t > 4) {
          await between();
          t = performance.now();
        }
      }
      // ---- the district, in one go ----
      heldProps?.commit();
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
      step.value();
      for (const f of faces) f.geometry.dispose();
      packsAdded.push(name);
      return name;
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
