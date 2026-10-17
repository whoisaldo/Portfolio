// src/world/prop-surfaces.js: the materials only the street's props wear.
//
// The kit's materials are walls, metal and light. A palm is none of those:
// its crown is a dozen fronds, each a rib with a comb of leaflets, and a
// frond modelled leaflet by leaflet is thousands of triangles a tree. So a
// frond here is a bent strip of eight quads and the leaflets are cut out of
// it in the fragment shader; a blossom tree's pads break into clusters at
// their rims the same way; bark is ringed. All of it is lit as the street
// is (the spill map), by the lamps in its planter from below, and by the
// sky's haze from above, and thin leaves let the street's light through.
//
// And a vending machine is a cabinet with a front: a lit window of cans in
// rows, a header with its mark, a screen, a keypad, a coin slot, a tray. As
// boxes and quads that is a few hundred triangles a machine, five hundred
// machines over; here the front is one quad (`face`) and all of it is drawn
// in the fragment shader, the shelves set back behind the glass by the
// eye's angle, and each machine its own from where it stands: its colour,
// its mark, what is on its shelves. Far off it is its own average. There
// are four machines under the one name, dealt so that no two neighbours are
// the same (src/world/prop-deal.js): that one, a wall of drinks lit white
// with a button under every bottle, a bank of six capsule machines, and a
// dark one with a small screen, a lit slot and a line of light down its edge.
//
// The builder (scripts/blender/ncw/props.py) names the material `plant`;
// the vertex colour is the part's own colour and its alpha what it is: 1 a
// frond (u across it, v from the crown to its tip), 0.75 a blossom pad (uv
// from its middle out to its rim), 0.5 a palm's bark, 0.25 a tree's, 0.125
// a tree's on a round limb (its uv is the limb's own normal, x and z halved
// about 0.5: its light and its bark run smooth across its facets). A
// `face` is a quad, uv 0 to 1 across and up it; its vertex colour is the
// light it gives the street (the bake's) and says warm or cool, the alpha
// which face, in tenths: 10 a vending machine's front (0.96 by 1.95 m), 9
// an advert of any shape, 5 a food box's menu (0.66 by 0.6), 3 a grate lit
// from under, 2 a phone's panel (0.5 by 0.9), 1 a crossing's signal (0.28
// by 0.4). A `print` is the same, unlit: 8 an advert on a board, 7 a
// lamp's banner (0.6 by 1.6), 6 a mesh fence panel, 4 a guard rail; and, in
// twentieths, 9.5 a box's side or top (a carton with its tape, its print, a
// label and straps, a wooden crate, a plastic one, stacked pallets, a sheet
// of paper: the red of its colour is a seed of its own, the green 1 on a top
// and 0.5 on a side, the blue what it is) and 8.5 a bin bag or a heap
// (turned: u once round it, v up it). A `halo` is a
// lamp's light in the wet air (src/world/shafts.js): a quad in the lamp's
// own plane through its head, turned here about the lamp's axis to face
// the eye; its uv is metres across and metres below the head, its colour
// the lamp's and the alpha a tenth of how many metres the light falls.
//
// A `paper` is a lantern: paper lit from inside, evenly, dimmer toward its
// hoops and where it turns away from the eye, never past white. Which colour
// it is, or that it is dark, is its deal (src/world/prop-deal.js), so a row
// of them is red, the next orange, one in ten out. The alpha of its vertex
// colour says what a part is: 1 the paper (red 1: turned about its axis, u
// once round it, so its light is smooth across its facets; red 0: a flat
// pane, drawn with a lattice; v runs up it), 0.75 a bulb, 0.5 a dark fitting
// of its own colour (a hoop, a frame, a cord, a tassel).
//
// A `worn` part is steel or plastic years out in the rain (a skip, a drum,
// a barrel, a roof's plant): its kind in its vertex colour's alpha, in
// tenths (props.py: 10 a skip's paint, 9 a drum's, 8 a plastic barrel's,
// 7 bare rust, 6 rubber, 5 a lid's plastic, 4 a stencil or a label, 3
// galvanised steel, 2 the same turned), its red how light it is and its
// green how worn. Its paint, its wear, its stencil and its dents are its
// own, from where it stands; it rusts from the foot up and is streaked down
// from its rims, and it is wet.
import * as THREE from "three";
import { COMMON, LAMPS } from "./glsl.js";
import { DARK } from "./prop-deal.js";
import { LAMP_AIR } from "./shafts.js";

const SHARED = [...COMMON.matchAll(/uniform \w+ (\w+)/g)].map((m) => m[1]);
// A lantern's colours, linear: red, orange, white, green.
const PAPER_HUES = [[1.0, 0.11, 0.04], [1.0, 0.31, 0.04], [1.0, 0.76, 0.5], [0.16, 0.92, 0.36]].map((c) => c.map((v) => v.toFixed(2)));
const ONE = { key: 0, color: null, gain: 1 };
// A vending machine's front by its design: the wall of drinks is the
// brightest, the dark one gives the street little.
const FRONTS = [ONE, { key: 1, color: null, gain: 1.3 }, { key: 2, color: null, gain: 0.6 }, { key: 3, color: null, gain: 0.3 }];
const PAPER_LIGHTS = PAPER_HUES.map((c, key) => ({ key, color: new THREE.Color(...c.map(Number)), gain: 1 }));

/**
 * `dressed`: the uniforms of any material the kit made (they hold the
 * shared ones by reference). Returns forName(name): the props' own material
 * of that name, or null.
 */
