// src/world/props.js: the city's street furniture and wall clutter, instanced.
//
// Lamps, bollards, bins, vending machines, air conditioners, planters, roof
// tanks: thousands of a few dozen things. The kit carries each prototype
// once (proto_<name>_<material>, at the origin, its front toward +z) and a
// small file of where every one stands (props-<tier>.bin, packed by
// scripts/optimize-world.mjs from the builder's props.py): which prototype,
// x, y, z, which way it faces, how far it is stretched up and how scaled
// across. Each prototype's parts become one InstancedMesh each, wearing the
// kit's own materials (their vertex shaders instance), so the whole city's
// props are a few dozen draws.
//
// The instances are bucketed into CELL-metre cells. Whenever the camera has
// moved or turned enough, the cells inside the frustum and within each
// prototype's reach are copied, matrices and all, to the front of its
// buffers and the count set to them: a cell is a contiguous run, so this is
// a handful of typed-array copies, and small things far off (a bollard past
// 260 m is under two pixels) are not drawn at all.
//
// A prototype's small ornament (its bolts, its chain, its coin slot) is a
// prototype of its own, <name>__near, that nobody places: it is drawn where
// its prototype stands, in the cells within its own short reach, so a
// hydrant is whole at arm's length and four boxes at sixty metres, and a
// phone, whose kit leaves the ornament out, never draws it.
//
// A prototype may have other shapes (<name>__v1, __v2 ...), which nobody
// places either: the instances of <name> are dealt among it and them, and
// each has a design of its own besides (a lantern's colour, a machine's
// front), from where it stands (src/world/prop-deal.js). The props' own
// materials read the design as an instanced attribute, aDeal.
//
// Most of those draws are small: of the two hundred a street view asks for,
// over half carry under a thousand triangles, and a draw costs the page and
// the browser the same whatever it carries. So a part with few vertices in
// the whole city (BAKED or under, every instance counted) is not instanced:
// its instances are written out as plain triangles, with every other small
// part that wears the same material, into one mesh in the order of the
// cells, and of that mesh each part's cells in sight and in its reach (the
// same cells it would draw instanced) go in one draw. Only parts in the
// kit's own materials: the props' own read each instance's frame.
import * as THREE from "three";
import { worldPropsUrl } from "../data/world-assets.js";
import { fetchUnpacked } from "./fetched.js";
import { NEON } from "./materials.js";
import { RULES, deal } from "./prop-deal.js";
import { createPropSurfaces } from "./prop-surfaces.js";
import { identityBatching } from "./merge.js";
import { createPropBatches } from "./prop-batches.js";

const CELL = 12;
// The most vertices a part may have in the whole city and be written out.
const BAKED = 6000;
// three draws a list of runs of an index in one call for its own
// BatchedMesh; a Baked mesh borrows that path, as merge.js's Tiled does
// (see there for what it rests on).
const MULTI_DRAW = "_multiDrawStarts" in new THREE.BatchedMesh(1, 3, 3);
const NEAR = "__near";
const SHAPE = /^__v(\d+)$/;
const cache = new Map();

/** The tier's props file, fetched once. */
export function preloadProps(tier, url = worldPropsUrl[tier]) {
  if (!cache.has(url)) {
    // (load: gzipped beside the plain file; src/world/fetched.js.)
    const p = fetchUnpacked(url)
      .catch((err) => {
        cache.delete(url);
        throw err;
      });
    cache.set(url, p);
  }
  return cache.get(url);
}

export function parseProps(buffer) {
  const view = new DataView(buffer);
  const hl = view.getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, hl)));
  const data = new Int16Array(buffer, 4 + hl, header.count * 8);
  return { ...header, data };
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _frustum = new THREE.Frustum();
const _vp = new THREE.Matrix4();
const _dir = new THREE.Vector3();

// A static batch keeps the exact local inputs of the instanced shader.
// World positions still describe its bounds and its signal/light geometry.
function localBatchMaterial(material) {
  if (material.userData.localFrame) return material;
  material.userData.localFrame = true;
  material.vertexShader = `
    attribute vec3 _local_position;
    attribute vec3 _local_normal;
    attribute vec4 _instance_matrix_0;
    attribute vec4 _instance_matrix_1;
    attribute vec4 _instance_matrix_2;
    attribute vec4 _instance_matrix_3;
  ` + material.vertexShader.replace(/\bposition\b/g, "_local_position")
    .replace(/\bnormal\b/g, "_local_normal")
    .replace(/\binstanceMatrix\b/g, "mat4(_instance_matrix_0, _instance_matrix_1, _instance_matrix_2, _instance_matrix_3)")
    .replace(/\baDeal\b/g, "_deal");
  return material;
}

/**
 * Small parts written out, one mesh a material, drawn a run of cells at a
 * time. A plain mesh, so that it is drawn with the very program of its
 * material's kit meshes (a frame that needs more programs than ANGLE's
 * Metal backend keeps pipelines for, 96, makes every one of them again
 * every frame): its twin's uProp tells the materials it is a prop, as an
 * instanced mesh's USE_INSTANCING does (materials.js surface()).
 */
class Baked extends THREE.Mesh {
  constructor(material) {
    super(new THREE.BufferGeometry(), material);
    // (A prop's, not the kit's own: what passes over the instanced meshes
    // passes over it too.)
    this.isBaked = true;
    // Its place in three's opaque order as it had it as an instanced mesh
    // of one instance where it stands: its own sphere, worked out once
    // (opaqueOrder counts it an instanced mesh).
    this.boundingSphere = null;
    // What it is made of: { set, src } for each part, and where in its index
    // the triangles are of each cell's parts that are seen equally far.
    this.parts = [];
    this.cells = { ci: new Int32Array(0), reach: new Float32Array(0), start: new Int32Array(0), count: new Int32Array(0) };
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
    // Shown, drawing nothing, until the first update: a renderer's compile
    // passes over what is hidden, and its program must be made at warm-up
    // (or when its district's pack lands), not the first time it is seen.
    this.visible = true;
    if (MULTI_DRAW) {
      this.isBatchedMesh = true;
      this._multiDrawStarts = new Int32Array(0);
      this._multiDrawCounts = new Int32Array(0);
      this._multiDrawCount = 0;
      identityBatching(this);
    }
  }

