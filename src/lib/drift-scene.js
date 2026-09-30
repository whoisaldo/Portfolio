// src/lib/drift-scene.js: the car, in three dimensions.
//
// Loaded on demand through drift.js, because three.js is the largest thing
// this site ships and the intro is the only place that needs it. Everything
// here is real geometry moving through a real camera: the car's yaw, the
// counter-steer on its front wheels, the smoke off its rear tyres and the
// pools its headlights throw across the floor all fall out of one path
// through world space. That is the difference between a drift and a picture
// of one: the earlier version slid a flat cutout across the screen and
// rotated it, and the rear never stepped out because a cutout has no rear.
//
// The canvas composites over a rendered Japantown street. Its contact
// shadow, planar reflection and lamp pools share that street's ground plane.
//
// The supplied B8.5 model was customized in Blender. The same GLB is used
// in the Garage viewer; each scene owns its materials and geometry.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createObject } from "../three/car/object.js";
import { createStreetContact } from "../three/car/street-contact.js";
import { APEX_Z, clamp, deg, poseAt } from "../three/drift/path.js";
import { createLamps, createGroundLight } from "../three/drift/lamps.js";
import { createRig, createDrift } from "../three/drift/rig.js";
import { getEnv } from "./env.js";
export { preloadCar } from "../three/car/object.js";
import { DROP } from "./cues";

// The path, the lamps, the smoke and the trails live in src/three/drift/,
// shared with the live city (src/world), which runs the same drift in its
// own street. This file is the drift over the flat plate: the fallback when
// the city is off or not ready, and what the intro always was.

/** The extremes of a part's bounding box in the car's own frame. */
function localBox(part) {
  const box = new THREE.Box3().setFromObject(part);
  return box.isEmpty() ? null : box;
}

/**
 * Build the scene on `canvas`. Throws if WebGL is unavailable, which the
 * caller treats as "use the flat car".
 */
export function createDriftScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);

  // Reflections for the paint and glass. A neutral room, dimmed, with the
  // colour coming from the two rim lights instead.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x1a0a14, 0.5));
  const key = new THREE.DirectionalLight(0xd0e4e7, 0.85);
  key.position.set(6, 9, 9);
  const rimM = new THREE.DirectionalLight(0xff68ad, 1.8);
  rimM.position.set(12, 6, -20);
  const rimC = new THREE.DirectionalLight(0x79ffd7, 1.4);
  rimC.position.set(-5, 5, -28);
  scene.add(key, rimM, rimC);

  // ---- the car ----------------------------------------------------------
  const car = createObject();
  const rig = createRig(car);
  scene.add(car);
  const contact = createStreetContact(scene, camera, car);

  const carBox = localBox(car) || new THREE.Box3(new THREE.Vector3(-1, 0, -2.3), new THREE.Vector3(1, 1.2, 2.3));
  const lamps = createLamps(car);

  // ---- the floor --------------------------------------------------------
  const ground = createGroundLight(scene);

  const drift = createDrift(scene, car, rig);

  // ---- camera, sized for the viewport ------------------------------------
  // At the apex the car should span about two thirds of a landscape screen
  // and the whole of a portrait one. The camera backs off until it does,
  // keeping its downward angle, so a phone sees the same drift at the same
  // size rather than a bumper.
  let xScale = 1;
  const fit = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const aspect = w / h;
    xScale = clamp(aspect / 1.6, 0.4, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, aspect < 1 ? 2 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    const frac = aspect < 1 ? 1.05 : aspect < 1.3 ? 0.82 : 0.66;
    const dist = 4.6 / (2 * frac * Math.tan((camera.fov / 2) * deg) * aspect);
    camera.position.set(0.6, 0.8 + 0.12 * dist, APEX_Z + dist);
    camera.lookAt(-0.4, 0.7, 1.8);
    camera.updateProjectionMatrix();
  };
  fit();
  window.addEventListener("resize", fit);

  // ---- per-frame state ---------------------------------------------------
  let last = null;
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3());
  const _v = new THREE.Vector3();
  let edge = null;
  // `live` once the intro has drawn a real frame; `warming` during the one
  // hidden frame the warm-up draws, which must leave no smoke or trail
  // behind for the real frames to find.
  let live = false;
  let warming = false;
  let disposed = false;

  const draw = (s) => {
    // Everything that moves on its own (wheels, smoke, trails) runs on the
    // song clock too, so the whole scene freezes when the clock does.
    const now = s;
    const dt = last === null ? 0 : clamp(now - last, 0, 0.05);
    last = now;

    const d = s - DROP;
    const pose = poseAt(d, xScale);
    const { spin } = drift.place(pose, d, dt);

    car.updateMatrixWorld(true);
    contact.update(getEnv().wet);

    // Floor lights follow the lamps.
    ground.update(car, lamps, camera.position);

    // Smoke off the rear tyres while they are sliding or spinning.
    if (d >= 0 && spin > 0.12 && !warming) drift.emitSmoke(pose, dt, now);

    // Trails.
    if (d >= 0 && !warming) drift.pushTrails(lamps.tailL, lamps.tailR, pose.speed, now);
    drift.update(now);

    renderer.render(scene, camera);

    // The car's right-most point on screen, in vw, for the wipe to trail.
    let max = -Infinity;
    let i = 0;
    for (const x of [carBox.min.x, carBox.max.x]) {
      for (const y of [carBox.min.y, carBox.max.y]) {
        for (const z of [carBox.min.z, carBox.max.z]) {
          const c = corners[i++].set(x, y, z).applyMatrix4(car.matrixWorld);
          _v.copy(c).project(camera);
          if (_v.z < 1) max = Math.max(max, _v.x);
        }
      }
    }
    edge = max === -Infinity ? null : (max + 1) * 50;
  };

  const render = (s) => {
    live = true;
    draw(s);
  };

  // ---- warm-up -----------------------------------------------------------
  // A shader compiles the first time its material is drawn, and three only
  // draws what is inside the frustum. So a car that starts off the right
  // edge has compiled nothing when it arrives, and every one of its
  // materials compiled on the frame it appeared: measured at 1.4 seconds of
  // frozen page a third of a second into the drift. Compile everything
  // first, in the background where the browser allows it, then draw one
  // frame with the car in front of the lens while the canvas is still
  // invisible, so the first frame anyone sees has nothing left to set up.
  const warm = async () => {
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
    // Too late to draw a hidden frame if the real ones have started, and
    // nothing to draw into if the scene is gone.
    if (disposed || live) return;
    warming = true;
    try {
      draw(DROP + 1.4);
    } finally {
      warming = false;
      last = null;
      drift.resetCarry();
      edge = null;
    }
  };

  const dispose = () => {
    disposed = true;
    window.removeEventListener("resize", fit);
    drift.dispose();
    lamps.dispose();
    ground.dispose();
    contact.dispose();
    scene.environment?.dispose?.();
    car.userData.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return {
    render,
    /** Compile the shaders and draw one hidden frame. Call once, as soon as
     *  the scene exists and well before the canvas is shown. */
    warm,
    /** Right edge of the car on screen in vw, or null when it has left. */
    edgeVw: () => edge,
    dispose,
  };
}
