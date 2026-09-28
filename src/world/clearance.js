// src/world/clearance.js: how high a flight has to go to clear the city.
//
// A flight between two shots in the open is a quadratic curve lifted over
// the rooftops (src/world/shots.js). How much lift is enough depends on what
// is under the line between the two shots, and a fixed rule was wrong both
// ways: too little over the avenue's blocks, where the camera went through
// a building on the way up to the plaza, and needlessly high over open
// ground. So at load the kit is rasterised once into a coarse height field,
// the top of every triangle over the cells its footprint covers, and a
// flight asks it how high the ground is along its line.
import * as THREE from "three";

const CELL = 4;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

export function createClearance(root, { x0, z0, x1, z1 }, skip = () => false) {
  const W = Math.ceil((x1 - x0) / CELL);
  const H = Math.ceil((z1 - z0) / CELL);
  const top = new Float32Array(W * H);
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || skip(o)) return;
    const pos = o.geometry.attributes.position;
    const index = o.geometry.index;
    const count = index ? index.count : pos.count;
    const m = o.matrixWorld;
    for (let i = 0; i + 2 < count; i += 3) {
      _a.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(m);
      _b.fromBufferAttribute(pos, index ? index.getX(i + 1) : i + 1).applyMatrix4(m);
      _c.fromBufferAttribute(pos, index ? index.getX(i + 2) : i + 2).applyMatrix4(m);
      const y = Math.max(_a.y, _b.y, _c.y);
      // Ground, kerbs and road paint are not in a camera's way.
      if (y < 2) continue;
      const gx0 = Math.max(0, Math.floor((Math.min(_a.x, _b.x, _c.x) - x0) / CELL));
      const gx1 = Math.min(W - 1, Math.floor((Math.max(_a.x, _b.x, _c.x) - x0) / CELL));
      const gz0 = Math.max(0, Math.floor((Math.min(_a.z, _b.z, _c.z) - z0) / CELL));
      const gz1 = Math.min(H - 1, Math.floor((Math.max(_a.z, _b.z, _c.z) - z0) / CELL));
      for (let gz = gz0; gz <= gz1; gz++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          const k = gz * W + gx;
          if (top[k] < y) top[k] = y;
        }
      }
    }
  });

  return {
    /** The highest thing within a cell of (x, z), in metres. */
    at(x, z) {
      const gx = Math.floor((x - x0) / CELL);
      const gz = Math.floor((z - z0) / CELL);
      let h = 0;
      for (let dz = -1; dz <= 1; dz++) {
        const r = gz + dz;
        if (r < 0 || r >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const c = gx + dx;
          if (c < 0 || c >= W) continue;
          h = Math.max(h, top[r * W + c]);
        }
      }
      return h;
    },
  };
}
