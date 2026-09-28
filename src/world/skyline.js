// src/world/skyline.js: the city past the kit, and the sky over it.
//
// Everything the Blender kit does not model is here: a few thousand towers
// on a jittered grid out to about a mile and a half, one InstancedMesh and
// one draw, lit by the same window shader as the kit's own facades (their
// window cells are worked out from world position in the vertex shader, and
// each tower's lit fraction, style and warmth from a hash of where it
// stands). The grid leaves the kit's footprint alone: the avenue and its
// canyon, the plaza, corpo row, the rooftop and the garage, and keeps low
// to the south-east, where the Contact shot's moon rises.
//
// The sky is a dome: near-black overhead, and near the horizon the lit
// city's glow hanging in wet air, violet rather than blue, because the
// light is the city's and not the moon's.
import * as THREE from "three";
import { COMMON, WINDOWS } from "./glsl.js";

// Rectangles (x0, z0, x1, z1) the far city stays out of.
const KEEP_OUT = [
  [-60, -740, 60, 80], // the avenue, its canyon and the intersection
  [0, -420, 540, -130], // plaza, corpo row, rooftop, garage
  [-70, 20, 70, 140], // behind the hero camera
];
// Where the moon rises for the Contact shot: towers stay low there, and
// near the garage they are not there at all.
const LOW = [420, -200, 1400, 1300];
const CLEAR = [440, -200, 760, 200];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createSkyline(scene, shared, { count = 2600 } = {}) {
  const r = rng(90210);
  const matrices = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const cell = 46;
  for (let gx = -900; gx < 1500 && matrices.length < count; gx += cell) {
    for (let gz = -1700; gz < 900 && matrices.length < count; gz += cell) {
      const x = gx + (r() - 0.5) * cell * 0.5;
      const z = gz + (r() - 0.5) * cell * 0.5;
      if (KEEP_OUT.some(([x0, z0, x1, z1]) => x > x0 - 20 && x < x1 + 20 && z > z0 - 20 && z < z1 + 20)) continue;
      if (x > CLEAR[0] && x < CLEAR[2] && z > CLEAR[1] && z < CLEAR[3]) continue;
      const d = Math.hypot(x - 200, z + 300);
      if (r() < 0.12) continue;
      const w = 16 + r() * 22;
      const dd = 16 + r() * 22;
      let h = 24 + Math.pow(r(), 2.2) * 150 + Math.min(80, d * 0.05);
      if (r() < 0.05) h += 90 + r() * 110;
      const [lx0, lz0, lx1, lz1] = LOW;
      if (x > lx0 && x < lx1 && z > lz0 && z < lz1) h = Math.min(h, 22 + r() * 30);
      p.set(x, h / 2, z);
      s.set(w, h, dd);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (r() - 0.5) * 0.3);
      matrices.push(m.compose(p, q, s).clone());
    }
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // No floors: nobody sees the underside of a tower.
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vCells;
      varying vec3 vParams;
      varying float vRoof;
      float hash11(float n) { return fract(sin(n) * 43758.5453123); }
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec3 n = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vRoof = step(0.5, n.y);
        // Window cells from world position on each face.
        float along = abs(n.x) > 0.5 ? w.z : w.x;
        vCells = vec2(along / 3.2, (w.y - 4.6) / 3.4);
        vec3 origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float seed = origin.x * 0.013 + origin.z * 0.071;
        vParams = vec3(0.08 + 0.42 * hash11(seed), hash11(seed + 1.7) * 0.625, hash11(seed + 3.1));
        vCells += vec2(hash11(seed + 5.0) * 40.0, 0.0);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${WINDOWS}
      varying vec3 vWorld;
      varying vec2 vCells;
      varying vec3 vParams;
      varying float vRoof;
      void main() {
        vec4 win = windows(vCells, vParams, vWorld, step(0.0, vCells.y));
        vec3 col = mix(win.rgb, vec3(0.012, 0.012, 0.016), vRoof);
        col = cityFog(col, vWorld, win.a * 0.8 * (1.0 - vRoof));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "skyline";
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = "skyline";
  scene.add(mesh);

  // The dome.
  const skyGeo = new THREE.SphereGeometry(2200, 32, 16);
  const sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 w = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * w;
        gl_Position.z = gl_Position.w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vDir;
      void main() {
        float h = max(vDir.y, 0.0);
        vec3 glow = uHazeColor * (0.55 + 0.25 * uLevel) * exp(-h * 9.0) * uHaze;
        vec3 col = vec3(0.004, 0.004, 0.007) + glow + uHazeColor * 0.08 * exp(-h * 2.5);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  }));
  sky.material.name = "sky";
  sky.name = "sky";
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  return {
    mesh,
    sky,
    update(camera) {
      sky.position.copy(camera.position);
    },
    dispose() {
      scene.remove(mesh, sky);
      geometry.dispose();
      material.dispose();
      skyGeo.dispose();
      sky.material.dispose();
      mesh.dispose();
    },
  };
}
