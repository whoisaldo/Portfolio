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
// Between two shots the camera flies. The path is a quadratic curve from one
// pose to the next, lifted over the rooftops by an arc proportional to the
// distance, or bent through a named waypoint when the straight line would go
// through a wall (into the garage, out of it). The easing is symmetric so the
// middle of the flight, where the glitch peaks, is the middle of the scroll.
import * as THREE from "three";
import { SHOTS, GARAGE_FRONT } from "../data/world.js";

const DEG = Math.PI / 180;
const APEX_Z = 5.6;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
 * { position: Vector3, quaternion: Quaternion }.
 */
export function createShots(anchors) {
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
  const _v = new THREE.Vector3();

  /**
   * The camera's goal for a stage position. `ids` are the shot ids in page
   * order, `locals` their progress. Writes into `out`, returns the flight's
   * progress (0 while holding, peaking at 1 mid-flight) for the glitch.
   */
  const goal = (ids, position, locals, aspect, out) => {
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

    // The control point: through a named waypoint when this flight has one,
    // otherwise the midpoint lifted by an arc that clears the rooftops.
    const via = SHOTS[ids[j]]?.via?.in ?? SHOTS[ids[i]]?.via?.out;
    if (via && has(via)) {
      // A quadratic curve through the waypoint at its middle.
      _c.copy(at(via)).multiplyScalar(2).sub(_v.copy(A.position).add(B.position).multiplyScalar(0.5));
    } else {
      const d = A.position.distanceTo(B.position);
      _c.copy(A.position).add(B.position).multiplyScalar(0.5);
      _c.y += clamp(d * 0.28, 0, 70);
    }
    const u = 1 - e;
    out.position.copy(A.position).multiplyScalar(u * u)
      .addScaledVector(_c, 2 * u * e)
      .addScaledVector(B.position, e * e);
    out.target.copy(A.target).lerp(B.target, e);
    out.fov = A.fov + (B.fov - A.fov) * e;
    return Math.sin(Math.PI * f);
  };

  return { poseOf, goal };
}
