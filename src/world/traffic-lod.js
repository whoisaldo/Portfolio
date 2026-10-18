// src/world/traffic-lod.js: a car, or an AV, from further off.
//
// A car's own model is 1,700 triangles or more, a third of them its wheels.
// Past forty metres nobody sees that: the same shell with its points
// gathered onto a coarse grid, the triangles that close up dropped and the
// rest shaded smooth again, on four plain wheels, is the same car at a
// quarter of the cost, which is what lets every kerb be parked full.
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

/** Smooth across every edge shallower than `angle` (radians), hard at the
 *  rest: a curved panel shades as one surface and a crease stays a crease.
 *  Keeps aKind. */
export function creased(geometry, angle = 0.62) {
  return toCreasedNormals(geometry, angle);
}

/**
 * A coarser copy of a merged, non-indexed geometry that carries aKind:
 * every point moved to the middle of the points that share its cell of
 * `cell` metres, triangles that close up or double up dropped. `skip(kind)`
 * leaves a surface out altogether.
 */
export function coarse(geometry, cell, skip = () => false) {
  const pos = geometry.attributes.position;
  const kind = geometry.attributes.aKind;
  const cells = new Map();
  const of = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) / cell)},${Math.round(pos.getY(i) / cell)},${Math.round(pos.getZ(i) / cell)}`;
    let c = cells.get(key);
    if (!c) cells.set(key, (c = { id: cells.size, x: 0, y: 0, z: 0, n: 0 }));
    c.x += pos.getX(i);
    c.y += pos.getY(i);
    c.z += pos.getZ(i);
    c.n++;
    of[i] = c.id;
  }
  const mid = [...cells.values()];
  const seen = new Set();
  const out = [];
  const kinds = [];
  for (let i = 0; i < pos.count; i += 3) {
    const k = kind.getX(i);
    if (skip(k)) continue;
    const a = of[i];
    const b = of[i + 1];
    const c = of[i + 2];
    if (a === b || b === c || a === c) continue;
    const key = `${[a, b, c].sort((p, q) => p - q).join(",")},${k}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const id of [a, b, c]) {
      const m = mid[id];
      out.push(m.x / m.n, m.y / m.n, m.z / m.n);
      kinds.push(k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute("aKind", new THREE.Float32BufferAttribute(kinds, 1));
  return creased(g);
}

/** A wheel as a ten-sided drum on its side at (x, r, z): the tread, and the
 *  face that looks out (the side of x it is on). Tagged `kind`. */
export function drum(x, z, r, width, kind, sides = 10) {
  const out = Math.sign(x) || 1;
  const x0 = x - (out * width) / 2;
  const x1 = x + (out * width) / 2;
  const p = [];
  const ring = Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2;
    return [r + Math.cos(a) * r, z + Math.sin(a) * r];
  });
  const tri = (a, b, c) => (out > 0 ? p.push(...a, ...b, ...c) : p.push(...a, ...c, ...b));
  for (let i = 0; i < sides; i++) {
    const [y0, z0] = ring[i];
    const [y1, z1] = ring[(i + 1) % sides];
    tri([x0, y0, z0], [x1, y1, z1], [x1, y0, z0]);
    tri([x0, y0, z0], [x0, y1, z1], [x1, y1, z1]);
    tri([x1, r, z], [x1, y0, z0], [x1, y1, z1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(p.length / 3).fill(kind), 1));
  return g;
}

/** Several tagged geometries as one (the parts are disposed of). */
export function joined(parts) {
  const g = mergeGeometries(parts, false);
  parts.forEach((x) => x.dispose());
  return g;
}
