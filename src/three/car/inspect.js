// src/three/car/inspect.js: a car parked in the garage, as the garage
// inspects it.
//
// The garage (src/world/garage-cars.js) shows both cars close up, hood open
// and, on the S6, the body brought down on Virtual Link. This is what that
// needs from a rigged root (src/three/car/object.js) that the road's car
// does not: where each part's marker hangs on the node that carries it, read
// before slim() merges the names away; how far the body can come down before
// it meets a tyre or the floor, measured on the model rather than assumed;
// and a phone's car in fewer triangles, prepared once from the one source in
// slices between the page's frames.
import * as THREE from "three";
import { INSPECT_RIG } from "./slim.js";

const _box = new THREE.Box3();
// A node by its name as Blender wrote it or as three's loader keeps it
// (without the dots: "blade.001" is "blade001").
const named = (car, name) => (name ? car.getObjectByName(name) ?? car.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)) : null);
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

/** The node that carries `node` when the rig moves: the nearest of the
 *  inspected rig's nodes above it (a wheel, a knuckle, the hood, the body),
 *  or the root. */
export function ownerOf(node, car) {
  for (let p = node; p && p !== car; p = p.parent) if (INSPECT_RIG.includes(p.name)) return p;
  return car;
}

/**
 * Where a part's marker hangs: `{ owner, local, fallback }`, `local` in the
 * owner's own space, so the marker moves with the hood or the body as the
 * part does. `anchor` is one of
 *
 *   { node }               an empty or part of the model, at its origin
 *                          (the S6's mod_* anchors)
 *   { part, offset? }      the centre of a named part (an empty's
 *                          origin), plus a car-space offset (the S4's,
 *                          from src/data/garage.js)
 *   { at: [x, y, z] }      a point in car space, carried by the body
 *   { box: [fx, fy, fz] }  a fraction of the car's bounds, carried by the
 *                          body: a development stand-in, reported as
 *                          `fallback: "box"`
 *
 * tried in that order. Call before slim(): it reads the parts by name.
 */
export function resolveAnchor(car, anchor = {}) {
  car.updateMatrixWorld(true);
  const body = car.getObjectByName("body") ?? car;
  const node = named(car, anchor.node);
  if (node) {
    const owner = ownerOf(node.parent, car);
    return { owner, local: owner.worldToLocal(node.getWorldPosition(new THREE.Vector3())), fallback: null };
  }
  const part = named(car, anchor.part);
  if (part) {
    // The centre of what it draws; an empty's own origin.
    _box.setFromObject(part);
    const p = car.worldToLocal(_box.isEmpty() ? part.getWorldPosition(new THREE.Vector3()) : _box.getCenter(new THREE.Vector3()));
    if (anchor.offset) p.add(_v.fromArray(anchor.offset));
    const owner = ownerOf(part, car);
    return { owner, local: owner.worldToLocal(car.localToWorld(p)), fallback: null };
  }
  if (anchor.at) return { owner: body, local: body.worldToLocal(car.localToWorld(new THREE.Vector3(...anchor.at))), fallback: null };
  const [fx, fy, fz] = anchor.box ?? [0.5, 0.5, 0.5];
  const bounds = localBounds(car);
  const p = new THREE.Vector3(fx, fy, fz).multiply(bounds.getSize(_v)).add(bounds.min);
  return { owner: body, local: body.worldToLocal(car.localToWorld(p)), fallback: "box" };
}

/** The car's bounds in its own space (wheels, mirrors and all). */
export function localBounds(car, into = new THREE.Box3()) {
  car.updateMatrixWorld(true);
  _m.copy(car.matrixWorld).invert();
  into.makeEmpty();
  car.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    into.union(_box.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(_m, o.matrixWorld)));
  });
  return into;
}

/** Every point of every mesh under `root`, in `car`'s space, to `fn`. */
function eachPoint(root, car, fn) {
  _m.copy(car.matrixWorld).invert();
  const toCar = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh) return;
    toCar.multiplyMatrices(_m, o.matrixWorld);
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) fn(_v.fromBufferAttribute(pos, i).applyMatrix4(toCar));
  });
}

