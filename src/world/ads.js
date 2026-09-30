// src/world/ads.js: the avenue's two big screens.
//
// Kiroshi on the left and Nicola on the right, as the plate has them, and a
// second pair further up for the portrait camera. They are screens, not
// signs: each shows an original advertising image (generated for this, see
// design/night-city-world/README.md) with the brand's words from
// src/data/world.js set over it here, in Chakra Petch. The picture pushes in
// slowly toward its subject under words that stay put, faint scanlines ride
// over both, and every few seconds a screen tears: its rows slip sideways and
// the channels part for a quarter of a second. One draw for all four.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COMMON } from "./glsl.js";
import { FONT, tube } from "./signs.js";
import { worldAdUrl } from "../data/world-assets.js";
import { WORLD_SIGNS } from "../data/world.js";

const BRANDS = ["kiroshi", "nicola"];

let pending = null;

export function preloadAds() {
  if (!pending) {
    const loader = new THREE.TextureLoader();
    pending = Promise.all(BRANDS.map((b) => loader.loadAsync(worldAdUrl[b]))).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

/** `text` drawn a character at a time, `tracking` px apart, from `x` by `align`. */
function track(ctx, text, x, y, tracking, align, paint) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let at = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    paint(c, at);
    at += widths[i] + tracking;
  });
  ctx.textAlign = prev;
  return total;
}

/** The largest size at which `text`, tracked by `em` of itself, fits `maxW`. */
function fitTracked(ctx, text, maxW, maxPx, weight, em) {
  ctx.font = FONT(weight, 100);
  const chars = [...text];
  const w100 = chars.reduce((a, c) => a + ctx.measureText(c).width, 0) + 100 * em * (chars.length - 1);
  return Math.max(6, Math.floor(Math.min(maxPx, (100 * maxW) / w100)));
}

