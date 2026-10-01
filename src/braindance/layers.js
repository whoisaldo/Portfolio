// src/braindance/layers.js: the braindance editor's layers, as one effect.
//
// A braindance is edited in layers: what was seen, what was heard, what
// was hot. Here they are one postprocessing effect at the end of the
// city's chain (src/world/post.js takes it as an extra), which rebuilds
// every pixel's position in the world from the depth buffer and then:
//
//   visual    the city as it is, with the clues of this layer lit where
//             they stand: a box in the world tints what is inside it, with
//             a bright rim where its surface meets the box's edge and
//             scanlines climbing it.
//   audio     the picture drained to a dark teal, and rings running out
//             across every surface from each sound source, like sonar.
//   thermal   a heat palette: everything starts cold, lit surfaces a little
//             warmer, and the heat sources (the engine, the exhaust, the
//             brakes, the driver, the vents) glow where they stand.
//
// Two waves move through the world: the reconstruction, which builds the
// city outward from a point when the braindance starts (beyond it, only a
// faint survey grid on the surfaces), and the switch, which carries a new
// layer out from the camera when the layer changes. Rewinding tints the
// frame and drags tracking lines through it; pausing greys it a little,
// as an editor holding a frame does.
import * as THREE from "three";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";

export const MAX_SOURCES = 16;
export const MAX_CLUES = 8;

export const LAYER_COLORS = {
  visual: new THREE.Color("#fcee0a"),
  audio: new THREE.Color("#2ee6c8"),
  thermal: new THREE.Color("#ff3a2a"),
};
export const LAYERS = ["visual", "audio", "thermal"];

