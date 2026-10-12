// src/world/ground.js: what the road and the pavements know about where they
// are, as GLSL the ground's shaders share (road.js, materials.js).
//
// A street is wet in a pattern, not evenly: water stands along the kerbs,
// in the wheel ruts and where two streets meet, the lanes' middles carry
// oil, the paving is laid square to the kerb. None of that is in the
// ground's geometry (its UVs are the world's own metres), so the shaders
// work it out from the plan itself: every street of the network runs along
// x or along z, and the list below is the builder's (scripts/blender/ncw/
// plan.py, STREETS), compiled into a function of a point.
//
// And a wet floor that has no mirror to read still gives the street back:
// the light the city bakes onto the ground (spill.js) is a map of what glows
// over each square metre, so a reflected ray is followed along the ground
// and the map read where the ray would be at the height the signs hang.

import { CELL } from "./spill.js";

// plan.py's STREETS: axis, centre line, from, to, half carriageway, kerbside
// bay, lanes each way.
const STREETS = [
  ["z", 0, -720, 88, 10, 2.6, 2],
  ["x", -720, -80, 60, 8, 0, 2],
  ["z", -80, -720, 1, 10, 0, 2],
  ["x", -179, -80, 440, 7, 2.4, 1],
  ["x", 1, -80, 440, 7, 0, 2],
  ["z", 120, -330, 1, 8, 0, 2],
  ["x", -330, 120, 440, 9, 0, 2],
  ["z", 440, -330, 1, 8, 2.4, 1],
];

const f = (v) => v.toFixed(2);
// A street's lanes as streets.py paints them: the middles of the inner and
// the outer lane, metres from the centre line.
const lanes = ([, , , , half, bay, n]) => {
  if (n < 2) return [(half - bay) / 2, (half - bay) / 2];
  const line = half >= 9.5 ? 3.6 : 3.5;
  return [line / 2, (line + (bay > 0 ? half - bay : half - 0.35)) / 2];
};
const street = (s) => {
  const [axis, c, a, b, half] = s;
  const [l1, l2] = lanes(s);
  const walk = half >= 9 && axis === "x" ? 5 : 4;
  const [across, along, kerb, lane, off, lot] = axis === "z" ? ["p.x", "p.y", "s.x", "s.z", "e.x", "e.y"] : ["p.y", "p.x", "s.y", "s.w", "e.z", "e.w"];
  return `lat = ${across} - (${f(c)}); d = ${f(half)} - abs(lat);
    if (${along} > ${f(a - 10)} && ${along} < ${f(b + 10)} && d > ${kerb}) { ${kerb} = d; ${lane} = min(abs(abs(lat) - ${f(l1)}), abs(abs(lat) - ${f(l2)})); ${off} = lat; ${lot} = ${f(half + walk)}; }`;
};

export const VNOISE = /* glsl */ `
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
  }
`;

// Needs VNOISE above it, and glsl.js's COMMON above that.
export const GROUND = /* glsl */ `
  // A point of the ground (x, z) in the street network's frame. x and y:
  // metres in from the kerb face of the street along z, and of the street
  // along x, that the point is in or beside (negative on the pavement, -99
  // away from any street); z and w: metres from the middle of the nearest
  // lane of each. In both carriageways at once is a junction. And in e, for
  // each of the two again: metres across from its centre line (signed), and
  // how far from the centre line its buildings stand.
  vec4 streetAt(vec2 p, out vec4 e) {
    vec4 s = vec4(-99.0, -99.0, 9.0, 9.0);
    e = vec4(0.0, 14.0, 0.0, 14.0);
    float lat, d;
    ${STREETS.map(street).join("\n    ")}
    return s;
  }

  // The baked light at a point of the ground, read through a smooth
  // filter (a cubic B-spline over the map's 1.5 m cells, four taps): the
  // map magnified under the eye shows no cell, no crease and no square,
  // however near the eye is to it.
  vec4 spillSmooth(vec2 xz) {
    vec2 res = 1.0 / (uSpillBounds.zw * ${f(CELL)});
    vec2 t = (xz - uSpillBounds.xy) * uSpillBounds.zw * res - 0.5;
    vec2 i = floor(t);
    vec2 u = t - i;
    vec2 u2 = u * u;
    vec2 u3 = u2 * u;
    vec2 w0 = (1.0 - 3.0 * u + 3.0 * u2 - u3) / 6.0;
    vec2 w1 = (4.0 - 6.0 * u2 + 3.0 * u3) / 6.0;
    vec2 w3 = u3 / 6.0;
    vec2 g0 = w0 + w1;
    vec2 g1 = 1.0 - g0;
    vec2 h0 = (i - 0.5 + w1 / g0) / res;
    vec2 h1 = (i + 1.5 + w3 / g1) / res;
    return mix(mix(texture2D(uSpill, vec2(h1.x, h1.y)), texture2D(uSpill, vec2(h0.x, h1.y)), g0.x),
               mix(texture2D(uSpill, vec2(h1.x, h0.y)), texture2D(uSpill, vec2(h0.x, h0.y)), g0.x), g0.y);
  }

  // spillAt (glsl.js) for a floor: the same light, through that filter.
  vec3 spillGround(vec3 p) {
    vec2 uv = (p.xz - uSpillBounds.xy) * uSpillBounds.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);
    vec4 s = spillSmooth(p.xz);
    float h = max(p.y, 0.0);
    float dh = h - s.a * 15.94;
    return s.rgb * s.rgb * uSpillGain * (0.25 + 0.75 * exp(-h * 0.085)) * (0.7 + 1.5 * exp(-dh * dh * 0.22)) + doorPool(p) + garageRoom(p);
  }

  // What a wet floor at p gives back along r (up and away from the eye)
  // with no mirror to read: the baked light under the ray at each height
  // the ray passes through, counted only where the map's light hangs about
  // that high (its alpha, spill.js), and for less the further down the ray
  // it is (the map cannot say what stands between: a sign two streets off
  // is behind a building as often as not, and a yard gives back its own
  // lamps, not the avenue's neon). So a puddle holds the sign that stands
  // over it, where it stands, and nothing where nothing does. Read through
  // the smooth filter, so it is light on water and never the map's cells.
  vec3 spillReflect(vec3 p, vec3 r) {
    float run = max(length(r.xz), 1e-3);
    vec2 dir = r.xz / run;
    float rise = max(r.y, 0.03) / run;
    // (The heights are over the floor itself: a deck 8 m up gives back what
    // hangs over the deck, not the signs of the street under it.)
    float base = max(p.y, 0.0);
    vec3 sum = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float h = i == 0 ? 2.0 : (i == 1 ? 5.0 : 11.0);
      float reach = min(h / rise, 90.0);
      vec4 c = spillSmooth(p.xz + dir * reach);
      float dh = base + h - c.a * 15.94;
      sum += c.rgb * c.rgb * exp(-dh * dh / (1.6 + 0.4 * h * h)) * exp(-reach / 55.0);
    }
    return sum * uSpillGain * 3.0;
  }

  // What a floor may give back of that light: a little off its colour (the
  // map's sums run to pure pinks and blues no wet stone shows), and never
  // past top however many signs hang over it.
  vec3 tame(vec3 c, float top) {
    c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 0.78);
    return c / (1.0 + max(c.r, max(c.g, c.b)) / top);
  }
`;
