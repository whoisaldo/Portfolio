// src/world/world-scene.js: the city behind the page.
//
// One renderer, one scene, one camera, for the whole cinematic shell. The
// page used to sit on a still plate over black sections; this is the plate
// made live and extended under every section, with a camera that holds a
// shot per section and flies between them as the reader scrolls. It is a
// lazy chunk (src/world/load.js) and never part of first paint: the plate is
// the first paint, and this crossfades over it on its first real frame.
//
// Same shape as createDriftScene and createGarageScene: build on a canvas,
// get back a handful of methods, dispose everything on the way out.
//
// The frame loop is its own and it is cheap to stop. It does not run while
// the tab is hidden, while something opaque covers the page (the door, the
// console, the expanded deck, the garage's own 3D viewer), or while the
// intro is driving (see renderCinematic), and `renderer.info.render.frame`
// stops advancing when it is not.
//
// The music reaches the city the same way it reaches the page's chrome, but
// without CSS: getLevels() read in this loop and smoothed with the same
// asymmetric attack and decay src/lib/reactive.js uses. Silence is stillness.
import * as THREE from "three";
import { stage, subscribeStage } from "./stage.js";
import { createShots, makePose, copyPose, driftPose, clamp, easeInOut } from "./shots.js";
import { TIERS, ADAPT } from "./quality.js";
import { createSharedUniforms } from "./glsl.js";
import { createCity, preloadCity, REFLECT_LAYER, MIRROR_LAYER } from "./city.js";
import { preloadHolo } from "./holo.js";
import { preloadMoon } from "./moon.js";
import { preloadAds } from "./ads.js";
import { createKoi, preloadKoi } from "./koi.js";
import { createCrowd } from "./crowd.js";
import { createSteam } from "./steam.js";
import { createVoxelMoon, moonPhase, preloadVoxelMoon } from "./voxel-moon.js";
import { markLoaded } from "./progress.js";
import { createMirror } from "./mirror.js";
import { createPost } from "./post.js";
import { createSkyline } from "./skyline.js";
import { createRain } from "./rain.js";
import { createTraffic } from "./traffic.js";
import { createCar } from "./car.js";
import { createClearance } from "./clearance.js";
import { createShafts } from "./shafts.js";
import { LIGHT_BOUNDS } from "./spill.js";
import { preloadCar } from "../three/car/object.js";
import { getEnv } from "../lib/env.js";
import { getLevels } from "../lib/ambient.js";
import { DROP, HANDOFF, REVEAL } from "../lib/cues.js";
import { boards as BOARDS, SHOTS } from "../data/world.js";

/** Everything the scene needs before it can be built. */
export async function preloadWorld(tier) {
  // Each marked as it lands, for the door's list (src/world/progress.js).
  const step = (key, p) => p.then((v) => (markLoaded(key), v));
  // The voxel moon is the one piece the city can do without: a missing
  // Earth picture leaves the intro on its painted moon, not the site on its
  // poster.
  await Promise.all([
    step("city", preloadCity(tier)),
    step("holo", preloadHolo()),
    step("moon", preloadMoon()),
    step("ads", preloadAds()),
    step("koi", preloadKoi()),
    step("car", preloadCar()),
    step("voxel", preloadVoxelMoon()).catch(() => null),
  ]);
}

const DEG = Math.PI / 180;
// The wet road's mirror at full (road.js's own uReflectGain).
const REFLECT_GAIN = 2.2;

