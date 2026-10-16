// The visit inside the garage is a timeline of numbers (src/data/world.js)
// read by a route (src/world/garage.js), and the kit's anchors stand in for
// the plan's numbers as they arrive. Nothing but this check notices when
// they drift apart. It asserts:
//
//   the six stations, in the plan's order at the plan's progress, each on a
//   stretch that holds its own pose, and the S6's beats on theirs;
//   the timeline runs 0 to 1 in order, every path joins the hold before it
//   to the hold after it, and names poses and paths that exist;
//   the hoods are open over their bays' holds and shut before the camera
//   leaves, and the S6 is at normal height at its stance's first hold,
//   lowered at its second and back before its hood opens;
//   the route is continuous at every progress on both a landscape and a
//   portrait screen (no step larger than a glide makes), lands exactly on
//   each hold, and under reduced motion only ever shows a hold;
//   the flights in and out cross the real door's opening;
//   where the kit has a garage camera it has all four of its names.
//
// And it reports which poses and paths are still the plan's stand-ins: a
// stand-in passes this check but is never evidence of a framing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let world;
let garage;
let three;
try {
  [world, garage, three] = await Promise.all([vite.ssrLoadModule("/src/data/world.js"), vite.ssrLoadModule("/src/world/garage.js"), vite.ssrLoadModule("three")]);
} finally {
  await vite.close();
}
const { GARAGE_STATIONS, GARAGE_BEATS, GARAGE_POSES, GARAGE_ROUTES, GARAGE_TIMELINE, GARAGE_STATES } = world;
const { createGarageVisit, rampAt, stretchAt } = garage;
const { Vector3, Quaternion } = three;

const failures = [];
const check = (name, fn) => {
  try {
    fn();
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
  }
};

