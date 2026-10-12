// src/world/far-street.js: the far city's boxes: what stands at street level
// on the first streets past the kit, what stands on its towers' roofs, and
// the decks that span between them.
//
// The far city's ground is the sky dome's (src/world/skyline.js): asphalt,
// paint and pools of light on a plane. From the air that is a city. From the
// loop's last pavement, looking out, a walker sees its first rows from fifty
// metres, and a plane is not a street. So on those first streets every block
// stands on a paved slab with a kerb, every pool of light has its lamp (a
// post on the kerb, an arm, a lit head over the road), and cars are parked
// along the kerbs. All of it is boxes, in one instanced draw, culled to the
// lens, and the small things (posts, heads, cars) only drawn within a few
// hundred metres, where they are more than a pixel: twelve numbers a box
// (x, y, z of its middle, its turn, its size, its kind and three numbers of
// its own).
//
// The same draw carries the towers' heads (masts, aerials, dishes: steel;
// huts and penthouses: blocks) and the megastructures (a deck of two lit
// floors in a truss, the boards that stand on it), and the far city's AVs:
// a body that flies its lane in the vertex shader (its own numbers: the
// lane's length, where along it the AV starts, a seed), shrinking to nothing
// at the lane's ends so it never pops.
//
// And who is out on those first pavements: somebody standing or waiting, a
// box cut to a head, a jacket and two legs, half of them under an umbrella
// (an eight-sided canopy, a few with a line of light round the rim), and
// here and there a vending machine lit from inside, against the wall.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { ADVERT } from "./sky-columns.js";

export const BOX = { slab: 0, post: 1, head: 2, car: 3, cabin: 4, steel: 5, block: 6, deck: 7, board: 8, av: 9, lattice: 10, person: 11, umbrella: 12, vending: 13 };

// How far each kind is drawn: past it, it is under a pixel (a slab, a deck
// and its boards are always drawn).
const REACH = [Infinity, 320, 320, 320, 320, 900, 1500, Infinity, Infinity, 1500, 2400, 220, 220, 320];

/** `boxes` is the flat list; `street` the dome's GLSL for the lamps' pools
 *  (streetLamps), so a slab is lit by the same lamps as the road beside it;
 *  `ads` the advert atlas's uniforms, for the boards. */
