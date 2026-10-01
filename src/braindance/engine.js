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
import { bd, on, set } from "./store.js";
import { createSounds } from "./sounds.js";
import { createTag } from "./tag.js";
import { createHolocall, preloadHolocall } from "./holocall.js";
import { SIGN_WORDS } from "../data/braindance.js";
import { fmt } from "./format.js";

const DEG = Math.PI / 180;
const _up = new THREE.Vector3();

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
  });
  await world.warm();
  await trackLoading;
  onProgress?.(1);
  const parts = world.parts;
  const { city, camera } = parts;
  const recording = createRecording(city.anchors, city.road);
  layers.setCamera(camera);
  // The car's coloured stage rims are tuned for the page's distances.
  parts.car?.setRims(0.3);

  // A braindance is a reconstruction, and the editor lights what it is
  // looking at: a soft key from over the camera's shoulder onto the car,
  // up close only. The city is lit by its own signs (src/world/glsl.js) and
  // takes no three.js light, so this touches the car and nothing else.
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0);
  fill.name = "bd_fill";
  parts.scene.add(fill, fill.target);
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
    if (c.pivot === "car") return out.copy(spec.carPosition).setY(0.9);
    return out.fromArray(c.pivot);
  };
  /** Start orbiting from wherever the recording's camera is now. */
  const enterEdit = () => {
    pivotOf(spec.chapter, edit.pivot);
    _v.subVectors(spec.pose.position, edit.pivot);
    const lim = CHAPTERS[spec.chapter].orbit;
    edit.radius = clamp(_v.length(), lim.radius[0], lim.radius[1]);
    edit.yaw = Math.atan2(_v.x, _v.z);
    edit.pitch = clamp(Math.asin(clamp(_v.y / Math.max(1e-3, _v.length()), -1, 1)), lim.pitch[0] * DEG, lim.pitch[1] * DEG);
    edit.fov = spec.pose.fov;
    edit.ready = true;
  };
  const editPose = (out) => {
    const lim = CHAPTERS[spec.chapter].orbit;
    edit.radius = clamp(edit.radius, lim.radius[0], lim.radius[1]);
    edit.pitch = clamp(edit.pitch, lim.pitch[0] * DEG, lim.pitch[1] * DEG);
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
    out.shift = 0;
    return out;
  };

  // ---- the loop -------------------------------------------------------------
  let raf = 0;
  let last = 0;
  let disposed = false;
  let waveT = 0;
  let flowT = 0;
  let lastT = 0;
  const hooks = new Set();

  const intervals = new Float32Array(300);
  let nIntervals = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (last) intervals[nIntervals++ % intervals.length] = now - last;
    const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
    last = now;
    if (document.hidden) return;

    // Time.
    let t = steer(dt);
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
    spec.flow = t - flowT;
    flowT = t;
    clock.t = t;
    bd.time = t;

    recording.evaluate(t, spec);
    if (spec.chapter !== bd.chapter) set({ chapter: spec.chapter });

    // The camera: the recording's, the editor's, or the photo camera's,
    // eased between them so a switch is a move and not a cut.
    const mode = bd.mode;
    const target = mode === "edit" || mode === "photo" ? 1 : 0;
    edit.k += (target - edit.k) * (1 - Math.exp(-dt * 5));
    if (target && !edit.ready) enterEdit();
    if (!target && edit.k < 1e-3) edit.ready = false;
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
    // Photo mode's lens and roll.
    if (mode === "photo") {
      shown.fov = clamp(shown.fov + bd.photo.fov, 12, 90);
      spec.roll = (bd.photo.roll * Math.PI) / 180;
      layers.setFilter(bd.photo.filter);
    } else {
      spec.roll = 0;
      layers.setFilter("off");
    }
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
    const waveR = waveT < 16 && !reduced ? 1.5 + Math.pow(clamp(waveT / 14, 0, 1), 1.7) * 900 : 5000;
    layers.setWave(spec.carPosition, waveR, waveT < 16 && !reduced ? 1 : 0, LAYER_COLORS[layers.layer]);
    // Reduced motion: cuts without the glitch.
    if (reduced) spec.glitch = 0;

    // The fill: from above and to the left of the camera, at the car.
    const near = 1 - clamp((shown.position.distanceTo(spec.carPosition) - 6) / 22, 0, 1);
    fill.intensity = 1.7 * near;
    fill.target.position.copy(spec.carPosition).setY(0.8);
    _v.subVectors(shown.position, spec.carPosition).setY(0).normalize();
    fill.position.copy(spec.carPosition).addScaledVector(_v, 8).add(_up.set(-_v.z * 4, 7, _v.x * 4));

    spec.levels = audio?.levels();
    layers.setOverdrive(bd.overdrive, spec.levels?.bass ?? 0);
    for (const fn of hooks) fn(dt, t, spec, shown);
    layers.update(dt, { rewind: playing && dir < 0 ? 1 : 0, paused: playing ? 0 : 1 });
    world.renderDirected(dt, spec);
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
        car: { x: spec.carPosition.x, z: spec.carPosition.z, v: playing ? spec.car.v : 0 },
        cam: camera.position,
        fwd: _fwd,
        playing,
        rate,
        beaconAt: roofBeacon,
      });
      if (spec.shot !== lastShot && spec.glitch > 0.5 && playing) sounds.cut();
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
    map,
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
      if (playing && audio && !audio.playing) deckPlay();
    },
    /** Called every frame before the city draws: (dt, t, spec, pose). */
    onFrame(fn) {
      hooks.add(fn);
      return () => hooks.delete(fn);
    },
    play() {
      if (clock.t >= DURATION - 0.05) clock.t = 0;
      unlock("jackin");
      playing = true;
      if (bd.mode === "edit") set({ mode: "play" });
      deckPlay();
      set({ playing: true, ended: false });
    },
    pause() {
      playing = false;
      deckPlay();
      set({ playing: false });
    },
    toggle() {
      if (playing) api.pause();
      else api.play();
    },
    seek(t) {
      clock.t = clamp(t, 0, DURATION);
      bd.time = clock.t;
      deckPlay();
      if (clock.t < DURATION) set({ ended: false });
    },
    /** 1, 2 or 4 times, forward or back. */
    setSpeed(r, d = 1) {
      rate = r;
      dir = d;
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
      if (mode === "edit" && playing) api.pause();
      set({ mode });
    },
    /** Drag in edit mode: orbit. Drag while playing: look about. */
    drag(dx, dy) {
      if (bd.mode === "edit" || bd.mode === "photo") {
        edit.yaw -= dx * 0.005;
        edit.pitch += dy * 0.004;
        if (bd.mode === "edit" && Math.abs(dx) + Math.abs(dy) > 2) unlock("editor");
      } else {
        look.yawGoal = clamp(look.yawGoal - dx * 0.0025, -0.7, 0.7);
        look.pitchGoal = clamp(look.pitchGoal + dy * 0.002, -0.35, 0.35);
      }
    },
    hold(on) {
      look.held = on;
    },
    /** The pointer over the city, in normalised device coordinates. */
    pointer(x, y, inside = true) {
      scanner.move(x, y, inside);
    },
    press(on) {
      scanner.press(on);
    },
    zoom(delta) {
      edit.radius *= Math.exp(delta * 0.001);
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
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      hooks.clear();
      unhook.forEach((u) => u());
      sounds?.dispose();
      tag.dispose();
      holocall?.dispose();
      audio?.dispose();
      parts.scene.remove(fill, fill.target);
      fill.dispose();
      world.dispose();
      setStage({ mode: "stage" });
    },
  };

  // Before the first real frame, so the canvas never shows a frame of the
  // hero shot the city warmed up on.
  recording.evaluate(0, spec);
  return api;
}
