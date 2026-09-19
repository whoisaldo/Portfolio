// The S4 inside the Blender-built Night City garage. Camera, hood and
// marker projection share the original controls. The room owns its media.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { createGarageRoom, preloadGarageRoom } from "../three/garage-room.js";
import { preloadCar } from "../three/car/object.js";
import { createGarageFloor } from "../three/garage-floor.js";
import { createObject } from "../three/car/object.js";

export const preloadGarage = () => Promise.all([preloadCar(), preloadGarageRoom()]);

// Where the camera stands for each of the bay's five tabs. Position and
// target in metres; the car faces +Z, its driver's side is +X, and it rests
// on y = 0. The wheel tab stands as close as the controls allow (ZOOM_MIN)
// at the front left wheel; the cabin tab looks down through the windshield
// at the MMI.
export const PRESETS = {
  front: { position: [3.6, 1.75, 5.8], target: [0, 1.4, -1], hood: false },
  room: { position: [0.5, 2.5, 2.4], target: [-2.4, 2.6, -5.6], hood: false },
  bay: { position: [-1.0, 3.9, 5.6], target: [0.05, 0.85, 1.2], hood: true },
  rear: { position: [-3.6, 1.5, -5.1], target: [0, 0.55, -0.3], hood: false },
  wheel: { position: [3.5, 0.92, 3.2], target: [0.8, 0.36, 1.4], hood: false },
  cabin: { position: [0.9, 1.75, 3.6], target: [0, 1.0, 0.55], hood: false },
};

const ZOOM_MIN = 3.2;
const ZOOM_MAX = 9.5;
const easeOut = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

/**
 * Build the scene on `canvas`. Call preloadGarage() first (garage3d.js does).
 *
 *   markers   [{ id, anchor }]; anchor is { part, offset? } for a point at
 *             the centre of a named node of the model, { at: [x, y, z] }
 *             for a point in car space, or { box: [fx, fy, fz] } for a
 *             fraction of the car's bounding box. Any may carry
 *             `inBay: true` for a part under the hood.
 *   onFrame   called every rendered frame with [{ id, x, y, front, bay }]:
 *             canvas pixels, whether the point faces the camera, and
 *             whether it is a bay point.
 *   reduced   prefers-reduced-motion
 */
