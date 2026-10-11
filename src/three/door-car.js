// src/three/door-car.js: Ali's S4 on the door, and the way in.
//
// The real car, as scripts/blender/build_s4_door.py cuts it for the door:
// every part seen from outside at full detail, with ambient occlusion from
// Cycles baked into its vertex colours (GLTFLoader multiplies them into each
// material). It turns in a small studio in the door's own colours: a soft
// white box overhead and white strips high up, a short volt and a short
// magenta strip low on either side that run along the sills as it goes
// round. A dark floor under it gives back a faded reflection, with a soft
// shadow and a thin volt ring.
//
// The canvas covers the screen behind the door's words, and the camera's
// view offset puts the car over the layout's own slot for it (`anchor`), so
// the way in can take it to the middle of the screen with nothing to clip
// it. It is live while the door is up: a drag spins it and it coasts back to
// its own turn; `setLights` brings the headlamps up or down (the door does,
// from the menu); `setProgress` draws the city's loading on the ring;
// `setBusy` brings it to a standstill while the city builds behind the door,
// where a long frame cannot show on a car that is not moving.
// `launch` is the way in: the car swings round to face the lens, its lamps
// flare, the ring throws a pulse, and the camera pushes in down the beams as
// the car rolls forward, the floor and the lamps beating with the song's
// bass, which starts with it.
//
// One lazy chunk with three.js, which the city shares; the model is 0.9 MB.
// It starts after the door is up and never holds it.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { doorCarUrl } from "../data/door-car";
import { getLevels } from "../lib/ambient";
import { markBytes } from "../world/progress";

// One turn in this many seconds, on its own.
const TURN_SECONDS = 32;
const VOLT = 0xfcee0a;
const MAGENTA = 0xff2e88;
// Where the camera looks from, at rest: up and off the front quarter.
const VIEW = new THREE.Vector3(6.2, 2.4, 7.2).normalize();
const AZIMUTH = Math.atan2(VIEW.x, VIEW.z);
const ELEVATION = Math.asin(VIEW.y);
const FOV = 24;
// What has to fit the layout's slot: the ring across, the car and its
// reflection top to bottom, in metres.
const SPAN_X = 6.4;
const SPAN_Y = 4.6;

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeIn = (t) => t * t * t;