export function createFarStreet(scene, shared, boxes, { street, ads, reduced = false }) {
  const n = boxes.length / 12;
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", unit.attributes.position);
  geometry.setAttribute("normal", unit.attributes.normal);
  geometry.setIndex(unit.index);
  const attrs = ["aAt", "aSize", "aOwn"].map((name) => {
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(n, 1) * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(name, attr);
    return attr;
  });
  geometry.instanceCount = 0;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(160, 0, -330), 900);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, ...ads, uMotion: { value: reduced ? 0 : 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aAt;
      attribute vec4 aSize;
      attribute vec4 aOwn;
      uniform float uTime;
      uniform float uMotion;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
      varying vec4 vSize;
      varying vec4 vOwn;
      void main() {
        vec3 l = position * aSize.xyz;
        float cs = cos(aAt.w);
        float sn = sin(aAt.w);
        // An AV is so far along its lane (38 m/s, as its lamps are).
        if (aSize.w > 8.5) {
          float along = mod(uTime * uMotion * 38.0 + aOwn.y * aOwn.x, max(aOwn.x, 1.0));
          l *= smoothstep(0.0, 70.0, along) * (1.0 - smoothstep(aOwn.x - 70.0, aOwn.x, along));
          l.x += along - 3.0;
        }
        vec3 w = vec3(aAt.x + cs * l.x + sn * l.z, aAt.y + l.y, aAt.z - sn * l.x + cs * l.z);
        vWorld = w;
        vNormalW = vec3(cs * normal.x + sn * normal.z, normal.y, -sn * normal.x + cs * normal.z);
        vLocal = position * aSize.xyz;
        vSize = aSize;
        vOwn = aOwn;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${ADVERT}
      ${street}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
      varying vec4 vSize;
      varying vec4 vOwn;
      void main() {
        vec3 n = normalize(vNormalW);
        float kind = vSize.w;
        float px = max(max(fwidth(vWorld.x), fwidth(vWorld.z)), 0.05);
        float close = 1.0 - smoothstep(0.08, 0.4, px);
        // What falls on it: the kerb's lamps, the kit's own spill, the sky.
        vec3 lamps = streetLamps(vWorld, px);
        vec3 sky = (uHazeColor * 0.3 + uGlowColor * 0.16) * uHaze;
        vec3 light = lamps + spillAt(vWorld) * 0.6;
        vec3 col;
        float lit = 0.0;
        if (kind < 0.5) {
          // A slab: paving in two metre flags, a kerb of pale stone round
          // its edge, its face down to the road.
          vec2 fromEdge = vSize.xz * 0.5 - abs(vLocal.xz);
          float edge = min(fromEdge.x, fromEdge.y);
          float joint = close * step(min(fract(vWorld.x * 0.5), fract(vWorld.z * 0.5)), 0.04);
          vec3 paving = vec3(0.021, 0.021, 0.025) * (1.0 - 0.35 * joint);
          vec3 kerb = vec3(0.034, 0.034, 0.038) * (1.0 - 0.3 * close * step(fract((fromEdge.x < fromEdge.y ? vWorld.z : vWorld.x) / 0.9), 0.05));
          vec3 top = mix(paving, kerb, step(edge, 0.3));
          col = n.y > 0.5 ? top * (vec3(0.5) + sky * 4.0) + top * 14.0 * light : kerb * (vec3(0.35) + sky * 2.0) + kerb * 7.0 * light;
        } else if (kind < 1.5) {
          // A lamp's post: dark steel, a paler band at its foot.
          col = vec3(0.012, 0.013, 0.016) * (1.0 + 1.2 * step(vLocal.y, -vSize.y * 0.5 + 0.9)) + vec3(0.02) * light * 6.0 + sky * 0.04;
        } else if (kind < 2.5) {
          // Its arm, and at the arm's end the head, lit from under: the
          // street's own light (the colour its pools are).
          vec3 sodium = mix(vec3(1.0, 0.55, 0.2), vec3(0.85, 0.9, 1.0), step(0.7, hash12(vec2(vOwn.x, vOwn.y + 3.0))));
          float along = vSize.x > vSize.z ? vLocal.x / vSize.x : vLocal.z / vSize.z;
          float head = step(0.22, along * vOwn.z);
          // (Its lens wraps the head's end: from across the street the lamp
          // is a bar of light, not a dark stick over a lit pool.)
          lit = head * max(step(n.y, -0.5), 0.7 * step(n.y, 0.5) * step(0.36, along * vOwn.z));
          col = mix(vec3(0.012, 0.013, 0.016) + sodium * 0.05 * head, sodium * 3.0, lit);
        } else if (kind > 4.5 && kind < 5.5) {
          // Steel on a roof: dark against the sky, its top and edges
          // catching the glow; a dish's panel a little paler.
          col = vec3(0.012, 0.013, 0.017) * (1.0 + 2.0 * vOwn.x) + (uHazeColor * 0.35 + uGlowColor * 0.2) * (0.25 + 0.75 * max(n.y, 0.0)) * uHaze * 0.5;
        } else if (kind > 5.5 && kind < 6.5) {
          // A hut or a penthouse: a dark wall with louvres, and on a
          // penthouse a line of light under its roof.
          vec3 wall = vec3(0.022, 0.023, 0.029) * (0.75 + 0.25 * step(0.5, fract(vWorld.y * 2.2)));
          col = wall * (vec3(0.6) + sky * 4.0 * (0.4 + max(n.y, 0.0)));
          float line = vOwn.y * step(abs(n.y), 0.5) * step(abs(vLocal.y - (vSize.y * 0.5 - 0.9)), 0.3);
          vec3 lc = vOwn.x < 0.4 ? vec3(1.0, 0.62, 0.3) : vOwn.x < 0.75 ? vec3(0.2, 0.85, 1.0) : vec3(1.0, 0.88, 0.72);
          col = mix(col, lc * 1.5, line);
          lit = line;
        } else if (kind > 6.5 && kind < 7.5) {
          // A megastructure's deck: two floors of windows lit bay by bay
          // behind a truss, a dark roof and a dark belly.
          float side = step(vSize.z * 0.5 - 0.01, abs(vLocal.z));
          vec2 cell = vec2(vLocal.x / 3.2, (vLocal.y + vSize.y * 0.5) / 3.8);
          vec2 f = fract(cell);
          float pane = step(0.08, f.x) * step(f.x, 0.92) * step(0.3, f.y) * step(f.y, 0.82);
          float on = step(0.38, hash12(floor(cell) + vOwn.x * 91.0 + step(0.0, vLocal.z) * 7.0));
          vec3 glow = mix(vec3(1.0, 0.66, 0.34), vec3(0.6, 0.85, 1.0), step(0.7, hash12(vec2(floor(cell.y), vOwn.x * 13.0))));
          float truss = step(abs(abs(fract(vLocal.x / 15.2) - 0.5) * 2.0 - (vLocal.y / vSize.y + 0.5)), 0.05) + step(vSize.y * 0.5 - 0.45, abs(vLocal.y));
          vec3 steel = vec3(0.016, 0.017, 0.022) + (uHazeColor * 0.35 + uGlowColor * 0.2) * (0.25 + 0.75 * max(n.y, 0.0)) * uHaze * 0.5;
          lit = pane * on * side * (1.0 - clamp(truss, 0.0, 1.0));
          col = mix(steel, glow * 0.75, lit);
        } else if (kind > 12.5) {
          // A vending machine: a dark case, its front a lit window of rows
          // of cans, a slot of white light under them.
          float front = step(vSize.z * 0.5 - 0.01, abs(vLocal.z));
          vec2 q = vec2(vLocal.x / vSize.x + 0.5, vLocal.y / vSize.y + 0.5);
          vec3 glow = vOwn.x < 0.35 ? vec3(0.2, 0.9, 1.0) : vOwn.x < 0.6 ? vec3(1.0, 0.25, 0.55) : vOwn.x < 0.8 ? vec3(1.0, 0.8, 0.4) : vec3(0.85, 0.95, 1.0);
          float pane = step(0.1, q.x) * step(q.x, 0.9) * step(0.36, q.y) * step(q.y, 0.93);
          float cans = 0.45 + 0.55 * step(0.3, fract(q.x * 6.0)) * step(0.25, fract(q.y * 7.0)) * step(0.35, hash12(floor(q * vec2(6.0, 7.0)) + vOwn.x * 9.0));
          float slot = step(abs(q.y - 0.24), 0.04) * step(abs(q.x - 0.5), 0.3);
          lit = front * max(pane, slot);
          col = mix(vec3(0.02, 0.022, 0.028) + glow * 0.03, mix(glow * cans * 1.1, vec3(1.0) * 1.3, slot), lit);
        } else if (kind > 11.5) {
          // An umbrella: eight sides, dark or bright, a few with a line of
          // light round the rim.
          float r = length(vLocal.xz) / (vSize.x * 0.5);
          float a = atan(vLocal.z, vLocal.x);
          float flat8 = r * cos(mod(a, 0.7854) - 0.3927);
          if (flat8 > 0.92) discard;
          vec3 cloth = vOwn.x < 0.5 ? vec3(0.016, 0.017, 0.022) : vOwn.x < 0.65 ? vec3(0.1, 0.014, 0.02) : vOwn.x < 0.8 ? vec3(0.012, 0.03, 0.09) : vOwn.x < 0.9 ? vec3(0.12, 0.09, 0.02) : vec3(0.11, 0.11, 0.12);
          col = cloth * (vec3(0.5) + sky * 5.0 * (0.3 + max(n.y, 0.0)) + light * 9.0);
          float rim = step(0.9, vOwn.x) * step(0.8, flat8);
          col = mix(col, vec3(0.3, 0.95, 1.0) * 1.6, rim);
          lit = rim;
        } else if (kind > 10.5) {
          // Somebody: a head, a jacket in one of a few colours, two legs
          // (the box cut away round the head and between the legs).
          float v = vLocal.y / vSize.y + 0.5;
          float ax = abs(vLocal.x);
          if ((v > 0.87 && ax > 0.12) || (v > 0.82 && v <= 0.87 && ax > 0.07) || (v < 0.47 && ax < 0.035)) discard;
          vec3 jacket = vOwn.x < 0.34 ? vec3(0.022, 0.023, 0.028) : vOwn.x < 0.5 ? vec3(0.07, 0.072, 0.08) : vOwn.x < 0.62 ? vec3(0.11, 0.02, 0.025) : vOwn.x < 0.76 ? vec3(0.018, 0.04, 0.1) : vOwn.x < 0.88 ? vec3(0.12, 0.085, 0.02) : vec3(0.02, 0.08, 0.07);
          vec3 body = v > 0.87 ? vec3(0.075, 0.055, 0.045) : v > 0.47 ? jacket : vec3(0.016, 0.017, 0.022);
          col = body * (vec3(0.5) + sky * 5.0 * (0.3 + max(n.y, 0.0)) + light * 9.0);
        } else if (kind > 9.5) {
          // A lattice mast's section, or a truss round a roof: legs at its
          // corners, a ring at every panel, a cross in each, and between
          // them the sky. Far off, where a member is under a pixel, steel.
          if (abs(n.y) > 0.5) discard;
          bool onX = abs(vLocal.x) > vSize.x * 0.5 - 0.01;
          float wide = onX ? vSize.z : vSize.x;
          float u = (onX ? vLocal.z : vLocal.x) / wide + 0.5;
          float panels = max(1.0, floor(vSize.y / min(wide, 9.0) + 0.5));
          float fv = fract((vLocal.y / vSize.y + 0.5) * panels);
          float span = max(1.0, floor(wide / 9.0 + 0.5));
          float fu = fract(u * span);
          float t = clamp(0.3 / (wide / span), 0.03, 0.12);
          float member = step(min(fu, 1.0 - fu), t) + step(min(fv, 1.0 - fv), t * 0.7) + step(abs(fu - fv), t) + step(abs(fu - (1.0 - fv)), t);
          if (member < 0.5 && fwidth(u * span) < 0.3) discard;
          col = vec3(0.014, 0.015, 0.02) + (uHazeColor * 0.35 + uGlowColor * 0.2) * uHaze * 0.3;
        } else if (kind > 8.5) {
          // An AV: a dark hull, a strip of running light down each side,
          // white at its nose, red at its tail, thrusters glowing under it.
          vec3 trim = vOwn.z < 0.5 ? vec3(0.16, 0.9, 1.0) : vec3(1.0, 0.6, 0.25);
          float side = step(vSize.z * 0.5 - 0.01, abs(vLocal.z)) * step(abs(vLocal.y + 0.1), 0.12);
          float nose = step(vSize.x * 0.5 - 0.01, vLocal.x) * step(abs(abs(vLocal.z) - 0.8), 0.3);
          float tail = step(vLocal.x, -vSize.x * 0.5 + 0.01) * step(abs(vLocal.y), 0.2);
          float jets = step(n.y, -0.5) * step(abs(abs(vLocal.x) - 2.0), 0.6) * step(abs(vLocal.z), 0.8);
          col = vec3(0.02, 0.022, 0.028) + sky * (0.3 + max(n.y, 0.0));
          col = mix(col, trim * 1.6, side);
          col = mix(col, vec3(0.85, 0.93, 1.0) * 2.4, nose);
          col = mix(col, vec3(1.0, 0.1, 0.06) * 2.2, tail);
          col = mix(col, vec3(0.3, 0.8, 1.0) * 2.0, jets);
          lit = max(max(side, nose), max(tail, jets));
        } else if (kind > 7.5) {
          // A board: one of the city's adverts both ways (before they
          // land, a lightbox with blocks of a darker colour), a dark frame,
          // its edges steel.
          float face = step(vSize.z * 0.5 - 0.01, abs(vLocal.z));
          vec2 q = vec2(vLocal.x / vSize.x + 0.5, vLocal.y / vSize.y + 0.5);
          float h = hash12(vec2(vOwn.x * 57.0, floor(uTime / (9.0 + 6.0 * vOwn.x) + vOwn.x * 9.0)));
          vec3 a = h < 0.25 ? vec3(1.0, 0.2, 0.3) : h < 0.5 ? vec3(0.16, 0.85, 1.0) : h < 0.7 ? vec3(1.0, 0.62, 0.2) : h < 0.85 ? vec3(1.0, 0.25, 0.7) : vec3(0.9, 0.95, 1.0);
          float blocks = step(0.5, hash12(floor(q * vec2(5.0, 3.0)) + h * 31.0));
          float edge = 1.0 - step(0.02, q.x) * step(q.x, 0.98) * step(0.04, q.y) * step(q.y, 0.96);
          vec3 drawn = boardFace(vec2(vLocal.z > 0.0 ? q.x : 1.0 - q.x, q.y), vSize.x / vSize.y, vOwn.y + floor(h * 3.0), vOwn.x * 57.0) * 1.4;
          col = mix(vec3(0.012, 0.013, 0.017), mix(mix(a * mix(1.3, 0.5, blocks), drawn, uHasAds), vec3(0.01), edge), face);
          lit = face * (1.0 - edge);
          // A sign on a roof has one face (its third number: 1 the box's
          // +z, 2 its -z); the other is its back, dark on its frame.
          if (vOwn.z > 0.5 && face > 0.5 && (vOwn.z < 1.5) != (vLocal.z > 0.0)) {
            col = signBack(vec2(vLocal.z > 0.0 ? q.x : 1.0 - q.x, q.y), vSize.x / vSize.y, a);
            lit = 0.2;
          }
        } else {
          // A parked car: a body in one of a few paints, its glass, and at
          // its ends its lamps, dark.
          float h = vOwn.x;
          vec3 paint = h < 0.3 ? vec3(0.02, 0.021, 0.025) : h < 0.5 ? vec3(0.07, 0.072, 0.078) : h < 0.65 ? vec3(0.085, 0.012, 0.016) : h < 0.8 ? vec3(0.012, 0.03, 0.07) : vec3(0.08, 0.06, 0.02);
          float up = max(n.y, 0.0);
          if (kind < 3.5) {
            float ends = step(vSize.x * 0.5 - 0.02, abs(vLocal.x)) * step(abs(abs(vLocal.z) - vSize.z * 0.32), 0.2) * step(abs(vLocal.y - 0.08), 0.1);
            col = paint * (vec3(0.5) + sky * 5.0 * (0.3 + up) + light * 9.0);
            col = mix(col, vLocal.x * vOwn.y > 0.0 ? vec3(0.3, 0.3, 0.26) : vec3(0.25, 0.012, 0.01), ends);
            // The sill line and the arches, so it is not a brick.
            col *= 1.0 - 0.5 * step(abs(n.y), 0.5) * step(vLocal.y, -vSize.y * 0.5 + 0.12);
          } else {
            float glass = step(abs(n.y), 0.5) * step(-vSize.y * 0.5 + 0.06, vLocal.y) * step(vLocal.y, vSize.y * 0.5 - 0.05);
            col = mix(paint * (vec3(0.5) + sky * 5.0 * (0.3 + up) + light * 9.0), vec3(0.006, 0.008, 0.012) + sky * 0.5 + light * 0.25, glass);
          }
        }
        col = sodiumBeyond(cityFog(col, vWorld, lit), vWorld);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "far_street";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "far_street";
  mesh.visible = false;
  scene.add(mesh);
  // Which boxes the lens can see, packed into the buffers the GPU reads;
  // repacked only when the set changes.
  const order = new Int32Array(n).fill(-1);
  let shown = -1;
  const sphere = new THREE.Sphere();
  // The lens as it last was: while a shot holds, nothing is tested again.
  const last = new Float32Array(24).fill(NaN);
  return {
    mesh,
    update(frustum, eye) {
      let moved = false;
      frustum.planes.forEach((plane, i) => {
        for (const [j, v] of [plane.normal.x, plane.normal.y, plane.normal.z, plane.constant].entries()) {
          if (last[i * 4 + j] !== v) moved = true;
          last[i * 4 + j] = v;
        }
      });
      if (!moved) return;
      let k = 0;
      let changed = false;
      for (let i = 0; i < n; i++) {
        const o = i * 12;
        sphere.center.set(boxes[o], boxes[o + 1], boxes[o + 2]);
        sphere.radius = 0.5 * Math.hypot(boxes[o + 4], boxes[o + 5], boxes[o + 6]);
        // An AV is somewhere along its lane: the lane is what is tested.
        if (boxes[o + 7] === BOX.av) {
          const reachAlong = boxes[o + 8] / 2;
          sphere.center.x += Math.cos(boxes[o + 3]) * reachAlong;
          sphere.center.z -= Math.sin(boxes[o + 3]) * reachAlong;
          sphere.radius += reachAlong;
        }
        const reach = REACH[boxes[o + 7]] + sphere.radius;
        if (sphere.center.distanceToSquared(eye) > reach * reach) continue;
        if (!frustum.intersectsSphere(sphere)) continue;
        if (order[k] !== i) {
          order[k] = i;
          changed = true;
        }
        k++;
      }
      if (!changed && k === shown) return;
      shown = k;
      attrs.forEach((attr, a) => {
        for (let j = 0; j < k; j++) for (let c = 0; c < 4; c++) attr.array[j * 4 + c] = boxes[order[j] * 12 + a * 4 + c];
        attr.clearUpdateRanges();
        attr.addUpdateRange(0, k * 4);
        attr.needsUpdate = true;
      });
      geometry.instanceCount = k;
      mesh.visible = k > 0;
    },
    dispose() {
      scene.remove(mesh);
      unit.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
