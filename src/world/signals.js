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
import * as THREE from "three";
import { NEON } from "./materials.js";

const HEADS = ["traffic_light", "traffic_light_post"];
// An unlit lens: dark glass with a trace of its colour (as props.py has the
// amber and the green: any more, and the glow's gain lights it).
const DARK = 0.008;

/** `props`: the city's (src/world/props.js); `net`: the traffic's network.
 *  Returns { update(clock), lenses() } or null if there are no heads. */
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
  if (!heads.length) return null;
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
  };
}
