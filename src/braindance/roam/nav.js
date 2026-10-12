// src/braindance/roam/nav.js: the ground under a car and a walker, asked
// for each frame.
//
// nav-build.js makes the map (in a worker, once, the first time free roam
// is entered): for every quarter-metre column of the city the floors a
// walker or the car can reach from where they start. This is what the
// player's simulation asks of it: how high the ground is here, and where a
// circle on the ground has to be moved to so that it is not over a column
// it cannot stand on. A wall, a kerb the car cannot climb, a rail, a ledge
// and the edge of everything are all the same answer: no floor there for
// you.
import { CELL, TILE, UNIT, NONE, HEAD, WALK, CAR, MORE, WALK_STEP } from "./nav-build.js";

export { WALK, CAR, WALK_STEP };

// Props a walker brushes through or steps over (collision.json's kinds):
// soft, or flat on the ground.
const SOFT = new Set(["weed", "bags", "rubbish", "drain", "grate_glow"]);
// Kit materials that are cloth over a pavement, not a thing in the way.
const AIRY = new Set(["awning"]);

/**
 * The merged kit under `root` as one triangle list in world metres, for
 * the worker: plain copies of the buffers the city draws from (a tile's
 * mesh shares its material's vertices and has an index of its own), with
 * `parts` saying which stretch of the index belongs to which vertices. The
 * copying is some thirty megabytes, so it is done a few megabytes at a
 * time with `pause()` awaited between (a frame goes by) and no frame waits
 * on it.
 */
export async function gatherKit(root, pause = () => Promise.resolve()) {
  const meshes = root.children.filter((o) => o.isMesh && o.name.startsWith("kit_") && !AIRY.has(o.material?.name) && o.geometry.index);
  const base = new Map();
  let nv = 0;
  let ni = 0;
  for (const mesh of meshes) {
    const pos = mesh.geometry.attributes.position;
    if (!base.has(pos)) {
      base.set(pos, nv);
      nv += pos.count;
    }
    ni += mesh.geometry.index.count;
  }
  const positions = new Float32Array(nv * 3);
  const index = new Uint32Array(ni);
  const parts = new Uint32Array(meshes.length * 3);
  const SLICE = 4 << 20;
  let copied = 0;
  const count = async (bytes) => {
    copied += bytes;
    if (copied >= SLICE) {
      copied = 0;
      await pause();
    }
  };
  for (const [pos, at] of base) {
    positions.set(pos.array.subarray(0, pos.count * 3), at * 3);
    await count(pos.count * 12);
  }
  let o = 0;
  for (const [n, mesh] of meshes.entries()) {
    const src = mesh.geometry.index.array;
    index.set(src, o);
    parts.set([o, src.length, base.get(mesh.geometry.attributes.position)], n * 3);
    o += src.length;
    await count(src.length * 4);
  }
  return { positions, index, parts };
}

/**
 * collision.json's boxes as the builder wants them, six floats each: the
 * props that stand in the way (`boxes`, rasterised with the kit), and the
 * buildings' own (`seals`: a building's walls are in the kit's triangles,
 * and its box only closes what a modelled doorway leaves open; see
 * nav-build.js).
 */
export function solidBoxes(file) {
  const pack = (list) => {
    const out = new Float32Array(list.length * 6);
    list.forEach((b, k) => out.set([b.min[0], b.min[1], b.min[2], b.max[0], b.max[1], b.max[2]], k * 6));
    return out;
  };
  return {
    boxes: pack(file.boxes.filter((b) => b.kind !== "building" && !SOFT.has(b.kind))),
    seals: pack(file.boxes.filter((b) => b.kind === "building")),
  };
}

/** Make the map in a worker. Resolves with createNav's object. */
export function buildInWorker(input, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./nav-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (event) => {
      const { progress, nav, error } = event.data;
      if (progress !== undefined) return onProgress(progress);
      worker.terminate();
      if (error) reject(new Error(error));
      else resolve(createNav(nav));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "the map's worker failed"));
    };
    worker.postMessage(input, [input.positions.buffer, input.index.buffer]);
  });
}