const FRAG = /* glsl */ `
  uniform mat4 uProjInv;
  uniform mat4 uCamWorld;
  uniform vec3 uCamPos;
  uniform vec3 uMode;
  uniform vec3 uPrevMode;
  uniform vec4 uSwitch;      // xyz origin, w radius (< 0: done)
  uniform vec4 uWave;        // xyz origin, w radius (reconstruction)
  uniform float uWaveOn;
  uniform vec3 uWaveColor;
  uniform vec4 uHeat[${MAX_SOURCES}];   // xyz, radius
  uniform float uHeatK[${MAX_SOURCES}];
  uniform vec4 uSound[${MAX_SOURCES}];  // xyz, radius
  uniform float uSoundK[${MAX_SOURCES}];
  uniform vec3 uClueMin[${MAX_CLUES}];
  uniform vec3 uClueMax[${MAX_CLUES}];
  uniform vec2 uClueK[${MAX_CLUES}];    // strength, hover
  uniform vec3 uClueColor[${MAX_CLUES}];
  uniform float uRewind;
  uniform float uPaused;
  uniform float uClock;
  uniform float uFilter;     // photo mode: 0 off, 1 noir, 2 neon, 3 film
  uniform float uOverdrive;
  uniform float uBassK;

  float bdh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  vec3 heatRamp(float h) {
    h = clamp(h, 0.0, 1.25);
    vec3 c0 = vec3(0.012, 0.01, 0.05);
    vec3 c1 = vec3(0.10, 0.03, 0.34);
    vec3 c2 = vec3(0.52, 0.03, 0.42);
    vec3 c3 = vec3(0.98, 0.20, 0.06);
    vec3 c4 = vec3(1.0, 0.78, 0.16);
    vec3 c5 = vec3(1.0, 1.0, 0.92);
    vec3 c = mix(c0, c1, smoothstep(0.0, 0.22, h));
    c = mix(c, c2, smoothstep(0.22, 0.45, h));
    c = mix(c, c3, smoothstep(0.45, 0.66, h));
    c = mix(c, c4, smoothstep(0.66, 0.86, h));
    c = mix(c, c5, smoothstep(0.86, 1.15, h));
    return c;
  }

  float boxDist(vec3 p, vec3 lo, vec3 hi) {
    vec3 c = (lo + hi) * 0.5;
    vec3 h = (hi - lo) * 0.5;
    vec3 q = abs(p - c) - h;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  // Grey that the picture is read through, kept in the linear light the
  // chain works in.
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    vec3 col = inputColor.rgb;
    bool sky = depth >= 0.99999;
    vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 view = uProjInv * ndc;
    view /= view.w;
    vec3 world = (uCamWorld * vec4(view.xyz, 1.0)).xyz;
    float camDist = sky ? 4000.0 : length(world - uCamPos);
    float lum = luma(col);

    // ---- thermal ----
    float heat = sky ? 0.02 : 0.08 + 0.42 * sqrt(clamp(lum, 0.0, 1.6)) * 0.8;
    heat *= mix(1.0, 0.45, smoothstep(60.0, 700.0, camDist));
    if (!sky) {
      for (int i = 0; i < ${MAX_SOURCES}; i++) {
        if (uHeatK[i] <= 0.0) continue;
        vec3 d = world - uHeat[i].xyz;
        float r = uHeat[i].w;
        heat += uHeatK[i] * exp(-dot(d, d) / (r * r));
      }
    }
    // A thermal camera's sensor: coarse bands and a little grain.
    float grain = bdh(uv * 900.0 + floor(uClock * 30.0)) - 0.5;
    float banded = floor((heat + grain * 0.025) * 18.0) / 18.0;
    vec3 thermal = heatRamp(mix(heat, banded, 0.55));
    thermal = pow(thermal, vec3(2.2)) * 1.25;

    // ---- audio ----
    vec3 teal = vec3(0.10, 0.85, 0.75);
    vec3 audio = vec3(lum) * vec3(0.10, 0.30, 0.32) * 0.9;
    if (!sky) {
      for (int i = 0; i < ${MAX_SOURCES}; i++) {
        if (uSoundK[i] <= 0.0) continue;
        float r = length(world - uSound[i].xyz);
        float reach = uSound[i].w;
        float fall = exp(-r / reach) * uSoundK[i];
        float wave = sin(r * 1.35 - uClock * 7.0);
        float ring = smoothstep(0.86, 1.0, wave) * fall;
        audio += teal * (ring * 1.6 + fall * 0.12);
      }
    }

    // ---- which layer, where: the switch wave carries the new one out ----
    vec3 mode = uMode;
    float front = 0.0;
    if (uSwitch.w >= 0.0) {
      float r = sky ? 3000.0 : length(world - uSwitch.xyz);
      float edge = uSwitch.w - r;
      mode = edge > 0.0 ? uMode : uPrevMode;
      front = smoothstep(6.0, 0.0, abs(edge)) * (1.0 - smoothstep(300.0, 900.0, uSwitch.w));
    }
    vec3 outCol = col * mode.x + audio * mode.y + thermal * mode.z;
    vec3 layerTint = vec3(0.99, 0.93, 0.04) * mode.x + teal * mode.y + vec3(1.0, 0.23, 0.16) * mode.z;
    outCol += layerTint * front * 1.6;

    // ---- clues ----
    // Inside a clue's box: a faint fill, scanlines climbing it, and the
    // object's own outline, found where the depth jumps between this pixel
    // and a neighbour (a scanner's silhouette). The fill grows under the
    // pointer and with the scan's charge.
    if (!sky) {
      float best = 0.0;
      float hov = 0.0;
      vec3 cc = vec3(0.0);
      for (int i = 0; i < ${MAX_CLUES}; i++) {
        float k = uClueK[i].x;
        if (k <= 0.0) continue;
        float sd = boxDist(world, uClueMin[i], uClueMax[i]);
        float inside = (1.0 - smoothstep(-0.06, 0.0, sd)) * k;
        if (inside > best) {
          best = inside;
          hov = uClueK[i].y;
          cc = uClueColor[i];
        }
      }
      if (best > 0.0) {
        float z0 = -getViewZ(depth);
        float zx = -getViewZ(readDepth(uv + vec2(texelSize.x * 1.5, 0.0)));
        float zy = -getViewZ(readDepth(uv + vec2(0.0, texelSize.y * 1.5)));
        float zx2 = -getViewZ(readDepth(uv - vec2(texelSize.x * 1.5, 0.0)));
        float zy2 = -getViewZ(readDepth(uv - vec2(0.0, texelSize.y * 1.5)));
        float jump = max(max(zx, zy), max(zx2, zy2)) - z0;
        float edge = smoothstep(0.04, 0.12, jump / max(z0, 0.5));
        float climb = smoothstep(0.92, 1.0, fract(world.y * 0.8 - uClock * 0.5));
        float h = min(hov, 1.0);
        float charge = max(hov - 1.0, 0.0);
        float fill = 0.05 + 0.09 * h + 0.2 * charge;
        outCol = mix(outCol, cc * (0.25 + 1.3 * luma(outCol)), best * fill);
        outCol += cc * best * (edge * (1.3 + 0.9 * h) + climb * (0.05 + 0.12 * h));
      }
    }

    // ---- the reconstruction ----
    if (uWaveOn > 0.0) {
      float r = sky ? 2800.0 : length(world - uWave.xyz);
      float edge = uWave.w - r;
      float built = smoothstep(-0.4, 0.8 + uWave.w * 0.01, edge);
      // Beyond the front: the survey grid on every surface, fading out.
      vec3 g = abs(fract(world * 0.5) - 0.5);
      float line = sky ? 0.0 : 1.0 - smoothstep(0.0, 0.035, min(g.x, min(g.y, g.z)));
      float fade = exp(-max(0.0, -edge) / 90.0);
      vec3 survey = uWaveColor * line * 0.22 * fade;
      float bw = 0.6 + uWave.w * 0.012;
      vec3 band = uWaveColor * smoothstep(bw, 0.0, abs(edge)) * 0.9;
      outCol = mix(survey, outCol, mix(1.0, built, uWaveOn)) + band * uWaveOn * (sky ? 0.0 : 1.0);
    }

    // ---- the editor's state ----
    if (uPaused > 0.0) {
      float l = luma(outCol);
      outCol = mix(outCol, vec3(l) * vec3(0.92, 0.96, 1.05), 0.28 * uPaused);
    }
    if (uRewind > 0.0) {
      float band = step(0.94, fract(uv.y * 3.0 + uClock * 1.7));
      float roll = step(0.995, bdh(vec2(floor(uv.y * 120.0), floor(uClock * 24.0))));
      outCol = mix(outCol, outCol * vec3(0.75, 0.55, 1.25), 0.35 * uRewind);
      outCol += vec3(0.6, 0.2, 0.9) * (band * 0.10 + roll * 0.5) * uRewind;
    }
    // ---- photo mode's filters ----
    if (uFilter > 0.5 && uFilter < 1.5) {
      float l = luma(outCol);
      l = smoothstep(0.0, 0.9, l);
      outCol = vec3(pow(l, 1.15)) * vec3(1.0, 0.98, 0.95);
    } else if (uFilter > 1.5 && uFilter < 2.5) {
      float l = luma(outCol);
      vec3 lo = vec3(0.10, 0.02, 0.22);
      vec3 hi = vec3(0.15, 0.95, 0.90);
      outCol = mix(outCol, mix(lo, hi, smoothstep(0.0, 0.7, l)) * (0.6 + l), 0.65) + vec3(0.9, 0.1, 0.6) * smoothstep(0.6, 1.4, l) * 0.4;
    } else if (uFilter > 2.5) {
      float g = bdh(uv * 1300.0 + uClock) - 0.5;
      outCol = outCol * vec3(1.08, 0.98, 0.86) + g * 0.035;
      vec2 q = uv - 0.5;
      outCol *= 1.0 - dot(q, q) * 1.1;
    }
    // ---- overdrive: the Konami code ----
    if (uOverdrive > 0.0) {
      float a = uClock * 1.7 + uv.x * 2.0 + uBassK * 2.5;
      vec3 k = vec3(0.57735);
      float c = cos(a);
      float sn = sin(a);
      vec3 rot = outCol * c + cross(k, outCol) * sn + k * dot(k, outCol) * (1.0 - c);
      outCol = mix(outCol, rot * (1.0 + uBassK * 0.6), uOverdrive * 0.75);
    }
    outputColor = vec4(outCol, inputColor.a);
  }
`;

