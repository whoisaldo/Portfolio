// src/world/traffic.js: the city moving on its own.
//
// Aerial vehicles on slow loops over the avenue's canyon and the districts,
// and cars on every street of the network, both ways, in platoons that queue
// at the lights with their brake lamps lit and move off
// (src/world/traffic-net.js has the routes and the timetable), their lamps
// in the wet road's mirror. Many more stand: every kerb is parked most of
// the way along (src/world/traffic-park.js), in the bays where a street has
// them and in the kerb lane where it has none, so no stretch of road is
// bare; taxis wait at the lobbies on the x 120 road, a patrol car stands by
// junction F with its bar lit, one car on the garage street has its hazards
// blinking. The cars are six original designs (src/world/traffic-cars.js,
// traffic-cars-nc.js), dealt in turn along a lane or a row so no two
// neighbours are the same model or paint; each kind is two instanced draws
// of the ones in view, its own model close by and a coarser one past forty
// metres (src/world/traffic-lod.js), and every lamp is one instanced sprite
// batch. The `traffic` switch in env.js parks all of it.
//
// Under them, delivery drones hop roof to roof over the avenue's canyon, the
// garage street's blocks and corpo row's south side, lit as aircraft are;
// and one AV is the police, slow over corpo row's south side with its light
// bar going, red and blue, where the rooftop looks.
//
// Nothing here pretends to be data: no routes, no counts, no telemetry.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON } from "./glsl.js";
import { createObject as createAv } from "./av-model.js";
import { createObject as createBaseCar, KINDS as BASE_KINDS } from "./traffic-cars.js";
import { createObject as createShowCar, KINDS as SHOW_KINDS } from "./traffic-cars-nc.js";
import { createNetwork } from "./traffic-net.js";
import { createStanding, wardrobe, KINDS as CAR_KINDS, TAG } from "./traffic-park.js";
import { creased, coarse, drum, joined } from "./traffic-lod.js";
import { createCraft, craftAt, padAt, PAD_STANDING } from "./traffic-sky.js";

const createCarModel = (kind) => (BASE_KINDS.includes(kind) ? createBaseCar(kind) : SHOW_KINDS.includes(kind) ? createShowCar(kind) : null);

// The AV's surfaces, by the model's material names (src/world/av-model.js),
// as the kind its shader reads.
const AV_KINDS = { hull: 0, trim: 1, glass: 2, lamp_head: 3, lamp_tail: 4, glow_thruster: 5, glow_accent: 6 };

/** The AV as one geometry: every mesh baked into the model's frame, only
 *  position and normal kept, and each vertex tagged with what it is. */
function avGeometry() {
  const model = createAv();
  model.updateMatrixWorld(true);
  const parts = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    const kind = AV_KINDS[o.material?.name];
    if (kind === undefined) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(kind), 1));
    parts.push(g);
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.dispose?.();
  });
  return merged;
}

/** A delivery drone, 1.2 m across, front +z, sitting on y = 0: a flat body
 *  under a dark canopy, a cross of arms out to four ducted rotors (their
 *  blur a dark disc in each duct), four short legs, a parcel slung under it,
 *  and a lit ring round the body. Tagged with the AV's surface kinds, so it
 *  draws with the AV's own shader. */
function droneGeometry() {
  const parts = [];
  const add = (g, kind, x = 0, y = 0, z = 0, yaw = 0) => {
    g = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    g.rotateY(yaw);
    g.translate(x, y, z);
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(kind), 1));
    parts.push(g);
  };
  const BODY = 0.46;
  add(new THREE.BoxGeometry(0.6, 0.15, 0.44), AV_KINDS.hull, 0, BODY, 0);
  add(new THREE.BoxGeometry(0.34, 0.07, 0.26), AV_KINDS.glass, 0, BODY + 0.1, -0.02);
  add(new THREE.BoxGeometry(0.62, 0.025, 0.46), AV_KINDS.glow_thruster, 0, BODY - 0.02, 0);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(1.24, 0.04, 0.06), AV_KINDS.trim, 0, BODY + 0.02, 0, s * Math.PI / 4);
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const x = sx * 0.44;
    const z = sz * 0.44;
    add(new THREE.CylinderGeometry(0.23, 0.23, 0.07, 14), AV_KINDS.trim, x, BODY + 0.05, z);
    add(new THREE.CircleGeometry(0.2, 14).rotateX(-Math.PI / 2), AV_KINDS.glass, x, BODY + 0.09, z);
    add(new THREE.BoxGeometry(0.03, 0.4, 0.03), AV_KINDS.trim, sx * 0.24, BODY - 0.24, sz * 0.2);
  }
  add(new THREE.BoxGeometry(0.3, 0.22, 0.3), AV_KINDS.trim, 0, BODY - 0.22, 0);
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

/** The viaduct's train, x along it (centred), y up from the rail, z across:
 *  `cars` cars with a gap between each and rubber bellows across it, each
 *  car a rounded roof over straight sides on two bogies, and the two end
 *  cars drawn out into a sloped nose. Smooth round the section, hard at the
 *  ends. */
function trainGeometry({ length, cars }) {
  const carLen = length / cars;
  const GAP = 0.9;
  // Half the section (z >= 0), from the sill up the side, round the roof's
  // shoulder to the middle of the roof.
  const HALF = [[1.42, 0.55], [1.5, 0.95], [1.52, 2.75], [1.44, 3.12], [1.24, 3.4], [0.9, 3.56], [0, 3.62]];
  const RING = [...HALF, ...HALF.slice(0, -1).reverse().map(([z, y]) => [-z, y])];
  // The nose: how the section narrows, lowers and lifts over the last
  // metres of an end car (metres from the end, across, up, lift).
  const NOSE = [[3.6, 1, 1, 0], [2.0, 0.97, 0.93, 0], [0.9, 0.86, 0.76, 0.08], [0, 0.66, 0.52, 0.22]];
  const parts = [];
  const tube = (sections) => {
    // sections: [x, across, up, lift]; consecutive rings joined by quads.
    const n = RING.length;
    const pos = [];
    for (const [x, sz, sy, lift] of sections) for (const [z, y] of RING) pos.push(x, 0.55 + lift + (y - 0.55) * sy, z * sz);
    const index = [];
    // Sections run along +x; each quad wound to face out.
    for (let r = 0; r < sections.length - 1; r++) {
      for (let i = 0; i < n - 1; i++) {
        const a = r * n + i;
        const b = a + n;
        index.push(a, b, a + 1, a + 1, b, b + 1);
      }
      // The floor, from the last ring point back to the first.
      const a = r * n + n - 1;
      const b = r * n;
      index.push(a, a + n, b, b, a + n, b + n);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    parts.push(g.toNonIndexed());
    g.dispose();
  };
  const cap = (section, out) => {
    // A flat end: a fan from the section's middle, facing `out` along x.
    const [x, sz, sy, lift] = section;
    const pts = RING.map(([z, y]) => [x, 0.55 + lift + (y - 0.55) * sy, z * sz]);
    const c = [x, 0.55 + lift + 1.5 * sy, 0];
    const pos = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (out > 0) pos.push(...c, ...b, ...a);
      else pos.push(...c, ...a, ...b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    parts.push(g);
  };
  const box = (x, y, z, sx, sy, sz) => {
    const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
    g.deleteAttribute("uv");
    g.translate(x, y, z);
    parts.push(g);
  };
  for (let c = 0; c < cars; c++) {
    const x0 = -length / 2 + c * carLen + (c > 0 ? GAP / 2 : 0);
    const x1 = -length / 2 + (c + 1) * carLen - (c < cars - 1 ? GAP / 2 : 0);
    const sections = [];
    if (c === 0) for (const [d, sz, sy, lift] of NOSE) sections.push([x0 + d, sz, sy, lift]);
    else sections.push([x0, 1, 1, 0]);
    if (c === cars - 1) for (const [d, sz, sy, lift] of [...NOSE].reverse()) sections.push([x1 - d, sz, sy, lift]);
    else sections.push([x1, 1, 1, 0]);
    // Sorted along +x, the way tube() winds them.
    sections.sort((a, b) => a[0] - b[0]);
    tube(sections);
    cap(sections[0], -1);
    cap(sections[sections.length - 1], 1);
    for (const f of [0.18, 0.82]) box(x0 + (x1 - x0) * f, 0.32, 0, 2.6, 0.5, 2.3);
    if (c < cars - 1) box(x1 + GAP / 2, 2.0, 0, GAP + 0.3, 2.7, 2.5);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

// The drones' rounds: roofs (x, z, the roof's height), each leg flown at its
// own height, clear by seven metres or more of anything under it (measured
// off the kit's roofs from above), and which rounds a phone keeps. The
// canyon's cross the avenue's sky over the hero's street, landing only where
// the hero's lens cannot see a drone at rest over the roofline; the garage
// street's land where the rooftop looks, one on the rooftop's own roof; corpo
// row's work its south side under the towers.
const DRONE_ROUTES = [
  { pads: [[-36, -312, 66], [29, -312, 64], [35, -264, 51], [-36, -264, 60]], cruise: [78.5, 72, 70, 74], phone: true },
  { pads: [[465, -286, 34], [405, -283, 30], [372, -313, 28], [435, -298, 35]], cruise: [45, 38, 45, 45], phone: true },
  { pads: [[159, -311, 22], [252, -299, 25], [303, -302, 34.5], [192, -311, 29]], cruise: [46, 43, 47.5, 39], phone: true },
  { pads: [[-36, -228, 57], [26, -204, 47], [-36, -192, 52], [38, -228, 58]], cruise: [65, 64.5, 66, 66], phone: true },
  { pads: [[417, -247, 26], [396, -241, 64.3], [420, -214, 26], [435, -307, 35]], cruise: [72.5, 72.5, 43, 43], phone: true },
  { pads: [[-27, -129, 44], [20, -132, 43.9], [-24, -279, 60], [17, -252, 58]], cruise: [52, 68, 68, 66] },
  { pads: [[456, -238, 22], [414, -202, 26], [426, -274, 30], [384, -313, 28]], cruise: [34, 38, 40.5, 40.5] },
  { pads: [[345, -299, 39], [270, -302, 27.5], [315, -311, 32]], cruise: [49, 42, 49] },
];
// How a drone flies a leg: metres a second up, along and down, and how long
// it sits on a roof.
const DRONE = { climb: 3, cruise: 8, descend: 2.5, rest: [4, 8] };
// The police AV's beat: slow, low over corpo row's south side, eighteen
// metres over its highest roof.
const POLICE = { c: [320, -285], r: [65, 40], y: 58, v: 14 };

// The cars' surfaces, by the model's material names (traffic-cars.js); and
// the two things a sedan may carry on its roof, which only the patrol car
// and the taxi show (the shader folds the other away).
const CAR_PARTS = { body: 0, trim: 1, glass: 2, lamp_head: 3, lamp_tail: 4, glow_accent: 5, tyre: 6, rim: 7 };
const ROOF_BAR = 8;
const ROOF_SIGN = 9;
// Past this far a car is drawn as its coarser self (src/world/traffic-lod.js).
const DETAIL_TO = 42;
// Where the first car on each of the deck's two paths starts, as a share of
// the gap to the next: chosen so that at second 12, where the review's
// renders hold the traffic, no car stands within eleven metres of the
// points its panoramas are taken from on the deck (a lens a metre off a
// car's flank shows nothing else).
const DECK_STARTS = [0.78, 0.5];

/** The part of a lamp surface that lies across the car's nose (or its tail):
 *  its vertices within 5 cm of its foremost (rearmost) point, so a marker
 *  strip on a roof or round a flank is left out of it. */
function lampFace(g, front, into) {
  const pos = g.attributes.position;
  const end = front ? g.boundingBox.max.z : g.boundingBox.min.z;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getZ(i) - end) < 0.05) into.expandByPoint(v.fromBufferAttribute(pos, i));
}

/** A box tagged as one surface, for the things a car carries. */
function tagged(w, h, d, x, y, z, kind) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.deleteAttribute("uv");
  g.translate(x, y, z);
  g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(kind), 1));
  return g;
}

