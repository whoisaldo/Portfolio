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
//   shop     a lit ground floor: warm interiors, a few in the world's neon.
//   neon     tubes, strips and panels: flat HDR colour for the bloom to find,
//            breathing with the kick while the track plays, a few flickering.
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

  const shop = () => {
    if (made.has("shop")) return made.get("shop");
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
          // vColor: brightness, hue, open. Most shops are warm; a few are
          // the world's neon inside.
          float h = vColor.g;
          vec3 c = vec3(1.0, 0.62, 0.32);
          if (h > 0.5) c = vec3(1.0, 0.46, 0.22);
          if (h > 0.72) c = vec3(1.0, 0.28, 0.5);
          if (h > 0.86) c = vec3(0.3, 0.8, 1.0);
          if (h > 0.94) c = vec3(1.0, 0.18, 0.2);
          float along = (vWorld.x + vWorld.z) * 1.3;
          // Interiors: shelves and counters in bands, a lamp near the top,
          // the odd figure against the light.
          float bay = floor(along);
          float shelf = 0.55 + 0.45 * step(0.35, fract(vUv.y * 4.0 + hash12(vec2(bay, 1.0)) * 0.5));
          float lamp = 0.4 + 0.9 * smoothstep(0.55, 1.0, vUv.y) * (0.6 + 0.4 * hash12(vec2(bay, 4.0)));
          float figure = 1.0 - 0.7 * step(0.86, hash12(vec2(floor(along * 2.1), 3.0))) * step(vUv.y, 0.62);
          float dim = 0.2 + 0.8 * hash12(vec2(bay, 7.0));
          vec3 col = c * (0.12 + 0.55 * vColor.r) * shelf * lamp * figure * dim * vColor.b;
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
      case "shop": return shop();
      case "lantern": return neon("lantern", "#ff4a2a", { intensity: 2.2, flicker: 0 });
      case "sidewalk": return surface("sidewalk", { color: "#6d6f74", map: maps.sidewalk, ambient: 0.035, spill: 1.1 });
      case "concrete": return surface("concrete", { color: "#6a6c71", map: maps.concrete, ambient: 0.03 });
      case "kerb": return surface("kerb", { color: "#4a4c52", ambient: 0.03 });
      case "paint": return surface("paint", { color: "#b9b7ae", ambient: 0.05, spill: 1.3 });
      case "metal": return surface("metal", { color: "#2d3036", ambient: 0.035 });
      case "dark": return surface("dark", { color: "#0e0f12", ambient: 0.02, spill: 0.6 });
      case "roof": return surface("roof", { color: "#15161a", ambient: 0.025, spill: 0.5 });
      case "board_frame": return surface("board_frame", { color: "#1a1b1f", ambient: 0.03 });
      case "door": return surface("door", { color: "#2a2d33", ambient: 0.04 });
      case "garage_floor": return surface("garage_floor", { color: "#3a3c40", ambient: 0.04, spill: 1.4 });
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
