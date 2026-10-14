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
import { createCity, preloadCity, preloadPack, PACKS, REFLECT_LAYER, MIRROR_LAYER } from "./city.js";
import { preloadHolo } from "./holo.js";
import { preloadMoon } from "./moon.js";
import { preloadAds } from "./ads.js";
import { createCover } from "./cover.js";
import { createKoi, preloadKoi } from "./koi.js";
import { createPlazaKoi } from "./plaza-koi.js";
import { createCrowd } from "./crowd.js";
import { figuresAhead } from "./crowd-people.js";
import { createSteam } from "./steam.js";
import { createSearchlights } from "./searchlights.js";
import { createVoxelMoon, moonPhase, preloadVoxelMoon } from "./voxel-moon.js";
import { markLoaded } from "./progress.js";
import { createMirror, deckShare, DECK_Y } from "./mirror.js";
import { createPost } from "./post.js";
import { createGlass } from "./glass.js";
import { createSkyline } from "./skyline.js";
import { createRain } from "./rain.js";
import { createBolt } from "./bolt.js";
import { createSoundscape } from "./soundscape.js";
import { createTraffic, makeTrafficAhead } from "./traffic.js";
import { createCar } from "./car.js";
import { createClearance } from "./clearance.js";
import { createShafts } from "./shafts.js";
import { LIGHT_BOUNDS } from "./spill.js";
import { preloadCar } from "../three/car/object.js";
import { getEnv } from "../lib/env.js";
import { getLevels } from "../lib/ambient.js";
import { DROP, HANDOFF, REVEAL } from "../lib/cues.js";
import { boards as BOARDS, towers as TOWERS, SHOTS } from "../data/world.js";

// (load: the S4's model is in; see preloadWorld.)
let carLanded = false;

/** Everything the scene needs before it can be built. */
export async function preloadWorld(tier) {
  // Each marked as it lands, for the door's list (src/world/progress.js).
  const step = (key, p) => p.then((v) => (markLoaded(key), v));
  // The voxel moon is the one piece the city can do without: a missing
  // Earth picture leaves the intro on its painted moon, not the site on its
  // poster.
  // (load: the S4's model and Earth's picture are asked for with the rest
  // and marked as they land, but not waited for here: the city's build
  // starts on its core and waits for the car where the car is made, in
  // createWorldScene, and the moon for its picture in createVoxelMoon. On a
  // phone the S4's 2 MB land 0.7 s after the core, and the core is built in
  // that time. A car that fails fails the build there, as it failed this.
  // With the tier, the moon's shapes are worked out while the core is still
  // coming, not on the city's own time.)
  step("car", preloadCar()).then(() => (carLanded = true), () => null);
  step("voxel", preloadVoxelMoon(tier)).catch(() => null);
  // (load: and the traffic's models, a model a task while the files are
  // still coming; what is not made by then is made with the traffic, as
  // before. traffic.js makeTrafficAhead.)
  // (and the people's figures after them, crowd-people.js figuresAhead.)
  const ahead = (function* () {
    yield* makeTrafficAhead();
    yield* figuresAhead();
  })();
  let filesIn = false;
  const more = () => {
    if (!filesIn && !ahead.next().done) setTimeout(more, 0);
  };
  setTimeout(more, 0);
  await Promise.all([
    step("city", preloadCity(tier)),
    step("holo", preloadHolo()),
    step("moon", preloadMoon()),
    step("ads", preloadAds()),
    step("koi", preloadKoi()),
  ]).finally(() => (filesIn = true));
}

const DEG = Math.PI / 180;
const ZERO = new THREE.Vector3();
// Look's picking (`pick`): the S4's bounds in its own frame, and scratch.
const CAR_BOX = new THREE.Box3(new THREE.Vector3(-0.95, 0, -2.4), new THREE.Vector3(0.95, 1.45, 2.4));
const _picker = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _local = new THREE.Ray();
const _inverse = new THREE.Matrix4();
const _hit = new THREE.Vector3();
const _pickBox = new THREE.Box3();
// The wet road's mirror at full (road.js's own uReflectGain).
const REFLECT_GAIN = 2.2;

/** three's lookup textures are the page's, not a renderer's: the one its
 *  standard materials read (DFG_LUT) and the area lights' (UniformsLib's
 *  LTC tables). Nothing disposes them, and every renderer that draws with
 *  them hangs a listener on them, so they held on to each renderer the page
 *  ever made, programs and all. Disposed as one goes, they let go of it; a
 *  renderer still running uploads them again, a few kilobytes. The first is
 *  read off a material the renderer drew, before the materials go. */
function releaseLut(renderer, scene) {
  let lut = null;
  scene.traverse((o) => {
    if (lut || !o.material) return;
    for (const m of [].concat(o.material)) lut ??= renderer.properties.get(m).uniforms?.dfgLUT?.value ?? null;
  });
  lut?.dispose();
  for (const k of ["LTC_FLOAT_1", "LTC_FLOAT_2", "LTC_HALF_1", "LTC_HALF_2"]) THREE.UniformsLib[k]?.dispose();
}

