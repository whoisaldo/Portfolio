// src/braindance/recording.js: the braindance itself, as choreography.
//
// A braindance is a recorded memory you can play, pause, scrub and walk
// around in. This one is a night in the city, cut to the song (I Really Want
// to Stay at Your House, 246.8 s, 85 bpm): every chapter starts on a section
// of it, and every camera move inside a chapter turns on its bars. The
// recording is a pure function of time, so scrubbing, rewinding and a paused
// orbit all agree on where everything was.
//
// Three tracks:
//
//   the car    the S4's distance along the road the city's car drives
//              (road_spline in the kit, 835 m from the hero's curb to the
//              garage bay), eased between marks. Between marks it waits.
//   the camera a list of shots. Each holds a span of the song and is one of
//              a few kinds: fixed, move, path, chase (the car's own frame),
//              orbit. A shot either cuts in (the braindance's glitch at the
//              cut) or blends from the one before it over `blend` seconds.
//   the city   which project the plaza's board shows, which towers on corpo
//              row are lit, how far the garage door is up.
//
// Positions are metres in the world GLB's space, read off the kit's own
// empties where one exists (cam_*, anchor_*), so a camera moved in Blender
// still lands here as it does on the page.
import * as THREE from "three";
import { makePose, copyPose, clamp, easeInOut } from "../world/shots.js";
import { towers as TOWERS, boards as BOARDS } from "../data/world.js";

export const DURATION = 246.78;
// 85 bpm: a bar is 2.8235 s, and the drop at 30.1 s sits on the grid.
export const BAR = (60 / 85) * 4;
export const bar = (n) => 30.1 + n * BAR;

/**
 * The chapters: the song's sections. `pivot` is what the editor orbits
 * when the recording is paused, and the limits keep the orbit inside the
 * part of the set that was built to be looked at.
 */
export const CHAPTERS = [
  { id: "jackin", t: 0, pivot: "car", orbit: { radius: [4, 14], pitch: [3, 40] } },
  { id: "avenue", t: 30.1, pivot: "car", orbit: { radius: [5, 22], pitch: [3, 45] } },
  { id: "plaza", t: bar(11), pivot: [79, 14, -228], orbit: { radius: [18, 60], pitch: [2, 40], yaw: [180, 75] } },
  { id: "corpo", t: bar(25), pivot: "car", orbit: { radius: [8, 40], pitch: [3, 50] } },
  { id: "roof", t: bar(35), pivot: [452, 37, -270], orbit: { radius: [8, 30], pitch: [3, 45], yaw: [70, 80] } },
  { id: "garage", t: bar(49), pivot: "car", orbit: { radius: [3.6, 8], pitch: [2, 35] } },
  { id: "moon", t: bar(64), pivot: [456, 10, -203], orbit: { radius: [4, 20], pitch: [0, 40], yaw: [50, 70] } },
  { id: "end", t: bar(75), pivot: [456, 10, -203], orbit: { radius: [4, 20], pitch: [0, 40], yaw: [50, 70] } },
];

/** The holocall: it rings, then connects over the garage roof. */
export const HOLO_AT = bar(67) + 0.8;
export const HOLO_RING = HOLO_AT - 2.6;

export function chapterAt(t) {
  let i = 0;
  while (i + 1 < CHAPTERS.length && t >= CHAPTERS[i + 1].t) i++;
  return i;
}

// ---- the car ------------------------------------------------------------------
// Distances along the road (src/world/car.js's stops): the curb is 0, the
// plaza 209, corpo row runs 416 to 644 (Philips to Northeastern), the
// rooftop's street 758, the bay 835.
const CAR = [
  { t: [30.4, 60.4], u: [0, 209], ease: "cruise" },
  { t: [bar(25), bar(35) - 1], u: [392, 702], ease: "cruise" },
  { t: [bar(35), bar(38)], u: [716, 757.6], ease: "out" },
  // Off the rooftop's mark and round into Bay 01, parked as the tubes strike.
  { t: [bar(46) + 0.6, bar(53) + 0.6], u: [757.6, 834.9], ease: "inout" },
];

