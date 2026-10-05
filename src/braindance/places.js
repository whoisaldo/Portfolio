// src/braindance/places.js: where each clue is, and when.
//
// The words are in src/data/braindance.js; this is the other half: the
// stretch of the recording a clue can be scanned in, and the box in the
// world it occupies, which the layers effect lights and the scanner hits.
// A box is one of:
//
//   car     a box in the car's own frame (x right, y up, z forward), so
//           the engine bay stays on the engine bay while the car drives
//   world   a box in the world, from the kit's own meshes and empties
//   track   a box that follows a named object in the scene (the koi)
//
// `sound` and `heat` put a source into the audio and thermal layers: where
// the rings run out from, or what glows. Times are seconds into the
// recording, mostly from the recording's own marks, so a camera moved
// there moves the windows with it.
import * as THREE from "three";
import { bar, boardWindow, DURATION, HOLO_AT } from "./recording.js";
import { towers as TOWERS } from "../data/world.js";
import { featuredProjects } from "../data/projects.js";

const END = DURATION;

// Boxes in the car's frame: centre and size, metres.
const ENGINE = { c: [0, 0.78, 1.55], s: [1.6, 0.62, 1.3] };
const CAR_BOX = {
  whole: { c: [0, 0.7, 0], s: [2.1, 1.48, 4.9] },
  engine: ENGINE,
  driver: { c: [-0.38, 0.95, -0.1], s: [0.62, 0.8, 0.8] },
  exhaust: { c: [0, 0.38, -2.3], s: [1.7, 0.42, 0.62] },
  intake: { c: [-0.55, 0.85, 1.6], s: [0.6, 0.4, 0.8] },
  wheelFL: { c: [-0.82, 0.36, 1.4], s: [0.38, 0.76, 0.78] },
  wheelFR: { c: [0.82, 0.36, 1.4], s: [0.38, 0.76, 0.78] },
  face: { c: [0, 0.55, 2.3], s: [1.95, 0.62, 0.4] },
  rear: { c: [0, 0.6, -2.28], s: [1.95, 0.62, 0.4] },
};

const around = (c, s, pad = 0.6) => ({ min: c.map((v, i) => v - s[i] / 2 - pad), max: c.map((v, i) => v + s[i] / 2 + pad) });

