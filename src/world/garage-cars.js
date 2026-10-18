// src/world/garage-cars.js: Ali's two cars, parked in the city's garage.
//
// The S4 drives the whole page (src/world/car.js) and ends it in its bay;
// the S6 is parked in the next bay and never moves. Inside, the visit opens
// their hoods, brings the S6's body down on Virtual Link and pins their
// parts, so the garage shows each as a car that can do that: from the one
// cached source each (src/three/car/object.js), with its engine bay, its
// hood on its hinge and struts, its body over wheels that stay put, and on
// a phone in fewer triangles (src/three/car/inspect.js). Which is one car,
// not two: the S4 the garage inspects takes the road's S4's place only
// while that stands still in its bay, hung from it, with its lamps and
// shadow; and the road's car cannot drive out of the bay until its hood is
// shut, which the garage does on the way (`update`).
//
// The integration (src/world/world-scene.js) makes this once the garage's
// room is wanted and calls it every frame; agents/B5/CONTRACT.md section
// 2.6 and agents/B4/NOTES.md give the contract. Availability controls each
// real GLB. An explicitly unavailable asset can use an isolated development
// placeholder, which the presentation excludes from visitors and queries.
import * as THREE from "three";
import { cars, preloadCar, createObject } from "../three/car/object.js";
import { resolveAnchor, localBounds, triangles, prepareInspection } from "../three/car/inspect.js";
import { createContactShadow } from "../three/car/street-contact.js";
import { mods as S4_MODS } from "../data/garage.js";
import { oneProgram } from "./car.js";
import { fixturesFrom, GARAGE_LIGHT_LOOK, scopeCarLighting } from "./garage-lighting.js";
import { UNDER_HOOD, underHood } from "../three/car/slim.js";

// The S6's five, each on the empty its model carries for it (A1's node
// contract, agents/A1/LOADER-CONTRACT.md). The tunes are in the engine bay.
// Virtual Link is the exception: its empty is where the module sits, under
// the floor on the centre line, which no camera outside the car can see.
// What it does shows at the air suspension's corners, so its pin hangs in
// the gap between the front tyre and its arch, on the body so it comes
// down with the drop; as a corner it shows on the side the camera faces.
export const S6_ANCHORS = {
  "ie-ecu-tune": { node: "mod_ie_ecu_tune", inBay: true },
  "ie-tcu-tune": { node: "mod_ie_tcu_tune", inBay: true },
  "virtual-link": { part: "wheel_fl", carrier: "body", offset: [0.1, 0.4, 0] },
  "rsnav-head-unit": { node: "mod_rsnav_head_unit" },
  "rs-grille": { node: "mod_rs_grille" },
};

// The most Virtual Link brings the S6 down in the garage, in metres, unless
// its model has less room than that (PLAN.md): an illustration of the drop,
// not a ride height anyone gave.
export const MAX_DROP = 0.055;
// A phone's inspected cars, in triangles (PLAN.md budgets).
export const HIGH_TRIANGLES = { s4: 128868, s6: 150000 };
export const PHONE_TRIANGLES = { s4: 60000, s6: 70000 };
// How strongly the road S4's paint reflects the workshop. The parked cars
// take their own values from GARAGE_LIGHT_LOOK.cars.
const PROBE_GAIN = GARAGE_LIGHT_LOOK.cars.s4.probeGain;
// A part at one corner (wheel_fl, a caliper, a strut) stands for all four:
// the R8 wheels, the brakes and the suspension are on every corner. Its
// mirror across the car (left and right swapped, the lateral offset
// negated: car-space X is the car's left) lets the marker sit on whichever
// side faces the camera. Null when the anchor is not a corner or the
// mirrored part does not exist.
const CORNER = /_(f|r)(l|r)$/;
const mirrorName = (name) => name?.replace(CORNER, (m, end, side) => `_${end}${side === "l" ? "r" : "l"}`);
function cornerTwin(root, anchor) {
  if (!CORNER.test(anchor.part ?? "") && !CORNER.test(anchor.carrier ?? "")) return null;
  const part = mirrorName(anchor.part), carrier = mirrorName(anchor.carrier);
  if ((part && !root.getObjectByName(part)) || (carrier && !root.getObjectByName(carrier))) return null;
  const offset = anchor.offset && [-anchor.offset[0], anchor.offset[1], anchor.offset[2]];
  const { owner, local } = resolveAnchor(root, { ...anchor, part, carrier, offset });
  return { owner, local };
}

// The S4's hood shuts in this long when the car has to leave (the garage's
// own buttons take about as long).
const HOOD_SECONDS = 0.9;

const S6_BAY = { position: [462, 0, -222], yaw: Math.PI / 2 };

