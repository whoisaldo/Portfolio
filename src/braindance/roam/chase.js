// src/braindance/roam/chase.js: the camera behind the car.
//
// It sits behind and above the S4, looking past its roof down the road,
// and swings round after the car's heading a moment late, so a turn shows
// the car's side. A drag swings it round the car by hand and it comes back
// behind when the hand lets go and the car moves on.
//
// It never goes through anything. Each frame the line from the car to
// where the camera wants to be is walked through the map (nav.sight): if a
// wall, a roof or the underside of the deck is in the way the camera comes
// in along the line to just short of it, and if that would put it inside
// the car it goes up instead, over the roof, until the line is clear. It
// comes in at once and goes back out slowly, so a lamp post passing between
// is not a jolt.
//
// With reduced motion the lens does not open with speed and a knock does
// not shake it.
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// How steeply it looks down, by default and at its steepest when the city
// crowds it, and the nearest it comes to the car's middle.
const PITCH = 13 * DEG;
const STEEPER = [0, 14 * DEG, 30 * DEG, 48 * DEG, 66 * DEG];
const NEAR = 3.4;

export function createChase(nav, { reduced = false } = {}) {
  const hand = { yaw: 0, pitch: PITCH, held: false, idle: 9 };
  let yaw = 0;
  let radius = 7.2;
  let out = 7.2;
  let lift = 0;
  let shake = 0;
  let fresh = true;
  const focus = { x: 0, y: 0, z: 0 };
  const want = { x: 0, y: 0, z: 0 };

  return {
    /** Behind the car, now (a spawn, a reset, getting back in). */
    reset(radiusNow = 7.2) {
      hand.yaw = 0;
      hand.pitch = PITCH;
      hand.idle = 9;
      radius = radiusNow;
      lift = 0;
      shake = 0;
      fresh = true;
    },
    drag(dx, dy) {
      hand.yaw -= dx * 0.005;
      hand.pitch = clamp(hand.pitch + dy * 0.004, 3 * DEG, 62 * DEG);
      hand.idle = 0;
    },
    hold(held) {
      hand.held = held;
    },
    zoom(delta) {
      radius = clamp(radius * Math.exp(delta * 0.001), 5, 13);
    },
    /** A knock, metres a second into the wall: the camera feels it. */
    knock(speed) {
      if (!reduced) shake = Math.max(shake, clamp(speed / 14, 0, 1));
    },
    /**
     * This frame's pose for `car` (x, y, z, heading, v). `still` holds the
     * camera where the hand has it (photo mode). Returns the roll to give
     * the picture, radians.
     */
    frame(dt, car, pose, still = false) {
      const speed = Math.abs(car.v);
      // The hand's swing goes back to nothing once the car is under way.
      hand.idle = hand.held || still ? 0 : hand.idle + dt;
      if (!still && !hand.held && hand.idle > 1.2 && speed > 1.5) {
        const back = Math.exp(-dt * 2.4);
        hand.yaw = wrap(hand.yaw) * back;
        hand.pitch = PITCH + (hand.pitch - PITCH) * back;
      }
      const behind = car.heading + Math.PI;
      if (fresh || dt <= 0) yaw = behind;
      else yaw += wrap(behind - yaw) * (1 - Math.exp(-dt * (reduced ? 9 : 5)));
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      focus.x = car.x + fx * 0.3;
      focus.y = car.y + 1.2;
      focus.z = car.z + fz * 0.3;
      const reach = radius + (reduced ? 0 : Math.min(1.4, speed * 0.03));
      // The first pitch, from the hand's up, whose line stays clear far
      // enough out; the last if none does.
      let best = 0;
      let bestAt = 0;
      const az = yaw + hand.yaw;
      for (const more of STEEPER) {
        const pitch = Math.min(80 * DEG, hand.pitch + more);
        want.x = focus.x + Math.sin(az) * Math.cos(pitch) * reach;
        want.y = focus.y + Math.sin(pitch) * reach;
        want.z = focus.z + Math.cos(az) * Math.cos(pitch) * reach;
        const clear = nav.sight(focus, want, 0.3) * reach - 0.3;
        if (clear > best) {
          best = clear;
          bestAt = more;
        }
        if (clear >= Math.min(reach - 0.3, NEAR + more * 3)) break;
      }
      const k = fresh || dt <= 0 ? 1 : 1 - Math.exp(-dt * 6);
      lift += (bestAt - lift) * (bestAt > lift ? 1 - Math.exp(-dt * 14) : k * 0.5);
      if (fresh || dt <= 0) lift = bestAt;
      const pitch = Math.min(80 * DEG, hand.pitch + lift);
      // The line again at the pitch it is at, for how far out it may be.
      want.x = focus.x + Math.sin(az) * Math.cos(pitch) * reach;
      want.y = focus.y + Math.sin(pitch) * reach;
      want.z = focus.z + Math.cos(az) * Math.cos(pitch) * reach;
      const far = Math.max(1.2, nav.sight(focus, want, 0.3) * reach - 0.3);
      // In at once, out slowly.
      if (fresh || far < out) out = far;
      else out += (far - out) * (1 - Math.exp(-dt * 2.8));
      fresh = false;
      pose.position.set(focus.x + Math.sin(az) * Math.cos(pitch) * out, focus.y + Math.sin(pitch) * out, focus.z + Math.cos(az) * Math.cos(pitch) * out);
      // Looking a little ahead of the car, so it sits low in the frame.
      const lead = 1.6 + Math.min(3, speed * 0.06);
      pose.target.set(car.x + fx * lead, car.y + 1.05, car.z + fz * lead);
      pose.fov = 55 + (reduced ? 0 : Math.min(8, speed * 0.16));
      pose.shift = 0;
      shake *= Math.exp(-dt * 9);
      return shake > 0.01 ? Math.sin(performance.now() * 0.09) * shake * 0.012 : 0;
    },
  };
}