/** Every clue's place: id -> { at, box, sound?, heat? }. */
export function createPlaces(anchors, recording) {
  const at = (name) => anchors.get(name)?.position;
  const passes = recording.towerPasses();
  const P = {};

  // ---- 0 Jack in: the car at the curb ----
  P.s4 = { at: [1.5, bar(0)], box: { car: CAR_BOX.whole } };
  P.whine = { at: [3, bar(0)], box: { car: ENGINE }, sound: { car: ENGINE.c, r: 14, k: 1 } };
  P.driver = { at: [3, bar(0)], box: { car: CAR_BOX.driver }, heat: { car: CAR_BOX.driver.c, r: 0.5, k: 0.9 } };

  // ---- 1 The avenue ----
  P.kiro = { at: [21.3, bar(4)], box: { world: around([-11.3, 8.4, -21], [4.9, 8.5, 2.9], 0.4) } };
  P.arcade = { at: [bar(0), bar(4.5)], box: { world: around([13.2, 9.5, -54.9], [1.1, 6, 0.8], 0.6) } };
  P.crowd = { at: [bar(1), bar(8)], box: { world: { min: [9.6, 0, -112], max: [13.6, 2.4, -36] } }, sound: { world: [11.6, 1.6, -72], r: 22, k: 1 } };
  P.phone = { at: [bar(3.5), bar(8)], box: { world: around([11.4, 1.25, -121], [0.4, 0.4, 0.4], 0.4) }, heat: { world: [11.4, 1.25, -121], r: 0.5, k: 1.1 } };

  // ---- 2 The plaza: the board's schedule ----
  const board = around([79, 26, -263], [27, 18, 0.4], 0.8);
  featuredProjects.forEach((p, i) => {
    P[p.slug] = { at: boardWindow(i), box: { world: board } };
  });
  P.radio = { at: [bar(11), bar(25)], box: { world: board }, sound: { world: [79, 26, -261], r: 40, k: 1 } };
  P.gpu = { at: [bar(11), bar(25)], box: { world: around([44.4, 22, -240], [0.6, 2.4, 3.2], 0.3) }, heat: { world: [44.4, 22, -240], r: 2.2, k: 1.1 } };

  // ---- 3 Corpo row: each tower from the moment the car is level with it ----
  TOWERS.forEach((tw) => {
    const a = at(`anchor_tower_${tw.slug}`);
    if (!a) return;
    const top = (a.y ?? 140) + 6;
    const from = (passes[tw.slug] ?? bar(25)) - 2.5;
    P[tw.slug] = { at: [Math.max(bar(25), from), bar(35)], box: { world: { min: [a.x - 12.5, 0, -373], max: [a.x + 12.5, top, -347] } } };
  });
  const philips = at("anchor_tower_philips-zero-touch") ?? new THREE.Vector3(150, 0, -360);
  P.room = { at: [bar(25), bar(29)], box: { world: { min: [philips.x - 12.5, 0, -373], max: [philips.x + 12.5, 14, -347] } }, sound: { world: [philips.x, 5, -350], r: 26, k: 1 } };
  const paw = at("anchor_tower_pawtograder") ?? new THREE.Vector3(226, 0, -360);
  P.grader = { at: [bar(26), bar(35)], box: { world: { min: [paw.x - 12.5, 0, -373], max: [paw.x + 12.5, 22, -347] } }, heat: { world: [paw.x, 9, -349], r: 9, k: 1 } };

  // ---- 4 The roof ----
  P.ripperdoc = { at: [bar(35), bar(43)], box: { world: around([457, 38.4, -283], [7.1, 2.2, 5.6], 0.5) } };
  P.attributes = { at: [bar(35), bar(43)], box: { world: around([431.3, 38, -281], [1, 3, 13], 0.6) } };
  P.stack = { at: [bar(43), bar(46)], box: { world: around([410.4, 61, -236], [1, 2.6, 12], 1) } };
  P.signal = { at: [bar(35), bar(46)], box: { world: around([462, 40, -300], [2.4, 4, 2.4], 0.4) }, sound: { world: [462, 41, -300], r: 18, k: 1 } };
  P.agents = { at: [bar(35), bar(46)], box: { world: around([452, 37.4, -277], [3, 1.6, 2], 0.4) }, heat: { world: [452, 37.4, -277], r: 1.8, k: 1.1 } };

  // ---- 5 Bay 01 ----
  const inBay = bar(53);
  P.face = { at: [inBay, bar(64)], box: { car: CAR_BOX.face } };
  P.wheels = { at: [inBay, bar(64)], box: { car: CAR_BOX.wheelFL } };
  P.rear = { at: [inBay, bar(64)], box: { car: CAR_BOX.rear } };
  P.bmw = { at: [inBay, bar(64)], box: { world: around([475.4, 3.5, -215], [0.2, 1.9, 3.4], 0.3) } };
  P.exhaust = { at: [bar(49), bar(64)], box: { car: CAR_BOX.exhaust }, sound: { car: CAR_BOX.exhaust.c, r: 10, k: 1 } };
  P.intake = { at: [inBay, bar(64)], box: { car: CAR_BOX.intake }, sound: { car: CAR_BOX.intake.c, r: 6, k: 0.8 } };
  P.tune = { at: [inBay, bar(64)], box: { car: ENGINE }, heat: { car: ENGINE.c, r: 0.9, k: 0.5 } };
  P.brakes = { at: [inBay, bar(64)], box: { car: CAR_BOX.wheelFR }, heat: { car: CAR_BOX.wheelFR.c, r: 0.45, k: 0.8 } };

  // ---- 6 The moon ----
  P.couple = { at: [bar(65), END], box: { moon: true } };
  P.contact = { at: [HOLO_AT + 0.8, END], box: { holo: true } };
  P.boston = { at: [bar(65), END], box: { world: { min: [490, 0, -200], max: [640, 70, -40] } }, heat: { world: [560, 20, -120], r: 60, k: 0.35 } };

  // ---- secrets ----
  P.koi = { at: [0, bar(8)], box: { track: ["koi_0", "koi_1"] }, secret: true };
  P.tag = { at: [0, bar(0)], box: { world: { min: [4.6, -0.2, -42], max: [6.8, 0.35, -38] } }, secret: true };
  P.morse = { at: [bar(35), bar(46)], box: { world: around([470, 39.5, -291], [1, 2, 1], 0.5) }, sound: { world: [470, 40, -291], r: 9, k: 0.7 }, secret: true };

  return P;
}

/** The heat a car always gives off: engine, exhaust, brakes by speed, driver. */
export const CAR_HEAT = [
  { car: [0, 0.75, 1.5], r: 1.15, k: 0.75 },
  { car: [0, 0.35, -2.35], r: 0.55, k: 0.9 },
  { car: [-0.82, 0.36, 1.4], r: 0.42, k: 0.25, brakes: true },
  { car: [0.82, 0.36, 1.4], r: 0.42, k: 0.25, brakes: true },
  { car: [-0.82, 0.36, -1.4], r: 0.42, k: 0.2, brakes: true },
  { car: [0.82, 0.36, -1.4], r: 0.42, k: 0.2, brakes: true },
  { car: [-0.38, 0.95, -0.1], r: 0.45, k: 0.6 },
];
