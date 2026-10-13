// src/world/interiors.js: the room behind a shop's glass, drawn, not
// photographed.
//
// Interior mapping, as the offices and the lobbies have it (materials.js):
// the eye's ray runs through the pane into a box and what it meets is shaded
// there, so the room has depth and slides behind its mullions as a walker
// passes. Everything in it is worked out in the fragment, in the renderer's
// own flat, lit style: a back wall, side walls, a ceiling with its lights, a
// floor, and layers of furniture between the glass and the back, each a
// plane or a box the ray is tested against, furthest first.
//
// Eight trades, told apart across a street by their light before anything
// in them is made out, each a room of its own (no shelf of stock is shared):
//
//   0 store     cold white tubes, aisles end on, fridges lit along the back
//   1 bar       near dark, a back wall of bottles lit from behind, a counter
//   2 noodle    orange, a pass onto a bright kitchen, steam, red lanterns
//   3 arcade    violet dark, rows of cabinets with their screens running
//   4 clinic    green white, a lit cross, small boxes behind a counter
//   5 boutique  warm spots on one strong colour, rails, figures in the window
//   6 workshop  one hung tube over a bench, a tool board, tyres, a drum
//   7 dark      shut for the night: a grille, an exit lamp, a door ajar
//
// Which trade a pane is comes from the kit (materials.js deals them along
// each wall so neighbours differ, and reads the sign over the door where
// there is one: src/world/trades.js). No words anywhere: lettering is bars.
//
// The builder's panes carry their own metres in their UVs (u from the
// pane's left edge, v down from a metre over the sill); the older kit's
// carry the world's, and those rooms are cut every 3.2 m of the street.

