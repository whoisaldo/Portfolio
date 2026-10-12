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
// floors in a truss, the boards that stand on it).
import * as THREE from "three";
import { COMMON } from "./glsl.js";

export const BOX = { slab: 0, post: 1, head: 2, car: 3, cabin: 4, steel: 5, block: 6, deck: 7, board: 8 };

// How far each kind is drawn: past it, it is under a pixel (a slab, a deck
// and its boards are always drawn).
const REACH = [Infinity, 320, 320, 320, 320, 900, 1500, Infinity, Infinity];

/** `boxes` is the flat list; `street` the dome's GLSL for the lamps' pools
 *  (streetLamps), so a slab is lit by the same lamps as the road beside it. */
export function createFarStreet(scene, shared, boxes, { street }) {
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
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec4 aAt;
      attribute vec4 aSize;
      attribute vec4 aOwn;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
      varying vec4 vSize;
      varying vec4 vOwn;
      void main() {
        vec3 l = position * aSize.xyz;
        float cs = cos(aAt.w);
        float sn = sin(aAt.w);
        vec3 w = vec3(aAt.x + cs * l.x + sn * l.z, aAt.y + l.y, aAt.z - sn * l.x + cs * l.z);
        vWorld = w;
        vNormalW = vec3(cs * normal.x + sn * normal.z, normal.y, -sn * normal.x + cs * normal.z);
        vLocal = l;
        vSize = aSize;
        vOwn = aOwn;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
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
          lit = head * step(n.y, -0.5);
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
        } else if (kind > 7.5) {
          // A board: a lightbox both ways, its picture blocks of a darker
          // colour, a dark frame, its edges steel.
          float face = step(vSize.z * 0.5 - 0.01, abs(vLocal.z));
          vec2 q = vec2(vLocal.x / vSize.x + 0.5, vLocal.y / vSize.y + 0.5);
          float h = hash12(vec2(vOwn.x * 57.0, floor(uTime / (9.0 + 6.0 * vOwn.x) + vOwn.x * 9.0)));
          vec3 a = h < 0.25 ? vec3(1.0, 0.2, 0.3) : h < 0.5 ? vec3(0.16, 0.85, 1.0) : h < 0.7 ? vec3(1.0, 0.62, 0.2) : h < 0.85 ? vec3(1.0, 0.25, 0.7) : vec3(0.9, 0.95, 1.0);
          float blocks = step(0.5, hash12(floor(q * vec2(5.0, 3.0)) + h * 31.0));
          float edge = 1.0 - step(0.02, q.x) * step(q.x, 0.98) * step(0.04, q.y) * step(q.y, 0.96);
          col = mix(vec3(0.012, 0.013, 0.017), mix(a * mix(1.3, 0.5, blocks), vec3(0.01), edge), face);
          lit = face * (1.0 - edge);
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
        col = cityFog(col, vWorld, lit);
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
  return {
    mesh,
    update(frustum, eye) {
      let k = 0;
      let changed = false;
      for (let i = 0; i < n; i++) {
        const o = i * 12;
        sphere.center.set(boxes[o], boxes[o + 1], boxes[o + 2]);
        const reach = REACH[boxes[o + 7]];
        if (sphere.center.distanceToSquared(eye) > reach * reach) continue;
        sphere.radius = 0.5 * Math.hypot(boxes[o + 4], boxes[o + 5], boxes[o + 6]);
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
