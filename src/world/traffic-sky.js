// src/world/traffic-sky.js: where the flying cars fly.
//
// Two kinds of lane. A street's: out along one side of it and back along
// the other a little higher or lower, at one speed, turning round at each
// end, so the craft on it are strung evenly along the street and a driver
// or a walker under it always has some ahead in the strip of sky between
// the roofs. And a loop: an ellipse over a district, banked, higher, for
// the roofs and for anyone flying. Every lane's height was set from the
// kit's own roofs seen from above (tools/avcheck.mjs: nothing under a
// lane's sweep comes within five metres of a craft's belly), and each says
// how many craft it carries on a desktop and on a phone.
//
// No three.js in here: places come out as plain numbers.

// A street's lane: from a to b (x, z), `half` to each side of that line,
// `y` going out and `y + lift` coming back, `v` metres a second.
// A loop: centre c, radii r, altitude y, speed v, and `s` where the craft
// is a bigger one. `n` craft on a desktop, `phone` of them on a phone.
export const LANES = [
  // The loops round the hero's sky first (a phone keeps these): over the
  // canyon's mouth and over its far end, above the canyon's roofs.
  // (`held`: what flies over the canyon is dealt as it was, the four first
  // kinds alone, so the hero's sky holds; see createCraft.)
  { c: [0, -420], r: [60, 36], y: 195, v: 20, n: 3, phone: 2, held: 1 },
  { c: [-30, -600], r: [120, 40], y: 124, v: 30, n: 3, phone: 1, held: 1 },
  // Across the moon, seen from the garage's roof: a heavier craft, slower,
  // so that 300 m off it crosses the disc as a silhouette with its lamps
  // lit and not as a speck.
  { c: [620, 120], r: [200, 70], y: 172, v: 30, s: 2.6, n: 2, phone: 1 },
  // The streets, low: the strip of sky a driver has ahead. The canyon's is
  // the highest of them: bridges cross it up to 49 m.
  { a: [0, -428], b: [0, -528], half: 5.5, y: 56, lift: 5, v: 9, narrow: 1, n: 5, phone: 1, held: 1 },
  { a: [-80, -30], b: [-80, -700], half: 5, y: 43, lift: 5, v: 8.5, n: 7, phone: 1 },
  { a: [120, -20], b: [120, -310], half: 4.5, y: 32, lift: 5, v: 8, narrow: 1, n: 4, phone: 1 },
  { a: [136, -330], b: [426, -330], half: 5, y: 30, lift: 5, v: 8.5, n: 6, phone: 1 },
  { a: [420, 1], b: [-60, 1], half: 4, y: 30, lift: 5, v: 9, narrow: 1, n: 6, phone: 1 },
  { a: [-66, -720], b: [52, -720], half: 4, y: 34, lift: 4, v: 7, narrow: 1, n: 6, phone: 1 },
  { a: [20, -179], b: [420, -179], half: 4, y: 34, lift: 5, v: 9, narrow: 1, n: 5, phone: 0 },
  // Low across the deck, over its own road and its lamp masts.
  { a: [-66, -80], b: [104, -80], half: 2.2, y: 48, lift: 4, v: 7, n: 3, phone: 1 },
  // The streets again, between the towers: higher, slower to pass.
  { a: [0, -320], b: [0, -580], half: 5.5, y: 80, lift: -6, v: 8.5, band: 0, n: 5, phone: 1, held: 1 },
  { a: [130, -330], b: [430, -330], half: 5, y: 62, lift: 5, v: 8, n: 3, phone: 0 },
  { a: [-70, 1], b: [430, 1], half: 5, y: 48, lift: 5, v: 9, narrow: 1, n: 4, phone: 0 },
  { a: [-80, -10], b: [-80, -670], half: 6, y: 58, lift: 5, v: 8.5, n: 4, phone: 0 },
  { a: [120, -5], b: [120, -325], half: 5, y: 70, lift: 5, v: 7.5, n: 3, phone: 0 },
  { a: [440, -5], b: [440, -325], half: 5, y: 50, lift: 4, v: 7.5, n: 5, phone: 1 },
  { a: [-75, -179], b: [435, -179], half: 5, y: 96, lift: 5, v: 9, n: 4, phone: 0 },
  // The loops over the districts, for the roofs and the air: Corpo Row's
  // south side, a third lane high along the boulevard before its towers'
  // faces, the megabuilding's street, the plaza and the x 120 road,
  // Japantown's low roofs, the garage's block.
  { c: [320, -260], r: [140, 70], y: 70, v: 28, n: 4, phone: 0 },
  { a: [130, -330], b: [430, -330], half: 5, y: 112, lift: 8, v: 9, n: 3, phone: 0 },
  { c: [0, -650], r: [200, 60], y: 128, v: 40, n: 3, phone: 0 },
  { c: [100, -215], r: [70, 60], y: 78, v: 24, n: 3, phone: 0 },
  { c: [-130, -375], r: [36, 360], y: 54, v: 22, n: 7, phone: 1 },
  { c: [455, -200], r: [50, 120], y: 76, v: 24, n: 3, phone: 0 },
  // Across the south: Santo Domingo's yards, the arm, the plaza's south.
  { c: [300, -85], r: [130, 66], y: 72, v: 28, narrow: 1, n: 4, phone: 1 },
  { c: [150, -60], r: [230, 56], y: 86, v: 34, n: 4, phone: 0 },
  { c: [40, 30], r: [150, 50], y: 60, v: 26, narrow: 1, n: 3, phone: 0 },
  // Over the plaza's square, round its hub.
  { c: [79, -228], r: [30, 26], y: 48, v: 12, narrow: 1, n: 2, phone: 0 },
  // And low over the south arm, which no other lane reaches.
  { a: [0, 10], b: [0, 82], half: 5.5, y: 38, lift: 4, v: 5, n: 2, phone: 0 },
  // Out among the far city's towers, at the height a flying lens is: the
  // corridors between them where nothing stands as high as the lane
  // (tools/corridors.mjs), south, west, north and east of the kit, so a
  // view from the air has traffic at its own height whichever way it looks.
  { a: [10, 276], b: [412, 276], half: 4.5, y: 86, lift: 4, v: 10, n: 5, phone: 1 },
  { a: [10, 260], b: [296, 260], half: 4.5, y: 64, lift: 4, v: 9, n: 4, phone: 0 },
  { a: [-60, 306], b: [-60, 634], half: 4.5, y: 86, lift: 4, v: 10, n: 4, phone: 0 },
  { a: [360, 250], b: [360, 514], half: 4.5, y: 86, lift: 4, v: 10, n: 3, phone: 0 },
  { a: [-470, 332], b: [-136, 332], half: 4.5, y: 86, lift: 4, v: 10, n: 4, phone: 0 },
  { a: [-212, 76], b: [-212, 528], half: 4.5, y: 86, lift: 4, v: 10, n: 5, phone: 1 },
  { a: [512, 208], b: [512, 518], half: 4.5, y: 86, lift: 4, v: 10, n: 3, phone: 0 },
  { a: [-244, 70], b: [-244, -386], half: 4.5, y: 86, lift: 4, v: 10, n: 5, phone: 3 },
  { a: [-356, -350], b: [-356, -612], half: 4.5, y: 86, lift: 4, v: 10, n: 3, phone: 0 },
  { a: [-444, -142], b: [-444, -562], half: 4.5, y: 86, lift: 4, v: 10, n: 4, phone: 0 },
  { a: [-556, -284], b: [-272, -284], half: 4.5, y: 64, lift: 4, v: 9, n: 3, phone: 0 },
  { a: [-176, 172], b: [-176, -800], half: 4, y: 70, lift: 4, v: 10, n: 11, phone: 3 },
  { a: [-470, -936], b: [-50, -936], half: 4.5, y: 86, lift: 4, v: 10, narrow: 1, n: 4, phone: 0 },
  { a: [-646, -856], b: [-330, -856], half: 4.5, y: 86, lift: 4, v: 10, n: 3, phone: 0 },
  { a: [172, -758], b: [172, -1068], half: 4.5, y: 86, lift: 4, v: 10, n: 3, phone: 0 },
  { a: [364, -714], b: [364, -950], half: 4.5, y: 86, lift: 4, v: 10, n: 4, phone: 1 },
  { a: [640, -672], b: [640, -1040], half: 4.5, y: 86, lift: 4, v: 10, n: 4, phone: 0 },
  { a: [110, -720], b: [584, -720], half: 4.5, y: 86, lift: 4, v: 10, n: 8, phone: 2 },
  { a: [-288, -712], b: [-30, -712], half: 4.5, y: 86, lift: 4, v: 10, narrow: 1, n: 6, phone: 1 },
  { a: [-190, 46], b: [470, 46], half: 4.5, y: 72, lift: 4, v: 10, n: 7, phone: 2 },
  { a: [528, -476], b: [528, -222], half: 4.5, y: 80, lift: 4, v: 10, n: 7, phone: 3 },
  { a: [828, -120], b: [828, 300], half: 4.5, y: 86, lift: 4, v: 10, n: 8, phone: 3 },
  { a: [600, 60], b: [1000, 60], half: 4.5, y: 86, lift: 4, v: 10, n: 8, phone: 1 },
  { a: [570, 152], b: [1000, 152], half: 4.5, y: 64, lift: 4, v: 10, n: 8, phone: 3 },
  { a: [444, -528], b: [444, -852], half: 4.5, y: 86, lift: 4, v: 10, n: 5, phone: 0 },
  { a: [632, -302], b: [632, -612], half: 4.5, y: 86, lift: 4, v: 10, n: 4, phone: 3 },
  { a: [828, -380], b: [828, -130], half: 4.5, y: 86, lift: 4, v: 10, n: 3, phone: 0 },
  { a: [120, -426], b: [120, -872], half: 4.5, y: 64, lift: 4, v: 9, narrow: 1, n: 4, phone: 0 },
  // Two that the review's own aerial stills look straight down: south from
  // over Santo Domingo, north from over Corpo Row's back.
  { a: [228, 166], b: [228, 380], half: 4.5, y: 86, lift: 4, v: 10, n: 4, phone: 1 },
  { a: [276, -480], b: [276, -696], half: 4.5, y: 86, lift: 4, v: 10, n: 6, phone: 1 },
  // Behind the megabuilding, between its tiers' backs and the towers north.
  { a: [-46, -868], b: [112, -868], half: 4.5, y: 86, lift: 4, v: 9, narrow: 1, n: 3, phone: 0 },
  // Low over three streets, close enough over a walker's head to be a
  // craft and not a speck: the south street east of the hero's frame,
  // Japantown's west road over its bridges and arches, the garage street.
  { a: [24, 1], b: [400, 1], half: 3.5, y: 20, lift: 3, v: 7, narrow: 1, band: 2.5, n: 4, phone: 0 },
  { a: [-80, -290], b: [-80, -560], half: 3.5, y: 23, lift: 3, v: 7, narrow: 1, band: 2.5, n: 3, phone: 0 },
  { a: [440, -20], b: [440, -310], half: 3.5, y: 23, lift: 3, v: 7, narrow: 1, band: 2.5, n: 3, phone: 0 },
  // High round the landmark towers, for the air over the canyon's end: a
  // loop between the needle, the stack and the frame tower, five hundred
  // metres up under the cloud, which from the hero's lens is over the top
  // of its frame (21.5 degrees up there) and from over the megabuilding is
  // the top of the sky.
  { c: [-110, -1120], r: [120, 60], y: 500, v: 26, s: 1.6, n: 5, phone: 2 },
  // And over the towers north-east of Corpo Row, for the air north of the
  // boulevard: a long loop above the corridors' traffic, east of the
  // hero's band of sky.
  { c: [470, -800], r: [90, 170], y: 196, v: 24, n: 5, phone: 2 },
];

