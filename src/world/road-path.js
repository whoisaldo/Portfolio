// src/world/road-path.js: the road the car drives, by distance.
//
// Blender samples the road once a metre into the `points` extra on the
// road_spline empty. This turns that polyline into something the car can
// drive by arc length: where it is at u metres, which way it points, how
// hard it is turning (for the front wheels), and the reverse, the distance
// along the road nearest a point (for projecting the anchors the car waits
// at).
import * as THREE from "three";

export function createRoad(flat) {
  const pts = [];
  for (let i = 0; i + 2 < flat.length; i += 3) pts.push(new THREE.Vector3(flat[i], flat[i + 1], flat[i + 2]));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const length = cum[cum.length - 1] || 0;

  const seg = (u) => {
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= u) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  /** Position at distance u (clamped to the road). */
  const pointAt = (u, out = new THREE.Vector3()) => {
    if (!pts.length) return out.set(0, 0, 0);
    const d = Math.min(length, Math.max(0, u));
    const i = Math.min(seg(d), pts.length - 2);
    const t = (d - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]);
    return out.copy(pts[i]).lerp(pts[i + 1], t);
  };

  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  /** Unit direction of travel at u, averaged over a couple of metres. */
  const tangentAt = (u, out = new THREE.Vector3()) => {
    pointAt(u - 1.5, _a);
    pointAt(u + 1.5, _b);
    return out.subVectors(_b, _a).normalize();
  };

  const _t0 = new THREE.Vector3();
  const _t1 = new THREE.Vector3();
  /** Signed curvature (1/m) at u: positive turning left. */
  const curvatureAt = (u) => {
    tangentAt(u - 3, _t0);
    tangentAt(u + 3, _t1);
    const cross = _t0.x * _t1.z - _t0.z * _t1.x;
    return -cross / 6;
  };

  /** The distance along the road nearest to `p`. */
  const nearest = (p) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - p.x;
      const dz = pts[i].z - p.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = cum[i];
      }
    }
    return best;
  };

  return { length, pointAt, tangentAt, curvatureAt, nearest, points: pts };
}
