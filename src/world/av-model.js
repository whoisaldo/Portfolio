// src/world/av-model.js: the aerial vehicle the city's traffic flies.
//
// An original design (a wedge hull, a fighter canopy into a fastback, four
// ducted fans on swept pylons, lamp bars, magenta sills), modelled in code
// with the codex-3d skill (GPT-6.1 Sol) from the brief in the design README
// and reviewed against its renders. 2,424 triangles. src/world/traffic.js
// merges it by material name into one instanced draw with its own night
// shader; the materials here only carry the names.
import * as THREE from 'three';

export const meta = {
  name: 'Sable AV',
  size: [3.645, 1.15, 5.208],
  parts: ['hull', 'canopy', 'pod_fl', 'pod_fr', 'pod_rl', 'pod_rr', 'lamps'],
};

const TAU = Math.PI * 2;
const DUCT_SEGMENTS = 20;
const HUB_SEGMENTS = 8;
const POD_DEPTH = 0.35;
const POD_TILT = THREE.MathUtils.degToRad(10);
const DUCT_WALL = 0.05;
const CANOPY_START = 2;
const CANOPY_END = 10;

// z, half width, shoulder height, crown height. Front is +Z.
// The pinched corners give the ducts clearance without widening the vehicle.
const STATIONS = [
  [-2.60, 0.650, 0.520, 0.535],
  [-2.24, 0.650, 0.580, 0.595],
  [-1.90, 0.670, 0.620, 0.635],
  [-1.42, 0.770, 0.650, 0.790],
  [-0.88, 0.910, 0.650, 0.920],
  [-0.36, 0.990, 0.630, 1.060],
  [ 0.18, 1.000, 0.590, 1.150],
  [ 0.60, 0.980, 0.550, 1.100],
  [ 1.12, 0.915, 0.490, 0.760],
  [ 1.42, 0.855, 0.440, 0.500],
  [ 1.60, 0.830454545, 0.403181818, 0.423181818],
  [ 1.86, 0.795, 0.350, 0.370],
  [ 2.25, 0.775, 0.275, 0.290],
  [ 2.60, 0.770, 0.235, 0.250],
];

function makeHullRings() {
  return STATIONS.map(([z, w, base, roof]) => {
    const c = w * 0.60;
    const rise = roof - base;
    const right = [
      [0, roof, z],
      [c * 0.40, base + rise * 0.93, z],
      [c * 0.80, base + rise * 0.65, z],
      [c, base, z],
      [w * 0.93, base - 0.045, z],
      [w, base * 0.56, z],
      [w * 0.965, 0.080, z],
      [w * 0.830, 0, z],
      [0, 0, z],
    ];
    return right.concat(right.slice(1, 8).reverse().map(([x, y, zz]) => [-x, y, zz]));
  });
}

function geometry(positions, indices, normals) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  if (normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  else g.computeVertexNormals();
  // All meshes have the same indexed position/normal layout for material merging.
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

function loft(rings, columns, reverse = false, symmetric = false) {
  const p = [], ix = [];
  const cols = columns.length;
  for (const row of rings) for (const c of columns) p.push(...row[c]);
  for (let r = 0; r < rings.length - 1; r++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = r * cols + j, b = a + 1, c = a + cols, d = c + 1;
      if (symmetric && j >= (cols - 1) / 2) ix.push(a, c, d, a, d, b);
      else if (reverse) ix.push(a, b, c, b, d, c);
      else ix.push(a, c, b, b, c, d);
    }
  }
  return geometry(p, ix);
}

function mirrorX(g) {
  const p = [], n = [], ix = [];
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  for (let k = 0; k < pos.count; k++) {
    p.push(-pos.getX(k), pos.getY(k), pos.getZ(k));
    n.push(-nor.getX(k), nor.getY(k), nor.getZ(k));
  }
  for (let k = 0; k < g.index.count; k += 3) {
    ix.push(g.index.getX(k), g.index.getX(k + 2), g.index.getX(k + 1));
  }
  return geometry(p, ix, n);
}