export function createNav({ x0, z0, tw, th, tiles: list, stats }) {
  const tiles = new Array(tw * th).fill(null);
  for (const t of list) tiles[t.i] = t;
  const W = tw * TILE;
  const H = th * TILE;
  const inv = 1 / CELL;

  // The headroom over the floor floorAt last returned, metres (Infinity
  // when it is open to the sky as far as the map measures).
  let room = 0;
  /**
   * The floor of column (gx, gz) that `bit` stands on nearest height y,
   * no further from it than tol: metres, or NaN for none.
   */
  const floorAt = (gx, gz, y, bit, tol) => {
    if (gx < 0 || gz < 0 || gx >= W || gz >= H) return NaN;
    const tile = tiles[(gz >> 6) * tw + (gx >> 6)];
    if (!tile) return NaN;
    const cell = (gz & 63) * TILE + (gx & 63);
    const fy = tile.y[cell];
    if (fy === NONE) return NaN;
    const m = tile.m[cell];
    let best = NaN;
    let reach = tol;
    if (m & bit) {
      const h = fy / UNIT;
      const d = Math.abs(h - y);
      if (d <= reach) {
        best = h;
        reach = d;
        room = (m & HEAD) === HEAD ? Infinity : (m & HEAD) * 0.25;
      }
    }
    if (m & MORE) {
      const xc = tile.xc;
      let lo = 0;
      let hi = xc.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (xc[mid] < cell) lo = mid + 1;
        else hi = mid;
      }
      for (; lo < xc.length && xc[lo] === cell; lo++) {
        if (!(tile.xm[lo] & bit)) continue;
        const h = tile.xy[lo] / UNIT;
        const d = Math.abs(h - y);
        if (d <= reach) {
          best = h;
          reach = d;
          room = (tile.xm[lo] & HEAD) === HEAD ? Infinity : (tile.xm[lo] & HEAD) * 0.25;
        }
      }
    }
    return best;
  };
  const col = (v, o) => Math.floor((v - o) * inv);
  // Whether height py over column (gx, gz) is open air: over one of the
  // column's floors (anybody's, or nobody's) and under whatever is over
  // that floor, by `margin`. Past the map there is no saying, so no.
  const airAt = (gx, gz, py, margin) => {
    if (gx < 0 || gz < 0 || gx >= W || gz >= H) return false;
    const tile = tiles[(gz >> 6) * tw + (gx >> 6)];
    if (!tile) return false;
    const cell = (gz & 63) * TILE + (gx & 63);
    const fy = tile.y[cell];
    if (fy === NONE) return false;
    const m = tile.m[cell];
    const over = (y, head) => py >= y / UNIT + margin && (head === HEAD || py <= y / UNIT + head * 0.25 - margin);
    if (over(fy, m & HEAD)) return true;
    if (m & MORE) {
      const xc = tile.xc;
      let lo = 0;
      let hi = xc.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (xc[mid] < cell) lo = mid + 1;
        else hi = mid;
      }
      for (; lo < xc.length && xc[lo] === cell; lo++) if (over(tile.xy[lo], tile.xm[lo] & HEAD)) return true;
    }
    return false;
  };

  const nav = {
    stats,
    bounds: { x0, z0, x1: x0 + W * CELL, z1: z0 + H * CELL },
    /** The floor under (x, z) nearest height y for `bit`, or NaN. */
    floor(x, z, y, bit, tol = 0.75) {
      return floorAt(col(x, x0), col(z, z0), y, bit, tol);
    },
    /** The headroom over the floor `floor` last returned. */
    get room() {
      return room;
    },
    /**
     * The ground's height at (x, z) near y, smoothed between the four
     * columns round the point (so a stair is a slope underfoot and a ramp
     * has no steps in it), or NaN where `bit` has no ground.
     */
    ground(x, z, y, bit, tol = 0.75) {
      const fx = (x - x0) * inv - 0.5;
      const fz = (z - z0) * inv - 0.5;
      const i = Math.floor(fx);
      const k = Math.floor(fz);
      const u = fx - i;
      const v = fz - k;
      let sum = 0;
      let weight = 0;
      for (let c = 0; c < 4; c++) {
        const w = (c & 1 ? u : 1 - u) * (c & 2 ? v : 1 - v);
        if (w < 1e-4) continue;
        const h = floorAt(i + (c & 1), k + (c >> 1), y, bit, tol);
        if (h !== h) continue;
        sum += h * w;
        weight += w;
      }
      return weight > 0 ? sum / weight : NaN;
    },
    /**
     * Move the circle at p (x, z, radius r, standing at height y) off every
     * column `bit` cannot stand on. `tol` is how far from y a column's floor
     * may be; with `grow` it widens with the column's distance from the
     * centre's own (a stair two columns ahead is two steps up). Returns
     * true if it was touching; p.nx, p.nz is then the way it was pushed.
     */
    resolve(p, r, y, bit, tol = 0.5, grow = false) {
      let touched = false;
      const rc = r * inv;
      for (let pass = 0; pass < 6; pass++) {
        const cx = (p.x - x0) * inv;
        const cz = (p.z - z0) * inv;
        const ci = Math.floor(cx);
        const ck = Math.floor(cz);
        const i1 = Math.floor(cx + rc);
        const k1 = Math.floor(cz + rc);
        let worst = 1e-4;
        let wx = 0;
        let wz = 0;
        for (let k = Math.floor(cz - rc); k <= k1; k++) {
          for (let i = Math.floor(cx - rc); i <= i1; i++) {
            const qx = cx < i ? i : cx > i + 1 ? i + 1 : cx;
            const qz = cz < k ? k : cz > k + 1 ? k + 1 : cz;
            const dx = cx - qx;
            const dz = cz - qz;
            const d2 = dx * dx + dz * dz;
            if (d2 >= rc * rc) continue;
            const n = grow ? Math.max(1, Math.abs(i - ci), Math.abs(k - ck)) : 1;
            const h = floorAt(i, k, y, bit, tol * n);
            if (h === h) continue;
            if (d2 > 1e-10) {
              const d = Math.sqrt(d2);
              if (rc - d > worst) {
                worst = rc - d;
                wx = dx / d;
                wz = dz / d;
              }
            } else {
              // The centre is over it: out by the nearest side.
              const l = cx - i;
              const t = cz - k;
              const least = Math.min(l, 1 - l, t, 1 - t);
              if (rc + least > worst) {
                worst = rc + least;
                wx = least === l ? -1 : least === 1 - l ? 1 : 0;
                wz = wx ? 0 : least === t ? -1 : 1;
              }
            }
          }
        }
        if (worst <= 1e-4) break;
        p.x += wx * worst * CELL;
        p.z += wz * worst * CELL;
        p.nx = wx;
        p.nz = wz;
        touched = true;
      }
      return touched;
    },
    /** Whether height y over (x, z) is open air (see `sight`). */
    air(x, y, z, margin = 0.25) {
      return airAt(col(x, x0), col(z, z0), y, margin);
    },
    /** Whether a circle of radius r at (x, z, y) is clear of everything. */
    fits(x, z, r, y, bit, tol = 0.5) {
      const rc = r * inv;
      const cx = (x - x0) * inv;
      const cz = (z - z0) * inv;
      const i1 = Math.floor(cx + rc);
      const k1 = Math.floor(cz + rc);
      for (let k = Math.floor(cz - rc); k <= k1; k++) {
        for (let i = Math.floor(cx - rc); i <= i1; i++) {
          const qx = cx < i ? i : cx > i + 1 ? i + 1 : cx;
          const qz = cz < k ? k : cz > k + 1 ? k + 1 : cz;
          if ((cx - qx) * (cx - qx) + (cz - qz) * (cz - qz) >= rc * rc) continue;
          const h = floorAt(i, k, y, bit, tol);
          if (h !== h) return false;
        }
      }
      return true;
    },
    /**
     * The nearest place to (x, z) where a circle of radius r stands clear
     * on `bit`'s ground, searched outward in rings to `far` metres. With a
     * finite y only ground within `tol` of it counts; else any level, the
     * lowest first. Returns { x, y, z } or null.
     */
    nearest(x, z, y, bit, r = 0.3, far = 40, tol = 0.75) {
      const gi = col(x, x0);
      const gk = col(z, z0);
      const rings = Math.ceil(far * inv);
      for (let ring = 0; ring <= rings; ring++) {
        let best = null;
        let bestD = Infinity;
        for (let k = -ring; k <= ring; k++) {
          const edge = Math.abs(k) === ring;
          for (let i = -ring; i <= ring; i += edge ? 1 : Math.max(1, ring * 2)) {
            const h = y === y ? floorAt(gi + i, gk + k, y, bit, tol) : floorAt(gi + i, gk + k, 0, bit, 1e4);
            if (h !== h) continue;
            const px = x0 + (gi + i + 0.5) * CELL;
            const pz = z0 + (gk + k + 0.5) * CELL;
            if (!nav.fits(px, pz, r, h, bit, 0.5)) continue;
            const d = (px - x) * (px - x) + (pz - z) * (pz - z);
            if (d < bestD) {
              bestD = d;
              best = { x: px, y: h, z: pz };
            }
          }
        }
        if (best) return best;
      }
      return null;
    },
    /**
     * How far along the line from a to b (points with x, y, z) the way is
     * open air over ground the player could be on: 1 if all of it, else the
     * fraction where it first is not (a wall, a roof, the underside of the
     * deck, the edge of the map). `margin` is kept clear above and below.
     */
    sight(a, b, margin = 0.25) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const flat = Math.hypot(dx, dz);
      const steps = Math.max(1, Math.ceil(flat / (CELL * 0.5)));
      // Half a metre to either side of the line, in columns: something in
      // the way with open air on both sides of it is a post (a lamp, a
      // bollard, a sign's leg), and a camera looks past a post.
      const sx = flat > 1e-6 ? Math.round((-dz / flat) * 2) : 0;
      const sz = flat > 1e-6 ? Math.round((dx / flat) * 2) : 0;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const py = a.y + dy * t;
        const gx = col(a.x + dx * t, x0);
        const gz = col(a.z + dz * t, z0);
        if (airAt(gx, gz, py, margin)) continue;
        if (s < steps && (sx || sz) && airAt(gx + sx, gz + sz, py, margin) && airAt(gx - sx, gz - sz, py, margin)) continue;
        return (s - 1) / steps;
      }
      return 1;
    },
    /** Dev: every floor the map kept for the column at (x, z), lowest first. */
    probe(x, z) {
      const gx = col(x, x0);
      const gz = col(z, z0);
      const tile = gx < 0 || gz < 0 || gx >= W || gz >= H ? null : tiles[(gz >> 6) * tw + (gx >> 6)];
      const out = [];
      if (!tile) return out;
      const cell = (gz & 63) * TILE + (gx & 63);
      const say = (y, m) => out.push({ y: +(y / UNIT).toFixed(3), room: (m & HEAD) === HEAD ? 99 : (m & HEAD) * 0.25, walk: Boolean(m & WALK), car: Boolean(m & CAR) });
      if (tile.y[cell] !== NONE) say(tile.y[cell], tile.m[cell]);
      if (tile.xc) for (let e = 0; e < tile.xc.length; e++) if (tile.xc[e] === cell) say(tile.xy[e], tile.xm[e]);
      return out;
    },
    /** The map as a picture, for looking at it (dev): see play-nav.mjs. */
    paint(ppc = 2) {
      const w = Math.ceil(W / ppc);
      const h = Math.ceil(H / ppc);
      const rgba = new Uint8ClampedArray(w * h * 4);
      for (const tile of list) {
        const tx = (tile.i % tw) * TILE;
        const tz = Math.floor(tile.i / tw) * TILE;
        for (let cell = 0; cell < TILE * TILE; cell++) {
          if (tile.y[cell] === NONE || !(tile.m[cell] & (WALK | CAR))) continue;
          const m = tile.m[cell];
          const o = (Math.floor((tz + (cell >> 6)) / ppc) * w + Math.floor((tx + (cell & 63)) / ppc)) * 4;
          const yv = tile.y[cell] / UNIT;
          const lift = Math.max(0, Math.min(1, (yv + 6) / 16));
          if (m & CAR) {
            rgba[o] = 60 + lift * 120;
            rgba[o + 1] = 110 + lift * 100;
            rgba[o + 2] = 255;
          } else {
            rgba[o] = 40 + lift * 200;
            rgba[o + 1] = 200;
            rgba[o + 2] = 90 + lift * 60;
          }
          if (m & MORE) rgba[o] = 255;
          rgba[o + 3] = 255;
        }
      }
      return { width: w, height: h, rgba, metresPerPixel: CELL * ppc, x0, z0 };
    },
    /** Dev: every reachable floor, for a harness that checks the map. */
    each(fn) {
      for (const tile of list) {
        const tx = (tile.i % tw) * TILE;
        const tz = Math.floor(tile.i / tw) * TILE;
        for (let cell = 0; cell < TILE * TILE; cell++) {
          if (tile.y[cell] === NONE) continue;
          fn(x0 + (tx + (cell & 63) + 0.5) * CELL, tile.y[cell] / UNIT, z0 + (tz + (cell >> 6) + 0.5) * CELL, tile.m[cell]);
        }
        if (tile.xc) for (let e = 0; e < tile.xc.length; e++) fn(x0 + (tx + (tile.xc[e] & 63) + 0.5) * CELL, tile.xy[e] / UNIT, z0 + (tz + (tile.xc[e] >> 6) + 0.5) * CELL, tile.xm[e]);
      }
    },
  };
  return nav;
}
