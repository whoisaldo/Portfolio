// src/world/post.js: the grade, the bloom, and the braindance glitch.
//
// pmndrs postprocessing, merged into as few full-screen passes as it
// allows. The render goes to a half-float buffer so the neon can be brighter
// than white; then:
//
//   SMAA           desktop only, its own pass (it cannot share one)
//   braindance     the site's registration-error glitch, in the scene: a
//                  handful of horizontal slices slipping sideways, scanlines,
//                  and an RGB split. The split is the chromatic aberration
//                  too: a hair of it always, more on the kick while the track
//                  plays, a lot at the middle of a flight and on the intro's
//                  handoff cues. One convolution effect per pass is the
//                  library's rule, so the split lives here rather than as a
//                  second ChromaticAberrationEffect. So does the shutter:
//                  on a fast move the frame smears the way the picture is
//                  moving, as a film camera's half-open shutter smears it,
//                  with the split drawn out along it (world-scene.js works
//                  out how the picture moved).
//   bloom          a high luminance threshold, so only emissives bloom, and
//                  little enough of it that a lit sign keeps its lettering
//                  and a lantern its shape
//   streaks        desktop: the hottest lights drawn out sideways, a little
//                  blue, from the bloom's own bright pass (no pass of its own)
//   glass          the page's panes of smoked glass: inside each one the
//                  city is frosted (blurred, darkened, its highlights eased
//                  down), so text reads on a pane the city shows through
//   noise, vignette, the Khronos neutral tone map, and the grade last.
//
// The phone gets half-resolution bloom and the glitch, and nothing else.
//
// The intro's voxel moon (src/world/voxel-moon.js) is its own scene with its
// own camera, drawn by a second render pass through the same chain, so it
// takes the city's grade and bloom. While it is on screen alone the city's
// pass rests; while the city shows through it, the moon draws over the
// city's frame with only the depth cleared between them.
import * as THREE from "three";
import {
  BlendFunction,
  BloomEffect,
  Effect,
  EffectAttribute,
  EffectComposer,
  EffectPass,
  KawaseBlurPass,
  KernelSize,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";

const BRAINDANCE = /* glsl */ `
  uniform float uEnvelope;
  uniform float uBass;
  uniform float uSplit;
  // The shutter: where a point on the screen was a shutter ago, from where
  // it is now (here + uShutter * here, here at the depth uShutterDepth);
  // uShutterOn eases it in and out.
  uniform mat4 uShutter;
  uniform float uShutterDepth;
  uniform float uShutterOn;
  float bdHash(float n) { return fract(sin(n) * 43758.5453123); }
  // The split at one point: red one way, blue the other.
  vec3 bdSplit(vec2 p, float split) {
    return vec3(
      texture2D(inputBuffer, p + vec2(split, 0.0)).r,
      texture2D(inputBuffer, p).g,
      texture2D(inputBuffer, p - vec2(split * 1.3, 0.0)).b);
  }
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float e = clamp(uEnvelope, 0.0, 1.0);
    float t = floor(time * 24.0);
    // Registration error: bands of the frame slip sideways, more of them
    // and further the harder the envelope is.
    float band = floor(uv.y * 26.0);
    float pick = step(1.0 - e * 0.42, bdHash(band * 13.1 + t * 1.7));
    float shift = (bdHash(band * 3.7 + t) - 0.5) * 0.09 * e * pick;
    vec2 suv = vec2(uv.x + shift, uv.y);
    float split = uSplit + e * 0.011 + uBass * 0.0035;
    // How far this pixel's picture moved while the shutter was open, at
    // most a fortieth of the frame's height.
    vec2 flow = vec2(0.0);
    if (uShutterOn > 0.0) {
      vec4 here = vec4(uv * 2.0 - 1.0, uShutterDepth, 1.0);
      vec4 before = here + uShutter * here;
      flow = (here.xy - before.xy / before.w) * 0.5 * uShutterOn;
    }
    float px = length(flow * resolution);
    flow *= min(1.0, 0.025 * resolution.y / max(px, 1e-3));
    px = min(px, 0.025 * resolution.y);
    vec3 col;
    if (px < 1.0) {
      col = bdSplit(suv, split);
    } else {
      // A tap every three pixels or so along the smear, offset per pixel
      // so the gaps between them read as grain rather than as copies.
      // Red leads and blue trails: the lens's fringe, drawn out by speed.
      float n = clamp(ceil(px / 3.0), 2.0, float(SHUTTER_TAPS));
      float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      bool wide = split * resolution.x > 0.6;
      vec3 sum = vec3(0.0);
      vec3 weight = vec3(0.0);
      for (int i = 0; i < SHUTTER_TAPS; i++) {
        if (float(i) >= n) break;
        float t = (float(i) + jitter) / n - 0.5;
        vec2 q = suv + flow * t;
        vec3 w = vec3(1.0 + 1.4 * t, 1.0, 1.0 - 1.4 * t);
        vec3 c;
        if (wide) c = bdSplit(q, split);
        else c = texture2D(inputBuffer, q).rgb;
        sum += c * w;
        weight += w;
      }
      col = sum / weight;
    }
    // Scanlines, only in the glitch: at rest they would be a screen door.
    float scan = 0.5 + 0.5 * sin(uv.y * resolution.y * 1.57);
    col *= 1.0 - 0.25 * e * scan;
    // A tint on the slipped bands: the braindance editor's colour keys.
    col += pick * e * vec3(0.12, 0.0, 0.08);
    outputColor = vec4(col, inputColor.a);
  }
`;

// The grade, after the tone map, in the same pass: the plate's night.
// Blacks lifted a hair toward navy rather than crushed, the mids pushed
// more saturated than the highlights (so a tube keeps its white core and a
// wall keeps its colour), shadows cooled toward teal and violet, the top
// warmed toward pink, and a gentle S for contrast.
const GRADE = /* glsl */ `
  uniform vec3 uLift;
  uniform float uSat;
  uniform vec3 uShadowTint;
  uniform vec3 uHighTint;
  uniform float uContrast;
  uniform float uExposure;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = pow(max(inputColor.rgb * uExposure, 0.0), vec3(1.0 / 2.2));
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float mid = 1.0 - pow(abs(l * 2.0 - 1.0), 2.0);
    c = mix(vec3(l), c, 1.0 + (uSat - 1.0) * mid);
    c += uShadowTint * (1.0 - smoothstep(0.0, 0.42, l)) + uHighTint * smoothstep(0.55, 1.0, l);
    c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);
    c = uLift + max(c, 0.0) * (1.0 - uLift);
    outputColor = vec4(pow(max(c, 0.0), vec3(2.2)), inputColor.a);
  }
`;

class GradeEffect extends Effect {
  constructor() {
    super("GradeEffect", GRADE, {
      uniforms: new Map([
        ["uLift", new THREE.Uniform(new THREE.Vector3(0.008, 0.012, 0.021))],
        ["uSat", new THREE.Uniform(1.3)],
        ["uShadowTint", new THREE.Uniform(new THREE.Vector3(-0.008, 0.006, 0.016))],
        ["uHighTint", new THREE.Uniform(new THREE.Vector3(0.024, 0.006, 0.004))],
        ["uContrast", new THREE.Uniform(0.35)],
        ["uExposure", new THREE.Uniform(0.98)],
      ]),
    });
  }
}

// Anamorphic streaks: the brightest lights drawn out sideways and a little
// blue, as a scope lens draws them. Read from the bloom's own quarter-
// resolution bright pass (already blurred a step, so the streak is a line
// and not a row of dots), 25 taps along x, fading out; only what is truly
// hot survives the threshold, so a tube throws one and a lit wall does not.
const STREAK = /* glsl */ `
  uniform sampler2D uStreakMap;
  uniform float uStep;
  uniform float uIntensity;
  uniform float uThreshold;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 s = texture2D(uStreakMap, uv).rgb;
    for (int i = 1; i <= 12; i++) {
      float o = float(i) * uStep;
      float w = exp(-float(i) * 0.24);
      s += (texture2D(uStreakMap, uv + vec2(o, 0.0)).rgb + texture2D(uStreakMap, uv - vec2(o, 0.0)).rgb) * w;
    }
    s = max(s - uThreshold, 0.0);
    vec3 tint = mix(vec3(dot(s, vec3(0.3333))), s, 0.35) * vec3(0.62, 0.72, 1.0);
    outputColor = vec4(inputColor.rgb + tint * uIntensity, inputColor.a);
  }
`;

class StreakEffect extends Effect {
  constructor(map) {
    super("StreakEffect", STREAK, {
      uniforms: new Map([
        ["uStreakMap", new THREE.Uniform(map)],
        ["uStep", new THREE.Uniform(0.004)],
        ["uIntensity", new THREE.Uniform(0.07)],
        ["uThreshold", new THREE.Uniform(0.35)],
      ]),
    });
  }
}

// Smoked glass. The page's panes (src/components/ui/Panel.jsx, `glass`)
// are see-through, and behind each one the city is frosted here, in the
// same pass as the grade: a Kawase blur of the frame at a quarter of its
// resolution (a few small passes of its own, run only while a pane is on
// screen), darkened, its highlights eased down toward a ceiling so a sign
// behind a pane is a soft glow and not a hole in the text, inside the
// pane's own outline (its chamfered corners included). No CSS
// backdrop-filter: over a canvas that changes every frame, that would be a
// full blur of everything behind every pane, every frame, on the
// compositor. Panes come in CSS pixels, top-left origin, from
// src/world/glass.js; `uPaneInfo` is the cut (px), which corners are cut
// (0 both, 1 bottom-right, 2 none) and the pane's opacity.
export const MAX_PANES = 16;
const GLASS = /* glsl */ `
  uniform sampler2D uGlassMap;
  uniform vec4 uPanes[MAX_PANES];
  uniform vec4 uPaneInfo[MAX_PANES];
  uniform int uPaneCount;
  uniform vec2 uView;
  uniform float uDarken;
  uniform float uCeiling;
  float pane(vec2 p, vec4 r, vec4 info) {
    vec2 a = p - r.xy;
    vec2 b = r.zw - p;
    float d = min(min(a.x, a.y), min(b.x, b.y));
    if (info.y < 0.5) d = min(d, (a.x + a.y - info.x) * 0.7071);
    if (info.y < 1.5) d = min(d, (b.x + b.y - info.x) * 0.7071);
    return clamp(d + 0.5, 0.0, 1.0) * info.z;
  }
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    outputColor = inputColor;
    if (uPaneCount == 0) return;
    vec2 p = vec2(uv.x, 1.0 - uv.y) * uView;
    float m = 0.0;
    for (int i = 0; i < MAX_PANES; i++) {
      if (i >= uPaneCount) break;
      m = max(m, pane(p, uPanes[i], uPaneInfo[i]));
    }
    if (m <= 0.0) return;
    vec3 b = texture2D(uGlassMap, uv).rgb * uDarken;
    // Eased toward the ceiling by luminance, so a hue survives the frost.
    float l = dot(b, vec3(0.2126, 0.7152, 0.0722));
    vec3 frost = b / (1.0 + l / uCeiling);
    outputColor = vec4(mix(inputColor.rgb, frost, m), inputColor.a);
  }
`;

class GlassEffect extends Effect {
  /** `phone`: three blur passes instead of five, which on a phone's smaller
   *  frame frosts it about as much as five do on a monitor's. */
  constructor({ phone = false } = {}) {
    super("GlassEffect", GLASS, {
      defines: new Map([["MAX_PANES", String(MAX_PANES)]]),
      uniforms: new Map([
        ["uGlassMap", new THREE.Uniform(null)],
        ["uPanes", new THREE.Uniform(Array.from({ length: MAX_PANES }, () => new THREE.Vector4()))],
        ["uPaneInfo", new THREE.Uniform(Array.from({ length: MAX_PANES }, () => new THREE.Vector4()))],
        ["uPaneCount", new THREE.Uniform(0)],
        ["uView", new THREE.Uniform(new THREE.Vector2(1, 1))],
        ["uDarken", new THREE.Uniform(0.55)],
        ["uCeiling", new THREE.Uniform(0.13)],
      ]),
    });
    this.blurPass = new KawaseBlurPass({ kernelSize: phone ? KernelSize.SMALL : KernelSize.LARGE, resolutionScale: 0.25 });
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.renderTarget.texture.name = "Glass.Target";
    this.uniforms.get("uGlassMap").value = this.renderTarget.texture;
  }

  /** How many panes are on screen this frame; their arrays are written in
   *  place (uniforms.get("uPanes").value and "uPaneInfo"). */
  set count(n) {
    this.uniforms.get("uPaneCount").value = n;
  }

  update(renderer, inputBuffer) {
    if (this.uniforms.get("uPaneCount").value > 0) this.blurPass.render(renderer, inputBuffer, this.renderTarget);
  }

  setSize(width, height) {
    this.blurPass.setSize(width, height);
    this.renderTarget.setSize(this.blurPass.resolution.width, this.blurPass.resolution.height);
  }

  initialize(renderer, alpha, frameBufferType) {
    this.blurPass.initialize(renderer, alpha, frameBufferType);
    if (frameBufferType !== undefined) this.renderTarget.texture.type = frameBufferType;
  }

  dispose() {
    super.dispose();
    this.blurPass.dispose();
    this.renderTarget.dispose();
  }
}

class BraindanceEffect extends Effect {
  /** `taps`: the most the shutter's smear takes (fewer on a phone). */
  constructor(taps = 8) {
    super("BraindanceEffect", BRAINDANCE, {
      attributes: EffectAttribute.CONVOLUTION,
      defines: new Map([["SHUTTER_TAPS", String(taps)]]),
      uniforms: new Map([
        ["uEnvelope", new THREE.Uniform(0)],
        ["uBass", new THREE.Uniform(0)],
        ["uSplit", new THREE.Uniform(0.00015)],
        ["uShutter", new THREE.Uniform(new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0))],
        ["uShutterDepth", new THREE.Uniform(0)],
        ["uShutterOn", new THREE.Uniform(0)],
      ]),
    });
  }
}

