// src/world/traffic-cars-nc.js: three more cars for the city's streets.
//
// The first three (traffic-cars.js) read as any city's traffic. These are
// the show's: a low angular wedge coupe with a louvred rear window, a heavy
// pickup with a bull bar, a roll bar and a light bar on its cab, and a tiny
// one-box bubble car with its wheels at the corners. Modelled in code with
// the codex-3d skill (GPT-6.1 Sol) to the same contract as the first three:
// lofted shells with their arches cut, the same eight material names, the
// same parts; 1,888, 1,798 and 1,750 triangles; no badge, no text, no brand.
// src/world/traffic.js merges each by material name into one instanced draw.
import * as THREE from 'three';

export const KINDS = ['wedge', 'pickup', 'micro'];
const PART_NAMES = ['body', 'glass', 'lamps', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'];
export const meta = {
  name: 'Night avenue: wedge, pickup, micro',
  size: [8.14, 1.98, 5.60],
  sizes: { wedge: [1.98, 1.14, 4.55], pickup: [2.10, 1.98, 5.60], micro: [1.50, 1.52, 2.45] },
  parts: [...KINDS, ...PART_NAMES],
  front: '+Z',
  wheelAxis: 'local X',
};

// The traffic renderer replaces these materials by NAME, including the glass.
const MATERIALS = Object.fromEntries([
  ['body', 0x777f89, 0.52, 0.28], ['trim', 0x1c222b, 0.23, 0.59],
  ['glass', 0x101d29, 0.22, 0.14], ['tyre', 0x111418, 0, 0.88],
  ['rim', 0x909da9, 0.86, 0.29], ['lamp_head', 0xe0f5ff, 0.10, 0.24],
  ['lamp_tail', 0xf42640, 0.10, 0.26], ['glow_accent', 0x20bac8, 0.15, 0.30],
].map(([name, color, metalness, roughness]) => {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
  material.name = name;
  if (name.startsWith('lamp_') || name === 'glow_accent') {
    material.emissive.setHex(color);
    material.emissiveIntensity = name === 'glow_accent' ? 1.4 : 2.3;
  }
  return [name, material];
}));

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const sub = (a, b) => a.map((v, i) => v - b[i]);
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (a, s) => a.map(v => v * s);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => scale(a, 1 / (Math.hypot(...a) || 1));
const inside = (z, range) => range && z > range[0] - 1e-8 && z < range[1] + 1e-8;
const clamp = THREE.MathUtils.clamp;
function sample(knots, z) {
  if (z <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    if (z <= knots[i][0]) return lerp(knots[i - 1][1], knots[i][1], (z - knots[i - 1][0]) / (knots[i][0] - knots[i - 1][0]));
  }
  return knots.at(-1)[1];
}

class Surface {
  constructor() { this.positions = []; this.normals = []; }
  triangle(a, b, c, normals) {
    a = a.map(Math.fround); b = b.map(Math.fround); c = c.map(Math.fround);
    const raw = cross(sub(b, a), sub(c, a));
    if (Math.hypot(...raw) < 1e-10) return;
    const n = unit(raw);
    this.positions.push(...a, ...b, ...c);
    // Keep a hard normal where a sharp underside/jamb corner crosses the smooth
    // normal's hemisphere. Normals use the same float precision as the GPU skin.
    this.normals.push(...(normals ? normals.map(v => v[0] * n[0] + v[1] * n[1] + v[2] * n[2] > 0.04 ? v : n).flat() : [...n, ...n, ...n]));
  }
  quad(a, b, c, d, normals) {
    this.triangle(a, b, c, normals && [normals[0], normals[1], normals[2]]);
    this.triangle(a, c, d, normals && [normals[0], normals[2], normals[3]]);
  }
  polygon(poly, normal) {
    if (poly.length < 3) return;
    for (let i = 1; i < poly.length - 1; i++) this.triangle(poly[0], poly[i], poly[i + 1], normal && [normal, normal, normal]);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.computeBoundingSphere();
    return g;
  }
  mesh(name, material = name) {
    const m = new THREE.Mesh(this.geometry(), MATERIALS[material]);
    m.name = name;
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}

// Convex patches REPLACE their parent faces. No decal layers or duplicate skin.
function clip(poly, plane, greater) {
  const result = [];
  const f = p => p[0] * plane[0] + p[1] * plane[1] + p[2] * plane[2] + plane[3];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = f(a), db = f(b);
    const aa = greater ? da >= -1e-10 : da <= 1e-10;
    const bb = greater ? db >= -1e-10 : db <= 1e-10;
    if (aa) result.push(a);
    if (aa !== bb) result.push(mix(a, b, da / (da - db)));
  }
  return result;
}
const rectangle = (axis, lo, hi, y0, y1) => [
  [axis === 0 ? 1 : 0, 0, axis === 2 ? 1 : 0, -lo],
  [axis === 0 ? -1 : 0, 0, axis === 2 ? -1 : 0, hi],
  [0, 1, 0, -y0], [0, -1, 0, y1],
];
function partition(regions, planes, material, inset = 0) {
  const out = [];
  for (const region of regions) {
    if (planes.some(plane => region.poly.every(p => p[0] * plane[0] + p[1] * plane[1] + p[2] * plane[2] + plane[3] < -1e-9))) {
      out.push(region); continue;
    }
    let remainder = region.poly;
    for (const plane of planes) {
      const outside = clip(remainder, plane, false);
      if (outside.length >= 3) out.push({ ...region, poly: outside });
      remainder = clip(remainder, plane, true);
      if (remainder.length < 3) break;
    }
    if (remainder.length >= 3) out.push({ poly: remainder, material, inset, borderPlanes: planes });
  }
  return out;
}
function emitRegions(regions, surfaces, normal) {
  for (const region of regions) {
    if (region.inset) {
      const direction = Math.abs(normal[0]) > 0.5 ? [Math.sign(normal[0]), 0, 0] : normal;
      const recessed = region.poly.map(p => sub(p, scale(direction, region.inset)));
      for (let j = 0; j < recessed.length; j++) {
        const k = (j + 1) % recessed.length;
        const onBorder = region.borderPlanes.some(plane => [region.poly[j], region.poly[k]].every(p => Math.abs(p[0] * plane[0] + p[1] * plane[1] + p[2] * plane[2] + plane[3]) < 1e-8));
        if (onBorder) surfaces.trim.quad(region.poly[j], region.poly[k], recessed[k], recessed[j]);
      }
      surfaces[region.material].polygon(recessed, normal);
    } else surfaces[region.material].polygon(region.poly, normal);
  }
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

function arches(d, kind) {
  return [-d.wheelbase / 2, d.wheelbase / 2].map(axle => {
    if (kind === 'pickup') return [[-0.59, d.sill], [-0.57, 0.76], [-0.39, 0.99], [0.39, 0.99], [0.57, 0.76], [0.59, d.sill]].map(([z, y]) => [axle + z, y]);
    const r = d.radius + (kind === 'micro' ? 0.044 : 0.052);
    const steps = kind === 'wedge' ? 6 : 4;
    // Only the upper semicircle is a height function. Short near-vertical jambs
    // reach the sill outside its extrema, keeping the entire tyre opening clear.
    const a = Array.from({ length: steps + 1 }, (_, i) => {
      const theta = lerp(Math.PI, 0, i / steps);
      return [axle + r * Math.cos(theta), d.radius + r * Math.sin(theta)];
    });
    return [[axle - r - 0.014, d.sill], ...a, [axle + r + 0.014, d.sill]];
  });
}

function makeShell(d, kind) {
  const surfaces = Object.fromEntries(['body', 'trim', 'glass', 'lamp_head', 'lamp_tail', 'glow_accent'].map(k => [k, new Surface()]));
  const cutouts = arches(d, kind);
  const stations = [...new Set([...d.stations, ...cutouts.flat().map(p => p[0])])].sort((a, b) => a - b);
  const floorHeight = z => kind === 'wedge' ? lerp(0.255, d.sill, clamp((z + 2.275) / (cutouts[0][0][0] + 2.275), 0, 1)) : d.sill;
  const archHeight = z => {
    for (const points of cutouts) if (inside(z, [points[0][0], points.at(-1)[0]])) return sample(points, z);
    return floorHeight(z);
  };
  const bubble = kind === 'micro';
  const rings = stations.map(z => {
    const w = sample(d.widths, z), rw = sample(d.roofs, z), top = sample(d.top, z), arch = archHeight(z);
    const waist = Math.min(sample(d.waist, z), top - 0.04);
    const deck = Math.min(waist + (bubble ? 0.055 : 0.065), top - 0.022);
    const inboard = w - d.tyreWidth - 0.058;
    const lowerX = kind === 'wedge' && z > 2.10 ? lerp(w - 0.022, w + 0.025, (z - 2.10) / 0.175) : w - 0.022;
    const side = [[inboard, arch, z], [lowerX, arch, z], [w, waist, z], [w - (bubble ? 0.042 : 0.08), deck, z]];
    if (bubble) side.push([lerp(w - 0.042, rw, 0.25), lerp(deck, top, 0.57), z]);
    side.push([rw, top - (bubble ? Math.min(0.065, (top - deck) * 0.20) : 0.014), z]);
    return [[0, floorHeight(z), z], ...side, [0, top, z], ...side.slice().reverse().map(p => [-p[0], p[1], p[2]])];
  });
  const N = rings[0].length, middle = N / 2;
  const point = (i, e, u) => mix(rings[i][e], rings[i][(e + 1) % N], u);
  function stripNormal(i, e, u) {
    let along = [0, 0, 0], count = 0;
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= stations.length) continue;
      // Average tangent DIRECTIONS, so a nearly vertical arch jamb cannot
      // overturn the underside's shading normal at its adjacent shallow panel.
      along = add(along, unit(scale(sub(point(j, e, u), point(i, e, u)), 1 / (stations[j] - stations[i])))); count++;
    }
    let tangent = sub(rings[i][(e + 1) % N], rings[i][e]);
    // Blend normals across the micro's two canopy facets; other creases stay hard.
    if (bubble && e >= 4 && e <= N - 5) {
      const prev = sub(rings[i][e], rings[i][(e + N - 1) % N]);
      const next = sub(rings[i][(e + 2) % N], rings[i][(e + 1) % N]);
      const n0 = unit(add(unit(tangent), unit(prev))), n1 = unit(add(unit(tangent), unit(next)));
      tangent = mix(n0, n1, u);
    }
    return unit(cross(tangent, scale(along, 1 / count)));
  }
  function strip(i, e, a, b, c, f, material, patch) {
    let p = [point(i, e, a), point(i, e, b), point(i + 1, e, f), point(i + 1, e, c)];
    let normals = [stripNormal(i, e, a), stripNormal(i, e, b), stripNormal(i + 1, e, f), stripNormal(i + 1, e, c)];
    // Reverse both winding and diagonal on the left, preserving exact symmetry
    // even where an arch makes a four-corner panel slightly nonplanar.
    if (e >= middle) { p = [p[1], p[2], p[3], p[0]]; normals = [normals[1], normals[2], normals[3], normals[0]]; }
    if (!patch) surfaces[material].quad(...p, normals);
    else {
      // Clip triangles individually so patch boundaries retain the loft's surface.
      for (const ids of [[0, 1, 2], [0, 2, 3]]) {
        const poly = ids.map(j => p[j]);
        const n = unit(cross(sub(poly[1], poly[0]), sub(poly[2], poly[0])));
        emitRegions(patch([{ poly, material }]), surfaces, n);
      }
    }
  }
  function sideBand(i, e, a, b, c, f, material, patch) {
    if (e < middle) strip(i, e, a, b, c, f, material, patch);
    else strip(i, e, 1 - b, 1 - a, 1 - f, 1 - c, material, patch);
  }
  function flankPatch(regions, z) {
    const rect = (z0, z1, y0, y1, material = 'trim', inset = 0) => {
      regions = partition(regions, rectangle(2, z0, z1, y0, y1), material, inset);
    };
    if (kind === 'wedge') {
      if (z > -0.42 && z < 0.74) {
        rect(-0.345, -0.335, 0.32, 1.2); rect(0.625, 0.635, 0.32, 1.2);
        rect(-0.335, 0.625, 0.32, 0.329);
      }
      if (z > -1.00 && z < -0.24) {
        // Swept mouth ahead of the rear wheel. Four sloping planes cut a duct.
        regions = partition(regions, [[0, 0, 1, 0.92], [0, 0, -1, -0.39], [0, 1, -0.16, -0.59], [0, -1, 0, 0.711]], 'trim', 0.032);
      }
      if (z > -0.94 && z < 0.94) rect(-0.94, 0.94, 0.208, 0.22, 'glow_accent');
    } else if (kind === 'pickup') {
      if (z > -1.12 && z < 1.24) {
        for (const x of [-0.88, -0.077, 1.04]) rect(x, x + 0.013, 0.59, 1.50);
        rect(-0.88, 1.053, 0.589, 0.602);
      }
      if (z < -2.43) rect(-2.60, -2.585, 0.65, 1.35);
    } else {
      if (z > -0.75 && z < 0.75) {
        for (const x of [-0.54, 0.526]) rect(x, x + 0.014, 0.36, 1.7);
        rect(-0.54, 0.54, 0.36, 0.372);
      }
      if (z > me - 0.08) rect(me - 0.015, 1.23, 0.621, 0.655, 'lamp_head');
      if (z < -me + 0.08) rect(-1.23, -me + 0.015, 0.621, 0.655, 'lamp_tail');
    }
    return regions;
  }
  function windowPatch(regions, z) {
    for (const range of d.pillars) {
      if (z > range[0] - 0.5 && z < range[1] + 0.5) regions = partition(regions, rectangle(2, ...range, 0, 3), 'trim');
    }
    return regions;
  }

  for (let i = 0; i < stations.length - 1; i++) {
    const z = (stations[i] + stations[i + 1]) / 2;
    for (const e of [0, 1, N - 2, N - 1]) strip(i, e, 0, 1, 0, 1, 'trim');
    for (const e of [2, N - 3]) {
      const right = e === 2, a = [rings[i][right ? 2 : N - 2], rings[i + 1][right ? 2 : N - 2]];
      const b = [rings[i][right ? 3 : N - 3], rings[i + 1][right ? 3 : N - 3]];
      const lip = a.map((p, k) => clamp((kind === 'pickup' ? 0.05 : bubble ? 0.029 : 0.025) / (b[k][1] - p[1]), 0, 0.62));
      sideBand(i, e, 0, lip[0], 0, lip[1], 'trim');
      sideBand(i, e, lip[0], 1, lip[1], 1, 'body', regions => flankPatch(regions, z));
    }
    for (const e of [3, N - 4]) strip(i, e, 0, 1, 0, 1, 'body');
    const upperEdges = bubble ? [4, 5, N - 6, N - 5] : [4, N - 5];
    const isBed = kind === 'pickup' && inside(z, d.bed);
    for (const e of upperEdges) {
      if (isBed) { strip(i, e, 0, 1, 0, 1, 'body'); continue; }
      if (!inside(z, d.glassRange)) { strip(i, e, 0, 1, 0, 1, 'body'); continue; }
      const right = e < middle, lowIndex = right ? e : (e + 1) % N, highIndex = right ? e + 1 : e;
      const gaps = [0, 1].map(k => rings[i + k][highIndex][1] - rings[i + k][lowIndex][1]);
      const lowerFacet = !bubble || e === 4 || e === N - 5;
      const upperFacet = !bubble || e === 5 || e === N - 6;
      const bottom = gaps.map(g => lowerFacet ? clamp((kind === 'pickup' ? 0.10 : 0.058) / g, 0, 0.5) : 0);
      const top = gaps.map(g => upperFacet ? clamp(1 - (kind === 'pickup' ? 0.10 : 0.055) / g, 0.5, 1) : 1);
      sideBand(i, e, 0, bottom[0], 0, bottom[1], 'body');
      sideBand(i, e, bottom[0], top[0], bottom[1], top[1], 'glass', d.pillars.length ? regions => windowPatch(regions, z) : undefined);
      sideBand(i, e, top[0], 1, top[1], 1, 'body');
    }
    if (isBed) {
      // The tyres enter the bed volume: inner wheel housings lift only the outer
      // shelves, leaving a flat, usable central floor and a sealed underside.
      const interior = k => {
        const r = rings[k], x = r[middle - 1][0], y = r[middle - 1][1];
        const floor = 0.79, shelf = Math.max(floor, archHeight(stations[k]) + 0.037), inner = 0.655;
        return [[x, y, stations[k]], [x, shelf, stations[k]], [inner, shelf, stations[k]], [inner, floor, stations[k]], [-inner, floor, stations[k]], [-inner, shelf, stations[k]], [-x, shelf, stations[k]], [-x, y, stations[k]]];
      };
      const a = interior(i), b = interior(i + 1);
      for (let j = 0; j < a.length - 1; j++) surfaces.trim.quad(a[j], a[j + 1], b[j + 1], b[j]);
    } else {
      for (const e of [middle - 1, middle]) {
        if (d.roofGlass.some(range => inside(z, range))) {
          const margin = [i, i + 1].map(k => 0.042 / Math.abs(rings[k][middle - 1][0]));
          if (e === middle - 1) {
            strip(i, e, 0, margin[0], 0, margin[1], 'trim');
            strip(i, e, margin[0], 1, margin[1], 1, 'glass');
          } else {
            strip(i, e, 0, 1 - margin[0], 0, 1 - margin[1], 'glass');
            strip(i, e, 1 - margin[0], 1, 1 - margin[1], 1, 'trim');
          }
        } else strip(i, e, 0, 1, 0, 1, 'body');
      }
    }
  }
  if (d.bed) {
    for (const [z, front] of [[d.bed[0], true], [d.bed[1], false]]) {
      const i = stations.indexOf(z), r = rings[i], x = r[middle - 1][0];
      let p = [[-x, 0.79, z], [x, 0.79, z], r[middle - 1], r[middle], r[middle + 1]];
      if (!front) p = p.reverse();
      surfaces.trim.polygon(p);
    }
  }
  endCap(rings[0], false, d, kind, surfaces);
  endCap(rings.at(-1), true, d, kind, surfaces);
  return surfaces;
}

