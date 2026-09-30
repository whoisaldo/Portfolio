// src/world/towers.js: corpo row's accent light.
//
// One tower per role in experience.js, in its order, and each tower's light
// (crown_<slug> in the kit: a fin up each corner, a ring at the step, a band
// round the crown) in that organisation's own colour, the colour the
// Experience card already uses. The card being read lights its tower in
// full, with light running up the fins; the rest idle low. The tower's logo
// is src/world/logos.js, its name a vertical sign in the atlas
// (src/world/signs.js). No floor counts, no tickers.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON } from "./glsl.js";
import { toFloat } from "./merge.js";
import { towers as TOWERS } from "../data/world.js";

export function createTowers(meshes, shared, { reflectLayer = 2 } = {}) {
  // One mesh for all seven crowns, one draw: each vertex carries its
  // tower's index and colour, and the lit levels are a uniform array.
  const crowns = [];
  const parts = [];
  const parent = meshes[0]?.parent ?? null;
  for (const mesh of meshes) {
    const slug = mesh.userData.tower || mesh.name.replace(/^crown_/, "");
    const tower = TOWERS.find((t) => t.slug === slug);
    if (!tower) continue;
    const i = crowns.length;
    crowns.push({ slug, lit: 0.3 });
    mesh.updateWorldMatrix(true, false);
    const g = toFloat(mesh.geometry, ["position", "uv"]);
    g.applyMatrix4(mesh.matrixWorld);
    const n = g.attributes.position.count;
    const color = new THREE.Color(tower.accent);
    const aColor = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) color.toArray(aColor, v * 3);
    g.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));
    g.setAttribute("aTower", new THREE.BufferAttribute(new Float32Array(n).fill(i), 1));
    parts.push(g);
    mesh.removeFromParent();
  }
  if (!parts.length) return { update() {}, dispose() {} };
  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) parts.forEach((g) => g.dispose());
  const lits = new Float32Array(8).fill(0.3);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uLit: { value: lits } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aTower;
      uniform float uLit[8];
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vLit;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vUv = uv;
        vColor = aColor;
        // WebGL1-safe: an array read by a loop index rather than a varying.
        float lit = 0.3;
        for (int i = 0; i < 8; i++) if (abs(float(i) - aTower) < 0.5) lit = uLit[i];
        vLit = lit;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vLit;
      void main() {
        vec3 col;
        if (vUv.x > 1.5) {
          // A fin: a line of light up the corner, and while its card is read,
          // light running up it.
          float run = fract(vWorld.y * 0.012 - uTime * 0.45);
          float pulse = smoothstep(0.0, 0.06, run) * smoothstep(0.3, 0.06, run);
          col = vColor * (0.35 + 2.2 * vLit) * (1.0 + 2.5 * pulse * vLit);
        } else {
          // A band of light with a brighter rim, top and bottom.
          float rim = smoothstep(0.2, 0.0, vUv.y) + smoothstep(0.8, 1.0, vUv.y);
          float body = 0.35 + 0.65 * rim;
          col = vColor * body * (0.4 + 3.2 * vLit);
        }
        col *= 1.0 + 0.3 * uBass * vLit;
        col = cityFog(col, vWorld, 1.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "crown";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "crowns";
  mesh.layers.enable(reflectLayer);
  if (parent) {
    // The geometry is in world space; undo the parent's placement.
    parent.updateWorldMatrix(true, false);
    mesh.matrix.copy(parent.matrixWorld).invert();
    mesh.matrixAutoUpdate = false;
    parent.add(mesh);
  }
  return {
    mesh,
    update(dt, activeSlugs) {
      const a = 1 - Math.exp(-dt * 5);
      crowns.forEach((c, i) => {
        const want = activeSlugs.includes(c.slug) ? 1 : 0.18;
        c.lit += (want - c.lit) * a;
        lits[i] = c.lit;
      });
    },
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
