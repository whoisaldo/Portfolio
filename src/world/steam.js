// src/world/steam.js: steam, lit by the signs.
//
// A wet city at night breathes: two manholes up the avenue, two exhaust
// stacks on the rooftop (anchor_steam_street_<n> and anchor_steam_roof_<n>
// in the kit). Each keeps a stream of puffs going: one leaves the vent small
// and dense, rises, spreads, leans with the wind and thins out to nothing,
// and the next is already coming. A puff is a soft blob of noise on a card
// turned to the camera, lit by whatever light is where it is: the street's
// (the spill map every surface reads, so steam over a pink sign glows pink)
// and, on the rooftop, the two signs' own, brighter where the light is
// behind it, the way steam scatters it. One draw for every vent. Under
// reduced motion the steam hangs where it is.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

// Per kind of vent: puffs in the stream, seconds a puff lives, how high it
// gets, its size leaving the vent and at the end, and the wind (x, z, m/s).
const KINDS = {
  street: { puffs: 14, life: 6.0, rise: 3.6, size: [0.35, 2.1], wind: [0.3, -0.2] },
  roof: { puffs: 12, life: 4.5, rise: 4.5, size: [0.4, 2.4], wind: [-0.45, 0.2] },
};
const LIGHTS = 3;

export function createSteam(scene, shared, anchors, { reduced = false } = {}) {
  const vents = [...anchors]
    .filter(([name]) => name.startsWith("anchor_steam_"))
    .map(([name, a]) => ({ kind: name.includes("_roof_") ? KINDS.roof : KINDS.street, at: a.position }));
  const count = vents.reduce((n, v) => n + v.kind.puffs, 0);
  if (!count) return null;

  const card = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = card.index;
  geometry.setAttribute("position", card.attributes.position);
  geometry.setAttribute("uv", card.attributes.uv);
  const vent = new Float32Array(count * 4);
  const shape = new Float32Array(count * 4);
  const motion = new Float32Array(count * 4);
  let i = 0;
  const bounds = new THREE.Box3();
  for (const { kind, at } of vents) {
    for (let k = 0; k < kind.puffs; k++, i++) {
      vent.set([at.x, at.y, at.z, k / kind.puffs + Math.random() * 0.04], i * 4);
      shape.set([kind.size[0], kind.size[1], kind.rise, kind.life], i * 4);
      motion.set([kind.wind[0], kind.wind[1], Math.random(), Math.random() * Math.PI * 2], i * 4);
    }
    bounds.expandByPoint(at);
    bounds.expandByPoint(at.clone().add(new THREE.Vector3(kind.wind[0] * kind.life + 4, kind.rise + 4, kind.wind[1] * kind.life + 4)));
    bounds.expandByPoint(at.clone().add(new THREE.Vector3(kind.wind[0] * kind.life - 4, -1, kind.wind[1] * kind.life - 4)));
  }
  geometry.setAttribute("aVent", new THREE.InstancedBufferAttribute(vent, 4));
  geometry.setAttribute("aShape", new THREE.InstancedBufferAttribute(shape, 4));
  geometry.setAttribute("aMotion", new THREE.InstancedBufferAttribute(motion, 4));
  geometry.instanceCount = count;
  geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uMotion: { value: reduced ? 0 : 1 },
      // The rooftop signs' light in it goes out with the `signs` switch.
      uSigns: { value: 1 },
      uLightAt: { value: Array.from({ length: LIGHTS }, () => new THREE.Vector3(0, -1e4, 0)) },
      uLightColor: { value: Array.from({ length: LIGHTS }, () => new THREE.Vector3()) },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aVent;
      attribute vec4 aShape;
      attribute vec4 aMotion;
      uniform float uTime;
      uniform float uMotion;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vAge;
      varying float vSeed;
      void main() {
        // Still under reduced motion: each puff where it would be at a
        // moment of its own.
        float t = uMotion > 0.5 ? uTime : aMotion.z * 40.0;
        float age = fract(t / aShape.w + aVent.w);
        // Out of the vent fast, then drifting: the rise slows as it spreads.
        float up = aShape.z * (1.0 - pow(1.0 - age, 1.8));
        float lean = age * age * aShape.w;
        vec3 wander = vec3(sin(t * 0.6 + aMotion.w), 0.0, cos(t * 0.45 + aMotion.w * 1.3)) * 0.35 * age;
        float size = mix(aShape.x, aShape.y, pow(age, 0.7)) * (0.85 + 0.3 * aMotion.z);
        vec3 centre = aVent.xyz + vec3(aMotion.x * lean, up + size * 0.35, aMotion.y * lean) + wander;
        // A card turned to the camera, turning slowly on itself.
        float spin = aMotion.w + t * (aMotion.z - 0.5) * 0.4;
        vec2 p = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * position.xy * size;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 upv = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vWorld = centre + right * p.x + upv * p.y;
        vUv = uv;
        vAge = age;
        vSeed = aMotion.z;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uLightAt[${LIGHTS}];
      uniform vec3 uLightColor[${LIGHTS}];
      uniform float uSigns;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vAge;
      varying float vSeed;
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 q = vUv - 0.5;
        float n = vnoise(q * 3.2 + vSeed * 17.0) * 0.6 + vnoise(q * 7.5 + vSeed * 31.0 + vAge * 2.0) * 0.4;
        float r = length(q) * 2.0 + (n - 0.5) * 0.7;
        float blob = smoothstep(1.0, 0.1, r);
        // Dense at the vent, thinning to nothing as it goes.
        float density = blob * smoothstep(0.0, 0.08, vAge) * pow(1.0 - vAge, 1.6) * 0.26;
        if (density < 0.002) discard;
        // The light where it is, and more of a light behind it than in
        // front: steam throws light forward.
        vec3 view = normalize(vWorld - uCam);
        vec3 light = vec3(0.012, 0.011, 0.016) + spillAt(vWorld) * 6.0 + uHazeColor * 0.12;
        for (int i = 0; i < ${LIGHTS}; i++) {
          vec3 toL = uLightAt[i] - vWorld;
          float d2 = dot(toL, toL);
          float behind = 0.35 + 1.4 * pow(max(dot(view, toL * inversesqrt(d2)), 0.0), 3.0);
          light += uLightColor[i] * behind * 2.5 * uSigns / (1.0 + d2 / 40.0);
        }
        vec3 col = cityFog(light * (0.75 + 0.5 * n), vWorld, 0.0);
        gl_FragColor = vec4(col, density);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  material.name = "steam";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "steam";
  mesh.renderOrder = 6;
  scene.add(mesh);

  return {
    mesh,
    /** Whether the signs that light it are on (the `signs` switch). */
    setSigns(on) {
      material.uniforms.uSigns.value = on ? 1 : 0;
    },
    /** Lights besides the street's: [{ position, color }], colour linear. */
    setLights(lights) {
      const { uLightAt, uLightColor } = material.uniforms;
      for (let k = 0; k < LIGHTS; k++) {
        const l = lights[k];
        if (l) {
          uLightAt.value[k].copy(l.position);
          uLightColor.value[k].set(l.color.r, l.color.g, l.color.b);
        } else {
          uLightAt.value[k].set(0, -1e4, 0);
          uLightColor.value[k].set(0, 0, 0);
        }
      }
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      card.dispose();
      material.dispose();
    },
  };
}
