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
// whatever roof is on top, and a cap on every setback for a terrace. Their
// walls are the kit's own tinted walls and windows, so the city goes on
// past the last lot line in the same hand. The low blocks have shops at
// their feet, string courses, piers, balconies, air conditioners and small
// lit boards; the towers are one of a few kinds a night city is made of
// (stepped back twice, a slab with its plant on top, a ziggurat, a glass
// crown lit from inside, a podium and a spire), most lit in bands floor by
// floor as the show paints them, some lit at their setbacks, some wearing a
// vertical blade of light or a mark under the roof, a few carrying a screen
// the height of a dozen floors. Round the kit stand the show's screen
// towers, slim shafts whose faces are columns of stacked screens, and
// behind them hologram columns (sky-columns.js). Every dealt lot's place,
// footprint and height cap is what it was when these were boxes, so the
// hero's band of sky and Contact's moon keep the clearances they were
// framed with; a spire, a mast, a screen tower or a column only stands
// where nothing was capped. Three draws for the buildings (blocks, square
// towers and cut ones), four for what stands on the roofs (a kit per kind
// of roof: tanks and a stair hut, plant and cooling towers, a telecom mast,
// a sign), one for the aviation lamps, one for the columns.
//
// The sky is a dome: near-black overhead, and near the horizon the lit
// city's glow hanging in wet air, violet and pink rather than blue, because
// the light is the city's and not the moon's, brightest toward downtown.
// The kit's landmark towers (anchor_mega_*) are kept clear of, like the kit.
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON, WINDOWS } from "./glsl.js";
import { ADVERT, createSkyColumns } from "./sky-columns.js";
import { BOX, createFarStreet } from "./far-street.js";