/**
 * How far the body can come down, in metres: what is left between the
 * underside of each wheel arch and the top of its tyre, and between the
 * body's lowest point and the floor, less a margin for each (1 cm to a
 * tyre, 5 cm to the floor). The wheels are measured as they are drawn: a
 * tyre is the cylinder its wheel node's bounds describe, and any point of
 * the body over that tyre's tread counts. Call on the unlowered rig, before
 * slim(). `{ limit, tyre, floor }`; `limit` is never negative.
 */
export function loweringRoom(car) {
  car.updateMatrixWorld(true);
  const body = car.getObjectByName("body");
  if (!body) return { limit: 0, tyre: 0, floor: 0 };
  _m.copy(car.matrixWorld).invert();
  const tyres = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"].map((name) => car.getObjectByName(name)).filter(Boolean).map((wheel) => {
    const b = _box.setFromObject(wheel).applyMatrix4(_m);
    return { x0: b.min.x, x1: b.max.x, y: (b.min.y + b.max.y) / 2, z: (b.min.z + b.max.z) / 2, r: (b.max.y - b.min.y) / 2 };
  });
  let tyre = Infinity;
  let floor = Infinity;
  eachPoint(body, car, (p) => { floor = Math.min(floor, p.y); });
  // Clip each body triangle to the tread's vertical prism. Along every
  // clipped edge, the minimum gap to the circular tyre is either an end
  // point or the analytic stationary point. This catches broad triangles
  // spanning an arch even when none of their vertices is above the tyre.
  const clip = (poly, axis, value, direction) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a[axis] - value) * direction;
      const db = (b[axis] - value) * direction;
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) out.push(a.clone().lerp(b, da / (da - db)));
    }
    return out;
  };
  const inverse = car.matrixWorld.clone().invert();
  const matrix = new THREE.Matrix4();
  body.traverse((o) => {
    if (!o.isMesh) return;
    matrix.multiplyMatrices(inverse, o.matrixWorld);
    const g = o.geometry, pos = g.attributes.position;
    const count = g.index?.count ?? pos.count;
    for (let i = 0; i < count; i += 3) {
      const tri = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(pos, g.index ? g.index.getX(i + j) : i + j).applyMatrix4(matrix));
      for (const t of tyres) {
        if (tri.every((p) => p.x < t.x0) || tri.every((p) => p.x > t.x1) || tri.every((p) => p.z < t.z - t.r) || tri.every((p) => p.z > t.z + t.r) || tri.every((p) => p.y < t.y)) continue;
        let poly = tri;
        for (const [axis, value, sign] of [["x", t.x0, 1], ["x", t.x1, -1], ["z", t.z - t.r, 1], ["z", t.z + t.r, -1], ["y", t.y, 1]]) poly = clip(poly, axis, value, sign);
        const gap = (p) => p.y - t.y - Math.sqrt(Math.max(0, t.r * t.r - (p.z - t.z) ** 2));
        for (let j = 0; j < poly.length; j++) {
          const a = poly[j], b = poly[(j + 1) % poly.length];
          tyre = Math.min(tyre, gap(a));
          if (Math.abs(b.z - a.z) < 1e-9) continue;
          const slope = (b.y - a.y) / (b.z - a.z);
          const z = t.z - slope * t.r / Math.sqrt(1 + slope * slope);
          const u = (z - a.z) / (b.z - a.z);
          if (u > 0 && u < 1) tyre = Math.min(tyre, gap(a.clone().lerp(b, u)));
        }
      }
    }
  });
  const limit = tyres.length === 4 && Number.isFinite(floor) ? Math.max(0, Math.min(tyre - 0.01, floor - 0.05)) : 0;
  return { limit, tyre, floor };
}

/** The triangles `root` draws (visible meshes only). */
export function triangles(root) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const g = o.geometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return Math.round(n);
}

/**
 * A honeycomb grille on a phone without the walls of its cells. Both cars'
 * grilles are a lattice of hexagonal tubes drawn as separate flat quads,
 * the S4's a third of its triangles, and no edge of a separate quad can be
 * simplified away; on a phone a cell is a few pixels across and its walls,
 * seen edge on from the front, a pixel or two. The lattice's front and back
 * faces stay (the pattern and its depth); the walls, faces along the car's
 * forward axis, go. A part is a honeycomb by its name, its material's or a
 * named node it hangs from. Call before slim(). Returns the triangles
 * dropped.
 */
