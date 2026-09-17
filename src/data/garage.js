// src/data/garage.js: the S4, part by part.
//
// The Teardown section used to show three photographs of the car with a
// caption each. This is the same car opened up: every modification on it,
// grouped, priced where Ali priced it, and pinned to the place in the
// photograph where the part lives.
//
// SOURCE. Every entry below is transcribed from Ali's own build list, two
// screenshots of a note titled "Aldo's whip" supplied on 2026-09-16. Nothing
// is added to it. In particular there is no per-part horsepower figure
// anywhere in this file, because he never measured one per part and a number
// like "+40 hp from the pulley" would be invented. The only output figure on
// the page is the one he states for the whole car, 540 whp, and it is his.
//
// Voice: first person, like the captions in life.js and the About section.
//
// The list also carried three lines that are not modifications (two AC
// compressors, an MMI button, the registration). They are recorded in
// `alsoOnTheList` so the page can be honest that the receipt is longer than
// the build, and nowhere else.
//
// PRICES. Written exactly as listed, in US dollars. The RS4 bumper line read
// "700$ + 400 (paint color match and install)" once and "700$ + 400x2" once;
// the part is priced and the paint is described rather than summed, because
// the two lines disagree. Flip SHOW_PRICES to hide every price at once.
//
// HOTSPOTS. `x` and `y` are percentages of the photograph, read off a
// labelled grid laid over each source file, so they survive any crop the
// frame applies (see CoverBox.jsx). A part can be pinned in more than one
// view: the heat exchanger is behind the grille in the front shot and ahead
// of the radiator in the bay.
//
// ANCHORS. The 3D bay (GarageModel.jsx) pins the same parts on the model,
// Ali's own GLB (src/three/car/object.js, built in design/audi-s4). An
// `anchor.part` names a node in that file, exactly as Blender named it (in
// dev, `window.__garage.parts` lists them), and the marker sits at its
// centre, plus `offset` in metres: the car faces +Z, its driver's side is
// +X, and y is up. `at` is a point in car space for a part the file does
// not name (the MMI screen). `box` is the fallback, a fraction of the car's
// bounding box (x from the passenger side to the driver's side, y from the
// floor, z from the tail to the nose), used when the model has no such
// node. `inBay` marks a part under the hood, hidden until the hood is up.
import { photo } from "./photos";

export const SHOW_PRICES = true;

// Which bay opens first: the photographs, or the model. This branch opens
// on the model; the photographs are one click away in the bezel.
export const DEFAULT_BAY = "model";

export const car = {
  id: "garage",
  name: "Audi S4 B8.5",
  year: "2013",
  engine: "3.0 TFSI V6, supercharged",
  output: "540 whp",
  outputNote: "My number, for the whole car. No part below claims a share of it.",
  lede:
    "The daily. A supercharged S4 I built and tuned myself. Take a look around in 3D, or pick a part from the photos and the build sheet.",
};

// The five views. `focus` is where the frame should centre when it has to
// crop: three are phone portraits, tall against a 4:3 frame, and the car
// sits low in each.
export const views = [
  {
    id: "front",
    label: "Front",
    image: photo("audi-s4-front"),
    alt: "My grey Audi S4 at night in front of the Boston Public Library, seen from the front left: the RS4 honeycomb grille and bumper, the headlights on, twenty-inch R8 wheels.",
    date: "March 2026",
    focus: { x: 50, y: 63 },
  },
  {
    id: "bay",
    label: "Engine bay",
    image: photo("audi-s4-engine-bay"),
    alt: "The open engine bay of an Audi S4: a 3.0 V6 TFSI with its supercharger under the intake manifold and a carbon fibre intake feeding it.",
    date: "July 2025",
    focus: { x: 52, y: 55 },
  },
  {
    id: "rear",
    label: "Rear",
    image: photo("audi-s4-rear"),
    alt: "My S4 from behind on a Boston street at dusk: the carbon trunk spoiler, the carbon diffuser with the four AWE tips, and the S4 badge. The plate is blurred.",
    date: "February 2026",
    focus: { x: 52, y: 52 },
  },
  {
    id: "wheel",
    label: "Wheel",
    image: photo("audi-s4-wheel"),
    alt: "Close on one twenty-inch Audi R8 wheel: the center cap and the spokes, and the ECS caliper and drilled rotor behind them.",
    date: "October 2024",
    focus: { x: 52, y: 50 },
  },
  {
    id: "cabin",
    label: "Cabin",
    image: photo("audi-s4-cabin"),
    alt: "From the driver's seat: the flat-bottomed wheel, the cluster, and Apple CarPlay on the MMI screen.",
    date: "May 2026",
    focus: { x: 55, y: 58 },
  },
];

