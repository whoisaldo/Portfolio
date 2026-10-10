// src/world/traffic-cars.js: the cars the city's streets drive.
//
// Three original designs (a compact hatch, a long low sedan, a cab-forward
// van), modelled in code with the codex-3d skill (GPT-6.1 Sol) from a brief
// written for the avenue's traffic and reviewed against its renders: lofted
// shells with their arches cut, a glasshouse set into the waist, full-width
// light bars, revolved wheels; 1,694, 1,692 and 1,800 triangles; no badge,
// no text, no brand. src/world/traffic.js merges each by material name into
// one instanced draw with its own night shader; the materials here only
// carry the names.
import * as THREE from 'three';

export const KINDS = ['hatch', 'sedan', 'van'];

const PART_NAMES = ['body', 'glass', 'lamps', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'];
export const meta = {
  name: 'Night avenue ground traffic',
  size: [7.95, 2.24, 5.30],
  sizes: { hatch: [1.76, 1.56, 3.70], sedan: [1.92, 1.36, 4.90], van: [2.04, 2.24, 5.30] },
  parts: [...KINDS, ...PART_NAMES],
  front: '+Z',
  wheelAxis: 'local X',
};

// These eight names are the city's shader/merge keys. Every mesh has one material.
const MATERIALS = Object.fromEntries([
  ['body', 0x777f89, 0.52, 0.31],
  ['trim', 0x1c222b, 0.25, 0.57],
  ['glass', 0x101d29, 0.28, 0.17],
  ['tyre', 0x111418, 0.0, 0.88],
  ['rim', 0x909da9, 0.82, 0.30],
  ['lamp_head', 0xe0f5ff, 0.10, 0.25],
  ['lamp_tail', 0xf42640, 0.10, 0.28],
  ['glow_accent', 0x20bac8, 0.15, 0.32],
].map(([name, color, metalness, roughness]) => {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
  material.name = name;
  if (name.startsWith('lamp_') || name === 'glow_accent') {
    material.emissive.setHex(color);
    material.emissiveIntensity = name === 'glow_accent' ? 1.4 : 2.3;
  }
  return [name, material];
}));

const DESIGN = {
  hatch: {
    length: 3.70, width: 1.76, height: 1.56, wheelbase: 2.45, radius: 0.31, tyreWidth: 0.19,
    sill: 0.185, belt: [[-1.85, 0.865], [-1.45, 0.925], [0.40, 0.89], [1.10, 0.845], [1.85, 0.65]],
    top: [[-1.85, 0.94], [-1.81, 1.035], [-1.50, 1.52], [-1.32, 1.56], [0.35, 1.56], [0.44, 1.515], [0.99, 0.965], [1.10, 0.905], [1.70, 0.805], [1.85, 0.72]],
    widths: [[-1.85, 0.785], [-1.70, 0.86], [-1.38, 0.88], [1.35, 0.88], [1.70, 0.85], [1.85, 0.785]],
    roofWidths: [[-1.85, 0.74], [-1.81, 0.76], [-1.50, 0.715], [-1.32, 0.715], [0.35, 0.715], [0.44, 0.735], [0.99, 0.805], [1.10, 0.81], [1.85, 0.71]],
    sideGlass: [-1.70, 0.99], pillar: [-0.33, -0.27], doorSeam: [-0.305, -0.295],
    frontGlass: [0.44, 0.99], rearGlass: [-1.81, -1.50],
    extra: [-1.70, -0.33, -0.305, -0.295, -0.27],
    head: [0.653, 0.036, 1.47], tail: [0.839, 0.045, 1.48],
    accent: [-0.76, 0.76, 0.254], mirror: [0.88, 0.98],
  },
  sedan: {
    length: 4.90, width: 1.92, height: 1.36, wheelbase: 2.95, radius: 0.34, tyreWidth: 0.215,
    sill: 0.175, belt: [[-2.45, 0.70], [-1.89, 0.805], [0.72, 0.785], [1.95, 0.755], [2.45, 0.58]],
    top: [[-2.45, 0.785], [-2.29, 0.835], [-1.89, 0.885], [-1.10, 1.265], [-0.83, 1.345], [-0.15, 1.36], [0.06, 1.315], [0.72, 0.875], [1.95, 0.805], [2.28, 0.735], [2.45, 0.655]],
    widths: [[-2.45, 0.865], [-2.29, 0.945], [-1.89, 0.96], [1.95, 0.96], [2.28, 0.94], [2.45, 0.865]],
    roofWidths: [[-2.45, 0.805], [-1.89, 0.89], [-1.10, 0.78], [-0.83, 0.765], [-0.15, 0.765], [0.06, 0.79], [0.72, 0.88], [1.95, 0.875], [2.45, 0.795]],
    sideGlass: [-1.80, 0.72], pillar: [-0.48, -0.42], doorSeam: [-0.455, -0.445],
    frontGlass: [0.06, 0.72], rearGlass: [-1.89, -1.10],
    extra: [-1.80, -0.48, -0.455, -0.445, -0.42],
    head: [0.593, 0.026, 1.66], tail: [0.709, 0.029, 1.65],
    accent: [-0.94, 0.94, 0.246], mirror: [0.60, 0.95],
  },
  van: {
    length: 5.30, width: 2.04, height: 2.24, wheelbase: 3.25, radius: 0.35, tyreWidth: 0.225,
    sill: 0.225, belt: [[-2.65, 0.91], [-2.40, 1.035], [1.84, 1.075], [2.54, 1.08], [2.65, 0.89]],
    top: [[-2.65, 2.09], [-2.57, 2.195], [-2.40, 2.24], [0.64, 2.24], [1.70, 2.24], [1.745, 2.2094642857], [1.84, 2.145], [2.47, 1.235], [2.54, 1.105], [2.65, 0.99]],
    widths: [[-2.65, 0.93], [-2.57, 1.00], [-2.40, 1.02], [1.84, 1.02], [2.47, 0.985], [2.65, 0.93]],
    roofWidths: [[-2.65, 0.89], [-2.40, 0.955], [1.70, 0.955], [1.84, 0.945], [2.47, 0.93], [2.65, 0.865]],
    sideGlass: [0.64, 2.47], pillar: [0.0, 0.0],
    frontGlass: [1.84, 2.47], rearGlass: null,
    extra: [-1.79, -1.778, 0.42, 0.432],
    head: [0.815, 0.055, 1.72], tail: null,
    accent: [-1.09, 1.09, 0.322], mirror: [2.08, 1.445],
  },
};

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const inRange = (v, range) => range && v > range[0] - 1e-8 && v < range[1] + 1e-8;
function sample(knots, z) {
  if (z <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    if (z <= knots[i][0]) return lerp(knots[i - 1][1], knots[i][1], (z - knots[i - 1][0]) / (knots[i][0] - knots[i - 1][0]));
  }
  return knots.at(-1)[1];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
const subtract = (a, b) => a.map((v, i) => v - b[i]);
function normalize(v) {
  const length = Math.hypot(...v);
  return length > 1e-12 ? v.map(x => x / length) : [0, 1, 0];
}

// A single-material triangle collector. Shared panel edges have identical coordinates;
// normals blend along each loft strip, but stay sharp across shoulder/roof creases.
class Surface {
  constructor() { this.position = []; this.normal = []; }
  triangle(a, b, c, normals) {
    const n = cross(subtract(b, a), subtract(c, a));
    if (Math.hypot(...n) < 1e-10) return;
    this.position.push(...a, ...b, ...c);
    this.normal.push(...(normals ? normals.flat() : [...normalize(n), ...normalize(n), ...normalize(n)]));
  }
  quad(a, b, c, d, normals) {
    this.triangle(a, b, c, normals && [normals[0], normals[1], normals[2]]);
    this.triangle(a, c, d, normals && [normals[0], normals[2], normals[3]]);
  }
  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normal, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
  mesh(name, materialName = name) {
    const mesh = new THREE.Mesh(this.geometry(), MATERIALS[materialName]);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

function makeShell(d) {
  const surfaces = Object.fromEntries(['body', 'trim', 'glass', 'lamp_head', 'lamp_tail', 'glow_accent'].map(k => [k, new Surface()]));
  const archR = d.radius + 0.048;
  const start = Math.asin((d.sill - d.radius) / archR);
  const arches = [-d.wheelbase / 2, d.wheelbase / 2].map(axle => {
    const points = Array.from({ length: 7 }, (_, i) => {
      const theta = lerp(start, Math.PI - start, i / 6);
      return [axle + archR * Math.cos(theta), d.radius + archR * Math.sin(theta)];
    }).sort((a, b) => a[0] - b[0]);
    points[0][1] = points.at(-1)[1] = d.sill;
    return points;
  });
  const stations = [...new Set([...d.top.map(p => p[0]), ...d.extra, ...arches.flat().map(p => p[0])])].sort((a, b) => a - b);
  function archHeight(z) {
    for (const points of arches) {
      if (inRange(z, [points[0][0], points.at(-1)[0]])) return sample(points, z);
    }
    return d.sill;
  }
  const rings = stations.map(z => {
    const width = sample(d.widths, z), roofWidth = sample(d.roofWidths, z);
    const top = sample(d.top, z), arch = archHeight(z);
    const belt = Math.min(sample(d.belt, z), top - 0.045);
    const roofEdge = top - (d === DESIGN.van ? 0.025 : 0.028);
    return [
      [0, d.sill, z], [width - 0.285, arch, z], [width - 0.024, arch, z],
      [width, belt, z], [roofWidth, roofEdge, z], [0, top, z],
      [-roofWidth, roofEdge, z], [-width, belt, z], [-width + 0.024, arch, z], [-width + 0.285, arch, z],
    ];
  });
  function point(i, edge, u) { return mix(rings[i][edge], rings[i][(edge + 1) % 10], u); }
  function normal(i, edge, u) {
    const tangent = subtract(rings[i][(edge + 1) % 10], rings[i][edge]);
    let along = [0, 0, 0];
    let count = 0;
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= stations.length) continue;
      const derivative = subtract(point(j, edge, u), point(i, edge, u)).map(v => v / (stations[j] - stations[i]));
      along = along.map((v, k) => v + derivative[k]); count++;
    }
    return normalize(cross(tangent, along.map(v => v / count)));
  }
  function strip(i, edge, u0, u1, v0, v1, material) {
    surfaces[material].quad(
      point(i, edge, u0), point(i, edge, u1), point(i + 1, edge, v1), point(i + 1, edge, v0),
      [normal(i, edge, u0), normal(i, edge, u1), normal(i + 1, edge, v1), normal(i + 1, edge, v0)],
    );
  }
  // Side strips run in opposite directions in the closed cross section.
  function sideBand(i, edge, lo0, hi0, lo1, hi1, material) {
    if (edge === 2 || edge === 3) strip(i, edge, lo0, hi0, lo1, hi1, material);
    else strip(i, edge, 1 - hi0, 1 - lo0, 1 - hi1, 1 - lo1, material);
  }
  for (let i = 0; i < stations.length - 1; i++) {
    const z = (stations[i] + stations[i + 1]) / 2;
    for (const edge of [0, 1, 8, 9]) strip(i, edge, 0, 1, 0, 1, 'trim');
    for (const edge of [2, 7]) {
      const right = edge === 2;
      const lower = [rings[i][right ? 2 : 8], rings[i + 1][right ? 2 : 8]];
      const upper = [rings[i][right ? 3 : 7], rings[i + 1][right ? 3 : 7]];
      const fractions = lower.map((p, k) => Math.min(0.55, (p[1] > d.sill + 0.005 ? 0.023 : 0.055) / (upper[k][1] - p[1])));
      sideBand(i, edge, 0, fractions[0], 0, fractions[1], 'trim');
      let material = inRange(z, d.doorSeam) ? 'trim' : 'body';
      if (d === DESIGN.van && right && (inRange(z, [-1.79, -1.778]) || inRange(z, [0.42, 0.432]))) material = 'trim';
      if (inRange(z, d.accent.slice(0, 2)) && lower.every(p => p[1] < d.accent[2] - 0.015)) {
        const a = lower.map((p, k) => (d.accent[2] - 0.006 - p[1]) / (upper[k][1] - p[1]));
        const b = lower.map((p, k) => (d.accent[2] + 0.006 - p[1]) / (upper[k][1] - p[1]));
        sideBand(i, edge, fractions[0], a[0], fractions[1], a[1], material);
        sideBand(i, edge, a[0], b[0], a[1], b[1], 'glow_accent');
        sideBand(i, edge, b[0], 1, b[1], 1, material);
      } else sideBand(i, edge, fractions[0], 1, fractions[1], 1, material);
    }
    for (const edge of [3, 6]) {
      const right = edge === 3;
      const low = [rings[i][right ? 3 : 7], rings[i + 1][right ? 3 : 7]];
      const high = [rings[i][right ? 4 : 6], rings[i + 1][right ? 4 : 6]];
      const gaps = low.map((p, k) => high[k][1] - p[1]);
      if (inRange(z, d.sideGlass) && !inRange(z, d.pillar) && gaps.every(g => g > 0.115)) {
        const bottom = gaps.map(g => 0.063 / g), top = gaps.map(g => 1 - 0.055 / g);
        sideBand(i, edge, 0, bottom[0], 0, bottom[1], 'body');
        sideBand(i, edge, bottom[0], top[0], bottom[1], top[1], 'glass');
        sideBand(i, edge, top[0], 1, top[1], 1, 'body');
      } else if (inRange(z, d.pillar) && gaps.every(g => g > 0.115)) {
        const bottom = gaps.map(g => 0.063 / g), top = gaps.map(g => 1 - 0.055 / g);
        sideBand(i, edge, 0, bottom[0], 0, bottom[1], inRange(z, d.doorSeam) ? 'trim' : 'body');
        sideBand(i, edge, bottom[0], top[0], bottom[1], top[1], 'trim');
        sideBand(i, edge, top[0], 1, top[1], 1, 'body');
      } else if (d === DESIGN.van && right && inRange(z, [-1.778, 0.432])) {
        if (inRange(z, [0.42, 0.432])) {
          sideBand(i, edge, 0, 1, 0, 1, 'trim');
        } else {
          const lo = low.map((p, k) => (1.991 - p[1]) / gaps[k]);
          const hi = low.map((p, k) => (2.003 - p[1]) / gaps[k]);
          sideBand(i, edge, 0, lo[0], 0, lo[1], 'body');
          sideBand(i, edge, lo[0], hi[0], lo[1], hi[1], 'trim');
          sideBand(i, edge, hi[0], 1, hi[1], 1, 'body');
        }
      } else {
        const slidingEdge = d === DESIGN.van && right && inRange(z, [-1.79, -1.778]);
        sideBand(i, edge, 0, 1, 0, 1, slidingEdge || inRange(z, d.pillar) ? 'trim' : 'body');
      }
    }
    for (const edge of [4, 5]) {
      if (inRange(z, d.frontGlass) || inRange(z, d.rearGlass)) {
        const margin0 = 0.058 / Math.abs(rings[i][edge === 4 ? 4 : 6][0]);
        const margin1 = 0.058 / Math.abs(rings[i + 1][edge === 4 ? 4 : 6][0]);
        if (edge === 4) {
          strip(i, edge, 0, margin0, 0, margin1, 'trim');
          strip(i, edge, margin0, 1, margin1, 1, 'glass');
        } else {
          strip(i, edge, 0, 1 - margin0, 0, 1 - margin1, 'glass');
          strip(i, edge, 1 - margin0, 1, 1 - margin1, 1, 'trim');
        }
      } else strip(i, edge, 0, 1, 0, 1, d === DESIGN.van && inRange(z, [1.70, 1.745]) ? 'lamp_head' : 'body');
    }
  }
  endCap(rings[0], false, d, surfaces);
  endCap(rings.at(-1), true, d, surfaces);
  return surfaces;
}

// Partition the end panel around actual lamp apertures and bumper insets.
// Rectangles replace the paint faces, rather than overlapping them.
function clip(poly, axis, value, keepGreater) {
  const result = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const aa = keepGreater ? a[axis] >= value - 1e-10 : a[axis] <= value + 1e-10;
    const bb = keepGreater ? b[axis] >= value - 1e-10 : b[axis] <= value + 1e-10;
    if (aa) result.push(a);
    if (aa !== bb) result.push(mix(a, b, (value - a[axis]) / (b[axis] - a[axis])));
  }
  return result;
}
function endCap(ring, front, d, surfaces) {
  let regions = [{ poly: ring.map(p => p.slice()), material: 'body' }];
  function patch(x0, x1, y0, y1, material) {
    const next = [];
    for (const region of regions) {
      let remainder = region.poly;
      for (const [axis, value, greater] of [[0, x0, true], [0, x1, false], [1, y0, true], [1, y1, false]]) {
        const outside = clip(remainder, axis, value, !greater);
        if (outside.length >= 3) next.push({ poly: outside, material: region.material });
        remainder = clip(remainder, axis, value, greater);
        if (remainder.length < 3) break;
      }
      if (remainder.length >= 3) next.push({ poly: remainder, material });
    }
    regions = next;
  }
  const half = d.width / 2;
  patch(-2, 2, 0, d === DESIGN.van ? 0.44 : 0.335, 'trim');
  if (front) {
    patch(-half + 0.19, half - 0.19, d === DESIGN.van ? 0.47 : 0.38, d === DESIGN.van ? 0.68 : 0.49, 'trim');
  }
  const lamp = front ? d.head : d.tail;
  if (lamp) {
    const [y, height, width] = lamp;
    patch(-width / 2 - 0.018, width / 2 + 0.018, y - height / 2 - 0.018, y + height / 2 + 0.018, 'trim');
    patch(-width / 2, width / 2, y - height / 2, y + height / 2, front ? 'lamp_head' : 'lamp_tail');
  }
  if (!front && d === DESIGN.van) {
    // Cargo doors: actual split, lintel, and sill seams on the rear face.
    patch(-0.835, 0.835, 1.995, 2.008, 'trim');
    patch(-0.835, 0.835, 0.51, 0.525, 'trim');
    patch(-0.007, 0.007, 0.525, 1.995, 'trim');
    for (const sign of [-1, 1]) {
      patch(sign * 0.835 - 0.006, sign * 0.835 + 0.006, 0.525, 1.995, 'trim');
    }
    for (const sign of [-1, 1]) {
      const cx = sign * 0.81;
      patch(cx - 0.111, cx + 0.111, 0.650, 0.872, 'trim');
      patch(cx - 0.089, cx + 0.089, 0.672, 0.850, 'lamp_tail');
    }
  }
  for (const { poly, material } of regions) {
    const contour = poly.map(p => new THREE.Vector2(p[0], p[1]));
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) {
      if (front) surfaces[material].triangle(poly[a], poly[b], poly[c]);
      else surfaces[material].triangle(poly[c], poly[b], poly[a]);
    }
  }
}

