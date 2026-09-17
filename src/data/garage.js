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
// ANCHORS. The 3D bay (GarageModel.jsx) pins the same parts on the model.
// `anchor.part` names a part the model exposes in userData.parts (see
// src/three/s4/notes.md) and the marker sits at its centre, plus `offset` in
// metres; `box` is the fallback, a fraction of the car's bounding box (x from
// the passenger side to the driver's side, y from the floor, z from the tail
// to the nose), used when the model has no part of that name. `inBay` marks
// a part under the bonnet, which the model dims until the bonnet is up.
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
    "The daily. A supercharged S4 I built and tuned myself, and every part on it is on the list I keep. Click a marker, or a line in the sheet.",
};

// The three views. `focus` is where the frame should centre when it has to
// crop: the two phone shots are tall and the car sits low in each.
export const views = [
  {
    id: "front",
    label: "Front",
    image: photo("audi-s4-front"),
    alt: "A grey Audi S4 parked on a city street at night, seen head on, with a honeycomb grille and front lip.",
    date: "May 2026",
    focus: { x: 50, y: 60 },
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
    alt: "A grey Audi S4 parked at night on a residential street, seen from behind, with a rear diffuser, quad tips and the tail lights lit. The registration plate is blurred.",
    date: "April 2026",
    focus: { x: 50, y: 55 },
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
    anchor: { part: "engine_cover", offset: [0, 0.08, -0.22], box: [0.5, 0.72, 0.68], inBay: true },
    group: "power",
    name: "Stage 2+ Jackal tune",
    brand: "Jackal",
    price: 1100,
    note: "The ECU calibration the rest of the power list is built for: pulley, intake, exhaust and heat exchanger all assume it. Loaded by hand.",
    pins: [{ view: "bay", x: 66, y: 48, label: "Under the cover" }],
  },
  {
    id: "pulley",
    anchor: { part: "pulley", box: [0.5, 0.62, 0.86], inBay: true },
    group: "power",
    name: "APR dual pulley",
    brand: "APR",
    price: 550,
    note: "A smaller pulley on the supercharger and a larger one on the crank, so the blower turns faster at any engine speed than it did from the factory.",
    pins: [{ view: "bay", x: 62, y: 63, label: "Front of the supercharger" }],
  },
  {
    id: "intake",
    anchor: { part: "intake_box", box: [0.8, 0.68, 0.72], inBay: true },
    group: "power",
    name: "APR carbon fibre intake",
    brand: "APR",
    price: 600,
    note: "The carbon airbox and duct on the left of the bay, feeding the supercharger through the silicone hose.",
    pins: [{ view: "bay", x: 36, y: 67, label: "The carbon box" }],
  },
  {
    id: "coils",
    anchor: { part: "engine_cover", offset: [0.34, 0.02, 0.05], box: [0.63, 0.76, 0.66], inBay: true },
    group: "power",
    name: "6x APR ignition coils",
    brand: "APR",
    price: 400,
    note: "One per cylinder, under the engine cover, firing the NGK plugs below.",
    pins: [{ view: "bay", x: 46, y: 40, label: "Under the cover, left bank" }],
  },
  {
    id: "plugs",
    anchor: { part: "engine_cover", offset: [-0.34, 0.02, 0.05], box: [0.37, 0.76, 0.66], inBay: true },
    group: "power",
    name: "6x NGK spark plugs",
    brand: "NGK",
    price: null,
    note: "Six plugs, changed with the coils.",
    pins: [{ view: "bay", x: 57, y: 35, label: "Under the cover, right bank" }],
  },
  {
    id: "heat-exchanger",
    anchor: { part: "heat_exchanger", box: [0.5, 0.42, 0.97] },
    group: "power",
    name: "MercRacing heat exchanger",
    brand: "MercRacing",
    price: 1100,
    note: "Replaces the stock charge-cooler radiator behind the grille, ahead of the engine's own radiator. It cools the water that cools the supercharged intake air.",
    pins: [
      { view: "front", x: 63, y: 60, label: "Behind the grille" },
      { view: "bay", x: 74, y: 86, label: "Ahead of the radiator" },
    ],
  },
  {
    id: "exhaust",
    anchor: { part: "exhaust_tips", box: [0.5, 0.2, 0.01] },
    group: "power",
    name: "AWE exhaust and downpipes",
    brand: "AWE",
    price: 3000,
    note: "Downpipes off both banks and the full system back to the quad tips.",
    pins: [{ view: "rear", x: 46, y: 68, label: "Quad tips" }],
  },

  {
    id: "brakes",
    anchor: { part: "brake_rr", box: [0.06, 0.25, 0.2] },
    group: "brakes",
    name: "ECS brakes and drilled hubs",
    brand: "ECS",
    price: 5500,
    note: "The brake set and drilled hubs, behind the R8 wheels.",
    pins: [{ view: "rear", x: 79, y: 63, label: "Behind the spokes" }],
  },
  {
    id: "suspension",
    anchor: { part: "wheel_fl", offset: [0, 0.34, 0], box: [0.96, 0.42, 0.8] },
    group: "suspension",
    name: "ECS RS4 suspension",
    brand: "ECS",
    price: 1300,
    note: "The RS4 suspension set, which is where the ride height in the photographs comes from.",
    pins: [{ view: "front", x: 24, y: 68, label: "Ride height" }],
  },
  {
    id: "wheels",
    anchor: { part: "wheel_fl", box: [0.99, 0.25, 0.8] },
    group: "wheels",
    name: "Audi R8 wheels, 20 inch",
    brand: "Audi",
    price: null,
    note: "Twenty-inch R8 wheels on an S4.",
    pins: [
      { view: "front", x: 21, y: 59, label: "Front left" },
      { view: "rear", x: 77, y: 56, label: "Rear right" },
    ],
  },

  {
    id: "front-bumper",
    anchor: { part: "front_bumper", box: [0.5, 0.32, 1.0] },
    group: "cosmetic",
    name: "RS4 front bumper",
    brand: "Audi",
    price: 700,
    priceNote: "plus paint match and install",
    note: "The RS4 bumper and honeycomb grille on an S4 body, colour-matched and fitted.",
    pins: [{ view: "front", x: 44, y: 68, label: "The RS4 face" }],
  },
  {
    id: "diffuser",
    anchor: { part: "diffuser", box: [0.5, 0.15, 0.0] },
    group: "cosmetic",
    name: "Rear carbon diffuser",
    brand: null,
    price: 800,
    note: "Carbon diffuser under the rear bumper, around the quad tips.",
    pins: [{ view: "rear", x: 26, y: 62, label: "Under the bumper" }],
  },
  {
    id: "spoiler",
    anchor: { part: "spoiler", box: [0.5, 0.7, 0.05] },
    group: "cosmetic",
    name: "Carbon trunk spoiler",
    brand: null,
    price: 200,
    note: "A carbon lip on the trunk lid.",
    pins: [{ view: "rear", x: 30, y: 45, label: "Trunk lid" }],
  },
  {
    id: "rear-bumper",
    anchor: { part: "rear_bumper", offset: [-0.55, 0, 0], box: [0.2, 0.38, 0.02] },
    group: "cosmetic",
    name: "Rear bumper, junkyard",
    brand: null,
    price: 250,
    note: "A replacement rear bumper from a junkyard, which is the cheapest line on the list that is not a rain guard.",
    pins: [{ view: "rear", x: 13, y: 57, label: "Rear bumper" }],
  },
  {
    id: "rain-guards",
    anchor: { part: "rain_guard_rl", box: [0.97, 0.86, 0.35] },
    group: "cosmetic",
    name: "Rain guards",
    brand: null,
    price: 100,
    note: "Window visors on all four doors.",
    pins: [{ view: "rear", x: 84, y: 43, label: "Rear door" }],
  },

  {
    id: "carplay",
    anchor: { part: "mmi_screen", box: [0.5, 0.7, 0.42] },
    group: "cabin",
    name: "Apple CarPlay retrofit",
    brand: "Apple",
    price: 400,
    note: "CarPlay retrofitted onto the MMI, the same job as on the 328xi below, with less of the dash out this time.",
    pins: [{ view: "front", x: 47, y: 46, label: "On the MMI, behind the glass" }],
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