function endCap(ring, front, d, kind, surfaces) {
  let regions = [{ poly: front ? ring.slice() : ring.slice().reverse(), material: 'body' }];
  const patch = (x0, x1, y0, y1, material, inset = 0) => { regions = partition(regions, rectangle(0, x0, x1, y0, y1), material, inset); };
  patch(-2, 2, 0, kind === 'pickup' ? 0.64 : kind === 'micro' ? 0.31 : 0.32, 'trim');
  if (kind === 'pickup' && front) {
    patch(-0.815, 0.815, 0.716, 1.057, 'trim');
  } else if (kind === 'wedge') {
    patch(-0.69, 0.69, front ? 0.329 : 0.332, front ? 0.367 : 0.43, 'trim', 0.009);
  } else if (kind === 'micro') patch(-0.49, 0.49, 0.385, 0.425, 'trim', 0.007);
  if (kind === 'pickup' && !front) {
    patch(-0.865, 0.865, 0.673, 0.688, 'trim');
    for (const x of [-0.865, 0.852]) patch(x, x + 0.013, 0.673, 1.25, 'trim');
    patch(-0.20, 0.20, 1.21, 1.242, 'trim');
  }
  const [y, h, w] = front ? d.head : d.tail;
  patch(-w / 2 - 0.013, w / 2 + 0.013, y - h / 2 - 0.012, y + h / 2 + 0.012, 'trim');
  patch(-w / 2, w / 2, y - h / 2, y + h / 2, front ? 'lamp_head' : 'lamp_tail');
  const normal = [0, 0, front ? 1 : -1];
  for (const region of regions) {
    // End contours can be concave; ear clipping also keeps the roof crown intact.
    const faces = THREE.ShapeUtils.triangulateShape(region.poly.map(p => new THREE.Vector2(p[0], p[1])), []);
    for (const face of faces) {
      const poly = face.map(i => region.poly[i]);
      const n = cross(sub(poly[1], poly[0]), sub(poly[2], poly[0]));
      if (n[2] * normal[2] < 0) poly.reverse();
      emitRegions([{ ...region, poly }], surfaces, normal);
    }
  }
}

