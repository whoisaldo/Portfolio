// src/world/crowd-people.js: the figure the crowd is made of.
//
// One low-poly person, built here from rings: standing, arms down, looking
// toward +z, 1.76 m to the crown. Every vertex knows which piece of the body
// it rides (SEG), what it is made of (PART) and, for the things only some
// people have (a hairstyle, a long coat, a bag, an umbrella, a visor), which
// of those it belongs to (TAG). crowd.js's vertex shader turns the segments
// about the joints in RIG, colours the parts person by person and folds away
// the tags a person does not wear. Two builds on the same joints. The near
// one is for the few people within a couple of dozen metres: a head with a
// brow, eye sockets and eyes, a nose, lips, ears and a jaw; hands with a
// thumb and a mitten of fingers; limbs that taper through elbows and knees;
// clothes with a hem, cuffs, a collar and folds; round where a body is round
// (smoothed normals) and creased where cloth folds, with the shade of a
// socket or an armpit kept as the length of the normal. The far one is a
// few hundred triangles, for people too small on screen to tell the two
// apart.
import * as THREE from "three";

/** The joints, in metres, for the figure as built (crown at `height`). */
export const RIG = {
  height: 1.76,
  hipX: 0.095,
  hipY: 0.93,
  kneeY: 0.5,
  ankleY: 0.085,
  thigh: 0.43,
  shin: 0.415,
  waistY: 1.05,
  shoulderX: 0.185,
  shoulderY: 1.43,
  elbowX: 0.2,
  elbowY: 1.15,
  headY: 1.52,
  // Where a hand closes on what it holds.
  grip: [0.208, 0.83, 0],
  // One full cycle of the walk (two steps), and how high a seat's top sits
  // under the hips of someone sitting on it.
  stride: 1.24,
  seat: 0.86,
};

export const SEG = { pelvis: 0, torso: 1, head: 2, upper: 3, fore: 4, thigh: 5, shin: 6, foot: 7 };

export const PART = {
  skin: 0,
  hair: 1,
  scalp: 2,
  jacket: 3,
  sleeve: 4,
  coat: 5,
  hood: 6,
  trousers: 7,
  shoe: 8,
  bag: 9,
  dark: 10,
  canopy: 11,
  rim: 12,
  phone: 13,
  ember: 14,
  paper: 15,
  eye: 16,
  mouth: 17,
  trim: 18,
  brim: 19,
  tote: 20,
  brow: 21,
  seam: 22,
  shirt: 23,
  sclera: 24,
  line: 25,
  flap: 26,
  metal: 27,
  visor: 28,
  cuff: 29,
  lapel: 30,
  band: 31,
  helmet: 32,
  tie: 33,
  socket: 34,
  sole: 35,
  stitch: 36,
  crate: 37,
};

/** What only some people have: a bit each in a person's mask. */
export const TAG = {
  hair: 1,
  long: 2,
  mohawk: 3,
  bun: 4,
  brim: 5,
  hood: 6,
  skirt: 7,
  collar: 8,
  hipbag: 9,
  backpack: 10,
  tote: 11,
  umbrella: 12,
  phone: 13,
  smoke: 14,
  trim: 15,
  cyber: 16,
  visor: 17,
  cup: 18,
  // A jacket worn open over what is under it; a suit's lapels and the shirt
  // between them; a tie; a hi-vis vest's reflective bands; a hard hat. (A
  // person's mask is a float: 23 is the last bit it keeps exactly.)
  open: 19,
  suit: 20,
  tie: 21,
  hivis: 22,
  hardhat: 23,
};
/** What the closest figure has more of, dealt by a person's seed and not by
 *  a bit of their mask (crowd.js's vertex shader): three ways of wearing
 *  hair that has any length to it. */
export const STYLE = { parted: 32, fringe: 33, swept: 34 };
/** And what a pose brings with it: the near half of a crate two people
 *  carry between them. */
export const CARRIED = 35;

/** How an arm holds an umbrella up (the hand in front of the shoulder, so
 *  the shaft passes beside the head), a phone in front of the chest, a cup:
 *  the shoulder swung forward, out from the body, the elbow bent, the
 *  forearm turned in across the chest (radians). */
export const HOLD = {
  umbrella: { pitch: -0.5, roll: 0, elbow: 2.4, inward: -0.1 },
  phone: { pitch: 0.2, roll: 0.06, elbow: 1.6, inward: 0.5 },
  cup: { pitch: 0.1, roll: 0.05, elbow: 1.5, inward: 0.32 },
};

/** Where the grip of the +x arm is with the arm held so: the same turns,
 *  in the same order, as the vertex shader makes. */
export function gripAt({ pitch, roll, elbow, inward }) {
  let [x, y, z] = RIG.grip;
  let ry = y - RIG.elbowY;
  let rz = z;
  [ry, rz] = [ry * Math.cos(elbow) + rz * Math.sin(elbow), -ry * Math.sin(elbow) + rz * Math.cos(elbow)];
  let rx = x - RIG.elbowX;
  [rx, rz] = [rx * Math.cos(-inward) + rz * Math.sin(-inward), -rx * Math.sin(-inward) + rz * Math.cos(-inward)];
  x = RIG.elbowX + rx;
  y = RIG.elbowY + ry;
  z = rz;
  let sx = x - RIG.shoulderX;
  let sy = y - RIG.shoulderY;
  [sx, sy] = [sx * Math.cos(roll) - sy * Math.sin(roll), sx * Math.sin(roll) + sy * Math.cos(roll)];
  let sz = z;
  [sy, sz] = [sy * Math.cos(pitch) + sz * Math.sin(pitch), -sy * Math.sin(pitch) + sz * Math.cos(pitch)];
  return [RIG.shoulderX + sx, RIG.shoulderY + sy, sz];
}

/** The middle of the phone and of the cigarette's tip in the hanging hand:
 *  the shader grows both about these, far off, so a lit screen never falls
 *  between pixels. */
export const PHONE_AT = [0.208, 0.775, 0.032];
export const EMBER_AT = [0.208, 0.763, -0.05];
/** The umbrella's rim, as built: its half height (a line on the canopy's
 *  edge close to; the shader keeps it a pixel and a half tall far off). */
export const RIM_HALF = 0.006;
/** The umbrella's canopy: over the head from the hand that holds it, how
 *  high its edge is and how wide it is. */
export const CANOPY = { x: gripAt(HOLD.umbrella)[0] - 0.13, z: gripAt(HOLD.umbrella)[2] - 0.13, edge: 1.865, radius: 0.54 };

// The standing poses, in the builder's order (kit.POSES). Five rows of four
// each: how far the hips drop, the lean back about the heels, the chest's
// pitch forward, the head's pitch down; hip and knee of the -x leg, then of
// the +x leg; the -x arm (shoulder forward, out, elbow, forearm turned in);
// the +x arm; what moves while they stand (0 a sway, 1 a talker's hand, 2 a
// cigarette to the mouth, 3 a vendor's hands, 4 a thumb on a phone), the
// head's turn, how far the hips sit back from where they stand, and whether
// the hands are full (so nobody is dealt a cup, a phone at the ear or a hand
// in a pocket with it).
// After the builder's eight: sat on the ground with the knees up, lying on
// the back with a knee up (the lean is a quarter turn: the drop then lays
// them about where they are stood, and the sit back is how high the back
// lies), leaning on a rail on the forearms and looking out over it, standing
// in a queue (as idle, but nobody turns to their neighbour), holding one end
// of a crate (crowd.js stands the other end's holder), and down on one knee
// at a job with both hands on it.
export const POSES = ["idle", "talk", "lean", "sit", "phone", "squat", "vendor", "smoke", "floor", "lie", "rail", "queue", "carry", "work"];
export const POSE_TABLE = [
  // idle
  [0, 0, 0.02, 0.03, 0, 0.03, 0, 0.03, 0.03, 0.02, 0.2, 0.12, 0.03, 0.02, 0.2, 0.12, 0, 0, 0, 0],
  // talk (whose turn it is lifts a hand: crowd.js)
  [0, 0, 0.04, 0, 0, 0.03, 0.06, 0.1, 0.05, 0.03, 0.2, 0.1, 0.04, 0.03, 0.22, 0.12, 1, 0, 0, 0],
  // lean
  [0, 0.13, 0.02, 0.12, 0, 0, 0.55, 1.25, 0.25, 0.1, 1.6, 0.9, 0.27, 0.1, 1.5, 0.95, 0, 0.25, 0, 0],
  // sit
  [RIG.seat, 0, 0.12, 0.04, 1.5, 1.5, 1.5, 1.5, 0.35, 0.08, 1.15, 0.25, 0.35, 0.08, 1.15, 0.25, 0, 0, 0, 0],
  // phone
  [0, 0, 0.06, 0.38, 0, 0.03, 0.04, 0.08, 0, 0.02, 0.15, 0.1, HOLD.phone.pitch, HOLD.phone.roll, HOLD.phone.elbow, HOLD.phone.inward, 4, 0, 0, 0],
  // squat
  [0.65, 0, 0.55, -0.35, 1.95, 2.5, 1.95, 2.5, 1.0, 0.12, 0.5, 0.3, 1.0, 0.12, 0.5, 0.3, 0, 0, -0.09, 0],
  // vendor
  [0, 0, 0.08, 0.05, 0, 0.03, 0, 0.03, 0.25, 0.12, 1.15, 0.15, 0.25, 0.12, 1.15, 0.15, 3, 0, 0, 0],
  // smoke
  [0, 0, 0.02, 0, 0, 0, 0.1, 0.2, -0.05, 0.04, 0.35, 0.2, 0.15, 0.08, 1.0, 0.3, 2, 0, 0, 0],
  // floor
  [0.8, 0.1, 0.28, 0.08, 2.25, 1.54, 1.68, 0.3, 0.95, 0.1, 0.5, 0.2, -0.2, 0.25, 0.15, 0, 0, 0, 0, 0],
  // lie
  [0.88, 1.5708, 0, -0.1, 0.05, 0.1, 0.5, 1.0, 0.35, 0.05, 1.5, 0.9, -0.1, 0.5, 0.3, 0, 0, 0.5, 0.11, 0],
  // rail (the chest is pitched forward, so the upper arms hang a little ahead
  // of it and the forearms lie level along the rail, turned in to meet)
  [0.02, 0, 0.6, -0.32, -0.12, 0.05, 0.2, 0.45, 0.75, 0.12, 1.45, 0.55, 0.75, 0.12, 1.45, 0.5, 0, 0, -0.1, 1],
  // queue
  [0, 0, 0.02, 0.03, 0, 0.03, 0, 0.03, 0.03, 0.02, 0.2, 0.12, 0.03, 0.02, 0.2, 0.12, 0, 0, 0, 0],
  // carry
  [0.03, 0, -0.06, 0.02, 0.15, 0.2, -0.1, 0.05, 0.42, 0.06, 0.4, 0.12, 0.42, 0.06, 0.4, 0.12, 0, 0, 0, 1],
  // work
  [0.4, 0, 0.6, 0.25, -0.15, 1.55, 1.45, 1.6, 0.8, 0.08, 0.5, 0.25, 0.8, 0.08, 0.5, 0.25, 3, 0, 0, 1],
];

// ---- building ---------------------------------------------------------------
// A vertex is [x, y, z, segment, weight, shade]; a triangle carries what it
// is made of, its tag, its smoothing group (0 is faceted) and a shade for
// the vertices that have none of their own (1 is open to the street, less
// is a socket, an armpit, the inside of a hood).

/** How much wider than its circle an n-sided ring is drawn, so a hexagon
 *  reads as thick as the limb it stands for. */
const widen = (n) => (1 + 1 / Math.cos(Math.PI / n)) / 2;

