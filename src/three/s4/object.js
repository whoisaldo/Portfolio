import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PARTS = [
  'body', 'hood', 'grille', 'front_bumper', 'rear_bumper', 'diffuser', 'spoiler',
  'exhaust_tips', 'headlights', 'taillights', 'glass',
  'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', 'steer_fl', 'steer_fr',
  'brake_fl', 'brake_fr', 'brake_rl', 'brake_rr',
  'rain_guard_fl', 'rain_guard_fr', 'rain_guard_rl', 'rain_guard_rr',
  'engine_cover', 'intake_box', 'intake_hose', 'pulley', 'heat_exchanger',
  'coolant_tank', 'mmi_screen', 'seats', 'steering_wheel'
];

export const meta = {
  name: '2013 S4 · B8.5 · lowered Monsoon grey',
  size: [2.11, 1.36, 4.72],
  parts: PARTS,
};

// Metres. +Z is forward; +X is the driver's side. No animation is applied
// automatically: hood.rotation.x = -55 * Math.PI / 180 opens the bonnet.
export function createObject() {
  const car = new THREE.Group();
  car.name = 'audi_s4_b85';
  const parts = {};
  car.userData.parts = parts;
  car.userData.dimensions = { bodyWidth: 1.83, wheelbase: 2.81, track: 1.58, tyreDiameter: 0.69 };

  const material = (name, color, values = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ color, ...values });
    m.name = name;
    return m;
  };
  const paint = material('monsoon_grey_clearcoat', '#5e6166', {
    metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06,
    envMapIntensity: 0.48, side: THREE.DoubleSide
  });
  const carbon = material('satin_carbon_composite', '#131416', {
    metalness: 0.2, roughness: 0.35, clearcoat: 0.22, clearcoatRoughness: 0.2,
    envMapIntensity: 0.35, side: THREE.DoubleSide
  });
  const black = material('intake_honeycomb_black', '#0e0f11', { roughness: 0.6, envMapIntensity: 0.35 });
  const gloss = material('piano_black_trim', '#0a0b0d', { roughness: 0.22, clearcoat: 0.5, envMapIntensity: 0.3, side: THREE.DoubleSide });
  const rubber = material('rubber', '#141414', { roughness: 0.88 });
  const cavity = material('unlit_recess', '#050608', { roughness: 0.95 });
  const glassMat = material('dark_tinted_glass', '#0b1016', {
    metalness: 0.9, roughness: 0.05, opacity: 0.7, transparent: true,
    side: THREE.DoubleSide, depthWrite: false
  });
  const tintFilm = material('inner_smoked_window_film', '#080c11', {
    roughness: 0.35, transparent: true, opacity: 0.34, depthWrite: false,
    side: THREE.DoubleSide, envMapIntensity: 0.1
  });
  const alloy = material('dark_grey_forged_alloy', '#3a3b40', { metalness: 0.85, roughness: 0.3 });
  const machined = material('machined_rim_edge', '#989ba0', { metalness: 1, roughness: 0.24 });
  const steel = material('brushed_brake_steel', '#7a7c80', { metalness: 0.87, roughness: 0.42 });
  const darkSteel = material('dark_cast_steel', '#3c3e44', { metalness: 0.65, roughness: 0.45 });
  const chrome = material('polished_dark_chrome', '#8b8e94', { metalness: 1, roughness: 0.15 });
  const plastic = material('engine_matte_black', '#111214', { roughness: 0.67 });
  const silicone = material('silicone_hoses', '#0c0d0f', { roughness: 0.26, clearcoat: 0.3 });
  const leather = material('black_leather', '#17181c', { roughness: 0.57, sheen: 0.2, sheenRoughness: 0.8 });
  const seamMat = material('leather_seams', '#292a2e', { roughness: 0.85 });
  const dashMat = material('dashboard', '#121316', { roughness: 0.79 });
  const white = material('projector_light', '#e6f4ff', {
    emissive: '#e6f4ff', emissiveIntensity: 3, roughness: 0.2
  });
  const drl = material('daytime_running_light', '#dff6ff', {
    emissive: '#dff6ff', emissiveIntensity: 3, roughness: 0.2
  });
  const red = material('red_led', '#ff1e2d', {
    emissive: '#ff1e2d', emissiveIntensity: 2.5, roughness: 0.25
  });
  const redLens = material('deep_red_tail_lens', '#620712', {
    metalness: 0.15, roughness: 0.19, clearcoat: 1, emissive: '#ad0710', emissiveIntensity: 0.25
  });
  const lens = material('headlamp_clear_lens', '#b8c3d1', {
    roughness: 0.07, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false,
    clearcoat: 1, side: THREE.DoubleSide
  });

  function group(name, parent = car, expose = false) {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    if (expose) parts[name] = g;
    return g;
  }
  function mesh(name, geometry, mat, parent = car) {
    const m = new THREE.Mesh(geometry, mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function rounded(name, size, pos, radius, mat, parent = car, segments = 1) {
    const r = Math.min(radius, Math.min(...size) * 0.49);
    const m = mesh(name, new RoundedBoxGeometry(...size, Math.min(segments, 2), r), mat, parent);
    m.position.set(...pos);
    return m;
  }
  function ellipsoid(name, pos, scale, mat, parent = car, segments = 24) {
    const m = mesh(name, new THREE.SphereGeometry(1, segments, 12), mat, parent);
    m.position.set(...pos);
    m.scale.set(...scale);
    return m;
  }
  const vec = p => new THREE.Vector3(...p);
  function tube(name, points, radius, mat, parent = car, closed = false, resolution = 0, radial = 4) {
    const path = new THREE.CatmullRomCurve3(points.map(vec), closed, 'centripetal');
    return mesh(name, new THREE.TubeGeometry(path, resolution || Math.max(8, points.length * 3), radius, radial, closed), mat, parent);
  }
  function cylinder(name, radius, length, pos, mat, parent = car, axis = 'y', segments = 32) {
    const m = mesh(name, new THREE.CylinderGeometry(radius, radius, length, segments), mat, parent);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.position.set(...pos);
    return m;
  }
  function surface(name, fn, nu, nv, mat, parent = car, reverse = false) {
    const positions = [], indices = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) positions.push(...fn(i / nu, j / nv));
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + nu + 1;
      if (reverse) indices.push(a, b, a + 1, a + 1, b, b + 1);
      else indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    // Parametric normals remain smooth across a changing tessellation, such
    // as the wheel cutouts, instead of reproducing long diagonal facets.
    const normals = geo.attributes.normal, du = new THREE.Vector3(), dv = new THREE.Vector3(), n = new THREE.Vector3();
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, e = 0.0001;
      du.fromArray(fn(Math.min(1, u + e), v)).sub(vec(fn(Math.max(0, u - e), v)));
      dv.fromArray(fn(u, Math.min(1, v + e))).sub(vec(fn(u, Math.max(0, v - e))));
      n.crossVectors(du, dv);
      if (n.lengthSq() > 1e-20) {
        n.normalize().multiplyScalar(reverse ? -1 : 1);
        normals.setXYZ(j * (nu + 1) + i, n.x, n.y, n.z);
      }
    }
    return mesh(name, geo, mat, parent);
  }
  function outline(points, radius = 0) {
    const shape = new THREE.Shape();
    if (!radius) {
      shape.moveTo(...points[0]);
      points.slice(1).forEach(p => shape.lineTo(...p));
    } else {
      for (let i = 0; i < points.length; i++) {
        const prev = new THREE.Vector2(...points[(i + points.length - 1) % points.length]);
        const p = new THREE.Vector2(...points[i]);
        const next = new THREE.Vector2(...points[(i + 1) % points.length]);
        const a = p.clone().lerp(prev, Math.min(0.35, radius / p.distanceTo(prev)));
        const b = p.clone().lerp(next, Math.min(0.35, radius / p.distanceTo(next)));
        if (!i) shape.moveTo(a.x, a.y); else shape.lineTo(a.x, a.y);
        shape.quadraticCurveTo(p.x, p.y, b.x, b.y);
      }
    }
    shape.closePath();
    return shape;
  }
  function mappedShape(name, shape, fn, mat, parent = car, reverse = false) {
    const geo = new THREE.ShapeGeometry(shape, 8);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, ...fn(p.getX(i), p.getY(i)));
    if (reverse) {
      const index = geo.index;
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i); index.setX(i, index.getX(i + 2)); index.setX(i + 2, a);
      }
    }
    geo.computeVertexNormals();
    return mesh(name, geo, mat, parent);
  }
  function extrudeXZ(name, points, top, depth, bevel, mat, parent = car) {
    const geo = new THREE.ExtrudeGeometry(outline(points, bevel * 2), {
      depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel,
      bevelSegments: 3, curveSegments: 5, steps: 1
    });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, top, 0);
    return mesh(name, geo, mat, parent);
  }
  function interp(z, knots) {
    const d = i => (knots[i + 1][1] - knots[i][1]) / (knots[i + 1][0] - knots[i][0]);
    const slope = i => {
      if (i === 0) return d(0);
      if (i === knots.length - 1) return d(i - 1);
      const a = d(i - 1), b = d(i);
      if (a * b <= 0) return 0;
      const h0 = knots[i][0] - knots[i - 1][0], h1 = knots[i + 1][0] - knots[i][0];
      return 3 * (h0 + h1) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b);
    };
    for (let i = 0; i < knots.length - 1; i++) {
      if (z <= knots[i + 1][0]) {
        const t = THREE.MathUtils.clamp((z - knots[i][0]) / (knots[i + 1][0] - knots[i][0]), 0, 1);
        const h = knots[i + 1][0] - knots[i][0], t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * knots[i][1] + (t3 - 2 * t2 + t) * h * slope(i)
          + (-2 * t3 + 3 * t2) * knots[i + 1][1] + (t3 - t2) * h * slope(i + 1);
      }
    }
    return knots[knots.length - 1][1];
  }

  const body = group('body', car, true);
  const frontZ = (x, y) => 2.334 - .184 * Math.pow(Math.abs(x) / .91, 3) - .026 * Math.pow((y - .49) / .34, 2);
  const rearZ = (x, y) => -2.329 + .159 * Math.pow(Math.abs(x) / .91, 3) + .017 * Math.pow((y - .49) / .34, 2);
  const frontOutline = [[-.80, .169], [-.882, .212], [-.911, .40], [-.912, .68], [-.899, .798], [-.84, .824], [-.70, .824], [.70, .824], [.84, .824], [.899, .798], [.912, .68], [.911, .40], [.882, .212], [.80, .169]];
  const rearOutline = [[-.80, .187], [-.886, .25], [-.91, .455], [-.91, .703], [-.892, .798], [-.829, .838], [-.65, .831], [.65, .831], [.829, .838], [.892, .798], [.91, .703], [.91, .455], [.886, .25], [.80, .187]];
  const frontContour = outline(frontOutline, .025).getPoints(8);
  const rearContour = outline(rearOutline, .025).getPoints(8);
  const bodyTop = z => interp(z, [[-2.28, .816], [-2.05, .846], [-1.5, .88], [-.3, .895], [.72, .905], [1.35, .885], [1.85, .846], [2.25, .819]]);
  const bodyWidth = z => interp(z, [[-2.28, .79], [-2.02, .889], [-1.4, .915], [-.3, .893], [.55, .899], [1.405, .915], [1.85, .893], [2.25, .789]]);
  function sideX(y, z) {
    const h = THREE.MathUtils.clamp((y - .18) / (bodyTop(z) - .18), 0, 1);
    const profile = interp(h, [[0, -.048], [.18, -.025], [.61, -.003], [.79, 0], [.88, -.008], [1, -.047]]);
    return bodyWidth(z) + profile;
  }
  function bodySidePoint(z, y, s) {
    if (Math.abs(z) <= 2.05) return [s * sideX(y, z), y, z];
    const front = z > 0, baseZ = front ? 2.05 : -2.05;
    const t = THREE.MathUtils.clamp((Math.abs(z) - 2.05) / (front ? .20 : .23), 0, 1);
    const x0 = sideX(y, baseZ), x1 = boundaryX(y, front ? frontContour : rearContour);
    const z1 = (front ? frontZ : rearZ)(x1, y);
    const x = THREE.MathUtils.lerp(x0, x1, t) + .003 * Math.sin(Math.PI * t);
    return [s * x, y, THREE.MathUtils.lerp(baseZ, z1, Math.sin(t * Math.PI / 2))];
  }
  const archR = .374;
  function sideBottom(z) {
    const d = Math.min(Math.abs(z - 1.405), Math.abs(z + 1.405));
    return d < archR ? .345 + Math.sqrt(archR * archR - d * d) : .19;
  }
  for (const s of [-1, 1]) {
    const tag = s === 1 ? 'left' : 'right';
    surface(`continuous_${tag}_body_shell`, (u, v) => {
      const z = -2.28 + 4.53 * u;
      const y = THREE.MathUtils.lerp(sideBottom(z), bodyTop(z), v);
      return bodySidePoint(z, y, s);
    }, 208, 12, paint, body, s === 1);
    for (const hubZ of [-1.405, 1.405]) {
      // The rolled arch returns into a separate dark wheel tub.
      surface(`${tag}_${hubZ > 0 ? 'front' : 'rear'}_rolled_arch`, (u, v) => {
        const a = Math.PI * u;
      const r = archR - .006 * v;
        const y = .345 + r * Math.sin(a), z = hubZ + r * Math.cos(a);
        return [s * (sideX(y, z) - .023 * v), y, z];
      }, 64, 3, paint, body, s === 1);
      surface(`${tag}_${hubZ > 0 ? 'front' : 'rear'}_wheel_well`, (u, v) => {
        const a = Math.PI * u;
        return [s * (.62 + .255 * v), .345 + .365 * Math.sin(a), hubZ + .365 * Math.cos(a)];
      }, 56, 5, rubber, body, s === -1);
    }
    surface(`${tag}_sculpted_sill`, (u, v) => {
      const z = -1.025 + 2.05 * u;
      const y = .156 + .075 * v;
      return [s * (.853 + .02 * Math.sin(v * Math.PI)), y, z];
    }, 24, 8, paint, body, s === 1);
    tube(`${tag}_sill_shadow`, [[s * .867, .178, -1.025], [s * .873, .174, 0], [s * .867, .178, 1.025]], .006, carbon, body);
  }
  rounded('sealed_floor_pan', [1.56, .085, 3.94], [0, .183, 0], .042, cavity, body);

  // Fender decks stop at the hood opening; nothing spans the engine bay.
  const hoodWidth = z => interp(z, [[.70, .719], [1.3, .725], [1.9, .739], [2.25, .704]]);
  const hoodHeight = z => {
    const t = THREE.MathUtils.clamp((z - .70) / 1.56, 0, 1);
    return .904 - .074 * t - .022 * t * t;
  };
  function hoodPoint(u, v) {
    const nx = u * 2 - 1;
    const z = .70 + v * (1.55 - .10 * Math.pow(Math.abs(nx), 3));
    const x = nx * hoodWidth(z);
    const crown = .014 * (1 - nx * nx);
    const crease = .0038 * Math.exp(-Math.pow((Math.abs(nx) - .57) / .11, 2)) * Math.sin(Math.PI * v);
    return [x, hoodHeight(z) + crown + crease, z];
  }
  const hood = group('hood', car, true);
  hood.position.set(0, .904, .70);
  hood.userData.hingeAxis = 'x';
  hood.userData.openAngle = -55 * Math.PI / 180;
  hood.userData.closedAngle = 0;
  const localHood = (u, v, under = 0) => { const p = hoodPoint(u, v); return [p[0], p[1] - .904 - under, p[2] - .70]; };
  surface('bonnet_outer_skin_with_power_creases', (u, v) => localHood(u, v), 40, 26, paint, hood, true);
  surface('bonnet_inner_skin', (u, v) => localHood(u, v, .018), 24, 16, paint, hood);
  for (const edge of [0, 1, 2, 3]) {
    surface(`bonnet_hem_${edge}`, (u, v) => {
      const uv = edge < 2 ? [edge, u] : [u, edge - 2];
      return localHood(uv[0], uv[1], .018 * v);
    }, 40, 1, paint, hood);
  }
  surface('hood_moulded_acoustic_liner', (u, v) => {
    const p = localHood(.13 + .74 * u, .13 + .73 * v, .024);
    return p;
  }, 12, 12, plastic, hood);
  for (const s of [-1, 1]) {
    tube(`bonnet_inner_reinforcement_${s}`, [[s * .58, -.023, .13], [s * .52, -.052, .49], [s * .48, -.088, .92], [s * .57, -.114, 1.3]], .021, paint, hood, false, 28, 8);
    rounded(`bonnet_hinge_${s}`, [.065, .028, .17], [s * .59, -.024, .06], .01, darkSteel, hood);
    surface(`front_fender_deck_${s}`, (u, v) => {
      const inner = hoodPoint(s === 1 ? 1 : 0, u);
      inner[0] += s * .003;
      const z = .70 + 1.55 * u, outer = bodySidePoint(z, bodyTop(z), s);
      return [THREE.MathUtils.lerp(inner[0], outer[0], v), THREE.MathUtils.lerp(inner[1], outer[1], v) + .003 * Math.sin(v * Math.PI), THREE.MathUtils.lerp(inner[2], outer[2], v)];
    }, 52, 12, paint, body, s === 1);
    tube(`hood_panel_gap_${s}`, Array.from({ length: 16 }, (_, i) => {
      const z = .72 + i / 15 * 1.42; return [s * (hoodWidth(z) + .002), hoodHeight(z) - .003, z];
    }), .0023, cavity, body, false, 38);
  }

  // Cabin shell, three side panes per side, and rounded roof crown.
  const glass = group('glass', car, true);
  const cabinX = (y, z) => .862 - .462 * (y - .89) - .013 * Math.pow(Math.max(0, -z - .6), 2);
  function roofCenter(z) {
    const f = Math.pow(Math.max(0, z + .32) / .486, 4);
    const r = Math.pow(Math.max(0, -.32 - z) / .665, 4);
    return 1.36 - .025 * f - .038 * r;
  }
  function roofEdge(z) {
    const f = Math.pow(Math.max(0, z + .32) / .486, 4);
    const r = Math.pow(Math.max(0, -.32 - z) / .665, 4);
    return roofCenter(z) - .025 + .009 * f + .001 * r;
  }
  const roofBoundary = Array.from({ length: 25 }, (_, i) => { const z = .166 - i / 24 * 1.151; return [z, roofEdge(z)]; });
  const cabinOutline = [[.795, .886], ...roofBoundary, [-1.625, .88]];
  const frontWindow = [[.657, .933], [.086, 1.286], [-.257, 1.298], [-.272, .925]];
  const rearWindow = [[-.35, .925], [-.337, 1.298], [-.861, 1.296], [-1.118, 1.126], [-1.166, .919]];
  const quarterWindow = [[-1.205, .92], [-1.168, 1.1], [-1.445, .925]];
  for (const s of [-1, 1]) {
    const tag = s === 1 ? 'left' : 'right';
    const side = outline(cabinOutline);
    for (const points of [frontWindow, rearWindow, quarterWindow]) side.holes.push(outline(points, .016));
    mappedShape(`${tag}_a_b_c_pillars`, side, (z, y) => [s * cabinX(y, z), y, z], paint, body, s === 1);
    for (const [index, points] of [frontWindow, rearWindow, quarterWindow].entries()) {
      const sh = outline(points, .016);
      mappedShape(`${tag}_${['front', 'rear', 'quarter'][index]}_window`, sh,
        (z, y) => [s * (cabinX(y, z) - .001), y, z], glassMat, glass, s === 1);
      mappedShape(`${tag}_${index}_inner_tint`, sh,
        (z, y) => [s * (cabinX(y, z) - .005), y, z], tintFilm, glass, s === 1);
      frame(`${tag}_flush_window_surround_${index}`, points,
        (z, y) => [s * (cabinX(y, z) + .0015), y, z], .010, gloss, body);
    }
    mappedShape(`${tag}_black_b_pillar`, outline([[-.277, .919], [-.263, 1.301], [-.331, 1.303], [-.346, .919]]),
      (z, y) => [s * (cabinX(y, z) + .005), y, z], gloss, body, s === 1);
    for (const rear of [false, true]) {
      const id = `${rear ? 'r' : 'f'}${s === 1 ? 'l' : 'r'}`;
      const g = group(`rain_guard_${id}`, car, true);
      const path = (rear ? [[-.342, 1.303], [-.64, 1.306], [-.855, 1.301], [-1.112, 1.132], [-1.16, 1.1]] :
        [[.651, .942], [.47, 1.057], [.26, 1.19], [.082, 1.299], [-.26, 1.304]]);
      const visorCurve = new THREE.CatmullRomCurve3(path.map(([z, y]) => new THREE.Vector3(z, y, 0)));
      surface(`${id}_smoked_window_visor`, (u, v) => {
        const p = visorCurve.getPoint(u);
        const y = p.y - .013 * v;
        return [s * (cabinX(y, p.x) + .003 + .010 * Math.sin(v * Math.PI / 2)), y, p.x];
      }, 30, 4, gloss, g, s === -1);
      tube(`${id}_visor_outer_edge`, path.map(([z, y]) => [s * (cabinX(y - .013, z) + .013), y - .013, z]), .0018, gloss, g);
    }
    const doorLines = [
      [[.697, .883], [.771, .773], [.847, .553], [.908, .285], [.805, .215], [-.329, .212]],
      [[-.313, .897], [-.331, .734], [-.354, .494], [-.374, .218]],
      [[-1.446, .883], [-1.352, .786], [-1.218, .652], [-1.04, .431], [-1.005, .231], [-.388, .213]]
    ];
    doorLines.forEach((line, i) => tube(`${tag}_door_shut_line_${i}`, line.map(([z, y]) => [s * (sideX(y, z) + .0013), y, z]), .0021, cavity, body, false, 48, 5));
    for (const [i, z] of [.015, -.964].entries()) {
      const y = .784, x = s * (sideX(y, z) + .002);
      rounded(`${tag}_door_handle_recess_${i}`, [.009, .04, .155], [x, y, z], .016, cavity, body);
      rounded(`${tag}_door_handle_${i}`, [.022, .025, .131], [x + s * .008, y + .004, z], .011, paint, body);
    }
    tube(`${tag}_belt_moulding`, [[s * .826, .908, .682], [s * .848, .917, -.33], [s * .834, .899, -1.467]], .007, gloss, body, false, 42);
  }
  surface('continuous_roof_panel', (u, v) => {
    const z = -.985 + 1.151 * v;
    const edge = roofEdge(z), width = cabinX(edge, z), crown = roofCenter(z);
    const x = (2 * u - 1) * width;
    return [x, THREE.MathUtils.lerp(crown, edge, Math.pow(2 * u - 1, 2)), z];
  }, 32, 26, paint, body, true);
  function windshieldPoint(u, v, rear = false) {
    const nx = 2 * u - 1, width = THREE.MathUtils.lerp(.794, rear ? .651 : .652, v);
    const y = THREE.MathUtils.lerp(rear ? .896 : .913, rear ? 1.322 : 1.335, v) - (rear ? .024 : .016) * nx * nx;
    const z = rear ? THREE.MathUtils.lerp(-1.592 + .055 * nx * nx, -.987, v) : THREE.MathUtils.lerp(.786 - .057 * nx * nx, .165, v);
    return [nx * width, y, z];
  }
  for (const rear of [false, true]) {
    const tag = rear ? 'rear' : 'front';
    surface(`${tag}_curved_windscreen`, (u, v) => windshieldPoint(u, v, rear), 30, 18, glassMat, glass, rear);
    surface(`${tag}_windscreen_inner_tint`, (u, v) => {
      const p = windshieldPoint(u, v, rear); p[1] -= .003; p[2] += rear ? .002 : -.002; return p;
    }, 22, 14, tintFilm, glass, rear);
    const edge = [];
    for (let i = 0; i <= 20; i++) edge.push(windshieldPoint(i / 20, 0, rear));
    for (let i = 1; i <= 16; i++) edge.push(windshieldPoint(1, i / 16, rear));
    for (let i = 19; i >= 0; i--) edge.push(windshieldPoint(i / 20, 1, rear));
    for (let i = 15; i > 0; i--) edge.push(windshieldPoint(0, i / 16, rear));
    tube(`${tag}_windscreen_gasket`, edge, .0045, gloss, body, true, 76, 6);
    for (const s of [-1, 1]) {
      surface(`${tag}_pillar_continuous_return_${s}`, (u, v) => {
        const inner = windshieldPoint(s === 1 ? 1 : 0, v, rear);
        const y = inner[1];
        const z = rear ? THREE.MathUtils.lerp(-1.625, -.985, THREE.MathUtils.clamp((y - .88) / (roofEdge(-.985) - .88), 0, 1)) : .795 - (y - .886) / (roofEdge(.166) - .886) * .629;
        return [THREE.MathUtils.lerp(inner[0], s * cabinX(y, z), u), y, THREE.MathUtils.lerp(inner[2], z, u)];
      }, 4, 24, paint, body);
    }
  }
  for (const x of [-.43, .27]) {
    tube(`windscreen_wiper_${x}`, [[x - .22, .935, .73], [x, .941, .716], [x + .24, .94, .698]], .007, rubber, body);
    tube(`wiper_arm_${x}`, [[x - .09, .906, .75], [x + .08, .93, .71]], .006, black, body);
  }
  for (let i = 0; i < 7; i++) {
    const v = .13 + i * .108;
    tube(`rear_glass_heater_${i}`, Array.from({ length: 15 }, (_, n) => {
      const p = windshieldPoint(.08 + n / 14 * .84, v, true); p[1] -= .0008; return p;
    }), .0007, darkSteel, glass, false, 18, 4);
  }
  function trunkPoint(u, v) {
    const nx = u * 2 - 1, z = -1.57 - .705 * v;
    const outer = bodySidePoint(z, bodyTop(z), nx < 0 ? -1 : 1);
    return [Math.abs(nx) * outer[0], bodyTop(z) + .012 * (1 - nx * nx), THREE.MathUtils.lerp(z, outer[2], Math.pow(Math.abs(nx), 3))];
  }
  surface('trunk_deck', trunkPoint, 28, 18, paint, body);
  for (const s of [-1, 1]) tube(`trunk_panel_gap_${s}`, [[s * .59, .887, -1.58], [s * .61, .859, -1.89], [s * .623, .810, -2.23]], .0022, cavity, body);
  const spoiler = group('spoiler', car, true);
  surface('carbon_trunk_lip_upper', (u, v) => {
    const p = trunkPoint(.04 + .92 * u, .89 + .11 * v);
    p[1] += .002 + .024 * v;
    return p;
  }, 42, 6, carbon, spoiler, true);
  surface('carbon_trunk_lip_rear_return', (u, v) => {
    const p = trunkPoint(.04 + .92 * u, 1);
    p[1] += .001 + .025 * v;
    return p;
  }, 42, 3, carbon, spoiler, true);

  // The bumper fascia is one perforated, curved surface, rather than a stack
  // of blocks. Real hexagonal openings have wall depth and a recessed back.
  const grillePoly = [[-.467, .804], [.467, .804], [.525, .741], [.460, .299], [.385, .241], [-.385, .241], [-.460, .299], [-.525, .741]];
  const intakePoly = [[.576, .505], [.811, .529], [.861, .442], [.831, .253], [.548, .251]];
  const headPoly = [[.541, .787], [.807, .797], [.882, .747], [.869, .663], [.755, .644], [.560, .681]];
  const mirrored = (points, s) => points.map(([x, y]) => [x * s, y]);
  function fasciaShape(points, holes, radius = .025) {
    const sh = outline(points, radius);
    holes.forEach(h => sh.holes.push(outline(h, .009)));
    return sh;
  }
  function boundaryX(y, contour) {
    let x = 0;
    for (let i = 0; i < contour.length - 1; i++) {
      const a = contour[i], b = contour[i + 1];
      if ((a.y <= y && b.y >= y) || (a.y >= y && b.y <= y)) {
        if (Math.abs(a.y - b.y) < 1e-8) continue;
        x = Math.max(x, THREE.MathUtils.lerp(a.x, b.x, (y - a.y) / (b.y - a.y)));
      }
    }
    return x;
  }
  function frame(name, points, map, width, mat, parent) {
    const shape = outline(points, .016);
    const c = points.reduce((a, p) => [a[0] + p[0] / points.length, a[1] + p[1] / points.length], [0, 0]);
    const inset = points.map(([x, y]) => {
      const dx = x - c[0], dy = y - c[1], d = Math.hypot(dx, dy);
      return [x - dx / d * width, y - dy / d * width];
    });
    shape.holes.push(outline(inset, .012));
    return mappedShape(name, shape, map, mat, parent);
  }
  function inside(x, y, poly) {
    let yes = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) yes = !yes;
    }
    return yes;
  }
  function honeycomb(name, poly, parent, radius = .024, depth = .021) {
    const positions = [], indices = [];
    const minX = Math.min(...poly.map(p => p[0])), maxX = Math.max(...poly.map(p => p[0]));
    const minY = Math.min(...poly.map(p => p[1])), maxY = Math.max(...poly.map(p => p[1]));
    for (let col = 0, x = minX; x <= maxX; col++, x += radius * 1.5) {
      for (let y = minY + (col % 2) * radius * Math.sqrt(3) / 2; y <= maxY; y += radius * Math.sqrt(3)) {
        const outer = Array.from({ length: 6 }, (_, i) => [x + radius * Math.cos(i * Math.PI / 3), y + radius * Math.sin(i * Math.PI / 3)]);
        if (!outer.every(p => inside(p[0], p[1], poly))) continue;
        const start = positions.length / 3;
        for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) {
          const r = radius - (k > 0 ? .0023 : 0);
          const px = x + r * Math.cos(i * Math.PI / 3), py = y + r * Math.sin(i * Math.PI / 3);
          positions.push(px, py, frontZ(px, py) - .011 - (k === 2 ? depth : 0));
        }
        for (let i = 0; i < 6; i++) {
          const j = (i + 1) % 6;
          indices.push(start + i, start + j, start + i + 6, start + j, start + j + 6, start + i + 6);
          indices.push(start + i + 6, start + j + 6, start + i + 12, start + j + 6, start + j + 12, start + i + 12);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    mesh(name, geo, black, parent);
    mappedShape(`${name}_recess`, outline(poly, .018), (x, y) => [x, y, frontZ(x, y) - depth - .019], cavity, parent);
  }
  const front = group('front_bumper', car, true);
  const frontHoles = [grillePoly, ...[-1, 1].flatMap(s => [mirrored(intakePoly, s), mirrored(headPoly, s)])];
  mappedShape('rs_style_continuous_bumper_fascia', fasciaShape(frontOutline, frontHoles), (x, y) => [x, y, frontZ(x, y)], paint, front);
  surface('front_nose_to_hood_return', (u, v) => {
    const p = hoodPoint(u, 1);
    const y = .824;
    return [p[0], THREE.MathUtils.lerp(p[1] - .002, y, v), THREE.MathUtils.lerp(p[2] + .002, frontZ(p[0], y), v)];
  }, 40, 4, paint, front, true);
  // The body sides already share the fascia's exact boundary.
  for (const s of [-1, 1]) {
    honeycomb(`lower_honeycomb_${s}`, mirrored(intakePoly, s), front, .022);
    frame(`lower_intake_bevel_${s}`, mirrored(intakePoly, s), (x, y) => [x, y, frontZ(x, y) + .001], .014, gloss, front);
    cylinder(`front_parking_sensor_${s}`, .012, .005, [s * .534, .562, frontZ(.534, .562) + .003], paint, front, 'z', 20);
  }
  const grille = group('grille', car, true);
  honeycomb('single_frame_hexagonal_mesh', grillePoly, grille, .024);
  frame('single_frame_black_perimeter', grillePoly, (x, y) => [x, y, frontZ(x, y) + .002], .026, gloss, grille);
  // A very small blank mounting plinth, leaving the grille pattern dominant.
  rounded('blank_front_plate_mount', [.34, .08, .018], [0, .487, 2.338], .006, black, grille);
  surface('carbon_front_splitter_top', (u, v) => {
    const x = (2 * u - 1) * .877;
    return [x, .169 + .009 * Math.pow(x / .877, 2), 2.36 - .18 * Math.pow(Math.abs(x) / .877, 3) - .112 * v];
  }, 56, 4, carbon, front, true);
  surface('carbon_front_splitter_rolled_edge', (u, v) => {
    const x = (2 * u - 1) * .877;
    return [x, .139 + .03 * v + .009 * Math.pow(x / .877, 2), 2.36 - .18 * Math.pow(Math.abs(x) / .877, 3)];
  }, 56, 3, carbon, front);
  const headlights = group('headlights', car, true);
  for (const s of [-1, 1]) {
    const poly = mirrored(headPoly, s);
    mappedShape(`headlamp_dark_housing_${s}`, outline(poly, .012), (x, y) => [x, y, frontZ(x, y) - .012], gloss, headlights);
    frame(`headlamp_gasket_${s}`, poly, (x, y) => [x, y, frontZ(x, y) + .002], .013, black, headlights);
    const px = s * .716, py = .732, pz = frontZ(px, py);
    const reflector = ellipsoid(`projector_reflector_${s}`, [px, py, pz - .004], [.051, .050, .021], chrome, headlights, 24);
    reflector.rotation.y = s * .23;
    ellipsoid(`white_projector_lens_${s}`, [px, py, pz + .010], [.030, .031, .013], white, headlights, 24);
    cylinder(`inboard_projector_${s}`, .022, .013, [s * .594, .735, frontZ(.594, .735)], darkSteel, headlights, 'z', 24);
    tube(`lower_led_signature_${s}`, [[.566, .692], [.629, .675], [.755, .660], [.834, .678], [.856, .720]].map(([x, y]) => [s * x, y, frontZ(x, y) + .009]), .0058, drl, headlights, false, 42, 8);
    for (let i = 0; i < 3; i++) tube(`headlight_inner_louvre_${s}_${i}`, [[s * (.786 + i * .023), .722, frontZ(.786 + i * .023, .722)], [s * (.802 + i * .021), .761, frontZ(.802 + i * .021, .761)]], .004, steel, headlights, false, 6, 4);
    mappedShape(`clear_headlamp_cover_${s}`, outline(poly, .012), (x, y) => [x, y, frontZ(x, y) + .019], lens, headlights);
  }

  const rear = group('rear_bumper', car, true);
  const tailPoly = [[.38, .798], [.796, .819], [.871, .764], [.834, .668], [.621, .67], [.411, .723]];
  const platePoly = [[-.254, .637], [.254, .637], [.247, .463], [-.247, .463]];
  const exhaustOpenings = [-1, 1].map(s => Array.from({ length: 24 }, (_, i) => [s * .626 + .118 * Math.cos(i / 24 * Math.PI * 2), .240 + .05 * Math.sin(i / 24 * Math.PI * 2)]));
  mappedShape('continuous_rear_bumper_and_trunk_face', fasciaShape(rearOutline, [platePoly, ...[-1, 1].map(s => mirrored(tailPoly, s)), ...exhaustOpenings]), (x, y) => [x, y, rearZ(x, y)], paint, rear, true);
  surface('trunk_trailing_edge_return', (u, v) => {
    const p = trunkPoint(u, 1), y1 = .831;
    return [p[0], THREE.MathUtils.lerp(p[1], y1, v), THREE.MathUtils.lerp(p[2], rearZ(p[0], y1), v)];
  }, 32, 4, paint, rear);
  mappedShape('blank_rear_plate_recess', outline(platePoly, .015), (x, y) => [x, y, rearZ(x, y) + .016], gloss, rear, true);
  for (const s of [-1, 1]) {
    tube(`rear_bumper_shut_line_${s}`, [[s * .268, .437, rearZ(.268, .437) - .002], [s * .66, .428, rearZ(.66, .428) - .002], [s * .866, .442, rearZ(.866, .442)]], .0024, cavity, rear);
    cylinder(`rear_parking_sensor_${s}`, .013, .005, [s * .49, .412, rearZ(.49, .412) - .003], paint, rear, 'z', 20);
    tube(`rear_reflector_${s}`, [[s * .704, .376, rearZ(.704, .376) - .006], [s * .83, .382, rearZ(.83, .382) - .006]], .011, redLens, rear, false, 14);
  }
  const taillights = group('taillights', car, true);
  for (const s of [-1, 1]) {
    const poly = mirrored(tailPoly, s);
    frame(`tail_light_dark_seal_${s}`, poly, (x, y) => [x, y, rearZ(x, y) - .007], .014, gloss, taillights);
    mappedShape(`sculpted_red_tail_lens_${s}`, outline(poly, .015), (x, y) => [x, y, rearZ(x, y) - .011], redLens, taillights, true);
    const sig = [[.412, .75], [.522, .720], [.641, .697], [.799, .704], [.825, .73], [.826, .779]];
    tube(`tail_light_led_signature_${s}`, sig.map(([x, y]) => [s * x, y, rearZ(x, y) - .017]), .009, red, taillights, false, 44, 8);
    tube(`tail_light_upper_led_${s}`, [[s * .424, .782, rearZ(.424, .782) - .018], [s * .607, .783, rearZ(.607, .783) - .018], [s * .797, .793, rearZ(.797, .793) - .018]], .004, red, taillights);
    for (let i = 0; i < 11; i++) {
      const x = .453 + .031 * i;
      tube(`tail_light_internal_optic_${s}_${i}`, [[s * x, .751, rearZ(x, .751) - .014], [s * (x + .011), .777, rearZ(x + .011, .777) - .014]], .0025, red, taillights, false, 4, 4);
    }
    tube(`tail_lamp_trunk_division_${s}`, [[s * .628, .68, rearZ(.628, .68) - .022], [s * .644, .806, rearZ(.644, .806) - .022]], .003, cavity, taillights, false, 10);
  }
  const diffuser = group('diffuser', car, true);
  const diffShape = outline([[-.813, .312], [-.66, .356], [.66, .356], [.813, .312], [.802, .156], [.56, .132], [-.56, .132], [-.802, .156]], .025);
  for (const s of [-1, 1]) {
    const hole = new THREE.Path(); hole.absellipse(s * .626, .236, .118, .061, 0, Math.PI * 2, true); diffShape.holes.push(hole);
  }
  mappedShape('carbon_diffuser_surround', diffShape, (x, y) => [x, y, rearZ(x, y) - .012], carbon, diffuser, true);
  surface('rear_diffuser_undertray', (u, v) => [(u * 2 - 1) * .74, .142 + .03 * v, -1.92 - .395 * v], 18, 6, carbon, diffuser);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * .192;
    const fin = new THREE.ExtrudeGeometry(outline([[-1.91, .151], [-2.322, .15], [-2.29, .107], [-2.07, .116]], .006), { depth: .016, bevelEnabled: true, bevelSize: .003, bevelThickness: .003, bevelSegments: 2, steps: 1, curveSegments: 3 });
    const p = fin.attributes.position;
    for (let n = 0; n < p.count; n++) { const z = p.getX(n), y = p.getY(n), xx = p.getZ(n); p.setXYZ(n, x + xx - .008, y, z); }
    fin.computeVertexNormals(); mesh(`diffuser_vertical_strake_${i}`, fin, carbon, diffuser);
  }
  const exhaust = group('exhaust_tips', car, true);
  for (const s of [-1, 1]) for (let j = 0; j < 2; j++) {
    const x = s * (.568 + .116 * j);
    const profile = [[.041, .0], [.045, .008], [.046, .026], [.046, .126], [.043, .139], [.037, .139], [.036, .131], [.036, .015]].map(([r, a]) => new THREE.Vector2(r, a));
    const geo = new THREE.LatheGeometry(profile, 40); geo.rotateX(-Math.PI / 2);
    const tip = mesh(`hollow_exhaust_tip_${s}_${j}`, geo, chrome, exhaust); tip.position.set(x, .237, -2.221);
    cylinder(`exhaust_dark_bore_${s}_${j}`, .0358, .012, [x, .237, -2.255], cavity, exhaust, 'z', 32);
    cylinder(`exhaust_inlet_pipe_${s}_${j}`, .035, .22, [x, .237, -2.12], darkSteel, exhaust, 'z', 24);
  }

  for (const s of [-1, 1]) {
    const mirror = group(`carbon_mirror_${s}`, body);
    tube(`mirror_stalk_${s}`, [[s * .82, .978, .578], [s * .916, .976, .568], [s * .961, 1.008, .535]], .023, gloss, mirror, false, 16, 8);
    ellipsoid(`carbon_mirror_cap_${s}`, [s * .947, 1.013, .533], [.108, .061, .121], carbon, mirror);
    ellipsoid(`mirror_lower_trim_${s}`, [s * .947, .987, .527], [.105, .035, .114], gloss, mirror);
    const mirrorMat = material(`mirror_reflective_glass_${s}`, '#65717e', { metalness: 1, roughness: .055 });
    surface(`mirror_glass_${s}`, (u, v) => {
      const a = u * Math.PI * 2, r = v;
      return [s * .948 + .084 * r * Math.cos(a), 1.014 + .042 * r * Math.sin(a), .422 + .014 * r * r];
    }, 36, 6, mirrorMat, mirror);
    tube(`mirror_indicator_${s}`, [[s * .892, 1.005, .635], [s * .951, 1.003, .645], [s * 1.018, 1.008, .611]], .003, lens, mirror);
  }

  // Open alloy wheels, real perforated rotors, and stationary calipers.
  function latheX(name, profile, mat, parent, segments = 64) {
    const geo = new THREE.LatheGeometry(profile.map(([x, r]) => new THREE.Vector2(r, x)), segments);
    geo.rotateZ(-Math.PI / 2);
    return mesh(name, geo, mat, parent);
  }
  const tyreProfile = [
    [-.105, .254], [-.121, .272], [-.1275, .302], [-.124, .318], [-.112, .333], [-.09, .343],
    [-.078, .345], [-.060, .345], [-.056, .3428], [-.052, .345],
    [-.022, .345], [-.018, .3432], [-.014, .345],
    [.014, .345], [.018, .3432], [.022, .345],
    [.052, .345], [.056, .3428], [.060, .345], [.078, .345],
    [.09, .343], [.112, .333], [.124, .318], [.1275, .302], [.121, .272], [.105, .254]
  ];
  function makeWheel(id, s, z, frontAxle) {
    const mount = frontAxle ? group(`steer_${id}`, car, true) : group(`rear_hub_${id}`, car);
    mount.position.set(s * .79, .345, z);
    mount.userData.axis = 'y';
    const wheel = group(`wheel_${id}`, mount, true);
    wheel.userData.axis = 'x';
    wheel.userData.radius = .345;
    latheX(`${id}_low_profile_tyre`, tyreProfile, rubber, wheel, 64);
    for (const offset of [-.12, .12]) {
      latheX(`${id}_sidewall_moulding_${offset}`, [[offset, .286], [offset + Math.sign(offset) * .002, .289], [offset, .292]], rubber, wheel, 80);
    }
    // Narrow diagonal tread cuts are geometry on the shoulder, below the
    // maximum radius, so the contact diameter remains exactly 0.69 m.
    for (let k = 0; k < 36; k++) {
      const a = k * Math.PI * 2 / 36;
      for (const sign of [-1, 1]) tube(`${id}_shoulder_sipe_${k}_${sign}`, [0, .5, 1].map(t => {
        const x = sign * (.087 + .023 * t), r = .343 - .009 * t, angle = a + t * .048;
        return [x, r * Math.cos(angle), r * Math.sin(angle)];
      }), .00075, cavity, wheel, false, 3, 3);
    }
    latheX(`${id}_alloy_barrel`, [[-.109, .252], [-.106, .264], [.102, .264], [.116, .270], [.122, .270], [.122, .260], [.105, .252], [-.109, .252]], alloy, wheel);
    latheX(`${id}_machined_outer_lip`, [[s * .116, .268], [s * .121, .271], [s * .124, .270], [s * .124, .265], [s * .120, .264]], machined, wheel);
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 2 * k / 5 + .12;
      for (const split of [-1, 1]) {
        const bladePoints = [[.064, .009], [.099, .012], [.244, .033], [.260, .028], [.258, .053], [.241, .060], [.092, .031], [.064, .026]].map(([r, t]) => [r, t * split]);
        const geo = new THREE.ExtrudeGeometry(outline(bladePoints, .002), { depth: .019, bevelEnabled: true, bevelSize: .0026, bevelThickness: .0026, bevelSegments: 1, steps: 1, curveSegments: 2 });
        const p = geo.attributes.position;
        for (let n = 0; n < p.count; n++) {
          const r = p.getX(n), tang = p.getY(n), depth = p.getZ(n);
          const axial = s * (.091 + .024 * (r / .26) + depth - .01);
          p.setXYZ(n, axial, r * Math.cos(a) - tang * Math.sin(a), r * Math.sin(a) + tang * Math.cos(a));
        }
        if (s < 0) {
          for (let n = 0; n < p.count; n += 3) {
            const a = new THREE.Vector3().fromBufferAttribute(p, n + 1);
            p.setXYZ(n + 1, p.getX(n + 2), p.getY(n + 2), p.getZ(n + 2));
            p.setXYZ(n + 2, a.x, a.y, a.z);
          }
        }
        geo.computeVertexNormals(); mesh(`${id}_double_spoke_${k}_${split}`, geo, alloy, wheel);
      }
    }
    cylinder(`${id}_central_hub`, .078, .032, [s * .104, 0, 0], alloy, wheel, 'x', 48);
    cylinder(`${id}_plain_center_cap`, .037, .006, [s * .124, 0, 0], darkSteel, wheel, 'x', 40);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2;
      const y = .054 * Math.cos(a), zz = .054 * Math.sin(a);
      cylinder(`${id}_lug_recess_${k}`, .010, .003, [s * .122, y, zz], cavity, wheel, 'x', 16);
      cylinder(`${id}_lug_bolt_${k}`, .0062, .007, [s * .125, y, zz], darkSteel, wheel, 'x', 6);
    }
    const va = -.4;
    cylinder(`${id}_valve_stem`, .004, .012, [s * .13, .245 * Math.cos(va), .245 * Math.sin(va)], rubber, wheel, 'x', 10);
    const brake = group(`brake_${id}`, mount, true);
    const rotorShape = outline(Array.from({ length: 64 }, (_, i) => [.222 * Math.cos(i / 64 * Math.PI * 2), .222 * Math.sin(i / 64 * Math.PI * 2)]));
    const centreHole = new THREE.Path(); centreHole.absarc(0, 0, .079, 0, Math.PI * 2, true); rotorShape.holes.push(centreHole);
    for (const [row, radius] of [.163, .194].entries()) for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2 + row * .055;
      const h = new THREE.Path(); h.absarc(radius * Math.cos(a), radius * Math.sin(a), .0048, 0, Math.PI * 2, true); rotorShape.holes.push(h);
    }
    const rotorGeo = new THREE.ExtrudeGeometry(rotorShape, { depth: .012, bevelEnabled: false, curveSegments: 3, steps: 1 });
    rotorGeo.rotateY(Math.PI / 2); rotorGeo.translate(s * .05 - .006, 0, 0);
    const rotor = mesh(`${id}_drilled_brake_disc`, rotorGeo, steel, brake);
    wheel.userData.brakeRotor = rotor;
    cylinder(`${id}_brake_hat`, .094, .021, [s * .046, 0, 0], darkSteel, brake, 'x', 40);
    const caliper = rounded(`${id}_black_brake_caliper`, [.07, .156, .074], [s * .050, .015, -.191], .023, plastic, brake, 4);
    caliper.rotation.x = -.10;
    rounded(`${id}_caliper_bridge`, [.082, .092, .033], [s * .043, .015, -.216], .011, plastic, brake);
    for (const yy of [-.032, .061]) cylinder(`${id}_caliper_pin_${yy}`, .008, .009, [s * .089, yy, -.192], darkSteel, brake, 'x', 12);
    return wheel;
  }
  makeWheel('fl', 1, 1.405, true);
  makeWheel('fr', -1, 1.405, true);
  makeWheel('rl', 1, -1.405, false);
  makeWheel('rr', -1, -1.405, false);

  // Engine bay: closed bottom, painted inner wings, firewall and the complete
  // longitudinal supercharged V6 assembly. Every part clears the closed hood.
  const bay = group('engine_bay', body);
  rounded('engine_bay_lower_cradle', [1.25, .07, 1.35], [0, .419, 1.394], .035, plastic, bay);
  rounded('firewall', [1.37, .37, .064], [0, .639, .737], .023, paint, bay);
  rounded('cowl_plenum', [1.48, .044, .13], [0, .875, .729], .018, plastic, bay);
  for (let i = 0; i < 28; i++) rounded(`cowl_vent_${i}`, [.028, .003, .067], [-.64 + i * .0474, .899, .745], .001, cavity, bay, 1);
  for (const s of [-1, 1]) {
    surface(`painted_inner_wing_${s}`, (u, v) => {
      const z = .812 + 1.23 * u;
      const x = s * (.503 + .215 * v);
      const y = .715 + .101 * v + .028 * Math.sin(u * Math.PI);
      return [x, y, z];
    }, 24, 8, paint, bay, s === 1);
    ellipsoid(`strut_tower_${s}`, [s * .566, .732, 1.302], [.132, .075, .143], paint, bay, 24);
    cylinder(`strut_top_mount_${s}`, .066, .026, [s * .566, .804, 1.302], rubber, bay, 'y', 24);
    cylinder(`strut_top_nut_${s}`, .014, .013, [s * .566, .822, 1.302], steel, bay, 'y', 6);
    tube(`bay_wiring_harness_${s}`, [[s * .678, .791, .88], [s * .665, .79, 1.2], [s * .677, .767, 1.66], [s * .611, .727, 1.98]], .013, silicone, bay, false, 35);
    for (let i = 0; i < 5; i++) cylinder(`wing_fastener_${s}_${i}`, .009, .006, [s * .697, .820, .894 + i * .225], darkSteel, bay, 'y', 6);
  }
  rounded('v6_lower_engine_block', [.57, .28, .70], [0, .527, 1.32], .07, darkSteel, bay);
  for (const s of [-1, 1]) {
    const valve = rounded(`cylinder_bank_${s}`, [.235, .177, .674], [s * .241, .625, 1.318], .043, darkSteel, bay);
    valve.rotation.z = s * .24;
    for (let i = 0; i < 3; i++) {
      rounded(`ignition_coil_${s}_${i}`, [.059, .049, .087], [s * .345, .716, 1.075 + i * .203], .012, plastic, bay);
      tube(`coil_wire_${s}_${i}`, [[s * .348, .73, 1.09 + i * .203], [s * .394, .703, 1.10 + i * .203], [s * .396, .626, 1.13 + i * .203]], .006, silicone, bay, false, 12);
    }
  }
  rounded('cast_supercharger_housing', [.596, .167, .695], [0, .689, 1.314], .058, steel, bay, 4);
  const cover = group('engine_cover', car, true);
  extrudeXZ('raised_black_v6_engine_cover', [[-.133, .953], [.133, .953], [.175, 1.09], [.227, 1.206], [.229, 1.576], [.154, 1.685], [-.154, 1.685], [-.229, 1.576], [-.227, 1.206], [-.175, 1.09]], .79, .071, .026, plastic, cover);
  extrudeXZ('engine_cover_central_inset', [[-.098, 1.108], [.098, 1.108], [.136, 1.258], [.14, 1.548], [-.14, 1.548], [-.136, 1.258]], .816, .008, .005, silicone, cover);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) tube(`supercharger_cast_rib_${s}_${i}`, [[s * .223, .783, 1.143 + .112 * i], [s * .277, .766, 1.143 + .112 * i], [s * .297, .719, 1.163 + .112 * i]], .007, steel, bay, false, 10);
    tube(`engine_cover_edge_${s}`, [[s * .14, .816, 1.024], [s * .18, .817, 1.186], [s * .198, .815, 1.46], [s * .151, .812, 1.626]], .0035, darkSteel, cover, false, 28);
  }
  const intake = group('intake_box', car, true);
  extrudeXZ('carbon_airbox_lower_shell', [[.316, 1.605], [.699, 1.592], [.699, 1.978], [.484, 2.038], [.285, 1.896]], .69, .177, .022, carbon, intake);
  extrudeXZ('carbon_airbox_lid', [[.316, 1.605], [.699, 1.592], [.699, 1.978], [.484, 2.038], [.285, 1.896]], .706, .015, .013, carbon, intake);
  tube('airbox_lid_moulded_rib', [[.35, .725, 1.64], [.603, .725, 1.64], [.656, .725, 1.9], [.479, .725, 1.977]], .005, gloss, intake);
  for (const [i, p] of [[.366, .724, 1.658], [.639, .724, 1.672], [.629, .724, 1.93]].entries()) cylinder(`airbox_fastener_${i}`, .007, .004, p, darkSteel, intake, 'y', 6);
  const hose = group('intake_hose', car, true);
  tube('silicone_intake_elbow', [[.434, .73, 1.637], [.443, .766, 1.456], [.421, .780, 1.197], [.32, .771, 1.015], [.159, .752, 1.016]], .054, silicone, hose, false, 48, 16);
  // Band clamps are rings around the hose ends, with a small screw housing.
  for (const [i, p] of [[.434, .737, 1.597], [.443, .773, 1.44]].entries()) {
    const clamp = mesh(`intake_band_clamp_${i}`, new THREE.TorusGeometry(.055, .0032, 6, 32), steel, hose); clamp.position.set(...p);
    rounded(`hose_clamp_screw_${i}`, [.016, .012, .02], [p[0] + .048, p[1] + .029, p[2]], .004, steel, hose);
  }
  cylinder('throttle_body', .063, .095, [.137, .754, 1.016], steel, bay, 'x', 32);
  cylinder('oil_fill_cap', .032, .027, [-.255, .752, 1.546], plastic, bay, 'y', 24);
  rounded('oil_cap_grip', [.049, .01, .013], [-.255, .77, 1.546], .004, gloss, bay);
  const coolant = group('coolant_tank', car, true);
  const tankMat = material('translucent_coolant_reservoir', '#d9dbd6', { roughness: .31, transmission: .22, thickness: .035, transparent: true, opacity: .88, ior: 1.4 });
  ellipsoid('coolant_expansion_tank', [-.481, .734, .977], [.127, .083, .143], tankMat, coolant);
  tube('coolant_tank_weld_seam', Array.from({ length: 32 }, (_, i) => [-.481 + .124 * Math.cos(i / 32 * Math.PI * 2), .731, .977 + .139 * Math.sin(i / 32 * Math.PI * 2)]), .003, tankMat, coolant, true, 40);
  cylinder('reservoir_neck', .042, .027, [-.482, .814, .939], tankMat, coolant, 'y', 24);
  const capMat = material('coolant_cap_blue', '#2f6fd6', { roughness: .4 });
  cylinder('blue_coolant_cap', .043, .025, [-.482, .836, .939], capMat, coolant, 'y', 32);
  rounded('blue_cap_grip', [.063, .009, .015], [-.482, .852, .939], .004, capMat, coolant);
  tube('coolant_return_hose', [[-.577, .734, 1.034], [-.653, .703, 1.1], [-.664, .608, 1.605], [-.495, .571, 1.912]], .016, silicone, bay);
  tube('upper_radiator_hose', [[-.288, .621, 1.623], [-.376, .648, 1.771], [-.493, .647, 1.86], [-.572, .614, 1.991]], .029, silicone, bay, false, 30, 10);
  rounded('fuse_and_relay_box', [.191, .128, .222], [-.499, .676, 1.737], .018, plastic, bay);
  const pulley = group('pulley', car, true);
  const pulleyCenters = [[0, .628, .079], [-.155, .484, .055], [.167, .491, .058]];
  pulleyCenters.forEach(([x, y, r], i) => {
    cylinder(`accessory_pulley_${i}`, r, .034, [x, y, 1.752], darkSteel, pulley, 'z', 40);
    cylinder(`pulley_hub_${i}`, r * .35, .041, [x, y, 1.753], steel, pulley, 'z', 24);
    const ring = mesh(`pulley_groove_${i}`, new THREE.TorusGeometry(r - .005, .004, 6, 40), rubber, pulley); ring.position.set(x, y, 1.773);
    for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; cylinder(`pulley_bolt_${i}_${j}`, .004, .003, [x + r * .63 * Math.cos(a), y + r * .63 * Math.sin(a), 1.772], steel, pulley, 'z', 6); }
  });
  const beltOutside = outline([[-.052, .69], [.049, .691], [.218, .519], [.22, .467], [.174, .438], [-.164, .431], [-.209, .464], [-.209, .515]], .035);
  // The inner contour retains a flat, wide belt face.
  beltOutside.holes.push(outline([[-.048, .678], [.044, .679], [.207, .514], [.207, .474], [.169, .451], [-.16, .444], [-.196, .47], [-.197, .51]], .028));
  const beltGeo = new THREE.ExtrudeGeometry(beltOutside, { depth: .018, bevelEnabled: false, curveSegments: 5 });
  beltGeo.translate(0, 0, 1.773); mesh('supercharger_serpentine_belt', beltGeo, rubber, pulley);
  cylinder('alternator_body', .091, .149, [.31, .499, 1.581], steel, bay, 'z', 28);
  for (let i = 0; i < 9; i++) rounded(`alternator_cooling_slot_${i}`, [.009, .06, .094], [.256 + i * .013, .568, 1.584], .003, darkSteel, bay);
  const exchanger = group('heat_exchanger', car, true);
  const radiatorMat = material('radiator_core', '#202226', { metalness: .5, roughness: .67 });
  rounded('front_heat_exchanger_core', [1.18, .33, .036], [0, .53, 2.077], .006, radiatorMat, exchanger);
  for (let i = 0; i < 24; i++) rounded(`heat_exchanger_horizontal_fin_${i}`, [1.105, .004, .009], [0, .374 + i * .0133, 2.1], .001, darkSteel, exchanger, 1);
  for (const s of [-1, 1]) rounded(`heat_exchanger_end_tank_${s}`, [.052, .35, .061], [s * .595, .532, 2.076], .014, plastic, exchanger);
  rounded('main_radiator_core', [1.252, .373, .068], [0, .545, 1.988], .01, radiatorMat, bay);
  for (let i = 0; i < 32; i++) rounded(`main_radiator_fin_${i}`, [.009, .32, .008], [-.586 + i * .0378, .54, 1.948], .001, darkSteel, bay, 1);
  rounded('front_radiator_support', [1.433, .064, .099], [0, .744, 2.08], .017, plastic, bay);
  for (const s of [-1, 1]) {
    rounded(`radiator_support_side_${s}`, [.064, .33, .084], [s * .659, .58, 2.077], .017, plastic, bay);
    for (let i = 0; i < 3; i++) cylinder(`radiator_support_fastener_${s}_${i}`, .009, .007, [s * (.185 + i * .23), .78, 2.08], steel, bay, 'y', 6);
  }
  rounded('bonnet_latch', [.098, .024, .053], [0, .783, 2.092], .009, darkSteel, bay);

  // Interior remains visible through the tint and with the hood viewed from
  // above: full seats, console, binnacle, MMI and a left-hand-drive wheel.
  const interior = group('interior', body);
  rounded('cabin_floor', [1.46, .069, 1.83], [0, .337, -.34], .035, rubber, interior);
  const seats = group('seats', car, true);
  for (const s of [-1, 1]) {
    const seat = group(`front_sport_seat_${s}`, seats);
    seat.position.set(s * .386, 0, -.075);
    rounded(`seat_base_${s}`, [.432, .123, .496], [0, .466, .035], .055, leather, seat, 4);
    for (const side of [-1, 1]) {
      const bolster = rounded(`seat_cushion_bolster_${s}_${side}`, [.084, .117, .415], [side * .184, .51, .04], .04, leather, seat);
      bolster.rotation.z = side * -.13;
    }
    const back = group(`seat_back_${s}`, seat); back.position.set(0, .54, -.167); back.rotation.x = -.16;
    rounded(`seat_sculpted_backrest_${s}`, [.414, .467, .113], [0, .216, 0], .052, leather, back, 4);
    rounded(`seat_backrest_insert_${s}`, [.25, .351, .04], [0, .203, .061], .022, leather, back);
    for (const side of [-1, 1]) rounded(`seat_back_bolster_${s}_${side}`, [.073, .37, .142], [side * .178, .214, .04], .032, leather, back);
    rounded(`front_headrest_${s}`, [.236, .169, .106], [0, .535, -.009], .037, leather, back, 4);
    for (const xx of [-.061, .061]) cylinder(`headrest_post_${s}_${xx}`, .007, .086, [xx, .445, -.004], steel, back, 'y', 12);
    for (const yy of [.097, .192, .288]) tube(`seat_stitching_${s}_${yy}`, [[-.104, yy, .084], [0, yy - .006, .087], [.104, yy, .084]], .0017, seamMat, back, false, 10, 4);
  }
  rounded('rear_bench_cushion', [1.25, .125, .447], [0, .486, -.985], .055, leather, seats, 4);
  const rearBack = rounded('rear_bench_backrest', [1.24, .392, .123], [0, .724, -1.181], .049, leather, seats, 4); rearBack.rotation.x = -.13;
  for (const x of [-.429, 0, .429]) rounded(`rear_headrest_${x}`, [.219, .144, .094], [x, .991, -1.21], .03, leather, seats);
  rounded('rear_parcel_shelf', [1.32, .033, .36], [0, .856, -1.341], .012, dashMat, interior);
  tube('third_brake_light', [[-.125, .9, -1.448], [.125, .9, -1.448]], .006, redLens, interior, false, 12, 6);
  rounded('dashboard_main_pad', [1.438, .178, .353], [0, .815, .529], .07, dashMat, interior, 4);
  ellipsoid('driver_instrument_binnacle', [.382, .875, .50], [.233, .104, .168], dashMat, interior);
  rounded('instrument_cluster_glass', [.282, .104, .015], [.384, .854, .358], .019, gloss, interior);
  rounded('center_console', [.207, .174, .743], [0, .494, -.016], .046, dashMat, interior);
  rounded('console_metal_trim', [.167, .008, .311], [0, .586, .113], .012, darkSteel, interior);
  rounded('gear_selector_base', [.08, .023, .097], [0, .604, .144], .021, gloss, interior);
  ellipsoid('gear_selector', [0, .65, .132], [.028, .043, .033], leather, interior, 20);
  rounded('console_armrest', [.201, .067, .265], [0, .621, -.21], .028, leather, interior);
  for (const s of [-1, 1]) {
    rounded(`dashboard_vent_${s}`, [.183, .043, .025], [s * .586, .838, .359], .009, gloss, interior);
    for (let i = 0; i < 3; i++) rounded(`vent_slat_${s}_${i}`, [.158, .003, .027], [s * .586, .825 + i * .012, .354], .001, darkSteel, interior, 1);
    rounded(`inner_door_card_${s}`, [.067, .34, .84], [s * .76, .637, .029], .03, dashMat, interior);
    rounded(`inner_door_armrest_${s}`, [.097, .045, .334], [s * .708, .618, -.034], .017, leather, interior);
  }
  const screen = group('mmi_screen', car, true);
  rounded('mmi_screen_black_frame', [.223, .127, .024], [0, .932, .388], .012, plastic, screen);
  const screenMat = material('mmi_glossy_off_screen', '#0a0c10', { roughness: .08, metalness: .35, clearcoat: 1 });
  rounded('mmi_display_glass', [.192, .093, .004], [0, .935, .374], .003, screenMat, screen);
  const steering = group('steering_wheel', car, true);
  steering.position.set(.384, .834, .286); steering.rotation.x = .26;
  const wheelPath = [[-.093, -.103, 0], [-.133, -.042, 0], [-.132, .049, 0], [-.076, .119, 0], [0, .141, 0], [.076, .119, 0], [.132, .049, 0], [.133, -.042, 0], [.093, -.103, 0], [0, -.107, 0]];
  tube('flat_bottom_leather_steering_rim', wheelPath, .015, leather, steering, true, 70, 10);
  rounded('steering_airbag_hub', [.106, .081, .047], [0, .012, -.004], .025, leather, steering);
  for (const s of [-1, 1]) tube(`steering_horizontal_spoke_${s}`, [[s * .036, .008, 0], [s * .076, -.002, 0], [s * .122, .012, 0]], .012, darkSteel, steering, false, 10, 6);
  tube('steering_lower_spoke', [[0, -.026, 0], [0, -.069, 0], [0, -.102, 0]], .012, darkSteel, steering, false, 10, 6);
  tube('steering_column', [[.384, .793, .532], [.384, .817, .377], [.384, .834, .292]], .034, plastic, interior, false, 16, 10);

  car.userData.animation = {
    hood: { part: 'hood', axis: 'x', closed: 0, open: -55 * Math.PI / 180 },
    steering: { parts: ['steer_fl', 'steer_fr'], axis: 'y', max: .48 },
    wheels: { parts: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'], axis: 'x', radius: .345 },
  };
  // Consolidate repeated tiny fittings within their owning part. This keeps
  // marker targets intact while avoiding hundreds of small draw calls.
  function combineDetails(parent, pattern, name) {
    const items = parent.children.filter(o => o.isMesh && pattern.test(o.name));
    if (items.length < 2) return;
    const geometries = items.map(o => {
      o.updateMatrix();
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      return g.applyMatrix4(o.matrix);
    });
    const combined = mergeGeometries(geometries, false);
    if (!combined) throw new Error(`Could not combine ${name}`);
    mesh(name, combined, items[0].material, parent);
    items.forEach(o => { parent.remove(o); o.geometry.dispose(); });
    geometries.forEach(g => g.dispose());
  }
  for (const id of ['fl', 'fr', 'rl', 'rr']) {
    const w = parts[`wheel_${id}`];
    combineDetails(w, /_shoulder_sipe_/, `${id}_tyre_shoulder_sipes`);
    combineDetails(w, /_double_spoke_/, `${id}_five_double_spoke_alloy`);
    combineDetails(w, /_lug_bolt_/, `${id}_five_lug_bolts`);
    combineDetails(w, /_lug_recess_/, `${id}_lug_recesses`);
  }
  combineDetails(bay, /^cowl_vent_/, 'cowl_vent_slots');
  combineDetails(bay, /^main_radiator_fin_/, 'main_radiator_cooling_fins');
  combineDetails(bay, /^alternator_cooling_slot_/, 'alternator_cooling_slots');
  combineDetails(bay, /^wing_fastener_/, 'inner_wing_fasteners');
  combineDetails(bay, /^radiator_support_fastener_/, 'radiator_support_fasteners');
  combineDetails(exchanger, /^heat_exchanger_horizontal_fin_/, 'heat_exchanger_cooling_fins');
  combineDetails(taillights, /^tail_light_internal_optic_/, 'tail_light_led_optics');
  combineDetails(headlights, /^headlight_inner_louvre_/, 'headlight_internal_louvres');
  combineDetails(glass, /^rear_glass_heater_/, 'rear_windscreen_heating_elements');
  combineDetails(diffuser, /^diffuser_vertical_strake_/, 'five_diffuser_strakes');
  return car;
}
