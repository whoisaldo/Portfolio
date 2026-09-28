// src/world/koi.js: two holographic koi over the avenue.
//
// A pair of original generated koi (magenta and cyan, see the design
// README), each an image on a strip of quads, one chasing the other round a
// slow figure of eight a few metres over the wet road just past the two big
// screens, so the road carries them too. The body swims: a wave runs from
// head to tail in the vertex shader, growing toward the tail, and each fish
// turns to face where it is going. Drawn additively, so the black round them
// is air, with the hologram's scanlines and a flicker; they fade as the
// camera closes on them. One draw each, and never with reduced motion (they
// hold still, mid-turn).
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { worldKoiUrl } from "../data/world-assets.js";

// The loop: its centre, its half-width across the avenue and half-depth up
// it, its height and how much that rises and falls, and a lap's seconds.
const LOOP = { x: 0.6, z: -40, halfX: 7, halfZ: 12, y: 6.8, bob: 1.4, lap: 26 };
const LENGTH = 11;
const SEGMENTS = 24;

let pending = null;

export function preloadKoi() {
  if (!pending) {
    const loader = new THREE.TextureLoader();
    pending = Promise.all(worldKoiUrl.map((url) => loader.loadAsync(url))).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

/** A point on the figure of eight at phase `a` (radians). */
function loopAt(a, out) {
  return out.set(
    LOOP.x + LOOP.halfX * Math.sin(a),
    LOOP.y + LOOP.bob * Math.sin(a * 1.5 + 0.8),
    LOOP.z + LOOP.halfZ * Math.sin(a) * Math.cos(a),
  );
}

export async function createKoi(scene, shared, { reduced = false, reflectLayer = 2 } = {}) {
  const sources = await preloadKoi();
  const height = LENGTH / 1.5;
  // Along x, head at +x (the images face right), subdivided for the wave.
  const geometry = new THREE.PlaneGeometry(LENGTH, height, SEGMENTS, 1);
  const fish = sources.map((source, i) => {
    const map = source.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
    const material = new THREE.ShaderMaterial({
      uniforms: { ...shared, uMap: { value: map }, uPhase: { value: 0 }, uSeed: { value: i * 1.7 }, uMotion: { value: reduced ? 0 : 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPhase;
        uniform float uMotion;
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec3 p = position;
          // 0 at the head, 1 at the tail.
          float tail = clamp(0.5 - p.x / ${LENGTH.toFixed(1)}, 0.0, 1.0);
          float wave = sin(uTime * 5.2 * uMotion - tail * 5.5 + uPhase) * (0.08 + 0.9 * tail * tail);
          // Across the body, as a fish swims, and a little in the picture's
          // own plane, so a fish seen side on still reads as swimming.
          p.z += wave;
          p.y += wave * 0.28;
          vec4 w = modelMatrix * vec4(p, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uMap;
        uniform float uSeed;
        uniform float uMotion;
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          float t = uTime * uMotion;
          vec3 c = texture2D(uMap, vUv).rgb;
          float scan = 0.78 + 0.22 * sin(vUv.y * 180.0 - t * 7.0);
          float flicker = 0.88 + 0.12 * step(0.55, hash12(vec2(floor(t * 11.0), uSeed)));
          float near = smoothstep(4.0, 14.0, length(vWorld - uCam));
          vec3 col = c * c * 2.4 * scan * flicker * near * (1.0 + 0.3 * uBass);
          col *= exp(-length(vWorld - uCam) * uFogDensity * 0.4);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    material.name = "koi";
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `koi_${i}`;
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    mesh.layers.enable(reflectLayer);
    scene.add(mesh);
    return { mesh, material, map };
  });

  const here = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  let clock = 2.1;
  const place = () => {
    fish.forEach(({ mesh, material }, i) => {
      // The second chases the first, a tenth of a lap behind.
      const a = (clock / LOOP.lap - i * 0.1) * Math.PI * 2;
      loopAt(a, here);
      loopAt(a + 0.05, ahead);
      mesh.position.copy(here);
      // Face along the path: the image's +x is the head.
      mesh.rotation.set(0, Math.atan2(-(ahead.z - here.z), ahead.x - here.x), 0);
      material.uniforms.uPhase.value = i * 2.3;
    });
  };
  place();

  return {
    fish,
    update(dt) {
      if (!reduced) clock += dt;
      place();
    },
    dispose() {
      for (const f of fish) {
        scene.remove(f.mesh);
        f.material.dispose();
        f.map.dispose();
      }
      geometry.dispose();
    },
  };
}
