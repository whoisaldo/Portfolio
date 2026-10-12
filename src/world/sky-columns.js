// src/world/sky-columns.js: the hologram columns over the far city.
//
// The show stands columns of advertising in the sky over its skyline, the
// tallest things in it: translucent, edged in cyan, each a stack of dozens
// of adverts, with a soft beam going on up out of its top into the cloud.
// Each is one quad that turns about its own axis to face the lens, drawn
// additively (light, not paint, so the city shows through it): the lower
// three quarters a stack of the city's own adverts (the kit's atlas, rows
// of two tall ones and rows of one wide one, each changing now and then, a
// few dark), hairlines of the column's colour between them and down both
// edges, scan lines drifting up, and over the stack the beam, thickest
// through its middle like a lit cylinder of air and gone by its top. One
// instanced draw for all of them. Where they stand is the far city's to say
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
  // What a board shows, by its own seed: three in five one of the adverts;
  // the rest a plain screen (a field of one colour over another, a bar,
  // lines of type), a logo (a disc, a ring, a hexagon or a diamond of
  // light on a dark board, a bar under it) or lettering (characters a
  // storey high, dark on light or light on dark). Nobody's name on any.
  vec3 boardFace(vec2 st, float aspect, float pick, float seed) {
    float kind = hash12(vec2(seed, 61.7));
    if (kind < 0.6) return advert(st, aspect, pick);
    float hc = hash12(vec2(seed, 63.9));
    vec3 a = hc < 0.3 ? vec3(0.1, 0.85, 1.0) : hc < 0.52 ? vec3(1.0, 0.72, 0.16) : hc < 0.7 ? vec3(1.0, 0.16, 0.5) : hc < 0.85 ? vec3(0.92, 0.95, 1.0) : vec3(0.3, 1.0, 0.6);
    vec3 b = hc < 0.5 ? vec3(0.03, 0.05, 0.16) : vec3(0.1, 0.02, 0.07);
    if (kind < 0.74) {
      float low = step(st.y, 0.38 + 0.2 * hash12(vec2(seed, 65.1)));
      vec3 col = mix(a * 0.75, b, low);
      float type = step(0.5, fract(st.y * 9.0)) * step(st.y, 0.3) * step(0.08, st.x) * step(st.x, 0.3 + 0.6 * hash12(vec2(floor(st.y * 9.0), seed)));
      col = mix(col, a, type * low);
      return mix(col, vec3(1.0), 0.8 * step(abs(st.y - 0.72), 0.035) * step(0.1, st.x) * step(st.x, 0.9));
    }
    if (kind < 0.87) {
      vec2 p = vec2((st.x - 0.5) * aspect, st.y - 0.56) / (0.3 * min(aspect, 1.0));
      vec2 q = abs(p);
      float m = hash12(vec2(seed, 67.3));
      float hex = max(q.x * 0.866 + q.y * 0.5, q.y);
      float shape = m < 0.3 ? step(length(p), 1.0) : m < 0.55 ? step(abs(length(p) - 0.8), 0.2) + step(length(p), 0.3) : m < 0.8 ? step(hex, 0.95) * (1.0 - step(hex, 0.62)) + step(q.y, 0.1) * step(q.x, 0.4) : step(q.x + q.y, 1.0) * step(0.5, q.x + q.y);
      float bar = step(abs(st.y - 0.14), 0.035) * step(abs(st.x - 0.5), 0.22);
      return mix(b * 0.5, a * 1.1, clamp(shape + bar, 0.0, 1.0));
    }
    vec2 n = aspect >= 1.0 ? vec2(clamp(floor(aspect * 1.6 + 0.5), 2.0, 6.0), 1.0) : vec2(1.0, clamp(floor(1.6 / aspect + 0.5), 2.0, 6.0));
    vec2 f = fract(st * n);
    vec2 id = floor(st * n);
    float k = kanji(vec2((f.x - 0.16) / 0.68, (f.y - 0.14) / 0.72), hash12(id + seed), hash12(id + seed + 3.0)) * step(0.16, f.x) * step(f.x, 0.84) * step(0.14, f.y) * step(f.y, 0.86);
    return hash12(vec2(seed, 69.5)) < 0.5 ? mix(a * 0.85, b * 0.3, k) : mix(b * 0.6, a * 1.2, k);
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
        // The stack: rows three quarters of the column's width high, up to
        // 0.72 of its height. A row is two tall adverts or one wide one.
        const float STACK = 0.72;
        float rowH = vSize.x * 0.75;
        float rows = floor(vSize.y * STACK / rowH);
        float gy = up * vSize.y / rowH;
        float row = floor(gy);
        float wide = step(0.5, hash12(vec2(row, vTone.a * 77.0)));
        float gx = wide > 0.5 ? vUv.x : vUv.x * 2.0;
        vec2 id = vec2(floor(gx), row);
        vec2 f = vec2(fract(gx), fract(gy));
        float h = hash12(id + vTone.a * 91.0);
        float slot = floor(t / (9.0 + 8.0 * h) + h * 7.0);
        // (Down a column no advert comes twice before all have been.)
        float pick = mod(floor(vTone.a * 24.0) + (row * 2.0 + id.x) * 7.0 + slot * 5.0, 24.0);
        float on = step(0.14, hash12(id * 1.3 + slot + vTone.a * 5.0));
        vec2 m = wide > 0.5 ? vec2(0.03, 0.04) : vec2(0.06, 0.04);
        float inset = step(m.x, f.x) * step(f.x, 1.0 - m.x) * step(m.y, f.y) * step(f.y, 1.0 - m.y);
        float inStack = step(row, rows - 0.5);
        vec3 drawn = advert((f - m) / (1.0 - 2.0 * m), wide > 0.5 ? 1.3333 : 0.6667, pick);
        vec3 plain = mix(vTone.rgb, vec3(1.0, 0.3, 0.7), step(0.6, h)) * (0.3 + 0.4 * f.y);
        // A hologram's advert is light of the column's own colour as much
        // as it is the picture's.
        vec3 art = mix(plain, mix(drawn, vTone.rgb * dot(drawn, vec3(0.35, 0.5, 0.15)) * 1.5, 0.5), uHasAds);
        float lines = up * vSize.y * 1.4 - t * 2.4;
        float scan = mix(0.84 + 0.16 * sin(lines * 6.2832), 0.84, clamp(fwidth(lines) * 2.0, 0.0, 1.0));
        vec3 col = art * mix(0.55, 0.8, lift) * inset * on * inStack * scan;
        // Its own light: a hairline round every advert, a glow down both
        // edges, a faint body behind the stack, and over the stack the beam.
        float body = sqrt(max(1.0 - across * across, 0.0));
        float edge = smoothstep(0.82, 0.98, across);
        float over = clamp((up - STACK) / (1.0 - STACK), 0.0, 1.0);
        float beam = 1.0 - inStack;
        // (Its edges burn white-blue, the brightest lines in the sky.)
        vec3 rim = mix(vTone.rgb * 1.1, mix(vTone.rgb, vec3(0.82, 0.93, 1.0), 0.6) * 2.2, lift);
        col += vTone.rgb * ((1.0 - inset) * 0.26 + body * 0.06) * inStack + rim * edge * inStack;
        col += (vTone.rgb * (body * 0.34 + smoothstep(0.3, 0.0, across) * 0.3) + rim * edge * 0.45) * pow(1.0 - over, 1.7) * beam;
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
