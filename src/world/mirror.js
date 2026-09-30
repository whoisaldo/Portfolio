// src/world/mirror.js: the wet road's mirror, on desktop only.
//
// The same maths as three's Reflector (a camera reflected in the ground
// plane, an oblique near plane so nothing below the road leaks in, and a
// texture matrix the road samples with), but as a pass the world runs
// itself rather than a mesh with an onBeforeRender, because the "mirror"
// here is every road mesh in the city at once. It draws only what is on
// the reflect layer: what glows, the lit facades, the car and the traffic.
// Twice as wide as it is tall (1024 by 512 on desktop): the road smears it
// down its length, never across, so the width is where the detail goes.
import * as THREE from "three";

const BLUR_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const BLUR_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() {
    vec3 c = vec3(0.0);
    float wsum = 0.0;
    for (int i = -12; i <= 12; i++) {
      float fi = float(i);
      float w = exp(-fi * fi / 60.0);
      c += texture2D(uTex, vUv + uStep * fi).rgb * w;
      wsum += w;
    }
    gl_FragColor = vec4(c / wsum, 1.0);
  }
`;

export function createMirror(renderer, { size = 1024, layers = [2], clipBias = 0.02 } = {}) {
  const W = size;
  const H = size / 2;
  const opts = { type: THREE.HalfFloatType, samples: 0, depthBuffer: true };
  const target = new THREE.WebGLRenderTarget(W, H, opts);
  const blurred = new THREE.WebGLRenderTarget(W, H, { ...opts, depthBuffer: false });
  const pong = new THREE.WebGLRenderTarget(W, H, { ...opts, depthBuffer: false });
  for (const t of [target, blurred, pong]) t.texture.generateMipmaps = false;
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uStep: { value: new THREE.Vector2() } },
    vertexShader: BLUR_VERT,
    fragmentShader: BLUR_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat);
  quad.frustumCulled = false;
  const blurScene = new THREE.Scene();
  blurScene.add(quad);
  const blurCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pass = (src, dst, sx, sy) => {
    blurMat.uniforms.uTex.value = src.texture;
    blurMat.uniforms.uStep.value.set(sx / W, sy / H);
    renderer.setRenderTarget(dst);
    renderer.render(blurScene, blurCam);
  };
  const cam = new THREE.PerspectiveCamera();
  cam.layers.set(layers[0]);
  for (const l of layers.slice(1)) cam.layers.enable(l);
  const matrix = new THREE.Matrix4();
  const plane = new THREE.Plane();
  const normal = new THREE.Vector3(0, 1, 0);
  const origin = new THREE.Vector3(0, 0, 0);
  const camPos = new THREE.Vector3();
  const rot = new THREE.Matrix4();
  const lookAt = new THREE.Vector3();
  const view = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const clip = new THREE.Vector4();
  const q = new THREE.Vector4();
  const far = new THREE.Vector4();
  const fwd = new THREE.Vector3();
  let horizonV = 0.5;

  const render = (scene, camera) => {
    camPos.setFromMatrixPosition(camera.matrixWorld);
    view.subVectors(origin, camPos);
    // Below the road there is nothing to reflect.
    if (view.dot(normal) > 0) return false;
    view.reflect(normal).negate().add(origin);
    rot.extractRotation(camera.matrixWorld);
    lookAt.set(0, 0, -1).applyMatrix4(rot).add(camPos);
    tgt.subVectors(origin, lookAt).reflect(normal).negate().add(origin);
    cam.position.copy(view);
    cam.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal);
    cam.lookAt(tgt);
    cam.far = camera.far;
    cam.updateMatrixWorld();
    cam.projectionMatrix.copy(camera.projectionMatrix);

    matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    matrix.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    // Where the horizon straight ahead lands in the mirror image: the far
    // end of every streak the road gathers.
    fwd.set(0, 0, -1).applyMatrix4(rot);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize().multiplyScalar(4000).add(camPos);
    far.set(fwd.x, 0, fwd.z, 1).applyMatrix4(matrix);
    horizonV = far.y / far.w;

    plane.setFromNormalAndCoplanarPoint(normal, origin).applyMatrix4(cam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const p = cam.projectionMatrix.elements;
    q.x = (Math.sign(clip.x) + p[8]) / p[0];
    q.y = (Math.sign(clip.y) + p[9]) / p[5];
    q.z = -1.0;
    q.w = (1.0 + p[10]) / p[14];
    clip.multiplyScalar(2.0 / clip.dot(q));
    p[2] = clip.x;
    p[6] = clip.y;
    p[10] = clip.z + 1.0 - clipBias;
    p[14] = clip.w;

    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, cam);
    // Long and vertical, three times over, and never across: light on wet
    // asphalt runs down the road in streaks with hard sides.
    pass(target, pong, 0, 1.3);
    pass(pong, blurred, 0, 2.6);
    pass(blurred, pong, 0, 5.2);
    pass(pong, blurred, 0, 1.0);
    renderer.setRenderTarget(prev);
    return true;
  };

  return {
    texture: blurred.texture,
    matrix,
    render,
    get horizonV() {
      return horizonV;
    },
    targets: { raw: target, blurred },
    dispose() {
      target.dispose();
      blurred.dispose();
      pong.dispose();
      blurMat.dispose();
      quad.geometry.dispose();
    },
  };
}
