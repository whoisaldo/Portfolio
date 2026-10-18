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
//   the exported room solids clear every desired camera and near plane;
//   where the kit has a garage camera it has all four of its names.
//
// And it reports which poses and paths are still the plan's stand-ins: a
// stand-in passes this check but is never evidence of a framing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
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
let scrollModule;
let mergeModule;
let inspectionModule;
let paintBatchModule;
let policyModule;
let videoModule;
let carSpecs;
let s4Mods;
let GLTFLoader;
let carDecoder;
try {
  [world, garage, three, propsModule, materialModule, scrollModule, mergeModule] = await Promise.all([vite.ssrLoadModule("/src/data/world.js"), vite.ssrLoadModule("/src/world/garage.js"), vite.ssrLoadModule("three"), vite.ssrLoadModule("/src/world/props.js"), vite.ssrLoadModule("/src/world/garage-materials.js"), vite.ssrLoadModule("/src/world/scroll-stage.js"), vite.ssrLoadModule("/src/world/merge.js")]);
  paintBatchModule = await vite.ssrLoadModule("/src/world/garage-paint-batch.js");
  policyModule = await vite.ssrLoadModule("/src/world/garage-policy.js");
  videoModule = await vite.ssrLoadModule("/src/world/garage-video.js");
  ({ cars: carSpecs } = await vite.ssrLoadModule("/src/three/car/object.js"));
  [inspectionModule, { mods: s4Mods }, { GLTFLoader }, { MeshoptDecoder: carDecoder }] = await Promise.all([vite.ssrLoadModule("/src/three/car/inspect.js"), vite.ssrLoadModule("/src/data/garage.js"), vite.ssrLoadModule("three/addons/loaders/GLTFLoader.js"), vite.ssrLoadModule("three/addons/libs/meshopt_decoder.module.js")]);
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

check("the approved S6 is available on every visitor path", () => {
  const asset = "/models/ali-s6.glb?v=review";
  assert.deepEqual(policyModule.garageS6Policy(asset), { url: asset, unavailable: null });
  assert.equal(policyModule.garageS6Policy(asset, { search: "?garage-test-s6=1" }).url, asset);
  assert.equal(policyModule.garageS6Policy(asset, { development: true }).url, asset);
  assert.deepEqual(policyModule.garageS6Policy(asset, { development: true, search: "?garage-test-s6=1" }), { url: asset, unavailable: null });
  assert.equal(policyModule.garageS6Policy(null).url, null);
  assert.ok(carSpecs.s4.url);
  assert.equal(carSpecs.s4.unavailable, null);
  assert.ok(carSpecs.s6.url);
  assert.equal(carSpecs.s6.unavailable, null);
});

// ---- the timeline -------------------------------------------------------------
check("monitor textures follow decoded frames and dispose their callbacks", () => {
  let callback, requests = 0, cancelled = 0, disposed = 0;
  const listeners = new Map();
  const video = { readyState: 2, videoWidth: 1280, videoHeight: 720, currentTime: 0,
    getVideoPlaybackQuality: () => ({ totalVideoFrames: 1 }),
    requestVideoFrameCallback(fn) { callback = fn; return ++requests; },
    cancelVideoFrameCallback(id) { cancelled = id; },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const textures = [];
  const monitor = videoModule.createGarageVideoTexture(video, (texture) => {
    textures.push(texture); texture.addEventListener("dispose", () => disposed++);
  });
  const first = textures[0], initial = first.version;
  assert.equal(first.isVideoTexture, true, "retain Three's native video upload path");
  assert.equal(first.internalFormat, "RGBA8", "retain the monitor shader's raw video texels");
  assert.equal(video.width, video.videoWidth, "the detached element supplies positive storage dimensions");
  assert.equal(video.height, video.videoHeight);
  assert.equal(first.colorSpace, three.SRGBColorSpace);
  assert.equal(first.generateMipmaps, false);
  callback(0, { presentedFrames: 1, mediaTime: 0 });
  assert.equal(first.version, initial + 1, "native decoded notifications are retained");
  monitor.update(); monitor.update();
  assert.equal(first.version, initial + 1, "render passes do not repeat a decoded notification");
  callback(1, { presentedFrames: 2, mediaTime: 1 / 24 });
  assert.equal(first.version, initial + 2, "every new decoded frame is uploaded");
  callback(1.5, { presentedFrames: 2, mediaTime: 1.5 });
  assert.equal(first.version, initial + 3, "a paused seek can change media time without advancing the presented-frame counter");
  video.videoWidth = 1920; video.videoHeight = 1080;
  monitor.update();
  callback(2, { presentedFrames: 3, mediaTime: 2 / 24 });
  assert.equal(textures.length, 2, "a source-size change gets a fresh allocation");
  assert.equal(disposed, 1);
  const resized = textures.at(-1), version = resized.version;
  video.readyState = 1;
  callback(3, { presentedFrames: 4, mediaTime: 3 });
  assert.equal(resized.version, version + 1, "native decoding retains a notification during transient seek readiness");
  video.readyState = 2;
  video.currentTime = 3;
  listeners.get("seeked")();
  assert.equal(resized.version, version + 2, "a completed seek supplies its available picture");
  monitor.dispose();
  assert.equal(disposed, 2);
  assert.equal(cancelled, requests);
  assert.equal(listeners.size, 0);
});
check("monitor textures retain the fallback update contract without frame callbacks", () => {
  const listeners = new Map();
  const video = { readyState: 2, videoWidth: 1280, videoHeight: 720, currentTime: 0,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  let texture;
  const monitor = videoModule.createGarageVideoTexture(video, (map) => { texture = map; });
  const initial = texture.version;
  monitor.update(); monitor.update();
  assert.equal(texture.version, initial);
  video.currentTime = .5;
  monitor.update();
  assert.equal(texture.version, initial + 1);
  monitor.update();
  assert.equal(texture.version, initial + 1, "a paused fallback video does not reupload");
  monitor.dispose();
  let frames = 1;
  video.getVideoPlaybackQuality = () => ({ totalVideoFrames: frames });
  const counted = videoModule.createGarageVideoTexture(video, (map) => { texture = map; });
  const first = texture.version;
  video.currentTime = .51; counted.update();
  video.currentTime = .52; counted.update();
  assert.equal(texture.version, first, "a playback clock tick is not a new decoded frame");
  frames++;
  counted.update();
  assert.equal(texture.version, first + 1);
  video.currentTime = 3;
  listeners.get("seeked")();
  assert.equal(texture.version, first + 2, "a fallback paused seek updates even with an unchanged frame counter");
  counted.dispose();
  assert.equal(listeners.size, 0);
});

{
  const queue = garage.createGarageBuildQueue();
  const order = [];
  let release;
  const first = queue.run(async () => {
    order.push("current district");
    await new Promise((resolve) => { release = resolve; });
    order.push("current district committed");
  });
  const later = queue.run(() => order.push("later district"));
  const room = queue.run(() => order.push("requested garage"), { priority: true });
  release();
  await Promise.all([first, later, room]);
  check("a cold garage waits only for the current shared build", () => {
    assert.deepEqual(order, ["current district", "current district committed", "requested garage", "later district"]);
  });
  await assert.rejects(queue.run(() => { throw new Error("failed pack"); }));
  await queue.run(() => order.push("retry"));
  check("a failed shared build does not strand queued construction", () => assert.equal(order.at(-1), "retry"));
}

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
const roomSolids = {};
for (const tier of ["high", "phone"]) {
  const doc = await io.read(coreOf(tier));
  const pack = await io.read(`public/scenes/world/world-${tier}-garage.glb`);
  const anchors = new Map();
  for (const node of [...doc.getRoot().listNodes(), ...pack.getRoot().listNodes()]) {
    const name = node.getName();
    if (!/^(cam_|anchor_)garage/.test(name)) continue;
    const m = node.getWorldMatrix();
    anchors.set(name, { position: new Vector3(m[12], m[13], m[14]), quaternion: new Quaternion(), extras: node.getExtras() });
  }
  anchorSets[tier] = anchors;
  // Decode normalized positions before applying the full node transform,
  // just as GLTFLoader does. Layout metadata cannot certify the exported
  // collision boxes used by the runtime.
  roomSolids[tier] = pack.getRoot().listNodes().filter((node) => node.getName().startsWith("collide_garage_")).map((node) => {
    const box = new three.Box3();
    const matrix = new three.Matrix4().fromArray(node.getWorldMatrix());
    const point = new Vector3(), element = [];
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const positions = primitive.getAttribute("POSITION");
      if (!positions) continue;
      for (let i = 0; i < positions.getCount(); i++) {
        positions.getElement(i, element);
        box.expandByPoint(point.fromArray(element).applyMatrix4(matrix));
      }
    }
    return { name: node.getName(), ...node.getExtras(), box };
  });
  check(`${tier} exported camera solids exist`, () => {
    assert.ok(roomSolids[tier].length > 0);
    assert.ok(roomSolids[tier].every((row) => !row.box.isEmpty()), "collision meshes must contain positions");
  });
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
    const collision = createGarageCollision({ solids: () => roomSolids[tier] });
    const clearPose = (pose, label) => {
      const eye = collision.clearance(pose.position);
      const near = collision.nearPlane(pose, aspect, .1);
      assert.ok(eye >= .45 && near >= .15, `${label}: eye ${eye.toFixed(6)}m / near ${near.toFixed(6)}m`);
    };
    check(`${tag} exported timeline clearance`, () => {
      for (let i = 0; i <= 1000; i++) clearPose(visit.at(i / 1000, aspect), `p=${(i / 1000).toFixed(3)}`);
    });
    check(`${tag} exported inspection graph clearance`, () => {
      const pose = visit.at(0, aspect);
      for (const edge of visit.segments(aspect)) {
        const count = Math.ceil(edge.length / .01);
        for (let i = 0; i <= count; i++) clearPose(visit.sample(edge.id, edge.from, edge.into, i / count, aspect, pose), `${edge.id} ${i}/${count}`);
      }
      for (const id of ["s4_cabin", "s6_cabin"]) clearPose(visit.pose(id, aspect), id);
    });
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
    check(`${tag} car controls follow the shown car`, () => {
      assert.equal(visit.activeCarAt(.2), "s4");
      assert.equal(visit.activeCarAt(.4), "s4");
      assert.equal(visit.activeCarAt(.515), "s6");
      assert.equal(visit.activeCarAt(.6), "s6");
      assert.equal(visit.activeCarAt(.8), "s6");
      assert.equal(visit.activeCarAt(1), null);
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
    check(`${tag} completed exits preserve independent indoor snapshots`, () => {
      for (const destination of ["s4_rear", "s6_bay", "s6_stance", "s6_cabin"].filter((name) => visit.pose(name, aspect))) {
        const cursor = visit.navigator(.4, aspect);
        cursor.request(destination, { cut: true });
        const saved = cursor.snapshot();
        const exit = visit.transition(.4, aspect, cursor);
        let state;
        for (let n = 0; n < 2400; n++) { state = exit.sample(1 / 240); if (state.done) break; }
        assert.ok(state.done && state.pose.position.x < 450);
        assert.equal(cursor.snapshot().node, "outside");
        assert.equal(saved.node, destination, "departure cannot mutate the saved indoor location");
        const incoming = visit.transition(.4, aspect, visit.navigator(.4, aspect, saved));
        incoming.seekOutside();
        incoming.reverse(true);
        state = incoming.sample(1 / 240);
        assert.ok(state.pose.position.x < 450, "cabin restoration must also start outside");
        for (let n = 0; n < 2400 && !state.done; n++) state = incoming.sample(1 / 240);
        const rejoin = destination.endsWith("_cabin") ? destination.slice(0, 2) : destination;
        assert.ok(state.done && state.pose.position.distanceTo(visit.pose(rejoin, aspect).position) < 1e-8);
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
  const culledSectors = new Set();
  const system = propsModule.createProps([core], wire({ protos: [{ name: "core_test", box: [1, 1, 1] }], count: 0 }, []), { visibleBox: (box, sector) => { culledSectors.add(sector); return sector !== "garage_s6"; } });
  const buffer = wire({ protos: [{ name: "garage_test", box: [1, 1, 1] }], count: 2, sectorRuns: [{ sector: "garage_s4", start: 0, count: 1 }, { sector: "garage_s6", start: 1, count: 1 }] }, [[0, 9240, 0, -4300, 0, 100, 1000, 0], [0, 9240, 0, -4440, 0, 100, 1000, 0]]);
  const held = system.addPlacements([pack], buffer, { hold: true });
  assert.equal(held.count, 2);
  assert.equal(system.group.children.length, 0, "placements stay hidden before commit");
  const steps = held.prepare();
  let result;
  while (!(result = steps.next()).done);
  assert.equal(result.value.length, 1, "one material batch serves both sectors");
  held.commit();
  held.commit();
  assert.equal(system.group.children.length, 1, "idempotent commit");
  const room = system.group.getObjectByName("props_garage_room");
  assert.ok(room);
  room.traverse((mesh) => {
    if (!mesh.isMesh) return;
    assert.equal(mesh.userData.sector, "garage_room");
    assert.deepEqual(mesh.userData.sectorRuns.map((run) => run.sector), ["garage_s4", "garage_s6"]);
  });
  const camera = new three.PerspectiveCamera(90, 1.6, .1, 100);
  camera.position.set(470, 4, -219); camera.lookAt(462, 1, -219); camera.updateMatrixWorld();
  system.update(camera);
  const batched = room.children.find((node) => node.isBaked);
  assert.ok(culledSectors.has("garage_s4") && culledSectors.has("garage_s6"), "both sectors reach the pass culler");
  assert.equal(Array.from(batched._multiDrawCounts).slice(0, batched._multiDrawCount).reduce((sum, n) => sum + n, 0), 36, "only the visible sector's box is submitted");
  const detailA = proto("garage_detail_a"), detailB = proto("garage_detail_b");
  detailA.geometry.dispose(); detailB.geometry.dispose();
  detailA.geometry = new three.BoxGeometry(1, 1, 1, 24, 24, 24);
  detailB.geometry = detailA.geometry;
  const detailBuffer = wire({ protos: [{ name: "garage_detail_a", box: [1, 1, 1] }, { name: "garage_detail_b", box: [1, 1, 1] }], count: 4, sectorRuns: [{ sector: "garage_s4", start: 0, count: 2 }, { sector: "garage_s6", start: 2, count: 2 }] }, [[0, 9240, 0, -4300, 0, 100, 1000, 0], [0, 9240, 0, -4310, 0, 100, 1000, 0], [1, 9240, 0, -4440, 0, 100, 1000, 0], [1, 9240, 0, -4450, 0, 100, 1000, 0]]);
  const detailed = system.addPlacements([detailA, detailB], detailBuffer, { hold: true });
  const detailSteps = detailed.prepare(); let prepared; while (!(prepared = detailSteps.next()).done);
  assert.equal(prepared.value.length, 1, "detailed static props share one material draw");
  assert.equal(prepared.value[0].geometry.index.count, detailA.geometry.index.count * 4, "batching keeps every detail triangle");
  detailed.dispose(); detailA.geometry.dispose();
  const bad = wire({ protos: [{ name: "garage_test", box: [1, 1, 1] }], count: 1, sectorRuns: [] }, [[0, 9240, 0, -4300, 0, 100, 1000, 0]]);
  assert.throws(() => system.addPlacements([pack], bad), /sectors/);
  system.dispose();
  const sharedTarget = new three.WebGLRenderTarget(1, 1);
  const plantMaterial = new ShaderMaterial({ uniforms: { uSpill: { value: sharedTarget.texture } } });
  plantMaterial.name = "baked_test";
  const plant = new Mesh(new BoxGeometry(1, 1, 1), plantMaterial);
  plant.userData.proto = "native_test";
  const warn = console.warn;
  let cloneWarnings = 0;
  let native;
  try {
    console.warn = (...args) => {
      if (args.some((arg) => String(arg).includes("Textures of render targets cannot be cloned"))) cloneWarnings++;
      else warn(...args);
    };
    native = propsModule.createProps([plant], wire({ protos: [{ name: "native_test", box: [1, 1, 1] }], count: 1 }, [[0, 9240, 0, -4300, 0, 100, 1000, 0]]));
  } finally {
    console.warn = warn;
  }
  assert.equal(cloneWarnings, 0);
  const baked = native.group.children.find((mesh) => mesh.isBaked);
  assert.ok(baked, "small props exercise batching and geometry disposal");
  assert.equal(baked._indirectTexture.type, three.UnsignedIntType);
  assert.equal(baked.material.uniforms.uSpill.value, sharedTarget.texture);
  let released = 0;
  let sharedReleased = false;
  sharedTarget.texture.addEventListener("dispose", () => { sharedReleased = true; });
  baked._indirectTexture.addEventListener("dispose", () => released++);
  native.dispose();
  assert.equal(released, 1);
  assert.equal(sharedReleased, false, "prop disposal keeps borrowed render targets alive");
  sharedTarget.dispose();
  plant.geometry.dispose();
  plantMaterial.dispose();
  core.geometry.dispose();
  pack.geometry.dispose();
  material.dispose();
});
check("the three amber bench strip faces enter the prop bake without adding side-wall light", () => {
  const material = new three.ShaderMaterial({ uniforms: { uSpill: { value: null } } });
  material.name = "tube";
  const proto = new three.Mesh(new three.PlaneGeometry(2.3, .03), material);
  proto.userData.proto = "garage_bench_strip";
  const color = new three.Color("#ffb45e");
  proto.geometry.setAttribute("color", new three.Float32BufferAttribute(Array.from({ length: 4 }, () => color.toArray()).flat(), 3));
  const make = (name) => {
    let text = JSON.stringify({ protos: [{ name, box: [1.22, .05, .11] }], count: 3 });
    if (text.length % 2) text += " ";
    const bytes = new TextEncoder().encode(text);
    const buffer = new ArrayBuffer(4 + bytes.length + 48);
    new DataView(buffer).setUint32(0, bytes.length, true);
    new Uint8Array(buffer, 4, bytes.length).set(bytes);
    const data = new Int16Array(buffer, 4 + bytes.length);
    for (let i = 0; i < 3; i++) data.set([0, 9300, 150, -4200 - i * 48, 0, 100, 1000, 0], i * 8);
    proto.userData.proto = name;
    return propsModule.createProps([proto], buffer);
  };
  const bench = make("garage_bench_strip");
  assert.equal(bench.sources.length, 1);
  assert.equal(bench.sources[0].mesh.geometry.attributes.position.count, 18, "all six authored triangles light the bench");
  assert.ok(bench.sources[0].color.toArray().every((v, i) => Math.abs(v - color.toArray()[i]) < 1e-6));
  assert.equal(bench.sources[0].intensity, .8);
  const side = make("garage_wall_tube");
  assert.equal(side.sources.length, 0, "existing magenta and cyan bake is unchanged");
  const benchProto = proto.clone(), wallProto = proto.clone();
  benchProto.userData.proto = "garage_bench_strip"; wallProto.userData.proto = "garage_wall_tube";
  let text = JSON.stringify({ protos: [{ name: "garage_bench_strip", box: [1.22, .05, .11] }, { name: "garage_wall_tube", box: [1.22, .05, .11] }], count: 2, sectorRuns: [{ sector: "garage_shop", start: 0, count: 2 }] });
  if (text.length % 2) text += " ";
  const header = new TextEncoder().encode(text), buffer = new ArrayBuffer(4 + header.length + 32);
  new DataView(buffer).setUint32(0, header.length, true); new Uint8Array(buffer, 4, header.length).set(header);
  new Int16Array(buffer, 4 + header.length).set([0, 9300, 150, -4200, 0, 100, 1000, 0, 1, 9300, 150, -4240, 0, 100, 1000, 0]);
  const mixed = propsModule.createProps([benchProto, wallProto], buffer, { reflectLayer: 2 });
  const batches = mixed.group.children.filter((mesh) => mesh.isBaked);
  assert.equal(batches.length, 2, "different reflection eligibility cannot share a static batch");
  assert.equal(batches.find((mesh) => mesh.parts.some((part) => part.set.name === "garage_bench_strip")).layers.isEnabled(2), true);
  assert.equal(batches.find((mesh) => mesh.parts.some((part) => part.set.name === "garage_wall_tube")).layers.isEnabled(2), false, "amber eligibility cannot change the side-wall neon balance");
  mixed.dispose();
  bench.dispose(); side.dispose(); proto.geometry.dispose(); material.dispose();
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
  assert.deepEqual(registry.report[0].slots.map(({ slot, bound }) => [slot, bound]), [["baseColor", true], ["metallicRoughness", true], ["normal", false]]);
  source.normalMap = new three.Texture();
  assert.equal(registry.forName(source), material);
  assert.equal(material.uniforms.uNormal.value, source.normalMap);
  assert.equal(material.uniforms.uHasNormal.value, 1);
  assert.deepEqual(registry.missing, []);
  assert.equal(registry.report[0].slots.find((row) => row.slot === "normal").texture, source.normalMap);
  source.normalMap = null;
  registry.forName(source);
  assert.equal(material.uniforms.uNormal.value, null);
  assert.equal(material.uniforms.uHasNormal.value, 0);
  assert.equal(registry.report[0].slots.find((row) => row.slot === "normal").bound, false);
  source.userData.slots = '[]';
  registry.forName(source);
  assert.equal(material.uniforms.uMap.value, null);
  assert.equal(material.uniforms.uRough.value, null);
  registry.dispose(); source.dispose();
});

check("world-space batching supplies typed identity textures and releases them", () => {
  const geometry = new three.BoxGeometry();
  const material = new three.MeshStandardMaterial();
  const runs = { cell: Int32Array.of(-1, -1), start: Int32Array.of(0, 3), count: Int32Array.of(3, 3) };
  const mesh = new mergeModule.Tiled(geometry, material, mergeModule.createCells(48), runs);
  const twin = new three.Mesh(geometry, material);
  mergeModule.asOneRun(twin);
  assert.equal(mesh._matricesTexture, twin._matricesTexture);
  assert.equal(mesh._indirectTexture, twin._indirectTexture);
  assert.equal(mesh._matricesTexture.type, three.FloatType);
  assert.deepEqual([...mesh._matricesTexture.image.data], new three.Matrix4().elements);
  const original = mesh._indirectTexture;
  let released = 0;
  original.addEventListener("dispose", () => released++);
  mergeModule.identityBatching(mesh, 17);
  assert.equal(released, 1);
  assert.equal(mesh._indirectTexture, twin._indirectTexture);
  assert.equal(mesh._indirectTexture.format, three.RedIntegerFormat);
  assert.equal(mesh._indirectTexture.type, three.UnsignedIntType);
  assert.ok(mesh._indirectTexture.image.data instanceof Uint32Array);
  assert.ok(mesh._indirectTexture.image.data.length >= 17);
  assert.ok(mesh._indirectTexture.image.data.every((id) => id === 0));
  mesh._matricesTexture.addEventListener("dispose", () => released++);
  mesh._indirectTexture.addEventListener("dispose", () => released++);
  geometry.dispose();
  assert.equal(released, 3);
  assert.equal(mesh._matricesTexture, null);
  assert.equal(twin._indirectTexture, null);
  material.dispose();
});

check("resting garage preparation uploads once per frame without drawing", () => {
  const callbacks = new Map(), jobs = [1, 2, 3, 4], completed = [];
  let id = 0, allowed = true;
  const pump = garage.createGarageUploadPump({
    run: () => completed.push(jobs.shift()), pending: () => jobs.length > 0, canRun: () => allowed,
    schedule: (fn) => { callbacks.set(++id, fn); return id; }, cancel: (key) => callbacks.delete(key),
  });
  const frame = () => {
    const next = [...callbacks.values()];
    callbacks.clear();
    next.forEach((fn) => fn());
  };
  pump.wake(); pump.wake();
  assert.equal(callbacks.size, 1, "parallel uploads share one preparation frame");
  frame();
  assert.deepEqual(completed, [1], "only one upload runs per frame");
  allowed = false;
  frame();
  assert.deepEqual(completed, [1], "an active renderer or sampling retains its queue");
  assert.equal(callbacks.size, 0, "ineligible preparation does not keep a frame loop");
  allowed = true;
  pump.wake(); frame(); frame(); frame();
  assert.deepEqual(completed, [1, 2, 3, 4]);
  assert.equal(callbacks.size, 0, "settled preparation has no recurring frame");
  jobs.push(5);
  pump.wake();
  const stale = [...callbacks.values()][0];
  pump.dispose();
  assert.equal(callbacks.size, 0);
  stale(); pump.wake();
  assert.deepEqual(completed, [1, 2, 3, 4], "disposal cancels pending and stale callbacks");
});

// A reduced-motion cold entry can briefly run before the still-page cover
// pauses it. Execute the real sampling policy and stage gate in that order.
check("reduced-motion cold entry cannot strand construction behind sampling", () => {
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const armed = source.match(/  const armed = (.*);/)[1].replaceAll("import.meta.env.DEV", "dev");
  const from = source.indexOf("  let running = null;");
  const to = source.indexOf("  const unwatch = subscribeStage(check);", from);
  for (const dev of [false, true]) for (const search of ["", "?adapt=off"]) {
    const context = { reduced: true, dev, window: { location: { search } }, URLSearchParams,
      stage: { paused: false, mode: "stage" }, city: {}, lightIn: true,
      soundscape: { setActive() {} }, resume() {}, pause() {}, settle() {},
      document: { hidden: false } };
    const run = runInNewContext(`const adapt = { armed: ${armed}, sampling: false };
      const startSampling = () => { adapt.sampling = true; };
      ${source.slice(from, to)}
      () => { check(); stage.paused = true; check(); return adapt.sampling; };`, context);
    assert.equal(run(), false, "a paused still world must leave construction slots available");
  }
});

// District requests must start even while the complete garage promise is
// pending. Execute the actual post-hero idle turn with an unsettled room.
{
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const from = source.indexOf("    // The hero has its first frames.");
  const to = source.indexOf("\n  };", from);
  const events = [];
  runInNewContext(source.slice(from, to), {
    disposed: false, tier: "high", idle: () => Promise.resolve(),
    hasGaragePack: () => true,
    prepareGarage: () => { events.push("room requested"); return new Promise(() => {}); },
    streamPacks: () => events.push("district downloads"),
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  check("district downloads do not await garage readiness", () => {
    assert.deepEqual(events, ["room requested", "district downloads"]);
  });
}

// Run the real preparation job with a held room bake and S6 request. Only
// the shared room build owns the queue; car download/readiness cannot own it.
{
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const from = source.indexOf("  const prepareGarage = () => {");
  const to = source.indexOf("  const garageState = () =>", from);
  const events = [];
  let finishRoom;
  let roomEntered;
  const entered = new Promise((resolve) => { roomEntered = resolve; });
  const roomBake = new Promise((resolve) => { finishRoom = resolve; });
  const construction = garage.createGarageBuildQueue();
  const context = {
    disposed: false, tier: "high", reduced: false, hasGaragePack: () => true,
    carRuntime: async () => ({}), garageData: async () => ({ findMod() {} }),
    garageRoom: null, garageAvailable: "idle", garageReason: null, publishGarage() {},
    worldAssets: { worldPackPropsUrl: { high: { garage: "fixture" } } },
    preloadPack: async () => new three.Scene(), GARAGE_PACK: "garage",
    placementPromise: null, fetchUnpacked: async () => [],
    GARAGE_PHOTOS_ENABLED: false, boardTexture: null,
    carModels: { s6: {} }, preloadCar: () => { events.push("S6 requested"); return new Promise(() => {}); },
    construction, idle: async () => {}, between: async () => {}, readyToDraw: async () => {}, clearance: null, findMod: null, visit: null, inspectionCursor: null,
    createGarageVisit: () => ({ placeholders: [] }), garageLights: () => [],
    roomCommitted: false, packsIn: [], THREE: three,
    city: { anchors: new Map(), garageMaterials: { setRects() {} }, kit: { wet: {} },
      async addPack() { events.push("room bake"); roomEntered(); await roomBake; } },
  };
  const executable = `${source.slice(from, to).replaceAll("import.meta", "meta")}\nprepareGarage;`;
  const prepare = runInNewContext(executable, context);
  void prepare();
  await entered;
  let districtBuilt = false;
  void construction.run(() => { districtBuilt = true; });
  finishRoom();
  await new Promise((resolve) => setTimeout(resolve, 0));
  check("S6 fetch overlaps room and pending cars release district bake queue", () => {
    assert.deepEqual(events, ["S6 requested", "room bake"]);
    assert.ok(districtBuilt, "district construction proceeds while the S6 request remains pending");
  });
  const fetchingQueue = garage.createGarageBuildQueue();
  const pendingRoom = runInNewContext(executable, { ...context, garageRoom: null,
    construction: fetchingQueue, preloadPack: () => new Promise(() => {}) });
  void pendingRoom();
  let builtWhileFetching = false;
  void fetchingQueue.run(() => { builtWhileFetching = true; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  check("pending garage asset requests do not own the district bake queue", () => {
    assert.ok(builtWhileFetching, "district construction cannot wait for a pending garage download");
  });
}

// A final district can arrive after the initial probe but before readiness.
// Execute the actual readiness handoff for each side of that race.
check("late district completion refreshes the probe before releasing the bake", () => {
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const from = source.indexOf("        // The job has supplied every draw");
  const to = source.indexOf("        return true;", from) + "        return true;".length;
  for (const [streamed, probeStreamed] of [[false, false], [true, false], [true, true]]) {
    const events = [];
    const context = { streamed, probeStreamed, city: { root: {} }, garageAvailable: "loading",
      garageCars: { captureProbe() { events.push("probe"); } },
      releaseStreaming() { events.push("release"); }, publishGarage() { events.push("publish"); } };
    runInNewContext(`(() => { ${source.slice(from, to)} })();`, context);
    assert.deepEqual(events, [...(streamed && !probeStreamed ? ["probe"] : []), ...(streamed ? ["release"] : []), "publish"]);
    assert.equal(context.garageAvailable, "ready");
  }
});

// Run the actual preparation loop with a clock and resources whose cost is
// known. Grouping warm-up must retain every program, texture and buffer job.
{
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const from = source.indexOf("  const readyToDraw = async (drawn) => {");
  const to = source.indexOf("  // ---- searchlights", from);
  assert.ok(from >= 0 && to > from);
  let now = 0;
  const events = [], batches = [];
  const textures = Array.from({ length: 6 }, (_, id) => ({ isTexture: true, image: {}, version: 1, id }));
  const materials = textures.map((map) => ({ version: 0, map }));
  const resident = new Map([[textures[0], { __version: 1 }]]);
  const drawn = materials.map((material, id) => ({ object: { material }, geometry: { id }, bytes: id === 0 ? 12 : 0 }));
  const renderer = {
    info: { programs: [] }, properties: { get: (texture) => resident.get(texture) ?? {} },
    getRenderTarget: () => null, setRenderTarget() {},
    compile(list) {
      const id = renderer.info.programs.length;
      renderer.info.programs.push({ isReady: () => true,
        getUniforms() { events.push(`uniforms:${id}`); now += 1; },
        getAttributes() { events.push(`attributes:${id}`); now += 1; },
      });
      return list.drawn.map(({ object }) => object.material);
    },
    initTexture(texture) { events.push(`texture:${texture.id}`); resident.set(texture, { __version: texture.version }); now += 2; },
  };
  const prepare = runInNewContext(`${source.slice(from, to)}\nreadyToDraw;`, {
    disposed: false, warmKit: { programs: [], send(list) {
      events.push(`buffers:${list.length}`);
      return [() => events.push("buffer piece")];
    } },
    renderer, post: { composer: { inputBuffer: {} } }, camera: {}, scene: {}, cover: null,
    Listed: class { constructor(drawn) { this.drawn = drawn; } },
    between: async () => {}, workAllowance: () => 4, WARM_BYTES: 100,
    performance: { now: () => now },
    ask: async (job) => { const start = now; const result = job(); batches.push({ ms: now - start }); return result; },
  });
  await prepare(drawn);
  check("bounded preparation finishes every resource before readiness", () => {
    for (let id = 0; id < materials.length; id++) {
      assert.equal(events.filter((event) => event === `uniforms:${id}`).length, 1);
      assert.equal(events.filter((event) => event === `attributes:${id}`).length, 1);
      assert.equal(events.filter((event) => event === `texture:${id}`).length, id === 0 ? 0 : 1);
    }
    assert.deepEqual(events.slice(-2), ["buffers:1", "buffer piece"]);
    assert.ok(batches.every(({ ms }) => ms <= 4), "small jobs fit the actual work allowance");
    assert.equal(batches.length, 8, "lookups and pictures share bounded frame slots");
  });
}

check("resting frames draw effective manual car state and layout once", () => {
  // Exercise the runtime's actual frame gate with a stable camera. The
  // renderer records the effective hood state only when a frame is drawn.
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const from = source.indexOf('  let drawnKey = "";');
  const to = source.indexOf("  const resume = () =>", from);
  assert.ok(from >= 0 && to > from);
  const state = { availability: "ready", hood: { s4: 0, s6: 0 }, lowering: 0, selection: null };
  const tour = { hood: { s4: 0, s6: 0 }, lowering: 0 };
  const drawn = [];
  const context = {
    camera: { position: { x: 1, y: 2, z: 3 }, quaternion: { x: 0, y: 0, z: 0, w: 1 }, fov: 60 },
    width: 1440, height: 900, packsIn: [], stage: { paused: false, mode: "page", garageProgress: .2, garageCut: 0 },
    visit: { stateAt: () => tour }, garageState: () => state, pinLayout: { side: { height: 100 } },
    disposed: false, city: {}, raf: 0, last: 0, timeIndex: 0, times: new Float32Array(64), reduced: true,
    adapt: { sampling: false }, asks: [], requestAnimationFrame: () => 1, clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    sample() {}, step() {}, draw: () => drawn.push({ ...state.hood }),
    soundscape: { update() {} }, motion: { vel: { length: () => 0 } }, getEnv: () => ({ wet: 0 }), shelterBox: null, traffic: null,
  };
  const frame = runInNewContext(`${source.slice(from, to)}\nframe;`, context);
  frame(16); frame(32);
  assert.equal(drawn.length, 1, "a settled camera does not keep drawing");
  state.hood.s4 = 1;
  frame(48);
  assert.equal(drawn.length, 2, "a manual hood change reaches the renderer");
  assert.equal(drawn.at(-1).s4, 1);
  frame(64);
  assert.equal(drawn.length, 2);
  state.hood.s4 = 0;
  frame(80);
  assert.equal(drawn.length, 3);
  assert.equal(drawn.at(-1).s4, 0);
  context.pinLayout.side.height = 200;
  frame(96); frame(112);
  assert.equal(drawn.length, 4, "a changed panel layout reprojects the pins once");
  state.selection = { carId: "s4", modId: "intake" };
  frame(128); frame(144);
  assert.equal(drawn.length, 5, "selection changes draw without an ambient loop");
  state.availability = "loading";
  frame(160);
  state.availability = "ready";
  frame(176); frame(192);
  assert.equal(drawn.length, 7, "late readiness draws the finished room once");
  context.reduced = false;
  context.garageState = () => { throw new Error("normal frames do not read the resting key"); };
  frame(208); frame(224);
  assert.equal(drawn.length, 9, "normal frames retain their existing draw schedule");
});

check("room and exterior triangles sharing a tile keep independent visibility", () => {
  const anchors = new Map([["anchor_garage_portal_door", { position: new Vector3(452, 2.3, -215), quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2), extras: { width: 6, height: 4.6 } }]]);
  const visibility = garage.createGarageVisibility(anchors);
  const room = new three.Mesh(new three.BoxGeometry(.2, .2, .2));
  const street = new three.Mesh(new three.BoxGeometry(.2, .2, .2));
  room.position.set(458, 2, -215); street.position.set(440, 2, -207);
  room.updateMatrixWorld(); street.updateMatrixWorld();
  const geometry = mergeModule.mergeMeshes([room, street]);
  const cells = mergeModule.createCells(48);
  cells.partition = garage.garageCellSector;
  cells.visibleBox = visibility.test;
  const steps = mergeModule.cutSteps(geometry, cells);
  let result; while (!(result = steps.next()).done);
  const tile = new mergeModule.Tiled(geometry, new three.MeshBasicMaterial(), cells, result.value);
  const camera = new three.PerspectiveCamera(60, 1.6, .1, 2000);
  camera.position.set(462, 2, -215); camera.lookAt(440, 2, -215); camera.updateMatrixWorld();
  visibility.prepare(camera);
  tile.onBeforeRender({ info: { render: { frame: 1 } } }, null, camera);
  assert.deepEqual(cells.list.map((cell) => cell.sector).sort(), ["exterior", "garage_shell"]);
  assert.equal(Array.from(tile._multiDrawCounts).slice(0, tile._multiDrawCount).reduce((sum, n) => sum + n, 0), 36, "the wall-hidden street box cannot borrow the room's tile exemption");
  cells.visibilityKey = () => visibility.passKey;
  const commands = () => ({ starts: Array.from(tile._multiDrawStarts).slice(0, tile._multiDrawCount), counts: Array.from(tile._multiDrawCounts).slice(0, tile._multiDrawCount) });
  tile.onBeforeRender({ info: { render: { frame: 2 } } }, null, camera);
  const directCommands = commands();
  const other = camera.clone(); other.lookAt(475, 2, -215); other.updateMatrixWorld();
  visibility.prepare(other);
  tile.onBeforeRender({ info: { render: { frame: 3 } } }, null, other);
  const otherCommands = commands();
  for (let pass = 0; pass < 3; pass++) {
    visibility.prepare(camera);
    tile.onBeforeRender({ info: { render: { frame: 4 + pass * 2 } } }, null, camera);
    assert.deepEqual(commands(), directCommands, "restore the direct camera's exact runs");
    visibility.prepare(other);
    tile.onBeforeRender({ info: { render: { frame: 5 + pass * 2 } } }, null, other);
    assert.deepEqual(commands(), otherCommands, "restore the other pass's independent runs");
  }
  tile.setRuns({ cell: result.value.cell, start: result.value.start, count: Int32Array.from(result.value.count, n => n / 2) });
  visibility.prepare(camera);
  tile.onBeforeRender({ info: { render: { frame: 12 } } }, null, camera);
  assert.equal(commands().counts.reduce((sum, n) => sum + n, 0), 18, "a new district's run table invalidates saved commands");
  geometry.dispose(); tile.material.dispose(); room.geometry.dispose(); street.geometry.dispose();
});

check("street props use each prototype's bounds within a shared tile", () => {
  const material = new three.ShaderMaterial({ transparent: true, uniforms: { uSpill: { value: null } } }); material.name = "test_glass";
  const a = new three.Mesh(new three.BoxGeometry(.2, .2, .2), material), b = a.clone();
  a.userData.proto = "visible_prop"; b.userData.proto = "hidden_prop";
  let header = JSON.stringify({ protos: [{ name: "visible_prop", box: [1, 1, 1] }, { name: "hidden_prop", box: [1, 1, 1] }], count: 2 });
  if (header.length % 2) header += " ";
  const bytes = new TextEncoder().encode(header), buffer = new ArrayBuffer(4 + bytes.length + 32);
  new DataView(buffer).setUint32(0, bytes.length, true); new Uint8Array(buffer, 4, bytes.length).set(bytes);
  new Int16Array(buffer, 4 + bytes.length).set([0, 8800, 100, -4300, 0, 100, 1000, 0, 1, 8800, 100, -4120, 0, 100, 1000, 0]);
  const anchors = new Map([["anchor_garage_portal_door", { position: new Vector3(452, 2.3, -215), quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2), extras: { width: 6, height: 4.6 } }]]);
  const visibility = garage.createGarageVisibility(anchors), camera = new three.PerspectiveCamera(60, 1.6, .1, 2000);
  camera.position.set(462, 2, -215); camera.lookAt(440, 2, -215); camera.updateMatrixWorld(); visibility.prepare(camera);
  const opaque = material.clone(); opaque.transparent = false; opaque.name = "metal";
  const c = a.clone(), d = b.clone(); c.material = d.material = opaque;
  let caching = true, boxReads = 0;
  const props = propsModule.createProps([a, b, c, d], buffer, {
    visibleBox: (box, sector) => { boxReads++; return visibility.test(box, sector); },
    visibilityKey: () => caching && visibility.inside ? visibility.passKey : null,
  }); props.update(camera);
  assert.equal(props.group.getObjectByName("props_visible_prop_test_glass").count, 1);
  assert.equal(props.group.getObjectByName("props_hidden_prop_test_glass").count, 0);
  const capture = () => {
    const meshes = [];
    props.group.traverse((mesh) => { if (mesh.isMesh) meshes.push({ name: mesh.name, visible: mesh.visible,
      count: mesh.isInstancedMesh ? mesh.count : null,
      matrices: mesh.isInstancedMesh ? Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16)) : null,
      starts: mesh.isBatchedMesh ? Array.from(mesh._multiDrawStarts.slice(0, mesh._multiDrawCount)) : null,
      counts: mesh.isBatchedMesh ? Array.from(mesh._multiDrawCounts.slice(0, mesh._multiDrawCount)) : null,
    }); });
    return meshes;
  };
  assert.ok(capture().some((mesh) => mesh.counts), "the fixture exercises baked commands as well as instanced matrices");
  const wall = camera.clone(); wall.lookAt(475, 2, -215); wall.updateMatrixWorld();
  const reflected = camera.clone(); reflected.position.y = -2; reflected.lookAt(440, -2, -215); reflected.updateMatrixWorld();
  const outdoors = camera.clone(); outdoors.position.set(440, 2, -215); outdoors.lookAt(462, 2, -215); outdoors.updateMatrixWorld();
  const spacer = wall.clone(); spacer.updateMatrixWorld();
  const use = (view) => { visibility.prepare(view); props.update(view); };
  for (const view of [camera, wall, reflected, outdoors, camera, reflected]) {
    caching = false; use(spacer); use(view);
    const expected = capture();
    caching = true; use(spacer); use(view);
    assert.deepEqual(capture(), expected, "cached passes submit the same geometry and matrices as the ordinary culler");
    use(spacer); visibility.prepare(view);
    const before = boxReads;
    props.update(view);
    assert.deepEqual(capture(), expected, "an outdoor pass cannot overwrite an indoor camera's saved lists");
    if (visibility.inside) assert.equal(boxReads, before, "a stationary pass does not retest every prop box");
  }
  camera.fov = 90; camera.updateProjectionMatrix();
  caching = false; use(spacer); use(camera); const wide = capture();
  caching = true; use(spacer); use(camera);
  assert.deepEqual(capture(), wide, "a projection change invalidates the old prop decisions");
  props.dispose(); a.geometry.dispose(); material.dispose(); opaque.dispose();
});

check("ordinary exterior meshes keep independent portal visibility across passes", () => {
  const scene = new three.Scene();
  const outside = new three.Mesh(new three.BoxGeometry(), new three.MeshBasicMaterial());
  outside.position.set(440, 1, -207);
  const room = outside.clone(); room.position.set(462, 1, -215);
  const parked = new three.Group(); parked.name = "ali_s4_world";
  const car = outside.clone(); parked.add(car);
  scene.add(outside, room, parked); scene.updateMatrixWorld();
  const visibility = { testSphere: (x) => x > 452 };
  const restore = garage.cullGarageObjects(scene, visibility, { car: parked });
  assert.equal(outside.visible, false); assert.equal(room.visible, true); assert.equal(car.visible, true);
  restore(); assert.equal(outside.visible, true);
  const streetPass = garage.cullGarageObjects(scene, { testSphere: () => true }, { car: parked });
  assert.equal(outside.visible, true); streetPass();
  outside.geometry.dispose(); outside.material.dispose();
});

check("room procedural parts share draws while preserving each original local frame", () => {
  const geometry = new three.BoxGeometry(.4, .6, .2);
  geometry.setAttribute("color", new three.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 4).fill(.5), 4));
  const base = new three.ShaderMaterial({ uniforms: { uSpill: { value: null } } }); base.name = "NCW_face";
  const proto = new three.Mesh(geometry, base); proto.userData.proto = "room_frame_test";
  const header = { protos: [{ name: "room_frame_test", box: [.2, .3, .1] }], count: 2, sectorRuns: [{ sector: "garage_s4", start: 0, count: 1 }, { sector: "garage_s6", start: 1, count: 1 }] };
  let json = JSON.stringify(header); while ((4 + Buffer.byteLength(json)) % 4) json += " ";
  const buffer = new ArrayBuffer(4 + Buffer.byteLength(json) + 32);
  new DataView(buffer).setUint32(0, Buffer.byteLength(json), true); new Uint8Array(buffer, 4, Buffer.byteLength(json)).set(Buffer.from(json));
  new Int16Array(buffer, 4 + Buffer.byteLength(json), 16).set([0, 9240, 100, -4300, 1043, 110, 900, 0, 0, 9300, 100, -4400, -1043, 90, 1100, 0]);
  const system = propsModule.createProps([proto], buffer, { reflectLayer: 2 });
  const meshes = system.group.children.filter((o) => o.isMesh);
  assert.equal(meshes.length, 1, "two sectors and placements share a procedural material draw");
  const mesh = meshes[0], g = mesh.geometry;
  assert.equal(mesh.isInstancedMesh, undefined); assert.equal(mesh.layers.mask, 5);
  assert.equal(g.attributes.position.count, 2 * geometry.attributes.position.count);
  const frame = new three.Matrix4(), point = new Vector3();
  for (let i = 0; i < g.attributes.position.count; i++) {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) frame.elements[c * 4 + r] = g.attributes[`_instance_matrix_${c}`].array[i * 4 + r];
    point.fromBufferAttribute(g.attributes._local_position, i).applyMatrix4(frame);
    assert.ok(point.distanceTo(new Vector3().fromBufferAttribute(g.attributes.position, i)) < .0001);
    assert.equal(g.attributes._deal.getX(i), 0);
    assert.deepEqual(Array.from(g.attributes._local_normal.array.slice(i * 3, i * 3 + 3)), Array.from(geometry.attributes.normal.array.slice((i % geometry.attributes.normal.count) * 3, (i % geometry.attributes.normal.count) * 3 + 3)));
  }
  assert.ok(mesh.material.vertexShader.includes("attribute float _deal"));
  system.dispose(); geometry.dispose(); base.dispose();
});

check("paint batching preserves moving rig matrices, physical bounds, picking and resource lifetime", () => {
  const root = new three.Group(), hood = new three.Group(), wheel = new three.Group(); root.add(hood, wheel);
  const material = new three.MeshStandardMaterial(); material.name = "s4_paint";
  const a = new three.Mesh(new three.BoxGeometry(2, .3, 3), material), b = new three.Mesh(new three.BoxGeometry(1, .1, .8), material), c = new three.Mesh(new three.BoxGeometry(.3, .6, .6), material);
  root.add(a); hood.add(b); wheel.add(c); hood.position.set(0, .5, .8); wheel.position.set(.9, -.3, .9);
  const camera = new three.PerspectiveCamera(50, 1.6, .1, 100), ray = new three.Raycaster();
  root.position.set(463, 1, -215); root.rotation.y = .67; root.updateMatrixWorld(true);
  const hitDistance = () => { camera.position.set(470, 1.2, -209); camera.lookAt(root.position); camera.updateMatrixWorld(); ray.setFromCamera(new three.Vector2(), camera); return ray.intersectObject(root, true)[0]?.distance; };
  const sources = []; root.traverse(node => { if (node.isMesh) sources.push(node); });
  const before = hitDistance(), batch = paintBatchModule.createGaragePaintBatch(root);
  assert.ok(batch); assert.ok([a, b, c].every(n => n.layers.mask === 0));
  assert.ok(Math.abs(hitDistance() - before) < 1e-7, "the same painted surface receives physical picks");
  for (let step = 0; step <= 20; step++) {
    batch.mesh.visible = false; const expected = inspectionModule.localBounds(root).clone(); batch.mesh.visible = true;
    root.position.x = 463 + step / 10; root.rotation.y = .67 + step / 100; hood.rotation.x = -step / 20; wheel.rotation.x = step / 5;
    batch.mesh.visible = false; const moved = inspectionModule.localBounds(root).clone(); batch.mesh.visible = true;
    const actual = inspectionModule.localBounds(root);
    assert.deepEqual(actual.toArray?.() ?? [actual.min.toArray(), actual.max.toArray()], [moved.min.toArray(), moved.max.toArray()]);
    assert.ok(!expected.isEmpty());
    const matrix = new three.Matrix4(); for (const [i, source] of sources.entries()) { batch.mesh.getMatrixAt(i, matrix); assert.deepEqual(matrix.elements, Array.from(Float32Array.from(source.matrixWorld.elements)), "GPU batch matrices equal the original model uniforms exactly"); }
  }
  root.updateMatrixWorld(true); const version = batch.mesh._matricesTexture.version; root.updateMatrixWorld(true); assert.equal(batch.mesh._matricesTexture.version, version, "a stationary rig does not upload the same matrix texture again");
  const shader = { uniforms: {}, vertexShader: "#include <common>\n#include <project_vertex>\n#include <defaultnormal_vertex>", fragmentShader: "" };
  batch.mesh.material.onBeforeCompile(shader, {});
  const render = view => batch.mesh.onBeforeRender({}, null, view, batch.mesh.geometry, batch.mesh.material);
  render(camera);
  const viewTexture = shader.uniforms.uGaragePaintView.value, normalTexture = shader.uniforms.uGaragePaintNormal.value;
  for (const [id, source] of sources.entries()) {
    const mv = new three.Matrix4().multiplyMatrices(camera.matrixWorldInverse, source.matrixWorld), normal = new three.Matrix3().getNormalMatrix(mv);
    assert.deepEqual(Array.from(viewTexture.image.data.slice(id * 16, id * 16 + 16)), Array.from(Float32Array.from(mv.elements)));
    for (let i = 0; i < 9; i++) assert.equal(normalTexture.image.data[id * 12 + Math.floor(i / 3) * 4 + i % 3], Math.fround(normal.elements[i]));
  }
  const viewVersion = viewTexture.version, normalVersion = normalTexture.version;
  render(camera); assert.equal(viewTexture.version, viewVersion); assert.equal(normalTexture.version, normalVersion);
  const reflected = camera.clone(); reflected.position.y *= -1; reflected.updateMatrixWorld(); render(reflected); render(camera);
  assert.equal(shader.uniforms.uGaragePaintView.value, viewTexture); assert.equal(viewTexture.version, viewVersion, "a returning camera binds its original texture without reuploading it");
  let disposed = 0; batch.mesh._matricesTexture.addEventListener("dispose", () => disposed++); batch.dispose(); assert.equal(disposed, 1); assert.ok([a, b, c].every(n => n.layers.mask === 1));
  for (const source of [a, b, c]) source.geometry.dispose(); material.dispose();
});

check("all six probe faces prepare their own portals and prop runs through the transform wrapper", () => {
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const from = source.indexOf("  const renderScene = renderer.render;"), to = source.indexOf("  const draw =", from);
  const scene = new three.Scene(), capture = new three.Scene(), wrapper = new three.Group(), root = new three.Group();
  capture.add(wrapper); wrapper.add(root);
  const portals = [], props = [], drawn = [];
  const city = { root, visibility: { prepare: (view) => portals.push(view) }, props: { update: (view) => props.push(view) } };
  const renderer = { render: (_scene, view) => drawn.push(view) };
  runInNewContext(source.slice(from, to), { renderer, city, scene, car: null });
  const faces = Array.from({ length: 6 }, () => new three.PerspectiveCamera(90, 1, .1, 60));
  for (const face of faces) renderer.render(capture, face);
  assert.deepEqual(portals, faces); assert.deepEqual(props, faces); assert.deepEqual(drawn, faces);
  renderer.render(new three.Scene(), faces[0]);
  assert.equal(portals.length, 6, "postprocessing scenes cannot replace the portal state");
});

check("exterior batches keep signals, local shader frames, layers and exact light sources", () => {
  const wire = (header, rows) => {
    let json = JSON.stringify(header); while ((4 + Buffer.byteLength(json)) % 4) json += " ";
    const bytes = Buffer.alloc(4 + Buffer.byteLength(json) + rows.length * 16);
    bytes.writeUInt32LE(Buffer.byteLength(json)); bytes.write(json, 4);
    const values = new Int16Array(bytes.buffer, bytes.byteOffset + 4 + Buffer.byteLength(json), rows.length * 8);
    values.set(rows.flat()); return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  };
  const base = new three.ShaderMaterial({ uniforms: { uSpill: { value: null } } }); base.name = "glow";
  const geometry = new three.BoxGeometry(.2, .3, .1).toNonIndexed();
  geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i));
  geometry.setAttribute("color", new three.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 4).fill(.5), 4));
  const glow = new three.Mesh(geometry, base); glow.name = "proto_traffic_light_glow"; glow.userData.proto = "traffic_light";
  const faceMat = new three.ShaderMaterial(); faceMat.name = "NCW_face";
  const face = new three.Mesh(geometry, faceMat); face.name = "proto_signal_box_face"; face.userData.proto = "signal_box";
  const header = { protos: [{ name: "traffic_light", box: [.5, 1, .5], reach: 300 }, { name: "signal_box", box: [.5, 1, .5], reach: 300 }], count: 2 };
  const rows = [[0, 8800, 100, -4300, 0, 100, 1000, 0], [1, 8800, 100, -4300, 0, 100, 1000, 0]];
  const full = wire(header, rows), empty = wire({ ...header, count: 0 }, []);
  const exterior = new three.Group();
  for (const [i, src] of [glow, face].entries()) {
    const g = geometry.clone(), matrix = new three.Matrix4().makeTranslation(440, 2, -215);
    g.applyMatrix4(matrix);
    if (i) {
      g.setAttribute("_local_position", geometry.attributes.position.clone()); g.setAttribute("_local_normal", geometry.attributes.normal.clone());
      for (let col = 0; col < 4; col++) g.setAttribute(`_instance_matrix_${col}`, new three.Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => matrix.elements.slice(col * 4, col * 4 + 4)).flat(), 4));
      g.setAttribute("_deal", new three.Float32BufferAttribute(new Float32Array(g.attributes.position.count), 1));
    }
    const node = new three.Mesh(g, { name: `NCW_${i ? "face" : "glow"}` }); node.name = `exterior_test_${i}`;
    node.userData = { sourceKind: "prop", visibilitySector: "exterior", sourceLayers: 5, shaderLocal: Boolean(i), runs: [[36, -18, 300, 0, g.index.count]], placements: [[i, i, src.userData.proto, src.name, 0, g.index.count]] };
    exterior.add(node);
  }
  const original = propsModule.createProps([glow, face], full, { reflectLayer: 2 });
  const batch = propsModule.createProps([glow, face], empty, { exterior, originalBuffer: full, reflectLayer: 2 });
  const lightRows = (system) => system.sources.flatMap((light) => Array.from(light.mesh.geometry.attributes.position.array).map((value) => `${light.color.getHexString()}:${light.intensity}:${value}`)).sort();
  assert.deepEqual(lightRows(batch), lightRows(original), "every source triangle, colour and gain survives removal of its placement");
  const signal = batch.written("traffic_light"); assert.equal(signal.length, 1); assert.equal(signal[0].matrices[13], 2);
  const local = batch.group.getObjectByName("exterior_test_1");
  const signalFace = batch.dealt("signal_box");
  assert.equal(signalFace.matrices.length, 16); signalFace.deal(0, -.5);
  assert.ok(Array.from(local.geometry.attributes._deal.array).every((v) => v === -.5), "crossing signals still update a taken placement");
  assert.equal(local.layers.mask, 5); assert.ok(local.material.vertexShader.includes("mat4(_instance_matrix_0"));
  assert.ok(local.material.vertexShader.includes("attribute float _deal"));
  const camera = new three.PerspectiveCamera(60, 1, .1, 200); camera.position.set(450, 2, -215); camera.lookAt(440, 2, -215); batch.update(camera);
  assert.ok(local.visible); assert.ok(local._multiDrawCount > 0);
  camera.far = 1000; camera.updateProjectionMatrix();
  camera.position.set(742.9, 2, -215); camera.lookAt(440, 2, -215); batch.update(camera);
  assert.ok(local.visible, "reach uses the original shared prop bounds, not the smaller mesh bounds");
  camera.lookAt(760, 2, -215); batch.update(camera); assert.equal(local.visible, false);
  original.dispose(); batch.dispose(); geometry.dispose(); base.dispose(); faceMat.dispose();
});

