// src/world/skyline.js: the city past the kit, and the sky over it.
//
// Everything the Blender kit does not model is here: a few thousand
// buildings on a jittered grid out to about a mile and a half, lit by the
// same window shader as the kit's own facades (their window cells are worked
// out from world position in the vertex shader, and each building's lit
// fraction, style and warmth from a hash of where it stands). The grid
// leaves the kit's footprint alone: the avenue and its canyon, the plaza,
// corpo row, the rooftop and the garage, and keeps low to the south-east,
// where the Contact shot's moon rises.
//
// A building is not a box. Each is built in the vertex shader from one
// shared mesh and a handful of numbers of its own: up to four stacked tiers
// (a podium, a shaft, its setbacks, a crown or a spire), each on a square
// plan or, for a tower, one with its corners cut back, a parapet round
// whatever roof is on top, and a cap on every setback for a terrace. The
// low blocks wear the avenue's painted elevations; the towers are one of a
// few kinds a night city is made of (stepped back twice, a slab with its
// plant on top, a ziggurat, a dark glass crown with lit edges, a podium and
// a spire), some lit at their setbacks, a few carrying a screen the height
// of a dozen floors. Every placement, footprint and height cap is what it
// was when these were boxes, so the hero's band of sky and Contact's moon
// keep the clearances they were framed with; a spire or a mast only stands
// where nothing was capped. Two draws for the buildings (blocks and towers),
// four for what stands on the roofs (a kit per kind of roof: tanks and a
// stair hut, plant and cooling towers, a telecom mast, a neon sign), one for
// the aviation lamps.
//
// The sky is a dome: near-black overhead, and near the horizon the lit
// city's glow hanging in wet air, violet and pink rather than blue, because
// the light is the city's and not the moon's, brightest toward downtown.
// The kit's landmark towers (anchor_mega_*) are kept clear of, like the kit.
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON, WINDOWS } from "./glsl.js";