  computeBoundingSphere() {
    if (this.geometry.boundingSphere === null) this.geometry.computeBoundingSphere();
    this.boundingSphere = this.geometry.boundingSphere.clone();
  }

  /** Every instance of every part as triangles, a cell's together, the
   *  cells in `rank`'s order (row by row across the map, so that cells in
   *  sight side by side are side by side in the index and go as one run). */
  write(rank) {
    const steps = this.writeSteps(rank);
    let r;
    while (!(r = steps.next()).done);
    r.value.apply();
  }

  /** (load) write, a few thousand vertices at a time, out of sight: yields
   *  between pieces, and returns { geometry, apply }, what it wrote and the
   *  apply() that puts it in the mesh. */
  *writeSteps(rank) {
    const names = Object.keys(this.parts[0].src.geometry.attributes);
    const local = this.material.userData.localFrame;
    const sizes = Object.fromEntries(names.map((name) => [name, this.parts[0].src.geometry.attributes[name].itemSize]));
    if (local) {
      Object.assign(sizes, { _local_position: 3, _local_normal: 3, _instance_matrix_0: 4, _instance_matrix_1: 4, _instance_matrix_2: 4, _instance_matrix_3: 4, _deal: 1 });
      names.push(...Object.keys(sizes).filter((name) => !names.includes(name)));
    }
    let verts = 0;
    let indices = 0;
    // Each instance of each part, by its cell and then by how far it is seen.
    const items = [];
    // (Where each instance's vertices start, by part: for written() below.)
    const at = new Map();
    for (const part of this.parts) {
      const { set, src } = part;
      const g = src.geometry;
      at.set(part, new Int32Array(set.n));
      for (const run of set.runs) for (let j = run.start; j < run.end; j++) items.push({ ci: run.ci, sector: run.sector, set, g, j, part });
      verts += set.n * g.attributes.position.count;
      indices += set.n * g.index.count;
    }
    yield;
    items.sort((a, b) => rank[a.ci] - rank[b.ci] || a.set.reach - b.set.reach);
    yield;
    const out = Object.fromEntries(names.map((name) => [name, new Float32Array(verts * sizes[name])]));
    const index = verts > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
    const ci = [];
    const reach = [];
    const start = [];
    const count = [], bounds = [], sectors = [];
    const placed = new THREE.Box3();
    let previousPart = null;
    let v = 0;
    let i = 0;
    let since = 0;
    for (const { ci: cell, sector, set, g, j, part } of items) {
      if (since > 8192) {
        since = 0;
        yield;
      }
      if (ci[ci.length - 1] !== cell || reach[reach.length - 1] !== set.reach || previousPart !== part) {
        ci.push(cell);
        reach.push(set.reach);
        start.push(i);
        count.push(0);
        bounds.push(new THREE.Box3()); sectors.push(sector); previousPart = part;
      }
      // The instance's matrix (a frame: no projective row), written out by
      // hand: the same sums as Matrix4 and Matrix3 make, without the calls.
      const e = set.matrices;
      const o = j * 16;
      bounds[bounds.length - 1].union(placed.copy(g.boundingBox).applyMatrix4(_m.fromArray(e, o)).expandByScalar(1));
      const m0 = e[o], m1 = e[o + 1], m2 = e[o + 2];
      const m4 = e[o + 4], m5 = e[o + 5], m6 = e[o + 6];
      const m8 = e[o + 8], m9 = e[o + 9], m10 = e[o + 10];
      const m12 = e[o + 12], m13 = e[o + 13], m14 = e[o + 14];
      const n = g.attributes.position.count;
      for (const name of names) {
        const from = g.attributes[name]?.array;
        const to = out[name];
        if (local && name === "_local_position") to.set(g.attributes.position.array, v * 3);
        else if (local && name === "_local_normal") to.set(g.attributes.normal.array, v * 3);
        else if (local && name === "_deal") to.fill(set.deals[j], v, v + n);
        else if (local && name.startsWith("_instance_matrix_")) {
          const column = Number(name.slice(-1));
          for (let k = 0; k < n; k++) to.set(e.subarray(o + column * 4, o + column * 4 + 4), (v + k) * 4);
        } else if (name === "position") {
          for (let k = 0, s = 0, d = v * 3; k < n; k++, s += 3, d += 3) {
            const x = from[s], y = from[s + 1], z = from[s + 2];
            to[d] = m0 * x + m4 * y + m8 * z + m12;
            to[d + 1] = m1 * x + m5 * y + m9 * z + m13;
            to[d + 2] = m2 * x + m6 * y + m10 * z + m14;
          }
        } else if (name === "normal") {
          // As the shaders turn it: the matrix's own three by three, made a unit again.
          for (let k = 0, s = 0, d = v * 3; k < n; k++, s += 3, d += 3) {
            const x = from[s], y = from[s + 1], z = from[s + 2];
            const nx = m0 * x + m4 * y + m8 * z;
            const ny = m1 * x + m5 * y + m9 * z;
            const nz = m2 * x + m6 * y + m10 * z;
            const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            to[d] = nx / l;
            to[d + 1] = ny / l;
            to[d + 2] = nz / l;
          }
        } else {
          const size = g.attributes[name].itemSize;
          to.set(from.subarray(0, n * size), v * size);
        }
      }
      const src = g.index.array;
      for (let k = 0; k < src.length; k++) index[i + k] = src[k] + v;
      at.get(part)[j] = v;
      v += n;
      i += src.length;
      count[count.length - 1] += src.length;
      since += n;
    }
    const geometry = new THREE.BufferGeometry();
    for (const name of names) geometry.setAttribute(name, new THREE.BufferAttribute(out[name], sizes[name]));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const cells = { ci: Int32Array.from(ci), reach: Float32Array.from(reach), start: Int32Array.from(start), count: Int32Array.from(count), bounds, sectors };
    return {
      geometry,
      apply: () => {
        this.geometry.dispose();
        this.geometry = geometry;
        this.cells = cells;
        for (const [part, starts] of at) part.at = starts;
        if (MULTI_DRAW) {
          this._multiDrawStarts = new Int32Array(ci.length);
          this._multiDrawCounts = new Int32Array(ci.length);
          identityBatching(this, ci.length);
        }
      },
    };
  }