/** The coarse shapes that hide a pin: the lower body and the cabin. */
function shapesOf(box) {
  const size = box.getSize(new THREE.Vector3());
  const belt = box.min.y + size.y * 0.64;
  const lower = new THREE.Box3(new THREE.Vector3(box.min.x + 0.06, box.min.y + 0.2, box.min.z + 0.08), new THREE.Vector3(box.max.x - 0.06, belt, box.max.z - 0.08));
  const cabin = new THREE.Box3(new THREE.Vector3(box.min.x + 0.22, belt, box.min.z + size.z * 0.28), new THREE.Vector3(box.max.x - 0.22, box.max.y - 0.03, box.min.z + size.z * 0.58));
  return [lower, cabin];
}

/**
 * A stand-in S6 for development while its model is not built: boxes the
 * size of a 2013 S6 with every node A1's contract names, hood, struts,
 * wheels and the five anchors where the model will have them, and
 * "S6 PLACEHOLDER (DEV)" written on its flanks, hood and boot. The same
 * userData as object.js's roots.
 */
function* placeholderS6Steps() {
  const owned = { geometries: [], materials: [], textures: [] };
  const dispose = () => {
    owned.geometries.forEach((g) => g.dispose());
    owned.materials.forEach((m) => m.dispose());
    owned.textures.forEach((t) => t.dispose());
  };
  let car;
  try { car = yield* buildPlaceholderS6(owned, dispose); return car; }
  finally { if (!car) dispose(); }
}

