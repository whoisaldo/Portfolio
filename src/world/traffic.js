// src/world/traffic.js: the city moving on its own.
//
// Aerial vehicles on slow loops over the avenue's canyon and the districts
// (ten on desktop, four on a phone), and a few cars on the avenue's lanes
// (four, two) driving away up the street on the right and toward the lens
// on the left, their lamps in the wet road's mirror. Bodies are one
// instanced mesh; every lamp is one instanced sprite batch. The `traffic`
// switch in env.js parks all of it.
//
// Nothing here pretends to be data: no routes, no counts, no telemetry.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON } from "./glsl.js";
import { createObject as createAv } from "./av-model.js";

// The AV's surfaces, by the model's material names (src/world/av-model.js),
// as the kind its shader reads.
const AV_KINDS = { hull: 0, trim: 1, glass: 2, lamp_head: 3, lamp_tail: 4, glow_thruster: 5, glow_accent: 6 };

/** The AV as one geometry: every mesh baked into the model's frame, only
 *  position and normal kept, and each vertex tagged with what it is. */
function avGeometry() {
  const model = createAv();
  model.updateMatrixWorld(true);
  const parts = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    const kind = AV_KINDS[o.material?.name];
    if (kind === undefined) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(kind), 1));
    parts.push(g);
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.dispose?.();
  });
  return merged;
}

