// src/braindance/engine.js: the braindance player.
//
// Builds the city the cinematic shell uses (src/world), in the mode the
// intro drives it in: its own loop rests, and every frame is asked for
// from here with renderDirected. What it asks for comes from the
// recording (src/braindance/recording.js) at the player's clock, then from
// whatever the reader is doing on top: orbiting a paused moment in the
// editor, flying the photo camera, looking round while it plays.
//
// The clock is the song's when there is sound: the deck's position steers
// a clock that runs on the frame's own timestamp (the deck's steps arrive
// in bursts; see the long note in IntroCinematic.jsx), so the picture is
// smooth and still lands on every beat. Without sound it runs on the frame
// clock alone, at the same rates.
//
// Free roam (src/braindance/roam, its own chunk) is the recording put down:
// the clock holds where it was, the song plays on as the car's radio, and
// the car and the camera are the player's until the recording is taken up
// again.
import * as THREE from "three";
import { loadWorld } from "../world/load.js";
import { setStage } from "../world/stage.js";
import { makePose, copyPose, clamp } from "../world/shots.js";
import { createRecording, DURATION, CHAPTERS, HOLO_AT, HOLO_RING } from "./recording.js";
import { createLayers, LAYER_COLORS } from "./layers.js";
import { createAudio } from "./audio.js";
import { bakeHeights, drawMap } from "./minimap.js";
import { createScanner } from "./scanner.js";
import { loadJournal, unlock } from "./journal.js";
import { bd, on, set, toast } from "./store.js";
import { createSounds } from "./sounds.js";
import { createTag } from "./tag.js";
import { createHolocall, preloadHolocall } from "./holocall.js";
import { SIGN_WORDS } from "../data/braindance.js";
import { fmt } from "./format.js";

const DEG = Math.PI / 180;
const _up = new THREE.Vector3();

/** A ready room needs the S6 body, or the S4 when the S6 bay is explicitly empty. */
export function garageIsReady(garage) {
  return garage?.state?.availability === "ready"
    && typeof garage.applyDirectedState === "function"
    && ["at", "sample", "stateAt", "inspection"].every((key) => typeof garage.poses?.[key] === "function")
    && Array.isArray(garage.collision?.solids)
    && ["clearance", "sweep", "nearPlane", "cars"].every((key) => typeof garage.collision?.[key] === "function")
    && garage.collision.cars().some((car) => car.carId === (garage.state.models?.s6 === false ? "s4" : "s6") && !car.box.isEmpty());
}

/** Hold the latest requested tape time without letting an old load resume it. */
export function createGarageGate({ getGarage, onStatus, onReady }) {
  let pending = null;
  let job = 0;
  let status = "idle";
  const request = (time, playing, retry = false) => {
    pending = { time, playing };
    if (status === "loading" || (status === "failed" && !retry)) return;
    const id = ++job;
    status = "loading";
    onStatus(status);
    Promise.resolve().then(async () => {
      const garage = getGarage();
      if (!garage?.prepare) throw new Error("The workshop is unavailable");
      if (retry) await garage.retry();
      else await garage.prepare({ priority: "now" });
      if (!garageIsReady(getGarage())) throw new Error("The workshop is not complete");
    }).then(() => {
      if (id !== job || !pending) return;
      const ready = pending;
      pending = null;
      status = "idle";
      onStatus(status);
      onReady(ready);
    }, (error) => {
      if (id !== job || !pending) return;
      status = "failed";
      onStatus(status, error);
    });
  };
  return {
    request,
    get pending() { return pending; },
    setPlaying(value) { if (pending) pending.playing = value; },
    fail(time, playing, error) {
      job++;
      pending = { time, playing };
      status = "failed";
      onStatus(status, error);
    },
    cancel() {
      job++;
      pending = null;
      status = "idle";
      onStatus(status);
    },
  };
}

/** Check the shown pose, including lens/roll changes, along the entire move.
 *  The shared sweep stops translation; near-plane samples stop turns and zoom. */