export function createWorldScene(canvas, { tier = "high", onFirstFrame, onLost, reduced = false, effects = [] } = {}) {
  const quality = { ...TIERS[tier] };
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x050506, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Tone mapping is the last effect in the post chain (src/world/post.js).
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  // Counted per frame (every pass: mirror, scene, post), not per render call.
  renderer.info.autoReset = false;
  // Reading a program's log to check it waits for the GPU to finish
  // building it, on the first frame that uses it: worth it while working
  // on the shaders, not on a reader's first strike of the meteor.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2400);
  camera.layers.enable(REFLECT_LAYER);
  const shared = createSharedUniforms(THREE);

  let city = null;
  let shots = null;
  let skyline = null;
  let rain = null;
  let traffic = null;
  let car = null;
  let shafts = null;
  let koi = null;
  let crowd = null;
  let steam = null;
  let moon = null;
  let mirror = quality.reflection ? createMirror(renderer, { size: quality.reflection, layers: [REFLECT_LAYER, MIRROR_LAYER] }) : null;
  const post = createPost(renderer, scene, camera, quality, { extra: effects });

  const building = createCity(scene, renderer, shared, { tier, quality, reduced }).then((c) => {
    city = c;
    const clearance = createClearance(c.root, LIGHT_BOUNDS, (o) => /^(moon_disc|holo_figure)/.test(o.name));
    shots = createShots(c.anchors, clearance);
    const keepOut = [...c.anchors].filter(([n]) => n.startsWith("anchor_mega_")).map(([, a]) => {
      const r = (a.extras?.size ?? 50) / 2;
      return [a.position.x - r, a.position.z - r, a.position.x + r, a.position.z + r];
    });
    skyline = createSkyline(scene, shared, {
      count: tier === "phone" ? 1200 : 2600,
      keepOut,
      reduced,
      facades: [c.maps.facade_t0, c.maps.facade_t1, c.maps.facade_t2],
    });
    rain = createRain(scene, shared, { count: quality.rain, reduced });
    const shelter = c.anchors.get("anchor_shelter_garage");
    const size = shelter?.extras?.size;
    if (shelter && size) rain.setShelter(shelter.position, shelter.position.clone().add(new THREE.Vector3(...size)));
    traffic = createTraffic(scene, shared, { avs: quality.avs, cars: quality.cars, reduced, reflectLayer: REFLECT_LAYER, rail: c.anchors.get("anchor_rail") });
    car = createCar(scene, renderer, { road: c.road, anchors: c.anchors, light: c.light, layer: REFLECT_LAYER, mirrorLayer: MIRROR_LAYER, tier });
    shafts = createShafts(scene, c.anchors, shared);
    crowd = createCrowd(scene, shared, { count: tier === "phone" ? 16 : 40, reduced, reflectLayer: REFLECT_LAYER });
    steam = createSteam(scene, shared, c.anchors, { reduced });
    steam?.setLights(c.roofLights);
    resize();
    return Promise.all([
      createKoi(scene, shared, { reduced, reflectLayer: REFLECT_LAYER }),
      car.ready,
      createVoxelMoon(renderer, shared, { tier }).catch((err) => {
        if (import.meta.env.DEV) console.warn("[world] no voxel moon; the intro keeps its painted one", err);
        return null;
      }),
    ]).then(([k, , m]) => {
      koi = k;
      fitKoi();
      moon = m;
      if (m) post.setMoon(m.scene, m.camera);
      return c;
    });
  });

  // The lens: its field of view, and a vertical shift (see makePose). The
  // shift moves the frustum, not the camera, so a level camera keeps its
  // verticals vertical with its horizon above the middle of the frame.
  let lensShift = 0;
  const project = () => {
    camera.updateProjectionMatrix();
    if (lensShift) {
      camera.projectionMatrix.elements[9] = -lensShift;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
  };

  // ---- size ---------------------------------------------------------------
  let width = 1;
  let height = 1;
  let aspect = 1;
  let pixelScale = 1;
  // The koi's loop for this screen, from the hero's own lens (koi.js).
  const heroFit = makePose();
  const fitKoi = () => {
    if (!koi || !shots) return;
    shots.poseOf("hero", 0, aspect, heroFit);
    koi.fit(heroFit, aspect);
  };
  const resize = () => {
    width = Math.max(1, canvas.clientWidth || window.innerWidth);
    height = Math.max(1, canvas.clientHeight || window.innerHeight);
    aspect = width / height;
    // Pixels are the budget: a device pixel ratio cap per tier, and a cap on
    // the total so a 4K monitor does not render four times a laptop's work.
    const ratio = Math.min(window.devicePixelRatio || 1, quality.dpr, Math.sqrt(quality.pixels / (width * height))) * pixelScale;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    post.setSize(width, height);
    rain?.setViewHeight(height * ratio);
    camera.aspect = aspect;
    project();
    // The moon's size for this screen, about its own centre.
    const size = SHOTS.contact?.moon;
    const anchor = city?.anchors.get("anchor_moon");
    if (city?.moonDisc && size && anchor) {
      city.moonDisc.place(anchor.position, (anchor.extras?.radius ?? 150) * (aspect < 1 ? size.portrait : size.scale));
    }
    fitKoi();
  };
  resize();
  window.addEventListener("resize", resize);

  // ---- the camera rig -------------------------------------------------------
  // The pose the camera is at, the pose the stage asks for, and a damped
  // step between them each frame: pos += (goal - pos) * (1 - e^(-dt k)).
  const pose = makePose();
  const want = makePose();
  let posed = false;
  let lastPosition = 0;
  let glitch = 0;
  // The intro's own glitch envelope while it drives this scene, else -1.
  let cineGlitch = -1;
  const tilt = { x: 0, y: 0 };
  // The hero's hand: a sway of a fraction of a degree and a slow push up the
  // avenue, while it holds (never with reduced motion).
  const hand = { yaw: 0, pitch: 0, roll: 0 };

  // A camera on the move: it banks into a turn, as a drone or a helicopter
  // does (roll follows the rate the heading swings at, a few degrees at
  // most), and the lens opens a little with speed. Both are read off the
  // pose itself, so a scrolled flight and a route's flight get them alike,
  // and both settle to nothing when the camera holds.
  const motion = { yaw: null, roll: 0, widen: 0, at: new THREE.Vector3() };
  const _dir = new THREE.Vector3();
  const moveCamera = (dt, snapped) => {
    _dir.subVectors(pose.target, pose.position);
    const yaw = Math.atan2(_dir.x, _dir.z);
    if (motion.yaw === null || snapped || dt <= 0 || reduced) {
      motion.yaw = yaw;
      motion.at.copy(pose.position);
      motion.roll = 0;
      motion.widen = 0;
      return;
    }
    let dy = yaw - motion.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    motion.yaw = yaw;
    const speed = motion.at.distanceTo(pose.position) / dt;
    motion.at.copy(pose.position);
    const bank = clamp((-dy / dt) * 0.09, -0.11, 0.11);
    const widen = clamp((speed - 6) / 70, 0, 1) * 5;
    const a = 1 - Math.exp(-dt * 2.5);
    motion.roll += (bank - motion.roll) * a;
    motion.widen += (widen - motion.widen) * a;
  };

  const applyPose = (p, withTilt) => {
    camera.position.copy(p.position);
    camera.lookAt(p.target);
    if (withTilt) {
      camera.rotateY(-tilt.x * 1.4 * DEG + hand.yaw);
      camera.rotateX(-tilt.y * 0.9 * DEG + hand.pitch);
      camera.rotateZ(hand.roll + motion.roll);
    }
    const fov = p.fov + (withTilt ? motion.widen : 0);
    if (Math.abs(camera.fov - fov) > 1e-4 || Math.abs(lensShift - p.shift) > 1e-5) {
      camera.fov = fov;
      lensShift = p.shift;
      project();
    }
  };

  // The car first: a flight that follows it looks at where it is now. On a
  // case study it waits where that page's shot can see it: in the plaza for
  // a project, under the role's tower on corpo row.
  const driveCar = (dt, jump) => {
    if (!car) return;
    const ids = stage.shots.map((x) => x.id);
    const home = stage.route.kind === "home";
    car.drive(dt, { ids, position: home ? stage.position : 0, locals: stage.locals, aspect, jump, goal: home ? null : car.routeGoal(stage.route) });
  };

  // A route change has no scroll to drive it, so it flies on the clock:
  // from wherever the camera is to the new route's shot, over ROUTE_FLIGHT
  // seconds, on the same up-across-down path a scrolled flight takes, with
  // the glitch at its middle.
  const ROUTE_FLIGHT = 1.8;
  const routeKey = () => `${stage.route.kind}:${stage.route.slug ?? ""}`;
  let lastRoute = null;
  let flight = null;
  const dest = makePose();

  // Corpo row's dolly runs along the row with the reader, and while a card
  // is being read it goes to that card's tower instead, a little left of
  // it so the tower stands right of centre: the lit crown and its beams in
  // frame, whichever role it is. Eased, so reading down the cards is one
  // move along the row and not a string of cuts.
  const EXP_DOLLY = { x0: 190, x1: 400, lead: 22 };
  const dolly = { at: null, locals: [] };
  const localsFor = (ids, dt) => {
    const i = ids.indexOf("experience");
    if (i < 0 || !city) return stage.locals;
    const xs = stage.activeRoles.map((slug) => city.anchors.get(`anchor_tower_${slug}`)?.position.x).filter((x) => x !== undefined);
    // The shot eases its local (shots.js); a tower's place is where the
    // eased dolly must land, so it is un-eased here.
    const unease = (e) => (e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);
    const want = xs.length
      ? unease(clamp((xs.reduce((a, b) => a + b, 0) / xs.length - EXP_DOLLY.x0 - EXP_DOLLY.lead) / (EXP_DOLLY.x1 - EXP_DOLLY.x0), 0, 1))
      : clamp(stage.locals[i] ?? 0, 0, 1);
    if (dolly.at === null || !posed || reduced) dolly.at = want;
    else dolly.at += (want - dolly.at) * (1 - Math.exp(-dt * 1.6));
    dolly.locals.length = 0;
    dolly.locals.push(...stage.locals);
    dolly.locals[i] = dolly.at;
    return dolly.locals;
  };

  const aim = (dt = 0) => {
    const ids = stage.shots.map((s) => s.id);
    const home = stage.route.kind === "home";
    if (!shots) driftPose(aspect, dest);
    else if (!home) shots.routePose(stage.route, aspect, dest);
    else if (!ids.length) shots.poseOf("hero", 0, aspect, dest);
    else shots.goal(ids, stage.position, localsFor(ids, dt), aspect, dest, car?.car.position);

    const key = routeKey();
    if (lastRoute !== null && key !== lastRoute && shots && posed) {
      flight = { from: copyPose(makePose(), pose), t: 0, glitched: false };
    }
    lastRoute = key;
    if (flight && shots) {
      flight.t += dt;
      const e = easeInOut(clamp(flight.t / ROUTE_FLIGHT, 0, 1));
      shots.open(flight.from, dest, e, want);
      if (!flight.glitched && flight.t >= ROUTE_FLIGHT / 2) {
        flight.glitched = true;
        glitch = 1;
      }
      if (flight.t >= ROUTE_FLIGHT) flight = null;
    } else {
      copyPose(want, dest);
    }
  };

  // On a landscape screen the Experience cards fill the page edge to edge
  // but for a strip on the right, so while a card is being read the camera
  // turns until that card's tower stands in the strip, its lit crown a
  // third of the way down and its beams beside the card. Eased in
  // and out with the card; a phone's single column leaves no strip and
  // keeps the plain framing.
  const TOWER_AT = 0.88;
  const towerAim = { k: 0, at: new THREE.Vector3(), has: false };
  const _tf = new THREE.Vector3();
  const _td = new THREE.Vector3();
  const _th = new THREE.Vector3();
  const aimTower = (dt) => {
    const i = stage.shots.findIndex((x) => x.id === "experience");
    const slug = stage.activeRoles[0];
    const anchor = slug ? city?.anchors.get(`anchor_tower_${slug}`) : null;
    if (anchor) {
      towerAim.at.copy(anchor.position);
      towerAim.has = true;
    }
    const held = i >= 0 && stage.route.kind === "home" && !flight && aspect > 1 && !reduced ? clamp(1 - Math.abs(stage.position - i) * 2.5, 0, 1) : 0;
    const goal = anchor ? held : 0;
    towerAim.k += (goal - towerAim.k) * (1 - Math.exp(-dt * 1.6));
    if (towerAim.k < 1e-3 || !towerAim.has) return;
    _tf.subVectors(want.target, want.position);
    const dist = _tf.length();
    // And tilted so the crown stands a third of the way down the frame,
    // under the navigation rather than behind it.
    _td.subVectors(towerAim.at, want.position);
    const rise = Math.atan2(_td.y, Math.hypot(_td.x, _td.z));
    const crownPitch = rise - Math.atan(0.36 * Math.tan((want.fov * DEG) / 2));
    const pitch0 = Math.asin(clamp(_tf.y / dist, -1, 1));
    const pitch = pitch0 + (crownPitch - pitch0) * towerAim.k;
    _td.setY(0).normalize();
    // The turn that puts the crown at TOWER_AT across the frame with the
    // camera pitched (a pitched camera draws an off-axis point nearer the
    // middle): solve sin(t)cos(e) = a (cos(t)cos(e)cos(p) + sin(e)sin(p)).
    const a = TOWER_AT * Math.tan((want.fov * DEG) / 2) * aspect;
    const A = Math.cos(rise);
    const B = a * Math.cos(rise) * Math.cos(pitch);
    const C = a * Math.sin(rise) * Math.sin(pitch);
    const turn = Math.atan2(B, A) + Math.asin(clamp(C / Math.hypot(A, B), -1, 1));
    // Left of the tower by `turn`, so the tower stands right of centre.
    const fx = _td.x * Math.cos(turn) + _td.z * Math.sin(turn);
    const fz = _td.z * Math.cos(turn) - _td.x * Math.sin(turn);
    _th.set(_tf.x, 0, _tf.z).normalize().lerp(_td.set(fx, 0, fz), towerAim.k).normalize();
    want.target.copy(want.position).addScaledVector(_th, Math.cos(pitch) * dist).add(_td.set(0, Math.sin(pitch) * dist, 0));
  };

  // While the hero holds (it is the first shot, so the stage's position is
  // how far the reader has left it), the camera breathes: up to a metre's
  // push up the avenue over forty seconds and back, and a hand-held sway.
  let handClock = 0;
  const _look = new THREE.Vector3();
  const holdHero = (dt) => {
    const home = stage.route.kind === "home" && stage.shots[0]?.id === "hero" && !flight;
    // The hero in full; every other shot, while it holds, at a third of it.
    const f = stage.position - Math.round(stage.position);
    const held = clamp(1 - Math.abs(f) * 4, 0, 1);
    const k = reduced || !home ? 0 : Math.max(clamp(1 - stage.position * 1.5, 0, 1), held * 0.35);
    handClock += dt;
    const t = handClock;
    hand.yaw = k * 0.2 * DEG * (Math.sin(t * 0.31) + 0.5 * Math.sin(t * 0.73 + 1.3)) / 1.5;
    hand.pitch = k * 0.12 * DEG * (Math.sin(t * 0.23 + 0.4) + 0.5 * Math.sin(t * 0.61 + 2.1)) / 1.5;
    hand.roll = k * 0.15 * DEG * Math.sin(t * 0.19 + 0.7);
    if (k > 0) {
      _look.subVectors(want.target, want.position).normalize();
      const push = k * (0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 40));
      want.position.addScaledVector(_look, push);
      want.target.addScaledVector(_look, push);
    }
  };

  // A frame asked for from outside (renderDirected, the braindance): what it
  // says overrides what the stage says, for that frame only.
  let directed = null;

  /** Which Work entry the plaza's board shows: the deck's, or a case study's own. */
  const activeBoard = () => {
    if (directed) return directed.board ?? 0;
    if (stage.route.kind !== "project") return stage.activeProject;
    const i = BOARDS.findIndex((b) => b.slug === stage.route.slug);
    return i >= 0 ? i : stage.activeProject;
  };
  const activeTowers = () => (directed ? directed.towers ?? [] : stage.route.kind === "role" ? [stage.route.slug] : stage.activeRoles);
  // How much of the wet road the camera sees, 0..1, from the shots' own
  // `mirror` flags: the hero and the garage's street show it, the rest look
  // over it or away. A flight between two shots eases from one to the other.
  const roadShown = () => {
    if (directed) return directed.mirror ?? 0;
    if (stage.route.kind !== "home") return 0;
    const ids = stage.shots.map((x) => x.id);
    if (!ids.length) return 1;
    const i = clamp(Math.floor(stage.position), 0, ids.length - 1);
    const j = Math.min(i + 1, ids.length - 1);
    const a = SHOTS[ids[i]]?.mirror ? 1 : 0;
    const b = SHOTS[ids[j]]?.mirror ? 1 : 0;
    return a + (b - a) * THREE.MathUtils.smoothstep(stage.position - i, 0.15, 0.85);
  };

  const step = (dt) => {
    // A jump of more than a shot in one frame is a deep link or a long nav
    // jump: land on it, with a glitch to say so, rather than fly across the
    // whole city in half a second. The car lands on its stop with it.
    const routeChanged = lastRoute !== null && routeKey() !== lastRoute;
    const jumped = !routeChanged && !flight && Math.abs(stage.position - lastPosition) > 1.2;
    driveCar(dt, !posed || jumped);
    aim(dt);
    aimTower(dt);
    holdHero(dt);
    // Crossing the middle of a flight fires the braindance glitch.
    if (Math.floor(stage.position + 0.5) !== Math.floor(lastPosition + 0.5)) glitch = 1;
    lastPosition = stage.position;
    if (!posed || jumped) {
      copyPose(pose, want);
      posed = true;
      if (jumped) glitch = 1;
    } else {
      const a = 1 - Math.exp(-dt * 4.5);
      pose.position.lerp(want.position, a);
      pose.target.lerp(want.target, a);
      pose.fov += (want.fov - pose.fov) * a;
      pose.shift += (want.shift - pose.shift) * a;
    }
    moveCamera(dt, jumped);
    const t = 1 - Math.exp(-dt * 3);
    tilt.x += (stage.pointer.x - tilt.x) * t;
    tilt.y += (stage.pointer.y - tilt.y) * t;
    applyPose(pose, true);
  };

  // ---- the music and the switches ---------------------------------------------
  let bass = 0;
  let level = 0;
  // Lightning, far off in the cloud, now and then: one or two quick pulses
  // a quarter of a second or more apart, then nothing for twenty to fifty
  // seconds. Never with reduced motion, and never a white screen: a patch
  // of cloud lights from inside and the haze lifts a little, well inside
  // three flashes a second.
  const storm = { next: 14 + Math.random() * 16, pulses: [], t: 0 };
  const _strikeDir = new THREE.Vector3();
  const flash = (dt) => {
    if (reduced) return;
    storm.t += dt;
    if (storm.t >= storm.next) {
      storm.t = 0;
      storm.next = 20 + Math.random() * 30;
      const n = Math.random() < 0.6 ? 2 : 1;
      storm.pulses = Array.from({ length: n }, (_, i) => ({ at: i * (0.26 + Math.random() * 0.2), k: i === 0 ? 1 : 0.5 + Math.random() * 0.4 }));
      // Somewhere in front of the camera, where it can be seen.
      camera.getWorldDirection(_strikeDir);
      const a = Math.atan2(_strikeDir.z, _strikeDir.x) + (Math.random() - 0.5) * 1.4;
      const r = 500 + Math.random() * 900;
      shared.uFlashAt.value.set(camera.position.x + Math.cos(a) * r, camera.position.z + Math.sin(a) * r);
    }
    let f = 0;
    for (const p of storm.pulses) {
      const u = storm.t - p.at;
      if (u >= 0) f = Math.max(f, p.k * Math.exp(-u * 16) * Math.min(1, u * 60));
    }
    shared.uFlash.value = f;
  };

  const drive = (dt) => {
    flash(dt);
    const env = getEnv();
    if (env.reactive) {
      const now = directed?.levels ?? getLevels();
      bass += (now.bass - bass) * (now.bass > bass ? 0.7 : 0.12);
      level += (now.level - level) * (now.level > level ? 0.4 : 0.1);
    } else {
      bass = 0;
      level = 0;
    }
    shared.uBass.value = bass;
    shared.uLevel.value = level;
    shared.uHaze.value += ((env.haze ? 1 : 0) - shared.uHaze.value) * Math.min(1, dt * 4);
    if (city) {
      city.setSignsVisible(env.signs);
      city.setWet(env.wet);
      for (const r of city.roadMaterials) r.uniforms.uWet.value = env.wet ? 1 : 0;
    }
    steam?.setSigns(env.signs);
    glitch *= Math.exp(-dt * 6);
    post.setGlitch(cineGlitch >= 0 ? cineGlitch : glitch, bass);
    return env;
  };

  // ---- the loop -------------------------------------------------------------
  let raf = 0;
  let last = 0;
  let clock = 0;
  let firstFrame = false;
  let disposed = false;
  const times = new Float32Array(240);
  let timeIndex = 0;

  // `moonView` is the intro's voxel moon (see renderCinematic): null for the
  // city alone, "only" for the moon alone, "over" for the moon over the city.
  const draw = (dt, moonView = null) => {
    renderer.info.reset();
    clock += dt;
    shared.uTime.value = clock;
    shared.uCam.value.copy(camera.position);
    const env = drive(dt);
    if (moonView) moon.renderShadows();
    if (moonView !== "only") {
      skyline?.update(camera, renderer.getPixelRatio());
      rain?.update(dt, camera, env.wet);
      shafts?.update(shared.uHaze.value);
      koi?.update(dt);
      traffic?.update(dt, env.traffic);
      city?.boards.update(dt, activeBoard());
      city?.towers.update(dt, activeTowers());
      city?.logos.update(dt, activeTowers());
      if (directed) {
        // The door's position in the stage's own terms: garage index 1, the
        // door opening over 0.16 to 0.30, the tubes struck from 0.5.
        const g = directed.garage ?? {};
        city?.garage.update(dt, g.tubes ? 0.55 : 0.16 + 0.14 * clamp(g.door ?? 0, 0, 1), 1);
      } else {
        city?.garage.update(dt, stage.position, stage.route.kind === "home" ? stage.shots.findIndex((s) => s.id === "garage") : -1);
      }
      // The wet road's mirror, only while a shot shows the road (`mirror`
      // in src/data/world.js): over a flight away it fades into the baked
      // streaks, as the adaptive pass's shed does, and once it has gone it
      // is not drawn. How far either has taken it is k.
      const k = mirror ? Math.max(1 - roadShown(), adapt.reflectK) : 1;
      if (city) {
        for (const r of city.roadMaterials) {
          r.uniforms.uReflectGain.value = REFLECT_GAIN * (1 - k);
          r.uniforms.uStreakGain.value = 0.1 + k;
        }
      }
      if (mirror && city && env.wet && k < 1) {
        camera.updateMatrixWorld();
        const drew = mirror.render(scene, camera);
        for (const r of city.roadMaterials) r.setReflection(drew ? mirror.texture : null, mirror.matrix, mirror.horizonV);
      } else if (city) {
        for (const r of city.roadMaterials) r.setReflection(null);
      }
    }
    post.view(moonView);
    post.render(dt);
    if (!firstFrame) {
      firstFrame = true;
      onFirstFrame?.();
    }
  };

  // ---- adaptive quality -----------------------------------------------------
  // The first two seconds the page is up (after the intro, or after the door
  // when there is none) are timed. A p95 frame interval over the tier's
  // budget, with GRACE_MS for the display's own jitter, sheds one thing and
  // times again: pixels first, then the reflection, then half the rain
  // (ADAPT in quality.js). A step is kept only if it helped: without GPU
  // timing a display running at 30 Hz (Low Power Mode, a battery saver)
  // looks like an overloaded one, and there shedding changes nothing, so a
  // step that did not bring the p95 down by a sixth is given back and the
  // next one tried. The reflection fades out into the baked streaks before its
  // pass stops (and back in if it is given back), so the road does not pop;
  // the pixels change under a flick of the braindance glitch.
  const GRACE_MS = 3;
  const adapt = { armed: true, sampling: false, t: 0, samples: [], shed: [], tried: [], p95: null, fade: null, reflectK: 0, trial: null };
  const startSampling = () => {
    adapt.sampling = true;
    adapt.t = -0.3;
    adapt.samples.length = 0;
  };
  const shed = (what) => {
    adapt.shed.push(what);
    if (what === "pixels") {
      pixelScale = 0.75;
      resize();
      glitch = Math.max(glitch, 0.55);
    }
    if (what === "reflection" && mirror) adapt.fade = { t: 0, to: 1 };
    if (what === "rain") rain?.setCount(Math.round(quality.rain / 2));
  };
  const restore = (what) => {
    adapt.shed = adapt.shed.filter((w) => w !== what);
    if (what === "pixels") {
      pixelScale = 1;
      resize();
      glitch = Math.max(glitch, 0.55);
    }
    if (what === "reflection" && mirror) adapt.fade = { t: 0, to: 0 };
    if (what === "rain") rain?.setCount(quality.rain);
  };
  const nextStep = () => ADAPT.find((w) => !adapt.shed.includes(w) && !adapt.tried.includes(w) && (w !== "reflection" || mirror));
  const sample = (dt, interval) => {
    if (adapt.fade && city) {
      adapt.fade.t += dt;
      const k = Math.min(1, adapt.fade.t / 0.8);
      adapt.reflectK = adapt.fade.to ? k : Math.min(adapt.reflectK, 1 - k);
      if (k >= 1) adapt.fade = null;
    }
    if (!adapt.sampling) return;
    adapt.t += dt;
    if (adapt.t > 0 && interval > 0) adapt.samples.push(interval);
    if (adapt.t < 2) return;
    adapt.sampling = false;
    const sorted = adapt.samples.slice().sort((a, b) => a - b);
    adapt.p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : null;
    if (adapt.p95 === null) return;
    const trial = adapt.trial;
    adapt.trial = null;
    if (trial) {
      if (adapt.p95 > trial.before * 0.85) {
        // It did not help: give it back, and try the next step instead
        // (a page held up by its scripts is helped by losing the mirror's
        // second pass, not by losing pixels).
        restore(trial.what);
        adapt.tried.push(trial.what);
        adapt.p95 = trial.before;
      }
      // It helped: a shed reflection's pass can go now.
      else if (trial.what === "reflection" && mirror) {
        mirror.dispose();
        mirror = null;
      }
    }
    const next = nextStep();
    if (adapt.p95 > quality.budgetMs + GRACE_MS && next) {
      adapt.trial = { what: next, before: adapt.p95 };
      shed(next);
      startSampling();
    }
  };

  /** Shed the next quality step now (what the adaptive pass would do). */
  const setQuality = (what = nextStep()) => {
    if (what && !adapt.shed.includes(what)) shed(what);
    return [...adapt.shed];
  };

  const frame = (now) => {
    raf = 0;
    if (disposed || !city) return;
    if (stage.paused || stage.mode === "cinematic") {
      last = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
    const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 0;
    if (last) {
      times[timeIndex % times.length] = now - last;
      timeIndex++;
    }
    sample(dt, last ? now - last : 0);
    last = now;
    step(dt);
    draw(dt);
  };

  const resume = () => {
    if (!raf && !disposed && city) raf = requestAnimationFrame(frame);
  };
  const pause = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };

  // Before the loop rests (a cover arrives, the intro takes over), draw one
  // clean frame on the shot it was heading for, so what stays on the canvas
  // under the scrim is the shot and not a frame of a flight or a glitch.
  const settle = () => {
    if (!city || disposed) return;
    driveCar(0, true);
    flight = null;
    aim();
    copyPose(pose, want);
    applyPose(pose, true);
    glitch = 0;
    draw(0);
  };

  // The loop is started and stopped from the stage: covers, visibility and
  // the intro's mode all land there.
  let running = null;
  const check = () => {
    const next = !stage.paused && stage.mode !== "cinematic" && Boolean(city);
    if (next === running) return;
    running = next;
    // The first time the page is really up, time it.
    if (running && adapt.armed) {
      adapt.armed = false;
      startSampling();
    }
    if (running) resume();
    else {
      if (stage.mode !== "cinematic" && !document.hidden) settle();
      pause();
    }
  };
  const unwatch = subscribeStage(check);

  // ---- context loss ------------------------------------------------------------
  const onContextLost = (e) => {
    e.preventDefault();
    pause();
    onLost?.();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  // ---- warm-up -------------------------------------------------------------------
  // Build the city, compile every material before anyone is looking, and
  // draw one frame of the hero while the canvas is still invisible, so the
  // first frame that counts has nothing left to set up.
  const warm = async () => {
    await building;
    if (disposed) return;
    shots.poseOf("hero", 0, aspect, want);
    copyPose(pose, want);
    applyPose(pose, false);
    posed = true;
    // Compiled for the target they draw into (the composer's linear buffer),
    // or the programs made here are not the ones the frames use.
    const target = renderer.getRenderTarget();
    renderer.setRenderTarget(post.composer.inputBuffer);
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
    renderer.setRenderTarget(target);
    if (moon) await moon.compile(post.composer.inputBuffer);
    if (disposed) return;
    // Two real frames, under the door or the poster where nobody sees them,
    // with nothing culled: the moon's reveal over the street, then the hero.
    // Compiling is not everything a first frame does (buffers and textures
    // upload on first draw, and the drift's camera sees buildings the
    // hero's does not), and the first frame anyone sees, the reveal or the
    // page, should not stutter.
    const culled = [];
    scene.traverse((o) => {
      if (o.frustumCulled) {
        culled.push(o);
        o.frustumCulled = false;
      }
    });
    if (moon) {
      moon.update(29.2, { width, height, pixelRatio: renderer.getPixelRatio(), over: true });
      draw(0, "over");
    }
    draw(0);
    for (const o of culled) o.frustumCulled = true;
    running = null;
    check();
  };

  // ---- the intro -------------------------------------------------------------------
  // While the intro runs (stage.mode "cinematic") this scene's own loop rests
  // and the intro's frame loop calls renderCinematic once a frame instead, on
  // the song clock: the voxel moon, when the intro opens here, then the
  // drift's camera, the drift itself, the shake and the braindance glitch on
  // the intro's cues, all on one clock.
  let cineLast = null;
  let moonWarmed = false;
  const heroTo = makePose();
  // Where the street vanishes in the drift's frame, for this screen: the
  // voxel moon opens onto the city from there.
  const drift = makePose();
  const driftCamera = new THREE.PerspectiveCamera();
  const streetEnd = new THREE.Vector3();
  const vanishing = new THREE.Vector2();
  let vanishingAspect = 0;
  const streetVanishing = () => {
    if (Math.abs(vanishingAspect - aspect) < 1e-4) return vanishing;
    vanishingAspect = aspect;
    driftPose(aspect, drift);
    driftCamera.position.copy(drift.position);
    driftCamera.lookAt(drift.target);
    driftCamera.fov = drift.fov;
    driftCamera.aspect = aspect;
    driftCamera.updateProjectionMatrix();
    driftCamera.updateMatrixWorld();
    streetEnd.set(drift.position.x, 3, drift.position.z - 400).project(driftCamera);
    return vanishing.set(THREE.MathUtils.clamp(streetEnd.x, -0.8, 0.8), THREE.MathUtils.clamp(streetEnd.y, -0.8, 0.8));
  };
  /**
   * The intro is about to use this scene: the car to its mark, and no
   * route change or camera pose left over from the page it was started on
   * (a replay keeps the city it has, so a case study's route and its shot
   * are still in hand). Skipped before the street is drawn, the page lands
   * on the hero rather than flying there from wherever it was.
   */
  const beginIntro = () => {
    cineLast = null;
    moonWarmed = false;
    lastRoute = null;
    flight = null;
    glitch = 0;
    posed = false;
    car?.beginDrift();
  };
  /**
   * One frame of the cinematic at song second `s`. `shake` is the intro's
   * rumble in CSS pixels ({ x, y }), turned into a camera tremor here;
   * `glitch` is the handoff's 0..1 envelope; `moon` asks for the voxel
   * moon before the street (src/world/voxel-moon.js decides when it shows).
   */
  const renderCinematic = (s, { shake = null, glitch: g = 0, moon: withMoon = false } = {}) => {
    if (!city || disposed) return;
    const dt = cineLast === null ? 0 : clamp(s - cineLast, 0, 0.05);
    cineLast = s;
    let moonView = withMoon && moon ? moonPhase(s) : null;
    // One hidden street frame per run (see moonPhase).
    if (moonView === "warm") {
      moonView = moonWarmed ? "only" : "over";
      moonWarmed = true;
    }
    if (moonView) moon.update(s, { width, height, pixelRatio: renderer.getPixelRatio(), over: moonView === "over", vanishing: streetVanishing() });
    if (moonView !== "only") {
      // The drift's own camera, then, while the page arrives, a slow crane
      // down and a tilt up into the hero's: the city opens up behind the name.
      driftPose(aspect, want);
      const e = easeInOut(clamp((s - HANDOFF) / (REVEAL - HANDOFF), 0, 1));
      if (e > 0) {
        shots.poseOf("hero", 0, aspect, heroTo);
        want.position.lerp(heroTo.position, e);
        want.target.lerp(heroTo.target, e);
        want.fov += (heroTo.fov - want.fov) * e;
        want.shift += (heroTo.shift - want.shift) * e;
      }
      copyPose(pose, want);
      applyPose(pose, false);
      if (shake) {
        const perPx = (camera.fov * DEG) / height;
        camera.rotateY(-shake.x * perPx);
        camera.rotateX(-shake.y * perPx);
      }
      posed = true;
      lastPosition = stage.position;
      car?.cinematic(s - DROP, s, dt, aspect, clamp(aspect / 1.6, 0.4, 1));
    }
    cineGlitch = g;
    draw(dt, moonView);
    cineGlitch = -1;
  };

  /**
   * One frame of the braindance (src/braindance): the camera at `spec.pose`
   * (a pose from makePose, plus `roll` in radians), the car on the road at
   * `spec.car` ({ u, v }, metres and metres a second), the plaza's board on
   * entry `spec.board`, corpo row lit for the slugs in `spec.towers`, the
   * garage at `spec.garage` ({ door: 0..1, tubes }), the wet road's mirror at
   * `spec.mirror` (0..1), the music's `spec.levels` from the braindance's own
   * deck, and `spec.glitch` (0..1). The scene's own loop rests meanwhile:
   * the caller holds stage.mode at "cinematic", as the intro does.
   */
  const renderDirected = (dt, spec) => {
    if (!city || disposed) return;
    directed = spec;
    copyPose(pose, spec.pose);
    copyPose(want, spec.pose);
    applyPose(pose, false);
    if (spec.roll) camera.rotateZ(spec.roll);
    posed = true;
    lastRoute = null;
    flight = null;
    if (car && spec.car) car.directed(dt, spec.car);
    cineGlitch = spec.glitch ?? 0;
    draw(dt);
    cineGlitch = -1;
    directed = null;
  };

  /** Put the camera on a pose now, lens shift and all, without drawing:
   *  the braindance projects its markers with the camera it is about to
   *  draw with. */
  const placeCamera = (p) => {
    copyPose(pose, p);
    applyPose(pose, false);
    camera.updateMatrixWorld();
  };

  const dispose = () => {
    disposed = true;
    pause();
    unwatch();
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    building.then((c) => {
      c.dispose();
      skyline?.dispose();
      rain?.dispose();
      traffic?.dispose();
      car?.dispose();
      shafts?.dispose();
      koi?.dispose();
      crowd?.dispose();
      steam?.dispose();
      moon?.dispose();
    }).catch(() => {});
    mirror?.dispose();
    mirror = null;
    post.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const stats = () => {
    const n = Math.min(timeIndex, times.length);
    const arr = Array.from(times.slice(0, n)).sort((a, b) => a - b);
    const p = (x) => (n ? +arr[Math.min(n - 1, Math.floor(x * n))].toFixed(2) : 0);
    return {
      tier,
      frames: n,
      p50: p(0.5),
      p95: p(0.95),
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      frame: renderer.info.render.frame,
      memory: { ...renderer.info.memory },
      pixelRatio: renderer.getPixelRatio(),
      adapt: { shed: [...adapt.shed], p95: adapt.p95, sampling: adapt.sampling },
    };
  };

  if (import.meta.env.DEV) {
    // `dumpMirror("raw" | "blurred")` returns the wet road's mirror as a PNG
    // data URL, for tuning the reflection.
    const dumpMirror = (which = "blurred") => {
      const t = mirror?.targets[which];
      if (!t) return null;
      const { width: w, height: h } = t;
      const half = new Uint16Array(w * h * 4);
      renderer.readRenderTargetPixels(t, 0, 0, w, h, half);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = ((h - 1 - y) * w + x) * 4;
          const o = (y * w + x) * 4;
          for (let k = 0; k < 3; k++) img.data[o + k] = Math.min(255, Math.pow(THREE.DataUtils.fromHalfFloat(half[i + k]), 1 / 2.2) * 255);
          img.data[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return c.toDataURL("image/png");
    };
    window.__world = { renderer, scene, camera, stats, pose, want, stage, shared, get city() { return city; }, get car() { return car; }, get moon() { return moon; }, get traffic() { return traffic; }, post, dumpMirror, setQuality, strike() { storm.t = storm.next; } };
  }

  return {
    warm,
    beginIntro,
    renderCinematic,
    renderDirected,
    placeCamera,
    pause,
    resume,
    setQuality,
    stats,
    dispose,
    get info() {
      return renderer.info;
    },
    /** The pieces the braindance draws over and reads from. */
    get parts() {
      return { renderer, scene, camera, post, shared, city, car, traffic, crowd, koi, quality };
    },
    /** Whether this city can draw the intro's voxel moon. */
    get hasMoon() {
      return Boolean(moon);
    },
  };
}
