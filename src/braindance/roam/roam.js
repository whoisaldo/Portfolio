// src/braindance/roam/roam.js: free roam, the recording put down.
//
// The braindance plays a recorded drive. This is the same city with the
// tape stopped and the keys handed over: the S4 at the foot of the avenue
// (spawn_drive in the builder's anchors.json), to drive round the loop and
// every street, and to get out of and walk. The engine
// (src/braindance/engine.js) still owns the frame: each one it asks this
// module where the car and the camera are, and draws.
//
// Its own chunk, fetched the first time free roam is asked for, with the
// builder's exports (the anchors, the road graph, the districts) fetched
// then too: a visitor who only watches the recording downloads none of it.
import * as THREE from "three";
import { bd, set } from "../store.js";
import { clamp } from "../../world/shots.js";
import { buildInWorker, gatherKit, solidBoxes } from "./nav.js";

// The builder's exports, beside the kit's GLBs. Asked for afresh each visit
// (a conditional request: a rebuilt city never meets a stale map of itself).
const exported = (name) => fetch(`${import.meta.env?.BASE_URL || "/"}scenes/world/${name}`, { cache: "no-cache" }).then((r) => {
  if (!r.ok) throw new Error(`${name} ${r.status}`);
  return r.json();
});

const DEG = Math.PI / 180;
// The keys roam holds, by code (so W A S D are where they are on any
// layout).
const HELD = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createRoam({ parts, world, reduced = false, city = { boardSlot: 5, boardCount: 1, towers: [] }, onProgress = () => {} }) {
  const [anchorFile, districtFile, graph, collision] = await Promise.all([exported("anchors.json"), exported("districts.json"), exported("road-graph.json"), exported("collision.json")]);
  onProgress(0.05);
  const anchor = (name) => anchorFile.anchors.find((a) => a.name === name);
  const spawn = anchor("spawn_drive") ?? { at: [1.85, 0, -6], yaw: Math.PI };
  const spawnWalk = anchor("spawn_walk") ?? { at: [11.8, 0.16, -6], yaw: Math.PI };
  const districts = districtFile.districts;
  const districtAt = (x, z) => districts.find((d) => x >= d.bounds.x0 && x <= d.bounds.x1 && z >= d.bounds.z0 && z <= d.bounds.z1)?.label ?? "";

  // ---- the map ----------------------------------------------------------------
  // Made from the whole city, so every district's pack has to be in first
  // (they stream in behind the core; half a minute is given to a slow one,
  // and a district that never came has no ground to stand on).
  for (let waited = 0; waited < 30000; waited += 200) {
    const s = world.stats();
    if (s.packs.length >= s.packsTotal) break;
    await sleep(200);
  }
  const bounds = districts.reduce(
    (b, d) => ({ x0: Math.min(b.x0, d.bounds.x0 - 8), z0: Math.min(b.z0, d.bounds.z0 - 8), x1: Math.max(b.x1, d.bounds.x1 + 8), z1: Math.max(b.z1, d.bounds.z1 + 8) }),
    { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity },
  );
  // Where wheels may go: the carriageways (kerb to kerb, the junctions'
  // squares, the deck and its turn) and the garage's own room and apron.
  // Inside them the kit's kerbs and walls are what stops the car; the
  // rectangles only keep it from a lane's mouth and off a dropped kerb.
  const carIn = [];
  const lot = (xa, za, xb, zb) => carIn.push(xa - 0.1, za - 0.1, xb + 0.1, zb + 0.1);
  const streets = districtFile.streets;
  for (const s of streets) {
    if (s.axis === "z") lot(s.c - s.half, s.from, s.c + s.half, s.to);
    else lot(s.from, s.c - s.half, s.to, s.c + s.half);
    if (s.axis !== "z") continue;
    for (const t of streets) if (t.axis === "x" && t.c >= s.from - 0.01 && t.c <= s.to + 0.01 && s.c >= t.from - 0.01 && s.c <= t.to + 0.01) lot(s.c - s.half, t.c - t.half, s.c + s.half, t.c + t.half);
  }
  const deck = graph.loop.deck;
  lot(deck.x0 - deck.half, deck.z - deck.half, deck.x1, deck.z + deck.half);
  const shelter = parts.city.anchors.get("anchor_shelter_garage");
  const bayAt = parts.city.anchors.get("anchor_garage_bay")?.position;
  if (shelter?.extras?.size && bayAt) {
    const [sx, , sz] = shelter.extras.size;
    lot(shelter.position.x, shelter.position.z, shelter.position.x + sx, shelter.position.z + sz);
    lot(shelter.position.x - 5, bayAt.z - 4.1, shelter.position.x + 1, bayAt.z + 4.1);
  }
  // The garage's apron: the S4's own road crosses the pavement into the bay
  // there, and the kit builds that as a kerb like any other.
  const carRamps = carIn.slice(-4);
  // What the map costs, kept with it (nav.stats.main): the milliseconds on
  // this thread gathering the kit's triangles, the bytes handed to the
  // worker, and the wait from asking to having it.
  const t0 = performance.now();
  let slices = 0;
  const kit = await gatherKit(parts.city.root, () => new Promise((resolve) => (slices++, requestAnimationFrame(resolve))));
  const main = { gatherMs: Math.round(performance.now() - t0), gatherSlices: slices + 1, sentBytes: kit.positions.byteLength + kit.index.byteLength };
  const nav = await buildInWorker(
    {
      ...kit,
      ...solidBoxes(collision),
      bounds,
      walkFrom: [spawnWalk.at],
      carFrom: [spawn.at],
      carIn: Float32Array.from(carIn),
      carRamps: Float32Array.from(carRamps),
      diagnose: import.meta.env.DEV,
      // Dev, `?navall`: the floors no flood reached are kept too, to see why.
      keepAll: import.meta.env.DEV && new URLSearchParams(window.location.search).has("navall"),
    },
    (p) => onProgress(0.05 + 0.95 * p),
  );
  main.waitMs = Math.round(performance.now() - t0);
  nav.stats.main = main;

  // ---- the player --------------------------------------------------------
  // The S4: where its wheels stand, which way it points (0 faces +z, as the
  // kit's yaw), its speed along its nose.
  const car = { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0, v: 0, steer: 0, ds: 0, brake: 0, reverse: 0, cut: true };
  const place = () => {
    car.x = spawn.at[0];
    car.y = spawn.at[1];
    car.z = spawn.at[2];
    car.heading = spawn.yaw ?? Math.PI;
    car.pitch = car.roll = car.v = car.steer = car.ds = 0;
    car.cut = true;
  };

  // ---- the camera --------------------------------------------------------
  // Behind and above the car, looking past its roof down the road. A drag
  // swings it round the car and lets go back to behind.
  const chase = { yaw: 0, pitch: 12 * DEG, yawGoal: 0, pitchGoal: 12 * DEG, radius: 7.2, held: false, idle: 0 };
  const _at = new THREE.Vector3();
  const chasePose = (dt, pose) => {
    const a = 1 - Math.exp(-dt * 8);
    chase.yaw += (chase.yawGoal - chase.yaw) * (dt > 0 ? a : 1);
    chase.pitch += (chase.pitchGoal - chase.pitch) * (dt > 0 ? a : 1);
    // Let go, and after a moment it comes back round behind the car.
    chase.idle = chase.held ? 0 : chase.idle + dt;
    if (!chase.held && chase.idle > 1.6 && bd.mode !== "photo") {
      chase.yawGoal *= Math.exp(-dt * 2.2);
      chase.pitchGoal += (12 * DEG - chase.pitchGoal) * (1 - Math.exp(-dt * 2.2));
    }
    const yaw = car.heading + Math.PI + chase.yaw;
    _at.set(car.x, car.y + 1.05, car.z);
    pose.position.set(
      _at.x + Math.sin(yaw) * Math.cos(chase.pitch) * chase.radius,
      _at.y + Math.sin(chase.pitch) * chase.radius,
      _at.z + Math.cos(yaw) * Math.cos(chase.pitch) * chase.radius,
    );
    pose.position.y = Math.max(car.y + 0.4, pose.position.y);
    pose.target.copy(_at);
    pose.fov = 55;
    pose.shift = 0;
  };

  let on = false;
  const keys = new Set();

  // ---- the city, with no recording to time it ---------------------------------
  // The plaza's board flips through its entries on roam's own clock, corpo
  // row stands lit, and the garage's door goes up for whoever comes to it
  // and its tubes strike once they are inside.
  let clock = 0;
  const bay = parts.city.anchors.get("anchor_garage_bay")?.position ?? new THREE.Vector3(462, 0, -215);
  const garage = { door: 0 };
  const cityFrame = (dt, spec, x, z) => {
    clock += dt;
    spec.board = Math.floor(clock / city.boardSlot) % city.boardCount;
    spec.towers = city.towers;
    const away = Math.hypot(x - bay.x, z - bay.z);
    garage.door = clamp(garage.door + (away < 34 ? dt : -dt) / 2.6, 0, 1);
    spec.garage.door = garage.door;
    spec.garage.tubes = away < 13;
  };

  return {
    car,
    nav,
    graph,
    get on() {
      return on;
    },
    /** Into the S4 at the foot of the avenue. */
    enter() {
      on = true;
      place();
      chase.yaw = chase.yawGoal = 0;
      chase.pitch = chase.pitchGoal = 12 * DEG;
      chase.radius = 7.2;
      set({ roam: "drive", district: districtAt(car.x, car.z), prompt: "out" });
    },
    /** The car goes back to the recording. */
    leave() {
      on = false;
      keys.clear();
      parts.car?.endFree();
      set({ roam: "off", district: "", prompt: "", locked: false });
    },
    /**
     * One frame: step the player, put the S4 there, and write what the
     * engine draws with: the camera's `pose`, and into `spec` the car's
     * place, heading and speed (the scanner, the sound and the HUD read
     * them) and how much of the wet road's mirror the camera sees.
     */
    frame(dt, spec, pose) {
      // Photo mode holds the moment.
      const step = bd.mode === "photo" ? 0 : dt;
      car.ds = 0;
      parts.car?.free(step, car);
      car.cut = false;
      chasePose(dt, pose);
      spec.carPosition.set(car.x, car.y, car.z);
      spec.carHeading = car.heading;
      spec.car.v = car.v;
      spec.mirror = 1 - clamp((pose.position.y - 6) / 22, 0, 1);
      cityFrame(step, spec, car.x, car.z);
      const label = districtAt(car.x, car.z);
      if (label !== bd.district) set({ district: label });
      return step;
    },
    /** A key down or up, by its code. True if it was one of roam's. */
    key(code, down) {
      if (!HELD.has(code)) return false;
      if (down) keys.add(code);
      else keys.delete(code);
      return true;
    },
    /** Every key let go (the window lost the keyboard). */
    release() {
      keys.clear();
    },
    /** A drag on the city: swing the camera round the car. */
    drag(dx, dy) {
      chase.yawGoal -= dx * 0.005;
      chase.pitchGoal = clamp(chase.pitchGoal + dy * 0.004, 2 * DEG, 50 * DEG);
      chase.idle = 0;
    },
    hold(held) {
      chase.held = held;
    },
    zoom(delta) {
      chase.radius = clamp(chase.radius * Math.exp(delta * 0.001), 4.5, 14);
    },
    reduced,
    dispose() {
      if (on) parts.car?.endFree();
      on = false;
    },
  };
}