export function constrainGarageCamera(collision, from, into, aspect, out) {
  const valid = (p) => p.position.distanceToSquared(p.target) > 1e-6
    && collision.clearance(p.position) >= 0.45 && collision.nearPlane(p, aspect) >= 0.15;
  const mix = (t, p) => {
    p.position.lerpVectors(from.position, into.position, t);
    p.target.lerpVectors(from.target, into.target, t);
    p.fov = from.fov + (into.fov - from.fov) * t;
    p.shift = (from.shift ?? 0) + ((into.shift ?? 0) - (from.shift ?? 0)) * t;
    p.roll = (from.roll ?? 0) + ((into.roll ?? 0) - (from.roll ?? 0)) * t;
    return p;
  };
  if (!valid(from)) return false;
  const swept = collision.sweep(from.position, into.position, 0.45);
  const limit = swept.ok ? 1 : Math.max(0, swept.t - 1e-4);
  const a = new THREE.Vector3().subVectors(from.target, from.position).normalize();
  const b = new THREE.Vector3().subVectors(into.target, into.position).normalize();
  const angle = a.angleTo(b) + Math.abs((into.roll ?? 0) - (from.roll ?? 0));
  const steps = Math.max(1, Math.ceil(from.position.distanceTo(into.position) / 0.01), Math.ceil(angle / (0.5 * DEG)), Math.ceil(Math.abs(into.fov - from.fov)));
  const probe = makePose();
  let accepted = 0;
  for (let i = 1; i <= steps; i++) {
    const t = Math.min(limit, i / steps);
    if (!valid(mix(t, probe))) {
      let lo = accepted;
      let hi = t;
      for (let n = 0; n < 12; n++) {
        const mid = (lo + hi) / 2;
        if (valid(mix(mid, probe))) lo = mid;
        else hi = mid;
      }
      accepted = lo;
      break;
    }
    accepted = t;
    if (t === limit) break;
  }
  mix(accepted, out);
  return true;
}

