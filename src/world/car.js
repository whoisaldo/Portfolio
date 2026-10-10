// src/world/car.js: Ali's S4, driving the city.
//
// The same GLB and the same rig as the garage and the intro
// (src/three/car, src/three/drift): wheels that spin about X, knuckles that
// steer about Y, the drift's glows, beams and headlight pools. What is new
// here is where it goes.
//
// For most of the page the car lives on one road through the districts,
// from the hero's curb to the garage bay (road_spline in the kit, sampled
// every metre). Its distance along that road is a damped function of the
// stage position: each shot names where the car waits (src/data/world.js),
// a flight between two shots eases the goal from one stop to the next, a
// little ahead of the camera so the car leads, and the car follows the goal
// with the same exponential smoothing as the camera. So scroll is the
// throttle, literally: read slowly and the car creeps up the road, flick
// through a section and it covers the distance the camera does, and it
// eases into every stop because the goal does. Scrolling back up puts it in
// reverse. The front wheels steer by the road's curvature (the bicycle
// model: atan(wheelbase * k)), the tail lights brighten while it slows, and
// two white lamps come on while it backs up. It never drifts: the drift is
// the intro's.
//
// During the intro the car belongs to the song clock instead: the drift's
// own path for the first 3.8 seconds after the drop, then the parking curve
// (src/three/drift/path.js) from where the drift ends onto the road, braking
// to rest at the curb mark the hero shot wants. If the reader is quick and
// the intro hands over while the car is still rolling, it finishes parking
// on the page's clock, then takes the road.
//
// The car is the only thing in the city lit by three.js lights: the lights
// the drift used and a night street to reflect (nightEnvironment), with the
// sky light tinted by the city's own light where the car is (the same spill
// map every surface reads), so it goes pink under the pink signs and cyan in
// the bay. The drift's two coloured rims are a stage light for one camera;
// on the road they come down to a glint, or a car parked with its back to
// the hero shot flares at the lens.
import * as THREE from "three";
import { createObject } from "../three/car/object.js";
import { createContactShadow } from "../three/car/street-contact.js";
import { PARK_FROM, clamp, poseAt, parkingCurve, coastToStop } from "../three/drift/path.js";
import { createLamps, createGroundLight } from "../three/drift/lamps.js";
import { createRig, createDrift } from "../three/drift/rig.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { SHOTS } from "../data/world.js";
import { slim } from "../three/car/slim.js";

const FOLLOW = 4; // 1/s: how closely the car follows its goal
const VMAX = 160; // m/s: the most a single frame may ask of it
const LEAD = 0.72; // the car reaches the next stop by this much of a flight

const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The car as the wet road's mirror needs it: its body, its glasshouse and
 * its four wheels as boxes in the car's own space, in its own paint, glass
 * and rubber, lit by its lights, one draw. The mirror smears everything
 * long down the road and nothing finer than the car's outline survives it;
 * the whole car was eighty thousand triangles drawn to be blurred.
 */
function mirrorStandIn(car, rig) {
  car.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(car);
  const size = bounds.getSize(new THREE.Vector3());
  const mid = bounds.getCenter(new THREE.Vector3());
  const tone = (pattern, fallback) => {
    let found = null;
    car.traverse((o) => {
      if (!found && o.isMesh && !Array.isArray(o.material) && pattern.test(o.material.name)) found = o.material;
    });
    const c = new THREE.Color(fallback);
    if (found?.color) c.copy(found.color).multiplyScalar(1 - 0.55 * (found.metalness ?? 0));
    return c;
  };
  const paint = tone(/^S4_metallic_grey/, 0x2a2d31);
  const glass = tone(/^S4_tinted_glass/, 0x0a0d10);
  const rubber = tone(/^S4_tyre_rubber/, 0x141518);
  const parts = [];
  const add = (w, h, d, x, y, z, color) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.deleteAttribute("uv");
    g.translate(x, y, z);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) color.toArray(c, i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    parts.push(g);
  };
  const y0 = bounds.min.y;
  add(size.x * 0.9, size.y * 0.52, size.z * 0.98, mid.x, y0 + size.y * 0.4, mid.z, paint);
  add(size.x * 0.72, size.y * 0.34, size.z * 0.5, mid.x, y0 + size.y * 0.83, mid.z - size.z * 0.04, glass);
  const at = new THREE.Vector3();
  for (const wheel of rig.wheels) {
    car.worldToLocal(wheel.getWorldPosition(at));
    add(0.26, rig.radius * 2, rig.radius * 2, at.x, at.y, at.z, rubber);
  }
  const geometry = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.name = "car_mirror";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "car_mirror";
  return mesh;
}

