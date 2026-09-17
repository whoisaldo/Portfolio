// src/lib/garage-scene.js: the bay, in three dimensions.
//
// Loaded on demand through garage3d.js. One car on a dark floor under a
// studio light, orbitable, with its bonnet on a hinge and a set of anchor
// points the page turns into numbered markers. Everything the page needs is
// on the object this returns: presets for the three views, the hood, a
// per-frame projection of every anchor to canvas pixels, and dispose().
//
// Rules:
//   - The canvas is transparent; the panel behind it is the ink. The floor
//     is a disc that fades to nothing, so the car sits in the page rather
//     than in a box.
//   - No React state changes per frame. The page hands in a callback and
//     this module calls it with the projected markers; the page writes them
//     to the DOM directly.
//   - Under prefers-reduced-motion nothing moves on its own: no idle turn,
//     and the camera and the bonnet jump instead of tweening.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createObject } from "../three/s4/index.js";

// Where the camera stands for each of the bay's three tabs, plus a side
// view for the running gear. Position and target in metres; the car faces
// +Z, its driver's side is +X, and it rests on y = 0.
export const PRESETS = {
  front: { position: [4.3, 1.8, 6.3], target: [0, 0.55, 0.2], hood: false },
  bay: { position: [-1.2, 4.4, 6.4], target: [0.05, 0.85, 1.2], hood: true },
  rear: { position: [-4.0, 1.6, -5.6], target: [0, 0.55, -0.3], hood: false },
  side: { position: [6.2, 1.1, 1.0], target: [0, 0.55, 0.3], hood: false },
};

const HOOD_OPEN = THREE.MathUtils.degToRad(-55);
const deg = THREE.MathUtils.degToRad;
const easeOut = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

/** The floor: a dark disc with a warm pool of light under the car and a
 *  faint grid, drawn once to a canvas. */
function floorTexture() {
  const s = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, s, s);
  // The grid.
  ctx.strokeStyle = "rgba(252, 238, 10, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= s; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
  }
  // The pool of light.
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(252, 238, 10, 0.12)");
  g.addColorStop(0.45, "rgba(252, 238, 10, 0.04)");
  g.addColorStop(0.7, "rgba(11, 11, 13, 0)");
  g.addColorStop(1, "rgba(11, 11, 13, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** The floor's alpha: solid under the car, gone at the edge of the disc. */
function floorAlpha() {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.55, "#fff");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

/**
 * Build the scene on `canvas`.
 *
 *   markers   [{ id, anchor }]; anchor is { part, offset? } for a point on
 *             a named part of the model, { at: [x, y, z] } for a point in
 *             car space, or { box: [fx, fy, fz] } for a fraction of the
 *             car's bounding box. Any may carry `inBay: true` for a part
 *             under the bonnet.
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
  // A touch under 1: the paint is a dark grey in the photographs and the
  // environment map alone lifts it to silver.
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.set(...PRESETS.front.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...PRESETS.front.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.2;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.45;
  controls.update();

  // The first touch of the controls ends the idle turn for good: a reader
  // who has taken hold of the car does not want it taken back.
  controls.addEventListener("start", () => { controls.autoRotate = false; });

  // ---- the car -----------------------------------------------------------
  const car = createObject();
  car.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  const parts = car.userData.parts || {};
  scene.add(car);
  car.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(car);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  // Centre it on the origin and set it on the floor, whatever the module did.
  car.position.x -= center.x;
  car.position.z -= center.z;
  car.position.y -= box.min.y;
  car.updateMatrixWorld(true);
  box.setFromObject(car);

  const hood = parts.hood || null;
  let hoodOpen = false;
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
    let p = null;
    if (a.part && parts[a.part]) {
      _b.setFromObject(parts[a.part]);
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
    // marker resolved, in car space.
    window.__garage = {
      anchors: () => [...anchorObjs].map(([id, a]) => [id, ...a.obj.position.toArray().map((n) => +n.toFixed(2))]),
      parts: Object.keys(parts),
      size: size.toArray().map((n) => +n.toFixed(2)),
    };
  }

  // ---- the floor and the lights ------------------------------------------
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture(),
    alphaMap: floorAlpha(),
    transparent: true,
    roughness: 0.6,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 72), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // A ring on the floor marks the bay.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.42, 3.46, 96),
    new THREE.MeshBasicMaterial({ color: "#fcee0a", transparent: true, opacity: 0.32, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  scene.add(ring);

  const key = new THREE.SpotLight("#fff4dc", 90, 30, deg(38), 0.6, 1.4);
  key.position.set(2.5, 6.5, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.target.position.set(0, 0.5, 0.3);
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight("#fcee0a", 1.1);
  rim.position.set(-4, 3, -6);
  scene.add(rim);

  const fill = new THREE.DirectionalLight("#ff2e88", 0.35);
  fill.position.set(5, 2, -3);
  scene.add(fill);

  scene.add(new THREE.HemisphereLight("#3c3c46", "#050506", 0.7));

  // ---- camera moves --------------------------------------------------------
  let tween = null;
  const _from = new THREE.Vector3();
  const _fromT = new THREE.Vector3();
  const _to = new THREE.Vector3();
  const _toT = new THREE.Vector3();

  function setPreset(name) {
    const p = PRESETS[name] || PRESETS.front;
    _toT.set(...p.target);
    // The presets were framed for a 4:3 canvas. A portrait frame is
    // narrower than the car is long, so the camera stands further back
    // along the same line of sight.
    const back = camera.aspect < 1 ? 1.4 : 1;
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
    if (!hood || hoodOpen === open) return;
    hoodOpen = open;
    hoodFrom = hood.rotation.x;
    hoodTo = open ? HOOD_OPEN : 0;
    hoodT0 = performance.now();
    if (reduced) {
      hood.rotation.x = hoodTo;
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
    _sph.phi = Math.min(controls.maxPolarAngle, Math.max(0.15, _sph.phi + dPol));
    _off.setFromSpherical(_sph);
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
    if (hood && hoodT0) {
      const p = easeOut((now - hoodT0) / 900);
      hood.rotation.x = hoodFrom + (hoodTo - hoodFrom) * p;
      if (p >= 1) hoodT0 = 0;
    }
    controls.update();
    renderer.render(scene, camera);

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
        // Under a closed bonnet a bay part is not there to point at.
        o.bay = a.bay && !hoodOpen;
        if (o.bay) o.visible = false;
      }
      onFrame(out);
    }
  }

  function start() {
    if (!running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  }

  function dispose() {
    stop();
    controls.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const k of ["map", "alphaMap", "normalMap", "roughnessMap", "metalnessMap"]) m[k]?.dispose?.();
          m.dispose();
        }
      }
    });
    scene.environment?.dispose?.();
    renderer.dispose();
  }

  return {
    start,
    stop,
    resize,
    setPreset,
    setHood,
    isHoodOpen: () => hoodOpen,
    hasHood: Boolean(hood),
    orbitBy,
    dispose,
    size,
  };
}
