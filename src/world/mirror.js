// src/world/mirror.js: the wet road's mirror, on desktop only.
//
// The same maths as three's Reflector (a camera reflected in the ground
// plane, an oblique near plane so nothing below the road leaks in, and a
// texture matrix the road samples with), but as a pass the world runs
// itself rather than a mesh with an onBeforeRender, because the "mirror"
// here is every road mesh in the city at once. It draws only what is on
// the reflect layer: what glows, the lit facades, the car and the traffic.
//
// The picture is kept sharp, with its mip chain: standing water reads the
// top of the chain and holds a sign as a sign; damp asphalt reads a few
// levels down, where the picture is already as soft as the asphalt is
// rough (src/world/road.js). The chain costs less than the blur it
// replaces, which smeared every reflection the length of the road.
import * as THREE from "three";

// The deck's level top (the builder's plan.py: the road at y 8.5 along
// z -80 from the west turn to x 20, and the turn's plate) is the one wet
// road that is not on the ground. While the eye is on it or just over it the
// mirror is drawn in its plane and not the ground's: `deckShare` is 0 on
// the ground, 1 on the deck, and passes through a half as the eye comes up
// the ramp or off the bridge's east end. The world draws the ground's
// mirror under a half and the deck's over it, and takes the mirror out of
// the roads (they fall back on the baked light, as any road without a
// mirror does) toward the half from both sides, so nothing pops.
export const DECK_Y = 8.5;
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function deckShare(p) {
  const out = Math.hypot(Math.max(-86 - p.x, 0, p.x - 22), Math.max(-88 - p.z, 0, p.z + 72));
  return (1 - smooth(0, 8, out)) * smooth(6, 7.2, p.y) * (1 - smooth(13, 16, p.y));
}

export function createMirror(renderer, { size = 1024, layers = [2], clipBias = 0.02 } = {}) {
  const W = size;
  const H = size / 2;
  const target = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.HalfFloatType,
    samples: 0,
    depthBuffer: true,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
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

  // `y`: the height of the plane to mirror in (the ground's, or the deck's).
  const render = (scene, camera, y = 0) => {
    origin.y = y;
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
    far.set(fwd.x, y, fwd.z, 1).applyMatrix4(matrix);
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
    renderer.setRenderTarget(prev);
    return true;
  };

  return {
    texture: target.texture,
    matrix,
    render,
    get horizonV() {
      return horizonV;
    },
    targets: { raw: target, blurred: target },
    dispose() {
      target.dispose();
    },
  };
}
