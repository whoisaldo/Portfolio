// src/three/drift/lamps.js: the car's light, drawn as light.
//
// Out of src/lib/drift-scene.js, so the intro's flat-plate fallback and the
// live city light the car the same way: a camera-facing glow at each lamp,
// a visible beam ahead of each headlight, and the pools the headlights and
// the underglow throw on the ground, computed per pixel on one plane.
//
// Two things differ between the two users and are options here rather
// than forks. Over the plate the glows ignore depth, because the plate has
// none; in the city they are depth tested and lifted toward the camera so
// the car's own body does not cut them in half, and a building between the
// lens and the car hides them. And over the plate the ground light fades
// with distance from the camera, so the far floor never hazes the page; in
// the city it fades with distance from the car, so the pools are there from
// a rooftop too.
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Textures drawn on the fly: a soft disc for the smoke and the lamp glows.
// ---------------------------------------------------------------------------
export function discTexture(size, inner, outer) {
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
export const ADDITIVE = {
  transparent: true,
  blending: THREE.AdditiveBlending,
  premultipliedAlpha: true,
  depthWrite: false,
};

// A quad that faces the camera: the lamp glows. Same billboard trick as the
// smoke, one instance each. `uLift` moves it toward the lens, in metres, and
// `uFacing` (car space, zero for "every way") is the way the lamp points: a
// lamp seen from behind does not glow.
const GLOW_VERT = /* glsl */ `
  uniform float uSize;
  uniform float uLift;
  uniform vec3 uFacing;
  uniform vec2 uNear;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float dist = -mv.z;
    mv.xy += position.xy * uSize;
    mv.z += uLift;
    gl_Position = projectionMatrix * mv;
    vUv = uv;
    vec3 facing = mat3(modelMatrix) * uFacing;
    float len = length(facing);
    vec3 toCam = normalize(cameraPosition - (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz);
    vFacing = len < 0.5 ? 1.0 : smoothstep(-0.15, 0.55, dot(facing / len, toCam));
    // Up close a glow is a fog ball in front of the lamp, and the lamp
    // itself is right there: fade it out between uNear.x and uNear.y.
    if (uNear.y > 0.0) vFacing *= smoothstep(uNear.x, uNear.y, dist);
  }
`;
const GLOW_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uGain;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    float a = texture2D(uMap, vUv).a * uGain * vFacing;
    gl_FragColor = vec4(uColor * a, 0.0);
  }
