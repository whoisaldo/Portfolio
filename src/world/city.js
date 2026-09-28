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
import { worldModelUrl, worldShopsUrl } from "../data/world-assets.js";
import { createMaterialKit, NEON } from "./materials.js";
import { createSigns } from "./signs.js";
import { bakeLight } from "./spill.js";
import { createRoadMaterial } from "./road.js";
import { createRoad } from "./road-path.js";
import { dressHolo, preloadHolo } from "./holo.js";
import { dressMoon, preloadMoon } from "./moon.js";
import { createAds, preloadAds } from "./ads.js";
import { createBoards } from "./boards.js";
import { createTowers } from "./towers.js";
import { createLogos, preloadLogos } from "./logos.js";
import { createGarage } from "./garage.js";
import { attributeKey, mergeMeshes } from "./merge.js";

/** Layers: 0 is everything, REFLECT is what the wet road mirrors, and
 *  MIRROR_ONLY is drawn in the mirror and nowhere else (the car's stand-in). */
export const REFLECT_LAYER = 2;
export const MIRROR_LAYER = 3;

const cache = new Map();

export function preloadCity(tier) {
  if (!cache.has(tier)) {
    // The kit, and the rooms its shop windows look into.
    const pending = Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(worldModelUrl[tier]).then((gltf) => gltf.scene),
      new THREE.TextureLoader().loadAsync(worldShopsUrl[tier]),
    ])
      .then(([scene, shops]) => ({ scene, shops }))
      .catch((err) => {
        cache.delete(tier);
        throw err;
      });
    cache.set(tier, pending);
  }
  return cache.get(tier);
}

