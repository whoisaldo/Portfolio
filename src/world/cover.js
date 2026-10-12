// src/world/cover.js: what stands over each spot of ground, for the rain.
//
// Rain is a box of streaks that follows the camera (rain.js), and it knew
// nothing of the city: it fell under the deck, through awnings and inside
// arcades. So the city's built kit is drawn once from straight above into a
// depth texture, the height of the highest surface over every spot, and a
// drop below that height is under cover (or inside something) and is not
// drawn. Drawn again as each district's pack arrives. Only the merged kit
// (the meshes named kit_*) is drawn: the props are instanced and culled by
// camera, so what they cover would change with where the camera stood.
import * as THREE from "three";

const TOP = 240;
const NEAR = 1;
const FAR = TOP + 12;

export function createCover(renderer, { x0, z0, x1, z1 }, { size = 2048 } = {}) {
  const depth = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
  depth.minFilter = depth.magFilter = THREE.NearestFilter;
  const target = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true, depthTexture: depth, generateMipmaps: false });
  // Looking straight down with the screen's up toward -z: the screen's x is
  // the world's x, its y is the world's -z.
  const camera = new THREE.OrthographicCamera(x0, x1, -z0, -z1, NEAR, FAR);
  camera.position.set(0, TOP, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const stage = new THREE.Scene();
  stage.overrideMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  const hidden = [];

  return {
    texture: depth,
    /** x0, z1, 1 / width, 1 / depth: a spot's place in the texture. */
    box: new THREE.Vector4(x0, z1, 1 / (x1 - x0), 1 / (z1 - z0)),
    /** A texel's depth d is a surface at TOP - NEAR - d * (FAR - NEAR). */
    scale: new THREE.Vector2(TOP - NEAR, FAR - NEAR),
    /** Draw the kit under `root` from above. `root` goes back where it was. */
    render(root) {
      const parent = root.parent;
      for (const o of root.children) {
        if (o.visible && !o.name.startsWith("kit_")) {
          o.visible = false;
          hidden.push(o);
        }
      }
      stage.add(root);
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.clear(true, true, false);
      renderer.render(stage, camera);
      renderer.setRenderTarget(prev);
      parent?.add(root);
      for (const o of hidden) o.visible = true;
      hidden.length = 0;
    },
    dispose() {
      target.dispose();
      depth.dispose();
      stage.overrideMaterial.dispose();
    },
  };
}
