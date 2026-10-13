// src/world/marks.js: what a street leaves on its walls, as GLSL the wall
// and shutter shaders share (materials.js).
//
// At arm's length a ground-floor wall in Night City is never bare: posters
// (the city's own adverts, at poster size) pasted in rows and bills over
// them, torn; tags in five hands; eight pieces down the lanes (throw-ups,
// block letters, a roller's, a burner, two stencils, two characters);
// a few stickers at eye height; a
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
  uniform sampler2D uAds;
  uniform float uHasAds;

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

  // A tag: one line as a hand goes, in one of five hands (three rounds
  // over a stroke, a run of humps, a tally struck through, a coil of
  // leaning loops, a ring with an arrow off it). q in a box 1 wide and
  // under half as high; the distance to the line.
  // None is built of upright strokes with arms off them: a hand of those
  // (a stem and two diagonals, five in a row) read as a letter repeated,
  // and so did a sharp zigzag. Rounds, humps and coils spell nothing, in
  // any script, either way round.
  float tagLine(vec2 q, float seed, float hand) {
    float dm = 1e3;
    float h9 = hash12(vec2(seed, 9.0));
    if (hand < 1.0) {
      // Three rounds apart, each smaller than the last, and a stroke under
      // them. (Never rings linked in a row: four of those are a car maker's.)
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 r = vec2(hash12(vec2(seed, fi * 3.1)), hash12(vec2(seed, fi * 7.7)));
        vec2 c = vec2(0.2 + fi * (0.34 - 0.05 * fi), 0.2 + 0.05 * fi + 0.04 * (r.y - 0.5));
        dm = min(dm, abs(length((q - c) * vec2(1.0, 0.8 + 0.4 * r.x)) - 0.15 + 0.045 * fi));
      }
      return min(dm, segd(q, vec2(0.05, -0.02), vec2(0.7 + 0.25 * h9, 0.0)));
    }
    if (hand < 2.0) {
      // Humps, all the one way up, each its own width and height.
      float x = 0.05;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 r = vec2(hash12(vec2(seed, fi * 3.1)), hash12(vec2(seed, fi * 7.7)));
        float rad = 0.05 + 0.028 * r.x;
        vec2 e = (q - vec2(x + rad, 0.12)) * vec2(1.0, 1.0 / (1.3 + 1.6 * r.y));
        dm = min(dm, e.y > 0.0 ? abs(length(e) - rad) : min(length(e - vec2(rad, 0.0)), length(e + vec2(rad, 0.0))));
        x += rad * 2.0;
      }
      return min(dm, segd(q, vec2(0.1, -0.07), vec2(0.8 + 0.15 * h9, -0.03)));
    }
    if (hand < 3.0) {
      // A tally: plain bars, no flag or foot on any (a bar with a flag and
      // a line across it is a letter), and one long stroke up through them.
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 r = vec2(hash12(vec2(seed, fi * 3.1)), hash12(vec2(seed, fi * 7.7)));
        dm = min(dm, segd(q, vec2(0.1 + fi * 0.15, 0.03 + 0.08 * r.y), vec2(0.1 + fi * 0.15 + 0.06 * (r.y - 0.5), 0.3 + 0.14 * r.x)));
      }
      return min(dm, segd(q, vec2(0.0, 0.02 + 0.06 * h9), vec2(1.0, 0.36 + 0.08 * h9)));
    }
    if (hand < 4.0) {
      // A coil: tall loops leaning one into the next, a lead in, a tail out.
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 r = vec2(hash12(vec2(seed, fi * 3.1)), hash12(vec2(seed, fi * 7.7)));
        vec2 e = q - vec2(0.17 + fi * 0.125, 0.2 + 0.03 * (r.y - 0.5));
        e.x -= e.y * 0.5;
        vec2 rad = vec2(0.075, 0.15 + 0.06 * r.x);
        dm = min(dm, abs(length(e / rad) - 1.0) * rad.x);
      }
      dm = min(dm, segd(q, vec2(0.0, 0.03), vec2(0.1, 0.07)));
      return min(dm, segd(q, vec2(0.88, 0.06), vec2(1.0, 0.1 * h9)));
    }
    vec2 c = vec2(0.2, 0.2);
    vec2 tip = vec2(0.95, 0.12 + 0.2 * hash12(vec2(seed, 2.0)));
    vec2 back = normalize(vec2(0.42, 0.2) - tip) * 0.12;
    dm = min(abs(length(q - c) - 0.16), length(q - c) - 0.02);
    dm = min(dm, segd(q, vec2(0.42, 0.2), tip));
    return min(dm, min(segd(q, tip, tip + back + vec2(-back.y, back.x) * 0.6), segd(q, tip, tip + back - vec2(-back.y, back.x) * 0.6)));
  }

  // A fat form, one of eight, nobody's alphabet and no letter of anybody's.
  // Every one is a closed lump (a round, a block, a barrel, an egg, a
  // ring, a tablet, a cushion, a capsule) with one mark let into it (a
  // slit, a dot), none open on any side, none with a stem, an arm or a
  // bar, none with a point (two points side by side leave an M or a W
  // between them) and every slit upright (two that lean together are a
  // V): lumps that had a notch from one edge were E, U, A, T,
  // S and X to the eye, and a run of those can spell. A run of these
  // cannot. The
  // distance to its edge, under 0 inside; p from -0.5 to 0.5 across it and
  // up it.
  float glyph(vec2 p, float k) {
    vec2 a = abs(p);
    float slit = max(a.x - 0.045, a.y - 0.24);
    if (k < 1.0) return max(length(p * vec2(1.2, 1.0)) - 0.46, -slit);
    if (k < 2.0) return max(max(a.x - 0.38, a.y - 0.46), 0.1 - length(p - vec2(0.0, 0.12)));
    if (k < 3.0) return max(max(a.x - 0.4 + 0.5 * a.y * a.y, a.y - 0.46), -max(a.x - 0.045, a.y - 0.17));
    if (k < 4.0) return max(length(vec2(p.x * (1.25 + 0.5 * p.y), p.y)) - 0.45, 0.09 - length(p + vec2(0.0, 0.12)));
    if (k < 5.0) return max(length(p * vec2(1.1, 0.95)) - 0.44, 0.11 - length(p));
    if (k < 6.0) return max(max(a.x - 0.38, max(-p.y - 0.46, length(vec2(p.x, max(p.y - 0.08, 0.0))) - 0.38)), 0.1 - length(p - vec2(0.0, 0.08)));
    if (k < 7.0) return max(length(max(a - vec2(0.24, 0.32), 0.0)) - 0.14, -max(a.x - 0.05, abs(p.y + 0.04) - 0.2));
    return max(length(vec2(p.x, max(a.y - 0.2, 0.0))) - 0.3, -slit);
  }

  // A word of them run together, n long, each leaning its own way: the
  // distance to its edge. g: across the word (0 to n * 0.78 + 0.22) and up
  // it (0 to 1); soft rounds the letters off as a quick hand does.
  float word(vec2 g, float seed, float n, float soft) {
    float d = 1e3;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      if (fi >= n) break;
      vec2 r = vec2(hash12(vec2(seed, fi * 5.3)), hash12(vec2(seed, fi * 9.1)));
      vec2 p = g - vec2(0.5 + fi * 0.78, 0.5 + (r.y - 0.5) * 0.1);
      p.x += p.y * (r.x - 0.5) * 0.3;
      float e = glyph(p, floor(fract(r.x * 13.0 + seed) * 7.99));
      d = min(d, mix(e, length(p * vec2(1.15, 1.0)) - 0.47, soft * 0.45) - 0.03 * soft);
    }
    return d;
  }

  // The size of each of the eight pieces, in metres.
  vec2 pieceSize(float k) {
    if (k < 1.0) return vec2(2.0, 0.9);
    if (k < 2.0) return vec2(0.8, 0.95);
    if (k < 3.0) return vec2(2.4, 1.0);
    if (k < 4.0) return vec2(0.9, 1.1);
    if (k < 5.0) return vec2(3.2, 1.25);
    if (k < 6.0) return vec2(0.85, 0.95);
    if (k < 7.0) return vec2(3.0, 1.3);
    return vec2(1.0, 1.0);
  }

  // A piece, one of eight: a throw-up in round letters, a moth cut in a
  // stencil, block letters with their shadow, a ghost, a roller's tall
  // letters in one coat, a stencilled head, a burner on its cloud, a
  // one-eyed thing on two legs. g: metres across it and up it; its colour,
  // and in a how much of the wall it covers.
  vec4 piece(vec2 g, float k, float seed) {
    vec2 size = pieceSize(k);
    vec3 c1 = sprayOf(fract(seed * 9.0) * 0.57);
    vec3 c2 = sprayOf(fract(seed * 5.0) * 0.57 + 0.29);
    vec3 ink = vec3(0.03);
    float even = mod(k, 2.0);
    if (even < 0.5) {
      float n = 3.0 + floor(fract(seed * 3.0) * 2.99);
      vec2 u = vec2(g.x / size.x * (n * 0.78 + 0.22), g.y / size.y);
      if (k < 1.0) {
        float d = word(u, seed, n, 1.0);
        vec3 c = mix(c1 * (0.65 + 0.35 * u.y), vec3(0.95), step(d, -0.09) * step(0.62, u.y) * step(fract(u.x * 1.28 + 0.2), 0.14));
        return vec4(mix(c, ink, step(-0.035, d)), step(d, 0.035));
      }
      if (k < 3.0) {
        float d = word(u, seed, n, 0.0);
        float d2 = word(u + vec2(-0.08, 0.08), seed, n, 0.0);
        vec3 c = mix(c2, c1, step(0.5 + 0.08 * sin(u.x * 5.0 + seed * 40.0), u.y));
        c = mix(c, vec3(0.92), step(-0.035, d));
        return vec4(d < 0.0 ? c : ink, max(step(d, 0.0), step(d2, 0.0)));
      }
      if (k < 5.0) {
        float d = word(u, seed, n, 0.0) + (vnoise(g * 9.0) - 0.5) * 0.07;
        float drip = step(hash12(vec2(floor(g.x * 11.0), seed)), 0.16) * step(abs(fract(g.x * 11.0) - 0.5), 0.2) * step(u.y, 0.2);
        vec3 c = fract(seed * 7.0) < 0.6 ? vec3(0.8, 0.8, 0.76) : c1 * 0.9;
        return vec4(c * (0.8 + 0.2 * vnoise(g * vec2(3.0, 40.0))), max(step(d, 0.0), drip * step(word(vec2(u.x, 0.2), seed, n, 0.0), 0.0)));
      }
      float d = word(u, seed, n, 0.5);
      float cloud = step(d, 0.15 + 0.05 * sin(u.x * 13.0 + seed * 9.0) * sin(u.y * 11.0));
      vec3 c = mix(c1, vec3(0.95), smoothstep(0.35, 0.95, u.y) * 0.7);
      c = mix(c, vec3(1.0), step(d, -0.08) * step(fract((u.x + u.y) * 1.7), 0.07));
      c = d < 0.0 ? c : (d < 0.035 ? ink : (d < 0.065 ? vec3(0.9) : c2 * 0.55));
      return vec4(c, cloud);
    }
    vec2 f = g / size;
    vec2 p = vec2(abs(f.x - 0.5), f.y);
    if (k < 2.0 || (k > 4.0 && k < 6.0)) {
      // Stencils: one paint, the bridges that held the card together, a
      // mist of it round the edge, and a line of letters under.
      float d;
      if (k < 2.0) {
        vec2 w = p - vec2(0.0, 0.6);
        d = min(length((w - vec2(0.22, 0.1)) / vec2(0.2, 0.17)) - 1.0, length((w - vec2(0.15, -0.17)) / vec2(0.12, 0.13)) - 1.0) * 0.13;
        d = max(max(d, 0.04 - w.x), 0.05 - length(w - vec2(0.24, 0.12)));
        d = min(d, max(w.x - 0.022, abs(w.y + 0.02) - 0.26));
        d = min(d, segd(w, vec2(0.012, 0.25), vec2(0.1, 0.37)) - 0.008);
      } else {
        d = max(p.x - 0.27, abs(p.y - 0.62) - 0.19);
        d = max(d, 0.065 - length(p - vec2(0.12, 0.66)));
        d = max(d, -max(max(p.x - 0.16, abs(p.y - 0.5) - 0.025), 0.2 - abs(fract(p.x * 11.0) - 0.5)));
        d = min(d, min(max(p.x - 0.012, abs(p.y - 0.88) - 0.07), length(p - vec2(0.0, 0.96)) - 0.035));
        d = min(d, max(p.x - 0.38 + 0.25 * max(p.y - 0.28, 0.0), abs(p.y - 0.28) - 0.1));
      }
      float bars = step(0.04, f.y) * step(f.y, 0.1) * step(0.15, f.x) * step(f.x, 0.85) * step(0.25, fract(f.x * 9.0)) * step(0.2, hash12(vec2(floor(f.x * 9.0), seed)));
      return vec4(c1, max(max(step(d, 0.0), bars), 0.3 * exp(-max(d, 0.0) / 0.03) * step(0.12, f.y)));
    }
    if (k < 4.0) {
      vec2 w = (f - vec2(0.5, 0.56)) * size;
      float d = max(length(vec2(w.x, max(w.y, 0.0))) - 0.33, -w.y - 0.45 - 0.045 * cos(w.x * 28.0));
      vec2 e = vec2(abs(w.x) - 0.12, w.y - 0.08);
      vec3 c = c1 * (0.6 + 0.4 * smoothstep(-0.4, 0.3, w.y));
      c = mix(c, vec3(0.92), step(length(e / vec2(0.07, 0.1)), 1.0));
      c = mix(c, ink, max(step(length(e - vec2(0.02, -0.02)), 0.035), step(length(vec2(w.x, w.y + 0.14) / vec2(0.05, 0.07)), 1.0)));
      return vec4(mix(c, ink, step(-0.025, d)), step(d, 0.0));
    }
    vec2 w = (f - vec2(0.5, 0.6)) * size;
    float d = length(w) - 0.28 - 0.04 * sin(atan(w.y, w.x) * 9.0 + seed * 20.0);
    float legs = step(min(segd(w, vec2(-0.12, -0.25), vec2(-0.17, -0.56)), segd(w, vec2(0.12, -0.25), vec2(0.18, -0.56))), 0.022);
    vec3 c = c1 * (0.6 + 0.4 * smoothstep(-0.3, 0.3, w.y));
    c = mix(c, vec3(0.92), step(length(w - vec2(0.0, 0.05)), 0.14));
    c = mix(c, ink, step(length(w - vec2(0.03, 0.03)), 0.06));
    c = mix(c, ink, step(abs(w.y + 0.17 - 0.03 * abs(fract(w.x * 12.0) - 0.5)), 0.012) * step(abs(w.x), 0.15));
    return vec4(mix(c, ink, max(step(-0.025, d), legs * step(0.0, d))), max(step(d, 0.0), legs));
  }

  // A bill's print: paper, a shape in one ink (one of six), a rule, and
  // bars where the lettering would be. f across and up the sheet, 0..1.
  vec3 bill(vec2 f, float h) {
    vec3 paper = mix(vec3(0.8, 0.76, 0.66), sprayOf(h * 5.0 + 0.2), 0.6 * step(0.4, fract(h * 3.0)));
    vec3 ink = fract(h * 7.0) < 0.5 ? vec3(0.05, 0.05, 0.06) : sprayOf(h * 11.0 + 0.45) * 0.75;
    float pick = fract(h * 13.0) * 6.0;
    vec2 c = f - vec2(0.5, 0.64);
    float shape = pick < 1.0 ? step(length(c), 0.25)
                : (pick < 2.0 ? step(abs(c.x) + abs(c.y), 0.28)
                : (pick < 3.0 ? step(0.5, fract((f.x + f.y) * 4.0)) * step(0.4, f.y) * step(f.y, 0.9)
                : (pick < 4.0 ? step(abs(length(c) - 0.2), 0.05) + step(length(c), 0.07)
                : (pick < 5.0 ? step(abs(c.x), 0.3) * step(abs(c.y), 0.24) * mod(floor(c.x * 6.0 + 9.0) + floor(c.y * 6.0 + 9.0), 2.0)
                : step(abs(c.y) * 1.2 + 0.1, 0.34 - abs(c.x)) + step(abs(c.x), 0.3) * step(abs(c.y + 0.24), 0.02)))));
    float bars = step(0.07, f.y) * step(f.y, 0.3) * step(0.08, f.x) * step(f.x, 0.92)
               * step(0.3, hash12(vec2(floor(f.x * 6.0), floor(f.y * 14.0) + h * 50.0))) * step(0.12, fract(f.x * 6.0)) * step(fract(f.y * 14.0), 0.55);
    float rule = step(abs(f.y - 0.35), 0.008) * step(0.08, f.x) * step(f.x, 0.92) * step(0.5, fract(h * 29.0));
    return mix(paper, ink, clamp(shape + bars + rule, 0.0, 1.0));
  }

  // A poster's print, one of the city's twenty-four adverts (the billboards'
  // atlas, scripts/pack-ads.mjs) stood upright with a paper margin and a
  // line of lettering under it. f across and up the sheet, art which,
  // grain the metres a pixel covers over the sheet's size.
  vec3 poster(vec2 f, float art, vec2 grain) {
    vec2 a = (f - vec2(0.06, 0.17)) / vec2(0.88, 0.78);
    if (a.x < 0.0 || a.x > 1.0 || a.y < 0.0 || a.y > 1.0) {
      float bars = step(0.05, f.y) * step(f.y, 0.12) * step(0.08, f.x) * step(f.x, 0.6 + 0.3 * fract(art * 0.37)) * step(0.2, fract(f.x * 11.0)) * step(0.2, hash12(vec2(floor(f.x * 11.0), art)));
      return mix(vec3(0.78, 0.76, 0.7), vec3(0.06), bars);
    }
    float rowH = 341.0 / 2048.0;
    if (art < 16.0) {
      vec2 uv = vec2((mod(art, 4.0) + 0.5 + (a.x - 0.5) * 0.444) * 0.25, 1.0 - (floor(art / 4.0) + 1.0 - a.y) * rowH);
      return textureGrad(uAds, uv, vec2(grain.x * 0.126, 0.0), vec2(0.0, grain.y * 0.215)).rgb;
    }
    float j = art - 16.0;
    vec2 uv = vec2((mod(j, 4.0) + a.y) * 0.25, 1.0 - (1365.0 + (floor(j / 4.0) + a.x) * 341.0) / 2048.0);
    return textureGrad(uAds, uv, vec2(grain.y * 0.32, 0.0), vec2(0.0, grain.x * 0.19)).rgb;
  }

  // What is on the wall at q (metres along it, metres up from the ground):
  // its colour, and in a how much of the wall it covers. id is the wall's
  // own number, px the metres a pixel covers, spray how much paint this
  // kind of wall takes (a lane's back wall more than a shop's pilaster).
  // Nothing is twice on 20 m of a wall: the posters, the pieces and the
  // tags' hands are each dealt in turn along it, from where the wall's
  // number starts them.
  vec4 wallMarks(vec2 q, float id, float px, float spray) {
    vec4 m = vec4(0.0);
    if (q.y < 0.12 || q.y > 3.1 || px > 0.15) return m;
    float fine = 1.0 - smoothstep(0.02, 0.05, px);
    float far = 1.0 - smoothstep(0.06, 0.15, px);
    // Posters, pasted in a row of two or three, each over the edge of the
    // one before, torn at the edges and some at a corner; and a row of
    // smaller bills pasted over their heads or their feet.
    float cx = floor(q.x / 5.8);
    float h = hash12(vec2(cx, id + 3.0));
    bool clean = spray < 0.0;
    if (h < 0.5 && !clean) {
      float n = 2.0 + floor(fract(h * 37.0) * 1.99);
      vec2 size = vec2(0.62, 0.88);
      vec2 o = vec2(cx * 5.8 + 0.2 + (5.4 - n * 0.56 - 0.1) * fract(h * 23.0), 0.85 + 0.45 * fract(h * 29.0));
      // Under them, what was pasted there before: an older row, a hand
      // lower and further along, faded and mostly torn away, so the paper
      // is layered and not one clean row on a bare wall.
      if (fract(h * 41.0) < 0.65) {
        vec2 o2 = o + vec2(0.27 + 0.2 * fract(h * 43.0), -0.22);
        float i2 = floor((q.x - o2.x) / 0.56);
        if (i2 >= 0.0 && i2 < n + 1.0) {
          vec2 c2 = q - o2 - vec2(i2 * 0.56 + 0.31, 0.44);
          vec2 f2 = c2 / size + 0.5;
          if (f2.x > 0.0 && f2.x < 1.0 && f2.y > 0.0 && f2.y < 1.0) {
            float rag2 = vnoise(q * 6.0 + h * 70.0 + i2 * 3.1) * 0.7 + vnoise(q * 17.0) * 0.3;
            float edge2 = min(min(f2.x, 1.0 - f2.x) * size.x, min(f2.y, 1.0 - f2.y) * size.y);
            float left2 = smoothstep(0.45, 0.5, rag2) * smoothstep(0.0, 0.02, edge2);
            float art2 = floor(mod(cx * 3.0 + i2 + id * 11.0 + 13.0, 24.0));
            vec3 old = uHasAds > 0.5 ? poster(f2, art2, vec2(px) / size) : bill(f2, h * 7.0 + i2);
            m = mix(m, vec4(mix(vec3(0.62, 0.6, 0.55), old * 0.75, 0.55), 1.0), left2 * far);
          }
        }
      }
      float slot = floor((q.x - o.x) / 0.56);
      for (int j = 0; j < 2; j++) {
        float i = slot - 1.0 + float(j);
        if (i < 0.0 || i >= n) continue;
        float hp = hash12(vec2(i + cx * 3.0, h * 91.0 + id));
        vec2 c = q - o - vec2(i * 0.56 + 0.31, 0.44 + (hp - 0.5) * 0.12);
        float lean = (fract(hp * 7.0) - 0.5) * 0.09;
        vec2 f = vec2(c.x + c.y * lean, c.y - c.x * lean) / size + 0.5;
        if (f.x < 0.0 || f.x > 1.0 || f.y < 0.0 || f.y > 1.0) continue;
        float edge = min(min(f.x, 1.0 - f.x) * size.x, min(f.y, 1.0 - f.y) * size.y);
        float rag = vnoise(q * 8.0 + hp * 50.0);
        float corner = length((f - step(0.5, vec2(fract(hp * 3.0), fract(hp * 5.0)))) * size);
        float whole = smoothstep(0.0, 0.03, min(edge - 0.07 * smoothstep(0.45, 0.8, rag), corner - step(fract(hp * 11.0), 0.4) * (0.12 + 0.3 * fract(hp * 17.0)) * (0.6 + 0.8 * rag)));
        // (In turn along the wall, three apart a cell: seven apart a cell
        // and five a slot, a cell's third came back two cells on, 12 m.)
        float art = floor(mod(cx * 3.0 + i + id * 11.0, 24.0));
        vec3 c3 = uHasAds > 0.5 ? poster(f, art, vec2(px) / size) : bill(f, hp);
        c3 = mix(vec3(0.74, 0.72, 0.66), c3 * (0.72 + 0.28 * vnoise(q * 23.0)), smoothstep(0.35, 0.8, whole));
        m = mix(m, vec4(c3, 1.0), smoothstep(0.0, 0.35, whole) * far);
      }
      if (fract(h * 53.0) < 0.6) {
        vec2 bs = vec2(0.4 + 0.1 * fract(h * 11.0), 0.56);
        vec2 g = vec2((q.x - o.x + 0.2 - 0.8 * fract(h * 61.0)) / (bs.x + 0.015), (q.y - o.y - (fract(h * 67.0) < 0.5 ? 0.8 : -0.48)) / bs.y);
        vec2 f = vec2(fract(g.x) * (bs.x + 0.015) / bs.x, g.y);
        if (g.x > 0.0 && g.x < 3.0 + floor(fract(h * 71.0) * 3.0) && g.y > 0.0 && g.y < 1.0 && f.x < 1.0) {
          float hp = hash12(vec2(floor(g.x) + cx * 7.0, h * 31.0 + id));
          float torn = smoothstep(0.5, 0.56, vnoise(q * 9.0 + h * 50.0) * 0.6 + max(abs(f.x - 0.5), abs(f.y - 0.5)) * 0.7 + 0.2 * step(0.6, fract(hp * 19.0)));
          m = mix(m, vec4(bill(f, hp) * (0.7 + 0.3 * vnoise(q * 27.0)), 1.0), (1.0 - torn) * far);
        }
      }
    }
    if (far <= 0.0) return m;
    // A piece: one of eight, in turn along the wall.
    cx = floor(q.x / 6.3 + 0.21);
    h = hash12(vec2(cx, id + 7.0));
    if (h < 0.08 + 0.55 * spray && !clean) {
      float k = mod(cx * 3.0 + id * 5.0, 8.0);
      vec2 size = pieceSize(k) * (0.85 + 0.3 * fract(h * 7.0));
      vec2 g = (q - vec2((cx - 0.21) * 6.3 + 0.2 + (5.9 - size.x) * fract(h * 19.0), 0.3 + (2.4 - size.y) * fract(h * 31.0) * 0.6)) / (0.85 + 0.3 * fract(h * 7.0));
      vec2 full = pieceSize(k);
      if (g.x > 0.0 && g.x < full.x && g.y > 0.0 && g.y < full.y) {
        vec4 pc = piece(g, k, h * 77.0);
        m = mix(m, vec4(pc.rgb, 1.0), pc.a * far * 0.94);
      }
    }
    if (fine <= 0.0) return m;
    // A tag: five hands and seven paints, in turn.
    cx = floor(q.x / 2.3 + 0.37);
    h = hash12(vec2(cx, id + 11.0));
    if (h < 0.22 + 0.5 * spray && !clean) {
      float wide = 0.8 + 0.7 * fract(h * 7.0);
      vec2 g = (q - vec2((cx - 0.37) * 2.3 + 0.1 + (2.1 - wide) * fract(h * 19.0), 0.6 + 1.1 * fract(h * 31.0))) / wide;
      if (g.x > -0.05 && g.x < 1.05 && g.y > -0.14 && g.y < 0.52) {
        float line = 1.0 - smoothstep(0.011, 0.016 + px, tagLine(g, h * 100.0, mod(cx * 2.0 + id * 3.0, 5.0)) * wide);
        m = mix(m, vec4(sprayOf((mod(cx * 3.0 + id, 7.0) + 0.5) / 7.0), 1.0), line * fine * 0.9);
      }
    }
    // Stickers, a few round one spot at eye height: a white edge, a
    // colour, a mark.
    cx = floor(q.x / 2.9 + 0.61);
    h = hash12(vec2(cx, id + 23.0));
    vec2 hub = vec2((cx - 0.61 + 0.2 + 0.6 * fract(h * 7.0)) * 2.9, 1.2 + 0.5 * fract(h * 13.0));
    vec2 sc = floor(q / 0.19);
    float hs = hash12(sc + id);
    vec2 sd = (sc + 0.5) * 0.19 - hub;
    if (h < (clean ? 0.15 : 0.4) && hs < 0.5 * exp(-dot(sd, sd) / 0.07)) {
      vec2 sf = (fract(q / 0.19) - 0.5 + (vec2(fract(hs * 131.0), fract(hs * 247.0)) - 0.5) * 0.3) * 0.19;
      float big = 0.04 + 0.025 * fract(hs * 331.0);
      float d = fract(hs * 61.0) < 0.5 ? max(abs(sf.x), abs(sf.y) * 1.4) : length(sf);
      vec3 c = mix(sprayOf(hs * 23.0), sprayOf(hs * 71.0 + 0.3), step(length(sf * vec2(1.0, 1.5)), big * 0.45));
      m = mix(m, vec4(mix(c, vec3(0.85), step(big * 0.8, d)), 1.0), step(d, big) * fine);
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
  // slat, and a little of it up the slats above. loc is where on the
  // shutter this is (metres from its left edge, metres above its foot), or
  // under 0 where the shutter cannot say: with it a shutter has its guides
  // (a bay every 3.2 m), a bottom rail with its lock and lifts, a hood with
  // a strip in the shop's colour, and one in three a piece right across it.
  vec3 shutterAt(vec3 steel, vec2 q, float id, float px, float spray, float foot, vec2 loc, out float leak) {
    float fine = 1.0 - smoothstep(0.012, 0.04, px);
    float slat = fract(q.y / 0.085);
    float curve = 0.55 + 0.5 * smoothstep(0.1, 0.6, slat);
    vec3 c = steel * mix(0.8, curve * (1.0 - 0.5 * step(slat, 0.07)), fine) * (0.8 + 0.4 * vnoise(q * vec2(1.3, 2.1) + id));
    c *= 1.0 - 0.4 * smoothstep(0.5, 0.85, vnoise(vec2(q.x * 9.0, q.y * 0.25 + id))) - 0.3 * smoothstep(foot + 0.75, foot + 0.05, q.y);
    float bx = mod(loc.x, 3.2);
    float way = dFdx(q.x) * dFdx(loc.x) + dFdy(q.x) * dFdy(loc.x) < 0.0 ? -1.0 : 1.0;
    float hb = hash12(vec2(floor(loc.x / 3.2) + floor((q.x - way * loc.x) * 2.0 + 0.37), id + 31.0));
    if (loc.x >= 0.0 && hb < 0.34 && px < 0.15 && spray >= 0.0) {
      // (Any of the eight pieces, the figures too, away from the hero's
      // lens: the four lettered ones alone were the same pink row of
      // lumps on shutters both sides of a street.)
      float k = freeEye() > 0.5 ? floor(fract(hb * 13.0) * 8.0) : floor(fract(hb * 13.0) * 4.0) * 2.0;
      vec2 size = pieceSize(k);
      float scale = 2.9 / size.x;
      vec2 g = vec2(bx - 0.15, loc.y - 0.5 - 0.6 * fract(hb * 29.0)) / scale;
      if (g.x > 0.0 && g.x < size.x && g.y > 0.0 && g.y < size.y) {
        vec4 pc = piece(g, k, hb * 77.0);
        c = mix(c, pc.rgb * 0.45 * mix(0.85, curve, fine), pc.a * (1.0 - smoothstep(0.06, 0.15, px)) * 0.94);
      }
    }
    vec4 mk = wallMarks(q, id + 50.0, px, spray);
    c = mix(c, mk.rgb * 0.45 * mix(0.85, curve, fine), mk.a);
    if (loc.x >= 0.0 && px < 0.12) {
      float near = 1.0 - smoothstep(0.03, 0.12, px);
      vec3 plain = steel * (0.7 + 0.3 * vnoise(q * 3.0 + id));
      float guide = max(step(bx, 0.07), step(3.13, bx));
      float hood = step(2.6, loc.y);
      float rail = step(loc.y, 0.11);
      c = mix(c, plain * (0.85 + 0.5 * step(abs(bx - 0.07), 0.012) + 0.5 * step(abs(bx - 3.13), 0.012)), guide * near);
      c = mix(c, plain * (1.05 - 0.5 * step(abs(loc.y - 2.61), 0.012)), hood * near);
      c = mix(c, plain * (0.6 - 0.45 * step(loc.y, 0.03)), rail * near);
      float strip = hood * step(abs(loc.y - 2.74), 0.055) * step(0.22, bx) * step(bx, 2.98);
      float letters = step(abs(loc.y - 2.74), 0.028) * step(0.4, bx) * step(bx, 1.2 + 1.2 * fract(hb * 41.0)) * step(0.25, fract(bx * 9.0)) * step(0.2, hash12(vec2(floor(bx * 9.0), hb * 50.0)));
      c = mix(c, mix(sprayOf(hb * 17.0) * 0.4, vec3(0.75), letters * fine), strip * near);
      vec2 lk = abs(vec2(bx - 1.6, loc.y - 0.24)) - vec2(0.085, 0.065);
      float lock = step(max(lk.x, lk.y), 0.0);
      c = mix(c, plain * (max(lk.x, lk.y) > -0.012 ? 0.6 : 1.5) * (1.0 - 0.8 * step(length(vec2(bx - 1.6, loc.y - 0.235)), 0.016)), lock * fine);
      c *= 1.0 - 0.7 * fine * step(abs(abs(bx - 1.6) - 0.85), 0.07) * step(abs(loc.y - 0.21), 0.014);
    }
    leak = step(0.35, hash12(vec2(id, floor(q.x / 3.4)))) * (1.6 * step(q.y, foot + 0.035) + 0.25 * exp(-max(q.y - foot, 0.0) / 0.1) * curve);
    return c;
  }
`;
