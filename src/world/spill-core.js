// src/world/spill-core.js: the city's light baked, with no three.js in it.
//
// (load) The bake itself, src/world/spill.js's, moved here whole so it can
// run on a worker (src/world/spill-worker.js) as well as on the page: the
// core city's is worked out off the page's thread while the city is built,
// a district's on the page a step at a time. Each source comes as plain
// numbers and arrays (spill.js `raw`): its positions read and moved as
// three's BufferAttribute.getX and Vector3.applyMatrix4 read and move them,
// and its triangles' areas as Vector3's cross and length make them, so the
// maps are the same to the bit wherever they are made. spill.js's own
// header says what the maps are:
//
// Two maps over the ground plane, both computed in a few tens of
// milliseconds from the emissive geometry the GLB already carries:
//
//   spill    every emissive triangle (sign, strip, shopfront, lamp) adds its
//            colour at its feet, then the grid is blurred at two radii: a
//            tight pool under each sign and a wide wash down the street.
//            Every surface samples it (src/world/glsl.js, spillAt).
//   streaks  the same light where the hero's eye would see it mirrored in
//            the wet road, smeared along the street: a sign at height h,
//            seen from an eye at height H, reflects at H/(H+h) of the way
//            from the eye to the sign, and on rough wet asphalt that point
//            stretches into a streak running down the street, which is most
//            of what the plate's road is. Baked for the avenue, where the
//            hero looks; it is the phone tier's whole reflection, and a
//            layer under the real planar reflection on desktop.
//
// Both are 8-bit, square-root encoded (the shaders square them back), which
// keeps the soft tails of the falloff without a float texture.
// Over the whole kit: Japantown's outer lots to Santo Domingo's east edge,
// the megabuilding's north side to the depot at the avenue's south end.
export const LIGHT_BOUNDS = { x0: -176, z0: -880, x1: 580, z1: 125 };
export const CELL = 1.5;
// The streaks get a finer grid of their own, over the avenue only: 0.4 m
// across the street so every sign's reflection stays its own streak, a metre
// along it.
export const STREAK_BOUNDS = { x0: -24, z0: -740, x1: 24, z1: 60 };
const SX = 0.4;
const SZ = 1.0;
// A lamp of power 1 peaks at about LAMP_GAIN / 9 in the spill map, a pool
// two or three metres round: lamps a few metres apart light a lane in
// patches, dark between.
const LAMP_GAIN = 1.4;
/** The spill map holds up to this many times the light its gain was set for
 *  (the hero's street at the first bake); the shaders' uSpillGain undoes it. */
export const SPILL_RANGE = 3;

// What three's denormalize makes of a stored integer, by its array's type.
function unit(array) {
  switch (array.constructor) {
    case Float32Array:
      return null;
    case Uint32Array:
      return (v) => v / 4294967295.0;
    case Uint16Array:
      return (v) => v / 65535.0;
    case Uint8Array:
    case Uint8ClampedArray:
      return (v) => v / 255.0;
    case Int32Array:
      return (v) => Math.max(v / 2147483647.0, -1.0);
    case Int16Array:
      return (v) => Math.max(v / 32767.0, -1.0);
    case Int8Array:
      return (v) => Math.max(v / 127.0, -1.0);
    default:
      throw new Error("spill: a position of an unknown type");
  }
}

