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
    const arr = new Float32Array(attr.count * attr.itemSize);
    copyOut(attr, arr, 0);
    out.setAttribute(name, new THREE.BufferAttribute(arr, attr.itemSize));
  }
  const count = geometry.attributes.position.count;
  const index = geometry.index;
  const idx = new Uint32Array(index ? index.count : count);
  if (index) idx.set(index.array.subarray(0, idx.length));
  else for (let i = 0; i < idx.length; i++) idx[i] = i;
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// An attribute's values, as plain floats, written into `arr` from `base`
// on: the stored values in order (an interleaved one's from its stride),
// made what getX makes of them.
function copyOut(attr, arr, base) {
  const n = attr.count;
  const size = attr.itemSize;
  const data = attr.isInterleavedBufferAttribute ? attr.data : null;
  const src = data ? data.array : attr.array;
  const stride = data ? data.stride : size;
  const at = data ? attr.offset : 0;
  const unit = attr.normalized ? UNIT.get(src.constructor) : null;
  if (attr.normalized && !unit) {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < size; k++) arr[base + i * size + k] = attr[GET[k]](i);
    }
  } else if (unit) {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < size; k++) arr[base + i * size + k] = unit(src[i * stride + at + k]);
    }
  } else if (!data && src.length >= n * size) {
    arr.set(src.subarray(0, n * size), base);
  } else {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < size; k++) arr[base + i * size + k] = src[i * stride + at + k];
    }
  }
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

// (load) Vertices a step, for the work below spread over a page's frames.
const STEP = 16384;

/**
 * (load) mergeMeshes a few thousand vertices at a time, for a district's
 * build once the city is live: yields between pieces and returns the same
 * geometry (the same values, types and order). Each mesh is copied out and
 * moved as BufferGeometry.applyMatrix4 moves it (three's own code, run over
 * a range of its vertices at a time), and the parts are joined as
 * mergeGeometries joins them.
 */
export function* mergeMeshesSteps(meshes, into = null, names = null) {
  const inverse = into ? new THREE.Matrix4().copy(into.matrixWorld).invert() : null;
  const parts = [];
  for (const mesh of meshes) {
    const g = toFloat(mesh.geometry, names);
    yield;
    const m = mesh.matrixWorld.clone();
    if (inverse) m.premultiply(inverse);
    yield* moveSteps(g, m);
    parts.push(g);
  }
  let merged = parts[0];
  if (parts.length > 1) {
    merged = yield* joinSteps(parts);
    parts.forEach((g) => g.dispose());
  }
  yield;
  merged.computeBoundingSphere();
  yield;
  merged.computeBoundingBox();
  return merged;
}

// BufferGeometry.applyMatrix4 on a plain geometry with no bounds yet (as
// toFloat makes them), over STEP vertices at a time.
function* moveSteps(geometry, matrix) {
  const { position, normal, tangent } = geometry.attributes;
  const normalMatrix = normal ? new THREE.Matrix3().getNormalMatrix(matrix) : null;
  const n = position.count;
  for (let i = 0; i < n; i += STEP) {
    const end = Math.min(n, i + STEP);
    const range = (attr) => new THREE.BufferAttribute(attr.array.subarray(i * attr.itemSize, end * attr.itemSize), attr.itemSize, attr.normalized);
    range(position).applyMatrix4(matrix);
    if (normal) range(normal).applyNormalMatrix(normalMatrix);
    if (tangent) range(tangent).transformDirection(matrix);
    yield;
  }
  // (What applyMatrix4 leaves set besides.)
  for (const attr of [position, normal, tangent]) if (attr) attr.needsUpdate = true;
  geometry._transformed = true;
}

/** (load) mergeGeometries(parts, false) for parts as toFloat and mergeMeshes
 *  make them (indexed, plain arrays of one type an attribute, no morphs), a
 *  piece at a time: the indices offset, their type picked at the end as
 *  setIndex picks it, and the attributes joined in the first part's order. */
