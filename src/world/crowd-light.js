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
// It is two maps side by side in one texture. The left half is the street:
// what is lit up to a few storeys, and the street furniture's own lamps. The
// right half is everything lit above that (a roof's sign, a board over a
// deck, a terrace's lamps) with the height it hangs at kept beside its
// colour, so that it lights whoever stands on that roof or that deck and
// not the pavement forty metres under it. The lamps are the props file's
// (lamp posts, lanterns, wall packs, vending machines, strings of bulbs):
// they are drawn instanced, a few of them at a time, and are in neither the
// scene's meshes nor the kit's twelve lamps, so the crowd is told where each
// one stands (crowd.js reads the file) and they are laid into the maps here.
//
// Baked on the CPU in idle moments, a few milliseconds at a time, and again
// each time the city bakes its own (a district's pack arriving): that bake's
// version is the signal.
import * as THREE from "three";

// What throws light on a pavement, by its material's name, and how much for
// its size: a tube is thin and bright, a shop's window wide and soft.
const SOURCES = { neon_all: 7, glow: 2.2, shop: 1, billboard: 0.6 };
const CELL = 2;
// Nothing higher than this lights the people under it: it is in the upper
// map, with its height.
const TOP = 14;
// The street furniture that is a light, by its prototype's name: its colour,
// how much of it reaches the ground at its foot (a well lit pavement is
// about a third), and how far up the thing its light is (of its height).
export const PROP_LIGHTS = {
  lamp_sodium: [1.0, 0.55, 0.2, 0.3, 0.95],
  lamp_short: [1.0, 0.8, 0.55, 0.26, 0.9],
  lamp_plaza: [0.75, 0.9, 1.0, 0.34, 0.95],
  lamp_strip: [0.6, 0.9, 1.0, 0.2, 0.8],
  flood_mast: [0.9, 0.95, 1.0, 0.4, 0.95],
  wall_pack: [1.0, 0.85, 0.6, 0.18, 0.5],
  lightbox: [0.85, 0.9, 1.0, 0.16, 0.5],
  vending: [0.3, 0.9, 1.0, 0.14, 0.6],
  vending_warm: [1.0, 0.6, 0.3, 0.14, 0.6],
  lantern: [1.0, 0.33, 0.16, 0.07, 0.5],
  jt_festoon: [1.0, 0.75, 0.45, 0.12, 0.5],
  jt_festoon_l: [1.0, 0.75, 0.45, 0.12, 0.5],
  cy_string: [1.0, 0.75, 0.45, 0.12, 0.5],
  jt_lamp_arm: [1.0, 0.8, 0.55, 0.28, 0.9],
  cy_deck_lamp: [0.7, 0.9, 1.0, 0.28, 0.9],
  grate_glow: [1.0, 0.5, 0.2, 0.06, 0.5],
};
// How far a lamp's light reaches along the ground, in cells, and how fast it
// falls off.
const REACH = 4;
const SOFT = 2.2;

