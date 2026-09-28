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
  { c: [200, -300], r: [260, 120], y: 95, v: 38 },
  { c: [320, -260], r: [140, 70], y: 70, v: 28 },
  { c: [0, -650], r: [260, 60], y: 110, v: 42 },
  { c: [90, -200], r: [160, 110], y: 64, v: 30 },
  { c: [-40, -560], r: [90, 180], y: 52, v: 24 },
  { c: [420, -250], r: [120, 160], y: 58, v: 26 },
  { c: [150, -450], r: [300, 90], y: 124, v: 44 },
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

export function createTraffic(scene, shared, { avs = 10, cars = 4, reduced = false, reflectLayer = 2 } = {}) {
  const avGeo = mergeGeometries([box(2.0, 0.55, 4.6), box(1.4, 0.45, 2.0, 0, 0.45, -0.3), box(3.6, 0.12, 0.8, 0, 0.1, -1.6)]);
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
  const avMesh = new THREE.InstancedMesh(avGeo, bodyMat, Math.max(1, avs));
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

  const phase = Array.from({ length: avs + cars }, () => Math.random());
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const tmp = new THREE.Vector3();
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

  const update = (dt, on) => {
    avMesh.visible = carMesh.visible = lamps.visible = on;
    if (!on) return;
    if (!reduced) clock += dt;
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
      avMesh.setMatrixAt(i, m.compose(p, q, one));
      setLamp(li++, p.x + fwd.x * 2.4, p.y, p.z + fwd.z * 2.4, 0.75, 0.9, 1.0, 1.6);
      setLamp(li++, p.x - fwd.x * 2.4, p.y + 0.2, p.z - fwd.z * 2.4, 1.0, 0.1, 0.25, 1.2);
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
    avMesh.instanceMatrix.needsUpdate = true;
    carMesh.instanceMatrix.needsUpdate = true;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  };

  return {
    update,
    setCounts(nAvs, nCars) {
      avMesh.count = Math.min(avs, nAvs);
      carMesh.count = Math.min(cars, nCars);
    },
    dispose() {
      scene.remove(avMesh, carMesh, lamps);
      avGeo.dispose();
      carGeo.dispose();
      bodyMat.dispose();
      quad.dispose();
      lampGeo.dispose();
      lampMat.dispose();
      avMesh.dispose();
      carMesh.dispose();
    },
  };
}