export function createWorldScene(canvas, { tier = "high", onFirstFrame, onLost, reduced = false, effects = [], signs = null } = {}) {
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
  let bolt = null;
  let traffic = null;
  let car = null;
  let shafts = null;
  let koi = null;
  let plazaKoi = null;
  let cover = null;
  let crowd = null;
  let steam = null;
  let moon = null;
  // (load: the voxel moon on its way; `moon` once it is ready to draw.)
  let moonMade = null;
  // (load: what compileFor asked the GPU for as the city was finished.)
  let early = null;
  let mirror =quality.reflection ? createMirror(renderer, { size: quality.reflection, layers: [REFLECT_LAYER, MIRROR_LAYER] }) : null;
  const post = createPost(renderer, scene, camera, quality, { extra: effects });
  // The page's panes of smoked glass, frosted in the post chain.
  const glass = createGlass(post.glass);
  // The city's own sound, with sound on.
  const soundscape = createSoundscape({ reduced });
  // The garage, which it does not rain in.
  let shelterBox = null;

  let clearance = null;
  let lightIn = false;
  const setUp = (c) => {
    city = c;
    c.light.ready.then(() => {
      lightIn = true;
      if (running !== null) check();
    });
    clearance = createClearance(c.root, LIGHT_BOUNDS, (o) => o.isInstancedMesh || /^(moon_disc|holo_figure)/.test(o.name));
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
    cover = createCover(renderer, LIGHT_BOUNDS, { size: tier === "phone" ? 1024 : 2048 });
    cover.render(c.root);
    rain.setCover(cover);
    bolt = createBolt(scene, shared);
    const shelter = c.anchors.get("anchor_shelter_garage");
    const size = shelter?.extras?.size;
    if (shelter && size) {
      shelterBox = new THREE.Box3(shelter.position.clone(), shelter.position.clone().add(new THREE.Vector3(...size)));
      rain.setShelter(shelterBox.min, shelterBox.max);
    }
    traffic = createTraffic(scene, shared, {
      avs: quality.avs + (tier === "phone" ? 1 : 2),
      cars: quality.cars,
      drones: tier === "phone" ? 5 : 8,
      police: true,
      reduced,
      reflectLayer: REFLECT_LAYER,
      rail: c.anchors.get("anchor_rail"),
      streets: c.anchors.get("anchor_traffic")?.extras?.lanes ?? [],
      parkedMore: c.anchors.get("anchor_parked")?.extras?.cars ?? [],
      streetCars: tier === "phone" ? 16 : 44,
      elevated: c.anchors.get("anchor_traffic")?.extras?.paths ?? [],
      deckCars: tier === "phone" ? 1 : 2,
      props: c.props,
    });
    // (load: the S4's model, if it is not in yet; see preloadWorld. When it
    // is, the city goes on being made in the same breath, as it did.)
    return carLanded ? withCar(c) : preloadCar().then(() => withCar(c));
  };
  const withCar = (c) => {
    car = createCar(scene, renderer, { road: c.road, anchors: c.anchors, light: c.light, layer: REFLECT_LAYER, mirrorLayer: MIRROR_LAYER, tier, reduced });
    shafts = createShafts(scene, c.anchors, shared);
    crowd = createCrowd(scene, shared, { phone: tier === "phone", reduced, reflectLayer: REFLECT_LAYER, walks: c.anchors.get("anchor_crowd")?.extras?.walks ?? [], standers: c.anchors.get("anchor_people")?.extras?.stand ?? [], cover, traffic });
    steam = createSteam(scene, shared, c.anchors, { reduced });
    steam?.setLights(c.roofLights);
    resize();
    plazaKoi = createPlazaKoi(scene, shared, { reduced, reflectLayer: REFLECT_LAYER });
    // (load: the post chain's own programs first, while the GPU has nothing
    // else to build: an empty frame through it, the city's pass held back,
    // onto the canvas nobody sees yet. The first real frame built them, and
    // waited for them behind the city's.)
    post.view("only");
    post.render(0);
    post.view(null);
    // (load: the GPU's process starts building the city's programs now,
    // while the people are placed and the koi made; warm compiles what is
    // added after this and waits for all of it.)
    early = compileFor([scene], post.composer.inputBuffer);
    early.programs.push(...glassPrograms());
    const koiMade = createKoi(scene, shared, { reduced, reflectLayer: REFLECT_LAYER });
    // (load: the voxel moon is made alongside, as it was, but the city's
    // first frame does not wait for it: only the intro shows it, and warm
    // finishes it after that frame, before the city is ready.)
    moonMade = createVoxelMoon(renderer, shared, { tier }).catch((err) => {
      if (import.meta.env.DEV) console.warn("[world] no voxel moon; the intro keeps its painted one", err);
      return null;
    });
    // (load: and the city's light, baked on a worker meanwhile; city.js.)
    return Promise.all([koiMade, car.ready, c.light.ready]).then(([k]) => {
      koi = k;
      fitKoi();
      return c;
    });
  };
  const building = createCity(scene, renderer, shared, { tier, quality, reduced, signs }).then(setUp);

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
  const workFit = makePose();
  const fitKoi = () => {
    if (!shots) return;
    shots.poseOf("hero", 0, aspect, heroFit);
    shots.poseOf("projects", 0, aspect, workFit);
    plazaKoi?.quiet(workFit.position, heroFit.position);
    koi?.fit(heroFit, aspect);
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
  // Look mode's drag (src/world/modes.js), damped so a flick of the mouse
  // turns the camera rather than snapping it.
  const lookCam = { yaw: 0, pitch: 0 };

  // A camera on the move: it banks into a turn, as a drone or a helicopter
  // does (roll follows the rate the heading swings at, a few degrees at
  // most), and the lens opens a little with speed. Both are read off the
  // pose itself, so a scrolled flight and a route's flight get them alike,
  // and both settle to nothing when the camera holds. Its velocity, eased,
  // is the rain's too: the streaks are drawn as the camera sees them.
  const motion = { yaw: null, roll: 0, widen: 0, at: new THREE.Vector3(), vel: new THREE.Vector3() };
  const _dir = new THREE.Vector3();
  const _vel = new THREE.Vector3();
  const moveCamera = (dt, snapped) => {
    _dir.subVectors(pose.target, pose.position);
    const yaw = Math.atan2(_dir.x, _dir.z);
    if (motion.yaw === null || snapped || dt <= 0 || reduced) {
      motion.yaw = yaw;
      motion.at.copy(pose.position);
      motion.roll = 0;
      motion.widen = 0;
      motion.vel.set(0, 0, 0);
      return;
    }
    let dy = yaw - motion.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    motion.yaw = yaw;
    _vel.subVectors(pose.position, motion.at).divideScalar(dt);
    const speed = _vel.length();
    motion.at.copy(pose.position);
    motion.vel.lerp(_vel, 1 - Math.exp(-dt * 6));
    const bank = clamp((-dy / dt) * 0.09, -0.11, 0.11);
    const widen = clamp((speed - 6) / 70, 0, 1) * 5;
    const a = 1 - Math.exp(-dt * 2.5);
    motion.roll += (bank - motion.roll) * a;
    motion.widen += (widen - motion.widen) * a;
  };

  // A film camera's shutter. On a fast flight, or a flick of Look's drag,
  // the picture smears the way it is moving, as a shutter open for a 48th
  // of a second smears it (half of each frame at 24), and the lens's colour
  // fringe draws out along it (post.js). It is worked out from the camera's
  // last two frames: where a point down each pixel's ray was a frame ago,
  // scaled to the shutter. A turn moves every point on the screen alike, so
  // turns come out exact; travel moves the near more than the far, so a
  // point 40 m off, across a street, stands in for all of them. A move of a
  // pixel or two (the pointer's tilt, the hero's sway) smears nothing, and
  // only the page's own frames are exposed this way: the intro and the
  // braindance place the camera themselves, cuts and all. A new shape of
  // screen is a cut too, not a move.
  const SHUTTER = 1 / 48;
  const SHUTTER_DEPTH = 40;
  const shutter = { prev: new THREE.Matrix4(), has: false, aspect: 0, k: new THREE.Matrix4(), on: 0, depth: 0, fresh: false };
  shutter.k.elements.fill(0);
  const _vp = new THREE.Matrix4();
  const _back = new THREE.Matrix4();
  const _probe = new THREE.Vector4();
  const _probed = new THREE.Vector4();
  // The most a point at the centre or a corner moves under `m`, in px.
  const smear = (m) => {
    let most = 0;
    for (const [x, y] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      _probe.set(x, y, shutter.depth, 1);
      _probed.copy(_probe).applyMatrix4(m).add(_probe);
      most = Math.max(most, Math.hypot(((x - _probed.x / _probed.w) * width) / 2, ((y - _probed.y / _probed.w) * height) / 2));
    }
    return most;
  };
  const expose = (dt, cut) => {
    camera.updateMatrixWorld();
    _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = camera.projectionMatrix.elements;
    shutter.depth = (e[10] * -SHUTTER_DEPTH + e[14]) / SHUTTER_DEPTH;
    const k = shutter.k.elements;
    if (!shutter.has || cut || dt <= 0 || reduced || shutter.aspect !== aspect) {
      k.fill(0);
    } else {
      // Now's screen to the last frame's, less staying put, per shutter.
      const b = _back.copy(_vp).invert().premultiply(shutter.prev).elements;
      const s = SHUTTER / dt;
      for (let i = 0; i < 16; i++) b[i] = (b[i] - (i % 5 === 0 ? 1 : 0)) * s;
      // More than a screen and a half in a shutter is a cut, not a move.
      if (smear(_back) > height * 1.5) k.fill(0);
      else {
        const a = 1 - Math.exp(-dt * 12);
        for (let i = 0; i < 16; i++) k[i] += (b[i] - k[i]) * a;
      }
    }
    shutter.prev.copy(_vp);
    shutter.has = true;
    shutter.aspect = aspect;
    shutter.fresh = true;
    shutter.on = THREE.MathUtils.smoothstep(smear(shutter.k), 1.5, 5);
  };

  const applyPose = (p, withTilt) => {
    camera.position.copy(p.position);
    camera.lookAt(p.target);
    if (withTilt) {
      camera.rotateY(-tilt.x * 1.4 * DEG + hand.yaw - lookCam.yaw);
      camera.rotateX(-tilt.y * 0.9 * DEG + hand.pitch + lookCam.pitch);
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
    const l = reduced ? 1 : 1 - Math.exp(-dt * 7);
    lookCam.yaw += (stage.look.yaw - lookCam.yaw) * l;
    lookCam.pitch += (stage.look.pitch - lookCam.pitch) * l;
    applyPose(pose, true);
    expose(dt, jumped);
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
      // Somewhere in front of the camera, where it can be seen: inside the
      // frame's width, and far enough off that the bolt (bolt.js) clears
      // the roofs as it comes down.
      camera.getWorldDirection(_strikeDir);
      const a = Math.atan2(_strikeDir.z, _strikeDir.x) + (Math.random() - 0.5) * 0.8;
      const r = 650 + Math.random() * 750;
      shared.uFlashAt.value.set(camera.position.x + Math.cos(a) * r, camera.position.z + Math.sin(a) * r);
      bolt?.strike(shared.uFlashAt.value.x, shared.uFlashAt.value.y);
      soundscape.strike(shared.uFlashAt.value, r, storm.pulses[0].k);
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
  // `flow` is how far the city's own clock moves this frame, when that is
  // not the frame's time: the braindance holds it still while paused and
  // runs it backwards while rewinding (the rain, the traffic, the koi, every
  // flicker). Smoothing everywhere else stays on the frame's dt.
  const draw = (dt, moonView = null, flow = dt) => {
    renderer.info.reset();
    let mirrored = false;
    clock += flow;
    shared.uTime.value = clock;
    shared.uCam.value.copy(camera.position);
    const env = drive(dt);
    if (moonView) moon.renderShadows();
    if (moonView !== "only") {
      skyline?.update(camera, renderer.getPixelRatio());
      city?.props?.update(camera);
      rain?.update(flow, camera, env.wet);
      rain?.setCameraVelocity(shutter.fresh ? motion.vel : ZERO);
      bolt?.update();
      shafts?.update(shared.uHaze.value);
      // Searchlights: off the page, or in a directed frame that asks.
      searchlights?.update(directed ? !!directed.searchlights : stage.view !== "page", shared.uHaze.value);
      koi?.update(flow);
      plazaKoi?.update();
      traffic?.update(flow, env.traffic);
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
      // (And it is the deck's own while the eye is up on the deck, going
      // out and coming back in round the change of plane: mirror.js.)
      const deck = mirror ? deckShare(camera.position) : 0;
      const k = mirror ? 1 - (1 - Math.max(1 - roadShown(), adapt.reflectK)) * Math.abs(2 * deck - 1) : 1;
      const mirrorY = deck > 0.5 ? DECK_Y : 0;
      if (city) {
        for (const r of city.roadMaterials) {
          r.uniforms.uReflectGain.value = REFLECT_GAIN * (1 - k);
          r.uniforms.uStreakGain.value = 0.1 + k;
          r.uniforms.uMirrorY.value = mirrorY;
        }
      }
      if (mirror && city && env.wet && k < 1) {
        city.setOccluders(!!directed && (directed.occluders ?? 1) > 0);
        camera.updateMatrixWorld();
        const drew = mirror.render(scene, camera, mirrorY);
        mirrored = drew;
        for (const r of city.roadMaterials) r.setReflection(drew ? mirror.texture : null, mirror.matrix, mirror.horizonV);
      } else if (city) {
        for (const r of city.roadMaterials) r.setReflection(null);
      }
    }
    // The frost behind the page's panes. The intro's moon alone has no page
    // over it.
    if (moonView === "only") post.glass.count = 0;
    else glass.update(width, height);
    // A frame the page's own loop did not pose has no shutter, and the next
    // one that does starts from it.
    post.setShutter(shutter.k, shutter.depth, shutter.fresh ? shutter.on : 0);
    if (!shutter.fresh) shutter.has = false;
    shutter.fresh = false;
    post.view(moonView);
    // The mirror's render has just brought every matrix in the scene up to
    // date, and nothing moves between it and the city's own: that one need
    // not walk the whole scene again.
    scene.matrixWorldAutoUpdate = !mirrored;
    try {
      post.render(dt);
    } finally {
      scene.matrixWorldAutoUpdate = true;
    }
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
  // Dev only: `?adapt=off` keeps every tier at full quality, so a
  // measurement on a loaded machine compares like with like instead of
  // whatever the first two seconds happened to shed.
  const armed = !(import.meta.env.DEV && new URLSearchParams(window.location.search).get("adapt") === "off");
  const adapt = { armed, sampling: false, t: 0, samples: [], shed: [], tried: [], p95: null, fade: null, reflectK: 0, trial: null };
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
    // (load: one piece of work that waits on the GPU's process, before this
    // frame's draws; see `ask`.)
    if (!adapt.sampling) asks.shift()?.run();
    const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 0;
    if (last) {
      times[timeIndex % times.length] = now - last;
      timeIndex++;
    }
    sample(dt, last ? now - last : 0);
    last = now;
    step(dt);
    draw(dt);
    soundscape.update(dt, camera, {
      speed: motion.vel.length(),
      wet: getEnv().wet,
      inside: shelterBox?.containsPoint(camera.position) ?? false,
      voices: traffic?.voices,
    });
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
    // (load: not before the city's light is in: city.js bakes it on a
    // worker while the rest is built.)
    const next = !stage.paused && stage.mode !== "cinematic" && Boolean(city) && lightIn;
    if (next === running) return;
    running = next;
    soundscape.setActive(running);
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
  // (load) Every program `root` draws with compiled for `into`, and while
  // the GPU's process builds them, what the first frame did after it: each
  // program's uniforms read as it is done (a round trip each) and every
  // picture the materials hold uploaded (the big ones decoded there and
  // then). compileAsync asked after every program still building every
  // 10 ms, a round trip each, 0.25 s of the page's time on a desktop, and
  // the first frame then took 0.3 s more. Here only the next program in the
  // order they were made is asked after. A picture still on its way (the
  // adverts' atlas is asked for as the kit is made) is waited for, up to
  // PICTURES_MS, so the first frame never shows a wall without it; and so
  // is anything `ready()` says is not.
  const PICTURES_MS = 4000;
  const compileFor = (roots, into) => {
    const before = renderer.info.programs.length;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(into);
    const materials = new Set();
    for (const root of roots) for (const m of renderer.compile(root, camera, scene)) materials.add(m);
    renderer.setRenderTarget(prev);
    return { kids: scene.children.length, materials, programs: renderer.info.programs.slice(before) };
  };
  // (load) The glass's frost (post.js GlassEffect: a Kawase blur and a
  // copy, at a quarter of the frame) runs only while one of the page's
  // panes is on screen, so its two programs were made by the first frame
  // with a pane in it, after the door: 25 to 45 ms. Made with the city's,
  // for the targets they draw into, and waited for with them.
  const glassPrograms = () => {
    const pass = post.glass?.blurPass;
    if (!pass) return [];
    const before = renderer.info.programs.length;
    const target = renderer.getRenderTarget();
    renderer.setRenderTarget(pass.renderTargetA);
    for (const m of [pass.blurMaterial, pass.copyMaterial]) {
      pass.fullscreenMaterial = m;
      renderer.compile(pass.scene, pass.camera);
    }
    renderer.setRenderTarget(target);
    return renderer.info.programs.slice(before);
  };
  const prepare = (into, ready = () => true) => {
    // What was added to the scene since the early compile (the koi), or all
    // of it.
    const late = compileFor(early ? scene.children.slice(early.kids) : [scene], into);
    const materials = new Set([...(early?.materials ?? []), ...late.materials]);
    const programs = [...(early?.programs ?? []), ...late.programs];
    early = null;
    const pictures = new Set();
    const add = (v) => {
      if (Array.isArray(v)) v.forEach(add);
      else if (v?.isTexture && !v.isRenderTargetTexture) pictures.add(v);
    };
    for (const m of materials) {
      for (const k of Object.keys(m)) add(m[k]);
      for (const u of Object.values(m.uniforms ?? {})) add(u?.value);
    }
    const t0 = performance.now();
    let next = 0;
    return new Promise((resolve) => {
      const tick = () => {
        if (disposed) return resolve();
        while (next < programs.length && (programs[next].program === undefined || programs[next].isReady())) {
          if (programs[next].program !== undefined) programs[next].getUniforms();
          next++;
        }
        const t = performance.now();
        for (const p of pictures) {
          if (performance.now() - t > 8) break;
          if (!p.image || p.version === 0) continue;
          renderer.initTexture(p);
          pictures.delete(p);
        }
        const late = performance.now() - t0 > PICTURES_MS;
        if (late) pictures.clear();
        if (next < programs.length || pictures.size || !(late || ready())) setTimeout(tick, 4);
        else resolve();
      };
      tick();
    });
  };

  // (load) Whether the people's light is in: until its first bake is done
  // their shader's map of it (uSigns) is a single texel.
  const crowdLit = () => {
    let lit = true;
    crowd?.mesh.traverse((o) => {
      const map = o.material?.uniforms?.uSigns?.value;
      if (map && !(map.image?.width > 1)) lit = false;
    });
    return lit;
  };

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
    // (load: the crowd learns the camera it is seen through from its first
    // draw, and the warm-up's first draw was the moon's, before the hero's:
    // told now, so the hero's frame sorts and culls its people as it did.)
    crowd?.update(camera);
    // (load: and the people's light, whose first bake that asks for and
    // which runs a step a task, crowd-light.js: waited for, so the first
    // frame's people are lit the same on every load, and once the programs
    // and pictures are in, run out at once, crowd.js lightNow, rather than
    // a step a task between everyone else's.)
    await prepare(post.composer.inputBuffer, () => {
      crowd?.lightNow?.();
      return crowdLit();
    });
    if (disposed) return;
    // Two real frames of the hero, under the door or the poster where
    // nobody sees them, with nothing culled. Compiling is not everything a
    // first frame does (buffers upload on first draw, and the drift's
    // camera sees buildings the hero's does not), and the first frame
    // anyone sees, the reveal or the page, should not stutter. A draw also
    // tells the city things for the next one (the traffic's lamps learn the
    // lens, a shop's panes are dealt their trades): the first frame here was
    // the moon's over the street, and is now the hero's.
    const culled = [];
    scene.traverse((o) => {
      if (o.frustumCulled) {
        culled.push(o);
        o.frustumCulled = false;
      }
    });
    draw(0);
    draw(0);
    for (const o of culled) o.frustumCulled = true;
    running = null;
    check();
    streamPacks();
    buildSearchlights();
    // (load) The voxel moon, after the city's first frame, a little at a
    // time between the page's frames: its programs, and hidden frames of
    // the strike and of the reveal over the street, where the warm-up drew
    // them before that first frame (voxel-moon.js, prepare). The city is
    // ready (WorldMount: this resolving) only once the moon is, so the
    // door's last tick and an intro that can open on the moon come
    // together, as they did.
    const m = await moonMade;
    if (!m || disposed) return;
    post.setMoon(m.scene, m.camera);
    await m.prepare(post.composer.inputBuffer, { width, height, pixelRatio: renderer.getPixelRatio() }, moonSlot);
    if (!disposed) moon = m;
  };

  // (load) Work that waits on the GPU's process: a question it must answer
  // before the page goes on (a program's uniforms, once it is built), or a
  // buffer or picture big enough to wait for room on the way. One piece is
  // run at the start of a frame, before that frame's draws, while the GPU's
  // process has the last frame behind it; in a moment between frames it
  // first waited for the GPU's process to take the whole of the frame just
  // drawn, 5 to 12 ms on a desktop. A page drawing nothing runs it after a
  // quarter of a second; none runs while the adaptive pass is timing.
  const asks = [];
  const ask = (job) => new Promise((resolve, reject) => {
    const entry = {
      run() {
        if (entry.done) return;
        entry.done = true;
        clearTimeout(late);
        try {
          resolve(job());
        } catch (err) {
          reject(err);
        }
      },
      done: false,
    };
    let late = 0;
    const overdue = () => {
      if (adapt.sampling) {
        late = setTimeout(overdue, 250);
        return;
      }
      const i = asks.indexOf(entry);
      if (i >= 0) asks.splice(i, 1);
      entry.run();
    };
    late = setTimeout(overdue, 250);
    asks.push(entry);
  });

  // (load) Work spread over the page's frames: each frame gives up to
  // WORK_MS of it, run just after that frame is drawn (the frame's own work
  // is a few milliseconds, so the frame and its share stay inside the
  // tier's budget). `between()` resolves at once while this frame's share
  // lasts, else just after the next frame; a page drawing nothing (the tab
  // hidden, a cover up) has no frames to follow, and waits a sixth of a
  // second instead.
  // (While the adaptive pass is timing the page's frames, none of it: what
  // it times is the city's own frame, and a frame with a share of work in
  // it misses a fast display's refresh where the city's alone does not, so
  // the pass shed pixels a visitor's machine had to spare.)
  const WORK_MS = tier === "phone" ? 6 : 4;
  let workFrom = -Infinity;
  // (`untimed`: the voxel moon's, which the intro may wait for, runs on.)
  // One piece of work is let go a frame, so two at once (a district and the
  // moon) do not take a share each: the moon's first, then in the order
  // they asked.
  const waiting = [];
  let slotArmed = false;
  const arm = () => {
    slotArmed = true;
    let next = 0;
    let late = 0;
    const go = () => {
      cancelAnimationFrame(next);
      clearTimeout(late);
      const moonFirst = waiting.findIndex((w) => w.untimed);
      const i = moonFirst >= 0 ? moonFirst : adapt.sampling ? -1 : 0;
      if (i < 0) {
        next = requestAnimationFrame(go);
        late = setTimeout(go, 160);
        return;
      }
      const [w] = waiting.splice(i, 1);
      setTimeout(() => {
        slotArmed = false;
        workFrom = performance.now();
        w.resolve();
        if (waiting.length && !slotArmed) arm();
      }, 0);
    };
    next = requestAnimationFrame(go);
    late = setTimeout(go, 160);
  };
  const slot = (untimed) => {
    if (!(adapt.sampling && !untimed) && performance.now() - workFrom < WORK_MS) return Promise.resolve();
    return new Promise((resolve) => {
      waiting.push({ resolve, untimed });
      if (!slotArmed) arm();
    });
  };
  const between = () => slot(false);
  const moonSlot = () => slot(true);

  // ---- the districts behind the core ------------------------------------------
  // Once the hero can be drawn, the rest of the city: each pack fetched in
  // turn (never alongside the core, which would slow the city going live),
  // then built in when the page is idle, so its work never lands on a
  // scroll. A flight into a district before its pack is in sees the city's
  // far blocks there, as it did before the rebuild.
  const idle = () => new Promise((resolve) => (window.requestIdleCallback ? window.requestIdleCallback(resolve, { timeout: 1500 }) : setTimeout(resolve, 50)));
  const packsIn = [];
  const streamPacks = async () => {
    // All fetched at once, built in one at a time in the streaming order.
    const loads = PACKS.map((name) => preloadPack(tier, name).then((s) => ({ s }), (err) => ({ err })));
    for (const [i, name] of PACKS.entries()) {
      try {
        const { s: packScene, err } = await loads[i];
        if (err) throw err;
        if (disposed) return;
        await idle();
        if (disposed || !city) return;
        // (load: built a few milliseconds at a time between the page's frames,
        // and put in the city in one go, once what it draws is ready to be
        // drawn; city.js, addPack, and readyToDraw below.)
        await city.addPack(name, packScene, { beforeMerge: (part) => clearance?.add(part), between, ready: readyToDraw });
        if (disposed) return;
        // (load: the rain's cover a moment later, in a moment of its own.)
        await between();
        if (disposed) return;
        cover?.render(city.root);
        packsIn.push(name);
      } catch (err) {
        if (import.meta.env.DEV) console.warn(`[world] the ${name} districts did not load`, err);
      }
    }
    city?.releaseBake();
    warmKit?.dispose();
    warmKit = null;
  };

  // (load) What a district will draw, made ready out of sight before it is
  // put in, a little between each of the page's frames: `drawn` is each
  // { object, geometry, bytes, send? } (city.js addPack). Its programs,
  // made as warm-up makes them (for the composer's buffer, with the
  // scene's lights; each object with the geometry it will have), waited
  // for in the order they were made and each first used once built, before
  // a frame (`ask`); the pictures its materials hold; and its buffers, sent
  // to the GPU by drawing nothing with them (a mesh of no triangles that
  // shares their attributes and index, through one small program into a
  // 1 px target), WARM_BYTES before a frame and a bigger one a PIECE a
  // frame (makeWarmKit). The first frame that draws the district
  // then has nothing to make or send but its share of the light maps. A
  // material whose version moved meanwhile (something set needsUpdate)
  // is made again before it goes in.
  // (Its programs were made as the first frame that drew it made them, and
  // the frames drawn meanwhile went on: one that met a program still being
  // built waited for it, 40 to 60 ms, and one that met a new buffer sent
  // it, 2 to 7 MB, 20 to 60 ms.)
  const WARM_BYTES = tier === "phone" ? 0.75e6 : 1.5e6;
  const PIECE = tier === "phone" ? 2 ** 19 : 2 ** 20;
  let warmKit = null;
  const makeWarmKit = () => {
    const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    const warmScene = new THREE.Scene();
    const material = new THREE.ShaderMaterial({
      vertexShader: "void main() { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); }",
      fragmentShader: "void main() { gl_FragColor = vec4(0.0); }",
    });
    const proxies = [];
    // Every proxy draws with one small position of its own, and carries what
    // it sends under names of its own: three's program key counts whether a
    // geometry has a position and a normal, so the one program serves all.
    const spot = new THREE.BufferAttribute(new Float32Array(3), 3);
    const proxyGeometry = () => new THREE.BufferGeometry().setAttribute("position", spot);
    // Its one program, made now (for the target it draws into) and waited
    // for with the district's first programs.
    const first = new THREE.Mesh(proxyGeometry(), material);
    first.frustumCulled = false;
    first.matrixAutoUpdate = false;
    first.visible = false;
    warmScene.add(first);
    proxies.push(first);
    const before = renderer.info.programs.length;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.compile(warmScene, camera);
    renderer.setRenderTarget(prev);
    return {
      programs: renderer.info.programs.slice(before),
      // The buffers of `list` (each { geometry, extra: [attributes] }) to
      // the GPU in one call. A buffer over PIECE bytes is made its size
      // there and empty, and its contents are returned as pieces, each a
      // function that sends one (into a buffer nothing draws yet).
      send(list) {
        const pieces = [];
        const gl = renderer.getContext();
        const bufferData = gl.bufferData;
        const bufferSubData = gl.bufferSubData;
        const bound = (target) => gl.getParameter(target === gl.ELEMENT_ARRAY_BUFFER ? gl.ELEMENT_ARRAY_BUFFER_BINDING : gl.ARRAY_BUFFER_BINDING);
        const later = (target, buffer, at, data, from, length) => {
          const size = data.BYTES_PER_ELEMENT;
          for (let k = 0; k < length; k += PIECE / size) {
            const n = Math.min(PIECE / size, length - k);
            pieces.push(() => {
              // An index's binding is a vertex array's: none is bound while
              // it is sent, and the one that was is bound again after.
              const array = target === gl.ELEMENT_ARRAY_BUFFER ? gl.getParameter(gl.VERTEX_ARRAY_BINDING) : null;
              if (target === gl.ELEMENT_ARRAY_BUFFER) gl.bindVertexArray(null);
              const was = bound(target);
              gl.bindBuffer(target, buffer);
              bufferSubData.call(gl, target, at + k * size, data, from + k, n);
              gl.bindBuffer(target, was);
              if (target === gl.ELEMENT_ARRAY_BUFFER) gl.bindVertexArray(array);
            });
          }
        };
        gl.bufferData = function (target, data, usage, ...rest) {
          if (!ArrayBuffer.isView(data) || data.byteLength <= PIECE) return bufferData.call(gl, target, data, usage, ...rest);
          bufferData.call(gl, target, data.byteLength, usage);
          later(target, bound(target), 0, data, 0, data.length);
        };
        gl.bufferSubData = function (target, at, data, from = 0, length = 0, ...rest) {
          const n = length || data.length - from;
          if (!ArrayBuffer.isView(data) || n * data.BYTES_PER_ELEMENT <= PIECE) return bufferSubData.call(gl, target, at, data, from, length, ...rest);
          later(target, bound(target), at, data, from, n);
        };
        while (proxies.length < list.length) {
          const proxy = new THREE.Mesh(proxyGeometry(), material);
          proxy.frustumCulled = false;
          proxy.matrixAutoUpdate = false;
          warmScene.add(proxy);
          proxies.push(proxy);
        }
        proxies.forEach((proxy, i) => {
          proxy.visible = i < list.length;
          if (!proxy.visible) return;
          const g = proxy.geometry;
          const { geometry: from, extra = [] } = list[i];
          [...Object.values(from.attributes), ...extra].forEach((a, k) => g.setAttribute(`sent${k}`, a));
          g.setIndex(from.index);
          g.setDrawRange(0, 0);
        });
        const prev = renderer.getRenderTarget();
        renderer.setRenderTarget(target);
        try {
          renderer.render(warmScene, camera);
        } finally {
          gl.bufferData = bufferData;
          gl.bufferSubData = bufferSubData;
        }
        renderer.setRenderTarget(prev);
        for (const proxy of proxies) {
          const g = proxy.geometry;
          for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
          g.setIndex(null);
        }
        return pieces;
      },
      dispose() {
        target.dispose();
        material.dispose();
        for (const proxy of proxies) proxy.geometry.dispose();
      },
    };
  };
  // compile() over a list, each object with the geometry it will draw.
  class Listed extends THREE.Object3D {
    constructor(drawn) {
      super();
      this.drawn = drawn;
    }
    traverse(fn) {
      for (const { object, geometry } of this.drawn) {
        const was = object.geometry;
        object.geometry = geometry;
        fn(object);
        object.geometry = was;
      }
    }
    traverseVisible() {}
  }
  const readyToDraw = async (drawn) => {
    const programs = warmKit ? [] : (warmKit = makeWarmKit()).programs;
    const versions = new Map();
    // A few objects at a time: a new program is its shaders' text put
    // together and handed over, a few milliseconds each.
    const compileSome = async (list) => {
      const made = [];
      for (const d of list) {
        await between();
        if (disposed) return made;
        const before = renderer.info.programs.length;
        const target = renderer.getRenderTarget();
        renderer.setRenderTarget(post.composer.inputBuffer);
        for (const m of renderer.compile(new Listed([d]), camera, scene)) versions.set(m, m.version);
        renderer.setRenderTarget(target);
        made.push(...renderer.info.programs.slice(before));
      }
      return made;
    };
    programs.push(...(await compileSome(drawn)));
    // And the rain's cover, which draws the kit from above in its own
    // material (cover.js), as it will once the district is in.
    await between();
    if (disposed) return;
    programs.push(...(cover?.compile(drawn) ?? []));
    for (let round = 0; round < 3 && !disposed; round++) {
      // Each program once it is built, first used before a frame.
      for (const program of programs) {
        while (!program.isReady()) {
          await between();
          if (disposed) return;
        }
        await ask(() => {
          program.getUniforms();
          program.getAttributes();
        });
        if (disposed) return;
      }
      const pictures = new Set();
      const add = (v) => {
        if (Array.isArray(v)) v.forEach(add);
        else if (v?.isTexture && !v.isRenderTargetTexture && v.image && v.version > 0) pictures.add(v);
      };
      for (const m of versions.keys()) {
        for (const k of Object.keys(m)) add(m[k]);
        for (const u of Object.values(m.uniforms ?? {})) add(u?.value);
      }
      for (const p of pictures) {
        if (renderer.properties.get(p).__version === p.version) continue;
        await ask(() => renderer.initTexture(p));
        if (disposed) return;
      }
      if (round === 0) {
        const geometries = [...new Map(drawn.filter((d) => d.bytes > 0).map((d) => [d.extra?.length ? d.object : d.geometry, d])).values()];
        let batch = [];
        let bytes = 0;
        for (let i = 0; i <= geometries.length; i++) {
          const d = geometries[i];
          if (batch.length && (!d || bytes + d.bytes > WARM_BYTES)) {
            const list = batch;
            const pieces = await ask(() => {
              for (const b of list) b.send?.();
              return warmKit.send(list);
            });
            if (disposed) return;
            for (const piece of pieces) {
              await ask(piece);
              if (disposed) return;
            }
            batch = [];
            bytes = 0;
          }
          if (d) {
            batch.push(d);
            bytes += d.bytes;
          }
        }
      }
      // Anything set needsUpdate meanwhile is made again.
      const moved = drawn.filter(({ object }) => [].concat(object.material).some((m) => versions.get(m) !== m.version));
      if (!moved.length) return;
      programs.length = 0;
      programs.push(...(await compileSome(moved)));
    }
  };

  // ---- searchlights (src/world/searchlights.js) --------------------------------
  // The beams over the districts' roofs, built and compiled once the city's
  // first frame is drawn, when the page is idle; draw() shows them only off
  // the page (Look, Cinema) or in a directed frame whose spec asks for them
  // (`searchlights`), so the page's own shots are as they were.
  let searchlights = null;
  const buildSearchlights = async () => {
    await idle();
    if (disposed || !city) return;
    searchlights = createSearchlights(scene, shared, city.anchors);
    if (!searchlights || !renderer.compileAsync) return;
    const target = renderer.getRenderTarget();
    renderer.setRenderTarget(post.composer.inputBuffer);
    const compiled = renderer.compileAsync(searchlights.mesh, camera, scene);
    renderer.setRenderTarget(target);
    await compiled;
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
    draw(dt, null, spec.flow ?? dt);
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
    releaseLut(renderer, scene);
    pause();
    unwatch();
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    building.then((c) => {
      c.dispose();
      skyline?.dispose();
      rain?.dispose();
      cover?.dispose();
      bolt?.dispose();
      traffic?.dispose();
      car?.dispose();
      shafts?.dispose();
      koi?.dispose();
      plazaKoi?.dispose();
      crowd?.dispose();
      steam?.dispose();
      searchlights?.dispose();
    }).catch(() => {});
    // (load: the moon may still be on its way: it goes when it comes.)
    moonMade?.then((m) => m?.dispose());
    mirror?.dispose();
    mirror = null;
    glass.dispose();
    soundscape.dispose();
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
      packs: [...packsIn],
      packsTotal: PACKS.length,
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
    // `renderDirected` and `placeCamera` too, for fixed-camera review shots:
    // set `stage.mode = "cinematic"` to rest the loop, then draw any pose.
    window.__world = { renderer, scene, camera, stats, pose, want, stage, shared, get city() { return city; }, get car() { return car; }, get moon() { return moon; }, get traffic() { return traffic; }, get crowd() { return crowd; }, get skyline() { return skyline; }, post, soundscape, dumpMirror, setQuality, renderDirected, placeCamera, strike() { storm.t = storm.next; } };
    // The free camera and the loop driven and walked (src/world/devcam.js),
    // for the reviews; never in a production build.
    building.then(() => import("./devcam.js")).then((m) => m.attachDevcam(window.__world)).then((d) => {
      if (window.__world) window.__world.devcam = d;
    }).catch((err) => console.warn("[world] no dev camera", err));
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
    /**
     * What is under a point on the screen (x and y -1..1, y up) that Look
     * lets the reader touch, of `kinds` (the shot's own subjects: "car",
     * "board", "tower"), by their bounds, nearest first: { kind, slug,
     * distance }, or null. Bounds see through walls, which is why only the
     * shot's own subjects are asked about.
     */
    pick(x, y, kinds) {
      if (!city || disposed) return null;
      camera.updateMatrixWorld();
      _picker.setFromCamera(_ndc.set(x, y), camera);
      const ray = _picker.ray;
      let best = null;
      const consider = (hit, kind, slug = null) => {
        if (!hit) return;
        const distance = hit.distanceTo(ray.origin);
        if (distance < 600 && (!best || distance < best.distance)) best = { kind, slug, distance };
      };
      if (kinds.includes("car") && car) {
        // The S4's own box, in its own frame: 1.9 m wide, 1.45 m tall, 4.8
        // m long, nose along +z.
        _local.copy(ray).applyMatrix4(_inverse.copy(car.car.matrixWorld).invert());
        const hit = _local.intersectBox(CAR_BOX, _hit);
        consider(hit && hit.applyMatrix4(car.car.matrixWorld), "car");
      }
      if (kinds.includes("board") && city.boards.box) consider(ray.intersectBox(city.boards.box, _hit), "board");
      if (kinds.includes("tower")) {
        for (const t of TOWERS) {
          const a = city.anchors.get(`anchor_tower_${t.slug}`);
          if (!a) continue;
          _pickBox.min.set(a.position.x - 15, 0, a.position.z - 15);
          _pickBox.max.set(a.position.x + 15, a.position.y + 4, a.position.z + 15);
          consider(ray.intersectBox(_pickBox, _hit), "tower", t.slug);
        }
      }
      return best;
    },
    /** The S4 answers a key fob: its lamps blink and, with sound on, it
     *  chirps. */
    flashCar() {
      if (!car) return;
      car.flash();
      soundscape.chirp(car.car.position);
    },
    /**
     * The city as it is this moment, without the page's panes frosting it,
     * in a new 2D canvas the size of the drawing buffer (photo mode,
     * src/components/photo/). Drawn once more for it and copied in the same
     * task, before the browser can clear the buffer; the next frame puts
     * the frost back.
     */
    snapshot() {
      if (!city || disposed) return null;
      post.glass.count = 0;
      post.render(0);
      const out = document.createElement("canvas");
      out.width = canvas.width;
      out.height = canvas.height;
      out.getContext("2d").drawImage(canvas, 0, 0);
      return out;
    },
  };
}
