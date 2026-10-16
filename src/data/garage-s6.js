// src/data/garage-s6.js: the S6, and the five things on it that are not stock.
//
// The second car in the garage, in the shape src/data/garage.js gives the S4
// (car, views, groups, mods), so the same controls render either.
//
// SOURCE. Ali's own words, 2026-10-16: a 2013 Audi S6, grey, on a Stage 1
// Integrated Engineering ECU and TCU tune, running Virtual Link, the lowering
// module he is lead engineer on at Pinnatec. The front photograph shows the
// gloss black RS-style honeycomb grille. The seller's list added one line that
// counts as a modification, the rsNAV head unit; the $800 beside it is the
// seller's figure, not Ali's, so it is not shown. Everything else on that list
// (the rebuilt engine and transmission, tyres, mileage, history, unnamed
// "handling mods") is left out on Ali's instruction, because none of it is a
// mod. C7, pre-facelift, the 4.0 TFSI twin-turbo V8, S tronic and quattro are
// what every 2013 S6 left the factory with.
//
// There is no output figure for this car anywhere, because none was given.
// 540 whp is the S4's number and stays on the S4. No engine code either: the
// one in the first brief was wrong, and the right one is not confirmed for
// this car. The paint is "grey" because that is what Ali said; the nearest
// factory colour is a modelling guess, not a fact to print.
//
// PRICES. Every price is null. SHOW_PRICES in garage.js still governs both
// cars, so if Ali prices a line later it shows the same way the S4's do.
//
// PINS. Percentages of the upright photograph (src/data/garage-s6-photos.js),
// read off full-size crops, like the S4's. Two of the five are pinned: the
// grille, and the ECU tune on the engine it calibrates, with a caption that
// says so. The TCU tune, Virtual Link and the head unit are software, a
// module and a screen that no photograph shows, so they have no pin and no
// close crop. They are still on the list.
//
// ANCHORS. The 3D workshop pins each mod to an empty in Ali's S6 model, named
// in A1's node contract (mod_ie_ecu_tune and the rest), so a marker follows
// the part it belongs to when the body is lowered or the hood opens. `pose`
// is the inspection the workshop flies to for it: the engine bay, the stance
// view where Virtual Link is demonstrated, the cabin, or the front.
import { s6Photo } from "./garage-s6-photos";

export const car = {
  id: "s6",
  name: "Audi S6 C7",
  year: "2013",
  engine: "4.0 TFSI V8, twin-turbo",
  drivetrain: "S tronic, quattro",
  lede:
    "The second car. A pre-facelift C7 S6 in grey, the 4.0 twin-turbo V8 with S tronic and quattro. Five things on it are not stock, and one of them is Virtual Link, the lowering module I am lead engineer on at Pinnatec.",
  outputNote: "There is no power figure for this one, so the page does not give one.",
};

export const views = [
  {
    id: "front",
    label: "Front",
    image: s6Photo("s6-front"),
    alt: "My grey Audi S6 head-on in a parking lot on an overcast day: the gloss black honeycomb grille with black rings and the quattro script, the LED running lights, silver mirror caps, and no front plate.",
    date: null,
    focus: { x: 54, y: 62 },
  },
  {
    id: "rear",
    label: "Rear",
    image: s6Photo("s6-rear"),
    alt: "My S6 and my S4 parked side by side at night, seen from behind: the S6 on the left with its tail lamps lit and its four oval tips under the bumper, the S4 on the right. Both plates are blurred.",
    date: null,
    focus: { x: 22, y: 52 },
  },
  {
    id: "bay",
    label: "Engine bay",
    image: s6Photo("s6-engine-bay"),
    alt: "The S6's engine bay with the engine cover off: the two turbochargers in the V of the 4.0 TFSI in gold heat wrap, the charge pipes running forward from them, and the coolant tank with its blue cap.",
    date: null,
    focus: { x: 50, y: 45 },
  },
];

export const groups = [
  { id: "software", label: "Software", note: "Two calibrations. No parts to see." },
  { id: "stance", label: "Stance", note: "" },
  { id: "cabin", label: "Cabin", note: "" },
  { id: "exterior", label: "Exterior", note: "" },
];

export const mods = [
  {
    id: "ie-ecu-tune",
    group: "software",
    name: "Stage 1 Integrated Engineering ECU tune",
    brand: "Integrated Engineering",
    price: null,
    note: "Integrated Engineering's Stage 1 calibration on the engine computer. It is software, so nothing under the hood looks different; the bay is shown for the engine it runs.",
    pins: [{ view: "bay", x: 48, y: 36, label: "The engine it calibrates", caption: "Engine context, not a photo of the tune" }],
    anchor: { part: "mod_ie_ecu_tune", inBay: true },
    pose: "bay",
  },
  {
    id: "ie-tcu-tune",
    group: "software",
    name: "Stage 1 Integrated Engineering TCU tune",
    brand: "Integrated Engineering",
    price: null,
    note: "The matching Stage 1 calibration on the S tronic's transmission computer, also from Integrated Engineering. Software again, so there is no photograph of it.",
    pins: [],
    anchor: { part: "mod_ie_tcu_tune", inBay: true },
    pose: "bay",
  },
  {
    id: "virtual-link",
    group: "stance",
    name: "Virtual Link",
    brand: "Pinnatec",
    price: null,
    note: "Pinnatec's app-controlled lowering module, on the car's air suspension. I lead the Virtual Link app, backend and firmware work.",
    // Shown beside the Normal and Lowered states in 3D. The drop on the model
    // is there to show what the module does, not to state a ride height.
    demoNote: "Normal and Lowered show what the module does. The drop on the model is illustrative, not a measured ride height.",
    pins: [],
    anchor: { part: "mod_virtual_link" },
    pose: "stance",
  },
  {
    id: "rsnav-head-unit",
    group: "cabin",
    name: "rsNAV head unit",
    brand: "rsNAV",
    price: null,
    note: "An aftermarket rsNAV head unit in the dash. It came with the car. There is no photograph of it yet.",
    pins: [],
    anchor: { part: "mod_rsnav_head_unit" },
    pose: "cabin",
  },
  {
    id: "rs-grille",
    group: "exterior",
    name: "Gloss black RS-style grille",
    brand: null,
    price: null,
    note: "An aftermarket honeycomb grille in gloss black, RS style, with black rings and the quattro script in the lower frame.",
    pins: [{ view: "front", x: 54, y: 70, label: "The honeycomb and rings" }],
    anchor: { part: "mod_rs_grille" },
    pose: "front",
  },
];
