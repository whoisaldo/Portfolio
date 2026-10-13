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
// floors in a truss, the boards that stand on it). (Kind 9 was the far
// city's own AVs: the kit's flying cars fly out here now, traffic-sky.js.)
//
// And who is out on those first pavements: somebody standing or waiting, a
// box cut to a head, a jacket and two legs, half of them under an umbrella
// (an eight-sided canopy, a few with a line of light round the rim), and
// here and there a vending machine lit from inside, against the wall. And
// what makes those pavements a shop street: awnings over some shops, their
// undersides lit by the shop, lightbox signs at head height standing out
// from the piers and boards stood on the pavement (each a word), and along
// the kerb bins, crates, cabinets and striped barriers.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { ADVERT } from "./sky-columns.js";

// (And on the landmark towers and the far faces: a tube of neon, a
// landmark's name, and a strut leaning out of a wall at an angle.)
// (And a far tower's crown: its steps, a block cantilevered out of a face,
// drawn as a penthouse is but as far as the far city is.)
export const BOX = { slab: 0, post: 1, head: 2, car: 3, cabin: 4, steel: 5, block: 6, deck: 7, board: 8, av: 9, lattice: 10, person: 11, umbrella: 12, vending: 13, screen: 14, pad: 15, awning: 16, sign: 17, clutter: 18, tube: 19, logo: 20, strut: 21, crown: 22 };

// How far each kind is drawn: past it, it is under a pixel (a slab, a deck
// and its boards are always drawn).
const REACH = [Infinity, 320, 320, 320, 320, 900, 1500, Infinity, Infinity, 1500, 2400, 220, 220, 320, Infinity, Infinity, 420, 420, 220, Infinity, Infinity, 1800, Infinity];

/** `boxes` is the flat list; `street` the dome's GLSL for the lamps' pools
 *  (streetLamps), so a slab is lit by the same lamps as the road beside it;
 *  `ads` the advert atlas's uniforms, for the boards. */