  /** The cells in sight and in reach, as an instanced part has them: those
   *  that follow one another in the index go as one run. */
  show(cellVis, cellDist, visibleBox = null, frustum = _frustum) {
    // (load: one a streamed district brought, not yet written, draws nothing.)
    if (!this.geometry.index) {
      this.visible = false;
      return;
    }
    const { ci, reach, start, count, bounds, sectors } = this.cells;
    const bytes = this.geometry.index.array.BYTES_PER_ELEMENT;
    let n = 0;
    let joined = false;
    for (let r = 0; r < ci.length; r++) {
      if (!cellVis[ci[r]] || cellDist[ci[r]] > reach[r] || bounds?.[r] && (!frustum.intersectsBox(bounds[r]) || visibleBox && !visibleBox(bounds[r], sectors[r]))) {
        joined = false;
      } else if (!MULTI_DRAW) {
        n++;
      } else if (joined) {
        this._multiDrawCounts[n - 1] += count[r];
      } else {
        this._multiDrawStarts[n] = start[r] * bytes;
        this._multiDrawCounts[n++] = count[r];
        joined = true;
      }
    }
    if (MULTI_DRAW) this._multiDrawCount = n;
    this.visible = n > 0;
  }
}

/** three's own order for opaque draws (painterSortStable), with a twin
 *  (createProps) sorted by the material it copies and a Baked mesh by the
 *  instanced mesh it was: for the renderer's setOpaqueSort. */
export function opaqueOrder(a, b) {
  if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
  if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
  const ma = a.material.userData.sortId ?? a.material.id;
  const mb = b.material.userData.sortId ?? b.material.id;
  if (ma !== mb) return ma - mb;
  const va = a.object.isBaked ? 2 : a.materialVariant;
  const vb = b.object.isBaked ? 2 : b.materialVariant;
  if (va !== vb) return va - vb;
  if (a.z !== b.z) return a.z - b.z;
  return a.id - b.id;
}

/**
 * `protoMeshes`: the GLB's proto_ meshes (already dressed in the kit's
 * materials); `buffer`: the props file. Returns { group, update(camera),
 * sources (for the light bake), dispose }.
 */
