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
import { VNOISE } from "./ground.js";
import { createObject as createAv } from "./av-model.js";
import { createObject as createBaseCar, KINDS as BASE_KINDS } from "./traffic-cars.js";
import { createObject as createShowCar, KINDS as SHOW_KINDS } from "./traffic-cars-nc.js";
import { nearBody, NEAR_KINDS } from "./traffic-near-build.js";
import { createNetwork, roadVents } from "./traffic-net.js";
import { createStanding, wardrobe, KINDS as CAR_KINDS, BIKES, FIXED, TAG } from "./traffic-park.js";
import { creased, coarse, drum, joined } from "./traffic-lod.js";
import { createCraft, craftAt, padAt, PAD_STANDING, CRAFT } from "./traffic-sky.js";
import { createSignals } from "./signals.js";

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

/** A train, x along it (centred), y up from the rail, z across: `cars` cars
 *  with a gap between each and rubber bellows across it. Each car is a
 *  rounded roof over straight sides on two bogies of four wheels with a
 *  third-rail shoe beam, equipment slung under its floor between them and
 *  cooling units on its roof; the two end cars are drawn out into a long
 *  rounded nose over a coupler; every third car carries a pantograph up to
 *  the line's wire (`wire` metres over the rail). Smooth round the section
 *  and along the nose. Each vertex says which part it is of (aPart: 0 the
 *  shell, 1 underframe, 2 wheel, 3 roof gear, 4 bellows) and where on the
 *  car's full section it would be (aRing: across, up), which the nose draws
 *  in: the shader paints the livery, the glass and the lamps by that. */
function trainGeometry({ length, cars, wire }) {
  const carLen = length / cars;
  const GAP = 0.9;
  // Half the section (z >= 0), from the sill up the side, round the roof's
  // shoulder to the middle of the roof.
  const HALF = [[1.36, 0.5], [1.48, 0.62], [1.52, 1.0], [1.52, 2.7], [1.47, 3.05], [1.3, 3.36], [0.95, 3.55], [0.5, 3.62], [0, 3.64]];
  const RING = [...HALF, ...HALF.slice(0, -1).reverse().map(([z, y]) => [-z, y])];
  // The nose: how the section narrows, lowers and lifts over the last
  // metres of an end car (metres from the end, across, up, lift).
  const NOSE = [[5.0, 1, 1, 0], [3.6, 0.99, 0.985, 0], [2.4, 0.95, 0.93, 0.02], [1.4, 0.88, 0.84, 0.06], [0.7, 0.78, 0.72, 0.12], [0.25, 0.66, 0.58, 0.2], [0, 0.5, 0.44, 0.28]];
  const parts = [];
  const finish = (g, part, given) => {
    const n = g.attributes.position.count;
    let ring = given;
    if (ring === undefined) {
      ring = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        ring[i * 2] = g.attributes.position.getZ(i);
        ring[i * 2 + 1] = g.attributes.position.getY(i);
      }
    }
    g.setAttribute("aRing", new THREE.BufferAttribute(ring, 2));
    g.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
    parts.push(g);
  };
  const at = ([x, sz, sy, lift], [z, y]) => [x, 0.5 + lift + (y - 0.5) * sy, z * sz];
  const tube = (sections) => {
    // sections: [x, across, up, lift]; consecutive rings joined by quads.
    const n = RING.length;
    const pos = [];
    const ring = [];
    for (const s of sections) {
      for (const r of RING) {
        pos.push(...at(s, r));
        ring.push(...r);
      }
    }
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
    g.setAttribute("aRing", new THREE.Float32BufferAttribute(ring, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    const flat = g.toNonIndexed();
    g.dispose();
    finish(flat, 0, flat.attributes.aRing.array);
  };
  const cap = (section, out) => {
    // A flat end: a fan from the section's middle, facing `out` along x.
    const c = [0, 2.0];
    const pos = [];
    const ring = [];
    for (let i = 0; i < RING.length; i++) {
      const a = RING[i];
      const b = RING[(i + 1) % RING.length];
      for (const r of out > 0 ? [c, b, a] : [c, a, b]) {
        pos.push(...at(section, r));
        ring.push(...r);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    finish(g, 0, new Float32Array(ring));
  };
  const box = (x, y, z, sx, sy, sz, part) => {
    const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
    g.deleteAttribute("uv");
    g.translate(x, y, z);
    finish(g, part);
  };
  // A bar in the car's long section, from one point (x, y) to another.
  const bar = (x0, y0, x1, y1, z, thick, wide) => {
    const g = new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0), thick, wide).toNonIndexed();
    g.deleteAttribute("uv");
    g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
    finish(g, 3);
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
    const mid = (x0 + x1) / 2;
    for (const f of [0.2, 0.8]) {
      // A bogie: its frame, two axles of two wheels, a shoe beam each side.
      const xb = x0 + (x1 - x0) * f;
      box(xb, 0.46, 0, 2.9, 0.3, 1.24, 1);
      for (const ax of [-1.05, 1.05]) {
        for (const sd of SIDES) {
          const g = new THREE.CylinderGeometry(0.43, 0.43, 0.15, 12).rotateX(Math.PI / 2).toNonIndexed();
          g.deleteAttribute("uv");
          g.translate(xb + ax, 0.43, sd * 0.74);
          finish(g, 2);
        }
      }
      for (const sd of SIDES) box(xb, 0.2, sd * 1.02, 0.7, 0.07, 0.42, 1);
    }
    // Slung under the floor between the bogies, and on the roof.
    box(mid - 1.6, 0.3, 0, 2.6, 0.42, 2.3, 1);
    box(mid + 1.9, 0.33, 0, 1.8, 0.36, 2.0, 1);
    for (const f of [0.3, 0.72]) box(x0 + (x1 - x0) * f, 3.7, 0, 2.4, 0.2, 1.5, 3);
    if (c % 3 === (cars > 2 ? 1 : 0)) {
      // The pantograph: a frame on insulators, two arms, a head with two
      // strips against the wire.
      const xp = mid + 0.4;
      const top = wire - 0.05;
      const knee = 3.86 + (top - 3.86) * 0.52;
      box(xp, 3.74, 0, 1.5, 0.08, 1.0, 3);
      for (const sd of SIDES) box(xp, 3.82, sd * 0.38, 1.3, 0.08, 0.07, 3);
      bar(xp - 0.6, 3.86, xp + 0.35, knee, 0, 0.07, 0.5);
      bar(xp + 0.35, knee, xp - 0.3, top - 0.05, 0, 0.06, 0.36);
      for (const dx of [-0.16, 0.16]) box(xp - 0.3 + dx, top, 0, 0.07, 0.05, 1.6, 3);
    }
    if (c < cars - 1) box(x1 + GAP / 2, 2.0, 0, GAP + 0.3, 2.7, 2.5, 4);
  }
  // A coupler under each nose.
  for (const sd of SIDES) box(sd * (length / 2 - 0.2), 0.62, 0, 0.6, 0.26, 0.36, 1);
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
// (The last two are only on a car's close-up model: bright metal, and the
// number plates' faces.)
const CAR_PARTS = { body: 0, trim: 1, glass: 2, lamp_head: 3, lamp_tail: 4, glow_accent: 5, tyre: 6, rim: 7, chrome: 10, plate: 11 };
const ROOF_BAR = 8;
const ROOF_SIGN = 9;
// Within this far of the lens a car is drawn as its close-up model
// (src/world/traffic-cars-near.js, traffic-cars-near-nc.js: the same six
// cars with round wheels on spoked rims, lipped arches, smooth panels with
// cut shut lines, lamp pockets with reflectors, framed glass, mirrors,
// wipers, a grille, plates), the nearest eighteen of them at most (six on
// a phone); and
// behind its glass the shader draws its cabin and whoever drives it. (Out to
// 26 m: the street's own views see cars from 8 to 25 m off, and the mid
// model at that range read as a toy beside the S4.)
const NEAR_TO = 26;
const NEAR_MOST = 18;
const NEAR_PHONE = 6;
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

/** A motorbike or a scooter, as a car is built (front +z, on y = 0, tagged
 *  with the cars' surfaces, so it is drawn by the cars' shader in its own
 *  paint): two round wheels, and between them a frame, a tank or a
 *  floorboard and a leg shield, a seat, forks up to a handlebar, a
 *  headlamp, a tail lamp, a pipe. A simple model: it stands at a kerb among
 *  cars and is never the subject. */
function bikeGeometry(kind) {
  const parts = [];
  const add = (g, part, x, y, z, rx = 0) => {
    g = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    g.rotateX(rx);
    g.translate(x, y, z);
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(part), 1));
    parts.push(g);
  };
  const P = CAR_PARTS;
  const moto = kind === "moto";
  const base = moto ? 0.7 : 0.625;
  const r = moto ? 0.31 : 0.22;
  for (const sd of SIDES) add(new THREE.CylinderGeometry(r, r, moto ? 0.13 : 0.11, 20).rotateZ(Math.PI / 2), P.tyre, 0, r, sd * base);
  // The forks, raked back from the front hub to the bars; the bars.
  const top = moto ? 1.0 : 0.98;
  const rake = moto ? 0.24 : 0.2;
  for (const sd of SIDES) add(new THREE.BoxGeometry(0.035, Math.hypot(top - r, rake), 0.045), P.trim, sd * (moto ? 0.09 : 0.0), (top + r) / 2, base - rake / 2, -Math.atan2(rake, top - r));
  add(new THREE.CylinderGeometry(0.018, 0.018, moto ? 0.68 : 0.56, 6).rotateZ(Math.PI / 2), P.trim, 0, top + 0.02, base - rake);
  // A mudguard over the front wheel (and over a motorbike's back one).
  for (const sd of moto ? SIDES : [1]) add(new THREE.CylinderGeometry(r + 0.035, r + 0.035, moto ? 0.15 : 0.16, 10, 1, true, sd > 0 ? 0.3 : 1.2, 1.7).rotateZ(Math.PI / 2), P.body, 0, r, sd * base);
  if (moto) {
    add(new THREE.BoxGeometry(0.26, 0.3, 0.52), P.trim, 0, 0.43, 0.02);
    add(new THREE.SphereGeometry(1, 12, 8).scale(0.17, 0.13, 0.3), P.body, 0, 0.8, 0.16);
    add(new THREE.BoxGeometry(0.25, 0.07, 0.56), P.trim, 0, 0.8, -0.36);
    add(new THREE.BoxGeometry(0.2, 0.1, 0.3), P.body, 0, 0.82, -0.74, -0.2);
    add(new THREE.BoxGeometry(0.13, 0.04, 0.03), P.lamp_tail, 0, 0.84, -0.9);
    add(new THREE.CylinderGeometry(0.085, 0.07, 0.1, 12).rotateX(Math.PI / 2), P.trim, 0, 0.9, 0.56);
    add(new THREE.CircleGeometry(0.075, 12), P.lamp_head, 0, 0.9, 0.612);
    add(new THREE.CylinderGeometry(0.04, 0.045, 0.75, 8).rotateX(Math.PI / 2), P.rim, -0.17, 0.36, -0.42);
    add(new THREE.BoxGeometry(0.04, 0.03, 0.74), P.trim, 0.1, 0.36, -0.36);
  } else {
    add(new THREE.BoxGeometry(0.34, 0.07, 0.5), P.body, 0, 0.25, 0.06);
    add(new THREE.BoxGeometry(0.38, 0.55, 0.05), P.body, 0, 0.53, 0.4, -0.2);
    add(new THREE.SphereGeometry(1, 12, 8).scale(0.19, 0.2, 0.4), P.body, 0, 0.5, -0.44);
    add(new THREE.BoxGeometry(0.29, 0.07, 0.6), P.trim, 0, 0.73, -0.4);
    add(new THREE.BoxGeometry(0.12, 0.05, 0.03), P.lamp_tail, 0, 0.6, -0.84);
    add(new THREE.BoxGeometry(0.15, 0.09, 0.04), P.lamp_head, 0, 0.84, 0.47);
    add(new THREE.BoxGeometry(0.2, 0.14, 0.1), P.body, 0, 0.92, 0.4);
  }
  const geometry = creased(joined(parts));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const lampY = moto ? 0.9 : 0.84;
  return { geometry, far: geometry.clone(), box, roofY: box.max.y, head: [0.02, lampY, box.max.z], tail: [0.02, moto ? 0.84 : 0.6, box.min.z], bars: new THREE.Vector4(0.08, lampY, 0.07, moto ? 0.84 : 0.6) };
}

/** The west street's bus (front +z, on y = 0, its doors on its right) and
 *  its stop (a shelter, open toward +x, as long as z), tagged with the
 *  cars' surfaces and built as a car is. The bus: a long body with a band
 *  of windows between pillars, a windscreen under a lit board, two glazed
 *  doors, four wheels in arches, lamps at its corners, mirrors, a cooling
 *  unit on its roof. The stop: four posts, a glass back, a roof with a
 *  strip of light under it, a bench, a lit panel on one end and a sign on
 *  a pole. */