export function createFarStreet(scene, shared, boxes, { street, ads }) {
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
    uniforms: { ...shared, ...ads },
    vertexShader: /* glsl */ `
      attribute vec4 aAt;
      attribute vec4 aSize;
      attribute vec4 aOwn;
      uniform vec3 uCam;
      uniform float uFarFree;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
      varying vec4 vSize;
      varying vec4 vOwn;
      void main() {
        vec3 l = position * aSize.xyz;
        float cs = cos(aAt.w);
        float sn = sin(aAt.w);
        // (A box whose fourth own number is 1 stands only for an eye above
        // the roofs: the stack of a column one of the page's roofs frames,
        // which from there is the hologram it was, sky-columns.js.)
        // (And one whose fourth number is 2 stands for a free eye only, the
        // west and south skyways: from the page's own lenses their frames
        // hold.)
        if (aOwn.w > 1.5) l *= uFarFree;
        else if (aOwn.w > 0.5) l *= smoothstep(40.0, 62.0, uCam.y);
        vec3 nl = normal;
        // (A strut leans: its third own number tips its length from the
        // vertical toward its own +z, before it is turned.)
        if (aSize.w > 20.5 && aSize.w < 21.5) {
          float cp = cos(aOwn.z);
          float sp = sin(aOwn.z);
          l = vec3(l.x, l.y * cp - l.z * sp, l.y * sp + l.z * cp);
          nl = vec3(nl.x, nl.y * cp - nl.z * sp, nl.y * sp + nl.z * cp);
        }
        vec3 w = vec3(aAt.x + cs * l.x + sn * l.z, aAt.y + l.y, aAt.z - sn * l.x + cs * l.z);
        vWorld = w;
        vNormalW = vec3(cs * nl.x + sn * nl.z, nl.y, -sn * nl.x + cs * nl.z);
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
      uniform sampler2D uLogos;
      uniform float uHasLogos;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
      varying vec4 vSize;
      varying vec4 vOwn;
      void main() {
        vec3 n = normalize(vNormalW);
        // (A crown is a penthouse's wall at a far tower's scale.)
        float kind = vSize.w > 21.5 ? 6.0 : vSize.w;
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
          // A far tower's crown has floors, lit in strips as its tower's
          // are: runs of a few bays in its own light.
          if (vSize.w > 21.5 && abs(n.y) < 0.5) {
            bool onX = abs(vLocal.x) > vSize.x * 0.5 - 0.01;
            vec2 cl = vec2((onX ? vLocal.z : vLocal.x) / 4.5, (vLocal.y + vSize.y * 0.5) / 4.8);
            vec2 fc = fract(cl);
            float run = floor((cl.x + hash12(vec2(floor(cl.y), vOwn.x * 31.0)) * 6.0) / 6.0);
            float on = step(hash12(vec2(run, floor(cl.y)) + vOwn.x * 17.0), 0.55) * step(0.25, fc.y) * step(fc.y, 0.75) * step(0.05, fc.x) * step(fc.x, 0.95);
            on = mix(on, 0.3, smoothstep(0.3, 0.9, fwidth(cl.y)));
            col = mix(col, (vOwn.x < 0.5 ? vec3(1.0, 0.72, 0.36) : vec3(0.5, 0.88, 1.0)) * 0.9, on);
            lit = max(lit, on);
          }
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
          // Its belly lit, as the show's skybridges are from under: a line
          // of light down each edge and a lamp in every bay between.
          if (n.y < -0.5) {
            vec2 e = vSize.xz * 0.5 - abs(vLocal.xz);
            float line = step(min(e.x, e.y), 0.7);
            vec2 bay = abs(fract(vLocal.xz / 6.0) - 0.5) * 6.0;
            float lamp = exp(-dot(bay, bay) / 0.9);
            vec3 under = mix(vec3(0.3, 0.85, 1.0), vec3(1.0, 0.72, 0.42), step(0.55, fract(vOwn.x * 7.3)));
            col = steel * 0.6 + under * (1.4 * line + 0.9 * lamp) + under * 0.05;
            lit = max(line, step(0.5, lamp));
          }
        } else if (kind > 20.5) {
          // A strut out of a wall: dark steel, its top catching the glow, a
          // line of light down its length.
          col = vec3(0.013, 0.014, 0.019) + (uHazeColor * 0.35 + uGlowColor * 0.2) * (0.25 + 0.75 * max(n.y, 0.0)) * uHaze * 0.6;
          float run = step(abs(vLocal.x), vSize.x * 0.12) * step(0.0, vLocal.z) * step(vSize.z * 0.5 - 0.01, vLocal.z);
          col = mix(col, vec3(0.3, 0.8, 1.0) * 0.8, run);
          lit = run;
        } else if (kind > 19.5) {
          // A landmark's name: its emblem and then its letters, across the
          // board or down it (third own number 1), lit in the tower's colour
          // on a dark sheet, white at the core of each stroke, a line of
          // light round the edge. Far off, the sign's light, not a shimmer.
          float face = step(vSize.z * 0.5 - 0.01, abs(vLocal.z));
          vec2 q = vec2(vLocal.x / vSize.x + 0.5, vLocal.y / vSize.y + 0.5);
          if (vLocal.z < 0.0) q.x = 1.0 - q.x;
          float id = vOwn.x;
          float cells = vOwn.y + 1.0;
          vec3 tone = id < 0.5 ? vec3(0.25, 0.95, 1.0) : id < 1.5 ? vec3(1.0, 0.25, 0.62) : id < 2.5 ? vec3(0.74, 0.4, 1.0) : id < 3.5 ? vec3(0.35, 0.62, 1.0) : vec3(1.0, 0.7, 0.22);
          bool down = vOwn.z > 0.5;
          float g = down ? (1.0 - q.y) * cells : q.x * cells;
          float cell = floor(g);
          vec2 f = down ? vec2(q.x, fract(g)) : vec2(fract(g), 1.0 - q.y);
          float cw = down ? vSize.x : vSize.x / cells;
          float ch = down ? vSize.y / cells : vSize.y;
          vec2 fs = f;
          if (cw > ch) fs.x = 0.5 + (f.x - 0.5) * cw / ch;
          else fs.y = 0.5 + (f.y - 0.5) * ch / cw;
          fs = (fs - 0.5) / 0.86 + 0.5;
          float inside = step(0.0, fs.x) * step(fs.x, 1.0) * step(0.0, fs.y) * step(fs.y, 1.0);
          float k = texture2D(uLogos, vec2((cell + clamp(fs.x, 0.0, 1.0)) / 8.0, (id + clamp(fs.y, 0.0, 1.0)) / 8.0)).r * inside * uHasLogos;
          vec2 e = min(q, 1.0 - q) * vSize.xy;
          float rim = step(min(e.x, e.y), 0.6);
          vec3 art = mix(vec3(0.006, 0.008, 0.014) + tone * 0.04, mix(tone * 2.0, vec3(1.0), 0.35 * k), k) + tone * 1.3 * rim;
          art = mix(art, tone * 0.75, smoothstep(0.35, 0.9, fwidth(g)));
          col = mix(vec3(0.012, 0.013, 0.017), art, face);
          lit = face * max(k, rim);
        } else if (kind > 18.5) {
          // A tube of neon: its colour, white at the core.
          float hue = vOwn.x;
          vec3 tone = hue < 0.5 ? vec3(0.2, 0.9, 1.0) : hue < 1.5 ? vec3(1.0, 0.2, 0.7) : hue < 2.5 ? vec3(1.0, 0.85, 0.25) : hue < 3.5 ? vec3(0.7, 0.35, 1.0) : hue < 4.5 ? vec3(0.3, 1.0, 0.75) : vec3(1.0, 0.18, 0.12);
          col = mix(tone, vec3(1.0), 0.25) * vOwn.y;
          lit = 1.0;
        } else if (kind > 17.5) {
          // What stands along a kerb: a bin, a stack of crates, a cabinet,
          // a barrier (its second number: striped). Plastic and painted
          // steel in a few colours, a seam at every crate, lit by the street.
          float h = vOwn.x;
          // (A cabinet is dark painted steel under fly-posters, not a pale
          // grey box.)
          vec3 paint = h < 0.2 ? vec3(0.03, 0.1, 0.05) : h < 0.38 ? vec3(0.32, 0.2, 0.02) : h < 0.54 ? vec3(0.03, 0.08, 0.24) : h < 0.7 ? vec3(0.3, 0.07, 0.02) : h < 0.85 ? vec3(0.06, 0.062, 0.07) : vec3(0.035, 0.05, 0.045);
          float v = vLocal.y / vSize.y + 0.5;
          float seam = step(abs(fract(v * max(1.0, floor(vSize.y / 0.4))) - 0.5), 0.08) * close;
          // (A cabinet's doors and a sticker on one: a pale box was a
          // placeholder.)
          float side = step(abs(n.y), 0.5);
          seam = max(seam, side * close * step(abs(fract((vLocal.x + vLocal.z) / max(vSize.x * 0.5, 0.3)) - 0.5), 0.04));
          float sticker = side * step(0.85, h) * step(abs(vLocal.y - vSize.y * 0.15), 0.12) * step(abs(vLocal.x + vLocal.z), 0.14);
          float stripe = step(0.5, fract((vLocal.x + vLocal.y) * 2.4));
          vec3 c = mix(paint * (1.0 - 0.4 * seam), mix(vec3(0.5, 0.2, 0.02), vec3(0.4), stripe), step(0.5, vOwn.y));
          c = mix(c, mix(vec3(0.3, 0.06, 0.12), vec3(0.04, 0.2, 0.3), step(0.93, h)), sticker);
          // Bills pasted over a cabinet's sides, each its own colour, torn
          // at an edge.
          vec2 bq = vec2(vLocal.x + vLocal.z, vLocal.y) / vec2(0.32, 0.42);
          float bh = hash12(floor(bq) + h * 37.0);
          float bill = side * step(0.85, h) * step(0.45, bh) * step(0.08, fract(bq.x)) * step(fract(bq.x), 0.92) * step(0.06, fract(bq.y)) * step(fract(bq.y), 0.9) * step(vLocal.y, vSize.y * 0.3) * close;
          vec3 paper = bh < 0.6 ? vec3(0.5, 0.42, 0.3) : bh < 0.72 ? vec3(0.45, 0.06, 0.08) : bh < 0.85 ? vec3(0.06, 0.2, 0.4) : vec3(0.45, 0.35, 0.04);
          c = mix(c, paper * (0.6 + 0.4 * step(0.5, fract(bq.y * 4.0 + bh * 7.0))), bill);
          col = c * (vec3(0.45) + sky * 5.0 * (0.3 + max(n.y, 0.0)) + light * 9.0);
          // A cabinet's lamp: a green or amber point by its top.
          float led = side * step(0.85, h) * close * exp(-dot(vec2(vLocal.x + vLocal.z, vLocal.y - vSize.y * 0.38), vec2(vLocal.x + vLocal.z, vLocal.y - vSize.y * 0.38)) / 0.003);
          col += mix(vec3(0.2, 1.0, 0.35), vec3(1.0, 0.6, 0.15), step(0.93, h)) * led * 1.5;
          lit = led;
        } else if (kind > 16.5) {
          // A sign at head height: a lightbox standing out from a wall, or
          // a board stood on the pavement, a word on both its faces (one in
          // two a lit box with dark characters, the other the characters
          // lit on a dark box).
          float face = step(vSize.z * 0.5 - 0.01, abs(vLocal.z));
          vec2 q = vec2(vLocal.x / vSize.x + 0.5, vLocal.y / vSize.y + 0.5);
          if (vLocal.z < 0.0) q.x = 1.0 - q.x;
          float hc = vOwn.y;
          vec3 a = hc < 0.22 ? vec3(0.1, 0.85, 1.0) : hc < 0.42 ? vec3(1.0, 0.62, 0.16) : hc < 0.58 ? vec3(1.0, 0.16, 0.5) : hc < 0.72 ? vec3(1.0, 0.2, 0.14) : hc < 0.84 ? vec3(0.3, 1.0, 0.6) : vec3(1.0, 0.92, 0.3);
          float aspect = vSize.x / vSize.y;
          float k = (aspect >= 1.0 ? wordAcross(vec2(q.x, (q.y - 0.5) / 0.86 + 0.5), aspect, vOwn.x) : wordDown(vec2((q.x - 0.08) / 0.84, 1.0 - q.y), 1.0 / aspect, vOwn.x)) * uHasWords;
          float edge = 1.0 - step(0.05, q.x) * step(q.x, 0.95) * step(0.02, q.y) * step(q.y, 0.98);
          vec3 art = fract(vOwn.x * 7.0) < 0.5 ? mix(a * 0.75, vec3(0.02, 0.02, 0.03), k) : mix(a * 0.1, a * 1.4, k);
          // (Far off it is its light, not its letters.)
          art = mix(art, a * 0.5, smoothstep(0.12, 0.4, fwidth(q.x)));
          col = mix(vec3(0.012, 0.013, 0.017), mix(art, vec3(0.01), edge), face);
          lit = face * (1.0 - edge);
        } else if (kind > 15.5) {
          // An awning over a shop: cloth in its colour, on most of them
          // striped with a pale one, and its underside lit by the shop it
          // shades.
          float h = vOwn.x;
          vec3 cloth = h < 0.22 ? vec3(0.5, 0.05, 0.05) : h < 0.42 ? vec3(0.03, 0.3, 0.32) : h < 0.6 ? vec3(0.55, 0.36, 0.05) : h < 0.74 ? vec3(0.06, 0.3, 0.1) : h < 0.88 ? vec3(0.07, 0.12, 0.4) : vec3(0.5, 0.2, 0.04);
          vec3 c = mix(cloth, vec3(0.42, 0.4, 0.36), step(0.5, fract(vLocal.x / 0.9 + 0.25)) * step(0.5, vOwn.y) * (1.0 - smoothstep(0.2, 0.5, px)));
          vec3 shop = vec3(1.0, 0.74, 0.46);
          if (n.y < -0.5) {
            col = c * (0.3 + shop * 1.5);
            lit = 0.5;
          } else {
            col = c * (vec3(0.35) + sky * 5.0 * (0.3 + max(n.y, 0.0)) + light * 9.0 + shop * 0.22 * step(abs(n.y), 0.5));
          }
        } else if (kind > 14.5) {
          // A landing pad standing out round a tower, or on its roof: a
          // dark deck, a painted ring and a cross in it, a ring of lamps, a
          // line of light round its edge, and under it its beams and a
          // service lamp at each quarter.
          vec3 lampCol = vOwn.x < 0.6 ? vec3(0.2, 0.9, 1.0) : vec3(1.0, 0.66, 0.26);
          float R = vSize.x * 0.5;
          float d = length(vLocal.xz);
          float a = atan(vLocal.z, vLocal.x);
          if (n.y > 0.5) {
            col = vec3(0.05, 0.052, 0.06) * (vec3(0.5) + sky * 6.0);
            col = mix(col, vec3(0.34, 0.26, 0.03) * (vec3(0.5) + sky * 6.0), step(abs(d - R * 0.5), 0.3));
            float ring = (1.0 - smoothstep(0.25, 0.25 + px, abs(d - R * 0.86))) * mix(step(0.4, fract(a * 20.0 / 6.2832)), 0.6, smoothstep(0.3, 1.2, px));
            col = mix(col, lampCol * 1.6, ring);
            col += lampCol * 0.12 * exp(-abs(d - R * 0.86) / 2.5);
            lit = ring;
          } else if (n.y < -0.5) {
            float beams = step(abs(fract(vLocal.x / 6.0) - 0.5), 0.06) + step(abs(fract(vLocal.z / 6.0) - 0.5), 0.06);
            col = vec3(0.012, 0.013, 0.017) * (1.0 + 1.5 * min(beams, 1.0)) + sky * 0.2;
            float lamp = exp(-dot(abs(vLocal.xz) - vec2(R * 0.6), abs(vLocal.xz) - vec2(R * 0.6)) / 1.5);
            col += vec3(1.0, 0.7, 0.4) * 1.2 * lamp;
            lit = step(0.5, lamp);
          } else {
            float line = step(abs(vLocal.y), vSize.y * 0.22);
            col = mix(vec3(0.014, 0.015, 0.02), lampCol * 1.5, line);
            lit = line;
          }
        } else if (kind > 13.5) {
          // A stack of screens: a column of the city's adverts, or a tall
          // screen on a tower's face. Every face wide enough to carry one
          // is rows of them (a wide one, or two tall ones side by side, no
          // advert twice down a stack; on a screen most rows are a plain
          // field of the stack's own cyan with lines of type), a dark line
          // between rows, and down both edges a line of light, white at its
          // core. Opaque: nothing shows through it.
          vec3 tone = vOwn.y < 0.5 ? vec3(0.25, 0.9, 1.0) : vOwn.y < 1.5 ? vec3(0.3, 1.0, 0.82) : vOwn.y < 2.5 ? vec3(0.3, 0.7, 1.0) : vec3(1.0, 0.48, 0.85);
          bool onX = abs(vLocal.x) > vSize.x * 0.5 - 0.01;
          float faceW = onX ? vSize.z : vSize.x;
          float u = onX ? 0.5 - sign(vLocal.x) * vLocal.z / vSize.z : 0.5 + sign(vLocal.z) * vLocal.x / vSize.x;
          lit = 1.0;
          if (abs(n.y) > 0.5 || faceW < 3.0) {
            col = tone * 1.2;
          } else {
            float faceId = onX ? (vLocal.x > 0.0 ? 0.0 : 2.0) : (vLocal.z > 0.0 ? 1.0 : 3.0);
            float rowH = faceW * 0.7;
            float gy = (vLocal.y + vSize.y * 0.5) / rowH;
            float row = floor(gy);
            float seed = vOwn.x * 91.0 + faceId * 7.0;
            float hr = hash12(vec2(row, seed));
            float pair = step(0.5, hr);
            float gx = pair > 0.5 ? u * 2.0 : u;
            vec2 f = vec2(fract(gx), fract(gy));
            float cellId = row * 2.0 + floor(gx) * pair;
            float slot = floor(uTime / (11.0 + 9.0 * hr) + hr * 7.0);
            float pick = mod(floor(vOwn.x * 24.0) + faceId * 3.0 + cellId * 7.0 + slot * 5.0, 24.0);
            vec2 m = pair > 0.5 ? vec2(0.05, 0.035) : vec2(0.025, 0.035);
            float inset = step(m.x, f.x) * step(f.x, 1.0 - m.x) * step(m.y, f.y) * step(f.y, 1.0 - m.y);
            vec2 st = (f - m) / (1.0 - 2.0 * m);
            vec3 drawn = advert(st, (pair > 0.5 ? 0.5 : 1.0) / 0.7, pick) * 1.5;
            // A plain screen: the stack's own colour, a darker foot, lines of type.
            float type = step(0.45, fract(st.y * 8.0)) * step(st.y, 0.42) * step(0.1, st.x) * step(st.x, 0.3 + 0.6 * hash12(vec2(floor(st.y * 8.0), seed + row)));
            vec3 plain = mix(tone * 1.15, mix(tone * 0.5, vec3(0.9, 0.97, 1.0), 0.25), step(0.5, st.y)) * (1.0 - 0.55 * type);
            float plainRow = step(hash12(vec2(row * 1.7, seed + 3.0)), mix(0.14, 0.72, step(0.5, vOwn.z)));
            vec3 art = mix(mix(tone * (0.5 + 0.5 * st.y), drawn, uHasAds), plain, plainRow);
            // Far off a row is its mean, not a shimmer.
            art = mix(art, mix(tone * 0.9, vec3(0.6, 0.62, 0.7), 0.35 * (1.0 - plainRow)), smoothstep(0.25, 0.6, fwidth(gy)));
            float edge = smoothstep(0.86, 0.95, abs(u - 0.5) * 2.0);
            col = mix(art * inset + vec3(0.006, 0.008, 0.012), mix(tone, vec3(0.9, 0.97, 1.0), 0.55) * 1.9, edge);
          }
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
          vec3 jacket = vOwn.x < 0.3 ? vec3(0.045, 0.047, 0.056) : vOwn.x < 0.46 ? vec3(0.16, 0.165, 0.18) : vOwn.x < 0.6 ? vec3(0.24, 0.035, 0.05) : vOwn.x < 0.74 ? vec3(0.03, 0.08, 0.22) : vOwn.x < 0.86 ? vec3(0.26, 0.18, 0.03) : vec3(0.03, 0.17, 0.15);
          vec3 body = v > 0.87 ? vec3(0.12, 0.085, 0.065) : v > 0.47 ? jacket : vec3(0.03, 0.032, 0.04);
          // (Lit by the shops they walk past as much as by the lamps: at
          // half that, nobody on the far pavements could be made out. And
          // the street's light round their edges, so a figure stands off
          // the dark pavement behind it.)
          col = body * (vec3(1.4, 1.3, 1.2) + sky * 5.0 * (0.3 + max(n.y, 0.0)) + light * 11.0);
          float edge = step(vSize.x * 0.5 - 0.035, abs(vLocal.x)) + step(vSize.z * 0.5 - 0.035, abs(vLocal.z));
          col += (sky * 1.6 + light * 2.5 + vec3(0.02, 0.03, 0.05)) * min(edge, 1.0) * step(0.47, v);
          // One in four looks at a phone: its glow at the hands and face.
          float phone = step(0.75, fract(vOwn.x * 9.7)) * exp(-pow((v - 0.7) / 0.05, 2.0)) * step(abs(vLocal.x), 0.08);
          col += vec3(0.5, 0.75, 1.0) * phone * 1.2;
          lit = phone;
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
          // (Its second number from 100 up: that advert and no other, so
          // boards stood together can each be given their own.)
          vec3 drawn = (vOwn.y > 99.5 ? advert(vec2(vLocal.z > 0.0 ? q.x : 1.0 - q.x, q.y), vSize.x / vSize.y, vOwn.y - 100.0) : boardFace(vec2(vLocal.z > 0.0 ? q.x : 1.0 - q.x, q.y), vSize.x / vSize.y, vOwn.y + floor(h * 3.0), vOwn.x * 57.0)) * 1.4;
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
            // Its wheels in their arches down each side, a chrome line at
            // the waist, the edges of its bonnet catching the light.
            float flank = step(vSize.z * 0.5 - 0.02, abs(vLocal.z));
            float ax = abs(abs(vLocal.x) - vSize.x * 0.3);
            float wheel = flank * step(length(vec2(ax, vLocal.y + vSize.y * 0.5)), 0.36) * close;
            float waist = flank * step(abs(vLocal.y - vSize.y * 0.3), 0.025) * close;
            float rim = step(vSize.y * 0.5 - 0.04, vLocal.y) * step(min(vSize.x * 0.5 - abs(vLocal.x), vSize.z * 0.5 - abs(vLocal.z)), 0.06);
            col = mix(col, vec3(0.004, 0.004, 0.005), wheel);
            col += (sky * 1.2 + light * 1.8 + vec3(0.02)) * (waist + rim) * (1.0 - wheel);
            // Wet steel gives the sky and the lamps back off its bonnet and
            // boot, and one car in three stands with its sidelights on, so
            // a kerb of them reads as cars and not as dark bricks.
            col += (sky * 0.9 + light * 0.4) * up;
            float on = step(0.66, fract(h * 13.7));
            col = mix(col, vLocal.x * vOwn.y > 0.0 ? mix(vec3(0.3, 0.3, 0.26), vec3(1.0, 0.94, 0.8) * 1.5, on) : mix(vec3(0.25, 0.012, 0.01), vec3(1.0, 0.07, 0.04) * 1.7, on), ends);
            lit = ends * on;
            // The sill line and the arches, so it is not a brick.
            col *= 1.0 - 0.5 * step(abs(n.y), 0.5) * step(vLocal.y, -vSize.y * 0.5 + 0.12);
          } else {
            float glass = step(abs(n.y), 0.5) * step(-vSize.y * 0.5 + 0.06, vLocal.y) * step(vLocal.y, vSize.y * 0.5 - 0.05);
            // (Its pillars between the windows.)
            glass *= 1.0 - step(abs(fract(vLocal.x / max(vSize.x * 0.5, 0.4) + 0.5) - 0.5), 0.07) * step(vSize.z * 0.5 - 0.02, abs(vLocal.z));
            col = mix(paint * (vec3(0.5) + sky * 5.0 * (0.3 + up) + light * 9.0) + (sky * 0.9 + light * 0.4) * up, vec3(0.006, 0.008, 0.012) + sky * 0.5 + light * 0.25, glass);
          }
        }
        vec3 fogged = airFog(col, vWorld, lit);
        // (A stack of screens is the brightest thing in the sky: it keeps
        // most of its light through a kilometre of haze.)
        if (kind > 13.5 && kind < 14.5) fogged = mix(col, fogged, 0.4);
        col = sodiumBeyond(fogged, vWorld);
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
  // Each box's bounding sphere and how far it is drawn, worked out once:
  // middle x, y, z, radius, and the square of its reach (the kind's reach
  // and the radius). Doubles, so a box is kept or dropped exactly as the
  // same sums made each frame kept or dropped it.
  const cull = new Float64Array(n * 5);
  for (let i = 0; i < n; i++) {
    const o = i * 12;
    const radius = 0.5 * Math.hypot(boxes[o + 4], boxes[o + 5], boxes[o + 6]);
    const reach = REACH[boxes[o + 7]] + radius;
    cull.set([boxes[o], boxes[o + 1], boxes[o + 2], radius, reach * reach], i * 5);
  }
  // The lens as it last was: while a shot holds, nothing is tested again.
  // (Doubles: a Float32Array rounds what it holds, so a plane never
  // compared equal to itself and every box was tested every frame.)
  const last = new Float64Array(24).fill(NaN);
  return {
    mesh,
    update(frustum, eye) {
      let moved = false;
      for (let i = 0; i < 6; i++) {
        const { normal, constant } = frustum.planes[i];
        const o = i * 4;
        if (last[o] !== normal.x || last[o + 1] !== normal.y || last[o + 2] !== normal.z || last[o + 3] !== constant) moved = true;
        last[o] = normal.x;
        last[o + 1] = normal.y;
        last[o + 2] = normal.z;
        last[o + 3] = constant;
      }
      if (!moved) return;
      const ex = eye.x;
      const ey = eye.y;
      const ez = eye.z;
      let k = 0;
      let changed = false;
      // (Frustum.intersectsSphere written out: outside if behind any plane
      // by more than the radius.)
      boxes: for (let i = 0; i < n; i++) {
        const c = i * 5;
        const x = cull[c];
        const y = cull[c + 1];
        const z = cull[c + 2];
        const dx = x - ex;
        const dy = y - ey;
        const dz = z - ez;
        if (dx * dx + dy * dy + dz * dz > cull[c + 4]) continue;
        const r = -cull[c + 3];
        for (let p = 0; p < 24; p += 4) if (last[p] * x + last[p + 1] * y + last[p + 2] * z + last[p + 3] < r) continue boxes;
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
