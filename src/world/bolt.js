// src/world/bolt.js: the lightning itself.
//
// The storm (world-scene.js) lights the cloud from inside now and then. With
// this, the strike is seen as well: a bolt comes down out of the deck where
// the cloud lit, a kilometre or so off, a jagged channel to the ground with a
// few forks off it, white with a violet glow. It is there only for the
// flash's own pulses, a tenth of a second or two (so it keeps the flash's
// limits: one or two pulses, well under three a second, and never with
// reduced motion, which has no storm), behind whatever stands in front of
// it, and fainter into the haze the further off it is. Every strike is a new
// shape. One draw, a few hundred vertices, built when it strikes.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

// Points, all channels together.
const MAX = 320;
// Where it leaves the cloud (the sky's deck is at 520 m, skyline.js).
const TOP = 545;

/** A jagged line from a to b: its middle pushed aside, then each half's,
 *  `depth` times over, by less each time. */
function channel(a, b, depth, rough) {
  let pts = [a, b];
  let amp = a.distanceTo(b) * rough;
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const m = pts[i - 1].clone().lerp(pts[i], 0.4 + Math.random() * 0.2);
      m.x += (Math.random() - 0.5) * amp;
      m.z += (Math.random() - 0.5) * amp;
      m.y += (Math.random() - 0.5) * amp * 0.25;
      next.push(m, pts[i]);
    }
    pts = next;
    amp *= 0.56;
  }
  return pts;
}

export function createBolt(scene, shared) {
  const position = new Float32Array(MAX * 2 * 3);
  const tangent = new Float32Array(MAX * 2 * 3);
  const side = new Float32Array(MAX * 2);
  const width = new Float32Array(MAX * 2);
  const glow = new Float32Array(MAX * 2);
  const index = new Uint16Array((MAX - 1) * 6);
  const geometry = new THREE.BufferGeometry();
  const attrs = {
    position: new THREE.BufferAttribute(position, 3),
    aTangent: new THREE.BufferAttribute(tangent, 3),
    aSide: new THREE.BufferAttribute(side, 1),
    aWidth: new THREE.BufferAttribute(width, 1),
    aK: new THREE.BufferAttribute(glow, 1),
  };
  for (const [name, a] of Object.entries(attrs)) geometry.setAttribute(name, a.setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(new THREE.BufferAttribute(index, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0, 0);

  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      ${COMMON}
      attribute vec3 aTangent;
      attribute float aSide;
      attribute float aWidth;
      attribute float aK;
      varying float vU;
      varying float vK;
      varying vec3 vWorld;
      void main() {
        // A ribbon along the channel, turned to face the lens.
        vec3 toCam = normalize(uCam - position);
        vec3 across = normalize(cross(aTangent, toCam) + vec3(1e-5, 0.0, 0.0));
        vec3 p = position + across * aSide * aWidth;
        vU = aSide;
        // Out of the cloud's underside rather than from a line in the sky.
        vK = aK * (1.0 - smoothstep(${TOP - 75}.0, ${TOP - 10}.0, position.y));
        vWorld = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying float vU;
      varying float vK;
      varying vec3 vWorld;
      void main() {
        // A white-hot hair down the middle, a tenth of the ribbon, in a
        // violet glow that fades out to its edges.
        float u = abs(vU);
        float core = exp(-u * u / 0.0081);
        float halo = exp(-u * 4.0) * (1.0 - u) * 0.16;
        vec3 col = vec3(0.88, 0.86, 1.0) * core * 7.0 + vec3(0.55, 0.48, 1.0) * halo;
        // Into the haze with distance, as a light is (cityFog's emissive
        // rate), but only ever dimmer: this is added to the picture.
        float f = 1.0 - exp(-length(vWorld - uCam) * uFogDensity * 0.45);
        gl_FragColor = vec4(col * vK * uFlash * (1.0 - f), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.name = "bolt";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.name = "bolt";
  // Shown with nothing to draw until the first frame, so the warm-up
  // compiles it and the first strike does not wait on a shader.
  scene.add(mesh);

  const _t = new THREE.Vector3();
  let points = 0;
  let tris = 0;
  // One channel as a strip: two vertices a point, along its own tangent,
  // `w` metres to each side, as bright as k0 at its start and k1 at its end.
  const strip = (pts, w, k0, k1) => {
    if (points + pts.length > MAX) return;
    const base = points * 2;
    for (let i = 0; i < pts.length; i++) {
      _t.subVectors(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      const k = k0 + (k1 - k0) * (i / (pts.length - 1));
      for (let s = 0; s < 2; s++) {
        const v = (points + i) * 2 + s;
        pts[i].toArray(position, v * 3);
        _t.toArray(tangent, v * 3);
        side[v] = s ? 1 : -1;
        width[v] = w;
        glow[v] = k;
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = base + i * 2;
      index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], tris * 3);
      tris += 2;
    }
    points += pts.length;
  };

  return {
    mesh,
    /** A strike at (x, z) on the ground: a new bolt there. */
    strike(x, z) {
      points = 0;
      tris = 0;
      const top = new THREE.Vector3(x, TOP, z);
      const foot = new THREE.Vector3(x + (Math.random() - 0.5) * 220, 0, z + (Math.random() - 0.5) * 220);
      const main = channel(top, foot, 6, 0.2);
      strip(main, 15, 1, 0.85);
      // Forks off the upper part, down and away, dimmer as they go.
      const forks = 2 + Math.floor(Math.random() * 3);
      for (let f = 0; f < forks; f++) {
        const from = main[Math.floor(main.length * (0.12 + Math.random() * 0.5))];
        const len = 70 + Math.random() * 180;
        const a = Math.random() * Math.PI * 2;
        const to = from.clone().add(new THREE.Vector3(Math.cos(a) * len * 0.8, -len * (0.5 + Math.random() * 0.5), Math.sin(a) * len * 0.8));
        to.y = Math.max(to.y, 0);
        strip(channel(from, to, 4, 0.24), 7, 0.5 + Math.random() * 0.2, 0);
      }
      for (const a of Object.values(attrs)) a.needsUpdate = true;
      geometry.index.needsUpdate = true;
      geometry.setDrawRange(0, tris * 3);
    },
    /** Shown while the flash is. */
    update() {
      mesh.visible = points > 0 && shared.uFlash.value > 0.002;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
