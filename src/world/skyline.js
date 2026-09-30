// src/world/skyline.js: the city past the kit, and the sky over it.
//
// Everything the Blender kit does not model is here: a few thousand towers
// on a jittered grid out to about a mile and a half, one InstancedMesh and
// one draw, lit by the same window shader as the kit's own facades (their
// window cells are worked out from world position in the vertex shader, and
// each tower's lit fraction, style and warmth from a hash of where it
// stands). The grid leaves the kit's footprint alone: the avenue and its
// canyon, the plaza, corpo row, the rooftop and the garage, and keeps low
// to the south-east, where the Contact shot's moon rises.
//
// The sky is a dome: near-black overhead, and near the horizon the lit
// city's glow hanging in wet air, violet and pink rather than blue, because
// the light is the city's and not the moon's, brightest toward downtown.
// The kit's landmark towers (anchor_mega_*) are kept clear of, like the kit.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON, WINDOWS } from "./glsl.js";

// Rectangles (x0, z0, x1, z1) the far city stays out of.
const KEEP_OUT = [
  [-60, -740, 60, 80], // the avenue, its canyon and the intersection
  [0, -420, 490, -130], // plaza, corpo row, rooftop, garage (the rooftop's east wall is at 484)
  [-70, 20, 70, 140], // behind the hero camera
];
// Where the moon rises for the Contact shot: lit roofs stay low there, and
// right by the garage they are not there at all. A few towers stand under
// it, their tops just clear of its lower edge from the garage's roof, so
// the moon rises out of a skyline rather than an empty sky: x, z, width,
// height.
const LOW = [420, -200, 1400, 1300];
const CLEAR = [440, -200, 560, -150];
// Contact's lens, on the garage's roof: roofs near it stay low, stepping up
// with distance, so the blocks it looks over fill the bottom of a phone's
// tall frame without standing in front of the moon.
const CONTACT_LENS = [456, -203];
const UNDER_THE_MOON = [
  [572, 40, 26, 78],
  [612, 96, 30, 94],
  [546, 118, 22, 70],
  [650, 30, 24, 64],
  [520, 60, 20, 58],
];
// Aviation lights on anything this tall, blinking red in three groups.
const BEACON_OVER = 92;
// The cloud deck's height, over the tallest roofs.
const CLOUD_H = 520;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createSkyline(scene, shared, { count = 2600, keepOut = [], reduced = false, facades = [] } = {}) {
  const r = rng(90210);
  const matrices = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const cell = 46;
  for (let gx = -900; gx < 1500; gx += cell) {
    for (let gz = -1700; gz < 900; gz += cell) {
      const x = gx + (r() - 0.5) * cell * 0.5;
      const z = gz + (r() - 0.5) * cell * 0.5;
      if ([...KEEP_OUT, ...keepOut].some(([x0, z0, x1, z1]) => x > x0 - 20 && x < x1 + 20 && z > z0 - 20 && z < z1 + 20)) continue;
      if (x > CLEAR[0] && x < CLEAR[2] && z > CLEAR[1] && z < CLEAR[3]) continue;
      const d = Math.hypot(x - 200, z + 300);
      if (r() < 0.12) continue;
      const w = 16 + r() * 22;
      const dd = 16 + r() * 22;
      let h = 24 + Math.pow(r(), 2.2) * 150 + Math.min(80, d * 0.05);
      if (r() < 0.05) h += 90 + r() * 110;
      const [lx0, lz0, lx1, lz1] = LOW;
      if (x > lx0 && x < lx1 && z > lz0 && z < lz1) h = Math.min(h, 22 + r() * 30);
      const near = Math.hypot(x - CONTACT_LENS[0], z - CONTACT_LENS[1]);
      // The nearest roofs sit just under the lens (10.4 m up), so Contact
      // skims across a roofscape to the lit blocks and the moon.
      if (near < 170) h = Math.min(h, 4 + near * 0.11);
      // Up the avenue the far city keeps under the hero's band of sky: seen
      // from its lens (0.6, 0.6, 10), nothing in its view stands taller than
      // about a sixth of its distance, so the roofs step down into the glow
      // and the kit's landmark towers have the sky to themselves.
      const ahead = 10 - z;
      if (ahead > 0 && Math.abs(x - 0.6) < ahead * 0.9) h = Math.min(h, 10 + ahead * (0.13 + 0.08 * r()));
      p.set(x, h / 2, z);
      s.set(w, h, dd);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (r() - 0.5) * 0.3);
      matrices.push(m.compose(p, q, s).clone());
    }
  }
  // More candidates than the tier draws (a phone's 1,200): keep the nearest
  // to the middle of the kit, so a phone thins the city's far edge rather
  // than losing a whole side of it.
  if (matrices.length > count) {
    const at = new THREE.Vector3();
    const dist = (mat) => at.setFromMatrixPosition(mat).set(at.x - 250, 0, at.z + 300).length();
    matrices.sort((a, b) => dist(a) - dist(b));
    matrices.length = count;
  }
  const heroFrom = matrices.length;
  for (const [x, z, w, h] of UNDER_THE_MOON) {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (r() - 0.5) * 0.3);
    matrices.push(m.compose(p.set(x, h / 2, z), q, s.set(w, h, w * 0.9)).clone());
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // The towers under the moon are the Contact shot's skyline, not the far
  // city's filler: they are dressed (aHero, below).
  const hero = new Float32Array(matrices.length);
  hero.fill(1, heroFrom);
  geometry.setAttribute("aHero", new THREE.InstancedBufferAttribute(hero, 1));
  // No floors: nobody sees the underside of a tower.
  // The low blocks wear the avenue's painted elevations (the kit's three,
  // src/world/materials.js), one of the three each, rather than the window
  // grid: balconies, laundry, AC units and lit rooms, the same city as the
  // street. The towers keep their windows.
  const painted = facades.filter(Boolean).length === 3;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uFacade0: { value: painted ? facades[0] : null },
      uFacade1: { value: painted ? facades[1] : null },
      uFacade2: { value: painted ? facades[2] : null },
    },
    defines: painted ? { PAINTED: "" } : {},
    vertexShader: /* glsl */ `
      attribute float aHero;
      varying vec3 vWorld;
      varying vec2 vCells;
      varying vec3 vParams;
      varying float vRoof;
      varying vec2 vCrown;
      varying vec4 vHero;
      varying vec3 vPaint;
      float hash11(float n) { return fract(sin(n) * 43758.5453123); }
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec3 n = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vRoof = step(0.5, n.y);
        // Window cells from world position on each face.
        float along = abs(n.x) > 0.5 ? w.z : w.x;
        vCells = vec2(along / 3.2, (w.y - 4.6) / 3.4);
        vec3 origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float seed = origin.x * 0.013 + origin.z * 0.071;
        vParams = vec3(0.14 + 0.5 * hash11(seed), hash11(seed + 1.7) * 0.625, hash11(seed + 3.1));
        vCells += vec2(hash11(seed + 5.0) * 40.0, 0.0);
        // The roof's height, and which towers light a band under it.
        vCrown = vec2(origin.y + length(instanceMatrix[1].xyz) * 0.5, hash11(seed + 9.3));
        // A dressed tower: whole office floors lit in bands, and where it is
        // on its faces (0..1 across) for the blade up one corner.
        vHero = vec4(aHero, position.x + 0.5, position.z + 0.5, abs(n.x));
        if (aHero > 0.5) vParams = vec3(0.55, 0.25, hash11(seed + 3.1));
        // Painted: which of the three elevations (-1 for windows), and where
        // on it, a tile 16 m wide and 24 m tall, each block from its own
        // place in the picture.
        float tall = length(instanceMatrix[1].xyz);
        float pick = hash11(seed + 12.7);
        float which = (tall < 100.0 && (pick > 0.06 || tall < 40.0) && aHero < 0.5) ? floor(fract(pick * 7.0) * 3.0) : -1.0;
        vPaint = vec3((along + hash11(seed + 6.1) * 160.0) / 16.0, (w.y - 4.6) / 24.0 + step(0.5, hash11(seed + 8.3)) * 0.5, which);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${WINDOWS}
      varying vec3 vWorld;
      varying vec2 vCells;
      varying vec3 vParams;
      varying float vRoof;
      varying vec2 vCrown;
      varying vec4 vHero;
      varying vec3 vPaint;
      #ifdef PAINTED
      uniform sampler2D uFacade0;
      uniform sampler2D uFacade1;
      uniform sampler2D uFacade2;
      #endif
      void main() {
        vec4 win = windows(vCells, vParams, vWorld, step(0.0, vCells.y));
        vec3 col = mix(win.rgb, vec3(0.012, 0.012, 0.016), vRoof);
        #ifdef PAINTED
        // A painted block, as the kit's painted material draws its walls:
        // tiles mirrored and some a floor darker, a smaller level far off.
        vec2 tile = floor(vPaint.xy);
        vec2 puv = vPaint.xy;
        if (hash12(tile + 3.1) > 0.5) puv.x = tile.x + 1.0 - fract(vPaint.x);
        puv.x += floor(hash12(vec2(tile.y, 9.3)) * 4.0) * 0.25;
        float far = smoothstep(90.0, 260.0, length(vWorld - uCam));
        vec2 grad = vec2(fwidth(vPaint.x), fwidth(vPaint.y)) * exp2(far * 1.5);
        vec3 tex = vPaint.z < 0.5 ? textureGrad(uFacade0, puv, vec2(grad.x, 0.0), vec2(0.0, grad.y)).rgb
          : vPaint.z < 1.5 ? textureGrad(uFacade1, puv, vec2(grad.x, 0.0), vec2(0.0, grad.y)).rgb
          : textureGrad(uFacade2, puv, vec2(grad.x, 0.0), vec2(0.0, grad.y)).rgb;
        if (vPaint.z > -0.5 && vRoof < 0.5) {
          tex *= mix(1.0, 0.62, step(0.66, hash12(tile + 7.7)));
          float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
          float room = smoothstep(0.12, 0.45, lum);
          float distant = smoothstep(60.0, 220.0, length(vWorld - uCam));
          vec3 p = tex * 1.05 * (0.9 + 1.4 * room * room * (1.0 - 0.9 * distant)) * (1.0 - 0.25 * distant);
          p += tex * spillAt(vWorld) * 2.2 * (1.0 - room) + spillAt(vWorld) * 0.02;
          // Street level: shopfronts in 3.2 m bays, a colour to each, lit
          // brightest under the fascia, a sign band over them, some shut.
          float bayU = vPaint.x * 16.0 / 3.2;
          float bay = floor(bayU);
          float front = hash12(vec2(floor(bay / 2.0), tile.y + vParams.z * 31.0));
          vec3 shopCol = front > 0.9 ? vec3(1.0, 0.3, 0.62) : front > 0.8 ? vec3(0.25, 0.85, 1.0) : vec3(1.0, 0.66, 0.38);
          float shop = step(vWorld.y, 4.6);
          float y = vWorld.y;
          float glassY = step(0.45, y) * step(y, 3.2);
          float mull = step(min(fract(bayU), 1.0 - fract(bayU)), 0.03);
          float open = step(0.35, front);
          vec3 inside = shopCol * (0.05 + 0.3 * smoothstep(0.5, 3.1, y)) * (0.5 + 0.8 * hash12(vec2(bay, 4.0)));
          vec3 shut = vec3(0.02, 0.02, 0.025) * (0.7 + 0.3 * step(0.5, fract(y * 10.0)));
          vec3 street = mix(shut, inside, open) * glassY * (1.0 - mull);
          float fascia = step(3.45, y) * step(y, 4.25);
          street += mix(vec3(0.012), shopCol * 0.5, fascia * step(0.55, front) * step(0.15, fract(bayU * 0.5)));
          street += spillAt(vWorld) * 0.15;
          p = mix(p, street, shop);
          col = p;
          win.a = max(room * 0.7 * (1.0 - distant), shop * open * glassY);
        }
        #endif
        // One tall tower in seven wears a lit band under its roof: white,
        // amber, or one of the city's neons. The towers under the moon all
        // do, in the city's neons, with a blade of light up one corner.
        float top = vCrown.x;
        float dressed = step(0.5, vHero.x);
        float crown = (1.0 - vRoof) * max(step(0.86, vCrown.y) * step(60.0, top), dressed) * step(top - 3.4, vWorld.y) * step(vWorld.y, top - 2.1);
        float pick = mix(vCrown.y, 0.93 + 0.07 * vCrown.y, dressed);
        vec3 crownCol = pick > 0.975 ? vec3(1.0, 0.22, 0.62) : pick > 0.955 ? vec3(0.16, 0.9, 1.0) : pick > 0.93 ? vec3(1.0, 0.58, 0.22) : vec3(0.8, 0.88, 1.0);
        col = mix(col, crownCol * 1.8, crown);
        float across = vHero.w > 0.5 ? vHero.z : vHero.y;
        float blade = dressed * (1.0 - vRoof) * step(across, 0.035) * step(8.0, vWorld.y) * step(vWorld.y, top - 4.0);
        col = mix(col, (vCrown.y > 0.5 ? vec3(0.16, 0.9, 1.0) : vec3(1.0, 0.22, 0.62)) * 2.2, blade);
        col = cityFog(col, vWorld, max(max(win.a * 0.8 * (1.0 - vRoof), crown), blade));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "skyline";
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = "skyline";
  scene.add(mesh);

  // What stands on the low roofs, so the skyline does not end in ruled
  // lines: a stair or lift house, a water tank on its stand, a mast. One set,
  // made for a 20 m roof and scaled to each, turned a quarter at random so
  // no two read the same. One draw.
  const part = (g, x, y, z) => g.translate(x, y, z);
  const roofSet = mergeGeometries([
    part(new THREE.BoxGeometry(5, 3, 4), -3.5, 1.5, 2.5),
    part(new THREE.BoxGeometry(3.2, 1.2, 3.2), 4.2, 0.6, -4.0),
    part(new THREE.CylinderGeometry(1.5, 1.5, 3.0, 8, 1, false), 4.2, 2.7, -4.0),
    part(new THREE.ConeGeometry(1.6, 0.8, 8), 4.2, 4.6, -4.0),
    part(new THREE.BoxGeometry(0.18, 9, 0.18), -6.5, 4.5, -6.5),
    part(new THREE.BoxGeometry(2.4, 1.1, 1.6), 1.0, 0.55, 6.0),
  ].map((g) => g.toNonIndexed()));
  const roofs = [];
  const rs = new THREE.Vector3();
  const rp = new THREE.Vector3();
  const rq = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  for (let i = 0; i < heroFrom; i++) {
    matrices[i].decompose(rp, rq, rs);
    if (rs.y > 64 || r() < 0.3) continue;
    const k = Math.min(rs.x, rs.z) / 20;
    spin.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.floor(r() * 4) * Math.PI / 2);
    roofs.push(new THREE.Matrix4().compose(rp.set(rp.x, rp.y + rs.y / 2, rp.z), rq.clone().multiply(spin), rs.set(k, k, k)));
  }
  const roofMat = new THREE.ShaderMaterial({
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
        float up = max(n.y, 0.0);
        // Dark plant against the sky, its tops and edges catching the
        // city's glow on the cloud.
        vec3 col = vec3(0.012, 0.012, 0.016) + (uHazeColor * 0.35 + uGlowColor * 0.2) * (0.25 + 0.75 * up) * uHaze * 0.5;
        col = cityFog(col, vWorld, 0.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  roofMat.name = "skyline_roofs";
  const roofMesh = new THREE.InstancedMesh(roofSet, roofMat, Math.max(1, roofs.length));
  roofs.forEach((mat, i) => roofMesh.setMatrixAt(i, mat));
  roofMesh.count = roofs.length;
  roofMesh.instanceMatrix.needsUpdate = true;
  roofMesh.computeBoundingSphere();
  roofMesh.name = "skyline_roofs";
  scene.add(roofMesh);

  // Aviation lights: a red lamp on every tall roof, a third of them on at a
  // time, a little under a second each, so the skyline blinks slowly across
  // itself. Steady under reduced motion. One draw.
  const beacons = [];
  const groups = [];
  const at = new THREE.Vector3();
  const size = new THREE.Vector3();
  for (const [i, mat] of matrices.entries()) {
    at.setFromMatrixPosition(mat);
    size.setFromMatrixScale(mat);
    const top = at.y + size.y / 2;
    if (top < BEACON_OVER && i < heroFrom) continue;
    beacons.push(at.x, top + 0.8, at.z);
    groups.push(Math.floor(r() * 3));
  }
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute("position", new THREE.Float32BufferAttribute(beacons, 3));
  beaconGeo.setAttribute("aGroup", new THREE.Float32BufferAttribute(groups, 1));
  const beaconMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uPixel: { value: 1 }, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      attribute float aGroup;
      uniform float uTime;
      uniform float uPixel;
      uniform float uMotion;
      varying float vOn;
      varying vec3 vWorld;
      void main() {
        vWorld = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float t = fract(uTime * 0.75 + aGroup / 3.0);
        vOn = mix(0.6, smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.42, 0.55, t)), uMotion);
        gl_PointSize = clamp(2600.0 / -mv.z, 2.5, 6.0) * uPixel;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying float vOn;
      varying vec3 vWorld;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        vec3 col = vec3(1.0, 0.06, 0.04) * 3.5 * vOn * exp(-d * d * 4.0);
        col *= exp(-length(vWorld - uCam) * uFogDensity * 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  beaconMat.name = "beacons";
  const beaconPoints = new THREE.Points(beaconGeo, beaconMat);
  beaconPoints.name = "beacons";
  scene.add(beaconPoints);

  // The dome, which is also everything past the last building: the sky and
  // its cloud, the searchlights, and below the horizon the far city's
  // ground, where no tower stands on it.
  const skyGeo = new THREE.SphereGeometry(2200, 32, 16);
  const sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({
    uniforms: { ...shared, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 w = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * w;
        gl_Position.z = gl_Position.w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uMotion;
      varying vec3 vDir;

      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * vnoise(p);
          p = p * 2.03 + vec2(17.1, 3.7);
          a *= 0.5;
        }
        return s / 0.9375;
      }

      // The far city's ground: its blocks stand on a ${cell} m grid, so its
      // streets run between them. A lamp every eleven and a half metres down
      // each kerb, a pool of light under it, and now and then a car's lights
      // going along. Past a pixel a lamp is spread into its street rather
      // than sparkling.
      vec3 streets(vec3 p, float time, float px) {
        vec2 q = (p.xz + vec2(${900 - cell / 2}.0, ${1700 - cell / 2}.0)) / ${cell}.0;
        // Signed metres from the nearest street's middle, on each axis.
        vec2 off = (fract(q + 0.5) - 0.5) * ${cell}.0;
        vec2 id = floor(q + 0.5);
        float road = 1.0 - smoothstep(5.0, 6.0 + px, min(abs(off.x), abs(off.y)));
        vec3 base = vec3(0.004, 0.004, 0.006) + vec3(0.008, 0.007, 0.009) * road;
        vec3 light = vec3(0.0);
        // Streets along z (off.x small) and along x (off.y small).
        for (int k = 0; k < 2; k++) {
          float across = k == 0 ? off.x : off.y;
          float along = k == 0 ? p.z : p.x;
          float street = k == 0 ? id.x : id.y;
          if (abs(across) > 9.0 + px) continue;
          float dz = abs(fract(along / 11.5 + 0.5) - 0.5) * 11.5;
          float dk = abs(abs(across) - 4.2);
          float d2 = dk * dk + dz * dz;
          float r = max(0.9, px);
          float lamp = exp(-d2 / (r * r)) * (0.81 / (r * r));
          float on = step(0.12, hash12(vec2(floor(along / 11.5 + 0.5), street * 3.1 + float(k))));
          // Each lamp's pool runs into the next, so a street reads as a line.
          float pool = exp(-dk * dk / 8.0 - dz * dz / 45.0) * 0.12;
          vec3 sodium = mix(vec3(1.0, 0.55, 0.2), vec3(0.85, 0.9, 1.0), step(0.7, hash12(vec2(street, float(k) + 3.0))));
          light += sodium * (lamp * 1.4 * on + pool * (0.4 + 0.6 * on));
          // Shopfronts at the foot of the blocks: a band of light along each
          // kerb, a colour to each front, some of them shut.
          float front = hash12(vec2(floor(along / 7.0), street * 5.3 + float(k) * 7.0 + step(0.0, across)));
          vec3 shopCol = front > 0.96 ? vec3(1.0, 0.25, 0.6) : front > 0.93 ? vec3(0.2, 0.85, 1.0) : vec3(1.0, 0.72, 0.48);
          float within = step(abs(fract(along / 7.0) - 0.5), 0.36);
          float rs = max(1.2, px);
          float kerb = abs(across) - 7.4;
          light += shopCol * exp(-kerb * kerb / (rs * rs)) * (1.2 / rs) * step(0.55, front) * mix(0.72, within, 1.0 - smoothstep(1.0, 4.0, px)) * 0.22;
          // Cars: a lane each way, one every sixty metres or so, some of
          // them missing, head lamps one way and tail lamps the other.
          for (int lane = 0; lane < 2; lane++) {
            float sgn = lane == 0 ? 1.0 : -1.0;
            float h = hash12(vec2(street * 1.7 + float(k) * 31.0, float(lane)));
            if (h < 0.35) continue;
            float s = along / 60.0 + sgn * time * (9.0 + 6.0 * h) / 60.0 + h * 7.0;
            float present = step(0.3, hash12(vec2(floor(s + 0.5), street + float(lane) * 13.0)));
            float ds = abs(fract(s + 0.5) - 0.5) * 60.0;
            float dl = abs(across - sgn * 1.8);
            float rc = max(0.7, px);
            float car = exp(-(ds * ds * 0.5 + dl * dl * 1.5) / (rc * rc)) * (0.5 / (rc * rc));
            light += (lane == 0 ? vec3(1.0, 0.92, 0.8) : vec3(1.0, 0.08, 0.05)) * car * present * 2.0;
          }
        }
        return base + light;
      }

      // Searchlights from downtown and the south, sweeping slowly (the
      // south one well left of Contact's moon, which it would skewer): the
      // nearest a view ray comes to each beam, lit the more the closer, the
      // beam widening as it climbs and gone into the cloud.
      vec3 searchlights(vec3 dir, float time) {
        vec3 sum = vec3(0.0);
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec3 base = i == 0 ? vec3(-460.0, 0.0, -1500.0) : i == 1 ? vec3(420.0, 0.0, -1250.0) : vec3(-200.0, 0.0, 1000.0);
          float turn = time * (0.045 + 0.018 * fi) + fi * 2.4;
          float lean = 0.34 + 0.12 * sin(time * 0.06 + fi * 1.7);
          vec3 a = normalize(vec3(sin(turn) * lean, 1.0, cos(turn) * lean));
          vec3 w0 = uCam - base;
          float b = dot(dir, a);
          float d = dot(dir, w0);
          float e = dot(a, w0);
          float den = max(1.0 - b * b, 1e-4);
          float tau = (b * e - d) / den;
          float s = (e - b * d) / den;
          if (tau <= 0.0 || s <= 0.0) continue;
          vec3 gap = w0 + dir * tau - a * s;
          float width = 3.0 + s * 0.03;
          float core = exp(-dot(gap, gap) / (width * width));
          float height = base.y + a.y * s;
          float fade = exp(-s / 900.0) * exp(-tau * 0.00035) * (1.0 - smoothstep(${CLOUD_H - 80}.0, ${CLOUD_H + 40}.0, height));
          sum += core * fade;
        }
        return vec3(0.6, 0.68, 0.9) * sum * 0.075 * uHaze;
      }

      void main() {
        vec3 dir = normalize(vDir);
        float h = max(dir.y, 0.0);
        float time = uTime * uMotion;
        // Where this pixel's ray meets the ground, and how much ground a
        // pixel covers there, worked out before any branch so the
        // derivatives are the whole quad's.
        float tg = max(uCam.y, 0.0) / max(-dir.y, 1e-4);
        vec3 pg = uCam + dir * tg;
        float px = max(max(fwidth(pg.x), fwidth(pg.z)), 0.05);
        vec3 glow = uHazeColor * (0.55 + 0.25 * uLevel) * exp(-h * 9.0) * uHaze;
        vec3 col = vec3(0.004, 0.004, 0.007) + glow + uHazeColor * 0.08 * exp(-h * 2.5);
        // The city's light in the air, meeting the fog at the horizon: a
        // band over the roofs, brightest toward downtown.
        col += cityGlow(dir, h * 900.0) * (0.85 + 0.2 * uLevel);

        if (dir.y > 0.0) {
          // A broken deck of cloud, lit from under by the city: the glow's
          // own colour, brighter toward downtown and where it is thicker.
          // Between the clouds the sky is darker than the lit air under
          // them. Both go into the horizon's haze with distance.
          float t = (${CLOUD_H}.0 - uCam.y) / dir.y;
          vec3 p = uCam + dir * t;
          vec2 drift = vec2(time * 3.2, time * 1.1);
          vec2 c = (p.xz + drift) / 380.0;
          float n = fbm(c + 0.9 * vec2(fbm(c * 0.5 + 5.2), fbm(c * 0.5 + 1.3)));
          float cover = smoothstep(0.42, 0.72, n);
          float near = 1.0 - smoothstep(2500.0, 12000.0, t);
          vec3 under = (cityGlow(dir, 0.0) * 0.5 + uHazeColor * 0.25) * (0.3 + 0.9 * n);
          col = mix(col, col * 0.55, (1.0 - cover) * near) + under * cover * near * 0.8;
          // Lightning inside the cloud: the deck lit from within round the
          // strike, brightest where it is thickest.
          float strike = exp(-length(p.xz - uFlashAt) / 420.0);
          col += vec3(0.62, 0.64, 0.92) * uFlash * strike * (0.1 + 0.9 * cover * n) * near;
        } else if (uCam.y > 0.0) {
          // Only past the kit: anything nearer that shows the ground is a
          // gap between the kit's own pieces, and it stays dark.
          vec3 ground = streets(pg, time, px) * smoothstep(20.0, 60.0, tg);
          vec3 fogged = cityFog(ground, pg, 0.0);
          // The horizon's own band stays where the ground runs into it.
          col = mix(fogged, col, smoothstep(-0.004, 0.0, dir.y));
        }
        col += searchlights(dir, time);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  }));
  sky.material.name = "sky";
  sky.name = "sky";
  // Drawn after everything opaque: it sits on the far plane and writes no
  // depth, so the depth test throws away every pixel a building already
  // covers before its clouds and streets are worked out.
  sky.renderOrder = 10;
  sky.frustumCulled = false;
  scene.add(sky);

  return {
    mesh,
    sky,
    update(camera, pixelRatio = 1) {
      sky.position.copy(camera.position);
      beaconMat.uniforms.uPixel.value = pixelRatio;
    },
    dispose() {
      scene.remove(mesh, sky, beaconPoints, roofMesh);
      roofSet.dispose();
      roofMat.dispose();
      roofMesh.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      geometry.dispose();
      material.dispose();
      skyGeo.dispose();
      sky.material.dispose();
      mesh.dispose();
    },
  };
}