export const groups = [
  { id: "power", label: "Power", note: "The supercharged 3.0 and what feeds it." },
  { id: "brakes", label: "Brakes", note: "" },
  { id: "suspension", label: "Suspension", note: "" },
  { id: "wheels", label: "Wheels", note: "" },
  { id: "cosmetic", label: "Cosmetic", note: "The RS4 face, the carbon, the guards." },
  { id: "cabin", label: "Cabin", note: "" },
];

// One entry per line of the list. `pins` are the hotspots; `note` says what
// the part is, in plain terms, and never what it is worth in horsepower.
export const mods = [
  {
    id: "tune",
    anchor: { part: "V6_centre_cover", offset: [0, 0.06, 0.05], box: [0.5, 0.55, 0.8], inBay: true },
    group: "power",
    name: "Stage 2+ Jackal tune",
    brand: "Jackal",
    price: 1100,
    note: "The ECU calibration the rest of the power list is built for: pulley, intake, exhaust and heat exchanger all assume it. Loaded by hand.",
    pins: [{ view: "bay", x: 66, y: 48, label: "Under the cover" }],
  },
  {
    id: "pulley",
    anchor: { part: "V6_front_cover", offset: [0, 0.04, 0.02], box: [0.5, 0.5, 0.88], inBay: true },
    group: "power",
    name: "APR dual pulley",
    brand: "APR",
    price: 550,
    note: "A smaller pulley on the supercharger and a larger one on the crank, so the blower turns faster at any engine speed than it did from the factory.",
    pins: [{ view: "bay", x: 62, y: 63, label: "Front of the supercharger" }],
  },
  {
    id: "intake",
    anchor: { part: "APR_carbon_airbox", offset: [0, 0.05, 0], box: [0.25, 0.46, 0.88], inBay: true },
    group: "power",
    name: "APR carbon fibre intake",
    brand: "APR",
    price: 600,
    note: "The carbon airbox and duct on the left of the bay, feeding the supercharger through the silicone hose.",
    pins: [{ view: "bay", x: 36, y: 67, label: "The carbon box" }],
  },
  {
    id: "coils",
    anchor: { part: "APR_red_ignition_coil", offset: [0.3, 0.04, 0], box: [0.63, 0.5, 0.85], inBay: true },
    group: "power",
    name: "6x APR ignition coils",
    brand: "APR",
    price: 400,
    note: "One per cylinder, under the engine cover, firing the NGK plugs below.",
    pins: [{ view: "bay", x: 46, y: 40, label: "Under the cover, left bank" }],
  },
  {
    id: "plugs",
    anchor: { part: "APR_red_ignition_coil", offset: [-0.3, 0.04, 0], box: [0.37, 0.5, 0.85], inBay: true },
    group: "power",
    name: "6x NGK spark plugs",
    brand: "NGK",
    price: null,
    note: "Six plugs, changed with the coils.",
    pins: [{ view: "bay", x: 57, y: 35, label: "Under the cover, right bank" }],
  },
  {
    id: "heat-exchanger",
    anchor: { part: "intake_central", offset: [0, -0.05, 0.05], box: [0.5, 0.25, 0.98] },
    group: "power",
    name: "MercRacing heat exchanger",
    brand: "MercRacing",
    price: 1100,
    note: "Replaces the stock charge-cooler radiator behind the grille, ahead of the engine's own radiator. It cools the water that cools the supercharged intake air.",
    pins: [
      { view: "front", x: 19, y: 67, label: "Behind the grille" },
      { view: "bay", x: 74, y: 86, label: "Ahead of the radiator" },
    ],
  },
  {
    id: "exhaust",
    anchor: { part: "AWE_exhaust_left_outer", offset: [0.05, 0, -0.05], box: [0.2, 0.2, 0.01] },
    group: "power",
    name: "AWE exhaust and downpipes",
    brand: "AWE",
    price: 3000,
    note: "Downpipes off both banks and the full system back to the quad tips.",
    pins: [{ view: "rear", x: 41, y: 64, label: "Quad tips" }],
  },

  {
    id: "brakes",
    anchor: { part: "fixed_brake_caliper_fl", offset: [0.1, 0.12, -0.1], box: [0.9, 0.3, 0.75] },
    group: "brakes",
    name: "ECS brakes and drilled hubs",
    brand: "ECS",
    price: 5500,
    note: "The brake set and drilled hubs, behind the R8 wheels.",
    pins: [{ view: "wheel", x: 66, y: 52, label: "Caliper and drilled rotor" }],
  },
  {
    id: "suspension",
    anchor: { part: "wheel_fl", offset: [0.02, 0.36, 0], box: [0.9, 0.5, 0.8] },
    group: "suspension",
    name: "ECS RS4 suspension",
    brand: "ECS",
    price: 1300,
    note: "The RS4 suspension set, which is where the ride height in the photographs comes from.",
    pins: [{ view: "front", x: 59, y: 61, label: "Ride height" }],
  },
  {
    id: "wheels",
    anchor: { part: "wheel_fl", offset: [0.1, 0, 0], box: [0.95, 0.25, 0.8] },
    group: "wheels",
    name: "Audi R8 wheels, 20 inch",
    brand: "Audi",
    price: null,
    note: "Twenty-inch Audi R8 wheels with 255/35 R20 tires.",
    pins: [
      { view: "wheel", x: 41, y: 55, label: "Center cap and spokes" },
      { view: "front", x: 58, y: 71, label: "Front left" },
    ],
  },

  {
    id: "front-bumper",
    anchor: { part: "RS4_diagonal_blade.001", offset: [0.02, 0.05, 0.05], box: [0.8, 0.18, 0.96] },
    group: "cosmetic",
    name: "RS4 front bumper",
    brand: "Audi",
    price: 700,
    priceNote: "plus paint match and install",
    note: "The RS4 bumper and honeycomb grille on an S4 body, colour-matched and fitted.",
    pins: [{ view: "front", x: 34, y: 77, label: "The RS4 face" }],
  },
  {
    id: "diffuser",
    anchor: { part: "carbon_rear_diffuser", offset: [0, 0, -0.05], box: [0.5, 0.18, 0.02] },
    group: "cosmetic",
    name: "Rear carbon diffuser",
    brand: null,
    price: 800,
    note: "Carbon diffuser under the rear bumper, around the quad tips.",
    pins: [{ view: "rear", x: 62, y: 64, label: "Under the bumper" }],
  },
  {
    id: "spoiler",
    anchor: { part: "carbon_trunk_spoiler", offset: [0, 0.03, 0], box: [0.5, 0.72, 0.04] },
    group: "cosmetic",
    name: "Carbon trunk spoiler",
    brand: null,
    price: 200,
    note: "A carbon lip on the trunk lid.",
    pins: [{ view: "rear", x: 62, y: 43, label: "Trunk lid" }],
  },
  {
    id: "rear-bumper",
    anchor: { part: "detach_bumper_back_25_carpaint.001", offset: [-0.86, 0.05, 0.2], box: [0.06, 0.36, 0.1] },
    group: "cosmetic",
    name: "Rear bumper, junkyard",
    brand: null,
    price: 250,
    note: "A replacement rear bumper from a junkyard, which is the cheapest line on the list that is not a rain guard.",
    pins: [{ view: "rear", x: 17, y: 59, label: "Rear bumper" }],
  },
  {
    id: "rain-guards",
    anchor: { part: "smoked_rain_guard_rear", offset: [-0.02, 0, 0], box: [0.2, 0.88, 0.34] },
    group: "cosmetic",
    name: "Rain guards",
    brand: null,
    price: 100,
    note: "Window visors on all four doors.",
    pins: [
      { view: "rear", x: 24, y: 36, label: "Rear door" },
      { view: "front", x: 69, y: 50, label: "Front door" },
    ],
  },

  {
    id: "carplay",
    anchor: { at: [0, 1.0, 0.55], box: [0.5, 0.72, 0.62] },
    group: "cabin",
    name: "Apple CarPlay retrofit",
    brand: "Apple",
    price: 400,
    note: "CarPlay retrofitted onto the MMI, the same job as on the 328xi below, with less of the dash out this time.",
    pins: [{ view: "cabin", x: 72, y: 52, label: "On the MMI screen" }],
  },
];

// Lines from the same note that are not modifications. Kept so the page can
// say so rather than quietly dropping them.
export const alsoOnTheList = "Two AC compressors and an MMI button are on the same list. Repairs, not mods, so they are not pinned.";

/** The mods in a group, in list order. */
export const modsIn = (groupId) => mods.filter((m) => m.group === groupId);

/** Every pin, flattened, with its mod attached: what the view renders. */
export const pins = mods.flatMap((m, i) =>
  m.pins.map((p) => ({ ...p, mod: m, index: i })),
);

export const findMod = (id) => mods.find((m) => m.id === id) ?? null;

/** "$700 plus paint match and install", or with `short`, "$700 +" for the
 *  sheet, where the note would wrap the name. */
export const priceLabel = (m, { short = false } = {}) => {
  if (!SHOW_PRICES || m.price == null) return null;
  const n = `$${m.price.toLocaleString("en-US")}`;
  if (!m.priceNote) return n;
  return short ? `${n} +` : `${n} ${m.priceNote}`;
};