// A running box sum across (or down) the map, its three channels side by
// side. Down the map every column's sums run at once, a row at a time, so
// the map is read in the order it lies in memory; each sum takes the same
// values in the same order as one sum a column and channel would, so the
// result is the same to the bit.
// (load: rows y0 to y1 of it, so a district's bake once the city is live
// can be spread over the page's frames; `sum` carries the downward sums
// from one range to the next. boxBlur runs all rows at once, as before.)
function boxRows(src, dst, W, H, r, horizontal, y0, y1, sum) {
  const n = 2 * r + 1;
  if (horizontal) {
    for (let y = y0; y < y1; y++) {
      const row = y * W * 3;
      let s0 = 0;
      let s1 = 0;
      let s2 = 0;
      for (let x = -r; x <= r; x++) {
        const k = row + Math.min(W - 1, Math.max(0, x)) * 3;
        s0 += src[k];
        s1 += src[k + 1];
        s2 += src[k + 2];
      }
      for (let x = 0; x < W; x++) {
        const d = row + x * 3;
        dst[d] = s0 / n;
        dst[d + 1] = s1 / n;
        dst[d + 2] = s2 / n;
        const out = row + (x - r > 0 ? x - r : 0) * 3;
        const inn = row + (x + r + 1 < W ? x + r + 1 : W - 1) * 3;
        s0 += src[inn] - src[out];
        s1 += src[inn + 1] - src[out + 1];
        s2 += src[inn + 2] - src[out + 2];
      }
    }
  } else {
    const line = W * 3;
    if (y0 === 0) {
      for (let y = -r; y <= r; y++) {
        const row = Math.min(H - 1, Math.max(0, y)) * line;
        for (let k = 0; k < line; k++) sum[k] += src[row + k];
      }
    }
    for (let y = y0; y < y1; y++) {
      const d = y * line;
      const out = (y - r > 0 ? y - r : 0) * line;
      const inn = (y + r + 1 < H ? y + r + 1 : H - 1) * line;
      for (let k = 0; k < line; k++) {
        dst[d + k] = sum[k] / n;
        sum[k] += src[inn + k] - src[out + k];
      }
    }
  }
}

const ROWS = 48;
function* boxSteps(src, dst, W, H, r, horizontal) {
  const sum = horizontal ? null : new Float64Array(W * 3);
  for (let y = 0; y < H; y += ROWS) {
    boxRows(src, dst, W, H, r, horizontal, y, Math.min(H, y + ROWS), sum);
    yield;
  }
}

// (load: `tmp`, the passes' scratch, may be handed in: a bake that finishes
// again for each district keeps its scratch, where every finish made some
// 40 MB of arrays a moment's garbage, collected in a task of its own.)
function* blurSteps(field, W, H, r, passes = 3, tmp = new Float32Array(field.length)) {
  for (let i = 0; i < passes; i++) {
    yield* boxSteps(field, tmp, W, H, r, true);
    yield* boxSteps(tmp, field, W, H, r, false);
  }
  return field;
}

/** A gain that puts the brightest few percent of lit cells near full scale,
 *  whatever the city's total light came to. */
function autoGain(field, target, pct = 0.985) {
  // (In a typed array, whose sort is by number: the field's values are
  // float32, so they are held exactly.)
  const vals = new Float32Array(field.length / 3);
  let n = 0;
  for (let i = 0; i < field.length; i += 3) {
    const v = Math.max(field[i], field[i + 1], field[i + 2]);
    if (v > 1e-5) vals[n++] = v;
  }
  if (!n) return 1;
  const sorted = vals.subarray(0, n).sort();
  return target / sorted[Math.min(n - 1, Math.floor(n * pct))];
}

function encodeCells(field, data, gain, height, i0, i1) {
  for (let i = i0; i < i1; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const v = Math.min(1, field[i * 3 + ch] * gain);
      data[i * 4 + ch] = Math.round(Math.sqrt(v) * 255);
    }
    data[i * 4 + 3] = height && height[i * 3] > 1e-6 ? Math.min(255, Math.round((height[i * 3 + 1] / height[i * 3]) * 16)) : 255;
  }
}

function* encodeSteps(field, W, H, gain, height = null) {
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i += W * ROWS) {
    encodeCells(field, data, gain, height, i, Math.min(W * H, i + W * ROWS));
    yield;
  }
  return data;
}

// Above and behind the hero's lens: from its own half a metre every
// reflection would land within a few metres of it, and these are for a
// phone that has shed its mirror, where streaks running the length of the
// avenue read better than exact ones piled up at the kerb.
const EYE = { x: 0.6, y: 2.3, z: 18 };

/** The maps' sizes: the spill W x H, the streaks SW x SH. */
export const MAP = (() => {
  const { x0, z0, x1, z1 } = LIGHT_BOUNDS;
  return {
    W: Math.ceil((x1 - x0) / CELL),
    H: Math.ceil((z1 - z0) / CELL),
    SW: Math.ceil((STREAK_BOUNDS.x1 - STREAK_BOUNDS.x0) / SX),
    SH: Math.ceil((STREAK_BOUNDS.z1 - STREAK_BOUNDS.z0) / SZ),
  };
})();

