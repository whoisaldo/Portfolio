// src/world/towers.js: corpo row's crowns.
//
// One tower per role in experience.js, in its order, and each tower's crown
// (crown_<slug> in the kit) lit in that organisation's own colour, the
// colour the Experience card already uses. The card being read lights its
// tower's crown in full; the rest idle low. The tower's name is a vertical
// sign in the atlas (src/world/signs.js). Nothing else: no logos, no floor
// counts, no tickers.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { towers as TOWERS } from "../data/world.js";

export function createTowers(meshes, shared, { reflectLayer = 2 } = {}) {
  const crowns = [];
  for (const mesh of meshes) {
    const slug = mesh.userData.tower || mesh.name.replace(/^crown_/, "");
    const tower = TOWERS.find((t) => t.slug === slug);
    if (!tower) continue;
    const material = new THREE.ShaderMaterial({
      uniforms: { ...shared, uColor: { value: new THREE.Color(tower.accent) }, uLit: { value: 0.3 } },
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
        uniform vec3 uColor;
        uniform float uLit;
        varying vec3 vWorld;
        varying vec2 vUv;
        void main() {
          // A band of light with a brighter rim, top and bottom.
          float rim = smoothstep(0.2, 0.0, vUv.y) + smoothstep(0.8, 1.0, vUv.y);
          float body = 0.35 + 0.65 * rim;
          vec3 col = uColor * body * (0.4 + 3.2 * uLit) * (1.0 + 0.3 * uBass * uLit);
          col = cityFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    material.name = "crown";
    mesh.material = material;
    mesh.layers.enable(reflectLayer);
    crowns.push({ slug, material, lit: 0.3 });
  }
  return {
    update(dt, activeSlugs) {
      const a = 1 - Math.exp(-dt * 5);
      for (const c of crowns) {
        const want = activeSlugs.includes(c.slug) ? 1 : 0.18;
        c.lit += (want - c.lit) * a;
        c.material.uniforms.uLit.value = c.lit;
      }
    },
    dispose() {
      crowns.forEach((c) => c.material.dispose());
    },
  };
}
