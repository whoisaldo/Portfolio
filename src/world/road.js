// src/world/road.js: the wet road, which carries most of the colour.
//
// In the plate the asphalt is the brightest thing on screen after the signs.
// Here it is one surface seen the same way from every eye (the hero's half
// a metre off the road, a driver's, a walker's, a roof's), on every street:
//
//   the asphalt  ambientCG's cracked aggregate, dark, lit by the spill map,
//                and what a road picks up in use: patches of newer tar with
//                a sealed joint round them, tar run into the long cracks,
//                the wheel tracks worn smooth, oil down the middle of each
//                lane and where cars stand, silt along the kerb
//   the water    it is wet in a pattern (src/world/ground.js knows where a
//                point is in its street): standing water along the kerbs,
//                in the wheel ruts and where two streets meet, damp round
//                it, drier on the crown
//   the mirror   standing water is a mirror: a sign is a sign in it, upside
//                down, and rain rings it near the lens. Damp asphalt gives
//                the same picture back softened by its own roughness, a
//                lobe a few degrees tall and a fraction of that wide, which
//                is long only where the eye is low and the look is glancing
//                (the hero) and short from a driver's seat or a pavement.
//                On desktop the picture is a real planar reflection
//                (src/world/mirror.js); without one it is the baked light
//                followed along the reflected ray (spillReflect), softer but
//                in the same place and as bright, so a street does not
//                change its nature when the mirror is shed or was never on.
//
// The `wet` switch in env.js takes the water, the mirror and the rain away
// together and leaves a dry, dark road.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { GROUND, VNOISE } from "./ground.js";

// The mirror at full, as world-scene.js sets uReflectGain: its share of the
// reflection is uReflectGain over this, the baked light's the rest.
const MIRROR_FULL = 2.2;

