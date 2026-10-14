// src/world/signals.js: the signal heads showing the lights the traffic
// keeps.
//
// A signal's head (scripts/blender/ncw/props.py: traffic_light on its mast,
// traffic_light_post at the hero's junction) has three lenses toward the
// traffic it stops, red over amber over green, each its colour on its
// vertices in the kit's glow. Their few vertices in the whole city are
// written out with the other small glow parts into one mesh
// (src/world/props.js), so a head's lenses are a dozen vertices of that
// mesh's colours: when its lights change (src/world/traffic-net.js: the
// timetable's own, for the junction it stands at and the way in it faces),
// the lit lens is put back to its colour and the others to dark glass, and
// only those vertices go up again. Nothing is drawn that was not drawn.
//
// A crossing's signal box (props.py signal_box) at a junction with lights
// shows the same: its walking figure while the traffic over its crossing is
// held, a hand while it goes, the hand flashing for the red's last seconds.
// Its face is drawn instanced, and what it shows is its own instance's deal
// (src/world/prop-surfaces.js), set only when that changes: the bars over
// the figure count the walk down to the hand. Whoever crosses there in the
// crowd (src/world/crowd-cross.js) steps off only while it shows the figure.
import * as THREE from "three";
import { NEON } from "./materials.js";

const HEADS = ["traffic_light", "traffic_light_post"];
// An unlit lens: dark glass with a trace of its colour (as props.py has the
// amber and the green: any more, and the glow's gain lights it).
const DARK = 0.008;
const BOX = "signal_box";
// A crossing, metres past the junction square's edge (streets.py
// _crossing): a box is the one by it at the kerb (streets.py furniture: at
// its near edge, or a district's a little past its far one).
const CROSSING = [4.6 - 1.5, 8.0 + 1.5];
const KERB = 1.5;
// The hand flashes for the red's last FLASH seconds, once a second.
const FLASH = 5;
// A box's deal for the hand dark (as it flashes) and the hand; for the
// figure, minus the share of its BARS lit (a box left as built has 0: the
// figure, its bars as its seed has them).
const OFF = 0.25;
const HAND = 0.5;
const BARS = 6;

/** `props`: the city's (src/world/props.js); `net`: the traffic's network.
 *  Returns { update(clock), crossing(x, z, arm), lenses(), boxes() } or
 *  null if there are no heads and no boxes. */
