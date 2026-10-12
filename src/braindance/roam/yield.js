// src/braindance/roam/yield.js: the traffic and the player, to each other.
//
// The city's cars run to a timetable (src/world/traffic-net.js): where each
// one is at any second is looked up, which is what lets the recording run
// them backwards. Free roam puts something in the road no timetable knew
// of. So here every moving car looks down its own line a couple of dozen
// metres, and when the S4 or the player on foot is in it (or a car already
// held up, or for a held-up car anything at all) it brakes for them: it is
// made late, by as many seconds as it has to lose, and its place is its
// timetable's that many seconds ago. Nothing is in its way any more and it
// makes the time up, a quarter faster than its table and by standing less
// at the next red light, until it is on time again and is the recording's
// car once more. A late car has no slot at the lights, so it reads them
// for itself: it crosses a stop line only on a green with time left to
// clear the box.
//
// And the other way: every car near the player, moving or parked, is a box
// the S4's circles and the walker's are pushed out of, as the map pushes
// them out of a wall (nav.js `resolve`).
//
// traffic.js gives the cars (`cars()`); this sets `late` and `held` on the
// ones it holds up, and nothing else of theirs. On the way back to the
// recording every car is put on time.
import * as THREE from "three";

const SPACING = 2; // metres between the places a car looks at down its line
const LOOKS = 14;
const FAR = 44; // further off than this and a thing is not looked for
const HARD = 7; // m/s2 a car brakes at for what is in its way
const EASY = 3.5; // and for a red light
const FLANK = 0.35; // what a car leaves between its flank and a thing it passes
const STAND = 4.4; // something this near along its line, and it stands
const CATCH = 1.25; // how fast a late car goes after its timetable
const WAITED = 6; // and how fast its waits at lights are used up
const LEFT = 6; // seconds of green a late car needs left to cross
const TOUCH = 16; // cars within this of the player are solid to them

const wrap = (x, m) => ((x % m) + m) % m;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// The S4's three big circles, as vehicle.js has them: metres along its nose.
const S4 = [1.42, 0, -1.42];
// How fast a car heading (fx, fz) may go with something `k` looks down its
// line that is itself going (vx, vz): what it can lose before it is there.
const cap = (allow, fx, fz, k, vx, vz) => {
  const along = Math.max(0, vx * fx + vz * fz);
  return Math.min(allow, Math.sqrt(along * along + 2 * HARD * Math.max(0, k * SPACING - STAND)));
};