/** The studio, rendered once into an environment map. */
function studio(renderer) {
  const env = new THREE.Scene();
  const disposables = [];
  const add = (geometry, color, intensity, position, rotation) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    env.add(mesh);
    disposables.push(geometry, material);
  };
  add(new THREE.BoxGeometry(40, 16, 40), 0x040406, 1, [0, 6, 0], [0, 0, 0]);
  add(new THREE.PlaneGeometry(7, 4), 0xffffff, 2.4, [0, 7, 0], [Math.PI / 2, 0, 0]);
  // Short coloured strips low on either side, and two white ones high: the
  // colour runs along the sills and the lower doors as the car turns (the
  // windows lean in and give back what is high, so a strip at their height
  // filled them), and the white keeps the paint grey.
  add(new THREE.PlaneGeometry(6, 0.3), VOLT, 1.6, [-9, 0.5, -3], [0, Math.PI / 2, 0]);
  add(new THREE.PlaneGeometry(6, 0.3), MAGENTA, 1.2, [9, 0.5, -3], [0, -Math.PI / 2, 0]);
  add(new THREE.PlaneGeometry(10, 0.5), 0xffffff, 1.6, [-7, 4.5, 6], [0, Math.PI / 4, 0]);
  add(new THREE.PlaneGeometry(10, 0.5), 0xffffff, 1.2, [7, 4.5, 6], [0, -Math.PI / 4, 0]);
  add(new THREE.PlaneGeometry(12, 1.6), 0x00e5ff, 0.6, [0, 2.4, -12], [0, 0, 0]);
  add(new THREE.PlaneGeometry(12, 1.2), 0xffffff, 0.8, [0, 2.2, 12], [0, Math.PI, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  for (const d of disposables) d.dispose();
  return texture;
}

// The floor: the reflection fading out from the car, a soft shadow where it
// stands, the ring (the loading drawn on it as an arc from the lens's side,
// going round), and the pulse the way in throws out from it.
const FloorShader = {
  name: "DoorFloor",
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uTurn: { value: 0 },
    uRing: { value: 0.5 },
    uProgress: { value: -1 },
    uPulse: { value: -1 },
    uBass: { value: 0 },
    uBeam: { value: 0 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vPos;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vPos = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTurn;
    uniform float uRing;
    uniform float uProgress;
    uniform float uPulse;
    uniform float uBass;
    uniform float uBeam;
    varying vec4 vUv;
    varying vec2 vPos;
    const vec3 VOLT = vec3(0.99, 0.93, 0.04);
    void main() {
      vec4 reflection = texture2DProj(tDiffuse, vUv);
      float r = length(vPos) / 4.2;
      float fade = smoothstep(0.95, 0.1, r);
      float shadow = smoothstep(1.0, 0.3, length(vPos / vec2(1.2, 2.55)));
      // The floor turns with the car; the ring's arc stays put. The floor's
      // (x, y) is the world's (x, -z), turned by uTurn about the vertical.
      float c = cos(uTurn), s = sin(uTurn);
      vec2 w = vec2(vPos.x * c - vPos.y * s, -vPos.x * s - vPos.y * c);
      float ang = fract((atan(w.x, w.y) - ${AZIMUTH.toFixed(4)}) / 6.2831853 + 1.0);
      // Loading: the arc done bright with a hot head at its tip, the rest
      // nearly out.
      float lit = uProgress < 0.0 ? 1.0 : step(ang, uProgress);
      float head = uProgress < 0.0 ? 0.0 : smoothstep(0.035, 0.0, abs(ang - uProgress)) * 1.5;
      float line = smoothstep(0.006, 0.0, abs(r - 0.69));
      float ring = line * (mix(0.06, 1.0, lit) * (uProgress < 0.0 ? uRing + uBass * 0.6 : 1.0) + head);
      float pulse = 0.0;
      if (uPulse >= 0.0) pulse = smoothstep(0.02, 0.0, abs(r - mix(0.69, 0.98, uPulse))) * (1.0 - uPulse) * 1.4;
      // The headlamps on the floor ahead of the car: two pools that spread
      // and brighten with the beam. (The floor's y is the car's -z: ahead
      // is negative.)
      vec2 beamL = (vPos - vec2(-0.62, -2.95)) / vec2(0.7, 0.95);
      vec2 beamR = (vPos - vec2(0.62, -2.95)) / vec2(0.7, 0.95);
      float beam = (exp(-dot(beamL, beamL) * 2.2) + exp(-dot(beamR, beamR) * 2.2)) * uBeam * smoothstep(1.0, 0.72, r);
      vec3 col = reflection.rgb * (0.45 + uBass * 0.3) * fade + VOLT * (ring + pulse) + vec3(1.0, 0.97, 0.9) * beam * 0.55;
      gl_FragColor = vec4(col, clamp(fade * 0.5 + shadow * 0.65 + ring + pulse + beam * 0.5, 0.0, 1.0));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

/** A soft round glow, for the headlamps. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(225,240,255,0.55)");
  grad.addColorStop(1, "rgba(225,240,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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

/**
 * Draw the car into `canvas` (which covers the screen) over the element
 * `anchor` points at, until `stop()`. `reduced`: no turn of its own, no
 * parallax and no way in (a drag still turns it). `onReady` fires after the
 * first frame with the car in it.
 */
export function mountDoorCar(canvas, { anchor, reduced = false, onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Reading a program's log waits for the GPU to finish it: worth it while
  // working on the shaders, not on a reader's door.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;

  const scene = new THREE.Scene();
  const environment = studio(renderer);
  scene.environment = environment;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);
  const turn = new THREE.Group();
  scene.add(turn);
  const body = new THREE.Group();
  turn.add(body);

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-3, 6, 4);
  const rimLeft = new THREE.DirectionalLight(VOLT, 0.7);
  rimLeft.position.set(-6, 1.4, -3);
  const rimRight = new THREE.DirectionalLight(MAGENTA, 0.7);
  rimRight.position.set(6, 1.6, -3);
  scene.add(key, rimLeft, rimRight);

  const floor = new Reflector(new THREE.CircleGeometry(4.2, 96), {
    shader: FloorShader,
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.003,
  });
  floor.material.transparent = true;
  floor.material.depthWrite = false;
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.002;
  turn.add(floor);
  const fu = floor.material.uniforms;

  const glow = glowTexture();
  const glows = [];
  const lamps = [];
  const owned = [glow];

  const state = {
    angle: 0.75,
    vel: 0,
    drag: null,
    lights: 0.6,
    lightsTarget: 0.6,
    launch: null,
    // While the city builds behind the door the car eases to a standstill
    // and stops drawing: a long frame can't show on a car that isn't moving.
    busy: false,
    spin: 1,
  };
  const frameAt = { cx: 0, cy: 0, d: 12, ok: false };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const target = new THREE.Vector3();
  let width = 0;
  let height = 0;
  let raf = 0;
  let alive = true;
  let loaded = false;
  let last = performance.now();
  // Under reduced motion nothing moves by itself: a frame only when
  // something changed (a drag, the lamps, the ring, the layout).
  let dirty = true;

  // Where the layout wants the car, and how far back it must be to fit.
  const measure = () => {
    const r = anchor?.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height || !height) return;
    const c = canvas.getBoundingClientRect();
    frameAt.cx = r.left + r.width / 2 - c.left;
    frameAt.cy = r.top + r.height / 2 - c.top;
    const visible = Math.max((SPAN_Y * height) / r.height, (SPAN_X * height) / r.width);
    frameAt.d = visible / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    frameAt.ok = true;
  };

  const draw = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const L = state.launch;
    const bass = L ? getLevels().bass : 0;
    let cx = frameAt.cx;
    let cy = frameAt.cy;
    let d = frameAt.d;
    let elevation = ELEVATION;
    let lookY = 0.6;
    let roll = 0;
    let lightsOver = 0;
    fu.uPulse.value = -1;

    if (L) {
      const p = clamp((now - L.t0) / L.ms);
      // Round to face the lens, then the push down the beams as it rolls.
      state.angle = lerp(L.a0, L.a1, inOut(clamp(p / 0.5)));
      const push = clamp((p - 0.1) / 0.9) ** 2;
      const centre = inOut(clamp(p / 0.65));
      cx = lerp(L.cx, width / 2, centre);
      cy = lerp(L.cy, height / 2, centre);
      d = lerp(L.d, 3.7, push);
      elevation = lerp(ELEVATION, 0.05, inOut(clamp((p - 0.1) / 0.7)));
      lookY = lerp(0.6, 0.58, push);
      roll = easeIn(clamp((p - 0.4) / 0.6)) * 1.0;
      lightsOver = clamp(p / 0.15) * 1.4;
      fu.uPulse.value = clamp(p / 0.7);
      if (p >= 1 && !L.done) {
        L.done = true;
        L.resolve();
      }
    } else if (!state.drag) {
      state.vel *= Math.exp(-dt * 2.2);
      state.spin += ((state.busy ? 0 : 1) - state.spin) * (1 - Math.exp(-dt * (state.busy ? 7 : 3)));
      state.angle += ((reduced ? 0 : ((Math.PI * 2) / TURN_SECONDS) * state.spin) + state.vel) * dt;
    }

    turn.rotation.y = state.angle;
    body.position.set(0, 0, roll);
    state.lights += (state.lightsTarget - state.lights) * (1 - Math.exp(-dt * 6));
    const lights = state.lights + lightsOver + bass * 0.8;
    for (const m of lamps) m.emissiveIntensity = 0.25 + 3.2 * lights;
    for (const g of glows) {
      g.material.opacity = clamp(lights * 0.8);
      g.scale.setScalar(0.5 + lights * 0.6);
    }
    // The pools on the floor only come up past the running lights.
    fu.uBeam.value = clamp((lights - 0.62) / 0.38) ** 1.2;
    fu.uTurn.value = state.angle;
    fu.uRing.value = 0.35 + state.lights * 0.4;
    fu.uBass.value = bass;

    if (!reduced) {
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
    }
    const sway = L ? 1 - clamp((now - L.t0) / (L.ms * 0.3)) : 1;
    target.set(pointer.x * 0.3 * sway, lookY + pointer.y * 0.15 * sway, 0);
    camera.position.set(
      target.x + Math.sin(AZIMUTH) * Math.cos(elevation) * d,
      target.y + Math.sin(elevation) * d,
      target.z + Math.cos(AZIMUTH) * Math.cos(elevation) * d,
    );
    camera.lookAt(target);
    // The car over its slot: the look-at point lands at (cx, cy).
    camera.setViewOffset(width, height, width / 2 - cx, height / 2 - cy, width, height);
    renderer.render(scene, camera);
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (w !== width || h !== height) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      const ratio = renderer.getPixelRatio();
      floor.getRenderTarget().setSize(Math.round((w * ratio) / 2), Math.round((h * ratio) / 2));
      camera.aspect = w / h;
    }
    measure();
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  if (anchor?.current) ro.observe(anchor.current);
  window.addEventListener("resize", resize);

  const loop = (now) => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden || !loaded || !frameAt.ok) return;
    const still = reduced || (state.busy && state.spin < 0.01 && Math.abs(state.vel) < 0.001 && !state.launch);
    if (still && !dirty && !state.drag && Math.abs(state.lights - state.lightsTarget) < 0.005) {
      last = now;
      return;
    }
    dirty = false;
    draw(now);
  };

  // A drag that starts over the car turns it; let go and it coasts.
  const inside = (e) => {
    const r = anchor?.current?.getBoundingClientRect();
    return r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  const onDown = (e) => {
    if (!loaded || state.launch || e.button > 0 || e.target.closest?.("button, a") || !inside(e)) return;
    state.drag = { x: e.clientX, t: performance.now() };
    state.vel = 0;
  };
  const onMove = (e) => {
    if (e.pointerType === "mouse") {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    }
    const g = state.drag;
    if (!g) return;
    const now = performance.now();
    const turnBy = (e.clientX - g.x) * 0.009;
    state.angle += turnBy;
    state.vel = turnBy / Math.max(0.008, (now - g.t) / 1000);
    g.x = e.clientX;
    g.t = now;
    dirty = true;
  };
  const onUp = () => {
    if (!state.drag) return;
    if (reduced || performance.now() - state.drag.t > 80) state.vel = 0;
    state.drag = null;
  };
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });

  new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(doorCarUrl, (e) => markBytes("doorCar", e.loaded, e.total))
    .then((gltf) => {
      if (!alive) return;
      const front = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        owned.push(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          owned.push(m);
          for (const v of Object.values(m)) if (v?.isTexture) owned.push(v);
          if (/illuminated_lamp/.test(m.name)) {
            lamps.push(m);
            front.push(o);
          }
          // The glass and the gloss-black trim around it dimmer mirrors: at
          // full strength a strip filled the side windows and read as a lit
          // cabin.
          if (/tinted_glass|clear_lamp_lenses|gloss_black_trim/.test(m.name)) m.envMapIntensity = 0.3;
          if (/metallic_grey/.test(m.name) && m.isMeshPhysicalMaterial) {
            m.clearcoat = 1;
            m.clearcoatRoughness = 0.06;
          }
        }
      });
      body.add(gltf.scene);
      body.updateMatrixWorld(true);
      // A glow on each headlamp: the lit details at the front, left and right.
      const box = new THREE.Box3();
      const sides = { left: [], right: [] };
      for (const o of front) {
        box.setFromObject(o);
        const c = box.getCenter(new THREE.Vector3());
        if (c.z > 1.5) sides[c.x < 0 ? "left" : "right"].push(c);
      }
      for (const list of Object.values(sides)) {
        if (!list.length) continue;
        const c = list.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(list.length);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xeaf4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        sprite.position.copy(c).add(new THREE.Vector3(0, 0, 0.25));
        body.add(sprite);
        glows.push(sprite);
        owned.push(sprite.material);
      }
      // Every program built before the first frame anyone sees, without
      // holding the main thread while the GPU links them.
      resize();
      return (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).then(() => {
        if (!alive) return;
        loaded = true;
        resize();
        if (frameAt.ok) draw(performance.now());
        onReady?.();
      });
    })
    .catch(() => {});

  raf = requestAnimationFrame(loop);

  return {
    /** 0 dims the lamps to their running lights, 1 is full beam. */
    setLights(level) {
      state.lightsTarget = clamp(level);
      dirty = true;
    },
    /** Dev: what the floor is drawing. */
    get floorState() {
      return { progress: fu.uProgress.value, beam: fu.uBeam.value, ring: fu.uRing.value, angle: state.angle };
    },
    /** The city is building behind the door: ease to a standstill. */
    setBusy(on) {
      state.busy = Boolean(on);
      dirty = true;
    },
    /** The city's loading, 0 to 1, drawn on the ring; null to clear it. */
    setProgress(p) {
      fu.uProgress.value = p == null ? -1 : clamp(p);
      dirty = true;
    },
    /** Whether the way in can run: the car is up and motion is wanted. */
    canLaunch() {
      return alive && loaded && !reduced && frameAt.ok;
    },
    /** The way in, `ms` long; resolves at its end, on the last frame. */
    launch(ms) {
      if (state.launch) return state.launch.promise;
      const a1 = AZIMUTH + Math.PI * 2 * Math.round((state.angle - AZIMUTH) / (Math.PI * 2));
      state.drag = null;
      let resolve;
      const promise = new Promise((r) => {
        resolve = r;
      });
      state.launch = { t0: performance.now(), ms, a0: state.angle, a1, cx: frameAt.cx, cy: frameAt.cy, d: frameAt.d, resolve, promise, done: false };
      return promise;
    },
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      releaseLut(renderer, scene);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      for (const d of owned) d.dispose();
      floor.dispose();
      floor.geometry.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
