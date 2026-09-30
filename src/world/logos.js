// src/world/logos.js: corpo row's logos.
//
// Each tower's crown carries its organisation's mark on its face to the
// boulevard (and on its face to the east, which the rooftop sees): the
// Experience section's own logos (src/assets/
// PreviousExperience), keyed to their dark-ground forms and packed into one
// atlas by scripts/optimize-world.mjs, drawn as lit signs in their own
// colours. The kit gives a slot per tower (logo_<slug>: a centre and the
// largest width and height the crown's face allows) and each mark is sized
// into it at its own shape. The card being read lights its tower's mark in
// full, a scanline sweeping down it as it comes on; the others idle low.
// One draw for all seven.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON } from "./glsl.js";
import { worldLogos } from "../data/world-assets.js";
import { towers as TOWERS } from "../data/world.js";

let pending = null;

export function preloadLogos() {
  if (!pending) {
    pending = new THREE.TextureLoader().loadAsync(worldLogos.url).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

const IDLE = 0.32;
const SWEEP_SECONDS = 0.6;

export async function createLogos(anchors, shared, { reflectLayer = 2, maxAnisotropy = 4 } = {}) {
  const source = await preloadLogos();
  const map = source.clone();
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const parts = [];
  const marks = [];
  for (const tower of TOWERS) {
    const slots = [`logo_${tower.slug}`, `logo_${tower.slug}_e`].map((name) => anchors.get(name)).filter(Boolean);
    const mark = worldLogos.marks[tower.slug];
    if (!slots.length || !mark) continue;
    for (const slot of slots) {
      const maxW = slot.extras?.w ?? 18;
      const maxH = slot.extras?.h ?? 13;
      const w = Math.min(maxW, maxH * mark.aspect);
      const h = w / mark.aspect;
      const g = new THREE.PlaneGeometry(w, h);
      g.applyQuaternion(slot.quaternion);
      g.translate(slot.position.x, slot.position.y, slot.position.z);
      const n = g.attributes.position.count;
      const [u, v, rw, rh] = mark.rect;
      const rect = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) rect.set([u, v, rw, rh], i * 4);
      g.setAttribute("aRect", new THREE.BufferAttribute(rect, 4));
      g.setAttribute("aMark", new THREE.BufferAttribute(new Float32Array(n).fill(marks.length), 1));
      parts.push(g);
    }
    marks.push({ slug: tower.slug, lit: IDLE, sweep: 1, on: false });
  }
  if (!parts.length) return { update() {}, dispose() { map.dispose(); } };
  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) parts.forEach((g) => g.dispose());

  const lits = new Float32Array(8).fill(IDLE);
  const sweeps = new Float32Array(8).fill(1);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uMap: { value: map }, uLit: { value: lits }, uSweep: { value: sweeps } },
    vertexShader: /* glsl */ `
      attribute vec4 aRect;
      attribute float aMark;
      uniform float uLit[8];
      uniform float uSweep[8];
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec2 vLocal;
      varying float vLit;
      varying float vSweep;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        // PlaneGeometry's v runs up; the atlas's runs down.
        vLocal = uv;
        vUv = aRect.xy + vec2(uv.x, 1.0 - uv.y) * aRect.zw;
        float lit = ${IDLE.toFixed(2)};
        float sweep = 1.0;
        for (int i = 0; i < 8; i++) if (abs(float(i) - aMark) < 0.5) { lit = uLit[i]; sweep = uSweep[i]; }
        vLit = lit;
        vSweep = sweep;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uMap;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec2 vLocal;
      varying float vLit;
      varying float vSweep;
      void main() {
        vec4 mark = texture2D(uMap, vUv);
        // Coming on: a scanline runs down the mark and it lights behind it.
        float front = 1.0 - vSweep;
        float swept = step(front, vLocal.y);
        float line = smoothstep(0.05, 0.0, abs(vLocal.y - front)) * step(vSweep, 0.999);
        float lit = mix(${IDLE.toFixed(2)}, vLit, swept);
        // A lit sign's grain: fine rows, faded where they would shimmer.
        float rows = vLocal.y * 90.0;
        float grain = mix(0.86 + 0.14 * sin(rows * 6.2832), 0.93, clamp(fwidth(rows) * 1.5, 0.0, 1.0));
        // Every mark lit to about the same brightness, so a dark blue one
        // (Philips) reads on the night as well as an orange one does: its
        // own hue, lifted.
        float lum = max(dot(mark.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-3);
        vec3 hue = mark.rgb * clamp(0.5 / lum, 1.0, 5.0);
        vec3 col = hue * mark.a * (0.25 + 2.6 * lit) * grain * (1.0 + 0.25 * uBass * lit);
        col += vec3(0.9, 0.95, 1.0) * line * 3.0 * mark.a;
        // The crown's dark glass round the mark.
        col += vec3(0.008, 0.009, 0.014) * (1.0 - mark.a);
        col = cityFog(col, vWorld, 1.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  material.name = "logos";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "logos";
  mesh.frustumCulled = false;
  mesh.layers.enable(reflectLayer);

  return {
    mesh,
    update(dt, activeSlugs) {
      const a = 1 - Math.exp(-dt * 5);
      marks.forEach((m, i) => {
        const on = activeSlugs.includes(m.slug);
        if (on && !m.on) m.sweep = 0;
        m.on = on;
        m.sweep = Math.min(1, m.sweep + dt / SWEEP_SECONDS);
        m.lit += ((on ? 1 : IDLE) - m.lit) * a;
        lits[i] = m.lit;
        sweeps[i] = m.sweep;
      });
    },
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
      map.dispose();
    },
  };
}
