// src/world/signs.js: every sign in the city, as one texture and one draw.
//
// The kit places a quad per sign face and names it (sign_kiroshi,
// sign_ramen_b, sign_tower_aws-cloudformation...); the words live in
// src/data/world.js. This paints all of them onto one canvas atlas at
// runtime, once the page's fonts have loaded, and merges every face into a
// single mesh whose UVs point into its cell. Brand names are type, set in
// Chakra Petch, never a logo; the Japanese falls back to whatever CJK face
// the system has, which is the plate's street without shipping a CJK font.
//
// Each face keeps its own index in a vertex attribute, so a flickering tube
// is one sign and not the whole street: a handful are marked `flicker` and
// cut out for a frame or two at seeded moments. The switch in env.js
// (`fx signs off`) hides the lot, flicker and all.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { WORLD_SIGNS, CANYON_WORDS, towers } from "../data/world.js";
import { COMMON } from "./glsl.js";

const ATLAS = 2048;
const PX_PER_M = 46;
const PAD = 6;
const FONT = (weight, px) =>
  `${weight} ${px}px "Chakra Petch", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", "Meiryo", sans-serif`;

/** The words for a sign id, or null for a face with nothing to say. */
export function signSpec(id) {
  const base = id.replace(/_b$/, "").replace(/_far$/, "");
  if (base.startsWith("tower_")) {
    const t = towers.find((x) => x.slug === base.slice(6));
    return t ? { key: base, draw: "vertical", lines: [t.name.toUpperCase()], color: t.accent, latin: true } : null;
  }
  const canyon = base.match(/^far_([lr])(\d+)$/);
  if (canyon) {
    const n = Number(canyon[2]) * 2 + (canyon[1] === "r" ? 1 : 0);
    return { key: base, draw: "vertical", ...CANYON_WORDS[n % CANYON_WORDS.length] };
  }
  const spec = WORLD_SIGNS[base];
  return spec ? { key: base, ...spec } : null;
}

function lighten(hex, amount) {
  const c = new THREE.Color(hex);
  return `#${c.lerp(new THREE.Color("#ffffff"), amount).getHexString()}`;
}