function wheelGeometries(d) {
  const tyre = new Surface(), rim = new Surface(), vents = new Surface();
  const n = 12, r = d.radius, w = d.tyreWidth;
  const profiles = [[-w / 2, r * 0.73], [-w * 0.32, r], [w * 0.32, r], [w / 2, r * 0.73]];
  const slopes = [[-1, 0.28], [-0.24, 1], [0.24, 1], [1, 0.28]];
  const p = (profile, i) => [profile[0], profile[1] * Math.cos(i * Math.PI * 2 / n), profile[1] * Math.sin(i * Math.PI * 2 / n)];
  const norm = (j, i) => normalize([slopes[j][0], slopes[j][1] * Math.cos(i * Math.PI * 2 / n), slopes[j][1] * Math.sin(i * Math.PI * 2 / n)]);
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < n; i++) tyre.quad(p(profiles[j], i), p(profiles[j], i + 1), p(profiles[j + 1], i + 1), p(profiles[j + 1], i), [norm(j, i), norm(j, i + 1), norm(j + 1, i + 1), norm(j + 1, i)]);
  }
  for (let i = 0; i < n; i++) tyre.quad(p(profiles[3], i), p(profiles[3], i + 1), p(profiles[0], i + 1), p(profiles[0], i));
  const rimProfile = [[w / 2 - 0.006, r * 0.73], [w / 2 - 0.026, r * 0.61], [w / 2 - 0.014, r * 0.16]];
  for (let i = 0; i < n; i++) {
    rim.quad(p(rimProfile[0], i), p(rimProfile[0], i + 1), p(rimProfile[1], i + 1), p(rimProfile[1], i));
    (i % 2 ? vents : rim).quad(p(rimProfile[1], i), p(rimProfile[1], i + 1), p(rimProfile[2], i + 1), p(rimProfile[2], i));
    rim.triangle(p(rimProfile[2], i), p(rimProfile[2], i + 1), [rimProfile[2][0], 0, 0]);
    rim.triangle(p([-w / 2 + 0.008, r * 0.73], i + 1), p([-w / 2 + 0.008, r * 0.73], i), [-w / 2 + 0.008, 0, 0]);
  }
  return { tyre: tyre.geometry(), rim: rim.geometry(), vents: vents.geometry() };
}

