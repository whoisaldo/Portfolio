// src/world/kinds.js: what a surface is made of, as GLSL the plain
// surfaces share (materials.js, surface()).
//
// A tank is not a wall and a gantry is not a shed. Each kind here dresses a
// colour as its own material in world space, with no texture and no UVs:
// where its joints run, what its sheets and plates are, how it rusts and
// stains. Everything is worked out from the point and the way the face
// looks, so it holds at arm's length, and every part fades by the metres a
// pixel covers (px) into its own average before it could shimmer.
//
// kindSource(kind) gives the GLSL for one kind: a
// `vec3 dress(vec3 c, vec3 p, vec3 n, float px, out float wear)` that takes
// the paint's colour and gives it back dressed; wear is how clean the
// sheet is there (the wet shine in surface() follows it).
//
// Needs hash12 (glsl.js) and vnoise (ground.js) above it, and vProp.

const BASE = /* glsl */ `
  // Metres along a face and up it; on a flat one, x and z.
  vec2 faceOf(vec3 p, vec3 a) {
    return a.y > 0.6 ? p.xz : (a.x > a.z ? p.zy : p.xy);
  }
  // A line w wide, d from its middle, never thinner than a pixel.
  float hair(float d, float w, float px) {
    return 1.0 - smoothstep(w, w + px + 1e-4, d);
  }
  const vec3 RUSTED = vec3(0.62, 0.34, 0.18);
`;