const TAU = Math.PI * 2;

// What flies them. The Sable runabout as it is modelled
// (src/world/av-model.js), and three more built on it, each stretched as its
// work has it: a courier, small and quick, warm lamps and a short orange
// streak; a hauler, broad, tall and long, amber lamps and a beacon, too
// heavy to leave a streak; a liner, long and low, a row of lit windows down
// its flanks. `scale` is across, up and along; `head` its lamps' colour,
// `thrust` its fans', its belly's and its streak's, `streak` how long that
// is, `lamp` how big its lamps are; `mix` how often each kind is dealt to a
// street's lane, a loop and an outer corridor.
// Two more since: an interceptor, low and broad, teal fans and a long
// green-white streak; a van, boxy and tall, in taxi yellow or work paint,
// yellow fans. Every kind's lamps are a quarter bigger than they were, so a
// near craft is its glow and not only its body; `held` lanes deal from the
// first four kinds alone, as they did.
export const CRAFT = [
  { name: "runabout", scale: [1, 1, 1], head: [0.75, 0.9, 1.0], thrust: [0.3, 0.75, 1.0], streak: 1, lamp: 1.25, mix: [5, 4, 3] },
  { name: "courier", scale: [0.84, 0.8, 0.82], head: [1.0, 0.8, 0.5], thrust: [1.0, 0.45, 0.12], streak: 0.6, lamp: 0.95, mix: [3, 2, 1] },
  { name: "hauler", scale: [1.35, 1.45, 1.85], head: [1.0, 0.72, 0.32], thrust: [1.0, 0.32, 0.08], streak: 0, lamp: 1.6, mix: [0, 1, 3] },
  { name: "liner", scale: [1.2, 1.12, 2.3], head: [0.9, 0.95, 1.0], thrust: [0.8, 0.3, 1.0], streak: 0.4, lamp: 1.4, mix: [1, 2, 2] },
  { name: "interceptor", scale: [1.05, 0.74, 1.02], head: [0.8, 1.0, 0.95], thrust: [0.15, 1.0, 0.72], streak: 1.2, lamp: 1.3, mix: [2, 2, 2] },
  { name: "van", scale: [1.02, 1.34, 1.04], head: [1.0, 0.88, 0.62], thrust: [1.0, 0.82, 0.22], streak: 0.5, lamp: 1.2, mix: [2, 2, 2] },
];
// What each kind is painted (linear colour): the runabouts dark, as the
// street's cars mostly are, a few pale or in a colour; couriers in yellow,
// orange or white; haulers in work grey, orange or olive; liners pale or
// deep blue.
export const LIVERY = [
  [[0.05, 0.055, 0.065], [0.016, 0.016, 0.02], [0.2, 0.025, 0.035], [0.025, 0.045, 0.13], [0.34, 0.35, 0.37], [0.025, 0.17, 0.17]],
  [[0.5, 0.35, 0.035], [0.45, 0.14, 0.02], [0.34, 0.34, 0.33]],
  [[0.17, 0.18, 0.19], [0.46, 0.17, 0.03], [0.13, 0.15, 0.06]],
  [[0.36, 0.37, 0.39], [0.2, 0.21, 0.24], [0.035, 0.07, 0.2]],
  [[0.018, 0.1, 0.1], [0.3, 0.31, 0.33], [0.012, 0.012, 0.016], [0.17, 0.02, 0.07]],
  [[0.5, 0.37, 0.03], [0.17, 0.022, 0.02], [0.2, 0.21, 0.23], [0.02, 0.06, 0.16]],
];
// A lane's craft fly at a few heights LEVEL metres apart (its `band`, 6 m
// over a street, 10 on a loop, 12 out along the corridors; less where the
// hero's lens sees the lane pass under the hologram's figure), each height at
// its own speed and a loop's every other height the other way round, so
// that no two on one height ever meet and no lane is a rank.
export const LEVEL = 2.5;
const bandOf = (L) => L.band ?? (L.c ? 10 : L.y < 60 ? 6 : 12);
/** How many heights a lane's craft fly at. */
export const levelsOf = (L) => Math.floor(bandOf(L) / LEVEL) + 1;
/** Which of the mix columns a lane deals from: a street's, a loop's, an
 *  outer corridor's. */
