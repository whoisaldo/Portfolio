// src/world/glsl.js: the light model every surface in the city shares.
//
// There are no lights in this scene in the three.js sense. A night street is
// lit by its signs, its shopfronts and its windows, and there are hundreds of
// those: a forward renderer looping over hundreds of point lights per pixel
// is not a portfolio's frame budget. So the light is in the geometry itself.
// At load, every emissive triangle in the city (each sign, strip, shopfront
// and lamp) is splatted into a map over the ground plane, a soft pool of its
// own colour around its feet (src/world/spill.js). Every surface samples that
// map at its own position, brightest level with what glows and falling off
// with height, which is how the plate lights its street: pink under the pink
// signs and on the wall beside them, cyan by the cyan ones, and dark above
// the third storey.
//
// Distance does the rest: exponential fog toward a near-black navy, and a
// glow along the horizon where a lit city scatters its light into wet air.
// Emissive surfaces lose less to the fog than lit ones, because a sign 400 m
// up the street still reads as a sign.

import { SPILL_RANGE } from "./spill.js";

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
    uSpillGain: { value: SPILL_RANGE },
    // Night as the show paints it: deep navy in the air, the haze and the
    // lit city's glow navy to teal. Violet and pink are downtown's alone
    // (COMMON's downtown: the air up the avenue and round the hologram),
    // where the plate's street ends.
    uFogColor: { value: new THREE.Color(0x04070e) },
    uHazeColor: { value: new THREE.Color(0x0c2743) },
    uFogDensity: { value: 0.0021 },
    uHaze: { value: 1 },
    uCam: { value: new THREE.Vector3() },
    // The lit city's glow in the wet air.
    uGlowColor: { value: new THREE.Color(0.22, 0.6, 0.9).multiplyScalar(0.27) },
    // Lightning in the cloud (src/world/world-scene.js): how bright, and
    // where over the city it is, on the cloud deck's plane.
    uFlash: { value: 0 },
    uFlashAt: { value: new THREE.Vector2(0, -1200) },
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
  uniform float uFlash;
  uniform vec2 uFlashAt;
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
    vec4 s = texture2D(uSpill, uv);
    float h = max(p.y, 0.0);
    // The map knows how high its light hangs (alpha, sixteenths of a
    // metre): what is level with a sign or a lamp, the wall it is fixed to
    // first, takes more of it than the ground under it or the floors over it.
    float dh = h - s.a * 15.94;
    float level = 0.7 + 1.5 * exp(-dh * dh * 0.22);
    return s.rgb * s.rgb * uSpillGain * (0.25 + 0.75 * exp(-h * 0.085)) * level + doorPool(p) + garageRoom(p);
  }

  // The same light on a wall somebody stands beside. A wall takes more of
  // it level with what throws it and less above and below than the ground
  // rule gives, and what the map holds between two pools counts for less:
  // so a tube or a caged lamp makes a pool on its own wall that falls off
  // up it, down it and along it, and the wall between two lamps is dark.
  vec3 spillWall(vec3 p) {
    vec2 uv = (p.xz - uSpillBounds.xy) * uSpillBounds.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);
    vec4 s = texture2D(uSpill, uv);
    float h = max(p.y, 0.0);
    float dh = h - s.a * 15.94;
    vec3 c = s.rgb * s.rgb;
    c *= mix(0.6, 1.25, smoothstep(0.03, 0.2, max(c.r, max(c.g, c.b))));
    // (And right at its own height, within a stride of it, the wall is
    // lit hard: a tube a hand from a wall is the brightest thing on it.)
    return c * uSpillGain * (0.25 + 0.75 * exp(-h * 0.085)) * (0.5 + 2.2 * exp(-dh * dh * 0.3) + 3.0 * exp(-dh * dh * 1.3)) + doorPool(p) + garageRoom(p);
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

  // Downtown is up the avenue: the megabuilding at its far end and the
  // hologram over it. Its air is violet and pink, as the plate paints it;
  // everywhere else the night is navy and teal. How much of downtown a look
  // along dir takes in from where the eye stands: the whole canyon from the
  // avenue itself, a halo round the hologram from anywhere else.
  // (The avenue is its own 12 m either side of the line, and the halo is a
  // few degrees round the hologram: counted out to 70 m and as wide as a
  // ninth power, every look north from Afterlife and down a Japantown lane
  // was a violet wash, a magenta haze over the road and lanes in purple.)
  float downtownK(float t) {
    float t3 = t * t * t;
    float t9 = t3 * t3 * t3;
    return mix(t9 * t9 * t9 * 0.45, t3, 1.0 - smoothstep(12.0, 30.0, abs(uCam.x)));
  }
  float downtown(vec3 dir) {
    vec2 to = vec2(-8.0, -640.0) - uCam.xz;
    return downtownK(max(dot(normalize(dir.xz + 1e-5), to * inversesqrt(dot(to, to) + 1.0)), 0.0));
  }
  // The haze and the glow along a look: the night's own, downtown's toward it.
  vec3 hazeAt(vec3 dir) {
    return mix(uHazeColor, vec3(0.0137, 0.0103, 0.0723), downtown(dir));
  }
  vec3 glowAt(vec3 dir) {
    return mix(uGlowColor, vec3(0.204, 0.129, 0.323), downtown(dir));
  }

  // Santo Domingo, the industrial edge: how far into it a point of the plan
  // is. Its air is sodium low over the yards, and the sky behind its stacks
  // a lighter teal.
  float santoAt(vec2 p) {
    vec2 d = min(p - vec2(170.0, -176.0), vec2(490.0, 48.0) - p);
    return smoothstep(-40.0, 30.0, min(d.x, d.y));
  }
  const vec3 SODIUM = vec3(0.105, 0.05, 0.014);

  // Where nobody is let near a wall with a can: Corpo Row (its towers, the
  // boulevard at z -330 and both its frontages, and west of the Afterlife
  // block the whole campus south of it, down to its lot line on the plaza
  // street) and Corpo Plaza. Told by the plan's bounds alone, in world
  // metres; 1 inside. A wall there takes a sticker or two and the rain's
  // dirt, and no poster, bill, piece or tag (pass wallMarks and shutterAt a
  // spray under 0).
  float tidy(vec2 p) {
    float row = step(124.0, p.x) * step(p.x, 446.0) * step(-420.0, p.y) * step(p.y, p.x < 384.0 ? -184.0 : -315.5);
    float plaza = step(44.0, p.x) * step(p.x, 134.0) * step(-330.0, p.y) * step(p.y, -180.0);
    return max(row, plaza);
  }

  // The city's glow in the air along a direction, at a height: low over
  // the roofs, and strongest toward downtown.
  vec3 cityGlow(vec3 dir, float y) {
    vec2 to = vec2(-8.0, -640.0) - uCam.xz;
    float t1 = max(dot(normalize(dir.xz + 1e-5), to * inversesqrt(dot(to, to) + 1.0)), 0.0);
    float street = 1.0 - smoothstep(12.0, 30.0, abs(uCam.x));
    float toward = downtownK(t1);
    // Right up the avenue, low on the horizon, downtown burns: a hot core,
    // warmer and whiter, that pulls the eye to the vanishing point.
    float hot = pow(t1, 90.0) * exp(-max(y, 0.0) * 0.1) * (0.3 + 0.7 * street);
    vec3 glow = mix(uGlowColor * 0.3, vec3(0.204, 0.129, 0.323), toward) + vec3(1.0, 0.62, 0.86) * hot * 0.45;
    // Over Santo Domingo, a pale teal band low behind the stacks.
    glow += vec3(0.02, 0.1, 0.115) * santoAt(uCam.xz) * exp(-max(y, 0.0) * 0.02);
    // A flash in the cloud lifts the whole wet air with it, cold.
    glow += vec3(0.5, 0.52, 0.75) * uFlash * 0.12;
    return glow * uHaze * exp(-max(y, 0.0) * 0.0045);
  }

  // Which eyes the round's ground, air and colour are for: every eye but
  // the two page shots whose frames are held as they were, the hero's lens
  // (the only eye under a metre: it fades in from a painted plate) and the
  // Garage section's backdrop while the garage's door stands open (the
  // page's own words are over it). 1 for every other eye.
  float freeEye() {
    return smoothstep(0.7, 1.3, uCam.y) * (1.0 - smoothstep(0.0, 0.2, uDoorLight.w));
  }
  // 1 at the page's rooftop lens (its rooftop and stack-pan shots) and its
  // contact lens, and gone a few metres off: their frames are the towers
  // round Afterlife as they are lit there, held as they were.
  float pageLens() {
    vec3 a = uCam - vec3(476.0, 37.4, -266.0);
    vec3 b = uCam - vec3(456.0, 10.4, -203.0);
    return 1.0 - smoothstep(2.0, 6.0, sqrt(min(dot(a, a), dot(b, b))));
  }

  // Distance: fog into near-black navy close to, and further off into the
  // glow of the lit city hanging in the wet air, so the end of a street is
  // brighter than its middle, as the plate has it. Santo Domingo's own air
  // is thicker and sodium, low over its yards.
  vec3 cityFog(vec3 col, vec3 p, float emissive) {
    vec3 d = p - uCam;
    float dist = length(d);
    // Santo Domingo's sodium air, as much of it as the look passes
    // through (three points along it, each by how low it is): read at the
    // far end alone, everything standing in the district was one orange
    // sheet from the air, with the district's straight edge for its own.
    vec3 m1 = mix(uCam, p, 0.33);
    vec3 m2 = mix(uCam, p, 0.66);
    float santo = (santoAt(p.xz) * exp(-max(p.y, 0.0) * 0.035) + santoAt(m2.xz) * exp(-max(m2.y, 0.0) * 0.035) + santoAt(m1.xz) * exp(-max(m1.y, 0.0) * 0.035)) * 0.3333 * uHaze;
    float f = 1.0 - exp(-dist * uFogDensity * mix(1.0, 0.45, emissive) * (1.0 + 0.8 * santo));
    float low = exp(-max(p.y, 0.0) * 0.01);
    vec3 fogCol = mix(uFogColor, hazeAt(d), uHaze * low * smoothstep(40.0, 360.0, dist));
    fogCol = mix(fogCol, SODIUM, santo * 0.75 * smoothstep(20.0, 200.0, dist));
    if (dist > 120.0) fogCol += cityGlow(d, p.y) * smoothstep(120.0, 900.0, dist);
    // Depth, for every eye but the held ones (freeEye: the hero's air is the
    // page's grade, as it was). The wet air between the towers and down a
    // long street is a veil of a greyed blue over what the fog has left:
    // next to none of it on what stands near, more and more past a block
    // or two, so one layer of the city stands off the next and a far
    // block is paler and less coloured than a near one; what glows keeps
    // more of itself. Not in Santo Domingo's sodium.
    // (Laid on before the fog and in the haze's own bright blue it lit the
    // nearer walls teal and left the far ones as dark and as coloured.)
    float dd = dist * (1.0 / 360.0);
    float deep = (1.0 - exp(-dd * dd)) * exp(-max(p.y, 0.0) * 0.003) * freeEye() * uHaze * mix(1.0, 0.75, emissive) * (1.0 - santo);
    vec3 hz = hazeAt(d);
    vec3 veil = mix(vec3(0.022, 0.045, 0.09), hz * 1.6, downtown(d)) + uGlowColor * 0.08;
    return mix(mix(col, fogCol, f), veil, deep * 0.62);
  }
