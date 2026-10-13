// src/world/crowd.js: people in the streets.
//
// The plate's street has people in it and the city's had none. Every
// pavement of the network has its walkers now (the builder's streets.life
// says how many, district by district), in the colours the show's crowds
// wear, lit by the street they are in. Most walk the avenue's two pavements,
// up the avenue and down it, alone and in pairs, some under umbrellas with a
// neon rim: the way a wet street at night reads from across it, figures
// against lit shopfronts, each umbrella a ring of colour doubled in the road.
// Some stand: at a shop's window, at the kerb of the crossing, two and two
// talking, a few with a phone lit in a hand (one of them the braindance's
// hot phone), and wherever a district has stood somebody (kit.stand: at a
// stall, in a queue, on a bench, in a doorway), in the pose it asked for.
//
// They are people, not cards: one low-poly figure (src/world/crowd-people.js)
// drawn instanced, each their own height and build, their own hair (short,
// long, a mohawk, a bun, shaved, a cap, a hood), jacket (short, a coat to
// the knee, a puffer, a vest), bag, skin and colours, a jacket's trim lit in
// neon on some, from a seeded draw so the street is the same street every
// visit. The vertex shader poses them: every vertex rides one segment of the
// body about its joint, the legs reach for footfalls that stay where they
// land for as long as the foot is down (so nobody skates), the arms swing
// against them, the shoulders turn against the hips, and each has their own
// step (a walk has one pace, so nobody on it walks through anybody, and the
// walk beside it another). Standing, they hold one of eight poses and shift
// a little. Under reduced motion they stay where they are.
//
// Lit by the street, never evenly: the city's baked spill is the level where
// they stand, and the crowd's own map of the signs and shop windows
// (src/world/crowd-light.js), read a few steps the way each face looks and a
// few steps behind it, is the sign beside them, which colours the side that
// faces it and leaves the other in shade; the light off the wet ground from
// below, a little sky from above, the kit's lamps, and a rim of whatever is
// lit behind them as the eye sees them. Only phones, cigarette tips,
// cyberware, neon trims and umbrella rims are lit from inside. An umbrella is
// a canopy of eight gores on ribs, its shaft in a hand beside the shoulder,
// its neon a line along the canopy's edge (a pixel and a half tall far off,
// so the wet road still doubles it).
//
// Four levels of them. Within a few steps of the eye, the closest figure: a
// face that is modelled, hair with a parting or a fringe, fingers, cloth that
// folds (nine thousand triangles with everything anyone wears, about five
// and a half thousand on a person, and never more than a handful of people).
// To two dozen metres, the figure with a face; past the distance where the
// difference is a pixel or two, a figure of a few hundred triangles on the
// same joints; past a hundred metres, where a person is a dozen pixels tall,
// a card with their shape drawn on it. Each trade is a dither, the one
// keeping the pixels the other has not taken, so nobody sees it. The wet
// road's mirror, which smears what it holds, draws everyone as cards. Each
// frame the people in the frustum are sorted into the three; nobody is ever
// dropped for being far. Where a walk's loop starts again they fade out and
// in. The lens is one more thing the files bend round: walkers pass it a
// pace and a half clear and whoever stands free steps back from it, and
// nobody is ever drawn within 1.2 m of it (an umbrella's holder a little
// further): whoever cannot keep that far is gone, whole and all at once.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { preloadProps } from "./props.js";
import { createStreetLight, PROP_LIGHTS } from "./crowd-light.js";
import { crossingsOf, createCrossers } from "./crowd-cross.js";
import { figureGeometry, RIG, PART, TAG, STYLE, CARRIED, HOLD, POSES, POSE_TABLE, PHONE_AT, EMBER_AT, RIM_HALF, CANOPY } from "./crowd-people.js";

const RIMS = ["#27dcf2", "#ff2e88", "#eceae4", "#fcee0a"];
// The top of every pavement (the builder's PAVE_Y).
const PAVE_Y = 0.15;

// What they wear, in the show's street colours (linear): jackets in yellow,
// red, teal, purple, white, black, olive, rust, navy, magenta, grey, brown,
// blue, moss, burgundy and sand, then a suit's charcoal and midnight and a
// site vest's two hi-vis colours; trousers darker; what is under the jacket
// (white, black, grey, pale blue, red, yellow, teal, pink); skin; hair
// (black, browns, bleached, pink, cyan, red, silver, green, violet); bags
// and hats; hard hats; an umbrella's cloth (black, navy, wine, bottle
// green, plum, deep teal, mustard, slate). The street wears dark things
// with one colour on some of them: the bright jackets are the few.
const JACKETS = [
  [0.6, 0.46, 0.06], [0.42, 0.045, 0.045], [0.035, 0.24, 0.26], [0.18, 0.07, 0.3], [0.5, 0.5, 0.48], [0.045, 0.047, 0.058],
  [0.13, 0.15, 0.06], [0.44, 0.17, 0.04], [0.04, 0.065, 0.16], [0.42, 0.08, 0.2], [0.17, 0.17, 0.19], [0.2, 0.12, 0.07],
  [0.045, 0.14, 0.34], [0.16, 0.24, 0.07], [0.2, 0.025, 0.07], [0.46, 0.41, 0.3],
  [0.09, 0.092, 0.105], [0.035, 0.046, 0.095], [0.66, 0.74, 0.06], [0.78, 0.27, 0.03],
];
const TROUSERS = [[0.052, 0.053, 0.066], [0.08, 0.1, 0.18], [0.16, 0.14, 0.12], [0.05, 0.12, 0.12], [0.24, 0.05, 0.06], [0.3, 0.3, 0.3], [0.12, 0.12, 0.05], [0.04, 0.041, 0.052]];
const SHIRTS = [[0.58, 0.58, 0.56], [0.05, 0.05, 0.062], [0.24, 0.24, 0.26], [0.3, 0.42, 0.6], [0.5, 0.07, 0.07], [0.62, 0.5, 0.08], [0.05, 0.32, 0.34], [0.58, 0.2, 0.36]];
const SKINS = [[0.5, 0.31, 0.21], [0.32, 0.2, 0.13], [0.6, 0.4, 0.29], [0.2, 0.13, 0.09], [0.56, 0.36, 0.25], [0.44, 0.27, 0.17]];
const HAIRS = [[0.035, 0.031, 0.03], [0.05, 0.035, 0.03], [0.12, 0.07, 0.04], [0.7, 0.62, 0.44], [0.7, 0.16, 0.45], [0.1, 0.55, 0.6], [0.5, 0.08, 0.05], [0.6, 0.6, 0.62], [0.2, 0.6, 0.15], [0.35, 0.12, 0.55]];
const BAGS = [[0.03, 0.03, 0.035], [0.3, 0.2, 0.1], [0.45, 0.05, 0.06], [0.6, 0.6, 0.58], [0.6, 0.55, 0.05], [0.06, 0.1, 0.25]];
const HELMETS = [[0.7, 0.58, 0.05], [0.6, 0.6, 0.58], [0.78, 0.3, 0.04]];
const CANOPIES = [[0.018, 0.018, 0.022], [0.025, 0.04, 0.1], [0.16, 0.02, 0.04], [0.025, 0.09, 0.05], [0.12, 0.04, 0.16], [0.02, 0.12, 0.13], [0.36, 0.26, 0.05], [0.1, 0.11, 0.13]];
const PAL = { jacket: 0, trousers: 20, skin: 28, hair: 34, bag: 44, rim: 50, shirt: 54, helmet: 62, canopy: 65, size: 73 };

// A colour's family: what the eye calls it from across a street. A look is
// never all one family: the trousers, what is under the jacket and dyed hair
// are each picked out of the jacket's.
const NEUTRAL = 0;
function family([r, g, b]) {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d / max < 0.36) return NEUTRAL;
  let h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  // Reds and pinks, oranges and yellows, greens, teals, blues, purples.
  return h >= 5.5 || h < 0.3 ? 1 : h < 1.4 ? 2 : h < 2.6 ? 3 : h < 3.5 ? 4 : h < 4.4 ? 5 : 6;
}
const light = ([r, g, b]) => 0.3 * r + 0.5 * g + 0.2 * b;
const FAMILY = {
  jacket: JACKETS.map(family),
  trousers: TROUSERS.map(family),
  shirt: SHIRTS.map(family),
  // Black, the browns, bleached and silver are nobody's colour but hair's.
  hair: HAIRS.map((c, i) => ([0, 1, 2, 3, 7].includes(i) ? NEUTRAL : family(c))),
  bag: BAGS.map(family),
};

const GARMENTS = { jacket: 0, coat: 1, puffer: 2, vest: 3 };
// Hair: a cap of it, long, a mohawk over shaved sides, a bun, shaved, under a
// cap, a hood up, long under a cap, under a hard hat.
const HAIR = {
  short: { mask: [TAG.hair] },
  long: { mask: [TAG.hair, TAG.long] },
  mohawk: { mask: [TAG.hair, TAG.mohawk], buzz: true },
  bun: { mask: [TAG.hair, TAG.bun] },
  buzz: { mask: [TAG.hair], buzz: true },
  cap: { mask: [TAG.hair, TAG.brim], hat: true },
  hood: { mask: [TAG.hood] },
  capLong: { mask: [TAG.hair, TAG.brim, TAG.long], hat: true },
  hardhat: { mask: [TAG.hair, TAG.hardhat] },
};
// How a place dresses. Each list is [what, odds] pairs: the garment, the
// jacket's colour (by garment where it matters), the trousers', the shirt's,
// the hair and its colour, the bag (none, a satchel, a pack, a carried bag)
// and its colour; then how often a jacket is worn open, a suit's shirt and
// lapels show, there is a tie, an umbrella's cloth is one colour, two in
// turns gore by gore, banded at its edge or clear, and the rest.
const STYLES = {
  // Japantown, the avenue and everywhere else: street fashion.
  street: {
    garment: [[GARMENTS.jacket, 42], [GARMENTS.coat, 22], [GARMENTS.puffer, 20], [GARMENTS.vest, 16]],
    // (Black, charcoal, navy, midnight, grey, brown, burgundy and olive are
    // two in three of them; yellow, red, white, teal, purple, magenta, rust,
    // blue, moss and sand the rest.)
    jacket: () => [[5, 15], [16, 10], [8, 8], [17, 6], [10, 6], [11, 6], [14, 6], [6, 5], [0, 4], [1, 4], [4, 3], [2, 3], [3, 3], [9, 2], [7, 2], [12, 2], [13, 1], [15, 2]],
    trousers: [[0, 20], [1, 16], [2, 9], [3, 5], [4, 3], [5, 7], [6, 6], [7, 14]],
    shirt: [[0, 22], [1, 20], [2, 12], [3, 8], [4, 10], [5, 10], [6, 9], [7, 9]],
    hair: [["short", 20], ["long", 20], ["mohawk", 8], ["bun", 10], ["buzz", 9], ["cap", 12], ["hood", 14], ["capLong", 7]],
    hairColour: [[0, 30], [1, 14], [2, 12], [3, 10], [4, 8], [5, 7], [6, 6], [7, 5], [8, 4], [9, 4]],
    bag: [[0, 45], [1, 20], [2, 20], [3, 15]],
    bagColour: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]],
    open: { [GARMENTS.jacket]: 0.62, [GARMENTS.coat]: 0.35, [GARMENTS.puffer]: 0, [GARMENTS.vest]: 0.5 },
    suit: 0,
    tie: 0,
    canopy: [50, 22, 18, 10],
    umbrella: 1,
    trim: 0.2,
    cyber: 0.13,
    visor: 0.09,
    paleShoes: 0.25,
    bare: 0.5,
    hivis: () => 0,
    old: 0.09,
    gloves: 0.12,
    arm: 0.07,
    long: 0.45,
  },
  // Corpo Plaza and Corpo Row: suits and long coats in dark tones, a white
  // shirt, and a tie, an umbrella's rim or a bag for the one bright thing.
  corpo: {
    garment: [[GARMENTS.jacket, 58], [GARMENTS.coat, 34], [GARMENTS.vest, 8]],
    jacket: (g) => (g === GARMENTS.coat ? [[5, 24], [16, 20], [17, 14], [8, 12], [10, 8], [11, 12], [14, 4], [15, 4], [4, 2]] : [[5, 26], [16, 24], [17, 18], [8, 16], [10, 9], [14, 4], [4, 3]]),
    trousers: [[0, 34], [7, 24], [1, 18], [5, 12], [2, 12]],
    shirt: [[0, 72], [3, 12], [1, 9], [2, 7]],
    hair: [["short", 36], ["long", 24], ["bun", 18], ["buzz", 9], ["cap", 2], ["capLong", 1]],
    hairColour: [[0, 36], [1, 20], [2, 15], [3, 10], [7, 11], [4, 2], [5, 2], [6, 2], [9, 2]],
    bag: [[0, 44], [1, 24], [2, 4], [3, 28]],
    bagColour: [[0, 5], [1, 3], [5, 2], [2, 1]],
    open: {},
    suit: 0.92,
    tie: 0.55,
    canopy: [70, 14, 10, 6],
    umbrella: 1.2,
    trim: 0.05,
    cyber: 0.2,
    visor: 0.12,
    paleShoes: 0.04,
    bare: 0,
    hivis: () => 0,
    old: 0.07,
    gloves: 0.16,
    arm: 0.03,
    long: 0.6,
  },
  // Santo Domingo: work clothes, hi-vis vests with their bands, hard hats.
  santo: {
    garment: [[GARMENTS.jacket, 38], [GARMENTS.coat, 3], [GARMENTS.puffer, 13], [GARMENTS.vest, 46]],
    jacket: (g) => (g === GARMENTS.vest ? [[18, 50], [19, 36], [6, 7], [10, 7]] : g === GARMENTS.puffer ? [[8, 3], [5, 3], [6, 2], [10, 2]] : [[8, 20], [11, 16], [6, 16], [10, 14], [7, 8], [12, 10], [5, 8], [18, 5], [19, 3]]),
    trousers: [[1, 26], [2, 22], [6, 16], [0, 14], [5, 14], [7, 8]],
    shirt: [[2, 30], [1, 20], [3, 20], [4, 10], [0, 10], [6, 10]],
    hair: [["hardhat", 42], ["cap", 20], ["hood", 10], ["short", 14], ["buzz", 10], ["long", 4]],
    hairColour: [[0, 38], [1, 22], [2, 18], [3, 8], [7, 9], [6, 3], [5, 2]],
    bag: [[0, 55], [1, 10], [2, 20], [3, 15]],
    bagColour: [[0, 4], [1, 3], [5, 2], [4, 1]],
    open: { [GARMENTS.jacket]: 0.45, [GARMENTS.vest]: 0.7 },
    suit: 0,
    tie: 0,
    canopy: [70, 14, 10, 6],
    umbrella: 0.25,
    trim: 0.03,
    cyber: 0.15,
    visor: 0.05,
    paleShoes: 0.03,
    bare: 0.3,
    hivis: (jacket) => (jacket === 18 || jacket === 19 ? 1 : 0),
    old: 0.06,
    gloves: 0.34,
    arm: 0.09,
    long: 0.3,
  },
};
// A child (only ever beside a grown-up) and somebody old: what of the place's
// own lists is theirs instead. A child in a bright jacket or a puffer, a pack
// or nothing; somebody old in a coat or a jacket of a quiet colour, grey hair
// or none, a bag in the hand.
const KID = {
  garment: [[GARMENTS.jacket, 45], [GARMENTS.puffer, 55]],
  jacket: () => [[0, 3], [1, 3], [2, 2], [3, 2], [7, 2], [9, 3], [12, 3], [13, 2], [4, 1], [5, 1]],
  hair: [["short", 30], ["long", 26], ["bun", 14], ["cap", 14], ["hood", 16]],
  hairColour: [[0, 40], [1, 25], [2, 20], [3, 15]],
  bag: [[0, 55], [2, 45]],
};
const OLD = {
  garment: [[GARMENTS.coat, 46], [GARMENTS.jacket, 40], [GARMENTS.puffer, 14]],
  hair: [["short", 38], ["buzz", 18], ["cap", 18], ["bun", 14], ["hood", 6], ["long", 6]],
  hairColour: [[7, 58], [3, 18], [0, 12], [1, 12]],
  bag: [[0, 40], [1, 15], [3, 45]],
};
const QUIET = [5, 6, 8, 10, 11, 14, 15, 16, 17];
// A person's flags past the garment's, the hat's and the umbrella's: gloves,
// one arm a machine, a coat to the calf, a child, somebody old.
// And an umbrella's: a lit edge, and its cloth's colour (eight of them, from
// the next bit up).
const FLAG = { gloves: 512, arm: 1024, long: 2048, kid: 4096, old: 8192, led: 16384, cloth: 32768 };
// Where each is worn, 0 to 1 at a point of the plan, easing over a dozen
// metres at its edges so the places leak into each other: Corpo Plaza and
// the boulevard's two pavements and forecourts; Santo Domingo east of the
// garage street, and the south street east of x 300.
const within = (v, a, b, soft = 12) => Math.min(1, Math.max(0, (v - a) / soft + 0.5), Math.max(0, (b - v) / soft + 0.5));
const corpoAt = (x, z) => Math.max(within(x, 44, 132) * within(z, -330, -200), within(x, 132, 436) * within(z, -356, -304, 8));
const santoAt = (x, z) => Math.max(within(x, 442, 1e4), within(x, 300, 1e4, 30) * within(z, -16, 18, 8));

