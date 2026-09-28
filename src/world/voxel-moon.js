// src/world/voxel-moon.js: the moon the intro opens on, built of voxels.
//
// The intro's first eighteen seconds were a painting: two figures on the
// moon with their backs to us, Earth enormous over them (src/assets/Intro/
// Moon.png). When the live city is ready before the intro starts, the city's
// own renderer draws that moon instead, cut to the song, and the painting
// stays as the poster and the fallback. In song seconds:
//
//    8.9  black. The two figures print in from the ground up and the moon
//         builds itself out from under them, column by column, lit as it
//         lands, while the camera booms back off the ground and Earth
//         assembles overhead.
//   12.0  a falling star, and the camera arcs round behind the figures.
//   16.75 it settles on the painting's own framing for the three cards and
//         pushes in, slowly. At 22.4 a second star comes down on the right
//         of the horizon and throws up a spray of rock in the low gravity.
//   24.6  the camera cranes up: the ground is an island, and its edge is
//         crumbling away into the black.
//   26.1  ignition. What is left of the island peels up toward Earth and the
//         camera goes with it, down to the lights on its night side.
//   28.9  one bar before the drums: Earth's voxels flip over from the middle
//         of the frame out, and the city is behind them on the drop.
//
// Everything here is a function of the song second, so a seek lands on the
// same frame every time. It is all instanced cubes, about fifty thousand on
// a desktop in a handful of draws (a third of that on a phone): the island's
// columns, the figures, Earth's shell, dust, two meteors and the strike's
// debris. One hard sun with a real shadow map, Earthshine, voxel ambient
// occlusion and bevelled edges light them; the city's own grade and bloom
// finish them (src/world/post.js). The figures are original, sculpted below
// from primitives to match the painting's two: one in a yellow jacket, one
// with a white bob. Earth is the painting's Earth, the portrait plate's disc
// sampled once per voxel (public/scenes/world/earth.webp).
import * as THREE from "three";
import { worldEarthUrl } from "../data/world-assets.js";
import { CITY_READY, IGNITION, METEOR_AT, SHORT_START, SONG_START, VOICE_AT } from "../lib/cues.js";

const DEG = Math.PI / 180;

// ---- the timeline, in song seconds ------------------------------------------
const T = {
  print: SONG_START + 0.15,
  ground: SONG_START + 0.25,
  earth: SONG_START + 0.7,
  orbit: METEOR_AT[0],
  still: VOICE_AT[0],
  strike: METEOR_AT[1] + 0.85,
  rise: VOICE_AT[2] - 0.3,
  crumble: VOICE_AT[2],
  dive: IGNITION,
  peel: IGNITION - 0.55,
  apart: IGNITION + 0.2,
  reveal: SHORT_START,
  gone: CITY_READY,
};

/**
 * Whether the moon is on screen at song second `s`, and whether the city is
 * drawn under it: null for the city alone, "only" for the moon alone, "over"
 * for the moon over the city. The city is drawn once, hidden, as the crane
 * starts: the first frame of the street after the moon's light ones costs
 * a dropped frame however warm its programs are, and the crane's start is
 * the one moment the camera is still and nothing on screen is changing.
 */
export function moonPhase(s) {
  if (s >= T.gone) return null;
  if (s >= T.rise && s < T.rise + 0.05) return "over";
  return s >= T.reveal - 0.05 ? "over" : "only";
}

// ---- how much moon a device gets --------------------------------------------
// The ground is two grids: `vox` over the island, and half that round the
// figures and the lens's path (`fine`, in metres either side of the seat:
// left, right, ahead, behind), where the camera is close enough to see it.
const TIER = {
  high: { vox: 0.2, fine: [-7, 7, -5, 8], island: 17.5, fig: 0.03, earth: 60, shadow: 2048, dust: 120, debris: 220, stars: 2400 },
  phone: { vox: 0.3, fine: [-5, 5, -4, 8], island: 14.5, fig: 0.036, earth: 40, shadow: 1024, dust: 60, debris: 70, stars: 1300 },
};

// The sun: low, from behind the camera's left. Earth's painted day side is
// its left half, so the same sun lights both.
const SUN = new THREE.Vector3(-0.62, 0.48, 0.6).normalize();
const SUN_COLOR = new THREE.Color(1.0, 0.95, 0.88).multiplyScalar(2.7);
const EARTH_LIGHT = new THREE.Color(0.28, 0.48, 1.0).multiplyScalar(0.075);
const AMBIENT = new THREE.Color(0.012, 0.013, 0.02);
// The island's middle, where it is built from, and where the camera turns.
const ISLAND = { x: 0, z: -4 };
const PIVOT = new THREE.Vector3(0, 0.5, 0);
// Where Earth hangs: seen from the painting's eye, 34 degrees up, dead ahead.
const EYE = new THREE.Vector3(0, 0.42, 4.6);
const EARTH_ELEVATION = 34 * DEG;
const EARTH_DISTANCE = 220;
// The strike: the second star lands on the right of the horizon.
const STRIKE = new THREE.Vector3(7.5, 0, -15);

let pending = null;

/** The Earth picture. Loaded with the rest of the world (preloadWorld). */
export function preloadVoxelMoon() {
  if (!pending) {
    pending = new THREE.ImageLoader().loadAsync(worldEarthUrl).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

// ---- small maths --------------------------------------------------------------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth01 = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const easeInOut = (x) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- the ground ------------------------------------------------------------------
// Craters and boulders placed by hand where the camera will see them (the
// painting's big crater on the right, its boulders in the lower left), and
// a scatter of small ones.
const CRATERS = [
  [6.4, -8.2, 3.8, 1.25],
  [-8.2, -12.5, 2.5, 0.75],
  [3.2, -15.5, 2.9, 0.85],
  [-11.5, -3.2, 1.9, 0.55],
  [9.4, 2.4, 1.6, 0.45],
  [-4.6, -5.8, 1.2, 0.35],
  [12.5, -4.5, 1.4, 0.4],
  [-3.2, -19.5, 2.2, 0.6],
];
const ROCKS = [
  [-2.5, 2.7, 0.62, 0.5],
  [-1.15, 3.4, 0.38, 0.32],
  [-3.9, 1.3, 0.48, 0.38],
  [2.3, 3.2, 0.34, 0.26],
  [4.3, 1.5, 0.52, 0.36],
  [-6.2, -1.2, 0.7, 0.45],
  [7.8, -2.6, 0.6, 0.4],
];

function makeTerrain(rand) {
  const craters = [...CRATERS];
  const rocks = [...ROCKS];
  // Kept clear: the seat, and the lens's path in off the ground.
  const clear = (x, z) => Math.hypot(x, z) < 2.2 || Math.hypot(x + 0.9, z - 4.2) < 2.6;
  for (let i = 0; i < 28; i++) {
    const r = 0.35 + rand() * 0.75;
    const x = (rand() - 0.5) * 38;
    const z = ISLAND.z + (rand() - 0.5) * 38;
    if (!clear(x, z)) craters.push([x, z, r, r * (0.22 + rand() * 0.12)]);
  }
  for (let i = 0; i < 70; i++) {
    const x = (rand() - 0.5) * 36;
    const z = ISLAND.z + (rand() - 0.5) * 36;
    if (!clear(x, z)) rocks.push([x, z, 0.12 + rand() * 0.24, 0.12 + rand() * 0.22]);
  }
  const rolling = (x, z) => (fbm(x * 0.07 + 3.1, z * 0.07 - 1.7, 4) - 0.5) * 0.55 + (noise2(x * 0.9, z * 0.9) - 0.5) * 0.07;
  // The seat is at the ground's own level round it, so it is not a pit.
  let seat = 0;
  for (let i = 0; i < 16; i++) seat += rolling(Math.cos((i / 16) * Math.PI * 2) * 1.9, Math.sin((i / 16) * Math.PI * 2) * 1.9) / 16;
  return (x, z) => {
    // Gentler toward the lens's path, over a wide falloff, so the ground in
    // front of a low camera is not a wall of steps.
    const lens = Math.hypot(x + 0.6, (z - 4.6) * 0.7);
    let h = (rolling(x, z) - seat) * (0.25 + 0.75 * smooth01((lens - 1.5) / 5));
    let bowl = 0;
    let rim = 0;
    let rock = 0;
    for (const [cx, cz, r, d] of craters) {
      const t = Math.hypot(x - cx, z - cz) / r;
      if (t < 1) {
        h -= d * (1 - t * t);
        bowl = Math.max(bowl, 1 - t);
      }
      const lip = Math.exp(-(((t - 1) / 0.28) ** 2));
      h += lip * d * 0.35;
      rim = Math.max(rim, lip);
    }
    for (const [rx, rz, r, height] of rocks) {
      const t = Math.hypot(x - rx, z - rz) / r;
      if (t < 1) {
        const k = Math.pow(1 - t * t, 0.6);
        h += k * height;
        rock = Math.max(rock, k);
      }
    }
    // Flat under the figures.
    h *= smooth01((Math.hypot(x, z * 1.3) - 1.0) / 0.9);
    // A small world: the ground falls away from the figures, so the edge of
    // the island is the moon's horizon.
    h -= (x * x + z * z) / 500;
    return { h, bowl, rim, rock };
  };
}

/**
 * The island: one column per ground cell, sorted nearest the lens first.
 * Coarse cells of `vox` cover it; inside the `fine` rectangle each coarse
 * cell is four fine ones instead, so the two grids tile it exactly.
 */
function buildIsland(cfg, terrain) {
  const V = cfg.vox;
  const v = V / 2;
  const R = cfg.island;
  const [fx0, fx1, fz0, fz1] = cfg.fine;
  const n = Math.ceil((R * 1.15) / V);
  const W = 2 * n + 1;
  const coarse = new Float32Array(W * W).fill(NaN);
  const fineTops = new Float32Array(4 * W * W).fill(NaN);
  const isFine = (x, z) => x > fx0 && x < fx1 && z > fz0 && z < fz1;
  const edgeAt = (x, z) => {
    const th = Math.atan2(z - ISLAND.z, x - ISLAND.x);
    return R * (0.9 + 0.22 * fbm(Math.cos(th) * 1.7 + 5, Math.sin(th) * 1.7 + 5, 3));
  };
  const cells = [];
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const x = ISLAND.x + (i - n) * V;
      const z = ISLAND.z + (j - n) * V;
      const edge = edgeAt(x, z);
      const r = Math.hypot(x - ISLAND.x, z - ISLAND.z);
      if (r > edge) continue;
      if (isFine(x, z)) {
        coarse[j * W + i] = -1e9;
        for (let b = 0; b < 2; b++) {
          for (let a = 0; a < 2; a++) {
            const fxp = x + (a - 0.5) * v;
            const fzp = z + (b - 0.5) * v;
            const t = terrain(fxp, fzp);
            const top = Math.round(t.h / v) * v;
            fineTops[(2 * j + b) * 2 * W + 2 * i + a] = top;
            cells.push({ x: fxp, z: fzp, top, size: v, rn: r / edge, t, key: [2 * i + a, 2 * j + b, 1] });
          }
        }
      } else {
        const t = terrain(x, z);
        const top = Math.round(t.h / V) * V;
        coarse[j * W + i] = top;
        cells.push({ x, z, top, size: V, rn: r / edge, t, key: [i, j, 0] });
      }
    }
  }
  // The top of whatever covers a point, or NaN off the island.
  const topAt = (x, z) => {
    const i = Math.round((x - ISLAND.x) / V) + n;
    const j = Math.round((z - ISLAND.z) / V) + n;
    if (i < 0 || j < 0 || i >= W || j >= W) return NaN;
    const c = coarse[j * W + i];
    if (c !== -1e9) return c;
    const fi = Math.floor((x - ISLAND.x) / v + 2 * n + 1);
    const fj = Math.floor((z - ISLAND.z) / v + 2 * n + 1);
    return fineTops[fj * 2 * W + fi] ?? NaN;
  };
  const rel = (x, z, top) => {
    const h = topAt(x, z);
    return Number.isNaN(h) ? -99 : h - top;
  };
  cells.sort((a, b) => Math.hypot(a.x - EYE.x, a.z - EYE.z) - Math.hypot(b.x - EYE.x, b.z - EYE.z));
  const count = cells.length;
  const col = new Float32Array(count * 4);
  const nb = new Float32Array(count * 4);
  const nbd = new Float32Array(count * 4);
  const tone = new Float32Array(count * 3);
  cells.forEach((c, k) => {
    // The underside: a rough cone, deepest under the middle.
    const deep = 1.2 + 7.5 * Math.pow(Math.max(0, 1 - c.rn * c.rn), 0.8) + (noise2(c.x * 0.4, c.z * 0.4) - 0.5) * 2.4;
    const bottom = Math.min(c.top - c.size, -Math.round(deep / V) * V);
    // Neighbours: sampled just across each edge (a little inside the next
    // cell, so a coarse cell next to fine ones reads one of them).
    const d = c.size * 0.75;
    col.set([c.x, c.z, c.top, bottom], k * 4);
    nb.set([rel(c.x + d, c.z, c.top), rel(c.x - d, c.z, c.top), rel(c.x, c.z + d, c.top), rel(c.x, c.z - d, c.top)], k * 4);
    nbd.set([rel(c.x + d, c.z + d, c.top), rel(c.x - d, c.z + d, c.top), rel(c.x + d, c.z - d, c.top), rel(c.x - d, c.z - d, c.top)], k * 4);
    const [ki, kj, kf] = c.key;
    const shade = 0.5 + (fbm(c.x * 0.3 + 11, c.z * 0.3, 3) - 0.5) * 0.8 + (hash2(ki * 3 + kf, kj * 5 - kf) - 0.5) * 0.22
      - c.t.bowl * 0.26 + c.t.rim * 0.2 - c.t.rock * 0.1;
    tone.set([clamp01(shade), hash2(ki * 7 + 3 + kf, kj * 13 + 1), c.size], k * 3);
  });
  return { count, col, nb, nbd, tone };
}

