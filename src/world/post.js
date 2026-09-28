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
//                  second ChromaticAberrationEffect.
//   bloom          a high luminance threshold, so only emissives bloom
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
  float bdHash(float n) { return fract(sin(n) * 43758.5453123); }
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
    vec3 col;
    col.r = texture2D(inputBuffer, suv + vec2(split, 0.0)).r;
    col.g = texture2D(inputBuffer, suv).g;
    col.b = texture2D(inputBuffer, suv - vec2(split * 1.3, 0.0)).b;
    // Scanlines, only in the glitch: at rest they would be a screen door.
    float scan = 0.5 + 0.5 * sin(uv.y * resolution.y * 1.57);
    col *= 1.0 - 0.25 * e * scan;
    // A tint on the slipped bands: the braindance editor's colour keys.
    col += pick * e * vec3(0.12, 0.0, 0.08);
    outputColor = vec4(col, inputColor.a);
  }
`;

// The grade, after the tone map, in the same pass: the plate's night.
// Blacks lifted a hair toward violet rather than crushed, the mids pushed
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
        ["uLift", new THREE.Uniform(new THREE.Vector3(0.012, 0.01, 0.02))],
        ["uSat", new THREE.Uniform(1.3)],
        ["uShadowTint", new THREE.Uniform(new THREE.Vector3(-0.008, 0.006, 0.016))],
        ["uHighTint", new THREE.Uniform(new THREE.Vector3(0.024, 0.006, 0.004))],
        ["uContrast", new THREE.Uniform(0.35)],
        ["uExposure", new THREE.Uniform(0.95)],
      ]),
    });
  }
}

class BraindanceEffect extends Effect {
  constructor() {
    super("BraindanceEffect", BRAINDANCE, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ["uEnvelope", new THREE.Uniform(0)],
        ["uBass", new THREE.Uniform(0)],
        ["uSplit", new THREE.Uniform(0.0004)],
      ]),
    });
  }
}

export function createPost(renderer, scene, camera, quality) {
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

  const glitch = new BraindanceEffect();
  const bloom = new BloomEffect({
    luminanceThreshold: 0.72,
    luminanceSmoothing: 0.25,
    intensity: 1.15,
    mipmapBlur: true,
    radius: 0.72,
    levels: quality.name === "phone" ? 5 : 7,
  });
  bloom.resolution.scale = quality.bloomScale ?? 1;
  const effects = [glitch, bloom];
  let noise = null;
  let vignette = null;
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
  effects.push(tone, grade);
  const pass = new EffectPass(camera, ...effects);
  composer.addPass(pass);

  return {
    composer,
    glitch,
    bloom,
    tone,
    grade,
    /** The moon's scene and camera, for its own pass after the city's. */
    setMoon(moonScene, moonCamera) {
      moonPass = new RenderPass(moonScene, moonCamera);
      moonPass.enabled = false;
      composer.addPass(moonPass, 1);
    },
    /** null: the city alone. "only": the moon alone. "over": the moon over the city. */
    view(moon) {
      cityPass.enabled = moon !== "only";
      if (!moonPass) return;
      moonPass.enabled = Boolean(moon);
      moonPass.clearPass.setClearFlags(moon !== "over", true, false);
    },
    setGlitch(envelope, bass) {
      glitch.uniforms.get("uEnvelope").value = envelope;
      glitch.uniforms.get("uBass").value = bass;
    },
    setSize(w, h) {
      composer.setSize(w, h, false);
    },
    render(dt) {
      composer.render(dt);
    },
    dispose() {
      composer.dispose();
      glitch.dispose();
      bloom.dispose();
      smaa?.dispose();
      noise?.dispose();
      vignette?.dispose();
      tone.dispose();
      grade.dispose();
    },
  };
}