function mirrorPod(d, sign) {
  const [z, y] = d.mirror, width = sample(d.widths, z);
  const roofWidth = sample(d.roofWidths, z), top = sample(d.top, z) - 0.028;
  const belt = sample(d.belt, z);
  const x = lerp(width, roofWidth, THREE.MathUtils.clamp((y - belt) / (top - belt), 0, 1));
  // Small flush camera-mirror housings, with their inboard edge seated in the pillar.
  const outer = Math.min(d.width / 2 + 0.012, x + 0.075);
  const vertices = [
    [x - 0.012, y - 0.034, z - 0.09], [outer, y - 0.023, z - 0.062],
    [outer, y + 0.023, z - 0.035], [x - 0.012, y + 0.036, z - 0.066],
    [x - 0.016, y - 0.027, z + 0.105], [outer - 0.013, y - 0.019, z + 0.081],
    [outer - 0.013, y + 0.021, z + 0.070], [x - 0.016, y + 0.029, z + 0.083],
  ].map(p => [p[0] * sign, p[1], p[2]]);
  const s = new Surface();
  const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  for (let q of quads) {
    if (sign < 0) q = [...q].reverse();
    s.quad(...q.map(i => vertices[i]));
  }
  return s.mesh(sign > 0 ? 'mirror_l' : 'mirror_r', 'trim');
}