// ---- the figures ------------------------------------------------------------------
// Sculpted from signed distances in each figure's own frame (the seat at the
// origin, facing -z, away from the camera), voxelised, and hollowed to the
// voxels that can be seen.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};
const sphere = (c, r) => (p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r;
const capsule = (a, b, r) => {
  const ba = sub(b, a);
  const bb = dot3(ba, ba);
  return (p) => {
    const pa = sub(p, a);
    const h = Math.min(1, Math.max(0, dot3(pa, ba) / bb));
    return Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - r;
  };
};
/** A cone with round ends: radius r1 at a, r2 at b (after Inigo Quilez). */
const roundCone = (a, b, r1, r2) => {
  const ba = sub(b, a);
  const l2 = dot3(ba, ba);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  return (p) => {
    const pa = sub(p, a);
    const y = dot3(pa, ba);
    const z = y - l2;
    const xv = [pa[0] * l2 - ba[0] * y, pa[1] * l2 - ba[1] * y, pa[2] * l2 - ba[2] * y];
    const x2 = dot3(xv, xv);
    const y2 = y * y * l2;
    const z2 = z * z * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
  };
};
const ellipsoid = (c, r) => (p) => {
  const q = [(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]];
  const k0 = Math.hypot(q[0], q[1], q[2]);
  const k1 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
  return (k0 * (k0 - 1)) / k1;
};
/** A rounded box, tipped `tilt` radians about x (positive leans its top back, toward +z). */
const roundBox = (c, h, tilt, rr) => {
  const cs = Math.cos(tilt);
  const sn = Math.sin(tilt);
  return (p) => {
    const x = p[0] - c[0];
    const y = p[1] - c[1];
    const z = p[2] - c[2];
    const ly = y * cs + z * sn;
    const lz = -y * sn + z * cs;
    const qx = Math.abs(x) - h[0] + rr;
    const qy = Math.abs(ly) - h[1] + rr;
    const qz = Math.abs(lz) - h[2] + rr;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rr;
  };
};
/** Height up a box tipped like roundBox, from its centre. */
const tippedY = (c, tilt) => (p) => (p[1] - c[1]) * Math.cos(tilt) + (p[2] - c[2]) * Math.sin(tilt);

function david() {
  const JACKET = "#e2b21b";
  const HOOD = "#b98c10";
  const BAND = "#25262b";
  const PANTS = "#2a2f3c";
  const SHOE = "#151518";
  const SKIN = "#c68d68";
  const NECK = "#9d6a4b";
  const HAIR = "#141217";
  const lean = 14 * DEG;
  const torso = [0, 0.41, 0.075];
  const up = tippedY(torso, lean);
  const head = [0, 0.845, 0.12];
  // The hair: spikes out of the crown and the back of the head, longest
  // on top, as the painting has it.
  const spikes = [
    [0, 1, 0.05, 0.17], [0.45, 0.9, 0.25, 0.16], [-0.45, 0.9, 0.2, 0.16], [0.2, 0.7, 0.7, 0.15], [-0.25, 0.65, 0.72, 0.15],
    [0.8, 0.5, 0.25, 0.14], [-0.8, 0.5, 0.2, 0.14], [0, 0.85, 0.55, 0.16], [0.3, 1, -0.2, 0.15], [-0.35, 1, -0.15, 0.15],
    [0.6, 0.25, 0.75, 0.13], [-0.6, 0.3, 0.75, 0.13], [0.05, 0.35, 0.95, 0.13], [0.9, 0.6, -0.1, 0.13], [-0.9, 0.6, -0.1, 0.13],
    [0.15, 1, 0.45, 0.17], [-0.2, 1, 0.4, 0.17],
  ].map(([x, y, z, reach]) => {
    const n = norm3([x, y, z]);
    const a = [head[0] + n[0] * 0.05, head[1] + n[1] * 0.05, head[2] + n[2] * 0.05];
    const b = [head[0] + n[0] * (reach + 0.02), head[1] + n[1] * (reach + 0.02), head[2] + n[2] * (reach + 0.02)];
    return { sdf: roundCone(a, b, 0.05, 0.012), color: HAIR };
  });
  return [
    { sdf: sphere(head, 0.102), color: (p) => (p[2] < 0.08 && p[1] < 0.87 ? SKIN : HAIR) },
    ...spikes,
    { sdf: capsule([0, 0.63, 0.1], [0, 0.76, 0.125], 0.048), color: NECK },
    { sdf: capsule([-0.11, 0.675, 0.155], [0.11, 0.675, 0.155], 0.07), color: HOOD },
    { sdf: capsule([-0.2, 0.595, 0.115], [0.2, 0.595, 0.115], 0.082), color: JACKET },
    { sdf: roundBox(torso, [0.19, 0.235, 0.11], lean, 0.07), color: (p) => (Math.abs(up(p) - 0.005) < 0.034 ? BAND : JACKET) },
    { sdf: capsule([-0.23, 0.575, 0.125], [-0.305, 0.325, 0.205], 0.06), color: JACKET },
    { sdf: capsule([-0.305, 0.325, 0.205], [-0.335, 0.08, 0.255], 0.054), color: JACKET },
    { sdf: capsule([0.23, 0.575, 0.125], [0.305, 0.325, 0.205], 0.06), color: JACKET },
    { sdf: capsule([0.305, 0.325, 0.205], [0.335, 0.08, 0.255], 0.054), color: JACKET },
    { sdf: sphere([-0.34, 0.035, 0.27], 0.042), color: SKIN },
    { sdf: sphere([0.34, 0.035, 0.27], 0.042), color: SKIN },
    { sdf: ellipsoid([0, 0.13, 0.035], [0.19, 0.11, 0.15]), color: PANTS },
    { sdf: capsule([-0.1, 0.1, -0.02], [-0.12, 0.205, -0.45], 0.075), color: PANTS },
    { sdf: capsule([-0.12, 0.205, -0.45], [-0.135, 0.075, -0.85], 0.065), color: PANTS },
    { sdf: capsule([0.1, 0.1, -0.02], [0.12, 0.205, -0.45], 0.075), color: PANTS },
    { sdf: capsule([0.12, 0.205, -0.45], [0.135, 0.075, -0.85], 0.065), color: PANTS },
    { sdf: roundBox([-0.135, 0.06, -0.9], [0.055, 0.06, 0.1], 0, 0.025), color: SHOE },
    { sdf: roundBox([0.135, 0.06, -0.9], [0.055, 0.06, 0.1], 0, 0.025), color: SHOE },
  ];
}

function lucy() {
  const WHITE = "#e8ebf3";
  const CREASE = "#b3b9cc";
  const BLUE = "#2a489c";
  const NAVY = "#252c52";
  const TIGHTS = "#dde1eb";
  const BOB = "#e7e3fb";
  const BOB_SHADE = "#aaa5d8";
  const SKIN = "#d9a585";
  const bend = -10 * DEG;
  // The bob: a round crown, and the hair falling straight to the jaw all
  // the way round, cut level.
  const crown = ellipsoid([0, 0.675, 0.012], [0.13, 0.112, 0.134]);
  const fall = roundBox([0, 0.61, 0.018], [0.128, 0.07, 0.13], 0, 0.06);
  const bob = (p) => Math.max(Math.min(crown(p), fall(p)), 0.552 - p[1]);
  return [
    { sdf: bob, color: (p) => (p[1] < 0.585 ? BOB_SHADE : BOB) },
    { sdf: sphere([0, 0.665, -0.005], 0.093), color: SKIN },
    { sdf: capsule([0, 0.52, 0.0], [0, 0.61, 0.0], 0.045), color: SKIN },
    { sdf: roundBox([0, 0.5, 0.04], [0.065, 0.04, 0.07], bend, 0.03), color: NAVY },
    { sdf: capsule([-0.15, 0.485, 0.03], [0.15, 0.485, 0.03], 0.058), color: WHITE },
    { sdf: roundBox([0, 0.32, 0.02], [0.148, 0.19, 0.1], bend, 0.06), color: (p) => (p[1] < 0.3 ? BLUE : p[1] < 0.34 ? CREASE : WHITE) },
    { sdf: capsule([-0.17, 0.47, 0.035], [-0.17, 0.33, -0.12], 0.052), color: WHITE },
    { sdf: capsule([-0.17, 0.33, -0.12], [-0.04, 0.39, -0.3], 0.045), color: WHITE },
    { sdf: capsule([0.17, 0.47, 0.035], [0.17, 0.33, -0.12], 0.052), color: WHITE },
    { sdf: capsule([0.17, 0.33, -0.12], [0.04, 0.39, -0.3], 0.045), color: WHITE },
    { sdf: ellipsoid([0, 0.11, 0.0], [0.16, 0.1, 0.14]), color: BLUE },
    { sdf: capsule([-0.085, 0.1, -0.04], [-0.085, 0.43, -0.3], 0.066), color: TIGHTS },
    { sdf: capsule([-0.085, 0.43, -0.3], [-0.085, 0.06, -0.43], 0.058), color: TIGHTS },
    { sdf: capsule([0.085, 0.1, -0.04], [0.085, 0.43, -0.3], 0.066), color: TIGHTS },
    { sdf: capsule([0.085, 0.43, -0.3], [0.085, 0.06, -0.43], 0.058), color: TIGHTS },
  ];
}

/** Voxelise `parts` (first match wins) over a box, keep the visible shell,
 *  and give each voxel an occlusion from how buried it is. */
function sculpt(parts, offset, vox, out) {
  const x0 = -0.5;
  const y0 = 0;
  const z0 = -1.02;
  const nx = Math.ceil(1.0 / vox);
  const ny = Math.ceil(1.05 / vox);
  const nz = Math.ceil(1.5 / vox);
  const grid = new Int16Array(nx * ny * nz).fill(-1);
  const colours = [];
  const p = [0, 0, 0];
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        p[0] = x0 + (i + 0.5) * vox;
        p[1] = y0 + (j + 0.5) * vox;
        p[2] = z0 + (k + 0.5) * vox;
        for (let q = 0; q < parts.length; q++) {
          if (parts[q].sdf(p) <= 0) {
            const c = typeof parts[q].color === "function" ? parts[q].color(p) : parts[q].color;
            let id = colours.indexOf(c);
            if (id < 0) id = colours.push(c) - 1;
            grid[(k * ny + j) * nx + i] = id;
            break;
          }
        }
      }
    }
  }
  const linear = colours.map((c) => new THREE.Color(c));
  const filled = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz && grid[(k * ny + j) * nx + i] >= 0;
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const id = grid[(k * ny + j) * nx + i];
        if (id < 0) continue;
        if (filled(i + 1, j, k) && filled(i - 1, j, k) && filled(i, j + 1, k) && filled(i, j - 1, k) && filled(i, j, k + 1) && filled(i, j, k - 1)) continue;
        let buried = 0;
        for (let c = -1; c <= 1; c++) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if ((a || b || c) && filled(i + a, j + b, k + c)) buried++;
        const colour = linear[id];
        out.push({
          x: offset[0] + x0 + (i + 0.5) * vox,
          y: offset[1] + y0 + (j + 0.5) * vox,
          z: offset[2] + z0 + (k + 0.5) * vox,
          r: colour.r,
          g: colour.g,
          b: colour.b,
          ao: 1.12 - (buried / 26) * 0.75,
          seed: hash2(i * 31 + k, j * 17 + out.length),
        });
      }
    }
  }
}

