// src/world/traffic-park.js: the cars that stand still, and who gets which
// car.
//
// A city's kerbs are parked full at night. Every row of places the network
// has (src/world/traffic-net.js: a street's bay, or its kerb lane where it
// has no bay) is filled most of the way along, never with more than a short
// gap, so no stretch of road is bare whatever the lights are doing; a few
// are left clear for what else uses them (the S4's own road and its stops,
// the hero's near frame, a door, the deck's mouth). Then the ones somebody
// asked for by place: taxis at the lobbies on the x 120 road, a patrol car
// stopped by junction F with its bar lit, a van in the court behind the
// board.
//
// Models and paints are dealt, not drawn: along a row, and along a lane of
// moving cars, each comes up once before any comes up again and never next
// to itself, so there is no "same van three in a row" and no model is more
// than its share of a frame.
//
// No three.js in here: places come out as plain numbers.

export const KINDS = ["hatch", "sedan", "van", "wedge", "pickup", "micro"];
// Paint: dark metallics mostly, a pearl white, reds, a cab yellow, teal,
// violet, rust; the accents are the city's neons.
export const PAINT = ["#25282e", "#121316", "#8f949b", "#561018", "#132440", "#5d636b", "#0f3a3b", "#9c7c0c", "#b8961a", "#a3241c", "#12706b", "#c9ced4", "#3c2a72", "#b4521a", "#1d4c9c", "#7a1a48"];
export const ACCENT = ["#27dcf2", "#ff2e88", "#ffb254", "#a24bff", "#39ff9a", "#ff3fd2"];
// What a car is besides its model (the sedan carries both roof units).
export const TAG = { none: 0, patrol: 1, taxi: 2 };
const CAB = "#c79a12";
const PATROL = "#0a0a0c";

/** Seeded draws, so the same city has the same cars on every load. */
function draws(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Deals 0..n-1 in turn: each comes up once before any comes up again (in
 *  an order of its own each time round) and never within `apart` places of
 *  itself. */
export function dealer(n, apart, seed) {
  const draw = draws(seed);
  const recent = [];
  let bag = [];
  return () => {
    if (!bag.length) bag = Array.from({ length: n }, (_, i) => i);
    let from = bag.filter((k) => !recent.includes(k));
    if (!from.length) from = Array.from({ length: n }, (_, i) => i).filter((k) => !recent.includes(k));
    const k = from[Math.floor(draw() * from.length)];
    if (bag.includes(k)) bag.splice(bag.indexOf(k), 1);
    recent.push(k);
    if (recent.length > apart) recent.shift();
    return k;
  };
}

/** Who gets which car along one line of them: a model, a paint and an
 *  accent each, and underglow on one in six or so. */
export function wardrobe(seed) {
  const kind = dealer(KINDS.length, 2, seed);
  const paint = dealer(PAINT.length, 4, seed + 101);
  const accent = dealer(ACCENT.length, 1, seed + 211);
  const glow = dealer(6, 0, seed + 307);
  return () => ({ kind: kind(), body: PAINT[paint()], accent: ACCENT[accent()], glow: glow() === 0 });
}

// Kept clear of parked cars (x0, x1, z0, z1): the hero's near frame on the
// avenue's west kerb; the avenue's east kerb as far as the plaza street,
// which is the S4's road and its two stops; the plaza street's north bay
// where the S4 swings out of it for the x 120 road, and both its bays where
// the braindance's car stands; the deck's mouth on the x 120 road; the
// garage's door; AFTERLIFE's door and its carpet; the works barriers that
// stand out over the garage street's west kerb.
const CLEAR = [
  [-12, -5, -58, 20],
  [5, 12, -195, 20],
  [104, 113, -188, -182],
  [84, 96, -188, -170],
  [110, 116, -93, -67],
  [440, 452, -230, -202],
  [430, 436, -286, -276],
  [430, 436, -141.5, -134],
];

// The ones asked for by place. Taxis at the kerb by the lobbies on the x 120
// road's east side (the plaza's two canopies, and the pair further north);
// the patrol car in the kerb lane short of junction F's stop line; the van
// in the court behind the board; two cars at the pumps of Santo Domingo's
// fuel station, under its canopy, lamps on; and on the garage street one
// car left with its hazards going, where the flight in comes down past it.
// (`off`: not on a street.)
const NORTH = Math.PI;
const PLACED = [
  { x: 126.55, z: -79, yaw: NORTH, kind: "sedan", tag: TAG.taxi, body: CAB },
  { x: 126.55, z: -112, yaw: NORTH, kind: "sedan", tag: TAG.taxi, body: CAB },
  { x: 126.55, z: -237.4, yaw: NORTH, kind: "sedan", tag: TAG.taxi, body: CAB },
  { x: 126.55, z: -243.9, yaw: NORTH, kind: "sedan", tag: TAG.taxi, body: CAB },
  { x: 126.55, z: -158.8, yaw: NORTH, kind: "sedan", tag: TAG.patrol, body: PATROL },
  { x: 50, z: -288, yaw: Math.PI / 2, kind: "van", off: true },
  { x: 136.1, z: 24.1, yaw: NORTH, kind: "hatch", off: true, lit: true },
  { x: 157.9, z: 23.7, yaw: 0, kind: "pickup", off: true, lit: true },
  { x: 433.4, z: -268, yaw: 0, kind: "hatch", hazard: true },
];

/**
 * Every car that stands: the rows filled (`full`: four places in five of a
 * bay and three in five of a kerb lane, never more than two empty together;
 * a phone keeps about two in five and one in three, never more than four
 * empty together), then the placed ones. Each: x, z, yaw, kind (an index
 * into KINDS), body, accent, tag, and hazard or glow where it has them.
 */
export function createStanding({ rows, full = true }) {
  const out = [];
  const taken = (x, z, reach) => PLACED.some((c) => Math.hypot(c.x - x, c.z - z) < reach);
  rows.forEach((row, r) => {
    const draw = draws(7919 + r * 131);
    const dress = wardrobe(3301 + r * 17);
    const share = row.bay ? (full ? 0.8 : 0.4) : row.angled ? (full ? 0.7 : 0.3) : full ? 0.6 : 0.32;
    const most = full ? 2 : 4;
    let empty = 0;
    for (const at of row.places) {
      const want = draw() < share || empty >= most;
      if (CLEAR.some(([x0, x1, z0, z1]) => at.x > x0 && at.x < x1 && at.z > z0 && at.z < z1) || taken(at.x, at.z, 6.3)) {
        empty = 0;
        continue;
      }
      if (!want) {
        empty++;
        continue;
      }
      empty = 0;
      out.push({ ...at, ...dress(), tag: TAG.none });
    }
  });
  const dress = wardrobe(977);
  for (const c of PLACED) out.push({ accent: ACCENT[0], tag: TAG.none, ...dress(), ...c, kind: KINDS.indexOf(c.kind) });
  return out;
}