export class LayerEffect extends Effect {
  constructor() {
    const v3 = () => new THREE.Vector3();
    super("BraindanceLayers", FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ["uProjInv", new THREE.Uniform(new THREE.Matrix4())],
        ["uCamWorld", new THREE.Uniform(new THREE.Matrix4())],
        ["uCamPos", new THREE.Uniform(v3())],
        ["uMode", new THREE.Uniform(new THREE.Vector3(1, 0, 0))],
        ["uPrevMode", new THREE.Uniform(new THREE.Vector3(1, 0, 0))],
        ["uSwitch", new THREE.Uniform(new THREE.Vector4(0, 0, 0, -1))],
        ["uWave", new THREE.Uniform(new THREE.Vector4(0, 0, 0, 0))],
        ["uWaveOn", new THREE.Uniform(0)],
        ["uWaveColor", new THREE.Uniform(new THREE.Color("#fcee0a"))],
        ["uHeat", new THREE.Uniform(Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4()))],
        ["uHeatK", new THREE.Uniform(new Float32Array(MAX_SOURCES))],
        ["uSound", new THREE.Uniform(Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4()))],
        ["uSoundK", new THREE.Uniform(new Float32Array(MAX_SOURCES))],
        ["uClueMin", new THREE.Uniform(Array.from({ length: MAX_CLUES }, v3))],
        ["uClueMax", new THREE.Uniform(Array.from({ length: MAX_CLUES }, v3))],
        ["uClueK", new THREE.Uniform(Array.from({ length: MAX_CLUES }, () => new THREE.Vector2()))],
        ["uClueColor", new THREE.Uniform(Array.from({ length: MAX_CLUES }, () => new THREE.Color()))],
        ["uRewind", new THREE.Uniform(0)],
        ["uPaused", new THREE.Uniform(0)],
        ["uClock", new THREE.Uniform(0)],
        ["uFilter", new THREE.Uniform(0)],
        ["uOverdrive", new THREE.Uniform(0)],
        ["uBassK", new THREE.Uniform(0)],
      ]),
    });
    this.camera = null;
  }

  /** The camera's matrices as this frame has them: the city places its
   *  camera inside its own render call, just before the chain runs. */
  update() {
    const camera = this.camera;
    if (!camera) return;
    camera.updateMatrixWorld();
    this.uniforms.get("uProjInv").value.copy(camera.projectionMatrixInverse);
    this.uniforms.get("uCamWorld").value.copy(camera.matrixWorld);
    this.uniforms.get("uCamPos").value.copy(camera.position);
  }
}