function sliceRows(g, columns, from, to) {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const p = [], n = [], ix = [];
  for (let r = from; r <= to; r++) {
    for (let j = 0; j < columns; j++) {
      const k = r * columns + j;
      p.push(pos.getX(k), pos.getY(k), pos.getZ(k));
      n.push(nor.getX(k), nor.getY(k), nor.getZ(k));
    }
  }
  const start = from * (columns - 1) * 6;
  const end = to * (columns - 1) * 6;
  for (let k = start; k < end; k++) ix.push(g.index.getX(k) - from * columns);
  return geometry(p, ix, n);
}

function combine(pieces) {
  const p = [], n = [], ix = [];
  let offset = 0;
  for (const g of pieces) {
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
    for (let k = 0; k < pos.count; k++) {
      p.push(pos.getX(k), pos.getY(k), pos.getZ(k));
      n.push(nor.getX(k), nor.getY(k), nor.getZ(k));
    }
    for (let k = 0; k < g.index.count; k++) ix.push(g.index.getX(k) + offset);
    offset += pos.count;
  }
  return geometry(p, ix, n);
}

function endCap(ring, front) {
  const shape = ring.map(([x, y]) => new THREE.Vector2(x, y));
  const faces = THREE.ShapeUtils.triangulateShape(shape, []);
  const p = ring.flat(), ix = [], n = [];
  for (let i = 0; i < ring.length; i++) n.push(0, 0, front ? 1 : -1);
  for (let [a, b, c] of faces) {
    const pa = ring[a], pb = ring[b], pc = ring[c];
    const area = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
    if ((area > 0) !== front) [b, c] = [c, b];
    ix.push(a, b, c);
  }
  return geometry(p, ix, n);
}

// Clip existing surface triangles rather than approximating a curved panel with
// a straight strip. This keeps the lamps and trim a measured 4 mm proud.
function surfaceStrip(source, planes, offset) {
  const p = [], n = [], ix = [];
  const pos = source.getAttribute('position'), nor = source.getAttribute('normal');
  for (let t = 0; t < source.index.count; t += 3) {
    let polygon = [0, 1, 2].map(j => {
      const k = source.index.getX(t + j);
      return { p: [pos.getX(k), pos.getY(k), pos.getZ(k)],
        n: [nor.getX(k), nor.getY(k), nor.getZ(k)] };
    });
    for (const [axis, bound, sign] of planes) {
      const out = [];
      for (let j = 0; j < polygon.length; j++) {
        const a = polygon[j], b = polygon[(j + 1) % polygon.length];
        const da = sign * (a.p[axis] - bound), db = sign * (b.p[axis] - bound);
        if (da >= 0) out.push(a);
        if ((da >= 0) !== (db >= 0)) {
          const v = da / (da - db);
          out.push({ p: a.p.map((x, k) => x + (b.p[k] - x) * v),
            n: a.n.map((x, k) => x + (b.n[k] - x) * v) });
        }
      }
      polygon = out;
      if (polygon.length < 3) break;
    }
    if (polygon.length < 3) continue;
    const base = p.length / 3;
    for (const v of polygon) {
      p.push(...v.p.map((x, k) => x + offset[k]));
      const len = Math.hypot(...v.n);
      n.push(...v.n.map(x => x / len));
    }
    for (let j = 1; j < polygon.length - 1; j++) {
      const a = polygon[0].p, b = polygon[j].p, c = polygon[j + 1].p;
      const ab = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
      const ac = new THREE.Vector3(...c).sub(new THREE.Vector3(...a));
      if (ab.cross(ac).lengthSq() > 1e-18) ix.push(base, base + j, base + j + 1);
    }
  }
  return geometry(p, ix, n);
}

function canopySill(rings, left) {
  const p = [], ix = [];
  const a = left ? 13 : 3, b = left ? 14 : 2;
  for (let row = CANOPY_START; row <= CANOPY_END; row++) {
    const outer = rings[row][a], inner = rings[row][b];
    const v = 0.022 / Math.hypot(...inner.map((x, k) => x - outer[k]));
    p.push(outer[0], outer[1] + 0.004, outer[2]);
    p.push(...outer.map((x, k) => x + (inner[k] - x) * v + (k === 1 ? 0.004 : 0)));
  }
  for (let row = 0; row < CANOPY_END - CANOPY_START; row++) {
    const a0 = row * 2, b0 = a0 + 1, c0 = a0 + 2, d0 = a0 + 3;
    if (left) ix.push(a0, c0, b0, b0, c0, d0);
    else ix.push(a0, b0, c0, b0, d0, c0);
  }
  return geometry(p, ix);
}

