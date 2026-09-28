// src/world/moon.js: the moon over the Contact shot.
//
// A bookend. The intro opens on the moon: two figures on its surface with
// their backs to us, Earth rising. The page ends looking back up at one, and
// the disc carries that same picture (design/night-city-garage/textures/
// moon.jpg, the intro's moon still), cut round with a soft limb and a glow
// in the wet air around it. Only the Contact camera looks south-east, where
// it hangs, so it is a reveal and not a fixture.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { worldMoonUrl } from "../data/world-assets.js";

let pending = null;

export function preloadMoon() {
  if (!pending) {
    pending = new THREE.TextureLoader().loadAsync(worldMoonUrl).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

export async function dressMoon(mesh, shared, { reflectLayer = 2 } = {}) {
  const source = await preloadMoon();
  const map = source.clone();
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  const aspect = (source.image?.width || 16) / (source.image?.height || 9);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uMap: { value: map }, uAspect: { value: aspect }, uGain: { value: 1.25 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
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
      uniform float uAspect;
      uniform float uGain;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        // The picture, cover-fit into the disc.
        vec2 uv = vec2(0.5 + p.x * 0.5 / uAspect, 0.5 + p.y * 0.5);
        vec3 img = texture2D(uMap, uv).rgb;
        float disc = smoothstep(0.82, 0.78, r);
        float limb = smoothstep(0.62, 0.8, r) * disc;
        vec3 col = img * disc * (1.0 - 0.35 * limb) * uGain;
        col += vec3(0.75, 0.82, 1.0) * limb * 0.45;
        // The glow it throws into the haze.
        float glow = exp(-max(r - 0.8, 0.0) * 5.0) * (1.0 - disc) * smoothstep(1.0, 0.86, r);
        col += vec3(0.5, 0.55, 0.85) * glow * 0.35 * (1.0 + 0.2 * uLevel);
        col *= exp(-length(vWorld - uCam) * uFogDensity * 0.15);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.name = "moon";
  mesh.material = material;
  mesh.renderOrder = -5;
  mesh.layers.enable(reflectLayer);
  return {
    material,
    dispose() {
      material.dispose();
      map.dispose();
    },
  };
}
