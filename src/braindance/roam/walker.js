// src/braindance/roam/walker.js: on foot.
//
// First person: an eye 1.65 m over a pair of feet, turned by the mouse,
// moved by W A S D, faster with Shift. The feet stand on the map (nav.js):
// a circle of 0.3 m that is moved off every column they cannot stand on,
// so a wall is slid along. Where the way is narrower than that (a stair
// 0.9 m wide between a screen and a wall, the gap between two stalls) the
// walker turns his shoulders: a narrower circle is tried, down to one that
// only needs the columns round his feet. What they can stand on is ground
// within a step of where they are (WALK_STEP, 0.4 m, both ways): a kerb
// and a stair's tread are steps, a planter's edge and a ledge are not, so
// nobody climbs what a person could not and nobody walks off an edge.
// There is no falling to do.
//
// The eye rides the ground smoothed between the columns round it, so a
// stair is a slope under it, and bobs a little with each step (not with
// reduced motion).
import { WALK, WALK_STEP } from "./nav.js";

export const BODY = 0.3;
const EYE = 1.65;
const WALKING = 2.3; // m/s
const RUNNING = 5.6;
const STEP = 0.12; // metres a step of the simulation may cover
const TOL = WALK_STEP + 0.02;
// Shoulders square, turned, and sideways.
const WIDTHS = [BODY, 0.21, 0.13];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createWalker(nav, { reduced = false } = {}) {
  const w = {
    x: 0,
    y: 0,
    z: 0,
    // Which way the eye looks: yaw as the car's heading (0 faces +z), pitch up.
    yaw: 0,
    pitch: 0,
    speed: 0,
    touching: false,
    // Metres walked, for the steps' sound.
    walked: 0,
  };
  let vx = 0;
  let vz = 0;
  let eyeY = 0;
  let bob = 0;
  const p = { x: 0, z: 0, nx: 0, nz: 0 };

  /** Stand at (x, z) near height y, looking along `yaw`. False if there is
   *  no ground there for feet. */
  const place = (x, z, yaw, y = 0) => {
    const h = nav.floor(x, z, y, WALK, 1.2);
    if (h !== h) return false;
    w.x = x;
    w.z = z;
    w.y = h;
    w.yaw = yaw;
    w.pitch = 0;
    w.speed = 0;
    w.touching = false;
    vx = vz = bob = 0;
    eyeY = h + EYE;
    return true;
  };

  /** One frame. `input`: ahead and side (-1..1 each, side + to the right),
   *  run. */
  const step = (dt, input) => {
    w.touching = false;
    if (dt <= 0) return w;
    const fx = Math.sin(w.yaw);
    const fz = Math.cos(w.yaw);
    const len = Math.hypot(input.ahead, input.side) || 1;
    const pace = input.run && input.ahead > 0 ? RUNNING : WALKING;
    // Right is (-fz, fx).
    const wantX = ((fx * input.ahead - fz * input.side) / len) * pace * (input.ahead || input.side ? 1 : 0);
    const wantZ = ((fz * input.ahead + fx * input.side) / len) * pace * (input.ahead || input.side ? 1 : 0);
    const k = 1 - Math.exp(-dt * 11);
    vx += (wantX - vx) * k;
    vz += (wantZ - vz) * k;
    const moving = Math.hypot(vx, vz);
    if (moving < 0.02 && !input.ahead && !input.side) vx = vz = 0;
    const steps = clamp(Math.ceil((moving * dt) / STEP), 1, 10);
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      const x0 = w.x;
      const z0 = w.z;
      // Held to the floor the feet are on now, as wide as there is room for.
      let hit = 0;
      for (const width of WIDTHS) {
        p.x = w.x + vx * h;
        p.z = w.z + vz * h;
        hit = nav.resolve(p, width, w.y, WALK, TOL, true);
        if (hit !== 2) break;
      }
      if (hit === 2) {
        vx = vz = 0;
        w.touching = true;
        break;
      }
      if (hit) {
        w.touching = true;
        // What was carried into the wall comes off.
        const into = vx * p.nx + vz * p.nz;
        if (into < 0) {
          vx -= into * p.nx;
          vz -= into * p.nz;
        }
      }
      // The floor under the feet where that leaves them; none (a corner the
      // circle could not be worked out of) and the step is not taken.
      const floor = nav.floor(p.x, p.z, w.y, WALK, TOL);
      if (floor !== floor) {
        vx = vz = 0;
        w.touching = true;
        break;
      }
      w.x = p.x;
      w.z = p.z;
      w.y = floor;
      w.walked += Math.hypot(w.x - x0, w.z - z0);
    }
    w.speed = Math.hypot(vx, vz);
    // The eye: the ground smoothed between columns, followed quickly.
    const ground = nav.ground(w.x, w.z, w.y, WALK, TOL);
    const at = (ground === ground ? ground : w.y) + EYE;
    eyeY += (at - eyeY) * (1 - Math.exp(-dt * 14));
    bob = reduced ? 0 : Math.sin(w.walked * (w.speed > 3.5 ? 2.6 : 3.4)) * Math.min(1, w.speed / WALKING) * (w.speed > 3.5 ? 0.045 : 0.028);
    return w;
  };

  return {
    w,
    place,
    step,
    /** The mouse: dx to the right turns right, dy down looks down. */
    look(dx, dy, rate = 0.0022) {
      w.yaw -= dx * rate;
      w.pitch = clamp(w.pitch - dy * rate, -1.45, 1.45);
    },
    /** The eye's pose this frame. */
    pose(pose) {
      const cp = Math.cos(w.pitch);
      pose.position.set(w.x, eyeY + bob, w.z);
      pose.target.set(w.x + Math.sin(w.yaw) * cp, eyeY + bob + Math.sin(w.pitch), w.z + Math.cos(w.yaw) * cp);
      pose.fov = 68;
      pose.shift = 0;
    },
    get eyeY() {
      return eyeY;
    },
  };
}