// Smooth around the circumference. Shroud profile edges have separate vertices
// so the straight skins, flat lips and tiny exterior chamfers keep hard normals.
function revolve(profile, segments, closed, crisp = false) {
  if (crisp) {
    const p = [], n = [], ix = [];
    for (let j = 0; j < profile.length - (closed ? 0 : 1); j++) {
      const a = profile[j], b = profile[(j + 1) % profile.length];
      const dr = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dr, dy), nr = dy / len, ny = -dr / len;
      const base = p.length / 3;
      for (const [r, y] of [a, b]) {
        for (let k = 0; k < segments; k++) {
          const t = k * TAU / segments, c = Math.cos(t), s = Math.sin(t);
          p.push(r * c, y, r * s); n.push(nr * c, ny, nr * s);
        }
      }
      for (let k = 0; k < segments; k++) {
        const next = (k + 1) % segments;
        ix.push(base + k, base + segments + k, base + next,
          base + next, base + segments + k, base + segments + next);
      }
    }
    return geometry(p, ix, n);
  }
  const p = [], n = [], ix = [], rows = [];
  const count = profile.length;
  for (let j = 0; j < count; j++) {
    const [r, y] = profile[j];
    const prev = profile[j === 0 ? (closed ? count - 1 : 0) : j - 1];
    const next = profile[j === count - 1 ? (closed ? 0 : j) : j + 1];
    let nr = 0, ny = 0;
    for (const [dr, dy] of [[r - prev[0], y - prev[1]], [next[0] - r, next[1] - y]]) {
      const len = Math.hypot(dr, dy);
      if (len > 0) { nr += dy / len; ny -= dr / len; }
    }
    const len = Math.hypot(nr, ny);
    nr /= len; ny /= len;
    if (r === 0) {
      rows.push({ base: p.length / 3, pole: true });
      p.push(0, y, 0); n.push(0, Math.sign(ny), 0);
    } else {
      rows.push({ base: p.length / 3, pole: false });
      for (let k = 0; k < segments; k++) {
        const t = k * TAU / segments, c = Math.cos(t), s = Math.sin(t);
        p.push(r * c, y, r * s); n.push(nr * c, ny, nr * s);
      }
    }
  }
  for (let j = 0; j < count - (closed ? 0 : 1); j++) {
    const a = rows[j], b = rows[(j + 1) % count];
    for (let k = 0; k < segments; k++) {
      const next = (k + 1) % segments;
      if (a.pole) ix.push(a.base, b.base + k, b.base + next);
      else if (b.pole) ix.push(a.base + k, b.base, a.base + next);
      else ix.push(a.base + k, b.base + k, a.base + next,
        a.base + next, b.base + k, b.base + next);
    }
  }
  return geometry(p, ix, n);
}

function polygonRadius(radius, segments, angle) {
  const step = TAU / segments;
  const a = ((angle % TAU) + TAU) % TAU;
  const mid = (Math.floor(a / step) + 0.5) * step;
  return radius * Math.cos(step / 2) / Math.cos(a - mid);
}

function polygonLeftX(radius, z) {
  const angle = Math.PI - Math.asin(THREE.MathUtils.clamp(z / radius, -1, 1));
  const k = Math.floor(angle / TAU * DUCT_SEGMENTS);
  const a = k * TAU / DUCT_SEGMENTS, b = (k + 1) * TAU / DUCT_SEGMENTS;
  const za = radius * Math.sin(a), zb = radius * Math.sin(b);
  const v = (z - za) / (zb - za);
  return radius * (Math.cos(a) + (Math.cos(b) - Math.cos(a)) * v);
}

function hubProfile(h) {
  return [[0, 0.083], [h * 0.85, 0.110], [h, 0.170],
    [h * 0.65, 0.225], [0, 0.260]];
}

function hubRadiusAt(y, h) {
  const profile = hubProfile(h);
  for (let j = 0; j < profile.length - 1; j++) {
    const a = profile[j], b = profile[j + 1];
    if (y >= a[1] && y <= b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]);
  }
  return 0;
}