export function* joinSteps(parts) {
  const merged = new THREE.BufferGeometry();
  let total = 0;
  for (const g of parts) total += g.index.count;
  const index = new Uint32Array(total);
  let at = 0;
  let offset = 0;
  let big = false;
  for (const g of parts) {
    const src = g.index.array;
    for (let i = 0; i < src.length; i += STEP * 4) {
      const end = Math.min(src.length, i + STEP * 4);
      for (let k = i; k < end; k++) {
        const v = src[k] + offset;
        index[at++] = v;
        if (v >= 65535) big = true;
      }
      yield;
    }
    offset += g.attributes.position.count;
  }
  merged.setIndex(new THREE.BufferAttribute(big ? index : new Uint16Array(index), 1));
  yield;
  for (const name of Object.keys(parts[0].attributes)) {
    const first = parts[0].attributes[name];
    let length = 0;
    for (const g of parts) length += g.attributes[name].count * first.itemSize;
    const array = new first.array.constructor(length);
    let o = 0;
    for (const g of parts) {
      const a = g.attributes[name];
      array.set(a.array, o);
      o += a.count * first.itemSize;
      yield;
    }
    const attribute = new THREE.BufferAttribute(array, first.itemSize, first.normalized);
    attribute.gpuType = first.gpuType;
    merged.setAttribute(name, attribute);
  }
  return merged;
}

/**
 * (load) `meshes` merged (in the space of `into`, as mergeMeshes merges
 * them) and added to the end of `kit`, { geometry, vertices, indices, runs },
 * their triangles cut to `cells` (as cutSteps cuts them; or, `untiled`, one
 * run that belongs to no cell): written into the room the geometry's arrays
 * have left over and sent to the GPU as that range alone, or, with no room,
 * a geometry of twice what is needed made with the old and the new in it.
 * Each mesh is copied out and moved straight into the kit's arrays, the
 * same values as a merged copy of them would hold, but with no such copy
 * made (a district's every material was three of them, its garbage
 * collected in pauses of 50 to 80 ms). Returns the kit as it will be:
 * `grown` if it is a new geometry, the runs with the meshes' after the old
 * ones, and `bytes`, what the GPU is to be sent. Nothing the kit's mesh
 * draws changes until its runs are set to these (a district's whole build
 * is put in at once). `fresh`: a new geometry even with room (of the same
 * size), for a material that works on each geometry it is given the first
 * time it draws it (the shops deal their panes' trades, materials.js), as
 * it did on a merge made whole again. With room, what changed is marked to
 * be sent to the GPU only by the returned `send()`, so the caller can send
 * it in a moment of its own and not in whatever frame comes next. A step
 * at a time: yields between pieces.
 */
export function* appendMeshesSteps(kit, meshes, into, cells, { untiled = false, fresh = false } = {}) {
  let pv = 0;
  let pi = 0;
  for (const mesh of meshes) {
    const g = mesh.geometry;
    pv += g.attributes.position.count;
    pi += g.index ? g.index.count : g.attributes.position.count;
  }
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
      yield;
    }
    const idx = new Uint32Array(iCap);
    idx.set(geometry.index.array.subarray(0, i0));
    yield;
    grown.setIndex(new THREE.BufferAttribute(idx, 1));
    grown.boundingBox = geometry.boundingBox?.clone() ?? null;
    geometry = grown;
  }
  // Each mesh: its values copied out into the kit's arrays at the end of
  // what is there, moved there as BufferGeometry.applyMatrix4 moves them,
  // and its index after them.
  const inverse = into ? new THREE.Matrix4().copy(into.matrixWorld).invert() : null;
  const idx = geometry.index.array;
  let v = v0;
  let i = i0;
  for (const mesh of meshes) {
    const g = mesh.geometry;
    const n = g.attributes.position.count;
    for (const [name, attr] of Object.entries(geometry.attributes)) {
      copyOut(g.attributes[name], attr.array, v * attr.itemSize);
      yield;
    }
    const m = mesh.matrixWorld.clone();
    if (inverse) m.premultiply(inverse);
    const { position, normal, tangent } = geometry.attributes;
    const normalMatrix = normal ? new THREE.Matrix3().getNormalMatrix(m) : null;
    for (let k = 0; k < n; k += STEP) {
      const end = Math.min(n, k + STEP);
      const range = (attr) => new THREE.BufferAttribute(attr.array.subarray((v + k) * attr.itemSize, (v + end) * attr.itemSize), attr.itemSize, attr.normalized);
      range(position).applyMatrix4(m);
      if (normal) range(normal).applyNormalMatrix(normalMatrix);
      if (tangent) range(tangent).transformDirection(m);
      yield;
    }
    const index = g.index;
    const count = index ? index.count : n;
    for (let k = 0; k < count; k++) {
      if (k % (STEP * 4) === STEP * 4 - 1) yield;
      idx[i + k] = (index ? index.array[k] : k) + v;
    }
    v += n;
    i += count;
  }
  // Cut to the cells as cutSteps cuts a merged copy: the same positions
  // under the same triangles, so the same cells, order and runs (theirs
  // from the start of this stretch of the index).
  const view = { attributes: { position: geometry.attributes.position }, index: { array: idx.subarray(i0, i0 + pi), needsUpdate: false } };
  const partRuns = untiled ? { cell: Int32Array.of(-1), start: Int32Array.of(0), count: Int32Array.of(pi) } : yield* cutSteps(view, cells, 0);
  yield;
  let sent = !room;
  const send = () => {
    if (sent) return;
    sent = true;
    for (const attr of Object.values(geometry.attributes)) {
      attr.addUpdateRange(v0 * attr.itemSize, pv * attr.itemSize);
      attr.needsUpdate = true;
    }
    geometry.index.addUpdateRange(i0, pi);
    geometry.index.needsUpdate = true;
  };
  geometry.setDrawRange(0, i0 + pi);
  const box = new THREE.Box3().setFromBufferAttribute(new THREE.BufferAttribute(geometry.attributes.position.array.subarray(v0 * 3, (v0 + pv) * 3), 3));
  if (geometry.boundingBox) geometry.boundingBox.union(box);
  else geometry.boundingBox = box;
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  const runs = {
    cell: Int32Array.from([...kit.runs.cell, ...partRuns.cell]),
    start: Int32Array.from([...kit.runs.start, ...Array.from(partRuns.start, (st) => st + i0)]),
    count: Int32Array.from([...kit.runs.count, ...partRuns.count]),
  };
  const bytes = room
    ? Object.values(geometry.attributes).reduce((b, a) => b + pv * a.itemSize * a.array.BYTES_PER_ELEMENT, pi * 4)
    : Object.values(geometry.attributes).reduce((b, a) => b + a.array.byteLength, geometry.index.array.byteLength);
  return { geometry, grown: !room, vertices: v0 + pv, indices: i0 + pi, runs, send, bytes };
}

