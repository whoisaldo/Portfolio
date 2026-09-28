// src/world/signs.js: every sign in the city, as one texture and one draw.
//
// The kit places a quad per sign face and names it (sign_arasaka,
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
import { WORLD_SIGNS, CANYON_WORDS, STREET_SIGNS, SIGN_SIZES, towers } from "../data/world.js";
import { COMMON } from "./glsl.js";

const PX_PER_M = 46;
const PAD = 6;
export const FONT = (weight, px) =>
  `${weight} ${px}px "Chakra Petch", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", "Meiryo", sans-serif`;

/** The words for a sign id, or null for a face with nothing to say. */
export function signSpec(id) {
  const base = id.replace(/_b$/, "").replace(/_far$/, "");
  if (base.startsWith("tower_")) {
    const t = towers.find((x) => x.slug === base.slice(6));
    return t ? { key: base, draw: "vertical", lines: [t.name.toUpperCase()], color: t.accent, latin: true } : null;
  }
  // The street's standard signs: the next design of the face's size.
  const street = base.match(/^st_([a-z]{2})_(\d+)$/);
  if (street) {
    const list = STREET_SIGNS[street[1]];
    if (!list) return null;
    const i = Number(street[2]) % list.length;
    return { key: `st_${street[1]}_${i}`, draw: "street", size: street[1], ppm: 96, ...list[i] };
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
export function tube(ctx, text, x, y, px, color, weight = 700) {
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

// ---- the street's own signs ------------------------------------------------
// A sign in a Night City street is a thing someone built and wired: a dark
// board with its words bent in glass tube, or a lit box with dark letters on
// it, or a panel of bulbs. Painted here once per design, at 96 px a metre,
// with the glow baked in so the bloom has something to hold on to.

function board(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0d0b12");
  g.addColorStop(1, "#050409");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.03);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** A path stroked as tube: a wide coloured glow, then a paler core. */
function strokeTube(ctx, color, width, draw) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 2.6;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  draw();
  ctx.stroke();
  ctx.shadowBlur = width * 0.8;
  ctx.strokeStyle = lighten(color, 0.6);
  ctx.lineWidth = width * 0.45;
  ctx.beginPath();
  draw();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Words laid out for a cell: stacked characters on a tall cell, lines on a
 *  wide one. `paint(text, x, y, px)` puts each run down. */
function layout(ctx, spec, w, h, inset, paint, weight = 700) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const iw = w - inset * 2;
  const ih = h - inset * 2;
  if (h > w * 1.35) {
    const chars = spec.latin ? [...spec.lines[0]].filter((c) => c !== " ") : [...spec.lines[0]];
    const step = Math.min(ih / chars.length, iw * (spec.latin ? 0.95 : 1.05));
    const px = Math.floor(step * (spec.latin ? 0.8 : 0.84));
    const top = h / 2 - (step * chars.length) / 2 + step / 2;
    chars.forEach((c, i) => paint(c, w / 2, top + i * step, Math.min(px, iw * 0.92), weight));
    return;
  }
  const lines = spec.lines;
  const weights = lines.map((_, i) => (i === 0 ? 1 : 0.62));
  const total = weights.reduce((a, b) => a + b, 0);
  let y = inset;
  lines.forEach((line, i) => {
    const lh = (ih * weights[i]) / total;
    const px = fitFont(ctx, line, iw * 0.92, lh * 0.78, weight);
    paint(line, w / 2, y + lh / 2, px, weight);
    y += lh;
  });
}

const ICONS = {
  glass(c, s) { c.moveTo(0.2 * s, 0.22 * s); c.lineTo(0.8 * s, 0.22 * s); c.lineTo(0.5 * s, 0.56 * s); c.closePath(); c.moveTo(0.5 * s, 0.56 * s); c.lineTo(0.5 * s, 0.8 * s); c.moveTo(0.34 * s, 0.8 * s); c.lineTo(0.66 * s, 0.8 * s); c.moveTo(0.62 * s, 0.3 * s); c.arc(0.58 * s, 0.3 * s, 0.04 * s, 0, Math.PI * 2); },
  bowl(c, s) { c.moveTo(0.18 * s, 0.5 * s); c.lineTo(0.82 * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, 0.32 * s, 0, Math.PI); c.moveTo(0.62 * s, 0.44 * s); c.lineTo(0.86 * s, 0.14 * s); c.moveTo(0.56 * s, 0.44 * s); c.lineTo(0.76 * s, 0.12 * s); for (const x of [0.34, 0.46]) { c.moveTo(x * s, 0.42 * s); c.bezierCurveTo((x - 0.05) * s, 0.32 * s, (x + 0.05) * s, 0.26 * s, x * s, 0.16 * s); } },
  fish(c, s) { c.ellipse(0.45 * s, 0.5 * s, 0.26 * s, 0.15 * s, 0, 0, Math.PI * 2); c.moveTo(0.7 * s, 0.5 * s); c.lineTo(0.88 * s, 0.34 * s); c.lineTo(0.88 * s, 0.66 * s); c.closePath(); c.moveTo(0.32 * s, 0.47 * s); c.arc(0.3 * s, 0.47 * s, 0.02 * s, 0, Math.PI * 2); },
  eye(c, s) { c.moveTo(0.12 * s, 0.5 * s); c.quadraticCurveTo(0.5 * s, 0.14 * s, 0.88 * s, 0.5 * s); c.quadraticCurveTo(0.5 * s, 0.86 * s, 0.12 * s, 0.5 * s); c.moveTo(0.64 * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, 0.14 * s, 0, Math.PI * 2); c.moveTo(0.555 * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, 0.055 * s, 0, Math.PI * 2); },
  cross(c, s) { const a = 0.38, b = 0.62, e = 0.16, f = 0.84; c.moveTo(a * s, e * s); c.lineTo(b * s, e * s); c.lineTo(b * s, a * s); c.lineTo(f * s, a * s); c.lineTo(f * s, b * s); c.lineTo(b * s, b * s); c.lineTo(b * s, f * s); c.lineTo(a * s, f * s); c.lineTo(a * s, b * s); c.lineTo(e * s, b * s); c.lineTo(e * s, a * s); c.lineTo(a * s, a * s); c.closePath(); },
  heart(c, s) { c.moveTo(0.5 * s, 0.82 * s); c.bezierCurveTo(0.1 * s, 0.55 * s, 0.14 * s, 0.18 * s, 0.5 * s, 0.34 * s); c.bezierCurveTo(0.86 * s, 0.18 * s, 0.9 * s, 0.55 * s, 0.5 * s, 0.82 * s); },
  sake(c, s) { c.moveTo(0.36 * s, 0.14 * s); c.lineTo(0.44 * s, 0.14 * s); c.lineTo(0.44 * s, 0.3 * s); c.quadraticCurveTo(0.62 * s, 0.42 * s, 0.6 * s, 0.84 * s); c.lineTo(0.2 * s, 0.84 * s); c.quadraticCurveTo(0.18 * s, 0.42 * s, 0.36 * s, 0.3 * s); c.closePath(); c.moveTo(0.66 * s, 0.66 * s); c.lineTo(0.86 * s, 0.66 * s); c.lineTo(0.82 * s, 0.84 * s); c.lineTo(0.7 * s, 0.84 * s); c.closePath(); },
  bolt(c, s) { c.moveTo(0.58 * s, 0.1 * s); c.lineTo(0.28 * s, 0.54 * s); c.lineTo(0.5 * s, 0.54 * s); c.lineTo(0.42 * s, 0.9 * s); c.lineTo(0.74 * s, 0.42 * s); c.lineTo(0.52 * s, 0.42 * s); c.closePath(); },
  cat(c, s) { c.arc(0.5 * s, 0.56 * s, 0.26 * s, 0, Math.PI * 2); c.moveTo(0.3 * s, 0.4 * s); c.lineTo(0.28 * s, 0.14 * s); c.lineTo(0.46 * s, 0.31 * s); c.moveTo(0.7 * s, 0.4 * s); c.lineTo(0.72 * s, 0.14 * s); c.lineTo(0.54 * s, 0.31 * s); c.moveTo(0.42 * s, 0.52 * s); c.arc(0.4 * s, 0.52 * s, 0.02 * s, 0, Math.PI * 2); c.moveTo(0.62 * s, 0.52 * s); c.arc(0.6 * s, 0.52 * s, 0.02 * s, 0, Math.PI * 2); for (const d of [-1, 1]) { c.moveTo((0.5 + d * 0.1) * s, 0.64 * s); c.lineTo((0.5 + d * 0.4) * s, 0.6 * s); c.moveTo((0.5 + d * 0.1) * s, 0.68 * s); c.lineTo((0.5 + d * 0.4) * s, 0.72 * s); } },
  lotus(c, s) { c.moveTo(0.5 * s, 0.8 * s); c.bezierCurveTo(0.3 * s, 0.6 * s, 0.38 * s, 0.3 * s, 0.5 * s, 0.16 * s); c.bezierCurveTo(0.62 * s, 0.3 * s, 0.7 * s, 0.6 * s, 0.5 * s, 0.8 * s); c.moveTo(0.5 * s, 0.8 * s); c.bezierCurveTo(0.2 * s, 0.76 * s, 0.1 * s, 0.5 * s, 0.16 * s, 0.4 * s); c.bezierCurveTo(0.3 * s, 0.46 * s, 0.42 * s, 0.6 * s, 0.5 * s, 0.8 * s); c.moveTo(0.5 * s, 0.8 * s); c.bezierCurveTo(0.8 * s, 0.76 * s, 0.9 * s, 0.5 * s, 0.84 * s, 0.4 * s); c.bezierCurveTo(0.7 * s, 0.46 * s, 0.58 * s, 0.6 * s, 0.5 * s, 0.8 * s); },
  dice(c, s) { roundRect(c, 0.2 * s, 0.2 * s, 0.6 * s, 0.6 * s, 0.1 * s); for (const [x, y] of [[0.35, 0.35], [0.65, 0.35], [0.5, 0.5], [0.35, 0.65], [0.65, 0.65]]) { c.moveTo((x + 0.035) * s, y * s); c.arc(x * s, y * s, 0.035 * s, 0, Math.PI * 2); } },
};

function street(ctx, spec, w, h) {
  const color = spec.color;
  const inset = Math.min(w, h) * 0.12;
  if (spec.style === "backlit") {
    // A lit box: a pale-to-full panel, dark letters, a thin dark frame.
    ctx.fillStyle = "#0a0808";
    ctx.fillRect(0, 0, w, h);
    const fr = Math.min(w, h) * 0.07;
    const g = ctx.createLinearGradient(0, fr, 0, h - fr);
    g.addColorStop(0, lighten(color, 0.55));
    g.addColorStop(0.5, lighten(color, 0.2));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(fr, fr, w - fr * 2, h - fr * 2);
    const ink = `#${new THREE.Color(color).multiplyScalar(0.12).getHexString()}`;
    layout(ctx, spec, w, h, inset + fr * 0.5, (text, x, y, px, weight) => {
      ctx.font = FONT(weight, px);
      ctx.fillStyle = ink;
      ctx.fillText(text, x, y);
    }, 800);
    return;
  }
  board(ctx, w, h);
  if (spec.style === "led") {
    // Bulbs: the words set small, then every lit pixel drawn as a dot, on a
    // grid of dark ones.
    const pitch = Math.max(3, Math.round(Math.min(w, h) / 14));
    const cols = Math.floor(w / pitch);
    const rows = Math.floor(h / pitch);
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const oc = off.getContext("2d");
    oc.fillStyle = "#000";
    oc.fillRect(0, 0, cols, rows);
    oc.fillStyle = "#fff";
    layout(oc, spec, cols, rows, 1, (text, x, y, px) => {
      oc.font = FONT(700, px);
      oc.fillText(text, x, y);
    }, 700);
    const lit = oc.getImageData(0, 0, cols, rows).data;
    const r = pitch * 0.34;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const on = lit[(j * cols + i) * 4] > 110;
        ctx.fillStyle = on ? lighten(color, 0.35) : "rgba(255,255,255,0.05)";
        ctx.shadowColor = color;
        ctx.shadowBlur = on ? pitch * 0.9 : 0;
        ctx.beginPath();
        ctx.arc((i + 0.5) * (w / cols), (j + 0.5) * (h / rows), r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    return;
  }
  if (spec.style === "icon") {
    const s = Math.min(w, h);
    const tw = Math.max(2, s * 0.045);
    strokeTube(ctx, color, tw, () => roundRect(ctx, s * 0.06, s * 0.06, w - s * 0.12, h - s * 0.12, s * 0.12));
    ctx.save();
    ctx.translate((w - s) / 2, (h - s) / 2);
    if (spec.icon === "yen") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      tube(ctx, "¥", s / 2, s * 0.53, Math.floor(s * 0.62), color, 800);
    } else {
      strokeTube(ctx, color, Math.max(2, s * 0.05), () => ICONS[spec.icon]?.(ctx, s));
    }
    ctx.restore();
    return;
  }
  if (spec.style === "outline") {
    const tw = Math.max(2, Math.min(w, h) * 0.05);
    const m = Math.min(w, h) * 0.08;
    strokeTube(ctx, color, tw, () => roundRect(ctx, m, m, w - m * 2, h - m * 2, Math.min(w, h) * 0.14));
  }
  layout(ctx, spec, w, h, inset + (spec.style === "outline" ? Math.min(w, h) * 0.06 : 0), (text, x, y, px, weight) => {
    tube(ctx, text, x, y, px, color, weight);
  }, 700);
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
  street,
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
export function createSigns(meshes, shared, { maxAnisotropy = 4, reduced = false, atlas = 4096, density = 1 } = {}) {
  // 4096 square on a desktop; a phone gets 2048 at half the pixels a metre.
  const ATLAS = atlas;
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
    const ppm = (spec.ppm ?? PX_PER_M) * density;
    let pw = Math.round(w * ppm);
    let ph = Math.round(h * ppm);
    const scale = Math.min(1, (ATLAS / 4) / Math.max(pw, ph), Math.max(1, (32 * density + 32) / Math.min(pw, ph)));
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
    sources.push({ mesh, color: new THREE.Color(spec.color), intensity: spec.draw === "board" ? 0.9 : 1.6 });
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