function exhaustDisc(radius, hub) {
  const outer = [], inner = [];
  for (let k = 0; k < DUCT_SEGMENTS; k++) {
    const t = k * TAU / DUCT_SEGMENTS;
    outer.push(new THREE.Vector2((radius - DUCT_WALL) * Math.cos(t),
      (radius - DUCT_WALL) * Math.sin(t)));
  }
  for (let k = HUB_SEGMENTS - 1; k >= 0; k--) {
    const t = k * TAU / HUB_SEGMENTS;
    const r = hubRadiusAt(0.110, hub);
    inner.push(new THREE.Vector2(r * Math.cos(t), r * Math.sin(t)));
  }
  const faces = THREE.ShapeUtils.triangulateShape(outer, [inner]);
  const contour = outer.concat(inner), p = [], n = [], ix = [];
  for (const v of contour) { p.push(v.x, 0.110, v.y); n.push(0, -1, 0); }
  for (let [a, b, c] of faces) {
    const pa = contour[a], pb = contour[b], pc = contour[c];
    if ((pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x) < 0) [b, c] = [c, b];
    ix.push(a, b, c);
  }
  return geometry(p, ix, n);
}

function fanBlades(radius, hub) {
  const p = [], ix = [];
  for (let blade = 0; blade < 8; blade++) {
    const t = blade * TAU / 8;
    // Three pairs describe a swept, pitched blade. Only its visible upper
    // surface is built; the exhaust disc closes the lower side of the duct.
    const spec = [[-0.10, 0, 0.180], [-0.23, 0, 0.154],
      [0.11, 0.53, 0.184], [-0.07, 0.53, 0.160],
      [0.34, 1, 0.190], [0.12, 1, 0.168]];
    const base = p.length / 3;
    for (const [angle, span, y] of spec) {
      const theta = t + angle;
      const root = polygonRadius(hubRadiusAt(y, hub), HUB_SEGMENTS, theta);
      const tip = polygonRadius(radius - DUCT_WALL, DUCT_SEGMENTS, theta);
      const r = root + (tip - root) * span;
      p.push(r * Math.cos(theta), y, r * Math.sin(theta));
    }
    for (const face of [[0, 2, 1], [1, 2, 3], [2, 4, 3], [3, 4, 5]]) {
      let [a, b, c] = face.map(x => base + x);
      const ax = p[a * 3], az = p[a * 3 + 2];
      const bx = p[b * 3], bz = p[b * 3 + 2];
      const cx = p[c * 3], cz = p[c * 3 + 2];
      if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) < 0) [b, c] = [c, b];
      ix.push(a, b, c);
    }
  }
  return geometry(p, ix);
}

// Intersect the actual triangulated flank with a horizontal line. The pylon
// root therefore meets the hull, including its chamfers, without buried caps.
function sideX(rings, y, z) {
  let row = 0;
  while (row < rings.length - 2 && z > rings[row + 1][0][2]) row++;
  const u = (z - rings[row][0][2]) / (rings[row + 1][0][2] - rings[row][0][2]);
  for (let j = 3; j < 7; j++) {
    const a = rings[row][j], b = rings[row][j + 1];
    const c = rings[row + 1][j], d = rings[row + 1][j + 1];
    const top = a.map((x, k) => x + (c[k] - x) * u);
    const mid = c.map((x, k) => x * u + b[k] * (1 - u));
    const bot = b.map((x, k) => x + (d[k] - x) * u);
    for (const [hi, lo] of [[top, mid], [mid, bot]]) {
      if (y <= hi[1] + 1e-10 && y >= lo[1] - 1e-10 && hi[1] > lo[1]) {
        const v = (hi[1] - y) / (hi[1] - lo[1]);
        return hi[0] + (lo[0] - hi[0]) * v;
      }
    }
  }
  throw new Error('Pylon root is outside the hull flank');
}