// Rectangles (x0, z0, x1, z1) the far city stays out of: the kit's whole
// footprint (BIBLE.md), so it starts behind the last lot line every street
// of the loop is built to.
const KEEP_OUT = [
  // The kit east of the west street's east lots to the x 120 road, the
  // megabuilding to the depot past the avenue's south arm; the
  // megabuilding's west corner; Japantown out to x -170 and the block that
  // closes the west street's south end.
  [-66, -800, 135, 125],
  [-94, -800, -66, -745],
  [-175, -745, -66, 42],
  // The east lobe: corpo row's towers to Santo Domingo's south side, out to
  // the garage street's east lots.
  [100, -380, 490, 48],
];
// Where the kit has grown since: the lots are still dealt from the
// rectangles above (a lot skipped there takes none of the draws, so one more
// skipped would deal every lot after it differently, the hero's and
// Contact's among them), and a lot dealt onto ground the kit has since taken
// is left out afterwards. These are the ground itself, not a margin round a
// centre: a lot is left out when its footprint, turned, reaches into one.
const KEEP_OUT_SINCE = [
  // Corpo Row's service lane, elevated track and back blocks, behind its
  // towers out to z -420.
  [100, -420, 470, -380],
  // The Afterlife Block's east part, built out to x 508, and the block that
  // closes the boulevard's east end, its north face on z -344.
  [470, -344, 510, -176],
];
// Lots stood by hand after the deal, where it left bare ground the loop
// looks at: x, z, width, depth, height. The corner outside the loop's turn
// at the boulevard's east end, between Corpo Row's last lot (x 470), the
// closing block's back (z -344) and the dealt lots from x 502: it was dealt
// as the kit's (the east lobe's rectangle runs to x 490) and no district
// builds on it.
const EXTRA_LOTS = [
  [489, -369, 30, 34, 46],
  [485, -405, 22, 26, 29],
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
// What Contact's lens frames, as bearings from it in degrees (from east,
// toward south): a 16:9 screen's frame and the moon shot's, with a margin.
// Outside it the low zone need not be low.
const FRAMED = [7, 84];
// The far layer of megabuildings, seen from the lenses whose pictures hold,
// stands no higher than this: lens x, y, z, the bearings it frames and the
// elevation in degrees. Contact left of the moon, Contact under the moon
// (its lower edge is 13.1 degrees up, the moon shot's frame 12.6), and
// Corpo Row's low angle, whose frame starts 9 degrees up.
const FAR_UNDER = [
  [456, 10.4, -203, 7, 46, 13.5],
  [456, 10.4, -203, 46, 84, 11.5],
  [120, 30, -230, -96, -27, 7.5],
];
// How far past the kit's ground the streets are dressed for a walker
// looking out from the loop (a kerb and paving under every block, a post
// under every lamp, parked cars): the first three blocks.
const DRESSED = 141.3;
// Aviation lights on anything this tall, blinking red in three groups.
const BEACON_OVER = 92;
// The cloud deck's height, over the tallest roofs.
const CLOUD_H = 520;
// Under this a building is a block (one or two tiers, square, shops at its
// foot); over it, a tower.
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
function cullable(mesh, names, spheres) {
  const geometry = mesh.geometry;
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
      // Nothing of it in view: no draw at all.
      mesh.visible = k > 0;
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

export function createSkyline(scene, shared, { count = 2600, keepOut = [], reduced = false } = {}) {
  // The city's adverts: the kit's billboards own the atlas (materials.js),
  // and the far city's boards, screens and columns show the same set.
  // Until it has landed (or were the kit ever without a billboard) they
  // show what they drew before there was one.
  let ads = { uAds: { value: null }, uHasAds: { value: 0 } };
  scene.traverse((o) => {
    for (const m of [].concat(o.material ?? [])) if (m.name === "billboard") ads = { uAds: m.uniforms.uAds, uHasAds: m.uniforms.uHasAds };
  });
  const r = rng(90210);
  // A number of a lot's own from where it was dealt, by the hash the shader
  // uses, in the GPU's precision: what is decided after the deal is decided
  // from these, so no stream of draws is disturbed.
  const f32 = Math.fround;
  const at = (b) => f32(f32(f32(b.ox ?? b.x) * f32(0.013)) + f32(f32(b.oz ?? b.z) * f32(0.071)));
  const hash11 = (n) => {
    const v = f32(f32(Math.sin(f32(n))) * f32(43758.5453123));
    return v - Math.floor(v);
  };
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
      // What it was dealt, before anything below caps it.
      const tall = h;
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
      const yaw = (r() - 0.5) * 0.3;
      // Half its footprint's reach along x and z, turned.
      const [cs, sn] = [Math.abs(Math.cos(yaw)), Math.abs(Math.sin(yaw))];
      const [ex, ez] = [(w * cs + dd * sn) / 2, (w * sn + dd * cs) / 2];
      const gone = KEEP_OUT_SINCE.some(([x0, z0, x1, z1]) => x + ex > x0 && x - ex < x1 && z + ez > z0 && z - ez < z1);
      lots.push({ x, z, w, d: dd, h, tall, yaw, free, cone, hero: false, gone });
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
      { ...b, x: xa, z: za, w: alongX ? la : b.w, d: alongX ? b.d : la, h: Math.max(8, ha), block: b },
      { ...b, x: xb, z: zb, w: alongX ? lb : b.w, d: alongX ? b.d : lb, h: Math.max(8, hb), block: b, second: true });
  }

  // The lots stood by hand go last, after the split, so every dealt lot
  // keeps its own draws from each stream.
  for (const [x, z, w, d, h] of EXTRA_LOTS) lots.push({ x, z, w, d, h, yaw: 0, free: false, cone: false, hero: false, extra: true });

  const f = rng(31337);
  const forms = lots.map((b) => formOf(b, f));

  // What stands on each roof, and which aviation lamps blink together, drawn
  // here for the lots as dealt, so that whatever is changed below (a lot
  // made into a screen tower) leaves every other lot its own draws. A kit
  // on most roofs, made for a 20 m roof and scaled to the top tier's
  // footprint, turned a quarter at random so no two read the same. Homes
  // and plant on the blocks and the capped towers; a mast or a sign only
  // where nothing was capped, so they never stand in a framed sky.
  const fk = rng(4040);
  const kitOf = lots.map((b, i) => {
    const s = forms[i];
    if (s.style === 2 || s.style === 3 || b.hero) return null;
    // Past a kilometre (three quarters of one on a phone's thinner city) a
    // roof's plant is under a pixel and in the fog.
    if (Math.hypot(b.x - 250, b.z + 300) > (count < 2000 ? 750 : 1000)) return null;
    const top = topTier(s);
    const fw = b.w * s.inset[top];
    const fd = b.d * s.inset[top];
    if (Math.min(fw, fd) < 9 || fk() < 0.22) return null;
    const tower = b.h >= TOWER_FROM;
    const roll = fk();
    let kit = tower ? (roll < 0.66 ? KIT.plant : KIT.home) : roll < 0.7 ? KIT.home : KIT.plant;
    if (!b.cone && roll > (tower ? 0.78 : 0.8)) kit = b.free && fk() < 0.5 ? KIT.mast : KIT.sign;
    const k = Math.min(1.5, Math.max(0.55, Math.min(fw, fd) / 20));
    const [cx, cz] = topCentre(b, s);
    const turn = b.yaw + Math.floor(fk() * 4) * (Math.PI / 2);
    return { kit, at: [cx, s.roof, cz, turn], look: [k, Math.floor(fk() * SIGN_NEON.length), fk(), 0] };
  });
  // Aviation lights on every tall roof: which of the three groups each
  // blinks with (-1: too low for one).
  const beaconOf = lots.map((b, i) => (forms[i].roof + forms[i].spire < BEACON_OVER && !b.hero ? -1 : Math.floor(r() * 3)));

  // ---- the screen towers ------------------------------------------------------
  // The show's skyline is a low glowing city under a handful of slim towers
  // whose whole faces are columns of stacked screens, the brightest things
  // in it. Round the kit, a sector of the compass at a time, one lot in the
  // near ring and one in the far (a phone's thinner city has the one ring)
  // is rebuilt as one: a podium, a slim shaft of screens, a dark cap and a
  // red lamp. Only where nothing capped the lot's height, so never up the
  // hero's avenue nor under Contact's moon, and from draws of their own.
  const edit = rng(52011);
  // Contact looks south-east from the garage's roof, and sees past the end
  // of the low roofs: nothing new stands tall anywhere in that quarter.
  const underMoon = (b) => {
    const a = Math.atan2(b.z - CONTACT_LENS[1], b.x - CONTACT_LENS[0]) * (180 / Math.PI);
    return a > -10 && a < 100;
  };
  const SECTORS = 24;
  const rings = count < 2000 ? [[150, 520, 190, 110]] : [[150, 420, 190, 110], [420, 1000, 260, 170]];
  // How far a lot stands from the kit, and which sector of the compass it
  // is in, seen from the kit's middle.
  const gapOf = (b) => Math.min(...KEEP_OUT.map(([x0, z0, x1, z1]) => Math.hypot(Math.max(x0 - b.x, 0, b.x - x1), Math.max(z0 - b.z, 0, b.z - z1))));
  const sectorOf = (b) => Math.min(SECTORS - 1, Math.floor((Math.atan2(b.z + 330, b.x - 160) / (Math.PI * 2) + 0.5) * SECTORS));
  const ringOf = lots.map((b) => {
    if (!b.free || b.gone || b.block || Math.min(b.w, b.d) < 22 || underMoon(b)) return -1;
    const gap = gapOf(b);
    const ring = rings.findIndex(([g0, g1]) => gap >= g0 && gap < g1);
    return ring < 0 ? -1 : sectorOf(b) * rings.length + ring;
  });
  for (let slot = 0; slot < SECTORS * rings.length; slot++) {
    const from = [];
    ringOf.forEach((v, i) => v === slot && from.push(i));
    const skip = edit() < 0.2;
    const pick = from[Math.floor(edit() * from.length)];
    if (skip || pick === undefined) continue;
    const [, , h0, dh] = rings[slot % rings.length];
    const h = h0 + edit() * dh;
    const podium = 10 + edit() * 8;
    const cap = 5 + edit() * 9;
    lots[pick] = { ...lots[pick], h, screens: true };
    forms[pick] = { tiers: [podium, h - podium - cap, cap, 0], inset: [1, 0.6 + edit() * 0.14, 0.36 + edit() * 0.14, 1], offset: [0, 0, 0, 0], chamfer: 0, style: 5, parapet: 0.5, screen: 0, roof: h, spire: 0 };
    kitOf[pick] = null;
    if (beaconOf[pick] < 0) beaconOf[pick] = Math.floor(edit() * 3);
  }

  // The blocks nearest the kit are what its last row is seen against: two in
  // five of their roofs carry a lit board in place of their plant, so the
  // signs go on past the last lot line. Not up the hero's avenue, where a
  // roof sign was never dealt, nor under Contact's moon.
  lots.forEach((b, i) => {
    const k = kitOf[i];
    if (!k || b.cone || b.gone || b.h >= TOWER_FROM || underMoon(b) || gapOf(b) > 200 || (k.kit !== KIT.home && k.kit !== KIT.plant)) return;
    if (edit() < 0.4) k.kit = KIT.sign;
  });

  // ---- the hologram columns ---------------------------------------------------
  // Columns of adverts in the sky (sky-columns.js), the tallest things in
  // it, two to four times a tower's height: a group of seven west of the
  // kit, where every roof, deck and flying car of it sees them stand
  // together, and one each to the south and the east. Each rises out of a
  // lot nothing capped, so never up the hero's avenue nor in the quarter
  // Contact looks into.
  const holo = rng(4242);
  const columns = [];
  // (And since: three east of the kit, three south, two south-west, each
  // group outside the hero's cone, Corpo Row's frame and the quarter
  // Contact looks into, and taller: up into the cloud.)
  for (const [cx, cz, reach, many, taller] of [[-500, -190, 190, 7, 0], [250, 540, 120, 1, 0], [900, -480, 120, 1, 0], [1000, -430, 170, 3, 1], [230, 660, 170, 3, 1], [-430, 480, 160, 2, 1]]) {
    const from = lots.filter((b) => b.free && !b.gone && !b.screens && !underMoon(b) && Math.hypot(b.x - cx, b.z - cz) < reach);
    const stood = [];
    for (let tries = 0; tries < 60 && stood.length < many && from.length; tries++) {
      const b = from[Math.floor(holo() * from.length)];
      if (stood.some((o) => Math.hypot(o.x - b.x, o.z - b.z) < 64)) continue;
      stood.push(b);
      columns.push(b.x, b.z, 26 + holo() * 14, 540 + holo() * 360 + taller * 260, taller ? 1 + Math.floor(holo() * 5) : Math.floor(holo() * 5), holo());
    }
  }
  const skyColumns = createSkyColumns(scene, shared, columns, { reduced, ads });

  // ---- the ring ---------------------------------------------------------------
  // Something stands on the horizon on every bearing. South-east the lots
  // were all dealt low for Contact's moon, and from the air the low roofs
  // ran out to a fog line. Outside Contact's own frame (and the moon
  // shot's), seen from its lens, they stand as tall as they were dealt, as
  // the north and the west do; a split block is one lot again under its
  // tower. Inside the frame every lot is as it was.
  const ring = rng(60606);
  const lensAz = (x, z) => Math.atan2(z - CONTACT_LENS[1], x - CONTACT_LENS[0]) * (180 / Math.PI);
  const reform = (i, b) => {
    lots[i] = b;
    forms[i] = formOf(b, ring);
    kitOf[i] = null;
    beaconOf[i] = forms[i].roof + forms[i].spire < BEACON_OVER ? -1 : Math.floor(ring() * 3);
  };
  for (let i = 0; i < lots.length; i++) {
    const b = lots[i];
    const whole = b.block ?? b;
    if (b.second || b.hero || b.gone || whole.cone || !whole.tall || whole.tall < TOWER_FROM || whole.tall <= whole.h) continue;
    const az = lensAz(whole.x, whole.z);
    if ((az > FRAMED[0] && az < FRAMED[1]) || Math.hypot(whole.x - CONTACT_LENS[0], whole.z - CONTACT_LENS[1]) < 260) continue;
    if (b.block) lots[i + 1] = { ...lots[i + 1], gone: true };
    reform(i, { ...whole, h: whole.tall, free: true, block: undefined });
  }
  // And behind the last dealt lot, past the grid's edge, a further layer:
  // megabuildings a mile off, dark against the horizon, their windows
  // pinpoints, a red lamp on each. Not up the hero's avenue, where the band
  // of sky is the landmark towers'; and from each framed lens no taller
  // than the elevation its picture has room for (under Contact's moon,
  // clear of its lower edge and of the five towers that reach it).
  for (let gx = -1320; gx < 1920; gx += 92) {
    for (let gz = -2120; gz < 1320; gz += 92) {
      const x = gx + (ring() - 0.5) * 50;
      const z = gz + (ring() - 0.5) * 50;
      const [w, d, k, skip] = [38 + ring() * 44, 38 + ring() * 44, ring(), ring()];
      const out = Math.max(-940 - x, x - 1530, -1740 - z, z - 916);
      if (out < 36 || skip < 0.22 || (10 - z > 0 && Math.abs(x - 0.6) < (10 - z) * 0.9)) continue;
      let h = 150 + 190 * Math.pow(k, 1.4) + out * 0.25;
      for (const [lx, ly, lz, a0, a1, elevation] of FAR_UNDER) {
        const a = Math.atan2(z - lz, x - lx) * (180 / Math.PI);
        if (a > a0 && a < a1) h = Math.min(h, (ly + Math.hypot(x - lx, z - lz) * Math.tan(elevation * (Math.PI / 180))) * (0.56 + 0.44 * k));
      }
      lots.push({ x, z, w, d, h, yaw: (ring() - 0.5) * 0.3, free: false, cone: false, hero: false, far: true });
      forms.push({ ...formOf(lots[lots.length - 1], ring), style: 6, screen: 0 });
      kitOf.push(null);
      beaconOf.push(Math.floor(ring() * 3));
    }
  }

  // Outside what the page's lenses frame that layer is not a fence: one
  // in four is left out (gaps), the rest stand anything from a hundred
  // metres to four hundred and more, and one in twelve is a landmark, half
  // as tall again, a quarter wider. Each keeps its draws, so within those
  // frames every one is where and as it was: Contact's, the rooftop's
  // (west-north-west from its lens) and the garage street's (south from
  // its own); lens x, z and the bearings it frames, with a margin.
  const FAR_AS_DEALT = [[CONTACT_LENS[0], CONTACT_LENS[1], FRAMED[0], FRAMED[1]], [476, -266, 169, 181], [476, -266, -181, -112], [437, -292, 41, 127]];
  lots.forEach((b, i) => {
    if (!b.far) return;
    if (FAR_AS_DEALT.some(([lx, lz, a0, a1]) => {
      const a = Math.atan2(b.z - lz, b.x - lx) * (180 / Math.PI);
      return a > a0 && a < a1;
    })) return;
    const own = at(b);
    if (hash11(own + 71.1) < 0.26) {
      lots[i] = { ...b, gone: true };
      return;
    }
    const out = Math.max(-940 - b.x, b.x - 1530, -1740 - b.z, b.z - 916);
    const k = hash11(own + 73.3);
    const landmark = hash11(own + 75.5) < 0.085;
    let h = landmark ? 420 + 150 * k + out * 0.2 : 105 + 300 * k * k + out * 0.25;
    let capped = false;
    for (const [lx, ly, lz, a0, a1, elevation] of FAR_UNDER) {
      const a = Math.atan2(b.z - lz, b.x - lx) * (180 / Math.PI);
      const most = (ly + Math.hypot(b.x - lx, b.z - lz) * Math.tan(elevation * (Math.PI / 180))) * (0.56 + 0.44 * k);
      if (a > a0 && a < a1 && h > most) {
        h = most;
        capped = true;
      }
    }
    const grow = h / b.h;
    const wider = landmark && !capped ? 1.25 : 1;
    lots[i] = { ...b, h, w: b.w * wider, d: b.d * wider, landmark: landmark && !capped };
    forms[i] = { ...forms[i], tiers: forms[i].tiers.map((t) => t * grow), roof: h };
  });

  // Landmarks nearer in, where a view east, south or south-west from the
  // kit had none: megabuildings stepped back three times, their frames
  // braced across every face, lit at each step. Each stands outside what
  // Contact frames, outside the hero's cone and under no other lens's cap,
  // and whatever was dealt onto its ground is left out. x, z, width,
  // depth, height.
  const LANDMARKS = [
    [760, -250, 64, 58, 330],
    [930, -170, 56, 60, 270],
    [800, -520, 60, 60, 380],
    [300, 330, 62, 66, 340],
    [470, 520, 58, 58, 300],
    [-330, 260, 66, 60, 360],
  ];
  for (const [x, z, w, d, h] of count < 2000 ? LANDMARKS.slice(0, 4) : LANDMARKS) {
    lots.forEach((b, i) => {
      if (b.gone || b.hero) return;
      const [cs, sn] = [Math.abs(Math.cos(b.yaw)), Math.abs(Math.sin(b.yaw))];
      if (Math.abs(b.x - x) < (w + b.w * cs + b.d * sn) / 2 + 5 && Math.abs(b.z - z) < (d + b.w * sn + b.d * cs) / 2 + 5) lots[i] = { ...b, gone: true };
    });
    lots.push({ x, z, w, d, h, yaw: 0, free: true, cone: false, hero: false, landmark: true });
    forms.push({ tiers: [h * 0.09, h * 0.5, h * 0.26, h * 0.15], inset: [1, 0.86, 0.66, 0.44], offset: [0, 0, 0, 0], chamfer: 0.12, style: 4, parapet: 1.2, screen: 0, roof: h, spire: 0 });
    kitOf.push(null);
    beaconOf.push(lots.length % 3);
  }

  // ---- the first streets past the kit -----------------------------------------
  // Where the far city meets the kit a walker on the loop sees its first
  // rows from across a street. There each block of the grid is a paved slab
  // with a kerb, the buildings dealt onto it are moved and, where they must
  // be, narrowed to stand on it with a pavement round them (their height is
  // what it was), a post stands under every lamp the dome lights, and cars
  // are parked along the kerbs. Not in the quarter Contact and the boston
  // clue look into, nor north of the megabuilding in the hero's band of sky,
  // where every lot stays where it was dealt.
  const kitRects = [...KEEP_OUT, ...KEEP_OUT_SINCE];
  const solid = [...kitRects, ...keepOut];
  const kitGap = (x, z) => Math.min(...kitRects.map(([x0, z0, x1, z1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1))));
  const dressedAt = (x, z) => kitGap(x, z) < DRESSED && !(x > 430 && z > -212) && !(z < -700 && x > -110 && x < 150);
  const clearOf = (x, z, m) => !solid.some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
  const inCell = new Map();
  lots.forEach((b, i) => {
    if (b.gone || b.far || b.hero || b.extra) return;
    const o = b.block ?? b;
    const key = Math.round((o.x + 900) / cell) * 1000 + Math.round((o.z + 1700) / cell);
    if (!inCell.has(key)) inCell.set(key, []);
    inCell.get(key).push(i);
  });
  const half = (b) => {
    const [cs, sn] = [Math.abs(Math.cos(b.yaw)), Math.abs(Math.sin(b.yaw))];
    return [(b.w * cs + b.d * sn) / 2, (b.w * sn + b.d * cs) / 2];
  };
  const boxes = [];
  const box = (kind, x, y, z, sx, sy, sz, turn = 0, own = [0, 0, 0]) => boxes.push(x, y, z, turn, sx, sy, sz, kind, ...own, 0);
  const KERB = 0.16;
  for (let i = 0; i < 53; i++) {
    for (let j = 0; j < 57; j++) {
      const [gx, gz] = [i * cell - 900, j * cell - 1700];
      if (!dressedAt(gx, gz)) continue;
      // The slab: the block inside its four roads, cut back from the kit.
      let slab = [gx - 17, gz - 17, gx + 17, gz + 17];
      for (const [x0, z0, x1, z1] of solid) {
        const k = [x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5];
        if (!(slab[2] > k[0] && slab[0] < k[2] && slab[3] > k[1] && slab[1] < k[3])) continue;
        const area = (c) => Math.max(0, c[2] - c[0]) * Math.max(0, c[3] - c[1]);
        slab = [[slab[0], slab[1], Math.min(slab[2], k[0]), slab[3]], [Math.max(slab[0], k[2]), slab[1], slab[2], slab[3]],
          [slab[0], slab[1], slab[2], Math.min(slab[3], k[1])], [slab[0], Math.max(slab[1], k[3]), slab[2], slab[3]]].sort((a, b) => area(b) - area(a))[0];
      }
      const [sw, sd] = [slab[2] - slab[0], slab[3] - slab[1]];
      if (Math.min(sw, sd) >= 4) box(BOX.slab, (slab[0] + slab[2]) / 2, KERB / 2, (slab[1] + slab[3]) / 2, sw, KERB, sd);
      // Its buildings, onto it with 2.6 m of pavement round them.
      const group = inCell.get(i * 1000 + j) ?? [];
      if (group.length && Math.min(sw, sd) >= 11.2) {
        let [x0, z0, x1, z1] = [1e9, 1e9, -1e9, -1e9];
        for (const k of group) {
          const b = lots[k];
          const [ex, ez] = half(b);
          [x0, z0, x1, z1] = [Math.min(x0, b.x - ex), Math.min(z0, b.z - ez), Math.max(x1, b.x + ex), Math.max(z1, b.z + ez)];
        }
        const [kx, kz] = [Math.min(1, ((sw - 5.2) / (x1 - x0)) * 0.97), Math.min(1, ((sd - 5.2) / (z1 - z0)) * 0.97)];
        const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
        const [hx, hz] = [((x1 - x0) * kx) / 2, ((z1 - z0) * kz) / 2];
        const nx = Math.min(Math.max(mx, slab[0] + 2.6 + hx), slab[2] - 2.6 - hx);
        const nz = Math.min(Math.max(mz, slab[1] + 2.6 + hz), slab[3] - 2.6 - hz);
        for (const k of group) {
          const b = lots[k];
          // Where it was dealt stays its own (its look is hashed from it).
          lots[k] = { ...b, ox: b.x, oz: b.z, x: nx + (b.x - mx) * kx, z: nz + (b.z - mz) * kz, w: b.w * kx, d: b.d * kz };
          if (kitOf[k]) {
            const [cx, cz] = topCentre(lots[k], forms[k]);
            kitOf[k].at[0] = cx;
            kitOf[k].at[2] = cz;
            kitOf[k].look[0] *= Math.min(kx, kz);
          }
        }
      }
      // A post under every lamp on the block's four kerbs (the dome lights
      // a lamp here by the same rule, kerbLamps): not in a junction, not on
      // the kit's ground. And now and then a car at the kerb.
      for (const [alongZ, side] of [[1, 1], [1, -1], [0, 1], [0, -1]]) {
        const streetAt = (alongZ ? gx : gz) - side * 23;
        const mid = alongZ ? gz : gx;
        const index = Math.round((streetAt + (alongZ ? 877 : 1677)) / cell);
        const place = (across, along) => (alongZ ? [streetAt + side * across, along] : [along, streetAt + side * across]);
        for (let a = Math.ceil((mid - 16.4) / 11.5); a * 11.5 <= mid + 16.4; a++) {
          const [px, pz] = place(6.5, a * 11.5);
          if (!clearOf(px, pz, 1.1)) continue;
          box(BOX.post, px, KERB + 3.1, pz, 0.16, 6.2, 0.16);
          const [ax, az] = place(5.0, a * 11.5);
          box(BOX.head, ax, KERB + 6.25, az, alongZ ? 3.1 : 0.36, 0.22, alongZ ? 0.36 : 3.1, 0, [index, alongZ ? 0 : 1, -side]);
        }
        // Who is out on this pavement: up to three people along it, half
        // of them under an umbrella, and on one kerb in three a vending
        // machine against the wall. (By the hash, not the stream: the cars
        // below keep their draws.)
        const onSlab = (x, z) => x > slab[0] + 0.4 && x < slab[2] - 0.4 && z > slab[1] + 0.4 && z < slab[3] - 0.4;
        const here = hash11(f32(gx * 0.37 + gz * 0.61 + (alongZ ? 3.1 : 7.7) + side));
        for (let k = 0; k < Math.floor(here * 4); k++) {
          const hk = hash11(here * 91.7 + k * 13.3);
          const [qx, qz] = place(6.9 + 1.4 * hash11(hk * 57.1), mid + (hk - 0.5) * 30);
          if (!onSlab(qx, qz) || !clearOf(qx, qz, 1.2)) continue;
          const tall = 1.58 + 0.24 * hash11(hk * 31.9);
          box(BOX.person, qx, KERB + tall / 2, qz, 0.46, tall, 0.3, hk * 6.283, [hash11(hk * 17.3), 0, 0]);
          if (hash11(hk * 23.9) < 0.5) box(BOX.umbrella, qx, KERB + tall + 0.32, qz, 1.1, 0.1, 1.1, hk * 3.1, [hash11(hk * 41.3), 0, 0]);
        }
        if (here > 0.66) {
          const [vx, vz] = place(8.25, mid + (hash11(here * 7.7) - 0.5) * 24);
          if (onSlab(vx, vz) && clearOf(vx, vz, 1.2)) box(BOX.vending, vx, KERB + 0.95, vz, 1.1, 1.9, 0.7, alongZ ? Math.PI / 2 : 0, [hash11(here * 19.1), 0, 0]);
        }
        if (ring() < 0.5) {
          const [cx, cz] = place(4.85, mid + (ring() - 0.5) * 22);
          const [paint, turn, nose] = [ring(), alongZ ? Math.PI / 2 : 0, ring() < 0.5 ? 1 : -1];
          if (!clearOf(cx, cz, 3)) continue;
          box(BOX.car, cx, 0.2 + 0.36, cz, 4.4, 0.72, 1.8, turn, [paint, nose, 0]);
          box(BOX.cabin, cx + (alongZ ? 0 : -0.3 * nose), 0.92 + 0.27, cz + (alongZ ? 0.3 * nose : 0), 2.3, 0.54, 1.62, turn, [paint, 0, 0]);
        }
      }
    }
  }
  // Past the gate that closes the avenue's south arm the street goes on
  // (the grid's street along x -3): a checkpoint's gantry stands over it,
  // two posts, a beam, a lit board, a floodlit bar under the beam; and
  // seventy metres past the gate a bridge crosses the street on two
  // pylons, thirty metres up, two floors of lit windows in a truss with
  // boards standing on it, so that over the gate (which hides the street)
  // the city is seen to carry on.
  for (const [gz, seed] of [[246, 0.77]]) {
    for (const e of [-8.5, 8.5]) box(BOX.steel, -3 + e, 4.8, gz, 0.6, 9.6, 0.6);
    box(BOX.steel, -3, 9.3, gz, 18, 0.7, 0.9);
    box(BOX.board, -3, 11.6, gz, 11, 3.2, 0.5, 0, [seed, Math.floor(seed * 16), 0]);
    box(BOX.head, -3, 8.7, gz, 14, 0.22, 0.4, 0, [1, 1, 1]);
  }
  for (const e of [-7.6, 7.6]) box(BOX.steel, -3 + e, 15, 168, 2.2, 30, 2.2, 0, [0.3, 0, 0]);
  box(BOX.deck, -3, 33.8, 168, 46, 7.6, 9, 0, [0.42, 0, 0]);
  box(BOX.board, -12, 43.2, 168, 16, 8.4, 0.7, 0, [0.63, 3, 0]);
  box(BOX.board, 9, 41.4, 168, 12, 4.8, 0.7, 0, [0.18, 12, 0]);

  // ---- the towers' heads, and what spans between them ------------------------
  // One crown stood on tower after tower: the dark glass box with lit edges.
  // Two keep it. The rest are a setback floor like any other, and the roofs
  // nothing capped carry what a tower's roof carries, each its own: a mast
  // with its yards, a cluster of aerials, dishes on a hut, a penthouse
  // stepped back twice, all boxes in the street's draw. Within what Contact
  // frames every tower is as it was, and up the hero's avenue nothing rises
  // above a roof.
  const top = rng(8801);
  const framed = (b) => {
    const az = lensAz(b.ox ?? b.x, b.oz ?? b.z);
    return az > FRAMED[0] && az < FRAMED[1];
  };
  const tips = [];
  // Which towers this gives a head (the rest are given one further down).
  const crowned = new Set();
  let glassCrowns = 0;
  lots.forEach((b, i) => {
    const s = forms[i];
    if (b.gone || b.far || b.hero || b.screens || b.h < TOWER_FROM || framed(b)) return;
    if (s.style === 3) {
      const gap = gapOf(b);
      if (glassCrowns < 2 && b.free && gap > 150 && gap < 420) glassCrowns++;
      else forms[i] = { ...s, style: 0, parapet: 0.7 };
    }
    const roll = top();
    const [t, turn, k1, k2] = [topTier(s), b.yaw + Math.floor(top() * 4) * (Math.PI / 2), top(), top()];
    if (forms[i].style === 2 || forms[i].style === 3) crowned.add(i);
    if (!b.free || forms[i].style === 2 || forms[i].style === 3 || kitOf[i] || roll < 0.18) return;
    crowned.add(i);
    const [fw, fd] = [b.w * s.inset[t], b.d * s.inset[t]];
    const r0 = Math.min(fw, fd);
    const [cx, cz] = topCentre(b, s);
    const y = s.roof;
    const at = (lx, lz) => [cx + Math.cos(turn) * lx + Math.sin(turn) * lz, cz - Math.sin(turn) * lx + Math.cos(turn) * lz];
    if (roll < 0.42) {
      // A mast: a hut, the mast, two yards across it, a lamp at its tip.
      const tall = Math.min(b.h * 0.3, 16 + 34 * k1);
      const [mx, mz] = at(r0 * 0.18, -r0 * 0.12);
      box(BOX.block, mx, y + 1.6, mz, r0 * 0.34, 3.2, r0 * 0.3, turn, [k2, 0, 0]);
      box(BOX.steel, mx, y + 3.2 + tall / 2, mz, 1.3, tall, 1.3, turn);
      box(BOX.steel, mx, y + 3.2 + tall * 0.55, mz, 5.4, 0.4, 0.4, turn);
      box(BOX.steel, mx, y + 3.2 + tall * 0.78, mz, 0.4, 0.4, 3.8, turn);
      tips.push(mx, y + 3.2 + tall + 0.5, mz);
    } else if (roll < 0.62) {
      // Aerials: a rack and four or five whips of different heights.
      const [ax, az] = at(-r0 * 0.15, r0 * 0.1);
      box(BOX.block, ax, y + 0.9, az, r0 * 0.42, 1.8, r0 * 0.2, turn, [k2, 0, 0]);
      for (let a = 0; a < 5; a++) {
        const whip = 6 + 16 * top();
        const [wx, wz] = at(-r0 * 0.15 + (a - 2) * r0 * 0.09, r0 * 0.1);
        if (a === 2 && k1 < 0.4) continue;
        box(BOX.steel, wx, y + 1.8 + whip / 2, wz, 0.5, whip, 0.5, turn);
        if (a === 0) tips.push(wx, y + 1.8 + whip + 0.4, wz);
      }
    } else if (roll < 0.8) {
      // Dishes: a hut, a short mast, three panels facing out.
      const [hx, hz] = at(0, 0);
      box(BOX.block, hx, y + 1.5, hz, r0 * 0.3, 3.0, r0 * 0.3, turn, [k2, 0, 0]);
      box(BOX.steel, hx, y + 3 + 4.5, hz, 0.9, 9, 0.9, turn);
      for (const [dx, dz, dy, face] of [[1.6, 0, 4, 0], [-1.6, 0.4, 6.4, 0], [0, 1.6, 8, 1]]) {
        const [px2, pz2] = at(dx, dz);
        box(BOX.steel, px2, y + 3 + dy, pz2, face ? 2.8 : 0.35, 2.8, face ? 0.35 : 2.8, turn, [1, 0, 0]);
      }
      tips.push(hx, y + 12.5, hz);
    } else {
      // A penthouse stepped back twice, a line of light under each roof.
      const h1 = 5 + 4 * k1;
      const [qx, qz] = at(r0 * 0.08 * (k2 - 0.5), 0);
      box(BOX.block, qx, y + h1 / 2, qz, fw * 0.62, h1, fd * 0.62, b.yaw, [k2, 1, 0]);
      box(BOX.block, qx, y + h1 + 2, qz, fw * 0.34, 4, fd * 0.34, b.yaw, [k1, 1, 0]);
      tips.push(qx, y + h1 + 4.6, qz);
    }
  });
  // Megastructures: three decks at mid height between two towers a block or
  // two apart, two floors of lit windows in a truss, and standing on each a
  // stack of boards. Only between towers nothing capped, clear of the framed
  // skies, and over whatever stands between them.
  const spans = [];
  const piers = lots.map((b, i) => ({ b, i })).filter(({ b, i }) => b.free && !b.gone && !b.far && !b.screens && !b.cone && !underMoon(b) && b.h >= 110 && forms[i].style !== 2 && gapOf(b) > 120 && gapOf(b) < 520);
  for (const p of piers) {
    for (const q of piers) {
      if (q.i <= p.i) continue;
      const [dx, dz] = [q.b.x - p.b.x, q.b.z - p.b.z];
      const len = Math.hypot(dx, dz);
      if (len < 70 || len > 150 || Math.min(Math.abs(dx), Math.abs(dz)) > 16) continue;
      const y = Math.min(p.b.h, q.b.h) * (0.46 + 0.14 * top());
      const [mx, mz] = [(p.b.x + q.b.x) / 2, (p.b.z + q.b.z) / 2];
      if (lots.some((b) => !b.gone && b !== p.b && b !== q.b && Math.hypot(b.x - mx, b.z - mz) < len / 2 && b.h > y - 6)) continue;
      spans.push({ mx, mz, len, y, turn: Math.atan2(-dz, dx), sector: sectorOf(p.b), gap: gapOf(p.b) });
    }
  }
  spans.sort((a, b) => a.gap - b.gap);
  const spanned = [];
  for (const sp of spans) {
    if (spanned.length === 3 || spanned.some((o) => Math.abs(o.sector - sp.sector) < 4 || Math.abs(o.sector - sp.sector) > SECTORS - 4)) continue;
    spanned.push(sp);
    const along = (a, across = 0) => [sp.mx + Math.cos(sp.turn) * a + Math.sin(sp.turn) * across, sp.mz - Math.sin(sp.turn) * a + Math.cos(sp.turn) * across];
    box(BOX.deck, sp.mx, sp.y, sp.mz, sp.len, 7.6, 10, sp.turn, [top(), 0, 0]);
    for (const [a, w, h, up, across] of [[-0.24, 0.3, 11, 0, 3], [0.1, 0.26, 9, 0, -3], [0.3, 0.2, 13, 0, 3.4], [-0.02, 0.22, 8, 10.4, -3]]) {
      const [bx2, bz2] = along(a * sp.len, across);
      const kb = top();
      box(BOX.board, bx2, sp.y + 3.8 + 1.2 + up + h / 2, bz2, w * sp.len, h, 0.7, sp.turn, [kb, Math.floor(kb * 977) % 24, 0]);
      for (const e of [-0.4, 0.4]) {
        const [px2, pz2] = along(a * sp.len + e * w * sp.len, across);
        box(BOX.steel, px2, sp.y + 3.8 + (1.2 + up) / 2, pz2, 0.5, 1.2 + up, 0.5, sp.turn);
      }
    }
    for (const e of [-0.5, 0.5]) tips.push(...along(e * sp.len * 0.9).flatMap((v, k) => (k ? [sp.y + 4.4, v] : [v])));
  }

  // AVs over the far city: lanes west, south and east of the kit, a
  // hundred and more metres up, each AV a body in the boxes' draw between a
  // white lamp ahead and a red one behind (the aviation lamps' draw), going
  // along its lane and round again. Every lane keeps outside the hero's
  // view up the avenue and the quarter Contact looks into.
  // A lane: where it starts (x, y, z), which way it goes (x, z), how long.
  const AIR_LANES = [
    [-430, 130, 420, 0, -1, 800],
    [-462, 152, -380, 0, 1, 800],
    [-430, 112, 330, 1, 0, 760],
    [330, 138, 362, -1, 0, 760],
    [780, 142, -280, 0, -1, 520],
    [812, 122, -800, 0, 1, 520],
    [-700, 180, 200, 0.6, -0.8, 600],
    [700, 150, -380, 0.45, -0.893, 600],
    [-520, 148, 60, 0.8, 0.6, 620],
    // Three nearer the kit, between its edge and the first megatowers:
    // down the west side, along the south (no further east than Contact's
    // quarter begins) and up the east past the boulevard's end.
    [-262, 96, 300, 0, -1, 960],
    [-200, 104, 142, 1, 0, 610],
    [622, 118, -900, 0, 1, 640],
  ];
  const avs = [];
  for (const [x, y, z, dx, dz, length] of AIR_LANES) {
    // A lane is a file of craft sixty to eighty metres apart, not one or
    // two: ten to a lane (five on a phone).
    const each = count < 2000 ? 5 : 10;
    for (let i = 0; i < each; i++) {
      const phase = (i + edit() * 0.6) / each;
      avs.push([x, y, z, dx, dz, length, phase]);
      box(BOX.av, x, y, z, 6.4, 1.5, 2.8, Math.atan2(-dz, dx), [length, phase, edit()]);
    }
  }

  // ---- every tower its own face ------------------------------------------------
  // A tower is one of eight kinds, and no two neighbours are the same kind:
  // amber offices, a cyan curtain wall, a pale slab between piers, homes, a
  // teal lattice, dark glass under lines of light, floors of sodium yellow,
  // glass in vertical strips. Its floors are lit in zones (see the shader).
  // And each wears one thing a street away can name it by, on the face that
  // looks at the kit: a screen a dozen floors high, a vertical sign, a board
  // under the roof, light up its corners. Dealt nearest the kit first, each
  // taking the first of its own order of kinds (and of adverts) that nothing
  // beside it has. A block of ten floors or more is dealt a kind too (homes,
  // offices, a slab, yellow floors, strips) and nothing to wear. Within what
  // Contact frames a building keeps its form and what hangs on it, and is
  // lit by its kind only for an eye above the roofs (the shader's `lift`):
  // from the garage's roof it is as it was.
  const KINDS = 8;
  const FEATURE = { none: 0, screen: 1, blade: 2, mark: 3, strips: 4 };
  const faces = lots.map(() => null);
  const bucket = new Map();
  const bucketOf = (b) => Math.floor(b.x / 160) * 4096 + Math.floor(b.z / 160);
  const beside = (b, reach) => {
    const out = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const j of bucket.get(bucketOf({ x: b.x + dx * 160, z: b.z + dz * 160 })) ?? []) if (Math.hypot(lots[j].x - b.x, lots[j].z - b.z) < reach) out.push(faces[j]);
      }
    }
    return out;
  };
  const order = (seed, n) => Array.from({ length: n }, (_, k) => k).sort((p, q) => hash11(seed + p * 1.31) - hash11(seed + q * 1.31));
  lots.map((b, i) => i)
    .filter((i) => lots[i].h >= 30 && !lots[i].gone && !lots[i].screens)
    .sort((p, q) => gapOf(lots[p]) - gapOf(lots[q]) || p - q)
    .forEach((i) => {
      const b = lots[i];
      const own = at(b);
      const gap = gapOf(b);
      const [close, around, wide] = [beside(b, 80), beside(b, 150), beside(b, 300)];
      const first = (list, ...taken) => taken.map((t) => list.find((k) => !t.includes(k))).find((k) => k !== undefined) ?? list[0];
      // (A megabuilding past the grid is dealt a kind and a band and
      // nothing else: it keeps the dark glass it was drawn with, and its
      // frame's braces.)
      const tower = b.h >= TOWER_FROM && !b.far;
      const kind = first(tower ? order(own + 41.7, KINDS) : order(own + 41.7, 5).map((k) => [3, 0, 2, 6, 7][k]), around.map((o) => o.kind), close.map((o) => o.kind));
      const held = framed(b) || b.hero;
      // What it is known by. A screen needs a face wide enough to carry one
      // and a tower tall enough to hold it over the roofs in front.
      const s = forms[i];
      const tallest = s.tiers[1] > s.tiers[0] ? (s.tiers[2] > s.tiers[1] ? 2 : 1) : 0;
      const faceW = Math.min(b.w, b.d) * s.inset[tallest];
      const can = [FEATURE.strips, FEATURE.none];
      if (b.h >= 70) can.unshift(FEATURE.blade);
      if (b.h >= 90 && faceW >= 13) can.unshift(FEATURE.mark);
      if (b.h >= 75 && faceW >= 15 && s.style !== 2) can.unshift(FEATURE.screen);
      const roll = hash11(own + 43.9);
      const weights = gap < 450 ? [0.17, 0.3, 0.24, 0.2, 0.09] : [0.46, 0.1, 0.2, 0.12, 0.12];
      let want = FEATURE.none;
      for (let k = 0, sum = 0; k < 5; k++) {
        sum += weights[k];
        if (roll < sum) {
          want = k;
          break;
        }
      }
      // Dark glass has to wear something.
      if (kind === 5 && (want === FEATURE.none || want === FEATURE.strips)) want = FEATURE.screen;
      if (!can.includes(want)) want = can[0];
      if (!tower || held) want = FEATURE.none;
      const big = (k) => k === FEATURE.screen || k === FEATURE.mark;
      if (big(want) && close.some((o) => o.feature === want)) want = can.find((k) => !big(k)) ?? FEATURE.none;
      // (One of eight pairs of adverts: its screen shows one of the pair,
      // a sign on its roof the other.)
      const shown = (list) => list.filter((o) => o.feature === FEATURE.screen || o.feature === FEATURE.mark).map((o) => o.ad);
      const ad = first(order(own + 47.3, 8), shown(wide), shown(around), shown(close));
      const tone = hash11(own + 51.1);
      // Which way the kit is from here: the face that wears it.
      const [kx, kz] = kitRects.map(([x0, z0, x1, z1]) => [Math.min(Math.max(b.x, x0), x1) - b.x, Math.min(Math.max(b.z, z0), z1) - b.z]).sort((p, q) => Math.hypot(...p) - Math.hypot(...q))[0];
      faces[i] = {
        kind,
        feature: want,
        ad,
        // The face by its own plan (0 +x, 1 +z, 2 -x, 3 -z), and by the
        // compass the shader reads off a wall's normal.
        face: Math.abs(kx) >= Math.abs(kz) ? (kx > 0 ? 0 : 2) : kz > 0 ? 1 : 3,
        compass: ((Math.round((Math.atan2(kz, kx) + Math.PI) / (Math.PI / 2)) % 4) + 4) % 4,
        // Its accent (its lines, its corners, the band under its roof):
        // amber, cyan, pale, pink, teal or yellow.
        accent: tone < 0.3 ? 1 : tone < 0.58 ? 0 : tone < 0.73 ? 2 : tone < 0.83 ? 4 : tone < 0.92 ? 3 : 5,
        band: (tower && !held && (kind === 5 || hash11(own + 53.3) < 0.45)) || (b.far && (b.landmark || hash11(own + 53.3) < 0.55)) || b.landmark === true,
        strips: tower && !held && want === FEATURE.strips,
        worn: tower && !held,
        braced: b.far || b.landmark === true,
      };
      lots[i] = { ...b, kind };
      if (!bucket.has(bucketOf(b))) bucket.set(bucketOf(b), []);
      bucket.get(bucketOf(b)).push(i);
      if (faces[i].worn) forms[i] = { ...s, screen: want === FEATURE.screen ? 1 + Math.floor(hash11(own + 55.5) * 4) : 0 };
    });
  // And a head on every tower nothing capped that has none yet (the first
  // pass left a roof in five bare, and every roof with plant on it): a
  // lattice mast in three sections with a red lamp on each, a sign on a
  // steel frame along the roof's edge toward the kit, a spire stepped in
  // three with its lamps, an open crown of trusses under a line of light.
  // No two neighbours the same, as with the faces.
  const crownRng = rng(7117);
  const HEAD = { mast: 0, sign: 1, spire: 2, truss: 3 };
  const headBucket = new Map();
  lots.forEach((b, i) => {
    const dealt = faces[i];
    if (!dealt?.worn || !b.free || crowned.has(i)) return;
    const s = forms[i];
    const t = topTier(s);
    const [fw, fd] = [b.w * s.inset[t], b.d * s.inset[t]];
    const r0 = Math.min(fw, fd);
    const [k1, k2, k3] = [crownRng(), crownRng(), crownRng()];
    if (r0 < 8) return;
    const key = bucketOf(b);
    const taken = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const [j, h] of headBucket.get(bucketOf({ x: b.x + dx * 160, z: b.z + dz * 160 })) ?? []) if (Math.hypot(lots[j].x - b.x, lots[j].z - b.z) < 130) taken.push(h);
      }
    }
    const head = b.landmark ? HEAD.mast : (order(at(b) + 61.3, 4).find((h) => !taken.includes(h)) ?? Math.floor(k3 * 4));
    if (!headBucket.has(key)) headBucket.set(key, []);
    headBucket.get(key).push([i, head]);
    lots[i] = { ...lots[i], crown: head };
    const [cx, cz] = topCentre(b, s);
    const y = s.roof;
    const at2 = (lx, lz) => [cx + Math.cos(b.yaw) * lx + Math.sin(b.yaw) * lz, cz - Math.sin(b.yaw) * lx + Math.cos(b.yaw) * lz];
    if (head === HEAD.mast) {
      // Three sections, each narrower, a lamp at each one's top.
      const tall = b.landmark ? 46 + 24 * k1 : Math.min(b.h * 0.34, 20 + 30 * k1);
      const [mx, mz] = at2(r0 * 0.2 * (k2 - 0.5), r0 * 0.2 * (k3 - 0.5));
      let foot = y;
      for (const [share, width] of [[0.42, 3.4], [0.34, 2.3], [0.24, 1.3]]) {
        box(BOX.lattice, mx, foot + (tall * share) / 2, mz, width, tall * share, width, b.yaw);
        foot += tall * share;
        tips.push(mx, foot + 0.3, mz);
      }
      box(BOX.steel, mx, foot + 2.5, mz, 0.3, 5, 0.3, b.yaw);
    } else if (head === HEAD.sign) {
      // A board the width of the roof, on a frame, facing the kit.
      const alongX = dealt.face % 2 === 0;
      const out = dealt.face < 2 ? 1 : -1;
      const width = (alongX ? fd : fw) * 0.86;
      const high = Math.min(Math.max(width * 0.3, 4.5), 11);
      const reach = (alongX ? fw : fd) * 0.5 - 1.2;
      const [sx, sz] = alongX ? at2(out * reach, 0) : at2(0, out * reach);
      const turn = b.yaw + (alongX ? Math.PI / 2 : 0);
      // (Its face is toward the kit; the other side is its back.)
      box(BOX.board, sx, y + 2.6 + high / 2, sz, width, high, 0.8, turn, [k1, dealt.ad + 8, out > 0 ? 1 : 2]);
      for (const e of [-0.42, 0, 0.42]) {
        const [px2, pz2] = alongX ? at2(out * reach, e * width) : at2(e * width, out * reach);
        box(BOX.steel, px2, y + (2.6 + high) / 2, pz2, 0.45, 2.6 + high, 0.45, turn);
      }
    } else if (head === HEAD.spire) {
      const tall = Math.min(b.h * 0.3, 18 + 26 * k1);
      let foot = y;
      for (const [share, width] of [[0.3, r0 * 0.3], [0.3, r0 * 0.16], [0.4, Math.max(0.5, r0 * 0.05)]]) {
        box(BOX.steel, cx, foot + (tall * share) / 2, cz, width, tall * share, width, b.yaw, [0.4, 0, 0]);
        foot += tall * share;
        tips.push(cx, foot + 0.3, cz);
      }
    } else {
      // An open crown: a ring of trusses round the roof, a lit line on it.
      const high = 6 + 6 * k1;
      box(BOX.lattice, cx, y + high / 2, cz, fw * 0.94, high, fd * 0.94, b.yaw);
      box(BOX.block, cx, y + high + 0.6, cz, fw * 0.98, 1.2, fd * 0.98, b.yaw, [k2, 1, 0]);
      tips.push(...at2(fw * 0.45, fd * 0.45).flatMap((v, k) => (k ? [y + high + 1.6, v] : [v])));
    }
  });
  // The landmarks past the grid carry a mast too, and a lamp at each of
  // its sections and on the corners of their roofs.
  lots.forEach((b, i) => {
    if (!b.far || !b.landmark || b.gone) return;
    const s = forms[i];
    const [cx, cz] = topCentre(b, s);
    const tall = 50 + 30 * hash11(at(b) + 63.1);
    let foot = s.roof;
    for (const [share, width] of [[0.42, 5.0], [0.34, 3.4], [0.24, 1.8]]) {
      box(BOX.lattice, cx, foot + (tall * share) / 2, cz, width, tall * share, width, b.yaw);
      foot += tall * share;
      tips.push(cx, foot + 0.3, cz);
    }
    const t = topTier(s);
    for (const [ex, ez] of [[-1, -1], [1, 1]]) tips.push(cx + ex * b.w * s.inset[t] * 0.45, s.roof + 1, cz + ez * b.d * s.inset[t] * 0.45);
  });

  // The dome's lamps, as GLSL the slabs share: a lamp every eleven and a
  // half metres down each kerb, a pool of light under it. Past a pixel a
  // lamp is spread into its street rather than sparkling. On the dressed
  // streets a lamp is lit where a post stands, by the rule above.
  const g1 = (v) => v.toFixed(1);
  // Santo Domingo's air is sodium (glsl.js, santoAt), over its own ground:
  // from the air it was a sheet of orange with a straight edge where the
  // far city's ground began. Past that edge the far city carries it on,
  // thinning over a few hundred metres, low over the ground.
  const BEYOND = /* glsl */ `
      vec3 sodiumBeyond(vec3 col, vec3 p) {
        vec2 away = max(max(vec2(170.0, -176.0) - p.xz, p.xz - vec2(490.0, 48.0)), 0.0);
        // (For an eye above the roofs: from the street it was never a sheet.)
        float k = exp(-length(away) / 130.0) * (1.0 - santoAt(p.xz)) * exp(-max(p.y, 0.0) * 0.035) * uHaze * smoothstep(40.0, 62.0, uCam.y);
        return mix(col, SODIUM, k * 0.62 * smoothstep(20.0, 200.0, length(p - uCam)));
      }
  `;
  const STREET = /* glsl */ `
${BEYOND}
      float kitGap(vec2 p) {
        float g = 1e5;
${kitRects.map(([x0, z0, x1, z1]) => `        g = min(g, length(max(max(vec2(${g1(x0)}, ${g1(z0)}) - p, p - vec2(${g1(x1)}, ${g1(z1)})), 0.0)));`).join("\n")}
        return g;
      }
      float dressedAt(vec2 p) {
        // (Nowhere near the kit: not worth the rectangles.)
        if (p.x < -320.0 || p.x > 655.0 || p.y < -945.0 || p.y > 270.0) return 0.0;
        return step(kitGap(p), ${DRESSED}) * (1.0 - step(430.0, p.x) * step(-212.0, p.y)) * (1.0 - step(p.y, -700.0) * step(-110.0, p.x) * step(p.x, 150.0));
      }
      float clearOfKit(vec2 p) {
        float k = 1.0;
${solid.map(([x0, z0, x1, z1]) => `        k *= 1.0 - step(${g1(x0 - 1.1)}, p.x) * step(p.x, ${g1(x1 + 1.1)}) * step(${g1(z0 - 1.1)}, p.y) * step(p.y, ${g1(z1 + 1.1)});`).join("\n")}
        return k;
      }
      vec3 kerbLamps(float across, float along, float street, float k, float px) {
        float dz = abs(fract(along / 11.5 + 0.5) - 0.5) * 11.5;
        float dk = abs(abs(across) - 4.2);
        float d2 = dk * dk + dz * dz;
        float r = max(0.9, px);
        float lamp = exp(-d2 / (r * r)) * (0.81 / (r * r));
        float on = step(0.12, hash12(vec2(floor(along / 11.5 + 0.5), street * 3.1 + k)));
        // Each lamp's pool runs into the next, so a street reads as a line.
        float pool = exp(-dk * dk / 8.0 - dz * dz / 45.0) * 0.12;
        vec3 sodium = mix(vec3(1.0, 0.55, 0.2), vec3(0.85, 0.9, 1.0), step(0.7, hash12(vec2(street, k + 3.0))));
        float lampAlong = floor(along / 11.5 + 0.5) * 11.5;
        float side = across < 0.0 ? -1.0 : 1.0;
        float streetAt = street * ${cell}.0 - (k < 0.5 ? 877.0 : 1677.0);
        float base = k < 0.5 ? 1700.0 : 900.0;
        float mid = floor((lampAlong + base) / ${cell}.0 + 0.5) * ${cell}.0 - base;
        vec2 c = k < 0.5 ? vec2(streetAt + side * 23.0, mid) : vec2(mid, streetAt + side * 23.0);
        vec2 post = k < 0.5 ? vec2(streetAt + side * 6.5, lampAlong) : vec2(lampAlong, streetAt + side * 6.5);
        float dressed = dressedAt(c);
        float stands = step(abs(lampAlong - mid), 16.4) * clearOfKit(post);
        on = mix(on, stands, dressed);
        return sodium * (lamp * 1.4 * on * mix(0.25, 1.0, smoothstep(0.1, 0.8, px)) + pool * (0.4 + 0.6 * on)) * mix(1.0, stands, dressed);
      }
      // Both streets' lamps at a point on the ground.
      vec3 streetLamps(vec3 p, float px) {
        vec2 q = (p.xz + vec2(${900 - cell / 2}.0, ${1700 - cell / 2}.0)) / ${cell}.0;
        vec2 off = (fract(q + 0.5) - 0.5) * ${cell}.0;
        vec2 id = floor(q + 0.5);
        return kerbLamps(off.x, p.z, id.x, 0.0, px) * step(abs(off.x), 9.0 + px) + kerbLamps(off.y, p.x, id.y, 1.0, px) * step(abs(off.y), 9.0 + px);
      }
  `;
  const farStreet = createFarStreet(scene, shared, boxes, { street: STREET, ads, reduced });

  // ---- the buildings: blocks on a square plan, towers on a cut one ----------
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, ...ads, uMotion: { value: reduced ? 0 : 1 } },
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
      attribute vec4 aDress;
      attribute vec4 aKind;
      varying vec4 vDress;
      varying vec4 vKind;
      varying vec4 vPlan;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vCells;
      varying vec3 vParams;
      varying float vRoof;
      varying vec2 vCrown;
      varying vec4 vHero;
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
        // A megabuilding a mile off is read in cells of several floors.
        if (aForm.y > 5.5) vCells /= 2.6;
        float seed = fract(aForm.w) * 100.0;
        vParams = aLook.xyz;
        vCells += vec2(aLook.w, 0.0);
        // The roof's height (under any spire), and which towers light a band
        // under it.
        vCrown = vec2(aSize.z, aDress.z);
        // What kind of building (0 a tower, 1 one of Contact's dressed
        // towers, 2 a block), where this is across its face, the face's
        // width in metres and which face it is (for what is hung on it).
        float faceW = abs(normal.x) > 0.5 ? foot.y : foot.x;
        float faceId = normal.x > 0.5 ? 0.0 : normal.z > 0.5 ? 1.0 : normal.x < -0.5 ? 2.0 : 3.0;
        // Contact's towers keep the blade where the boxes had it: up the
        // corner their plan's x and z start from.
        float across = abs(normal.x) > 0.5 ? position.z + 0.5 : position.x + 0.5;
        vHero = vec4(aForm.z, abs(aForm.z - 1.0) < 0.1 ? across : aPart.w, faceW, faceId + ti * 4.0);
        // This tier: its roof's height, its foot, whether it is the top, and
        // where across the face this is.
        vTier = vec4(base + h, base, isTop, aPart.w);
        // The building's kind, its screen, which tier is its tallest (the
        // screen's), and this tier.
        float tallest = aTier.y > aTier.x ? (aTier.z > aTier.y ? 2.0 : 1.0) : 0.0;
        vForm = vec4(aForm.y, floor(aForm.w) + 0.1 * step(abs(ti - tallest), 0.1), seed, ti);
        // How it is dressed, and where on its tier's plan this is, in
        // metres from the middle, with half the tier's footprint.
        vDress = aDress;
        vKind = aKind;
        vPlan = vec4(position.xz * foot, foot * 0.5);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${WINDOWS}
      ${ADVERT}
      ${BEYOND}
      uniform float uMotion;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vCells;
      varying vec3 vParams;
      varying float vRoof;
      varying vec2 vCrown;
      varying vec4 vHero;
      varying vec4 vTier;
      varying vec4 vForm;
      varying vec4 vDress;
      varying vec4 vKind;
      varying vec4 vPlan;
      vec3 neonOf(float k) {
        return k < 1.0 ? vec3(1.0, 0.22, 0.62) : k < 2.0 ? vec3(0.16, 0.9, 1.0) : k < 3.0 ? vec3(1.0, 0.58, 0.22) : vec3(0.64, 0.3, 1.0);
      }
      // A vertical sign hung on a block, the canyon's kind: a dark board, a
      // tube round its edge, a stack of characters' worth of strokes drawn
      // from a hash (lettering from across the city, without being any),
      // and now and then a tube that drops out. Far off, its glow.
      vec3 hangingSign(vec2 s, float cells, float seed, float t, vec3 c, float drawn) {
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
        // Drawn as characters (all but what Contact frames, which is as it was).
        k = mix(k, kanji(vec2((f.x - 0.14) / 0.72, 1.0 - (f.y - 0.06) / 0.88), h1, h2) * step(0.06, f.y) * step(f.y, 0.94), drawn);
        float px = max(fwidth(s.x), fwidth(g.y) * 0.3);
        float lit = mix(max(max(frame, min(k, 1.0) * step(0.14, s.x) * step(s.x, 0.86)), 0.26 * (1.0 - frame)), 0.36, smoothstep(0.12, 0.4, px));
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
      // The street's light at a building's foot, one colour to a
      // neighbourhood: sodium mostly, here and there the signs' cyan, pink
      // or green.
      vec3 quarterLight(float q, float held) {
        if (held > 0.5) return q < 0.5 ? vec3(1.0, 0.6, 0.3) : q < 0.72 ? vec3(0.2, 0.85, 0.95) : q < 0.9 ? vec3(1.0, 0.25, 0.7) : vec3(0.45, 1.0, 0.6);
        // The night is navy and teal: sodium and cyan, a teal, and pink for
        // one quarter in twenty.
        return q < 0.55 ? vec3(1.0, 0.6, 0.3) : q < 0.84 ? vec3(0.2, 0.85, 0.95) : q < 0.95 ? vec3(0.25, 0.95, 0.75) : vec3(1.0, 0.25, 0.7);
      }
      // A sign's colour in that night: cyan and amber, some pale, a few
      // teal, and pink the accent.
      vec3 signCol(float h) {
        return h < 0.38 ? vec3(0.16, 0.9, 1.0) : h < 0.72 ? vec3(1.0, 0.58, 0.22) : h < 0.85 ? vec3(1.0, 0.86, 0.6) : h < 0.92 ? vec3(0.2, 1.0, 0.78) : vec3(1.0, 0.22, 0.62);
      }
      // A screen tower's shaft: a column of screens up each face, each an
      // advert with no words (a field of one colour with a bar of light
      // going down it, rows of blocks where lines of type would be, a ring
      // and its dot, two fields split on a slant), changing every few
      // seconds, a few of them dark. uv is across the face (0..1) and
      // metres up the shaft; W the face's width and H the shaft's height.
      // Returns the colour, and in a how much of it is lit.
      vec4 screenColumn(vec2 uv, float W, float H, float seed, float t) {
        float cu = (uv.x - 0.12) / 0.76;
        float ch = W * (0.7 + 1.1 * hash12(vec2(seed, 1.7)));
        float c = floor(uv.y / ch);
        float fy = fract(uv.y / ch);
        float inside = step(0.0, uv.y) * step(0.0, cu) * step(cu, 1.0) * step(0.05, fy) * step(fy, 0.95) * step((c + 1.0) * ch, H);
        float h1 = hash12(vec2(c, seed));
        float slot = floor(t / (7.0 + 6.0 * h1) + h1 * 10.0);
        float hk = hash12(vec2(c + slot * 3.7, seed + 1.0));
        float hp = hash12(vec2(c + slot * 1.3, seed + 5.0));
        vec3 a = hk < 0.34 ? vec3(0.22, 0.45, 1.0) : hk < 0.58 ? vec3(0.72, 0.9, 1.0) : hk < 0.74 ? vec3(0.15, 0.9, 1.0) : hk < 0.88 ? vec3(1.0, 0.2, 0.72) : hk < 0.95 ? vec3(1.0, 0.16, 0.2) : vec3(1.0, 0.84, 0.25);
        vec2 s = vec2(cu, (fy - 0.05) / 0.9);
        float k;
        if (hp < 0.3) {
          k = 0.45 + 0.35 * s.y + 0.6 * smoothstep(0.08, 0.0, abs(fract(s.y + t * 0.07 + h1) - 0.5));
        } else if (hp < 0.55) {
          float row = floor(s.y * 7.0);
          float len = 0.35 + 0.6 * hash12(vec2(row, c + slot + seed));
          k = 0.22 + 0.9 * step(0.25, fract(s.y * 7.0)) * step(0.08, s.x) * step(s.x, len) * step(0.3, hash12(vec2(row + 9.0, c + seed)));
        } else if (hp < 0.8) {
          vec2 q = vec2((s.x - 0.5) * W * 0.76, (s.y - 0.55) * ch * 0.9);
          float d = length(q) / (W * 0.26);
          k = 0.25 + smoothstep(0.16, 0.0, abs(d - 0.85)) + smoothstep(0.4, 0.3, d);
        } else {
          k = mix(0.3, 1.0, step(0.5, s.y + (s.x - 0.5) * 0.5));
        }
        // Far off, a screen is its mean.
        k = mix(k, 0.6, smoothstep(0.06, 0.2, fwidth(uv.y) / ch));
        float on = step(h1, 0.9);
        float tear = step(0.99, hash12(vec2(floor(t * 5.0), seed + c)));
        vec3 drawn = advert(s, W * 0.76 / (ch * 0.9), floor(hk * 24.0)) * 1.55;
        vec3 col = mix(a * k * 1.9, drawn, uHasAds) * (1.0 - 0.6 * tear) * on + vec3(0.012, 0.014, 0.02);
        return vec4(mix(vec3(0.008, 0.009, 0.013), col, inside), inside * on);
      }
      // A strip of boards side by side across a face: s is across and up
      // the strip (0..1), n how many times wider than tall it is. Each
      // board one of the city's adverts, changing every so often (before
      // they land, a lightbox in one of the signs' colours).
      vec3 boardStrip(vec2 s, float n, float seed, float t, float base) {
        float count = max(1.0, floor(n / 1.5 + 0.5));
        float i = floor(s.x * count);
        vec2 q = vec2(fract(s.x * count), s.y);
        float h = hash12(vec2(i + floor(t / (8.0 + 5.0 * hash12(vec2(i, seed))) + seed), seed * 3.1));
        vec3 a = h < 0.25 ? vec3(1.0, 0.2, 0.3) : h < 0.5 ? vec3(0.16, 0.85, 1.0) : h < 0.7 ? vec3(1.0, 0.62, 0.2) : h < 0.85 ? vec3(1.0, 0.25, 0.7) : vec3(0.9, 0.95, 1.0);
        float blocks = step(0.5, hash12(floor(q * vec2(5.0, 3.0)) + i + h * 31.0));
        float edge = 1.0 - step(0.03, q.x) * step(q.x, 0.97) * step(0.06, q.y) * step(q.y, 0.94);
        // One of the city's adverts on each, once they have landed.
        vec3 drawn = advert(q, n / count, base + i * 7.0 + floor(h * 3.0)) * 1.3;
        return mix(mix(a * mix(1.3, 0.5, blocks), drawn, uHasAds), vec3(0.01), edge);
      }
      // A mark under a tower's roof, nobody's: a ring and its dot, a
      // hexagon with a bar, three bars, a diamond. p is in the mark's own
      // radius.
      float markShape(vec2 p, float kind) {
        vec2 a = abs(p);
        if (kind < 1.5) return smoothstep(0.1, 0.04, abs(length(p) - 0.82)) + smoothstep(0.34, 0.28, length(p));
        if (kind < 2.5) return smoothstep(0.1, 0.04, abs(max(a.x * 0.866 + a.y * 0.5, a.y) - 0.78)) + step(a.y, 0.09) * step(a.x, 0.42);
        if (kind < 3.5) return step(a.x, 0.8) * step(abs(fract(p.y * 1.5 + 0.5) - 0.5), 0.2) * step(a.y, 0.95);
        return smoothstep(0.1, 0.04, abs(a.x + a.y - 0.8)) + step(a.x + a.y, 0.3);
      }
      // The foot of a block: shops in 6.4 m fronts between pilasters, glass
      // over a plinth with a mullion and a transom, a door, a room lit from
      // its ceiling with its goods as patches of light, a sign board over
      // each, some of them shut behind a shutter. um is metres along the
      // face. Returns the colour, and in a how much of it is lit.
      vec4 shopFront(float um, float y, float seed, vec3 wall, vec3 spill) {
        float su = um / 6.4;
        float shop = floor(su);
        float fu = fract(su) * 6.4;
        float hs = hash12(vec2(shop, seed));
        float h2 = hash12(vec2(shop + 5.0, seed));
        vec3 sc = hs > 0.88 ? vec3(1.0, 0.3, 0.62) : hs > 0.76 ? vec3(0.25, 0.85, 1.0) : hs > 0.66 ? vec3(0.45, 1.0, 0.6) : hs > 0.3 ? vec3(1.0, 0.66, 0.38) : vec3(0.95, 0.9, 0.8);
        float open = step(0.2, h2);
        float named = step(0.15, h2);
        float pil = clamp(step(fu, 0.24) + step(6.16, fu), 0.0, 1.0);
        float glassY = step(0.6, y) * step(y, 3.3);
        float bars = clamp(step(abs(fu - 3.2), 0.05) + step(abs(y - 2.55), 0.035), 0.0, 1.0);
        float door = step(abs(fu - (1.25 + 3.9 * step(0.5, fract(hs * 7.0)))), 0.6) * step(0.12, y) * step(y, 2.5);
        float goods = hash12(vec2(floor(fu * 1.4 + hs * 9.0), floor(y * 2.4) + shop));
        vec3 inside = sc * (0.07 + 0.36 * smoothstep(0.6, 3.3, y)) * (0.6 + 0.7 * goods * step(y, 2.5));
        inside = mix(inside, sc * 0.3, door * 0.6);
        vec3 shut = (vec3(0.02, 0.02, 0.025) + spill * 0.1) * (0.6 + 0.4 * step(0.5, fract(y * 9.0)));
        float glazed = max(glassY, door);
        vec3 col = mix(shut, inside, open) * glazed;
        col = mix(col, vec3(0.01), bars * glassY * open * (1.0 - door));
        float board = step(3.55, y) * step(y, 4.4) * step(0.4, fu) * step(fu, 6.0);
        float stroke = step(0.45, hash12(vec2(floor(fu * 2.6), shop + seed))) * step(abs(y - 3.98), 0.2) * step(1.0, fu) * step(fu, 5.4) * step(0.12, fract(fu * 2.6));
        vec3 sign = hs > 0.5 ? sc * (0.5 - 0.42 * stroke) : sc * (0.05 + 0.85 * stroke);
        col = mix(col, sign * named, board);
        float frame = max(pil, 1.0 - max(glazed, board));
        col = mix(col, wall * 0.9, frame);
        return vec4(col, max(open * glazed, board * named * 0.8) * (1.0 - frame));
      }
      // A dealt tower's floors are lit a run at a time. By its kind (see the
      // deal): how many of its runs are lit right across and how many half
      // lit (the rest are dark glass)...
      vec2 zoneMix(float k) {
        return k < 0.5 ? vec2(0.45, 0.82) : k < 1.5 ? vec2(0.4, 0.72) : k < 2.5 ? vec2(0.45, 0.8) : k < 3.5 ? vec2(0.16, 0.88)
          : k < 4.5 ? vec2(0.34, 0.66) : k < 5.5 ? vec2(0.2, 0.46) : k < 6.5 ? vec2(0.5, 0.72) : vec2(0.42, 0.78);
      }
      // ...and a run's light: what a lit room's white is multiplied by, and
      // in a how warm the room is. Each kind has its own and, for one run
      // in four, a second.
      vec4 zoneLight(float k, float h) {
        vec4 yellow = vec4(1.0, 1.3, 0.85, 1.0);
        vec4 amber = vec4(1.0, 1.0, 1.0, 1.0);
        vec4 cyan = vec4(0.42, 1.12, 1.0, 0.0);
        vec4 pale = vec4(1.15, 1.08, 1.0, 0.0);
        vec4 teal = vec4(0.38, 1.2, 0.76, 0.0);
        vec4 pink = vec4(1.0, 0.42, 2.2, 1.0);
        vec4 home = vec4(1.0, 1.0, 1.0, 0.55);
        bool other = h > 0.74;
        if (k < 0.5) return other ? cyan : yellow;
        if (k < 1.5) return other ? cyan : pale;
        if (k < 2.5) return other ? pale : amber;
        if (k < 3.5) return other ? (h > 0.93 ? pink : amber) : home;
        if (k < 4.5) return other ? pale : teal;
        if (k < 5.5) return other ? pale : cyan;
        if (k < 6.5) return other ? amber : yellow;
        return other ? amber : pale;
      }
      // A roof from the air. p is metres from the middle of the roof, hf
      // half its size, sky the light that falls on it. Its covering is one
      // of five (felt, gravel, a green coat, red oxide, a grey membrane) in
      // sheets with seams. Cut across its length, each half is put to a
      // use: plant in rows (a pale casing, a dark fan), panels (dark glass
      // giving back the sky), skylights over lit rooms, a deck with
      // planters under a string of bulbs, or nothing but a hatch. A big
      // roof in six is a landing pad instead: a ring of lamps, a painted
      // ring and a cross inside it, a red lamp at each quarter. Three in
      // ten have a line of light inside the parapet, which lights the roof
      // beside it. Returns the colour, and in a how much of it is light.
      vec4 roofTop(vec2 p, vec2 hf, float seed, vec3 sky) {
        float px = max(max(fwidth(p.x), fwidth(p.y)), 0.02);
        float fine = 1.0 - smoothstep(0.2, 0.8, px);
        float S = min(hf.x, hf.y) * 2.0;
        float h0 = hash12(vec2(seed, 71.3));
        vec3 alb = h0 < 0.3 ? vec3(0.03, 0.03, 0.036) : h0 < 0.55 ? vec3(0.062, 0.062, 0.066) : h0 < 0.7 ? vec3(0.02, 0.05, 0.042) : h0 < 0.84 ? vec3(0.07, 0.036, 0.026) : vec3(0.045, 0.055, 0.075);
        vec2 sheet = p / 4.2;
        alb *= (0.8 + 0.4 * hash12(floor(sheet) + seed)) * (1.0 - 0.35 * fine * step(min(fract(sheet.x), fract(sheet.y)), 0.03));
        vec3 col = alb * sky;
        float lit = 0.0;
        float inEdge = min(hf.x - abs(p.x), hf.y - abs(p.y));
        bool longX = hf.x >= hf.y;
        float side = step(0.0, longX ? p.x : p.y);
        float use = hash12(vec2(seed + side * 5.0, 73.9));
        // Metres from the middle of this half, and the half's half size.
        vec2 q = longX ? vec2(abs(p.x) - hf.x * 0.5, p.y) : vec2(p.x, abs(p.y) - hf.y * 0.5);
        vec2 qh = longX ? vec2(hf.x * 0.5, hf.y) : vec2(hf.x, hf.y * 0.5);
        float inHalf = step(abs(q.x), qh.x - 1.5) * step(abs(q.y), qh.y - 1.5);
        float pad = step(20.0, S) * step(hash12(vec2(seed, 79.1)), 0.17);
        if (pad > 0.5) {
          float R = min(S * 0.36, 12.0);
          float d = length(p);
          float a = atan(p.y, p.x);
          col = mix(col, vec3(0.07, 0.072, 0.08) * sky, step(d, R + 1.2));
          col = mix(col, vec3(0.34, 0.26, 0.03) * sky, step(abs(d - R * 0.55), 0.22) * fine);
          col = mix(col, vec3(0.3, 0.3, 0.3) * sky, step(min(abs(p.x), abs(p.y)), 0.3) * step(d, R * 0.4) * fine);
          vec3 lampCol = hash12(vec2(seed, 81.7)) < 0.6 ? vec3(0.2, 0.9, 1.0) : vec3(1.0, 0.66, 0.26);
          float ring = (1.0 - smoothstep(0.18, 0.18 + px, abs(d - R))) * mix(step(0.35, fract(a * 16.0 / 6.2832)), 0.65, smoothstep(0.3, 1.2, px));
          col = mix(col, lampCol * 1.5, ring);
          col += lampCol * 0.1 * exp(-abs(d - R) / 2.0);
          float red = 1.0 - smoothstep(0.35, 0.35 + px, length(abs(p) - vec2(R + 2.2) * 0.7071));
          col = mix(col, vec3(1.0, 0.08, 0.05) * 2.0, red);
          lit = max(ring, red);
        } else if (S > 9.0 && inHalf > 0.5) {
          if (use < 0.27) {
            vec2 g = q / vec2(3.4, 2.6);
            vec2 f = (fract(g) - 0.5) * vec2(3.4, 2.6);
            float there = step(0.28, hash12(floor(g) + seed * 7.0));
            float unit = step(abs(f.x), 1.2) * step(abs(f.y), 0.85) * there;
            float fan = step(length(f - vec2(0.3, 0.0)), 0.6);
            vec3 casing = vec3(0.1, 0.104, 0.112) * sky * (1.0 - 0.75 * fan);
            col = mix(col, mix(casing, vec3(0.068, 0.07, 0.076) * sky, smoothstep(0.5, 1.6, px)), mix(unit, 0.4 * there, smoothstep(0.5, 1.6, px)));
          } else if (use < 0.45) {
            vec2 g = q / vec2(2.2, 3.8);
            vec2 f = fract(g);
            float row = step(0.5, mod(floor(g.y), 3.0));
            float glass = step(0.06, f.x) * step(f.x, 0.94) * step(0.05, f.y) * step(f.y, 0.95) * row;
            vec3 panel = vec3(0.008, 0.014, 0.03) + sky * vec3(0.016, 0.03, 0.05) + uGlowColor * 0.1 * uHaze;
            col = mix(col, panel, mix(glass, 0.58, smoothstep(0.4, 1.4, px)));
          } else if (use < 0.66) {
            vec2 g = q / vec2(5.2, 3.6);
            vec2 f = (fract(g) - 0.5) * vec2(5.2, 3.6);
            float on = step(0.4, hash12(floor(g) + seed * 11.0));
            float glass = step(abs(f.x), 1.7) * step(abs(f.y), 0.85);
            float bars = step(abs(fract(f.x / 0.85) - 0.5), 0.44);
            vec3 glow = hash12(vec2(seed, 83.3)) < 0.55 ? vec3(1.0, 0.72, 0.42) : vec3(0.6, 0.82, 1.0);
            float k = mix(glass * mix(1.0, bars, fine), 0.3, smoothstep(0.6, 1.8, px));
            col = mix(col, mix(vec3(0.012, 0.016, 0.024), glow * 0.62, on), k);
            lit = k * on;
          } else if (use < 0.8) {
            float plank = 0.85 + 0.15 * step(0.5, fract(q.y / 0.28));
            col = vec3(0.085, 0.058, 0.036) * sky * mix(plank, 0.92, 1.0 - fine);
            vec2 g = q / vec2(4.6, 4.6);
            vec2 f = (fract(g) - 0.5) * 4.6;
            float planter = step(max(abs(f.x), abs(f.y)), 0.9) * step(0.55, hash12(floor(g) + seed * 13.0));
            col = mix(col, vec3(0.012, 0.045, 0.02) * sky, planter);
            // Bulbs on a string down its middle and across it.
            float bulbs = max((1.0 - smoothstep(0.12, 0.12 + px, length(vec2(q.x, (fract(q.y / 1.5) - 0.5) * 1.5)))), (1.0 - smoothstep(0.12, 0.12 + px, length(vec2((fract(q.x / 1.5) - 0.5) * 1.5, q.y)))));
            bulbs = mix(bulbs, 0.05, smoothstep(0.3, 1.0, px));
            col = mix(col, vec3(1.0, 0.72, 0.4) * 1.8, bulbs);
            col += vec3(1.0, 0.72, 0.4) * 0.05 * (exp(-abs(q.x) / 1.6) + exp(-abs(q.y) / 1.6));
            lit = bulbs;
          } else {
            // A hatch and the lamp over it.
            vec2 f = q - (vec2(hash12(vec2(seed, 87.1)), hash12(vec2(seed, 89.3))) - 0.5) * qh;
            col = mix(col, vec3(0.09, 0.092, 0.1) * sky, step(max(abs(f.x), abs(f.y)), 0.8));
            float lamp = exp(-dot(f, f) / 9.0);
            col += vec3(1.0, 0.7, 0.42) * 0.12 * lamp;
          }
        }
        if (hash12(vec2(seed, 91.9)) < 0.3 && S > 9.0) {
          float hl = hash12(vec2(seed, 93.7));
          vec3 lc = hl < 0.4 ? vec3(0.16, 0.9, 1.0) : hl < 0.75 ? vec3(1.0, 0.6, 0.26) : hl < 0.9 ? vec3(0.9, 0.95, 1.0) : vec3(1.0, 0.22, 0.62);
          float line = 1.0 - smoothstep(0.12, 0.12 + px, abs(inEdge - 0.4));
          col += lc * 0.16 * exp(-max(inEdge, 0.0) / 2.4);
          col = mix(col, lc * 1.4, line);
          lit = max(lit, line);
        }
        return vec4(col, lit);
      }
      // A tower's accent: its lines, its corners, the band under its roof.
      vec3 accentOf(float k) {
        return k < 0.5 ? vec3(0.16, 0.9, 1.0) : k < 1.5 ? vec3(1.0, 0.58, 0.22) : k < 2.5 ? vec3(0.85, 0.93, 1.0) : k < 3.5 ? vec3(0.2, 1.0, 0.78) : k < 4.5 ? vec3(1.0, 0.22, 0.62) : vec3(1.0, 0.82, 0.25);
      }
      void main() {
        vec3 n = normalize(vNormalW);
        float onWall = 1.0 - vRoof;
        // Within what Contact frames (512 in the dress code) a building is
        // drawn, and lit, as it was.
        // (For an eye above the roofs it is the city's like the rest.)
        float lift = smoothstep(40.0, 62.0, uCam.y);
        float held = step(511.5, vDress.x) * (1.0 - lift);
        // Above its roof line the wall is the parapet, a concrete band.
        float parapet = onWall * step(vTier.x, vWorld.y);
        // Whether it is dressed (see aDress): all but Contact's own towers,
        // whose tint is the far city's old charcoal (-1). Dressed, a wall
        // is one of the kit's own tinted walls.
        float fresh = step(0.0, vDress.y);
        // A dealt tower is lit in zones: runs of five to nine floors, cut
        // again every seven to thirteen, each run lit right across, half lit
        // or dark, in the tower's own light. Where the longer runs begin is
        // a plant floor (or, on the kinds that wear them, a line of light).
        float zoned = step(-0.5, vKind.x) * (1.0 - held);
        // (What it wears is a dealt tower's, wherever the eye is.)
        float worn = step(-0.5, vKind.x) * step(vHero.x, 0.5) * (1.0 - step(511.5, vDress.x));
        float flags = vKind.w;
        vec3 accent = accentOf(vKind.y);
        vec3 params = vParams;
        vec3 zoneTint = vec3(1.0);
        float zoneStart = 0.0;
        if (zoned > 0.001) {
          float storey = floor(vCells.y);
          // (A block's runs are two to four floors: ten floors of homes
          // are not one zone.)
          float low = step(1.5, vHero.x);
          float LA = mix(5.0 + floor(hash12(vec2(vForm.z, 1.3)) * 5.0), 2.0 + floor(hash12(vec2(vForm.z, 1.3)) * 2.0), low);
          float LB = mix(7.0 + floor(hash12(vec2(vForm.z, 2.9)) * 7.0), 3.0 + floor(hash12(vec2(vForm.z, 2.9)) * 2.0), low);
          float sa = storey + floor(hash12(vec2(vForm.z, 4.1)) * LA);
          float sb = storey + floor(hash12(vec2(vForm.z, 5.7)) * LB);
          vec2 zone = vec2(floor(sa / LA), floor(sb / LB));
          float zh = hash12(zone * vec2(3.1, 7.7) + vForm.z);
          vec2 share = zoneMix(vKind.x);
          vec4 light = zoneLight(vKind.x, hash12(zone * vec2(5.3, 1.9) + vForm.z + 9.5));
          zoneTint = light.rgb;
          zoneStart = step(mod(sb, LB), 0.5);
          params = mix(vParams, vec3(zh < share.x ? 1.25 : zh < share.y ? 0.45 + 0.3 * hash12(vec2(vForm.z, 6.6)) : mix(0.1, 0.22, low), vParams.y, light.a), zoned);
        }
        vec4 win = windowsT(vCells, params, vWorld, step(0.0, vCells.y) * (1.0 - parapet), vDress.y);
        // Lit glass in the zone's light, and brighter than a room is: an
        // office floor left on.
        win.rgb *= mix(vec3(1.0), zoneTint * 1.3, zoned * clamp(win.a * 2.2, 0.0, 1.0));
        // A roof is lit by the sky, as the kit's are: from above it is a
        // dark blue plane, not a hole.
        vec3 roofCol = vec3(0.012, 0.012, 0.016) + (uHazeColor * 0.3 + uGlowColor * 0.16) * uHaze * mix(0.35, 0.72, fresh) * max(n.y, 0.25);
        vec3 col = mix(win.rgb, roofCol, vRoof);
        // A dressed wall: the street's light up its first floors, and close
        // to, what a wall is made of. A block has shops at its foot and, over
        // them, a string course every few floors, piers every few bays,
        // balconies under some windows of a block of homes and an air
        // conditioner under others. A tower has a lit lobby.
        float footLit = 0.0;
        if (fresh > 0.5 && onWall > 0.5 && parapet < 0.5) {
          vec3 spill = spillAt(vWorld);
          // A tower takes it on its first floors only: up a tall dark wall
          // it was a slab of the lamp's colour.
          vec3 street = quarterLight(vDress.w, held) * exp(-max(vWorld.y, 0.0) * 0.05) * mix(1.0, 0.55 * exp(-max(vWorld.y, 0.0) * 0.09), step(vHero.x, 0.5));
          vec3 tintCol = wallTint(vDress.y);
          vec3 wallC = tintCol * (vec3(0.6) + spill * 3.2 + street * 1.6);
          col += tintCol * street * 1.6 * (1.0 - win.a);
          float um = vHero.y * vHero.z;
          float near = 1.0 - smoothstep(0.1, 0.45, max(fwidth(vCells.x), fwidth(vCells.y)));
          if (vHero.x > 1.5 && vWorld.y < 4.6) {
            vec4 front = shopFront(um, vWorld.y, vForm.z + mod(vHero.w, 4.0) * 3.0, wallC, spill);
            col = front.rgb;
            footLit = front.a;
          } else if (vHero.x > 1.5 && near > 0.01) {
            float storey = floor(vCells.y);
            float fy = fract(vCells.y);
            float bay = floor(vCells.x);
            float fx = fract(vCells.x);
            float sb = vForm.z;
            float hb = hash12(vec2(sb, 3.3));
            float course = step(mod(storey, 2.0 + floor(hash12(vec2(sb, 4.1)) * 3.0)), 0.5) * step(fy, 0.08);
            float pier = step(mod(bay, 2.0 + floor(hash12(vec2(sb, 5.2)) * 3.0)), 0.5) * step(fx, 0.1) * step(0.35, hb);
            float balcony = step(hb, 0.6) * step(0.5, hash12(vec2(bay, storey) + sb)) * step(0.05, fx) * step(fx, 0.95) * step(fy, 0.21);
            float unit = step(0.84, hash12(vec2(bay * 1.7, storey * 2.3) + sb)) * step(0.6, fx) * step(fx, 0.86) * step(0.03, fy) * step(fy, 0.17) * (1.0 - balcony);
            col = mix(col, wallC * 3.0, course * near);
            col = mix(col, wallC * 1.9, pier * near);
            col = mix(col, wallC * mix(0.4, 3.2, step(0.17, fy)), balcony * near);
            col = mix(col, vec3(0.07, 0.072, 0.08) * (vec3(0.6) + spill * 3.0 + street) * (0.7 + 0.5 * step(0.1, fy)), unit * near);
            // Up to three small boards over the shops, lightboxes in the
            // signs' colours, their strokes dark: the stacks of red and
            // orange boards the show hangs on every block.
            float faceSeed = sb * 17.0 + mod(vHero.w, 4.0) * 5.0;
            for (int i = 0; i < 3; i++) {
              float bi = float(i);
              float hw = hash12(vec2(faceSeed, bi + 0.3));
              if (hw < 0.3) continue;
              float bw = 2.0 + 2.6 * hash12(vec2(faceSeed, bi + 1.7));
              float bh = 1.1 + 1.3 * hash12(vec2(faceSeed, bi + 2.9));
              float bu = 0.6 + (vHero.z - bw - 1.2) * hash12(vec2(faceSeed, bi + 4.1));
              float by = 5.0 + 9.0 * hash12(vec2(faceSeed, bi + 5.3));
              vec2 q = vec2((um - bu) / bw, (vWorld.y - by) / bh);
              if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || by + bh > vTier.x - 1.0) continue;
              vec3 bc = hw > 0.82 ? vec3(1.0, 0.16, 0.2) : hw > 0.66 ? vec3(1.0, 0.5, 0.16) : hw > 0.52 ? vec3(0.16, 0.9, 1.0) : hw > 0.42 ? vec3(1.0, 0.22, 0.62) : vec3(0.95, 0.9, 0.8);
              float mark = step(0.4, hash12(vec2(floor(q.x * bw * 1.6), faceSeed + bi))) * step(abs(q.y - 0.5), 0.26) * step(0.12, fract(q.x * bw * 1.6)) * step(0.08, q.x) * step(q.x, 0.92);
              float edge = step(min(min(q.x * bw, (1.0 - q.x) * bw), min(q.y * bh, (1.0 - q.y) * bh)), 0.09);
              col = bc * mix(1.1, 0.14, max(mark * near, edge * near));
              footLit = 1.0;
            }
          } else if (vHero.x < 0.5 && vWorld.y < 4.6 && vForm.x < 5.5) {
            // A tower's podium storey: shops along its foot as a block has
            // them (two towers in three; the third is shut at the street,
            // shutters between its piers), and in the middle of each face
            // its own door: glass doors between steel frames under a lit
            // canopy, the hall behind them lit from its ceiling.
            float hl = hash12(vec2(vForm.z, 6.6));
            vec4 front = shopFront(um, vWorld.y, vForm.z + mod(vHero.w, 4.0) * 3.0, wallC, spill);
            if (hl < mix(0.2, 0.33, held)) {
              float pier = step(min(fract(um / 6.4), 1.0 - fract(um / 6.4)), 0.05);
              float slat = 0.55 + 0.45 * step(0.5, fract(vWorld.y * 7.0));
              front = vec4(mix((vec3(0.03, 0.031, 0.036) + wallC * 0.6) * slat, wallC, max(pier, step(3.5, vWorld.y))), 0.0);
            }
            // (No two doors alike: each face's is its own width, a little
            // off the middle, its hall one of five lights, its canopy a
            // band of light or a dark slab under a lit name.)
            float hd = hash12(vec2(vForm.z, 7.7 + mod(vHero.w, 4.0)));
            float hd2 = hash12(vec2(vForm.z, 9.9 + mod(vHero.w, 4.0)));
            float doorHalf = mix(3.2, 1.9 + 2.6 * hd, 1.0 - held);
            float eu = um - vHero.z * (0.5 + (hd2 - 0.5) * 0.3 * (1.0 - held));
            if (abs(eu) < doorHalf && vHero.z > 12.0) {
              vec3 hallCol = hl > 0.6 ? vec3(0.78, 0.88, 1.0) : vec3(1.0, 0.74, 0.46);
              if (held < 0.5) hallCol = hd2 < 0.3 ? vec3(1.0, 0.74, 0.46) : hd2 < 0.52 ? vec3(0.78, 0.88, 1.0) : hd2 < 0.7 ? vec3(0.3, 0.9, 1.0) : hd2 < 0.85 ? vec3(1.0, 0.36, 0.62) : vec3(0.7, 1.0, 0.8);
              float frame = clamp(step(doorHalf - 0.2, abs(eu)) + step(abs(fract(eu / 1.6 + 0.5) - 0.5) * 1.6, 0.05) + step(abs(vWorld.y - 2.5), 0.04), 0.0, 1.0);
              float desk = step(abs(eu + 0.9), 1.1) * step(vWorld.y, 1.1) * step(0.35, vWorld.y);
              vec3 hall = hallCol * (0.07 + 0.3 * smoothstep(0.2, 3.3, vWorld.y)) * (1.0 - 0.6 * desk);
              float canopy = step(3.3, vWorld.y) * step(vWorld.y, 3.7);
              float named = step(0.5, hd) * (1.0 - held);
              float name = step(abs(vWorld.y - 4.12), 0.24) * step(abs(eu), doorHalf * 0.7) * step(0.4, hash12(vec2(floor(eu * 2.2), vForm.z + hd))) * step(0.15, fract(eu * 2.2));
              front = vec4(mix(mix(hall, wallC * 0.5, frame), mix(hallCol * 1.5, vec3(0.012, 0.013, 0.017), named), canopy), max(canopy * (1.0 - named), 0.6 * (1.0 - frame)));
              if (vWorld.y > 3.7) front = vec4(mix(wallC, hallCol * 1.6, name * named), name * named);
            }
            col = front.rgb;
            footLit = front.a;
          }
        }
        // Seen from the air a low district is its roofs: a few small lights
        // on each (a skylight, a lamp over a door, a sign's back), the
        // show's sprinkle of cyan and pink over dark blocks. One 3 m cell
        // in fourteen, spread as it shrinks under a pixel.
        float roofLit = 0.0;
        if (fresh > 0.5 && vRoof > 0.5 && n.y > 0.5) {
          // (A roof within what Contact frames that its lens looks down on
          // is as it was, but for an eye above the roofs.)
          float roofNew = 1.0 - step(511.5, vDress.x) * (1.0 - lift) * step(vTier.x, 13.0);
          if (roofNew > 0.001) {
            vec4 above = roofTop(vPlan.xy, vPlan.zw, vForm.z + vTier.x * 0.37, vec3(0.4) + (uHazeColor * 0.3 + uGlowColor * 0.16) * uHaze * 24.0 + spillAt(vWorld) * 6.0);
            col = mix(col, above.rgb, roofNew);
            roofLit = above.a * roofNew;
          }
          vec2 rc = vPlan.xy / 3.0;
          float rh = hash12(floor(rc) + vForm.z * 31.0);
          float rr = max(0.2, 0.8 * max(fwidth(rc.x), fwidth(rc.y)));
          vec2 rd = fract(rc) - 0.5;
          float speck = step(0.93, rh) * exp(-dot(rd, rd) / (rr * rr)) * (0.04 / (rr * rr));
          col += (rh > 0.985 ? vec3(1.0, 0.25, 0.7) : rh > 0.965 ? vec3(0.2, 0.85, 0.95) : vec3(1.0, 0.7, 0.42)) * speck * 1.5;
          roofLit = min(max(roofLit, speck), 1.0);
        }
        // The parapet: coping-dark concrete taking the street's light and
        // the glow, with a hairline where the coping catches the sky.
        vec3 band = vec3(0.018, 0.018, 0.022) + spillAt(vWorld) * 0.35 + (uHazeColor * 0.2 + uGlowColor * 0.1) * uHaze * 0.3;
        band += (uHazeColor * 0.5 + uGlowColor * 0.3) * uHaze * smoothstep(-0.2, 0.0, vWorld.y - vTier.x - 0.9) * 0.5;
        col = mix(col, band, parapet);
        // A tower's face, by its kind (see the dress code).
        float dressCode = mod(floor(vDress.x + 0.5), 512.0);
        float pattern = floor(dressCode / 64.0);
        dressCode = mod(dressCode, 64.0);
        float faceLit = 0.0;
        if (pattern > 1.5 && vHero.x < 0.5 && onWall > 0.5 && parapet < 0.5 && vWorld.y > 4.6 && vForm.x < 4.5) {
          vec3 solidWall = wallTint(vDress.y) * (vec3(0.6) + spillAt(vWorld) * 3.2);
          float bay = floor(vCells.x);
          float fx = fract(vCells.x);
          float storey = floor(vCells.y);
          float fy = fract(vCells.y);
          float pxc = max(fwidth(vCells.x), fwidth(vCells.y));
          float fine = 1.0 - smoothstep(0.3, 0.8, pxc);
          if (pattern < 2.5) {
            // Rooms scattered between piers every third bay and a ledge
            // every sixth floor.
            float pier = step(mod(bay, 3.0), 0.5) * step(fx, 0.3);
            float ledge = step(mod(storey, 6.0), 0.5) * step(fy, 0.3);
            col = mix(col, solidWall * 2.4, max(pier, ledge) * fine);
          } else if (pattern < 3.5) {
            // Strips: two bays of glass, two of solid wall, all the way up.
            float shut = mix(step(1.5, mod(bay, 4.0)), 0.5, smoothstep(0.8, 1.8, fwidth(vCells.x)));
            col = mix(col, solidWall * 0.8, shut);
            win.a *= 1.0 - shut;
          } else if (pattern < 4.5) {
            // A dark face, a ledge every ninth floor, and across its
            // tallest part one board.
            float ledge = step(mod(storey, 9.0), 0.5) * step(fy, 0.3);
            col = mix(col, solidWall * 2.2, ledge * fine);
            float bandH = 5.0 + 4.0 * hash12(vec2(vForm.z, 3.4));
            float y0 = mix(vTier.y, vTier.x, 0.52 + 0.24 * hash12(vec2(vForm.z, 2.2)));
            vec2 sb = vec2((vHero.y - 0.05) / 0.9, (vWorld.y - y0) / bandH);
            if (fract(vForm.y) > 0.05 && sb.x > 0.0 && sb.x < 1.0 && sb.y > 0.0 && sb.y < 1.0 && y0 + bandH < vTier.x - 2.0) {
              col = boardStrip(sb, vHero.z * 0.9 / bandH, vForm.z + mod(vHero.w, 4.0) * 7.0, uTime * uMotion, vKind.z + mod(vHero.w, 4.0) * 3.0);
              faceLit = 1.0;
            }
          } else if (pattern < 5.5) {
            // A lattice of teal light over dark glass: a line every second
            // bay and every third floor, and far off its sheen.
            float lines = clamp(step(fract(vCells.x / 2.0), 0.045) + step(fract(vCells.y / 3.0), 0.04), 0.0, 1.0);
            float k = mix(lines, 0.085, smoothstep(0.08, 0.25, pxc));
            col = mix(col * 0.8, vec3(0.1, 0.9, 0.78) * 0.8, k);
            faceLit = k * 0.7;
          } else {
            // An office's ribbons between mullions every fourth bay.
            float mull = step(mod(bay, 4.0), 0.5) * step(fx, 0.24);
            col = mix(col, solidWall * 2.2, mull * fine);
          }
        }
        if (pattern > 6.5 && onWall > 0.5 && parapet < 0.5 && vWorld.y > 4.6) {
          // A megabuilding's frame, outside its glass: a brace crossing
          // every face in bays of thirty-eight metres, a deep ledge every
          // thirty-six up, and a line of light on each ledge's lip.
          vec2 g = vec2(vHero.y * vHero.z, vWorld.y) / 38.0;
          float brace = min(abs(fract(g.x + g.y) - 0.5), abs(fract(g.x - g.y) - 0.5)) * 26.9;
          float up = fract(vWorld.y / 36.0) * 36.0;
          float px = max(fwidth(vWorld.y), 0.05);
          float member = max(1.0 - smoothstep(1.5, 1.5 + px, brace), step(up, 2.4));
          col = mix(col, wallTint(vDress.y) * (vec3(1.3) + spillAt(vWorld) * 3.2) + uHazeColor * 0.2 * uHaze * (1.0 - held), member);
          win.a *= 1.0 - member;
          faceLit *= 1.0 - member;
          float lip = step(up, 0.45) * mix(1.0, 0.3, smoothstep(0.4, 1.6, px)) * (1.0 - held);
          col = mix(col, accent * 1.6, lip);
          faceLit = max(faceLit, lip);
        }
        if (worn > 0.5 && onWall > 0.5 && parapet < 0.5 && vWorld.y > 4.6) {
          float pxY = fwidth(vCells.y);
          float fy = fract(vCells.y);
          float lines = step(abs(vKind.x - 5.0), 0.1);
          if (zoneStart > 0.5 && lines > 0.5) {
            // A line of light round the tower where a run of floors begins.
            float k = mix(step(fy, 0.16), 0.16, smoothstep(0.35, 1.0, pxY));
            col = mix(col, accent * 1.7, k);
            faceLit = max(faceLit, k);
          } else if (zoneStart > 0.5) {
            // A plant floor: louvres and no glass, a service lamp every
            // sixth bay.
            float far = smoothstep(0.1, 0.3, pxY);
            float slat = mix(0.45 + 0.55 * step(0.5, fract(vWorld.y * 2.6)), 0.72, far);
            col = wallTint(vDress.y) * (vec3(0.6) + spillAt(vWorld) * 3.2) * 1.3 * slat;
            win.a = 0.0;
            faceLit = 0.0;
            float lamp = step(mod(floor(vCells.x), 6.0), 0.5) * step(abs(fract(vCells.x) - 0.5), 0.1) * step(abs(fy - 0.75), 0.08) * (1.0 - far);
            col = mix(col, vec3(1.0, 0.5, 0.2) * 1.6, lamp);
          }
          // Light up its corners, a hand wide.
          if (flags > 7.5 && vWorld.y > 9.0) {
            float edge = min(vHero.y, 1.0 - vHero.y) * vHero.z;
            float k = 1.0 - smoothstep(0.26, 0.26 + max(fwidth(vHero.y) * vHero.z, 0.04), edge);
            col = mix(col, accent * 1.5, k);
            faceLit = max(faceLit, k);
          }
        }
        float style = vForm.x;
        float top = vCrown.x;
        float dressed = step(abs(vHero.x - 1.0), 0.1);
        float pick = mix(vCrown.y, 0.93 + 0.07 * vCrown.y, dressed);
        // The city's two lights, amber and cyan, and now and then its pink:
        // a cold white band read from above as an empty frame in the sky.
        vec3 crownCol = pick > 0.975 ? vec3(1.0, 0.22, 0.62) : pick > 0.955 ? vec3(0.16, 0.9, 1.0) : pick > 0.93 ? vec3(1.0, 0.58, 0.22) : fract(pick * 7.3) > 0.5 ? vec3(0.2, 0.82, 1.0) : vec3(1.0, 0.62, 0.3);
        // One tall tower in seven wears a lit band under its roof: white,
        // amber, or one of the city's neons; a tower lit at its setbacks
        // wears one at every step; Contact's towers all do, in the city's
        // neons, with a blade of light up one corner.
        float banded = max(max(step(0.92, vCrown.y) * step(60.0, top), dressed), step(abs(style - 1.0), 0.1) * step(0.82, vCrown.y));
        // (A dealt tower wears one if it was dealt one, in its accent.)
        banded = mix(banded, step(3.5, mod(flags, 8.0)), worn);
        // Seen from over the roof the band is a ring round nothing, an empty
        // frame in the sky; it is a crown to look up at, so from above it is
        // not lit.
        float crown = onWall * (1.0 - parapet) * banded * vTier.z * step(vTier.x - mix(3.4, 4.2, worn), vWorld.y) * step(vWorld.y, vTier.x - mix(2.1, 1.6, worn)) * (1.0 - smoothstep(vTier.x, vTier.x + 25.0, uCam.y));
        // The towers built to wear one take it in a warmer light more often
        // than the cold white the odd one has.
        float bh = fract(vCrown.y * 29.7);
        vec3 bandCol = dressed > 0.5 || style > 1.5 || abs(style - 1.0) > 0.1 ? crownCol : bh > 0.7 ? vec3(1.0, 0.6, 0.28) : bh > 0.45 ? vec3(1.0, 0.86, 0.66) : crownCol;
        if (worn > 0.5) bandCol = accent;
        col = mix(col, bandCol * 1.8, crown);
        // Seen from above, a lit band round a dark roof is an empty frame
        // in the sky: the band lights the roof inside it, from its edge in.
        float inFromEdge = min(vPlan.z - abs(vPlan.x), vPlan.w - abs(vPlan.y));
        col += bandCol * 0.5 * exp(-max(inFromEdge, 0.0) / 3.5) * banded * vTier.z * fresh * vRoof * step(0.5, n.y);
        // Lit setbacks: a thin line of light under each step's edge, in
        // the tower's own light (mostly warm white, now and then a neon),
        // on most of the towers built that way.
        float steps = onWall * (1.0 - parapet) * step(abs(style - 4.0), 0.1) * step(0.5, vCrown.y) * (1.0 - vTier.z) * step(vTier.x - 0.95, vWorld.y) * step(vWorld.y, vTier.x - 0.55);
        float sh = fract(vCrown.y * 17.3);
        vec3 stepCol = sh > 0.88 ? vec3(1.0, 0.22, 0.62) : sh > 0.76 ? vec3(0.16, 0.9, 1.0) : sh > 0.3 ? vec3(1.0, 0.6, 0.28) : vec3(1.0, 0.88, 0.72);
        col = mix(col, stepCol * 1.15, steps);
        // And each lit step lights its own terrace the same way.
        col += stepCol * 0.4 * exp(-max(inFromEdge, 0.0) / 3.5) * step(abs(style - 4.0), 0.1) * step(0.5, vCrown.y) * (1.0 - vTier.z) * fresh * vRoof * step(0.5, n.y);
        // Contact's towers wear their blade on the faces its lens sees: on
        // all four, from the air every one of them had the same strip up
        // every corner.
        float blade = dressed * onWall * step(vHero.y, 0.035) * step(8.0, vWorld.y) * step(vWorld.y, top - 4.0) * step(0.0, dot(n.xz, vec2(${CONTACT_LENS[0]}.0, ${CONTACT_LENS[1]}.0) - vWorld.xz));
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
          // Lit from inside, floor by floor: dark glass between lit edges
          // reads from across the city as an empty frame in the sky.
          float crownFloor = (vWorld.y - vTier.y) / 3.4;
          col += crownCol * (0.14 + 0.5 * step(fract(crownFloor), 0.62) * (0.5 + 0.5 * hash12(vec2(floor(crownFloor), vForm.z)))) * fresh;
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
              vec3 sc = neonOf(floor(hash12(vec2(fs * 91.0, 2.0)) * 4.0));
              if (hash12(vec2(fs * 91.0, 9.0)) > 0.7) sc = vec3(1.0, 0.86, 0.6);
              if (held < 0.5) sc = signCol(hash12(vec2(fs * 91.0, 2.0)));
              col = hangingSign(vec2((um - u0) / sw, 1.0 - (vWorld.y - y0) / (y1 - y0)), max(1.0, floor((y1 - y0) / (sw * 1.1))), fs * 91.0, uTime * uMotion, sc, 1.0 - held);
              sign = 1.0;
            }
          } else if (fs > 0.72) {
            float yl = 4.6 + 3.4 * floor(1.0 + 3.0 * hash12(vec2(fs, 11.0)));
            float edge = step(0.04, vHero.y) * step(vHero.y, 0.96);
            if (abs(vWorld.y - yl) < 0.08 && yl < vTier.x - 1.0 && edge > 0.5) {
              col = (held > 0.5 ? neonOf(floor(hash12(vec2(fs, 12.0)) * 4.0)) : signCol(hash12(vec2(fs, 12.0)))) * 2.0;
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
          float want = mix(floor(hash12(vec2(vForm.z, 4.2)) * 4.0), mod(flags, 4.0), worn);
          float y0 = mix(vTier.y, vTier.x, 0.38);
          float y1 = mix(vTier.y, vTier.x, 0.86);
          if (square > 0.5 && abs(mod(face, 4.0) - want) < 0.5 && vWorld.y > y0 && vWorld.y < y1 && vHero.y > 0.14 && vHero.y < 0.86) {
            vec2 s = vec2((vHero.y - 0.14) / 0.72, (vWorld.y - y0) / (y1 - y0));
            col = screenAd(s, floor(vForm.y), fract(vForm.z * 7.31), uTime * uMotion);
            // One of the city's adverts, in place of the shape that stood
            // for one, under the same scanlines and inside a dark frame.
            if (held < 0.5 && uHasAds > 0.5) {
              float edge = 1.0 - step(0.02, s.x) * step(s.x, 0.98) * step(0.012, s.y) * step(s.y, 0.988);
              col = mix(boardFace(s, 0.72 * vHero.z / (y1 - y0), vKind.z + floor(uTime * uMotion / 14.0 + fract(vForm.z) * 0.15), vForm.z) * 1.5 * (0.84 + 0.16 * step(0.5, fract(s.y * 140.0))), vec3(0.01), edge);
            }
            screen = 1.0;
          }
        }
        // A tower past the framed views: a vertical blade of light up one
        // face of its tallest tier, the show's cyan more often than not, and
        // on some a mark under the roof on two opposite faces.
        if (dressCode > 0.5 && onWall > 0.5 && parapet < 0.5 && fract(vForm.y) > 0.05) {
          float quadrant = (atan(n.z, n.x) + 3.14159) / 1.5708;
          float squareOn = step(abs(quadrant - floor(quadrant + 0.5)), 0.3);
          float code = dressCode;
          float bladeFace = mod(code, 8.0) - 1.0;
          float mark = floor(code / 8.0);
          float faceId = mod(vHero.w, 4.0);
          float W = vHero.z;
          float um = vHero.y * W;
          float hs = hash12(vec2(vForm.z, 12.4));
          float hc = hash12(vec2(vForm.z, 15.8));
          if (squareOn > 0.5 && abs(faceId - bladeFace) < 0.5) {
            float bw = clamp(W * 0.17, 2.6, 5.2);
            float u0 = hs > 0.5 ? W * 0.07 : W * 0.93 - bw;
            float y0 = mix(vTier.y, vTier.x, 0.1) + 2.0;
            float y1 = min(mix(vTier.y, vTier.x, 0.9), y0 + 84.0);
            if (um > u0 && um < u0 + bw && vWorld.y > y0 && vWorld.y < y1) {
              vec3 bc = hc < 0.55 ? vec3(0.16, 0.9, 1.0) : hc < 0.63 ? vec3(1.0, 0.22, 0.72) : hc < 0.9 ? vec3(1.0, 0.58, 0.22) : vec3(0.9, 0.95, 1.0);
              col = hangingSign(vec2((um - u0) / bw, 1.0 - (vWorld.y - y0) / (y1 - y0)), max(1.0, floor((y1 - y0) / (bw * 1.15))), vForm.z * 3.7, uTime * uMotion, bc, 1.0 - held);
              sign = 1.0;
            }
          }
          float R = min(W * 0.3, 11.0);
          vec2 mp = vec2(um - W * 0.5, vWorld.y - (vTier.x - R - 4.0)) / R;
          if (mark > 0.5 && squareOn > 0.5 && R > 4.0 && abs(mod(faceId, 2.0) - mix(floor(hs * 2.0), mod(flags, 2.0), worn)) < 0.5 && max(abs(mp.x), abs(mp.y)) < 1.12) {
            vec3 mc = hc < 0.45 ? vec3(0.16, 0.9, 1.0) : hc < 0.65 ? vec3(0.9, 0.95, 1.0) : hc < 0.82 ? vec3(1.0, 0.12, 0.2) : vec3(1.0, 0.58, 0.22);
            float k = clamp(markShape(mp, mark), 0.0, 1.0);
            col = mix(vec3(0.008, 0.009, 0.012), mc * 2.2, k);
            // A board bolted to the face with one of the city's adverts on
            // it, a tube of light round it, in place of the mark.
            if (held < 0.5 && uHasAds > 0.5) {
              vec2 st = mp / 2.24 + 0.5;
              float tube = step(0.465, max(abs(st.x - 0.5), abs(st.y - 0.5)));
              col = mix(boardFace(st, 1.0, vKind.z + 8.0 * step(1.5, faceId), vForm.z + 7.0 + faceId) * 1.35, mc * 1.8, tube);
              k = 1.0;
            }
            sign = max(sign, k);
          }
        }
        // A screen tower: its shaft a column of screens on every face
        // between lit corners, its cap dark between two lines of the same
        // light.
        float screens = 0.0;
        if (abs(style - 5.0) < 0.1 && onWall > 0.5 && parapet < 0.5 && vForm.w > 0.5) {
          vec3 rim = hash12(vec2(vForm.z, 8.8)) > 0.12 ? vec3(0.16, 0.9, 1.0) : vec3(1.0, 0.22, 0.72);
          if (vForm.w < 1.5) {
            vec4 sc = screenColumn(vec2(vHero.y, vWorld.y - vTier.y - 2.0), vHero.z, vTier.x - vTier.y - 4.0, vForm.z + mod(vHero.w, 4.0) * 13.0, uTime * uMotion);
            float corner = step(min(vHero.y, 1.0 - vHero.y), 0.03);
            col = mix(sc.rgb, rim * 1.5, corner);
            screens = max(sc.a, corner);
          } else {
            float lines = clamp(step(vWorld.y, vTier.y + 0.7) + step(vTier.x - 0.7, vWorld.y), 0.0, 1.0);
            col = mix(vec3(0.008, 0.009, 0.013), rim * 1.7, lines);
            screens = lines;
          }
        }
        // The far layer: its lit rooms carry a mile, and what is not lit
        // stands darker than the lit air behind it (until, at the edge of
        // what is drawn at all, it is the air).
        float farOff = step(5.5, style);
        // The night's own light on a wall, and the street's a long way up
        // it: a tower's body is navy against the sky, not black (but within
        // what Contact frames, where a wall is as it was).
        float unlit = 1.0 - min(1.0, max(max(win.a, faceLit), max(max(crown, steps), max(max(sign, screen), max(screens, footLit)))));
        col += (uHazeColor * mix(0.5, 0.25, step(1.5, vHero.x)) + quarterLight(vDress.w, 0.0) * 0.012 * exp(-max(vWorld.y, 0.0) / 45.0)) * uHaze * onWall * fresh * (1.0 - held) * (1.0 - farOff) * unlit;
        col = mix(col, col * mix(4.0, 2.2, zoned), farOff * win.a * onWall * (1.0 - parapet));
        col = cityFog(col, vWorld, max(max(max(win.a * 0.8 * onWall * (1.0 - parapet), max(crown, steps)), max(blade, sign)), max(max(screen, glassCrown * 0.6), max(screens, max(footLit, max(roofLit, faceLit))))));
        col = sodiumBeyond(col, vWorld);
        col *= mix(1.0, mix(0.6 + 0.4 * win.a * onWall, 1.0, smoothstep(1900.0, 2350.0, length(vWorld - uCam))), farOff);
        // For an eye above the roofs the air between is lit, as the sky
        // behind is: what stands further off is paler, row behind row.
        col += lift * vec3(0.003, 0.02, 0.07) * (1.0 - exp(-length(vWorld - uCam) / 1100.0)) * exp(-max(vWorld.y, 0.0) / 500.0) * uHaze;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "skyline";

  // Per building: where (x, z, turn), its footprint and roof and parapet, its
  // tiers' heights and footprints, its cut, kind, dressing and screen.
  // What the shader once hashed per vertex is worked out once per building
  // from where it stands, by the same hash in the GPU's own precision: its
  // windows' lit fraction, style and warmth, where its cells start, and its
  // crown's draw. A split block's two buildings share the block's look.
  const looks = lots.map((b, i) => {
    const block = b.block ?? b;
    const seed = at(block);
    const look = [0.14 + 0.5 * hash11(seed), hash11(seed + 1.7) * 0.625, hash11(seed + 3.1), hash11(seed + 5.0) * 40];
    if (b.hero) {
      look[0] = 0.55;
      look[1] = 0.25;
    }
    // A split block's second building starts its windows a few bays along,
    // so the pair does not read as one wall.
    if (b.second) look[3] += 7;
    // How it is dressed (Contact's own towers keep the dressing they have):
    // what is hung on a tower (a vertical blade on one face, 1 to 4, and
    // eight times a logo's kind under its roof, only where nothing capped
    // it), its wall's colour (the kit's tints: the towers charcoal, navy and
    // teal-black, the blocks any of them), and the colour of the street's
    // light at its foot, shared by a neighbourhood.
    const tower = b.h >= TOWER_FROM;
    const own = at(b);
    const hang = hash11(own + 21.3);
    const face = Math.floor(hash11(own + 27.1) * 4);
    let hung = 0;
    const dealt = faces[i];
    if (dealt?.worn) {
      // What it was dealt above, on the face that looks at the kit.
      if (dealt.feature === FEATURE.blade) hung += 1 + dealt.face;
      if (dealt.feature === FEATURE.mark) hung += 8 * (1 + Math.floor(hash11(own + 29.9) * 4));
    } else if (tower && b.free && !b.screens && !underMoon(b)) {
      if (b.h >= 70 && hang < 0.4) hung += 1 + face;
      if (b.h >= 105 && hang > 0.78) hung += 8 * (1 + Math.floor(hash11(own + 29.9) * 4));
    }
    // In the navy night a far wall is charcoal, navy or teal-black, a
    // block now and then brown or concrete; the plum and the rust were the
    // violet night's (and still are within what Contact frames).
    const tints = framed(b) ? (tower ? [0, 1, 1, 2, 2, 3] : [0, 1, 2, 3, 4, 5, 6, 4, 2, 5]) : tower ? [0, 1, 1, 2, 2, 1] : [0, 1, 2, 1, 4, 5, 2, 4, 2, 5];
    const tint = tints[Math.floor(hash11(seed + 23.9) * tints.length)];
    const quarter = hash11(f32(Math.floor((b.ox ?? b.x) / 180) * 12.9898 + Math.floor((b.oz ?? b.z) / 180) * 78.233));
    // A tower's face is one of six kinds (64 times its number, with what is
    // hung on it): floors lit in bands, rooms scattered between piers and
    // ledges, vertical strips of glass between solid ones, a dark face with
    // one board across it, a lattice of teal light over glass, an office's
    // ribbons between mullions. Not within what Contact frames, where a
    // tower is as it was.
    // (The lattice is the rarest: half of those dealt it are offices.)
    // (By its kind, as dealt: offices' mullions, nothing over a curtain
    // wall, piers and ledges on a slab and on homes, the lattice, the dark
    // face and its boards, plain floors of yellow, the strips.)
    const pattern = dealt?.braced ? 7 : dealt?.worn ? [6, 1, 2, 2, 5, 4, 1, 3][dealt.kind] : 0;
    const dress = [hung + 64 * pattern + (framed(b) ? 512 : 0), b.hero ? -1 : (tint + 0.5) / 8, b.landmark ? 0.9 : hash11(seed + 9.3), quarter];
    // The show's towers are lit in bands, floor by floor, more than in
    // scattered rooms: most towers take the band or the ribbon, and some
    // blocks the small windows of homes.
    if (!b.hero) {
      const cut = hash11(seed + 17.7);
      if (tower && cut < 0.42) look[1] = 0.625;
      else if (tower && cut < 0.62) look[1] = 0.25;
      else if (!tower && cut > 0.78) look[1] = 0.75;
      // People are home in the blocks, and no tower is a dark slab.
      look[0] = tower ? Math.max(look[0], 0.24) : 0.3 + 0.4 * hash11(seed);
    }
    // Its glass, by its kind: an office's ribbon, a curtain wall, a pair or
    // a tall single in a home.
    const either = hash11(own + 35.1) < 0.5;
    if (dealt && !framed(b)) look[1] = [0.25, 0.5, 0.25, either ? 0 : 0.125, 0.5, 0.5, 0.25, either ? 0.125 : 0.5][dealt.kind];
    // A megabuilding a mile off: few rooms lit, each a small window in a
    // cell several floors high (the vertex shader's), so it is a pinpoint.
    if (b.far) {
      look[0] = 0.3 + 0.2 * hash11(seed);
      look[1] = 0.375;
    }
    // Its kind (-1: none dealt), its accent, its advert, and in one number
    // the face its screen is on, whether it wears a band under its roof and
    // whether its corners are lit.
    const kind = dealt ? [dealt.kind, dealt.accent, dealt.ad, dealt.compass + (dealt.band ? 4 : 0) + (dealt.strips ? 8 : 0)] : [-1, 0, Math.floor(hash11(own + 47.3) * 16), 0];
    return { look, seed: hash11(at(b) + 14.9), dress, kind };
  });
  const cullers = [];
  const instanced = (list, slots, sides) => {
    const geometry = buildingGeometry(slots, sides);
    const attrs = { aBase: [], aSize: [], aTier: [], aInset: [], aForm: [], aOffset: [], aLook: [], aDress: [], aKind: [] };
    const spheres = [];
    for (const i of list) {
      const b = lots[i];
      const s = forms[i];
      attrs.aBase.push(b.x, b.z, Math.cos(b.yaw), Math.sin(b.yaw));
      attrs.aLook.push(...looks[i].look);
      attrs.aDress.push(...looks[i].dress);
      attrs.aKind.push(...looks[i].kind);
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
    // The city's extent: the shader puts every vertex where it is.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(300, 120, -400), 2400);
    const mesh = new THREE.Mesh(geometry, material);
    cullers.push(cullable(mesh, Object.keys(attrs), spheres));
    scene.add(mesh);
    return mesh;
  };
  const blockList = [];
  const squareList = [];
  const cutList = [];
  lots.forEach((b, i) => {
    if (!b.gone) (b.h < TOWER_FROM && !b.hero ? blockList : forms[i].chamfer > 0 ? cutList : squareList).push(i);
  });
  const blocks = instanced(blockList, 2, 4);
  blocks.name = "skyline_blocks";
  const squares = instanced(squareList, 4, 4);
  squares.name = "skyline_towers";
  const mesh = instanced(cutList, 4, 8);
  mesh.name = "skyline";

  // ---- the roofs --------------------------------------------------------------
  // The kit each roof drew above; a lot left out has none.
  const kitGeos = roofKits();
  const kitAt = kitGeos.map(() => []);
  const kitLook = kitGeos.map(() => []);
  kitOf.forEach((k, i) => {
    if (!k || lots[i].gone) return;
    kitAt[k.kit].push(...k.at);
    kitLook[k.kit].push(k.look[0], k.look[1], k.look[2], framed(lots[i]) ? 1 : 0);
  });
  const roofMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, ...ads, uNeon: { value: SIGN_NEON.map((c) => new THREE.Color(c)) }, uMotion: { value: reduced ? 0 : 1 } },
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
      ${ADVERT}
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
        // Each a character of bars, a stem and a box's sides, the same
        // either way round (a stem down one side only read as a letter
        // seen from behind).
        float s = kanji(vec2((f.x - 0.1) / 0.8, f.y), hash12(vec2(cellX, seed)), hash12(vec2(cellX + 7.0, seed))) * step(0.1, f.x) * step(f.x, 0.9);
        float px = max(fwidth(uv.x), fwidth(uv.y));
        // Two boards in three are lightboxes, lit right across with their
        // strokes dark on them; the rest are tubes on a board lit dimly
        // from behind. Either way the board is light: a bright tube round
        // a dark board reads from across the city as an empty frame.
        float box = step(hash12(vec2(seed, 31.0)), 0.66);
        float strokes = min(s, 1.0) * inside;
        float lit = mix(max(max(frame, strokes), 0.3 * (1.0 - frame)), mix(0.62, 0.1, strokes) * (1.0 - 0.45 * frame), box);
        return mix(lit, mix(0.38, 0.52, box), smoothstep(0.02, 0.06, px));
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
          // It has one face, toward the middle of the kit (toward Contact's
          // lens, within what it frames). The other is its back: a dark
          // sheet on its frame, the tubes' light coming round the edge.
          float rear = step(dot(n.xz, (vLook.w > 0.5 ? vec2(${CONTACT_LENS[0]}.0, ${CONTACT_LENS[1]}.0) : vec2(160.0, -330.0)) - vWorld.xz), 0.0);
          // Two of the city's adverts side by side in a tube of the sign's
          // colour (but within what Contact frames, where a sign is as it
          // was).
          if (vLook.w < 0.5 && uHasAds > 0.5) {
            vec2 st = vec2(fract(vSignUv.x * 2.0), vSignUv.y);
            float tube = 1.0 - step(0.035, st.x) * step(st.x, 0.965) * step(0.07, st.y) * step(st.y, 0.93);
            float ni = abs(vLook.y - 3.0) < 0.5 ? 1.0 : abs(vLook.y - 5.0) < 0.5 ? 2.0 : vLook.y;
            col = mix(boardFace(st, 1.4, floor(seed * 50.0) + floor(vSignUv.x * 2.0) * 3.0, seed * 50.0 + floor(vSignUv.x * 2.0)) * 1.4, neon(ni) * 2.2, tube) * (1.0 - 0.85 * cut);
          }
          emissive = 1.0;
          if (rear > 0.5) {
            col = signBack(vSignUv, 2.8, neon(vLook.y)) * (1.0 - 0.85 * cut);
            emissive = 0.2;
          }
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
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(300, 60, -400), 2400);
    const m = new THREE.Mesh(g, roofMat);
    m.name = `skyline_roofs_${Object.keys(KIT)[k]}`;
    m.visible = n > 0;
    if (n) cullers.push(cullable(m, ["aKitAt", "aKitLook"], spheres));
    scene.add(m);
    return m;
  });

  // Aviation lights: a red lamp on every tall roof (at a spire's tip, where
  // there is one), a third of them on at a time, a little under a second
  // each, so the skyline blinks slowly across itself. Steady under reduced
  // motion. One draw, which the far city's air traffic shares.
  const beacons = [];
  const groups = [];
  const moves = [];
  lots.forEach((b, i) => {
    // Outside what Contact frames every tower has its lamp, not only the
    // tallest, and it is a lamp to be seen across the city (groups 5 to 7).
    const all = b.h >= TOWER_FROM && !b.hero && !framed(b);
    if ((beaconOf[i] < 0 && !all) || b.gone) return;
    const s = forms[i];
    const [cx, cz] = topCentre(b, s);
    beacons.push(cx, s.roof + s.spire + (s.spire ? 0.4 : 0.8), cz);
    groups.push(all ? 5 + (beaconOf[i] < 0 ? i % 3 : beaconOf[i]) : beaconOf[i]);
    moves.push(0, 0, 0, 0);
  });
  // And one on every mast, whip and deck end.
  for (let i = 0; i < tips.length; i += 3) {
    beacons.push(tips[i], tips[i + 1], tips[i + 2]);
    groups.push(5 + ((i / 3) % 3));
    moves.push(0, 0, 0, 0);
  }
  // The AVs' lamps: one ahead (group 3) and one six metres behind it (4).
  for (const [x, y, z, dx, dz, length, phase] of avs) {
    beacons.push(x, y, z, x, y, z);
    groups.push(3, 4);
    moves.push(dx, dz, length, phase, dx, dz, length, phase - 6 / length);
  }
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute("position", new THREE.Float32BufferAttribute(beacons, 3));
  beaconGeo.setAttribute("aGroup", new THREE.Float32BufferAttribute(groups, 1));
  beaconGeo.setAttribute("aMove", new THREE.Float32BufferAttribute(moves, 4));
  // The lamps on the roofs stand where their positions say; the AVs do not.
  beaconGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(300, 120, -400), 2400);
  const beaconMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uPixel: { value: 1 }, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      attribute float aGroup;
      attribute vec4 aMove;
      uniform float uTime;
      uniform float uPixel;
      uniform float uMotion;
      varying float vOn;
      varying float vKind;
      varying vec3 vWorld;
      void main() {
        // An AV's lamp is so far along its lane (38 m/s, standing where its
        // phase puts it under reduced motion), fading in and out at the
        // lane's ends so it never pops.
        float flying = step(2.5, aGroup) * step(aGroup, 4.5);
        float tip = step(4.5, aGroup);
        float along = mod(uTime * uMotion * 38.0 + aMove.w * aMove.z, max(aMove.z, 1.0));
        vec3 p = position + vec3(aMove.x, 0.0, aMove.y) * along * flying;
        vWorld = p;
        vKind = aGroup;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float t = fract(uTime * 0.75 + mod(aGroup, 5.0) / 3.0);
        float blink = mix(0.6, smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.42, 0.55, t)), uMotion);
        // A tip's lamp never goes right out: it swells and falls.
        blink = mix(blink, 0.45 + 0.55 * blink, tip);
        float ends = smoothstep(0.0, 70.0, along) * (1.0 - smoothstep(aMove.z - 70.0, aMove.z, along));
        vOn = mix(blink, ends, flying);
        gl_PointSize = mix(clamp(mix(2600.0, 3400.0, flying) / -mv.z, mix(2.5, 2.8, flying), mix(6.0, 8.0, flying)), clamp(4200.0 / -mv.z, 3.4, 9.0), tip) * uPixel;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying float vOn;
      varying float vKind;
      varying vec3 vWorld;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        vec3 lamp = vKind < 2.5 || vKind > 4.5 ? vec3(1.0, 0.06, 0.04) * 3.5 : vKind < 3.5 ? vec3(0.8, 0.92, 1.0) * 2.6 : vec3(1.0, 0.1, 0.06) * 2.2;
        vec3 col = lamp * vOn * exp(-d * d * 4.0);
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

