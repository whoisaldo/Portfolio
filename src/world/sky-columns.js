// src/world/sky-columns.js: the hologram columns over the far city.
//
// The show stands columns of advertising in the sky over its skyline, the
// tallest things in it: bright stacks of dozens of adverts edged in cyan,
// with a soft beam going on up out of each one's top into the cloud. The
// stack is solid, a prism of screens the far city stands with its other
// boxes (src/world/far-street.js). This module is the light round it: one
// quad a column that turns about its own axis to face the lens, drawn
// additively, a glow down both edges of the stack, the haze lit at its
// foot, and over the stack the beam. One instanced draw for all of them. Where they stand is the far city's to say
// (src/world/skyline.js): never up the hero's avenue, never under Contact's
// moon.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

// (The first five are the columns' first tints; the group west of the kit
// is dealt from them. The newer groups take any but the first.)
const TONES = ["#3fe4ff", "#3fe4ff", "#52ffd0", "#3fe4ff", "#4fb4ff", "#ff7ad9"];

// One of the city's twenty-four adverts (public/scenes/world/ads.webp, laid out
// by scripts/pack-ads.mjs: eight wide ones in two rows of four, four tall
// ones on their sides along the foot), as the kit's billboards sample it:
// st is across and up the board, aspect its width over its height (a tall
// board takes a tall advert), pick which. The art covers the board
// uncropped one way and is never stretched.
export const ADVERT = /* glsl */ `
  uniform sampler2D uAds;
  uniform float uHasAds;
  vec3 advert(vec2 st, float aspect, float pick) {
    bool tall = aspect < 0.85;
    float cell = tall ? 0.6667 : 1.5;
    if (aspect > cell) st.y = 0.5 + (st.y - 0.5) * cell / aspect;
    else st.x = 0.5 + (st.x - 0.5) * aspect / cell;
    st = clamp(st, 0.01, 0.99);
    float rowH = 341.0 / 2048.0;
    float i = mod(pick, 16.0);
    float j = mod(pick, 8.0);
    vec2 q = tall ? vec2((mod(j, 4.0) + st.y) * 0.25, 1.0 - (1365.0 + (floor(j / 4.0) + st.x) * 341.0) / 2048.0) : vec2((mod(i, 4.0) + st.x) * 0.25, 1.0 - (floor(i / 4.0) + 1.0 - st.y) * rowH);
    return texture2D(uAds, q).rgb;
  }
  // The far city's words (src/world/sky-words.js): a mask of sixteen, one
  // to a column of the texture, a character to a 64 px cell, the columns in
  // order of length. A character of word w, f across and down its square.
  uniform sampler2D uWords;
  uniform float uHasWords;
  float wordGlyph(float w, float idx, vec2 f) {
    float inside = step(0.0, f.x) * step(f.x, 1.0) * step(0.0, f.y) * step(f.y, 1.0);
    return texture2D(uWords, vec2((w + 0.05 + clamp(f.x, 0.0, 1.0) * 0.9) / 16.0, (idx + 0.05 + clamp(f.y, 0.0, 1.0) * 0.9) / 8.0)).r * inside;
  }
  float wordLen(float w) {
    return w < 4.0 ? 2.0 : w < 8.0 ? 3.0 : w < 12.0 ? 4.0 : w < 14.0 ? 5.0 : 6.0;
  }
  // A word down a sign: s across and down it, tall its height over its
  // width, pick (0..1) which of the words that fit. A sign long enough
  // says its word again after a gap.
  float wordDown(vec2 s, float tall, float pick) {
    float cells = max(1.0, floor(tall / 1.08));
    float many = cells < 3.0 ? 4.0 : cells < 4.0 ? 8.0 : cells < 5.0 ? 12.0 : cells < 6.0 ? 14.0 : 16.0;
    float w = floor(fract(pick) * many);
    float len = wordLen(w);
    float reps = max(1.0, floor((cells + 1.0) / (len + 1.0)));
    float rows = min(reps * (len + 1.0) - 1.0, cells);
    float gy = s.y * rows;
    float idx = mod(floor(gy), len + 1.0);
    return wordGlyph(w, idx, vec2(s.x, (fract(gy) - 0.5) * tall / rows + 0.5)) * step(idx, len - 0.5);
  }
  // A word across a board: st across and up it, aspect its width over its
  // height, pick which.
  float wordAcross(vec2 st, float aspect, float pick) {
    float n = clamp(floor(aspect * 1.3), 2.0, 6.0);
    float w = (n < 2.5 ? 0.0 : n < 3.5 ? 4.0 : n < 4.5 ? 8.0 : n < 5.5 ? 12.0 : 14.0) + floor(fract(pick) * (n < 4.5 ? 4.0 : 2.0));
    float gx = st.x * n;
    float side = min(aspect / n, 0.76);
    return wordGlyph(w, floor(gx), vec2((fract(gx) - 0.5) * (aspect / n) / side + 0.5, (0.5 - st.y) / side + 0.5));
  }
  // A character that is nobody's: the strokes a kanji is built of (three
  // or four bars, a stem, the sides of a box, two sweeps at its foot),
  // each there or not by the hash, in a cell 0..1.
  float kanji(vec2 f, float h1, float h2) {
    float w = 0.065;
    float k = step(abs(f.y - 0.86), w) * step(abs(f.x - 0.5), 0.36) * step(0.3, h1);
    k += step(abs(f.y - 0.63), w) * step(abs(f.x - 0.5), 0.26 + 0.1 * h2) * step(0.2, fract(h1 * 3.7));
    k += step(abs(f.y - 0.4), w) * step(abs(f.x - 0.5), 0.2 + 0.16 * step(0.5, h2)) * step(0.35, fract(h2 * 5.3));
    k += step(abs(f.y - 0.14), w) * step(abs(f.x - 0.5), 0.38) * step(0.5, fract(h1 * 7.1));
    k += step(abs(f.x - 0.5), w) * step(abs(f.y - 0.5), 0.38) * step(0.4, fract(h2 * 2.3));
    k += step(abs(abs(f.x - 0.5) - 0.3), w) * step(abs(f.y - 0.63), 0.25) * step(0.55, fract(h1 * 9.1));
    float foot = step(0.05, f.y) * step(f.y, 0.38) * step(0.5, fract(h2 * 11.3));
    k += foot * step(abs(abs(f.x - 0.5) - (0.38 - f.y) * 0.9), w * 1.3);
    return min(k, 1.0);
  }
  // The back of a sign: a dark sheet on its frame (a post either side of
  // every bay, two rails, a brace crossing each bay) and the light of its
  // tubes coming round the edge. st is across and up the board from behind,
  // aspect its width over its height, tube the sign's own colour.
  vec3 signBack(vec2 st, float aspect, vec3 tube) {
    float bays = max(2.0, floor(aspect * 1.5 + 0.5));
    float fx = fract(st.x * bays);
    float fy = (st.y - 0.2) / 0.6;
    float steel = step(min(fx, 1.0 - fx), 0.035) + step(abs(st.y - 0.2), 0.022) + step(abs(st.y - 0.8), 0.022);
    steel += (step(abs(fx - fy), 0.035) + step(abs(fx - (1.0 - fy)), 0.035)) * step(0.0, fy) * step(fy, 1.0);
    float edge = min(min(st.x, 1.0 - st.x) * aspect, min(st.y, 1.0 - st.y));
    return mix(vec3(0.008, 0.009, 0.012), vec3(0.03, 0.032, 0.038), min(steel, 1.0)) + tube * 0.45 * exp(-edge * 40.0);
  }
  // What a board shows, by its own seed: seven in ten one of the adverts;
  // the rest a word (a lightbox in one of the signs' colours with its
  // characters dark on it, or the characters lit on a dark board, a line of
  // the colour under them). Nobody's name on any, and none white enough to
  // burn out.
  vec3 boardFace(vec2 st, float aspect, float pick, float seed) {
    float kind = hash12(vec2(seed, 61.7));
    if (kind < 0.7 || uHasWords < 0.5) return advert(st, aspect, pick);
    float hc = hash12(vec2(seed, 63.9));
    vec3 a = hc < 0.26 ? vec3(0.1, 0.85, 1.0) : hc < 0.48 ? vec3(1.0, 0.72, 0.16) : hc < 0.66 ? vec3(1.0, 0.16, 0.5) : hc < 0.8 ? vec3(1.0, 0.2, 0.14) : hc < 0.9 ? vec3(0.3, 1.0, 0.6) : vec3(1.0, 0.92, 0.3);
    vec3 b = hc < 0.5 ? vec3(0.02, 0.03, 0.1) : vec3(0.07, 0.015, 0.05);
    float pk = hash12(vec2(seed, 65.1));
    float k = aspect >= 1.0 ? wordAcross(vec2(st.x, (st.y - 0.5) / 0.9 + 0.5), aspect, pk) : wordDown(vec2(st.x, 1.0 - st.y), 1.0 / aspect, pk);
    float rule = step(abs(st.y - 0.07), 0.018) * step(abs(st.x - 0.5), 0.42) * step(1.0, aspect);
    return hash12(vec2(seed, 69.5)) < 0.5 ? mix(a * 0.62, b * 0.5, k) : mix(b, a * 1.15, max(k, rule));
  }
`;

