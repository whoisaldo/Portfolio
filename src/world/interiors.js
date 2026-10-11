// src/world/interiors.js: the room behind a shop's glass, drawn, not
// photographed.
//
// Interior mapping, as the offices and the lobbies have it (materials.js):
// the eye's ray runs through the pane into a box and what it meets is shaded
// there, so the room has depth and slides behind its mullions as a walker
// passes. Everything in it is worked out in the fragment, in the renderer's
// own flat, lit style: a back wall with its stock, side walls, a ceiling
// with its lights, a floor that holds them, and two or three layers of
// furniture between the glass and the back, each a plane or a box the ray
// is tested against, nearest first.
//
// Five trades, one a shop: a store (aisles of shelving end on to the
// street, lit fridges along the back), a counter (stools, a bar with its
// lamps, a hatch to the kitchen, bottles lit from behind), an arcade
// (cabinets, their screens running), a clinic (a tiled room, a chair under
// a ring lamp, a monitor) and a boutique (rails of clothes, a slat wall, a
// figure in the window). The trade, the room's width and depth, its second
// colour and every item of its stock are seeded by the shop itself (the
// brightness and hue the builder gave it, and the wall it stands in), so
// the street is the same on every visit and a shop does not match its
// neighbour. No words anywhere: lettering is bars, marks are shapes.
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

  // Stock on shelves: rows of boxes, bottles and packets, each its own
  // colour, with gaps; item and shelf sizes in metres. Its average where the
  // items are finer than a pixel (fine 0).
  vec3 stock(vec2 q, vec2 size, float seed, float fine) {
    vec2 g = q / size;
    vec2 f = fract(g);
    float h = hash12(floor(g) + seed);
    float item = step(0.14, h) * step(0.07, f.x) * step(f.x, 0.93) * step(0.08, f.y) * step(f.y, 0.5 + 0.4 * fract(h * 9.0));
    vec3 c = mix(vec3(0.8, 0.76, 0.7), neonOf(h * 3.7), 0.6) * (0.45 + 0.55 * fract(h * 17.0));
    return mix(vec3(0.3, 0.27, 0.26), c * item + vec3(0.05) * step(f.y, 0.08), fine);
  }

  // The room behind the glass at p (metres from the room's left wall, up
  // from the sill, 0 in) along d: its colour as it is lit. shop and seed
  // are the shop's and this room's own numbers, L the shop's light, fine 1
  // near and 0 where the stock would shimmer.
  vec3 shopRoom(vec3 p, vec3 d, float roomW, float shop, float seed, vec3 L, float fine) {
    float kind = floor(fract(shop * 5.31) * 5.0);
    float deepest = 3.4 + 2.2 * fract(seed * 3.1);
    vec3 accent = neonOf(shop * 13.7 + 0.37);
    float tx = d.x > 0.0 ? (roomW - p.x) / d.x : -p.x / min(d.x, -1e-4);
    float ty = d.y > 0.0 ? (CEIL_Y - p.y) / d.y : (FLOOR_Y - p.y) / min(d.y, -1e-4);
    float tz = deepest / d.z;
    float tm = min(min(tx, ty), tz);
    vec3 h = p + d * tm;
    float up = (h.y - FLOOR_Y) / (CEIL_Y - FLOOR_Y);
    // The shop's light, a little toward white on what it falls on; and the
    // room's own paint, one of four.
    vec3 lit = mix(vec3(1.0, 0.95, 0.88), L, 0.6);
    float tone = fract(shop * 29.0);
    vec3 paint = tone < 0.25 ? vec3(0.34, 0.5, 0.52) : (tone < 0.5 ? vec3(0.55, 0.36, 0.42) : (tone < 0.75 ? vec3(0.6, 0.52, 0.4) : vec3(0.42, 0.44, 0.5)));
    // Lamps wash the walls in scallops from the ceiling down.
    float wash = 0.35 + 0.65 * smoothstep(0.1, 0.95, up) * (0.6 + 0.4 * cos((h.x + h.z) * 4.6 + seed * 20.0));
    vec3 col;
    if (tm == tz) {
      // The back wall, each trade's own.
      vec2 q = vec2(h.x, h.y - FLOOR_Y);
      col = lit * paint * 0.55 * wash;
      if (kind < 0.5) {
        // Fridges: lit doors, rows of bottles and cans behind them.
        float door = fract(q.x / 0.78);
        vec3 inside = vec3(0.7, 0.9, 1.0) * 0.5 + stock(q, vec2(0.13, 0.36), seed * 31.0, fine) * 0.75;
        col = mix(col, inside, step(q.y, 2.2) * step(0.12, q.y));
        col *= 1.0 - 0.75 * step(door, 0.05) * step(q.y, 2.2);
        col += accent * 1.2 * step(abs(q.y - 2.42), 0.07);
      } else if (kind < 1.5) {
        // A back bar: bottles against a lit wall, and the hatch to the
        // kitchen, its light moving with the steam.
        vec3 bottles = accent * 0.8 * (1.0 - 0.8 * step(0.25, hash12(floor(q / vec2(0.09, 0.4)) + seed)) * step(fract(q.y / 0.4), 0.7) * fine);
        col = mix(col, bottles, step(1.15, q.y) * step(q.y, 2.35) * step(fract(q.y / 0.4), 0.92));
        float hatch = within(q, vec2(roomW * 0.52, 1.05), vec2(roomW * 0.86, 1.95));
        // (Through it: the far wall of the kitchen, a shelf, a hood's edge.)
        vec3 kitchen = vec3(1.0, 0.8, 0.5) * (0.5 + 0.12 * sin(uTime * 1.7 + seed * 40.0 + q.x * 3.0)) * (1.0 - 0.5 * step(1.72, q.y))
                     * (1.0 - 0.6 * step(abs(q.y - 1.42), 0.02)) + stock(q, vec2(0.11, 0.32), seed * 3.0, fine) * 0.3 * step(1.44, q.y) * step(q.y, 1.72);
        col = mix(col, kitchen, hatch);
        col *= 1.0 - 0.6 * step(q.y, 1.05);
      } else if (kind < 2.5) {
        // Screens, each running its own colours, and a tube bent round them.
        vec2 g = q / vec2(1.05, 0.78);
        vec2 f = fract(g);
        float hs = hash12(floor(g) + seed * 7.0);
        float on = step(0.3, hs) * step(1.0, g.y) * step(g.y, 3.0) * within(f, vec2(0.08, 0.1), vec2(0.92, 0.9));
        vec3 pic = mix(neonOf(hs * 5.0 + floor(uTime * (0.2 + hs))), neonOf(hs * 9.0), 0.5 + 0.5 * sin(f.y * 9.0 + uTime * (1.0 + 3.0 * hs)));
        col = mix(col * 0.5, pic * (0.55 + 0.35 * step(0.5, fract(f.y * 14.0 * fine))), on);
        col += accent * 1.6 * step(abs(q.y - 2.55), 0.035);
      } else if (kind < 3.5) {
        // Tiles, a cabinet, a monitor and a ring lamp.
        vec2 tile = abs(fract(q / 0.3) - 0.5);
        col = lit * vec3(0.62, 0.68, 0.7) * (0.35 + 0.4 * wash) * (1.0 - 0.3 * step(0.46, max(tile.x, tile.y)) * fine);
        col = mix(col, vec3(0.03, 0.035, 0.04), within(q, vec2(roomW * 0.08, 0.0), vec2(roomW * 0.42, 1.9)));
        col = mix(col, vec3(0.2, 0.9, 0.95) * (0.7 + 0.3 * step(0.5, fract(q.y * 9.0 + uTime * 0.4))), within(q, vec2(roomW * 0.56, 1.25), vec2(roomW * 0.86, 1.95)));
        col += vec3(0.9, 0.97, 1.0) * 1.5 * step(abs(length(q - vec2(roomW * 0.25, 2.3)) - 0.24), 0.035);
      } else {
        // A slat wall, goods on it under their spots.
        float spot = exp(-pow(fract(q.x / 1.3) - 0.5, 2.0) * 14.0) * smoothstep(0.4, 2.6, q.y);
        col = lit * paint * (0.2 + 0.6 * spot) * (1.0 - 0.3 * step(fract(q.y / 0.14), 0.12) * fine);
        col += stock(q, vec2(0.42, 0.62), seed * 13.0, fine) * (0.25 + 0.75 * spot) * step(0.6, q.y) * step(q.y, 2.5);
      }
    } else if (tm == ty && d.y > 0.0) {
      // The ceiling and its lights: panels, or tubes end on to the street.
      float tubes = step(0.5, fract(seed * 23.0));
      vec2 f = abs(fract(h.xz / mix(vec2(1.25, 1.1), vec2(0.9, 2.6), tubes)) - 0.5);
      float lamp = mix(0.25, step(f.x, mix(0.3, 0.07, tubes)) * step(f.y, 0.36), fine);
      col = lit * (0.05 + 2.4 * lamp) * (1.0 - 0.4 * h.z / deepest);
    } else if (tm == ty) {
      // The floor: tiles, and the ceiling's light lying on them.
      vec2 tile = floor(h.xz / 0.6);
      float pool = 0.5 + 0.5 * cos(h.x * 5.0) * cos(h.z * 5.7);
      col = lit * (0.05 + 0.13 * pool) * (0.7 + 0.3 * mod(tile.x + tile.y, 2.0) * fine) * (1.0 - 0.35 * h.z / deepest);
    } else {
      // A side wall: shelving to head height, a strip of the second colour
      // over it, or a bare one with pictures hung on it.
      vec2 q = vec2(h.z, h.y - FLOOR_Y);
      float left = step(d.x, 0.0);
      col = lit * paint * 0.5 * wash;
      if (fract(seed * 11.0 + left * 0.5) < 0.65) {
        col = mix(col, lit * 0.1 + stock(q, vec2(0.2, 0.42), seed * 47.0 + left, fine) * lit * 0.8, step(0.25, q.y) * step(q.y, 2.15));
        col += accent * 1.1 * step(abs(q.y - 2.24), 0.03);
      } else {
        vec2 g = vec2(q.x / 0.95, (q.y - 1.0) / 0.9);
        float hs = hash12(vec2(floor(g.x), seed * 83.0 + left));
        float card = step(0.0, g.y) * step(g.y, 1.0) * step(0.3, hs) * within(fract(g), vec2(0.14, 0.1), vec2(0.86, 0.9));
        vec2 f = fract(g);
        vec3 print = mix(neonOf(hs * 5.0) * 0.6, vec3(0.85, 0.8, 0.7), step(length(f - vec2(0.5, 0.58)), 0.2 + 0.1 * hs) + step(f.y, 0.3) * step(0.25, fract(f.x * 7.0)) * step(0.5, fract(f.y * 13.0)));
        col = mix(col, print * lit * 0.6, card);
      }
      col *= 1.0 - 0.3 * h.z / deepest;
    }
    // What stands in the room, nearest the back first, each hiding what is
    // behind it.
    if (kind < 0.5) {
      // Aisles: shelving end on to the street, the next two the ray meets.
      float aisle = 1.35;
      float xs = d.x > 0.0 ? floor(p.x / aisle + 1.0) * aisle : ceil(p.x / aisle - 1.0) * aisle;
      for (int i = 0; i < 2; i++) {
        float tg = (xs - p.x) / (abs(d.x) > 1e-4 ? d.x : 1e-4);
        vec3 q = p + d * tg;
        if (tg > 0.0 && tg < tm && xs > 0.3 && xs < roomW - 0.3 && q.z > 1.0 && q.z < deepest - 1.0 && q.y < FLOOR_Y + 1.6) {
          col = lit * 0.08 + stock(vec2(q.z, q.y - FLOOR_Y), vec2(0.17, 0.4), seed * 5.0 + xs, fine) * lit * 0.95;
          tm = tg;
          break;
        }
        xs += d.x > 0.0 ? aisle : -aisle;
      }
      // Their ends, and a till by the door.
      float te = 1.0 / d.z;
      vec3 q = p + d * te;
      float gx = abs(fract(q.x / aisle + 0.5) - 0.5) * aisle;
      if (te < tm && gx < 0.24 && q.x > 0.5 && q.x < roomW - 0.5 && q.y < FLOOR_Y + 1.6) {
        col = lit * 0.08 + stock(vec2(gx + q.x, q.y - FLOOR_Y), vec2(0.16, 0.4), seed * 3.0, fine) * lit;
        tm = te;
      }
    } else if (kind < 1.5) {
      // Somebody cooking; the bar, its top lit, lamps hung over it; stools.
      float tc = 2.5 / d.z;
      vec3 q = p + d * tc;
      if (tc < tm && person(q.xy, roomW * (0.25 + 0.3 * fract(seed * 19.0))) > 0.5) { col *= 0.07; tm = tc; }
      float bar = FLOOR_Y + 1.05;
      float tt = (bar - p.y) / min(d.y, -1e-4);
      q = p + d * tt;
      if (d.y < 0.0 && tt < tm && q.z > 1.7 && q.z < 2.25) {
        col = lit * vec3(0.5, 0.36, 0.26) * (0.6 + 0.9 * step(0.84, hash12(floor(q.xz / 0.3) + seed)) * fine);
        tm = tt;
      }
      tc = 1.7 / d.z;
      q = p + d * tc;
      if (tc < tm && q.y < bar) {
        col = L * 0.04 + accent * 0.9 * step(abs(q.y - bar + 0.09), 0.03);
        tm = tc;
      }
      if (tc < tm) {
        vec2 lamp = vec2(fract(q.x / 1.2) - 0.5, q.y - 1.95);
        col = mix(col, vec3(0.012), step(abs(lamp.x) * 1.2, 0.012) * step(1.95, q.y));
        col = mix(col, mix(L, vec3(1.0), 0.4) * 2.4, step(length(lamp * vec2(1.2, 1.0)), 0.13));
      }
      tc = 1.3 / d.z;
      q = p + d * tc;
      float sx = abs(fract(q.x / 0.7) - 0.5) * 0.7;
      float stool = max(step(sx, 0.17) * step(abs(q.y - FLOOR_Y - 0.72), 0.04), step(sx, 0.025) * step(q.y, FLOOR_Y + 0.72));
      if (tc < tm && q.x > 0.3 && q.x < roomW - 0.3 && stool > 0.5) { col = L * 0.02; tm = tc; }
      if (tc < tm && fract(seed * 29.0) < 0.6 && person(q.xy + vec2(0.0, 0.35), roomW * (0.3 + 0.4 * fract(seed * 37.0))) > 0.5) col *= 0.06;
    } else if (kind < 2.5) {
      // Cabinets in a row, their screens lit, somebody at one.
      float tc = 1.9 / d.z;
      vec3 q = p + d * tc;
      float slot = floor(q.x / 0.95);
      vec2 f = vec2(fract(q.x / 0.95) * 0.95, q.y - FLOOR_Y);
      float hs = hash12(vec2(slot, seed * 71.0));
      if (tc < tm && hs > 0.25 && q.x > 0.2 && q.x < roomW - 0.2 && within(f, vec2(0.1, 0.0), vec2(0.85, 1.85)) > 0.5) {
        col = L * 0.03;
        col += mix(neonOf(hs * 7.0), neonOf(hs * 3.0 + floor(uTime * 0.5 + hs * 9.0)), 0.5 + 0.5 * sin(f.y * 23.0 + uTime * 5.0 * hs))
             * 0.9 * within(f, vec2(0.2, 1.05), vec2(0.75, 1.5));
        col += accent * 1.4 * within(f, vec2(0.14, 1.62), vec2(0.81, 1.78));
        tm = tc;
      }
      tc = 1.35 / d.z;
      q = p + d * tc;
      if (tc < tm && person(q.xy, (floor(roomW * fract(seed * 19.0) / 0.95) + 0.5) * 0.95) > 0.5) col *= 0.06;
    } else if (kind < 3.5) {
      // The chair, tipped back, under its lamp's arm; somebody beside it.
      float tc = 2.1 / d.z;
      vec3 q = p + d * tc;
      vec2 c = vec2(q.x - roomW * 0.5, q.y - FLOOR_Y);
      vec2 back = mat2(0.82, -0.57, 0.57, 0.82) * (c - vec2(0.25, 0.62));
      float chair = max(max(within(c, vec2(-0.55, 0.5), vec2(0.3, 0.64)), within(back, vec2(0.0, -0.07), vec2(0.95, 0.07))), within(c, vec2(-0.2, 0.0), vec2(-0.08, 0.5)));
      float arm = max(within(c, vec2(0.98, 0.0), vec2(1.03, 2.0)), within(c, vec2(0.45, 1.97), vec2(1.03, 2.02)));
      if (tc < tm && max(chair, arm) > 0.5) { col = L * 0.025; tm = tc; }
      if (tc < tm) col = mix(col, vec3(0.92, 0.98, 1.0) * 2.6, step(length(c - vec2(0.45, 1.9)), 0.11));
      if (tc < tm && fract(seed * 29.0) < 0.7 && person(q.xy, roomW * 0.5 - 0.95) > 0.5) col *= 0.06;
    } else {
      // Two rails of clothes, and a figure in the window, lit.
      for (int i = 0; i < 2; i++) {
        float tc = (i == 0 ? 2.7 : 1.5) / d.z;
        vec3 q = p + d * tc;
        vec2 c = vec2(q.x, q.y - FLOOR_Y);
        float slot = floor(c.x / 0.2);
        float hs = hash12(vec2(slot + float(i) * 57.0, seed * 91.0));
        float run = step(roomW * 0.12, c.x) * step(c.x, roomW * (i == 0 ? 0.88 : 0.6));
        float cloth = run * step(0.2, hs) * step(1.55 - 0.55 - 0.45 * fract(hs * 7.0), c.y) * step(c.y, 1.5) * step(0.05, fract(c.x / 0.2));
        float rail = run * step(abs(c.y - 1.56), 0.018);
        if (tc < tm && max(cloth, rail) > 0.5) {
          col = mix(vec3(0.3), neonOf(hs * 11.0), 0.5) * L * (0.25 + 0.5 * fract(hs * 3.0)) * mix(0.6, 1.0, cloth);
          tm = tc;
        }
      }
      float tc = 0.5 / d.z;
      vec3 q = p + d * tc;
      if (tc < tm && person(q.xy, roomW * (0.72 + 0.12 * fract(seed * 19.0))) > 0.5) col = L * (0.5 + 0.4 * (q.y - FLOOR_Y) / 1.7);
    }
    // The window itself: goods on a low plinth just inside the glass, under
    // their own spot, and in half the shops a tube bent into a shape, hung
    // over them.
    float tw = 0.3 / d.z;
    vec3 w = p + d * tw;
    if (tw < tm && fract(seed * 61.0) < 0.7 && w.x > 0.25 && w.x < roomW - 0.25) {
      vec2 g = vec2(w.x / 0.34, (w.y - 0.02) / 0.6);
      float hs = hash12(vec2(floor(g.x), seed * 97.0));
      vec2 f = fract(g);
      float item = step(0.0, g.y) * step(g.y, 1.0) * step(0.35, hs) * step(0.16, f.x) * step(f.x, 0.84) * step(f.y, 0.35 + 0.6 * fract(hs * 9.0));
      col = mix(col, mix(vec3(0.85, 0.82, 0.76), neonOf(hs * 3.7), 0.5) * lit * (0.5 + 0.5 * f.y), item);
      col = mix(col, lit * vec3(0.05, 0.05, 0.06), step(w.y, 0.02));
    }
    float th = 0.22 / d.z;
    w = p + d * th;
    if (th < tm && fract(shop * 37.0) < 0.5) {
      vec2 c = vec2(w.x - roomW * (0.3 + 0.4 * fract(shop * 41.0)), w.y - 2.15);
      float form = fract(shop * 47.0);
      float tube = form < 0.34 ? abs(length(c) - 0.3)
                 : (form < 0.67 ? max(abs(abs(c.x) * 0.9 + c.y - 0.12), abs(c.x) - 0.4) : min(abs(abs(c.y) - 0.16) + step(0.45, abs(c.x)), abs(length(c) - 0.09)));
      col += accent * 2.4 * (1.0 - smoothstep(0.018, 0.03, tube));
    }
    return col;
  }
`;
