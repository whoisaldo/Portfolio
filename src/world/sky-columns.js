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

const TONES = ["#3fe4ff", "#3fe4ff", "#52ffd0", "#3fe4ff", "#ff4fd0"];

// One of the city's twelve adverts (public/scenes/world/ads.webp, laid out
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
    float rowH = 341.0 / 1024.0;
    float i = mod(pick, 8.0);
    vec2 q = tall ? vec2((mod(pick, 4.0) + st.y) * 0.25, (1.0 - st.x) * rowH) : vec2((mod(i, 4.0) + st.x) * 0.25, 1.0 - (floor(i / 4.0) + 1.0 - st.y) * rowH);
    return texture2D(uAds, q).rgb;
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
        vec3 w = vec3(aPlace.x + to.y * position.x * aPlace.z, position.y * aPlace.w, aPlace.y - to.x * position.x * aPlace.z);
        vUv = uv;
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
        float pick = floor(hash12(id + slot * 1.7 + vTone.a * 13.0) * 12.0);
        float on = step(0.14, hash12(id * 1.3 + slot + vTone.a * 5.0));
        vec2 m = wide > 0.5 ? vec2(0.03, 0.04) : vec2(0.06, 0.04);
        float inset = step(m.x, f.x) * step(f.x, 1.0 - m.x) * step(m.y, f.y) * step(f.y, 1.0 - m.y);
        float inStack = step(row, rows - 0.5);
        vec3 drawn = advert((f - m) / (1.0 - 2.0 * m), wide > 0.5 ? 1.3333 : 0.6667, pick);
        vec3 plain = mix(vTone.rgb, vec3(1.0, 0.3, 0.7), step(0.6, h)) * (0.3 + 0.4 * f.y);
        vec3 art = mix(plain, drawn, uHasAds);
        float lines = up * vSize.y * 1.4 - t * 2.4;
        float scan = mix(0.84 + 0.16 * sin(lines * 6.2832), 0.84, clamp(fwidth(lines) * 2.0, 0.0, 1.0));
        vec3 col = art * 0.8 * inset * on * inStack * scan;
        // Its own light: a hairline round every advert, a glow down both
        // edges, a faint body behind the stack, and over the stack the beam.
        float body = sqrt(max(1.0 - across * across, 0.0));
        float edge = smoothstep(0.82, 0.98, across);
        float over = clamp((up - STACK) / (1.0 - STACK), 0.0, 1.0);
        float beam = 1.0 - inStack;
        col += vTone.rgb * ((1.0 - inset) * 0.22 + edge * 0.85 + body * 0.05) * inStack;
        col += vTone.rgb * (body * 0.34 + smoothstep(0.3, 0.0, across) * 0.3 + edge * 0.5) * pow(1.0 - over, 1.7) * beam;
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
