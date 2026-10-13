// src/world/traffic-park.js: the cars that stand still, and who gets which
// car.
//
// A city's kerbs are parked at night, and a kerb is not a showroom. Every
// row of places the network has (src/world/traffic-net.js: a street's bay,
// or its kerb lane where it has no bay) is parked in runs of one to six
// with gaps of one to three places between them, each car a little off its
// mark and not quite square to the kerb, one in eight facing the other
// way; here and there a place holds two or three motorbikes or scooters
// leant on their stands at an angle instead of a car; nobody parks by a
// hydrant; and a few places are left clear for what else uses them (the
// S4's own road and its stops, the hero's near frame, a door, the deck's
// mouth). Then the ones somebody asked for by place: taxis at the lobbies
// on the x 120 road, a patrol car stopped by junction F with its bar lit,
// a van in the court behind the board, one double-parked on the boulevard
// with its hazards going, one with two wheels up on the avenue's kerb.
//
// Models and paints are dealt, not drawn: along a row, and along a lane of
// moving cars, each comes up once before any comes up again and never next
// to itself, so there is no "same van three in a row" and no model is more
// than its share of a frame.
//
// No three.js in here: places come out as plain numbers.

export const KINDS = ["hatch", "sedan", "van", "wedge", "pickup", "micro"];
// What else stands at a kerb (a standing thing's `kind` counts on from the
// cars': KINDS.length is the motorbike).
export const BIKES = ["moto", "scooter"];
// And after the bikes: the bus that stands at its stop on the west street,
// and the stop.
// and the stop; then a door's leaf and a boot's lid, for the few cars left
// with one open.
export const FIXED = ["bus", "stop", "leaf", "lid"];
// Paint: under these streets' light a dark metallic is one more grey car, so
// half are colours that hold at night (reds, blues, teal, violet, orange,
// green, a wine) and the rest gunmetal, black, silver, pearl and cream. No
// cab yellow: that is the taxis'.
export const PAINT = ["#2b3038", "#b0281e", "#9aa0a8", "#1d4c9c", "#15161a", "#14807a", "#d8d2c4", "#7a1420", "#4a2f8c", "#c9ced4", "#c45a1c", "#1a3566", "#3d7a3a", "#5d636b", "#8a1d52", "#0f5a56"];
export const ACCENT = ["#27dcf2", "#ff2e88", "#ffb254", "#a24bff", "#39ff9a", "#ff3fd2"];
// What a car is besides its model (the sedan carries both roof units).
// (And the three a car is left open by: its driver's door, its boot, a
// van's bonnet.)
export const TAG = { none: 0, patrol: 1, taxi: 2, door: 3, boot: 4, bonnet: 5 };
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
// stand out over the garage street's west kerb; and the boulevard's north
// kerb beside the braindance's chase, whose clues are low on that side of
// the street; a place on the west street where Japantown's bags lie; and
// the west street's west kerb where the bus stands at its stop.
const CLEAR = [
  [-12, -5, -58, 20],
  [5, 12, -195, 20],
  [104, 113, -188, -182],
  [84, 96, -188, -170],
  [110, 116, -93, -67],
  [440, 452, -230, -202],
  [430, 436, -286, -276],
  [430, 436, -141.5, -134],
  [125, 320, -341, -334],
  [-90, -84, -352.5, -346],
  [-90.5, -84, -339, -315],
];

// The hydrants along the kerbs (design/night-city-world/props-source.json,
// x and z): nobody parks within a car's length of one.
const HYDRANTS = [[431.3, -161], [-10.7, -36], [-10.7, -116], [10.7, -32], [10.7, -112], [-10.6, -324.7], [-10.6, -429.3], [-10.6, -462.9], [-10.6, -482.9], [-10.6, -489.1], [-10.6, -515.7], [-10.6, -549], [-10.6, -574], [-10.6, -596], [-10.6, -635], [10.6, -235.9], [10.6, -288.4], [10.6, -416.9], [10.6, -486.3], [10.6, -504.7], [10.6, -654.1], [10.6, -692.8], [111.7, -48.3], [111.7, -302], [128.3, -153.8], [128.3, -44.1], [128.3, -29.1], [-90.5, -442], [-90.5, -336.8], [-90.5, -132.7], [-69.5, -578.3], [-69.5, -470.7], [-69.5, -367], [-69.5, -110.2], [-69.5, -37.1], [47.2, -733], [-47, -728.5], [34.5, -711.5], [10.5, -650], [431.5, -301.2], [448.5, -227], [431.5, -222.5], [305.7, -46.7], [373.6, -11.1]];