// Rectangles (x0, z0, x1, z1) the far city stays out of.
const KEEP_OUT = [
  [-60, -740, 60, 80], // the avenue, its canyon and the intersection
  [0, -420, 300, -130], // the plaza, and corpo row's west end
  // Corpo row's east end, the rooftop and the garage: the kit stops at the
  // rooftop's east wall (484) and the garage block's north face (-176), so
  // the city comes up to Contact's lens.
  [300, -420, 490, -176],
  [-70, 20, 70, 140], // behind the hero camera
];
// Where the moon rises for the Contact shot: lit roofs stay low there, and
// right by the garage they are not there at all. A few towers stand under
// it, their tops just clear of its lower edge from the garage's roof, so
// the moon rises out of a skyline rather than an empty sky: x, z, width,
// height.
const LOW = [420, -200, 1400, 1300];
const CLEAR = [440, -200, 560, -150];
// Contact's lens, on the garage's roof: roofs near it stay low, stepping up
// with distance, so the blocks it looks over fill the bottom of a phone's
// tall frame without standing in front of the moon.
const CONTACT_LENS = [456, -203];
const UNDER_THE_MOON = [
  [572, 40, 26, 78],
  [612, 96, 30, 94],
  [546, 118, 22, 70],
  [650, 30, 24, 64],
  [520, 60, 20, 58],
];
// Aviation lights on anything this tall, blinking red in three groups.
const BEACON_OVER = 92;
// The cloud deck's height, over the tallest roofs.
const CLOUD_H = 520;
// Under this a building is a block (painted, one or two tiers, square);
// over it, a tower.
const TOWER_FROM = 60;
// What stands on a roof, by kind (see roofKits).
const KIT = { home: 0, plant: 1, mast: 2, sign: 3 };
// The rooftop signs' neon, the kit's own colours.
const SIGN_NEON = ["#ff2e88", "#27dcf2", "#ffb254", "#a24bff", "#39ff9a", "#ff3fd2", "#2f6bff", "#fcee0a"];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * One building as the vertex shader shapes it: `slots` stacked prisms on a
 * square plan (`sides` 4) or an octagon (8: a square whose corners the shader
 * cuts back by each tower's own chamfer), each a wall and a cap, the last
 * one also a parapet's inner face and its coping. A building's tiers fill
 * the slots from the top down, so its top tier is always the last slot and
 * only that one needs a parapet; the shader sizes every tier from the
 * building's numbers and folds away the slots it does not use. Positions
 * are a unit plan (x, z in -0.5..0.5) and a unit height.
 *
 *   aDir   which way a corner moves when the plan's corners are cut
 *   aPart  slot counted back from the top (-slots..-1), part (0 wall, 1 the
 *          parapet's inner face, 2 its coping, 3 the cap), ring (1: the
 *          parapet's inner line), and u across the face (0..1), for what is
 *          drawn on a face
 */
function buildingGeometry(slots, sides) {
  const plan = sides === 4
    ? [[0.5, -0.5, 0, 0], [0.5, 0.5, 0, 0], [-0.5, 0.5, 0, 0], [-0.5, -0.5, 0, 0]]
    : [[0.5, -0.5, 0, 1], [0.5, 0.5, 0, -1], [0.5, 0.5, -1, 0], [-0.5, 0.5, 1, 0],
      [-0.5, 0.5, 0, -1], [-0.5, -0.5, 0, 1], [-0.5, -0.5, 1, 0], [0.5, -0.5, -1, 0]];
  // A representative cut and parapet, only to work out which way each face
  // points and which way round its triangles go.
  const at = (v, ring) => {
    const k = ring ? 0.9 : 1;
    return [(v[0] + v[2] * 0.15) * k, (v[1] + v[3] * 0.15) * k];
  };
  const pos = [];
  const dir = [];
  const part = [];
  const nrm = [];
  const index = [];
  let count = 0;
  const vert = (v, y, tier, kind, ring, u, n) => {
    pos.push(v[0], y, v[1]);
    dir.push(v[2], v[3]);
    part.push(tier, kind, ring, u);
    nrm.push(n[0], n[1], n[2]);
    return count++;
  };
  // Whether three representative points, in order, face `n`.
  const facing = (r, n) => {
    const e1 = [r[1][0] - r[0][0], r[1][1] - r[0][1], r[1][2] - r[0][2]];
    const e2 = [r[2][0] - r[0][0], r[2][1] - r[0][1], r[2][2] - r[0][2]];
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    return c[0] * n[0] + c[1] * n[1] + c[2] * n[2] >= 0;
  };
  // Two triangles over four vertices, wound so they face `n` (the
  // representative points `r` decide it).
  const quad = (ids, r, n) => {
    const [a, b, c, d] = ids;
    if (facing(r, n)) index.push(a, b, c, a, c, d);
    else index.push(a, c, b, a, d, c);
  };
  for (let slot = 0; slot < slots; slot++) {
    const t = slot - slots;
    const top = slot === slots - 1;
    for (let i = 0; i < plan.length; i++) {
      const a = plan[i];
      const b = plan[(i + 1) % plan.length];
      const [ax, az] = at(a, 0);
      const [bx, bz] = at(b, 0);
      let nx = bz - az;
      let nz = -(bx - ax);
      if (nx * (ax + bx) + nz * (az + bz) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const l = Math.hypot(nx, nz);
      const out = [nx / l, 0, nz / l];
      const inward = [-out[0], 0, -out[2]];
      // The wall, up to the parapet's top.
      quad([vert(a, 0, t, 0, 0, 0, out), vert(b, 0, t, 0, 0, 1, out), vert(b, 1, t, 0, 0, 1, out), vert(a, 1, t, 0, 0, 0, out)],
        [[ax, 0, az], [bx, 0, bz], [bx, 1, bz], [ax, 1, az]], out);
      if (!top) continue;
      // The parapet's inner face, from the roof up, facing the roof.
      const [aix, aiz] = at(a, 1);
      const [bix, biz] = at(b, 1);
      quad([vert(a, 0, t, 1, 1, 0, inward), vert(b, 0, t, 1, 1, 1, inward), vert(b, 1, t, 1, 1, 1, inward), vert(a, 1, t, 1, 1, 0, inward)],
        [[aix, 0, aiz], [bix, 0, biz], [bix, 1, biz], [aix, 1, aiz]], inward);
      // Its coping, between the two.
      const up = [0, 1, 0];
      quad([vert(a, 1, t, 2, 0, 0, up), vert(b, 1, t, 2, 0, 1, up), vert(b, 1, t, 2, 1, 1, up), vert(a, 1, t, 2, 1, 0, up)],
        [[ax, 1, az], [bx, 1, bz], [bix, 1, biz], [aix, 1, aiz]], up);
    }
    // The cap: a fan over the roof inside the parapet.
    const first = count;
    plan.forEach((v) => vert(v, 0, t, 3, 1, 0, [0, 1, 0]));
    for (let i = 1; i < plan.length - 1; i++) {
      const r = [at(plan[0], 1), at(plan[i], 1), at(plan[i + 1], 1)].map(([x, z]) => [x, 0, z]);
      if (facing(r, [0, 1, 0])) index.push(first, first + i, first + i + 1);
      else index.push(first, first + i + 1, first + i);
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("aDir", new THREE.Float32BufferAttribute(dir, 2));
  g.setAttribute("aPart", new THREE.Float32BufferAttribute(part, 4));
  g.setIndex(index);
  return g;
}

/**
 * What a building is: its tiers' heights and footprints, its plan's cut,
 * its kind, its parapet, and the screen it carries, if any. `f` is its own
 * random stream (the placement's is untouched, so every building stands
 * where its box stood, as tall).
 */
function formOf(b, f) {
  const tiers = [0, 0, 0, 0];
  const inset = [1, 1, 1, 1];
  // Where each upper tier stands on the one under it, as a fraction of the
  // building's footprint: (tier 1 x, z, tiers 2 and 3 x, z).
  const offset = [0, 0, 0, 0];
  let chamfer = 0;
  // 0 plain, 1 a lit band under the roof, 2 a spire, 3 a lit glass crown,
  // 4 lit setbacks.
  let style = 0;
  let parapet = 0.85 + f() * 0.5;
  let screen = 0;
  const h = b.h;
  if (b.hero) {
    // Contact's own towers: a podium and a shaft, square, so their corner
    // blades stay on their corners.
    tiers[0] = Math.min(14, h * 0.22);
    tiers[1] = h - tiers[0];
    inset[1] = 0.86;
    return { tiers, inset, offset, chamfer, style: 1, parapet: 0.9, screen, roof: h, spire: 0 };
  }
  if (h < TOWER_FROM) {
    // A block: one mass, or a podium with its upper floors set back.
    if (h > 16 && f() < 0.42) {
      tiers[0] = h * (0.55 + f() * 0.25);
      tiers[1] = h - tiers[0];
      inset[1] = 0.58 + f() * 0.26;
      // Most set back to one side or a corner, not round the middle.
      if (f() < 0.7) {
        const room = (1 - inset[1]) / 2;
        offset[0] = (f() < 0.5 ? -1 : 1) * room * (0.6 + 0.4 * f());
        offset[1] = (f() < 0.5 ? -1 : 1) * room * f();
      }
    } else tiers[0] = h;
    return { tiers, inset, offset, chamfer, style, parapet, screen, roof: h, spire: 0 };
  }
  chamfer = f() < 0.5 ? 0.05 + f() * 0.15 : 0;
  const kind = f();
  let spire = 0;
  if (kind < 0.32) {
    // Stepped back twice over a podium.
    tiers[0] = h * (0.1 + f() * 0.16);
    tiers[1] = h * (0.38 + f() * 0.2);
    tiers[2] = h - tiers[0] - tiers[1];
    inset[1] = 0.78 + f() * 0.14;
    inset[2] = inset[1] * (0.7 + f() * 0.16);
    style = f() < 0.5 ? 4 : 1;
  } else if (kind < 0.5) {
    // A slab: straight up, its plant floor set back on top.
    tiers[0] = h - 5;
    tiers[1] = 5;
    inset[1] = 0.72;
    parapet = 0.4;
  } else if (kind < 0.66) {
    // A ziggurat: four steps up to a small top.
    tiers[0] = h * (0.42 + f() * 0.1);
    tiers[1] = h * (0.24 + f() * 0.06);
    tiers[2] = h * (0.16 + f() * 0.04);
    tiers[3] = h - tiers[0] - tiers[1] - tiers[2];
    inset[1] = 0.82;
    inset[2] = 0.64;
    inset[3] = 0.46;
    style = 4;
  } else if (kind < 0.84) {
    // A crown: a podium, a shaft, and a dark glass crown with lit edges.
    tiers[0] = h * (0.12 + f() * 0.12);
    tiers[2] = Math.min(18, 8 + h * 0.06);
    tiers[1] = h - tiers[0] - tiers[2];
    inset[1] = 0.84 + f() * 0.1;
    inset[2] = inset[1] * (0.86 + f() * 0.08);
    style = 3;
    parapet = 0;
  } else {
    // A podium and a tower, and where nothing has capped it, a spire.
    tiers[0] = h * (0.14 + f() * 0.12);
    tiers[1] = h - tiers[0];
    inset[1] = 0.7 + f() * 0.18;
    if (b.free && h > 90) {
      spire = h * (0.18 + f() * 0.16);
      tiers[2] = spire;
      inset[2] = 0.06;
      chamfer = 0.35;
      style = 2;
      parapet = 0;
    } else style = 1;
  }
  // A screen the height of a dozen floors on the odd tall one.
  if (h > 110 && f() < 0.18) screen = 1 + Math.floor(f() * 4);
  // A third of the towers carry their upper floors off centre.
  if (style !== 2 && f() < 0.34) {
    const room1 = (1 - inset[1]) / 2;
    offset[0] = (f() - 0.5) * 2 * room1 * 0.8;
    offset[1] = (f() - 0.5) * 2 * room1 * 0.8;
    const room2 = Math.max(0, (inset[1] - inset[2]) / 2);
    offset[2] = offset[0] + (f() - 0.5) * 2 * room2 * 0.6;
    offset[3] = offset[1] + (f() - 0.5) * 2 * room2 * 0.6;
  }
  return { tiers, inset, offset, chamfer, style, parapet, screen, roof: h, spire };
}

/**
 * What stands on the roofs, one kit per kind of roof, made for a 20 m roof
 * and scaled to each: a home's (a stair hut with its door lit, a water tank
 * on its stand, air conditioners, a skylight), plant (a plant room, two
 * cooling towers, a duct, red lamps on its corners), a mast (a lattice tower
 * with its dishes and a lamp at the top, a hut at its foot) and a sign (a
 * neon board on two posts, its words drawn as light). Each vertex says what
 * it is: plant, a warm doorway, the sign's face, a red lamp, a skylight.
 */
function roofKits() {
  const make = () => ({ pos: [], nrm: [], glow: [], uv: [] });
  const face = (k, pts, n, glow, uvs = [[0, 0], [1, 0], [1, 1], [0, 1]]) => {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      k.pos.push(...pts[i]);
      k.nrm.push(...n);
      k.glow.push(glow);
      k.uv.push(...uvs[i]);
    }
  };
  // A box, no floor: centre, size, what it is.
  const box = (k, cx, cy, cz, sx, sy, sz, glow = 0) => {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    face(k, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], glow);
    face(k, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], glow);
    face(k, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], glow);
    face(k, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], glow);
    face(k, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], glow);
  };
  // A cylinder (a cone if r1 differs), open at its foot.
  const cyl = (k, cx, y0, cz, r0, r1, h, segs, glow = 0, cap = true) => {
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const b = ((i + 1) / segs) * Math.PI * 2;
      const [ca, sa, cb, sb] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)];
      const m = (a + b) / 2;
      const slope = (r0 - r1) / h;
      const n = [Math.cos(m), slope, Math.sin(m)];
      const l = Math.hypot(...n);
      face(k, [[cx + cb * r0, y0, cz + sb * r0], [cx + ca * r0, y0, cz + sa * r0], [cx + ca * r1, y0 + h, cz + sa * r1], [cx + cb * r1, y0 + h, cz + sb * r1]], n.map((v) => v / l), glow);
      if (cap && r1 > 0.01) {
        for (const p of [[cx, y0 + h, cz], [cx + ca * r1, y0 + h, cz + sa * r1], [cx + cb * r1, y0 + h, cz + sb * r1]]) {
          k.pos.push(...p);
          k.nrm.push(0, 1, 0);
          k.glow.push(glow);
          k.uv.push(0, 0);
        }
      }
    }
  };
  // A thin square strut from a to b.
  const strut = (k, a, b, t, glow = 0) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d);
    const w = d.map((v) => v / len);
    const ref = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
    let u = cross(w, ref);
    const ul = Math.hypot(...u);
    u = u.map((v) => (v / ul) * t);
    const v = cross(w, u).map((x) => x);
    const at = (p, su, sv) => [p[0] + u[0] * su + v[0] * sv, p[1] + u[1] * su + v[1] * sv, p[2] + u[2] * su + v[2] * sv];
    for (const [su0, sv0, su1, sv1] of [[1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1]]) {
      const n = [u[0] * (su0 + su1) + v[0] * (sv0 + sv1), u[1] * (su0 + su1) + v[1] * (sv0 + sv1), u[2] * (su0 + su1) + v[2] * (sv0 + sv1)];
      const nl = Math.hypot(...n) || 1;
      face(k, [at(a, su0, sv0), at(a, su1, sv1), at(b, su1, sv1), at(b, su0, sv0)], n.map((x) => x / nl), glow);
    }
  };

  const home = make();
  box(home, -4.5, 1.5, 3.5, 4.2, 3.0, 3.4);
  face(home, [[-2.39, 0.0, 4.0], [-2.39, 0.0, 3.0], [-2.39, 2.1, 3.0], [-2.39, 2.1, 4.0]], [1, 0, 0], 1);
  box(home, -4.5, 3.06, 3.5, 4.5, 0.12, 3.7);
  for (const [lx, lz] of [[-1.05, -1.05], [1.05, -1.05], [1.05, 1.05], [-1.05, 1.05]]) box(home, 4.5 + lx, 1.25, -4 + lz, 0.18, 2.5, 0.18);
  cyl(home, 4.5, 2.5, -4, 1.55, 1.55, 2.6, 7, 0, false);
  cyl(home, 4.5, 5.1, -4, 1.62, 0.0, 0.75, 7);
  for (const [ax, az] of [[1.4, 6.0], [3.5, 6.0], [-6.4, -5.6]]) box(home, ax, 0.55, az, 1.7, 1.1, 1.1);
  box(home, 1.0, 0.3, -1.5, 3.0, 0.6, 2.0);
  face(home, [[-0.4, 0.61, -0.6], [2.4, 0.61, -0.6], [2.4, 0.61, -2.4], [-0.4, 0.61, -2.4]], [0, 1, 0], 4);

  const plant = make();
  box(plant, -2.5, 1.9, 0, 9.0, 3.8, 6.0);
  box(plant, -2.5, 3.9, 0, 9.4, 0.2, 6.4);
  for (const cz of [-4.0, 1.6]) cyl(plant, 5.5, 0, cz, 1.7, 1.45, 2.4, 8);
  box(plant, -7.8, 0.75, 0, 0.9, 0.9, 9.0);
  box(plant, -7.8, 2.1, 3.9, 0.9, 1.9, 0.9);
  for (const [lx, lz] of [[-6.9, -2.9], [1.9, -2.9], [1.9, 2.9], [-6.9, 2.9]]) box(plant, lx, 4.15, lz, 0.32, 0.32, 0.32, 3);

  const mast = make();
  box(mast, -5.0, 1.3, -5.0, 3.2, 2.6, 3.2);
  face(mast, [[-3.39, 0, -4.4], [-3.39, 0, -5.4], [-3.39, 2.0, -5.4], [-3.39, 2.0, -4.4]], [1, 0, 0], 1);
  const legs = [[1.3, 1.3], [-1.3, 1.3], [-1.3, -1.3], [1.3, -1.3]];
  const top = 18;
  const leg = (s, y) => [2 + s[0] * (1 - (y / top) * 0.72), y, 2 + s[1] * (1 - (y / top) * 0.72)];
  for (const s of legs) strut(mast, leg(s, 0), leg(s, top), 0.07);
  for (const y of [4.5, 9, 13.5]) {
    for (let i = 0; i < 4; i++) strut(mast, leg(legs[i], y), leg(legs[(i + 1) % 4], y), 0.05);
  }
  strut(mast, [2, top, 2], [2, top + 4, 2], 0.05);
  for (const [y, dx, dz] of [[8, 1, 0], [11, 0, 1], [13.5, -1, 0]]) {
    const c = [2 + dx * 0.9, y, 2 + dz * 0.9];
    // A dish: a shallow cone opening outward, seen side on as a disc.
    const n = [dx, 0, dz];
    const segs = 10;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const b = ((i + 1) / segs) * Math.PI * 2;
      const rim = (t) => [c[0] + n[0] * 0.35 + (dz ? Math.cos(t) * 0.85 : 0), y + Math.sin(t) * 0.85, c[2] + n[2] * 0.35 + (dx ? Math.cos(t) * 0.85 : 0)];
      for (const p of [c, rim(a), rim(b)]) {
        mast.pos.push(...p);
        mast.nrm.push(n[0], 0, n[2]);
        mast.glow.push(0);
        mast.uv.push(0, 0);
      }
      for (const p of [c, rim(b), rim(a)]) {
        mast.pos.push(...p);
        mast.nrm.push(-n[0], 0, -n[2]);
        mast.glow.push(0);
        mast.uv.push(0, 0);
      }
    }
  }
  box(mast, 2, top + 4.2, 2, 0.34, 0.34, 0.34, 3);
  box(mast, 2 + 0.75, 9.2, 2, 0.26, 0.26, 0.26, 3);

  const sign = make();
  for (const px of [-4.6, 4.6]) box(sign, px, 2.6, 0, 0.3, 5.2, 0.3);
  box(sign, 0, 5.6, 0, 11.0, 4.3, 0.34);
  face(sign, [[-5.2, 3.75, 0.18], [5.2, 3.75, 0.18], [5.2, 7.45, 0.18], [-5.2, 7.45, 0.18]], [0, 0, 1], 2);
  face(sign, [[5.2, 3.75, -0.18], [-5.2, 3.75, -0.18], [-5.2, 7.45, -0.18], [5.2, 7.45, -0.18]], [0, 0, -1], 2);
  for (const [ax, az] of [[-6.0, 4.5], [6.2, -4.0]]) box(sign, ax, 0.55, az, 1.7, 1.1, 1.1);

  return [home, plant, mast, sign].map((k) => {
    // Indexed: a face's corners shared, a third fewer vertices to shade.
    const flat = new THREE.BufferGeometry();
    flat.setAttribute("position", new THREE.Float32BufferAttribute(k.pos, 3));
    flat.setAttribute("normal", new THREE.Float32BufferAttribute(k.nrm, 3));
    flat.setAttribute("aGlow", new THREE.Float32BufferAttribute(k.glow, 1));
    flat.setAttribute("aSignUv", new THREE.Float32BufferAttribute(k.uv, 2));
    const merged = mergeVertices(flat);
    flat.dispose();
    const g = new THREE.InstancedBufferGeometry();
    for (const [name, attr] of Object.entries(merged.attributes)) g.setAttribute(name, attr);
    g.setIndex(merged.index);
    return g;
  });
}

