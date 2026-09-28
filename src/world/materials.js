// src/world/materials.js: what every surface in the city is made of.
//
// The Blender kit names its materials (NCW_facade, NCW_asphalt,
// NCW_neon_pink...) and this is where the names become shaders. None of them
// is a lit PBR material: see src/world/glsl.js for why the light comes from a
// map of the city's own emissive geometry instead of from lights.
//
//   facade   the window shader. The kit's UVs are in window cells (one u per
//            bay, one v per storey) and its colour attribute carries each
//            building's lit fraction, window style and warmth, so five
//            window types and a thousand lit rooms cost one draw per
//            district and no texture at all. Past about two pixels a cell
//            fades to its own average rather than shimmering.
//   shop     a lit ground floor: a room behind every bay of glass, with
//            depth (interior mapping over eight photographed rooms).
//   awning   dyed cloth over a shop, lit through from underneath.
//   lantern  a red paper lantern, hot through its belly.
//   neon     tubes, strips and panels: flat HDR colour for the bloom to find,
//            breathing with the kick while the track plays, a few flickering.
//   painted  the avenue's and the canyon's walls: an original night elevation
//            (balconies, laundry, AC units, lit rooms) as colour and light at
//            once. The lit windows keep their glow and lift a little for the
//            bloom; the dark wall between takes the signs' spill, so a pink
//            sign turns the concrete under it pink.
//   surface  everything else: paint, concrete, metal, roofs, lit by the spill.
import * as THREE from "three";
import { COMMON, VERT_WORLD, VERT_WORLD_COLOR, WINDOWS } from "./glsl.js";

/** The world's own neon, as the plate uses it. */
export const NEON = {
  pink: "#ff2e88", magenta: "#ff3fd2", cyan: "#27dcf2", teal: "#2ee6c8",
  blue: "#2f6bff", amber: "#ffb254", red: "#ff003c", green: "#39ff9a",
  white: "#eceae4", purple: "#a24bff", yellow: "#fcee0a",
};

const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

