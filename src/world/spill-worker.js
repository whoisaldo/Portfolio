// src/world/spill-worker.js: the core city's light bake, off the page's
// thread (src/world/spill.js finishElsewhere): the sources and lamps in,
// the maps and what was added (for the districts' bakes after it) out.
import { createBakeCore } from "./spill-core.js";

self.onmessage = ({ data: { sources, points } }) => {
  const core = createBakeCore();
  core.add(sources);
  for (const p of points) core.addPoints(p);
  const maps = core.finish();
  const state = core.state();
  self.postMessage({ maps, state }, [maps.spill.buffer, maps.streaks.buffer, state.pool.buffer, state.streak.buffer, state.lamps.buffer, state.hung.buffer]);
};