// The ones asked for by place. Taxis at the kerb by the lobbies on the x 120
// road's east side (the plaza's two canopies, and the pair further north);
// the patrol car in the kerb lane short of junction F's stop line; the van
// in the court behind the board; the first two at the boulevard's north
// kerb past the stretch the braindance's chase keeps clear; two cars at the
// pumps of
// Santo Domingo's fuel station, under its canopy, lamps on; and on the
// garage street one car left with its hazards going, where the flight in
// comes down past it.
// (`off`: not on a street.)
const NORTH = Math.PI;
const PLACED = [
  { x: 126.55, z: -79, yaw: NORTH, kind: "sedan", tag: TAG.taxi, body: CAB },
  { x: 126.55, z: -112, yaw: NORTH, kind: "sedan", tag: TAG.taxi, body: CAB },
  { x: 126.55, z: -237.4, yaw: NORTH, kind: "sedan", tag: TAG.taxi, body: CAB },
  { x: 126.55, z: -243.9, yaw: NORTH, kind: "sedan", tag: TAG.taxi, body: CAB },
  { x: 126.55, z: -158.8, yaw: NORTH, kind: "sedan", tag: TAG.patrol, body: PATROL },
  { x: 323, z: -337.55, yaw: -Math.PI / 2, kind: "wedge" },
  { x: 329.4, z: -337.55, yaw: -Math.PI / 2, kind: "pickup" },
  { x: 50, z: -288, yaw: Math.PI / 2, kind: "van", off: true },
  { x: 136.1, z: 24.1, yaw: NORTH, kind: "hatch", off: true, lit: true },
  { x: 157.9, z: 23.7, yaw: 0, kind: "pickup", off: true, lit: true },
  { x: 433.4, z: -268, yaw: 0, kind: "hatch", hazard: true },
  // Double-parked on the boulevard's north side, east of the chase's
  // stretch: a car at the kerb and one stopped beside it in the dead space
  // between the kerb's cars and the westbound lane, hazards going.
  { x: 351, z: -337.55, yaw: -Math.PI / 2, kind: "sedan" },
  { x: 350.3, z: -334.85, yaw: -Math.PI / 2, kind: "hatch", hazard: true },
  // Two wheels up on the avenue's west kerb, where nothing stands on the
  // pavement's edge (tools/kerbspot.mjs).
  { x: -9.65, z: -601.5, yaw: 0.05, kind: "sedan", kerb: true, roll: -0.09, y: 0.08 },
  // The west street's bus, standing at its stop with its lamps and its
  // inside lit, and the stop: a shelter on the pavement beside its front
  // door, clear of the grate whose steam would rise through its roof
  // (props-source.json has nothing standing at either place).
  { x: -88.5, z: -327, yaw: 0, kind: "bus", lit: true, body: "#c45a1c", accent: "#ffb254", glow: false },
  { x: -92.1, z: -327.5, yaw: 0, kind: "stop", off: true, body: "#2b3038", accent: "#27dcf2", glow: true },
  // A van broken down in the deck's yard under the descent, along x and
  // facing east, its hazards going and its bonnet up: the yard is dressed round it (the
  // deck's LED barriers, jack, work lamp, beacon and the mechanic at its
  // front). A quarter metre south of the yard's own mark (z -81.2), which
  // put its north flank through the collar of the pier at (56, -83); the
  // jack is then under its south flank. Last in the list, so nothing
  // before it is dealt differently.
  { x: 57.6, z: -80.95, yaw: Math.PI / 2, kind: "van", off: true, hazard: true, tag: TAG.bonnet },
];

