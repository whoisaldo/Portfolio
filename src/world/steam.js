// src/world/steam.js: steam, lit by the signs.
//
// A wet city at night breathes, and each kind of place its own way. A
// district adds a vent with one empty, at the mouth the steam leaves:
// `empty("anchor_steam_<kind>_<anything unique>", (x, y, z))`; the kind is
// read from the name (KINDS and kindOf below):
//   street   (any other name) a manhole or a grate in the road: a low
//            breath a metre or two wide that rolls up lazily, 3 m up
//   stall    (`_stall_`, or a street vent set 0.8 to 2 m up: a pot on a
//            counter) cooking steam, quick, gone in two metres
//   drain    (`_drain_`) a kerb or deck drain's thin curl
//   lane     (`_lane_`, `_alley_`, `_mews_`, `_service_`) a vent in a lane's
//            wall: narrow, quick, gone by the lintel
//   roof     (`_roof_`) roof plant: a plume that leans on the wind and tears
//   stack    (`_stack_`, `_plant_`; Santo Domingo's roof vents) a works'
//            chimney or process vent: 11 m of it, 6 wide, rolled downwind
// Each keeps a stream of puffs going: one leaves the vent, rises, spreads,
// leans with the wind and thins out to nothing, and the next is already
// coming. A puff is a card turned to the camera with a billow drawn on it:
// a soft body with no edge and no solid core, torn into rising strands that
// curl and roll as it rises and tear further as it ages, shaded as a dome
// bent by its own lobes, so the side toward what lights it is lit
// and the far side is not, and with the light behind it its thin edges glow
// (steam throws light forward). It is lit by whatever light is where it is,
// worked out once a puff at its middle: the street's (the spill map every
// surface reads, and which way it is brighter from there, and how high it
// hangs), the kit's lamps, the rooftop's signs, what the streets under a
// roof throw up at a plume over them and Santo Domingo's sodium air, each
// from where it is. In the dark it is the cool pale grey of the sky's glow,
// so a vent shows in a still wherever it is, and a dim light greys it rather
// than browning it: only a light strong enough to see in it tints it. It
// adds light more than it hides what is behind it, so on a lit wall it is
// vapour and never a stain. Over Santo Domingo's works the stacks' smoke
// gathers into a low smog: slow banks twenty and thirty metres across that
// lie over the plant and drift downwind, lit by its sodium from below.
// And it stays a plume from close to: as the eye comes within a few metres
// a puff thins away, so it is never a sheet across the frame. One draw for
// every vent and bank, the same every time (no dice: a still is the same
// still). A vent's puffs are dealt by its place among the vents as the kit
// lists them (by name), a bank's by where it lies. Under reduced motion the
// steam hangs where it is.
import * as THREE from "three";
import { COMMON, LAMPS } from "./glsl.js";

