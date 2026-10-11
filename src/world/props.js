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
import * as THREE from "three";
import { worldPropsUrl } from "../data/world-assets.js";
import { NEON } from "./materials.js";

const CELL = 48;
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
const _box = new THREE.Box3();
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
  const cellOf = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  const decoded = (i, out) => {
    const o = i * 8;
    _p.set(data[o + 1] / 20, data[o + 2] / 50, data[o + 3] / 20);
    _q.setFromAxisAngle(_up, data[o + 4] / 10430.2);
    const sxz = data[o + 6] / 1000;
    _s.set(sxz, data[o + 5] / 100, sxz);
    return out.compose(_p, _q, _s);
  };

  const sets = [];
  for (const k of kinds) {
    const meshes = parts.get(k.name);
    if (!meshes?.length || !k.list.length) continue;
    // Sort by cell, and note each cell's run and bounds.
    const withCell = k.list.map((i) => {
      const o = i * 8;
      return { i, cell: cellOf(data[o + 1] / 20, data[o + 3] / 20) };
    });
    withCell.sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));
    const n = withCell.length;
    const matrices = new Float32Array(n * 16);
    const cells = [];
    let run = null;
    const r = Math.max(...k.box) * 2 + 1;
    withCell.forEach(({ i, cell }, j) => {
      decoded(i, _m).toArray(matrices, j * 16);
      const x = data[i * 8 + 1] / 20;
      const y = data[i * 8 + 2] / 50;
      const z = data[i * 8 + 3] / 20;
      const top = y + (data[i * 8 + 5] / 100) * k.box[1] * 2 + r;
      if (!run || run.cell !== cell) {
        run = { cell, start: j, end: j, box: new THREE.Box3(new THREE.Vector3(x - r, y - r, z - r), new THREE.Vector3(x + r, top, z + r)) };
        cells.push(run);
      }
      run.end = j + 1;
      run.box.expandByPoint(_p.set(x - r, y - r, z - r)).expandByPoint(_p.set(x + r, top, z + r));
    });
    const instanced = meshes.map((src) => {
      const im = new THREE.InstancedMesh(src.geometry, src.material, n);
      im.name = `props_${k.name}_${src.material.name}`;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.count = 0;
      im.frustumCulled = false;
      im.matrixAutoUpdate = false;
      if (/^(neon_|glow|lantern)/.test(src.material.name)) im.layers.enable(reflectLayer);
      group.add(im);
      return im;
    });
    sets.push({ k, matrices, cells, instanced, n });
  }

  let frames = 0;
  const update = (camera) => {
    camera.updateMatrixWorld();
    camera.getWorldDirection(_dir);
    const moved = camera.position.distanceToSquared(_last) > 0.25 || _dir.dot(_lastDir) < 0.99985;
    frames++;
    if (!moved && frames % 60 !== 0) return;
    _last.copy(camera.position);
    _lastDir.copy(_dir);
    _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_vp);
    const cam = camera.position;
    for (const set of sets) {
      const reach2 = set.k.reach * set.k.reach;
      let c = 0;
      const dst = set.instanced[0].instanceMatrix.array;
      for (const cell of set.cells) {
        _box.copy(cell.box);
        if (_box.distanceToPoint(cam) ** 2 > reach2) continue;
        if (!_frustum.intersectsBox(_box)) continue;
        dst.set(set.matrices.subarray(cell.start * 16, cell.end * 16), c * 16);
        c += cell.end - cell.start;
      }
      for (let m = 0; m < set.instanced.length; m++) {
        const im = set.instanced[m];
        if (m > 0) im.instanceMatrix.array.set(dst.subarray(0, c * 16));
        im.count = c;
        im.instanceMatrix.clearUpdateRanges();
        im.instanceMatrix.addUpdateRange(0, c * 16);
        im.instanceMatrix.needsUpdate = true;
      }
    }
  };

  // The light the props give the street, for the bake (src/world/spill.js):
  // every emissive part at street level, in the world, as one mesh each.
  const sources = [];
  const bakeMeshes = [];
  for (const set of sets) {
    for (const im of set.instanced) {
      const name = im.material.name;
      if (!/^(neon_|glow|lantern)/.test(name)) continue;
      const g = im.geometry;
      const pos = g.attributes.position;
      const index = g.index;
      const triCount = (index ? index.count : pos.count) / 3;
      const out = [];
      let colour = new THREE.Color(name.startsWith("neon_") ? NEON[name.slice(5)] ?? "#ffffff" : name === "lantern" ? "#ff4a2a" : "#ffffff");
      if (name === "glow" && g.attributes.color) {
        const c = g.attributes.color;
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < c.count; i++) {
          r += c.getX(i);
          gg += c.getY(i);
          b += c.getZ(i);
        }
        colour = new THREE.Color(r / c.count, gg / c.count, b / c.count);
      }
      const v = new THREE.Vector3();
      for (let j = 0; j < set.n; j++) {
        _m.fromArray(set.matrices, j * 16);
        if (set.matrices[j * 16 + 13] > 8) continue;
        for (let t = 0; t < triCount * 3; t++) {
          v.fromBufferAttribute(pos, index ? index.getX(t) : t).applyMatrix4(_m);
          out.push(v.x, v.y, v.z);
        }
      }
      if (!out.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
      const mesh = new THREE.Mesh(geo);
      mesh.matrixWorldAutoUpdate = false;
      bakeMeshes.push(mesh);
      sources.push({ mesh, color: colour, intensity: name === "glow" ? 0.6 : 0.9 });
    }
  }

  return {
    group,
    update,
    sources,
    /** Instances drawn last update, by prototype, for the dev hooks. */
    stats() {
      return Object.fromEntries(sets.map((s) => [s.k.name, `${s.instanced[0].count}/${s.n}`]));
    },
    disposeBake() {
      for (const m of bakeMeshes) m.geometry.dispose();
      bakeMeshes.length = 0;
    },
    dispose() {
      for (const m of bakeMeshes) m.geometry.dispose();
      for (const set of sets) for (const im of set.instanced) im.dispose();
      group.removeFromParent();
    },
  };
}
