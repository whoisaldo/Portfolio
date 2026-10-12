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
// The builder (scripts/blender/ncw/props.py) names the material `plant`;
// the vertex colour is the part's own colour and its alpha what it is: 1 a
// frond (u across it, v from the crown to its tip), 0.75 a blossom pad (uv
// from its middle out to its rim), 0.5 a palm's bark, 0.25 a tree's.
import * as THREE from "three";
import { COMMON } from "./glsl.js";

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
    m.name = "plant";
    return m;
  };

  const makers = { plant };
  return {
    forName(name) {
      const n = name.replace(/^NCW_/, "").replace(/\.\d+$/, "");
      if (!makers[n]) return null;
      if (!made.has(n)) made.set(n, makers[n]());
      return made.get(n);
    },
    dispose() {
      for (const m of made.values()) m.dispose();
    },
  };
}
