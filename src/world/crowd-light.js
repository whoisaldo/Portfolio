// src/world/crowd-light.js: what lights the people, and from which side.
//
// The city's own bake (src/world/spill.js) is the street's level of light: it
// is blurred wide and, down a street of shops, white from kerb to wall, so it
// cannot say that the sign on a person's left is pink. This is a second,
// tighter map for the crowd alone, made from the same thing the city draws:
// every lit triangle near street level (neon tubes, glowing panels, shop
// windows, the lowest billboards) adds its own colour to the two metre cell
// under it, and the cells are spread a few metres, as far as a sign lights a
// pavement. The crowd's shader reads it a few steps to either side of a
// person: the difference is the sign beside them.
//
// Baked on the CPU in idle moments, a few milliseconds at a time, and again
// each time the city bakes its own (a district's pack arriving): that bake's
// version is the signal.
import * as THREE from "three";

// What throws light on a pavement, by its material's name, and how much for
// its size: a tube is thin and bright, a shop's window wide and soft.
const SOURCES = { neon_all: 7, glow: 2.2, shop: 1, billboard: 0.6 };
const CELL = 2;
// Nothing higher than this lights the people under it.
const TOP = 14;

function blur(src, dst, w, h, r, across) {
  const n = 2 * r + 1;
  const step = across ? 1 : w;
  const lines = across ? h : w;
  const len = across ? w : h;
  for (let l = 0; l < lines; l++) {
    const start = across ? l * w : l;
    for (let ch = 0; ch < 3; ch++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[(start + Math.min(len - 1, Math.max(0, k)) * step) * 3 + ch];
      for (let k = 0; k < len; k++) {
        dst[(start + k * step) * 3 + ch] = sum / n;
        sum += src[(start + Math.min(len - 1, k + r + 1) * step) * 3 + ch] - src[(start + Math.max(0, k - r) * step) * 3 + ch];
      }
    }
  }
}

