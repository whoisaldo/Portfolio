// src/world/road.js: the wet road, which carries most of the colour.
//
// In the plate the asphalt is the brightest thing on screen after the signs:
// every tube above it runs down it as a long smeared streak toward the eye.
// Three layers make that here, cheapest first:
//
//   the surface  ambientCG's cracked asphalt, dark, lit by the spill map
//   the streaks  the baked map from spill.js: each sign's light dragged
//                toward +z, the direction the hero looks down the avenue
//   the mirror   on desktop, a real planar reflection of everything that
//                glows (src/world/mirror.js), sampled with a vertical smear
//                and bent by the asphalt's own normal map; a puddle, where
//                the noise says there is one, reflects almost sharply
//
// The `wet` switch in env.js takes the streaks, the mirror and the rain away
// together and leaves a dry, dark road.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

export function createRoadMaterial(shared, { maps, reflection, paint = false }) {
  const uniforms = {
    ...shared,
    uMap: { value: maps.asphalt || null },
    uNormal: { value: maps.asphaltNormal || null },
    uRough: { value: maps.asphaltRough || null },
    uHasMaps: { value: maps.asphalt ? 1 : 0 },
    uStreaks: { value: null },
    uStreakBounds: { value: new THREE.Vector4(0, 0, 1, 1) },
    // The baked streaks are the whole reflection without a mirror, and a
    // faint layer under it with one.
    uStreakGain: { value: reflection ? 0.1 : 1.1 },
    uReflect: { value: null },
    uReflectMatrix: { value: new THREE.Matrix4() },
    uReflectOn: { value: 0 },
    uHorizonV: { value: 0.5 },
    uReflectGain: { value: 2.2 },
    uWet: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    defines: { MIRROR: reflection ? 1 : 0, PAINT: paint ? 1 : 0 },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vUv;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uMap;
      uniform sampler2D uNormal;
      uniform sampler2D uRough;
      uniform float uHasMaps;
      uniform sampler2D uStreaks;
      uniform vec4 uStreakBounds;
      uniform float uStreakGain;
      uniform sampler2D uReflect;
      uniform mat4 uReflectMatrix;
      uniform float uReflectOn;
      uniform float uHorizonV;
      uniform float uReflectGain;
      uniform float uWet;
      varying vec3 vWorld;
      varying vec2 vUv;

      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      // Rain on standing water: a ring spreading from where a drop landed,
      // one drop to a cell every second or so. Returns the ring's slope,
      // pointing away from its centre.
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

      void main() {
        vec3 albedo = vec3(0.1);
        vec3 nt = vec3(0.0, 0.0, 1.0);
        float rough = 0.5;
        // World-space UVs, so the lane paint lies on the same cracked, wet
        // asphalt as the lane: a tile every 2.5 m, fine enough for a lens
        // half a metre off the road, and under it a second, larger and
        // turned, faded in and out by a slow noise so the repeat never lines
        // up down the avenue.
        vec2 tuv = vWorld.xz / 2.5;
        vec2 tuv2 = mat2(0.8, -0.6, 0.6, 0.8) * vWorld.xz / 6.3 + 0.37;
        float other = smoothstep(0.35, 0.65, vnoise(vWorld.xz * 0.09));
        if (uHasMaps > 0.5) {
          albedo = mix(texture2D(uMap, tuv).rgb, texture2D(uMap, tuv2).rgb, other);
          nt = mix(texture2D(uNormal, tuv).xyz, texture2D(uNormal, tuv2).xyz, other) * 2.0 - 1.0;
          rough = mix(texture2D(uRough, tuv).g, texture2D(uRough, tuv2).g, other);
        }
        // The cracks: dark in the albedo, and dry, so they break every
        // reflection that crosses them the way they do in the plate. The map
        // is dark (linear luminance about 0.017 to 0.05, measured), so the
        // threshold sits at its darkest few percent.
        float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
        float crack = smoothstep(0.014, 0.024, lum);
        // Puddles: broad patches of standing water, sharper where the
        // aggregate is smooth.
        float broad = vnoise(vWorld.xz * 0.07) * 0.65 + vnoise(vWorld.xz * 0.23) * 0.35;
        float puddle = smoothstep(0.5, 0.7, broad + (0.46 - rough) * 2.0) * uWet;

        vec3 V = normalize(uCam - vWorld);
        float ndv = clamp(V.y, 0.0, 1.0);
        float fres = 0.05 + 0.95 * pow(1.0 - ndv, 4.0);
        float dist = length(uCam - vWorld);

        vec3 spill = spillAt(vWorld);
        #if PAINT == 1
        // Worn road paint over the same asphalt: pale, still wet, and lit by
        // the whole street's glow, so it reads as the line down the middle.
        albedo = mix(albedo, vec3(0.78, 0.76, 0.7), 0.85 * crack);
        vec3 col = albedo * (vec3(0.06, 0.05, 0.07) + spill * 0.9);
        #else
        vec3 col = albedo * 0.55 * (vec3(0.025) + spill * mix(1.0, 0.45, puddle));
        #endif
        // A wet sheen: the aggregate catches the street's light.
        col += spill * 0.05 * (1.0 - rough) * uWet;

        // The baked streaks: every sign's light run back toward the eye.
        vec2 suv = (vWorld.xz - uStreakBounds.xy) * uStreakBounds.zw;
        vec3 st = texture2D(uStreaks, suv + nt.xy * vec2(0.004, 0.0005)).rgb;
        st *= st;
        // Summed lights drift toward lilac; push the colour back out.
        float sl = dot(st, vec3(0.299, 0.587, 0.114));
        st = max(mix(vec3(sl), st, 1.7), 0.0);
        float wet = uWet * mix(0.6, 1.0, puddle) * mix(0.35, 1.0, crack);
        // Fine striations: light on wet asphalt runs in long thin lines down
        // the street, not in a smooth wash.
        float striation = 0.3 + 0.7 * vnoise(vec2(vWorld.x * 3.2, vWorld.z * 0.11));
        striation *= 0.6 + 0.4 * vnoise(vec2(vWorld.x * 11.0, vWorld.z * 0.35));
        wet *= mix(striation, 1.0, puddle * 0.7);
        col += st * uStreakGain * wet * (0.45 + 0.55 * fres);

        // The sky: the city's glow over the roofs, mirrored where the road
        // is wet, brightest where the street runs toward downtown, which is
        // what lights the middle of the plate's road. The mirror pass draws
        // only what glows, never the sky, so this is its sky on desktop too.
        vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
        vec3 sky = cityGlow(R, 0.0) * exp(-max(R.y, 0.0) * 28.0) * 0.6;
        col += sky * wet * mix(0.35, 1.0, puddle) * fres * crack;

        #if MIRROR == 1
        if (uReflectOn > 0.5) {
          vec4 rp = uReflectMatrix * vec4(vWorld, 1.0);
          vec2 ruv = rp.xy / rp.w;
          // Rough wet asphalt smears a reflection long and soft along the
          // line of sight and barely across it; standing water does not, but
          // near the lens the rain rings it.
          vec2 rings = (ripple(vWorld.xz / 0.6, uTime) + ripple(vWorld.xz / 0.45 + 13.7, uTime * 1.13))
                     * puddle * smoothstep(28.0, 5.0, dist);
          vec2 bend = nt.xy * mix(0.006, 0.002, puddle) * vec2(1.0, 0.3) + rings * 0.01;
          // Rough wet asphalt stretches every reflection from the horizon
          // down toward the eye: gather the mirror along this pixel's column
          // from its own point up to the horizon, nearer the horizon
          // counting less. A puddle keeps closer to a true mirror.
          vec3 refl = vec3(0.0);
          float wsum = 0.0;
          float reach = mix(1.0, 0.25, puddle);
          for (int i = 0; i < 10; i++) {
            float t = float(i) / 9.0;
            float v = mix(ruv.y, uHorizonV, t * t * reach);
            float w = mix(1.0, 0.55, t);
            refl += texture2D(uReflect, vec2(ruv.x + bend.x, v + bend.y)).rgb * w;
            wsum += w;
          }
          refl /= wsum;
          // The aggregate breaks the sheen up: bright on the smooth stones,
          // nothing in the cracks.
          float grain = texture2D(uRough, tuv * 1.6).g;
          float sheen = mix(0.45, 1.0, smoothstep(0.52, 0.4, grain)) * crack;
          sheen = mix(sheen, 1.0, puddle);
          col += refl * uReflectGain * wet * sheen * mix(0.2, 0.8, fres);
        }
        #endif

        col = cityFog(col, vWorld, 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "asphalt";
  return {
    material,
    uniforms,
    setStreaks(tex, bounds) {
      uniforms.uStreaks.value = tex;
      if (bounds) uniforms.uStreakBounds.value.copy(bounds);
    },
    setReflection(texture, matrix, horizonV) {
      uniforms.uReflect.value = texture;
      if (matrix) uniforms.uReflectMatrix.value.copy(matrix);
      if (horizonV !== undefined) uniforms.uHorizonV.value = horizonV;
      uniforms.uReflectOn.value = texture ? 1 : 0;
    },
    dispose() {
      material.dispose();
    },
  };
}