/** The attribute names a mesh carries, as a key. */
export const attributeKey = (geometry) => Object.keys(geometry.attributes).sort().join(",");

// three draws a mesh's index in one run, or, for its own BatchedMesh, as a
// list of runs handed to WEBGL_multi_draw in one call (one draw each where
// the extension is missing). Tiled below borrows that path, which is these
// three fields and a flag in three 0.186's renderer and nothing public; if
// three drops them, a Tiled mesh is a plain mesh and draws everything.
const MULTI_DRAW = "_multiDrawStarts" in new THREE.BatchedMesh(1, 3, 3);

// These meshes already contain world-space vertices. Native materials still
// compile Three's batching transform, which needs a real float identity and
// unsigned integer draw IDs. Null textures bind a byte fallback, invalid for
// usampler2D. Geometry owns the shared textures and their disposal.
const identityBatches = new WeakMap();
export function identityBatching(object, draws = 1) {
  const geometry = object.geometry;
  let batch = identityBatches.get(geometry);
  if (!batch) {
    const matrix = new THREE.DataTexture(new Float32Array(new THREE.Matrix4().elements), 4, 1, THREE.RGBAFormat, THREE.FloatType);
    matrix.name = "world batching identity";
    matrix.needsUpdate = true;
    batch = { matrix, ids: null, capacity: 0, objects: new Set() };
    identityBatches.set(geometry, batch);
    const dispose = () => {
      batch.matrix.dispose();
      batch.ids?.dispose();
      for (const mesh of batch.objects) if (mesh.geometry === geometry) mesh._matricesTexture = mesh._indirectTexture = null;
      batch.objects.clear();
      identityBatches.delete(geometry);
      geometry.removeEventListener("dispose", dispose);
    };
    geometry.addEventListener("dispose", dispose);
  }
  batch.objects.add(object);
  if (batch.capacity < Math.max(1, draws)) {
    batch.ids?.dispose();
    const size = Math.ceil(Math.sqrt(Math.max(1, draws)));
    batch.ids = new THREE.DataTexture(new Uint32Array(size * size), size, size, THREE.RedIntegerFormat, THREE.UnsignedIntType);
    batch.ids.name = "world batching draw IDs";
    batch.ids.needsUpdate = true;
    batch.capacity = size * size;
    for (const mesh of batch.objects) if (mesh.geometry === geometry) mesh._indirectTexture = batch.ids;
  }
  object._matricesTexture = batch.matrix;
  object._indirectTexture = batch.ids;
  object._colorsTexture = null;
}

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
  for (const cell of cells.list) if (_frustum.intersectsBox(cell.box) && (!cells.visibleBox || cells.visibleBox(cell.box, cell.sector))) cell.seen = frame;
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
 * drawing it in pieces costs. (load: a generator, a few thousand triangles
 * a step, so a district's cut can be spread over the page's frames.)
 */
