// src/world/traffic-net.js: the streets' traffic as a timetable.
//
// The cars on the network do not wander: every one of them is on a line, as
// a bus is. The streets (the builder's plan, scripts/blender/ncw/plan.py)
// are cut at their junctions into runs, one each way; at every junction each
// way in is given one way out (right at most of them, straight on at the
// big crossings, round and back at a dead end), so the runs fall into closed
// routes that between them cover every street both ways. Every junction's
// lights give the north-south street half a cycle and the east-west one the
// other half; with every movement straight on or a right turn, nothing that
// moves in a junction crosses anything else that does.
//
// A route's cars go round in platoons, one a cycle. The first car's place
// along the route is worked out once (pull away, cruise, slow for a turn,
// brake to the stop line, wait for the green, or run through one that is
// already green) from one stop line round to the same one, so it comes back
// to it after a whole number of cycles: the timetable repeats exactly, and
// where a car is at any second of the clock is a matter of looking it up.
// The braindance can run that clock backwards. The car behind is the same
// timetable a moment later and a car's length back; where a street has two
// lanes every other car takes the inner one.
//
// No three.js in here: places come out as plain numbers.

// The plan: name, axis, centre line, from, to, half carriageway, the lanes'
// offsets from the centre line (kerb lane first), the parking bay; then what
// differs on a street: `back`, the lanes of the cars going the other way
// (toward the lower coordinate); `shape`, where its one lane changes its
// offset along the street; `kerb`, cars parked in the kerb lane (how far out
// from the centre line, over which stretch if not all of it, and, where
// they stand nose to the kerb at an angle, the angle and how far apart);
// `speed`, where a street is driven faster than the rest.
//
// A street with no bay of its own is driven in its inner lane and parked
// along its kerb lane, as a city's streets are at night, so no stretch of
// the loop is ever bare road. The megabuilding street's east end is a court
// a car turns round in, so there it keeps to the kerb lane's wide circle.
// The west street's middle lanes are the deck's ramp from z -228 to -68:
// its cars move over to the service lanes before the ramp's foot and stay
// there. North of the ramp it is the widest street there is, twenty metres
// kerb to kerb, and its kerbs are parked nose in at an angle, as a market
// street's are, so it is not a bare field of tarmac. The S4 has a road of its own (road_spline: the avenue's east bay,
// the middle of the plaza street, the x 120 road's and the garage street's
// centre lines, the boulevard's inner eastbound lane) and stops on it for
// the page's shots, so the lanes here keep off that line: the plaza
// street's further from its middle, the x 120 road's a little out, the
// boulevard's eastbound in its kerb lane.
const STREETS = [
  ["avenue", "z", 0, -720, 88, 10, [5.55, 1.85], 2.6],
  ["megabuilding", "x", -720, -80, 60, 8, [6], 0, { shape: [[-10, 2], [10, 6]], kerb: { offset: 6.55, from: -80, to: 0 } }],
  ["west", "z", -80, -720, 1, 10, [7.5], 0, { shape: [[-254, 2.5], [-236, 7.5]], kerb: { offset: 7.05, from: -720, to: -262, angle: 0.87, pitch: 3.3 } }],
  ["plaza", "x", -179, -80, 440, 7, [3.2], 2.4],
  ["south", "x", 1, -80, 440, 7, [1.75], 0, { kerb: { offset: 5.55 } }],
  ["x120", "z", 120, -330, 1, 8, [2.5], 0, { kerb: { offset: 6.55 } }],
  ["boulevard", "x", -330, 120, 440, 9, [6.75], 0, { back: [2.25], kerb: { offset: 7.55, dir: -1 }, speed: 15 }],
  ["garage", "z", 440, -330, 1, 8, [2.8], 2.4],
].map(([name, axis, c, a, b, half, offsets, bay, more = {}]) => ({ name, axis, c, a, b, half, offsets, bay, ...more }));

// Which way the cars at a junction mostly go ("x,z" of its centre): straight
// on at the avenue's and the x 120 road's crossings with the plaza street,
// right everywhere else. At the hero's own junction (0, 1) the lens lies in
// the south mouth, 0.6 m off the road: four right turns keep to the corners.
const PREFER = { "0,-179": "S", "120,-179": "S" };