/**
 * The bake, in pieces: `add(sources)` as each part of the city arrives (the
 * core, then each streamed pack), `finish()` for the maps of everything
 * added so far ({ spill, streaks }, RGBA bytes, new arrays each time). A
 * source: { array, stride, offset, normalized } its positions as stored,
 * `index` (or null) and `count`, `e` its matrixWorld's elements, `r`, `g`,
 * `b` its linear colour and `intensity`. `state()` and `adopt(state)` hand
 * what has been added (and the gains) from one bake to another.
 */
export function createBakeCore() {
  const { x0, z0 } = LIGHT_BOUNDS;
  const { W, H, SW, SH } = MAP;
  let pool = new Float32Array(W * H * 3);
  let streak = new Float32Array(SW * SH * 3);
  // The small lamps' pools, kept apart from the signs' so they do not move
  // the gain the hero's street is lit at.
  let lamps = new Float32Array(W * H * 3);
  // How high the light in each cell hangs: its weight, and weight times
  // height (the third channel rides along unused, to share the blur).
  let hung = new Float32Array(W * H * 3);
  // (load: the maps' working arrays, made at the first finish and kept for
  // the next until release(): each is written whole before it is read, so
  // a finish makes the same maps with them as with new ones.)
  let scratch = null;
  const copy = (key, from) => {
    scratch[key] ??= new Float32Array(from.length);
    scratch[key].set(from);
    return scratch[key];
  };
  const room = (key, length) => (scratch[key] ??= new Float32Array(length));

  // (load: a generator, some thousands of triangles a step, for a
  // district's light added once the city is live; add runs it through.)
  function* addSteps(sources) {
    let since = 0;
    const a = [0, 0, 0];
    const b = [0, 0, 0];
    const c = [0, 0, 0];
    for (const { array, stride, offset, normalized, index, count, e, r: cr, g: cg, b: cb, intensity } of sources) {
      const den = normalized ? unit(array) : null;
      // A vertex's position, read as getX/getY/getZ read it and moved as
      // Vector3.applyMatrix4 moves it.
      const at = (v, out) => {
        const o = v * stride + offset;
        let x = array[o];
        let y = array[o + 1];
        let z = array[o + 2];
        if (den) {
          x = den(x);
          y = den(y);
          z = den(z);
        }
        const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
        out[0] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
        out[1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
        out[2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
      };
      const color = { r: cr, g: cg, b: cb };
      for (let i = 0; i < count; i += 3) {
        if (++since === 8192) {
          since = 0;
          yield;
        }
        at(index ? index[i] : i, a);
        at(index ? index[i + 1] : i + 1, b);
        at(index ? index[i + 2] : i + 2, c);
        // (b - a) x (c - a), as Vector3.crossVectors, and its length.
        const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
        const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2];
        const nx = aby * acz - abz * acy;
        const ny = abz * acx - abx * acz;
        const nz = abx * acy - aby * acx;
        const area = Math.sqrt(nx * nx + ny * ny + nz * nz) * 0.5;
        if (area < 1e-4) continue;
        const cx = (a[0] + b[0] + c[0]) / 3;
        const cy = (a[1] + b[1] + c[1]) / 3;
        const cz = (a[2] + b[2] + c[2]) / 3;
        const gx = Math.floor((cx - x0) / CELL);
        const gz = Math.floor((cz - z0) / CELL);
        if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
        // Big boards do not light a street in proportion to their area.
        const e = intensity * Math.min(area, 6) * (cy > 30 ? 0.35 : 1);
        const k = (gz * W + gx) * 3;
        pool[k] += color.r * e;
        pool[k + 1] += color.g * e;
        pool[k + 2] += color.b * e;
        const wgt = (color.r + color.g + color.b) * e;
        hung[k] += wgt;
        hung[k + 1] += wgt * Math.max(cy, 0);
        // Mirrored for the hero's eye: only what stands on the avenue and
        // the canyon themselves, which is what that camera sees (the bake
        // has no walls in it: a lane's lamps behind the rows would streak
        // the road they cannot shine on).
        if (cy > 1.0 && cy < 60 && Math.abs(cx) < 20 && cz < 0) {
          const t = EYE.y / (EYE.y + cy);
          const rx = Math.floor((EYE.x + (cx - EYE.x) * t - STREAK_BOUNDS.x0) / SX);
          const rz = Math.floor((EYE.z + (cz - EYE.z) * t - STREAK_BOUNDS.z0) / SZ);
          if (rx >= 0 && rz >= 0 && rx < SW && rz < SH) {
            const r = (rz * SW + rx) * 3;
            const s = e * Math.min(1, cy / 5);
            streak[r] += color.r * s;
            streak[r + 1] += color.g * s;
            streak[r + 2] += color.b * s;
          }
        }
      }
    }
  }
  const add = (sources) => {
    const steps = addSteps(sources);
    while (!steps.next().done);
  };

  /** points: a flat list, per lamp [x, y, z, r, g, b, power] (linear colour). */
  const addPoints = (points) => {
    for (let i = 0; i < points.length; i += 7) {
      const gx = Math.floor((points[i] - x0) / CELL);
      const gz = Math.floor((points[i + 2] - z0) / CELL);
      if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
      const k = (gz * W + gx) * 3;
      const e = points[i + 6];
      lamps[k] += points[i + 3] * e;
      lamps[k + 1] += points[i + 4] * e;
      lamps[k + 2] += points[i + 5] * e;
      const wgt = (points[i + 3] + points[i + 4] + points[i + 5]) * e * 4;
      hung[k] += wgt;
      hung[k + 1] += wgt * Math.max(points[i + 1], 0);
    }
  };

  // The gains are set by the first finish (the core: the hero's street) and
  // kept, so the street the reader is looking at does not change its light
  // when a district arrives somewhere else.
  let gains = null;
  function* finishSteps() {
    // The pool: a tight halo in each sign's own colour, which is what
    // lights the wall beside it and the pavement under it, plus a wide wash
    // down the street. The wash is every sign's colour summed, which is
    // lilac: the avenue keeps it (the plate's street is that colour), and
    // away from the avenue it is cooled toward the night's own blue, so a
    // lane between two pools is dark and navy, not evenly mauve.
    // And nearest of all, a couple of metres round each: the light a walker
    // sees land on the wall a sign hangs on.
    scratch ??= {};
    const tmpMap = room("tmpMap", pool.length);
    const near = yield* blurSteps(copy("near", pool), W, H, 1, 2, tmpMap);
    const tight = yield* blurSteps(copy("tight", pool), W, H, 2, 3, tmpMap);
    const wide = yield* blurSteps(copy("wide", pool), W, H, 7, 3, tmpMap);
    yield* spans(tight.length, (i0, i1) => {
    for (let i = i0; i < i1; i += 3) {
      const x = x0 + ((i / 3) % W + 0.5) * CELL;
      const away = Math.min(1, Math.max(0, (Math.abs(x) - 22) / 20));
      const l = (wide[i] * 0.3 + wide[i + 1] * 0.59 + wide[i + 2] * 0.11) * 0.7 * away;
      const wash = 0.9 - 0.45 * away;
      tight[i] = near[i] * 0.35 + tight[i] * 0.6 + (wide[i] * (1 - 0.7 * away) + l * 0.5) * wash;
      tight[i + 1] = near[i + 1] * 0.35 + tight[i + 1] * 0.6 + (wide[i + 1] * (1 - 0.7 * away) + l * 0.9) * wash;
      tight[i + 2] = near[i + 2] * 0.35 + tight[i + 2] * 0.6 + (wide[i + 2] * (1 - 0.7 * away) + l * 1.25) * wash;
    }
    });

    // The streaks: a hair across the street, a long way along it, more
    // toward the eye than away from it.
    const across = room("across", streak.length);
    yield* boxSteps(streak, across, SW, SH, 1, true);
    const decay = Math.exp(-SZ / 14);
    const run = room("run", streak.length);
    for (let x = 0; x < SW; x++) {
      let r = 0, g = 0, b = 0;
      for (let y = 0; y < SH; y++) {
        const k = (y * SW + x) * 3;
        r = across[k] + r * decay;
        g = across[k + 1] + g * decay;
        b = across[k + 2] + b * decay;
        run[k] = r;
        run[k + 1] = g;
        run[k + 2] = b;
      }
    }
    const tmp = room("tmpStreak", run.length);
    yield* boxSteps(run, tmp, SW, SH, 3, false);

    gains ??= { spill: autoGain(tight, 0.85), streaks: autoGain(tmp, 0.9, 0.995) };
    // The gain is the avenue's, whose signs are the size of buildings. An
    // eye in a lane has opened up to the lane: away from the avenue, what
    // is dimmer than the avenue's street is lifted toward it (its colour
    // kept), so a lamp over a back door lights the wall it is on.
    const ref = 0.5 / gains.spill;
    yield* spans(tight.length, (i0, i1) => {
    for (let i = i0; i < i1; i += 3) {
      const m = Math.max(tight[i], tight[i + 1], tight[i + 2]);
      if (m >= ref || m < 1e-7) continue;
      const x = x0 + ((i / 3) % W + 0.5) * CELL;
      const away = Math.min(1, Math.max(0, (Math.abs(x) - 22) / 20));
      const lift = Math.min(5, (ref / m) ** (0.6 * away));
      tight[i] *= lift;
      tight[i + 1] *= lift;
      tight[i + 2] *= lift;
    }
    });
    // Each lamp a pool a few metres round, in the encoded map's own units,
    // and no brighter than a lamp's pool is however many lamps the builder
    // hung there (its colour kept): a lane is lit in patches, dark between,
    // not from end to end.
    const pools = yield* blurSteps(copy("pools", lamps), W, H, 1, 1, tmpMap);
    yield* spans(tight.length, (i0, i1) => {
    for (let i = i0; i < i1; i += 3) {
      const m = (Math.max(pools[i], pools[i + 1], pools[i + 2]) * LAMP_GAIN) / gains.spill;
      if (m < 1e-6) continue;
      const k = ((1.2 * (1 - Math.exp(-m / 1.2))) / m) * (LAMP_GAIN / gains.spill);
      tight[i] += pools[i] * k;
      tight[i + 1] += pools[i + 1] * k;
      tight[i + 2] += pools[i + 2] * k;
    }
    });
    // A cell brighter than its street's light is eased down toward the most
    // the map holds, its channels together, so it keeps its colour: clipped,
    // a pavement under six signs is lit white and no pool stands out of it.
    // The avenue's ceiling is lower: its light is the hero's.
    yield* spans(tight.length, (i0, i1) => {
    for (let i = i0; i < i1; i += 3) {
      const m = Math.max(tight[i], tight[i + 1], tight[i + 2]) * gains.spill;
      if (m <= 0.6) continue;
      const x = x0 + ((i / 3) % W + 0.5) * CELL;
      const top = 1.5 + (SPILL_RANGE - 1.5) * Math.min(1, Math.max(0, (Math.abs(x) - 22) / 20)) - 0.6;
      const ease = (0.6 + top * (1 - Math.exp(-(m - 0.6) / top))) / m;
      tight[i] *= ease;
      tight[i + 1] *= ease;
      tight[i + 2] *= ease;
    }
    });
    const height = yield* blurSteps(copy("height", hung), W, H, 2, 2, tmpMap);
    const spill = yield* encodeSteps(tight, W, H, gains.spill / SPILL_RANGE, height);
    const streaks = yield* encodeSteps(tmp, SW, SH, gains.streaks);
    return { spill, streaks };
  }
  // (load: the map's work in pieces of ROWS rows, so a district's bake once
  // the city is live can be spread over the page's frames; finish runs them
  // straight through, as before, and both make the same maps to the bit.)
  function* spans(length, fn) {
    const span = 3 * W * ROWS;
    for (let i = 0; i < length; i += span) {
      fn(i, Math.min(length, i + span));
      yield;
    }
  }
  const finish = () => {
    const steps = finishSteps();
    let r;
    while (!(r = steps.next()).done);
    return r.value;
  };
  /** finish, a step at a time: `between()` resolves when the page has a
   *  moment between its frames (at once while that moment lasts). */
  const finishSliced = async (between) => {
    const steps = finishSteps();
    for (;;) {
      const r = steps.next();
      if (r.done) return r.value;
      await between();
    }
  };
  /** (load) Let the working arrays go (the last district is in); a later
   *  finish makes them again. */
  const release = () => {
    scratch = null;
  };
  /** What has been added so far, and the gains: its arrays are handed over
   *  (this bake should not be used after). */
  const state = () => ({ pool, streak, lamps, hung, gains });
  /** Another bake's state, as this one's own. */
  const adopt = (s) => {
    ({ pool, streak, lamps, hung, gains } = s);
  };
  return { add, addSteps, addPoints, finish, finishSliced, release, state, adopt };
}
