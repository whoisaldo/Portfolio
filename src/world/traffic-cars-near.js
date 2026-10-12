// src/world/traffic-cars-near.js: the same cars from close to.
//
// The close-up models of the three cars in traffic-cars.js, kind for kind
// the same car (its length, width, height, wheelbase, glass, lamp bars), with
// what a lens within a few metres needs: round tyres on spoked rims, arches
// with lips and liners, smooth panels with cut shut lines, lamp pockets with
// reflectors, framed glass, mirrors, wipers, a grille, number plates. Modelled
// in code with the codex-3d skill (GPT-6.1 Sol) from the mid-distance module
// as its reference; ten material names (the eight, and chrome and plate);
// no badge, no text, no brand. src/world/traffic.js draws the nearest dozen
// cars from these and paints the cabin behind the glass itself.
import * as THREE from 'three';

export const KINDS = ['hatch', 'sedan', 'van'];
const PART_NAMES = ['body', 'glass', 'lamps', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'];
export const meta = {
  name: 'Night avenue close traffic',
  size: [8.36, 2.24, 5.30],
  sizes: { hatch: [1.76, 1.56, 3.70], sedan: [1.92, 1.36, 4.90], van: [2.04, 2.24, 5.30] },
  parts: [...KINDS, ...PART_NAMES], front: '+Z', wheelAxis: 'local X',
};

// These are the city's ten opaque shader/merge keys. Glass is deliberately opaque.
const MATERIALS = {};
for (const [name, color, metalness, roughness] of [
  ['body', 0x777f89, 0.48, 0.25], ['trim', 0x1c222b, 0.12, 0.72],
  ['glass', 0x101d29, 0.16, 0.12], ['tyre', 0x111418, 0, 0.88],
  ['rim', 0x909da9, 0.9, 0.27], ['lamp_head', 0xe0f5ff, 0.1, 0.24],
  ['lamp_tail', 0xf42640, 0.1, 0.26], ['glow_accent', 0x20bac8, 0.12, 0.30],
  ['chrome', 0xc8d0d8, 1, 0.18], ['plate', 0xd8d2bc, 0, 0.86],
]) {
  const options = { color, metalness, roughness };
  const m = name === 'body' || name === 'glass'
    ? new THREE.MeshPhysicalMaterial({ ...options, clearcoat: name === 'body' ? 0.92 : 1, clearcoatRoughness: 0.12 })
    : new THREE.MeshStandardMaterial(options);
  m.name = name;
  if (['lamp_head', 'lamp_tail', 'glow_accent'].includes(name)) {
    m.emissive.setHex(color); m.emissiveIntensity = name === 'glow_accent' ? 1.4 : 2.3;
  }
  MATERIALS[name] = m;
}

// Reference DESIGN controls, unmodified. Extra close-up controls are kept separately.
const DESIGN = {
  hatch: {
    length: 3.70, width: 1.76, height: 1.56, wheelbase: 2.45, radius: 0.31, tyreWidth: 0.19,
    sill: 0.185, belt: [[-1.85, 0.865], [-1.45, 0.925], [0.40, 0.89], [1.10, 0.845], [1.85, 0.65]],
    top: [[-1.85, 0.94], [-1.81, 1.035], [-1.50, 1.52], [-1.32, 1.56], [0.35, 1.56], [0.44, 1.515], [0.99, 0.965], [1.10, 0.905], [1.70, 0.805], [1.85, 0.72]],
    widths: [[-1.85, 0.785], [-1.70, 0.86], [-1.38, 0.88], [1.35, 0.88], [1.70, 0.85], [1.85, 0.785]],
    roofWidths: [[-1.85, 0.74], [-1.81, 0.76], [-1.50, 0.715], [-1.32, 0.715], [0.35, 0.715], [0.44, 0.735], [0.99, 0.805], [1.10, 0.81], [1.85, 0.71]],
    sideGlass: [-1.70, 0.99], pillar: [-0.33, -0.27], doorSeam: [-0.305, -0.295],
    frontGlass: [0.44, 0.99], rearGlass: [-1.81, -1.50], extra: [-1.70, -0.33, -0.305, -0.295, -0.27],
    head: [0.653, 0.036, 1.47], tail: [0.839, 0.045, 1.48], accent: [-0.76, 0.76, 0.254], mirror: [0.88, 0.98],
  },
  sedan: {
    length: 4.90, width: 1.92, height: 1.36, wheelbase: 2.95, radius: 0.34, tyreWidth: 0.215,
    sill: 0.175, belt: [[-2.45, 0.70], [-1.89, 0.805], [0.72, 0.785], [1.95, 0.755], [2.45, 0.58]],
    top: [[-2.45, 0.785], [-2.29, 0.835], [-1.89, 0.885], [-1.10, 1.265], [-0.83, 1.345], [-0.15, 1.36], [0.06, 1.315], [0.72, 0.875], [1.95, 0.805], [2.28, 0.735], [2.45, 0.655]],
    widths: [[-2.45, 0.865], [-2.29, 0.945], [-1.89, 0.96], [1.95, 0.96], [2.28, 0.94], [2.45, 0.865]],
    roofWidths: [[-2.45, 0.805], [-1.89, 0.89], [-1.10, 0.78], [-0.83, 0.765], [-0.15, 0.765], [0.06, 0.79], [0.72, 0.88], [1.95, 0.875], [2.45, 0.795]],
    sideGlass: [-1.80, 0.72], pillar: [-0.48, -0.42], doorSeam: [-0.455, -0.445],
    frontGlass: [0.06, 0.72], rearGlass: [-1.89, -1.10], extra: [-1.80, -0.48, -0.455, -0.445, -0.42],
    head: [0.593, 0.026, 1.66], tail: [0.709, 0.029, 1.65], accent: [-0.94, 0.94, 0.246], mirror: [0.60, 0.95],
  },
  van: {
    length: 5.30, width: 2.04, height: 2.24, wheelbase: 3.25, radius: 0.35, tyreWidth: 0.225,
    sill: 0.225, belt: [[-2.65, 0.91], [-2.40, 1.035], [1.84, 1.075], [2.54, 1.08], [2.65, 0.89]],
    top: [[-2.65, 2.09], [-2.57, 2.195], [-2.40, 2.24], [0.64, 2.24], [1.70, 2.24], [1.745, 2.2094642857], [1.84, 2.145], [2.47, 1.235], [2.54, 1.105], [2.65, 0.99]],
    widths: [[-2.65, 0.93], [-2.57, 1.00], [-2.40, 1.02], [1.84, 1.02], [2.47, 0.985], [2.65, 0.93]],
    roofWidths: [[-2.65, 0.89], [-2.40, 0.955], [1.70, 0.955], [1.84, 0.945], [2.47, 0.93], [2.65, 0.865]],
    sideGlass: [0.64, 2.47], pillar: [0, 0], frontGlass: [1.84, 2.47], rearGlass: null,
    extra: [-1.79, -1.778, 0.42, 0.432], head: [0.815, 0.055, 1.72], tail: null,
    accent: [-1.09, 1.09, 0.322], mirror: [2.08, 1.445],
  },
};
const DETAIL = {
  hatch: { doors: [-0.86, -0.30, 0.86], foot: 0.26, waist: 0.88, plates: [0.26, 0.56, 0.24], fuel: [-1.56, 0.75, 0.14, 0.12] },
  sedan: { doors: [-1.08, -0.45, 1.05], foot: 0.25, waist: 0.78, plates: [0.26, 0.50, 0.26], fuel: [-2.02, 0.715, 0.14, 0.10] },
  van: { doors: [-1.79, 0.42, 1.80], foot: 0.30, waist: 1.07, plates: [0.33, 0.33, 0.26], fuel: [-0.78, 0.94, 0.15, 0.12] },
};
const EPS = 1e-8;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const scale = (a, s) => a.map(v => v * s);
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const unit = a => scale(a, 1 / (Math.hypot(...a) || 1));
const inRange = (z, a) => a && z >= a[0] - EPS && z <= a[1] + EPS;

// Monotone Hermite curves retain every DESIGN knot and never overshoot a plateau.
const CURVES = new WeakMap();
function spline(knots, z) {
  let slopes = CURVES.get(knots);
  if (!slopes) {
    const secants = knots.slice(1).map((p, i) => (p[1] - knots[i][1]) / (p[0] - knots[i][0]));
    slopes = knots.map((p, i) => {
      if (!i) return secants[0];
      if (i === knots.length - 1) return secants.at(-1);
      const a = secants[i - 1], b = secants[i];
      if (a * b <= 0) return 0;
      const ha = p[0] - knots[i - 1][0], hb = knots[i + 1][0] - p[0];
      const wa = 2 * hb + ha, wb = hb + 2 * ha;
      return (wa + wb) / (wa / a + wb / b);
    });
    CURVES.set(knots, slopes);
  }
  if (z <= knots[0][0]) return knots[0][1];
  if (z >= knots.at(-1)[0]) return knots.at(-1)[1];
  let i = 0;
  while (z > knots[i + 1][0]) i++;
  const h = knots[i + 1][0] - knots[i][0], t = (z - knots[i][0]) / h;
  return (2 * t ** 3 - 3 * t ** 2 + 1) * knots[i][1] + (t ** 3 - 2 * t ** 2 + t) * h * slopes[i]
    + (-2 * t ** 3 + 3 * t ** 2) * knots[i + 1][1] + (t ** 3 - t ** 2) * h * slopes[i + 1];
}

class Surface {
  constructor() { this.positions = []; this.normals = []; }
  tri(a, b, c, ns, expected) {
    let n = cross(sub(b, a), sub(c, a));
    if (Math.hypot(...n) < 1e-11) return;
    if (expected && dot(n, expected) < 0) { [b, c] = [c, b]; if (ns) ns = [ns[0], ns[2], ns[1]]; n = scale(n, -1); }
    this.positions.push(...a, ...b, ...c);
    this.normals.push(...(ns ? ns.flat() : [...unit(n), ...unit(n), ...unit(n)]));
  }
  quad(a, b, c, d, ns, expected) {
    this.tri(a, b, c, ns && [ns[0], ns[1], ns[2]], expected);
    this.tri(a, c, d, ns && [ns[0], ns[2], ns[3]], expected);
  }
  polygon(points, normals, expected) {
    for (let i = 1; i + 1 < points.length; i++) this.tri(points[0], points[i], points[i + 1], normals && [normals[0], normals[i], normals[i + 1]], expected);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.computeBoundingSphere(); return g;
  }
  mesh(name, material = name) {
    const m = new THREE.Mesh(this.geometry(), MATERIALS[material]);
    m.name = name; m.castShadow = m.receiveShadow = true; return m;
  }
}

// Convex clipping in panel coordinates: openings replace paint, rather than cover it.
function clipLine(poly, a, b, inside) {
  const value = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const result = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], vp = value(p), vq = value(q);
    const ip = inside ? vp >= -EPS : vp <= EPS, iq = inside ? vq >= -EPS : vq <= EPS;
    if (ip) result.push(p);
    if (ip !== iq) result.push(mix(p, q, vp / (vp - vq)));
  }
  return result;
}
function partition(poly, contour) {
  const area = p => Math.abs(p.reduce((sum, a, i) => { const b = p[(i + 1) % p.length]; return sum + a[0] * b[1] - a[1] * b[0]; }, 0)) / 2;
  const clean = p => p.filter((a, i) => {
    const b = p[(i + 1) % p.length], c = p[(i + p.length - 1) % p.length];
    return Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-9 && Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[1] - c[1]) * (b[0] - a[0])) > 1e-11;
  });
  let intersection = poly;
  for (let i = 0; i < contour.length && intersection.length >= 3; i++) intersection = clipLine(intersection, contour[i], contour[(i + 1) % contour.length], true);
  intersection = clean(intersection);
  if (intersection.length < 3 || area(intersection) < 1e-10) return { outside: [poly], inside: [] };
  if (Math.abs(area(poly) - area(intersection)) < 1e-10) return { outside: [], inside: poly };
  // Clip by the actual intersection, so distant extensions of the aperture's
  // edges do not needlessly subdivide an otherwise intact panel.
  const outside = []; let inner = poly;
  for (let i = 0; i < intersection.length && inner.length >= 3; i++) {
    const a = intersection[i], b = intersection[(i + 1) % intersection.length];
    const rest = clean(clipLine(inner, a, b, false));
    if (rest.length >= 3 && area(rest) > 1e-10) outside.push(rest);
    inner = clipLine(inner, a, b, true);
  }
  return { outside, inside: intersection };
}
function rect(a, b, c, d) { return [[a, c], [b, c], [b, d], [a, d]]; }
function roundRect(cx, cy, w, h, r) {
  return [[cx - w / 2 + r, cy - h / 2], [cx + w / 2 - r, cy - h / 2],
    [cx + w / 2, cy - h / 2 + r], [cx + w / 2, cy + h / 2 - r],
    [cx + w / 2 - r, cy + h / 2], [cx - w / 2 + r, cy + h / 2],
    [cx - w / 2, cy + h / 2 - r], [cx - w / 2, cy - h / 2 + r]];
}
function overlap(poly, contour) {
  const bounds = p => [Math.min(...p.map(a => a[0])), Math.max(...p.map(a => a[0])), Math.min(...p.map(a => a[1])), Math.max(...p.map(a => a[1]))];
  const a = bounds(poly), b = bounds(contour);
  return a[0] < b[1] - EPS && a[1] > b[0] + EPS && a[2] < b[3] - EPS && a[3] > b[2] + EPS;
}

