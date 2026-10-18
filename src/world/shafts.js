// src/world/shafts.js: light hanging in the wet air under the street lamps.
//
// The `haze` switch is height fog and this: sodium light in the rain under
// each street lamp head (anchor_lamp_<n> in the kit), the way a lamp reads at
// night: a glow round the head and a veil of light falling from it, opening
// as it falls and gone long before the ground. There is no cone to see the
// side of: it is drawn on an upright card turned about the lamp's own axis
// to face the eye, and every way out of the light is a falloff (across it,
// down it, above the head), so nothing of it has an edge, near or far. One
// instanced draw, additive. It fades in and out with the haze switch, with
// distance, and when the eye looks down the lamp's axis; and it is not in
// the mirror: the wet road already carries the lamps' own reflections. The
// pool on the ground is the baked light's (src/world/spill.js), not this.
//
// The street furniture's lamps (src/world/props.js) carry the same light as
// a part of their prototype, drawn with LAMP_AIR by prop-surfaces.js.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

// The card: metres across, how far over the head it starts and how far the
// light falls.
const ACROSS = 4.4;
const OVER = 1.2;
const FALL = 4.8;

/**
 * The light in the air at x metres off the lamp's axis and d metres below
 * its head (negative above it), for light that falls `fall` metres; and how
 * much of it the eye at `eye` (from the point, world space) sees.
 */
export const LAMP_AIR = /* glsl */ `
  float lampAir(float x, float d, float fall) {
    float spread = 0.16 + 0.42 * max(d, 0.0);
    float veil = exp(-x * x / (spread * spread)) * smoothstep(-0.25, 0.1, d) * (1.0 - smoothstep(0.45, 1.0, d / fall)) / (1.0 + d * d * 0.9);
    float head = exp(-(x * x + d * d) * 3.2);
    return veil * 0.75 + head * 0.6;
  }
  float lampSeen(vec3 eye, vec3 p, float time) {
    float dist = length(eye);
    float a = 1.0 - smoothstep(90.0, 220.0, dist);
    // Not from straight above or below, where a card is a line; not from
    // inside it.
    a *= 1.0 - smoothstep(0.55, 0.9, abs(eye.y) / dist);
    a *= smoothstep(0.5, 2.5, length(eye.xz));
    // Rain drifting through the light: a slow shimmer down it.
    return a * (0.86 + 0.14 * sin(p.y * 3.0 + time * 5.0 + p.x * 0.7));
  }
`;

export function createShafts(scene, anchors, shared, { color = "#ffb254" } = {}) {
  const heads = [...anchors.entries()]
    .filter(([name]) => name.startsWith("anchor_lamp_"))
    .map(([, a]) => a.position);
  if (!heads.length) return { update() {}, dispose() {} };

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uColor: { value: new THREE.Color(color) }, uGain: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform vec3 uCam;
      varying vec2 vAt;
      varying vec3 vWorld;
      void main() {
        // The head is the instance; the card turns about the lamp's axis.
        vec3 head = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 eye = uCam - head;
        vec3 right = normalize(vec3(eye.z, 0.0, -eye.x));
        vAt = vec2(position.x * ${ACROSS.toFixed(1)}, mix(${FALL.toFixed(1)}, ${(-OVER).toFixed(1)}, position.y + 0.5));
        vWorld = head + right * vAt.x - vec3(0.0, vAt.y, 0.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${LAMP_AIR}
      uniform vec3 uColor;
      uniform float uGain;
      varying vec2 vAt;
      varying vec3 vWorld;
      void main() {
        float a = lampAir(vAt.x, vAt.y, ${FALL.toFixed(1)}) * lampSeen(uCam - vWorld, vWorld, uTime) * uGain * (1.0 + 0.25 * uLevel);
        gl_FragColor = vec4(uColor * a, 0.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.name = "lamp_shafts";
  const mesh = new THREE.InstancedMesh(geometry, material, heads.length);
  const m = new THREE.Matrix4();
  heads.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.boundingSphere.radius += FALL;
  mesh.name = "lamp_shafts";
  mesh.renderOrder = 7;
  scene.add(mesh);

  return {
    mesh,
    /** `haze` is the shared haze level, 0 to 1. */
    update(haze) {
      material.uniforms.uGain.value = 0.5 * haze;
      mesh.visible = haze > 0.01;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