// One light is not left to the draw. The braindance's recording runs the
// city's clock as its own (src/braindance/engine.js: second 102 of the
// recording is second 102 here), and from 102 to 117 its chase camera rides
// the boulevard's south kerb beside the S4, looking across the kerb lane at
// Corpo Row's clues; a platoon in that lane then stands between the lens
// and what the viewer is meant to find. The lights' cycle is 40 s, so that
// is seconds 22 to 37 of every cycle. The platoon that turns onto the
// boulevard comes up the x 120 road to junction E: its line there is given
// a light of its own, green at GATE of each cycle, and that line is the
// route's anchor, so its first car always leaves it at that second. With
// the boulevard driven at 15 m/s the platoon's last car is past x 320
// before second 22 and its first does not come round the corner again
// until after 37 (tools/bdlane.mjs counts it). Changing the cycle, the
// boulevard's speed or the platoon's size moves this: run the tool.
const GATE = { key: "120,-330", heading: [0, -1], green: 33.6 };

const CRUISE = 11.5;
const TURN = 6.5;
const ROUND = 4.2;
const ACCEL = 2.0;
const BRAKE = 2.8;
const STEP = 1;
const TICK = 0.25;
// A car's middle stops this far short of the junction's square: its nose at
// the stop line the builder paints 9 m out.
const STOP = 11.6;
// A dead end is turned round in this far short of it.
const DEAD = 14;
// Parked cars: the first stands this far from a junction's square (clear of
// the crossing and the stop line the builder paints, a long car's half
// length more), one every PITCH metres of kerb lane.
const PARK_FROM = 13;
const PITCH = 6.4;