function soup() {
  const tris = [];
  /** A triangle, turned to face away from `ref`. */
  const tri = (a, b, c, o, ref) => {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-14) return;
    const out = nx * ((a[0] + b[0] + c[0]) / 3 - ref[0]) + ny * ((a[1] + b[1] + c[1]) / 3 - ref[1]) + nz * ((a[2] + b[2] + c[2]) / 3 - ref[2]) >= 0;
    tris.push(out !== Boolean(o.inside) ? [a, b, c, o] : [a, c, b, o]);
  };
  const quad = (a, b, c, d, o, ref) => {
    tri(a, b, c, o, ref);
    tri(a, c, d, o, ref);
  };
  const middle = (ring) => {
    const m = [0, 0, 0];
    for (const p of ring) for (let k = 0; k < 3; k++) m[k] += p[k] / ring.length;
    return m;
  };
  /** Rings of the same count joined by quads; `skip` leaves panels out. */
  const loft = (rings, o, { open = false, skip = null, ref: from = null } = {}) => {
    for (let r = 0; r < rings.length - 1; r++) {
      const A = rings[r];
      const B = rings[r + 1];
      const ma = middle(A);
      const mb = middle(B);
      const ref = from ?? [(ma[0] + mb[0]) / 2, (ma[1] + mb[1]) / 2, (ma[2] + mb[2]) / 2];
      const n = A.length;
      for (let i = 0; i < (open ? n - 1 : n); i++) {
        if (skip?.(r, i)) continue;
        const j = (i + 1) % n;
        quad(A[i], A[j], B[j], B[i], o, ref);
      }
    }
  };
  /** A ring closed to a point. */
  const cap = (ring, apex, o, ref) => {
    for (let i = 0; i < ring.length; i++) tri(apex, ring[i], ring[(i + 1) % ring.length], o, ref);
  };
  /** A box by its middle and half sizes; `skip` names faces left out
   *  ("x-", "y+", ...), `top` narrows its top face. */
  const box = (c, h, seg, o, { skip = "", aux = 0, top = 1 } = {}) => {
    const P = (sx, sy, sz) => [c[0] + sx * h[0] * (sy > 0 ? top : 1), c[1] + sy * h[1], c[2] + sz * h[2] * (sy > 0 ? top : 1), seg, aux];
    const faces = {
      "x-": [P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)],
      "x+": [P(1, -1, -1), P(1, -1, 1), P(1, 1, 1), P(1, 1, -1)],
      "y-": [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)],
      "y+": [P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)],
      "z-": [P(-1, -1, -1), P(1, -1, -1), P(1, 1, -1), P(-1, 1, -1)],
      "z+": [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)],
    };
    for (const [name, f] of Object.entries(faces)) if (!skip.includes(name)) quad(f[0], f[1], f[2], f[3], o, c);
  };
  return { tris, tri, quad, loft, cap, box };
}

/** The triangles as an indexed geometry: position, normal (smoothed inside a
 *  smoothing group, faceted outside one; its length is the vertex's shade)
 *  and aRig (segment, part, tag, weight). */
function finish(tris) {
  const key = (p) => `${Math.round(p[0] * 5000)},${Math.round(p[1] * 5000)},${Math.round(p[2] * 5000)}`;
  const faceN = tris.map(([a, b, c]) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  });
  const sums = new Map();
  tris.forEach((t, i) => {
    const g = t[3].smooth;
    if (!g) return;
    for (let k = 0; k < 3; k++) {
      const id = `${g}|${key(t[k])}`;
      const s = sums.get(id) ?? [0, 0, 0];
      for (let c = 0; c < 3; c++) s[c] += faceN[i][c];
      sums.set(id, s);
    }
  });
  const unit = (n) => {
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  const seen = new Map();
  const pos = [];
  const nor = [];
  const rig = [];
  const index = [];
  tris.forEach((t, i) => {
    const o = t[3];
    for (let k = 0; k < 3; k++) {
      const p = t[k];
      const n = unit(o.smooth ? sums.get(`${o.smooth}|${key(p)}`) : faceN[i]);
      const shade = p[5] ?? o.ao ?? 1;
      const id = `${key(p)}|${Math.round(n[0] * 100)},${Math.round(n[1] * 100)},${Math.round(n[2] * 100)}|${p[3]},${o.part},${o.tag ?? 0},${Math.round((p[4] ?? 0) * 100)},${Math.round(shade * 50)}`;
      let at = seen.get(id);
      if (at === undefined) {
        at = pos.length / 3;
        seen.set(id, at);
        pos.push(p[0], p[1], p[2]);
        nor.push(n[0] * shade, n[1] * shade, n[2] * shade);
        rig.push(p[3], o.part, o.tag ?? 0, p[4] ?? 0);
      }
      index.push(at);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("aRig", new THREE.Float32BufferAttribute(rig, 4));
  geometry.setIndex(index);
  return geometry;
}

const ell = (n, y, cx, cz, rx, rz, seg, aux = 0) => {
  const k = widen(n);
  return Array.from({ length: n }, (_, i) => {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    return [cx + rx * k * Math.cos(a), y, cz + rz * k * Math.sin(a), seg, aux];
  });
};
const mirror = (half, seg, aux = 0) => [...half.map(([x, y, z]) => [x, y, z, seg, aux]), ...[...half].reverse().map(([x, y, z]) => [-x, y, z, seg, aux])];

/** The far figure: a few hundred triangles on the same joints. */
function farFigure() {
  const { tris, tri, quad, loft, cap, box } = soup();
  const { pelvis, torso, head, upper, fore, thigh, shin, foot } = SEG;

  // ---- the jacket: hem, waist, chest, shoulders, the root of the neck ----
  // y, middle z, half width, half depth, what it rides, how much a puffer
  // swells it.
  const TORSO = [
    [0.915, 0, 0.172, 0.116, pelvis, 0.5],
    [1.08, 0, 0.145, 0.098, torso, 1],
    [1.27, 0.012, 0.168, 0.114, torso, 1],
    [1.39, 0.004, 0.172, 0.1, torso, 1],
    [1.475, -0.004, 0.06, 0.062, torso, 0.2],
  ];
  const NT = 6;
  loft(TORSO.map(([y, cz, rx, rz, seg, aux]) => ell(NT, y, 0, cz, rx, rz, seg, aux)), { part: PART.jacket, smooth: 1 });
  // A neon band round the hem.
  loft([0.921, 0.935].map((y) => ell(NT, y, 0, 0, 0.177 - (y - 0.915) * 0.1, 0.121 - (y - 0.915) * (0.008 / 0.07), pelvis)), { part: PART.trim, tag: TAG.trim });
  // What shows down the front of an open jacket, and between a suit's
  // lapels: a strip folded over the chest's ridge.
  {
    const front = (y, x, out) => {
      let i = 0;
      while (i < TORSO.length - 2 && TORSO[i + 1][0] < y) i++;
      const t = Math.min(1, Math.max(0, (y - TORSO[i][0]) / (TORSO[i + 1][0] - TORSO[i][0])));
      const at = (k) => TORSO[i][k] + (TORSO[i + 1][k] - TORSO[i][k]) * t;
      const k = widen(NT);
      // From the ridge at the front to the corner beside it.
      const cx = at(2) * k * Math.cos(Math.PI / 6);
      const z0 = at(1) + at(3) * k;
      const z1 = at(1) + at(3) * k * 0.5;
      return [x, y, z0 + (z1 - z0) * (Math.abs(x) / cx) + out, y < 1.0 ? pelvis : torso, 0];
    };
    const strip = (rows, o) => loft(rows.map(([y, w]) => [front(y, -w, 0.006), front(y, 0, 0.006), front(y, w, 0.006)]), o, { open: true, ref: [0, 1.2, 0] });
    strip([[0.94, 0.03], [1.2, 0.036], [1.43, 0.05]], { part: PART.shirt, tag: TAG.open });
    strip([[1.13, 0.004], [1.3, 0.036], [1.44, 0.062]], { part: PART.shirt, tag: TAG.suit });
    // A hi-vis vest's band round the chest.
    loft([1.17, 1.22].map((y) => ell(NT, y, 0, 0.01, 0.172, 0.117, torso)), { part: PART.band, tag: TAG.hivis });
  }

  for (const sx of [-1, 1]) {
    // ---- a leg and a shoe ----
    const hx = sx * RIG.hipX;
    const legRings = [[0.905, 0.08, 0.09, 0, thigh], [0.5, 0.057, 0.062, 0.004, shin], [0.115, 0.047, 0.053, -0.004, shin]].map(([y, rx, rz, cz, seg]) => ell(4, y, hx, cz, rx, rz, seg));
    loft(legRings, { part: PART.trousers, smooth: 3 });
    const section = (z, w, top) => [[hx - w, 0, z, foot, 0], [hx + w, 0, z, foot, 0], [hx + w, top, z, foot, 0], [hx - w, top, z, foot, 0]];
    const shoe = [section(-0.07, 0.042, 0.105), section(0.18, 0.04, 0.045)];
    loft(shoe, { part: PART.shoe });
    quad(...shoe[0], { part: PART.shoe }, [hx, 0.05, 0.05]);
    // ---- an arm, and a hand at the end of it ----
    const armRings = [[1.395, 0.188, 0.045, 0.051, upper, 1], [1.15, 0.2, 0.041, 0.044, fore, 0.9], [0.915, 0.207, 0.033, 0.037, fore, 0.2]].map(([y, cx, rx, rz, seg, aux]) => ell(3, y, sx * cx, 0, rx, rz, seg, aux));
    loft(armRings, { part: PART.sleeve, smooth: 4 });
    cap(armRings[0], [sx * 0.178, 1.44, 0, upper, 0.6], { part: PART.sleeve, smooth: 4 }, [sx * 0.19, 1.3, 0]);
    const tip = ell(3, 0.76, sx * 0.21, 0.012, 0.016, 0.03, fore);
    loft([armRings[2], tip], { part: PART.skin, smooth: 5 });
    cap(tip, [sx * 0.21, 0.75, 0.014, fore, 0], { part: PART.skin, smooth: 5 }, [sx * 0.21, 0.85, 0]);
  }

  // ---- the head ----
  // Six points round: the face, a cheek, the back of the head. The face and
  // cheeks are skin; the rest is hair, a hood or a hat by the person.
  const centre = [0, 1.65, 0];
  {
    const ring = (y, a, zf, hw, zs, b, zb) => mirror([[a, y, zf], [hw, y, zs], [b, y, zb]], head);
    const rings = [ring(1.553, 0.036, 0.089, 0.06, 0.014, 0.04, -0.048), ring(1.67, 0.045, 0.093, 0.077, -0.005, 0.054, -0.101), ring(1.745, 0.028, 0.055, 0.052, -0.005, 0.035, -0.07)];
    const face = (r, i) => r === 0 && (i === 0 || i === 4 || i === 5);
    loft(rings, { part: PART.skin }, { skip: (r, i) => !face(r, i) });
    loft(rings, { part: PART.scalp }, { skip: face });
    cap(rings[2], [0, 1.764, -0.008, head, 0], { part: PART.scalp }, centre);
    cap(rings[0], [0, 1.465, 0, torso, 0], { part: PART.skin }, centre);
  }
  // Long hair, down the back to the shoulder blades.
  {
    const rows = [[[0.06, 1.6, -0.104], [0, 1.6, -0.112]], [[0.076, 1.4, -0.13], [0, 1.39, -0.136]]];
    const strip = rows.map((half, r) => {
      const seg = r === rows.length - 1 ? torso : head;
      const right = half.map(([x, y, z]) => [x, y, z, seg, r]);
      const left = [...half].reverse().filter(([x]) => x > 0).map(([x, y, z]) => [-x, y, z, seg, r]);
      return [...right, ...left];
    });
    loft(strip, { part: PART.hair, tag: TAG.long }, { open: true, ref: [0, 1.5, 0] });
    loft(strip, { part: PART.hair, tag: TAG.long, inside: true }, { open: true, ref: [0, 1.5, 0] });
  }
  // A mohawk: a fin from the forehead over the crown to the nape.
  {
    const line = [[0.08, 1.74, 1.76], [0, 1.76, 1.84], [-0.09, 1.72, 1.79]];
    const o = { part: PART.hair, tag: TAG.mohawk };
    for (let i = 0; i < line.length - 1; i++) {
      const [z0, b0, t0] = line[i];
      const [z1, b1, t1] = line[i + 1];
      const ref = [0, (b0 + b1) / 2, (z0 + z1) / 2];
      for (const s of [-1, 1]) quad([s * 0.012, b0, z0, head, 0], [s * 0.012, b1, z1, head, 0], [s * 0.004, t1, z1, head, 0], [s * 0.004, t0, z0, head, 0], o, ref);
    }
  }
  // A bun at the back of the crown.
  {
    const c = [0, 1.768, -0.084];
    const r = [0.047, 0.042, 0.047];
    const o = { part: PART.hair, tag: TAG.bun };
    const P = (k, s) => [c[0] + (k === 0 ? s * r[0] : 0), c[1] + (k === 1 ? s * r[1] : 0), c[2] + (k === 2 ? s * r[2] : 0), head, 0];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) if (sy > 0 || sz < 0) tri(P(0, sx), P(1, sy), P(2, sz), o, c);
  }
  // A cap's brim.
  {
    const o = { part: PART.brim, tag: TAG.brim };
    const top = [[-0.062, 1.727, 0.078, head, 0], [0.062, 1.727, 0.078, head, 0], [0.048, 1.716, 0.178, head, 0], [-0.048, 1.716, 0.178, head, 0]];
    quad(...top, o, [0, 1.6, 0.12]);
    quad(...top.map(([x, y, z, s, a]) => [x, y - 0.008, z, s, a]), o, [0, 1.8, 0.12]);
  }

  // ---- a long coat's skirt, from the hem to the knee ----
  loft([[0.93, 0.181, 0.121, 0], [0.53, 0.205, 0.15, 1]].map(([y, rx, rz, aux]) => ell(6, y, 0, 0, rx, rz, pelvis, aux)), { part: PART.coat, tag: TAG.skirt, smooth: 7 });

  // ---- bags: at the hip, on the back, carried in the -x hand ----
  box([-0.222, 0.88, 0.012], [0.045, 0.095, 0.13], pelvis, { part: PART.bag, tag: TAG.hipbag }, { skip: "x+" });
  box([0, 1.245, -0.168], [0.125, 0.175, 0.062], torso, { part: PART.bag, tag: TAG.backpack }, { skip: "z+", top: 0.82 });
  box([-0.21, 0.59, 0.012], [0.05, 0.13, 0.13], fore, { part: PART.tote, tag: TAG.tote });

  // ---- an umbrella over them, its rim lit ----
  {
    const [gx, gy, gz] = gripAt(HOLD.umbrella);
    const E = CANOPY.edge;
    const at = (y, aux, r) => Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return [CANOPY.x + r * Math.cos(a), y, CANOPY.z + r * Math.sin(a), torso, aux];
    });
    const apex = [CANOPY.x, E + 0.2, CANOPY.z, torso, 0];
    const edge = at(E, 0, CANOPY.radius);
    const o = { part: PART.canopy, tag: TAG.umbrella };
    cap(edge, apex, o, [CANOPY.x, 1.8, CANOPY.z]);
    cap(edge, apex, { ...o, inside: true }, [CANOPY.x, 1.8, CANOPY.z]);
    // The rim: a band the shader keeps a pixel and a half tall however far
    // off it is (its weight says which edge a vertex is), leaning in at the
    // top so it shows from a roof as well as from the street.
    const rim = [at(E - RIM_HALF, -1, CANOPY.radius + 0.004), at(E + RIM_HALF, 1, CANOPY.radius - 0.02)];
    loft(rim, { part: PART.rim, tag: TAG.umbrella });
    loft(rim, { part: PART.rim, tag: TAG.umbrella, inside: true });
    const shaft = (y, x, z) => [[x - 0.009, y, z, torso, 0], [x + 0.009, y, z, torso, 0]];
    const rod = [shaft(gy - 0.1, gx + 0.005, gz + 0.012), shaft(E + 0.195, CANOPY.x, CANOPY.z)];
    loft(rod, { part: PART.dark, tag: TAG.umbrella }, { open: true });
    loft(rod, { part: PART.dark, tag: TAG.umbrella, inside: true }, { open: true });
  }

  // ---- a phone in the +x hand, its screen lit ----
  {
    const [x, y, z] = PHONE_AT;
    const o = { part: PART.phone, tag: TAG.phone };
    const face = (dz, aux) => [[x - 0.036, y - 0.075, z + dz, fore, aux], [x + 0.036, y - 0.075, z + dz, fore, aux], [x + 0.036, y + 0.075, z + dz, fore, aux], [x - 0.036, y + 0.075, z + dz, fore, aux]];
    // The screen looks at whoever holds it once the arm is up; the back is
    // dimmer.
    quad(...face(0.006, 1), o, [x, y, z]);
    quad(...face(-0.006, 0.35), o, [x, y, z]);
  }
  // ---- a cigarette between the fingers, its tip lit ----
  {
    const [x, y, z] = EMBER_AT;
    const t = [[x - 0.012, y - 0.012, z, fore, 0], [x + 0.012, y - 0.012, z, fore, 0], [x, y + 0.014, z, fore, 0]];
    tri(...t, { part: PART.ember, tag: TAG.smoke }, [x, y, z + 1]);
    tri(...t, { part: PART.ember, tag: TAG.smoke }, [x, y, z - 1]);
  }
  return finish(tris);
}

