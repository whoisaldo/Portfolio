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

  // The city's glow in the air along a direction, at a height: low over
  // the roofs, and strongest toward downtown.
  vec3 cityGlow(vec3 dir, float y) {
    float toward = pow(max(dot(normalize(dir.xz + 1e-5), uGlowDir), 0.0), 3.0);
    return uGlowColor * uHaze * exp(-max(y, 0.0) * 0.0045) * (0.3 + 0.7 * toward);
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
 */
export const WINDOWS = /* glsl */ `
  vec4 windows(vec2 uv, vec3 params, vec3 world, float enabled) {
    vec2 cell = floor(uv);
    vec2 f = fract(uv);
    float style = floor(params.y * 8.0 + 0.5);
    vec2 m0 = vec2(0.16, 0.22);
    vec2 m1 = vec2(0.84, 0.86);
    if (style > 0.5 && style < 1.5) { m0 = vec2(0.32, 0.14); m1 = vec2(0.68, 0.9); }
    else if (style > 1.5 && style < 2.5) { m0 = vec2(0.0, 0.32); m1 = vec2(1.0, 0.78); }
    else if (style > 2.5 && style < 3.5) { m0 = vec2(0.24, 0.3); m1 = vec2(0.6, 0.7); }
    else if (style > 3.5) { m0 = vec2(0.04, 0.06); m1 = vec2(0.96, 0.97); }
    float pane = step(m0.x, f.x) * step(f.x, m1.x) * step(m0.y, f.y) * step(f.y, m1.y);
    float paneArea = (m1.x - m0.x) * (m1.y - m0.y);

    float r = hash12(cell);
    float lit = step(r, params.x * 0.62) * enabled;
    // One window in a hundred and fifty changes its mind now and then.
    float blink = hash12(cell * 1.73 + 3.1);
    if (blink > 0.993) lit *= step(0.42, fract(uTime * 0.045 + blink * 17.0));

    float hv = hash12(cell + 11.3);
    vec3 wc = mix(vec3(0.3, 0.46, 1.0), vec3(1.0, 0.46, 0.16), params.z);
    wc = mix(wc, vec3(1.0, 0.2, 0.6), step(0.93, hv) * 0.85);
    wc = mix(wc, vec3(0.16, 0.95, 0.85), step(0.97, hash12(cell + 2.7)) * 0.8);
    float interior = 0.45 + 0.55 * smoothstep(m0.y, m1.y, f.y);
    float blinds = mix(1.0, 0.55 + 0.45 * step(0.5, fract(f.y * 12.0)), step(0.72, hash12(cell + 5.1)));
    float bright = (0.18 + 0.5 * hv * hv) * interior * blinds * (1.0 + 0.2 * uLevel);

    vec3 spill = spillAt(world);
    vec3 glass = vec3(0.01, 0.013, 0.02) + spill * 0.25;
    vec3 wall = vec3(0.022, 0.023, 0.028) * (0.75 + 0.5 * hash12(cell * 0.31 + 0.7));
    wall = wall * (vec3(0.6) + spill * 3.2);

    vec3 win = mix(glass, wc * bright, lit);
    vec3 detail = mix(wall, win, pane);
    detail *= mix(1.0, 0.55, step(f.y, 0.045));

    // Past a couple of pixels per window, the cell's average instead of a
    // pattern that shimmers.
    float px = max(fwidth(uv.x), fwidth(uv.y));
    vec3 avg = mix(wall, mix(glass, wc * 0.3, params.x * 0.62 * enabled), paneArea);
    float far = smoothstep(0.35, 0.9, px);
    return vec4(mix(detail, avg, far), mix(pane * lit, params.x * paneArea, far));
  }
`;
