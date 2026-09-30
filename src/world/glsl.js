// src/world/glsl.js: the light model every surface in the city shares.
//
// There are no lights in this scene in the three.js sense. A night street is
// lit by its signs, its shopfronts and its windows, and there are hundreds of
// those: a forward renderer looping over hundreds of point lights per pixel
// is not a portfolio's frame budget. So the light is in the geometry itself.
// At load, every emissive triangle in the city (each sign, strip, shopfront
// and lamp) is splatted into a map over the ground plane, a soft pool of its
// own colour around its feet (src/world/spill.js). Every surface samples that
// map at its own position and falls off with height, which is how the plate
// lights its street: pink under the pink signs, cyan under the cyan ones, and
// dark above the third storey.
//
// Distance does the rest: exponential fog toward a near-black violet, and a
// glow along the horizon where a lit city scatters its light into wet air.
// Emissive surfaces lose less to the fog than lit ones, because a sign 400 m
// up the street still reads as a sign.

/** How many of the kit's lamps (lamp_<name>) the city lights with. */
export const LAMPS = 12;

/** Uniforms every city material shares, as one object, updated once a frame. */
export function createSharedUniforms(THREE) {
  return {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uLevel: { value: 0 },
    uSpill: { value: null },
    uSpillBounds: { value: new THREE.Vector4(0, 0, 1, 1) },
    uSpillGain: { value: 1 },
    uFogColor: { value: new THREE.Color(0x07050b) },
    uHazeColor: { value: new THREE.Color(0x3a1446) },
    uFogDensity: { value: 0.0021 },
    uHaze: { value: 1 },
    uCam: { value: new THREE.Vector3() },
    // The lit city's glow in the wet air, and the way to downtown (up the
    // avenue), where it is brightest.
    uGlowColor: { value: new THREE.Color(0.95, 0.36, 0.78).multiplyScalar(0.34) },
    uGlowDir: { value: new THREE.Vector2(0, -1) },
    // The garage (src/world/garage.js): seconds since its tubes struck on
    // (-1 while they are off), and its door's light on the street: the
    // opening's x, its middle's z, its half width, and how far up it is.
    uTubeClock: { value: -1 },
    uDoorLight: { value: new THREE.Vector4(0, 0, 1, 0) },
    uDoorColor: { value: new THREE.Color(1, 0.72, 0.92) },
    // Corpo row (src/world/towers.js): each tower's colour, how lit it is
    // (its card being read) and the height of its roof, west to east.
    uTowerAccent: { value: Array.from({ length: 8 }, () => new THREE.Color(0, 0, 0)) },
    uTowerLit: { value: new Float32Array(8).fill(0.18) },
    uTowerTop: { value: new Float32Array(8).fill(120) },
    uTowerCentre: { value: Array.from({ length: 8 }, () => new THREE.Vector2(1e5, 1e5)) },
    // A handful of lamps the kit places (lamp_<name>): a doorway, a string
    // of bulbs, a rooftop sign. xyz and reach, and colour times power.
    uLamps: { value: Array.from({ length: LAMPS }, () => new THREE.Vector4(0, -1e4, 0, 0)) },
    uLampColors: { value: Array.from({ length: LAMPS }, () => new THREE.Color(0, 0, 0)) },
  };
}