export function* cutSteps(geometry, cells, min = 0) {
  const pos = geometry.attributes.position.array;
  const index = geometry.index.array;
  const tris = index.length / 3;
  if (tris < min) return { cell: Int32Array.of(-1), start: Int32Array.of(0), count: Int32Array.of(index.length) };
  const runOf = new Int32Array(tris);
  const runAt = new Map();
  const runs = [];
  const bounds = new THREE.Box3();
  for (let t = 0; t < tris; t++) {
    if (t % 4096 === 4095) yield;
    const a = index[t * 3] * 3;
    const b = index[t * 3 + 1] * 3;
    const c = index[t * 3 + 2] * 3;
    const cx = Math.floor((pos[a] + pos[b] + pos[c]) / 3 / cells.size);
    const cz = Math.floor((pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3 / cells.size);
    bounds.min.set(Math.min(pos[a], pos[b], pos[c]), Math.min(pos[a + 1], pos[b + 1], pos[c + 1]), Math.min(pos[a + 2], pos[b + 2], pos[c + 2]));
    bounds.max.set(Math.max(pos[a], pos[b], pos[c]), Math.max(pos[a + 1], pos[b + 1], pos[c + 1]), Math.max(pos[a + 2], pos[b + 2], pos[c + 2]));
    const sector = cells.partition?.(bounds) ?? "";
    const key = `${cx},${cz},${sector}`;
    let id = cells.ids.get(key);
    if (id === undefined) {
      id = cells.list.length;
      cells.ids.set(key, id);
      cells.list.push({ id, cx, cz, sector, box: new THREE.Box3(), seen: -1 });
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
  yield;
  for (let t = 0; t < tris; t++) {
    if (t % STEP === STEP - 1) yield;
    const run = runs[runOf[t]];
    sorted[run.at++] = index[t * 3];
    sorted[run.at++] = index[t * 3 + 1];
    sorted[run.at++] = index[t * 3 + 2];
  }
  yield;
  index.set(sorted);
  geometry.index.needsUpdate = true;
  return { cell: Int32Array.from(rows, (run) => run.id), start, count: Int32Array.from(rows, (run) => run.count) };
}

/**
 * A mesh drawn a cell at a time: of its geometry (cut by cutSteps, or
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
    this.passLists = new WeakMap();
    this.frustumCulled = false;
    if (MULTI_DRAW) {
      this.isBatchedMesh = true;
      this._multiDrawCount = 0;
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
    if (MULTI_DRAW) identityBatching(this, runs.cell.length);
  }

  onBeforeRender(renderer, scene, camera) {
    if (!MULTI_DRAW) return;
    // Static room poses recur across direct and reflected passes. Restore
    // that camera's exact command list while its aperture state, geometry
    // and cell partition match. Flights and late packs rebuild normally.
    const key = this.cells.visibilityKey?.();
    let saved = key ? this.passLists.get(camera) : null;
    if (saved && saved.key === key && saved.runs === this.runs && saved.geometry === this.geometry && saved.cells === this.cells.list.length) {
      this._multiDrawCount = saved.count;
      this._multiDrawStarts.set(saved.starts.subarray(0, saved.count));
      this._multiDrawCounts.set(saved.counts.subarray(0, saved.count));
      return;
    }
    const remember = () => {
      if (!key) return;
      const count = this._multiDrawCount;
      if (!saved || saved.starts.length < count) saved = { starts: new Int32Array(count), counts: new Int32Array(count) };
      saved.starts.set(this._multiDrawStarts.subarray(0, count));
      saved.counts.set(this._multiDrawCounts.subarray(0, count));
      Object.assign(saved, { key, runs: this.runs, geometry: this.geometry, cells: this.cells.list.length, count });
      this.passLists.set(camera, saved);
    };
    if (this.cells.visibleBox && !this.cells.visibleBox(this.geometry.boundingBox, this.userData.sector)) {
      this._multiDrawCount = 0;
      remember();
      return;
    }
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
    remember();
  }
}

/**
 * A plain mesh drawn as a Tiled mesh with nothing to cut is: its whole
 * index as one run on three's multi-draw path. It draws what it drew, and
 * with the very program its material has on the Tiled meshes: a plain
 * mesh's is a program of its own, and every program a frame draws with is
 * a render pipeline of ANGLE's Metal backend, which keeps 96 (see Baked in
 * props.js).
 */
export function asOneRun(mesh) {
  const index = mesh.geometry.index;
  if (!MULTI_DRAW || !index) return;
  mesh.isBatchedMesh = true;
  mesh._multiDrawStarts = Int32Array.of(0);
  mesh._multiDrawCounts = Int32Array.of(index.count);
  mesh._multiDrawCount = 1;
  identityBatching(mesh);
}
