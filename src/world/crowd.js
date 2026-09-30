// src/world/crowd.js: people on the avenue's pavements.
//
// The plate's street has people in it and the city's had none. A few dozen
// walk the two pavements (forty on a desktop, sixteen on a phone), up the
// avenue and down it, alone and in pairs, some under umbrellas with a neon
// rim: the way a wet street at night reads from across it, dark figures
// against lit shopfronts, each umbrella a ring of colour doubled in the road.
// They are silhouettes drawn in the shader on upright cards (turned to the
// camera about their own vertical only), with a walk in the legs and the
// arms tied to how far they have walked, so nobody skates, and a rim of the
// light from the shops they pass. Now and then a phone lights a hand. One
// draw. Under reduced motion they stand where they are.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

// The avenue's pavements (the kit's WALK and ROAD_HALF): two lanes a side,
// clear of the lamps and machines against the walls, over the stretch the
// hero and the intro see.
const LANES = [10.9, 11.9];
const Z_MIN = -168;
const Z_MAX = 56;
const RIMS = ["#27dcf2", "#ff2e88", "#eceae4", "#fcee0a"];

export function createCrowd(scene, shared, { count = 40, reduced = false, reflectLayer = 2 } = {}) {
  const card = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = card.index;
  geometry.setAttribute("position", card.attributes.position);
  const walk = new Float32Array(count * 4);
  const look = new Float32Array(count * 4);
  let i = 0;
  while (i < count) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const speed = dir * (1.1 + Math.random() * 0.45);
    const z = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
    // A third walk in pairs, a step apart and in step.
    const group = Math.random() < 0.34 && i < count - 1 ? 2 : 1;
    for (let g = 0; g < group; g++, i++) {
      const lane = side * LANES[g % 2 === 0 ? (Math.random() < 0.5 ? 0 : 1) : 1] + (Math.random() - 0.5) * 0.25;
      walk.set([lane, z + g * 0.6 * dir, speed, Math.random()], i * 4);
      const umbrella = Math.random() < 0.42 ? 1 : 0;
      look.set([1.62 + Math.random() * 0.24, umbrella, Math.floor(Math.random() * RIMS.length), Math.random()], i * 4);
    }
  }
  geometry.setAttribute("aWalk", new THREE.InstancedBufferAttribute(walk, 4));
  geometry.setAttribute("aLook", new THREE.InstancedBufferAttribute(look, 4));
  geometry.instanceCount = count;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, (Z_MIN + Z_MAX) / 2), (Z_MAX - Z_MIN) / 2 + 16);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uMotion: { value: reduced ? 0 : 1 },
      uRims: { value: RIMS.map((c) => new THREE.Color(c)) },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aWalk;
      attribute vec4 aLook;
      uniform float uTime;
      uniform float uMotion;
      uniform vec3 uCam;
      varying vec2 vLocal;
      varying vec3 vWorld;
      varying vec4 vLook;
      varying float vStep;
      void main() {
        float t = uTime * uMotion;
        float len = ${(Z_MAX - Z_MIN).toFixed(1)};
        float walked = aWalk.z * t;
        float z = ${Z_MIN.toFixed(1)} + mod(aWalk.y - ${Z_MIN.toFixed(1)} + walked, len);
        // A stride of 1.4 m: the legs' phase is how far they have gone.
        vStep = abs(walked) / 1.4 * 6.2832 + aWalk.w * 6.2832;
        float bob = abs(sin(vStep)) * 0.025 * uMotion;
        vec3 foot = vec3(aWalk.x, 0.15, z);
        vec3 toCam = uCam - foot;
        vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + 1e-4);
        // The card: 1.2 m wide and tall enough for the umbrella over them.
        float h = aLook.x + 0.5;
        vLocal = vec2(position.x * 1.2, (position.y + 0.5) * h);
        vec3 p = foot + right * position.x * 1.2 + vec3(0.0, (position.y + 0.5) * h + bob, 0.0);
        vWorld = p;
        vLook = aLook;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uRims[4];
      varying vec2 vLocal;
      varying vec3 vWorld;
      varying vec4 vLook;
      varying float vStep;
      // A segment whose radius runs from ra at a to rb at b: close enough to
      // a distance for a cut-out.
      float limb(vec2 p, vec2 a, vec2 b, float ra, float rb) {
        vec2 pa = p - a, ba = b - a;
        float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * k) - mix(ra, rb, k);
      }
      void main() {
        // A figure in metres, feet at 0, scaled to their height.
        float s = vLook.x / 1.75;
        vec2 p = vLocal / s;
        float swing = sin(vStep);
        bool umbrella = vLook.y > 0.5;
        // Head and neck, shoulders wider than the waist, and, on about a
        // third of them, a long coat to the knee that the legs come out of.
        float d = length((p - vec2(0.0, 1.635)) / vec2(0.9, 1.0)) * 0.9 - 0.1;
        d = min(d, limb(p, vec2(0.0, 1.5), vec2(0.0, 1.56), 0.05, 0.05));
        d = min(d, limb(p, vec2(0.0, 1.4), vec2(0.0, 0.98), 0.2, 0.15));
        d = min(d, limb(p, vec2(-0.13, 1.42), vec2(0.13, 1.42), 0.065, 0.065));
        if (vLook.w < 0.34) d = min(d, limb(p, vec2(0.0, 1.3), vec2(0.0, 0.52), 0.17, 0.25 + 0.02 * swing));
        // Legs from the hip through the knee, swinging from the hip.
        vec2 kneeL = vec2(-0.08 + 0.1 * swing, 0.5);
        vec2 kneeR = vec2(0.08 - 0.1 * swing, 0.5);
        d = min(d, limb(p, vec2(-0.08, 0.95), kneeL, 0.085, 0.06));
        d = min(d, limb(p, vec2(0.08, 0.95), kneeR, 0.085, 0.06));
        d = min(d, limb(p, kneeL, vec2(-0.08 + 0.17 * swing, 0.05), 0.06, 0.045));
        d = min(d, limb(p, kneeR, vec2(0.08 - 0.17 * swing, 0.05), 0.06, 0.045));
        // Arms swing against the legs, just clear of the body; one holds the
        // umbrella up.
        d = min(d, limb(p, vec2(-0.2, 1.4), vec2(-0.25 - 0.08 * swing, 0.88), 0.055, 0.04));
        vec2 hand = umbrella ? vec2(0.12, 1.3) : vec2(0.25 + 0.08 * swing, 0.88);
        d = min(d, limb(p, vec2(0.2, 1.4), hand, 0.055, 0.04));
        // The umbrella: a shallow dome, its handle, and a lit rim.
        float canopy = 1e3;
        float rim = 1e3;
        if (umbrella) {
          vec2 q = (p - vec2(0.06, 1.95)) / vec2(0.55, 0.24);
          canopy = max(length(q) - 1.0, -q.y) * 0.24;
          rim = max(abs(q.y) * 0.24 - 0.012, abs(q.x) - 1.0);
          d = min(d, limb(p, vec2(0.06, 1.95), vec2(0.1, 1.3), 0.012, 0.012));
        }
        if (min(d, min(canopy, rim)) > 0.0) discard;
        // Dark against the lit shops behind them, their fronts faintly lit by
        // the street's signs, and only their heads and shoulders catching
        // the light from above.
        float edge = smoothstep(-0.018, 0.0, d) * smoothstep(1.1, 1.6, p.y);
        vec3 spill = spillAt(vWorld);
        vec3 col = vec3(0.01, 0.01, 0.014) + spill * (0.11 + 0.45 * edge);
        if (canopy <= 0.0) col = vec3(0.02, 0.02, 0.028) + spill * 0.12 + uRims[int(vLook.z + 0.5)] * 0.05;
        if (rim <= 0.0) col = uRims[int(vLook.z + 0.5)] * 3.2 * (1.0 + 0.2 * uBass);
        // Now and then a phone lights a hand.
        if (!umbrella && vLook.w > 0.78 && length(p - hand) < 0.05) col = vec3(0.6, 0.85, 1.0) * 2.0;
        col = cityFog(col, vWorld, rim <= 0.0 ? 1.0 : 0.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "crowd";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "crowd";
  mesh.layers.enable(reflectLayer);
  scene.add(mesh);

  return {
    mesh,
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      card.dispose();
      material.dispose();
    },
  };
}
