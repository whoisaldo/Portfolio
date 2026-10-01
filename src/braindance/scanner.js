// src/braindance/scanner.js: finding things in the braindance.
//
// Every frame: which clues are in this stretch of the recording, which of
// them are on the layer being looked through, where their boxes are (the
// car's move with the car), which ones the layers effect lights, what is
// hot and what makes a sound, and where each clue sits on the screen for
// its marker. The pointer is a ray into the city: over a clue it says so,
// and a click held on it for SCAN_SECONDS scans it. A marker is a button,
// so the keyboard can scan as well (src/braindance/hud/Markers.jsx).
import * as THREE from "three";
import { CLUES } from "../data/braindance";
import { createPlaces, CAR_HEAT } from "./places";
import { LAYER_COLORS, MAX_CLUES } from "./layers";
import { bd, emit, set, toast } from "./store";
import { markFound } from "./journal";
import { SHOTS } from "../data/world";

export const SCAN_SECONDS = 0.6;

const byId = new Map(CLUES.map((c) => [c.id, c]));

export function createScanner({ parts, recording, layers }) {
  const { city, camera, scene } = parts;
  const places = createPlaces(city.anchors, recording);
  const list = CLUES.map((c) => ({ ...c, place: places[c.id] })).filter((c) => c.place);

  // Per clue, reused every frame.
  const state = new Map(
    list.map((c) => [c.id, { box: new THREE.Box3(), centre: new THREE.Vector3(), active: false, screen: { x: 0, y: 0, on: false } }]),
  );

  // The car's frame, from the recording's frame spec.
  const car = { p: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3() };
  const inCar = (v, out) => out.copy(car.p).addScaledVector(car.r, v[0]).setY(car.p.y + v[1]).addScaledVector(car.f, v[2]);
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();

  const tracked = new Map();
  const trackOf = (name) => {
    if (!tracked.has(name)) tracked.set(name, scene.getObjectByName(name) ?? null);
    return tracked.get(name);
  };

  const moon = city.anchors.get("anchor_moon");
  const moonR = (moon?.extras?.radius ?? 150) * (SHOTS.contact?.moon?.scale ?? 0.7);

  /** A clue's box in the world, this frame. */
  const placeBox = (c, out) => {
    const box = c.place.box;
    if (box.car) {
      const half = _b.fromArray(box.car.s).multiplyScalar(0.5);
      let k = 0;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) inCar([box.car.c[0] + sx * half.x, box.car.c[1] + sy * half.y, box.car.c[2] + sz * half.z], corners[k++]);
      out.setFromPoints(corners).expandByScalar(0.06);
      // Never into the ground under it: the floor is not the clue.
      out.min.y = Math.max(out.min.y, car.p.y + 0.03);
      return out;
    }
    if (box.world) return out.set(_a.fromArray(box.world.min), _b.fromArray(box.world.max));
    if (box.track) {
      out.makeEmpty();
      for (const name of box.track) {
        const o = trackOf(name);
        if (o) out.expandByObject(o);
      }
      return out;
    }
    if (box.moon && moon) {
      // The two sit on the disc's upper rim, a little left of the top, on a
      // card that faces the camera.
      _a.setFromMatrixColumn(camera.matrixWorld, 0);
      _b.copy(moon.position).addScaledVector(_a, -0.12 * moonR).add(_a.set(0, 0.97 * moonR, 0));
      return out.setFromCenterAndSize(_b, _a.set(0.32 * moonR, 0.22 * moonR, 0.32 * moonR));
    }
    return out.makeEmpty();
  };

  // ---- the pointer ------------------------------------------------------------
  const pointer = { x: 0, y: 0, in: false, down: false };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hover = null;
  let progress = 0;
  let scannedThisPress = false;

  const scan = (id) => {
    const c = byId.get(id);
    if (!c) return;
    const fresh = markFound(id);
    set({ open: id, scan: 0 });
    emit("scan", id);
    if (fresh) toast("clue", c.title, c.kicker);
  };

  // ---- the frame ----------------------------------------------------------------
  const heat = [];
  const sound = [];
  const lit = [];
  const labels = [];
  const _sp = new THREE.Vector3();
  const v3 = (arr) => arr;

  const sourceAt = (src, out) => (src.car ? inCar(src.car, out) : out.fromArray(src.world));

  const update = (dt, t, spec) => {
    car.p.copy(spec.carPosition);
    car.f.set(Math.sin(spec.carHeading), 0, Math.cos(spec.carHeading));
    car.r.set(-Math.cos(spec.carHeading), 0, Math.sin(spec.carHeading));
    camera.updateMatrixWorld();
    const layer = bd.layer;

    heat.length = 0;
    sound.length = 0;
    lit.length = 0;
    labels.length = 0;

    // The car's own heat and sound, always.
    const speed = Math.abs(spec.car.v);
    for (const h of CAR_HEAT) {
      const p = inCar(h.car, new THREE.Vector3());
      heat.push({ x: p.x, y: p.y, z: p.z, r: h.r, k: h.brakes ? h.k + Math.min(0.5, speed * 0.02) : h.k });
    }
    const engine = inCar([0, 0.7, 1.5], new THREE.Vector3());
    sound.push({ x: engine.x, y: engine.y, z: engine.z, r: 12 + speed * 0.6, k: 0.55 });

    for (const c of list) {
      const s = state.get(c.id);
      const [t0, t1] = c.place.at;
      s.active = t >= t0 && t <= t1;
      if (!s.active) continue;
      placeBox(c, s.box);
      if (s.box.isEmpty()) {
        s.active = false;
        continue;
      }
      s.box.getCenter(s.centre);
      if (c.place.heat) {
        sourceAt(c.place.heat, _sp);
        heat.push({ x: _sp.x, y: _sp.y, z: _sp.z, r: c.place.heat.r, k: c.place.heat.k });
      }
      if (c.place.sound) {
        sourceAt(c.place.sound, _sp);
        sound.push({ x: _sp.x, y: _sp.y, z: _sp.z, r: c.place.sound.r, k: c.place.sound.k });
      }
      if (c.layer !== layer) continue;
      // Where it is on the screen, for its marker.
      _sp.copy(s.centre).project(camera);
      const front = _sp.z < 1 && _sp.z > -1;
      s.screen.x = (_sp.x * 0.5 + 0.5) * 100;
      s.screen.y = (-_sp.y * 0.5 + 0.5) * 100;
      s.screen.on = front && Math.abs(_sp.x) < 1.05 && Math.abs(_sp.y) < 1.05;
      const dist = camera.position.distanceTo(s.centre);
      if (s.screen.on) labels.push({ id: c.id, x: s.screen.x, y: s.screen.y, dist, found: bd.found.includes(c.id), secret: Boolean(c.secret) });
      lit.push({ c, s, dist });
    }

    // The pointer's ray against what is lit on this layer, nearest hit wins.
    let next = null;
    if (pointer.in && bd.mode !== "photo") {
      ndc.set(pointer.x, pointer.y);
      ray.setFromCamera(ndc, camera);
      let best = Infinity;
      for (const { c, s } of lit) {
        const hit = ray.ray.intersectBox(s.box, _a);
        if (!hit) continue;
        // Small things first: a car part over the whole car, a figure on
        // the moon over the moon.
        const size = s.box.getSize(_b).length();
        const d = camera.position.distanceTo(hit) + size * 0.5;
        if (d < best) {
          best = d;
          next = c.id;
        }
      }
    }
    if (next !== hover) {
      hover = next;
      progress = 0;
      set({ hover });
    }
    if (hover && pointer.down && !scannedThisPress) {
      progress += dt / SCAN_SECONDS;
      if (progress >= 1) {
        progress = 0;
        scannedThisPress = true;
        scan(hover);
      }
    } else if (!pointer.down) {
      progress = Math.max(0, progress - dt * 4);
    }
    bd.scan = progress;
    emit("charge", hover && pointer.down && !scannedThisPress ? progress : 0);

    // What the layers effect lights: the clues on this layer, nearest first,
    // the hovered one always.
    lit.sort((a, b) => (a.c.id === hover ? -1 : b.c.id === hover ? 1 : a.dist - b.dist));
    const boxes = lit.slice(0, MAX_CLUES).map(({ c, s }) => ({
      min: s.box.min,
      max: s.box.max,
      k: bd.found.includes(c.id) ? 0.35 : 1,
      hover: c.id === hover ? 1 + progress : 0,
      color: LAYER_COLORS[layer],
    }));
    layers.setClues(boxes);
    heat.sort((a, b) => b.k - a.k);
    layers.setHeat(heat.slice(0, 16));
    layers.setSound(sound.slice(0, 16));
    labels.sort((a, b) => b.dist - a.dist);
    bd.labels = labels;
    return v3(labels);
  };

  return {
    update,
    scan,
    /** The pointer in normalised device coordinates, or off the city. */
    move(x, y, inside = true) {
      pointer.x = x;
      pointer.y = y;
      pointer.in = inside;
    },
    press(on) {
      pointer.down = on;
      if (!on) scannedThisPress = false;
    },
    get hover() {
      return hover;
    },
    /** Every clue with its window, for the timeline. */
    get windows() {
      return list.filter((c) => !c.secret).map((c) => ({ id: c.id, layer: c.layer, at: c.place.at }));
    },
    /** Clues active now on any layer: for the minimap. */
    activeNow() {
      return list.filter((c) => state.get(c.id).active && !c.secret).map((c) => ({ id: c.id, layer: c.layer, at: state.get(c.id).centre }));
    },
  };
}
