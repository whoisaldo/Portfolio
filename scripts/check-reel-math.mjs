// scripts/check-reel-math.mjs: asserts the reel's index<->scroll invariant.
//
// The bug this guards against shipped to production: the rail's click target
// and the panel's index were computed by two different formulas, so clicking
// "03" showed project 05. Run this whenever reelMath.js changes.
//
//   node scripts/check-reel-math.mjs

import { easedIndex, progressForIndex, wrapperVh, PER_VH } from "../src/lib/reelMath.js";

let failures = 0;
const fail = (msg) => { console.error("  FAIL " + msg); failures++; };

for (const n of [1, 2, 3, 5, 8, 13]) {
  // 1. Round-trip: clicking rail item i must land on project i.
  for (let i = 0; i < n; i++) {
    const got = Math.round(easedIndex(progressForIndex(i, n), n));
    if (got !== i) fail(`n=${n} round-trip: index ${i} -> ${got}`);
  }

  // 2. Monotonic and in range across the whole scroll.
  let prev = -Infinity;
  for (let s = 0; s <= 1000; s++) {
    const v = easedIndex(s / 1000, n);
    if (Number.isNaN(v)) fail(`n=${n} NaN at p=${s / 1000}`);
    if (v < prev - 1e-9) fail(`n=${n} non-monotonic at p=${s / 1000}: ${prev} -> ${v}`);
    if (v < 0 || v > n - 1) fail(`n=${n} out of range at p=${s / 1000}: ${v}`);
    prev = v;
  }

  // 3. Endpoints are exact: the last project must be fully reachable.
  if (easedIndex(0, n) !== 0) fail(`n=${n} p=0 -> ${easedIndex(0, n)}, expected 0`);
  if (easedIndex(1, n) !== n - 1) fail(`n=${n} p=1 -> ${easedIndex(1, n)}, expected ${n - 1}`);

  // 4. Out-of-band progress clamps rather than extrapolating.
  if (easedIndex(-0.5, n) !== 0) fail(`n=${n} negative progress did not clamp`);
  if (easedIndex(1.5, n) !== n - 1) fail(`n=${n} progress > 1 did not clamp`);

  // 5. Every project gets a real dwell: no project is only ever mid-wipe.
  const settled = new Set();
  for (let s = 0; s <= 4000; s++) {
    const v = easedIndex(s / 4000, n);
    if (Math.abs(v - Math.round(v)) < 1e-9) settled.add(Math.round(v));
  }
  if (settled.size !== n) fail(`n=${n} only ${settled.size}/${n} projects have a settled frame`);
}

console.log(`wrapper for 8 projects: ${wrapperVh(8)}vh (${PER_VH}vh budget each)`);
console.log(failures === 0 ? "reel math OK" : `${failures} failure(s)`);
process.exit(failures ? 1 : 0);
