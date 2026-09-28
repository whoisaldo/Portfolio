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
import * as THREE from "three";
import { stage, subscribeStage } from "./stage.js";
import { createShots, makePose, copyPose, heroPose, clamp } from "./shots.js";
import { createGreybox } from "./greybox.js";
import { TIERS } from "./quality.js";

/** Everything the scene needs before it can be built. */
export async function preloadWorld() {}

const DEG = Math.PI / 180;

export function createWorldScene(canvas, { tier = "high", onFirstFrame, onLost } = {}) {
  const quality = { ...TIERS[tier] };
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x050506, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  scene.fog = new THREE.FogExp2(0x0b0710, 0.0022);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 3000);
  scene.add(new THREE.HemisphereLight(0x3a3f55, 0x0a0608, 0.6));

  const city = createGreybox(scene);
  const shots = createShots(city.anchors);

  // ---- size ---------------------------------------------------------------
  let width = 1;
  let height = 1;
  let aspect = 1;
  const resize = () => {
    width = Math.max(1, canvas.clientWidth || window.innerWidth);
    height = Math.max(1, canvas.clientHeight || window.innerHeight);
    aspect = width / height;
    // Pixels are the budget: a device pixel ratio cap per tier, and a cap on
    // the total so a 4K monitor does not render four times a laptop's work.
    const ratio = Math.min(window.devicePixelRatio || 1, quality.dpr, Math.sqrt(quality.pixels / (width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
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
  const tilt = { x: 0, y: 0 };
  const ids = () => stage.shots.map((s) => s.id);

  const applyPose = (p, withTilt) => {
    camera.position.copy(p.position);
    camera.lookAt(p.target);
    if (withTilt) {
      camera.rotateY(-tilt.x * 1.4 * DEG);
      camera.rotateX(-tilt.y * 0.9 * DEG);
    }
    if (Math.abs(camera.fov - p.fov) > 1e-4) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }
  };

  const step = (dt) => {
    const list = ids();
    if (stage.route.kind !== "home" || !list.length) {
      heroPose(aspect, want);
    } else {
      shots.goal(list, stage.position, stage.locals, aspect, want);
    }
    // A jump of more than a shot in one frame is a deep link or a long nav
    // jump: land on it, with a glitch to say so, rather than fly across the
    // whole city in half a second.
    const jumped = Math.abs(stage.position - lastPosition) > 1.2;
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
    }
    const t = 1 - Math.exp(-dt * 3);
    tilt.x += (stage.pointer.x - tilt.x) * t;
    tilt.y += (stage.pointer.y - tilt.y) * t;
    glitch *= Math.exp(-dt * 7);
    applyPose(pose, true);
  };

  // ---- the loop -------------------------------------------------------------
  let raf = 0;
  let last = 0;
  let firstFrame = false;
  let disposed = false;
  const times = new Float32Array(240);
  let timeIndex = 0;

  const render = () => {
    renderer.render(scene, camera);
    if (!firstFrame) {
      firstFrame = true;
      onFirstFrame?.();
    }
  };

  const frame = (now) => {
    raf = 0;
    if (disposed) return;
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
    last = now;
    step(dt);
    city.update(now / 1000);
    render();
  };

  const resume = () => {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  };
  const pause = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };

  // The loop is started and stopped from the stage: covers, visibility and
  // the intro's mode all land there.
  let running = null;
  const check = () => {
    const next = !stage.paused && stage.mode !== "cinematic";
    if (next === running) return;
    running = next;
    if (running) resume();
    else pause();
  };
  const unwatch = subscribeStage(check);
  check();

  // ---- context loss ------------------------------------------------------------
  const onContextLost = (e) => {
    e.preventDefault();
    pause();
    onLost?.();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  // ---- warm-up -------------------------------------------------------------------
  // Compile every material before anyone is looking, then draw one frame of
  // the hero with the canvas still invisible, so the first frame that
  // counts has nothing left to set up.
  const warm = async () => {
    heroPose(aspect, want);
    copyPose(pose, want);
    applyPose(pose, false);
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  };

  // ---- the intro -------------------------------------------------------------------
  /** One frame of the cinematic, at song second `s`, on the hero camera. */
  const renderCinematic = () => {
    heroPose(aspect, want);
    copyPose(pose, want);
    applyPose(pose, false);
    posed = true;
    render();
  };

  const dispose = () => {
    disposed = true;
    pause();
    unwatch();
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    city.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const stats = () => {
    const n = Math.min(timeIndex, times.length);
    const arr = Array.from(times.slice(0, n)).sort((a, b) => a - b);
    const p = (x) => (n ? +arr[Math.min(n - 1, Math.floor(x * n))].toFixed(2) : 0);
    return { frames: n, p50: p(0.5), p95: p(0.95), glitch: +glitch.toFixed(3), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, frame: renderer.info.render.frame, memory: { ...renderer.info.memory } };
  };

  if (import.meta.env.DEV) window.__world = { renderer, scene, camera, stats, pose, want, stage };

  return {
    warm,
    renderCinematic,
    pause,
    resume,
    setQuality: () => {},
    stats,
    dispose,
    get info() {
      return renderer.info;
    },
  };
}
