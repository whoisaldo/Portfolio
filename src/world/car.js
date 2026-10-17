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
// In the braindance's free roam (src/braindance/roam) the car belongs to
// the player: `free` puts it wherever the simulation has it, off the road's
// line and up the ramp, with the same wheels, lamps, shadow and light.
//
// The car is the only thing in the city lit by three.js lights: the lights
// the drift used and a night street to reflect (nightEnvironment), with the
// sky light tinted by the city's own light where the car is (the same spill
// map every surface reads), so it goes pink under the pink signs and cyan in
// the bay. The drift's two coloured rims are a stage light for one camera;
// on the road they come down to a glint, or a car parked with its back to
// the hero shot flares at the lens.
//
// Inside the garage the room lights it instead (src/world/garage-lighting.js:
// a fixed rig over the two bays and the workshop's own reflections). Its
// road light and night street fade out as it comes through the door, by
// where it actually is, so the page, the braindance's recording and its free
// roam hand over alike. Parked in its bay, the car the garage inspects
// (src/world/garage-cars.js: the same model, hood and engine bay kept)
// takes the road's car's place: one car, one transform, its lamps and
// shadow, drawn as one or the other.
import * as THREE from "three";
import { createObject } from "../three/car/object.js";
import { createContactShadow } from "../three/car/street-contact.js";
import { PARK_FROM, clamp, poseAt, parkingCurve, coastToStop } from "../three/drift/path.js";
import { createLamps, createGroundLight } from "../three/drift/lamps.js";
import { createRig, createDrift } from "../three/drift/rig.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SHOTS } from "../data/world.js";
import { createGarageLighting, fixturesFrom, GARAGE_LIGHT_LOOK, scopeCarLighting } from "./garage-lighting.js";
import { slim } from "../three/car/slim.js";
import { toFloat } from "./merge.js";

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
/**
 * The S4's pictured parts that are the same physical program but for what
 * one of them has and another lacks (a clearcoat, an emissive map) given
 * it, so that they are one program: ANGLE's Metal backend keeps 96 render
 * pipelines a frame and makes every one again past that (see Baked in
 * props.js), and the car was seven of the city's. What each is given draws
 * nothing it did not: a clearcoat of 1e-10 takes out of the light under it
 * and adds of its own a ten-billionth, under float32's rounding of either;
 * an emissive map under a black emissive is multiplied by that black (its
 * own map stands in for one). And as one vertex layout, plain floats, as
 * the merged parts are: a quantized part's numbers made what the GPU makes
 * of them (merge.js toFloat), the same vertices. A normal map or
 * transparency is a program of its own still.
 */
export function oneProgram(car) {
  const parts = new Set();
  const meshes = [];
  car.traverse((o) => {
    const m = o.material;
    if (o.isMesh && m?.isMeshPhysicalMaterial && m.map && !m.normalMap && !m.transparent && !m.onBeforeCompile.toString().includes("shader")) {
      parts.add(m);
      meshes.push(o);
    }
  });
  if (parts.size < 2) return [];
  const generated = [];
  const coated = [...parts].some((m) => m.clearcoat > 0);
  const lit = [...parts].some((m) => m.emissiveMap);
  for (const m of parts) {
    if (coated && !(m.clearcoat > 0)) m.clearcoat = 1e-10;
    if (lit && !m.emissiveMap && m.emissive.getHex() === 0) m.emissiveMap = m.map;
  }
  for (const o of meshes) {
    const plain = Object.values(o.geometry.attributes).every((a) => !a.isInterleavedBufferAttribute && a.array instanceof Float32Array);
    if (!plain) { o.geometry = toFloat(o.geometry); generated.push(o.geometry); }
  }
  return generated;
}

/**
 * The lamps' clear lenses, transparent and seen from both sides, are drawn
 * by three in two passes, the far side's faces and then the near side's,
 * each its own program (the far pass's normals turned round by a define):
 * two of ANGLE Metal's 96 render pipelines a frame (see Baked in props.js).
 * One draw of the near side's program instead, of the lens's faces turned
 * round (each triangle's corners in the other order, its normals negated)
 * and then the lens as it is. A draw's triangles go down in their order,
 * so the far side's are drawn before the near side's as the two passes
 * drew them, with the same normals (negated before the view's matrix and
 * not after it: the same numbers), as plain floats (merge.js toFloat).
 */
