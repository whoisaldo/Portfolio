// src/world/wet.js: two floors that hold the light of what glows over them.
//
// The avenue's road has a real mirror (src/world/mirror.js), because it fills
// the hero's frame. Two other floors fill frames of their own and were dead:
// the rooftop's roof under About and Stack, thirty metres above the street's
// baked light (spillAt in glsl.js is gone by the fifth storey), and the
// garage's floor in the flight in. Each has only a handful of lit rectangles
// over it, so each traces them in its fragment instead of drawing the city a
// second time: the eye's ray, reflected off the floor, against every
// rectangle (a sign's face, read from the sign atlas in src/world/signs.js,
// or a tube's flat colour), smeared the way a wet or polished floor smears a
// light, along the plane the ray bounced in and more the rougher the floor.
//
// The roof is wet concrete with standing water in its low spots: a smear on
// the concrete, close to a mirror in the water (AFTERLIFE reads backwards in
// a puddle), and the rain rings it. Each sign's light falls on the roof as
// well, a pool of its colour under it. The garage's floor is sealed concrete,
// dry and glossy, darker where cars have stood, and its tubes' reflections
// strike on with the tubes.
import * as THREE from "three";
import { COMMON, LAMPS, VERT_WORLD } from "./glsl.js";

const MAX = 8;

/**
 * `kind` is "roof" or "garage". Returns the material and set(rects, atlas):
 * each rect is { corner, u, v } (world corner and edge vectors), `normal`
 * (the way a one-sided face shines, or null for a tube that shines both
 * ways), `tint` (linear colour times its intensity: a tube's colour, or the
 * colour a sign throws on the roof), and either `atlas` (a Vector4 of the
 * sign's cell in the atlas: u, v, width, height, whose own colours are its
 * reflection) or none, and `sign` [index, flickers] to cut out with the
 * sign, or `tube` to come on with the garage's tubes.
 */