/** A line of type as neon: a coloured glow, then a paler core on top. */
function tube(ctx, text, x, y, px, color, weight = 700) {
  ctx.font = FONT(weight, px);
  ctx.shadowColor = color;
  ctx.shadowBlur = px * 0.35;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = px * 0.08;
  ctx.fillStyle = lighten(color, 0.55);
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

function fitFont(ctx, text, maxW, maxH, weight = 700) {
  let px = Math.floor(maxH);
  ctx.font = FONT(weight, px);
  const w = ctx.measureText(text).width;
  if (w > maxW) px = Math.floor(px * (maxW / w));
  return Math.max(6, px);
}

const DRAW = {
  wordmark(ctx, spec, w, h) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = spec.lines[0];
    const px = fitFont(ctx, text, w * 0.86, h * 0.62);
    tube(ctx, text, w / 2, h / 2, px, spec.color);
  },
  vertical(ctx, spec, w, h) {
    const chars = [...spec.lines[0]].filter((c) => c !== " ");
    const reserve = spec.icon ? w * 1.1 : 0;
    const step = Math.min((h - reserve - w * 0.4) / chars.length, w * 0.95);
    const px = Math.floor(step * (spec.latin ? 0.78 : 0.86));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const top = (h - reserve - step * chars.length) / 2 + step / 2;
    chars.forEach((c, i) => tube(ctx, c, w / 2, top + i * step, Math.min(px, w * 0.8), spec.color));
    if (spec.icon === "bowl") {
      // A bowl and three lines of steam, drawn in the same tube.
      const cy = h - reserve * 0.55;
      ctx.strokeStyle = spec.color;
      ctx.shadowColor = spec.color;
      ctx.shadowBlur = w * 0.08;
      ctx.lineWidth = Math.max(2, w * 0.06);
      ctx.beginPath();
      ctx.arc(w / 2, cy, w * 0.3, 0, Math.PI);
      ctx.closePath();
      ctx.stroke();
      for (const dx of [-0.14, 0, 0.14]) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + dx * w, cy - w * 0.08);
        ctx.bezierCurveTo(w / 2 + (dx - 0.06) * w, cy - w * 0.25, w / 2 + (dx + 0.06) * w, cy - w * 0.3, w / 2 + dx * w, cy - w * 0.45);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
  },
  board(ctx, spec, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, lighten(spec.color, 0.25));
    g.addColorStop(1, spec.color);
    ctx.fillStyle = g;
    ctx.fillRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#3a0a06";
    const n = spec.lines.length;
    spec.lines.forEach((line, i) => {
      const px = fitFont(ctx, line, w * 0.8, (h * 0.8) / n * (i === 0 ? 0.9 : 0.55));
      ctx.font = FONT(700, px);
      ctx.fillText(line, w / 2, h * (0.1 + (0.8 * (i + 0.5)) / n));
    });
  },
  kiroshi(ctx, spec, w, h) {
    // A blue optic ad: a lens of rings, the name, the line under it.
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#081a5c");
    g.addColorStop(0.55, "#1440c8");
    g.addColorStop(1, "#0a2270");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.62;
    const cy = h * 0.27;
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = i % 2 ? "rgba(120,200,255,0.55)" : "rgba(170,230,255,0.9)";
      ctx.lineWidth = Math.max(1.5, w * 0.012);
      ctx.beginPath();
      ctx.arc(cx, cy, w * (0.07 + i * 0.045), 0, Math.PI * 2);
      ctx.stroke();
    }
    const iris = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.07);
    iris.addColorStop(0, "#ffffff");
    iris.addColorStop(0.5, "#7fe6ff");
    iris.addColorStop(1, "rgba(60,160,255,0)");
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const px = fitFont(ctx, "KIROSHI", w * 0.82, h * 0.13);
    tube(ctx, "KIROSHI", w * 0.09, h * 0.62, px, "#bfe8ff");
    ctx.fillStyle = "#dff4ff";
    ctx.font = FONT(600, Math.floor(px * 0.55));
    ctx.fillText("キロシ", w * 0.09, h * 0.72);
    ctx.font = FONT(500, Math.floor(px * 0.34));
    ["BETTER YOU,", "A BRIGHTER", "TOMORROW"].forEach((line, i) => ctx.fillText(line, w * 0.09, h * (0.8 + i * 0.058)));
  },
  nicola(ctx, spec, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ff3a4a");
    g.addColorStop(1, "#a8001a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // A can, drawn: a body with a highlight and a band. No mark on it.
    const cw = w * 0.3;
    const chh = h * 0.42;
    const cx = w * 0.62;
    const cy = h * 0.08;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.2);
    const body = ctx.createLinearGradient(0, 0, cw, 0);
    body.addColorStop(0, "#5a0010");
    body.addColorStop(0.35, "#ff4a5a");
    body.addColorStop(0.55, "#ffd0d4");
    body.addColorStop(0.75, "#e0182c");
    body.addColorStop(1, "#4a000c");
    ctx.fillStyle = body;
    ctx.fillRect(0, chh * 0.06, cw, chh * 0.9);
    ctx.fillStyle = "#c9c9cf";
    ctx.fillRect(0, 0, cw, chh * 0.07);
    ctx.fillRect(0, chh * 0.94, cw, chh * 0.06);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(0, chh * 0.42, cw, chh * 0.08);
    ctx.restore();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const px = fitFont(ctx, "NICOLA", w * 0.8, h * 0.13);
    tube(ctx, "NICOLA", w * 0.08, h * 0.68, px, "#ffffff");
    ctx.fillStyle = "#ffe3e6";
    ctx.font = FONT(600, Math.floor(px * 0.36));
    ctx.fillText("TASTE TOMORROW", w * 0.09, h * 0.77);
    ctx.font = FONT(600, Math.floor(px * 0.5));
    ctx.fillText("ニコラ", w * 0.09, h * 0.88);
  },
  maneki(ctx, spec, w, h) {
    // The beckoning cat as a line drawing in tube, the words beside it.
    const s = Math.min(w * 0.55, h * 0.8);
    const x0 = w * 0.08;
    const y0 = h * 0.12;
    ctx.strokeStyle = spec.color;
    ctx.shadowColor = spec.color;
    ctx.shadowBlur = s * 0.06;
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(x0 + s * 0.45, y0 + s * 0.28, s * 0.22, 0, Math.PI * 2);
    ctx.moveTo(x0 + s * 0.3, y0 + s * 0.12);
    ctx.lineTo(x0 + s * 0.28, y0);
    ctx.lineTo(x0 + s * 0.4, y0 + s * 0.08);
    ctx.moveTo(x0 + s * 0.5, y0 + s * 0.08);
    ctx.lineTo(x0 + s * 0.62, y0);
    ctx.lineTo(x0 + s * 0.6, y0 + s * 0.12);
    ctx.moveTo(x0 + s * 0.24, y0 + s * 0.45);
    ctx.quadraticCurveTo(x0 + s * 0.12, y0 + s * 0.95, x0 + s * 0.3, y0 + s);
    ctx.lineTo(x0 + s * 0.62, y0 + s);
    ctx.quadraticCurveTo(x0 + s * 0.8, y0 + s * 0.95, x0 + s * 0.66, y0 + s * 0.45);
    ctx.moveTo(x0 + s * 0.66, y0 + s * 0.5);
    ctx.lineTo(x0 + s * 0.84, y0 + s * 0.2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const chars = [...spec.lines[0]];
    const step = (h * 0.8) / chars.length;
    chars.forEach((c, i) => tube(ctx, c, w * 0.83, h * 0.1 + step * (i + 0.5), Math.floor(Math.min(step * 0.85, w * 0.28)), "#ff2e88"));
  },
  ripperdoc(ctx, spec, w, h) {
    // The clinic's cross, red, then the word, as the old Skyline.jsx drew it.
    const cs = h * 0.5;
    const cx = w * 0.1;
    const cy = h / 2;
    ctx.fillStyle = "#ff003c";
    ctx.shadowColor = "#ff003c";
    ctx.shadowBlur = cs * 0.3;
    ctx.fillRect(cx - cs * 0.12, cy - cs / 2, cs * 0.24, cs);
    ctx.fillRect(cx - cs / 2, cy - cs * 0.12, cs, cs * 0.24);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const px = fitFont(ctx, "RIPPERDOC", w * 0.72, h * 0.6);
    tube(ctx, "RIPPERDOC", w * 0.22, cy, px, spec.color);
  },
};

