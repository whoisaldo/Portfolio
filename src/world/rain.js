// src/world/rain.js: rain, in one draw.
//
// A few thousand thin streaks (6,000 on desktop, 2,000 on a phone) in a
// box that travels with the camera, each falling on its own phase and
// wrapping when it leaves, so the rain is always around the lens and never
// runs out. The positions live on the GPU: the frame loop only moves the
// box and the clock. Each streak takes the colour of the city's light where
// it is (the same spill map every surface reads), so rain under a pink sign
// falls pink. The `wet` switch in env.js stops it with the reflections.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

const BOX = new THREE.Vector3(70, 34, 90);

export function createRain(scene, shared, { count = 6000, reduced = false } = {}) {
  const base = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.attributes.position);
  geometry.setAttribute("uv", base.attributes.uv);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seeds[i * 4] = Math.random();
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.random();
    seeds[i * 4 + 3] = 0.7 + Math.random() * 0.6;
  }
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uBox: { value: BOX.clone() },
      uOrigin: { value: new THREE.Vector3() },
      uFall: { value: 0 },
      uWind: { value: new THREE.Vector2(-1.4, 0.6) },
      uOpacity: { value: 1 },
      // A box it does not rain in (the garage, from inside). Empty by default.
      uShelterMin: { value: new THREE.Vector3(1, 1, 1) },
      uShelterMax: { value: new THREE.Vector3(0, 0, 0) },
      uViewHeight: { value: 900 },
    },
    vertexShader: /* glsl */ `
      ${COMMON}
      attribute vec4 aSeed;
      uniform vec3 uBox;
      uniform vec3 uOrigin;
      uniform float uFall;
      uniform vec2 uWind;
      uniform vec3 uShelterMin;
      uniform vec3 uShelterMax;
      uniform float uViewHeight;
      varying float vA;
      varying vec3 vCol;
      varying vec2 vUv;
      void main() {
        float speed = 11.0 * aSeed.w;
        // Wrap each drop inside a box that follows the camera.
        vec3 p = vec3(aSeed.x, aSeed.y, aSeed.z) * uBox;
        p.y -= uFall * speed;
        p.xz += uWind * uFall * aSeed.w;
        p = mod(p - uOrigin + uBox * 0.5, uBox) - uBox * 0.5 + uOrigin;
        // A streak along the fall, a hair wide, facing the camera, as long
        // as a cinema shutter sees a drop fall. Never thinner than about a
        // pixel on screen (a thinner one sparkles as it crosses pixels):
        // widened to that, and fainter for it.
        vec3 vel = normalize(vec3(uWind.x, -speed, uWind.y));
        vec3 toCam = normalize(uCam - p);
        vec3 side = normalize(cross(vel, toCam));
        float len = 0.28 + 0.3 * aSeed.w;
        float dist0 = max(length(uCam - p), 0.1);
        float pixel = dist0 * 2.0 / (projectionMatrix[1][1] * uViewHeight);
        float width = max(0.012, pixel * 1.1);
        vec3 wp = p + side * position.x * width + vel * position.y * len;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        vA = smoothstep(0.5, 3.0, dist) * (1.0 - smoothstep(24.0, 44.0, dist)) * (0.012 / width + 0.25) / 1.25;
        vec3 inside = step(uShelterMin, p) * step(p, uShelterMax);
        vA *= 1.0 - inside.x * inside.y * inside.z;
        // The light it falls through: the city's haze, the street's light
        // under it, and the lamps round it.
        vCol = vec3(0.07, 0.07, 0.09) + uHazeColor * 0.25 + spillAt(p) * 1.7 + lampsAt(p, toCam) * 2.0;
        vUv = uv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vA;
      varying vec3 vCol;
      varying vec2 vUv;
      void main() {
        float fade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
        gl_FragColor = vec4(vCol * vA * fade * 0.5 * uOpacity, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.name = "rain";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  mesh.name = "rain";
  scene.add(mesh);

  let fall = 0;
  return {
    mesh,
    update(dt, camera, on) {
      mesh.visible = on;
      if (!on) return;
      if (!reduced) fall += dt;
      material.uniforms.uFall.value = fall;
      material.uniforms.uOrigin.value.copy(camera.position);
    },
    /** The drawing buffer's height in pixels, for the streaks' width. */
    setViewHeight(h) {
      material.uniforms.uViewHeight.value = h;
    },
    /** Keep the rain out of a box (min, max: Vector3). */
    setShelter(min, max) {
      material.uniforms.uShelterMin.value.copy(min);
      material.uniforms.uShelterMax.value.copy(max);
    },
    setCount(n) {
      geometry.instanceCount = Math.min(count, n);
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      base.dispose();
      material.dispose();
    },
  };
}