function box(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

// Lanes over the canyon and the districts: centre, radii, altitude, speed.
const SKY_LANES = [
  { c: [0, -420], r: [150, 60], y: 58, v: 26 },
  { c: [20, -520], r: [220, 40], y: 82, v: 34 },
  { c: [-10, -300], r: [120, 90], y: 46, v: 22 },
  // Across the moon, seen from the garage's roof (fourth, so a phone's four
  // take it too).
  { c: [620, 120], r: [200, 70], y: 150, v: 40 },
  { c: [200, -300], r: [260, 120], y: 95, v: 38 },
  { c: [320, -260], r: [140, 70], y: 70, v: 28 },
  { c: [0, -650], r: [260, 60], y: 110, v: 42 },
  { c: [90, -200], r: [160, 110], y: 64, v: 30 },
  { c: [-40, -560], r: [90, 180], y: 52, v: 24 },
  { c: [420, -250], r: [120, 160], y: 58, v: 26 },
];
// The avenue's lanes: x, direction of travel along z, speed.
const ROAD_LANES = [
  { x: 5.2, dir: -1, v: 15 },
  { x: -5.0, dir: 1, v: 13 },
  { x: 1.8, dir: -1, v: 18 },
  { x: -1.8, dir: 1, v: 16 },
];
const ROAD_FAR = -600;
const ROAD_NEAR = -40;

export function createTraffic(scene, shared, { avs = 10, cars = 4, reduced = false, reflectLayer = 2, rail = null } = {}) {
  const avGeo = avGeometry();
  const carGeo = mergeGeometries([box(1.9, 0.62, 4.5, 0, 0.55, 0), box(1.6, 0.48, 2.2, 0, 1.1, -0.2)]);
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vec3 n = normalize(vNormalW);
        vec3 v = normalize(uCam - vWorld);
        float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 col = vec3(0.02) + spillAt(vWorld) * 0.6 + uHazeColor * rim * 0.8;
        col = cityFog(col, vWorld, 0.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  bodyMat.name = "traffic";
  // The AVs: gunmetal and tinted glass giving back the lit city under them
  // and the haze over it, most at a glancing angle; their lamps, thrusters
  // and sill strips bright enough for the bloom to find.
  const avMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute float aKind;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vKind;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vKind = aKind;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vKind;
      void main() {
        vec3 n = normalize(vNormalW);
        vec3 V = normalize(vWorld - uCam);
        vec3 R = reflect(V, n);
        float F = 0.04 + 0.96 * pow(1.0 - abs(dot(V, n)), 5.0);
        // Under it the lit city, a band of neon at the horizon; over it the
        // haze and the dark.
        float band = exp(-abs(R.y) * 14.0);
        vec3 below = uHazeColor * 0.5 + uGlowColor * 0.9;
        vec3 above = uHazeColor * 0.3 * exp(-max(R.y, 0.0) * 4.0) + vec3(0.004, 0.004, 0.008);
        vec3 env = mix(below, above, step(0.0, R.y)) + vec3(1.0, 0.35, 0.75) * band * 0.35;
        int k = int(vKind + 0.5);
        vec3 col;
        float glow = 1.0;
        if (k == 0) { col = vec3(0.014, 0.015, 0.019) + env * (0.18 + 0.82 * F); glow = 0.0; }
        else if (k == 1) { col = vec3(0.006, 0.006, 0.008) + env * F * 0.35; glow = 0.0; }
        else if (k == 2) { col = vec3(0.003, 0.005, 0.009) + env * (0.08 + 0.92 * F); glow = 0.0; }
        else if (k == 3) col = vec3(0.92, 0.95, 1.0) * 7.0;
        else if (k == 4) col = vec3(1.0, 0.1, 0.24) * 5.5;
        else if (k == 5) col = vec3(0.35, 0.85, 1.0) * 2.6 * (0.85 + 0.15 * sin(uTime * 40.0 + vWorld.x));
        else col = vec3(1.0, 0.18, 0.53) * 4.0;
        if (glow < 0.5) col += spillAt(vWorld) * 0.5 * max(-n.y, 0.0);
        col = cityFog(col, vWorld, glow);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  avMat.name = "avs";
  const avMesh = new THREE.InstancedMesh(avGeo, avMat, Math.max(1, avs));
  const carMesh = new THREE.InstancedMesh(carGeo, bodyMat, Math.max(1, cars));
  for (const m of [avMesh, carMesh]) {
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.layers.enable(reflectLayer);
    scene.add(m);
  }
  avMesh.count = avs;
  carMesh.count = cars;

  // Lamps: two per aerial vehicle, four per car.
  const lampCount = avs * 2 + cars * 4;
  const quad = new THREE.PlaneGeometry(1, 1);
  const lampGeo = new THREE.InstancedBufferGeometry();
  lampGeo.index = quad.index;
  lampGeo.setAttribute("position", quad.attributes.position);
  lampGeo.setAttribute("uv", quad.attributes.uv);
  const lampPos = new Float32Array(Math.max(1, lampCount) * 3);
  const lampCol = new Float32Array(Math.max(1, lampCount) * 4);
  const posAttr = new THREE.InstancedBufferAttribute(lampPos, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.InstancedBufferAttribute(lampCol, 4).setUsage(THREE.DynamicDrawUsage);
  lampGeo.setAttribute("aPos", posAttr);
  lampGeo.setAttribute("aCol", colAttr);
  lampGeo.instanceCount = lampCount;
  const lampMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec3 aPos;
      attribute vec4 aCol;
      varying vec4 vCol;
      varying vec2 vUv;
      void main() {
        vec4 mv = viewMatrix * vec4(aPos, 1.0);
        mv.xy += position.xy * aCol.a;
        gl_Position = projectionMatrix * mv;
        vCol = aCol;
        vUv = uv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec4 vCol;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float core = exp(-d * d * 9.0);
        float halo = exp(-d * d * 2.2) * 0.35;
        gl_FragColor = vec4(vCol.rgb * (core * 3.0 + halo), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  lampMat.name = "lamps";
  const lamps = new THREE.Mesh(lampGeo, lampMat);
  lamps.frustumCulled = false;
  lamps.renderOrder = 7;
  lamps.layers.enable(reflectLayer);
  scene.add(lamps);

  // The train on the viaduct at the avenue's far end (anchor_rail): one
  // box, six cars drawn on it by the shader (the gaps between them, a row
  // of lit windows, a lamp at the front), sliding across the glow at the
  // vanishing point every half minute or so, one way and then the other.
  const TRAIN = { length: 108, cars: 6, period: 32, crossing: 13, span: 340 };
  const trainGeo = new THREE.BoxGeometry(TRAIN.length, 3.0, 3.0);
  const trainMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uDir: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vLocal = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uDir;
      varying vec3 vLocal;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        float carLen = ${TRAIN.length.toFixed(1)} / ${TRAIN.cars.toFixed(1)};
        float u = vLocal.x + ${(TRAIN.length / 2).toFixed(1)};
        float inCar = fract(u / carLen) * carLen;
        float gap = step(inCar, 0.6) + step(carLen - 0.6, inCar);
        float side = step(0.5, abs(normalize(vNormalW).z));
        float y = vLocal.y + 1.5;
        float band = step(1.1, y) * step(y, 2.2);
        float win = step(0.35, fract(inCar / 1.6)) * band * (1.0 - gap) * side;
        float lit = step(0.18, hash12(vec2(floor(u / 1.6), 3.0)));
        vec3 col = vec3(0.012, 0.012, 0.016) * (1.0 - gap) + vec3(1.0, 0.86, 0.66) * win * lit * 2.2;
        // A stripe of the line's colour under the windows, and the lamp at
        // the front.
        col += vec3(0.1, 0.9, 1.0) * step(0.75, y) * step(y, 0.9) * side * (1.0 - gap) * 1.6;
        float front = uDir > 0.0 ? step(${(TRAIN.length / 2 - 0.3).toFixed(1)}, vLocal.x) : step(vLocal.x, ${(-TRAIN.length / 2 + 0.3).toFixed(1)});
        col += vec3(1.0, 0.95, 0.85) * front * step(1.0, y) * step(y, 2.0) * 6.0;
        col = cityFog(col, vWorld, 0.8);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  trainMat.name = "train";
  const train = new THREE.Mesh(trainGeo, trainMat);
  train.name = "train";
  train.visible = false;
  train.layers.enable(reflectLayer);
  if (rail) scene.add(train);

  const phase = Array.from({ length: avs + cars }, () => Math.random());
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tilt = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const setLamp = (i, x, y, z, r, g, b, size) => {
    lampPos[i * 3] = x;
    lampPos[i * 3 + 1] = y;
    lampPos[i * 3 + 2] = z;
    lampCol[i * 4] = r;
    lampCol[i * 4 + 1] = g;
    lampCol[i * 4 + 2] = b;
    lampCol[i * 4 + 3] = size;
  };
  let clock = 0;
  let frozen = false;

  const update = (dt, on) => {
    avMesh.visible = carMesh.visible = lamps.visible = on;
    if (!on) {
      train.visible = false;
      return;
    }
    if (!reduced && !frozen) clock += dt;
    let li = 0;
    for (let i = 0; i < avs; i++) {
      const L = SKY_LANES[i % SKY_LANES.length];
      const circ = Math.PI * (L.r[0] + L.r[1]);
      const a = (phase[i] + (clock * L.v) / circ) * Math.PI * 2 * (i % 2 ? -1 : 1);
      p.set(L.c[0] + Math.cos(a) * L.r[0], L.y + Math.sin(a * 2.0 + i) * 3, L.c[1] + Math.sin(a) * L.r[1]);
      const b = a + (i % 2 ? -0.01 : 0.01);
      tmp.set(L.c[0] + Math.cos(b) * L.r[0], p.y, L.c[1] + Math.sin(b) * L.r[1]);
      fwd.subVectors(tmp, p).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd);
      // Banked into its loop and a touch nose-down, as a thing flying does.
      q.multiply(tilt.setFromEuler(euler.set(0.05, 0, (i % 2 ? 1 : -1) * 0.16)));
      avMesh.setMatrixAt(i, m.compose(p, q, one));
      setLamp(li++, p.x + fwd.x * 2.6, p.y + 0.25, p.z + fwd.z * 2.6, 0.75, 0.9, 1.0, 1.2);
      setLamp(li++, p.x - fwd.x * 2.6, p.y + 0.4, p.z - fwd.z * 2.6, 1.0, 0.1, 0.25, 0.9);
    }
    for (let i = 0; i < cars; i++) {
      const L = ROAD_LANES[i % ROAD_LANES.length];
      const span = ROAD_NEAR - ROAD_FAR;
      const t = (phase[avs + i] + (clock * L.v) / span) % 1;
      const z = L.dir < 0 ? ROAD_NEAR - t * span : ROAD_FAR + t * span;
      p.set(L.x, 0, z);
      fwd.set(0, 0, L.dir);
      q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd);
      carMesh.setMatrixAt(i, m.compose(p, q, one));
      // Fade in and out at the ends of the loop, far off or at the kerb of
      // the intersection, so nobody sees a car appear.
      const edge = Math.min(1, Math.min(t, 1 - t) * 8);
      const hx = 0.72;
      for (const s of [-1, 1]) {
        setLamp(li++, L.x + s * hx, 0.72, z + L.dir * 2.3, 0.85 * edge, 0.92 * edge, 1.0 * edge, 0.9);
        setLamp(li++, L.x + s * hx, 0.85, z - L.dir * 2.3, 1.0 * edge, 0.05 * edge, 0.15 * edge, 0.6);
      }
    }
    if (rail) {
      const pass = Math.floor(clock / TRAIN.period);
      const t = clock - pass * TRAIN.period;
      const dir = pass % 2 ? -1 : 1;
      train.visible = t < TRAIN.crossing;
      if (train.visible) {
        const k = t / TRAIN.crossing;
        train.position.set(rail.position.x + dir * (k * 2 - 1) * TRAIN.span, rail.position.y + 1.5, rail.position.z);
        trainMat.uniforms.uDir.value = dir;
      }
    }
    avMesh.instanceMatrix.needsUpdate = true;
    carMesh.instanceMatrix.needsUpdate = true;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  };

  return {
    update,
    avMesh,
    /** Dev: hold every vehicle where it is. */
    freeze(on = true) {
      frozen = on;
    },
    setCounts(nAvs, nCars) {
      avMesh.count = Math.min(avs, nAvs);
      carMesh.count = Math.min(cars, nCars);
    },
    dispose() {
      scene.remove(avMesh, carMesh, lamps, train);
      trainGeo.dispose();
      trainMat.dispose();
      avGeo.dispose();
      carGeo.dispose();
      bodyMat.dispose();
      avMat.dispose();
      quad.dispose();
      lampGeo.dispose();
      lampMat.dispose();
      avMesh.dispose();
      carMesh.dispose();
    },
  };
}