/** A car of one kind as one geometry (as avGeometry builds the AV's), shaded
 *  smooth over its curved panels and hard at its creases; the same car from
 *  further off (its shell gathered onto a coarse grid, on four plain
 *  wheels); and where its lamps are: the outer ends of the light bars across
 *  its nose and its tail, in its own frame (front +z). */
function carGeometry(kind) {
  const model = createCarModel(kind);
  model.updateMatrixWorld(true);
  const parts = [];
  const shell = [];
  const fine = [];
  const wheels = [];
  const head = new THREE.Box3();
  const tail = new THREE.Box3();
  model.traverse((o) => {
    if (!o.isMesh) return;
    const k = CAR_PARTS[o.material?.name];
    if (k === undefined) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(k), 1));
    g.computeBoundingBox();
    if (k === 3) lampFace(g, true, head);
    if (k === 4) lampFace(g, false, tail);
    parts.push(g);
    // From further off: the shell is gathered up; the thin lit strips are
    // kept as they are (a grid would close them up); a wheel is a drum.
    const wheel = /^wheel_/.test(o.name) || /^wheel_/.test(o.parent?.name ?? "");
    if (wheel && k === 6) wheels.push(g.boundingBox);
    else if (!wheel) (k >= 3 && k <= 5 ? fine : shell).push(g);
  });
  // A sedan's roof units: a patrol car's light bar on a dark foot, and a
  // taxi's lit sign.
  if (kind === "sedan") {
    const roof = new THREE.Box3();
    for (const g of parts) roof.union(g.boundingBox);
    const y = roof.max.y - 0.01;
    const units = [tagged(1.18, 0.05, 0.34, 0, y + 0.025, -0.25, ROOF_BAR), tagged(1.1, 0.09, 0.26, 0, y + 0.095, -0.25, ROOF_BAR), tagged(0.62, 0.17, 0.2, 0, y + 0.085, -0.2, ROOF_SIGN)];
    parts.push(...units);
    fine.push(...units);
  }
  const far = joined([coarse(joined(shell.map((g) => g.clone())), 0.2), ...fine.map((g) => creased(g.clone())), ...wheels.map((w) => drum((w.min.x + w.max.x) / 2, (w.min.z + w.max.z) / 2, w.max.y / 2, w.max.x - w.min.x, 6))]);
  const geometry = creased(joined(parts));
  model.traverse((o) => o.isMesh && o.geometry.dispose());
  geometry.computeBoundingBox();
  return {
    geometry,
    far,
    box: geometry.boundingBox,
    head: [head.max.x * 0.82, (head.min.y + head.max.y) / 2, head.max.z],
    tail: [tail.max.x * 0.82, (tail.min.y + tail.max.y) / 2, tail.min.z],
    // For the shader: each bar's half width and its height off the road.
    bars: new THREE.Vector4(head.max.x, (head.min.y + head.max.y) / 2, tail.max.x, (tail.min.y + tail.max.y) / 2),
  };
}

// What the cars' shader has to be told of each kind, in the car's own frame
// (metres, front +z): where its doors are cut (the front door's front edge,
// the last door's back edge; 99 where the model cuts them itself) between
// which heights (the sill's top, the waist); where a handle sits (the back
// edge of each door); how high its plates are (nose, tail) and their half
// width; and its wheels (half the wheelbase, the tyre's radius).
const DETAIL = {
  hatch: { seam: [0.86, -0.86, 0.26, 0.88], door: [-0.3, -0.86], plate: [0.26, 0.56, 0.24], wheel: [1.225, 0.31] },
  sedan: { seam: [1.05, -1.08, 0.25, 0.78], door: [-0.45, -1.08], plate: [0.26, 0.5, 0.26], wheel: [1.475, 0.34] },
  van: { seam: [1.8, 0.42, 0.3, 1.07], door: [0.42, 99], plate: [0.33, 0.33, 0.26], wheel: [1.625, 0.35] },
  wedge: { seam: [99, 99, 0.33, 0.75], door: [-0.34, 99], plate: [0.25, 0.54, 0.24], wheel: [1.35, 0.34] },
  pickup: { seam: [99, 99, 0.6, 1.19], door: [-0.077, -0.88], plate: [0.5, 0.5, 0.26], wheel: [1.775, 0.44] },
  micro: { seam: [99, 99, 0.37, 0.68], door: [-0.54, 99], plate: [0.5, 0.5, 0.2], wheel: [0.875, 0.25] },
};

// How far off a flying car is drawn as its own model, as its coarser self,
// and past that as its lamps alone.
const AV_DETAIL_TO = 70;
const AV_BODIES_TO = 700;
/** On for the first half of every second of `t`, off for the rest. */
const step = (t) => (t - Math.floor(t) < 0.5 ? 1 : 0);
/** A light bar's double flash: on twice, briefly, from `from` into `beat`. */
const twice = (beat, from) => ((beat > from && beat < from + 0.09) || (beat > from + 0.2 && beat < from + 0.29) ? 1 : 0);
const SIDES = [-1, 1];
// A car on the deck's paths fades in and out over this many metres at the
// path's ends (it was an eighth of the run: 70 m of the avenue at each end,
// where a car was a quarter drawn, its dark body gone into the dark road
// and its rims and lamps left over). The network's cars never fade: they
// are on closed routes.
const FADE = 6;
// How near the lens may come to a car's body before the car gives way. A
// car is drawn whole or not at all: from a metre off its body it is all
// there, any nearer (or from inside it) none of it is, with nothing in
// between, since a half-drawn shell across a frame is worse than a gap.
const NEAR = 1;

