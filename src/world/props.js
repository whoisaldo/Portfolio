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
import * as THREE from "three";
import { worldPropsUrl } from "../data/world-assets.js";
import { NEON } from "./materials.js";
import { RULES, deal } from "./prop-deal.js";
import { createPropSurfaces } from "./prop-surfaces.js";

const CELL = 48;
const NEAR = "__near";
const SHAPE = /^__v(\d+)$/;
const cache = new Map();

/** The tier's props file, fetched once. */
export function preloadProps(tier) {
  if (!cache.has(tier)) {
    const p = fetch(worldPropsUrl[tier])
      .then((r) => {
        if (!r.ok) throw new Error(`props ${r.status}`);
        return r.arrayBuffer();
      })
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
  // A prototype's instances and their draws, once its meshes are here (the
  // core's at the start; a district's own arrive with its pack).
  const build = (k) => {
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
      im.visible = false;
      im.frustumCulled = false;
      im.matrixAutoUpdate = false;
      im.userData.hue = src.userData.hue;
      // Light in the air draws after the steam, as the lamps' shafts do.
      if (material.transparent) im.renderOrder = 7;
      if (/^(neon_|glow|lantern)/.test(material.name) || own.light(material.name)) im.layers.enable(reflectLayer);
      group.add(im);
      return im;
    };
    const set = (extra, instanced) => ({ ...extra, matrices, deals: dealt, runs, instanced, aDeal: instanced.map((im) => im.geometry.attributes.aDeal).filter(Boolean), n, sig: -1 });
    mine.push(set({ name: k.name, reach: k.reach }, meshes.map(instance)));
    // Its ornament: the same instances, near by only.
    const near = kinds.find((o) => o.name === k.name + NEAR);
    const ornament = parts.get(k.name + NEAR);
    if (near && ornament?.length) mine.push(set({ near: true, reach: near.reach }, ornament.map(instance)));
    sets.push(...mine);
    return mine;
  };
  for (const k of kinds) build(k);

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
      const dst = set.instanced[0].instanceMatrix.array;
      const dealt = set.aDeal;
      for (const run of set.runs) {
        if (!cellVis[run.ci] || cellDist[run.ci] > reach) continue;
        dst.set(set.matrices.subarray(run.start * 16, run.end * 16), c * 16);
        if (dealt.length) dealt[0].array.set(set.deals.subarray(run.start, run.end), c);
        c += run.end - run.start;
      }
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
  };

  // The light the props give the street, for the bake (src/world/spill.js):
  // every emissive part at street level, in the world, as one mesh each.
  const bakeMeshes = [];
  const PLAIN = { key: 0, color: null, gain: 1 };
  const sourcesOf = (list) => {
    const sources = [];
    for (const set of list) {
      if (set.near) continue;
      for (const im of set.instanced) {
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
    addProtos(meshes) {
      const names = new Set();
      for (const mesh of meshes) {
        const name = mesh.userData.proto ?? mesh.name.replace(/^proto_/, "").replace(/_[a-z]+(_[a-z]+)?$/, "");
        if (!parts.has(name)) parts.set(name, []);
        parts.get(name).push(mesh);
        names.add(name.endsWith(NEAR) ? name.slice(0, -NEAR.length) : name);
      }
      const added = [];
      for (const k of kinds) if (names.has(k.name)) added.push(...build(k));
      stale = true;
      return sourcesOf(added);
    },
    /** Instances drawn last update, by prototype, for the dev hooks. */
    stats() {
      return Object.fromEntries(sets.filter((st) => !st.near).map((st) => [st.name, `${st.instanced[0].count}/${st.n}`]));
    },
    disposeBake() {
      for (const m of bakeMeshes) m.geometry.dispose();
      bakeMeshes.length = 0;
    },
    dispose() {
      for (const m of bakeMeshes) m.geometry.dispose();
      for (const set of sets) for (const im of set.instanced) im.dispose();
      for (const geometry of owned) geometry.dispose();
      own.dispose();
      group.removeFromParent();
    },
  };
}
