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

// What an attribute's getX gives for a stored integer, by its array's type
// (three's own denormalize), written out so a whole array can be read in
// one loop and not through four calls a vertex.
const UNIT = new Map([
  [Int8Array, (v) => Math.max(v / 127.0, -1.0)],
  [Uint8Array, (v) => v / 255.0],
  [Int16Array, (v) => Math.max(v / 32767.0, -1.0)],
  [Uint16Array, (v) => v / 65535.0],
  [Int32Array, (v) => Math.max(v / 2147483647.0, -1.0)],
  [Uint32Array, (v) => v / 4294967295.0],
]);

/** A plain Float32, non-interleaved, Uint32-indexed copy of `geometry`,
 *  keeping only `names` if given. */
export function toFloat(geometry, names = null) {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    if (names && !names.includes(name)) continue;
    const n = attr.count;
    const size = attr.itemSize;
    const arr = new Float32Array(n * size);
    // The stored values in order (an interleaved one's from its stride),
    // made what getX makes of them.
    const data = attr.isInterleavedBufferAttribute ? attr.data : null;
    const src = data ? data.array : attr.array;
    const stride = data ? data.stride : size;
    const at = data ? attr.offset : 0;
    const unit = attr.normalized ? UNIT.get(src.constructor) : null;
    if (attr.normalized && !unit) {
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < size; k++) arr[i * size + k] = attr[GET[k]](i);
      }
    } else if (unit) {
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < size; k++) arr[i * size + k] = unit(src[i * stride + at + k]);
      }
    } else if (!data && src.length >= n * size) {
      arr.set(src.subarray(0, n * size));
    } else {
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < size; k++) arr[i * size + k] = src[i * stride + at + k];
      }
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  const count = geometry.attributes.position.count;
  const index = geometry.index;
  const idx = new Uint32Array(index ? index.count : count);
  if (index) idx.set(index.array.subarray(0, idx.length));
  else for (let i = 0; i < idx.length; i++) idx[i] = i;
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

/**
 * (load) `part` (as mergeMeshes makes it, cut by cutToCells) added to the end
 * of `kit`, { geometry, vertices, indices, runs }: written into the room the
 * geometry's arrays have left over and sent to the GPU as that range alone,
 * or, with no room, a geometry of twice what is needed made with the old
 * and the new in it. Returns the kit as it will be: `grown` if it is a new
 * geometry, and the runs with the part's after the old ones. Nothing the
 * kit's mesh draws changes until its runs are set to these (a district's
 * whole build is put in at once). `fresh`: a new geometry even with room
 * (of the same size), for a material that works on each geometry it is
 * given the first time it draws it (the shops deal their panes' trades,
 * materials.js), as it did on a merge made whole again.
 */
export function appendPart(kit, part, partRuns, fresh = false) {
  const pv = part.attributes.position.count;
  const pi = part.index.count;
  const v0 = kit.vertices;
  const i0 = kit.indices;
  let geometry = kit.geometry;
  const fits = geometry.attributes.position.count - v0 >= pv && geometry.index.count - i0 >= pi;
  const room = fits && !fresh;
  if (!room) {
    const vCap = fits ? geometry.attributes.position.count : Math.ceil((v0 + pv) * 2);
    const iCap = fits ? geometry.index.count : Math.ceil((i0 + pi) * 2);
    const grown = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geometry.attributes)) {
      const arr = new attr.array.constructor(vCap * attr.itemSize);
      arr.set(attr.array.subarray(0, v0 * attr.itemSize));
      grown.setAttribute(name, new THREE.BufferAttribute(arr, attr.itemSize, attr.normalized));
    }
    const idx = new Uint32Array(iCap);
    idx.set(geometry.index.array.subarray(0, i0));
    grown.setIndex(new THREE.BufferAttribute(idx, 1));
    grown.boundingBox = geometry.boundingBox?.clone() ?? null;
    geometry = grown;
  }
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const from = part.attributes[name];
    attr.array.set(from.array.subarray(0, pv * attr.itemSize), v0 * attr.itemSize);
    if (room) {
      attr.addUpdateRange(v0 * attr.itemSize, pv * attr.itemSize);
      attr.needsUpdate = true;
    }
  }
  const idx = geometry.index.array;
  const src = part.index.array;
  for (let k = 0; k < pi; k++) idx[i0 + k] = src[k] + v0;
  if (room) {
    geometry.index.addUpdateRange(i0, pi);
    geometry.index.needsUpdate = true;
  }
  geometry.setDrawRange(0, i0 + pi);
  part.computeBoundingBox();
  if (geometry.boundingBox) geometry.boundingBox.union(part.boundingBox);
  else geometry.boundingBox = part.boundingBox.clone();
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  const runs = {
    cell: Int32Array.from([...kit.runs.cell, ...partRuns.cell]),
    start: Int32Array.from([...kit.runs.start, ...Array.from(partRuns.start, (st) => st + i0)]),
    count: Int32Array.from([...kit.runs.count, ...partRuns.count]),
  };
  return { geometry, grown: !room, vertices: v0 + pv, indices: i0 + pi, runs };
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

