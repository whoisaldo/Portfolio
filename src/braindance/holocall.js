// src/braindance/holocall.js: Ali, on a holocall, over the garage roof.
//
// The recording ends with the moon over the city, and with a call coming
// in: a hologram of Ali, head and shoulders, standing over the roof's edge
// beside the moon, which is the Contact clue. The picture is his own
// portrait from the site (Seattle, July 2026), with the street behind him
// lifted out on the Mac that built this (Vision's foreground mask, nothing
// redrawn), so the face is the photograph's. The rest is the shader: the
// picture read as light in the projector's cyan, scanlines climbing it,
// the odd slice of it slipping sideways, a brighter rim where it meets the
// air, and a cone of light from the emitter on the roof under it. It
// materializes from the bottom up when the call connects and turns to face
// the camera about its own vertical, as a projection would.
import * as THREE from "three";

const URL_HOLO = (import.meta.env?.BASE_URL || "/") + "braindance/ali-holo.webp";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uOn;
  uniform float uGlitch;
  uniform vec3 uTint;
  varying vec2 vUv;
  float hh(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    // A slice of the picture slips sideways now and then.
    float band = floor(uv.y * 40.0);
    float slip = step(0.985 - uGlitch * 0.3, hh(band + floor(uTime * 12.0))) * (hh(band * 7.0 + uTime) - 0.5) * 0.06;
    uv.x += slip;
    vec4 tex = texture2D(uMap, uv);
    float a = tex.a;
    // The rim, where the picture meets the air.
    float rim = clamp(fwidth(a) * 6.0, 0.0, 1.0);
    float l = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 col = uTint * (0.35 + 1.5 * l) + vec3(0.85, 1.0, 1.0) * pow(l, 3.0) * 0.8;
    float scan = 0.72 + 0.28 * sin(vUv.y * 420.0 - uTime * 9.0);
    float sweep = smoothstep(0.03, 0.0, abs(fract(vUv.y * 0.6 - uTime * 0.35) - 0.5)) * 0.6;
    float flicker = 0.9 + 0.1 * sin(uTime * 37.0) * sin(uTime * 13.0);
    // Materializing from the bottom up: the edge of it bright.
    float grown = smoothstep(uOn * 1.15 - 0.08, uOn * 1.15, vUv.y);
    float front = smoothstep(0.06, 0.0, abs(vUv.y - uOn * 1.15 + 0.04)) * step(uOn, 0.999);
    float alpha = a * (1.0 - grown) * scan * flicker * 0.85;
    vec3 outc = col * (1.0 + sweep) + uTint * rim * 2.2 + vec3(0.7, 1.0, 1.0) * front * a * 2.0;
    gl_FragColor = vec4(outc * alpha, alpha);
  }
`;

const CONE_FRAG = /* glsl */ `
  uniform float uOn;
  uniform float uTime;
  uniform vec3 uTint;
  varying vec2 vUv;
  void main() {
    // Brightest at the emitter, fading up the cone and at its edges.
    float up = vUv.y;
    float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float a = (1.0 - up) * pow(edge, 1.5) * 0.28 * uOn * (0.85 + 0.15 * sin(uTime * 23.0 + up * 30.0));
    gl_FragColor = vec4(uTint * a, a);
  }
`;

export function preloadHolocall() {
  return new THREE.TextureLoader().loadAsync(URL_HOLO);
}

export function createHolocall(scene, map, { position = new THREE.Vector3(467.8, 7.75, -194.2), lift = 4.2, height = 2.6 } = {}) {
  map.colorSpace = THREE.SRGBColorSpace;
  const tint = new THREE.Color(0.2, 0.95, 0.85);
  const group = new THREE.Group();
  group.name = "bd_holocall";
  group.position.copy(position);
  group.visible = false;

  const aspect = map.image ? map.image.width / map.image.height : 1;
  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uTime: { value: 0 }, uOn: { value: 0 }, uGlitch: { value: 0 }, uTint: { value: tint } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    side: THREE.DoubleSide,
  });
  const bust = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), material);
  // Projected over the roof: the emitter on the roof, the bust `lift` above it.
  bust.position.y = lift + height / 2;
  group.add(bust);

  // The emitter's cone of light, and a ring on the roof where it stands.
  const coneMat = new THREE.ShaderMaterial({
    uniforms: { uOn: { value: 0 }, uTime: { value: 0 }, uTint: { value: tint } },
    vertexShader: VERT,
    fragmentShader: CONE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beam = lift + height * 0.35;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.42, 0.12, beam, 24, 1, true), coneMat);
  cone.position.y = beam / 2;
  // The cylinder's uv.y runs bottom to top, which is what the shader wants.
  group.add(cone);
  const ringMat = new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);
  scene.add(group);

  const box = new THREE.Box3();
  const _v = new THREE.Vector3();
  let clock = 0;

  return {
    group,
    /** The bust's box in the world, for the Contact clue. */
    box() {
      bust.updateWorldMatrix(true, false);
      return box.setFromObject(bust);
    },
    /**
     * `on` 0..1: how far the call has materialized (0 hides it). `camera`
     * turns it to face the lens about its vertical.
     */
    update(dt, on, camera, glitch = 0) {
      clock += dt;
      group.visible = on > 0.001;
      if (!group.visible) return;
      _v.copy(camera.position).sub(group.position);
      group.rotation.y = Math.atan2(_v.x, _v.z);
      material.uniforms.uTime.value = clock;
      material.uniforms.uOn.value = on;
      material.uniforms.uGlitch.value = glitch;
      coneMat.uniforms.uOn.value = Math.min(1, on * 1.4);
      coneMat.uniforms.uTime.value = clock;
      ringMat.opacity = Math.min(1, on * 2);
    },
    dispose() {
      scene.remove(group);
      bust.geometry.dispose();
      material.dispose();
      cone.geometry.dispose();
      coneMat.dispose();
      ring.geometry.dispose();
      ringMat.dispose();
      map.dispose();
    },
  };
}
