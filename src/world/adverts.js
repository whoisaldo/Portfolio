// src/world/adverts.js: which advert each billboard shows.
//
// The billboards' shader (materials.js billboard()) picks one of the city's
// twenty-four adverts for a face. Left to where the face stands in 4 m slots,
// a row of small posters a metre apart on one wall were one slot, the same
// poster three or four times side by side, and the big boards came out the
// same on towers across a street. So the faces of a billboard mesh are dealt
// here, once, the first time it is drawn: the largest first, each the advert
// its place suggests unless the same one (or the one it turns into on the
// next round, when neighbours change a moment apart) already hangs within
// reach of it, reach growing with its size. The answer rides in the face's
// own vertex colour (alpha: 8 x (advert + 1), of the sixteen wide or the
// eight tall), so nothing is looked up per pixel. A mesh this never reaches
// keeps alpha 1 and the shader deals it by its place, as before.
import * as THREE from "three";

// How far each round moves a face along its pool (the shader's own steps).
const STEP = { 16: 5, 8: 3 };

/** Deal a billboard mesh's faces their adverts, into its colour's alpha. Returns how many faces. */
export function dealAdverts(geometry, object) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const col = geometry.attributes.color;
  if (!pos || !nor || !col || col.itemSize < 4) return 0;
  object.updateWorldMatrix(true, false);
  const n = pos.count;
  const P = new Float32Array(n * 3);
  const N = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  const nm = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(object.matrixWorld);
    P.set([v.x, v.y, v.z], i * 3);
    v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
    N.set([v.x, v.y, v.z], i * 3);
  }
  // A face is the vertices its triangles join (and any on the same spot
  // facing the same way).
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const join = (a, b) => {
    parent[find(a)] = find(b);
  };
  const spots = new Map();
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 100)},${Math.round(P[i * 3 + 1] * 100)},${Math.round(P[i * 3 + 2] * 100)},${Math.round(N[i * 3] * 2)},${Math.round(N[i * 3 + 1] * 2)},${Math.round(N[i * 3 + 2] * 2)}`;
    if (spots.has(key)) join(i, spots.get(key));
    else spots.set(key, i);
  }
  const index = geometry.index;
  const tris = index ? index.count / 3 : n / 3;
  for (let k = 0; k < tris; k++) {
    const a = index ? index.getX(k * 3) : k * 3;
    join(a, index ? index.getX(k * 3 + 1) : k * 3 + 1);
    join(a, index ? index.getX(k * 3 + 2) : k * 3 + 2);
  }
  const faces = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!faces.has(root)) faces.set(root, []);
    faces.get(root).push(i);
  }
  const boards = [];
  for (const verts of faces.values()) {
    let cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0;
    for (const i of verts) {
      cx += P[i * 3]; cy += P[i * 3 + 1]; cz += P[i * 3 + 2];
      nx += N[i * 3]; ny += N[i * 3 + 1]; nz += N[i * 3 + 2];
    }
    const k = verts.length;
    cx /= k; cy /= k; cz /= k;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    // Its width along the wall and its height (a board lying flat keeps
    // the shader's own deal).
    if (Math.abs(ny) > 0.95) continue;
    const hl = Math.hypot(nx, nz) || 1;
    const rx = -nz / hl;
    const rz = nx / hl;
    let a0 = Infinity, a1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const i of verts) {
      const along = P[i * 3] * rx + P[i * 3 + 2] * rz;
      a0 = Math.min(a0, along); a1 = Math.max(a1, along);
      y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]);
    }
    const w = a1 - a0;
    const h = y1 - y0;
    if (w < 0.05 || h < 0.05) continue;
    const pool = w / h < 0.85 ? 8 : 16;
    const plane = cx * nx + cz * nz;
    // Where its place alone would start it (as the shader's old deal does,
    // but by its middle and in a metre or so, not 4 m slots).
    const start = ((Math.round((a0 + a1) / 2.2) * 7 + Math.round((y0 + y1) / 2.6) * 3 + Math.round(plane / 2) * 5) % pool + pool) % pool;
    boards.push({ verts, x: cx, y: cy, z: cz, area: w * h, pool, start, reach: Math.min(160, 14 + 12 * Math.sqrt(w * h)) });
  }
  // The largest first: a tower's board takes its pick before the posters.
  boards.sort((a, b) => b.area - a.area || a.x - b.x || a.z - b.z);
  const hung = [];
  for (const b of boards) {
    const step = STEP[b.pool];
    let best = b.start;
    let bestNear = -1;
    for (let t = 0; t < b.pool; t++) {
      const art = (b.start + t * (b.pool === 16 ? 3 : 5)) % b.pool;
      let near = Infinity;
      for (const o of hung) {
        if (o.pool !== b.pool) continue;
        const d = Math.hypot(o.x - b.x, (o.y - b.y) * 0.7, o.z - b.z);
        const same = o.art === art;
        const next = (o.art - art - step + 2 * b.pool) % b.pool === 0 || (art - o.art - step + 2 * b.pool) % b.pool === 0;
        if (same) near = Math.min(near, d);
        else if (next) near = Math.min(near, d * 2);
      }
      if (near >= Math.max(b.reach, 1)) {
        best = art;
        break;
      }
      if (near > bestNear) {
        bestNear = near;
        best = art;
      }
    }
    b.art = best;
    hung.push(b);
    for (const i of b.verts) col.setW(i, (8 * (best + 1)) / 255);
  }
  col.needsUpdate = true;
  return boards.length;
}