check("the road mirror does not repack the unreflected skyline", () => {
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const from = source.indexOf("  const renderScene = renderer.render;"), to = source.indexOf("  const draw =", from);
  const scene = { children: [], matrixWorldAutoUpdate: true }, skylineCameras = [], crowdCameras = [];
  const city = { root: {}, visibility: { exteriorVisible: true, inside: false, prepare() {} }, props: { update() {} } };
  const renderer = { render() {}, getPixelRatio: () => 1 };
  const skyline = { update: (camera) => skylineCameras.push(camera) }, crowd = { update: (camera) => crowdCameras.push(camera) };
  const main = new three.PerspectiveCamera(), reflected = new three.PerspectiveCamera();
  main.layers.enable(2); reflected.layers.set(2); reflected.layers.enable(3);
  runInNewContext(source.slice(from, to), { renderer, city, scene, car: null, skyline, crowd });
  renderer.render(scene, reflected); renderer.render(scene, main);
  assert.deepEqual(skylineCameras, [main]);
  assert.deepEqual(crowdCameras, [reflected, main], "reflected crowd visibility remains prepared");
});

check("per-pass exterior culling restores visibility and keeps room lights and car shadows", () => {
  const source = readFileSync("src/world/world-scene.js", "utf8");
  const from = source.indexOf("  const renderScene = renderer.render;");
  const to = source.indexOf("  const draw =", from);
  const room = { visible: true }, carRoot = { visible: true };
  const light = { visible: true, name: "car_lights" };
  const contact = { visible: true, name: "", isGroup: true };
  const outside = { visible: true, name: "traffic" };
  const alreadyHidden = { visible: false, name: "rain" };
  const scene = { children: [room, carRoot, light, contact, outside, alreadyHidden] };
  const city = { root: room, visibility: { exteriorVisible: false, prepare() {} }, props: { update() {} } };
  const camera = { updateMatrixWorld() {} };
  const renderer = { render() {
    assert.equal(outside.visible, false);
    for (const node of [room, carRoot, light, contact]) assert.equal(node.visible, true);
    throw new Error("render failed");
  } };
  runInNewContext(source.slice(from, to), { renderer, city, scene, car: { car: carRoot } });
  assert.throws(() => renderer.render(scene, camera), /render failed/);
  assert.equal(outside.visible, true, "the next pass can see the exterior again");
  assert.equal(alreadyHidden.visible, false, "culling cannot revive a hidden system");
});

