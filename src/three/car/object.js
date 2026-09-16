import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const meta = {
  name: 'Neon yellow mid-engine wedge',
  size: [2, 1.12, 4.5],
  parts: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', 'steer_fl', 'steer_fr', 'body', 'headlights', 'taillights', 'wing', 'glass'],
};

// Metres. Forward is +Z; the vehicle's left is +X.
// Steer the front pivots about Y, and spin their child wheel groups about X.
// Deliberately no updateObject: animation belongs to the caller.
export function createObject() {
  const car = new THREE.Group();
  car.name = 'cyberpunk_wedge_supercar';
  const parts = {};
  car.userData.parts = parts;
  car.userData.wheelRadius = 0.34;
  car.userData.wheelbase = 2.62;
  car.userData.track = 1.72;
  car.userData.forwardAxis = '+Z';

  const physical = (name, values) => {
    const m = new THREE.MeshPhysicalMaterial(values);
    m.name = name;
    return m;
  };
  const standard = (name, values) => {
    const m = new THREE.MeshStandardMaterial(values);
    m.name = name;
    return m;
  };
  // Keep saturated paint in the output gamut under the viewer's filmic tone mapping.
  // Lighting, environment reflections and the specified clearcoat still use the PBR shader.
  const yellow = physical('gloss_yellow_fcee0a', { color: '#fcee0a', metalness: 0.1, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: .28, specularIntensity: .45, toneMapped: false });
  const black = standard('matte_black_body_trim', { color: '#101012', metalness: 0.05, roughness: 0.7, envMapIntensity: .3, toneMapped: false });
  const rubber = standard('moulded_tyre_rubber', { color: '#141414', metalness: 0, roughness: 0.88 });
  const rubberEdge = standard('rubber_window_seals', { color: '#08090b', metalness: 0, roughness: 0.82 });
  const seamMat = standard('recessed_panel_shut_lines', { color: '#16160b', metalness: 0, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: .1 });
  const gunmetal = standard('brushed_dark_gunmetal', { color: '#2a2a30', metalness: 0.9, roughness: 0.35 });
  const polished = standard('machined_rim_and_hardware', { color: '#63666d', metalness: 0.95, roughness: 0.23 });
  const brakeMetal = standard('brushed_brake_rotors', { color: '#626267', metalness: 0.86, roughness: 0.47 });
  const grilleMetal = standard('rear_grille_metal', { color: '#303138', metalness: 0.72, roughness: 0.48 });
  const darkness = standard('intake_and_exhaust_depth', { color: '#030405', metalness: 0, roughness: 1 });
  const cabinMat = standard('charcoal_cabin', { color: '#0a0b0e', metalness: 0, roughness: 0.94 });
  const seatMat = standard('black_bucket_seat_upholstery', { color: '#17181c', metalness: 0, roughness: 0.91 });
  const windowMat = physical('dark_tinted_glass', { color: '#0b1016', metalness: 0.9, roughness: 0.05, opacity: 0.75, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: .65 });
  const mirrorMat = physical('mirror_lenses', { color: '#818b9a', metalness: 1, roughness: 0.07 });
  const whiteLED = standard('cool_white_headlight_led', { color: '#dff6ff', emissive: '#dff6ff', emissiveIntensity: 4, metalness: 0.05, roughness: 0.22, toneMapped: false });
  const pinkLED = standard('magenta_tail_led', { color: '#ff2e88', emissive: '#ff2e88', emissiveIntensity: 3, metalness: 0.05, roughness: 0.24, toneMapped: false });
  const cyanLED = standard('cyan_edge_led', { color: '#34e5ff', emissive: '#34e5ff', emissiveIntensity: 2, metalness: 0.05, roughness: 0.3, toneMapped: false });

  const addGroup = (name, parent = car, expose = false) => {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    if (expose) parts[name] = g;
    return g;
  };
  const mesh = (name, geometry, material, parent) => {
    const m = new THREE.Mesh(geometry, material);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const geometry = (positions, indices) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (indices) g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  };
  const grid = (fn, nu, nv, flip = false) => {
    const p = [], ix = [], normals = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, e = .0001;
      p.push(...fn(u, v));
      const du = new THREE.Vector3(...fn(Math.min(1, u + e), v)).sub(new THREE.Vector3(...fn(Math.max(0, u - e), v)));
      const dv = new THREE.Vector3(...fn(u, Math.min(1, v + e))).sub(new THREE.Vector3(...fn(u, Math.max(0, v - e))));
      normals.push(...du.cross(dv).normalize().multiplyScalar(flip ? -1 : 1).toArray());
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      ix.push(...(flip ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
    }
    const g = geometry(p, ix);
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return g;
  };
  const patch = (name, fn, material, parent, nu = 16, nv = 8, flip = false) => mesh(name, grid(fn, nu, nv, flip), material, parent);
  const lerp = THREE.MathUtils.lerp;
  const clamp = THREE.MathUtils.clamp;
  const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  const splineSlopes = new WeakMap();
  const interpolate = (z, points) => {
    // Preserve continuous slopes, rather than flattening every sampled station.
    let slopes = splineSlopes.get(points);
    if (!slopes) {
      const d = points.slice(1).map((p, i) => (p[1] - points[i][1]) / (p[0] - points[i][0]));
      slopes = points.map((_, i) => {
        if (i === 0) return d[0];
        if (i === points.length - 1) return d.at(-1);
        if (d[i - 1] * d[i] <= 0) return 0;
        const a = points[i][0] - points[i - 1][0], b = points[i + 1][0] - points[i][0];
        return 3 * (a + b) / ((2 * b + a) / d[i - 1] + (b + 2 * a) / d[i]);
      });
      splineSlopes.set(points, slopes);
    }
    if (z <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) if (z <= points[i][0]) {
      const [a, b] = [points[i - 1], points[i]];
      const t = (z - a[0]) / (b[0] - a[0]);
      const h = b[0] - a[0], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * h * slopes[i - 1]
        + (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * h * slopes[i];
    }
    return points.at(-1)[1];
  };
  const line = (name, points, radius, material, parent, smooth = false) => {
    const curve = smooth
      ? new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
      : new THREE.CurvePath();
    if (!smooth) for (let i = 1; i < points.length; i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
    return mesh(name, new THREE.TubeGeometry(curve, Math.max(points.length, 6), radius, 5, false), material, parent);
  };
  const ribbon = (name, path, surface, halfWidth, parent, material = seamMat) => {
    // Clip onto the actual body triangles, so every line follows its supporting
    // mesh exactly instead of cutting through a different analytic surface.
    const lateral = name.includes('door_panel');
    const project = v => lateral ? [v[2], v[1]] : [v[0], v[2]];
    const signedArea = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const candidates = [];
    parent.traverse(m => {
      if (!m.isMesh) return;
      if (lateral ? m.name.includes('sculpted_side_skin') : m.name.includes('bonnet_and_quarters')) candidates.push(m);
    });
    const source = [];
    const side = lateral ? Math.sign(surface(path[0][0], path[0][1])[0]) : 0;
    for (const m of candidates) {
      if (lateral && ((side > 0) !== m.name.startsWith('left'))) continue;
      const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, ix = g.index;
      for (let i = 0; i < (ix?.count ?? p.count); i += 3) {
        const vertices = [];
        for (let j = 0; j < 3; j++) {
          const k = ix ? ix.getX(i + j) : i + j;
          vertices.push([p.getX(k), p.getY(k), p.getZ(k), n.getX(k), n.getY(k), n.getZ(k)]);
        }
        const uv = vertices.map(project);
        source.push({ vertices, bounds: [Math.min(...uv.map(p => p[0])), Math.max(...uv.map(p => p[0])), Math.min(...uv.map(p => p[1])), Math.max(...uv.map(p => p[1]))] });
      }
    }
    const closed = Math.hypot(path[0][0] - path.at(-1)[0], path[0][1] - path.at(-1)[1]) < 1e-8;
    const points = closed ? path.slice(0, -1) : path;
    const edges = points.map((p, i) => {
      const prev = points[i > 0 ? i - 1 : closed ? points.length - 1 : 0];
      const next = points[i + 1 < points.length ? i + 1 : closed ? 0 : i];
      const a = new THREE.Vector2(p[0] - prev[0], p[1] - prev[1]).normalize();
      const b = new THREE.Vector2(next[0] - p[0], next[1] - p[1]).normalize();
      if (!a.lengthSq()) a.copy(b);
      if (!b.lengthSq()) b.copy(a);
      const normal = new THREE.Vector2(-a.y - b.y, a.x + b.x).normalize();
      const reach = halfWidth / Math.max(.34, normal.dot(new THREE.Vector2(-b.y, b.x)));
      return [[p[0] + normal.x * reach, p[1] + normal.y * reach], [p[0] - normal.x * reach, p[1] - normal.y * reach]];
    });
    const positions = [], normals = [];
    for (let i = 0; i < (closed ? points.length : points.length - 1); i++) {
      const next = (i + 1) % points.length;
      const quad = [edges[i][0], edges[next][0], edges[next][1], edges[i][1]];
      const winding = Math.sign(signedArea(quad[0], quad[1], quad[2])) || 1;
      const bounds = [Math.min(...quad.map(p => p[0])), Math.max(...quad.map(p => p[0])), Math.min(...quad.map(p => p[1])), Math.max(...quad.map(p => p[1]))];
      for (const triangle of source) {
        const b = triangle.bounds;
        if (b[1] < bounds[0] || b[0] > bounds[1] || b[3] < bounds[2] || b[2] > bounds[3]) continue;
        let polygon = triangle.vertices;
        for (let edge = 0; edge < 4 && polygon.length; edge++) {
          const a = quad[edge], b = quad[(edge + 1) % 4], result = [];
          for (let k = 0; k < polygon.length; k++) {
            const p = polygon[k], q = polygon[(k + 1) % polygon.length];
            const dp = winding * signedArea(a, b, project(p)), dq = winding * signedArea(a, b, project(q));
            if (dp >= -1e-10) result.push(p);
            if ((dp >= 0) !== (dq >= 0)) result.push(mix(p, q, dp / (dp - dq)));
          }
          polygon = result;
        }
        for (let j = 1; j < polygon.length - 1; j++) {
          const tri = [polygon[0], polygon[j], polygon[j + 1]];
          const a = new THREE.Vector3(...tri[0].slice(0, 3)), b = new THREE.Vector3(...tri[1].slice(0, 3)), c = new THREE.Vector3(...tri[2].slice(0, 3));
          if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-19) continue;
          for (const p of tri) {
            const n = new THREE.Vector3(p[3], p[4], p[5]).normalize();
            positions.push(p[0] + n.x * .00035, p[1] + n.y * .00035, p[2] + n.z * .00035);
            normals.push(n.x, n.y, n.z);
          }
        }
      }
    }
    const g = geometry(positions);
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return mesh(name, g, material, parent);
  };
  const rounded = (name, size, pos, material, parent, radius = 0.01, segments = 1) => {
    const m = mesh(name, new RoundedBoxGeometry(...size, Math.min(segments, 2), radius), material, parent);
    m.position.set(...pos);
    return m;
  };
  const shape2 = points => {
    const s = new THREE.Shape();
    points.forEach((p, i) => i ? s.lineTo(...p) : s.moveTo(...p));
    s.closePath();
    return s;
  };
  const hole2 = points => {
    const s = new THREE.Path();
    points.forEach((p, i) => i ? s.lineTo(...p) : s.moveTo(...p));
    s.closePath();
    return s;
  };
  const extruded = (name, shape, depth, material, parent, bevel = 0, segments = 1) => mesh(name, new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 16, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: segments,
  }), material, parent);
  const solid = (name, a, b, material, parent) => {
    const pos = [], ix = [], n = a.length;
    const normal = new THREE.Vector3().crossVectors(new THREE.Vector3(...a[1]).sub(new THREE.Vector3(...a[0])), new THREE.Vector3(...a[2]).sub(new THREE.Vector3(...a[0]))).normalize();
    const axis = Math.abs(normal.x) > Math.abs(normal.y) && Math.abs(normal.x) > Math.abs(normal.z) ? 0 : Math.abs(normal.y) > Math.abs(normal.z) ? 1 : 2;
    const contour = a.map(p => new THREE.Vector2(...p.filter((_, i) => i !== axis)));
    const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
    pos.push(...a.flat(), ...b.flat());
    const middle = new THREE.Vector3(...a.concat(b).reduce((r, p) => r.map((v, k) => v + p[k] / (2 * n)), [0, 0, 0]));
    const face = (i, j, k) => {
      const pa = new THREE.Vector3(...pos.slice(i * 3, i * 3 + 3));
      const pb = new THREE.Vector3(...pos.slice(j * 3, j * 3 + 3));
      const pc = new THREE.Vector3(...pos.slice(k * 3, k * 3 + 3));
      const norm = pb.clone().sub(pa).cross(pc.clone().sub(pa));
      const out = pa.clone().add(pb).add(pc).multiplyScalar(1 / 3).sub(middle);
      ix.push(...(norm.dot(out) < 0 ? [i, k, j] : [i, j, k]));
    };
    for (const [i, j, k] of triangles) { face(i, j, k); face(i + n, j + n, k + n); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; face(i, j, i + n); face(j, j + n, i + n); }
    // Separate normals preserve intentional creases on fabricated panels.
    const g = geometry(pos, ix).toNonIndexed();
    g.computeVertexNormals();
    return mesh(name, g, material, parent);
  };
  const body = addGroup('body', car, true);
  const glass = addGroup('glass', body, true);
  const headlights = addGroup('headlights', body, true);
  const taillights = addGroup('taillights', body, true);
  const wing = addGroup('wing', body, true);
  const chassis = addGroup('underbody', body);

  const widthKeys = [[-2.17, .923], [-1.92, .975], [-1.56, 1], [-1.08, 1], [-.72, .930], [-.30, .892], [.37, .895], [.82, .947], [1.08, 1], [1.53, 1], [1.88, .966], [2.17, .901]];
  const deckKeys = [[-2.17, .682], [-1.91, .735], [-1.35, .746], [-.8, .726], [.2, .681], [.69, .687], [2.17, .454]];
  const shoulderKeys = [[-2.17, .675], [-1.94, .740], [-1.57, .803], [-1.15, .801], [-.75, .755], [-.3, .722], [.40, .710], [.84, .754], [1.13, .788], [1.46, .785], [1.78, .676], [2.03, .519], [2.17, .449]];
  const width = z => interpolate(z, widthKeys);
  const deck = z => z >= .69 ? lerp(.687, .454, (z - .69) / 1.48) : interpolate(z, deckKeys);
  const shoulder = z => interpolate(z, shoulderKeys);
  const archRadius = .391;
  const archFloor = z => {
    for (const hub of [-1.31, 1.31]) {
      const d = Math.abs(z - hub);
      if (d < archRadius - 1e-8) return .34 + .397 * Math.pow(Math.max(0, 1 - Math.pow(d / archRadius, 2.15)), 1 / 2.15);
      if (d <= archRadius + 1e-8) return .205;
    }
    return .205;
  };
  const sideTop = z => shoulder(z) - .035;
  const sideX = (z, y) => {
    const hi = sideTop(z);
    const lowerTaper = .043 * (1 - THREE.MathUtils.smoothstep(y, .205, .47));
    return width(z) - .018 * clamp((hi - y) / .52, 0, 1) - lowerTaper;
  };
  const cabinFoot = z => {
    const t = clamp((.69 - z) / 1.87, 0, 1);
    return [lerp(.773, .880, t), lerp(.687, .737, t)];
  };
  const columns = z => {
    const blend = z < -1.18 ? THREE.MathUtils.smoothstep(z, -1.39, -1.18)
      : z > .69 ? 1 - THREE.MathUtils.smoothstep(z, .69, .89) : 1;
    const foot = cabinFoot(z);
    const innerFender = .69 - .065 * (1 - THREE.MathUtils.smoothstep(Math.abs(z - 1.31), .25, .75));
    const innerX = lerp(innerFender, foot[0], blend), innerY = lerp(deck(z), foot[1], blend);
    return [
      [0, deck(z) + .003], [.56, deck(z) + .002], [innerX, innerY],
      [lerp(width(z) - .170 - .035 * THREE.MathUtils.smoothstep(shoulder(z) - deck(z), 0, .17), lerp(innerX, width(z) - .033, .58), blend),
       lerp(innerY, shoulder(z), lerp(.86, .58, blend))],
      [width(z) - .033, shoulder(z)], [width(z), sideTop(z)],
    ];
  };
  const topY = (x, z) => {
    const row = columns(z), ax = Math.abs(x);
    for (let i = 1; i < row.length; i++) if (ax <= row[i][0]) return lerp(row[i - 1][1], row[i][1], (ax - row[i - 1][0]) / (row[i][0] - row[i - 1][0]));
    return sideTop(z);
  };
  const vent = [[-.47, .420], [-.835, .457], [-.868, .719], [-.520, .694]];
  const intervalsAt = (polygon, value, axis) => {
    const values = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      if (value >= Math.min(a[axis], b[axis]) - 1e-8 && value <= Math.max(a[axis], b[axis]) + 1e-8 && Math.abs(b[axis] - a[axis]) > 1e-9) {
        const t = (value - a[axis]) / (b[axis] - a[axis]);
        values.push(lerp(a[1 - axis], b[1 - axis], t));
      }
    }
    return values.length ? [Math.min(...values), Math.max(...values)] : null;
  };
  const stations = [-2.17, 2.17, -1.39, -1.18, .69, .89, ...widthKeys.map(p => p[0]), ...shoulderKeys.map(p => p[0]), ...vent.map(p => p[0])];
  for (let i = 1; i < 100; i++) stations.push(lerp(-2.17, 2.17, i / 100));
  for (const hub of [-1.31, 1.31]) {
    stations.push(hub - archRadius, hub - archRadius + .0003, hub, hub + archRadius - .0003, hub + archRadius);
    for (let i = 1; i < 26; i++) stations.push(hub - archRadius * Math.cos(i / 26 * Math.PI));
  }
  const zs = [...new Set(stations.map(z => +z.toFixed(7)))].sort((a, b) => a - b);
  for (const sign of [-1, 1]) {
    const sideName = sign === 1 ? 'left' : 'right';
    const positions = [], indices = [];
    for (const z of zs) for (const [x, y] of columns(z)) positions.push(sign * x, y, z);
    for (let j = 0; j < zs.length - 1; j++) for (let k = 0; k < 5; k++) {
      const midZ = (zs[j] + zs[j + 1]) / 2;
      if (k < 2 && midZ > -1.18 && midZ < .69) continue;
      const a = j * 6 + k, b = a + 1, c = a + 6, d = c + 1;
      indices.push(...(sign === 1 ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
    }
    const shell = geometry(positions, indices), shellNormals = [];
    for (const z of zs) {
      const row = columns(z), e = .00005;
      const before = columns(Math.max(-2.17, z - e)), after = columns(Math.min(2.17, z + e));
      const dz = Math.min(2.17, z + e) - Math.max(-2.17, z - e);
      for (let k = 0; k < row.length; k++) {
        const slope = i => (row[i + 1][1] - row[i][1]) / (row[i + 1][0] - row[i][0]);
        let dx = k === 0 ? 0 : k === 5 ? slope(4) : (slope(k - 1) + slope(k)) / 2;
        if (k === 2 && z >= -1.18 && z <= .69) dx = slope(2);
        let xz = (after[k][0] - before[k][0]) / dz, yz = (after[k][1] - before[k][1]) / dz;
        shellNormals.push(...new THREE.Vector3(-sign * dx, 1, dx * xz - yz).normalize().toArray());
      }
    }
    shell.setAttribute('normal', new THREE.Float32BufferAttribute(shellNormals, 3));
    mesh(`continuous_${sideName}_bonnet_and_quarters`, shell, yellow, body);

    const sidePos = [], sideIx = [], lowerPos = [], lowerIx = [];
    const lowerBand = z => interpolate(z, [[-2.17, .345], [-1.7, .295], [-.9, .275], [.9, .260], [1.7, .24], [2.17, .23]]);
    const sideQuad = (z0, z1, y00, y01, y10, y11, lower = false) => {
      const positions = lower ? lowerPos : sidePos, indices = lower ? lowerIx : sideIx;
      const n = positions.length / 3;
      const rows = lower ? 1 : 3;
      for (let r = 0; r <= rows; r++) {
        const y0 = lerp(y00, y10, r / rows), y1 = lerp(y01, y11, r / rows);
        positions.push(sign * sideX(z0, y0), y0, z0, sign * sideX(z1, y1), y1, z1);
      }
      for (let r = 0; r < rows; r++) {
        const a = n + r * 2;
        indices.push(...(sign === 1 ? [a, a + 2, a + 1, a + 1, a + 2, a + 3] : [a, a + 1, a + 2, a + 1, a + 3, a + 2]));
      }
    };
    for (let j = 0; j < zs.length - 1; j++) {
      const z0 = zs[j], z1 = zs[j + 1], mid = (z0 + z1) / 2;
      const hole = intervalsAt(vent, mid, 0);
      if (hole) {
        const a = intervalsAt(vent, z0, 0), b = intervalsAt(vent, z1, 0);
        sideQuad(z0, z1, a[1], b[1], sideTop(z0), sideTop(z1));
        const l0 = Math.max(archFloor(z0), lowerBand(z0)), l1 = Math.max(archFloor(z1), lowerBand(z1));
        sideQuad(z0, z1, l0, l1, a[0], b[0]);
        sideQuad(z0, z1, archFloor(z0), archFloor(z1), l0, l1, true);
      } else {
        const l0 = Math.max(archFloor(z0), lowerBand(z0)), l1 = Math.max(archFloor(z1), lowerBand(z1));
        sideQuad(z0, z1, l0, l1, sideTop(z0), sideTop(z1));
        if (archFloor(z0) < l0 || archFloor(z1) < l1) sideQuad(z0, z1, archFloor(z0), archFloor(z1), l0, l1, true);
      }
    }
    const sideSurface = (positions, indices) => {
      const g = geometry(positions, indices), n = [], e = .0001;
      for (let i = 0; i < positions.length; i += 3) {
        const y = positions[i + 1], z = positions[i + 2];
        const dy = (sideX(z, y + e) - sideX(z, y - e)) / (2 * e);
        const dz = (sideX(z + e, y) - sideX(z - e, y)) / (2 * e);
        n.push(...new THREE.Vector3(sign, -dy, -dz).normalize().toArray());
      }
      g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
      return g;
    };
    mesh(`${sideName}_sculpted_side_skin_with_open_intake`, sideSurface(sidePos, sideIx), yellow, body);
    mesh(`${sideName}_matte_lower_body`, sideSurface(lowerPos, lowerIx), black, body);
    // A turned-in painted lip gives each wheel opening a real thickness.
    for (const hub of [-1.31, 1.31]) {
      const arch = zs.filter(z => Math.abs(z - hub) <= archRadius + 1e-7);
      const p = [], ix = [];
      for (const z of arch) {
        const y = archFloor(z), x = sideX(z, y);
        p.push(sign * x, y, z, sign * (x - .042), y - .006, z);
      }
      for (let i = 0; i < arch.length - 1; i++) { const a = i * 2; ix.push(...(sign === 1 ? [a, a + 2, a + 1, a + 1, a + 2, a + 3] : [a, a + 1, a + 2, a + 1, a + 3, a + 2])); }
      mesh(`${sideName}_${hub > 0 ? 'front' : 'rear'}_arch_return`, geometry(p, ix), yellow, body);
      patch(`${sideName}_${hub > 0 ? 'front' : 'rear'}_wheel_well`, (u, v) => {
        const theta = lerp(-.33, Math.PI + .33, v);
        const z = hub + .388 * Math.cos(theta);
        return [sign * lerp(.66, width(z) - .053, u), .34 + .393 * Math.sin(theta), z];
      }, black, chassis, 3, 44, sign > 0);
    }

    const intake = addGroup(`${sideName}_side_intake`, body);
    const front = vent.map(([z, y]) => [sign * sideX(z, y), y, z]);
    const back = vent.map(([z, y]) => [sign * (sideX(z, y) - .050), y, z]);
    for (let k = 0; k < 4; k++) {
      const n = (k + 1) % 4;
      patch(`${sideName}_intake_reveal_${k}`, (u, v) => mix(mix(front[k], front[n], u), mix(back[k], back[n], u), v), black, intake, 8, 1, sign < 0);
    }
    const wellShape = shape2(vent.map(([z, y]) => [z, y]));
    const wellGeo = new THREE.ShapeGeometry(wellShape);
    const wp = wellGeo.attributes.position;
    for (let i = 0; i < wp.count; i++) { const z = wp.getX(i), y = wp.getY(i); wp.setXYZ(i, sign * (sideX(z, y) - .051), y, z); }
    if (sign > 0) wellGeo.setIndex(Array.from(wellGeo.index.array).reduce((r, _, i, a) => i % 3 ? r : [...r, a[i], a[i + 2], a[i + 1]], []));
    wellGeo.computeVertexNormals();
    mesh(`${sideName}_intake_inner_shadow`, wellGeo, darkness, intake);
    for (let i = 0; i < 6; i++) {
      const y = .455 + i * .043;
      const range = intervalsAt(vent, y, 1);
      if (!range) continue;
      const [a, b] = range;
      const z0 = a + .009, z1 = b - .009;
      const f = z => sign * (sideX(z, y) - .009);
      solid(`${sideName}_intake_louvre_${i + 1}`,
        [[f(z0), y, z0], [f(z1), y, z1], [f(z1) - sign * .03, y + .014, z1], [f(z0) - sign * .03, y + .014, z0]],
        [[f(z0), y - .007, z0], [f(z1), y - .007, z1], [f(z1) - sign * .03, y + .007, z1], [f(z0) - sign * .03, y + .007, z0]], gunmetal, intake);
    }
    line(`${sideName}_intake_painted_edge`, [...front, front[0]], .004, yellow, intake);

    const seamZY = [[.714, .684], [.751, .604], [.762, .325], [.663, .278], [-.405, .278], [-.452, .374], [-.451, .682]];
    ribbon(`${sideName}_door_panel_gap`, seamZY, (z, y) => [sign * (sideX(z, y) + .0006), y, z], .0018, body);
    const hz = -.317, hy = .662;
    rounded(`${sideName}_flush_door_handle`, [.009, .016, .085], [sign * (sideX(hz, hy) + .001), hy, hz], black, body, .003);

    const skirtPoly = [[.94, .145, .916], [.952, .147, -.923], [.878, .243, -.859], [.868, .245, .808]];
    solid(`${sideName}_deep_side_skirt`, skirtPoly.map(([x, y, z]) => [sign * x, y, z]), skirtPoly.map(([x, y, z]) => [sign * (x - .064), y, z]), black, body);
    line(`${sideName}_cyan_sill_pinstripe`, [[sign * .9194, .177, .793], [sign * .9295, .177, -.794]], .0033, cyanLED, body);
  }

  // Front and rear closures follow the loft exactly, including its shoulder chamfer.
  const endContour = z => {
    const r = columns(z);
    return [...r.slice().reverse().map(([x, y]) => [-x, y]), ...r.slice(1).map(([x, y]) => [x, y]), [sideX(z, .205), .205], [-sideX(z, .205), .205]];
  };
  const frontShape = shape2(endContour(2.17));
  frontShape.holes.push(hole2([[-.815, .400], [.815, .400], [.818, .439], [-.818, .439]]));
  const frontDucts = [
    [[-.462, .245], [.462, .245], [.524, .377], [-.524, .377]],
    [[.573, .253], [.793, .254], [.849, .372], [.551, .372]],
    [[-.793, .254], [-.573, .253], [-.551, .372], [-.849, .372]],
  ];
  for (const duct of frontDucts) frontShape.holes.push(hole2(duct));
  const frontFascia = extruded('one_piece_front_bumper', frontShape, .024, yellow, body);
  frontFascia.position.z = 2.146;
  for (let i = 0; i < frontDucts.length; i++) {
    const duct = frontDucts[i];
    const front = duct.map(([x, y]) => [x, y, 2.147]);
    const back = duct.map(([x, y]) => [x * .98, y + .004, 2.055]);
    for (let k = 0; k < duct.length; k++) patch(`front_duct_${i}_wall_${k}`, (u, v) => mix(mix(front[k], front[(k + 1) % 4], u), mix(back[k], back[(k + 1) % 4], u), v), black, body, 1, 1);
    const blank = mesh(`front_duct_${i}_shadow`, new THREE.ShapeGeometry(shape2(duct)), darkness, body);
    blank.position.z = 2.051;
  }
  for (let i = 0; i < 7; i++) rounded(`front_radiator_fin_${i}`, [.878, .005, .012], [0, .264 + i * .015, 2.063], black, body, .001);
  rounded('headlight_recess', [1.632, .037, .035], [0, .4195, 2.156], black, headlights, .007, 3);
  rounded('full_width_cool_white_headlight_bar', [1.594, .016, .012], [0, .421, 2.177], whiteLED, headlights, .004, 3);
  // A shallow return around each corner keeps the luminous line readable while drifting.
  for (const s of [-1, 1]) line(`headlight_${s > 0 ? 'left' : 'right'}_corner`, [[s * .796, .421, 2.177], [s * .818, .421, 2.172], [s * .835, .422, 2.154]], .0055, whiteLED, headlights);

  const splitter = [[-.825, .112, 2.25], [.825, .112, 2.25], [.980, .112, 2.065], [.979, .124, 1.840], [.865, .124, 1.799], [-.865, .124, 1.799], [-.979, .124, 1.840], [-.980, .112, 2.065]];
  solid('deep_front_splitter', splitter, splitter.map(([x, y, z]) => [x, y + .024, z]), black, body);
  for (const s of [-1, 1]) {
    solid(`front_splitter_${s > 0 ? 'left' : 'right'}_end_fence`, [[s * .968, .135, 2.055], [s * .968, .135, 1.86], [s * .929, .205, 1.891], [s * .923, .214, 2.078]], [[s * .960, .135, 2.055], [s * .960, .135, 1.86], [s * .921, .205, 1.891], [s * .915, .214, 2.078]], black, body);
    const onBonnet = (x, z) => [x, topY(x, z) + .0007, z];
    const lid = [[s * .661, 1.801], [s * .852, 1.801], [s * .824, 2.019], [s * .630, 2.033], [s * .661, 1.801]];
    ribbon(`${s > 0 ? 'left' : 'right'}_flush_lamp_lid_seam`, lid, onBonnet, .0017, body);
    for (let i = 0; i < 6; i++) {
      const z = .733 + i * .018;
      ribbon(`${s > 0 ? 'left' : 'right'}_cowl_vent_${i}`, [[s * .606, z], [s * .755, z]], onBonnet, .0020, body, rubberEdge);
    }
  }

  ribbon('continuous_bonnet_panel_gap', [
    [-.575, .704], [-.561, 1.968], [-.419, 2.055], [.419, 2.055],
    [.561, 1.968], [.575, .704], [-.575, .704],
  ], (x, z) => [x, topY(x, z), z], .0020, body);

  const rearShape = shape2(endContour(-2.17));
  rearShape.holes.push(hole2([[-.837, .612], [.837, .612], [.837, .660], [-.837, .660]]));
  rearShape.holes.push(hole2([[-.817, .367], [.817, .367], [.845, .578], [-.845, .578]]));
  const rearFascia = extruded('one_piece_rear_fascia', rearShape, .025, yellow, body);
  rearFascia.position.z = -2.17;
  rounded('tail_light_black_surround', [1.674, .048, .030], [0, .636, -2.159], black, taillights, .007, 3);
  rounded('full_width_magenta_tail_light_strip', [1.626, .022, .012], [0, .636, -2.177], pinkLED, taillights, .005, 3);
  const rearGrille = addGroup('rear_mesh_grille', body);
  rounded('rear_grille_recess_shadow', [1.668, .210, .022], [0, .472, -2.096], darkness, rearGrille, .012);
  const rearOpening = [[-.817, .367, -2.169], [.817, .367, -2.169], [.845, .578, -2.169], [-.845, .578, -2.169]];
  for (let i = 0; i < 4; i++) patch(`rear_grille_reveal_${i}`, (u, v) => {
    const p = mix(rearOpening[i], rearOpening[(i + 1) % 4], u);
    p[2] += v * .062;
    return p;
  }, black, rearGrille, 1, 1);
  const hexPositions = [], hexIndices = [];
  const radius = .023, ringWidth = .0028;
  for (let col = 0; col < 47; col++) for (let row = 0; row < 5; row++) {
    const cx = -.7935 + col * radius * 1.5;
    const cy = .390 + row * radius * Math.sqrt(3) + (col % 2) * radius * Math.sqrt(3) / 2;
    if (cy + radius * .866 > .575 || Math.abs(cx) + radius > .828) continue;
    const base = hexPositions.length / 3;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      hexPositions.push(cx + radius * Math.cos(a), cy + radius * Math.sin(a), -2.135,
        cx + (radius - ringWidth) * Math.cos(a), cy + (radius - ringWidth) * Math.sin(a), -2.137);
    }
    for (let i = 0; i < 6; i++) { const a = base + i * 2, b = base + (i + 1) % 6 * 2; hexIndices.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  mesh('perforated_hexagonal_rear_grille', geometry(hexPositions, hexIndices), grilleMetal, rearGrille);
  const diffuserA = [[-.827, .149, -1.712], [.827, .149, -1.712], [.872, .266, -2.25], [-.872, .266, -2.25]];
  solid('rear_diffuser_ramp', diffuserA, diffuserA.map(([x, y, z]) => [x, y + .019, z]), black, chassis);
  for (let i = 0; i < 7; i++) {
    const x = -.69 + i * .23;
    const yz = [[.150, -1.76], [.155, -2.215], [.268, -2.247], [.169, -1.76]];
    solid(`rear_diffuser_fin_${i + 1}`, yz.map(([y, z]) => [x - .008, y, z]), yz.map(([y, z]) => [x + .008, y, z]), black, chassis);
  }
  for (const s of [-1, 1]) {
    const exhaustShape = new THREE.Shape();
    exhaustShape.absellipse(0, 0, .062, .035, 0, Math.PI * 2, false);
    const bore = new THREE.Path();
    bore.absellipse(0, 0, .054, .027, 0, Math.PI * 2, true);
    exhaustShape.holes.push(bore);
    const outlet = extruded(`${s > 0 ? 'left' : 'right'}_oval_exhaust_tip`, exhaustShape, .095, gunmetal, chassis, .002, 2);
    outlet.position.set(s * .591, .315, -2.218);
    const boreMesh = mesh(`${s > 0 ? 'left' : 'right'}_exhaust_bore`, new THREE.CircleGeometry(.052, 24), darkness, chassis);
    boreMesh.scale.y = .49;
    boreMesh.rotation.y = Math.PI;
    boreMesh.position.set(s * .591, .315, -2.116);
  }
  rounded('flat_dark_floor_pan', [1.38, .054, 3.41], [0, .186, .005], black, chassis, .023);

  // Cabin panels share boundary curves. Each window has a painted frame and a seal.
  const bandedWindow = (name, fn, parent, limits, flip = false) => {
    const [u0, u1, v0, v1] = limits;
    const mapped = (a, b, c, d) => (u, v) => fn(lerp(a, b, u), lerp(c, d, v));
    patch(`${name}_frame_front`, mapped(0, u0, 0, 1), yellow, body, 1, 6, flip);
    patch(`${name}_frame_rear`, mapped(u1, 1, 0, 1), yellow, body, 1, 6, flip);
    patch(`${name}_frame_lower`, mapped(u0, u1, 0, v0), yellow, body, 12, 1, flip);
    patch(`${name}_frame_upper`, mapped(u0, u1, v1, 1), yellow, body, 12, 1, flip);
    const a = u0 + .005, b = u1 - .005, c = v0 + .009, d = v1 - .009;
    patch(`${name}_seal_front`, mapped(u0, a, v0, v1), rubberEdge, parent, 1, 6, flip);
    patch(`${name}_seal_rear`, mapped(b, u1, v0, v1), rubberEdge, parent, 1, 6, flip);
    patch(`${name}_seal_lower`, mapped(a, b, v0, c), rubberEdge, parent, 12, 1, flip);
    patch(`${name}_seal_upper`, mapped(a, b, d, v1), rubberEdge, parent, 12, 1, flip);
    patch(name, mapped(a, b, c, d), windowMat, parent, 12, 6, flip);
  };
  const windshield = (u, v) => {
    const s = u * 2 - 1, crown = 1 - s * s;
    return [s * lerp(.773, .65, v), lerp(.687 + .008 * crown, 1.067 + .017 * crown, v), lerp(.69, .018, v) + .015 * crown * Math.sin(v * Math.PI)];
  };
  bandedWindow('panoramic_raked_windscreen', windshield, glass, [.018, .982, .043, .965]);
  const roofWidth = z => interpolate(z, [[-.72, .627], [-.30, .641], [.018, .65]]);
  const roofEdge = z => interpolate(z, [[-.72, 1.061], [-.30, 1.096], [.018, 1.067]]);
  const roofCrown = z => interpolate(z, [[-.72, .021], [-.30, .024], [.018, .017]]);
  const roofFn = (u, v) => {
    const z = lerp(.018, -.72, v), s = 2 * u - 1;
    return [s * roofWidth(z), roofEdge(z) + roofCrown(z) * (1 - s * s), z];
  };
  patch('gently_crowned_yellow_roof', roofFn, yellow, body, 20, 24);
  patch('dark_headliner', (u, v) => { const p = roofFn(u, v); p[1] -= .017; return p; }, cabinMat, body, 10, 12, true);
  const rearWindow = (u, v) => {
    const s = u * 2 - 1;
    return [s * lerp(.627, .58, v), lerp(1.061, .752, v) + .021 * (1 - s * s) * (1 - v), lerp(-.72, -1.40, v)];
  };
  bandedWindow('fastback_rear_glass', rearWindow, glass, [.025, .975, .055, .939]);
  for (const sign of [-1, 1]) {
    const label = sign > 0 ? 'left' : 'right';
    const sideFn = (u, v) => {
      const z = lerp(.018, -.72, u);
      return mix(mix([sign * .773, .687, .69], [sign * .880, .737, -1.18], u), [sign * roofWidth(z), roofEdge(z), z], v);
    };
    const mainFn = (u, v) => sideFn(u * .739, v);
    bandedWindow(`${label}_door_glass`, mainFn, glass, [.025, .971, .068, .956], sign < 0);
    const quarterFn = (u, v) => sideFn(lerp(.739, 1, u), v);
    bandedWindow(`${label}_rear_quarter_glass`, quarterFn, glass, [.092, .81, .12, .946], sign < 0);
    for (let i = 0; i < 5; i++) {
      const v = .215 + i * .132;
      patch(`${label}_quarter_window_louvre_${i + 1}`, (u, w) => {
        const p = quarterFn(lerp(.15, .806, u), v + w * .029);
        p[0] += sign * .004;
        return p;
      }, black, body, 4, 1, sign < 0);
    }
    // Black trim faces the cabin; the exterior rail is part of the body loft.
    patch(`${label}_inner_window_sill`, (u, v) => {
      const a = sideFn(u, 0);
      return mix(a, [a[0] - sign * .028, a[1] - .010, a[2]], v);
    }, cabinMat, body, 20, 1, sign < 0);
    patch(`${label}_interior_door_card`, (u, v) => {
      const a = sideFn(u, 0);
      return mix([a[0] - sign * .028, a[1] - .010, a[2]], [sign * .669, .362, a[2]], v);
    }, cabinMat, body, 20, 2, sign < 0);
    patch(`${label}_flying_rear_buttress`, (u, v) => {
      const a = mix([sign * .627, 1.061, -.72], [sign * .880, .737, -1.18], u);
      const b = mix([sign * .58, .752, -1.40], [sign * .873, topY(.873, -1.40), -1.40], u);
      return mix(a, b, v);
    }, yellow, body, 8, 16, sign < 0);
    line(`${label}_roof_drip_seam`, Array.from({ length: 30 }, (_, i) => { const z = lerp(.018, -.72, i / 29); return [sign * roofWidth(z), roofEdge(z) - .0002, z]; }), .0016, rubberEdge, body);

    const mirrorGroup = addGroup(`${label}_mirror`, body);
    line(`${label}_mirror_stalk`, [[sign * .802, .739, .434], [sign * .880, .777, .393], [sign * .916, .792, .377]], .015, black, mirrorGroup);
    const housing = rounded(`${label}_matte_mirror_housing`, [.151, .077, .176], [sign * .918, .806, .364], black, mirrorGroup, .025, 4);
    const hp = housing.geometry.attributes.position;
    for (let i = 0; i < hp.count; i++) hp.setX(i, hp.getX(i) * (1 - .22 * (hp.getZ(i) / .176 + .5)));
    housing.geometry.computeVertexNormals();
    housing.rotation.y = sign * -.075;
    const lens = rounded(`${label}_mirror_lens`, [.116, .046, .005], [sign * .918, .805, .277], mirrorMat, mirrorGroup, .014, 3);
    lens.rotation.y = sign * -.075;
  }
  // Fine windshield wipers, parked low on the glass.
  for (const sign of [-1, 1]) {
    const p = windshield(sign > 0 ? .63 : .37, .09);
    const q = windshield(sign > 0 ? .84 : .16, .14);
    p[2] += .006; q[2] += .006;
    line(`${sign > 0 ? 'left' : 'right'}_parked_wiper`, [p, q], .004, black, body);
  }

  const interior = addGroup('two_seat_cabin', body);
  rounded('cockpit_floor', [1.34, .056, 1.64], [0, .342, -.226], cabinMat, interior, .024);
  rounded('rear_cabin_bulkhead', [1.32, .400, .048], [0, .55, -.827], cabinMat, interior, .02);
  solid('low_dashboard', [[-.678, .580, .528], [.678, .580, .528], [.673, .662, .516], [-.673, .662, .516]], [[-.647, .563, .259], [.647, .563, .259], [.649, .679, .341], [-.649, .679, .341]], cabinMat, interior);
  rounded('centre_tunnel', [.152, .205, 1.08], [0, .418, -.101], black, interior, .035);
  for (const sign of [-1, 1]) {
    const label = sign > 0 ? 'left' : 'right';
    const seat = addGroup(`${label}_bucket_seat`, interior);
    seat.position.set(sign * .336, 0, -.284);
    rounded(`${label}_seat_base`, [.364, .079, .400], [0, .421, .025], seatMat, seat, .034, 4);
    const backShape = shape2([[-.122, -.232], [.122, -.232], [.167, .063], [.123, .200], [.102, .237], [-.102, .237], [-.123, .200], [-.167, .063]]);
    const back = extruded(`${label}_sculpted_seat_back`, backShape, .069, seatMat, seat, .024, 3);
    back.position.set(0, .685, -.175);
    back.rotation.x = -.22;
    for (const s of [-1, 1]) {
      line(`${label}_seat_${s > 0 ? 'outer' : 'inner'}_bolster`, [[s * .141, .447, .140], [s * .175, .462, -.11], [s * .164, .614, -.142], [s * .153, .80, -.191]], .029, cabinMat, seat, true);
      rounded(`${label}_harness_slot_${s}`, [.065, .022, .010], [s * .057, .835, -.179], darkness, seat, .006);
    }
  }

  // The rear engine bay's broad slats sit in a recessed black deck panel.
  patch('engine_deck_recess', (u, v) => {
    const x = lerp(-.554, .554, u), z = lerp(-1.423, -1.966, v);
    return [x, topY(x, z) + .0015, z];
  }, black, body, 10, 20);
  for (let i = 0; i < 9; i++) {
    const z = -1.461 - i * .056;
    const y = deck(z) + .008;
    solid(`engine_cover_louvre_${i + 1}`, [[-.544, y, z + .020], [.544, y, z + .020], [.536, y + .019, z - .020], [-.536, y + .019, z - .020]], [[-.544, y - .007, z + .020], [.544, y - .007, z + .020], [.536, y + .012, z - .020], [-.536, y + .012, z - .020]], black, body);
  }

  // Twin uprights are bolted through the rear deck and support one flat airfoil.
  for (const sign of [-1, 1]) {
    const side = sign > 0 ? 'left' : 'right';
    rounded(`wing_${side}_mounting_foot`, [.126, .024, .223], [sign * .607, .742, -1.872], black, wing, .010);
    const profile = [[.745, -1.935], [1.058, -2.006], [1.072, -1.892], [.746, -1.818]];
    solid(`wing_${side}_upright`, profile.map(([y, z]) => [sign * .584, y, z]), profile.map(([y, z]) => [sign * .630, y, z]), black, wing);
  }
  const wingSection = [[-1.786, 1.071], [-1.816, 1.087], [-1.910, 1.101], [-2.102, 1.096], [-2.150, 1.108], [-2.150, 1.085], [-1.938, 1.065], [-1.813, 1.059]];
  solid('flat_rear_wing_airfoil', wingSection.map(([z, y]) => [-.941, y, z]), wingSection.map(([z, y]) => [.941, y, z]), black, wing);
  for (const sign of [-1, 1]) {
    const end = [[-1.775, 1.065], [-1.827, 1.115], [-2.158, 1.119], [-2.182, 1.021], [-2.080, 1.004]];
    solid(`wing_${sign > 0 ? 'left' : 'right'}_endplate`, end.map(([z, y]) => [sign * .938, y, z]), end.map(([z, y]) => [sign * .952, y, z]), black, wing);
  }
  line('wing_cyan_trailing_edge', [[-.931, 1.096, -2.151], [.931, 1.096, -2.151]], .003, cyanLED, wing);

  // Three moulded tread channels, with enough radial segments for a smooth silhouette.
  const tyreProfile = [
    [-.116, .237], [-.130, .269], [-.130, .298], [-.112, .326], [-.078, .340],
    [-.051, .340], [-.046, .335], [-.040, .340], [-.005, .340], [0, .336],
    [.005, .340], [.040, .340], [.046, .335], [.051, .340], [.078, .340],
    [.112, .326], [.130, .298], [.130, .269], [.116, .237], [.093, .234], [-.093, .234],
  ];
  const tyrePos = [], tyreIx = [], tyreSegments = 80;
  for (let i = 0; i <= tyreSegments; i++) {
    const a = i / tyreSegments * Math.PI * 2;
    for (let j = 0; j < tyreProfile.length; j++) {
      const [axial, baseRadius] = tyreProfile[j];
      const phase = ((i / tyreSegments * 40 + Math.abs(axial) * 9) % 1 + 1) % 1;
      const groove = Math.abs(axial) < .075 && baseRadius > .337 && phase > .38 && phase < .53 ? .0018 : 0;
      const r = baseRadius - groove;
      tyrePos.push(axial, r * Math.cos(a), r * Math.sin(a));
    }
  }
  for (let i = 0; i < tyreSegments; i++) for (let j = 0; j < tyreProfile.length; j++) {
    const a = i * tyreProfile.length + j, b = i * tyreProfile.length + (j + 1) % tyreProfile.length;
    const c = a + tyreProfile.length, d = b + tyreProfile.length;
    tyreIx.push(a, c, b, b, c, d);
  }
  const tyreGeometry = geometry(tyrePos, tyreIx);
  const latheX = (profile, segments = 64) => {
    const g = new THREE.LatheGeometry(profile.map(([x, r]) => new THREE.Vector2(r, x)), segments);
    g.rotateZ(-Math.PI / 2);
    return g;
  };
  const rimGeo = latheX([[-.100, .231], [-.100, .249], [-.085, .250], [.104, .250], [.124, .256], [.127, .253], [.122, .237], [.105, .231], [-.100, .231]]);
  const ringGeo = latheX([[.121, .250], [.121, .254], [.127, .254], [.127, .250], [.121, .250]], 64);
  const rimInnerGeo = latheX([[.078, .225], [.117, .237], [.117, .241], [.076, .230], [.078, .225]], 64);
  const rotorShape = new THREE.Shape();
  rotorShape.absarc(0, 0, .214, 0, Math.PI * 2, false);
  const rotorCentre = new THREE.Path();
  rotorCentre.absarc(0, 0, .069, 0, Math.PI * 2, true);
  rotorShape.holes.push(rotorCentre);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    for (const r of [.167, .192]) {
      const h = new THREE.Path();
      h.absarc(r * Math.cos(a + (r < .18 ? .05 : 0)), r * Math.sin(a + (r < .18 ? .05 : 0)), .006, 0, Math.PI * 2, true);
      rotorShape.holes.push(h);
    }
  }
  const rotorGeo = new THREE.ExtrudeGeometry(rotorShape, { depth: .010, bevelEnabled: false, curveSegments: 3 });
  rotorGeo.rotateY(Math.PI / 2);
  const spokeShape = shape2([[-.034, .043], [.026, .047], [.022, .105], [.036, .218], [.020, .237], [-.003, .237], [-.021, .130]]);
  const spokeBase = new THREE.ExtrudeGeometry(spokeShape, { depth: .021, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2, steps: 1 });
  const cylinderX = (r, depth, segments = 32) => {
    const g = new THREE.CylinderGeometry(r, r, depth, segments);
    g.rotateZ(Math.PI / 2);
    return g;
  };
  for (const [name, sign, z] of [['fl', 1, 1.31], ['fr', -1, 1.31], ['rl', 1, -1.31], ['rr', -1, -1.31]]) {
    const steering = z > 0 ? addGroup(`steer_${name}`, car, true) : addGroup(`hub_${name}`, car);
    steering.position.set(sign * .86, .34, z);
    const wheel = addGroup(`wheel_${name}`, steering, true);
    wheel.userData.spinAxis = 'X';
    wheel.userData.radius = .34;
    const tyre = mesh(`tyre_${name}`, tyreGeometry, rubber, wheel);
    tyre.userData.diameter = .68;
    const rim = mesh(`rim_barrel_${name}`, rimGeo, gunmetal, wheel);
    const lip = mesh(`yellow_rim_lip_${name}`, ringGeo, yellow, wheel);
    const innerLip = mesh(`machined_inner_rim_${name}`, rimInnerGeo, polished, wheel);
    if (sign < 0) { rim.rotation.y = Math.PI; lip.rotation.y = Math.PI; innerLip.rotation.y = Math.PI; }
    const rotor = mesh(`drilled_brake_rotor_${name}`, rotorGeo, brakeMetal, wheel);
    rotor.position.x = sign * .041;
    if (sign < 0) rotor.rotation.y = Math.PI;
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * 2 / 5;
      const g = spokeBase.clone(), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i), v = p.getY(i), dep = p.getZ(i);
        const dish = .013 * clamp((v - .06) / .18, 0, 1);
        p.setXYZ(i, sign * (.080 + dep + dish), v * Math.cos(a) - u * Math.sin(a), v * Math.sin(a) + u * Math.cos(a));
      }
      g.computeVertexNormals();
      // Mirroring vertex positions reverses triangle winding.
      if (sign > 0) {
        if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]]; }
        else {
          for (const attr of Object.values(g.attributes)) for (let i = 0; i < attr.count; i += 3) for (let k = 0; k < attr.itemSize; k++) {
            const b = (i + 1) * attr.itemSize + k, c = (i + 2) * attr.itemSize + k;
            [attr.array[b], attr.array[c]] = [attr.array[c], attr.array[b]];
          }
        }
        g.computeVertexNormals();
      }
      mesh(`five_spoke_${name}_${j + 1}`, g, gunmetal, wheel);
      const bolt = mesh(`lug_bolt_${name}_${j + 1}`, cylinderX(.009, .010, 6), polished, wheel);
      bolt.position.set(sign * .117, .044 * Math.cos(a), .044 * Math.sin(a));
    }
    const cap = mesh(`hub_cap_${name}`, cylinderX(.032, .022), gunmetal, wheel);
    cap.position.x = sign * .114;
    const caliper = rounded(`stationary_brake_caliper_${name}`, [.056, .128, .069], [sign * .057, .027, -.171], yellow, steering, .017, 3);
    caliper.rotation.x = -.14;
    // Concentric moulding rings on the rubber sidewall use the tyre's material.
    for (const ax of [-.1292, .1292]) {
      const g = latheX([[ax, .271], [ax * 1.002, .273], [ax, .275]], 64);
      mesh(`sidewall_moulding_${name}_${ax > 0 ? 'outer' : 'inner'}`, g, rubber, wheel);
    }
  }

  return car;
}