/**
 * Paint the atlas for these sign meshes and merge them. `meshes` are the
 * GLB's sign_* meshes (world matrices current). Returns
 * { mesh, texture, sources, dispose } where `sources` feed the spill bake.
 */
export function createSigns(meshes, shared, { maxAnisotropy = 4, reduced = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = ATLAS;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ATLAS, ATLAS);

  // One cell per distinct sign, sized from the face's metres.
  const cells = new Map();
  const faces = [];
  for (const mesh of meshes) {
    const id = mesh.name.replace(/^sign_/, "");
    const spec = signSpec(id);
    if (!spec) continue;
    const w = mesh.userData.w || 1;
    const h = mesh.userData.h || 1;
    faces.push({ mesh, spec });
    if (cells.has(spec.key)) continue;
    let pw = Math.round(w * PX_PER_M);
    let ph = Math.round(h * PX_PER_M);
    const scale = Math.min(1, 1024 / Math.max(pw, ph), Math.max(1, 64 / Math.min(pw, ph)));
    pw = Math.max(24, Math.round(pw * scale));
    ph = Math.max(24, Math.round(ph * scale));
    cells.set(spec.key, { spec, pw, ph });
  }

  // Shelf packing, tallest first.
  const order = [...cells.values()].sort((a, b) => b.ph - a.ph);
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const c of order) {
    if (x + c.pw + PAD * 2 > ATLAS) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    c.x = x + PAD;
    c.y = y + PAD;
    x += c.pw + PAD * 2;
    shelf = Math.max(shelf, c.ph + PAD * 2);
    if (y + shelf > ATLAS) throw new Error("Sign atlas overflow");
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.beginPath();
    ctx.rect(0, 0, c.pw, c.ph);
    ctx.clip();
    (DRAW[c.spec.draw] || DRAW.wordmark)(ctx, c.spec, c.pw, c.ph);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  // Merge every face into one geometry with atlas UVs and a sign index.
  const geos = [];
  const sources = [];
  faces.forEach(({ mesh, spec }, index) => {
    const cell = cells.get(spec.key);
    const g = new THREE.BufferGeometry();
    const src = mesh.geometry;
    mesh.updateWorldMatrix(true, false);
    const pos = src.attributes.position;
    const uv = src.attributes.uv;
    const nor = src.attributes.normal;
    const n = pos.count;
    const P = new Float32Array(n * 3);
    const N = new Float32Array(n * 3);
    const U = new Float32Array(n * 2);
    const S = new Float32Array(n * 2);
    const v = new THREE.Vector3();
    const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      P.set([v.x, v.y, v.z], i * 3);
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      N.set([v.x, v.y, v.z], i * 3);
      // glTF UVs put v = 0 at the top of the image, and the atlas is not
      // flipped, so a face's v runs straight down its cell.
      const u = uv.getX(i);
      const t = uv.getY(i);
      U[i * 2] = (cell.x + u * cell.pw) / ATLAS;
      U[i * 2 + 1] = (cell.y + t * cell.ph) / ATLAS;
      S[i * 2] = index;
      S[i * 2 + 1] = spec.flicker && !reduced ? 1 : 0;
    }
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(U, 2));
    g.setAttribute("aSign", new THREE.BufferAttribute(S, 2));
    if (src.index) g.setIndex(src.index.clone());
    geos.push(g);
    sources.push({ mesh, color: new THREE.Color(spec.color), intensity: spec.draw === "kiroshi" || spec.draw === "nicola" || spec.draw === "board" ? 0.9 : 1.6 });
  });
  const geometry = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());

  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uAtlas: { value: texture }, uIntensity: { value: 2.3 } },
    vertexShader: /* glsl */ `
      attribute vec2 aSign;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec2 vSign;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vUv = uv;
        vSign = aSign;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uAtlas;
      uniform float uIntensity;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec2 vSign;
      void main() {
        vec3 tex = texture2D(uAtlas, vUv).rgb;
        // A flickering tube cuts out for a frame or two at seeded moments,
        // and now and then stutters for longer.
        float t = floor(uTime * 14.0);
        float cut = vSign.y * max(step(0.986, hash12(vec2(t, vSign.x * 7.13))),
                                   step(0.93, hash12(vec2(floor(uTime * 0.7), vSign.x))) * step(0.5, hash12(vec2(t, vSign.x))));
        float breathe = 1.0 + 0.5 * uBass + 0.2 * uLevel;
        vec3 col = tex * uIntensity * breathe * (1.0 - 0.82 * cut);
        col = cityFog(col, vWorld, 1.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.name = "signs";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "signs";
  mesh.frustumCulled = false;

  return {
    mesh,
    texture,
    sources,
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
