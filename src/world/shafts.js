// src/world/shafts.js: light hanging in the wet air under the street lamps.
//
// The `haze` switch is height fog and this: a soft cone of sodium light from
// each street lamp head (anchor_lamp_<n> in the kit) to the pavement, the
// way a lamp reads through rain at night. One instanced draw of open cones,
// additive, bright at the lamp and gone by the ground, brightest where the
// eye looks through the most of the cone (its middle) and nothing at its
// silhouette, so it reads as light in the air and not as a lampshade. It
// fades in and out with the haze switch, and it is not in the mirror: the
// wet road already carries the lamps' own reflections.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

const HEIGHT = 6.1;
const RADIUS = 2.3;

export function createShafts(scene, anchors, shared, { color = "#ffb254" } = {}) {
  const heads = [...anchors.entries()]
    .filter(([name]) => name.startsWith("anchor_lamp_"))
    .map(([, a]) => a.position);
  if (!heads.length) return { update() {}, dispose() {} };

  const geometry = new THREE.ConeGeometry(RADIUS, HEIGHT, 24, 1, true);
  // Apex at the lamp, base on the ground: ConeGeometry points +Y with its
  // apex at +HEIGHT/2, so it is already the right way up once lifted.
  geometry.translate(0, HEIGHT / 2, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uColor: { value: new THREE.Color(color) }, uGain: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vT;
      varying float vEdge;
      varying vec3 vWorld;
      void main() {
        vT = uv.y;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vec3 n = normalize(mat3(viewMatrix) * mat3(modelMatrix * instanceMatrix) * normal);
        vEdge = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uColor;
      uniform float uGain;
      varying float vT;
      varying float vEdge;
      varying vec3 vWorld;
      void main() {
        // uv.y is 1 at the apex (the lamp) and 0 at the ground.
        float a = pow(vT, 1.6) * pow(vEdge, 1.4) * uGain * (1.0 + 0.25 * uLevel);
        // Rain drifting through the light: a slow shimmer down the cone.
        a *= 0.8 + 0.2 * sin(vWorld.y * 3.0 + uTime * 5.0 + vWorld.x * 0.7);
        a *= 1.0 - smoothstep(60.0, 140.0, length(vWorld - uCam));
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
  heads.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y - HEIGHT, p.z)));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = "lamp_shafts";
  mesh.renderOrder = 7;
  scene.add(mesh);

  return {
    mesh,
    /** `haze` is the shared haze level, 0 to 1. */
    update(haze) {
      material.uniforms.uGain.value = 0.3 * haze;
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