export function lensesOneDraw(car) {
  const generated = [];
  const meshes = [];
  car.traverse((o) => {
    const m = o.material;
    if (o.isMesh && m?.transparent && m.side === THREE.DoubleSide && !m.forceSinglePass) meshes.push(o);
  });
  for (const o of meshes) {
    const g = toFloat(o.geometry);
    const n = g.attributes.position.count;
    const both = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(g.attributes)) {
      const arr = new Float32Array(a.array.length * 2);
      arr.set(a.array, 0);
      arr.set(a.array, a.array.length);
      if (name === "normal") for (let i = 0; i < a.array.length; i++) arr[i] = -arr[i];
      both.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
    }
    const idx = g.index.array;
    const tris = new Uint32Array(idx.length * 2);
    for (let i = 0; i < idx.length; i += 3) {
      tris[i] = idx[i];
      tris[i + 1] = idx[i + 2];
      tris[i + 2] = idx[i + 1];
    }
    for (let i = 0; i < idx.length; i++) tris[idx.length + i] = idx[i] + n;
    both.setIndex(new THREE.BufferAttribute(tris, 1));
    if (g !== o.geometry) g.dispose();
    o.geometry = both;
    generated.push(both);
  }
  for (const o of meshes) o.material.side = THREE.FrontSide;
  return generated;
}

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