export function createGarageScene(canvas, { markers = [], onFrame, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#060a10");
  const room = createGarageRoom(scene, renderer, { reduced });

  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 50);
  camera.position.set(...PRESETS.front.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...PRESETS.front.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = ZOOM_MIN;
  controls.maxDistance = ZOOM_MAX;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minPolarAngle = Math.PI * 0.23;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.45;
  controls.update();

  // The first touch of the controls ends the idle turn for good: a reader
  // who has taken hold of the car does not want it taken back.
  controls.addEventListener("start", () => { controls.autoRotate = false; });

  // The wheel belongs to the page. OrbitControls listens on the canvas in
  // the bubbling phase; this capture listener runs first and, unless ctrl
  // or command is held (which is also what a trackpad pinch sends), stops
  // the event there, so it goes on to scroll the page.
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
  };
  canvas.addEventListener("wheel", onWheel, { capture: true, passive: true });

  // ---- the car -----------------------------------------------------------
  const car = createObject();
  // The body is thin, overlapping panels: they cast the silhouette onto the
  // floor but do not shade each other.
  car.traverse((o) => {
    if (o.isMesh) o.receiveShadow = false;
  });
  scene.add(car);
  car.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(car);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  // Centre it on the origin and set it on the floor, whatever the file did.
  car.position.x -= center.x;
  car.position.z -= center.z;
  car.position.y -= box.min.y;
  car.updateMatrixWorld(true);
  box.setFromObject(car);
  renderer.shadowMap.needsUpdate = true;
  const wetFloor = createGarageFloor(scene);

  // The hood: object.js drives the hinge and the gas strut from a 0 to 1
  // progress; this only tweens the number.
  const setHoodProgress = car.userData.setHoodProgress;
  const hasHood = typeof setHoodProgress === "function" && Boolean(car.userData.parts?.hood_hinge);
  let hoodOpen = false;
  let hoodAt = 0;
  let hoodFrom = 0;
  let hoodTo = 0;
  let hoodT0 = 0;

  // ---- the anchors -------------------------------------------------------
  const anchorObjs = new Map();
  const _b = new THREE.Box3();
  const _c = new THREE.Vector3();
  for (const m of markers) {
    const a = m.anchor || {};
    const obj = new THREE.Object3D();
    obj.name = `anchor_${m.id}`;
    const node = a.part ? car.getObjectByName(a.part) : null;
    let p = null;
    if (node) {
      _b.setFromObject(node);
      _b.getCenter(_c);
      // World -> car local, so the anchor rides with the car.
      car.worldToLocal(_c);
      p = _c.clone();
      if (a.offset) p.add(new THREE.Vector3(...a.offset));
    } else if (a.at) {
      p = new THREE.Vector3(...a.at);
    } else if (a.box) {
      const [fx, fy, fz] = a.box;
      p = new THREE.Vector3(
        box.min.x + size.x * fx,
        box.min.y + size.y * fy,
        box.min.z + size.z * fz,
      );
      car.worldToLocal(p);
    } else {
      p = new THREE.Vector3(0, 0.6, 0);
    }
    obj.position.copy(p);
    car.add(obj);
    anchorObjs.set(m.id, { obj, bay: Boolean(a.inBay) });
  }
  if (import.meta.env.DEV) {
    // For placing anchors: `window.__garage.anchors()` lists where each
    // marker resolved, in car space; `.parts` is every named node.
    const parts = [];
    car.traverse((o) => { if (o.name && !o.name.startsWith("anchor_")) parts.push(o.name); });
    window.__garage = {
      anchors: () => [...anchorObjs].map(([id, a]) => [id, ...a.obj.position.toArray().map((n) => +n.toFixed(2))]),
      parts,
      size: size.toArray().map((n) => +n.toFixed(2)),
      distance: () => +camera.position.distanceTo(controls.target).toFixed(3),
      room: () => ({ nodes: room.room.children.map((o) => o.name), active: room.active, videoPaused: room.video.paused, videoTime: room.video.currentTime, camera: camera.position.toArray() }),
      preset: (name) => setPreset(name),
    };
  }

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ambientOcclusion = new SSAOPass(scene, camera, 1, 1, 16);
  ambientOcclusion.kernelRadius = 0.42;
  ambientOcclusion.minDistance = 0.001;
  ambientOcclusion.maxDistance = 0.16;
  composer.addPass(ambientOcclusion);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.14, 0.25, 1.8));
  composer.addPass(new OutputPass());
  composer.addPass(new SMAAPass());
  if (import.meta.env.DEV) window.__garage.rendering = { scene, camera, renderer, composer, ambientOcclusion };

  // ---- camera moves --------------------------------------------------------
  let tween = null;
  const _from = new THREE.Vector3();
  const _fromT = new THREE.Vector3();
  const _to = new THREE.Vector3();
  const _toT = new THREE.Vector3();

  function setPreset(name) {
    const p = PRESETS[name] || PRESETS.front;
    _toT.set(...p.target);
    if (camera.aspect < 1 && name === "front") _toT.z = 0;
    // The presets were framed for a 4:3 canvas. A portrait frame is
    // narrower than the car is long, so the camera stands further back
    // along the same line of sight.
    const back = camera.aspect < 1 ? (name === "front" ? 1.2 : 1.08) : 1;
    _to.set(...p.position).sub(_toT).multiplyScalar(back).add(_toT);
    controls.autoRotate = false;
    if (reduced) {
      camera.position.copy(_to);
      controls.target.copy(_toT);
      controls.update();
      tween = null;
    } else {
      _from.copy(camera.position);
      _fromT.copy(controls.target);
      tween = { t0: performance.now(), ms: 950 };
    }
    setHood(Boolean(p.hood));
  }

  function setHood(open) {
    if (!hasHood || hoodOpen === open) return;
    hoodOpen = open;
    hoodFrom = hoodAt;
    hoodTo = open ? 1 : 0;
    hoodT0 = performance.now();
    if (reduced) {
      hoodAt = hoodTo;
      setHoodProgress(hoodAt);
      renderer.shadowMap.needsUpdate = true;
      hoodT0 = 0;
    }
  }

  /** Turn the camera about the target by hand (the keyboard). */
  const _sph = new THREE.Spherical();
  const _off = new THREE.Vector3();
  function orbitBy(dAz, dPol) {
    controls.autoRotate = false;
    tween = null;
    _off.copy(camera.position).sub(controls.target);
    _sph.setFromVector3(_off);
    _sph.theta += dAz;
    _sph.phi = Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, _sph.phi + dPol));
    _off.setFromSpherical(_sph);
    camera.position.copy(controls.target).add(_off);
    controls.update();
  }

  /** Move the camera along its line of sight: under 1 is closer. */
  function zoomBy(factor) {
    controls.autoRotate = false;
    tween = null;
    _off.copy(camera.position).sub(controls.target);
    _off.setLength(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, _off.length() * factor)));
    camera.position.copy(controls.target).add(_off);
    controls.update();
  }

  // ---- the loop ------------------------------------------------------------
  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();
  const _cam = new THREE.Vector3();
  const _mid = new THREE.Vector3();
  const out = markers.map((m) => ({ id: m.id, x: 0, y: 0, front: true, bay: false, visible: true }));
  let raf = 0;
  let running = false;
  let width = 1;
  let height = 1;

  function frame() {
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    if (tween) {
      const p = easeOut((now - tween.t0) / tween.ms);
      camera.position.lerpVectors(_from, _to, p);
      controls.target.lerpVectors(_fromT, _toT, p);
      if (p >= 1) tween = null;
    }
    if (hasHood && hoodT0) {
      const p = easeOut((now - hoodT0) / 900);
      hoodAt = hoodFrom + (hoodTo - hoodFrom) * p;
      setHoodProgress(hoodAt);
      renderer.shadowMap.needsUpdate = true;
      if (p >= 1) hoodT0 = 0;
    }
    controls.update();
    // The enclosed room bounds also apply while a preset is tweening.
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -6.6, 6.6);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.3, 5.1);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -6.5, 8.3);
    room.update(now);
    composer.render();

    if (onFrame) {
      camera.getWorldPosition(_cam);
      _mid.set(0, 0.6, 0);
      let i = 0;
      for (const m of markers) {
        const a = anchorObjs.get(m.id);
        const o = out[i++];
        a.obj.getWorldPosition(_w);
        _v.copy(_w).project(camera);
        o.x = ((_v.x + 1) / 2) * width;
        o.y = ((1 - _v.y) / 2) * height;
        o.visible = _v.z < 1 && _v.z > -1;
        // Facing: on the camera's side of the car's middle, judged in the
        // floor plane so a low camera does not dim the roof.
        const dx = _w.x - _mid.x, dz = _w.z - _mid.z;
        const cx = _cam.x - _mid.x, cz = _cam.z - _mid.z;
        const dot = (dx * cx + dz * cz) / (Math.hypot(dx, dz) * Math.hypot(cx, cz) || 1);
        o.front = dot > -0.25;
        // Under a closed hood a bay part is not there to point at.
        o.bay = a.bay && !hoodOpen;
        if (o.bay) o.visible = false;
      }
      onFrame(out);
    }
  }

  function start() {
    if (!running) {
      running = true;
      room.start();
      raf = requestAnimationFrame(frame);
    }
  }
  function stop() {
    running = false;
    room.stop();
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    // Keep small retina canvases crisp without rendering a five-million-
    // pixel postprocessing stack when the garage enters full screen.
    const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.max(1, Math.sqrt(1_300_000 / (width * height))));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
    if (!running) composer.render();
  }

  function dispose() {
    stop();
    controls.dispose();
    canvas.removeEventListener("wheel", onWheel, { capture: true });
    car.userData.dispose();
    room.dispose();
    wetFloor.dispose();
    for (const pass of composer.passes) pass.dispose?.();
    ambientOcclusion.ssaoMaterial.dispose();
    ambientOcclusion.noiseTexture.dispose();
    composer.dispose();
    if (import.meta.env.DEV) delete window.__garage;
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    start,
    stop,
    resize,
    setPreset,
    setHood,
    isHoodOpen: () => hoodOpen,
    hasHood,
    orbitBy,
    zoomBy,
    dispose,
    size,
  };
}