/**
 * Everything that stands: the rows parked in runs with gaps (`full`: runs
 * of up to six with gaps of up to three in a bay, shorter runs and longer
 * gaps in a kerb lane; a phone keeps about half of each), then the placed
 * ones. Each: x, z, yaw, kind (an index into KINDS, or past its end into
 * BIKES), body, accent, tag, and where it has them: hazard, glow, lit,
 * `roll` (leant over, radians) and `y` (lifted, metres).
 */
export function createStanding({ rows, full = true, steam = [] }) {
  const out = [];
  const taken = (x, z, reach) => PLACED.some((c) => Math.hypot(c.x - x, c.z - z) < reach);
  rows.forEach((row, r) => {
    const draw = draws(7919 + r * 131);
    const dress = wardrobe(3301 + r * 17);
    const of = (list) => list[Math.floor(draw() * list.length)];
    const whim = draws(104729 + r * 7);
    const RUNS = row.bay ? (full ? [1, 2, 3, 3, 3, 4, 5, 6] : [1, 2, 2, 3]) : row.angled ? (full ? [2, 3, 3, 4, 6] : [1, 2, 3]) : full ? [1, 2, 2, 3, 3, 4] : [1, 1, 2, 3];
    const GAPS = row.bay ? (full ? [1, 1, 1, 2, 2, 3] : [2, 3, 4]) : row.angled ? (full ? [1, 1, 2, 3] : [3, 4, 5]) : full ? [1, 1, 2, 2, 3] : [2, 3, 4, 5];
    let run = of(RUNS);
    let gap = draw() < 0.4 ? of(GAPS) : 0;
    for (const at of row.places) {
      if (gap > 0) {
        gap--;
        continue;
      }
      if (CLEAR.some(([x0, x1, z0, z1]) => at.x > x0 && at.x < x1 && at.z > z0 && at.z < z1) || taken(at.x, at.z, 6.3) || HYDRANTS.some(([x, z]) => Math.hypot(at.x - x, at.z - z) < 5.3) || steam.some(([x, z]) => Math.hypot(at.x - x, at.z - z) < 3)) continue;
      if (run === 0) {
        run = of(RUNS);
        gap = of(GAPS) - 1;
        continue;
      }
      run--;
      // The way the row runs, and the kerb on its right.
      const yaw = at.yaw;
      const fx = Math.sin(row.yaw);
      const fz = Math.cos(row.yaw);
      if (row.angled === false && draw() < (full ? 0.075 : 0.04)) {
        // Two or three bikes in a car's place, nose to the kerb at an angle,
        // leant on their stands.
        const n = draw() < 0.5 ? 2 : 3;
        const bike = draw() < 0.5 ? 0 : 1;
        for (let i = 0; i < n; i++) {
          const along = (i - (n - 1) / 2) * 1.2 + (draw() - 0.5) * 0.1;
          out.push({ x: at.x + fx * along - fz * 0.3, z: at.z + fz * along + fx * 0.3, yaw: yaw - 0.95 + (draw() - 0.5) * 0.12, ...dress(), kind: KINDS.length + (draw() < 0.75 ? bike : 1 - bike), tag: TAG.none, glow: false, roll: -0.15 });
        }
        continue;
      }
      // A car: a little off its mark, not quite square, and one in eight
      // the other way round.
      const along = (draw() - 0.5) * (row.angled ? 0.2 : 0.8);
      const across = (draw() - 0.5) * 0.14;
      const turned = row.angled === false && draw() < 0.125 ? Math.PI : 0;
      const car = { x: at.x + fx * along - fz * across, z: at.z + fz * along + fx * across, yaw: yaw + turned + (draw() - 0.5) * 0.07, ...dress(), tag: TAG.none };
      // A few are left open: a hatch's driver's door, where it opens onto
      // a kerb lane nobody drives in; a sedan's boot.
      if (KINDS[car.kind] === "hatch" && row.bay === false && row.angled === false && turned === 0 && whim() < 0.3) car.tag = TAG.door;
      else if (KINDS[car.kind] === "sedan" && whim() < 0.07) car.tag = TAG.boot;
      out.push(car);
    }
  });
  const dress = wardrobe(977);
  const all = [...KINDS, ...BIKES, ...FIXED];
  for (const c of PLACED) out.push({ accent: ACCENT[0], tag: TAG.none, ...dress(), ...c, kind: all.indexOf(c.kind) });
  return out;
}
