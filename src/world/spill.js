// src/world/spill.js: the city's light, baked from its own signs at load.
//
// Two maps over the ground plane, both computed in a few tens of
// milliseconds from the emissive geometry the GLB already carries:
//
//   spill    every emissive triangle (sign, strip, shopfront, lamp) adds its
//            colour at its feet, then the grid is blurred at two radii: a
//            tight pool under each sign and a wide wash down the street.
//            Every surface samples it (src/world/glsl.js, spillAt).
//   streaks  the same light where the hero's eye would see it mirrored in
//            the wet road, smeared along the street: a sign at height h,
//            seen from an eye at height H, reflects at H/(H+h) of the way
//            from the eye to the sign, and on rough wet asphalt that point
//            stretches into a streak running down the street, which is most
//            of what the plate's road is. Baked for the avenue, where the
//            hero looks; it is the phone tier's whole reflection, and a
//            layer under the real planar reflection on desktop.
//
// Both are 8-bit, square-root encoded (the shaders square them back), which
// keeps the soft tails of the falloff without a float texture.
import * as THREE from "three";

export const LIGHT_BOUNDS = { x0: -100, z0: -760, x1: 560, z1: 70 };
const CELL = 1.5;
// The streaks get a finer grid of their own, over the avenue only: 0.4 m
// across the street so every sign's reflection stays its own streak, a metre
// along it.
export const STREAK_BOUNDS = { x0: -24, z0: -740, x1: 24, z1: 60 };
const SX = 0.4;
const SZ = 1.0;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _ac = new THREE.Vector3();

function boxBlur(src, dst, W, H, r, horizontal) {
  const n = 2 * r + 1;
  if (horizontal) {
    for (let y = 0; y < H; y++) {
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        const row = y * W;
        for (let x = -r; x <= r; x++) sum += src[(row + Math.min(W - 1, Math.max(0, x))) * 3 + ch];
        for (let x = 0; x < W; x++) {
          dst[(row + x) * 3 + ch] = sum / n;
          const out = Math.max(0, x - r);
          const inn = Math.min(W - 1, x + r + 1);
          sum += src[(row + inn) * 3 + ch] - src[(row + out) * 3 + ch];
        }
      }
    }
  } else {
    for (let x = 0; x < W; x++) {
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        for (let y = -r; y <= r; y++) sum += src[(Math.min(H - 1, Math.max(0, y)) * W + x) * 3 + ch];
        for (let y = 0; y < H; y++) {
          dst[(y * W + x) * 3 + ch] = sum / n;
          const out = Math.max(0, y - r);
          const inn = Math.min(H - 1, y + r + 1);
          sum += src[(inn * W + x) * 3 + ch] - src[(out * W + x) * 3 + ch];
        }
      }
    }
  }
}

function blur(field, W, H, r, passes = 3) {
  const tmp = new Float32Array(field.length);
  for (let i = 0; i < passes; i++) {
    boxBlur(field, tmp, W, H, r, true);
    boxBlur(tmp, field, W, H, r, false);
  }
  return field;
}

/** A gain that puts the brightest few percent of lit cells near full scale,
 *  whatever the city's total light came to. */
function autoGain(field, target, pct = 0.985) {
  const vals = [];
  for (let i = 0; i < field.length; i += 3) {
    const v = Math.max(field[i], field[i + 1], field[i + 2]);
    if (v > 1e-5) vals.push(v);
  }
  if (!vals.length) return 1;
  vals.sort((a, b) => a - b);
  return target / vals[Math.min(vals.length - 1, Math.floor(vals.length * pct))];
}

function encode(field, W, H, gain) {
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const v = Math.min(1, field[i * 3 + ch] * gain);
      data[i * 4 + ch] = Math.round(Math.sqrt(v) * 255);
    }
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * sources: [{ mesh, color: THREE.Color (linear), intensity }]
 * Returns { spill, streaks, bounds: Vector4 for the shaders, dispose }.
 */
// Above and behind the hero's lens: from its own half a metre every
// reflection would land within a few metres of it, and these are for a
// phone that has shed its mirror, where streaks running the length of the
// avenue read better than exact ones piled up at the kerb.
const EYE = { x: 0.6, y: 2.3, z: 18 };

