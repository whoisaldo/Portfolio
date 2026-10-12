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
// its mark, what is on its shelves. Far off it is its own average.
//
// The builder (scripts/blender/ncw/props.py) names the material `plant`;
// the vertex colour is the part's own colour and its alpha what it is: 1 a
// frond (u across it, v from the crown to its tip), 0.75 a blossom pad (uv
// from its middle out to its rim), 0.5 a palm's bark, 0.25 a tree's. A
// `face` is a quad, uv 0 to 1 across and up it; its vertex colour is the
// light it gives the street (the bake's) and says warm or cool, the alpha
// which face: 1 a vending machine's front (0.96 by 1.95 m). A `print` is
// the same, unlit: 0.75 a lamp's banner (0.6 by 1.6 m). A `halo` is a
// lamp's light in the wet air (src/world/shafts.js): a quad in the lamp's
// own plane through its head, turned here about the lamp's axis to face
// the eye; its uv is metres across and metres below the head, its colour
// the lamp's and the alpha a tenth of how many metres the light falls.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { LAMP_AIR } from "./shafts.js";

const SHARED = [...COMMON.matchAll(/uniform \w+ (\w+)/g)].map((m) => m[1]);

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
        varying vec3 vLocal;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vec4 w = m * vec4(position, 1.0);
          vWorld = w.xyz;
          vNormalW = normalize(mat3(m) * normal);
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
        varying vec3 vLocal;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          // glTF counts v down from 1.
          vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
          vec3 albedo = vColor.rgb;
          float thin = 0.0;
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
            thin = 0.7;
          } else if (vColor.a > 0.6) {
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
          } else if (vColor.a > 0.4) {
            // A palm's bark: a scar round the trunk where each old frond
            // let go.
            float rings = vLocal.y * 7.0;
            float close = 1.0 - smoothstep(0.3, 0.8, fwidth(rings));
            float scar = 1.0 - smoothstep(0.0, 0.35, fract(rings));
            albedo *= mix(1.0, (1.0 - 0.45 * scar) * (0.8 + 0.4 * hash12(vec2(floor(rings), 1.7))), close);
          } else {
            // A tree's: furrows running up it.
            float furrow = hash12(vec2(floor(vUv.x * 18.0), floor(vLocal.y * 1.3)));
            albedo *= mix(1.0, 0.6 + 0.7 * furrow, 1.0 - smoothstep(0.2, 0.6, fwidth(vUv.x * 18.0)));
          }
          vec3 n = normalize(vNormalW);
          if (!gl_FrontFacing) n = -n;
          float up = n.y;
          // The lamps in the planter, from below: on the trunk, and under
          // the crown.
          float h = max(vLocal.y, 0.0);
          vec3 lamp = vec3(1.0, 0.76, 0.48) * (0.42 / (1.0 + h * h * 0.05)) * mix(1.0, 0.3 + 0.5 * clamp(-up, 0.0, 1.0), step(0.01, thin));
          vec3 light = vec3(0.04) * (0.7 + 0.3 * up) + spillAt(vWorld) * (0.75 + 0.3 * thin) + lamp;
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
        uniform vec3 uCam;
        varying vec3 vWorld;
        varying vec3 vView;
        varying vec2 vUv;
        varying vec4 vColor;
        varying float vSeed;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vec4 w = m * vec4(position, 1.0);
          vWorld = w.xyz;
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
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        varying vec3 vWorld;
        varying vec3 vView;
        varying vec2 vUv;
        varying vec4 vColor;
        varying float vSeed;
        float rect(vec2 p, vec2 lo, vec2 hi) {
          vec2 s = step(lo, p) * step(p, hi);
          return s.x * s.y;
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
        void main() {
          // glTF counts v down from 1.
          vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
          vec3 spill = spillAt(vWorld);
          vec3 col = vec3(0.0);
          float lit = 0.0;
          if (vColor.a < 0.9) {
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
            vec2 q = floor(fract(gp) * 5.0);
            float stroke = step(0.5, hash12(vec2(min(q.x, 4.0 - q.x), q.y) + floor(gp.y) * 7.0 + floor(vSeed * 50.0))) * step(0.5, q.y) * step(q.y, 3.5);
            cloth = mix(cloth, pale, mix(0.22, stroke, near) * rect(gp, vec2(0.0), vec2(1.0, 4.0)));
            cloth = mix(cloth, other * 0.3, step(b.y, 0.16));
            cloth *= 0.6 + 0.4 * step(0.03, b.y) * step(b.y, 1.57);
            col = cloth * (vec3(0.07) + spill * 1.5);
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
            vec3 shade = vec3(0.06) + spill * 1.2;
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

  // A print is a face that is no light: the same drawing, kept out of the
  // bake.
  const makers = { plant, face, print: face, halo };
  // How strongly a lit face of the props' own lights the street (the bake).
  const LIGHT = { face: 0.33 };
  const clean = (name) => name.replace(/^NCW_/, "").replace(/\.\d+$/, "");
  return {
    forName(name) {
      const n = clean(name);
      if (!makers[n]) return null;
      if (!made.has(n)) made.set(n, Object.assign(makers[n](), { name: n }));
      return made.get(n);
    },
    /** The light a part of that material gives the street, or 0. */
    light(name) {
      return LIGHT[clean(name)] ?? 0;
    },
    dispose() {
      for (const m of made.values()) m.dispose();
    },
  };
}