export function createPropSurfaces(dressed) {
  const shared = Object.fromEntries(SHARED.map((k) => [k, dressed[k]]));
  const made = new Map();

  const plant = () => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: /* glsl */ `
        attribute vec4 color;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec3 vRound;
        varying vec3 vLocal;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vec4 w = m * vec4(position, 1.0);
          vWorld = w.xyz;
          // A round limb's normal is in its uv (glTF counts v down from 1);
          // which way up it leans is its facet's.
          vec2 h = vec2(uv.x, 1.0 - uv.y) * 2.0 - 1.0;
          vRound = color.a < 0.19 ? vec3(h.x, sign(normal.y) * sqrt(max(1.0 - dot(h, h), 0.0)), h.y) : normal;
          vNormalW = normalize(mat3(m) * vRound);
          vLocal = position;
          vUv = uv;
          vColor = color;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec3 vRound;
        varying vec3 vLocal;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          // glTF counts v down from 1.
          vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
          vec3 albedo = vColor.rgb;
          float thin = 0.0;
          float limb = step(vColor.a, 0.19);
          if (vColor.a > 0.9) {
            // A frond: widest a fifth of the way out, narrowing to its tip;
            // leaflets off the rib, raked toward the tip, each a blade that
            // comes to a point. Too far off to tell them apart, the comb
            // closes into the frond's own shape, a little narrower.
            float across = abs(uv.x - 0.5) * 2.0;
            float outline = (0.3 + 0.7 * smoothstep(0.0, 0.22, uv.y)) * (1.0 - 0.82 * smoothstep(0.5, 1.0, uv.y));
            float e = across / outline;
            float t = uv.y * 24.0 - across * 3.0;
            float comb = mix(abs(fract(t) - 0.5) * 2.0, 0.55, smoothstep(0.3, 0.8, fwidth(t)));
            if (e > 1.0 || (across > 0.07 && comb > 1.0 - 0.85 * e * e)) discard;
            albedo *= 0.75 + 0.55 * uv.y;
            albedo = mix(albedo, albedo * 1.7 + 0.015, smoothstep(0.1, 0.03, across));
            // A crown at night is a dark shape with light on its edges: its
            // green is kept low and cool, and the light does the rest.
            albedo = mix(vec3(dot(albedo, vec3(0.3, 0.6, 0.1))), albedo, 0.6) * vec3(0.5, 0.6, 0.66);
            thin = 0.7;
          } else if (vColor.a > 0.7) {
            // Blossom: whole at the pad's middle, clusters with sky between
            // them toward its rim.
            float r = length(uv - 0.5) * 2.0;
            vec2 g = uv * 8.0;
            float h = hash12(floor(g) + 3.1);
            float d = length(fract(g) - 0.5 - (vec2(h, fract(h * 7.3)) - 0.5) * 0.4) * 2.0;
            d = mix(d, 0.6, smoothstep(0.5, 1.2, fwidth(g.x) + fwidth(g.y)));
            if (r > 1.0 || d > (1.15 - r) * (1.25 + 1.1 * h)) discard;
            albedo *= 0.65 + 0.6 * h;
            albedo = mix(albedo, vec3(1.0, 0.86, 0.9), step(0.84, fract(h * 13.7)) * 0.55);
            thin = 0.9;
          } else if (vColor.a > 0.6) {
            // A clump of blossom on crossed cards: florets on two offset
            // grids, fullest and largest at its middle, fewer and smaller
            // toward a ragged rim, each its own shade, the inside of the
            // clump in its own shadow and its top and rim catching the
            // light; far off, the clump's ragged outline alone.
            float r = length(uv - 0.5) * 2.0;
            vec2 g = uv * 9.0;
            vec2 g2 = g + 0.5;
            float h = hash12(floor(g) + 5.7);
            float h2 = hash12(floor(g2) + 9.1);
            float d = length(fract(g) - 0.5 - (vec2(h, fract(h * 7.3)) - 0.5) * 0.5) * 2.0;
            float d2 = length(fract(g2) - 0.5 - (vec2(h2, fract(h2 * 5.1)) - 0.5) * 0.5) * 2.0;
            float fill = 1.0 - r * r;
            float a1 = d / max(fill * 1.25 * (0.7 + 0.5 * h), 1e-3);
            float a2 = d2 / max(fill * (0.6 + 0.5 * h2) * step(0.3, h2), 1e-3);
            float which = a1 < a2 ? h : h2;
            float cut = min(a1, a2);
            cut = mix(cut, r * 1.2 + (h - 0.5) * 0.35, smoothstep(0.5, 1.2, fwidth(g.x) + fwidth(g.y)));
            if (r > 1.0 || cut > 1.0) discard;
            albedo *= (0.62 + 0.5 * which) * mix(0.55, 1.08, smoothstep(0.0, 1.0, uv.y * 0.55 + r * 0.6));
            albedo = mix(albedo, vec3(1.0, 0.86, 0.9), step(0.86, fract(which * 13.7)) * 0.5);
            thin = 0.9;
          } else if (vColor.a > 0.4) {
            // A palm's bark: a scar round the trunk where each old frond
            // let go.
            float rings = vLocal.y * 7.0;
            float close = 1.0 - smoothstep(0.3, 0.8, fwidth(rings));
            float scar = 1.0 - smoothstep(0.0, 0.35, fract(rings));
            albedo *= mix(1.0, (1.0 - 0.45 * scar) * (0.8 + 0.4 * hash12(vec2(floor(rings), 1.7))), close);
          } else if (limb < 0.5) {
            // A tree's: furrows running up it.
            float furrow = hash12(vec2(floor(vUv.x * 18.0), floor(vLocal.y * 1.3)));
            albedo *= mix(1.0, 0.6 + 0.7 * furrow, 1.0 - smoothstep(0.2, 0.6, fwidth(vUv.x * 18.0)));
          } else {
            // And on a round limb: plates of bark a whole number round it
            // (no seam), wandering as they climb, cracked between and
            // across; far off, its own average.
            float around = atan(vRound.z, vRound.x);
            float q = around * 1.4324 + 0.4 * sin(vLocal.y * 2.3 + 2.0 * sin(around)) + vLocal.y * 0.35;
            float plate = abs(fract(q) - 0.5) * 2.0;
            float which = mod(floor(q), 9.0);
            float row = vLocal.y * 2.6 + 3.0 * hash12(vec2(which, 4.2));
            float crack = smoothstep(0.0, 0.34, plate) * smoothstep(0.0, 0.1, abs(fract(row) - 0.5) * 2.0);
            float tone = 0.75 + 0.5 * hash12(vec2(which, floor(row)));
            float close = 1.0 - smoothstep(0.25, 0.7, fwidth(q) + fwidth(row));
            albedo *= mix(0.84, (0.48 + 0.52 * crack) * tone, close);
          }
          vec3 n = normalize(vNormalW);
          if (!gl_FrontFacing) n = -n;
          float up = n.y;
          // The lamps in the planter, from below: on the trunk, and under
          // the crown.
          float h = max(vLocal.y, 0.0);
          vec3 lamp = vec3(1.0, 0.76, 0.48) * (0.26 / (1.0 + h * h * 0.09)) * mix(1.0, 0.3 + 0.5 * clamp(-up, 0.0, 1.0), step(0.01, thin));
          // A frond takes the street's light as a rim, on the faces turned
          // to where it comes from (below and beside), not as a wash.
          float frondish = step(0.9, vColor.a);
          vec3 light = vec3(0.04) * (0.7 + 0.3 * up) + spillAt(vWorld) * mix(0.75 + 0.3 * thin, 0.3 + 0.35 * clamp(-up, 0.0, 1.0), frondish) + lamp;
          if (limb > 0.5) {
            // A round limb is lit from where the light is: each of the two
            // lamps in its planter on the side turned to it, the street's
            // light on the side it comes from, and a rim against the sky.
            vec3 nl = normalize(vRound);
            vec3 lamps = vec3(0.0);
            for (int i = 0; i < 2; i++) {
              vec3 d = (i == 0 ? vec3(0.34, 0.63, 0.36) : vec3(-0.36, 0.63, -0.3)) - vLocal;
              float d2 = dot(d, d);
              lamps += vec3(1.0, 0.76, 0.48) * clamp(dot(nl, d * inversesqrt(d2)) * 0.75 + 0.25, 0.0, 1.0) * 0.5 / (1.0 + d2 * 0.3);
            }
            vec3 side = spillAt(vWorld + vec3(n.x, 0.0, n.z) * 1.6);
            float rim = pow(1.0 - abs(dot(n, normalize(uCam - vWorld))), 3.0);
            light = vec3(0.03) * (0.7 + 0.3 * up) + spillAt(vWorld) * 0.25 + side * 0.7 + lamps + uHazeColor * 0.1 * rim * uHaze;
          }
          light += (uHazeColor * 0.22 + uGlowColor * 0.12) * (max(up, 0.0) + 0.5 * thin) * uHaze * 1.5;
          vec3 col = cityFog(albedo * light, vWorld, 0.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      side: THREE.DoubleSide,
    });
    return m;
  };

  const face = () => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: /* glsl */ `
        attribute vec4 color;
        attribute float aDeal;
        uniform vec3 uCam;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec3 vView;
        varying vec2 vUv;
        varying vec4 vColor;
        varying float vSeed;
        varying float vDeal;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vec4 w = m * vec4(position, 1.0);
          vWorld = w.xyz;
          // A bag is turned: its normal from u, smooth across its facets.
          float a = uv.x * 6.2832;
          vNormalW = normalize(mat3(m) * (abs(color.a - 0.85) < 0.02 ? vec3(cos(a), 0.45, sin(a)) : normal));
          vUv = uv;
          vColor = color;
          // The eye from here, in the prop's own frame: x to its right, y
          // up, z out of its front.
          vec3 eye = uCam - w.xyz;
          vView = vec3(dot(eye, normalize(m[0].xyz)), dot(eye, normalize(m[1].xyz)), dot(eye, normalize(m[2].xyz)));
          // Where it stands (to 5 cm, as the props file has it) is its seed.
          vec3 p3 = fract(vec3(floor(instanceMatrix[3].xzx * 20.0 + 0.5)) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          vSeed = fract((p3.x + p3.y) * p3.z);
          vDeal = aDeal;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec3 vView;
        varying vec2 vUv;
        varying vec4 vColor;
        varying float vSeed;
        varying float vDeal;
        float rect(vec2 p, vec2 lo, vec2 hi) {
          vec2 s = step(lo, p) * step(p, hi);
          return s.x * s.y;
        }
        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        // How much of a pixel at x is in a line w wide, one every pitch
        // (lines at whole pitches): drawn sharp near, and as the lines go
        // under a pixel their share of it, so they never shimmer.
        float lineAt(float x, float pitch, float w) {
          float f = fwidth(x);
          float d = abs(fract(x / pitch + 0.5) - 0.5) * pitch;
          float a = 1.0 - smoothstep(w * 0.5 - f * 0.5, w * 0.5 + f * 0.5, d);
          return mix(a, w / pitch, smoothstep(pitch * 0.2, pitch * 0.5, f));
        }
        // This way up: p from -1 to 1 over one arrow.
        float arrowUp(vec2 p) {
          return max(step(abs(p.x), 0.62 * (1.0 - p.y)) * step(0.1, p.y) * step(p.y, 1.0), step(abs(p.x), 0.2) * step(-0.9, p.y) * step(p.y, 0.1));
        }
        // The city's colours, six warm and six cool.
        vec3 hueOf(float warm, float i) {
          i = floor(mod(i, 6.0));
          if (warm > 0.5) {
            if (i < 0.5) return vec3(1.0, 0.7, 0.33);
            if (i < 1.5) return vec3(1.0, 0.18, 0.53);
            if (i < 2.5) return vec3(1.0, 0.12, 0.2);
            if (i < 3.5) return vec3(0.99, 0.9, 0.1);
            if (i < 4.5) return vec3(1.0, 0.25, 0.82);
            return vec3(1.0, 0.45, 0.15);
          }
          if (i < 0.5) return vec3(0.15, 0.86, 0.95);
          if (i < 1.5) return vec3(0.18, 0.9, 0.78);
          if (i < 2.5) return vec3(0.25, 0.5, 1.0);
          if (i < 3.5) return vec3(0.22, 1.0, 0.6);
          if (i < 4.5) return vec3(0.92, 0.92, 0.9);
          return vec3(0.64, 0.35, 1.0);
        }
        // A mark with no words: p from -1 to 1 across it.
        float mark(vec2 p, float k) {
          float r = length(p);
          k = floor(mod(k, 6.0));
          if (k < 0.5) return step(r, 0.85) * step(0.5, r);
          if (k < 1.5) return step(abs(abs(p.x) * 0.9 + p.y * 0.7 - 0.25), 0.16) * step(abs(p.y), 0.8);
          if (k < 2.5) return step(abs(p.x) + abs(p.y), 0.85);
          if (k < 3.5) return step(r, 0.85) * step(-0.1, p.y) + rect(p, vec2(-0.85, -0.5), vec2(0.85, -0.25));
          if (k < 4.5) return step(abs(p.x), 0.85 * (0.5 - p.y * 0.5)) * step(abs(p.y), 0.8);
          return max(rect(abs(p), vec2(0.0), vec2(0.26, 0.85)), rect(abs(p), vec2(0.0), vec2(0.85, 0.26)));
        }
        float seg(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a;
          vec2 ba = b - a;
          return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
        }
        // Something like a character: five by five, the same left and right.
        float glyph(vec2 cell, float n) {
          vec2 q = floor(fract(cell) * 5.0);
          return step(0.5, hash12(vec2(min(q.x, 4.0 - q.x), q.y) + n)) * step(0.5, q.y) * step(q.y, 3.5) * step(0.5, q.x) * step(q.x, 3.5);
        }
        // How many metres the face is across and up, from how uv and the
        // world move over a pixel.
        vec2 faceSize() {
          vec2 dx = dFdx(vUv);
          vec2 dy = dFdy(vUv);
          vec3 wx = dFdx(vWorld);
          vec3 wy = dFdy(vWorld);
          float det = dx.x * dy.y - dx.y * dy.x;
          return vec2(length(wx * dy.y - wy * dx.y), length(wy * dx.x - wx * dy.x)) / max(abs(det), 1e-9);
        }
        // An advert with no words, any shape: a field of two of the city's
        // colours with a slanted band across it, a mark, a line of
        // characters, a frame.
        vec3 advert(vec2 uv, vec2 size, float sd, float near) {
          float warm = step(0.5, fract(sd * 5.3));
          vec3 hue = hueOf(warm, sd * 6.0);
          vec3 other = hueOf(1.0 - warm, sd * 37.0);
          vec2 m = uv * size;
          float band = step(0.0, sin((m.x * 0.8 + m.y) * 2.2 + sd * 20.0));
          vec3 field = mix(hue * 0.5, other * 0.38, smoothstep(0.2, 0.9, uv.y)) * (0.8 + 0.4 * band);
          vec3 ink = vec3(1.0, 0.96, 0.9);
          field = mix(field, ink, mark((m - size * vec2(0.5, 0.62)) / (min(size.x, size.y) * 0.3), sd * 23.0));
          float row = size.y * 0.13;
          vec2 gp = (m - size * vec2(0.1, 0.09)) / row;
          float inRow = step(0.0, gp.x) * step(gp.x, floor(size.x * 0.8 / row)) * step(0.0, gp.y) * step(gp.y, 1.0);
          field = mix(field, ink, mix(0.25, glyph(gp, floor(gp.x) * 7.0 + floor(sd * 50.0)), near) * inRow);
          return mix(hue, field, rect(m, vec2(0.03), size - 0.03));
        }
        void main() {
          // glTF counts v down from 1.
          vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
          vec3 spill = spillAt(vWorld);
          vec3 shade = vec3(0.06) + spill * 1.3;
          vec3 col = vec3(0.0);
          float lit = 0.0;
          float kind = floor(vColor.a * 20.0 + 0.5) * 0.5;
          if (abs(kind - 9.5) < 0.1) {
            // A box, a crate, a stack of pallets, a sheet: card, timber and
            // plastic the street lights, each thing its own from where it
            // stands and its seed.
            vec2 size = faceSize();
            vec2 m = uv * size;
            float px = fwidth(m.x) + fwidth(m.y);
            float near = 1.0 - smoothstep(0.004, 0.016, px);
            // What is a hand across (a board, a mark, a strap) holds to a
            // street's width off.
            float mid = 1.0 - smoothstep(0.03, 0.08, px);
            float top = step(0.75, vColor.g);
            float sd = fract(vSeed * 7.31 + vColor.r * 3.77);
            float blotch = vnoise(m * 5.0 + sd * 20.0);
            vec3 ink = mix(vec3(0.012), hueOf(step(0.5, fract(sd * 9.1)), sd * 6.0) * 0.14, step(0.45, fract(sd * 17.3)));
            // What is printed on a side: a mark, a line of characters under
            // it, and which way up it goes.
            vec2 mp = (m - size * vec2(0.3, 0.56)) / (min(size.x, size.y) * 0.2);
            float row = size.y * 0.1;
            vec2 gp = (m - size * vec2(0.1, 0.14)) / row;
            float chars = step(0.0, gp.x) * step(gp.x, floor(size.x * 0.5 / row)) * step(0.0, gp.y) * step(gp.y, 1.0) * glyph(gp, floor(gp.x) * 7.0 + floor(sd * 50.0));
            vec2 ap = (m - size * vec2(0.78, 0.7)) / (size.y * 0.1);
            float arrows = max(max(arrowUp(ap + vec2(0.7, 0.0)), arrowUp(ap - vec2(0.7, 0.0))), rect(ap, vec2(-1.4, -1.3), vec2(1.4, -1.08)));
            float printed = max(max(mark(mp, sd * 23.0), arrows) * mix(0.35, 1.0, mid), chars * mix(0.25, 1.0, near)) * (1.0 - top);
            vec3 albedo;
            float pick = fract(sd * 13.7);
            if (vColor.b > 0.9) {
              // Inside an open box.
              albedo = vec3(0.005);
            } else if (vColor.b > 0.37) {
              // A sheet of paper (0.75), or card trodden flat (0.5): torn
              // at its edges.
              float sheet = step(0.6, vColor.b);
              float torn = vnoise(m * 40.0 + sd * 9.0);
              if (min(min(m.x, size.x - m.x), min(m.y, size.y - m.y)) < mix(0.03, 0.012, sheet) * torn) discard;
              float lines = step(0.4, fract(m.y / 0.016)) * rect(m / size, vec2(0.08, 0.06), vec2(0.92, 0.94)) * step(hash12(vec2(floor(m.y / 0.016), sd)), 0.8);
              vec3 paper = vec3(0.17, 0.165, 0.15) * (1.0 - 0.5 * lines * near);
              paper = mix(paper, vec3(0.04), rect(m / size, vec2(0.1, 0.5), vec2(0.52, 0.9)) * step(0.4, sd));
              albedo = mix(vec3(0.06, 0.043, 0.027) * (0.6 + 0.6 * blotch), paper * (0.6 + 0.4 * blotch), sheet);
            } else if (vColor.b > 0.12) {
              // Pallets, one on another: on a side the top boards' ends, the
              // stringer, three blocks with the dark between them, the foot
              // board; on top the boards and their gaps.
              float t = fract(m.y / 0.15) * 0.15;
              float block = max(max(step(m.x, 0.1), step(size.x - 0.1, m.x)), step(abs(m.x - size.x * 0.5), 0.05));
              float solid = mix(t < 0.02 || t > 0.11 ? 1.0 : block, 1.0, top);
              float boards = mix(step(0.13, t), 1.0, top);
              solid *= 1.0 - boards * lineAt(mix(m.x, m.y, top) - 0.11, 0.12, 0.02);
              float which = floor(m.y / 0.15) * 4.0 + step(0.02, t) + step(0.11, t) + step(0.13, t) + 17.0 * floor(mix(m.x, m.y, top) / 0.12) * boards;
              vec3 wood = vec3(0.14, 0.105, 0.068) * (0.65 + 0.6 * hash12(vec2(which, sd * 31.0))) * (0.85 + 0.3 * vnoise(vec2(m.x * 5.0, m.y * 80.0)));
              albedo = mix(vec3(0.004), wood, mix(0.72, solid, mid));
              // A strap round a stack of three or more, and a tag stapled
              // to it.
              float tall = step(0.4, size.y) * (1.0 - top);
              albedo = mix(albedo, vec3(0.012), (1.0 - smoothstep(0.009 - px * 0.5, 0.009 + px * 0.5, abs(m.x - size.x * 0.3))) * tall);
              albedo = mix(albedo, vec3(0.2, 0.19, 0.16) * (1.0 - 0.6 * step(0.5, fract(m.y / 0.012)) * near), rect(m, vec2(size.x * 0.3 + 0.02, 0.2), vec2(size.x * 0.3 + 0.11, 0.26)) * tall * step(0.4, sd));
            } else if (pick < 0.58) {
              // A carton: brown card, or grey, or white now and then.
              vec3 card = mix(vec3(0.16, 0.115, 0.07), vec3(0.12, 0.1, 0.08), fract(sd * 3.1));
              card = mix(card, vec3(0.19, 0.19, 0.18), step(0.84, fract(sd * 5.9)));
              albedo = card * (0.8 + 0.34 * blotch);
              // Knocked about: a crease or two across a side where it was
              // crushed, a dark fold with the card lighter along its edge.
              for (int i = 0; i < 2; i++) {
                float fi = float(i);
                float a = fract(sd * (71.0 + fi * 13.0)) * 3.1416;
                vec2 c = size * vec2(0.25 + 0.5 * fract(sd * (73.0 + fi * 7.0)), 0.3 + 0.5 * fract(sd * (79.0 + fi * 5.0)));
                vec2 dm = m - c;
                float along = abs(dot(dm, vec2(cos(a), sin(a))));
                float off = dot(dm, vec2(-sin(a), cos(a)));
                float on = step(0.35, fract(sd * (83.0 + fi * 11.0))) * (1.0 - top) * (1.0 - smoothstep(0.08, 0.2, along / max(size.x, size.y)));
                float w = 0.01 + px * 0.5;
                albedo *= 1.0 - on * mid * (0.45 * (1.0 - smoothstep(0.0, w, abs(off))) - 0.15 * (1.0 - smoothstep(w, w * 4.0, off)) * step(0.0, off));
              }
              float yellow = step(0.7, fract(sd * 23.0));
              vec3 tape = mix(vec3(0.15, 0.115, 0.062), vec3(0.17, 0.135, 0.02), yellow);
              // The long way of its top, where the tape runs over the seam.
              vec2 q = size.x > size.y ? m : m.yx;
              vec2 qs = size.x > size.y ? size : size.yx;
              float over = top * step(abs(q.y - qs.y * 0.5), 0.027);
              float tab = (1.0 - top) * rect(m, vec2(size.x * 0.5 - 0.027, size.y - 0.08), vec2(size.x * 0.5 + 0.027, size.y + 1.0));
              albedo = mix(albedo, albedo * 0.35, top * step(abs(q.y - qs.y * 0.5), 0.003));
              albedo = mix(albedo, tape * (1.0 - 0.45 * yellow * step(0.5, fract((q.x + q.y) / 0.05)) * near), max(over, tab) * 0.92);
              albedo = mix(albedo, ink, printed * step(0.25, fract(sd * 29.0)));
              // A label, with its bars and its lines.
              vec2 l0 = size * vec2(0.5 + 0.18 * fract(sd * 41.0), 0.16 + 0.3 * fract(sd * 37.0));
              vec2 lp = (m - l0) / vec2(0.15, 0.1);
              float label = rect(lp, vec2(0.0), vec2(1.0)) * (1.0 - top) * step(0.35, fract(sd * 53.0));
              float bars = rect(lp, vec2(0.08, 0.1), vec2(0.92, 0.45)) * step(0.5, hash12(vec2(floor(lp.x * 40.0), sd * 3.0)))
                + rect(lp, vec2(0.08, 0.58), vec2(0.7, 0.68)) + rect(lp, vec2(0.08, 0.76), vec2(0.5, 0.86));
              albedo = mix(albedo, vec3(0.23, 0.23, 0.21) * (1.0 - 0.8 * min(bars, 1.0) * near), label);
              // Straps round it, two.
              float strap = step(0.62, fract(sd * 61.0)) * (1.0 - smoothstep(0.008 - px * 0.5, 0.008 + px * 0.5, min(abs(q.x - qs.x * 0.22), abs(q.x - qs.x * 0.78))));
              albedo = mix(albedo, mix(vec3(0.01), vec3(0.15, 0.115, 0.01), step(0.5, fract(sd * 67.0))), strap);
            } else if (pick < 0.87) {
              // A wooden crate: boards with the dark between them, a batten
              // up each end, a stencil.
              float plank = floor(m.y / 0.095);
              vec3 wood = vec3(0.14, 0.098, 0.06) * (0.65 + 0.6 * hash12(vec2(plank, sd * 77.0))) * (0.85 + 0.3 * vnoise(vec2(m.x * 5.0, m.y * 70.0)));
              float batten = max(step(m.x, 0.055), step(size.x - 0.055, m.x));
              albedo = mix(wood, vec3(0.005), lineAt(m.y, 0.095, 0.012) * (1.0 - batten));
              albedo = mix(albedo, wood * 1.25, batten * 0.6);
              albedo = mix(albedo, vec3(0.01), printed * 0.85);
            } else {
              // A plastic crate: ribbed, a hand hole, a rim.
              float c = floor(fract(sd * 43.0) * 4.0);
              vec3 body = (c < 0.5 ? vec3(0.018, 0.045, 0.11) : c < 1.5 ? vec3(0.11, 0.018, 0.016) : c < 2.5 ? vec3(0.02, 0.075, 0.04) : vec3(0.13, 0.095, 0.012)) * 1.4;
              float ribs = (1.0 - lineAt(m.x, 0.045, 0.0225)) * step(size.y * 0.08, m.y) * step(m.y, size.y * 0.72) * (1.0 - top);
              albedo = body * (0.78 + 0.32 * ribs);
              albedo = mix(albedo, vec3(0.004), rect(m, vec2(size.x * 0.5 - 0.06, size.y * 0.78), vec2(size.x * 0.5 + 0.06, size.y * 0.87)) * (1.0 - top));
              albedo = mix(albedo, body * 1.5, max(step(size.y - 0.03, m.y) * (1.0 - top), top * (1.0 - rect(m, vec2(0.04), size - 0.04))));
            }
            // Creased at its edges, damp and dirty toward the ground.
            float ew = max(0.012, px * 1.2);
            albedo *= 1.0 - 0.35 * (1.0 - rect(m, vec2(ew), size - ew)) * step(vColor.b, 0.37);
            albedo *= 1.0 - (1.0 - top) * 0.5 * smoothstep(0.18, 0.0, m.y) * (0.5 + 0.5 * vnoise(vec2(m.x * 14.0, sd * 5.0)));
            // Lit from the side the street's light comes from, its top by
            // what is over it.
            vec3 n = normalize(vNormalW) * (gl_FrontFacing ? 1.0 : -1.0);
            vec3 toward = spillAt(vWorld + vec3(n.x, 0.0, n.z) * 1.3);
            col = albedo * (vec3(0.035) + (spill * 0.3 + toward * 0.7) * (0.6 + 0.4 * max(n.y, 0.0)) + uHazeColor * 0.05 * max(n.y, 0.0) * uHaze
              + SODIUM * santoAt(vWorld.xz) * uHaze * (0.5 + 0.5 * max(n.y, 0.0)) * exp(-max(vWorld.y, 0.0) * 0.02));
          } else if (abs(kind - 8.5) < 0.1) {
            // A bin bag: plastic creased from its neck, the street's light
            // a glint on each crease. Or a heap of what was swept up.
            float sd = fract(vSeed * 7.31 + vColor.r * 3.77);
            float near = 1.0 - smoothstep(0.004, 0.02, fwidth(uv.y));
            float around = uv.x * 6.2832;
            float crease = pow(abs(sin(around * 4.0 + 2.5 * sin(uv.y * 6.0 + sd * 20.0) + sd * 9.0)), 8.0) * near;
            vec3 plastic = mix(vec3(0.011, 0.011, 0.015), mix(vec3(0.018, 0.028, 0.052), vec3(0.08, 0.08, 0.075), step(0.5, fract(sd * 11.0))), step(0.74, fract(sd * 5.3)));
            float speck = hash12(floor(vec2(around * 9.0, uv.y * 14.0)) + sd * 7.0);
            vec3 heap = vec3(0.03, 0.027, 0.024) * (0.4 + vnoise(vec2(around * 4.0, uv.y * 8.0) + sd * 7.0))
              + hueOf(step(0.5, fract(speck * 7.0)), speck * 60.0) * 0.022 * step(0.94, speck) * near;
            vec3 n = normalize(vNormalW);
            vec3 toward = spillAt(vWorld + vec3(n.x, 0.0, n.z) * 1.3);
            vec3 light = vec3(0.03) + (spill * 0.3 + toward * 0.7) * (0.6 + 0.4 * max(n.y, 0.0));
            col = mix(plastic * (1.0 - 0.4 * smoothstep(0.8, 0.9, uv.y)), heap, vColor.b) * light + toward * 0.035 * crease * (1.0 - vColor.b);
          } else if (kind < 1.5) {
            // A crossing's signal: the walking figure lit, the seconds left
            // in bars over it. At a junction with lights its deal says what
            // the traffic over its crossing does (src/world/signals.js): below
            // 0 held, the figure, minus the deal the share of the bars lit;
            // 0.5 going, a hand lit in its place; 0.25 the hand dark, as it
            // flashes before that traffic goes.
            vec2 s = uv * vec2(0.28, 0.4);
            float near = 1.0 - smoothstep(0.004, 0.014, fwidth(s.y));
            vec2 f = (s - vec2(0.14, 0.13)) / 0.1;
            if (vDeal > 0.1) {
              // An open hand, the thumb out.
              vec2 q = abs(f - vec2(0.03, -0.32)) - vec2(0.2, 0.26);
              float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.08;
              d = min(d, seg(f, vec2(-0.15, -0.1), vec2(-0.17, 0.5)) - 0.065);
              d = min(d, seg(f, vec2(-0.02, -0.1), vec2(-0.03, 0.66)) - 0.065);
              d = min(d, seg(f, vec2(0.11, -0.1), vec2(0.12, 0.62)) - 0.065);
              d = min(d, seg(f, vec2(0.23, -0.1), vec2(0.26, 0.42)) - 0.06);
              d = min(d, seg(f, vec2(-0.12, -0.42), vec2(-0.42, -0.02)) - 0.07);
              lit = mix(0.35, smoothstep(0.03, -0.01, d), near) * step(0.4, vDeal);
              col = mix(vec3(0.008) + spill * 0.02, vec3(1.0, 0.3, 0.05) * 2.8, lit);
            } else {
              float d = length(f - vec2(0.08, 0.78)) - 0.14;
              d = min(d, seg(f, vec2(0.05, 0.55), vec2(-0.02, 0.05)) - 0.09);
              d = min(d, seg(f, vec2(-0.02, 0.05), vec2(0.32, -0.75)) - 0.07);
              d = min(d, seg(f, vec2(-0.02, 0.05), vec2(-0.38, -0.72)) - 0.07);
              d = min(d, seg(f, vec2(0.04, 0.48), vec2(0.36, 0.12)) - 0.055);
              d = min(d, seg(f, vec2(0.04, 0.48), vec2(-0.3, 0.2)) - 0.055);
              lit = mix(0.35, smoothstep(0.03, -0.01, d), near);
              vec2 c = (s - vec2(0.05, 0.3)) / vec2(0.18, 0.06);
              float count = rect(c, vec2(0.0), vec2(1.0)) * step(0.3, fract(c.x * 6.0)) * step(c.x, vDeal < 0.0 ? -vDeal : 0.34 + 0.66 * fract(vSeed * 3.1)) * near;
              col = mix(vec3(0.008) + spill * 0.02, vColor.rgb * 2.2, lit);
              col = mix(col, vec3(1.0, 0.3, 0.08) * 1.6, count);
            }
          } else if (kind < 2.5) {
            // A phone's or a charging post's panel: a screen with a handset
            // on it, keys, a reader.
            vec2 s = uv * vec2(0.5, 0.9);
            float near = 1.0 - smoothstep(0.005, 0.02, fwidth(s.y));
            vec3 hue = hueOf(0.0, vSeed * 6.0);
            col = vec3(0.04, 0.043, 0.05) * shade * (0.6 + 0.4 * rect(s, vec2(0.02), vec2(0.48, 0.88)));
            float screen = rect(s, vec2(0.06, 0.5), vec2(0.44, 0.82));
            vec2 hs = (s - vec2(0.25, 0.66)) / 0.1;
            float handset = smoothstep(0.03, 0.0, min(seg(hs, vec2(-0.55, 0.45), vec2(0.55, -0.45)) - 0.12, min(length(hs - vec2(-0.6, 0.5)), length(hs - vec2(0.6, -0.5))) - 0.3));
            col = mix(col, mix(hue * (0.35 + 0.3 * step(0.5, fract(s.y * 60.0))), vec3(1.0, 0.97, 0.92), handset * near), screen);
            float keys = rect(s, vec2(0.13, 0.14), vec2(0.37, 0.42)) * step(0.3, fract((s.x - 0.13) * 12.5)) * step(0.3, fract((s.y - 0.14) * 14.3)) * near;
            col = mix(col, vec3(0.35, 0.38, 0.42) * (shade + 0.3), keys);
            col = mix(col, vec3(0.2, 1.0, 0.5) * 1.5, rect(s, vec2(0.4, 0.44), vec2(0.43, 0.455)) * near);
            lit = screen;
          } else if (kind < 3.5) {
            // A grate over a lit pit: bars 4 cm deep, the pit 30 under
            // them, a lamp along the middle of its floor. The eye's ray
            // goes on down between two bars: from across them it meets the
            // next bar's side, lit from under and brighter the lower; from
            // along them it reaches the floor, or the pit's wall, where
            // the light has fallen off. Far off, its own average.
            vec2 size = faceSize();
            vec2 m = uv * size;
            float near = 1.0 - smoothstep(0.008, 0.025, fwidth(m.x) + fwidth(m.y));
            vec2 pitch = vec2(0.055, 0.4);
            vec2 at = floor(m / pitch);
            float gap = step(0.45, fract(m.x / pitch.x)) * step(0.06, fract(m.y / pitch.y));
            // Metres along (in the face's own u and v) for each metre down.
            vec2 run = vec2(-vView.x, vView.z) / max(vView.y, 0.12 * length(vView)) + 1e-4;
            vec2 edge = (at + mix(vec2(0.45, 0.06), vec2(1.0), step(0.0, run))) * pitch;
            vec2 down = (edge - m) / run;
            // (On a bar's own top the way down is behind it: nothing.)
            float deep = max(min(down.x, down.y), 0.0);
            vec2 floorAt = m + run * 0.3;
            float off = size.x > size.y ? floorAt.y - size.y * 0.5 : floorAt.x - size.x * 0.5;
            float lamp = mix(0.3, 0.35 + exp(-off * off / 0.012), rect(floorAt, vec2(0.05), size - 0.05)) * (0.85 + 0.3 * hash12(floor(floorAt / 0.03)));
            vec3 under = vColor.rgb * (deep < 0.04 ? 0.55 * pow(deep / 0.04 + 1e-4, 1.5) : lamp);
            lit = rect(m, vec2(0.05), size - 0.05) * mix(0.35, gap, near);
            col = mix(vec3(0.02, 0.021, 0.025) * shade * 4.0, mix(vColor.rgb * 0.6, under, near), lit);
          } else if (kind < 4.5) {
            // A guard rail: posts, a top rail and a lower one, bars between.
            vec2 size = faceSize();
            vec2 m = uv * size;
            float px = fwidth(m.x) + fwidth(m.y);
            float rails = max(step(size.y - 0.06, m.y), rect(m, vec2(0.0, 0.14), vec2(size.x, 0.19)));
            float posts = max(step(m.x, 0.05), step(size.x - 0.05, m.x));
            float bars = step(abs(fract(m.x / 0.13) - 0.5), 0.09) * step(0.14, m.y) * (1.0 - smoothstep(0.012, 0.03, px));
            if (max(rails, max(posts, bars)) < 0.5) discard;
            col = vec3(0.05, 0.055, 0.065) * shade * (1.0 + 1.5 * step(size.y - 0.02, m.y));
          } else if (kind < 5.5) {
            // A food box's menu: dishes in two rows with their prices, a
            // dark band over them with its mark.
            vec2 s = uv * vec2(0.66, 0.6);
            float near = 1.0 - smoothstep(0.005, 0.02, fwidth(s.y));
            vec3 field = vColor.rgb * (0.75 + 0.5 * uv.y);
            vec2 g = (s - vec2(0.04, 0.04)) / vec2(0.58, 0.42) * vec2(3.0, 2.0);
            float inGrid = rect(g, vec2(0.0), vec2(3.0, 2.0));
            vec2 f = fract(g);
            float h = hash12(floor(g) + floor(vSeed * 64.0));
            float bowl = step(length(f - vec2(0.5, 0.6)), 0.32);
            float food = step(length(f - vec2(0.5, 0.6)), 0.24);
            vec3 dish = mix(vec3(0.05, 0.03, 0.02), hueOf(step(0.5, h), h * 6.0) * 0.8, food);
            field = mix(field, dish, bowl * inGrid * near);
            field = mix(field, vec3(0.08, 0.05, 0.02), rect(f, vec2(0.25, 0.08), vec2(0.75, 0.16)) * inGrid * near);
            vec2 hp = s - vec2(0.04, 0.49);
            float ink = max(mark((hp - vec2(0.05, 0.05)) / 0.04, vSeed * 23.0), rect(hp, vec2(0.14, 0.03), vec2(0.56, 0.07)) * step(0.3, fract(hp.x * 30.0)) * step(0.3, hash12(vec2(floor(hp.x * 30.0), vSeed * 91.0))));
            field = mix(field, mix(vec3(0.05, 0.035, 0.02), vColor.rgb, ink * near), step(0.49, s.y));
            col = field * 1.5;
            lit = 1.0;
          } else if (kind < 6.5) {
            // A mesh fence panel: its frame and the wire's diamonds, which
            // thicken to stay a line and then are gone.
            vec2 size = faceSize();
            vec2 m = uv * size;
            float px = fwidth(m.x) + fwidth(m.y);
            float frame = 1.0 - rect(m, vec2(0.05, 0.04), size - vec2(0.05, 0.04));
            float wire = min(abs(fract((m.x + m.y) / 0.09) - 0.5), abs(fract((m.x - m.y) / 0.09) - 0.5)) * 0.09;
            float mesh = step(wire, max(0.005, px * 0.6)) * (1.0 - smoothstep(0.02, 0.04, px));
            if (max(frame, mesh) < 0.5) discard;
            col = vec3(0.2, 0.22, 0.25) * shade * (0.6 + 0.6 * frame);
          } else if (kind < 7.5) {
            // A banner on a lamp's bracket, printed cloth the street lights:
            // one lamp in two flies one. A roundel with its mark, a column
            // of something like characters, a band at the foot.
            if (fract(vSeed * 3.7) < 0.5) discard;
            float warm = step(0.5, fract(vSeed * 5.3));
            vec3 hue = hueOf(warm, vSeed * 6.0);
            vec3 other = hueOf(1.0 - warm, vSeed * 37.0);
            vec2 b = uv * vec2(0.6, 1.6);
            float near = 1.0 - smoothstep(0.008, 0.03, fwidth(b.y));
            vec3 pale = vec3(0.8, 0.78, 0.72);
            vec3 cloth = hue * 0.4;
            vec2 mp = (b - vec2(0.3, 1.3)) / 0.16;
            float roundel = step(length(mp), 1.25);
            cloth = mix(cloth, mix(pale, other * 0.45, mark(mp, vSeed * 23.0) * near), roundel);
            vec2 gp = (b - vec2(0.18, 0.26)) / vec2(0.24, 0.2);
            float stroke = glyph(gp, floor(gp.y) * 7.0 + floor(vSeed * 50.0));
            cloth = mix(cloth, pale, mix(0.22, stroke, near) * rect(gp, vec2(0.0), vec2(1.0, 4.0)));
            cloth = mix(cloth, other * 0.3, step(b.y, 0.16));
            cloth *= 0.6 + 0.4 * step(0.03, b.y) * step(b.y, 1.57);
            col = cloth * (vec3(0.07) + spill * 1.5);
          } else if (kind < 9.5) {
            // An advert: printed on a board the street lights, or a lit box
            // (whose back is another advert).
            vec2 size = faceSize();
            float near = 1.0 - smoothstep(0.01, 0.04, fwidth(uv.y) * size.y);
            vec3 art = advert(uv, size, fract(vSeed + 0.37 * step(vView.z, 0.0)), near);
            lit = step(8.5, kind);
            col = art * mix(shade * 0.8, vec3(1.5), lit);
          } else if (kind > 9.75 && vDeal >= 1.0) {
            // The other vending machines (the first is below).
            float warm = step(vColor.b, vColor.r);
            vec3 hue = hueOf(warm, vSeed * 6.0);
            vec3 other = hueOf(1.0 - warm, vSeed * 37.0);
            vec2 p = uv * vec2(0.96, 1.95);
            float near = 1.0 - smoothstep(0.008, 0.025, fwidth(p.y));
            vec2 slide = vView.xy / max(vView.z, 0.3);
            if (vDeal < 2.0) {
              // A wall of drinks: three shelves of bottles and cans before
              // a white light, a price and a button under each, cold ones
              // blue and hot ones red; under it a band in the machine's
              // colour, the coins' panel, the flap the drink falls behind.
              vec3 paint = mix(vec3(0.3, 0.31, 0.33), hue * 0.5, 0.35 + 0.4 * step(0.5, fract(vSeed * 7.31)));
              col = paint * shade * (0.55 + 0.45 * rect(p, vec2(0.02), vec2(0.94, 1.93)));
              vec2 w0 = vec2(0.05, 0.78);
              vec2 w1 = vec2(0.91, 1.87);
              float win = rect(p, w0, w1);
              vec2 c = p - slide * 0.04;
              vec2 g = (c - w0) / (w1 - w0) * vec2(8.0, 3.0);
              vec2 f = fract(g);
              float h = hash12(floor(g) + floor(vSeed * 64.0));
              float tall = step(0.5, fract(h * 3.3));
              float shoulder = mix(0.78, 0.88, tall);
              float item = max(rect(f, vec2(0.2, 0.3), vec2(0.8, shoulder)), tall * rect(f, vec2(0.38, shoulder), vec2(0.62, 0.97)));
              float belly = 0.55 + 0.45 * sin(clamp((f.x - 0.2) / 0.6, 0.0, 1.0) * 3.1416);
              vec3 drink = hueOf(step(0.5, fract(h * 5.7)), h * 6.0) * mix(0.8, 1.2, rect(f, vec2(0.0, 0.42), vec2(1.0, 0.64))) * belly;
              vec3 back = vec3(0.84, 0.83, 0.78);
              vec3 cell = mix(back, drink, item);
              vec3 button = mix(vec3(0.25, 0.55, 1.0), vec3(1.0, 0.25, 0.15), step(0.6, fract(h * 9.1))) * 1.4;
              vec3 under = mix(vec3(0.15, 0.16, 0.18), vec3(0.72), rect(f, vec2(0.1, 0.09), vec2(0.58, 0.19)));
              under = mix(under, button, step(length((f - vec2(0.78, 0.13)) * vec2(1.0, 3.38)), 0.15));
              cell = mix(cell, under, step(f.y, 0.24));
              vec3 wall = mix(mix(back, hue, 0.35) * 0.8, cell, near) * (0.72 + 0.28 * smoothstep(0.0, 1.0, (c.y - w0.y) / (w1.y - w0.y)));
              col = mix(col, mix(vec3(0.02), wall, rect(c, w0, w1)), win);
              vec2 bp = p - vec2(0.05, 0.5);
              float band = rect(bp, vec2(0.0), vec2(0.62, 0.22));
              float emblem = mark((bp - vec2(0.11, 0.11)) / 0.08, vSeed * 23.0) * near;
              float words = rect(bp, vec2(0.24, 0.08), vec2(0.58, 0.14)) * step(0.3, fract(bp.x * 30.0)) * step(0.3, hash12(vec2(floor(bp.x * 30.0), vSeed * 91.0))) * near;
              col = mix(col, mix(hue * 0.75, vec3(1.0, 0.97, 0.92), max(emblem, words)), band);
              col = mix(col, vec3(0.02, 0.021, 0.025) + spill * 0.03, rect(p, vec2(0.71, 0.5), vec2(0.91, 0.72)));
              col = mix(col, vec3(1.0, 0.62, 0.2) * 1.8, rect(p, vec2(0.76, 0.64), vec2(0.86, 0.66)));
              col = mix(col, vec3(0.2, 1.0, 0.5) * 1.3, rect(p, vec2(0.75, 0.54), vec2(0.79, 0.575)) * near);
              col = mix(col, vec3(0.01, 0.011, 0.014) + hue * 0.035 * smoothstep(0.4, 0.12, p.y), rect(p, vec2(0.12, 0.12), vec2(0.84, 0.4)));
              col = mix(col, paint * shade * 2.0, rect(p, vec2(0.12, 0.37), vec2(0.84, 0.4)));
              lit = max(win * 0.9, band * 0.7);
            } else if (vDeal < 3.0) {
              // A bank of capsule machines, two wide and three high: each
              // its own colour, a window on a heap of capsules under a lit
              // card, a knob to turn, the slot over it, a chute.
              col = vec3(0.045, 0.047, 0.055) * shade;
              vec2 g = (p - vec2(0.04, 0.08)) / vec2(0.44, 0.6);
              vec2 id = floor(g);
              vec2 q = fract(g) * vec2(0.44, 0.6);
              float h = hash12(id + floor(vSeed * 64.0));
              vec3 body = mix(vec3(0.42, 0.42, 0.4), hueOf(step(0.5, fract(h * 5.7)), h * 6.0) * 0.45, step(0.35, fract(h * 3.3)));
              vec3 unit = body * shade * 1.6;
              float win = rect(q, vec2(0.04, 0.23), vec2(0.4, 0.57));
              vec2 c = q - slide * 0.05;
              vec3 inside = vec3(0.03, 0.032, 0.04);
              vec2 cg = c / 0.062;
              cg.x += 0.5 * mod(floor(cg.y), 2.0);
              vec2 cf = fract(cg) - 0.5;
              float ch = hash12(floor(cg) + id * 7.0 + floor(vSeed * 64.0));
              float heap = step(c.y, 0.41 + 0.02 * sin(c.x * 40.0 + h * 9.0));
              vec3 capsule = mix(vec3(0.72, 0.73, 0.75), hueOf(step(0.5, fract(ch * 5.7)), ch * 6.0), step(cf.y, 0.02));
              capsule *= 0.5 + 0.5 * smoothstep(0.5, 0.0, length(cf - vec2(-0.12, 0.14)));
              inside = mix(inside, mix(body * 0.5 + 0.2, capsule, near) * 0.7, heap * mix(1.0, step(length(cf), 0.46), near));
              vec3 card = mix(hueOf(step(0.5, h), h * 37.0) * 0.8, vec3(1.0, 0.96, 0.9), mark((c - vec2(0.22, 0.495)) / 0.045, h * 23.0) * near);
              inside = mix(inside, card, rect(c, vec2(0.06, 0.435), vec2(0.38, 0.555)));
              unit = mix(unit, mix(vec3(0.015), inside, rect(c, vec2(0.04, 0.23), vec2(0.4, 0.57))), win);
              vec2 kp = (q - vec2(0.15, 0.115)) / 0.07;
              float turn = h * 3.1416;
              unit = mix(unit, vec3(0.5, 0.5, 0.52) * shade * 2.0, step(length(kp), 1.0));
              unit = mix(unit, vec3(0.03), step(length(kp), 0.85) * step(abs(kp.x * sin(turn) - kp.y * cos(turn)), 0.24) * near);
              unit = mix(unit, vec3(0.008), rect(q, vec2(0.125, 0.2), vec2(0.175, 0.212)));
              unit = mix(unit, vec3(0.006) + body * 0.03, rect(q, vec2(0.27, 0.04), vec2(0.4, 0.17)));
              unit = mix(unit, body * shade * 2.4, rect(q, vec2(0.27, 0.15), vec2(0.4, 0.17)));
              float on = rect(q, vec2(0.012, 0.01), vec2(0.428, 0.59)) * rect(g, vec2(0.0), vec2(2.0, 3.0));
              col = mix(col, unit, on);
              lit = win * on * 0.6;
            } else {
              // A dark one: a black front the street slides over, a small
              // screen, a lit slot under it, keys, a line of light down its
              // edge and along its tray.
              vec3 paint = vec3(0.012, 0.013, 0.016);
              col = paint * (vec3(0.5) + shade * 4.0) * (0.6 + 0.4 * rect(p, vec2(0.02), vec2(0.94, 1.93)));
              col += spill * 0.05 * smoothstep(0.3, 1.0, fract(p.x * 0.7 + p.y * 0.25 + vSeed));
              float screen = rect(p, vec2(0.3, 1.32), vec2(0.66, 1.58));
              vec2 sp = (p - vec2(0.3, 1.32)) / vec2(0.36, 0.26);
              float figure = max(mark((sp - vec2(0.24, 0.56)) / vec2(0.2, 0.28), vSeed * 23.0),
                rect(sp, vec2(0.5, 0.2), vec2(0.92, 0.8)) * step(0.45, fract(sp.y * 5.0)) * step(sp.x, 0.55 + 0.37 * hash12(vec2(floor(sp.y * 5.0), vSeed * 31.0))));
              col = mix(col, mix(other * (0.3 + 0.12 * step(0.5, fract(p.y * 60.0)) * near), vec3(1.0, 0.97, 0.92), figure * near), screen);
              float slot = rect(p, vec2(0.3, 1.1), vec2(0.66, 1.125));
              vec2 sd = (p - vec2(0.48, 1.1125)) * vec2(1.0, 4.0);
              col += hue * 0.12 * exp(-dot(sd, sd) * 40.0);
              col = mix(col, mix(hue, vec3(1.0, 0.55, 0.2), 0.5) * 1.15, slot);
              float keys = rect(p, vec2(0.38, 0.8), vec2(0.58, 1.04)) * step(0.35, fract((p.x - 0.38) * 15.0)) * step(0.35, fract((p.y - 0.8) * 16.7)) * near;
              col = mix(col, vec3(0.1, 0.105, 0.12) * (shade + 0.4), keys);
              float edge = rect(p, vec2(0.045, 0.2), vec2(0.058, 1.85));
              col = mix(col, hue * 0.85, edge);
              float tray = rect(p, vec2(0.2, 0.2), vec2(0.76, 0.46));
              col = mix(col, vec3(0.004) + hue * 0.05 * smoothstep(0.46, 0.2, p.y), tray);
              col = mix(col, hue * 0.9, rect(p, vec2(0.2, 0.452), vec2(0.76, 0.46)));
              col = mix(col, paint * shade * 9.0, mark((p - vec2(0.48, 1.74)) / 0.07, vSeed * 23.0) * near * 0.6);
              lit = max(max(screen, slot), edge);
            }
          } else {
            float warm = step(vColor.b, vColor.r);
            vec3 hue = hueOf(warm, vSeed * 6.0);
            vec3 other = hueOf(1.0 - warm, vSeed * 37.0);
            // A vending machine's front, in metres from its foot.
            vec2 p = uv * vec2(0.96, 1.95);
            float near = 1.0 - smoothstep(0.008, 0.025, fwidth(p.y));
            // The cabinet's paint, charcoal or its own colour, and the door's
            // edge round it.
            vec3 paint = mix(vec3(0.05, 0.055, 0.065), hue * 0.2, step(0.45, fract(vSeed * 7.31)));
            col = paint * shade * (0.55 + 0.45 * rect(p, vec2(0.025), vec2(0.935, 1.925)));
            // The header: its mark and a line of something like lettering.
            vec2 hp = p - vec2(0.06, 1.69);
            float head = rect(hp, vec2(0.0), vec2(0.84, 0.2));
            float emblem = mark((hp - vec2(0.11, 0.1)) / 0.075, vSeed * 23.0) * near;
            float bar = rect(hp, vec2(0.25, 0.07), vec2(0.78, 0.13)) * step(0.3, fract(hp.x * 30.0)) * step(0.3, hash12(vec2(floor(hp.x * 30.0), vSeed * 91.0))) * near;
            col = mix(col, mix(hue * (0.5 + 1.2 * hp.y / 0.2), vec3(1.0, 0.97, 0.92), max(emblem, bar)) * 1.5, head);
            // The window. What stands behind the glass is 6 cm back, so it
            // slides against the frame as the eye passes.
            vec2 w0 = vec2(0.07, 0.66);
            vec2 w1 = vec2(0.7, 1.62);
            float win = rect(p, w0, w1);
            vec2 c = p - vView.xy / max(vView.z, 0.3) * 0.06;
            vec2 g = (c - w0) / (w1 - w0) * vec2(6.0, 4.0);
            vec2 f = fract(g);
            float h = hash12(floor(g) + floor(vSeed * 64.0));
            // A can: round, a label round its middle, its top.
            float can = max(rect(f, vec2(0.2, 0.09), vec2(0.8, 0.82)), rect(f, vec2(0.3, 0.82), vec2(0.7, 0.88)));
            float belly = 0.5 + 0.5 * sin(clamp((f.x - 0.2) / 0.6, 0.0, 1.0) * 3.1416);
            float label = rect(f, vec2(0.0, 0.34), vec2(1.0, 0.6));
            vec3 canCol = hueOf(step(0.5, fract(h * 5.7)), h * 6.0) * mix(0.75, 1.25, label) * belly;
            // The tube over the shelves lights them from above.
            float tube = 0.4 + 0.75 * smoothstep(-0.1, 1.0, (c.y - w0.y) / (w1.y - w0.y));
            vec3 back = vec3(0.05, 0.06, 0.08);
            vec3 shelf = mix(back, canCol, can);
            shelf = mix(shelf, vec3(0.7, 0.75, 0.8), step(f.y, 0.06));
            shelf = mix(mix(back, mix(hue, vec3(0.7), 0.6), 0.4), shelf, near) * tube;
            shelf = mix(vec3(0.012) + hue * 0.03, shelf, rect(c, w0, w1));
            shelf += spill * 0.1;
            col = mix(col, shelf, win);
            // The lit strip of prices under it.
            float strip = rect(p, vec2(0.07, 0.535), vec2(0.7, 0.6));
            float tick = step(0.3, fract((p.x - 0.07) / 0.105)) * step(0.555, p.y) * step(p.y, 0.58);
            col = mix(col, mix(vec3(0.9, 0.85, 0.7), hue, 0.35) * mix(0.75, 0.35 + 1.0 * tick, near), strip);
            // The tray: a dark mouth under a lip that catches the light.
            float tray = rect(p, vec2(0.1, 0.14), vec2(0.67, 0.44));
            col = mix(col, vec3(0.006, 0.007, 0.01) + hue * 0.04 * smoothstep(0.44, 0.14, p.y), tray);
            col = mix(col, paint * shade * 2.2, rect(p, vec2(0.1, 0.405), vec2(0.67, 0.44)));
            // To the right: a screen, a keypad, the coin slot's glow, a reader.
            float screen = rect(p, vec2(0.755, 1.34), vec2(0.885, 1.5));
            col = mix(col, other * (0.55 + 0.6 * step(0.5, fract(p.y * 42.0)) * near), screen);
            float keys = rect(p, vec2(0.765, 1.06), vec2(0.875, 1.28)) * step(0.3, fract((p.x - 0.765) * 27.3)) * step(0.3, fract((p.y - 1.06) * 18.2)) * near;
            col = mix(col, vec3(0.3, 0.33, 0.36) * (shade + 0.25), keys);
            float slot = rect(p, vec2(0.79, 0.9), vec2(0.85, 0.93));
            vec2 sd = p - vec2(0.82, 0.915);
            col += vec3(1.0, 0.6, 0.2) * 0.1 * exp(-dot(sd, sd) * 500.0);
            col = mix(col, vec3(1.0, 0.62, 0.2) * 2.0, slot);
            col = mix(col, vec3(0.012), rect(p, vec2(0.775, 0.72), vec2(0.865, 0.81)));
            col = mix(col, vec3(0.2, 1.0, 0.5) * 1.4, rect(p, vec2(0.848, 0.79), vec2(0.858, 0.8)) * near);
            lit = max(max(head, win * 0.8), max(strip, screen));
          }
          col = cityFog(col, vWorld, lit);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      side: THREE.DoubleSide,
    });
    return m;
  };

  const halo = () => new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec4 color;
      uniform vec3 uCam;
      varying vec2 vAt;
      varying vec3 vWorld;
      varying vec4 vColor;
      void main() {
        mat4 m = modelMatrix * instanceMatrix;
        vec3 axis = (m * vec4(0.0, position.y, position.z, 1.0)).xyz;
        vec3 eye = uCam - axis;
        vWorld = axis + normalize(vec3(eye.z, 0.0, -eye.x)) * position.x;
        // glTF counts v down from 1.
        vAt = vec2(uv.x, 1.0 - uv.y);
        vColor = color;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${LAMP_AIR}
      varying vec2 vAt;
      varying vec3 vWorld;
      varying vec4 vColor;
      void main() {
        float a = lampAir(vAt.x, vAt.y, vColor.a * 10.0) * lampSeen(uCam - vWorld, vWorld, uTime) * 0.5 * uHaze * (1.0 + 0.25 * uLevel);
        gl_FragColor = vec4(vColor.rgb * a, 0.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const paper = () => new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec4 color;
      attribute float aDeal;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vUv;
      varying vec4 vColor;
      varying float vDeal;
      void main() {
        mat4 m = modelMatrix * instanceMatrix;
        vec4 w = m * vec4(position, 1.0);
        vWorld = w.xyz;
        // Turned paper's normal is turned from u: smooth across its facets.
        float a = uv.x * 6.2832;
        vec3 n = color.a > 0.6 && color.r > 0.5 ? vec3(cos(a), 0.0, sin(a)) : normal;
        vNormalW = normalize(mat3(m) * n);
        vUv = uv;
        vColor = color;
        vDeal = aDeal;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec2 vUv;
      varying vec4 vColor;
      varying float vDeal;
      vec3 paperHue(float i) {
        if (i < 0.5) return vec3(${PAPER_HUES[0].join(", ")});
        if (i < 1.5) return vec3(${PAPER_HUES[1].join(", ")});
        if (i < 2.5) return vec3(${PAPER_HUES[2].join(", ")});
        return vec3(${PAPER_HUES[3].join(", ")});
      }
      void main() {
        // glTF counts v down from 1.
        vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
        float which = floor(vDeal + 0.0005);
        float dark = step(${DARK.toFixed(1)} - 0.5, which);
        // One left dark still has its paper's colour.
        vec3 hue = paperHue(mix(which, floor(fract(vDeal) * 2.99), dark));
        vec3 n = normalize(vNormalW);
        float facing = abs(dot(n, normalize(uCam - vWorld)));
        vec3 street = vec3(0.045) + spillAt(vWorld) * 1.2;
        vec3 col;
        float lit = 1.0 - dark;
        if (vColor.a > 0.9) {
          float belly = sin(3.1416 * clamp(uv.y, 0.0, 1.0));
          float glow = (0.6 + 0.4 * belly) * (0.74 + 0.26 * facing);
          // Near by: the hoops under a turned lantern's paper, a pane's
          // lattice.
          float near = 1.0 - smoothstep(0.004, 0.02, fwidth(uv.y));
          vec2 bar = abs(fract(uv * vec2(2.0, 3.0)) - 0.5);
          float drawn = vColor.r > 0.5
            ? 0.1 * (0.5 + 0.5 * cos(uv.y * 69.0))
            : 0.8 * max(step(0.47, bar.x), step(0.475, bar.y));
          glow *= 1.0 - drawn * near;
          // The flame's place: a little hotter, a little paler.
          vec3 hot = mix(hue, vec3(1.0, 0.86, 0.62), 0.3 * belly * facing);
          // Dark, it is dull paper the street lights.
          vec3 dull = mix(hue, vec3(0.5), 0.5) * 0.2 * min(street, vec3(1.0)) * (0.6 + 0.4 * facing);
          col = mix(hot * glow * 1.12 * (1.0 + 0.2 * uBass), dull, dark);
        } else if (vColor.a > 0.6) {
          vec3 bulb = mix(hue, vec3(1.0, 0.92, 0.78), 0.12 + 0.38 * facing * facing) * 1.3;
          col = mix(bulb, vec3(0.1, 0.1, 0.11) * min(street, vec3(1.0)) * 2.0, dark);
        } else {
          col = vColor.rgb * (street * 3.0 + hue * 0.45 * lit);
          lit = 0.0;
        }
        col = cityFog(col, vWorld, lit);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
  });

  // Worn steel and plastic: a skip, a drum, a barrel, a roof's plant. The
  // part's kind is its vertex colour's alpha (props.py `worn`), its red how
  // light it is and its green how worn; the paint is one of a few colours
  // from where the thing stands (a hash of its instance's origin), and so
  // are how worn it is, its stencil and its dents.
  const worn = () => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: /* glsl */ `
        attribute vec4 color;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec3 vLocal;
        varying vec2 vUv;
        varying vec4 vColor;
        varying vec3 vSeed;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vec4 w = m * vec4(position, 1.0);
          vWorld = w.xyz;
          // A part turned about the thing's upright axis is lit round, its
          // facets' horizontal turned to the axis's own at each corner.
          vec3 nl = normal;
          float kind = floor(color.a * 10.0 + 0.5);
          if ((kind == 9.0 || kind == 8.0 || kind == 4.0 || kind == 2.0) && dot(position.xz, position.xz) > 1e-4 && length(normal.xz) > 0.2
              && dot(normalize(normal.xz), normalize(position.xz)) > 0.9) {
            vec2 rad = normalize(position.xz) * length(normal.xz);
            nl = vec3(rad.x, normal.y, rad.y);
          }
          vNormalW = normalize(mat3(m) * nl);
          vLocal = position;
          vUv = uv;
          vColor = color;
          vec3 o = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vSeed = fract(sin(vec3(dot(o, vec3(12.9898, 78.233, 37.719)), dot(o, vec3(39.346, 11.135, 83.155)), dot(o, vec3(73.156, 52.235, 9.151)))) * 43758.5453);
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec3 vLocal;
        varying vec2 vUv;
        varying vec4 vColor;
        varying vec3 vSeed;
        float vn3(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                     mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
        }
        // The paints, linear: a skip's, a drum's and a plastic barrel's.
        vec3 paintOf(float kind, float v) {
          if (kind > 9.5) return v < 1.0 ? vec3(0.045, 0.14, 0.07) : v < 2.0 ? vec3(0.03, 0.07, 0.17) : v < 3.0 ? vec3(0.12, 0.12, 0.115) : vec3(0.16, 0.04, 0.03);
          if (kind > 8.5) return v < 1.0 ? vec3(0.025, 0.06, 0.2) : v < 2.0 ? vec3(0.26, 0.035, 0.02) : v < 3.0 ? vec3(0.022, 0.022, 0.025) : vec3(0.34, 0.17, 0.018);
          // (A barrel's white is an old one's dull off-white: as white as a
          // sign's face, a lamp beside it made it a glowing blob.)
          return v < 1.0 ? vec3(0.02, 0.08, 0.26) : v < 2.0 ? vec3(0.21, 0.205, 0.185) : v < 3.0 ? vec3(0.5, 0.12, 0.012) : vec3(0.035, 0.17, 0.06);
        }
        // A stencil or a label, uv 0 to 1 across and up it, on a thing of
        // seed s: hazard stripes, a printed plate of marks, a stencilled
        // code, or a diamond; how much of it is there (0 lets the paint
        // under it show) in a, its colour in the return.
        vec3 label(vec2 uv, float s, float px, out float a) {
          float t = floor(s * 4.0);
          vec2 e = min(uv, 1.0 - uv);
          float frame = step(0.06, min(e.x, e.y * 2.0));
          a = 1.0;
          if (t < 1.0) {
            float band = step(0.5, fract((uv.x * 2.4 + uv.y) * 2.5));
            return mix(vec3(0.018), vec3(0.42, 0.27, 0.015), band * frame);
          }
          if (t < 2.0) {
            // A white plate: a block of marks and lines of them, no words.
            vec2 g = vec2(uv.x * 14.0, uv.y * 7.0);
            float row = floor(g.y);
            float len = 0.35 + 0.6 * hash12(vec2(row, s * 31.0));
            float ink = step(0.25, fract(g.y)) * step(fract(g.y), 0.7) * step(uv.x, len) * step(0.18, uv.x) * step(0.15, uv.y) * step(uv.y, 0.85);
            float logo = step(0.05, uv.x) * step(uv.x, 0.15) * step(0.3, uv.y) * step(uv.y, 0.75);
            ink = max(ink * step(0.3, hash12(floor(g) + s * 17.0)), logo);
            ink *= 1.0 - smoothstep(0.3, 1.0, px * 14.0);
            return mix(vec3(0.5, 0.5, 0.47), vec3(0.03, 0.035, 0.05), max(ink, 1.0 - step(0.03, min(e.x, e.y))));
          }
          if (t < 3.0) {
            // Stencilled blocks of a code, sprayed: nothing between them.
            vec2 g = vec2(uv.x * 5.0, uv.y * 1.0);
            vec2 c = fract(g);
            float h = hash12(vec2(floor(g.x), s * 13.0));
            float bar = step(0.15, c.x) * step(c.x, 0.85) * step(0.2, uv.y) * step(uv.y, 0.8);
            float gap = step(0.5, h) * step(0.42, c.y) * step(c.y, 0.58) + step(h, 0.5) * step(0.4, c.x) * step(c.x, 0.6) * step(0.45, uv.y) * step(uv.y, 0.8);
            a = bar * (1.0 - gap) * step(floor(g.x), 3.5);
            return vec3(0.42, 0.42, 0.4);
          }
          // A diamond, red over white, a bar across it.
          vec2 q = abs(uv - 0.5) * vec2(2.0, 2.0);
          float d = q.x * 0.6 + q.y;
          a = step(d, 0.95);
          vec3 c = mix(vec3(0.3, 0.03, 0.02), vec3(0.42, 0.42, 0.4), step(uv.y, 0.5));
          return mix(c, vec3(0.02), step(abs(uv.y - 0.5), 0.07) * step(q.x, 0.4) + step(0.82, d));
        }
        void main() {
          float kind = floor(vColor.a * 10.0 + 0.5);
          vec3 n = normalize(vNormalW);
          if (!gl_FrontFacing) n = -n;
          vec3 p = vLocal * 6.0 + vSeed * 40.0;
          float px = length(fwidth(vLocal)) * 6.0;
          // Finer marks fade into their average as they go under a pixel.
          float fine = 1.0 - smoothstep(0.4, 1.2, px);
          float wear = clamp(vColor.g * (0.55 + 0.9 * vSeed.y), 0.0, 1.0);
          float foot = 1.0 - smoothstep(0.04, 0.5, vLocal.y);
          vec3 albedo;
          float gloss = 0.5;
          float dent = 0.0;
          if (kind > 7.5) {
            // Paint (or a plastic's own colour): chipped to the steel,
            // rusting from the foot and where it is worn, streaked down
            // from its rims; a plastic scuffed and grimed, never rusting.
            albedo = paintOf(kind, floor(vSeed.x * 4.0)) * vColor.r;
            float plastic = step(kind, 8.5);
            float field = vn3(p * 0.45) * 0.6 + vn3(p * 1.6) * 0.4;
            // (Rust takes the foot first and creeps up; above it, only a
            // patch here and there where the paint has gone.)
            float edge = 0.79 - 0.36 * foot * wear - 0.06 * wear;
            float rust = (1.0 - plastic) * smoothstep(edge, edge + 0.05, field);
            float chip = (1.0 - plastic) * step(0.91 - 0.05 * wear, vn3(p * 9.0)) * fine;
            float streak = smoothstep(0.55, 0.85, vn3(vec3((vLocal.x + vLocal.z) * 16.0, vLocal.y * 1.4, vSeed.z * 9.0))) * (0.4 + 0.6 * wear);
            vec3 rustCol = vec3(0.12, 0.048, 0.022) * (0.55 + 0.7 * vn3(p * 3.1));
            albedo *= 0.85 + 0.3 * vn3(p * 2.2);
            albedo = mix(albedo, rustCol, rust);
            albedo = mix(albedo, vec3(0.028, 0.026, 0.026), chip * (1.0 - rust) * 0.85);
            albedo *= 1.0 - 0.4 * streak * mix(1.0, 0.5, plastic);
            // A plastic's grime in patches and in scuffs run down it by the
            // rain, so it reads as a solid thing, not a lit shell.
            albedo *= 1.0 - plastic * (0.45 * smoothstep(0.45, 0.8, vn3(p * 0.7 + 5.0)) + 0.25 * smoothstep(0.6, 0.75, vn3(p * vec3(4.0, 0.9, 4.0) + 2.0)) * fine);
            // A barrel's rolling rings stand out of it: the dirt that sits in
            // the angle under each, and the mould's seam up its side.
            float ringDirt = 1.0 - smoothstep(0.0, 0.03 + px * 0.08, min(abs(vLocal.y - 0.18), abs(vLocal.y - 0.6)));
            float seam = (1.0 - smoothstep(0.0, 0.006 + px * 0.02, abs(vLocal.x * 0.8 + vLocal.z * 0.6))) * step(0.0, vLocal.z * 0.8 - vLocal.x * 0.6) * fine;
            albedo *= 1.0 - plastic * (0.5 * ringDirt + 0.25 * seam);
            gloss = mix(0.9, 0.12, rust) * mix(1.0, 0.75, plastic);
            dent = mix(1.0, 0.3, plastic) * (kind > 8.5 && kind < 9.5 ? 1.4 : 1.0);
          } else if (kind > 6.5) {
            albedo = vec3(0.15, 0.055, 0.022) * (0.5 + 0.8 * vn3(p * 2.7)) * vColor.r;
            gloss = 0.08;
          } else if (kind > 5.5) {
            albedo = vec3(0.013, 0.013, 0.014) * (0.8 + 0.4 * vn3(p * 3.0));
            gloss = 0.25;
          } else if (kind > 4.5) {
            // A lid's dark plastic, dusty, some of it green or blue.
            float v = floor(vSeed.z * 5.0);
            albedo = (v < 1.0 ? vec3(0.02, 0.05, 0.03) : v < 2.0 ? vec3(0.02, 0.03, 0.06) : vec3(0.022, 0.022, 0.024)) * (0.8 + 0.5 * vn3(p * 1.7)) * vColor.r;
            gloss = 0.45;
          } else if (kind > 3.5) {
            float a;
            albedo = label(vUv, vSeed.z, px, a);
            // Worn off in places, as a stencil is.
            a *= step(0.25 + 0.3 * wear, vn3(p * 2.4) * 0.7 + 0.3);
            if (a < 0.5) discard;
            albedo *= 0.75 + 0.3 * vn3(p * 3.0);
            gloss = 0.4;
          } else {
            // Galvanised steel: dull, mottled, white where it has bloomed.
            albedo = vec3(0.15, 0.155, 0.16) * vColor.r * (0.7 + 0.5 * vn3(p * 1.9));
            albedo = mix(albedo, vec3(0.2, 0.2, 0.19), smoothstep(0.72, 0.9, vn3(p * 3.3)) * 0.5 * fine);
            albedo = mix(albedo, vec3(0.14, 0.05, 0.02), smoothstep(0.75, 0.9, vn3(p * 0.8 + 3.0)) * wear);
            gloss = 0.5;
            dent = 0.3;
          }
          // Grime up from the ground.
          albedo *= 0.5 + 0.5 * smoothstep(0.0, 0.45, vLocal.y);
          // Dents: the surface pushed about, so the light breaks across it.
          if (dent > 0.0) {
            float h = (vn3(vLocal * 3.2 + vSeed * 20.0) + 0.5 * vn3(vLocal * 7.0 + vSeed * 9.0)) * dent * 0.012 * fine;
            vec3 dx = dFdx(vWorld), dy = dFdy(vWorld);
            vec3 r1 = cross(dy, n), r2 = cross(n, dx);
            float det = dot(dx, r1);
            vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
            n = normalize(abs(det) * n - grad);
          }
          float up = clamp(n.y, 0.0, 1.0);
          bool upright = abs(n.y) < 0.3 && vWorld.y < 7.0;
          vec3 spill = upright ? spillWall(vWorld) : spillAt(vWorld);
          vec3 light = vec3(0.05) * (0.6 + 0.4 * up) + spill * (0.9 + 0.1 * up) + lampsAt(vWorld, n) * 5.0;
          light += (uHazeColor * 0.22 + uGlowColor * 0.12) * uHaze * up * 1.5;
          light += SODIUM * santoAt(vWorld.xz) * uHaze * (0.5 + 0.5 * up) * exp(-max(vWorld.y, 0.0) * 0.02);
          vec3 col = albedo * light;
          // Wet: the lit sky at a glance and a glint of every lamp near it,
          // broken where it is rust.
          vec3 V = normalize(uCam - vWorld);
          vec3 R = reflect(-V, n);
          float F = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
          vec3 skyR = (hazeAt(R) * 1.4 + glowAt(R) * 0.6) * smoothstep(-0.15, 0.35, R.y) * uHaze;
          vec3 glint = vec3(0.0);
          for (int i = 0; i < ${LAMPS}; i++) {
            vec3 d = uLamps[i].xyz - vWorld;
            float d2 = dot(d, d);
            float r2 = uLamps[i].w * uLamps[i].w * 4.0;
            if (d2 > r2) continue;
            glint += uLampColors[i] * pow(max(dot(R, d * inversesqrt(d2)), 0.0), 40.0) * (1.0 - d2 / r2);
          }
          col += (skyR * F + glint + spill * 0.25 * pow(max(-R.y, 0.0), 6.0)) * 0.9 * gloss;
          // A dark shape holds a little of the haze behind it at its edges,
          // and the rain on what faces the sky holds the lit cloud, as a
          // roof's does: seen from over it, it is not a hole in the roof.
          float rim = pow(1.0 - abs(dot(V, n)), 3.0);
          col += (uHazeColor * 0.22 + uGlowColor * 0.12) * uHaze * 4.0 * up * (0.045 + 0.5 * rim) * gloss * 2.0;
          col += (hazeAt(-V) * 1.5 + glowAt(-V) * 0.45) * rim * 0.5 * uHaze * (1.0 - up) * smoothstep(12.0, 50.0, length(uCam - vWorld));
          col = cityFog(col, vWorld, 0.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      side: THREE.DoubleSide,
    });
    return m;
  };

  // A print is a face that is no light: the same drawing, kept out of the
  // bake.
  const makers = { plant, face, print: face, halo, paper, worn };
  // The ones that read each instance's deal (the attribute aDeal), and the
  // ones whose shader reads it, dealt or not (a print is a face's shader).
  const DEALT = ["paper", "face"];
  const READS = ["paper", "face", "print"];
  // How strongly a lit face of the props' own lights the street (the bake).
  const LIGHT = { face: 0.33, paper: 0.9, tube: 0.8 };
  const clean = (name) => name.replace(/^NCW_/, "").replace(/\.\d+$/, "");
  return {
    forName(name) {
      const n = clean(name);
      if (!makers[n]) return null;
      if (!made.has(n)) made.set(n, Object.assign(makers[n](), { name: n, userData: { dealt: DEALT.includes(n), reads: READS.includes(n) } }));
      return made.get(n);
    },
    /** The light a part of that material gives the street, or 0. */
    light(name, prototype) {
      const n = clean(name);
      // Only the new amber bench strips join the bake. The side-wall
      // tubes keep the room balance already supplied by the city kit.
      if (n === "tube" && prototype !== "garage_bench_strip") return 0;
      return LIGHT[n] ?? 0;
    },
    /**
     * And of an instance of it, by its deal: which light it is one of
     * (`key`), its colour (linear; null for the part's own) and how much of
     * the material's light it gives; null for none.
     */
    lightOf(name, deal) {
      if (clean(name) === "tube") return ONE;
      if (clean(name) !== "paper") return FRONTS[Math.floor(deal)] ?? ONE;
      return PAPER_LIGHTS[Math.floor(deal)] ?? null;
    },
    dispose() {
      for (const m of made.values()) m.dispose();
    },
  };
}