`;

// ---------------------------------------------------------------------------
// The floor: additive light only. Two headlight cones and one underglow
// pool, computed analytically per pixel, faded with distance (from uFadeFrom,
// between uFade.x and uFade.y metres) so the far ground never adds a haze.
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
  uniform vec3 uLampL, uLampR, uDirL, uDirR, uGlow, uFadeFrom;
  uniform vec2 uFade;
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
    float far = length(vWorld.xz - uFadeFrom.xz);
    col *= smoothstep(uFade.y, uFade.x, far);
    // Alpha stays zero: this is light added to whatever is behind the
    // canvas, never a surface in front of it. See ADDITIVE above.
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

// Where the lamps are on the S4, in the car's own frame (it faces +Z).
const HEAD_BOX = new THREE.Box3(new THREE.Vector3(-0.84, 0.57, 2.06), new THREE.Vector3(0.84, 0.67, 2.13));
const TAIL_BOX = new THREE.Box3(new THREE.Vector3(-0.82, 0.73, -2.37), new THREE.Vector3(0.82, 0.90, -2.28));

/**
 * Glows at the four lamps and a beam ahead of each headlight, parented to
 * `car`. Options: `depthTest` (off over the plate), `lift` (metres toward
 * the lens), `layer` (an extra layer for the glows, so a mirror sees them),
 * `reverse` (add two white reversing lamps, off until set), `directional`
 * (each glow only toward where its lamp points), `glow` (scales the glows'
 * size), `near` ([from, to] metres: the glows fade in with distance).
 */
export function createLamps(car, { depthTest = false, lift = 0, layer = null, reverse = false, directional = false, glow: glowScale = 1, near = [0, 0] } = {}) {
  const headY = (HEAD_BOX.min.y + HEAD_BOX.max.y) / 2;
  const headZ = HEAD_BOX.max.z;
  const lampL = new THREE.Vector3(HEAD_BOX.max.x - 0.18, headY, headZ);
  const lampR = new THREE.Vector3(HEAD_BOX.min.x + 0.18, headY, headZ);
  const tailY = (TAIL_BOX.min.y + TAIL_BOX.max.y) / 2;
  const tailZ = TAIL_BOX.min.z;
  const tailL = new THREE.Vector3(TAIL_BOX.max.x - 0.14, tailY, tailZ);
  const tailR = new THREE.Vector3(TAIL_BOX.min.x + 0.14, tailY, tailZ);

  // Lamp glows: cheap bloom. A camera-facing quad at each lamp.
  const glowTex = discTexture(128, 1, 0.35);
  const glowGeom = new THREE.PlaneGeometry(1, 1);
  const glowMats = [];
  const glow = (color, size, gain, pos, facing) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: glowTex },
        uColor: { value: new THREE.Color(color) },
        uSize: { value: size * glowScale },
        uGain: { value: gain },
        uLift: { value: lift },
        uFacing: { value: new THREE.Vector3(0, 0, directional ? facing : 0) },
        uNear: { value: new THREE.Vector2(near[0], near[1]) },
      },
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      depthTest,
      ...ADDITIVE,
    });
    glowMats.push(mat);
    const m = new THREE.Mesh(glowGeom, mat);
    m.position.copy(pos);
    m.frustumCulled = false;
    m.renderOrder = 6;
    if (layer !== null) m.layers.enable(layer);
    car.add(m);
    return mat;
  };
  const heads = [glow(0xdff6ff, 1.5, 0.52, lampL, 1), glow(0xdff6ff, 1.5, 0.52, lampR, 1)];
  const tails = [glow(0xff261c, 0.8, 0.55, tailL, -1), glow(0xff261c, 0.8, 0.55, tailR, -1)];
  const reversing = reverse
    ? [glow(0xf2f6ff, 0.7, 0, tailL.clone().setX(tailL.x - 0.3), -1), glow(0xf2f6ff, 0.7, 0, tailR.clone().setX(tailR.x + 0.3), -1)]
    : [];

  // Beams. Cones with the apex at the lamp, pointing forward and a touch
  // down, fading along their length.
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.055 } },
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

  return {
    lampL,
    lampR,
    tailL,
    tailR,
    heads,
    tails,
    reversing,
    beamMat,
    dispose() {
      beamGeom.dispose();
      beamMat.dispose();
      glowGeom.dispose();
      for (const m of glowMats) m.dispose();
      glowTex.dispose();
    },
  };
}

const _dir = new THREE.Vector3();

/**
 * The headlight cones and the underglow on the ground. `size` is the
 * plane's side in metres; `fade` is [near, far] from `fadeFrom` (a Vector3
 * the caller keeps current: the camera over the plate, the car in the city).
 */
export function createGroundLight(scene, { size = 400, fade = [12, 70], y = 0, follow = false } = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLampL: { value: new THREE.Vector3() },
      uLampR: { value: new THREE.Vector3() },
      uDirL: { value: new THREE.Vector3(0, 0, 1) },
      uDirR: { value: new THREE.Vector3(0, 0, 1) },
      uGlow: { value: new THREE.Vector3() },
      uFadeFrom: { value: new THREE.Vector3() },
      uFade: { value: new THREE.Vector2(fade[0], fade[1]) },
      uLamps: { value: 1 },
      uGlowOn: { value: 0.35 },
    },
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    ...ADDITIVE,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = -1;
  scene.add(mesh);
  const u = material.uniforms;
  return {
    mesh,
    material,
    /** Follow the lamps of `car` (lamps from createLamps); `from` is the fade centre. */
    update(car, lamps, from) {
      _dir.set(0, -0.11, 1).applyQuaternion(car.quaternion).normalize();
      u.uDirL.value.copy(_dir);
      u.uDirR.value.copy(_dir);
      u.uLampL.value.copy(lamps.lampL).applyMatrix4(car.matrixWorld);
      u.uLampR.value.copy(lamps.lampR).applyMatrix4(car.matrixWorld);
      u.uGlow.value.copy(car.position);
      u.uFadeFrom.value.copy(from);
      if (follow) mesh.position.set(car.position.x, y, car.position.z);
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