// ---- Earth --------------------------------------------------------------------------
/** A shell of voxels over the hemisphere that faces the moon, each coloured
 *  from the painted disc, with its night-side lights picked out to glow. */
function buildEarth(image, R) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;
  // The surface's radius inside the crop (the rest is the thin atmosphere).
  const K = 435 / 450;
  const read = (nx, ny) => {
    const l = Math.hypot(nx, ny);
    const s = l > 0.995 ? 0.995 / l : 1;
    const x = Math.min(size - 1, Math.max(0, Math.round((0.5 + 0.5 * K * nx * s) * size - 0.5)));
    const y = Math.min(size - 1, Math.max(0, Math.round((0.5 - 0.5 * K * ny * s) * size - 0.5)));
    const i = (y * size + x) * 4;
    return [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255];
  };
  const cells = [];
  const r = Math.ceil(R) + 1;
  const R2 = R * R;
  const inside = (i, j, k) => i * i + j * j + k * k < R2;
  const step = 0.5 / R;
  for (let k = -Math.ceil(R * 0.35); k <= r; k++) {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (!inside(i, j, k)) continue;
        if (inside(i + 1, j, k) && inside(i - 1, j, k) && inside(i, j + 1, k) && inside(i, j - 1, k) && inside(i, j, k + 1) && inside(i, j, k - 1)) continue;
        const len = Math.hypot(i, j, k);
        const nx = i / len;
        const ny = j / len;
        const nz = k / len;
        if (nz < -0.3) continue;
        // Average the voxel's footprint; its lights are its brightest warm point.
        let cr = 0;
        let cg = 0;
        let cb = 0;
        let warm = 0;
        for (let b = -1.5; b <= 1.5; b += 1) {
          for (let a = -1.5; a <= 1.5; a += 1) {
            const [sr, sg, sb] = read(nx + a * step * 0.66, ny + b * step * 0.66);
            cr += sr;
            cg += sg;
            cb += sb;
            warm = Math.max(warm, clamp01((sr - sb) * 1.8 - 0.22) * clamp01((sg - sb) * 2.5) * smooth01((Math.max(sr, sg) - 0.35) / 0.4));
          }
        }
        cr /= 16;
        cg /= 16;
        cb /= 16;
        const lum = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
        const light = Math.pow(clamp01((warm - lum * 0.9) * 1.6), 1.3) * (1 - smooth01((lum - 0.16) / 0.2));
        // Cloud stands a little proud of the sea.
        const sat = Math.max(cr, cg, cb) - Math.min(cr, cg, cb);
        const cloud = smooth01((lum - 0.5) / 0.25) * (1 - smooth01(sat / 0.25));
        const lift = cloud * 0.6;
        cells.push(i + nx * lift, j + ny * lift, k + nz * lift, cr ** 2.2, cg ** 2.2, cb ** 2.2, light, hash2(i * 73 + k, j * 151 - k));
      }
    }
  }
  const count = cells.length / 8;
  const cell = new Float32Array(count * 3);
  const paint = new Float32Array(count * 4);
  const seed = new Float32Array(count);
  for (let q = 0; q < count; q++) {
    cell.set(cells.slice(q * 8, q * 8 + 3), q * 3);
    paint.set(cells.slice(q * 8 + 3, q * 8 + 7), q * 4);
    seed[q] = cells[q * 8 + 7];
  }
  return { count, cell, paint, seed };
}

// ---- shaders ------------------------------------------------------------------------
const COMMON = /* glsl */ `
  uniform float uS;
  uniform float uTime;
  uniform float uLevel;
  uniform vec3 uSun;
  uniform vec3 uSunColor;
  uniform vec3 uEarthDir;
  uniform vec3 uEarthLight;
  uniform vec3 uAmbient;
  uniform vec3 uToEarth;
  uniform vec3 uEarthPos;
  uniform float uEarthR;
  uniform vec4 uStrike;
  uniform vec4 uStrikeAt;

  float h11(float n) { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }
  vec3 spinAxis(float seed) {
    return normalize(vec3(h11(seed * 17.1) - 0.5, h11(seed * 29.7 + 1.3) - 0.5, h11(seed * 41.3 + 2.9) - 0.5) + 1e-4);
  }
  mat3 axisAngle(vec3 k, float a) {
    float c = cos(a);
    float s = sin(a);
    float t = 1.0 - c;
    return mat3(
      t * k.x * k.x + c, t * k.x * k.y + s * k.z, t * k.x * k.z - s * k.y,
      t * k.x * k.y - s * k.z, t * k.y * k.y + c, t * k.y * k.z + s * k.x,
      t * k.x * k.z + s * k.y, t * k.y * k.z - s * k.x, t * k.z * k.z + c);
  }
  float backOut(float x) {
    float y = x - 1.0;
    return 1.0 + 2.3 * y * y * y + 1.3 * y * y;
  }
  // Free of the ground: pulled up toward Earth, faster and faster, turning
  // round the way there.
  vec3 pulled(float age, float seed) {
    float pull = (13.0 + seed * 38.0) * age * age;
    vec3 side = normalize(cross(uToEarth, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(side, uToEarth);
    float sw = age * (1.2 + seed * 1.5) + seed * 6.2832;
    return uToEarth * pull + (side * cos(sw) + up * sin(sw)) * age * (0.5 + seed * 1.4) + vec3(0.0, age * 0.8, 0.0);
  }
`;

