// src/world/traffic.js: the city moving on its own.
//
// Aerial vehicles on slow loops over the avenue's canyon and the districts
// (ten on desktop, four on a phone), and cars on the avenue's lanes (eight,
// four: twice the tier's count, two or one to a lane, evenly spaced and at
// the lane's own speed so nobody meets anybody) driving away up the street
// on the right and toward the lens on the left, their lamps in the wet
// road's mirror, fading in and out where the loop ends rather than
// appearing. A few more stand parked: along the avenue's left kerb, clear of
// the S4's own on the right, and down the garage street, one of them with
// its hazards blinking. The cars are three original designs
// (src/world/traffic-cars.js), each its own colour and accent; each kind is
// one instanced draw, and every lamp is one instanced sprite batch. The
// `traffic` switch in env.js parks all of it.
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
import { createObject as createCarModel, KINDS as CAR_KINDS } from "./traffic-cars.js";

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

// The cars' surfaces, by the model's material names (traffic-cars.js).
const CAR_PARTS = { body: 0, trim: 1, glass: 2, lamp_head: 3, lamp_tail: 4, glow_accent: 5, tyre: 6, rim: 7 };

/** A car of one kind as one geometry (as avGeometry builds the AV's), and
 *  where its lamps are: the outer ends of its head and tail light bars, in
 *  its own frame (front +z). */
function carGeometry(kind) {
  const model = createCarModel(kind);
  model.updateMatrixWorld(true);
  const parts = [];
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
    if (k === 3) head.union(g.boundingBox);
    if (k === 4) tail.union(g.boundingBox);
    parts.push(g);
  });
  const geometry = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  model.traverse((o) => o.isMesh && o.geometry.dispose());
  return {
    geometry,
    head: [head.max.x * 0.82, (head.min.y + head.max.y) / 2, head.max.z],
    tail: [tail.max.x * 0.82, (tail.min.y + tail.max.y) / 2, tail.min.z],
  };
}

// Parked: up the avenue's left kerb (the S4 parks on the right), clear of
// the hero's near frame, and down the garage street's kerbs, which the
// flight in comes down past. One blinks its hazards.
const PARKED = [
  { x: -8.4, z: -66, yaw: 0 },
  { x: -8.4, z: -96, yaw: Math.PI },
  { x: -8.5, z: -118, yaw: 0 },
  { x: -8.4, z: -152, yaw: Math.PI },
  { x: 432.6, z: -268, yaw: 0, hazard: true },
  { x: -8.4, z: -73, yaw: 0 },
  { x: -8.5, z: -134, yaw: 0 },
  { x: 432.6, z: -283, yaw: Math.PI },
  { x: 447.4, z: -300, yaw: Math.PI },
];
// Paint and accent per car: dark metallics mostly, a pearl white, a red, a
// cab yellow now and then; the accents are the city's neons.
const BODY = ["#25282e", "#121316", "#8f949b", "#561018", "#132440", "#5d636b", "#0f3a3b", "#9c7c0c"];
const ACCENT = ["#27dcf2", "#ff2e88", "#ffb254", "#a24bff", "#39ff9a", "#ff3fd2"];

// Lanes over the canyon and the districts: centre, radii, altitude, speed,
// and the size of what flies it.
const SKY_LANES = [
  { c: [0, -420], r: [150, 60], y: 58, v: 26 },
  { c: [20, -520], r: [220, 40], y: 82, v: 34 },
  { c: [-10, -300], r: [120, 90], y: 46, v: 22 },
  // Across the moon, seen from the garage's roof (fourth, so a phone's four
  // take it too): a heavier craft, slower, so that 300 m off it crosses the
  // disc as a silhouette with its lamps lit and not as a speck.
  { c: [620, 120], r: [200, 70], y: 150, v: 30, s: 2.6 },
  { c: [200, -300], r: [260, 120], y: 95, v: 38 },
  { c: [320, -260], r: [140, 70], y: 70, v: 28 },
  { c: [0, -650], r: [260, 60], y: 110, v: 42 },
  { c: [90, -200], r: [160, 110], y: 64, v: 30 },
  { c: [-40, -560], r: [90, 180], y: 52, v: 24 },
  { c: [420, -250], r: [120, 160], y: 58, v: 26 },
];
// The avenue's lanes: x, direction of travel along z, speed.
const ROAD_LANES = [
  { x: 5.2, dir: -1, v: 15 },
  { x: -5.0, dir: 1, v: 13 },
  { x: 1.8, dir: -1, v: 18 },
  { x: -1.8, dir: 1, v: 16 },
];
const ROAD_FAR = -600;
/** On for the first half of every second of `t`, off for the rest. */
const step = (t) => (t - Math.floor(t) < 0.5 ? 1 : 0);
const ROAD_NEAR = -40;