function fixedGeometry(kind) {
  const parts = [];
  const P = CAR_PARTS;
  const add = (g, part, x, y, z) => {
    g = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    g.translate(x, y, z);
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(part), 1));
    parts.push(g);
  };
  const box = (part, w, h, d, x, y, z) => add(new THREE.BoxGeometry(w, h, d), part, x, y, z);
  if (kind === "bus") {
    const L = 10.5;
    const W = 2.5;
    // The body: a skirt, the panels under the windows, the band over
    // them, a roof a little narrower with a cooling unit on it.
    box(P.trim, W - 0.06, 0.3, L - 0.3, 0, 0.42, 0);
    box(P.body, W, 0.62, L, 0, 0.86, 0);
    box(P.trim, W - 0.08, 1.14, L - 0.08, 0, 1.74, 0);
    box(P.body, W, 0.5, L, 0, 2.56, 0);
    box(P.body, W - 0.3, 0.14, L - 0.5, 0, 2.86, 0);
    box(P.trim, 1.5, 0.22, 2.6, 0, 3.02, -1.2);
    // Glass: the two flanks between pillars, the windscreen, the back.
    for (const sd of SIDES) {
      for (let z = -4.55; z < 3.2; z += 1.4) box(P.glass, 0.02, 1.02, 1.28, sd * (W / 2 - 0.03), 1.74, z + 0.7);
      box(P.trim, 0.07, 0.3, 0.16, sd * (W / 2 + 0.16), 1.9, L / 2 - 0.5);
      box(P.trim, 0.2, 0.03, 0.03, sd * (W / 2 + 0.08), 2.0, L / 2 - 0.5);
    }
    box(P.glass, W - 0.3, 1.2, 0.02, 0, 1.78, L / 2 - 0.03);
    box(P.glass, W - 0.5, 0.8, 0.02, 0, 1.86, -L / 2 + 0.03);
    box(P.glow_accent, 1.7, 0.22, 0.03, 0, 2.58, L / 2 + 0.005);
    // Its doors, on its right: two glazed leaves each, in a dark frame.
    for (const z of [3.85, -0.5]) {
      box(P.trim, 0.03, 2.0, 1.3, -W / 2 - 0.004, 1.42, z);
      for (const dz of [-0.31, 0.31]) box(P.glass, 0.02, 1.7, 0.52, -W / 2 - 0.02, 1.5, z + dz);
    }
    // Wheels in their arches, lamps, bumpers.
    for (const sd of SIDES) {
      for (const z of [-2.9, 2.9]) {
        add(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 20).rotateZ(Math.PI / 2), P.tyre, sd * (W / 2 - 0.16), 0.48, z);
        box(P.trim, 0.04, 0.2, 1.3, sd * (W / 2 + 0.005), 1.0, z);
      }
      box(P.lamp_head, 0.34, 0.14, 0.04, sd * 0.86, 0.78, L / 2 + 0.005);
      box(P.lamp_tail, 0.22, 0.3, 0.04, sd * 0.98, 0.95, -L / 2 - 0.005);
    }
    box(P.trim, W - 0.1, 0.22, 0.12, 0, 0.42, L / 2 + 0.02);
    box(P.trim, W - 0.1, 0.22, 0.12, 0, 0.42, -L / 2 - 0.02);
  } else if (kind === "leaf") {
    // A door's leaf, hinged at its front edge (the origin), reaching back:
    // its panel, the frame of its window and the pane.
    box(P.body, 0.05, 0.58, 1.12, 0, 0.6, -0.56);
    box(P.trim, 0.04, 0.04, 1.0, 0, 1.32, -0.6);
    box(P.trim, 0.04, 0.46, 0.04, 0, 1.11, -1.1);
    box(P.trim, 0.04, 0.46, 0.04, 0, 1.11, -0.08);
    box(P.glass, 0.012, 0.42, 0.98, 0, 1.1, -0.59);
    box(P.trim, 0.03, 0.5, 1.04, -0.03, 0.6, -0.56);
  } else if (kind === "lid") {
    // A boot's lid, hinged along its front edge, reaching back.
    box(P.body, 1.5, 0.04, 0.56, 0, 0, -0.28);
    box(P.trim, 1.4, 0.03, 0.5, 0, -0.03, -0.28);
  } else {
    for (const z of [-1.9, 1.9]) for (const x of [-0.72, 0.62]) box(P.trim, 0.08, 2.5, 0.08, x, 1.25, z);
    box(P.glass, 0.03, 1.9, 3.7, -0.72, 1.3, 0);
    box(P.body, 1.7, 0.08, 4.1, -0.05, 2.54, 0);
    box(P.glow_accent, 0.1, 0.03, 3.5, -0.2, 2.485, 0);
    box(P.trim, 0.42, 0.06, 2.4, -0.42, 0.5, -0.4);
    for (const z of [-1.5, 0.7]) box(P.trim, 0.36, 0.44, 0.06, -0.42, 0.25, z);
    box(P.trim, 0.1, 1.9, 1.0, -0.2, 1.3, 1.9);
    box(P.glow_accent, 0.02, 1.5, 0.8, -0.14, 1.34, 1.9);
    add(new THREE.CylinderGeometry(0.035, 0.035, 3.0, 8), P.trim, 0.55, 1.5, 2.6);
    add(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 16).rotateZ(Math.PI / 2), P.body, 0.55, 2.8, 2.6);
    box(P.glow_accent, 0.07, 0.07, 0.36, 0.55, 2.8, 2.6);
  }
  const geometry = creased(joined(parts));
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  return { geometry, far: geometry.clone(), box: b, roofY: b.max.y, head: [0.86, 0.78, b.max.z], tail: [0.98, 0.95, b.min.z], bars: new THREE.Vector4(1.03, 0.78, 1.09, 0.95) };
}

/** What a sedan may carry on a roof `y` high: a patrol car's light bar on a
 *  dark foot, and a taxi's lit sign. */
function roofUnits(y) {
  return [tagged(1.18, 0.05, 0.34, 0, y + 0.025, -0.25, ROOF_BAR), tagged(1.1, 0.09, 0.26, 0, y + 0.095, -0.25, ROOF_BAR), tagged(0.62, 0.17, 0.2, 0, y + 0.085, -0.2, ROOF_SIGN)];
}

/** A car's close-up model as one geometry (traffic-near-build.js), the
 *  body made ahead on a worker if there is one (prepareNearModels), with
 *  a sedan's roof units. */
function nearGeometry(kind, roofY, body = nearBody(kind, CAR_PARTS)) {
  return kind === "sedan" ? joined([body, ...roofUnits(roofY)]) : body;
}

// (load) The close-up models' bodies, asked of a worker as the traffic is
// made, so that none of their tenth of a second or two a kind is the
// page's: each a promise of its geometry, or of null (no worker, or it
// failed: made on the page as before). Each is taken once.
const nearMade = new Map();
function prepareNearModels() {
  if (nearMade.size || typeof Worker === "undefined") return;
  let worker;
  try {
    worker = new Worker(new URL("./traffic-near-worker.js", import.meta.url), { type: "module" });
  } catch {
    return;
  }
  const kinds = CAR_KINDS.filter((kind) => NEAR_KINDS.includes(kind));
  const settle = new Map();
  for (const kind of kinds) nearMade.set(kind, new Promise((resolve) => settle.set(kind, resolve)));
  const done = () => {
    for (const resolve of settle.values()) resolve(null);
    settle.clear();
    worker.terminate();
  };
  worker.onmessage = ({ data: { kind, attributes } }) => {
    let geometry = null;
    if (attributes) {
      geometry = new THREE.BufferGeometry();
      for (const [name, [array, size]] of Object.entries(attributes)) geometry.setAttribute(name, new THREE.BufferAttribute(array, size));
    }
    settle.get(kind)?.(geometry);
    settle.delete(kind);
    if (!settle.size) done();
  };
  worker.onerror = done;
  for (const kind of kinds) worker.postMessage({ kind, parts: CAR_PARTS });
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
    const units = roofUnits(roof.max.y - 0.01);
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
    roofY: geometry.boundingBox.max.y - 0.01,
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
  // (The bikes: no doors, no waist, no plate drawn; only their wheels.)
  moto: { seam: [99, 99, 0.2, 99], door: [99, 99], plate: [99, 99, 0], wheel: [0.7, 0.31] },
  scooter: { seam: [99, 99, 0.2, 99], door: [99, 99], plate: [99, 99, 0], wheel: [0.625, 0.22] },
  bus: { seam: [99, 99, 0.56, 1.18], door: [99, 99], plate: [0.9, 1.0, 0.26], wheel: [2.9, 0.48] },
  stop: { seam: [99, 99, 0, 99], door: [99, 99], plate: [99, 99, 0], wheel: [99, 0.3] },
  leaf: { seam: [99, 99, 0, 99], door: [99, 99], plate: [99, 99, 0], wheel: [99, 0.3] },
  lid: { seam: [99, 99, 0, 99], door: [99, 99], plate: [99, 99, 0], wheel: [99, 0.3] },
};

// A car's cabin, for the close-up model's glass to be seen through (the
// car's own frame): where the windscreen's foot is, where the cabin ends
// behind, the waist, the roof; half the cabin's width, how far off the
// middle the driver sits, where the driver's head is along the car, and how
// many rows of seats.
const CABIN = {
  hatch: [0.99, -1.7, 0.88, 1.56, 0.8, 0.36, 0.12, 2],
  sedan: [0.72, -1.8, 0.78, 1.36, 0.86, 0.38, -0.26, 2],
  van: [2.47, -2.35, 1.07, 2.24, 0.92, 0.42, 1.5, 3],
  wedge: [0.67, -1.35, 0.75, 1.14, 0.86, 0.38, -0.3, 1],
  pickup: [1.22, -0.99, 1.2, 1.89, 0.9, 0.42, 0.58, 2],
  micro: [0.98, -0.98, 0.69, 1.47, 0.62, 0.28, 0.1, 1],
  moto: [0, 0, 0, 0, 0, 0, 0, 0],
  scooter: [0, 0, 0, 0, 0, 0, 0, 0],
  bus: [0, 0, 0, 0, 0, 0, 0, 0],
  stop: [0, 0, 0, 0, 0, 0, 0, 0],
  leaf: [0, 0, 0, 0, 0, 0, 0, 0],
  lid: [0, 0, 0, 0, 0, 0, 0, 0],
};

// How far off a flying car is drawn as its own model, as its coarser self,
// and past that as its lamps alone.
const AV_DETAIL_TO = 70;
const AV_BODIES_TO = 450;
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
// A car that is driving gives way from further off: the reviews' panoramas
// and the page's own shots stand in the road, and a van going by an arm's
// length from the lens is a wall across half the frame.
const NEAR_MOVING = 2.4;

// (load) The kinds' models and the AV's, made ahead while the city's core
// is still on its way and the page has nothing else to do
// (world-scene.js preloadWorld), a model a step: they are the same whenever
// they are made. createTraffic takes each once and makes what is not there.
const ahead = new Map();
const kindModel = (kind) => (BIKES.includes(kind) ? bikeGeometry(kind) : FIXED.includes(kind) ? fixedGeometry(kind) : carGeometry(kind));
export function* makeTrafficAhead() {
  if (!ahead.has("av")) ahead.set("av", avGeometry());
  for (const kind of [...CAR_KINDS, ...BIKES, ...FIXED]) {
    yield;
    if (!ahead.has(kind)) ahead.set(kind, kindModel(kind));
  }
}
const madeAhead = (key, make) => {
  const got = ahead.get(key);
  ahead.delete(key);
  return got ?? make();
};

