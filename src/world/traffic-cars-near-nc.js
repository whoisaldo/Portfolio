// src/world/traffic-cars-near-nc.js: the same cars from close to.
//
// The close-up models of the three cars in traffic-cars-nc.js, kind for kind
// the same car (its length, width, height, wheelbase, glass, lamp bars), with
// what a lens within a few metres needs: round tyres on spoked rims, arches
// with lips and liners, smooth panels with cut shut lines, lamp pockets with
// reflectors, framed glass, mirrors, wipers, a grille, number plates. Modelled
// in code with the codex-3d skill (GPT-6.1 Sol) from the mid-distance module
// as its reference; ten material names (the eight, and chrome and plate);
// no badge, no text, no brand. src/world/traffic.js draws the nearest dozen
// cars from these and paints the cabin behind the glass itself.
import * as THREE from 'three';

// Near traffic LOD. Control dimensions and the local wheel frames match the
// middle-distance cars. Geometry is opaque, untextured, and grouped by the
// material names consumed by the city's instancing shader.
export const KINDS = ['wedge', 'pickup', 'micro'];
export const meta = {
  name: 'Night avenue: finished wedge, pickup, micro',
  size: [8.14, 1.98, 5.60],
  sizes: { wedge: [1.98, 1.14, 4.55], pickup: [2.10, 1.98, 5.60], micro: [1.50, 1.52, 2.45] },
  parts: [...KINDS, 'body', 'glass', 'lamps', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'],
  front: '+Z', wheelAxis: 'local X',
};

const M = {};
for (const [name, color, metalness, roughness] of [
  ['body', 0x777f89, 0.55, 0.23], ['trim', 0x1c222b, 0.08, 0.65],
  ['glass', 0x101d29, 0.28, 0.12], ['tyre', 0x111418, 0, 0.88],
  ['rim', 0x909da9, 0.88, 0.27], ['lamp_head', 0xe0f5ff, 0.10, 0.24],
  ['lamp_tail', 0xf42640, 0.10, 0.26], ['glow_accent', 0x20bac8, 0.15, 0.30],
  ['chrome', 0xc8d0d8, 1, 0.18], ['plate', 0xd8d2bc, 0, 0.84],
]) {
  const material = name === 'body' || name === 'glass'
    ? new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat: 1, clearcoatRoughness: name === 'body' ? 0.19 : 0.10 })
    : new THREE.MeshStandardMaterial({ color, metalness, roughness });
  material.name = name;
  if (name.startsWith('lamp_') || name === 'glow_accent') {
    material.emissive.setHex(color);
    material.emissiveIntensity = name === 'glow_accent' ? 1.4 : 2.3;
  }
  M[name] = material;
}

const microReach = 0.294 + 0.014;
const me = 0.875 + microReach, mi = 0.875 - microReach;
const DESIGN = {
  wedge: {
    width: 1.98, length: 4.55, height: 1.14, wheelbase: 2.70, radius: 0.34, tyreWidth: 0.285, segments: 14, sill: 0.155,
    stations: [-2.275, -2.10, -0.65, 0.02, 0.67, 2.10, 2.275],
    top: [[-2.275, 0.795], [-2.10, 0.86], [-1.35, 0.88], [-0.65, 1.14], [0.02, 1.14], [0.67, 0.835], [1.35, 0.81], [1.70, 0.785], [2.10, 0.555], [2.275, 0.50]],
    waist: [[-2.275, 0.67], [-2.10, 0.76], [-1.35, 0.78], [0.67, 0.75], [1.35, 0.76], [1.70, 0.72], [2.10, 0.495], [2.275, 0.438]],
    widths: [[-2.275, 0.91], [-2.10, 0.97], [-1.35, 0.99], [-0.65, 0.96], [0.67, 0.965], [1.35, 0.985], [2.10, 0.91], [2.275, 0.875]],
    roofs: [[-2.275, 0.80], [-2.10, 0.85], [-1.35, 0.85], [-0.65, 0.715], [0.02, 0.72], [0.67, 0.87], [1.35, 0.875], [2.10, 0.78], [2.275, 0.755]],
    glassRange: [-1.35, 0.67], pillars: [[-0.355, -0.295]], roofGlass: [[-1.35, -0.65], [0.02, 0.67]],
    head: [0.433, 0.025, 1.59], tail: [0.727, 0.037, 1.72],
  },
  pickup: {
    width: 2.10, length: 5.60, height: 1.98, wheelbase: 3.55, radius: 0.44, tyreWidth: 0.30, segments: 12, sill: 0.34,
    stations: [-2.8, -2.64, -0.99, -0.80, 0.80, 0.92, 1.22, 2.72],
    top: [[-2.8, 1.30], [-0.99, 1.30], [-0.80, 1.88], [0.80, 1.90], [0.92, 1.85], [1.22, 1.30], [2.365, 1.30], [2.72, 1.19]],
    waist: [[-2.8, 1.205], [-0.99, 1.225], [1.22, 1.18], [2.365, 1.17], [2.72, 1.09]],
    widths: [[-2.8, 0.98], [-2.365, 1.02], [-2.165, 1.05], [-1.385, 1.05], [-1.185, 1.00], [1.185, 1.00], [1.385, 1.05], [2.165, 1.05], [2.365, 1.02], [2.72, 0.98]],
    roofs: [[-2.8, 0.84], [-0.99, 0.84], [-0.80, 0.835], [0.92, 0.835], [1.22, 0.865], [2.365, 0.87], [2.72, 0.855]],
    glassRange: [-0.99, 1.22], pillars: [[-0.13, -0.025]], roofGlass: [[-0.99, -0.80], [0.92, 1.22]], bed: [-2.64, -0.99],
    head: [1.114, 0.054, 1.75], tail: [1.095, 0.049, 1.78],
  },
  micro: {
    width: 1.50, length: 2.45, height: 1.52, wheelbase: 1.75, radius: 0.25, tyreWidth: 0.17, segments: 14, sill: 0.145,
    stations: [-1.225, -0.35, 0.35, 1.225],
    top: [[-1.225, 0.745], [-me, 0.98], [-0.875, 1.32], [-mi, 1.455], [-0.35, 1.47], [0.35, 1.47], [mi, 1.455], [0.875, 1.32], [me, 0.98], [1.225, 0.745]],
    waist: [[-1.225, 0.68], [-me, 0.68], [-0.875, 0.685], [-mi, 0.69], [mi, 0.69], [0.875, 0.685], [me, 0.68], [1.225, 0.68]],
    widths: [[-1.225, 0.645], [-me, 0.705], [-0.875, 0.75], [-mi, 0.73], [mi, 0.73], [0.875, 0.75], [me, 0.705], [1.225, 0.645]],
    roofs: [[-1.225, 0.58], [-me, 0.57], [-0.875, 0.555], [-mi, 0.56], [mi, 0.56], [0.875, 0.555], [me, 0.57], [1.225, 0.58]],
    glassRange: [-me, me], pillars: [], roofGlass: [[-me, me]],
    head: [0.638, 0.034, 1.24], tail: [0.638, 0.034, 1.24],
  },
};

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const sub = (a, b) => a.map((v, i) => v - b[i]);
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (a, s) => a.map(v => v * s);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = a => scale(a, 1 / (Math.hypot(...a) || 1));
const clamp = THREE.MathUtils.clamp;
const inside = (z, range) => z > range[0] - 1e-8 && z < range[1] + 1e-8;

class Surface {
  constructor() { this.positions = []; this.normals = []; }
  triangle(a, b, c, normals) {
    a = a.map(Math.fround); b = b.map(Math.fround); c = c.map(Math.fround);
    const raw = cross(sub(b, a), sub(c, a));
    if (dot(raw, raw) < 1e-18) return;
    const n = unit(raw);
    this.positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) {
      const v = normals && normals[i];
      this.normals.push(...(v && dot(v, n) > 0.025 ? unit(v) : n));
    }
  }
  quad(a, b, c, d, normals) {
    this.triangle(a, b, c, normals && [normals[0], normals[1], normals[2]]);
    this.triangle(a, c, d, normals && [normals[0], normals[2], normals[3]]);
  }
  polygon(points, normals) {
    for (let i = 1; i < points.length - 1; i++) this.triangle(points[0], points[i], points[i + 1], normals && [normals[0], normals[i], normals[i + 1]]);
  }
  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
  mesh(name, material) {
    const mesh = new THREE.Mesh(this.geometry(), M[material]);
    mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}

