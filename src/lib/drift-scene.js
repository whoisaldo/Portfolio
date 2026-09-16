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
// The canvas is transparent and sits above the intro overlay. Nothing here
// paints the floor. The ground is a shader that adds only light (the
// headlight cones, the underglow), so when the overlay tears away behind the
// car, the car's lights sweep the page underneath instead of a black plane
// covering it.
//
// The car itself comes from src/three/car/object.js, built by GPT-6-Astra
// through the codex-3d skill; see the notes beside it for the part names.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createObject } from "../three/car/object.js";
import { CAR_GONE, DROP } from "./cues";

// ---------------------------------------------------------------------------
// The path. Seconds after the drop, x (right), z (toward the camera), and the
// slip angle in degrees: how far the nose points past the direction of
// travel. Negative slip is a right-hand drift, which is what this is: the
// car comes in from the right travelling left and toward the lens, the rear
// steps out toward the camera with the smoke and the tail lights, and at the
// apex, on WIPE_START, it is nearly broadside a few metres from the lens.
// Then it hooks up and powers away up the road, toward the skyline, getting
// smaller as it goes, so it is still in frame for every second of the wipe.
// An earlier path launched it out of the left edge instead, and a car that
// close to a camera clears the frame in half a second: the page was bare
// two seconds before the hero was due.
// ---------------------------------------------------------------------------
const KEYS = [
  [0.0, 17.0, -2.5, 0],
  [0.4, 8.5, 0.8, -12],
  [0.75, 3.0, 3.4, -33],
  [1.1, 0.6, 5.0, -44],
  [1.4, -1.0, 5.6, -47],
  [1.9, -3.4, 4.2, -36],
  [2.5, -6.0, 0.6, -14],
  [3.1, -7.6, -5.5, -3],
  [3.8, -8.5, -14.0, 0],
];
const APEX_Z = 5.6;
const LAST = KEYS[KEYS.length - 1][0];

const curve = new THREE.CatmullRomCurve3(
  KEYS.map((k) => new THREE.Vector3(k[1], 0, k[2])),
  false,
  "catmullrom",
  0.5,
);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (p) => p * p * (3 - 2 * p);
const deg = Math.PI / 180;

/** Curve parameter for `d` seconds after the drop. Keys are spaced by time,
 *  the curve by index, so this maps one onto the other. */
function uOf(d) {
  const n = KEYS.length;
  if (d <= KEYS[0][0]) return 0;
  if (d >= LAST) return 1;
  let i = 0;
  while (i < n - 2 && d >= KEYS[i + 1][0]) i++;
  const f = (d - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]);
  return (i + f) / (n - 1);
}

/** Slip angle in radians at `d`, eased between keys. */
function slipOf(d) {
  const n = KEYS.length;
  if (d <= KEYS[0][0]) return KEYS[0][3] * deg;
  if (d >= LAST) return KEYS[n - 1][3] * deg;
  let i = 0;
  while (i < n - 2 && d >= KEYS[i + 1][0]) i++;
  const f = smooth((d - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]));
  return (KEYS[i][3] + (KEYS[i + 1][3] - KEYS[i][3]) * f) * deg;
}

const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _t = new THREE.Vector3();

/**
 * Position, heading, yaw, slip and speed at `d` seconds after the drop.
 *
 * `xScale` squeezes the path sideways for narrow viewports. The keys were
 * laid out for a 16:10 screen; on a phone the frustum is a third as wide,
 * and a car that recedes to x = -8.5 there has left through the side of
 * the frame long before it is far enough away to be small.
 */
function poseAt(d, xScale = 1) {
  if (d < 0) {
    // Before the drop the car is off the right edge, backed up along its
    // own entry tangent so it arrives at speed rather than from rest.
    curve.getPoint(0, _p);
    curve.getTangent(0, _t);
    const v0 = 26;
    _p.addScaledVector(_t, v0 * d);
    _p.x *= xScale;
    _t.x *= xScale;
    return { x: _p.x, z: _p.z, heading: Math.atan2(_t.x, _t.z), slip: 0, speed: v0 };
  }
  const u = uOf(d);
  curve.getPoint(u, _p);
  curve.getTangent(u, _t);
  // Speed from the curve itself: where it is now against where it will be
  // twenty milliseconds on.
  curve.getPoint(uOf(Math.min(LAST, d + 0.02)), _q);
  _p.x *= xScale;
  _q.x *= xScale;
  _t.x *= xScale;
  const speed = _q.distanceTo(_p) / 0.02;
  return { x: _p.x, z: _p.z, heading: Math.atan2(_t.x, _t.z), slip: slipOf(d), speed };
}