const KINDS = {
  // Sheet roofing and plant, as it has been: panels, their seams, grime.
  sheet: /* glsl */ `
    vec3 kindSheet(vec3 c, vec3 p, vec3 n, float px, out float wear) {
      vec3 a = abs(n);
      vec2 q = faceOf(p, a);
      vec2 cell = q / vec2(0.9, 0.6);
      vec2 f = abs(fract(cell) - 0.5);
      float aa = clamp(max(fwidth(cell.x), fwidth(cell.y)) * 2.0, 0.0, 1.0);
      float seam = mix(smoothstep(0.47, 0.5, max(f.x, f.y)), 0.1, aa);
      float grime = a.y > 0.6 ? 0.0 : vnoise(vec2(q.x * 7.0, q.y * 0.5)) * smoothstep(0.25, 0.0, fract(cell.y) - 0.1);
      float speck = mix(vnoise(q * 23.0), 0.5, aa);
      float panel = hash12(floor(cell) + 3.7);
      wear = (0.8 + 0.3 * panel) * (1.0 - 0.45 * seam) * (1.0 - 0.35 * grime) * (0.85 + 0.3 * speck);
      return c * wear;
    }
  `,

  // Poured concrete: the boards of its shutter left in it, a line where
  // each day's pour stopped, the tie holes in rows and what has run out of
  // them, damp in blotches and rain down the face. A slab on the flat.
  concrete: /* glsl */ `
    vec3 kindConcrete(vec3 c, vec3 p, vec3 n, float px, out float wear) {
      vec3 a = abs(n);
      vec2 q = faceOf(p, a);
      float fine = 1.0 - smoothstep(0.012, 0.05, px);
      float mid = 1.0 - smoothstep(0.05, 0.22, px);
      float tone = 0.76 + 0.3 * (vnoise(q * 0.37 + 7.0) * 0.6 + vnoise(q * 1.9) * 0.4);
      float drip = 0.0;
      if (mid > 0.0) {
        if (a.y < 0.6) {
          float by = q.y / 0.15;
          float bi = floor(by);
          float bf = fract(by);
          float board = hash12(vec2(bi, floor(q.x / 2.4 + hash12(vec2(bi, 3.0)))) + 1.3);
          float gap = hair(min(bf, 1.0 - bf) * 0.15, 0.003, px) * fine;
          float lift = hair(abs(fract(q.y / 2.4 + 0.31) - 0.5) * 2.4, 0.008, px);
          vec2 tc = q / vec2(1.2, 0.8) + vec2(0.5, 0.25);
          vec2 t = (fract(tc) - 0.5) * vec2(1.2, 0.8);
          float hole = hair(length(t), 0.017, px) * fine;
          float run = smoothstep(0.5, 0.9, vnoise(vec2(q.x * 4.3, q.y * 0.2 + 3.0)));
          tone *= 1.0 + mid * ((board - 0.5) * 0.16 - 0.22 * gap - 0.3 * lift - 0.6 * hole - 0.28 * run);
          drip = step(0.55, hash12(floor(tc) + 5.0)) * hair(abs(t.x), 0.01, px) * step(t.y, 0.0) * exp(t.y / 0.2) * fine;
        } else {
          vec2 j = (0.5 - abs(fract(q / 3.0) - 0.5)) * 3.0;
          tone *= 1.0 - 0.3 * mid * hair(min(j.x, j.y), 0.008, px);
        }
        tone *= 0.94 + 0.12 * fine * vnoise(q * 31.0);
      }
      wear = tone * 0.88;
      return c * tone * mix(vec3(1.0), RUSTED, drip * 0.8);
    }
  `,

  // Rolled plate: courses 1.8 m high welded one on the next, the upright
  // welds staggered course to course, each plate a shade its own, rust run
  // down from every weld and in long streaks from the top.
  tank: /* glsl */ `
    vec3 kindTank(vec3 c, vec3 p, vec3 n, float px, out float wear) {
      vec3 a = abs(n);
      float side = 1.0 - smoothstep(0.75, 0.95, a.y);
      float along = a.x > a.z ? p.z : p.x;
      float fine = 1.0 - smoothstep(0.012, 0.05, px);
      float mid = 1.0 - smoothstep(0.08, 0.4, px);
      float cy = p.y / 1.8 + 0.2;
      float ci = floor(cy);
      float fy = fract(cy);
      float dw = min(fy, 1.0 - fy) * 1.8;
      float vi = along / 4.6 + hash12(vec2(ci, 9.0));
      float dv = min(fract(vi), 1.0 - fract(vi)) * 4.6;
      float plate = hash12(vec2(ci, floor(vi)) + 2.1);
      float weld = max(hair(dw, 0.009, px), hair(dv, 0.009, px) * side);
      float bead = hair(abs(dw - 0.024), 0.007, px) * fine;
      float runs = smoothstep(0.5, 0.9, vnoise(vec2(along * 7.0, ci * 3.7 + p.y * 0.1))) * exp(-(1.0 - fy) * 1.8 / 0.8);
      float longs = smoothstep(0.6, 0.95, vnoise(vec2(along * 3.1 + 5.0, p.y * 0.07)));
      float rust = clamp(runs * 0.9 + longs * 0.55, 0.0, 1.0) * side * (0.35 + 0.65 * mid);
      float tone = 0.9 + mid * ((plate - 0.5) * 0.2 - 0.42 * weld + 0.2 * bead);
      tone *= 0.82 + 0.3 * vnoise(vec2(along, p.y) * 0.6 + 3.0);
      tone *= 0.95 + 0.1 * fine * vnoise(vec2(along, p.y) * 40.0);
      wear = tone * (1.0 - 0.5 * rust);
      return c * tone * mix(vec3(1.0), RUSTED, rust);
    }
  `,

  // Painted steel: smooth, a little uneven, spliced every 3 m with a cover
  // plate and two rows of bolts a side, chipped to the primer here and
  // there, rust bled down from the splices.
  steel: /* glsl */ `
    vec3 kindSteel(vec3 c, vec3 p, vec3 n, float px, out float wear) {
      vec3 a = abs(n);
      vec2 q = faceOf(p, a);
      float fine = 1.0 - smoothstep(0.006, 0.028, px);
      float mid = 1.0 - smoothstep(0.03, 0.14, px);
      float tone = 0.84 + 0.2 * vnoise(q * 0.9 + 11.0);
      float rust = 0.0;
      if (mid > 0.0) {
        vec2 g = q / 3.0 + 0.37;
        vec2 d = (0.5 - abs(fract(g) - 0.5)) * 3.0;
        float dj = min(d.x, d.y);
        float alongJ = d.x < d.y ? q.y : q.x;
        float cover = step(dj, 0.16);
        float lip = cover * hair(0.16 - dj, 0.004, px);
        float gap = hair(dj, 0.003, px);
        vec2 b = vec2(fract(dj / 0.06 + 0.6667) - 0.5, fract(alongJ / 0.09) - 0.5) * vec2(0.06, 0.09);
        float bl = length(b);
        float bolt = cover * hair(bl, 0.013, px) * fine;
        float ring = cover * hair(abs(bl - 0.017), 0.003, px) * fine;
        tone *= 1.0 + mid * (0.07 * cover - 0.35 * lip - 0.45 * gap + 0.3 * bolt * (0.4 + 1.2 * step(0.0, b.y)) - 0.35 * ring);
        float chip = smoothstep(0.84, 0.87, vnoise(q * 5.0 + 3.0) * 0.75 + vnoise(q * 23.0) * 0.25) * fine;
        float under = a.y > 0.6 ? 0.0 : exp(-d.y / 0.35) * step(d.y, d.x + 0.2) * smoothstep(0.45, 0.85, vnoise(vec2(q.x * 15.0, q.y * 0.9)));
        rust = clamp(chip + under * 0.7 * mid, 0.0, 1.0);
        tone *= 0.96 + 0.08 * fine * vnoise(q * 55.0);
      }
      wear = tone * (1.0 - 0.4 * rust) * 1.06;
      return c * tone * mix(vec3(1.0), RUSTED * 0.8, rust);
    }
  `,

  // Corrugated sheet: ribs 0.2 m apart run up a wall (and down a roof),
  // sheets a metre wide lapped every 3 m and screwed through the crests,
  // each a shade its own and the odd one newer; rust up from every lap.
  corrugated: /* glsl */ `
    float ribs(float t, float w, vec4 lit) {
      float f = fract(t);
      float s = mix(lit.x, lit.y, smoothstep(0.35 - w, 0.35 + w, f));
      s = mix(s, lit.z, smoothstep(0.5 - w, 0.5 + w, f));
      s = mix(s, lit.w, smoothstep(0.85 - w, 0.85 + w, f));
      s = mix(s, lit.x, smoothstep(1.0 - w, 1.0, f));
      return mix(s, dot(lit, vec4(0.35, 0.15, 0.35, 0.15)), smoothstep(0.2, 0.55, w));
    }
    vec3 kindCorrugated(vec3 c, vec3 p, vec3 n, float px, out float wear) {
      vec3 a = abs(n);
      vec2 q = faceOf(p, a);
      float fine = 1.0 - smoothstep(0.01, 0.04, px);
      float mid = 1.0 - smoothstep(0.06, 0.3, px);
      float t = q.x / 0.2;
      float rib = ribs(t, px / 0.2, vec4(1.12, 0.6, 0.84, 1.3));
      float ly = q.y / 3.0 + 0.13;
      float up = fract(ly) * 3.0;
      vec2 sheet = vec2(floor(q.x + 0.05), floor(ly));
      float hs = hash12(sheet + 4.2);
      float lap = hair(up, 0.012, px) + 0.5 * hair(fract(q.x + 0.05), 0.01, px);
      float screw = hair(length(vec2((fract(t) - 0.175) * 0.2, up - 0.07)), 0.011, px) * fine;
      float rust = smoothstep(0.35, 0.8, vnoise(vec2(t * 0.9, q.y * 0.7 + hs * 9.0))) * exp(-up / 0.5) * (a.y > 0.6 ? 0.4 : 1.0);
      rust = max(rust, smoothstep(0.7, 0.9, vnoise(q * vec2(2.3, 0.4) + 17.0))) * (0.3 + 0.7 * mid);
      float tone = rib * (0.86 + 0.2 * mid * (hs - 0.5) + 0.16 * step(0.9, hs)) * (1.0 - mid * (0.4 * lap + 0.5 * screw));
      tone *= 0.8 + 0.25 * vnoise(q * vec2(0.5, 0.25) + 3.0);
      wear = tone * (1.0 - 0.5 * rust);
      return c * tone * mix(vec3(1.0), RUSTED, rust * 0.85);
    }
  `,

  // A shipping container: deep ribs, a flat rail at the top and the foot of
  // every 2.6 m of it (boxes stack from the ground), and every six metres a
  // code in bars and a plate, or a door's four lock rods with their handles.
  container: /* glsl */ `
    float ribs(float t, float w, vec4 lit) {
      float f = fract(t);
      float s = mix(lit.x, lit.y, smoothstep(0.35 - w, 0.35 + w, f));
      s = mix(s, lit.z, smoothstep(0.5 - w, 0.5 + w, f));
      s = mix(s, lit.w, smoothstep(0.85 - w, 0.85 + w, f));
      s = mix(s, lit.x, smoothstep(1.0 - w, 1.0, f));
      return mix(s, dot(lit, vec4(0.35, 0.15, 0.35, 0.15)), smoothstep(0.2, 0.55, w));
    }
    vec3 kindContainer(vec3 c, vec3 p, vec3 n, float px, out float wear) {
      vec3 a = abs(n);
      vec2 q = faceOf(p, a);
      float fine = 1.0 - smoothstep(0.01, 0.04, px);
      float mid = 1.0 - smoothstep(0.06, 0.3, px);
      float rib = ribs(q.x / 0.28, px / 0.28, vec4(1.1, 0.5, 0.78, 1.34));
      float tone = 0.86 + 0.24 * vnoise(q * vec2(0.6, 0.35) + 3.0);
      vec3 mark = vec3(0.0);
      float marked = 0.0;
      float rust = smoothstep(0.72, 0.9, vnoise(q * vec2(1.9, 0.6) + 17.0));
      if (a.y < 0.6) {
        float h = fract(q.y / 2.6) * 2.6;
        float rail = max(step(h, 0.16), step(2.48, h));
        float split = hair(min(h, 2.6 - h), 0.012, px);
        vec2 cell = vec2(floor(q.x / 6.1), floor(q.y / 2.6));
        float hc = hash12(cell + 8.3);
        float x = fract(q.x / 6.1) * 6.1;
        float flat_ = rail;
        if (hc < 0.3) {
          // A door: two leaves, two rods a leaf, a handle on each.
          float dx = x - 1.9 - 2.2 * fract(hc * 31.0);
          float rod = abs(abs(abs(dx) - 0.58) - 0.27);
          float leaf = step(abs(dx), 1.17) * (1.0 - rail);
          flat_ = max(flat_, leaf);
          float bar = leaf * hair(rod, 0.018, px);
          float handle = leaf * step(rod, 0.13) * step(abs(h - 1.15), 0.02) * fine;
          float seam = leaf * max(hair(abs(dx), 0.006, px), hair(abs(abs(dx) - 1.17), 0.02, px));
          mark = vec3(0.55, 0.56, 0.58) * (0.7 + 0.5 * step(rod, 0.006));
          marked = max(bar, handle) * mid;
          tone *= 1.0 - 0.5 * seam * mid;
        } else {
          // Its code: two lines of bars, pale, and a plate under them.
          vec2 k = vec2(x - 3.4 - 1.4 * fract(hc * 17.0), h - 1.95);
          float line = step(abs(k.y - 0.11 * step(0.0, k.y)), 0.04) * step(abs(k.y), 0.16);
          float bars = step(0.0, k.x) * step(k.x, 1.1 - 0.4 * step(k.y, 0.0)) * line * step(0.25, fract(k.x / 0.09)) * step(0.15, hash12(vec2(floor(k.x / 0.09), hc * 40.0 + step(0.0, k.y))));
          vec2 pl = abs(vec2(k.x - 0.2, k.y + 0.75)) - vec2(0.2, 0.14);
          float plate = step(max(pl.x, pl.y), 0.0);
          mark = mix(vec3(0.8, 0.8, 0.76), vec3(0.5, 0.5, 0.46) * (0.6 + 0.6 * step(0.5, fract(k.y / 0.045))), plate);
          marked = max(bars, plate) * fine;
        }
        rib = mix(rib, 0.98, flat_);
        rust = max(rust, smoothstep(0.4, 0.85, vnoise(vec2(q.x * 6.0, cell.y * 7.0))) * exp(-h / 0.3));
        tone *= 1.0 - mid * 0.55 * split;
      }
      rust *= 0.3 + 0.7 * mid;
      tone *= rib * (0.95 + 0.1 * fine * vnoise(q * 37.0));
      wear = tone * (1.0 - 0.5 * rust);
      return mix(c * tone * mix(vec3(1.0), RUSTED, rust * 0.85), mark * 0.5 * tone, marked);
    }
  `,

  // Render: smooth, mottled, hair cracks in the places it has moved, damp
  // up from the ground, and the odd patch blown off the blockwork under it.
  plaster: /* glsl */ `
    vec3 kindPlaster(vec3 c, vec3 p, vec3 n, float px, out float wear) {
      vec3 a = abs(n);
      vec2 q = faceOf(p, a);
      float fine = 1.0 - smoothstep(0.008, 0.035, px);
      float mid = 1.0 - smoothstep(0.05, 0.25, px);
      float tone = 0.8 + 0.26 * (vnoise(q * 0.55 + 2.0) * 0.6 + vnoise(q * 2.7) * 0.4);
      float damp = 0.0;
      if (mid > 0.0) {
        float cn = vnoise(q * 1.3 + 13.0) + 0.22 * vnoise(q * 5.1);
        float slope = max(fwidth(cn) / max(px, 1e-4), 0.25);
        float crack = hair(abs(cn - 0.66) / slope, 0.0025, px) * smoothstep(0.4, 0.6, vnoise(q * 0.31 + 5.0)) * fine;
        float blown = smoothstep(0.77, 0.79, vnoise(q * 0.9 + 31.0) * 0.75 + vnoise(q * 4.3) * 0.25) * mid;
        vec2 blk = fract(vec2(q.x / 0.4 + 0.5 * floor(q.y / 0.2), q.y / 0.2));
        float joint = max(step(blk.x, 0.05), step(blk.y, 0.1)) * fine;
        if (a.y < 0.6) {
          damp = smoothstep(1.3, 0.1, p.y - 0.9 * vnoise(vec2(q.x * 0.8, 3.0)));
          damp = max(damp, 0.7 * smoothstep(0.55, 0.9, vnoise(vec2(q.x * 3.7, q.y * 0.18 + 9.0))));
        }
        tone *= (1.0 - 0.6 * crack) * mix(1.0, 0.62 - 0.2 * joint, blown) * (0.95 + 0.1 * fine * vnoise(q * 64.0));
      }
      wear = tone * 0.84;
      return c * tone * mix(vec3(1.0), vec3(0.62, 0.66, 0.6), damp * (0.4 + 0.6 * mid));
    }
  `,
};