// Shape-preserving Hermite splines hit every original knot. Limiting their
// departure from the linear controls keeps the angular design within 18 mm.
function spline(knots, limit = 0.018) {
  const n = knots.length, slopes = [], tangents = [];
  for (let i = 0; i < n - 1; i++) slopes.push((knots[i + 1][1] - knots[i][1]) / (knots[i + 1][0] - knots[i][0]));
  for (let i = 0; i < n; i++) {
    if (!i) tangents.push(slopes[0]);
    else if (i === n - 1) tangents.push(slopes[n - 2]);
    else if (slopes[i - 1] * slopes[i] <= 0) tangents.push(0);
    else {
      const a = knots[i][0] - knots[i - 1][0], b = knots[i + 1][0] - knots[i][0];
      tangents.push(3 * (a + b) / ((a + 2 * b) / slopes[i - 1] + (2 * a + b) / slopes[i]));
    }
  }
  return z => {
    if (z <= knots[0][0]) return knots[0][1];
    if (z >= knots[n - 1][0]) return knots[n - 1][1];
    let i = 0;
    while (z > knots[i + 1][0]) i++;
    const h = knots[i + 1][0] - knots[i][0], t = (z - knots[i][0]) / h, t2 = t * t, t3 = t2 * t;
    const linear = lerp(knots[i][1], knots[i + 1][1], t);
    const curved = (2 * t3 - 3 * t2 + 1) * knots[i][1] + (t3 - 2 * t2 + t) * h * tangents[i]
      + (-2 * t3 + 3 * t2) * knots[i + 1][1] + (t3 - t2) * h * tangents[i + 1];
    return linear + limit * Math.tanh((curved - linear) / limit);
  };
}

// Clip positions AND normals, so cut panels retain the loft's smooth shading.
function clip(poly, plane, greater) {
  const out = [], distance = v => dot(v.p, plane) + plane[3];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = distance(a), db = distance(b);
    const aa = greater ? da >= -1e-9 : da <= 1e-9, bb = greater ? db >= -1e-9 : db <= 1e-9;
    if (aa) out.push(a);
    if (aa !== bb) {
      const t = da / (da - db);
      out.push({ p: mix(a.p, b.p, t), n: unit(mix(a.n, b.n, t)) });
    }
  }
  const clean = [];
  for (const v of out) if (!clean.length || dot(sub(v.p, clean.at(-1).p), sub(v.p, clean.at(-1).p)) > 1e-16) clean.push(v);
  if (clean.length > 1 && dot(sub(clean[0].p, clean.at(-1).p), sub(clean[0].p, clean.at(-1).p)) < 1e-16) clean.pop();
  let changed = true;
  while (changed && clean.length > 3) {
    changed = false;
    for (let i = 0; i < clean.length; i++) {
      const a = sub(clean[i].p, clean[(i + clean.length - 1) % clean.length].p);
      const b = sub(clean[(i + 1) % clean.length].p, clean[i].p);
      const c = cross(a, b);
      if (dot(c, c) < 1e-13 * Math.max(1e-10, dot(a, a) * dot(b, b)) && dot(a, b) >= 0) {
        clean.splice(i, 1); changed = true; break;
      }
    }
  }
  if (clean.length < 3) return [];
  let area = [0, 0, 0];
  for (let i = 1; i < clean.length - 1; i++) area = add(area, cross(sub(clean[i].p, clean[0].p), sub(clean[i + 1].p, clean[0].p)));
  return dot(area, area) > 1e-18 ? clean : [];
}
const rect = (axis, a, b, c, d, second = 1) => {
  const p = [0, 0, 0, -a], q = [0, 0, 0, b], r = [0, 0, 0, -c], s = [0, 0, 0, d];
  p[axis] = 1; q[axis] = -1; r[second] = 1; s[second] = -1;
  return [p, q, r, s];
};
function partition(regions, planes, material, inset = 0) {
  const out = [];
  for (const region of regions) {
    if (planes.some(plane => region.poly.every(v => dot(v.p, plane) + plane[3] < -1e-8))) { out.push(region); continue; }
    let rest = region.poly;
    for (const plane of planes) {
      const outside = clip(rest, plane, false);
      if (outside.length >= 3) out.push({ ...region, poly: outside });
      rest = clip(rest, plane, true);
      if (rest.length < 3) break;
    }
    if (rest.length >= 3) out.push({ poly: rest, material, inset, fromInset: region.inset || 0, borders: planes });
  }
  return out;
}
function emit(regions, surfaces) {
  for (const r of regions) {
    const points = r.poly.map(v => r.inset ? sub(v.p, scale(v.n, r.inset)) : v.p);
    if ((r.inset || 0) !== (r.fromInset || 0)) for (let j = 0; j < points.length; j++) {
      const k = (j + 1) % points.length;
      if (r.borders && r.borders.some(plane => [r.poly[j], r.poly[k]].every(v => Math.abs(dot(v.p, plane) + plane[3]) < 2e-7))) {
        const fromA = sub(r.poly[j].p, scale(r.poly[j].n, r.fromInset || 0));
        const fromB = sub(r.poly[k].p, scale(r.poly[k].n, r.fromInset || 0));
        surfaces.trim.quad(fromA, fromB, points[k], points[j]);
      }
    }
    surfaces[r.material].polygon(points, r.poly.map(v => v.n));
  }
}

function profileTools(d, kind) {
  const curves = Object.fromEntries(['top', 'waist', 'widths', 'roofs'].map(key => [key, spline(d[key])]));
  const archRadius = d.radius + (kind === 'micro' ? 0.044 : 0.052);
  const archPoints = [];
  for (const axle of [-d.wheelbase / 2, d.wheelbase / 2]) {
    if (kind === 'pickup') {
      for (const z of [-0.59, -0.58, -0.57, -0.51, -0.45, -0.39, -0.30, -0.15, 0, 0.15, 0.30, 0.39, 0.45, 0.51, 0.57, 0.58, 0.59]) archPoints.push(axle + z);
    } else {
      archPoints.push(axle - archRadius - 0.014, axle + archRadius + 0.014);
      for (let i = 0; i <= 10; i++) archPoints.push(axle + archRadius * Math.cos(i * Math.PI / 10));
    }
  }
  const floor = z => kind === 'wedge' ? lerp(0.255, d.sill, clamp((z + 2.275) / (-d.wheelbase / 2 - archRadius - 0.014 + 2.275), 0, 1)) : d.sill;
  const truckArch = spline([[-0.59, d.sill], [-0.57, 0.76], [-0.39, 0.99], [0.39, 0.99], [0.57, 0.76], [0.59, d.sill]], 0.008);
  function arch(z) {
    for (const axle of [-d.wheelbase / 2, d.wheelbase / 2]) {
      const a = Math.abs(z - axle);
      if (kind === 'pickup') { if (a <= 0.59 + 1e-8) return truckArch(z - axle); }
      else if (a < archRadius + 0.014) {
        if (a <= archRadius) return d.radius + Math.sqrt(Math.max(0, archRadius * archRadius - a * a));
        return lerp(d.radius, floor(z), (a - archRadius) / 0.014);
      }
    }
    return floor(z);
  }
  function half(z) {
    const w = curves.widths(z), rw = curves.roofs(z), top = curves.top(z), low = arch(z);
    const waist = Math.min(curves.waist(z), top - 0.04);
    const bubble = kind === 'micro';
    const deck = Math.min(waist + (bubble ? 0.055 : 0.065), top - 0.022);
    const ry = top - (bubble ? Math.min(0.065, (top - deck) * 0.20) : 0.014);
    const sx = w - (bubble ? 0.042 : 0.08), gap = ry - deck;
    const lo = clamp((kind === 'pickup' ? 0.10 : 0.058) / gap, 0, 0.50);
    const hi = clamp(1 - (kind === 'pickup' ? 0.10 : 0.055) / gap, 0.50, 1);
    function upper(f) {
      let x;
      if (bubble) {
        const u = spline([[0, sx], [0.57, lerp(sx, rw, 0.25)], [1, rw]], 0.012);
        x = u(f);
      } else x = lerp(sx, rw, f) + 0.008 * Math.sin(Math.PI * f);
      return [x, lerp(deck, ry, f), z];
    }
    const lowerX = kind === 'wedge' && z > 2.10 ? lerp(w - 0.022, w + 0.025, (z - 2.10) / 0.175) : w - 0.022;
    const lip = Math.min(kind === 'pickup' ? 0.034 : 0.025, Math.max(0.008, (waist - low) * 0.36));
    const pts = [
      [0, floor(z), z], [w - d.tyreWidth - 0.058, low + 0.020 * clamp((low - floor(z)) / 0.05, 0, 1), z], [lowerX, low, z],
      [lerp(lowerX, w, 0.22), low + lip, z],
      [lerp(lowerX, w, 0.68) + 0.003, lerp(low + lip, waist, 0.50), z],
      [w, waist, z], [w - (bubble ? 0.014 : 0.024), lerp(waist, deck, 0.64), z],
      [sx, deck, z], upper(lo), upper(lerp(lo, hi, bubble ? 0.50 : 0.52)), upper(hi), [rw, ry, z], [0, top, z],
    ];
    // Round end corners in plan without changing the car's centre length.
    const start = d.stations[0], end = d.stations.at(-1);
    const endWeight = Math.max(clamp(1 - (z - start) / 0.10, 0, 1), clamp(1 - (end - z) / 0.10, 0, 1));
    const sign = z < 0 ? 1 : -1;
    if (endWeight) for (const p of pts) p[2] += sign * 0.026 * endWeight * Math.pow(Math.abs(p[0]) / w, 6);
    // Twenty-two section points on the angular cars, twenty-four on the micro.
    // Its canopy needs the additional side-glass station.
    const section = pts.filter((_, i) => i !== 3 && (kind === 'micro' || i !== 9));
    const crown = [rw * 0.48, top - (top - ry) * 0.48 * 0.48, z];
    if (endWeight) crown[2] += sign * 0.026 * endWeight * Math.pow(crown[0] / w, 6);
    section.splice(section.length - 1, 0, crown);
    return section;
  }
  function ring(z) {
    const p = half(z);
    return [...p, ...p.slice(1, -1).reverse().map(v => [-v[0], v[1], v[2]])];
  }
  const coarse = [...new Set([...d.stations, ...['top', 'waist', 'widths', 'roofs'].flatMap(key => d[key].map(k => k[0])),
    ...d.glassRange, ...d.pillars.flat(), ...d.roofGlass.flat(), ...(d.bed || [])])].sort((a, b) => a - b);
  const stations = [...coarse, ...archPoints];
  for (let i = 0; i < coarse.length - 1; i++) {
    const a = coarse[i], b = coarse[i + 1];
    const change = Math.max(...['top', 'widths', 'roofs'].map(k => Math.abs(curves[k](a) - curves[k](b))));
    const step = change > 0.035 ? 0.12 : 0.30;
    const count = Math.ceil((b - a) / step);
    for (let j = 1; j < count; j++) stations.push(lerp(a, b, j / count));
  }
  // Keep design and arch corner positions; discard redundant nearby samples.
  const mandatory = new Set([...coarse, ...archPoints]);
  const sorted = [...new Set(stations)].sort((a, b) => a - b);
  const selected = sorted.filter((z, i) => (i === 0 || z - sorted[i - 1] > 1e-7) && (mandatory.has(z) || !sorted.some((q, j) => j !== i && mandatory.has(q) && Math.abs(q - z) < 0.037)));
  return { ...curves, arch, floor, ring, half, stations: selected };
}

