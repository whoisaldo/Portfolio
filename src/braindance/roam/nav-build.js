// src/braindance/roam/nav-build.js: the ground and the walls, worked out
// from the city itself.
//
// The builder exports boxes for its buildings and its props
// (collision.json), but nothing for what the districts build by hand: the
// deck and its ramp, stairs, parapets, rails, columns, kerbs, the sunken
// hub. So the map a car and a walker stand on is made from what is drawn:
// every triangle of the merged kit (and every exported box) is rasterised
// into a grid of columns a quarter of a metre square, each column a short
// list of solid spans in height, as a navigation mesh builder does it. The
// top of a span with headroom over it is a floor. Nothing here knows what a
// stair or a kerb is: a stair is floors a step apart, a kerb is a step a
// wheel cannot take, a wall is a column with no floor at your feet.
//
// Then two floods from where the player starts, one for feet and one for
// wheels, over neighbouring floors no more than a step apart in either
// direction (WALK_STEP, CAR_STEP). What a flood reaches is marked; the
// rest is thrown away. Because a step is taken both ways or not at all,
// anywhere the player can get to he can get back from, and there is no
// falling: a ledge is as solid as a wall.
//
// The exported boxes of the buildings come in after that, as seals. A
// ground floor in the kit is pilasters, panes set back and doors, and
// where a doorway is modelled open the flood walks into the shell behind
// it. A building's box whose inside the feet reached only at its floor's
// level is filled and the feet's flood run again without it. A box the
// wheels reached inside, or the feet well above its floor, has a road or a
// stair through it (the deck's boxes are laid over its own ramp): it is
// left open and listed, for whoever maintains the boxes.
//
// This module is pure (typed arrays in, typed arrays out) and runs in a
// worker (nav-worker.js). The other half, the questions asked of the map
// each frame, is nav.js.

/** A column's side, metres. */
export const CELL = 0.25;
/** A tile's side, cells: the map is kept in 16 m tiles, only where there
 *  is ground the player can reach. */
export const TILE = 64;
/** Heights are kept as 16-bit integers, this many to a metre. */
export const UNIT = 128;
export const NONE = -32768;
/** A floor's second byte: headroom in quarter metres in the low five bits
 *  (so up to 7.75 m), then who can stand on it, and whether the column has
 *  more floors above this one. */
export const HEAD = 31;
export const WALK = 32;
export const CAR = 64;
export const MORE = 128;
/** The tallest step feet take, and wheels (a kerb is 0.15 m). */
export const WALK_STEP = 0.4;
export const CAR_STEP = 0.09;
/** The headroom each needs. */
export const WALK_CLEAR = 1.75;
export const CAR_CLEAR = 1.5;

// Nothing a player reaches is above or below these: taller is cut off.
const Y_TOP = 72;
const Y_BOTTOM = -12;
// Spans closer than this are one span.
const MERGE = 0.02;
// A block of the build: 256 cells (64 m) a side, 4 by 4 tiles.
const BLOCK = TILE * 4;

/**
 * Build the map.
 *
 *   positions  Float32Array, x y z per vertex, world metres
 *   index      Uint32Array, three per triangle
 *   parts      Uint32Array or null: first index, count, vertex base per
 *              mesh, where the index is still each mesh's own (the base is
 *              added here, off the main thread)
 *   boxes      Float32Array, x0 y0 z0 x1 y1 z1 per box (solid)
 *   bounds     { x0, z0, x1, z1 } metres; the grid is cut to whole tiles
 *   walkFrom   [[x, y, z], ...] where feet start (the flood's seeds)
 *   carFrom    [[x, y, z], ...] where wheels start
 *   seals      Float32Array, boxes as above: the buildings' (see above)
 *   carIn      Float32Array, x0 z0 x1 z1 per rectangle: wheels stay inside
 *              their union (the streets, with a margin), or anywhere if
 *              there are none
 *   carRamps   Float32Array, rectangles as carIn: inside them wheels take
 *              a kerb (a drive's apron that the kit builds as a kerb)
 *   keepAll    keep the floors no flood reached too (for looking at why)
 *   diagnose   also report where reached ground ends at nothing (`voids`)
 *              or at a drop (`drops`), as { "x,z": cells } on an 8 m grid,
 *              and the edges themselves (`edges`): runs of reached ground
 *              with nothing at all beside it, as [axis, at, from, to, side]
 *              (axis 0: the edge runs along z at x = `at`, nothing on the
 *              -x side for side -1; axis 1 the same along x)
 *
 * Returns { x0, z0, tw, th, tiles, stats } with tiles a list of
 * { i, y, m, xc, xy, xm } (i = tz * tw + tx; y and m per cell, the lowest
 * reachable floor; xc, xy, xm the cells with more floors, sorted by cell).
 * In a kept tile a column nobody reaches keeps its lowest floor too, with
 * neither WALK nor CAR set: the top of whatever stands there (a bollard, a
 * wall's coping, a roof), which is what a camera needs to know.
 */