export function dropCellWalls(car, pattern = /honeycomb/i) {
  car.updateMatrixWorld(true);
  _m.copy(car.matrixWorld).invert();
  const toCar = new THREE.Matrix4();
  const normals = new THREE.Matrix3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let dropped = 0;
  car.traverse((o) => {
    if (!o.isMesh || !o.geometry.index) return;
    let honeycomb = [].concat(o.material).some((m) => pattern.test(m.name));
    for (let p = o; p && p !== car && !honeycomb; p = p.parent) honeycomb = pattern.test(p.name);
    if (!honeycomb) return;
    toCar.multiplyMatrices(_m, o.matrixWorld);
    normals.getNormalMatrix(toCar);
    const g = o.geometry;
    const index = g.index.array;
    const pos = g.attributes.position;
    const keep = [];
    for (let i = 0; i < g.index.count; i += 3) {
      a.fromBufferAttribute(pos, index[i]);
      b.fromBufferAttribute(pos, index[i + 1]);
      c.fromBufferAttribute(pos, index[i + 2]);
      c.sub(b).cross(a.sub(b)).applyMatrix3(normals).normalize();
      if (Math.abs(c.z) >= 0.25) keep.push(index[i], index[i + 1], index[i + 2]);
    }
    dropped += g.index.count / 3 - keep.length / 3;
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(keep), 1));
  });
  return dropped;
}

// The error, in metres, the phone's car may stray from the source, in the
// steps prepareTier tries: a millimetre first, two centimetres at most.
const tierCache = new Map();
const ERRORS = [0.001, 0.002, 0.004, 0.007, 0.012, 0.02];

/**
 * A phone's car in at most `target` triangles, made in place from the
 * slimmed inspection car: every opaque mesh's index simplified with
 * meshoptimizer, its vertices left as they are and on their nodes (a
 * part's outline may only slide along itself, within the error). The whole
 * car is held to one error, the smallest of the steps that gets it under
 * `target`, so no part is coarser than another needs to be. `between()` is
 * awaited between meshes (the city's frame slots). Returns `{ before,
 * after, error, ms, met }`: `ms` is the time spent working, not waiting,
 * and `met` whether `target` was reached (at two centimetres it stops).
 */
export async function prepareTier(car, { target, cacheKey = null, between = () => Promise.resolve() } = {}) {
  const before = triangles(car);
  if (before <= target) return { before, after: before, error: 0, ms: 0, met: true };
  const { MeshoptSimplifier } = await import("meshoptimizer/simplifier");
  await MeshoptSimplifier.ready;
  const jobs = [];
  car.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !o.geometry.index || Array.isArray(m) || m.transparent) return;
    const g = o.geometry;
    if (g.index.count < 64 * 3) return;
    const index = new Uint32Array(g.index.array.subarray(0, g.index.count));
    const pos = g.attributes.position;
    const xyz = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) _v.fromBufferAttribute(pos, i).toArray(xyz, i * 3);
    jobs.push({ g, index, xyz, scale: MeshoptSimplifier.getScale(xyz, 3), out: index });
  });
  const fingerprint = jobs.map((j) => `${j.index.length}:${j.xyz.length}`).join("|");
  const key = cacheKey ? `${cacheKey}:${target}:${fingerprint}` : null;
  const cached = key && tierCache.get(key);
  if (cached) {
    const plan = await cached;
    jobs.forEach((j, i) => j.g.setIndex(new THREE.BufferAttribute(plan.indices[i].slice(), 1)));
    return { ...plan.stats, before, ms: 0, cached: true };
  }
  const fixed = before - jobs.reduce((n, j) => n + j.index.length / 3, 0);
  let ms = 0;
  let error = 0;
  let total = before;
  for (const e of ERRORS) {
    error = e;
    for (const job of jobs) {
      const t0 = performance.now();
      [job.out] = MeshoptSimplifier.simplify(job.index, job.xyz, 3, 3, e / job.scale, []);
      ms += performance.now() - t0;
      await between();
    }
    total = fixed + jobs.reduce((n, j) => n + j.out.length / 3, 0);
    if (total <= target) break;
  }
  for (const job of jobs) job.g.setIndex(new THREE.BufferAttribute(job.out, 1));
  const stats = { before, after: Math.round(total), error, ms: Math.round(ms), met: total <= target, cached: false };
  if (key) tierCache.set(key, Promise.resolve({ indices: jobs.map((j) => j.out.slice()), stats }));
  return stats;
}