function shell(d, kind, tools) {
  const S = Object.fromEntries(Object.keys(M).map(name => [name, new Surface()]));
  const stations = tools.stations, rings = stations.map(tools.ring), N = rings[0].length, middle = N / 2;
  const glassEdges = kind === 'micro' ? [7, 8] : [7];
  const roofEdge = middle - 2, railEdge = roofEdge - 1;
  const hard = new Set([0, 1, 4, 6, N - 6, N - 4, N - 1]);
  // Normals come from parametric length and cross-section tangents. Each edge
  // owns normals at the belt, deck and underside, preserving the hard creases.
  const normal = (i, e, u) => {
    const a = rings[i][e], b = rings[i][(e + 1) % N];
    let t = sub(b, a);
    const before = sub(a, rings[i][(e + N - 1) % N]), after = sub(rings[i][(e + 2) % N], b);
    const ta = hard.has(e) ? unit(t) : unit(add(unit(t), unit(before)));
    const tb = hard.has((e + 1) % N) ? unit(t) : unit(add(unit(t), unit(after)));
    t = unit(mix(ta, tb, u));
    // An arch jamb changes length tangent abruptly; average tangent directions
    // rather than distances so it cannot reverse the underbody shading.
    let along = [0, 0, 0];
    for (const j of [i - 1, i + 1]) if (j >= 0 && j < rings.length) {
      along = add(along, unit(scale(sub(mix(rings[j][e], rings[j][(e + 1) % N], u), mix(a, b, u)), 1 / (stations[j] - stations[i]))));
    }
    return unit(cross(t, along));
  };
  const lipFraction = i => {
    const inner = rings[i][1], outer = rings[i][2];
    return clamp(1 - 0.024 / (outer[0] - inner[0]), 0.5, 0.98);
  };
  const point = (i, e, u) => {
    const p = mix(rings[i][e], rings[i][(e + 1) % N], u);
    const ce = e < middle ? e : N - 1 - e, canonicalU = e < middle ? u : 1 - u;
    if (ce === 1 && Math.abs(canonicalU - lipFraction(i)) < 1e-8) {
      const low = tools.arch(stations[i]), amount = clamp((low - tools.floor(stations[i])) / 0.05, 0, 1);
      p[1] = low + 0.012 * amount;
    }
    return { p, n: normal(i, e, u) };
  };
  const doors = kind === 'wedge' ? [-0.34, 0.63] : kind === 'pickup' ? [-0.88, -0.077, 1.04] : [-0.54, 0.526];
  const foot = kind === 'wedge' ? 0.33 : kind === 'pickup' ? 0.60 : 0.37;
  const waist = kind === 'wedge' ? 0.75 : kind === 'pickup' ? 1.19 : 0.68;
  const handles = (kind === 'pickup' ? [-0.88, -0.077] : [doors[0]]).map(z => z + 0.15);
  const fuelZ = kind === 'wedge' ? -1.98 : kind === 'pickup' ? -2.49 : -1.055;
  const fuelY = kind === 'wedge' ? 0.615 : kind === 'pickup' ? 0.98 : 0.606;
  const fuelW = kind === 'micro' ? 0.11 : 0.15, fuelH = kind === 'micro' ? 0.095 : 0.13;
  function flank(regions) {
    const patch = (z0, z1, y0, y1, mat = 'trim', inset = 0.004) => { regions = partition(regions, rect(2, z0, z1, y0, y1), mat, inset); };
    if (kind === 'wedge' || kind === 'micro') patch(-4, 4, 0, foot - 0.007, 'trim', 0);
    for (const z of doors) patch(z - 0.004, z + 0.004, foot, 2.2);
    patch(doors[0], doors.at(-1), foot - 0.004, foot + 0.004);
    for (const z of handles) patch(z - 0.099, z + 0.099, waist - 0.124, waist - 0.076, 'trim', 0.008);
    for (const z of [fuelZ - fuelW / 2, fuelZ + fuelW / 2]) patch(z - 0.0035, z + 0.0035, fuelY - fuelH / 2, fuelY + fuelH / 2);
    for (const y of [fuelY - fuelH / 2, fuelY + fuelH / 2]) patch(fuelZ - fuelW / 2, fuelZ + fuelW / 2, y - 0.0035, y + 0.0035);
    if (kind === 'wedge') {
      regions = partition(regions, [[0, 0, 1, 0.92], [0, 0, -1, -0.39], [0, 1, -0.16, -0.59], [0, -1, 0, 0.711]], 'trim', 0.028);
      patch(-0.94, 0.94, 0.208, 0.22, 'glow_accent', 0);
    }
    if (kind === 'micro') {
      patch(me - 0.015, 1.24, 0.621, 0.655, 'lamp_head', 0.002);
      patch(-1.24, -me + 0.015, 0.621, 0.655, 'lamp_tail', 0.002);
    }
    return regions;
  }
  function bonnet(regions) {
    const boxes = kind === 'wedge' ? [[0.74, 2.04, 0.67], [-2.12, -1.41, 0.68]] : kind === 'pickup' ? [[1.29, 2.57, 0.76]] : [];
    for (const [lo, hi, w] of boxes) {
      for (const z of [lo, hi]) regions = partition(regions, rect(2, z - 0.004, z + 0.004, -w, w, 0), 'trim', 0.004);
      for (const x of [-w, w]) regions = partition(regions, rect(0, x - 0.004, x + 0.004, lo, hi, 2), 'trim', 0.004);
    }
    return regions;
  }
  // Each glass cell replaces paint. Its walls meet the unrecessed shell, and
  // adjacent glass cells share identical inset vertices. No body behind panes.
  function cell(i, e, a, b, c, f, mat, patch, seal = false) {
    let poly = [point(i, e, a), point(i, e, b), point(i + 1, e, f), point(i + 1, e, c)];
    if (e >= middle) poly = [poly[1], poly[2], poly[3], poly[0]];
    let regions = [{ poly, material: mat, inset: mat === 'glass' ? 0.010 : 0 }];
    if (patch) regions = patch(regions);
    emit(regions, S);
    if (seal && mat === 'glass') {
      // Only true pane boundaries get returns. Cell divisions stay smooth.
      const ce = e < middle ? e : N - 1 - e;
      const paneLow = ce === glassEdges[0], paneHigh = ce === glassEdges.at(-1);
      if (paneLow || paneHigh) {
        for (const lower of [true, false]) if (lower ? paneLow : paneHigh) {
          const u = (e < middle ? lower : !lower) ? a : b;
          const v = (e < middle ? lower : !lower) ? c : f;
          const p = point(i, e, u), q = point(i + 1, e, v);
          const out = [p.p, q.p, sub(q.p, scale(q.n, 0.010)), sub(p.p, scale(p.n, 0.010))];
          if ((e < middle) === lower) out.reverse();
          S.trim.quad(...out);
        }
      }
    }
  }
  const windowAt = z => inside(z, d.glassRange) && !d.pillars.some(p => inside(z, p));
  for (let i = 0; i < stations.length - 1; i++) {
    const z = (stations[i] + stations[i + 1]) / 2;
    const bed = kind === 'pickup' && inside(z, d.bed);
    for (let e = 0; e < N; e++) {
      const ce = e < middle ? e : N - 1 - e;
      if (bed && ce >= roofEdge) continue;
      if (ce === 0) { cell(i, e, 0, 1, 0, 1, 'trim'); continue; }
      if (ce === 1) {
        const rolled = tools.arch(stations[i]) > tools.floor(stations[i]) + 1e-6 || tools.arch(stations[i + 1]) > tools.floor(stations[i + 1]) + 1e-6;
        if (rolled) {
          const a = lipFraction(i), b = lipFraction(i + 1);
          if (e < middle) { cell(i, e, 0, a, 0, b, 'trim'); cell(i, e, a, 1, b, 1, 'trim'); }
          else { cell(i, e, 0, 1 - a, 0, 1 - b, 'trim'); cell(i, e, 1 - a, 1, 1 - b, 1, 'trim'); }
        } else cell(i, e, 0, 1, 0, 1, 'trim');
        continue;
      }
      if (ce === 2) {
        const fraction = k => Math.min(0.45, 0.025 / Math.max(0.015, tools.half(stations[k])[3][1] - tools.half(stations[k])[2][1]));
        const a = fraction(i), b = fraction(i + 1);
        if (e < middle) { cell(i, e, 0, a, 0, b, 'trim'); cell(i, e, a, 1, b, 1, 'body', flank); }
        else { cell(i, e, 0, 1 - a, 0, 1 - b, 'body', flank); cell(i, e, 1 - a, 1, 1 - b, 1, 'trim'); }
        continue;
      }
      if (ce >= 3 && ce <= 6) { cell(i, e, 0, 1, 0, 1, 'body', flank); continue; }
      if (glassEdges.includes(ce)) {
        const win = !bed && windowAt(z);
        cell(i, e, 0, 1, 0, 1, win ? 'glass' : (!bed && inside(z, d.glassRange) ? 'trim' : 'body'), win ? regions => {
          for (const edge of doors) regions = partition(regions, rect(2, edge - 0.004, edge + 0.004, 0, 2.2), 'trim', 0);
          return regions;
        } : flank, true);
        continue;
      }
      if (ce === railEdge) { cell(i, e, 0, 1, 0, 1, 'body', flank); continue; }
      if (ce >= roofEdge) {
        if (d.roofGlass.some(range => inside(z, range))) {
          if (ce > roofEdge) { cell(i, e, 0, 1, 0, 1, 'glass'); continue; }
          const a = 0.042 / (0.52 * tools.roofs(stations[i])), b = 0.042 / (0.52 * tools.roofs(stations[i + 1]));
          if (e < middle) { cell(i, e, 0, a, 0, b, 'trim'); cell(i, e, a, 1, b, 1, 'glass'); }
          else { cell(i, e, 0, 1 - a, 0, 1 - b, 'glass'); cell(i, e, 1 - a, 1, 1 - b, 1, 'trim'); }
          const p = point(i, e, e < middle ? a : 1 - a), q = point(i + 1, e, e < middle ? b : 1 - b);
          const wall = [p.p, q.p, sub(q.p, scale(q.n, 0.010)), sub(p.p, scale(p.n, 0.010))];
          if (e < middle) wall.reverse(); S.trim.quad(...wall);
        } else cell(i, e, 0, 1, 0, 1, 'body', bonnet);
      }
    }
    if (bed) {
      const bedRing = k => {
        const r = rings[k], x = r[roofEdge][0], y = r[roofEdge][1], zz = stations[k];
        const shelf = Math.max(0.79, tools.arch(zz) + 0.037);
        return [[x, y, zz], [x, shelf, zz], [0.655, shelf, zz], [0.655, 0.79, zz], [-0.655, 0.79, zz], [-0.655, shelf, zz], [-x, shelf, zz], [-x, y, zz]];
      };
      const a = bedRing(i), b = bedRing(i + 1);
      for (let j = 0; j < a.length - 1; j++) S.trim.quad(a[j], a[j + 1], b[j + 1], b[j]);
    }
  }
  // Close each pane's lengthwise ends against its pillars and painted frame.
  for (let i = 0; i < stations.length; i++) {
    const before = i > 0 && windowAt((stations[i - 1] + stations[i]) / 2);
    const after = i < stations.length - 1 && windowAt((stations[i] + stations[i + 1]) / 2);
    if (before !== after) for (const e of [...glassEdges, ...glassEdges.map(e => N - 1 - e)]) {
      const p = point(i, e, 0), q = point(i, e, 1);
      const wall = [p.p, q.p, sub(q.p, scale(q.n, 0.010)), sub(p.p, scale(p.n, 0.010))];
      if (after) wall.reverse(); S.trim.quad(...wall);
    }
    for (const range of d.roofGlass) if (Math.abs(stations[i] - range[0]) < 1e-7 || Math.abs(stations[i] - range[1]) < 1e-7) {
      for (const e of [roofEdge, roofEdge + 1, middle, middle + 1]) {
        const margin = 0.042 / (0.52 * tools.roofs(stations[i]));
        const outer = e === roofEdge || e === middle + 1;
        const p = point(i, e, e === roofEdge ? margin : 0), q = point(i, e, outer && e >= middle ? 1 - margin : 1);
        const wall = [p.p, q.p, sub(q.p, scale(q.n, 0.010)), sub(p.p, scale(p.n, 0.010))];
        if (Math.abs(stations[i] - range[0]) < 1e-7) wall.reverse(); S.trim.quad(...wall);
      }
    }
  }
  if (d.bed) for (const [z, forward] of [[d.bed[0], true], [d.bed[1], false]]) {
    const ring = tools.ring(z), x = ring[roofEdge][0];
    let p = [[-x, 0.79, z], [x, 0.79, z], ...ring.slice(roofEdge, N - roofEdge + 1)];
    if (!forward) p.reverse(); S.trim.polygon(p);
  }
  endCap(rings[0], false, d, kind, S);
  endCap(rings.at(-1), true, d, kind, S);
  return S;
}