const sortOf = (L) => (L.c ? 1 : L.y < 60 ? 0 : 2);
/** How often a lane is dealt each kind: a `narrow` lane, which passes a
 *  wall or a tower closely somewhere on its round, carries none of the big
 *  ones. */
const weightsOn = (L) => CRAFT.map((K, i) => (L.narrow && Math.max(K.scale[0], K.scale[2]) > 1.05) || (L.held && i > 3) ? 0 : K.mix[sortOf(L)]);
/** The biggest kind a lane may carry, as a scale on the runabout's span. */
export const widestOn = (L) => Math.max(...CRAFT.filter((K, i) => weightsOn(L)[i] > 0).map((K) => Math.max(K.scale[0], K.scale[2]))) * (L.s ?? 1);

/** How far round a lane is, in metres. */
export function lapOf(L) {
  if (L.c) return Math.PI * (L.r[0] + L.r[1]);
  return 2 * Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1]) + TAU * L.half;
}

/**
 * Where a craft is `u` of the way round its lane (any number; it wraps),
 * `way` +1 or -1 round a loop, `k` its own number for the small rise and
 * fall it flies with. Into out: x, y, z, the way it faces (fx, fz), and
 * how far it banks.
 */
export function skyAt(L, u, way, k, out, level = 0) {
  u -= Math.floor(u);
  if (L.c) {
    const a = u * TAU * way;
    out.x = L.c[0] + Math.cos(a) * L.r[0];
    out.z = L.c[1] + Math.sin(a) * L.r[1];
    out.y = L.y + Math.sin(a * 2 + k) * 3;
    const dx = -Math.sin(a) * L.r[0] * way;
    const dz = Math.cos(a) * L.r[1] * way;
    const d = Math.hypot(dx, dz) || 1;
    out.fx = dx / d;
    out.fz = dz / d;
    out.bank = -way * 0.16;
    out.y += level * LEVEL;
    return out;
  }
  // Out along the right of the line, round, back along its other side,
  // round again.
  const len = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1]);
  const ux = (L.b[0] - L.a[0]) / len;
  const uz = (L.b[1] - L.a[1]) / len;
  const turn = Math.PI * L.half;
  let s = u * (2 * len + 2 * turn);
  let along;
  let side;
  let heading;
  let lift;
  if (s < len) {
    along = s;
    side = 1;
    heading = 0;
    lift = 0;
  } else if ((s -= len) < turn) {
    const t = s / turn;
    along = len + Math.sin(t * Math.PI) * L.half;
    side = Math.cos(t * Math.PI);
    heading = t * Math.PI;
    lift = t * t * (3 - 2 * t);
  } else if ((s -= turn) < len) {
    along = len - s;
    side = -1;
    heading = Math.PI;
    lift = 1;
  } else {
    const t = (s - len) / turn;
    along = -Math.sin(t * Math.PI) * L.half;
    side = -Math.cos(t * Math.PI);
    heading = Math.PI + t * Math.PI;
    lift = 1 - t * t * (3 - 2 * t);
  }
  // The right of the line's direction (x, z) is (-uz, ux).
  out.x = L.a[0] + ux * along - uz * side * L.half;
  out.z = L.a[1] + uz * along + ux * side * L.half;
  out.y = L.y + L.lift * lift + Math.sin(u * TAU * 3 + k) * 0.8;
  const c = Math.cos(heading);
  const sn = Math.sin(heading);
  out.fx = ux * c + uz * sn;
  out.fz = uz * c - ux * sn;
  out.bank = 0;
  out.y += level * LEVEL;
  return out;
}

