// src/world/garage-markers.js: the parts' pins over the garage's picture.
//
// Each pin is a DOM button (the garage's controls, src/components/garage)
// placed over the world's canvas once per rendered frame, where its part is
// on the car: the anchor hangs on the node that carries the part
// (src/world/garage-cars.js), so a pin rises with an open hood and comes
// down with the S6's body. No React state changes per frame; this writes
// only each button's style.transform and style.visibility and its
// data-occluded and data-side, and only when they change.
//
// A pin is hidden when its part is behind the camera, off the picture's
// clear rectangle, under a closed hood, behind geometry or, on a phone,
// beyond the first few pins that fit apart. Behind geometry is judged
// against coarse boxes, not the triangles: each car's lower body and its
// cabin (a box a pin sits inside does not hide it), and the room's
// collision solids. data-occluded says why (`behind`, `outside`, `hood`,
// `geometry`, `cap`), empty when shown; data-side is the side the pin's
// label opens to, toward the middle of the picture.
import * as THREE from "three";

const _w = new THREE.Vector3();
const _t = new THREE.Vector3();
const _ndc = new THREE.Vector3();
const _cam = new THREE.Vector3();
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _inv = new THREE.Matrix4();

/** Whether the segment from `o` along `d` (0 < t < 1) meets `box`. */
function crosses(box, o, d) {
  let t0 = 0;
  let t1 = 1;
  for (const k of ["x", "y", "z"]) {
    if (Math.abs(d[k]) < 1e-12) {
      if (o[k] < box.min[k] || o[k] > box.max[k]) return false;
      continue;
    }
    let a = (box.min[k] - o[k]) / d[k];
    let b = (box.max[k] - o[k]) / d[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return { entry: t0, exit: t1 };
}

/**
 * `anchors` is garage-cars' list (`anchors()`): `{ key, owner, local,
 * twin?, needsHoodOpen, hood() }`, `twin` the same corner part's mirror
 * `{ owner, local }`; the nearer of the two is the pin's point. `occluders` is a list of `{ box, object? }`: a
 * box in `object`'s own space when it moves (a car), else in the world's
 * (the room's solids); it may be a function returning that list.
 *
 * `project(view, elements, options)` places the pins for this frame:
 *
 *   view      `{ width, height }` of the canvas in CSS pixels, and the clear
 *             rectangle pins may show in, `{ left, top, right, bottom }`
 *             in the same pixels (the whole canvas by default)
 *   elements  Map (or object) of key to button, as registered
 *   options   `{ selected, focused, cap }`: the selected and focused keys
 *             are placed first; `cap` is the most pins shown at once
 *             (four on a phone), each at least `spacing` pixels (44) from
 *             the last
 *
 * A button's own CSS must not set its transform: the pin's point is its
 * centre. Returns the keys of pins that held focus and were hidden this
 * frame (the section moves focus to its list then).
 */
export function createMarkers({ camera, anchors = [], occluders = [] }) {
  const seen = new Map();
  const order = [];
  const write = (el, transform, hidden, why, side) => {
    let s = seen.get(el);
    if (!s) seen.set(el, (s = {}));
    if (!hidden && s.transform !== transform) el.style.transform = s.transform = transform;
    const visibility = hidden ? "hidden" : "visible";
    if (s.visibility !== visibility) el.style.visibility = s.visibility = visibility;
    if (s.why !== why) el.dataset.occluded = s.why = why;
    if (!hidden && s.side !== side) el.dataset.side = s.side = side;
  };

  return {
    setAnchors(list) {
      anchors = list;
    },
    project(view, elements, { selected = null, focused = null, cap = Infinity, spacing = 44 } = {}) {
      const get = elements instanceof Map ? (k) => elements.get(k) : (k) => elements?.[k];
      const left = view.left ?? 0;
      const top = view.top ?? 0;
      const right = view.right ?? view.width;
      const bottom = view.bottom ?? view.height;
      const solids = typeof occluders === "function" ? occluders() : occluders;
      camera.updateWorldMatrix(true, false);
      camera.getWorldPosition(_cam);
      const registered = new Set();
      order.length = 0;
      for (const a of anchors) {
        const el = get(a.key);
        if (!el) continue;
        registered.add(el);
        // A corner part shows on the side of the car that faces the camera
        // (its twin, from garage-cars.js); occlusion is then tested there.
        let owner = a.owner;
        owner.updateWorldMatrix(true, false);
        _w.copy(a.local).applyMatrix4(owner.matrixWorld);
        if (a.twin) {
          a.twin.owner.updateWorldMatrix(true, false);
          _t.copy(a.twin.local).applyMatrix4(a.twin.owner.matrixWorld);
          if (_t.distanceToSquared(_cam) < _w.distanceToSquared(_cam)) { owner = a.twin.owner; _w.copy(_t); }
        }
        _ndc.copy(_w).project(camera);
        const x = ((_ndc.x + 1) / 2) * view.width;
        const y = ((1 - _ndc.y) / 2) * view.height;
        let why = "";
        for (let o = owner; o; o = o.parent) if (!o.visible) { why = "unavailable"; break; }
        if (why) { /* Hidden representations cannot expose DOM pins. */ }
        else if (_ndc.z <= -1 || _ndc.z >= 1) why = "behind";
        else if (x < left || x > right || y < top || y > bottom) why = "outside";
        else if (a.needsHoodOpen && (a.hood?.() ?? 0) < 0.95) why = "hood";
        else {
          for (const s of solids) {
            if (s.object) {
              s.object.updateWorldMatrix(true, false);
              _inv.copy(s.object.matrixWorld).invert();
              _o.copy(_cam).applyMatrix4(_inv);
              _d.copy(_w).applyMatrix4(_inv);
            } else {
              _o.copy(_cam);
              _d.copy(_w);
            }
            const contains = s.box.containsPoint(_d);
            const sameCar = s.carId === a.carId;
            // A validated cabin cut starts inside its own coarse cabin.
            // The volume must not hide the head unit from that camera.
            if (sameCar && s.kind === "cabin" && s.box.containsPoint(_o)) continue;
            _d.sub(_o);
            const hit = crosses(s.box, _o, _d);
            // Pins inside their own coarse shell may stand slightly below
            // its surface. An opposite-side pin is still hidden after a
            // long passage through the shell. Engine context pins skip
            // only their own lower shell, never the cabin or room solids.
            if (hit && contains && sameCar && (s.kind === "lower" && a.needsHoodOpen || (1 - hit.entry) * _d.length() < 0.24)) continue;
            if (hit && hit.entry < 0.999 && hit.exit > 0.001) {
              why = "geometry";
              break;
            }
          }
        }
        order.push({ a, el, x, y, why, near: _w.distanceToSquared(_cam), first: a.key === focused ? 0 : a.key === selected ? 1 : 2 });
      }
      const allElements = elements instanceof Map ? elements.values() : Object.values(elements ?? {});
      for (const el of allElements) if (el && !registered.has(el)) write(el, "", true, "unavailable", "");
      for (const el of seen.keys()) if (!el.isConnected) seen.delete(el);
      // The selected and focused pins first, then the nearest.
      order.sort((p, q) => p.first - q.first || p.near - q.near);
      const shown = [];
      const hiddenFocused = [];
      for (const p of order) {
        if (!p.why && cap < Infinity && (shown.length >= cap || shown.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < spacing))) p.why = "cap";
        const hidden = Boolean(p.why);
        if (!hidden) shown.push(p);
        const was = seen.get(p.el)?.visibility;
        const active = typeof document === "undefined" ? null : document.activeElement;
        if (hidden && was !== "hidden" && active && (active === p.el || p.el.contains(active))) hiddenFocused.push(p.a.key);
        const side = p.x > (left + right) / 2 ? "left" : "right";
        write(p.el, `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`, hidden, p.why, side);
      }
      return hiddenFocused;
    },
    /** Hide every pin (the visit is off). */
    hideAll(elements) {
      const list = elements instanceof Map ? [...elements.values()] : Object.values(elements ?? {});
      for (const el of list) if (el) write(el, "", true, "behind", "");
    },
    dispose() {
      seen.clear();
      anchors = [];
    },
  };
}