function wheelGeometries(d, kind) {
  const tyre = new Surface(), rim = new Surface(), vents = new Surface();
  const n = d.segments, r = d.radius, w = d.tyreWidth;
  const bead = kind === 'pickup' ? 0.61 : 0.74;
  const profiles = [[-w / 2, r * bead], [-w * 0.33, r], [w * 0.33, r], [w / 2, r * bead]];
  const p = (profile, i) => {
    // Opposite shoulder notches form alternating tread ridges in the existing
    // triangles. The truck retains its nominal radius and ground contact.
    const groove = kind === 'pickup' && ((profile === profiles[1] && i % 2) || (profile === profiles[2] && !(i % 2)));
    const radius = profile[1] * (groove ? 0.97 : 1);
    return [profile[0], radius * Math.cos(i * 2 * Math.PI / n), radius * Math.sin(i * 2 * Math.PI / n)];
  };
  const slopes = [[-1, 0.20], [-0.28, 1], [0.28, 1], [1, 0.20]];
  const normal = (j, i) => unit([slopes[j][0], slopes[j][1] * Math.cos(i * 2 * Math.PI / n), slopes[j][1] * Math.sin(i * 2 * Math.PI / n)]);
  for (let j = 0; j < 3; j++) for (let i = 0; i < n; i++) {
    tyre.quad(p(profiles[j], i), p(profiles[j], i + 1), p(profiles[j + 1], i + 1), p(profiles[j + 1], i), kind === 'pickup' && j === 1 ? undefined : [normal(j, i), normal(j, i + 1), normal(j + 1, i + 1), normal(j + 1, i)]);
  }
  // The front and back rim faces close these bead rings. An inner tyre cylinder
  // would be an invisible third face on their shared edges after material merge.
  const disc = [[w / 2, r * bead], [w / 2 - 0.022, r * (kind === 'pickup' ? 0.48 : 0.60)], [w / 2 - 0.003, r * (kind === 'micro' ? 0.27 : kind === 'pickup' ? 0.22 : 0.18)]];
  for (let i = 0; i < n; i++) {
    rim.quad(p(disc[0], i), p(disc[0], i + 1), p(disc[1], i + 1), p(disc[1], i));
    const face = kind === 'micro' ? (i % 7 === 0 ? vents : rim) : (i % 2 ? vents : rim);
    face.quad(p(disc[1], i), p(disc[1], i + 1), p(disc[2], i + 1), p(disc[2], i));
    rim.triangle(p(disc[2], i), p(disc[2], i + 1), [disc[2][0], 0, 0]);
    rim.triangle(p([-w / 2, r * bead], i + 1), p([-w / 2, r * bead], i), [-w / 2, 0, 0]);
  }
  return { tyre: tyre.geometry(), rim: rim.geometry(), vents: vents.geometry() };
}