const PROFILE_CACHE = new WeakMap();
function profile(d, z) {
  let cache = PROFILE_CACHE.get(d);
  if (!cache) { cache = new Map(); PROFILE_CACHE.set(d, cache); }
  if (cache.has(z)) return cache.get(z);
  const w = spline(d.widths, z), rw = spline(d.roofWidths, z), top = spline(d.top, z);
  const belt = Math.min(spline(d.belt, z), top - 0.045), edge = top - (d === DESIGN.van ? 0.025 : 0.028);
  const result = { w, rw, top, belt, edge, gap: edge - belt };
  cache.set(z, result); return result;
}
function warpZ(d, z, x) {
  const q = clamp((Math.abs(z) - d.length / 2 + 0.10) / 0.10, 0, 1);
  return z - Math.sign(z) * 0.014 * q * q * (Math.abs(x) / profile(d, z).w) ** 8;
}
function sidePoint(d, side, z, y, upper) {
  const p = profile(d, z);
  let x;
  if (!upper) {
    const t = clamp((y - d.sill) / (p.belt - d.sill), 0, 1);
    x = p.w - 0.024 + 0.024 * t + 0.006 * Math.sin(Math.PI * t);
  } else {
    const t = clamp((y - p.belt) / p.gap, 0, 1), bend = clamp((y - p.edge + 0.04) / 0.04, 0, 1);
    x = lerp(p.w, p.rw, t) + 0.006 * Math.sin(Math.PI * t) - 0.014 * bend * bend;
    y += 0.010 * bend * bend;
  }
  return [side * x, y, warpZ(d, z, x)];
}
function sideNormal(d, side, z, y, upper) {
  const e = 0.0001, dz = sub(sidePoint(d, side, z + e, y, upper), sidePoint(d, side, z - e, y, upper));
  const dy = sub(sidePoint(d, side, z, y + e, upper), sidePoint(d, side, z, y - e, upper));
  let n = unit(cross(dy, dz));
  if (side < 0) n = scale(n, -1);
  const p = profile(d, z);
  if (upper && y > p.edge - 0.015) {
    const t = clamp((y - p.edge + 0.015) / 0.015, 0, 1);
    n = unit(mix(n, unit([side * 0.22, 1, 0]), t * 0.62));
  }
  return n;
}
function roofPoint(d, z, u) {
  const p = profile(d, z), x = (p.rw - 0.014) * u, crown = (d === DESIGN.van ? 0.025 : 0.028) - 0.010;
  return [x, p.top - crown * u * u, warpZ(d, z, x)];
}
function roofNormal(d, z, u) {
  const e = 0.0001;
  return unit(cross(sub(roofPoint(d, z + e, u), roofPoint(d, z - e, u)), sub(roofPoint(d, z, u + e), roofPoint(d, z, u - e))));
}
function lowerRows(d, det, z) {
  const p = profile(d, z);
  return [d.sill, det.foot - 0.004, det.foot + 0.004, lerp(det.foot + 0.004, p.belt, 0.53), p.belt];
}
function upperRows(d, z) {
  const p = profile(d, z), g = p.gap;
  const basic = [p.belt, p.belt + Math.min(0.050, g * 0.42), p.belt + Math.min(0.063, g * 0.49),
    p.edge - Math.min(0.055, g * 0.49), p.edge - Math.min(0.042, g * 0.42), p.edge];
  if (d !== DESIGN.van || z >= 0.64) return basic;
  const cargo = [p.belt, 1.208, 1.22, 1.84, 1.852, p.edge];
  return mix(cargo, basic, clamp((z - 0.50) / 0.14, 0, 1));
}
function roofRows(d, z) {
  const p = profile(d, z), seal = (p.rw - 0.058) / (p.rw - 0.014);
  return [-1, -seal, -0.50, 0, 0.50, seal, 1];
}
// Keep every control and aperture edge. Long, nearly planar strips can use one
// quad when their deviation is below 0.6 mm; changing silhouettes stay dense.
function simplifyPath(path, pointFns, tolerance = 0.0006) {
  const samples = pointFns.map(fn => path.map(fn));
  const result = [path[0]];
  let i = 0;
  while (i + 1 < path.length) {
    let j = i + 1;
    while (j + 1 < path.length) {
      let straight = true;
      for (const points of samples) {
        const a = points[i], b = points[j + 1];
        for (let n = i + 1; n <= j; n++) {
          if (Math.hypot(...sub(points[n], mix(a, b, (path[n] - path[i]) / (path[j + 1] - path[i])))) > tolerance) { straight = false; break; }
        }
        if (!straight) break;
      }
      if (!straight) break;
      j++;
    }
    result.push(path[j]); i = j;
  }
  return result;
}
function boundaryPath(zs, anchors, pointFn, tolerance = 0.0006) {
  const ends = [...new Set([zs[0], ...anchors.filter(z => z > zs[0] && z < zs.at(-1)), zs.at(-1)])].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i + 1 < ends.length; i++) {
    const a = ends[i], b = ends[i + 1];
    const path = simplifyPath([a, ...zs.filter(z => z > a + EPS && z < b - EPS), b], [pointFn], tolerance);
    result.push(...path.slice(0, -1));
  }
  result.push(ends.at(-1)); return result;
}
// Unequal sampling on the two shared boundaries, joined without T junctions.
function zipper(path0, path1, point0, point1, emit) {
  let i = 0, j = 0;
  while (i + 1 < path0.length || j + 1 < path1.length) {
    const a = point0(path0[i]), d = point1(path1[j]);
    const za = i + 1 < path0.length ? path0[i + 1] : Infinity, zb = j + 1 < path1.length ? path1[j + 1] : Infinity;
    if (Math.abs(za - zb) < EPS) { emit([a, point0(za), point1(zb), d]); i++; j++; }
    else if (za < zb) { emit([a, point0(za), d]); i++; }
    else { emit([a, point1(zb), d]); j++; }
  }
}
function intervalPath(path, a, b) { return [a, ...path.filter(z => z > a + EPS && z < b - EPS), b]; }
function archContours(d) {
  const r = d.radius + 0.048, start = Math.asin((d.sill - d.radius) / r);
  return [-d.wheelbase / 2, d.wheelbase / 2].map(z => {
    // Counterclockwise in (z,y); the last edge closes at the rocker.
    const pts = Array.from({ length: 13 }, (_, i) => {
      const a = lerp(start, Math.PI - start, i / 12);
      return [z + r * Math.cos(a), d.radius + r * Math.sin(a)];
    });
    pts[0][1] = pts.at(-1)[1] = d.sill; return pts;
  });
}
function makeStations(d, detail) {
  const keys = [...d.belt, ...d.top, ...d.widths, ...d.roofWidths].map(p => p[0]);
  keys.push(...d.extra, ...d.sideGlass, ...d.frontGlass, ...(d.rearGlass || []), ...d.accent.slice(0, 2));
  for (const a of [d.sideGlass, d.frontGlass, d.rearGlass, d.pillar]) if (a && a[1] > a[0]) keys.push(a[0] + 0.012, a[1] - 0.012);
  for (const z of detail.doors) keys.push(z - 0.004, z + 0.004);
  if (d === DESIGN.van) keys.push(-2.30, -2.288, -1.362, -1.338, -0.412, -0.388, 0.488, 0.50, 0.64);
  // Insert where the low noses extinguish the side glazing.
  for (let z = -d.length / 2; z < d.length / 2; z += 0.025) {
    if ((profile(d, z).gap - 0.118) * (profile(d, z + 0.025).gap - 0.118) < 0) {
      let a = z, b = z + 0.025;
      for (let i = 0; i < 16; i++) { const c = (a + b) / 2; if ((profile(d, a).gap - 0.118) * (profile(d, c).gap - 0.118) <= 0) b = c; else a = c; }
      keys.push((a + b) / 2);
    }
  }
  const ordered = [...new Set(keys.map(z => Number(z.toFixed(8))))].sort((a, b) => a - b);
  const stations = [];
  for (let i = 0; i + 1 < ordered.length; i++) {
    const a = ordered[i], b = ordered[i + 1], n = Math.max(1, Math.ceil((b - a) / 0.119));
    for (let j = 0; j < n; j++) stations.push(lerp(a, b, j / n));
  }
  stations.push(ordered.at(-1)); return stations;
}