export function createYield(traffic) {
  const given = traffic?.cars?.();
  if (!given) return null;
  const { slots, net, onPath, time } = given;
  const green = net.cycle / 2 - 1;

  const movers = [];
  const parked = [];
  for (const x of slots) {
    const b = x.lamps.box;
    const hl = Math.max(b.max.z, -b.min.z);
    const hw = Math.max(b.max.x, -b.min.x);
    if (x.parked) parked.push({ x: x.at.x, y: 0, z: x.at.z, fx: Math.sin(x.parked.yaw), fz: Math.cos(x.parked.yaw), hl, hw });
    else movers.push({ slot: x, x: 0, y: 0, z: 0, fx: 0, fz: 1, hl, hw, late: 0, rate: 1, v: 0, u: 0, lead: 0, lane: 0, there: true, solid: false, behind: false });
  }
  // The S4 where it stands while the player is on foot.
  const own = { x: 0, y: 0, z: 0, fx: 0, fz: 1, hl: 2.36, hw: 0.92 };

  const w = { v: 0, lead: 0, u: 0, lane: 0 };
  const pose = { x: 0, z: 0, fx: 0, fz: 1, brake: 0 };
  const pt = [0, 0];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();

  /** Where a car is at its own second of the clock. */
  const locate = (m, clock) => {
    const x = m.slot;
    const at = clock - m.late;
    if (x.car) {
      net.where(x.car, at, w);
      m.u = w.u;
      m.lead = w.lead;
      m.lane = w.lane;
      m.v = w.v;
      net.place(x.car, at, pose);
      m.x = pose.x;
      m.z = pose.z;
      m.fx = pose.fx;
      m.fz = pose.fz;
      return;
    }
    const { P, phase } = x.path;
    const t = wrap(phase + (at * P.v) / P.len, 1);
    m.u = t * P.len;
    m.v = P.v;
    onPath(P, m.u - 1.35, a);
    onPath(P, m.u + 1.35, b);
    m.x = (a.x + b.x) / 2;
    m.y = (a.y + b.y) / 2;
    m.z = (a.z + b.z) / 2;
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    m.fx = (b.x - a.x) / len;
    m.fz = (b.z - a.z) / len;
    // (It comes and goes at its line's ends through a dither: there for
    // the player once it is mostly drawn.)
    m.there = Math.min(t, 1 - t) * P.len > 3;
  };
  // The places a car looks at: `s` metres on down its line.
  const lx = new Float32Array(LOOKS);
  const ly = new Float32Array(LOOKS);
  const lz = new Float32Array(LOOKS);
  const lookDown = (m) => {
    const x = m.slot;
    for (let k = 0; k < LOOKS; k++) {
      if (x.car) {
        net.point(x.car.route, m.lane, wrap(m.u + k * SPACING, x.car.route.length), pt);
        lx[k] = pt[0];
        ly[k] = 0;
        lz[k] = pt[1];
      } else {
        onPath(x.path.P, m.u + k * SPACING, a);
        lx[k] = a.x;
        ly[k] = a.y;
        lz[k] = a.z;
      }
    }
  };
  // What is in the road: circles, each with how fast it is going.
  const things = [];
  let nThings = 0;
  const thing = (x, y, z, r, vx, vz) => {
    const t = things[nThings] ?? (things[nThings] = { x: 0, y: 0, z: 0, r: 0, vx: 0, vz: 0 });
    nThings++;
    t.x = x;
    t.y = y;
    t.z = z;
    t.r = r;
    t.vx = vx;
    t.vz = vz;
  };
  // The first of its looks a circle is in the way of a car `half` wide at,
  // or -1.
  const meets = (x, y, z, r, half) => {
    const reach = (r + half + FLANK) * (r + half + FLANK);
    for (let k = 0; k < LOOKS; k++) {
      if (Math.abs(ly[k] - y) > 2.5) continue;
      const dx = lx[k] - x;
      const dz = lz[k] - z;
      if (dx * dx + dz * dz < reach) return k;
    }
    return -1;
  };

  // Who the player touches this frame.
  const bodies = [];
  const lates = [];
  const stats = { late: 0, held: 0, most: 0 };

  /**
   * One frame. `player`: where the S4 is (car: x, y, z, heading), whether
   * the player is out of it (afoot, and then x, y, z are the walker's),
   * and the ground velocity of whichever the player is (vx, vz).
   */
  const frame = (dt, player) => {
    const clock = time();
    const car = player.car;
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    nThings = 0;
    for (const d of S4) thing(car.x + fx * d, car.y, car.z + fz * d, 0.95, player.afoot ? 0 : player.vx, player.afoot ? 0 : player.vz);
    if (player.afoot) thing(player.x, player.y, player.z, 0.35, player.vx, player.vz);
    const px = player.afoot ? player.x : car.x;
    const pz = player.afoot ? player.z : car.z;

    bodies.length = 0;
    lates.length = 0;
    for (const m of movers) {
      locate(m, clock);
      m.behind = m.late > 0.05 || m.rate < 0.99;
      if (m.behind) lates.push(m);
      // A car is solid to the player from the first moment it is there and
      // clear of him: one that comes onto its line where he already is (the
      // deck's cars come and go at the ramp's foot and the deck's end), or
      // that he is set down in, waits as a ghost and never shoves him.
      if (!m.there) m.solid = false;
      else if (!m.solid && Math.abs(m.x - px) < TOUCH && Math.abs(m.z - pz) < TOUCH) {
        let apart = true;
        for (let n = 0; n < nThings && apart; n++) apart = Math.abs(things[n].y - m.y) > 2 || !clear(m, things[n].x, things[n].z, things[n].r + 0.3);
        m.solid = apart;
      } else m.solid = true;
      if (m.solid && Math.abs(m.x - px) < TOUCH && Math.abs(m.z - pz) < TOUCH) bodies.push(m);
    }
    for (const c of parked) if (Math.abs(c.x - px) < TOUCH && Math.abs(c.z - pz) < TOUCH) bodies.push(c);
    if (player.afoot) {
      own.x = car.x;
      own.y = car.y;
      own.z = car.z;
      own.fx = fx;
      own.fz = fz;
      bodies.push(own);
    }
    stats.late = lates.length;
    stats.held = 0;
    stats.most = 0;
    if (dt <= 0) return;

    for (const m of movers) {
      const x = m.slot;
      // Is there anything it could meet? The player's, and whoever is late
      // (for a late car, everyone).
      const nearPlayer = (Math.abs(m.x - car.x) < FAR && Math.abs(m.z - car.z) < FAR) || (Math.abs(m.x - px) < FAR && Math.abs(m.z - pz) < FAR);
      const others = m.behind ? movers : lates;
      if (!nearPlayer && !m.behind && !lates.length) continue;
      let looked = false;
      // How fast it may go for what is in its way.
      let allow = Infinity;
      if (nearPlayer) {
        lookDown(m);
        looked = true;
        for (let n = 0; n < nThings; n++) {
          const t = things[n];
          const k = meets(t.x, t.y, t.z, t.r, m.hw);
          // (A ghost stands until the player is well clear of it.)
          if (k >= 0) allow = !m.solid && k <= 2 ? 0 : cap(allow, m.fx, m.fz, k, t.vx, t.vz);
        }
      }
      for (const o of others) {
        if (o === m || !o.there || Math.abs(o.x - m.x) > FAR || Math.abs(o.z - m.z) > FAR) continue;
        if (!looked) {
          lookDown(m);
          looked = true;
        }
        // (Not the one beside or behind it: only what its nose is coming to.)
        const k = meets(o.x, o.y, o.z, 0.9, m.hw);
        if (k < 1) continue;
        const speed = o.v * Math.min(1, o.rate);
        allow = cap(allow, m.fx, m.fz, k, o.fx * speed, o.fz * speed);
      }
      const vt = m.v;
      // A late car and the lights: no line crossed but on a green with time
      // to clear the box, unless it is too near to stop.
      if (x.car && m.late > 0.3 && vt >= 0.05) {
        const r = x.car.route;
        const going = vt * m.rate;
        for (const s of r.stops) {
          const gap = wrap(s.u - m.lead, r.length);
          if (gap > 30) continue;
          const into = wrap(clock - s.green, net.cycle);
          if (into > 0.6 && into < green - LEFT) continue;
          if ((going * going) / (2 * HARD) > gap + 0.3) continue;
          allow = Math.min(allow, Math.sqrt(2 * EASY * gap));
        }
      }
      // What that makes of its clock: how many of its own seconds go by in
      // one of the city's. It stops as hard as it must and pulls away
      // gently.
      const want = vt < 0.05 ? (m.late > 0 ? WAITED : 1) : Math.min(m.late > 0.05 ? CATCH : 1, allow / vt);
      m.rate = want < m.rate ? want : Math.min(want, m.rate + dt * 0.45);
      m.late = Math.max(0, m.late + dt * (1 - m.rate));
      if (m.late === 0 && m.rate > 1) m.rate = 1;
      x.late = m.late;
      x.held = vt > 0.3 && m.rate < 0.9 ? 1 : 0;
      stats.held += x.held;
      if (m.late > stats.most) stats.most = m.late;
    }
  };

  // A circle and a car's box, in the box's own frame: how far the circle
  // has to move to be clear, into `out` (x, z); false if it is clear.
  const out = { x: 0, z: 0 };
  const clear = (body, x, z, r) => {
    const dx = x - body.x;
    const dz = z - body.z;
    const along = dx * body.fx + dz * body.fz;
    const across = dz * body.fx - dx * body.fz;
    const ol = along - clamp(along, -body.hl, body.hl);
    const os = across - clamp(across, -body.hw, body.hw);
    const d2 = ol * ol + os * os;
    if (d2 >= r * r) return false;
    let nl = 0;
    let ns = 0;
    let depth = 0;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      nl = ol / d;
      ns = os / d;
      depth = r - d;
    } else {
      // Its middle is in the car: out by the nearer side.
      const toEnd = body.hl - Math.abs(along);
      const toSide = body.hw - Math.abs(across);
      if (toSide < toEnd) {
        ns = across < 0 ? -1 : 1;
        depth = r + toSide;
      } else {
        nl = along < 0 ? -1 : 1;
        depth = r + toEnd;
      }
    }
    out.x = (nl * body.fx - ns * body.fz) * depth;
    out.z = (nl * body.fz + ns * body.fx) * depth;
    return true;
  };

  return {
    frame,
    stats,
    /** Move the circle at p (radius r, standing at height y) out of every
     *  car it is in (`self`: one of the S4's own, not out of the S4). True
     *  if it was in one (p.nx, p.nz is the way out). */
    push(p, r, y, self = false) {
      let hit = false;
      for (const body of bodies) {
        if ((self && body === own) || Math.abs(body.y - y) > 2 || !clear(body, p.x, p.z, r)) continue;
        const depth = Math.hypot(out.x, out.z) || 1;
        p.x += out.x;
        p.z += out.z;
        p.nx = out.x / depth;
        p.nz = out.z / depth;
        hit = true;
      }
      return hit;
    },
    /** Whether a circle at (x, z), radius r, height y, is in a car: any
     *  car there is (where the player is about to be put, not where he is). */
    overlaps(x, z, r, y) {
      for (const all of [movers, parked]) for (const body of all) if (Math.abs(body.x - x) < 6 && Math.abs(body.z - z) < 6 && Math.abs(body.y - y) <= 2 && body.there !== false && clear(body, x, z, r)) return true;
      return false;
    },
    /** Every car on time again (the recording's cars). */
    reset() {
      for (const m of movers) {
        m.late = 0;
        m.rate = 1;
        m.solid = false;
        m.slot.late = 0;
        m.slot.held = 0;
      }
      bodies.length = 0;
    },
  };
}