export const COMMON = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uLevel;
  uniform sampler2D uSpill;
  uniform vec4 uSpillBounds;
  uniform float uSpillGain;
  uniform vec3 uFogColor;
  uniform vec3 uHazeColor;
  uniform float uFogDensity;
  uniform float uHaze;
  uniform vec3 uCam;
  uniform vec3 uGlowColor;
  uniform vec2 uGlowDir;
  uniform float uTubeClock;
  uniform vec4 uDoorLight;
  uniform vec3 uDoorColor;
  uniform vec4 uLamps[${LAMPS}];
  uniform vec3 uLampColors[${LAMPS}];

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }

  // The city's own light at a point: the ground map, strongest near the
  // street and gone by the fifth storey.
  // The garage's open door: its room's light thrown out across the wet
  // street, widening and fading as it goes, only as far up as the door is.
  vec3 doorPool(vec3 p) {
    if (uDoorLight.w <= 0.0) return vec3(0.0);
    float away = uDoorLight.x - p.x;
    float spread = uDoorLight.z + max(away, 0.0) * 0.4;
    float across = 1.0 - smoothstep(spread * 0.6, spread, abs(p.z - uDoorLight.y));
    float along = exp(-max(away, 0.0) * 0.14) * smoothstep(-0.6, 0.4, away);
    return uDoorColor * uDoorLight.w * across * along * exp(-max(p.y, 0.0) * 0.5) * 0.9;
  }

  // Inside the garage once its tubes have struck: its own light, pink off
  // the one wall, cyan off the other, white from overhead, flickering with
  // the tubes as they catch.
  vec3 garageRoom(vec3 p) {
    if (uTubeClock < 0.0) return vec3(0.0);
    if (p.x < 452.4 || p.x > 475.6 || p.z < -229.6 || p.z > -200.4 || p.y > 7.8) return vec3(0.0);
    float catching = step(0.5, hash12(vec2(floor(uTubeClock * 20.0), 7.0)));
    float on = uTubeClock > 0.6 ? 1.0 : catching * smoothstep(0.0, 0.6, uTubeClock);
    vec3 pink = vec3(1.0, 0.16, 0.5) * smoothstep(-224.0, -201.0, p.z);
    vec3 cyan = vec3(0.14, 0.82, 0.95) * (1.0 - smoothstep(-229.0, -206.0, p.z));
    vec3 white = vec3(0.85, 0.87, 0.92) * (0.35 + 0.25 * smoothstep(0.0, 7.0, p.y));
    return (pink * 0.32 + cyan * 0.32 + white * 0.22) * on * (1.0 + 0.15 * uBass);
  }

  vec3 spillAt(vec3 p) {
    vec2 uv = (p.xz - uSpillBounds.xy) * uSpillBounds.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);
    vec3 s = texture2D(uSpill, uv).rgb;
    float h = max(p.y, 0.0);
    return s * s * uSpillGain * (0.25 + 0.75 * exp(-h * 0.085)) + doorPool(p) + garageRoom(p);
  }

  // The kit's own lamps (lamp_<name>) on a surface facing n: a doorway's
  // light on the roof round it, bulbs over a roof, a sign's light on what
  // stands under it. Each reaches so far and no further.
  vec3 lampsAt(vec3 p, vec3 n) {
    vec3 sum = vec3(0.0);
    for (int i = 0; i < ${LAMPS}; i++) {
      vec4 L = uLamps[i];
      vec3 d = L.xyz - p;
      float d2 = dot(d, d);
      float r2 = L.w * L.w;
      if (d2 > r2) continue;
      float fall = 1.0 - d2 / r2;
      float ndl = 0.25 + 0.75 * max(dot(n, d) * inversesqrt(d2 + 1e-4), 0.0);
      sum += uLampColors[i] * fall * fall * ndl / (1.0 + d2 * 0.12);
    }
    return sum;
  }

  // The city's glow in the air along a direction, at a height: low over
  // the roofs, and strongest toward downtown.
  vec3 cityGlow(vec3 dir, float y) {
    float t1 = max(dot(normalize(dir.xz + 1e-5), uGlowDir), 0.0);
    float toward = t1 * t1 * t1;
    // Right up the avenue, low on the horizon, downtown burns: a hot core,
    // warmer and whiter, that pulls the eye to the vanishing point.
    float hot = pow(t1, 90.0) * exp(-max(y, 0.0) * 0.1);
    vec3 glow = uGlowColor * (0.3 + 0.7 * toward) + vec3(1.0, 0.62, 0.86) * hot * 0.45;
    return glow * uHaze * exp(-max(y, 0.0) * 0.0045);
  }

  // Distance: fog into near-black violet close to, and further off into the
  // glow of the lit city hanging in the wet air, so the end of a street is
  // brighter than its middle, as the plate has it.
  vec3 cityFog(vec3 col, vec3 p, float emissive) {
    vec3 d = p - uCam;
    float dist = length(d);
    float f = 1.0 - exp(-dist * uFogDensity * mix(1.0, 0.45, emissive));
    float low = exp(-max(p.y, 0.0) * 0.01);
    vec3 fogCol = mix(uFogColor, uHazeColor, uHaze * low * smoothstep(40.0, 360.0, dist));
    fogCol += cityGlow(d, p.y) * smoothstep(120.0, 900.0, dist);
    return mix(col, fogCol, f);
  }
`;

export const VERT_WORLD = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const VERT_WORLD_COLOR = /* glsl */ `
  attribute vec4 color;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;
  varying vec4 vColor;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    vColor = color;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/**
 * The window shader both the kit's facades and the far city use. `uv` is in
 * window cells (one u per bay, one v per storey); `params` is the building's
 * lit fraction, window style (0..1, five styles) and warmth. Returns the
 * colour in rgb and how much of it is lit glass in a (for the fog).
 * Needs COMMON above it.
 *
 * A lit window at night is a room: a run of one to three bays on a floor
 * shares its light, and floors differ (an office leaves whole floors on).
 * The light is mostly white, warm in homes and cool in offices by the
 * building's warmth, with a few rooms lit by a television and a few by the
 * city's own pink and teal. Each pane has its frame, its mullions and, in
 * homes, a transom; some rooms have blinds, some curtains, and some a dark
 * shape standing against the glass. Unlit glass holds the street's light
 * and the sky's haze.
 */