// Where each craft starts on its lane is drawn from this, so the same second
// of the clock is the same sky on every load. Any seed is as good a sky as
// another; this one was picked (tools/skyseed.mjs) for the second every
// review render holds, 12: on a phone's narrow frame every one of the sky
// review's five aerial stills holds two or more craft, and a desktop's as
// many as before.
const SKY = 2532;

/** The craft: each lane's own number of them (`full`: a desktop's), dealt
 *  among its heights, spread unevenly round it (a height's craft a share of
 *  its round apart, give or take), each with which way it goes round, its
 *  own number, its height, its speed, its kind and its paint. */
export function createCraft(full, seed = SKY) {
  let s = seed;
  const draw = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const craft = [];
  LANES.forEach((L, k) => {
    const used = new Set();
    const n = full ? L.n : L.phone;
    const levels = Math.min(levelsOf(L), Math.max(1, n));
    const weights = weightsOn(L);
    const total = weights.reduce((a, b) => a + b, 0);
    for (let level = 0; level < levels; level++) {
      const on = Math.floor(n / levels) + (level < n % levels ? 1 : 0);
      const turn = draw();
      const v = L.v * (0.78 + 0.44 * ((level * 0.618 + k * 0.37) % 1));
      const way = (k % 2 ? -1 : 1) * (L.c && level % 2 ? -1 : 1);
      for (let j = 0; j < on; j++) {
        let pick = draw() * total;
        let kind = 0;
        while (kind < CRAFT.length - 1 && pick >= weights[kind]) pick -= weights[kind++];
        // No two of a lane's craft one kind while another kind it may carry
        // is still unused on it (then round again): on a lane's few
        // heights, two of a kind drew level side by side, the same craft
        // twice.
        if (!L.held) {
          const kinds = weights.map((wt, i) => (wt > 0 ? i : -1)).filter((i) => i >= 0);
          if (used.size >= kinds.length) used.clear();
          for (let tries = 0; used.has(kind) && used.size < kinds.length && tries < CRAFT.length; tries++) kind = kinds[(kinds.indexOf(kind) + 1) % kinds.length];
          used.add(kind);
        }
        const paints = LIVERY[kind];
        craft.push({ L, way, u: (j + 0.7 * draw()) / on + turn, lap: lapOf(L), k: craft.length, level, v, kind, paint: paints[Math.floor(draw() * paints.length)] });
      }
    }
  });
  return craft;
}

