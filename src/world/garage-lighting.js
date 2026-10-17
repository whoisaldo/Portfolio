// The workshop lights both cars from B2's exported luminous faces. One
// static PMREM belongs to this rig; car materials borrow it. The city keeps
// its own environment and exposure. Rebuild the probe only after room/map
// readiness or context restoration, never in the frame loop.
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

// The look: every artistic gain lives here. Fixture locations, dimensions,
// aim and colors belong to B2's published anchors, not this table. Set in
// the look pass on the actual site at every station, wide and phone, with
// A1's Quartz Gray values on a stand-in body in the S6 bay; recheck the
// S6 bay once A1's real model lands.
export const GARAGE_LIGHT_LOOK = Object.freeze({
  // The paint is metallic: its flanks read only through reflections, so
  // the probe carries the car and the strips draw its top lines.
  taskNits: 50,
  flankNits: 90,
  workCandela: 35,
  probeGain: 1.6,
  // Under-hood parts take this share of probeGain, so the engine stays dark
  // and separate from the paint above it.
  engineProbe: 0.5,
  // A parked car's headlamp pool keeps this share of its road strength
  // indoors, where the room lights the floor.
  lampPool: 0.1,
  // How bright each kind of practical is in the probe, against the room's
  // own lit surfaces: a lamp outshines a wall. Neutral faces dominate so
  // grey paint stays grey; pink, cyan and amber stay edge colour.
  practicals: Object.freeze({ task: 30, flank: 30, work: 8, tube: 25, neon: 12, amber: 15, screen: 3 }),
  wallGain: 1,
  streetGain: 1.4,
  background: 0x020203,
  floor: 0x2a2c2f,
  wall: 0x34373c,
  roof: 0x15161a,
  street: 0x0b1626,
  fallbackKelvin: 4300,
  probeSize: { high: 256, phone: 128 },
});

const DEFAULT_FACES = ["s4", "s6"].flatMap((bay) => {
  const z = bay === "s4" ? -215 : -222;
  return [
    { id: `${bay}_task`, position: [463, 5.45, z], extras: { kind: "strip", bay, length: 4.5, width: 0.35, aim: [462.8, 0.9, z], kelvin: 4400 } },
    ...[461.2, 463.6].map((x, i) => ({ id: `${bay}_flank_${i}`, position: [x, 5.55, z + (bay === "s4" ? 3 : -3)], extras: { kind: "strip", bay, length: 2.36, width: 0.08, aim: [462.6, 0.45, z + (bay === "s4" ? 1 : -1)], kelvin: 4300 } })),
    // B2's work-light faces as exported (e4e998d), each aimed at its own bay.
    { id: `${bay}_work`, position: [465.225, 2.1, bay === "s4" ? -217.069 : -219.931], extras: { kind: "work", bay, length: 0.32, width: 0.2, aim: [463.3, 0.95, z], kelvin: 4400 } },
  ];
});

export function kelvinColor(k, out = new THREE.Color()) {
  const t = THREE.MathUtils.clamp(k, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332;
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * (t - 60) ** -0.0755;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  return out.setRGB(...[r, g, b].map((v) => THREE.MathUtils.clamp(v, 0, 255) / 255), THREE.SRGBColorSpace);
}

const vector = (v, fallback = [0, 0, 0]) => v?.isVector3 ? v.clone() : new THREE.Vector3(...(typeof v === "string" ? JSON.parse(v) : v ?? fallback));
const quaternion = (q) => q?.isQuaternion ? q.clone() : new THREE.Quaternion(...(q ?? [0, 0, 0, 1]));
const colorOf = (e) => e.color ? new THREE.Color(typeof e.color === "string" && /^[0-9a-f]{6}$/i.test(e.color) ? `#${e.color}` : e.color) : kelvinColor(e.kelvin ?? GARAGE_LIGHT_LOOK.fallbackKelvin);

// Accept the city's Map of parsed anchors, the adapter's face list, or B2's
// garage-layout lights with their faces expanded. Both light consumers can
// use this export so floor traces and physical materials share positions.
export function fixturesFrom(source) {
  if (!source) return [];
  const rows = source instanceof Map ? [...source].filter(([n]) => n.startsWith("anchor_garage_light_")).map(([name, a]) => ({ ...a, name })) : source;
  const seen = new Set();
  return rows.flatMap((f) => f.faces ? f.faces.map((face) => {
    const normal = vector(face.normal, [0, -1, 0]);
    const x = vector(face.axis, [1, 0, 0]).normalize();
    const y = normal.negate().normalize();
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    return { id: face.anchor?.replace("anchor_garage_light_", "") ?? f.id, position: vector(face.at), quaternion: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)), extras: { ...f, ...face } };
  }) : [{ ...f, extras: f.extras ?? f }]).map((f) => {
    const id = (f.id ?? f.name)?.replace(/^anchor_garage_light_/, "");
    if (!id || seen.has(id)) throw new TypeError(`Missing or duplicate garage fixture ID: ${id}`);
    seen.add(id);
    return { ...f, id };
  });
}