function makeShell(d, k) {
  const det = DETAIL[k], s = Object.fromEntries(['body', 'trim', 'glass', 'lamp_head', 'lamp_tail', 'glow_accent', 'chrome'].map(n => [n, new Surface()]));
  const samplingTolerance = k === 'sedan' ? 0.0020 : k==='hatch'?0.0010:0.0006;
  const arches = archContours(d), zs = makeStations(d, det);
  const doorMin = det.doors[0], doorMax = det.doors.at(-1);
  const isSeam = z => det.doors.some(e => Math.abs(z - e) < 0.004 + EPS);
  const isCabGlass = z => inRange(z, [d.sideGlass[0] + 0.012, d.sideGlass[1] - 0.012]) && !inRange(z, d.pillar) && profile(d, z).gap >= 0.118 - EPS;
  const isVanWindow = z => d === DESIGN.van && inRange(z, [-2.288, 0.488]) && !inRange(z, [-1.362, -1.338]) && !inRange(z, [-0.412, -0.388]);
  function mappedSide(side,z,y,upper) {
    if(!upper)for(const arc of arches)for(let i=0;i+1<arc.length;i++) {
      const a=arc[i],b=arc[i+1],dz=b[0]-a[0],dy=b[1]-a[1],t=((z-a[0])*dz+(y-a[1])*dy)/(dz*dz+dy*dy);
      if(t>=-EPS&&t<=1+EPS&&Math.abs(z-a[0]-t*dz)<1e-7&&Math.abs(y-a[1]-t*dy)<1e-7)
        return mix(sidePoint(d,side,...a,false),sidePoint(d,side,...b,false),t);
    }
    return sidePoint(d,side,z,y,upper);
  }
  const handles = det.doors.slice(0, 2).map(back => ({ z: back + 0.15, y: det.waist - 0.10 }));
  const stats = {};
  const snapshot = label => { stats[label] = Object.fromEntries(Object.entries(s).map(([key, value]) => [key, value.positions.length / 9])); };
  const holes = [{ contour: roundRect(...det.fuel, 0.012), inner: roundRect(det.fuel[0], det.fuel[1], det.fuel[2] - 0.016, det.fuel[3] - 0.016, 0.009), type: 'fuel' },
    ...handles.map(h => ({ contour: roundRect(h.z, h.y, 0.192, 0.036, 0.010), type: 'handle' }))];
  function paint(poly, side, upper, material, depth = 0) {
    if (poly.length < 3) return;
    const ns = poly.map(([z, y]) => sideNormal(d, side, z, y, upper));
    const pts = poly.map(([z, y], i) => sub(mappedSide(side,z,y,upper), scale(ns[i], depth)));
    s[material].polygon(pts, ns, [side, 0, 0]);
  }
  function lowerPanel(poly, side, material, depth) {
    let polys = [poly];
    for (const arch of arches) {
      const next = [];
      for (const p of polys) next.push(...(overlap(p, arch) ? partition(p, arch).outside : [p]));
      polys = next;
    }
    for (const hole of holes) {
      const next = [];
      for (const p of polys) {
        if (!overlap(p, hole.contour)) { next.push(p); continue; }
        const parts = partition(p, hole.contour); next.push(...parts.outside);
        if (hole.inner) {
          const flap = partition(parts.inside, hole.inner);
          flap.outside.forEach(q => paint(q, side, false, 'trim', 0.004));
          paint(flap.inside, side, false, 'body');
        } else paint(parts.inside, side, false, 'trim', 0.005);
      }
      polys = next;
    }
    polys.forEach(p => paint(p, side, false, material, depth));
  }
  // A wall of a recessed panel. The two edges share exact surface coordinates.
  function sideWall(a, b, side, upper, depth, target = s.trim) {
    const na = sideNormal(d, side, ...a, upper), nb = sideNormal(d, side, ...b, upper);
    const pa = mappedSide(side,...a,upper), pb = mappedSide(side,...b,upper);
    target.quad(pa, sub(pa, scale(na, depth)), sub(pb, scale(nb, depth)), pb, null, [0, b[0]-a[0], a[1]-b[1]]);
  }
  function grooveWalls(a, b, side) {
    // Clip segments at the actual arch contour so door cuts do not bridge wells.
    let ranges = [[0, 1]];
    for (const arc of arches) {
      let lo = 0, hi = 1;
      for (let i = 0; i < arc.length; i++) {
        const p = arc[i], q = arc[(i + 1) % arc.length];
        const val = v => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]);
        const va = val(a), vb = val(b), slope = vb - va;
        if (Math.abs(slope) < 1e-10) { if (va < 0) { lo = 1; hi = 0; break; } }
        else if (slope > 0) lo = Math.max(lo, -va / slope); else hi = Math.min(hi, -va / slope);
      }
      if (lo < hi) ranges = ranges.flatMap(([c, e]) => [[c, Math.min(e, lo)], [Math.max(c, hi), e]].filter(([u, v]) => v > u + EPS));
    }
    for (const [a0, b0] of ranges) sideWall(mix(a, b, a0), mix(a, b, b0), side, false, 0.004);
  }

  // The boundaries are shared; a zipper joins different sampling densities.
  // This spends geometry on curvature rather than on the lengths of narrow seals.
  const seamBreaks = det.doors.flatMap(z => [z - 0.004, z + 0.004]);
  const lowerBreaks = [...new Set([zs[0], ...seamBreaks, zs.at(-1)])].sort((a,b) => a-b);
  const sideBreaks = [...new Set([zs[0], ...d.sideGlass.map((z,i) => z + (i ? -0.012 : 0.012)), ...d.pillar,
    ...(k === 'van' ? [-2.30,-2.288,-1.362,-1.338,-0.412,-0.388,0.488,0.50,0.64] : []),
    ...zs.filter(z => Math.abs(profile(d,z).gap - 0.118) < 0.000001), zs.at(-1)])].sort((a,b) => a-b);
  const roofBreaks = [zs[0], ...[d.frontGlass,d.rearGlass].filter(Boolean).flatMap(r => [r[0],r[0]+0.012,r[1]-0.012,r[1]]), ...(k === 'van' ? [1.70,1.745] : []), zs.at(-1)].sort((a,b)=>a-b);
  const lowerPaths = Array.from({length:5}, (_,row) => boundaryPath(zs,
    row === 4 ? [...seamBreaks,...sideBreaks] : row ? lowerBreaks : [...lowerBreaks,...d.widths.map(p=>p[0]),...arches.flatMap(a=>[a[0][0],a.at(-1)[0]])],
    z => sidePoint(d,1,z,lowerRows(d,det,z)[row],false),samplingTolerance));
  const upperPaths = Array.from({length:6}, (_,row) => row === 0 ? lowerPaths[4] : boundaryPath(zs,
    row === 5 ? roofBreaks : sideBreaks, z => sidePoint(d,1,z,upperRows(d,z)[row],true),samplingTolerance));
  // Thin converging strips need matching samples if a long zipper triangle
  // would fold across its neighbour. Insert only the offending station.
  for(let pass=0;pass<8;pass++) {
    let changed=false;
    for(let row=0;row<5;row++)for(let n=0;n+1<sideBreaks.length;n++) {
      const a=sideBreaks[n],b=sideBreaks[n+1],additions=[];
      zipper(intervalPath(upperPaths[row],a,b),intervalPath(upperPaths[row+1],a,b),
        z=>[z,upperRows(d,z)[row]],z=>[z,upperRows(d,z)[row+1]],poly=>{
          if(poly.length!==3)return;
          const points=poly.map(v=>sidePoint(d,1,...v,true)),ns=poly.map(v=>sideNormal(d,1,...v,true));
          let face=cross(sub(points[1],points[0]),sub(points[2],points[0]));if(face[0]<0)face=scale(face,-1);
          if(dot(unit(face),unit(ns.reduce((s,v)=>add(s,v),[0,0,0])))<0.15) {
            const lo=Math.min(...poly.map(v=>v[0])),hi=Math.max(...poly.map(v=>v[0]));
            const target=(lo+hi)/2, candidates=zs.filter(z=>z>lo+EPS&&z<hi-EPS);
            if(candidates.length)additions.push(candidates.reduce((best,z)=>Math.abs(z-target)<Math.abs(best-target)?z:best));
          }
        });
      for(const z of additions)for(const path of [upperPaths[row],upperPaths[row+1]])if(!path.some(v=>Math.abs(v-z)<EPS)){path.push(z);path.sort((a,b)=>a-b);changed=true;}
    }
    if(!changed)break;
  }
  const floorAnchors=[zs[0],...arches.flatMap(a=>[a[0][0],a.at(-1)[0]]),zs.at(-1)].sort((a,b)=>a-b),floorZs=[];
  for(let i=0;i+1<floorAnchors.length;i++) {
    const a=floorAnchors[i],b=floorAnchors[i+1];
    const path=simplifyPath(intervalPath(lowerPaths[0],a,b),[0.285,0.024].map(offset=>z=>{
      const x=profile(d,z).w-offset;return[x,d.sill,warpZ(d,z,x)];
    }),1e-9);floorZs.push(...path.slice(0,-1));
  }
  floorZs.push(zs.at(-1));
  for (const side of [-1, 1]) {
    for (let row=0;row<4;row++) for (let n=0;n+1<lowerBreaks.length;n++) {
      const a=lowerBreaks[n],b=lowerBreaks[n+1],mid=(a+b)/2;
      const cut = (row > 0 && isSeam(mid)) || (row === 1 && inRange(mid,[doorMin,doorMax]));
      const material = cut ? 'trim' : row < 2 ? 'trim' : 'body';
      zipper(intervalPath(lowerPaths[row],a,b),intervalPath(lowerPaths[row+1],a,b),
        z=>[z,lowerRows(d,det,z)[row]],z=>[z,lowerRows(d,det,z)[row+1]],
        poly=>lowerPanel(poly,side,material,cut?0.004:0));
    }
    for (let row=0;row<5;row++) for (let n=0;n+1<sideBreaks.length;n++) {
      const a=sideBreaks[n],b=sideBreaks[n+1],mid=(a+b)/2;
      const window=isCabGlass(mid)||isVanWindow(mid), glass=row===2&&window;
      const seal=row>=1&&row<=3&&(window||inRange(mid,d.pillar)||(k==='van'&&mid<0.52&&mid>-2.30));
      zipper(intervalPath(upperPaths[row],a,b),intervalPath(upperPaths[row+1],a,b),
        z=>[z,upperRows(d,z)[row]],z=>[z,upperRows(d,z)[row+1]],
        poly=>paint(poly,side,true,glass?'glass':seal?'trim':'body',glass?0.010:0));
      if (glass) {
        for (const edge of [row,row+1]) {
          const path=intervalPath(upperPaths[edge],a,b);
          for(let i=0;i+1<path.length;i++) {
            const p=[path[i],upperRows(d,path[i])[edge]],q=[path[i+1],upperRows(d,path[i+1])[edge]];
            sideWall(...(edge===row?[p,q]:[q,p]),side,true,0.010);
          }
        }
        if(!(isCabGlass(a-0.00001)||isVanWindow(a-0.00001))) sideWall([a,upperRows(d,a)[row+1]],[a,upperRows(d,a)[row]],side,true,0.010);
        if(!(isCabGlass(b+0.00001)||isVanWindow(b+0.00001))) sideWall([b,upperRows(d,b)[row]],[b,upperRows(d,b)[row+1]],side,true,0.010);
      }
    }
    for (const row of [1,2]) {
      const path=intervalPath(lowerPaths[row],doorMin-0.004,doorMax+0.004);
      for(let i=0;i+1<path.length;i++) {
        if(row===2&&isSeam((path[i]+path[i+1])/2))continue;
        const p=[path[i],lowerRows(d,det,path[i])[row]],q=[path[i+1],lowerRows(d,det,path[i+1])[row]];
        grooveWalls(...(row===1?[p,q]:[q,p]),side);
      }
    }
    for (const z of det.doors) for (const e of [-0.004, 0.004]) {
      const p = profile(d, z + e), y0 = det.foot + ((z===doorMin&&e<0)||(z===doorMax&&e>0)?-0.004:0.004), y1 = lerp(det.foot+0.004, p.belt, 0.53);
      for(const [a,b] of [[[z+e,y0],[z+e,y1]],[[z+e,y1],[z+e,p.belt]]]) grooveWalls(...(e<0?[b,a]:[a,b]),side);
    }
    for (const hole of holes) {
      for (const contour of [hole.contour, hole.inner].filter(Boolean)) for (let i = 0; i < contour.length; i++) {
        const a=contour[i],b=contour[(i+1)%contour.length];
        sideWall(...(contour===hole.inner?[b,a]:[a,b]),side,false,hole.type==='handle'?0.005:0.004);
      }
    }
    // Roll the wheel-opening edge 25 mm inward, then close the entire wheel well.
    for (const arc of arches) {
      const outer = arc.map(([z, y]) => sidePoint(d, side, z, y, false));
      const roll = outer.map(p => [p[0] - side * 0.025, p[1] + 0.006, p[2]]);
      const inner = arc.map(([z, y]) => [side * (profile(d, z).w - 0.285), y, warpZ(d, z, profile(d, z).w - 0.285)]);
      for (let i = 0; i + 1 < arc.length; i++) {
        const axle=(arc[0][0]+arc.at(-1)[0])/2;
        const c0=unit([0,d.radius-arc[i][1],axle-arc[i][0]]),c1=unit([0,d.radius-arc[i+1][1],axle-arc[i+1][0]]),expected=unit(add(c0,c1));
        const n0=unit(add(sideNormal(d,side,...arc[i],false),c0)),n1=unit(add(sideNormal(d,side,...arc[i+1],false),c1));
        s.body.quad(outer[i],outer[i+1],roll[i+1],roll[i],[n0,n1,c1,c0],expected);
        s.trim.quad(roll[i],roll[i+1],inner[i+1],inner[i],null,expected);
      }
      const floorPoints=floorZs.filter(z=>z>arc.at(-1)[0]+EPS&&z<arc[0][0]-EPS).sort((a,b)=>a-b)
        .map(z=>[side*(profile(d,z).w - 0.285),d.sill,warpZ(d,z,profile(d,z).w - 0.285)]);
      s.trim.polygon([...inner,...floorPoints], null, [side, 0, 0]);
    }
    // Bright waist moulding and the reference's lower neon strips.
    for (const [from, to, y, halfHeight, material] of [
      [d.accent[0], d.accent[1], d.accent[2], 0.006, 'glow_accent'],
      ...(k === 'van' ? [[-2.40, 2.30, 0.55, 0.016, 'trim']] : [[doorMin, doorMax, det.waist, 0.003, 'chrome']]),
    ]) {
      const path=simplifyPath([from,...zs.filter(z=>z>from+EPS&&z<to-EPS),to],
        [z=>sidePoint(d,side,z,y-halfHeight,false),z=>sidePoint(d,side,z,y+halfHeight,false)]);
      for (let i = 0; i + 1 < path.length; i++) {
        let polys=[rect(path[i],path[i+1],y-halfHeight,y+halfHeight)];
        for (const arc of arches) polys = polys.flatMap(p => overlap(p, arc) ? partition(p, arc).outside : [p]);
        for (const p of polys) paint(p, side, false, material, -0.003);
      }
    }
  }
  snapshot('flanks');

  // Roof / bonnet / deck. Windshield and backlight share the loft, recessed in seals.
  const hoodRange = k === 'hatch' ? [1.025,1.695] : k === 'sedan' ? [0.755,2.295] : [2.500,2.575];
  const roofCuts = [hoodRange, ...(k === 'sedan' ? [[-2.295,-1.925]] : [])].map(([a,b]) => ({
    outer: rect(a-0.004,b+0.004,-0.825,0.825), inner: rect(a+0.004,b-0.004,-0.815,0.815),
    regions: [rect(a-0.004,b+0.004,-0.825,-0.815),rect(a-0.004,b+0.004,0.815,0.825),rect(a-0.004,a+0.004,-0.815,0.815),rect(b-0.004,b+0.004,-0.815,0.815)],
  }));
  if(k==='hatch') roofCuts.push({outer:rect(-1.465,-1.457,-0.86,0.86)});
  for(const cut of roofCuts) cut.edges = [cut.outer,cut.inner].filter(Boolean).flatMap((contour,index)=>contour.map((a,i)=>({a,b:contour[(i+1)%contour.length],nodes:[a,contour[(i+1)%contour.length]],reverse:index===1})));
  function paintRoof(poly,material,depth) {
    if(poly.length<3)return;
    const ns=poly.map(([z,u])=>roofNormal(d,z,u));
    const pts=poly.map(([z,u],i)=>sub(roofPoint(d,z,u),scale(ns[i],depth)));
    s[material].polygon(pts,ns,[0,1,0]);
    if(depth!==0.004)return;
    for(const cut of roofCuts) for(const edge of cut.edges) for(const v of poly) {
      const dz=edge.b[0]-edge.a[0],du=edge.b[1]-edge.a[1],t=((v[0]-edge.a[0])*dz+(v[1]-edge.a[1])*du)/(dz*dz+du*du);
      if(t>=-EPS&&t<=1+EPS&&Math.abs(v[0]-edge.a[0]-dz*t)<1e-7&&Math.abs(v[1]-edge.a[1]-du*t)<1e-7)edge.nodes.push(v);
    }
  }
  function roofPanel(poly,material,depth) {
    if(material!=='body') {paintRoof(poly,material,depth);return;}
    let polys=[poly];
    for(const cut of roofCuts) for(const region of cut.regions||[cut.outer]) {
      const next=[];
      for(const p of polys) {
        if(!overlap(p,region)){next.push(p);continue;}
        const split=partition(p,region);next.push(...split.outside);paintRoof(split.inside,'trim',0.004);
      }
      polys=next;
    }
    polys.forEach(p=>paintRoof(p,'body',0));
  }
  const roofClass = (z, row) => {
    if (d === DESIGN.van && inRange(z, [1.70, 1.745])) return 'lamp_head';
    if (inRange(z, d.frontGlass) || inRange(z, d.rearGlass)) {
      const range = inRange(z, d.frontGlass) ? d.frontGlass : d.rearGlass;
      return row === 0 || row === 5 || z < range[0] + 0.012 || z > range[1] - 0.012 ? 'trim' : 'glass';
    }
    return 'body';
  };
  const roofPaths=Array.from({length:7},(_,row)=>row===0||row===6?upperPaths[5]:
    boundaryPath(zs,roofBreaks,z=>roofPoint(d,z,roofRows(d,z)[row]),samplingTolerance));
  for(let row=0;row<6;row++) for(let n=0;n+1<roofBreaks.length;n++) {
    const a=roofBreaks[n],b=roofBreaks[n+1]; if(b-a<EPS)continue;
    const material=roofClass((a+b)/2,row),depth=material==='glass'?0.010:0;
    zipper(intervalPath(roofPaths[row],a,b),intervalPath(roofPaths[row+1],a,b),
      z=>[z,roofRows(d,z)[row]],z=>[z,roofRows(d,z)[row+1]],poly=>{
        roofPanel(poly,material,depth);
      });
    if(depth) {
      for(const edge of row===1?[row]:row===4?[row+1]:[]) {
        const path=intervalPath(roofPaths[edge],a,b);
        for(let i=0;i+1<path.length;i++) {
          const p=roofPoint(d,path[i],roofRows(d,path[i])[edge]),q=roofPoint(d,path[i+1],roofRows(d,path[i+1])[edge]);
          s.trim.quad(p,q,sub(q,scale(roofNormal(d,path[i+1],roofRows(d,path[i+1])[edge]),depth)),sub(p,scale(roofNormal(d,path[i],roofRows(d,path[i])[edge]),depth)),null,[edge===1?1:-1,0,0]);
        }
      }
      for(const z of [a,b]) if(roofClass(z+(z===a?-0.00001:0.00001),row)!=='glass') {
        const p=roofPoint(d,z,roofRows(d,z)[row]),q=roofPoint(d,z,roofRows(d,z)[row+1]);
        s.trim.quad(p,q,sub(q,scale(roofNormal(d,z,roofRows(d,z)[row+1]),depth)),sub(p,scale(roofNormal(d,z,roofRows(d,z)[row]),depth)),null,[0,0,z===a?1:-1]);
      }
    }
  }
  for(const cut of roofCuts)for(const edge of cut.edges) {
    const length=(edge.b[0]-edge.a[0])**2+(edge.b[1]-edge.a[1])**2;
    const t=v=>((v[0]-edge.a[0])*(edge.b[0]-edge.a[0])+(v[1]-edge.a[1])*(edge.b[1]-edge.a[1]))/length;
    const nodes=edge.nodes.sort((a,b)=>t(a)-t(b)).filter((v,i,p)=>!i||Math.abs(t(v)-t(p[i-1]))>1e-7);
    for(let i=0;i+1<nodes.length;i++) {
      const a=nodes[i],b=nodes[i+1],p=roofPoint(d,...a),q=roofPoint(d,...b);
      const expected=scale([b[0]-a[0],0,a[1]-b[1]],edge.reverse?-1:1);
      s.trim.quad(p,q,sub(q,scale(roofNormal(d,...b),0.004)),sub(p,scale(roofNormal(d,...a),0.004)),null,expected);
    }
  }
  snapshot('roof');

  // Underfloor is a sealed pan. Outboard rocker strips are absent inside the wells.
  for (let i = 0; i + 1 < floorZs.length; i++) {
    const a = floorZs[i], b = floorZs[i + 1], wa = profile(d, a).w - 0.285, wb = profile(d, b).w - 0.285;
    const point = (x, z, y = d.sill) => [x, y, warpZ(d, z, x)];
    s.trim.quad(point(-wa, a), point(wa, a), point(wb, b), point(-wb, b), null, [0, -1, 0]);
    for (const side of [-1, 1]) {
      if (arches.some(arc => inRange((a + b) / 2, [arc.at(-1)[0], arc[0][0]]))) continue;
      const oa = sidePoint(d, side, a, d.sill, false), ob = sidePoint(d, side, b, d.sill, false);
      s.trim.quad(point(side * wa, a), oa, ob, point(side * wb, b), null, [0, -1, 0]);
    }
  }
  snapshot('floor');
  makeEnd(d, det, true, s); makeEnd(d, det, false, s);
  snapshot('ends');
  return { surfaces: s, stations: zs, handles, stats };
}