${STREET}
      // The far city's ground: its blocks stand on a ${cell} m grid, so its
      // streets run between them: wet asphalt 12 m wide between kerbs, a
      // dashed line down its middle, paving either side to the lot line,
      // and inside the block a paved yard with a lamp of its own somewhere
      // in it, so that no ground past the kit is a black plane. A lamp
      // every eleven and a half metres down each kerb, a pool of light under
      // it, and now and then a car's lights going along. Past a pixel a lamp
      // is spread into its street rather than sparkling, and the paint and
      // the joints are gone.
      // What is in a block of the far city where no building stands on it
      // (and round the foot of one that does): c is metres from the
      // block's middle, lot which block. A car park under four lamps, its
      // bays painted and most of them taken; a floodlit court; a yard of
      // containers; a pocket park, its paths lit; a slab being built on.
      // gl is the night's light on the ground. Far off, each its mean.
      vec3 yardOf(vec2 c, vec2 lot, vec3 gl, float px) {
        float fine = 1.0 - smoothstep(0.25, 1.0, px);
        float kind = hash12(lot + 17.3);
        float hk = hash12(lot + 29.7);
        vec2 a = abs(c);
        if (kind < 0.34) {
          // Bays 2.5 m wide in four rows along x, an aisle between each pair.
          vec3 col = vec3(0.03, 0.03, 0.034) * gl;
          float row = floor((c.y + 12.5) / 5.0);
          float fy = fract((c.y + 12.5) / 5.0) * 5.0;
          float bay = floor(c.x / 2.5);
          float fx = fract(c.x / 2.5) * 2.5;
          float parked = step(1.5, mod(row + 1.0, 3.0)) + step(mod(row + 1.0, 3.0), 0.5);
          float line = step(min(fx, 2.5 - fx), 0.07) * step(0.2, fy) * parked * fine;
          col = mix(col, vec3(0.3, 0.3, 0.3) * gl, line);
          float hc = hash12(vec2(bay, row) + lot * 3.1);
          float car = step(abs(fx - 1.25), 0.9) * step(abs(fy - 2.5), 2.1) * step(0.38, hc) * parked;
          vec3 paint = hc < 0.55 ? vec3(0.02, 0.021, 0.025) : hc < 0.7 ? vec3(0.1, 0.1, 0.11) : hc < 0.8 ? vec3(0.11, 0.016, 0.02) : hc < 0.9 ? vec3(0.015, 0.035, 0.09) : vec3(0.16, 0.16, 0.17);
          float glass = step(abs(fy - 2.2), 0.9) * step(abs(fx - 1.25), 0.72);
          vec3 carCol = mix(paint * gl * 1.5, vec3(0.006, 0.009, 0.014) + gl * 0.012, glass);
          col = mix(col, mix(carCol, paint * gl, 1.0 - fine), car * mix(1.0, 0.6, 1.0 - fine));
          vec2 d = a - vec2(6.5, 5.0);
          vec3 lampCol = hk < 0.6 ? vec3(1.0, 0.72, 0.42) : vec3(0.75, 0.88, 1.0);
          col += lampCol * (0.16 * exp(-dot(d, d) / 30.0) + 0.5 * exp(-dot(d, d) / max(0.2, px * px)) * min(1.0, 0.3 / (px * px)));
          return col;
        }
        if (kind < 0.52) {
          // A court, painted and floodlit from two masts.
          vec3 paintCol = hk < 0.4 ? vec3(0.02, 0.06, 0.12) : hk < 0.75 ? vec3(0.03, 0.09, 0.05) : vec3(0.11, 0.045, 0.03);
          float court = step(a.x, 11.0) * step(a.y, 6.5);
          float lines = step(abs(a.x - 11.0), 0.08) * step(a.y, 6.5) + step(abs(a.y - 6.5), 0.08) * step(a.x, 11.0) + step(a.x, 0.06) * step(a.y, 6.5) + step(abs(length(c) - 1.8), 0.06) + step(abs(length(a - vec2(8.6, 0.0)) - 2.2), 0.06);
          vec3 flood = vec3(0.86, 0.92, 1.0) * (0.34 * exp(-dot(c, c) / 110.0));
          vec3 col = mix(vec3(0.028, 0.028, 0.032), paintCol, court) * (gl + flood * 2.0);
          col = mix(col, vec3(0.42) * (gl + flood * 2.0), min(lines, 1.0) * court * fine);
          return col + flood * 0.03;
        }
        if (kind < 0.7) {
          // Containers in rows, two and three deep.
          vec2 g = vec2(c.x / 12.6, c.y / 2.9);
          vec2 f = fract(g);
          float hb = hash12(floor(g) + lot * 5.3);
          float box = step(0.03, f.x) * step(f.x, 0.97) * step(0.06, f.y) * step(f.y, 0.94) * step(0.42, hb) * step(a.x, 12.4) * step(a.y, 11.4);
          vec3 paint = hb < 0.56 ? vec3(0.12, 0.045, 0.025) : hb < 0.7 ? vec3(0.02, 0.05, 0.11) : hb < 0.82 ? vec3(0.03, 0.09, 0.06) : hb < 0.92 ? vec3(0.1, 0.1, 0.1) : vec3(0.15, 0.1, 0.02);
          float rib = 0.82 + 0.18 * step(0.5, fract(c.x / 0.42));
          vec3 col = mix(vec3(0.024, 0.024, 0.028) * gl, paint * gl * (1.0 + hb) * mix(rib, 0.91, 1.0 - fine), box);
          vec2 d = c - (vec2(hk, fract(hk * 7.3)) - 0.5) * 14.0;
          return col + vec3(1.0, 0.6, 0.26) * 0.2 * exp(-dot(d, d) / 46.0) * (1.0 + 2.0 * box);
        }
        if (kind < 0.85) {
          // A pocket park: grass, two paths crossing, a lamp at each end.
          float path = max(step(a.x, 1.1), step(a.y, 1.1));
          float ring = step(abs(length(c) - 3.4), 0.5);
          vec3 col = mix(vec3(0.012, 0.04, 0.02) * (0.8 + 0.4 * hash12(floor(c / 1.7) + lot)), vec3(0.11, 0.105, 0.095), max(path, ring)) * gl;
          float e = min(abs(a.x - 9.0) + a.y, abs(a.y - 9.0) + a.x);
          vec3 lampCol = hk < 0.7 ? vec3(1.0, 0.74, 0.44) : vec3(0.3, 0.95, 0.85);
          return col + lampCol * (0.16 * exp(-e * e / 16.0) + 0.1 * exp(-dot(c, c) / 20.0));
        }
        // A slab going up: pale concrete, bars laid out on it, a cabin
        // with its light on, a hazard line round it.
        vec3 col = vec3(0.085, 0.085, 0.08) * gl * (1.0 - 0.3 * fine * step(min(fract(c.x / 1.2), fract(c.y / 1.2)), 0.08));
        col = mix(col, vec3(0.3, 0.22, 0.02) * gl, step(abs(max(a.x, a.y) - 11.6), 0.25) * step(0.5, fract((c.x + c.y) / 1.6)) * fine);
        vec2 d = c - vec2(7.0, -7.5) * (hk < 0.5 ? 1.0 : -1.0);
        col = mix(col, vec3(0.12, 0.13, 0.15) * gl, step(max(abs(d.x) - 3.0, abs(d.y) - 1.3), 0.0));
        return col + vec3(0.9, 0.95, 1.0) * 0.22 * exp(-dot(d, d) / 40.0);
      }

      vec3 streets(vec3 p, float time, float px, float lift) {
        vec2 q = (p.xz + vec2(${900 - cell / 2}.0, ${1700 - cell / 2}.0)) / ${cell}.0;
        // Signed metres from the nearest street's middle, on each axis.
        vec2 off = (fract(q + 0.5) - 0.5) * ${cell}.0;
        vec2 id = floor(q + 0.5);
        float mid = min(abs(off.x), abs(off.y));
        float road = 1.0 - smoothstep(5.0, 6.0 + px, mid);
        float walk = (1.0 - road) * (1.0 - smoothstep(9.6, 10.4 + px, mid));
        float close = 1.0 - smoothstep(0.08, 0.4, px);
        vec3 paving = vec3(0.017, 0.017, 0.02) * (1.0 - 0.3 * close * step(min(fract(p.x * 0.5), fract(p.z * 0.5)), 0.05));
        vec3 yard = vec3(0.011, 0.011, 0.014) * (1.0 - 0.25 * close * step(min(fract(p.x * 0.25), fract(p.z * 0.25)), 0.03));
        vec3 base = mix(mix(yard, paving, walk), vec3(0.006, 0.006, 0.008) + uHazeColor * 0.035, road);
        // The night's light on the ground, and under it what the ground
        // is: wet asphalt that holds the sky, flags, and inside the block
        // whatever the block is used for. (Within what Contact frames the
        // ground is as it was, but for an eye above the roofs.)
        float bearing = degrees(atan(p.z - ${CONTACT_LENS[1]}.0, p.x - ${CONTACT_LENS[0]}.0));
        float outside = clamp(step(bearing, ${FRAMED[0]}.0) + step(${FRAMED[1]}.0, bearing), 0.0, 1.0);
        float renew = max(lift, outside);
        if (renew > 0.001) {
          vec3 gl = vec3(0.3) + (uHazeColor * 0.3 + uGlowColor * 0.16) * uHaze * 22.0;
          vec3 wet = vec3(0.016, 0.016, 0.019) * gl + (uHazeColor * 0.1 + uGlowColor * 0.03) * uHaze;
          vec3 flags = vec3(0.05, 0.05, 0.054) * gl * (1.0 - 0.3 * close * step(min(fract(p.x * 0.5), fract(p.z * 0.5)), 0.05));
          vec3 inside = yardOf((fract(q) - 0.5) * ${cell}.0, floor(q), gl, px);
          base = mix(base, mix(mix(inside, flags, walk), wet, road), renew);
        }
        // The kerb's edge, and the line down the middle of whichever street
        // this is, broken at the junctions.
        float alongX = step(abs(off.y), abs(off.x));
        float away = max(abs(off.x), abs(off.y));
        float run = alongX > 0.5 ? p.x : p.z;
        base += vec3(0.02, 0.02, 0.022) * close * (1.0 - smoothstep(0.0, 0.12, abs(mid - 6.0)));
        base += vec3(0.11, 0.11, 0.1) * close * step(mid, 0.09) * step(fract(run / 9.0), 0.34) * step(7.0, away);
        // A crossing on each arm of a junction, striped as the kit's are.
        base += vec3(0.16, 0.12, 0.02) * close * road * step(7.2, away) * step(away, 10.2) * step(0.5, fract((alongX > 0.5 ? p.z : p.x) / 1.3));
        // A yard's own lamp.
        vec2 lot = floor(q);
        vec2 inLot = (fract(q) - 0.5) * ${cell}.0 - (vec2(hash12(lot + 2.3), hash12(lot + 7.9)) - 0.5) * 20.0;
        float lh = hash12(lot + 11.1);
        // (Cyan and sodium in the navy night, pink for one in twenty five;
        // within what Contact frames, as they were.)
        float pinkFrom = mix(0.66, 0.76, outside);
        base += (1.0 - renew) * (lh > 0.8 ? vec3(0.2, 0.85, 0.95) : lh > 0.66 ? (lh > pinkFrom ? vec3(1.0, 0.25, 0.7) : vec3(0.2, 0.85, 0.95)) : vec3(1.0, 0.6, 0.3)) * exp(-dot(inLot, inLot) / 34.0) * 0.05 * step(0.3, lh);
        vec3 light = vec3(0.0);
        // On the dressed streets, seen from the pavement, a shop's light is
        // the shop's own and a car is a car: the glow that stands for them
        // from the air is for the air.
        float afar = mix(1.0, smoothstep(0.15, 0.6, px), dressedAt(p.xz));
        // Streets along z (off.x small) and along x (off.y small).
        for (int k = 0; k < 2; k++) {
          float across = k == 0 ? off.x : off.y;
          float along = k == 0 ? p.z : p.x;
          float street = k == 0 ? id.x : id.y;
          if (abs(across) > 9.0 + px) continue;
          light += kerbLamps(across, along, street, float(k), px);
          // Shopfronts at the foot of the blocks: a band of light along each
          // kerb, a colour to each front, some of them shut.
          float front = hash12(vec2(floor(along / 7.0), street * 5.3 + float(k) * 7.0 + step(0.0, across)));
          vec3 shopCol = front > 0.96 ? vec3(1.0, 0.25, 0.6) : front > 0.93 ? vec3(0.2, 0.85, 1.0) : vec3(1.0, 0.72, 0.48);
          float within = step(abs(fract(along / 7.0) - 0.5), 0.36);
          float rs = max(1.2, px);
          float kerb = abs(across) - 7.4;
          light += shopCol * exp(-kerb * kerb / (rs * rs)) * (1.2 / rs) * step(0.55, front) * mix(0.72, within, 1.0 - smoothstep(1.0, 4.0, px)) * 0.22 * afar;
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
            light += (lane == 0 ? vec3(1.0, 0.92, 0.8) : vec3(1.0, 0.08, 0.05)) * car * present * 2.0 * afar;
          }
        }
        return base + light;
      }

      // Whether a point on the ground is inside the kit's footprint (six
      // metres inside its rectangles: the districts' own ground stops a
      // little short of them, and the strip between was black).
      float inKit(vec2 p) {
        float k = 0.0;
${[...KEEP_OUT, ...KEEP_OUT_SINCE].map(([x0, z0, x1, z1]) => `        k = max(k, step(${(x0 + 6).toFixed(1)}, p.x) * step(p.x, ${(x1 - 6).toFixed(1)}) * step(${(z0 + 6).toFixed(1)}, p.y) * step(p.y, ${(z1 - 6).toFixed(1)}));`).join("\n")}
        return k;
      }

      // Searchlights from downtown and the south, sweeping slowly (the
      // south one well left of Contact's moon, which it would skewer): the
      // nearest a view ray comes to each beam, lit the more the closer, the
      // beam widening as it climbs and gone into the cloud.
      // One beam: the nearest a view ray comes to it, lit the more the
      // closer, the beam widening as it climbs and gone into the cloud.
      float beam(vec3 base, vec3 a, vec3 dir, float broad) {
        vec3 w0 = uCam - base;
        float b = dot(dir, a);
        float d = dot(dir, w0);
        float e = dot(a, w0);
        float den = max(1.0 - b * b, 1e-4);
        float tau = (b * e - d) / den;
        float s = (e - b * d) / den;
        if (tau <= 0.0 || s <= 0.0) return 0.0;
        vec3 gap = w0 + dir * tau - a * s;
        float width = mix(3.0 + s * 0.03, 11.0 + s * 0.055, broad);
        float height = base.y + a.y * s;
        return exp(-dot(gap, gap) / (width * width)) * exp(-s / 900.0) * exp(-tau * 0.00035) * (1.0 - smoothstep(${CLOUD_H - 80}.0, ${CLOUD_H + 40}.0, height));
      }
      vec3 searchlights(vec3 dir, float time) {
        float sum = 0.0;
        float lift = smoothstep(40.0, 62.0, uCam.y);
        for (int i = 0; i < ${count < 2000 ? 6 : 9}; i++) {
          float fi = float(i);
          // The first three are a kilometre off and faint. The others stand
          // just past the kit, west, east, south, south-west, north-west
          // and further east, each far enough off the hero's avenue and
          // Contact's moon that its sweep never crosses either.
          vec3 base = i == 0 ? vec3(-460.0, 0.0, -1500.0) : i == 1 ? vec3(420.0, 0.0, -1250.0) : i == 2 ? vec3(-200.0, 0.0, 1000.0)
            : i == 3 ? vec3(-520.0, 0.0, -250.0) : i == 4 ? vec3(820.0, 0.0, -560.0) : i == 5 ? vec3(60.0, 0.0, 480.0)
            : i == 6 ? vec3(-420.0, 0.0, 330.0) : i == 7 ? vec3(-700.0, 0.0, -500.0) : vec3(1150.0, 0.0, -420.0);
          float turn = time * (0.045 + 0.018 * fi) + fi * 2.4;
          float lean = 0.34 + 0.12 * sin(time * 0.06 + fi * 1.7);
          // The near ones are broad, a pale band across the whole sky (but
          // the east one, which sweeps through Corpo Row's low angle), and
          // they work in pairs: a second beam from the same lamps, crossing
          // the first.
          float broad = i > 2 && i != 4 ? 1.0 : 0.0;
          float gain = broad > 0.5 ? 4.6 : i > 2 ? 1.8 : 1.0;
          sum += beam(base, normalize(vec3(sin(turn) * lean, 1.0, cos(turn) * lean)), dir, broad) * gain;
          // (The second beam is for an eye above the roofs, as is their
          // strength there, where the air is lit: from the page's own
          // lenses the sky holds the beams it had.)
          if (broad > 0.5 && lift > 0.001) sum += beam(base + vec3(14.0, 0.0, 9.0), normalize(vec3(sin(turn * 0.8 + 2.3) * (0.5 - lean * 0.6), 1.0, cos(turn * 0.8 + 2.3) * (0.5 - lean * 0.6))), dir, broad) * gain * 0.8 * lift;
        }
        return vec3(0.6, 0.68, 0.9) * sum * 0.075 * uHaze * mix(1.0, 2.0, lift);
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
        // For an eye above the roofs the night is the show's: deep blue
        // overhead, brighter and bluer down to the horizon, cyan in the
        // last degrees and a trace of the city's sodium green on the line
        // itself; and downtown's violet eases into it over a wide arc, not
        // at an edge. (From the streets and the roofs the page looks from,
        // the sky is as it was.)
        float lift = smoothstep(40.0, 62.0, uCam.y);
        vec2 toDown = normalize(vec2(-8.0, -640.0) - uCam.xz + 1e-4);
        float arc = pow(max(dot(normalize(dir.xz + 1e-5), toDown), 0.0), 1.5);
        vec3 air = vec3(0.0015, 0.005, 0.03) + vec3(0.003, 0.022, 0.1) * exp(-h * 4.5) + vec3(0.006, 0.07, 0.1) * exp(-h * 16.0) + vec3(0.02, 0.035, 0.008) * exp(-h * 34.0);
        col += lift * uHaze * mix(air, vec3(air.b * 0.45, air.g * 0.3, air.b * 0.9) + vec3(0.03, 0.006, 0.05) * exp(-h * 5.0), arc * 0.7);
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
          // And storms of the far city's own, out over its edges west,
          // south and east (never up the hero's avenue nor behind Contact's
          // moon): each cell flickers for half a second every several, on
          // its own clock, so some view always has one going.
          for (int j = 0; j < 5; j++) {
            float fj = float(j);
            vec2 at = j == 0 ? vec2(-1150.0, -260.0) : j == 1 ? vec2(-520.0, 1250.0) : j == 2 ? vec2(1500.0, -1000.0) : j == 3 ? vec2(-1000.0, 600.0) : vec2(-1250.0, -900.0);
            float u = fract(time / (7.0 + 1.5 * fj) + (j == 0 ? 0.316 : j == 1 ? 0.618 : j == 2 ? 0.5 : j == 3 ? 0.4 : 0.3));
            if (u > 0.12) continue;
            float pulse = exp(-u * 60.0) + 0.7 * exp(-abs(u - 0.035) * 90.0) + 0.5 * exp(-abs(u - 0.06) * 120.0);
            vec2 off = (p.xz - at) / 520.0;
            col += vec3(0.62, 0.64, 0.92) * pulse * exp(-dot(off, off)) * (0.12 + 0.88 * cover * n) * near;
          }
        } else if (uCam.y > 0.0) {
          // Inside the kit's footprint, anything near that shows the
          // ground is a gap between the kit's own pieces, and it stays
          // dark. Past it the ground is the far city's from the first metre.
          vec3 ground = streets(pg, time, px, smoothstep(40.0, 62.0, uCam.y)) * mix(1.0, smoothstep(20.0, 60.0, tg), inKit(pg.xz));
          vec3 fogged = sodiumBeyond(cityFog(ground, pg, 0.0), pg);
          // (And the far ground goes into that horizon, not into the dark.)
          fogged += lift * vec3(0.004, 0.03, 0.09) * (1.0 - exp(-tg / 1300.0)) * uHaze;
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
    // What stands where (the tools under the city's cache read it).
    plan: { lots, forms, boxes },
    update(camera, pixelRatio = 1) {
      sky.position.copy(camera.position);
      beaconMat.uniforms.uPixel.value = pixelRatio;
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      for (const c of cullers) c.update(frustum);
      farStreet.update(frustum, camera.position);
    },
    dispose() {
      scene.remove(mesh, blocks, squares, sky, beaconPoints, ...roofMeshes);
      skyColumns.dispose();
      farStreet.dispose();
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