/**
 * What the car's paint and glass reflect: the street at night. A black room
 * with the city's neon in it as long thin strips, pink along one side and
 * cyan along the other at sign height, sodium amber low ahead and behind, a
 * cold tube far off, two thin tubes overhead to draw a line down the roof
 * and the hood, and above them the dim violet of the clouds the city lights.
 * A studio (three's RoomEnvironment) gave it grey walls and white softboxes
 * to reflect, which blew its roof and hood out to white.
 */
function nightEnvironment() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010102);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const materials = [];
  const strip = (hex, gain, [x, y, z], [sx, sy, sz]) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(gain) });
    materials.push(material);
    const mesh = new THREE.Mesh(box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    scene.add(mesh);
  };
  strip(0x3a1446, 2.2, [0, 14, 0], [40, 0.2, 40]);
  strip(0xe8ecff, 3, [-1.4, 9, 0], [0.16, 0.1, 18]);
  strip(0xe8ecff, 2.2, [1.6, 9.5, -2], [0.12, 0.1, 12]);
  strip(0xff2e88, 9, [-9, 3.5, 0], [0.2, 0.3, 16]);
  strip(0xff2e88, 5, [-9, 6.2, -5], [0.2, 0.2, 8]);
  strip(0x27dcf2, 9, [9, 3.2, 1], [0.2, 0.3, 16]);
  strip(0x27dcf2, 5, [9, 5.8, 6], [0.2, 0.2, 6]);
  strip(0xffb254, 5, [0, 5, -13], [5, 0.2, 0.2]);
  strip(0xffb254, 3, [3, 5, 13], [4, 0.2, 0.2]);
  strip(0xdde8ff, 4, [-4, 7.5, -11], [2.5, 0.12, 0.12]);
  return {
    scene,
    dispose() {
      box.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}

/**
 * A phone's car in fewer triangles: the merged paint meshes (the body and
 * each wheel) simplified in place with meshoptimizer, every part's outline
 * locked so no seam opens, to within 4 mm. The city's car is seen from five
 * metres to a hundred on a phone; the garage's viewer keeps the whole model.
 * The simplifier is its own chunk, fetched only on a phone.
 */
async function lighten(car) {
  const { MeshoptSimplifier } = await import("meshoptimizer/simplifier");
  await MeshoptSimplifier.ready;
  const meshes = [];
  car.traverse((o) => {
    if (o.isMesh && o.name === "s4_paint" && o.geometry.index) meshes.push(o);
  });
  for (const mesh of meshes) {
    const g = mesh.geometry;
    const index = g.index.array instanceof Uint32Array ? g.index.array : new Uint32Array(g.index.array);
    const pos = g.attributes.position.array;
    const scale = MeshoptSimplifier.getScale(pos, 3);
    const [out] = MeshoptSimplifier.simplify(index, pos, 3, Math.floor((index.length * 0.4) / 3) * 3, 0.004 / scale, ["LockBorder"]);
    g.setIndex(new THREE.BufferAttribute(out, 1));
  }
}

export function createCar(scene, renderer, { road, anchors, light, layer, mirrorLayer, tier = "high" }) {
  const car = createObject();
  car.name = "ali_s4_world";
  const rig = createRig(car);
  // The mirror gets a one-draw stand-in, made from the parts as they come
  // and added once they are merged; the real car is drawn once.
  const standIn = mirrorStandIn(car, rig);
  const slimmed = slim(car);
  const ready = tier === "phone"
    ? lighten(car).catch((err) => {
        if (import.meta.env.DEV) console.warn("[world] the phone's car keeps every triangle", err);
      })
    : Promise.resolve();
  standIn.layers.set(mirrorLayer);
  car.add(standIn);
  car.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  scene.add(car);
  const shadow = createContactShadow(scene, car);
  // The city is darker than the plate the drift was tuned over, and it has
  // real bloom: the beams, the pools and the smoke come down to match.
  const lamps = createLamps(car, { depthTest: true, lift: 0.5, layer, reverse: true, directional: true, glow: 0.55, near: [6, 16], beam: 0.028 });
  const ground = createGroundLight(scene, { size: 70, fade: [14, 34], y: 0.03, follow: true, lamps: 0.6 });
  const drift = createDrift(scene, car, rig, { smokeRgb: [0.3, 0.29, 0.33] });

  // ---- light -------------------------------------------------------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const night = nightEnvironment();
  const envMap = pmrem.fromScene(night.scene, 0.04).texture;
  night.dispose();
  pmrem.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.32;
  const lights = new THREE.Group();
  lights.name = "car_lights";
  const hemi = new THREE.HemisphereLight(0x8fb4ff, 0x1a0a14, 0.5);
  const directional = (color, intensity, x, y, z) => {
    const l = new THREE.DirectionalLight(color, intensity);
    l.position.set(x, y, z);
    lights.add(l.target);
    return l;
  };
  const key = directional(0xd0e4e7, 0.85, 6, 9, 9);
  const rimM = directional(0xff68ad, 1.8, 12, 6, -20);
  const rimC = directional(0x79ffd7, 1.4, -5, 5, -28);
  lights.add(hemi, key, rimM, rimC);
  lights.traverse((o) => o.layers.enable(layer));
  scene.add(lights);

  // The city's light at the car, read on the CPU from the baked spill map.
  const spill = light.spill.image;
  const b = light.bounds;
  const _spill = new THREE.Color();
  const _sky = new THREE.Color(0x8fb4ff);
  const spillAt = (x, z, out) => {
    const u = clamp((x - b.x) * b.z, 0, 1);
    const v = clamp((z - b.y) * b.w, 0, 1);
    const i = (Math.min(spill.height - 1, Math.floor(v * spill.height)) * spill.width
      + Math.min(spill.width - 1, Math.floor(u * spill.width))) * 4;
    const d = spill.data;
    return out.setRGB((d[i] / 255) ** 2, (d[i + 1] / 255) ** 2, (d[i + 2] / 255) ** 2);
  };

  // ---- the road and its stops ------------------------------------------------
  const at = (name) => anchors.get(name)?.position;
  const onRoad = (name, fallback) => (at(name) ? road.nearest(at(name)) : fallback);
  const stops = {
    curb: onRoad("anchor_curb_hero", 0),
    curbPortrait: onRoad("anchor_curb_hero_portrait", onRoad("anchor_curb_hero", 0)),
    plaza: onRoad("car_plaza", road.length * 0.2),
    corpoA: onRoad("car_corpo_a", road.length * 0.4),
    corpoB: onRoad("car_corpo_b", road.length * 0.6),
    rooftop: onRoad("car_rooftop", road.length * 0.85),
    bay: road.length,
  };
  const curbFor = (aspect) => (aspect < 1 ? stops.curbPortrait : stops.curb);

  // In the bay the room lights it as the garage's viewer lights its own
  // (src/three/garage-room.js): area lights for the kit's two white tubes
  // overhead and for the magenta and cyan tubes high on the walls either
  // side, faded in as it drives through the door. Always there, at nothing
  // outside the bay, so the paint's program never changes on the way in.
  // The area lights' lookup tables once a page: init() makes four new
  // textures every time, and every renderer that drew the old ones keeps
  // them.
  if (!THREE.UniformsLib.LTC_FLOAT_1) RectAreaLightUniformsLib.init();
  const bayAt = at("anchor_garage_bay") ?? road.pointAt(road.length, new THREE.Vector3());
  const bayLights = new THREE.Group();
  bayLights.name = "car_bay_lights";
  const area = (color, nits, width, height, [x, y, z], [tx, ty, tz]) => {
    const l = new THREE.RectAreaLight(color, 0, width, height);
    l.position.set(bayAt.x + x, y, bayAt.z + z);
    l.lookAt(bayAt.x + tx, ty, bayAt.z + tz);
    l.userData.nits = nits;
    l.layers.enable(layer);
    bayLights.add(l);
  };
  for (const z of [-4.5, 4.5]) area("#d5e5f6", 30, 18, 0.3, [2, 7.6, z], [2, 0, z]);
  area("#ff278d", 6, 12, 2.5, [2, 6.5, 14.4], [2, 1, 0]);
  area("#27dcf2", 6, 12, 2.5, [2, 6.5, -14.4], [2, 1, 0]);
  scene.add(bayLights);
  const stopFor = (id, local, aspect) => {
    switch (SHOTS[id]?.car) {
      case "curb": return curbFor(aspect);
      case "plaza": return stops.plaza;
      case "corpo": return stops.corpoA + (stops.corpoB - stops.corpoA) * smoothstep(0, 1, local);
      case "rooftop": return stops.rooftop;
      case "bay": return stops.bay;
      default: return null;
    }
  };

  /** The distance the stage wants the car at. */
  const goalFor = (ids, position, locals, aspect) => {
    const n = ids.length;
    if (!n) return curbFor(aspect);
    const i = clamp(Math.floor(position), 0, n - 1);
    const j = Math.min(i + 1, n - 1);
    const f = clamp(position - i, 0, 1);
    const a = stopFor(ids[i], locals[i] ?? 0, aspect) ?? curbFor(aspect);
    const c = stopFor(ids[j], locals[j] ?? 0, aspect) ?? a;
    return a + (c - a) * smoothstep(0, SHOTS[ids[j]]?.carLead ?? LEAD, f);
  };

  /** Where the car waits on a case study: the plaza for a project, the
   *  boulevard under the role's tower for a role. */
  const routeGoal = (route) => {
    if (route.kind === "project") return stops.plaza;
    const tower = route.kind === "role" ? at(`anchor_tower_${route.slug}`) : null;
    if (!tower) return stops.curb;
    return road.nearest({ x: tower.x, z: tower.z + 32 });
  };

  // ---- state -------------------------------------------------------------------
  // "road": on the road at u metres, v metres a second (negative backs up).
  // "drift": the intro has it, on the song clock.
  // "park": the intro let go while the car was still parking.
  let mode = "road";
  let u = stops.curb;
  let v = 0;
  let accel = 0;
  let steer = 0;
  let brake = 0;
  let reverse = 0;
  let placed = false;
  let clock = 0;
  let park = null;
  let parkT = 0;
  let lastD = -Infinity;

  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _q = { x: 0, z: 0, heading: 0 };
  const _h = { x: 0, z: 0, heading: 0 };
  const _s0 = { s: 0, v: 0 };
  const _s1 = { s: 0, v: 0 };

  // Where the parking path is s metres along: the curve onto the road, then
  // the road itself.
  const parkPose = (s, out) => {
    if (s < park.curve.length) return park.curve.at(s, out);
    road.pointAt(s - park.curve.length, _p);
    road.tangentAt(s - park.curve.length, _t);
    out.x = _p.x;
    out.z = _p.z;
    out.heading = Math.atan2(_t.x, _t.z);
    return out;
  };
  const planPark = (xScale, aspect) => {
    const p0 = road.pointAt(0, new THREE.Vector3());
    const t0 = road.tangentAt(0.5, new THREE.Vector3());
    const curve = parkingCurve(xScale, { x: p0.x, z: p0.z, tx: t0.x, tz: t0.z });
    const curb = curbFor(aspect);
    park = { curve, curb, stop: coastToStop(curve.speed, curve.length + curb), xScale, aspect };
  };

  // The parking curve at t seconds past the drift's end: the car on the
  // path, steering by the turn the path makes over the next metre and a
  // half, the wheels turning by the distance covered, the brake lights on
  // once it starts to slow.
  const parkFrame = (t, dt, now) => {
    const s0 = park.stop.at(Math.max(0, t - dt), _s0).s;
    const cur = park.stop.at(t, _s1);
    parkPose(cur.s, _q);
    car.position.set(_q.x, 0, _q.z);
    car.rotation.set(0, _q.heading, 0);
    const h0 = parkPose(Math.max(0, cur.s - 0.75), _h).heading;
    const h1 = parkPose(cur.s + 0.75, _h).heading;
    const wantSteer = clamp(Math.atan(rig.wheelbase * (wrap(h1 - h0) / 1.5)), -0.55, 0.55);
    steer += (wantSteer - steer) * (1 - Math.exp(-dt * 8));
    for (const st of rig.steers) st.rotation.y = steer;
    for (const w of rig.wheels) w.rotation.x += (cur.s - s0) / rig.radius;
    const braking = cur.v > 0 && cur.v < park.curve.speed - 0.01;
    brake += ((braking ? 1 : 0) - brake) * (1 - Math.exp(-dt * 10));
    reverse = 0;
    setLamps();
    if (cur.v > 0) drift.pushTrails(lamps.tailL, lamps.tailR, cur.v, now);
  };

  const setLamps = () => {
    for (const m of lamps.tails) m.uniforms.uGain.value = 0.5 + 0.9 * brake;
    for (const m of lamps.reversing) m.uniforms.uGain.value = 0.55 * reverse;
  };

  let stageLight = 0;
  // How much of the two coloured rims the car keeps (setRims): all of it on
  // the page; the braindance's cameras come close enough that they bloom.
  let rims = 1;
  const finish = (now, dt) => {
    const k0 = 1 - Math.exp(-dt * 2);
    stageLight += ((mode === "road" ? 0 : 1) - stageLight) * (dt > 0 ? k0 : 1);
    key.intensity = 0.55 + 0.15 * stageLight;
    rimM.intensity = (0.55 + 0.95 * stageLight) * rims;
    rimC.intensity = (0.35 + 0.65 * stageLight) * rims;
    const bay = mode === "road" ? smoothstep(stops.bay - 12, stops.bay - 4, u) : 0;
    for (const l of bayLights.children) l.intensity = l.userData.nits * bay;
    car.updateMatrixWorld(true);
    shadow.update();
    ground.update(car, lamps, car.position);
    lights.position.copy(car.position);
    spillAt(car.position.x, car.position.z, _spill);
    const k = 1 - Math.exp(-dt * 3);
    _sky.lerp(_spill.multiplyScalar(2.2).addScalar(0.04), k || 1);
    hemi.color.copy(_sky);
    drift.update(now);
  };

  /** Put the car on the road at u, heading along it (or backing up it). */
  const placeOnRoad = (dt, ds) => {
    road.pointAt(u, _p);
    road.tangentAt(u, _t);
    car.position.set(_p.x, 0, _p.z);
    car.rotation.y = Math.atan2(_t.x, _t.z);
    // A little dive under braking, a little squat under power, a little
    // roll away from the turn.
    const kappa = road.curvatureAt(u);
    const wantSteer = clamp(Math.atan(rig.wheelbase * kappa), -0.55, 0.55);
    steer += (wantSteer - steer) * (1 - Math.exp(-dt * 8));
    for (const st of rig.steers) st.rotation.y = steer;
    for (const w of rig.wheels) w.rotation.x += ds / rig.radius;
    car.rotation.x = clamp(-accel * 0.0022, -0.03, 0.03);
    car.rotation.z = clamp(-v * v * kappa * 0.0025, -0.04, 0.04);
  };

  return {
    car,
    /** Resolves once a phone's car is simplified (at once elsewhere). */
    ready,
    stops,
    routeGoal,
    get u() {
      return u;
    },
    get speed() {
      return v;
    },
    get mode() {
      return mode;
    },

    /**
     * One frame of the page (not the intro). `ids`, `position`, `locals`
     * are the stage's; `jump` lands the car on its goal instead of driving
     * there (a deep link, a long nav jump, the first frame).
     */
    drive(dt, { ids, position, locals, aspect, jump = false, goal = null }) {
      clock += dt;
      const want = goal ?? goalFor(ids, position, locals, aspect);
      if (mode === "drift") {
        // The intro let go. If the drift itself was cut short, there is no
        // parking to finish: the car is simply at the curb.
        if (lastD >= PARK_FROM && park) {
          mode = "park";
          parkT = lastD - PARK_FROM;
        } else {
          mode = "road";
          u = want;
          v = 0;
          placed = false;
        }
      }
      car.visible = true;
      if (mode === "park") {
        if (jump) {
          mode = "road";
          u = want;
          v = 0;
          placed = false;
        } else {
          parkT += dt;
          parkFrame(parkT, dt, clock);
          if (parkT >= park.stop.duration) {
            mode = "road";
            u = park.curb;
            v = 0;
            placed = true;
          }
          finish(clock, dt);
          return;
        }
      }

      // The road.
      if (!placed || jump) {
        u = want;
        v = 0;
        accel = 0;
        placed = true;
        drift.reset();
      }
      const before = v;
      let next = u + (want - u) * (1 - Math.exp(-dt * FOLLOW));
      v = dt > 0 ? (next - u) / dt : 0;
      if (Math.abs(v) > VMAX) {
        v = Math.sign(v) * VMAX;
        next = u + v * dt;
      }
      next = clamp(next, 0, road.length);
      const ds = next - u;
      u = next;
      accel = dt > 0 ? (v - before) / dt : 0;
      placeOnRoad(dt, ds);
      const braking = Math.abs(v) > 0.4 && Math.abs(v) < Math.abs(before) - 0.02;
      brake += ((braking ? 1 : 0) - brake) * (1 - Math.exp(-dt * 10));
      reverse += ((v < -0.3 ? 1 : 0) - reverse) * (1 - Math.exp(-dt * 8));
      setLamps();
      if (Math.abs(v) > 0.5) drift.pushTrails(lamps.tailL, lamps.tailR, Math.abs(v), clock);
      finish(clock, dt);
    },

    /**
     * One frame of the braindance (src/braindance): the car on the road at
     * `at` metres, moving at `speed` metres a second, exactly where the
     * recording has it, so a scrub or a rewind puts it back where it was.
     * A jump of more than a car's length is a cut: no wheel spin across it,
     * and the light trails start again.
     */
    directed(dt, { u: at, v: speed = 0 }) {
      clock += dt;
      mode = "road";
      car.visible = true;
      const next = clamp(at, 0, road.length);
      const ds = next - u;
      const cut = !placed || Math.abs(ds) > 6;
      const before = v;
      u = next;
      v = speed;
      accel = cut || dt <= 0 ? 0 : (v - before) / dt;
      placed = true;
      if (cut) {
        drift.reset();
        steer = clamp(Math.atan(rig.wheelbase * road.curvatureAt(u)), -0.55, 0.55);
      }
      placeOnRoad(dt, cut ? 0 : ds);
      const braking = Math.abs(v) > 0.4 && accel < -0.8;
      brake += ((braking ? 1 : 0) - brake) * (1 - Math.exp(-Math.abs(dt) * 10));
      reverse += ((v < -0.3 ? 1 : 0) - reverse) * (1 - Math.exp(-Math.abs(dt) * 8));
      setLamps();
      if (!cut && Math.abs(v) > 0.5) drift.pushTrails(lamps.tailL, lamps.tailR, Math.abs(v), clock);
      finish(clock, Math.abs(dt));
    },

    setRims(k) {
      rims = k;
    },

    /** The intro starts: the car belongs to the song clock until drive(). */
    beginDrift() {
      mode = "drift";
      lastD = -Infinity;
      park = null;
      drift.reset();
    },

    /**
     * One frame of the intro at song second `now`, `d` seconds after the
     * drop, for a viewport of `aspect` (xScale as the drift computes it).
     */
    cinematic(d, now, dt, aspect, xScale) {
      mode = "drift";
      lastD = d;
      if (!park || park.xScale !== xScale || park.aspect !== aspect) planPark(xScale, aspect);
      // On screen from where the drift has always started drawing it.
      car.visible = d > -0.4;
      if (d <= PARK_FROM) {
        const pose = poseAt(d, xScale);
        const { spin } = drift.place(pose, d, dt);
        car.updateMatrixWorld(true);
        if (d >= 0 && spin > 0.12 && dt > 0) drift.emitSmoke(pose, dt, now);
        if (d >= 0) drift.pushTrails(lamps.tailL, lamps.tailR, pose.speed, now);
        brake = 0;
      } else {
        parkFrame(d - PARK_FROM, dt, now);
      }
      if (d <= PARK_FROM) setLamps();
      clock = now;
      finish(now, dt);
    },

    dispose() {
      scene.remove(car, lights, bayLights);
      slimmed.geometries.forEach((g) => g.dispose());
      slimmed.material?.dispose();
      standIn.geometry.dispose();
      standIn.material.dispose();
      shadow.dispose();
      lamps.dispose();
      ground.dispose();
      drift.dispose();
      if (scene.environment === envMap) scene.environment = null;
      envMap.dispose();
      car.userData.dispose();
    },
  };
}
