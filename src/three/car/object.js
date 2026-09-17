import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { s4ModelUrl } from "../../data/s4";
import { Vector3 } from "three";

export const meta = {
  name: "Ali's 2013 Audi S4",
  size: [2.02, 1.38, 4.74],
  parts: ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr", "steer_fl", "steer_fr", "body", "headlights", "taillights", "hood_hinge"],
};

let pending;
let source;

// Both the cinematic and the garage share one download. A failed request can
// be retried; each mounted scene gets its own disposable GPU resources.
export function preloadCar() {
  if (!pending) {
    pending = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(s4ModelUrl)
      .then((gltf) => { source = gltf.scene; })
      .catch((error) => { pending = null; throw error; });
  }
  return pending;
}

export function createObject() {
  if (!source) throw new Error("Load the Audi S4 before creating its scene.");
  const car = source.clone(true);
  const geometries = new Map();
  const materials = new Map();
  const textures = new Map();
  car.traverse((obj) => {
    if (!obj.isMesh) return;
    const geometry = obj.geometry;
    if (!geometries.has(geometry)) geometries.set(geometry, geometry.clone());
    obj.geometry = geometries.get(geometry);
    const copyMaterial = (original) => {
      if (!materials.has(original)) {
        const material = original.clone();
        for (const [key, value] of Object.entries(material)) {
          if (!value?.isTexture) continue;
          if (!textures.has(value)) textures.set(value, value.clone());
          material[key] = textures.get(value);
        }
        materials.set(original, material);
      }
      return materials.get(original);
    };
    obj.material = Array.isArray(obj.material) ? obj.material.map(copyMaterial) : copyMaterial(obj.material);
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
  car.name = "ali_s4";
  car.userData.parts = Object.fromEntries(meta.parts.map((name) => [name, car.getObjectByName(name)]));
  car.userData.wheelRadius = 0.34325;
  car.userData.wheelbase = 2.811;
  car.userData.forwardAxis = "+Z";
  const { body, hood_hinge: hood } = car.userData.parts;
  const base = car.getObjectByName("hood_strut_base");
  const mount = car.getObjectByName("hood_strut_mount");
  const tube = car.getObjectByName("hood_strut_tube");
  const rod = car.getObjectByName("hood_strut_rod");
  const start = new Vector3(), end = new Vector3(), direction = new Vector3(), up = new Vector3(0, 1, 0);
  car.userData.setHoodProgress = (progress) => {
    if (!hood) return;
    hood.rotation.x = -1.1 * Math.max(0, Math.min(1, progress));
    car.updateMatrixWorld(true);
    body.worldToLocal(base.getWorldPosition(start));
    body.worldToLocal(mount.getWorldPosition(end));
    direction.subVectors(end, start);
    const length = direction.length();
    direction.normalize();
    tube.position.copy(start);
    tube.quaternion.setFromUnitVectors(up, direction);
    tube.scale.set(1, length * 0.58, 1);
    rod.position.copy(start).addScaledVector(direction, length * 0.45);
    rod.quaternion.copy(tube.quaternion);
    rod.scale.set(1, length * 0.55, 1);
  };
  car.userData.setHoodProgress(0);
  car.userData.dispose = () => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
  };
  return car;
}