// The light every lit voxel takes: the sun through the shadow map, Earth's
// blue from above, a floor of ambient, the strike's flash, and a bevel on
// every edge that catches the sun when the voxel is big enough to show it.
const LIGHT = /* glsl */ `
  uniform sampler2DShadow uShadowMap;
  uniform mat4 uShadowMatrix;
  uniform float uShadowTexel;
  float sunShadow(vec3 p, vec3 n) {
    vec4 q = uShadowMatrix * vec4(p + n * 0.02, 1.0);
    vec3 c = q.xyz * 0.5 + 0.5;
    if (c.x <= 0.0 || c.y <= 0.0 || c.x >= 1.0 || c.y >= 1.0 || c.z >= 1.0) return 1.0;
    float o = uShadowTexel * 0.7;
    float z = c.z - 0.00025;
    return 0.25 * (texture(uShadowMap, vec3(c.xy + vec2(-o, -o), z)) + texture(uShadowMap, vec3(c.xy + vec2(o, -o), z))
      + texture(uShadowMap, vec3(c.xy + vec2(-o, o), z)) + texture(uShadowMap, vec3(c.xy + vec2(o, o), z)));
  }
  vec3 bevel(vec3 n, vec3 t, vec3 b, vec2 f, vec2 px) {
    vec2 w = 0.07 + px;
    vec2 e = smoothstep(0.5 - w, vec2(0.5), abs(f)) * sign(f);
    float k = 1.0 - smoothstep(0.1, 0.28, max(px.x, px.y));
    return normalize(n + (t * e.x + b * e.y) * 1.1 * k);
  }
  vec3 lightVoxel(vec3 albedo, vec3 p, vec3 n, vec3 nb, float ao) {
    float sun = max(dot(nb, uSun), 0.0) * sunShadow(p, n);
    float earth = 0.35 + 0.65 * max(dot(nb, uEarthDir), 0.0);
    vec3 c = albedo * (uSunColor * sun + uEarthLight * earth * (1.0 + 0.3 * uLevel) + uAmbient) * ao;
    vec3 d = uStrike.xyz - p;
    float dd = dot(d, d);
    c += albedo * vec3(1.0, 0.52, 0.2) * uStrike.w * max(dot(nb, d * inversesqrt(dd + 1e-4)), 0.0) / (1.0 + dd * 0.05);
    return c;
  }
`;

// The island's columns: built up out of the dark from the figures outward,
// crumbling at the edge, peeling up toward Earth. Shared by the shaded draw
// and the shadow map's.
const GROUND_PLACE = /* glsl */ `
  float seed = aTone.y;
  float vox = aTone.z;
  vec2 xz = aCol.xy;
  float top = aCol.z;
  float bottom = aCol.w;
  // The strike bites a crater out of the ground where it lands.
  float sinceHit = uS - uStrikeAt.w;
  if (sinceHit > 0.0) {
    float dh = length(xz - uStrikeAt.xz);
    float bite = max(0.0, 1.0 - dh * dh / 5.0) * 0.8 * smoothstep(0.0, 0.1, sinceHit);
    top -= floor(bite / vox + 0.5) * vox;
  }
  float tb = uBuild.x + length(xz - uBuild.yz) * 0.105 + seed * 0.22;
  float kb = clamp((uS - tb) / 0.62, 0.0, 1.0);
  float shown = step(0.0001, uS - tb);
  float lift = (1.0 - backOut(kb)) * (1.0 + seed * 1.8);
  float glow = shown * exp(-max(uS - tb, 0.0) * 4.0);
  vec2 rel = xz - uIsland.xy;
  float rn = length(rel) / uIsland.z;
  float tc = uFree.x + (1.0 - rn) * 4.0 + seed * 0.5;
  float tp = uFree.y + clamp((length(xz - vec2(1.5, 17.0)) - 9.0) / 24.0, 0.0, 1.0) * 1.2 + seed * 0.35;
  float td = min(tc, tp);
  float age = max(uS - td, 0.0);
  float free = step(td, uS);
  float falls = step(tc, tp);
  float hgt = mix(top - bottom, vox, smoothstep(0.0, 0.3, age) * free);
  vec3 centre = vec3(xz.x, top - hgt * 0.5 - lift, xz.y);
  vec2 out2 = normalize(rel + 1e-4);
  vec3 fall = vec3(out2.x, 0.0, out2.y) * age * (0.3 + seed * 0.9) + vec3(0.0, age * (seed - 0.3) * 0.8 - 1.3 * age * age, 0.0);
  vec3 cw = centre + free * mix(pulled(age, seed), fall, falls);
  float keep = 1.0 - free * smoothstep(uFree.z - 0.35, uFree.z + 0.05, uS);
  keep *= smoothstep(uEarthR + 2.0, uEarthR + 14.0, length(cw - uEarthPos));
  mat3 R = axisAngle(spinAxis(seed), age * (1.0 + seed * 3.0) * free);
  float peel = free * (1.0 - falls) * smoothstep(0.0, 0.5, age);
  vec3 size = vec3(vox, hgt, vox) * shown * keep * (1.0 + 2.2 * peel);
  vec3 lp = position * size;
  vec3 world = cw + R * lp;
`;

const GROUND_ATTRS = /* glsl */ `
  attribute vec4 aCol;
  attribute vec4 aNb;
  attribute vec4 aNbD;
  attribute vec3 aTone;
  uniform vec3 uBuild;
  uniform vec3 uIsland;
  uniform vec3 uFree;
`;

