// src/world/searchlights.js: searchlight beams in the wet sky.
//
// A district's builder sets a lamp housing on a roof and one empty at its
// lens, `anchor_searchlight_<district>_<n>`, with extras: `yaw` (radians,
// from +z toward +x), `pitch` (radians up from level), `length` (metres) and
// `color` (hex, "eceae4"). Each is a beam of the haze lit by the lamp: drawn
// on a card along the beam's axis, turned about that axis to face the eye,
// 0.8 m wide at the lens and 7 m at its far end, gaussian across it so it
// has no edge, brightest over its first three metres and gone between half
// its length and its end. It is the lamp's colour at about a fifth of a
// street lamp's light in the air (src/world/shafts.js), and as much of that
// as there is haze. It sweeps slowly on the city's own clock (a still is the
// same still): yaw + 0.22 sin(2 pi t / 26 + 2.1 n), pitch + 0.05 sin(2 pi t
// / 19 + n). It fades out between 600 and 1200 m, and when the eye looks
// down a beam, where a card is a line; it is not in the wet road's mirror
// (it is on no reflected layer). One instanced draw, additive.
//
// The page's shots are composed without it: world-scene.js draws it only
// while the page is put away (Look, Cinema) or in a directed frame that asks
// for it (`spec.searchlights`).
import * as THREE from "three";

const NAME = /^anchor_searchlight_[a-z0-9]+_(\d+)$/;
// Width at the lens and at the far end, metres; rows of the card along it.
const NEAR = 0.8;
const FAR = 7.0;
const ROWS = 24;
// A street lamp's light in its air at its brightest, as shafts.js has it (its
// gain 0.5 at full haze, its veil and head 1.35 together), and a fifth of it.
const GAIN = 0.2 * 0.5 * 1.35;

export function createSearchlights(scene, shared, anchors) {
  const lamps = [];
  for (const [name, a] of anchors) {
    const m = NAME.exec(name);
    const x = a.extras ?? {};
    if (!m || x.length == null) continue;
    lamps.push({ at: a.position, n: +m[1], yaw: +x.yaw || 0, pitch: +x.pitch || 0, length: +x.length, color: new THREE.Color(`#${String(x.color ?? "ffffff").replace("#", "")}`) });
  }
  if (!lamps.length) return null;

  const card = new THREE.PlaneGeometry(1, 1, 1, ROWS);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = card.index;
  geometry.setAttribute("position", card.attributes.position);
  const lamp = new Float32Array(lamps.length * 4);
  const aim = new Float32Array(lamps.length * 3);
  const colour = new Float32Array(lamps.length * 3);
  const bounds = new THREE.Box3();
  lamps.forEach((l, i) => {
    lamp.set([l.at.x, l.at.y, l.at.z, l.n], i * 4);
    aim.set([l.yaw, l.pitch, l.length], i * 3);
    colour.set([l.color.r, l.color.g, l.color.b], i * 3);
    bounds.expandByPoint(l.at);
    bounds.expandByPoint(new THREE.Vector3(l.at.x, l.at.y + l.length, l.at.z).addScalar(l.length));
    bounds.expandByPoint(new THREE.Vector3(l.at.x, l.at.y, l.at.z).subScalar(l.length));
  });
  geometry.setAttribute("aLamp", new THREE.InstancedBufferAttribute(lamp, 4));
  geometry.setAttribute("aAim", new THREE.InstancedBufferAttribute(aim, 3));
  geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colour, 3));
  geometry.instanceCount = lamps.length;
  geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());

  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uHaze;
      uniform vec3 uCam;
      attribute vec4 aLamp;
      attribute vec3 aAim;
      attribute vec3 aColor;
      varying float vAcross;
      varying float vLight;
      varying vec3 vColor;
      void main() {
        const float TAU = 6.2831853;
        float yaw = aAim.x + 0.22 * sin(TAU * uTime / 26.0 + 2.1 * aLamp.w);
        float pitch = aAim.y + 0.05 * sin(TAU * uTime / 19.0 + aLamp.w);
        vec3 d = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
        float along = (position.y + 0.5) * aAim.z;
        vec3 axis = aLamp.xyz + d * along;
        vec3 eye = uCam - axis;
        float dist = length(eye);
        // Turned about its axis to face the eye.
        vec3 side = cross(d, eye);
        float sl = length(side);
        side = sl > 1e-4 ? side / sl : normalize(cross(d, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0));
        float width = mix(${NEAR.toFixed(2)}, ${FAR.toFixed(2)}, along / aAim.z);
        // The card reaches past where the light is gone across it.
        float reach = width * 1.25;
        vec3 world = axis + side * position.x * 2.0 * reach;
        vAcross = position.x * 2.0 * reach / width;
        // Bright over its first three metres, gone between half its length
        // and its end; out with distance and down its own axis; as much of
        // it as there is haze.
        float fall = mix(1.6, 1.0, smoothstep(0.0, 3.0, along)) * (1.0 - smoothstep(0.5 * aAim.z, aAim.z, along));
        float far = 1.0 - smoothstep(600.0, 1200.0, dist);
        float down = 1.0 - smoothstep(0.85, 0.98, abs(dot(eye, d)) / max(dist, 1e-3));
        vLight = ${GAIN.toFixed(4)} * fall * far * down * uHaze * smoothstep(2.0, 12.0, dist);
        vColor = aColor;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAcross;
      varying float vLight;
      varying vec3 vColor;
      void main() {
        // Gaussian across (vAcross is metres over the width there): an
        // eighth of the middle's at the stated width, nothing at the card's
        // edge.
        float a = exp(-8.0 * vAcross * vAcross) * vLight;
        if (a < 1e-4) discard;
        gl_FragColor = vec4(vColor * a, 0.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.name = "searchlights";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "searchlights";
  mesh.renderOrder = 7;
  mesh.visible = false;
  scene.add(mesh);

  return {
    mesh,
    /** Draw it this frame or not (`on`), at the shared haze level. */
    update(on, haze) {
      mesh.visible = on && haze > 0.01;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      card.dispose();
      material.dispose();
    },
  };
}