export function createTraffic(scene, shared, { avs = 10, cars = 4, drones = 0, police = false, reduced = false, reflectLayer = 2, rail = null, elevated = [], deckCars = 0, props = null } = {}) {
  const avGeo = madeAhead("av", avGeometry);
  const full = cars >= 4;
  if (full) prepareNearModels();
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
      varying vec3 vViewL;
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
        bool shown = length(max(max(uBoxMin - lens, lens - uBoxMax), 0.0)) >= (aState.w > 1.5 ? ${NEAR_MOVING.toFixed(2)} : ${NEAR.toFixed(2)});
        // A roof unit only on the car that carries it: the bar on a patrol
        // car (tag 1), the sign on a taxi (tag 2).
        if (aKind > 7.5 && aKind < 9.5 && abs(aKind - 7.0 - aState.z) > 0.5) shown = false;
        // The way the lens looks at this point, in the car's own frame.
        vec3 look = w.xyz - uCam;
        vViewL = vec3(dot(look, instanceMatrix[0].xyz), dot(look, instanceMatrix[1].xyz), dot(look, instanceMatrix[2].xyz));
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
      uniform vec4 uCab;
      uniform vec4 uCab2;
      uniform float uVan;
      uniform float uBus;
      // 1 on a kind's close-up model, its uniforms read through to the
      // kind's own (a uniform, not a define: near and far one program).
      uniform float uNear;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vNormalL;
      varying float vKind;
      varying vec3 vBody;
      varying vec4 vLook;
      varying vec4 vState;
      varying vec3 vLocal;
      varying vec3 vViewL;
      // (The close-up model's, uNear: called on its branches only.)
      // The cabin behind the close-up model's glass, found by following the
      // lens' ray on through the pane (all in the car's own frame): the
      // nearest thing it meets, what that is and which way it faces.
      float cabT;
      float cabM;
      vec3 cabN;
      void hitBox(vec3 ro, vec3 rd, vec3 c, vec3 h, float m) {
        vec3 inv = 1.0 / rd;
        vec3 a = (c - h - ro) * inv;
        vec3 b = (c + h - ro) * inv;
        vec3 lo = min(a, b);
        vec3 hi = max(a, b);
        float t0 = max(max(lo.x, lo.y), lo.z);
        float t1 = min(min(hi.x, hi.y), hi.z);
        if (t0 < t1 && t0 > 0.0 && t0 < cabT) {
          cabT = t0;
          cabM = m;
          cabN = -sign(rd) * step(lo.yzx, lo.xyz) * step(lo.zxy, lo.xyz);
        }
      }
      void hitBall(vec3 ro, vec3 rd, vec3 c, float r, float m) {
        vec3 oc = ro - c;
        float b = dot(oc, rd);
        float h = b * b - dot(oc, oc) + r * r;
        if (h > 0.0) {
          float t = -b - sqrt(h);
          if (t > 0.0 && t < cabT) {
            cabT = t;
            cabM = m;
            cabN = normalize(oc + rd * t);
          }
        }
      }
      void hitCap(vec3 ro, vec3 rd, vec3 pa, vec3 pb, float r, float m) {
        vec3 ba = pb - pa;
        vec3 oa = ro - pa;
        float baba = dot(ba, ba);
        float bard = dot(ba, rd);
        float baoa = dot(ba, oa);
        float rdoa = dot(rd, oa);
        float a = baba - bard * bard;
        float b = baba * rdoa - baoa * bard;
        float c = baba * dot(oa, oa) - baoa * baoa - r * r * baba;
        float h = b * b - a * c;
        if (h < 0.0) return;
        float t = (-b - sqrt(h)) / a;
        float y = baoa + t * bard;
        if (y > 0.0 && y < baba) {
          if (t > 0.0 && t < cabT) {
            cabT = t;
            cabM = m;
            cabN = normalize(oa + rd * t - ba * y / baba);
          }
          return;
        }
        vec3 oc = y <= 0.0 ? oa : ro - pb;
        b = dot(rd, oc);
        h = b * b - dot(oc, oc) + r * r;
        if (h > 0.0) {
          t = -b - sqrt(h);
          if (t > 0.0 && t < cabT) {
            cabT = t;
            cabM = m;
            cabN = normalize(oc + rd * t);
          }
        }
      }
      // Somebody in a seat, the head at h: head, neck, chest, shoulders.
      void seated(vec3 ro, vec3 rd, vec3 h, float seat) {
        hitBall(ro, rd, h, 0.105, 3.0);
        hitCap(ro, rd, h + vec3(0.0, -0.1, 0.0), h + vec3(0.0, -0.21, -0.01), 0.05, 3.0);
        hitCap(ro, rd, vec3(h.x, seat + 0.14, h.z - 0.05), h + vec3(0.0, -0.33, -0.02), 0.15, 4.0);
        hitCap(ro, rd, h + vec3(-0.17, -0.26, -0.02), h + vec3(0.17, -0.26, -0.02), 0.075, 4.0);
      }
      // What is seen through a pane at ro along rd: the dash, the seats,
      // the wheel, the driver with both hands on it (and sometimes a
      // passenger) if the car has a crew, and past them the cabin's far
      // side: trim below the waist, the street's light through the glass
      // above it. 'lightIn' is the street's light in the cabin, 'beyond'
      // what the far glass shows, 'accent' the instruments' glow.
      vec3 seeCabin(vec3 ro, vec3 rd, vec3 lightIn, vec3 beyond, vec3 accent, float crew, float seed) {
        float zw = uCab.x;
        float yb = uCab.z;
        float hw = uCab2.x;
        float dx = uCab2.y;
        float zh = uCab2.z;
        float yh = min(uCab.w - 0.2, yb + 0.42);
        float ys = yh - 0.76;
        cabT = 1e4;
        cabM = 0.0;
        cabN = vec3(0.0, 1.0, 0.0);
        hitBox(ro, rd, vec3(0.0, yb - 0.11, (zh + 0.62 + zw + 0.3) * 0.5), vec3(hw, 0.14, (zw + 0.3 - zh - 0.62) * 0.5), 1.0);
        // Two seats in front, each a back with a rounded top under a
        // headrest; a bench behind them where the car has one, and a third
        // row in a van.
        for (float sd = -1.0; sd < 1.5; sd += 2.0) {
          hitBox(ro, rd, vec3(sd * dx, ys + 0.3, zh - 0.14), vec3(0.23, 0.3, 0.055), 2.0);
          hitCap(ro, rd, vec3(sd * dx - 0.17, ys + 0.6, zh - 0.14), vec3(sd * dx + 0.17, ys + 0.6, zh - 0.14), 0.06, 2.0);
          hitCap(ro, rd, vec3(sd * dx - 0.06, yh + 0.03, zh - 0.17), vec3(sd * dx + 0.06, yh + 0.03, zh - 0.17), 0.07, 2.0);
        }
        for (float row = 1.0; row < uCab2.w - 0.5; row += 1.0) {
          float zr = zh - 0.02 - 0.96 * row;
          hitBox(ro, rd, vec3(0.0, ys + 0.26, zr), vec3(hw - 0.06, 0.28, 0.06), 2.0);
          hitCap(ro, rd, vec3(0.12 - hw, ys + 0.54, zr), vec3(hw - 0.12, ys + 0.54, zr), 0.065, 2.0);
          hitCap(ro, rd, vec3(dx - 0.06, yh - 0.02, zr - 0.02), vec3(dx + 0.06, yh - 0.02, zr - 0.02), 0.065, 2.0);
          hitCap(ro, rd, vec3(-dx - 0.06, yh - 0.02, zr - 0.02), vec3(-dx + 0.06, yh - 0.02, zr - 0.02), 0.065, 2.0);
        }
        // The wheel: a rim, a hub and three spokes, on its own tilted plane.
        vec3 wc = vec3(dx, yb + 0.02, zh + 0.5);
        vec3 wn = vec3(0.0, 0.451, -0.892);
        float dn = dot(rd, wn);
        if (abs(dn) > 1e-3) {
          float t = dot(wc - ro, wn) / dn;
          vec3 q = ro + rd * t - wc;
          float r = length(q);
          float metal = max(step(abs(r - 0.165), 0.02), step(r, 0.165) * max(step(r, 0.045), max(step(abs(q.y), 0.016), step(abs(q.x), 0.018) * step(q.y, 0.0))));
          if (t > 0.0 && t < cabT && metal > 0.5) {
            cabT = t;
            cabM = 6.0;
            cabN = -wn * sign(dn);
          }
        }
        vec3 head = vec3(dx, yh, zh);
        if (crew > 0.5) {
          seated(ro, rd, head, ys);
          vec3 left = wc + vec3(-0.15, 0.06, -0.035);
          vec3 right = wc + vec3(0.15, 0.06, -0.035);
          hitCap(ro, rd, head + vec3(-0.2, -0.27, 0.0), left, 0.045, 4.0);
          hitCap(ro, rd, head + vec3(0.2, -0.27, 0.0), right, 0.045, 4.0);
          hitBall(ro, rd, left, 0.05, 3.0);
          hitBall(ro, rd, right, 0.05, 3.0);
          if (fract(seed * 7.13) > 0.6) seated(ro, rd, vec3(-dx, yh - 0.03, zh), ys);
        }
        // Where the ray leaves the cabin if it meets nothing.
        vec3 inv = 1.0 / rd;
        vec3 far3 = max((vec3(-hw, ys - 0.3, uCab.y) - ro) * inv, (vec3(hw, uCab.w - 0.05, zw + 0.25) - ro) * inv);
        float tx = min(min(far3.x, far3.y), far3.z);
        if (cabT > tx) {
          vec3 pe = ro + rd * tx;
          if (far3.y <= far3.x && far3.y <= far3.z) return rd.y > 0.0 ? vec3(0.02, 0.021, 0.024) * (0.4 + lightIn) : vec3(0.004);
          return mix(vec3(0.012, 0.013, 0.015) * (0.4 + lightIn), beyond, smoothstep(yb + 0.02, yb + 0.09, pe.y));
        }
        vec3 at = ro + rd * cabT;
        float j = fract(seed * 3.1);
        vec3 jacket = j < 0.25 ? vec3(0.05, 0.07, 0.16) : j < 0.5 ? vec3(0.4, 0.06, 0.08) : j < 0.75 ? vec3(0.05, 0.27, 0.27) : vec3(0.42, 0.36, 0.12);
        vec3 skin = mix(vec3(0.55, 0.36, 0.26), vec3(0.3, 0.18, 0.12), fract(seed * 5.9));
        // Hair: the top and the back of a head.
        if (cabM > 2.5 && cabM < 3.5 && abs(at.y - yh) < 0.13 && abs(at.z - zh) < 0.13 && (at.y > yh + 0.03 || at.z < zh - 0.04)) skin = vec3(0.03, 0.025, 0.03);
        vec3 tone = cabM < 1.5 ? vec3(0.04, 0.041, 0.046) : cabM < 2.5 ? vec3(0.06, 0.055, 0.06) : cabM < 3.5 ? skin : cabM < 4.5 ? jacket : vec3(0.03);
        vec3 lit = vec3(0.035) + lightIn * (0.45 + 0.35 * max(cabN.y, 0.0)) + accent * 0.22 * max(dot(cabN, vec3(0.0, -0.33, 0.944)), 0.0);
        vec3 seen = tone * lit * 2.0;
        // The instruments' glow on the dash's face before the driver.
        if (cabM < 1.5 && cabN.z < -0.5 && abs(at.x - dx) < 0.17 && at.y > yb - 0.17) seen += accent * 0.45;
        return seen;
      }
      // The far side of the street as a pane or a panel gives it back:
      // where the reflected ray meets a frontage about 14 m off, a row of
      // lit signs and windows with dark between them (1 lit, 0 dark),
      // sliding over the car as it moves, as a reflection does.
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float frontage(vec3 p, vec3 R) {
        float h = length(R.xz);
        if (h < 0.05) return 0.0;
        vec2 d = R.xz / h;
        vec3 q = p + R * (14.0 / h);
        vec2 c = vec2(dot(q.xz, vec2(-d.y, d.x)) / 2.4, (q.y - 0.4) / 1.7);
        vec2 f = abs(fract(c) - 0.5);
        vec2 aa = fwidth(c) + 0.02;
        float block = (1.0 - smoothstep(0.38 - aa.x, 0.38 + aa.x, f.x)) * (1.0 - smoothstep(0.3 - aa.y, 0.3 + aa.y, f.y));
        return block * step(0.45, hash12(floor(c) + 17.0)) * smoothstep(0.0, 1.0, q.y) * (1.0 - smoothstep(10.0, 16.0, q.y));
      }
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
        float fronts = frontage(vWorld, R) * (1.0 - smoothstep(25.0, 60.0, length(vWorld - uCam)));
        signs *= 0.55 + 1.2 * fronts;
        vec3 env =mix(below, above, step(0.0, R.y)) + vec3(1.0, 0.4, 0.75) * band * 0.2 + (toward * 1.5 + uHazeColor * 0.45) * signs;
        int k = int(vKind + 0.5);
        // Its lamps go out with it where it fades.
        float lit = vLook.a * vFade;
        float far = smoothstep(10.0, 90.0, length(vWorld - uCam));
        vec3 col;
        float glow = 0.0;
        float flank = step(0.7, abs(nl.x));
        // The van's flanks and back: a row of cabin windows between pillars,
        // the rear doors' two lights and their split, a rubbing strip.
        // (uVan: a uniform, not a define, so that the van is the far cars'
        // own program; the near models never drew it.)
        if (uVan > 0.5 && uNear < 0.5) {
          if (k == 0) {
            float back = step(nl.z, -0.7);
            float pil = step(0.05, abs(fract((vLocal.z + 2.35) / 0.95) - 0.5) * 0.95);
            float win = flank * step(1.22, vLocal.y) * step(vLocal.y, 1.84) * step(-2.3, vLocal.z) * step(vLocal.z, 0.5) * pil;
            win = max(win, back * step(1.18, vLocal.y) * step(vLocal.y, 1.9) * step(abs(vLocal.x), 0.82) * step(0.04, abs(vLocal.x)));
            if (win > 0.5) k = 2;
            else if (flank * step(abs(vLocal.y - 0.55), 0.045) > 0.5) k = 1;
          }
        }
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
        if (uNear < 0.5 && k == 6 && flank > 0.5 && wr < 0.7) k = 7;
        if (k == 0) {
          // (A black car's paint is not a hole: its floor is lifted enough
          // for its shape to read under a street lamp.)
          vec3 body = vBody * (1.5 - 0.7 * vBody) + vec3(0.026);
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
          float drawn = 1.0;
          if (uNear > 0.5) {
            // (The close-up model's cuts, handles, cladding and waist strip
            // are modelled: none is drawn on it.)
            seam = 0.0;
            handle = 0.0;
            drawn = 0.0;
          }
          body *= 1.0 - 0.8 * max(seam, handle);
          // Below the doors' foot the flank is dark cladding, not paint.
          float clad = flank * (1.0 - smoothstep(uSeam.z - 0.035, uSeam.z + 0.005, vLocal.y)) * drawn;
          body = mix(body, vec3(0.016, 0.017, 0.02), clad * 0.88);
          // A flank is not one flat tone: the paint turns under toward the
          // sill and stands up to the street's light toward the shoulder.
          float turn = mix(1.0, 0.5 + 0.65 * smoothstep(uSeam.z, uSeam.w + 0.12, vLocal.y), flank);
          // A city car is not clean: the lower flank is dulled by the
          // road's spray, mottled, worst behind each wheel, with a few runs
          // down from the waist; how much is the car's own.
          float seedB = fract(vBody.r * 71.0 + vBody.g * 23.0 + vBody.b * 41.0 + vLook.g * 7.0);
          float spray = (1.0 - smoothstep(uSeam.z - 0.05, uSeam.z + 0.5, vLocal.y)) * (0.5 + 0.5 * vnoise(vec2(vLocal.z * 2.6, vLocal.y * 7.0) + seedB * 40.0));
          spray *= 0.7 + 0.5 * smoothstep(0.1, 0.9, (abs(vLocal.z) - uWheel.x) * -sign(vLocal.z) + 0.6);
          float runs = smoothstep(0.78, 0.98, vnoise(vec2(vLocal.z * 16.0 + seedB * 9.0, vLocal.y * 1.2))) * step(vLocal.y, uSeam.w) * 0.6;
          float dirt = clamp(max(spray, runs) * flank + max(-nl.y, 0.0) * 0.6, 0.0, 1.0) * (0.35 + 0.65 * seedB);
          body = mix(body, vec3(0.045, 0.04, 0.036), dirt * 0.6);
          vec3 light = vec3(0.06) + side * (0.55 + 0.35 * sky) + spill * 0.3 + lampsAt(vWorld, n) * 1.5 + (uHazeColor * 0.5 + uGlowColor * 0.3) * (0.25 + 0.75 * sky) * uHaze;
          // Where the street throws no light a car is still lit by the
          // cloud's glow over the city and still shines, so it reads as a
          // body and not as three grey wheels in the dark.
          float unlit = 1.0 - smoothstep(0.05, 0.35, dot(side + spill, vec3(0.333)));
          light += (uHazeColor * 0.6 + uGlowColor * 0.25 + vec3(0.03)) * unlit;
          col = body * light * ao * turn;
          // Wet paint: what it gives back, the sky's glow and the signs' on
          // everything that faces up, the signs' own colour in a soft band
          // along the flank under the shoulder with a line of light on the
          // crease, and a rim where it turns away from the eye, so that a
          // dark car on a dark road still has its outline.
          col += env * (0.1 + 0.08 * unlit + 0.9 * F) * 0.8 * (0.55 + 0.45 * ao) * (1.0 - 0.65 * dirt);
          col += (uHazeColor * 0.55 + uGlowColor * 0.3 + spill * 0.35) * sky * sky * 0.22;
          float sheen = exp(-pow((vLocal.y - mix(uSeam.z, uSeam.w, 0.74)) / 0.1, 2.0)) * flank * (1.0 - clad);
          col += (min(toward, vec3(1.4)) * 0.8 + min(side, vec3(1.4)) * 0.5 + uHazeColor * 0.3) * sheen * 0.2;
          col += (uHazeColor * 0.6 + side * 0.9) * smoothstep(0.004, 0.02, crease) * (1.0 - smoothstep(0.02, 0.05, crease)) * flank * 0.1 * drawn;
          col += (uHazeColor * 0.9 + side * 0.7) * pow(1.0 - ndv, 4.0) * (0.2 + 0.15 * unlit);
          col += vec3(0.5, 0.52, 0.56) * (0.03 + side * 0.4) * handle * step(-0.004, hd.y);
          // A strip of bright trim along the waist, under the glass.
          float waist = (1.0 - smoothstep(0.011, 0.011 + aa, abs(vLocal.y - uSeam.w + 0.014))) * flank * step(uBoxMin.z + 0.55, vLocal.z) * step(vLocal.z, uBoxMax.z - 0.85) * drawn;
          col = mix(col, vec3(0.5, 0.53, 0.58) * (0.035 + side * 0.55 + spill * 0.25) + env * 0.45, waist * 0.85);
        }
        else if (k == 1) col = vec3(0.011, 0.012, 0.014) + (spill * 0.07 + side * 0.1) * ao + env * (0.03 + 0.3 * F);
        else if (k == 2) {
          // Glass: dark tinted glass, wet, and most of what is seen in it
          // is what it gives back: the wet road and the kerb's light low in
          // it, the row of signs across the street in a band just over the
          // horizon, the haze and the dark sky above. Behind it a dark
          // cabin. Nobody is drawn inside on the far models: a head at
          // this size is a black blob.
          float gy = clamp((vLocal.y - uSeam.w) / max(uBoxMax.y - uSeam.w, 0.2), 0.0, 1.0);
          vec3 cabin = (vec3(0.006, 0.008, 0.013) + min(spill, vec3(1.0)) * 0.012 + vLook.rgb * 0.015 * lit) * (0.5 + 0.5 * gy);
          vec3 given = mix(min(side, vec3(1.2)) * 0.6 + uGlowColor * 0.25, uHazeColor * 0.9 + uGlowColor * 0.4 + min(toward, vec3(1.0)) * 0.25, gy);
          float bars = smoothstep(0.86, 0.97, sin((vLocal.z * 0.9 + vLocal.x * 0.9 + vLocal.y * 1.6) * 3.0));
          vec3 mirror = mix(uHazeColor * 0.05 + uGlowColor * 0.06 + min(spill, vec3(1.5)) * 0.2, uHazeColor * 0.32 * exp(-max(R.y, 0.0) * 3.0) + vec3(0.002, 0.003, 0.006), smoothstep(-0.06, 0.04, R.y));
          mirror += vec3(1.0, 0.4, 0.75) * band * 0.12 + (min(toward, vec3(1.5)) * 1.5 + uHazeColor * 0.35) * signs;
          float gives = 0.1 + 0.9 * F;
          if (uNear > 0.5) {
            // Close to, the pane is seen through, darkly: the tint passes a
            // third of the light each way, so the cabin shows only where the
            // street's light falls into it (a driver under a lamp, the dash's
            // glow on a face) and the far side's panes, through two layers
            // of tint, are a dim smear of what is beyond, never a lit screen
            // for the seats to stand black against.
            vec3 beyond = (min(spillAt(vWorld + V * 7.0), vec3(1.2)) * 0.4 + uHazeColor * 0.2 + uGlowColor * 0.1) * 0.22;
            vec3 through = seeCabin(vLocal, normalize(vViewL), min(spill * 0.8 + side * 0.3, vec3(1.1)), beyond, vLook.rgb, max(step(1.5, vState.w), vLook.a), fract(vBody.r * 97.0 + vBody.g * 31.0 + vBody.b * 57.0 + vLook.r * 13.0));
            col = through * (1.0 - F) * 0.36 + mirror * gives + given * 0.025 + (uHazeColor * 0.5 + min(side, vec3(1.0)) * 0.4) * bars * 0.05;
          } else if (uBus > 0.5) {
            // A bus at its stop is a lit room: the ceiling's light over rows
            // of seat backs, a head over some of them, and at the wheel its
            // driver.
            float across = step(0.7, abs(nl.z));
            float u = mix(vLocal.z, vLocal.x, across) / 0.82;
            float who = hash12(vec2(floor(u), 5.0 + sign(vLocal.x) + 3.0 * across));
            float cu = (fract(u) - 0.5) * 0.82;
            float seat = step(vLocal.y, 1.6) * step(abs(cu), 0.3);
            float rider = step(0.45, who) * max(step(length(vec2(cu, (vLocal.y - 1.84) / 1.15)), 0.105), step(abs(cu), 0.2) * step(vLocal.y, 1.72));
            vec3 room = vec3(1.0, 0.9, 0.72) * (0.5 + 0.4 * smoothstep(1.3, 2.25, vLocal.y));
            room = mix(room, vec3(0.1, 0.085, 0.07), max(seat * 0.8, rider));
            col = room * mix(0.9, 1.6, far) * lit * (1.0 - 0.5 * F) + cabin * (1.0 - lit) + mirror * gives;
            glow = 0.6 * lit;
          } else {
            col = cabin * (1.0 - F) + mirror * gives + given * (0.04 + 0.04 * gy) + (uHazeColor * 0.5 + min(side, vec3(1.0)) * 0.4) * bars * 0.07;
          }
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
        else if (k == 5) { col = vLook.rgb * max(mix(0.6, mix(1.5, 3.0, far), lit), 1.7 * mod(vState.w, 2.0)); glow = 1.0; }
        else if (k == 6) col = vec3(0.007) + (spill * 0.05 + side * 0.04) + (uHazeColor * 0.4 + side * 0.5) * pow(1.0 - ndv, 3.0) * 0.14 + side * 0.05 * flank * smoothstep(0.78, 0.86, wr) * (1.0 - smoothstep(0.9, 0.98, wr));
        else if (k == 7) {
          if (uNear > 0.5) {
            // The close-up rim is modelled: bright alloy, darker the deeper
            // into the wheel it is dished.
            float dish = smoothstep(uBoxMax.x - 0.2, uBoxMax.x - 0.03, abs(vLocal.x));
            col = vec3(0.28, 0.3, 0.33) * (0.04 + side * 0.9 + spill * 0.35) * (0.3 + 0.7 * dish) + env * (0.1 + 0.45 * F) * (0.35 + 0.65 * dish) * (0.45 + 0.55 * smoothstep(0.05, 0.35, dot(side + spill, vec3(0.333))));
          } else {
            // The rim: five spokes of bright alloy from a hub to the rim's
            // edge, dark between them; turning, they run together.
            float spoke = smoothstep(0.4, 0.56, abs(fract(atan(wv.y, wv.x) * 0.7958) - 0.5) * 2.0);
            float metal = mix(spoke, 0.5, lit * (1.0 - vBrake) * 0.85);
            metal = max(metal, smoothstep(0.55, 0.61, wr));
            metal = max(metal, 1.0 - smoothstep(0.13, 0.17, wr));
            metal *= 1.0 - smoothstep(0.68, 0.73, wr);
            vec3 alloy = vec3(0.36, 0.38, 0.42) * (0.045 + side * 0.9 + spill * 0.35) + env * (0.12 + 0.4 * F) * (0.45 + 0.55 * smoothstep(0.05, 0.35, dot(side + spill, vec3(0.333))));
            col = mix(vec3(0.008) + side * 0.02, alloy, metal * flank);
          }
        }
        else if (k == 10 && uNear > 0.5) {
          // Bright metal; in a lamp's pocket, the reflector behind it, lit
          // by its lamp through the ribs of a lens.
          col = vec3(0.5, 0.52, 0.56) * (0.04 + side * 0.5 + spill * 0.3) + env * (0.3 + 0.7 * F);
          float nose = step(uBoxMax.z - 0.4, vLocal.z) * step(abs(vLocal.y - uBars.y), 0.16);
          float back = step(vLocal.z, uBoxMin.z + 0.4) * step(abs(vLocal.y - uBars.w), 0.16);
          float ribs = 0.65 + 0.35 * sin(vLocal.x * 160.0);
          col += (vec3(0.92, 0.95, 1.0) * 1.3 * nose + vec3(1.0, 0.03, 0.05) * (0.7 + 0.9 * vBrake) * back) * lit * ribs;
          glow = max(nose, back) * lit * 0.6;
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
        if (uNear > 0.5 ? k == 11 : k < 2) {
          float nose = uNear > 0.5 ? step(0.0, vLocal.z) : step(0.9, nl.z) * step(uBoxMax.z - 0.06, vLocal.z);
          float back = uNear > 0.5 ? 1.0 - nose : step(0.9, -nl.z) * step(vLocal.z, uBoxMin.z + 0.06);
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
        // A door left open, or a boot (or a van's bonnet): where it was is
        // the dark of the cabin, or the engine's bay, under its own small light.
        if ((tag == 3 && vLocal.x > uBoxMax.x - 0.3 && vLocal.z < uSeam.x && vLocal.z > uDoor.x && vLocal.y > uSeam.z && vLocal.y < uBoxMax.y - 0.1) || (tag == 4 && vLocal.z < uBoxMin.z + 0.54 && vLocal.z > uBoxMin.z + 0.06 && nl.y > 0.5) || (tag == 5 && vLocal.z > uBoxMax.z - 0.36 && vLocal.z < uBoxMax.z - 0.03 && nl.y > 0.5)) {
          col = vec3(0.05, 0.04, 0.03) * (0.5 + smoothstep(uSeam.z, uBoxMax.y, vLocal.y));
          glow = 0.0;
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
  // Each craft has its own kind, paint and fans' colour (aLivery: paint
  // and kind; aGlow: fans' colour and its strobe's phase); a drone, which
  // has neither, keeps the old dark hull and cyan fans.
  const avMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute float aKind;
      attribute vec4 aLivery;
      attribute vec4 aGlow;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vNormalL;
      varying vec3 vLocal;
      varying float vKind;
      varying vec4 vLivery;
      varying vec4 vGlow;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        // (A craft is stretched along its own axes: its normals by the
        // inverse of that.)
        mat3 M = mat3(modelMatrix * instanceMatrix);
        vNormalW = normalize(M * (normal / vec3(dot(M[0], M[0]), dot(M[1], M[1]), dot(M[2], M[2]))));
        vNormalL = normal;
        vLocal = position;
        vKind = aKind;
        vLivery = aLivery;
        vGlow = aGlow;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vNormalL;
      varying vec3 vLocal;
      varying float vKind;
      varying vec4 vLivery;
      varying vec4 vGlow;
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
        int kind = int(vLivery.w + 0.5);
        vec3 nl = normalize(vNormalL);
        vec3 fans = dot(vGlow.rgb, vec3(1.0)) > 0.01 ? vGlow.rgb : vec3(0.35, 0.85, 1.0);
        vec3 spill = spillAt(vWorld);
        vec3 col;
        float glow = 1.0;
        if (k == 0) {
          // Its paint, lit by the haze over it and the street's light under
          // it, under the city given back.
          vec3 paint = max(vLivery.rgb, vec3(0.014, 0.015, 0.019));
          col = paint * (vec3(0.04) + uHazeColor * 0.45 * max(n.y, 0.0) + uGlowColor * 0.2 + spill * 0.3) + env * (0.14 + 0.82 * F);
          glow = 0.0;
          // A liner's flanks: a row of lit windows between thin frames.
          if (kind == 3 && abs(nl.x) > 0.55 && vLocal.y > 0.6 && vLocal.y < 0.86 && vLocal.z > -1.7 && vLocal.z < 1.0) {
            float frame = step(0.12, abs(fract(vLocal.z * 2.6) - 0.5) * 2.0);
            col = mix(col, vec3(1.0, 0.86, 0.62) * 1.6, frame);
            glow = frame;
          }
        }
        else if (k == 1) { col = vec3(0.006, 0.006, 0.008) + env * F * 0.35; glow = 0.0; }
        else if (k == 2) { col = vec3(0.003, 0.005, 0.009) + env * (0.08 + 0.92 * F); glow = 0.0; }
        else if (k == 3) col = (kind == 1 ? vec3(1.0, 0.8, 0.5) : kind == 2 ? vec3(1.0, 0.72, 0.32) : vec3(0.92, 0.95, 1.0)) * 7.0;
        else if (k == 4) col = vec3(1.0, 0.1, 0.24) * 5.5;
        else if (k == 5) col = fans * 2.6 * (0.85 + 0.15 * sin(uTime * 40.0 + vWorld.x));
        else col = (kind == 0 ? vec3(1.0, 0.18, 0.53) : fans) * 4.0;
        if (glow < 0.5) {
          col += spill * 0.5 * max(-n.y, 0.0);
          // Its belly lit, as a craft's is for the pads it sets down on:
          // two thin strips of its fans' colour down its length and a
          // faint wash between them, so that from under a tower a craft
          // going over is a lit shape and not a black one.
          float belly = smoothstep(0.35, 0.8, -nl.y) * step(0.5, dot(vGlow.rgb, vec3(1.0)));
          float aa = fwidth(vLocal.x) + 0.01;
          float strips = 1.0 - smoothstep(0.035, 0.035 + aa, abs(abs(vLocal.x) - 0.42));
          strips *= step(-1.9, vLocal.z) * step(vLocal.z, 1.5);
          col += fans * belly * (0.06 + 1.6 * strips);
          glow = max(glow, belly * strips);
        }
        col = cityFog(col, vWorld, glow);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  avMat.name = "avs";
  avMat.defaultAttributeValues = { ...avMat.defaultAttributeValues, aLivery: [0, 0, 0, 0], aGlow: [0, 0, 0, 0] };
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
    const livery = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, flying) * 4), 4).setUsage(THREE.DynamicDrawUsage);
    const glow = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, flying) * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aLivery", livery);
    geometry.setAttribute("aGlow", glow);
    return { mesh, n: 0, livery, glow };
  });
  const avMesh = avLevels[0].mesh;

  // The drones: one instanced draw in the AV's shader. Each flies its own
  // round of roofs, from its own point in it; every leg is worked out once
  // (how long it sits, climbs, crosses and comes down, and which way it
  // faces), so a frame only finds where in its round each drone is.
  const routes = DRONE_ROUTES.filter((x) => x.phone || drones > 5).slice(0, drones);
  const droneGeo = droneGeometry();
  // (A drone has no livery and no fans' colour: their attributes as the
  // material's defaults give them, zero, so that its draw has the AVs'
  // vertex layout and is their render pipeline, not one of its own.)
  droneGeo.setAttribute("aLivery", new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, routes.length) * 4), 4));
  droneGeo.setAttribute("aGlow", new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, routes.length) * 4), 4));
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
  // The steam vents in the road, read off the city's own anchors (they are
  // in the scene by now): no car waits or parks over one.
  const vents = [];
  scene.traverse((o) => {
    if (!o.name.startsWith("anchor_steam_")) return;
    const at = o.getWorldPosition(new THREE.Vector3());
    vents.push([o.name, at.x, at.y, at.z]);
  });
  const steam = roadVents(vents);
  const net = createNetwork({ perPlatoon: full ? 5 : 2, keep: steam });
  // The signal heads, showing the network's lights (src/world/signals.js).
  const signals = props && createSignals(props, net);
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
  const onDeck = deckCars * 4;
  const pathSlots = [];
  // Seen from the street the deck's parapet hides a car's lamps and its
  // dark roof is lost against the dark city behind: so every third car up
  // there is a van, whose roof and marker lamps stand over the parapet, and
  // the one after it a taxi with its sign lit.
  const VAN = CAR_KINDS.indexOf("van");
  const SEDAN_DECK = CAR_KINDS.indexOf("sedan");
  paths.forEach((P, k) => {
    const dress = wardrobe(613 + k * 29);
    for (let j = 0; j < onDeck; j++) {
      const x = { ...dress(), tag: TAG.none, path: { P, phase: (j + DECK_STARTS[k % 2]) / onDeck } };
      if (j % 3 === k % 3) x.kind = VAN;
      else if (j % 3 === (k + 1) % 3) Object.assign(x, { kind: SEDAN_DECK, tag: TAG.taxi, body: "#c79a12" });
      pathSlots.push(x);
    }
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
    ...createStanding({ rows: net.rows, full, steam }).map((c) => ({ ...c, parked: c })),
  ];
  // The few left open: the door's leaf swung out from its hinge at the
  // hatch's front pillar, the boot's lid up from its hinge under the
  // sedan's back glass, each in its car's paint (the shader darkens the
  // opening it left). (And the broken-down van's bonnet, traffic-park.js:
  // the same lid turned round, up from its hinge at the windscreen's foot.)
  const ALL_KINDS = [...CAR_KINDS, ...BIKES, ...FIXED];
  for (const x of slots.slice()) {
    if (x.parked === undefined || (x.tag !== TAG.door && x.tag !== TAG.boot && x.tag !== TAG.bonnet)) continue;
    const door = x.tag === TAG.door;
    const bonnet = x.tag === TAG.bonnet;
    const [lx, ly, lz] = door ? [0.86, 0, 0.86] : bonnet ? [0, 1.4, 2.3] : [0, 0.885, -1.89];
    const c = Math.cos(x.parked.yaw);
    const sn = Math.sin(x.parked.yaw);
    const at = { x: x.parked.x + c * lx + sn * lz, y: ly, z: x.parked.z - sn * lx + c * lz, yaw: x.parked.yaw - (door ? 1.05 : 0) + (bonnet ? Math.PI : 0), tilt: door ? 0 : 1.15 };
    slots.push({ kind: ALL_KINDS.indexOf(door ? "leaf" : "lid"), body: x.body, accent: x.accent, tag: TAG.none, glow: false, parked: at, lidOf: x });
  }
  const UPRIGHT = new THREE.Vector3(0, 1, 0);
  const ALONG = new THREE.Vector3(0, 0, 1);
  for (const x of slots) {
    x.paint = new THREE.Color(x.body);
    x.neon = new THREE.Color(x.accent);
    // A taxi waits and a patrol car stands with their lamps on; the rest of
    // the parked are dark.
    x.lit = !x.parked || x.tag !== TAG.none || !!x.parked.lit;
    if (x.parked) {
      // (Where it stands: lifted and leant over if it is up on a kerb or
      // on a stand.)
      x.at = new THREE.Vector3(x.parked.x, x.parked.y ?? 0, x.parked.z);
      x.turn = new THREE.Quaternion().setFromAxisAngle(UPRIGHT, x.parked.yaw);
      if (x.parked.roll) x.turn.multiply(new THREE.Quaternion().setFromAxisAngle(ALONG, x.parked.roll));
      if (x.parked.tilt) x.turn.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), x.parked.tilt));
    }
  }
  // A material a kind over the same uniforms (a clone would copy them, and
  // stop the clock) with the kind's own box; the same source gives the same
  // program, the van's and the bus's too (uVan, uBus). Each kind is two draws: its
  // own model for the ones close by, the coarser one for the rest.
  const kinds = [...CAR_KINDS, ...BIKES, ...FIXED].map((kind, k) => {
    const built = madeAhead(kind, () => kindModel(kind));
    const detail = DETAIL[kind];
    const uniforms = { ...carUniforms, uBoxMin: { value: built.box.min }, uBoxMax: { value: built.box.max }, uBars: { value: built.bars }, uSeam: { value: new THREE.Vector4(...detail.seam) }, uDoor: { value: new THREE.Vector4(...detail.door, 0, 0) }, uPlate: { value: new THREE.Vector3(...detail.plate) }, uWheel: { value: new THREE.Vector2(...detail.wheel) }, uCab: { value: new THREE.Vector4(...CABIN[kind].slice(0, 4)) }, uCab2: { value: new THREE.Vector4(...CABIN[kind].slice(4)) }, uVan: { value: kind === "van" ? 1 : 0 }, uBus: { value: kind === "bus" ? 1 : 0 }, uNear: { value: 0 } };
    const material = new THREE.ShaderMaterial({ uniforms, ...carShader });
    material.name = kind === "van" ? "traffic_van" : kind === "bus" ? "traffic_bus" : "traffic";
    const mine = slots.filter((x) => x.kind === k);
    for (const x of mine) x.lamps = built;
    const n = Math.max(1, mine.length);
    // Room for every car of the kind in either; each frame the ones in view
    // are written to the front of one or the other and its count set.
    const level = (geometry, name, paint = material, room = n) => {
      const look = new THREE.InstancedBufferAttribute(new Float32Array(room * 4), 4).setUsage(THREE.DynamicDrawUsage);
      const state = new THREE.InstancedBufferAttribute(new Float32Array(room * 4), 4).setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("aLook", look);
      geometry.setAttribute("aState", state);
      const mesh = new THREE.InstancedMesh(geometry, paint, room);
      mesh.name = name;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(room * 3), 3).setUsage(THREE.DynamicDrawUsage);
      mesh.layers.enable(reflectLayer);
      mesh.count = 0;
      scene.add(mesh);
      return { mesh, look, state, attributes: [mesh.instanceMatrix, mesh.instanceColor, look, state], geometry, n: 0 };
    };
    return { kind, built, uniforms, level, levels: [level(built.geometry, `traffic_${kind}`), level(built.far, `traffic_${kind}_far`)], material, near: null, nearMaterial: null };
  });
  // The close-up models (a desktop's only): a third level a kind, with its
  // own material (the same source with the cabin seen through the glass and
  // nothing drawn on the body that the model has cut into it). They are
  // built one a turn once the city is up, so the city is not kept waiting
  // for them; until a kind's is there, its cars are drawn as they were.
  // (Begun by the first update, the city's first frame: begun here, they
  // were built while the warm-up waited on its shaders, before that frame.)
  // A phone has them too, fewer at a time (NEAR_PHONE), asked of the
  // worker only once the city is drawing (its download is a phone's
  // slowest time) and never made on the page: with no worker, a phone's
  // close cars stay as they were.
  let alive = true;
  let startNear = null;
  const nearMost = full ? NEAR_MOST : NEAR_PHONE;
  {
    let next = 0;
    const build = async () => {
      if (alive === false || next >= kinds.length) return;
      const K = kinds[next++];
      if (CAR_KINDS.includes(K.kind) === false) return void setTimeout(build, 0);
      // (load: its body from the worker, if it was asked for; null, made
      // here.)
      const made = nearMade.get(K.kind);
      nearMade.delete(K.kind);
      if (!full && !made) return void setTimeout(build, 0);
      const body = made ? await made : null;
      if (alive === false) return void body?.dispose();
      if (!full && !body) return void setTimeout(build, 0);
      K.nearMaterial = new THREE.ShaderMaterial({ uniforms: Object.create(K.uniforms, { uNear: { value: { value: 1 }, enumerable: true } }), ...carShader });
      K.nearMaterial.name = "traffic_near";
      K.near = K.level(nearGeometry(K.kind, K.built.roofY, body ?? undefined), `traffic_${K.kind}_near`, K.nearMaterial, nearMost);
      K.levels.push(K.near);
      setTimeout(build, 0);
    };
    startNear = () => {
      startNear = null;
      if (!full) prepareNearModels();
      setTimeout(build, 0);
    };
  }
  // The cars close enough for it this frame, to be sorted if there are more
  // than a dozen.
  const nearby = Array.from({ length: 48 }, () => ({ x: null, shown: 1, braking: 0, off: 0, p: new THREE.Vector3(), q: new THREE.Quaternion() }));
  let nearN = 0;
  // A car's four corner lamps, in its own frame: the hazards' places.
  const corners = (L) => [L.head, [-L.head[0], L.head[1], L.head[2]], L.tail, [-L.tail[0], L.tail[1], L.tail[2]]];
  const standingLit = slots.filter((x) => x.parked && x.lit).length;
  const patrols = slots.filter((x) => x.tag === TAG.patrol).length;
  const hazards = slots.filter((x) => x.parked?.hazard).length;

  // Lamps: two per aerial vehicle, four per car with its lamps on, four a
  // hazard car, two a patrol car's bar, three per drone, and the police
  // AV's light bar.
  const lampCount = flying * 5 + (moving + pathSlots.length + standingLit + hazards) * 5 + patrols * 2 + rounds.length * 3 + (police ? 2 : 0) + 12;
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

  // What a flying car leaves behind it: one streak of its thrusters' light,
  // as long as it is fast, brightest at the craft and thinning away to
  // nothing; a ribbon turned to face the lens, one instance a craft. (It
  // was three sprites in a row, which a still showed as three dots.)
  const trailGeo = new THREE.InstancedBufferGeometry();
  trailGeo.index = quad.index;
  trailGeo.setAttribute("position", quad.attributes.position);
  const trailFrom = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, flyers) * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const trailBack = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, flyers) * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const trailTone = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, flyers) * 4), 4).setUsage(THREE.DynamicDrawUsage);
  trailGeo.setAttribute("aFrom", trailFrom);
  trailGeo.setAttribute("aBack", trailBack);
  trailGeo.setAttribute("aTone", trailTone);
  trailGeo.instanceCount = 0;
  const trailMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec3 aFrom;
      attribute vec3 aBack;
      attribute vec4 aTone;
      uniform vec3 uCam;
      varying vec2 vUv;
      varying vec3 vTone;
      void main() {
        float u = position.x + 0.5;
        vec3 w = aFrom + aBack * u;
        vec3 side = normalize(cross(aBack, w - uCam));
        w += side * position.y * aTone.a * (1.0 - 0.65 * u);
        vUv = vec2(u, position.y * 2.0);
        vTone = aTone.rgb;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vTone;
      void main() {
        float across = exp(-vUv.y * vUv.y * 5.0) * smoothstep(1.0, 0.7, abs(vUv.y));
        float along = pow(1.0 - vUv.x, 1.6) * smoothstep(0.0, 0.04, vUv.x);
        gl_FragColor = vec4(vTone * across * along * 1.5, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  trailMat.name = "trails";
  const trails = new THREE.Mesh(trailGeo, trailMat);
  trails.name = "trails";
  trails.frustumCulled = false;
  trails.renderOrder = 7;
  trails.layers.enable(reflectLayer);
  scene.add(trails);

  // What a car's lamps do to the wet road, and it is not much: a soft patch
  // of white a couple of metres out from each headlamp, a shorter one of
  // red behind the tail (a little more under the brakes), each far dimmer
  // than the lamp that throws it and gone within a metre or two; and under
  // a car whose sill strips are lit, a thin line of their colour along each
  // sill. The road takes them as it takes the street's own light: dull on
  // dry asphalt, less in standing water, and given back as a sheen where
  // the road is damp and the eye looks along the light (the road's own
  // field of damp, src/world/road.js, without its lanes). One flat quad a
  // car, laid along its own line (so it climbs the ramp with it), added to
  // the road under it; a parked car has one only if it glows or is lit.
  const POOLS_TO = 90;
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
      varying vec3 vW;
      varying vec3 vAxis;
      void main() {
        // Metres in the car's own frame: across it, and along it (ahead is
        // plus), from three metres behind its tail to five ahead of its
        // nose. (aFwd is the way it faces, as long as half its width.)
        float hw = length(aFwd);
        vP = vec2(position.x * (2.0 * hw + 3.0), position.z * (2.0 * aMode.w + 8.0) + 1.0);
        vec3 f = aFwd / hw;
        vec3 r = normalize(vec3(f.z, 0.0, -f.x));
        vec3 w = aAt + r * vP.x + f * vP.y + vec3(0.0, 0.045, 0.0);
        vTint = aTint;
        vMode = aMode;
        vW = w;
        vAxis = vec3(f.x, f.z, hw);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${VNOISE}
      varying vec2 vP;
      varying vec3 vTint;
      varying vec4 vMode;
      varying vec3 vW;
      varying vec3 vAxis;
      void main() {
        float ahead = vP.y - vMode.w;
        float behind = -vP.y - vMode.w;
        float hw = vAxis.z;
        // How wet the road is here, as the road has it.
        vec2 pr = mat2(0.8, -0.6, 0.6, 0.8) * vW.xz;
        float n1 = vnoise(pr * 0.07) * 0.7 + vnoise(pr.yx * 0.19 + 2.1) * 0.3;
        float n2 = vnoise(pr.yx * 0.23 + 5.3) * 0.75 + vnoise(pr * 0.61 + 8.7) * 0.25;
        float broad = n1 * 0.3 + n2 * 0.45 + 0.125;
        float damp = smoothstep(0.3, 0.6, broad);
        float puddle = smoothstep(0.615, 0.69, broad + 0.03);
        vec3 toEye = uCam - vW;
        float dist = length(toEye);
        vec3 V = toEye / dist;
        float fres = 0.3 + 0.7 * pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
        // Toward the eye along the car's line: +1 looking at its nose.
        float along = dot(normalize(V.xz + 1e-5), vAxis.xy);
        float matte = 0.5 * mix(1.0, 0.45, puddle);
        float wet = mix(0.3, 1.0, damp) * fres;
        float headLight = matte + 1.3 * wet * (0.35 + 0.65 * pow(max(along, 0.0), 2.0));
        float tailLight = matte + 1.3 * wet * (0.35 + 0.65 * pow(max(-along, 0.0), 2.0));
        // A patch out from each headlamp, running together as they thin.
        float lampX = hw * 0.66;
        float head = smoothstep(-0.3, 0.5, ahead) * exp(-max(ahead, 0.0) * 0.75) * exp(-pow((abs(vP.x) - lampX) / (0.42 + max(ahead, 0.0) * 0.25), 2.0));
        float tail = smoothstep(-0.2, 0.3, behind) * exp(-max(behind, 0.0) * 1.3) * exp(-pow(vP.x / (hw * 0.85), 2.0));
        // Under it: a line along each sill, between the wheels.
        float sill = abs(vP.x) - hw;
        float under = (exp(-pow((sill - 0.03) / 0.07, 2.0)) + 0.16 * exp(-pow(sill / 0.3, 2.0))) * (1.0 - smoothstep(vMode.w - 1.5, vMode.w - 0.9, abs(vP.y)));
        vec3 col = vec3(0.8, 0.88, 1.0) * head * vMode.x * 0.2 * headLight + vec3(1.0, 0.03, 0.05) * tail * vMode.y * 0.15 * tailLight + vTint * under * vMode.z * 0.42 * (matte + wet);
        gl_FragColor = vec4(col * (1.0 - smoothstep(${(POOLS_TO * 0.55).toFixed(1)}, ${POOLS_TO.toFixed(1)}, dist)), 1.0);
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

  // What a car stands on: the road under it is in its shadow, darkest
  // between its wheels and at each tyre's foot and soft for a hand's width
  // past its sills and bumpers, so a car sits on the wet road and does not
  // hover over it. One flat quad a car drawn in the street within SHADE_TO
  // (the same quad as the pools, laid along its line), multiplied into
  // what is under it, the road's mirror with it.
  const SHADE_TO = 110;
  const shadeMax = Math.max(1, slots.length);
  const shadeGeo = new THREE.InstancedBufferGeometry();
  shadeGeo.index = flat.index;
  shadeGeo.setAttribute("position", flat.attributes.position);
  const shadeAt = new THREE.InstancedBufferAttribute(new Float32Array(shadeMax * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const shadeFwd = new THREE.InstancedBufferAttribute(new Float32Array(shadeMax * 4), 4).setUsage(THREE.DynamicDrawUsage);
  shadeGeo.setAttribute("aAt", shadeAt);
  shadeGeo.setAttribute("aFwd", shadeFwd);
  shadeGeo.instanceCount = 0;
  const shadeMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec4 aAt;
      attribute vec4 aFwd;
      uniform vec3 uCam;
      varying vec2 vP;
      varying vec3 vSize;
      void main() {
        // aAt: where it stands, and how much of it is there; aFwd: the way
        // it faces (as long as half its width), and half its length.
        float hw = length(aFwd.xyz);
        vec3 f = aFwd.xyz / hw;
        vec3 r = normalize(vec3(f.z, 0.0, -f.x));
        vP = vec2(position.x * (2.0 * hw + 1.6), position.z * (2.0 * aFwd.w + 1.6));
        vec3 w = aAt.xyz + r * vP.x + f * vP.y + vec3(0.0, 0.035, 0.0);
        float dist = length(uCam - w);
        vSize = vec3(hw, aFwd.w, aAt.w * (1.0 - smoothstep(${(SHADE_TO * 0.6).toFixed(1)}, ${SHADE_TO.toFixed(1)}, dist)));
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vP;
      varying vec3 vSize;
      void main() {
        // How far outside its footprint (a little inside its sills and
        // bumpers), and its four tyres' feet.
        vec2 e = abs(vP) - vSize.xy + vec2(0.12, 0.3);
        float out_ = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
        float under = 1.0 - smoothstep(-0.5, 0.5, out_);
        vec2 t = abs(vP) - vec2(vSize.x - 0.24, vSize.y * 0.66);
        float tyre = exp(-dot(t, t) / 0.09);
        float dark = clamp(0.5 * under + 0.4 * tyre * under + 0.18 * (1.0 - smoothstep(-0.2, 0.8, out_)), 0.0, 0.82) * vSize.z;
        gl_FragColor = vec4(vec3(1.0 - dark), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.SrcColorFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  shadeMat.name = "shades";
  const shades = new THREE.Mesh(shadeGeo, shadeMat);
  shades.name = "shades";
  shades.frustumCulled = false;
  shades.renderOrder = 5;
  scene.add(shades);

  // The trains. One model (trainGeometry) on two lines. On the viaduct at
  // the avenue's far end (anchor_rail), six cars: out of the portal in
  // Japantown's collar, across the avenue's glow at the vanishing point and
  // into the station, and back out the other way half a minute later. On
  // Corpo Row's elevated track, two cars at a time: out of the west block's
  // portal, into the halt behind the towers, half a minute standing there
  // lit, then on into the corner block's portal, the next one following, so
  // the halt has a train in it most of the time and another is often on its
  // way. A train is only drawn between its line's portals.
  //
  // It is a pale steel train in its line's livery: a broad band of the
  // line's colour under the windows and another along the cant rail (the
  // one a street under a viaduct sees), each with a lit strip, and doors in
  // the same colour, two a side. Its windows are a lit carriage seen into:
  // the far wall with its own dark windows and a row of cards over them,
  // the ceiling's two strips of light, benches in the line's colour, people
  // seated along both walls and standing down the middle. Its nose is glass
  // over a lit bar and two lamp clusters, white going and red coming, with
  // an amber board in the top of the glass. From down the avenue it is the
  // row of lights it always was.
  const CAR = 18;
  // Corpo Row's track (scripts/blender/ncw/districts/corpo_north.py: its
  // TRACK_Z and TRACK_Y, its two portals, the middle of its halt). It has
  // no anchor of its own yet, so its numbers are here. `wire`: how high
  // over the rail each line's contact wire hangs.
  const CORPO_TRACK = { z: -378.5, y: 19, x0: 133, x1: 432, halt: 246, wire: 4.7 };
  // And its boulevard line (scripts/blender/ncw/districts/corpo_line.py:
  // LINE_Z, LINE_Y, the west station's open east face, the east station's
  // end wall and its middle): the guideway along the boulevard's south kerb.
  const CORPO_LINE = { z: -320.3, y: 20.5, x0: 167, x1: 366, halt: 355, wire: 4.7 };
  const VIADUCT_WIRE = 5.5;
  const trainShader = {
    vertexShader: /* glsl */ `
      attribute vec2 aRing;
      attribute float aPart;
      varying vec3 vLocal;
      varying vec3 vNormalL;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vRing;
      varying float vPart;
      void main() {
        vLocal = position;
        vNormalL = normal;
        vRing = aRing;
        vPart = aPart;
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
      uniform vec3 uLivery;
      varying vec3 vLocal;
      varying vec3 vNormalL;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vRing;
      varying float vPart;
      // Somebody on the plane 'depth' metres into the carriage, where the
      // ray from o along d (going in at dz a metre) meets it: one every
      // 'pitch' metres or nobody, the head at 'head'. Colour and cover.
      vec4 rider(vec3 o, vec3 d, float dz, float depth, float reach, float pitch, float head, float seed, float foot, float rate) {
        float t = depth / dz;
        if (t > reach) return vec4(0.0);
        float x = o.x + d.x * t;
        float y = o.y + d.y * t;
        float h = hash12(vec2(floor(x / pitch), seed));
        if (h > rate) return vec4(0.0);
        h = fract(h * 37.7);
        float cx = (fract(x / pitch) - 0.5) * pitch + (fract(h * 7.3) - 0.5) * 0.14;
        float hy = head + (fract(h * 13.7) - 0.5) * 0.12;
        float inHead = step(length(vec2(cx, (y - hy) / 1.15)), 0.105);
        float body = step(abs(cx), 0.21 - 0.09 * smoothstep(hy - 0.3, hy - 0.15, y)) * step(y, hy - 0.12) * step(foot, y);
        float neck = step(abs(cx), 0.05) * step(hy - 0.15, y) * step(y, hy);
        float j = fract(h * 3.1);
        vec3 jacket = j < 0.25 ? vec3(0.05, 0.07, 0.16) : j < 0.5 ? vec3(0.45, 0.06, 0.08) : j < 0.75 ? vec3(0.05, 0.3, 0.3) : vec3(0.5, 0.42, 0.12);
        vec3 skin = mix(vec3(0.55, 0.36, 0.26), vec3(0.3, 0.18, 0.12), fract(h * 5.9));
        vec3 face = mix(skin, vec3(0.03, 0.025, 0.03), step(hy + 0.035, y));
        return vec4(mix(jacket, face, max(inHead, neck)), max(inHead, max(body, neck)));
      }
      void main() {
        // Inside a portal it is in the block, not in the street.
        if (vWorld.x < uClip.x || vWorld.x > uClip.y) discard;
        float LEN = uLen;
        const float carLen = ${CAR.toFixed(1)};
        float u = vLocal.x + LEN * 0.5;
        float car = floor(u / carLen);
        float inCar = u - car * carLen;
        // Where on the car's full section this is: the nose draws the
        // section in, and its bands, glass and lamps go with it.
        float y = vRing.y;
        float rz = vRing.x;
        vec3 nl = normalize(vNormalL);
        vec3 n = normalize(vNormalW);
        vec3 toHere = vWorld - uCam;
        float dist = length(toHere);
        vec3 V = toHere / dist;
        float F = 0.04 + 0.96 * pow(1.0 - abs(dot(V, n)), 5.0);
        // Which end leads, and how far from the nearer end this point is.
        float lead = uDir > 0.0 ? LEN * 0.5 - vLocal.x : vLocal.x + LEN * 0.5;
        float tail = LEN - lead;
        float end = min(lead, tail);
        float front = step(lead, tail);
        // What it gives back: the lit air under it and the haze over it;
        // and what lights it: the street's light on the side it faces and
        // from below, the glow overhead.
        vec3 R = reflect(V, n);
        vec3 env = mix(uHazeColor * 0.45 + uGlowColor * 0.7, uHazeColor * 0.25 * exp(-max(R.y, 0.0) * 4.0), step(0.0, R.y));
        float sky = max(n.y, 0.0);
        vec3 spill = spillAt(vWorld);
        vec3 light = vec3(0.045) + spillAt(vWorld + vec3(n.x, 0.0, n.z) * 6.0) * 0.5 + spill * 0.3 * max(-n.y, 0.0) + (uHazeColor * 0.5 + uGlowColor * 0.3) * (0.25 + 0.75 * sky) * uHaze;
        float glow = 0.0;
        vec3 col;
        int part = int(vPart + 0.5);
        if (part == 1) col = vec3(0.03) * light + vec3(0.004);
        else if (part == 2) col = vec3(0.06) * light + env * 0.2 * F + vec3(0.004);
        else if (part == 3) col = vec3(0.12, 0.125, 0.135) * light + env * 0.15 * F;
        else if (part == 4) col = vec3(0.012) * light + vec3(0.003);
        else {
          float sideF = step(0.6, abs(nl.z));
          float roof = smoothstep(3.3, 3.42, y);
          vec3 paint = mix(vec3(0.5, 0.52, 0.55), vec3(0.13, 0.135, 0.15), roof);
          float gloss = mix(0.4, 0.12, roof);
          paint = mix(paint, uLivery, max(step(0.74, y) * step(y, 1.38), step(2.76, y) * step(y, 3.06)));
          if (y < 0.74) paint = vec3(0.045, 0.047, 0.052);
          // The passengers' part of a side: its band of windows, and two
          // doors, a quarter and three quarters along.
          float pass = sideF * step(3.0, end);
          float dq = min(abs(inCar - carLen * 0.25), abs(inCar - carLen * 0.75));
          float door = step(dq, 0.68) * pass;
          if (pass > 0.5 && y > 1.46 && y < 2.68) paint = vec3(0.03, 0.032, 0.036);
          if (door > 0.5 && y > 0.62 && y < 2.9) paint = uLivery * 0.9;
          float seam = door * step(0.62, y) * step(y, 2.9) * max(step(abs(dq - 0.68), 0.03), step(dq, 0.015));
          paint = mix(paint, vec3(0.004), seam);
          col = paint * light * 1.1 + env * (0.04 + 0.6 * F) * gloss;
          // A lit strip along the cant rail and one under the windows.
          float strip = max(step(abs(y - 2.72), 0.03), step(abs(y - 1.42), 0.025)) * step(2.5, end) * (1.0 - door) * step(abs(nl.x), 0.5);
          col = mix(col, uLivery * 1.5, strip);
          glow = max(glow, strip * 0.8);
          // Windows between pillars, a pane every 1.55 m between the doors;
          // a narrow one in each door leaf.
          float pane = fract((inCar - 0.4) / 1.55);
          float win = (1.0 - door) * step(0.1, pane) * step(pane, 0.9) * step(1.5, y) * step(y, 2.62);
          win += door * step(0.12, dq) * step(dq, 0.56) * step(1.62, y) * step(y, 2.52);
          win *= pass * step(0.9, inCar) * step(inCar, carLen - 0.9);
          if (win > 0.5) {
            // Seen into: the ray goes on through the glass to the far wall
            // (2.84 m in), the ceiling (3.3) or the floor (1.02).
            float dz = max(-sign(vLocal.z) * V.z, 0.02);
            float tFar = 2.84 / dz;
            float tY = V.y > 0.0 ? (3.3 - vLocal.y) / max(V.y, 1e-4) : (1.02 - vLocal.y) / min(V.y, -1e-4);
            float t = min(tFar, tY);
            vec3 hit = vec3(vLocal.x + V.x * t, vLocal.y + V.y * t, dz * t);
            float hu = hit.x + LEN * 0.5;
            float hc = hu - floor(hu / carLen) * carLen;
            vec3 inside;
            if (tFar <= tY) {
              // The far wall: its own windows with the night behind them,
              // the benches' backs under them, a row of cards over them,
              // its doors.
              float fp = fract((hc - 0.4) / 1.55);
              float fdq = min(abs(hc - carLen * 0.25), abs(hc - carLen * 0.75));
              inside = mix(vec3(0.74, 0.72, 0.66), vec3(0.03, 0.04, 0.07), step(0.1, fp) * step(fp, 0.9) * step(1.5, hit.y) * step(hit.y, 2.62));
              if (hit.y < 1.95) inside = uLivery * 0.55 + 0.05;
              float cardAt = floor(hc / 0.9);
              if (hit.y > 2.72 && hit.y < 2.98) inside = mix(inside, 0.25 + 0.6 * vec3(hash12(vec2(cardAt, 1.0)), hash12(vec2(cardAt, 2.0)), hash12(vec2(cardAt, 3.0))), step(0.08, fract(hc / 0.9)) * 0.8);
              if (fdq < 0.68) inside = mix(vec3(0.6, 0.6, 0.58), vec3(0.03, 0.04, 0.07), step(0.12, fdq) * step(fdq, 0.56) * step(1.62, hit.y) * step(hit.y, 2.52));
            } else if (V.y > 0.0) {
              // The ceiling: two strips of light along it.
              inside = mix(vec3(0.6, 0.6, 0.56), vec3(2.2), min(step(abs(hit.z - 0.85), 0.11) + step(abs(hit.z - 1.99), 0.11), 1.0));
            } else {
              // The floor, and the bench along the far wall.
              inside = hit.z > 2.3 ? uLivery * 0.5 + 0.04 : vec3(0.16, 0.16, 0.17);
            }
            // Its people: seated along the far wall, standing down the
            // middle, seated with their backs to this window.
            vec4 who = rider(vLocal, V, dz, 2.5, t, 0.62, 2.14, 3.0 + car, 1.5, 0.45);
            inside = mix(inside, who.rgb, who.a);
            who = rider(vLocal, V, dz, 1.42, t, 1.3, 2.62, 7.0 + car, 1.02, 0.34);
            inside = mix(inside, who.rgb, who.a);
            who = rider(vLocal, V, dz, 0.28, t, 0.62, 2.14, 11.0 + car, 1.5, 0.4);
            inside = mix(inside, who.rgb * 0.55, who.a);
            vec3 room = mix(vec3(1.0, 0.9, 0.74), vec3(0.82, 0.92, 1.0), step(0.7, hash12(vec2(car, 9.0))));
            // Softer close to, where it would only blow out; from down the
            // avenue a row of lights.
            inside = mix(inside, vec3(0.8), smoothstep(160.0, 420.0, dist)) * room;
            col = inside * mix(0.55, 2.2, smoothstep(100.0, 450.0, dist)) + env * (0.03 + 0.5 * F);
            glow = 0.8;
          }
          if (end < 5.0) {
            // The cab: glass wrapped round the nose, dark, the sky in it
            // and the desk's glow low in it; an amber board in its top; a
            // lit bar under it; a cluster of lamps each side below that.
            float cab = step(end, 2.5) * step(1.62, y) * step(y, 3.02);
            vec3 glass = vec3(0.004, 0.006, 0.01) + env * (0.12 + 0.9 * F) + vec3(0.25, 0.5, 0.6) * 0.05 * smoothstep(2.1, 1.62, y);
            col = mix(col, mix(glass, vec3(0.01), max(step(y, 1.68), step(2.96, y))), cab);
            float cell = rz / 0.14;
            float board = step(1.45, end) * step(end, 2.3) * step(2.74, y) * step(y, 2.94) * step(abs(rz), 0.75) * step(0.2, fract(cell)) * step(0.3, hash12(vec2(floor(cell), 5.0)));
            float bar = step(end, 1.9) * step(abs(y - 1.5), 0.04);
            float lamp = step(end, 1.0) * step(0.92, y) * step(y, 1.34) * step(0.62, abs(rz)) * step(abs(rz), 1.32);
            vec3 going = front > 0.5 ? vec3(1.0, 0.95, 0.85) : vec3(1.0, 0.05, 0.1);
            col = mix(col, vec3(1.0, 0.6, 0.12) * 2.2 * front + vec3(0.02), board);
            col = mix(col, going * mix(2.0, 1.4, front), bar);
            col = mix(col, going * mix(3.0, 6.0, front), lamp);
            glow = max(glow, max(lamp, max(bar, board * front) * 0.8));
          }
        }
        col = cityFog(col, vWorld, max(glow, 0.15));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };
  /** A train of `cars` on a line (the rail's height, where it runs across
   *  x, the two portals it is drawn between, its wire's height), in the
   *  line's livery, going where `at(clock)` says: the middle of it along x,
   *  which way it faces, or null when it is out of sight in a block. */
  const trains = [];
  const addTrain = (cars, line, livery, at) => {
    const geometry = trainGeometry({ length: cars * CAR, cars, wire: line.wire });
    const material = new THREE.ShaderMaterial({ uniforms: { ...shared, uDir: { value: 1 }, uLen: { value: cars * CAR }, uClip: { value: new THREE.Vector2(line.x0, line.x1) }, uLivery: { value: new THREE.Color(livery) } }, ...trainShader });
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
    // back. At second 12, where the reviews' stills hold it, its nose is
    // over the avenue's east kerb, lamps on, coming out from the west.
    const line = { y: rail.position.y, z: rail.position.z, x0: rail.extras?.x0 ?? -94, x1: rail.extras?.x1 ?? 92, wire: VIADUCT_WIRE };
    const L = 6 * CAR;
    addTrain(6, line, "#d9620f", (clock) => {
      const t = wrapTo(clock - 3, 64);
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
      addTrain(2, line, "#0d8c9e", (clock) => {
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
  {
    // The boulevard line: out of the west station's east face (where the
    // builder's own train stands) gathering speed, along the guideway over
    // the boulevard's south kerb and slowing into the east station (18 s),
    // standing there lit (30 s), then on into the station's end wall (8 s);
    // two trains, 46 s apart, so the station has a train in it two thirds
    // of the time and the guideway one going along it every 46 s. At second
    // 12 one is over the boulevard's middle (x 252) and the other is going
    // into the end wall.
    const line = CORPO_LINE;
    const L = 2 * CAR;
    for (const start of [3, 49]) {
      addTrain(2, line, "#0d8c9e", (clock) => {
        const t = wrapTo(clock - start, 92);
        if (t >= 56) return null;
        run.dir = 1;
        const from = line.x0 - L / 2;
        const to = line.x1 + L / 2;
        if (t < 18) run.x = from + (line.halt - from) * smoother(t / 18);
        else if (t < 48) run.x = line.halt;
        else run.x = line.halt + (to - line.halt) * ((t - 48) / 8) ** 2;
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
  const seen = (at, turned, box, near) => {
    lens.copy(shared.uCam.value).sub(at);
    if (lens.lengthSq() > 100) return 1;
    lens.applyQuaternion(unturn.copy(turned).invert());
    const d = Math.hypot(Math.max(box.min.x - lens.x, lens.x - box.max.x, 0), Math.max(box.min.y - lens.y, lens.y - box.max.y, 0), Math.max(box.min.z - lens.z, lens.z - box.max.z, 0));
    return d >= near ? 1 : 0;
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
  let visibleSphere = null;
  // (And how long the lens is: a far craft's lamps are grown to a share of
  // the frame, which on a phone's narrow frame or a long lens is fewer
  // degrees.)
  let wide = 1;
  lamps.onBeforeRender = (renderer, drawn, camera) => {
    if (!camera.layers.isEnabled(0)) return;
    view.setFromProjectionMatrix(viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    wide = Math.min(1, 1.13 / camera.projectionMatrix.elements[0]);
    viewed = true;
  };
  const BODIES_TO = full ? 340 : 240;
  const LAMPS_TO = 900;
  const pose = { x: 0, z: 0, fx: 0, fz: 1, brake: 0 };
  /** One more car of its kind this frame, at P turned Q, in one of its
   *  levels: 0 its own model, 1 the coarser one, 2 the close-up one. */
  const put = (x, shown, braking, level, P = p, Q = q) => {
    const L = kinds[x.kind].levels[level];
    const j = L.n++;
    m.compose(P, Q, one).toArray(L.mesh.instanceMatrix.array, j * 16);
    x.paint.toArray(L.mesh.instanceColor.array, j * 3);
    x.neon.toArray(L.look.array, j * 4);
    L.look.array[j * 4 + 3] = x.lit ? 1 : 0;
    L.state.array[j * 4] = shown;
    L.state.array[j * 4 + 1] = braking;
    L.state.array[j * 4 + 2] = x.tag;
    // Whether it glows underneath, and (two more) whether it is driving.
    L.state.array[j * 4 + 3] = (x.glow ? 1 : 0) + (x.parked ? 0 : 2);
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
    if (visibleSphere && !visibleSphere(p.x, p.y, p.z, ball.radius)) return false;
    if (view.intersectsSphere(ball)) return true;
    ball.center.y = -p.y;
    return view.intersectsSphere(ball);
  };
  /** One more flying car this frame, at p turned q: a lane's craft `c` in
   *  its own kind's shape, paint and fans, or (none given) a runabout in
   *  gunmetal, as the police's, the pads' and the drones' are. */
  const GUNMETAL = [0.05, 0.055, 0.065];
  const body = (s, c = null) => {
    if (far2 > AV_BODIES_TO * AV_BODIES_TO) return;
    const K = CRAFT[c ? c.kind : 0];
    const reach = s * Math.max(K.scale[0], K.scale[2]);
    const L = avLevels[far2 < AV_DETAIL_TO * AV_DETAIL_TO * reach * reach ? 0 : 1];
    const j = L.n++;
    m.compose(p, q, scale.set(K.scale[0] * s, K.scale[1] * s, K.scale[2] * s)).toArray(L.mesh.instanceMatrix.array, j * 16);
    const paint = c ? c.paint : GUNMETAL;
    L.livery.setXYZW(j, paint[0], paint[1], paint[2], c ? c.kind : 0);
    L.glow.setXYZW(j, K.thrust[0], K.thrust[1], K.thrust[2], c ? (c.k * 0.618) % 1 : 0);
  };
  /** Where a car is at second `at` of the clock, into p and q; and into
   *  `now` how much of it is drawn and whether it is braking. */
  const now = { shown: 1, braking: 0 };
  const locate = (x, at) => {
    now.shown = 1;
    now.braking = 0;
    if (x.car) {
      // On the network: where its route's timetable has it this second.
      // (`late`, `held`: free roam has made it wait, see `cars` below.)
      net.place(x.car, at - (x.late || 0), pose);
      p.set(pose.x, 0, pose.z);
      q.setFromAxisAngle(UP, Math.atan2(pose.fx, pose.fz));
      now.braking = x.held ? 1 : pose.brake;
    } else if (x.path) {
      // On the ramp and the deck: where its axles are along the line gives
      // its place, its heading and its pitch on the slope. It fades in and
      // out over the last metres of the line, the lamps by their brightness
      // and the body by its dither.
      const { P, phase: ph } = x.path;
      const t = ((((ph + ((at - (x.late || 0)) * P.v) / P.len) % 1) + 1) % 1);
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
  // (For walk(): the seconds free roam has made a network car late.)
  const slotOf = new Map(slots.filter((x) => x.car).map((x) => [x.car, x]));
  const lateOf = (car) => slotOf.get(car)?.late || 0;
  // Where the things the city hears are (soundscape.js): the AVs, the
  // police, and the train while it crosses.
  const voices = { on: true, avs: Array.from({ length: avs }, () => new THREE.Vector3()), police: police ? new THREE.Vector3() : null, train: null };

  const update = (dt, on) => {
    startNear?.();
    droneMesh.visible = lamps.visible = pools.visible = shades.visible = trails.visible = on;
    for (const l of avLevels) l.mesh.visible = on;
    for (const k of kinds) for (const l of k.levels) l.mesh.visible = on;
    voices.on = on;
    if (!on) {
      for (const T of trains) T.mesh.visible = false;
      voices.train = null;
      return;
    }
    if (!reduced && !frozen) clock += dt;
    signals?.update(clock);
    let li = 0;
    let ti = 0;
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
      body(s, c);
      // Its lamps grow with distance past 75 m, to five times at 375 m on
      // a desktop's lens, so a craft across the district still reads as
      // its lights and not as a speck; each kind's in its own colour and
      // size (a hauler's amber and big, a courier's warm and small).
      // Looked down on from far off (a lens flying over the roofs, the
      // craft 90 m and more away), a craft's lamps point along its way and
      // not up at the lens: they grow less with distance, and its head lamps
      // are bright only to a lens it is coming toward, its tail only to one
      // it is going away from, so from over a district the sky beyond the
      // near craft is lamps white, red or dim as each flies, and not a field
      // of like white dots. Near, or from the street, level or under them,
      // they are as they were.
      const K = CRAFT[c.kind];
      const [sx, sy, sz] = K.scale;
      const dist = Math.sqrt(far2) || 1;
      const over = Math.min(1, Math.max(0, ((shared.uCam.value.y - p.y) / dist - 0.05) / 0.3)) * Math.min(1, Math.max(0, (dist - 90) / 110));
      const toward = ((shared.uCam.value.x - p.x) * fwd.x + (shared.uCam.value.z - p.z) * fwd.z) / dist;
      const g = s * Math.max(1, Math.min(5 - 3.5 * over, dist / 75) * wide);
      const headK = 1 - over * (0.8 - 0.8 * Math.max(0, toward));
      const tailK = 1 - over * (0.75 - 0.75 * Math.max(0, -toward));
      const nose = 2.6 * sz * s;
      const [hr, hg, hb] = K.head;
      setLamp(li++, p.x + fwd.x * nose, p.y + 0.25 * sy * s, p.z + fwd.z * nose, 0.82 * hr * headK, 0.82 * hg * headK, 0.82 * hb * headK, 1.2 * g * K.lamp * Math.sqrt(headK));
      setLamp(li++, p.x - fwd.x * nose, p.y + 0.4 * sy * s, p.z - fwd.z * nose, tailK, 0.1 * tailK, 0.25 * tailK, 0.9 * g * K.lamp * Math.sqrt(tailK));
      // Running lights, as an aircraft has: red on its left, green on its
      // right, at the hull's widest, and over it a white strobe (a
      // hauler's amber beacon, slower), each craft on its own beat.
      if (far2 < 380 * 380) {
        const gn = s * Math.max(1, Math.min(3 - 1.6 * over, dist / 75) * wide);
        const wing = 1.7 * sx * s;
        const y = p.y + 0.45 * sy * s;
        setLamp(li++, p.x - fwd.z * wing, y, p.z + fwd.x * wing, 0.9, 0.05, 0.06, 0.45 * gn);
        setLamp(li++, p.x + fwd.z * wing, y, p.z - fwd.x * wing, 0.05, 0.9, 0.3, 0.45 * gn);
        const beat = (clock + c.k * 0.618) % (c.kind === 2 ? 1 : 1.3);
        const on = reduced ? 0.3 : c.kind === 2 ? (beat < 0.45 ? 1 : 0) : beat < 0.08 ? 1 : 0;
        if (on > 0) setLamp(li++, p.x, p.y + 1.15 * sy * s, p.z, on, on * (c.kind === 2 ? 0.55 : 1), on * (c.kind === 2 ? 0.12 : 1), 0.7 * gn);
      }
      // The streak of its fans' light behind it: longer the faster it
      // flies, as wide as its lamps are grown, in its fans' colour; a
      // hauler leaves none.
      if (K.streak > 0) {
        const len = Math.min(30, Math.max(10, c.v * 1.2)) * s * K.streak;
        trailFrom.setXYZ(ti, p.x - fwd.x * (nose + 0.1), p.y + 0.3 * sy * s, p.z - fwd.z * (nose + 0.1));
        trailBack.setXYZ(ti, -fwd.x * len, 0, -fwd.z * len);
        trailTone.setXYZW(ti, K.thrust[0], K.thrust[1], K.thrust[2], 0.55 * g);
        ti++;
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
    nearN = 0;
    let pi = 0;
    let si = 0;
    for (const x of slots) {
      locate(x, clock);
      const { shown, braking } = now;
      const off = p.distanceToSquared(shared.uCam.value);
      if (off > LAMPS_TO * LAMPS_TO) continue;
      if (visibleSphere) {
        x.lamps.box.getBoundingSphere(ball);
        ball.center.applyQuaternion(q).add(p);
        if (!visibleSphere(ball.center.x, ball.center.y, ball.center.z, ball.radius + 1)) continue;
      }
      if (viewed) {
        ball.center.copy(p);
        ball.radius = 18;
        if (!view.intersectsSphere(ball)) continue;
      }
      if (off < SHADE_TO * SHADE_TO && shown > 0 && !x.lidOf) {
        // Its shadow on the road, laid along its line (a car on the ramp
        // pitched on it: its line's flat heading, as near as it matters).
        fwd.set(0, 0, 1).applyQuaternion(q);
        fwd.y = 0;
        fwd.normalize().multiplyScalar(x.lamps.box.max.x);
        shadeAt.setXYZW(si, p.x, p.y, p.z, shown);
        shadeFwd.setXYZW(si, fwd.x, 0, fwd.z, x.lamps.box.max.z);
        si++;
      }
      if (off < NEAR_TO * NEAR_TO && kinds[x.kind].near && nearN < nearby.length) {
        const c = nearby[nearN++];
        c.x = x;
        c.shown = shown;
        c.braking = braking;
        c.off = off;
        c.p.copy(p);
        c.q.copy(q);
      } else if (off < BODIES_TO * BODIES_TO) put(x, shown, braking, off < DETAIL_TO * DETAIL_TO ? 0 : 1);
      if (!x.lit && !x.parked?.hazard && !x.glow) continue;
      const glow = shown * seen(p, q, x.lamps.box, x.parked ? NEAR : NEAR_MOVING);
      if (off < POOLS_TO * POOLS_TO && glow > 0 && (x.lit || x.glow)) {
        // Its light on the road: its lamps' if they are on (low on a car
        // that stands), its strips' if it has them lit.
        const on = x.lit ? (x.parked ? 0.45 : 1) * glow : 0;
        fwd.set(0, 0, 1).applyQuaternion(q).multiplyScalar(x.lamps.box.max.x);
        p.toArray(poolAt.array, pi * 3);
        fwd.toArray(poolFwd.array, pi * 3);
        x.neon.toArray(poolTint.array, pi * 3);
        poolMode.array[pi * 4] = on;
        poolMode.array[pi * 4 + 1] = on * (1 + 0.6 * braking);
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
      // A van that is driving has marker lamps at its roof's corners, amber
      // ahead and red behind, as a working van has: up there they show over
      // a parapet or a queue of cars.
      if (x.kind === VAN && !x.parked) {
        const box = x.lamps.box;
        for (const sd of SIDES) {
          tmp.set(sd * box.max.x * 0.82, box.max.y - 0.04, box.max.z - 0.35).applyQuaternion(q).add(p);
          setLamp(li++, tmp.x, tmp.y, tmp.z, 1.0 * glow, 0.55 * glow, 0.12 * glow, 0.5);
          tmp.set(sd * box.max.x * 0.82, box.max.y - 0.04, box.min.z + 0.2).applyQuaternion(q).add(p);
          setLamp(li++, tmp.x, tmp.y, tmp.z, 0.9 * glow, 0.04 * glow, 0.05 * glow, 0.45);
        }
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
    // The nearest eighteen as their close-up models; any more as they were.
    const close = nearN > nearMost ? nearby.slice(0, nearN).sort((a, b) => a.off - b.off) : nearby;
    for (let i = 0; i < nearN; i++) put(close[i].x, close[i].shown, close[i].braking, i < nearMost ? 2 : 0, close[i].p, close[i].q);
    voices.train = null;
    for (const T of trains) {
      const at = T.at(clock);
      T.mesh.visible = !!at;
      if (!at) continue;
      T.mesh.position.set(at.x, T.line.y, T.line.z);
      T.material.uniforms.uDir.value = at.dir;
      // Its lamps' glow, where an end of it is out between the portals:
      // white ahead, red behind.
      for (const sd of SIDES) {
        const x = at.x + sd * at.dir * (T.length / 2 - 0.3);
        if (x < T.line.x0 || x > T.line.x1) continue;
        for (const side of SIDES) {
          if (sd > 0) setLamp(li++, x, T.line.y + 1.25, T.line.z + side * 0.55, 0.9, 0.88, 0.8, 1.5);
          else setLamp(li++, x, T.line.y + 1.25, T.line.z + side * 0.55, 0.9, 0.04, 0.08, 1.0);
        }
      }
      // The one the city hears is the viaduct's.
      if (rail && T === trains[0]) voices.train = T.mesh.position;
    }
    // A model nothing is drawn of this frame is not a draw (and its buffers
    // are not sent: an update of no length is taken to mean all of it).
    for (const L of avLevels) {
      L.mesh.count = L.n;
      L.mesh.visible = L.n > 0;
      if (!L.n) continue;
      L.mesh.instanceMatrix.clearUpdateRanges();
      L.mesh.instanceMatrix.addUpdateRange(0, L.n * 16);
      L.mesh.instanceMatrix.needsUpdate = true;
      for (const a of [L.livery, L.glow]) {
        a.clearUpdateRanges();
        a.addUpdateRange(0, L.n * 4);
        a.needsUpdate = true;
      }
    }
    droneMesh.instanceMatrix.needsUpdate = true;
    for (const K of kinds) {
      for (const L of K.levels) {
        L.mesh.count = L.n;
        L.mesh.visible = L.n > 0;
        if (!L.n) continue;
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
    shadeGeo.instanceCount = si;
    for (const a of [shadeAt, shadeFwd]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, si * a.itemSize);
      a.needsUpdate = true;
    }
    lampGeo.instanceCount = li;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    trailGeo.instanceCount = ti;
    for (const a of [trailFrom, trailBack, trailTone]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, ti * a.itemSize);
      a.needsUpdate = true;
    }
  };

  return {
    update,
    // Repack the current instant for a real pass camera without advancing
    // the traffic clock. Main and mirror keep independent portal lists.
    prepare(camera, testSphere) {
      view.setFromProjectionMatrix(viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      viewed = true;
      visibleSphere = testSphere;
      update(0, voices.on);
    },
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
    /** Dev: each signal head and the lens it has lit (src/world/signals.js). */
    signals: () => signals?.lenses() ?? [],
    /** Dev: each crossing's signal box with lights to show and what it
     *  shows (src/world/signals.js). */
    signalBoxes: () => signals?.boxes() ?? [],
    /** For the crowd: whether someone who steps off now onto the crossing
     *  on one arm of a junction gets over it with no car near them. The
     *  junction by its centre (x, z; the nearest within 30 m), the arm by
     *  the side of the junction it is on: "n" toward -z, "s" toward +z, "e"
     *  toward +x, "w" toward -x; they start `from` metres off the road's
     *  middle (below 0 toward the lower x or z) and walk over at `pace`
     *  metres a second. True or false; null where there is no junction.
     *  (The timetable's own answer, not the lights': a car turning right
     *  comes onto an arm while that arm's own traffic is held.) */
    walk: (x, z, arm, from, pace) => net.walk(clock, x, z, arm, from, pace, lateOf),
    /** For the crowd: where the traffic over the crossing on one arm (as
     *  walk()'s) has lights, whether the box over it shows the figure now,
     *  on the traffic's clock: () => true or false. Null elsewhere. */
    sign(x, z, arm) {
      const shows = signals?.crossing(x, z, arm);
      return shows ? () => shows(clock) : null;
    },
    /** Dev: where every flying car on a lane is at this second of the clock
     *  (the sky checks count them from the street and from the air). */
    flying() {
      return craft.map((c) => {
        craftAt(c, clock, sky);
        return { x: sky.x, y: sky.y, z: sky.z, kind: CRAFT[c.kind].name, level: c.level };
      });
    },
    /** Free roam (src/braindance/roam/yield.js): the cars themselves, for
     *  the player to be stopped by and for them to stop for the player. It
     *  makes a car wait by setting its `late` (seconds behind its timetable)
     *  and `held` (its brake lamps); nothing else ever sets them. */
    cars: () => ({ slots, net, onPath, time: () => clock }),
    /** Dev: every car there is at this second of the clock, drawn or not
     *  (the road checks count them from a driver's seat): where it is, the
     *  way it faces, its model, its size, whether it stands. */
    vehicles() {
      return slots.map((x) => {
        locate(x, clock);
        fwd.set(0, 0, 1).applyQuaternion(q);
        const size = x.lamps.box;
        return { x: p.x, y: p.y, z: p.z, fx: fwd.x, fz: fwd.z, kind: kinds[x.kind].kind, tag: x.tag, body: x.body, parked: !!x.parked, length: size.max.z - size.min.z, width: size.max.x - size.min.x, height: size.max.y };
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
      scene.remove(trails);
      trailGeo.dispose();
      trailMat.dispose();
      scene.remove(pools, shades);
      shadeGeo.dispose();
      shadeMat.dispose();
      flat.dispose();
      poolGeo.dispose();
      poolMat.dispose();
      for (const l of avLevels) l.mesh.dispose();
      avFar.dispose();
      alive = false;
      for (const k of kinds) {
        k.material.dispose();
        k.nearMaterial?.dispose();
        for (const l of k.levels) {
          l.geometry.dispose();
          l.mesh.dispose();
        }
      }
    },
  };
}
