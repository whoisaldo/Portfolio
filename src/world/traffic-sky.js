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
  { c: [0, -420], r: [150, 36], y: 118, v: 26, n: 3, phone: 2 },
  { c: [-30, -600], r: [120, 40], y: 124, v: 30, n: 3, phone: 1 },
  // Across the moon, seen from the garage's roof: a heavier craft, slower,
  // so that 300 m off it crosses the disc as a silhouette with its lamps
  // lit and not as a speck.
  { c: [620, 120], r: [200, 70], y: 150, v: 30, s: 2.6, n: 2, phone: 1 },
  // The streets, low: the strip of sky a driver has ahead. The canyon's is
  // the highest of them: bridges cross it up to 49 m.
  { a: [0, -196], b: [0, -700], half: 5.5, y: 56, lift: 5, v: 9, n: 6, phone: 1 },
  { a: [-80, -30], b: [-80, -700], half: 5, y: 36, lift: 5, v: 8.5, n: 7, phone: 1 },
  { a: [120, -20], b: [120, -310], half: 4.5, y: 32, lift: 5, v: 8, n: 4, phone: 1 },
  { a: [136, -330], b: [426, -330], half: 5, y: 30, lift: 5, v: 8.5, n: 6, phone: 1 },
  { a: [420, 1], b: [-60, 1], half: 4, y: 30, lift: 5, v: 9, n: 6, phone: 1 },
  { a: [-66, -720], b: [52, -720], half: 4, y: 34, lift: 4, v: 7, n: 4, phone: 1 },
  { a: [20, -179], b: [420, -179], half: 4, y: 34, lift: 5, v: 9, n: 5, phone: 0 },
  // Low across the deck, over its own road and its lamp masts.
  { a: [-66, -80], b: [104, -80], half: 2.2, y: 31, lift: 4, v: 7, n: 3, phone: 1 },
  // The streets again, between the towers: higher, slower to pass.
  { a: [0, -186], b: [0, -700], half: 5.5, y: 80, lift: -6, v: 8.5, n: 4, phone: 1 },
  { a: [130, -330], b: [430, -330], half: 5, y: 62, lift: 5, v: 8, n: 3, phone: 0 },
  { a: [-70, 1], b: [430, 1], half: 5, y: 48, lift: 5, v: 9, n: 4, phone: 0 },
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
  { c: [0, -650], r: [200, 60], y: 112, v: 40, n: 3, phone: 0 },
  { c: [100, -215], r: [70, 60], y: 78, v: 24, n: 3, phone: 0 },
  { c: [-130, -375], r: [36, 360], y: 48, v: 22, n: 7, phone: 1 },
  { c: [455, -200], r: [50, 120], y: 76, v: 24, n: 3, phone: 0 },
  // Across the south: Santo Domingo's yards, the arm, the plaza's south.
  { c: [300, -85], r: [130, 66], y: 72, v: 28, n: 4, phone: 1 },
  { c: [150, -60], r: [230, 90], y: 86, v: 34, n: 4, phone: 0 },
  { c: [40, 30], r: [150, 50], y: 60, v: 26, n: 3, phone: 0 },
  // Over the plaza's square, round its hub.
  { c: [79, -228], r: [30, 26], y: 48, v: 12, n: 2, phone: 0 },
  // And low over the south arm, which no other lane reaches.
  { a: [0, 10], b: [0, 82], half: 5.5, y: 38, lift: 4, v: 5, n: 2, phone: 0 },
];

const TAU = Math.PI * 2;

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
export function skyAt(L, u, way, k, out) {
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
  return out;
}

// Where each craft starts on its lane is drawn from this, so the same second
// of the clock is the same sky on every load. Any seed is as good a sky as
// another; this one was picked (tools/skysearch.mjs) for the second every
// review render holds, 12: it leaves the fewest of the drivers' frames and
// the air views with fewer than two craft in them.
const SKY = 1635;

/** The craft: each lane's own number of them (`full`: a desktop's), spread
 *  evenly round it, each with which way it goes round and its own number. */
export function createCraft(full, seed = SKY) {
  let s = seed;
  const draw = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const craft = [];
  LANES.forEach((L, k) => {
    const n = full ? L.n : L.phone;
    const turn = draw();
    for (let j = 0; j < n; j++) craft.push({ L, way: k % 2 ? -1 : 1, u: (j + 0.4 * draw()) / n + turn, lap: lapOf(L), k: craft.length });
  });
  return craft;
}

/** Where a craft is at second `clock` (see skyAt). */
export function craftAt(c, clock, out) {
  return skyAt(c.L, c.u + (clock * c.L.v) / c.lap, c.way, c.k, out);
}

// One stands on the pad on ARASAKA's annex (x, y, z, the way it faces).
export const PAD_STANDING = [120, 14.85, -485, 0.7];
// One more keeps the megabuilding's east roof pad: it stands there half a
// minute, lifts off, flies a round out over the megabuilding street's east
// end and the station, comes back and settles. It never goes north of
// z -800, where the megabuilding's tiers stand behind its slab up to 132 m.
export const PAD_FLIGHT = { at: [33, 83.52, -776, 2.4], rest: 30, climb: 8, rise: 26, round: [71, -746], lap: 32 };

/** Where the pad's craft is at second `t` of the clock: x, y, z, the way it
 *  faces (an angle, 0 toward +z), how far it banks, and how lit it is. */
export function padAt(t, out) {
  const P = PAD_FLIGHT;
  const whole = P.rest + 2 * P.climb + P.lap;
  t = ((t % whole) + whole) % whole;
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
