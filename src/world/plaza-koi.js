// src/world/plaza-koi.js: the hologram koi over Corpo Plaza's hub.
//
// Two original generated koi (orange and gold, see the design README) turn a
// slow circle over the sunken hub, one high and one lower on the far side,
// so from any side of the square one of them is seen broadside. Each is two
// pictures crossed on its spine, the fish from the side and the fish from
// above; a picture seen edge on fades out, so a walker under it sees its
// back and a flying car beside it sees its flank. The body swims as the
// avenue's koi do (koi.js). Drawn additively with the hologram's scanlines.
// One draw each. Two of the page's own shots would have them in frame, the
// Work shot looking up at the board from the square's north side and the
// hero looking up the avenue past the square's towers: the fish fade out as
// the camera comes to either pose, so those frames are as they were. With
// reduced motion they hold still.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

const HUB = { x: 70, z: -234 };
// Each fish: its length, the circle's radius and height, where on the lap
// it is, and its tint.
const FISH = [
  { length: 36, radius: 11, y: 30, phase: 1.178, tint: [1.0, 1.0, 1.0] },
  { length: 26, radius: 13, y: 14.5, phase: -1.178, tint: [1.0, 0.86, 0.62] },
];
const LAP = 64;
const SEGMENTS = 28;
// The Work shot's camera and the hero's on a wide screen: no fish for a
// camera at either. The scene sets this screen's own (quiet()).
const WORK = [73, 13, -204];
const HERO = [0.6, 0.6, 10];

export function createPlazaKoi(scene, shared, { reduced = false, reflectLayer = 2 } = {}) {
  const loader = new THREE.TextureLoader();
  const maps = ["/scenes/world/koi-amber-side.webp", "/scenes/world/koi-amber-top.webp"].map((url) => {
    const map = loader.load(url, () => fish.forEach((f) => (f.mesh.visible = maps.every((m) => m.image))));
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  });
  const quiet = [new THREE.Vector3(...WORK), new THREE.Vector3(...HERO)];
  const fish = FISH.map((spec, i) => {
    const height = spec.length / 1.5;
    // Along x, head at +x (the pictures face right): the flank upright, and
    // the back laid flat through it. `side` says which picture a vertex is.
    const flank = new THREE.PlaneGeometry(spec.length, height, SEGMENTS, 1);
    const back = new THREE.PlaneGeometry(spec.length, height, SEGMENTS, 1).rotateX(-Math.PI / 2);
    const n = flank.attributes.position.count;
    const geometry = new THREE.BufferGeometry();
    for (const name of ["position", "normal", "uv"]) {
      const a = flank.attributes[name];
      const b = back.attributes[name];
      const arr = new Float32Array(a.array.length + b.array.length);
      arr.set(a.array);
      arr.set(b.array, a.array.length);
      geometry.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
    }
    const which = new Float32Array(n * 2);
    which.fill(1, n);
    geometry.setAttribute("which", new THREE.BufferAttribute(which, 1));
    const index = [...flank.index.array, ...Array.from(back.index.array, (v) => v + n)];
    geometry.setIndex(index);
    flank.dispose();
    back.dispose();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uSide: { value: maps[0] },
        uTop: { value: maps[1] },
        uPhase: { value: i * 2.3 },
        uSeed: { value: 3.1 + i * 1.7 },
        uMotion: { value: reduced ? 0 : 1 },
        uTint: { value: new THREE.Vector3(...spec.tint) },
        uWork: { value: quiet[0] },
        uHero: { value: quiet[1] },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPhase;
        uniform float uMotion;
        attribute float which;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying float vWhich;
        void main() {
          vUv = uv;
          vWhich = which;
          vec3 p = position;
          // 0 at the head, 1 at the tail.
          float tail = clamp(0.5 - p.x / ${spec.length.toFixed(1)}, 0.0, 1.0);
          float wave = sin(uTime * 1.9 * uMotion - tail * 5.0 + uPhase) * ${(spec.length * 0.11).toFixed(2)} * (0.06 + 0.94 * tail * tail);
          p.z += wave;
          vec4 w = modelMatrix * vec4(p, 1.0);
          vWorld = w.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uSide;
        uniform sampler2D uTop;
        uniform float uSeed;
        uniform float uMotion;
        uniform vec3 uTint;
        uniform vec3 uWork;
        uniform vec3 uHero;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying float vWhich;
        void main() {
          float t = uTime * uMotion;
          vec3 c = vWhich > 0.5 ? texture2D(uTop, vUv).rgb : texture2D(uSide, vUv).rgb;
          vec3 v = uCam - vWorld;
          float far = length(v);
          // A picture seen edge on is a line: it goes, and the other one shows.
          float facing = smoothstep(0.12, 0.5, abs(dot(normalize(vNormalW), v / far)));
          float scan = 0.82 + 0.18 * sin(vWorld.y * 9.0 - t * 5.0);
          float flicker = 0.9 + 0.1 * step(0.6, hash12(vec2(floor(t * 9.0), uSeed)));
          float near = smoothstep(6.0, 22.0, far);
          float work = smoothstep(5.0, 18.0, distance(uCam, uWork)) * smoothstep(5.0, 18.0, distance(uCam, uHero));
          vec3 col = c * c * uTint * 1.9 * facing * scan * flicker * near * work * (1.0 + 0.2 * uBass);
          col *= exp(-far * uFogDensity * 0.4);
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
    material.name = "plaza_koi";
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `plaza_koi_${i}`;
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.layers.enable(reflectLayer);
    scene.add(mesh);
    return { mesh, material, geometry, spec };
  });

  const place = () => {
    // The clock the city's shaders run on, so a still at a pinned time has
    // the fish where they were; held at one instant with reduced motion.
    const time = reduced ? 12 : shared.uTime.value;
    for (const { mesh, spec } of fish) {
      const a = (time / LAP) * Math.PI * 2 + spec.phase;
      mesh.position.set(HUB.x + spec.radius * Math.cos(a), spec.y + 0.9 * Math.sin(a * 2.0 + spec.phase), HUB.z - spec.radius * Math.sin(a));
      // Anticlockwise from above, head along the tangent (the picture's +x).
      mesh.rotation.set(0, a + Math.PI / 2, 0);
    }
  };
  place();

  return {
    fish,
    update: place,
    /** Where the Work shot's camera and the hero's stand on this screen. */
    quiet(work, hero) {
      quiet[0].copy(work);
      quiet[1].copy(hero);
    },
    dispose() {
      for (const f of fish) {
        scene.remove(f.mesh);
        f.material.dispose();
        f.geometry.dispose();
      }
      maps.forEach((m) => m.dispose());
    },
  };
}