export function buildNav({ positions, index, parts = null, boxes, seals = null, bounds, walkFrom, carFrom, carIn = null, carRamps = null, keepAll = false, diagnose = false }, onProgress = () => {}) {
  const t0 = now();
  if (parts) for (let p = 0; p < parts.length; p += 3) for (let n = parts[p], end = n + parts[p + 1], base = parts[p + 2]; n < end; n++) index[n] += base;
  const x0 = Math.floor(bounds.x0 / (CELL * BLOCK)) * CELL * BLOCK;
  const z0 = Math.floor(bounds.z0 / (CELL * BLOCK)) * CELL * BLOCK;
  const bw = Math.ceil((bounds.x1 - x0) / (CELL * BLOCK));
  const bh = Math.ceil((bounds.z1 - z0) / (CELL * BLOCK));
  const tw = bw * 4;
  const th = bh * 4;
  const W = bw * BLOCK;
  const H = bh * BLOCK;
  const inv = 1 / CELL;

  // ---- triangles and boxes, by the blocks they stand over -----------------
  const nTri = index.length / 3;
  const counts = new Uint32Array(bw * bh + 1);
  const range = new Int32Array(4);
  const blocksOf = (minX, maxX, minZ, maxZ) => {
    range[0] = Math.max(0, Math.floor((minX - x0) / (CELL * BLOCK)));
    range[1] = Math.min(bw - 1, Math.floor((maxX - x0) / (CELL * BLOCK)));
    range[2] = Math.max(0, Math.floor((minZ - z0) / (CELL * BLOCK)));
    range[3] = Math.min(bh - 1, Math.floor((maxZ - z0) / (CELL * BLOCK)));
  };
  const triBounds = (t) => {
    const a = index[t * 3] * 3;
    const b = index[t * 3 + 1] * 3;
    const c = index[t * 3 + 2] * 3;
    const minY = Math.min(positions[a + 1], positions[b + 1], positions[c + 1]);
    const maxY = Math.max(positions[a + 1], positions[b + 1], positions[c + 1]);
    if (minY > Y_TOP || maxY < Y_BOTTOM) return false;
    blocksOf(
      Math.min(positions[a], positions[b], positions[c]),
      Math.max(positions[a], positions[b], positions[c]),
      Math.min(positions[a + 2], positions[b + 2], positions[c + 2]),
      Math.max(positions[a + 2], positions[b + 2], positions[c + 2]),
    );
    return range[0] <= range[1] && range[2] <= range[3];
  };
  for (let t = 0; t < nTri; t++) {
    if (!triBounds(t)) continue;
    for (let bz = range[2]; bz <= range[3]; bz++) for (let bx = range[0]; bx <= range[1]; bx++) counts[bz * bw + bx + 1]++;
  }
  for (let i = 0; i < bw * bh; i++) counts[i + 1] += counts[i];
  const refs = new Uint32Array(counts[bw * bh]);
  const fill = counts.slice(0, bw * bh);
  for (let t = 0; t < nTri; t++) {
    if (!triBounds(t)) continue;
    for (let bz = range[2]; bz <= range[3]; bz++) for (let bx = range[0]; bx <= range[1]; bx++) refs[fill[bz * bw + bx]++] = t;
  }
  const nBox = boxes.length / 6;
  const boxIn = Array.from({ length: bw * bh }, () => null);
  for (let k = 0; k < nBox; k++) {
    blocksOf(boxes[k * 6], boxes[k * 6 + 3], boxes[k * 6 + 2], boxes[k * 6 + 5]);
    for (let bz = range[2]; bz <= range[3]; bz++) for (let bx = range[0]; bx <= range[1]; bx++) (boxIn[bz * bw + bx] ??= []).push(k);
  }

  // ---- one block's columns ---------------------------------------------------
  // Spans in a pool, each column a list sorted by height.
  const head = new Int32Array(BLOCK * BLOCK);
  let cap = 1 << 19;
  let sLo = new Float32Array(cap);
  let sHi = new Float32Array(cap);
  let sNext = new Int32Array(cap);
  let used = 0;
  const grow = () => {
    cap *= 2;
    const lo = new Float32Array(cap);
    lo.set(sLo);
    sLo = lo;
    const hi = new Float32Array(cap);
    hi.set(sHi);
    sHi = hi;
    const nx = new Int32Array(cap);
    nx.set(sNext);
    sNext = nx;
  };
  const addSpan = (col, lo, hi) => {
    let prev = -1;
    let cur = head[col];
    while (cur !== -1 && sHi[cur] < lo - MERGE) {
      prev = cur;
      cur = sNext[cur];
    }
    if (cur === -1 || sLo[cur] > hi + MERGE) {
      if (used === cap) grow();
      const n = used++;
      sLo[n] = lo;
      sHi[n] = hi;
      sNext[n] = cur;
      if (prev === -1) head[col] = n;
      else sNext[prev] = n;
      return;
    }
    if (lo < sLo[cur]) sLo[cur] = lo;
    if (hi > sHi[cur]) {
      let top = hi;
      let nx = sNext[cur];
      while (nx !== -1 && sLo[nx] <= top + MERGE) {
        if (sHi[nx] > top) top = sHi[nx];
        nx = sNext[nx];
      }
      sHi[cur] = top;
      sNext[cur] = nx;
    }
  };

  // A triangle onto the block whose first cell is (cx0, cz0): every column
  // its footprint touches gets the stretch of height the triangle's plane
  // covers over that column.
  const raster = (t, cx0, cz0) => {
    const ia = index[t * 3] * 3;
    const ib = index[t * 3 + 1] * 3;
    const ic = index[t * 3 + 2] * 3;
    // In cells, from the block's corner.
    const ax = (positions[ia] - x0) * inv - cx0;
    const az = (positions[ia + 2] - z0) * inv - cz0;
    const bx = (positions[ib] - x0) * inv - cx0;
    const bz = (positions[ib + 2] - z0) * inv - cz0;
    const cx = (positions[ic] - x0) * inv - cx0;
    const cz = (positions[ic + 2] - z0) * inv - cz0;
    const ay = positions[ia + 1];
    const by = positions[ib + 1];
    const cy = positions[ic + 1];
    const minY = Math.max(Y_BOTTOM, Math.min(ay, by, cy));
    const maxY = Math.min(Y_TOP, Math.max(ay, by, cy));
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const i1 = Math.min(BLOCK - 1, Math.floor(Math.max(ax, bx, cx)));
    const k0 = Math.max(0, Math.floor(Math.min(az, bz, cz)));
    const k1 = Math.min(BLOCK - 1, Math.floor(Math.max(az, bz, cz)));
    if (i0 > i1 || k0 > k1) return;
    // The plane: y = ay + gx (x - ax) + gz (z - az), unless it stands on end.
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    const ny = uz * vx - ux * vz;
    const area = Math.abs(ny);
    const upright = area < 1e-4 * (Math.abs(uy * vz - uz * vy) + Math.abs(ux * vy - uy * vx) + 1e-12) || area < 1e-9;
    const gx = upright ? 0 : -(uy * vz - uz * vy) / ny;
    const gz = upright ? 0 : -(ux * vy - uy * vx) / ny;
    const spread = (Math.abs(gx) + Math.abs(gz)) * 0.5;
    const small = i1 - i0 < 2 && k1 - k0 < 2;
    // Edge functions, for which columns the footprint touches (a column
    // counts if any of its square does). A footprint with no area (a wall
    // seen from above) is its longest edge.
    let e0x = 0, e0z = 0, e0c = 0, e0r = 0;
    let e1x = 0, e1z = 0, e1c = 0, e1r = 0;
    let e2x = 0, e2z = 0, e2c = 0, e2r = 0;
    let line = false;
    if (!small) {
      if (area < 1e-6) {
        line = true;
        // The longest edge, as a line: |n . p + c| <= r.
        let px = ax, pz = az, qx = bx, qz = bz;
        let best = ux * ux + uz * uz;
        const d1 = vx * vx + vz * vz;
        if (d1 > best) {
          best = d1;
          qx = cx;
          qz = cz;
        }
        const d2 = (cx - bx) * (cx - bx) + (cz - bz) * (cz - bz);
        if (d2 > best) {
          px = bx;
          pz = bz;
          qx = cx;
          qz = cz;
        }
        e0x = qz - pz;
        e0z = px - qx;
        e0c = -(e0x * px + e0z * pz);
        e0r = (Math.abs(e0x) + Math.abs(e0z)) * 0.5 + 1e-6;
      } else {
        const s = ny > 0 ? 1 : -1;
        // Inside is where each edge function is positive; a column touches
        // the footprint if its centre is no further out than its reach.
        e0x = (bz - az) * s;
        e0z = (ax - bx) * s;
        e0c = -(e0x * ax + e0z * az);
        e0r = (Math.abs(e0x) + Math.abs(e0z)) * 0.5;
        e1x = (cz - bz) * s;
        e1z = (bx - cx) * s;
        e1c = -(e1x * bx + e1z * bz);
        e1r = (Math.abs(e1x) + Math.abs(e1z)) * 0.5;
        e2x = (az - cz) * s;
        e2z = (cx - ax) * s;
        e2c = -(e2x * cx + e2z * cz);
        e2r = (Math.abs(e2x) + Math.abs(e2z)) * 0.5;
      }
    }
    for (let k = k0; k <= k1; k++) {
      const zc = k + 0.5;
      for (let i = i0; i <= i1; i++) {
        const xc = i + 0.5;
        if (!small) {
          if (line) {
            if (Math.abs(e0x * xc + e0z * zc + e0c) > e0r) continue;
          } else if (e0x * xc + e0z * zc + e0c < -e0r || e1x * xc + e1z * zc + e1c < -e1r || e2x * xc + e2z * zc + e2c < -e2r) continue;
        }
        let lo = minY;
        let hi = maxY;
        if (!upright) {
          const y = ay + gx * (xc - ax) + gz * (zc - az);
          lo = Math.max(minY, y - spread);
          hi = Math.min(maxY, y + spread);
          if (lo > hi) lo = hi = Math.min(maxY, Math.max(minY, y));
        }
        addSpan(k * BLOCK + i, lo, hi);
      }
    }
  };

  // ---- the tiles ---------------------------------------------------------------
  // While building, every floor of every column (the lowest in `y`/`m`,
  // the rest in `x*`); after the floods, only what was reached.
  const tiles = new Array(tw * th).fill(null);
  const N = TILE * TILE;
  let floors = 0;
  // A block's extra floors before they are sorted into tiles.
  let xCap = 1 << 16;
  let xTile = new Int32Array(xCap);
  let xCell = new Uint16Array(xCap);
  let xY = new Int16Array(xCap);
  let xM = new Uint8Array(xCap);
  let xUsed = 0;
  const xGrow = () => {
    xCap *= 2;
    const a = new Int32Array(xCap);
    a.set(xTile);
    xTile = a;
    const b = new Uint16Array(xCap);
    b.set(xCell);
    xCell = b;
    const c = new Int16Array(xCap);
    c.set(xY);
    xY = c;
    const d = new Uint8Array(xCap);
    d.set(xM);
    xM = d;
  };
  const headroom = (gap) => Math.min(HEAD, Math.floor(gap * 4));

  const buildBlock = (bx, bz) => {
    const b = bz * bw + bx;
    const from = counts[b];
    const to = counts[b + 1];
    const list = boxIn[b];
    if (from === to && !list) return;
    head.fill(-1);
    used = 0;
    const cx0 = bx * BLOCK;
    const cz0 = bz * BLOCK;
    for (let r = from; r < to; r++) raster(refs[r], cx0, cz0);
    if (list) {
      for (const k of list) {
        const lo = Math.max(Y_BOTTOM, boxes[k * 6 + 1]);
        const hi = Math.min(Y_TOP, boxes[k * 6 + 4]);
        if (lo > hi) continue;
        const i0 = Math.max(0, Math.floor((boxes[k * 6] - x0) * inv - cx0));
        const i1 = Math.min(BLOCK - 1, Math.ceil((boxes[k * 6 + 3] - x0) * inv - cx0) - 1);
        const k0 = Math.max(0, Math.floor((boxes[k * 6 + 2] - z0) * inv - cz0));
        const k1 = Math.min(BLOCK - 1, Math.ceil((boxes[k * 6 + 5] - z0) * inv - cz0) - 1);
        for (let kk = k0; kk <= k1; kk++) for (let i = i0; i <= i1; i++) addSpan(kk * BLOCK + i, lo, hi);
      }
    }
    // Floors: the top of a span with room over it.
    xUsed = 0;
    for (let k = 0; k < BLOCK; k++) {
      for (let i = 0; i < BLOCK; i++) {
        let s = head[k * BLOCK + i];
        if (s === -1) continue;
        const ti = (bz * 4 + (k >> 6)) * tw + bx * 4 + (i >> 6);
        const cell = (k & 63) * TILE + (i & 63);
        let first = true;
        let tile = tiles[ti];
        while (s !== -1) {
          const nx = sNext[s];
          const top = sHi[s];
          const gap = nx === -1 ? 99 : sLo[nx] - top;
          // Something stands in this column, floor or none: it is not the
          // edge of everything (the diagnosis below tells the two apart).
          if (first && !tile) tile = tiles[ti] = { i: ti, y: new Int16Array(N).fill(NONE), m: new Uint8Array(N), xc: null, xy: null, xm: null };
          if (first && tile.y[cell] === NONE) tile.m[cell] = 1;
          if (gap >= CAR_CLEAR && top < Y_TOP - 0.01) {
            const y = Math.round(top * UNIT);
            const m = headroom(gap);
            if (first) {
              tile.y[cell] = y;
              tile.m[cell] = m;
              first = false;
            } else {
              if (xUsed === xCap) xGrow();
              xTile[xUsed] = ti;
              xCell[xUsed] = cell;
              xY[xUsed] = y;
              xM[xUsed] = m;
              xUsed++;
              tile.m[cell] |= MORE;
            }
            floors++;
          }
          s = nx;
        }
      }
    }
    // The extras, into their tiles, sorted by cell (they come out sorted
    // by block row, which is not by tile).
    if (xUsed) {
      const order = new Uint32Array(xUsed);
      for (let n = 0; n < xUsed; n++) order[n] = n;
      order.sort((p, q) => xTile[p] - xTile[q] || xCell[p] - xCell[q] || xY[p] - xY[q]);
      let n = 0;
      while (n < xUsed) {
        const ti = xTile[order[n]];
        let e = n;
        while (e < xUsed && xTile[order[e]] === ti) e++;
        const tile = tiles[ti];
        tile.xc = new Uint16Array(e - n);
        tile.xy = new Int16Array(e - n);
        tile.xm = new Uint8Array(e - n);
        for (let q = n; q < e; q++) {
          tile.xc[q - n] = xCell[order[q]];
          tile.xy[q - n] = xY[order[q]];
          tile.xm[q - n] = xM[order[q]];
        }
        n = e;
      }
    }
  };

  for (let bz = 0; bz < bh; bz++) {
    for (let bx = 0; bx < bw; bx++) buildBlock(bx, bz);
    onProgress(0.05 + 0.75 * ((bz + 1) / bh));
  }
  const tRaster = now();

  // ---- the floods -------------------------------------------------------------
  // A floor is (tile, slot): slot < N is the cell's lowest floor, N + n its
  // nth extra. In a queue as tile * 2^17 + slot (extras per tile stay far
  // under 2^16).
  const SLOT = 1 << 17;
  // The first extra of `cell` in `tile`, or -1.
  const firstExtra = (tile, cell) => {
    const xc = tile.xc;
    if (!xc) return -1;
    let lo = 0;
    let hi = xc.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (xc[mid] < cell) lo = mid + 1;
      else hi = mid;
    }
    return xc[lo] === cell ? lo : -1;
  };
  // The floor of global cell (gx, gz) within `step` of height y (in units)
  // with `clear` headroom: its node, or -1. Writes its height to `found`.
  let found = 0;
  const floorNear = (gx, gz, y, step, clear) => {
    if (gx < 0 || gz < 0 || gx >= W || gz >= H) return -1;
    const ti = (gz >> 6) * tw + (gx >> 6);
    const tile = tiles[ti];
    if (!tile) return -1;
    const cell = (gz & 63) * TILE + (gx & 63);
    const fy = tile.y[cell];
    if (fy === NONE) return -1;
    const m = tile.m[cell];
    if (Math.abs(fy - y) <= step && (m & HEAD) >= clear) {
      found = fy;
      return ti * SLOT + cell;
    }
    if (m & MORE) {
      for (let e = firstExtra(tile, cell); e !== -1 && e < tile.xc.length && tile.xc[e] === cell; e++) {
        if (Math.abs(tile.xy[e] - y) <= step && (tile.xm[e] & HEAD) >= clear) {
          found = tile.xy[e];
          return ti * SLOT + N + e;
        }
      }
    }
    return -1;
  };
  const mark = (node, bit) => {
    const tile = tiles[Math.floor(node / SLOT)];
    const slot = node % SLOT;
    if (slot < N) {
      if (tile.m[slot] & bit) return false;
      tile.m[slot] |= bit;
    } else {
      if (tile.xm[slot - N] & bit) return false;
      tile.xm[slot - N] |= bit;
    }
    return true;
  };
  const within = (rects, gx, gz) => {
    const x = x0 + (gx + 0.5) * CELL;
    const z = z0 + (gz + 0.5) * CELL;
    for (let r = 0; r < rects.length; r += 4) if (x >= rects[r] && x <= rects[r + 2] && z >= rects[r + 1] && z <= rects[r + 3]) return true;
    return false;
  };
  const allowed = (gx, gz) => !carIn || !carIn.length || within(carIn, gx, gz);
  const flood = (seeds, bit, stepM, clearM, inside, ramps = null) => {
    const flat = Math.round(stepM * UNIT);
    const kerb = Math.round(0.2 * UNIT);
    const clear = Math.floor(clearM * 4);
    let queue = new Uint32Array(1 << 20);
    let qy = new Int16Array(1 << 20);
    let qh = 0;
    let qt = 0;
    const push = (node, y) => {
      if (qt === queue.length) {
        const a = new Uint32Array(queue.length * 2);
        a.set(queue);
        queue = a;
        const b = new Int16Array(qy.length * 2);
        b.set(qy);
        qy = b;
      }
      queue[qt] = node;
      qy[qt++] = y;
    };
    let reached = 0;
    for (const [sx, sy, sz] of seeds) {
      const gx = Math.floor((sx - x0) * inv);
      const gz = Math.floor((sz - z0) * inv);
      // A seed stands where the builder says: allow it a kerb's error.
      const node = floorNear(gx, gz, Math.round(sy * UNIT), Math.round(0.3 * UNIT), clear);
      if (node !== -1 && mark(node, bit)) {
        push(node, found);
        reached++;
      }
    }
    while (qh < qt) {
      const node = queue[qh];
      const y = qy[qh++];
      const ti = Math.floor(node / SLOT);
      const slot = node % SLOT;
      const cell = slot < N ? slot : tiles[ti].xc[slot - N];
      const gx = (ti % tw) * TILE + (cell & 63);
      const gz = Math.floor(ti / tw) * TILE + (cell >> 6);
      const step = ramps && within(ramps, gx, gz) ? kerb : flat;
      for (let d = 0; d < 4; d++) {
        const nx = gx + (d === 0 ? 1 : d === 1 ? -1 : 0);
        const nz = gz + (d === 2 ? 1 : d === 3 ? -1 : 0);
        const next = floorNear(nx, nz, y, step, clear);
        if (next === -1) continue;
        const fy = found;
        if (inside && !inside(nx, nz)) continue;
        if (mark(next, bit)) {
          push(next, fy);
          reached++;
        }
      }
    }
    return reached;
  };
  const driven = flood(carFrom, CAR, CAR_STEP, CAR_CLEAR, allowed, carRamps);
  onProgress(0.84);
  let walked = flood(walkFrom, WALK, WALK_STEP, WALK_CLEAR, null);
  onProgress(0.9);

  // ---- the buildings' boxes, as seals -----------------------------------------
  // What a box holds of the reached floors, between its floor and just
  // under its top: wheels, feet well up it, feet at its floor.
  const openBoxes = [];
  let sealed = 0;
  const nSeal = seals ? seals.length / 6 : 0;
  const inBox = (k, inset, visit) => {
    const lo = Math.round((seals[k * 6 + 1] - 0.05) * UNIT);
    const hi = Math.round((seals[k * 6 + 4] - 0.3) * UNIT);
    const i0 = Math.max(0, Math.ceil((seals[k * 6] + inset - x0) * inv - 0.5));
    const i1 = Math.min(W - 1, Math.floor((seals[k * 6 + 3] - inset - x0) * inv - 0.5));
    const k0 = Math.max(0, Math.ceil((seals[k * 6 + 2] + inset - z0) * inv - 0.5));
    const k1 = Math.min(H - 1, Math.floor((seals[k * 6 + 5] - inset - z0) * inv - 0.5));
    for (let gz = k0; gz <= k1; gz++) {
      for (let gx = i0; gx <= i1; gx++) {
        const tile = tiles[(gz >> 6) * tw + (gx >> 6)];
        if (!tile) continue;
        const cell = (gz & 63) * TILE + (gx & 63);
        const fy = tile.y[cell];
        if (fy === NONE) continue;
        if (fy >= lo && fy < hi) visit(tile.y, tile.m, cell);
        if (tile.m[cell] & MORE) for (let e = firstExtra(tile, cell); e !== -1 && e < tile.xc.length && tile.xc[e] === cell; e++) if (tile.xy[e] >= lo && tile.xy[e] < hi) visit(tile.xy, tile.xm, e);
      }
    }
  };
  for (let k = 0; k < nSeal; k++) {
    let wheels = 0;
    let high = 0;
    let low = 0;
    const up = Math.round((seals[k * 6 + 1] + 0.5) * UNIT);
    inBox(k, 0.3, (ys, ms, n) => {
      if (ms[n] & CAR) wheels++;
      else if (ms[n] & WALK) ys[n] >= up ? high++ : low++;
    });
    // (A few feet up a plinth inside a shell are not a stair through it.)
    if (wheels || high > 4 + low / 20) openBoxes.push(k, wheels, high, low);
    else if (low) {
      // Filled: no headroom on any floor inside it.
      inBox(k, 0, (ys, ms, n) => {
        ms[n] &= ~HEAD;
      });
      sealed++;
    }
  }
  if (sealed) {
    for (const tile of tiles) {
      if (!tile) continue;
      for (let n = 0; n < N; n++) tile.m[n] &= ~WALK;
      if (tile.xm) for (let n = 0; n < tile.xm.length; n++) tile.xm[n] &= ~WALK;
    }
    walked = flood(walkFrom, WALK, WALK_STEP, WALK_CLEAR, null);
  }
  onProgress(0.95);
  const tFlood = now();

  // ---- where the reached ground just ends (for whoever closes the edges) ----
  const voids = {};
  const drops = {};
  const edges = [];
  if (diagnose) {
    // Reached cells with nothing beside them, by the line the edge lies on.
    const lines = new Map();
    const edge = (axis, at, along, side) => {
      const key = `${axis},${at},${side}`;
      let list = lines.get(key);
      if (!list) lines.set(key, (list = []));
      list.push(along);
    };
    const note = (into, gx, gz) => {
      const key = `${Math.round((x0 + gx * CELL) / 8) * 8},${Math.round((z0 + gz * CELL) / 8) * 8}`;
      into[key] = (into[key] ?? 0) + 1;
    };
    for (const tile of tiles) {
      if (!tile) continue;
      const tx = (tile.i % tw) * TILE;
      const tz = Math.floor(tile.i / tw) * TILE;
      const look = (cell, fy) => {
        const gx = tx + (cell & 63);
        const gz = tz + (cell >> 6);
        for (let d = 0; d < 4; d++) {
          const nx = gx + (d === 0 ? 1 : d === 1 ? -1 : 0);
          const nz = gz + (d === 2 ? 1 : d === 3 ? -1 : 0);
          const other = nx < 0 || nz < 0 || nx >= W || nz >= H ? null : tiles[(nz >> 6) * tw + (nx >> 6)];
          const oc = (nz & 63) * TILE + (nx & 63);
          // No floor there and nothing standing there either.
          if (!other || (other.y[oc] === NONE && other.m[oc] === 0)) {
            note(voids, gx, gz);
            if (d < 2) edge(0, x0 + (d === 0 ? gx + 1 : gx) * CELL, z0 + gz * CELL, d === 0 ? 1 : -1);
            else edge(1, z0 + (d === 2 ? gz + 1 : gz) * CELL, x0 + gx * CELL, d === 2 ? 1 : -1);
            return;
          }
          if (other.y[oc] === NONE) continue;
          // Nothing within two metres below or a step above: a drop.
          let top = other.y[oc];
          if (other.m[oc] & MORE) for (let e = firstExtra(other, oc); e !== -1 && e < other.xc.length && other.xc[e] === oc; e++) if (other.xy[e] <= fy + UNIT) top = Math.max(top, other.xy[e]);
          if (top < fy - 2 * UNIT) {
            note(drops, gx, gz);
            return;
          }
        }
      };
      for (let cell = 0; cell < N; cell++) if (tile.y[cell] !== NONE && tile.m[cell] & WALK) look(cell, tile.y[cell]);
      if (tile.xc) for (let e = 0; e < tile.xc.length; e++) if (tile.xm[e] & WALK) look(tile.xc[e], tile.xy[e]);
    }
    // Joined into runs (a gap of under a metre is the same run).
    for (const [key, list] of lines) {
      const [axis, at, side] = key.split(",").map(Number);
      list.sort((p, q) => p - q);
      let from = list[0];
      let to = list[0];
      for (let n = 1; n <= list.length; n++) {
        if (n < list.length && list[n] - to <= 1) {
          to = list[n];
          continue;
        }
        if (to - from >= 0.5) edges.push([axis, at, from, to + CELL, side]);
        from = to = list[n];
      }
    }
  }

  // ---- keep what was reached ------------------------------------------------
  const out = [];
  let bytes = 0;
  let kept = 0;
  const KEEP = WALK | CAR;
  for (const tile of tiles) {
    if (!tile) continue;
    const y = new Int16Array(N).fill(NONE);
    const m = new Uint8Array(N);
    const ec = [];
    const ey = [];
    const em = [];
    let any = false;
    let e = 0;
    const nx = tile.xc ? tile.xc.length : 0;
    for (let cell = 0; cell < N; cell++) {
      let has = false;
      if (tile.y[cell] !== NONE && (keepAll || tile.m[cell] & KEEP)) {
        y[cell] = tile.y[cell];
        m[cell] = tile.m[cell] & ~MORE;
        has = true;
        kept++;
      }
      if (tile.m[cell] & MORE) {
        while (e < nx && tile.xc[e] < cell) e++;
        for (; e < nx && tile.xc[e] === cell; e++) {
          if (!keepAll && !(tile.xm[e] & KEEP)) continue;
          kept++;
          if (!has) {
            y[cell] = tile.xy[e];
            m[cell] = tile.xm[e];
            has = true;
          } else {
            ec.push(cell);
            ey.push(tile.xy[e]);
            em.push(tile.xm[e]);
            m[cell] |= MORE;
          }
        }
      }
      any ||= has;
      // What stands here, for the camera.
      if (!has && tile.y[cell] !== NONE) {
        y[cell] = tile.y[cell];
        m[cell] = tile.m[cell] & HEAD;
      }
    }
    if (!any) continue;
    const kt = { i: tile.i, y, m, xc: ec.length ? Uint16Array.from(ec) : null, xy: ec.length ? Int16Array.from(ey) : null, xm: ec.length ? Uint8Array.from(em) : null };
    bytes += N * 3 + ec.length * 5;
    out.push(kt);
  }
  onProgress(1);
  return {
    x0,
    z0,
    tw,
    th,
    tiles: out,
    stats: {
      triangles: nTri,
      boxes: nBox,
      sealed,
      // k, wheels, feet high, feet low: per box left open.
      openBoxes,
      voids,
      drops,
      edges,
      cells: W * H,
      floors,
      walked,
      driven,
      kept,
      tiles: out.length,
      bytes,
      ms: { raster: Math.round(tRaster - t0), flood: Math.round(tFlood - tRaster), keep: Math.round(now() - tFlood), all: Math.round(now() - t0) },
    },
  };
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