export const SHOP_ROOM = /* glsl */ `
  const float GLASS = 2.75;
  // The shop's floor and ceiling, from the sill.
  const float FLOOR_Y = -0.4;
  const float CEIL_Y = 2.95;

  vec3 neonOf(float k) {
    k = fract(k) * 6.0;
    if (k < 1.0) return vec3(1.0, 0.18, 0.53);
    if (k < 2.0) return vec3(0.15, 0.86, 0.95);
    if (k < 3.0) return vec3(1.0, 0.7, 0.33);
    if (k < 4.0) return vec3(0.22, 1.0, 0.6);
    if (k < 5.0) return vec3(0.64, 0.29, 1.0);
    return vec3(0.99, 0.93, 0.04);
  }

  // What clothes are dyed: black, bone, denim, red, olive, pink, mustard.
  vec3 clothOf(float k) {
    k = fract(k) * 7.0;
    if (k < 1.0) return vec3(0.03, 0.03, 0.035);
    if (k < 2.0) return vec3(0.8, 0.78, 0.72);
    if (k < 3.0) return vec3(0.1, 0.18, 0.4);
    if (k < 4.0) return vec3(0.65, 0.07, 0.07);
    if (k < 5.0) return vec3(0.25, 0.3, 0.12);
    if (k < 6.0) return vec3(0.85, 0.4, 0.55);
    return vec3(0.8, 0.6, 0.15);
  }

  float within(vec2 q, vec2 lo, vec2 hi) {
    vec2 s = step(lo, q) * step(q, hi);
    return s.x * s.y;
  }

  // Somebody standing at x0, feet on the floor.
  float person(vec2 q, float x0) {
    float fx = q.x - x0;
    float fy = q.y - FLOOR_Y;
    float body = step(abs(fx), 0.21 - 0.05 * smoothstep(1.05, 1.45, fy)) * step(fy, 1.48) * step(0.0, fy);
    return max(body, step(length(vec2(fx, fy - 1.63)), 0.11));
  }

  // A ray from p along d in a room W wide and D deep: where it lands (h),
  // on what (0 the back wall, 1 the ceiling, 2 the floor, 3 a side wall)
  // and how far along it.
  float boxHit(vec3 p, vec3 d, float W, float D, out vec3 h, out float face) {
    float tx = d.x > 0.0 ? (W - p.x) / d.x : -p.x / min(d.x, -1e-4);
    float ty = d.y > 0.0 ? (CEIL_Y - p.y) / d.y : (FLOOR_Y - p.y) / min(d.y, -1e-4);
    float tz = D / d.z;
    float tm = min(min(tx, ty), tz);
    h = p + d * tm;
    face = tm == tz ? 0.0 : (tm == ty ? (d.y > 0.0 ? 1.0 : 2.0) : 3.0);
    return tm;
  }

  // A store's stock, a facing to a cell (one product three or so abreast):
  // bottles with their shoulders, necks and caps, boxes and pouches with a
  // label's band, each shaded round, stood on a shelf whose edge carries a
  // strip of price tickets; dark behind them. Its average where they are
  // finer than a pixel (fine 0). Flat pastel rectangles read as no stock.
  vec3 stock(vec2 q, vec2 size, float seed, float fine) {
    vec2 g = q / size;
    vec2 f = fract(g);
    float h = hash12(floor(g) + seed);
    float run = hash12(vec2(floor(g.x / 3.0), floor(g.y)) + seed);
    float kind = fract(run * 9.0);
    float y = (f.y - 0.1) / (0.5 + 0.34 * fract(run * 5.0));
    float x = abs(f.x - 0.5);
    float hw = kind < 0.4 ? (y < 0.6 ? 0.36 : max(0.36 - (y - 0.6) * 1.9, 0.13)) : (kind < 0.75 ? 0.41 : 0.4 - 0.12 * smoothstep(0.7, 1.0, y));
    float item = step(x, hw) * step(0.0, y) * step(y, 1.0) * step(0.08, h);
    vec3 body = mix(neonOf(run * 3.7) * 0.5, vec3(0.72, 0.7, 0.64), step(0.7, fract(run * 13.0)));
    if (kind < 0.4) body = mix(body, vec3(0.05, 0.17, 0.09), step(0.5, fract(run * 21.0)));
    float label = step(abs(y - 0.36), 0.15) * (kind < 0.4 ? 1.0 : step(0.4, fract(run * 17.0)));
    vec3 c = mix(body, mix(vec3(0.86, 0.84, 0.76), neonOf(run * 7.1 + 0.3) * 0.8, 0.5 * step(0.5, fract(run * 29.0))), label);
    c = mix(c, vec3(0.7, 0.08, 0.06), step(0.88, y) * step(kind, 0.4));
    c *= 0.62 + 0.38 * smoothstep(hw, 0.0, x);
    vec3 full = mix(vec3(0.03), c, item);
    float ticket = step(abs(f.x - 0.5), 0.24) * step(0.02, f.y) * step(f.y, 0.065);
    full = mix(full, mix(vec3(0.5, 0.5, 0.48), mix(vec3(0.85, 0.84, 0.8), vec3(0.9, 0.72, 0.08), step(0.8, fract(run * 3.0))), ticket), step(f.y, 0.085));
    return mix(vec3(0.19, 0.19, 0.2), full, fine);
  }

  // A game's screen: two of the city's colours running in bars.
  vec3 screenOf(float hs, vec2 f) {
    vec3 a = neonOf(hs * 7.0 + floor(uTime * (0.3 + hs)) * 0.17);
    vec3 b = neonOf(hs * 3.0 + 0.5);
    return mix(a, b, 0.5 + 0.5 * sin(f.y * 19.0 + uTime * (2.0 + 5.0 * hs))) * (0.75 + 0.25 * step(0.5, fract(f.x * 3.0 + uTime * hs)));
  }

  // 0: a convenience store. Cold white tubes end on to the street, fridges
  // lit along the back under a band of the shop's colour, aisles of
  // shelving end on, somebody in one.
  vec3 roomStore(vec3 p, vec3 d, float W, float seed, float fine, vec3 acc) {
    float D = 4.6 + 1.6 * fract(seed * 3.1);
    vec3 h;
    float face;
    float tm = boxHit(p, d, W, D, h, face);
    vec3 lit = vec3(0.8, 0.93, 1.0);
    vec2 q = vec2(h.x, h.y - FLOOR_Y);
    vec3 col;
    if (face < 0.5) {
      float fridge = step(0.12, q.y) * step(q.y, 2.2);
      vec3 inside = vec3(0.55, 0.85, 1.0) * 0.3 + stock(q, vec2(0.13, 0.36), seed * 31.0, fine) * 0.85;
      col = mix(lit * 0.3, inside, fridge);
      col *= 1.0 - 0.8 * step(fract(q.x / 0.78), 0.06) * fridge;
      col = mix(col, acc * 1.2, step(abs(q.y - 2.48), 0.14));
    } else if (face < 1.5) {
      vec2 f = abs(fract(h.xz / vec2(0.9, 2.6)) - 0.5);
      col = lit * (0.14 + 2.6 * mix(0.2, step(f.x, 0.07) * step(f.y, 0.4), fine));
    } else if (face < 2.5) {
      vec2 tile = floor(h.xz / 0.6);
      col = lit * (0.2 + 0.08 * cos(h.x * 7.0)) * (0.8 + 0.2 * mod(tile.x + tile.y, 2.0) * fine);
    } else {
      vec2 s = vec2(h.z, h.y - FLOOR_Y);
      col = mix(lit * 0.32, lit * 0.1 + stock(s, vec2(0.2, 0.42), seed * 47.0 + step(d.x, 0.0), fine) * lit * 0.8, step(0.25, s.y) * step(s.y, 2.15));
    }
    col *= 1.0 - 0.25 * h.z / D;
    // Aisles: shelving end on to the street, the next two the ray meets.
    float aisle = 1.35;
    float xs = d.x > 0.0 ? floor(p.x / aisle + 1.0) * aisle : ceil(p.x / aisle - 1.0) * aisle;
    for (int i = 0; i < 2; i++) {
      float tg = (xs - p.x) / (abs(d.x) > 1e-4 ? d.x : 1e-4);
      vec3 w = p + d * tg;
      if (tg > 0.0 && tg < tm && xs > 0.3 && xs < W - 0.3 && w.z > 1.2 && w.z < D - 1.0 && w.y < FLOOR_Y + 1.6) {
        col = lit * 0.08 + stock(vec2(w.z, w.y - FLOOR_Y), vec2(0.17, 0.4), seed * 5.0 + xs, fine) * lit * 0.95;
        tm = tg;
        break;
      }
      xs += d.x > 0.0 ? aisle : -aisle;
    }
    // Their ends, a yellow offer card over each.
    float t = 1.2 / d.z;
    vec3 w = p + d * t;
    float gx = abs(fract(w.x / aisle + 0.5) - 0.5) * aisle;
    if (t < tm && gx < 0.24 && w.x > 0.5 && w.x < W - 0.5 && w.y < FLOOR_Y + 1.6) {
      col = lit * 0.08 + stock(vec2(gx + w.x, w.y - FLOOR_Y), vec2(0.16, 0.4), seed * 3.0, fine) * lit;
      col = mix(col, vec3(1.0, 0.85, 0.1) * 0.9, step(FLOOR_Y + 1.32, w.y));
      tm = t;
    }
    t = 0.8 / d.z;
    w = p + d * t;
    if (t < tm && fract(seed * 29.0) < 0.5 && person(w.xy, W * (0.25 + 0.5 * fract(seed * 37.0))) > 0.5) col = lit * vec3(0.09, 0.08, 0.11);
    return col;
  }

  // 1: a bar. Near dark: the back bar's shelves lit from behind in the
  // bar's colour with the bottles dark against them, a counter with a line
  // of that colour under its lip and lamps hung low over it, stools, and
  // who sits on them and who serves as shapes against the bottles.
  vec3 roomBar(vec3 p, vec3 d, float W, float seed, float fine, vec3 acc) {
    float D = 3.6 + 1.2 * fract(seed * 3.1);
    vec3 h;
    float face;
    float tm = boxHit(p, d, W, D, h, face);
    vec3 warm = vec3(1.0, 0.5, 0.22);
    vec2 q = vec2(h.x, h.y - FLOOR_Y);
    vec3 col;
    if (face < 0.5) {
      col = warm * 0.03;
      float band = step(1.15, q.y) * step(q.y, 2.35) * step(0.3, q.x) * step(q.x, W - 0.3);
      vec2 g = vec2(q.x / 0.11, (q.y - 1.15) / 0.4);
      vec2 f = fract(g);
      float hb = hash12(floor(g) + seed * 17.0);
      float tall = 0.5 + 0.38 * fract(hb * 7.0);
      float bottle = step(0.18, hb) * step(abs(f.x - 0.5), f.y < tall * 0.65 ? 0.32 : 0.12) * step(f.y, tall) * step(0.07, f.y);
      vec3 glow = mix(acc, vec3(1.0, 0.7, 0.35), 0.3) * 1.6;
      vec3 shelf = mix(glow, mix(vec3(0.5, 0.22, 0.06), neonOf(hb * 5.0), 0.3) * 0.28, bottle * fine);
      shelf *= 1.0 - 0.8 * step(f.y, 0.07);
      col = mix(col, shelf * mix(0.72, 1.0, fine), band);
    } else if (face < 1.5) {
      col = warm * 0.015;
    } else if (face < 2.5) {
      col = warm * 0.04 + acc * 0.12 * exp(-(D - h.z) * 1.1);
    } else {
      // Dark panelling, and a ring of tube on it.
      vec2 s = vec2(h.z, h.y - FLOOR_Y);
      col = warm * (0.05 + 0.06 * step(1.05, s.y));
      col += acc * 1.6 * (1.0 - smoothstep(0.02, 0.04, abs(length(s - vec2(D * 0.5, 1.75)) - 0.3)));
    }
    float bar = FLOOR_Y + 1.08;
    float t = 3.0 / d.z;
    vec3 w = p + d * t;
    if (t < tm && person(w.xy, W * (0.3 + 0.4 * fract(seed * 19.0))) > 0.5) { col = warm * 0.012; tm = t; }
    // The counter's top, the lamps' pools on it.
    t = (bar - p.y) / min(d.y, -1e-4);
    w = p + d * t;
    if (d.y < 0.0 && t < tm && w.z > 2.0 && w.z < 2.5 && w.x > 0.25 && w.x < W - 0.25) {
      float pool = exp(-pow((fract(w.x / 1.1) - 0.5) * 1.1, 2.0) * 14.0);
      col = warm * vec3(0.5, 0.3, 0.2) * (0.12 + 1.1 * pool);
      tm = t;
    }
    t = 2.0 / d.z;
    w = p + d * t;
    float edge = step(0.25, w.x) * step(w.x, W - 0.25);
    if (t < tm && w.y < bar && edge > 0.5) {
      col = warm * 0.02 + acc * 1.1 * step(abs(w.y - bar + 0.1), 0.025);
      tm = t;
    }
    if (t < tm) {
      vec2 lamp = vec2((fract(w.x / 1.1) - 0.5) * 1.1, w.y - 1.9);
      col = mix(col, vec3(0.01), edge * step(abs(lamp.x), 0.012) * step(0.0, lamp.y));
      col = mix(col, vec3(1.0, 0.7, 0.4) * 2.6, edge * step(length(lamp), 0.1));
    }
    t = 1.5 / d.z;
    w = p + d * t;
    float sx = (fract(w.x / 0.75) - 0.5) * 0.75;
    float stool = max(step(abs(sx), 0.17) * step(abs(w.y - FLOOR_Y - 0.74), 0.04), step(abs(sx), 0.025) * step(w.y, FLOOR_Y + 0.74));
    float sat = step(0.55, hash12(vec2(floor(w.x / 0.75), seed * 53.0))) * person(vec2(sx, w.y - 0.34), 0.0);
    if (t < tm && w.x > 0.3 && w.x < W - 0.3 && max(stool, sat) > 0.5) col = warm * 0.008;
    return col;
  }

  // 2: a noodle counter. Orange: timber, a pass onto a bright tiled
  // kitchen with the cook in it and steam off the pots, paper slips of the
  // menu over it, a counter with bowls on it and backs along it, a row of
  // red lanterns inside the glass and a short curtain across its top.
  vec3 roomNoodle(vec3 p, vec3 d, float W, float seed, float fine, vec3 acc) {
    float D = 3.3 + 0.9 * fract(seed * 3.1);
    vec3 h;
    float face;
    float tm = boxHit(p, d, W, D, h, face);
    vec3 warm = vec3(1.0, 0.66, 0.34);
    vec3 timber = vec3(0.5, 0.3, 0.18);
    vec2 q = vec2(h.x, h.y - FLOOR_Y);
    vec3 col;
    if (face < 0.5) {
      col = warm * timber * 0.8 * (1.0 - 0.25 * step(fract(q.x / 0.14), 0.1) * fine);
      vec2 g = vec2(q.x / 0.22, (q.y - 2.2) / 0.6);
      float hs = hash12(vec2(floor(g.x), seed * 7.0));
      float slip = step(0.0, g.y) * step(g.y, 1.0) * step(0.2, hs) * within(fract(g), vec2(0.1, 0.06), vec2(0.9, 0.94)) * step(W * 0.12, q.x) * step(q.x, W * 0.88);
      float ink = step(abs(fract(g.x) - 0.5), 0.12) * step(0.35, hash12(floor(vec2(g.x, g.y * 7.0)) + seed)) * fine;
      col = mix(col, mix(vec3(0.8, 0.72, 0.55), hs > 0.8 ? vec3(0.7, 0.06, 0.04) : vec3(0.05), ink), slip);
      // The pass: tiles, pans hung in a row, the hood's edge, steam.
      float pass = within(q, vec2(W * 0.14, 1.08), vec2(W * 0.86, 2.0));
      // (Lit from its hood, so bright under it and dim at the range: lit
      // evenly at one and a half it was a blank white board with a grid.)
      vec3 kitchen = vec3(1.0, 0.86, 0.6) * (0.3 + 0.62 * smoothstep(1.1, 1.86, q.y));
      kitchen *= 1.0 - 0.1 * fine * (step(fract(q.x / 0.15), 0.08) + step(fract(q.y / 0.15), 0.08));
      float pan = step(length(vec2((fract(q.x / 0.42) - 0.5) * 0.42, q.y - 1.72)), 0.13) * step(0.4, hash12(vec2(floor(q.x / 0.42), seed)));
      kitchen = mix(kitchen, vec3(0.05, 0.04, 0.035), pan);
      // A shelf of bowls stacked, and the pots on the range under it.
      vec2 bw = vec2(fract(q.x / 0.3) - 0.5, q.y - 1.36);
      float hbw = hash12(vec2(floor(q.x / 0.3), seed * 3.0));
      kitchen = mix(kitchen, vec3(0.8, 0.78, 0.7) * (0.35 + 0.3 * step(0.5, fract(bw.y / 0.045))), step(abs(bw.x), 0.3) * step(0.0, bw.y) * step(bw.y, 0.05 + 0.14 * hbw) * step(0.3, hbw));
      kitchen = mix(kitchen, vec3(0.04, 0.035, 0.03), step(abs(q.y - 1.345), 0.014));
      vec2 pt = vec2((fract(q.x / 0.56 + 0.3) - 0.5) * 0.56, q.y - 1.08);
      float hpt = hash12(vec2(floor(q.x / 0.56 + 0.3), seed * 5.0));
      kitchen = mix(kitchen, vec3(0.22, 0.22, 0.23) * (0.5 + 0.9 * smoothstep(0.17, 0.0, abs(pt.x + 0.05))), step(abs(pt.x), 0.17) * step(pt.y, 0.12 + 0.1 * hpt) * step(0.25, hpt));
      kitchen *= 1.0 - 0.85 * step(1.88, q.y);
      float steam = vnoise(vec2(q.x * 2.3 + seed * 9.0, q.y * 1.6 - uTime * 0.5)) * vnoise(vec2(q.x * 5.0 - uTime * 0.2, q.y * 3.0 - uTime * 0.9));
      kitchen = mix(kitchen, vec3(1.0, 0.95, 0.85) * 0.95, smoothstep(0.25, 0.7, steam) * 0.5);
      col = mix(col, kitchen, pass);
    } else if (face < 1.5) {
      col = warm * 0.1 * (1.0 + step(fract(h.x / 0.6), 0.12));
    } else if (face < 2.5) {
      col = warm * vec3(0.4, 0.3, 0.25) * 0.24;
    } else {
      vec2 s = vec2(h.z, h.y - FLOOR_Y);
      col = warm * timber * 0.7 * (1.0 - 0.25 * step(fract(s.x / 0.14), 0.1) * fine);
      // What hangs on it is the shop's own: red cards with a disc on
      // each, shelves of jars and bottles, or one long black menu board
      // (the cards alone made every counter in the city the same wall).
      float look = fract(seed * 41.0);
      if (look < 0.34) {
        vec2 g = vec2(s.x / 0.8, (s.y - 1.1) / 1.0);
        float card = step(0.0, g.y) * step(g.y, 1.0) * within(fract(g), vec2(0.15, 0.1), vec2(0.85, 0.9));
        col = mix(col, mix(vec3(0.75, 0.1, 0.05), vec3(0.95, 0.86, 0.66), step(length(fract(g) - vec2(0.5, 0.55)), 0.22)) * 0.55, card);
      } else if (look < 0.67) {
        col = mix(col, warm * 0.05 + stock(s, vec2(0.16, 0.36), seed * 47.0 + step(d.x, 0.0), fine) * warm * 0.7, step(0.4, s.x) * step(s.x, D - 0.3) * step(1.0, s.y) * step(s.y, 2.1));
      } else {
        vec2 g = vec2(s.x - D * 0.5, s.y - 1.6);
        float board = step(abs(g.x), D * 0.36) * step(abs(g.y), 0.5);
        float chalk = step(abs(fract(g.y / 0.2) - 0.5), 0.2) * step(0.3, hash12(floor(vec2(g.x / 0.09, g.y / 0.2)) + seed)) * step(abs(g.x), D * 0.36 - 0.12) * fine;
        col = mix(col, mix(vec3(0.025), vec3(0.8, 0.76, 0.6) * 0.5, chalk), board);
      }
    }
    col *= 1.0 - 0.2 * h.z / D;
    float bar = FLOOR_Y + 1.02;
    float t = (D - 0.25) / d.z;
    vec3 w = p + d * t;
    float cook = W * (0.3 + 0.4 * fract(seed * 19.0)) + 0.12 * sin(uTime * 0.6 + seed * 30.0);
    if (t < tm && w.y > FLOOR_Y + 1.1 && w.y < FLOOR_Y + 1.88 && abs(w.x - W * 0.5) < W * 0.36 && person(w.xy, cook) > 0.5) {
      col = (w.y - FLOOR_Y > 1.52 ? vec3(0.8, 0.56, 0.44) : vec3(0.92, 0.9, 0.85)) * 0.6;
      tm = t;
    }
    // The counter before the pass: its top with bowls on it, its slatted front.
    t = (bar - p.y) / min(d.y, -1e-4);
    w = p + d * t;
    if (d.y < 0.0 && t < tm && w.z > 1.9 && w.z < 2.4) {
      float bowl = step(length(vec2((fract(w.x / 0.7) - 0.5) * 0.7, (w.z - 2.15) * 2.2)), 0.14);
      col = warm * mix(timber * 0.8, vec3(0.9, 0.2, 0.1), bowl * fine);
      tm = t;
    }
    t = 1.9 / d.z;
    w = p + d * t;
    if (t < tm && w.y < bar) {
      col = warm * vec3(0.4, 0.24, 0.14) * 0.3 * (0.6 + 0.4 * step(0.25, fract(w.x / 0.12)));
      tm = t;
    }
    // Stools and who sits on them, backs to the street, the kitchen's light
    // on their shoulders.
    t = 1.4 / d.z;
    w = p + d * t;
    float sx = (fract(w.x / 0.7) - 0.5) * 0.7;
    float stool = max(step(abs(sx), 0.16) * step(abs(w.y - FLOOR_Y - 0.7), 0.04), step(abs(sx), 0.025) * step(w.y, FLOOR_Y + 0.7));
    float who = hash12(vec2(floor(w.x / 0.7), seed * 53.0));
    float sat = step(0.45, who) * person(vec2(sx, w.y - 0.32), 0.0);
    if (t < tm && w.x > 0.3 && w.x < W - 0.3 && max(stool, sat) > 0.5) {
      col = mix(vec3(0.02, 0.015, 0.012), neonOf(who * 7.0) * 0.12 + warm * 0.06, sat * smoothstep(0.9, 1.6, w.y - FLOOR_Y));
      tm = t;
    }
    // Lanterns.
    t = 0.5 / d.z;
    w = p + d * t;
    if (t < tm) {
      vec2 l = vec2((fract(w.x / 0.9 + 0.5 * fract(seed * 5.0)) - 0.5) * 0.9, w.y - 2.28);
      float body = step(length(l * vec2(1.0, 0.78)), 0.17);
      float cap = step(abs(l.x), 0.07) * step(abs(abs(l.y) - 0.23), 0.025);
      float cord = step(abs(l.x), 0.008) * step(0.23, l.y);
      col = mix(col, vec3(0.01), max(cap, cord));
      col = mix(col, (fract(seed * 61.0) < 0.67 ? vec3(1.0, 0.2, 0.06) * 2.5 : vec3(1.0, 0.82, 0.55) * 1.3) * (1.0 - 7.0 * dot(l, l)) * (0.85 + 0.15 * step(0.5, fract(l.y * 22.0)) * fine), body);
    }
    // The curtain across the top of the window, a ring dyed on each width.
    t = 0.1 / d.z;
    w = p + d * t;
    if (w.y > 2.2) {
      float fx = fract(w.x / 0.62);
      float cloth = step(0.04, fx) * step(2.2 + 0.05 * step(0.5, fract(w.x / 1.24)), w.y);
      float nk = fract(seed * 13.0);
      vec3 dye = (nk < 0.4 ? vec3(0.04, 0.07, 0.26) : (nk < 0.7 ? acc * 0.3 : (nk < 0.85 ? vec3(0.3, 0.03, 0.03) : vec3(0.5, 0.46, 0.38)))) + warm * 0.1;
      // Its mark: a ring, three bars, or a band along its hem.
      float mk = fract(seed * 67.0);
      float ring = length(vec2((fx - 0.52) * 0.62, w.y - 2.5));
      float mark = mk < 0.34 ? step(ring, 0.11) - step(ring, 0.07)
                 : (mk < 0.67 ? step(abs(fract(fx * 5.0) - 0.5), 0.2) * step(abs(fx - 0.52), 0.3) * step(abs(w.y - 2.5), 0.1) : step(abs(w.y - 2.3), 0.03));
      dye = mix(dye, nk < 0.85 ? vec3(0.63, 0.6, 0.56) : vec3(0.05, 0.05, 0.12), mark);
      col = mix(col, dye, cloth);
    }
    return col;
  }

  // 3: an arcade. Violet and dark: cabinets along the back wall and down
  // the sides with their screens running and their marquees lit, a zigzag
  // of tube over them, two tubes along a black ceiling, players dark
  // against their screens, an island of cabinets seen from behind.
  vec3 roomArcade(vec3 p, vec3 d, float W, float seed, float fine, vec3 acc) {
    float D = 4.4 + 1.4 * fract(seed * 3.1);
    vec3 h;
    float face;
    float tm = boxHit(p, d, W, D, h, face);
    vec3 amb = vec3(0.32, 0.14, 0.62);
    vec2 q = vec2(h.x, h.y - FLOOR_Y);
    vec3 col;
    // (The room holds its screens' and its tubes' light, walls, ceiling
    // and carpet, and the cabinets stand dark against it: at a fifteenth
    // of it the room was a black void with lines of neon floating in it.)
    if (face < 0.5) {
      col = amb * (0.22 + 0.16 * smoothstep(0.5, 2.6, q.y));
      vec2 f = vec2(fract(q.x / 0.8) * 0.8, q.y);
      float hs = hash12(vec2(floor(q.x / 0.8), seed * 71.0));
      float cab = within(f, vec2(0.06, 0.0), vec2(0.74, 1.85)) * step(0.15, q.x) * step(q.x, W - 0.15);
      vec3 c = amb * 0.05;
      c = mix(c, screenOf(hs, (f - vec2(0.14, 1.0)) / vec2(0.52, 0.5)) * 1.5, within(f, vec2(0.14, 1.0), vec2(0.66, 1.5)) * step(0.12, hs));
      c = mix(c, neonOf(hs * 11.0) * 1.3, within(f, vec2(0.1, 1.6), vec2(0.7, 1.8)));
      c += neonOf(hs * 5.0) * 0.5 * within(f, vec2(0.12, 0.82), vec2(0.68, 0.92));
      col = mix(col, c, cab);
      float zz = abs(q.y - 2.35 - 0.14 * (abs(fract(q.x / 0.7) - 0.5) * 4.0 - 1.0));
      col += acc * 1.8 * (1.0 - smoothstep(0.02, 0.04, zz));
    } else if (face < 1.5) {
      col = amb * 0.16 + vec3(1.0, 0.15, 0.7) * (2.2 * step(abs(h.x - W * 0.28), 0.035) + 0.12 * exp(-abs(h.x - W * 0.28) * 2.0)) + vec3(0.1, 0.85, 1.0) * (2.2 * step(abs(h.x - W * 0.72), 0.035) + 0.12 * exp(-abs(h.x - W * 0.72) * 2.0));
    } else if (face < 2.5) {
      // Carpet, holding the screens' light and flecked.
      col = amb * 0.2 + neonOf(hash12(vec2(floor(h.x / 0.8), seed * 71.0)) * 7.0) * 0.2 * exp(-(D - h.z) * 0.7);
      col += vec3(0.9, 0.3, 0.9) * 0.1 * step(0.93, hash12(floor(h.xz / 0.12))) * fine;
    } else {
      vec2 s = vec2(h.z, h.y - FLOOR_Y);
      vec2 f = vec2(fract(s.x), s.y);
      float hs = hash12(vec2(floor(s.x) + 9.0 * step(d.x, 0.0), seed * 37.0));
      float there = step(0.5, s.x);
      col = mix(amb * 0.24, amb * 0.05, within(f, vec2(0.08, 0.0), vec2(0.92, 1.85)));
      col = mix(col, screenOf(hs, (f - vec2(0.18, 1.0)) / vec2(0.64, 0.5)), there * within(f, vec2(0.18, 1.0), vec2(0.82, 1.5)));
      col = mix(col, neonOf(hs * 11.0) * 1.2, there * within(f, vec2(0.12, 1.6), vec2(0.88, 1.8)));
    }
    // Players at the back row.
    float t = (D - 0.8) / d.z;
    vec3 w = p + d * t;
    float at = (floor(W * fract(seed * 19.0) / 0.8) + 0.5) * 0.8;
    if (t < tm && (person(w.xy, at) > 0.5 || (fract(seed * 43.0) < 0.5 && person(w.xy, at + 1.6) > 0.5))) { col = amb * 0.012; tm = t; }
    // The island: backs, slotted, their marquees' light over the top.
    t = 2.0 / d.z;
    w = p + d * t;
    vec2 f = vec2(fract(w.x / 0.85) * 0.85, w.y - FLOOR_Y);
    float hs = hash12(vec2(floor(w.x / 0.85), seed * 91.0));
    if (t < tm && hs > 0.6 && w.x > 0.5 && w.x < W - 0.5 && within(f, vec2(0.08, 0.0), vec2(0.77, 1.8)) > 0.5) {
      col = amb * 0.025 * (1.0 + step(0.5, fract(f.y * 12.0)) * step(abs(f.y - 0.5), 0.2) * fine) + neonOf(hs * 11.0) * 0.5 * step(1.73, f.y);
    }
    return col;
  }

  // 4: a clinic, or a pharmacy. Green white and bright: a tiled room, a
  // lit cross, shelves of small boxes behind a white counter with a green
  // band and somebody in a white coat at it, a chair tipped back under a
  // ring lamp, an eye chart.
  // (v: which of three such rooms, away from the hero's lens. 0 the green
  // pharmacy; 1 a tattoo parlour, lit red and magenta, the flash pinned up
  // in rows on its back wall where the shelves would be and no cross; 2 an
  // implant clinic, cold blue-white, a ring light over the chair in place
  // of the cross. One green cross on glass up a whole street was one shop.)
  vec3 roomClinic(vec3 p, vec3 d, float W, float seed, float fine, float v) {
    float D = 3.8 + 1.0 * fract(seed * 3.1);
    vec3 h;
    float face;
    float tm = boxHit(p, d, W, D, h, face);
    vec3 lit = v < 0.5 ? vec3(0.78, 1.0, 0.92) : (v < 1.5 ? vec3(1.0, 0.55, 0.62) : vec3(0.7, 0.86, 1.0));
    vec3 green = v < 0.5 ? vec3(0.12, 1.0, 0.45) : (v < 1.5 ? vec3(1.0, 0.16, 0.5) : vec3(0.3, 0.75, 1.0));
    vec2 q = vec2(h.x, h.y - FLOOR_Y);
    vec3 col;
    if (face < 0.5) {
      // (Tiles to a dado in green, paler over it; all of it under the
      // street's signs: at 0.62 and bare the room was three blank pale
      // panes from across the avenue.)
      vec2 tile = abs(fract(q / 0.3) - 0.5);
      col = lit * mix(vec3(0.3, 0.52, 0.42) * 0.55, vec3(0.42), step(1.05, q.y)) * (1.0 - 0.25 * step(0.47, max(tile.x, tile.y)) * fine);
      col = mix(col, green * 0.5, step(abs(q.y - 1.05), 0.03));
      float shelves = within(q, vec2(W * 0.4, 1.0), vec2(W - 0.25, 2.3));
      if (v > 0.5 && v < 1.5) {
        // The flash: sheets pinned in rows, each a design in black ink and
        // a colour, on a dark plum wall.
        col = lit * vec3(0.16, 0.05, 0.09) * (1.0 - 0.2 * step(0.47, max(fract(q.x / 0.6), fract(q.y / 0.6))) * fine);
        vec2 sg = vec2((q.x - W * 0.08) / 0.34, (q.y - 1.0) / 0.42);
        vec2 sf = fract(sg);
        float hs = hash12(floor(sg) + seed * 17.0);
        float sheet = within(q, vec2(W * 0.08, 1.0), vec2(W - 0.2, 2.35)) * step(0.08, sf.x) * step(sf.x, 0.92) * step(0.06, sf.y) * step(sf.y, 0.94) * step(0.15, hs);
        vec2 sc = (sf - 0.5) * vec2(0.34, 0.42);
        float ink = hs < 0.4 ? step(abs(length(sc) - 0.09), 0.018) : (hs < 0.7 ? step(abs(sc.x) + abs(sc.y), 0.11) * step(0.06, abs(sc.x) + abs(sc.y)) : step(abs(sc.x), 0.02) + step(abs(sc.y + 0.02 * sin(sc.x * 60.0)), 0.02) * step(abs(sc.x), 0.12));
        vec3 sheetCol = mix(vec3(0.9, 0.86, 0.76), mix(neonOf(hs * 9.0) * 0.7, vec3(0.04), step(0.5, fract(hs * 7.0))), clamp(ink, 0.0, 1.0) * fine);
        col = mix(col, sheetCol * lit * 0.7, sheet);
        shelves = 0.0;
      }
      vec2 g = vec2(q.x / 0.1, (q.y - 1.0) / 0.26);
      float hb = hash12(vec2(floor(g.x / 2.0), floor(g.y)) + seed * 13.0);
      vec3 box = hb < 0.5 ? vec3(0.95) : (hb < 0.72 ? vec3(0.55, 0.95, 0.75) : (hb < 0.9 ? vec3(0.55, 0.8, 1.0) : vec3(1.0, 0.45, 0.4)));
      float item = step(0.08, fract(g.x)) * step(fract(g.y), 0.72) * step(0.1, fract(g.y));
      col = mix(col, mix(lit * 0.25, box * lit * 0.8, mix(0.55, item, fine)), shelves);
      vec2 c = abs(q - vec2(W * 0.2, 1.95));
      // (In two rooms of a clinic in five: a long front cut into rooms
      // each with its lit cross was one white cross printed along it.)
      float one = step(fract(seed * 17.0), 0.4) * step(v, 0.5);
      float cross = max(step(c.x, 0.3) * step(c.y, 0.1), step(c.x, 0.1) * step(c.y, 0.3)) * one;
      col += green * 0.35 * exp(-dot(c, c) * 3.0) * one;
      col = mix(col, green * 2.4, cross);
      // (The parlour's tube on its wall: a heart; the implant clinic's
      // ring of light.)
      vec2 hq = q - vec2(W * 0.2, 1.9);
      float lobes = (1.0 - smoothstep(0.012, 0.03, abs(length(vec2(abs(hq.x) - 0.11, hq.y - 0.05)) - 0.11))) * step(0.05, hq.y);
      float vee = (1.0 - smoothstep(0.012, 0.03, abs(abs(hq.x) - 0.22 * (hq.y + 0.24) / 0.29))) * step(-0.24, hq.y) * step(hq.y, 0.05);
      float heart = max(lobes, vee);
      if (v > 0.5 && v < 1.5) col += green * 1.6 * clamp(heart, 0.0, 1.0);
      if (v > 1.5) col += green * 1.5 * (1.0 - smoothstep(0.015, 0.035, abs(length(hq) - 0.26)));
    } else if (face < 1.5) {
      vec2 f = abs(fract(h.xz / 1.2) - 0.5);
      col = lit * (0.12 + 1.5 * mix(0.3, step(f.x, 0.36) * step(f.y, 0.36), fine));
    } else if (face < 2.5) {
      vec2 tile = abs(fract(h.xz / 0.45) - 0.5);
      col = lit * 0.2 * (1.0 - 0.3 * step(0.48, max(tile.x, tile.y)) * fine);
      // (The parlour's floor is black and white squares.)
      if (v > 0.5 && v < 1.5) col = lit * mix(0.03, 0.3, mod(floor(h.x / 0.45) + floor(h.z / 0.45), 2.0));
    } else {
      // A side wall: the dado again, and over it a glass cabinet of boxes
      // on the one side, the eye chart and a row of hooks on the other.
      vec2 s = vec2(h.z, h.y - FLOOR_Y);
      col = lit * mix(vec3(0.3, 0.52, 0.42) * 0.42, vec3(0.3), step(1.05, s.y));
      col = mix(col, green * 0.4, step(abs(s.y - 1.05), 0.03));
      if (d.x > 0.0) {
        float cab = within(s, vec2(0.7, 1.2), vec2(D - 0.5, 2.3));
        col = mix(col, lit * 0.06 + stock(s, vec2(0.11, 0.275), seed * 23.0, fine) * lit * 0.7, cab);
        col = mix(col, lit * 0.03, cab * step(fract((s.x - 0.7) / 0.9), 0.04));
      } else {
        vec2 g = (s - vec2(D * 0.45, 1.25)) / vec2(0.7, 0.95);
        float rowN = floor(g.y * 5.0);
        float marks = step(0.5, fract(g.x * (11.0 - rowN * 2.0))) * step(0.3, fract(g.y * 5.0)) * within(g, vec2(0.1, 0.05), vec2(0.9, 0.95));
        col = mix(col, mix(vec3(0.62), vec3(0.06), marks * fine), within(g, vec2(0.0), vec2(1.0)));
        float coat = within(vec2((fract(s.x / 0.45) - 0.5) * 0.45, s.y), vec2(-0.13, 1.1), vec2(0.13, 1.85)) * step(s.x, D * 0.3);
        col = mix(col, lit * vec3(0.6, 0.62, 0.6) * 0.5, coat);
      }
    }
    col *= 1.0 - 0.15 * h.z / D;
    float bar = FLOOR_Y + 1.0;
    float t = (D - 0.8) / d.z;
    vec3 w = p + d * t;
    if (t < tm && person(w.xy, W * (0.55 + 0.25 * fract(seed * 19.0))) > 0.5) {
      col = lit * (w.y - FLOOR_Y > 1.52 ? vec3(0.75, 0.55, 0.45) : vec3(0.85)) * 0.75;
      tm = t;
    }
    t = (bar - p.y) / min(d.y, -1e-4);
    w = p + d * t;
    if (d.y < 0.0 && t < tm && w.z > 2.3 && w.z < 2.75 && w.x > W * 0.36) { col = lit * 0.5; tm = t; }
    t = 2.3 / d.z;
    w = p + d * t;
    if (t < tm && w.y < bar && w.x > W * 0.36) {
      col = mix(lit * 0.26, green * 0.8, step(abs(w.y - bar + 0.22), 0.06));
      tm = t;
    }
    t = 1.5 / d.z;
    w = p + d * t;
    vec2 c = vec2(w.x - W * 0.2, w.y - FLOOR_Y);
    vec2 back = mat2(0.82, -0.57, 0.57, 0.82) * (c - vec2(0.25, 0.62));
    float chair = max(max(within(c, vec2(-0.55, 0.5), vec2(0.3, 0.64)), within(back, vec2(0.0, -0.07), vec2(0.95, 0.07))), within(c, vec2(-0.2, 0.0), vec2(-0.08, 0.5)));
    float arm = max(within(c, vec2(0.98, 0.0), vec2(1.03, 2.0)), within(c, vec2(0.45, 1.97), vec2(1.03, 2.02)));
    if (t < tm && W > 3.0) {
      col = mix(col, mix(vec3(0.03, 0.2, 0.22) * lit, vec3(0.05), arm), max(chair, arm));
      col = mix(col, vec3(0.92, 0.98, 1.0) * 2.0, step(abs(length(c - vec2(0.45, 1.86)) - 0.13), 0.03));
    }
    // Seats in a row inside the glass and who waits on them, dark against
    // the room.
    t = 0.7 / d.z;
    w = p + d * t;
    float sx = (fract(w.x / 0.62) - 0.5) * 0.62;
    float who = hash12(vec2(floor(w.x / 0.62), seed * 53.0));
    float seat = max(step(abs(sx), 0.25) * step(abs(w.y - FLOOR_Y - 0.45), 0.035), step(abs(sx), 0.25) * step(abs(w.y - FLOOR_Y - 0.72), 0.13) * step(0.3, who));
    float sat = step(0.6, who) * person(vec2(sx, w.y - 0.3), 0.0);
    if (w.x > W * 0.45 && w.x < W - 0.3 && max(seat, sat) > 0.5) col = mix(lit * vec3(0.05, 0.2, 0.16) * 0.5, lit * 0.02, sat);
    // A band of green film across the glass, a cross cut out of it a pane.
    t = 0.02 / d.z;
    w = p + d * t;
    vec2 k = vec2((fract(w.x / 1.5) - 0.5) * 1.5, w.y - 1.25);
    float film = step(abs(k.y), 0.3) * step(v, 1.5);
    float cut = max(step(abs(k.x), 0.2) * step(abs(k.y), 0.07), step(abs(k.x), 0.07) * step(abs(k.y), 0.2)) * step(v, 0.5);
    col = mix(col, mix(green * vec3(0.5, 0.3, 0.4) * 0.3 + col * 0.25, lit * 0.55, cut), film);
    return col;
  }

  // 5: a clothes shop. Warm spots on one strong colour: an arch let into
  // the back wall, lit, one piece hung in it; a rail down each side with a
  // shelf of folded things over it; a table of them; two dressed figures
  // on a plinth in the window.
  // (v: 0 as above; 1 shoes and bags, lit cubbies up the back wall and
  // pedestals in the window, no figures; 2 a second-hand clothes shop, its
  // back wall one long rail of hanging things under a warmer, dimmer
  // light, one figure in the window. The two dressed figures in every
  // clothes shop's window recurred down a whole street.)
  vec3 roomBoutique(vec3 p, vec3 d, float W, float seed, float fine, float v) {
    float D = 4.2 + 1.3 * fract(seed * 3.1);
    vec3 h;
    float face;
    float tm = boxHit(p, d, W, D, h, face);
    vec3 lit = vec3(1.0, 0.9, 0.78) * (v > 1.5 ? 0.75 : 1.0);
    float tone = fract(seed * 29.0);
    vec3 paint = tone < 0.25 ? vec3(0.04, 0.3, 0.33) : (tone < 0.5 ? vec3(0.55, 0.17, 0.08) : (tone < 0.75 ? vec3(0.5, 0.36, 0.07) : vec3(0.33, 0.07, 0.27)));
    vec2 q = vec2(h.x, h.y - FLOOR_Y);
    vec3 col;
    if (face < 0.5) {
      float spot = exp(-pow((fract(q.x / 1.4) - 0.5) * 1.4, 2.0) * 3.0) * smoothstep(0.2, 2.8, q.y);
      col = lit * paint * (0.35 + 0.9 * spot);
      vec2 a = vec2(q.x - W * 0.5, q.y);
      float arch = clamp(step(abs(a.x), 0.6) * step(a.y, 1.75) + step(length(a - vec2(0.0, 1.75)), 0.6) * step(1.75, a.y), 0.0, 1.0);
      col = mix(col, lit * vec3(1.0, 0.95, 0.88) * 0.95, arch);
      float piece = step(abs(a.x), 0.26 + 0.1 * smoothstep(1.6, 0.7, a.y)) * step(0.7, a.y) * step(a.y, 1.6);
      col = mix(col, clothOf(seed * 7.0) * lit, piece);
      if (v > 0.5 && v < 1.5) {
        // Cubbies, each lit from its top, a shoe or a bag in most.
        vec2 cg = vec2((q.x - 0.2) / 0.5, (q.y - 0.5) / 0.4);
        vec2 cf = fract(cg);
        float hc = hash12(floor(cg) + seed * 23.0);
        float inside = within(q, vec2(0.2, 0.5), vec2(W - 0.2, 2.5));
        vec3 cub = mix(lit * paint * 0.2, lit * vec3(0.95, 0.9, 0.82) * (0.45 + 0.5 * cf.y), step(0.06, cf.x) * step(cf.x, 0.94) * step(0.08, cf.y) * step(cf.y, 0.92));
        float shoe = step(0.3, hc) * (hc < 0.65 ? within(cf, vec2(0.2, 0.1), vec2(0.8, 0.32)) * step(cf.x - 0.2, 0.3 + cf.y) : within(cf, vec2(0.28, 0.1), vec2(0.72, 0.55)) + step(abs(length((cf - vec2(0.5, 0.55)) * vec2(1.0, 1.3)) - 0.13), 0.025) * step(0.55, cf.y));
        cub = mix(cub, clothOf(hc * 5.0) * lit * 0.7, clamp(shoe, 0.0, 1.0) * fine);
        col = mix(col, cub, inside);
      } else if (v > 1.5) {
        // One long rail across the back wall, hung full.
        float hr = hash12(vec2(floor(q.x / 0.09), seed * 41.0));
        float hang = step(0.9 + 0.5 * fract(hr * 7.0), q.y) * step(q.y, 1.95) * step(0.1, hr) * step(0.15, fract(q.x / 0.09));
        col = mix(col, clothOf(hr * 3.0) * lit * (0.5 + 0.3 * q.y / 2.0), hang);
        col = mix(col, vec3(0.6, 0.58, 0.52) * lit, step(abs(q.y - 1.97), 0.015));
      }
    } else if (face < 1.5) {
      vec2 f = vec2((fract(h.x / 1.4) - 0.5) * 1.4, (fract(h.z / 0.8) - 0.5) * 0.8);
      col = lit * (0.07 + mix(0.12, 3.0 * step(length(f), 0.07), fine));
    } else if (face < 2.5) {
      col = lit * vec3(0.5, 0.34, 0.2) * 0.3 * (1.0 - 0.2 * step(fract(h.x / 0.18), 0.08) * fine);
    } else {
      vec2 s = vec2(h.z, h.y - FLOOR_Y);
      col = lit * paint * 0.3;
      float hs = hash12(vec2(floor(s.x / 0.17) + 31.0 * step(d.x, 0.0), seed * 91.0));
      float run = step(0.7, s.x) * step(s.x, D - 0.4);
      float hang = run * step(0.12, hs) * step(1.0 - 0.45 * fract(hs * 7.0), s.y) * step(s.y, 1.6) * step(0.06, fract(s.x / 0.17));
      col = mix(col, clothOf(hs * 5.0) * lit * 0.8, hang);
      col = mix(col, vec3(0.75, 0.72, 0.65) * lit, run * step(abs(s.y - 1.66), 0.015));
      vec2 g = vec2(s.x / 0.42, (s.y - 1.95) / 0.09);
      float fold = run * step(0.0, g.y) * step(g.y, 1.0 + floor(3.0 * hash12(vec2(floor(g.x), seed)))) * step(0.1, fract(g.x)) * step(fract(g.x), 0.9);
      col = mix(col, clothOf(hash12(floor(g) + seed) * 3.0) * lit * 0.8, fold);
    }
    col *= 1.0 - 0.2 * h.z / D;
    float t = 2.6 / d.z;
    vec3 w = p + d * t;
    vec2 c = vec2(w.x - W * 0.5, w.y - FLOOR_Y);
    float top = step(abs(c.y - 0.74), 0.04);
    float leg = step(abs(abs(c.x) - W * 0.18), 0.03) * step(c.y, 0.74);
    float stack = step(0.78, c.y) * step(c.y, 0.98) * step(0.12, fract(c.x / 0.36));
    if (v < 0.5 && t < tm && abs(c.x) < W * 0.2 && max(top, max(leg, stack)) > 0.5) {
      col = mix(lit * vec3(0.5, 0.36, 0.22) * 0.5, clothOf(hash12(vec2(floor(c.x / 0.36), floor(c.y / 0.05)) + seed) * 3.0) * lit * 0.85, stack);
      tm = t;
    }
    // The window: the plinth, and two figures on it under their own spots.
    t = 0.5 / d.z;
    w = p + d * t;
    if (t < tm) {
      if (w.y < FLOOR_Y + 0.5 && w.x > W * 0.1 && w.x < W * 0.9) col = lit * 0.5;
      // (A figure is shaped as a mannequin is: shoulders, a waist, hips,
      // legs apart, arms hung clear of the body, a neck and a small head,
      // its form rounded and lit from the spot over it. A block with a disc
      // on it read as a placeholder.)
      // (Shoes and bags stand on pedestals.)
      if (v > 0.5 && v < 1.5) {
        float px0 = fract(w.x / (W / 3.0)) * (W / 3.0) - W / 6.0;
        float ped = step(abs(px0), 0.22) * step(w.y, FLOOR_Y + 0.5 + 0.45 * fract(floor(w.x / (W / 3.0)) * 0.37 + seed));
        float top = FLOOR_Y + 0.5 + 0.45 * fract(floor(w.x / (W / 3.0)) * 0.37 + seed);
        float bag = step(abs(px0), 0.15) * step(top, w.y) * step(w.y, top + 0.24);
        if (ped > 0.5) col = lit * vec3(0.85, 0.82, 0.76) * 0.55;
        if (bag > 0.5) col = clothOf(fract(seed * 13.0 + floor(w.x / (W / 3.0)) * 0.31) * 7.0) * lit * 0.75;
      }
      for (int i = 0; i < 2; i++) {
        if (v > 0.5 && (v < 1.5 || i == 1)) continue;
        float x0 = W * (i == 0 ? 0.26 + 0.1 * fract(seed * 19.0) : 0.66 + 0.1 * fract(seed * 23.0));
        vec2 m = vec2(w.x - x0, w.y - FLOOR_Y - 0.5);
        float hw = m.y > 1.3 ? 0.18 - (m.y - 1.3) * 0.9 : (m.y > 1.0 ? mix(0.125, 0.18, (m.y - 1.0) / 0.3) : (m.y > 0.8 ? mix(0.16, 0.125, (m.y - 0.8) / 0.2) : 0.15 - 0.06 * smoothstep(0.75, 0.0, m.y)));
        float torso = step(abs(m.x), hw) * step(0.0, m.y) * step(m.y, 1.42) * (m.y < 0.76 ? step(0.022, abs(m.x)) : 1.0);
        float arm = step(abs(abs(m.x) - 0.215 + 0.04 * smoothstep(1.35, 0.85, m.y)), 0.028) * step(0.84, m.y) * step(m.y, 1.34);
        float neck = step(abs(m.x), 0.032) * step(1.4, m.y) * step(m.y, 1.52);
        float head = step(length(vec2(m.x, (m.y - 1.61) * 0.82)), 0.085);
        if (torso + arm + neck + head > 0.5) {
          float hs = fract(seed * (31.0 + float(i) * 17.0));
          vec3 form = fract(hs * 11.0) < 0.5 ? vec3(0.78, 0.76, 0.72) : vec3(0.06, 0.06, 0.065);
          vec3 dress = m.y > 0.78 ? clothOf(hs * 7.0) : clothOf(hs * 3.0 + 0.4);
          dress = mix(dress, form, max(max(neck, head), arm * step(0.5, fract(hs * 5.0))));
          float shapeK = torso > 0.5 ? sqrt(max(1.0 - pow(m.x / max(hw, 0.01), 2.0), 0.0)) : 0.8;
          col = dress * lit * (0.45 + 0.45 * shapeK) * (0.7 + 0.6 * smoothstep(0.0, 1.7, m.y));
        }
      }
    }
    return col;
  }

  // 6: a workshop, or a parts shop. One tube hung over a bench and the
  // room lit from it, dim and yellow at its edges: a tool board with each
  // tool's shape on it, a rack of bins, a red chest of drawers, an engine's
  // block on the bench, tyres stacked by the glass and a drum.
  vec3 roomWorkshop(vec3 p, vec3 d, float W, float seed, float fine) {
    float D = 4.8 + 1.5 * fract(seed * 3.1);
    vec3 h;
    float face;
    float tm = boxHit(p, d, W, D, h, face);
    vec3 lit = vec3(0.95, 0.88, 0.55);
    vec3 lp = vec3(W * 0.5, FLOOR_Y + 2.1, 2.3);
    vec2 q = vec2(h.x, h.y - FLOOR_Y);
    float pool = 1.0 / (1.0 + dot(h - lp, h - lp) * 0.35);
    vec3 col;
    if (face < 0.5) {
      col = lit * vec3(0.5, 0.4, 0.28) * 0.5;
      vec2 hole = abs(fract(q / 0.1) - 0.5);
      col *= 1.0 - 0.35 * step(max(hole.x, hole.y), 0.12) * fine;
      vec2 g = vec2(q.x / 0.3, (q.y - 1.15) / 0.55);
      vec2 f = fract(g) - 0.5;
      float ht = hash12(floor(g) + seed * 3.0);
      float board = step(0.0, g.y) * step(g.y, 2.0) * step(0.25, q.x) * step(q.x, W * 0.58) * step(0.2, ht);
      float form = fract(ht * 9.0);
      float tool = form < 0.4 ? max(step(abs(f.x), 0.05) * step(abs(f.y), 0.38), step(length(f - vec2(0.0, 0.36)), 0.13))
                 : (form < 0.7 ? step(abs(length(f) - 0.26), 0.07) : max(step(abs(f.x), 0.045) * step(abs(f.y), 0.4), step(abs(f.x), 0.28) * step(abs(f.y - 0.32), 0.09)));
      col = mix(col, vec3(0.05, 0.05, 0.055), board * tool);
      vec2 b = vec2(q.x / 0.32, q.y / 0.26);
      float hb = hash12(vec2(floor(b.y), seed * 5.0));
      vec3 bin = hb < 0.3 ? vec3(0.08, 0.2, 0.6) : (hb < 0.55 ? vec3(0.7, 0.1, 0.06) : (hb < 0.8 ? vec3(0.8, 0.6, 0.05) : vec3(0.3, 0.32, 0.34)));
      col = mix(col, mix(vec3(0.03), bin * lit * 0.6, step(fract(b.y), 0.55) * step(0.06, fract(b.x))), within(q, vec2(W * 0.63, 0.1), vec2(W - 0.2, 2.3)));
    } else if (face < 1.5) {
      col = lit * 0.035 * (1.0 + 2.0 * step(fract(h.z / 1.2), 0.1));
      pool = 0.3;
    } else if (face < 2.5) {
      col = lit * vec3(0.4, 0.4, 0.38) * 0.3 * (1.0 - 0.6 * smoothstep(0.55, 0.7, vnoise(h.xz * 1.3 + seed * 20.0)));
    } else {
      // Blockwork, tyres stacked against it at the back.
      vec2 s = vec2(h.z, h.y - FLOOR_Y);
      vec2 blk = fract(vec2(s.x / 0.4 + 0.5 * floor(s.y / 0.2), s.y / 0.2));
      col = lit * vec3(0.42, 0.42, 0.4) * 0.4 * (1.0 - 0.25 * step(min(blk.x, blk.y), 0.06) * fine);
      col = mix(col, vec3(0.02) + lit * 0.12 * step(abs(fract(s.y / 0.24) - 0.5), 0.08), step(D - 1.5, s.x) * step(s.x, D - 0.75) * step(s.y, 1.44));
    }
    // (A third of its light reaches the far corners: at a fifth, a
    // workshop seen from the pavement was a dark front.)
    col *= 0.34 + 1.8 * pool;
    float t = (D - 0.7) / d.z;
    vec3 w = p + d * t;
    vec2 c = vec2(w.x, w.y - FLOOR_Y);
    float bench = step(abs(c.y - 0.9), 0.04) * step(0.3, c.x) * step(c.x, W * 0.6);
    float legs = step(c.y, 0.9) * max(step(abs(c.x - 0.36), 0.04), step(abs(c.x - W * 0.6 + 0.06), 0.04));
    float block = within(c, vec2(W * 0.28, 0.94), vec2(W * 0.28 + 0.7, 1.4));
    float chest = within(c, vec2(W * 0.66, 0.0), vec2(W * 0.66 + 0.75, 1.05));
    if (t < tm && max(max(bench, legs), max(block, chest)) > 0.5) {
      col = lit * vec3(0.3, 0.22, 0.14) * 0.5;
      col = mix(col, vec3(0.1, 0.1, 0.11) * (1.0 + 0.8 * step(0.5, fract(c.x * 9.0)) * step(1.3, c.y)), block);
      col = mix(col, vec3(0.7, 0.07, 0.04) * lit * (1.0 - 0.5 * step(fract(c.y / 0.17), 0.1)), chest);
      col *= 0.2 + 1.3 / (1.0 + dot(w - lp, w - lp) * 0.35);
      tm = t;
    }
    t = (D - 1.3) / d.z;
    w = p + d * t;
    if (t < tm && fract(seed * 29.0) < 0.6 && person(w.xy, W * 0.42) > 0.5) { col = lit * vec3(0.1, 0.11, 0.16) * 0.5; tm = t; }
    // The tube on its two cords, and its halo.
    t = 2.3 / d.z;
    w = p + d * t;
    c = vec2(w.x - W * 0.5, w.y - FLOOR_Y - 2.1);
    if (t < tm) {
      float on = step(abs(c.x), 0.5) * step(abs(c.y), 0.035);
      col = mix(col, vec3(0.01), step(abs(abs(c.x) - 0.4), 0.008) * step(0.0, c.y));
      col += vec3(0.92, 0.97, 1.0) * 0.25 * exp(-dot(c * vec2(1.0, 3.0), c * vec2(1.0, 3.0)) * 4.0);
      col = mix(col, vec3(0.92, 0.97, 1.0) * 3.2, on);
    }
    t = 0.9 / d.z;
    w = p + d * t;
    c = vec2(w.x - W * 0.8, w.y - FLOOR_Y);
    float ty = fract(c.y / 0.23);
    if (t < tm && abs(c.x) < 0.33 - 0.05 * pow(abs(ty - 0.5) * 2.0, 3.0) && c.y < 0.23 * (3.0 + floor(fract(seed * 13.0) * 3.0))) {
      col = vec3(0.012) + lit * 0.07 * step(abs(ty - 0.5), 0.07) + lit * 0.03 * step(0.9, ty);
      tm = t;
    }
    c = vec2(w.x - W * 0.17, w.y - FLOOR_Y);
    if (t < tm && abs(c.x) < 0.29 && c.y < 0.88) {
      col = mix(vec3(0.03, 0.22, 0.3), vec3(0.6, 0.45, 0.05), step(0.5, fract(seed * 17.0))) * lit * (0.35 + 0.4 * (1.0 - abs(c.x) / 0.29)) * (1.0 - 0.5 * step(abs(fract(c.y / 0.3 + 0.5) - 0.5), 0.05));
    }
    return col;
  }

  // 7: shut for the night. What the street throws in and no more: an exit
  // lamp over a back door left ajar on a lit room, a fridge still running,
  // chairs turned up on the tables, a lattice grille drawn across inside
  // the glass and a paper notice on it.
  vec3 roomDark(vec3 p, vec3 d, float W, float seed, float fine, vec3 street) {
    float D = 4.2;
    vec3 h;
    float face;
    float tm = boxHit(p, d, W, D, h, face);
    vec2 q = vec2(h.x, h.y - FLOOR_Y);
    vec3 amb = (vec3(0.012, 0.015, 0.024) + street * 0.12) * (1.0 - 0.6 * h.z / D);
    vec3 door = vec3(1.0, 0.75, 0.45);
    vec3 col = amb;
    if (face < 0.5) {
      vec2 e = q - vec2(W * 0.24, 2.3);
      col += vec3(0.1, 1.0, 0.42) * 0.25 * exp(-dot(e, e) * 2.2);
      col = mix(col, vec3(0.1, 1.0, 0.42) * 1.6, step(abs(e.x), 0.2) * step(abs(e.y), 0.07));
      float crack = clamp(step(abs(q.x - W * 0.24 - 0.42), 0.02) * step(q.y, 2.05) + step(abs(q.x - W * 0.24), 0.42) * step(q.y, 0.03), 0.0, 1.0);
      col = mix(col, door * 1.3, crack);
      float fridge = within(q, vec2(W * 0.68, 0.1), vec2(W * 0.68 + 0.7, 1.95)) * step(fract(seed * 7.0), 0.6);
      col = mix(col, vec3(0.35, 0.6, 0.9) * 0.3 * (0.6 + 0.4 * step(0.4, fract(q.y / 0.38))), fridge);
    } else if (face > 1.5 && face < 2.5) {
      col += door * 0.12 * exp(-abs(h.x - W * 0.24) * 2.0) * exp(-(D - h.z) * 0.9);
    }
    float t = 2.2 / d.z;
    vec3 w = p + d * t;
    vec2 c = vec2((fract(w.x / 1.7) - 0.5) * 1.7, w.y - FLOOR_Y);
    float table = max(step(abs(c.x), 0.5) * step(abs(c.y - 0.74), 0.03), step(abs(c.x), 0.04) * step(c.y, 0.74));
    float side = abs(abs(c.x) - 0.25);
    float chairs = step(side, 0.2) * max(step(abs(c.y - 0.86), 0.03), step(abs(side - 0.17), 0.02) * step(0.86, c.y) * step(c.y, 1.3));
    if (t < tm && w.x > 0.3 && w.x < W - 0.3 && max(table, chairs) > 0.5) col = amb * 0.25;
    t = 0.08 / d.z;
    w = p + d * t;
    float lat = min(abs(fract((w.x + w.y) / 0.24) - 0.5), abs(fract((w.x - w.y) / 0.24) - 0.5)) * 0.24;
    col = mix(col, vec3(0.03, 0.032, 0.04) + street * 0.5, (1.0 - smoothstep(0.012, 0.02, lat)) * mix(0.5, 1.0, fine));
    float lines = step(0.5, fract(w.y * 14.0)) * step(abs(w.x - W * 0.5), 0.11) * fine;
    col = mix(col, (vec3(0.06) + street * 1.1) * (1.0 - 0.6 * lines), within(w.xy, vec2(W * 0.5 - 0.16, 1.0), vec2(W * 0.5 + 0.16, 1.45)));
    return col;
  }

  // A trade's light as the street takes it in from too far to see in: the
  // room's own average, colour and level.
  vec3 tradeLight(float kind) {
    if (kind < 0.5) return vec3(0.8, 0.93, 1.0) * 0.42;
    if (kind < 1.5) return vec3(1.0, 0.5, 0.25) * 0.2;
    if (kind < 2.5) return vec3(1.0, 0.6, 0.3) * 0.5;
    if (kind < 3.5) return vec3(0.55, 0.3, 0.9) * 0.36;
    if (kind < 4.5) return vec3(0.7, 1.0, 0.86) * 0.36;
    if (kind < 5.5) return vec3(1.0, 0.8, 0.6) * 0.34;
    if (kind < 6.5) return vec3(0.95, 0.85, 0.5) * 0.21;
    return vec3(0.03, 0.04, 0.05);
  }

  // The same with the room's variant (shopRoom's v): a tattoo parlour's
  // red, an implant clinic's blue, a second-hand shop's dimmer light.
  vec3 tradeLightV(float kind, float shop) {
    float v = floor(fract(shop * 7.31 + 0.13) * 3.0) * step(0.5, freeEye());
    if (kind > 3.5 && kind < 4.5 && v > 0.5) return v < 1.5 ? vec3(1.0, 0.42, 0.58) * 0.3 : vec3(0.62, 0.8, 1.0) * 0.36;
    if (kind > 4.5 && kind < 5.5 && v > 1.5) return tradeLight(kind) * 0.75;
    return tradeLight(kind);
  }

  // The room behind the glass at p (metres from the room's left wall, up
  // from the sill, 0 in) along d: its colour as it is lit. kind is the
  // trade, shop and seed the shop's and this room's own numbers, street the
  // street's light at the pane, fine 1 near and 0 where the detail would
  // shimmer.
  vec3 shopRoom(vec3 p, vec3 d, float roomW, float kind, float shop, float seed, vec3 street, float fine) {
    vec3 acc = neonOf(shop * 13.7 + 0.37);
    if (kind < 0.5) return roomStore(p, d, roomW, seed, fine, acc);
    if (kind < 1.5) return roomBar(p, d, roomW, seed, fine, acc);
    if (kind < 2.5) return roomNoodle(p, d, roomW, seed, fine, acc);
    if (kind < 3.5) return roomArcade(p, d, roomW, seed, fine, acc);
    // (Which of a clinic's or a clothes shop's three rooms: by the shop,
    // away from the hero's lens.)
    float v = floor(fract(shop * 7.31 + 0.13) * 3.0) * step(0.5, freeEye());
    if (kind < 4.5) return roomClinic(p, d, roomW, seed, fine, v);
    if (kind < 5.5) return roomBoutique(p, d, roomW, seed, fine, v);
    if (kind < 6.5) return roomWorkshop(p, d, roomW, seed, fine);
    return roomDark(p, d, roomW, seed, fine, street);
  }
`;