const ONE_HOT = {
  visual: new THREE.Vector3(1, 0, 0),
  audio: new THREE.Vector3(0, 1, 0),
  thermal: new THREE.Vector3(0, 0, 1),
};

/** The effect and the handful of things the engine says to it a frame. */
export function createLayers() {
  const effect = new LayerEffect();
  const u = (name) => effect.uniforms.get(name);
  let layer = "visual";
  let switchR = -1;
  let switchFrom = null;
  const state = { rewind: 0, paused: 0, clock: 0 };

  return {
    effect,
    get layer() {
      return layer;
    },
    /** Change layer, the new one carried out from `origin` by a wave. */
    setLayer(next, origin) {
      if (next === layer) return;
      u("uPrevMode").value.copy(ONE_HOT[layer]);
      u("uMode").value.copy(ONE_HOT[next]);
      layer = next;
      switchR = 0;
      switchFrom = origin.clone();
      u("uSwitch").value.set(origin.x, origin.y, origin.z, 0);
    },
    /** The reconstruction: radius in metres around `origin`, or off. */
    setWave(origin, radius, on, color = LAYER_COLORS.visual) {
      u("uWaveOn").value = on;
      if (origin) u("uWave").value.set(origin.x, origin.y, origin.z, radius);
      u("uWaveColor").value.copy(color);
    },
    setHeat(list) {
      const pos = u("uHeat").value;
      const k = u("uHeatK").value;
      for (let i = 0; i < MAX_SOURCES; i++) {
        const s = list[i];
        if (!s) {
          k[i] = 0;
          continue;
        }
        pos[i].set(s.x, s.y, s.z, s.r);
        k[i] = s.k;
      }
    },
    setSound(list) {
      const pos = u("uSound").value;
      const k = u("uSoundK").value;
      for (let i = 0; i < MAX_SOURCES; i++) {
        const s = list[i];
        if (!s) {
          k[i] = 0;
          continue;
        }
        pos[i].set(s.x, s.y, s.z, s.r);
        k[i] = s.k;
      }
    },
    /** Up to MAX_CLUES boxes: { min, max, k, hover, color }. */
    setClues(list) {
      const lo = u("uClueMin").value;
      const hi = u("uClueMax").value;
      const kk = u("uClueK").value;
      const cc = u("uClueColor").value;
      for (let i = 0; i < MAX_CLUES; i++) {
        const c = list[i];
        if (!c) {
          kk[i].set(0, 0);
          continue;
        }
        lo[i].copy(c.min);
        hi[i].copy(c.max);
        kk[i].set(c.k, c.hover);
        cc[i].copy(c.color);
      }
    },
    /** Photo mode's filter: "off" | "noir" | "neon" | "film". */
    setFilter(name) {
      u("uFilter").value = { off: 0, noir: 1, neon: 2, film: 3 }[name] ?? 0;
    },
    setOverdrive(on, bass = 0) {
      const v = u("uOverdrive");
      v.value += ((on ? 1 : 0) - v.value) * 0.08;
      u("uBassK").value = bass;
    },
    setCamera(camera) {
      effect.camera = camera;
    },
    /** Once a frame, before the city draws. */
    update(dt, { rewind = 0, paused = 0 } = {}) {
      state.clock += dt;
      state.rewind += (rewind - state.rewind) * Math.min(1, dt * 8);
      state.paused += (paused - state.paused) * Math.min(1, dt * 6);
      u("uClock").value = state.clock;
      u("uRewind").value = state.rewind;
      u("uPaused").value = state.paused;
      if (switchR >= 0) {
        switchR += dt * (120 + switchR * 2.2);
        u("uSwitch").value.w = switchR;
        if (switchR > 1600) {
          switchR = -1;
          u("uSwitch").value.w = -1;
          u("uPrevMode").value.copy(ONE_HOT[layer]);
        }
      }
      return switchFrom;
    },
  };
}