function endCap(ring, front, d, kind, S) {
  const normal = [0, 0, front ? 1 : -1];
    let regions = [{ poly: (front ? ring : ring.slice().reverse()).map(v => ({ p: v, n: normal })), material: 'body' }];
    const patch = (x0, x1, y0, y1, material = 'trim', inset = 0) => { regions = partition(regions, rect(0, x0, x1, y0, y1), material, inset); };
    patch(-2, 2, 0, kind === 'pickup' ? 0.64 : kind === 'micro' ? 0.31 : 0.32);
    if (front) {
      if (kind === 'pickup') patch(-0.815, 0.815, 0.716, 1.057, 'trim', 0.012);
      else if (kind === 'wedge') patch(-0.69, 0.69, 0.329, 0.379, 'trim', 0.012);
      else patch(-0.49, 0.49, 0.385, 0.433, 'trim', 0.009);
    } else if (kind === 'wedge') patch(-0.69, 0.69, 0.332, 0.43, 'trim', 0.009);
    if (kind === 'pickup' && !front) {
      for (const x of [-0.865, 0.865]) patch(x - 0.004, x + 0.004, 0.677, 1.25, 'trim', 0.004);
      patch(-0.865, 0.865, 0.677, 0.685, 'trim', 0.004);
      patch(-0.20, 0.20, 1.207, 1.245, 'trim', 0.008);
    }
    if (kind === 'micro') {
      for (const x of [-0.555, 0.555]) patch(x - 0.0035, x + 0.0035, 0.34, 0.706, 'trim', 0.004);
      patch(-0.555, 0.555, 0.34, 0.347, 'trim', 0.004);
      if (front) patch(-0.49, 0.49, 0.556, 0.563, 'trim', 0.004);
    }
    const [y, , w] = front ? d.head : d.tail;
    const pocketH = kind === 'pickup' ? 0.088 : kind === 'micro' ? 0.070 : front ? 0.064 : 0.064;
    patch(-w / 2 - 0.011, w / 2 + 0.011, y - pocketH / 2 - 0.008, y + pocketH / 2 + 0.008, 'trim', 0.018);
    const plateY = kind === 'wedge' ? front ? 0.25 : 0.54 : 0.50;
    const plateW = kind === 'wedge' ? 0.24 : kind === 'pickup' ? 0.26 : 0.20;
    patch(-plateW - 0.012, plateW + 0.012, plateY - 0.064, plateY + 0.064, 'trim', 0.018);
  for (const region of regions) {
    const faces = THREE.ShapeUtils.triangulateShape(region.poly.map(v => new THREE.Vector2(v.p[0], v.p[1])), []);
    for (const ids of faces) {
      let poly = ids.map(i => region.poly[i]);
      if (dot(cross(sub(poly[1].p, poly[0].p), sub(poly[2].p, poly[0].p)), normal) < 0) poly.reverse();
      emit([{ ...region, poly }], S);
    }
  }
}