// ---- the timeline -------------------------------------------------------------
check("stations", () => {
  assert.deepEqual(GARAGE_STATIONS.map((s) => s.id), ["arrival", "s4", "s4-bay", "s6", "s6-bay", "shop"]);
  assert.deepEqual(GARAGE_STATIONS.map((s) => s.p), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  for (const st of GARAGE_STATIONS) assert.equal(stretchAt(st.p).hold, st.pose, `${st.id} at ${st.p} holds ${stretchAt(st.p).hold ?? "a path"}`);
});
check("beats", () => {
  const want = { "s6-rear": "s6_rear", "s6-front": "s6", "stance-normal": "s6_stance", "stance-lowered": "s6_stance" };
  for (const [id, pose] of Object.entries(want)) assert.equal(stretchAt(GARAGE_BEATS[id]).hold, pose, id);
});
check("timeline", () => {
  let prev = 0;
  GARAGE_TIMELINE.forEach((s, k) => {
    assert.ok(s.to > prev, `stretch ${k} ends at ${s.to} after ${prev}`);
    prev = s.to;
    if (s.hold) assert.ok(GARAGE_POSES[s.hold], `pose ${s.hold}`);
    else {
      assert.ok(s.route in GARAGE_ROUTES, `path ${s.route}`);
      assert.equal(s.from, GARAGE_TIMELINE[k - 1]?.hold, `${s.route} leaves the hold before it`);
      assert.equal(s.into, GARAGE_TIMELINE[k + 1]?.hold, `${s.route} arrives on the hold after it`);
    }
  });
  assert.equal(prev, 1);
  assert.ok(GARAGE_TIMELINE[0].hold && GARAGE_TIMELINE.at(-1).hold, "starts and ends holding");
});
check("states", () => {
  for (const [name, ramps] of Object.entries(GARAGE_STATES)) {
    let prev = 0;
    for (const [a, b] of ramps) {
      assert.ok(a >= prev && b > a && b <= 1, `${name} ramp ${a}..${b}`);
      prev = b;
    }
  }
  const range = (a, b) => Array.from({ length: 21 }, (_, k) => a + ((b - a) * k) / 20);
  for (const p of range(0.3, 0.42)) assert.equal(rampAt(GARAGE_STATES.hood_s4, p), 1, `S4 hood open at ${p}`);
  for (const p of range(0.77, 0.86)) assert.equal(rampAt(GARAGE_STATES.hood_s6, p), 1, `S6 hood open at ${p}`);
  for (const p of [0, 0.2, 0.49, 0.6, 1]) assert.equal(rampAt(GARAGE_STATES.hood_s4, p) + rampAt(GARAGE_STATES.hood_s6, p), 0, `hoods shut at ${p}`);
  assert.equal(rampAt(GARAGE_STATES.lowering, GARAGE_BEATS["stance-normal"]), 0, "normal at its hold");
  assert.equal(rampAt(GARAGE_STATES.lowering, GARAGE_BEATS["stance-lowered"]), 1, "lowered at its hold");
  assert.equal(rampAt(GARAGE_STATES.lowering, 0.73), 0, "back up before its hood opens");
  assert.equal(rampAt(GARAGE_STATES.lowering, 0.67, true), 1, "reduced motion cuts to lowered at .67");
  assert.equal(rampAt(GARAGE_STATES.lowering, 0.669, true), 0, "and not before");
});

// ---- the kit's anchors --------------------------------------------------------
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
await MeshoptDecoder.ready;
const assetsSrc = readFileSync("src/data/world-assets.js", "utf8");
const coreOf = (tier) => `public${assetsSrc.match(new RegExp(`${tier}: "(/scenes/world/world-${tier}\\.glb)`))[1]}`;
const anchorSets = {};
for (const tier of ["high", "phone"]) {
  const doc = await io.read(coreOf(tier));
  const anchors = new Map();
  for (const node of doc.getRoot().listNodes()) {
    const name = node.getName();
    if (!/^(cam_|anchor_)garage/.test(name)) continue;
    const m = node.getWorldMatrix();
    anchors.set(name, { position: new Vector3(m[12], m[13], m[14]), quaternion: new Quaternion(), extras: node.getExtras() });
  }
  anchorSets[tier] = anchors;
}
check("kit cameras are whole", () => {
  for (const [tier, anchors] of Object.entries(anchorSets)) {
    const keys = new Set([...anchors.keys()].map((n) => n.match(/^cam_garage_([a-z0-9_]+?)(_target)?(_portrait)?$/)?.[1]).filter((k) => k && k in GARAGE_POSES));
    for (const k of keys) {
      for (const suffix of ["", "_target", "_portrait", "_target_portrait"]) assert.ok(anchors.has(`cam_garage_${k}${suffix}`), `${tier}: cam_garage_${k}${suffix}`);
    }
  }
});

// ---- the route ----------------------------------------------------------------
const OPENING = { x: 452, z0: -218, z1: -212, height: 4.6 };
const placeholders = new Set();
for (const [tier, anchors] of Object.entries(anchorSets)) {
  const visit = createGarageVisit(anchors);
  visit.placeholders.forEach((p) => placeholders.add(`${tier}:${p}`));
  for (const aspect of [16 / 10, 390 / 844]) {
    const tag = `${tier} ${aspect < 1 ? "portrait" : "landscape"}`;
    check(`${tag} continuity`, () => {
      // A route that is continuous takes half the step at twice the
      // samples; a break, or a turn on the spot, takes the same step
      // however finely it is sampled. The gaze is measured as where the
      // camera looks 4 m ahead, so a turn counts as much as a move.
      const steps = (N) => {
        const a = visit.at(0, aspect);
        const da = new Vector3();
        const out = new Float64Array(N);
        for (let k = 1; k <= N; k++) {
          const b = visit.at(k / N, aspect);
          const db = new Vector3().subVectors(b.target, b.position).normalize().multiplyScalar(4);
          if (k === 1) da.subVectors(a.target, a.position).normalize().multiplyScalar(4);
          out[k - 1] = Math.max(a.position.distanceTo(b.position), da.distanceTo(db));
          a.position.copy(b.position);
          da.copy(db);
        }
        return out;
      };
      const coarse = steps(10000);
      const fine = steps(20000);
      for (let k = 0; k < coarse.length; k++) {
        const pair = Math.max(fine[2 * k], fine[2 * k + 1]);
        if (coarse[k] > 0.01) assert.ok(pair < 0.7 * coarse[k], `a break at p=${(k + 1) / 10000}: ${coarse[k].toFixed(3)} m, ${pair.toFixed(3)} m at twice the samples`);
      }
      // And a turn of more than 90 degrees inside a few millimetres of
      // travel is a path that doubles back on itself. (Stopping at a hold
      // and leaving the way it came is not: the heading starts again.)
      const a = visit.at(0, aspect);
      const prevDir = new Vector3();
      for (let k = 1; k <= 4000; k++) {
        const b = visit.at(k / 4000, aspect);
        const dir = new Vector3().subVectors(b.position, a.position);
        if (dir.length() < 1e-7) prevDir.set(0, 0, 0);
        else if (dir.length() > 1e-3) {
          dir.normalize();
          if (prevDir.lengthSq() > 0) assert.ok(dir.dot(prevDir) > -0.2, `the path doubles back at p=${k / 4000}`);
          prevDir.copy(dir);
        }
        a.position.copy(b.position);
      }
    });
    check(`${tag} holds`, () => {
      let start = 0;
      for (const s of GARAGE_TIMELINE) {
        if (s.hold) {
          const want = visit.pose(s.hold, aspect);
          for (const p of [start, (start + s.to) / 2, s.to]) {
            const got = visit.at(p, aspect);
            assert.ok(got.position.distanceTo(want.position) < 1e-6 && got.target.distanceTo(want.target) < 1e-6, `${s.hold} at ${p}`);
          }
        }
        start = s.to;
      }
    });
    check(`${tag} reduced motion`, () => {
      const holds = GARAGE_TIMELINE.filter((s) => s.hold).map((s) => visit.pose(s.hold, aspect));
      for (let k = 0; k <= 1000; k++) {
        const got = visit.at(k / 1000, aspect, undefined, true);
        assert.ok(holds.some((h) => h.position.distanceTo(got.position) < 1e-6), `a path shown at p=${k / 1000}`);
      }
    });
    check(`${tag} door`, () => {
      const inside = (pt) => pt.z > OPENING.z0 && pt.z < OPENING.z1 && pt.y > 0 && pt.y < OPENING.height;
      const entry = visit.entry(aspect);
      const exit = visit.exit(aspect);
      assert.ok(entry.some((pt) => pt.x < OPENING.x) && entry.some((pt) => pt.x > OPENING.x), "entry crosses the door's plane");
      assert.ok(exit.some((pt) => pt.x < OPENING.x) && exit.some((pt) => pt.x > OPENING.x), "exit crosses the door's plane");
      for (const pts of [entry, exit]) {
        for (let k = 1; k < pts.length; k++) {
          const [a, b] = [pts[k - 1], pts[k]];
          if ((a.x - OPENING.x) * (b.x - OPENING.x) >= 0) continue;
          const t = (OPENING.x - a.x) / (b.x - a.x);
          const at = a.clone().lerp(b, t);
          assert.ok(inside(at), `crosses at z=${at.z.toFixed(2)} y=${at.y.toFixed(2)}, outside the opening`);
        }
      }
    });
  }
}

if (placeholders.size) {
  console.log(`check:garage: ${placeholders.size} pose/path stand-ins still from the plan, not the kit:`);
  console.log(`  ${[...placeholders].sort().join(", ")}`);
}
if (failures.length) {
  console.error(`check:garage failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("check:garage passed");