// Walks: a start, a direction (unit, in the ground plane), a length, how
// many people share it on a desktop and on a phone, the files they keep to
// (metres to the side of the line: two abreast and a body's width apart, or
// one), and which way they
// go. Everyone on a walk goes the same way at the same pace, so nobody walks
// through anybody; the walk beside it goes the other way. Walks that share a
// pavement say so, and how far to either side of the first of them a
// walker's middle may go (the kerb's edge to the shop's wall, less a body).
// The avenue's pavements run the length the hero and the intro see, between
// the lamps and hydrants by the kerb and the bins and benches by the shops.
const WALKS = [
  { from: [11.5, -168], dir: [0, 1], len: 224, n: [46, 12], files: [-0.33, 0.33], way: -1, pave: 1, span: [-0.92, 2.15], mouth: 1 },
  { from: [12.35, -168], dir: [0, 1], len: 224, n: [30, 8], files: [0], way: 1, pave: 1, mouth: 1 },
  { from: [-11.5, -168], dir: [0, 1], len: 224, n: [46, 12], files: [-0.33, 0.33], way: 1, pave: 2, span: [-2.15, 0.92], mouth: -1 },
  { from: [-12.35, -168], dir: [0, 1], len: 224, n: [30, 8], files: [0], way: -1, pave: 2, mouth: -1 },
  // The cross street's pavements, either side of the avenue.
  { from: [-88, -8.2], dir: [1, 0], len: 74, n: [2, 0] },
  { from: [16, 9.8], dir: [1, 0], len: 72, n: [2, 0] },
  // The plaza, across its square in front of the board and along its kerb.
  { from: [50, -230], dir: [1, 0], len: 58, n: [3, 1] },
  { from: [52, -196], dir: [1, 0], len: 56, n: [3, 1] },
  // Corpo row's boulevard: under the south side's awnings, and the north
  // pavement past the lobbies.
  { from: [130, -318.6], dir: [1, 0], len: 320, n: [6, 2] },
  { from: [112, -341.6], dir: [1, 0], len: 340, n: [5, 1] },
  // The garage street's two pavements.
  { from: [430.2, -298], dir: [0, 1], len: 100, n: [2, 1] },
  { from: [449.8, -298], dir: [0, 1], len: 46, n: [1, 0] },
];
// Where the avenue's own four walks meet the south street: they do not walk
// its mouth at the corner, a kerb's height over the road. Along the walk,
// in metres: they turn out across the corner's pavement (`out` metres to the
// street's side) onto the painted crossing, step down onto the road, cross
// it, step up and turn back in.
const MOUTH = { turn: [157.4, 161.4], road: [162, 176], back: [176.6, 180.6], out: 4.6 };
const ease = (a, b, v) => {
  const u = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const HALF_PI = Math.PI / 2;
// Standing: x, z, which way they look (0 toward +z, a quarter turn toward
// +x), their pose. At the kerbs of the crossings, at shop windows up both
// pavements clear of the benches and bins, pairs talking, some against a
// wall or down on their heels at the kerb, and on the garage street's
// pavement (a phone keeps every other one).
// And the braindance's hot phone (src/braindance/places.js, `phone`):
// someone stopped on the right-hand pavement with it lit in their hand, on
// every tier, stood so the phone itself is at the clue's own point.
const STANDS = [
  [10.5, -13.2, -HALF_PI, "idle"], [13.3, -46.0, Math.PI, "talk"], [-10.5, -12.6, HALF_PI, "phone"], [13.3, -47.15, 0, "talk"],
  [-13.3, -58.5, HALF_PI, "smoke"], [13.3, -37.2, HALF_PI, "phone"], [-13.3, -88.6, 0, "talk"], [10.5, 14.0, -HALF_PI, "smoke"],
  [-13.3, -87.45, Math.PI, "talk"], [-10.5, 13.8, HALF_PI, "idle"], [13.4, -108.5, -HALF_PI, "smoke"], [-13.3, -21.3, -HALF_PI, "idle"],
  [-13.62, -143.0, HALF_PI, "lean"], [13.3, -77.0, HALF_PI, "idle"], [431.3, -241.0, HALF_PI, "idle"], [-13.4, -112.0, -HALF_PI, "phone"],
  [431.3, -276.0, HALF_PI, "phone"], [13.3, -142.5, HALF_PI, "idle"],
  [13.62, -52.0, -HALF_PI, "lean"], [10.55, -72.0, -HALF_PI, "squat"], [-13.62, -70.0, HALF_PI, "lean"], [13.3, -150.5, Math.PI, "talk"],
  [-10.55, -104.0, HALF_PI, "squat"], [13.3, -151.65, 0, "talk"], [-13.3, -30.5, HALF_PI, "smoke"], [-13.3, -128.0, -HALF_PI, "idle"],
  // The megabuilding's passage, between what is dumped along its walls:
  // sat on the ground with their backs to a wall, and lying along it.
  [-4.42, -758.4, HALF_PI, "floor"], [-4.25, -763.0, 0, "lie"], [4.42, -757.5, -HALF_PI, "floor"], [4.2, -766.3, Math.PI, "lie"], [4.42, -764.2, -HALF_PI, "floor"],
];
const HOT_PHONE = [11.4, -121.0];

// A number out of a place. Everything about a person is dealt from where
// they stand (or where their walk starts), never from how many came before
// them: a district that stands one more somebody changes nobody else.
function hashAt(x, z, salt = 0) {
  let h = Math.imul(Math.round(x * 100) | 0, 73856093) ^ Math.imul(Math.round(z * 100) | 0, 19349663) ^ Math.imul((salt | 0) + 1, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = (r, odds) => {
  let x = r() * odds.reduce((a, b) => a + b, 0);
  for (let i = 0; i < odds.length; i++) if ((x -= odds[i]) < 0) return i;
  return odds.length - 1;
};
const bits = (...tags) => tags.reduce((m, t) => m + 2 ** t, 0);

// Floats a person: where they walk (x, z, pace, step), their line (its way,
// its length, where on it they start), their body (height over the
// figure's, build, pose or lane, the ground under them), their look (what
// they wear as a mask, the garment and its flags, the neon and bag colours,
// a seed) and their colours (jacket, trousers, skin, hair).
const STRIDE = 20;
/** Who is in the city: every walker of every walk, then everyone standing. */
function populate({ phone, walks, standers, benches = [], rails = [], bare = false, ahead = [], crossings = [] }) {
  const people = [];
  // One of a list of [what, odds] pairs, of those `ok` lets through.
  const draw = (r, list, ok = null) => {
    const fit = ok ? list.filter(([v]) => ok(v)) : list;
    const from = fit.length ? fit : list;
    let x = r() * from.reduce((sum, [, odds]) => sum + odds, 0);
    for (const [v, odds] of from) if ((x -= odds) < 0) return v;
    return from[from.length - 1][0];
  };
  // A look none of those round them shares (`near`: whoever is already
  // dressed on the same pavement, the latest last, or within a few steps of
  // where they stand, the nearest last), and nothing like the nearest: the
  // jacket's colour and cut, the hair and the build are what the eye matches
  // first, so next to each other no two have a jacket of the same family of
  // colours (suits apart: a row of dark suits is the place), the same cut
  // with the same hair, hair of the same colour or the same build. And nobody
  // is one colour: the trousers and what is under the jacket are out of its
  // family or, greys and blacks together, well apart from it in lightness;
  // dyed hair is not the jacket's colour either. `r` is the person's own
  // draw, out of where they are.
  // A child (`kid`) is dressed as one; somebody old (where `aged` allows it:
  // never on a quick walk) as the place dresses, quieter.
  const dress = (r, near, { pose = null, umbrellaOdds = 0.1, at = [0, 0], kid = false, aged = true } = {}) => {
    const where = r();
    const corpo = corpoAt(at[0], at[1]) * 0.86;
    const santo = santoAt(at[0], at[1]) * 0.86;
    const place = STYLES[where < corpo ? "corpo" : where < corpo + santo ? "santo" : "street"];
    const old = !kid && aged && r() < place.old;
    const style = kid ? { ...place, ...KID } : old ? { ...place, ...OLD } : place;
    const before = near[near.length - 1] ?? { hue: -1, build: 0, hair: -1 };
    let cut, garment, jacket;
    for (let tries = 0; tries < 16; tries++) {
      cut = draw(r, style.hair);
      garment = draw(r, style.garment);
      jacket = draw(r, style.jacket(garment), old ? (i) => QUIET.includes(i) : null);
      const hue = FAMILY.jacket[jacket];
      const same = (n) => n.garment === garment && n.cut === cut;
      if (!near.some((n) => n.jacket === jacket && same(n)) && !near.slice(-4).some((n) => n.jacket === jacket) && !near.slice(-3).some(same) && (hue === NEUTRAL || hue !== before.hue)) break;
    }
    const worn = { jacket, garment, cut, hue: FAMILY.jacket[jacket], build: 0, hair: -1 };
    near.push(worn);
    if (near.length > 48) near.shift();
    const hair = HAIR[cut];
    const low = pose === "sit" || pose === "squat" || pose === "floor" || pose === "lie" || pose === "work";
    if (garment === GARMENTS.coat && (low || pose === "lean")) garment = GARMENTS.jacket;
    const hue = FAMILY.jacket[jacket];
    const tone = light(JACKETS[jacket]);
    const apart = (other) => Math.max(other, tone) > 1.8 * Math.min(other, tone);
    let mask = bits(...hair.mask);
    if (garment === GARMENTS.coat) mask += bits(TAG.skirt);
    const collar = garment === GARMENTS.puffer ? 1 : garment === GARMENTS.coat ? 0.6 : garment === GARMENTS.jacket ? (style.suit ? 0.06 : 0.25) : 0;
    if (r() < collar && cut !== "hood") mask += bits(TAG.collar);
    // A suit shows its shirt between the lapels; a jacket worn open (more
    // often over a hood: it is the hoodie's own) shows what is under it.
    const suit = !kid && garment !== GARMENTS.puffer && r() < style.suit;
    const open = !suit && r() < (style.open[garment] ?? 0) + (cut === "hood" && garment !== GARMENTS.puffer ? 0.25 : 0);
    if (suit) mask += bits(TAG.suit);
    if (open) mask += bits(TAG.open);
    if (suit && r() < style.tie) mask += bits(TAG.tie);
    if (!kid && garment !== GARMENTS.puffer && garment !== GARMENTS.coat && style.hivis(jacket)) mask += bits(TAG.hivis);
    const shirt = draw(r, style.shirt, (i) => (FAMILY.shirt[i] === NEUTRAL || FAMILY.shirt[i] !== hue) && apart(light(SHIRTS[i])));
    const trousers = draw(r, style.trousers, (i) => (FAMILY.trousers[i] !== NEUTRAL ? FAMILY.trousers[i] !== hue : hue !== NEUTRAL || suit || open || apart(light(TROUSERS[i]))));
    const bag = pose === "vendor" || pose === "carry" ? 0 : draw(r, style.bag, (k) => !(k === 2 && (pose === "lean" || pose === "sit" || pose === "floor" || pose === "lie")) && !(k === 3 && (low || pose === "rail" || pose === "lean")));
    if (bag) mask += bits([TAG.hipbag, TAG.backpack, TAG.tote][bag - 1]);
    const bagColour = draw(r, style.bagColour, (i) => FAMILY.bag[i] === NEUTRAL || FAMILY.bag[i] !== hue);
    const free = pose === null || pose === "idle" || pose === "talk";
    const umbrella = !kid && free && cut !== "hardhat" && r() < umbrellaOdds * style.umbrella * (old ? 1.4 : 1);
    if (umbrella) mask += bits(TAG.umbrella);
    if (pose === "phone" || (pose === null && !kid && !umbrella && r() < (old ? 0.04 : 0.12))) mask += bits(TAG.phone);
    if (pose === "smoke") mask += bits(TAG.smoke);
    if (!old && r() < (kid ? 0.3 : style.trim)) mask += bits(TAG.trim);
    // Cyberware down a cheek on some, a visor on a few, and a cup in the
    // free hand of some of those with nothing to do with it.
    if (!kid && r() < style.cyber * (old ? 0.5 : 1)) mask += bits(TAG.cyber);
    if (!kid && r() < style.visor * (old ? 0.2 : 1)) mask += bits(TAG.visor);
    if (!kid && bag !== 3 && r() < (pose === null ? 0.06 : pose === "idle" || pose === "talk" || pose === "sit" ? 0.22 : 0)) mask += bits(TAG.cup);
    // The garment; a hat, a shaved head, lit eyes, bare arms under a vest
    // (never with a hood: that is a hoodie's, and it has sleeves), pale
    // shoes; and an umbrella's cloth (one colour, two in turns, banded, clear).
    // Then
    // gloves; an arm that is a machine (bared more often than not: whoever
    // has one shows it); a coat that goes on past the knee to the calf; and
    // whether they are a child or old.
    let flags = garment + (hair.hat ? 4 : 0) + (hair.buzz ? 8 : 0) + (!kid && r() < 0.08 ? 16 : 0) + (cut !== "hood" && !kid && !old && r() < style.bare ? 32 : 0) + (r() < style.paleShoes ? 64 : 0) + 128 * pick(r, style.canopy);
    // The umbrella's colour, and on one in eight a lit line round its edge
    // (never white).
    if (umbrella) flags += FLAG.cloth * Math.floor(r() * CANOPIES.length) + (r() < 0.12 ? FLAG.led : 0);
    if (!kid && pose !== "vendor" && r() < style.gloves * (old ? 2 : 1)) flags += FLAG.gloves;
    if (!kid && r() < style.arm * (old ? 0.4 : 1)) {
      flags += FLAG.arm;
      if (garment === GARMENTS.vest && cut !== "hood" && !(flags & 32)) flags += 32;
    }
    if (garment === GARMENTS.coat && r() < style.long * (old ? 1.2 : 1)) flags += FLAG.long;
    if (kid) flags += FLAG.kid;
    if (old) flags += FLAG.old;
    // Slight to heavy, most of them slight to middling, one in twelve heavy; a child
    // slight, somebody old a little broad.
    let build = kid ? 0.8 + 0.12 * r() : old ? 0.92 + 0.28 * r() : r() < 0.08 ? 1.18 + 0.14 * r() : 0.8 + 0.34 * r() ** 1.6;
    if (!kid && Math.abs(build - before.build) < 0.07) build = build > 1.04 ? build - 0.12 : build + 0.12;
    const hairColour = draw(r, style.hairColour, (i) => i !== before.hair && (FAMILY.hair[i] === NEUTRAL || FAMILY.hair[i] !== hue));
    worn.build = build;
    worn.hair = hairColour;
    const tall = (r() + r()) * 0.5;
    return {
      height: (kid ? 1.02 + 0.42 * tall : old ? 1.52 + 0.26 * tall : 1.6 + 0.38 * tall) / RIG.height,
      build,
      look: [mask, flags, Math.floor(r() * RIMS.length) + 4 * bagColour, r()],
      wear: [jacket, trousers + 8 * shirt, Math.floor(r() * SKINS.length), hairColour],
    };
  };

  // The walks: this module's own, then the rest of the network's pavements
  // (the builder's streets.life: from, the way it runs, how long, and how
  // many walk it on a desktop and on a phone; a line by the kerb and then
  // the line by the shops beside it, pavement by pavement).
  const lines = bare ? [] : WALKS.map((w) => ({ ...w }));
  const first = lines.length;
  for (let i = 0; i + 6 < walks.length; i += 7) lines.push({ from: [walks[i], walks[i + 1]], dir: [walks[i + 2], walks[i + 3]], len: walks[i + 4], n: [walks[i + 5], walks[i + 6]] });
  for (let i = first; i + 1 < lines.length; i += 2) {
    // A pavement's two lines go opposite ways, and the kerb's keeps a step
    // further in, clear of the lamps along the kerb.
    const a = lines[i];
    const b = lines[i + 1];
    const across = (b.from[0] - a.from[0]) * a.dir[1] - (b.from[1] - a.from[1]) * a.dir[0];
    const paired = a.dir[0] === b.dir[0] && a.dir[1] === b.dir[1] && Math.abs(across) > 0.8 && Math.abs(across) < 4.5;
    if (!paired) continue;
    const inward = Math.sign(across);
    a.files = [inward * 0.16, inward * 0.8];
    b.files = [inward * -0.36, inward * 0.28];
    a.way = hashAt(a.from[0], a.from[1], 5) & 1 ? -1 : 1;
    b.way = -a.way;
    // The kerb's line is 0.7 m in from the kerb and the shops' 1.7 m out
    // from the wall.
    a.pave = b.pave = 100 + i;
    a.span = [inward * -0.42, across + inward * 1.35].sort((p, q) => p - q);
  }
  // A pavement with more people stood on it than walking it has walkers
  // added (the builder's count is a least): about as many walking as stood
  // there, a third of them on a phone (which keeps half the standers), and
  // never more than a file can carry at a body's length apart and then some.
  {
    const CELL = 8;
    const grid = new Map();
    const add = (x, y, z) => {
      if (Math.abs(y - PAVE_Y) > 0.6) return;
      const k = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
      (grid.get(k) ?? grid.set(k, []).get(k)).push(x, z);
    };
    if (!bare) for (const [x, z] of STANDS) add(x, PAVE_Y, z);
    for (const list of [ahead, standers]) for (let i = 0; i + 4 < list.length; i += 5) add(list[i], list[i + 1], list[i + 2]);
    for (let i = first; i + 1 < lines.length; i += 2) {
      const a = lines[i];
      const b = lines[i + 1];
      if (a.pave !== b.pave || !a.span) continue;
      const [lo, hi] = a.span;
      let stood = 0;
      const seen = new Set();
      for (let v = 0; v <= a.len + CELL; v += CELL / 2) {
        for (let u = lo - 1; u <= hi + 1 + CELL / 2; u += CELL / 2) {
          const x = a.from[0] + a.dir[0] * v + a.dir[1] * u;
          const z = a.from[1] + a.dir[1] * v - a.dir[0] * u;
          const k = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
          if (seen.has(k)) continue;
          seen.add(k);
          const c = grid.get(k) ?? [];
          for (let j = 0; j < c.length; j += 2) {
            const rx = c[j] - a.from[0];
            const rz = c[j + 1] - a.from[1];
            const along = rx * a.dir[0] + rz * a.dir[1];
            const across = rx * a.dir[1] - rz * a.dir[0];
            if (along >= 0 && along <= a.len && across >= lo - 0.8 && across <= hi + 0.8) stood++;
          }
        }
      }
      const want = phone ? Math.ceil(stood * 0.33) : Math.ceil(stood * 1.05);
      for (const w of [a, b]) {
        const k = phone ? 1 : 0;
        const most = Math.floor(w.len / (phone ? 7 : 3.4));
        w.n = [...w.n];
        w.n[k] = Math.max(w.n[k], Math.min(most, Math.ceil(want / 2)));
      }
    }
  }
  // The pavements: the walks that share one, in order, and each file's
  // place across it, measured from the first walk's line.
  const paves = new Map();
  const rows = [];
  for (const w of lines) {
    const n = w.n[phone ? 1 : 0];
    if (!n) continue;
    // The walk's own draw, out of where it starts and how it runs.
    const r = rng(hashAt(w.from[0], w.from[1], Math.round(w.len * 10) + 7 * Math.round(Math.atan2(w.dir[0], w.dir[1]) * 100)));
    const files = w.files ?? [-0.33, 0.33];
    const way = w.way ?? (r() < 0.5 ? -1 : 1);
    const pace = way * (1.12 + r() * 0.42);
    // Alone, or two abreast and in step where the walk has room for it.
    const groups = [];
    for (let left = n; left > 0; ) {
      const two = files.length > 1 && left > 1 && r() < 0.3;
      groups.push(two ? 2 : 1);
      left -= two ? 2 : 1;
    }
    // A lane each, for the map that bends a file round what stands in it.
    const key = w.pave ?? w;
    if (!paves.has(key)) paves.set(key, { ref: w, span: w.span ?? [Math.min(...files) - 0.6, Math.max(...files) + 0.6], files: [], worn: [] });
    const pave = paves.get(key);
    const shift = (w.from[0] - pave.ref.from[0]) * pave.ref.dir[1] - (w.from[1] - pave.ref.from[1]) * pave.ref.dir[0];
    const lanes = files.map((off) => {
      pave.files.push({ row: rows.length, u: shift + off });
      rows.push(w);
      return rows.length - 1;
    });
    const slot = w.len / groups.length;
    // Somewhere in their own stretch of the walk, never within a body's
    // length of the next one's. And each one (or two) keeps their own time
    // along it, a little ahead of the walk's pace and then a little behind,
    // by as much as the room to the next stretch allows (`drift`, in steps
    // of 0.15 m over 0.3, a pair's together: shader and refresh() read it
    // out of the step's whole part).
    const loose = Math.min(0.6, Math.max(0, 1 - 1.1 / slot));
    const most = Math.max(0, Math.min(8, Math.floor(((slot * (1 - loose) - 0.9) / 2 - 0.3) / 0.15)));
    groups.forEach((size, g) => {
      const at = (g + (1 - loose) / 2 + loose * r()) * slot;
      const step = r();
      const one = Math.floor(r() * files.length);
      const drift = 2 * Math.floor(r() * (most + 1));
      const where = [w.from[0] + w.dir[0] * at, w.from[1] + w.dir[1] * at];
      // The second of two is a child, now and then, where children are.
      const kid = size > 1 && r() < 0.16 * (1 - 0.75 * Math.max(corpoAt(...where), santoAt(...where)));
      for (let k = 0; k < size; k++) {
        const f = size > 1 ? k : one;
        const off = files[f] + (r() - 0.5) * 0.1;
        // To the side of a line: +x of one that runs along +z.
        const d = dress(r, pave.worn, { umbrellaOdds: k ? 0.07 : 0.1, at: where, kid: kid && k === 1, aged: Math.abs(pace) < 1.36 });
        people.push({
          walk: [w.from[0] + w.dir[1] * off, w.from[1] - w.dir[0] * off, pace, (k ? step + 0.5 : step) + drift],
          path: [w.dir[0], w.dir[1], w.len, at + k * 0.3],
          // (The ground under a walker is the pavement's top; where their
          // walk crosses the mouth it says which side the crossing is.)
          body: [d.height, d.build, -(lanes[f] + 1), w.mouth ? (w.mouth > 0 ? -1 : -2) : PAVE_Y],
          look: d.look,
          wear: d.wear,
        });
      }
    });
  }

  // Everyone standing: this module's own, the one with the hot phone,
  // everyone a district stood somewhere (x, y, z, the way they look, their
  // pose), and somebody on some of the benches nobody was sat on.
  const spots = [];
  STANDS.forEach(([x, z, yaw, pose], i) => {
    if (!bare && (!phone || i % 2 === 0)) spots.push({ x, y: PAVE_Y, z, yaw, pose: POSES.indexOf(pose) });
  });
  // The hot phone: looking down the street toward the hero, the phone a
  // forearm ahead of them at the clue's point.
  if (!bare) spots.push({ x: HOT_PHONE[0], y: PAVE_Y, z: HOT_PHONE[1], yaw: 0.5, pose: POSES.indexOf("phone"), hot: true });
  // (A phone keeps half of them: which half is each one's own place's to
  // say, not their number in the list.)
  for (const list of [ahead, standers]) {
    for (let i = 0; i + 4 < list.length; i += 5) {
      if (phone && hashAt(list[i], list[i + 2], 3) & 1) continue;
      spots.push({ x: list[i], y: list[i + 1], z: list[i + 2], yaw: list[i + 3], pose: Math.min(POSES.length - 1, Math.max(0, Math.round(list[i + 4]))) });
    }
  }
  const SIT = POSES.indexOf("sit");
  for (const bench of benches) {
    // Its seat runs across the way it faces. Whoever a district sat on it
    // sits the way it faces, not through its back.
    const along = [Math.cos(bench.yaw), -Math.sin(bench.yaw)];
    const front = [Math.sin(bench.yaw), Math.cos(bench.yaw)];
    let taken = false;
    for (const p of spots) {
      const dx = p.x - bench.x;
      const dz = p.z - bench.z;
      if (Math.abs(dx * along[0] + dz * along[1]) > 1.05 || Math.abs(dx * front[0] + dz * front[1]) > 0.6 || Math.abs(p.y - bench.y - 0.3) > 0.6) continue;
      taken = true;
      if (p.pose === SIT && Math.sin(p.yaw) * front[0] + Math.cos(p.yaw) * front[1] < 0) p.yaw = bench.yaw;
    }
    // Of the empty ones about half are sat on, some of those by two.
    const r = rng(hashAt(bench.x, bench.z, 11));
    const u = r();
    const at = (r() - 0.5) * 0.9;
    if (taken || bare || u > 0.52) continue;
    const two = u < 0.14;
    for (const o of two ? [-0.42 + at * 0.2, 0.42 + at * 0.2] : [at]) spots.push({ x: bench.x + along[0] * o, y: bench.y + 0.48, z: bench.z + along[1] * o, yaw: bench.yaw, pose: SIT });
  }

  // Whoever a district stood at a rail and looking at it leans on it, on
  // their forearms, square to it and a forearm's reach from it, looking out.
  const RAIL = POSES.indexOf("rail");
  const LOOKERS = [POSES.indexOf("idle"), POSES.indexOf("lean"), POSES.indexOf("smoke"), RAIL];
  for (const p of spots) {
    if (!LOOKERS.includes(p.pose)) continue;
    for (const rail of rails) {
      const dx = p.x - rail.x;
      const dz = p.z - rail.z;
      if (Math.abs(dx) > 3 || Math.abs(dz) > 3 || Math.abs(p.y - rail.y) > 0.5) continue;
      const cos = Math.cos(rail.yaw);
      const sin = Math.sin(rail.yaw);
      const along = dx * cos - dz * sin;
      const off = dx * sin + dz * cos;
      if (Math.abs(along) > rail.half + 0.1 || Math.abs(off) < 0.15 || Math.abs(off) > 0.8) continue;
      const side = Math.sign(off);
      if (Math.sin(p.yaw) * -side * sin + Math.cos(p.yaw) * -side * cos < 0.5) continue;
      p.pose = RAIL;
      p.yaw = Math.atan2(-side * sin, -side * cos);
      p.x = rail.x + cos * along + sin * side * 0.42;
      p.z = rail.z - sin * along + cos * side * 0.42;
      break;
    }
  }

  // Whoever holds one end of a crate has somebody on the other end, a crate's
  // length off and facing them, unless a district stood one there itself.
  const CARRY = POSES.indexOf("carry");
  for (const p of spots.filter((q) => q.pose === CARRY)) {
    if (spots.some((q) => q !== p && q.pose === CARRY && Math.hypot(q.x - p.x, q.z - p.z) < 2.2 && Math.abs(q.y - p.y) < 0.5)) continue;
    spots.push({ x: p.x + Math.sin(p.yaw) * 1.5, y: p.y, z: p.z + Math.cos(p.yaw) * 1.5, yaw: p.yaw + Math.PI, pose: CARRY });
  }

  // Two within 1.6 m of each other are together: whoever is free to turns to
  // the other (to the middle of the others, of three or more), two idlers
  // fall to talking, and whoever is sat or against a wall turns their head.
  const FREE = [POSES.indexOf("idle"), POSES.indexOf("talk"), POSES.indexOf("smoke")];
  const NEAR = 1.6;
  const cells = new Map();
  const cellOf = (p) => `${Math.floor(p.x / NEAR)},${Math.floor(p.z / NEAR)}`;
  spots.forEach((p, i) => {
    // Each one's own draws, out of where they stand: how they turn to
    // company, how they are dressed, how they hold themselves.
    p.key = hashAt(p.x, p.z, Math.round(p.y * 10));
    p.r = rng(p.key ^ 0x51ed270b);
    const key = cellOf(p);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(i);
  });
  // A queue is a queue: three or more with nothing to do, one behind
  // another and all looking the same way, keep looking that way (they do
  // not turn to each other and fall to talking), each with their own way of
  // waiting.
  const QUEUE = POSES.indexOf("queue");
  const WAITS = [FREE[0], POSES.indexOf("phone"), FREE[2], QUEUE];
  const behind = spots.map((p, i) => {
    const out = [];
    if (p.pose !== FREE[0]) return out;
    const cx = Math.floor(p.x / NEAR);
    const cz = Math.floor(p.z / NEAR);
    for (let ix = cx - 2; ix <= cx + 2; ix++) {
      for (let iz = cz - 2; iz <= cz + 2; iz++) {
        for (const j of cells.get(`${ix},${iz}`) ?? []) {
          const q = spots[j];
          const dx = q.x - p.x;
          const dz = q.z - p.z;
          const d = Math.hypot(dx, dz);
          if (j === i || !WAITS.includes(q.pose) || d > 2.4 || d < 0.3 || Math.abs(q.y - p.y) > 0.4) continue;
          if (Math.abs(dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) < 0.4 && Math.cos(q.yaw - p.yaw) > 0.92) out.push(j);
        }
      }
    }
    return out;
  });
  spots.forEach((p, i) => {
    if (behind[i].length >= 2 || behind[i].some((j) => behind[j].length >= 2)) p.queue = true;
  });
  for (const p of spots) if (p.queue) p.pose = QUEUE;
  spots.forEach((p, i) => {
    let sx = 0;
    let sz = 0;
    let n = 0;
    let least = NEAR;
    const cx = Math.floor(p.x / NEAR);
    const cz = Math.floor(p.z / NEAR);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        for (const j of cells.get(`${ix},${iz}`) ?? []) {
          const q = spots[j];
          const d = Math.hypot(q.x - p.x, q.z - p.z);
          if (j === i || d >= NEAR || d < 0.05 || Math.abs(q.y - p.y) > 0.7) continue;
          sx += q.x;
          sz += q.z;
          n++;
          if (d < least) {
            least = d;
            p.mate = j;
          }
        }
      }
    }
    if (n) p.toward = Math.atan2(sx / n - p.x, sz / n - p.z);
  });
  spots.forEach((p, i) => {
    if (p.toward === undefined || p.hot) return;
    const mate = spots[p.mate];
    if (FREE.includes(p.pose)) {
      p.yaw = p.toward + (p.r() - 0.5) * 0.3;
      // Two with nothing to do talk, taking turns.
      if (p.pose === FREE[0] && mate.mate === i && FREE.includes(mate.pose) && !mate.hot) p.pose = FREE[1];
    } else if (p.pose !== QUEUE && p.pose !== CARRY && p.pose !== POSES.indexOf("lie")) {
      const turn = Math.atan2(Math.sin(p.toward - p.yaw), Math.cos(p.toward - p.yaw));
      p.head = Math.min(0.75, Math.max(-0.75, turn)) * 0.8;
    }
    p.turn = mate.turn === undefined ? p.r() : mate.turn + 0.5;
  });
  // Of two standing together with nothing to do, now and then one is a
  // child (never both, never on their own, never in a queue).
  spots.forEach((p) => {
    if (p.hot || p.mate === undefined || (p.pose !== FREE[0] && p.pose !== FREE[1])) return;
    const mate = spots[p.mate];
    if (mate.kid || mate.hot || !FREE.includes(mate.pose)) return;
    if (p.r() < 0.13 * (1 - 0.75 * Math.max(corpoAt(p.x, p.z), santoAt(p.x, p.z)))) p.kid = true;
  });

  // How each stands in their pose: what a hand with nothing to do does
  // (hangs, is in a pocket, folded with the other, on a hip, at a bag's
  // strap, holds a phone to an ear), where the weight is (even, on one leg
  // or the other, feet apart), which leg is the pose's bent one, and where
  // the head is turned (as the pose has it, to a side, down). Packed into
  // the walk's pace, which someone standing has no use for.
  const UPRIGHT = ["idle", "talk", "phone", "smoke", "vendor", "queue"];
  const manner = (p, name, look) => {
    const r = rng(p.key ^ 0x2c1b3c6d);
    const has = (tag) => Math.floor(look[0] / 2 ** tag) % 2 === 1;
    const right = has(TAG.umbrella) || name === "phone" || name === "smoke" || name === "vendor";
    const left = has(TAG.cup) || has(TAG.tote) || name === "vendor";
    let L = 0;
    let R = 0;
    const u = r();
    const alone = p.toward === undefined || name === "queue";
    if (name === "idle" || name === "talk" || name === "queue") {
      if (u < 0.17 && !left && !right) L = R = 2;
      else if (u < 0.42) [L, R] = [left ? 0 : 1, right ? 0 : 1];
      else if (u < 0.55 && !left) L = 3;
      else if (u < 0.65 && !right) R = 4;
      else if (u < 0.74 && !right && name !== "talk" && alone && !p.kid) {
        R = 5;
        if (!has(TAG.phone)) look[0] += bits(TAG.phone);
      } else if (u < 0.86 && !left) L = 1;
    } else if ((name === "smoke" || name === "phone") && !left && u < 0.62) L = u < 0.4 ? 1 : 3;
    const upright = UPRIGHT.includes(name);
    const stance = upright ? pick(r, [24, 30, 30, 16]) : 0;
    const flip = (upright || name === "lean" || name === "floor" || name === "work" || name === "lie") && r() < 0.5 ? 1 : 0;
    const head = !alone || name === "phone" || name === "rail" || name === "carry" || name === "work" || R === 5 ? 0 : pick(r, [38, 22, 22, 18]);
    return L + 6 * R + 36 * stance + 144 * flip + 288 * head;
  };
  // Dressed in an order that is their places' own (so one more of them
  // somewhere moves nobody's turn), each unlike whoever within three metres
  // is dressed already, the nearest most of all.
  const sheltered = new Set();
  const order = spots.map((_, i) => i).sort((a, b) => spots[a].key - spots[b].key || spots[a].x - spots[b].x || spots[a].z - spots[b].z);
  for (const i of order) {
    const p = spots[i];
    const name = POSES[p.pose];
    const near = [];
    const cx = Math.floor(p.x / NEAR);
    const cz = Math.floor(p.z / NEAR);
    for (let ix = cx - 2; ix <= cx + 2; ix++) {
      for (let iz = cz - 2; iz <= cz + 2; iz++) {
        for (const j of cells.get(`${ix},${iz}`) ?? []) {
          const q = spots[j];
          const d = Math.hypot(q.x - p.x, q.z - p.z);
          if (q.worn && d < 3 && Math.abs(q.y - p.y) < 1.5) near.push([d, q.worn]);
        }
      }
    }
    const worn = near.sort((a, b) => b[0] - a[0]).map(([, w]) => w);
    // Of two close together at most one holds an umbrella up: two canopies
    // do not fit between two faces.
    p.d = dress(rng(p.key), worn, { pose: name, umbrellaOdds: sheltered.has(p.mate) ? 0 : 0.05, at: [p.x, p.z], kid: !!p.kid });
    p.worn = worn[worn.length - 1];
    if (Math.floor(p.d.look[0] / 2 ** TAG.umbrella) % 2 === 1) sheltered.add(i);
  }
  spots.forEach((p) => {
    const name = POSES[p.pose];
    const d = p.d;
    let { x, z } = p;
    if (p.hot) {
      d.height = 1.58 / RIG.height;
      d.look[0] = bits(TAG.hair, TAG.phone, TAG.open);
      d.look[1] = GARMENTS.jacket;
      const reach = 0.385 * d.height;
      x -= Math.sin(p.yaw) * reach;
      z -= Math.cos(p.yaw) * reach;
    }
    people.push({ walk: [x, z, p.hot ? 0 : manner(p, name, d.look), p.turn ?? p.r()], path: [Math.sin(p.yaw), Math.cos(p.yaw), 1, p.head ?? 0], body: [d.height, d.build, p.pose, p.y], look: d.look, wear: d.wear });
  });

  // Who crosses at the junctions' crossings (crowd-cross.js): on a desktop
  // two or three at one end of each and one at the other, on a phone one,
  // dressed as the corner is; they start out waiting. Their walking line is
  // a lane row of its own after every walk's.
  const standing = people.length;
  const crossers = [];
  for (const c of bare ? [] : crossings) {
    const r = rng(hashAt(c.a[0] + c.b[0], c.a[1] + c.b[1], 21));
    const first = r() < 0.5 ? 0 : 1;
    const ends = phone ? [first] : r() < 0.5 ? [first, first, 1 - first] : [first, first, first, 1 - first];
    const worn = [];
    ends.forEach((end, k) => {
      const at = end ? c.b : c.a;
      const d = dress(r, worn, { pose: "idle", at, umbrellaOdds: 0.08, kid: k === 1 && r() < 0.15 });
      const manner = (r() < 0.3 ? 1 : 0) + 6 * (r() < 0.3 ? 1 : 0) + 36 * Math.floor(r() * 3) + 144 * (r() < 0.5 ? 1 : 0);
      crossers.push({ i: people.length, c, end, pace: 1.25 + 0.3 * r(), wait: 4 + 16 * r(), seed: r(), jitter: (k - (ends.length - 1) / 2) * 0.7 + (r() - 0.5) * 0.3, manner, turn: r(), step: r() });
      people.push({ walk: [at[0], at[1], manner, 0], path: [0, 1, 1, 0], body: [d.height, d.build, 0, PAVE_Y], look: d.look, wear: d.wear });
    });
  }
  const data = new Float32Array(people.length * STRIDE);
  people.forEach((p, i) => {
    data.set(p.walk, i * STRIDE);
    data.set(p.path, i * STRIDE + 4);
    data.set(p.body, i * STRIDE + 8);
    data.set(p.look, i * STRIDE + 12);
    data.set(p.wear, i * STRIDE + 16);
  });
  return { data, count: people.length, rows: rows.length, paves: [...paves.values()], standing, crossers };
}

// ---- the lanes ---------------------------------------------------------------
// A pavement has lamps, bins, benches and people standing on it, and a file
// of walkers has to go round them. For every file, how far to the side of
// its line it runs at each point along it: worked out once from what stands
// on the pavement, kept in a texture a row a file, and read by the vertex
// shader as each walker goes.
const LANE_W = 512;
// A body's half width; the least room two files keep between them; how far
// ahead of a thing a file starts to bend.
const BODY = 0.3;
const GAP = 0.46;
const EASE = 2;
// How far to the side of the eye a walker passes it, how far to either side
// of it a file gives way at all, how far off someone standing free has
// stepped back to by the time the eye is where they stood, and how near the
// eye anyone is ever drawn: whoever cannot keep that far (no room on the
// pavement, a seat, a wall, a stall) is not there at all, never half there.
// An umbrella wants that much more room than its holder.
const CLEAR = 1.45;
const CLEAR_REACH = 2.9;
const BACK = 1.4;
const NEAREST = 1.2;
const BROLLY = 0.3;

/** What stands on the ground in the props file (src/world/props.js packs
 *  it): x, z, the way it faces (as a cosine and a sine) and its half
 *  sizes; the benches and the railings, each where it stands and the way
 *  it faces; and the
 *  lamps (src/world/crowd-light.js says which things are one): x, y, z of
 *  its light and its colour, six floats each. */
function footprints(buffer) {
  const view = new DataView(buffer);
  const hl = view.getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, hl)));
  const data = new Int16Array(buffer, 4 + hl, header.count * 8);
  const out = [];
  const benches = [];
  const rails = [];
  const lamps = [];
  for (let i = 0; i < header.count; i++) {
    const o = i * 8;
    const box = header.protos[data[o]]?.box;
    const called = header.protos[data[o]]?.name;
    if (box && (called === "railing" || called === "jt_rail")) rails.push({ x: data[o + 1] / 20, y: data[o + 2] / 50, z: data[o + 3] / 20, yaw: data[o + 4] / 10430.2, half: (box[0] * data[o + 6]) / 1000 });
    const lamp = PROP_LIGHTS[header.protos[data[o]]?.name];
    if (lamp) lamps.push(data[o + 1] / 20, data[o + 2] / 50 + (lamp[4] * 2 * (box?.[1] ?? 1) * data[o + 5]) / 100, data[o + 3] / 20, lamp[0] * lamp[3], lamp[1] * lamp[3], lamp[2] * lamp[3]);
    if (header.protos[data[o]]?.name === "bench") benches.push({ x: data[o + 1] / 20, y: data[o + 2] / 50, z: data[o + 3] / 20, yaw: data[o + 4] / 10430.2 });
    // On a pavement, and more than a kerb high. Wider than a metre is
    // leaves overhead, not the tub they grow from.
    if (!box || data[o + 2] / 50 > 0.6 || (box[1] * data[o + 5]) / 100 < 0.15) continue;
    const k = data[o + 6] / 1000;
    const yaw = data[o + 4] / 10430.2;
    out.push({ x: data[o + 1] / 20, z: data[o + 3] / 20, cos: Math.cos(yaw), sin: Math.sin(yaw), hx: Math.min(box[0] * k, 1), hz: Math.min(box[2] * k, 0.55) });
  }
  return { solid: out, benches, rails, lamps: new Float32Array(lamps) };
}