// Small convex, bevel-cornered hardware. A profile extrusion is used for bars,
// lips, handles and plates; the main body never uses box primitives.
function extrusion(surface, profile, axis, lo, hi, offset = [0, 0, 0]) {
  let area = 0;
  for (let i = 0; i < profile.length; i++) { const j = (i + 1) % profile.length; area += profile[i][0] * profile[j][1] - profile[j][0] * profile[i][1]; }
  if (area < 0) profile = profile.slice().reverse();
  const axes = axis === 0 ? [1, 2] : axis === 1 ? [2, 0] : [0, 1];
  const ring = value => profile.map(p => {
    const v = offset.slice(); v[axis] += value; v[axes[0]] += p[0]; v[axes[1]] += p[1]; return v;
  });
  const a = ring(lo), b = ring(hi);
  for (let i = 0; i < a.length; i++) { const j = (i + 1) % a.length; surface.quad(a[i], a[j], b[j], b[i]); }
  surface.polygon(a.slice().reverse()); surface.polygon(b);
}
function rectangleProfile(w, h, bevel = 0.003) {
  const x = w / 2, y = h / 2, r = Math.min(bevel, x * 0.4, y * 0.4);
  return [[-x + r, -y], [x - r, -y], [x, -y + r], [x, y - r], [x - r, y], [-x + r, y], [-x, y - r], [-x, -y + r]];
}
function pipe(surface, points, radius, sides = 6) {
  const frames = points.map((p, i) => {
    const t = unit(sub(points[Math.min(i + 1, points.length - 1)], points[Math.max(0, i - 1)]));
    const u = unit(cross(t, Math.abs(t[2]) < 0.88 ? [0, 0, 1] : [0, 1, 0])), v = unit(cross(t, u));
    return Array.from({ length: sides }, (_, j) => {
      const n = add(scale(u, Math.cos(j * Math.PI * 2 / sides)), scale(v, Math.sin(j * Math.PI * 2 / sides)));
      return { p: add(p, scale(n, radius)), n };
    });
  });
  for (let i = 0; i < frames.length - 1; i++) for (let j = 0; j < sides; j++) {
    const k = (j + 1) % sides, p = [frames[i][j], frames[i][k], frames[i + 1][k], frames[i + 1][j]];
    surface.quad(...p.map(v => v.p), p.map(v => v.n));
  }
  surface.polygon(frames[0].map(v => v.p).reverse()); surface.polygon(frames.at(-1).map(v => v.p));
}
function revolve(surface, profiles, segments = 24, ribbed = false, inward = false) {
  const p = (j, i) => {
    const a = i * Math.PI * 2 / segments;
    const r = profiles[j][1] * (ribbed && (j === 1 || j === 2 || j === profiles.length - 2) && i % 2 ? 0.979 : 1);
    return [profiles[j][0], r * Math.cos(a), r * Math.sin(a)];
  };
  const n = (j, i) => {
    const before = profiles[Math.max(0, j - 1)], after = profiles[Math.min(profiles.length - 1, j + 1)];
    const dx = after[0] - before[0], dr = after[1] - before[1], a = i * Math.PI * 2 / segments;
    return unit([-dr, dx * Math.cos(a), dx * Math.sin(a)]);
  };
  for (let j = 0; j < profiles.length - 1; j++) for (let i = 0; i < segments; i++) {
    const q = [p(j, i), p(j, i + 1), p(j + 1, i + 1), p(j + 1, i)];
    const normals = [n(j, i), n(j, i + 1), n(j + 1, i + 1), n(j + 1, i)];
    if (inward) { q.reverse(); normals.reverse(); normals.forEach((v, k) => { normals[k] = scale(v, -1); }); }
    surface.quad(...q, normals);
  }
}
function wheelGeometries(d, kind) {
  const tyre = new Surface(), rim = new Surface(), disc = new Surface(), cap = new Surface(), spokes = new Surface(), caliper = new Surface();
  const r = d.radius, w = d.tyreWidth, bead = r * (kind === 'pickup' ? 0.61 : 0.74), n = 24;
  const profile = [[-w / 2, bead], [-w * 0.31, r], [w * 0.31, r], [w / 2, r * 0.84], [w * 0.46, bead]];
  revolve(tyre, profile, n, kind === 'pickup');
  // Barrel, raised rolled lip, and the closed inboard face meet the tyre bead.
  revolve(rim, [[-w / 2, bead], [w * 0.47, bead - 0.014], [w * 0.46, bead]], n, false, true);
  const circle = (x, radius, count) => Array.from({ length: count }, (_, i) => [x, radius * Math.cos(i * 2 * Math.PI / count), radius * Math.sin(i * 2 * Math.PI / count)]);
  rim.polygon(circle(-w / 2, bead, n).reverse());
  const bx = w * 0.46 - 0.041;
  disc.polygon(circle(bx, bead - 0.015, 12));
  // Each spoke is a closed triangular prism with a 30 mm dish toward the hub.
  const count = kind === 'micro' ? 6 : 5, hubR = bead * 0.22;
  for (let i = 0; i < count; i++) {
    const a = i * Math.PI * 2 / count + 0.18, outR = bead - 0.012;
    const front = [[w * 0.46 - 0.028, hubR * Math.cos(a), hubR * Math.sin(a)],
      [w * 0.46 + 0.001, outR * Math.cos(a - 0.105), outR * Math.sin(a - 0.105)],
      [w * 0.46 + 0.001, outR * Math.cos(a + 0.105), outR * Math.sin(a + 0.105)]];
    const back = front.map(p => [p[0] - 0.012, p[1], p[2]]);
    spokes.polygon(front); spokes.polygon(back.slice().reverse());
    for (let j = 0; j < 3; j++) { const k = (j + 1) % 3; spokes.quad(front[j], back[j], back[k], front[k]); }
  }
  const capSides = kind === 'micro' ? 6 : 5;
  revolve(cap, [[w * 0.46 - 0.030, hubR * 1.14], [w * 0.46 - 0.015, hubR]], capSides);
  cap.polygon(circle(w * 0.46 - 0.015, hubR, capSides));
  const caliperShape = [[bead * 0.50, -bead * 0.21], [bead * 0.79, -bead * 0.12], [bead * 0.79, bead * 0.20]];
  extrusion(caliper, caliperShape, 0, bx + 0.001, bx + 0.012);
  return { tyre: tyre.geometry(), rim: rim.geometry(), brake_disc: disc.geometry(), spokes: spokes.geometry(), centre_cap: cap.geometry(), brake_caliper: caliper.geometry() };
}

function reflectedWheel(geometry) {
  const g = geometry.clone();
  for (const name of ['position', 'normal']) {
    const a = g.attributes[name].array;
    for (let i = 0; i < a.length; i += 3) a[i + 2] = -a[i + 2];
    for (let i = 0; i < a.length; i += 9) for (let j = 0; j < 3; j++) {
      const value = a[i + 3 + j]; a[i + 3 + j] = a[i + 6 + j]; a[i + 6 + j] = value;
    }
  }
  g.computeBoundingSphere(); return g;
}