/** `columns` is x, z, width, height, tone (an index into the tones) and a
 *  seed, six numbers a column; `ads` the atlas's uniforms (uAds, uHasAds). */
export function createSkyColumns(scene, shared, columns, { reduced = false, ads } = {}) {
  const n = columns.length / 6;
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.translate(0, 0.5, 0);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", quad.attributes.position);
  geometry.setAttribute("uv", quad.attributes.uv);
  geometry.setIndex(quad.index);
  const place = new Float32Array(n * 4);
  const tone = new Float32Array(n * 4);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    place.set(columns.slice(i * 6, i * 6 + 4), i * 4);
    c.set(TONES[columns[i * 6 + 4] % TONES.length]);
    tone.set([c.r, c.g, c.b, columns[i * 6 + 5]], i * 4);
  }
  geometry.setAttribute("aPlace", new THREE.InstancedBufferAttribute(place, 4));
  geometry.setAttribute("aTone", new THREE.InstancedBufferAttribute(tone, 4));
  geometry.instanceCount = n;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, ...ads, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      uniform vec3 uCam;
      attribute vec4 aPlace;
      attribute vec4 aTone;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec4 vTone;
      varying vec2 vSize;
      void main() {
        vec2 to = normalize(uCam.xz - aPlace.xy + 1e-4);
        // The quad is three columns wide: the column in its middle, and
        // either side the air it lights.
        vec3 w = vec3(aPlace.x + to.y * position.x * aPlace.z * 3.0, position.y * aPlace.w, aPlace.y - to.x * position.x * aPlace.z * 3.0);
        vUv = vec2((uv.x - 0.5) * 3.0 + 0.5, uv.y);
        vWorld = w;
        vTone = aTone;
        vSize = aPlace.zw;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${ADVERT}
      uniform float uMotion;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec4 vTone;
      varying vec2 vSize;
      void main() {
        float t = uTime * uMotion;
        float across = abs(vUv.x - 0.5) * 2.0;
        float up = vUv.y;
        // (Their halo, their white edges and their lit foot are for an eye
        // above the roofs: from the page's own roofs a column is as it was.)
        float lift = smoothstep(40.0, 62.0, uCam.y);
        // Outside the column: its halo, widest in the haze at its foot.
        if (across > 1.0) {
          float past = (across - 1.0) * 0.5;
          vec3 halo = vTone.rgb * (0.16 * exp(-past * 9.0) + 0.5 * exp(-past * 3.0) * exp(-up * vSize.y / 70.0)) * (1.0 - smoothstep(0.7, 1.0, up));
          halo *= lift * smoothstep(0.0, 0.004, up) * uHaze * exp(-length(vWorld - uCam) * uFogDensity * 0.3);
          gl_FragColor = vec4(halo, 0.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          return;
        }
        // The stack itself is solid (the far city stands it: a prism of
        // screens, src/world/far-street.js, as high as 0.72 of the column).
        // This is the light round it: a glow down both its edges, and over
        // the stack the beam, thickest through its middle like a lit
        // cylinder of air and gone by its top.
        const float STACK = 0.72;
        float inStack = step(up, STACK);
        float body = sqrt(max(1.0 - across * across, 0.0));
        float edge = smoothstep(0.7, 0.98, across);
        float over = clamp((up - STACK) / (1.0 - STACK), 0.0, 1.0);
        float beam = 1.0 - inStack;
        vec3 rim = mix(vTone.rgb, vec3(0.82, 0.93, 1.0), 0.5) * 1.6;
        vec3 col = rim * edge * 0.5 * inStack;
        col += (vTone.rgb * (body * 0.34 + smoothstep(0.3, 0.0, across) * 0.3) + rim * edge * 0.3) * pow(1.0 - over, 1.7) * beam;
        // And the haze at its foot is lit by it.
        col += vTone.rgb * 0.45 * exp(-up * vSize.y / 55.0) * lift;
        float breath = 0.88 + 0.12 * sin(t * 0.5 + vTone.a * 40.0);
        col *= smoothstep(0.0, 0.02, up) * breath * uHaze;
        // Light in the air fades into the haze; it does not turn into it.
        col *= exp(-length(vWorld - uCam) * uFogDensity * 0.3);
        gl_FragColor = vec4(col, 0.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.name = "sky_columns";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "sky_columns";
  // The vertex shader puts each where it stands.
  mesh.frustumCulled = false;
  mesh.visible = n > 0;
  scene.add(mesh);
  return {
    mesh,
    dispose() {
      scene.remove(mesh);
      quad.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