function endOutline(d, det, front) {
  const z = (front ? 1 : -1) * d.length / 2, p = profile(d, z), points = [];
  points.push([-p.w + 0.285, d.sill], [p.w - 0.285, d.sill]);
  for (const y of lowerRows(d, det, z)) {
    const a = sidePoint(d, 1, z, y, false); points.push([a[0], a[1]]);
  }
  for (const y of upperRows(d, z).slice(1)) {
    const a = sidePoint(d, 1, z, y, true); points.push([a[0], a[1]]);
  }
  for (const u of roofRows(d, z).slice(0, -1).reverse()) { const a = roofPoint(d, z, u); points.push([a[0], a[1]]); }
  for (const y of upperRows(d, z).slice(0, -1).reverse()) { const a = sidePoint(d, -1, z, y, true); points.push([a[0], a[1]]); }
  for (const y of lowerRows(d, det, z).slice(0, -1).reverse()) { const a = sidePoint(d, -1, z, y, false); points.push([a[0], a[1]]); }
  return points;
}
function makeEnd(d, det, front, s) {
  const sign = front ? 1 : -1, z = sign * d.length / 2;
  const outline=endOutline(d,det,front), walls=[];
  let regions = [{ poly: outline, material: 'body', depth: 0 }];
  const onEdge=(p,a,b)=>Math.abs((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))<1e-8;
  function patch(contour, material, depth = 0) {
    const next = [];
    for (const r of regions) {
      if (!overlap(r.poly, contour)) { next.push(r); continue; }
      const split = partition(r.poly, contour);
      split.outside.forEach(p => next.push({ ...r, poly: p }));
      if (split.inside.length) {
        next.push({ poly: split.inside, material, depth });
        if(Math.abs(depth-r.depth)>EPS)for(let i=0;i<split.inside.length;i++) {
          const a=split.inside[i],b=split.inside[(i+1)%split.inside.length];
          if(contour.some((p,j)=>onEdge(a,p,contour[(j+1)%contour.length])&&onEdge(b,p,contour[(j+1)%contour.length])))walls.push({a,b,from:r.depth,to:depth});
          else if(depth&&outline.some((p,j)=>onEdge(a,p,outline[(j+1)%outline.length])&&onEdge(b,p,outline[(j+1)%outline.length])))walls.push({a,b,from:0,to:depth});
        }
      }
    }
    regions = next;
  }
  const bumper = d === DESIGN.van ? 0.44 : 0.335;
  patch(rect(-2, 2, 0, bumper), 'trim');
  if (front) {
    const y0 = d === DESIGN.van ? 0.47 : 0.38, y1 = d === DESIGN.van ? 0.68 : 0.49;
    patch(roundRect(0, (y0 + y1) / 2, d.width - 0.38, y1 - y0, 0.025), 'trim', 0.032);
  }
  patch(roundRect(0,det.plates[front?0:1],2*det.plates[2]+0.028,0.132,0.004),'trim',0.018);
  const lamps = front ? d.head : d.tail;
  if (lamps) {
    const [y, h, w] = lamps;
    // The connecting strip has its own 8 mm recessed slot.
    patch(rect(-w / 2 + 0.30, w / 2 - 0.30, y - 0.009, y + 0.009), 'trim', 0.014);
    for (const side of [-1, 1]) patch(roundRect(side * (w / 2 - 0.145), y, 0.326, Math.max(h + 0.035, 0.066), 0.010), 'trim', 0.040);
  }
  if (!front && d === DESIGN.van) {
    for (const side of [-1, 1]) {
      patch(roundRect(side * 0.81, 0.761, 0.222, 0.222, 0.014), 'trim', 0.040);
      patch(rect(side > 0 ? 0.028 : -0.832, side > 0 ? 0.832 : -0.028, 1.168, 1.912), 'trim');
      patch(rect(side > 0 ? 0.04 : -0.82, side > 0 ? 0.82 : -0.04, 1.18, 1.90), 'glass', 0.010);
    }
    for (const r of [rect(-0.004, 0.004, 0.52, 2.008), rect(-0.841, 0.841, 0.516, 0.524), rect(-0.841, 0.841, 2.000, 2.008), rect(-0.843, -0.835, 0.52, 2.004), rect(0.835, 0.843, 0.52, 2.004)]) patch(r, 'trim', 0.004);
  }
  // Hatch's full tailgate and sedan's boot shut line.
  if (!front && d !== DESIGN.van) {
    const y = d === DESIGN.hatch ? 0.535 : 0.625, w = d.tail[2] / 2 + 0.025;
    patch(rect(-w, w, y - 0.004, y + 0.004), 'trim', 0.004);
    for (const side of [-1, 1]) patch(rect(side * w - 0.004, side * w + 0.004, y, profile(d, z).top + 0.02), 'trim', 0.004);
  }
  const facePoint = (x, y, depth) => [x, y, warpZ(d, z, x) - sign * depth];
  for (const region of regions) {
    const contour=[];
    for(let i=0;i<region.poly.length;i++) {
      const a=region.poly[i],b=region.poly[(i+1)%region.poly.length];contour.push(a);
      if(Math.abs(a[1]-d.sill)<EPS&&Math.abs(b[1]-d.sill)<EPS) {
        const half=profile(d,z).w - 0.285;
        const additions=[-half,half].filter(x=>x>Math.min(a[0],b[0])+EPS&&x<Math.max(a[0],b[0])-EPS).sort((x,y)=>(x-y)*Math.sign(b[0]-a[0]));
        contour.push(...additions.map(x=>[x,d.sill]));
      }
    }
    // Start at the top, retaining the collinear XY vertices that define the
    // nonplanar bottom perimeter shared with the underfloor.
    let start=0;for(let i=1;i<contour.length;i++)if(contour[i][1]>contour[start][1])start=i;
    const ordered=[...contour.slice(start),...contour.slice(0,start)];
    const points = ordered.map(([x,y])=> {
      for(let i=0;i<outline.length;i++) {
        const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dy=b[1]-a[1],t=((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy);
        if(t>=-EPS&&t<=1+EPS&&onEdge([x,y],a,b))return mix(facePoint(...a,region.depth),facePoint(...b,region.depth),t);
      }
      return facePoint(x,y,region.depth);
    });
    s[region.material].polygon(points, points.map(p=>unit([0.112/profile(d,z).w*(p[0]/profile(d,z).w)**7,0,sign])), [0, 0, sign]);
  }
  for(const {a,b,from,to} of walls)s.trim.quad(facePoint(...a,from),facePoint(...b,from),facePoint(...b,to),facePoint(...a,to),null,scale([a[1]-b[1],b[0]-a[0],0],to>from?1:-1));
}

// Closed, round tyre; outward face has the fuller shoulder and bead profile.
function makeWheel(d) {
  const tyre = new Surface(), rim = new Surface(), spokes = new Surface(), brake = new Surface(), cap = new Surface();
  const r = d.radius, w = d.tyreWidth, n = 24;
  const profiles = [[-w / 2, r * 0.74], [-w * 0.30, r], [w * 0.30, r], [w / 2, r * 0.84], [w * 0.48, r * 0.74]];
  const point = (p, i, count = n) => [p[0], p[1] * Math.cos(i * Math.PI * 2 / count), p[1] * Math.sin(i * Math.PI * 2 / count)];
  const slopes = [[-1, 0.12], [-0.10, 1], [0.10, 1], [1, 0.25], [1, -0.15]];
  const normal = (j, i) => unit([slopes[j][0], slopes[j][1] * Math.cos(i * Math.PI * 2 / n), slopes[j][1] * Math.sin(i * Math.PI * 2 / n)]);
  for (let j = 0; j + 1 < profiles.length; j++) for (let i = 0; i < n; i++) {
    tyre.quad(point(profiles[j], i), point(profiles[j], i + 1), point(profiles[j + 1], i + 1), point(profiles[j + 1], i), [normal(j, i), normal(j, i + 1), normal(j + 1, i + 1), normal(j + 1, i)]);
  }
  const rimProfile = [[w * 0.48, r * 0.74], [w * 0.495, r * 0.705], [w * 0.30, r * 0.66]];
  for (let j = 0; j < 2; j++) for (let i = 0; i < n; i++) {
      const norms = [i, i + 1, i + 1, i].map(k => unit([0.7, (j? -0.7:0.45)*Math.cos(k * 2 * Math.PI / n), (j?-0.7:0.45)*Math.sin(k * 2 * Math.PI / n)]));
    rim.quad(point(rimProfile[j], i), point(rimProfile[j], i + 1), point(rimProfile[j + 1], i + 1), point(rimProfile[j + 1], i), norms);
  }
  for (let i = 0; i < n; i++) {
    // Flat, dark disc, behind the dished spokes; no simulated cabin/interior.
    if(i<12) brake.tri([w * 0.10, 0, 0], point([w * 0.10, r * 0.65], i,12), point([w * 0.10, r * 0.65], i+1,12), null, [1, 0, 0]);
    rim.tri([-w / 2, 0, 0], point(profiles[0], i + 1), point(profiles[0], i), null, [-1, 0, 0]);
  }
  // Five swept triangular-section spokes have three closed sides and real depth.
  for (let j = 0; j < 5; j++) {
    const angle = j * 2 * Math.PI / 5 + 0.14;
    const polar = (radius, theta, x) => [x, radius * Math.cos(theta), radius * Math.sin(theta)];
    const a = [polar(r * 0.16, angle - 0.12, w * 0.30 - 0.025), polar(r * 0.16, angle + 0.12, w * 0.30 - 0.025), polar(r * 0.16, angle, w * 0.30 - 0.038)];
    const b = [polar(r * 0.675, angle + 0.025, w * 0.34), polar(r * 0.675, angle + 0.175, w * 0.34), polar(r * 0.675, angle + 0.10, w * 0.34 - 0.017)];
    prism(spokes, a, b);
  }
  const hubR = r * 0.18, hubFront = w * 0.30 - 0.013, hubBack = w * 0.10;
  for (let i = 0; i < 8; i++) {
    cap.quad(point([hubFront, hubR], i, 8), point([hubFront, hubR], i + 1, 8), point([hubBack, hubR], i + 1, 8), point([hubBack, hubR], i, 8),null,[0,Math.cos((i+0.5)*Math.PI/4),Math.sin((i+0.5)*Math.PI/4)]);
    cap.tri([hubFront + 0.004, 0, 0], point([hubFront, hubR], i, 8), point([hubFront, hubR], i + 1, 8), null, [1, 0, 0]);
  }
  const caliper = new Surface();
  prism(caliper, [[w * 0.12, r * 0.46, -r * 0.16], [w * 0.12, r * 0.64, -r * 0.16], [w * 0.24, r * 0.56, -r * 0.16]], [[w * 0.12, r * 0.46, r * 0.16], [w * 0.12, r * 0.64, r * 0.16], [w * 0.24, r * 0.56, r * 0.16]]);
  return { tyre: tyre.geometry(), rim: rim.geometry(), spokes: spokes.geometry(), brake: brake.geometry(), cap: cap.geometry(), caliper: caliper.geometry() };
}
function prism(s, a, b) {
  const centre = scale([...a, ...b].reduce((v, p) => add(v, p), [0, 0, 0]), 1 / (a.length + b.length));
  s.polygon(a, null, sub(a[0], centre)); s.polygon(b, null, sub(b[0], centre));
  for (let i = 0; i < a.length; i++) {
    const j = (i + 1) % a.length, expected = sub(scale(add(a[i], b[j]), 0.5), centre);
    s.quad(a[i], a[j], b[j], b[i], null, expected);
  }
}

function boxSurface(s, centre, size, basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], omitBack=false) {
  const points = [];
  for (const z of [-1, 1]) for (const y of [-1, 1]) for (const x of [-1, 1]) points.push(add(centre, add(add(scale(basis[0], x * size[0] / 2), scale(basis[1], y * size[1] / 2)), scale(basis[2], z * size[2] / 2))));
  for (const face of [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]]) {
    if(omitBack&&face[0]===0&&face[1]===2)continue;
    const expected = sub(scale(face.reduce((p, i) => add(p, points[i]), [0, 0, 0]), 0.25), centre);
    s.quad(...face.map(i => points[i]), null, expected);
  }
}
function addLamps(d, surfaces) {
  for (const front of [true, false]) {
    const sign = front ? 1 : -1, z = sign * d.length / 2, lamp = front ? d.head : d.tail;
    const emitter = surfaces[front ? 'lamp_head' : 'lamp_tail'];
    const face = (x, y, depth) => [x, y, warpZ(d, z, x) - sign * depth];
    if (lamp) {
      const [y, h, w] = lamp;
      // Lit elements have precisely the reference bar's x/y bounds.
      const bar=rect(-w/2+0.30,w/2-0.30,y-0.003,y+0.003);
      emitter.polygon(bar.map(p=>face(...p,0.010)),null,[0,0,sign]);
      for(let i=0;i<4;i++){const a=bar[i],b=bar[(i+1)%4];surfaces.trim.quad(face(...a,0.010),face(...b,0.010),face(...b,0.014),face(...a,0.014),null,scale([b[1]-a[1],a[0]-b[0],0],1));}
      for (const side of [-1, 1]) {
        const cx = side * (w / 2 - 0.145), ph = Math.max(h + 0.027, 0.058);
        const mouth = rect(cx - 0.150, cx + 0.150, y - ph / 2, y + ph / 2), back = rect(cx - 0.147, cx + 0.147, y - ph * 0.37, y + ph * 0.37);
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          surfaces.chrome.quad(face(...mouth[i], 0.008), face(...mouth[j], 0.008), face(...back[j], 0.036), face(...back[i], 0.036),null,[0,0,sign]);
        }
        surfaces.chrome.polygon(back.map(p => face(...p, 0.036)), null, [0, 0, sign]);
        for (let j = 0; j < 3; j++) {
          const x = side * (w / 2 - 0.025 - j * 0.105), half = 0.025;
          const block=rect(x-half,x+half,y-h/2,y+h/2);
          emitter.polygon(block.map(p=>face(...p,0.030)),null,[0,0,sign]);
          for(let i=0;i<4;i++){const a=block[i],b=block[(i+1)%4];surfaces.trim.quad(face(...a,0.030),face(...b,0.030),face(...b,0.036),face(...a,0.036),null,[b[1]-a[1],a[0]-b[0],0]);}
        }
      }
    } else if (!front) {
      for (const side of [-1, 1]) {
        const cx = side * 0.81, mouth = rect(cx - 0.101, cx + 0.101, 0.662, 0.860), back = rect(cx - 0.095, cx + 0.095, 0.670, 0.852);
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; surfaces.chrome.quad(face(...mouth[i], 0.008), face(...mouth[j], 0.008), face(...back[j], 0.036), face(...back[i], 0.036),null,[0,0,sign]); }
        surfaces.chrome.polygon(back.map(p => face(...p, 0.036)), null, [0, 0, sign]);
        for (const [a, b] of [[0.672, 0.710], [0.727, 0.795], [0.812, 0.850]]) {
          const block=rect(cx-0.089,cx+0.089,a,b);emitter.polygon(block.map(p=>face(...p,0.030)),null,[0,0,sign]);
          for(let i=0;i<4;i++){const p=block[i],q=block[(i+1)%4];surfaces.trim.quad(face(...p,0.030),face(...q,0.030),face(...q,0.036),face(...p,0.036),null,[q[1]-p[1],p[0]-q[0],0]);}
        }
      }
    }
  }
}
function addDetails(group, d, k, shell) {
  const det = DETAIL[k], plates = new Surface(), plateMounts = new Surface(), grille = new Surface();
  for (const front of [true, false]) {
    const sign = front ? 1 : -1, y = det.plates[front ? 0 : 1], half = det.plates[2], z = sign * d.length / 2;
    // The plate is a flat upright face. Its 1 mm edge and backing stay within the nose/tail envelope.
    const basis=[[1,0,0],[0,1,0],[0,0,sign]];
    boxSurface(plateMounts,[0,y,z-sign*0.012],[2*half+0.020,0.124,0.012],basis,true);
    boxSurface(plates,[0,y,z-sign*0.0045],[2*half,0.104,0.003],basis,true);
  }
  group.add(plateMounts.mesh('plate_backings', 'trim'), plates.mesh('number_plates', 'plate'));
  const intakeY = d === DESIGN.van ? 0.575 : 0.435, z = d.length / 2;
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * (d.width - 0.47) / 5;
    // Individual horizontal-end louvres have depth and angled lower facets.
    const h=d===DESIGN.van?0.105:0.055;
    prism(grille,[[x-0.047,intakeY-h,z-0.014],[x+0.047,intakeY-h,z-0.014],[x,intakeY-h,z-0.029]],[[x-0.047,intakeY+h,z-0.014],[x+0.047,intakeY+h,z-0.014],[x,intakeY+h,z-0.029]]);
  }
  group.add(grille.mesh('intake_louvres', 'trim'));
  for (const side of [-1, 1]) {
    const label = side > 0 ? 'l' : 'r', housing = new Surface(), seal = new Surface(), mirror = new Surface(), stalk = new Surface();
    const [mz, my] = d.mirror, p = profile(d, mz);
    const seated = sidePoint(d, side, mz, my, my > p.belt), x0 = Math.abs(seated[0]) - 0.014, x1 = Math.min(d.width / 2 + 0.012, x0 + 0.087), cx = (x0 + x1) / 2;
    const ring = (f, z) => Array.from({ length: 8 }, (_, i) => {
      const a = i * 2 * Math.PI / 8;
      return [side * (cx + (x1 - x0) / 2 * f * Math.cos(a)), my + 0.035 * f * Math.sin(a), z];
    });
    const back = ring(1, mz - 0.068), middle = ring(0.95, mz + 0.050), inset = ring(0.78, mz - 0.071);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      housing.quad(back[i], back[j], middle[j], middle[i], [i, j, j, i].map(a => unit([side * Math.cos(a * Math.PI / 4), Math.sin(a * Math.PI / 4), 0.35])), [side*Math.cos((i+0.5)*Math.PI/4),Math.sin((i+0.5)*Math.PI/4),0]);
      housing.tri(middle[i], middle[j], [side * cx, my, mz + 0.090], null, [0, 0, 1]);
      seal.quad(back[i], back[j], inset[j], inset[i], null, [0, 0, -1]);
      mirror.tri([side * cx, my, mz - 0.071], inset[i], inset[j], null, [0, 0, -1]);
    }
    const anchor = sidePoint(d, side, mz + 0.015, my - 0.035, my - 0.035 > p.belt);
    prism(stalk, [add(anchor, [0, -0.010, -0.012]), add(anchor, [0, 0.010, -0.012]), add(anchor, [0, 0, 0.012])], [[side * (x0 + 0.010), my - 0.025, mz - 0.012], [side * (x0 + 0.010), my - 0.005, mz - 0.012], [side * (x0 + 0.010), my - 0.015, mz + 0.012]]);
    const pod = housing.mesh('mirror_' + label, 'body');
    pod.add(seal.mesh('mirror_seal_' + label, 'trim'), mirror.mesh('mirror_face_' + label, 'chrome'), stalk.mesh('mirror_stalk_' + label, 'trim')); group.add(pod);

    const handles = new Surface();
    for (const h of shell.handles) {
      const verts = [-0.085, -0.060, 0.060, 0.085].map((offset, i) => {
        const z = h.z + offset, normal = sideNormal(d, side, z, h.y, false), pt = sidePoint(d, side, z, h.y, false);
        return { base: add(pt, scale(normal, 0.001)), outer: add(pt, scale(normal, i === 0 || i === 3 ? 0.002 : 0.016)), z };
      });
      for (let i = 0; i < 3; i++) {
        const a = verts[i], b = verts[i + 1];
        const at = add(a.outer, [0, 0.008, 0]), ab = add(a.outer, [0, -0.008, 0]), bt = add(b.outer, [0, 0.008, 0]), bb = add(b.outer, [0, -0.008, 0]);
        handles.quad(at, ab, bb, bt, null, [side, 0, 0]);
        handles.quad(add(a.base, [0, 0.008, 0]), at, bt, add(b.base, [0, 0.008, 0]), null, [0, 1, 0]);
        handles.quad(ab, add(a.base, [0, -0.008, 0]), add(b.base, [0, -0.008, 0]), bb, null, [0, -1, 0]);
      }
    }
    group.add(handles.mesh('door_handles_' + label, 'chrome'));
  }

  // Two parked wipers follow the windscreen surface, 10 mm above the pane.
  const wipers = new Surface();
  const wz = d.frontGlass[1] - 0.053, rw = profile(d, wz).rw - 0.014;
  for (const side of [-1, 1]) {
    const px = side * rw * 0.17, ex = side * rw * 0.77, bz = wz - 0.030;
    const pos = (x, z, lift) => add(roofPoint(d, z, x / (profile(d, z).rw - 0.014)), scale(roofNormal(d, z, x / (profile(d, z).rw - 0.014)), lift));
    const a = pos(px, wz, 0.006), b = pos(ex, bz, 0.006), direction = unit(sub(b, a)), up = roofNormal(d, bz, ex / rw), transverse = unit(cross(direction, up));
    boxSurface(wipers, scale(add(a, b), 0.5), [Math.hypot(...sub(b, a)), 0.006, 0.010], [direction, up, transverse]);
    const bladeA = pos(side * rw * 0.36, bz + 0.004, 0.006), bladeB = pos(side * rw * 0.89, bz - 0.022, 0.006), axis = unit(sub(bladeB, bladeA));
    boxSurface(wipers, scale(add(bladeA, bladeB), 0.5), [Math.hypot(...sub(bladeB, bladeA)), 0.010, 0.014], [axis, up, unit(cross(axis, up))]);
  }
  group.add(wipers.mesh('windscreen_wipers', 'trim'));
}

