// The intro's drift moved out of src/lib/drift-scene.js into
// src/three/drift/path.js so the live city and the plate fallback share it.
// Its keys and spline were meant to move byte for byte, and this holds them
// to it: the original evaluator is read out of main's drift-scene.js, the new
// one is imported, and both are sampled at the same 1,083 points (361 times
// across the drift's first 3.8 seconds, at three viewport scales: a 16:10
// laptop, a 4:3 tablet and a 390x844 phone). Every position, heading, slip
// and speed must be the same number, not a close one.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const ref = (() => {
  for (const name of ["main", "origin/main"]) {
    try {
      return git("merge-base", "HEAD", name);
    } catch {
      // try the next name
    }
  }
  throw new Error("No main branch to compare the drift against.");
})();
const original = git("show", `${ref}:src/lib/drift-scene.js`);
const start = original.indexOf("const KEYS = [");
const endMarker = "  _pose.speed = Math.hypot(vx, vz);\n  return _pose;\n}\n";
const end = original.indexOf(endMarker);
assert.ok(start >= 0 && end > start, "Could not find the drift evaluator in main's drift-scene.js.");
const source = original.slice(start, end + endMarker.length) + "\nexport { poseAt };\n";
const before = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const after = await import("../src/three/drift/path.js");

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const scales = [1440 / 900, 1024 / 768, 390 / 844].map((aspect) => clamp(aspect / 1.6, 0.4, 1));
const STEPS = 360;
let samples = 0;
for (const xScale of scales) {
  for (let i = 0; i <= STEPS; i++) {
    const d = (3.8 * i) / STEPS;
    const a = { ...before.poseAt(d, xScale) };
    const b = { ...after.poseAt(d, xScale) };
    for (const key of ["x", "z", "heading", "slip", "speed"]) {
      assert.ok(Object.is(a[key], b[key]), `Drift differs at t=${d}, xScale=${xScale}: ${key} ${a[key]} vs ${b[key]}`);
    }
    samples++;
  }
}
assert.equal(samples, 1083);

// The parking curve starts where the spline ends, going the same way at
// the same speed: C1 at 3.8 seconds.
const road = { x: -8.6, z: -50, tx: 0, tz: -1 };
for (const xScale of scales) {
  const end = { ...after.poseAt(after.PARK_FROM, xScale) };
  const park = after.parkingCurve(xScale, road);
  const p0 = park.at(0, {});
  const p1 = park.at(0.01, {});
  assert.ok(Math.abs(p0.x - end.x) < 1e-9 && Math.abs(p0.z - end.z) < 1e-9, "Parking curve does not start where the drift ends.");
  const heading = Math.atan2(p1.x - p0.x, p1.z - p0.z);
  assert.ok(Math.abs(heading - end.heading) < 2e-3, "Parking curve leaves at a different heading.");
  assert.ok(Math.abs(park.speed - end.speed) < 1e-9, "Parking curve leaves at a different speed.");
}
console.log(`Drift OK. ${samples.toLocaleString()} samples identical to ${ref.slice(0, 7)} for t <= 3.8 s; the parking curve joins C1.`);