// The luminance past which a pixel blooms.
const BLOOM_AT = 0.9;

export function createPost(renderer, scene, camera, quality, { extra = [] } = {}) {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: 0,
  });
  const cityPass = new RenderPass(scene, camera);
  composer.addPass(cityPass);
  let moonPass = null;

  let smaa = null;
  if (quality.smaa) {
    smaa = new SMAAEffect({ preset: SMAAPreset.MEDIUM });
    composer.addPass(new EffectPass(camera, smaa));
  }

  const glitch = new BraindanceEffect(quality.name === "phone" ? 4 : 8);
  const bloom = new BloomEffect({
    luminanceThreshold: BLOOM_AT,
    luminanceSmoothing: 0.3,
    intensity: 0.8,
    mipmapBlur: true,
    radius: 0.72,
    levels: quality.name === "phone" ? 5 : 7,
  });
  bloom.resolution.scale = quality.bloomScale ?? 1;
  const effects = [glitch, bloom];
  let noise = null;
  let vignette = null;
  let streak = null;
  const streakMap = bloom.mipmapBlurPass?.downsamplingMipmaps?.[1]?.texture;
  if (quality.name !== "phone" && streakMap) {
    streak = new StreakEffect(streakMap);
    effects.push(streak);
  }
  const glass = new GlassEffect({ phone: quality.name === "phone" });
  effects.push(glass);
  if (quality.name !== "phone") {
    noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    noise.blendMode.opacity.value = 0.12;
    vignette = new VignetteEffect({ offset: 0.28, darkness: 0.62 });
    effects.push(noise, vignette);
  }
  // Khronos PBR Neutral rather than ACES: it keeps a tube's hue as it
  // brightens instead of bending blue to violet and red to orange, and
  // leaves the grade the saturation to work with.
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
  const grade = new GradeEffect();
  // Anything the caller adds runs on the graded picture (the braindance's
  // layers, src/braindance/layers.js); the cinematic adds nothing.
  effects.push(tone, grade, ...extra);
  const pass = new EffectPass(camera, ...effects);
  composer.addPass(pass);

  return {
    composer,
    glitch,
    bloom,
    tone,
    grade,
    glass,
    /** The moon's scene and camera, for its own pass after the city's. */
    setMoon(moonScene, moonCamera) {
      moonPass = new RenderPass(moonScene, moonCamera);
      moonPass.enabled = false;
      composer.addPass(moonPass, 1);
    },
    /**
     * null: the city alone. "only": the moon alone. "over": the moon over
     * the city. The moon alone blooms only what is truly hot (its meteors,
     * its signal, Earth's lights), not every lit white voxel.
     */
    view(moon) {
      cityPass.enabled = moon !== "only";
      bloom.luminanceMaterial.threshold = moon === "only" ? 1.4 : BLOOM_AT;
      if (!moonPass) return;
      moonPass.enabled = Boolean(moon);
      moonPass.clearPass.setClearFlags(moon !== "over", true, false);
    },
    setGlitch(envelope, bass) {
      glitch.uniforms.get("uEnvelope").value = envelope;
      glitch.uniforms.get("uBass").value = bass;
    },
    /** The shutter's smear (see BRAINDANCE): `on` 0 for none. */
    setShutter(matrix, depth, on) {
      glitch.uniforms.get("uShutterOn").value = on;
      if (on <= 0) return;
      glitch.uniforms.get("uShutter").value.copy(matrix);
      glitch.uniforms.get("uShutterDepth").value = depth;
    },
    setSize(w, h) {
      composer.setSize(w, h, false);
      // One tap every one and a half texels of the quarter-size bright pass.
      const mip = bloom.mipmapBlurPass?.downsamplingMipmaps?.[1];
      if (streak && mip) streak.uniforms.get("uStep").value = 1.5 / Math.max(1, mip.width);
    },
    render(dt) {
      composer.render(dt);
    },
    dispose() {
      composer.dispose();
      glitch.dispose();
      bloom.dispose();
      smaa?.dispose();
      streak?.dispose();
      noise?.dispose();
      vignette?.dispose();
      tone.dispose();
      grade.dispose();
      glass.dispose();
    },
  };
}