// Per kind of vent: puffs in the stream, seconds a puff lives, how high it
// gets, its width leaving the vent and at the end, the wind (x, z, m/s), how
// thick it is at its thickest, how much taller than wide a puff is, how
// much of the light about it it takes (a works' plume stands in floodlight)
// and how much of what is behind it it hides at its thickest.
const KINDS = {
  street: { puffs: 11, life: 6.0, rise: 3.6, size: [0.55, 2.0], wind: [0.3, -0.2], density: 0.85, tall: 1.2, lift: 1, hide: 0.4 },
  stall: { puffs: 9, life: 3.8, rise: 2.6, size: [0.35, 1.6], wind: [0.1, -0.06], density: 1.0, tall: 1.3, lift: 1.3, hide: 0.4 },
  drain: { puffs: 6, life: 3.6, rise: 1.6, size: [0.22, 0.9], wind: [0.25, -0.15], density: 0.65, tall: 1.3, lift: 1, hide: 0.4 },
  lane: { puffs: 7, life: 3.4, rise: 1.9, size: [0.26, 1.1], wind: [0.16, -0.1], density: 0.75, tall: 1.4, lift: 1, hide: 0.4 },
  roof: { puffs: 10, life: 6.5, rise: 5.0, size: [0.5, 3.2], wind: [-0.8, 0.3], density: 0.62, tall: 1.0, lift: 1, hide: 0.4 },
  stack: { puffs: 14, life: 9.0, rise: 11.0, size: [1.0, 6.5], wind: [-1.2, 0.45], density: 0.85, tall: 1.0, lift: 5.0, hide: 0.22 },
};
// A bank of the works' smog: four slow puffs, flatter than tall, lying low.
// (Its width leaving the vent is what tells the shader it is smog.)
const SMOG = { puffs: 4, life: 40.0, rise: 3.0, size: [14.0, 30.0], wind: [-0.9, 0.35], density: 0.9, tall: 0.5, lift: 2.2, hide: 0.2 };
// Santo Domingo, as COMMON's santoAt has it: the smog is over its works only.
const inSanto = (x, z) => Math.min(x - 170, 490 - x, z + 176, 48 - z) > 0;
const kindOf = (name, at) => {
  if (/_(stack|plant)(_|$)|_roof_santo_/.test(name)) return KINDS.stack;
  if (name.includes("_roof_")) return KINDS.roof;
  if (/_(lane|alley|mews|service)(_|$)/.test(name)) return KINDS.lane;
  if (/_drain(_|$)/.test(name)) return KINDS.drain;
  if (/_stall(_|$)/.test(name) || (at.y > 0.8 && at.y < 2)) return KINDS.stall;
  return KINDS.street;
};
const LIGHTS = 3;
// A number from 0 to 1 that is a vent's puff's own, the same every time.
const dice = (a, b, c) => {
  const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/** The smog's banks over the works: where the stacks stand thickest, more. */
function smogBanks(vents) {
  const cells = new Map();
  for (const { kind, at } of vents) {
    if (kind !== KINDS.stack || !inSanto(at.x, at.z)) continue;
    const key = `${Math.floor(at.x / 48)},${Math.floor(at.z / 48)}`;
    const c = cells.get(key) ?? { n: 0, x: 0, y: 0, z: 0, cx: Math.floor(at.x / 48), cz: Math.floor(at.z / 48) };
    c.n++;
    c.x += at.x;
    c.y += at.y;
    c.z += at.z;
    cells.set(key, c);
  }
  const banks = [];
  for (const c of cells.values()) {
    const n = 1 + Math.floor(c.n / 4);
    for (let j = 0; j < n; j++) {
      const a = dice(1000 + c.cx, c.cz, j) * Math.PI * 2;
      const r = j ? 8 + 10 * dice(c.cx, 1000 + c.cz, j) : 0;
      banks.push({
        kind: SMOG,
        at: new THREE.Vector3(c.x / c.n + Math.cos(a) * r, THREE.MathUtils.clamp((c.y / c.n) * 0.45, 5, 13), c.z / c.n + Math.sin(a) * r),
        key: [1000 + c.cx, 1000 + c.cz + j * 0.37],
      });
    }
  }
  return banks;
}

export function createSteam(scene, shared, anchors, { reduced = false } = {}) {
  const vents = [...anchors]
    .filter(([name]) => name.startsWith("anchor_steam_"))
    .map(([name, a], v) => ({ kind: kindOf(name, a.position), at: a.position, key: [v, 0] }));
  const all = [...vents, ...smogBanks(vents)];
  const count = all.reduce((n, v) => n + v.kind.puffs, 0);
  if (!count) return null;

  const card = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = card.index;
  geometry.setAttribute("position", card.attributes.position);
  geometry.setAttribute("uv", card.attributes.uv);
  const vent = new Float32Array(count * 4);
  const shape = new Float32Array(count * 4);
  const motion = new Float32Array(count * 4);
  const look = new Float32Array(count * 4);
  let i = 0;
  const bounds = new THREE.Box3();
  const reach = new THREE.Vector3();
  for (const { kind, at, key } of all) {
    const [v, w] = key;
    for (let k = 0; k < kind.puffs; k++, i++) {
      vent.set([at.x, at.y, at.z, k / kind.puffs + dice(v, k + w, 1) * 0.04], i * 4);
      shape.set([kind.size[0], kind.size[1], kind.rise, kind.life], i * 4);
      motion.set([kind.wind[0], kind.wind[1], dice(v, k + w, 2), dice(v, k + w, 3) * Math.PI * 2], i * 4);
      look.set([kind.density, kind.tall, kind.lift, kind.hide], i * 4);
    }
    const pad = kind.size[1];
    bounds.expandByPoint(reach.set(at.x + kind.wind[0] * kind.life, at.y + kind.rise, at.z + kind.wind[1] * kind.life).addScalar(pad));
    bounds.expandByPoint(reach.set(at.x, at.y - 1, at.z).subScalar(pad));
    bounds.expandByPoint(reach.set(at.x + kind.wind[0] * kind.life, at.y - 1, at.z + kind.wind[1] * kind.life).subScalar(pad));
    bounds.expandByPoint(reach.set(at.x, at.y + kind.rise, at.z).addScalar(pad));
  }
  geometry.setAttribute("aVent", new THREE.InstancedBufferAttribute(vent, 4));
  geometry.setAttribute("aShape", new THREE.InstancedBufferAttribute(shape, 4));
  geometry.setAttribute("aMotion", new THREE.InstancedBufferAttribute(motion, 4));
  geometry.setAttribute("aLook", new THREE.InstancedBufferAttribute(look, 4));
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
      ${COMMON}
      attribute vec4 aVent;
      attribute vec4 aShape;
      attribute vec4 aMotion;
      attribute vec4 aLook;
      uniform float uMotion;
      uniform vec3 uLightAt[${LIGHTS}];
      uniform vec3 uLightColor[${LIGHTS}];
      uniform float uSigns;
      varying vec2 vUv;
      varying vec2 vAt;
      varying float vAge;
      varying float vDensity;
      varying float vHigh;
      varying float vRise;
      varying vec3 vAmbient;
      varying vec3 vLight;
      varying vec3 vLightDir;
      varying float vAbsorb;
      float lum(vec3 c) { return dot(c, vec3(0.3, 0.5, 0.2)); }
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
                           cos(t * 0.45 + aMotion.w * 1.3) + 0.5 * sin(t * 1.3 + aMotion.w * 3.1)) * 0.22 * age * aShape.y;
        float size = mix(aShape.x, aShape.y, pow(age, 0.7)) * (0.85 + 0.3 * aMotion.z);
        vec3 centre = aVent.xyz + vec3(aMotion.x * lean, up + size * aLook.y * 0.3, aMotion.y * lean) + wander;

        // The light where the puff is, and which way it comes from. The
        // street's: the map's light here and which way it grows, at the
        // height the map says it hangs.
        vec3 street = spillAt(centre) * 2.2;
        vec2 e = vec2(2.0, 0.0);
        vec2 grow = vec2(lum(spillAt(centre + e.xyy)) - lum(spillAt(centre - e.xyy)),
                         lum(spillAt(centre + e.yyx)) - lum(spillAt(centre - e.yyx)));
        vec2 suv = (centre.xz - uSpillBounds.xy) * uSpillBounds.zw;
        float hangs = texture2D(uSpill, clamp(suv, 0.0, 1.0)).a * 15.94;
        vec3 dirSum = normalize(vec3(grow * 6.0 / (lum(street) + 0.02), clamp((hangs - centre.y) * 0.3, -1.0, 1.0)).xzy + vec3(0.0, 0.05, 0.0)) * lum(street);
        // What the streets under a roof throw up at a plume over them, and
        // Santo Domingo's sodium air off its floodlit yards: from below.
        vec3 under = spillAt(vec3(centre.x, 1.5, centre.z)) * 0.4 * smoothstep(5.0, 12.0, centre.y) + SODIUM * 2.5 * santoAt(centre.xz);
        dirSum += vec3(0.0, -1.0, 0.0) * lum(under);
        vec3 light = street + under;
        // The kit's lamps, each as far as it reaches.
        for (int i = 0; i < ${LAMPS}; i++) {
          vec3 d = uLamps[i].xyz - centre;
          float d2 = dot(d, d);
          float r2 = uLamps[i].w * uLamps[i].w;
          if (d2 > r2) continue;
          float fall = 1.0 - d2 / r2;
          vec3 c = uLampColors[i] * fall * fall / (1.0 + d2 * 0.12);
          light += c;
          dirSum += d * inversesqrt(d2 + 1e-4) * lum(c);
        }
        // And the rooftop's signs.
        for (int i = 0; i < ${LIGHTS}; i++) {
          vec3 d = uLightAt[i] - centre;
          float d2 = dot(d, d);
          vec3 c = uLightColor[i] * 1.4 * uSigns / (1.0 + d2 / 40.0);
          light += c;
          dirSum += d * inversesqrt(d2 + 1e-4) * lum(c);
        }
        vLight = light * aLook.z;
        vLightDir = normalize((viewMatrix * vec4(dirSum + vec3(0.0, 1e-4, 0.0), 0.0)).xyz);
        // The sky's glow, which is always there, cool and pale, and higher
        // up the lit city's glow in the wet air: a plume over the roofs is
        // lighter than the sky behind it, not a dark ribbon across it.
        vAmbient = vec3(0.05, 0.055, 0.07) + uHazeColor * 0.22 + uGlowColor * smoothstep(6.0, 30.0, centre.y);
        vAbsorb = aLook.w;

        // A card turned to the camera, upright, taller than wide.
        vec2 p = position.xy * size * vec2(1.0, aLook.y);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 upv = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 world = centre + right * p.x + upv * p.y;
        // Within a few metres it thins away: a plume by the lens is a few
        // wisps, not a sheet over the frame. Far off it goes into the fog.
        float fog = cityFog(vec3(1.0), centre, 0.0).g - cityFog(vec3(0.0), centre, 0.0).g;
        vDensity = aLook.x * smoothstep(2.0, 8.0, distance(world, uCam)) * sqrt(fog);
        // (A bank of smog has no mouth.)
        vRise = aShape.x > 8.0 ? 9.0 : world.y - aVent.y;
        // A bank of smog thins out where it meets the ground.
        vHigh = aShape.x > 8.0 ? smoothstep(0.0, 4.0, world.y) : 1.0;
        // The billows are the vent's, not the puff's: one pattern on the
        // plane facing the eye through the vent, rising slower than the
        // steam, so the puffs of a plume run together into one body.
        float own = fract(sin(dot(aVent.xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        vec3 off = world - aVent.xyz;
        vAt = vec2(dot(off, right), dot(off, upv) - t * 0.6 * aShape.z / aShape.w) * (2.6 / aShape.y) + own * vec2(31.0, 17.0);
        vUv = uv;
        vAge = age;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec2 vUv;
      varying vec2 vAt;
      varying float vAge;
      varying float vDensity;
      varying float vHigh;
      varying float vRise;
      varying vec3 vAmbient;
      varying vec3 vLight;
      varying vec3 vLightDir;
      varying float vAbsorb;
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 q = vUv - 0.5;
        float r = length(q) * 2.0;
        // Billows that rise into wisps: the noise is finer across than up,
        // so it runs in strands, and bent by a slower noise so the strands
        // curl; a finer set rolls over the first.
        vec2 s = vAt * vec2(1.5, 0.8);
        vec2 bendBy = vec2(vnoise(s * 0.6 + 3.1), vnoise(s * 0.6 + 7.7)) - 0.5;
        s += bendBy * 1.6;
        float n1 = vnoise(s);
        float n = n1 * 0.55 + vnoise(s * 2.13 + n1 * 1.3) * 0.3 + vnoise(s * 4.7) * 0.15;
        // The strands: the ridges of the fine set, where the vapour is
        // thickest.
        float strand = 1.0 - abs(2.0 * vnoise(s * 1.9 + n * 2.0) - 1.0);
        // A soft body with no edge and no flat core: thickest at its middle
        // and falling away from there; it is torn from the first (only what
        // its billows hold is there) and more as it ages, into strands.
        float body = max(exp(-r * r * 3.2) - 0.04, 0.0);
        float eaten = mix(0.25, 0.52, vAge);
        float torn = smoothstep(eaten, eaten + 0.3, n + (strand - 0.5) * 0.3) * mix(0.55, 1.0, strand * strand);
        // A puff is thin leaving the vent and thickest a fifth of the way
        // through its life, so a plume has no bright foot, and below the
        // vent's mouth there is none; and no puff is ever solid.
        float life = smoothstep(0.0, 0.18, vAge) * pow(1.0 - vAge, 1.15);
        float density = min(2.6 * body * torn * life * smoothstep(-0.2, 0.5, vRise), 0.7) * vDensity * vHigh;
        if (density < 0.003) discard;
        float thick = smoothstep(0.1, 0.6, body * torn);
        // A dome bent by its lobes, in the camera's terms (the card faces
        // it, upright, so its u and v are the screen's x and y).
        vec2 bend = vec2(dFdx(n) / max(dFdx(vAt.x), 1e-5), dFdy(n) / max(dFdy(vAt.y), 1e-5));
        vec3 nrm = normalize(vec3(q * 1.4 - bend * 0.35, 1.0));
        // Lit more on the side toward the light, and more where it is
        // thick; with the light behind it, all of it glows.
        float facing = dot(nrm, vLightDir);
        float behind = pow(max(-vLightDir.z, 0.0), 2.0);
        vec3 col = vAmbient * (0.8 + 0.2 * nrm.y + 0.3 * (n - 0.5)) + vLight * ((0.6 + 0.4 * facing) * (0.65 + 0.35 * thick) + behind * 0.6);
        // It takes a light at a fraction of its strength and paler than it,
        // never past white; a dim light greys it and only a strong one tints
        // it, so it is never brown.
        col /= 1.0 + 0.85 * max(col.r, max(col.g, col.b));
        float l = dot(col, vec3(0.3, 0.5, 0.2));
        col = mix(vec3(l) * vec3(0.96, 1.0, 1.05), col, 0.3 + 0.45 * smoothstep(0.04, 0.2, l));
        // It gives light more than it hides what is behind it.
        gl_FragColor = vec4(col * density, density * vAbsorb);
      }
    `,
    transparent: true,
    premultipliedAlpha: true,
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