// WebGL gathers lights per camera, not per mesh layer. The car materials
// consume the city's moving directional/hemisphere road lights and fixed
// area/spot workshop lights with a separate handoff uniform per car.
export function scopeCarLighting(root, inside) {
  const materials = new Set();
  root.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.isMeshStandardMaterial || m.isMeshLambertMaterial) materials.add(m); });
  for (const material of materials) {
    if (material.userData.garageLightScope) continue;
    material.userData.garageLightScope = inside;
    const before = material.onBeforeCompile;
    const key = material.customProgramCacheKey();
    material.onBeforeCompile = function (shader, renderer) {
      before.call(this, shader, renderer);
      shader.uniforms.garageInside = inside;
      const begin = THREE.ShaderChunk.lights_fragment_begin
        .replace("getDirectionalLightInfo( directionalLight, directLight );", "getDirectionalLightInfo( directionalLight, directLight );\n directLight.color *= 1.0 - garageInside;")
        .replace("getSpotLightInfo( spotLight, geometryPosition, directLight );", "getSpotLightInfo( spotLight, geometryPosition, directLight );\n directLight.color *= garageInside;")
        .replace("rectAreaLight = rectAreaLights[ i ];", "rectAreaLight = rectAreaLights[ i ];\n rectAreaLight.color *= garageInside;")
        .replace("getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal )", "(1.0 - garageInside) * getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal )");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform float garageInside;").replace("#include <lights_fragment_begin>", begin);
    };
    material.customProgramCacheKey = () => `${key}:garage-light-scope-v1`;
    material.needsUpdate = true;
  }
}

function faceOf(f) {
  const e = f.extras ?? {};
  const at = vector(f.position ?? f.at);
  const q = quaternion(f.quaternion);
  const aim = e.aim ? vector(e.aim) : at.clone().add(new THREE.Vector3(0, -1, 0).applyQuaternion(q));
  return { id: f.id, at, q, aim, along: new THREE.Vector3(1, 0, 0).applyQuaternion(q), length: e.length ?? 1.2, width: e.width ?? 0.05, color: colorOf(e), gain: e.intensity ?? 1, kind: e.kind, bay: e.bay };
}

// Which row of GARAGE_LIGHT_LOOK.practicals a face takes in the probe.
const practicalOf = (f) => f.kind === "strip" ? (/flank/.test(f.id) ? "flank" : "task") : /amber/.test(f.id) ? "amber" : /cyan|pink/.test(f.id) ? "neon" : f.kind;

// Every exported luminous face as an emissive box, for the probe only.
function practicals(faces) {
  const group = new THREE.Group();
  group.name = "garage_probe_practicals";
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = [];
  for (const f of faces) {
    const gain = GARAGE_LIGHT_LOOK.practicals[practicalOf(f)] ?? 0;
    if (!gain) continue;
    const m = new THREE.MeshBasicMaterial({ color: f.color.clone().multiplyScalar(f.gain * gain), side: THREE.DoubleSide, toneMapped: false });
    materials.push(m);
    const mesh = new THREE.Mesh(geometry, m);
    mesh.position.copy(f.at);
    mesh.quaternion.copy(f.q);
    mesh.scale.set(f.length, 0.026, f.width);
    group.add(mesh);
  }
  return { group, dispose() { group.removeFromParent(); geometry.dispose(); materials.forEach((m) => m.dispose()); } };
}

function slotOf(f) {
  if (f.bay !== "s4" && f.bay !== "s6") return null;
  if (f.kind === "work") return "work";
  if (f.kind !== "strip") return null;
  return /flank/.test(f.id) ? "flank" : "task";
}

function orient(light, f) {
  const z = f.at.clone().sub(f.aim).normalize();
  const x = f.along.clone().addScaledVector(z, -f.along.dot(z));
  if (x.lengthSq() < 1e-6) x.set(0, 0, 1).addScaledVector(z, -z.z);
  x.normalize();
  light.position.copy(f.at);
  light.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, new THREE.Vector3().crossVectors(z, x), z));
}

// A fixture-only development probe remains available before the room pack
// is attached. capture(roomScene) instead captures the actual ready room,
// including its artwork. The latter is required for final look evidence.
function workshopScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GARAGE_LIGHT_LOOK.background);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = [];
  const add = (color, gain, at, size, q) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), side: THREE.DoubleSide });
    materials.push(m);
    const mesh = new THREE.Mesh(geometry, m);
    mesh.position.copy(vector(at));
    mesh.scale.fromArray(size);
    if (q) mesh.quaternion.copy(q);
    scene.add(mesh);
  };
  const L = GARAGE_LIGHT_LOOK;
  add(L.floor, L.wallGain, [464, -0.05, -215], [23, 0.1, 29]);
  add(L.roof, L.wallGain, [464, 7.7, -215], [23, 0.1, 29]);
  for (const z of [-229.5, -200.5]) add(L.wall, L.wallGain, [464, 3.85, z], [23, 7.7, 0.1]);
  add(L.wall, L.wallGain, [475.5, 3.85, -215], [0.1, 7.7, 29]);
  add(L.wall, L.wallGain, [452.5, 6.15, -215], [0.1, 3.1, 29]);
  add(L.wall, L.wallGain, [452.5, 2.3, -223.75], [0.1, 4.6, 11.5]);
  add(L.wall, L.wallGain, [452.5, 2.3, -206.25], [0.1, 4.6, 11.5]);
  add(L.street, L.streetGain, [451, 2.3, -215], [0.1, 4.6, 6]);
  return { scene, dispose() { geometry.dispose(); materials.forEach((m) => m.dispose()); } };
}