function reflectedWheel(geometry) {
  const g = geometry.clone();
  for (const name of ['position', 'normal']) {
    const a = g.attributes[name].array;
    for (let i = 0; i < a.length; i += 3) a[i + 2] = -a[i + 2];
    for (let i = 0; i < a.length; i += 9) for (let j = 0; j < 3; j++) {
      const t = a[i + 3 + j]; a[i + 3 + j] = a[i + 6 + j]; a[i + 6 + j] = t;
    }
  }
  g.computeBoundingSphere();
  return g;
}

// Closed low-sided pipes with mitered bends. Ring frames share a fixed binormal.
function pipe(points, radius, sides = 6) {
  const s = new Surface();
  const tangents = points.map((p, i) => unit(sub(points[Math.min(i + 1, points.length - 1)], points[Math.max(0, i - 1)])));
  const rings = points.map((p, i) => {
    const u = unit(cross(tangents[i], [0, 0, 1])), v = unit(cross(tangents[i], u));
    return Array.from({ length: sides }, (_, j) => add(p, scale(add(scale(u, Math.cos(j * 2 * Math.PI / sides)), scale(v, Math.sin(j * 2 * Math.PI / sides))), radius)));
  });
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
    const k = (j + 1) % sides;
    s.quad(rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]);
  }
  s.polygon(rings[0].slice().reverse()); s.polygon(rings.at(-1));
  return s;
}