/** Where a craft is at second `clock` (see skyAt). */
export function craftAt(c, clock, out) {
  return skyAt(c.L, c.u + (clock * c.v) / c.lap, c.way, c.k, out, c.level);
}

// One stands on the pad on ARASAKA's annex (x, y, z, the way it faces).
export const PAD_STANDING = [120, 14.85, -485, 0.7];
// One more keeps the megabuilding's east roof pad: it stands there half a
// minute, lifts off, flies a small round over its own roof (east of it the
// megabuilding's own mass now stands to 171 m, west of it the avenue looks
// at the H4 past it), comes back and settles. It never goes north of
// z -800, where the megabuilding's tiers stand behind its slab up to 132 m.
// (`phase`: at second 12 it is up on its round, out of the frame of the
// mega review's rooftop camera, which it stood at the edge of.)
export const PAD_FLIGHT = { at: [33, 83.52, -776, 2.4], rest: 30, climb: 8, rise: 26, round: [38, -770], lap: 32, phase: 36 };

/** Where the pad's craft is at second `t` of the clock: x, y, z, the way it
 *  faces (an angle, 0 toward +z), how far it banks, and how lit it is. */
export function padAt(t, out) {
  const P = PAD_FLIGHT;
  const whole = P.rest + 2 * P.climb + P.lap;
  t = (((t + P.phase) % whole) + whole) % whole;
  const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);
  const [px, py, pz, yaw] = P.at;
  const R = Math.hypot(P.round[0] - px, P.round[1] - pz);
  const a0 = Math.atan2(pz - P.round[1], px - P.round[0]);
  out.x = px;
  out.z = pz;
  out.bank = 0;
  // The way it faces as it joins the round, going clockwise seen from above.
  const tangent = (a) => Math.atan2(-Math.sin(a), Math.cos(a));
  if (t < P.rest) {
    out.y = py;
    out.yaw = yaw;
    out.lit = 0.35;
  } else if (t < P.rest + P.climb) {
    const u = smoother((t - P.rest) / P.climb);
    out.y = py + u * P.rise;
    const to = tangent(a0);
    out.yaw = yaw + Math.atan2(Math.sin(to - yaw), Math.cos(to - yaw)) * u;
    out.lit = 0.35 + 0.65 * Math.min(1, u * 4);
  } else if (t < P.rest + P.climb + P.lap) {
    const u = smoother((t - P.rest - P.climb) / P.lap);
    const a = a0 + u * TAU;
    out.x = P.round[0] + Math.cos(a) * R;
    out.z = P.round[1] + Math.sin(a) * R;
    out.y = py + P.rise + Math.sin(u * Math.PI) * 6;
    out.yaw = tangent(a);
    out.bank = -0.16 * Math.sin(u * Math.PI);
    out.lit = 1;
  } else {
    const u = smoother((t - P.rest - P.climb - P.lap) / P.climb);
    out.y = py + (1 - u) * P.rise;
    const from = tangent(a0);
    out.yaw = from + Math.atan2(Math.sin(yaw - from), Math.cos(yaw - from)) * u;
    out.lit = 1 - 0.65 * u;
  }
  return out;
}