/** Four corner brackets, as a viewfinder frames its subject. */
function brackets(ctx, w, h, inset, arm, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 3;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[inset, inset, 1, 1], [w - inset, inset, -1, 1], [inset, h - inset, 1, -1], [w - inset, h - inset, -1, -1]]) {
    ctx.moveTo(x, y + dy * arm);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * arm, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// The words over each picture, on a transparent cell. The pictures leave
// their lower third dark for exactly this.
const TYPE = {
  kiroshi(ctx, w, h, lines) {
    const [name, kana, ...tag] = lines;
    brackets(ctx, w, h, w * 0.045, w * 0.1, "rgba(170,225,255,0.8)", Math.max(1.5, w * 0.005));
    // A rule over the name with a short bright lead, like a lens's scale.
    ctx.fillStyle = "rgba(150,210,255,0.4)";
    ctx.fillRect(w * 0.08, h * 0.662, w * 0.84, Math.max(1, h * 0.0018));
    ctx.fillStyle = "#e6f6ff";
    ctx.fillRect(w * 0.08, h * 0.658, w * 0.16, Math.max(2, h * 0.005));
    ctx.textBaseline = "alphabetic";
    const px = fitTracked(ctx, name, w * 0.84, h * 0.13, 700, 0.08);
    ctx.font = FONT(700, px);
    track(ctx, name, w * 0.08, h * 0.775, px * 0.08, "left", (c, x) => tube(ctx, c, x, h * 0.775, px, "#9fd8ff"));
    // The katakana under it, a small square before it.
    const kpx = Math.floor(px * 0.34);
    ctx.fillStyle = "#7fc8ff";
    ctx.fillRect(w * 0.08, h * 0.815 - kpx * 0.62, kpx * 0.55, kpx * 0.55);
    ctx.font = FONT(600, kpx);
    ctx.fillStyle = "#dff4ff";
    track(ctx, kana, w * 0.08 + kpx * 0.9, h * 0.815, kpx * 0.3, "left", (c, x) => ctx.fillText(c, x, h * 0.815));
    // The line, three short rows.
    const tpx = Math.floor(px * 0.3);
    ctx.font = FONT(600, tpx);
    ctx.fillStyle = "rgba(236,248,255,0.95)";
    tag.forEach((line, i) => track(ctx, line, w * 0.08, h * (0.868 + i * 0.041), tpx * 0.16, "left", (c, x) => ctx.fillText(c, x, h * (0.868 + i * 0.041))));
    // The optic, in tube, bottom right.
    const cx = w * 0.8;
    const cy = h * 0.885;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i === 1 ? "rgba(120,200,255,0.6)" : "#bfe8ff";
      ctx.shadowColor = "#4aa8ff";
      ctx.shadowBlur = w * 0.02;
      ctx.lineWidth = Math.max(1.5, w * (i === 0 ? 0.008 : 0.005));
      ctx.beginPath();
      ctx.arc(cx, cy, w * (0.028 + i * 0.03), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.012, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  },
  nicola(ctx, w, h, lines) {
    const [name, line, kana] = lines;
    ctx.textBaseline = "alphabetic";
    // The name, slanted as a soda's is, white on its own red glow.
    const px = fitTracked(ctx, name, w * 0.8, h * 0.15, 700, 0.02);
    ctx.save();
    ctx.translate(w / 2, h * 0.79);
    ctx.transform(1, 0, -0.2, 1, 0, 0);
    ctx.font = FONT(700, px);
    track(ctx, name, 0, 0, px * 0.02, "center", (c, x) => tube(ctx, c, x, 0, px, "#ff4054"));
    ctx.fillStyle = "#ffffff";
    track(ctx, name, 0, 0, px * 0.02, "center", (c, x) => ctx.fillText(c, x, 0));
    ctx.restore();
    // A ribbon under it.
    ctx.strokeStyle = "#ffffff";
    ctx.shadowColor = "#ff5a6a";
    ctx.shadowBlur = w * 0.02;
    ctx.lineWidth = Math.max(2, w * 0.009);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.815);
    ctx.bezierCurveTo(w * 0.35, h * 0.845, w * 0.62, h * 0.79, w * 0.88, h * 0.808);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // The line, tracked wide.
    const tpx = Math.floor(px * 0.26);
    ctx.font = FONT(600, tpx);
    ctx.fillStyle = "#fff1f2";
    track(ctx, line, w / 2, h * 0.875, tpx * 0.34, "center", (c, x) => ctx.fillText(c, x, h * 0.875));
    // The katakana on a white pill.
    const kpx = Math.floor(px * 0.3);
    ctx.font = FONT(700, kpx);
    const kw = track(ctx, kana, 0, -1e4, kpx * 0.25, "left", () => {});
    const pw = kw + kpx * 1.4;
    const ph = kpx * 1.45;
    const py = h * 0.905;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ff5a6a";
    ctx.shadowBlur = w * 0.015;
    ctx.beginPath();
    ctx.roundRect(w / 2 - pw / 2, py, pw, ph, ph / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#c8001e";
    ctx.textBaseline = "middle";
    track(ctx, kana, w / 2, py + ph * 0.54, kpx * 0.25, "center", (c, x) => ctx.fillText(c, x, py + ph * 0.54));
  },
};

/**
 * The screens: `meshes` are the GLB's ad_* quads (world matrices current),
 * each carrying its brand in `userData.ad`. Returns { mesh, sources,
 * dispose }; `sources` feed the light bake.
 */
export async function createAds(meshes, shared, { reduced = false, maxAnisotropy = 4, cell = 512 } = {}) {
  const pictures = await preloadAds();
  const maps = pictures.map((source) => {
    const map = source.clone();
    map.flipY = false;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = maxAnisotropy;
    map.needsUpdate = true;
    return map;
  });

  // The words: one transparent cell per brand, side by side.
  const cw = cell;
  const ch = Math.round(cell * 1.5);
  const canvas = document.createElement("canvas");
  canvas.width = cw * BRANDS.length;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  BRANDS.forEach((brand, i) => {
    ctx.save();
    ctx.translate(i * cw, 0);
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.clip();
    TYPE[brand](ctx, cw, ch, WORLD_SIGNS[brand].lines);
    ctx.restore();
  });
  const type = new THREE.CanvasTexture(canvas);
  type.flipY = false;
  type.premultiplyAlpha = true;
  type.colorSpace = THREE.SRGBColorSpace;
  type.anisotropy = maxAnisotropy;

  // Every face in one geometry: its brand and a seed of its own ride along.
  const geos = [];
  const sources = [];
  const v = new THREE.Vector3();
  meshes.forEach((mesh, index) => {
    const brand = Math.max(0, BRANDS.indexOf(mesh.userData.ad));
    const src = mesh.geometry;
    mesh.updateWorldMatrix(true, false);
    const pos = src.attributes.position;
    const uv = src.attributes.uv;
    const n = pos.count;
    const P = new Float32Array(n * 3);
    const U = new Float32Array(n * 2);
    const A = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      P.set([v.x, v.y, v.z], i * 3);
      U[i * 2] = uv.getX(i);
      U[i * 2 + 1] = uv.getY(i);
      A[i * 2] = brand;
      A[i * 2 + 1] = (index * 0.618) % 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(U, 2));
    g.setAttribute("aAd", new THREE.BufferAttribute(A, 2));
    if (src.index) g.setIndex(src.index.clone());
    geos.push(g);
    sources.push({ mesh, color: new THREE.Color(WORLD_SIGNS[BRANDS[brand]].color), intensity: 0.9 });
  });
  const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  if (geos.length > 1) geos.forEach((g) => g.dispose());

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uKiroshi: { value: maps[0] },
      uNicola: { value: maps[1] },
      uType: { value: type },
      uMotion: { value: reduced ? 0 : 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec2 aAd;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec2 vAd;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vUv = uv;
        vAd = aAd;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uKiroshi;
      uniform sampler2D uNicola;
      uniform sampler2D uType;
      uniform float uMotion;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec2 vAd;

      vec3 picture(vec2 uv, float split) {
        uv = clamp(uv, 0.002, 0.998);
        vec2 o = vec2(split, 0.0);
        if (vAd.x < 0.5) return vec3(texture2D(uKiroshi, uv + o).r, texture2D(uKiroshi, uv).g, texture2D(uKiroshi, uv - o).b);
        return vec3(texture2D(uNicola, uv + o).r, texture2D(uNicola, uv).g, texture2D(uNicola, uv - o).b);
      }

      void main() {
        float t = uTime * uMotion;
        float seed = vAd.y;
        // A tear: a quarter second, every eight seconds or so, not every time.
        float clock = t + seed * 29.0;
        float cycle = floor(clock / 8.0);
        float tear = uMotion * step(mod(clock, 8.0), 0.26) * step(0.3, hash12(vec2(cycle, seed * 17.0)));
        float row = floor(vUv.y * 22.0);
        float moving = step(0.5, hash12(vec2(row, floor(t * 24.0))));
        float slip = (hash12(vec2(row * 3.1, floor(t * 30.0))) - 0.5) * 0.09 * tear * moving;
        vec2 uv = vec2(vUv.x + slip, vUv.y);
        float split = 0.007 * tear;

        // The picture pushes in toward its subject and back, slowly.
        vec2 focus = mix(vec2(0.55, 0.16), vec2(0.55, 0.32), vAd.x);
        float push = 1.0 + 0.06 * (0.5 - 0.5 * cos(t * 0.19 + seed * 6.28));
        vec3 pic = picture(focus + (uv - focus) / push, split);
        // The words stay put (premultiplied, so their glow lies over it).
        vec2 tu = vec2((vAd.x + clamp(uv.x, 0.0, 1.0)) * 0.5, uv.y);
        vec4 words = texture2D(uType, tu);
        vec3 col = pic * (1.0 - words.a) * 1.35 + words.rgb * 2.4;

        // Scanlines, faded out where they would alias, and a slow refresh
        // band rolling down.
        float lines = vUv.y * 340.0;
        float scan = 0.92 + 0.08 * sin(lines * 6.2832);
        scan = mix(scan, 0.96, clamp(fwidth(lines) * 1.5, 0.0, 1.0));
        float band = smoothstep(0.08, 0.0, abs(fract(t * 0.11 + seed) - vUv.y));
        // The edges fall off, as a panel's backlight does.
        float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float vig = 0.72 + 0.28 * smoothstep(0.0, 0.07, edge);
        float flash = 1.0 + tear * 0.5 * hash12(vec2(floor(t * 30.0), seed));
        col *= scan * vig * (1.0 + 0.07 * band) * flash * (1.0 + 0.2 * uBass);
        col = cityFog(col, vWorld, 1.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "ads";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "ads";
  mesh.frustumCulled = false;

  return {
    mesh,
    sources,
    dispose() {
      geometry.dispose();
      material.dispose();
      maps.forEach((m) => m.dispose());
      type.dispose();
    },
  };
}
