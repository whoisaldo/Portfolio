// src/world/crowd-cross.js: people who cross at the junctions' crossings.
//
// Every junction the traffic drives through has a painted crossing on each
// arm (scripts/blender/ncw/streets.py, _crossing: yellow and black bars from
// 4.6 m out of the junction's square, 3.4 m wide, kerb to kerb). A few people
// wait at each end of one, facing the road, and cross when the traffic says
// that arm can be walked for long enough to get over (traffic.walk(x, z,
// arm), from the traffic's own timetable and clock), and at a junction with
// lights only while the box over it shows the figure (traffic.sign(x, z,
// arm), src/world/signals.js); on the far side they wait a while and come
// back. While they cross they are walkers on a
// straight line of their own (crowd.js draws them as it draws everyone on a
// walk, so their feet stay where they land); waiting, they stand.
//
// No three.js in here: plain numbers in, plain numbers out.

const KERB_W = 0.3;
const OUT = 4.0 + 0.6;
const ZEBRA = 3.4;
// How far in from the kerb's edge they wait, and how far along the walk a
// crosser's line starts before the kerb (so it never comes near its own
// ends, where a walk fades).
const IN = 0.7;
const LEAD = 10;

/**
 * The crossings, from the traffic's streets (traffic-net.js's STREETS: name,
 * axis, c, a, b, half): at every crossing of two streets that both run past
 * it, each arm that runs on for a crossing's width at least. For each: the
 * junction's centre and the arm ("n" toward -z, "s", "e", "w"), the two ends
 * of the line across (on the pavements either side, IN from the kerb), and
 * how far each end is from the road's edge. `skip(junction x, z, arm, mid)`
 * leaves one out.
 */
export function crossingsOf(streets, skip = () => false) {
  const out = [];
  const zs = streets.filter((s) => s.axis === "z");
  const xs = streets.filter((s) => s.axis === "x");
  for (const Z of zs) {
    for (const X of xs) {
      const jx = Z.c;
      const jz = X.c;
      if (jz < Math.min(Z.a, Z.b) - 1 || jz > Math.max(Z.a, Z.b) + 1 || jx < Math.min(X.a, X.b) - 1 || jx > Math.max(X.a, X.b) + 1) continue;
      for (const [arm, ax, az] of [["n", 0, -1], ["s", 0, 1], ["e", 1, 0], ["w", -1, 0]]) {
        const S = ax ? X : Z;
        const way = ax || az;
        const edge = ax ? jx + ax * Z.half : jz + az * X.half;
        const v0 = edge + way * OUT;
        const v1 = v0 + way * ZEBRA;
        if (Math.max(v0, v1) > Math.max(S.a, S.b) - 0.5 || Math.min(v0, v1) < Math.min(S.a, S.b) + 0.5) continue;
        const mid = (v0 + v1) / 2;
        const across = S.half + KERB_W + IN;
        const a = ax ? [mid, S.c - across] : [S.c - across, mid];
        const b = ax ? [mid, S.c + across] : [S.c + across, mid];
        if (skip(jx, jz, arm, ax ? [mid, S.c] : [S.c, mid])) continue;
        out.push({ jx, jz, arm, a, b, along: ax ? [1, 0] : [0, 1], kerb: KERB_W + IN, half: S.half });
      }
    }
  }
  return out;
}

/**
 * The crossers' own clock: each frame, `step(t, traffic, data, stride, put)`
 * moves whoever is due from waiting to crossing or back, writes their floats
 * into `data` and calls `put(index)` for each one it changed. `list`: one
 * entry a crosser (index into everyone, the crossing, which end they start
 * at, their pace, the seconds they wait at least, a seed for that), as
 * crowd.js's populate() made them. `row`: the lane row of the crossers' own
 * straight line (no offsets, room to either side).
 */