check("portal visibility keeps real openings for main and reflected cameras", () => {
  const anchors = new Map([["anchor_garage_portal_door", { position: new Vector3(452, 2.3, -215), quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2), extras: { width: 6, height: 4.6 } }]]);
  const visibility = garage.createGarageVisibility(anchors);
  const camera = new three.PerspectiveCamera(60, 1.6, .1, 2000);
  const box = (x, y, z) => new three.Box3(new Vector3(x - .1, y - .1, z - .1), new Vector3(x + .1, y + .1, z + .1));
  camera.position.set(462, 2, -215); camera.lookAt(440, 2, -215); camera.updateMatrixWorld(); visibility.prepare(camera);
  assert.ok(visibility.test(box(440, 1, -215)), "street through the doorway");
  assert.equal(visibility.testSphere(440, 1, -215, .1), true);
  assert.equal(visibility.testTrafficSphere(440, 1, -215, .1), true);
  assert.equal(visibility.testTrafficSphere(440, 1, -150, .1), false);
  assert.equal(visibility.testTrafficSphere(440, 40, -215, .1), true, "one traffic list conservatively covers both direct and reflected sight");
  assert.equal(visibility.testSphere(440, 1, -150, .1), false, "shader-positioned batches use the same portal");
  assert.ok(!visibility.test(box(440, 1, -150)), "street hidden by the side wall");
  assert.ok(visibility.test(box(467, 1, -225), "garage_s6"), "open room remains visible");
  camera.lookAt(475, 2, -215); camera.updateMatrixWorld(); visibility.prepare(camera);
  assert.equal(visibility.exteriorVisible, false, "solid wall has no visible portal");
  assert.equal(visibility.roadVisible, false, "no road mirror behind the wall");
  assert.equal(visibility.testSphere(440, 1, -215, .1), false);
  assert.equal(visibility.test(box(440, 1, -215)), false, "opening behind camera submits no street");
  camera.position.y = -2; camera.lookAt(440, -2, -215); camera.updateMatrixWorld(); visibility.prepare(camera);
  assert.ok(visibility.test(box(440, 1, -215)), "reflected aperture keeps street light");
  assert.equal(visibility.testTrafficSphere(440, 1, -215, .1), true);
  assert.equal(visibility.testTrafficSphere(440, 1, -150, .1), false);
  camera.position.set(440, 2, -215); camera.lookAt(462, 2, -215); camera.updateMatrixWorld(); visibility.prepare(camera);
  assert.ok(visibility.test(box(462, 2, -215), "garage_s4"));
  assert.ok(!visibility.test(box(462, 2, -225), "garage_s6"), "outside cannot see through a closed wall");
  assert.equal(visibility.test(box(462, 2, -225), "garage_shell"), true, "the workshop's outer walls and roof stay visible from the street");
  assert.ok(visibility.test(box(440, 1, -150)), "exterior culling is unchanged outdoors");
  const direct = camera.clone(), reflected = camera.clone();
  direct.position.set(462, 2, -215); direct.lookAt(475, 2, -215); direct.updateMatrixWorld();
  reflected.position.set(462, -2, -215); reflected.lookAt(440, -2, -215); reflected.updateMatrixWorld();
  for (let pass = 0; pass < 3; pass++) {
    visibility.prepare(direct);
    assert.equal(visibility.exteriorVisible, false, "restored direct pass keeps its wall cull");
    assert.equal(visibility.test(box(440, 1, -215)), false);
    visibility.prepare(reflected);
    assert.equal(visibility.exteriorVisible, true, "restored reflected pass keeps its own aperture");
    assert.equal(visibility.test(box(440, 1, -215)), true);
  }
  reflected.fov = 5; reflected.updateProjectionMatrix(); reflected.lookAt(440, -2, -150); reflected.updateMatrixWorld();
  visibility.prepare(reflected);
  assert.equal(visibility.test(box(440, 1, -215)), false, "a changed lens/pose invalidates the saved pass");
});