export function createSignals(props, net) {
  const lit = ["red", "amber", "green"].map((name) => new THREE.Color(NEON[name]));
  let heads = [];
  // Each head, from its mesh's part: its lenses face the prototype's +x, so
  // its traffic heads the other way; which lens each vertex is, by its
  // height in the head (0 red, the top third, 1 amber, 2 green).
  const read = () => {
    heads = [];
    for (const name of HEADS) {
      for (const { mesh, geometry, src, matrices, at } of props.written(name)) {
        if (src.material.name !== "glow") continue;
        const pos = src.geometry.attributes.position;
        let lo = Infinity;
        let hi = -Infinity;
        for (let k = 0; k < pos.count; k++) {
          lo = Math.min(lo, pos.getY(k));
          hi = Math.max(hi, pos.getY(k));
        }
        const lens = Uint8Array.from({ length: pos.count }, (_, k) => 2 - Math.min(2, Math.floor((3 * (pos.getY(k) - lo)) / (hi - lo || 1))));
        for (let j = 0; j < at.length; j++) {
          const o = j * 16;
          const f = Math.hypot(matrices[o], matrices[o + 2]) || 1;
          const hx = -matrices[o] / f;
          const hz = -matrices[o + 2] / f;
          const shows = net.light(matrices[o + 12], matrices[o + 14], hx, hz);
          if (shows) heads.push({ mesh, geometry, at: at[j], lens, shows, shown: -1, x: matrices[o + 12], z: matrices[o + 14], hx, hz });
        }
      }
    }
  };
  read();
  // Each box at a junction where some way in has its lights, with the way
  // in over its crossing: the street it stands at the kerb of, on the arm
  // it stands on. (Away from those, a box is left as it was built.)
  const boxes = [];
  const dealt = props.dealt(BOX);
  const held = (shows) => !!shows && Array.from({ length: net.cycle }, (_, t) => shows(t)).includes(0);
  const lights = (jx, jz) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([hx, hz]) => held(net.light(jx, jz, hx, hz)));
  // What a box over a crossing whose traffic shows `shows` shows at second
  // `clock`: the hand while it goes, flashing for the red's last seconds,
  // and before that the figure, its bars the walk's share left.
  const dealOf = (shows, clock) => {
    if (shows(clock) !== 0) return HAND;
    if (shows(clock + FLASH) !== 0) return clock - Math.floor(clock) < 0.5 ? HAND : OFF;
    const left = ((((shows.green - FLASH - clock) % net.cycle) + net.cycle) % net.cycle) / (net.cycle / 2 - FLASH);
    return -Math.min(BARS, Math.max(1, Math.ceil(left * BARS))) / BARS;
  };
  for (let j = 0; dealt && j < dealt.matrices.length / 16; j++) {
    const x = dealt.matrices[j * 16 + 12];
    const z = dealt.matrices[j * 16 + 14];
    for (const S of net.streets) {
      const O = net.streets.find((o) => o.axis !== S.axis && o.c >= S.a - 1 && o.c <= S.b + 1 && S.c >= o.a - 1 && S.c <= o.b + 1 && Math.abs((S.axis === "z" ? z : x) - o.c) < 30);
      if (!O) continue;
      const [u, v] = S.axis === "z" ? [x, z] : [z, x];
      const past = Math.abs(v - O.c) - O.half;
      if (Math.abs(Math.abs(u - S.c) - S.half - KERB / 2) > KERB / 2 || past < CROSSING[0] || past > CROSSING[1] || v < S.a || v > S.b) continue;
      const [jx, jz] = S.axis === "z" ? [S.c, O.c] : [O.c, S.c];
      const q = -Math.sign(v - O.c);
      const shows = S.axis === "z" ? net.light(jx, jz, 0, q) : net.light(jx, jz, q, 0);
      if (!shows || !lights(jx, jz)) continue;
      boxes.push({ j, shows, shown: 0, x, z, jx, jz, hx: S.axis === "z" ? 0 : q, hz: S.axis === "z" ? q : 0 });
      break;
    }
  }
  if (!heads.length && !boxes.length) return null;
  const paint = (h, state) => {
    const color = h.geometry.attributes.color;
    const size = color.itemSize;
    const a = color.array;
    for (let k = 0; k < h.lens.length; k++) {
      const c = lit[h.lens[k]];
      const s = h.lens[k] === state ? 1 : DARK;
      const d = (h.at + k) * size;
      a[d] = c.r * s;
      a[d + 1] = c.g * s;
      a[d + 2] = c.b * s;
    }
    color.addUpdateRange(h.at * size, h.lens.length * size);
    color.needsUpdate = true;
    h.shown = state;
  };
  return {
    /** The heads at second `clock` of the traffic's clock: a head is
     *  painted only when what it shows changes (or its mesh was written
     *  again). */
    update(clock) {
      for (const h of heads) {
        if (h.mesh.geometry === h.geometry) continue;
        read();
        break;
      }
      for (const h of heads) {
        const state = h.shows(clock);
        if (state !== h.shown) paint(h, state);
      }
      for (const b of boxes) {
        const deal = dealOf(b.shows, clock);
        if (deal === b.shown) continue;
        dealt.deal(b.j, deal);
        b.shown = deal;
      }
    },
    /** For the crowd: whether the crossing on one arm ("n" toward -z, "s",
     *  "e", "w") of the junction at (x, z) shows the figure at a second of
     *  the traffic's clock, as its box does: (clock) => true or false. Null
     *  at a junction without lights. */
    crossing(x, z, arm) {
      const [ax, az] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[arm];
      const shows = lights(x, z) && net.light(x, z, -ax, -az);
      return shows ? (clock) => dealOf(shows, clock) < 0 : null;
    },
    /** Dev: each head, where it stands, the way its traffic heads, and the
     *  lens its vertices have lit
     *  now (read off the mesh's colours: 0 red, 1 amber, 2 green). */
    lenses() {
      return heads.map((h) => {
        const color = h.mesh.geometry.attributes.color;
        const sum = [0, 0, 0];
        for (let k = 0; k < h.lens.length; k++) sum[h.lens[k]] += color.getX(h.at + k) + color.getY(h.at + k) + color.getZ(h.at + k);
        return { x: +h.x.toFixed(1), z: +h.z.toFixed(1), hx: Math.round(h.hx), hz: Math.round(h.hz), lit: sum.indexOf(Math.max(...sum)) };
      });
    },
    /** Dev: each box with lights to show, where it stands, its junction,
     *  the way in over its crossing and what it shows now: below 0 the
     *  figure (minus the share of its bars lit), 0.25 the hand dark, 0.5
     *  the hand. */
    boxes() {
      return boxes.map((b) => ({ x: b.x, z: b.z, jx: b.jx, jz: b.jz, hx: b.hx, hz: b.hz, deal: b.shown }));
    },
  };
}