// ---------------------------------------------------------------------------
// Textures drawn on the fly: a soft disc for the smoke and the lamp glows.
// ---------------------------------------------------------------------------
function discTexture(size, inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(255,255,255,${inner})`);
  g.addColorStop(0.5, `rgba(255,255,255,${outer})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// How light is drawn onto a transparent canvas.
//
// The browser composites the canvas as premultiplied alpha: a pixel's colour
// is added to the page and the page is dimmed by the pixel's alpha. Light
// has colour and no alpha, so every additive material here writes its
// colour with alpha 0 and blends ONE, ONE (three's premultiplied additive
// mode). The first cut used three's default additive mode, which
// accumulates alpha as well: the floor plane came out as an opaque black
// sheet with lights on it, covering the page it was meant to light.
// ---------------------------------------------------------------------------
const ADDITIVE = {
  transparent: true,
  blending: THREE.AdditiveBlending,
  premultipliedAlpha: true,
  depthWrite: false,
};

// A quad that faces the camera: the lamp glows. Same billboard trick as the
// smoke, one instance each.
const GLOW_VERT = /* glsl */ `
  uniform float uSize;
  varying vec2 vUv;
  void main() {
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += position.xy * uSize;
    gl_Position = projectionMatrix * mv;
    vUv = uv;
  }
`;
const GLOW_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uMap, vUv).a * uGain;
    gl_FragColor = vec4(uColor * a, 0.0);
  }
`;

// ---------------------------------------------------------------------------
// The floor: additive light only. Two headlight cones and one underglow
// pool, computed analytically per pixel, faded with distance so the far
// ground never adds a haze over the page.
// ---------------------------------------------------------------------------
const GROUND_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const GROUND_FRAG = /* glsl */ `
  uniform vec3 uLampL, uLampR, uDirL, uDirR, uGlow, uCam;
  uniform float uLamps, uGlowOn;
  varying vec3 vWorld;
  vec3 lamp(vec3 pos, vec3 dir) {
    vec3 d = vWorld - pos;
    float dist = length(d);
    vec3 dn = d / max(dist, 0.001);
    float cone = smoothstep(0.90, 0.992, dot(dn, dir));
    float fall = 1.0 / (1.0 + 0.09 * dist * dist);
    return vec3(0.9, 0.94, 1.0) * cone * fall * 0.9;
  }
  void main() {
    vec3 col = (lamp(uLampL, uDirL) + lamp(uLampR, uDirR)) * uLamps;
    float g = length(vWorld.xz - uGlow.xz);
    col += vec3(1.0, 0.18, 0.53) * exp(-g * g * 0.42) * 1.1 * uGlowOn;
    float far = length(vWorld.xz - uCam.xz);
    col *= smoothstep(70.0, 12.0, far);
    // Alpha stays zero: this is light added to whatever is behind the
    // canvas, never a surface in front of it. See ADDITIVE below.
    gl_FragColor = vec4(col, 0.0);
  }