check("immersive Arrival fits its sticky controls and has an inverse mapping", () => {
  const shots = [{ id: "stack", top: 1000, height: 1000 }, { id: "garage", top: 3000, height: 7000 }, { id: "contact", top: 11000, height: 1000 }];
  const [start, end] = scrollModule.holdRange(shots, 1, 1000, 11000);
  assert.equal(start, 3000);
  assert.equal(scrollModule.holdRange(shots, 0, 1000, 11000)[1], 1000);
  assert.equal(scrollModule.positionAt(shots, start, 1000, 11000), 1);
  for (const p of [0, .2, .4, .6, .8, 1]) {
    const y = scrollModule.garageScrollFor(p, shots, 1000, 11000);
    assert.ok(Math.abs(scrollModule.garageProgressAt(shots, y, 1000, 11000) - p) < 1e-10);
    assert.ok(y >= start && y <= end);
  }
  shots[1].height = 2500;
  assert.equal(scrollModule.holdRange(shots, 1, 1000, 11000)[0], 2800, "text keeps the ordinary mapping");
});

check("Smasher art keeps its declared clamped map and neutral base", () => {
  const registry = materialModule.createGarageMaterials({});
  const source = new three.MeshStandardMaterial();
  source.name = "NCW_garage_identity_poster";
  source.side = three.DoubleSide;
  source.map = new three.Texture();
  source.userData = { runtime: "painted_wall", slots: '["baseColor"]', wrap: "clamp", params: { baseTint: "#ffffff", uvScale: [1, 1] } };
  assert.ok(registry.owns(source));
  const material = registry.forName(source);
  assert.equal(material.uniforms.uMap.value, source.map);
  assert.equal(source.map.colorSpace, three.SRGBColorSpace);
  assert.equal(source.map.wrapS, three.ClampToEdgeWrapping);
  assert.equal(source.map.wrapT, three.ClampToEdgeWrapping);
  assert.equal(material.uniforms.uBase.value.getHex(), 0xffffff);
  assert.equal(material.side, three.DoubleSide, "the thin print stays visible from the room");
  assert.deepEqual(registry.missing, []);
  registry.dispose(); source.dispose();
});

