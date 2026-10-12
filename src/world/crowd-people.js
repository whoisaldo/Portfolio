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
};

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
// head's turn, and how far the hips sit back from where they stand.
export const POSES = ["idle", "talk", "lean", "sit", "phone", "squat", "vendor", "smoke"];
export const POSE_TABLE = [
  // idle
  [0, 0, 0.02, 0.03, 0, 0.03, 0, 0.03, 0.03, 0.02, 0.2, 0.12, 0.03, 0.02, 0.2, 0.12, 0, 0, 0, 0],
  // talk
  [0, 0, 0.04, 0, 0, 0.03, 0.06, 0.1, 0.05, 0.03, 0.2, 0.1, 0.38, 0.15, 1.5, 0.25, 1, 0, 0, 0],
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

/** The near figure: the one with a face. */
function nearFigure() {
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
  const TORSO = [
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
  const NT = 12;
  const torsoRings = TORSO.map(([y, cz, rx, rz, seg, aux]) => ring(NT, y, 0, cz, rx, rz, seg, aux, 0.85));
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
    const legRings = [
      [0.905, 0.082, 0.092, 0, thigh],
      [0.8, 0.078, 0.088, 0.002, thigh],
      [0.66, 0.068, 0.077, 0.004, thigh],
      [0.55, 0.06, 0.067, 0.008, thigh],
      [0.5, 0.058, 0.064, 0.01, shin],
      [0.45, 0.054, 0.062, 0.002, shin],
      [0.36, 0.055, 0.065, -0.01, shin],
      [0.22, 0.048, 0.055, -0.006, shin],
      [0.105, 0.05, 0.058, -0.002, shin],
    ].map(([y, rx, rz, cz, seg]) => ring(8, y, hx, cz, rx, rz, seg));
    loft(legRings, { part: PART.trousers, smooth: 3 });
    loft([legRings[8], ring(8, 0.114, hx, -0.002, 0.034, 0.04, shin)], { part: PART.trousers, ao: 0.4 }, { ref: [hx, 0.6, 0] });
    // ---- a shoe: heel, the opening the ankle goes into, instep, toe ----
    const across = (z, w, top) => [[hx - w, 0, z], [hx + w, 0, z], [hx + w, top * 0.55, z], [hx + w * 0.55, top, z], [hx - w * 0.55, top, z], [hx - w, top * 0.55, z]].map(([x, y, zz]) => [x, y, zz, foot, 0]);
    const shoe = [across(-0.078, 0.034, 0.095), across(-0.04, 0.043, 0.118), across(0.04, 0.049, 0.095), across(0.12, 0.047, 0.06), across(0.178, 0.036, 0.04)];
    loft(shoe, { part: PART.shoe, smooth: 8 });
    cap(shoe[0], [hx, 0.045, -0.09, foot, 0], { part: PART.shoe, smooth: 8 }, [hx, 0.05, 0.05]);
    cap(shoe[4], [hx, 0.018, 0.196, foot, 0], { part: PART.shoe, smooth: 8 }, [hx, 0.05, 0.05]);

    // ---- an arm: shoulder, a fold at the elbow, the cuff ----
    const ARM = [
      [1.434, 0.176, 0.03, 0.04, upper, 0.5],
      [1.405, 0.188, 0.046, 0.053, upper, 1],
      [1.36, 0.192, 0.047, 0.052, upper, 1],
      [1.26, 0.196, 0.043, 0.047, upper, 1],
      [1.19, 0.198, 0.043, 0.046, upper, 1],
      [1.15, 0.199, 0.039, 0.042, fore, 0.9],
      [1.11, 0.2, 0.042, 0.046, fore, 0.9],
      [1.02, 0.203, 0.038, 0.042, fore, 0.7],
      [0.95, 0.205, 0.034, 0.038, fore, 0.3],
    ];
    const armRings = ARM.map(([y, cx, rx, rz, seg, aux]) => ring(8, y, sx * cx, 0, rx, rz, seg, aux));
    loft(armRings, { part: PART.sleeve, smooth: 4 });
    cap(armRings[0], [sx * 0.168, 1.443, 0, upper, 0.5], { part: PART.sleeve, smooth: 4 }, [sx * 0.19, 1.3, 0]);
    const ax = sx * 0.2055;
    const cuff = [ring(8, 0.95, ax, 0, 0.039, 0.043, fore, 0.3), ring(8, 0.918, ax, 0, 0.038, 0.042, fore, 0.3)];
    loft([armRings[8], cuff[0]], { part: PART.cuff, ao: 0.7 }, { ref: [ax, 0.8, 0] });
    loft(cuff, { part: PART.cuff, smooth: 5 });
    loft([cuff[1], ring(8, 0.92, ax, 0, 0.022, 0.027, fore)], { part: PART.cuff, ao: 0.4 }, { ref: [ax, 1.1, 0] });
    // ---- a hand: the palm toward the body, a mitten of fingers curling
    // in, the thumb forward of them ----
    const hand = [slab(0.92, ax, 0, 0.02, 0.026, fore), slab(0.885, ax, 0.004, 0.015, 0.036, fore), slab(0.84, ax, 0.009, 0.0165, 0.043, fore), slab(0.8, ax - sx * 0.002, 0.013, 0.015, 0.041, fore), slab(0.765, ax - sx * 0.008, 0.019, 0.0125, 0.037, fore), slab(0.738, ax - sx * 0.018, 0.024, 0.009, 0.03, fore)];
    loft(hand, { part: PART.skin, smooth: 6 });
    cap(hand[5], [ax - sx * 0.021, 0.73, 0.025, fore, 0], { part: PART.skin, smooth: 6 }, [ax, 0.8, 0.01]);
    const thumb = rod([[ax - sx * 0.004, 0.878, 0.034], [ax - sx * 0.008, 0.838, 0.064], [ax - sx * 0.012, 0.802, 0.075]], [0.0125, 0.011, 0.0085], fore, { part: PART.skin, smooth: 36 });
    cap(thumb[2], [ax - sx * 0.013, 0.79, 0.079, fore, 0], { part: PART.skin, smooth: 36 }, [ax, 0.84, 0.06]);
    // A neon stripe down the sleeve.
    const stripe = ARM.slice(1).map(([y, cx, rx, , seg]) => [
      [sx * (cx + rx * widen(8) + 0.004), y, -0.007, seg, 0],
      [sx * (cx + rx * widen(8) + 0.004), y, 0.007, seg, 0],
    ]);
    loft(stripe, { part: PART.trim, tag: TAG.trim }, { open: true, ref: [sx * 0.1, 1.2, 0] });
  }

  // ---- the neck ----
  loft([ring(8, 1.45, 0, -0.008, 0.05, 0.054, torso), ring(8, 1.5, 0, -0.004, 0.047, 0.051, head), ring(8, 1.552, 0, 0.002, 0.046, 0.05, head, 0, 1, 0.7)], { part: PART.skin, smooth: 7 });

  // ---- the head ----
  // Its outline at a height: how far forward the face is, the half width,
  // how far back the skull goes, and how pointed the front is (a chin is,
  // a forehead is not). The eye line sits back under the brow.
  const SKULL = [
    [1.53, 0.066, 0.034, -0.004, 1.2],
    [1.546, 0.083, 0.05, -0.04, 1.15],
    [1.572, 0.091, 0.062, -0.066, 1.05],
    [1.6, 0.096, 0.069, -0.082, 0.95],
    [1.632, 0.097, 0.074, -0.092, 0.85],
    [1.664, 0.0935, 0.076, -0.098, 0.8],
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
  const NH = 14;
  const round = (i) => (i * 360) / NH;
  const centre = [0, 1.65, -0.005];
  {
    // The sockets either side of the nose are in the brow's shade, and so
    // is what is under the jaw.
    const shade = (r, i) => (r === 5 && (i === 1 || i === NH - 1) ? 0.6 : r === 5 && i === 0 ? 0.82 : r === 0 ? 0.65 : r === 1 && i > 3 && i < NH - 3 ? 0.8 : 1);
    const rings = SKULL.map(([y], r) => Array.from({ length: NH }, (_, i) => skull(round(i), y, 0, head, 0, shade(r, i))));
    loft(rings, { part: PART.skin, smooth: 14 });
    cap(rings[0], [0, 1.526, 0.03, head, 0, 0.65], { part: PART.skin, smooth: 14 }, centre);
    cap(rings[SKULL.length - 1], [0, 1.767, -0.008, head, 0], { part: PART.skin, smooth: 14 }, centre);
  }
  // A point on the face at a distance to the side of the nose and a height.
  const onFace = (x, y, out = 0.0015) => {
    const [, zf, hw, , ef] = skullRow(y);
    const s = Math.min(0.999, (Math.abs(x) / hw) ** 1.25);
    return [x, y, EAR_Z + (zf - EAR_Z) * Math.sqrt(1 - s * s) ** ef + out, head, 0];
  };
  {
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
      quad(onFace(ex - 0.0047, ey - 0.0052, 0.0027), onFace(ex + 0.0047, ey - 0.0052, 0.0027), onFace(ex + 0.0047, ey + 0.0052, 0.0027), onFace(ex - 0.0047, ey + 0.0052, 0.0027), { part: PART.eye }, centre);
      const lid = [[-w * 1.06, 0.0006], [-0.5 * w, hgt], [0.5 * w, hgt], [w * 1.12, 0.0014]];
      loft([lid.map(([dx, dy]) => onFace(ex + s * dx, ey + dy, 0.0031)), lid.map(([dx, dy]) => onFace(ex + s * dx, ey + dy + 0.004, 0.0031))], { part: PART.line }, { open: true, ref: centre });
      const brow = [[0.01, 1.6885, 0.0078], [0.03, 1.694, 0.0068], [0.0485, 1.6885, 0.0045]];
      loft([brow.map(([x, y]) => onFace(s * x, y, 0.0022)), brow.map(([x, y, t]) => onFace(s * x, y + t, 0.0022))], { part: PART.brow }, { open: true, ref: centre });
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
  const HAIRLINE = [1.722, 1.726, 1.712, 1.699, 1.696, 1.6, 1.575, 1.57];
  {
    const o = { part: PART.scalp, tag: TAG.hair, smooth: 15 };
    const line = (i) => HAIRLINE[i <= NH / 2 ? i : NH - i];
    const rows = [[0, 0.0015, 0.5], [0.07, 0.008, 0.5], [0.4, 0.0095, 1], [0.75, 0.011, 1], [1, 0.011, 1]];
    const rings = rows.map(([up, grow, aux]) => Array.from({ length: NH }, (_, i) => skull(round(i), line(i) + (1.759 - line(i)) * up, grow, head, aux)));
    loft(rings, o);
    cap(rings[4], [0, 1.781, -0.012, head, 1], o, centre);
  }
  // Long hair: from behind the ears round the back, down to the shoulder
  // blades.
  {
    const degs = [78, 103, 129, 154, 180, 206, 231, 257, 282];
    const rows = [[1.7, 0.012], [1.6, 0.017], [1.5, 0.019], [1.39, 0.02]];
    const strip = rows.map(([y, grow], r) => degs.map((d) => {
      const p = skull(d, Math.max(y, 1.585), grow, r === rows.length - 1 ? torso : head, r / (rows.length - 1));
      const down = Math.max(1.585 - y, 0);
      return [p[0] * (1 + down * 1.25), y, p[2] * (1 + down * 0.5) - down * 0.24, p[3], p[4]];
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
    const rings = [[-0.034, 0.03], [0, 0.047], [0.03, 0.034]].map(([dy, r]) => Array.from({ length: 6 }, (_, i) => [c[0] + r * Math.cos((i / 6) * TAU), c[1] + dy, c[2] + r * Math.sin((i / 6) * TAU), head, 0]));
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
    const n = 12;
    const rows = [[0.93, 0.182, 0.124, 0], [0.8, 0.19, 0.134, 0.35], [0.66, 0.198, 0.144, 0.7], [0.53, 0.206, 0.154, 1]];
    const rings = rows.map(([y, rx, rz, aux]) => ring(n, y, 0, 0, rx, rz, pelvis, aux, 0.85).map((p, i) => {
      const fold = 1 + 0.045 * aux * Math.cos(((i + 0.5) / n) * TAU * 3 + 0.6);
      return [p[0] * fold, p[1], p[2] * fold, p[3], p[4]];
    }));
    const vent = (r, i) => r > 0 && i === 2;
    loft(rings, { part: PART.coat, tag: TAG.skirt, smooth: 9 }, { skip: vent });
    loft(rings, { part: PART.coat, tag: TAG.skirt, inside: true, ao: 0.4 }, { skip: (r, i) => vent(r, i) || (i !== 1 && i !== 3) });
  }
  // ---- a collar turned up, open at the throat ----
  {
    const rings = [ring(10, 1.455, 0, -0.004, 0.08, 0.078, torso), ring(10, 1.527, 0, -0.002, 0.09, 0.092, torso)];
    const open = (r, i) => i === 1 || i === 2;
    loft(rings, { part: PART.hood, tag: TAG.collar, smooth: 32 }, { skip: open });
    loft(rings, { part: PART.hood, tag: TAG.collar, inside: true, ao: 0.5 }, { skip: open });
  }

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
 * The figure: `far` false for the one with a face, true for the cheap one.
 */
export function figureGeometry(far = false) {
  return far ? farFigure() : nearFigure();
}
