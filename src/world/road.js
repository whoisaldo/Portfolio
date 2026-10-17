// src/world/road.js: the wet road, which carries most of the colour.
//
// In the plate the asphalt is the brightest thing on screen after the signs.
// Here it is one surface seen the same way from every eye (the hero's half
// a metre off the road, a driver's, a walker's, a roof's), on every street:
//
//   the asphalt  a cracked aggregate, dark, lit by the spill map,
//                and what a road picks up in use: patches of newer tar with
//                a sealed joint round them, tar run into the long cracks,
//                the wheel tracks worn smooth, oil down the middle of each
//                lane and where cars stand, silt along the kerb
//   the water    it is wet in a pattern (src/world/ground.js knows where a
//                point is in its street): standing water along the kerbs,
//                in the wheel ruts and where two streets meet, damp round
//                it, drier on the crown
//   the mirror   standing water is a mirror: a sign is a sign in it, upside
//                down, and rain rings it near the lens. Damp asphalt gives
//                the same picture back softened by its own roughness, a
//                lobe a few degrees tall and a fraction of that wide, which
//                is long only where the eye is low and the look is glancing
//                (the hero) and short from a driver's seat or a pavement.
//                On desktop the picture is a real planar reflection
//                (src/world/mirror.js); without one it is the baked light
//                followed along the reflected ray (spillReflect), softer but
//                in the same place and as bright, so a street does not
//                change its nature when the mirror is shed or was never on.
//
// The `wet` switch in env.js takes the water, the mirror and the rain away
// together and leaves a dry, dark road.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { GROUND, VNOISE } from "./ground.js";

// The mirror at full, as world-scene.js sets uReflectGain: its share of the
// reflection is uReflectGain over this, the baked light's the rest.
const MIRROR_FULL = 2.2;

/** The wet ground's planar mirror as the roads read it, in one set of
 *  holders (setReflection below and world-scene.js write them through
 *  either road material), so whatever else lies flat on the ground and
 *  gives the street back can read the same picture (materials.js, the
 *  clear glass over the plaza's hub). */
export const MIRROR_UNIFORMS = {
  uReflect: { value: null },
  uReflectMatrix: { value: new THREE.Matrix4() },
  uReflectOn: { value: 0 },
  uReflectGain: { value: MIRROR_FULL },
  // The height of the plane the mirror was drawn in: the ground's, or the
  // deck's while the eye is on or over the deck (world-scene.js).
  uMirrorY: { value: 0 },
};