/** Seeded draws, so the same city has the same traffic on every load. */
function draws(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** The runs between junctions, one each way, and what meets where. */
function runs() {
  const meets = (s, t) => {
    if (s.axis === t.axis) return null;
    const zs = s.axis === "z" ? s : t;
    const xs = s.axis === "z" ? t : s;
    return zs.a - 1e-6 <= xs.c && xs.c <= zs.b + 1e-6 && xs.a - 1e-6 <= zs.c && zs.c <= xs.b + 1e-6 ? [zs.c, xs.c] : null;
  };
  const junctions = new Map();
  const segs = [];
  for (const s of STREETS) {
    const nodes = [];
    for (const t of STREETS) {
      const p = meets(s, t);
      if (p) nodes.push({ v: s.axis === "z" ? p[1] : p[0], box: t.half, key: `${p[0]},${p[1]}` });
    }
    nodes.sort((p, q) => p.v - q.v);
    if (nodes[0].v > s.a + 1) nodes.unshift({ v: s.a, dead: true, key: `${s.name}:a` });
    if (nodes[nodes.length - 1].v < s.b - 1) nodes.push({ v: s.b, dead: true, key: `${s.name}:b` });
    for (let i = 0; i + 1 < nodes.length; i++) {
      const lo = nodes[i];
      const hi = nodes[i + 1];
      const from = lo.v + (lo.dead ? DEAD : lo.box);
      const to = hi.v - (hi.dead ? DEAD : hi.box);
      for (const dir of [1, -1]) {
        const lanes = dir < 0 && s.back ? s.back : s.offsets;
        const offsets = lo.dead || hi.dead ? [lanes[0]] : lanes;
        const seg = { street: s, dir, start: dir > 0 ? from : to, end: dir > 0 ? to : from, into: dir > 0 ? hi : lo, out: dir > 0 ? lo : hi, offsets, heading: s.axis === "z" ? [0, dir] : [dir, 0] };
        segs.push(seg);
      }
    }
  }
  for (const seg of segs) {
    for (const [node, list] of [[seg.into, "ins"], [seg.out, "outs"]]) {
      if (!junctions.has(node.key)) junctions.set(node.key, { key: node.key, dead: !!node.dead, ins: [], outs: [] });
      junctions.get(node.key)[list].push(seg);
    }
  }
  return { segs, junctions };
}

/** How a car arriving one way leaves another: S, R, L, or U (round). */
function movement(a, b) {
  const dot = a.heading[0] * b.heading[0] + a.heading[1] * b.heading[1];
  if (dot > 0.5) return "S";
  if (dot < -0.5) return "U";
  return a.heading[0] * b.heading[1] - a.heading[1] * b.heading[0] > 0 ? "R" : "L";
}

/** One way out for each way in at every junction: of all the pairings with
 *  nobody turning back, the one with the most of the junction's preferred
 *  movement. */
function pairings(junctions, gate) {
  for (const j of junctions.values()) {
    const want = PREFER[j.key] ?? "R";
    let best = null;
    let bestScore = -1;
    const used = new Array(j.outs.length).fill(false);
    const pick = [];
    const search = (i, score) => {
      if (i === j.ins.length) {
        if (score > bestScore) {
          bestScore = score;
          best = pick.slice();
        }
        return;
      }
      for (let o = 0; o < j.outs.length; o++) {
        if (used[o]) continue;
        const m = movement(j.ins[i], j.outs[o]);
        if (m === "U" && !j.dead) continue;
        used[o] = true;
        pick[i] = o;
        search(i + 1, score + (m === want ? 1 : 0));
        used[o] = false;
      }
    };
    search(0, 0);
    j.ins.forEach((seg, i) => {
      seg.next = j.outs[best[i]];
      seg.move = movement(seg, seg.next);
      // The lights: only where three or more streets meet, and the gate.
      seg.lit = j.ins.length > 2 ? j : null;
      if (gate && j.key === gate.key && seg.heading[0] === gate.heading[0] && seg.heading[1] === gate.heading[1]) {
        seg.lit = j;
        seg.gate = gate.green;
      }
    });
  }
}

/** A point on a run's lane: `along` its axis, `offset` to the right. */
function onLane(seg, along, offset) {
  return seg.street.axis === "z" ? [seg.street.c - seg.dir * offset, along] : [along, seg.street.c + seg.dir * offset];
}

/** How far out a shaped street's lane is at `along` its axis: its first
 *  offset before the shape's first knot, its last after the last, a
 *  straight move across between them. */
function shaped(street, along) {
  const k = street.shape;
  if (along <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (along <= k[i][0]) return k[i - 1][1] + ((k[i][1] - k[i - 1][1]) * (along - k[i - 1][0])) / (k[i][0] - k[i - 1][0]);
  return k[k.length - 1][1];
}

/** A run's line in a lane: straight from its start to its end, or through
 *  the knots of its street's shape that lie between them. */
function runLine(seg, lane) {
  const s = seg.street;
  if (!s.shape) {
    const o = seg.offsets[Math.min(lane, seg.offsets.length - 1)];
    return [onLane(seg, seg.start, o), onLane(seg, seg.end, o)];
  }
  const lo = Math.min(seg.start, seg.end);
  const hi = Math.max(seg.start, seg.end);
  const at = [seg.start, ...s.shape.map((k) => k[0]).filter((v) => v > lo + 0.5 && v < hi - 0.5).sort((p, q) => (p - q) * seg.dir), seg.end];
  return at.map((v) => onLane(seg, v, shaped(s, v)));
}

/** A line of points with its lengths. */
function line(pts) {
  const at = [0];
  for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, at, len: at[at.length - 1] };
}

/** A route's pieces in one lane (0 the kerb lane, 1 the inner where there
 *  is one): each run, then the way through the junction at its end. */
function pieces(route, lane) {
  const out = [];
  route.forEach((seg, k) => {
    const next = route[(k + 1) % route.length];
    const run = runLine(seg, lane);
    const b = run[run.length - 1];
    const c = runLine(next, lane)[0];
    const o = seg.street.shape ? shaped(seg.street, seg.end) : seg.offsets[Math.min(lane, seg.offsets.length - 1)];
    out.push({ ...line(run), seg, limit: seg.street.speed ?? CRUISE, two: seg.offsets.length > 1, run: true });
    let pts;
    if (seg.move === "U") {
      // Round and back: half a circle past the run's end.
      pts = Array.from({ length: 13 }, (_, i) => {
        const t = (i / 12) * Math.PI;
        return onLane(seg, seg.end + seg.dir * o * Math.sin(t), o * Math.cos(t));
      });
    } else if (seg.move === "S") pts = [b, c];
    else {
      // A turn: a curve from this lane to that one, round the point where
      // the two lanes' lines meet.
      const corner = seg.street.axis === "z" ? [b[0], c[1]] : [c[0], b[1]];
      pts = Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        return [0, 1].map((d) => (1 - t) * (1 - t) * b[d] + 2 * t * (1 - t) * corner[d] + t * t * c[d]);
      });
    }
    out.push({ ...line(pts), seg, limit: seg.move === "S" ? CRUISE : seg.move === "U" ? ROUND : TURN, turn: seg.move !== "S", two: false });
  });
  return out;
}

/** The first car's timetable round a route: how far along it is at every
 *  tick of one period, and the period. */