function car(kind) {
  const d = DESIGN[kind];
  const group = new THREE.Group();
  group.name = kind;
  const surfaces = makeShell(d);
  const body = surfaces.body.mesh('body'), glass = surfaces.glass.mesh('glass');
  const lamps = new THREE.Group(); lamps.name = 'lamps';
  for (const key of ['lamp_head', 'lamp_tail']) lamps.add(surfaces[key].mesh(key));
  group.add(body, glass, surfaces.trim.mesh('trim'), surfaces.glow_accent.mesh('glow_accent'), lamps);
  const parts = { [kind]: group, body, glass, lamps };
  const wheel = wheelGeometries(d);
  for (const [suffix, side, axle] of [['fl', 1, 1], ['fr', -1, 1], ['rl', 1, -1], ['rr', -1, -1]]) {
    const mesh = new THREE.Mesh(wheel.tyre, MATERIALS.tyre);
    mesh.name = 'wheel_' + suffix;
    mesh.position.set(side * (d.width / 2 - d.tyreWidth / 2 - 0.014), d.radius, axle * d.wheelbase / 2);
    if (side < 0) mesh.rotation.y = Math.PI;
    for (const [key, material] of [['rim', 'rim'], ['vents', 'trim']]) {
      const child = new THREE.Mesh(wheel[key], MATERIALS[material]);
      child.name = (key === 'vents' ? 'rim_vents_' : 'rim_') + suffix;
      child.castShadow = child.receiveShadow = true;
      mesh.add(child);
    }
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh); parts[mesh.name] = mesh;
  }
  group.add(mirrorPod(d, 1), mirrorPod(d, -1));
  group.userData.parts = parts;
  group.userData.kind = kind;
  group.userData.size = meta.sizes[kind].slice();
  group.userData.wheelbase = d.wheelbase;
  group.userData.tyreRadius = d.radius;
  group.userData.wheelAxis = 'x';
  return group;
}

export function createObject(kind) {
  if (kind !== undefined) {
    if (!KINDS.includes(kind)) throw new RangeError('Unknown traffic car kind: ' + String(kind));
    return car(kind);
  }
  const group = new THREE.Group();
  group.name = 'traffic_cars';
  group.userData.parts = {};
  for (let i = 0; i < KINDS.length; i++) {
    const variant = car(KINDS[i]);
    variant.position.x = (i - 1) * 3;
    group.add(variant);
    group.userData.parts[KINDS[i]] = variant;
  }
  return group;
}
