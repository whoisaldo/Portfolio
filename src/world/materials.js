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
import { COMMON, LAMPS, VERT_WORLD, VERT_WORLD_COLOR, WINDOWS } from "./glsl.js";
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

  const surface = (key, { color = "#444444", map = null, ambient = 0.03, spill = 1, rough = 1, detail = false } = {}) => {
    if (made.has(key)) return made.get(key);
    const m = keep(new THREE.ShaderMaterial({
      defines: detail ? { DETAIL: "" } : {},
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
        #ifdef DETAIL
        float vn(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
                     mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        // Weathered plant in world space, no texture: sheet panels with
        // their seams, rain grime run down the sides from every seam and
        // edge, and a fine speckle, all faded where they would shimmer.
        float weather(vec3 p, vec3 n) {
          vec3 a = abs(n);
          vec2 q = a.y > 0.6 ? p.xz : (a.x > a.z ? p.zy : p.xy);
          vec2 cell = q / vec2(0.9, 0.6);
          vec2 f = abs(fract(cell) - 0.5);
          float aa = clamp(max(fwidth(cell.x), fwidth(cell.y)) * 2.0, 0.0, 1.0);
          float seam = mix(smoothstep(0.47, 0.5, max(f.x, f.y)), 0.1, aa);
          float grime = a.y > 0.6 ? 0.0 : vn(vec2(q.x * 7.0, q.y * 0.5)) * smoothstep(0.25, 0.0, fract(cell.y) - 0.1);
          float speck = mix(vn(q * 23.0), 0.5, aa);
          float panel = hash12(floor(cell) + 3.7);
          return (0.8 + 0.3 * panel) * (1.0 - 0.45 * seam) * (1.0 - 0.35 * grime) * (0.85 + 0.3 * speck);
        }
        #endif
        void main() {
          vec3 albedo = uColor;
          if (uHasMap > 0.5) albedo *= texture2D(uMap, vUv).rgb * 2.0;
          vec3 n = normalize(vNormalW);
          #ifdef DETAIL
          float wear = weather(vWorld, n);
          albedo *= wear;
          #endif
          float up = clamp(n.y, 0.0, 1.0);
          vec3 light = vec3(uAmbient) * (0.6 + 0.4 * up) + spillAt(vWorld) * uSpillMul * (0.55 + 0.45 * up) + lampsAt(vWorld, n) * 5.0;
          // What faces the sky catches the city's glow on the cloud.
          light += (uHazeColor * 0.22 + uGlowColor * 0.12) * up * uHaze;
          vec3 col = albedo * light;
          // And at a grazing angle every edge holds a little of the haze
          // behind it, so a dark shape stands off the dark behind it.
          float rim = pow(1.0 - abs(dot(normalize(uCam - vWorld), n)), 3.0);
          col += (uHazeColor * 1.5 + uGlowColor * 0.45) * rim * 0.5 * uHaze * (1.0 - up);
          #ifdef DETAIL
          // Wet sheet metal: it gives back the lit sky at a glancing angle
          // and a highlight of every lamp near it, both broken by the seams
          // and the grime (the panel's wear), which is what shows it at night.
          vec3 V = normalize(uCam - vWorld);
          vec3 R = reflect(-V, n);
          float F = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
          float sheen = smoothstep(0.75, 1.1, wear);
          vec3 skyR = (uHazeColor * 1.4 + uGlowColor * 0.6) * smoothstep(-0.15, 0.35, R.y) * uHaze;
          vec3 glint = vec3(0.0);
          for (int i = 0; i < ${LAMPS}; i++) {
            vec3 d = uLamps[i].xyz - vWorld;
            float d2 = dot(d, d);
            float r2 = uLamps[i].w * uLamps[i].w * 4.0;
            if (d2 > r2) continue;
            float hl = pow(max(dot(R, d * inversesqrt(d2)), 0.0), 40.0);
            glint += uLampColors[i] * hl * (1.0 - d2 / r2);
          }
          col += (skyR * F * 0.9 + glint * 0.9) * (0.35 + 0.65 * sheen);
          #endif
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
          // Each row of tiles slid a quarter or three along, so a tall wall
          // does not stack the same balconies over themselves.
          uv.x += floor(hash12(vec2(tile.y, 9.3)) * 4.0) * 0.25;
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
          col += tex * lampsAt(vWorld, normalize(vNormalW)) * 3.0 * (1.0 - room);
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

  // `fog` scales the fog's density: the avenue's far end (facade_end) is
  // fogged at a third, so it stands dark against the glow, windows lit.
  const facade = (key = "facade", fog = 1) => {
    if (made.has(key)) return made.get(key);
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uWindows: { value: 1 }, uFogK: { value: fog } },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        ${WINDOWS}
        uniform float uWindows;
        uniform float uFogK;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          vec4 w = windows(vUv, vColor.rgb, vWorld, uWindows);
          // Fog at uFogK of its density: the same curve from a point that
          // far nearer the lens along the same line.
          vec3 p = uCam + (vWorld - uCam) * uFogK;
          vec3 col = cityFog(w.rgb, p, w.a * 0.7);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = key;
    made.set(key, m);
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
  // apart over an 8 m lobby, a spandrel at each slab, mullions every 1.5 m.
  // Behind the glass is the floor itself, traced in the fragment (interior
  // mapping, as the shops are): an open plan 9 m deep to the core, its
  // ceiling a grid of light panels the eye sees in perspective (from the
  // street, the ceilings of every floor above it), a row of desk screens
  // and partitions against the light, and the core's wall at the back. A
  // tenant has two to four floors and its own light, cool or warm; parts of
  // a floor are switched off; some panes have their blinds down. The glass
  // is tinted and gives back the night sky and the city's glow, each pane
  // at its own slight angle, as a real curtain wall does, and more of it the
  // more glancing the look (the upper floors from the street are mostly
  // sky). The tower's own colour (src/world/towers.js) washes the glass
  // beside its corner fins, up from the lobby and down from the crown, and
  // comes up with its card. vColor: lit fraction, warmth, seed.
  const corporate = () => {
    if (made.has("corporate")) return made.get("corporate");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uTowerAccent[8];
        uniform float uTowerLit[8];
        uniform float uTowerTop[8];
        uniform vec2 uTowerCentre[8];
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        const float BASE = 8.0;
        const float STOREY = 3.8;
        const float SILL = 0.95;
        const float CLEAR = 2.85;
        const float MODULE = 1.5;
        const float DEEP = 9.0;

        // What the glass gives back: a night sky lit from under by the
        // city, the haze on the horizon, and round it the city across the
        // way, a scatter of lit windows over the dark.
        vec3 skyIn(vec3 r) {
          vec3 zenith = vec3(0.006, 0.005, 0.012);
          vec3 horizon = uHazeColor * 0.55 + uGlowColor * 0.35;
          vec3 sky = mix(horizon, zenith, smoothstep(0.0, 0.55, r.y));
          float cloud = 0.5 + 0.5 * sin(r.x * 6.0 + r.z * 4.0 + r.y * 13.0) * sin(r.x * 2.3 - r.z * 3.1);
          sky += uHazeColor * 0.35 * cloud * smoothstep(0.04, 0.3, r.y) * (1.0 - smoothstep(0.35, 0.8, r.y));
          vec3 below = uFogColor * 0.4 + uHazeColor * 0.1 * exp(min(r.y, 0.0) * 9.0);
          vec3 col = mix(below, sky, smoothstep(-0.02, 0.02, r.y)) + cityGlow(r, max(r.y, 0.0) * 600.0) * 0.45;
          // The towers opposite: their lit windows, low in the reflection.
          vec2 cell = floor(vec2(atan(r.z, r.x) * 90.0, r.y * 160.0));
          float w = hash12(cell);
          float city = step(0.9, w) * (1.0 - smoothstep(0.02, 0.28, r.y)) * step(-0.25, r.y);
          col += mix(vec3(1.0, 0.7, 0.42), vec3(0.6, 0.8, 1.0), step(0.95, w)) * city * 0.35;
          return col;
        }

        void main() {
          vec3 n = normalize(vec3(vNormalW.x, 0.0, vNormalW.z));
          vec3 t = vec3(n.z, 0.0, -n.x);
          // Which tower this is: the nearest centre.
          int ti = 0;
          float best = 1e9;
          for (int i = 0; i < 8; i++) {
            float dd = abs(vWorld.x - uTowerCentre[i].x);
            if (dd < best) { best = dd; ti = i; }
          }
          vec3 accent = uTowerAccent[ti];
          float tlit = uTowerLit[ti];
          float top = uTowerTop[ti];
          vec2 rel = vWorld.xz - uTowerCentre[ti];
          float halfW = abs(dot(rel, n.xz));
          float along = dot(rel, t.xz);
          float edge = max(halfW - abs(along), 0.0);

          float fy = (vWorld.y - BASE) / STOREY;
          float level = floor(fy);
          float inFloor = fract(fy) * STOREY;
          float u = along + 300.0;
          float module = u / MODULE;
          float pane = floor(module);
          float faceId = floor(n.x * 1.5 + 1.5) * 3.0 + floor(n.z * 1.5 + 1.5);
          float seed = vColor.b * 97.0 + faceId * 13.0;

          // The tenant: floors in threes, give or take, one light each.
          float tenant = floor((level + floor(hash12(vec2(seed, 1.0)) * 3.0)) / 3.0);
          // The card being read keeps its tower's floors on.
          float tenantOn = step(hash12(vec2(tenant, seed + 0.5)), vColor.r + 0.25 * tlit);
          float tone = hash12(vec2(tenant, seed + 3.7));
          vec3 L = vec3(0.74, 0.87, 1.0);
          if (tone > 1.0 - 0.5 * vColor.g) L = vec3(1.0, 0.76, 0.5);
          else if (tone > 0.7) L = vec3(0.96, 0.95, 0.88);
          // Some floors brighter than others: a late shift, the cleaners.
          L *= 0.75 + 0.6 * hash12(vec2(tenant, seed + 9.1));

          // Into the floor: x along the facade, y up from the floor, z in.
          vec3 V = normalize(vWorld - uCam);
          vec3 d = vec3(dot(V, t), V.y, max(-dot(V, n), 1e-3));
          vec3 p = vec3(u, clamp(inFloor - SILL, 0.0, CLEAR), 0.0);
          float ty = d.y > 0.0 ? (CLEAR - p.y) / d.y : -p.y / min(d.y, -1e-4);
          float tz = DEEP / d.z;
          float tm = min(ty, tz);
          vec3 h = p + d * tm;
          // Zones of a floor, 9 m each, some switched off.
          float zoneOn = step(0.24, hash12(vec2(floor(h.x / 9.0), level + seed * 1.3)));
          float on = tenantOn * zoneOn;
          vec3 room;
          if (tz <= ty) {
            // The core: a lit wall, a dark door now and then.
            float door = step(abs(fract(h.x / 7.3) - 0.5), 0.08) * step(h.y, 2.2);
            room = L * (0.09 + 0.12 * smoothstep(0.0, CLEAR, h.y)) * (1.0 - 0.75 * door);
          } else if (d.y > 0.0) {
            // The ceiling's grid of panels, faded to its average where it
            // would shimmer.
            vec2 g = vec2(h.x / 1.5, h.z / 1.2);
            vec2 c = abs(fract(g) - 0.5);
            float aa = clamp(max(fwidth(g.x), fwidth(g.y)) * 1.5, 0.0, 1.0);
            float panel = mix(step(c.x, 0.36) * step(c.y, 0.12), 0.17, aa);
            float deep = 1.0 - 0.55 * smoothstep(0.0, DEEP, h.z);
            room = L * (0.26 + 2.1 * panel) * deep;
          } else {
            // The floor: pools of light under the ceiling's panels, as the
            // floors of a lit office are seen from above.
            vec2 g = vec2(h.x / 1.5, h.z / 1.2);
            float pool = smoothstep(0.55, 0.05, length(fract(g) - 0.5));
            float aa = clamp(max(fwidth(g.x), fwidth(g.y)) * 1.5, 0.0, 1.0);
            room = L * (0.16 + mix(0.36 * pool, 0.13, aa) + 0.04 * hash12(floor(h.xz)));
          }
          room *= on;
          // Unlit floors are not black: exit signs, a screen left on.
          room += vec3(0.003, 0.004, 0.007);
          // Desks, their partitions and screens, 2.4 m in, against the light.
          float tf = 2.4 / d.z;
          if (tf < tm) {
            vec3 f = p + d * tf;
            float slot = floor(f.x / 1.6);
            float desk = step(f.y, 1.1) * step(0.18, hash12(vec2(slot, level + seed * 2.1)));
            float screen = step(abs(fract(f.x / 1.6) - 0.5), 0.17) * step(0.78, f.y) * step(f.y, 1.06) * step(0.35, hash12(vec2(slot * 1.3, level + seed)));
            float lip = smoothstep(1.03, 1.1, f.y) * desk;
            room = mix(room, room * 0.12 + L * lip * 0.25 * on, desk);
            room += vec3(0.45, 0.72, 1.0) * screen * desk * mix(0.25, 0.9, on);
            // Now and then somebody at the glass, working late.
            float who = hash12(vec2(floor(f.x / 9.0), level + seed * 5.1));
            float fx = f.x - (floor(f.x / 9.0) + 0.2 + 0.6 * fract(who * 7.0)) * 9.0;
            float body = step(abs(fx), 0.22) * step(f.y, 1.45) + step(length(vec2(fx, f.y - 1.62)), 0.12);
            room = mix(room, room * 0.08, clamp(body, 0.0, 1.0) * step(0.8, who) * on);
          }
          // Blinds, down part of the way on the odd pane.
          float blindPick = hash12(vec2(floor(module / 2.0), level + seed * 3.3));
          float blindTo = CLEAR * (1.0 - (0.3 + 0.6 * fract(blindPick * 13.0)));
          if (blindPick > 0.86 && p.y > blindTo) {
            float slat = 0.75 + 0.25 * step(0.5, fract(p.y * 12.0));
            room = L * on * 0.3 * slat + vec3(0.01, 0.011, 0.015);
          }

          // The glass: tinted, each pane at its own slight angle.
          vec2 jit = vec2(hash12(vec2(pane, level + seed)), hash12(vec2(level, pane + seed * 2.0))) - 0.5;
          vec3 nj = normalize(n + t * jit.x * 0.06 + vec3(0.0, jit.y * 0.04, 0.0));
          vec3 R = reflect(V, nj);
          float F = 0.07 + 0.6 * pow(1.0 - abs(dot(V, nj)), 5.0);
          vec3 env = skyIn(R);

          // The tower's colour on it: beside its fins, up from its lobby,
          // down from its crown.
          float fin = exp(-edge / 1.3);
          float up = exp(-max(vWorld.y - BASE, 0.0) / 9.0);
          float crown = exp(-max(top - vWorld.y, 0.0) / 6.0);
          vec3 wash = accent * (fin * (0.05 + 0.8 * tlit) + up * (0.1 + 0.25 * tlit) + crown * (0.03 + 0.6 * tlit) + 0.06 * tlit);

          vec3 glass = room * vec3(0.72, 0.84, 0.9) * (1.0 - F) + env * F + wash * (0.06 + 0.5 * F);

          // Mullions and transoms, 7 cm, and the spandrel at the slab: dark
          // metal and back-painted glass, catching the sky and the wash.
          vec3 frameCol = vec3(0.016, 0.017, 0.022) + env * 0.35 + wash * 0.55 + spillAt(vWorld) * 0.3;
          vec3 spandrel = vec3(0.012, 0.013, 0.018) + env * (0.15 + 0.6 * F) + wash * 0.4 + spillAt(vWorld) * 0.2;
          spandrel *= 0.8 + 0.2 * step(0.08, abs(inFloor - SILL * 0.5));
          float mx = fract(module);
          float mw = fwidth(module);
          float fw = fwidth(fy);
          float mull = mix(step(min(mx, 1.0 - mx) * MODULE, 0.035), 0.05, smoothstep(0.02, 0.06, mw));
          float trans = mix(step(abs(inFloor - SILL), 0.04) + step(STOREY - inFloor, 0.035), 0.02, smoothstep(0.01, 0.03, fw));
          float slab = mix(step(inFloor, SILL), SILL / STOREY, smoothstep(0.08, 0.3, fw));
          vec3 col = mix(glass, frameCol, clamp(mull + trans, 0.0, 1.0));
          col = mix(col, spandrel, slab);

          // Far off, a floor's average rather than a pattern that shimmers.
          float litAvg = min(vColor.r + 0.25 * tlit, 1.0) * 0.76;
          vec3 avgRoom = L * litAvg * 0.6 + 0.004;
          vec3 avg = mix(avgRoom * 0.8 * (1.0 - F) + env * F + wash * 0.3, spandrel, SILL / STOREY);
          col = mix(col, avg, smoothstep(0.25, 0.6, fw));

          col = cityFog(col, vWorld, on * (1.0 - slab) * 0.6);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "corporate";
    made.set("corporate", m);
    return m;
  };

  // A crown's glass round its logo: dark and ribbed, lit in the tower's own
  // colour from the bands at its foot and its top, more while its card is
  // read.
  const crownGlass = () => {
    if (made.has("crown_glass")) return made.get("crown_glass");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uTowerAccent[8];
        uniform float uTowerLit[8];
        uniform float uTowerTop[8];
        uniform vec2 uTowerCentre[8];
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          int ti = 0;
          float best = 1e9;
          for (int i = 0; i < 8; i++) {
            float dd = abs(vWorld.x - uTowerCentre[i].x);
            if (dd < best) { best = dd; ti = i; }
          }
          vec3 accent = uTowerAccent[ti];
          float lit = uTowerLit[ti];
          float top = uTowerTop[ti];
          vec3 n = normalize(vNormalW);
          if (n.y > 0.5) {
            gl_FragColor = vec4(cityFog(vec3(0.01, 0.01, 0.014), vWorld, 0.0), 1.0);
            ${OUT}
            return;
          }
          vec3 t = vec3(n.z, 0.0, -n.x);
          float along = dot(vWorld, t);
          float fromTop = top - vWorld.y;
          float fromFoot = vWorld.y - (top - 16.0);
          float rib = fract(along / 0.9);
          float ribLine = mix(step(min(rib, 1.0 - rib), 0.05), 0.1, smoothstep(0.05, 0.25, fwidth(along / 0.9)));
          vec3 V = normalize(vWorld - uCam);
          float F = 0.08 + 0.92 * pow(1.0 - abs(dot(V, n)), 5.0);
          vec3 sky = uHazeColor * 0.6 + uGlowColor * 0.4;
          float wash = exp(-fromTop / 2.8) * (0.12 + 0.9 * lit) + exp(-fromFoot / 3.5) * (0.08 + 0.5 * lit);
          vec3 col = vec3(0.008, 0.009, 0.013) + sky * F * 0.8 + accent * wash * (0.35 + 0.65 * ribLine);
          col = cityFog(col, vWorld, 0.4);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "crown_glass";
    made.set("crown_glass", m);
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
      case "facade_end": return facade("facade_end", 0.33);
      case "facade_t0":
      case "facade_t1":
      case "facade_t2": return maps[n] ? painted(n, maps[n]) : facade();
      case "shop": return shop();
      case "corporate": return corporate();
      case "lobby": return lobby();
      case "crown_glass": return crownGlass();
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
      case "metal": return surface("metal", { color: "#34373e", ambient: 0.04, detail: true });
      case "dark": return surface("dark", { color: "#121318", ambient: 0.024, spill: 0.6, detail: true });
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
