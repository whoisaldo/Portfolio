// scripts/check-audio-single.mjs: asserts the background track can never
// double up.
//
//   npm run check:audio
//
// WHY THIS EXISTS
//
// It caught a real bug and it is here so that bug cannot come back. The sound
// prompt started the music, and the callback the prompt invoked started it
// again. Both calls passed the "is it already playing?" check, because at that
// moment nothing was playing yet: the 3.9 MB fetch was still in flight. So the
// site fetched and decoded the same file twice, and each call's stopAmbient()
// tore down the source the other had just created. Two decodes, and silence.
//
// The failure mode is specifically about the async gap. A guard on the
// endpoints cannot see it. That makes it exactly the kind of thing worth an
// assertion rather than a manual listen, because "did that play twice?" is
// almost impossible to hear when the two copies are in sync.
//
// The same shape as scripts/check-reel-math.mjs: plain node, no test runner,
// no dependency. It stands up a fake Web Audio API, imports the real module,
// and counts what actually got created.
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// A Web Audio stand-in that records rather than makes noise
// ---------------------------------------------------------------------------
const log = { fetches: 0, sourcesStarted: 0, sourcesStopped: 0, oscillators: 0 };

const param = () => ({
  value: 0,
  setValueAtTime() { return this; },
  exponentialRampToValueAtTime() { return this; },
  setTargetAtTime() { return this; },
  cancelScheduledValues() { return this; },
});

const node = (extra = {}) => ({
  connect(dest) { return dest; },
  disconnect() {},
  ...extra,
});

class FakeContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.sampleRate = 48000;
  }
  createGain() { return node({ gain: param() }); }
  createBiquadFilter() { return node({ type: "", frequency: param(), Q: { value: 0 } }); }
  createOscillator() {
    log.oscillators++;
    return node({
      type: "", frequency: param(), detune: { value: 0 },
      start() {}, stop() {},
    });
  }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  createBufferSource() {
    return node({
      buffer: null, loop: false,
      start() { log.sourcesStarted++; },
      stop() { log.sourcesStopped++; },
    });
  }
  async decodeAudioData() { return { duration: 247, numberOfChannels: 2 }; }
  async resume() { this.state = "running"; }
}

// The module reads these off `window` and the globals at call time.
globalThis.window = { AudioContext: FakeContext };
globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
};

// Track availability is a parameter of the test: the loop has two code paths
// and both have to be single-instance.
let trackAvailable = true;
globalThis.fetch = async () => {
  log.fetches++;
  // A little latency, because the bug lived entirely inside this await.
  await new Promise((r) => setTimeout(r, 20));
  if (!trackAvailable) return { ok: false, status: 404 };
  return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) };
};

const amb = await import("../src/lib/ambient.js");

const reset = () => {
  amb.stopAmbient();
  log.fetches = 0;
  log.sourcesStarted = 0;
  log.sourcesStopped = 0;
  log.oscillators = 0;
};

const live = () => log.sourcesStarted - log.sourcesStopped;

let failures = 0;
async function check(name, fn) {
  reset();
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}

console.log("\n  background audio: single instance\n");

// ---------------------------------------------------------------------------

await check("three concurrent starts fetch once and leave one source", async () => {
  trackAvailable = true;
  await Promise.all([amb.startAmbient(), amb.startAmbient(), amb.startAmbient()]);
  assert.equal(log.fetches, 1, `fetched ${log.fetches} times, expected 1`);
  assert.equal(live(), 1, `${live()} live sources, expected 1`);
  assert.equal(amb.isPlaying(), true);
});

await check("a start while already playing is a no-op", async () => {
  trackAvailable = true;
  await amb.startAmbient();
  const afterFirst = log.fetches;
  await amb.startAmbient();
  await amb.startAmbient();
  assert.equal(log.fetches, afterFirst, "a redundant start refetched the track");
  assert.equal(live(), 1, `${live()} live sources, expected 1`);
});

await check("stop leaves nothing running", async () => {
  trackAvailable = true;
  await amb.startAmbient();
  amb.stopAmbient();
  assert.equal(live(), 0, `${live()} sources still live after stop`);
  assert.equal(amb.isPlaying(), false);
});

await check("stop then start yields exactly one source again", async () => {
  trackAvailable = true;
  await amb.startAmbient();
  amb.stopAmbient();
  await amb.startAmbient();
  assert.equal(live(), 1, `${live()} live sources, expected 1`);
});

await check("the synth fallback is also single-instance", async () => {
  trackAvailable = false; // no file, so startAmbient falls through to the loop
  await Promise.all([amb.startAmbient(), amb.startAmbient(), amb.startAmbient()]);
  assert.equal(amb.isPlaying(), true, "fallback did not start");
  const afterStart = log.oscillators;
  // One scheduler means one bar's worth of voices queued per pass. Two
  // schedulers would roughly double the rate, which is what this catches.
  await new Promise((r) => setTimeout(r, 400));
  const perPass = log.oscillators - afterStart;
  assert.ok(
    perPass <= 13,
    `${perPass} oscillators queued in 400ms; a second scheduler is running`,
  );
});

await check("a failed fetch never leaves a half-started file source", async () => {
  trackAvailable = false;
  await amb.startAmbient();
  assert.equal(log.sourcesStarted, 0, "started a buffer source despite a 404");
});

// ---------------------------------------------------------------------------
amb.stopAmbient();
console.log("");
if (failures) {
  console.error(`  ${failures} failing\n`);
  process.exit(1);
}
console.log("  all passing\n");