export function bakeLight(sources) {
  const { x0, z0, x1, z1 } = LIGHT_BOUNDS;
  const W = Math.ceil((x1 - x0) / CELL);
  const H = Math.ceil((z1 - z0) / CELL);
  const pool = new Float32Array(W * H * 3);
  const SW = Math.ceil((STREAK_BOUNDS.x1 - STREAK_BOUNDS.x0) / SX);
  const SH = Math.ceil((STREAK_BOUNDS.z1 - STREAK_BOUNDS.z0) / SZ);
  const streak = new Float32Array(SW * SH * 3);

  for (const { mesh, color, intensity } of sources) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const index = geo.index;
    const count = index ? index.count : pos.count;
    mesh.updateWorldMatrix(true, false);
    const m = mesh.matrixWorld;
    for (let i = 0; i < count; i += 3) {
      const ia = index ? index.getX(i) : i;
      const ib = index ? index.getX(i + 1) : i + 1;
      const ic = index ? index.getX(i + 2) : i + 2;
      _a.fromBufferAttribute(pos, ia).applyMatrix4(m);
      _b.fromBufferAttribute(pos, ib).applyMatrix4(m);
      _c.fromBufferAttribute(pos, ic).applyMatrix4(m);
      const area = _ab.subVectors(_b, _a).cross(_ac.subVectors(_c, _a)).length() * 0.5;
      if (area < 1e-4) continue;
      const cx = (_a.x + _b.x + _c.x) / 3;
      const cy = (_a.y + _b.y + _c.y) / 3;
      const cz = (_a.z + _b.z + _c.z) / 3;
      const gx = Math.floor((cx - x0) / CELL);
      const gz = Math.floor((cz - z0) / CELL);
      if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
      // Big boards do not light a street in proportion to their area.
      const e = intensity * Math.min(area, 6) * (cy > 30 ? 0.35 : 1);
      const k = (gz * W + gx) * 3;
      pool[k] += color.r * e;
      pool[k + 1] += color.g * e;
      pool[k + 2] += color.b * e;
      // Mirrored for the hero's eye: only the avenue and the canyon, which
      // are what that camera sees.
      if (cy > 1.0 && cy < 60 && Math.abs(cx) < 60 && cz < 0) {
        const t = EYE.y / (EYE.y + cy);
        const rx = Math.floor((EYE.x + (cx - EYE.x) * t - STREAK_BOUNDS.x0) / SX);
        const rz = Math.floor((EYE.z + (cz - EYE.z) * t - STREAK_BOUNDS.z0) / SZ);
        if (rx >= 0 && rz >= 0 && rx < SW && rz < SH) {
          const r = (rz * SW + rx) * 3;
          const s = e * Math.min(1, cy / 5);
          streak[r] += color.r * s;
          streak[r + 1] += color.g * s;
          streak[r + 2] += color.b * s;
        }
      }
    }
  }

  // The pool: a tight halo plus a wide wash.
  const tight = blur(pool.slice(), W, H, 2);
  const wide = blur(pool, W, H, 7);
  for (let i = 0; i < tight.length; i++) tight[i] = tight[i] * 0.6 + wide[i] * 0.9;

  // The streaks: a hair across the street, a long way along it, more
  // toward the eye than away from it.
  const across = new Float32Array(streak.length);
  boxBlur(streak, across, SW, SH, 1, true);
  const decay = Math.exp(-SZ / 14);
  for (let x = 0; x < SW; x++) {
    let r = 0, g = 0, b = 0;
    for (let y = 0; y < SH; y++) {
      const k = (y * SW + x) * 3;
      r = across[k] + r * decay;
      g = across[k + 1] + g * decay;
      b = across[k + 2] + b * decay;
      streak[k] = r;
      streak[k + 1] = g;
      streak[k + 2] = b;
    }
  }
  const tmp = new Float32Array(streak.length);
  boxBlur(streak, tmp, SW, SH, 3, false);
  streak.set(tmp);

  const bounds = new THREE.Vector4(x0, z0, 1 / (x1 - x0), 1 / (z1 - z0));
  const streakBounds = new THREE.Vector4(STREAK_BOUNDS.x0, STREAK_BOUNDS.z0,
    1 / (STREAK_BOUNDS.x1 - STREAK_BOUNDS.x0), 1 / (STREAK_BOUNDS.z1 - STREAK_BOUNDS.z0));
  const spill = encode(tight, W, H, autoGain(tight, 0.85));
  const streaks = encode(streak, SW, SH, autoGain(streak, 0.9, 0.995));
  return {
    spill,
    streaks,
    bounds,
    streakBounds,
    dispose() {
      spill.dispose();
      streaks.dispose();
    },
  };
}
