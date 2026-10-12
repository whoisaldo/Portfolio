// src/world/steam.js: steam, lit by the signs.
//
// A wet city at night breathes, and each kind of place its own way
// (anchor_steam_<kind>_<n> in the kit): a manhole or a grate in the road
// lets go a low, wide breath that lifts off lazily; a vent in a lane's wall
// a narrow quick one that is gone by the lintel; a stack or plant on a roof
// a plume that leans away on the wind and tears. Each keeps a stream of
// puffs going: one leaves the vent, rises, spreads, leans with the wind and
// thins out to nothing, and the next is already coming. A puff is a card
// turned to the camera with wisps of noise drawn on it, more and more of it
// eaten away as it ages, so a plume is strands with the street seen between
// them and never a white column. It is lit by whatever light is where it is:
// the street's (the spill map every surface reads, so steam over a pink
// sign is pink) and, on the rooftop, the two signs' own, brighter where the
// light is behind it, the way steam scatters it; however bright the light,
// steam keeps its tint. One draw for every vent. Under reduced motion the
// steam hangs where it is.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

// Per kind of vent: puffs in the stream, seconds a puff lives, how high it
// gets, its width leaving the vent and at the end, the wind (x, z, m/s), how
// thick it is at its thickest and how much taller than wide a puff is.
const KINDS = {
  street: { puffs: 11, life: 6.0, rise: 3.4, size: [0.5, 2.0], wind: [0.3, -0.2], density: 0.8, tall: 1.3 },
  lane: { puffs: 7, life: 3.4, rise: 1.9, size: [0.24, 1.0], wind: [0.16, -0.1], density: 0.46, tall: 1.5 },
  roof: { puffs: 10, life: 6.0, rise: 4.4, size: [0.45, 2.7], wind: [-0.8, 0.3], density: 0.5, tall: 1.0 },
};
const kindOf = (name) => (name.includes("_roof_") ? KINDS.roof : /_(lane|alley|mews|service)(_|$)/.test(name) ? KINDS.lane : KINDS.street);
const LIGHTS = 3;

export function createSteam(scene, shared, anchors, { reduced = false } = {}) {
  const vents = [...anchors]
    .filter(([name]) => name.startsWith("anchor_steam_"))
    .map(([name, a]) => ({ kind: kindOf(name), at: a.position }));
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
  const look = new Float32Array(count * 2);
  let i = 0;
  const bounds = new THREE.Box3();
  for (const { kind, at } of vents) {
    for (let k = 0; k < kind.puffs; k++, i++) {
      vent.set([at.x, at.y, at.z, k / kind.puffs + Math.random() * 0.04], i * 4);
      shape.set([kind.size[0], kind.size[1], kind.rise, kind.life], i * 4);
      motion.set([kind.wind[0], kind.wind[1], Math.random(), Math.random() * Math.PI * 2], i * 4);
      look.set([kind.density, kind.tall], i * 2);
    }
    bounds.expandByPoint(at);
    bounds.expandByPoint(at.clone().add(new THREE.Vector3(kind.wind[0] * kind.life + 4, kind.rise + 4, kind.wind[1] * kind.life + 4)));
    bounds.expandByPoint(at.clone().add(new THREE.Vector3(kind.wind[0] * kind.life - 4, -1, kind.wind[1] * kind.life - 4)));
  }
  geometry.setAttribute("aVent", new THREE.InstancedBufferAttribute(vent, 4));
  geometry.setAttribute("aShape", new THREE.InstancedBufferAttribute(shape, 4));
  geometry.setAttribute("aMotion", new THREE.InstancedBufferAttribute(motion, 4));
  geometry.setAttribute("aLook", new THREE.InstancedBufferAttribute(look, 2));
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
      attribute vec2 aLook;
      uniform float uTime;
      uniform float uMotion;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vAge;
      varying float vSeed;
      varying float vClock;
      varying float vDensity;
      void main() {
        // Still under reduced motion: each puff where it would be at a
        // moment of its own.
        float t = uMotion > 0.5 ? uTime : aMotion.z * 40.0;
        float age = fract(t / aShape.w + aVent.w);
        // Out of the vent fast, then drifting: the rise slows as it spreads.
        float up = aShape.z * (1.0 - pow(1.0 - age, 1.8));
        float lean = age * age * aShape.w;
        // It does not go straight: each puff wanders its own way, further
        // the older it is.
        vec3 wander = vec3(sin(t * 0.6 + aMotion.w) + 0.5 * sin(t * 1.7 + aMotion.w * 2.3), 0.0,
                           cos(t * 0.45 + aMotion.w * 1.3) + 0.5 * sin(t * 1.3 + aMotion.w * 3.1)) * 0.3 * age * aShape.y;
        float size = mix(aShape.x, aShape.y, pow(age, 0.7)) * (0.85 + 0.3 * aMotion.z);
        vec3 centre = aVent.xyz + vec3(aMotion.x * lean, up + size * aLook.y * 0.3, aMotion.y * lean) + wander;
        // A card turned to the camera, upright, taller than wide.
        vec2 p = position.xy * size * vec2(1.0, aLook.y);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 upv = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vWorld = centre + right * p.x + upv * p.y;
        vUv = uv;
        vAge = age;
        vSeed = aMotion.z;
        vClock = t;
        vDensity = aLook.x;
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
      varying float vClock;
      varying float vDensity;
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 q = vUv - 0.5;
        // Wisps: noise bent by slower noise, drawn out upward and creeping
        // up the card, so the strands curl as the puff rises.
        vec2 at = q * vec2(3.4, 1.3) + vec2(vSeed * 17.0, vSeed * 9.0 - vClock * 0.14);
        float bend = vnoise(at * 0.8 + 4.0);
        float n = vnoise(at + bend * 1.3) * 0.55 + vnoise(at * 2.3 + bend * 2.6 + vAge * 1.5) * 0.45;
        float r = length(q) * 2.0;
        // What is left of it: whole as it leaves the vent, strands by the
        // time it is half gone, shreds at the end.
        float eaten = mix(0.12, 0.46, vAge);
        float wisp = smoothstep(eaten, eaten + 0.42, n) * smoothstep(1.0, 0.3, r + (n - 0.5) * 0.5);
        float density = wisp * smoothstep(0.0, 0.1, vAge) * pow(1.0 - vAge, 1.5) * vDensity;
        if (density < 0.003) discard;
        // The light where it is, and more of a light behind it than in
        // front: steam throws light forward.
        vec3 view = normalize(vWorld - uCam);
        vec3 light = vec3(0.016, 0.016, 0.024) + spillAt(vWorld) * 3.6 + uHazeColor * 0.16;
        for (int i = 0; i < ${LIGHTS}; i++) {
          vec3 toL = uLightAt[i] - vWorld;
          float d2 = dot(toL, toL);
          float behind = 0.35 + 1.4 * pow(max(dot(view, toL * inversesqrt(d2)), 0.0), 3.0);
          light += uLightColor[i] * behind * 2.5 * uSigns / (1.0 + d2 / 40.0);
        }
        // However much light, it stays the light's colour: no white knot
        // under a tube.
        light /= 1.0 + 1.1 * max(light.r, max(light.g, light.b));
        vec3 col = cityFog(light * (0.7 + 0.6 * n), vWorld, 0.0);
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