export function createMaterialKit(shared, { maps = {}, reduced = false } = {}) {
  const made = new Map();
  const all = [];
  const keep = (m) => {
    all.push(m);
    return m;
  };

  const surface = (key, { color = "#444444", map = null, ambient = 0.03, spill = 1, rough = 1 } = {}) => {
    if (made.has(key)) return made.get(key);
    const m = keep(new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uColor: { value: new THREE.Color(color) },
        uMap: { value: map },
        uHasMap: { value: map ? 1 : 0 },
        uAmbient: { value: ambient },
        uSpillMul: { value: spill },
        uGloss: { value: rough },
      },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uColor;
        uniform sampler2D uMap;
        uniform float uHasMap;
        uniform float uAmbient;
        uniform float uSpillMul;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          vec3 albedo = uColor;
          if (uHasMap > 0.5) albedo *= texture2D(uMap, vUv).rgb * 2.0;
          vec3 n = normalize(vNormalW);
          float up = clamp(n.y, 0.0, 1.0);
          vec3 light = vec3(uAmbient) * (0.6 + 0.4 * up) + spillAt(vWorld) * uSpillMul * (0.55 + 0.45 * up);
          vec3 col = albedo * light;
          col = cityFog(col, vWorld, 0.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = key;
    made.set(key, m);
    return m;
  };

  const painted = (key, map) => {
    if (made.has(key)) return made.get(key);
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uMap: { value: map }, uGain: { value: 1.05 } },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uMap;
        uniform float uGain;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          vec3 tex = texture2D(uMap, vUv).rgb;
          float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
          // Lit rooms stay light and push past the bloom's threshold; the
          // concrete between them is lit by the street.
          float room = smoothstep(0.12, 0.45, lum);
          vec3 col = tex * uGain * (0.9 + 1.6 * room * room);
          col += tex * spillAt(vWorld) * 2.2 * (1.0 - room) + spillAt(vWorld) * 0.02;
          col = cityFog(col, vWorld, room * 0.7);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = key;
    made.set(key, m);
    return m;
  };

  const facade = () => {
    if (made.has("facade")) return made.get("facade");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uWindows: { value: 1 } },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        ${WINDOWS}
        uniform float uWindows;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          vec4 w = windows(vUv, vColor.rgb, vWorld, uWindows);
          vec3 col = cityFog(w.rgb, vWorld, w.a * 0.7);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "facade";
    made.set("facade", m);
    return m;
  };

  // A shop, seen through its glass. Behind each 3.2 m bay is a room, traced
  // in the fragment (interior mapping): the eye's ray runs into a box as
  // wide as the bay, as tall as the glass and as deep as it is wide, and the
  // point it reaches (back wall, side wall, floor or ceiling) is projected
  // back onto one of eight photographs of a room taken straight on (an
  // original generated set, see the design README), which is exactly how
  // those photographs were taken. So the room has depth and parallax, and a
  // passing camera sees along its shelves, for one texture read. vColor
  // carries the shop's brightness, its hue and whether it is open; a closed
  // one shows its roller shutter.
  const shop = () => {
    if (made.has("shop")) return made.get("shop");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uShops: { value: maps.shops ?? null }, uHasShops: { value: maps.shops ? 1 : 0 } },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uShops;
        uniform float uHasShops;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        const float BAY = 3.2;
        const float GLASS = 2.75;
        const float SILL = 0.55;
        const float DEPTH = 3.2;
        // The photographs' own camera: as far in front of the glass as the
        // room is deep, so the back wall fills the middle half of each.
        const float LENS = 3.2;
        vec3 tint(float h) {
          vec3 c = vec3(1.0, 0.64, 0.34);
          if (h > 0.5) c = vec3(1.0, 0.5, 0.26);
          if (h > 0.72) c = vec3(1.0, 0.36, 0.56);
          if (h > 0.86) c = vec3(0.36, 0.82, 1.0);
          return c;
        }
        void main() {
          if (abs(vNormalW.y) > 0.5) {
            gl_FragColor = vec4(cityFog(vec3(0.01), vWorld, 0.0), 1.0);
            ${OUT}
            return;
          }
          vec3 n = normalize(vec3(vNormalW.x, 0.0, vNormalW.z));
          // Along the facade, left to right as the street sees it.
          vec3 t = vec3(n.z, 0.0, -n.x);
          float u = dot(vWorld, t);
          float bay = floor(u / BAY);
          float bu = fract(u / BAY) * BAY;
          float y = vWorld.y;
          float face = floor(dot(vWorld, n) * 0.25);
          float seed = hash12(vec2(bay * 1.37 + face, vColor.g * 91.0));
          float power = (0.45 + 0.55 * vColor.r) * (0.6 + 0.4 * hash12(vec2(bay, 7.0 + face)));
          vec3 V = normalize(vWorld - uCam);
          float facing = abs(dot(V, n));

          // Into the room: x along the bay, y up the glass, z in from it.
          vec3 d = vec3(dot(V, t), V.y, max(-dot(V, n), 1e-3));
          vec3 p = vec3(bu, clamp(y - SILL, 0.0, GLASS), 0.0);
          float tx = d.x > 0.0 ? (BAY - p.x) / d.x : -p.x / min(d.x, -1e-4);
          float ty = d.y > 0.0 ? (GLASS - p.y) / d.y : -p.y / min(d.y, -1e-4);
          float tz = DEPTH / d.z;
          vec3 h = p + d * min(min(tx, ty), tz);
          float k = LENS / (LENS + h.z);
          vec2 ruv = vec2(0.5 + (h.x / BAY - 0.5) * k, 0.5 - (h.y / GLASS - 0.5) * k);
          float which = floor(hash12(vec2(bay * 2.71 + face, 3.0)) * 8.0);
          vec2 cell = vec2(mod(which, 4.0), floor(which / 4.0));
          vec3 room = texture2D(uShops, (cell + clamp(ruv, 0.004, 0.996)) / vec2(4.0, 2.0)).rgb;
          room = mix(tint(vColor.g) * 0.3, room, uHasShops);

          vec3 col;
          if (vColor.b < 0.5) {
            // Shut: a roller shutter, its ribs catching the street's light.
            float rib = 0.6 + 0.4 * smoothstep(0.2, 0.8, fract(y * 12.5));
            col = (vec3(0.018, 0.018, 0.022) + spillAt(vWorld) * 0.12) * rib;
          } else {
            col = room * power * 1.5;
            // Now and then somebody standing at the window, against the light.
            float zf = mix(0.5, 1.4, hash12(vec2(bay, 5.0 + face)));
            vec3 f = p + d * (zf / d.z);
            float fx = f.x - mix(0.7, BAY - 0.7, hash12(vec2(bay, 6.0 + face)));
            float fy = f.y + SILL;
            float body = step(abs(fx), 0.21 - 0.05 * smoothstep(1.05, 1.45, fy)) * step(fy, 1.48);
            float head = step(length(vec2(fx, fy - 1.63)), 0.11);
            col = mix(col, col * 0.05, max(body, head) * step(seed, 0.28));
            // Mullions at the bay's ends and its middle, and a transom rail.
            float frame = max(step(bu, 0.06) + step(BAY - 0.06, bu) + step(abs(bu - BAY * 0.5), 0.025), step(abs(y - 2.8), 0.035));
            col = mix(col, vec3(0.012), clamp(frame, 0.0, 1.0));
          }
          // The glass: at a glancing angle it gives back the street.
          float fres = pow(1.0 - facing, 4.0);
          col = col * (1.0 - 0.55 * fres) + spillAt(vWorld) * (0.03 + 0.4 * fres);
          col = cityFog(col, vWorld, 0.8);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "shop";
    made.set("shop", m);
    return m;
  };

  // An awning: dyed cloth (the vertex colour) lit through from the shop
  // under it, darkest at the wall and brightest along its hem.
  const awning = () => {
    if (made.has("awning")) return made.get("awning");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          float under = step(vNormalW.y, 0.0);
          float hem = smoothstep(0.55, 1.0, vUv.x);
          // Stripes in the weave, a bay's worth apart.
          float stripe = 0.8 + 0.2 * step(0.5, fract((vWorld.x + vWorld.z) * 1.25));
          vec3 dye = vColor.rgb;
          vec3 col = dye * mix(0.05, 0.42, under) * (0.45 + 0.9 * hem) * stripe;
          col += dye * spillAt(vWorld) * 0.35;
          col = cityFog(col, vWorld, 0.6);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "awning";
    made.set("awning", m);
    return m;
  };

  // A paper lantern: hot through its belly, dim at the rims, the paper's
  // ribs in the glow, and a dark cap. The kit's cylinder runs v up its side
  // half a unit a metre, so a 0.56 m lantern is 0.28 of v, and glTF counts
  // v down from 1.
  const lantern = () => {
    if (made.has("lantern")) return made.get("lantern");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uColor: { value: new THREE.Color("#ff4a2a") } },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uColor;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          float t = clamp((1.0 - vUv.y) / 0.28, 0.0, 1.0);
          float belly = sin(3.14159 * t);
          float ribs = 0.8 + 0.2 * cos(t * 3.14159 * 14.0);
          vec3 col = uColor * (0.2 + 2.6 * belly * belly) * ribs * (1.0 + 0.3 * uBass);
          col += vec3(1.0, 0.75, 0.4) * pow(belly, 6.0) * 0.8;
          col *= 1.0 - 0.9 * step(0.5, abs(vNormalW.y));
          col = cityFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "lantern";
    made.set("lantern", m);
    return m;
  };

  const neon = (key, hex, { intensity = 2.4, flicker = 0 } = {}) => {
    if (made.has(key)) return made.get(key);
    const m = keep(new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uColor: { value: new THREE.Color(hex) },
        uIntensity: { value: intensity },
        uFlicker: { value: reduced ? 0 : flicker },
        uSeed: { value: Math.random() * 100 },
        uLit: { value: 1 },
      },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uFlicker;
        uniform float uSeed;
        uniform float uLit;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          // Neon does not fade, it cuts: a tube that is not quite right
          // drops out for a frame or two, seeded per colour and per place.
          float t = floor(uTime * 12.0);
          float cut = step(0.992, hash12(vec2(t, floor(vWorld.x * 0.3 + vWorld.z * 0.2) + uSeed))) * uFlicker;
          float breathe = 1.0 + 0.45 * uBass + 0.15 * uLevel;
          vec3 col = uColor * uIntensity * breathe * (1.0 - 0.8 * cut) * uLit;
          col = cityFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = key;
    made.set(key, m);
    return m;
  };

  /** The material for a GLB material name, or null to leave it alone. */
  const forName = (name) => {
    const n = name.replace(/^NCW_/, "").replace(/\.\d+$/, "");
    if (n.startsWith("neon_")) {
      const hue = n.slice(5);
      return neon(n, NEON[hue] || "#ffffff", { flicker: hue === "white" || hue === "amber" ? 0 : 1 });
    }
    switch (n) {
      case "facade": return facade();
      case "facade_t0":
      case "facade_t1":
      case "facade_t2": return maps[n] ? painted(n, maps[n]) : facade();
      case "shop": return shop();
      case "awning": return awning();
      case "lantern": return lantern();
      case "sidewalk": return surface("sidewalk", { color: "#6d6f74", map: maps.sidewalk, ambient: 0.035, spill: 1.1 });
      case "concrete": return surface("concrete", { color: "#6a6c71", map: maps.concrete, ambient: 0.03 });
      case "garage_wall": return surface("garage_wall", { color: "#7c7e84", map: maps.concrete, ambient: 0.07, spill: 2.2 });
      case "kerb": return surface("kerb", { color: "#4a4c52", ambient: 0.03 });
      case "paint": return surface("paint", { color: "#b9b7ae", ambient: 0.05, spill: 1.3 });
      case "metal": return surface("metal", { color: "#2d3036", ambient: 0.035 });
      case "dark": return surface("dark", { color: "#0e0f12", ambient: 0.02, spill: 0.6 });
      case "roof": return surface("roof", { color: "#15161a", ambient: 0.025, spill: 0.5 });
      case "board_frame": return surface("board_frame", { color: "#1a1b1f", ambient: 0.03 });
      case "door": return surface("door", { color: "#2a2d33", ambient: 0.04 });
      case "garage_floor": return surface("garage_floor", { color: "#56585e", ambient: 0.09, spill: 2.6 });
      case "glass_dark": return surface("glass_dark", { color: "#0d1418", ambient: 0.02 });
      default: return null;
    }
  };

  return {
    forName,
    neon,
    surface,
    all: () => all,
    dispose() {
      all.forEach((m) => m.dispose());
    },
  };
}