// Extrude a small convex profile along X. Used for shaped hardware, not hulls.
function crossbar(profile, halfWidth, surface = new Surface()) {
  let area = 0;
  for (let i = 0; i < profile.length; i++) { const j = (i + 1) % profile.length; area += profile[i][0] * profile[j][1] - profile[j][0] * profile[i][1]; }
  if (area < 0) profile = profile.slice().reverse();
  const a = profile.map(([y, z]) => [-halfWidth, y, z]), b = profile.map(([y, z]) => [halfWidth, y, z]);
  for (let i = 0; i < a.length; i++) { const j = (i + 1) % a.length; surface.quad(a[i], a[j], b[j], b[i]); }
  surface.polygon(a.slice().reverse()); surface.polygon(b);
  return surface;
}

function wedgeDetails(group, d) {
  const louvers = new Surface();
  group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  const skin = ['body', 'glass', 'trim'].map(name => group.getObjectByName(name));
  const height = (x, z) => {
    ray.ray.origin.set(x, 2, z);
    return ray.intersectObjects(skin, false)[0].point.y;
  };
  for (const z of [-1.245, -1.025, -0.805]) {
    // Three transverse rings conform the bottom to BOTH planes of the glass.
    // The louvre ends sit on its trim frame, without projecting into the flank.
    const rings = [-1, 0, 1].map(fraction => [[z, 0], [z, 0.023], [z + 0.057, 0.027], [z + 0.057, 0]].map(([zz, lift]) => {
      const rw = sample(d.roofs, zz), x = fraction * (rw - 0.004);
      return [x, height(x, zz) + lift, zz];
    }));
    for (let k = 0; k < 2; k++) for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4; louvers.quad(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]);
    }
    louvers.polygon(rings[0].slice().reverse()); louvers.polygon(rings[2]);
  }
  group.add(louvers.mesh('rear_louvres', 'trim'));
  const diffuser = new Surface();
  const end = arches(d, 'wedge')[0][0][0];
  for (const x of [-0.48, 0, 0.48]) {
    const rearY = lerp(0.255, d.sill, 0.005 / (end + 2.275));
    const fin = crossbar([[d.sill, -2.27], [rearY, -2.27], [d.sill, end]], 0.012);
    for (let j = 0; j < fin.positions.length; j += 3) fin.positions[j] += x;
    diffuser.positions.push(...fin.positions); diffuser.normals.push(...fin.normals);
  }
  group.add(diffuser.mesh('diffuser_fins', 'trim'));
}