// A lobby that is no tower's hall (materials.js lobby() draws those): the
// way in to a depot's offices, a block's street door. Such a pane carries
// its own metres (u from its left edge, v down from a metre over its foot),
// so the hall is laid out from that edge: nine metres wide, the pane's left
// edge half a metre in from its left wall, storeys 3.1 m apart. The ground
// storey is the hall: a desk before a lit wall with the house's mark, a
// lift, a notice board, seats, a plant, who is on the desk and who waits.
// Any storey over it is an office under its ceiling's panels, desks with
// their screens on. All of it under the signs' brightness. Needs glsl.js's
// COMMON above it.
export const HALL = /* glsl */ `
  float hallPanels(vec2 c, vec2 cell, vec2 fill) {
    vec2 g = c / cell;
    vec2 f = abs(fract(g) - 0.5);
    float aa = clamp(max(fwidth(g.x), fwidth(g.y)) * 1.5, 0.0, 1.0);
    return mix(step(f.x, fill.x) * step(f.y, fill.y), 4.0 * fill.x * fill.y, aa);
  }
  // Somebody stood at x0, feet at 0.
  float hallBody(vec2 q, float x0) {
    float fx = q.x - x0;
    return max(step(abs(fx), 0.21 - 0.05 * smoothstep(1.05, 1.45, q.y)) * step(q.y, 1.48) * step(0.0, q.y), step(length(vec2(fx, q.y - 1.63)), 0.11));
  }
  vec3 hall(vec2 at, vec3 d, float seed, vec3 light, vec3 accent) {
    const float W = 9.0;
    const float D = 5.6;
    const float S = 3.1;
    const float H = 2.8;
    float storey = floor(at.y / S);
    vec3 p = vec3(at.x + 0.5, at.y - storey * S, 0.0);
    // The slab's edge between two storeys.
    if (p.y > H) return light * 0.012;
    float tx = d.x > 0.0 ? (W - p.x) / d.x : -p.x / min(d.x, -1e-4);
    float ty = d.y > 0.0 ? (H - p.y) / d.y : -p.y / min(d.y, -1e-4);
    float tz = D / d.z;
    float tm = min(min(tx, ty), tz);
    vec3 h = p + d * tm;
    float hs = hash12(vec2(seed, 7.0 + storey));
    vec3 col;
    if (storey > 0.5) {
      if (tm == tz) {
        // The back wall: a door, and a board with its rows of notes.
        col = light * (0.13 + 0.05 * h.y / H);
        col = mix(col, light * 0.045, step(abs(h.x - W * (0.2 + 0.2 * hs)), 0.48) * step(h.y, 2.1));
        vec2 b = vec2(h.x - W * (0.72 - 0.2 * hs), h.y - 1.55);
        float board = step(abs(b.x), 1.1) * step(abs(b.y), 0.55);
        col = mix(col, light * 0.4, board);
        col = mix(col, light * 0.1, board * step(abs(b.x), 0.95) * step(abs(fract(b.y / 0.18) - 0.5), 0.14) * step(0.3, hash12(floor(vec2(b.x / 0.3, b.y / 0.18)) + seed)));
      } else if (tm == ty && d.y > 0.0) {
        col = light * (0.09 + 0.8 * hallPanels(h.xz, vec2(1.2, 1.4), vec2(0.36, 0.2)));
      } else if (tm == ty) {
        col = light * vec3(0.3, 0.33, 0.4) * 0.18;
      } else {
        col = light * 0.11;
      }
      col *= 1.0 - 0.3 * h.z / D;
      // Two rows of desks, a screen on most, somebody sat at some.
      for (int i = 0; i < 2; i++) {
        float t = (i == 0 ? 3.6 : 1.7) / d.z;
        if (t >= tm) continue;
        vec3 q = p + d * t;
        float g = q.x / 1.6 + 0.3 * float(i);
        float cx = (fract(g) - 0.5) * 1.6;
        float hd = hash12(vec2(floor(g), seed + storey * 3.0 + float(i)));
        if (q.y < 0.74 && abs(cx) < 0.7) col = light * 0.03;
        else if (hd > 0.3 && abs(cx) < 0.27 && abs(q.y - 1.0) < 0.17) col = mix(vec3(0.5, 0.75, 1.0), accent, 0.3) * (0.22 + 0.25 * step(0.5, fract(q.y * 14.0)));
        else if (hd > 0.55 && hallBody(vec2(cx - 0.48, q.y + 0.4), 0.0) > 0.5) col = light * 0.016;
      }
      return col;
    }
    if (tm == tz) {
      // The back wall: stone in panels, the lit wall behind the desk with
      // the house's mark and its name as bars, a lift with its lamp.
      col = light * (0.1 + 0.05 * h.y / H) * (1.0 - 0.35 * step(fract(h.x / 1.5), 0.016));
      vec2 w = vec2(h.x - 3.6, h.y - 1.75);
      if (abs(w.x) < 1.7 && abs(w.y) < 0.75) {
        float r = length(w + vec2(0.95, 0.0));
        float mark = step(abs(r - 0.36), 0.08) * step(0.12, abs(w.x + 0.95 - w.y) * 0.7) + step(r, 0.11);
        float name = step(abs(w.y), 0.1) * step(-0.3, w.x) * step(w.x, 1.3) * step(0.2, fract(w.x * 4.0)) * step(0.15, hash12(vec2(floor(w.x * 4.0), seed)));
        col = mix(light * 0.5, accent * 0.5 + light * 0.02, clamp(mark + name, 0.0, 1.0));
        col *= 1.0 - 0.6 * step(1.64, abs(w.x)) - 0.6 * step(0.7, abs(w.y));
      }
      vec2 l = vec2(h.x - 7.2, h.y);
      col = mix(col, light * 0.035, step(abs(l.x), 0.75) * step(l.y, 2.25));
      col += light * 0.55 * (step(abs(abs(l.x) - 0.78), 0.02) * step(l.y, 2.28) + step(abs(l.y - 2.28), 0.02) * step(abs(l.x), 0.8) + 0.5 * step(abs(l.x), 0.012) * step(l.y, 2.25));
      col += accent * 0.9 * step(abs(l.x), 0.12) * step(abs(l.y - 2.5), 0.05);
    } else if (tm == ty && d.y > 0.0) {
      col = light * (0.07 + 0.9 * hallPanels(h.xz, vec2(1.5, 1.3), vec2(0.1, 0.38)));
    } else if (tm == ty) {
      // The floor, polished: the ceiling's strips again, softer.
      vec3 m2 = h + vec3(d.x, -d.y, d.z) * (H / max(-d.y, 1e-3));
      col = light * (0.05 + 0.26 * hallPanels(m2.xz, vec2(1.5, 1.3), vec2(0.1, 0.38))) * (1.0 - 0.4 * h.z / D);
    } else {
      // A side wall: a board of notices under its own lamp.
      vec2 s = vec2(h.z - 2.6, h.y - 1.6);
      col = light * 0.1;
      col = mix(col, light * 0.34, step(abs(s.x), 0.9) * step(abs(s.y), 0.5));
      col = mix(col, light * 0.07, step(abs(s.x), 0.8) * step(abs(s.y), 0.42) * step(0.4, hash12(floor(s * vec2(3.0, 5.0)) + seed)) * step(0.12, fract(s.x * 3.0)) * step(0.15, fract(s.y * 5.0)));
    }
    col *= 1.0 - 0.2 * h.z / D;
    // Whoever is on the desk, head and shoulders over it.
    float t = 4.3 / d.z;
    vec3 q = p + d * t;
    if (t < tm && hallBody(q.xy, 3.6 + 1.4 * (hs - 0.5)) > 0.5) col *= 0.06;
    // The desk: dark stone, a strip of the house's colour let into its
    // front, light along its top and under its foot, a screen stood on it.
    t = 3.7 / d.z;
    q = p + d * t;
    if (t < tm && abs(q.x - 3.6) < 1.6 && q.y < 1.08) {
      col = light * (0.025 + 0.015 * step(0.04, fract(q.x / 1.1))) + accent * 0.35 * step(abs(q.y - 0.55), 0.045) + light * 0.9 * step(1.02, q.y) + light * 0.5 * step(q.y, 0.05);
    } else if (t < tm && abs(q.x - 4.5) < 0.28 && abs(q.y - 1.3) < 0.18) {
      col = light * 0.012;
    }
    // A caller at the desk, and somebody crossing the hall.
    t = 3.2 / d.z;
    q = p + d * t;
    if (t < tm && hs > 0.35 && hallBody(q.xy, 4.4) > 0.5) col *= 0.07;
    t = 2.4 / d.z;
    q = p + d * t;
    if (t < tm && hallBody(q.xy, mix(-1.5, W + 1.5, fract(uTime * 0.03 + hs))) > 0.5) col *= 0.07;
    // Seats by the glass at the far end, a low table and its lamp, a sitter.
    t = 1.7 / d.z;
    q = p + d * t;
    if (t < tm) {
      float sx = q.x - 5.9;
      if (sx > 0.0 && sx < 2.5 && q.y < 0.84 && abs(sx - 1.25) > 0.18) col = light * (0.03 + 0.09 * step(abs(q.y - 0.43), 0.02) + 0.13 * step(0.81, q.y)) + accent * 0.04;
      if (abs(sx - 1.25) < 0.08 && abs(q.y - 0.6) < 0.2) col = vec3(1.0, 0.8, 0.5) * (1.0 - 1.8 * abs(q.y - 0.6));
      float fx = sx - 0.55 - 1.4 * step(0.5, fract(hs * 7.0));
      col = mix(col, col * 0.06, max(step(abs(fx), 0.21) * step(0.3, q.y) * step(q.y, 0.98), step(length(vec2(fx, q.y - 1.12)), 0.11)));
    }
    // A plant in its tub inside the glass.
    t = 0.9 / d.z;
    q = p + d * t;
    if (t < tm) {
      vec2 g = vec2(abs(q.x - 1.0), q.y);
      float leaf = 0.0;
      for (int i = 0; i < 5; i++) {
        float a = (float(i) - 2.0) * 0.36 + 0.1 * sin(float(i) * 5.0 + seed);
        vec2 tip = vec2(sin(a), cos(a)) * (1.05 + 0.25 * cos(float(i) * 3.0 + seed));
        vec2 pa = g - vec2(0.0, 0.5);
        float k = clamp(dot(pa, tip) / dot(tip, tip), 0.0, 1.0);
        leaf = max(leaf, step(length(pa - tip * k), 0.09 * sin(k * 3.1) + 0.012));
      }
      col = mix(col, light * vec3(0.025, 0.09, 0.045), leaf);
      if (g.x < 0.27 && g.y < 0.5) col = light * (0.035 + 0.12 * step(0.47, g.y));
    }
    return col;
  }
`;

