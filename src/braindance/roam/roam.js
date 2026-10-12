// src/braindance/roam/roam.js: free roam, the recording put down.
//
// The braindance plays a recorded drive. This is the same city with the
// tape stopped and the keys handed over: the S4 at the foot of the avenue
// (spawn_drive in the builder's anchors.json), to drive round the loop and
// every street (vehicle.js, chase.js), and to get out of and walk
// (walker.js), all of it on the map nav.js makes of the city. The engine
// (src/braindance/engine.js) still owns the frame: each one it asks this
// module where the car and the camera are, and draws.
//
// F gets out of the car (on the driver's side if there is room there; at
// speed the car first brakes itself to a stand, and W or S calls that off)
// and back into it from beside it. R is the way out of any
// corner: the car set down on the nearest lane of the road graph, facing
// along it, with the player in it.
//
// Its own chunk, fetched the first time free roam is asked for, with the
// builder's exports (the anchors, the road graph, the districts) fetched
// then too: a visitor who only watches the recording downloads none of it.
import * as THREE from "three";
import { bd, set } from "../store.js";
import { clamp } from "../../world/shots.js";
import { buildInWorker, gatherKit, solidBoxes, CAR, WALK } from "./nav.js";
import { createVehicle } from "./vehicle.js";
import { createChase } from "./chase.js";
import { createWalker, BODY } from "./walker.js";
import { createYield } from "./yield.js";