function pickupDetails(group, d) {
  const guardZ = 2.8 - Math.sqrt(3) * 0.037 / 2;
  group.add(pipe([[-0.83, 0.565, 2.73], [-0.83, 0.88, guardZ], [-0.70, 0.99, guardZ], [0.70, 0.99, guardZ], [0.83, 0.88, guardZ], [0.83, 0.565, 2.73]], 0.037).mesh('bull_bar', 'trim'));
  group.add(pipe([[-0.895, 1.282, -1.135], [-0.895, 1.69, -1.135], [-0.70, 1.81, -1.135], [0.70, 1.81, -1.135], [0.895, 1.69, -1.135], [0.895, 1.282, -1.135]], 0.052).mesh('bed_roll_bar', 'trim'));
  const boards = new Surface();
  for (const sign of [-1, 1]) {
    const section = [[0.948, 0.39], [1.047, 0.39], [1.047, 0.43], [1.012, 0.465], [0.948, 0.465]];
    const a = section.map(([x, y]) => [sign * x, y, -1.05]), b = section.map(([x, y]) => [sign * x, y, 1.05]);
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length, q = [a[i], a[j], b[j], b[i]];
      if (sign < 0) q.reverse(); boards.quad(...q);
    }
    boards.polygon(sign > 0 ? a.slice().reverse() : a); boards.polygon(sign > 0 ? b : b.slice().reverse());
  }
  group.add(boards.mesh('running_boards', 'trim'));
  const grille = new Surface();
  for (const y of [0.77, 0.883, 0.996]) crossbar([[y - 0.017, 2.72], [y, 2.746], [y + 0.017, 2.72]], 0.756, grille);
  group.add(grille.mesh('grille_slats', 'trim'));
  const housing = new Surface(), light = new Surface();
  // Flush teal front face in a chamfered roof housing; no headlamp material here.
  const profile = [[0, 0.385], [1.914, 0.385], [1.962, 0.405], [1.98, 0.44], [1.98, 0.50], [1.96, 0.535], [0, 0.535]];
  const rings = [-0.71, 0, 0.71].map(x => profile.map(([y, z], i) => [x, i === 0 || i === 6 ? sample(d.top, z) - 0.014 * Math.abs(x) / sample(d.roofs, z) : y, z]));
  for (let k = 0; k < 2; k++) for (let i = 0; i < profile.length; i++) {
    const j = (i + 1) % profile.length;
    (i === 5 ? light : housing).quad(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]);
  }
  housing.polygon(rings[0].slice().reverse()); housing.polygon(rings[2]);
  group.add(housing.mesh('roof_bar_housing', 'trim'), light.mesh('roof_light_bar', 'glow_accent'));
}