// Exercise the car adapter boundary, including another camera and a query
// after the owner attaches its rig. Child visibility must never expose it.
const presentationScene = new three.Scene();
let pendingRoot, pendingShadow, pendingContext, pendingDisposed = false;
const pendingCars = garage.createGaragePresentation((context) => {
  pendingContext = context;
  pendingRoot = new three.Group(); pendingShadow = new three.Group();
  context.scene.add(pendingRoot, pendingShadow);
  const rows = [{ carId: "s4" }, { carId: "s6" }];
  return { ready: Promise.resolve(), stats: { s6: { placeholder: true } },
    bounds: () => rows, anchors: () => rows, occluders: () => rows,
    attach: () => { pendingRoot.visible = pendingShadow.visible = true; },
    pick: () => pendingRoot.visible ? { carId: "s6" } : { carId: "s4" },
    flash: (id) => id, dispose: () => { pendingDisposed = true; },
  };
}, { scene: presentationScene }, { s6Available: false });
await pendingCars.ready;
check("unavailable S6 stays invisible and absent from physical queries", () => {
  pendingCars.attach();
  assert.equal(pendingContext.placeholder, true);
  assert.equal(pendingRoot.parent.visible, false);
  assert.equal(pendingShadow.parent.visible, false);
  for (const query of ["bounds", "anchors", "occluders"]) assert.deepEqual(pendingCars[query]().map((r) => r.carId), ["s4"]);
  assert.equal(pendingCars.pick({}).carId, "s4");
  assert.equal(pendingRoot.visible, true, "query restores the owner's child state");
  assert.equal(pendingCars.flash("s6"), null);
  assert.equal(pendingCars.flash("s4"), "s4");
  assert.equal(pendingCars.stats.s6.visitorOmitted, true);
  pendingCars.dispose();
  assert.ok(pendingDisposed);
  assert.equal(presentationScene.children.length, 0);
});