`;

// A headlight's visible beam: a cone that fades from the lamp outward and
// toward its own silhouette, so it reads as light in the air rather than as
// a translucent solid.
const BEAM_VERT = /* glsl */ `
  varying float vT;
  varying float vEdge;
  void main() {
    vT = uv.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vEdge = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;
const BEAM_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vT;
  varying float vEdge;
  void main() {
    // uv.y is 1 at the cone's apex, which sits on the lamp: bright there,
    // gone by the far end.
    float a = vT * vT * pow(vEdge, 1.6) * uOpacity;
    gl_FragColor = vec4(vec3(0.87, 0.95, 1.0) * a, 0.0);
  }
`;

// Tyre smoke: instanced quads billboarded in the vertex shader, each with
// its own birth time, life, velocity and size. Rises as it ages, expands,
// fades.
const SMOKE_MAX = 260;
const SMOKE_VERT = /* glsl */ `
  attribute vec3 iPos;
  attribute vec3 iVel;
  attribute float iBorn;
  attribute float iLife;
  attribute float iSeed;
  attribute float iSize;
  uniform float uTime;
  varying vec2 vUv;
  varying float vA;
  void main() {
    float age = uTime - iBorn;
    if (age < 0.0 || age > iLife || iLife <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vA = 0.0;
      vUv = uv;
      return;
    }
    float t = age / iLife;
    vec3 p = iPos + iVel * age * (1.0 - 0.45 * t) + vec3(0.0, 0.35 * age + 0.5 * age * age, 0.0);
    float size = iSize * (0.3 + 1.5 * pow(t, 0.55));
    float rot = iSeed * 6.2832 + age * (iSeed - 0.5) * 1.6;
    vec2 q = vec2(cos(rot) * position.x - sin(rot) * position.y, sin(rot) * position.x + cos(rot) * position.y) * size;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    mv.xy += q;
    gl_Position = projectionMatrix * mv;
    vA = (1.0 - t) * smoothstep(0.0, 0.06, t) * 0.44;
    vUv = uv;
  }
`;
const SMOKE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying float vA;
  void main() {
    float a = texture2D(uMap, vUv).a * vA;
    gl_FragColor = vec4(vec3(0.66, 0.65, 0.63), a);
  }
`;

class Smoke {
  constructor(scene, map) {
    const geom = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
    geom.instanceCount = SMOKE_MAX;
    this.pos = new Float32Array(SMOKE_MAX * 3);
    this.vel = new Float32Array(SMOKE_MAX * 3);
    this.born = new Float32Array(SMOKE_MAX);
    this.life = new Float32Array(SMOKE_MAX);
    this.seed = new Float32Array(SMOKE_MAX);
    this.size = new Float32Array(SMOKE_MAX);
    this.attrs = {
      iPos: new THREE.InstancedBufferAttribute(this.pos, 3),
      iVel: new THREE.InstancedBufferAttribute(this.vel, 3),
      iBorn: new THREE.InstancedBufferAttribute(this.born, 1),
      iLife: new THREE.InstancedBufferAttribute(this.life, 1),
      iSeed: new THREE.InstancedBufferAttribute(this.seed, 1),
      iSize: new THREE.InstancedBufferAttribute(this.size, 1),
    };
    for (const [k, a] of Object.entries(this.attrs)) {
      a.setUsage(THREE.DynamicDrawUsage);
      geom.setAttribute(k, a);
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMap: { value: map } },
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.next = 0;
    scene.add(this.mesh);
  }

  emit(at, vel, now, size) {
    const i = this.next;
    this.next = (this.next + 1) % SMOKE_MAX;
    this.pos.set([at.x, at.y, at.z], i * 3);
    this.vel.set([vel.x, vel.y, vel.z], i * 3);
    this.born[i] = now;
    this.life[i] = 1.1 + Math.random() * 0.9;
    this.seed[i] = Math.random();
    this.size[i] = size;
    for (const a of Object.values(this.attrs)) a.needsUpdate = true;
  }

  update(now) {
    this.material.uniforms.uTime.value = now;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

// A tail light's trail: a thin vertical ribbon through where the lamp has
// been over the last half second, additive, fading toward its tail. Seen
// from a low camera, a ribbon along the path reads as the long-exposure
// streak it is meant to be.
class Trail {
  constructor(scene, color, n = 48) {
    this.n = n;
    this.pts = [];
    this.pos = new Float32Array(n * 2 * 3);
    this.alpha = new Float32Array(n * 2);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geom.setIndex(idx);
    this.mesh = new THREE.Mesh(
      geom,
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) } },
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          varying float vA;
          void main() {
            vA = aAlpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vA;
          void main() {
            gl_FragColor = vec4(uColor * vA * 1.8, 0.0);
          }
        `,
        side: THREE.DoubleSide,
        ...ADDITIVE,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }

  push(p, now, strength) {
    this.pts.push({ x: p.x, y: p.y, z: p.z, t: now, s: strength });
    if (this.pts.length > this.n) this.pts.shift();
  }

  update(now, life = 0.55) {
    const { n, pos, alpha, pts } = this;
    const last = pts.length - 1;
    for (let i = 0; i < n; i++) {
      // Newest sample at the highest index; older samples fill downward, and
      // an unfilled ribbon collapses onto its oldest point at zero alpha.
      const p = pts[Math.max(0, last - (n - 1 - i))] || { x: 0, y: -10, z: 0, t: -1e9, s: 0 };
      const age = now - p.t;
      const a = Math.max(0, 1 - age / life) * p.s;
      const h = 0.03 + 0.05 * a;
      pos[i * 6] = p.x;
      pos[i * 6 + 1] = p.y + h;
      pos[i * 6 + 2] = p.z;
      pos[i * 6 + 3] = p.x;
      pos[i * 6 + 4] = p.y - h;
      pos[i * 6 + 5] = p.z;
      alpha[i * 2] = a;
      alpha[i * 2 + 1] = a;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

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
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x1a0a14, 0.5));
  const key = new THREE.DirectionalLight(0xfff4d6, 1.7);
  key.position.set(6, 9, 9);
  const rimM = new THREE.DirectionalLight(0xff2e88, 3.6);
  rimM.position.set(-9, 4, -6);
  const rimC = new THREE.DirectionalLight(0x34e5ff, 2.2);
  rimC.position.set(10, 3, -8);
  scene.add(key, rimM, rimC);

  // ---- the car ----------------------------------------------------------
  const car = createObject();
  car.rotation.order = "YXZ";
  const parts = car.userData.parts || {};
  scene.add(car);

  const carBox = localBox(car) || new THREE.Box3(new THREE.Vector3(-1, 0, -2.3), new THREE.Vector3(1, 1.2, 2.3));
  const headBox = (parts.headlights && localBox(parts.headlights)) || new THREE.Box3(new THREE.Vector3(-0.8, 0.5, 2.2), new THREE.Vector3(0.8, 0.6, 2.3));
  const tailBox = (parts.taillights && localBox(parts.taillights)) || new THREE.Box3(new THREE.Vector3(-0.85, 0.55, -2.3), new THREE.Vector3(0.85, 0.65, -2.2));
  const headY = (headBox.min.y + headBox.max.y) / 2;
  const headZ = headBox.max.z;
  const lampL = new THREE.Vector3(headBox.max.x - 0.18, headY, headZ);
  const lampR = new THREE.Vector3(headBox.min.x + 0.18, headY, headZ);
  const tailY = (tailBox.min.y + tailBox.max.y) / 2;
  const tailZ = tailBox.min.z;
  const tailL = new THREE.Vector3(tailBox.max.x - 0.14, tailY, tailZ);
  const tailR = new THREE.Vector3(tailBox.min.x + 0.14, tailY, tailZ);

  // Lamp glows: cheap bloom. A camera-facing quad at each lamp.
  const glowTex = discTexture(128, 1, 0.35);
  const glowGeom = new THREE.PlaneGeometry(1, 1);
  const glowMats = [];
  const glow = (color, size, gain, pos) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: glowTex }, uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uGain: { value: gain } },
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      depthTest: false,
      ...ADDITIVE,
    });
    glowMats.push(mat);
    const m = new THREE.Mesh(glowGeom, mat);
    m.position.copy(pos);
    m.frustumCulled = false;
    m.renderOrder = 6;
    car.add(m);
    return m;
  };
  glow(0xdff6ff, 1.5, 0.9, lampL);
  glow(0xdff6ff, 1.5, 0.9, lampR);
  glow(0xff2e88, 1.1, 0.8, tailL);
  glow(0xff2e88, 1.1, 0.8, tailR);

  // Beams. Cones with the apex at the lamp, pointing forward and a touch
  // down, fading along their length.
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.12 } },
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    side: THREE.DoubleSide,
    ...ADDITIVE,
  });
  const beamGeom = new THREE.ConeGeometry(1.25, 9, 28, 1, true);
  // ConeGeometry points +Y with the apex at +height/2; uv.y runs 1 at the
  // apex to 0 at the base. Rotate so the apex sits at the lamp and the base
  // is ahead of the car.
  beamGeom.rotateX(Math.PI / 2);
  beamGeom.translate(0, 0, 4.5);
  for (const lamp of [lampL, lampR]) {
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.copy(lamp);
    beam.rotation.x = 0.06;
    beam.renderOrder = 3;
    car.add(beam);
  }

  // ---- the floor --------------------------------------------------------
  const groundMat = new THREE.ShaderMaterial({
    uniforms: {
      uLampL: { value: new THREE.Vector3() },
      uLampR: { value: new THREE.Vector3() },
      uDirL: { value: new THREE.Vector3(0, 0, 1) },
      uDirR: { value: new THREE.Vector3(0, 0, 1) },
      uGlow: { value: new THREE.Vector3() },
      uCam: { value: new THREE.Vector3() },
      uLamps: { value: 1 },
      uGlowOn: { value: 1 },
    },
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    ...ADDITIVE,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.renderOrder = -1;
  scene.add(ground);

  const smoke = new Smoke(scene, discTexture(128, 0.9, 0.4));
  const trailL = new Trail(scene, 0xff2e88);
  const trailR = new Trail(scene, 0xff2e88);

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
  const wheels = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"].map((n) => parts[n]).filter(Boolean);
  const steers = ["steer_fl", "steer_fr"].map((n) => parts[n]).filter(Boolean);
  const rears = ["wheel_rl", "wheel_rr"].map((n) => parts[n]).filter(Boolean);
  const WHEEL_R = 0.34;

  let last = null;
  let carry = 0;
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3());
  const _w = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _side = new THREE.Vector3();
  const _back = new THREE.Vector3();
  const _v = new THREE.Vector3();
  let edge = null;

  const render = (s) => {
    // Everything that moves on its own (wheels, smoke, trails) runs on the
    // song clock too, so the whole scene freezes when the clock does.
    const now = s;
    const dt = last === null ? 0 : clamp(now - last, 0, 0.05);
    last = now;

    const d = s - DROP;
    const pose = poseAt(Math.min(d, CAR_GONE - DROP + 0.4), xScale);
    const yaw = pose.heading + pose.slip;
    const slipN = clamp(Math.abs(pose.slip) / (47 * deg), 0, 1);
    // Launch wheelspin: the rears light up again as the car straightens
    // and goes.
    const launch = d > 1.35 && d < 2.3 ? smooth(1 - Math.abs((d - 1.8) / 0.5)) : 0;
    const spin = Math.max(slipN, launch);

    car.position.set(pose.x, 0, pose.z);
    car.rotation.y = yaw;
    // Body roll toward the outside of the turn, and a squat as it launches.
    car.rotation.z = 0.07 * slipN * Math.sign(pose.slip || 1);
    car.rotation.x = -0.025 * launch + 0.012 * slipN;

    const omega = (pose.speed / WHEEL_R) * dt;
    for (const w of wheels) w.rotation.x += omega;
    for (const w of rears) w.rotation.x += omega * 1.7 * spin;
    const steer = clamp(-0.85 * pose.slip, -0.62, 0.62);
    for (const st of steers) st.rotation.y = steer;

    car.updateMatrixWorld(true);

    // Floor lights follow the lamps.
    _dir.set(0, -0.11, 1).applyQuaternion(car.quaternion).normalize();
    groundMat.uniforms.uDirL.value.copy(_dir);
    groundMat.uniforms.uDirR.value.copy(_dir);
    groundMat.uniforms.uLampL.value.copy(lampL).applyMatrix4(car.matrixWorld);
    groundMat.uniforms.uLampR.value.copy(lampR).applyMatrix4(car.matrixWorld);
    groundMat.uniforms.uGlow.value.copy(car.position);
    groundMat.uniforms.uCam.value.copy(camera.position);

    // Smoke off the rear tyres while they are sliding or spinning.
    if (d >= 0 && spin > 0.12) {
      // The outside of the turn: the car's left in a right-hand drift.
      _side.set(pose.slip < 0 ? 1 : -1, 0, 0).applyQuaternion(car.quaternion);
      _back.set(0, 0, -1).applyQuaternion(car.quaternion);
      carry += dt * (18 + 80 * spin);
      while (carry >= 1) {
        carry -= 1;
        for (const w of rears) {
          w.getWorldPosition(_w);
          _w.y = 0.12;
          _w.x += (Math.random() - 0.5) * 0.35;
          _w.z += (Math.random() - 0.5) * 0.35;
          _v.copy(_side).multiplyScalar(0.9 + 2.4 * slipN + Math.random() * 0.6)
            .addScaledVector(_back, 1.4 + Math.random() * 1.2)
            .add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.25 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8));
          smoke.emit(_w, _v, now, 0.45 + Math.random() * 0.45 + 0.5 * spin);
        }
      }
    }
    smoke.update(now);

    // Trails.
    if (d >= 0) {
      const strength = clamp(0.35 + pose.speed / 30, 0, 1);
      trailL.push(_w.copy(tailL).applyMatrix4(car.matrixWorld), now, strength);
      trailR.push(_w.copy(tailR).applyMatrix4(car.matrixWorld), now, strength);
    }
    trailL.update(now);
    trailR.update(now);

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

  const dispose = () => {
    window.removeEventListener("resize", fit);
    smoke.dispose();
    trailL.dispose();
    trailR.dispose();
    beamGeom.dispose();
    beamMat.dispose();
    glowGeom.dispose();
    for (const m of glowMats) m.dispose();
    ground.geometry.dispose();
    groundMat.dispose();
    glowTex.dispose();
    scene.environment?.dispose?.();
    car.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return {
    render,
    /** Right edge of the car on screen in vw, or null when it has left. */
    edgeVw: () => edge,
    dispose,
  };
}