/**
 * Instances culled on the CPU: the whole set is kept here, and only what the
 * camera's frustum can see is packed into the buffers the GPU reads, so the
 * vertex shader runs for the city in front of the lens and not the whole of
 * it. `spheres` is x, y, z, radius per instance. Repacked only when the
 * visible set changes, which while a shot holds is never.
 */
function cullable(geometry, names, spheres) {
  const n = spheres.length / 4;
  const all = Object.fromEntries(names.map((name) => [name, geometry.attributes[name].array.slice()]));
  const order = new Int32Array(n).fill(-1);
  let shown = -1;
  const sphere = new THREE.Sphere();
  return {
    update(frustum) {
      let k = 0;
      let changed = false;
      for (let i = 0; i < n; i++) {
        sphere.center.set(spheres[i * 4], spheres[i * 4 + 1], spheres[i * 4 + 2]);
        sphere.radius = spheres[i * 4 + 3];
        if (!frustum.intersectsSphere(sphere)) continue;
        if (order[k] !== i) {
          order[k] = i;
          changed = true;
        }
        k++;
      }
      if (!changed && k === shown) return;
      shown = k;
      for (const name of names) {
        const attr = geometry.attributes[name];
        const size = attr.itemSize;
        const src = all[name];
        const dst = attr.array;
        for (let j = 0; j < k; j++) {
          const i = order[j];
          for (let c = 0; c < size; c++) dst[j * size + c] = src[i * size + c];
        }
        attr.clearUpdateRanges();
        attr.addUpdateRange(0, k * size);
        attr.needsUpdate = true;
      }
      geometry.instanceCount = k;
    },
  };
}

/** The highest tier a building has. */
const topTier = (s) => (s.tiers[3] > 0.01 ? 3 : s.tiers[2] > 0.01 ? 2 : s.tiers[1] > 0.01 ? 1 : 0);

/** Where the middle of a building's top tier is, in the world (an upper
 *  tier set off centre takes its roof with it). */
function topCentre(b, s) {
  const t = topTier(s);
  const ox = (t === 0 ? 0 : t === 1 ? s.offset[0] : s.offset[2]) * b.w;
  const oz = (t === 0 ? 0 : t === 1 ? s.offset[1] : s.offset[3]) * b.d;
  return [b.x + Math.cos(b.yaw) * ox + Math.sin(b.yaw) * oz, b.z - Math.sin(b.yaw) * ox + Math.cos(b.yaw) * oz];
}