// The plaza's own glass (materials.js corporate(), the vertex alphas 0.96 to
// 0.99 its builder gives it: scripts/blender/ncw/districts/plaza_parts.py
// glass_col). Two rooms, traced as the others are, in metres from the pane
// (x along the wall, y up from the floor, z in), with d the eye's ray in
// the same frame. Needs glsl.js's COMMON above it.
//
// pzOffice: a floor of offices as the square sees it, mostly from below.
// Each tenant (two to four floors) has its own light (warm, white or cool),
// its own ceiling (lines of light, square fittings, downlights or pendants
// on a dark ceiling: never a pale slab), its own blinds (none, rollers
// each at its own drop, slats, or verticals drawn part way), and its
// furniture against the light: plants at the glass, desks with their
// screens, who sits at them, screens between the rows, somebody standing,
// cabinets and doors and a lit meeting room along the core. A floor that is
// off keeps an exit lamp and a desk lamp or two.
//
// pzHall: a lobby, one or more storeys high, laid out in 18 m from the
// pane's x (materials.js anchors x to the world: x 79 of the board's block
// is its middle): a dark ceiling ruled by lines
// of light, a polished floor that gives them back, a stone wall at the back
// with the house's lit wall and mark, a screen of moving colour and the
// lifts; columns and trees in the hall, people in it, and in a hall over
// nine metres high a gallery across its back reached by an escalator, with
// the reception desk under it.
export const PLAZA_ROOMS = /* glsl */ `
  float pzBody(vec2 q, float x0, float k) {
    float fx = q.x - x0;
    return max(step(abs(fx), (0.21 - 0.05 * smoothstep(1.05 * k, 1.45 * k, q.y)) * k) * step(q.y, 1.48 * k) * step(0.0, q.y),
               step(length(vec2(fx, q.y - 1.63 * k)), 0.11 * k));
  }
  // A fine pattern's own value, or its average once it is finer than a
  // pixel or two (w: its feature's size along that axis).
  float pzFine(float on, float avg, float g, float w) {
    return mix(on, avg, smoothstep(0.35, 1.1, fwidth(g) / w));
  }

  vec3 pzOffice(vec3 p, vec3 d, float level, float seed, float share, float warmth, float near, float pane, float inPane, out float lit) {
    const float CL = 2.85;
    float span = 2.0 + floor(hash12(vec2(seed, 2.0)) * 3.0);
    float tenant = floor((level + floor(hash12(vec2(seed, 1.0)) * 4.0)) / span);
    float tenantOn = step(hash12(vec2(tenant, seed + 0.5)), share);
    float tone = hash12(vec2(tenant, seed + 3.7));
    vec3 L = tone < warmth * 0.8 ? vec3(1.0, 0.74, 0.47) : (tone < warmth * 0.8 + 0.32 ? vec3(1.0, 0.93, 0.8) : vec3(0.72, 0.85, 1.0));
    L *= 0.7 + 0.6 * hash12(vec2(tenant, seed + 9.1));
    float style = floor(hash12(vec2(tenant, seed + 6.1)) * 4.0);
    float blinds = floor(hash12(vec2(tenant, seed + 8.3)) * 4.0);
    float deep = 6.5 + 3.0 * hash12(vec2(tenant, seed + 4.4));
    float ty = d.y > 0.0 ? (CL - p.y) / d.y : -p.y / min(d.y, -1e-4);
    float tz = deep / d.z;
    float tm = min(ty, tz);
    vec3 h = p + d * tm;
    float on = tenantOn * step(0.2, hash12(vec2(floor(h.x / 9.0), level + seed * 1.3)));
    vec3 room;
    if (tz <= ty) {
      // The core: plaster in the floor's light under a cove; in its bays
      // a door, a meeting room lit behind glass, a picture, low cabinets.
      float bk = hash12(vec2(floor(h.x / 3.2), level * 3.1 + seed));
      float bx = fract(h.x / 3.2) * 3.2 - 1.6;
      room = L * (0.1 + 0.05 * h.y / CL);
      if (bk < 0.2) room = mix(room, L * 0.03, step(abs(bx), 0.5) * step(h.y, 2.15));
      else if (bk < 0.4) room = mix(room, L * (0.34 - 0.26 * step(abs(bx + 0.3), 0.8) * step(abs(h.y - 0.74), 0.05)), step(abs(bx), 1.4) * step(0.05, h.y) * step(h.y, 2.4));
      else if (bk < 0.52) room = mix(room, mix(vec3(0.5, 0.2, 0.15), vec3(0.15, 0.3, 0.45), fract(bk * 17.0)) * 0.4 * L, step(abs(bx), 0.6) * step(abs(h.y - 1.55), 0.42));
      else if (bk < 0.72) room = mix(room, L * (0.035 + 0.25 * step(1.12, h.y)), step(abs(bx), 1.5) * step(h.y, 1.18));
      room += L * 0.3 * step(CL - 0.1, h.y);
    } else if (d.y > 0.0) {
      // The ceiling, dark, its fittings bright: the light is in them.
      vec2 q = h.xz;
      float lamp;
      if (style < 0.5) {
        float f = abs(fract(q.y / 1.8) - 0.5) * 1.8;
        lamp = 2.6 * pzFine(step(f, 0.07) * step(fract(q.x / 3.0), 0.8), 0.062, q.y, 0.14) + 0.12 * smoothstep(0.5, 0.0, f);
      } else if (style < 1.5) {
        vec2 f = abs(fract(q / vec2(2.4, 1.8)) - 0.5) * vec2(2.4, 1.8);
        lamp = 2.1 * pzFine(step(f.x, 0.3) * step(f.y, 0.3), 0.083, q.y, 0.6) + 0.1 * smoothstep(0.9, 0.0, length(f));
      } else if (style < 2.5) {
        float r = length(fract(q / 1.5) - 0.5) * 1.5;
        lamp = 7.0 * pzFine(smoothstep(0.12, 0.08, r), 0.017, q.y, 0.22) + 0.16 * smoothstep(0.6, 0.0, r);
      } else {
        // Timber, warm, lit by the pendants under it.
        float r = length((fract(vec2(q.x / 2.0, (q.y - 1.8) / 2.6)) - 0.5) * vec2(2.0, 2.6));
        lamp = 0.03 + 0.2 * smoothstep(1.0, 0.0, r) + 0.03 * step(0.5, fract(q.x / 0.3));
      }
      room = L * (0.035 + 0.05 * (1.0 - h.z / deep) + lamp);
    } else {
      // Carpet, and the light's pools on it.
      vec2 g = h.xz / vec2(2.4, 1.8);
      room = L * (0.04 + pzFine(0.07 * smoothstep(0.5, 0.0, length(fract(g) - 0.5)), 0.025, g.y, 0.4));
    }
    vec3 lamps = vec3(0.0);
    // Pendants over the desks: discs lit from beneath, on their cords.
    if (style > 2.5 && d.y > 0.0 && p.y < CL - 0.75) {
      float tp = (CL - 0.75 - p.y) / d.y;
      if (tp < tm) {
        vec3 q = p + d * tp;
        vec2 f = (fract(vec2(q.x / 2.0, (q.z - 1.8) / 2.6)) - 0.5) * vec2(2.0, 2.6);
        float disc = step(length(f), 0.28) * step(q.z, deep - 1.0);
        room = mix(room, L * (2.4 - 1.6 * smoothstep(0.18, 0.28, length(f))), disc);
      }
    }
    // Who stands about, the screens between the rows, who sits, the desks
    // and their screens, the plants at the glass: furthest first.
    float t = 4.7 / d.z;
    if (t < tm) {
      vec3 q = p + d * t;
      float c = floor(q.x / 7.0);
      float hw = hash12(vec2(c, level + seed * 7.7));
      if (hw > 0.55 && pzBody(q.xy, (c + 0.2 + 0.6 * fract(hw * 5.0)) * 7.0, 1.0) > 0.5) room = L * 0.025;
    }
    t = 3.6 / d.z;
    if (t < tm) {
      vec3 q = p + d * t;
      if (q.y < 1.32 && fract(q.x / 8.0) > 0.18) room = q.y > 1.26 ? L * 0.02 : mix(room, L * 0.22, 0.7);
    }
    t = 2.9 / d.z;
    if (t < tm) {
      vec3 q = p + d * t;
      float c = floor(q.x / 1.6);
      float sx = q.x - (c + 0.5) * 1.6;
      float hs = hash12(vec2(c, level + seed * 2.3));
      if (hs > 0.5 && (step(abs(sx), 0.22) * step(0.7, q.y) * step(q.y, 1.08) + step(length(vec2(sx, q.y - 1.22)), 0.11)) > 0.5) room = L * 0.02;
    }
    t = 2.2 / d.z;
    if (t < tm) {
      vec3 q = p + d * t;
      float c = floor(q.x / 1.6);
      float sx = q.x - (c + 0.5) * 1.6;
      float hd = hash12(vec2(c, level + seed * 2.1));
      if (hd > 0.15 && abs(sx) < 0.72 && q.y < 0.76) room = q.y > 0.72 ? L * 0.3 : L * 0.025;
      else if (hd > 0.3 && abs(sx) < 0.27 && q.y > 0.8 && q.y < 1.14) room = fract(hd * 9.0) < 0.2 ? vec3(0.45, 0.72, 1.0) * 0.6 : L * 0.02;
    }
    t = 0.9 / d.z;
    if (t < tm) {
      vec3 q = p + d * t;
      float c = floor(q.x / 6.0);
      float hp = hash12(vec2(c, level + seed * 4.9));
      vec2 g = vec2(q.x - (c + 0.3 + 0.4 * fract(hp * 3.0)) * 6.0, q.y);
      if (hp > 0.5) {
        float leaf = 0.0;
        for (int i = 0; i < 5; i++) {
          float a = (float(i) - 2.0) * 0.38 + 0.15 * sin(float(i) * 5.0 + hp * 20.0);
          vec2 tip = vec2(sin(a), cos(a)) * (1.0 + 0.3 * cos(float(i) * 3.0 + hp * 9.0));
          vec2 pa = g - vec2(0.0, 0.45);
          float k = clamp(dot(pa, tip) / dot(tip, tip), 0.0, 1.0);
          leaf = max(leaf, step(length(pa - tip * k), 0.1 * sin(k * 3.1) + 0.015));
        }
        if (leaf > 0.5) room = L * vec3(0.02, 0.05, 0.03);
        if (abs(g.x) < 0.24 && g.y < 0.45) room = L * 0.05;
      }
    }
    room *= on;
    // A floor that is off: an exit lamp on the core, a desk lamp left on.
    if (on < 0.5) {
      room += vec3(0.003, 0.004, 0.007);
      if (tz <= ty) room += vec3(0.1, 0.9, 0.35) * 0.5 * step(abs(fract(h.x / 23.0) - 0.5) * 23.0, 0.22) * step(abs(h.y - 2.45), 0.09);
      float tl = 2.2 / d.z;
      if (tl < tm) {
        vec3 q = p + d * tl;
        float c = floor(q.x / 1.6);
        float hl = hash12(vec2(c, level + seed * 6.7));
        if (hl > 0.9) room += vec3(1.0, 0.7, 0.4) * (0.5 * step(length(vec2(q.x - (c + 0.7) * 1.6, q.y - 1.0)), 0.09) + 0.08 * smoothstep(0.7, 0.0, length(vec2(q.x - (c + 0.7) * 1.6, (q.y - 0.75) * 2.0))));
      }
    }
    // The blinds, at the glass: rollers each at its own drop, slats down to
    // one line along the floor, or verticals drawn part way across.
    float bp = hash12(vec2(pane, level + seed * 3.3));
    vec3 cloth = (on > 0.5 ? L * 0.3 : vec3(0.011, 0.012, 0.015)) * mix(vec3(1.0), vec3(1.0, 0.9, 0.75), step(0.5, fract(tone * 7.0)));
    if (blinds > 0.5 && blinds < 1.5 && bp > 0.3) {
      float drop = CL * (0.92 - 0.8 * fract(bp * 7.0));
      if (p.y > drop) room = cloth * (1.0 - 0.6 * step(p.y, drop + 0.05));
    } else if (blinds > 1.5 && blinds < 2.5) {
      float drop = CL * (0.55 + 0.4 * hash12(vec2(floor(pane / 4.0), level + seed)));
      if (p.y > drop) room = cloth * (0.7 + 0.3 * pzFine(step(0.5, fract(p.y * 14.0)), 0.5, p.y * 14.0, 0.5));
    } else if (blinds > 2.5 && bp > 0.45 && inPane < fract(bp * 11.0)) {
      room = cloth * (0.75 + 0.25 * pzFine(step(0.5, fract(p.x / 0.09)), 0.5, p.x / 0.09, 0.5));
    }
    lit = on;
    return room;
  }

  vec3 pzHall(vec3 p, vec3 d, float H, float seed, vec3 accent) {
    const float D = 11.0;
    vec3 L = vec3(1.0, 0.86, 0.68);
    float ty = d.y > 0.0 ? (H - p.y) / d.y : -p.y / min(d.y, -1e-4);
    float tz = D / d.z;
    float tm = min(ty, tz);
    vec3 h = p + d * tm;
    float tall = step(9.0, H);
    vec3 col;
    if (tz <= ty) {
      // Stone in panels, lit at its foot and its head, and along it every
      // 18 m the house's wall, a screen and the lifts.
      float fx = mod(h.x, 18.0);
      col = L * (0.065 + 0.035 * h.y / H) * (1.0 - 0.35 * pzFine(step(fract(h.x / 1.5), 0.02), 0.02, h.x / 1.5, 0.03));
      if (fx > 6.0 && fx < 12.0 && h.y > 0.8 && h.y < H - 1.2) {
        // The house's wall: dark stone, lit round its edge, its mark and
        // its name lit in it.
        // (In a hall with a gallery, over the gallery.)
        vec2 w = vec2(fx - 9.0, h.y - (H > 9.0 ? H - 2.6 : min(H * 0.5, 4.2)));
        float r = length(w);
        float mark = step(abs(r - 0.9), 0.12) + step(r, 0.28) + step(abs(w.y + 1.6), 0.1) * step(abs(w.x), 2.2) * step(0.25, fract(w.x * 1.6));
        float rim = step(2.88, abs(fx - 9.0)) + step(h.y, 0.9) + step(H - 1.3, h.y);
        col = L * (0.035 + 0.05 * smoothstep(H * 0.4, H - 1.2, h.y)) + accent * 0.6 * clamp(mark, 0.0, 1.0) + L * 0.3 * clamp(rim, 0.0, 1.0);
      } else if (fx > 12.6 && fx < 16.0 && h.y > 1.4 && h.y < H - 1.4) {
        // A wall of screens: tiles in a dark grid, what runs on them.
        vec2 s = vec2((fx - 12.6) / 3.4, (h.y - 1.4) / (H - 2.8));
        float k = 0.5 + 0.5 * sin(s.x * 6.0 + s.y * 3.0 + uTime * 0.4 + seed);
        vec2 tile = fract(vec2(fx - 12.6, h.y - 1.4) / 0.85);
        float seam = pzFine(step(0.05, min(tile.x, tile.y)), 0.9, (fx - 12.6) / 0.85, 0.06);
        col = mix(accent, vec3(0.9, 0.3, 0.7), k) * (0.08 + 0.12 * step(0.5, fract(s.y * 3.0 + uTime * 0.05))) * seam;
      } else if (abs(fx - 17.0) < 0.75 || abs(fx - 0.9) < 0.75) {
        float lx = abs(fx - 17.0) < 0.75 ? fx - 17.0 : fx - 0.9;
        col = h.y < 2.3 ? L * 0.03 + L * 0.5 * step(0.68, abs(lx)) : col;
        col += accent * 0.8 * step(abs(lx), 0.1) * step(abs(h.y - 2.55), 0.06);
      }
      col += L * 0.35 * step(h.y, 0.08) + L * 0.4 * step(H - 0.14, h.y);
    } else if (d.y > 0.0) {
      // The ceiling, dark, ruled by lines of light across the hall.
      float f = abs(fract(h.z / 1.6) - 0.5) * 1.6;
      col = L * (0.03 + 1.8 * pzFine(step(f, 0.05), 0.0625, h.z / 1.6, 0.06) + 0.06 * smoothstep(0.6, 0.0, f));
    } else {
      // The floor, polished: the lines again, softer.
      vec3 m2 = h + vec3(d.x, -d.y, d.z) * (H / max(-d.y, 1e-3));
      float f = abs(fract(m2.z / 1.6) - 0.5) * 1.6;
      col = L * (0.025 + 0.2 * pzFine(step(f, 0.07), 0.09, m2.z / 1.6, 0.08)) * (1.0 - 0.4 * h.z / D);
    }
    // The gallery over the back of a tall hall, its glass rail lit, and
    // the escalator up to it; the reception desk under it.
    if (tall > 0.5) {
      const float G = 7.4;
      float tg = d.y != 0.0 ? (G - p.y) / d.y : 1e9;
      if (tg > 0.0 && tg < tm) {
        vec3 q = p + d * tg;
        if (q.z > 6.0) col = d.y > 0.0 ? L * (0.05 + 1.5 * step(length(fract(q.xz / 2.0) - 0.5), 0.07)) : L * 0.09;
      }
      float tr = 6.0 / d.z;
      if (tr < tm) {
        vec3 q = p + d * tr;
        if (q.y > G - 0.3 && q.y < G + 1.1) col = q.y < G ? L * 0.05 + accent * 0.4 * step(G - 0.1, q.y) : mix(col, accent * 0.15 + L * 0.06, 0.5) + accent * 0.6 * step(G + 1.04, q.y);
        float c = floor(q.x / 4.0);
        float hg = hash12(vec2(c, seed + 3.0));
        if (hg > 0.45 && pzBody(vec2(q.x, q.y - G), (c + 0.5) * 4.0 + (hg - 0.7) * 2.0, 1.0) > 0.5) col = L * 0.03;
      }
      float te = 4.6 / d.z;
      if (te < tm) {
        vec3 q = p + d * te;
        float ex = mod(q.x, 18.0) - 1.6;
        float ey = q.y - (ex + 0.5) * G / 6.5;
        if (ex > -0.5 && ex < 6.0 && abs(ey - 0.5) < 0.6) col = L * 0.04 + accent * 0.8 * step(0.55, abs(ey - 0.5)) + L * 0.6 * step(abs(ey - 1.0), 0.04);
      }
      float td = 5.4 / d.z;
      if (td < tm) {
        vec3 q = p + d * td;
        if (abs(mod(q.x, 18.0) - 9.0) < 3.2 && q.y < 1.1) col = L * (0.03 + 0.9 * step(1.04, q.y)) + accent * 0.5 * step(abs(q.y - 0.55), 0.05);
      }
    }
    // People across the hall, in twos and threes.
    for (int i = 0; i < 2; i++) {
      float tt = (i == 0 ? 7.2 : 3.4) / d.z;
      if (tt >= tm) continue;
      vec3 q = p + d * tt;
      float c = floor(q.x / 3.0);
      float hp = hash12(vec2(c, seed + float(i) * 5.0));
      if (hp > 0.5 && pzBody(q.xy, (c + 0.25 + 0.5 * fract(hp * 7.0)) * 3.0, 0.92 + 0.16 * fract(hp * 13.0)) > 0.5) col = L * 0.025;
    }
    // Trees in the hall, in their planters, and its columns.
    float tt = 2.4 / d.z;
    if (tt < tm) {
      vec3 q = p + d * tt;
      float c = floor((q.x + 4.5) / 9.0);
      vec2 g = vec2(q.x + 4.5 - (c + 0.5) * 9.0, q.y);
      float cy = min(H - 1.4, 3.6);
      vec2 e = (g - vec2(0.0, cy)) / vec2(1.3, 1.5);
      float crown = step(length(e) + 0.12 * sin(atan(e.y, e.x) * 7.0 + c), 1.0);
      if (crown > 0.5 && cy > 2.0) col = vec3(0.02, 0.06, 0.035) * (1.0 + 2.0 * step(0.6, fract(dot(g, vec2(3.1, 4.7))))) + L * 0.02;
      if (abs(g.x) < 0.06 && g.y < cy) col = L * 0.03;
      if (abs(g.x) < 0.7 && g.y < 0.7) col = L * (0.05 + 0.6 * step(0.66, g.y));
    }
    float tc = 1.4 / d.z;
    if (tc < tm) {
      vec3 q = p + d * tc;
      float cx = abs(mod(q.x, 9.0) - 4.5);
      if (cx < 0.35) col = L * (0.07 + 0.5 * exp(-q.y / 1.2) * (1.0 - cx / 0.35));
    }
    return col;
  }
`;