function microDetails(group, d) {
  const s = new Surface(), signal = new Surface();
  const contour = [[-0.14, -0.25], [0.14, -0.25], [0.19, -0.20], [0.19, 0.08], [0.14, 0.13], [-0.14, 0.13], [-0.19, 0.08], [-0.19, -0.20]];
  const bottom = contour.map(([x, z]) => [x, sample(d.top, z) - 0.065 * Math.abs(x) / sample(d.roofs, z), z]);
  const top = contour.map(([x, z]) => [x * 0.80, 1.52, (z + 0.06) * 0.85 - 0.06]);
  for (let i = 0; i < contour.length; i++) {
    const j = (i + 1) % contour.length, poly = [bottom[i], top[i], top[j], bottom[j]];
    if (i === 4) {
      const regions = partition([{ poly, material: 'trim' }], rectangle(0, -0.08, 0.08, 1.487, 1.501), 'glow_accent');
      emitRegions(regions, { trim: s, glow_accent: signal }, unit(cross(sub(poly[1], poly[0]), sub(poly[2], poly[0]))));
    } else s.quad(...poly);
  }
  s.polygon(clip(bottom, [1, 0, 0, 0], true)); s.polygon(clip(bottom, [1, 0, 0, 0], false)); s.polygon(top.slice().reverse());
  group.add(s.mesh('roof_pod', 'trim'), signal.mesh('roof_pod_signal', 'glow_accent'));
}