function roofPoint(tools, kind, x, z) {
  const ry = tools.half(z).at(-3)[1], top = tools.top(z), rw = tools.roofs(z);
  // The crown is shallow on the angular cars, broader on the micro canopy.
  const f = Math.min(1, Math.abs(x) / rw);
  const mid = top - (top - ry) * 0.48 * 0.48;
  return [x, f < 0.48 ? lerp(top, mid, f / 0.48) : lerp(mid, ry, (f - 0.48) / 0.52), z];
}
function sidePoint(tools, y, z) {
  const p = tools.half(z);
  for (let i = 2; i < p.length - 2; i++) if (y >= p[i][1] - 1e-8 && y <= p[i + 1][1] + 1e-8) {
    return lerp(p[i][0], p[i + 1][0], clamp((y - p[i][1]) / (p[i + 1][1] - p[i][1]), 0, 1));
  }
  return p[5][0];
}

function capSampler(tools, z) {
  const ring = tools.ring(z), faces = THREE.ShapeUtils.triangulateShape(ring.map(p => new THREE.Vector2(p[0], p[1])), []);
  return (x, y) => {
    for (const ids of faces) {
      const [a, b, c] = ids.map(i => ring[i]);
      const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(det) < 1e-12) continue;
      const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / det;
      const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / det;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) return u * a[2] + v * b[2] + (1 - u - v) * c[2];
    }
    return z;
  };
}
function lampDetails(group, lamps, d, kind, tools) {
  const reflectors = new Surface(), head = new Surface(), tail = new Surface();
  for (const front of [true, false]) {
    const sign = front ? 1 : -1, [y, h, width] = front ? d.head : d.tail;
    const z = front ? d.stations.at(-1) : d.stations[0], target = front ? head : tail, depth = capSampler(tools, z);
    // The connecting strip and its end tabs keep the exact glow-sprite box.
    // The two reflector pockets interrupt its skin instead of hiding behind it.
    for (const [lo, hi] of [[-width / 2, -width / 2 + 0.014], [-width / 2 + 0.225, width / 2 - 0.225], [width / 2 - 0.014, width / 2]]) {
      const bar = [[lo, y - h / 2], [hi, y - h / 2], [hi, y + h / 2], [lo, y + h / 2]].map(([x, yy]) => [x, yy, depth(x, yy) - sign * 0.009]);
      if (!front) bar.reverse(); target.quad(...bar);
    }
    const ph = kind === 'pickup' ? 0.075 : kind === 'micro' ? 0.057 : 0.051;
    for (const side of [-1, 1]) {
      const cx = side * (width / 2 - 0.121), contour = [[-0.0985, -ph * 0.22], [-0.078, -ph / 2], [0.078, -ph / 2], [0.0985, ph * 0.22], [0.078, ph / 2], [-0.078, ph / 2]];
      if (side < 0) contour.reverse().forEach(p => { p[0] = -p[0]; });
      const outer = contour.map(([x, yy]) => [cx + x, y + yy, depth(cx + x, y + yy) - sign * 0.005]);
      const inner = contour.map(([x, yy]) => [cx + x * 0.73, y + yy * 0.69, depth(cx + x * 0.73, y + yy * 0.69) - sign * 0.015]);
      for (let j = 0; j < contour.length; j++) {
        const k = (j + 1) % contour.length, p = [outer[j], outer[k], inner[k], inner[j]];
        if (!front) p.reverse(); reflectors.quad(...p);
      }
      const bottom = front ? inner : inner.slice().reverse(); reflectors.polygon(bottom);
      for (const offset of [-0.046, 0.046]) {
        const radius = front ? ph * 0.23 : ph * 0.20;
        let p = Array.from({ length: 6 }, (_, j) => {
          const x = cx + offset + radius * Math.cos(j * Math.PI / 3), yy = y + radius * Math.sin(j * Math.PI / 3);
          return [x, yy, depth(x, yy) - sign * 0.007];
        });
        if (!front) p.reverse(); target.polygon(p);
      }
    }
  }
  group.add(reflectors.mesh('lamp_reflectors', 'chrome'));
  lamps.add(head.mesh('headlamp_projectors_and_strip', 'lamp_head'), tail.mesh('taillamp_elements_and_strip', 'lamp_tail'));
}

function hardware(group, d, kind, tools) {
  const waist = kind === 'wedge' ? 0.75 : kind === 'pickup' ? 1.19 : 0.68;
  const handles = kind === 'pickup' ? [-0.73, 0.073] : [kind === 'wedge' ? -0.19 : -0.39];
  const doorHandles = new Surface();
  for (const side of [-1, 1]) for (const z of handles) {
    const y = waist - 0.10, x = sidePoint(tools, y, z);
    const shape = rectangleProfile(0.022, 0.17, 0.008);
    extrusion(doorHandles, shape, 0, side > 0 ? x - 0.004 : -x - 0.009, side > 0 ? x + 0.009 : -x + 0.004, [0, y, z]);
  }
  group.add(doorHandles.mesh('door_handles', 'chrome'));
  const zMirror = kind === 'wedge' ? 0.53 : kind === 'pickup' ? 0.93 : 0.46;
  const yMirror = tools.waist(zMirror) + (kind === 'micro' ? 0.22 : kind === 'pickup' ? 0.23 : 0.10);
  for (const side of [-1, 1]) {
    const housing = new Surface(), stalk = new Surface(), face = new Surface();
    const outerX = Math.min(d.width / 2, tools.widths(zMirror) + 0.023);
    const cx = side * (outerX - 0.048), contour = rectangleProfile(0.096, kind === 'pickup' ? 0.065 : 0.053, 0.017);
    const back = contour.map(([x, y]) => [cx + x, yMirror + y, zMirror - 0.044]);
    const nose = contour.map(([x, y]) => [cx + x * 0.84, yMirror + y * 0.83, zMirror + 0.038]);
    for (let j = 0; j < contour.length; j++) { const k = (j + 1) % contour.length; housing.quad(back[j], back[k], nose[k], nose[j]); }
    housing.polygon(nose);
    face.polygon(back.slice().reverse());
    const mountX = side * sidePoint(tools, yMirror - 0.03, zMirror);
    pipe(stalk, [[mountX, yMirror - 0.032, zMirror + 0.015], [cx, yMirror - 0.010, zMirror + 0.005]], 0.010, 5);
    group.add(housing.mesh('mirror_' + (side > 0 ? 'l' : 'r') + '_housing', 'body'), stalk.mesh('mirror_' + (side > 0 ? 'l' : 'r') + '_stalk', 'trim'), face.mesh('mirror_' + (side > 0 ? 'l' : 'r') + '_face', 'chrome'));
  }
  const wipers = new Surface(), zBase = d.roofGlass.at(-1)[1] - (kind === 'micro' ? 0.027 : 0.042);
  const sides = kind === 'micro' ? [1] : [-1, 1];
  for (const side of sides) {
    const x = side * (kind === 'micro' ? 0.12 : 0.28), length = kind === 'micro' ? 0.39 : kind === 'pickup' ? 0.45 : 0.39;
    const p = roofPoint(tools, kind, x, zBase), q = roofPoint(tools, kind, x - side * 0.09, zBase - 0.025);
    p[1] += 0.004; q[1] += 0.004;
    pipe(wipers, [p, q], 0.004, 4);
    const a = roofPoint(tools, kind, x - length / 2, zBase - 0.025), b = roofPoint(tools, kind, x + length / 2, zBase - 0.025);
    a[1] += 0.004; b[1] += 0.004; pipe(wipers, [a, b], 0.005, 4);
  }
  group.add(wipers.mesh('windscreen_wipers', 'trim'));
  for (const front of [true, false]) {
    const sign = front ? 1 : -1, height = kind === 'wedge' ? (front ? 0.25 : 0.54) : 0.50;
    const halfWidth = kind === 'wedge' ? 0.24 : kind === 'pickup' ? 0.26 : 0.20;
    const z = front ? d.stations.at(-1) : d.stations[0];
    // Plates are recessed from the centre bumper, preserving exact length.
    const backing = new Surface(), plate = new Surface();
    extrusion(backing, [[-halfWidth - 0.010, -0.062], [halfWidth + 0.010, -0.062], [halfWidth + 0.010, 0.062], [-halfWidth - 0.010, 0.062]], 2, front ? z - 0.016 : z + 0.005, front ? z - 0.005 : z + 0.016, [0, height, 0]);
    let p = [[-halfWidth, height - 0.052, z - sign * 0.001], [halfWidth, height - 0.052, z - sign * 0.001],
      [halfWidth, height + 0.052, z - sign * 0.001], [-halfWidth, height + 0.052, z - sign * 0.001]];
    if (!front) p.reverse(); plate.quad(...p);
    group.add(backing.mesh((front ? 'front' : 'rear') + '_plate_backing', 'trim'), plate.mesh((front ? 'front' : 'rear') + '_plate', 'plate'));
  }
  const grille = new Surface(), frontZ = d.stations.at(-1);
  if (kind === 'pickup') {
    for (const y of [0.760, 0.813, 0.866, 0.919, 0.972, 1.025]) extrusion(grille, [[y - 0.008, frontZ - 0.008], [y, frontZ + 0.020], [y + 0.008, frontZ - 0.008]], 0, -0.756, 0.756);
  } else {
    const cy = kind === 'wedge' ? 0.354 : 0.409, width = kind === 'wedge' ? 1.24 : 0.85;
    for (let i = -2; i <= 2; i++) {
      const y = cy + i * 0.008;
      extrusion(grille, [[y - 0.0027, frontZ - 0.010], [y, frontZ - 0.003], [y + 0.0027, frontZ - 0.010]], 0, -width / 2, width / 2);
    }
  }
  group.add(grille.mesh('front_grille_slats', 'trim'));
  if (kind === 'pickup') {
    const s = new Surface(); extrusion(s, rectangleProfile(0.30, 0.029, 0.006), 2, -2.798, -2.795, [0, 1.225, 0]);
    // The profile is XY; the tailgate handle is horizontal across the car.
    group.add(s.mesh('tailgate_handle', 'chrome'));
  }
}

