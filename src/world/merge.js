// src/world/merge.js: fewer draws.
//
// A draw call costs the same whether it carries twelve triangles or twelve
// thousand, and both GLBs the city draws are made of many small meshes: the
// kit is batched in Blender by district, so one material turns up in a dozen
// of them, and the S4 is 150 parts because it is a model of a car and not a
// game asset. Their triangle counts are small, so merging them by material
// costs nothing and saves hundreds of draws a frame.
//
// Meshopt-compressed geometry arrives quantised (16-bit normalised positions,
// with the scale in the node's matrix) and sometimes interleaved, so every
// attribute is copied out to plain floats before its transform is baked in.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const GET = ["getX", "getY", "getZ", "getW"];

/** A plain Float32, non-interleaved, Uint32-indexed copy of `geometry`,
 *  keeping only `names` if given. */
export function toFloat(geometry, names = null) {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    if (names && !names.includes(name)) continue;
    const n = attr.count;
    const size = attr.itemSize;
    const arr = new Float32Array(n * size);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < size; k++) arr[i * size + k] = attr[GET[k]](i);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  const count = geometry.attributes.position.count;
  const index = geometry.index;
  const idx = new Uint32Array(index ? index.count : count);
  for (let i = 0; i < idx.length; i++) idx[i] = index ? index.getX(i) : i;
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

const _m = new THREE.Matrix4();

/**
 * One geometry from `meshes`, in the space of `into` (an Object3D, or null
 * for world space). Every mesh's matrixWorld must be current.
 */
export function mergeMeshes(meshes, into = null, names = null) {
  const inverse = into ? _m.copy(into.matrixWorld).invert() : null;
  const parts = meshes.map((mesh) => {
    const g = toFloat(mesh.geometry, names);
    const m = mesh.matrixWorld.clone();
    if (inverse) m.premultiply(inverse);
    g.applyMatrix4(m);
    return g;
  });
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) parts.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

/** The attribute names a mesh carries, as a key. */
export const attributeKey = (geometry) => Object.keys(geometry.attributes).sort().join(",");