function car(kind) {
  const d = DESIGN[kind], group = new THREE.Group(); group.name = kind;
  const surfaces = makeShell(d, kind), body = surfaces.body.mesh('body'), glass = surfaces.glass.mesh('glass');
  const lamps = new THREE.Group(); lamps.name = 'lamps';
  for (const key of ['lamp_head', 'lamp_tail']) lamps.add(surfaces[key].mesh(key));
  group.add(body, glass, surfaces.trim.mesh('trim'), lamps);
  if (surfaces.glow_accent.positions.length) group.add(surfaces.glow_accent.mesh('underglow_strips', 'glow_accent'));
  const parts = { [kind]: group, body, glass, lamps };
  const wheel = wheelGeometries(d, kind);
  const rightWheel = Object.fromEntries(Object.entries(wheel).map(([key, geometry]) => [key, reflectedWheel(geometry)]));
  for (const [suffix, side, axle] of [['fl', 1, 1], ['fr', -1, 1], ['rl', 1, -1], ['rr', -1, -1]]) {
    const shapes = side > 0 ? wheel : rightWheel;
    const mesh = new THREE.Mesh(shapes.tyre, MATERIALS.tyre); mesh.name = 'wheel_' + suffix;
    mesh.position.set(side * (d.width / 2 - d.tyreWidth / 2 - 0.012), d.radius, axle * d.wheelbase / 2);
    if (side < 0) mesh.rotation.y = Math.PI;
    for (const [key, material] of [['rim', 'rim'], ['vents', 'trim']]) {
      const m = new THREE.Mesh(shapes[key], MATERIALS[material]); m.name = (key === 'rim' ? 'rim_' : 'rim_vents_') + suffix;
      m.castShadow = m.receiveShadow = true; mesh.add(m);
    }
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh); parts[mesh.name] = mesh;
  }
  if (kind === 'wedge') wedgeDetails(group, d);
  else if (kind === 'pickup') pickupDetails(group, d);
  else microDetails(group, d);
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
  // Equal 3.2 m centre spacing, with the complete preview's bounds centred on X.
  for (let i = 0; i < KINDS.length; i++) {
    const variant = car(KINDS[i]); variant.position.x = (i - 1) * 3.2 + 0.12;
    group.add(variant); group.userData.parts[KINDS[i]] = variant;
  }
  return group;
}