function specialDetails(group, d, kind, tools) {
  if (kind === 'wedge') {
    const louvers = new Surface();
    for (const z of [-1.245, -1.025, -0.805]) {
      const rings = [-1, 0, 1].map(f => [[z, 0.003], [z, 0.020], [z + 0.057, 0.025], [z + 0.057, 0.003]].map(([zz, lift]) => {
        const p = roofPoint(tools, kind, f * (tools.roofs(zz) - 0.004), zz); p[1] = Math.min(d.height - 0.003, p[1] + lift); return p;
      }));
      for (let k = 0; k < 2; k++) for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; louvers.quad(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]); }
      louvers.polygon(rings[0].slice().reverse()); louvers.polygon(rings[2]);
    }
    group.add(louvers.mesh('rear_louvres', 'trim'));
    const splitter = new Surface(), diffuser = new Surface(), intakes = new Surface();
    extrusion(splitter, [[0.141, 2.267], [0.156, 2.267], [0.156, 2.125]], 0, -0.867, 0.867);
    for (const x of [-0.48, 0, 0.48]) extrusion(diffuser, [[0.157, -2.270], [0.254, -2.270], [0.157, -1.756]], 0, x - 0.011, x + 0.011);
    for (const side of [-1, 1]) for (const z of [-0.82, -0.69, -0.56]) {
      const y = 0.656, x = sidePoint(tools, y, z);
      extrusion(intakes, [[y - 0.026, z - 0.005], [y + 0.034, z + 0.014], [y + 0.034, z + 0.024]], 0, side > 0 ? x - 0.031 : -x + 0.008, side > 0 ? x - 0.008 : -x + 0.031);
    }
    group.add(splitter.mesh('front_splitter', 'trim'), diffuser.mesh('rear_diffuser_fins', 'trim'), intakes.mesh('side_intake_vanes', 'trim'));
  } else if (kind === 'pickup') {
    const bull = new Surface(), roll = new Surface(), boards = new Surface(), ribs = new Surface();
    pipe(bull, [[-0.83, 0.565, 2.73], [-0.83, 0.87, 2.763], [-0.79, 0.935, 2.763], [-0.70, 0.99, 2.763], [0.70, 0.99, 2.763], [0.79, 0.935, 2.763], [0.83, 0.87, 2.763], [0.83, 0.565, 2.73]], 0.037, 8);
    pipe(roll, [[-0.895, 1.282, -1.135], [-0.895, 1.69, -1.135], [-0.83, 1.756, -1.135], [-0.70, 1.81, -1.135], [0.70, 1.81, -1.135], [0.83, 1.756, -1.135], [0.895, 1.69, -1.135], [0.895, 1.282, -1.135]], 0.052, 8);
    for (const side of [-1, 1]) {
      let profile = [[0.948, 0.39], [1.047, 0.39], [1.047, 0.43], [1.012, 0.465], [0.948, 0.465]].map(([x, y]) => [side * x, y]);
      extrusion(boards, profile, 2, -1.05, 1.05);
    }
    for (const x of [-0.48, -0.24, 0, 0.24, 0.48]) extrusion(ribs, [[x - 0.013, 0.792], [x + 0.013, 0.792], [x + 0.013, 0.799], [x - 0.013, 0.799]], 2, -2.60, -1.035);
    group.add(bull.mesh('bull_bar', 'trim'), roll.mesh('bed_roll_bar', 'trim'), boards.mesh('running_boards', 'trim'), ribs.mesh('bed_liner_ribs', 'trim'));
    const housing = new Surface(), light = new Surface();
    const profile = [[0, 0.385], [1.914, 0.385], [1.962, 0.405], [1.98, 0.44], [1.98, 0.50], [1.96, 0.535], [0, 0.535]];
    const rings = [-0.71, 0, 0.71].map(x => profile.map(([y, z], i) => [x, i === 0 || i === 6 ? roofPoint(tools, kind, x, z)[1] - 0.001 : y, z]));
    for (let k = 0; k < 2; k++) for (let i = 0; i < profile.length; i++) { const j = (i + 1) % profile.length; (i === 5 ? light : housing).quad(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]); }
    housing.polygon(rings[0].slice().reverse()); housing.polygon(rings[2]);
    group.add(housing.mesh('roof_bar_housing', 'trim'), light.mesh('roof_light_bar', 'glow_accent'));
  } else {
    const pod = new Surface(), signal = new Surface();
    const contour = [[-0.14, -0.25], [0.14, -0.25], [0.19, -0.20], [0.19, 0.08], [0.14, 0.13], [-0.14, 0.13], [-0.19, 0.08], [-0.19, -0.20]];
    const bottom = contour.map(([x, z]) => { const p = roofPoint(tools, kind, x, z); p[1] -= 0.012; return p; });
    const top = contour.map(([x, z]) => [x * 0.80, 1.52, (z + 0.06) * 0.85 - 0.06]);
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length;
      const p = [bottom[i], top[i], top[j], bottom[j]], n = unit(cross(sub(p[1], p[0]), sub(p[2], p[0])));
      emit(i === 4 ? partition([{ poly: p.map(v => ({ p: v, n })), material: 'trim' }], rect(0, -0.08, 0.08, 1.487, 1.501), 'glow_accent') : [{ poly: p.map(v => ({ p: v, n })), material: 'trim' }], { trim: pod, glow_accent: signal });
    }
    pod.polygon(bottom); pod.polygon(top.slice().reverse());
    group.add(pod.mesh('roof_pod', 'trim'), signal.mesh('roof_pod_signal', 'glow_accent'));
  }
}

