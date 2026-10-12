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

// three draws a mesh's index in one run, or, for its own BatchedMesh, as a
// list of runs handed to WEBGL_multi_draw in one call (one draw each where
// the extension is missing). Tiled below borrows that path, which is these
// three fields and a flag in three 0.186's renderer and nothing public; if
// three drops them, a Tiled mesh is a plain mesh and draws everything.
const MULTI_DRAW = "_multiDrawStarts" in new THREE.BatchedMesh(1, 3, 3);

const _frustum = new THREE.Frustum();
const _view = new THREE.Matrix4();
const _eye = new THREE.Vector3();

/** The ground in `size`-metre cells: the cells every Tiled mesh of a city
 *  is cut to, each with the bounds of all that stands in it. */
export function createCells(size) {
  return { size, list: [], ids: new Map(), frame: -1, seen: [] };
}

/** Which cells a camera holds, nearest first: worked out once for each
 *  render call (a frame has two that see the kit, the scene and the wet
 *  road's mirror) and read by every mesh that call draws. */
function look(cells, renderer, camera) {
  const frame = renderer.info.render.frame;
  if (cells.frame === frame) return cells.seen;
  cells.frame = frame;
  _frustum.setFromProjectionMatrix(_view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  _eye.setFromMatrixPosition(camera.matrixWorld);
  cells.seen.length = 0;
  for (const cell of cells.list) {
    if (!_frustum.intersectsBox(cell.box)) continue;
    cell.far = cell.box.distanceToPoint(_eye);
    cells.seen.push(cell);
  }
  return cells.seen.sort((a, b) => a.far - b.far);
}

/**
 * `geometry` (indexed, plain float positions, world space) put in the
 * order of `cells`: each triangle to the cell its middle
 * stands in, a cell's triangles together in the index. Returns the runs,
 * `cell[i]` the cell's number and `start[i]`, `count[i]` its part of the
 * index, and grows each cell's bounds by what is now in it.
 */
export function cutToCells(geometry, cells) {
  const pos = geometry.attributes.position.array;
  const index = geometry.index.array;
  const tris = index.length / 3;
  const runOf = new Int32Array(tris);
  const runAt = new Map();
  const runs = [];
  for (let t = 0; t < tris; t++) {
    const a = index[t * 3] * 3;
    const b = index[t * 3 + 1] * 3;
    const c = index[t * 3 + 2] * 3;
    const cx = Math.floor((pos[a] + pos[b] + pos[c]) / 3 / cells.size);
    const cz = Math.floor((pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3 / cells.size);
    const key = cx * 65536 + cz;
    let id = cells.ids.get(key);
    if (id === undefined) {
      id = cells.list.length;
      cells.ids.set(key, id);
      cells.list.push({ id, box: new THREE.Box3(), far: 0 });
    }
    let r = runAt.get(id);
    if (r === undefined) {
      r = runs.length;
      runAt.set(id, r);
      runs.push({ id, count: 0, at: 0 });
    }
    runOf[t] = r;
    runs[r].count += 3;
    const { min, max } = cells.list[id].box;
    min.set(Math.min(min.x, pos[a], pos[b], pos[c]), Math.min(min.y, pos[a + 1], pos[b + 1], pos[c + 1]), Math.min(min.z, pos[a + 2], pos[b + 2], pos[c + 2]));
    max.set(Math.max(max.x, pos[a], pos[b], pos[c]), Math.max(max.y, pos[a + 1], pos[b + 1], pos[c + 1]), Math.max(max.z, pos[a + 2], pos[b + 2], pos[c + 2]));
  }
  const start = new Int32Array(runs.length);
  let at = 0;
  runs.forEach((run, r) => {
    start[r] = run.at = at;
    at += run.count;
  });
  const sorted = new index.constructor(index.length);
  for (let t = 0; t < tris; t++) {
    const run = runs[runOf[t]];
    sorted[run.at++] = index[t * 3];
    sorted[run.at++] = index[t * 3 + 1];
    sorted[run.at++] = index[t * 3 + 2];
  }
  index.set(sorted);
  geometry.index.needsUpdate = true;
  return { cell: Int32Array.from(runs, (run) => run.id), start, count: Int32Array.from(runs, (run) => run.count) };
}

/**
 * A mesh drawn a cell at a time: of its geometry (cut by cutToCells, or
 * sharing the `runs` of a mesh that was), only the cells the camera of each
 * render call holds, the nearest first, in one draw. The kit is one of these
 * a material, so its draws are the materials and not the materials times
 * the tiles, and a camera is given only the ground it can see.
 */
export class Tiled extends THREE.Mesh {
  constructor(geometry, material, cells, runs = cutToCells(geometry, cells)) {
    super(geometry, material);
    this.cells = cells;
    this.runs = runs;
    // The run of each cell, by the cell's number (cells a later part of the
    // city adds are past its end).
    this.runAt = new Int32Array(cells.list.length).fill(-1);
    runs.cell.forEach((id, r) => (this.runAt[id] = r));
    this.frustumCulled = false;
    if (MULTI_DRAW) {
      this.isBatchedMesh = true;
      this._multiDrawStarts = new Int32Array(runs.cell.length);
      this._multiDrawCounts = new Int32Array(runs.cell.length);
      this._multiDrawCount = 0;
      this._matricesTexture = this._indirectTexture = this._colorsTexture = null;
    }
  }

  onBeforeRender(renderer, scene, camera) {
    if (!MULTI_DRAW) return;
    const { runAt, runs } = this;
    let n = 0;
    for (const cell of look(this.cells, renderer, camera)) {
      const r = cell.id < runAt.length ? runAt[cell.id] : -1;
      if (r < 0) continue;
      // A run's start is asked for in bytes.
      this._multiDrawStarts[n] = runs.start[r] * this.geometry.index.array.BYTES_PER_ELEMENT;
      this._multiDrawCounts[n] = runs.count[r];
      n++;
    }
    this._multiDrawCount = n;
  }
}