function timetable(lanes, { cycle, need, phase }) {
  const kerb = lanes[0];
  const starts = [0];
  for (const p of kerb) starts.push(starts[starts.length - 1] + p.len);
  const length = starts[starts.length - 1];
  const N = Math.round(length / STEP);
  const du = length / N;
  // The speed the road allows at each step, a platoon's length of slow road
  // after every turn so the cars behind take it no faster than the first,
  // and where the stop lines are.
  const limit = new Float32Array(N + 1).fill(CRUISE);
  const stops = [];
  kerb.forEach((p, k) => {
    if (p.run) for (let i = Math.round(starts[k] / du); i <= Math.round(starts[k + 1] / du); i++) limit[i % N] = p.limit;
  });
  limit[N] = limit[0];
  kerb.forEach((p, k) => {
    const from = Math.round(starts[k] / du);
    const to = Math.round(starts[k + 1] / du);
    if (p.turn) for (let i = from; i <= to + Math.round(need.length / du); i++) limit[i % N] = Math.min(limit[i % N], p.limit);
    // (A stop line is a run's: the way straight through a wide junction is
    // as long as a short run, and must not be given one in mid box.)
    else if (p.run && p.seg.lit && p.len > STOP + 6) {
      stops.push({ i: Math.round((starts[k + 1] - STOP) / du) % N, green: p.seg.gate ?? (phase(p.seg.lit.key) + (p.seg.heading[0] ? cycle / 2 : 0)) % cycle, gate: p.seg.gate !== undefined });
    }
  });
  // A phase's green, less a second at its end. A platoon runs a light at
  // speed only if its first car reaches the line a few seconds into the
  // green (the cross street's last cars are out of the box by then) and its
  // last is over the line before the green ends; one that has stopped at a
  // green goes only if its queue can get away in what is left. Either way
  // the longest wait and the queue's getting away fit inside one cycle, so
  // the platoon a cycle behind never comes up on this one's tail.
  const window = cycle / 2 - 1;
  const EARLY = 6;
  const into = (t, green) => (((t - green) % cycle) + cycle) % cycle;
  if (!stops.length) {
    // Nothing to stop for: round at the road's own pace.
    const table = new Float32Array(Math.ceil(length / CRUISE / TICK) + 1);
    for (let j = 0; j < table.length; j++) table[j] = Math.min(length, j * TICK * CRUISE);
    return { table, period: length / CRUISE, length, free: true };
  }
  // From one stop line (the anchor, always stopped at) round to it again.
  const lap = (anchor, held) => {
    const v = new Float32Array(N + 1);
    const at = (i) => (stops[anchor].i + i) % N;
    const stopAt = new Map(stops.map((s, k) => [(s.i - stops[anchor].i + N) % N, k]));
    for (let i = 1; i <= N; i++) {
      const k = stopAt.get(i % N);
      v[i] = i === N || (k !== undefined && held[k]) ? 0 : Math.min(limit[at(i)], Math.sqrt(v[i - 1] * v[i - 1] + 2 * ACCEL * du));
    }
    for (let i = N - 1; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * BRAKE * du));
    // The time at every step, with the waits for the lights in it.
    const t = new Float64Array(N + 1);
    const leave = new Float64Array(N + 1);
    t[0] = leave[0] = stops[anchor].green + 0.6;
    const reach = new Map();
    for (let i = 1; i <= N; i++) {
      t[i] = leave[i - 1] + (2 * du) / Math.max(0.05, v[i - 1] + v[i]);
      leave[i] = t[i];
      const k = stopAt.get(i % N);
      if (k === undefined) continue;
      reach.set(k, t[i]);
      if (i < N && !held[k]) continue;
      // Stopped at a light that has been green a moment, with time for the
      // whole platoon: a pause and on. Otherwise the next green. The anchor
      // always leaves as its green comes on, which is what closes the lap.
      const w = into(t[i], stops[k].green);
      leave[i] = i < N && w < window - need.away ? t[i] + 0.5 : t[i] + ((((stops[k].green + 0.6 - t[i]) % cycle) + cycle) % cycle);
    }
    return { v, t, leave, reach };
  };
  const solve = (anchor) => {
    // Every light held at first; then, in the order they come, let the
    // platoon run through each one it reaches green with time for its last
    // car.
    const held = stops.map(() => true);
    const order = stops.map((s, k) => k).filter((k) => k !== anchor).sort((p, q) => ((stops[p].i - stops[anchor].i + N) % N) - ((stops[q].i - stops[anchor].i + N) % N));
    for (const k of order) {
      held[k] = false;
      const w = into(lap(anchor, held).reach.get(k), stops[k].green);
      if (!(w > EARLY && w < window - need.time)) held[k] = true;
    }
    const run = lap(anchor, held);
    // Coming back to its anchor with the green still young, it would sit
    // through the rest of it and the whole red (the anchor leaves as its
    // green comes on, which is what closes the lap), and the platoon behind
    // would find it there.
    const wasted = into(run.t[N], stops[anchor].green) < window - need.time ? 1 : 0;
    return { anchor, run, wasted };
  };
  // An anchor the platoon comes back to late in the green or on the red;
  // the gate, where the route has it.
  let best = null;
  const forced = stops.findIndex((s) => s.gate);
  for (let a = 0; a < stops.length; a++) {
    if (forced >= 0 && a !== forced) continue;
    const s = solve(a);
    if (!best || s.wasted < best.wasted) best = s;
    if (!s.wasted) break;
  }
  const { run, anchor } = best;
  const t0 = run.t[0];
  const period = Math.round((run.leave[N] - t0) / cycle) * cycle;
  const table = new Float32Array(Math.round(period / TICK) + 1);
  let i = 0;
  for (let j = 0; j < table.length; j++) {
    const time = t0 + j * TICK;
    while (i < N && run.t[i + 1] <= time) i++;
    const u = i >= N || time <= run.leave[i] ? i : i + (time - run.leave[i]) / Math.max(1e-6, run.t[i + 1] - run.leave[i]);
    table[j] = Math.min(N, u) * du;
  }
  return { table, period, length, offset: stops[anchor].i * du, t0, wasted: best.wasted };
}