// A cruise: up to speed over the first eighth, steady, and down to the
// mark over the last eighth, so the speed is constant through the middle.
const cruise = (p) => {
  const a = 0.125;
  const v = 1 / (1 - a);
  if (p < a) return (v * p * p) / (2 * a);
  if (p > 1 - a) return 1 - (v * (1 - p) * (1 - p)) / (2 * a);
  return v * (p - a / 2);
};
const EASE = {
  linear: (p) => p,
  inout: easeInOut,
  in: (p) => p * p * p,
  out: (p) => 1 - Math.pow(1 - p, 3),
  cruise,
  // Smooth in and out but gentler than the cubic.
  sine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * p),
};

export function carU(t) {
  let u = CAR[0].u[0];
  for (const seg of CAR) {
    if (t < seg.t[0]) break;
    const p = clamp((t - seg.t[0]) / (seg.t[1] - seg.t[0]), 0, 1);
    u = seg.u[0] + (seg.u[1] - seg.u[0]) * EASE[seg.ease](p);
  }
  return u;
}

// ---- the board and the towers ---------------------------------------------------------
// The plaza's board flips through the Work deck, one entry every
// BOARD_SLOT seconds from the chorus.
export const BOARD_FROM = bar(11);
export const BOARD_SLOT = (bar(25) - bar(11)) / BOARDS.length;
export function boardAt(t) {
  if (t < BOARD_FROM) return 0;
  return clamp(Math.floor((t - BOARD_FROM) / BOARD_SLOT), 0, BOARDS.length - 1);
}
/** The window each project is on the board: [from, to] seconds. */
export function boardWindow(index) {
  const t0 = BOARD_FROM + index * BOARD_SLOT;
  return [t0, t0 + BOARD_SLOT];
}