/** The near figure: the one with a face. `close` is the same figure for
 *  the few people within a few steps of the eye: rounder everywhere, a head
 *  whose face is modelled (a brow ridge, sockets, a nose with wings, cheek
 *  and jaw planes, lips either side of the mouth's line), hair that stands
 *  off the head with a parting, a fringe or a sweep to it, fingers, a
 *  shirt's collar and cuffs, a belt, soles and laces, and cloth that folds
 *  at the elbow, the knee and the ankle. */
function nearFigure(close = false) {
  const { tris, tri, quad, loft, cap, box } = soup();
  const { pelvis, torso, head, upper, fore, thigh, shin, foot } = SEG;
  const TAU = Math.PI * 2;
  const pw = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  // n points round an ellipse at a height, squared off a little where
  // `square` is under one.
  const ring = (n, y, cx, cz, rx, rz, seg, aux = 0, square = 1, shade = 1) => {
    const k = widen(n);
    return Array.from({ length: n }, (_, i) => {
      const a = ((i + 0.5) / n) * TAU;
      return [cx + rx * k * pw(Math.cos(a), square), y, cz + rz * k * pw(Math.sin(a), square), seg, aux, shade];
    });
  };
  // A box's outline with its corners cut, in the ground plane.
  const slab = (y, cx, cz, hx, hz, seg, cut = 0.45) => {
    const c = cut * Math.min(hx, hz);
    return [[-hx, -hz + c], [-hx + c, -hz], [hx - c, -hz], [hx, -hz + c], [hx, hz - c], [hx - c, hz], [-hx + c, hz], [-hx, hz - c]].map(([dx, dz]) => [cx + dx, y, cz + dz, seg, 0]);
  };
  // A thin rod through points, four sided.
  const rod = (points, radius, seg, o) => {
    const rings = points.map((p, i) => {
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(points.length - 1, i + 1)];
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      // Across it: the x axis, and what is square to both.
      const v = [0, d[2], -d[1]];
      const l = Math.hypot(v[1], v[2]) || 1;
      const r = Array.isArray(radius) ? radius[i] : radius;
      return [[-r, 0, 0], [0, (v[1] / l) * r, (v[2] / l) * r], [r, 0, 0], [0, (-v[1] / l) * r, (-v[2] / l) * r]].map(([x, y, z]) => [p[0] + x, p[1] + y, p[2] + z, seg, 0]);
    });
    loft(rings, o);
    return rings;
  };

  // ---- the jacket: hem, waist, a fold over it, chest, shoulders, the neck ----
  // y, middle z, half width, half depth, what it rides, how much a puffer
  // swells it.
  // (Close to, a puffer is quilted: every second row swells less.)
  const TORSO = close
    ? [
        [0.905, 0, 0.178, 0.122, pelvis, 0.5],
        [0.935, 0, 0.173, 0.118, pelvis, 0.6],
        [0.99, 0, 0.164, 0.109, pelvis, 0.9],
        [1.04, 0, 0.154, 0.103, pelvis, 1],
        [1.08, 0, 0.147, 0.099, torso, 0.6],
        [1.105, 0, 0.152, 0.104, torso, 0.7],
        [1.148, 0.003, 0.157, 0.1065, torso, 1],
        [1.19, 0.006, 0.16, 0.108, torso, 0.62],
        [1.24, 0.009, 0.166, 0.113, torso, 1],
        [1.29, 0.012, 0.171, 0.117, torso, 0.62],
        [1.335, 0.009, 0.175, 0.112, torso, 1],
        [1.375, 0.006, 0.177, 0.106, torso, 0.8],
        [1.415, 0.002, 0.176, 0.094, torso, 0.7],
        [1.44, -0.001, 0.15, 0.08, torso, 0.5],
        [1.46, -0.003, 0.105, 0.072, torso, 0.4],
        [1.478, -0.004, 0.064, 0.063, torso, 0.2],
      ]
    : [
        [0.905, 0, 0.178, 0.122, pelvis, 0.5],
        [0.935, 0, 0.173, 0.118, pelvis, 0.6],
        [0.99, 0, 0.164, 0.109, pelvis, 0.85],
        [1.08, 0, 0.147, 0.099, torso, 1],
        [1.105, 0, 0.152, 0.104, torso, 1],
        [1.19, 0.006, 0.16, 0.108, torso, 1],
        [1.29, 0.012, 0.171, 0.117, torso, 1],
        [1.375, 0.006, 0.177, 0.106, torso, 1],
        [1.425, 0, 0.16, 0.09, torso, 0.7],
        [1.455, -0.003, 0.108, 0.074, torso, 0.4],
        [1.478, -0.004, 0.064, 0.063, torso, 0.2],
      ];
  const NT = close ? 20 : 12;
  // How many sides a limb has.
  const NL = close ? 12 : 8;
  // Cloth round a limb is not a tube: its radius comes and goes round it,
  // differently at each height, which reads as folds once it is lit.
  const fold = (pts, amp, k, phase) => {
    if (!amp) return pts;
    const m = [0, 0];
    for (const q of pts) {
      m[0] += q[0] / pts.length;
      m[1] += q[2] / pts.length;
    }
    return pts.map((q) => {
      const g = 1 + amp * Math.cos(k * Math.atan2(q[2] - m[1], q[0] - m[0]) + phase);
      return [m[0] + (q[0] - m[0]) * g, q[1], m[1] + (q[2] - m[1]) * g, q[3], q[4], q[5]];
    });
  };
  const torsoRings = TORSO.map(([y, cz, rx, rz, seg, aux], r) => fold(ring(NT, y, 0, cz, rx, rz, seg, aux, 0.85), close && y > 0.95 && y < 1.2 ? 0.018 : 0, 5, r * 1.3));
  loft(torsoRings, { part: PART.jacket, smooth: 1 });
  // The hem's underside: the jacket stands off the hips.
  loft([torsoRings[0], ring(NT, 0.918, 0, 0, 0.15, 0.098, pelvis, 0, 0.85)], { part: PART.jacket, ao: 0.45 }, { ref: [0, 1.3, 0] });
  // A point on the jacket at a height and an angle round it (0 toward +x,
  // a quarter turn toward the front), `out` proud of it.
  const onTorso = (y, deg, out = 0.005) => {
    let i = 0;
    while (i < TORSO.length - 2 && TORSO[i + 1][0] < y) i++;
    const t = Math.min(1, Math.max(0, (y - TORSO[i][0]) / (TORSO[i + 1][0] - TORSO[i][0])));
    const f = ((((deg % 360) + 360) % 360) / 360) * NT - 0.5;
    const j = Math.floor(f);
    const at = (r) => {
      const a = torsoRings[r][(j + NT) % NT];
      const b = torsoRings[r][(j + 1 + NT) % NT];
      return [a[0] + (b[0] - a[0]) * (f - j), a[2] + (b[2] - a[2]) * (f - j)];
    };
    const p = at(i);
    const q = at(i + 1);
    const x = p[0] + (q[0] - p[0]) * t;
    const z = p[1] + (q[1] - p[1]) * t;
    const l = Math.hypot(x, z) || 1;
    return [x + (x / l) * out, y, z + (z / l) * out, y < RIG.waistY ? pelvis : torso, 0];
  };
  const around = (y, out) => Array.from({ length: NT }, (_, i) => onTorso(y, ((i + 0.5) / NT) * 360, out));
  // A neon band round the hem.
  loft([around(0.922, 0.004), around(0.937, 0.004)], { part: PART.trim, tag: TAG.trim });
  // A jacket worn open: what is under it shows in a strip from the hem to
  // the throat, wider toward the collar, the jacket's two edges dark lines
  // either side of it.
  {
    // (Close to, where the shoulders are filled out, it opens less at the
    // collarbone: a placket, not a pair of wings.)
    const rows = close ? [[0.925, 9], [0.99, 9.5], [1.08, 10], [1.19, 11], [1.29, 12], [1.375, 13], [1.43, 14.5]] : [[0.925, 9], [0.99, 9.5], [1.08, 10], [1.19, 11], [1.29, 12.5], [1.375, 16], [1.435, 21]];
    loft(rows.map(([y, half]) => [onTorso(y, 90 + half, 0.0045), onTorso(y, 90, 0.0052), onTorso(y, 90 - half, 0.0045)]), { part: PART.shirt, tag: TAG.open, smooth: 41 }, { open: true, ref: [0, 1.2, 0] });
    for (const s of [-1, 1]) loft(rows.map(([y, half]) => [onTorso(y, 90 + s * half, 0.0062), onTorso(y, 90 + s * (half + 2.6), 0.0062)]), { part: PART.seam, tag: TAG.open }, { open: true, ref: [0, 1.2, 0] });
  }
  // A suit: the shirt in a V from the collar to the button, a lapel down
  // each side of it, and for some a tie from the knot to its point.
  {
    const rows = [[1.14, 0.4, 2.5], [1.19, 3.6, 4.5], [1.29, 10, 7.5], [1.375, 17, 9.5], [1.44, 24, 8]];
    loft(rows.map(([y, half]) => [onTorso(y, 90 + half, 0.0045), onTorso(y, 90, 0.0052), onTorso(y, 90 - half, 0.0045)]), { part: PART.shirt, tag: TAG.suit, smooth: 42 }, { open: true, ref: [0, 1.2, 0] });
    for (const s of [-1, 1]) loft(rows.map(([y, half, wide]) => [onTorso(y, 90 + s * half, 0.0075), onTorso(y, 90 + s * (half + wide), 0.0062)]), { part: PART.lapel, tag: TAG.suit }, { open: true, ref: [0, 1.2, 0] });
    const tie = [[1.165, 0.3], [1.2, 3.4], [1.3, 2.9], [1.405, 2.1], [1.418, 3.3], [1.44, 3.3]];
    loft(tie.map(([y, half]) => [onTorso(y, 90 + half, 0.0078), onTorso(y, 90 - half, 0.0078)]), { part: PART.tie, tag: TAG.tie }, { open: true, ref: [0, 1.2, 0] });
  }
  // A hi-vis vest's reflective bands: two round the body, and a brace up
  // from the upper one over each shoulder, front and back.
  {
    const o = { part: PART.band, tag: TAG.hivis };
    for (const [y0, y1] of [[0.985, 1.032], [1.185, 1.232]]) loft([around(y0, 0.0058), around(y1, 0.0058)], o);
    for (const mid of [90 - 27, 90 + 27, 270 - 27, 270 + 27]) loft([1.232, 1.3, 1.375, 1.418].map((y) => [onTorso(y, mid - 4, 0.0058), onTorso(y, mid + 4, 0.0058)]), o, { open: true, ref: [0, 1.3, 0] });
  }
  // The fastening down the front, and the jacket's own low collar, open
  // at the front.
  loft([0.91, 0.99, 1.08, 1.19, 1.29, 1.375, 1.405].map((y) => [onTorso(y, 92.6, 0.003), onTorso(y, 87.4, 0.003)]), { part: PART.seam }, { open: true, ref: [0, 1.2, 0] });
  {
    const rings = [ring(10, 1.46, 0, -0.004, 0.072, 0.07, torso), ring(10, 1.494, 0, -0.004, 0.066, 0.065, torso)];
    const open = (r, i) => i === 1 || i === 2;
    loft(rings, { part: PART.hood, smooth: 34 }, { skip: open });
    loft(rings, { part: PART.hood, inside: true, ao: 0.5 }, { skip: open });
  }

  // ---- the hips, under the jacket's hem ----
  {
    const rings = [ring(10, 0.975, 0, 0, 0.158, 0.103, pelvis), ring(10, 0.9, 0, 0, 0.166, 0.108, pelvis), ring(10, 0.85, 0, 0, 0.15, 0.1, pelvis)];
    loft(rings, { part: PART.trousers, smooth: 2 });
    cap(rings[2], [0, 0.836, 0, pelvis, 0, 0.6], { part: PART.trousers, smooth: 2 }, [0, 0.9, 0]);
  }

  for (const sx of [-1, 1]) {
    // ---- a leg: thigh, knee, calf, the trouser's hem at the ankle ----
    const hx = sx * RIG.hipX;
    // (The last of each row: how deep the cloth folds there, close to.)
    const LEG = close
      ? [
          [0.905, 0.082, 0.092, 0, thigh, 0],
          [0.8, 0.078, 0.088, 0.002, thigh, 0.03],
          [0.66, 0.068, 0.077, 0.004, thigh, 0],
          [0.585, 0.062, 0.07, 0.007, thigh, 0.035],
          [0.55, 0.06, 0.067, 0.008, thigh, 0.045],
          [0.5, 0.058, 0.064, 0.01, shin, 0.045],
          [0.45, 0.054, 0.062, 0.002, shin, 0.04],
          [0.36, 0.055, 0.065, -0.01, shin, 0],
          [0.22, 0.048, 0.055, -0.006, shin, 0.03],
          [0.165, 0.051, 0.059, -0.004, shin, 0.05],
          [0.135, 0.047, 0.054, -0.003, shin, 0.05],
          [0.105, 0.05, 0.058, -0.002, shin, 0.04],
        ]
      : [
          [0.905, 0.082, 0.092, 0, thigh, 0],
          [0.8, 0.078, 0.088, 0.002, thigh, 0],
          [0.66, 0.068, 0.077, 0.004, thigh, 0],
          [0.55, 0.06, 0.067, 0.008, thigh, 0],
          [0.5, 0.058, 0.064, 0.01, shin, 0],
          [0.45, 0.054, 0.062, 0.002, shin, 0],
          [0.36, 0.055, 0.065, -0.01, shin, 0],
          [0.22, 0.048, 0.055, -0.006, shin, 0],
          [0.105, 0.05, 0.058, -0.002, shin, 0],
        ];
    const legRings = LEG.map(([y, rx, rz, cz, seg, amp], r) => fold(ring(NL, y, hx, cz, rx, rz, seg), amp, 3, r * 1.7 + sx));
    loft(legRings, { part: PART.trousers, smooth: 3 });
    loft([legRings[legRings.length - 1], ring(NL, 0.114, hx, -0.002, 0.034, 0.04, shin)], { part: PART.trousers, ao: 0.4 }, { ref: [hx, 0.6, 0] });
    if (close) {
      // A pocket's slit at the hip, a seam down the outside of the leg and
      // the hem's own line, a shade under the cloth's colour.
      const o = { part: PART.stitch };
      const on = (y, deg, out = 0.004) => {
        let i = 0;
        while (i < LEG.length - 2 && LEG[i + 1][0] > y) i++;
        const t = (LEG[i][0] - y) / (LEG[i][0] - LEG[i + 1][0]);
        const at = (k) => LEG[i][k] + (LEG[i + 1][k] - LEG[i][k]) * t;
        const a = (deg * Math.PI) / 180;
        return [hx + (at(1) * widen(NL) * 1.05 + out) * Math.cos(a), y, at(3) + (at(2) * widen(NL) * 1.05 + out) * Math.sin(a), LEG[i][0] - y < 0.001 ? LEG[i][4] : LEG[i + 1][4], 0];
      };
      const out = sx > 0 ? 0 : 180;
      const slit = [[0.875, 62], [0.83, 44], [0.79, 30]];
      loft([slit.map(([y, d]) => on(y, out + sx * (d - 5))), slit.map(([y, d]) => on(y, out + sx * (d + 5)))], o, { open: true, ref: [hx, 0.8, 0] });
      const seam = [0.78, 0.66, 0.55, 0.5, 0.45, 0.36, 0.22, 0.125];
      loft([seam.map((y) => on(y, out - 4)), seam.map((y) => on(y, out + 4))], o, { open: true, ref: [hx, 0.5, 0] });
      loft([Array.from({ length: NL + 1 }, (_, k) => on(0.124, (k / NL) * 360, 0.005)), Array.from({ length: NL + 1 }, (_, k) => on(0.136, (k / NL) * 360, 0.005))], o, { open: true, ref: [hx, 0.13, 0] });
    }
    // ---- a shoe: heel, the opening the ankle goes into, instep, toe ----
    const across = (z, w, top) => [[hx - w, 0, z], [hx + w, 0, z], [hx + w, top * 0.55, z], [hx + w * 0.55, top, z], [hx - w * 0.55, top, z], [hx - w, top * 0.55, z]].map(([x, y, zz]) => [x, y, zz, foot, 0]);
    const shoe = [across(-0.078, 0.034, 0.095), across(-0.04, 0.043, 0.118), across(0.04, 0.049, 0.095), across(0.12, 0.047, 0.06), across(0.178, 0.036, 0.04)];
    loft(shoe, { part: PART.shoe, smooth: 8 });
    cap(shoe[0], [hx, 0.045, -0.09, foot, 0], { part: PART.shoe, smooth: 8 }, [hx, 0.05, 0.05]);
    cap(shoe[4], [hx, 0.018, 0.196, foot, 0], { part: PART.shoe, smooth: 8 }, [hx, 0.05, 0.05]);
    if (close) {
      // A sole of another tone under it, standing a little proud, and the
      // laces over the instep.
      const sole = [[-0.082, 0.037], [-0.04, 0.046], [0.04, 0.052], [0.12, 0.05], [0.182, 0.039]].map(([z, w]) => [[hx - w, 0, z], [hx + w, 0, z], [hx + w, 0.019, z], [hx - w, 0.019, z]].map(([x, y, zz]) => [x, y, zz, foot, 0]));
      loft(sole, { part: PART.sole });
      quad(...sole[0], { part: PART.sole }, [hx, 0.01, 0.05]);
      quad(...sole[4], { part: PART.sole }, [hx, 0.01, 0.05]);
      quad([hx - 0.014, 0.113, -0.005, foot, 0], [hx + 0.014, 0.113, -0.005, foot, 0], [hx + 0.012, 0.081, 0.085, foot, 0], [hx - 0.012, 0.081, 0.085, foot, 0], { part: PART.sole }, [hx, 0, 0.04]);
    }

    // ---- an arm: shoulder, a fold at the elbow, the cuff ----
    const ARM = close
      ? [
          [1.434, 0.176, 0.03, 0.04, upper, 0.5, 0],
          [1.405, 0.188, 0.046, 0.053, upper, 0.7, 0],
          [1.36, 0.192, 0.047, 0.052, upper, 1, 0],
          [1.31, 0.194, 0.045, 0.0495, upper, 0.6, 0.02],
          [1.26, 0.196, 0.043, 0.047, upper, 1, 0.03],
          [1.19, 0.198, 0.043, 0.046, upper, 0.6, 0.05],
          [1.15, 0.199, 0.039, 0.042, fore, 0.5, 0.05],
          [1.11, 0.2, 0.042, 0.046, fore, 1, 0.05],
          [1.065, 0.2015, 0.04, 0.044, fore, 0.55, 0.03],
          [1.02, 0.203, 0.038, 0.042, fore, 0.8, 0.03],
          [0.975, 0.2042, 0.0365, 0.0405, fore, 0.45, 0.045],
          [0.95, 0.205, 0.034, 0.038, fore, 0.3, 0.03],
        ]
      : [
          [1.434, 0.176, 0.03, 0.04, upper, 0.5, 0],
          [1.405, 0.188, 0.046, 0.053, upper, 1, 0],
          [1.36, 0.192, 0.047, 0.052, upper, 1, 0],
          [1.26, 0.196, 0.043, 0.047, upper, 1, 0],
          [1.19, 0.198, 0.043, 0.046, upper, 1, 0],
          [1.15, 0.199, 0.039, 0.042, fore, 0.9, 0],
          [1.11, 0.2, 0.042, 0.046, fore, 0.9, 0],
          [1.02, 0.203, 0.038, 0.042, fore, 0.7, 0],
          [0.95, 0.205, 0.034, 0.038, fore, 0.3, 0],
        ];
    const armRings = ARM.map(([y, cx, rx, rz, seg, aux, amp], r) => fold(ring(NL, y, sx * cx, 0, rx, rz, seg, aux), amp, 3, r * 2.1 + sx));
    loft(armRings, { part: PART.sleeve, smooth: 4 });
    cap(armRings[0], [sx * 0.168, 1.443, 0, upper, 0.5], { part: PART.sleeve, smooth: 4 }, [sx * 0.19, 1.3, 0]);
    const ax = sx * 0.2055;
    const cuff = [ring(NL, 0.95, ax, 0, 0.039, 0.043, fore, 0.3), ring(NL, 0.918, ax, 0, 0.038, 0.042, fore, 0.3)];
    loft([armRings[armRings.length - 1], cuff[0]], { part: PART.cuff, ao: 0.7 }, { ref: [ax, 0.8, 0] });
    loft(cuff, { part: PART.cuff, smooth: 5 });
    loft([cuff[1], ring(NL, 0.92, ax, 0, 0.022, 0.027, fore)], { part: PART.cuff, ao: 0.4 }, { ref: [ax, 1.1, 0] });
    // A suit's sleeve shows a finger's width of shirt at the wrist.
    if (close) loft([ring(NL, 0.921, ax, 0, 0.0352, 0.0392, fore), ring(NL, 0.899, ax, 0, 0.0335, 0.0375, fore)], { part: PART.shirt, tag: TAG.suit, smooth: 60 });
    // ---- a hand: the palm toward the body, a mitten of fingers curling
    // in, the thumb forward of them ----
    if (close) {
      // The back of the hand down to the knuckles, four fingers of their
      // own lengths curling in toward the leg, and the thumb forward of them.
      const palm = [slab(0.92, ax, 0, 0.02, 0.026, fore), slab(0.885, ax, 0.004, 0.015, 0.036, fore), slab(0.845, ax, 0.009, 0.0155, 0.043, fore)];
      loft(palm, { part: PART.skin, smooth: 6 });
      cap(palm[2], [ax, 0.838, 0.009, fore, 0, 0.7], { part: PART.skin, smooth: 6 }, [ax, 0.9, 0.009]);
      [0.07, 0.08, 0.074, 0.058].forEach((len, k) => {
        const z = 0.009 + (1.5 - k) * 0.0205;
        const finger = rod([[ax, 0.848, z], [ax - sx * 0.003, 0.848 - len * 0.5, z + 0.002], [ax - sx * 0.012, 0.848 - len * 0.86, z + 0.004], [ax - sx * 0.019, 0.848 - len, z + 0.005]], [0.0092, 0.0085, 0.0074, 0.0062].map((v) => v * (k === 3 ? 0.86 : 1)), fore, { part: PART.skin, smooth: 61 + k });
        cap(finger[3], [ax - sx * 0.022, 0.843 - len, z + 0.005, fore, 0], { part: PART.skin, smooth: 61 + k }, [ax, 0.8, z]);
      });
      const thumb = rod([[ax - sx * 0.004, 0.884, 0.034], [ax - sx * 0.007, 0.852, 0.058], [ax - sx * 0.01, 0.822, 0.07], [ax - sx * 0.013, 0.798, 0.075]], [0.013, 0.0115, 0.0098, 0.008], fore, { part: PART.skin, smooth: 36 });
      cap(thumb[3], [ax - sx * 0.014, 0.788, 0.077, fore, 0], { part: PART.skin, smooth: 36 }, [ax, 0.84, 0.06]);
    } else {
      const hand = [slab(0.92, ax, 0, 0.02, 0.026, fore), slab(0.885, ax, 0.004, 0.015, 0.036, fore), slab(0.84, ax, 0.009, 0.0165, 0.043, fore), slab(0.8, ax - sx * 0.002, 0.013, 0.015, 0.041, fore), slab(0.765, ax - sx * 0.008, 0.019, 0.0125, 0.037, fore), slab(0.738, ax - sx * 0.018, 0.024, 0.009, 0.03, fore)];
      loft(hand, { part: PART.skin, smooth: 6 });
      cap(hand[5], [ax - sx * 0.021, 0.73, 0.025, fore, 0], { part: PART.skin, smooth: 6 }, [ax, 0.8, 0.01]);
      const thumb = rod([[ax - sx * 0.004, 0.878, 0.034], [ax - sx * 0.008, 0.838, 0.064], [ax - sx * 0.012, 0.802, 0.075]], [0.0125, 0.011, 0.0085], fore, { part: PART.skin, smooth: 36 });
      cap(thumb[2], [ax - sx * 0.013, 0.79, 0.079, fore, 0], { part: PART.skin, smooth: 36 }, [ax, 0.84, 0.06]);
    }
    // A neon stripe down the sleeve.
    const stripe = ARM.slice(1).map(([y, cx, rx, , seg]) => [
      [sx * (cx + rx * widen(NL) * (close ? 1.05 : 1) + 0.004), y, -0.007, seg, 0],
      [sx * (cx + rx * widen(NL) * (close ? 1.05 : 1) + 0.004), y, 0.007, seg, 0],
    ]);
    loft(stripe, { part: PART.trim, tag: TAG.trim }, { open: true, ref: [sx * 0.1, 1.2, 0] });
  }

  // ---- the neck ----
  loft([ring(NL, 1.45, 0, -0.008, 0.05, 0.054, torso), ring(NL, 1.5, 0, -0.004, 0.047, 0.051, head), ring(NL, 1.552, 0, 0.002, 0.046, 0.05, head, 0, 1, 0.7)], { part: PART.skin, smooth: 7 });

  // ---- the head ----
  // Its outline at a height: how far forward the face is, the half width,
  // how far back the skull goes, and how pointed the front is (a chin is,
  // a forehead is not). The eye line sits back under the brow.
  const SKULL = [
    [1.53, 0.066, 0.034, -0.004, 1.2],
    [1.546, 0.083, 0.05, -0.04, 1.15],
    [1.572, 0.091, 0.062, -0.066, 1.05],
    [1.6, 0.096, 0.069, -0.082, 0.95],
    [1.632, close ? 0.098 : 0.097, 0.074, -0.092, 0.85],
    [1.664, close ? 0.098 : 0.0935, 0.076, -0.098, 0.8],
    [1.69, 0.099, 0.077, -0.101, 0.8],
    [1.722, 0.094, 0.075, -0.099, 0.8],
    [1.746, 0.077, 0.064, -0.088, 0.85],
    [1.762, 0.046, 0.042, -0.06, 0.9],
  ];
  const EAR_Z = -0.012;
  const skullRow = (y) => {
    let i = 0;
    while (i < SKULL.length - 2 && SKULL[i + 1][0] < y) i++;
    const t = Math.min(1, Math.max(0, (y - SKULL[i][0]) / (SKULL[i + 1][0] - SKULL[i][0])));
    return SKULL[i].map((v, k) => v + (SKULL[i + 1][k] - v) * t);
  };
  // A point on it at an angle round from the front (a quarter turn is
  // over the +x ear), `grow` proud of it.
  const skull = (deg, y, grow = 0, seg = head, aux = 0, shade = 1) => {
    const [, zf, hw, zb, ef] = skullRow(y);
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    return [(hw + grow) * pw(Math.sin(a), 0.8), y, EAR_Z + (c >= 0 ? (zf + grow - EAR_Z) * c ** ef : (zb - grow - EAR_Z) * (-c) ** 0.85), seg, aux, shade];
  };
  // The angles round the head its surface is built at: evenly, or, close
  // to, crowded toward the face, where the nose, the sockets and the lips
  // want a point every few millimetres.
  const DEGS = close ? [0, 2, 5, 9, 13, 18, 23, 29, 36, 44, 53, 63, 74, 86, 100, 116, 134, 155, 180, 205, 226, 244, 260, 274, 286, 297, 307, 316, 324, 331, 337, 342, 347, 351, 355, 358] : Array.from({ length: 14 }, (_, i) => (i * 360) / 14);
  const NH = DEGS.length;
  const round = (i) => (i < NH ? DEGS[i] : 360 + DEGS[i - NH]);
  const centre = [0, 1.65, -0.005];
  if (!close) {
    // The sockets either side of the nose are in the brow's shade, and so
    // is what is under the jaw.
    const shade = (r, i) => (r === 5 && (i === 1 || i === NH - 1) ? 0.52 : r === 5 && (i === 2 || i === NH - 2) ? 0.82 : r === 5 && i === 0 ? 0.8 : r === 0 ? 0.6 : r === 1 && i > 3 && i < NH - 3 ? 0.76 : r === 3 && (i === 2 || i === NH - 2) ? 0.9 : 1);
    const rings = SKULL.map(([y], r) => Array.from({ length: NH }, (_, i) => skull(round(i), y, 0, head, 0, shade(r, i))));
    loft(rings, { part: PART.skin, smooth: 14 });
    cap(rings[0], [0, 1.526, 0.03, head, 0, 0.65], { part: PART.skin, smooth: 14 }, centre);
    cap(rings[SKULL.length - 1], [0, 1.767, -0.008, head, 0], { part: PART.skin, smooth: 14 }, centre);
  }
  // A point on the face at a distance to the side of the nose and a height.
  let onFace = (x, y, out = 0.0015) => {
    const [, zf, hw, , ef] = skullRow(y);
    const s = Math.min(0.999, (Math.abs(x) / hw) ** 1.25);
    return [x, y, EAR_Z + (zf - EAR_Z) * Math.sqrt(1 - s * s) ** ef + out, head, 0];
  };
  if (!close) {
    // The nose: from between the brows down its ridge to the tip, the
    // wings, and the shade under it.
    const o = { part: PART.skin, smooth: 30 };
    const from = [0, 1.645, 0.08];
    const top = onFace(0, 1.692, 0.001);
    const ridge = [0, 1.66, 0.109, head, 0];
    const tip = [0, 1.631, 0.127, head, 0];
    const under = [0, 1.618, 0.104, head, 0, 0.6];
    for (const s of [-1, 1]) {
      const side = onFace(s * 0.012, 1.666, 0.0005);
      const wing = [s * 0.0175, 1.622, 0.0985, head, 0];
      tri(top, side, ridge, o, from);
      tri(ridge, side, wing, o, from);
      tri(ridge, wing, tip, o, from);
      tri(tip, wing, under, { ...o, ao: 0.6 }, from);
    }
    // The mouth: the line between the lips, the upper lip, the fuller
    // lower one.
    const xs = [-0.023, -0.012, 0, 0.012, 0.023];
    const dip = (x) => 1.5985 - 0.0018 * (Math.abs(x) / 0.023) ** 2;
    loft([xs.map((x) => onFace(x, dip(x) - 0.0013, 0.0026)), xs.map((x) => onFace(x, dip(x) + 0.0013, 0.0026))], { part: PART.line }, { open: true, ref: centre });
    loft([xs.map((x) => onFace(x * 0.8, dip(x) + 0.001, 0.002)), xs.map((x) => onFace(x * 0.74, dip(x) + 0.0058 - 0.003 * Math.abs(x / 0.023), 0.002))], { part: PART.mouth }, { open: true, ref: centre });
    loft([xs.map((x) => onFace(x * 0.7, dip(x) - 0.0095 + 0.004 * Math.abs(x / 0.023), 0.0024)), xs.map((x) => onFace(x * 0.8, dip(x) - 0.001, 0.0024))], { part: PART.mouth }, { open: true, ref: centre });
    for (const s of [-1, 1]) {
      // An eye: its white, the iris, the lid's line over it, and the brow.
      const ex = s * 0.031;
      const ey = 1.667;
      const w = 0.0128;
      const hgt = 0.005;
      const white = [[-w, 0], [-0.5 * w, -hgt], [0.5 * w, -hgt], [w, 0.0008], [0.5 * w, hgt], [-0.5 * w, hgt]].map(([dx, dy]) => onFace(ex + s * dx, ey + dy, 0.0017));
      cap(white, onFace(ex, ey, 0.0019), { part: PART.sclera }, centre);
      quad(onFace(ex - 0.0056, ey - 0.0054, 0.0027), onFace(ex + 0.0056, ey - 0.0054, 0.0027), onFace(ex + 0.0056, ey + 0.0054, 0.0027), onFace(ex - 0.0056, ey + 0.0054, 0.0027), { part: PART.eye }, centre);
      const lid = [[-w * 1.1, 0.0002], [-0.5 * w, hgt], [0.5 * w, hgt], [w * 1.2, 0.001]];
      loft([lid.map(([dx, dy]) => onFace(ex + s * dx, ey + dy, 0.0031)), lid.map(([dx, dy]) => onFace(ex + s * dx, ey + dy + 0.0058, 0.0031))], { part: PART.line }, { open: true, ref: centre });
      // The brow, heavy enough to read from across a pavement, and the
      // shadow it throws over the eye: the two are what a face is at four
      // metres.
      const brow = [[0.009, 1.6885, 0.0105], [0.03, 1.6945, 0.0095], [0.05, 1.688, 0.0065]];
      loft([brow.map(([x, y]) => onFace(s * x, y, 0.0024)), brow.map(([x, y, t]) => onFace(s * x, y + t, 0.0024))], { part: PART.brow }, { open: true, ref: centre });
      const socket = [[0.011, 1.6895], [0.03, 1.6955], [0.0495, 1.689]];
      loft([socket.map(([x]) => onFace(s * x, 1.6685, 0.0011)), socket.map(([x, y]) => onFace(s * x, y, 0.0011))], { part: PART.socket }, { open: true, ref: centre });
      // An ear: its rim, the hollow inside it, and its back to the head.
      const rim = [[1.684, -0.002, 0.0785], [1.693, -0.02, 0.087], [1.676, -0.037, 0.0905], [1.648, -0.035, 0.089], [1.626, -0.02, 0.083], [1.636, -0.004, 0.078]].map(([y, z, x]) => [s * x, y, z, head, 0]);
      cap(rim, [s * 0.079, 1.657, -0.016, head, 0, 0.5], { part: PART.skin, smooth: 31 }, [0, 1.657, -0.016]);
      loft([rim, rim.map(([, y, z]) => [s * 0.07, y, z - 0.003, head, 0, 0.7])], { part: PART.skin, smooth: 31 }, { ref: [s * 0.075, 1.657, -0.01] });
    }
  }
  if (close) {
    // ---- the head, close to ----
    // The skull's oval with a face modelled on the front of it: how far
    // each point of the face stands forward of the oval (the nose's ridge
    // and tip and its wings, the brow's ridge over each eye, the sockets
    // and the eyes in them, the cheekbones and the hollows under them, the
    // muzzle, the two lips either side of the mouth's line, the dip under
    // the lower one, the chin), and how much of the street's light reaches
    // it there.
    const RAD = Math.PI / 180;
    const G = (dx, dy, sx, sy) => Math.exp(-((dx / sx) ** 2) - (dy / sy) ** 2);
    const relief = (x, y) => {
      const ax = Math.abs(x);
      const t = Math.min(1, Math.max(0, (1.69 - y) / 0.054));
      const ridge = y > 1.69 ? 0.004 * Math.exp(-(((y - 1.69) / 0.01) ** 2)) : y > 1.636 ? 0.004 + 0.023 * t ** 1.15 : 0.027 * Math.max(0, 1 - ((1.636 - y) / 0.017) ** 2);
      return (
        ridge * Math.exp(-((x / (0.0065 + 0.0065 * t)) ** 2)) +
        0.006 * G(ax - 0.0155, y - 1.6265, 0.006, 0.006) +
        0.0045 * G(ax - 0.031, y - 1.693, 0.024, 0.0065) +
        0.002 * G(x, y - 1.692, 0.012, 0.008) -
        0.0075 * G(ax - 0.031, y - 1.668, 0.0155, 0.0095) +
        0.003 * G(ax - 0.031, y - 1.667, 0.009, 0.006) +
        0.0035 * G(ax - 0.05, y - 1.642, 0.016, 0.012) -
        0.003 * G(ax - 0.046, y - 1.598, 0.014, 0.018) +
        0.0035 * G(x, y - 1.602, 0.024, 0.016) +
        0.003 * G(x, y - 1.6045, 0.016, 0.004) +
        0.0038 * G(x, y - 1.5925, 0.014, 0.0045) -
        0.0035 * G(x, y - 1.5985, 0.021, 0.0022) -
        0.002 * G(x, y - 1.583, 0.012, 0.005) +
        0.0045 * G(x, y - 1.556, 0.015, 0.012)
      );
    };
    const open = (x, y) => Math.max(0.5, 1 - 0.42 * G(Math.abs(x) - 0.031, y - 1.671, 0.014, 0.008) - 0.4 * G(x, y - 1.6185, 0.011, 0.0045) - 0.35 * G(x, y - 1.5985, 0.02, 0.002) - 0.2 * G(x, y - 1.583, 0.012, 0.005));
    const ROWS = [1.532, 1.54, 1.549, 1.558, 1.568, 1.578, 1.587, 1.594, 1.5985, 1.603, 1.609, 1.616, 1.622, 1.627, 1.632, 1.638, 1.646, 1.655, 1.662, 1.667, 1.672, 1.678, 1.685, 1.691, 1.697, 1.705, 1.722, 1.742, 1.756, 1.762];
    const rings = ROWS.map((y) =>
      DEGS.map((deg) => {
        const q = skull(deg, y);
        const c = Math.cos(deg * RAD);
        if (c > 0) {
          const k = Math.min(1, c / 0.4);
          const w = k * k * (3 - 2 * k);
          q[2] += relief(q[0], y) * w;
          q[5] = 1 - (1 - open(q[0], y)) * w;
        }
        // Under the jaw.
        if (y < 1.545) q[5] = Math.min(q[5], y < 1.536 ? 0.6 : 0.74);
        return q;
      }),
    );
    loft(rings, { part: PART.skin, smooth: 14 });
    cap(rings[0], [0, 1.526, 0.03, head, 0, 0.6], { part: PART.skin, smooth: 14 }, centre);
    cap(rings[rings.length - 1], [0, 1.767, -0.008, head, 0], { part: PART.skin, smooth: 14 }, centre);
    // The face as it was built, for what is laid on it: across each row
    // from cheek to cheek, and between the rows.
    const faces = rings.map((ring) => ring.filter((_, i) => Math.cos(DEGS[i] * RAD) > 0.05).map((q) => [q[0], q[2]]).sort((a, b) => a[0] - b[0]));
    const zAt = (k, x) => {
      const row = faces[k];
      let j = 0;
      while (j < row.length - 2 && row[j + 1][0] < x) j++;
      const u = Math.min(1, Math.max(0, (x - row[j][0]) / (row[j + 1][0] - row[j][0])));
      return row[j][1] + (row[j + 1][1] - row[j][1]) * u;
    };
    onFace = (x, y, out = 0.0015) => {
      let k = 0;
      while (k < ROWS.length - 2 && ROWS[k + 1] < y) k++;
      const t = Math.min(1, Math.max(0, (y - ROWS[k]) / (ROWS[k + 1] - ROWS[k])));
      const z0 = zAt(k, x);
      return [x, y, z0 + (zAt(k + 1, x) - z0) * t + out, head, 0];
    };
    // The mouth: the dark line between the lips, the upper lip with its
    // bow, the fuller lower one.
    const xs = [-0.024, -0.018, -0.012, -0.006, 0, 0.006, 0.012, 0.018, 0.024];
    const lineY = (x) => 1.5985 - 0.0016 * (Math.abs(x) / 0.024) ** 2;
    loft([xs.map((x) => onFace(x, lineY(x) - 0.001, 0.0022)), xs.map((x) => onFace(x, lineY(x) + 0.001, 0.0022))], { part: PART.line }, { open: true, ref: centre });
    const upper = (x) => lineY(x) + 0.001 + 0.0056 * (1 - (Math.abs(x) / 0.0235) ** 1.7) - 0.0013 * Math.exp(-((x / 0.0045) ** 2));
    const lower = (x) => lineY(x) - 0.001 - 0.0082 * (1 - (Math.abs(x) / 0.0235) ** 1.5);
    const lip = xs.map((x) => x * 0.94);
    loft([lip.map((x) => onFace(x, lineY(x) + 0.0008, 0.0018)), lip.map((x) => onFace(x, upper(x), 0.0018))], { part: PART.mouth, smooth: 65 }, { open: true, ref: centre });
    loft([lip.map((x) => onFace(x, lower(x), 0.0018)), lip.map((x) => onFace(x, lineY(x) - 0.0008, 0.0018))], { part: PART.mouth, smooth: 65 }, { open: true, ref: centre });
    for (const s of [-1, 1]) {
      // An eye: its white, the iris with a glint on it, the upper lid's
      // dark line (heavier toward the outer corner), the lower lid, the
      // brow, and the nostril under the nose's wing.
      const ex = s * 0.031;
      const ey = 1.667;
      const w = 0.0135;
      const hgt = 0.0052;
      const white = [[-w, -0.0006], [-0.5 * w, -hgt * 0.85], [0.3 * w, -hgt], [w, 0.001], [0.45 * w, hgt], [-0.5 * w, hgt * 0.9]].map(([dx, dy]) => onFace(ex + s * dx, ey + dy, 0.0014));
      cap(white, onFace(ex, ey, 0.0022), { part: PART.sclera, smooth: 66 }, centre);
      const iris = Array.from({ length: 8 }, (_, k) => onFace(ex + 0.0054 * Math.cos((k / 8) * TAU), ey + 0.0004 + 0.0054 * Math.sin((k / 8) * TAU), 0.0027));
      cap(iris, onFace(ex, ey + 0.0004, 0.003), { part: PART.eye }, centre);
      quad(onFace(ex + 0.0012, ey + 0.0016, 0.0034), onFace(ex + 0.0028, ey + 0.0016, 0.0034), onFace(ex + 0.0028, ey + 0.0032, 0.0034), onFace(ex + 0.0012, ey + 0.0032, 0.0034), { part: PART.sclera }, centre);
      const lid = [[-w * 1.1, -0.0004, 0.0016], [-0.5 * w, hgt * 0.95, 0.0022], [0.45 * w, hgt * 1.05, 0.0026], [w * 1.18, 0.0016, 0.002]];
      loft([lid.map(([dx, dy]) => onFace(ex + s * dx, ey + dy, 0.0031)), lid.map(([dx, dy, t]) => onFace(ex + s * dx, ey + dy + t, 0.0031))], { part: PART.line }, { open: true, ref: centre });
      const under = [[-w * 0.9, -0.0022], [-0.3 * w, -hgt * 1.05], [0.4 * w, -hgt * 1.1], [w, -0.0006]];
      loft([under.map(([dx, dy]) => onFace(ex + s * dx, ey + dy - 0.0009, 0.0024)), under.map(([dx, dy]) => onFace(ex + s * dx, ey + dy, 0.0024))], { part: PART.socket }, { open: true, ref: centre });
      const brow = [[0.01, 1.6885, 0.0042], [0.022, 1.6935, 0.0056], [0.037, 1.695, 0.0048], [0.0535, 1.6895, 0.0022]];
      loft([brow.map(([x, y]) => onFace(s * x, y, 0.0022)), brow.map(([x, y, t]) => onFace(s * x, y + t, 0.0022))], { part: PART.brow, smooth: 67 }, { open: true, ref: centre });
      quad(onFace(s * 0.0045, 1.6195, 0.0012), onFace(s * 0.011, 1.6205, 0.0012), onFace(s * 0.0105, 1.6238, 0.0012), onFace(s * 0.005, 1.6232, 0.0012), { part: PART.line }, centre);
      // An ear: its rim, the hollow inside it, and its back to the head.
      const rim = [[1.684, -0.002, 0.0785], [1.693, -0.02, 0.087], [1.676, -0.037, 0.0905], [1.648, -0.035, 0.089], [1.626, -0.02, 0.083], [1.636, -0.004, 0.078]].map(([y, z, x]) => [s * x, y, z, head, 0]);
      cap(rim, [s * 0.079, 1.657, -0.016, head, 0, 0.5], { part: PART.skin, smooth: 31 }, [0, 1.657, -0.016]);
      loft([rim, rim.map(([, y, z]) => [s * 0.07, y, z - 0.003, head, 0, 0.7])], { part: PART.skin, smooth: 31 }, { ref: [s * 0.075, 1.657, -0.01] });
    }
  }
  // Cyberware on some: a seam of light from the temple down the cheek to
  // the jaw, and a plate under the other eye.
  {
    const o = { part: PART.trim, tag: TAG.cyber };
    const seam = [[-0.06, 1.7], [-0.056, 1.655], [-0.046, 1.615], [-0.04, 1.578]];
    loft([seam.map(([x, y]) => onFace(x - 0.0022, y, 0.002)), seam.map(([x, y]) => onFace(x + 0.0022, y, 0.002))], o, { open: true, ref: centre });
    quad(onFace(0.022, 1.6455, 0.002), onFace(0.041, 1.6475, 0.002), onFace(0.041, 1.6525, 0.002), onFace(0.022, 1.6505, 0.002), o, centre);
  }
  // A visor over the eyes, ear to ear.
  {
    const degs = [-84, -63, -42, -21, 0, 21, 42, 63, 84];
    const o = { part: PART.visor, tag: TAG.visor, smooth: 13 };
    loft([degs.map((d) => skull(d, 1.651, 0.008)), degs.map((d) => skull(d, 1.684, 0.009))], o, { open: true, ref: centre });
    loft([degs.map((d) => skull(d, 1.684, 0.009)), degs.map((d) => skull(d, 1.686, 0.002))], { part: PART.visor, tag: TAG.visor }, { open: true, ref: [0, 1.5, 0] });
    loft([degs.map((d) => skull(d, 1.651, 0.008)), degs.map((d) => skull(d, 1.649, 0.002))], { part: PART.visor, tag: TAG.visor }, { open: true, ref: [0, 1.8, 0] });
  }

  // ---- hair ----
  // The cap of it every haired head has (a hat's dome too): from the
  // hairline (across the forehead, over the ears, down to the nape) to the
  // crown, standing off the skull.
  const HAIRLINE = [1.722, 1.726, 1.708, 1.652, 1.696, 1.6, 1.575, 1.57];
  // (Its height at an angle round from the front, either way.)
  const hairlineAt = (deg) => {
    const turn = ((deg % 360) + 360) % 360;
    const fr = Math.min(turn, 360 - turn) / (360 / 14);
    const i0 = Math.min(6, Math.floor(fr + 1e-6));
    return HAIRLINE[i0] + (HAIRLINE[i0 + 1] - HAIRLINE[i0]) * Math.min(1, Math.max(0, fr - i0));
  };
  {
    const o = { part: PART.scalp, tag: TAG.hair, smooth: 15 };
    const line = (i) => hairlineAt(round(i));
    const rows = [[0, 0.0015, 0.5], [0.07, 0.008, 0.5], [0.4, 0.0095, 1], [0.75, 0.011, 1], [1, 0.011, 1]];
    const rings = rows.map(([up, grow, aux]) => Array.from({ length: NH }, (_, i) => skull(round(i), line(i) + (1.759 - line(i)) * up, grow, head, aux)));
    loft(rings, o);
    cap(rings[4], [0, 1.781, -0.012, head, 1], o, centre);
  }
  if (close) {
    // Hair with any length to it stands off the head, in one of three ways
    // (a person's seed says which): parted to one side, the longer side
    // swept over the forehead and the parting a groove from the brow back;
    // a fringe cut straight over the brows and down over the ears; or
    // swept up and back from the forehead. Strand by strand it is lighter
    // and darker, and its edge is in its own shade.
    const signed = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;
    const shell = (tag, edge, lineAt, growAt) => {
      const o = { part: PART.hair, tag, smooth: 38 + tag };
      const rings = [0, 0.07, 0.22, 0.42, 0.62, 0.82, 1].map((up, r) =>
        DEGS.map((deg, i) => {
          const fr = signed(deg);
          const y0 = lineAt(fr, i);
          const g = r === 0 ? edge : Math.max(0.0025, growAt(fr, up));
          const q = skull(deg, y0 + (1.759 - y0) * up, g, head, 1, r === 0 ? 0.55 : i % 2 ? 0.82 : 1);
          q[1] += g * up * up;
          return q;
        }),
      );
      loft(rings, o);
      cap(rings[6], [0, rings[6].reduce((m, q) => Math.max(m, q[1]), 0) + 0.004, -0.012, head, 1], o, centre);
    };
    const hump = (up) => Math.sin(Math.PI * Math.min(1, Math.max(0, up)));
    shell(
      STYLE.parted,
      0.003,
      (fr) => hairlineAt(fr) - 0.017 * Math.exp(-(((fr - 24) / 26) ** 2)),
      (fr, up) => 0.012 + 0.007 * hump(up) + (fr > -29 && fr < 150 ? 0.005 * hump(up) : 0) - 0.0095 * Math.exp(-(((fr + 29) / 6.5) ** 2)) * Math.min(1, Math.max(0, (up - 0.15) / 0.25)),
    );
    shell(
      STYLE.fringe,
      0.009,
      (fr, i) => (Math.abs(fr) < 60 ? 1.6985 + 0.003 * (i % 2) : Math.abs(fr) < 122 ? 1.642 + 0.004 * (i % 2) : hairlineAt(fr)),
      (fr, up) => 0.0165 + 0.0055 * hump(up) + (Math.abs(fr) > 80 && Math.abs(fr) < 125 ? 0.004 * (1 - up) : 0),
    );
    shell(
      STYLE.swept,
      0.003,
      (fr) => hairlineAt(fr) + 0.003 * Math.exp(-(((Math.abs(fr) - 40) / 15) ** 2)),
      (fr, up) => 0.0105 + 0.021 * Math.exp(-((fr / 55) ** 2)) * hump(up * 1.25) + 0.004 * hump(up),
    );
  }
  // Long hair: from behind the ears round the back, down to the shoulder
  // blades.
  {
    const degs = close ? [74, 86, 100, 116, 134, 155, 180, 205, 226, 244, 260, 274, 286] : [78, 103, 129, 154, 180, 206, 231, 257, 282];
    const rows = [[1.7, 0.012], [1.6, 0.017], [1.5, 0.019], [1.39, 0.02]];
    const strip = rows.map(([y, grow], r) => degs.map((d, k) => {
      const p = skull(d, Math.max(y, 1.585), grow, r === rows.length - 1 ? torso : head, r / (rows.length - 1));
      const down = Math.max(1.585 - y, 0);
      return [p[0] * (1 + down * 1.25), y, p[2] * (1 + down * 0.5) - down * 0.24, p[3], p[4], close && k % 2 ? 0.82 : 1];
    }));
    loft(strip, { part: PART.hair, tag: TAG.long, smooth: 16 }, { open: true, ref: [0, 1.5, 0] });
    loft(strip, { part: PART.hair, tag: TAG.long, inside: true, ao: 0.5 }, { open: true, ref: [0, 1.5, 0] });
  }
  // A mohawk: a fin from the forehead over the crown to the nape.
  {
    const line = [[0.088, 1.728, 1.744], [0.06, 1.745, 1.808], [0.02, 1.757, 1.826], [-0.03, 1.757, 1.846], [-0.07, 1.74, 1.808], [-0.098, 1.7, 1.77], [-0.104, 1.645, 1.682]];
    const o = { part: PART.hair, tag: TAG.mohawk };
    for (let i = 0; i < line.length - 1; i++) {
      const [z0, b0, t0] = line[i];
      const [z1, b1, t1] = line[i + 1];
      const ref = [0, (b0 + b1) / 2, (z0 + z1) / 2];
      for (const s of [-1, 1]) quad([s * 0.012, b0, z0, head, 0], [s * 0.012, b1, z1, head, 0], [s * 0.004, t1, z1, head, 0], [s * 0.004, t0, z0, head, 0], o, ref);
      quad([-0.004, t0, z0, head, 0], [0.004, t0, z0, head, 0], [0.004, t1, z1, head, 0], [-0.004, t1, z1, head, 0], o, ref);
    }
  }
  // A bun at the back of the crown.
  {
    const c = [0, 1.772, -0.086];
    const o = { part: PART.hair, tag: TAG.bun, smooth: 37 };
    const sides = close ? 10 : 6;
    const rings = [[-0.034, 0.03], [0, 0.047], [0.03, 0.034]].map(([dy, r]) => Array.from({ length: sides }, (_, i) => [c[0] + r * Math.cos((i / sides) * TAU), c[1] + dy, c[2] + r * Math.sin((i / sides) * TAU), head, 0]));
    loft(rings, o);
    cap(rings[2], [c[0], c[1] + 0.044, c[2], head, 0], o, c);
  }
  // A cap's brim.
  {
    const o = { part: PART.brim, tag: TAG.brim };
    const top = [[-0.062, 1.727, 0.078, head, 0], [0.062, 1.727, 0.078, head, 0], [0.048, 1.716, 0.178, head, 0], [-0.048, 1.716, 0.178, head, 0]];
    const under = top.map(([x, y, z, s, a]) => [x, y - 0.008, z, s, a, 0.5]);
    quad(...top, o, [0, 1.6, 0.12]);
    quad(...under, o, [0, 1.8, 0.12]);
    quad(top[3], top[2], under[2], under[3], o, [0, 1.72, 0.1]);
  }
  // A hard hat: a shell standing off the head, a brim all round it, longer
  // at the front.
  {
    const o = { part: PART.helmet, tag: TAG.hardhat, smooth: 43 };
    const shell = (y, hw, zf, zb, shade = 1) => Array.from({ length: NH }, (_, i) => {
      const a = (round(i) * Math.PI) / 180;
      const c = Math.cos(a);
      return [hw * Math.sin(a), y, EAR_Z + (c >= 0 ? (zf - EAR_Z) * c : (zb - EAR_Z) * -c), head, 0, shade];
    });
    const rings = [shell(1.706, 0.106, 0.142, -0.128), shell(1.714, 0.093, 0.11, -0.117), shell(1.748, 0.091, 0.106, -0.115), shell(1.782, 0.075, 0.082, -0.097), shell(1.805, 0.045, 0.046, -0.064)];
    loft(rings, o);
    cap(rings[4], [0, 1.814, -0.01, head, 0], o, centre);
    loft([rings[0], shell(1.7, 0.079, 0.1, -0.103, 0.45)], { part: PART.helmet, tag: TAG.hardhat, ao: 0.45 }, { ref: [0, 1.9, -0.01] });
  }
  // A hood: up from the shoulders, round the face, its peak over the brow.
  {
    const rows = [1.47, 1.52, 1.57, 1.63, 1.69, 1.735, 1.767];
    // How far either side of the nose the face's opening reaches between
    // one row and the next.
    const OPEN = [0, 30, 55, 55, 55, 30];
    const rings = rows.map((y, r) => Array.from({ length: NH }, (_, i) => {
      const deg = round(i);
      const p = skull(deg, Math.min(Math.max(y, 1.565), 1.76), 0.016, r === 0 ? torso : head);
      const down = Math.max(1.565 - y, 0);
      const fromFront = Math.min(deg, 360 - deg);
      // Its edge stands forward of the cheeks, and its peak of the brow.
      const lip = fromFront < 60 ? (r >= 5 ? 0.03 : r >= 2 ? 0.02 : 0.004) * (fromFront > 40 || r >= 5 ? 1 : 0.4) : 0;
      return [p[0] * (1 + down * 1.5), y + (r === 6 ? 0.004 : 0), EAR_Z + (p[2] - EAR_Z) * (1 + down * 1.5) + lip, p[3], 0];
    }));
    const open = (r, i) => r < OPEN.length && Math.abs(((round(i) + round(i + 1)) / 2 + 180) % 360 - 180) < OPEN[r];
    const o = { part: PART.hood, tag: TAG.hood };
    loft(rings, { ...o, smooth: 18 }, { skip: open });
    cap(rings[6], [0, 1.8, -0.016, head, 0], { ...o, smooth: 18 }, centre);
    // Its lining, where the opening shows it.
    loft(rings, { ...o, inside: true, ao: 0.4 }, { skip: (r, i) => open(r, i) || Math.abs(((round(i) + round(i + 1)) / 2 + 180) % 360 - 180) > 110 });
  }

  // ---- a long coat's skirt, from the hem to the knee: folds down it, and
  // open at the front so a stride shows ----
  {
    const n = NT;
    const rows = [[0.93, 0.182, 0.124, 0], [0.8, 0.19, 0.134, 0.35], [0.66, 0.198, 0.144, 0.7], [0.53, 0.206, 0.154, 1]];
    const rings = rows.map(([y, rx, rz, aux]) => ring(n, y, 0, 0, rx, rz, pelvis, aux, 0.85).map((p, i) => {
      const fold = 1 + 0.045 * aux * Math.cos(((i + 0.5) / n) * TAU * 3 + 0.6);
      return [p[0] * fold, p[1], p[2] * fold, p[3], p[4]];
    }));
    const front = n / 4 - 1;
    const vent = (r, i) => r > 0 && i === front;
    loft(rings, { part: PART.coat, tag: TAG.skirt, smooth: 9 }, { skip: vent });
    loft(rings, { part: PART.coat, tag: TAG.skirt, inside: true, ao: 0.4 }, { skip: (r, i) => vent(r, i) || (i !== front - 1 && i !== front + 1) });
  }
  // ---- a collar turned up, open at the throat ----
  {
    const rings = [ring(10, 1.455, 0, -0.004, 0.08, 0.078, torso), ring(10, 1.527, 0, -0.002, 0.09, 0.092, torso)];
    const open = (r, i) => i === 1 || i === 2;
    loft(rings, { part: PART.lapel, tag: TAG.collar, smooth: 32 }, { skip: open });
    loft(rings, { part: PART.lapel, tag: TAG.collar, inside: true, ao: 0.5 }, { skip: open });
  }

  if (close) {
    // What an open jacket shows at the waist: the trousers' top, a belt in
    // the bag's leather and its buckle.
    const across = (y, half, out) => [onTorso(y, 90 + half, out), onTorso(y, 90, out + 0.0006), onTorso(y, 90 - half, out)];
    loft([across(0.925, 8.8, 0.0056), across(0.948, 8.9, 0.0056)], { part: PART.trousers, tag: TAG.open }, { open: true, ref: [0, 1.2, 0] });
    loft([across(0.948, 8.9, 0.0058), across(0.973, 9.1, 0.0058)], { part: PART.flap, tag: TAG.open }, { open: true, ref: [0, 1.2, 0] });
    loft([across(0.9455, 2.5, 0.007), across(0.9755, 2.5, 0.007)], { part: PART.metal, tag: TAG.open }, { open: true, ref: [0, 1.2, 0] });
    // A suit's shirt has its collar: a leaf each side of the throat.
    for (const s of [-1, 1]) quad(onTorso(1.452, 90 + s * 30, 0.012), onTorso(1.468, 90 + s * 9, 0.011), onTorso(1.418, 90 + s * 6, 0.0095), onTorso(1.432, 90 + s * 24, 0.0105), { part: PART.shirt, tag: TAG.suit }, [0, 1.4, 0]);
    // A suit's two buttons, and a square in the breast pocket in the tie's
    // colour.
    for (const y of [1.1, 1.045]) quad(onTorso(y - 0.007, 92.6, 0.0085), onTorso(y - 0.007, 87.4, 0.0085), onTorso(y + 0.007, 87.4, 0.0085), onTorso(y + 0.007, 92.6, 0.0085), { part: PART.metal, tag: TAG.suit }, [0, 1.1, 0]);
    quad(onTorso(1.322, 56, 0.0082), onTorso(1.322, 43, 0.0082), onTorso(1.337, 43, 0.0082), onTorso(1.337, 56, 0.0082), { part: PART.tie, tag: TAG.suit }, [0, 1.3, 0]);
    // A pocket's flap on each hip.
    for (const s of [-1, 1]) loft([[62, 48, 34].map((d) => onTorso(1.0, 90 + s * d, 0.0058)), [62, 48, 34].map((d) => onTorso(1.013, 90 + s * d, 0.0058))], { part: PART.seam }, { open: true, ref: [0, 1.0, 0] });
  }
  // ---- one end of a crate carried between two: its near half, in the
  // hands, banded ----
  box([0, 0.99, 0.5], [0.26, 0.13, 0.25], pelvis, { part: PART.crate, tag: CARRIED }, { skip: "z+" });
  for (const z of [0.36, 0.64]) box([0, 0.99, z], [0.264, 0.134, 0.022], pelvis, { part: PART.dark, tag: CARRIED }, { skip: "z+z-" });

  // ---- bags ----
  // A satchel at the hip, its flap buckled, on a strap across the chest.
  {
    const o = { part: PART.bag, tag: TAG.hipbag, smooth: 10 };
    const rings = [[0.795, 0.028, 0.1], [0.825, 0.044, 0.128], [0.93, 0.046, 0.13], [0.972, 0.036, 0.12]].map(([y, hx, hz]) => slab(y, -0.225, 0.012, hx, hz, pelvis));
    loft(rings, o);
    cap(rings[0], [-0.225, 0.79, 0.012, pelvis, 0], o, [-0.225, 0.88, 0.012]);
    cap(rings[3], [-0.225, 0.978, 0.012, pelvis, 0], o, [-0.225, 0.88, 0.012]);
    const flap = { part: PART.flap, tag: TAG.hipbag };
    quad([-0.275, 0.972, -0.112, pelvis, 0], [-0.275, 0.972, 0.136, pelvis, 0], [-0.2755, 0.885, 0.13, pelvis, 0], [-0.2755, 0.885, -0.106, pelvis, 0], flap, [0, 0.9, 0]);
    quad([-0.277, 0.905, 0.0, pelvis, 0], [-0.277, 0.905, 0.024, pelvis, 0], [-0.277, 0.875, 0.024, pelvis, 0], [-0.277, 0.875, 0.0, pelvis, 0], { part: PART.metal, tag: TAG.hipbag }, [0, 0.9, 0]);
    const strap = { part: PART.dark, tag: TAG.hipbag };
    for (const s of [1, -1]) {
      // Over the chest (s 1) and over the back (s -1), hip to shoulder.
      const path = [[0.985, 165], [1.1, 140], [1.25, 110], [1.38, 75]].map(([y, deg]) => [onTorso(y - 0.018, s * deg), onTorso(y + 0.018, s * deg)]);
      path.push([[0.115, 1.447, s * 0.03, torso, 0], [0.09, 1.462, s * 0.03, torso, 0]]);
      for (let i = 0; i < path.length - 1; i++) quad(path[i][0], path[i + 1][0], path[i + 1][1], path[i][1], strap, [0, (path[i][0][1] + path[i + 1][0][1]) / 2, 0]);
    }
  }
  // A pack on the back, a pocket on it, straps over the shoulders.
  {
    const o = { part: PART.bag, tag: TAG.backpack, smooth: 11 };
    const rings = [[1.065, 0.09, 0.04, -0.158], [1.1, 0.122, 0.062, -0.17], [1.3, 0.12, 0.062, -0.17], [1.39, 0.1, 0.05, -0.162], [1.422, 0.065, 0.03, -0.15]].map(([y, hx, hz, cz]) => slab(y, 0, cz, hx, hz, torso));
    loft(rings, o);
    cap(rings[0], [0, 1.058, -0.158, torso, 0], o, [0, 1.25, -0.17]);
    cap(rings[4], [0, 1.43, -0.15, torso, 0], o, [0, 1.25, -0.17]);
    box([0, 1.165, -0.238], [0.082, 0.062, 0.012], torso, { part: PART.flap, tag: TAG.backpack }, { skip: "z+" });
    const strap = { part: PART.dark, tag: TAG.backpack };
    for (const s of [-1, 1]) {
      const path = [[1.1, 52], [1.2, 48], [1.32, 46], [1.41, 44]].map(([y, off]) => [onTorso(y, 90 - s * (off - 3)), onTorso(y, 90 - s * (off + 3))]);
      path.push([[s * 0.1, 1.455, -0.02, torso, 0], [s * 0.122, 1.449, -0.02, torso, 0]]);
      for (let i = 0; i < path.length - 1; i++) quad(path[i][0], path[i + 1][0], path[i + 1][1], path[i][1], strap, [0, (path[i][0][1] + path[i + 1][0][1]) / 2, 0]);
    }
  }
  // A shopping bag in the -x hand: soft sides, open at the top, two handles
  // up to the fingers.
  {
    const x = -0.2135;
    const o = { part: PART.tote, tag: TAG.tote, smooth: 12 };
    const rings = [[0.43, 0.04, 0.135], [0.5, 0.052, 0.15], [0.6, 0.045, 0.15], [0.665, 0.028, 0.148]].map(([y, hx, hz]) => slab(y, x, 0.012, hx, hz, fore, 0.3));
    loft(rings, o);
    cap(rings[0], [x, 0.426, 0.012, fore, 0], o, [x, 0.55, 0.012]);
    cap(rings[3], [x, 0.64, 0.012, fore, 0, 0.3], { part: PART.dark, tag: TAG.tote }, [x, 0.3, 0.012]);
    for (const s of [-1, 1]) {
      const arch = [[x + s * 0.027, 0.665, -0.062], [x + s * 0.012, 0.745, -0.02], [x, 0.772, 0.012], [x + s * 0.012, 0.745, 0.044], [x + s * 0.027, 0.665, 0.086]];
      const strip = [arch.map(([a, b, c]) => [a - 0.006, b, c, fore, 0]), arch.map(([a, b, c]) => [a + 0.006, b, c, fore, 0])];
      loft(strip, { part: PART.flap, tag: TAG.tote }, { open: true, ref: [x, 0.6, 0.012] });
      loft(strip, { part: PART.flap, tag: TAG.tote, inside: true }, { open: true, ref: [x, 0.6, 0.012] });
    }
  }

  // ---- an umbrella over them: eight gores of cloth sagging between the
  // ribs, the ribs and their stretchers under it, a shaft down to the hand,
  // a crook below it, and the neon rim a line along the canopy's edge ----
  {
    const [gx, gy, gz] = gripAt(HOLD.umbrella);
    const cx = CANOPY.x;
    const cz = CANOPY.z;
    const E = CANOPY.edge;
    const N = 16;
    // A rib every second point; between two ribs the cloth is pulled in
    // and its edge up.
    const at = (i, R, y, aux, rib = i % 2 === 0) => [cx + R * (rib ? 1 : 0.94) * Math.cos((i / N) * TAU), y + (rib ? 0 : (R / CANOPY.radius) * 0.02), cz + R * (rib ? 1 : 0.94) * Math.sin((i / N) * TAU), torso, aux];
    const rows = [[CANOPY.radius + 0.02, E - 0.003, 1], [0.41, E + 0.12, 0.3], [0.21, E + 0.193, 0]].map(([R, y, aux]) => Array.from({ length: N }, (_, i) => at(i, R, y, aux)));
    const apex = [cx, E + 0.22, cz, torso, 0];
    const below = [cx, 1.7, cz];
    for (const inside of [false, true]) {
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        const o = { part: PART.canopy, tag: TAG.umbrella, smooth: (inside ? 40 : 20) + (i >> 1), inside, ao: inside ? 0.85 : 1 };
        for (let r = 0; r < 2; r++) quad(rows[r][i], rows[r][j], rows[r + 1][j], rows[r + 1][i], o, below);
        tri(rows[2][i], rows[2][j], apex, o, below);
      }
    }
    // The rim: a band the shader keeps a pixel and a half tall however far
    // off it is (its weight says which edge a vertex is), leaning in at the
    // top so it shows from a roof as well as from the street.
    const rim = [Array.from({ length: N }, (_, i) => at(i, CANOPY.radius + 0.023, E - 0.003 - RIM_HALF, -1)), Array.from({ length: N }, (_, i) => at(i, CANOPY.radius + 0.012, E - 0.003 + RIM_HALF, 1))];
    loft(rim, { part: PART.rim, tag: TAG.umbrella });
    loft(rim, { part: PART.rim, tag: TAG.umbrella, inside: true });
    const metal = { part: PART.metal, tag: TAG.umbrella };
    for (let i = 0; i < N; i += 2) {
      // A rib under the cloth from the top to its tip, and the stretcher
      // that holds it up from the runner on the shaft.
      const a = (i / N) * TAU;
      const side = [-Math.sin(a) * 0.005, Math.cos(a) * 0.005];
      const line = [[0.21, E + 0.186], [0.41, E + 0.113], [CANOPY.radius + 0.03, E - 0.012]].map(([R, y]) => [cx + R * Math.cos(a), y, cz + R * Math.sin(a)]);
      const strip = [line.map(([x, y, z]) => [x - side[0], y, z - side[1], torso, 0]), line.map(([x, y, z]) => [x + side[0], y, z + side[1], torso, 0])];
      loft(strip, metal, { open: true, ref: [cx, 3, cz] });
      const stretch = [[cx + 0.012 * Math.cos(a), E + 0.07, cz + 0.012 * Math.sin(a)], line[1]];
      const bar = [stretch.map(([x, y, z]) => [x - side[0], y, z - side[1], torso, 0]), stretch.map(([x, y, z]) => [x + side[0], y, z + side[1], torso, 0])];
      loft(bar, metal, { open: true, ref: [cx, 3, cz] });
      loft(bar, { ...metal, inside: true }, { open: true, ref: [cx, 3, cz] });
    }
    // The shaft, from the hand to the tip over the canopy; the handle
    // below the hand, and its crook.
    const hand = [gx + 0.004, gy, gz + 0.01];
    const up = [cx - hand[0], E + 0.22 - hand[1], cz - hand[2]].map((v, _, d) => v / Math.hypot(...d));
    const along = (t) => [hand[0] + up[0] * t, hand[1] + up[1] * t, hand[2] + up[2] * t];
    const top = Math.hypot(cx - hand[0], E + 0.22 - hand[1], cz - hand[2]);
    rod([along(-0.03), along(top)], 0.006, torso, metal);
    const spike = rod([along(top), along(top + 0.012)], 0.011, torso, metal);
    cap(spike[1], [...along(top + 0.05), torso, 0], metal, along(top));
    const grip = along(-0.14);
    const crook = rod([along(-0.03), grip, [grip[0], grip[1] - 0.034, grip[2] + 0.03], [grip[0], grip[1] - 0.018, grip[2] + 0.07]], 0.013, torso, { part: PART.flap, tag: TAG.umbrella, smooth: 38 });
    cap(crook[3], [grip[0], grip[1] - 0.008, grip[2] + 0.082, torso, 0], { part: PART.flap, tag: TAG.umbrella, smooth: 38 }, [grip[0], grip[1] - 0.03, grip[2] + 0.04]);
  }

  // ---- a phone in the +x hand: its case, and the lit screen that looks
  // at whoever holds it once the arm is up ----
  {
    const [x, y, z] = PHONE_AT;
    box([x, y, z], [0.037, 0.077, 0.0052], fore, { part: PART.dark, tag: TAG.phone });
    // The back glows too, dimmer: the phone is light all through.
    for (const [dz, aux, inset] of [[0.0062, 1, 0.004], [-0.0062, 0.35, 0.007]]) quad([x - 0.037 + inset, y - 0.077 + inset, z + dz, fore, aux], [x + 0.037 - inset, y - 0.077 + inset, z + dz, fore, aux], [x + 0.037 - inset, y + 0.077 - inset, z + dz, fore, aux], [x - 0.037 + inset, y + 0.077 - inset, z + dz, fore, aux], { part: PART.phone, tag: TAG.phone }, [x, y, z]);
  }
  // ---- a cup in the -x hand, a lid on it and a sleeve round it; it stands
  // upright once the forearm is level ----
  {
    const at = [-0.1535, 0.806];
    const round8 = (zz, r) => Array.from({ length: 8 }, (_, i) => [at[0] + r * Math.cos((i / 8) * TAU), at[1] + r * Math.sin((i / 8) * TAU), zz, fore, 0]);
    const o = { part: PART.paper, tag: TAG.cup, smooth: 35 };
    const body = [round8(-0.048, 0.027), round8(0.07, 0.036)];
    loft(body, o);
    cap(body[0], [at[0], at[1], -0.05, fore, 0], o, [at[0], at[1], 0]);
    loft([round8(-0.008, 0.0312), round8(0.036, 0.0346)], { part: PART.bag, tag: TAG.cup, smooth: 39 });
    const lid = { part: PART.flap, tag: TAG.cup };
    const top = [round8(0.07, 0.0385), round8(0.08, 0.037)];
    loft(top, lid);
    cap(top[1], [at[0], at[1], 0.083, fore, 0], lid, [at[0], at[1], 0]);
  }
  // ---- a cigarette between the fingers, its tip lit ----
  {
    const [x, y, z] = EMBER_AT;
    const three = (zz, r) => Array.from({ length: 3 }, (_, i) => [x + r * Math.cos(((i + 0.5) / 3) * TAU), y + r * Math.sin(((i + 0.5) / 3) * TAU), zz, fore, 0]);
    const ember = [three(z + 0.007, 0.009), three(z - 0.008, 0.009)];
    loft([three(z + 0.085, 0.006), three(z + 0.007, 0.006)], { part: PART.paper, tag: TAG.smoke });
    loft(ember, { part: PART.ember, tag: TAG.smoke });
    tri(...ember[1], { part: PART.ember, tag: TAG.smoke }, [x, y, z]);
    tri(...ember[0], { part: PART.ember, tag: TAG.smoke }, [x, y, z]);
  }
  return finish(tris);
}

/**
 * The figure: `far` false for the one with a face, true for the cheap one;
 * `close` for the one with a face as it is within a few steps of the eye.
 */
export function figureGeometry(far = false, close = false) {
  return far ? farFigure() : nearFigure(close);
}
