// src/world/load.js: the door to the city.
//
// Same shape as src/lib/drift.js. three.js, postprocessing and the city's
// own code are one lazy chunk, and the city's geometry is one GLB per tier;
// neither is ever in the main bundle, and neither delays the plate, which is
// the page's first paint. Two callers start this: the door, while the reader
// is deciding about sound (the seconds that panel is on screen are the
// seconds the download needs), and WorldMount, after first paint, for a
// reader who never sees the door. They share one promise. A failure resets
// it, so the next caller tries again instead of inheriting a rejection.
import { pickTier } from "./quality";
import { markLoaded } from "./progress";

let promise = null;
let tierLoaded = null;

/** "high" or "phone": the budget table in src/world/quality.js decides. */
export function loadWorld(tier) {
  if (promise && tierLoaded !== tier) promise = null;
  if (!promise) {
    tierLoaded = tier;
    promise = import("./world-scene.js")
      .then(async (module) => {
        markLoaded("code");
        await module.preloadWorld(tier);
        return module;
      })
      .catch((err) => {
        promise = null;
        throw err;
      });
  }
  return promise;
}

/** For the door: start the download while the reader decides, but only
 *  when the city is on for this visit (WorldMount has said so on <html>). */
export function prefetchWorld() {
  if (typeof document === "undefined" || document.documentElement.dataset.world !== "on") return;
  loadWorld(pickTier()).catch(() => {});
}
