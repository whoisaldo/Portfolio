// src/lib/drift.js: the door to the 3D car.
//
// three.js is the largest thing this site ships and exactly one screen needs
// it, for about four seconds, so it is never in the main bundle. This is the
// one place it is imported, dynamically, and the promise is shared: the gate
// starts the download while the reader is still deciding whether to turn the
// sound on, and the cinematic picks up the same promise when it needs the
// scene. A failed load resets itself so a retry (the footer's replay, say)
// gets a second chance rather than a cached rejection.
let promise = null;

export function loadDrift() {
  if (!promise) {
    promise = import("./drift-scene.js").then(async (module) => {
      await module.preloadCar();
      return module;
    }).catch((err) => {
      promise = null;
      throw err;
    });
  }
  return promise;
}