function pylon(rings, pod, sign) {
  const rear = pod.rear;
  const rootZ = rear ? -1.69 : 2.00;
  const tipZ = rear ? -2.00 : 1.75;
  const rootY = rear ? 0.285 : 0.225;
  const tipY = rear ? 0.290 : 0.250;
  const chord = rear ? 0.28 : 0.24;
  const thick = rear ? 0.080 : 0.065;
  // The inboard duct skin changes facet at local z = 0. Include that point
  // on each broad pylon face instead of bridging through the 50 mm wall.
  const ductCrease = (pod.z - tipZ) / (chord * 0.88);
  const outline = [[0.5, 0], [0.36, 0.5], [ductCrease, 0.5], [-0.36, 0.5],
    [-0.5, 0], [-0.36, -0.5], [ductCrease, -0.5], [0.36, -0.5]];
  const section = [];
  const projectRoot = ([dz, dy]) => [rootZ + dz * chord, rootY + dy * thick];
  const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
  // Split the root contour at the flank's triangle diagonals. Every edge of
  // the open root then lies on a hull face, not just its endpoint vertices.
  for (let j = 0; j < outline.length; j++) {
    const a = outline[j], b = outline[(j + 1) % outline.length];
    const pa = projectRoot(a), pb = projectRoot(b);
    const edge = [pb[0] - pa[0], pb[1] - pa[1]], cuts = [0];
    for (let row = 0; row < rings.length - 1; row++) {
      for (let col = 3; col < 7; col++) {
        const c = rings[row][col + 1], d = rings[row + 1][col];
        const seam = [d[2] - c[2], d[1] - c[1]];
        const delta = [c[2] - pa[0], c[1] - pa[1]];
        const det = cross2(edge, seam);
        if (Math.abs(det) < 1e-12) continue;
        const t = cross2(delta, seam) / det, u = cross2(delta, edge) / det;
        if (t > 1e-8 && t < 1 - 1e-8 && u >= 0 && u <= 1) cuts.push(t);
      }
    }
    cuts.sort((a, b) => a - b);
    for (let k = 0; k < cuts.length; k++) {
      if (k > 0 && Math.abs(cuts[k] - cuts[k - 1]) < 1e-8) continue;
      section.push(a.map((v, axis) => v + (b[axis] - v) * cuts[k]));
    }
  }
  const rows = [];
  for (const u of [0, 1]) {
    const ring = section.map(([dz, dy]) => {
      const zr = rootZ + dz * chord;
      const zt = tipZ + dz * chord * 0.88;
      const yr = rootY + dy * thick;
      const yt = tipY + dy * thick * 0.80;
      const xr = sideX(rings, yr, zr);
      // Intersect the tilted, polygonal outer cylinder at this world y and z.
      // Each pylon tip stays flush against the skin after the centre-pivot cant.
      const localX = polygonLeftX(pod.radius, zt - pod.z);
      const worldY = yt - pod.y - POD_DEPTH / 2;
      const xt = pod.x + (localX + worldY * Math.sin(POD_TILT)) / Math.cos(POD_TILT);
      return [sign * (xr + (xt - xr) * u), yr + (yt - yr) * u, zr + (zt - zr) * u];
    });
    rows.push(ring);
  }
  // Separate the bevel faces so the thin pylon edges keep sane normals
  // where the root and tilted duct skin give their cross-sections a slight twist.
  return combine(section.map((_, j) => {
    const g = loft(rows, [j, (j + 1) % section.length], sign < 0);
    const pos = g.getAttribute('position');
    const v = Array.from({ length: 4 }, (_, k) => new THREE.Vector3().fromBufferAttribute(pos, k));
    const normal = (a, b, c) => v[b].clone().sub(v[a]).cross(v[c].clone().sub(v[a])).normalize();
    const standard = normal(0, 2, 1).dot(normal(1, 2, 3));
    const alternate = normal(0, 2, 3).dot(normal(0, 3, 1));
    // A swept band can be concave in plan near the duct. Choose the diagonal
    // that keeps the two face normals aligned instead of folding the surface.
    if (alternate > standard) {
      g.setIndex(sign < 0 ? [0, 3, 2, 0, 1, 3] : [0, 2, 3, 0, 3, 1]);
      g.computeVertexNormals();
    }
    return g;
  }));
}