export function createStreetLight(scene, shared) {
  const uniform = { value: new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat) };
  uniform.value.needsUpdate = true;
  let seen = "";
  let pending = false;
  let over = false;

  // The bake, in steps of a few milliseconds each, so that no frame waits
  // on it: the lit triangles a few thousand at a time, then the spreading,
  // then the texture.
  function* bake() {
    const b = shared.uSpillBounds.value;
    const w = Math.round(1 / b.z / CELL);
    const h = Math.round(1 / b.w / CELL);
    const acc = new Float32Array(w * h * 3);
    const lit = [];
    scene.traverse((o) => {
      const g = o.geometry;
      if (o.isMesh && !o.isInstancedMesh && SOURCES[o.material?.name] && g.attributes.color && !g.attributes.position.isInterleavedBufferAttribute && !g.attributes.color.isInterleavedBufferAttribute) lit.push(o);
    });
    yield;
    for (const o of lit) {
      const power = SOURCES[o.material.name];
      const g = o.geometry;
      const P = g.attributes.position.array;
      const C = g.attributes.color.array;
      const cs = g.attributes.color.itemSize;
      const index = g.index?.array;
      const n = index ? index.length : P.length / 3;
      const e = o.matrixWorld.elements;
      for (let t = 0; t < n; t += 3) {
        if (t % 24000 === 0 && t) yield;
        const i0 = (index ? index[t] : t) * 3;
        const i1 = (index ? index[t + 1] : t + 1) * 3;
        const i2 = (index ? index[t + 2] : t + 2) * 3;
        const y = (P[i0 + 1] + P[i1 + 1] + P[i2 + 1]) / 3 + e[13];
        if (y > TOP || y < -1) continue;
        const gx = Math.floor(((P[i0] + P[i1] + P[i2]) / 3 + e[12] - b.x) / CELL);
        const gz = Math.floor(((P[i0 + 2] + P[i1 + 2] + P[i2 + 2]) / 3 + e[14] - b.y) / CELL);
        if (gx < 0 || gz < 0 || gx >= w || gz >= h) continue;
        const ux = P[i1] - P[i0];
        const uy = P[i1 + 1] - P[i0 + 1];
        const uz = P[i1 + 2] - P[i0 + 2];
        const vx = P[i2] - P[i0];
        const vy = P[i2 + 1] - P[i0 + 1];
        const vz = P[i2 + 2] - P[i0 + 2];
        const area = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
        // Less from higher up; a big panel is not brighter than a small one
        // past a point.
        const k = (power * Math.min(area, 3)) / (1 + (y * y) / 36) / 3;
        const at = (gz * w + gx) * 3;
        const c0 = (i0 / 3) * cs;
        const c1 = (i1 / 3) * cs;
        const c2 = (i2 / 3) * cs;
        acc[at] += k * (C[c0] + C[c1] + C[c2]);
        acc[at + 1] += k * (C[c0 + 1] + C[c1 + 1] + C[c2 + 1]);
        acc[at + 2] += k * (C[c0 + 2] + C[c1 + 2] + C[c2 + 2]);
      }
      yield;
    }
    // Spread about five metres: as far as a sign lights the pavement in
    // front of it.
    const tmp = new Float32Array(acc.length);
    for (const r of [2, 1]) {
      blur(acc, tmp, w, h, r, true);
      yield;
      blur(tmp, acc, w, h, r, false);
      yield;
    }
    // Scaled so a well lit pavement is about a third, and kept as a square
    // root, as the city's own bake is.
    let sum = 0;
    let cells = 0;
    for (let i = 0; i < acc.length; i += 3) {
      const l = acc[i] * 0.3 + acc[i + 1] * 0.5 + acc[i + 2] * 0.2;
      if (l > 1e-4) {
        sum += l;
        cells++;
      }
    }
    const scale = cells ? 0.22 / (sum / cells) : 0;
    const out = new Uint8Array(w * h * 4);
    for (let i = 0, j = 0; i < acc.length; i += 3, j += 4) {
      out[j] = Math.round(255 * Math.sqrt(Math.min(1, acc[i] * scale)));
      out[j + 1] = Math.round(255 * Math.sqrt(Math.min(1, acc[i + 1] * scale)));
      out[j + 2] = Math.round(255 * Math.sqrt(Math.min(1, acc[i + 2] * scale)));
      out[j + 3] = 255;
    }
    yield;
    const map = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
    map.magFilter = map.minFilter = THREE.LinearFilter;
    map.needsUpdate = true;
    uniform.value.dispose();
    uniform.value = map;
  }
  // In an idle moment, or after a fifth of a second without one: a page
  // whose frames take longer than the screen's has no idle moments at all,
  // and the people in it would wait for their light for ever.
  const later = globalThis.requestIdleCallback ? (step) => globalThis.requestIdleCallback(step, { timeout: 200 }) : (step) => setTimeout(step, 16);
  const run = (steps) => {
    const t0 = performance.now();
    let done = false;
    while (!over && !done && performance.now() - t0 < 3) done = steps.next().done;
    api.ms = Math.max(api.ms, performance.now() - t0);
    api.work += performance.now() - t0;
    if (done || over) pending = false;
    else later(() => run(steps));
  };

  const api = {
    /** The map: its bounds are the city's own bake's (uSpillBounds). */
    uniform,
    /** The longest step of the last bake and all of its steps together, in
     *  milliseconds. */
    ms: 0,
    work: 0,
    /** Whether a bake is under way. */
    get pending() {
      return pending;
    },
    /** Bake it again if the city has baked its own since. */
    check() {
      const spill = shared.uSpill.value;
      if (!spill || pending) return;
      const now = `${spill.uuid}:${spill.version}`;
      if (now === seen) return;
      seen = now;
      pending = true;
      api.ms = 0;
      api.work = 0;
      later(() => run(bake()));
    },
    dispose() {
      over = true;
      clearInterval(watch);
      uniform.value.dispose();
    },
  };
  // The crowd asks on every frame it is drawn in; a page at rest draws none,
  // so a district that arrives while nothing moves is noticed here, and its
  // signs light the people in the next frame there is.
  const watch = setInterval(api.check, 400);
  return api;
}