// ---- the camera ---------------------------------------------------------------------
// The last shot's aim from the garage roof: the moon right of the middle
// and clear of the minimap's corner, the holocall on the left.
const MOON_LOOK = [511.5, 38.3, -124.6];
// Car frame: x right, y up, z forward. World: metres, the kit's axes.
const SHOTS = [
  // 0 Jack in. The recorder's view first: over the hood, up the avenue,
  // as the city builds out from the car. Then off the car and round it,
  // the nose, the avenue, and the tail lights waiting for the drop.
  { t: [0, 6.2], kind: "chase", offset: [0, 1.2, 0.7], offsetTo: [0, 1.22, 0.95], look: [0, 1.05, 16], fov: [54, 50] },
  { t: [6.2, 13.4], kind: "orbit", centre: "car", look: [0, 0.75, 0.4], radius: [7.2, 5.6], height: [1.0, 1.35], angle: [-150, -95], fov: [34, 32], blend: 2.6 },
  { t: [13.4, 19.5], kind: "chase", offset: [-3.2, 0.6, 5.6], offsetTo: [-2.5, 0.55, 4.9], look: [0.15, 0.62, 0.3], fov: [34, 32], cut: true },
  { t: [19.5, 25.5], kind: "move", from: { position: [-0.6, 1.4, 4], target: [3, 1.2, -60], fov: 46 }, to: "cam_hero", fov: 50, shift: 0.12, ease: "out", cut: true },
  { t: [25.5, 30.1], kind: "chase", offset: [1.7, 0.5, -4.6], offsetTo: [1.3, 0.52, -4.0], look: [0, 0.62, 0], fov: [34, 32], cut: true },
  // 1 The avenue. The drop: the car pulls off and past the lens, then the
  // chase down the strip, round it, and through the turn into the plaza,
  // seen arriving from across the square.
  { t: [30.1, bar(2)], kind: "fixed", position: [3.6, 0.55, -52], target: "car", lookOffset: [0, 0.8, 0], fov: [38, 42] },
  { t: [bar(2), bar(5)], kind: "chase", offset: [-1.9, 1.0, -7.5], offsetTo: [-1.4, 0.85, -6.2], look: [0.3, 0.9, 6], fov: [44, 42], cut: true },
  { t: [bar(5), bar(8)], kind: "orbit", centre: "car", look: [0, 0.9, 1.5], radius: [7.5, 6.2], height: [1.5, 1.1], angle: [-120, -50], fov: [40, 36], ease: "sine", cut: true },
  { t: [bar(8), bar(9.5)], kind: "chase", offset: [-2.2, 1.6, -8.5], offsetTo: [-1.6, 2.0, -8.0], look: [0, 1, 6], fov: 44, cut: true },
  { t: [bar(9.5), bar(11)], kind: "fixed", position: [90, 2.2, -199], target: "car", lookOffset: [0, 1, 0], fov: [42, 38], cut: true },
  // 2 The plaza. The board, from the Work shot, over the car's roof, and
  // round the square, then up out of it toward corpo row's crowns.
  { t: [bar(11), bar(15)], kind: "fixed", position: "cam_projects", target: "cam_projects_target", fov: 38, push: 6, cut: true },
  { t: [bar(15), bar(18.5)], kind: "move", from: { position: [83, 1.3, -170], target: [79, 11, -263], fov: 42 }, to: { position: [81.5, 1.9, -172.5], target: [79, 14, -263], fov: 40 }, ease: "sine", cut: true },
  { t: [bar(18.5), bar(22)], kind: "path", points: [[40, 22, -208], [60, 17, -214], [98, 17, -214], [118, 22, -208]], look: [79, 24, -263], fov: 44, ease: "sine", cut: true },
  { t: [bar(22), bar(25)], kind: "move", from: { position: [79, 14, -226], target: [79, 25, -263], fov: 36 }, to: { position: [84, 64, -226], target: [200, 105, -360], fov: 46 }, ease: "inout", blend: 1.2 },
  // 3 Corpo row. Alongside the car under the towers, then in front of it,
  // then from the end of the row as it comes to the corner.
  { t: [bar(25), bar(28.5)], kind: "chase", offset: [-6, 1.5, 7], offsetTo: [1, 1.7, 7], look: [3, 1, -1], lookTo: [14, 75, -36], lookBlend: [0.55, 1], fov: [50, 54], frame: "world", cut: true },
  { t: [bar(28.5), bar(32)], kind: "chase", offset: [1.8, 1.2, 8.5], offsetTo: [1.3, 1.1, 7.2], look: [0, 1.0, 0], lookTo: [-20, 40, -30], lookBlend: [0.5, 1], fov: [40, 46], cut: true },
  { t: [bar(32), bar(35)], kind: "fixed", position: [450, 9, -333], target: { w: [300, 42, -352] }, fov: [46, 40], push: 6, cut: true },
  // 4 The roof. The roof itself, the signs, the stack's pan across the row,
  // then down in the street as the car pulls off for the garage.
  { t: [bar(35), bar(39)], kind: "fixed", position: "cam_about", target: "cam_about_target", fov: [44, 40], push: 4, orbitDrift: -5, cut: true },
  { t: [bar(39), bar(43)], kind: "move", from: { position: [470, 39.5, -262], target: [450, 38, -285], fov: 42 }, to: { position: [465, 38.9, -266], target: [448, 38.6, -288], fov: 42 }, ease: "sine", cut: true },
  { t: [bar(43), bar(46)], kind: "move", from: { position: "cam_stack", target: "cam_stack_target", fov: 42 }, to: { position: "cam_stack", target: [380, 42, -246], fov: 42 }, ease: "sine", cut: true },
  { t: [bar(46), bar(49)], kind: "chase", offset: [-1.8, 3.2, -9], offsetTo: [-1.4, 2.4, -8], look: [0, 1, 9], fov: [46, 44], cut: true },
  // 5 Bay 01. In after the car through the door, round it under the tubes,
  // and in close.
  { t: [bar(49), bar(55)], kind: "path", points: ["cam_garage_street", "cam_garage_across", "cam_garage_door", "cam_garage_in", "cam_garage_swing", "cam_garage"], look: "car", lookOffset: [0, 0.9, 0], lookTo: "cam_garage_target", lookBlend: [0.8, 1], fov: 48, ease: "sine" },
  { t: [bar(55), bar(60)], kind: "orbit", centre: "car", look: [0, 0.75, 0], radius: [6.4, 5.8], height: [1.5, 1.1], angle: [40, 160], fov: [40, 38], ease: "sine", blend: 1.5 },
  { t: [bar(60), bar(63)], kind: "orbit", centre: "car", look: [0, 0.5, 1.4], radius: [3.4, 3.1], height: [0.45, 0.6], angle: [-20, 14], fov: [30, 28], ease: "sine", cut: true },
  { t: [bar(63), bar(64)], kind: "chase", offset: [1.1, 0.75, -3.4], offsetTo: [0.6, 0.8, -2.9], look: [0, 0.7, 0], fov: 30, cut: true },
  // 6 The moon. Up from the street onto the garage roof, the moon over the
  // city, and the call that comes in.
  { t: [bar(64), bar(67)], kind: "path", points: [[432, 3, -222], [440, 6.5, -214], "cam_contact_via", "cam_contact"], look: { w: MOON_LOOK }, fov: 40, ease: "inout" },
  { t: [bar(67), bar(75)], kind: "fixed", position: "cam_contact", target: { w: MOON_LOOK }, fov: 40, push: 2 },
  // 7 End of recording.
  { t: [bar(75), DURATION + 1], kind: "fixed", position: "cam_contact", target: { w: MOON_LOOK }, fov: 40, push: 0.6, blend: 0.4 },
];

