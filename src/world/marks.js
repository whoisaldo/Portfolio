// src/world/marks.js: what a street leaves on its walls, as GLSL the wall
// and shutter shaders share (materials.js).
//
// At arm's length a ground-floor wall in Night City is never bare: bills
// pasted in runs and over each other, torn; tags scrawled in one line;
// fat round throw-ups down the lanes; stickers in swarms at eye height; a
// conduit with its clips and its box; a louvre and the rust under it. All of
// it is worked out from a point of the wall (metres along it, metres up) and
// the wall's own number, so a wall carries the same marks on every visit
// and no two walls the same. Abstract on purpose: shapes, bars where
// lettering would be, lines that are nobody's name.
//
// Everything here is finer than a wall, so everything fades by the metres a
// pixel covers (px) and costs nothing past that.
//
// Needs a vnoise(vec2) defined above it (src/world/ground.js, VNOISE).

export const MARKS = /* glsl */ `
  vec3 sprayOf(float k) {
    k = fract(k) * 7.0;
    if (k < 1.0) return vec3(0.86, 0.84, 0.8);
    if (k < 2.0) return vec3(1.0, 0.18, 0.53);
    if (k < 3.0) return vec3(0.15, 0.86, 0.95);
    if (k < 4.0) return vec3(0.99, 0.86, 0.1);
    if (k < 5.0) return vec3(0.03, 0.03, 0.04);
    if (k < 6.0) return vec3(0.9, 0.12, 0.1);
    return vec3(0.3, 0.95, 0.5);
  }

  float segd(vec2 q, vec2 a, vec2 b) {
    vec2 pa = q - a, ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
  }

  // A tag: one line, drawn as a hand goes, and a stroke under it: a zigzag
  // through seven points, or a run of loops, by its seed. q in a box 1 wide
  // and under half as high; the distance to the line.
  float scrawl(vec2 q, float seed) {
    float dm = 1e3;
    float loops = step(0.45, hash12(vec2(seed, 2.0)));
    float turn = 1.5 + 1.2 * hash12(vec2(seed, 4.0));
    vec2 a = vec2(0.04, 0.1 + 0.25 * hash12(vec2(seed, 1.0)));
    for (int i = 1; i <= 9; i++) {
      float fi = float(i);
      vec2 r = vec2(hash12(vec2(seed, fi * 3.1)), hash12(vec2(seed, fi * 7.7)));
      float zig = mod(fi, 2.0) < 0.5 ? r.y * 0.16 : 0.45 - r.y * 0.16;
      vec2 b = mix(vec2(fi / 9.4 + (r.x - 0.5) * 0.14, mix(zig, r.y * 0.45, 0.35)),
                   vec2(fi / 9.6 + 0.08 * cos(fi * turn + seed), 0.22 + (0.12 + 0.1 * r.y) * sin(fi * turn + seed)), loops);
      dm = min(dm, segd(q, a, b));
      a = b;
    }
    return min(dm, segd(q, vec2(0.1, -0.07), vec2(0.8 + 0.15 * hash12(vec2(seed, 9.0)), -0.03 - 0.05 * loops)));
  }

  // A throw-up: four fat round letters run together. x: inside one, y: on
  // the line round them, z: the holes in them. q in a box about 1.7 by 0.8.
  vec3 bubbles(vec2 q, float seed) {
    float d = 1e3;
    float hole = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 r = vec2(hash12(vec2(seed, fi * 5.3)), hash12(vec2(seed, fi * 9.1)));
      vec2 c = vec2(0.28 + fi * 0.38 + (r.x - 0.5) * 0.08, 0.4 + (r.y - 0.5) * 0.14);
      d = min(d, (length((q - c) / vec2(0.21 + 0.06 * r.y, 0.3 + 0.08 * r.x)) - 1.0) * 0.22);
      hole = max(hole, step(length((q - c - vec2(0.02, 0.05)) * vec2(1.6, 1.0)), 0.07));
    }
    return vec3(step(d, 0.0), step(abs(d - 0.014), 0.024), hole);
  }

  // A bill's print: paper, a shape in one ink, bars where the lettering
  // would be. f across and up the sheet, 0..1.
  vec3 bill(vec2 f, float h) {
    vec3 paper = mix(vec3(0.8, 0.76, 0.66), sprayOf(h * 5.0 + 0.2), 0.55 * step(0.45, fract(h * 3.0)));
    vec3 ink = fract(h * 7.0) < 0.5 ? vec3(0.05, 0.05, 0.06) : sprayOf(h * 11.0 + 0.45) * 0.75;
    float pick = fract(h * 13.0);
    float shape = pick < 0.33 ? step(length(f - vec2(0.5, 0.62)), 0.25)
                : (pick < 0.66 ? step(abs(f.x - 0.5) + abs(f.y - 0.63), 0.28) : step(0.5, fract((f.x + f.y) * 4.0)) * step(0.4, f.y) * step(f.y, 0.9));
    float bars = step(0.07, f.y) * step(f.y, 0.3) * step(0.08, f.x) * step(f.x, 0.92)
               * step(0.3, hash12(vec2(floor(f.x * 6.0), floor(f.y * 14.0) + h * 50.0))) * step(0.12, fract(f.x * 6.0)) * step(fract(f.y * 14.0), 0.55);
    return mix(paper, ink, max(shape, bars));
  }

  // What is on the wall at q (metres along it, metres up from the ground):
  // its colour, and in a how much of the wall it covers. id is the wall's
  // own number, px the metres a pixel covers, spray how much paint this
  // kind of wall takes (a lane's back wall more than a shop's pilaster).
  vec4 wallMarks(vec2 q, float id, float px, float spray) {
    vec4 m = vec4(0.0);
    if (q.y < 0.12 || q.y > 2.9 || px > 0.15) return m;
    float fine = 1.0 - smoothstep(0.02, 0.05, px);
    // Bills, in a run of one to four, some of one print; torn at an edge.
    float cx = floor(q.x / 3.1);
    float h = hash12(vec2(cx, id + 3.0));
    if (h < 0.42) {
      float n = 1.0 + floor(fract(h * 37.0) * 4.0);
      vec2 size = vec2(0.42 + 0.14 * fract(h * 11.0), 0.6 + 0.2 * fract(h * 17.0));
      vec2 o = vec2(cx * 3.1 + 0.15 + (2.8 - n * (size.x + 0.02)) * fract(h * 23.0), 0.95 + 0.5 * fract(h * 29.0));
      vec2 g = vec2((q.x - o.x) / (size.x + 0.02), (q.y - o.y) / size.y);
      vec2 f = vec2(fract(g.x) * (size.x + 0.02) / size.x, g.y);
      if (g.x > 0.0 && g.x < n && g.y > 0.0 && g.y < 1.0 && f.x < 1.0) {
        float hp = hash12(vec2(floor(g.x) * step(0.5, fract(h * 41.0)), h * 91.0));
        float torn = smoothstep(0.5, 0.56, vnoise(q * 9.0 + h * 50.0) * 0.6 + max(abs(f.x - 0.5), abs(f.y - 0.5)) * 0.7 + 0.2 * step(0.6, fract(hp * 19.0 + floor(g.x) * 0.37)));
        m = vec4(bill(f, hp) * (0.7 + 0.3 * vnoise(q * 27.0)), (1.0 - torn) * (1.0 - smoothstep(0.06, 0.15, px)));
      }
    }
    if (fine <= 0.0) return m;
    // A throw-up: fill, the line round it, a second colour in its holes.
    cx = floor(q.x / 5.7 + 0.21);
    h = hash12(vec2(cx, id + 7.0));
    if (h < 0.08 + 0.5 * spray) {
      float wide = 1.5 + 0.5 * fract(h * 7.0);
      vec2 g = (q - vec2((cx - 0.21) * 5.7 + 0.3 + (5.1 - wide) * fract(h * 19.0), 0.45 + 0.6 * fract(h * 31.0))) / (wide / 1.7);
      if (g.x > 0.0 && g.x < 1.75 && g.y > 0.0 && g.y < 0.82) {
        vec3 b = bubbles(g, h * 77.0);
        // (White, pink, cyan or yellow: the first four of the paints.)
        vec3 fill = sprayOf(fract(h * 9.0) * 0.57) * (0.7 + 0.3 * g.y / 0.8);
        vec3 c = mix(mix(fill, fill * 0.25, b.z), vec3(0.03), b.y);
        m = mix(m, vec4(c, 1.0), max(b.x, b.y) * fine * 0.92);
      }
    }
    // A tag.
    cx = floor(q.x / 2.3 + 0.37);
    h = hash12(vec2(cx, id + 11.0));
    if (h < 0.26 + 0.5 * spray) {
      float wide = 0.8 + 0.7 * fract(h * 7.0);
      vec2 g = (q - vec2((cx - 0.37) * 2.3 + 0.1 + (2.1 - wide) * fract(h * 19.0), 0.6 + 1.1 * fract(h * 31.0))) / wide;
      if (g.x > -0.05 && g.x < 1.05 && g.y > -0.14 && g.y < 0.52) {
        float line = 1.0 - smoothstep(0.011, 0.016 + px, scrawl(g, h * 100.0) * wide);
        m = mix(m, vec4(sprayOf(h * 9.0), 1.0), line * fine * 0.9);
      }
    }
    // Stickers, in a swarm round one spot at eye height.
    cx = floor(q.x / 1.7 + 0.61);
    h = hash12(vec2(cx, id + 23.0));
    vec2 hub = vec2((cx - 0.61 + 0.2 + 0.6 * fract(h * 7.0)) * 1.7, 1.1 + 0.6 * fract(h * 13.0));
    vec2 sc = floor(q / 0.13);
    float hs = hash12(sc + id);
    vec2 sd = (sc + 0.5) * 0.13 - hub;
    if (h < 0.55 && hs < 0.6 * exp(-dot(sd, sd) / 0.06)) {
      vec2 sf = fract(q / 0.13) - 0.5 + (vec2(fract(hs * 131.0), fract(hs * 247.0)) - 0.5) * 0.4;
      float big = 0.2 + 0.16 * fract(hs * 331.0);
      float shape = fract(hs * 61.0) < 0.5 ? step(max(abs(sf.x), abs(sf.y) * 1.4), big) : step(length(sf), big);
      vec3 c = mix(sprayOf(hs * 23.0), sprayOf(hs * 71.0 + 0.3), step(length(sf * vec2(1.0, 1.5)), big * 0.45));
      m = mix(m, vec4(c, 1.0), shape * fine);
    }
    return m;
  }

  // What is fixed to the wall at q: a conduit with its clips and its box, or
  // a louvre. x: how much of the wall's paint is metal there; y: how lit
  // (1 the wall's own, more along a lit edge, less in a slot or a shadow);
  // z: the rust run down from it.
  vec3 wallFittings(vec2 q, float id, float px) {
    vec3 r = vec3(0.0, 1.0, 0.0);
    if (px > 0.08) return r;
    float fine = 1.0 - smoothstep(0.03, 0.08, px);
    float cx = floor(q.x / 6.1 + 0.13);
    float h = hash12(vec2(cx, id + 17.0));
    float dx = q.x - (cx - 0.13 + 0.2 + 0.6 * fract(h * 7.0)) * 6.1;
    if (h < 0.3) {
      float pipe = step(abs(dx), 0.025) * step(0.2, q.y) * step(q.y, 3.9);
      float clip = step(abs(dx), 0.05) * step(abs(fract(q.y / 0.9) - 0.5), 0.03) * step(0.2, q.y) * step(q.y, 3.9);
      vec2 b = abs(vec2(dx, q.y - 1.55)) - vec2(0.13, 0.19);
      float box = step(max(b.x, b.y), 0.0);
      float lip = box * step(-0.012, max(b.x, b.y));
      r.x = max(max(pipe, clip), box) * fine;
      r.y = mix(1.0, pipe > 0.5 ? 1.0 - 0.6 * dx / 0.025 : (lip > 0.5 ? 0.55 : 1.25), r.x);
      r.y *= 1.0 - 0.4 * fine * step(0.025, dx) * step(dx, 0.06) * step(0.2, q.y) * step(q.y, 3.9) * (1.0 - box);
    } else if (h < 0.52) {
      vec2 c = vec2(dx, q.y - 2.5 - 0.5 * fract(h * 13.0));
      vec2 b = abs(c) - vec2(0.28, 0.19);
      float vent = step(max(b.x, b.y), 0.0);
      r.x = vent * fine;
      r.y = mix(1.0, max(b.x, b.y) > -0.025 ? 1.3 : (fract(c.y / 0.055) < 0.45 ? 0.3 : 1.1), r.x);
      r.z = step(abs(c.x), 0.26) * step(c.y, -0.19) * exp((c.y + 0.19) / 0.45) * (0.4 + 0.6 * vnoise(vec2(q.x * 23.0, q.y * 1.5))) * fine;
    }
    return r;
  }

  // A roller shutter at q: steel (its colour given), its slats the street's
  // light runs along, dented and rain-streaked, with what the street has
  // put on it. foot is the height of its bottom edge; leak comes back as how
  // much of the light left on inside shows there: a line under the last
  // slat, and a little of it up the slats above.
  vec3 shutterAt(vec3 steel, vec2 q, float id, float px, float spray, float foot, out float leak) {
    float fine = 1.0 - smoothstep(0.012, 0.04, px);
    float slat = fract(q.y / 0.085);
    float curve = 0.55 + 0.5 * smoothstep(0.1, 0.6, slat);
    vec3 c = steel * mix(0.8, curve * (1.0 - 0.5 * step(slat, 0.07)), fine) * (0.8 + 0.4 * vnoise(q * vec2(1.3, 2.1) + id));
    c *= 1.0 - 0.4 * smoothstep(0.5, 0.85, vnoise(vec2(q.x * 9.0, q.y * 0.25 + id))) - 0.3 * smoothstep(foot + 0.75, foot + 0.05, q.y);
    vec4 mk = wallMarks(q, id + 50.0, px, spray);
    c = mix(c, mk.rgb * 0.45 * mix(0.85, curve, fine), mk.a);
    leak = step(0.35, hash12(vec2(id, floor(q.x / 3.4)))) * (1.6 * step(q.y, foot + 0.035) + 0.25 * exp(-max(q.y - foot, 0.0) / 0.1) * curve);
    return c;
  }
`;