const GEOMETRY_CACHE = new Map();
function car(kind) {
  const d = DESIGN[kind], group = new THREE.Group(); group.name = kind;
  const shell = makeShell(d, kind); addLamps(d, shell.surfaces);
  const body = shell.surfaces.body.mesh('body'), glass = shell.surfaces.glass.mesh('glass');
  const lamps = new THREE.Group(); lamps.name = 'lamps';
  lamps.add(shell.surfaces.lamp_head.mesh('lamp_head'), shell.surfaces.lamp_tail.mesh('lamp_tail'));
  group.add(body, glass, lamps, shell.surfaces.trim.mesh('panel_seals_and_shut_lines', 'trim'), shell.surfaces.chrome.mesh('lamp_reflectors_and_waist_mouldings', 'chrome'), shell.surfaces.glow_accent.mesh('glow_accent'));
  const parts = { [kind]: group, body, glass, lamps };
  let wheel = GEOMETRY_CACHE.get(kind);
  if (!wheel) { wheel = makeWheel(d); GEOMETRY_CACHE.set(kind, wheel); }
  for (const [suffix, side, axle] of [['fl', 1, 1], ['fr', -1, 1], ['rl', 1, -1], ['rr', -1, -1]]) {
    const m = new THREE.Mesh(wheel.tyre, MATERIALS.tyre); m.name = 'wheel_' + suffix;
    m.position.set(side * (d.width / 2 - d.tyreWidth / 2 - 0.014), d.radius, axle * d.wheelbase / 2);
    if (side < 0) m.rotation.y = Math.PI;
    for (const [name, material] of [['rim', 'rim'], ['spokes', 'rim'], ['brake', 'trim'], ['caliper', 'trim'], ['cap', 'rim']]) {
      const child = new THREE.Mesh(wheel[name], MATERIALS[material]); child.name = name + '_' + suffix;
      child.castShadow = child.receiveShadow = true; m.add(child);
    }
    m.castShadow = m.receiveShadow = true; group.add(m); parts[m.name] = m;
  }
  addDetails(group, d, kind, shell);
  Object.assign(group.userData, { parts, kind, size: meta.sizes[kind].slice(), wheelbase: d.wheelbase, tyreRadius: d.radius, wheelAxis: 'x', build: { stations: shell.stations.length, stages: shell.stats } });
  return group;
}
export function createObject(kind) {
  if (kind !== undefined) {
    if (!KINDS.includes(kind)) throw new RangeError('Unknown traffic car kind: ' + String(kind));
    return car(kind);
  }
  const group = new THREE.Group(); group.name = 'traffic_cars'; group.userData.parts = {};
  KINDS.forEach((k, i) => { const c = car(k); c.position.x = (i - 1) * 3.2; group.add(c); group.userData.parts[k] = c; });
  return group;
}
