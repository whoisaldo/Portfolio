// src/world/holo.js: the holographic figure at the end of the avenue.
//
// The plate's giant violet woman, as an original generated image
// (design/night-city-world/README.md) on the kit's holo_figure plane, drawn
// additively so black is air. What makes it a hologram rather than a
// billboard is all in the shader: scanlines that crawl, a band of dropout
// that sweeps up her every few seconds, a faint vertical seam, a flicker,
// and a breath on the kick while the track plays.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { worldHoloUrl } from "../data/world-assets.js";

let pending = null;

export function preloadHolo() {
  if (!pending) {
    pending = new THREE.TextureLoader().loadAsync(worldHoloUrl).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

export async function dressHolo(mesh, shared, { reduced = false } = {}) {
  const source = await preloadHolo();
  const map = source.clone();
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uMap: { value: map }, uGain: { value: 1.7 }, uMotion: { value: reduced ? 0 : 1 } },
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
      uniform float uGain;
      uniform float uMotion;
      varying vec3 vWorld;
      varying vec2 vUv;
      void main() {
        float t = uTime * uMotion;
        vec2 uv = vUv;
        // A band of dropout sweeping up the figure every few seconds, with
        // its slice slipping sideways.
        float sweep = fract(t * 0.13);
        float band = smoothstep(0.035, 0.0, abs((1.0 - uv.y) - sweep));
        uv.x += band * 0.012 * sin(t * 40.0);
        vec3 c = texture2D(uMap, uv).rgb;
        float scan = 0.72 + 0.28 * sin((uv.y * 520.0) - t * 6.0);
        float flicker = 0.9 + 0.1 * step(0.6, hash12(vec2(floor(t * 9.0), 3.0)));
        float gain = uGain * scan * flicker * (1.0 - 0.55 * band) * (1.0 + 0.35 * uBass);
        vec3 col = c * c * gain;
        // Additive light fades into the haze; it does not turn into it.
        col *= exp(-length(vWorld - uCam) * uFogDensity * 0.4);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.name = "holo";
  mesh.material = material;
  mesh.renderOrder = 2;
  return {
    material,
    dispose() {
      material.dispose();
      map.dispose();
    },
  };
}
