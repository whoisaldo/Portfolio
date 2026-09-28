// src/world/shots.js: where the camera stands for each section, and how it
// gets from one to the next.
//
// A shot is a position, a target and a lens. The positions are empties in the
// Blender scene, exported in the world GLB and handed in here as `anchors`
// (name -> { position, quaternion }), so moving `cam_projects` in Blender
// moves the Work shot on the site. What a position cannot say lives in
// src/data/world.js: the lens, the dim, how the shot moves while it holds.
//
// Two shots are not anchors. The hero is the intro's drift camera, computed
// from the viewport exactly as drift-scene.js always has, because the page
// arrives over the frame the drift ends on and any difference would be a cut.
// The garage is GarageModel's `front` preset, re-expressed in the car's bay:
// the flight ends where the interactive viewer begins.
//
// Between two shots the camera flies. In the open it goes up, across and
// down: a cubic whose inner control points stand above the two shots, so it
// rises out of a street before it travels and travels before it descends
// into the next one, lifted by at least an arc proportional to the distance
// and by whatever the city under its line needs (src/world/clearance.js
// knows how tall every block is). Where no height would do (down off the
// rooftop into a street, in at the garage door, out of it) the flight names
// its waypoints instead, empties in the kit, and the camera runs a
// centripetal Catmull-Rom curve through them at an even speed, looking at
// the shot it is heading for, or at the car when the flight follows it. The
// easing is symmetric so the middle of the flight, where the glitch peaks,
// is the middle of the scroll.
import * as THREE from "three";
import { SHOTS, GARAGE_FRONT } from "../data/world.js";

const DEG = Math.PI / 180;
const APEX_Z = 5.6;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const _a1 = new THREE.Vector3();
const _a2 = new THREE.Vector3();
const _a3 = new THREE.Vector3();
const _b1 = new THREE.Vector3();
const _b2 = new THREE.Vector3();

/** One segment of a centripetal Catmull-Rom curve (Barry and Goldman),
 *  from p1 to p2 at u in 0..1, written into `out`. */
function catmullRom(p0, p1, p2, p3, u, out) {
  const t0 = 0;
  const t1 = t0 + Math.max(1e-4, Math.sqrt(p0.distanceTo(p1)));
  const t2 = t1 + Math.max(1e-4, Math.sqrt(p1.distanceTo(p2)));
  const t3 = t2 + Math.max(1e-4, Math.sqrt(p2.distanceTo(p3)));
  const t = t1 + (t2 - t1) * u;
  const mix = (o, a, b, ta, tb) => o.copy(a).multiplyScalar((tb - t) / (tb - ta)).addScaledVector(b, (t - ta) / (tb - ta));
  mix(_a1, p0, p1, t0, t1);
  mix(_a2, p1, p2, t1, t2);
  mix(_a3, p2, p3, t2, t3);
  mix(_b1, _a1, _a2, t0, t2);
  mix(_b2, _a2, _a3, t1, t3);
  return mix(out, _b1, _b2, t1, t2);
}

/** A camera pose: where it is, what it looks at, and its lens. */
export function makePose() {
  return { position: new THREE.Vector3(), target: new THREE.Vector3(), fov: 30 };
}

export function copyPose(out, p) {
  out.position.copy(p.position);
  out.target.copy(p.target);
  out.fov = p.fov;
  return out;
}

/**
 * The drift's end camera for a viewport of `aspect`, from drift-scene.js:
 * at the apex the car spans about two thirds of a landscape screen and the
 * whole of a portrait one, and the camera backs off until it does.
 */