export const SHOT_COUNT = SHOTS.length;

export function createRecording(anchors, road) {
  const at = (name) => anchors.get(name)?.position;
  const vec = (v, out) => (typeof v === "string" ? out.copy(at(v) ?? out.set(0, 0, 0)) : out.fromArray(v));

  // The car at time t: where, which way, how fast.
  const car = { u: 0, v: 0, position: new THREE.Vector3(), forward: new THREE.Vector3(), right: new THREE.Vector3(), heading: 0 };
  const _t = new THREE.Vector3();
  const placeCar = (t) => {
    const u = carU(t);
    car.v = (carU(t + 0.05) - carU(t - 0.05)) / 0.1;
    car.u = u;
    road.pointAt(u, car.position);
    road.tangentAt(u, _t);
    car.heading = Math.atan2(_t.x, _t.z);
    car.forward.set(Math.sin(car.heading), 0, Math.cos(car.heading));
    car.right.set(-Math.cos(car.heading), 0, Math.sin(car.heading));
    return car;
  };
  const inCar = (v, out) => out.copy(car.position).addScaledVector(car.right, v[0]).add(_up.set(0, v[1], 0)).addScaledVector(car.forward, v[2]);
  const _up = new THREE.Vector3();

  // Centripetal Catmull-Rom through a path shot's points, by distance,
  // built once per shot.
  const curves = new Map();
  const curveOf = (shot) => {
    if (!curves.has(shot)) {
      const c = new THREE.CatmullRomCurve3(shot.points.map((q) => vec(q, new THREE.Vector3())), false, "centripetal");
      c.arcLengthDivisions = 400;
      c.updateArcLengths();
      curves.set(shot, c);
    }
    return curves.get(shot);
  };

  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _e = new THREE.Vector3();
  const A = makePose();
  const B = makePose();
  const range = (v, p) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * p : v);

  // Where a shot looks: a kit empty, a world point, or the car.
  const target = (shot, which, p, out) => {
    // A fixed shot on a kit camera with no target looks at its own target.
    const own = typeof shot.position === "string" ? `${shot.position}_target` : undefined;
    const look = which === 0 ? shot.look ?? shot.target ?? own : shot.lookTo;
    if (look === "car" || (shot.target === "car" && which === 0)) return out.copy(car.position).add(_d.fromArray(shot.lookOffset ?? [0, 0.8, 0]));
    if (typeof look === "string") return vec(look, out);
    if (look && look.w) return out.fromArray(look.w);
    if (Array.isArray(look) && shot.kind === "chase" && shot.frame !== "world") return inCar(look, out);
    if (Array.isArray(look) && shot.kind === "chase") return inCar([0, 0, 0], out).add(_d.fromArray(look));
    if (Array.isArray(look) && shot.kind === "orbit") return out.copy(orbitCentre(shot)).add(_d.fromArray(look));
    if (Array.isArray(look)) return out.fromArray(look);
    return out.copy(car.position);
  };
  const _centre = new THREE.Vector3();
  const orbitCentre = (shot) => (shot.centre === "car" ? _centre.copy(car.position) : _centre.fromArray(shot.centre));

  /** One shot's pose at its own progress p (0..1, already eased). */
  const shotPose = (shot, p, out) => {
    out.fov = range(shot.fov ?? 40, p);
    out.shift = shot.shift ?? 0;
    switch (shot.kind) {
      case "fixed": {
        vec(shot.position, out.position);
        target(shot, 0, p, out.target);
        if (shot.push) {
          _a.subVectors(out.target, out.position).normalize();
          out.position.addScaledVector(_a, shot.push * p);
        }
        if (shot.orbitDrift) {
          _a.subVectors(out.position, out.target);
          _a.applyAxisAngle(_up.set(0, 1, 0), ((shot.orbitDrift * Math.PI) / 180) * (p - 0.5));
          out.position.copy(out.target).add(_a);
        }
        break;
      }
      case "move": {
        const from = shot.from;
        const to = shot.to;
        vec(from.position, A.position);
        vec(from.target, A.target);
        if (typeof to === "string") {
          vec(to, B.position);
          vec(`${to}_target`, B.target);
        } else {
          vec(to.position, B.position);
          vec(to.target, B.target);
        }
        out.position.lerpVectors(A.position, B.position, p);
        out.target.lerpVectors(A.target, B.target, p);
        const f0 = from.fov ?? 40;
        const f1 = typeof to === "string" ? shot.fov ?? f0 : to.fov ?? f0;
        out.fov = f0 + (f1 - f0) * p;
        out.shift = (shot.shift ?? 0) * p;
        break;
      }
      case "dolly": {
        out.position.fromArray(shot.from).lerp(_a.fromArray(shot.to), p);
        target(shot, 0, p, out.target);
        break;
      }
      case "path": {
        curveOf(shot).getPointAt(clamp(p, 0, 1), out.position);
        target(shot, 0, p, out.target);
        break;
      }
      case "chase": {
        const o = shot.offsetTo ? _b.fromArray(shot.offset).lerp(_c.fromArray(shot.offsetTo), p) : _b.fromArray(shot.offset);
        if (shot.frame === "world") out.position.copy(car.position).add(o);
        else inCar(o.toArray(), out.position);
        target(shot, 0, p, out.target);
        break;
      }
      case "orbit": {
        const c = _e.copy(orbitCentre(shot));
        const r = range(shot.radius, p);
        const h = range(shot.height, p);
        const a = (range(shot.angle, p) * Math.PI) / 180;
        // Angles from the car's nose (0) round to its right (90): the
        // car's own frame when it is the centre, the world's -z otherwise.
        const f = shot.centre === "car" ? car.forward : _a.set(0, 0, -1);
        const rt = shot.centre === "car" ? car.right : _c.set(1, 0, 0);
        out.position.copy(c).addScaledVector(f, Math.cos(a) * r).addScaledVector(rt, Math.sin(a) * r);
        out.position.y = c.y + h;
        target(shot, 0, p, out.target);
        break;
      }
      default:
        break;
    }
    // A second target the shot turns to over `lookBlend`.
    if (shot.lookTo) {
      const [b0, b1] = shot.lookBlend ?? [0, 1];
      const k = EASE.sine(clamp((p - b0) / Math.max(1e-3, b1 - b0), 0, 1));
      if (k > 0) out.target.lerp(target(shot, 1, p, _d.clone()), k);
    }
    return out;
  };

  const progress = (shot, t) => {
    const p = clamp((t - shot.t[0]) / (shot.t[1] - shot.t[0]), 0, 1);
    return EASE[shot.ease ?? "linear"](p);
  };

  const shotIndex = (t) => {
    let i = 0;
    while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].t[0]) i++;
    return i;
  };

  const prev = makePose();
  /**
   * Everything the recording says about time t. `out` is reused: pose,
   * car { u, v }, board, towers, garage, glitch, chapter, shot, focus.
   */
  const evaluate = (t, out) => {
    placeCar(t);
    const i = shotIndex(t);
    const shot = SHOTS[i];
    shotPose(shot, progress(shot, t), out.pose);
    const since = t - shot.t[0];
    // Blended in from the shot before, still moving on its own clock.
    if (i > 0 && shot.blend && since < shot.blend) {
      const before = SHOTS[i - 1];
      shotPose(before, progress(before, t), prev);
      const k = EASE.inout(since / shot.blend);
      out.pose.position.lerpVectors(prev.position, out.pose.position, k);
      out.pose.target.lerpVectors(prev.target, out.pose.target, k);
      out.pose.fov = prev.fov + (out.pose.fov - prev.fov) * k;
      out.pose.shift = prev.shift + (out.pose.shift - prev.shift) * k;
    }
    // A cut lands with the braindance's glitch; a chapter's first cut harder.
    const cut = i > 0 && (shot.cut || CHAPTERS.some((c) => Math.abs(c.t - shot.t[0]) < 0.01));
    out.glitch = cut && since >= 0 ? Math.exp(-since * 7) * (since < 0.06 ? 1 : 0.85) : 0;
    out.shot = i;
    out.chapter = chapterAt(t);
    out.car.u = car.u;
    out.car.v = car.v;
    out.carPosition.copy(car.position);
    out.carHeading = car.heading;
    out.board = boardAt(t);
    out.towers = litTowers(t);
    out.garage.door = clamp((t - (bar(49) + 0.4)) / 3.6, 0, 1);
    out.garage.tubes = t >= bar(53) + 0.4;
    out.mirror = 1 - clamp((out.pose.position.y - 6) / 22, 0, 1);
    return out;
  };

  // A tower lights as the car comes level with it and stays lit for the
  // rest of the row; from the roof on, the whole row stays up.
  const towerX = TOWERS.map((tw) => at(`anchor_tower_${tw.slug}`)?.x ?? 0);
  const lit = [];
  const litTowers = (t) => {
    lit.length = 0;
    if (t < bar(25)) return lit;
    const cx = car.position.x;
    TOWERS.forEach((tw, k) => {
      if (t >= bar(35) || cx > towerX[k] - 26) lit.push(tw.slug);
    });
    return lit;
  };

  /** When the car is level with each tower: { slug: seconds }. */
  const towerPasses = () => {
    const out = {};
    TOWERS.forEach((tw, k) => {
      for (let t = bar(25); t < bar(35); t += 0.05) {
        placeCar(t);
        if (car.position.x >= towerX[k]) {
          out[tw.slug] = t;
          break;
        }
      }
    });
    return out;
  };

  const frame = () => ({
    pose: makePose(),
    car: { u: 0, v: 0 },
    carPosition: new THREE.Vector3(),
    carHeading: 0,
    garage: { door: 0, tubes: false },
    towers: [],
    board: 0,
    glitch: 0,
    mirror: 0,
    chapter: 0,
    shot: 0,
  });

  return { evaluate, frame, carAt: placeCar, towerPasses, copyPose };
}