export function createRoadMaterial(shared, { maps, reflection, paint = false, reduced = false }) {
  const uniforms = {
    ...shared,
    uMap: { value: maps.asphalt || null },
    uNormal: { value: maps.asphaltNormal || null },
    uRough: { value: maps.asphaltRough || null },
    uHasMaps: { value: maps.asphalt ? 1 : 0 },
    // (world-scene.js still writes the old baked streaks' gain each frame.)
    uStreakGain: { value: reflection ? 0.1 : 1.1 },
    ...MIRROR_UNIFORMS,
    uWet: { value: 1 },
    // The koi's reflection on the square holds where plaza-koi.js holds the
    // fish with reduced motion (its second 12).
    uKoiTime: { value: reduced ? 12 : -1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    defines: { MIRROR: reflection ? 1 : 0, PAINT: paint ? 1 : 0 },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vUv;
      #if PAINT == 1
      // Each mark's own colour: white lines, the crossings' yellow, the
      // walk figure's green.
      attribute vec4 color;
      varying vec3 vPaint;
      #endif
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vUv = uv;
        #if PAINT == 1
        vPaint = color.rgb;
        #endif
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${VNOISE}
      ${GROUND}
      uniform sampler2D uMap;
      uniform sampler2D uNormal;
      uniform sampler2D uRough;
      uniform float uHasMaps;
      uniform sampler2D uReflect;
      uniform mat4 uReflectMatrix;
      uniform float uReflectOn;
      uniform float uReflectGain;
      uniform float uMirrorY;
      uniform float uWet;
      uniform float uKoiTime;
      varying vec3 vWorld;
      varying vec2 vUv;
      #if PAINT == 1
      varying vec3 vPaint;
      #endif

      // Rain on standing water: a ring spreading from where a drop landed,
      // one drop to a cell every second or so. Returns the ring's slope,
      // pointing away from its centre.
      vec2 ripple(vec2 p, float t) {
        vec2 cell = floor(p);
        float h = hash12(cell);
        vec2 c = vec2(hash12(cell + 7.1), hash12(cell + 3.3)) * 0.5 + 0.25;
        float life = fract(t * (0.7 + 0.6 * h) + h * 11.0);
        vec2 d = fract(p) - c;
        float r = length(d);
        float front = life * 0.45;
        float ring = sin((r - front) * 42.0) * smoothstep(0.07, 0.0, abs(r - front)) * (1.0 - life);
        return d / max(r, 1e-3) * ring;
      }

      #if PAINT == 1
      // What hangs over Corpo Plaza's square, as its wet stone gives it
      // back where no mirror is drawn (from the air): the board's lit frame
      // and its screen, the four side screens and the two over the shops,
      // and the two koi turning over the hub (plaza-koi.js: the same lap
      // from the same clock). Light along the ray R from P.
      float pzRect(vec2 q, vec2 h, float w) {
        vec2 e = abs(q) - h;
        return 1.0 - smoothstep(-w, w, max(e.x, e.y));
      }
      vec3 pzOverhead(vec3 P, vec3 R) {
        vec3 o = vec3(0.0);
        if (R.y < 0.02) return o;
        // The board on its housing (z -263), its frame lit in the entry's
        // colour (the Work shot's yellow), the screen dark with its art.
        if (R.z < -0.02) {
          float t = (-263.0 - P.z) / R.z;
          vec3 H = P + R * t;
          vec2 q = H.xy - vec2(79.0, 26.0);
          float w = 0.25 + t * 0.035;
          float frame = pzRect(q, vec2(14.3, 9.8), w) - pzRect(q, vec2(13.5, 9.0), w);
          o += vec3(1.0, 0.86, 0.12) * 1.1 * max(frame, 0.0) + vec3(0.07, 0.09, 0.14) * pzRect(q, vec2(13.5, 9.0), w);
          // The steel housing round it, floodlit cold, faint.
          o += vec3(0.04, 0.045, 0.06) * (pzRect(q, vec2(24.0, 12.4), w * 2.0) - pzRect(q, vec2(14.3, 9.8), w));
          // The two boards over the shops (z -260.5 is near enough).
          vec2 a = H.xy - vec2(60.0, 19.0), b = H.xy - vec2(98.0, 19.0);
          o += vec3(0.16, 0.2, 0.3) * (pzRect(a, vec2(4.0, 2.65), w) + pzRect(b, vec2(4.0, 2.65), w));
        }
        // The side screens on the lane's backs (x 44.6) and on the
        // terraces' masts (x 109.4), at 12 m.
        float sx = R.x < -0.02 ? 44.6 : (R.x > 0.02 ? 109.4 : 0.0);
        if (sx != 0.0) {
          float t = (sx - P.x) / R.x;
          vec3 H = P + R * t;
          float w = 0.25 + t * 0.035;
          o += vec3(0.22, 0.26, 0.36) * (pzRect(vec2(H.z + 205.0, H.y - 12.0), vec2(4.5, 3.0), w) + pzRect(vec2(H.z + 228.0, H.y - 12.0), vec2(4.5, 3.0), w));
        }
        // The koi: each a glowing body along its heading, thickest a third
        // of the way back, the tail thin.
        for (int i = 0; i < 2; i++) {
          float L = i == 0 ? 36.0 : 26.0;
          float rad = i == 0 ? 11.0 : 13.0;
          float fy = i == 0 ? 30.0 : 14.5;
          float ph = i == 0 ? 1.178 : -1.178;
          float a = (uKoiTime < 0.0 ? uTime : uKoiTime) / 64.0 * 6.2831853 + ph;
          vec3 C = vec3(70.0 + rad * cos(a), fy + 0.9 * sin(a * 2.0 + ph), -234.0 - rad * sin(a));
          vec3 D = vec3(-sin(a), 0.0, -cos(a));
          vec3 w0 = P - C;
          float b = dot(R, D), d = dot(R, w0), e = dot(D, w0);
          float s = (b * e - d) / max(1.0 - b * b, 1e-4);
          float u = clamp(e + s * b, -0.5 * L, 0.5 * L);
          s = max(dot(C + D * u - P, R), 0.0);
          float dd = length(P + R * s - C - D * u);
          float k = u / (0.5 * L);
          float r = L * 0.085 * (1.0 - smoothstep(-0.2, -0.95, k) * 0.75) * (1.0 - smoothstep(0.55, 1.0, k) * 0.6) + s * 0.012;
          vec3 hue = i == 0 ? vec3(1.0, 0.4, 0.07) : vec3(1.0, 0.6, 0.16);
          o += hue * 1.6 * exp(-dd * dd / (r * r));
        }
        return o;
      }
      #endif

      void main() {
        vec2 p = vWorld.xz;
        vec3 toEye = uCam - vWorld;
        float dist = length(toEye);
        vec3 V = toEye / dist;
        float ndv = clamp(V.y, 0.0, 1.0);
        // Metres a pixel covers: what is finer than that is left out, or
        // it would shimmer.
        float px = fwidth(p.x) + fwidth(p.y);
        float near = 1.0 - smoothstep(0.04, 0.12, px);

        // Where this is in its street. The deck and its ramp are over the
        // streets, not in them.
        vec4 se;
        vec4 sf = streetAt(p, se);
        float grade = step(vWorld.y, 0.3);
        bool alongZ = sf.x >= sf.y;
        float inJ = smoothstep(0.0, 1.5, min(sf.x, sf.y)) * grade;
        float kerbIn = mix(20.0, mix(max(max(sf.x, sf.y), 0.0), 20.0, inJ), grade);
        float lane = alongZ ? sf.z : sf.w;
        // Metres across from the street's line, and whether this is a
        // road with kerbs and lanes at all (asphalt in a yard is not).
        float lat = alongZ ? se.x : se.z;
        float framed = grade * step(-0.3, max(sf.x, sf.y));
        if (grade < 0.5 && p.x > -84.5 && p.x < 113.0 && p.y > -221.0 && p.y < -75.5) {
          // The deck is a road of its own two runs (the builder's deck.py:
          // from the parapet's road face to the barrier's, a lane 1.75 m
          // either side of the line), the ramp up the west street and the
          // bridge along z -80, and a plate where they turn.
          bool ramp = p.y < -84.6;
          float in2 = ramp ? min(-75.4 - p.x, p.x + 83.7) : min(p.y + 84.6, -76.3 - p.y);
          if (in2 > -0.3) {
            framed = 1.0;
            alongZ = ramp;
            kerbIn = !ramp && p.x < -75.4 ? 20.0 : max(in2, 0.0);
            lat = ramp ? p.x + 80.0 : p.y + 80.0;
            lane = abs(abs(lat) - 1.75);
          }
        }
        float track = smoothstep(0.45, 0.15, abs(lane - 0.8)) * (1.0 - 0.6 * inJ) * framed;
        float gutter = smoothstep(1.5, 0.25, kerbIn);

        // The aggregate, in world space, so the lane paint lies on the same
        // cracked asphalt as the lane: a tile every 2.5 m, fine enough for
        // a lens half a metre off the road, and another, larger and
        // turned, taking over in patches so the repeat never lines up down
        // a street (only where the two meet are both read).
        vec3 albedo = vec3(0.03);
        vec3 nt = vec3(0.5, 0.5, 1.0);
        float rough = 0.46;
        float other = smoothstep(0.35, 0.65, vnoise(p * 0.09));
        if (uHasMaps > 0.5) {
          vec2 tuv = p / 2.5;
          vec2 tuv2 = mat2(0.8, -0.6, 0.6, 0.8) * p / 6.3 + 0.37;
          vec2 gx = dFdx(tuv), gy = dFdy(tuv), gx2 = dFdx(tuv2), gy2 = dFdy(tuv2);
          vec3 a1 = albedo, a2 = albedo, n1 = nt, n2 = nt;
          float r1 = rough, r2 = rough;
          if (other < 0.999) {
            a1 = textureGrad(uMap, tuv, gx, gy).rgb;
            n1 = textureGrad(uNormal, tuv, gx, gy).xyz;
            r1 = textureGrad(uRough, tuv, gx, gy).g;
          }
          if (other > 0.001) {
            a2 = textureGrad(uMap, tuv2, gx2, gy2).rgb;
            n2 = textureGrad(uNormal, tuv2, gx2, gy2).xyz;
            r2 = textureGrad(uRough, tuv2, gx2, gy2).g;
          }
          albedo = mix(a1, a2, other);
          nt = mix(n1, n2, other);
          rough = mix(r1, r2, other);
        }
        nt = nt * 2.0 - 1.0;
        // The cracks: dark in the albedo, and dry, so they break every
        // reflection that crosses them the way they do in the plate. The map
        // is dark (linear luminance about 0.017 to 0.05, measured), so the
        // threshold sits at its darkest few percent.
        float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
        float cracked = smoothstep(0.014, 0.024, lum);
        // (What the wet gives back is thinned over them, not cut: cut to
        // nothing at a hard threshold, the map's darkest stones were a
        // black speckle through every bright reflection at the lens's feet.)
        float crack = mix(0.5, 1.0, smoothstep(0.01, 0.032, lum));
        // The smooth tops of the stones, which hold the sheen.
        float stone = smoothstep(0.54, 0.38, rough);

        // A road in use. Repairs: a patch of newer tar now and then, square
        // to the street, darker and smoother, a sealed joint round it; and
        // tar run into the long cracks.
        vec2 pc = p / vec2(11.0, 17.0);
        vec2 pi = floor(pc);
        vec2 lo = 0.06 + 0.4 * vec2(hash12(pi + 4.1), hash12(pi + 9.3));
        vec2 hi = lo + 0.2 + 0.32 * vec2(hash12(pi + 2.2), hash12(pi + 6.6));
        vec2 pe = min(fract(pc) - lo, hi - fract(pc)) * vec2(11.0, 17.0);
        // (Its edge wanders a hand's width and is feathered: cut dead
        // straight, with a film of its own on it, a patch was a hard dark
        // rectangle lying in the road's reflection.)
        float pm = min(pe.x, pe.y) + (vnoise(p * 2.7 + 31.0) - 0.5) * 0.14;
        float has = step(hash12(pi + 1.7), 0.36);
        float mended = has * smoothstep(-0.05 - px, 0.05 + px, pm);
        // (The noise is read on a turned grid, or its cells show as squares
        // laid along the street.)
        vec2 pr = mat2(0.8, -0.6, 0.6, 0.8) * p;
        float n1 = vnoise(pr * 0.07) * 0.7 + vnoise(pr.yx * 0.19 + 2.1) * 0.3;
        float n2 = vnoise(pr.yx * 0.23 + 5.3) * 0.75 + vnoise(pr * 0.61 + 8.7) * 0.25;
        float seal = has * (1.0 - smoothstep(0.02, 0.05 + px, abs(pm)));
        seal = max(seal, (1.0 - smoothstep(0.004, 0.011 + px * 0.25, abs(vnoise(p * 0.31 + 17.0) - 0.5))) * step(0.42, n2)) * near;
        albedo *= mix(1.0, 0.86 + 0.12 * hash12(pi + 8.8), mended) * (1.0 - 0.65 * seal);
        // The wheel tracks, polished paler; oil down the middle of a lane
        // and in blots where cars stand; silt in the gutter.
        float mid = smoothstep(0.55, 0.0, lane) * framed * (1.0 - inJ);
        float lng = vnoise(p * (alongZ ? vec2(1.1, 0.14) : vec2(0.14, 1.1)) + 11.0);
        float oil = max(mid * smoothstep(0.35, 0.7, lng), smoothstep(0.62, 0.74, vnoise(p * 1.1 + 3.0)) * smoothstep(2.6, 1.8, kerbIn));
        albedo *= (1.0 + 0.3 * track * stone) * (1.0 - 0.45 * oil) * (1.0 - 0.3 * smoothstep(0.5, 0.1, kerbIn));

        // The water. The hero's lens is half a metre off the road, so the
        // few metres in front of it (the south junction and the avenue's
        // first twenty) are most of the page's first frame, and that frame
        // fades in from a painted plate whose road is long streaks from
        // kerb to kerb. For that eye alone (fore: this stretch, seen from
        // under a metre) the film is thicker and its lobe longer; a driver
        // or a walker crossing the same junction sees the road every other
        // street has.
        float broad = n1 * 0.3 + n2 * 0.45 + lng * 0.25;
        // (The hero's eye, and no other, is under a metre.)
        float low = smoothstep(1.3, 0.7, uCam.y);
        float fore = smoothstep(-24.0, -4.0, p.y) * (1.0 - smoothstep(9.0, 12.0, abs(p.x))) * low;
        // Water lies where it would. Along the kerb, a ribbon in the gutter
        // that widens and narrows down the street (the drains stand in
        // it); in the wheel ruts, a pool a few metres long here and there;
        // at a junction's corners, where the crossings' low edges meet the
        // kerbs. Its shore is a few centimetres of shallow water and
        // wanders a hand's width, so the near edge is sharp and the far
        // one soft with the distance. Nothing by noise alone: pools dealt
        // by a cloud's shape were blotches that followed no kerb, rut or
        // drain.
        float run = alongZ ? p.y : p.x;
        float wob = (vnoise(p * 1.7 + 3.0) - 0.5) * 0.16 + (vnoise(p * 6.1) - 0.5) * 0.05;
        float ribbon = 0.42 + 0.85 * smoothstep(0.4, 0.8, vnoise(vec2(run * 0.085, step(0.0, lat) * 7.3 + 1.0)));
        float rut = 0.36 * smoothstep(0.56, 0.8, vnoise(vec2(run * 0.07 + floor(lat * 0.83) * 5.7, 9.0))) - 0.07;
        float level = max(ribbon - kerbIn, rut * (1.0 - inJ) - abs(lane - 0.8));
        if (grade > 0.5 && min(sf.x, sf.y) > 0.0) level = max(level, 1.3 + 0.9 * vnoise(p * 0.4) - length(vec2(sf.x, sf.y)));
        level += wob;
        float la = fwidth(level) * 0.75;
        float puddle = smoothstep(-0.02 - la, 0.045 + la, level) * framed;
        // A road in use, at the foot of a driver's, a walker's or a fixed
        // view's frame (not the hero's: its frame fades in from the plate
        // and keeps the road it has always had). A cover over the services
        // on a lane's line now and then, rubber laid down where somebody
        // braked hard, cracks across the road that nobody has run tar into,
        // and what a gutter holds: grit, a scrap of paper, a can, a weed in
        // the joint at the kerb's foot. What lies on the road holds no water.
        // (And not the Garage section's backdrop while its door is open:
        // freeEye, glsl.js. 1 - low is the rest of it.)
        float eye = freeEye();
        float dry = 0.0;
        #if PAINT == 0
        if (eye > 0.01 && px < 0.3 && framed > 0.5) {
          float fine6 = 1.0 - smoothstep(0.02, 0.06, px);
          float mid6 = 1.0 - smoothstep(0.06, 0.22, px);
          float laneNo = floor(lat / 3.5);
          // (Covers, rubber and cracks across are a street's, on the ground:
          // not mid-lane on the deck's road 8.5 m up.)
          float onGround = 1.0 - step(0.5, vWorld.y);
          // The cover: 0.64 m of cast steel, a ring polished by the wheels,
          // a grid of bosses inside, a dark gap round it.
          float cc = floor(run / 26.0);
          float hcov = hash12(vec2(cc, laneNo + 41.0));
          float rc = length(vec2(run - (cc + 0.15 + 0.7 * fract(hcov * 7.0)) * 26.0, lane));
          float cover = step(0.42, hcov) * (1.0 - inJ) * (1.0 - smoothstep(0.31, 0.32 + px, rc)) * onGround;
          vec3 iron = vec3(0.04, 0.038, 0.036) * (0.7 + 1.1 * step(0.55, fract(run / 0.08)) * step(0.55, fract(lat / 0.08)) * fine6);
          iron = mix(iron, vec3(0.13, 0.125, 0.115), step(0.25, rc));
          iron *= 1.0 - 0.75 * (1.0 - smoothstep(0.004, 0.014 + px, abs(rc - 0.305)));
          albedo = mix(albedo, iron, cover);
          // Rubber: two dark lines a track apart, 5 to 14 m, darkest
          // where the wheels locked, drifting a little as the car slewed.
          float sc = floor(run / 37.0);
          float hs = hash12(vec2(sc, laneNo + 17.0));
          float st = (run - (sc + 0.1 + 0.5 * fract(hs * 11.0)) * 37.0) / (5.0 + 9.0 * fract(hs * 5.0));
          float skid = step(0.45, hs) * step(0.0, st) * step(st, 1.0) * smoothstep(0.0, 0.2, st) * (1.0 - inJ) * onGround
                     * (1.0 - smoothstep(0.06, 0.1 + px, abs(lane - 0.8 + 0.3 * st * st * (fract(hs * 3.0) - 0.5))))
                     * (0.55 + 0.45 * vnoise(vec2(run * 3.0, lat * 2.0)));
          albedo *= 1.0 - 0.62 * skid * mid6;
          // A crack across the road every 12.5 m or so, wandering, over
          // part of its width: open and dark, and in half of them the tar
          // run in, a wider seam.
          float tcr = floor(run / 12.5);
          float ht = hash12(vec2(tcr, 3.0));
          float wander = (vnoise(vec2(lat * 0.7, tcr * 3.1)) - 0.5) * 0.9 + (vnoise(vec2(lat * 5.0, tcr)) - 0.5) * 0.12;
          float cd = abs(run - (tcr + 0.3 + 0.4 * ht) * 12.5 - wander);
          float spanC = smoothstep(0.32, 0.45, vnoise(vec2(lat * 0.35 + 7.0, tcr * 1.7))) * (1.0 - cover) * onGround;
          float open = (1.0 - smoothstep(0.006, 0.014 + px * 0.4, cd)) * spanC * fine6;
          float tarred = (1.0 - smoothstep(0.03, 0.05 + px * 0.4, cd)) * spanC * step(0.5, fract(ht * 7.0)) * mid6;
          albedo *= (1.0 - 0.7 * open) * (1.0 - 0.4 * tarred);
          // The gutter: grit and silt against the kerb, paler and browner
          // than the tar, in drifts.
          float gut = smoothstep(0.5, 0.05, kerbIn) * (1.0 - inJ);
          albedo = mix(albedo, vec3(0.075, 0.066, 0.052) * (0.6 + 0.8 * vnoise(p * 9.0)), gut * 0.6 * smoothstep(0.25, 0.7, vnoise(vec2(run * 0.45, lat * 0.1 + 3.0))));
          // What the wind and the rain leave there, a stride apart at most.
          float lcell = floor(run / 0.8);
          float hl = hash12(vec2(lcell, step(0.0, lat) + 61.0));
          vec2 lq = vec2(run - (lcell + 0.5) * 0.8, kerbIn - 0.12 - 0.45 * fract(hl * 13.0));
          float ang = hl * 6.28;
          lq = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * lq;
          vec2 lsz = fract(hl * 7.0) < 0.6 ? vec2(0.09, 0.065) : vec2(0.06, 0.03);
          float scrap = step(0.86, hl) * step(abs(lq.x), lsz.x) * step(abs(lq.y), lsz.y) * fine6 * (1.0 - inJ);
          vec3 scrapCol = fract(hl * 7.0) < 0.6 ? mix(vec3(0.3, 0.29, 0.25), vec3(0.2, 0.14, 0.08), step(0.5, fract(hl * 29.0))) : (fract(hl * 31.0) < 0.5 ? vec3(0.35, 0.06, 0.06) : vec3(0.08, 0.16, 0.3));
          albedo = mix(albedo, scrapCol, scrap);
          // A weed in the joint at the kerb's foot: a tuft of blades, more
          // of them in Santo Domingo's yards and none on corporate ground.
          vec2 wq = vec2(run / 0.55, 0.0);
          float hw = hash12(vec2(floor(wq.x), step(0.0, lat) + 71.0));
          vec2 wd = vec2((fract(wq.x) - 0.5) * 0.55, kerbIn - 0.03);
          float blades = 0.5 + 0.5 * sin(atan(wd.y, wd.x) * 9.0 + hw * 20.0);
          float weed = step(1.0 - mix(0.16, 0.42, santoAt(p)) * (1.0 - tidy(p)), hw) * (1.0 - smoothstep(0.03 + 0.05 * blades * fract(hw * 3.0 + 0.4), 0.06 + 0.06 * blades, length(wd))) * fine6;
          albedo = mix(albedo, vec3(0.035, 0.055, 0.02) * (0.7 + 0.6 * blades), weed);
          dry = max(cover, max(scrap, weed));
          stone = mix(stone, 1.0, cover);
        }
        #endif
        puddle *= 1.0 - dry;
        float damp = 0.72 - 0.1 * smoothstep(2.5, 7.0, kerbIn) * grade;
        if (low > 0.001) {
          // The page's first frame keeps the pools it has always had (it
          // fades in from a painted plate), by the stones' map at its
          // coarsest, which is its mean: read sharp, each stone at a
          // pool's edge was in or out of the water on its own, a hard black
          // speckle in the reflection (and read a few levels down, a
          // litter of hand-sized blots).
          float soft = rough;
          if (uHasMaps > 0.5) soft = mix(textureLod(uRough, p / 2.5, 9.0).g, textureLod(uRough, mat2(0.8, -0.6, 0.6, 0.8) * p / 6.3 + 0.37, 9.0).g, other);
          float field = broad + (0.46 - soft) * 0.5
                      + gutter * (0.02 + 0.3 * lng) + track * (lng - 0.45) * 0.4 + inJ * 0.06;
          float aa = fwidth(field) * 0.75;
          // Water thins out to damp at its edge: a soft shore, not a cut-out.
          puddle = mix(puddle, smoothstep(0.615 - aa, 0.69 + aa, field), low);
          damp = mix(damp, smoothstep(0.3, 0.6, broad + 0.22 * gutter + 0.14 * fore + 0.1 * inJ - 0.08 * smoothstep(2.5, 7.0, kerbIn) * grade), low);
        }
        puddle *= uWet;
        // From the air a wet street is a pale ribbon between dark roofs: the
        // higher the eye, the more of the sky and of its own lights it gives
        // back at a steep look.
        float aerial = smoothstep(12.0, 45.0, uCam.y);
        float wet = uWet * mix(0.3, 1.0, damp);

        vec3 spill = spillGround(vWorld);
        // (The baked light is the ground's too: up on the deck most of what
        // it holds is the signs of the street below, so there it is greyed
        // toward the deck's own sodium masts.)
        float lifted = smoothstep(0.15, 0.7, abs(vWorld.y));
        // (Corpo Plaza's terraces are painted slabs off the ground, with
        // the board, the signs and the koi over them: wet stone in the
        // street's own colours, never the deck's sodium grey.)
        float terrace = 0.0;
        // (Corpo Plaza's square at its foot and its two terraces over it:
        // the same dark stone under the same sheet of water.)
        float square = 0.0;
        #if PAINT == 1
        // (And the square's own stone at its foot, from the board's block
        // to the plaza street and the lane to the terraces, the causeway
        // with it: the same wet stone, not dry paving beside a wet road.)
        square = step(47.5, p.x) * step(p.x, 108.5) * step(-264.5, p.y) * step(p.y, -189.5) * (1.0 - step(0.6, abs(vWorld.y)));
        float decks = lifted * step(91.5, p.x) * step(p.x, 108.5) * step(-264.5, p.y) * step(p.y, -199.5);
        terrace = max(lifted, square) * step(44.0, p.x) * step(p.x, 134.0) * step(-330.0, p.y) * step(p.y, -180.0);
        // (Its stone holds a film all over and water standing in the low
        // places between the slabs: pools in a broad, wandering pattern.)
        wet = max(wet, square * uWet * 0.9);
        float pools = vnoise(p * 0.16 + 4.0) * 0.65 + vnoise(p * 0.55) * 0.35;
        float pa = fwidth(pools) * 0.75;
        puddle = max(puddle, square * uWet * smoothstep(0.5 - pa, 0.6 + pa, pools));
        // (Round 7: the whole square under a sheet of water, a near mirror
        // broken only by its joints: water in half of it, each pool giving
        // back the lit haze, was a litter of pale lilac blotches from the
        // air.)
        square = max(square, decks);
        puddle = mix(puddle, uWet * (0.86 + 0.14 * smoothstep(0.3, 0.7, pools)), square);
        #endif
        float sodium = lifted * 0.8 * (1.0 - terrace);
        spill = mix(spill, dot(spill, vec3(0.3, 0.5, 0.2)) * vec3(1.0, 0.8, 0.58) * 0.75, sodium);
        #if PAINT == 1
        // Road paint over the same asphalt: worn through where the stones
        // stand proud and where the wheels run, pale, and lit by the whole
        // street's glow, so it reads as the line down the middle.
        float worn = smoothstep(0.3, 0.75, vnoise(p * 2.3) * 0.55 + lng * 0.3 + 0.3 * track + (rough - 0.46) * 1.2);
        float painted = 0.85 * cracked * (1.0 - 0.8 * worn * near);
        // (The square's slabs and its terraces' are stone, not paint on
        // tar: no tar through them, which from a terrace read as grime
        // stains and holes.)
        painted = mix(painted, 1.0, square);
        albedo = mix(albedo, vPaint, painted);
        // (Wet, a pale slab goes dark.)
        albedo *= mix(1.0, 0.55, terrace * wet);
        // (Darker still on the square: polished dark stone under water,
        // its slabs' own light the lamps' pools in their colours.)
        albedo *= mix(1.0, 0.62, square);
        stone = max(stone, painted);
        // (The light on it eased toward a ceiling: a white line under six
        // signs is a painted line, not a tube.)
        // A coloured bar (a crossing's yellow, the walk figure's green) is
        // paint too: it keeps less of the dark's glow than a white line and
        // takes the street's light part greyed, so teal light on yellow is a
        // dull yellow and not an acid one that seems to shine.
        float hue = max(vPaint.r, max(vPaint.g, vPaint.b)) - min(vPaint.r, min(vPaint.g, vPaint.b));
        float coloured = smoothstep(0.25, 0.55, hue);
        vec3 lit = spill * 1.6 / (1.0 + 1.3 * max(spill.r, max(spill.g, spill.b)));
        // (The bake lifts every cell away from the avenue toward one
        // brightness, a lilac wash over the whole square: there the stone
        // takes a little of it, greyed, and the pools its slabs hold.)
        lit = mix(lit, vec3(dot(lit, vec3(0.3, 0.5, 0.2))) * vec3(1.0, 0.92, 0.84) * 0.42, square);
        lit = mix(lit, mix(vec3(dot(lit, vec3(0.3, 0.55, 0.15))), lit, 0.45) * 0.62, coloured);
        vec3 col = albedo * (vec3(0.13, 0.14, 0.18) * mix(1.0, 0.45, coloured) + lit);
        #else
        albedo *= mix(1.0, 0.72, wet);
        // (Away from the hero's lens the asphalt takes the light it stands
        // in at more than twice what it did, and a little of the night's:
        // at 0.55 a lit street seen from a pavement or a driver's seat was a
        // black floor under its lamps, every crack, cover and patch in it
        // unseen. Still dark tar, and never as bright as the hero's water.)
        // (And the old tar there is greyer than the patches let into it, and
        // the light it takes a little greyed: the bake's cells of pink,
        // green and blue side by side were a mottle of rainbow on the road.)
        float take = mix(0.55, 1.05, eye);
        albedo *= 1.0 + eye * (0.55 * (1.0 - mended) - 0.15 * seal);
        // (A dim magenta wash most of all, toward the night's blue: the signs'
        // pink and violet spread evenly over a road read as a haze on it.)
        float sl = dot(spill, vec3(0.3, 0.5, 0.2));
        float mag = clamp((min(spill.r, spill.b) - spill.g) / max(sl, 1e-3), 0.0, 1.0);
        vec3 lightIn = mix(spill, vec3(sl) * mix(vec3(1.0), vec3(0.85, 0.97, 1.15), mag), eye * (0.35 + 0.4 * mag * (1.0 - smoothstep(0.2, 0.9, sl))));
        vec3 col = albedo * take * (vec3(0.07 + 0.05 * eye) + lightIn * mix(1.0, 0.45, puddle) * (1.0 + 1.5 * aerial)) + albedo * cityGlow(-V, 0.0) * 0.12;
        // Santo Domingo's sodium air on its own yards' tar, as on its walls.
        col += albedo * SODIUM * santoAt(p) * uHaze * 2.4 * eye;
        #endif
        // A wet sheen: the aggregate catches the street's light, and here
        // and there a stone catches it hard. The glints go before a pixel
        // is wider than one, or they would shimmer.
        // (A little more than a twentieth of it: at that, the road at a
        // walker's feet was black beside a lit doorway.)
        col += spill * 0.07 * (1.0 - rough) * uWet;
        vec2 gcell = p * 24.0;
        float glint = step(0.997, hash12(floor(gcell))) * smoothstep(0.25, 0.05, length(fract(gcell) - 0.5)) * (1.0 - smoothstep(0.015, 0.04, px));

        // What the wet gives back. Standing water is flat but for the rain;
        // the film on the asphalt follows the stones, smoother where the
        // wheels and the tar have closed the surface.
        // Brighter at a glancing look, and never nothing: a wet street at
        // night is drawn glossier than water is.
        float graze = pow(1.0 - ndv, 3.0);
        // (Its floor is 0.3: under a walker's or a driver's own feet the
        // street's light still lies on the road, where at 0.15 the near
        // third of every frame was bare black tarmac.)
        float fres = 0.3 + 0.7 * graze;
        col += spill * glint * 1.6 * fres * uWet * crack;
        vec2 rings = vec2(0.0);
        if (puddle > 0.01 && dist < 28.0) {
          rings = (ripple(p / 0.6, uTime) + ripple(p / 0.45 + 13.7, uTime * 1.13)) * puddle * smoothstep(28.0, 5.0, dist);
        }
        vec3 R = normalize(vec3(-V.x + rings.x * 0.03, V.y, -V.z + rings.y * 0.03));
        float sheen = wet * mix(0.35, 1.0, stone) * crack * (0.8 + 0.3 * track + 0.1 * mended + 0.55 * seal + 0.4 * oil) * (1.0 + 3.1 * fore) * (1.0 + 1.6 * terrace);
        // How wide the film scatters, as a facet's tilt in radians.
        float sigma = mix(mix(mix(0.06, 0.035, max(track, mended * 0.4)), 0.085, fore), 0.022, square);

        float mk = 0.0;
        vec3 sharp = vec3(0.0);
        vec3 soft = vec3(0.0);
        #if MIRROR == 1
        mk = uReflectOn * clamp(uReflectGain / ${MIRROR_FULL.toFixed(1)}, 0.0, 1.0);
        // The mirror is one plane's, the ground's or the deck's level top:
        // a road at another height (the ramp, the streets under the deck
        // while the eye is on it) would show that plane's picture, so it
        // keeps the baked light.
        mk *= 1.0 - smoothstep(0.15, 0.7, abs(vWorld.y - uMirrorY));
        if (mk > 0.001) {
          // The mirror's picture is of the world as the road's plane throws
          // it back, so a direction's vanishing point in it is where that
          // direction is seen from any point of the road: R for the water,
          // and R tipped up and down by the film's own roughness for the
          // asphalt, gathered from a level of the picture as soft as the
          // gaps between the taps. That lobe is the streak: a few degrees
          // tall and narrow, long on screen only at a glancing look.
          vec4 a = uReflectMatrix * vec4(R, 0.0);
          vec4 b = uReflectMatrix[1];
          // (A level down from the sharpest, and two at a pool's shore: by
          // a kerb the pools are small, and each showing its own sharp
          // piece of a sign and of the yellow line was a litter of shards.)
          if (puddle > 0.01) sharp = textureLod(uReflect, a.xy / a.w, 1.0 + 1.6 * (1.0 - puddle)).rgb;
          if (puddle < 0.99) {
            // Further toward the horizon than away from it, as a rough
            // wet surface throws light at a glancing angle.
            float top = 2.0 * sigma;
            float bottom = max(-mix(2.5, 4.5, fore) * sigma, 0.012 - R.y);
            vec2 size = vec2(textureSize(uReflect, 0));
            vec2 u0 = (a.xy + b.xy * bottom) / (a.w + b.w * bottom);
            vec2 u1 = (a.xy + b.xy * top) / (a.w + b.w * top);
            float lod = log2(max(length((u1 - u0) * size) / 8.0, 1.0)) - 0.6;
            float wsum = 0.0;
            for (int i = 0; i < 8; i++) {
              float tilt = mix(bottom, top, (float(i) + 0.5) / 8.0);
              float lim = tilt > 0.0 ? top : bottom;
              float w = exp(-mix(2.0, 0.6, fore) * tilt * tilt / (lim * lim));
              soft += textureLod(uReflect, (a.xy + b.xy * tilt) / (a.w + b.w * tilt), lod).rgb * w;
              wsum += w;
            }
            soft /= wsum;
          }
        }
        #endif
        vec3 baked = vec3(0.0);
        if (mk < 0.999) {
          // No mirror: the baked light along the ray (ground.js), a little
          // off its colour and capped, as a wet road gives a light back.
          // (Capped lower and left its colour: a far cluster of signs is
          // drawn out toward the eye in three images, and pale, that was a
          // smear of spilt paint across junction B.)
          // (Away from the hero's lens a third more of it, and let nearer
          // its colour's full strength: a fixed view's road, which has no
          // mirror, was a matte dark floor beside the drive frames' wet one.)
          baked = tame(spillReflect(vWorld, R) * mix(0.17, 0.23, eye), mix(0.4, 0.55, eye));
          baked = max(mix(vec3(dot(baked, vec3(0.299, 0.587, 0.114))), baked, 1.25), 0.0);
          // (Up on the deck the ray is followed from the deck's own height,
          // so this is what hangs over the deck and keeps more of its
          // colour than the light the deck's top takes from below.)
          if (sodium > 0.01) {
            // (And the deck's own lit bands and masts, which the map holds
            // as the light on the road a few metres on along the look: a
            // wet deck is no matte black strip under its lamps.)
            vec2 on = normalize(R.xz + 1e-5);
            vec3 ahead = spillGround(vWorld + vec3(on.x, 0.0, on.y) * 5.0) + spillGround(vWorld + vec3(on.x, 0.0, on.y) * 14.0);
            baked = max(baked, tame(ahead * 0.34, 0.5));
          }
          baked = mix(baked, dot(baked, vec3(0.3, 0.5, 0.2)) * vec3(1.0, 0.8, 0.58) * 0.8, sodium * 0.55) * (1.0 + 1.2 * terrace);
          // (On the square the baked light along the ray is the bake's own
          // lilac lift of the square itself: under its sheet of water it was
          // a pale slab from the air. There the water gives back what hangs
          // over it instead: pzOverhead, below.)
          // (Only at a steep look: low along the water it is the shops and
          // signs round the square, where no mirror is drawn.)
          baked *= mix(1.0, 0.2, square * smoothstep(0.12, 0.4, R.y));
          // Standing water gives the light back whole where a sign stands
          // over it and next to nothing where none does: dark water with
          // lights in it, the rain's rings catching them. (Given back as an
          // even wash at twice the film's, a pool in a rut was a pale smear
          // across the road and its paint.)
          if (puddle > 0.01) {
            float bl = dot(baked, vec3(0.3, 0.5, 0.2));
            vec3 pool = baked * (bl / (0.5 * bl + 0.07)) * (1.3 + 3.0 * dot(rings, rings));
            sharp = mix(pool, sharp, mk);
          }
          // (Drawn out toward the eye only a little: more of it stood on
          // the road as a comb of upright bands.)
          vec2 rd = normalize(R.xz + 1e-5);
          baked *= 0.86 + 0.28 * vnoise(vec2(dot(p, vec2(-rd.y, rd.x)) * 0.7, dot(p, rd) * 0.05));
        }
        // The sky: the lit cloud over the roofs, and the city's glow low on
        // it, brightest where the street runs toward downtown. The mirror
        // draws only what glows, never the sky, so this is its sky on
        // desktop too.
        vec3 sky = cityGlow(R, 0.0) * exp(-max(R.y, 0.0) * 28.0) * 0.6 + (hazeAt(R) * 1.2 + glowAt(R) * 0.5) * uHaze * mix(0.28, 0.4, fore) * mix(1.0 + 2.5 * aerial, 0.3, square);
        // (Under Santo Domingo's lamps the cloud is their orange, and the
        // wet tar holds that, as its yards' pools do.)
        sky = mix(sky, SODIUM * 0.9 * uHaze, 0.8 * santoAt(p) * eye);
        // (A pool with no mirror holds less of the cloud: lit by it alone
        // it is milk, not water.)
        // (Away from the hero's lens the film holds more of the cloud: a
        // wet road with nothing lit over it is a dark blue sheen, not a hole.)
        vec3 refl = mix(mix(baked, soft, mk) * sheen, sharp, puddle) + sky * mix(mix(0.3, 0.5, eye) * wet * mix(0.35, 1.0, stone) * crack, mix(0.4 + 0.6 * aerial, 1.0, mk), puddle);
        // (On the hero's stretch the film is thick enough to hold its shine
        // at the lens's feet, as the plate's road does.)
        refl *= mix(mix(max(fres, 0.5 * aerial), 0.6, 0.7 * fore), mix(mix(0.16, 0.25, fore), 0.42, square) + 0.75 * graze, puddle) * uWet;
        #if PAINT == 1
        // (Over the square, from the air where no mirror is drawn: the
        // board, its screens and the koi in the water.)
        if (square > 0.5 && mk < 0.999) refl += pzOverhead(vWorld, R) * (1.0 - mk) * puddle * (0.45 + 0.55 * graze);
        #endif
        // Never brighter than the sign it is the reflection of.
        refl /= 1.0 + 0.35 * max(refl.r, max(refl.g, refl.b));
        col += refl;

        col = cityFog(col, vWorld, 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "asphalt";
  return {
    material,
    uniforms,
    // The avenue's streaks, baked for the hero's eye alone (spill.js): the
    // road follows the baked light along each eye's own ray instead.
    setStreaks() {},
    setReflection(texture, matrix) {
      uniforms.uReflect.value = texture;
      if (matrix) uniforms.uReflectMatrix.value.copy(matrix);
      uniforms.uReflectOn.value = texture ? 1 : 0;
    },
    dispose() {
      material.dispose();
    },
  };
}