/** The files of one pavement at one point along it: as near where each
 *  wants to be as the free stretch [l, r] and each other allow. */
function fit(want, l, r) {
  const n = want.length;
  const x = new Array(n);
  const room = n > 1 ? Math.min(GAP, (r - l) / (n - 1)) : 0;
  for (let i = 0; i < n; i++) x[i] = Math.max(want[i], i ? x[i - 1] + Math.min(room, want[i] - want[i - 1]) : l);
  for (let i = n - 1; i >= 0; i--) x[i] = Math.min(x[i], i < n - 1 ? x[i + 1] - Math.min(room, want[i + 1] - want[i]) : r);
  if (x[0] < l) for (let i = 0; i < n; i++) x[i] = n > 1 ? l + ((r - l) * i) / (n - 1) : (l + r) / 2;
  return x;
}

function layLanes(paves, rows, solid) {
  // A texel a point along a file: how far to the side of its line it runs
  // there (centimetres about 128), and how much room a walker has to move
  // off it to either side before the kerb, the wall or something standing.
  const out = new Uint8Array(Math.max(1, rows) * LANE_W * 4);
  const sums = new Float32Array(LANE_W + 1);
  const free = new Float32Array(LANE_W * 2);
  for (const pave of paves) {
    const { from, dir, len } = pave.ref;
    const files = [...pave.files].sort((a, b) => a.u - b.u);
    const n = files.length;
    const [lo, hi] = pave.span;
    // Where each file wants to run: its own line, moved over where the
    // next file's is nearer than a body's width and the pavement has the
    // room for it.
    const own = files.map((x) => x.u);
    const want = [...own];
    const apart = n > 1 ? Math.min(GAP + 0.06, (hi - lo) / (n - 1)) : 0;
    for (let i = 1; i < n; i++) want[i] = Math.max(want[i], want[i - 1] + apart);
    for (let i = n - 1; i >= 0; i--) want[i] = Math.min(want[i], i < n - 1 ? want[i + 1] - apart : Math.max(hi, own[i]));
    // What stands on this pavement, in its own frame: along it (stretched,
    // so the bend starts early) and across it (by a body's half width),
    // noted at every point along the walk it reaches.
    const cells = new Array(LANE_W);
    for (const o of solid) {
      const rx = o.x - from[0];
      const rz = o.z - from[1];
      const a = rx * dir[0] + rz * dir[1];
      if (a < -1.2 - EASE || a > len + 1.2 + EASE) continue;
      const u = rx * dir[1] - rz * dir[0];
      if (u < lo - 0.55 - BODY || u > hi + 0.55 + BODY) continue;
      const c = Math.abs(o.cos * dir[0] - o.sin * dir[1]);
      const sn = Math.abs(o.sin * dir[0] + o.cos * dir[1]);
      const ha = o.hx * c + o.hz * sn + EASE;
      const hu = Math.min(o.hx * sn + o.hz * c, 0.55) + BODY;
      if (u + hu < lo || u - hu > hi) continue;
      const k0 = Math.max(0, Math.floor(((a - ha) / len) * LANE_W));
      const k1 = Math.min(LANE_W - 1, Math.ceil(((a + ha) / len) * LANE_W));
      for (let k = k0; k <= k1; k++) (cells[k] ??= []).push([u - hu, u + hu]);
    }
    const at = new Float32Array(n * LANE_W);
    for (let k = 0; k < LANE_W; k++) {
      free[k * 2] = lo;
      free[k * 2 + 1] = hi;
      const blocks = cells[k];
      if (!blocks) continue;
      // Of the free stretches between what stands here, the one that moves
      // the files least and squeezes them least.
      blocks.sort((p, q) => p[0] - q[0]);
      let best = want;
      let least = Infinity;
      let l = lo;
      for (let j = 0; j <= blocks.length; j++) {
        const r = j < blocks.length ? Math.min(hi, blocks[j][0]) : hi;
        if (r - l > 0.02) {
          const x = fit(want, l, r);
          let cost = 0;
          for (let i = 0; i < n; i++) {
            cost += (x[i] - want[i]) ** 2;
            if (i) cost += 12 * Math.max(0, Math.min(GAP, want[i] - want[i - 1]) - (x[i] - x[i - 1])) ** 2;
          }
          if (cost < least) {
            least = cost;
            best = x;
            free[k * 2] = l;
            free[k * 2 + 1] = r;
          }
        }
        if (j < blocks.length) l = Math.max(l, blocks[j][1]);
      }
      for (let i = 0; i < n; i++) at[i * LANE_W + k] = best[i] - want[i];
    }
    // Eased along the walk: two passes of a running mean, together as long
    // as the stretch each block was given.
    const reach = Math.max(1, Math.round(EASE / 2 / (len / LANE_W)));
    for (let i = 0; i < n; i++) {
      const line = at.subarray(i * LANE_W, (i + 1) * LANE_W);
      for (let pass = 0; pass < 2; pass++) {
        for (let k = 0; k < LANE_W; k++) sums[k + 1] = sums[k] + line[k];
        for (let k = 0; k < LANE_W; k++) {
          const k0 = Math.max(0, k - reach);
          const k1 = Math.min(LANE_W - 1, k + reach);
          // Past either end the walk runs straight: nothing stands there.
          line[k] = (sums[k1 + 1] - sums[k0]) / (2 * reach + 1);
        }
      }
      for (let k = 0; k < LANE_W; k++) {
        const o = (files[i].row * LANE_W + k) * 4;
        const x = want[i] + line[k];
        out[o] = Math.round(128 + Math.min(1.27, Math.max(-1.27, x - own[i])) * 100);
        out[o + 1] = Math.round(Math.min(2.55, Math.max(0, x - free[k * 2])) * 100);
        out[o + 2] = Math.round(Math.min(2.55, Math.max(0, free[k * 2 + 1] - x)) * 100);
      }
    }
  }
  return out;
}