// Remove redundant tessellation after the seams have been cut. Collapses use
// existing endpoints, preserve boundary curves, reject face flips and retain
// the authored corner normals. Only the right half is processed; reflection
// produces exact left/right symmetry. Error is measured against every incident
// face plane, not just the length of an edge.
function simplifyPanels(panels, target, error = 0.0038) {
  const vertices = [], faces = [], keys = new Map();
  const vertex = p => {
    const key = p.map(v => v.toFixed(6)).join(',');
    if (keys.has(key)) return keys.get(key);
    const id = vertices.length; keys.set(key, id);
    vertices.push({ p, faces: new Set(), version: 0, alive: true }); return id;
  };
  for (let material = 0; material < panels.length; material++) {
    const geometry = panels[material].geometry;
    const srcP = geometry.attributes.position.array, srcN = geometry.attributes.normal.array, half = new Surface();
    for (let i = 0; i < srcP.length; i += 9) {
      const poly = [];
      for (let j = 0; j < 3; j++) poly.push({ p: Array.from(srcP.slice(i + 3 * j, i + 3 * j + 3)), n: Array.from(srcN.slice(i + 3 * j, i + 3 * j + 3)) });
      if (poly.every(v => v.p[0] <= 0)) continue;
      const clipped = poly.every(v => v.p[0] >= 0) ? poly : clip(poly, [1, 0, 0, 0], true);
      half.polygon(clipped.map(v => v.p), clipped.map(v => v.n));
    }
    for (let i = 0; i < half.positions.length; i += 9) {
      const ids = [], normals = [];
      for (let j = 0; j < 3; j++) { ids.push(vertex(half.positions.slice(i + j * 3, i + j * 3 + 3))); normals.push(half.normals.slice(i + j * 3, i + j * 3 + 3)); }
      if (new Set(ids).size < 3) continue;
      const face = { ids, normals, material, alive: true }, id = faces.length; faces.push(face);
      for (const v of ids) vertices[v].faces.add(id);
    }
  }
  let count = faces.length;
  const bounds = [0, 1, 2].map(axis => [Math.min(...vertices.map(v => v.p[axis])), Math.max(...vertices.map(v => v.p[axis]))]);
  const neighbours = v => {
    const out = new Set();
    for (const id of vertices[v].faces) for (const u of faces[id].ids) if (u !== v) out.add(u);
    return out;
  };
  const edgeFaces = (a, b) => [...vertices[a].faces].filter(id => faces[id].ids.includes(b));
  const boundary = v => [...neighbours(v)].filter(u => edgeFaces(v, u).length === 1);
  function cost(from, to) {
    const a = vertices[from], b = vertices[to];
    if (!a.alive || !b.alive) return Infinity;
    if (bounds.some((range, axis) => range.some(value => Math.abs(a.p[axis] - value) < 1e-8 && Math.abs(b.p[axis] - value) > 1e-8))) return Infinity;
    const delta = sub(a.p, b.p), length2 = dot(delta, delta);
    if (length2 > 0.36 * 0.36) return Infinity;
    const edge = edgeFaces(from, to);
    if (edge.length < 1 || edge.length > 2) return Infinity;
    const na = neighbours(from), nb = neighbours(to);
    if ([...na].filter(v => nb.has(v)).length !== edge.length) return Infinity;
    const fromMaterials = new Set([...a.faces].map(id => faces[id].material));
    const toMaterials = new Set([...b.faces].map(id => faces[id].material));
    if (fromMaterials.size > 1 && [...fromMaterials].some(m => !toMaterials.has(m))) return Infinity;
    const border = boundary(from);
    if (border.length) {
      if (edge.length !== 1 || border.length !== 2 || border.includes(to) === false) return Infinity;
      const other = vertices[border.find(v => v !== to)].p, axis = sub(other, b.p);
      const d = cross(sub(a.p, b.p), axis);
      if (dot(d, d) > 1e-12 * Math.max(dot(axis, axis), 1e-12)) return Infinity;
    }
    let maximum = 0;
    for (const id of a.faces) {
      const f = faces[id];
      if (f.ids.includes(to)) continue;
      const p = f.ids.map(v => vertices[v].p);
      const old = unit(cross(sub(p[1], p[0]), sub(p[2], p[0])));
      const e = Math.abs(dot(delta, old));
      if (e > error) return Infinity;
      const q = f.ids.map(v => v === from ? b.p : vertices[v].p);
      const raw = cross(sub(q[1], q[0]), sub(q[2], q[0]));
      if (dot(raw, raw) < 1e-16 || dot(unit(raw), old) < 0.78) return Infinity;
      maximum = Math.max(maximum, e);
    }
    return maximum * maximum + length2 * 0.00001;
  }
  const heap = [];
  const push = entry => {
    let i = heap.length; heap.push(entry);
    while (i) { const p = (i - 1) >> 1; if (heap[p].cost <= entry.cost) break; heap[i] = heap[p]; i = p; } heap[i] = entry;
  };
  const pop = () => {
    const result = heap[0], last = heap.pop(); if (!heap.length) return result;
    let i = 0;
    while (2 * i + 1 < heap.length) { let child = 2 * i + 1; if (child + 1 < heap.length && heap[child + 1].cost < heap[child].cost) child++; if (heap[child].cost >= last.cost) break; heap[i] = heap[child]; i = child; }
    heap[i] = last; return result;
  };
  const queue = (a, b) => {
    for (const [from, to] of [[a, b], [b, a]]) { const c = cost(from, to); if (isFinite(c)) push({ from, to, cost: c, va: vertices[from].version, vb: vertices[to].version }); }
  };
  for (let a = 0; a < vertices.length; a++) for (const b of neighbours(a)) if (b > a) queue(a, b);
  while (count * 2 > target && heap.length) {
    const e = pop(), a = vertices[e.from], b = vertices[e.to];
    if (!a.alive || !b.alive || a.version !== e.va || b.version !== e.vb || !isFinite(cost(e.from, e.to))) continue;
    const affected = new Set([...neighbours(e.from), ...neighbours(e.to), e.to]);
    const targetNormals = [...b.faces].flatMap(id => faces[id].normals.filter((_, j) => faces[id].ids[j] === e.to).map(n => ({ n, material: faces[id].material })));
    for (const id of [...a.faces]) {
      const f = faces[id];
      if (f.ids.includes(e.to)) { f.alive = false; count--; for (const v of f.ids) vertices[v].faces.delete(id); }
      else {
        const j = f.ids.indexOf(e.from), old = f.normals[j];
        let best = old, score = 0.90;
        for (const v of targetNormals) if (v.material === f.material && dot(v.n, old) > score) { best = v.n; score = dot(v.n, old); }
        f.ids[j] = e.to; f.normals[j] = best; b.faces.add(id);
      }
    }
    a.faces.clear(); a.alive = false;
    for (const v of affected) vertices[v].version++;
    for (const v of affected) if (vertices[v].alive) for (const u of neighbours(v)) if (u > v || !affected.has(u)) queue(v, u);
  }
  const outputs = panels.map(() => new Surface());
  for (const f of faces) if (f.alive) {
    const out = outputs[f.material], p = f.ids.map(v => vertices[v].p); out.triangle(...p, f.normals);
    out.triangle(...[p[0], p[2], p[1]].map(v => [-v[0], v[1], v[2]]), ...[ [f.normals[0], f.normals[2], f.normals[1]].map(v => [-v[0], v[1], v[2]]) ]);
  }
  return outputs.map(out => out.geometry());
}

function car(kind) {
  const d = DESIGN[kind], group = new THREE.Group(); group.name = kind;
  const tools = profileTools(d, kind), S = shell(d, kind, tools);
  const body = S.body.mesh('body', 'body'), glass = S.glass.mesh('glass', 'glass'), lamps = new THREE.Group(); lamps.name = 'lamps';
  group.add(body, glass, S.trim.mesh('trim', 'trim'), lamps);
  for (const material of ['lamp_head', 'lamp_tail']) if (S[material].positions.length) lamps.add(S[material].mesh(material + '_wrap', material));
  if (S.glow_accent.positions.length) group.add(S.glow_accent.mesh('underglow_strips', 'glow_accent'));
  const parts = { [kind]: group, body, glass, lamps }, wheel = wheelGeometries(d, kind);
  const reflected = Object.fromEntries(Object.entries(wheel).map(([name, geometry]) => [name, reflectedWheel(geometry)]));
  for (const [suffix, side, axle] of [['fl', 1, 1], ['fr', -1, 1], ['rl', 1, -1], ['rr', -1, -1]]) {
    const shapes = side > 0 ? wheel : reflected;
    const mesh = new THREE.Mesh(shapes.tyre, M.tyre); mesh.name = 'wheel_' + suffix;
    mesh.position.set(side * (d.width / 2 - d.tyreWidth / 2 - 0.012), d.radius, axle * d.wheelbase / 2);
    // Reflection about local X preserves tread and spoke symmetry, and local
    // wheel rotation about X. No negative object scales enter the instancer.
    for (const [name, material] of [['rim', 'rim'], ['brake_disc', 'trim'], ['spokes', 'rim'], ['centre_cap', 'rim'], ['brake_caliper', 'trim']]) {
      const child = new THREE.Mesh(shapes[name], M[material]); child.name = name + '_' + suffix;
      child.castShadow = child.receiveShadow = true; mesh.add(child);
    }
    if (side < 0) mesh.rotation.y = Math.PI;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh); parts[mesh.name] = mesh;
  }
  lampDetails(group, lamps, d, kind, tools); hardware(group, d, kind, tools); specialDetails(group, d, kind, tools);
  let triangles = 0; group.traverse(o => { if (o.isMesh) triangles += o.geometry.attributes.position.count / 3; });
  const panels = [body, glass, group.getObjectByName('trim')];
  const panelCount = panels.reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);
  if (triangles > 4920) {
    const reduced = simplifyPanels(panels, 4920 - triangles + panelCount);
    for (let i = 0; i < panels.length; i++) {
      const original = panels[i].geometry;
      panels[i].geometry = reduced[i]; original.dispose();
    }
  }
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
  const group = new THREE.Group(); group.name = 'traffic_cars'; group.userData.parts = {};
  for (let i = 0; i < KINDS.length; i++) {
    const variant = car(KINDS[i]); variant.position.x = (i - 1) * 3.2 + 0.12;
    group.add(variant); group.userData.parts[KINDS[i]] = variant;
  }
  return group;
}
