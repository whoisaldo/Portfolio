// src/world/sky-columns.js: the hologram columns over the far city.
//
// The show stands tall, translucent columns of cyan light in the sky behind
// its skyline, even by day: a city that advertises upward. Each is one
// quad that turns about its own axis to face the lens, drawn additively:
// thickest through its middle like a lit cylinder of air, bright at its
// foot and gone by its top, with a hologram's scan lines drifting up it and
// a slow breath. One instanced draw for all of them. Where they stand is
// the far city's to say (src/world/skyline.js): never up the hero's avenue,
// never under Contact's moon.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

const TONES = ["#3fe4ff", "#3fe4ff", "#52ffd0", "#3fe4ff", "#ff4fd0"];

/** `columns` is x, z, width, height, tone (an index into the tones) and a
 *  seed, six numbers a column. */
export function createSkyColumns(scene, shared, columns, { reduced = false } = {}) {
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
    uniforms: { ...shared, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      uniform vec3 uCam;
      attribute vec4 aPlace;
      attribute vec4 aTone;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec4 vTone;
      void main() {
        vec2 to = normalize(uCam.xz - aPlace.xy + 1e-4);
        vec3 w = vec3(aPlace.x + to.y * position.x * aPlace.z, position.y * aPlace.w, aPlace.y - to.x * position.x * aPlace.z);
        vUv = uv;
        vWorld = w;
        vTone = aTone;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uMotion;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec4 vTone;
      void main() {
        float t = uTime * uMotion;
        float across = abs(vUv.x - 0.5) * 2.0;
        // A cylinder of lit air: the eye looks through most of it at its
        // middle and none at its edge; a brighter core up its axis.
        float body = sqrt(max(1.0 - across * across, 0.0));
        float core = smoothstep(0.3, 0.0, across);
        float up = vUv.y;
        float fade = smoothstep(0.0, 0.03, up) * pow(1.0 - up, 1.4);
        // Scan lines drifting up it, only while they are wider than a pixel.
        float lines = up * 70.0 - t * 0.9 + vTone.a * 20.0;
        float scan = mix(0.78 + 0.22 * sin(lines * 6.2832), 0.78, clamp(fwidth(lines) * 2.0, 0.0, 1.0));
        float breath = 0.85 + 0.15 * sin(t * 0.5 + vTone.a * 40.0);
        float a = (body * 0.42 + core * 0.5) * fade * scan * breath;
        vec3 col = vTone.rgb * a * uHaze;
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
