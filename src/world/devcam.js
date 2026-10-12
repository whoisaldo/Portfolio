// src/world/devcam.js: a free camera, and the loop driven and walked. Dev
// only: world-scene.js imports it behind import.meta.env.DEV, so a
// production build never carries it, and it is reached from the console or
// the review harness as window.__world.devcam.
//
//   free()            take the camera: W A S D to move, Q E down and up,
//                     shift to hurry, drag to look; free(false) gives it back
//   drive(seconds) / walk(seconds)
//                     a pose on the loop (road-graph.json, the builder's
//                     export): driving, an eye 1.25 m up in the right-hand
//                     lane at 12 m/s; walking, 1.65 m up on the right-hand
//                     pavement at 1.4 m/s, looking along the way
//   show(pose)        draw that pose now (the page's own loop rests)
//   loopLength(mode)  metres round
//
// The loop is A B C L P Q F E I H and back to A (BIBLE.md), joined from the
// graph's edges, the deck's heights included.
import * as THREE from "three";

const GRAPH_URL = "/scenes/world/road-graph.json";

export async function attachDevcam(world) {
  const graph = await fetch(GRAPH_URL).then((r) => r.json());
  const adj = new Map();
  for (const e of graph.edges) {
    for (const [a, b] of [[e.from, e.to], [e.to, e.from]]) {
      if (!adj.has(a)) adj.set(a, []);
      adj.get(a).push({ to: b, edge: e, forward: a === e.from });
    }
  }
  // Each leg of the loop by the fewest edges, then the points in order.
  const route = (from, to) => {
    const prev = new Map([[from, null]]);
    const queue = [from];
    while (queue.length) {
      const n = queue.shift();
      if (n === to) break;
      for (const step of adj.get(n) ?? []) {
        if (prev.has(step.to)) continue;
        prev.set(step.to, { from: n, step });
        queue.push(step.to);
      }
    }
    const steps = [];
    for (let n = to; prev.get(n); n = prev.get(n).from) steps.unshift(prev.get(n).step);
    return steps;
  };
  const order = graph.loop.order;
  const path = [];
  const halves = [];
  const raised = [];
  order.forEach((id, i) => {
    const next = order[(i + 1) % order.length];
    for (const step of route(id, next)) {
      const pts = step.forward ? step.edge.points : [...step.edge.points].reverse();
      // Walking the middle of the pavement, between the crowd's two lines
      // (the builder's streets.life: 0.7 m in from the kerb and 1.7 m out
      // from the lot line), where a walker sees the shops and the street;
      // on the deck's and the ramp's narrow walkways, along their middle.
      const pv = step.edge.pavements?.[0];
      const side = !pv ? step.edge.half + 1.8 : step.edge.elevated ? Math.abs(pv.offset) + pv.width / 2 - 0.45 : Math.abs(pv.offset) - 0.5;
      for (const p of pts) {
        const last = path[path.length - 1];
        const v = new THREE.Vector3(p[0], p[1], p[2]);
        if (last && last.distanceTo(v) < 0.2) continue;
        path.push(v);
        halves.push(side);
        raised.push(!!step.edge.elevated);
      }
    }
  });
  // Arc length at each point.
  const at = [0];
  for (let i = 1; i < path.length; i++) at.push(at[i - 1] + path[i].distanceTo(path[i - 1]));
  const total = at[at.length - 1] + path[path.length - 1].distanceTo(path[0]);

  const sample = (s, out) => {
    s = ((s % total) + total) % total;
    let lo = 0;
    let hi = at.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (at[mid] <= s) lo = mid;
      else hi = mid;
    }
    const a = path[lo];
    const b = path[(lo + 1) % path.length];
    const len = (lo + 1 < at.length ? at[lo + 1] : total) - at[lo];
    return { p: out.copy(a).lerp(b, len > 0 ? (s - at[lo]) / len : 0), side: halves[lo] };
  };

  // The walker's own line. Every point is set off to its pavement by its
  // own stretch's direction and every corner mitred (the pavement's corner,
  // or the far side of the crossing on a left turn), then each stretch
  // between two corners is paced evenly along its length. A look-ahead used
  // to swing the offset across a corner, through whatever stood on it.
  const ring = path.length > 1 && path[path.length - 1].distanceTo(path[0]) < 0.2 ? path.length - 1 : path.length;
  const rightOf = (d) => new THREE.Vector3(-d.z, 0, d.x);
  const dirOut = [];
  for (let i = 0; i < ring; i++) dirOut.push(new THREE.Vector3().subVectors(path[(i + 1) % ring], path[i]).setY(0).normalize());
  const corners = [];
  const raw = [];
  for (let i = 0; i < ring; i++) {
    const dIn = dirOut[(i - 1 + ring) % ring];
    const dOut = dirOut[i];
    if (dIn.dot(dOut) < 0.5) {
      // Round a street corner close by the building, 0.9 m in from the two
      // lines' crossing: the kerb's side of a corner is where the signal
      // masts, boxes and bins stand.
      const tuck = raised[i] || raised[(i + 1) % ring] ? 0 : 0.9;
      corners.push(i);
      raw.push(path[i].clone().addScaledVector(rightOf(dIn), halves[i] + tuck).addScaledVector(rightOf(dOut), halves[(i + 1) % ring] + tuck));
    } else raw.push(path[i].clone().addScaledVector(rightOf(dOut), halves[i]));
  }
  // On the inside of a turn the points either side of the corner would
  // overshoot the mitre: they wait at it.
  for (const c of corners) {
    const m = raw[c];
    const dIn = dirOut[(c - 1 + ring) % ring];
    const dOut = dirOut[c];
    for (let k = 1; k < 40; k++) {
      const j = (c - k + ring) % ring;
      if (raw[j].clone().sub(m).setY(0).dot(dIn) <= 0) break;
      raw[j].set(m.x, raw[j].y, m.z);
    }
    for (let k = 1; k < 40; k++) {
      const j = (c + k) % ring;
      if (raw[j].clone().sub(m).setY(0).dot(dOut) >= 0) break;
      raw[j].set(m.x, raw[j].y, m.z);
    }
  }
  const walkway = raw.map((v) => v.clone());
  corners.forEach((c0, n) => {
    const c1 = corners[(n + 1) % corners.length];
    const idx = [c0];
    while (idx[idx.length - 1] !== c1 || idx.length === 1) idx.push((idx[idx.length - 1] + 1) % ring);
    const along = (j, first) => (j > c0 || first ? at[j] : at[j] + total) - at[c0];
    const cum = [0];
    for (let k = 1; k < idx.length; k++) cum.push(cum[k - 1] + raw[idx[k]].distanceTo(raw[idx[k - 1]]));
    const centre = along(c1, false) || total;
    let seg = 1;
    for (let k = 1; k < idx.length - 1; k++) {
      const d = (along(idx[k], false) / centre) * cum[cum.length - 1];
      while (seg < cum.length - 1 && cum[seg] < d) seg++;
      const span = cum[seg] - cum[seg - 1];
      walkway[idx[k]].lerpVectors(raw[idx[seg - 1]], raw[idx[seg]], span > 0 ? (d - cum[seg - 1]) / span : 0);
    }
  });
  const walkAt = (s, out) => {
    s = ((s % total) + total) % total;
    let lo = 0;
    let hi = at.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (at[mid] <= s) lo = mid;
      else hi = mid;
    }
    const len = (lo + 1 < at.length ? at[lo + 1] : total) - at[lo];
    return out.copy(walkway[lo % ring]).lerp(walkway[(lo + 1) % ring], len > 0 ? (s - at[lo]) / len : 0);
  };

  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const pose = (s, mode) => {
    const walking = mode === "walk";
    if (walking) {
      const position = walkAt(s, new THREE.Vector3());
      const target = walkAt(s + 6, new THREE.Vector3());
      position.y += 1.65 + (position.y < 1 ? 0.15 : 0);
      target.y += 1.4;
      return { position, target, fov: 62, shift: 0 };
    }
    const { p } = sample(s, _a);
    const ahead = sample(s + 18, _b).p;
    const dir = new THREE.Vector3().subVectors(ahead, p).setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
    dir.normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const position = p.clone().addScaledVector(right, 1.9).setY(p.y + 1.25);
    const target = ahead.clone().addScaledVector(right, 1.9).setY(ahead.y + 1.15);
    return { position, target, fov: 58, shift: 0 };
  };

  const show = (p, extra = {}) => {
    world.stage.mode = "cinematic";
    world.renderDirected(1 / 30, { pose: p, board: 0, towers: [], garage: { door: 0, tubes: false }, mirror: 1, glitch: 0, ...extra });
  };

  // The free camera.
  const keys = new Set();
  let freeOn = false;
  let raf = 0;
  const cam = { position: new THREE.Vector3(), yaw: 0, pitch: 0 };
  const onKey = (e) => (e.type === "keydown" ? keys.add(e.code) : keys.delete(e.code));
  let drag = null;
  const onDown = (e) => (drag = { x: e.clientX, y: e.clientY });
  const onUp = () => (drag = null);
  const onMove = (e) => {
    if (!drag) return;
    cam.yaw -= (e.clientX - drag.x) * 0.003;
    cam.pitch = Math.max(-1.4, Math.min(1.4, cam.pitch - (e.clientY - drag.y) * 0.003));
    drag = { x: e.clientX, y: e.clientY };
  };
  let last = 0;
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const speed = (keys.has("ShiftLeft") ? 40 : 8) * dt;
    const fwd = new THREE.Vector3(Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    const right = new THREE.Vector3(Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    if (keys.has("KeyW")) cam.position.addScaledVector(fwd, speed);
    if (keys.has("KeyS")) cam.position.addScaledVector(fwd, -speed);
    if (keys.has("KeyD")) cam.position.addScaledVector(right, speed);
    if (keys.has("KeyA")) cam.position.addScaledVector(right, -speed);
    if (keys.has("KeyE")) cam.position.y += speed;
    if (keys.has("KeyQ")) cam.position.y = Math.max(0.3, cam.position.y - speed);
    const look = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
    show({ position: cam.position.clone(), target: cam.position.clone().add(look), fov: 60, shift: 0 }, { flow: dt });
  };
  const free = (on = true) => {
    if (on === freeOn) return freeOn;
    freeOn = on;
    if (on) {
      cam.position.copy(world.camera.position);
      const d = new THREE.Vector3();
      world.camera.getWorldDirection(d);
      cam.yaw = Math.atan2(d.x, -d.z);
      cam.pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      window.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointermove", onMove);
      last = 0;
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      world.stage.mode = "stage";
    }
    return freeOn;
  };

  return {
    free,
    show,
    drive: (seconds) => pose(seconds * 12, "drive"),
    walk: (seconds) => pose(seconds * 1.4, "walk"),
    at: (metres, mode = "drive") => pose(metres, mode),
    loopLength: () => total,
  };
}
