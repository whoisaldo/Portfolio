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
//   shop     a lit ground floor: a room behind every pane of glass, with
//            depth, drawn in the fragment (src/world/interiors.js).
//   awning   dyed cloth over a shop, lit through from underneath.
//   corporate  corpo row's glass: whole office floors lit behind mullions,
//            the city's glow in the glass; lobby, the lit ground floor.
//   lantern  a red paper lantern, hot through its belly.
//   neon     tubes, strips and panels: flat HDR colour for the bloom to find,
//            breathing with the kick while the track plays, a few flickering;
//            `glow` the same with each piece's colour on its vertices, for
//            light too high up to light the street.
//   painted  the avenue's and the canyon's walls: an original night elevation
//            (balconies, laundry, AC units, lit rooms) as colour and light at
//            once. The lit windows keep their glow and lift a little for the
//            bloom; the dark wall between takes the signs' spill, so a pink
//            sign turns the concrete under it pink.
//   surface  everything else: paint, concrete, metal, roofs, lit by the spill.
import * as THREE from "three";
import { COMMON, LAMPS, VERT_WORLD, VERT_WORLD_COLOR, WINDOWS } from "./glsl.js";
import { GROUND, VNOISE } from "./ground.js";
import { kindSource } from "./kinds.js";
import { SHOP_ROOM, HALL } from "./interiors.js";
import { dealTrades } from "./trades.js";
import { MIRROR_UNIFORMS } from "./road.js";
import { MARKS } from "./marks.js";
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
  const textures = [];
  const keep = (m) => {
    all.push(m);
    return m;
  };

  // The adverts' atlas: the billboards show it, and the posters on the
  // walls are cut from it (src/world/marks.js).
  let advertUniforms = null;
  const adverts = () => {
    if (advertUniforms) return advertUniforms;
    const small = (maps.shops?.image?.width ?? 1024) <= 512;
    const has = { value: 0 };
    const ads = new THREE.TextureLoader().load(small ? "/scenes/world/ads-phone.webp" : "/scenes/world/ads.webp", () => {
      has.value = 1;
    });
    ads.colorSpace = THREE.SRGBColorSpace;
    ads.anisotropy = small ? 2 : 4;
    textures.push(ads);
    advertUniforms = { uAds: { value: ads }, uHasAds: has };
    return advertUniforms;
  };

  // Everything that is not glass or light. `detail` is what it is made of
  // (src/world/kinds.js: steel, plate, sheet, concrete...); `wall` (with how much spray paint it takes) dresses its upright
  // faces to a storey's height as a street does a wall (src/world/marks.js),
  // `door` gives those a door's rails and plates; `shutter` makes it a
  // roller shutter; `paving` and `kerb` lay it as a
  // pavement and its kerb (src/world/ground.js). All of that is near work:
  // it fades by the metres a pixel covers and is skipped past that.
  const surface = (key, { color = "#444444", map = null, ambient = 0.03, spill = 1, rough = 1, detail = null, tinted = false, sky = 1, wall = null, door = false, shutter = false, paving = false, lane = false, kerb = false } = {}) => {
    if (made.has(key)) return made.get(key);
    const marks = wall !== null || shutter;
    const ground = paving || kerb;
    const m = keep(new THREE.ShaderMaterial({
      defines: {
        ...(detail ? { DETAIL: "" } : {}),
        ...(tinted ? { TINTED: "" } : {}),
        ...(wall !== null ? { WALL: "" } : {}),
        ...(door ? { DOOR: "" } : {}),
        ...(shutter ? { SHUTTER: "" } : {}),
        ...(paving ? { PAVING: "" } : {}),
        ...(lane ? { LANE: "" } : {}),
        ...(kerb ? { KERB: "" } : {}),
      },
      uniforms: {
        ...shared,
        uColor: { value: new THREE.Color(color) },
        uMap: { value: map },
        uHasMap: { value: map ? 1 : 0 },
        uAmbient: { value: ambient },
        uSpillMul: { value: spill },
        uGloss: { value: rough },
        uSky: { value: sky },
        uSpray: { value: wall ?? 0.4 },
        ...(marks ? adverts() : {}),
      },
      vertexShader: /* glsl */ `
        ${tinted ? "attribute vec4 color; varying vec4 vColor;" : ""}
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        // A prop (src/world/props.js draws these materials instanced): its
        // painted sides are not a wall.
        varying float vProp;
        void main() {
          #ifdef USE_INSTANCING
          mat4 m = modelMatrix * instanceMatrix;
          vProp = 1.0;
          #else
          mat4 m = modelMatrix;
          vProp = 0.0;
          #endif
          vec4 w = m * vec4(position, 1.0);
          vWorld = w.xyz;
          vNormalW = normalize(mat3(m) * normal);
          vUv = uv;
          ${tinted ? "vColor = color;" : ""}
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        ${detail || marks || ground ? VNOISE : ""}
        ${ground || marks ? GROUND : ""}
        ${marks ? MARKS : ""}
        uniform vec3 uColor;
        uniform sampler2D uMap;
        uniform float uHasMap;
        uniform float uAmbient;
        uniform float uSpillMul;
        uniform float uSky;
        uniform float uSpray;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying float vProp;
        #ifdef TINTED
        varying vec4 vColor;
        #endif
        ${detail ? kindSource(detail) : ""}
        void main() {
          vec3 albedo = uColor;
          #ifdef TINTED
          albedo *= vColor.rgb;
          #endif
          if (uHasMap > 0.5) albedo *= texture2D(uMap, vUv).rgb * 2.0;
          vec3 n = normalize(vNormalW);
          // Metres a pixel covers here.
          float px = max(fwidth(vWorld.x) + fwidth(vWorld.z), fwidth(vWorld.y));
          vec3 glowing = vec3(0.0);
          #ifdef DETAIL
          float wear;
          albedo = dress(albedo, vWorld, n, px, wear);
          #endif
          #if defined(WALL) || defined(SHUTTER)
          // An upright face a walker can reach: along it, up it, and the
          // wall's own number (the plane it stands in, the way it faces).
          vec3 nh = normalize(vec3(n.x, 0.0, n.z) + 1e-5);
          vec2 q = vec2(dot(vWorld, vec3(nh.z, 0.0, -nh.x)), vWorld.y);
          float id = floor(dot(vWorld, nh) * 0.37 + 0.123) + (floor(nh.x * 1.5 + 1.77) * 3.0 + floor(nh.z * 1.5 + 1.77)) * 7.0;
          bool reach = vProp < 0.5 && abs(n.y) < 0.3 && vWorld.y < 4.6 && px < 0.15;
          #endif
          #ifdef WALL
          if (reach) {
            #ifdef DOOR
            // A steel door: a scuffed kick plate, a push rail, a slot of
            // wired glass over it, the leaf's top rail.
            float kick = step(q.y, 0.48);
            float rail = step(abs(q.y - 1.12), 0.035);
            float slot = step(abs(q.y - 1.62), 0.11);
            albedo = mix(albedo, vec3(0.2, 0.21, 0.23) * (0.6 + 0.6 * vnoise(q * vec2(3.0, 40.0))), kick);
            albedo = mix(albedo, vec3(0.13, 0.135, 0.15), rail);
            albedo = mix(albedo, vec3(0.012, 0.016, 0.02) + 0.02 * step(0.9, fract(q.x * 14.0)) + 0.02 * step(0.9, fract(q.y * 14.0)), slot);
            albedo *= 1.0 - 0.5 * step(abs(q.y - 2.2), 0.012) - 0.3 * step(abs(q.y - 0.49), 0.01);
            #endif
            // Dirt to knee height, splashed up from the pavement; rain run
            // down from the ledge overhead; what is fixed to it; what is
            // pasted, stuck and sprayed on it.
            float low = smoothstep(0.75, 0.25, q.y + 0.3 * vnoise(vec2(q.x * 2.7, id)));
            float run = smoothstep(0.5, 0.8, vnoise(vec2(q.x * 8.0, q.y * 0.3 + id))) * smoothstep(1.6, 4.2, q.y);
            albedo *= (1.0 - 0.5 * low) * (1.0 - 0.45 * run);
            vec3 fit = wallFittings(q, id, px);
            albedo = mix(albedo, vec3(0.2, 0.09, 0.04) * 0.5, fit.z * 0.7);
            albedo = mix(albedo, vec3(0.15, 0.16, 0.18), fit.x * 0.8) * fit.y;
            vec4 mk = wallMarks(q, id, px, tidy(vWorld.xz) > 0.5 ? -1.0 : uSpray);
            albedo = mix(albedo, mk.rgb * 0.5 * (1.0 - 0.4 * low), mk.a * (1.0 - fit.x));
          } else if (vProp < 0.5 && n.y > 0.7 && vWorld.y < 0.4 && px < 0.06) {
            // Flat on the pavement, in yellow: a tactile strip's studs, and
            // the paint worn off it and off a painted kerb.
            float yellow = step(albedo.b * 3.0, albedo.r);
            vec2 stud = fract(vWorld.xz / 0.075) - 0.5;
            float fine = 1.0 - smoothstep(0.015, 0.06, px);
            albedo *= 1.0 + yellow * fine * (0.5 * smoothstep(0.34, 0.22, length(stud)) - 0.35 * smoothstep(0.3, 0.9, vnoise(vWorld.xz * 6.0) + vnoise(vWorld.xz * 31.0) * 0.5));
          }
          #endif
          #ifdef SHUTTER
          if (vProp < 0.5 && abs(n.y) < 0.3) {
            // A roller shutter, and at its foot a line of the light left on
            // inside, warm or cold by the shutter.
            // (A builder's shutter counts its own metres in its UVs: from
            // its left edge, and down from 1 at its foot.)
            float leak;
            float mq = abs(dFdx(q.x)) + abs(dFdy(q.x));
            float mu = abs(dFdx(vUv.x)) + abs(dFdy(vUv.x));
            bool own = mu > 0.8 * mq && mu < 1.25 * mq;
            albedo = shutterAt(albedo, q, id, px, tidy(vWorld.xz) > 0.5 ? -1.0 : uSpray, own ? q.y - 1.0 + vUv.y : 0.15, own ? vec2(vUv.x, 1.0 - vUv.y) : vec2(-1.0), leak);
            glowing = mix(vec3(1.0, 0.72, 0.42), vec3(0.75, 0.9, 1.0), step(0.7, fract(id * 0.37))) * leak;
          }
          #endif
          float water = 0.0;
          float sheen = 0.0;
          #ifdef PAVING
          vec4 se = vec4(0.0);
          vec4 sf = vec4(-99.0);
          if (vProp < 0.5 && n.y > 0.7 && px < 0.6) {
            vec2 p = vWorld.xz;
            // (Noise on a turned grid: square to the street, its cells show.)
            vec2 pr = mat2(0.8, -0.6, 0.6, 0.8) * p;
            sf = streetAt(p, se);
            // Metres back from the kerb's edge; past the lot line, or up off
            // the street (a deck, a roof), it is a lane or a yard, poured,
            // not paved.
            float back = -max(sf.x, sf.y) - 0.3;
            float yard = max(smoothstep(4.9, 5.6, back), step(0.6, vWorld.y));
            float fine = 1.0 - smoothstep(0.012, 0.045, px);
            float mid = 1.0 - smoothstep(0.04, 0.14, px);
            // The paving: a strip of dark setts along the kerb, flags in
            // the middle (each its own grey, some newer, some cracked),
            // the small pavers the map carries against the buildings.
            float band = smoothstep(0.55, 0.62, back) * (1.0 - smoothstep(2.5, 2.58, back + 1.5 * (hash12(floor(p / 24.0)) - 0.5))) * (1.0 - yard);
            float sett = (1.0 - smoothstep(0.5, 0.58, back)) * (1.0 - yard);
            vec2 size = band > 0.5 ? vec2(0.6) : vec2(0.2);
            vec2 g = p / size;
            float hs = hash12(floor(g));
            vec2 f = fract(g);
            float jd = min(min(f.x, 1.0 - f.x) * size.x, min(f.y, 1.0 - f.y) * size.y);
            float joint = (1.0 - smoothstep(0.004, 0.008 + px, jd)) * mid * max(band, sett);
            albedo = mix(albedo, vec3(0.088, 0.09, 0.096) * (0.75 + 0.5 * hs + 0.5 * step(0.94, hs)) * (0.8 + 0.4 * vnoise(p * 37.0) * fine), band);
            albedo = mix(albedo, vec3(0.05, 0.052, 0.06) * (0.7 + 0.6 * hs), sett);
            float cracked = step(hs, 0.07) * band * (1.0 - smoothstep(0.004, 0.008 + px, abs(f.x - 0.5 + (f.y - 0.5) * (fract(hs * 91.0) - 0.5) * 2.0) * 0.6)) * fine;
            albedo *= 1.0 - 0.55 * max(joint, cracked);
            #ifdef LANE
            // A lane off the street (the pavement's own stone carried on
            // round the back) is laid, not poured: fields of flags in
            // running bond, 0.9 by 0.45 m, each its own grey, between bands
            // of dark setts every 5.6 m one way and 7.2 m the other, which
            // are its drains, with a cast grate where two of them cross.
            vec2 fq = vec2(p.x / 0.9 + 0.5 * floor(p.y / 0.45), p.y / 0.45);
            vec2 ff = fract(fq);
            float fh = hash12(floor(fq) + 31.0);
            float fjoint = (1.0 - smoothstep(0.005, 0.011 + px, min(min(ff.x, 1.0 - ff.x) * 0.9, min(ff.y, 1.0 - ff.y) * 0.45))) * mid;
            vec3 flags = vec3(0.082, 0.083, 0.09) * (0.72 + 0.5 * fh + 0.35 * step(0.93, fh)) * (0.85 + 0.3 * vnoise(p * 31.0) * fine) * (1.0 - 0.6 * fjoint);
            vec2 bd = abs(fract(p / vec2(5.6, 7.2)) - 0.5) * vec2(5.6, 7.2);
            float drainBand = 1.0 - smoothstep(0.16, 0.18 + px, min(2.8 - bd.x, 3.6 - bd.y));
            vec2 sq = fract(p / 0.11);
            float sjoint = (1.0 - smoothstep(0.004, 0.009 + px, min(min(sq.x, 1.0 - sq.x), min(sq.y, 1.0 - sq.y)) * 0.11)) * fine;
            vec3 laid = mix(flags, vec3(0.045, 0.046, 0.052) * (0.7 + 0.6 * hash12(floor(p / 0.11) + 7.0)) * (1.0 - 0.5 * sjoint), drainBand);
            vec2 gcell = floor(p / vec2(5.6, 7.2) + 0.5);
            vec2 gd = abs(p - gcell * vec2(5.6, 7.2));
            float grate = step(max(gd.x, gd.y), 0.24) * step(0.5, hash12(gcell + 3.0)) * mid;
            laid = mix(laid, vec3(0.02, 0.021, 0.024) * (0.6 + 0.8 * step(0.5, fract(gd.x / 0.06)) * fine), grate);
            albedo = mix(albedo, laid, yard);
            joint = max(joint, max(fjoint * (1.0 - drainBand), drainBand * 0.5) * yard);
            float low = drainBand * yard;
            #else
            // A yard's concrete (a forecourt, a works' apron): poured in
            // bays, each its own tone, the joints between them run with
            // tar, a crack wandering across one bay in five, a slot drain
            // every 13.8 m with the slab darker with damp toward it, and
            // oil where things stand.
            vec2 bay = abs(fract(p / vec2(3.2, 4.6)) - 0.5) * vec2(3.2, 4.6);
            float bt = hash12(floor(p / vec2(3.2, 4.6)) + 17.0);
            vec3 poured = vec3(0.075, 0.075, 0.08) * (0.82 + 0.3 * bt) * (0.9 + 0.12 * vnoise(p * 0.7) + 0.16 * vnoise(p * 9.0));
            poured *= 1.0 - 0.72 * (1.0 - smoothstep(0.012, 0.022 + px, min(1.6 - bay.x, 2.3 - bay.y))) * mid;
            poured *= 1.0 - 0.6 * (1.0 - smoothstep(0.004, 0.012 + px * 0.3, abs(vnoise(p * 0.55 + bt * 40.0) - 0.5))) * step(bt, 0.22) * fine;
            float dd = abs(fract(p.x / 13.8 + 0.37) - 0.5) * 13.8;
            float slot = (1.0 - smoothstep(0.07, 0.08 + px, dd)) * mid;
            poured = mix(poured, vec3(0.015, 0.016, 0.018) * (0.5 + 1.2 * step(0.55, fract(p.y / 0.05)) * fine), slot);
            poured *= (1.0 - 0.25 * smoothstep(0.9, 0.08, dd)) * (1.0 - 0.45 * smoothstep(0.68, 0.8, vnoise(pr * 1.7 + 9.0)));
            albedo = mix(albedo, poured, yard);
            float low = smoothstep(0.9, 0.08, dd) * yard * 0.6;
            #endif
            // Tarmac let into it where it was dug up; old stains; gum; litter
            // against the kerb and the wall.
            vec2 pc = p / vec2(4.2, 3.3);
            float hp = hash12(floor(pc) + 13.0);
            vec2 pe = min(fract(pc) - 0.1 - 0.3 * vec2(fract(hp * 7.0), fract(hp * 13.0)), 0.9 - 0.3 * vec2(fract(hp * 17.0), fract(hp * 23.0)) - fract(pc)) * vec2(4.2, 3.3);
            float tar = step(hp, 0.08) * smoothstep(-px, px, min(pe.x, pe.y)) * (1.0 - sett);
            albedo = mix(albedo, vec3(0.03, 0.03, 0.034) * (0.8 + 0.4 * vnoise(p * 17.0)), tar * 0.55);
            float stain = smoothstep(0.5, 0.85, vnoise(pr * 0.8 + 4.0) * 0.6 + vnoise(pr.yx * 2.3) * 0.4);
            albedo *= 1.0 - 0.22 * stain;
            vec2 gc = p / 0.22;
            float hg = hash12(floor(gc) + 5.0);
            float gum = step(0.9, hg) * (1.0 - smoothstep(0.045, 0.07, length(fract(gc) - 0.5 - (vec2(fract(hg * 31.0), fract(hg * 57.0)) - 0.5) * 0.6))) * fine;
            albedo *= 1.0 - 0.6 * gum;
            vec2 lc = p / 0.9;
            float hl = hash12(floor(lc) + 21.0);
            float wallD = sf.x >= sf.y ? se.y - abs(se.x) : se.w - abs(se.z);
            float edge = max(smoothstep(0.9, 0.2, back), smoothstep(0.9, 0.2, wallD));
            vec2 lf = mat2(cos(hl * 6.28), -sin(hl * 6.28), sin(hl * 6.28), cos(hl * 6.28)) * (fract(lc) - 0.5 - (vec2(fract(hl * 13.0), fract(hl * 29.0)) - 0.5) * 0.5);
            float scrap = step(0.9 - 0.25 * max(edge, yard * 0.6), hl) * step(abs(lf.x), 0.04 + 0.05 * fract(hl * 41.0)) * step(abs(lf.y), 0.03 + 0.03 * fract(hl * 53.0)) * fine;
            albedo = mix(albedo, mix(vec3(0.24, 0.23, 0.2), fract(hl * 67.0) < 0.5 ? vec3(0.3, 0.1, 0.12) : vec3(0.1, 0.22, 0.28), 0.5 * step(0.5, fract(hl * 79.0))), scrap);
            // The wet: water standing in the low places, more of it in a
            // yard or a lane than on laid flags, thinning to damp at its
            // shore; damp everywhere else, evenly, as rain leaves it.
            // (Pools a stride or two across with an edge to them, the stone
            // damp and darker for a hand's width round each: not a smear.)
            float pool = vnoise(pr * 0.47 + 2.0) * 0.5 + vnoise(pr.yx * 1.3) * 0.32 + vnoise(pr * 3.7) * 0.18;
            #ifdef LANE
            // (A lane's pools are small: its water is in its drains.)
            float brim = 0.68 + 0.02 * yard;
            #else
            float brim = 0.68 - 0.06 * yard;
            #endif
            // (Its shore is a hand wide, shallow water thinning over the
            // stone: a cut edge reads as a sticker laid on the flags.)
            // (Water finds a yard's drain and a lane's setts, the low places.)
            water = smoothstep(brim - 0.012, brim + 0.075 + px, pool + 0.04 * tar + 0.07 * low) * (1.0 - scrap);
            sheen = (0.3 + 0.16 * smoothstep(0.3, 0.7, pool) + 0.15 * tar) * (1.0 - 0.6 * joint);
            albedo *= mix(1.0, 0.45, water) * (1.0 - 0.22 * smoothstep(brim - 0.09, brim, pool));
          }
          #endif
          #ifdef KERB
          if (vProp < 0.5 && px < 0.3) {
            // Kerbstones, a joint between each, pale along the worn edge, the
            // gutter's dirt up the face.
            vec4 ke;
            vec4 ks = streetAt(vWorld.xz, ke);
            float along = ks.x >= ks.y ? vWorld.z : vWorld.x;
            float stone = hash12(vec2(floor(along / 0.9), floor(vWorld.x * 0.11 + vWorld.z * 0.13)));
            float fine = 1.0 - smoothstep(0.02, 0.08, px);
            float joint = (1.0 - smoothstep(0.006, 0.012 + px, (0.5 - abs(fract(along / 0.9) - 0.5)) * 0.9)) * fine;
            albedo *= (0.8 + 0.4 * stone) * (0.85 + 0.3 * vnoise(vWorld.xz * 40.0) * fine) * (1.0 - 0.6 * joint);
            albedo *= 1.0 - 0.5 * (1.0 - step(0.7, n.y)) * smoothstep(0.13, 0.0, vWorld.y);
            sheen = 0.6 * step(0.7, n.y);
          }
          #endif
          float up = clamp(n.y, 0.0, 1.0);
          // (A floor reads the baked light through the smooth filter: seen
          // from over it, the map's cells would show.)
          // (And an upright face a walker can reach reads it as a wall does:
          // spillWall, glsl.js.)
          bool upright = abs(n.y) < 0.3 && vWorld.y < 7.0 && vProp < 0.5;
          #if defined(PAVING) || defined(KERB)
          vec3 spill = n.y > 0.7 ? spillGround(vWorld) : (upright ? spillWall(vWorld) : spillAt(vWorld));
          #else
          vec3 spill = upright ? spillWall(vWorld) : spillAt(vWorld);
          #endif
          float laneDim = 1.0;
          #if defined(WALL) || defined(SHUTTER) || defined(LANE)
          // A lane off the street is dark, and lit where its tubes and its
          // caged lamps are. The bake holds every sign within reach of it
          // as well, an even wash end to end (the avenue's west lane reads
          // 130 to 205 of 255 along its whole length): so a lane's floor
          // and the walls a walker can reach take what the map holds here
          // over what it holds all round (four taps, 6 m off), which is
          // the pools, and next to nothing of the rest. Not where a street
          // front or a square is meant to be evenly lit: a lane is what
          // lies 5 to 40 m behind a street's kerb, outside the corporate
          // ground and Santo Domingo's yards.
          if (vProp < 0.5 && vWorld.y < 7.0) {
            vec4 le;
            vec4 ls = streetAt(vWorld.xz, le);
            float behind = -max(ls.x, ls.y) - 0.3;
            float laneK = smoothstep(5.0, 5.8, behind) * (1.0 - smoothstep(40.0, 55.0, behind)) * (1.0 - tidy(vWorld.xz)) * (1.0 - smoothstep(0.0, 0.25, santoAt(vWorld.xz)));
            if (laneK > 0.01) {
              vec2 luv = (vWorld.xz - uSpillBounds.xy) * uSpillBounds.zw;
              vec2 lo = 4.5 * uSpillBounds.zw;
              vec3 la = texture2D(uSpill, luv).rgb;
              vec3 lw = texture2D(uSpill, luv + lo).rgb + texture2D(uSpill, luv - lo).rgb + texture2D(uSpill, luv + vec2(lo.x, -lo.y)).rgb + texture2D(uSpill, luv - vec2(lo.x, -lo.y)).rgb;
              float here = dot(la * la, vec3(0.333));
              float round4 = dot(lw * lw, vec3(0.333)) / 16.0;
              laneDim = mix(1.0, max(here - 0.8 * round4, 0.05 * here) / max(here, 1e-4) * 1.7, laneK);
              spill *= laneDim;
            }
          }
          #endif
          vec3 light = vec3(uAmbient) * (0.6 + 0.4 * up) + spill * uSpillMul * (0.9 + 0.1 * up) + lampsAt(vWorld, n) * 5.0;
          // What faces the sky catches the city's glow on the cloud (a wet
          // roof, uSky, more of it: seen from above a roof is a dark blue
          // surface, not a hole).
          vec3 skyLight = (uHazeColor * 0.22 + uGlowColor * 0.12) * uHaze;
          // What lies flat on the deck's road (a tar seam, a sealed crack,
          // a joint's steel, a drain: the builder's, between the parapet's
          // road face and the barrier's on both runs) is on wet asphalt
          // under the deck's masts, not a roof under the cloud: it takes no
          // sky. With the cloud's light on it at a glance, as a roof has
          // it, a 4 cm strip of tar drew as a saturated blue line across
          // both lanes.
          float onDeck = step(0.3, vWorld.y) * step(vWorld.y, 9.2) * (1.0 - vProp) * step(0.9, n.y)
            * (step(-84.6, vWorld.z) * step(vWorld.z, -76.3) * step(-84.5, vWorld.x) * step(vWorld.x, 113.0)
             + step(-83.7, vWorld.x) * step(vWorld.x, -75.4) * step(-221.0, vWorld.z) * step(vWorld.z, -84.6));
          light += skyLight * up * uSky * (1.0 - onDeck);
          // Santo Domingo's sodium lamps light its air, and the air its
          // yards, its plant and its roofs, from every side: most where
          // the lamps are, little between them, so the orange falls off
          // from each pool of light and the dark between them is dark.
          float santo = santoAt(vWorld.xz) * uHaze;
          light += SODIUM * santo * (0.5 + 0.5 * up) * exp(-max(vWorld.y, 0.0) * 0.02) * 1.6 * mix(0.3, 1.0, smoothstep(0.02, 0.3, dot(spill, vec3(0.5, 0.4, 0.1))));
          vec3 col = albedo * light + glowing;
          // And at a grazing angle every edge holds a little of the haze
          // behind it, so a dark shape stands off the dark behind it.
          vec3 V = normalize(uCam - vWorld);
          float rim = pow(1.0 - abs(dot(V, n)), 3.0);
          float dt = downtown(-V);
          vec3 hazeV = mix(uHazeColor, vec3(0.0137, 0.0103, 0.0723), dt);
          vec3 glowV = mix(uGlowColor, vec3(0.204, 0.129, 0.323), dt);
          // (Only what is some way off: on a wall beside the eye, seen along
          // its length, it was an even navy wash that hid every lamp's pool.)
          col += (hazeV * 1.5 + glowV * 0.45) * rim * 0.5 * uHaze * (1.0 - up) * smoothstep(12.0, 50.0, length(uCam - vWorld));
          // No roof is a hole: whatever it is made of, the rain on it holds
          // the lit cloud, a little from overhead and more at a glance.
          float top = up * smoothstep(2.5, 6.0, vWorld.y) * (1.0 - vProp) * (1.0 - onDeck);
          col += (skyLight * 4.0 + SODIUM * santo * 0.5) * top * (0.045 + 0.5 * rim);
          #ifdef DETAIL
          // Wet sheet metal: it gives back the lit sky at a glancing angle
          // and a highlight of every lamp near it, both broken by the seams
          // and the grime (the panel's wear), which is what shows it at night.
          vec3 R = reflect(-V, n);
          float F = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
          float shine = smoothstep(0.75, 1.1, wear);
          vec3 skyR = (hazeV * 1.4 + glowV * 0.6) * smoothstep(-0.15, 0.35, R.y) * uHaze;
          vec3 glint = vec3(0.0);
          for (int i = 0; i < ${LAMPS}; i++) {
            vec3 d = uLamps[i].xyz - vWorld;
            float d2 = dot(d, d);
            float r2 = uLamps[i].w * uLamps[i].w * 4.0;
            if (d2 > r2) continue;
            float hl = pow(max(dot(R, d * inversesqrt(d2)), 0.0), 40.0);
            glint += uLampColors[i] * hl * (1.0 - d2 / r2);
          }
          col += (skyR * F * 0.9 + glint * 0.9) * (0.35 + 0.65 * shine) * (1.0 - onDeck);
          #endif
          #if defined(PAVING) || defined(KERB)
          if (sheen + water > 0.0) {
            // Wet stone gives the street back as the road does (road.js),
            // with no mirror: the baked light along the ray on the damp,
            // more of it and the sky in standing water.
            vec3 Rw = vec3(-V.x, V.y, -V.z);
            float graze = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
            // (Under Santo Domingo's lamps the cloud over a yard is their
            // orange, and a pool there holds that, not the city's blue.)
            vec3 back = tame(spillReflect(vWorld, Rw) * 0.14, 0.5) * laneDim;
            vec3 sky = mix((hazeV * 1.2 + glowV * 0.5) * 0.4, SODIUM * 0.9, 0.85 * santoAt(vWorld.xz)) * uHaze;
            vec3 give = back * sheen * (0.15 + 0.85 * graze);
            #ifdef PAVING
            // (A pool's face is never one flat tone: the rain keeps it moving.)
            // (And it holds the street's light before the cloud's: lit by
            // the cloud alone, a pool in a dark yard was a pale patch.)
            // (And whole only where a light stands over it: the wash
            // between, given back evenly, was a milky sheen on a lane's
            // floor, fog or frost and not wet stone.)
            float bl = dot(back, vec3(0.3, 0.5, 0.2));
            if (water > 0.01) give = mix(give, (back * (bl / (0.5 * bl + 0.07)) * 1.3 + sky * mix(0.1, 0.55, santoAt(vWorld.xz))) * (0.25 + 0.75 * graze) * (0.9 + 0.2 * vnoise(vWorld.xz * 6.0 + uTime * 0.7)), water * water);
            #endif
            col += give / (1.0 + 0.35 * max(give.r, max(give.g, give.b)));
          }
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
      // (Where each elevation's picture has piers between its bays, as
      // shares of a tile: measured from the pictures' lit columns.)
      uniforms: { ...shared, uMap: { value: map }, uGain: { value: 1.05 }, uCuts: { value: new THREE.Vector3(...({ facade_t0: [0.36, 0.63, 2], facade_t1: [0.25, 0.5, 0.73], facade_t2: [0.33, 0.75, 2] }[key] ?? [0.33, 0.66, 2])) } },
      defines: tiled ? { TILED: "" } : {},
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uMap;
        uniform float uGain;
        uniform vec3 uCuts;
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
          #ifdef TILED
          // The picture's own lit rooms are the same in every tile, and a
          // megablock's face is five tiles wide: the same lamps bay after
          // bay. So which of them are on is dealt over the wall itself. The
          // picture's storeys are eighths of a tile (3 m) and its bays are
          // cut where it has piers (uCuts, per picture): a storey is lit
          // along a run of three tiles or mostly dark along it, a bay of it
          // is on or off by that, an office's block of three storeys by two
          // tiles is lit cyan where the flats are amber, and a room that is
          // off keeps its dark glass.
          float fx = fract(uv.x);
          float bay = step(uCuts.x, fx) + step(uCuts.y, fx) + step(uCuts.z, fx);
          float storey = floor(vUv.y * 8.0);
          float run = floor((tile.x + floor(hash12(vec2(storey, 2.7)) * 3.0)) / 3.0);
          float busy = hash12(vec2(storey * 1.3, run + 5.1));
          float share = busy > 0.4 ? 0.92 : (busy > 0.15 ? 0.45 : 0.05);
          float on = step(hash12(vec2(tile.x * 4.0 + bay, storey) + 1.7), share);
          float office = step(0.72, hash12(vec2(floor(storey / 3.0), floor(tile.x / 2.0) + 9.4)));
          vec3 shut = tex * 0.1 + vec3(0.004, 0.006, 0.01);
          vec3 open = mix(tex, tex.bgr * vec3(0.9, 1.1, 1.05), office) * 1.22;
          tex = mix(tex, mix(shut, open, on), room);
          room *= on;
          #endif
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
          // The kit's buildings carry their wall colour in the alpha; the
          // old ones (alpha 1) keep the charcoal.
          vec4 w = windowsT(vUv, vColor.rgb, vWorld, uWindows, vColor.a > 0.999 ? -1.0 : vColor.a);
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

  // A shop, seen through its glass: the room behind it is drawn in the
  // fragment (src/world/interiors.js), the eye's ray run into a box and
  // shaded where it lands, so it has depth and parallax and no picture is
  // read. vColor carries the shop's brightness, its hue and whether it is
  // open (a closed one shows its roller shutter), and in its alpha, once
  // the panes have been dealt (src/world/trades.js, the first time a shop
  // mesh is drawn), which of the eight trades the pane is and how wide.
  const dealt = new WeakSet();
  const trades = { panes: 0, signed: 0 };
  const shop = () => {
    if (made.has("shop")) return made.get("shop");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, ...adverts() },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        ${VNOISE}
        ${MARKS}
        ${SHOP_ROOM}
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
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
          float along = dot(vWorld, t);
          // The builder's panes count their own metres in their UVs; the
          // older kit's carry half the world's, told apart by how fast u
          // runs along the wall.
          float metres = abs(dFdx(along)) + abs(dFdy(along));
          float own = step(0.8 * metres, abs(dFdx(vUv.x)) + abs(dFdy(vUv.x)));
          float ax = mix(along, vUv.x, own);
          float py = clamp(mix(vWorld.y - 0.6, 1.0 - vUv.y, own), 0.0, GLASS);
          float px = max(metres, fwidth(vWorld.y));
          // The shop's own number, from what the builder gave it and the
          // wall it stands in; and each room of it its own.
          float wall = floor(n.x * 1.5 + 1.75) * 3.0 + floor(n.z * 1.5 + 1.75);
          // Which pane of the wall this is: a builder's pane counts its
          // metres from its own left edge, so where that edge stands in the
          // world is the same number all across it and another for the pane
          // next door (the older kit's glass: every 6.4 m of the wall).
          // Without it every window of a street side was the same shop.
          float way = dFdx(along) * dFdx(vUv.x) + dFdy(along) * dFdy(vUv.x) < 0.0 ? -1.0 : 1.0;
          float left = along - way * vUv.x;
          float paneId = mix(floor(along / 6.4), floor(left * 2.0 + 0.37), own);
          float plane = floor(dot(vWorld, n) * 0.37 + 0.123);
          float shop = hash12(floor(vColor.rg * 255.0 + 0.5) + vec2(plane + paneId * 3.0, wall * 7.0));
          // The trade: the one the pane was dealt (alpha under 1: the trade
          // in its top three bits, the pane's width in quarter metres in the
          // other five), or for a pane nobody dealt, eight in turn along the
          // wall by where its left edge stands, three on at a time, so no
          // two within seven doors are the same.
          float code = floor(vColor.a * 255.0 + 0.5);
          float dealt = step(code, 254.5);
          float kind = mix(mod(mix(floor(along / 6.4), floor(left / 2.2 + 0.37), own) * 3.0 + floor(hash12(vec2(wall * 7.0 + 0.5, plane)) * 8.0), 8.0), floor(code / 32.0), dealt);
          // A room is its pane's width (a long pane is two or three rooms
          // of one shop); an old pane's are cut every 3.2 m.
          float paneW = (code - floor(code / 32.0) * 32.0) * 0.25;
          float roomW = mix(3.2, mix(3.4 + 1.9 * floor(fract(shop * 7.3) * 3.0), max(paneW / max(1.0, ceil(paneW / 5.6)), 2.4), dealt), own);
          float cell = floor(ax / roomW);
          float seed = hash12(vec2(cell + 0.5, shop * 61.0 + 0.5));
          float power = (0.45 + 0.55 * vColor.r) * (0.6 + 0.4 * fract(seed * 3.3));
          vec3 L = tint(vColor.g);
          vec3 V = normalize(vWorld - uCam);
          float facing = abs(dot(V, n));
          vec3 street = spillAt(vWorld);
          // The trade's own light, a little toward the tint the builder
          // gave the shop: what the pane is from too far to see in.
          vec3 away = tradeLight(kind) * mix(vec3(1.0), L, 0.25) * 0.8;

          vec3 col;
          if (vColor.b < 0.5) {
            // Shut: a roller shutter (src/world/marks.js), the street's light
            // along its slats, and at its foot a line of the shop's own.
            float leak;
            vec3 steel = shutterAt(vec3(0.1, 0.1, 0.115), vec2(along, vWorld.y), wall * 7.0 + floor(dot(vWorld, n) * 0.37 + 0.123), px, tidy(vWorld.xz) > 0.5 ? -1.0 : 0.4, vWorld.y - py, own > 0.5 ? vec2(vUv.x, py) : vec2(-1.0), leak);
            col = steel * (vec3(0.14) + street * 1.15) + L * leak * 0.9;
          } else if (px > 0.6) {
            // Too far to see into: the light in its window.
            col = away * power * 0.52;
          } else {
            // Into the room: x along it, y up from the sill, z in.
            vec3 d = vec3(dot(V, t), V.y, max(-dot(V, n), 1e-3));
            vec3 p = vec3(ax - cell * roomW, py, 0.0);
            float fine = 1.0 - smoothstep(0.02, 0.07, px);
            col = shopRoom(p, d, roomW, kind, shop, seed, street, fine);
            // Now and then somebody standing at the window, against the
            // light (not in a shop that is shut).
            vec3 f = p + d * (mix(0.5, 1.2, fract(seed * 43.0)) / d.z);
            col = mix(col, col * 0.05, person(f.xy, roomW * mix(0.2, 0.8, fract(seed * 53.0))) * step(fract(seed * 59.0), 0.3) * step(kind, 6.5));
            col = mix(away, col, 1.0 - smoothstep(0.25, 0.6, px)) * power * 0.52;
            // What is on the glass itself, each shop's own, so that no lit
            // pane is bare whatever lies behind it and however the eye
            // meets it: bills pasted inside facing out (the street lights
            // them), a strip of film along its foot with a line of
            // lettering, a small tube sign hung in it, and now and then the
            // shutter drawn part of the way down. Not where it would be
            // finer than a pixel, and not on a unit that is shut.
            float gl = 1.0 - smoothstep(0.1, 0.3, px);
            if (gl > 0.0 && kind < 6.5) {
              vec2 g = vec2(p.x, py);
              float gs = fract(seed * 71.0);
              for (int i = 0; i < 2; i++) {
                float hb = hash12(vec2(seed * 91.0 + float(i) * 7.0, shop * 13.0));
                if (hb < 0.4) continue;
                vec2 size = hb < 0.7 ? vec2(0.42, 0.6) : vec2(0.62, 0.44);
                vec2 b = (g - vec2(roomW * (0.08 + 0.6 * fract(hb * 7.0)) + float(i) * 0.3, 0.4 + 1.1 * fract(hb * 13.0))) / size;
                if (b.x > 0.0 && b.x < 1.0 && b.y > 0.0 && b.y < 1.0) {
                  vec3 paper = hb < 0.55 ? vec3(0.8, 0.76, 0.62) : (hb < 0.7 ? vec3(0.85, 0.7, 0.1) : (hb < 0.85 ? vec3(0.8, 0.2, 0.35) : vec3(0.15, 0.6, 0.7)));
                  float block = step(0.5, b.y) * step(b.y, 0.9) * step(0.1, b.x) * step(b.x, 0.9);
                  float lines = step(0.1, b.y) * step(b.y, 0.42) * step(abs(fract(b.y * 9.0) - 0.5), 0.2) * step(0.1, b.x) * step(b.x, 0.25 + 0.65 * hash12(vec2(floor(b.y * 9.0), hb)));
                  vec3 bill = mix(paper, mix(vec3(0.05), neonOf(hb * 5.0) * 0.5, step(0.5, fract(hb * 29.0))), max(block, lines));
                  bill = mix(bill, paper, block * step(length((b - vec2(0.5, 0.7)) * size), 0.09));
                  col = mix(col, bill * (vec3(0.06) + street * 0.8) + col * 0.12, gl);
                }
              }
              if (fract(shop * 37.0) < 0.45 && py < 0.2) {
                float bars = step(0.25, fract(g.x * 2.2)) * step(abs(py - 0.1), 0.045) * step(0.2, hash12(vec2(floor(g.x * 2.2), shop)));
                col = mix(col, mix(L * 0.14, vec3(0.85, 0.82, 0.75) * 0.4, bars), gl * 0.85);
              }
              if (gs < 0.35) {
                vec2 c = g - vec2(roomW * (0.3 + 0.4 * fract(gs * 17.0)), 1.95);
                vec2 e = abs(c) - vec2(0.3, 0.1);
                float rb = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
                float loop = 1.0 - smoothstep(0.012, 0.03, abs(rb - 0.05));
                float dash = step(abs(c.y), 0.035) * step(abs(c.x), 0.2) * step(0.3, fract(c.x * 9.0));
                col += neonOf(shop * 5.3 + gs) * (loop * 1.3 + dash * 0.9) * gl;
              }
              float drop = fract(shop * 53.0);
              float foot = GLASS * (0.45 + 0.3 * fract(drop * 31.0));
              if (drop < 0.14 && py > foot) {
                vec3 slat = vec3(0.1, 0.1, 0.115) * (0.7 + 0.3 * smoothstep(0.0, 0.6, fract(py / 0.085))) * (1.0 + 0.5 * step(py, foot + 0.06));
                col = mix(col, slat * (vec3(0.14) + street * 1.15), gl);
              }
            }
            // Mullions down the glass and a transom rail across it.
            float module = 1.3 + 0.7 * fract(shop * 17.0);
            float mu = fract(ax / module) * module;
            float frame = max(step(mu, 0.03) + step(module - 0.03, mu), step(abs(py - 2.25), 0.03) * step(0.5, fract(shop * 23.0)));
            col = mix(col, vec3(0.012), clamp(frame, 0.0, 1.0));
          }
          // The glass: at a glancing angle it gives back the street.
          float fres = pow(max(1.0 - facing, 0.0), 4.0);
          col = col * (1.0 - 0.55 * fres) + street * (0.03 + 0.4 * fres);
          col = cityFog(col, vWorld, 0.8);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    // Deal each shop mesh's panes their trades the first time it is drawn
    // (its district's signs are posted by then). The colours it rewrites
    // reach the card on the next frame.
    m.onBeforeRender = (_renderer, _scene, _camera, geometry, object) => {
      if (dealt.has(geometry)) return;
      dealt.add(geometry);
      if (object.isInstancedMesh) return;
      const got = dealTrades(geometry, object);
      trades.panes += got.panes;
      trades.signed += got.signed;
    };
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
        ${VNOISE}
        ${GROUND}
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
        vec3 skyIn(vec3 r, float near) {
          vec3 zenith = vec3(0.006, 0.005, 0.012);
          vec3 horizon = hazeAt(r) * 0.55 + glowAt(r) * 0.35;
          vec3 sky = mix(horizon, zenith, smoothstep(0.0, 0.55, r.y));
          float cloud = 0.5 + 0.5 * sin(r.x * 6.0 + r.z * 4.0 + r.y * 13.0) * sin(r.x * 2.3 - r.z * 3.1);
          sky += uHazeColor * 0.35 * cloud * smoothstep(0.04, 0.3, r.y) * (1.0 - smoothstep(0.35, 0.8, r.y));
          vec3 below = uFogColor * 0.4 + uHazeColor * 0.1 * exp(min(r.y, 0.0) * 9.0);
          vec3 col = mix(below, sky, smoothstep(-0.02, 0.02, r.y)) + cityGlow(r, max(r.y, 0.0) * 600.0) * 0.45;
          // The towers opposite: their lit windows, low in the reflection.
          // (Near, each is a small soft light in its cell, not the cell: a
          // whole cell lit was a block of colour half a pane wide.)
          vec2 cg = vec2(atan(r.z, r.x) * 90.0, r.y * 160.0);
          vec2 cell = floor(cg);
          float w = hash12(cell);
          vec2 cf = abs(fract(cg) - 0.5);
          float dotIn = (1.0 - smoothstep(0.1, 0.22, cf.x)) * (1.0 - smoothstep(0.14, 0.3, cf.y)) * 1.6;
          float city = step(0.9, w) * (1.0 - smoothstep(0.02, 0.28, r.y)) * step(-0.25, r.y) * mix(1.0, dotIn, near);
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
          // Only a tower's own walls (its 26 m footprint) take its colour and
          // its lit floors: another block's glass is nearest some tower too.
          float own = step(max(abs(rel.x), abs(rel.y)), 13.6);
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
          float tenantOn = step(hash12(vec2(tenant, seed + 0.5)), vColor.r + 0.25 * tlit * own);
          float tone = hash12(vec2(tenant, seed + 3.7));
          vec3 L = vec3(0.74, 0.87, 1.0);
          if (tone > 1.0 - 0.5 * vColor.g) L = vec3(1.0, 0.76, 0.5);
          else if (tone > 0.7) L = vec3(0.96, 0.95, 0.88);
          // A block that is no tower of the row (the plaza's, the campus's)
          // has one light, the builder's warm or cool, and a tenant in eight
          // the other: floor by floor in three colours it was bands of
          // colour from across a square.
          if (own < 0.5) L = (vColor.g > 0.45) != (tone > 0.88) ? vec3(1.0, 0.76, 0.5) : vec3(0.74, 0.87, 1.0);
          // Some floors brighter than others: a late shift, the cleaners.
          L *= 0.75 + 0.6 * hash12(vec2(tenant, seed + 9.1));

          // Into the floor: x along the facade, y up from the floor, z in.
          vec3 V = normalize(vWorld - uCam);
          // Within a hundred metres or so the wall is looked at, not past:
          // what follows marked near is drawn for that and fades out by
          // 150 m, so the row's towers from across the city are as they were.
          float near = 1.0 - smoothstep(90.0, 150.0, length(vWorld - uCam));
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
            if (near > 0.0) {
              // Near: the core is a wall of rooms. Fronts 3 m wide between
              // dark posts under a head rail, a door leaf in half of them,
              // one in four lit harder and one in five dim, and a cove of
              // light along the ceiling's edge. Seen level from across a
              // street this wall is most of what a lit floor shows.
              float hb = hash12(vec2(floor(h.x / 3.0), level * 3.1 + seed));
              float fx = fract(h.x / 3.0) * 3.0;
              vec3 fronts = L * (0.24 + 0.2 * smoothstep(0.0, CLEAR, h.y)) * (hb > 0.72 ? 1.5 : (hb < 0.2 ? 0.45 : 1.0));
              fronts = mix(fronts, fronts * 0.3, step(abs(fx - 1.5), 0.42) * step(h.y, 2.12) * step(0.5, fract(hb * 7.0)));
              fronts = mix(fronts, fronts * 0.12, clamp(step(fx, 0.09) + step(abs(h.y - 2.15), 0.035), 0.0, 1.0));
              fronts += L * 0.5 * step(CLEAR - 0.12, h.y);
              room = mix(room, fronts, near);
            }
          } else if (d.y > 0.0) {
            // The ceiling's grid of panels, faded to its average where it
            // would shimmer.
            vec2 g = vec2(h.x / 1.5, h.z / 1.2);
            vec2 c = abs(fract(g) - 0.5);
            float aa = clamp(max(fwidth(g.x), fwidth(g.y)) * 1.5, 0.0, 1.0);
            float panel = mix(step(c.x, 0.36) * step(c.y, 0.12), 0.17, aa);
            float deep = 1.0 - 0.55 * smoothstep(0.0, DEEP, h.z);
            room = L * (0.26 + 1.25 * panel) * deep;
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
            // (Near, fewer are on and none is the brightest thing on the
            // floor: a row of them all lit was a line of blue blocks.)
            room += vec3(0.45, 0.72, 1.0) * screen * desk * mix(0.25, 0.9, on) * mix(1.0, 0.45 * step(0.5, hash12(vec2(slot * 2.7, level * 1.9 + seed))), near);
            // Now and then somebody at the glass, working late.
            float who = hash12(vec2(floor(f.x / 9.0), level + seed * 5.1));
            float fx = f.x - (floor(f.x / 9.0) + 0.2 + 0.6 * fract(who * 7.0)) * 9.0;
            float body = step(abs(fx), 0.22) * step(f.y, 1.45) + step(length(vec2(fx, f.y - 1.62)), 0.12);
            room = mix(room, room * 0.08, clamp(body, 0.0, 1.0) * step(0.8, who) * on);
          }
          if (near > 0.0) {
            // Near: a column every 9 m, five metres in, and somebody
            // crossing the floor behind the desks.
            float tc = 5.0 / d.z;
            vec3 f = p + d * tc;
            float walker = hash12(vec2(floor(f.x / 9.0), level + seed * 7.7));
            float wx = f.x - (floor(f.x / 9.0) + 0.25 + 0.5 * fract(walker * 5.0)) * 9.0;
            float body = clamp(step(abs(wx), 0.21) * step(f.y, 1.48) + step(length(vec2(wx, f.y - 1.64)), 0.11), 0.0, 1.0) * step(0.55, walker);
            if (tc < tm) room = mix(room, room * 0.1, near * max(step(abs(fract(f.x / 9.0) - 0.5), 0.028), body * on));
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
          vec3 env = skyIn(R, near);

          // The tower's colour on it: beside its fins, up from its lobby,
          // down from its crown.
          float fin = exp(-edge / 1.3);
          float up = exp(-max(vWorld.y - BASE, 0.0) / 9.0);
          float crown = exp(-max(top - vWorld.y, 0.0) / 6.0);
          vec3 wash = accent * (fin * (0.05 + 0.8 * tlit) + up * (0.1 + 0.25 * tlit) + crown * (0.03 + 0.6 * tlit) + 0.06 * tlit) * own;

          vec3 glass = room * vec3(0.72, 0.84, 0.9) * (1.0 - F) + env * F + wash * (0.06 + 0.5 * F);

          // Mullions and transoms, 7 cm, and the spandrel at the slab: dark
          // metal and back-painted glass, catching the sky and the wash.
          // (The street's light on them through the smooth filter: read
          // straight, the map's 1.5 m cells stood on the wall as blocks of
          // colour.)
          vec3 street = spillGround(vWorld);
          vec3 frameCol = vec3(0.016, 0.017, 0.022) + env * 0.35 + wash * 0.55 + street * 0.3;
          vec3 spandrel = vec3(0.012, 0.013, 0.018) + env * (0.15 + 0.6 * F) + wash * 0.4 + street * 0.2;
          spandrel *= 0.8 + 0.2 * step(0.08, abs(inFloor - SILL * 0.5));
          float mx = fract(module);
          float mw = fwidth(module);
          float fw = fwidth(fy);
          // Near, a bar is never drawn thinner than about a pixel (thinner,
          // it is drawn that wide and fainter), and the grid holds until a
          // bay is a few pixels: the module is what says curtain wall.
          float mhw = max(0.035, 0.55 * mw * MODULE);
          float thw = max(0.04, 0.55 * fw * STOREY);
          float mull = mix(step(min(mx, 1.0 - mx) * MODULE, mhw) * clamp(0.035 / mhw + 0.35, 0.0, 1.0), 0.05, smoothstep(mix(0.02, 0.1, near), mix(0.06, 0.28, near), mw));
          float trans = mix((step(abs(inFloor - SILL), thw) + step(STOREY - inFloor, thw)) * clamp(0.04 / thw + 0.35, 0.0, 1.0), 0.02, smoothstep(mix(0.01, 0.05, near), mix(0.03, 0.14, near), fw));
          float slab = mix(step(inFloor, SILL), SILL / STOREY, smoothstep(0.08, 0.3, fw));
          vec3 col = mix(glass, frameCol, clamp(mull + trans, 0.0, 1.0));
          col = mix(col, spandrel, slab);

          // Far off, a floor's average rather than a pattern that shimmers.
          float litAvg = min(vColor.r + 0.25 * tlit * own, 1.0) * 0.76;
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

  // A tower's lobby, seen through its glass: a double-height hall traced in
  // the fragment, as the shops and the offices are (the eye's ray into a box
  // 24.8 m wide, as tall as the glass and nine metres deep). Overhead a grid
  // of light panels, which the polished floor holds again, softer; at the
  // back the lift core's stone, its doors in a row and a band of the
  // tower's own colour across it (brighter while its card is read); a
  // reception desk in the middle with a lit edge; three columns a couple of
  // metres in, which the hall moves behind as the camera passes; and now and
  // then somebody crossing it. Mullions every 2 m and a transom, as before,
  // and about as bright as before overall, so the light the city bakes
  // from it onto the boulevard is the same.
  const lobby = () => {
    if (made.has("lobby")) return made.get("lobby");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        ${HALL}
        uniform vec3 uTowerAccent[8];
        uniform float uTowerLit[8];
        uniform vec2 uTowerCentre[8];
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        const float W = 24.8;
        const float H = 7.85;
        const float D = 9.0;
        // The ceiling's panels at a point of the ceiling, faded to their
        // average where they would shimmer.
        float panels(vec2 c) {
          vec2 g = c / vec2(1.55, 1.2);
          vec2 f = abs(fract(g) - 0.5);
          float aa = clamp(max(fwidth(g.x), fwidth(g.y)) * 1.5, 0.0, 1.0);
          return mix(step(f.x, 0.38) * step(f.y, 0.3), 0.35, aa);
        }
        void main() {
          vec3 n = normalize(vec3(vNormalW.x, 0.0, vNormalW.z));
          vec3 t = vec3(n.z, 0.0, -n.x);
          int ti = 0;
          float best = 1e9;
          for (int i = 0; i < 8; i++) {
            float dd = abs(vWorld.x - uTowerCentre[i].x);
            if (dd < best) { best = dd; ti = i; }
          }
          vec3 accent = uTowerAccent[ti];
          float tlit = uTowerLit[ti];
          float along = dot(vWorld.xz - uTowerCentre[ti], t.xz);
          float h = clamp((vWorld.y - 0.15) / H, 0.0, 1.0);
          vec3 light = mix(vec3(0.86, 0.93, 1.0), vec3(1.0, 0.84, 0.64), step(0.6, vColor.g));
          float seed = vColor.r * 37.0 + float(ti) * 3.1;

          // Into the hall: x along the glass from its left end, y up, z in.
          vec3 V = normalize(vWorld - uCam);
          vec3 d = vec3(dot(V, t), V.y, max(-dot(V, n), 1e-3));
          // A pane that counts its own metres is no tower's hall: a depot's
          // way in, a block's street door (src/world/interiors.js). Before
          // this it was drawn as the far end of a tower's hall a district
          // away: six blank cream panes.
          float run = dot(vWorld, t);
          float metres = abs(dFdx(run)) + abs(dFdy(run));
          if (abs(dFdx(vUv.x)) + abs(dFdy(vUv.x)) > 0.5 * metres) {
            float way = dFdx(run) * dFdx(vUv.x) + dFdy(run) * dFdy(vUv.x) < 0.0 ? -1.0 : 1.0;
            vec2 at = vec2(vUv.x, 1.0 - vUv.y);
            float own = vColor.r * 37.0 + vColor.g * 11.0;
            vec3 house = fract(own * 0.37) < 0.34 ? vec3(0.15, 0.86, 0.95) : (fract(own * 0.37) < 0.67 ? vec3(1.0, 0.62, 0.2) : vec3(0.22, 1.0, 0.6));
            vec3 hc = hall(at, vec3(d.x * way, d.y, d.z), own, light, house);
            float bar = fract(at.x / 2.0);
            hc = mix(hc, vec3(0.015), clamp(step(bar, 0.02) + step(0.98, bar), 0.0, 1.0));
            float glance = pow(1.0 - abs(dot(V, n)), 4.0);
            hc = hc * (1.0 - 0.5 * glance) + (spillAt(vWorld) * 0.3 + uHazeColor * 0.1) * glance;
            gl_FragColor = vec4(cityFog(hc, vWorld, 0.8), 1.0);
            ${OUT}
            return;
          }
          vec3 p = vec3(clamp(along + W * 0.5, 0.0, W), h * H, 0.0);
          float tx = d.x > 0.0 ? (W - p.x) / d.x : -p.x / min(d.x, -1e-4);
          float ty = d.y > 0.0 ? (H - p.y) / d.y : -p.y / min(d.y, -1e-4);
          float tz = D / d.z;
          float tm = min(min(tx, ty), tz);
          vec3 hit = p + d * tm;
          vec3 col;
          if (tm == tz) {
            // The core: dark stone, lift doors in a row (a seam of light
            // round each), and the tower's colour in a band across it.
            col = light * (0.3 + 0.14 * smoothstep(0.0, H, hit.y));
            float door = abs(fract((hit.x - 2.0) / 3.4) - 0.5) * 3.4;
            float seam = step(abs(door - 0.75), 0.04) * step(hit.y, 2.6) + step(abs(hit.y - 2.62), 0.04) * step(door, 0.79);
            col = mix(col, light * 0.08, step(door, 0.72) * step(hit.y, 2.6) * 0.5);
            col += light * seam * 1.1;
            col += accent * (0.6 + 2.2 * tlit) * step(abs(hit.y - 4.3), 0.28);
            // Behind the desk, the house's wall: a lit panel, its mark on
            // it in the tower's colour (a broken ring, three bars, a
            // diamond or two rings, by the tower), a line of lettering under.
            vec2 w = vec2(hit.x - W * 0.5, hit.y - 4.45);
            if (abs(w.x) < 3.1 && abs(w.y) < 1.45) {
              vec2 k = w - vec2(0.0, 0.25);
              float which = mod(float(ti), 4.0);
              float r = length(k);
              float mark = which < 0.5 ? step(abs(r - 0.52), 0.11) * step(0.16, abs(k.x - k.y) * 0.7) + step(r, 0.16)
                         : (which < 1.5 ? step(abs(k.x), 0.54) * step(abs(fract(k.x / 0.36 + 0.5) - 0.5), 0.3) * step(-0.6, k.y) * step(k.y, -0.1 + 0.35 * floor(k.x / 0.36 + 1.5))
                         : (which < 2.5 ? step(abs(abs(k.x) + abs(k.y) - 0.5), 0.12) + step(abs(k.x) + abs(k.y), 0.16)
                         : step(abs(length(k - vec2(0.24, 0.0)) - 0.42), 0.09) + step(abs(length(k + vec2(0.24, 0.0)) - 0.42), 0.09)));
              float name = step(abs(w.y + 0.92), 0.07) * step(abs(w.x), 1.5) * step(0.22, fract(w.x * 3.6)) * step(0.15, hash12(vec2(floor(w.x * 3.6), float(ti))));
              col = mix(light * 0.78, accent * 0.55 + light * 0.02, clamp(mark + name, 0.0, 1.0));
              col *= 1.0 - 0.6 * step(3.02, abs(w.x)) - 0.6 * step(1.39, abs(w.y));
            }
          } else if (tm == ty && d.y > 0.0) {
            col = light * (0.34 + 1.05 * panels(hit.xz));
          } else if (tm == ty) {
            // The floor, polished: the ceiling again, softer, and darker
            // toward the back.
            vec3 m2 = hit + vec3(d.x, -d.y, d.z) * ((H) / max(-d.y, 1e-3));
            col = light * (0.16 + 0.42 * panels(m2.xz)) * (1.0 - 0.35 * hit.z / D);
          } else {
            col = light * (0.26 + 0.12 * smoothstep(0.0, H, hit.y));
          }
          // What stands in the hall, from the back of it forward, each a
          // flat shape at its own depth (so they slide past each other as
          // the eye moves along the glass). Whoever is on the desk
          // tonight, head and shoulders over its top.
          float hs = hash12(vec2(seed, 7.0));
          float tr = 5.3 / d.z;
          if (tr < tm) {
            vec3 q = p + d * tr;
            float fx = q.x - W * 0.5 - 2.2 * (hs - 0.5);
            col = mix(col, col * 0.05, max(step(abs(fx), 0.25) * step(q.y, 1.5), step(length(vec2(fx, q.y - 1.67)), 0.12)));
          }
          // The desk, mid-hall: stone, a strip of the tower's colour let
          // into its front, light under its foot and along its top, and
          // two screens stood on it.
          float tdk = 4.6 / d.z;
          if (tdk < tm) {
            vec3 q = p + d * tdk;
            float dx = q.x - W * 0.5;
            if (abs(dx) < 3.6 && q.y < 1.1) {
              col = light * (0.03 + 0.02 * step(0.04, fract(dx / 1.2))) + accent * 0.4 * step(abs(q.y - 0.55), 0.05) + light * 1.2 * step(1.02, q.y) + light * 0.7 * step(q.y, 0.06);
            } else if (abs(abs(dx - 0.4) - 1.5) < 0.3 && abs(q.y - 1.36) < 0.2) {
              col = light * 0.015;
            }
          }
          // Somebody at the desk, and somebody crossing the hall now and
          // then, against the light.
          for (int i = 0; i < 2; i++) {
            float zf = i == 0 ? 4.1 : 3.0 + 0.9 * hash12(vec2(seed, 2.0));
            float tf = zf / d.z;
            if (tf >= tm) continue;
            vec3 q = p + d * tf;
            float fx = q.x - (i == 0 ? W * 0.5 + 2.4 - 4.4 * step(0.5, hs) : mix(-2.0, W + 2.0, fract(uTime * 0.035 + hash12(vec2(seed, 5.0)))));
            float body = step(abs(fx), 0.22 - 0.05 * smoothstep(1.05, 1.45, q.y)) * step(q.y, 1.48);
            col = mix(col, col * 0.06, max(body, step(length(vec2(fx, q.y - 1.63)), 0.11)));
          }
          // Seating by the glass at one end: two sofas, a low table with
          // a lamp between them, and somebody sat waiting.
          float ts = 2.9 / d.z;
          if (ts < tm) {
            vec3 q = p + d * ts;
            float sx = hs < 0.5 ? q.x - 2.0 : W - 2.0 - q.x;
            float sofa = abs(mod(sx, 2.7) - 1.1);
            if (sx > 0.0 && sx < 4.9 && q.y < 0.86) {
              if (sofa < 1.1) col = light * (0.035 + 0.1 * step(abs(q.y - 0.44), 0.02) + 0.16 * step(0.83, q.y)) + accent * 0.05;
              else if (q.y < 0.4) col = light * 0.07;
            }
            if (abs(sx - 2.45) < 0.09 && abs(q.y - 0.62) < 0.2) col = vec3(1.0, 0.8, 0.5) * (1.3 - 2.0 * abs(q.y - 0.62));
            float fx = sx - 0.9 - 2.7 * step(0.5, fract(hs * 7.0));
            col = mix(col, col * 0.06, max(step(abs(fx), 0.21) * step(0.3, q.y) * step(q.y, 0.98), step(length(vec2(fx, q.y - 1.12)), 0.11)));
          }
          // Columns, two metres in.
          float tc = 2.0 / d.z;
          if (tc < tm) {
            vec3 q = p + d * tc;
            float k = mod(q.x - W / 6.0, W / 3.0);
            if (min(k, W / 3.0 - k) < 0.42) col = light * (0.1 + 0.08 * smoothstep(0.0, H, q.y));
          }
          // A plant in its tub at each end, against the glass.
          float tp = 1.4 / d.z;
          if (tp < tm) {
            vec3 q = p + d * tp;
            vec2 g = vec2(min(abs(q.x - 1.3), abs(q.x - W + 1.3)), q.y);
            if (g.x < 1.1 && g.y < 2.5) {
              float leaf = 0.0;
              for (int i = 0; i < 5; i++) {
                float a = (float(i) - 2.0) * 0.36 + 0.1 * sin(float(i) * 5.0 + seed);
                vec2 tip = vec2(sin(a), cos(a)) * (1.25 + 0.3 * cos(float(i) * 3.0 + seed));
                vec2 pa = g - vec2(0.0, 0.55);
                float along = clamp(dot(pa, tip) / dot(tip, tip), 0.0, 1.0);
                leaf = max(leaf, step(length(pa - tip * along), 0.1 * sin(along * 3.1) + 0.012));
              }
              // (Both sides of the stem: the tub's own half is mirrored.)
              col = mix(col, light * vec3(0.03, 0.1, 0.05), leaf);
              if (g.x < 0.3 && g.y < 0.55) col = light * (0.04 + 0.14 * step(0.52, g.y));
            }
          }
          // The glass: its mullions every 2 m and its transom, and at a
          // glancing angle a little of the street.
          float mu = fract(dot(vWorld, t) / 2.0);
          float frame = step(mu, 0.02) + step(0.98, mu) + step(abs(h - 0.56), 0.012);
          col = mix(col, vec3(0.015), clamp(frame, 0.0, 1.0));
          float fres = pow(1.0 - abs(dot(V, n)), 4.0);
          col = col * (1.0 - 0.5 * fres) + (spillAt(vWorld) * 0.3 + uHazeColor * 0.1) * fres;
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

  // A paper lantern: hot through its belly but never past white (its red
  // and its ribs are its shape), dim at the rims, and a dark cap. The kit's cylinder runs v up its side
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
          vec3 col = uColor * (0.22 + 1.25 * belly * belly) * ribs * (1.0 + 0.3 * uBass);
          col += vec3(1.0, 0.75, 0.4) * pow(belly, 6.0) * 0.35;
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

  // Light high over the street (a rooftop sign, a stair hut's door, an
  // antenna's lamp): neon's flat HDR colour, breathing with the kick and
  // now and then dropping a tube for a frame, each piece's colour on its
  // vertices so all of it is one draw. src/world/city.js leaves it out of
  // the light it bakes onto the ground and the road, which a sign forty
  // metres up does not reach.
  const glow = () => {
    if (made.has("glow")) return made.get("glow");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uIntensity: { value: 2.4 }, uFlicker: { value: reduced ? 0 : 1 } },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uIntensity;
        uniform float uFlicker;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          float t = floor(uTime * 12.0);
          float cut = step(0.993, hash12(vec2(t, floor(vWorld.x * 0.3 + vWorld.z * 0.2)))) * uFlicker;
          float breathe = 1.0 + 0.45 * uBass + 0.15 * uLevel;
          vec3 col = vColor.rgb * uIntensity * breathe * (1.0 - 0.8 * cut);
          col = cityFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "glow";
    made.set("glow", m);
    return m;
  };

  // A roof light: glass lit from the room under it, each pane its own
  // brightness between glazing bars 1.2 m apart (drawn in world space, so
  // it needs no UVs), dimmer toward its frame, and never past white: from
  // the air it is a lit window with a shape, not a clipped quad.
  // Glass a walker sees through: a balustrade's panels, the panes of a roof
  // over a concourse. Dark blue-teal and almost clear square on, a mirror
  // edge on, where it gives back the sky's glow and whatever light stands
  // down its ray; the builder's vertex colour tints it (none is white).
  const clearGlass = () => {
    if (made.has("clearglass")) return made.get("clearglass");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, ...MIRROR_UNIFORMS },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        ${VNOISE}
        ${GROUND}
        uniform sampler2D uReflect;
        uniform mat4 uReflectMatrix;
        uniform float uReflectOn;
        uniform float uReflectGain;
        uniform float uMirrorY;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec4 vColor;
        void main() {
          vec3 v = normalize(uCam - vWorld);
          vec3 n = normalize(vNormalW);
          n *= sign(dot(n, v) + 1e-4);
          float nv = clamp(dot(n, v), 0.0, 1.0);
          float fres = 0.05 + 0.95 * pow(1.0 - nv, 4.0);
          vec3 r = reflect(-v, n);
          vec3 tint = mix(vec3(1.0), vColor.rgb, step(0.004, dot(vColor.rgb, vec3(1.0))));
          vec3 sky = mix(vec3(0.030, 0.050, 0.085), vec3(0.085, 0.060, 0.130), smoothstep(-0.1, 0.7, r.y));
          vec3 street = spillAt(vWorld + r * 5.0) * 0.5 + spillAt(vWorld) * 0.12;
          float alpha = 0.30 + 0.62 * fres;
          if (n.y > 0.9 && abs(vWorld.y) < 1.0) {
            // A pane lying flat within a metre of the ground (the plaza's
            // hub) is a mirror to anyone crossing beside it: the wet
            // ground's own planar mirror where one is drawn (the signs, the
            // board, the koi are in it, found by the ray's direction as the
            // road finds them), and without one the baked light along the
            // ray, as strong as glass gives a light back and not as a road
            // does.
            // (The mirror is the ground's unless the eye is up on the deck.)
            float mk = uReflectOn * clamp(uReflectGain / 2.2, 0.0, 1.0) * step(uMirrorY, 0.5);
            // (The baked light is a wash with no shapes in it: kept dark,
            // pushed toward its colour and drawn out along the look in
            // streaks, it is lights on dark glass and not a pale pane.)
            vec3 baked = tame(spillReflect(vWorld, r) * 0.26, 1.0);
            baked = max(mix(vec3(dot(baked, vec3(0.3, 0.55, 0.15))), baked, 1.6), 0.0);
            vec2 rd = normalize(r.xz + 1e-5);
            baked *= 0.35 + 1.3 * vnoise(vec2(dot(vWorld.xz, vec2(-rd.y, rd.x)) * 1.4, dot(vWorld.xz, rd) * 0.09));
            vec3 seen = baked;
            if (mk > 0.001) {
              vec4 a = uReflectMatrix * vec4(r, 0.0);
              seen = mix(baked, textureLod(uReflect, a.xy / a.w, 0.0).rgb * 1.7, mk);
            }
            fres = 0.2 + 0.8 * pow(1.0 - nv, 2.0);
            street = seen;
            sky *= 0.5;
            alpha = 0.55 + 0.42 * fres;
          }
          vec3 col = vec3(0.006, 0.022, 0.030) * tint + (sky + street) * fres * tint;
          col = cityFog(col, vWorld, 0.8);
          gl_FragColor = vec4(col, alpha);
          ${OUT}
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    m.name = "clearglass";
    made.set("clearglass", m);
    return m;
  };

  const skylight = () => {
    if (made.has("skylight")) return made.get("skylight");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uColor: { value: new THREE.Color("#ffe2b8") } },
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uColor;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          vec2 g = vWorld.xz / 1.2;
          vec2 f = abs(fract(g) - 0.5);
          float aa = clamp(max(fwidth(g.x), fwidth(g.y)) * 2.0, 0.0, 1.0);
          float bar = mix(smoothstep(0.44, 0.47, max(f.x, f.y)), 0.12, aa);
          float pane = hash12(floor(g) + 2.7);
          vec3 tone = mix(uColor, vec3(0.72, 0.86, 1.0), step(0.8, pane));
          vec3 col = tone * (0.3 + 0.55 * pane) * (1.0 - 0.6 * smoothstep(0.2, 0.5, max(f.x, f.y)) * (1.0 - aa));
          col = mix(col, vec3(0.012, 0.013, 0.016), bar);
          col = cityFog(col, vWorld, 0.8);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "skylight";
    made.set("skylight", m);
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
  // A billboard with no words: the city's adverts as the far city draws its
  // screens, two of the city's colours in a slow gradient, a shape that
  // breathes (a circle, an eye's rings, a can, a chevron, a face's outline,
  // a koi's arc), bars of something like lettering under it, a lit frame;
  // each board its own (its colour's palette, shape and seed), changing to
  // another every nine to fifteen seconds through a quick wipe. One draw for
  // every billboard in the city.
  // The adverts: twenty-four drawn for the city (sixteen wide, eight tall, one
  // atlas: public/scenes/world/ads.webp, a quarter the pixels on a phone,
  // told by the shop atlas's own size). It is fetched after the city is up;
  // until it lands a board shows the old drawn shapes.
  const billboard = () => {
    if (made.has("billboard")) return made.get("billboard");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uIntensity: { value: 1.6 }, ...adverts() },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uIntensity;
        uniform sampler2D uAds;
        uniform float uHasAds;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        vec3 pal(float i) {
          i = mod(floor(i), 8.0);
          if (i < 0.5) return vec3(1.0, 0.18, 0.53);
          if (i < 1.5) return vec3(0.15, 0.86, 0.95);
          if (i < 2.5) return vec3(1.0, 0.7, 0.33);
          if (i < 3.5) return vec3(0.64, 0.29, 1.0);
          if (i < 4.5) return vec3(0.22, 1.0, 0.6);
          if (i < 5.5) return vec3(1.0, 0.24, 0.82);
          if (i < 6.5) return vec3(0.18, 0.42, 1.0);
          return vec3(0.99, 0.93, 0.04);
        }
        float shape(vec2 p, float k) {
          float r = length(p);
          if (k < 0.5) return smoothstep(0.42, 0.38, r);
          if (k < 1.5) return smoothstep(0.03, 0.0, abs(r - 0.36)) + smoothstep(0.03, 0.0, abs(r - 0.22)) + smoothstep(0.1, 0.07, r);
          if (k < 2.5) return step(abs(p.x), 0.16) * step(abs(p.y), 0.38) * (0.7 + 0.3 * step(abs(p.y), 0.3));
          if (k < 3.5) return smoothstep(0.05, 0.0, abs(abs(p.x) * 0.8 - (p.y + 0.25) * 0.6)) * step(abs(p.x), 0.4);
          if (k < 4.5) return smoothstep(0.03, 0.0, abs(length(p / vec2(0.75, 1.0)) - 0.36));
          return smoothstep(0.04, 0.0, abs(length(p - vec2(0.0, -0.6)) - 0.8)) * step(abs(p.x), 0.45);
        }
        void main() {
          vec2 uv = vUv;
          float seed = vColor.b * 97.0;
          // The board's own frame, from how the world moves across it and
          // not from which way its UVs happen to run: across it from the
          // left as somebody in front of it sees it, and up it from its
          // foot. (A builder's quad counts v down from the top, another's
          // may count either the other way or have them turned: an advert
          // sampled by the raw UVs hung head down on every board.)
          vec3 dpx = dFdx(vWorld), dpy = dFdy(vWorld);
          vec2 dux = dFdx(vUv), duy = dFdy(vUv);
          float det = dux.x * duy.y - dux.y * duy.x;
          vec3 pu = vec3(1.0, 0.0, 0.0);
          vec3 pv = vec3(0.0, -1.0, 0.0);
          if (abs(det) > 1e-12) {
            pu = (dpx * duy.y - dpy * dux.y) / det;
            pv = (dpy * dux.x - dpx * duy.x) / det;
          }
          vec3 nb = normalize(vNormalW);
          // (A board lying flat has no up: its own u is its right.)
          vec3 right = abs(nb.y) > 0.95 ? normalize(pu) : normalize(cross(vec3(0.0, 1.0, 0.0), nb));
          vec3 upward = abs(nb.y) > 0.95 ? -normalize(pv) : vec3(0.0, 1.0, 0.0);
          bool turned = abs(dot(pu, right)) < abs(dot(pv, right));
          vec3 pa = turned ? pv : pu;
          vec3 pb = turned ? pu : pv;
          vec2 fu = fract(uv);
          vec2 st = turned ? fu.yx : fu;
          if (dot(pa, right) < 0.0) st.x = 1.0 - st.x;
          if (dot(pb, upward) < 0.0) st.y = 1.0 - st.y;
          vec2 size = vec2(length(pa), length(pb));
          // Which board this is: where its left edge and its foot stand and
          // the plane it hangs in, the same number all across it. Boards
          // side by side or one over another are dealt adverts seven apart
          // in the sixteen (three apart in the eight tall ones), so the same
          // advert is not twice within six boards; all turn over on one
          // twelve second round, each at its own moment in it, so that
          // holds while they change.
          vec3 foot = vec3(dot(vWorld, right) - st.x * size.x, dot(vWorld, upward) - st.y * size.y, dot(vWorld, nb));
          float board = floor(foot.x / 4.0 + 0.412) * 7.0 + floor(foot.y / 4.0 + 0.412) * 5.0 + floor(foot.z / 4.0 + 0.412) * 3.0;
          float turn = uTime / 12.0 + fract(seed * 0.618 + board * 0.37);
          float slot = floor(turn);
          float local = fract(turn);
          float h = hash12(vec2(slot, seed));
          vec3 a = pal(vColor.r * 8.0 + slot);
          vec3 b = pal(vColor.r * 8.0 + slot + 3.0 + floor(h * 3.0));
          vec3 bg = mix(a * 0.35, b * 0.6, smoothstep(0.0, 1.0, uv.y + 0.2 * sin(uv.x * 3.0 + uTime * 0.2 + seed)));
          // The subject: a shape, breathing, a little off centre.
          vec2 p = (uv - vec2(0.5 + 0.18 * (h - 0.5), 0.62)) * vec2(2.2, 1.6);
          float k = mod(floor(vColor.g * 8.0) + slot, 6.0);
          float sh = clamp(shape(p * (1.0 + 0.04 * sin(uTime * 1.3 + seed)), k), 0.0, 1.0);
          vec3 col = mix(bg, mix(a, vec3(1.0), 0.35), sh * 0.9);
          // Bars like lettering along the bottom third.
          vec2 g = vec2(uv.x * 9.0, uv.y * 7.0);
          float row = floor(g.y);
          float bars = step(row, 1.5) * step(0.5, row) * step(0.35, hash12(vec2(floor(g.x), row + slot * 7.0 + seed))) * step(0.15, fract(g.x)) * step(fract(g.y), 0.6);
          col = mix(col, vec3(1.0, 0.97, 0.92), bars * 0.85);
          float px = max(fwidth(uv.x), fwidth(uv.y));
          if (uHasAds > 0.5) {
            // A drawn advert in place of the shapes. The art covers the
            // face uncropped in one direction and is never stretched: a
            // wide face takes one of the sixteen wide adverts, a tall one
            // of the eight tall (kept on their sides, head to the right,
            // in two rows under the wide ones' four in a 2048 px atlas:
            // scripts/pack-ads.mjs).
            float aspect = clamp(size.x / max(size.y, 1e-5), 0.25, 5.0);
            bool tall = aspect < 0.85;
            float cell = tall ? 0.6667 : 1.5;
            if (aspect > cell) st.y = 0.5 + (st.y - 0.5) * cell / aspect;
            else st.x = 0.5 + (st.x - 0.5) * aspect / cell;
            st = clamp(st, 0.01, 0.99);
            float pick = board + slot;
            float rowH = 341.0 / 2048.0;
            vec2 q;
            if (tall) {
              float j = mod(pick * 3.0, 8.0);
              q = vec2((mod(j, 4.0) + st.y) * 0.25, 1.0 - (1365.0 + (floor(j / 4.0) + st.x) * 341.0) / 2048.0);
            } else {
              float i = mod(pick, 16.0);
              q = vec2((mod(i, 4.0) + st.x) * 0.25, 1.0 - (floor(i / 4.0) + 1.0 - st.y) * rowH);
            }
            col = texture2D(uAds, q).rgb * 0.92;
          } else {
            // Far off, the drawn shapes' average: no pattern to shimmer.
            col = mix(col, mix(a, b, 0.5) * 0.55, smoothstep(0.06, 0.2, px));
          }
          // The lit frame round it, and the wipe between adverts.
          float frame = 1.0 - step(0.03, uv.x) * step(uv.x, 0.97) * step(0.04, uv.y) * step(uv.y, 0.96);
          col = mix(col, a * 1.4, frame * smoothstep(0.2, 0.06, px));
          float wipe = smoothstep(0.0, 0.04, local) * smoothstep(1.0, 0.97, local);
          col *= mix(0.15, 1.0, wipe);
          col *= uIntensity * (1.0 + 0.2 * uBass);
          col = cityFog(col, vWorld, 0.85);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "billboard";
    made.set("billboard", m);
    return m;
  };

  // Every tube of every colour as one material: each piece's colour on its
  // vertices and, in the alpha, whether it is one of the tubes that cut out
  // (src/world/city.js writes both when it dresses the kit), so the city's
  // neon is one draw a tile and not eleven.
  const neonAll = () => {
    if (made.has("neon_all")) return made.get("neon_all");
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { ...shared, uIntensity: { value: 2.4 }, uFlicker: { value: reduced ? 0 : 1 } },
      vertexShader: VERT_WORLD_COLOR,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uIntensity;
        uniform float uFlicker;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          // Neon does not fade, it cuts: a tube that is not quite right drops
          // out for a frame or two, seeded by its colour and its place.
          float seed = dot(vColor.rgb, vec3(37.0, 59.0, 83.0));
          float t = floor(uTime * 12.0);
          float cut = step(0.992, hash12(vec2(t, floor(vWorld.x * 0.3 + vWorld.z * 0.2) + seed))) * uFlicker * step(0.5, vColor.a);
          float breathe = 1.0 + 0.45 * uBass + 0.15 * uLevel;
          vec3 col = vColor.rgb * uIntensity * breathe * (1.0 - 0.8 * cut);
          // The avenue's four vending machines are the builder's boxes with
          // a slab of this neon for a front (0.8 m by 1.1, at the pavement's
          // edge, facing the road): a blank glowing rectangle. Each is drawn
          // as a machine's front here, from where it stands: a lit case of
          // bottles and cans on four shelves, a strip of price tickets under
          // each, and down its right side a small screen, the keys and the
          // coin slot, in a rim of the machine's own colour.
          float vz = vWorld.x < 0.0 ? (vWorld.z > -20.05 ? -19.5 : -20.6) : (vWorld.z > -50.0 ? -36.0 : -71.0);
          if (abs(abs(vWorld.x) - 13.03) < 0.03 && abs(vWorld.z - vz) < 0.405 && vWorld.y > 0.79 && vWorld.y < 1.91 && abs(vNormalW.x) > 0.5) {
            vec2 m = vec2((vWorld.z - vz) * sign(vWorld.x) + 0.4, vWorld.y - 0.8);
            vec3 hue = vColor.rgb;
            float px = fwidth(m.x) + fwidth(m.y);
            float near = 1.0 - smoothstep(0.012, 0.04, px);
            vec3 face = hue * 0.9;
            // The case: dark behind its glass, lit from its top.
            vec2 w = (m - vec2(0.035, 0.2)) / vec2(0.55, 0.86);
            if (w.x > 0.0 && w.x < 1.0 && w.y > 0.0 && w.y < 1.0) {
              vec2 g = w * vec2(6.0, 4.0);
              vec2 f = fract(g);
              float run = hash12(vec2(floor(g.x / 2.0), floor(g.y)) + vz);
              float tall = 0.55 + 0.25 * fract(run * 5.0);
              float y = (f.y - 0.16) / tall;
              float x = abs(f.x - 0.5);
              float hw = fract(run * 9.0) < 0.5 ? (y < 0.62 ? 0.34 : max(0.34 - (y - 0.62) * 1.8, 0.12)) : 0.36;
              float item = step(x, hw) * step(0.0, y) * step(y, 1.0);
              vec3 can = mix(mix(vec3(1.0, 0.18, 0.2), vec3(0.15, 0.7, 0.95), step(0.5, fract(run * 3.0))), mix(vec3(0.98, 0.8, 0.12), vec3(0.2, 0.9, 0.45), step(0.5, fract(run * 7.0))), step(0.5, fract(run * 13.0)));
              can = mix(can, vec3(0.9, 0.88, 0.82), step(abs(y - 0.4), 0.13));
              can *= 0.55 + 0.45 * smoothstep(hw, 0.0, x);
              vec3 shelf = mix(vec3(0.04, 0.045, 0.06), can * 0.8, item * near);
              shelf = mix(shelf, vec3(0.2, 0.2, 0.22), (1.0 - near) * 0.6);
              // The ticket strip, a lit line of small labels.
              shelf = mix(shelf, mix(vec3(0.75, 0.75, 0.7), vec3(0.9, 0.2, 0.1), step(abs(f.x - 0.5), 0.2) * step(0.5, fract(run * 17.0)) * near) * 0.8, step(f.y, 0.12));
              face = shelf * (0.75 + 0.5 * w.y);
            } else if (m.x > 0.625 && m.x < 0.765) {
              // The column: screen, keys, slot.
              face = vec3(0.03, 0.032, 0.04);
              vec2 c = vec2(m.x - 0.695, m.y);
              if (abs(c.x) < 0.055 && abs(c.y - 0.9) < 0.08) face = hue * (0.5 + 0.5 * step(0.5, fract(c.y * 60.0)) * near);
              vec2 key = fract(vec2(c.x / 0.036 + 0.5, (c.y - 0.52) / 0.045));
              if (abs(c.x) < 0.054 && c.y > 0.52 && c.y < 0.745) face = mix(face, vec3(0.28, 0.29, 0.31), step(0.2, key.x) * step(0.25, key.y) * near);
              if (abs(c.x) < 0.04 && abs(c.y - 0.4) < 0.012) face = vec3(1.0, 0.7, 0.25) * 1.2;
            } else if (m.y < 0.17 && m.y > 0.03 && m.x > 0.035 && m.x < 0.765) {
              // Under the case: the tray's dark mouth and a band of the mark.
              face = mix(hue * 0.35, vec3(0.012), step(abs(m.x - 0.3), 0.2) * step(abs(m.y - 0.09), 0.05));
            }
            col = face * breathe;
          }
          col = cityFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }
      `,
    }));
    m.name = "neon_all";
    made.set("neon_all", m);
    return m;
  };

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
      case "sidewalk": return surface("sidewalk", { color: "#6d6f74", map: maps.sidewalk, ambient: 0.035, spill: 1.1, paving: true, lane: true });
      // A back wall down a lane takes more paint than a shopfront does.
      // And where it is a floor (a lane, a yard, a forecourt, a deck) it is
      // poured, stained and wet, as the pavements' yards are.
      case "concrete": return surface("concrete", { color: "#6a6c71", map: maps.concrete, ambient: 0.045, spill: 1.25, wall: 0.6, paving: true });
      case "garage_wall": return surface("garage_wall", { color: "#7c7e84", map: maps.concrete, ambient: 0.07, spill: 2.2 });
      case "garage_wall_back":
      case "garage_wall_magenta":
      case "garage_wall_cyan": return maps[n] ? painted(n, maps[n], { tiled: false }) : forName("garage_wall");
      case "kerb": return surface("kerb", { color: "#4a4c52", ambient: 0.03, kerb: true });
      case "paint": return surface("paint", { color: "#b9b7ae", ambient: 0.05, spill: 1.3 });
      case "metal": return surface("metal", { color: "#34373e", ambient: 0.04, detail: "steel" });
      case "dark": return surface("dark", { color: "#121318", ambient: 0.024, spill: 0.6, detail: "steel" });
      // Tar and gravel, weathered and wet: dark, but a surface the sky's glow
      // and the signs' light can be seen on from above, not a hole.
      case "roof": return surface("roof", { color: "#2b2c32", ambient: 0.035, spill: 0.65, detail: "sheet", sky: 9 });
      case "board_frame": return surface("board_frame", { color: "#1a1b1f", ambient: 0.03 });
      case "door": return surface("door", { color: "#2a2d33", ambient: 0.04, wall: 0.3, door: true });
      // A roller shutter, down: ribbed steel the street's light runs along.
      case "door_panel": return surface("door_panel", { color: "#4a4e55", ambient: 0.045, spill: 1.4, shutter: true });
      case "garage_floor": return wetFloor("garage").material;
      case "roof_wet": return wetFloor("roof").material;
      case "tube": return tube();
      case "glow": return glow();
      case "skylight": return skylight();
      case "clearglass": return clearGlass();
      case "tool_red": return surface("tool_red", { color: "#7a2028", ambient: 0.06, spill: 2.0 });
      case "hazard": return surface("hazard", { color: "#d8ab22", ambient: 0.07, spill: 1.8 });
      case "glass_dark": return surface("glass_dark", { color: "#0d1418", ambient: 0.02 });
      // A building's ledges, slabs, pilasters, fascias and parapets, and the
      // props' painted parts: their colour on their vertices.
      case "billboard": return billboard();
      case "trim": return surface("trim", { color: "#ffffff", ambient: 0.05, spill: 1.0, detail: "trim", tinted: true, wall: 0.12 });
      // What a thing is made of, for whatever is built of it (src/world/
      // kinds.js). Each takes its paint from its vertices, as trim does.
      case "corrugated": return surface(n, { color: "#ffffff", ambient: 0.05, detail: "corrugated", tinted: true, wall: 0.3 });
      case "container": return surface(n, { color: "#ffffff", ambient: 0.05, detail: "container", tinted: true, wall: 0.1 });
      case "tankplate": return surface(n, { color: "#ffffff", ambient: 0.05, detail: "tank", tinted: true });
      case "steel": return surface(n, { color: "#ffffff", ambient: 0.05, detail: "steel", tinted: true });
      case "castconcrete": return surface(n, { color: "#ffffff", ambient: 0.05, detail: "concrete", tinted: true, wall: 0.45 });
      case "plaster": return surface(n, { color: "#ffffff", ambient: 0.05, detail: "plaster", tinted: true, wall: 0.3 });
      default: return null;
    }
  };

  return {
    forName,
    trades,
    neonAll,
    neon,
    surface,
    wet,
    all: () => all,
    dispose() {
      all.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