/** The ground in `size`-metre cells: the cells every Tiled mesh of a city
 *  is cut to, each with the bounds of all that stands in it. */
export function createCells(size) {
  return { size, list: [], ids: new Map(), frame: -1 };
}

/** Which cells a camera holds: worked out once for each render call (a
 *  frame has two that see the kit, the scene and the wet road's mirror),
 *  each cell in sight marked with the call's number, which is returned. */
function look(cells, renderer, camera) {
  const frame = renderer.info.render.frame;
  if (cells.frame === frame) return frame;
  cells.frame = frame;
  _frustum.setFromProjectionMatrix(_view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const cell of cells.list) if (_frustum.intersectsBox(cell.box)) cell.seen = frame;
  return frame;
}

/**
 * `geometry` (indexed, plain float positions, world space) put in the
 * order of `cells`: each triangle to the cell its middle stands in, a
 * cell's triangles together in the index, the cells row by row across the
 * map so that neighbours along a row are neighbours in the index. Returns
 * the runs in that order, `cell[i]` the cell's number and `start[i]`,
 * `count[i]` its part of the index, and grows each cell's bounds by what is
 * now in it. A geometry of fewer than `min` triangles is left as it is, one
 * run that belongs to no cell (-1): culling so little saves less than
 * drawing it in pieces costs.
 */
export function cutToCells(geometry, cells, min = 0) {
  const pos = geometry.attributes.position.array;
  const index = geometry.index.array;
  const tris = index.length / 3;
  if (tris < min) return { cell: Int32Array.of(-1), start: Int32Array.of(0), count: Int32Array.of(index.length) };
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
      cells.list.push({ id, cx, cz, box: new THREE.Box3(), seen: -1 });
    }
    let r = runAt.get(id);
    if (r === undefined) {
      r = runs.length;
      runAt.set(id, r);
      runs.push({ id, count: 0, at: 0 });
    }
    runOf[t] = r;
    runs[r].count += 3;
    const { min: lo, max: hi } = cells.list[id].box;
    lo.set(Math.min(lo.x, pos[a], pos[b], pos[c]), Math.min(lo.y, pos[a + 1], pos[b + 1], pos[c + 1]), Math.min(lo.z, pos[a + 2], pos[b + 2], pos[c + 2]));
    hi.set(Math.max(hi.x, pos[a], pos[b], pos[c]), Math.max(hi.y, pos[a + 1], pos[b + 1], pos[c + 1]), Math.max(hi.z, pos[a + 2], pos[b + 2], pos[c + 2]));
  }
  const rows = [...runs].sort((p, q) => cells.list[p.id].cz - cells.list[q.id].cz || cells.list[p.id].cx - cells.list[q.id].cx);
  const start = new Int32Array(rows.length);
  let at = 0;
  rows.forEach((run, r) => {
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
  return { cell: Int32Array.from(rows, (run) => run.id), start, count: Int32Array.from(rows, (run) => run.count) };
}

/**
 * A mesh drawn a cell at a time: of its geometry (cut by cutToCells, or
 * sharing the `runs` of a mesh that was), only the cells the camera of each
 * render call holds, in one draw. Each run handed over is still a draw to
 * the graphics driver, so cells in sight that follow one another in the
 * index (neighbours along a row of the map) go as one run: a frustum's
 * share of a row is one piece. The kit is one of these a material, so its
 * draws are the materials and not the materials times the tiles, and a
 * camera is given only the ground it can see.
 */
export class Tiled extends THREE.Mesh {
  constructor(geometry, material, cells, runs) {
    super(geometry, material);
    this.cells = cells;
    this.frustumCulled = false;
    if (MULTI_DRAW) {
      this.isBatchedMesh = true;
      this._multiDrawCount = 0;
      this._matricesTexture = this._indirectTexture = this._colorsTexture = null;
    }
    this.setRuns(runs);
  }

  /** (load: its runs anew, when a district's are added after them.) */
  setRuns(runs) {
    this.runs = runs;
    if (MULTI_DRAW && !(this._multiDrawStarts?.length >= runs.cell.length)) {
      this._multiDrawStarts = new Int32Array(runs.cell.length);
      this._multiDrawCounts = new Int32Array(runs.cell.length);
    }
  }

  onBeforeRender(renderer, scene, camera) {
    if (!MULTI_DRAW) return;
    const { cell, start, count } = this.runs;
    const { list } = this.cells;
    const seen = look(this.cells, renderer, camera);
    // A run's start is asked for in bytes.
    const bytes = this.geometry.index.array.BYTES_PER_ELEMENT;
    let n = 0;
    let joined = false;
    for (let r = 0; r < cell.length; r++) {
      if (cell[r] >= 0 && list[cell[r]].seen !== seen) {
        joined = false;
      } else if (joined) {
        this._multiDrawCounts[n - 1] += count[r];
      } else {
        this._multiDrawStarts[n] = start[r] * bytes;
        this._multiDrawCounts[n++] = count[r];
        joined = true;
      }
    }
    this._multiDrawCount = n;
  }
}
