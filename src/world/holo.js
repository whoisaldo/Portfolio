// src/world/holo.js: the holographic figure at the end of the avenue.
//
// The plate's giant violet woman, as an original generated image
// (design/night-city-world/README.md) on the kit's holo_figure plane, drawn
// additively so black is air. What makes it a hologram rather than a
// billboard is all in the shader: scanlines that crawl, a band of dropout
// that sweeps up her every few seconds, a faint vertical seam, a flicker,
// and a breath on the kick while the track plays.
//
// The hero frame (the page's first, crossfading from a painted plate) has
// her as the plate does, a crisp figure with its own dark behind her face.
// From anywhere else her picture is light thrown into the air rather than a
// card: no edge of the plane is ever drawn (it fades out to all four
// sides), her lower body thins away well above the plane's bottom, the
// cloth's fine lines go soft as the eye nears or drops under her (from
// below they read as tiles), a faint glow of her own colour hangs in the
// haze round her, and she dims nothing behind her.
import * as THREE from "three";
import { COMMON } from "./glsl.js";
import { worldHoloUrl } from "../data/world-assets.js";
import { bitmapTexture } from "./pictures.js";

let pending = null;

export function preloadHolo() {
  if (!pending) {
    pending = bitmapTexture(worldHoloUrl, false).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

export async function dressHolo(mesh, shared, { reduced = false } = {}) {
  // The hero's two lenses (wide and portrait) are anchors beside her in the
  // kit; within a few metres of the line between them she is the plate's.
  const heroA = mesh.parent.getObjectByName("cam_hero").position.clone();
  const heroB = (mesh.parent.getObjectByName("cam_hero_portrait") ?? mesh.parent.getObjectByName("cam_hero")).position.clone();
  const source = await preloadHolo();
  const map = source.clone();
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uMap: { value: map }, uGain: { value: 1.7 }, uMotion: { value: reduced ? 0 : 1 }, uHeroA: { value: heroA }, uHeroB: { value: heroB } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vMid;
      varying vec2 vUv;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vMid = modelMatrix[3].xyz;
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uMap;
      uniform float uGain;
      uniform float uMotion;
      uniform vec3 uHeroA;
      uniform vec3 uHeroB;
      varying vec3 vWorld;
      varying vec3 vMid;
      varying vec2 vUv;
      void main() {
        float t = uTime * uMotion;
        vec2 uv = vUv;
        vec3 toEye = uCam - vWorld;
        float far = length(toEye);
        // How far this eye is from the hero's: 0 at its lenses, so all that
        // follows from it leaves the hero's frame exactly as it was.
        vec3 heroAB = uHeroB - uHeroA;
        vec3 hero = uHeroA + heroAB * clamp(dot(uCam - uHeroA, heroAB) / max(dot(heroAB, heroAB), 1e-4), 0.0, 1.0);
        float away = smoothstep(15.0, 90.0, distance(uCam, hero));
        // The picture's v runs down her: 0 over her head, 1 at the plane's
        // bottom edge, which cuts across her hips.
        float lower = smoothstep(0.4, 0.95, vUv.y);
        // Close under her (the sine of the eye's angle up to her middle) her
        // jacket's lines become a ceiling of tiles: they go soft there, and
        // down her body as it thins away.
        float rise = (vMid.y - uCam.y) / max(length(vMid - uCam), 1.0);
        float below = smoothstep(0.2, 0.75, rise);
        float steep = smoothstep(0.45, 0.85, rise);
        float near = 1.0 - smoothstep(150.0, 350.0, far);
        float soft = away * (1.2 * lower + 2.0 * near + 1.5 * steep);
        // A band of dropout sweeping up the figure every few seconds, with
        // its slice slipping sideways.
        float sweep = fract(t * 0.13);
        float band = smoothstep(0.035, 0.0, abs((1.0 - uv.y) - sweep));
        uv.x += band * 0.012 * sin(t * 40.0);
        vec3 c = texture2D(uMap, uv, soft).rgb;
        // Her scanlines, faded to their mean once a line is under about a
        // pixel: from the avenue they are finer than the screen, and drawn
        // there they beat against its rows into a grille over everything.
        // Where her body thins away from the hero's they cut deeper, so it
        // goes out in lines of light (they run one way only: never tiles).
        float lines = uv.y * 520.0;
        float row = sin(lines - t * 6.0);
        float fine = clamp(fwidth(lines) * 1.2 - 0.2, 0.0, 1.0);
        float scan = mix(0.72 + 0.28 * row, 0.86, fine) - 0.3 * away * lower * mix(1.0 - row, 0.5, fine);
        float flicker = 0.9 + 0.1 * step(0.6, hash12(vec2(floor(t * 9.0), 3.0)));
        float gain = uGain * scan * flicker * (1.0 - 0.55 * band) * (1.0 + 0.35 * uBass);
        vec3 col = c * c * gain;
        // Away from the hero: her flat fills dimmer than her lines (light,
        // not a painted sheet), no edge of the plane anywhere (a rounded
        // falloff into each side and the top), her lower body thinning out
        // well before the bottom edge (and all of her thinner seen from
        // steeply under), and her own light a little wider than she is, a
        // glow in the haze (the picture's small mips) that fades with her.
        col *= mix(1.0, 1.15 * max(c.r, max(c.g, c.b)), away);
        vec2 rim = max(abs(vUv * 2.0 - 1.0) - vec2(0.7, 0.84), 0.0) / vec2(0.3, 0.16);
        float edge = 1.0 - smoothstep(0.0, 1.0, length(rim));
        float body = 1.0 - smoothstep(0.42 - 0.12 * below, 0.9, vUv.y);
        vec3 glow = texture2D(uMap, vUv, 4.0).rgb;
        col = mix(col, col * body + glow * glow * (0.1 * gain) * sqrt(body), away) * mix(1.0, edge * (1.0 - 0.65 * steep), away);
        // Additive light fades into the haze; it does not turn into it.
        float haze = exp(-length(vWorld - uCam) * uFogDensity * 0.4);
        col *= haze;
        // She also stands in front of the haze (premultiplied: her light
        // plus the sky behind her, dimmed where her figure is), so her
        // face keeps its features, her eyes dark, against a bright sky
        // rather than washing into it. The picture's black is not her.
        float figure = smoothstep(0.03, 0.14, max(c.r, max(c.g, c.b)));
        // Away from the hero only her face does: from her neck down she is
        // light alone, or her body would stand dark against the bright air
        // behind her as a slab.
        float cover = figure * 0.72 * haze * (1.0 - 0.5 * band) * mix(1.0, (1.0 - smoothstep(0.3, 0.5, vUv.y)) * edge, away);
        // From the avenue she is a figure in the sky; from close by, from
        // under her or from the side she would be a striped sheet: she
        // thins out inside a couple of hundred metres and edge on she is
        // gone. The hero, 580 m off and square to her, sees none of this.
        float stand = smoothstep(60.0, 180.0, far);
        float square = smoothstep(0.08, 0.3, abs(toEye.z) / max(far, 1.0));
        float seen = stand * square;
        gl_FragColor = vec4(col * seen, cover * seen);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  material.name = "holo";
  mesh.material = material;
  mesh.renderOrder = 2;
  return {
    material,
    dispose() {
      material.dispose();
      map.dispose();
    },
  };
}