const f = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
const v3 = (a) => `vec3(${a.map(f).join(", ")})`;

// In the dark a colour is mostly its own lightness, seen blue: a pink coat in
// an unlit doorway is a dark blue coat, lighter than the trousers under it
// and darker than the face over it.
const BY_NIGHT = /* glsl */ `
  vec3 byNight(vec3 albedo, vec3 light) {
    float dim = 1.0 - smoothstep(0.04, 0.26, max(light.r, max(light.g, light.b)));
    return mix(albedo, dot(albedo, vec3(0.3, 0.5, 0.2)) * vec3(0.8, 0.9, 1.2), 0.62 * dim);
  }
`;

// What both shaders start from: a person's floats, the shared light, and
// where that person is this instant.
const HEAD = /* glsl */ `
  attribute vec4 aWalk;
  attribute vec4 aPath;
  attribute vec4 aBody;
  attribute vec4 aLook;
  attribute vec4 aWear;
  uniform float uMotion;
  uniform vec3 uPal[${PAL.size}];
  uniform sampler2D uLanes;
  uniform float uLaneRows;
  uniform sampler2D uSigns;
  // Where the near figure and the far one trade places and over how wide a
  // band; the same for the far figure and the card.
  uniform vec4 uLod;
  // And the closest figure and the near one.
  uniform vec2 uClose;
  // Whether this pass draws everyone with this mesh, and a pixel's angle.
  uniform vec2 uPass;
  // The rain's own map of the highest thing over every spot (src/world/cover.js).
  uniform sampler2D uCover;
  uniform vec4 uCoverBox;
  uniform vec2 uCoverScale;
  // Free roam's car (src/braindance/roam): where it is (x, z), how far to
  // its side people keep and how far along their walk they start to. All
  // zero, and it is nobody.
  uniform vec4 uAvoid;
  ${COMMON}

  const float STRIDE = ${f(RIG.stride)};

  // (The half keeps a power of two that comes out a hair large from
  // eating the bit above it.)
  float bit(float mask, float k) {
    return mod(floor((mask + 0.5) / exp2(k)), 2.0);
  }
  float rnd(float x) {
    return fract(sin(x * 91.17) * 43758.5453);
  }
  // How long a step is, over the figure's: longer at a quicker pace, and
  // each their own, somebody old's short.
  float strideOf(float pace, float seed, float old) {
    return (0.85 + 0.15 * abs(pace) / 1.3) * (0.92 + 0.16 * rnd(seed * 21.3)) * (1.0 - 0.14 * old);
  }
  // The light of the signs, windows and lamps round a point of the street
  // (src/world/crowd-light.js: the left half of its map), and of what hangs
  // higher (the right half), as much of it as is level with someone whose
  // feet are at y.
  vec3 signsAt(vec2 p) {
    vec2 uv = (p - uSpillBounds.xy) * uSpillBounds.zw;
    vec3 s = texture2D(uSigns, vec2(clamp(uv.x, 0.002, 0.998) * 0.5, uv.y)).rgb;
    return s * s;
  }
  vec3 hungAt(vec2 p, float y) {
    vec2 uv = (p - uSpillBounds.xy) * uSpillBounds.zw;
    vec4 s = texture2D(uSigns, vec2(clamp(uv.x, 0.002, 0.998) * 0.5 + 0.5, uv.y));
    float dh = (s.a * 255.0 - y - 2.0) / 7.0;
    return s.rgb * s.rgb * exp(-dh * dh);
  }
  // The street's light round someone, read a few steps to each side of
  // where they stand: what the brighter side has (key), what the side
  // across from it has (dim), what there is where they are (about), and
  // which way the brighter side is. A roof or a deck takes less of the
  // street under it and what hangs level with it.
  void streetAt(vec3 root, out vec3 key, out vec3 dim, out vec3 about, out vec2 dir) {
    vec2 c = root.xz;
    float low = mix(1.0, 0.35, smoothstep(10.0, 24.0, root.y));
    vec3 e = signsAt(c + vec2(3.0, 0.0)) * low;
    vec3 w = signsAt(c - vec2(3.0, 0.0)) * low;
    vec3 s = signsAt(c + vec2(0.0, 3.0)) * low;
    vec3 n = signsAt(c - vec2(0.0, 3.0)) * low;
    about = signsAt(c) * low;
    if (root.y > 3.0) {
      e += hungAt(c + vec2(3.0, 0.0), root.y);
      w += hungAt(c - vec2(3.0, 0.0), root.y);
      s += hungAt(c + vec2(0.0, 3.0), root.y);
      n += hungAt(c - vec2(0.0, 3.0), root.y);
      about += hungAt(c, root.y);
    }
    // (A sign's own colour counts for as much as its luminance.)
    const vec3 LUM = vec3(0.3, 0.5, 0.2);
    vec2 g = vec2(dot(e - w, LUM) + max(e.r, max(e.g, e.b)) - max(w.r, max(w.g, w.b)), dot(s - n, LUM) + max(s.r, max(s.g, s.b)) - max(n.r, max(n.g, n.b)));
    float gl = length(g);
    dir = gl > 1e-5 ? g / gl : vec2(0.0, 1.0);
    vec2 a = gl > 1e-5 ? abs(g) / (abs(g.x) + abs(g.y)) : vec2(0.5);
    key = (g.x > 0.0 ? e : w) * a.x + (g.y > 0.0 ? s : n) * a.y;
    dim = (g.x > 0.0 ? w : e) * a.x + (g.y > 0.0 ? n : s) * a.y;
  }
  // The night's own light on the side of someone that no sign reaches, cool
  // and from the sky, and along their edge.
  const vec3 FILL = vec3(0.03, 0.05, 0.1);
  const vec3 EDGE = vec3(0.045, 0.08, 0.16);
  // What the street's light does to a person. Its level lights them (a
  // sign's own colour counts for as much as its luminance does: a blue or a
  // magenta tube lights a face, it does not black it out), easing off
  // toward a ceiling so the palest skin under the brightest sign stays skin;
  // its colour is only a wash over their own (a quarter of the way from white,
  // and less where there is little of it: a faint light has no colour to
  // give), so a jacket is still its own colour under a green sign and the
  // trousers, the skin and the hair are still theirs.
  vec3 person(vec3 L) {
    float peak = max(L.r, max(L.g, L.b));
    float level = mix(dot(L, vec3(0.2126, 0.7152, 0.0722)), peak, 0.5);
    level = level < 0.45 ? level : 0.45 + 0.5 * (1.0 - exp((0.45 - level) / 0.5));
    return level * mix(vec3(1.0), L / max(peak, 1e-4), 0.28 * smoothstep(0.03, 0.3, level));
  }
  ${BY_NIGHT}
  // The night's own light where no sign reaches: enough that someone in the
  // dark is a dark blue shape with a face, a jacket and legs, not a hole.
  const vec3 NIGHT = vec3(0.03, 0.04, 0.075);
  // Whether something is overhead where someone stands: a deck, an awning,
  // an arcade. It does not rain there, and nobody holds an umbrella up.
  float coveredAt(vec3 root) {
    vec2 cuv = vec2((root.x - uCoverBox.x) * uCoverBox.z, (uCoverBox.y - root.z) * uCoverBox.w);
    if (uCoverScale.y < 0.5 || cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) return 0.0;
    return step(root.y + 2.3, uCoverScale.x - texture2D(uCover, cuv).r * uCoverScale.y);
  }
  // How high the highest thing over a spot is (the same map), or far under
  // the ground where there is no map.
  float heightAt(vec2 p) {
    vec2 cuv = vec2((p.x - uCoverBox.x) * uCoverBox.z, (uCoverBox.y - p.y) * uCoverBox.w);
    if (uCoverScale.y < 0.5 || cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) return -1e3;
    return uCoverScale.x - texture2D(uCover, cuv).r * uCoverScale.y;
  }
  // A file at a point along it: how far to the side of its line it runs,
  // and the room to move off it toward either side.
  vec3 laneAt(float u, float row) {
    vec3 l = texture2D(uLanes, vec2(u, row)).rgb * 2.55;
    return vec3(l.r - 1.28, l.g, l.b);
  }
  // Where they stand, which way they look, how much of them a walk's end
  // or the lens leaves, how far they have walked, how far the eye is.
  void place(out vec3 root, out vec2 face, out float fade, out float gone, out float eye) {
    float t = uTime * uMotion;
    bool walking = aBody.z < -0.5;
    float way = aWalk.z < 0.0 ? -1.0 : 1.0;
    // (A little ahead of the walk's pace and then behind, by their own drift
    // and in their own time: a pair's the same.)
    gone = walking ? abs(aWalk.z) * t + (0.3 + 0.15 * floor(aWalk.w * 0.5)) * sin(t * 0.21 + fract(aWalk.w * 2.0) * 6.2832) : 0.0;
    // (Someone standing keeps other things where a walker keeps a pace, a
    // step and a place along the walk.)
    float s = walking ? mod(aPath.w + way * gone, aPath.z) : 0.0;
    if (!walking) way = 1.0;
    face = aPath.xy * way;
    vec2 at = aWalk.xy + aPath.xy * s;
    fade = 1.0;
    // The eye is one more thing on the pavement: nobody walks into it. Only
    // an eye among them counts, not one on a roof or in the air.
    // The ground under them: a stander's own, a walker's pavement.
    float ground = walking && aBody.w < 0.0 ? ${f(PAVE_Y)} : aBody.w;
    float among = smoothstep(-1.2, -0.4, uCam.y - ground) * (1.0 - smoothstep(2.6, 3.4, uCam.y - ground));
    float brolly = ${f(BROLLY)} * bit(aLook.x, ${f(TAG.umbrella)});
    vec2 rel = at - uCam.xz;
    // (Someone standing is at no walk's end: whole however far off.)
    float ends = 1e3;
    if (walking) {
      // Along the walk their file bends round what stands in it.
      float row = (-aBody.z - 0.5) / uLaneRows;
      float u = s / aPath.z;
      vec3 lane = laneAt(u, row);
      float o0 = lane.x;
      float o1 = laneAt(u + 0.6 / aPath.z, row).x;
      vec2 across = vec2(aPath.y, -aPath.x);
      // Where the walk meets the south street they turn out onto its
      // painted crossing and go over at the road's own height.
      if (aBody.w < 0.0) {
        float aside = aBody.w > -1.5 ? ${f(MOUTH.out)} : ${f(-MOUTH.out)};
        o0 += aside * (smoothstep(${f(MOUTH.turn[0])}, ${f(MOUTH.turn[1])}, s) - smoothstep(${f(MOUTH.back[0])}, ${f(MOUTH.back[1])}, s));
        o1 += aside * (smoothstep(${f(MOUTH.turn[0])}, ${f(MOUTH.turn[1])}, s + 0.6) - smoothstep(${f(MOUTH.back[0])}, ${f(MOUTH.back[1])}, s + 0.6));
        ground *= 1.0 - smoothstep(${f(MOUTH.road[0] - 0.15)}, ${f(MOUTH.road[0] + 0.15)}, s) + smoothstep(${f(MOUTH.road[1] - 0.15)}, ${f(MOUTH.road[1] + 0.15)}, s);
      }
      at += across * o0;
      // And round the eye: a few steps short of it everyone moves to the
      // side of it they are on (or, heading straight for it, to the side
      // with more room), as far as the pavement lets them, and passes a
      // metre clear: further off than an arm's length by the time the
      // frame's edge cuts them.
      rel = at - uCam.xz;
      float al = dot(rel, aPath.xy);
      float la = dot(rel, across);
      float sgn = la + clamp((lane.z - lane.y) * 0.5, -0.45, 0.45) + (aLook.w - 0.5) * 0.1 < 0.0 ? -1.0 : 1.0;
      float m = sgn * la;
      float k = sgn * among * min(m > 0.0 ? (${f(CLEAR)} + brolly) * max(1.0 - m / ${f(CLEAR_REACH)}, 0.0) : ${f(CLEAR)} + brolly - m, sgn > 0.0 ? lane.z : lane.y);
      float b0 = 1.0 - smoothstep(1.4, 4.6, abs(al));
      float b1 = 1.0 - smoothstep(1.4, 4.6, abs(al + 0.6));
      at += across * k * b0;
      face = normalize(aPath.xy + across * (o1 - o0 + k * (b1 - b0)) / 0.6) * way;
      ends = min(s, aPath.z - s);
      // Free roam's car: everyone in its way steps to the side of it they
      // are on, clear of its flank, pavement or no.
      if (uAvoid.z > 0.0) {
        vec2 car = at - uAvoid.xy;
        float side = dot(car, across);
        at += across * (side < 0.0 ? -1.0 : 1.0) * max(uAvoid.z - abs(side), 0.0) * (1.0 - smoothstep(uAvoid.w, uAvoid.w + 3.0, abs(dot(car, aPath.xy))));
      }
    } else if (aBody.z < 1.5 || (aBody.z > 6.5 && aBody.z < 7.5) || (aBody.z > ${f(POSES.indexOf("queue") - 0.5)} && aBody.z < ${f(POSES.indexOf("queue") + 0.5)})) {
      // Standing with nothing to keep them where they are (not on a seat,
      // against a wall, behind a stall or over a phone), they step back
      // from an eye that comes within reach.
      // (Two metres off they have not moved; with the eye where they stood
      // they are a pace and a half away.)
      float d = length(rel) + 1e-4;
      at += rel / d * max(${f(BACK)} + brolly - d * ${f(BACK / 2)}, 0.0) * among;
      // And back from free roam's car.
      vec2 car = at - uAvoid.xy;
      at += car / (length(car) + 1e-4) * max(uAvoid.z - length(car), 0.0);
    }
    // Nobody free to choose stands looking at a blank wall a step off: idle,
    // on a phone or smoking, they turn their back to it, unless what is in
    // front of them is lit brighter than the street behind (a shop's
    // window); and whoever leans on a wall has their back to it. (A wall is
    // something standing far over them a step ahead and not over them, nor
    // the same a step behind: an awning or a deck is over them too, and a
    // wall they stand along is to both sides.)
    if (!walking && (aBody.z < 0.5 || abs(aBody.z - 2.0) < 0.5 || abs(aBody.z - 4.0) < 0.5 || abs(aBody.z - 7.0) < 0.5)) {
      float here = heightAt(at) + 1.5;
      float ahead = max(heightAt(at + face * 0.7), heightAt(at + face * 1.1));
      float behind = max(heightAt(at - face * 0.7), heightAt(at - face * 1.1));
      bool wall = ahead > ground + 3.0 && ahead > here;
      bool back = behind > ground + 3.0 && behind > here;
      float shop = dot(signsAt(at + face * 1.5), vec3(0.3, 0.5, 0.2));
      float street = dot(signsAt(at - face * 1.5), vec3(0.3, 0.5, 0.2));
      if (wall && !back && (abs(aBody.z - 2.0) < 0.5 || shop < street * 1.3 + 0.002)) face = -face;
    }
    root = vec3(at.x, ground, at.y);
    eye = distance(uCam, vec3(root.x, clamp(uCam.y, root.y, root.y + 1.8 * aBody.x + brolly), root.z));
    // Where a walk's loop starts again they come and go through a dither:
    // over a few steps far off, where it reads as a fade, and all but at
    // once close to, where a body half there would read as a fault.
    fade = clamp(ends / mix(0.25, 3.0, smoothstep(14.0, 40.0, eye)), 0.0, 1.0);
    // The one who cannot move out of the lens (on a seat, against a wall,
    // on a pavement with no room) is gone before they fill it, whole, with
    // whatever they hold: a lens is never inside a head or an umbrella.
    fade *= step(${f(NEAREST)} + brolly, eye);
  }
`;

