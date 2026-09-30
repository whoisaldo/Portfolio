// src/world/towers.js: corpo row's accent light.
//
// One tower per role in experience.js, in its order, and each tower's light
// (crown_<slug> in the kit: a fin up each corner, a ring at the step, a band
// round the crown) in that organisation's own colour, the colour the
// Experience card already uses. The card being read lights its tower in
// full, with light running up the fins; the rest idle low. The tower's logo
// is src/world/logos.js, its name a vertical sign in the atlas
// (src/world/signs.js). No floor counts, no tickers.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON } from "./glsl.js";
import { toFloat } from "./merge.js";
import { towers as TOWERS } from "../data/world.js";

export function createTowers(meshes, shared, { reflectLayer = 2, anchors = new Map() } = {}) {
  // The glass (src/world/materials.js, corporate) takes each tower's colour,
  // centre and roof from here, and how lit it is every frame.
  TOWERS.forEach((tower, i) => {
    const anchor = anchors.get(`anchor_tower_${tower.slug}`);
    if (!anchor || i > 7) return;
    shared.uTowerAccent.value[i].set(tower.accent);
    shared.uTowerCentre.value[i].set(anchor.position.x, anchor.position.z);
    shared.uTowerTop.value[i] = anchor.extras?.height ?? anchor.position.y;
  });
  // One mesh for all seven crowns, one draw: each vertex carries its
  // tower's index and colour, and the lit levels are a uniform array.
  const crowns = [];
  const parts = [];
  const parent = meshes[0]?.parent ?? null;
  for (const mesh of meshes) {
    const slug = mesh.userData.tower || mesh.name.replace(/^crown_/, "");
    const tower = TOWERS.find((t) => t.slug === slug);
    if (!tower) continue;
    const i = crowns.length;
    crowns.push({ slug, lit: 0.3, order: TOWERS.indexOf(tower) });
    mesh.updateWorldMatrix(true, false);
    const g = toFloat(mesh.geometry, ["position", "uv"]);
    g.applyMatrix4(mesh.matrixWorld);
    const n = g.attributes.position.count;
    const color = new THREE.Color(tower.accent);
    const aColor = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) color.toArray(aColor, v * 3);
    g.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));
    g.setAttribute("aTower", new THREE.BufferAttribute(new Float32Array(n).fill(i), 1));
    parts.push(g);
    mesh.removeFromParent();
  }
  if (!parts.length) return { update() {}, dispose() {} };
  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) parts.forEach((g) => g.dispose());
  const lits = new Float32Array(8).fill(0.3);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uLit: { value: lits } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aTower;
      uniform float uLit[8];
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vLit;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vUv = uv;
        vColor = aColor;
        // WebGL1-safe: an array read by a loop index rather than a varying.
        float lit = 0.3;
        for (int i = 0; i < 8; i++) if (abs(float(i) - aTower) < 0.5) lit = uLit[i];
        vLit = lit;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vLit;
      void main() {
        vec3 col;
        if (vUv.x > 1.5) {
          // A line of light up the inside corner of a notch, and while its
          // card is read, light running up it.
          float run = fract(vWorld.y * 0.012 - uTime * 0.45);
          float pulse = smoothstep(0.0, 0.06, run) * smoothstep(0.3, 0.06, run);
          col = vColor * (0.18 + 2.6 * vLit) * (1.0 + 2.5 * pulse * vLit);
        } else if (vUv.x > 0.75) {
          // A blade of the crown's screen, lit from its foot (glTF counts
          // v down, so the foot is at 1).
          float foot = vUv.y;
          col = vColor * (0.08 + 1.6 * vLit) * (0.15 + 1.2 * foot * foot);
        } else {
          // A band of light with a brighter rim, top and bottom.
          float rim = smoothstep(0.2, 0.0, vUv.y) + smoothstep(0.8, 1.0, vUv.y);
          float body = 0.5 + 0.5 * rim;
          col = vColor * body * (0.25 + 3.2 * vLit);
        }
        col *= 1.0 + 0.3 * uBass * vLit;
        col = cityFog(col, vWorld, 1.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "crown";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "crowns";
  mesh.layers.enable(reflectLayer);
  if (parent) {
    // The geometry is in world space; undo the parent's placement.
    parent.updateWorldMatrix(true, false);
    mesh.matrix.copy(parent.matrixWorld).invert();
    mesh.matrixAutoUpdate = false;
    parent.add(mesh);
  }
  // Searchlights: two beams off each crown's corners in the tower's own
  // colour, sweeping slowly up into the cloud, only while its card is read
  // (they fade in with the tower's light). Cones, drawn additively and soft
  // at their edges; all fourteen are one draw.
  const beamParts = [];
  const cone = new THREE.CylinderGeometry(19, 0.6, 1, 24, 1, true).toNonIndexed();
  cone.translate(0, 0.5, 0);
  TOWERS.forEach((tower, i) => {
    const anchor = anchors.get(`anchor_tower_${tower.slug}`);
    if (!anchor || i > 7) return;
    for (const [k, sx, sz] of [[0, 1, 1], [1, -1, -1]]) {
      const g = cone.clone();
      const n = g.attributes.position.count;
      g.setAttribute("aBase", new THREE.BufferAttribute(new Float32Array(n * 3).map((_, j) => [anchor.position.x + sx * 6.5, anchor.position.y - 1.6, anchor.position.z + sz * 6.5][j % 3]), 3));
      g.setAttribute("aBeam", new THREE.BufferAttribute(new Float32Array(n * 2).map((_, j) => (j % 2 ? k : i)), 2));
      beamParts.push(g);
    }
  });
  cone.dispose();
  const beamGeo = beamParts.length ? mergeGeometries(beamParts, false) : null;
  beamParts.forEach((g) => g.dispose());
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uLength: { value: 260 } },
    vertexShader: /* glsl */ `
      attribute vec3 aBase;
      attribute vec2 aBeam;
      uniform float uTime;
      uniform float uLength;
      uniform float uTowerLit[8];
      varying float vAlong;
      varying float vLit;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vTower;
      void main() {
        float lit = 0.0;
        for (int i = 0; i < 8; i++) if (abs(float(i) - aBeam.x) < 0.5) lit = uTowerLit[i];
        vLit = smoothstep(0.35, 0.9, lit);
        vTower = aBeam.x;
        vAlong = position.y;
        // Lean out from the vertical and swing round it, each beam its own way.
        float lean = 0.32 + 0.1 * sin(uTime * 0.21 + aBeam.x * 1.7 + aBeam.y * 2.0);
        float swing = uTime * (aBeam.y > 0.5 ? -0.27 : 0.23) + aBeam.x * 0.9 + aBeam.y * 3.1;
        vec3 p = position * vec3(1.0, uLength, 1.0);
        vec3 n = normal;
        float cl = cos(lean), sl = sin(lean);
        p = vec3(p.x, p.y * cl - p.z * sl, p.y * sl + p.z * cl);
        n = vec3(n.x, n.y * cl - n.z * sl, n.y * sl + n.z * cl);
        float cs = cos(swing), ss = sin(swing);
        p = vec3(p.x * cs + p.z * ss, p.y, -p.x * ss + p.z * cs);
        n = vec3(n.x * cs + n.z * ss, n.y, -n.x * ss + n.z * cs);
        vec4 w = vec4(aBase + p, 1.0);
        vWorld = w.xyz;
        vNormalW = n;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uTowerAccent[8];
      varying float vAlong;
      varying float vLit;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vTower;
      void main() {
        if (vLit < 0.01) discard;
        vec3 accent = vec3(1.0);
        for (int i = 0; i < 8; i++) if (abs(float(i) - vTower) < 0.5) accent = uTowerAccent[i];
        vec3 V = normalize(uCam - vWorld);
        // Brightest down the beam's middle, soft to its edges, fading as it
        // climbs and gone into the cloud.
        float core = pow(abs(dot(normalize(vNormalW), V)), 3.0);
        float fade = exp(-vAlong * 3.2) * smoothstep(0.0, 0.02, vAlong);
        // Rain and dust moving through it.
        float motes = 0.8 + 0.2 * sin(vAlong * 90.0 - uTime * 3.0 + vWorld.x * 0.2);
        vec3 col = mix(accent, vec3(1.0), 0.35) * core * fade * motes * vLit * 0.38 * uHaze;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  beamMat.name = "searchlights";
  const beams = beamGeo ? new THREE.Mesh(beamGeo, beamMat) : null;
  if (beams) {
    beams.name = "searchlights";
    beams.frustumCulled = false;
    beams.renderOrder = 6;
    if (parent) {
      parent.updateWorldMatrix(true, false);
      beams.matrix.copy(parent.matrixWorld).invert();
      beams.matrixAutoUpdate = false;
      parent.add(beams);
    }
  }

  return {
    mesh,
    update(dt, activeSlugs) {
      const a = 1 - Math.exp(-dt * 5);
      crowns.forEach((c, i) => {
        const want = activeSlugs.includes(c.slug) ? 1 : 0.08;
        c.lit += (want - c.lit) * a;
        lits[i] = c.lit;
        if (c.order < 8) shared.uTowerLit.value[c.order] = c.lit;
      });
      // No beams, no draw.
      if (beams) beams.visible = crowns.some((c) => c.lit > 0.36);
    },
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
      beams?.removeFromParent();
      beamGeo?.dispose();
      beamMat.dispose();
    },
  };
}