export async function createBraindance(canvas, { onProgress, onFirstFrame, reduced = false } = {}) {
  // The intro's arrangement: the scene's own loop rests while this one
  // draws (world-scene.js checks stage.mode before it runs a frame).
  setStage({ mode: "cinematic" });
  const audio = createAudio();
  const trackLoading = audio?.load().catch(() => null);
  const holoLoading = preloadHolocall().catch(() => null);
  const mod = await loadWorld("high");
  onProgress?.(0.85);
  const layers = createLayers();
  let firstFrame = false;
  const world = mod.createWorldScene(canvas, {
    tier: "high",
    effects: [layers.effect],
    // Ali's work on a few of the avenue's signs, here and nowhere else.
    signs: SIGN_WORDS,
    onFirstFrame: () => {
      firstFrame = true;
    },
    onLost: () => set({ status: "failed" }),
    reduced,
  });
  // A braindance is a reconstruction, and the editor lights what it is
  // looking at: a soft key from over the camera's shoulder onto the car,
  // up close only. The city is lit by its own signs (src/world/glsl.js) and
  // takes no three.js light, so this touches the car and nothing else.
  // (In the scene before the warm-up, dark: three keys every program by
  // the lights the camera drawing sees, lit material or not, so a city
  // material first drawn after it came would be a program of its own
  // beside its warmed twin. And a dark twin of it for the wet road's
  // mirror, whose camera does not see it: there too a material first drawn
  // would count a light fewer.)
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0);
  fill.name = "bd_fill";
  const fillMirror = new THREE.DirectionalLight(0xdfe8ff, 0);
  fillMirror.name = "bd_fill_mirror";
  fillMirror.layers.set(world.parts.mirrorLayer);
  world.parts.scene.add(fill, fill.target, fillMirror);
  await world.warm();
  await trackLoading;
  onProgress?.(1);
  const parts = world.parts;
  const { city, camera } = parts;
  const recording = createRecording(city.anchors, city.road, { garage: () => world.garage, aspect: () => camera.aspect });
  layers.setCamera(camera);
  // The car's coloured stage rims are tuned for the page's distances.
  parts.car?.setRims(0.3);

  const spec = recording.frame();
  // The holocall over the garage roof at the end (the Contact clue).
  const holoMap = await holoLoading;
  const holocall = holoMap ? createHolocall(parts.scene, holoMap, { position: new THREE.Vector3(467.8, 7.75, -194.2), lift: 4.2, height: 2.6 }) : null;
  const scanner = createScanner({ parts, recording, layers, holocall });
  const sounds = audio ? createSounds(audio) : null;
  const unhook = sounds
    ? [on("scan", () => sounds.scanned()), on("achievement", () => sounds.achievement()), on("charge", (p) => sounds.charging(p))]
    : [];
  const roofBeacon = { x: 470, y: 40, z: -291 };
  // The wall only heat can read (a secret clue, src/braindance/tag.js).
  const tag = createTag(parts.scene);
  let captureNext = null;
  const _fwd = new THREE.Vector3();
  let lastShot = -1;
  loadJournal();
  const seenLayers = new Set(["visual"]);
  // The minimap's ground, drawn from the city once.
  const heightMap = bakeHeights(parts);
  const map = { ...heightMap, canvas: drawMap(heightMap) };
  // And the whole city's, for free roam (made the first time it is asked
  // for: the recording's map stops where the recording does).
  let wide = null;

  // ---- the clock ------------------------------------------------------------
  const clock = { t: 0, est: 0, live: false };
  let playing = false;
  let dir = 1;
  let rate = 1;

  const deckPlay = () => {
    if (!audio?.ready) return;
    if (playing) audio.play(clock.t, rate, dir);
    else audio.pause();
    clock.live = false;
  };
  const steer = (dt) => {
    if (!playing) return clock.t;
    const est = clock.t + dt * rate * dir;
    const raw = audio?.time();
    if (raw === null || raw === undefined) return est;
    if (!clock.live) {
      clock.live = true;
      return raw;
    }
    const gap = raw - est;
    if (Math.abs(gap) > 0.12) return raw;
    return est + gap * 0.05;
  };

  // The tape and sound wait together. This status is engine-owned because
  // the deck stays mounted and all its existing controls must remain usable.
  const notice = document.createElement("div");
  notice.className = "bd-panel";
  Object.assign(notice.style, { position: "absolute", top: "5rem", left: "50%", transform: "translateX(-50%)", zIndex: "40", maxWidth: "min(28rem, 90vw)", padding: "1rem" });
  const message = document.createElement("p");
  message.tabIndex = -1;
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  message.setAttribute("aria-atomic", "true");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "bd-btn";
  retry.textContent = "Retry workshop";
  retry.style.minHeight = "44px";
  // Photo mode uses Enter as its shutter. A focused Retry keeps the native
  // button activation instead of letting that global shortcut consume it.
  retry.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
  };
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "bd-btn";
  skip.textContent = "Skip garage segment";
  skip.style.minHeight = "44px";
  skip.onkeydown = retry.onkeydown;
  notice.append(message, retry, skip);
  let returnFocus = null;
  const gate = createGarageGate({
    getGarage: () => world.garage,
    onStatus(status) {
      if (status === "idle") {
        if (notice.contains(document.activeElement)) {
          const control = returnFocus?.isConnected ? returnFocus : canvas.parentElement?.querySelector("button");
          control?.focus({ preventScroll: true });
        }
        notice.remove();
        return;
      }
      if (!notice.isConnected) {
        returnFocus = document.activeElement;
        canvas.parentElement?.append(notice);
      }
      message.textContent = status === "failed" ? "The workshop is unavailable. Retry, or skip this segment to continue the recording." : "Loading the workshop. The recording is held at a safe frame.";
      if (status === "loading" && (document.activeElement === retry || document.activeElement === skip)) message.focus({ preventScroll: true });
      retry.hidden = status !== "failed";
      retry.style.display = status === "failed" ? "inline-flex" : "none";
      skip.hidden = status !== "failed";
      skip.style.display = status === "failed" ? "inline-flex" : "none";
    },
    onReady(request) {
      clock.t = request.time;
      playing = request.playing;
      edit.ready = false;
      look.yaw = look.pitch = look.yawGoal = look.pitchGoal = 0;
      deckPlay();
      set({ playing, ended: false });
    },
  });
  retry.onclick = () => {
    if (gate.pending) gate.request(gate.pending.time, gate.pending.playing, true);
  };
  skip.onclick = () => {
    if (!gate.pending) return;
    // Cut beyond the unavailable approach/visit in the current direction.
    // Seeking cancels the old job and preserves its latest transport intent.
    api.seek(dir < 0 ? recording.garageRange.start - 0.001 : recording.garageRange.end);
    toast("camera", "Garage segment skipped", "You can return with the timeline and retry the workshop.", 4000);
  };
  const holdForGarage = (t) => {
    if (!recording.needsGarage(t) || garageIsReady(world.garage)) return false;
    gate.request(t, gate.pending?.playing ?? playing);
    playing = false;
    deckPlay();
    set({ playing: false });
    return true;
  };

  // ---- free roam ------------------------------------------------------------
  // `roam` is the module's player once it has loaded; `roamJob` counts the
  // asks, so a second G while the first is still loading calls it off.
  let roam = null;
  let roamJob = 0;
  let resumeAfter = false;
  // Seconds the city's clock has run in free roam, past the recording's.
  let roamed = 0;
  // How many steps the player has taken on foot (for their sound).
  let stride = 0;
  // The glitch a switch into or out of free roam lands with.
  let jolt = 0;
  const radioOn = () => {
    if (audio?.ready && !audio.playing) audio.play(clock.t >= DURATION - 0.5 ? 0 : clock.t, 1, 1);
    clock.live = false;
  };

  // ---- the camera on top of the recording ---------------------------------
  // Edit mode: paused, orbiting the chapter's pivot (or the car) inside
  // its limits. Look: while it plays, a drag turns the head a little and
  // lets go back to the recording's own framing.
  const edit = { yaw: 0, pitch: 0.2, radius: 12, pivot: new THREE.Vector3(), k: 0, ready: false };
  const look = { yaw: 0, pitch: 0, yawGoal: 0, pitchGoal: 0, held: false };
  const view = makePose();
  const shown = makePose();
  const _v = new THREE.Vector3();

  const pivotOf = (ch, out) => {
    const c = CHAPTERS[ch];
    if (c.pivot === "recording") return out.copy(spec.pose.target);
    if (c.pivot === "car") return out.copy(spec.carPosition).setY(0.9);
    return out.fromArray(c.pivot);
  };
  /** Start orbiting from wherever the recording's camera is now. */
  const enterEdit = () => {
    pivotOf(spec.chapter, edit.pivot);
    _v.subVectors(spec.pose.position, edit.pivot);
    const lim = CHAPTERS[spec.chapter].orbit;
    edit.radius = lim.collision ? _v.length() : clamp(_v.length(), lim.radius[0], lim.radius[1]);
    edit.yaw = Math.atan2(_v.x, _v.z);
    const pitch = Math.asin(clamp(_v.y / Math.max(1e-3, _v.length()), -1, 1));
    edit.pitch = lim.collision ? pitch : clamp(pitch, lim.pitch[0] * DEG, lim.pitch[1] * DEG);
    edit.shift = spec.pose.shift;
    edit.chapter = spec.chapter;
    edit.fov = spec.pose.fov;
    edit.accepted = null;
    edit.ready = true;
  };
  const editPose = (out) => {
    const lim = CHAPTERS[spec.chapter].orbit;
    // The initial garage pose is already validated. Input is constrained
    // below; entering the camera tool never clamps it onto another orbit.
    if (!lim.collision) {
      edit.radius = clamp(edit.radius, lim.radius[0], lim.radius[1]);
      edit.pitch = clamp(edit.pitch, lim.pitch[0] * DEG, lim.pitch[1] * DEG);
    }
    if (lim.yaw) {
      const [centre, range] = lim.yaw;
      let d = edit.yaw - centre * DEG;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      edit.yaw = centre * DEG + clamp(d, -range * DEG, range * DEG);
    }
    out.position.set(
      edit.pivot.x + Math.sin(edit.yaw) * Math.cos(edit.pitch) * edit.radius,
      edit.pivot.y + Math.sin(edit.pitch) * edit.radius,
      edit.pivot.z + Math.cos(edit.yaw) * Math.cos(edit.pitch) * edit.radius,
    );
    out.position.y = Math.max(0.35, out.position.y);
    out.target.copy(edit.pivot);
    out.fov = edit.fov ?? 40;
    out.shift = edit.shift ?? 0;
    return out;
  };

  // ---- the loop -------------------------------------------------------------
  let raf = 0;
  let last = 0;
  let disposed = false;
  let waveT = 0;
  let flowT = 0;
  let lastT = 0;
  let garageTool = false;
  let safeTime = 0;
  const hooks = new Set();

  // Close the hood before moving the S4, then refresh the rig at its new
  // road pose. directed updates its world matrices as well as animation.
  // The draw must not advance that controller again after collision checks.
  const applyDirectedFrame = (dt) => {
    const state = { ...spec.garage, free: false };
    const applied = world.garage?.applyDirectedState?.(state);
    if (!spec.car || !parts.car?.directed) return applied;
    parts.car.directed(dt, spec.car);
    return world.garage?.applyDirectedState?.(state);
  };

  const intervals = new Float32Array(300);
  let nIntervals = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (last) intervals[nIntervals++ % intervals.length] = now - last;
    const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
    last = now;
    if (document.hidden) return;

    // Time: the recording's, or held where it was while the player roams
    // (the song then loops as the radio, on its own).
    const free = Boolean(roam?.on);
    let t = free ? clock.t : steer(dt);
    if (!free && !gate.pending && holdForGarage(t)) t = clock.t;
    if (free && (audio?.time() ?? 0) >= DURATION - 0.1) audio.play(0, 1, 1);
    if (t >= DURATION && dir > 0) {
      t = DURATION;
      if (playing) {
        playing = false;
        audio?.pause();
        set({ playing: false, ended: true, open: null, journal: false, help: false });
        unlock("nightowl");
      }
    }
    if (t <= 0 && dir < 0) {
      t = 0;
      if (playing) {
        dir = 1;
        rate = 1;
        deckPlay();
        set({ direction: 1, rate: 1 });
      }
    }
    // The city's own clock follows the recording's: still while paused,
    // backwards while rewinding, a jump on a scrub.
    // (What it ran on by while the player roamed comes off as the recording
    // is taken up again, so the recording's second is the city's once more.)
    spec.flow = free ? (bd.mode === "photo" ? 0 : dt) : t - flowT - roamed;
    roamed = free ? roamed + spec.flow : 0;
    flowT = t;
    clock.t = t;
    bd.time = t;

    if (!gate.pending || !recording.needsGarage(t)) recording.evaluate(t, spec);
    // Live car bounds must describe this sought frame before either the
    // authored camera or the final edit/photo proposal queries collision.
    const carPlaced = !free && Boolean(spec.car && parts.car?.directed);
    let carStateApplied = !free && applyDirectedFrame(dt);
    if (!free && spec.garage.active && garageIsReady(world.garage)) {
      const collision = world.garage.collision;
      if (carStateApplied !== true || !(spec.pose.position.distanceToSquared(spec.pose.target) > 1e-6 && collision.clearance(spec.pose.position) >= 0.45 && collision.nearPlane(spec.pose, camera.aspect) >= 0.15)) {
        gate.fail(t, playing, new Error("The workshop camera is obstructed"));
        playing = false;
        deckPlay();
        set({ playing: false });
        t = clock.t = bd.time = safeTime;
        recording.evaluate(t, spec);
        carStateApplied = applyDirectedFrame(0);
        edit.ready = false;
        edit.accepted = null;
      } else safeTime = t;
    } else if (!gate.pending) safeTime = t;
    if (spec.chapter !== bd.chapter) set({ chapter: spec.chapter });

    // The camera: the recording's, the editor's, or the photo camera's,
    // eased between them so a switch is a move and not a cut.
    const mode = bd.mode;
    const target = !free && (mode === "edit" || mode === "photo") ? 1 : 0;
    edit.k += (target - edit.k) * (1 - Math.exp(-dt * 5));
    if (target && (!edit.ready || edit.chapter !== spec.chapter)) enterEdit();
    if (!target && edit.k < 1e-3) edit.ready = false;
    const inside = !free && spec.garage.active && carStateApplied === true && garageIsReady(world.garage);
    if (inside) edit.k = target;
    if (inside && garageTool && !target) toast("camera", "Recording camera", "Returned to the recorded workshop view.", 2000);
    garageTool = inside && Boolean(target);
    copyPose(view, spec.pose);
    if (edit.ready && edit.k > 1e-4) {
      if (CHAPTERS[spec.chapter].pivot === "car") pivotOf(spec.chapter, edit.pivot);
      const e = editPose(makePoseTmp);
      view.position.lerp(e.position, edit.k);
      view.target.lerp(e.target, edit.k);
      view.fov += (e.fov - view.fov) * edit.k;
      view.shift += (e.shift - view.shift) * edit.k;
    }
    // Free look while playing: a turn of the head about the camera.
    look.yaw += (look.yawGoal - look.yaw) * (1 - Math.exp(-dt * 6));
    look.pitch += (look.pitchGoal - look.pitch) * (1 - Math.exp(-dt * 6));
    if (!look.held) {
      look.yawGoal *= Math.exp(-dt * 1.6);
      look.pitchGoal *= Math.exp(-dt * 1.6);
    }
    if (Math.abs(look.yaw) + Math.abs(look.pitch) > 1e-4) {
      _v.subVectors(view.target, view.position);
      const dist = _v.length();
      const yaw = Math.atan2(_v.x, _v.z) + look.yaw;
      const pitch = clamp(Math.asin(clamp(_v.y / dist, -1, 1)) + look.pitch, -1.2, 1.2);
      view.target.set(
        view.position.x + Math.sin(yaw) * Math.cos(pitch) * dist,
        view.position.y + Math.sin(pitch) * dist,
        view.position.z + Math.cos(yaw) * Math.cos(pitch) * dist,
      );
    }
    copyPose(shown, view);
    // Free roam: the player's car and camera in place of the recording's.
    jolt *= Math.exp(-dt * 7);
    spec.free = free;
    spec.roll = 0;
    spec.afoot = false;
    if (free) {
      // On foot with the mouse held, the scanner looks where the eye does;
      // a card, the journal or photo mode needs the mouse back.
      if (bd.locked && (bd.open || bd.journal || bd.help || mode === "photo")) document.exitPointerLock?.();
      if (bd.locked) scanner.move(0, 0, true);
      roam.frame(dt, spec, shown);
      if (roam.car.knock > 2.5 && bd.mode !== "photo") sounds?.thud(clamp(roam.car.knock / 16, 0, 1));
      // On foot, a step's sound each time a foot comes down: every 0.74 m
      // walking, every 1.15 m at a run.
      const running = roam.walker.speed > 3.5;
      const strides = Math.floor(roam.walker.walked / (running ? 1.15 : 0.74));
      if (spec.afoot && strides !== stride && bd.mode !== "photo") sounds?.step(running ? 1 : 0);
      stride = strides;
    }
    spec.glitch = Math.max(spec.glitch, jolt > 0.01 ? jolt : 0);
    // Photo mode's lens and roll.
    if (mode === "photo") {
      shown.fov = clamp(shown.fov + bd.photo.fov, 12, 90);
      spec.roll = (bd.photo.roll * Math.PI) / 180;
      layers.setFilter(bd.photo.filter);
    } else {
      layers.setFilter("off");
    }
    if (inside) {
      shown.roll = spec.roll;
      // No interpolation is used on tool entry. Every subsequent proposal,
      // including Look, zoom and photo roll, is checked after all changes.
      const from = target && edit.accepted ? edit.accepted : spec.pose;
      if (!constrainGarageCamera(world.garage.collision, from, shown, camera.aspect, makePoseTmp)) {
        copyPose(shown, spec.pose);
        shown.roll = 0;
      } else {
        copyPose(shown, makePoseTmp);
        shown.roll = makePoseTmp.roll;
      }
      spec.roll = shown.roll;
      if (target) {
        edit.accepted ??= makePose();
        copyPose(edit.accepted, shown);
        edit.accepted.roll = shown.roll;
        // Reject blocked input rather than accumulating an orbit behind a wall.
        _v.subVectors(shown.position, edit.pivot);
        edit.radius = _v.length();
        edit.yaw = Math.atan2(_v.x, _v.z);
        edit.pitch = Math.asin(clamp(_v.y / Math.max(1e-3, edit.radius), -1, 1));
      } else edit.accepted = null;
    } else edit.accepted = null;
    tag.setVisible(layers.layer === "thermal");
    if (holocall) {
      const k = clamp((t - HOLO_AT) / 1.4, 0, 1);
      holocall.update(dt, k, camera, t > HOLO_AT && t < HOLO_AT + 0.6 ? 1 : 0);
    }
    if (sounds && playing && dir > 0 && lastT < HOLO_RING && t >= HOLO_RING) sounds.ring();
    lastT = t;
    spec.pose = shown;
    world.placeCamera(shown);
    scanner.update(dt, t, spec);

    // The reconstruction: the city builds out from the car over the
    // first fourteen seconds; scrubbed past it, it is simply there.
    waveT = t;
    const building = waveT < 16 && !reduced && !free;
    const waveR = building ? 1.5 + Math.pow(clamp(waveT / 14, 0, 1), 1.7) * 900 : 5000;
    layers.setWave(spec.carPosition, waveR, building ? 1 : 0, LAYER_COLORS[layers.layer]);
    // Reduced motion: cuts without the glitch.
    if (reduced) spec.glitch = 0;

    // The fill: from above and to the left of the camera, at the car.
    const near = 1 - clamp((shown.position.distanceTo(spec.carPosition) - 6) / 22, 0, 1);
    fill.intensity = spec.garage.active ? 0 : 1.7 * near;
    fill.target.position.copy(spec.carPosition).setY(0.8);
    _v.subVectors(shown.position, spec.carPosition).setY(0).normalize();
    fill.position.copy(spec.carPosition).addScaledVector(_v, 8).add(_up.set(-_v.z * 4, 7, _v.x * 4));

    spec.levels = audio?.levels();
    layers.setOverdrive(bd.overdrive, spec.levels?.bass ?? 0);
    for (const fn of hooks) fn(dt, t, spec, shown);
    layers.update(dt, { rewind: playing && dir < 0 ? 1 : 0, paused: playing || free ? 0 : 1 });
    // Roam or the pre-query application already placed the S4. Preserve
    // the recording spec for consumers without advancing the car at draw.
    const carOnRoad = spec.car;
    if (free || carPlaced) spec.car = null;
    world.renderDirected(dt, spec);
    spec.car = carOnRoad;
    spec.pose = recordingPose;
    if (captureNext) {
      // Read in the same task as the draw: the drawing buffer is only
      // guaranteed until the browser composites it.
      const done = captureNext;
      captureNext = null;
      done(canvas);
    }

    if (sounds) {
      camera.getWorldDirection(_fwd);
      sounds.update(dt, {
        car: { x: spec.carPosition.x, y: spec.carPosition.y, z: spec.carPosition.z, v: playing || free ? spec.car.v : 0, slide: free ? roam.car.slide : 0 },
        cam: camera.position,
        fwd: _fwd,
        playing: playing || free,
        rate: free ? 1 : rate,
        beaconAt: roofBeacon,
      });
      if (spec.shot !== lastShot && spec.glitch > 0.5 && playing && !free) sounds.cut();
    }
    lastShot = spec.shot;

    // For the HUD.
    bd.car.x = spec.carPosition.x;
    bd.car.z = spec.carPosition.z;
    bd.car.heading = spec.carHeading;
    bd.car.speed = spec.car.v;
    bd.camera.x = camera.position.x;
    bd.camera.z = camera.position.z;
    _v.subVectors(shown.target, shown.position);
    bd.camera.yaw = Math.atan2(_v.x, _v.z);
    if (!firstFrame) return;
    if (onFirstFrame) {
      onFirstFrame();
      onFirstFrame = null;
    }
  };
  const makePoseTmp = makePose();
  const recordingPose = spec.pose;

  const start = () => {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  };

  // ---- controls -------------------------------------------------------------
  const api = {
    world,
    parts,
    recording,
    layers,
    scanner,
    audio,
    spec,
    camera,
    /** The minimap's ground: the recording's part of the city, or all of
     *  it while the player roams. */
    get map() {
      return roam?.on && wide ? wide : map;
    },
    start,
    get time() {
      return clock.t;
    },
    /** Frame intervals over the last five seconds or so: p50 and p95, ms. */
    perf() {
      const n = Math.min(nIntervals, intervals.length);
      const a = Array.from(intervals.slice(0, n)).sort((x, y) => x - y);
      const p = (q) => (n ? +a[Math.min(n - 1, Math.floor(q * n))].toFixed(2) : 0);
      return { frames: n, p50: p(0.5), p95: p(0.95), calls: parts.renderer.info.render.calls };
    },
    /** The context woke after the deck was asked to play: start it now. */
    resync() {
      if (roam?.on) radioOn();
      else if (playing && audio && !audio.playing) deckPlay();
    },
    /** Called every frame before the city draws: (dt, t, spec, pose). */
    onFrame(fn) {
      hooks.add(fn);
      return () => hooks.delete(fn);
    },
    play() {
      if (roam?.on) return;
      if (gate.pending) {
        gate.setPlaying(true);
        return;
      }
      if (holdForGarage(clock.t)) {
        gate.setPlaying(true);
        return;
      }
      if (clock.t >= DURATION - 0.05) clock.t = 0;
      unlock("jackin");
      playing = true;
      if (bd.mode === "edit") set({ mode: "play" });
      deckPlay();
      set({ playing: true, ended: false });
    },
    pause() {
      if (roam?.on) return;
      gate.setPlaying(false);
      playing = false;
      deckPlay();
      set({ playing: false });
    },
    toggle() {
      if (playing || gate.pending?.playing) api.pause();
      else api.play();
    },
    seek(t) {
      if (roam?.on) return;
      const into = clamp(t, 0, DURATION);
      if (holdForGarage(into)) return;
      const resume = gate.pending?.playing ?? playing;
      gate.cancel();
      playing = resume;
      edit.ready = false;
      edit.accepted = null;
      look.yaw = look.pitch = look.yawGoal = look.pitchGoal = 0;
      clock.t = into;
      bd.time = clock.t;
      deckPlay();
      set({ playing, ended: clock.t < DURATION ? false : bd.ended });
    },
    /** 1, 2 or 4 times, forward or back. */
    setSpeed(r, d = 1) {
      if (roam?.on) return;
      rate = r;
      dir = d;
      if (gate.pending) {
        gate.setPlaying(true);
        set({ rate: r, direction: d });
        return;
      }
      if (!playing) {
        playing = true;
        set({ playing: true });
      }
      deckPlay();
      set({ rate: r, direction: d });
      if (r >= 4 && d < 0) unlock("tape");
    },
    setLayer(next) {
      if (next === layers.layer) return;
      layers.setLayer(next, camera.position, reduced);
      audio?.setLayer(next);
      sounds?.layer(next);
      set({ layer: next });
      seenLayers.add(next);
      if (seenLayers.size === 3) unlock("layers");
    },
    setMode(mode) {
      // The editor orbits a held moment of the recording: not while roaming.
      if (mode === "edit" && roam?.on) return;
      if (mode === "edit" && (playing || gate.pending?.playing)) api.pause();
      set({ mode });
    },
    /** Drag in edit mode: orbit. Drag while playing: look about. */
    drag(dx, dy) {
      if (roam?.on) roam.drag(dx, dy);
      else if (bd.mode === "edit" || bd.mode === "photo") {
        edit.yaw -= dx * 0.005;
        edit.pitch += dy * 0.004;
        const lim = CHAPTERS[spec.chapter].orbit;
        edit.pitch = clamp(edit.pitch, lim.pitch[0] * DEG, lim.pitch[1] * DEG);
        if (bd.mode === "edit" && Math.abs(dx) + Math.abs(dy) > 2) unlock("editor");
      } else {
        look.yawGoal = clamp(look.yawGoal - dx * 0.0025, -0.7, 0.7);
        look.pitchGoal = clamp(look.pitchGoal + dy * 0.002, -0.35, 0.35);
      }
    },
    hold(on) {
      look.held = on;
      roam?.hold(on);
    },
    /** The held mouse's own movement (on foot in free roam). */
    look(dx, dy) {
      if (roam?.on) roam.look(dx, dy);
    },
    /** The pointer over the city, in normalised device coordinates. */
    pointer(x, y, inside = true) {
      scanner.move(x, y, inside);
    },
    press(on) {
      scanner.press(on);
    },
    zoom(delta) {
      if (roam?.on) roam.zoom(delta);
      else {
        const lim = CHAPTERS[spec.chapter].orbit;
        edit.radius = clamp(edit.radius * Math.exp(delta * 0.001), lim.radius[0], lim.radius[1]);
      }
    },
    get edit() {
      return edit;
    },
    /** Photo mode's shutter: the next frame, stamped, as a PNG download. */
    capture() {
      return new Promise((resolve) => {
        captureNext = (c) => {
          const out = document.createElement("canvas");
          out.width = c.width;
          out.height = c.height;
          const ctx = out.getContext("2d");
          ctx.drawImage(c, 0, 0);
          if (bd.photo.stamp) {
            const s = out.height / 900;
            ctx.save();
            ctx.font = `600 ${Math.round(15 * s)}px "JetBrains Mono Variable", ui-monospace, monospace`;
            ctx.textBaseline = "bottom";
            ctx.fillStyle = "rgba(252,238,10,0.95)";
            ctx.shadowColor = "rgba(0,0,0,0.9)";
            ctx.shadowBlur = 8 * s;
            const line = `ALI_YOUNES.bd  ·  ${fmt(clock.t)}  ·  NIGHT CITY  ·  aliyounes.dev/braindance`;
            ctx.fillText(line.toUpperCase(), 28 * s, out.height - 24 * s);
            ctx.fillRect(28 * s, out.height - 50 * s, 46 * s, 3 * s);
            ctx.restore();
          }
          out.toBlob((blob) => {
            if (!blob) return resolve(false);
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `braindance-${fmt(clock.t).replace(":", "m")}s.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
            unlock("shutter");
            resolve(true);
          }, "image/png");
        };
      });
    },
    /**
     * Free roam: put the recording down and take the S4 (true), or take the
     * recording up again where it was left (false). The first time, its
     * chunk and the builder's exports are fetched, with `bd.roamLoading`
     * saying how far that has got; asking again meanwhile calls it off.
     */
    async setRoam(want = !(roam?.on || bd.roamLoading !== null)) {
      const job = ++roamJob;
      if (!want) {
        set({ roamLoading: null });
        if (!roam?.on) return false;
        roam.leave();
        jolt = reduced ? 0 : 1;
        sounds?.cut();
        if (resumeAfter) api.play();
        else deckPlay();
        return false;
      }
      if (roam?.on) return true;
      try {
        if (!roam) {
          set({ roamLoading: 0 });
          const { createRoam } = await import("./roam/roam.js");
          const made = await createRoam({
            parts,
            world,
            reduced,
            city: recording.city,
            onProgress: (p) => job === roamJob && set({ roamLoading: p }),
          });
          if (disposed) {
            made.dispose();
            return false;
          }
          roam = made;
          const all = bakeHeights(parts, made.bounds);
          wide = { bounds: all.bounds, ppm: all.ppm, canvas: drawMap(all) };
        }
        if (job !== roamJob) return false;
        // The tape stops where it is; the radio plays on.
        resumeAfter = gate.pending?.playing ?? playing;
        playing = false;
        rate = 1;
        dir = 1;
        set({ roamLoading: null, playing: false, rate: 1, direction: 1, mode: "play", open: null, ended: false, help: false, journal: false });
        gate.cancel();
        roam.enter();
        radioOn();
        jolt = reduced ? 0 : 1;
        sounds?.cut();
        return true;
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[braindance] no free roam", err);
        if (job === roamJob) {
          set({ roamLoading: null });
          toast("camera", "Free roam unavailable", "The city could not finish loading. Try Free roam again.", 6000);
        }
        return false;
      }
    },
    get roam() {
      return roam;
    },
    /** The braindance's state (src/braindance/store.js), for whoever holds
     *  the engine and not the module: the playtest harness. */
    get state() {
      return bd;
    },
    setRadio(on) {
      audio?.setRadio(on);
      set({ radio: on });
    },
    setMuted(m) {
      audio?.setMuted(m);
      set({ muted: m });
    },
    dispose() {
      disposed = true;
      gate.cancel();
      notice.remove();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      hooks.clear();
      roamJob++;
      roam?.dispose();
      unhook.forEach((u) => u());
      sounds?.dispose();
      tag.dispose();
      holocall?.dispose();
      audio?.dispose();
      parts.scene.remove(fill, fill.target, fillMirror);
      fill.dispose();
      fillMirror.dispose();
      world.dispose();
      setStage({ mode: "stage" });
    },
  };

  // Before the first real frame, so the canvas never shows a frame of the
  // hero shot the city warmed up on.
  recording.evaluate(0, spec);
  return api;
}