export function createCar(scene, renderer, { road, anchors, light, layer, mirrorLayer, tier = "high", reduced = false }) {
  const car = createObject();
  car.name = "ali_s4_world";
  const rig = createRig(car);
  // The mirror gets a one-draw stand-in, made from the parts as they come
  // and added once they are merged; the real car is drawn once.
  const standIn = mirrorStandIn(car, rig);
  const slimmed = slim(car);
  const preparedGeometries = [...oneProgram(car), ...lensesOneDraw(car)];
  // What is drawn as the road's car, hidden while the garage's stands in.
  const roadMeshes = [];
  car.traverse((o) => o.isMesh && roadMeshes.push(o));
  const ready = tier === "phone"
    ? lighten(car).catch((err) => {
        if (import.meta.env.DEV) console.warn("[world] the phone's car keeps every triangle", err);
      })
    : Promise.resolve();
  standIn.layers.set(mirrorLayer);
  car.add(standIn);
  const lightInside = { value: 0 };
  scopeCarLighting(car, lightInside);
  car.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  scene.add(car);
  const shadow = createContactShadow(scene, car);
  // The shadow's own group, the last thing it added: free roam (`free`)
  // carries it up the ramp with the car.
  const contact = scene.children[scene.children.length - 1];
  // The city is darker than the plate the drift was tuned over, and it has
  // real bloom: the beams, the pools and the smoke come down to match.
  const lamps = createLamps(car, { depthTest: true, lift: 0.5, layer, reverse: true, directional: true, glow: 0.55, near: [6, 16], beam: 0.028 });
  const pool = 0.6;
  const ground = createGroundLight(scene, { size: 70, fade: [14, 34], y: 0.03, follow: true, lamps: pool });
  const drift = createDrift(scene, car, rig, { smokeRgb: [0.3, 0.29, 0.33] });

  // ---- light -------------------------------------------------------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const night = nightEnvironment();
  const roadEnvironment = pmrem.fromScene(night.scene, 0.04);
  const envMap = roadEnvironment.texture;
  night.dispose();
  pmrem.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.32;
  // The road's car carries the night street itself, as the scene's
  // environment gave it, so that inside the garage it can trade it for the
  // workshop's (setProbe).
  const reflecting = [...new Set(roadMeshes.flatMap((o) => [].concat(o.material)))].filter((m) => m.isMeshStandardMaterial);
  for (const m of reflecting) {
    m.envMap = envMap;
    m.envMapIntensity = scene.environmentIntensity;
  }
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

  // In the garage the room's rig lights it, made with the car and never
  // added or taken away, so the paint's program never changes on the way
  // in. How far inside it is: 0 out on the street, 1 a few metres in from
  // the door, by where it is (or what setInside says).
  const lighting = createGarageLighting({ scene, renderer, layer, fixtures: fixturesFrom(anchors), tier });
  const bayAt = at("anchor_garage_bay") ?? road.pointAt(road.length, new THREE.Vector3());
  const doorX = at("anchor_garage_portal_door")?.x ?? bayAt.x - 10;
  let insideOverride = null;
  let inside = 0;
  const insideAt = (x, z) => insideOverride ?? smoothstep(doorX - 1, doorX + 3, x) * (1 - smoothstep(14, 16, Math.abs(z - bayAt.z)));
  // The workshop's environment, once the garage has filtered it (setProbe).
  let probe = null;
  let probeGain = 0;
  // The garage's car while it stands in for this one (setInspection), and
  // what keeps this one in its bay (setHold).
  let inspection = null;
  let hold = null;
  let held = false;
  let departing = false;
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
  // "free": the braindance's free roam has it (see `free`).
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
  // The lamps answering a key fob (`flash`, Look's click on the car): two
  // blinks in half a second, or one steady glow with reduced motion, which
  // never flashes. Seconds since it began, or -1.
  let fob = -1;
  const answer = (dt) => {
    if (fob < 0) return;
    fob += dt;
    const on = reduced ? (fob < 0.6 ? 0.6 : 0) : fob < 0.16 || (fob > 0.32 && fob < 0.48) ? 1 : 0;
    for (const m of lamps.heads) m.uniforms.uGain.value = 1.5 + 2.6 * on;
    for (const m of lamps.tails) m.uniforms.uGain.value = 0.5 + 0.9 * brake + 1.8 * on;
    if (fob > 0.7) {
      fob = -1;
      for (const m of lamps.heads) m.uniforms.uGain.value = 1.5;
      setLamps();
    }
  };
  const finish = (now, dt) => {
    answer(dt);
    const k0 = 1 - Math.exp(-dt * 2);
    stageLight += ((mode === "road" || mode === "free" ? 0 : 1) - stageLight) * (dt > 0 ? k0 : 1);
    key.intensity = 0.55 + 0.15 * stageLight;
    rimM.intensity = (0.55 + 0.95 * stageLight) * rims;
    rimC.intensity = (0.35 + 0.65 * stageLight) * rims;
    // Inside, the road's light goes and the room's takes over; the night
    // street fades to nothing at the door and the workshop's comes up from
    // there, so their reflections never show at once.
    inside = insideAt(car.position.x, car.position.z);
    lightInside.value = inside;
    // The headlamps stay lit; their pool on the floor is the road's, and in
    // the lit workshop it would lie on the concrete like fog.
    ground.material.uniforms.uLamps.value = pool * (1 - inside * (1 - GARAGE_LIGHT_LOOK.lampPool));
    hemi.intensity = 0.5;
    const want = probe && inside > 0.5 ? probe : envMap;
    const gain = probe && want === probe ? probeGain * (2 * inside - 1) : scene.environmentIntensity * (probe ? Math.max(0, 1 - 2 * inside) : 1);
    for (const m of reflecting) {
      m.envMap = want;
      m.envMapIntensity = gain;
    }
    if (inspection?.root.visible) {
      for (let i = 0; i < inspection.wheels.length; i++) inspection.wheels[i].rotation.x = rig.wheels[i].rotation.x;
      for (let i = 0; i < inspection.steers.length; i++) inspection.steers[i].rotation.y = rig.steers[i].rotation.y;
    }
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
    /** The garage's rig (src/world/garage-lighting.js). */
    lighting,
    /** How far inside the garage the car is, 0..1, as of the last frame. */
    get inside() {
      return inside;
    },
    /** Whether it stands still in its bay. */
    get atBay() {
      return Math.abs(v) < 0.05 && Math.hypot(car.position.x - bayAt.x, car.position.z - bayAt.z) < 0.1;
    },
    /** How far inside it is, 0..1, whatever its position says; null goes
     *  back to its position. */
    setInside(k) {
      insideOverride = k == null ? null : clamp(k, 0, 1);
    },
    /** The workshop's environment and how strongly the paint reflects it. */
    setProbe(texture, gain = 0.5) {
      probe = texture;
      probeGain = gain;
    },
    /**
     * Hang `root` (a rigged S4 from object.js, the garage's) from this car,
     * so it goes where this one goes, and draw it in this one's place while
     * `on`; null takes it away. Its wheels turn and steer as these do.
     */
    setInspection(root, on = true) {
      if ((inspection?.root ?? null) !== root) {
        if (inspection) car.remove(inspection.root);
        inspection = null;
        if (root) {
          scopeCarLighting(root, lightInside);
          const parts = root.userData.parts ?? {};
          inspection = { root, wheels: rig.wheels.map((w) => parts[w.name]), steers: rig.steers.map((st) => parts[st.name]) };
          root.position.set(0, 0, 0);
          root.quaternion.identity();
          car.add(root);
        }
      }
      const shown = Boolean(root) && on;
      if (inspection) inspection.root.visible = shown;
      for (const o of roadMeshes) o.visible = !shown;
    },
    /**
     * While `fn()` is true the page cannot drive the car out of its bay
     * (the garage holds it until its hood is shut); null lets it go.
     * `held` says whether it held the car back on the last frame.
     */
    setHold(fn) {
      hold = fn;
    },
    get held() {
      return held;
    },
    get departing() { return departing; },
    /** Blink the lamps, as a key fob does. */
    flash() {
      fob = 0;
    },
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
      let want = goal ?? goalFor(ids, position, locals, aspect);
      departing = mode === "road" && u >= stops.bay - 0.1 && want < u;
      held = departing && Boolean(hold?.({ mode: "road", cut: jump }));
      if (held) want = u;
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
      held = false;
      mode = "road";
      car.visible = true;
      let next = clamp(at, 0, road.length);
      departing = u >= stops.bay - 0.1 && next < u;
      held = departing && Boolean(hold?.({ mode: "directed", cut: Math.abs(next - u) > 6 }));
      if (held) { next = u; speed = 0; }
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

    /**
     * One frame of the braindance's free roam (src/braindance/roam): the
     * car where the player's simulation has it, at `x, y, z` (its wheels'
     * contact height), turned to `heading` (0 faces +z), tipped by `pitch`
     * and `roll` on a slope, moving at `speed` metres a second along its
     * nose (negative backs up), its front wheels at `steer` radians, having
     * rolled `ds` metres since the last frame. `brake` and `reverse` are the
     * lamps, 0..1. `cut` is a jump (a spawn, a reset): no wheel spin across
     * it and the light trails start again. Call `endFree` on the way out.
     */
    free(dt, { x, y = 0, z, heading, pitch = 0, roll = 0, speed = 0, steer: toSteer = 0, ds = 0, brake: toBrake = 0, reverse: toReverse = 0, cut = false }) {
      clock += dt;
      held = false;
      if (mode !== "free" || cut || !placed) drift.reset();
      mode = "free";
      placed = true;
      car.visible = true;
      const before = v;
      v = speed;
      accel = cut || dt <= 0 ? 0 : (v - before) / dt;
      departing = Math.hypot(car.position.x - bayAt.x, car.position.z - bayAt.z) < 0.15 && Math.hypot(x - car.position.x, z - car.position.z) > 0.0001;
      if (departing) {
        held = Boolean(hold?.({ mode: "free", cut }));
        if (held) { x = car.position.x; y = car.position.y; z = car.position.z; heading = car.rotation.y; pitch = car.rotation.x; roll = car.rotation.z; speed = 0; ds = 0; v = 0; }
      }
      car.position.set(x, y, z);
      // Heading first, then the slope in the car's own frame.
      car.rotation.set(pitch, heading, roll, "YXZ");
      steer = cut ? toSteer : steer + (toSteer - steer) * (1 - Math.exp(-dt * 14));
      for (const st of rig.steers) st.rotation.y = steer;
      if (!cut) for (const w of rig.wheels) w.rotation.x += ds / rig.radius;
      brake += (toBrake - brake) * (1 - Math.exp(-dt * 12));
      reverse += (toReverse - reverse) * (1 - Math.exp(-dt * 8));
      setLamps();
      if (!cut && Math.abs(v) > 0.5) drift.pushTrails(lamps.tailL, lamps.tailR, Math.abs(v), clock);
      finish(clock, dt);
      // The shadow and the headlamps' pool lie on the ground the car is on.
      contact.position.y = y;
      contact.rotation.set(pitch, heading, roll, "YXZ");
      ground.mesh.position.y = y + 0.03;
    },

    /** Free roam is over: the car is the road's again (`directed`, `drive`). */
    endFree() {
      if (mode !== "free") return;
      mode = "road";
      placed = false;
      v = 0;
      accel = 0;
      car.rotation.set(0, car.rotation.y, 0, "XYZ");
      contact.rotation.set(0, car.rotation.y, 0, "XYZ");
      contact.position.y = 0;
      ground.mesh.position.y = 0.03;
      drift.reset();
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
      if (inspection) car.remove(inspection.root);
      inspection = null;
      scene.remove(car, lights);
      lighting.dispose();
      preparedGeometries.forEach((g) => g.dispose());
      slimmed.geometries.forEach((g) => g.dispose());
      slimmed.material?.dispose();
      standIn.geometry.dispose();
      standIn.material.dispose();
      shadow.dispose();
      lamps.dispose();
      ground.dispose();
      drift.dispose();
      if (scene.environment === envMap) scene.environment = null;
      roadEnvironment.dispose();
      car.userData.dispose();
    },
  };
}