export function heroPose(aspect, out = makePose()) {
  const frac = aspect < 1 ? 1.05 : aspect < 1.3 ? 0.82 : 0.66;
  const dist = 4.6 / (2 * frac * Math.tan(15 * DEG) * aspect);
  out.position.set(0.6, 0.8 + 0.12 * dist, APEX_Z + dist);
  out.target.set(-0.4, 0.7, 1.8);
  out.fov = 30;
  return out;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _one = new THREE.Vector3(1, 1, 1);

/**
 * GarageModel's front preset, in the world: the preset is in car space (the
 * car faces +Z, rests on y = 0), so it is carried by the bay anchor's
 * position and heading. On a portrait screen garage-scene.js looks at the
 * car's middle and stands 1.2 times further back; so does this.
 */
export function garagePose(bay, aspect, out = makePose()) {
  out.position.fromArray(GARAGE_FRONT.position);
  out.target.fromArray(GARAGE_FRONT.target);
  if (aspect < 1) {
    out.target.z = 0;
    out.position.sub(out.target).multiplyScalar(1.2).add(out.target);
  }
  _m.compose(bay.position, bay.quaternion, _one);
  out.position.applyMatrix4(_m);
  out.target.applyMatrix4(_m);
  out.fov = GARAGE_FRONT.fov;
  return out;
}

/**
 * Shot poses from anchors. `anchors` maps a node name to
 * { position: Vector3, quaternion: Quaternion }; `clearance` is the city's
 * height field (optional).
 */
export function createShots(anchors, clearance = null) {
  const has = (name) => anchors.has(name);
  const at = (name) => anchors.get(name).position;

  // A shot that moves while it holds reads its `_b` anchors: the camera
  // slides from cam_x to cam_x_b (a dolly) and the target from cam_x_target
  // to cam_x_target_b (a pan when the camera does not move).
  const anchored = (id, local, aspect, out) => {
    const cam = `cam_${id}`;
    const tgt = `cam_${id}_target`;
    const shot = SHOTS[id] || {};
    out.position.copy(at(cam));
    out.target.copy(at(tgt));
    if (shot.move) {
      const t = easeInOut(clamp(local, 0, 1));
      if (has(`${cam}_b`)) out.position.lerp(at(`${cam}_b`), t);
      if (has(`${tgt}_b`)) out.target.lerp(at(`${tgt}_b`), t);
    }
    out.fov = shot.fov ?? 40;
    // Portrait: a phone sees a third of the width, so stand further back and
    // open the lens a little, rather than crop the shot to its middle.
    if (aspect < 1) {
      const back = shot.portraitBack ?? 1.35;
      out.position.sub(out.target).multiplyScalar(back).add(out.target);
      out.fov = Math.min(62, out.fov * (shot.portraitFov ?? 1.3));
    }
    return out;
  };

  const poseOf = (id, local, aspect, out) => {
    if (id === "hero") return heroPose(aspect, out);
    if (id === "garage") return garagePose(anchors.get("anchor_garage_bay"), aspect, out);
    return anchored(id, local, aspect, out);
  };

  const A = makePose();
  const B = makePose();
  const _c = new THREE.Vector3();
  const _end = new THREE.Vector3();
  const pts = [];
  const ghostA = new THREE.Vector3();
  const ghostB = new THREE.Vector3();
  const cum = [];

  // A point `e` (0..1, by distance) along the curve through `pts`.
  const along = (e, out) => {
    const n = pts.length;
    cum.length = n;
    cum[0] = 0;
    for (let k = 1; k < n; k++) cum[k] = cum[k - 1] + pts[k].distanceTo(pts[k - 1]);
    const total = cum[n - 1] || 1;
    const d = clamp(e, 0, 1) * total;
    let k = 0;
    while (k < n - 2 && cum[k + 1] < d) k++;
    const u = clamp((d - cum[k]) / Math.max(1e-6, cum[k + 1] - cum[k]), 0, 1);
    const p0 = k === 0 ? ghostA.copy(pts[0]).multiplyScalar(2).sub(pts[1]) : pts[k - 1];
    const p3 = k + 2 >= n ? ghostB.copy(pts[n - 1]).multiplyScalar(2).sub(pts[n - 2]) : pts[k + 2];
    return catmullRom(p0, pts[k], pts[k + 1], p3, u, out);
  };

  /**
   * The camera's goal for a stage position. `ids` are the shot ids in page
   * order, `locals` their progress, `focus` where the car is (a flight that
   * follows it looks at it). Writes into `out`, returns the flight's
   * progress (0 while holding, peaking at 1 mid-flight) for the glitch.
   */
  const goal = (ids, position, locals, aspect, out, focus = null) => {
    const n = ids.length;
    if (!n) return 0;
    const i = clamp(Math.floor(position), 0, n - 1);
    const j = Math.min(i + 1, n - 1);
    const f = clamp(position - i, 0, 1);
    poseOf(ids[i], locals[i] ?? 0, aspect, A);
    if (j === i || f <= 0) {
      copyPose(out, A);
      return 0;
    }
    poseOf(ids[j], locals[j] ?? 0, aspect, B);
    const e = easeInOut(f);
    out.fov = A.fov + (B.fov - A.fov) * e;

    // A flight with named waypoints: through them, looking at the next
    // shot's target (or at the car) in the middle, and at the two shots' own
    // targets at the ends.
    const into = SHOTS[ids[j]]?.via?.in;
    const vias = (Array.isArray(into) ? into : into ? [into] : []).filter(has);
    if (vias.length) {
      pts.length = 0;
      pts.push(A.position, ...vias.map(at), B.position);
      along(e, out.position);
      _end.copy(A.target).lerp(B.target, e);
      const follows = SHOTS[ids[j]]?.follow && focus;
      if (follows) _c.copy(focus).setY(focus.y + 0.9);
      else _c.copy(B.target);
      const w = smoothstep(0, 0.3, e) * (1 - smoothstep(0.72, 1, e));
      out.target.copy(_end).lerp(_c, w);
      return Math.sin(Math.PI * f);
    }

    // In the open: up, across and down.
    const d = A.position.distanceTo(B.position);
    let h = clamp(d * 0.19, 0, 47);
    if (clearance && d > 1) {
      for (let k = 1; k < 32; k++) {
        const t = k / 32;
        const w = t * t * (3 - 2 * t);
        const x = A.position.x + (B.position.x - A.position.x) * w;
        const z = A.position.z + (B.position.z - A.position.z) * w;
        // Right beside either shot the camera is where that shot put it.
        const nearA = Math.hypot(x - A.position.x, z - A.position.z);
        const nearB = Math.hypot(x - B.position.x, z - B.position.z);
        if (Math.min(nearA, nearB) < 12) continue;
        const base = A.position.y * (1 - w) + B.position.y * w;
        h = Math.max(h, (clearance.at(x, z) + 8 - base) / (3 * t * (1 - t)));
      }
      h = Math.min(h, 240);
    }
    const w = e * e * (3 - 2 * e);
    out.position.lerpVectors(A.position, B.position, w);
    out.position.y += 3 * e * (1 - e) * h;
    // The eye turns to the next shot early, so the middle of a flight looks
    // at where it is going rather than down at the roofs it is crossing.
    out.target.copy(A.target).lerp(B.target, smoothstep(0, 0.65, e));
    return Math.sin(Math.PI * f);
  };

  return { poseOf, goal };
}
