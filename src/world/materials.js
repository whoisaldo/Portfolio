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
//   corporate  corpo row's glass: whole office floors lit behind mullions,
//            the city's glow in the glass; lobby, the lit ground floor.
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
import { createWetFloor } from "./wet.js";

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

  const painted = (key, map, { tiled = true } = {}) => {
    if (made.has(key)) return made.get(key);
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uMap: { value: map }, uGain: { value: 1.05 } },
      defines: tiled ? { TILED: "" } : {},
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uMap;
        uniform float uGain;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          // Each tile of the elevation a block's own: every other one
          // mirrored and some a floor or two darker, so a long wall is not
          // one building printed over and over. Far off, the picture is
          // read from a smaller level and its rooms stop reaching for the
          // bloom, or a whole block becomes a grid of lit dots. A wall that
          // is one picture (the garage's) is not tiled.
          vec2 uv = vUv;
          #ifdef TILED
          vec2 tile = floor(vUv);
          if (hash12(tile + 3.1) > 0.5) uv.x = tile.x + 1.0 - fract(vUv.x);
          #endif
          float far = smoothstep(90.0, 260.0, length(vWorld - uCam));
          vec2 grad = vec2(fwidth(vUv.x), fwidth(vUv.y)) * exp2(far * 1.5);
          vec3 tex = textureGrad(uMap, uv, vec2(grad.x, 0.0), vec2(0.0, grad.y)).rgb;
          #ifdef TILED
          tex *= mix(1.0, 0.62, step(0.66, hash12(tile + 7.7)));
          #endif
          float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
          // Lit rooms stay light and push past the bloom's threshold; the
          // concrete between them is lit by the street.
          float room = smoothstep(0.12, 0.45, lum);
          float lit = 1.0;
          #ifndef TILED
          // The garage's walls are its room with the lights on: dark until
          // its tubes strike (src/world/garage.js), catching with them.
          float catching = step(0.5, hash12(vec2(floor(uTubeClock * 20.0), 7.0)));
          lit = step(0.0, uTubeClock) * (uTubeClock > 0.6 ? 1.0 : catching * smoothstep(0.0, 0.6, uTubeClock));
          #endif
          vec3 col = tex * uGain * lit * (0.9 + 1.6 * room * room * (1.0 - 0.8 * far));
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
          float fres = pow(max(1.0 - facing, 0.0), 4.0);
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

  // A glass tower's curtain wall, drawn from world position: floors 3.8 m
  // apart over an 8 m lobby, a dark spandrel at each slab, mullions every
  // 1.5 m, and behind the glass whole floors lit or dark, as office towers
  // are at night: open plan under cool ceiling light, a few warm, the odd
  // room with its blinds down. The glass gives back the lit city's glow, most
  // at a glancing angle. vColor: lit fraction, warmth, seed.
  const corporate = () => {
    if (made.has("corporate")) return made.get("corporate");
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
          vec3 n = normalize(vNormalW);
          vec3 t = vec3(n.z, 0.0, -n.x);
          float module = dot(vWorld, t) / 1.5;
          float fy = (vWorld.y - 8.0) / 3.8;
          float level = floor(fy);
          float fv = fract(fy);
          float mid = floor(module);
          float seed = vColor.b * 97.0 + floor(dot(vWorld, n) * 0.07) * 13.0;
          float on = step(hash12(vec2(level, seed)), vColor.r);
          float warmth = step(1.0 - 0.3 * vColor.g, hash12(vec2(level, seed + 3.0)));
          vec3 light = mix(vec3(0.66, 0.84, 1.0), vec3(1.0, 0.78, 0.52), warmth);
          // A lit floor: the row of fixtures under the ceiling, the room's
          // glow under it, desks and the odd person against the light, the
          // screens on the desks, and zones of it switched off.
          float fixtures = smoothstep(0.82, 0.86, fv) * smoothstep(0.93, 0.89, fv);
          float glow = 0.1 + 0.3 * smoothstep(0.25, 0.9, fv);
          float zone = floor(mid / 3.0);
          float lights = step(0.25, hash12(vec2(zone, level + seed * 5.0)));
          float desks = step(0.26, fv) * step(fv, 0.4) * step(0.35, hash12(vec2(mid * 2.3, level + seed)));
          float screen = desks * step(0.8, hash12(vec2(floor(module * 3.0), level + seed * 2.0)));
          vec3 col = light * on * lights * (glow + 1.05 * fixtures) * (1.0 - 0.7 * desks);
          col += vec3(0.55, 0.8, 1.0) * screen * on * 1.2;
          // Slabs and mullions, faded to their average where they would
          // shimmer.
          float fw = fwidth(fy);
          float slab = mix(step(fv, 0.2), 0.2, clamp(fw * 3.0, 0.0, 1.0));
          float mw = fwidth(module);
          float mull = mix(step(fract(module), 0.04) + step(0.96, fract(module)), 0.08, clamp(mw * 3.0, 0.0, 1.0));
          col = mix(col, vec3(0.012, 0.014, 0.02), clamp(slab + mull, 0.0, 1.0));
          // The glass: the city's glow, most at a glancing angle.
          vec3 V = normalize(vWorld - uCam);
          vec3 R = reflect(V, n);
          float fres = 0.05 + 0.95 * pow(1.0 - abs(dot(V, n)), 5.0);
          vec3 sky = cityGlow(R, max(R.y, 0.0) * 900.0) + vec3(0.008, 0.01, 0.018);
          col = col * (1.0 - 0.6 * fres) + sky * fres * (1.0 - 0.5 * slab);
          col += spillAt(vWorld) * 0.2;
          col = cityFog(col, vWorld, on * 0.6);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "corporate";
    made.set("corporate", m);
    return m;
  };

  // A tower's lobby: a double-height glass box, bright under its ceiling,
  // the floor shining, mullions every 2 m and a transom.
  const lobby = () => {
    if (made.has("lobby")) return made.get("lobby");
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
          vec3 n = normalize(vNormalW);
          vec3 t = vec3(n.z, 0.0, -n.x);
          float mu = fract(dot(vWorld, t) / 2.0);
          float h = clamp((vWorld.y - 0.15) / 7.85, 0.0, 1.0);
          vec3 light = mix(vec3(0.86, 0.93, 1.0), vec3(1.0, 0.84, 0.64), step(0.6, vColor.g));
          vec3 col = light * (0.22 + 1.1 * smoothstep(0.62, 1.0, h) + 0.35 * smoothstep(0.18, 0.0, h));
          float frame = step(mu, 0.02) + step(0.98, mu) + step(abs(h - 0.56), 0.012);
          col = mix(col, vec3(0.015), clamp(frame, 0.0, 1.0));
          col = cityFog(col, vWorld, 0.8);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "lobby";
    made.set("lobby", m);
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

  // The garage's tubes: neon's flat HDR colour (each tube's own, on its
  // vertices), dark until the camera turns to the door (uTubeClock,
  // src/world/garage.js), then struck on a fixture at a time, the way
  // fluorescents are: a flash or two, then steady.
  const tube = () => {
    if (made.has("tube")) return made.get("tube");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uIntensity: { value: 2.4 } },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uIntensity;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          vec3 tint = vColor.rgb;
          vec2 fixture = floor(vWorld.xz / vec2(4.0, 3.0));
          float t = uTubeClock - hash12(fixture + 3.7) * 0.9;
          float strike = step(0.5, hash12(vec2(floor(t * 20.0), fixture.x * 7.0 + fixture.y)));
          float on = step(0.0, uTubeClock) * step(0.0, t) * (t > 0.42 ? 1.0 : strike * 0.85);
          float breathe = 1.0 + 0.3 * uBass + 0.1 * uLevel;
          vec3 col = tint * uIntensity * on * breathe + tint * 0.03;
          col = cityFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "tube";
    made.set("tube", m);
    return m;
  };

  // The two floors that trace what glows over them (src/world/wet.js);
  // city.js hands them their rectangles once the signs are made.
  const wet = {};
  const wetFloor = (kind) => {
    if (!wet[kind]) {
      wet[kind] = createWetFloor(shared, { kind, reduced });
      keep(wet[kind].material);
    }
    return wet[kind];
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
      case "corporate": return corporate();
      case "lobby": return lobby();
      case "awning": return awning();
      case "lantern": return lantern();
      case "sidewalk": return surface("sidewalk", { color: "#6d6f74", map: maps.sidewalk, ambient: 0.035, spill: 1.1 });
      case "concrete": return surface("concrete", { color: "#6a6c71", map: maps.concrete, ambient: 0.03 });
      case "garage_wall": return surface("garage_wall", { color: "#7c7e84", map: maps.concrete, ambient: 0.07, spill: 2.2 });
      case "garage_wall_back":
      case "garage_wall_magenta":
      case "garage_wall_cyan": return maps[n] ? painted(n, maps[n], { tiled: false }) : forName("garage_wall");
      case "kerb": return surface("kerb", { color: "#4a4c52", ambient: 0.03 });
      case "paint": return surface("paint", { color: "#b9b7ae", ambient: 0.05, spill: 1.3 });
      case "metal": return surface("metal", { color: "#2d3036", ambient: 0.035 });
      case "dark": return surface("dark", { color: "#0e0f12", ambient: 0.02, spill: 0.6 });
      case "roof": return surface("roof", { color: "#15161a", ambient: 0.025, spill: 0.5 });
      case "board_frame": return surface("board_frame", { color: "#1a1b1f", ambient: 0.03 });
      case "door": return surface("door", { color: "#2a2d33", ambient: 0.04 });
      case "garage_floor": return wetFloor("garage").material;
      case "roof_wet": return wetFloor("roof").material;
      case "tube": return tube();
      case "tool_red": return surface("tool_red", { color: "#7a2028", ambient: 0.06, spill: 2.0 });
      case "hazard": return surface("hazard", { color: "#d8ab22", ambient: 0.07, spill: 1.8 });
      case "glass_dark": return surface("glass_dark", { color: "#0d1418", ambient: 0.02 });
      default: return null;
    }
  };

  return {
    forName,
    neon,
    surface,
    wet,
    all: () => all,
    dispose() {
      all.forEach((m) => m.dispose());
    },
  };
}