function blur(src, dst, w, h, r, across, from = 0, to = 1) {
  const n = 2 * r + 1;
  const step = across ? 1 : w;
  const lines = across ? h : w;
  const len = across ? w : h;
  for (let l = Math.round(lines * from); l < Math.round(lines * to); l++) {
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
  // The props' lamps: x, y, z, r, g, b each.
  let lamps = new Float32Array(0);

  // The bake, in steps of a few milliseconds each, so that no frame waits
  // on it: the lit triangles a few thousand at a time, then the spreading,
  // then the texture.
  function* bake() {
    const b = shared.uSpillBounds.value;
    const w = Math.round(1 / b.z / CELL);
    const h = Math.round(1 / b.w / CELL);
    const acc = new Float32Array(w * h * 3);
    // Above the street: the light, and how high it hangs (its luminance
    // times its height, and its luminance).
    const upper = new Float32Array(w * h * 3);
    const hung = new Float32Array(w * h * 3);
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
        if (y > 250 || y < -1) continue;
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
        const at = (gz * w + gx) * 3;
        const c0 = (i0 / 3) * cs;
        const c1 = (i1 / 3) * cs;
        const c2 = (i2 / 3) * cs;
        if (y > TOP) {
          // Over the street: as much as the same sign gives the pavement
          // from a storey up, to whoever is level with it.
          const k = (power * Math.min(area, 3)) / 4.5;
          const r = k * (C[c0] + C[c1] + C[c2]);
          const g = k * (C[c0 + 1] + C[c1 + 1] + C[c2 + 1]);
          const b2 = k * (C[c0 + 2] + C[c1 + 2] + C[c2 + 2]);
          const l = r * 0.3 + g * 0.5 + b2 * 0.2;
          upper[at] += r;
          upper[at + 1] += g;
          upper[at + 2] += b2;
          hung[at] += l * y;
          hung[at + 1] += l;
          continue;
        }
        // Less from higher up; a big panel is not brighter than a small one
        // past a point.
        const k = (power * Math.min(area, 3)) / (1 + (y * y) / 36) / 3;
        acc[at] += k * (C[c0] + C[c1] + C[c2]);
        acc[at + 1] += k * (C[c0 + 1] + C[c1 + 1] + C[c2 + 1]);
        acc[at + 2] += k * (C[c0 + 2] + C[c1 + 2] + C[c2 + 2]);
      }
      yield;
    }
    // Spread about five metres: as far as a sign lights the pavement in
    // front of it.
    const tmp = new Float32Array(acc.length);
    for (const map of [acc, upper, hung]) {
      for (const r of [2, 1]) {
        for (let q = 0; q < 4; q++) {
          blur(map, tmp, w, h, r, true, q / 4, (q + 1) / 4);
          yield;
        }
        for (let q = 0; q < 4; q++) {
          blur(tmp, map, w, h, r, false, q / 4, (q + 1) / 4);
          yield;
        }
      }
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
    yield;
    for (const map of [acc, upper, hung]) {
      for (let i = 0; i < map.length; i++) map[i] *= scale;
      yield;
    }
    // The lamps, each a pool round its own foot: on the street's map if it
    // stands in the street, on the upper one with its height if it is on a
    // roof, a deck or a terrace.
    for (let i = 0; i < lamps.length; i += 6) {
      if (i % 6000 === 0 && i) yield;
      const y = lamps[i + 1];
      const fx = (lamps[i] - b.x) / CELL - 0.5;
      const fz = (lamps[i + 2] - b.y) / CELL - 0.5;
      const high = y > TOP;
      const into = high ? upper : acc;
      const l = lamps[i + 3] * 0.3 + lamps[i + 4] * 0.5 + lamps[i + 5] * 0.2;
      for (let gz = Math.max(0, Math.ceil(fz - REACH)); gz <= Math.min(h - 1, fz + REACH); gz++) {
        for (let gx = Math.max(0, Math.ceil(fx - REACH)); gx <= Math.min(w - 1, fx + REACH); gx++) {
          const d2 = ((gx - fx) ** 2 + (gz - fz) ** 2) * CELL * CELL;
          const k = 1 / (1 + d2 / (SOFT * SOFT)) ** 2;
          if (k < 0.02) continue;
          const at = (gz * w + gx) * 3;
          into[at] += lamps[i + 3] * k;
          into[at + 1] += lamps[i + 4] * k;
          into[at + 2] += lamps[i + 5] * k;
          if (high) {
            hung[at] += l * k * y;
            hung[at + 1] += l * k;
          }
        }
      }
    }
    yield;
    const out = new Uint8Array(w * 2 * h * 4);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const i = (row * w + col) * 3;
        const j = (row * w * 2 + col) * 4;
        out[j] = Math.round(255 * Math.sqrt(Math.min(1, acc[i])));
        out[j + 1] = Math.round(255 * Math.sqrt(Math.min(1, acc[i + 1])));
        out[j + 2] = Math.round(255 * Math.sqrt(Math.min(1, acc[i + 2])));
        out[j + 3] = 255;
        const k = j + w * 4;
        out[k] = Math.round(255 * Math.sqrt(Math.min(1, upper[i])));
        out[k + 1] = Math.round(255 * Math.sqrt(Math.min(1, upper[i + 1])));
        out[k + 2] = Math.round(255 * Math.sqrt(Math.min(1, upper[i + 2])));
        // How high it hangs, in metres.
        out[k + 3] = hung[i + 1] > 1e-6 ? Math.min(255, Math.round(hung[i] / hung[i + 1])) : 0;
      }
      if (row % 64 === 63) yield;
    }
    const map = new THREE.DataTexture(out, w * 2, h, THREE.RGBAFormat);
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
    /** Where the props' lamps are (x, y, z, r, g, b each): baked in from
     *  the next bake on, which this asks for. */
    setLamps(list) {
      lamps = list;
      seen = "";
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