// The lights' phases are drawn from this. Any seed is as good a city as
// another; this one was picked (of 6,000 tried, tools/phasesearch.mjs)
// because at second 12 of the clock, where every review render holds the
// traffic, a platoon is in sight from the last metres before each corner of
// the loop, where a driver faces a wall across the junction and only
// passing cars can be in view; and because with it neither route's platoon
// comes back to its anchor early enough to be held there a whole cycle.
const PHASES = 1844;

/**
 * The network's traffic: `perPlatoon` cars to a platoon, the lights on a
 * `cycle` of seconds. Returns the cars (each with its route, for the caller
 * to dress) and `place(car, clock, out)`, which writes where the car is
 * (out.x, out.z), which way it faces (out.fx, out.fz) and whether its brake
 * lamps are lit (out.brake); and the rows of parking places along the
 * kerbs.
 */
export function createNetwork({ perPlatoon = 5, cycle = 40, headway = 0.9, seed = PHASES, gate = GATE } = {}) {
  const { segs, junctions } = runs();
  pairings(junctions, gate);
  const phases = new Map();
  const drawPhase = draws(seed);
  for (const key of [...junctions.keys()].sort()) phases.set(key, drawPhase() * cycle);
  const phase = (key) => phases.get(key);
  const seen = new Set();
  const routes = [];
  const cars = [];
  for (const first of segs) {
    if (seen.has(first)) continue;
    const route = [];
    for (let s = first; !seen.has(s); s = s.next) {
      seen.add(s);
      route.push(s);
    }
    const lanes = [pieces(route, 0), pieces(route, 1)];
    // How far back the car behind is: half a length where they are two
    // abreast, a whole one in single file; smoothed along the route.
    const starts = [0];
    for (const p of lanes[0]) starts.push(starts[starts.length - 1] + p.len);
    // How long a platoon takes over a stop line, its last car after its
    // first: at speed (`time`), and from a standing queue (`away`), in
    // single file.
    const back = (perPlatoon - 1) * 6.9;
    const need = { time: (perPlatoon - 1) * headway + back / CRUISE + 1, away: (perPlatoon - 1) * headway + Math.sqrt((2 * back) / ACCEL) + 1, length: perPlatoon * 5 };
    const tt = timetable(lanes, { cycle, need, phase });
    const cells = Math.ceil(tt.length / 4);
    const raw = new Float32Array(cells);
    lanes[0].forEach((p, k) => {
      for (let c = Math.floor(starts[k] / 4); c < Math.min(cells, Math.ceil(starts[k + 1] / 4)); c++) raw[c] = p.two ? 3.5 : 6.9;
    });
    const gap = new Float32Array(cells);
    for (let c = 0; c < cells; c++) {
      let sum = 0;
      for (let d = -6; d <= 6; d++) sum += raw[(c + d + cells) % cells];
      gap[c] = sum / 13;
    }
    const r = { lanes, starts, gap, ...tt, names: route.map((s) => `${s.street.name}${s.dir > 0 ? "+" : "-"}${s.move}`) };
    routes.push(r);
    const platoons = tt.free ? Math.max(1, Math.round(tt.period / cycle)) : Math.round(tt.period / cycle);
    for (let p = 0; p < platoons; p++) for (let i = 0; i < perPlatoon; i++) cars.push({ route: r, delay: (p * tt.period) / platoons + i * headway, index: i });
  }

  /** The point `u` metres along a route in a lane, into `out` (x, z). */
  const point = (r, lane, u, out) => {
    let lo = 0;
    let hi = r.starts.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (r.starts[mid] <= u) lo = mid;
      else hi = mid - 1;
    }
    const kerb = r.lanes[0][lo];
    const p = r.lanes[lane][lo];
    const d = ((u - r.starts[lo]) / (kerb.len || 1)) * p.len;
    let k = 1;
    while (k < p.at.length - 1 && p.at[k] < d) k++;
    const f = Math.min(1, Math.max(0, (d - p.at[k - 1]) / (p.at[k] - p.at[k - 1] || 1)));
    out[0] = p.pts[k - 1][0] + (p.pts[k][0] - p.pts[k - 1][0]) * f;
    out[1] = p.pts[k - 1][1] + (p.pts[k][1] - p.pts[k - 1][1]) * f;
  };
  const wrap = (x, m) => ((x % m) + m) % m;
  const a = [0, 0];
  const b = [0, 0];
  const place = (car, clock, out) => {
    const r = car.route;
    // (A route's table starts as its first car leaves its anchor's line, at
    // that light's own green: t0 puts every route on the one clock the
    // lights keep.)
    const time = wrap(clock - (r.t0 ?? 0) - car.delay, r.period) / TICK;
    const j = Math.min(r.table.length - 2, Math.floor(time));
    const lead = r.table[j] + (r.table[j + 1] - r.table[j]) * (time - j);
    const speed = (r.table[j + 1] - r.table[j]) / TICK;
    const later = (r.table[Math.min(r.table.length - 1, j + 2)] - r.table[Math.min(r.table.length - 2, j + 1)]) / TICK;
    const along = wrap(lead + (r.offset ?? 0), r.length);
    const u = wrap(along - car.index * r.gap[Math.min(r.gap.length - 1, Math.floor(along / 4))], r.length);
    const lane = car.index % 2;
    point(r, lane, wrap(u - 1.3, r.length), a);
    point(r, lane, wrap(u + 1.3, r.length), b);
    out.x = (a[0] + b[0]) / 2;
    out.z = (a[1] + b[1]) / 2;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    out.fx = (b[0] - a[0]) / d;
    out.fz = (b[1] - a[1]) / d;
    out.brake = speed < 0.3 || later < speed - 0.2 ? 1 : 0;
    return out;
  };

  // Parking: the rows of places along each run's right-hand kerb, in the
  // order a car passing them meets them: a street's bay where it has one,
  // its kerb lane where it is parked in. Each place has where it is and the
  // way a car parked in it faces.
  const rows = [];
  for (const seg of segs) {
    const s = seg.street;
    const lo = Math.min(seg.start, seg.end);
    const hi = Math.max(seg.start, seg.end);
    let from = lo + PARK_FROM;
    let to = hi - PARK_FROM;
    // A bay's cars stand a hand's width in from the kerb, clear of the
    // planters and posts that stand on its edge.
    let o = s.half - s.bay / 2 - 0.2;
    if (!s.bay) {
      const k = s.kerb;
      if (!k || (k.dir && k.dir !== seg.dir)) continue;
      o = k.offset;
      from = Math.max(from, (k.from ?? -1e9) + PARK_FROM);
      to = Math.min(to, k.to ?? 1e9);
    }
    const pitch = (!s.bay && s.kerb.pitch) || PITCH;
    const n = Math.floor((to - from) / pitch);
    if (n < 0) continue;
    // Along the kerb, or nose in toward it (the kerb is on the right).
    const yaw = Math.atan2(seg.heading[0], seg.heading[1]) - ((!s.bay && s.kerb.angle) || 0);
    const places = [];
    for (let i = 0; i <= n; i++) {
      const p = onLane(seg, seg.dir > 0 ? from + i * pitch : to - i * pitch, o);
      places.push({ x: p[0], z: p[1], yaw });
    }
    rows.push({ street: s.name, bay: s.bay > 0, angled: !s.bay && !!s.kerb.angle, dir: seg.dir, places });
  }
  return { routes, cars, place, rows, cycle, streets: STREETS };
}
