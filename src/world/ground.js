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

  // What a wet floor at p gives back along r (up and away from the eye)
  // with no mirror to read: the baked light under the ray at each height
  // the ray passes through, counted only where the map's light hangs about
  // that high (its alpha, spill.js). So a puddle holds the sign that stands
  // over it, where it stands, and nothing where nothing does. Soft, as the
  // map is, and in the right place from any eye.
  vec3 spillReflect(vec3 p, vec3 r) {
    float run = max(length(r.xz), 1e-3);
    vec2 dir = r.xz / run;
    float rise = max(r.y, 0.03) / run;
    vec3 sum = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      float h = i == 0 ? 1.5 : (i == 1 ? 3.5 : (i == 2 ? 7.0 : 13.0));
      vec4 c = texture2D(uSpill, (p.xz + dir * min(h / rise, 150.0) - uSpillBounds.xy) * uSpillBounds.zw);
      float dh = h - c.a * 15.94;
      sum += c.rgb * c.rgb * exp(-dh * dh / (1.6 + 0.4 * h * h));
    }
    return sum * uSpillGain * 1.5;
  }
`;
