// src/world/moon.js: the moon over the Contact shot.
//
// A bookend. The intro opens on a moon built of voxels, two figures on its
// surface with their backs to us and Earth rising. The page ends looking
// back up at one from the city: the same moon, a pale disc of square cells
// with its seas and craters, lit from the upper left so a sliver of it is in
// shadow, and on its upper rim the two of them, sitting, small against the
// glow it throws into the wet air. A picture of the intro's moon on a disc
// read as a porthole pinned to the sky; this is a moon. Only the Contact
// camera looks south-east, where it hangs, so it is a reveal and not a
// fixture.
//
// The painted still (design/night-city-garage/textures/moon.jpg) is still
// loaded here for the garage's monitor (src/world/garage.js).
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

export function dressMoon(mesh, shared, { reflectLayer = 2 } = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: 0 },
    },
    // Square to the camera: a moon is round from anywhere, and a card that
    // only turned about its vertical was an oval to a camera looking up.
    vertexShader: /* glsl */ `
      uniform vec3 uCenter;
      uniform float uRadius;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 w = uCenter + (right * (uv.x * 2.0 - 1.0) + up * (1.0 - uv.y * 2.0)) * uRadius;
        vWorld = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec2 vUv;
      varying vec3 vWorld;

      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * vnoise(p);
          p = p * 2.03 + vec2(17.1, 3.7);
          a *= 0.5;
        }
        return s / 0.9375;
      }
      float box(vec2 p, vec2 b, float r) {
        vec2 d = abs(p) - b + r;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
      }
      // One of the two, seated, from behind, in units of the moon's radius
      // with its seat at the origin and up away from the moon: a back and
      // shoulders, arms at the sides, a head, and the hair that tells them
      // apart (his stands up in spikes; hers is a bob).
      float figure(vec2 p, float spiky) {
        float d = box(p - vec2(0.0, 0.034), vec2(0.021, 0.034), 0.012);
        d = min(d, box(p - vec2(0.0, 0.062), vec2(0.028, 0.008), 0.006));
        d = min(d, length(p - vec2(0.0, 0.086)) - 0.015);
        if (spiky > 0.5) {
          for (int i = 0; i < 5; i++) {
            float a = (float(i) - 2.0) * 0.5;
            vec2 q = p - vec2(0.0, 0.09);
            vec2 tip = vec2(sin(a), cos(a)) * 0.028;
            float h = clamp(dot(q, tip) / dot(tip, tip), 0.0, 1.0);
            d = min(d, length(q - tip * h) - 0.006 * (1.0 - h));
          }
        } else {
          d = min(d, box(p - vec2(0.0, 0.086), vec2(0.02, 0.019), 0.009));
        }
        return d;
      }

      void main() {
        // The card's v runs down the screen (see the vertex shader): up is
        // up here.
        vec2 p = vec2(vUv.x * 2.0 - 1.0, 1.0 - vUv.y * 2.0);
        float r = length(p);
        // The disc, 0.4 of the card (the rest is its glow), and the moon's
        // own frame on it.
        vec2 q = p / 0.4;
        float rq = length(q);
        float aa = fwidth(rq);
        float disc = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, rq);

        // The surface: square cells as the intro's moon is built, each its
        // own grey; seas, darker, in broad soft shapes; a few craters, each
        // a darker floor and a bright rim; a bevel between cells while they
        // are big enough to show one.
        float cells = 30.0;
        vec2 cq = q * cells * 0.5;
        vec2 cid = floor(cq);
        vec2 cc = (cid + 0.5) / (cells * 0.5);
        float shade = mix(0.8, 1.0, hash12(cid));
        float seas = smoothstep(0.45, 0.7, vnoise(cc * 1.6 + 4.2) * 0.7 + vnoise(cc * 3.7 + 1.3) * 0.3);
        shade *= mix(1.0, 0.64, seas);
        for (int i = 0; i < 7; i++) {
          float fi = float(i);
          vec2 c = vec2(hash12(vec2(fi, 3.1)), hash12(vec2(fi, 7.9))) * 1.5 - 0.75;
          float rad = 0.07 + 0.12 * hash12(vec2(fi, 11.3));
          float dc = length(cc - c) / rad;
          shade *= 1.0 - 0.22 * (1.0 - smoothstep(0.7, 0.85, dc)) + 0.12 * smoothstep(0.8, 0.95, dc) * (1.0 - smoothstep(0.95, 1.15, dc));
        }
        vec2 f = fract(cq) - 0.5;
        float cellPx = fwidth(cq.x);
        shade *= mix(1.0, 0.86, smoothstep(0.43, 0.5, max(abs(f.x), abs(f.y))) * (1.0 - smoothstep(0.12, 0.3, cellPx)));
        // A sphere seen head-on, lit from the upper left: a gibbous moon,
        // darker toward its limb, its dark side a faint Earthshine blue.
        float z = sqrt(max(0.0, 1.0 - rq * rq));
        vec3 n = vec3(q, z);
        float lit = smoothstep(-0.1, 0.35, dot(n, normalize(vec3(-0.55, 0.42, 0.72))));
        float limb = mix(0.5, 1.0, sqrt(z));
        vec3 col = vec3(0.86, 0.9, 1.0) * shade * limb * (0.06 + 0.94 * lit) * 1.35;
        col += vec3(0.03, 0.05, 0.11) * (1.0 - lit);
        col *= disc;

        // The glow it throws into the haze, in the haze's own colour: a
        // bright ring close in and a wide faint one, gone by the card's edge.
        float out_ = max(r - 0.4, 0.0);
        float glow = (exp(-out_ * 9.0) * 0.8 + exp(-out_ * 3.2) * 0.3) * (1.0 - disc) * smoothstep(1.0, 0.6, r);
        col += mix(vec3(0.5, 0.55, 0.85), uHazeColor * 3.0, 0.5) * glow * 0.55 * (1.0 + 0.2 * uLevel);

        // The two of them on its upper rim, a little left of the top, him
        // taller: dark against the moon where they sit on it and against its
        // glow above, with the moon's light catching their edges.
        float sil = 1e3;
        for (int k = 0; k < 2; k++) {
          float a = radians(k == 0 ? 101.0 : 94.5);
          vec2 up = vec2(cos(a), sin(a));
          vec2 side = vec2(up.y, -up.x);
          vec2 seat = up * 0.992;
          float size = k == 0 ? 1.35 : 1.2;
          vec2 local = vec2(dot(q - seat, side), dot(q - seat, up)) / size;
          sil = min(sil, figure(local, k == 0 ? 1.0 : 0.0) * size);
        }
        float saa = fwidth(sil);
        float body = 1.0 - smoothstep(-saa, saa, sil);
        float rim = (1.0 - smoothstep(0.0, 0.006 + saa, abs(sil))) * (1.0 - body * 0.5);
        col = mix(col, vec3(0.006, 0.007, 0.012), body);
        col += vec3(0.5, 0.56, 0.75) * rim * 0.35 * smoothstep(0.9, 1.0, rq);

        // The sky's cloud deck (src/world/skyline.js) passes in front: thick
        // cloud hides the moon, thin cloud takes its light, silver at the
        // edges.
        vec3 dir = normalize(vWorld - uCam);
        float tc = (520.0 - uCam.y) / max(dir.y, 0.02);
        vec3 pc = uCam + dir * tc;
        vec2 cl = (pc.xz + vec2(uTime * 3.2, uTime * 1.1)) / 380.0;
        float cn = fbm(cl + 0.9 * vec2(fbm(cl * 0.5 + 5.2), fbm(cl * 0.5 + 1.3)));
        float cover = smoothstep(0.42, 0.72, cn);
        float edge = smoothstep(0.35, 0.5, cn) * (1.0 - smoothstep(0.5, 0.72, cn));
        col = col * (1.0 - 0.8 * cover) + vec3(0.62, 0.64, 0.8) * edge * (disc * 0.5 + glow * 0.9) * 0.6;

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
  const inverse = new THREE.Matrix4();
  return {
    material,
    /** Where it hangs and how big, in world units (world-scene's resize). */
    place(center, radius) {
      // The card is twice the disc: the rest is its glow.
      radius *= 2;
      material.uniforms.uCenter.value.copy(center);
      material.uniforms.uRadius.value = radius;
      // Culled where the shader hangs it, not where the GLB left the card:
      // only the Contact shot looks that way, so every other frame, and
      // every mirror, skips it.
      mesh.updateWorldMatrix(true, false);
      const sphere = (mesh.geometry.boundingSphere ??= new THREE.Sphere());
      sphere.center.copy(center).applyMatrix4(inverse.copy(mesh.matrixWorld).invert());
      sphere.radius = (radius * Math.SQRT2) / mesh.matrixWorld.getMaxScaleOnAxis();
    },
    dispose() {
      material.dispose();
    },
  };
}