export function createSkyline(scene, shared, { count = 2600, keepOut = [], reduced = false, facades = [] } = {}) {
  const r = rng(90210);
  // Where each building stands, its footprint, its height, which way it
  // turns, and whether anything capped its height (a spire or a mast only
  // goes where nothing did). The draws from `r` are the boxes' own, in the
  // same order, so the city is laid out exactly as it was.
  const lots = [];
  const cell = 46;
  for (let gx = -900; gx < 1500; gx += cell) {
    for (let gz = -1700; gz < 900; gz += cell) {
      const x = gx + (r() - 0.5) * cell * 0.5;
      const z = gz + (r() - 0.5) * cell * 0.5;
      if ([...KEEP_OUT, ...keepOut].some(([x0, z0, x1, z1]) => x > x0 - 20 && x < x1 + 20 && z > z0 - 20 && z < z1 + 20)) continue;
      if (x > CLEAR[0] && x < CLEAR[2] && z > CLEAR[1] && z < CLEAR[3]) continue;
      const d = Math.hypot(x - 200, z + 300);
      if (r() < 0.12) continue;
      const w = 16 + r() * 22;
      const dd = 16 + r() * 22;
      let h = 24 + Math.pow(r(), 2.2) * 150 + Math.min(80, d * 0.05);
      if (r() < 0.05) h += 90 + r() * 110;
      let free = true;
      let cone = false;
      const [lx0, lz0, lx1, lz1] = LOW;
      if (x > lx0 && x < lx1 && z > lz0 && z < lz1) {
        h = Math.min(h, 22 + r() * 30);
        free = false;
      }
      const near = Math.hypot(x - CONTACT_LENS[0], z - CONTACT_LENS[1]);
      // The nearest roofs sit just under the lens (10.4 m up), so Contact
      // skims across a roofscape to the lit blocks and the moon.
      if (near < 170) {
        h = Math.min(h, 4 + near * 0.11);
        free = false;
      }
      // Up the avenue the far city keeps under the hero's band of sky: seen
      // from its lens (0.6, 0.6, 10), nothing in its view stands taller than
      // about a sixth of its distance, so the roofs step down into the glow
      // and the kit's landmark towers have the sky to themselves.
      const ahead = 10 - z;
      if (ahead > 0 && Math.abs(x - 0.6) < ahead * 0.9) {
        h = Math.min(h, 10 + ahead * (0.13 + 0.08 * r()));
        free = false;
        cone = true;
      }
      lots.push({ x, z, w, d: dd, h, yaw: (r() - 0.5) * 0.3, free, cone, hero: false });
    }
  }
  // More candidates than the tier draws (a phone's 1,200): keep the nearest
  // to the middle of the kit, so a phone thins the city's far edge rather
  // than losing a whole side of it.
  if (lots.length > count) {
    const dist = (b) => Math.hypot(b.x - 250, b.z + 300);
    lots.sort((a, b) => dist(a) - dist(b));
    lots.length = count;
  }
  for (const [x, z, w, h] of UNDER_THE_MOON) lots.push({ x, z, w, d: w * 0.9, h, yaw: (r() - 0.5) * 0.3, free: false, cone: false, hero: true });

  // A wide block is two buildings, not one: split along its length into a
  // pair on their own plots, a step apart in height (neither taller than
  // the block was, so every clearance holds), so a district has the
  // narrow, uneven frontage of a real one rather than a row of cubes.
  const fs = rng(2077);
  for (let i = lots.length - 1; i >= 0; i--) {
    const b = lots[i];
    if (b.hero || b.h >= TOWER_FROM || Math.max(b.w, b.d) < 24 || fs() < 0.3) continue;
    const alongX = b.w >= b.d;
    const len = alongX ? b.w : b.d;
    const a = 0.38 + fs() * 0.24;
    const la = len * a - 0.4;
    const lb = len * (1 - a) - 0.4;
    const shift = (s) => {
      const ox = alongX ? s : 0;
      const oz = alongX ? 0 : s;
      return [b.x + Math.cos(b.yaw) * ox + Math.sin(b.yaw) * oz, b.z - Math.sin(b.yaw) * ox + Math.cos(b.yaw) * oz];
    };
    const [xa, za] = shift(-len / 2 + la / 2 + 0.2);
    const [xb, zb] = shift(len / 2 - lb / 2 - 0.2);
    const tall = fs() < 0.5;
    const ha = tall ? b.h : b.h * (0.55 + fs() * 0.4);
    const hb = tall ? b.h * (0.55 + fs() * 0.4) : b.h;
    lots.splice(i, 1,
      { ...b, x: xa, z: za, w: alongX ? la : b.w, d: alongX ? b.d : la, h: Math.max(8, ha) },
      { ...b, x: xb, z: zb, w: alongX ? lb : b.w, d: alongX ? b.d : lb, h: Math.max(8, hb) });
  }

  const f = rng(31337);
  const forms = lots.map((b) => formOf(b, f));

  // ---- the buildings: blocks on a square plan, towers on a cut one ----------
  const painted = facades.filter(Boolean).length === 3;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uFacade0: { value: painted ? facades[0] : null },
      uFacade1: { value: painted ? facades[1] : null },
      uFacade2: { value: painted ? facades[2] : null },
      uMotion: { value: reduced ? 0 : 1 },
    },
    defines: painted ? { PAINTED: "" } : {},
    vertexShader: /* glsl */ `
      attribute vec2 aDir;
      attribute vec4 aPart;
      attribute vec4 aBase;
      attribute vec4 aSize;
      attribute vec4 aTier;
      attribute vec4 aInset;
      attribute vec4 aForm;
      attribute vec4 aOffset;
      attribute vec4 aLook;
      attribute vec4 aPaint;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vCells;
      varying vec3 vParams;
      varying float vRoof;
      varying vec2 vCrown;
      varying vec4 vHero;
      varying vec3 vPaint;
      varying vec4 vTier;
      varying vec4 vForm;
      float pick(vec4 v, float i) { return i < 0.5 ? v.x : i < 1.5 ? v.y : i < 2.5 ? v.z : v.w; }
      void main() {
        float kind = aPart.y;
        float topTier = aTier.w > 0.01 ? 3.0 : aTier.z > 0.01 ? 2.0 : aTier.y > 0.01 ? 1.0 : 0.0;
        // The slots fill from the top down: this one is that tier.
        float ti = aPart.x + topTier + 1.0;
        float h = ti < -0.5 ? 0.0 : pick(aTier, ti);
        float base = (ti > 0.5 ? aTier.x : 0.0) + (ti > 1.5 ? aTier.y : 0.0) + (ti > 2.5 ? aTier.z : 0.0);
        float isTop = step(abs(ti - topTier), 0.1);
        float p = aSize.w * isTop;
        vec2 foot = aSize.xy * pick(aInset, ti);
        vec2 q = position.xz + aDir * aForm.x;
        // The parapet's inner line, 0.35 m in from the face, and the roof
        // inside it.
        if (aPart.z > 0.5 && p > 0.01) q *= 1.0 - 0.7 / foot;
        float y = base + (kind < 0.5 ? position.y * (h + p) : kind < 1.5 ? h + position.y * p : kind < 2.5 ? h + p : h);
        // Fold away what this building does not have: a missing tier, and
        // the parapets of every tier under its top.
        if (h < 0.01 || (kind > 0.5 && kind < 2.5 && p < 0.01)) {
          q = vec2(0.0);
          y = base;
        }
        vec2 l = q * foot + (ti < 0.5 ? vec2(0.0) : ti < 1.5 ? aOffset.xy : aOffset.zw) * aSize.xy;
        float cs = aBase.z;
        float sn = aBase.w;
        vec3 w = vec3(aBase.x + cs * l.x + sn * l.y, y, aBase.y - sn * l.x + cs * l.y);
        vWorld = w;
        vec3 nl = normalize(vec3(normal.x / foot.x, normal.y, normal.z / foot.y));
        vec3 n = vec3(cs * nl.x + sn * nl.z, nl.y, -sn * nl.x + cs * nl.z);
        vNormalW = n;
        // Coping, the parapet's inside and the roofs: roof, not windows.
        vRoof = max(step(0.5, n.y), step(0.5, kind));
        // Window cells from world position, along whichever way the face runs.
        float along = dot(w.xz, vec2(n.z, -n.x));
        vCells = vec2(along / 3.2, (w.y - 4.6) / 3.4);
        float seed = fract(aForm.w) * 100.0;
        vParams = aLook.xyz;
        vCells += vec2(aLook.w, 0.0);
        // The roof's height (under any spire), and which towers light a band
        // under it.
        vCrown = vec2(aSize.z, aPaint.w);
        // What kind of building (0 a tower, 1 one of Contact's dressed
        // towers, 2 a block), where this is across its face, the face's
        // width in metres and which face it is (for what is hung on it).
        float faceW = abs(normal.x) > 0.5 ? foot.y : foot.x;
        float faceId = normal.x > 0.5 ? 0.0 : normal.z > 0.5 ? 1.0 : normal.x < -0.5 ? 2.0 : 3.0;
        // Contact's towers keep the blade where the boxes had it: up the
        // corner their plan's x and z start from.
        float across = abs(normal.x) > 0.5 ? position.z + 0.5 : position.x + 0.5;
        vHero = vec4(aForm.z, abs(aForm.z - 1.0) < 0.1 ? across : aPart.w, faceW, faceId + ti * 4.0);
        // Painted: which of the three elevations (-1 for windows), and where
        // on it, a tile 16 m wide and 24 m tall, each block from its own
        // place in the picture.
        vPaint = vec3((along + aPaint.x) / 16.0, (w.y - 4.6) / 24.0 + aPaint.y, aPaint.z);
        // This tier: its roof's height, its foot, whether it is the top, and
        // where across the face this is.
        vTier = vec4(base + h, base, isTop, aPart.w);
        // The building's kind, its screen, which tier is its tallest (the
        // screen's), and this tier.
        float tallest = aTier.y > aTier.x ? (aTier.z > aTier.y ? 2.0 : 1.0) : 0.0;
        vForm = vec4(aForm.y, floor(aForm.w) + 0.1 * step(abs(ti - tallest), 0.1), seed, ti);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${WINDOWS}
      uniform float uMotion;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vCells;
      varying vec3 vParams;
      varying float vRoof;
      varying vec2 vCrown;
      varying vec4 vHero;
      varying vec3 vPaint;
      varying vec4 vTier;
      varying vec4 vForm;
      #ifdef PAINTED
      uniform sampler2D uFacade0;
      uniform sampler2D uFacade1;
      uniform sampler2D uFacade2;
      #endif
      vec3 neonOf(float k) {
        return k < 1.0 ? vec3(1.0, 0.22, 0.62) : k < 2.0 ? vec3(0.16, 0.9, 1.0) : k < 3.0 ? vec3(1.0, 0.58, 0.22) : vec3(0.64, 0.3, 1.0);
      }
      // A vertical sign hung on a block, the canyon's kind: a dark board, a
      // tube round its edge, a stack of characters' worth of strokes drawn
      // from a hash (lettering from across the city, without being any),
      // and now and then a tube that drops out. Far off, its glow.
      vec3 hangingSign(vec2 s, float cells, float seed, float t) {
        vec3 c = neonOf(floor(hash12(vec2(seed, 2.0)) * 4.0));
        if (hash12(vec2(seed, 9.0)) > 0.7) c = vec3(1.0, 0.86, 0.6);
        float frame = 1.0 - step(0.09, s.x) * step(s.x, 0.91) * step(0.02, s.y) * step(s.y, 0.98);
        vec2 g = vec2(s.x, s.y * cells);
        float cell = floor(g.y);
        vec2 f = vec2(g.x, fract(g.y));
        float h1 = hash12(vec2(cell, seed));
        float h2 = hash12(vec2(cell + 3.0, seed));
        float w = 0.08;
        float k = step(abs(f.x - 0.5), w) * step(abs(f.y - 0.5), 0.32) * step(0.25, h1);
        k += step(abs(f.y - 0.5), w) * step(abs(f.x - 0.5), 0.3) * step(0.45, h2);
        k += step(abs(f.y - 0.82), w) * step(abs(f.x - 0.5), 0.3) * step(0.55, h1);
        k += step(abs(f.x - 0.25), w) * step(abs(f.y - 0.5), 0.3) * step(0.7, h2);
        k += step(abs(f.y - 0.18), w) * step(abs(f.x - 0.5), 0.3) * step(0.6, h2);
        float px = max(fwidth(s.x), fwidth(g.y) * 0.3);
        float lit = mix(max(frame, min(k, 1.0) * step(0.14, s.x) * step(s.x, 0.86)), 0.32, smoothstep(0.12, 0.4, px));
        float cut = step(0.992, hash12(vec2(floor(t * 12.0), seed * 37.0)));
        return vec3(0.01, 0.01, 0.014) + c * 2.3 * lit * (1.0 - 0.85 * cut);
      }
      // A screen the height of a dozen floors: an advert with no words, two
      // of the city's colours in a slow gradient, a shape that breathes (an
      // optic's rings, a can, a chevron, a face's outline), a band of light
      // running down it, its scanlines, and every few seconds a tear.
      vec3 screenAd(vec2 s, float kind, float seed, float t) {
        float slot = floor(t / 9.0 + seed * 3.0);
        float which = mod(kind + slot, 4.0);
        vec3 a = neonOf(mod(which + floor(seed * 4.0), 4.0));
        vec3 b = neonOf(mod(which + 2.0 + floor(seed * 4.0), 4.0));
        float tear = step(0.985, hash12(vec2(floor(t * 6.0), seed * 17.0)));
        s.x += tear * (hash12(vec2(floor(s.y * 24.0), floor(t * 6.0))) - 0.5) * 0.12;
        vec3 col = mix(b * 0.12, a * 0.55, smoothstep(0.0, 1.0, s.y));
        vec2 c = s - vec2(0.5, 0.58);
        c.y *= 1.6;
        float d = length(c);
        float shape;
        if (which < 0.5) shape = smoothstep(0.03, 0.0, abs(d - 0.22 - 0.02 * sin(t * 2.0))) + smoothstep(0.1, 0.0, d) * 0.8;
        else if (which < 1.5) shape = step(abs(c.x), 0.14) * step(abs(c.y), 0.34) * (0.6 + 0.4 * step(0.2, abs(c.y)));
        else if (which < 2.5) shape = smoothstep(0.04, 0.0, abs(abs(c.x) * 1.2 - (c.y + 0.25) * 0.8)) * step(-0.3, c.y) * step(c.y, 0.3);
        else shape = smoothstep(0.035, 0.0, abs(length(c * vec2(1.0, 0.8)) - 0.26)) + smoothstep(0.035, 0.0, abs(c.y + 0.02)) * step(abs(c.x), 0.12);
        col += mix(a, vec3(1.0), 0.35) * shape * 1.4;
        float run = fract(s.y * 1.3 + t * 0.12);
        col += a * smoothstep(0.06, 0.0, abs(run - 0.5)) * 0.35;
        col *= 0.82 + 0.18 * step(0.5, fract(s.y * 140.0));
        col *= 1.0 - 0.6 * smoothstep(0.92, 1.0, max(abs(s.x - 0.5), abs(s.y - 0.5)) * 2.0 - 0.0);
        return col * 1.7;
      }
      void main() {
        vec3 n = normalize(vNormalW);
        float onWall = 1.0 - vRoof;
        // Above its roof line the wall is the parapet, a concrete band.
        float parapet = onWall * step(vTier.x, vWorld.y);
        vec4 win = windows(vCells, vParams, vWorld, step(0.0, vCells.y) * (1.0 - parapet));
        vec3 roofCol = vec3(0.012, 0.012, 0.016) + (uHazeColor * 0.3 + uGlowColor * 0.16) * uHaze * 0.35 * max(n.y, 0.25);
        vec3 col = mix(win.rgb, roofCol, vRoof);
        #ifdef PAINTED
        // A painted block, as the kit's painted material draws its walls:
        // tiles mirrored and some a floor darker, a smaller level far off.
        vec2 tile = floor(vPaint.xy);
        vec2 puv = vPaint.xy;
        if (hash12(tile + 3.1) > 0.5) puv.x = tile.x + 1.0 - fract(vPaint.x);
        puv.x += floor(hash12(vec2(tile.y, 9.3)) * 4.0) * 0.25;
        float far = smoothstep(90.0, 260.0, length(vWorld - uCam));
        vec2 grad = vec2(fwidth(vPaint.x), fwidth(vPaint.y)) * exp2(far * 1.5);
        vec3 tex = vPaint.z < 0.5 ? textureGrad(uFacade0, puv, vec2(grad.x, 0.0), vec2(0.0, grad.y)).rgb
          : vPaint.z < 1.5 ? textureGrad(uFacade1, puv, vec2(grad.x, 0.0), vec2(0.0, grad.y)).rgb
          : textureGrad(uFacade2, puv, vec2(grad.x, 0.0), vec2(0.0, grad.y)).rgb;
        if (vPaint.z > -0.5 && vRoof < 0.5) {
          tex *= mix(1.0, 0.62, step(0.66, hash12(tile + 7.7)));
          float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
          float room = smoothstep(0.12, 0.45, lum);
          float distant = smoothstep(60.0, 220.0, length(vWorld - uCam));
          vec3 p = tex * 1.05 * (0.9 + 1.4 * room * room * (1.0 - 0.9 * distant)) * (1.0 - 0.25 * distant);
          p += tex * spillAt(vWorld) * 2.2 * (1.0 - room) + spillAt(vWorld) * 0.02;
          // Street level: shopfronts in 3.2 m bays, a colour to each, lit
          // brightest under the fascia, a sign band over them, some shut.
          float bayU = vPaint.x * 16.0 / 3.2;
          float bay = floor(bayU);
          float front = hash12(vec2(floor(bay / 2.0), tile.y + vParams.z * 31.0));
          vec3 shopCol = front > 0.9 ? vec3(1.0, 0.3, 0.62) : front > 0.8 ? vec3(0.25, 0.85, 1.0) : vec3(1.0, 0.66, 0.38);
          float shop = step(vWorld.y, 4.6);
          float y = vWorld.y;
          float glassY = step(0.45, y) * step(y, 3.2);
          float mull = step(min(fract(bayU), 1.0 - fract(bayU)), 0.03);
          float open = step(0.35, front);
          vec3 inside = shopCol * (0.05 + 0.3 * smoothstep(0.5, 3.1, y)) * (0.5 + 0.8 * hash12(vec2(bay, 4.0)));
          vec3 shut = vec3(0.02, 0.02, 0.025) * (0.7 + 0.3 * step(0.5, fract(y * 10.0)));
          vec3 street = mix(shut, inside, open) * glassY * (1.0 - mull);
          float fascia = step(3.45, y) * step(y, 4.25);
          street += mix(vec3(0.012), shopCol * 0.5, fascia * step(0.55, front) * step(0.15, fract(bayU * 0.5)));
          street += spillAt(vWorld) * 0.15;
          p = mix(p, street, shop);
          col = p;
          win.a = max(room * 0.7 * (1.0 - distant), shop * open * glassY);
        }
        #endif
        // The parapet: coping-dark concrete taking the street's light and
        // the glow, with a hairline where the coping catches the sky.
        vec3 band = vec3(0.018, 0.018, 0.022) + spillAt(vWorld) * 0.35 + (uHazeColor * 0.2 + uGlowColor * 0.1) * uHaze * 0.3;
        band += (uHazeColor * 0.5 + uGlowColor * 0.3) * uHaze * smoothstep(-0.2, 0.0, vWorld.y - vTier.x - 0.9) * 0.5;
        col = mix(col, band, parapet);
        float style = vForm.x;
        float top = vCrown.x;
        float dressed = step(abs(vHero.x - 1.0), 0.1);
        float pick = mix(vCrown.y, 0.93 + 0.07 * vCrown.y, dressed);
        vec3 crownCol = pick > 0.975 ? vec3(1.0, 0.22, 0.62) : pick > 0.955 ? vec3(0.16, 0.9, 1.0) : pick > 0.93 ? vec3(1.0, 0.58, 0.22) : vec3(0.8, 0.88, 1.0);
        // One tall tower in seven wears a lit band under its roof: white,
        // amber, or one of the city's neons; a tower lit at its setbacks
        // wears one at every step; Contact's towers all do, in the city's
        // neons, with a blade of light up one corner.
        float banded = max(max(step(0.86, vCrown.y) * step(60.0, top), dressed), step(abs(style - 1.0), 0.1) * step(0.75, vCrown.y));
        float crown = onWall * (1.0 - parapet) * banded * vTier.z * step(vTier.x - 3.4, vWorld.y) * step(vWorld.y, vTier.x - 2.1);
        // The towers built to wear one take it in a warmer light more often
        // than the cold white the odd one has.
        float bh = fract(vCrown.y * 29.7);
        vec3 bandCol = dressed > 0.5 || style > 1.5 || abs(style - 1.0) > 0.1 ? crownCol : bh > 0.7 ? vec3(1.0, 0.6, 0.28) : bh > 0.45 ? vec3(1.0, 0.86, 0.66) : crownCol;
        col = mix(col, bandCol * 1.8, crown);
        // Lit setbacks: a thin line of light under each step's edge, in
        // the tower's own light (mostly warm white, now and then a neon),
        // on most of the towers built that way.
        float steps = onWall * (1.0 - parapet) * step(abs(style - 4.0), 0.1) * step(0.5, vCrown.y) * (1.0 - vTier.z) * step(vTier.x - 0.95, vWorld.y) * step(vWorld.y, vTier.x - 0.55);
        float sh = fract(vCrown.y * 17.3);
        vec3 stepCol = sh > 0.88 ? vec3(1.0, 0.22, 0.62) : sh > 0.76 ? vec3(0.16, 0.9, 1.0) : sh > 0.3 ? vec3(1.0, 0.6, 0.28) : vec3(1.0, 0.88, 0.72);
        col = mix(col, stepCol * 1.15, steps);
        float blade = dressed * onWall * step(vHero.y, 0.035) * step(8.0, vWorld.y) * step(vWorld.y, top - 4.0);
        col = mix(col, (vCrown.y > 0.5 ? vec3(0.16, 0.9, 1.0) : vec3(1.0, 0.22, 0.62)) * 2.2, blade);
        // A spire: dark steel catching the glow, a lit ring every few metres.
        float spire = step(abs(style - 2.0), 0.1) * vTier.z;
        if (spire > 0.5) {
          float rim = pow(1.0 - abs(dot(normalize(uCam - vWorld), n)), 2.0);
          col = vec3(0.01, 0.011, 0.015) + (uHazeColor * 0.35 + uGlowColor * 0.2) * rim * uHaze;
          col += vec3(0.95, 0.9, 1.0) * 0.8 * step(fract((vWorld.y - vTier.y) / 9.0), 0.035) * onWall;
        }
        // A dark glass crown, its edges lit and a band at its foot and top.
        float glassCrown = step(abs(style - 3.0), 0.1) * vTier.z * onWall;
        if (glassCrown > 0.5) {
          vec3 V = normalize(vWorld - uCam);
          float F = 0.08 + 0.9 * pow(1.0 - abs(dot(V, n)), 5.0);
          vec3 lit = crownCol * 1.9;
          float edge = step(min(vHero.y, 1.0 - vHero.y), 0.03);
          float bands = step(vWorld.y, vTier.y + 0.6) + step(vTier.x - 0.6, vWorld.y);
          float ribs = step(0.82, fract(vWorld.y / 1.6));
          col = vec3(0.006, 0.007, 0.01) + (uHazeColor * 0.6 + uGlowColor * 0.4) * F + crownCol * 0.08 * ribs;
          col = mix(col, lit, clamp(edge + bands, 0.0, 1.0));
        }
        // Signs hung on the blocks: a vertical sign on some faces and a strip
        // of neon along a floor line on others, as the canyon's walls wear
        // them, so a district reads as streets of shops and not as boxes.
        float sign = 0.0;
        if (vHero.x > 1.5 && onWall > 0.5 && parapet < 0.5 && vHero.z > 8.0) {
          float fs = hash12(vec2(vForm.z * 13.0, vHero.w + 1.0));
          float W = vHero.z;
          float um = vHero.y * W;
          if (fs < 0.42 && vTier.y < 0.5) {
            float sw = 1.5 + 0.9 * hash12(vec2(fs, 3.0));
            float u0 = (0.1 + 0.8 * hash12(vec2(fs, 5.0))) * (W - sw);
            float y0 = 5.6 + 1.2 * hash12(vec2(fs, 6.0));
            float y1 = min(vTier.x - 1.5, y0 + 7.0 + 16.0 * hash12(vec2(fs, 7.0)));
            if (um > u0 && um < u0 + sw && vWorld.y > y0 && vWorld.y < y1) {
              col = hangingSign(vec2((um - u0) / sw, 1.0 - (vWorld.y - y0) / (y1 - y0)), max(1.0, floor((y1 - y0) / (sw * 1.1))), fs * 91.0, uTime * uMotion);
              sign = 1.0;
            }
          } else if (fs > 0.72) {
            float yl = 4.6 + 3.4 * floor(1.0 + 3.0 * hash12(vec2(fs, 11.0)));
            float edge = step(0.04, vHero.y) * step(vHero.y, 0.96);
            if (abs(vWorld.y - yl) < 0.08 && yl < vTier.x - 1.0 && edge > 0.5) {
              col = neonOf(floor(hash12(vec2(fs, 12.0)) * 4.0)) * 2.0;
              sign = 1.0;
            }
          }
        }
        // The screen, on the tallest tier's face that the seed picks.
        float screen = 0.0;
        if (vForm.y > 1.05 && onWall > 0.5 && parapet < 0.5) {
          float quadrant = (atan(n.z, n.x) + 3.14159) / 1.5708;
          float face = floor(quadrant + 0.5);
          float square = step(abs(quadrant - face), 0.3);
          float want = floor(hash12(vec2(vForm.z, 4.2)) * 4.0);
          float y0 = mix(vTier.y, vTier.x, 0.38);
          float y1 = mix(vTier.y, vTier.x, 0.86);
          if (square > 0.5 && abs(mod(face, 4.0) - want) < 0.5 && vWorld.y > y0 && vWorld.y < y1 && vHero.y > 0.14 && vHero.y < 0.86) {
            vec2 s = vec2((vHero.y - 0.14) / 0.72, (vWorld.y - y0) / (y1 - y0));
            col = screenAd(s, floor(vForm.y), fract(vForm.z * 7.31), uTime * uMotion);
            screen = 1.0;
          }
        }
        col = cityFog(col, vWorld, max(max(max(win.a * 0.8 * onWall * (1.0 - parapet), max(crown, steps)), max(blade, sign)), max(screen, glassCrown * 0.6)));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "skyline";

  // Per building: where (x, z, turn), its footprint and roof and parapet, its
  // tiers' heights and footprints, its cut, kind, dressing and screen.
  // What the shader once hashed per vertex, worked out once per building:
  // its windows' lit fraction, style and warmth, where its cells start, its
  // painted elevation (which, and where on it), and its crown's draw.
  const fl = rng(1999);
  const looks = lots.map((b) => {
    const choose = fl();
    const which = b.h < 100 && (choose > 0.06 || b.h < 40) && !b.hero ? Math.floor(((choose * 7) % 1) * 3) : -1;
    const look = [0.14 + 0.5 * fl(), fl() * 0.625, fl(), fl() * 40];
    if (b.hero) {
      look[0] = 0.55;
      look[1] = 0.25;
    }
    return { look, paint: [fl() * 160, fl() < 0.5 ? 0 : 0.5, which, fl()], seed: fl() };
  });
  const cullers = [];
  const instanced = (list, slots, sides) => {
    const geometry = buildingGeometry(slots, sides);
    const attrs = { aBase: [], aSize: [], aTier: [], aInset: [], aForm: [], aOffset: [], aLook: [], aPaint: [] };
    const spheres = [];
    for (const i of list) {
      const b = lots[i];
      const s = forms[i];
      attrs.aBase.push(b.x, b.z, Math.cos(b.yaw), Math.sin(b.yaw));
      attrs.aLook.push(...looks[i].look);
      attrs.aPaint.push(...looks[i].paint);
      const top = s.roof + s.spire + s.parapet;
      spheres.push(b.x, top / 2, b.z, 0.5 * Math.hypot(b.w, b.d, top) + 2);
      attrs.aSize.push(b.w, b.d, s.roof, s.parapet);
      attrs.aTier.push(...s.tiers);
      attrs.aInset.push(...s.inset);
      attrs.aForm.push(sides === 4 ? 0 : s.chamfer, s.style, b.hero ? 1 : slots === 2 ? 2 : 0, s.screen + looks[i].seed * 0.01);
      attrs.aOffset.push(...s.offset);
    }
    for (const [name, arr] of Object.entries(attrs)) geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(arr), 4).setUsage(THREE.DynamicDrawUsage));
    geometry.instanceCount = list.length;
    cullers.push(cullable(geometry, Object.keys(attrs), spheres));
    // The city's extent: the shader puts every vertex where it is.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(300, 120, -400), 2400);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
  };
  const blockList = [];
  const squareList = [];
  const cutList = [];
  lots.forEach((b, i) => (b.h < TOWER_FROM && !b.hero ? blockList : forms[i].chamfer > 0 ? cutList : squareList).push(i));
  const blocks = instanced(blockList, 2, 4);
  blocks.name = "skyline_blocks";
  const squares = instanced(squareList, 4, 4);
  squares.name = "skyline_towers";
  const mesh = instanced(cutList, 4, 8);
  mesh.name = "skyline";

  // ---- the roofs --------------------------------------------------------------
  // A kit on most roofs, made for a 20 m roof and scaled to the top tier's
  // footprint, turned a quarter at random so no two read the same. Homes
  // and plant on the blocks and the capped towers; a mast or a sign only
  // where nothing was capped, so they never stand in a framed sky.
  const kitGeos = roofKits();
  const kitAt = kitGeos.map(() => []);
  const kitLook = kitGeos.map(() => []);
  const fk = rng(4040);
  lots.forEach((b, i) => {
    const s = forms[i];
    if (s.style === 2 || s.style === 3 || b.hero) return;
    // Past a kilometre (three quarters of one on a phone's thinner city) a
    // roof's plant is under a pixel and in the fog.
    if (Math.hypot(b.x - 250, b.z + 300) > (count < 2000 ? 750 : 1000)) return;
    const top = topTier(s);
    const fw = b.w * s.inset[top];
    const fd = b.d * s.inset[top];
    if (Math.min(fw, fd) < 9 || fk() < 0.22) return;
    const tower = b.h >= TOWER_FROM;
    const roll = fk();
    let kit = tower ? (roll < 0.66 ? KIT.plant : KIT.home) : roll < 0.7 ? KIT.home : KIT.plant;
    if (!b.cone && roll > (tower ? 0.78 : 0.8)) kit = b.free && fk() < 0.5 ? KIT.mast : KIT.sign;
    const k = Math.min(1.5, Math.max(0.55, Math.min(fw, fd) / 20));
    const [cx, cz] = topCentre(b, s);
    kitAt[kit].push(cx, s.roof, cz, b.yaw + Math.floor(fk() * 4) * (Math.PI / 2));
    kitLook[kit].push(k, Math.floor(fk() * SIGN_NEON.length), fk(), 0);
  });
  const roofMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uNeon: { value: SIGN_NEON.map((c) => new THREE.Color(c)) }, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      attribute float aGlow;
      attribute vec2 aSignUv;
      attribute vec4 aKitAt;
      attribute vec4 aKitLook;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vGlow;
      varying vec2 vSignUv;
      varying vec4 vLook;
      void main() {
        vec3 p = position * aKitLook.x;
        float cs = cos(aKitAt.w);
        float sn = sin(aKitAt.w);
        vec3 w = vec3(aKitAt.x + cs * p.x + sn * p.z, aKitAt.y + p.y, aKitAt.z - sn * p.x + cs * p.z);
        vWorld = w;
        vNormalW = vec3(cs * normal.x + sn * normal.z, normal.y, -sn * normal.x + cs * normal.z);
        vGlow = aGlow;
        vSignUv = aSignUv;
        vLook = aKitLook;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uNeon[${SIGN_NEON.length}];
      uniform float uMotion;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vGlow;
      varying vec2 vSignUv;
      varying vec4 vLook;
      vec3 neon(float i) {
        vec3 c = uNeon[0];
        for (int k = 0; k < ${SIGN_NEON.length}; k++) if (abs(float(k) - i) < 0.5) c = uNeon[k];
        return c;
      }
      // A sign's face: a tube round its edge and four characters' worth of
      // strokes, each drawn from a hash, so from across the city it reads as
      // lettering without being any. Far off, its average.
      float glyphs(vec2 uv, float seed) {
        float frame = 1.0 - step(0.04, uv.x) * step(uv.x, 0.96) * step(0.1, uv.y) * step(uv.y, 0.9);
        vec2 g = vec2((uv.x - 0.08) / 0.84 * 4.0, (uv.y - 0.2) / 0.6);
        float cellX = floor(g.x);
        vec2 f = vec2(fract(g.x), g.y);
        float inside = step(0.0, g.x) * step(g.x, 4.0) * step(0.0, g.y) * step(g.y, 1.0);
        float s = 0.0;
        float h1 = hash12(vec2(cellX, seed));
        float h2 = hash12(vec2(cellX + 7.0, seed));
        float h3 = hash12(vec2(cellX + 13.0, seed));
        float w = 0.07;
        s += step(abs(f.x - 0.5), w) * step(0.3, h1);
        s += step(abs(f.y - 0.5), w * 0.8) * step(abs(f.x - 0.5), 0.36) * step(0.5, h2);
        s += step(abs(f.y - 0.9), w * 0.8) * step(abs(f.x - 0.5), 0.36) * step(0.4, h3);
        s += step(abs(f.x - 0.18), w) * step(0.7, h2);
        s += step(abs(f.x - 0.82), w) * step(0.6, h3) * step(f.y, 0.6);
        s += step(abs(f.y - 0.1), w * 0.8) * step(abs(f.x - 0.5), 0.36) * step(0.65, h1);
        float px = max(fwidth(uv.x), fwidth(uv.y));
        float lit = max(frame, min(s, 1.0) * inside);
        return mix(lit, 0.3, smoothstep(0.02, 0.06, px));
      }
      void main() {
        vec3 n = normalize(vNormalW);
        float up = max(n.y, 0.0);
        // Dark plant against the sky, its tops and edges catching the
        // city's glow on the cloud.
        vec3 col = vec3(0.012, 0.012, 0.016) + (uHazeColor * 0.35 + uGlowColor * 0.2) * (0.25 + 0.75 * up) * uHaze * 0.5;
        col += spillAt(vWorld) * 0.25;
        float emissive = 0.0;
        float seed = vLook.z;
        float t = uTime * uMotion;
        if (vGlow > 0.5 && vGlow < 1.5) {
          // A stair hut's door, lit warm from inside, on most roofs.
          col = vec3(1.0, 0.6, 0.3) * 1.3 * step(0.3, seed);
          emissive = 1.0;
        } else if (vGlow > 1.5 && vGlow < 2.5) {
          // A rooftop sign, now and then dropping a tube out for a frame.
          float cut = step(0.993, hash12(vec2(floor(t * 12.0), seed * 91.0)));
          col = vec3(0.008, 0.008, 0.012) + neon(vLook.y) * 2.6 * glyphs(vSignUv, floor(seed * 50.0)) * (1.0 - 0.85 * cut);
          emissive = 1.0;
        } else if (vGlow > 2.5 && vGlow < 3.5) {
          // An aviation lamp on the plant or the mast, blinking.
          float on = mix(0.6, step(0.5, fract(t * 0.6 + seed)), uMotion);
          col = vec3(1.0, 0.07, 0.05) * 3.0 * on;
          emissive = 1.0;
        } else if (vGlow > 3.5) {
          // A skylight, lit from the stairwell under it on some roofs.
          col = mix(col, vec3(0.5, 0.66, 1.0) * 0.55, step(0.55, seed));
          emissive = step(0.55, seed) * 0.6;
        }
        col = cityFog(col, vWorld, emissive);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  roofMat.name = "skyline_roofs";
  const roofMeshes = kitGeos.map((g, k) => {
    const n = kitAt[k].length / 4;
    g.setAttribute("aKitAt", new THREE.InstancedBufferAttribute(new Float32Array(kitAt[k].length ? kitAt[k] : [0, -1e4, 0, 0]), 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aKitLook", new THREE.InstancedBufferAttribute(new Float32Array(kitLook[k].length ? kitLook[k] : [0, 0, 0, 0]), 4).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = n;
    const spheres = [];
    for (let i = 0; i < n; i++) spheres.push(kitAt[k][i * 4], kitAt[k][i * 4 + 1] + 6, kitAt[k][i * 4 + 2], 16 * kitLook[k][i * 4]);
    if (n) cullers.push(cullable(g, ["aKitAt", "aKitLook"], spheres));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(300, 60, -400), 2400);
    const m = new THREE.Mesh(g, roofMat);
    m.name = `skyline_roofs_${Object.keys(KIT)[k]}`;
    m.visible = n > 0;
    scene.add(m);
    return m;
  });

  // Aviation lights: a red lamp on every tall roof (at a spire's tip, where
  // there is one), a third of them on at a time, a little under a second
  // each, so the skyline blinks slowly across itself. Steady under reduced
  // motion. One draw.
  const beacons = [];
  const groups = [];
  lots.forEach((b, i) => {
    const s = forms[i];
    const top = s.roof + s.spire;
    if (top < BEACON_OVER && !b.hero) return;
    const [cx, cz] = topCentre(b, s);
    beacons.push(cx, top + (s.spire ? 0.4 : 0.8), cz);
    groups.push(Math.floor(r() * 3));
  });
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute("position", new THREE.Float32BufferAttribute(beacons, 3));
  beaconGeo.setAttribute("aGroup", new THREE.Float32BufferAttribute(groups, 1));
  const beaconMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uPixel: { value: 1 }, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      attribute float aGroup;
      uniform float uTime;
      uniform float uPixel;
      uniform float uMotion;
      varying float vOn;
      varying vec3 vWorld;
      void main() {
        vWorld = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float t = fract(uTime * 0.75 + aGroup / 3.0);
        vOn = mix(0.6, smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.42, 0.55, t)), uMotion);
        gl_PointSize = clamp(2600.0 / -mv.z, 2.5, 6.0) * uPixel;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying float vOn;
      varying vec3 vWorld;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        vec3 col = vec3(1.0, 0.06, 0.04) * 3.5 * vOn * exp(-d * d * 4.0);
        col *= exp(-length(vWorld - uCam) * uFogDensity * 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  beaconMat.name = "beacons";
  const beaconPoints = new THREE.Points(beaconGeo, beaconMat);
  beaconPoints.name = "beacons";
  scene.add(beaconPoints);

  // The dome, which is also everything past the last building: the sky and
  // its cloud, the searchlights, and below the horizon the far city's
  // ground, where no tower stands on it.
  const skyGeo = new THREE.SphereGeometry(2200, 32, 16);
  const sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({
    uniforms: { ...shared, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 w = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * w;
        gl_Position.z = gl_Position.w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uMotion;
      varying vec3 vDir;

      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * vnoise(p);
          p = p * 2.03 + vec2(17.1, 3.7);
          a *= 0.5;
        }
        return s / 0.9375;
      }

      // The far city's ground: its blocks stand on a ${cell} m grid, so its
      // streets run between them. A lamp every eleven and a half metres down
      // each kerb, a pool of light under it, and now and then a car's lights
      // going along. Past a pixel a lamp is spread into its street rather
      // than sparkling.
      vec3 streets(vec3 p, float time, float px) {
        vec2 q = (p.xz + vec2(${900 - cell / 2}.0, ${1700 - cell / 2}.0)) / ${cell}.0;
        // Signed metres from the nearest street's middle, on each axis.
        vec2 off = (fract(q + 0.5) - 0.5) * ${cell}.0;
        vec2 id = floor(q + 0.5);
        float road = 1.0 - smoothstep(5.0, 6.0 + px, min(abs(off.x), abs(off.y)));
        vec3 base = vec3(0.004, 0.004, 0.006) + vec3(0.008, 0.007, 0.009) * road;
        vec3 light = vec3(0.0);
        // Streets along z (off.x small) and along x (off.y small).
        for (int k = 0; k < 2; k++) {
          float across = k == 0 ? off.x : off.y;
          float along = k == 0 ? p.z : p.x;
          float street = k == 0 ? id.x : id.y;
          if (abs(across) > 9.0 + px) continue;
          float dz = abs(fract(along / 11.5 + 0.5) - 0.5) * 11.5;
          float dk = abs(abs(across) - 4.2);
          float d2 = dk * dk + dz * dz;
          float r = max(0.9, px);
          float lamp = exp(-d2 / (r * r)) * (0.81 / (r * r));
          float on = step(0.12, hash12(vec2(floor(along / 11.5 + 0.5), street * 3.1 + float(k))));
          // Each lamp's pool runs into the next, so a street reads as a line.
          float pool = exp(-dk * dk / 8.0 - dz * dz / 45.0) * 0.12;
          vec3 sodium = mix(vec3(1.0, 0.55, 0.2), vec3(0.85, 0.9, 1.0), step(0.7, hash12(vec2(street, float(k) + 3.0))));
          light += sodium * (lamp * 1.4 * on + pool * (0.4 + 0.6 * on));
          // Shopfronts at the foot of the blocks: a band of light along each
          // kerb, a colour to each front, some of them shut.
          float front = hash12(vec2(floor(along / 7.0), street * 5.3 + float(k) * 7.0 + step(0.0, across)));
          vec3 shopCol = front > 0.96 ? vec3(1.0, 0.25, 0.6) : front > 0.93 ? vec3(0.2, 0.85, 1.0) : vec3(1.0, 0.72, 0.48);
          float within = step(abs(fract(along / 7.0) - 0.5), 0.36);
          float rs = max(1.2, px);
          float kerb = abs(across) - 7.4;
          light += shopCol * exp(-kerb * kerb / (rs * rs)) * (1.2 / rs) * step(0.55, front) * mix(0.72, within, 1.0 - smoothstep(1.0, 4.0, px)) * 0.22;
          // Cars: a lane each way, one every sixty metres or so, some of
          // them missing, head lamps one way and tail lamps the other.
          for (int lane = 0; lane < 2; lane++) {
            float sgn = lane == 0 ? 1.0 : -1.0;
            float h = hash12(vec2(street * 1.7 + float(k) * 31.0, float(lane)));
            if (h < 0.35) continue;
            float s = along / 60.0 + sgn * time * (9.0 + 6.0 * h) / 60.0 + h * 7.0;
            float present = step(0.3, hash12(vec2(floor(s + 0.5), street + float(lane) * 13.0)));
            float ds = abs(fract(s + 0.5) - 0.5) * 60.0;
            float dl = abs(across - sgn * 1.8);
            float rc = max(0.7, px);
            float car = exp(-(ds * ds * 0.5 + dl * dl * 1.5) / (rc * rc)) * (0.5 / (rc * rc));
            light += (lane == 0 ? vec3(1.0, 0.92, 0.8) : vec3(1.0, 0.08, 0.05)) * car * present * 2.0;
          }
        }
        return base + light;
      }

      // Searchlights from downtown and the south, sweeping slowly (the
      // south one well left of Contact's moon, which it would skewer): the
      // nearest a view ray comes to each beam, lit the more the closer, the
      // beam widening as it climbs and gone into the cloud.
      vec3 searchlights(vec3 dir, float time) {
        vec3 sum = vec3(0.0);
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec3 base = i == 0 ? vec3(-460.0, 0.0, -1500.0) : i == 1 ? vec3(420.0, 0.0, -1250.0) : vec3(-200.0, 0.0, 1000.0);
          float turn = time * (0.045 + 0.018 * fi) + fi * 2.4;
          float lean = 0.34 + 0.12 * sin(time * 0.06 + fi * 1.7);
          vec3 a = normalize(vec3(sin(turn) * lean, 1.0, cos(turn) * lean));
          vec3 w0 = uCam - base;
          float b = dot(dir, a);
          float d = dot(dir, w0);
          float e = dot(a, w0);
          float den = max(1.0 - b * b, 1e-4);
          float tau = (b * e - d) / den;
          float s = (e - b * d) / den;
          if (tau <= 0.0 || s <= 0.0) continue;
          vec3 gap = w0 + dir * tau - a * s;
          float width = 3.0 + s * 0.03;
          float core = exp(-dot(gap, gap) / (width * width));
          float height = base.y + a.y * s;
          float fade = exp(-s / 900.0) * exp(-tau * 0.00035) * (1.0 - smoothstep(${CLOUD_H - 80}.0, ${CLOUD_H + 40}.0, height));
          sum += core * fade;
        }
        return vec3(0.6, 0.68, 0.9) * sum * 0.075 * uHaze;
      }

      void main() {
        vec3 dir = normalize(vDir);
        float h = max(dir.y, 0.0);
        float time = uTime * uMotion;
        // Where this pixel's ray meets the ground, and how much ground a
        // pixel covers there, worked out before any branch so the
        // derivatives are the whole quad's.
        float tg = max(uCam.y, 0.0) / max(-dir.y, 1e-4);
        vec3 pg = uCam + dir * tg;
        float px = max(max(fwidth(pg.x), fwidth(pg.z)), 0.05);
        vec3 glow = uHazeColor * (0.55 + 0.25 * uLevel) * exp(-h * 9.0) * uHaze;
        vec3 col = vec3(0.004, 0.004, 0.007) + glow + uHazeColor * 0.08 * exp(-h * 2.5);
        // The city's light in the air, meeting the fog at the horizon: a
        // band over the roofs, brightest toward downtown.
        col += cityGlow(dir, h * 900.0) * (0.85 + 0.2 * uLevel);

        if (dir.y > 0.0) {
          // A broken deck of cloud, lit from under by the city: the glow's
          // own colour, brighter toward downtown and where it is thicker.
          // Between the clouds the sky is darker than the lit air under
          // them. Both go into the horizon's haze with distance.
          float t = (${CLOUD_H}.0 - uCam.y) / dir.y;
          vec3 p = uCam + dir * t;
          vec2 drift = vec2(time * 3.2, time * 1.1);
          vec2 c = (p.xz + drift) / 380.0;
          float n = fbm(c + 0.9 * vec2(fbm(c * 0.5 + 5.2), fbm(c * 0.5 + 1.3)));
          float cover = smoothstep(0.42, 0.72, n);
          float near = 1.0 - smoothstep(2500.0, 12000.0, t);
          vec3 under = (cityGlow(dir, 0.0) * 0.5 + uHazeColor * 0.25) * (0.3 + 0.9 * n);
          col = mix(col, col * 0.55, (1.0 - cover) * near) + under * cover * near * 0.8;
          // Lightning inside the cloud: the deck lit from within round the
          // strike, brightest where it is thickest.
          float strike = exp(-length(p.xz - uFlashAt) / 420.0);
          col += vec3(0.62, 0.64, 0.92) * uFlash * strike * (0.1 + 0.9 * cover * n) * near;
        } else if (uCam.y > 0.0) {
          // Only past the kit: anything nearer that shows the ground is a
          // gap between the kit's own pieces, and it stays dark.
          vec3 ground = streets(pg, time, px) * smoothstep(20.0, 60.0, tg);
          vec3 fogged = cityFog(ground, pg, 0.0);
          // The horizon's own band stays where the ground runs into it.
          col = mix(fogged, col, smoothstep(-0.004, 0.0, dir.y));
        }
        col += searchlights(dir, time);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  }));
  sky.material.name = "sky";
  sky.name = "sky";
  // Drawn after everything opaque: it sits on the far plane and writes no
  // depth, so the depth test throws away every pixel a building already
  // covers before its clouds and streets are worked out.
  sky.renderOrder = 10;
  sky.frustumCulled = false;
  scene.add(sky);

  const frustum = new THREE.Frustum();
  const viewProjection = new THREE.Matrix4();
  return {
    mesh,
    sky,
    update(camera, pixelRatio = 1) {
      sky.position.copy(camera.position);
      beaconMat.uniforms.uPixel.value = pixelRatio;
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      for (const c of cullers) c.update(frustum);
    },
    dispose() {
      scene.remove(mesh, blocks, squares, sky, beaconPoints, ...roofMeshes);
      kitGeos.forEach((g) => g.dispose());
      roofMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      mesh.geometry.dispose();
      blocks.geometry.dispose();
      squares.geometry.dispose();
      material.dispose();
      skyGeo.dispose();
      sky.material.dispose();
    },
  };
}
