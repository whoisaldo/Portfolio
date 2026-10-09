// src/lib/garage3d.js: the door to the 3D garage.
//
// Same shape as drift.js: three.js is never in the main bundle, and the
// garage's scene is only fetched when the reader switches the bay to the
// model. The car itself is the GLB the intro drifts (src/three/car), so a
// reader who watched the intro already has it; the promise waits for it
// either way. The promise is shared so a second switch never fetches twice,
// and a failed load resets so a retry gets a second chance.
let promise = null;

export function loadGarage3d() {
  if (!promise) {
    promise = import("./garage-scene.js")
      .then(async (mod) => {
        await mod.preloadGarage();
        return mod;
      })
      .catch((err) => {
        promise = null;
        throw err;
      });
  }
  return promise;
}

/**
 * The garage's 3D, built and compiled, for the door's loading screen to wait
 * on. GarageModel says it is expected as it mounts and settles it once its
 * scene is warm (or has failed: the door must not wait on a garage that will
 * never come).
 */
let settle = null;
let expected = false;
export const garageWarm = new Promise((resolve) => {
  settle = resolve;
});
export function expectGarage() {
  expected = true;
}
export function garageExpected() {
  return expected;
}
export function settleGarage() {
  settle?.();
}
