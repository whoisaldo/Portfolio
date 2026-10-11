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

  // The lit face of a street as standing water gives it back, with no
  // mirror to read: the ray from the puddle meets the line the buildings
  // stand on, and what is there is drawn as a street's lights are, in the
  // colour the baked light has at their feet: a band of lit shopfronts
  // between their pilasters, blades and boards over them, a lit room here
  // and there above. Not the street's own signs, but lights where its
  // lights are, sharp, the right way up and the right size from any eye.
  // q: metres along the frontage and up it; tint: the light there.
  vec3 frontage(vec2 q, float seed, vec3 tint) {
    float amount = max(tint.r, max(tint.g, tint.b));
    vec3 hue = tint / max(amount, 0.02);
    amount = smoothstep(0.01, 0.25, amount);
    float bay = q.x / 3.2;
    float open = step(0.3, hash12(vec2(floor(bay), seed)));
    vec3 c = hue * (0.25 + 0.5 * hash12(vec2(floor(bay), seed + 3.0))) * open
           * step(0.5, q.y) * step(q.y, 3.3) * step(0.07, fract(bay)) * step(fract(bay), 0.93);
    vec2 g = vec2(q.x / 2.6, (q.y - 3.7) / 3.4);
    vec2 cell = floor(g);
    float h = hash12(cell + seed);
    vec2 f = fract(g) * vec2(2.6, 3.4);
    float w = 0.45 + 0.9 * fract(h * 7.0);
    float x0 = 0.2 + (2.2 - w) * fract(h * 13.0);
    float board = step(0.0, g.y) * step(g.y, 4.0) * step(h, 0.55 * amount) * step(x0, f.x) * step(f.x, x0 + w) * step(0.3, f.y) * step(f.y, 3.4 - 1.6 * fract(h * 29.0));
    float k = fract(h * 41.0);
    vec3 neon = k < 0.3 ? vec3(1.0, 0.18, 0.53) : (k < 0.55 ? vec3(0.15, 0.86, 0.95) : (k < 0.75 ? vec3(1.0, 0.7, 0.33) : (k < 0.9 ? vec3(0.22, 1.0, 0.6) : vec3(0.64, 0.29, 1.0))));
    c += mix(neon, hue, 0.2) * board;
    vec2 wc = floor(q / vec2(1.6, 3.4));
    vec2 wf = fract(q / vec2(1.6, 3.4));
    c += vec3(1.0, 0.72, 0.42) * 0.35 * step(4.2, q.y) * step(q.y, 12.0 + 24.0 * hash12(vec2(floor(q.x / 19.0), seed)))
       * step(0.82, hash12(wc + seed + 5.0)) * step(0.2, wf.x) * step(wf.x, 0.8) * step(0.3, wf.y) * step(wf.y, 0.8);
    return c * (0.35 + 0.65 * amount);
  }

  // The same, from a point p of a street's ground along r: s and e are
  // streetAt's, px the metres a pixel covers where the ray lands. Nothing
  // where the ray runs off down the street, or p is in no street.
  vec3 frontageReflect(vec3 p, vec3 r, vec4 s, vec4 e, float px) {
    if (max(s.x, s.y) < -8.0) return vec3(0.0);
    bool alongZ = s.x >= s.y;
    float lat = alongZ ? e.x : e.z;
    float lot = alongZ ? e.y : e.w;
    float rx = alongZ ? r.x : r.z;
    float side = rx < 0.0 ? -1.0 : 1.0;
    float t = (side * lot - lat) / (side * max(abs(rx), 1e-3));
    if (t > 170.0) return vec3(0.0);
    vec3 hit = p + r * t;
    vec2 q = vec2(alongZ ? hit.z : hit.x, hit.y);
    vec3 tint = texture2D(uSpill, (hit.xz - uSpillBounds.xy) * uSpillBounds.zw).rgb;
    tint *= tint * uSpillGain;
    // Finer than a pixel, the lights' average instead of their shapes.
    float fine = 1.0 - smoothstep(0.5, 1.6, px);
    vec3 c = mix(tint * 0.25 * step(q.y, 16.0), frontage(q, side * 7.0 + (alongZ ? 0.0 : 31.0), tint), fine);
    return c * smoothstep(170.0, 110.0, t);
  }

  // What a wet floor at p gives back along r (up and away from the eye)
  // with no mirror to read: the baked light under the ray where it is as
  // high as the shopfronts, the blades and the boards over them. Soft, as
  // the map is, and in the right place from any eye.
  vec3 spillReflect(vec3 p, vec3 r) {
    float run = max(length(r.xz), 1e-3);
    vec2 dir = r.xz / run;
    float rise = max(r.y, 0.03) / run;
    vec3 sum = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      float h = i == 0 ? 2.0 : (i == 1 ? 4.5 : (i == 2 ? 8.0 : 14.0));
      float w = i == 0 ? 0.3 : (i == 1 ? 0.32 : (i == 2 ? 0.24 : 0.14));
      vec2 q = p.xz + dir * min(h / rise, 150.0);
      vec3 c = texture2D(uSpill, (q - uSpillBounds.xy) * uSpillBounds.zw).rgb;
      sum += c * c * w;
    }
    return sum * uSpillGain;
  }
`;
