// src/world/traffic-near-worker.js: the close-up models (traffic-near-build.js)
// made off the page: { kind, parts } in, { kind, attributes } out, each
// attribute's array handed over, not copied.
import { nearBody } from "./traffic-near-build.js";

self.onmessage = ({ data: { kind, parts } }) => {
  try {
    const geometry = nearBody(kind, parts);
    const attributes = {};
    const handed = [];
    for (const [name, a] of Object.entries(geometry.attributes)) {
      attributes[name] = [a.array, a.itemSize];
      handed.push(a.array.buffer);
    }
    self.postMessage({ kind, attributes }, handed);
  } catch {
    self.postMessage({ kind, attributes: null });
  }
};
