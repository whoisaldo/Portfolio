// src/braindance/roam/nav-worker.js: the map is made off the main thread,
// so the recording plays on (and no frame is late) while it is.
import { buildNav } from "./nav-build.js";

self.onmessage = (event) => {
  try {
    const nav = buildNav(event.data, (p) => self.postMessage({ progress: p }));
    const buffers = [];
    for (const t of nav.tiles) {
      buffers.push(t.y.buffer, t.m.buffer);
      if (t.xc) buffers.push(t.xc.buffer, t.xy.buffer, t.xm.buffer);
    }
    self.postMessage({ nav }, buffers);
  } catch (err) {
    self.postMessage({ error: String(err?.stack ?? err) });
  }
};
