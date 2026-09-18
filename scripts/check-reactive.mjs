// The lighting must stay local, stop in a hidden tab, and find consumers
// mounted by the intro and sound toggle. Exercise the real loop with a
// controlled analyser and animation clock, without playing audio in Node.
// Run with: node scripts/check-reactive.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../src/lib/reactive.js", import.meta.url), "utf8")
  .replace(/^import .* from "\.\/ambient";$/m, "")
  .replace("export function startReactive", "function startReactive");
const writes = [];
const makeElement = (name) => {
  const values = {};
  return {
    nodeType: 1,
    values,
    style: { setProperty(key, value) { writes.push({ name, key, value }); values[key] = value; } },
  };
};
const root = makeElement("html");
const sky = makeElement("sky");
let consumers = [sky];
let queries = 0;
let levels = { bass: 0, level: 0 };
let playing = false;
const frames = new Map();
let nextFrame = 0;
const window = new EventTarget();
const document = Object.assign(new EventTarget(), {
  hidden: false,
  documentElement: root,
  body: {},
  querySelectorAll(selector) {
    assert.equal(selector, "[data-reactive]");
    queries++;
    return consumers;
  },
});
let observer;
const startReactive = runInNewContext(`${source}\nstartReactive`, {
  window, document,
  AMBIENT_EVENT: "ambient",
  getLevels: () => levels,
  isPlaying: () => playing,
  requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
  cancelAnimationFrame(id) { frames.delete(id); },
  MutationObserver: class {
    constructor(callback) { observer = this; this.callback = callback; }
    observe(target, options) {
      assert.equal(target, document.body);
      assert.equal(options.attributes, undefined, "style writes must not trigger discovery");
    }
    disconnect() { this.disconnected = true; }
  },
});
const ambient = (value) => {
  playing = value;
  window.dispatchEvent(new CustomEvent("ambient", { detail: { playing } }));
};
const frame = () => {
  assert.equal(frames.size, 1, "exactly one lighting loop");
  const [id, callback] = frames.entries().next().value;
  frames.delete(id);
  callback();
};
const visibility = (hidden) => {
  document.hidden = hidden;
  document.dispatchEvent(new Event("visibilitychange"));
};

const cleanup = startReactive();
assert.equal(frames.size, 0, "silence must not schedule frames");
assert.equal(sky.values["--bass"], "0.000");
ambient(true);
ambient(true);
levels = { bass: 0.04, level: 0.08 };
const beforeQuietFrame = writes.length;
frame();
assert.equal(writes.length, beforeQuietFrame, "sub-threshold changes must not write");
frame();
assert.equal(sky.values["--bass"], "0.000", "bass keeps its independent dead-band");
assert.equal(sky.values["--level"], "0.051", "small changes accumulate since the last write");
levels = { bass: 1, level: 1 };
frame();
assert.equal(sky.values["--bass"], "0.711", "bass preserves its fast attack");
assert.equal(sky.values["--level"], "0.431", "level preserves its slower attack");
levels = { bass: 0, level: 0 };
frame();
assert.equal(sky.values["--bass"], "0.626", "bass preserves its slow decay");
assert.equal(sky.values["--level"], "0.388", "level preserves its slow decay");
assert.equal(queries, 1, "animation frames must not query the document");
assert.equal(writes.some(({ name }) => name === "html"), false, "never write on the document root");

const vu = makeElement("vu");
consumers = [sky, vu];
observer.callback([{ addedNodes: [vu], removedNodes: [] }]);
assert.deepEqual(vu.values, sky.values, "new consumers inherit the last displayed values immediately");
const beforeTextChange = queries;
observer.callback([{ addedNodes: [{ nodeType: 3 }], removedNodes: [] }]);
assert.equal(queries, beforeTextChange, "text decoding must not rediscover consumers");
consumers = [vu];
observer.callback([{ addedNodes: [], removedNodes: [sky] }]);
const oldSky = { ...sky.values };
frame();
assert.deepEqual(sky.values, oldSky, "unmounted consumers must be released");

visibility(true);
assert.equal(frames.size, 0, "hiding cancels the loop");
ambient(true);
assert.equal(frames.size, 0, "playback events cannot start a hidden loop");
visibility(false);
frame();
ambient(false);
assert.equal(frames.size, 0);
assert.deepEqual(vu.values, { "--bass": "0.000", "--level": "0.000" }, "silence bypasses the dead-band");
visibility(true);
visibility(false);
assert.equal(frames.size, 0, "showing a silent tab must not start a loop");

ambient(true);
cleanup();
assert.equal(observer.disconnected, true);
assert.equal(frames.size, 0);
ambient(true);
visibility(false);
assert.equal(frames.size, 0, "cleanup removes both event listeners");
console.log("Reactive lighting: locality, smoothing, dead-band, mounts, visibility and cleanup passed.");