export function createRoadMaterial(shared, { maps, reflection, paint = false }) {
  const uniforms = {
    ...shared,
    uMap: { value: maps.asphalt || null },
    uNormal: { value: maps.asphaltNormal || null },
    uRough: { value: maps.asphaltRough || null },
    uHasMaps: { value: maps.asphalt ? 1 : 0 },
    // (world-scene.js still writes the old baked streaks' gain each frame.)
    uStreakGain: { value: reflection ? 0.1 : 1.1 },
    uReflect: { value: null },
    uReflectMatrix: { value: new THREE.Matrix4() },
    uReflectOn: { value: 0 },
    uReflectGain: { value: MIRROR_FULL },
    uWet: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    defines: { MIRROR: reflection ? 1 : 0, PAINT: paint ? 1 : 0 },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vUv;
      #if PAINT == 1
      // Each mark's own colour: white lines, the crossings' yellow, the
      // walk figure's green.
      attribute vec4 color;
      varying vec3 vPaint;
      #endif
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vUv = uv;
        #if PAINT == 1
        vPaint = color.rgb;
        #endif
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${VNOISE}
      ${GROUND}
      uniform sampler2D uMap;
      uniform sampler2D uNormal;
      uniform sampler2D uRough;
      uniform float uHasMaps;
      uniform sampler2D uReflect;
      uniform mat4 uReflectMatrix;
      uniform float uReflectOn;
      uniform float uReflectGain;
      uniform float uWet;
      varying vec3 vWorld;
      varying vec2 vUv;
      #if PAINT == 1
      varying vec3 vPaint;
      #endif

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
        vec2 p = vWorld.xz;
        vec3 toEye = uCam - vWorld;
        float dist = length(toEye);
        vec3 V = toEye / dist;
        float ndv = clamp(V.y, 0.0, 1.0);
        // Metres a pixel covers: what is finer than that is left out, or
        // it would shimmer.
        float px = fwidth(p.x) + fwidth(p.y);
        float near = 1.0 - smoothstep(0.04, 0.12, px);

        // Where this is in its street. The deck and its ramp are over the
        // streets, not in them.
        vec4 se;
        vec4 sf = streetAt(p, se);
        float grade = step(vWorld.y, 0.3);
        bool alongZ = sf.x >= sf.y;
        float inJ = smoothstep(0.0, 1.5, min(sf.x, sf.y)) * grade;
        float kerbIn = mix(20.0, mix(max(max(sf.x, sf.y), 0.0), 20.0, inJ), grade);
        float lane = alongZ ? sf.z : sf.w;
        float track = smoothstep(0.45, 0.15, abs(lane - 0.8)) * (1.0 - 0.6 * inJ) * grade;
        float gutter = smoothstep(1.5, 0.25, kerbIn);

        // The aggregate, in world space, so the lane paint lies on the same
        // cracked asphalt as the lane: a tile every 2.5 m, fine enough for
        // a lens half a metre off the road, and another, larger and
        // turned, taking over in patches so the repeat never lines up down
        // a street (only where the two meet are both read).
        vec3 albedo = vec3(0.03);
        vec3 nt = vec3(0.5, 0.5, 1.0);
        float rough = 0.46;
        float other = smoothstep(0.35, 0.65, vnoise(p * 0.09));
        if (uHasMaps > 0.5) {
          vec2 tuv = p / 2.5;
          vec2 tuv2 = mat2(0.8, -0.6, 0.6, 0.8) * p / 6.3 + 0.37;
          vec2 gx = dFdx(tuv), gy = dFdy(tuv), gx2 = dFdx(tuv2), gy2 = dFdy(tuv2);
          vec3 a1 = albedo, a2 = albedo, n1 = nt, n2 = nt;
          float r1 = rough, r2 = rough;
          if (other < 0.999) {
            a1 = textureGrad(uMap, tuv, gx, gy).rgb;
            n1 = textureGrad(uNormal, tuv, gx, gy).xyz;
            r1 = textureGrad(uRough, tuv, gx, gy).g;
          }
          if (other > 0.001) {
            a2 = textureGrad(uMap, tuv2, gx2, gy2).rgb;
            n2 = textureGrad(uNormal, tuv2, gx2, gy2).xyz;
            r2 = textureGrad(uRough, tuv2, gx2, gy2).g;
          }
          albedo = mix(a1, a2, other);
          nt = mix(n1, n2, other);
          rough = mix(r1, r2, other);
        }
        nt = nt * 2.0 - 1.0;
        // The cracks: dark in the albedo, and dry, so they break every
        // reflection that crosses them the way they do in the plate. The map
        // is dark (linear luminance about 0.017 to 0.05, measured), so the
        // threshold sits at its darkest few percent.
        float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
        float crack = smoothstep(0.014, 0.024, lum);
        // The smooth tops of the stones, which hold the sheen.
        float stone = smoothstep(0.54, 0.38, rough);

        // A road in use. Repairs: a patch of newer tar now and then, square
        // to the street, darker and smoother, a sealed joint round it; and
        // tar run into the long cracks.
        vec2 pc = p / vec2(11.0, 17.0);
        vec2 pi = floor(pc);
        vec2 lo = 0.06 + 0.4 * vec2(hash12(pi + 4.1), hash12(pi + 9.3));
        vec2 hi = lo + 0.2 + 0.32 * vec2(hash12(pi + 2.2), hash12(pi + 6.6));
        vec2 pe = min(fract(pc) - lo, hi - fract(pc)) * vec2(11.0, 17.0);
        float pm = min(pe.x, pe.y);
        float has = step(hash12(pi + 1.7), 0.36);
        float mended = has * smoothstep(-px, px, pm);
        // (The noise is read on a turned grid, or its cells show as squares
        // laid along the street.)
        vec2 pr = mat2(0.8, -0.6, 0.6, 0.8) * p;
        float n1 = vnoise(pr * 0.07) * 0.7 + vnoise(pr.yx * 0.19 + 2.1) * 0.3;
        float n2 = vnoise(pr.yx * 0.23 + 5.3) * 0.75 + vnoise(pr * 0.61 + 8.7) * 0.25;
        float seal = has * (1.0 - smoothstep(0.02, 0.05 + px, abs(pm)));
        seal = max(seal, (1.0 - smoothstep(0.004, 0.011 + px * 0.25, abs(vnoise(p * 0.31 + 17.0) - 0.5))) * step(0.42, n2)) * near;
        albedo *= mix(1.0, 0.86 + 0.12 * hash12(pi + 8.8), mended) * (1.0 - 0.65 * seal);
        // The wheel tracks, polished paler; oil down the middle of a lane
        // and in blots where cars stand; silt in the gutter.
        float mid = smoothstep(0.55, 0.0, lane) * grade * (1.0 - inJ);
        float lng = vnoise(p * (alongZ ? vec2(1.1, 0.14) : vec2(0.14, 1.1)) + 11.0);
        float oil = max(mid * smoothstep(0.35, 0.7, lng), smoothstep(0.62, 0.74, vnoise(p * 1.1 + 3.0)) * smoothstep(2.6, 1.8, kerbIn));
        albedo *= (1.0 + 0.3 * track * stone) * (1.0 - 0.45 * oil) * (1.0 - 0.3 * smoothstep(0.5, 0.1, kerbIn));

        // The water. The hero's lens is half a metre off the road, so the
        // few metres in front of it (the south junction and the avenue's
        // first twenty) are most of the page's first frame, and that frame
        // fades in from a painted plate whose road is long streaks from
        // kerb to kerb. For that eye alone (fore: this stretch, seen from
        // under a metre) the film is thicker and its lobe longer; a driver
        // or a walker crossing the same junction sees the road every other
        // street has.
        float broad = n1 * 0.3 + n2 * 0.45 + lng * 0.25;
        float fore = smoothstep(-24.0, -4.0, p.y) * (1.0 - smoothstep(9.0, 12.0, abs(p.x))) * smoothstep(1.3, 0.7, uCam.y);
        float field = broad + (0.46 - rough) * 0.5
                    + gutter * (0.02 + 0.3 * lng) + track * (lng - 0.45) * 0.4 + inJ * 0.06;
        float aa = fwidth(field) * 0.75;
        // Water thins out to damp at its edge: a soft shore, not a cut-out.
        float puddle = smoothstep(0.615 - aa, 0.69 + aa, field) * uWet;
        float damp = smoothstep(0.3, 0.6, broad + 0.22 * gutter + 0.14 * fore + 0.1 * inJ - 0.08 * smoothstep(2.5, 7.0, kerbIn) * grade);
        // From the air a wet street is a pale ribbon between dark roofs: the
        // higher the eye, the more of the sky and of its own lights it gives
        // back at a steep look.
        float aerial = smoothstep(12.0, 45.0, uCam.y);
        float wet = uWet * mix(0.3, 1.0, damp);

        vec3 spill = spillGround(vWorld);
        #if PAINT == 1
        // Road paint over the same asphalt: worn through where the stones
        // stand proud and where the wheels run, pale, and lit by the whole
        // street's glow, so it reads as the line down the middle.
        float worn = smoothstep(0.3, 0.75, vnoise(p * 2.3) * 0.55 + lng * 0.3 + 0.3 * track + (rough - 0.46) * 1.2);
        float painted = 0.85 * crack * (1.0 - 0.8 * worn * near);
        albedo = mix(albedo, vPaint, painted);
        stone = max(stone, painted);
        // (The light on it eased toward a ceiling: a white line under six
        // signs is a painted line, not a tube.)
        vec3 col = albedo * (vec3(0.13, 0.14, 0.18) + spill * 1.6 / (1.0 + 1.3 * max(spill.r, max(spill.g, spill.b))));
        #else
        albedo *= mix(1.0, 0.72, wet);
        vec3 col = albedo * 0.55 * (vec3(0.07) + spill * mix(1.0, 0.45, puddle) * (1.0 + 1.5 * aerial)) + albedo * cityGlow(-V, 0.0) * 0.12;
        #endif
        // A wet sheen: the aggregate catches the street's light, and here
        // and there a stone catches it hard. The glints go before a pixel
        // is wider than one, or they would shimmer.
        col += spill * 0.05 * (1.0 - rough) * uWet;
        vec2 gcell = p * 24.0;
        float glint = step(0.997, hash12(floor(gcell))) * smoothstep(0.25, 0.05, length(fract(gcell) - 0.5)) * (1.0 - smoothstep(0.015, 0.04, px));

        // What the wet gives back. Standing water is flat but for the rain;
        // the film on the asphalt follows the stones, smoother where the
        // wheels and the tar have closed the surface.
        // Brighter at a glancing look, and never nothing: a wet street at
        // night is drawn glossier than water is.
        float graze = pow(1.0 - ndv, 3.0);
        float fres = 0.15 + 0.85 * graze;
        col += spill * glint * 1.6 * fres * uWet * crack;
        vec2 rings = vec2(0.0);
        if (puddle > 0.01 && dist < 28.0) {
          rings = (ripple(p / 0.6, uTime) + ripple(p / 0.45 + 13.7, uTime * 1.13)) * puddle * smoothstep(28.0, 5.0, dist);
        }
        vec3 R = normalize(vec3(-V.x + rings.x * 0.03, V.y, -V.z + rings.y * 0.03));
        float sheen = wet * mix(0.35, 1.0, stone) * crack * (0.8 + 0.3 * track + 0.1 * mended + 0.55 * seal + 0.4 * oil) * (1.0 + 3.1 * fore);
        // How wide the film scatters, as a facet's tilt in radians.
        float sigma = mix(mix(0.06, 0.035, max(track, mended)), 0.085, fore);

        float mk = 0.0;
        vec3 sharp = vec3(0.0);
        vec3 soft = vec3(0.0);
        #if MIRROR == 1
        mk = uReflectOn * clamp(uReflectGain / ${MIRROR_FULL.toFixed(1)}, 0.0, 1.0);
        if (mk > 0.001) {
          // The mirror's picture is of the world as the road's plane throws
          // it back, so a direction's vanishing point in it is where that
          // direction is seen from any point of the road: R for the water,
          // and R tipped up and down by the film's own roughness for the
          // asphalt, gathered from a level of the picture as soft as the
          // gaps between the taps. That lobe is the streak: a few degrees
          // tall and narrow, long on screen only at a glancing look.
          vec4 a = uReflectMatrix * vec4(R, 0.0);
          vec4 b = uReflectMatrix[1];
          if (puddle > 0.01) sharp = textureLod(uReflect, a.xy / a.w, 0.0).rgb;
          if (puddle < 0.99) {
            // Further toward the horizon than away from it, as a rough
            // wet surface throws light at a glancing angle.
            float top = 2.0 * sigma;
            float bottom = max(-mix(2.5, 4.5, fore) * sigma, 0.012 - R.y);
            vec2 size = vec2(textureSize(uReflect, 0));
            vec2 u0 = (a.xy + b.xy * bottom) / (a.w + b.w * bottom);
            vec2 u1 = (a.xy + b.xy * top) / (a.w + b.w * top);
            float lod = log2(max(length((u1 - u0) * size) / 8.0, 1.0)) - 0.6;
            float wsum = 0.0;
            for (int i = 0; i < 8; i++) {
              float tilt = mix(bottom, top, (float(i) + 0.5) / 8.0);
              float lim = tilt > 0.0 ? top : bottom;
              float w = exp(-mix(2.0, 0.6, fore) * tilt * tilt / (lim * lim));
              soft += textureLod(uReflect, (a.xy + b.xy * tilt) / (a.w + b.w * tilt), lod).rgb * w;
              wsum += w;
            }
            soft /= wsum;
          }
        }
        #endif
        vec3 baked = vec3(0.0);
        if (mk < 0.999) {
          // No mirror: the baked light along the ray (ground.js), a little
          // off its colour and capped, as a wet road gives a light back.
          baked = tame(spillReflect(vWorld, R) * 0.14, 0.5);
          // Standing water gives the same light back whole, where the film
          // gives a part of it.
          if (puddle > 0.01) sharp = mix(baked * 2.2, sharp, mk);
          // (Drawn out toward the eye only a little: more of it stood on
          // the road as a comb of upright bands.)
          vec2 rd = normalize(R.xz + 1e-5);
          baked *= 0.86 + 0.28 * vnoise(vec2(dot(p, vec2(-rd.y, rd.x)) * 0.7, dot(p, rd) * 0.05));
        }
        // The sky: the lit cloud over the roofs, and the city's glow low on
        // it, brightest where the street runs toward downtown. The mirror
        // draws only what glows, never the sky, so this is its sky on
        // desktop too.
        vec3 sky = cityGlow(R, 0.0) * exp(-max(R.y, 0.0) * 28.0) * 0.6 + (hazeAt(R) * 1.2 + glowAt(R) * 0.5) * uHaze * mix(0.28, 0.4, fore) * (1.0 + 2.5 * aerial);
        vec3 refl = mix(mix(baked, soft, mk) * sheen, sharp, puddle) + sky * mix(0.3 * wet * mix(0.35, 1.0, stone) * crack, 1.0, puddle);
        // (On the hero's stretch the film is thick enough to hold its shine
        // at the lens's feet, as the plate's road does.)
        refl *= mix(mix(max(fres, 0.5 * aerial), 0.6, 0.7 * fore), mix(0.16, 0.25, fore) + 0.75 * graze, puddle) * uWet;
        // Never brighter than the sign it is the reflection of.
        refl /= 1.0 + 0.35 * max(refl.r, max(refl.g, refl.b));
        col += refl;

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
    // The avenue's streaks, baked for the hero's eye alone (spill.js): the
    // road follows the baked light along each eye's own ray instead.
    setStreaks() {},
    setReflection(texture, matrix) {
      uniforms.uReflect.value = texture;
      if (matrix) uniforms.uReflectMatrix.value.copy(matrix);
      uniforms.uReflectOn.value = texture ? 1 : 0;
    },
    dispose() {
      material.dispose();
    },
  };
}
