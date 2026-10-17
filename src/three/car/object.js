import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { s4ModelUrl } from "../../data/s4";
import { s6ModelUrl } from "../../data/s6";
import { markBytes } from "../../world/progress";
import { Vector3 } from "three";

const PARTS = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr", "steer_fl", "steer_fr", "body", "headlights", "taillights", "hood_hinge"];

// Ali's two cars. Both GLBs share one rig (design/audi-s4, design/audi-s6):
// metres, +Y up, +Z forward, steering pivots about Y, wheels spinning about
// X, the hood on its hinge and the body as one node over the wheels. Until
// scripts/optimize-s6.mjs writes the S6's revision into src/data/s6.js its
// URL is null, and the S6 says why it is not available yet. The S6's size is
// its exported bounds: 2,088 mm across the mirrors, 1,463 high, 4,941 long.
export const cars = {
  s4: { url: s4ModelUrl, name: "ali_s4", title: "Ali's 2013 Audi S4", size: [2.02, 1.38, 4.74], wheelRadius: 0.34325, wheelbase: 2.811, unavailable: null },
  s6: {
    url: s6ModelUrl, name: "ali_s6", title: "Ali's 2013 Audi S6", size: [2.088, 1.463, 4.941], wheelRadius: 0.3433, wheelbase: 2.912,
    unavailable: s6ModelUrl ? null : "Ali's S6 is not available yet: its model has not been built.",
  },
};

export const meta = { name: cars.s4.title, size: cars.s4.size, parts: PARTS };

const pending = {};
const sources = {};

const unavailable = (kind) => Object.assign(new Error(cars[kind].unavailable), { code: "car-unavailable", kind });

// Every scene that shows a car shares its one download. A failed request
// can be retried; each mounted scene gets its own disposable GPU resources.
// Only the S4 reports to the city's loading bar: the S6 is the garage's. A
// car that is not available rejects at once and fetches nothing.
export function preloadCar(kind = "s4") {
  if (cars[kind].unavailable) return Promise.reject(unavailable(kind));
  if (!pending[kind]) {
    const progress = kind === "s4" ? (e) => markBytes("car", e.loaded, e.total) : undefined;
    pending[kind] = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(cars[kind].url, progress)
      .then((gltf) => { sources[kind] = gltf.scene; })
      .catch((error) => { pending[kind] = null; throw error; });
  }
  return pending[kind];
}

// No-argument callers keep the synchronous loader contract. Inspection
// callers may supply frame slots and cancellation for owned resource copies.
export function createObject(kind = "s4", options) {
  const steps = createObjectSteps(kind);
  if (options?.between) return createSliced(steps, options);
  let step;
  do { step = steps.next(); } while (!step.done);
  return step.value;
}

async function createSliced(steps, { between, signal }) {
  try {
    for (;;) {
      await between();
      if (signal?.aborted) throw Object.assign(new Error("Garage preparation was disposed."), { code: "garage-disposed" });
      const step = steps.next();
      if (step.done) return step.value;
    }
  } catch (error) {
    steps.return();
    throw error;
  }
}

function* createObjectSteps(kind) {
  const spec = cars[kind];
  if (spec.unavailable) throw unavailable(kind);
  if (!sources[kind]) throw new Error(`Load the Audi ${kind.toUpperCase()} before creating its scene.`);
  const car = sources[kind].clone(true);
  const geometries = new Map();
  const materials = new Map();
  const textures = new Map();
  let complete = false;
  try {
    yield;
    const meshes = [];
    car.traverse((obj) => { if (obj.isMesh) meshes.push(obj); });
    for (const obj of meshes) {
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
      yield;
    }
    yield;
    car.name = spec.name;
    car.userData.parts = Object.fromEntries(PARTS.map((name) => [name, car.getObjectByName(name)]));
    car.userData.wheelRadius = spec.wheelRadius;
    car.userData.wheelbase = spec.wheelbase;
    car.userData.forwardAxis = "+Z";
    const { body, hood_hinge: hood } = car.userData.parts;
    // A strut is four nodes: its base on the body, its mount on the hood, and
    // the tube and rod set between them. The S6 has a second, suffixed `_r`.
    const struts = ["", "_r"].map((suffix) => ["base", "mount", "tube", "rod"].map((part) => car.getObjectByName(`hood_strut_${part}${suffix}`)))
      .filter((nodes) => nodes.some(Boolean));
    const start = new Vector3(), end = new Vector3(), direction = new Vector3(), up = new Vector3(0, 1, 0);
    car.userData.setHoodProgress = (progress) => {
      if (!hood) return;
      hood.rotation.x = -1.1 * Math.max(0, Math.min(1, progress));
      car.updateMatrixWorld(true);
      for (const [base, mount, tube, rod] of struts) {
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
      }
    };
    car.userData.setHoodProgress(0);
    // The body rides over the wheels, so lowering it is one translation: the
    // S6's Virtual Link drop on its air suspension. Metres below the export;
    // the caller clamps it to the car's real clearance.
    const rideHeight = body.position.y;
    car.userData.setLowering = (metres) => {
      body.position.y = rideHeight - metres;
    };
    car.userData.dispose = () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    };
    complete = true;
    return car;
  } finally {
    if (!complete) {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    }
  }
}