export function createGarageLighting({ scene, renderer, layer = null, fixtures = [], tier = "high" }) {
  if (!THREE.UniformsLib.LTC_FLOAT_1) RectAreaLightUniformsLib.init();
  const group = new THREE.Group();
  group.name = "garage_car_lights";
  scene.add(group);
  let faces = [];
  let lights = {};
  let target = null;
  let disposed = false;
  const clear = () => { Object.values(lights).forEach((l) => l.dispose?.()); group.clear(); lights = {}; };
  const setFixtures = (source) => {
    if (disposed) return;
    const parsed = fixturesFrom(source);
    clear();
    faces = (parsed.length ? parsed : DEFAULT_FACES).map(faceOf);
    for (const f of faces) {
      const slot = slotOf(f);
      if (!slot) continue;
      const light = slot === "work"
        ? new THREE.SpotLight(f.color, GARAGE_LIGHT_LOOK.workCandela * f.gain, 12, THREE.MathUtils.degToRad(34), 0.65, 2)
        : new THREE.RectAreaLight(f.color, GARAGE_LIGHT_LOOK[`${slot}Nits`] * f.gain, f.length, f.width);
      light.name = `garage_light_${f.id}`;
      light.userData.fixture = f.id;
      if (layer != null) light.layers.enable(layer);
      if (light.isSpotLight) { light.position.copy(f.at); light.target.position.copy(f.aim); group.add(light.target); }
      else orient(light, f);
      group.add(light);
      lights[f.id] = light;
    }
    group.updateMatrixWorld(true);
  };
  setFixtures(fixtures);
  const api = {
    group,
    get lights() { return lights; },
    get fixtures() { return faces; },
    get stats() { return { lightCount: group.children.filter((o) => o.isLight).length, fixtureFaces: faces.length, provisional: false, probe: target ? { width: target.width, height: target.height, colorBytes: target.width * target.height * 8, depthBytes: target.width * target.height * 4, bytes: target.width * target.height * 12, temporaryFilterBytes: target.width * target.height * 8, size: GARAGE_LIGHT_LOOK.probeSize[tier], type: "half-float cube-UV", source: target.userData?.source } : null }; },
    probe: null,
    ready: Promise.resolve(),
    setFixtures,
    setInside() { /* Fixed room fixtures have no moving gain. The road rig handles its own handoff. */ },
    capture(source = null) {
      if (disposed) throw new Error("The garage light rig is disposed.");
      const pmrem = new THREE.PMREMGenerator(renderer);
      if (source != null && !source.isObject3D) { pmrem.dispose(); throw new TypeError("A garage probe source must be an Object3D."); }
      const workshop = source == null ? workshopScene() : null;
      const captureScene = source?.isScene ? source : workshop?.scene ?? new THREE.Scene();
      let parent, index;
      if (source && !source.isScene) {
        source.updateWorldMatrix(true, true);
        parent = source.parent;
        index = parent?.children.indexOf(source);
        // Keep the original subtree, including live material bindings. A
        // wrapper carries its parent's world transform without altering
        // the source's local transform or allocating cloned room geometry.
        const wrapper = new THREE.Group();
        wrapper.matrixAutoUpdate = false;
        if (parent) wrapper.matrix.copy(parent.matrixWorld);
        captureScene.add(wrapper);
        wrapper.add(source);
      }
      // The room's own surfaces, plus its practicals as bright as lamps are.
      const lamps = practicals(faces);
      captureScene.add(lamps.group);
      let next;
      try { next = pmrem.fromScene(captureScene, 0.03, 0.1, 60, { size: GARAGE_LIGHT_LOOK.probeSize[tier], position: new THREE.Vector3(463, 1.2, -218.5) }); }
      finally {
        lamps.dispose();
        if (source && !source.isScene) {
          source.removeFromParent();
          if (parent) { parent.add(source); parent.children.splice(parent.children.indexOf(source), 1); parent.children.splice(index, 0, source); }
          source.updateWorldMatrix(true, true);
        }
        workshop?.dispose(); pmrem.dispose();
      }
      next.userData = { source: source ? "ready-room" : "fixture-development" };
      const previous = target;
      target = next;
      api.probe = next.texture;
      previous?.dispose();
      return api.probe;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      clear();
      target?.dispose();
      target = null;
      api.probe = null;
    },
  };
  return api;
}
