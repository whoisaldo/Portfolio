// src/three/drift/path.js: the intro drift's path, and where the car parks.
//
// Moved here out of src/lib/drift-scene.js so the city behind the page
// (src/world) and the intro's flat-plate fallback drive the one path. The
// keys, the spline and poseAt() below are the original code, byte for byte:
// scripts/check-drift.mjs evaluates this module and the original from git
// at the same 1,083 samples and fails if a single value differs for the
// first 3.8 seconds.
//
// After those 3.8 seconds the original kept going along its end tangent
// into the haze. In the live city the car parks instead: parkingCurve()
// leaves from the spline's own end state (the same position, the same
// velocity, so the join is C1) and joins the road the car drives for the
// rest of the page, and coastToStop() brings it to rest at the hero's curb
// mark. It is a separate curve on purpose: appending a key to the natural
// spline would re-solve its tridiagonal system and move every earlier
// segment.

// ---------------------------------------------------------------------------
// The path. Seconds after the drop, x (right), z (toward the camera), and the
// slip angle in degrees: how far the nose points past the direction of
// travel. Negative slip is a right-hand drift, which is what this is: the
// car comes in from the right travelling left and toward the lens, the rear
// steps out toward the camera with the smoke and the tail lights, and at the
// apex, on WIPE_START, it is nearly broadside a few metres from the lens.
// Then it hooks up and powers away up the road, toward the skyline, getting
// smaller as it goes, so it is still in frame for every second of the wipe.
// An earlier path launched it out of the left edge instead, and a car that
// close to a camera clears the frame in half a second: the page was bare
// two seconds before the hero was due.
// ---------------------------------------------------------------------------
const KEYS = [
  [0.0, 17.0, -2.5, 0],
  [0.4, 8.5, 0.8, -12],
  [0.75, 3.0, 3.4, -33],
  [1.1, 0.6, 5.0, -44],
  [1.4, -1.0, 5.6, -47],
  [1.9, -3.4, 4.2, -36],
  [2.5, -6.0, 0.6, -14],
  [3.1, -7.6, -5.5, -3],
  [3.8, -8.5, -14.0, 0],
];
const APEX_Z = 5.6;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (p) => p * p * (3 - 2 * p);
const deg = Math.PI / 180;

// ---------------------------------------------------------------------------
// How the keys become motion.
//
// The first cut ran a Catmull-Rom curve through the key positions and mapped
// time onto it a segment at a time, with the slip eased between keys on its
// own. That put the car on every key on its beat and moved it badly in
// between: a curve's speed is a property of its shape, not of the clock, so
// the car's velocity jumped at every key (by 40% at the apex); the curve's
// tangent wobbled through the short segments around the apex, so the yaw
// rate swung between +90 and -300 degrees a second a few metres from the
// lens; and the eased slip stopped and restarted its swing at every key.
// Measured at 60 fps, the yaw rate changed by 200 degrees a second between
// two consecutive frames. That was the hitch in the drift.
//
// Now x, z and slip are each a cubic spline in TIME through the same keys.
// Position is C2, so the velocity the heading is read from is smooth and the
// yaw is smooth with it; slip is clamped flat at both ends so it arrives at
// and leaves zero without a kink. The choreography is unchanged: the car is
// at every key on the same beat, and the path between them is within a few
// centimetres of the old one. Before the first key and after the last the
// car continues along the end tangent at the end speed, which is how it
// arrives at speed and how it leaves without the dead stop the old curve
// ended in.
// ---------------------------------------------------------------------------

/**
 * A cubic spline through (t[i], y[i]). Natural by default (zero curvature at
 * both ends, and it continues straight beyond them); `flat` clamps the slope
 * to zero at both ends and holds the end values beyond them.
 *
 * Returns an evaluator that writes the value and its time derivative into
 * `out`, so the frame loop allocates nothing.
 */