export async function createCity(scene, renderer, shared, { tier, quality, reduced = false }) {
  const [{ scene: source, shops: shopSource }] = await Promise.all([preloadCity(tier), preloadHolo(), preloadMoon(), preloadAds(), preloadLogos()]);
  const root = source.clone(true);
  root.name = "night_city";
  root.updateMatrixWorld(true);

  const anchors = new Map();
  const signMeshes = [];
  const adMeshes = [];
  const named = {};
  const meshes = [];
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  root.traverse((o) => {
    if (/^(cam_|anchor_|car_|logo_)/.test(o.name)) {
      o.matrixWorld.decompose(pos, quat, scl);
      anchors.set(o.name, { position: pos.clone(), quaternion: quat.clone(), extras: o.userData });
    }
    if (!o.isMesh) return;
    if (o.name.startsWith("sign_")) signMeshes.push(o);
    else if (o.name.startsWith("ad_")) adMeshes.push(o);
    else if (/^(board_|crown_|holo_figure|moon_disc|garage_door|garage_screen)/.test(o.name)) named[o.name] = o;
    else meshes.push(o);
  });

  // The maps the kit carries, reused by name.
  const maps = {};
  root.traverse((o) => {
    if (!o.isMesh || !o.material?.map) return;
    const n = o.material.name;
    if (n === "NCW_sidewalk") maps.sidewalk = o.material.map;
    if (/^NCW_facade_t\d$/.test(n)) maps[n.slice(4)] = o.material.map ?? o.material.emissiveMap;
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
  // road should mirror.
  const sources = [];
  const oldMaterials = new Set();
  for (const mesh of meshes) {
    const name = mesh.material.name.replace(/^NCW_/, "").replace(/\.\d+$/, "");
    oldMaterials.add(mesh.material);
    const mat = name === "asphalt" ? road.material : name === "paint" ? paint.material : kit.forName(mesh.material.name);
    if (mat) mesh.material = mat;
    if (name.startsWith("neon_")) {
      sources.push({ mesh, color: new THREE.Color(NEON[name.slice(5)] || "#ffffff"), intensity: 1.0 });
      mesh.layers.enable(REFLECT_LAYER);
    } else if (name === "tube") {
      // The garage's tubes, pink, cyan and white together: their light in
      // the bake as the room's mix.
      sources.push({ mesh, color: new THREE.Color("#e0a8e6"), intensity: 0.8 });
      mesh.layers.enable(REFLECT_LAYER);
    } else if (name === "shop") {
      sources.push({ mesh, color: new THREE.Color("#ffb070"), intensity: 0.5 });
      mesh.layers.enable(REFLECT_LAYER);
    } else if (name === "lantern") {
      sources.push({ mesh, color: new THREE.Color("#ff4a2a"), intensity: 1.2 });
      mesh.layers.enable(REFLECT_LAYER);
    } else if (name === "lobby") {
      sources.push({ mesh, color: new THREE.Color("#dfe8ff"), intensity: 0.5 });
      mesh.layers.enable(REFLECT_LAYER);
    } else if (name.startsWith("facade") || name === "awning" || name === "corporate") {
      mesh.layers.enable(REFLECT_LAYER);
    }
    mesh.matrixAutoUpdate = false;
  }

  // Signs: one atlas, one draw, and their light in the bake.
  const signs = createSigns(signMeshes, shared, {
    maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    reduced,
    atlas: tier === "phone" ? 2048 : 4096,
    density: tier === "phone" ? 0.5 : 1,
  });
  signs.mesh.layers.enable(REFLECT_LAYER);
  sources.push(...signs.sources);
  for (const m of signMeshes) {
    oldMaterials.add(m.material);
    m.removeFromParent();
  }
  root.add(signs.mesh);

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

  // The light: every emissive triangle, pooled on the ground.
  const light = bakeLight(sources);
  shared.uSpill.value = light.spill;
  shared.uSpillBounds.value.copy(light.bounds);
  road.setStreaks(light.streaks, light.streakBounds);
  paint.setStreaks(light.streaks, light.streakBounds);

  // One draw per material (see merge.js). What the bake needed from the
  // meshes one by one it has had; from here the kit is static.
  root.updateMatrixWorld(true);
  const groups = new Map();
  for (const mesh of meshes) {
    const key = `${mesh.material.uuid}|${attributeKey(mesh.geometry)}|${mesh.layers.mask}|${mesh.renderOrder}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const merged = new THREE.Mesh(mergeMeshes(list, root), list[0].material);
    merged.name = `kit_${list[0].material.name}`;
    merged.layers.mask = list[0].layers.mask;
    merged.renderOrder = list[0].renderOrder;
    merged.matrixAutoUpdate = false;
    root.add(merged);
    for (const mesh of list) mesh.removeFromParent();
  }

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
  if (named.moon_disc) dressed.push(await dressMoon(named.moon_disc, shared, { reflectLayer: REFLECT_LAYER }));
  const boards = createBoards(Object.entries(named).filter(([n]) => n.startsWith("board_")).map(([, m]) => m), shared, { reduced, reflectLayer: REFLECT_LAYER });
  const towers = createTowers(Object.entries(named).filter(([n]) => n.startsWith("crown_")).map(([, m]) => m), shared, { reflectLayer: REFLECT_LAYER });
  const logos = await createLogos(anchors, shared, { reflectLayer: REFLECT_LAYER, maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()) });
  root.add(logos.mesh);
  const garage = await createGarage(named, shared, { reduced, reflectLayer: REFLECT_LAYER });
  root.add(garage.mesh);
  dressed.push(boards, towers, logos, garage);

  scene.add(root);

  // The road the car drives: world points, sampled a metre apart in Blender.
  const roadNode = root.getObjectByName("road_spline");
  const path = createRoad(roadNode?.userData?.points || []);

  return {
    root,
    anchors,
    named,
    road: path,
    boards,
    towers,
    logos,
    garage,
    kit,
    roadMaterial: road,
    roadMaterials: [road, paint],
    signs,
    light,
    setSignsVisible(on) {
      signs.mesh.visible = on;
    },
    dispose() {
      scene.remove(root);
      const geos = new Set();
      root.traverse((o) => {
        if (o.isMesh) geos.add(o.geometry);
      });
      for (const m of [...signMeshes, ...adMeshes]) geos.add(m.geometry);
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
      ads.dispose();
      light.dispose();
    },
  };
}