export function createTraffic(scene, shared, { avs = 10, cars = 4, drones = 0, police = false, reduced = false, reflectLayer = 2, rail = null, elevated = [], deckCars = 0 } = {}) {
  const avGeo = avGeometry();
  const full = cars >= 4;
  // The street's cars: wet paint giving back the lit street and the glow
  // over it, dark tinted glass, lit light bars on the ones that are driving,
  // their accents in their own neon, and a dithered fade (per car, aFade)
  // where the loop lets them in and out, so nothing pops at the kerb of the
  // intersection.
  // No lens ever looks out from inside one: the nearer the lens comes to a
  // car's body (its box, in its own frame), the more of it the dither takes,
  // from a metre off down to 0.3 m, and inside that it is not drawn at all.
  const carShader = {
    vertexShader: /* glsl */ `
      attribute float aKind;
      attribute vec4 aLook;
      attribute vec4 aState;
      uniform vec3 uCam;
      uniform vec3 uBoxMin;
      uniform vec3 uBoxMax;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vNormalL;
      varying float vKind;
      varying vec3 vBody;
      varying vec4 vLook;
      varying vec4 vState;
      varying vec3 vLocal;
      void main() {
        vState = aState;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vNormalL = normal;
        vKind = aKind;
        vLocal = position;
        #ifdef USE_INSTANCING_COLOR
        vBody = instanceColor;
        #else
        vBody = vec3(0.2);
        #endif
        vLook = aLook;
        vec3 lens = uCam - instanceMatrix[3].xyz;
        lens = vec3(dot(lens, instanceMatrix[0].xyz), dot(lens, instanceMatrix[1].xyz), dot(lens, instanceMatrix[2].xyz));
        bool shown = length(max(max(uBoxMin - lens, lens - uBoxMax), 0.0)) >= ${NEAR.toFixed(2)};
        // A roof unit only on the car that carries it: the bar on a patrol
        // car (tag 1), the sign on a taxi (tag 2).
        if (aKind > 7.5 && abs(aKind - 7.0 - aState.z) > 0.5) shown = false;
        gl_Position = shown ? projectionMatrix * viewMatrix * w : vec4(2.0, 2.0, 2.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uBoxMin;
      uniform vec3 uBoxMax;
      uniform vec4 uBars;
      uniform vec4 uSeam;
      uniform vec4 uDoor;
      uniform vec3 uPlate;
      uniform vec2 uWheel;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vNormalL;
      varying float vKind;
      varying vec3 vBody;
      varying vec4 vLook;
      varying vec4 vState;
      varying vec3 vLocal;
      void main() {
        float vFade = vState.x;
        float vBrake = vState.y;
        int tag = int(vState.z + 0.5);
        if (vFade < 0.999 && hash12(floor(gl_FragCoord.xy)) > vFade) discard;
        vec3 n = normalize(vNormalW);
        vec3 nl = normalize(vNormalL);
        vec3 V = normalize(vWorld - uCam);
        vec3 R = reflect(V, n);
        float ndv = abs(dot(V, n));
        float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
        // The street's light where the car stands, on the side this surface
        // faces, and on the side it looks back at: a car between a pink row
        // and a cyan one is pink down one flank and cyan down the other.
        vec3 spill = spillAt(vWorld);
        vec3 side = spillAt(vWorld + vec3(n.x, 0.0, n.z) * 4.0);
        vec3 toward = spillAt(vWorld + vec3(R.x, 0.0, R.z) * 9.0);
        // What paint and glass give back: the lit street under them, the
        // band of neon at the horizon, the haze over it and the dark above;
        // and the row of signs, a band a little over the horizon in that
        // side's own colour, broken as a row of signs is.
        float band = exp(-abs(R.y) * 12.0);
        vec3 below = uHazeColor * 0.35 + uGlowColor * 0.6 + spill * 0.8;
        vec3 above = uHazeColor * 0.3 * exp(-max(R.y, 0.0) * 4.0) + vec3(0.004, 0.004, 0.008);
        float signs = smoothstep(-0.04, 0.06, R.y) * (1.0 - smoothstep(0.2, 0.5, R.y)) * (0.55 + 0.45 * sin(atan(R.z, R.x) * 9.0 + R.y * 6.0));
        vec3 env = mix(below, above, step(0.0, R.y)) + vec3(1.0, 0.4, 0.75) * band * 0.2 + (toward * 1.5 + uHazeColor * 0.45) * signs;
        int k = int(vKind + 0.5);
        // Its lamps go out with it where it fades.
        float lit = vLook.a * vFade;
        float far = smoothstep(10.0, 90.0, length(vWorld - uCam));
        vec3 col;
        float glow = 0.0;
        float flank = step(0.7, abs(nl.x));
        #ifdef VAN
        // The van's flanks and back: a row of cabin windows between pillars,
        // the rear doors' two lights and their split, a rubbing strip.
        if (k == 0) {
          float back = step(nl.z, -0.7);
          float pil = step(0.05, abs(fract((vLocal.z + 2.35) / 0.95) - 0.5) * 0.95);
          float win = flank * step(1.22, vLocal.y) * step(vLocal.y, 1.84) * step(-2.3, vLocal.z) * step(vLocal.z, 0.5) * pil;
          win = max(win, back * step(1.18, vLocal.y) * step(vLocal.y, 1.9) * step(abs(vLocal.x), 0.82) * step(0.04, abs(vLocal.x)));
          if (win > 0.5) k = 2;
          else if (flank * step(abs(vLocal.y - 0.55), 0.045) > 0.5) k = 1;
        }
        #endif
        // Grounded: darker toward the sills and round each wheel, where the
        // arch stands over its tyre; the roof and the bonnet lifted by the
        // glow overhead.
        float ao = 0.35 + 0.65 * smoothstep(0.12, 1.1, vLocal.y);
        vec2 wv = vec2(abs(vLocal.z) - uWheel.x, vLocal.y - uWheel.y);
        float wr = length(wv) / uWheel.y;
        float arch = smoothstep(uWheel.y + 0.02, uWheel.y + 0.2, length(wv));
        ao *= mix(1.0, mix(0.4, 1.0, arch), flank);
        float sky = max(n.y, 0.0);
        // A wheel's face has a rim in it (the far model's wheel is a plain
        // drum: its rim is drawn on it).
        if (k == 6 && flank > 0.5 && wr < 0.7) k = 7;
        if (k == 0) {
          vec3 body = vBody * (1.5 - 0.7 * vBody) + vec3(0.012);
          // The patrol car: black, the doors white between the sills and
          // the waist, a band of blue along them. A livery of its own: no
          // force's name on it, no crest.
          if (tag == 1) {
            float door = step(0.3, vLocal.y) * step(vLocal.y, 0.68) * step(abs(vLocal.z), 1.25);
            body = mix(vec3(0.02), vec3(0.62, 0.64, 0.66), door);
            body = mix(body, vec3(0.03, 0.12, 0.5), door * flank * step(abs(vLocal.y - 0.5), 0.05));
          }
          // The taxi: its yellow, a row of black and yellow checks along
          // the waist.
          if (tag == 2) {
            float check = step(abs(vLocal.y - 0.72), 0.045) * flank * step(abs(vLocal.z), 1.6);
            float sq = step(0.5, fract(vLocal.z / 0.18)) * step(vLocal.y, 0.72) + (1.0 - step(0.5, fract(vLocal.z / 0.18))) * step(0.72, vLocal.y);
            body = mix(body, vec3(0.012), check * sq);
          }
          // Panel lines: the doors' cuts between the sill and the waist, a
          // crease along the flank that catches the light over its own
          // shadow, and a handle at the back of each door.
          float aa = fwidth(vLocal.z) + fwidth(vLocal.y);
          float zs = min(abs(vLocal.z - uSeam.x), abs(vLocal.z - uSeam.y));
          float between = step(uSeam.z, vLocal.y) * step(vLocal.y, uSeam.w);
          float seam = (1.0 - smoothstep(0.007, 0.007 + aa, zs)) * between * flank;
          float crease = vLocal.y - mix(uSeam.z, uSeam.w, 0.6);
          seam = max(seam, (1.0 - smoothstep(0.005, 0.005 + aa, abs(crease))) * 0.55 * flank);
          vec2 hd = min(abs(vec2(vLocal.z - uDoor.x - 0.15, vLocal.y - uSeam.w + 0.1)), abs(vec2(vLocal.z - uDoor.y - 0.15, vLocal.y - uSeam.w + 0.1))) - vec2(0.085, 0.016);
          float handle = step(max(hd.x, hd.y), 0.0) * flank;
          body *= 1.0 - 0.8 * max(seam, handle);
          // Below the doors' foot the flank is dark cladding, not paint.
          float clad = flank * (1.0 - smoothstep(uSeam.z - 0.035, uSeam.z + 0.005, vLocal.y));
          body = mix(body, vec3(0.016, 0.017, 0.02), clad * 0.88);
          // A flank is not one flat tone: the paint turns under toward the
          // sill and stands up to the street's light toward the shoulder.
          float turn = mix(1.0, 0.5 + 0.65 * smoothstep(uSeam.z, uSeam.w + 0.12, vLocal.y), flank);
          vec3 light = vec3(0.06) + side * (0.55 + 0.35 * sky) + spill * 0.3 + lampsAt(vWorld, n) * 1.5 + (uHazeColor * 0.5 + uGlowColor * 0.3) * (0.25 + 0.75 * sky) * uHaze;
          col = body * light * ao * turn;
          // Wet paint: what it gives back, the sky's glow and the signs' on
          // everything that faces up, the signs' own colour in a soft band
          // along the flank under the shoulder with a line of light on the
          // crease, and a rim where it turns away from the eye, so that a
          // dark car on a dark road still has its outline.
          col += env * (0.1 + 0.9 * F) * 0.8 * (0.55 + 0.45 * ao);
          col += (uHazeColor * 0.55 + uGlowColor * 0.3 + spill * 0.35) * sky * sky * 0.22;
          float sheen = exp(-pow((vLocal.y - mix(uSeam.z, uSeam.w, 0.74)) / 0.1, 2.0)) * flank * (1.0 - clad);
          col += (min(toward, vec3(1.4)) * 0.8 + min(side, vec3(1.4)) * 0.5 + uHazeColor * 0.3) * sheen * 0.2;
          col += (uHazeColor * 0.6 + side * 0.9) * smoothstep(0.004, 0.02, crease) * (1.0 - smoothstep(0.02, 0.05, crease)) * flank * 0.1;
          col += (uHazeColor * 0.9 + side * 0.7) * pow(1.0 - ndv, 4.0) * 0.2;
          col += vec3(0.5, 0.52, 0.56) * (0.03 + side * 0.4) * handle * step(-0.004, hd.y);
          // A strip of bright trim along the waist, under the glass.
          float waist = (1.0 - smoothstep(0.011, 0.011 + aa, abs(vLocal.y - uSeam.w + 0.014))) * flank * step(uBoxMin.z + 0.55, vLocal.z) * step(vLocal.z, uBoxMax.z - 0.85);
          col = mix(col, vec3(0.5, 0.53, 0.58) * (0.035 + side * 0.55 + spill * 0.25) + env * 0.45, waist * 0.85);
        }
        else if (k == 1) col = vec3(0.011, 0.012, 0.014) + (spill * 0.07 + side * 0.1) * ao + env * (0.03 + 0.3 * F);
        else if (k == 2) {
          // Glass: a dark cabin behind it, and over that the street given
          // back: the signs' colour from the side it faces low in the
          // pane, the sky's glow deepening toward its top edge, and two
          // bars of light across it, as wet glass has. Nobody is drawn
          // inside: a head at this size is a black blob.
          float gy = clamp((vLocal.y - uSeam.w) / max(uBoxMax.y - uSeam.w, 0.2), 0.0, 1.0);
          vec3 cabin = (vec3(0.012, 0.016, 0.026) + min(spill, vec3(1.0)) * 0.03 + vLook.rgb * 0.02 * lit) * (0.5 + 0.5 * gy);
          vec3 given = mix(min(side, vec3(1.2)) * 0.6 + uGlowColor * 0.25, uHazeColor * 0.9 + uGlowColor * 0.4 + min(toward, vec3(1.0)) * 0.25, gy);
          float bars = smoothstep(0.86, 0.97, sin((vLocal.z * 0.9 + vLocal.x * 0.9 + vLocal.y * 1.6) * 3.0));
          col = cabin * (1.0 - F) + min(env, vec3(1.6)) * (0.05 + 0.95 * F) + given * (0.15 + 0.12 * gy) + (uHazeColor * 0.5 + min(side, vec3(1.0)) * 0.4) * bars * 0.13;
        }
        // A light bar is a lamp unit at each end and a thin running strip
        // between them, behind a lens; lit, it is only as hot as it must be
        // to carry: a lit lens close to, where the bloom would spread it
        // across the car's whole nose, and a point the bloom can find from
        // down the street. A bar up on a roof is an amber marker strip.
        // Unlit, a lens still catches the street.
        else if (k == 3) {
          float unit = smoothstep(0.56, 0.64, abs(vLocal.x) / uBars.x);
          vec3 beam = vec3(0.92, 0.95, 1.0) * mix(1.6, 6.5, far) * mix(0.14, 1.0, unit);
          if (vLocal.y > uBars.y + 0.4) beam = vec3(1.0, 0.55, 0.14) * 0.85;
          vec3 lens = vec3(0.07, 0.078, 0.086) + env * 0.45 + (side * 0.25 + spill * 0.1) * mix(0.4, 1.0, unit);
          col = mix(lens, beam, lit);
          glow = lit;
        }
        else if (k == 4) {
          float unit = smoothstep(0.5, 0.6, abs(vLocal.x) / uBars.z);
          // Red, with next to no green or blue in it, so the gain does not
          // wash it pink. Under the brakes the whole bar is lit, and
          // brighter.
          vec3 beam = vec3(1.0, 0.016, 0.028) * mix(1.25, 3.2, far) * mix(mix(0.4, 1.0, unit), 1.9, vBrake);
          vec3 lens = vec3(0.12, 0.007, 0.012) + (side + spill) * vec3(0.16, 0.01, 0.014) + env * 0.1;
          col = mix(lens, beam, lit);
          glow = lit;
        }
        else if (k == 5) { col = vLook.rgb * max(mix(0.6, mix(1.5, 3.0, far), lit), 1.7 * vState.w); glow = 1.0; }
        else if (k == 6) col = vec3(0.007) + (spill * 0.05 + side * 0.04) + (uHazeColor * 0.4 + side * 0.5) * pow(1.0 - ndv, 3.0) * 0.14 + side * 0.05 * flank * smoothstep(0.78, 0.86, wr) * (1.0 - smoothstep(0.9, 0.98, wr));
        else if (k == 7) {
          // The rim: five spokes of bright alloy from a hub to the rim's
          // edge, dark between them; turning, they run together.
          float spoke = smoothstep(0.4, 0.56, abs(fract(atan(wv.y, wv.x) * 0.7958) - 0.5) * 2.0);
          float metal = mix(spoke, 0.5, lit * (1.0 - vBrake) * 0.85);
          metal = max(metal, smoothstep(0.55, 0.61, wr));
          metal = max(metal, 1.0 - smoothstep(0.13, 0.17, wr));
          metal *= 1.0 - smoothstep(0.68, 0.73, wr);
          vec3 alloy = vec3(0.36, 0.38, 0.42) * (0.045 + side * 0.9 + spill * 0.35) + env * (0.12 + 0.4 * F);
          col = mix(vec3(0.008) + side * 0.02, alloy, metal * flank);
        }
        else if (k == 9) {
          // The taxi's sign: a lit amber box, its ends darker.
          col = vec3(1.0, 0.62, 0.12) * mix(1.3, 3.2, far) * (0.35 + 0.65 * step(abs(vLocal.x), 0.24));
          glow = 1.0;
        }
        else if (k == 8 && vLocal.y < uBoxMax.y - 0.1) col = vec3(0.012) + env * 0.2;
        else if (k == 8) {
          // The bar: red on one side, blue on the other, trading places.
          float flip = step(0.0, sin(uTime * 9.0 + vLocal.z * 0.1)) * 2.0 - 1.0;
          float port = step(0.0, vLocal.x * flip);
          col = mix(vec3(1.0, 0.04, 0.08), vec3(0.1, 0.25, 1.0), port) * mix(2.2, 6.0, far) * (0.6 + 0.4 * step(0.5, fract(uTime * 4.0)));
          glow = 1.0;
        }
        else col = vec3(0.02, 0.022, 0.026) + env * 0.2 + side * 0.05;
        // A number plate on the nose and on the tail: a pale rectangle in a
        // dark frame with a row of dark marks, the tail's under its own lamp.
        if (k < 2) {
          float nose = step(0.9, nl.z) * step(uBoxMax.z - 0.06, vLocal.z);
          float back = step(0.9, -nl.z) * step(vLocal.z, uBoxMin.z + 0.06);
          vec2 pd = abs(vec2(vLocal.x, vLocal.y - mix(uPlate.y, uPlate.x, nose))) - vec2(uPlate.z, 0.052);
          float edge = max(pd.x, pd.y);
          if ((nose + back) * step(edge, 0.0) > 0.5) {
            vec3 face = vec3(0.62, 0.6, 0.5);
            // Dark marks along it, as a plate has: blocks, not letters.
            float gx = vLocal.x / uPlate.z * 3.2;
            float mark = step(abs(fract(gx) - 0.5), 0.33) * step(abs(pd.y + 0.052), 0.03) * step(0.28, hash12(vec2(floor(gx) + 7.0, floor(vBody.r * 97.0 + vBody.b * 31.0))));
            face = mix(face, vec3(0.03), mark * 0.9);
            col = face * (0.045 + side * 0.45 + spill * 0.2 + vec3(1.0, 0.92, 0.8) * lit * mix(0.1, 0.5, back));
            col = mix(col, vec3(0.006), step(-0.012, edge));
            glow = 0.25 * lit * back;
          }
        }
        col = cityFog(col, vWorld, glow);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };
  const carUniforms = { ...shared };
  // The AVs: gunmetal and tinted glass giving back the lit city under them
  // and the haze over it, most at a glancing angle; their lamps, thrusters
  // and sill strips bright enough for the bloom to find.
  const avMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute float aKind;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vKind;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vKind = aKind;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vKind;
      void main() {
        vec3 n = normalize(vNormalW);
        vec3 V = normalize(vWorld - uCam);
        vec3 R = reflect(V, n);
        float F = 0.04 + 0.96 * pow(1.0 - abs(dot(V, n)), 5.0);
        // Under it the lit city, a band of neon at the horizon; over it the
        // haze and the dark.
        float band = exp(-abs(R.y) * 14.0);
        vec3 below = uHazeColor * 0.5 + uGlowColor * 0.9;
        vec3 above = uHazeColor * 0.3 * exp(-max(R.y, 0.0) * 4.0) + vec3(0.004, 0.004, 0.008);
        vec3 env = mix(below, above, step(0.0, R.y)) + vec3(1.0, 0.35, 0.75) * band * 0.35;
        int k = int(vKind + 0.5);
        vec3 col;
        float glow = 1.0;
        if (k == 0) { col = vec3(0.014, 0.015, 0.019) + env * (0.18 + 0.82 * F); glow = 0.0; }
        else if (k == 1) { col = vec3(0.006, 0.006, 0.008) + env * F * 0.35; glow = 0.0; }
        else if (k == 2) { col = vec3(0.003, 0.005, 0.009) + env * (0.08 + 0.92 * F); glow = 0.0; }
        else if (k == 3) col = vec3(0.92, 0.95, 1.0) * 7.0;
        else if (k == 4) col = vec3(1.0, 0.1, 0.24) * 5.5;
        else if (k == 5) col = vec3(0.35, 0.85, 1.0) * 2.6 * (0.85 + 0.15 * sin(uTime * 40.0 + vWorld.x));
        else col = vec3(1.0, 0.18, 0.53) * 4.0;
        if (glow < 0.5) col += spillAt(vWorld) * 0.5 * max(-n.y, 0.0);
        col = cityFog(col, vWorld, glow);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  avMat.name = "avs";
  // The craft: each lane's own number of them (src/world/traffic-sky.js),
  // spread evenly round it from a seeded draw, so the same second of the
  // clock is the same sky on every load; then the police AV, the one
  // standing on its pad and the one that keeps the megabuilding's. Two
  // draws, as the cars: its own model near, a coarser one far, and only the
  // ones in view in either.
  const craft = createCraft(full);
  const flyers = craft.length;
  const flying = flyers + (police ? 1 : 0) + 2;
  const avFar = joined([coarse(avGeo, 0.3, (k) => k >= 3), coarse(avGeo, 0.14, (k) => k < 3)]);
  const avLevels = [avGeo, avFar].map((geometry, i) => {
    const mesh = new THREE.InstancedMesh(geometry, avMat, Math.max(1, flying));
    mesh.name = i ? "avs_far" : "avs";
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.layers.enable(reflectLayer);
    mesh.count = 0;
    scene.add(mesh);
    return { mesh, n: 0 };
  });
  const avMesh = avLevels[0].mesh;

  // The drones: one instanced draw in the AV's shader. Each flies its own
  // round of roofs, from its own point in it; every leg is worked out once
  // (how long it sits, climbs, crosses and comes down, and which way it
  // faces), so a frame only finds where in its round each drone is.
  const routes = DRONE_ROUTES.filter((x) => x.phone || drones > 5).slice(0, drones);
  const droneGeo = droneGeometry();
  const droneMesh = new THREE.InstancedMesh(droneGeo, avMat, Math.max(1, routes.length));
  droneMesh.name = "drones";
  droneMesh.frustumCulled = false;
  droneMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  droneMesh.layers.enable(reflectLayer);
  droneMesh.count = routes.length;
  scene.add(droneMesh);
  let roundSeed = 11;
  const roundDraw = () => ((roundSeed = (roundSeed * 16807) % 2147483647) - 1) / 2147483646;
  const rounds = routes.map((route) => {
    const legs = route.pads.map((a, k) => {
      const b = route.pads[(k + 1) % route.pads.length];
      const H = route.cruise[k];
      const rest = DRONE.rest[0] + roundDraw() * (DRONE.rest[1] - DRONE.rest[0]);
      const up = (H - a[2]) / DRONE.climb;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const across = len / DRONE.cruise;
      const down = (H - b[2]) / DRONE.descend;
      return { a, b, H, rest, up, across, down, time: rest + up + across + down, heading: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    });
    const total = legs.reduce((sum, l) => sum + l.time, 0);
    return { legs, total, offset: roundDraw() * total, blink: roundDraw() };
  });

  // The cars: the network's (src/world/traffic-net.js: every street both
  // ways, in platoons that queue at the lights and move off), the deck's,
  // and the ones that stand (src/world/traffic-park.js: the kerbs parked
  // full, the taxis, the patrol car); each its model, its paint and accent,
  // dealt in turn along its lane or its row so no two neighbours match and
  // the street is the same street every visit.
  const net = createNetwork({ perPlatoon: full ? 5 : 2 });
  // The lanes that leave the ground (the builder's "paths": the ramp, the
  // turn and the deck, each way, as points with their heights): cars on
  // each, riding the line by its length.
  const paths = [];
  for (let i = 0; i + 1 < elevated.length; i += 2 + 3 * elevated[i]) {
    const pts = [];
    for (let k = 0; k < elevated[i]; k++) pts.push(new THREE.Vector3(elevated[i + 2 + 3 * k], elevated[i + 3 + 3 * k], elevated[i + 4 + 3 * k]));
    const at = [0];
    for (let k = 1; k < pts.length; k++) at.push(at[k - 1] + pts[k].distanceTo(pts[k - 1]));
    paths.push({ pts, at, len: at[at.length - 1], v: elevated[i + 1] });
  }
  const onDeck = deckCars * (full ? 4 : 2);
  const pathSlots = [];
  paths.forEach((P, k) => {
    const dress = wardrobe(613 + k * 29);
    for (let j = 0; j < onDeck; j++) pathSlots.push({ ...dress(), tag: TAG.none, path: { P, phase: (j + DECK_STARTS[k % 2]) / onDeck } });
  });
  // A route's cars follow one another round it, so each route deals its own.
  const dressers = net.routes.map((r, k) => wardrobe(101 + k * 53));
  const SEDAN = CAR_KINDS.indexOf("sedan");
  const moving = net.cars.length;
  let cruisers = 0;
  const slots = [
    ...net.cars.map((car, i) => {
      const x = { ...dressers[net.routes.indexOf(car.route)](), tag: TAG.none, car };
      // A few of them are patrol cars.
      if (i % 31 === 7 && cruisers < (full ? 4 : 1)) {
        cruisers++;
        return { ...x, kind: SEDAN, body: "#0a0a0c", tag: TAG.patrol };
      }
      return x;
    }),
    ...pathSlots,
    ...createStanding({ rows: net.rows, full }).map((c) => ({ ...c, parked: c })),
  ];
  const UPRIGHT = new THREE.Vector3(0, 1, 0);
  for (const x of slots) {
    x.paint = new THREE.Color(x.body);
    x.neon = new THREE.Color(x.accent);
    // A taxi waits and a patrol car stands with their lamps on; the rest of
    // the parked are dark.
    x.lit = !x.parked || x.tag !== TAG.none || !!x.parked.lit;
    if (x.parked) {
      x.at = new THREE.Vector3(x.parked.x, 0, x.parked.z);
      x.turn = new THREE.Quaternion().setFromAxisAngle(UPRIGHT, x.parked.yaw);
    }
  }
  // A material a kind over the same uniforms (a clone would copy them, and
  // stop the clock) with the kind's own box; the same source gives the same
  // program, so the van is the only other one. Each kind is two draws: its
  // own model for the ones close by, the coarser one for the rest.
  const kinds = CAR_KINDS.map((kind, k) => {
    const built = carGeometry(kind);
    const detail = DETAIL[kind];
    const material = new THREE.ShaderMaterial({ uniforms: { ...carUniforms, uBoxMin: { value: built.box.min }, uBoxMax: { value: built.box.max }, uBars: { value: built.bars }, uSeam: { value: new THREE.Vector4(...detail.seam) }, uDoor: { value: new THREE.Vector4(...detail.door, 0, 0) }, uPlate: { value: new THREE.Vector3(...detail.plate) }, uWheel: { value: new THREE.Vector2(...detail.wheel) } }, ...carShader, defines: kind === "van" ? { VAN: "" } : {} });
    material.name = kind === "van" ? "traffic_van" : "traffic";
    const mine = slots.filter((x) => x.kind === k);
    for (const x of mine) x.lamps = built;
    const n = Math.max(1, mine.length);
    // Room for every car of the kind in either; each frame the ones in view
    // are written to the front of one or the other and its count set.
    const level = (geometry, name) => {
      const look = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
      const state = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("aLook", look);
      geometry.setAttribute("aState", state);
      const mesh = new THREE.InstancedMesh(geometry, material, n);
      mesh.name = name;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
      mesh.layers.enable(reflectLayer);
      mesh.count = 0;
      scene.add(mesh);
      return { mesh, look, state, attributes: [mesh.instanceMatrix, mesh.instanceColor, look, state], geometry, n: 0 };
    };
    return { levels: [level(built.geometry, `traffic_${kind}`), level(built.far, `traffic_${kind}_far`)], material };
  });
  // A car's four corner lamps, in its own frame: the hazards' places.
  const corners = (L) => [L.head, [-L.head[0], L.head[1], L.head[2]], L.tail, [-L.tail[0], L.tail[1], L.tail[2]]];
  const standingLit = slots.filter((x) => x.parked && x.lit).length;
  const patrols = slots.filter((x) => x.tag === TAG.patrol).length;
  const hazards = slots.filter((x) => x.parked?.hazard).length;

  // Lamps: two per aerial vehicle, four per car with its lamps on, four a
  // hazard car, two a patrol car's bar, three per drone, and the police
  // AV's light bar.
  const lampCount = flying * 2 + flyers * 3 + (moving + pathSlots.length + standingLit + hazards) * 4 + patrols * 2 + rounds.length * 3 + (police ? 2 : 0);
  const quad = new THREE.PlaneGeometry(1, 1);
  const lampGeo = new THREE.InstancedBufferGeometry();
  lampGeo.index = quad.index;
  lampGeo.setAttribute("position", quad.attributes.position);
  lampGeo.setAttribute("uv", quad.attributes.uv);
  const lampPos = new Float32Array(Math.max(1, lampCount) * 3);
  const lampCol = new Float32Array(Math.max(1, lampCount) * 4);
  const posAttr = new THREE.InstancedBufferAttribute(lampPos, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.InstancedBufferAttribute(lampCol, 4).setUsage(THREE.DynamicDrawUsage);
  lampGeo.setAttribute("aPos", posAttr);
  lampGeo.setAttribute("aCol", colAttr);
  lampGeo.instanceCount = 0;
  const lampMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec3 aPos;
      attribute vec4 aCol;
      varying vec4 vCol;
      varying vec2 vUv;
      void main() {
        vec4 mv = viewMatrix * vec4(aPos, 1.0);
        // Close to, a lamp's glow is its lens and a breath round it: smaller
        // and gentler the nearer the lens, so that two headlamps never join
        // into one bar across the car that carries them. From 70 m on it is
        // the size and the brightness it always was.
        float k = smoothstep(8.0, 70.0, -mv.z);
        mv.xy += position.xy * aCol.a * mix(0.5, 1.0, k);
        gl_Position = projectionMatrix * mv;
        vCol = vec4(aCol.rgb * mix(0.42, 1.0, k * k), aCol.a);
        vUv = uv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec4 vCol;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float core = exp(-d * d * 9.0);
        // The halo gone before the quad's edge, so a lamp seen close is a
        // glow and not a square.
        float halo = exp(-d * d * 2.2) * 0.35 * smoothstep(1.0, 0.75, d);
        gl_FragColor = vec4(vCol.rgb * (core * 3.0 + halo), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  lampMat.name = "lamps";
  const lamps = new THREE.Mesh(lampGeo, lampMat);
  lamps.frustumCulled = false;
  lamps.renderOrder = 7;
  lamps.layers.enable(reflectLayer);
  scene.add(lamps);

  // What a car's lamps do to the wet road: a pool of white ahead of the
  // nose, a shorter one of red behind the tail (more under the brakes), and
  // under a few of them the glow of their own sill strips. One flat quad a
  // car, laid along its own line (so it climbs the ramp with it), added to
  // the road under it; a parked car has one only if it glows.
  const POOLS_TO = 200;
  const poolMax = Math.max(1, moving + pathSlots.length + standingLit + slots.filter((x) => x.parked && x.glow).length);
  const poolGeo = new THREE.InstancedBufferGeometry();
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  poolGeo.index = flat.index;
  poolGeo.setAttribute("position", flat.attributes.position);
  const poolAt = new THREE.InstancedBufferAttribute(new Float32Array(poolMax * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const poolFwd = new THREE.InstancedBufferAttribute(new Float32Array(poolMax * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const poolTint = new THREE.InstancedBufferAttribute(new Float32Array(poolMax * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const poolMode = new THREE.InstancedBufferAttribute(new Float32Array(poolMax * 4), 4).setUsage(THREE.DynamicDrawUsage);
  poolGeo.setAttribute("aAt", poolAt);
  poolGeo.setAttribute("aFwd", poolFwd);
  poolGeo.setAttribute("aTint", poolTint);
  poolGeo.setAttribute("aMode", poolMode);
  poolGeo.instanceCount = 0;
  const poolMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec3 aAt;
      attribute vec3 aFwd;
      attribute vec3 aTint;
      attribute vec4 aMode;
      uniform vec3 uCam;
      varying vec2 vP;
      varying vec3 vTint;
      varying vec4 vMode;
      varying float vFar;
      void main() {
        // Metres in the car's own frame: across it, and along it (ahead is
        // plus), from 8 m behind its middle to 15 m ahead.
        vP = position.xz * vec2(7.0, 23.0) + vec2(0.0, 3.5);
        vec3 f = normalize(aFwd);
        vec3 r = normalize(vec3(f.z, 0.0, -f.x));
        vec3 w = aAt + r * vP.x + f * vP.y + vec3(0.0, 0.045, 0.0);
        vTint = aTint;
        vMode = aMode;
        vFar = distance(w, uCam);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vP;
      varying vec3 vTint;
      varying vec4 vMode;
      varying float vFar;
      void main() {
        float ahead = vP.y - vMode.w;
        float behind = -vP.y - vMode.w;
        // Two beams that run together a few metres out and thin away.
        float beams = exp(-pow((abs(vP.x) - 0.55) / (0.5 + max(ahead, 0.0) * 0.2), 2.0));
        float head = smoothstep(-0.2, 1.6, ahead) * exp(-max(ahead, 0.0) * 0.21) * beams;
        float tail = smoothstep(-0.1, 0.7, behind) * exp(-max(behind, 0.0) * 0.6) * exp(-pow(vP.x / (1.0 + max(behind, 0.0) * 0.2), 2.0));
        // Under it: brightest along its sills, out from under its edges.
        vec2 e = vec2(abs(vP.x) - 0.8, abs(vP.y) - vMode.w + 0.5);
        float under = exp(-pow(max(e.x, 0.0) / 0.55, 2.0)) * exp(-pow(max(e.y, 0.0) / 0.6, 2.0)) * (0.3 + 0.7 * smoothstep(-0.5, 0.0, max(e.x, e.y * 0.4)));
        vec3 col = vec3(0.8, 0.88, 1.0) * head * vMode.x * 0.42 + vec3(1.0, 0.03, 0.05) * tail * vMode.y * 0.3 + vTint * under * vMode.z * 0.34;
        gl_FragColor = vec4(col * (1.0 - smoothstep(90.0, ${POOLS_TO.toFixed(1)}, vFar)), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  poolMat.name = "pools";
  const pools = new THREE.Mesh(poolGeo, poolMat);
  pools.name = "pools";
  pools.frustumCulled = false;
  pools.renderOrder = 6;
  scene.add(pools);

  // The trains. One model (trainGeometry) on two lines. On the viaduct at
  // the avenue's far end (anchor_rail), six cars: out of the portal in
  // Japantown's collar, across the avenue's glow at the vanishing point and
  // into the station, and back out the other way half a minute later. On
  // Corpo Row's elevated track, two cars at a time: out of the west block's
  // portal, into the halt behind the towers, half a minute standing there
  // lit, then on into the corner block's portal, the next one following, so
  // the halt has a train in it most of the time and another is often on its
  // way. A train is only drawn between its line's portals. Its windows are
  // a lit carriage each, between pillars, two doors a side, a passenger or
  // two against the light, over a stripe of the line's colour; its body
  // gives back the city's glow; its nose carries the headlamps going and
  // the tail lamps coming. The windows are as bright as the old ones at the
  // vanishing point and softer close to, where they would only blow out.
  const CAR = 18;
  // Corpo Row's track (scripts/blender/ncw/districts/corpo_north.py: its
  // TRACK_Z and TRACK_Y, its two portals, the middle of its halt). It has
  // no anchor of its own yet, so its numbers are here.
  const CORPO_TRACK = { z: -378.5, y: 19, x0: 133, x1: 432, halt: 246 };
  const trainShader = {
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      varying vec3 vNormalL;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vLocal = position;
        vNormalL = normal;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uDir;
      uniform float uLen;
      uniform vec2 uClip;
      varying vec3 vLocal;
      varying vec3 vNormalL;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        // Inside a portal it is in the block, not in the street.
        if (vWorld.x < uClip.x || vWorld.x > uClip.y) discard;
        float LEN = uLen;
        const float carLen = ${CAR.toFixed(1)};
        float u = vLocal.x + LEN * 0.5;
        float car = floor(u / carLen);
        float inCar = u - car * carLen;
        float y = vLocal.y;
        vec3 nl = normalize(vNormalL);
        vec3 n = normalize(vNormalW);
        vec3 V = normalize(vWorld - uCam);
        float F = 0.04 + 0.96 * pow(1.0 - abs(dot(V, n)), 5.0);
        float dist = length(vWorld - uCam);
        // Which end leads, and how far into its nose this point is.
        float lead = uDir > 0.0 ? LEN * 0.5 - vLocal.x : vLocal.x + LEN * 0.5;
        float tail = LEN - lead;
        float nose = 1.0 - smoothstep(3.0, 3.6, min(lead, tail));
        // The body: dark paint giving back the lit air under it and the
        // haze over it, and the street's light from below.
        vec3 R = reflect(V, n);
        vec3 env = mix(uHazeColor * 0.45 + uGlowColor * 0.7, uHazeColor * 0.25 * exp(-max(R.y, 0.0) * 4.0), step(0.0, R.y));
        float sky = max(n.y, 0.0);
        vec3 col = vec3(0.016, 0.017, 0.022) + env * (0.08 + 0.7 * F) + spillAt(vWorld) * 0.25 * max(-n.y, 0.0) + (uHazeColor * 0.2 + uGlowColor * 0.12) * sky * uHaze;
        float glow = 0.0;
        if (y < 0.56) col = vec3(0.006) + spillAt(vWorld) * 0.05;
        float side = step(0.6, abs(nl.z)) * (1.0 - nose);
        if (side > 0.5) {
          // Two doors a side, a quarter and three quarters along.
          float dq = min(abs(inCar - carLen * 0.25), abs(inCar - carLen * 0.75));
          float door = step(dq, 0.68);
          float seam = step(abs(dq - 0.68), 0.03) * step(0.62, y) * step(y, 2.86) + step(dq, 0.68) * step(abs(dq), 0.015) * step(0.62, y) * step(y, 2.86);
          // Windows between pillars, a pane every 1.55 m between the doors;
          // a narrow one in each door leaf.
          float pane = fract((inCar - 0.4) / 1.55);
          float win = (1.0 - door) * step(0.1, pane) * step(pane, 0.9) * step(1.5, y) * step(y, 2.62);
          win += door * step(0.12, dq) * step(dq, 0.56) * step(1.62, y) * step(y, 2.52);
          win *= step(0.9, inCar) * step(inCar, carLen - 0.9);
          float id = floor((inCar - 0.4) / 1.55) + car * 17.0;
          float lit = step(0.12, hash12(vec2(id, 3.0 + car)));
          vec3 room = mix(vec3(1.0, 0.86, 0.66), vec3(0.8, 0.9, 1.0), step(0.7, hash12(vec2(car, 9.0))));
          // Someone against the light now and then: a head and shoulders.
          float who = hash12(vec2(id, 7.0));
          float cx = fract((inCar - 0.4) / 1.55) * 1.55 - (0.35 + 0.85 * fract(who * 7.3));
          float person = step(0.55, who) * (step(length(vec2(cx, y - 2.12) / vec2(1.0, 1.15)), 0.13) + step(length(vec2(cx, (y - 1.72) * 2.2)), 0.26) * step(y, 1.86));
          // Inside: the ceiling's light strip along the top of the glass,
          // seat backs along the bottom, the carriage's light between.
          vec3 inside = room * (0.7 + 0.3 * smoothstep(1.7, 2.5, y) + 1.2 * step(2.48, y) * (1.0 - door)) * mix(0.4, 1.0, step(1.7, y));
          inside *= 1.0 - 0.85 * min(person, 1.0) * (1.0 - door);
          float bright = mix(0.5, 2.2, smoothstep(100.0, 450.0, dist));
          col = mix(col, inside * bright * lit + vec3(0.01, 0.012, 0.016) * (1.0 - lit), win);
          glow = max(glow, win * lit * 0.8);
          col = mix(col, vec3(0.004), seam * (1.0 - win));
          // A stripe of the line's colour under the windows.
          float stripe = step(1.18, y) * step(y, 1.32) * (1.0 - door);
          col = mix(col, vec3(0.1, 0.9, 1.0) * 1.6, stripe);
          glow = max(glow, stripe * 0.8);
        }
        if (nose > 0.0 && y > 0.56) {
          // The cab: a dark windscreen over the nose, and its lamps: white
          // ahead, red behind.
          float front = step(lead, tail);
          float screen = step(2.05, y) * step(abs(nl.z), 0.75) * step(0.5, abs(nl.x) + nl.y);
          col = mix(col, vec3(0.004, 0.006, 0.01) + env * (0.1 + 0.9 * F) + vec3(0.25, 0.3, 0.35) * 0.06, screen * nose);
          float lampY = step(abs(y - 1.2), 0.16);
          float lampZ = step(abs(abs(vLocal.z) - 0.78), 0.2);
          float faceOn = step(0.45, abs(nl.x));
          float lamp = lampY * lampZ * faceOn * step(min(lead, tail), 0.6);
          col = mix(col, front > 0.5 ? vec3(1.0, 0.95, 0.85) * 6.0 : vec3(1.0, 0.06, 0.12) * 3.0, lamp);
          glow = max(glow, lamp);
        }
        col = cityFog(col, vWorld, max(glow, 0.15));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };
  /** A train of `cars` on a line (the rail's height, where it runs across
   *  x, the two portals it is drawn between), going where `at(clock)` says:
   *  the middle of it along x, which way it faces, or null when it is out
   *  of sight in a block. */
  const trains = [];
  const addTrain = (cars, line, at) => {
    const geometry = trainGeometry({ length: cars * CAR, cars });
    const material = new THREE.ShaderMaterial({ uniforms: { ...shared, uDir: { value: 1 }, uLen: { value: cars * CAR }, uClip: { value: new THREE.Vector2(line.x0, line.x1) } }, ...trainShader });
    material.name = "train";
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "train";
    mesh.visible = false;
    mesh.layers.enable(reflectLayer);
    scene.add(mesh);
    trains.push({ mesh, material, geometry, line, at, length: cars * CAR });
  };
  const wrapTo = (t, period) => ((t % period) + period) % period;
  const run = { x: 0, dir: 1 };
  if (rail) {
    // The viaduct: 26 s across from portal to portal, 6 s out of sight, and
    // back. At second 12 it is over the avenue.
    const line = { y: rail.position.y, z: rail.position.z, x0: rail.extras?.x0 ?? -94, x1: rail.extras?.x1 ?? 92 };
    const L = 6 * CAR;
    addTrain(6, line, (clock) => {
      const t = wrapTo(clock, 64);
      const k = (t % 32) / 26;
      if (k >= 1) return null;
      run.dir = t < 32 ? 1 : -1;
      run.x = run.dir > 0 ? line.x0 - L / 2 + (line.x1 - line.x0 + L) * k : line.x1 + L / 2 - (line.x1 - line.x0 + L) * k;
      return run;
    });
  }
  {
    // Corpo Row's: in from the west portal slowing into the halt (14 s),
    // standing there (30 s), away into the east portal gathering speed
    // (24 s); two trains, 46 s apart, so one is in the halt as the one
    // before it nears the far portal. At second 12 one has stood there four
    // seconds and the other is most of the way to the east portal.
    const line = CORPO_TRACK;
    const L = 2 * CAR;
    for (const start of [86, 40]) {
      addTrain(2, line, (clock) => {
        const t = wrapTo(clock - start, 92);
        if (t >= 68) return null;
        run.dir = 1;
        const from = line.x0 - L / 2;
        const to = line.x1 + L / 2;
        if (t < 14) run.x = from + (line.halt - from) * (1 - (1 - t / 14) ** 2);
        else if (t < 44) run.x = line.halt;
        else run.x = line.halt + (to - line.halt) * ((t - 44) / 24) ** 2;
        return run;
      });
    }
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const scale = new THREE.Vector3();
  const p = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tilt = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const FRONT = new THREE.Vector3(0, 0, 1);
  const UP = new THREE.Vector3(0, 1, 0);
  const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);
  // The point a distance d along a path (held to its ends).
  const onPath = (P, d, out) => {
    const dd = Math.min(P.len, Math.max(0, d));
    let k = 1;
    while (k < P.at.length - 1 && P.at[k] < dd) k++;
    return out.lerpVectors(P.pts[k - 1], P.pts[k], (dd - P.at[k - 1]) / (P.at[k] - P.at[k - 1] || 1));
  };
  const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
  // Whether the lens sees a car at p, turned q, at all (the body's shader
  // does the same sum): its lamps go out with it.
  const lens = new THREE.Vector3();
  const unturn = new THREE.Quaternion();
  const seen = (at, turned, box) => {
    lens.copy(shared.uCam.value).sub(at);
    if (lens.lengthSq() > 64) return 1;
    lens.applyQuaternion(unturn.copy(turned).invert());
    const d = Math.hypot(Math.max(box.min.x - lens.x, lens.x - box.max.x, 0), Math.max(box.min.y - lens.y, lens.y - box.max.y, 0), Math.max(box.min.z - lens.z, lens.z - box.max.z, 0));
    return d >= NEAR ? 1 : 0;
  };
  const setLamp = (i, x, y, z, r, g, b, size) => {
    lampPos[i * 3] = x;
    lampPos[i * 3 + 1] = y;
    lampPos[i * 3 + 2] = z;
    lampCol[i * 4] = r;
    lampCol[i * 4 + 1] = g;
    lampCol[i * 4 + 2] = b;
    lampCol[i * 4 + 3] = size;
  };
  // What the lens saw last frame (the traffic is not handed the camera; a
  // mesh of its own is told it as it is drawn): a car outside that by more
  // than a margin for a frame's movement is not drawn, nor one too far off
  // to be more than its lamps.
  const view = new THREE.Frustum();
  const viewMatrix = new THREE.Matrix4();
  const ball = new THREE.Sphere();
  let viewed = false;
  lamps.onBeforeRender = (renderer, drawn, camera) => {
    if (!camera.layers.isEnabled(0)) return;
    view.setFromProjectionMatrix(viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    viewed = true;
  };
  const BODIES_TO = full ? 340 : 240;
  const LAMPS_TO = 900;
  const pose = { x: 0, z: 0, fx: 0, fz: 1, brake: 0 };
  /** One more car of its kind this frame, `off` metres squared from the
   *  lens: its own model close by, the coarser one past that. */
  const put = (x, shown, braking, off) => {
    const L = kinds[x.kind].levels[off < DETAIL_TO * DETAIL_TO ? 0 : 1];
    const j = L.n++;
    m.compose(p, q, one).toArray(L.mesh.instanceMatrix.array, j * 16);
    x.paint.toArray(L.mesh.instanceColor.array, j * 3);
    x.neon.toArray(L.look.array, j * 4);
    L.look.array[j * 4 + 3] = x.lit ? 1 : 0;
    L.state.array[j * 4] = shown;
    L.state.array[j * 4 + 1] = braking;
    L.state.array[j * 4 + 2] = x.tag;
    L.state.array[j * 4 + 3] = x.glow ? 1 : 0;
  };
  /** Whether the flying thing at p (its scale s) is in the lens' sight, or
   *  its image in the wet road is: a craft over the frame's top edge still
   *  shows in the road under it. */
  const sky = { x: 0, y: 0, z: 0, fx: 0, fz: 1, bank: 0, yaw: 0, lit: 1 };
  let far2 = 0;
  const fly = (s) => {
    far2 = p.distanceToSquared(shared.uCam.value);
    if (!viewed) return true;
    ball.center.copy(p);
    ball.radius = 24 * s;
    if (view.intersectsSphere(ball)) return true;
    ball.center.y = -p.y;
    return view.intersectsSphere(ball);
  };
  /** One more flying car this frame, at p turned q. */
  const body = (s) => {
    if (far2 > AV_BODIES_TO * AV_BODIES_TO) return;
    const L = avLevels[far2 < AV_DETAIL_TO * AV_DETAIL_TO * s * s ? 0 : 1];
    m.compose(p, q, scale.setScalar(s)).toArray(L.mesh.instanceMatrix.array, L.n++ * 16);
  };
  /** Where a car is at second `at` of the clock, into p and q; and into
   *  `now` how much of it is drawn and whether it is braking. */
  const now = { shown: 1, braking: 0 };
  const locate = (x, at) => {
    now.shown = 1;
    now.braking = 0;
    if (x.car) {
      // On the network: where its route's timetable has it this second.
      net.place(x.car, at, pose);
      p.set(pose.x, 0, pose.z);
      q.setFromAxisAngle(UP, Math.atan2(pose.fx, pose.fz));
      now.braking = pose.brake;
    } else if (x.path) {
      // On the ramp and the deck: where its axles are along the line gives
      // its place, its heading and its pitch on the slope. It fades in and
      // out over the last metres of the line, the lamps by their brightness
      // and the body by its dither.
      const { P, phase: ph } = x.path;
      const t = ((((ph + (at * P.v) / P.len) % 1) + 1) % 1);
      onPath(P, t * P.len - 1.35, tmp);
      onPath(P, t * P.len + 1.35, fwd);
      p.addVectors(tmp, fwd).multiplyScalar(0.5);
      fwd.sub(tmp).normalize();
      q.setFromEuler(euler.set(-Math.asin(fwd.y), Math.atan2(fwd.x, fwd.z), 0, "YXZ"));
      now.shown = Math.min(1, (Math.min(t, 1 - t) * P.len) / FADE);
    } else {
      p.copy(x.at);
      q.copy(x.turn);
    }
  };
  let clock = 0;
  let frozen = false;
  // Where the things the city hears are (soundscape.js): the AVs, the
  // police, and the train while it crosses.
  const voices = { on: true, avs: Array.from({ length: avs }, () => new THREE.Vector3()), police: police ? new THREE.Vector3() : null, train: null };

  const update = (dt, on) => {
    droneMesh.visible = lamps.visible = pools.visible = on;
    for (const l of avLevels) l.mesh.visible = on;
    for (const k of kinds) for (const l of k.levels) l.mesh.visible = on;
    voices.on = on;
    if (!on) {
      for (const T of trains) T.mesh.visible = false;
      voices.train = null;
      return;
    }
    if (!reduced && !frozen) clock += dt;
    let li = 0;
    for (const l of avLevels) l.n = 0;
    for (const c of craft) {
      const L = c.L;
      craftAt(c, clock, sky);
      p.set(sky.x, sky.y, sky.z);
      if (c.k < avs) voices.avs[c.k].copy(p);
      const s = L.s ?? 1;
      if (!fly(s)) continue;
      fwd.set(sky.fx, 0, sky.fz);
      q.setFromAxisAngle(UP, Math.atan2(fwd.x, fwd.z));
      // Banked into its loop and a touch nose-down, as a thing flying does;
      // level along a street.
      q.multiply(tilt.setFromEuler(euler.set(0.05, 0, sky.bank)));
      body(s);
      // Its lamps grow with distance past a hundred metres or so, to three
      // times at 350 m, so a craft across the district still reads as its
      // lights and not as a speck.
      const g = s * Math.min(3.2, Math.max(1, Math.sqrt(far2) / 110));
      setLamp(li++, p.x + fwd.x * 2.6 * s, p.y + 0.25 * s, p.z + fwd.z * 2.6 * s, 0.75, 0.9, 1.0, 1.2 * g);
      setLamp(li++, p.x - fwd.x * 2.6 * s, p.y + 0.4 * s, p.z - fwd.z * 2.6 * s, 1.0, 0.1, 0.25, 0.9 * g);
      // A short trail of its thrusters' light behind it, thinning out.
      for (let k = 1; k <= 3; k++) {
        const back = (2.6 + k * 2.4) * s;
        setLamp(li++, p.x - fwd.x * back, p.y + 0.3 * s, p.z - fwd.z * back, 0.3 / k, 0.75 / k, 1.0 / k, (1.9 - 0.3 * k) * g);
      }
    }
    // The one on its pad, lamps low.
    p.set(PAD_STANDING[0], PAD_STANDING[1], PAD_STANDING[2]);
    if (fly(1)) {
      q.setFromAxisAngle(UP, PAD_STANDING[3]);
      body(1);
      fwd.set(0, 0, 1).applyQuaternion(q);
      setLamp(li++, p.x + fwd.x * 2.6, p.y + 0.25, p.z + fwd.z * 2.6, 0.3, 0.36, 0.4, 1.0);
      setLamp(li++, p.x - fwd.x * 2.6, p.y + 0.4, p.z - fwd.z * 2.6, 0.45, 0.04, 0.1, 0.8);
    }
    // And the megabuilding pad's: at rest half a minute, then up, a round
    // out over the street's east end, back and down.
    padAt(clock, sky);
    p.set(sky.x, sky.y, sky.z);
    if (fly(1)) {
      q.setFromAxisAngle(UP, sky.yaw);
      q.multiply(tilt.setFromEuler(euler.set(0, 0, sky.bank)));
      body(1);
      fwd.set(0, 0, 1).applyQuaternion(q);
      setLamp(li++, p.x + fwd.x * 2.6, p.y + 0.25, p.z + fwd.z * 2.6, 0.75 * sky.lit, 0.9 * sky.lit, 1.0 * sky.lit, 1.2);
      setLamp(li++, p.x - fwd.x * 2.6, p.y + 0.4, p.z - fwd.z * 2.6, 1.0 * sky.lit, 0.1 * sky.lit, 0.25 * sky.lit, 0.9);
    }
    if (police) {
      // The police: an AV on its own slow beat, banked into it, and its light
      // bar on the canopy's back, dimly lit red and blue, going red twice
      // and blue twice in a beat and a half (steady under reduced motion,
      // which never flashes).
      const L = POLICE;
      const circ = Math.PI * (L.r[0] + L.r[1]);
      const a = (0.3 + (clock * L.v) / circ) * Math.PI * 2;
      p.set(L.c[0] + Math.cos(a) * L.r[0], L.y + Math.sin(a * 2.0) * 1.5, L.c[1] + Math.sin(a) * L.r[1]);
      tmp.set(L.c[0] + Math.cos(a + 0.01) * L.r[0], p.y, L.c[1] + Math.sin(a + 0.01) * L.r[1]);
      fwd.subVectors(tmp, p).normalize();
      q.setFromUnitVectors(FRONT, fwd);
      q.multiply(tilt.setFromEuler(euler.set(0.04, 0, -0.12)));
      voices.police.copy(p);
      if (fly(1)) {
        body(1);
        setLamp(li++, p.x + fwd.x * 2.6, p.y + 0.25, p.z + fwd.z * 2.6, 0.75, 0.9, 1.0, 1.2);
        setLamp(li++, p.x - fwd.x * 2.6, p.y + 0.4, p.z - fwd.z * 2.6, 1.0, 0.1, 0.25, 0.9);
        const beat = ((clock % 1.6) + 1.6) % 1.6;
        const red = reduced ? 0.3 : 0.12 + 0.88 * twice(beat, 0);
        const blue = reduced ? 0.3 : 0.12 + 0.88 * twice(beat, 0.8);
        tmp.set(0.38, 1.12, -0.6).applyQuaternion(q).add(p);
        setLamp(li++, tmp.x, tmp.y, tmp.z, 1.0 * red, 0.04 * red, 0.1 * red, 1.5);
        tmp.set(-0.38, 1.12, -0.6).applyQuaternion(q).add(p);
        setLamp(li++, tmp.x, tmp.y, tmp.z, 0.12 * blue, 0.3 * blue, 1.0 * blue, 1.5);
      }
    }
    for (let d = 0; d < rounds.length; d++) {
      // Where in its round this drone is: sitting on a roof, climbing off
      // it and turning to the next, across (nose down as it gets going, up
      // as it slows, at no point a jolt), or coming down onto the next roof.
      const R = rounds[d];
      let t = (((clock + R.offset) % R.total) + R.total) % R.total;
      let k = 0;
      while (k < R.legs.length - 1 && t >= R.legs[k].time) t -= R.legs[k++].time;
      const L = R.legs[k];
      const before = R.legs[(k + R.legs.length - 1) % R.legs.length].heading;
      let x = L.a[0];
      let z = L.a[1];
      let y = L.a[2];
      let yaw = before;
      let pitch = 0;
      let up = true;
      if (t < L.rest) up = false;
      else if ((t -= L.rest) < L.up) {
        const u = t / L.up;
        y += (L.H - L.a[2]) * smoother(u);
        yaw = before + turn(before, L.heading) * smoother(Math.min(1, u * 1.4));
      } else if ((t -= L.up) < L.across) {
        const u = t / L.across;
        const e = smoother(u);
        x += (L.b[0] - L.a[0]) * e;
        z += (L.b[1] - L.a[1]) * e;
        y = L.H;
        yaw = L.heading;
        pitch = 2.3 * u * (1 - u) * (1 - 2 * u);
      } else {
        const u = Math.min(1, (t - L.across) / L.down);
        x = L.b[0];
        z = L.b[1];
        y = L.H + (L.b[2] - L.H) * smoother(u);
        yaw = L.heading;
        up = u < 1;
      }
      // Up in the air, a breath of wind moves it about.
      if (up) {
        x += Math.sin(clock * 1.3 + d) * 0.1;
        y += Math.sin(clock * 2.3 + d * 1.7) * 0.07;
        z += Math.cos(clock * 1.1 + d * 2.1) * 0.1;
      }
      p.set(x, y, z);
      q.setFromEuler(euler.set(pitch, yaw, Math.sin(clock * 1.7 + d) * 0.03 * (up ? 1 : 0), "YXZ"));
      droneMesh.setMatrixAt(d, m.compose(p, q, one));
      // Red to port, green to starboard, on the front ducts, and a white
      // strobe on its back every second and a quarter (not under reduced
      // motion); past 150 m the lamps grow with distance, to two and a half
      // times at 375 m, so a drone crossing the hero's sky still reads as
      // lights and not a speck.
      const strobe = !reduced && (((clock * 0.8 + R.blink) % 1) + 1) % 1 < 0.07 ? 1 : 0;
      const far = Math.min(2.5, Math.max(1, p.distanceTo(shared.uCam.value) / 150));
      tmp.set(0.62, 0.52, 0.32).applyQuaternion(q).add(p);
      setLamp(li++, tmp.x, tmp.y, tmp.z, 1.0, 0.06, 0.1, 0.45 * far);
      tmp.set(-0.62, 0.52, 0.32).applyQuaternion(q).add(p);
      setLamp(li++, tmp.x, tmp.y, tmp.z, 0.1, 1.0, 0.35, 0.45 * far);
      tmp.set(0, 0.66, -0.12).applyQuaternion(q).add(p);
      setLamp(li++, tmp.x, tmp.y, tmp.z, strobe, strobe, strobe, 0.7 * far);
    }
    for (const K of kinds) for (const L of K.levels) L.n = 0;
    let pi = 0;
    for (const x of slots) {
      locate(x, clock);
      const { shown, braking } = now;
      const off = p.distanceToSquared(shared.uCam.value);
      if (off > LAMPS_TO * LAMPS_TO) continue;
      if (viewed) {
        ball.center.copy(p);
        ball.radius = 18;
        if (!view.intersectsSphere(ball)) continue;
      }
      if (off < BODIES_TO * BODIES_TO) put(x, shown, braking, off);
      if (!x.lit && !x.parked?.hazard && !x.glow) continue;
      const glow = shown * seen(p, q, x.lamps.box);
      if (off < POOLS_TO * POOLS_TO && glow > 0 && (x.lit || x.glow)) {
        // Its light on the road: its lamps' if they are on (low on a car
        // that stands), its strips' if it has them lit.
        const on = x.lit ? (x.parked ? 0.45 : 1) * glow : 0;
        fwd.set(0, 0, 1).applyQuaternion(q);
        p.toArray(poolAt.array, pi * 3);
        fwd.toArray(poolFwd.array, pi * 3);
        x.neon.toArray(poolTint.array, pi * 3);
        poolMode.array[pi * 4] = on;
        poolMode.array[pi * 4 + 1] = on * (1 + 1.2 * braking);
        poolMode.array[pi * 4 + 2] = x.glow ? glow : 0;
        poolMode.array[pi * 4 + 3] = x.lamps.box.max.z;
        pi++;
      }
      if (!x.lit && !x.parked?.hazard) continue;
      if (x.parked?.hazard) {
        // Amber at the four corners, a beat on and a beat off.
        const on = (reduced ? 0.25 : step(clock * 1.5)) * glow;
        for (const [lx, ly, lz] of corners(x.lamps)) {
          tmp.set(lx, ly, lz).applyQuaternion(q).add(p);
          setLamp(li++, tmp.x, tmp.y, tmp.z, 1.0 * on, 0.55 * on, 0.12 * on, 0.7);
        }
        continue;
      }
      // White ahead, red behind, the red brighter under the brakes; a car
      // that stands with its lamps on has them low.
      const head = x.lamps.head;
      const tail = x.lamps.tail;
      const low = x.parked ? 0.45 : 1;
      const white = glow * low;
      const red = glow * low * (1 + 1.4 * braking);
      for (const sd of SIDES) {
        tmp.set(sd * head[0], head[1], head[2]).applyQuaternion(q).add(p);
        setLamp(li++, tmp.x, tmp.y, tmp.z, 0.85 * white, 0.92 * white, 1.0 * white, 0.9);
        tmp.set(sd * tail[0], tail[1], tail[2]).applyQuaternion(q).add(p);
        setLamp(li++, tmp.x, tmp.y, tmp.z, 1.0 * red, 0.03 * red, 0.06 * red, 0.6);
      }
      if (x.tag === TAG.patrol) {
        // The bar's two ends, red and blue, trading places (steady under
        // reduced motion, which never flashes).
        const flip = reduced ? 0.5 : Math.sin(clock * 9) > 0 ? 1 : 0;
        const y = x.lamps.box.max.y - 0.04;
        tmp.set(0.38, y, -0.25).applyQuaternion(q).add(p);
        setLamp(li++, tmp.x, tmp.y, tmp.z, glow * (0.3 + 0.7 * flip), 0.03 * glow, 0.08 * glow, 1.1);
        tmp.set(-0.38, y, -0.25).applyQuaternion(q).add(p);
        setLamp(li++, tmp.x, tmp.y, tmp.z, 0.08 * glow, 0.2 * glow, glow * (1 - 0.7 * flip), 1.1);
      }
    }
    voices.train = null;
    for (const T of trains) {
      const at = T.at(clock);
      T.mesh.visible = !!at;
      if (!at) continue;
      T.mesh.position.set(at.x, T.line.y, T.line.z);
      T.material.uniforms.uDir.value = at.dir;
      // The one the city hears is the viaduct's.
      if (rail && T === trains[0]) voices.train = T.mesh.position;
    }
    for (const L of avLevels) {
      L.mesh.count = L.n;
      L.mesh.instanceMatrix.clearUpdateRanges();
      L.mesh.instanceMatrix.addUpdateRange(0, L.n * 16);
      L.mesh.instanceMatrix.needsUpdate = true;
    }
    droneMesh.instanceMatrix.needsUpdate = true;
    for (const K of kinds) {
      for (const L of K.levels) {
        L.mesh.count = L.n;
        for (const a of L.attributes) {
          a.clearUpdateRanges();
          a.addUpdateRange(0, L.n * a.itemSize);
          a.needsUpdate = true;
        }
      }
    }
    poolGeo.instanceCount = pi;
    for (const a of [poolAt, poolFwd, poolTint, poolMode]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, pi * a.itemSize);
      a.needsUpdate = true;
    }
    lampGeo.instanceCount = li;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  };

  return {
    update,
    avMesh,
    voices,
    /** Dev: hold every vehicle where it is, or where it is at second `at`
     *  of the traffic's clock. */
    freeze(on = true, at) {
      frozen = on;
      if (typeof at === "number") clock = at;
    },
    /** Dev: the second of the traffic's own clock. */
    time: () => clock,
    /** Dev: where every flying car on a lane is at this second of the clock
     *  (the sky checks count them from the street and from the air). */
    flying() {
      return craft.map((c) => {
        craftAt(c, clock, sky);
        return { x: sky.x, y: sky.y, z: sky.z };
      });
    },
    /** Dev: every car there is at this second of the clock, drawn or not
     *  (the road checks count them from a driver's seat): where it is, the
     *  way it faces, its model, its size, whether it stands. */
    vehicles() {
      return slots.map((x) => {
        locate(x, clock);
        fwd.set(0, 0, 1).applyQuaternion(q);
        const size = x.lamps.box;
        return { x: p.x, y: p.y, z: p.z, fx: fwd.x, fz: fwd.z, kind: CAR_KINDS[x.kind], tag: x.tag, body: x.body, parked: !!x.parked, length: size.max.z - size.min.z, width: size.max.x - size.min.x, height: size.max.y };
      });
    },
    dispose() {
      scene.remove(...avLevels.map((l) => l.mesh), droneMesh, lamps, ...trains.map((T) => T.mesh), ...kinds.flatMap((k) => k.levels.map((l) => l.mesh)));
      for (const T of trains) {
        T.geometry.dispose();
        T.material.dispose();
      }
      avGeo.dispose();
      droneGeo.dispose();
      droneMesh.dispose();
      avMat.dispose();
      quad.dispose();
      lampGeo.dispose();
      lampMat.dispose();
      scene.remove(pools);
      flat.dispose();
      poolGeo.dispose();
      poolMat.dispose();
      for (const l of avLevels) l.mesh.dispose();
      avFar.dispose();
      for (const k of kinds) {
        k.material.dispose();
        for (const l of k.levels) {
          l.geometry.dispose();
          l.mesh.dispose();
        }
      }
    },
  };
}