`;

// The city's props (src/world/props.js) draw the same materials instanced:
// three defines USE_INSTANCING and the instanceMatrix attribute for them.
export const VERT_WORLD = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
    #else
    mat4 m = modelMatrix;
    #endif
    vec4 w = m * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormalW = normalize(mat3(m) * normal);
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
    #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
    #else
    mat4 m = modelMatrix;
    #endif
    vec4 w = m * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormalW = normalize(mat3(m) * normal);
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
  // A building's wall colour (its index in the colour's alpha, see the
  // builder's buildings.TINTS): charcoal, navy, teal-black, plum, brown,
  // concrete, rust, pale. A negative tint is the far city's old charcoal.
  vec3 wallTint(float t) {
    if (t < 0.0) return vec3(0.022, 0.023, 0.028);
    float i = floor(t * 8.0);
    if (i < 0.5) return vec3(0.024, 0.025, 0.03);
    if (i < 1.5) return vec3(0.017, 0.024, 0.05);
    if (i < 2.5) return vec3(0.013, 0.032, 0.036);
    if (i < 3.5) return vec3(0.032, 0.019, 0.036);
    if (i < 4.5) return vec3(0.036, 0.029, 0.023);
    if (i < 5.5) return vec3(0.052, 0.053, 0.058);
    if (i < 6.5) return vec3(0.058, 0.03, 0.017);
    return vec3(0.085, 0.085, 0.09);
  }

  // The signs' light on a tower's face, away from the held lenses: each
  // sign's colour washes the wall at its own height and the storeys under
  // it down to the street, and is gone a few storeys over it. (spillAt keeps
  // a quarter of the street's light all the way up a face, an even fill:
  // every wall was a lit blue or teal plane from its foot to its roof.)
  vec3 facadeWash(vec3 p) {
    vec2 uv = (p.xz - uSpillBounds.xy) * uSpillBounds.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);
    vec4 s = texture2D(uSpill, uv);
    float dh = max(p.y, 0.0) - s.a * 15.94;
    float k = 0.06 + 1.5 * exp(-max(dh, 0.0) * 0.24) * exp(min(dh, 0.0) * 0.06);
    return s.rgb * s.rgb * uSpillGain * k;
  }

  // sys 1 is a districts' or a megablock's own tower (the kit's facade
  // material); the far city calls windowsT, which is sys 0 and as it was.
  vec4 windowsS(vec2 uv, vec3 params, vec3 world, float enabled, float tint, float sys) {
    // A tower has one window scale: its builder's cells run from 0.7 to
    // 4 m wide and 1.7 or 3.4 m tall, so a block of half cells stood on one
    // of whole ones, two buildings glued together. Cells are taken in whole
    // numbers to the nearest 3.2 by 3.4 m.
    // And its own pattern: dealt by its style and warmth alone, every tower
    // that shared them was lit window for window the same. The face's plane
    // and the way it looks are in its seed.
    vec2 bid = vec2(0.0);
    if (sys > 0.5) {
      vec3 qx = dFdx(world);
      vec3 qy = dFdy(world);
      vec2 ux = dFdx(uv);
      vec2 uy = dFdy(uv);
      float dt = ux.x * uy.y - ux.y * uy.x;
      if (abs(dt) > 1e-10) {
        float mu = length(qx * uy.y - qy * ux.y) / abs(dt);
        float mv = length(qy * ux.x - qx * uy.x) / abs(dt);
        float ku = mu < 2.4 ? 1.0 / max(1.0, floor(3.2 / mu + 0.5)) : (mu > 4.8 ? floor(mu / 3.2 + 0.5) : 1.0);
        float kv = mv < 2.6 ? 1.0 / max(1.0, floor(3.4 / mv + 0.5)) : (mv > 5.1 ? floor(mv / 3.4 + 0.5) : 1.0);
        uv *= vec2(ku, kv);
      }
      vec3 fq = normalize(cross(qx, qy) + 1e-7);
      bid = vec2(hash12(vec2(floor(dot(world, fq) * 0.2 + 0.5), floor(fq.x * 1.5 + 1.5) + floor(fq.z * 1.5 + 1.5) * 3.0)), hash12(vec2(params.x * 41.0, 2.7))) * 53.0;
    }
    vec2 cell = floor(uv);
    vec2 f = fract(uv);
    float style = floor(params.y * 8.0 + 0.5);
    // The glass in its cell, and how many lights its mullions make: a pair,
    // a tall single, an office's ribbon, a small old one, a curtain wall, a
    // ribbon band lit a whole floor at a time, a small home's window.
    vec2 m0 = vec2(0.16, 0.22);
    vec2 m1 = vec2(0.84, 0.86);
    float lights = 2.0;
    float office = 0.0;
    float band = 0.0;
    if (style > 0.5 && style < 1.5) { m0 = vec2(0.32, 0.14); m1 = vec2(0.68, 0.9); lights = 1.0; }
    else if (style > 1.5 && style < 2.5) { m0 = vec2(0.0, 0.32); m1 = vec2(1.0, 0.78); lights = 3.0; office = 1.0; }
    else if (style > 2.5 && style < 3.5) { m0 = vec2(0.24, 0.3); m1 = vec2(0.6, 0.7); lights = 1.0; }
    else if (style > 3.5 && style < 4.5) { m0 = vec2(0.04, 0.06); m1 = vec2(0.96, 0.97); lights = 2.0 + sys; office = 1.0; }
    else if (style > 4.5 && style < 5.5) { m0 = vec2(0.0, 0.3); m1 = vec2(1.0, 0.74); lights = 4.0; office = 1.0; band = 1.0; }
    else if (style > 5.5) { m0 = vec2(0.3, 0.34); m1 = vec2(0.7, 0.8); lights = 1.0; }
    // A districts' building is not one module from its foot to its roof:
    // it is stacked in zones of four to seven floors, each with its own
    // cut of the same window (its sill lower or its head higher, wider or
    // narrower in its bay, a light more or fewer), and the floor a zone
    // starts on is a ledge.
    float ledge = 0.0;
    // (A districts' or a megablock's tower seen from anywhere but the held
    // page lenses: freeEye, COMMON, and the rooftop's and the contact
    // section's lenses, whose frames are those towers' lit windows.)
    float fe = sys * freeEye() * (1.0 - pageLens());
    float zIdx = 0.0;
    // (The Megabuilding's blocks are flats, not offices: a dwelling face
    // where the plan's district is the Megabuilding, not a blue curtain
    // wall of office ribbon or glass.)
    bool flats = fe > 0.5 && tint >= 0.0 && office > 0.5 && band < 0.5 && world.x > -94.0 && world.x < 132.0 && world.z > -900.0 && world.z < -560.0;
    if (flats) { m0 = vec2(0.16, 0.22); m1 = vec2(0.84, 0.86); lights = 2.0; office = 0.0; }
    if (tint >= 0.0) {
      vec2 zs = params.yz * 17.0 + bid;
      float zoneH = 4.0 + floor(hash12(zs + 9.1) * 4.0);
      float zf = (cell.y + floor(hash12(zs + 5.5) * zoneH)) / zoneH;
      float zone = hash12(vec2(floor(zf), 12.7) + zs);
      float cut = fract(zone * 7.0);
      zIdx = floor(zf);
      ledge = step(fract(zf) * zoneH, 0.5);
      // (And a zone is not always its tower's own window: one in four is
      // small single windows, one in seven a pair, so no one module runs a
      // tower from its foot to its roof.)
      if (fe > 0.5 && band < 0.5) {
        float alt = fract(zone * 13.7);
        if (alt < 0.26) { m0 = vec2(0.3, 0.34); m1 = vec2(0.7, 0.8); lights = 1.0; }
        else if (alt < 0.4) { m0 = vec2(0.16, 0.22); m1 = vec2(0.84, 0.86); lights = 2.0; }
      }
      if (band < 0.5) {
        m0.y = max(m0.y - 0.1 * step(0.5, zone), 0.08);
        m1.y = min(m1.y + 0.08 * step(0.6, cut), 0.95);
        float grow = (cut - 0.5) * 0.16 * step(0.01, m0.x);
        m0.x = max(m0.x - grow, 0.03);
        m1.x = min(m1.x + grow, 0.97);
        lights = max(1.0, lights + floor(zone * 3.0) - 1.0);
      }
    }
    vec2 size = (m1 - m0) * vec2(3.2, 3.4);
    vec2 q = (f - m0) / (m1 - m0);
    float opening = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
    float paneArea = (m1.x - m0.x) * (m1.y - m0.y);

    // Rooms, and floors that differ in how many of theirs are lit.
    vec2 seed = params.yz * 17.0 + bid;
    float span = 1.0 + floor(hash12(vec2(cell.y, 5.3) + seed) * 3.0);
    // (An office floor of a districts' tower is open plan: a lit unit is
    // three to six bays, not a pane, or a curtain wall is a mosaic.)
    if (sys > 0.5 && office > 0.5) span = 3.0 + floor(hash12(vec2(cell.y, 5.9) + seed) * 4.0);
    vec2 room = vec2(floor(cell.x / span), cell.y);
    float busy = hash12(vec2(cell.y * 1.37, 2.1) + seed);
    float share = office > 0.5 ? mix(0.25, mix(1.6, 1.0, fe), step(0.55, busy)) : 0.45 + 1.1 * busy;
    float lit = step(hash12(room + seed + 0.5), params.x * 0.8 * share) * enabled;
    // A building of the districts (it carries its wall's tint) is not lit
    // room by room at one rate, which is an even speckle on a face seen
    // whole: a floor is lit in runs of four to eight bays and dark between
    // them, one floor in seven is dark right across, and here and there an
    // office has a dozen bays of three floors lit through. On the same
    // floors a bay in every six to nine is the stair's or the riser's and
    // has no window, and one floor in five to seven is plant behind
    // louvres: the grid is broken both ways without a period.
    bool kit = tint >= 0.0;
    float hold = 1.0;
    float block = 0.0;
    float blank = 0.0;
    float plant = 0.0;
    float runId = 0.0;
    if (kit) {
      float zoneW = 4.0 + floor(hash12(vec2(cell.y, 6.1) + seed) * 5.0);
      float zone = floor((cell.x + hash12(vec2(cell.y, 7.3) + seed) * zoneW) / zoneW);
      runId = zone;
      hold = hash12(vec2(zone, cell.y * 1.7) + seed + 3.3) > 0.5 ? 1.75 : 0.25;
      if (busy < 0.14) hold = 0.06;
      // (Its edges stepped floor by floor on a districts' tower: square,
      // a dozen bays by three floors lit through was a glyph on the face.)
      float bx = cell.x + sys * floor(hash12(vec2(cell.y, 2.3) + seed) * 5.0);
      block = step(0.9, hash12(vec2(floor(bx / 12.0), floor(cell.y / 3.0)) + seed + 8.8));
      if (block > 0.5) hold = 3.0;
      // (Away from the held lenses a tower is a dark mass with its rooms lit
      // here and there: a third of its zones' runs are dark, and of the
      // rest about one window in five is lit. Lit at the old rate, three in
      // five, a face was a grid of light from foot to roof.)
      if (fe > 0.5 && block < 0.5 && hash12(vec2(zone, zIdx) + seed + 6.1) < 0.34) hold *= 0.1;
      // (Times 1.5, and its rooms a tenth brighter: the stair bays, the plant floors and the dark floors
      // take a quarter of the windows, and the face is to give the street
      // as much light as it did.)
      lit = step(hash12(room + seed + 0.5), params.x * 0.8 * share * min(hold, mix(3.0, 1.4, fe)) * mix(1.5, 0.45, fe)) * enabled;
      if (band < 0.5) {
        float coreEvery = 6.0 + floor(hash12(seed + 3.3) * 4.0);
        float plantEvery = 5.0 + floor(hash12(seed + 1.1) * 3.0);
        blank = step(mod(cell.x + floor(hash12(seed + 4.4) * coreEvery), coreEvery), 0.5);
        plant = step(mod(cell.y + floor(hash12(seed + 2.2) * plantEvery), plantEvery), 0.5);
        opening *= (1.0 - blank) * (1.0 - plant);
      }
    }
    // A band building's floors are lit right across or not at all.
    // (A districts' tower's band floors are lit in its runs as its other
    // floors are: floor after floor lit right across in two colours was a
    // barcode from across the city.)
    if (band > 0.5 && sys < 0.5) lit = step(0.5 - params.x * 0.35, busy) * step(hash12(room + seed + 0.5), 0.92) * enabled;
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
    // A districts' building has one light, yellow or cyan by its warmth,
    // and the other on a pair of floors in five and in an office's block:
    // ordered bands, as the show paints a tower, where each room mixing its
    // own white, tan, pink or teal was confetti. Rooms differ in level, not
    // hue; one in a hundred is pink and one in fifty a television.
    vec3 house = mix(cool, warm, params.z);
    if (kit) {
      vec3 yellow = vec3(1.0, 0.72, 0.36);
      vec3 cyan = vec3(0.5, 0.88, 1.0);
      bool warmHouse = params.z > 0.5;
      // (On a districts' tower the other light is a tenant's run here and
      // there, not a pair of floors in five: those were the same yellow
      // and cyan bands on every tower.)
      bool other = (sys > 0.5 ? hash12(vec2(runId, cell.y) + seed + 4.2) > 0.86 : hash12(vec2(floor(cell.y / 2.0), 4.2) + seed) > 0.8) || block > 0.5;
      house = warmHouse ? yellow : cyan;
      wc = (warmHouse != other ? yellow : cyan) * (0.85 + 0.3 * hash12(room + 1.9));
      // (A pink room or a television is a home's, not an office floor's.)
      float homes = 1.0 - sys * office;
      if (kind > 1.0 - 0.01 * homes) wc = vec3(1.0, 0.22, 0.6);
      else if (kind > 1.0 - 0.03 * homes) wc = vec3(0.32, 0.46, 1.0) * (0.65 + 0.35 * sin(uTime * (4.0 + 7.0 * hv) + hv * 40.0));
    }
    // Band floors in the city's two colours, amber and cyan, floor by floor.
    vec3 bandCol = mix(vec3(1.0, 0.66, 0.3), vec3(0.3, 0.86, 1.0), step(0.5, hash12(vec2(cell.y, 3.7) + seed)));
    if (band > 0.5 && sys < 0.5) wc = bandCol;
    if (band > 0.5 && sys > 0.5) bandCol = house;
    // The eye's ray in the pane's own frame: x along the wall, y up, z in.
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
    float qy0 = upSign > 0.0 ? q.y : 1.0 - q.y;
    // The glass is set back in the wall, REVEAL deep: where the eye meets
    // the glass plane is further along its ray, and between the wall's
    // opening and the glass it sees the reveal (the jambs, the head, the
    // sill), shaded as wall turned away from the street.
    const float REVEAL = 0.18;
    vec2 sh = rd.xy / rd.z * REVEAL / size;
    float gx = q.x + sh.x;
    float gy = qy0 + sh.y;
    float pane = opening * step(0.0, gx) * step(gx, 1.0) * step(0.0, gy) * step(gy, 1.0);
    float reveal = opening * (1.0 - pane);
    float revealShade = gy < 0.0 ? 1.25 : (gy > 1.0 ? 0.35 : 0.6);
    // Behind the glass, a room: the ray runs on into a box as wide as the
    // pane, as tall as it and three metres deep, and what it meets (the
    // ceiling with its lamp, the floor, the side walls, the back wall with
    // something against it) is lit as a room is.
    vec3 rp = vec3(clamp(gx, 0.0, 1.0) * size.x, clamp(gy, 0.0, 1.0) * size.y, 0.0);
    float qy = clamp(gy, 0.0, 1.0);
    const float ROOM_D = 3.0;
    float rtx = rd.x > 0.0 ? (size.x - rp.x) / rd.x : -rp.x / min(rd.x, -1e-4);
    float rty = rd.y > 0.0 ? (size.y - rp.y) / rd.y : -rp.y / min(rd.y, -1e-4);
    float rtz = ROOM_D / rd.z;
    float rtm = min(min(rtx, rty), rtz);
    vec3 rh = rp + rd * rtm;
    float shade;
    if (rtm == rtz) {
      // The back wall: a shadow where it meets the ceiling, a skirting at
      // its foot, and in it a door in its frame, or against it shelves
      // with what is kept on them; a lamp.
      shade = 0.55 + 0.25 * rh.y / size.y;
      float thing = hash12(room + 2.9);
      vec2 b = rh.xy / size;
      shade *= 1.0 - 0.3 * step(0.93, b.y) - 0.25 * step(b.y, 0.05);
      if (thing < 0.4) {
        float dx = abs(b.x - 0.25 - 0.5 * fract(thing * 9.0)) * size.x;
        shade *= 1.0 - 0.45 * step(dx, 0.42) * step(b.y, 0.8);
        shade *= 1.0 + 0.5 * step(abs(dx - 0.46), 0.04) * step(b.y, 0.83) + 0.5 * step(abs(b.y - 0.815), 0.015) * step(dx, 0.5);
      } else if (thing < 0.78) {
        vec2 sx = vec2(b.x - fract(thing * 5.0) * 0.5 - 0.05, b.y - 0.08) * size;
        if (sx.x > 0.0 && sx.x < 0.45 * size.x && sx.y > 0.0 && sx.y < 0.7 * size.y) {
          float item = step(0.35, hash12(floor(sx / vec2(0.14, 0.38)) + room));
          shade *= mix(0.5 + 0.45 * item, 0.3, step(fract(sx.y / 0.38), 0.12));
        }
      }
      float lampSpot = exp(-dot(rh.xy - vec2(size.x * fract(thing * 3.0), size.y * 0.45), rh.xy - vec2(size.x * fract(thing * 3.0), size.y * 0.45)) * 3.0);
      shade += lampSpot * step(0.7, thing) * 1.4;
    } else if (rtm == rty) {
      // The ceiling round its lamp, or the floor.
      if (rd.y > 0.0) {
        // (An office's is rows of panels, a home's one lamp.)
        vec2 c = vec2(rh.x - size.x * 0.5, rh.z - ROOM_D * 0.5);
        shade = office > 0.5 ? 0.6 + 1.1 * step(abs(fract(rh.z / 1.5) - 0.5), 0.22) : 0.7 + 1.6 * exp(-dot(c, c) * 1.2);
      } else {
        shade = 0.22;
      }
    } else {
      shade = 0.42 + 0.2 * rh.y / size.y;
    }
    if (band > 0.5) shade = mix(0.85 + 0.3 * qy, shade, 0.4);
    // Blinds and curtains hang at the glass and hide the room: a blind as
    // far down as it was left, a curtain drawn right across or back to the
    // sides; a curtain glows with the light behind it.
    // (Nothing hangs in a window too far off to see into: its slats were
    // a moire and its lit cloth a pale grey tile, daylit blinds on a night
    // tower. From there a lit window is flat glass in the house's light.)
    float flatK = smoothstep(0.03, 0.09, max(fwidth(uv.x), fwidth(uv.y)));
    wc = mix(wc, (params.z > 0.5 ? vec3(1.0, 0.72, 0.36) : vec3(0.5, 0.88, 1.0)) * (0.85 + 0.3 * hash12(room + 1.9)), flatK * (1.0 - band));
    float hb = hash12(room + 5.1);
    float blind = step(0.64, hb) * (1.0 - band) * step(0.9 - fract(hb * 37.0), qy) * (1.0 - flatK);
    float hc = hash12(room + 8.9);
    float curtain = (1.0 - office) * step(0.7, hc) * step(0.3 * step(0.5, fract(hc * 23.0)), abs(gx - 0.5)) * (1.0 - flatK);
    float interior = mix(mix(shade, 0.4 + 0.6 * smoothstep(0.0, 1.0, qy), max(blind, curtain)), 0.7, flatK);
    float blinds = mix(1.0, 0.55 + 0.45 * step(0.5, fract(qy * size.y * 6.0)), blind);
    vec3 lightCol = mix(wc, wc * vec3(1.0, 0.55, 0.4), curtain * 0.6) * mix(1.0, 0.75 + 0.25 * sin(gx * size.x * 11.0), curtain);
    // Somebody at the window now and then, against the light.
    float stuff = step(qy, 0.62) * step(abs(gx - 0.25 - 0.5 * hash12(cell + 9.1)), 0.12) * step(0.86, hash12(cell + 4.4)) * (1.0 - curtain) * (1.0 - blind);
    float bright = (0.22 + 0.45 * hv * hv) * interior * blinds * (1.0 - 0.85 * stuff) * (1.0 + 0.2 * uLevel);
    if (band > 0.5) bright = 0.5 * interior;
    if (kit) bright *= 1.1;

    vec3 spill = spillAt(world);
    // (Away from the held lenses: the wall's fill under half and the signs'
    // light where they hang, so what no sign reaches is near-black navy,
    // and its dark glass as dark: the grid of unlit windows held the haze
    // and drew the module over the whole face.)
    // (And the wash is pools: a dim one is cut more than a bright one, so
    // the wall between two signs is dark and not an even fill of all the
    // street's light.)
    vec3 fw = facadeWash(world);
    fw *= smoothstep(0.04, 0.5, max(fw.r, max(fw.g, fw.b))) * 0.75;
    if (fe > 0.0) spill = mix(spill, fw, fe);
    // (Unlit glass of a districts' tower varies by its run, not pane by
    // pane: a curtain wall's dark cells each their own tone were tiles.)
    vec3 glass = vec3(0.01, 0.013, 0.02) * (1.0 - 0.35 * fe) + spill * 0.25 + uHazeColor * 0.05 * (1.0 - 0.6 * fe) * (0.4 + qy) * (0.5 + hash12(mix(cell, vec2(runId, cell.y), sys) + 1.9));
    vec3 wall = wallTint(tint) * (0.75 + 0.5 * hash12(cell * 0.31 + 0.7));
    // (A sign's light on the wall is the sign's colour: the wall's tint is
    // for what the night lights, greyed under the signs, or a teal wall
    // under the street's white was a teal plane.)
    wall = wall * vec3(0.6 - 0.36 * fe) + mix(wall, vec3(dot(wall, vec3(0.2126, 0.7152, 0.0722)) * 1.1), 0.6 * fe) * spill * 3.2;

    // The frame and its bars, 9 cm, only while they are wider than about a
    // pixel.
    float px = max(fwidth(uv.x), fwidth(uv.y));
    float mx = fract(gx * lights);
    float barX = min(mx, 1.0 - mx) * size.x / lights;
    float barY = min(gy, 1.0 - gy) * size.y;
    float transom = office > 0.5 ? 1.0 : abs(gy - 0.78) * size.y;
    float bar = (1.0 - step(0.045, min(barX, min(barY, transom)))) * (1.0 - smoothstep(0.02, 0.05, px));

    vec3 win = mix(glass, lightCol * bright, lit);
    win = mix(win, wall * 1.4, bar);
    vec3 detail = mix(wall, win, pane);
    detail = mix(detail, wall * revealShade, reveal * (1.0 - smoothstep(0.02, 0.06, px)));
    if (kit) {
      // The plant floor: a run of louvres between the bays' posts, a pipe
      // along its foot. The stair's bay: a recess the height of the floor
      // with a slot of wired glass, lit on one floor in three, and a
      // downpipe beside it with its shadow.
      float near = 1.0 - smoothstep(0.02, 0.07, px);
      float slat = step(0.24, f.y) * step(f.y, 0.8) * step(0.06, f.x) * step(f.x, 0.94);
      vec3 louvre = wall * mix(0.6, 0.25 + 0.9 * step(0.55, fract(f.y * 12.0)), near);
      louvre = mix(louvre, wall * 1.5, step(abs(f.y - 0.14), 0.03) * near);
      detail = mix(detail, mix(wall, louvre, slat), plant);
      float recess = step(0.3, f.x) * step(f.x, 0.7);
      float slot = step(abs(f.x - 0.5), 0.07) * step(0.2, f.y) * step(f.y, 0.85);
      float stairLit = step(0.66, hash12(cell + seed + 6.6)) * enabled;
      vec3 core = mix(wall, wall * 0.55, recess);
      core = mix(core, mix(glass, house * 0.22, stairLit), slot * near);
      core *= 1.0 - 0.5 * step(abs(f.x - 0.86), 0.025) * near;
      core = mix(core, wall * 1.5, step(abs(f.x - 0.9), 0.012) * near);
      detail = mix(detail, core, blank * (1.0 - plant));
      // A home's face away from the held lenses shows who lives there: an
      // air conditioner hung under one window in four, its grille and its
      // fan; a zone in three of balconies, a rail across each bay's foot and
      // the slab's lit lip; and on one balcony in five the washing out.
      if (fe > 0.5 && office < 0.5 && band < 0.5 && near > 0.0 && plant < 0.5 && blank < 0.5) {
        vec3 lightW = vec3(0.22) + spill * 2.6;
        float hA = hash12(cell * 1.31 + seed + 2.7);
        vec2 ac = vec2((f.x - (hA < 0.13 ? 0.6 : 0.1)) * 3.2, (f.y - 0.015) * 3.4);
        if (hA < 0.26 && ac.x > 0.0 && ac.x < 0.84 && ac.y > 0.0 && ac.y < 0.58) {
          vec3 unit = vec3(0.13, 0.135, 0.14) * lightW;
          unit *= 1.0 - 0.45 * step(fract(ac.y / 0.06), 0.3) * step(ac.x, 0.42);
          float fan = length(ac - vec2(0.62, 0.29));
          unit *= 1.0 - 0.7 * step(fan, 0.17) + 0.4 * step(fan, 0.04);
          unit *= 1.0 - 0.4 * (step(ac.x, 0.025) + step(0.815, ac.x) + step(ac.y, 0.025));
          detail = mix(detail, unit, near);
        }
        float balc = step(hash12(vec2(zIdx, 4.4) + seed), 0.33);
        if (balc > 0.5 && f.y < 0.33) {
          float rail = step(abs(f.y - 0.3), 0.012) + step(fract(f.x * 3.2 / 0.13), 0.22) * step(0.035, f.y) * step(f.y, 0.3);
          float lip = step(f.y, 0.035);
          vec3 metal = vec3(0.04, 0.042, 0.048) * lightW * 1.6;
          detail = mix(detail, metal, clamp(rail, 0.0, 1.0) * near);
          detail = mix(detail, wall * 1.9, lip * near);
        }
        float hL = hash12(cell * 0.77 + seed + 8.3);
        if (balc > 0.5 && hL < 0.2 && f.y > 0.36 && f.y < 0.63 && f.x > 0.12 && f.x < 0.88) {
          float pk = floor((f.x - 0.12) / 0.152);
          float hp = hash12(vec2(pk, hL * 91.0));
          float drop = 0.63 - (0.1 + 0.14 * hp);
          float cloth = step(drop, f.y) * step(0.12, fract((f.x - 0.12) / 0.152)) * step(0.3, hp);
          vec3 dye = hp < 0.5 ? vec3(0.5, 0.12, 0.1) : (hp < 0.65 ? vec3(0.55, 0.5, 0.42) : (hp < 0.8 ? vec3(0.1, 0.22, 0.45) : vec3(0.42, 0.36, 0.08)));
          vec3 behind = lit * lightCol * bright * 0.5;
          detail = mix(detail, dye * (lightW * 0.35 + behind), cloth * near);
          detail = mix(detail, vec3(0.05, 0.052, 0.058) * lightW, step(abs(f.y - 0.63), 0.006) * near);
        }
      }
    }
    // (Away from the held lenses, the rain has run down from each sill: a
    // few dark streaks under every window, each its own length.)
    if (kit && fe > 0.5 && px < 0.06 && f.y < m0.y && f.x > m0.x && f.x < m1.x && blank < 0.5 && plant < 0.5) {
      float sx = floor(f.x * 3.2 / 0.11);
      float hs = hash12(vec2(sx, cell.x * 3.1 + cell.y * 7.7) + seed);
      float len = (0.15 + 0.55 * fract(hs * 13.0)) / 3.4;
      float run = step(0.55, hs) * smoothstep(m0.y - len, m0.y, f.y) * (1.0 - smoothstep(0.02, 0.06, px));
      detail *= 1.0 - 0.45 * run;
    }
    // A line of shadow under each floor's edge, and a zone's first floor
    // stands on a ledge: its lit top edge and the shadow it throws down.
    detail *= mix(1.0, 0.55, step(f.y, 0.045));
    detail = mix(detail, wall * 2.2, ledge * step(abs(f.y - 0.09), 0.035) * (1.0 - smoothstep(0.02, 0.08, px)));
    detail *= 1.0 - 0.45 * ledge * step(f.y, 0.055);

    // Far off, a cell is too small to draw: seen square on, its average; seen
    // along the street (the cells crushed across, not up), each floor's
    // average instead, a band of the floor's light between the wall's, which
    // is how a street of windows reads at a glance.
    float pxX = fwidth(uv.x);
    float pxY = fwidth(uv.y);
    float floorLit = clamp(band > 0.5 && sys < 0.5 ? step(0.5 - params.x * 0.35, busy) * 0.92 : params.x * 0.8 * share * (kit ? (busy < 0.14 ? 0.08 : 1.25) : 1.0) * (1.0 - plant), 0.0, 1.0) * enabled * (1.0 - 0.55 * fe);
    // (Away from the held lenses a floor seen along the street keeps its
    // runs, lit and dark, four to eight bays each: one even band of the
    // floor's average light, floor over floor, was a smeared picture of a
    // tower's face from a car on the avenue.)
    if (kit && fe > 0.5) floorLit *= min(hold, 1.6) * (0.75 + 0.5 * hash12(vec2(runId, cell.y) + seed + 5.7));
    vec3 floorLight = (band > 0.5 ? bandCol * 0.5 : house * 0.36) * floorLit;
    float row = smoothstep(m0.y - pxY, m0.y + pxY, f.y) * (1.0 - smoothstep(m1.y - pxY, m1.y + pxY, f.y));
    vec3 rowCol = mix(wall, mix(glass, floorLight, min(1.0, floorLit * 1.2)), row * (m1.x - m0.x));
    vec3 avg = mix(wall, mix(glass, house * 0.33, params.x * 0.8 * enabled * (1.0 - 0.55 * fe)), paneArea);
    float farX = smoothstep(0.35, 0.9, pxX);
    float farY = smoothstep(0.35, 0.9, pxY);
    vec3 col = mix(mix(detail, rowCol, farX), avg, farY);
    float glow = mix(mix(pane * lit * (1.0 - bar), row * (m1.x - m0.x) * floorLit, farX), params.x * 0.8 * paneArea, farY);
    return vec4(col, glow);
  }

  vec4 windowsT(vec2 uv, vec3 params, vec3 world, float enabled, float tint) {
    return windowsS(uv, params, world, enabled, tint, 0.0);
  }

  vec4 windows(vec2 uv, vec3 params, vec3 world, float enabled) {
    return windowsT(uv, params, world, enabled, -1.0);
  }
`;