const VERTEX = /* glsl */ `
  attribute vec4 aRig;
  uniform vec4 uPose[${POSES.length * 5}];
  varying vec3 vColor;
  varying vec2 vFade;
  ${HEAD}

  const float HIP_Y = ${f(RIG.hipY)};
  const float KNEE_Y = ${f(RIG.kneeY)};
  const float ANKLE_Y = ${f(RIG.ankleY)};
  const float THIGH = ${f(RIG.thigh)};
  const float SHIN = ${f(RIG.shin)};

  // Forward by a about the x axis through o: what hangs swings toward +z.
  void swing(inout vec3 p, inout vec3 n, vec3 o, float a) {
    float c = cos(a);
    float s = sin(a);
    p -= o;
    p.yz = vec2(p.y * c + p.z * s, -p.y * s + p.z * c);
    p += o;
    n.yz = vec2(n.y * c + n.z * s, -n.y * s + n.z * c);
  }
  // About the vertical through o: what looks toward +z turns toward +x.
  void turn(inout vec3 p, inout vec3 n, vec3 o, float a) {
    float c = cos(a);
    float s = sin(a);
    p -= o;
    p.xz = vec2(p.x * c + p.z * s, -p.x * s + p.z * c);
    p += o;
    n.xz = vec2(n.x * c + n.z * s, -n.x * s + n.z * c);
  }
  // About the z axis through o: what hangs lifts toward +x.
  void lift(inout vec3 p, inout vec3 n, vec3 o, float a) {
    float c = cos(a);
    float s = sin(a);
    p -= o;
    p.xy = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    p += o;
    n.xy = vec2(n.x * c - n.y * s, n.x * s + n.y * c);
  }
  // An arm with nothing to do, one of five ways (shoulder forward, out,
  // elbow, forearm turned in): a hand in a pocket, folded across the chest
  // with the other, a hand on the hip, at the strap of a bag, a phone held
  // to the ear.
  vec4 armAt(float kind, float side) {
    if (kind < 1.5) return vec4(-0.1, 0.07, 0.62, 0.3);
    if (kind < 2.5) return side < 0.0 ? vec4(0.3, 0.03, 1.27, 1.3) : vec4(0.35, 0.03, 1.42, 1.32);
    if (kind < 3.5) return vec4(-0.15, 0.5, 1.3, 1.4);
    if (kind < 4.5) return vec4(0.28, 0.05, 2.2, 0.45);
    return vec4(0.62, 0.34, 2.46, 0.16);
  }
  // A walking leg's ankle: how far ahead of the hip, how far off the
  // ground, and the foot's tilt (toes up). u is the leg's place in its cycle:
  // from 0 the foot is down, coming back under the body exactly as fast as
  // the body goes forward (heel first, then flat, then up on its ball);
  // from a half it is in the air, swinging through to the next footfall. q
  // is half a step.
  vec3 footfall(float u, float q) {
    // The ankle's shift and rise with the foot up on its ball, and with it
    // down on its heel.
    const vec2 BALL = vec2(0.0754, 0.0655);
    const vec2 HEEL = vec2(0.0195, 0.0151);
    if (u < 0.5) {
      float w = u * 2.0;
      float up = 0.26 * (1.0 - smoothstep(0.0, 0.16, w));
      float off = 0.62 * smoothstep(0.55, 1.0, w);
      float z = q * (1.0 - 2.0 * w) - (0.085 * sin(up) - 0.07 * (1.0 - cos(up))) + 0.085 * sin(off) + 0.14 * (1.0 - cos(off));
      float y = ANKLE_Y + 0.085 * (cos(up) - 1.0) + 0.07 * sin(up) + 0.085 * (cos(off) - 1.0) + 0.14 * sin(off);
      return vec3(z, y, up - off);
    }
    float w = u * 2.0 - 1.0;
    float w2 = w * w;
    float w3 = w2 * w;
    float z0 = -q + BALL.x;
    float z1 = q - HEEL.x;
    float m = -2.0 * q;
    float z = (2.0 * w3 - 3.0 * w2 + 1.0) * z0 + (w3 - 2.0 * w2 + w) * m + (3.0 * w2 - 2.0 * w3) * z1 + (w3 - w2) * m;
    float e = w2 * (3.0 - 2.0 * w);
    float y = ANKLE_Y + mix(BALL.y, HEEL.y, e) + 0.055 * sin(3.14159 * w);
    return vec3(z, y, mix(-0.62, 0.26, e));
  }

  void main() {
    // What this person does not wear folds away to nothing. (The closest
    // figure's ways of wearing hair are dealt by the person's seed, to
    // whoever has hair with any length to it and nothing over it.)
    float tag = aRig.z;
    float side = position.x < 0.0 ? -1.0 : 1.0;
    // One arm a machine (which one is the person's own): that side's upper
    // arm, forearm and hand, and the sleeve's stripe is its seam of light.
    bool machine = bit(aLook.y, 10.0) > 0.5 && side * (rnd(aLook.w * 23.7) - 0.5) > 0.0 && aRig.x > 2.5 && aRig.x < 4.5;
    bool worn = tag < 0.5 || bit(aLook.x, tag) > 0.5 || (machine && abs(tag - ${f(TAG.trim)}) < 0.5);
    if (tag > ${f(CARRIED - 0.5)}) worn = abs(aBody.z - ${f(POSES.indexOf("carry"))}) < 0.5;
    // An umbrella's edge is a line of light only on the few that have one.
    else if (int(aRig.y + 0.5) == ${PART.rim} && bit(aLook.y, 14.0) < 0.5) worn = false;
    else if (tag > 31.5) worn = bit(aLook.x, ${f(TAG.hair)}) > 0.5 && bit(aLook.y, 2.0) + bit(aLook.y, 3.0) + bit(aLook.x, ${f(TAG.hardhat)}) < 0.5 && abs(floor(rnd(aLook.w * 17.1) * 3.0) + ${f(STYLE.parted)} - tag) < 0.5;
    if (!worn) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vColor = vec3(0.0);
      vFade = vec2(-1.0, 2.0);
      return;
    }
    float seg = aRig.x;
    float aux = aRig.w;
    int part = int(aRig.y + 0.5);
    float t = uTime * uMotion;
    float h = aBody.x;
    float seed = aLook.w;
    bool walking = aBody.z < -0.5;
    // A child; somebody old.
    float kid = bit(aLook.y, 12.0);
    float old = bit(aLook.y, 13.0);
    float umbrella = bit(aLook.x, ${f(TAG.umbrella)});
    float phoneUp = bit(aLook.x, ${f(TAG.phone)});

    float pace = aWalk.z;
    vec3 root;
    vec2 face;
    float fade;
    float gone;
    float eye;
    place(root, face, fade, gone, eye);
    // Standing under cover they have put the umbrella away (a walker passing
    // under an awning keeps theirs up, as people do).
    if (umbrella > 0.5 && !walking && coveredAt(root) > 0.5) {
      umbrella = 0.0;
      if (tag > ${f(TAG.umbrella - 0.5)} && tag < ${f(TAG.umbrella + 0.5)}) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vColor = vec3(0.0);
        vFade = vec2(-1.0, 2.0);
        return;
      }
    }

    // The joints: the hips' drop, the lean back about the heels, the chest's
    // pitch and turn, the hips' turn, the head's nod and turn; this side's
    // hip, knee and ankle; this side's shoulder (forward, out), elbow and
    // forearm turned in.
    float drop = 0.0;
    float lean = 0.0;
    float pitch = 0.0;
    float twist = 0.0;
    float hips = 0.0;
    float nod = 0.0;
    float gaze = 0.0;
    float back = 0.0;
    float hip = 0.0;
    float knee = 0.0;
    float ankle = 0.0;
    float sp = 0.0;
    float sr = 0.0;
    float el = 0.0;
    float inw = 0.0;
    float drag = 0.0;
    // Standing: the pelvis over one leg, the chest leaning back over it, the
    // legs apart, the free leg's heel off the ground, the chest's rise with
    // a breath.
    float shift = 0.0;
    float tilt = 0.0;
    float splay = 0.0;
    float heel = 0.0;
    float rise = 0.0;
    if (walking) {
      // A longer step at a quicker pace; the step's phase is how far they
      // have gone, so a planted foot stays planted.
      float reach = strideOf(pace, seed, old);
      float q = STRIDE * 0.25 * reach;
      float ph = gone / (STRIDE * reach * h) + aWalk.w;
      float c = cos(6.2832 * ph);
      // Lowest with both feet down, highest over the standing leg; some
      // bob more than others, a child most.
      drop = mix(0.048, 0.012, 0.5 - 0.5 * cos(12.5664 * ph)) * (0.75 + 0.6 * rnd(seed * 31.7) + 0.3 * kid);
      vec3 fall = footfall(fract(ph + (side > 0.0 ? 0.5 : 0.0)), q);
      vec2 T = vec2(fall.x, fall.y - (HIP_Y - drop));
      float d = min(length(T), THIGH + SHIN - 0.004);
      knee = 3.14159 - acos(clamp((THIGH * THIGH + SHIN * SHIN - d * d) / (2.0 * THIGH * SHIN), -1.0, 1.0));
      hip = atan(T.x, -T.y) + acos(clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2.0 * THIGH * d), -1.0, 1.0));
      ankle = fall.z + knee - hip;
      // Arms against the legs, shoulders against the hips, the head held
      // to the way they go.
      // Each their own walk: how far the arms swing (somebody old hardly,
      // a child freely), how much the hips go side to side and the weight
      // over each foot, how far forward they carry themselves (somebody old
      // stooped, the head out ahead).
      float amp = (0.34 + 0.26 * rnd(seed * 3.1)) * (1.0 - 0.5 * old + 0.25 * kid);
      float sway = 0.6 + 1.2 * rnd(seed * 37.1);
      sp = side * amp * c + 0.04;
      el = 0.22 + 0.32 * (0.5 + 0.5 * side * c) + 0.25 * old;
      sr = 0.035;
      inw = 0.12;
      twist = -0.09 * c;
      hips = 0.05 * c * sway;
      shift = 0.012 * c * sway;
      gaze = 0.075 * c;
      pitch = 0.04 + 0.05 * rnd(seed * 5.7) + 0.16 * old - 0.03 * kid;
      nod = 0.03 + 0.12 * old;
      // Some walk with their hands in their pockets.
      if (rnd(seed * 29.3) > 0.86 && kid < 0.5) {
        vec4 pocket = armAt(1.0, side);
        sp = pocket.x + 0.03 * side * c;
        sr = pocket.y;
        el = pocket.z;
        inw = pocket.w;
      }
      // Now and then a look at a window they pass.
      gaze += 0.5 * smoothstep(0.55, 0.9, sin(t * 0.17 + seed * 50.0)) * (rnd(seed * 9.1) > 0.5 ? 1.0 : -1.0);
      if (side < 0.0 && bit(aLook.x, ${f(TAG.tote)}) > 0.5) {
        sp *= 0.3;
        el = 0.08;
      }
      if (side > 0.0 && phoneUp > 0.5 && umbrella < 0.5) {
        sp = ${f(HOLD.phone.pitch)};
        sr = ${f(HOLD.phone.roll)};
        el = ${f(HOLD.phone.elbow)};
        inw = ${f(HOLD.phone.inward)};
      }
      nod += 0.3 * phoneUp;
    } else {
      int k = int(aBody.z + 0.5) * 5;
      vec4 A = uPose[k];
      vec4 B = uPose[k + 1];
      vec4 C = side < 0.0 ? uPose[k + 2] : uPose[k + 3];
      vec4 D = uPose[k + 4];
      // The pose, and this person's own way of standing in it (crowd.js
      // deals it): what each idle hand does, where the weight is, which leg
      // is the pose's bent one, where the head is turned.
      float manner = aWalk.z;
      float idle = mod(floor(manner / (side < 0.0 ? 1.0 : 6.0)), 6.0);
      float stance = mod(floor(manner / 36.0), 4.0);
      float leg = mod(floor(manner / 144.0), 2.0) > 0.5 ? -side : side;
      float head = mod(floor(manner / 288.0), 4.0);
      drop = A.x;
      lean = A.y;
      pitch = A.z;
      nod = A.w + (head > 2.5 ? 0.24 : 0.0);
      hip = leg < 0.0 ? B.x : B.z;
      knee = leg < 0.0 ? B.y : B.w;
      if (idle > 0.5) C = armAt(idle, side);
      sp = C.x;
      sr = C.y;
      el = C.z;
      inw = C.w;
      gaze = D.y + aPath.w + (head > 0.5 && head < 2.5 ? (head < 1.5 ? -0.42 : 0.42) : 0.0);
      back = D.z;
      // Nobody stands still: the weight shifts, a breath lifts the chest, a
      // look round; a talker's hands, a cigarette to the mouth, a vendor's
      // hands, a thumb.
      float tt = t + seed * 100.0;
      rise = 0.004 * sin(tt * 1.45);
      lean += 0.012 * sin(tt * 0.5);
      pitch += 0.008 * sin(tt * 1.3);
      gaze += (aPath.w == 0.0 && D.x < 0.5 ? 0.4 : 0.14) * sin(tt * 0.23) * smoothstep(0.2, 0.9, sin(tt * 0.071 + 1.0));
      if (stance > 0.5 && stance < 2.5) {
        // On one leg: the other knee eases, its heel lifts, and the weight
        // comes back toward the middle and goes out again, slowly.
        float to = stance < 1.5 ? -1.0 : 1.0;
        float much = 0.8 + 0.2 * sin(tt * 0.19);
        shift = 0.034 * to * much;
        tilt = 0.05 * to * much;
        if (side * to < 0.0) {
          hip += 0.17 * much;
          knee += 0.36 * much;
          heel = 0.14 * much;
        }
      } else if (stance > 2.5) splay = 0.055;
      if (D.x > 0.5 && D.x < 1.5) {
        // Talking by turns (the two of a pair are half a turn apart): whose
        // turn it is talks with a hand, or both; the other listens with
        // theirs at rest, and nods now and then.
        float say = smoothstep(0.1, 0.5, sin(t * 0.3 + aWalk.w * 6.2832));
        float mine = say * (side > 0.0 ? step(idle, 4.5) : step(0.55, rnd(seed * 4.3)) * step(idle, 2.5) * (1.0 - bit(aLook.x, ${f(TAG.tote)})));
        if (umbrella > 0.5 && side > 0.0) mine = 0.0;
        sp = mix(sp, (side > 0.0 ? 0.38 : 0.26) + 0.12 * sin(tt * 1.3 + side), mine);
        sr = mix(sr, 0.14, mine);
        el = mix(el, (side > 0.0 ? 1.5 : 1.3) + 0.32 * sin(tt * 2.1 + side * 1.3) * (0.5 + 0.5 * sin(tt * 0.37)), mine);
        inw = mix(inw, 0.27, mine);
        nod += 0.06 * sin(tt * 1.7) * say + 0.07 * (1.0 - say) * smoothstep(0.55, 1.0, sin(tt * 0.83));
        pitch += 0.035 * say;
      } else if (D.x > 1.5 && D.x < 2.5) {
        float cyc = fract(tt / 9.0);
        drag = smoothstep(0.0, 0.1, cyc) - smoothstep(0.28, 0.4, cyc);
        if (side > 0.0) {
          sp = mix(sp, 0.75, drag);
          el = mix(el, 2.35, drag);
          inw = mix(inw, 0.55, drag);
        }
      } else if (D.x > 2.5 && D.x < 3.5) {
        el += 0.2 * sin(tt * 1.6 + side);
        sp += 0.1 * sin(tt * 1.1 + side * 2.0);
        twist = 0.15 * sin(tt * 0.4);
      } else if (D.x > 3.5) {
        el += 0.03 * sin(tt * 3.0);
        nod += 0.03 * sin(tt * 0.6);
      }
      // Somebody old stands a little bowed, knees soft.
      if (old > 0.5 && A.x < 0.05) {
        pitch += 0.13;
        nod += 0.08;
        hip += 0.05;
        knee += 0.1;
      }
      ankle = knee - hip - lean + heel;
      // Lying down, a straight leg's foot points up, not along the ground.
      if (lean > 1.0 && knee < 0.5) ankle += 1.3;
    }
    if (side > 0.0 && umbrella > 0.5) {
      sp = ${f(HOLD.umbrella.pitch)};
      sr = ${f(HOLD.umbrella.roll)};
      el = ${f(HOLD.umbrella.elbow)};
      inw = ${f(HOLD.umbrella.inward)};
    }
    // Arms hang from the shoulder, clear of a long coat's skirt.
    sr += 0.04 * bit(aLook.x, ${f(TAG.skirt)});
    // A cup is carried level, the forearm out in front.
    if (side < 0.0 && bit(aLook.x, ${f(TAG.cup)}) > 0.5) {
      sp = ${f(HOLD.cup.pitch)} + 0.02 * sin(t * 0.7 + seed * 30.0);
      sr = ${f(HOLD.cup.roll)};
      el = ${f(HOLD.cup.elbow)};
      inw = ${f(HOLD.cup.inward)};
    }

    // The figure as built, then made this person's: their build, a puffer's
    // swell, more or less hair, and the lit things kept from falling between
    // pixels far off.
    vec3 p = position;
    // The normal's length is the shade the figure was built with: a socket,
    // an armpit, the inside of a hood.
    float shade = length(normal);
    vec3 n = normal / shade;
    float wide = aBody.y;
    float garment = mod(aLook.y, 4.0);
    float px = uPass.y * eye / h;
    // Broad in the shoulder or broad in the hip, a little, by the person.
    float frame = rnd(seed * 11.3) * 2.0 - 1.0;
    // (Square in the shoulder: a grown-up's are a little wider than built.)
    float shoulderX = side * ${f(RIG.shoulderX)} * (1.0 + (wide - 1.0) * 0.9) * (1.0 + 0.1 * frame) * (1.0 + 0.05 * (1.0 - kid));
    float elbowX = shoulderX + side * ${f(RIG.elbowX - RIG.shoulderX)} * wide;
    if (part == ${PART.rim}) p.y += aux * max(0.75 * px - ${f(RIM_HALF)}, 0.0);
    else if (part == ${PART.phone}) p = ${v3(PHONE_AT)} + (p - ${v3(PHONE_AT)}) * clamp(1.3 * px / 0.036, 1.0, 5.0);
    else if (part == ${PART.ember}) p = ${v3(EMBER_AT)} + (p - ${v3(EMBER_AT)}) * clamp(px / 0.006, 1.0, 6.0);
    // Long and lean, as the street's people are: legs and arms slimmer than
    // built, the head smaller, the body narrow at the waist and square at
    // the shoulders.
    if (seg > 4.5) {
      float ax = side * ${f(RIG.hipX)};
      p.x = ax + (p.x - ax) * wide * 0.9;
      p.z *= wide * 0.9;
    } else if (seg > 2.5) {
      float ax = side * ${f(RIG.shoulderX)};
      if (garment > 1.5 && garment < 2.5 && part == ${PART.sleeve} && !machine) p.xz += normalize(p.xz - vec2(ax, 0.0) + 1e-5) * 0.014 * aux;
      // A machine's arm is slimmer than one in a sleeve.
      float slim = machine ? 0.8 : 0.93;
      p.x = shoulderX + (p.x - ax) * wide * slim;
      p.z *= wide * slim;
    } else if (seg > 1.5) {
      if ((part == ${PART.scalp} || (tag > 31.5 && tag < ${f(CARRIED - 0.5)})) && bit(aLook.x, ${f(TAG.hardhat)}) < 0.5) p = vec3(0.0, 1.68, -0.01) + (p - vec3(0.0, 1.68, -0.01)) * (1.0 + 0.16 * aux * rnd(seed * 7.3) * rnd(seed * 2.9));
      // A head is not much smaller on a short person, nor wider on a broad;
      // a grown-up's is an eighth of them or a little over, a child's a
      // sixth.
      p = vec3(0.0, ${f(RIG.headY)}, 0.0) + (p - vec3(0.0, ${f(RIG.headY)}, 0.0)) * (pow(h, -0.35) * (0.92 + 0.08 * kid) + 1.1 * max(0.86 - h, 0.0));
      p.xz *= mix(1.0, wide, 0.3);
    } else if ((tag < ${f(TAG.umbrella - 0.5)} || tag > ${f(TAG.umbrella + 0.5)}) && tag < ${f(CARRIED - 0.5)}) {
      if (garment > 1.5 && garment < 2.5 && part == ${PART.jacket}) p.xz += normalize(p.xz + 1e-5) * 0.024 * aux;
      p.x *= wide * (1.0 + 0.1 * frame * (smoothstep(1.1, 1.35, p.y) - 1.0 + smoothstep(0.95, 1.15, p.y)));
      if (kid < 0.5) p.x *= 1.0 + 0.05 * smoothstep(1.25, 1.4, p.y) + 0.1 * smoothstep(1.4, 1.44, p.y) * (1.0 - smoothstep(1.455, 1.475, p.y)) - 0.075 * exp(-pow((p.y - 1.06) / 0.08, 2.0));
      p.z *= mix(1.0, wide, 0.85) * 0.93;
      // A paunch on some, under the jacket's front, and on everyone heavy.
      p.z += max(p.z, 0.0) * 9.0 * min(max(rnd(seed * 13.7) - 0.62, 0.0) * 0.2 + max(wide - 1.12, 0.0) * 0.22, 0.08) * smoothstep(0.86, 1.02, p.y) * (1.0 - smoothstep(1.12, 1.34, p.y));
      // A coat's skirt goes with the leg under it; a long one on past the
      // knee to the calf, wider at the hem, and further with the leg.
      float calf = part == ${PART.coat} ? bit(aLook.y, 11.0) : 0.0;
      p.y = 0.93 - (0.93 - p.y) * (1.0 + 0.5 * calf);
      p.xz *= 1.0 + 0.08 * aux * calf;
      if (part == ${PART.coat}) p.z += aux * (0.3 + 0.14 * calf) * sin(hip);
    }

    // Each segment about its joint, from the far end in.
    if (seg > 4.5) {
      if (seg > 6.5) swing(p, n, vec3(0.0, ANKLE_Y, 0.0), ankle);
      if (seg > 5.5) swing(p, n, vec3(0.0, KNEE_Y, 0.0), -knee);
      swing(p, n, vec3(0.0, HIP_Y, 0.0), hip);
      // The pelvis has moved over one leg: both lean back under it, so the
      // feet stay where they were. Or they stand apart.
      lift(p, n, vec3(side * ${f(RIG.hipX)}, HIP_Y, 0.0), side * splay - shift / (HIP_Y - ANKLE_Y));
    } else if (seg > 2.5) {
      vec3 shoulder = vec3(shoulderX, ${f(RIG.shoulderY)}, 0.0);
      if (seg > 3.5) {
        vec3 elbow = vec3(elbowX, ${f(RIG.elbowY)}, 0.0);
        swing(p, n, elbow, el);
        turn(p, n, elbow, -side * inw);
      }
      lift(p, n, shoulder, side * sr);
      swing(p, n, shoulder, sp);
    }
    if (seg > 0.5 && seg < 4.5) {
      if (seg > 1.5 && seg < 2.5) {
        vec3 neck = vec3(0.0, ${f(RIG.headY)}, 0.0);
        turn(p, n, neck, gaze);
        swing(p, n, neck, -nod);
      }
      turn(p, n, vec3(0.0), twist);
      swing(p, n, vec3(0.0, ${f(RIG.waistY)}, 0.0), -pitch);
      lift(p, n, vec3(0.0, ${f(RIG.waistY)}, 0.0), tilt);
      p.y += rise * smoothstep(1.05, 1.4, p.y);
    }
    turn(p, n, vec3(0.0), hips);
    p.x += shift;
    p.y -= drop;
    p.z += back;
    swing(p, n, vec3(0.0), lean);
    float tall = p.y;
    p *= h;
    vec3 world = root + vec3(face.y * p.x + face.x * p.z, p.y, face.y * p.z - face.x * p.x);
    vec3 N = normalize(vec3(face.y * n.x + face.x * n.z, n.y, face.y * n.z - face.x * n.x));

    // What it is made of.
    float flags = aLook.y;
    vec3 jacket = uPal[${PAL.jacket} + int(aWear.x + 0.5)];
    vec3 skin = uPal[${PAL.skin} + int(aWear.z + 0.5)];
    vec3 hair = uPal[${PAL.hair} + int(aWear.w + 0.5)];
    vec3 tint = uPal[${PAL.rim} + int(mod(aLook.z, 4.0) + 0.5)];
    // An umbrella's lit edge is one of the neon colours, never the white.
    float led = bit(aLook.y, 14.0);
    vec3 edge = abs(mod(aLook.z, 4.0) - 2.0) < 0.5 ? uPal[${PAL.rim}] : tint;
    vec3 carried = uPal[${PAL.bag} + int(floor(aLook.z / 4.0) + 0.5)];
    // What is under the jacket: a shirt, or the hoodie whose hood is up.
    vec3 shirt = uPal[${PAL.shirt} + int(floor(aWear.y / 8.0) + 0.5)];
    vec3 albedo = jacket;
    vec3 lit = vec3(0.0);
    float glow = 0.0;
    // How much of a shine it has in the wet: cloth a little, a visor a lot.
    float gloss = 0.12;
    if (part == ${PART.skin}) albedo = skin;
    else if (part == ${PART.hair}) albedo = hair;
    else if (part == ${PART.scalp}) {
      // Hair, a hat's dome, a shaved head's shadow; on the far figure, whose
      // head is one piece, a hood too, or nothing.
      albedo = bit(flags, 2.0) > 0.5 ? carried * 0.78 : bit(flags, 3.0) > 0.5 ? mix(skin, hair, 0.72) : hair;
      #ifndef NEAR
      if (bit(aLook.x, ${f(TAG.hardhat)}) > 0.5) albedo = uPal[${PAL.helmet} + int(mod(floor(aLook.z / 4.0), 3.0) + 0.5)];
      else if (bit(aLook.x, ${f(TAG.hair)}) < 0.5) albedo = bit(aLook.x, ${f(TAG.hood)}) > 0.5 ? shirt : mix(skin, hair, 0.72);
      #endif
    }
    else if (part == ${PART.sleeve}) {
      // A vest's arms are bare, or a shirt's.
      if (garment > 2.5) albedo = bit(flags, 5.0) > 0.5 ? skin : shirt;
    }
    // A cuff a shade darker than its sleeve; on a bare arm, a band.
    else if (part == ${PART.cuff}) albedo = garment > 2.5 && bit(flags, 5.0) > 0.5 ? vec3(0.02) + tint * 0.08 : (garment > 2.5 ? shirt : jacket) * 0.72;
    // A hood is the hoodie's under the jacket, and so is the collar at the
    // throat; a collar turned up and a lapel are the jacket's own.
    else if (part == ${PART.hood}) albedo = shirt * 0.92;
    else if (part == ${PART.lapel}) albedo = jacket * 0.76 + 0.006;
    else if (part == ${PART.seam}) albedo = jacket * 0.4;
    else if (part == ${PART.shirt}) albedo = shirt;
    else if (part == ${PART.tie}) albedo = tint * 0.4 + 0.012;
    else if (part == ${PART.band}) { albedo = vec3(0.6, 0.62, 0.58); gloss = 1.1; }
    else if (part == ${PART.helmet}) { albedo = uPal[${PAL.helmet} + int(mod(floor(aLook.z / 4.0), 3.0) + 0.5)]; gloss = 0.55; }
    else if (part == ${PART.socket}) albedo = skin * 0.62;
    else if (part == ${PART.trousers}) albedo = uPal[${PAL.trousers} + int(mod(aWear.y, 8.0) + 0.5)];
    else if (part == ${PART.stitch}) albedo = uPal[${PAL.trousers} + int(mod(aWear.y, 8.0) + 0.5)] * 0.5;
    else if (part == ${PART.shoe}) { albedo = bit(flags, 6.0) > 0.5 ? vec3(0.42, 0.42, 0.4) : vec3(0.04, 0.04, 0.05); gloss = 0.16; }
    // A sole and laces of the other tone: pale under a dark shoe, dark under a pale one.
    else if (part == ${PART.sole}) albedo = bit(flags, 6.0) > 0.5 ? vec3(0.05, 0.05, 0.06) : vec3(0.3, 0.3, 0.28);
    else if (part == ${PART.bag}) albedo = carried;
    else if (part == ${PART.brim}) albedo = carried * 0.78;
    else if (part == ${PART.tote}) albedo = uPal[${PAL.bag} + int(mod(floor(aLook.z / 4.0) + 3.0, 6.0) + 0.5)];
    else if (part == ${PART.dark}) { albedo = vec3(0.015); gloss = 0.5; }
    else if (part == ${PART.crate}) albedo = vec3(0.3, 0.21, 0.11);
    else if (part == ${PART.canopy}) {
      // Its cloth: one colour; two in turns, gore by gore (a gore's normal
      // leans toward its own middle, so its edge says which it is too); a
      // band of another colour at the edge; or clear, which at night is
      // dark and all shine.
      float kind = mod(floor(flags / 128.0), 4.0);
      float k = mod(floor(flags / 32768.0), 8.0);
      vec3 cloth = uPal[${PAL.canopy} + int(k + 0.5)];
      vec3 other = uPal[${PAL.canopy} + int(mod(k + 4.0, 8.0) + 0.5)];
      float gore = floor(mod(atan(normal.z, normal.x) / 0.7854 + 8.0, 8.0));
      albedo = cloth;
      gloss = 0.7;
      if (kind > 0.5 && kind < 1.5) albedo = mod(gore, 2.0) > 0.5 ? cloth : other;
      else if (kind > 1.5 && kind < 2.5) albedo = mix(cloth, other, smoothstep(0.55, 0.95, aux));
      else if (kind > 2.5) { albedo = vec3(0.035, 0.04, 0.05); gloss = 1.5; }
    }
    else if (part == ${PART.sclera}) { albedo = vec3(0.4, 0.4, 0.38); gloss = 0.3; }
    else if (part == ${PART.line}) albedo = skin * 0.16;
    else if (part == ${PART.flap}) albedo = carried * 0.5 + 0.01;
    else if (part == ${PART.metal}) { albedo = vec3(0.13, 0.14, 0.16); gloss = 0.9; }
    else if (part == ${PART.visor}) { albedo = vec3(0.012) + tint * 0.05; gloss = 1.6; }
    else if (part == ${PART.paper}) albedo = vec3(0.5);
    else if (part == ${PART.brow}) albedo = hair * 0.7;
    else if (part == ${PART.mouth}) albedo = skin * vec3(0.55, 0.35, 0.35);
    else if (part == ${PART.eye}) {
      albedo = skin * 0.08;
      if (bit(flags, 4.0) > 0.5) { lit = tint * 1.3; glow = 1.0; }
    }
    else if (part == ${PART.rim}) { lit = edge * 1.8 * (1.0 + 0.2 * uBass); glow = 1.0; }
    else if (part == ${PART.trim}) { lit = tint * 1.25; glow = 1.0; }
    else if (part == ${PART.phone}) { lit = vec3(0.6, 0.85, 1.0) * 2.2 * aux; glow = 1.0; }
    else if (part == ${PART.ember}) { lit = vec3(1.0, 0.38, 0.08) * (1.6 + 2.4 * drag); glow = 1.0; }
    // A jacket of leather on some of those in black, brown, burgundy or red
    // (never a suit), a puffer's nylon: they shine in the wet where cloth
    // only takes the light.
    if (part == ${PART.jacket} || part == ${PART.coat} || part == ${PART.lapel} || (part == ${PART.sleeve} && garment < 2.5)) {
      int j = int(aWear.x + 0.5);
      bool hide = (j == 5 || j == 11 || j == 14 || j == 1) && bit(aLook.x, ${f(TAG.suit)}) < 0.5 && rnd(seed * 41.3) > 0.4;
      gloss = garment > 1.5 && garment < 2.5 ? 0.42 : hide ? 0.62 : gloss;
    }
    // Gloves on some: the hands are dark leather.
    if (part == ${PART.skin} && seg > 3.5 && seg < 4.5 && bit(flags, 9.0) > 0.5) {
      albedo = vec3(0.022, 0.02, 0.024) + carried * 0.05;
      gloss = 0.5;
    }
    // A machine's arm: bright steel from the shoulder to the fingers, rings
    // of light at the elbow and the wrist, and its seam (the stripe) down the
    // outside.
    if (machine) {
      // (The far figure's arm is three rings: its elbow is half of it.)
      bool joint = part == ${PART.cuff};
      #ifdef NEAR
      joint = joint || (part == ${PART.sleeve} && abs(position.y - ${f(RIG.elbowY)}) < 0.012);
      #endif
      if (joint) {
        lit = tint * 1.4;
        glow = 1.0;
      } else if (part == ${PART.sleeve} || part == ${PART.skin} || part == ${PART.shirt} || part == ${PART.seam} || part == ${PART.stitch}) {
        albedo = vec3(0.24, 0.25, 0.28);
        gloss = 1.6;
      }
    }

    // Lit by the street they are in, never evenly. The city's bake gives
    // the street's level where they stand (a fill, so nobody is darker than
    // the place they are in, whatever lights it); the crowd's own map gives the
    // signs and windows a few steps the way each face looks and a few steps
    // behind it, and what this side has over the other is the sign beside
    // them: it colours the side of them that faces it and leaves the other
    // in their own shade. What faces up takes the light overhead, what faces
    // down the light off the wet ground; the sky's haze comes from above;
    // the kit's lamps; and from behind them, as the eye sees them, a rim of
    // whatever is lit there.
    vec3 here = spillAt(world);
    vec3 key;
    vec3 dim;
    vec3 about;
    vec2 dir;
    streetAt(root, key, dim, about, dir);
    // The brighter side is a light a little over head height: it models a
    // face, a shoulder, a fold. How much of a source it is says how much of
    // the cool fill is the other side's alone.
    float toward = dot(N, normalize(vec3(dir.x, 0.45, dir.y)));
    float peak = max(key.r, max(key.g, key.b));
    float source = smoothstep(0.02, 0.3, peak);
    float up = N.y;
    vec3 sky = (uHazeColor * 0.22 + uGlowColor * 0.12) * (0.55 + 0.45 * up) * uHaze + vec3(0.5, 0.52, 0.75) * uFlash * 0.25 * (0.5 + 0.5 * up);
    vec3 fill = FILL * mix(0.6, clamp(0.35 - toward * 0.65, 0.0, 1.0), source) * (0.65 + 0.35 * up);
    vec3 light = person(NIGHT * (0.8 + 0.2 * up) + max(key - dim, 0.0) * 1.5 * clamp(toward * 0.85 + 0.15, 0.0, 1.0) + min(key, dim) * 0.22 * (0.6 + 0.8 * clamp(toward * 0.5 + 0.5, 0.0, 1.0)) + fill + about * 0.1 + here * (0.13 + 0.16 * max(up, 0.0) + 0.22 * max(-up, 0.0)) + sky * 0.62 + lampsAt(world, N) * 1.2);
    vec3 V = normalize(uCam - world);
    float graze = 1.0 - max(dot(N, V), 0.0);
    float ground = 0.72 + 0.28 * smoothstep(0.0, 0.5, tall);
    vec3 own = byNight(albedo, light) * light * ground;
    // The street's colour is on them twice: as a wash over the side turned
    // to it (person(), above) and as a rim in the sign's own colour along
    // the edges turned to it, bright enough to draw them against the dark.
    // The edges turned away have the night's blue, so that someone under no
    // sign at all is a dark shape with a faint blue edge and never a hole.
    // The wet shine goes with it on what is glossy.
    float g3 = pow(graze, 2.5);
    vec3 rim = key / max(peak, 1e-4) * source * 0.85 * g3 * smoothstep(-0.25, 0.35, toward) + EDGE * g3 * (0.45 + 0.55 * clamp(0.3 - toward, 0.0, 1.0)) * (0.6 + 0.4 * max(up, 0.0));
    vec3 shine = (key * clamp(toward, 0.0, 1.0) + sky * 0.9) * graze * graze * gloss * 0.5;
    #ifdef NEAR
    shine *= min(1.0, (0.006 + (0.55 + 2.0 * gloss) * max(own.r, max(own.g, own.b))) / max(max(shine.r, max(shine.g, shine.b)), 1e-4));
    #else
    // Far off a figure is a few flat faces, most of them seen edge on: the
    // rim would be all of them, so it stays a part of what they are.
    rim = (rim + shine) * 0.6;
    shine = vec3(0.0);
    rim *= min(1.0, (0.012 + (0.55 + 2.0 * gloss) * max(own.r, max(own.g, own.b))) / max(max(rim.r, max(rim.g, rim.b)), 1e-4));
    #endif
    vec3 col = (own + rim + shine + NIGHT * 0.05 * (0.3 + graze * graze)) * shade;
    // A lit edge is on the cloth by it, and on the head and shoulders under it.
    if (part == ${PART.canopy}) col += (0.2 + albedo) * edge * 0.2 * aux * aux * aux * led;
    else if (umbrella > 0.5) col += albedo * edge * 0.15 * smoothstep(1.25, 1.7, tall) * led;
    // A phone held up lights the face over it.
    if (phoneUp > 0.5 && seg > 1.5 && seg < 2.5) col += albedo * vec3(0.3, 0.45, 0.55) * max(n.z * 0.8 - n.y * 0.6, 0.0);
    // Nothing that is not lit from inside reaches the bloom.
    col *= min(1.0, 0.84 / max(max(col.r, max(col.g, col.b)), 1e-4));
    col = mix(col, lit, glow);
    vColor = cityFog(col, world, glow);

    // The trades: the near figure keeps the pixels the far one has not
    // taken yet, and the far one those the card has not.
    float trade = smoothstep(uLod.x - uLod.y, uLod.x + uLod.y, eye);
    #ifdef CLOSE
    vFade = vec2(fade, smoothstep(uClose.x - uClose.y, uClose.x + uClose.y, eye));
    #elif defined(NEAR)
    vFade = vec2(min(fade, smoothstep(uClose.x - uClose.y, uClose.x + uClose.y, eye)), trade);
    #else
    vFade = vec2(min(fade, trade), smoothstep(uLod.z - uLod.w, uLod.z + uLod.w, eye));
    #endif
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying vec2 vFade;
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  void main() {
    float dither = hash12(floor(gl_FragCoord.xy));
    if (dither > vFade.x || dither < vFade.y) discard;
    gl_FragColor = vec4(vColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// The card: the same person a hundred metres off and further, where they are
// a dozen pixels tall, and everyone in the wet road's mirror, which smears
// what it holds down the road anyway. An upright card turned to the eye about
// its own vertical, with their shape drawn on it: head, shoulders to hips, a
// coat, legs that stride, an umbrella and its rim.
const CARD_VERTEX = /* glsl */ `
  // Across and up the card in the figure's own metres, and how much of them
  // the fades leave.
  varying vec4 vAt;
  // The street's light on them, and their step.
  varying vec4 vLight;
  // What distance turns them into, and how far it has.
  varying vec4 vFog;
  // Jacket (and whether an umbrella is over them), trousers (and a coat),
  // skin (and how square on they are seen), the head's top (and a pixel in
  // their metres), their neon (and what is lit on them).
  varying vec4 vJacket;
  varying vec4 vLegs;
  varying vec4 vSkin;
  varying vec4 vHair;
  varying vec4 vTint;
  // An umbrella's cloth, and whether its edge is lit.
  varying vec4 vCloth;
  ${HEAD}

  void main() {
    vec3 root;
    vec2 face;
    float fade;
    float gone;
    float eye;
    place(root, face, fade, gone, eye);
    float h = aBody.x;
    float pose = aBody.z;
    float reach = strideOf(aWalk.z, aLook.w, bit(aLook.y, 13.0));
    float ph = pose < -0.5 ? gone / (STRIDE * reach * h) + aWalk.w : 0.0;
    // Sitting or squatting they are shorter, and a seat's top is not the
    // ground.
    float squash = 1.0;
    float foot = 0.0;
    if (pose > 2.5 && pose < 3.5) {
      squash = 0.74;
      foot = -0.46;
    } else if (pose > 4.5 && pose < 5.5) squash = 0.56;
    else if (pose > ${f(POSES.indexOf("floor") - 0.5)} && pose < ${f(POSES.indexOf("floor") + 0.5)}) squash = 0.5;
    else if (pose > ${f(POSES.indexOf("lie") - 0.5)} && pose < ${f(POSES.indexOf("lie") + 0.5)}) squash = 0.17;
    else if (pose > ${f(POSES.indexOf("work") - 0.5)}) squash = 0.6;
    vec2 toEye = normalize(uCam.xz - root.xz + 1e-5);
    vec2 right = vec2(toEye.y, -toEye.x);
    vec2 local = vec2(position.x * 1.3, (position.y + 0.5) * 2.3);
    // Seen from high over them the card leans back, so it is never edge on.
    vec3 above = uCam - root;
    float tilt = max(asin(clamp(above.y / length(above), 0.0, 1.0)) - 0.6, 0.0);
    vec3 world = root + (vec3(right.x, 0.0, right.y) * local.x + vec3(-toEye.x * sin(tilt), cos(tilt), -toEye.y * sin(tilt)) * (foot + local.y * squash)) * h;

    // Lit as the figure's faces that look at the eye are.
    vec3 mid = root + vec3(0.0, h, 0.0);
    vec3 sky = (uHazeColor * 0.22 + uGlowColor * 0.12) * 0.55 * uHaze + vec3(0.5, 0.52, 0.75) * uFlash * 0.12;
    vec3 key;
    vec3 dim;
    vec3 about;
    vec2 dir;
    streetAt(root, key, dim, about, dir);
    float toward = dot(toEye, dir) * 0.9;
    float source = smoothstep(0.02, 0.3, max(key.r, max(key.g, key.b)));
    vLight = vec4(person(NIGHT + max(key - dim, 0.0) * 1.5 * clamp(toward * 0.85 + 0.15, 0.0, 1.0) + min(key, dim) * 0.22 + FILL * mix(0.6, clamp(0.35 - toward * 0.65, 0.0, 1.0), source) * 0.65 + about * 0.1 + spillAt(mid) * 0.15 + sky * 0.62), 6.2832 * ph);
    vec3 away = mid - uCam;
    float dist = length(away);
    vec3 fog = mix(uFogColor, uHazeColor, uHaze * exp(-max(mid.y, 0.0) * 0.01) * smoothstep(40.0, 360.0, dist));
    vFog = vec4(fog + cityGlow(away, mid.y) * smoothstep(120.0, 900.0, dist), 1.0 - exp(-dist * uFogDensity));

    float mask = aLook.x;
    float flags = aLook.y;
    vec3 jacket = uPal[${PAL.jacket} + int(aWear.x + 0.5)];
    vec3 skin = uPal[${PAL.skin} + int(aWear.z + 0.5)];
    float facing = dot(face, toEye);
    // The top of the head, and all of it from behind: hair, a hat, a hood.
    vec3 top = bit(mask, ${f(TAG.hardhat)}) > 0.5 ? uPal[${PAL.helmet} + int(mod(floor(aLook.z / 4.0), 3.0) + 0.5)] : bit(mask, ${f(TAG.hood)}) > 0.5 ? uPal[${PAL.shirt} + int(floor(aWear.y / 8.0) + 0.5)] : bit(flags, 2.0) > 0.5 ? uPal[${PAL.bag} + int(floor(aLook.z / 4.0) + 0.5)] : uPal[${PAL.hair} + int(aWear.w + 0.5)];
    vJacket = vec4(jacket, bit(mask, ${f(TAG.umbrella)}) * (pose < -0.5 ? 1.0 : 1.0 - coveredAt(root)));
    vLegs = vec4(uPal[${PAL.trousers} + int(mod(aWear.y, 8.0) + 0.5)], bit(mask, ${f(TAG.skirt)}) * (1.0 + bit(flags, 11.0)));
    vSkin = vec4(skin, abs(facing));
    vHair = vec4(top, uPass.y * eye / h);
    vTint = vec4(uPal[${PAL.rim} + int(mod(aLook.z, 4.0) + 0.5)], bit(mask, ${f(TAG.trim)}) + 2.0 * bit(mask, ${f(TAG.phone)}) + 4.0 * step(facing, 0.0));
    float kind = mod(floor(flags / 128.0), 4.0);
    vCloth = vec4(kind > 2.5 ? vec3(0.035, 0.04, 0.05) : uPal[${PAL.canopy} + int(mod(floor(flags / 32768.0), 8.0) + 0.5)], bit(flags, 14.0));
    if (vCloth.a > 0.5 && abs(mod(aLook.z, 4.0) - 2.0) < 0.5) vTint.rgb = uPal[${PAL.rim}];
    // The card keeps the pixels the far figure has given up; in the mirror
    // it has them all.
    float trade = uPass.x > 0.5 ? 1.0 : smoothstep(uLod.z - uLod.w, uLod.z + uLod.w, eye);
    vAt = vec4(local, min(fade, trade), 0.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const CARD_FRAGMENT = /* glsl */ `
  uniform float uBass;
  varying vec4 vAt;
  varying vec4 vLight;
  varying vec4 vFog;
  varying vec4 vJacket;
  varying vec4 vLegs;
  varying vec4 vSkin;
  varying vec4 vHair;
  varying vec4 vTint;
  varying vec4 vCloth;
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  ${BY_NIGHT}
  // A segment whose radius runs from ra at a to rb at b.
  float limb(vec2 p, vec2 a, vec2 b, float ra, float rb) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * k) - mix(ra, rb, k);
  }
  void main() {
    if (hash12(floor(gl_FragCoord.xy)) > vAt.z) discard;
    vec2 p = vAt.xy;
    float px = vHair.a;
    // Narrower seen from the side, and the legs a stride apart; seen from
    // the front or the back, side by side.
    float front = vSkin.a;
    float w = mix(0.62, 1.0, front);
    float gap = 0.09 * front;
    float reach = 0.3 * (1.0 - front) * sin(vLight.a);
    float dHead = length((p - vec2(0.0, 1.645)) / vec2(0.8, 1.0)) - 0.112;
    float dBody = limb(p, vec2(0.0, 1.36), vec2(0.0, 1.0), 0.215 * w, 0.17 * w);
    float dCoat = vLegs.a > 0.5 ? limb(p, vec2(0.0, 1.0), vec2(0.0, vLegs.a > 1.5 ? 0.37 : 0.58), 0.18 * w, (vLegs.a > 1.5 ? 0.23 : 0.215) * w) : 1e3;
    float dLegs = min(limb(p, vec2(-gap, 0.95), vec2(reach - gap, 0.06), 0.085, 0.05), limb(p, vec2(gap, 0.95), vec2(gap - reach, 0.06), 0.085, 0.05));
    float d = min(min(dHead, dBody), min(dCoat, dLegs));
    // An umbrella: a shallow dome, its rim never under a pixel and a half.
    float canopy = 1e3;
    float rim = 1e3;
    if (vJacket.a > 0.5) {
      vec2 q = (p - vec2(${f(CANOPY.x)}, ${f(CANOPY.edge)})) / vec2(${f(CANOPY.radius)}, 0.2);
      canopy = max(length(q) - 1.0, -q.y);
      if (vCloth.a > 0.5) rim = max(abs(p.y - ${f(CANOPY.edge)}) - max(${f(RIM_HALF)}, 0.75 * px), abs(p.x - ${f(CANOPY.x)}) - ${f(CANOPY.radius)});
    }
    if (min(d, min(canopy, rim)) > 0.0) discard;
    float lit = vTint.a;
    vec3 albedo = vLegs.rgb;
    if (p.y < 0.1) albedo = vec3(0.03);
    if (dBody <= 0.0 || dCoat <= 0.0) albedo = vJacket.rgb;
    if (dHead <= 0.0) albedo = lit > 3.5 || p.y > 1.7 ? vHair.rgb : vSkin.rgb;
    if (canopy <= 0.0) albedo = vCloth.rgb;
    vec3 col = byNight(albedo, vLight.rgb) * vLight.rgb;
    float glow = 1.0;
    if (rim <= 0.0) col = vTint.rgb * 1.8 * (1.0 + 0.2 * uBass);
    else if (mod(lit, 2.0) > 0.5 && dBody <= 0.0 && abs(p.y - 0.93) < max(0.007, 0.5 * px)) col = vTint.rgb * 1.25;
    else if (mod(floor(lit / 2.0), 2.0) > 0.5 && length(p - vec2(0.07, 1.27)) < max(0.045, 0.8 * px)) col = vec3(0.6, 0.85, 1.0) * 2.2;
    else glow = 0.0;
    col = mix(col, vFog.rgb, glow > 0.5 ? 1.0 - pow(1.0 - vFog.a, 0.45) : vFog.a);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// What is under their feet: a soft dark shape on the ground where each
// stands, so that nobody floats on a wet road or a pale pavement. Under the
// knees of someone on a seat, longer along a walker's stride; it thins out
// with distance before the figure itself becomes a card.
const GROUND_VERTEX = /* glsl */ `
  varying vec3 vAt;
  ${HEAD}

  void main() {
    vec3 root;
    vec2 face;
    float fade;
    float gone;
    float eye;
    place(root, face, fade, gone, eye);
    float h = aBody.x;
    float pose = aBody.z;
    vec2 half2 = vec2(0.36, 0.34) * aBody.y;
    float down = 0.0;
    float ahead = 0.0;
    if (pose < -0.5) half2 = vec2(0.31, 0.43) * aBody.y;
    else if (pose > 2.5 && pose < 3.5) {
      half2 = vec2(0.36, 0.4);
      down = ${f(RIG.shin + RIG.ankleY - (RIG.hipY - RIG.seat))};
      ahead = 0.34;
    } else if (pose > 4.5 && pose < 5.5) half2 = vec2(0.37, 0.37);
    else if (pose > ${f(POSES.indexOf("floor") - 0.5)} && pose < ${f(POSES.indexOf("floor") + 0.5)}) {
      half2 = vec2(0.4, 0.55);
      ahead = 0.25;
    } else if (pose > ${f(POSES.indexOf("lie") - 0.5)} && pose < ${f(POSES.indexOf("lie") + 0.5)}) half2 = vec2(0.42, 1.0);
    vec2 right = vec2(face.y, -face.x);
    vec2 at = root.xz + face * ahead * h + (right * position.x * half2.x + face * position.y * half2.y) * 2.0 * h;
    vec3 world = vec3(at.x, root.y - down * h + 0.014, at.y);
    vAt = vec3(position.xy * 2.0, fade * (1.0 - smoothstep(0.5 * uLod.z, 0.85 * uLod.z, eye)));
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const GROUND_FRAGMENT = /* glsl */ `
  varying vec3 vAt;
  void main() {
    float a = 1.0 - smoothstep(0.16, 1.0, length(vAt.xy));
    a *= sqrt(a) * 0.82 * vAt.z;
    if (a < 0.004) discard;
    gl_FragColor = vec4(0.0, 0.001, 0.004, a);
  }
`;

const _frustum = new THREE.Frustum();
// The frustum's six planes as numbers (normal x, y, z, constant).
const _planes = new Float64Array(24);
const _vp = new THREE.Matrix4();
const NAMES = ["aWalk", "aPath", "aBody", "aLook", "aWear"];

export function createCrowd(scene, shared, { phone = false, reduced = false, reflectLayer = 2, walks = [], standers = [], cover = null, traffic: given = null } = {}) {
  // The traffic, for whoever crosses at a junction to ask when its arm can
  // be walked (src/world/traffic.js, walk()); without it they wait at the
  // kerb and never cross.
  let traffic = given;
  const motion = reduced ? 0 : 1;
  // What is overhead: the scene's cover map if it was handed over, or else
  // the one the rain was given (its uniforms are found in the scene).
  const overhead = { uCover: { value: null }, uCoverBox: { value: new THREE.Vector4() }, uCoverScale: { value: new THREE.Vector2() } };
  let roof = cover ? { uCover: { value: cover.texture }, uCoverBox: { value: cover.box }, uCoverScale: { value: cover.scale } } : null;
  let looked = 0;
  let blind = false;
  const underCover = () => {
    if (!roof && looked < 600 && looked++ % 60 === 0) {
      scene.traverse((o) => {
        const u = o.material?.uniforms;
        if (!roof && u?.uCover && u.uCoverBox && u.uCoverScale) roof = u;
      });
    }
    if (!roof || blind) return;
    overhead.uCover.value = roof.uCover.value;
    overhead.uCoverBox.value.copy(roof.uCoverBox.value);
    overhead.uCoverScale.value.copy(roof.uCoverScale.value);
  };
  const light = createStreetLight(scene, shared);
  const palette = new Float32Array(PAL.size * 3);
  [JACKETS, TROUSERS, SKINS, HAIRS, BAGS, RIMS.map((c) => new THREE.Color(c).toArray()), SHIRTS, HELMETS, CANOPIES].flat().forEach((c, i) => palette.set(c, i * 3));
  // Where the figures trade places, through a 50 degree lens: the face for
  // the far figure where a person is about seventy pixels tall on a desktop,
  // the far figure for the card where they are under twenty; sooner on a
  // phone's small screen.
  // And nearer than a few steps, where a head is a few dozen pixels across,
  // the closest figure for the near one.
  const TRADES = phone ? [15, 70, 6.5] : [22, 100, 10.5];
  const BAND = 0.12;
  const base = {
    ...shared,
    uMotion: { value: motion },
    uPose: { value: new Float32Array(POSE_TABLE.flat()) },
    uPal: { value: palette },
    uLanes: { value: null },
    uLaneRows: { value: 1 },
    uSigns: light.uniform,
    ...overhead,
    uLod: { value: new THREE.Vector4(TRADES[0], TRADES[0] * BAND, TRADES[1], TRADES[1] * BAND) },
    uClose: { value: new THREE.Vector2(TRADES[2], TRADES[2] * BAND) },
    uAvoid: { value: new THREE.Vector4() },
  };
  const material = (name, vertexShader, fragmentShader, defines = {}) => {
    const m = new THREE.ShaderMaterial({ uniforms: { ...base, uPass: { value: new THREE.Vector2(0, 0.001) } }, vertexShader, fragmentShader, defines });
    m.name = name;
    return m;
  };
  // The draws: the closest figure, the figure with a face, the far figure,
  // the card, and what is on the ground under whoever is not yet a card.
  const flat = new THREE.PlaneGeometry(1, 1);
  // (load: the closest figure is a few dozen milliseconds to build and
  // nobody is that near the hero's lens, so the figure with a face stands in
  // for it until the city's first frame is drawn and the page is idle.)
  const near = figureGeometry(false);
  const shapes = [near, near, figureGeometry(true), flat, flat];
  let closeMade = 0;
  const makeClose = () => {
    if (over || closeMade > 1) return;
    closeMade = 2;
    const g = figureGeometry(false, true);
    shapes[0] = g;
    const d = drawn[0];
    if (!d) return;
    d.geometry.index = g.index;
    for (const name of ["position", "normal", "aRig"]) d.geometry.setAttribute(name, g.attributes[name]);
    d.triangles = g.index.count / 3;
  };
  const materials = [material("crowd_close", VERTEX, FRAGMENT, { NEAR: "", CLOSE: "" }), material("crowd", VERTEX, FRAGMENT, { NEAR: "" }), material("crowd_far", VERTEX, FRAGMENT), material("crowd_card", CARD_VERTEX, CARD_FRAGMENT), material("crowd_ground", GROUND_VERTEX, GROUND_FRAGMENT)];
  Object.assign(materials[4], { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const group = new THREE.Group();
  group.name = "crowd";
  scene.add(group);

  // Everyone, and each draw's own list of them, packed again as it changes.
  // Nobody until the street furniture's file is in (it is the city's own,
  // fetched before any of this is made): who sits where waits on the benches.
  let people = { data: new Float32Array(0), count: 0, rows: 0, paves: [], standing: 0, crossers: [] };
  let crossing = null;
  let drawn = [];
  let eye = null;
  const last = new Float32Array(18).fill(NaN);
  const fill = () => {
    for (const d of drawn) {
      group.remove(d.mesh);
      d.geometry.dispose();
    }
    drawn = shapes.map((shape, k) => {
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.index = shape.index;
      for (const name of k < 3 ? ["position", "normal", "aRig"] : ["position"]) geometry.setAttribute(name, shape.attributes[name]);
      const buffer = new THREE.InstancedInterleavedBuffer(new Float32Array(Math.max(1, people.count) * STRIDE), STRIDE, 1).setUsage(THREE.DynamicDrawUsage);
      NAMES.forEach((name, i) => geometry.setAttribute(name, new THREE.InterleavedBufferAttribute(buffer, 4, i * 4)));
      geometry.instanceCount = 0;
      const mesh = new THREE.Mesh(geometry, materials[k]);
      mesh.name = materials[k].name;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      // The shader puts them where they are; a ray would only find the
      // figure as built, at the origin.
      mesh.raycast = () => {};
      const d = { mesh, geometry, buffer, count: 0, all: 0, sig: -1, triangles: shape.index.count / 3 };
      // What the camera drawing it is: the page's own (it sees layer 0) or
      // the wet road's mirror, which gets everyone as cards.
      mesh.onBeforeRender = (renderer, _scene, camera) => {
        const main = (camera.layers.mask & 1) === 1;
        if (main) eye = camera;
        const target = renderer.getRenderTarget();
        materials[k].uniforms.uPass.value.set(main ? 0 : 1, 2 / (camera.projectionMatrix.elements[5] * (target ? target.height : renderer.domElement.height)));
        materials[k].uniformsNeedUpdate = true;
        geometry.instanceCount = main ? d.count : d.all;
      };
      group.add(mesh);
      return d;
    });
    drawn[3].mesh.layers.enable(reflectLayer);
    // Under everything else that is seen through: glass, rain, steam.
    drawn[4].mesh.renderOrder = -1;
    last.fill(NaN);
  };

  // Each frame: where every walker is now, who the lens can see, and which
  // draw each is in (two of them, inside a band where they trade). A list
  // is packed again only when who is on it changed.
  let lists = [];
  const pack = (d, a, na, b, nb) => {
    const { data } = people;
    let sig = 2166136261;
    for (let k = 0; k < na; k++) sig = Math.imul(sig ^ a[k], 16777619) >>> 0;
    sig = Math.imul(sig ^ 65535, 16777619) >>> 0;
    for (let k = 0; k < nb; k++) sig = Math.imul(sig ^ b[k], 16777619) >>> 0;
    d.a = a;
    d.na = na;
    d.b = b;
    d.nb = nb;
    d.count = na;
    d.all = na + nb;
    d.mesh.visible = d.all > 0;
    if (sig === d.sig) return;
    d.sig = sig;
    const out = d.buffer.array;
    for (let k = 0; k < na; k++) out.set(data.subarray(a[k] * STRIDE, a[k] * STRIDE + STRIDE), k * STRIDE);
    for (let k = 0; k < nb; k++) out.set(data.subarray(b[k] * STRIDE, b[k] * STRIDE + STRIDE), (na + k) * STRIDE);
    d.buffer.clearUpdateRanges();
    d.buffer.addUpdateRange(0, d.all * STRIDE);
    d.buffer.needsUpdate = true;
  };
  const touched = [];
  const refresh = () => {
    if (!closeMade && eye) {
      closeMade = 1;
      if (typeof requestIdleCallback === "function") requestIdleCallback(makeClose, { timeout: 1500 });
      else setTimeout(makeClose, 300);
    }
    const t = shared.uTime.value * motion;
    const cam = shared.uCam.value;
    light.check();
    underCover();
    if (eye) eye.updateMatrixWorld();
    const e = eye ? eye.matrixWorld.elements : null;
    const lens = eye ? eye.projectionMatrix.elements[5] : 0;
    let same = last[16] === t && last[17] === lens;
    for (let k = 0; k < 16 && same; k++) same = last[k] === (e ? e[k] : k < 3 ? cam.getComponent(k) : 0);
    if (same) return;
    // Whoever crosses moves on (waits, steps off, steps up, arrives).
    touched.length = 0;
    crossing?.step(t, traffic, people.data, STRIDE, (i) => touched.push(i));
    for (let k = 0; k < 16; k++) last[k] = e ? e[k] : k < 3 ? cam.getComponent(k) : 0;
    last[16] = t;
    last[17] = lens;
    if (eye) {
      _frustum.setFromProjectionMatrix(_vp.multiplyMatrices(eye.projectionMatrix, eye.matrixWorldInverse));
      _frustum.planes.forEach(({ normal, constant }, p) => _planes.set([normal.x, normal.y, normal.z, constant], p * 4));
    }
    // A longer lens sees a face from further off.
    const zoom = eye ? lens / 2.1445 : 1;
    const t0 = TRADES[0] * zoom;
    const t1 = TRADES[1] * zoom;
    const tc = TRADES[2] * zoom;
    base.uLod.value.set(t0, t0 * BAND, t1, t1 * BAND);
    base.uClose.value.set(tc, tc * BAND);
    const { data, count } = people;
    if (!lists.length || lists[0].length < count) lists = [0, 1, 2, 3, 4].map(() => new Uint16Array(Math.max(1, count)));
    const [near, far, cards, rest, close] = lists;
    let nx = 0;
    let nn = 0;
    let nf = 0;
    let nc = 0;
    let nr = 0;
    for (let i = 0; i < count; i++) {
      const o = i * STRIDE;
      let x = data[o];
      let z = data[o + 1];
      let y = data[o + 11];
      if (data[o + 10] < -0.5) {
        const pace = data[o + 2];
        const len = data[o + 6];
        const w = data[o + 3];
        const gone = Math.abs(pace) * t + (0.3 + 0.15 * Math.floor(w / 2)) * Math.sin(t * 0.21 + ((w * 2) % 1) * 6.2832);
        let s = (data[o + 7] + Math.sign(pace) * gone) % len;
        if (s < 0) s += len;
        if (Math.min(s, len - s) < 0.03) continue;
        x += data[o + 4] * s;
        z += data[o + 5] * s;
        if (y < 0) {
          // Out on the south street's crossing.
          const out = (y > -1.5 ? MOUTH.out : -MOUTH.out) * (ease(MOUTH.turn[0], MOUTH.turn[1], s) - ease(MOUTH.back[0], MOUTH.back[1], s));
          x += data[o + 5] * out;
          z -= data[o + 4] * out;
          y = PAVE_Y;
        }
      }
      // (Frustum.intersectsSphere written out: a sphere of 2.6 m about the
      // person's middle is out if it is behind any plane by more than that.)
      if (eye) {
        let out = false;
        for (let p = 0; p < 24 && !out; p += 4) out = _planes[p] * x + _planes[p + 1] * (y + 1) + _planes[p + 2] * z + _planes[p + 3] < -2.6;
        if (out) continue;
      }
      const top = y + 1.8 * data[o + 8];
      const dx = x - cam.x;
      const dz = z - cam.z;
      const dy = cam.y > top ? cam.y - top : cam.y < y ? y - cam.y : 0;
      const d = Math.sqrt(dx * dx + dz * dz + dy * dy);
      if (d < tc * (1 + BAND)) close[nx++] = i;
      if (d > tc * (1 - BAND) && d < t0 * (1 + BAND)) near[nn++] = i;
      if (d > t0 * (1 - BAND) && d < t1 * (1 + BAND)) far[nf++] = i;
      if (d > t1 * (1 - BAND)) cards[nc++] = i;
      else rest[nr++] = i;
    }
    pack(drawn[0], close, nx, rest, 0);
    pack(drawn[1], near, nn, rest, 0);
    pack(drawn[2], far, nf, rest, 0);
    // The cards' list ends with everyone nearer: the mirror draws to its end.
    pack(drawn[3], cards, nc, rest, nr);
    pack(drawn[4], rest, nr, rest, 0);
    // A crosser who changed is written into each draw's buffer where they
    // are in it (a draw whose list did not change sends only that).
    for (const i of touched) {
      for (const d of drawn) {
        let k = -1;
        for (let n = 0; n < d.na && k < 0; n++) if (d.a[n] === i) k = n;
        for (let n = 0; n < d.nb && k < 0; n++) if (d.b[n] === i) k = d.na + n;
        if (k < 0) continue;
        d.buffer.array.set(data.subarray(i * STRIDE, i * STRIDE + STRIDE), k * STRIDE);
        d.buffer.addUpdateRange(k * STRIDE, STRIDE);
        d.buffer.needsUpdate = true;
      }
    }
  };
  // The lanes: round everyone standing, and round the city's street
  // furniture once its file is in (it is the city's own, fetched before any
  // of this is made).
  let furniture = [];
  let benches = [];
  let rails = [];
  let over = false;
  const lay = () => {
    const { data, count, rows, paves } = people;
    const solid = [...furniture];
    for (let i = 0; i < Math.min(count, people.standing); i++) if (data[i * STRIDE + 10] > -0.5) solid.push({ x: data[i * STRIDE], z: data[i * STRIDE + 1], cos: 1, sin: 0, hx: 0.2, hz: 0.2 });
    base.uLanes.value?.dispose();
    const texels = layLanes(paves, rows + 1, solid);
    for (let k = 0; k < LANE_W; k++) texels.set([128, 255, 255, 0], (rows * LANE_W + k) * 4);
    const map = new THREE.DataTexture(texels, LANE_W, rows + 1, THREE.RGBAFormat);
    map.magFilter = map.minFilter = THREE.LinearFilter;
    map.needsUpdate = true;
    base.uLanes.value = map;
    base.uLaneRows.value = rows + 1;
  };
  // The crossings, once the traffic is known: every junction's but the
  // hero's own (its lens is in the mouth, and the avenue's walks cross the
  // south street there already), and none over the deck's ramp in the west
  // street's middle.
  const crossingsNow = () => {
    const streets = traffic?.cars?.().net?.streets;
    return streets ? crossingsOf(streets, (jx, jz, arm, mid) => (jx === 0 && jz === 1) || (jx === -80 && mid[1] > -232 && mid[1] < -64)) : [];
  };
  const begin = () => {
    crossing = people.crossers.length ? createCrossers(people.crossers, people.rows, PAVE_Y) : null;
    crossing?.start(shared.uTime.value * motion, people.data, STRIDE);
  };
  base.uLanes.value = new THREE.DataTexture(new Uint8Array([128, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  base.uLanes.value.needsUpdate = true;
  preloadProps(phone ? "phone" : "high")
    .then((buffer) => {
      let lamps;
      ({ solid: furniture, benches, rails, lamps } = footprints(buffer));
      light.setLamps(lamps);
    })
    .catch(() => {})
    .then(() => {
      if (over) return;
      people = populate({ phone, walks, standers, benches, rails, crossings: crossingsNow() });
      fill();
      lay();
      begin();
    });
  fill();
  // world-scene.js draws the scene without telling the crowd: every draw of
  // it starts by updating the scene's matrices, which is where this is told.
  group.updateMatrixWorld = function (force) {
    refresh();
    THREE.Group.prototype.updateMatrixWorld.call(this, force);
  };

  const api = {
    mesh: group,
    /** Sort the people for this camera now (the scene's own draw does it
     *  too, so nobody has to call this). */
    update(camera) {
      eye = camera;
      refresh();
    },
    /** Free roam: the car people step out of the way of, at (x, z), `side`
     *  metres to either flank from `along` metres off; no arguments, no car. */
    /** The traffic, if it was not handed over when the crowd was made:
     *  whoever waits at a crossing then crosses when it can be walked. */
    setTraffic(t) {
      const had = traffic;
      traffic = t;
      if (!had && t && people.count && !people.crossers.length) {
        people = populate({ phone, walks, standers, benches, rails, crossings: crossingsNow() });
        fill();
        lay();
        begin();
      }
    },
    avoid(x = 0, z = 0, side = 0, along = 0) {
      base.uAvoid.value.set(x, z, side, along);
    },
    /** People in the city, and how many each draw held last frame. */
    stats() {
      const [close, near, far, cards, ground] = drawn.map((d) => d.count);
      return { people: people.count, close, near, far, cards, ground, mirror: drawn[3].all, triangles: close * drawn[0].triangles + near * drawn[1].triangles + far * drawn[2].triangles + (cards + ground) * 2 };
    },
    dispose() {
      scene.remove(group);
      for (const d of drawn) d.geometry.dispose();
      for (const g of new Set(shapes)) g.dispose();
      for (const m of materials) m.dispose();
      base.uLanes.value?.dispose();
      light.dispose();
      over = true;
    },
  };
  if (import.meta.env.DEV) {
    // Stand people anywhere, for looking at them: a flat list of x, y, z,
    // the way they look and a pose, as the builder's; `only` leaves the
    // rest of the network out, `bare` this module's own people too.
    api.debugStand = (list, { only = false, bare = false, ahead = [] } = {}) => {
      const t0 = performance.now();
      people = populate({ phone, walks: only || bare ? [] : walks, standers: [...(only || bare ? [] : standers), ...list], benches: only || bare ? [] : benches, rails: only || bare ? [] : rails, bare, ahead, crossings: only || bare ? [] : crossingsNow() });
      const t1 = performance.now();
      lay();
      const t2 = performance.now();
      fill();
      begin();
      // How long each took, in milliseconds: the people, the lanes, the buffers.
      return [t1 - t0, t2 - t1, performance.now() - t2];
    };
    // Move where the figures trade places, to look at each on its own.
    api.debugTrades = (near, far, close = TRADES[2]) => {
      TRADES[0] = near;
      TRADES[1] = far;
      TRADES[2] = close;
      last.fill(NaN);
    };
    // Forget what is overhead (or know it again), to see what it changes.
    api.debugCover = (on) => {
      blind = !on;
      if (blind) overhead.uCoverScale.value.set(0, 0);
      last.fill(NaN);
      return roof ? roof.uCoverScale.value.toArray() : null;
    };
    // Everyone's floats, what stands on the pavements, the lanes' map and
    // the signs' light, for checking that nobody walks through anything and
    // what lights them.
    api.debugState = () => ({ crossers: crossing?.state() ?? [], people, furniture, lanes: base.uLanes.value.image, signs: base.uSigns.value.image, signsMs: light.ms, signsWork: light.work, signsPending: light.pending, stride: STRIDE });
  }
  return api;
}