// The builder's exports, beside the kit's GLBs. Asked for afresh each visit
// (a conditional request: a rebuilt city never meets a stale map of itself).
const exported = (name) => fetch(`${import.meta.env?.BASE_URL || "/"}scenes/world/${name}`, { cache: "no-cache" }).then((r) => {
  if (!r.ok) throw new Error(`${name} ${r.status}`);
  return r.json();
});

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

  // ---- the traffic and the people ------------------------------------------
  // The cars brake for the player and are solid to them (yield.js): what
  // the S4 and the walker stand on and are stopped by is the map with the
  // cars near them added to its walls. Off a car and into a wall and back
  // into the car, and there is no room there.
  const yielding = createYield(parts.traffic);
  const ground = yielding
    ? Object.assign(Object.create(nav), {
        resolve(p, r, y, bit, tol, feet) {
          const hit = nav.resolve(p, r, y, bit, tol, feet);
          if (hit === 2 || !yielding.push(p, r, y)) return hit;
          return nav.resolve(p, r, y, bit, tol, feet) && yielding.push(p, r, y) ? 2 : 1;
        },
        fits(x, z, r, y, bit, tol, feet) {
          return nav.fits(x, z, r, y, bit, tol, feet) && !yielding.overlaps(x, z, r, y);
        },
      })
    : nav;

  // ---- the player --------------------------------------------------------
  // The S4 (vehicle.js): where its wheels stand, which way it points (0
  // faces +z, as the kit's yaw), its speed along its nose.
  const vehicle = createVehicle(ground);
  const car = vehicle.car;
  const chase = createChase(nav, { reduced });
  const feet = createWalker(ground, { reduced });
  const walker = feet.w;
  // Where the player is and how fast, for whoever has to get out of the
  // way: the S4 (`car`), whether the player is out of it (`afoot`, and
  // then x, y, z are the walker's), the ground velocity of whichever.
  const player = { afoot: false, x: 0, y: 0, z: 0, vx: 0, vz: 0, car };
  const velocity = { x: 0, z: 0 };
  const input = { throttle: 0, brake: 0, steer: 0, hand: false };
  const parked = { throttle: 0, brake: 0, steer: 0, hand: true };
  const stride = { ahead: 0, side: 0, run: false };
  const keys = new Set();
  const held = (...codes) => codes.some((c) => keys.has(c));
  let on = false;
  // "drive" or "walk" (the store's `roam` while on).
  let mode = "drive";

  // Every lane of the road graph as places a car can be put down on: a
  // point a metre, with the way the lane runs. R sets the car on the
  // nearest (its own level first: on the deck that is the deck).
  const lanes = [];
  for (const edge of graph.edges) {
    const pts = edge.points;
    const northSouth = Math.abs(pts[pts.length - 1][0] - pts[0][0]) < 0.01;
    for (const lane of edge.lanes) {
      const ahead = lane.toward === edge.to ? 1 : -1;
      for (let n = 0; n < pts.length; n++) {
        const a = pts[Math.max(0, n - 1)];
        const b = pts[Math.min(pts.length - 1, n + 1)];
        lanes.push({
          x: pts[n][0] + (northSouth ? lane.offset : 0),
          y: pts[n][1],
          z: pts[n][2] + (northSouth ? 0 : lane.offset),
          heading: Math.atan2((b[0] - a[0]) * ahead, (b[2] - a[2]) * ahead),
        });
      }
    }
  }
  const stands = (lane) => {
    const fx = Math.sin(lane.heading);
    const fz = Math.cos(lane.heading);
    return vehicle.CIRCLES.every(([d, side, r]) => ground.fits(lane.x + fx * d - fz * side, lane.z + fz * d + fx * side, r + 0.1, lane.y, CAR, 0.6));
  };
  const nearestLane = (x, y, z) => {
    let best = null;
    let bestD = Infinity;
    for (const lane of lanes) {
      const dy = (lane.y - y) * 4;
      const d = (lane.x - x) * (lane.x - x) + (lane.z - z) * (lane.z - z) + dy * dy;
      if (d < bestD && stands(lane)) {
        bestD = d;
        best = lane;
      }
    }
    return best;
  };
  // The glitch a jump lands with (a reset), for the engine's frame.
  let jolt = 0;
  // F at speed: the car is braking itself to a stand to let the player out.
  let stopping = false;
  const drive = () => {
    mode = "drive";
    stopping = false;
    chase.reset();
    if (document.pointerLockElement) document.exitPointerLock?.();
    set({ roam: "drive", locked: false });
  };
  // R: the car on the nearest lane to wherever the player is, and the
  // player in it.
  const reset = () => {
    const from = mode === "walk" ? walker : car;
    const lane = nearestLane(from.x, from.y, from.z);
    if (!lane) return;
    vehicle.place(lane.x, lane.z, lane.heading, lane.y);
    drive();
    jolt = reduced ? 0 : 0.7;
  };
  // F. Out: beside the driver's door (the left), else the other side, the
  // tail, the nose, else the nearest clear ground. In: from within reach.
  const REACH = 3.6;
  const nearCar = () => Math.hypot(walker.x - car.x, walker.z - car.z) < REACH && Math.abs(walker.y - car.y) < 1.5;
  const toggleCar = () => {
    if (mode === "drive") {
      if (Math.abs(car.v) > 0.6) {
        stopping = !stopping;
        return;
      }
      stopping = false;
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      const spots = [[fz * 1.75, -fx * 1.75], [-fz * 1.75, fx * 1.75], [-fx * 3.2, -fz * 3.2], [fx * 3.2, fz * 3.2]].map(([dx, dz]) => ({ x: car.x + dx, z: car.z + dz }));
      let spot = spots.find((s) => {
        const h = nav.floor(s.x, s.z, car.y, WALK, 0.6);
        return h === h && ground.fits(s.x, s.z, BODY + 0.05, h, WALK, 0.42);
      });
      spot ??= nav.nearest(car.x, car.z, car.y, WALK, BODY + 0.05, 8, 0.6);
      if (!spot || !feet.place(spot.x, spot.z, car.heading, car.y)) return;
      mode = "walk";
      jolt = reduced ? 0 : 0.5;
      set({ roam: "walk" });
    } else if (nearCar()) {
      drive();
      jolt = reduced ? 0 : 0.5;
    }
  };

  // ---- the city, with no recording to time it ---------------------------------
  // The plaza's board flips through its entries on roam's own clock, corpo
  // row stands lit, and the garage's door goes up for whoever comes to it
  // and its tubes strike once they are inside.
  let clock = 0;
  const bay = bayAt ?? new THREE.Vector3(462, 0, -215);
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
    walker,
    player,
    yielding,
    nav,
    graph,
    vehicle,
    feet,
    get on() {
      return on;
    },
    /** Into the S4 at the foot of the avenue. */
    enter() {
      on = true;
      keys.clear();
      vehicle.place(spawn.at[0], spawn.at[2], spawn.yaw ?? Math.PI, spawn.at[1]);
      mode = "drive";
      chase.reset();
      set({ roam: "drive", district: districtAt(car.x, car.z), prompt: "" });
    },
    /** The car goes back to the recording. */
    leave() {
      on = false;
      keys.clear();
      if (document.pointerLockElement) document.exitPointerLock?.();
      parts.car?.endFree();
      yielding?.reset();
      parts.crowd?.avoid?.();
      set({ roam: "off", district: "", prompt: "", locked: false });
    },
    /**
     * One frame: step the player, put the S4 there, and write what the
     * engine draws with: the camera's `pose`, and into `spec` the car's
     * place, heading and speed (the scanner, the sound and the HUD read
     * them), how much of the wet road's mirror the camera sees, the roll
     * of a knock and the glitch of a reset.
     */
    frame(dt, spec, pose) {
      // Photo mode holds the moment.
      const still = bd.mode === "photo";
      const step = still ? 0 : dt;
      const afoot = mode === "walk";
      const ahead = (held("KeyW", "ArrowUp") ? 1 : 0) - (held("KeyS", "ArrowDown") ? 1 : 0);
      const left = (held("KeyA", "ArrowLeft") ? 1 : 0) - (held("KeyD", "ArrowRight") ? 1 : 0);
      // The cars, for where the player was a frame ago: who brakes, and who
      // is near enough to be run into.
      yielding?.frame(step, player);
      const fromX = walker.x;
      const fromZ = walker.z;
      if (afoot) {
        // The car waits where it was left, brake on.
        vehicle.step(step, parked);
        stride.ahead = ahead;
        stride.side = -left;
        stride.run = held("ShiftLeft", "ShiftRight");
        feet.step(step, stride);
        feet.pose(pose);
      } else {
        // Stopping to let the player out, unless he drives on.
        if (stopping && ahead) stopping = false;
        input.throttle = ahead > 0 ? 1 : 0;
        input.brake = ahead < 0 ? 1 : 0;
        input.steer = left;
        input.hand = stopping || keys.has("Space");
        vehicle.step(step, input);
        if (stopping && Math.abs(car.v) <= 0.6) toggleCar();
        if (car.knock > 2.5) chase.knock(car.knock);
        spec.roll = chase.frame(dt, car, pose, still);
      }
      parts.car?.free(step, car);
      car.cut = false;
      player.afoot = afoot;
      if (afoot) {
        player.x = walker.x;
        player.y = walker.y;
        player.z = walker.z;
        player.vx = step > 0 ? (walker.x - fromX) / step : 0;
        player.vz = step > 0 ? (walker.z - fromZ) / step : 0;
      } else {
        vehicle.velocity(velocity);
        player.x = car.x;
        player.y = car.y;
        player.z = car.z;
        player.vx = velocity.x;
        player.vz = velocity.z;
      }
      // People step clear of the S4: of its flanks, from further off the
      // faster it comes, and a little ahead of where it is.
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      const lead = clamp(car.v * 0.25, -2, 4);
      parts.crowd?.avoid?.(car.x + fx * lead, car.z + fz * lead, 1.9, 2.6 + Math.abs(car.v) * 0.3);
      spec.afoot = afoot;
      spec.carPosition.set(car.x, car.y, car.z);
      spec.carHeading = car.heading;
      spec.car.v = car.v;
      const who = afoot ? walker : car;
      spec.mirror = 1 - clamp((pose.position.y - who.y - 6) / 22, 0, 1);
      spec.glitch = jolt > 0.02 ? jolt : 0;
      jolt *= Math.exp(-dt * 7);
      cityFrame(step, spec, who.x, who.z);
      const label = districtAt(who.x, who.z);
      if (label !== bd.district) set({ district: label });
      // What F does here, for the HUD: never a key that does nothing unsaid.
      const prompt = afoot ? (nearCar() ? "in" : "far") : stopping ? "stop" : "out";
      if (prompt !== bd.prompt) set({ prompt });
    },
    /**
     * A key down or up, by its code. True if it was one of roam's: the
     * keys it holds (see HELD), R (the car back on the nearest road) and F
     * (out of the car, or into it).
     */
    key(code, down, repeat = false) {
      if (code === "KeyR" || code === "KeyF") {
        if (down && !repeat) (code === "KeyR" ? reset : toggleCar)();
        return true;
      }
      if (!HELD.has(code)) return false;
      if (down) keys.add(code);
      else keys.delete(code);
      return true;
    },
    reset,
    toggleCar,
    /** The car put down at (x, z) facing `heading` (the playtest's routes
     *  begin where it sets it). False, and nothing done, if it would not
     *  stand clear there. */
    setDown(x, z, heading, y = 0) {
      if (!stands({ x, y, z, heading })) return false;
      vehicle.place(x, z, heading, y);
      drive();
      return true;
    },
    /** The same on foot. False if there is no ground there. */
    standAt(x, z, yaw, y = 0) {
      if (!feet.place(x, z, yaw, y)) return false;
      mode = "walk";
      set({ roam: "walk" });
      return true;
    },
    /** Every key let go (the window lost the keyboard). */
    release() {
      keys.clear();
    },
    /** A drag on the city: swing the camera round the car, or on foot
     *  turn the head (the way the mouse goes). */
    drag(dx, dy) {
      if (mode === "walk") feet.look(dx * 1.6, dy * 1.6);
      else chase.drag(dx, dy);
    },
    /** The held mouse (pointer lock): the head, on foot. */
    look(dx, dy) {
      if (mode === "walk") feet.look(dx, dy);
    },
    hold(isHeld) {
      chase.hold(isHeld);
    },
    zoom(delta) {
      chase.zoom(delta);
    },
    dispose() {
      if (on) {
        parts.car?.endFree();
        yielding?.reset();
        parts.crowd?.avoid?.();
      }
      on = false;
    },
  };
}
