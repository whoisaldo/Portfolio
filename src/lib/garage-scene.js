import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createObject, preloadCar } from "../three/car/object.js";

/** An idle viewer draws no frames. Dragging, resizing and buttons invalidate it. */
export async function createGarageScene(canvas, { signal, onFailure }) {
  await preloadCar();
  signal.throwIfAborted();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.035);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.7;
  room.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff5e8, 2.5);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0002;
  const fill = new THREE.DirectionalLight(0xdce8ff, 1.4);
  fill.position.set(-5, 3, -4);
  scene.add(key, fill, new THREE.HemisphereLight(0xe9f0ff, 0x24282d, 1.1));
  const car = createObject();
  // The source has thin, overlapping body panels. Keep their studio shading
  // clean while still casting the complete silhouette onto the floor.
  car.traverse((part) => { if (part.isMesh) part.receiveShadow = false; });
  scene.add(car);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.003;
  floor.receiveShadow = true;
  scene.add(floor);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  // Wheel scrolling stays with the page. Zoom has explicit buttons/keys.
  controls.enableZoom = false;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI / 2 - 0.01;
  controls.rotateSpeed = 0.7;
  let frame = 0;
  let disposed = false;
  let visible = true;
  let fittedDistance = 0;
  let view = "front";
  let hoodProgress = 0;
  let hoodMotion = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const render = (time) => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    if (hoodMotion) {
      const t = Math.min(1, (time - hoodMotion.start) / 450);
      const eased = t * t * (3 - 2 * t);
      hoodProgress = THREE.MathUtils.lerp(hoodMotion.from, hoodMotion.to, eased);
      car.userData.setHoodProgress(hoodProgress);
      if (t === 1) hoodMotion = null;
    }
    renderer.render(scene, camera);
    if (hoodMotion) invalidate();
  };
  const invalidate = () => {
    if (!frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(render);
  };
  controls.addEventListener("change", invalidate);

  const setView = (next) => {
    view = next;
    controls.target.set(0, 0.62, -0.06);
    const direction = new THREE.Vector3(...(next === "rear" ? [5, 2.1, -7] : next === "side" ? [1, 0.14, 0] : [5.8, 2.25, 7.8]));
    let distance = fittedDistance;
    if (next === "wheels") {
      controls.target.set(0.79, 0.39, 1.395);
      direction.set(1, 0.24, 0.4);
      distance = Math.max(1.8, 2.0 / camera.aspect);
    }
    if (next === "engine") {
      controls.target.set(0, 1.0, 1.35);
      direction.set(2.6, 3.5, 5.2);
      distance = Math.max(4.6, 4.4 / camera.aspect);
    }
    camera.position.copy(controls.target).add(direction.normalize().multiplyScalar(distance));
    controls.update();
    invalidate();
  };
  const setHoodOpen = (open) => {
    const target = open ? 1 : 0;
    if (reducedMotion.matches) {
      hoodMotion = null;
      hoodProgress = target;
      car.userData.setHoodProgress(target);
    } else {
      hoodMotion = { from: hoodProgress, to: target, start: performance.now() };
    }
    setView(open ? "engine" : "front");
    invalidate();
  };
  const fit = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    const nextDistance = Math.max(6.5, 4.6 / (2 * Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect * 0.92));
    if (fittedDistance) {
      camera.position.sub(controls.target).multiplyScalar(nextDistance / fittedDistance).add(controls.target);
      fittedDistance = nextDistance;
      controls.update();
      invalidate();
    } else {
      fittedDistance = nextDistance;
      setView(view);
    }
  };
  const orbit = (horizontal, vertical = 0) => {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += horizontal;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
    controls.update();
    invalidate();
  };
  const zoom = (factor) => {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, 1.25, 18));
    camera.position.copy(controls.target).add(offset);
    controls.update();
    invalidate();
  };
  const onKey = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const actions = {
      ArrowLeft: () => orbit(-0.13), ArrowRight: () => orbit(0.13),
      ArrowUp: () => orbit(0, -0.1), ArrowDown: () => orbit(0, 0.1),
      "+": () => zoom(0.86), "=": () => zoom(0.86), "-": () => zoom(1.16),
      Home: () => setView("front"),
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  };
  const onLost = (event) => { event.preventDefault(); onFailure(); };
  canvas.addEventListener("keydown", onKey);
  canvas.addEventListener("webglcontextlost", onLost);
  const resize = new ResizeObserver(fit);
  resize.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
  });
  intersection.observe(canvas);
  document.addEventListener("visibilitychange", invalidate);
  fit();

  return {
    setView, setHoodOpen, zoom,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", invalidate);
      canvas.removeEventListener("keydown", onKey);
      canvas.removeEventListener("webglcontextlost", onLost);
      controls.dispose();
      car.userData.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      key.shadow.map?.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