function* buildPlaceholderS6(owned, dispose) {
  const spec = cars.s6;
  const [, height, length] = spec.size;
  const r = spec.wheelRadius;
  const half = 0.93; // half the body's width without mirrors
  const track = 0.815;
  const zf = spec.wheelbase / 2;
  const mat = (o) => {
    const m = new THREE.MeshPhysicalMaterial(o);
    owned.materials.push(m);
    return m;
  };
  const paint = mat({ color: new THREE.Color().setRGB(0.19, 0.22, 0.235), metalness: 0.5, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
  const black = mat({ color: 0x0b0c0e, roughness: 0.4 });
  const silver = mat({ color: 0xc4c8cc, metalness: 1, roughness: 0.22 });
  const rubber = mat({ color: 0x131416, roughness: 0.9 });
  const glass = mat({ color: 0x0c1014, roughness: 0.05, metalness: 0.2 });
  const bay = mat({ color: 0x2a2b2e, roughness: 0.6, metalness: 0.3 });
  const red = mat({ color: 0x8a1010, emissive: 0x400404, roughness: 0.3 });
  const white = mat({ color: 0xdfe6ef, emissive: 0x404850, roughness: 0.2 });
  yield;
  const box = (name, parent, material, [w, h, d], [x, y, z]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    owned.geometries.push(g);
    const m = new THREE.Mesh(g, material);
    m.name = name;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const node = (name, parent, [x, y, z] = [0, 0, 0]) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const car = new THREE.Group();
  const body = node("body", car);
  const front = length / 2;
  // The body around its wheels: a middle inside the wheels' inner faces,
  // sills between them, overhangs beyond them, an arch 4.5 cm over each
  // tyre (what the drop is clamped by), the engine bay's floor, the cabin.
  const inner = track - 0.14;
  box("body_middle", body, paint, [inner * 2, 0.56, length - 1.8], [0, 0.46, -0.85]);
  box("bay_pan", body, bay, [inner * 2, 0.3, 1.7], [0, 0.33, front - 0.85]);
  box("bumper_front", body, paint, [inner * 2, 0.3, 0.15], [0, 0.55, front - 0.08]);
  for (const s of [-1, 1]) {
    box("sill", body, paint, [half - inner, 0.56, 2 * (zf - r - 0.06)], [s * (inner + half) / 2, 0.46, 0]);
    box("overhang_front", body, paint, [half - inner, 0.56, front - zf - r - 0.06], [s * (inner + half) / 2, 0.46, (front + zf + r + 0.06) / 2]);
    box("overhang_rear", body, paint, [half - inner, 0.56, front - zf - r - 0.06], [s * (inner + half) / 2, 0.46, -(front + zf + r + 0.06) / 2]);
    for (const z of [zf, -zf]) box("arch", body, paint, [half - inner, 0.8 - (2 * r + 0.045), 2 * r + 0.12], [s * (inner + half) / 2, (0.8 + 2 * r + 0.045) / 2, z]);
    yield;
  }
  // The bay is open above the middle, in front of the windscreen.
  box("cabin", body, glass, [half * 2 - 0.34, height - 0.78, length * 0.42], [0, (height + 0.74) / 2, -length * 0.08]);
  box("roof", body, paint, [half * 2 - 0.5, 0.04, length * 0.3], [0, height - 0.02, -length * 0.1]);
  box("RS_honeycomb_grille", body, black, [0.9, 0.3, 0.04], [0, 0.5, front + 0.005]);
  box("headlights", body, white, [half * 2 - 0.2, 0.08, 0.05], [0, 0.72, front - 0.03]);
  box("taillights", body, red, [half * 2 - 0.1, 0.1, 0.05], [0, 0.85, -front + 0.02]);
  const tips = node("exhaust_tips", body, [0, 0.3, -front - 0.01]);
  for (const x of [-0.62, -0.46, 0.46, 0.62]) box("exhaust_tip", tips, silver, [0.12, 0.07, 0.06], [x, 0, 0]);
  for (const [s, side] of [[1, "left"], [-1, "right"]]) {
    const mirror = node(`mirror_${side}`, body, [s * (half + 0.05), 1.0, 0.75]);
    box(`mirror_cap_${side}`, mirror, silver, [0.14, 0.11, 0.18], [s * 0.05, 0, 0]);
  }
  box("head_unit_screen", body, black, [0.2, 0.12, 0.02], [0, 1.0, 0.35]);
  const engine = node("engine_bay", body, [0, 0.47, front - 0.95]);
  box("turbo_compressor_housing", engine, silver, [0.18, 0.16, 0.18], [0.2, 0.2, 0.1]);
  box("turbo_heat_wrap", engine, bay, [0.16, 0.14, 0.24], [-0.2, 0.2, 0.1]);
  box("charge_pipe_silicone", engine, black, [0.6, 0.08, 0.08], [0, 0.16, 0.45]);
  box("front_cast_box", engine, silver, [0.7, 0.18, 0.4], [0, 0.1, -0.15]);
  box("coolant_expansion_tank", engine, white, [0.16, 0.14, 0.22], [-0.55, 0.12, -0.45]);
  yield;
  // The hood on a hinge at its back edge, two struts from the fenders.
  const hinge = node("hood_hinge", body, [0, 0.83, front - 1.72]);
  box("opening_hood", hinge, paint, [half * 2 - 0.1, 0.04, 1.62], [0, 0.02, 0.81]);
  for (const [s, suffix] of [[1, ""], [-1, "_r"]]) {
    node(`hood_strut_base${suffix}`, body, [s * 0.72, 0.66, front - 1.55]);
    node(`hood_strut_mount${suffix}`, hinge, [s * 0.72, -0.01, 0.35]);
    for (const part of ["tube", "rod"]) {
      const holder = node(`hood_strut_${part}${suffix}`, body);
      const g = new THREE.CylinderGeometry(part === "tube" ? 0.012 : 0.006, part === "tube" ? 0.012 : 0.006, 1, 8).translate(0, 0.5, 0);
      owned.geometries.push(g);
      holder.add(new THREE.Mesh(g, part === "tube" ? black : silver));
    }
    yield;
  }
  // The anchors, inside the body.
  node("mod_ie_ecu_tune", engine, [0.5, 0.18, 0.35]);
  node("mod_ie_tcu_tune", engine, [-0.4, 0.14, -0.2]);
  node("mod_virtual_link", body, [half + 0.02, 2 * r + 0.16, zf]);
  node("mod_rsnav_head_unit", body, [0, 1.0, 0.35]);
  node("mod_rs_grille", body, [0, 0.5, front + 0.03]);
  // Wheels: steering pivots in front, axles behind, each wheel spinning on X.
  const tyre = new THREE.CylinderGeometry(r, r, 0.255, 32).rotateZ(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.26, 20).rotateZ(Math.PI / 2);
  owned.geometries.push(tyre, rim);
  for (const [name, holder, s, z] of [["fl", "steer_fl", 1, zf], ["fr", "steer_fr", -1, zf], ["rl", "axle_rl", 1, -zf], ["rr", "axle_rr", -1, -zf]]) {
    const pivot = node(holder, car, [s * track, r, z]);
    const wheel = node(`wheel_${name}`, pivot);
    wheel.add(new THREE.Mesh(tyre, rubber), new THREE.Mesh(rim, silver));
    yield;
  }
  // A small bitmap keeps the development warning readable without a cold
  // browser font rasterization blocking an otherwise sliced creation job.
  const glyphs = {
    S: [31,16,16,31,1,1,31], "6": [15,16,16,30,17,17,14],
    P: [30,17,17,30,16,16,16], L: [16,16,16,16,16,16,31],
    A: [14,17,17,31,17,17,17], C: [15,16,16,16,16,16,15],
    E: [31,16,16,30,16,16,31], H: [17,17,17,31,17,17,17],
    O: [14,17,17,17,17,17,14], D: [30,17,17,17,17,17,30],
    R: [30,17,17,30,20,18,17], V: [17,17,17,17,17,10,4],
    "(": [6,8,16,16,16,8,6], ")": [12,2,1,1,1,2,12],
  };
  const pixels = new Uint8Array(128 * 16 * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([255, 212, 0, 255], i);
  [..."S6 PLACEHOLDER (DEV)"].forEach((letter, i) => {
    glyphs[letter]?.forEach((row, y) => {
      for (let x = 0; x < 5; x++) if (row & (1 << (4 - x))) pixels.set([0, 0, 0, 255], ((11 - y) * 128 + 5 + i * 6 + x) * 4);
    });
  });
  const label = new THREE.DataTexture(pixels, 128, 16);
  label.needsUpdate = true;
  label.colorSpace = THREE.SRGBColorSpace;
  owned.textures.push(label);
  const labelMat = new THREE.MeshBasicMaterial({ map: label, side: THREE.DoubleSide });
  owned.materials.push(labelMat);
  const sign = (parent, w, [x, y, z], [rx, ry]) => {
    const g = new THREE.PlaneGeometry(w, w / 8);
    owned.geometries.push(g);
    const m = new THREE.Mesh(g, labelMat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0, "YXZ");
    m.name = "placeholder_label";
    parent.add(m);
  };
  sign(body, 1.6, [half + 0.006, 0.5, -0.2], [0, Math.PI / 2]);
  sign(body, 1.6, [-half - 0.006, 0.5, -0.2], [0, -Math.PI / 2]);
  sign(hinge, 1.4, [0, 0.045, 0.85], [-Math.PI / 2, 0]);
  sign(body, 1.4, [0, 0.76, -front + 0.4], [-Math.PI / 2, Math.PI]);

  car.name = spec.name;
  const parts = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr", "steer_fl", "steer_fr", "body", "headlights", "taillights", "hood_hinge"];
  car.userData.parts = Object.fromEntries(parts.map((n) => [n, car.getObjectByName(n)]));
  car.userData.wheelRadius = spec.wheelRadius;
  car.userData.wheelbase = spec.wheelbase;
  car.userData.forwardAxis = "+Z";
  car.userData.placeholder = true;
  // The hood and its struts as object.js sets them.
  const struts = ["", "_r"].map((sfx) => ["base", "mount", "tube", "rod"].map((p) => car.getObjectByName(`hood_strut_${p}${sfx}`)));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  car.userData.setHoodProgress = (progress) => {
    hinge.rotation.x = -1.1 * Math.max(0, Math.min(1, progress));
    car.updateMatrixWorld(true);
    for (const [base, mount, tube, rod] of struts) {
      body.worldToLocal(base.getWorldPosition(a));
      body.worldToLocal(mount.getWorldPosition(b));
      dir.subVectors(b, a);
      const len = dir.length();
      dir.normalize();
      tube.position.copy(a);
      tube.quaternion.setFromUnitVectors(up, dir);
      tube.scale.set(1, len * 0.58, 1);
      rod.position.copy(a).addScaledVector(dir, len * 0.45);
      rod.quaternion.copy(tube.quaternion);
      rod.scale.set(1, len * 0.55, 1);
    }
  };
  car.userData.setHoodProgress(0);
  car.userData.setLowering = (metres) => {
    body.position.y = -metres;
  };
  car.userData.dispose = dispose;
  return car;
}

// B5 supplies its existing road controller as ctx.road. ctx.shared remains
// the city's uniform set; it is not a second car controller. All preparation
// stays in B5's idle readiness job and may be cancelled by dispose().
export function createGarageCars(ctx) {
  let sliceStart = performance.now();
  let sliceKind = null;
  let measuring = true;
  const callerSlices = [];
  const { scene, renderer, road = ctx.shared?.car, anchors, tier = "high", reduced = false, between = () => Promise.resolve(), placeholder = import.meta.env.DEV } = ctx;
  if (!road?.setInspection) throw new TypeError("createGarageCars requires ctx.road, the existing S4 controller.");
  const lighting = road.lighting;
  lighting.setFixtures(ctx.fixtures ?? fixturesFrom(anchors));
  const made = {};
  const resources = new Set();
  const hood = { s4: 0, s6: 0 };
  const asked = { s4: 0, s6: 0 };
  const stats = { tier, provisionalLighting: true, callerSlices };
  let attached = false;
  let disposed = false;
  let lowering = 0;
  let drop = 0;
  let contact = null;
  let contactRoot = null;
  let closing = 1;
  let departure = { active: false, cameraClear: true, liftDown: true };
  let externalHold = null;
  let selection = null;
  let driving = false;
  const abort = new AbortController();
  const flashes = new Map();
  const check = () => { if (disposed) throw Object.assign(new Error("Garage preparation was disposed."), { code: "garage-disposed" }); };
  // Include creation and the complete continuation around preparation, not
  // just the helper's inner loops. Loader and worker waits are excluded.
  const resume = () => { sliceStart = performance.now(); };
  const slice = async () => {
    if (measuring) callerSlices.push({ kind: sliceKind, ms: performance.now() - sliceStart });
    await between();
    resume();
    check();
  };
  const instantiate = async (kind) => {
    sliceKind = kind;
    await slice();
    let root;
    if (kind === "s6" && cars.s6.unavailable) {
      stats.s6CreationSliced = true;
      const steps = placeholderS6Steps();
      try {
        let step;
        do { step = steps.next(); if (!step.done) await slice(); } while (!step.done);
        root = step.value;
      } finally { steps.return(); }
    } else {
      // A1's optional sliced handoff preserves all synchronous loader callers.
      // Older loaders still work; creationSliced reports that scheduling limit.
      const instance = createObject(kind, { between: slice, signal: abort.signal });
      stats[`${kind}CreationSliced`] = Boolean(instance?.then);
      root = await instance;
    }
    // Track before the cancellation point so a returned root cannot leak.
    const r = track(root);
    await slice();
    return r;
  };
  const clamp = (v) => THREE.MathUtils.clamp(Number.isFinite(v) ? v : 0, 0, 1);
  const bytesOf = (url) => {
    const e = url && performance.getEntriesByType("resource").find((r) => r.name.includes(url.split("?")[0]));
    return e ? { transfer: e.transferSize, decoded: e.decodedBodySize } : null;
  };
  const track = (root) => {
    const r = { root, geometries: new Set(), materials: new Set(), textures: new Set(), cleaned: false };
    resources.add(r);
    return r;
  };
  const collect = (r) => r.root.traverse((o) => {
    if (!o.isMesh) return;
    r.geometries.add(o.geometry);
    for (const m of [].concat(o.material)) {
      r.materials.add(m);
      for (const v of Object.values(m)) if (v?.isTexture) r.textures.add(v);
    }
  });
  // The loader owns the original clones, including removed meshes. Only
  // resources made by slim/float/lens preparation are disposed here.
  const clean = (r) => {
    if (r.cleaned) return;
    r.cleaned = true;
    r.root.removeFromParent();
    for (const g of r.geometries) if (!r.originalGeometries?.has(g)) g.dispose();
    for (const m of r.materials) if (!r.originalMaterials?.has(m)) m.dispose();
    r.root.userData.dispose();
  };
  const prepare = async (kind, r, specs) => {
    const t0 = performance.now();
    const mainSlices = [];
    const root = r.root;
    collect(r);
    r.originalGeometries = new Set(r.geometries);
    r.originalMaterials = new Set(r.materials);
    root.visible = true;
    const geometries = new Set();
    root.traverse((o) => { if (o.isMesh) geometries.add(o.geometry); });
    const fileTriangles = [...geometries].reduce((n, g) => n + (g.index?.count ?? g.attributes.position.count) / 3, 0);
    mainSlices.push(performance.now() - t0);
    const pins = [];
    for (const [modId, anchor] of Object.entries(specs)) {
      const start = performance.now();
      pins.push({ key: `${kind}:${modId}`, carId: kind, modId, ...resolveAnchor(root, anchor), twin: cornerTwin(root, anchor), needsHoodOpen: Boolean(anchor.inBay), hood: () => hood[kind] });
      mainSlices.push(performance.now() - start);
      await slice();
    }
    const phone = tier === "phone";
    const prepared = await prepareInspection(root, { cacheKey: `${kind}:${cars[kind].url ?? "development-v1"}`, tier, target: (phone ? PHONE_TRIANGLES : HIGH_TRIANGLES)[kind], between: slice, resume, signal: abort.signal, workerFactory: () => new Worker(new URL("../three/car/inspect.js", import.meta.url), { type: "module" }) });
    prepared.geometries.forEach((g) => r.geometries.add(g));
    prepared.materials.forEach((m) => r.materials.add(m));
    const { source, room, wallTriangles, geometry } = prepared;
    const shut = new THREE.Box3(new THREE.Vector3(...prepared.shut[0]), new THREE.Vector3(...prepared.shut[1]));
    const conversionStart = performance.now();
    oneProgram(root).forEach((g) => r.geometries.add(g));
    mainSlices.push(performance.now() - conversionStart, ...prepared.mainSlices);
    // Keep the source lens geometry here. The road helper duplicates its
    // back faces to save a draw, which would exceed the inspection budget.
    await slice();
    check();
    if (kind === "s6") scopeCarLighting(root, { value: 1 });
    root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    collect(r);
    root.visible = false;
    stats[kind] = { placeholder: Boolean(root.userData.placeholder), sourceBytes: bytesOf(cars[kind].url), sourceTriangles: source, uniqueSourceTriangles: fileTriangles, preparedTriangles: trianglesVisible(root), prepareMs: Math.round(performance.now() - t0), workerMs: prepared.workerMs, mainSlices, cached: prepared.cached, finiteValues: prepared.finiteValues, geometry, phone: phone ? { ...geometry, cellWalls: wallTriangles } : null, fallbackAnchors: pins.filter((p) => p.fallback).map((p) => p.modId), lowering: room };
    if (!geometry.met) throw Object.assign(new Error(`${kind.toUpperCase()} inspection geometry exceeds the ${tier} budget: ${geometry.after} triangles.`), { code: "car-geometry-budget", kind });
    return { ...r, pins, shut, shapes: shapesOf(shut), room };
  };
  const bind = (probe) => {
    road.setProbe(probe, PROBE_GAIN);
    for (const [kind, m] of Object.entries(made)) {
      const look = GARAGE_LIGHT_LOOK.cars[kind];
      // A material shared with anything outside the bay keeps the paint's gain.
      const engine = new Set(), outside = new Set();
      m.root.traverse((o) => {
        if (o.isMesh) for (const material of [].concat(o.material)) if (material.isMeshStandardMaterial) (UNDER_HOOD.test(material.name) || underHood(o, m.root) ? engine : outside).add(material);
      });
      for (const material of [...engine, ...outside]) {
        material.envMap = probe;
        material.envMapIntensity = look.probeGain * (engine.has(material) && !outside.has(material) ? GARAGE_LIGHT_LOOK.engineProbe : 1);
        // The merged paint carries the engine's plain parts too (slim.js).
        if (material.userData.matte) material.userData.matte.value = GARAGE_LIGHT_LOOK.engineProbe;
        if (material.userData.envSat) material.userData.envSat.value = look.envSaturation;
      }
    }
  };
  const setHoods = () => {
    for (const kind of ["s4", "s6"]) {
      const p = kind === "s4" ? Math.min(asked.s4, closing) : asked.s6;
      if (!made[kind] || hood[kind] === p) continue;
      hood[kind] = p;
      made[kind].root.userData.setHoodProgress(p);
    }
  };
  let probeSource = ctx.probeTarget;
  const captureProbe = (source = probeSource) => {
    check();
    const visibility = road.car.visible;
    const shown = Object.values(made).map((m) => [m.root, m.root.visible]);
    road.car.visible = false;
    for (const [root] of shown) root.visible = false;
    try { bind(lighting.capture(source)); probeSource = source; }
    finally { road.car.visible = visibility; for (const [root, visible] of shown) root.visible = visible; }
    stats.lighting = lighting.stats;
  };
  const ready = (async () => {
    await slice();
    await preloadCar("s4");
    resume();
    check();
    if (cars.s6.unavailable) {
      if (!placeholder) throw Object.assign(new Error(cars.s6.unavailable), { code: "car-unavailable", kind: "s6" });
    } else {
      await preloadCar("s6");
      resume();
      check();
    }
    const s6 = await instantiate("s6");
    const s4 = await instantiate("s4");
    sliceKind = "s4";
    made.s4 = await prepare("s4", s4, Object.fromEntries(S4_MODS.map((m) => [m.id, m.anchor])));
    sliceKind = "s6";
    made.s6 = await prepare("s6", s6, S6_ANCHORS);
    check();
    drop = Math.min(MAX_DROP, made.s6.room.limit);
    const bay = anchors?.get("anchor_garage_s6");
    s6.root.position.copy(bay ? bay.position : new THREE.Vector3(...S6_BAY.position));
    s6.root.quaternion.copy(bay?.quaternion ?? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), S6_BAY.yaw));
    scene.add(s6.root);
    contact = createContactShadow(scene, s6.root);
    contactRoot = scene.children.at(-1);
    contactRoot.scale.set(cars.s6.size[0] / cars.s4.size[0], 1, cars.s6.wheelbase / cars.s4.wheelbase);
    contactRoot.visible = false;
    contact.update();
    road.setInspection(made.s4.root, false);
    setHoods();
    made.s6.root.userData.setLowering(lowering * drop);
    await slice();
    measuring = false;
    captureProbe();
    if (renderer.compileAsync && ctx.camera) {
      for (const m of Object.values(made)) {
        m.root.visible = true;
        try { await renderer.compileAsync(m.root, ctx.camera, scene); }
        finally { m.root.visible = false; }
        check();
      }
    }
    road.setHold(({ cut } = {}) => {
      if (cut) { closing = 0; setHoods(); }
      return hood.s4 > 0.001 || (departure.active && (!departure.cameraClear || !departure.liftDown)) || Boolean(externalHold?.());
    });
    if (attached) api.attach();
  })().catch((error) => {
    for (const r of resources) clean(r);
    contact?.dispose();
    contact = null;
    throw error;
  });
  ready.catch(() => {});
  const objectOf = (kind) => kind === "s4" ? road.car : made.s6?.root;
  const localBox = (kind) => {
    const root = made[kind].root;
    const visible = root.visible;
    root.visible = true;
    const box = localBounds(root);
    root.visible = visible;
    return box;
  };
  const _inverse = new THREE.Matrix4(), _ray = new THREE.Ray(), _hit = new THREE.Vector3();
  const api = {
    ready,
    get stats() { return stats; },
    get drop() { return { metres: drop, room: made.s6?.room ?? null }; },
    get hood() { return { ...hood }; },
    get lowering() { return lowering; },
    get selection() { return selection; },
    get departure() { return { ...departure, ready: hood.s4 <= 0.001 && departure.cameraClear && departure.liftDown && !externalHold?.() }; },
    attach() {
      if (disposed) return;
      attached = true;
      if (!made.s6) return;
      made.s6.root.visible = true;
      contactRoot.visible = true;
      road.setInspection(made.s4.root, !driving && road.mode !== "free" && road.atBay);
    },
    detach() {
      attached = false;
      if (!made.s6) return;
      made.s6.root.visible = false;
      if (contactRoot) contactRoot.visible = false;
      road.setInspection(made.s4.root, false);
    },
    setHood(carId, p) {
      if (disposed) return;
      if (carId !== "s4" && carId !== "s6") throw new TypeError(`Unknown garage car: ${carId}`);
      asked[carId] = clamp(p);
      setHoods();
    },
    setLowering(f) {
      if (disposed) return;
      lowering = clamp(f);
      made.s6?.root.userData.setLowering(lowering * drop);
    },
    setInside(k) { road.setInside(k); },
    // B6 keeps the parked S6 attached while parts.car.free drives the one
    // S4. This explicit switch also closes the hood before the first free
    // move; checking road.mode alone would be one frame late on handoff.
    setDriving(on) {
      if (disposed) return;
      driving = Boolean(on);
      if (driving) { closing = 0; setHoods(); road.setInside(null); }
      if (made.s4) road.setInspection(made.s4.root, attached && !driving && road.mode !== "free" && road.atBay);
    },
    // Apply recording/seek state synchronously BEFORE B5/B6 collision
    // queries. Continuous state updates preserve physical departure gates.
    // A deliberate seek can explicitly cancel the previous owner's exit.
    applyState(state = {}, { seek = false } = {}) {
      if (disposed) return;
      if (seek) api.setDeparture({ active: false, cameraClear: true, liftDown: true });
      api.setDriving(state.driving ?? false);
      closing = driving || road.mode === "free" ? 0 : departure.active ? closing : 1;
      for (const carId of ["s4", "s6"]) if (state.hood?.[carId] != null) asked[carId] = clamp(state.hood[carId]);
      setHoods();
      if (state.lowering != null) api.setLowering(state.lowering);
      for (const m of Object.values(made)) m.root.updateWorldMatrix(true, true);
    },
    select(value) {
      if (value && !(value.carId === "s4" ? S4_MODS.some((m) => m.id === value.modId) : value.carId === "s6" && Object.hasOwn(S6_ANCHORS, value.modId))) throw new TypeError("Unknown garage part.");
      selection = value ? { carId: value.carId, modId: value.modId } : null;
      return selection;
    },
    // B5 owns the camera and lift. Call before advancing an exit path,
    // wait for departure.ready, then allow the road goal to leave the bay.
    // A reversed/interrupted exit cancels this gate and restores its hood.
    setDeparture(state = {}) {
      if (state.active && !departure.active) departure = { active: true, cameraClear: false, liftDown: false };
      departure = { ...departure, ...state };
      if (!departure.active) { closing = driving || road.mode === "free" ? 0 : 1; setHoods(); }
    },
    holdS4(fn) { externalHold = fn; },
    update(dt = 0) {
      if (disposed || !made.s4) return;
      const leaving = departure.active || road.departing;
      closing = driving || road.mode === "free" ? 0 : leaving ? reduced ? 0 : Math.max(0, closing - Math.max(0, dt) / HOOD_SECONDS) : road.atBay ? 1 : 0;
      setHoods();
      road.setInspection(made.s4.root, attached && !driving && road.mode !== "free" && road.atBay);
      for (const [kind, flash] of flashes) {
        flash.time += Math.max(0, dt);
        const on = reduced ? flash.time < 0.6 ? 0.6 : 0 : flash.time < 0.16 || flash.time > 0.32 && flash.time < 0.48 ? 1 : 0;
        for (const [m, value] of flash.materials) m.emissiveIntensity = value + 2 * on;
        if (flash.time >= 0.7) { for (const [m, value] of flash.materials) m.emissiveIntensity = value; flashes.delete(kind); }
      }
    },
    bounds() {
      if (disposed) return [];
      return ["s4", "s6"].filter((k) => made[k]).map((carId) => {
        const object = objectOf(carId);
        object.updateWorldMatrix(true, true);
        const parts = made[carId].root.userData.parts;
        const wheels = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"].map((n) => {
          const center = parts[n].getWorldPosition(new THREE.Vector3());
          if (carId === "s4") { made.s4.root.worldToLocal(center); object.localToWorld(center); }
          return center.y - cars[carId].wheelRadius;
        });
        return { carId, box: localBox(carId).applyMatrix4(object.matrixWorld), matrixWorld: object.matrixWorld.clone(), hoodOpen: hood[carId] > 0.001, wheelFloor: Math.min(...wheels), liftDown: wheels.every((y) => Math.abs(y) <= 0.02) };
      });
    },
    anchors() { return disposed ? [] : ["s4", "s6"].flatMap((k) => made[k]?.pins ?? []); },
    occluders() {
      if (disposed) return [];
      return ["s4", "s6"].filter((k) => made[k] && (k === "s4" ? made.s4.root.visible : made[k].root.visible)).flatMap((k) => made[k].shapes.map((box, i) => ({ kind: i === 0 ? "lower" : "cabin", box: box.clone().translate(new THREE.Vector3(0, k === "s6" ? -lowering * drop : 0, 0)), object: objectOf(k), carId: k })));
    },
    pick(raycaster) {
      if (disposed) return null;
      let best = null, nearest = Infinity;
      for (const carId of ["s4", "s6"]) {
        const object = objectOf(carId);
        if (!made[carId] || !object.visible) continue;
        object.updateWorldMatrix(true, true);
        _ray.copy(raycaster.ray).applyMatrix4(_inverse.copy(object.matrixWorld).invert());
        if (!_ray.intersectBox(localBox(carId), _hit)) continue;
        const representation = carId === "s4" && made.s4.root.visible ? made.s4.root : object;
        for (const hit of raycaster.intersectObject(representation, true)) {
          let visible = true;
          for (let p = hit.object; p; p = p.parent) if (!p.visible) { visible = false; break; }
          if (!visible || ![].concat(hit.object.material).some((m) => m.isMeshStandardMaterial) || hit.distance >= nearest) continue;
          nearest = hit.distance;
          best = { carId, point: hit.point.clone() };
          break;
        }
      }
      return best;
    },
    flash(carId) {
      const root = carId === "s4" ? road.car : made[carId]?.root;
      if (disposed || !root?.visible) return null;
      if (carId === "s4") road.flash();
      if (!flashes.has(carId)) {
        const materials = new Map();
        root.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.emissive?.getHex() > 0) materials.set(m, m.emissiveIntensity); });
        flashes.set(carId, { time: 0, materials });
      } else flashes.get(carId).time = 0;
      return root.getWorldPosition(new THREE.Vector3());
    },
    captureProbe,
    restore() { if (made.s4 && !disposed) captureProbe(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      attached = false;
      road.setHold(null);
      road.setInspection(null);
      road.setProbe(null);
      for (const flash of flashes.values()) for (const [m, value] of flash.materials) m.emissiveIntensity = value;
      flashes.clear();
      for (const r of resources) r.root.removeFromParent();
      // Async work checks disposal between slices; clean after its final
      // slice so no late resource can escape or be used after disposal.
      ready.then(() => { for (const r of resources) clean(r); }, () => {});
      contact?.dispose();
      contact = null;
    },
  };
  // The initial async slot yields before the API object below is returned.
  // Include that remaining synchronous setup in the first caller sample.
  callerSlices[0].ms = performance.now() - sliceStart;
  return api;
}

function trianglesVisible(root) {
  const visible = root.visible;
  root.visible = true;
  const count = triangles(root);
  root.visible = visible;
  return count;
}

export default createGarageCars;