const GROUND_VERTEX = /* glsl */ `
  ${COMMON}
  ${GROUND_ATTRS}
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vB;
  varying vec3 vFaceN;
  varying vec2 vFace;
  varying float vDepth;
  varying vec4 vNb;
  varying vec4 vNbD;
  varying vec4 vInfo;
  varying vec2 vPeel;
  void main() {
    ${GROUND_PLACE}
    vec3 an = abs(normal);
    vec3 t = an.y > 0.5 ? vec3(1.0, 0.0, 0.0) : an.x > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 b = an.y > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vN = R * normal;
    vT = R * t;
    vB = R * b;
    vFaceN = normal;
    // Face coordinates in voxels: a side face is a stack of them, so its
    // second coordinate runs with height on the ground's own grid.
    vFace = an.y > 0.5 ? vec2(position.x, position.z + 0.5) : vec2(an.x > 0.5 ? position.z : position.x, (centre.y + lp.y) / vox);
    if (free > 0.5 && an.y < 0.5) vFace.y = position.y + 0.5;
    vDepth = (0.5 - position.y) * hgt;
    vNb = aNb;
    vNbD = aNbD;
    vInfo = vec4(aTone.x, glow, free, vox);
    vPeel = vec2(peel, seed);
    vWorld = world;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const GROUND_FRAGMENT = /* glsl */ `
  ${COMMON}
  ${LIGHT}
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vB;
  varying vec3 vFaceN;
  varying vec2 vFace;
  varying float vDepth;
  varying vec4 vNb;
  varying vec4 vNbD;
  varying vec4 vInfo;
  varying vec2 vPeel;
  void main() {
    vec3 n = normalize(vN);
    vec2 f = vec2(vFace.x, fract(vFace.y) - 0.5);
    vec2 px = vec2(fwidth(vFace.x), fwidth(vFace.y));
    float vox = vInfo.w;
    float free = vInfo.z;
    // Bevel only the edges that are really there: a top's edge where the
    // ground drops away, a side's top edge; a flat run of voxels is one
    // surface. A voxel knocked loose is a whole cube again.
    vec2 w = 0.07 + px;
    vec2 e = smoothstep(0.5 - w, vec2(0.5), abs(f)) * sign(f);
    if (vFaceN.y > 0.5) {
      e.x *= mix(step(vNb.x, -0.01) * step(0.0, f.x) + step(vNb.y, -0.01) * step(f.x, 0.0), 1.0, free);
      e.y *= mix(step(vNb.z, -0.01) * step(0.0, f.y) + step(vNb.w, -0.01) * step(f.y, 0.0), 1.0, free);
    } else if (free < 0.5) {
      e.x = 0.0;
      e.y *= step(0.0, f.y) * step(vDepth, vox * 1.01);
    }
    float bk = 1.0 - smoothstep(0.1, 0.28, max(px.x, px.y));
    vec3 nb = normalize(n + (normalize(vT) * e.x + normalize(vB) * e.y) * 1.1 * bk);
    // Occlusion: a top darkens toward a taller neighbour, a side toward
    // the neighbour's top it rises out of; the island's own cliff darkens
    // on the way down into the void.
    float ao = 1.0;
    if (vFaceN.y > 0.5) {
      vec2 wp = pow(clamp(f + 0.5, 0.0, 1.0), vec2(1.6));
      vec2 wn = pow(clamp(0.5 - f, 0.0, 1.0), vec2(1.6));
      vec4 up = step(0.01, vNb);
      vec4 upD = step(0.01, vNbD);
      float occ = up.x * wp.x + up.y * wn.x + up.z * wp.y + up.w * wn.y
        + upD.x * wp.x * wp.y + upD.y * wn.x * wp.y + upD.z * wp.x * wn.y + upD.w * wn.x * wn.y;
      ao = 1.0 - 0.36 * min(occ, 1.4);
    } else if (vFaceN.y > -0.5) {
      float nbh = vFaceN.x > 0.5 ? vNb.x : vFaceN.x < -0.5 ? vNb.y : vFaceN.z > 0.5 ? vNb.z : vNb.w;
      ao = mix(0.4, 1.0, smoothstep(0.0, 1.4 * vox, -nbh - vDepth));
      // The stack's seams, faint.
      ao *= 1.0 - 0.12 * smoothstep(0.4, 0.5, abs(f.y)) * bk;
      if (nbh < -50.0) ao *= mix(0.22, 1.0, exp(-vDepth * 0.3));
    } else {
      ao = 0.25;
    }
    ao = mix(ao, 1.0, free * 0.8);
    vec3 albedo = mix(vec3(0.07, 0.066, 0.064), vec3(0.3, 0.29, 0.275), vInfo.x);
    vec3 col = lightVoxel(albedo, vWorld, n, nb, ao);
    // Each column lands lit, and cools.
    float rim = max(abs(f.x), abs(f.y));
    col += vec3(0.25, 0.85, 1.0) * vInfo.y * (0.3 + 1.8 * smoothstep(0.38, 0.5, rim));
    // Lifting off for Earth, rock turns to signal: dark, edged in the
    // city's cyan and magenta.
    vec3 signal = mix(vec3(0.2, 0.9, 1.0), vec3(1.0, 0.25, 0.8), step(0.5, vPeel.y));
    col = mix(col, col * 0.35, vPeel.x) + signal * vPeel.x * (0.12 + 2.6 * smoothstep(0.4, 0.5, rim));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// The figures: printed in from the ground up, then, after ignition, taken
// apart like everything else.
const FIGURE_PLACE = /* glsl */ `
  float seed = aInfo.y;
  float tpr = uPrint.x + (aPos.y - uPrint.z) / (uPrint.w - uPrint.z) * uPrint.y;
  float kp = clamp((uS - tpr) / 0.22, 0.0, 1.0);
  float shown = step(0.0001, uS - tpr);
  float glow = shown * exp(-max(uS - tpr, 0.0) * 7.0);
  float td = uApart + seed * 0.6 + (1.0 - aPos.y) * 0.25;
  float age = max(uS - td, 0.0);
  float free = step(td, uS);
  vec3 cw = aPos + free * pulled(age, seed);
  float keep = 1.0 - free * smoothstep(uFree.z - 0.35, uFree.z + 0.05, uS);
  keep *= smoothstep(uEarthR + 2.0, uEarthR + 14.0, length(cw - uEarthPos));
  mat3 R = axisAngle(spinAxis(seed), age * (2.0 + seed * 4.0) * free);
  float peel = free * smoothstep(0.0, 0.5, age);
  float scale = shown * mix(0.5, 1.0, backOut(kp)) * keep * (1.0 + 2.5 * peel);
  vec3 world = cw + R * (position * uFigVox * scale);
`;

const FIGURE_ATTRS = /* glsl */ `
  attribute vec3 aPos;
  attribute vec3 aColor;
  attribute vec2 aInfo;
  uniform float uFigVox;
  uniform vec4 uPrint;
  uniform float uApart;
  uniform vec3 uFree;
`;

const FIGURE_VERTEX = /* glsl */ `
  ${COMMON}
  ${FIGURE_ATTRS}
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vB;
  varying vec2 vFace;
  varying vec3 vColor;
  varying vec3 vInfo;
  varying float vSeed;
  void main() {
    ${FIGURE_PLACE}
    vec3 an = abs(normal);
    vec3 t = an.y > 0.5 ? vec3(1.0, 0.0, 0.0) : an.x > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 b = an.y > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vN = R * normal;
    vT = R * t;
    vB = R * b;
    vFace = an.y > 0.5 ? position.xz : vec2(an.x > 0.5 ? position.z : position.x, position.y);
    vColor = aColor;
    vInfo = vec3(aInfo.x, glow, peel);
    vSeed = seed;
    vWorld = world;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const FIGURE_FRAGMENT = /* glsl */ `
  ${COMMON}
  ${LIGHT}
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vB;
  varying vec2 vFace;
  varying vec3 vColor;
  varying vec3 vInfo;
  varying float vSeed;
  void main() {
    vec3 n = normalize(vN);
    vec3 nb = bevel(n, normalize(vT), normalize(vB), vFace, fwidth(vFace));
    vec3 col = lightVoxel(vColor, vWorld, n, nb, clamp(vInfo.x, 0.3, 1.1));
    // Earth's rim on their silhouettes.
    vec3 v = normalize(cameraPosition - vWorld);
    col += vColor * uEarthLight * 5.0 * pow(1.0 - max(dot(n, v), 0.0), 3.0) * max(dot(n, uEarthDir), 0.0);
    float rim = max(abs(vFace.x), abs(vFace.y));
    col += vec3(0.3, 0.9, 1.0) * vInfo.y * (0.5 + 2.0 * smoothstep(0.36, 0.5, rim));
    vec3 signal = mix(vec3(0.2, 0.9, 1.0), vec3(1.0, 0.25, 0.8), step(0.5, vSeed));
    col = mix(col, col * 0.4, vInfo.z) + signal * vInfo.z * (0.15 + 2.6 * smoothstep(0.38, 0.5, rim));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const DEPTH_FRAGMENT = /* glsl */ `
  void main() { gl_FragColor = vec4(1.0); }
`;

// Earth: the painted disc, a voxel at a time. The face looking out is the
// picture; the terraces toward the limb are its darker sides; the lights on
// the night side glow. Built from the bottom up, and at the reveal flipped
// over from the middle of the frame out, each tile turning away on its own
// edge, so the city shows through the gaps.
const EARTH_VERTEX = /* glsl */ `
  ${COMMON}
  attribute vec3 aCell;
  attribute vec4 aPaint;
  attribute float aSeed;
  uniform mat3 uEarthBasis;
  uniform float uEarthVox;
  uniform float uAspect;
  uniform vec2 uEarthBuild;
  uniform vec2 uWave;
  varying vec3 vPaint;
  varying vec3 vN;
  varying vec2 vFace;
  varying vec4 vInfo;
  void main() {
    vec3 nrm = normalize(aCell);
    float ta = uEarthBuild.x + (nrm.y * 0.5 + 0.5) * uEarthBuild.y + aSeed * 0.35;
    float ka = clamp((uS - ta) / 0.5, 0.0, 1.0);
    float shown = step(0.0001, uS - ta);
    float glow = shown * exp(-max(uS - ta, 0.0) * 3.0);
    vec3 wc = uEarthPos + uEarthBasis * (aCell * uEarthVox);
    vec4 clip = projectionMatrix * viewMatrix * vec4(wc, 1.0);
    vec2 sp = clip.xy / max(abs(clip.w), 1e-3) * vec2(uAspect, 1.0);
    float ds = length(sp) / length(vec2(uAspect, 1.0));
    float tf = uWave.x + ds * uWave.y + aSeed * 0.14;
    float kf = clamp((uS - tf) / 0.42, 0.0, 1.0);
    vec2 d2 = normalize(sp + 1e-4);
    vec3 axisW = (vec4(-d2.y, d2.x, 0.0, 0.0) * viewMatrix).xyz;
    mat3 R = axisAngle(normalize(axisW * uEarthBasis), kf * 2.8);
    float scale = backOut(ka) * shown * (1.0 - smoothstep(0.3, 1.0, kf));
    vec3 lp = R * (position * scale);
    vec3 pop = normalize(cameraPosition - wc) * kf * kf * uEarthVox * 3.0;
    vec3 world = wc + uEarthBasis * (lp * uEarthVox) + pop;
    vec3 an = abs(normal);
    vFace = an.y > 0.5 ? position.xz : vec2(an.x > 0.5 ? position.z : position.x, position.y);
    vN = uEarthBasis * (R * normal);
    vPaint = aPaint.rgb;
    vInfo = vec4(aPaint.a, glow, sin(kf * 3.14159), dot(R * normal, nrm));
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const EARTH_FRAGMENT = /* glsl */ `
  ${COMMON}
  uniform float uEarthGain;
  varying vec3 vPaint;
  varying vec3 vN;
  varying vec2 vFace;
  varying vec4 vInfo;
  void main() {
    vec3 n = normalize(vN);
    vec2 px = fwidth(vFace);
    // The face that looks out is the picture; the others are the terraces.
    float face = mix(0.4, 1.0, smoothstep(0.25, 0.9, vInfo.w));
    float sun = 0.88 + 0.22 * dot(n, uSun);
    // A hairline between tiles, so the middle of the disc reads as mosaic.
    vec2 g = smoothstep(0.5 - (0.045 + px), vec2(0.5), abs(vFace));
    float edge = max(g.x, g.y) * (1.0 - smoothstep(0.1, 0.25, max(px.x, px.y)));
    vec3 col = vPaint * face * sun * (1.0 - 0.14 * edge) * uEarthGain * (1.0 + 0.12 * uLevel);
    col += vec3(1.0, 0.6, 0.24) * vInfo.x * 5.5;
    col += vec3(0.3, 0.9, 1.0) * vInfo.y * (0.25 + 1.4 * edge);
    col += mix(vec3(0.2, 0.9, 1.0), vec3(1.0, 0.25, 0.8), step(0.5, fract(vInfo.x * 7.0 + vFace.x))) * vInfo.z * (0.15 + 2.2 * edge);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// The atmosphere: a soft blue shell a little larger than Earth, brightest at
// the limb and on the sun's side, breathing with the music.
const HALO_VERTEX = /* glsl */ `
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - w.xyz);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 uSun;
  uniform float uLevel;
  uniform float uHalo;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float f = 1.0 - max(dot(normalize(vN), normalize(vView)), 0.0);
    float a = pow(f, 3.0) * (1.0 - smoothstep(0.93, 1.0, f));
    float lit = 0.45 + 0.55 * max(dot(normalize(vN), uSun), 0.0);
    vec3 col = vec3(0.25, 0.52, 1.0) * a * lit * 1.4 * uHalo * (1.0 + 0.3 * uLevel);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Dust off the ground, drifting up through the light, glinting.
const DUST_VERTEX = /* glsl */ `
  ${COMMON}
  attribute vec4 aDust;
  uniform vec3 uFree;
  varying vec3 vN;
  void main() {
    float seed = aDust.w;
    float y = mod(aDust.y + uS * (0.05 + seed * 0.1), 3.0);
    vec3 p = vec3(aDust.x + sin(uS * 0.3 + seed * 20.0) * 0.3, y - 0.1, aDust.z + cos(uS * 0.23 + seed * 13.0) * 0.3);
    float age = max(uS - (uFree.y + seed * 0.8), 0.0);
    p += pulled(age, seed) * step(0.0001, age);
    float fade = smoothstep(0.0, 0.5, y) * smoothstep(3.0, 2.3, y) * smoothstep(T_DUST, T_DUST + 1.2, uS);
    fade *= 1.0 - smoothstep(uFree.z - 0.35, uFree.z, uS);
    mat3 R = axisAngle(spinAxis(seed), uS * (0.6 + seed * 2.0));
    vN = R * normal;
    vec3 world = p + R * position * (0.006 + seed * 0.009) * fade;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;
const DUST_FRAGMENT = /* glsl */ `
  ${COMMON}
  varying vec3 vN;
  void main() {
    float glint = max(dot(normalize(vN), uSun), 0.0);
    vec3 col = vec3(1.0, 0.95, 0.86) * (0.05 + 1.1 * glint * glint);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// The two falling stars: a white-hot head and a trail of cooling cubes.
const METEOR_VERTEX = /* glsl */ `
  ${COMMON}
  attribute vec4 aFrom;
  attribute vec4 aTo;
  attribute vec4 aWhen;
  varying vec3 vColor;
  void main() {
    // aFrom.w: the head's size; aTo.w: the trail's length in seconds;
    // aWhen: start, duration, place along the trail (0 the head), seed.
    float lag = aWhen.z * aTo.w;
    float k = (uS - lag - aWhen.x) / aWhen.y;
    float on = step(0.0, k) * step(k, 1.0);
    // A burnt-out trail thins; a strike's head stays to the ground.
    vec3 p = mix(aFrom.xyz, aTo.xyz, clamp(k, 0.0, 1.0));
    p += (vec3(h11(aWhen.w * 3.1), h11(aWhen.w * 5.7), h11(aWhen.w * 7.9)) - 0.5) * aWhen.z * aFrom.w * 0.5;
    float size = aFrom.w * mix(1.0, 0.16, pow(aWhen.z, 0.7)) * on * (1.0 - smoothstep(0.75, 1.0, k) * step(0.5, aWhen.w));
    mat3 R = axisAngle(spinAxis(aWhen.w), uS * 4.0);
    vec3 heat = mix(vec3(6.0, 5.4, 4.2), vec3(3.0, 1.2, 0.3), smoothstep(0.0, 0.35, aWhen.z));
    vColor = mix(heat, vec3(0.5, 0.08, 0.04), smoothstep(0.35, 1.0, aWhen.z));
    vec3 world = p + R * position * size;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;
// A camera-facing card at the strike, as bright as the flash is.
const FLASH_VERTEX = /* glsl */ `
  uniform vec4 uStrike;
  varying vec2 vUv;
  void main() {
    vUv = position.xy;
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float size = 1.6 + uStrike.w * 0.07;
    vec3 world = uStrike.xyz + (right * position.x * 3.0 + up * position.y) * size;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;
const FLASH_FRAGMENT = /* glsl */ `
  uniform vec4 uStrike;
  varying vec2 vUv;
  void main() {
    vec2 q = vUv * vec2(3.0, 1.0);
    float burst = exp(-dot(q, q) * 6.0);
    float streak = exp(-abs(vUv.y) * 60.0) * exp(-abs(vUv.x) * 1.6);
    vec3 col = vec3(1.0, 0.62, 0.3) * (burst * 1.4 + streak * 0.6) * uStrike.w * 0.06;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const METEOR_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// The strike's debris: rock thrown out of the new crater on slow arcs in the
// moon's gravity, the first of it glowing hot, all of it lit and shadowed.
const DEBRIS_PLACE = /* glsl */ `
  float seed = aKick.w;
  float age = uS - uStrikeAt.w;
  float on = step(0.0, age) * step(age, 7.0);
  vec3 p = uStrikeAt.xyz + aKick.xyz * age + vec3(0.0, -0.95 * age * age, 0.0);
  mat3 R = axisAngle(spinAxis(seed), age * (2.0 + seed * 6.0));
  float keep = on * (1.0 - smoothstep(uFree.z - 0.35, uFree.z, uS));
  vec3 world = p + R * position * (0.05 + seed * 0.16) * keep;
`;
const DEBRIS_ATTRS = /* glsl */ `
  attribute vec4 aKick;
  uniform vec3 uFree;
`;
const DEBRIS_VERTEX = /* glsl */ `
  ${COMMON}
  ${DEBRIS_ATTRS}
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec2 vHeat;
  void main() {
    ${DEBRIS_PLACE}
    vN = R * normal;
    vWorld = world;
    vHeat = vec2(step(0.72, seed) * exp(-max(age, 0.0) * 1.3), seed);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;
const DEBRIS_FRAGMENT = /* glsl */ `
  ${COMMON}
  ${LIGHT}
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec2 vHeat;
  void main() {
    vec3 n = normalize(vN);
    vec3 albedo = mix(vec3(0.08, 0.075, 0.07), vec3(0.26, 0.25, 0.24), vHeat.y);
    vec3 col = lightVoxel(albedo, vWorld, n, n, 1.0);
    col += vec3(4.0, 1.4, 0.35) * vHeat.x;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// The stars, which never come closer however far the camera flies.
const STAR_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixel;
  uniform float uStars;
  attribute float aSize;
  attribute vec3 aTint;
  varying vec3 vTint;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float seed = aTint.r * 13.0 + aSize * 7.0;
    float twinkle = 0.78 + 0.22 * sin(uTime * (0.7 + fract(seed) * 2.4) + seed * 40.0);
    gl_PointSize = aSize * uPixel;
    vTint = aTint * twinkle * uStars;
  }
`;
const STAR_FRAGMENT = /* glsl */ `
  varying vec3 vTint;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vTint * a * a, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Behind everything while the city shows through: black, going to nothing a
// block at a time on the same wave that flips Earth's tiles.
const BACKDROP_VERTEX = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 1.0, 1.0); }
`;
const BACKDROP_FRAGMENT = /* glsl */ `
  uniform float uS;
  uniform vec2 uWave;
  uniform vec2 uResolution;
  uniform float uBlock;
  void main() {
    vec2 cell = floor(gl_FragCoord.xy / uBlock);
    vec2 c = ((cell + 0.5) * uBlock / uResolution) * 2.0 - 1.0;
    float aspect = uResolution.x / uResolution.y;
    float ds = length(c * vec2(aspect, 1.0)) / length(vec2(aspect, 1.0));
    float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    if (uS > uWave.x + ds * uWave.y + h * 0.14 + 0.25) discard;
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
`;

// ---- the camera ---------------------------------------------------------------------------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// The opening: low and close behind the figures, then back and up, round in
// an arc behind them, and down onto the painting's framing.
const OPENING = new THREE.CatmullRomCurve3(
  [V3(0.35, 0.4, 2.15), V3(-0.9, 0.74, 4.4), V3(-2.05, 0.95, 6.35), V3(-1.05, 0.72, 5.55), V3(0, 0.42, 4.6)],
  false,
  "centripetal",
);
const LOOK_FROM = V3(0.05, 0.8, -4.5);
const STILL = { pos: V3(0, 0.42, 4.6), look: V3(0, 2.55, -5.4) };
const PUSHED = { pos: V3(0, 0.47, 3.85), look: V3(0, 2.6, -6.2) };
const RISEN = { pos: V3(5.5, 10.5, 23), look: V3(0, -1.8, -5) };

/** The vertical field of view for an aspect: 50 degrees wide, opening up on
 *  a narrow screen so the figures and Earth still fit across it. */
const fovFor = (fov, aspect) => {
  const k = aspect < 1.6 ? Math.pow(1.6 / aspect, 0.42) : 1;
  return (2 * Math.atan(Math.tan((fov * DEG) / 2) * k)) / DEG;
};

// ---- the builder ----------------------------------------------------------------------------
export async function createVoxelMoon(renderer, shared, { tier = "high" } = {}) {
  const cfg = TIER[tier] ?? TIER.high;
  const image = await preloadVoxelMoon();
  const rand = rng(20260928);
  const terrain = makeTerrain(rand);
  const strike = STRIKE.clone();
  strike.y = Math.round(terrain(strike.x, strike.z).h / cfg.vox) * cfg.vox;

  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 4000);

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const instanced = (count, attrs) => {
    const g = new THREE.InstancedBufferGeometry();
    g.index = cube.index;
    g.setAttribute("position", cube.attributes.position);
    g.setAttribute("normal", cube.attributes.normal);
    for (const [name, array, size] of attrs) g.setAttribute(name, new THREE.InstancedBufferAttribute(array, size));
    g.instanceCount = count;
    return g;
  };

  // Earth's place for this screen: the same direction from the painting's
  // eye, and a size that fits the width it has.
  const earthPos = new THREE.Vector3();
  const earthBasis = new THREE.Matrix3();
  const toEarth = new THREE.Vector3();
  const earthDir = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const aimNormal = new THREE.Vector3();
  let earthR = 100;
  const placeEarth = (aspect) => {
    const angle = (17 + 11 * smooth01((aspect - 0.6) / 0.9)) * DEG;
    earthR = EARTH_DISTANCE * Math.sin(angle);
    earthPos.set(0, Math.sin(EARTH_ELEVATION), -Math.cos(EARTH_ELEVATION)).multiplyScalar(EARTH_DISTANCE).add(EYE);
    // Its frame: x right, y up, z back toward the eye (the painting's view).
    const f = EYE.clone().sub(earthPos).normalize();
    const u = new THREE.Vector3(0, 1, 0).addScaledVector(f, -f.y).normalize();
    const r = new THREE.Vector3().crossVectors(u, f);
    earthBasis.set(r.x, u.x, f.x, r.y, u.y, f.y, r.z, u.z, f.z);
    toEarth.copy(earthPos).sub(V3(ISLAND.x, 0, ISLAND.z)).normalize();
    earthDir.copy(earthPos).sub(PIVOT).normalize();
    // Where the dive ends: over the lights of Europe, on the night side.
    aimNormal.set(0.5, 0.31, 0.81).normalize().applyMatrix3(earthBasis);
    aim.copy(earthPos).addScaledVector(aimNormal, earthR);
  };
  placeEarth(16 / 9);

  const uniforms = {
    uS: { value: 0 },
    uTime: shared.uTime,
    uLevel: shared.uLevel,
    uSun: { value: SUN },
    uSunColor: { value: SUN_COLOR },
    uEarthDir: { value: earthDir },
    uEarthLight: { value: EARTH_LIGHT },
    uAmbient: { value: AMBIENT },
    uToEarth: { value: toEarth },
    uEarthPos: { value: earthPos },
    uEarthR: { value: earthR },
    uStrike: { value: new THREE.Vector4(strike.x, strike.y + 1.2, strike.z, 0) },
    uStrikeAt: { value: new THREE.Vector4(strike.x, strike.y, strike.z, T.strike) },
    uFree: { value: new THREE.Vector3(T.crumble, T.peel, T.reveal) },
  };

  // ---- the sun's shadow map ------------------------------------------------------------
  const shadowTarget = new THREE.WebGLRenderTarget(cfg.shadow, cfg.shadow);
  shadowTarget.depthTexture = new THREE.DepthTexture(cfg.shadow, cfg.shadow, THREE.UnsignedIntType);
  shadowTarget.depthTexture.format = THREE.DepthFormat;
  shadowTarget.depthTexture.compareFunction = THREE.LessEqualCompare;
  shadowTarget.depthTexture.minFilter = THREE.LinearFilter;
  shadowTarget.depthTexture.magFilter = THREE.LinearFilter;
  const sunCamera = new THREE.OrthographicCamera(-22, 22, 22, -22, 44, 96);
  sunCamera.position.set(ISLAND.x, 0, ISLAND.z).addScaledVector(SUN, 70);
  sunCamera.lookAt(ISLAND.x, 0, ISLAND.z);
  sunCamera.updateMatrixWorld();
  sunCamera.updateProjectionMatrix();
  const shadowMatrix = new THREE.Matrix4().multiplyMatrices(sunCamera.projectionMatrix, sunCamera.matrixWorldInverse);
  const shadowScene = new THREE.Scene();
  const lit = {
    uShadowMap: { value: shadowTarget.depthTexture },
    uShadowMatrix: { value: shadowMatrix },
    uShadowTexel: { value: 1 / cfg.shadow },
  };

  const parts = [];
  const add = (name, geometry, material, { depth = null, order = 0 } = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    scene.add(mesh);
    let twin = null;
    if (depth) {
      twin = new THREE.Mesh(geometry, depth);
      twin.frustumCulled = false;
      shadowScene.add(twin);
    }
    parts.push({ mesh, geometry, material, depth, twin });
    return mesh;
  };
  const shaded = (name, vertexShader, fragmentShader, extra = {}, options = {}) => {
    const material = new THREE.ShaderMaterial({ uniforms: { ...uniforms, ...lit, ...extra }, vertexShader, fragmentShader, ...options });
    material.name = name;
    return material;
  };
  const depthOnly = (name, attrs, place, extra = {}) => {
    const material = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, ...extra },
      vertexShader: `${COMMON}\n${attrs}\nvoid main() {\n${place}\ngl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);\n}`,
      fragmentShader: DEPTH_FRAGMENT,
      colorWrite: false,
    });
    material.name = `${name}-depth`;
    return material;
  };

  // ---- the island --------------------------------------------------------------------
  const island = buildIsland(cfg, terrain);
  const groundExtra = {
    uBuild: { value: new THREE.Vector3(T.ground, 0, 0) },
    uIsland: { value: new THREE.Vector3(ISLAND.x, ISLAND.z, cfg.island) },
  };
  add(
    "moon-ground",
    instanced(island.count, [["aCol", island.col, 4], ["aNb", island.nb, 4], ["aNbD", island.nbd, 4], ["aTone", island.tone, 3]]),
    shaded("moon-ground", GROUND_VERTEX, GROUND_FRAGMENT, groundExtra),
    { depth: depthOnly("moon-ground", GROUND_ATTRS, GROUND_PLACE, groundExtra) },
  );

  // ---- the figures ---------------------------------------------------------------------
  const voxels = [];
  sculpt(david(), [-0.45, 0, 0], cfg.fig, voxels);
  sculpt(lucy(), [0.42, 0, 0.02], cfg.fig, voxels);
  const figPos = new Float32Array(voxels.length * 3);
  const figColor = new Float32Array(voxels.length * 3);
  const figInfo = new Float32Array(voxels.length * 2);
  voxels.forEach((v, i) => {
    figPos.set([v.x, v.y, v.z], i * 3);
    figColor.set([v.r, v.g, v.b], i * 3);
    figInfo.set([v.ao, v.seed], i * 2);
  });
  const figureExtra = {
    uFigVox: { value: cfg.fig },
    uPrint: { value: new THREE.Vector4(T.print, 1.1, 0, 1.0) },
    uApart: { value: T.apart },
  };
  add(
    "moon-figures",
    instanced(voxels.length, [["aPos", figPos, 3], ["aColor", figColor, 3], ["aInfo", figInfo, 2]]),
    shaded("moon-figures", FIGURE_VERTEX, FIGURE_FRAGMENT, figureExtra),
    { depth: depthOnly("moon-figures", FIGURE_ATTRS, FIGURE_PLACE, figureExtra) },
  );

  // ---- Earth -----------------------------------------------------------------------------
  const earth = buildEarth(image, cfg.earth + 0.35);
  const earthExtra = {
    uEarthBasis: { value: earthBasis },
    uEarthVox: { value: earthR / cfg.earth },
    uAspect: { value: 16 / 9 },
    uEarthBuild: { value: new THREE.Vector2(T.earth, 1.6) },
    uWave: { value: new THREE.Vector2(T.reveal, 0.78) },
    uEarthGain: { value: 1.2 },
  };
  add(
    "moon-earth",
    instanced(earth.count, [["aCell", earth.cell, 3], ["aPaint", earth.paint, 4], ["aSeed", earth.seed, 1]]),
    shaded("moon-earth", EARTH_VERTEX, EARTH_FRAGMENT, earthExtra),
  );
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: { uSun: uniforms.uSun, uLevel: shared.uLevel, uHalo: { value: 0 } },
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  haloMaterial.name = "moon-halo";
  const halo = add("moon-halo", new THREE.SphereGeometry(1, 96, 64), haloMaterial, { order: 5 });

  // ---- dust, meteors, debris --------------------------------------------------------------
  const dust = new Float32Array(cfg.dust * 4);
  for (let i = 0; i < cfg.dust; i++) dust.set([(rand() - 0.5) * 8, rand() * 3, -6.5 + rand() * 8.5, rand()], i * 4);
  add(
    "moon-dust",
    instanced(cfg.dust, [["aDust", dust, 4]]),
    shaded("moon-dust", DUST_VERTEX.replaceAll("T_DUST", (T.ground + 1.6).toFixed(2)), DUST_FRAGMENT, { uFree: uniforms.uFree }),
  );

  const TRAIL = 40;
  const meteorFrom = new Float32Array(TRAIL * 2 * 4);
  const meteorTo = new Float32Array(TRAIL * 2 * 4);
  const meteorWhen = new Float32Array(TRAIL * 2 * 4);
  const paths = [
    // A star burning out across the sky to the right of Earth.
    { from: V3(78, 64, -92), to: V3(18, 40, -112), head: 1.4, trail: 0.55, at: METEOR_AT[0], duration: 1.25, strike: false },
    // The second comes down on the right of the horizon.
    { from: V3(46, 34, -34), to: strike, head: 0.4, trail: 0.3, at: METEOR_AT[1], duration: T.strike - METEOR_AT[1], strike: true },
  ];
  paths.forEach((m, j) => {
    for (let i = 0; i < TRAIL; i++) {
      const k = j * TRAIL + i;
      meteorFrom.set([m.from.x, m.from.y, m.from.z, m.head], k * 4);
      meteorTo.set([m.to.x, m.to.y, m.to.z, m.trail], k * 4);
      // The strike's seed stays under a half, so its head is not burnt out.
      meteorWhen.set([m.at, m.duration, i / TRAIL, m.strike ? rand() * 0.5 : 0.5 + rand() * 0.5], k * 4);
    }
  });
  add(
    "moon-meteors",
    instanced(TRAIL * 2, [["aFrom", meteorFrom, 4], ["aTo", meteorTo, 4], ["aWhen", meteorWhen, 4]]),
    shaded("moon-meteors", METEOR_VERTEX, METEOR_FRAGMENT),
  );

  // The strike's flash: a soft burst and a long horizontal streak, the way
  // a lens takes a light that bright.
  const flashMaterial = new THREE.ShaderMaterial({
    uniforms: { uStrike: uniforms.uStrike },
    vertexShader: FLASH_VERTEX,
    fragmentShader: FLASH_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  flashMaterial.name = "moon-flash";
  add("moon-flash", new THREE.PlaneGeometry(2, 2), flashMaterial, { order: 6 });

  const kick = new Float32Array(cfg.debris * 4);
  const out = V3(strike.x - ISLAND.x, 0, strike.z - ISLAND.z).normalize();
  for (let i = 0; i < cfg.debris; i++) {
    // Thrown up and mostly out, away from the island's middle.
    const a = rand() * Math.PI * 2;
    const spread = 0.55 + rand() * 0.45;
    const d = V3(Math.cos(a) * spread + out.x * 0.9, 1.1 + rand() * 1.4, Math.sin(a) * spread + out.z * 0.9).normalize();
    const speed = 2.2 + rand() * 4.8;
    kick.set([d.x * speed, d.y * speed, d.z * speed, rand()], i * 4);
  }
  const debrisExtra = { uFree: uniforms.uFree };
  add(
    "moon-debris",
    instanced(cfg.debris, [["aKick", kick, 4]]),
    shaded("moon-debris", DEBRIS_VERTEX, DEBRIS_FRAGMENT, debrisExtra),
    { depth: depthOnly("moon-debris", DEBRIS_ATTRS, DEBRIS_PLACE, debrisExtra) },
  );

  // ---- the sky -------------------------------------------------------------------------------
  const starPos = new Float32Array(cfg.stars * 3);
  const starSize = new Float32Array(cfg.stars);
  const starTint = new Float32Array(cfg.stars * 3);
  const band = V3(0.35, 0.8, -0.5).normalize();
  for (let i = 0; i < cfg.stars; i++) {
    // Uniform over the sphere, with a third of them drawn toward a band.
    let d = V3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    while (d.lengthSq() > 1 || d.lengthSq() < 1e-4) d.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    d.normalize();
    if (i % 3 === 0) d.addScaledVector(band, -d.dot(band) * (0.75 + rand() * 0.2)).normalize();
    starPos.set(d.multiplyScalar(1500).toArray(), i * 3);
    const big = rand();
    starSize[i] = big > 0.985 ? 2.6 + rand() : big > 0.9 ? 1.7 + rand() * 0.5 : 0.9 + rand() * 0.6;
    const warm = rand();
    const b = (0.35 + rand() * 0.65) * (big > 0.9 ? 1.6 : 1);
    starTint.set(warm > 0.85 ? [b, b * 0.82, b * 0.62] : warm > 0.6 ? [b * 0.78, b * 0.86, b] : [b, b, b], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeometry.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
  starGeometry.setAttribute("aTint", new THREE.BufferAttribute(starTint, 3));
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uPixel: { value: 1 }, uStars: { value: 0 } },
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });
  starMaterial.name = "moon-stars";
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = "moon-stars";
  stars.frustumCulled = false;
  stars.renderOrder = -10;
  scene.add(stars);
  parts.push({ mesh: stars, geometry: starGeometry, material: starMaterial });

  const backdropGeometry = new THREE.BufferGeometry();
  backdropGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const backdropMaterial = new THREE.ShaderMaterial({
    uniforms: { uS: uniforms.uS, uWave: earthExtra.uWave, uResolution: { value: new THREE.Vector2(1, 1) }, uBlock: { value: 40 } },
    vertexShader: BACKDROP_VERTEX,
    fragmentShader: BACKDROP_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  backdropMaterial.name = "moon-backdrop";
  const backdrop = add("moon-backdrop", backdropGeometry, backdropMaterial, { order: -20 });
  backdrop.visible = false;

  // ---- the camera, on the song ------------------------------------------------------------
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const dive = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const hover = new THREE.Vector3();
  const horizon = new THREE.Vector3();
  // The end of the dive: high over the lights of the night side, looking a
  // little up toward the limb, so the atmosphere arcs across the top.
  const hoverAt = (at, lookAt) => {
    at.copy(aim).addScaledVector(aimNormal, earthR * 0.75);
    const north = tmp.set(0, 1, 0).addScaledVector(aimNormal, -aimNormal.y).normalize();
    lookAt.copy(aim).addScaledVector(north, earthR * 0.28);
  };
  const bezier = (p, t, outV) => {
    const u = 1 - t;
    return outV
      .copy(p[0]).multiplyScalar(u * u * u)
      .addScaledVector(p[1], 3 * u * u * t)
      .addScaledVector(p[2], 3 * u * t * t)
      .addScaledVector(p[3], t * t * t);
  };
  const shot = (s, aspect) => {
    let fov = 50;
    let roll = 0;
    // How far the narrow-screen framing applies: all of it on the ground,
    // none of it once the camera has left for Earth.
    let near = 1;
    if (s < T.still) {
      const k = clamp01((s - SONG_START) / (T.still - SONG_START));
      const u = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      OPENING.getPointAt(u, pos);
      look.copy(LOOK_FROM).lerp(STILL.look, easeInOut(k * 1.25));
      fov = 42 + 8 * easeInOut(k * 1.4);
    } else if (s < T.rise) {
      const k = smooth01((s - T.still) / (T.rise - T.still));
      pos.copy(STILL.pos).lerp(PUSHED.pos, k);
      look.copy(STILL.look).lerp(PUSHED.look, k);
    } else if (s < T.dive) {
      const k = easeInOut((s - T.rise) / (T.dive - T.rise));
      pos.copy(PUSHED.pos).lerp(RISEN.pos, k);
      pos.y += Math.sin(k * Math.PI) * 0.8;
      look.copy(PUSHED.look).lerp(RISEN.look, easeInOut(k * 1.2));
      fov = 50 + 4 * k;
    } else if (s < T.reveal) {
      const k = clamp01((s - T.dive) / (T.reveal - T.dive));
      // Slow off the mark, then a plunge that eases into the hover.
      const u = 1 - Math.pow(1 - Math.pow(k, 1.8), 2.4);
      hoverAt(hover, horizon);
      dive[0].copy(RISEN.pos);
      dive[1].copy(RISEN.pos).add(tmp.set(0, 14, -16));
      dive[2].copy(hover).addScaledVector(aimNormal, earthR * 0.7);
      dive[3].copy(hover);
      bezier(dive, u, pos);
      look.copy(RISEN.look).lerp(earthPos, smooth01(k / 0.4)).lerp(horizon, smooth01((k - 0.35) / 0.5));
      fov = 54 + 12 * Math.sin(Math.min(1, k / 0.8) * Math.PI) - 4 * smooth01((k - 0.8) / 0.2);
      roll = -5 * DEG * Math.sin(k * Math.PI);
      near = 1 - smooth01(k / 0.2);
    } else {
      const k = clamp01((s - T.reveal) / (T.gone - T.reveal));
      hoverAt(hover, horizon);
      pos.copy(hover).addScaledVector(aimNormal, -earthR * 0.06 * k);
      look.copy(horizon);
      fov = 50 - 5 * k;
      near = 0;
    }
    // The narrow screen: further back, a wider lens, and the horizon lower.
    const portrait = smooth01((1.25 - aspect) / 0.6) * near;
    if (portrait > 0) {
      tmp.copy(look).sub(pos);
      pos.x += (PIVOT.x - pos.x) * 0.8 * portrait;
      pos.sub(PIVOT).multiplyScalar(1 + 0.32 * portrait).add(PIVOT);
      const len = tmp.length();
      tmp.normalize();
      const right = new THREE.Vector3().crossVectors(tmp, V3(0, 1, 0)).normalize();
      tmp.applyAxisAngle(right, 9 * DEG * portrait);
      look.copy(pos).addScaledVector(tmp, len);
    }
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    if (roll) camera.rotateZ(roll);
    // A hand on the camera: a fraction of a degree, never still.
    const t = s * 0.9;
    camera.rotateY(0.12 * DEG * (Math.sin(t * 0.7) + 0.5 * Math.sin(t * 1.9 + 1.3)));
    camera.rotateX(0.08 * DEG * (Math.sin(t * 0.53 + 0.4) + 0.5 * Math.sin(t * 1.3 + 2.1)));
    const want = fovFor(fov, aspect);
    if (Math.abs(camera.fov - want) > 1e-4 || camera.aspect !== aspect) {
      camera.fov = want;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  };

  let lastAspect = 0;
  let lastS = 0;
  let shadowsDrawn = false;
  return {
    scene,
    camera,
    /** Pose the moon for song second `s` on a `width` by `height` screen. */
    update(s, { width, height, pixelRatio, over }) {
      const aspect = width / height;
      if (Math.abs(aspect - lastAspect) > 1e-3) {
        lastAspect = aspect;
        placeEarth(aspect);
        uniforms.uEarthR.value = earthR;
        earthExtra.uEarthVox.value = earthR / cfg.earth;
        earthExtra.uAspect.value = aspect;
        halo.scale.setScalar(earthR * 1.035);
        halo.position.copy(earthPos);
        halo.updateMatrixWorld();
      }
      uniforms.uS.value = s;
      lastS = s;
      shot(s, aspect);
      stars.position.copy(camera.position);
      stars.updateMatrixWorld();
      starMaterial.uniforms.uStars.value = smooth01((s - SONG_START) / 1.4) * (1 - smooth01((s - T.reveal + 0.4) / 0.4));
      starMaterial.uniforms.uPixel.value = pixelRatio;
      haloMaterial.uniforms.uHalo.value = smooth01((s - T.earth - 1.4) / 1.0) * (1 - smooth01((s - T.reveal - 0.1) / 0.5));
      // The strike's flash: a hot pulse as it lands, then a glow that dies.
      const since = s - T.strike;
      uniforms.uStrike.value.w = since < -0.3 ? 0 : since < 0 ? 4 * (1 + since / 0.3) : 30 * Math.exp(-since * 2.4);
      backdrop.visible = Boolean(over);
      backdropMaterial.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
      backdropMaterial.uniforms.uBlock.value = Math.round(Math.max(24, Math.min(width, height) / 18) * pixelRatio);
    },
    /** Draw the sun's shadow map while there is still ground to cast it
     *  (and once regardless, so a run that starts late samples a real one). */
    renderShadows() {
      if (lastS > T.peel + 1.6 && shadowsDrawn) return;
      shadowsDrawn = true;
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(shadowTarget);
      renderer.clear(true, true, false);
      renderer.render(shadowScene, sunCamera);
      renderer.setRenderTarget(prev);
    },
    /** Compile every material before the intro needs one. */
    async compile() {
      shot(T.still, 16 / 9);
      backdrop.visible = true;
      if (renderer.compileAsync) {
        await renderer.compileAsync(scene, camera);
        await renderer.compileAsync(shadowScene, sunCamera);
      } else {
        renderer.compile(scene, camera);
        renderer.compile(shadowScene, sunCamera);
      }
      backdrop.visible = false;
    },
    get counts() {
      return { ground: island.count, figures: voxels.length, earth: earth.count };
    },
    dispose() {
      for (const p of parts) {
        p.mesh.removeFromParent();
        p.twin?.removeFromParent();
        p.material.dispose();
        p.depth?.dispose();
        if (p.geometry !== cube) p.geometry.dispose();
      }
      cube.dispose();
      shadowTarget.depthTexture.dispose();
      shadowTarget.dispose();
    },
  };
}