export function createCrossers(list, row, PAVE_Y) {
  // What the traffic said about each crossing, and when.
  const asked = new Map();
  const ask = (traffic, c, t) => {
    const key = `${c.jx},${c.jz},${c.arm}`;
    let a = asked.get(key);
    if (!a || Math.abs(t - a.t) > 0.3) {
      const mid = [(c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2];
      const w = traffic.walk(c.jx, c.jz, c.arm) ?? { walk: false, left: 1e3 };
      // (The traffic's clock and the crowd's run apart: what is left is
      // counted from now on the crowd's.)
      a = { t, walk: w.walk, until: t + w.left, mid };
      asked.set(key, a);
    }
    return a;
  };
  // Each crossing's box, if it has lights, from the traffic it was asked of.
  const signs = new Map();
  let signed = null;
  const sign = (traffic, c) => {
    if (traffic !== signed) {
      signs.clear();
      signed = traffic;
    }
    const key = `${c.jx},${c.jz},${c.arm}`;
    if (!signs.has(key)) signs.set(key, traffic.sign?.(c.jx, c.jz, c.arm) ?? null);
    return signs.get(key);
  };
  const rnd = (seed, k) => {
    const x = Math.sin(seed * 91.17 + k * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  for (const p of list) {
    p.state = 0;
    p.until = 0;
    p.from = p.end ? p.c.b : p.c.a;
    p.n = 0;
  }
  // Waiting: stood at their end, facing the road; crossing: a walker on a
  // straight line from LEAD metres behind their end.
  const stand = (p, data, stride) => {
    const o = p.i * stride;
    const [x, z] = p.from;
    const to = p.from === p.c.a ? p.c.b : p.c.a;
    const dx = to[0] - x;
    const dz = to[1] - z;
    const l = Math.hypot(dx, dz);
    data[o] = x + p.jitter * p.c.along[0];
    data[o + 1] = z + p.jitter * p.c.along[1];
    data[o + 2] = p.manner;
    data[o + 3] = p.turn;
    data[o + 4] = dx / l;
    data[o + 5] = dz / l;
    data[o + 6] = 1;
    data[o + 7] = 0;
    data[o + 10] = 0;
    data[o + 11] = PAVE_Y;
  };
  const walk = (p, data, stride, t) => {
    const o = p.i * stride;
    const [x, z] = p.from;
    const to = p.from === p.c.a ? p.c.b : p.c.a;
    const dx = to[0] - x;
    const dz = to[1] - z;
    const l = Math.hypot(dx, dz);
    const ux = dx / l;
    const uz = dz / l;
    data[o] = x + p.jitter * p.c.along[0] - ux * LEAD;
    data[o + 1] = z + p.jitter * p.c.along[1] - uz * LEAD;
    data[o + 2] = p.pace;
    // The step's whole part says no drift beyond the least.
    data[o + 3] = p.step;
    data[o + 4] = ux;
    data[o + 5] = uz;
    data[o + 6] = l + 2 * LEAD;
    // Where along it they are now: LEAD, the kerb's end of it.
    data[o + 7] = LEAD - (p.pace * t + 0.3 * Math.sin(t * 0.21 + ((p.step * 2) % 1) * 6.2832));
    data[o + 10] = -(row + 1);
    data[o + 11] = PAVE_Y;
    p.len = l;
  };
  // How far along their line they are (0 at their kerb's end).
  const along = (p, data, stride, t) => {
    const o = p.i * stride;
    return data[o + 7] + p.pace * t + 0.3 * Math.sin(t * 0.21 + ((p.step * 2) % 1) * 6.2832) - LEAD;
  };
  return {
    /** Set everyone at their end, waiting, at second t. */
    start(t, data, stride) {
      for (const p of list) {
        p.until = t + p.wait * rnd(p.seed, 1);
        stand(p, data, stride);
      }
    },
    step(t, traffic, data, stride, put) {
      for (const p of list) {
        const o = p.i * stride;
        if (p.state === 0) {
          // The clock went back (the braindance rewinds): wait from now.
          if (t < p.since) p.until = Math.min(p.until, t + p.wait);
          p.since = t;
          if (t < p.until || !traffic) continue;
          // (Asked now, not kept: the box shows it on the traffic's clock.)
          const shows = sign(traffic, p.c);
          if (shows && !shows()) continue;
          const a = ask(traffic, p.c, t);
          const need = (2 * (p.c.half + p.c.kerb)) / p.pace + 1.5;
          if (!a.walk || a.until - t < need) continue;
          p.state = 1;
          walk(p, data, stride, t);
          put(p.i);
        } else {
          const s = along(p, data, stride, t);
          // Down off the kerb onto the road and up again on the far side.
          const road = s > p.c.kerb && s < p.len - p.c.kerb ? 0 : PAVE_Y;
          if (s < -1 || t < p.since) {
            // The clock went back past their start: they are at their end again.
            p.state = 0;
            p.since = t;
            p.until = t + p.wait;
            stand(p, data, stride);
            put(p.i);
          } else if (s >= p.len) {
            // Over: they wait on this side a while, and cross back.
            p.state = 0;
            p.from = p.from === p.c.a ? p.c.b : p.c.a;
            p.n++;
            p.since = t;
            p.until = t + p.wait * (0.4 + rnd(p.seed, p.n + 2));
            stand(p, data, stride);
            put(p.i);
          } else if (data[o + 11] !== road) {
            data[o + 11] = road;
            put(p.i);
          }
          p.since = Math.max(p.since, t - 1e-3);
        }
      }
    },
    /** Dev: each crosser's state (0 waiting, 1 crossing) and crossing. */
    state: () => list.map((p) => ({ i: p.i, state: p.state, arm: `${p.c.jx},${p.c.jz},${p.c.arm}`, from: p.from, until: +(p.until ?? 0).toFixed(1) })),
  };
}
