// src/world/crowd-people.js: the figure the crowd is made of.
//
// One low-poly person, built here from rings and boxes: standing, arms down,
// looking toward +z, 1.76 m to the crown. Every vertex knows which piece of
// the body it rides (SEG), what it is made of (PART) and, for the things only
// some people have (a hairstyle, a long coat, a bag, an umbrella), which of
// those it belongs to (TAG). crowd.js's vertex shader turns the segments
// about the joints in RIG, colours the parts person by person and folds away
// the tags a person does not wear. Two builds on the same joints: the near
// one with a face, hands and feet, and a far one of a few hundred triangles
// for people too small on screen to tell the two apart.
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
};

/** How an arm holds an umbrella up, a phone in front of the chest, a bag
 *  at the side: the shoulder swung forward, out from the body, the elbow
 *  bent, the forearm turned in across the chest (radians). */
export const HOLD = {
  umbrella: { pitch: -0.36, roll: 0.05, elbow: 1.97, inward: 0.24 },
  phone: { pitch: 0.2, roll: 0.06, elbow: 1.6, inward: 0.5 },
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
/** The umbrella's rim, as built: its half height. */
export const RIM_HALF = 0.012;

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
  [0, 0, 0.02, 0.03, 0, 0.03, 0, 0.03, 0.03, 0.07, 0.18, 0.1, 0.03, 0.07, 0.18, 0.1, 0, 0, 0, 0],
  // talk
  [0, 0, 0.04, 0, 0, 0.03, 0.06, 0.1, 0.05, 0.08, 0.2, 0.1, 0.38, 0.15, 1.5, 0.25, 1, 0, 0, 0],
  // lean
  [0, 0.13, 0.02, 0.12, 0, 0, 0.55, 1.25, 0.25, 0.1, 1.6, 0.9, 0.27, 0.1, 1.5, 0.95, 0, 0.25, 0, 0],
  // sit
  [RIG.seat, 0, 0.12, 0.04, 1.5, 1.5, 1.5, 1.5, 0.35, 0.08, 1.15, 0.25, 0.35, 0.08, 1.15, 0.25, 0, 0, 0, 0],
  // phone
  [0, 0, 0.06, 0.38, 0, 0.03, 0.04, 0.08, 0, 0.06, 0.15, 0.1, HOLD.phone.pitch, HOLD.phone.roll, HOLD.phone.elbow, HOLD.phone.inward, 4, 0, 0, 0],
  // squat
  [0.65, 0, 0.55, -0.35, 1.95, 2.5, 1.95, 2.5, 1.0, 0.12, 0.5, 0.3, 1.0, 0.12, 0.5, 0.3, 0, 0, -0.09, 0],
  // vendor
  [0, 0, 0.08, 0.05, 0, 0.03, 0, 0.03, 0.25, 0.12, 1.15, 0.15, 0.25, 0.12, 1.15, 0.15, 3, 0, 0, 0],
  // smoke
  [0, 0, 0.02, 0, 0, 0, 0.1, 0.2, -0.05, 0.1, 0.35, 0.2, 0.15, 0.08, 1.0, 0.3, 2, 0, 0, 0],
];