// Rig geometry needs no texture pixels. Resolve before phone preparation and
// retain the same carrier through wheel phases, as the runtime does.
await carDecoder.ready;
const carBytes = readFileSync("public/models/ali-s4.glb");
const s4 = (await new GLTFLoader().setMeshoptDecoder(carDecoder).register(() => ({ name: "CheckRigGeometry", loadTexture: () => Promise.resolve(new three.Texture()) })).parseAsync(carBytes.buffer.slice(carBytes.byteOffset, carBytes.byteOffset + carBytes.byteLength), "")).scene;
check("S4 suspension follows its steering carrier without tyre spin", () => {
  const wheel = s4.getObjectByName("wheel_fl");
  const steering = s4.getObjectByName("steer_fl");
  const suspension = inspectionModule.resolveAnchor(s4, s4Mods.find((m) => m.id === "suspension").anchor);
  const wheelPin = inspectionModule.resolveAnchor(s4, s4Mods.find((m) => m.id === "wheels").anchor);
  assert.equal(suspension.owner, steering);
  assert.equal(wheelPin.owner, wheel, "wheel-centred pins keep their rolling owner");
  const original = suspension.owner.localToWorld(suspension.local.clone());
  for (const angle of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI]) {
    wheel.rotation.x = angle;
    s4.updateMatrixWorld(true);
    const point = suspension.owner.localToWorld(suspension.local.clone());
    assert.ok(point.distanceTo(original) < 1e-8, `suspension moved at wheel phase ${angle}`);
    assert.ok(point.y > .6, "suspension marker stays above the wheel centre and floor");
  }
});
s4.traverse((node) => { node.geometry?.dispose(); for (const material of [].concat(node.material ?? [])) material.dispose(); });

if (placeholders.size) {
  console.log(`check:garage: ${placeholders.size} pose/path stand-ins still from the plan, not the kit:`);
  console.log(`  ${[...placeholders].sort().join(", ")}`);
}
if (failures.length) {
  console.error(`check:garage failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("check:garage passed");