const CALL = {
  sheet: "kindSheet",
  concrete: "kindConcrete",
  tank: "kindTank",
  steel: "kindSteel",
  corrugated: "kindCorrugated",
  container: "kindContainer",
  plaster: "kindPlaster",
};

// A street's prop (instanced) is too small for joints laid out in the
// world: its paint, a little uneven.
const PROP = /* glsl */ `
  vec3 kindProp(vec3 c, vec3 p, out float wear) {
    wear = 0.8 + 0.16 * vnoise(p.xy * 9.0 + p.z * 7.0);
    return c * wear;
  }
`;

/**
 * `kind`: one of CALL's, or "trim": a building's trim is poured concrete,
 * but a face that looks along neither x nor z is no wall of this city (its
 * streets run square): it is the shell of a tank, a sphere, a stack or a
 * pipe, and is dressed as plate.
 */
export function kindSource(kind) {
  if (kind === "trim") {
    return /* glsl */ `${BASE}${PROP}${KINDS.concrete}${KINDS.tank}
      vec3 dress(vec3 c, vec3 p, vec3 n, float px, out float wear) {
        if (vProp > 0.5) return kindProp(c, p, wear);
        vec2 h = abs(n.xz) / max(length(n.xz), 1e-3);
        if (min(h.x, h.y) > 0.1) return kindTank(c, p, n, px, wear);
        return kindConcrete(c, p, n, px, wear);
      }
    `;
  }
  return /* glsl */ `${BASE}${PROP}${KINDS[kind]}
    vec3 dress(vec3 c, vec3 p, vec3 n, float px, out float wear) {
      if (vProp > 0.5) return kindProp(c, p, wear);
      return ${CALL[kind]}(c, p, n, px, wear);
    }
  `;
}
