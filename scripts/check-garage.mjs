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

const vite = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] }, appType: "custom", logLevel: "error" });
let world;
let garage;
let three;
let propsModule;
let materialModule;
try {
  [world, garage, three, propsModule, materialModule] = await Promise.all([vite.ssrLoadModule("/src/data/world.js"), vite.ssrLoadModule("/src/world/garage.js"), vite.ssrLoadModule("three"), vite.ssrLoadModule("/src/world/props.js"), vite.ssrLoadModule("/src/world/garage-materials.js")]);
} finally {
  await vite.close();
}
const { GARAGE_STATIONS, GARAGE_BEATS, GARAGE_POSES, GARAGE_ROUTES, GARAGE_TIMELINE, GARAGE_STATES } = world;
const { createGarageVisit, createGarageCollision, rampAt, stretchAt } = garage;
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
    check(`${tag} route interruption and doorway`, () => {
      for (const start of [0, .1, .2, .275, .4, .465, .515, .6, .67, .8, .9, 1]) {
        const route = visit.transition(start, aspect);
        assert.ok(route.outside().position.x < 450, "outdoor flight begins at the street node, clear of the facade");
        let previous = visit.at(start, aspect);
        let crossed = false;
        for (let n = 0; n < 1000; n++) {
          const state = route.sample(1 / 120);
          const next = state.pose;
          assert.ok(previous.position.distanceTo(next.position) < 2, `route must not cut: start=${start} frame=${n} p=${state.p} u=${state.u} ${previous.position.toArray()} -> ${next.position.toArray()}`);
          if ((previous.position.x - OPENING.x) * (next.position.x - OPENING.x) < 0) {
            const hit = previous.position.clone().lerp(next.position, (OPENING.x - previous.position.x) / (next.position.x - previous.position.x));
            assert.ok(hit.y > .45 && hit.y < OPENING.height - .45 && hit.z > OPENING.z0 + .45 && hit.z < OPENING.z1 - .45, `door clearance at ${hit.toArray()}`);
            crossed = true;
          }
          previous = next;
          if (state.done) break;
        }
        assert.ok(crossed, `exit from ${start} crosses the doorway`);
        // Reverse both in the visit and in the doorway segment. The first
        // sample must continue from the last, then land at the saved pose.
        for (const delay of [.4, start * 4 + .8]) {
          const interrupted = visit.transition(start, aspect);
          let before;
          for (let t = 0; t < delay; t += 1 / 120) before = interrupted.sample(1 / 120).pose;
          interrupted.reverse(true);
          const first = interrupted.sample(1 / 120);
          assert.ok(before.position.distanceTo(first.pose.position) < 2, "return must reverse in place");
          let state = first;
          for (let n = 0; n < 1000 && !state.done; n++) state = interrupted.sample(1 / 120);
          assert.ok(state.done && state.returning);
          assert.ok(state.pose.position.distanceTo(visit.at(start, aspect).position) < 1e-6, "return restores saved pose");
        }
      }
    });
    check(`${tag} inspection replacements use graph edges`, () => {
      for (const start of [.1, .275, .465, .56, .63, .735, .9]) {
        const cursor = visit.navigator(start, aspect);
        let before = visit.at(start, aspect);
        cursor.request("s4_rear");
        let state;
        for (let n = 0; n < 2000; n++) {
          if (n === 7) cursor.request("s6_bay");
          if (n === 19) cursor.request("s4_rear");
          state = cursor.sample(1 / 240);
          assert.ok(before.position.distanceTo(state.pose.position) < .13, "replacement must stay on current edge");
          if (state.location.edge) {
            const edge = [...GARAGE_TIMELINE.filter((s) => s.route).map((s) => ({ id: s.route, ...s })), { id: "apron_s4rear", from: "arrival", into: "s4_rear" }].find((s) => s.id === state.location.edge);
            assert.ok(edge, "inspection uses a published edge");
            const expected = visit.sample(edge.id, edge.from, edge.into, state.location.u, aspect, { position: new Vector3(), target: new Vector3() });
            assert.ok(expected.position.distanceTo(state.pose.position) < 1e-8);
          }
          before = state.pose;
          if (state.done && n > 19) break;
        }
        assert.ok(state.done);
        assert.ok(state.pose.position.distanceTo(visit.pose("s4_rear", aspect).position) < 1e-8);
        const exit = visit.transition(start, aspect, cursor);
        before = state.pose;
        let crossed = false;
        for (let n = 0; n < 2400; n++) {
          state = exit.sample(1 / 240);
          assert.ok(before.position.distanceTo(state.pose.position) < .13, "inspection exit stays continuous");
          if ((before.position.x - 452) * (state.pose.position.x - 452) < 0) {
            const hit = before.position.clone().lerp(state.pose.position, (452 - before.position.x) / (state.pose.position.x - before.position.x));
            assert.ok(hit.y > .45 && hit.y < 4.15 && hit.z > -217.55 && hit.z < -212.45);
            crossed = true;
          }
          before = state.pose;
          if (state.done) break;
        }
        assert.ok(state.done && crossed && state.pose.position.x < 450);
        exit.reverse(true);
        for (let n = 0; n < 2400; n++) { state = exit.sample(1 / 240); if (state.done) break; }
        assert.ok(state.done && state.pose.position.distanceTo(visit.pose("s4_rear", aspect).position) < 1e-8);
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

// A garage-only prototype and placement must actually produce geometry,
// independently of the core placement table, and retain their sectors.
check("late garage prop placements", () => {
  const { Mesh, BoxGeometry, ShaderMaterial } = three;
  const material = new ShaderMaterial({ uniforms: { uSpill: { value: null } } });
  material.name = "metal";
  const proto = (name) => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
    mesh.userData.proto = name;
    return mesh;
  };
  const wire = (header, records) => {
    let text = JSON.stringify(header);
    if (text.length % 2) text += " ";
    const bytes = new TextEncoder().encode(text);
    const buffer = new ArrayBuffer(4 + bytes.length + records.length * 16);
    new DataView(buffer).setUint32(0, bytes.length, true);
    new Uint8Array(buffer, 4, bytes.length).set(bytes);
    new Int16Array(buffer, 4 + bytes.length).set(records.flat());
    return buffer;
  };
  const core = proto("core_test");
  const pack = proto("garage_test");
  const system = propsModule.createProps([core], wire({ protos: [{ name: "core_test", box: [1, 1, 1] }], count: 0 }, []));
  const buffer = wire({ protos: [{ name: "garage_test", box: [1, 1, 1] }], count: 2, sectorRuns: [{ sector: "garage_s4", start: 0, count: 1 }, { sector: "garage_s6", start: 1, count: 1 }] }, [[0, 9240, 0, -4300, 0, 100, 1000, 0], [0, 9240, 0, -4440, 0, 100, 1000, 0]]);
  const held = system.addPlacements([pack], buffer, { hold: true });
  assert.equal(held.count, 2);
  assert.equal(system.group.children.length, 0, "placements stay hidden before commit");
  const steps = held.prepare();
  let result;
  while (!(result = steps.next()).done);
  assert.equal(result.value.length, 2);
  held.commit();
  held.commit();
  assert.equal(system.group.children.length, 2, "idempotent commit");
  for (const sector of ["garage_s4", "garage_s6"]) {
    const group = system.group.getObjectByName(`props_${sector}`);
    assert.ok(group);
    group.traverse((mesh) => { if (mesh.isMesh) assert.equal(mesh.userData.sector, sector); });
  }
  const bad = wire({ protos: [{ name: "garage_test", box: [1, 1, 1] }], count: 1, sectorRuns: [] }, [[0, 9240, 0, -4300, 0, 100, 1000, 0]]);
  assert.throws(() => system.addPlacements([pack], bad), /sectors/);
  system.dispose();
  core.geometry.dispose();
  pack.geometry.dispose();
  material.dispose();
});
check("camera collision is independent of visibility", () => {
  const { Box3, Vector3 } = three;
  const box = new Box3(new Vector3(2, 0, -1), new Vector3(3, 3, 1));
  const collision = createGarageCollision({ solids: () => [{ name: "wall", box, visible: false }] });
  assert.equal(collision.clearance(new Vector3(0, 1, 0)), 2);
  const hit = collision.sweep(new Vector3(0, 1, 0), new Vector3(5, 1, 0), .45);
  assert.equal(hit.ok, false);
  assert.ok(Math.abs(hit.point.x - 1.55) < 1e-6);
  const clear = collision.sweep(new Vector3(0, 5, 0), new Vector3(5, 5, 0), .45);
  assert.equal(clear.ok, true);
  const pose = { position: new Vector3(1.8, 1, 0), target: new Vector3(3, 1, 0), fov: 60 };
  assert.equal(collision.nearPlane(pose, 16 / 10, .25), 0);
  const rolled = createGarageCollision({ solids: () => [{ box: new Box3(new Vector3(2.5, -.1, -1.1), new Vector3(3.5, .1, -.9)) }] });
  const view = { position: new Vector3(), target: new Vector3(0, 0, -1), fov: 90 };
  assert.equal(rolled.nearPlane(view, 4, 1), 0);
  assert.ok(rolled.nearPlane({ ...view, roll: Math.PI / 2 }, 4, 1) > 1, "near plane follows camera roll");
  collision.solids[0].box.min.x = -50;
  assert.equal(collision.clearance(new Vector3(0, 1, 0)), 2, "read-only snapshots do not mutate collision");
});
check("late external map recovery", () => {
  const { MeshStandardMaterial, Texture } = three;
  const registry = materialModule.createGarageMaterials({});
  const source = new MeshStandardMaterial();
  source.name = "NCW_garage_shop_photos";
  source.userData = { runtime: "photo_board", slots: '["baseColor"]', params: '{}' };
  const first = registry.forName(source);
  assert.deepEqual(registry.missing, ["NCW_garage_shop_photos.baseColor"]);
  const atlas = new Texture();
  registry.setBoards(atlas);
  assert.equal(first.uniforms.uMap.value, atlas);
  assert.deepEqual(registry.missing, [], "successful retry clears the pending external slot");
  assert.equal(registry.forName(source), first, "recovery reuses the material");
  registry.dispose();
  source.dispose();
});

check("cabin cuts and scroll rejoin never interpolate through a car", () => {
  const anchors = new Map();
  for (const id of ["s4", "s6"]) for (const suffix of ["", "_portrait"]) {
    anchors.set(`cam_garage_${id}_cabin${suffix}`, { position: new Vector3(462, 1.1, id === "s4" ? -215 : -222) });
    anchors.set(`cam_garage_${id}_cabin_target${suffix}`, { position: new Vector3(464, 1, id === "s4" ? -215 : -222) });
  }
  const visit = createGarageVisit(anchors);
  const cursor = visit.navigator(.4, 1.6);
  cursor.request("s6_cabin");
  const cut = cursor.sample(1 / 120);
  assert.ok(cut.cut && cut.done && cut.location.node === "s6_cabin");
  cursor.request(.275);
  const exit = cursor.sample(0);
  assert.ok(exit.cut && exit.pose.position.distanceTo(visit.pose("s6", 1.6).position) < 1e-8);
  let state;
  for (let n = 0; n < 2400; n++) { state = cursor.sample(1 / 240); if (state.done) break; }
  assert.ok(state.done && state.pose.position.distanceTo(visit.at(.275, 1.6).position) < 1e-8);
  cursor.request("s4_rear", { cut: true });
  const reduced = cursor.sample(0);
  assert.ok(reduced.cut && reduced.done && reduced.location.node === "s4_rear");
});

check("floor normal recovery updates sampler presence and clears stale slots", () => {
  const registry = materialModule.createGarageMaterials({});
  const source = new three.MeshStandardMaterial();
  source.name = "NCW_garage_workshop_floor";
  source.userData = { runtime: "satin_floor", slots: '["baseColor","metallicRoughness","normal"]' };
  source.map = new three.Texture(); source.roughnessMap = new three.Texture();
  const material = registry.forName(source);
  assert.equal(material.uniforms.uHasNormal.value, 0);
  assert.deepEqual(registry.missing, ["NCW_garage_workshop_floor.normal"]);
  source.normalMap = new three.Texture();
  assert.equal(registry.forName(source), material);
  assert.equal(material.uniforms.uNormal.value, source.normalMap);
  assert.equal(material.uniforms.uHasNormal.value, 1);
  assert.deepEqual(registry.missing, []);
  source.normalMap = null;
  registry.forName(source);
  assert.equal(material.uniforms.uNormal.value, null);
  assert.equal(material.uniforms.uHasNormal.value, 0);
  source.userData.slots = '[]';
  registry.forName(source);
  assert.equal(material.uniforms.uMap.value, null);
  assert.equal(material.uniforms.uRough.value, null);
  registry.dispose(); source.dispose();
});

if (placeholders.size) {
  console.log(`check:garage: ${placeholders.size} pose/path stand-ins still from the plan, not the kit:`);
  console.log(`  ${[...placeholders].sort().join(", ")}`);
}
if (failures.length) {
  console.error(`check:garage failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("check:garage passed");
