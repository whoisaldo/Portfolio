// The workshop gate accepts an explicitly empty S6 bay, but a delivered S6
// still needs its own collision body. Exercise the real gate and presentation
// without a renderer so room asset failures cannot hide this regression.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repo = path.resolve(import.meta.dirname, "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "braindance-check-"));
try {
  const file = path.join(temp, "gate.mjs");
  await build({
    stdin: {
      contents: `export { garageIsReady, createGarageGate } from './src/braindance/engine.js';
        export { createGaragePresentation } from './src/world/garage.js';
        export * as THREE from 'three';`,
      resolveDir: repo,
    },
    outfile: file, bundle: true, platform: "node", format: "esm", logLevel: "silent",
    define: { "import.meta.env.DEV": "false", "import.meta.env.BASE_URL": '"/"' },
    loader: { ".avif": "empty", ".jpg": "empty", ".png": "empty", ".webp": "empty", ".svg": "empty", ".mp4": "empty" },
  });
  const { garageIsReady, createGarageGate, createGaragePresentation, THREE } = await import(pathToFileURL(file).href);
  const body = (carId, empty = false) => ({ carId, box: empty ? new THREE.Box3() : new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(1, 1.5, 2)) });
  const adapter = (s6, cars) => ({
    state: { availability: "ready", models: { s4: true, s6 } },
    applyDirectedState() {},
    poses: { at() {}, sample() {}, stateAt() {}, inspection() {} },
    collision: { solids: [], cars: () => cars, clearance() {}, sweep() {}, nearPlane() {} },
  });
  const cases = [
    ["declared empty bay with S4", false, [body("s4")], true],
    ["declared empty bay without cars", false, [], false],
    ["declared empty bay with empty S4", false, [body("s4", true)], false],
    ["declared empty bay cannot use a stray S6 proxy", false, [body("s6")], false],
    ["delivered S6 body", true, [body("s6")], true],
    ["delivered S6 with both bodies", true, [body("s4"), body("s6")], true],
    ["delivered S6 cannot use only S4", true, [body("s4")], false],
    ["delivered S6 with empty S6 body", true, [body("s4"), body("s6", true)], false],
    ["delivered S6 without cars", true, [], false],
    ["undeclared availability cannot use S4", undefined, [body("s4")], false],
    ["null availability cannot use S4", null, [body("s4")], false],
    ["legacy adapter with S6 body", undefined, [body("s6")], true],
  ];
  const failures = [];
  for (const [name, s6, cars, expected] of cases) {
    try { assert.equal(garageIsReady(adapter(s6, cars)), expected, name); }
    catch (error) { failures.push(error); }
  }
  assert.equal(failures.length, 0, failures.map(error => error.message).join("\n"));
  console.log(`PASS ${cases.length} model/body readiness cases`);

  let guards = 0;
  for (const s6 of [false, true]) {
    const ready = () => adapter(s6, [body(s6 ? "s6" : "s4")]);
    for (const availability of ["idle", "loading", "failed", "lost", "unsupported"]) {
      const garage = ready();
      garage.state.availability = availability;
      assert.equal(garageIsReady(garage), false, `${availability}, S6=${s6}`);
      guards++;
    }
    for (const [owner, key] of [[null, "applyDirectedState"], ...["at", "sample", "stateAt", "inspection"].map(key => ["poses", key]), ...["solids", "cars", "clearance", "sweep", "nearPlane"].map(key => ["collision", key])]) {
      const garage = ready();
      delete (owner ? garage[owner] : garage)[key];
      assert.equal(garageIsReady(garage), false, `missing ${owner ?? "garage"}.${key}, S6=${s6}`);
      guards++;
    }
  }
  console.log(`PASS ${guards} existing readiness/API guards`);

  const tick = () => new Promise(resolve => setImmediate(resolve));
  const statuses = [], resumed = [];
  let garage = adapter(false, [body("s4")]);
  garage.state.availability = "loading";
  let finishLoad;
  garage.prepare = () => new Promise(resolve => { finishLoad = resolve; });
  const gate = createGarageGate({ getGarage: () => garage, onStatus: status => statuses.push(status), onReady: request => resumed.push(request) });
  gate.request(190, true);
  gate.request(200, true);
  gate.setPlaying(false);
  await tick();
  assert.deepEqual(resumed, []);
  garage.state.availability = "ready";
  finishLoad();
  await tick();
  assert.deepEqual(resumed, [{ time: 200, playing: false }]);
  assert.deepEqual(statuses, ["loading", "idle"]);
  console.log("PASS empty-bay preparation resumes the latest paused seek");

  garage = adapter(true, [body("s4")]);
  garage.prepare = async () => {};
  garage.retry = async () => {};
  gate.request(210, true);
  await tick();
  assert.equal(statuses.at(-1), "failed");
  assert.equal(gate.pending.time, 210);
  assert.equal(resumed.length, 1);
  garage.collision.cars = () => [body("s4"), body("s6", true)];
  gate.request(211, true, true);
  await tick();
  assert.equal(statuses.at(-1), "failed");
  assert.equal(resumed.length, 1);
  garage.collision.cars = () => [body("s4"), body("s6")];
  gate.request(212, true, true);
  await tick();
  assert.deepEqual(resumed.at(-1), { time: 212, playing: true });
  assert.equal(gate.pending, null);
  console.log("PASS delivered S6 stays on Retry until its non-empty body arrives");

  const scene = new THREE.Scene();
  const rows = [body("s4"), body("s6")];
  const proxy = new THREE.Group();
  const flashes = [];
  let supplied;
  const createCars = context => {
    supplied = context;
    context.scene.add(proxy);
    return { ready: Promise.resolve(), stats: { s6: {} }, bounds: () => rows, anchors: () => rows, occluders: () => rows, pick: () => proxy.visible ? rows[1] : null, flash: id => flashes.push(id), dispose() {} };
  };
  const omitted = createGaragePresentation(createCars, { scene }, { s6Available: false });
  await omitted.ready;
  assert.equal(supplied.placeholder, true);
  assert.equal(proxy.parent.visible, false);
  for (const key of ["bounds", "anchors", "occluders"]) assert.deepEqual(omitted[key]().map(row => row.carId), ["s4"]);
  assert.equal(omitted.pick(), null);
  omitted.flash("s6");
  assert.deepEqual(flashes, []);
  omitted.dispose();
  assert.equal(scene.children.length, 0);
  const actual = createGaragePresentation(createCars, { scene }, { s6Available: true });
  assert.equal(supplied.scene, scene);
  assert.equal(supplied.placeholder, undefined);
  assert.ok(actual.bounds().some(row => row.carId === "s6" && !row.box.isEmpty()));
  actual.flash("s6");
  assert.deepEqual(flashes, ["s6"]);
  actual.dispose();
  console.log("PASS unavailable S6 is hidden and excluded from physical queries; a delivered S6 uses its real adapter");
  console.log("Braindance readiness OK");
} finally {
  await rm(temp, { recursive: true, force: true });
}