function spline(t, y, flat = false) {
  const n = t.length;
  const h = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) h[i] = t[i + 1] - t[i];
  // Tridiagonal solve for the second-derivative coefficients c[i].
  const mu = new Float64Array(n);
  const z = new Float64Array(n);
  const c = new Float64Array(n);
  if (flat) {
    mu[0] = 0.5;
    z[0] = ((3 * (y[1] - y[0])) / h[0]) / (2 * h[0]);
  }
  for (let i = 1; i < n - 1; i++) {
    const alpha = (3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1]);
    const l = 2 * (t[i + 1] - t[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l;
    z[i] = (alpha - h[i - 1] * z[i - 1]) / l;
  }
  if (flat) {
    const alpha = (-3 * (y[n - 1] - y[n - 2])) / h[n - 2];
    const l = h[n - 2] * (2 - mu[n - 2]);
    z[n - 1] = (alpha - h[n - 2] * z[n - 2]) / l;
    c[n - 1] = z[n - 1];
  }
  const b = new Float64Array(n - 1);
  const d = new Float64Array(n - 1);
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (y[j + 1] - y[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }
  const hl = h[n - 2];
  const vEnd = flat ? 0 : b[n - 2] + 2 * c[n - 2] * hl + 3 * d[n - 2] * hl * hl;
  const v0 = flat ? 0 : b[0];
  return (x, out) => {
    if (x <= t[0]) {
      out.v = y[0] + v0 * (x - t[0]);
      out.dv = v0;
      return out;
    }
    if (x >= t[n - 1]) {
      out.v = y[n - 1] + vEnd * (x - t[n - 1]);
      out.dv = vEnd;
      return out;
    }
    let i = 0;
    while (i < n - 2 && x >= t[i + 1]) i++;
    const s = x - t[i];
    out.v = y[i] + b[i] * s + c[i] * s * s + d[i] * s * s * s;
    out.dv = b[i] + 2 * c[i] * s + 3 * d[i] * s * s;
    return out;
  };
}

const TIMES = KEYS.map((k) => k[0]);
const pathX = spline(TIMES, KEYS.map((k) => k[1]));
const pathZ = spline(TIMES, KEYS.map((k) => k[2]));
const pathSlip = spline(TIMES, KEYS.map((k) => k[3] * deg), true);
const _x = { v: 0, dv: 0 };
const _z = { v: 0, dv: 0 };
const _s = { v: 0, dv: 0 };
const _pose = { x: 0, z: 0, heading: 0, slip: 0, speed: 0 };

/**
 * Position, heading, slip and speed at `d` seconds after the drop. Heading
 * is the direction of travel; the car's yaw is heading plus slip.
 *
 * `xScale` squeezes the path sideways for narrow viewports. The keys were
 * laid out for a 16:10 screen; on a phone the frustum is a third as wide,
 * and a car that recedes to x = -8.5 there has left through the side of
 * the frame long before it is far enough away to be small.
 */
function poseAt(d, xScale = 1) {
  pathX(d, _x);
  pathZ(d, _z);
  pathSlip(d, _s);
  const vx = _x.dv * xScale;
  const vz = _z.dv;
  _pose.x = _x.v * xScale;
  _pose.z = _z.v;
  _pose.heading = Math.atan2(vx, vz);
  _pose.slip = _s.v;
  _pose.speed = Math.hypot(vx, vz);
  return _pose;
}

export { KEYS, APEX_Z, clamp, smooth, deg, spline, poseAt };

// ---------------------------------------------------------------------------
// After the drift.
// ---------------------------------------------------------------------------

/** Where the spline hands over to the parking curve, seconds after the drop. */
export const PARK_FROM = 3.8;

const _ex = { v: 0, dv: 0 };
const _ez = { v: 0, dv: 0 };

/**
 * The curve from where the drift ends to `to` ({ x, z, tx, tz }: a point and
 * the unit direction the car should be travelling when it gets there), for a
 * viewport's `xScale`. A cubic Bezier: out along the spline's own end
 * tangent, in along `to`'s, each handle a third of the way, so the car leaves
 * the spline at its end position, heading and speed (C1 at PARK_FROM).
 *
 * Returns { length, speed, at(s, out) }: `speed` is the spline's speed at
 * PARK_FROM and at() writes { x, z, heading } for s metres along.
 */
export function parkingCurve(xScale, to) {
  pathX(PARK_FROM, _ex);
  pathZ(PARK_FROM, _ez);
  const x0 = _ex.v * xScale;
  const z0 = _ez.v;
  const vx = _ex.dv * xScale;
  const vz = _ez.dv;
  const speed = Math.hypot(vx, vz);
  const reach = Math.hypot(to.x - x0, to.z - z0) / 3;
  const x1 = x0 + (vx / speed) * reach;
  const z1 = z0 + (vz / speed) * reach;
  const x2 = to.x - to.tx * reach;
  const z2 = to.z - to.tz * reach;
  const N = 256;
  const lens = new Float64Array(N + 1);
  const bez = (t, out) => {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    out.x = a * x0 + b * x1 + c * x2 + d * to.x;
    out.z = a * z0 + b * z1 + c * z2 + d * to.z;
    const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (to.x - x2);
    const dz = 3 * u * u * (z1 - z0) + 6 * u * t * (z2 - z1) + 3 * t * t * (to.z - z2);
    out.heading = Math.atan2(dx, dz);
    return out;
  };
  const p = { x: x0, z: z0, heading: 0 };
  let px = x0;
  let pz = z0;
  for (let i = 1; i <= N; i++) {
    bez(i / N, p);
    lens[i] = lens[i - 1] + Math.hypot(p.x - px, p.z - pz);
    px = p.x;
    pz = p.z;
  }
  const length = lens[N];
  return {
    length,
    speed,
    at(s, out) {
      const d = clamp(s, 0, length);
      let lo = 0;
      let hi = N;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (lens[mid] <= d) lo = mid;
        else hi = mid;
      }
      const f = (d - lens[lo]) / Math.max(1e-9, lens[hi] - lens[lo]);
      return bez((lo + f) / N, out);
    },
  };
}

/**
 * Distance and speed `t` seconds into a stop: a car doing `v0` covers
 * `length` metres and comes to rest at the end, holding its speed and then
 * braking evenly over the last `brake` metres, so it arrives rather than
 * crawls. Writes { s, v } into `out`; `duration` is when it stops.
 */
export function coastToStop(v0, length, brake = 22) {
  const b = Math.min(brake, length);
  const cruise = length - b;
  const tCruise = cruise / v0;
  const tBrake = (2 * b) / v0;
  const decel = v0 / Math.max(1e-6, tBrake);
  return {
    duration: tCruise + tBrake,
    at(t, out) {
      if (t <= tCruise) {
        out.s = Math.max(0, v0 * t);
        out.v = v0;
        return out;
      }
      const tb = Math.min(tBrake, t - tCruise);
      out.s = cruise + v0 * tb - 0.5 * decel * tb * tb;
      out.v = Math.max(0, v0 - decel * tb);
      return out;
    },
  };
}