export const WINDOWS = /* glsl */ `
  vec4 windows(vec2 uv, vec3 params, vec3 world, float enabled) {
    vec2 cell = floor(uv);
    vec2 f = fract(uv);
    float style = floor(params.y * 8.0 + 0.5);
    // The glass in its cell, and how many lights its mullions make: a pair,
    // a tall single, an office's ribbon, a small old one, a curtain wall.
    vec2 m0 = vec2(0.16, 0.22);
    vec2 m1 = vec2(0.84, 0.86);
    float lights = 2.0;
    float office = 0.0;
    if (style > 0.5 && style < 1.5) { m0 = vec2(0.32, 0.14); m1 = vec2(0.68, 0.9); lights = 1.0; }
    else if (style > 1.5 && style < 2.5) { m0 = vec2(0.0, 0.32); m1 = vec2(1.0, 0.78); lights = 3.0; office = 1.0; }
    else if (style > 2.5 && style < 3.5) { m0 = vec2(0.24, 0.3); m1 = vec2(0.6, 0.7); lights = 1.0; }
    else if (style > 3.5) { m0 = vec2(0.04, 0.06); m1 = vec2(0.96, 0.97); lights = 2.0; office = 1.0; }
    vec2 size = (m1 - m0) * vec2(3.2, 3.4);
    vec2 q = (f - m0) / (m1 - m0);
    float pane = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
    float paneArea = (m1.x - m0.x) * (m1.y - m0.y);

    // Rooms, and floors that differ in how many of theirs are lit.
    vec2 seed = params.yz * 17.0;
    float span = 1.0 + floor(hash12(vec2(cell.y, 5.3) + seed) * 3.0);
    vec2 room = vec2(floor(cell.x / span), cell.y);
    float busy = hash12(vec2(cell.y * 1.37, 2.1) + seed);
    float share = office > 0.5 ? mix(0.25, 1.6, step(0.55, busy)) : 0.45 + 1.1 * busy;
    float lit = step(hash12(room + seed + 0.5), params.x * 0.8 * share) * enabled;
    // One room in a hundred and fifty changes its mind now and then.
    float blink = hash12(room * 1.73 + 3.1);
    if (blink > 0.993) lit *= step(0.42, fract(uTime * 0.045 + blink * 17.0));

    float kind = hash12(room + seed + 11.3);
    float hv = hash12(cell + 7.7);
    vec3 warm = vec3(1.0, 0.6, 0.28);
    vec3 cool = vec3(0.66, 0.8, 1.0);
    vec3 wc = mix(cool, warm, smoothstep(0.25, 0.75, params.z + (kind - 0.5) * 0.6));
    if (kind > 0.975) wc = vec3(1.0, 0.22, 0.6);
    else if (kind > 0.955) wc = vec3(0.16, 0.95, 0.85);
    else if (kind > 0.915) wc = vec3(0.32, 0.46, 1.0) * (0.65 + 0.35 * sin(uTime * (4.0 + 7.0 * hv) + hv * 40.0));
    // Behind the glass, a room: the eye's ray runs into a box as wide as the
    // pane, as tall as it and three metres deep, and what it meets (the
    // ceiling with its lamp, the floor, the side walls, the back wall with
    // something against it) is lit as a room is. Worked out in the pane's
    // own metres, the wall's normal and its way along from the derivatives,
    // and which way up the cells run (the kit's run down, glTF's v).
    vec3 dpx = dFdx(world);
    vec3 dpy = dFdy(world);
    vec3 fn = normalize(cross(dpx, dpy));
    vec2 duvx = dFdx(uv);
    vec2 duvy = dFdy(uv);
    float det = duvx.x * duvy.y - duvx.y * duvy.x;
    vec3 ft = (dpx * duvy.y - dpy * duvx.y) * sign(det);
    ft = normalize(vec3(ft.x, 0.0, ft.z) + 1e-5);
    float upSign = dot(vec2(dpx.y, dpy.y), vec2(duvx.y, duvy.y)) >= 0.0 ? 1.0 : -1.0;
    vec3 V = normalize(world - uCam);
    vec3 rd = vec3(dot(V, ft), V.y, max(-dot(V, fn), 1e-3));
    float qy = upSign > 0.0 ? q.y : 1.0 - q.y;
    vec3 rp = vec3(clamp(q.x, 0.0, 1.0) * size.x, clamp(qy, 0.0, 1.0) * size.y, 0.0);
    const float ROOM_D = 3.0;
    float rtx = rd.x > 0.0 ? (size.x - rp.x) / rd.x : -rp.x / min(rd.x, -1e-4);
    float rty = rd.y > 0.0 ? (size.y - rp.y) / rd.y : -rp.y / min(rd.y, -1e-4);
    float rtz = ROOM_D / rd.z;
    float rtm = min(min(rtx, rty), rtz);
    vec3 rh = rp + rd * rtm;
    float shade;
    if (rtm == rtz) {
      // The back wall, and against it a shelf, a picture, a lamp.
      shade = 0.55 + 0.25 * rh.y / size.y;
      float thing = hash12(room + 2.9);
      float band = step(abs(rh.y - size.y * (0.35 + 0.3 * thing)), size.y * 0.12) * step(abs(rh.x / size.x - fract(thing * 5.0)), 0.3);
      shade *= 1.0 - 0.5 * band * step(0.4, thing);
      float lampSpot = exp(-dot(rh.xy - vec2(size.x * fract(thing * 3.0), size.y * 0.45), rh.xy - vec2(size.x * fract(thing * 3.0), size.y * 0.45)) * 3.0);
      shade += lampSpot * step(0.7, thing) * 1.4;
    } else if (rtm == rty) {
      // The ceiling round its lamp, or the floor.
      if (rd.y > 0.0) {
        vec2 c = vec2(rh.x - size.x * 0.5, rh.z - ROOM_D * 0.5);
        shade = 0.7 + 1.6 * exp(-dot(c, c) * 1.2);
      } else {
        shade = 0.22;
      }
    } else {
      shade = 0.42 + 0.2 * rh.y / size.y;
    }
    // Blinds and curtains hang at the glass and hide the room; a curtain
    // glows with the light behind it.
    float blind = step(0.74, hash12(room + 5.1));
    float curtain = (1.0 - office) * step(0.7, hash12(room + 8.9));
    float interior = mix(shade, 0.4 + 0.6 * smoothstep(0.0, 1.0, qy), max(blind, curtain));
    float blinds = mix(1.0, 0.55 + 0.45 * step(0.5, fract(q.y * size.y * 6.0)), blind);
    vec3 lightCol = mix(wc, wc * vec3(1.0, 0.55, 0.4), curtain * 0.6) * mix(1.0, 0.75 + 0.25 * sin(q.x * size.x * 11.0), curtain);
    // Somebody at the window now and then, against the light.
    float stuff = step(qy, 0.62) * step(abs(q.x - 0.25 - 0.5 * hash12(cell + 9.1)), 0.12) * step(0.86, hash12(cell + 4.4)) * (1.0 - curtain) * (1.0 - blind);
    float bright = (0.22 + 0.45 * hv * hv) * interior * blinds * (1.0 - 0.85 * stuff) * (1.0 + 0.2 * uLevel);

    vec3 spill = spillAt(world);
    vec3 glass = vec3(0.01, 0.013, 0.02) + spill * 0.25 + uHazeColor * 0.05 * (0.4 + q.y) * (0.5 + hash12(cell + 1.9));
    vec3 wall = vec3(0.022, 0.023, 0.028) * (0.75 + 0.5 * hash12(cell * 0.31 + 0.7));
    wall = wall * (vec3(0.6) + spill * 3.2);

    // The frame and its bars, 9 cm, only while they are wider than about a
    // pixel.
    float px = max(fwidth(uv.x), fwidth(uv.y));
    float mx = fract(q.x * lights);
    float barX = min(mx, 1.0 - mx) * size.x / lights;
    float barY = min(q.y, 1.0 - q.y) * size.y;
    float transom = office > 0.5 ? 1.0 : abs(q.y - 0.78) * size.y;
    float bar = (1.0 - step(0.045, min(barX, min(barY, transom)))) * (1.0 - smoothstep(0.02, 0.05, px));

    vec3 win = mix(glass, lightCol * bright, lit);
    win = mix(win, wall * 1.4, bar);
    vec3 detail = mix(wall, win, pane);
    // A line of shadow under each floor's edge.
    detail *= mix(1.0, 0.55, step(f.y, 0.045));

    // Past a couple of pixels per window, the cell's average instead of a
    // pattern that shimmers.
    vec3 avg = mix(wall, mix(glass, mix(cool, warm, params.z) * 0.33, params.x * 0.8 * enabled), paneArea);
    float far = smoothstep(0.35, 0.9, px);
    return vec4(mix(detail, avg, far), mix(pane * lit * (1.0 - bar), params.x * 0.8 * paneArea, far));
  }
`;
