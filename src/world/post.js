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
//   noise, vignette, and ACES filmic at exposure 1.0 last.
//
// The phone gets half-resolution bloom and the glitch, and nothing else.
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
    // Scanlines, felt at rest and seen in the glitch.
    float scan = 0.5 + 0.5 * sin(uv.y * resolution.y * 1.57);
    col *= 1.0 - (0.018 + 0.25 * e) * scan;
    // A tint on the slipped bands: the braindance editor's colour keys.
    col += pick * e * vec3(0.12, 0.0, 0.08);
    outputColor = vec4(col, inputColor.a);
  }
`;

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
  composer.addPass(new RenderPass(scene, camera));

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
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  effects.push(tone);
  const pass = new EffectPass(camera, ...effects);
  composer.addPass(pass);

  return {
    composer,
    glitch,
    bloom,
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
    },
  };
}