// ---- building ---------------------------------------------------------------
// A vertex is [x, y, z, segment, weight]; a triangle carries what it is made
// of, its tag and its smoothing group (0 is faceted).

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
 *  smoothing group, faceted outside one) and aRig (segment, part, tag,
 *  weight). */
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
      const id = `${key(p)}|${Math.round(n[0] * 100)},${Math.round(n[1] * 100)},${Math.round(n[2] * 100)}|${p[3]},${o.part},${o.tag ?? 0},${Math.round((p[4] ?? 0) * 100)}`;
      let at = seen.get(id);
      if (at === undefined) {
        at = pos.length / 3;
        seen.set(id, at);
        pos.push(p[0], p[1], p[2]);
        nor.push(n[0], n[1], n[2]);
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

/**
 * The figure: `far` false for the one with a face, true for the cheap one.
 */
export function figureGeometry(far = false) {
  const { tris, tri, quad, loft, cap, box } = soup();
  const { pelvis, torso, head, upper, fore, thigh, shin, foot } = SEG;
  const ell = (n, y, cx, cz, rx, rz, seg, aux = 0) => {
    const k = widen(n);
    return Array.from({ length: n }, (_, i) => {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      return [cx + rx * k * Math.cos(a), y, cz + rz * k * Math.sin(a), seg, aux];
    });
  };
  const mirror = (half, seg, aux = 0) => [...half.map(([x, y, z]) => [x, y, z, seg, aux]), ...[...half].reverse().map(([x, y, z]) => [-x, y, z, seg, aux])];

  // ---- the jacket: hem, waist, chest, shoulders, the root of the neck ----
  // y, middle z, half width, half depth, what it rides, how much a puffer
  // swells it.
  const TORSO = [
    [0.915, 0, 0.172, 0.116, pelvis, 0.5],
    [0.985, 0, 0.165, 0.108, pelvis, 0.8],
    [1.08, 0, 0.145, 0.098, torso, 1],
    [1.27, 0.012, 0.168, 0.114, torso, 1],
    [1.39, 0.004, 0.172, 0.1, torso, 1],
    [1.44, 0, 0.125, 0.082, torso, 0.6],
    [1.475, -0.004, 0.06, 0.062, torso, 0.2],
  ];
  const torsoAt = (y) => {
    let i = 0;
    while (i < TORSO.length - 2 && TORSO[i + 1][0] < y) i++;
    const a = TORSO[i];
    const b = TORSO[i + 1];
    const t = Math.min(1, Math.max(0, (y - a[0]) / (b[0] - a[0])));
    return { cz: a[1] + (b[1] - a[1]) * t, rx: a[2] + (b[2] - a[2]) * t, rz: a[3] + (b[3] - a[3]) * t, seg: y < RIG.waistY ? pelvis : torso };
  };
  const NT = far ? 6 : 8;
  const torsoRows = far ? [0, 2, 3, 4, 6] : [0, 1, 2, 3, 4, 5, 6];
  loft(torsoRows.map((i) => TORSO[i]).map(([y, cz, rx, rz, seg, aux]) => ell(NT, y, 0, cz, rx, rz, seg, aux)), { part: PART.jacket, smooth: 1 });
  // A point on the jacket at a height and an angle round it (0 toward +x,
  // a quarter turn toward the front), `out` proud of it.
  const onTorso = (y, deg, out = 0.006) => {
    const t = torsoAt(y);
    const a = (deg * Math.PI) / 180;
    return [(t.rx + out) * Math.cos(a), y, t.cz + (t.rz + out) * Math.sin(a), t.seg, 0];
  };
  // A band round the jacket between two heights.
  const band = (y0, y1, o) => {
    const ring = (y) => {
      const t = torsoAt(y);
      return ell(NT, y, 0, t.cz, t.rx + 0.005, t.rz + 0.005, t.seg);
    };
    loft([ring(y0), ring(y1)], o);
  };
  band(0.921, 0.935, { part: PART.trim, tag: TAG.trim });

  // ---- the hips, under the jacket's hem ----
  if (!far) {
    const rings = [ell(8, 0.97, 0, 0, 0.162, 0.104, pelvis), ell(8, 0.9, 0, 0, 0.168, 0.108, pelvis), ell(8, 0.845, 0, 0, 0.15, 0.1, pelvis)];
    loft(rings, { part: PART.trousers, smooth: 2 });
    cap(rings[2], [0, 0.835, 0, pelvis, 0], { part: PART.trousers, smooth: 2 }, [0, 0.9, 0]);
  }

  for (const sx of [-1, 1]) {
    // ---- a leg: thigh, knee, calf, the trouser's hem at the ankle ----
    const LEG = [
      [0.905, 0.08, 0.09, 0, thigh],
      [0.7, 0.072, 0.081, 0, thigh],
      [0.555, 0.06, 0.067, 0.002, thigh],
      [0.5, 0.057, 0.062, 0.004, shin],
      [0.36, 0.054, 0.063, -0.008, shin],
      [0.115, 0.047, 0.053, -0.004, shin],
    ];
    const hx = sx * RIG.hipX;
    const NL = far ? 4 : 6;
    const legRings = (far ? [0, 3, 5] : [0, 1, 2, 3, 4, 5]).map((i) => LEG[i]).map(([y, rx, rz, cz, seg]) => ell(NL, y, hx, cz, rx, rz, seg));
    loft(legRings, { part: PART.trousers, smooth: 3 });
    if (!far) cap(legRings[legRings.length - 1], [hx, 0.11, 0, shin, 0], { part: PART.trousers }, [hx, 0.3, 0]);
    // ---- a shoe ----
    const section = (z, w, top) => [[hx - w, 0, z, foot, 0], [hx + w, 0, z, foot, 0], [hx + w, top, z, foot, 0], [hx - w, top, z, foot, 0]];
    const shoe = far ? [section(-0.07, 0.042, 0.105), section(0.18, 0.04, 0.045)] : [section(-0.075, 0.04, 0.1), section(0.03, 0.05, 0.115), section(0.185, 0.042, 0.042)];
    loft(shoe, { part: PART.shoe });
    quad(...shoe[0], { part: PART.shoe }, [hx, 0.05, 0.05]);
    if (!far) quad(...shoe[shoe.length - 1], { part: PART.shoe }, [hx, 0.05, 0.05]);

    // ---- an arm: shoulder, elbow, cuff, and a hand ----
    const ARM = [
      [1.44, 0.18, 0.04, 0.046, upper, 0.6],
      [1.395, 0.19, 0.05, 0.056, upper, 1],
      [1.19, 0.198, 0.044, 0.047, upper, 1],
      [1.15, 0.2, 0.041, 0.044, fore, 0.9],
      [1.04, 0.203, 0.041, 0.045, fore, 0.8],
      [0.915, 0.207, 0.033, 0.037, fore, 0.2],
    ];
    const NA = far ? 3 : 6;
    const armRings = (far ? [1, 3, 5] : [0, 1, 2, 3, 4, 5]).map((i) => ARM[i]).map(([y, cx, rx, rz, seg, aux]) => ell(NA, y, sx * cx, 0, rx, rz, seg, aux));
    loft(armRings, { part: PART.sleeve, smooth: 4 });
    cap(armRings[0], [sx * 0.178, far ? 1.44 : 1.456, 0, upper, 0.6], { part: PART.sleeve, smooth: 4 }, [sx * 0.19, 1.3, 0]);
    const ax = sx * 0.208;
    if (far) {
      const tip = ell(NA, 0.76, sx * 0.21, 0.012, 0.016, 0.03, fore);
      loft([armRings[2], tip], { part: PART.skin, smooth: 5 });
      cap(tip, [sx * 0.21, 0.75, 0.014, fore, 0], { part: PART.skin, smooth: 5 }, [sx * 0.21, 0.85, 0]);
    } else {
      cap(armRings[5], [sx * 0.207, 0.912, 0, fore, 0], { part: PART.sleeve }, [sx * 0.207, 1.0, 0]);
      const palm = (y, tx, wz, cz) => [[ax - tx, y, cz - wz, fore, 0], [ax + tx, y, cz - wz, fore, 0], [ax + tx, y, cz + wz, fore, 0], [ax - tx, y, cz + wz, fore, 0]];
      const hand = [palm(0.918, 0.017, 0.027, 0), palm(0.85, 0.021, 0.042, 0.006), palm(0.79, 0.019, 0.04, 0.012), palm(0.745, 0.012, 0.03, 0.016)];
      loft(hand, { part: PART.skin });
      quad(...hand[3], { part: PART.skin }, [ax, 0.8, 0.01]);
      const thumb = [
        [[ax - 0.011, 0.885, 0.034, fore, 0], [ax + 0.011, 0.885, 0.034, fore, 0], [ax, 0.873, 0.052, fore, 0]],
        [[ax - 0.008, 0.826, 0.066, fore, 0], [ax + 0.008, 0.826, 0.066, fore, 0], [ax, 0.818, 0.08, fore, 0]],
      ];
      loft(thumb, { part: PART.skin });
      tri(...thumb[1], { part: PART.skin }, [ax, 0.85, 0.05]);
      // A neon stripe down the sleeve.
      const stripe = ARM.slice(1).map(([y, cx, rx, , seg]) => [
        [sx * (cx + rx * widen(6) + 0.004), y, -0.007, seg, 0],
        [sx * (cx + rx * widen(6) + 0.004), y, 0.007, seg, 0],
      ]);
      loft(stripe, { part: PART.trim, tag: TAG.trim }, { open: true, ref: [sx * 0.1, 1.2, 0] });
    }
  }

  // ---- neck and head ----
  // The head's outline at a height: half the width of the face's plane and
  // how far forward it is, the side's half width and where it starts and
  // ends, the back's half width and how far back it is.
  const HEAD = [
    [1.522, 0.022, 0.07, 0.032, 0.046, 0.018, 0.02, 0.004],
    [1.553, 0.036, 0.089, 0.06, 0.046, -0.018, 0.04, -0.048],
    [1.59, 0.041, 0.095, 0.07, 0.046, -0.04, 0.05, -0.082],
    [1.626, 0.043, 0.096, 0.074, 0.043, -0.046, 0.052, -0.094],
    [1.66, 0.044, 0.085, 0.076, 0.04, -0.05, 0.054, -0.1],
    [1.686, 0.045, 0.099, 0.077, 0.042, -0.05, 0.054, -0.102],
    [1.726, 0.04, 0.087, 0.072, 0.036, -0.048, 0.05, -0.096],
    [1.752, 0.024, 0.046, 0.045, 0.02, -0.03, 0.03, -0.06],
  ];
  const centre = [0, 1.65, 0];
  if (far) {
    // Six points round: the face, a cheek, the back of the head. The face
    // and cheeks are skin; the rest is hair, a hood or a hat by the person.
    const ring = (y, a, zf, hw, zs, b, zb) => mirror([[a, y, zf], [hw, y, zs], [b, y, zb]], head);
    const rings = [ring(1.553, 0.036, 0.089, 0.06, 0.014, 0.04, -0.048), ring(1.67, 0.045, 0.093, 0.077, -0.005, 0.054, -0.101), ring(1.745, 0.028, 0.055, 0.052, -0.005, 0.035, -0.07)];
    const face = (r, i) => r === 0 && (i === 0 || i === 4 || i === 5);
    loft(rings, { part: PART.skin }, { skip: (r, i) => !face(r, i) });
    loft(rings, { part: PART.scalp }, { skip: face });
    cap(rings[2], [0, 1.764, -0.008, head, 0], { part: PART.scalp }, centre);
    cap(rings[0], [0, 1.465, 0, torso, 0], { part: PART.skin }, centre);
  } else {
    const neck = [ell(6, 1.45, 0, -0.006, 0.05, 0.054, torso), ell(6, 1.5, 0, -0.002, 0.048, 0.052, head), ell(6, 1.548, 0, 0.004, 0.046, 0.05, head)];
    loft(neck, { part: PART.skin, smooth: 6 });
    const rings = HEAD.map(([y, a, zf, hw, zsf, zsb, b, zb]) => mirror([[a, y, zf], [hw, y, zsf], [hw, y, zsb], [b, y, zb]], head));
    loft(rings, { part: PART.skin });
    cap(rings[0], [0, 1.519, 0.035, head, 0], { part: PART.skin }, centre);
    cap(rings[7], [0, 1.76, -0.008, head, 0], { part: PART.skin }, centre);
    // How far forward the face's plane is at a height.
    const front = (y) => {
      let i = 0;
      while (i < HEAD.length - 2 && HEAD[i + 1][0] < y) i++;
      const t = (y - HEAD[i][0]) / (HEAD[i + 1][0] - HEAD[i][0]);
      return HEAD[i][2] + (HEAD[i + 1][2] - HEAD[i][2]) * t + 0.002;
    };
    const onFace = (x, y) => [x, y, front(y), head, 0];
    // The nose: a wedge from between the brows to its tip.
    const bridge = [0, 1.684, 0.0985, head, 0];
    const tip = [0, 1.634, 0.1245, head, 0];
    const wing = (s) => [s * 0.0165, 1.624, 0.0965, head, 0];
    const nose = [0, 1.645, 0.085];
    tri(bridge, tip, wing(1), { part: PART.skin }, nose);
    tri(bridge, wing(-1), tip, { part: PART.skin }, nose);
    tri(tip, wing(-1), wing(1), { part: PART.skin }, nose);
    for (const s of [-1, 1]) {
      // An eye under the brow's plane, the brow over it, an ear.
      quad(onFace(s * 0.013, 1.662), onFace(s * 0.037, 1.663), onFace(s * 0.037, 1.676), onFace(s * 0.013, 1.675), { part: PART.eye }, centre);
      quad(onFace(s * 0.011, 1.688), onFace(s * 0.041, 1.687), onFace(s * 0.041, 1.695), onFace(s * 0.011, 1.697), { part: PART.brow }, centre);
      box([s * 0.081, 1.659, -0.014], [0.007, 0.029, 0.016], head, { part: PART.skin }, { skip: s > 0 ? "x-" : "x+" });
    }
    quad(onFace(-0.02, 1.5975), onFace(0.02, 1.5975), onFace(0.02, 1.6035), onFace(-0.02, 1.6035), { part: PART.mouth }, centre);
  }

  // ---- hair ----
  // The cap of it every haired head has (a hat's dome too): the hairline
  // across the forehead, round over the ears and down to the nape.
  const CAP = [
    [[0.043, 1.722, 0.0945], [0.0795, 1.695, 0.046], [0.083, 1.635, -0.052], [0.058, 1.588, -0.103]],
    [[0.045, 1.737, 0.094], [0.082, 1.718, 0.043], [0.0845, 1.69, -0.054], [0.059, 1.675, -0.1125]],
    [[0.037, 1.757, 0.072], [0.069, 1.754, 0.031], [0.071, 1.752, -0.05], [0.049, 1.746, -0.099]],
    [[0.021, 1.776, 0.036], [0.037, 1.777, 0.013], [0.037, 1.777, -0.035], [0.025, 1.773, -0.058]],
  ];
  if (!far) {
    const rings = CAP.map((half, r) => mirror(half, head, r === 0 ? 0.6 : 1));
    loft(rings, { part: PART.scalp, tag: TAG.hair });
    cap(rings[3], [0, 1.783, -0.012, head, 1], { part: PART.scalp, tag: TAG.hair }, centre);
  }
  // Long hair: down the back to the shoulder blades, and behind the ears.
  {
    const rows = far
      ? [[[0.06, 1.6, -0.104], [0, 1.6, -0.112]], [[0.076, 1.4, -0.13], [0, 1.39, -0.136]]]
      : [CAP[0].slice(1), [[0.086, 1.56, 0.02], [0.092, 1.53, -0.06], [0.066, 1.5, -0.118]], [[0.084, 1.475, 0.012], [0.096, 1.455, -0.062], [0.072, 1.385, -0.128]]];
    const strip = rows.map((half, r) => {
      const seg = r === rows.length - 1 ? torso : head;
      const aux = r / (rows.length - 1);
      const right = half.map(([x, y, z]) => [x, y, z, seg, aux]);
      const left = [...half].reverse().filter(([x]) => x > 0).map(([x, y, z]) => [-x, y, z, seg, aux]);
      return [...right, ...left];
    });
    loft(strip, { part: PART.hair, tag: TAG.long }, { open: true, ref: [0, 1.5, 0] });
    loft(strip, { part: PART.hair, tag: TAG.long, inside: true }, { open: true, ref: [0, 1.5, 0] });
  }
  // A mohawk: a fin from the forehead over the crown to the nape.
  {
    const line = far
      ? [[0.08, 1.74, 1.76], [0, 1.76, 1.84], [-0.09, 1.72, 1.79]]
      : [[0.088, 1.728, 1.744], [0.06, 1.745, 1.808], [0.02, 1.757, 1.826], [-0.03, 1.757, 1.846], [-0.07, 1.74, 1.808], [-0.098, 1.7, 1.77], [-0.104, 1.645, 1.682]];
    const o = { part: PART.hair, tag: TAG.mohawk };
    for (let i = 0; i < line.length - 1; i++) {
      const [z0, b0, t0] = line[i];
      const [z1, b1, t1] = line[i + 1];
      const ref = [0, (b0 + b1) / 2, (z0 + z1) / 2];
      for (const s of [-1, 1]) quad([s * 0.012, b0, z0, head, 0], [s * 0.012, b1, z1, head, 0], [s * 0.004, t1, z1, head, 0], [s * 0.004, t0, z0, head, 0], o, ref);
      if (!far) quad([-0.004, t0, z0, head, 0], [0.004, t0, z0, head, 0], [0.004, t1, z1, head, 0], [-0.004, t1, z1, head, 0], o, ref);
    }
  }
  // A bun at the back of the crown.
  {
    const c = [0, 1.768, -0.084];
    const r = [0.047, 0.042, 0.047];
    const o = { part: PART.hair, tag: TAG.bun };
    const P = (k, s) => [c[0] + (k === 0 ? s * r[0] : 0), c[1] + (k === 1 ? s * r[1] : 0), c[2] + (k === 2 ? s * r[2] : 0), head, 0];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) if (!far || sy > 0 || sz < 0) tri(P(0, sx), P(1, sy), P(2, sz), o, c);
  }
  // A cap's brim.
  {
    const o = { part: PART.brim, tag: TAG.brim };
    const top = [[-0.062, 1.727, 0.078, head, 0], [0.062, 1.727, 0.078, head, 0], [0.048, 1.716, 0.178, head, 0], [-0.048, 1.716, 0.178, head, 0]];
    const under = top.map(([x, y, z, s, a]) => [x, y - 0.008, z, s, a]);
    quad(...top, o, [0, 1.6, 0.12]);
    quad(...under, o, [0, 1.8, 0.12]);
    if (!far) quad(top[3], top[2], under[2], under[3], o, [0, 1.72, 0.1]);
  }
  // A hood: up from the collar, round the face, over the crown.
  if (!far) {
    const H = [
      [[0.052, 1.488, 0.078], [0.1, 1.472, 0.028], [0.102, 1.466, -0.06], [0.062, 1.46, -0.118]],
      [[0.088, 1.6, 0.07], [0.098, 1.6, 0.03], [0.1, 1.6, -0.062], [0.066, 1.59, -0.126]],
      [[0.07, 1.742, 0.108], [0.094, 1.705, 0.042], [0.096, 1.695, -0.062], [0.065, 1.68, -0.128]],
      [[0.04, 1.79, 0.072], [0.07, 1.785, 0.03], [0.072, 1.78, -0.056], [0.05, 1.77, -0.106]],
    ];
    const rings = H.map((half, r) => mirror(half, r === 0 ? torso : head));
    const o = { part: PART.hood, tag: TAG.hood };
    // The face's opening: no panel across the front below the brow.
    loft(rings, o, { skip: (r, i) => i === 7 && r < 2 });
    cap(rings[3], [0, 1.805, -0.016, head, 0], o, centre);
    // Its lining, where the opening shows it.
    loft(rings, { ...o, inside: true }, { skip: (r, i) => !(i === 0 || i === 6 || (i === 7 && r === 2)) });
  }

  // ---- a long coat's skirt, from the hem to the knee ----
  {
    const n = far ? 6 : 8;
    const rows = far ? [[0.93, 0.181, 0.121, 0], [0.53, 0.205, 0.15, 1]] : [[0.93, 0.181, 0.121, 0], [0.74, 0.192, 0.135, 0.5], [0.53, 0.205, 0.15, 1]];
    loft(rows.map(([y, rx, rz, aux]) => ell(n, y, 0, 0, rx, rz, pelvis, aux)), { part: PART.coat, tag: TAG.skirt, smooth: 7 });
  }
  // ---- a collar turned up, open at the throat ----
  if (!far) {
    const rings = [ell(8, 1.452, 0, -0.004, 0.078, 0.076, torso), ell(8, 1.522, 0, -0.002, 0.088, 0.09, torso)];
    const open = (r, i) => i === 1;
    loft(rings, { part: PART.hood, tag: TAG.collar }, { skip: open });
    loft(rings, { part: PART.hood, tag: TAG.collar, inside: true }, { skip: open });
  }

  // ---- bags ----
  // At the hip on a strap across the chest.
  box([-0.222, 0.88, 0.012], [0.045, 0.095, 0.13], pelvis, { part: PART.bag, tag: TAG.hipbag }, { skip: "x+" });
  if (!far) {
    const o = { part: PART.dark, tag: TAG.hipbag };
    for (const s of [1, -1]) {
      // Over the chest (s 1) and over the back (s -1), hip to shoulder.
      const path = [[0.985, 165], [1.1, 140], [1.25, 110], [1.38, 75]].map(([y, deg]) => [onTorso(y - 0.018, s * deg), onTorso(y + 0.018, s * deg)]);
      path.push([[0.115, 1.44, s * 0.03, torso, 0], [0.09, 1.458, s * 0.03, torso, 0]]);
      for (let i = 0; i < path.length - 1; i++) quad(path[i][0], path[i + 1][0], path[i + 1][1], path[i][1], o, [0, (path[i][0][1] + path[i + 1][0][1]) / 2, 0]);
    }
  }
  // On the back.
  box([0, 1.245, -0.168], [0.125, 0.175, 0.062], torso, { part: PART.bag, tag: TAG.backpack }, { skip: "z+", top: 0.82 });
  if (!far) {
    const o = { part: PART.dark, tag: TAG.backpack };
    for (const s of [-1, 1]) {
      const path = [[1.1, 52], [1.2, 48], [1.32, 46], [1.41, 44]].map(([y, off]) => [onTorso(y, 90 - s * (off - 3)), onTorso(y, 90 - s * (off + 3))]);
      path.push([[s * 0.1, 1.45, -0.02, torso, 0], [s * 0.122, 1.444, -0.02, torso, 0]]);
      for (let i = 0; i < path.length - 1; i++) quad(path[i][0], path[i + 1][0], path[i + 1][1], path[i][1], o, [0, (path[i][0][1] + path[i + 1][0][1]) / 2, 0]);
    }
  }
  // Carried, in the -x hand.
  box([-0.21, 0.59, 0.012], [0.05, 0.13, 0.13], fore, { part: PART.tote, tag: TAG.tote });
  if (!far) {
    const o = { part: PART.dark, tag: TAG.tote };
    for (const z of [-0.06, 0.085]) {
      const a = [-0.21, 0.72, z, fore, 0];
      const b = [-0.21, 0.72, z + 0.012, fore, 0];
      const c = [-0.21, 0.8, 0.02, fore, 0];
      tri(a, b, c, o, [0, 0.76, z]);
      tri(a, b, c, { ...o, inside: true }, [0, 0.76, z]);
    }
  }

  // ---- an umbrella over them, its rim lit ----
  {
    const [gx, gy, gz] = gripAt(HOLD.umbrella);
    const c = [gx - 0.04, 1.905, gz - 0.12];
    const n = far ? 6 : 8;
    const R = 0.54;
    const at = (y, aux = 0) => Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [c[0] + R * Math.cos(a), y, c[2] + R * Math.sin(a), torso, aux];
    });
    const apex = [c[0], 2.035, c[2], torso, 0];
    const edge = at(1.905);
    const o = { part: PART.canopy, tag: TAG.umbrella };
    cap(edge, apex, o, [c[0], 1.8, c[2]]);
    cap(edge, apex, { ...o, inside: true }, [c[0], 1.8, c[2]]);
    // The rim: a band the shader keeps a pixel and a half tall however far
    // off it is (its weight says which edge a vertex is).
    const rim = [at(1.905 - RIM_HALF, -1), at(1.905 + RIM_HALF, 1)];
    loft(rim, { part: PART.rim, tag: TAG.umbrella });
    loft(rim, { part: PART.rim, tag: TAG.umbrella, inside: true });
    const shaft = (y, x, z) => (far ? [[x - 0.009, y, z, torso, 0], [x + 0.009, y, z, torso, 0]] : ell(3, y, x, z, 0.007, 0.007, torso));
    const rod = [shaft(gy - 0.08, gx + 0.005, gz + 0.012), shaft(2.03, c[0], c[2])];
    loft(rod, { part: PART.dark, tag: TAG.umbrella }, { open: far });
    if (far) loft(rod, { part: PART.dark, tag: TAG.umbrella, inside: true }, { open: true });
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
    if (!far) loft([face(-0.006, 0.35), face(0.006, 0.35)], o);
  }
  // ---- a cigarette between the fingers, its tip lit ----
  {
    const [x, y, z] = EMBER_AT;
    if (far) {
      const t = [[x - 0.012, y - 0.012, z, fore, 0], [x + 0.012, y - 0.012, z, fore, 0], [x, y + 0.014, z, fore, 0]];
      tri(...t, { part: PART.ember, tag: TAG.smoke }, [x, y, z + 1]);
      tri(...t, { part: PART.ember, tag: TAG.smoke }, [x, y, z - 1]);
    } else {
      const ring = (zz, r) => ell(3, 0, 0, 0, r, r, fore).map(([a, , b, s]) => [x + a, y + b, zz, s, 0]);
      const stick = [ring(z + 0.085, 0.004), ring(z + 0.007, 0.004)];
      const ember = [ring(z + 0.007, 0.006), ring(z - 0.008, 0.006)];
      loft(stick, { part: PART.paper, tag: TAG.smoke });
      loft(ember, { part: PART.ember, tag: TAG.smoke });
      tri(...ember[1], { part: PART.ember, tag: TAG.smoke }, [x, y, z]);
      tri(...ember[0], { part: PART.ember, tag: TAG.smoke }, [x, y, z]);
    }
  }

  return finish(tris);
}