export function createTraffic(scene, shared, { avs = 10, cars = 4, drones = 0, police = false, reduced = false, reflectLayer = 2, rail = null } = {}) {
  const avGeo = avGeometry();
  // The street's cars: wet paint giving back the lit street and the glow
  // over it, dark tinted glass, lit light bars on the ones that are driving,
  // their accents in their own neon, and a dithered fade (per car, aFade)
  // where the loop lets them in and out, so nothing pops at the kerb of the
  // intersection.
  const carMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute float aKind;
      attribute vec4 aLook;
      attribute float aFade;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vKind;
      varying vec3 vBody;
      varying vec4 vLook;
      varying float vFade;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vKind = aKind;
        #ifdef USE_INSTANCING_COLOR
        vBody = instanceColor;
        #else
        vBody = vec3(0.2);
        #endif
        vLook = aLook;
        vFade = aFade;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vKind;
      varying vec3 vBody;
      varying vec4 vLook;
      varying float vFade;
      void main() {
        if (vFade < 0.999 && hash12(floor(gl_FragCoord.xy)) > vFade) discard;
        vec3 n = normalize(vNormalW);
        vec3 V = normalize(vWorld - uCam);
        vec3 R = reflect(V, n);
        float F = 0.04 + 0.96 * pow(1.0 - abs(dot(V, n)), 5.0);
        // What the paint gives back: the lit street under it, the band of
        // neon at the horizon, the haze over it and the dark above.
        float band = exp(-abs(R.y) * 12.0);
        vec3 spill = spillAt(vWorld);
        vec3 below = uHazeColor * 0.35 + uGlowColor * 0.6 + spill * 0.8;
        vec3 above = uHazeColor * 0.3 * exp(-max(R.y, 0.0) * 4.0) + vec3(0.004, 0.004, 0.008);
        vec3 env = mix(below, above, step(0.0, R.y)) + vec3(1.0, 0.4, 0.75) * band * 0.3;
        int k = int(vKind + 0.5);
        float lit = vLook.a;
        vec3 col;
        float glow = 0.0;
        // Grounded: darker toward the sills and into the arches, the roof
        // and the hood lifted by the glow overhead.
        float ao = 0.35 + 0.65 * smoothstep(0.12, 1.1, vWorld.y);
        float sky = max(n.y, 0.0);
        if (k == 0) col = vBody * (0.03 + spill * 0.6 * (0.5 + 0.5 * sky) + lampsAt(vWorld, n) * 1.5 + (uHazeColor * 0.25 + uGlowColor * 0.15) * sky * uHaze) * ao + env * (0.06 + 0.94 * F) * 0.7 * (0.55 + 0.45 * ao);
        else if (k == 1) col = vec3(0.008, 0.009, 0.011) + spill * 0.08 + env * F * 0.3;
        else if (k == 2) col = vec3(0.003, 0.005, 0.009) + env * (0.06 + 0.94 * F);
        else if (k == 3) { col = mix(vec3(0.06, 0.065, 0.07), vec3(0.92, 0.95, 1.0) * 6.5, lit); glow = lit; }
        else if (k == 4) { col = mix(vec3(0.08, 0.008, 0.012), vec3(1.0, 0.07, 0.15) * 4.5, lit); glow = lit; }
        else if (k == 5) { col = vLook.rgb * mix(0.6, 3.0, lit); glow = 1.0; }
        else if (k == 6) col = vec3(0.006, 0.006, 0.007) + spill * 0.05;
        else col = vec3(0.02, 0.022, 0.026) + env * 0.35;
        col = cityFog(col, vWorld, glow);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  carMat.name = "traffic";
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
  // The police AV is one more of them, after the rest.
  const flying = avs + (police ? 1 : 0);
  const avMesh = new THREE.InstancedMesh(avGeo, avMat, Math.max(1, flying));
  avMesh.frustumCulled = false;
  avMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  avMesh.layers.enable(reflectLayer);
  scene.add(avMesh);
  avMesh.count = flying;

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

  // The cars: the moving ones first, then the parked; each its kind, its
  // paint and accent, from a seeded draw so the street is the same street
  // every visit.
  const moving = cars * 2;
  const parked = PARKED.slice(0, cars >= 4 ? PARKED.length : 5);
  let seed = 7;
  const draw = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const slots = [];
  for (let i = 0; i < moving + parked.length; i++) {
    slots.push({ kind: Math.floor(draw() * CAR_KINDS.length), body: BODY[Math.floor(draw() * BODY.length)], accent: ACCENT[Math.floor(draw() * ACCENT.length)], parked: i >= moving ? parked[i - moving] : null });
  }
  const color = new THREE.Color();
  const kinds = CAR_KINDS.map((kind, k) => {
    const built = carGeometry(kind);
    const mine = slots.filter((x) => x.kind === k);
    const n = Math.max(1, mine.length);
    const look = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    const fade = new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1), 1).setUsage(THREE.DynamicDrawUsage);
    built.geometry.setAttribute("aLook", look);
    built.geometry.setAttribute("aFade", fade);
    const mesh = new THREE.InstancedMesh(built.geometry, carMat, n);
    mesh.name = `traffic_${kind}`;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.layers.enable(reflectLayer);
    mine.forEach((x, j) => {
      x.mesh = mesh;
      x.index = j;
      x.lamps = built;
      mesh.setColorAt(j, color.set(x.body));
      color.set(x.accent);
      look.setXYZW(j, color.r, color.g, color.b, x.parked ? 0 : 1);
    });
    mesh.count = mine.length;
    scene.add(mesh);
    return { mesh, fade, geometry: built.geometry };
  });
  // The parked ones stand still: placed once.
  for (const x of slots) {
    if (!x.parked) continue;
    const { mesh, index } = x;
    mesh.setMatrixAt(index, new THREE.Matrix4().compose(new THREE.Vector3(x.parked.x, 0, x.parked.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), x.parked.yaw), new THREE.Vector3(1, 1, 1)));
  }

  // Lamps: two per aerial vehicle, four per moving car, four hazards, three
  // per drone, and the police AV's light bar.
  const hazard = parked.find((x) => x.hazard);
  const lampCount = flying * 2 + moving * 4 + (hazard ? 4 : 0) + rounds.length * 3 + (police ? 2 : 0);
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
  lampGeo.instanceCount = lampCount;
  const lampMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec3 aPos;
      attribute vec4 aCol;
      varying vec4 vCol;
      varying vec2 vUv;
      void main() {
        vec4 mv = viewMatrix * vec4(aPos, 1.0);
        mv.xy += position.xy * aCol.a;
        gl_Position = projectionMatrix * mv;
        vCol = aCol;
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

  // The train on the viaduct at the avenue's far end (anchor_rail): six
  // cars (trainGeometry), sliding across the glow at the vanishing point
  // every half minute or so, one way and then the other. Its windows are a
  // lit carriage each, between pillars, two doors a side, a passenger or
  // two against the light, over a stripe of the line's colour; its body
  // gives back the city's glow; its nose carries the headlamps going and
  // the tail lamps coming. The windows are as bright as the old ones at the
  // vanishing point and softer close to, where they would only blow out.
  const TRAIN = { length: 108, cars: 6, period: 32, crossing: 13, span: 340 };
  const trainGeo = trainGeometry(TRAIN);
  const trainMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uDir: { value: 1 } },
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
      varying vec3 vLocal;
      varying vec3 vNormalL;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        const float LEN = ${TRAIN.length.toFixed(1)};
        float carLen = LEN / ${TRAIN.cars.toFixed(1)};
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
  });
  trainMat.name = "train";
  const train = new THREE.Mesh(trainGeo, trainMat);
  train.name = "train";
  train.visible = false;
  train.layers.enable(reflectLayer);
  if (rail) scene.add(train);

  // Evenly spaced along each lane, so two cars in one never meet.
  const perLane = Math.max(1, Math.ceil(moving / ROAD_LANES.length));
  const phase = [
    ...Array.from({ length: avs }, () => Math.random()),
    ...Array.from({ length: moving }, (_, i) => (Math.floor(i / ROAD_LANES.length) + 0.25 * Math.random()) / perLane + (i % ROAD_LANES.length) * 0.17),
  ];
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
  const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);
  const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const setLamp = (i, x, y, z, r, g, b, size) => {
    lampPos[i * 3] = x;
    lampPos[i * 3 + 1] = y;
    lampPos[i * 3 + 2] = z;
    lampCol[i * 4] = r;
    lampCol[i * 4 + 1] = g;
    lampCol[i * 4 + 2] = b;
    lampCol[i * 4 + 3] = size;
  };
  let clock = 0;
  let frozen = false;

  const update = (dt, on) => {
    avMesh.visible = droneMesh.visible = lamps.visible = on;
    for (const k of kinds) k.mesh.visible = on;
    if (!on) {
      train.visible = false;
      return;
    }
    if (!reduced && !frozen) clock += dt;
    let li = 0;
    for (let i = 0; i < avs; i++) {
      const L = SKY_LANES[i % SKY_LANES.length];
      const circ = Math.PI * (L.r[0] + L.r[1]);
      const a = (phase[i] + (clock * L.v) / circ) * Math.PI * 2 * (i % 2 ? -1 : 1);
      p.set(L.c[0] + Math.cos(a) * L.r[0], L.y + Math.sin(a * 2.0 + i) * 3, L.c[1] + Math.sin(a) * L.r[1]);
      const b = a + (i % 2 ? -0.01 : 0.01);
      tmp.set(L.c[0] + Math.cos(b) * L.r[0], p.y, L.c[1] + Math.sin(b) * L.r[1]);
      fwd.subVectors(tmp, p).normalize();
      q.setFromUnitVectors(FRONT, fwd);
      // Banked into its loop and a touch nose-down, as a thing flying does.
      q.multiply(tilt.setFromEuler(euler.set(0.05, 0, (i % 2 ? 1 : -1) * 0.16)));
      const s = L.s ?? 1;
      avMesh.setMatrixAt(i, m.compose(p, q, scale.setScalar(s)));
      setLamp(li++, p.x + fwd.x * 2.6 * s, p.y + 0.25 * s, p.z + fwd.z * 2.6 * s, 0.75, 0.9, 1.0, 1.2 * s);
      setLamp(li++, p.x - fwd.x * 2.6 * s, p.y + 0.4 * s, p.z - fwd.z * 2.6 * s, 1.0, 0.1, 0.25, 0.9 * s);
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
      avMesh.setMatrixAt(avs, m.compose(p, q, one));
      setLamp(li++, p.x + fwd.x * 2.6, p.y + 0.25, p.z + fwd.z * 2.6, 0.75, 0.9, 1.0, 1.2);
      setLamp(li++, p.x - fwd.x * 2.6, p.y + 0.4, p.z - fwd.z * 2.6, 1.0, 0.1, 0.25, 0.9);
      const beat = ((clock % 1.6) + 1.6) % 1.6;
      const twice = (from) => (beat > from && beat < from + 0.09) || (beat > from + 0.2 && beat < from + 0.29) ? 1 : 0;
      const red = reduced ? 0.3 : 0.12 + 0.88 * twice(0);
      const blue = reduced ? 0.3 : 0.12 + 0.88 * twice(0.8);
      tmp.set(0.38, 1.12, -0.6).applyQuaternion(q).add(p);
      setLamp(li++, tmp.x, tmp.y, tmp.z, 1.0 * red, 0.04 * red, 0.1 * red, 1.5);
      tmp.set(-0.38, 1.12, -0.6).applyQuaternion(q).add(p);
      setLamp(li++, tmp.x, tmp.y, tmp.z, 0.12 * blue, 0.3 * blue, 1.0 * blue, 1.5);
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
    for (let i = 0; i < moving; i++) {
      const L = ROAD_LANES[i % ROAD_LANES.length];
      const span = ROAD_NEAR - ROAD_FAR;
      // Wrapped into 0..1 either way round, so a clock that runs backwards
      // (the braindance's rewind) keeps every car on its stretch of road.
      const t = ((((phase[avs + i] + (clock * L.v) / span) % 1) + 1) % 1);
      const z = L.dir < 0 ? ROAD_NEAR - t * span : ROAD_FAR + t * span;
      p.set(L.x, 0, z);
      fwd.set(0, 0, L.dir);
      q.setFromUnitVectors(FRONT, fwd);
      const x = slots[i];
      x.mesh.setMatrixAt(x.index, m.compose(p, q, one));
      // Fade in and out at the ends of the loop, far off or at the kerb of
      // the intersection, so nobody sees a car appear: the lamps by their
      // brightness, the body by its dither.
      const edge = Math.min(1, Math.min(t, 1 - t) * 8);
      kinds[x.kind].fade.setX(x.index, edge);
      const [hx, hy, hz] = x.lamps.head;
      const [tx, ty, tz] = x.lamps.tail;
      for (const s of [-1, 1]) {
        setLamp(li++, L.x + s * hx, hy, z + L.dir * hz, 0.85 * edge, 0.92 * edge, 1.0 * edge, 0.9);
        setLamp(li++, L.x + s * tx, ty, z + L.dir * tz, 1.0 * edge, 0.05 * edge, 0.15 * edge, 0.6);
      }
    }
    if (hazard) {
      // Amber at the four corners, a beat on and a beat off.
      const on = reduced ? 0.25 : step(clock * 1.5);
      const x = slots.find((y) => y.parked === hazard);
      const c = Math.cos(hazard.yaw);
      const sn = Math.sin(hazard.yaw);
      const [hx, hy, hz] = x.lamps.head;
      const [tx, ty, tz] = x.lamps.tail;
      for (const [lx, ly, lz] of [[hx, hy, hz], [-hx, hy, hz], [tx, ty, tz], [-tx, ty, tz]]) {
        setLamp(li++, hazard.x + c * lx + sn * lz, ly, hazard.z - sn * lx + c * lz, 1.0 * on, 0.55 * on, 0.12 * on, 0.7);
      }
    }
    if (rail) {
      const pass = Math.floor(clock / TRAIN.period);
      const t = clock - pass * TRAIN.period;
      const dir = pass % 2 ? -1 : 1;
      train.visible = t < TRAIN.crossing;
      if (train.visible) {
        const k = t / TRAIN.crossing;
        train.position.set(rail.position.x + dir * (k * 2 - 1) * TRAIN.span, rail.position.y, rail.position.z);
        trainMat.uniforms.uDir.value = dir;
      }
    }
    avMesh.instanceMatrix.needsUpdate = true;
    droneMesh.instanceMatrix.needsUpdate = true;
    for (const k of kinds) {
      k.mesh.instanceMatrix.needsUpdate = true;
      k.fade.needsUpdate = true;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  };

  return {
    update,
    avMesh,
    /** Dev: hold every vehicle where it is. */
    freeze(on = true) {
      frozen = on;
    },
    dispose() {
      scene.remove(avMesh, droneMesh, lamps, train, ...kinds.map((k) => k.mesh));
      trainGeo.dispose();
      trainMat.dispose();
      avGeo.dispose();
      droneGeo.dispose();
      droneMesh.dispose();
      carMat.dispose();
      avMat.dispose();
      quad.dispose();
      lampGeo.dispose();
      lampMat.dispose();
      avMesh.dispose();
      for (const k of kinds) {
        k.geometry.dispose();
        k.mesh.dispose();
      }
    },
  };
}