export function createProps(protoMeshes, buffer, { phone = false, reflectLayer = 0, visibleBox = null, visibilityKey = null, exterior = null, originalBuffer = null, batchInstances = false } = {}) {
  const { protos, data, count, sectorRuns = [] } = parseProps(buffer);
  const placementSectors = new Array(count).fill("exterior");
  for (const { sector, start, count: n } of sectorRuns) placementSectors.fill(sector, start, start + n);
  const attachments = [];
  const lastPosition = new THREE.Vector3(1e9, 0, 0);
  const lastDirection = new THREE.Vector3();
  const group = new THREE.Group();
  group.name = "props";
  // The props' own materials (plants) share the kit's uniforms, which any
  // part the kit dressed carries.
  const own = createPropSurfaces(protoMeshes.find((m) => m.material.uniforms?.uSpill).material.uniforms);
  // The parts of each prototype by name.
  const parts = new Map();
  for (const mesh of protoMeshes) {
    const name = mesh.userData.proto ?? mesh.name.replace(/^proto_/, "").replace(/_[a-z]+(_[a-z]+)?$/, "");
    if (!parts.has(name)) parts.set(name, []);
    parts.get(name).push(mesh);
  }

  // Each prototype's instances, sorted by cell, as matrices.
  const kinds = protos.map((p, pi) => ({ ...p, pi, list: [], reach: (p.reach ?? 5000) * (phone ? 0.65 : 1) }));
  for (let i = 0; i < count; i++) {
    const o = i * 8;
    const k = kinds[data[o]];
    if (!k) continue;
    k.list.push(i);
  }
  // The deal: each instance's design, and its shape where its prototype has
  // more than one (those instances move to the shape's own list).
  const deals = new Float32Array(count);
  for (const rule of RULES) {
    const members = rule.protos.map((name) => kinds.find((k) => k.name === name)).filter((k) => k?.list.length);
    if (!members.length) continue;
    const list = members.flatMap((k) => k.list);
    const [first] = members;
    const shapes = kinds.map((k) => ({ k, v: k.name.startsWith(first.name) && SHAPE.exec(k.name.slice(first.name.length))?.[1] }))
      .filter((s) => s.v).sort((a, b) => a.v - b.v).map((s) => s.k);
    const partitions = new Map();
    for (const i of list) {
      const sector = placementSectors[i];
      if (!partitions.has(sector)) partitions.set(sector, []);
      partitions.get(sector).push(i);
    }
    if (shapes.length) first.list = [];
    for (const indices of partitions.values()) {
      const dealt = deal(data, indices, rule, shapes.length + 1);
      indices.forEach((i, j) => {
        deals[i] = dealt.deal[j];
        if (shapes.length) (dealt.shape[j] ? shapes[dealt.shape[j] - 1] : first).list.push(i);
      });
    }
  }
  const cellOf = (x, z, sector) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)},${sector}`;
  const decoded = (i, out) => {
    const o = i * 8;
    _p.set(data[o + 1] / 20, data[o + 2] / 50, data[o + 3] / 20);
    _q.setFromAxisAngle(_up, data[o + 4] / 10430.2);
    const sxz = data[o + 6] / 1000;
    _s.set(sxz, data[o + 5] / 100, sxz);
    return out.compose(_p, _q, _s);
  };

  // One grid of cells for every prototype: each cell's bounds hold what
  // stands in it, of any kind; each prototype keeps its own runs of
  // instances by cell.
  const cellAt = new Map();
  const cellList = [];
  const cellIndex = (key) => {
    if (!cellAt.has(key)) {
      cellAt.set(key, cellList.length);
      cellList.push(Object.assign(new THREE.Box3(), { sector: key.split(",")[2] }));
    }
    return cellAt.get(key);
  };
  const sets = [];
  const built = new Set();
  const owned = [];
  // A kit material's own copy for each kind of mesh of the props that draws
  // it (the small parts written out, the prototypes' instances): three keeps
  // one program a material, and works it out again whenever the next draw
  // of it is of another kind than the last (the kit's own meshes are a
  // third), some forty times a frame. A twin shares its original's uniforms
  // and is the same program, and it is drawn where its original is in the
  // order (opaqueOrder), so it draws the same. (The written-out parts' twin
  // is the kit meshes' own program: its uniforms are its original's, read
  // through, with uProp 1 over them.)
  const twins = new Map();
  const twin = (material, kind, geometry, glow = null) => {
    const alphas = material.vertexColors && geometry.attributes.color?.itemSize === 4;
    const key = `${material.uuid}|${kind}|${alphas}|${glow ?? ""}`;
    if (!twins.has(key)) {
      // The world uniforms are shared below. Copying their render targets
      // first is unsupported by Three and would create unusable duplicates.
      const source = material.uniforms ? Object.create(material, { uniforms: { value: {} } }) : material;
      const copy = new material.constructor().copy(source);
      if (material.uniforms) copy.uniforms = kind === "baked" ? Object.create(material.uniforms, { uProp: { value: { value: 1 }, enumerable: true }, ...(glow == null ? {} : { uIntensity: { value: { value: glow }, enumerable: true } }) }) : material.uniforms;
      copy.userData.sortId = material.id;
      twins.set(key, copy);
    }
    return twins.get(key);
  };
  // The small parts' meshes, by material and attributes.
  let buildingCore = true;
  const baked = new Map();
  const unwritten = new Set();
  // A prototype's instances and their draws, once its meshes are here (the
  // core's at the start; a district's own arrive with its pack).
  const build = (k, hold = false) => {
    const meshes = parts.get(k.name);
    if (built.has(k.name) || !meshes?.length || !k.list.length) return [];
    built.add(k.name);
    const mine = [];
    // Sort by cell, and note each cell's run.
    const prototypeBounds = new THREE.Box3();
    const billboard = [...meshes, ...(parts.get(k.name + NEAR) ?? [])].some((src) => src.material.name.replace(/^NCW_/, "") === "halo");
    for (const src of [...meshes, ...(parts.get(k.name + NEAR) ?? [])]) {
      if (!src.geometry.boundingBox) src.geometry.computeBoundingBox();
      prototypeBounds.union(src.geometry.boundingBox);
    }
    prototypeBounds.expandByScalar(1);
    const placedBounds = new THREE.Box3();
    const withCell = k.list.map((i) => {
      const o = i * 8;
      return { i, cell: cellOf(data[o + 1] / 20, data[o + 3] / 20, placementSectors[i]) };
    });
    withCell.sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));
    const n = withCell.length;
    const matrices = new Float32Array(n * 16);
    const dealt = Float32Array.from(withCell, ({ i }) => deals[i]);
    const runs = [];
    let run = null;
    const r = Math.max(...k.box) * 2 + 1;
    withCell.forEach(({ i, cell }, j) => {
      decoded(i, _m).toArray(matrices, j * 16);
      const x = data[i * 8 + 1] / 20;
      const y = data[i * 8 + 2] / 50;
      const z = data[i * 8 + 3] / 20;
      const top = y + (data[i * 8 + 5] / 100) * k.box[1] * 2 + r;
      if (!run || run.cell !== cell) {
        run = { cell, ci: cellIndex(cell), sector: placementSectors[i], frustumSafe: !billboard, box: new THREE.Box3(), start: j, end: j };
        runs.push(run);
      }
      run.end = j + 1;
      run.box.union(placedBounds.copy(prototypeBounds).applyMatrix4(_m));
      cellList[run.ci].expandByPoint(_p.set(x - r, y - r, z - r)).expandByPoint(_p.set(x + r, top, z + r));
    });
    const instance = (src) => {
      const mine = own.forName(src.material.name);
      const material = mine ?? src.material;
      const reflected = /^(neon_|glow|lantern)/.test(material.name) || own.light(material.name, k.name);
      const layerMask = 1 | (reflected ? 1 << reflectLayer : 0);
      // The workshop is a small static pack. Write all of its opaque kit
      // parts into the shared material batches, including detailed tools.
      // The city keeps its size limit so thousands of street instances
      // still share their prototype vertices.
      if (!material.transparent && (sectorRuns.length || (!mine && n * src.geometry.attributes.position.count <= BAKED && (!batchInstances || !buildingCore || k.name === "traffic_light")))) {
        // The amber bench strip keeps its own brightness and material batch.
        const glow = own.glow(material.name, k.name);
        const key = `${material.uuid}|${Object.entries(src.geometry.attributes).map(([name, a]) => name + a.itemSize).sort().join()}|${src.userData.assetKind ?? ""}|${layerMask}|${glow ?? ""}`;
        if (!baked.has(key)) {
          const shader = twin(material, mine ? "baked-local" : "baked", src.geometry, glow);
          const mesh = new Baked(mine ? localBatchMaterial(shader) : shader);
          // (load: one a streamed district brings is hidden until its parts
          // are written and put in: shown empty, a frame made its program.)
          if (hold) mesh.visible = false;
          mesh.name = `props_small_${material.name}`;
          if (src.userData.assetKind) mesh.userData.assetKind = src.userData.assetKind;
          mesh.layers.mask = layerMask;
          group.add(mesh);
          baked.set(key, mesh);
        }
        unwritten.add(baked.get(key));
        return { baked: baked.get(key), src: mine ? { geometry: src.geometry, material: mine, name: src.name, userData: src.userData } : src };
      }
      let geometry = src.geometry;
      if (mine?.userData.reads) {
        // Its own geometry over the prototype's attributes (two prototypes
        // may share one), for the deal each instance carries; or, where its
        // material reads a deal it is not dealt (a print is a face that is
        // no light), a deal of 0 for every instance, what it read with
        // none (GL's default), so that it is the dealt ones' vertex layout
        // and render pipeline.
        geometry = new THREE.BufferGeometry();
        geometry.index = src.geometry.index;
        for (const [key, attribute] of Object.entries(src.geometry.attributes)) geometry.setAttribute(key, attribute);
        const deal = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
        geometry.setAttribute("aDeal", mine.userData.dealt ? deal.setUsage(THREE.DynamicDrawUsage) : deal);
        owned.push(geometry);
      } else if (material.uniforms?.uKind && !src.geometry.attributes.color) {
        // A surface that reads no colour (city.js unread) carries what it
        // read with none, three's default of ones, as plain floats: the
        // tinted surfaces' vertex layout, so that the instanced surfaces are
        // one render pipeline and not two. Its own geometry, as above.
        geometry = new THREE.BufferGeometry();
        geometry.index = src.geometry.index;
        for (const [key, attribute] of Object.entries(src.geometry.attributes)) geometry.setAttribute(key, attribute);
        geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(src.geometry.attributes.position.count * 4).fill(1), 4));
        owned.push(geometry);
      }
      const im = new THREE.InstancedMesh(geometry, mine ?? twin(material, "instanced", geometry), n);
      im.name = `props_${k.name}_${material.name}`;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.count = 0;
      // (Shown with no instances until the first update, as a Baked mesh is.
      // load: one a streamed district holds is hidden until it is put in, so
      // no frame draws it before its program and buffers are ready.)
      im.visible = !hold;
      im.frustumCulled = false;
      im.matrixAutoUpdate = false;
      im.userData.hue = src.userData.hue;
      if (src.userData.assetKind) im.userData.assetKind = src.userData.assetKind;
      // Light in the air draws after the steam, as the lamps' shafts do.
      if (material.transparent) im.renderOrder = 7;
      im.layers.mask = layerMask;
      group.add(im);
      return im;
    };
    // A set's parts are its instanced meshes and, of the small ones written
    // out, the prototype's own mesh (`small`, for the light they give).
    const set = (extra, made) => {
      const instanced = made.filter((part) => !part.baked);
      const one = { ...extra, matrices, deals: dealt, runs, instanced, small: made.filter((part) => part.baked).map((part) => part.src), aDeal: instanced.filter((im) => im.material.userData.dealt).map((im) => im.geometry.attributes.aDeal), n, count: 0, sig: -1 };
      for (const part of made) if (part.baked) part.baked.parts.push({ set: one, src: part.src });
      return one;
    };
    mine.push(set({ name: k.name, reach: k.reach }, meshes.map(instance)));
    // Its ornament: the same instances, near by only.
    const near = kinds.find((o) => o.name === k.name + NEAR);
    const ornament = parts.get(k.name + NEAR);
    if (near && ornament?.length) mine.push(set({ near: true, reach: near.reach }, ornament.map(instance)));
    if (!hold) sets.push(...mine);
    return mine;
  };
  // The small parts' meshes that have gained a part, written again, their
  // cells row by row across the map.
  const write = () => {
    if (!unwritten.size) return;
    const rank = ranks();
    for (const mesh of unwritten) mesh.write(rank);
    unwritten.clear();
  };
  const ranks = () => {
    const rank = new Int32Array(cellList.length);
    const rows = [...cellAt].map(([key, ci]) => [ci, ...key.split(",").slice(0, 2).map(Number)]);
    rows.sort((a, b) => a[2] - b[2] || a[1] - b[1]).forEach(([ci], r) => {
      rank[ci] = r;
    });
    return rank;
  };
  // (load: write, a piece at a time and out of sight: returns what each
  // mesh will draw, and the apply() that puts it all in at once.)
  function* writeSteps() {
    const rank = ranks();
    const done = [];
    for (const mesh of unwritten) {
      yield;
      done.push({ mesh, ...(yield* mesh.writeSteps(rank)) });
    }
    return {
      written: done.map(({ mesh, geometry }) => ({ object: mesh, geometry })),
      apply() {
        for (const { mesh, apply } of done) {
          apply();
          unwritten.delete(mesh);
        }
      },
    };
  }
  for (const k of kinds) build(k);
  buildingCore = false;
  const prototypeBatches = batchInstances && !sectorRuns.length ? createPropBatches(sets, group, twin) : null;
  write();

  // Offline exterior batches replace their placements atomically. Keep the
  // prototypes' local frames for procedural paint, and their original
  // records for signal colours and the street-level light bake.
  const exteriorSets = [];
  const exteriorDeals = new Map();
  if (exterior) {
    if (!originalBuffer) throw new Error("Exterior batches need their original light-bake records.");
    const original = parseProps(originalBuffer);
    for (const source of exterior.children) {
      if (!source.isMesh || source.userData.sourceKind !== "prop" || source.userData.visibilitySector !== "exterior") throw new Error("Invalid exterior prop batch.");
      const geometry = source.geometry.clone();
      const name = source.material.name.replace(/^NCW_/, "");
      const prototype = protoMeshes.find((m) => m.material.name.replace(/^NCW_/, "") === name);
      const local = own.forName(name);
      if (!prototype) throw new Error(`Missing exterior prop material ${name}.`);
      let material;
      if (source.userData.shaderLocal) {
        if (!local) throw new Error(`Missing exterior local shader ${name}.`);
        material = localBatchMaterial(twin(local, "exterior", geometry));
      } else material = twin(prototype.material, "baked", geometry);
      const mesh = new Baked(material);
      mesh.geometry.dispose(); mesh.geometry = geometry;
      mesh.name = source.name;
      mesh.userData = { ...source.userData };
      mesh.layers.mask = source.userData.sourceLayers;
      const runs = source.userData.runs;
      mesh.cells = { ci: new Int32Array(runs.length), reach: new Float32Array(runs.length), start: new Int32Array(runs.length), count: new Int32Array(runs.length) };
      for (let r = 0; r < runs.length; r++) {
        const [x, z, reach, start, count] = runs[r];
        const ci = cellIndex(`${x},${z},exterior`);
        mesh.cells.ci[r] = ci; mesh.cells.reach[r] = reach;
        mesh.cells.start[r] = start; mesh.cells.count[r] = count;
        // Bounds come from the original placement records below, exactly
        // as the instanced path measured reach and the shared grid cell.
      }
      if (MULTI_DRAW) {
        mesh._multiDrawStarts = new Int32Array(runs.length);
        mesh._multiDrawCounts = new Int32Array(runs.length);
        identityBatching(mesh, runs.length);
      }
      for (const [record, , proto, partName, start, count] of source.userData.placements) {
        const src = parts.get(proto)?.find((p) => p.name === partName);
        if (!src) throw new Error(`Missing exterior prototype part ${partName}.`);
        const o = record * 8;
        _p.set(original.data[o + 1] / 20, original.data[o + 2] / 50, original.data[o + 3] / 20);
        _q.setFromAxisAngle(_up, original.data[o + 4] / 10430.2);
        _s.set(original.data[o + 6] / 1000, original.data[o + 5] / 100, original.data[o + 6] / 1000);
        const matrices = Float32Array.from(_m.compose(_p, _q, _s).elements);
        const kind = original.protos[original.data[o]];
        const r = Math.max(...kind.box) * 2 + 1;
        const x = original.data[o + 1] / 20, y = original.data[o + 2] / 50, z = original.data[o + 3] / 20;
        const top = y + original.data[o + 5] / 100 * kind.box[1] * 2 + r;
        const ci = cellIndex(cellOf(x, z, "exterior"));
        cellList[ci].expandByPoint(_p.set(x - r, y - r, z - r)).expandByPoint(_p.set(x + r, top, z + r));
        const im = { geometry: src.geometry, material: local ?? src.material, userData: src.userData };
        const set = { name: proto, near: proto.endsWith(NEAR), n: 1, matrices, deals: new Float32Array(1), instanced: [im], small: [] };
        exteriorSets.push(set);
        let first = Infinity;
        for (let i = start; i < start + count; i++) first = Math.min(first, geometry.index.getX(i));
        mesh.parts.push({ set, src, at: Int32Array.of(first) });
        if (local?.userData.dealt) {
          if (!exteriorDeals.has(proto)) exteriorDeals.set(proto, new Map());
          const rows = exteriorDeals.get(proto);
          if (!rows.has(record)) rows.set(record, { matrices, parts: [] });
          rows.get(record).parts.push({ geometry, first, count: src.geometry.attributes.position.count, set });
        }
      }
      group.add(mesh);
      baked.set(`exterior:${source.uuid}`, mesh);
    }
  }

  // Whenever the camera has moved or turned enough: which cells the frustum
  // holds and how far each is, once for everyone; then each prototype's
  // instances in the cells it is drawn at (inside its reach), rebuilt only
  // if that set of cells changed since last time.
  const frustum = new THREE.Frustum();
  let cellVis = new Uint8Array(cellList.length);
  let cellDist = new Float32Array(cellList.length);
  const runVisible = (run, reach) => cellVis[run.ci] && cellDist[run.ci] <= reach && (run.frustumSafe === false || frustum.intersectsBox(run.box)) && (!visibleBox || visibleBox(run.box, run.sector));
  let frames = 0;
  let stale = false;
  let lastCamera = null;
  let lastKey = null;
  let passes = new WeakMap();
  const outsideRuns = new Map();
  const rememberBaked = (mesh, saved = {}) => {
    saved.geometry = mesh.geometry; saved.visible = mesh.visible;
    if (mesh.isBatchedMesh) {
      saved.count = mesh._multiDrawCount;
      if (!(saved.starts?.length >= saved.count)) {
        saved.starts = new Int32Array(saved.count);
        saved.counts = new Int32Array(saved.count);
      }
      saved.starts.set(mesh._multiDrawStarts.subarray(0, saved.count));
      saved.counts.set(mesh._multiDrawCounts.subarray(0, saved.count));
    }
    return saved;
  };
  const update = (camera) => {
    camera.updateMatrixWorld();
    camera.getWorldDirection(_dir);
    const moved = camera.position.distanceToSquared(lastPosition) > 0.25 || _dir.dot(lastDirection) < 0.99985;
    const key = visibilityKey?.();
    frames++;
    if (!moved && !stale && camera === lastCamera && (!key || key === lastKey) && frames % 60 !== 0) return;
    if (stale) passes = new WeakMap();
    lastCamera = camera;
    lastKey = key;
    stale = false;
    if (cellVis.length !== cellList.length) {
      cellVis = new Uint8Array(cellList.length);
      cellDist = new Float32Array(cellList.length);
    }
    lastPosition.copy(camera.position);
    lastDirection.copy(_dir);
    // Room passes alternate between two static cameras. Reuse their exact
    // cell/run decisions, then pack from the current matrices and deals.
    // Cached arrays are copies so an uncached outdoor pass cannot alter them.
    let prepared = key ? passes.get(camera) : null;
    const cached = prepared?.key === key && prepared?.vis.length === cellList.length;
    // Signals query these same runs between draws. Restore the camera
    // frustum even when its visible lists came from the pass cache.
    _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(_vp);
    if (cached) {
      cellVis.set(prepared.vis); cellDist.set(prepared.dist);
    } else {
      const cam = camera.position;
      for (let c = 0; c < cellList.length; c++) {
        cellDist[c] = cellList[c].distanceToPoint(cam);
        cellVis[c] = frustum.intersectsBox(cellList[c]) && (!visibleBox || visibleBox(cellList[c], cellList[c].sector)) ? 1 : 0;
      }
      if (key) {
        prepared ??= { sets: new Map(), baked: new Map() };
        if (prepared.vis?.length !== cellList.length) {
          prepared.vis = new Uint8Array(cellList.length);
          prepared.dist = new Float32Array(cellList.length);
        }
        prepared.vis.set(cellVis); prepared.dist.set(cellDist);
        prepared.key = key;
        passes.set(camera, prepared);
      }
    }
    for (const set of sets) {
      const reach = set.reach;
      // The set of cells it is drawn in, as a hash.
      const lists = prepared?.sets ?? outsideRuns;
      let selected = lists.get(set);
      if (!cached || !selected) {
        selected ??= { runs: [], sig: 0 };
        selected.runs.length = 0;
        let sig = 2166136261;
        for (const run of set.runs) if (runVisible(run, reach)) {
          sig = Math.imul(sig ^ run.ci, 16777619) >>> 0;
          selected.runs.push(run);
        }
        selected.sig = sig;
        lists.set(set, selected);
      }
      set.selected = selected;
      if (selected.sig === set.sig) continue;
      set.sig = selected.sig;
      let c = 0;
      const dst = set.instanced[0]?.instanceMatrix.array;
      const dealt = set.aDeal;
      for (const run of selected.runs) {
        dst?.set(set.matrices.subarray(run.start * 16, run.end * 16), c * 16);
        if (dealt.length) dealt[0].array.set(set.deals.subarray(run.start, run.end), c);
        c += run.end - run.start;
      }
      set.count = c;
      for (let m = 0; m < set.instanced.length; m++) {
        const im = set.instanced[m];
        if (m > 0) im.instanceMatrix.array.set(dst.subarray(0, c * 16));
        im.count = c;
        im.visible = c > 0;
        im.instanceMatrix.clearUpdateRanges();
        im.instanceMatrix.addUpdateRange(0, c * 16);
        im.instanceMatrix.needsUpdate = true;
      }
      for (let m = 0; m < dealt.length; m++) {
        if (m > 0) dealt[m].array.set(dealt[0].array.subarray(0, c));
        dealt[m].clearUpdateRanges();
        dealt[m].addUpdateRange(0, c);
        dealt[m].needsUpdate = true;
      }
    }
    prototypeBatches?.update(camera);
    for (const mesh of baked.values()) {
      const saved = prepared?.baked.get(mesh);
      if (cached && saved?.geometry === mesh.geometry) {
        mesh.visible = saved.visible;
        if (mesh.isBatchedMesh) {
          mesh._multiDrawCount = saved.count;
          mesh._multiDrawStarts.set(saved.starts.subarray(0, saved.count));
          mesh._multiDrawCounts.set(saved.counts.subarray(0, saved.count));
        }
      } else {
        mesh.show(cellVis, cellDist, visibleBox, frustum);
        if (prepared) prepared.baked.set(mesh, rememberBaked(mesh, saved));
      }
    }
  };

  // The light the props give the street, for the bake (src/world/spill.js):
  // every emissive part at street level, in the world, as one mesh each.
  const bakeMeshes = [];
  const PLAIN = { key: 0, color: null, gain: 1 };
  const sourcesOf = (list) => {
    const sources = [];
    for (const set of list) {
      if (set.near) continue;
      for (const im of [...set.instanced, ...set.small]) {
        const name = im.material.name;
        const face = own.light(name, set.name);
        if (!/^(neon_|glow|lantern)/.test(name) && !face) continue;
        const g = im.geometry;
        const pos = g.attributes.position;
        const index = g.index;
        const triCount = (index ? index.count : pos.count) / 3;
        let colour = new THREE.Color(im.userData.hue ? NEON[im.userData.hue] ?? "#ffffff" : name === "lantern" ? "#ff4a2a" : "#ffffff");
        if ((name === "glow" || face) && g.attributes.color) {
          const c = g.attributes.color;
          let r = 0, gg = 0, b = 0;
          for (let i = 0; i < c.count; i++) {
            r += c.getX(i);
            gg += c.getY(i);
            b += c.getZ(i);
          }
          colour = new THREE.Color(r / c.count, gg / c.count, b / c.count);
        }
        // One mesh for each light the part gives: a lantern's is its own
        // colour, and one left dark gives none.
        const lights = new Map();
        const v = new THREE.Vector3();
        for (let j = 0; j < set.n; j++) {
          _m.fromArray(set.matrices, j * 16);
          if (set.matrices[j * 16 + 13] > 8) continue;
          const light = face ? own.lightOf(name, set.deals[j]) : PLAIN;
          if (!light) continue;
          if (!lights.has(light.key)) lights.set(light.key, { ...light, out: [] });
          const { out } = lights.get(light.key);
          for (let t = 0; t < triCount * 3; t++) {
            v.fromBufferAttribute(pos, index ? index.getX(t) : t).applyMatrix4(_m);
            out.push(v.x, v.y, v.z);
          }
        }
        for (const { out, color, gain } of lights.values()) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
          const mesh = new THREE.Mesh(geo);
          mesh.matrixWorldAutoUpdate = false;
          bakeMeshes.push(mesh);
          sources.push({ mesh, color: color ?? colour, intensity: (face || (name === "glow" ? 0.6 : 0.9)) * gain });
        }
      }
    }
    return sources;
  };
  const sources = sourcesOf([...sets, ...exteriorSets]);
  if (sectorRuns.length) {
    group.name = "props_garage_room";
    group.traverse((node) => {
      node.userData.sector = "garage_room";
      node.userData.sectorRuns = sectorRuns.map((run) => ({ ...run }));
    });
  }

  return {
    group,
    update(camera) {
      update(camera);
      for (const child of attachments) child.update(camera);
    },
    sources,
    /** A pack shares material and prototype draws across its open room.
     *  Sector labels stay on the cell runs, so each camera can still cull
     *  them independently without drawing the same material per sector. */
    addPlacements(meshes, buffer, { hold = false } = {}) {
      const parsed = parseProps(buffer);
      const { protos, data, count, sectorRuns } = parsed;
      if (!Number.isInteger(count) || count <= 0 || !Array.isArray(sectorRuns) || !sectorRuns.length) throw new Error("garage placements are empty or have no sectors");
      const covered = new Uint8Array(count);
      for (const { sector, start, count: n } of sectorRuns) {
        if (!/^garage_(apron|s4|s6|shop|mezzanine)$/.test(sector) || !Number.isInteger(start) || !Number.isInteger(n) || start < 0 || n <= 0 || start + n > count) throw new Error("invalid garage sector run");
        for (let i = start; i < start + n; i++) {
          if (covered[i]++) throw new Error("overlapping garage sector runs");
          if (!protos[data[i * 8]]) throw new Error("unknown garage placement prototype");
        }
      }
      if (covered.some((n) => n !== 1)) throw new Error("garage placements lack sector coverage");
      const available = new Set(meshes.map((mesh) => mesh.userData.proto ?? mesh.name.replace(/^proto_/, "").replace(/_[a-z]+(_[a-z]+)?$/, "")));
      for (let i = 0; i < count; i++) if (!available.has(protos[data[i * 8]].name)) throw new Error(`missing garage prototype ${protos[data[i * 8]].name}`);
      const children = [createProps(meshes, buffer, { phone, reflectLayer, visibleBox, visibilityKey })];
      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        attachments.push(...children);
        children.forEach((child) => group.add(child.group));
        stale = true;
      };
      const prepare = function* () {
        const drawn = [];
        for (const child of children) child.group.traverse((object) => {
          if (object.isMesh) drawn.push({ object, geometry: object.geometry, extra: object.isInstancedMesh ? [object.instanceMatrix] : [] });
        });
        yield;
        return drawn;
      };
      const result = { count, sources: children.flatMap((child) => child.sources), prepare, commit,
        disposeBake() { children.forEach((child) => child.disposeBake()); },
        dispose() { if (!committed) children.forEach((child) => child.dispose()); } };
      if (!hold) commit();
      return result;
    },
    /**
     * Prototypes that came with a district's pack (dressed as the core's
     * were): their instances are drawn from now on. Returns the light they
     * give the street, for the bake.
     */
    /** (load: with `hold`, the new sets are made but not drawn, and their
     *  light worked out, until the returned `commit()`: a district built a
     *  piece at a time appears in one frame. Returns { sources, commit }
     *  then, else the sources.) */
    addProtos(meshes, { hold = false } = {}) {
      const names = new Set();
      for (const mesh of meshes) {
        const name = mesh.userData.proto ?? mesh.name.replace(/^proto_/, "").replace(/_[a-z]+(_[a-z]+)?$/, "");
        if (!parts.has(name)) parts.set(name, []);
        parts.get(name).push(mesh);
        names.add(name.endsWith(NEAR) ? name.slice(0, -NEAR.length) : name);
      }
      const added = [];
      for (const k of kinds) if (names.has(k.name)) added.push(...build(k, hold));
      // (load: with `hold`, the small parts' meshes may be written out of
      // sight first, `prepare()` a generator returning what will be drawn,
      // each { object, geometry }: then commit() only puts them in.)
      let written = null;
      const commit = () => {
        if (hold) {
          sets.push(...added);
          for (const set of added) for (const im of set.instanced) im.visible = true;
        }
        if (written) written.apply();
        else write();
        stale = true;
      };
      if (!hold) commit();
      const sources = sourcesOf(added);
      const prepare = function* () {
        written = yield* writeSteps();
        const instanced = added.flatMap((set) => set.instanced).map((object) => ({ object, geometry: object.geometry, extra: [object.instanceMatrix] }));
        return [...instanced, ...written.written];
      };
      return hold ? { sources, commit, prepare } : sources;
    },
    /** Prototype `name`'s parts written out (src/world/signals.js colours a
     *  signal's lenses on their vertices): each part's mesh, its own
     *  geometry, its instances' matrices and where each one's vertices start
     *  in the mesh's. A mesh is written again, a new geometry, when a
     *  district's pack adds parts to it. */
    written(name) {
      return [...baked.values()].flatMap((mesh) => mesh.parts.filter((p) => p.set.name === name && p.at).map((p) => ({ mesh, geometry: mesh.geometry, src: p.src, matrices: p.set.matrices, at: p.at })));
    },
    /** Prototype `name`'s instances' deals (src/world/signals.js shows a
     *  crossing's signal in its box's): its instances' matrices, and
     *  deal(j, value), which gives instance j that deal and, if it is drawn
     *  now, sends up only its own. Null if it has no dealt part. */
    dealt(name) {
      const set = sets.find((st) => st.name === name && st.aDeal.length);
      const extra = [...(exteriorDeals.get(name)?.values() ?? [])];
      if (!set && !extra.length) return null;
      const n = set?.n ?? 0;
      const matrices = extra.length ? new Float32Array((n + extra.length) * 16) : set.matrices;
      if (extra.length) {
        if (set) matrices.set(set.matrices);
        extra.forEach((row, j) => matrices.set(row.matrices, (n + j) * 16));
      }
      return {
        matrices,
        deal(j, value) {
          if (j >= n) {
            for (const { geometry, first, count, set: partSet } of extra[j - n].parts) {
              partSet.deals[0] = value;
              const attribute = geometry.attributes._deal;
              attribute.array.fill(value, first, first + count);
              attribute.addUpdateRange(first, count); attribute.needsUpdate = true;
            }
            return;
          }
          set.deals[j] = value;
          for (const { mesh, ids } of set.batchDeals ?? []) mesh.setColorAt(ids[j], new THREE.Vector4(value, 0, 0, 1));
          // Where it is in what is drawn: the runs in sight before its own.
          let c = 0;
          for (const run of set.runs) {
            if (!runVisible(run, set.reach)) continue;
            if (j < run.end && j >= run.start) {
              for (const a of set.aDeal) {
                a.array[c + j - run.start] = value;
                a.addUpdateRange(c + j - run.start, 1);
                a.needsUpdate = true;
              }
              return;
            }
            c += run.end - run.start;
          }
        },
      };
    },
    /** Instances drawn last update, by prototype, for the dev hooks. */
    stats() {
      return Object.fromEntries(sets.filter((st) => !st.near).map((st) => [st.name, `${st.count}/${st.n}`]));
    },
    disposeBake() {
      attachments.forEach((child) => child.disposeBake());
      for (const m of bakeMeshes) m.geometry.dispose();
      bakeMeshes.length = 0;
    },
    dispose() {
      attachments.forEach((child) => child.dispose());
      prototypeBatches?.dispose();
      for (const m of bakeMeshes) m.geometry.dispose();
      for (const set of sets) for (const im of set.instanced) im.dispose();
      for (const mesh of baked.values()) {
        mesh.geometry.dispose();
      }
      for (const geometry of owned) geometry.dispose();
      for (const material of twins.values()) material.dispose();
      own.dispose();
      group.removeFromParent();
    },
  };
}