// An open-backed, chamfered luminous extrusion attached to an end panel.
function endLamp(width, height, x, y, z, front, chamfer = 0.008) {
  const w = width / 2, h = height / 2, q = Math.min(chamfer, h * 0.65);
  const outline = [[-w + q, -h], [w - q, -h], [w, -h + q], [w, h - q],
    [w - q, h], [-w + q, h], [-w, h - q], [-w, -h + q]];
  const p = [], ix = [], n = [], direction = front ? 1 : -1;
  for (const [xx, yy] of outline) {
    p.push(xx + x, yy + y, z + direction * 0.004);
    n.push(0, 0, direction);
  }
  for (let j = 1; j < 7; j++) {
    if (front) ix.push(0, j, j + 1); else ix.push(0, j + 1, j);
  }
  for (let j = 0; j < 8; j++) {
    const k = (j + 1) % 8;
    const a = outline[j], b = outline[k];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const base = p.length / 3;
    for (const [xx, yy, zz] of [[a[0], a[1], z], [b[0], b[1], z],
      [a[0], a[1], z + direction * 0.004], [b[0], b[1], z + direction * 0.004]]) {
      p.push(xx + x, yy + y, zz); n.push(dy / len, -dx / len, 0);
    }
    if (front) ix.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    else ix.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  return geometry(p, ix, n);
}

export function createObject() {
  const materials = {
    hull: new THREE.MeshPhysicalMaterial({ name: 'hull', color: '#1b1d24',
      metalness: 0.6, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
    trim: new THREE.MeshStandardMaterial({ name: 'trim', color: '#0b0c10',
      metalness: 0.25, roughness: 0.55 }),
    // Opaque tinted glazing avoids sorting and refraction across city instances.
    glass: new THREE.MeshPhysicalMaterial({ name: 'glass', color: '#0a1320',
      metalness: 0.12, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04 }),
    lamp_head: new THREE.MeshStandardMaterial({ name: 'lamp_head', color: '#eaf2ff',
      emissive: '#eaf2ff', emissiveIntensity: 3.0, metalness: 0, roughness: 0.25 }),
    lamp_tail: new THREE.MeshStandardMaterial({ name: 'lamp_tail', color: '#ff1a3c',
      emissive: '#ff1a3c', emissiveIntensity: 2.5, metalness: 0, roughness: 0.28 }),
    glow_thruster: new THREE.MeshStandardMaterial({ name: 'glow_thruster', color: '#9fe9ff',
      emissive: '#9fe9ff', emissiveIntensity: 2.4, metalness: 0, roughness: 0.30 }),
    glow_accent: new THREE.MeshStandardMaterial({ name: 'glow_accent', color: '#ff2e88',
      emissive: '#ff2e88', emissiveIntensity: 2.0, metalness: 0, roughness: 0.32 }),
  };
  const group = new THREE.Group();
  group.name = 'sable_av';
  const mesh = (parent, name, g, material) => {
    const m = new THREE.Mesh(g, materials[material]);
    m.name = name; m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const rings = makeHullRings();
  const top = loft(rings, [13, 14, 15, 0, 1, 2, 3], false, true);
  const rightShoulder = combine([loft(rings, [3, 4]), loft(rings, [4, 5])]);
  const rightDoor = loft(rings, [5, 6]);
  const leftDoor = mirrorX(rightDoor);
  const hull = mesh(group, 'hull_shell', combine([
    rightShoulder, rightDoor, leftDoor, mirrorX(rightShoulder),
    sliceRows(top, 7, 0, CANOPY_START), sliceRows(top, 7, CANOPY_END, rings.length - 1),
    endCap(rings[0], false), endCap(rings[rings.length - 1], true),
  ]), 'hull');
  const canopy = mesh(group, 'canopy', sliceRows(top, 7, CANOPY_START, CANOPY_END), 'glass');
  const rightBevel = loft(rings, [6, 7]);
  mesh(group, 'belly_and_sills', combine([
    rightBevel, loft(rings, [7, 8, 9]), mirrorX(rightBevel),
  ]), 'trim');

  const borderPlanes = (lo, hi) => [[2, lo, 1], [2, hi, -1]];
  const rightCanopySill = canopySill(rings, false);
  mesh(group, 'canopy_surround', combine([
    mirrorX(rightCanopySill), rightCanopySill,
    surfaceStrip(top, borderPlanes(-1.910, -1.882), [0, 0.004, 0]),
    surfaceStrip(top, borderPlanes(1.586, 1.614), [0, 0.004, 0]),
  ]), 'trim');
  const grille = [];
  for (const z of [-2.30, -2.17, -2.04]) {
    grille.push(surfaceStrip(top, [...borderPlanes(z - 0.012, z + 0.012),
      [0, -0.37, 1], [0, 0.37, -1]], [0, 0.004, 0]));
  }
  mesh(group, 'aft_deck_vents', combine(grille), 'trim');

  const sillPlanes = [[1, 0.103, 1], [1, 0.117, -1], [2, -2.18, 1], [2, 2.30, -1]];
  mesh(group, 'sill_accent_r', surfaceStrip(rightDoor, sillPlanes, [0.004, 0, 0]), 'glow_accent');
  mesh(group, 'sill_accent_l', surfaceStrip(leftDoor, sillPlanes, [-0.004, 0, 0]), 'glow_accent');

  const pods = new THREE.Group(); pods.name = 'pods'; group.add(pods);
  const parts = { hull, canopy };
  for (const rear of [false, true]) {
    const radius = rear ? 0.525 : 0.450;
    const hub = rear ? 0.122 : 0.105;
    const pod = { rear, radius, x: rear ? 1.275 : 1.325,
      y: rear ? 0.120 : 0.080, z: rear ? -1.990 : 1.750 };
    const inner = radius - DUCT_WALL;
    const ductGeometry = revolve([
      [radius - 0.004, 0], [radius, 0.004], [radius, POD_DEPTH - 0.004],
      [radius - 0.004, POD_DEPTH], [inner, POD_DEPTH], [inner, 0],
    ], DUCT_SEGMENTS, true, true).translate(0, -POD_DEPTH / 2, 0);
    const hubGeometry = revolve(hubProfile(hub), HUB_SEGMENTS, false)
      .translate(0, -POD_DEPTH / 2, 0);
    const bladeGeometry = fanBlades(radius, hub).translate(0, -POD_DEPTH / 2, 0);
    const leftBladeGeometry = mirrorX(bladeGeometry);
    // Keep the disc and 12 mm lower-lip light in the existing exhaust mesh.
    // Both face downward; the lip light is 4 mm proud of the bottom rim.
    const exhaustGeometry = combine([
      exhaustDisc(radius, hub),
      revolve([[inner, -0.004], [inner + 0.012, -0.004]], DUCT_SEGMENTS, false),
    ]).translate(0, -POD_DEPTH / 2, 0);
    for (const sign of [-1, 1]) {
      const key = `pod_${rear ? 'r' : 'f'}${sign < 0 ? 'l' : 'r'}`;
      const assembly = new THREE.Group(); assembly.name = key;
      assembly.position.set(sign * pod.x, pod.y + POD_DEPTH / 2, pod.z);
      assembly.rotation.z = -sign * POD_TILT;
      pods.add(assembly); parts[key] = assembly;
      mesh(assembly, key + '_duct', ductGeometry, 'trim');
      mesh(assembly, key + '_hub', hubGeometry, 'hull');
      mesh(assembly, key + '_fan', sign < 0 ? leftBladeGeometry : bladeGeometry, 'trim');
      mesh(assembly, key + '_exhaust', exhaustGeometry, 'glow_thruster');
      mesh(group, key + '_pylon', pylon(rings, pod, sign), 'trim');
    }
  }

  const lamps = new THREE.Group(); lamps.name = 'lamps'; group.add(lamps);
  mesh(lamps, 'headlight_bar', endLamp(1.46, 0.026, 0, 0.168, 2.6, true), 'lamp_head');
  for (const sign of [-1, 1]) {
    mesh(lamps, `headlight_slit_${sign < 0 ? 'l' : 'r'}`,
      endLamp(0.017, 0.048, sign * 0.739, 0.108, 2.6, true, 0.006), 'lamp_head');
  }
  mesh(lamps, 'taillight_bar', endLamp(1.230, 0.030, 0, 0.422, -2.6, false), 'lamp_tail');
  parts.lamps = lamps;
  group.userData.parts = parts;
  return group;
}