export function createWetFloor(shared, { kind = "roof", reduced = false } = {}) {
  const list = (make) => Array.from({ length: MAX }, make);
  const uniforms = {
    ...shared,
    uAtlas: { value: null },
    uRects: { value: 0 },
    uCorner: { value: list(() => new THREE.Vector3()) },
    uAxisU: { value: list(() => new THREE.Vector3()) },
    uAxisV: { value: list(() => new THREE.Vector3()) },
    uFacing: { value: list(() => new THREE.Vector3()) },
    uCell: { value: list(() => new THREE.Vector4()) },
    uTint: { value: list(() => new THREE.Vector3()) },
    uLit: { value: list(() => new THREE.Vector3()) },
    uMotion: { value: reduced ? 0 : 1 },
    // The `signs` and `wet` switches (env.js): signs off takes their
    // reflections and pools with them; wet off leaves the roof dry.
    uSigns: { value: 1 },
    uWet: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    defines: { ROOF: kind === "roof" ? 1 : 0, MAX_RECTS: MAX },
    vertexShader: VERT_WORLD,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uAtlas;
      uniform int uRects;
      uniform vec3 uCorner[MAX_RECTS];
      uniform vec3 uAxisU[MAX_RECTS];
      uniform vec3 uAxisV[MAX_RECTS];
      uniform vec3 uFacing[MAX_RECTS];
      uniform vec4 uCell[MAX_RECTS];
      uniform vec3 uTint[MAX_RECTS];
      uniform vec3 uLit[MAX_RECTS];
      uniform float uMotion;
      uniform float uSigns;
      uniform float uWet;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vUv;

      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      // A drop's ring spreading on standing water (as road.js has it).
      vec2 ripple(vec2 p, float t) {
        vec2 cell = floor(p);
        float h = hash12(cell);
        vec2 c = vec2(hash12(cell + 7.1), hash12(cell + 3.3)) * 0.5 + 0.25;
        float life = fract(t * (0.7 + 0.6 * h) + h * 11.0);
        vec2 d = fract(p) - c;
        float r = length(d);
        float front = life * 0.45;
        float ring = sin((r - front) * 42.0) * smoothstep(0.07, 0.0, abs(r - front)) * (1.0 - life);
        return d / max(r, 1e-3) * ring;
      }

      // How lit a rectangle is now: a sign's tubes cut out when the sign's
      // do (the same seeded moments as signs.js), and the garage's come on
      // when its tubes strike.
      float litNow(vec3 l) {
        float t = floor(uTime * 14.0);
        float cut = l.y * max(step(0.986, hash12(vec2(t, l.x * 7.13))),
                              step(0.93, hash12(vec2(floor(uTime * 0.7), l.x))) * step(0.5, hash12(vec2(t, l.x))));
        float on = 1.0 - 0.82 * cut;
        if (l.z > 0.5) {
          float catching = step(0.5, hash12(vec2(floor(uTubeClock * 20.0), 7.0)));
          on *= step(0.0, uTubeClock) * (uTubeClock > 0.6 ? 1.0 : catching * smoothstep(0.0, 0.6, uTubeClock));
        }
        return on;
      }

      // Where a ray from p along r meets rectangle i, in its own 0..1 units,
      // and how far it went (0 if it never does).
      vec2 hit(vec3 p, vec3 r, int i, vec3 n, out float t) {
        float den = dot(r, n);
        t = abs(den) < 1e-4 ? 0.0 : dot(uCorner[i] - p, n) / den;
        vec3 d = p + r * t - uCorner[i];
        return vec2(dot(d, uAxisU[i]) / dot(uAxisU[i], uAxisU[i]), dot(d, uAxisV[i]) / dot(uAxisV[i], uAxisV[i]));
      }

      float box(vec2 s, float e) {
        vec2 a = smoothstep(-e, e, s) * smoothstep(1.0 + e, 1.0 - e, s);
        return a.x * a.y;
      }

      void main() {
        vec3 V = normalize(vWorld - uCam);
        #if ROOF == 1
        // Standing water in the low spots, wet concrete between.
        float broad = vnoise(vWorld.xz * 0.3) * 0.65 + vnoise(vWorld.xz * 0.95 + 3.1) * 0.35;
        float water = smoothstep(0.5, 0.57, broad) * uWet;
        vec2 rings = (ripple(vWorld.xz / 0.5, uTime) + ripple(vWorld.xz / 0.37 + 13.7, uTime * 1.13)) * water * uMotion;
        float grain = vnoise(vWorld.xz * 5.0) * 0.6 + vnoise(vWorld.xz * 17.0) * 0.4;
        vec3 albedo = vec3(0.1, 0.1, 0.11) * (0.7 + 0.6 * grain) * mix(1.0, 0.45, water);
        float gloss = mix(0.4, 1.0, water) * mix(0.3, 1.0, uWet);
        float rough = mix(1.0, 0.08, water);
        float spillMul = 0.5;
        #else
        // Sealed concrete: dry, glossy, darker and duller where cars stood.
        float stain = vnoise(vWorld.xz * 0.6) * 0.6 + vnoise(vWorld.xz * 2.3) * 0.4;
        float grain = vnoise(vWorld.xz * 9.0);
        vec2 rings = vec2(0.0);
        float worn = smoothstep(0.5, 0.8, stain);
        vec3 albedo = vec3(0.1, 0.1, 0.108) * (0.8 + 0.35 * grain) * mix(1.0, 0.6, worn);
        float gloss = 0.8 - 0.35 * worn;
        float rough = 0.3 + 0.5 * worn;
        float spillMul = 1.6;
        #endif
        vec3 R = normalize(vec3(V.x + rings.x * 0.03, -V.y, V.z + rings.y * 0.03));
        // A little higher, for the direction the smear runs in.
        vec3 R2 = normalize(R + vec3(0.0, 0.02, 0.0));
        float fres = 0.03 + 0.97 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);

        vec3 light = vec3(0.02) + spillAt(vWorld) * spillMul + lampsAt(vWorld, vec3(0.0, 1.0, 0.0)) * 1.4;
        vec3 refl = vec3(0.0);
        for (int i = 0; i < MAX_RECTS; i++) {
          if (i >= uRects) break;
          float on = litNow(uLit[i]);
          if (uCell[i].z > 0.0) on *= uSigns;
          bool oneSided = dot(uFacing[i], uFacing[i]) > 0.25;
          #if ROOF == 1
          // Its light on the roof, from its middle, the way it faces, most
          // of it gone in twenty metres.
          vec3 toL = uCorner[i] + 0.5 * (uAxisU[i] + uAxisV[i]) - vWorld;
          float d2 = dot(toL, toL);
          vec3 l = toL * inversesqrt(d2);
          float front = oneSided ? max(dot(-l, uFacing[i]), 0.0) : 1.0;
          light += uTint[i] * on * front * (0.25 + 0.75 * max(l.y, 0.0)) * 0.9 / (1.0 + d2 / 30.0);
          #endif
          vec3 n = oneSided ? uFacing[i] : normalize(cross(uAxisU[i], uAxisV[i]));
          // A one-sided face shows only its front.
          if (oneSided && dot(R, n) > -1e-3) continue;
          float t;
          vec2 st = hit(vWorld, R, i, n, t);
          if (t <= 0.0) continue;
          float t2;
          vec2 smear = (hit(vWorld, R2, i, n, t2) - st) * rough * 2.5;
          float edge = 0.01 + 0.02 * rough;
          vec3 c = vec3(0.0);
          if (uCell[i].z > 0.0) {
            // A sign: five taps along the smear, from a blurrier level of
            // the atlas the rougher the floor.
            for (int k = -2; k <= 2; k++) {
              vec2 s = st + smear * float(k) * 0.5;
              float inside = box(s, edge);
              if (inside > 0.0) c += textureLod(uAtlas, uCell[i].xy + clamp(s, 0.0, 1.0) * uCell[i].zw, 2.0 + rough * 3.0).rgb * inside;
            }
            // The sign shader's own gain (signs.js); its tint is its light.
            c *= 2.3 / 5.0;
          } else {
            // A tube: its box, five taps along the smear.
            float inside = 0.0;
            for (int k = -2; k <= 2; k++) inside += box(st + smear * float(k) * 0.5, edge);
            c = uTint[i] * inside / 5.0;
          }
          refl += c * on;
        }
        // The kit's lamps in the wet: each one a streak, drawn out down the
        // floor toward the eye as water draws a light out.
        vec3 side = normalize(cross(R, vec3(0.0, 1.0, 0.0)) + 1e-5);
        for (int i = 0; i < ${LAMPS}; i++) {
          vec4 L = uLamps[i];
          vec3 d = L.xyz - vWorld;
          float d2 = dot(d, d);
          if (d2 > L.w * L.w * 9.0) continue;
          vec3 e = d * inversesqrt(d2) - R;
          float dh = dot(e, side);
          float glint = exp(-dh * dh / (0.0003 + rough * 0.0015) - e.y * e.y / (0.003 + rough * 0.02));
          refl += uLampColors[i] * glint * 1.6 * uWet;
        }
        // The sky's glow over the roofs, where the ray goes up into it.
        #if ROOF == 1
        float h = max(R.y, 0.0);
        refl += (uHazeColor * 0.5 * exp(-h * 9.0) * uHaze + cityGlow(R, h * 900.0) * 0.8) * 0.5;
        #endif
        vec3 col = albedo * light + refl * fres * gloss * (1.0 + 0.3 * uBass);
        col = cityFog(col, vWorld, 0.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = kind === "roof" ? "roof_wet" : "garage_floor";

  return {
    material,
    setSigns(on) {
      uniforms.uSigns.value = on ? 1 : 0;
    },
    setWet(on) {
      uniforms.uWet.value = on ? 1 : 0;
    },
    set(rects, atlas = null) {
      const n = Math.min(MAX, rects.length);
      uniforms.uRects.value = n;
      uniforms.uAtlas.value = atlas;
      rects.slice(0, n).forEach((r, i) => {
        uniforms.uCorner.value[i].copy(r.corner);
        uniforms.uAxisU.value[i].copy(r.u);
        uniforms.uAxisV.value[i].copy(r.v);
        if (r.normal) uniforms.uFacing.value[i].copy(r.normal).normalize();
        else uniforms.uFacing.value[i].set(0, 0, 0);
        if (r.atlas) uniforms.uCell.value[i].copy(r.atlas);
        else uniforms.uCell.value[i].set(0, 0, 0, 0);
        uniforms.uTint.value[i].set(r.tint.r, r.tint.g, r.tint.b);
        uniforms.uLit.value[i].set(r.sign?.[0] ?? 0, r.sign?.[1] ?? 0, r.tube ? 1 : 0);
      });
    },
  };
}
