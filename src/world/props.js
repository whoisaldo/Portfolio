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

const CELL = 48;
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
export function preloadProps(tier) {
  if (!cache.has(tier)) {
    // (load: gzipped beside the plain file; src/world/fetched.js.)
    const p = fetchUnpacked(worldPropsUrl[tier])
      .catch((err) => {
        cache.delete(tier);
        throw err;
      });
    cache.set(tier, p);
  }
  return cache.get(tier);
}

function parse(buffer) {
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
const _last = new THREE.Vector3(1e9, 0, 0);
const _lastDir = new THREE.Vector3();
const _dir = new THREE.Vector3();

/**
 * Small parts written out, one mesh a material: an instanced mesh of one
 * instance that stands where it is (so the materials' instanced shaders,
 * which know a prop from a wall by being instanced, draw it as they draw a
 * prop), drawn a run of cells at a time.
 */
class Baked extends THREE.InstancedMesh {
  constructor(material) {
    super(new THREE.BufferGeometry(), material, 1);
    this.setMatrixAt(0, _m.identity());
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
      this._matricesTexture = this._indirectTexture = this._colorsTexture = null;
    }
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
    let verts = 0;
    let indices = 0;
    // Each instance of each part, by its cell and then by how far it is seen.
    const items = [];
    for (const { set, src } of this.parts) {
      const g = src.geometry;
      for (const run of set.runs) for (let j = run.start; j < run.end; j++) items.push({ ci: run.ci, set, g, j });
      verts += set.n * g.attributes.position.count;
      indices += set.n * g.index.count;
    }
    yield;
    items.sort((a, b) => rank[a.ci] - rank[b.ci] || a.set.reach - b.set.reach);
    yield;
    const out = Object.fromEntries(names.map((name) => [name, new Float32Array(verts * this.parts[0].src.geometry.attributes[name].itemSize)]));
    const index = verts > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
    const ci = [];
    const reach = [];
    const start = [];
    const count = [];
    let v = 0;
    let i = 0;
    let since = 0;
    for (const { ci: cell, set, g, j } of items) {
      if (since > 8192) {
        since = 0;
        yield;
      }
      if (ci[ci.length - 1] !== cell || reach[reach.length - 1] !== set.reach) {
        ci.push(cell);
        reach.push(set.reach);
        start.push(i);
        count.push(0);
      }
      // The instance's matrix (a frame: no projective row), written out by
      // hand: the same sums as Matrix4 and Matrix3 make, without the calls.
      const e = set.matrices;
      const o = j * 16;
      const m0 = e[o], m1 = e[o + 1], m2 = e[o + 2];
      const m4 = e[o + 4], m5 = e[o + 5], m6 = e[o + 6];
      const m8 = e[o + 8], m9 = e[o + 9], m10 = e[o + 10];
      const m12 = e[o + 12], m13 = e[o + 13], m14 = e[o + 14];
      const n = g.attributes.position.count;
      for (const name of names) {
        const from = g.attributes[name].array;
        const to = out[name];
        if (name === "position") {
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
      v += n;
      i += src.length;
      count[count.length - 1] += src.length;
      since += n;
    }
    const geometry = new THREE.BufferGeometry();
    for (const name of names) geometry.setAttribute(name, new THREE.BufferAttribute(out[name], this.parts[0].src.geometry.attributes[name].itemSize));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const cells = { ci: Int32Array.from(ci), reach: Float32Array.from(reach), start: Int32Array.from(start), count: Int32Array.from(count) };
    return {
      geometry,
      apply: () => {
        this.geometry.dispose();
        this.geometry = geometry;
        this.cells = cells;
        if (MULTI_DRAW) {
          this._multiDrawStarts = new Int32Array(ci.length);
          this._multiDrawCounts = new Int32Array(ci.length);
        }
      },
    };
  }

  /** The cells in sight and in reach, as an instanced part has them: those
   *  that follow one another in the index go as one run. */
  show(cellVis, cellDist) {
    // (load: one a streamed district brought, not yet written, draws nothing.)
    if (!this.geometry.index) {
      this.visible = false;
      return;
    }
    const { ci, reach, start, count } = this.cells;
    const bytes = this.geometry.index.array.BYTES_PER_ELEMENT;
    let n = 0;
    let joined = false;
    for (let r = 0; r < ci.length; r++) {
      if (!cellVis[ci[r]] || cellDist[ci[r]] > reach[r]) {
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

/**
 * `protoMeshes`: the GLB's proto_ meshes (already dressed in the kit's
 * materials); `buffer`: the props file. Returns { group, update(camera),
 * sources (for the light bake), dispose }.
 */
export function createProps(protoMeshes, buffer, { phone = false, reflectLayer = 0 } = {}) {
  const { protos, data, count } = parse(buffer);
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
    const dealt = deal(data, list, rule, shapes.length + 1);
    list.forEach((i, j) => {
      deals[i] = dealt.deal[j];
    });
    if (!shapes.length) continue;
    first.list = [];
    list.forEach((i, j) => (dealt.shape[j] ? shapes[dealt.shape[j] - 1] : first).list.push(i));
  }
  const cellOf = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
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
      cellList.push(new THREE.Box3());
    }
    return cellAt.get(key);
  };
  const sets = [];
  const built = new Set();
  const owned = [];
  // The small parts' meshes, by material and attributes.
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
    const withCell = k.list.map((i) => {
      const o = i * 8;
      return { i, cell: cellOf(data[o + 1] / 20, data[o + 3] / 20) };
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
        run = { cell, ci: cellIndex(cell), start: j, end: j };
        runs.push(run);
      }
      run.end = j + 1;
      cellList[run.ci].expandByPoint(_p.set(x - r, y - r, z - r)).expandByPoint(_p.set(x + r, top, z + r));
    });
    const instance = (src) => {
      const mine = own.forName(src.material.name);
      const material = mine ?? src.material;
      if (!mine && !material.transparent && n * src.geometry.attributes.position.count <= BAKED) {
        const key = `${material.uuid}|${Object.entries(src.geometry.attributes).map(([name, a]) => name + a.itemSize).sort().join()}`;
        if (!baked.has(key)) {
          const mesh = new Baked(material);
          // (load: one a streamed district brings is hidden until its parts
          // are written and put in: shown empty, a frame made its program.)
          if (hold) mesh.visible = false;
          mesh.name = `props_small_${material.name}`;
          if (/^(neon_|glow|lantern)/.test(material.name) || own.light(material.name)) mesh.layers.enable(reflectLayer);
          group.add(mesh);
          baked.set(key, mesh);
        }
        unwritten.add(baked.get(key));
        return { baked: baked.get(key), src };
      }
      let geometry = src.geometry;
      if (mine?.userData.dealt) {
        // Its own geometry over the prototype's attributes (two prototypes
        // may share one), for the deal each instance carries.
        geometry = new THREE.BufferGeometry();
        geometry.index = src.geometry.index;
        for (const [key, attribute] of Object.entries(src.geometry.attributes)) geometry.setAttribute(key, attribute);
        geometry.setAttribute("aDeal", new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
        owned.push(geometry);
      }
      const im = new THREE.InstancedMesh(geometry, material, n);
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
      // Light in the air draws after the steam, as the lamps' shafts do.
      if (material.transparent) im.renderOrder = 7;
      if (/^(neon_|glow|lantern)/.test(material.name) || own.light(material.name)) im.layers.enable(reflectLayer);
      group.add(im);
      return im;
    };
    // A set's parts are its instanced meshes and, of the small ones written
    // out, the prototype's own mesh (`small`, for the light they give).
    const set = (extra, made) => {
      const instanced = made.filter((part) => !part.baked);
      const one = { ...extra, matrices, deals: dealt, runs, instanced, small: made.filter((part) => part.baked).map((part) => part.src), aDeal: instanced.map((im) => im.geometry.attributes.aDeal).filter(Boolean), n, count: 0, sig: -1 };
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
    const rows = [...cellAt].map(([key, ci]) => [ci, ...key.split(",").map(Number)]);
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
  write();

  // Whenever the camera has moved or turned enough: which cells the frustum
  // holds and how far each is, once for everyone; then each prototype's
  // instances in the cells it is drawn at (inside its reach), rebuilt only
  // if that set of cells changed since last time.
  let cellVis = new Uint8Array(cellList.length);
  let cellDist = new Float32Array(cellList.length);
  let frames = 0;
  let stale = false;
  const update = (camera) => {
    camera.updateMatrixWorld();
    camera.getWorldDirection(_dir);
    const moved = camera.position.distanceToSquared(_last) > 0.25 || _dir.dot(_lastDir) < 0.99985;
    frames++;
    if (!moved && !stale && frames % 60 !== 0) return;
    stale = false;
    if (cellVis.length !== cellList.length) {
      cellVis = new Uint8Array(cellList.length);
      cellDist = new Float32Array(cellList.length);
    }
    _last.copy(camera.position);
    _lastDir.copy(_dir);
    _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_vp);
    const cam = camera.position;
    for (let c = 0; c < cellList.length; c++) {
      cellDist[c] = cellList[c].distanceToPoint(cam);
      cellVis[c] = _frustum.intersectsBox(cellList[c]) ? 1 : 0;
    }
    for (const set of sets) {
      const reach = set.reach;
      // The set of cells it is drawn in, as a hash.
      let sig = 2166136261;
      for (const run of set.runs) {
        if (cellVis[run.ci] && cellDist[run.ci] <= reach) sig = Math.imul(sig ^ run.ci, 16777619) >>> 0;
      }
      if (sig === set.sig) continue;
      set.sig = sig;
      let c = 0;
      const dst = set.instanced[0]?.instanceMatrix.array;
      const dealt = set.aDeal;
      for (const run of set.runs) {
        if (!cellVis[run.ci] || cellDist[run.ci] > reach) continue;
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
    for (const mesh of baked.values()) mesh.show(cellVis, cellDist);
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
        const face = own.light(name);
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
  const sources = sourcesOf(sets);

  return {
    group,
    update,
    sources,
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
    /** Instances drawn last update, by prototype, for the dev hooks. */
    stats() {
      return Object.fromEntries(sets.filter((st) => !st.near).map((st) => [st.name, `${st.count}/${st.n}`]));
    },
    disposeBake() {
      for (const m of bakeMeshes) m.geometry.dispose();
      bakeMeshes.length = 0;
    },
    dispose() {
      for (const m of bakeMeshes) m.geometry.dispose();
      for (const set of sets) for (const im of set.instanced) im.dispose();
      for (const mesh of baked.values()) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
      for (const geometry of owned) geometry.dispose();
      own.dispose();
      group.removeFromParent();
    },
  };
}
