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
import { WORLD_SIGNS, CANYON_WORDS, STREET_SIGNS, towers } from "../data/world.js";
import { MORE_STREET_SIGNS } from "./sign-words.js";

// The street signs' metres (w x h), SIGN_SIZES in src/data/world.js and the
// builder's ST_SIZES. Copied, not imported: data/world.js is in the entry
// chunk, and reading an export it does not otherwise use would keep it
// there and change the entry's bytes.
const SIGN_SIZES = { bs: [0.8, 2.0], bm: [1.0, 3.2], bl: [1.2, 5.0], ps: [1.8, 0.8], pm: [2.8, 1.2], bx: [1.2, 1.2] };
// Every design of each size: the entry's list, then this chunk's.
const STREET_DESIGNS = Object.fromEntries(Object.entries(STREET_SIGNS).map(([k, list]) => [k, [...list, ...(MORE_STREET_SIGNS[k] ?? [])]]));
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
    const list = STREET_DESIGNS[street[1]];
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

// A colour at a share of its light, and a lit panel's colour: every sign
// is shown at one gain (GAIN, the material's uIntensity), and a panel in
// a light colour (yellow, green, white, cyan) came out of it far over
// white, a pale slab with the bloom over its lettering. So a panel is
// drawn as bright as it can be and stay a colour: its own, scaled so that
// after the gain its luminance is `level` (about 1 is where the bloom
// starts). A dark colour (red, blue, magenta) is under that already and is
// left whole.
const GAIN = 2.3;
function dim(hex, share) {
  return `#${new THREE.Color(hex).multiplyScalar(share).getHexString()}`;
}
function panel(hex, level) {
  const c = new THREE.Color(hex);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return `#${c.multiplyScalar(Math.min(1, level / (GAIN * Math.max(lum, 1e-3)))).getHexString()}`;
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
  pill(c, s) { c.moveTo(0.36 * s, 0.24 * s); c.arc(0.36 * s, 0.5 * s, 0.26 * s * 0.6, -Math.PI / 2, Math.PI / 2, true); c.lineTo(0.64 * s, 0.656 * s); c.arc(0.64 * s, 0.5 * s, 0.156 * s, Math.PI / 2, -Math.PI / 2, true); c.closePath(); c.moveTo(0.5 * s, 0.344 * s); c.lineTo(0.5 * s, 0.656 * s); },
  chip(c, s) { roundRect(c, 0.3 * s, 0.3 * s, 0.4 * s, 0.4 * s, 0.04 * s); for (const t of [0.38, 0.5, 0.62]) { c.moveTo(t * s, 0.3 * s); c.lineTo(t * s, 0.16 * s); c.moveTo(t * s, 0.7 * s); c.lineTo(t * s, 0.84 * s); c.moveTo(0.3 * s, t * s); c.lineTo(0.16 * s, t * s); c.moveTo(0.7 * s, t * s); c.lineTo(0.84 * s, t * s); } },
  star(c, s) { for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = (i % 2 ? 0.16 : 0.36) * s; const x = 0.5 * s + Math.cos(a) * r; const y = 0.53 * s + Math.sin(a) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); } },
  moon(c, s) { c.arc(0.5 * s, 0.5 * s, 0.32 * s, 0.6, Math.PI * 2 - 0.6, false); c.arc(0.62 * s, 0.5 * s, 0.25 * s, Math.PI * 2 - 1.1, 1.1, true); c.closePath(); },
  arrow(c, s) { c.moveTo(0.16 * s, 0.5 * s); c.lineTo(0.78 * s, 0.5 * s); c.moveTo(0.56 * s, 0.28 * s); c.lineTo(0.8 * s, 0.5 * s); c.lineTo(0.56 * s, 0.72 * s); },
  umbrella(c, s) { c.moveTo(0.16 * s, 0.5 * s); c.quadraticCurveTo(0.5 * s, 0.02 * s, 0.84 * s, 0.5 * s); c.lineTo(0.16 * s, 0.5 * s); c.moveTo(0.5 * s, 0.5 * s); c.lineTo(0.5 * s, 0.78 * s); c.quadraticCurveTo(0.5 * s, 0.86 * s, 0.42 * s, 0.84 * s); },
  note(c, s) { c.moveTo(0.44 * s, 0.72 * s); c.arc(0.36 * s, 0.72 * s, 0.08 * s, 0, Math.PI * 2); c.moveTo(0.44 * s, 0.72 * s); c.lineTo(0.44 * s, 0.2 * s); c.lineTo(0.72 * s, 0.14 * s); c.lineTo(0.72 * s, 0.64 * s); c.moveTo(0.8 * s, 0.64 * s); c.arc(0.64 * s + 0.0 * s, 0.64 * s, 0.08 * s, 0, Math.PI * 2); },
  waves(c, s) { for (const y of [0.34, 0.5, 0.66]) { c.moveTo(0.16 * s, y * s); for (let i = 1; i <= 4; i++) c.quadraticCurveTo((0.16 + (i - 0.5) * 0.17) * s, (y + (i % 2 ? -0.07 : 0.07)) * s, (0.16 + i * 0.17) * s, y * s); } },
  dice(c, s) { roundRect(c, 0.2 * s, 0.2 * s, 0.6 * s, 0.6 * s, 0.1 * s); for (const [x, y] of [[0.35, 0.35], [0.65, 0.35], [0.5, 0.5], [0.35, 0.65], [0.65, 0.65]]) { c.moveTo((x + 0.035) * s, y * s); c.arc(x * s, y * s, 0.035 * s, 0, Math.PI * 2); } },
  key(c, s) { c.moveTo(0.48 * s, 0.5 * s); c.arc(0.34 * s, 0.5 * s, 0.14 * s, 0, Math.PI * 2); c.lineTo(0.84 * s, 0.5 * s); c.moveTo(0.7 * s, 0.5 * s); c.lineTo(0.7 * s, 0.63 * s); c.moveTo(0.8 * s, 0.5 * s); c.lineTo(0.8 * s, 0.6 * s); },
  cup(c, s) { c.moveTo(0.24 * s, 0.42 * s); c.lineTo(0.28 * s, 0.78 * s); c.lineTo(0.62 * s, 0.78 * s); c.lineTo(0.66 * s, 0.42 * s); c.closePath(); c.moveTo(0.66 * s, 0.48 * s); c.arc(0.66 * s, 0.58 * s, 0.1 * s, -Math.PI / 2, Math.PI / 2); for (const x of [0.36, 0.52]) { c.moveTo(x * s, 0.32 * s); c.quadraticCurveTo((x - 0.05) * s, 0.25 * s, (x + 0.02) * s, 0.17 * s); } },
  gear(c, s) { for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; c.moveTo((0.5 + 0.24 * Math.cos(a)) * s, (0.5 + 0.24 * Math.sin(a)) * s); c.lineTo((0.5 + 0.35 * Math.cos(a)) * s, (0.5 + 0.35 * Math.sin(a)) * s); } c.moveTo(0.74 * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, 0.24 * s, 0, Math.PI * 2); c.moveTo(0.59 * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, 0.09 * s, 0, Math.PI * 2); },
  flame(c, s) { c.moveTo(0.5 * s, 0.14 * s); c.bezierCurveTo(0.84 * s, 0.44 * s, 0.76 * s, 0.84 * s, 0.5 * s, 0.86 * s); c.bezierCurveTo(0.24 * s, 0.84 * s, 0.18 * s, 0.5 * s, 0.4 * s, 0.4 * s); c.bezierCurveTo(0.42 * s, 0.5 * s, 0.5 * s, 0.46 * s, 0.5 * s, 0.14 * s); c.moveTo(0.5 * s, 0.58 * s); c.quadraticCurveTo(0.6 * s, 0.72 * s, 0.5 * s, 0.8 * s); c.quadraticCurveTo(0.4 * s, 0.72 * s, 0.5 * s, 0.58 * s); },
  anchor(c, s) { c.moveTo(0.56 * s, 0.24 * s); c.arc(0.5 * s, 0.24 * s, 0.06 * s, 0, Math.PI * 2); c.moveTo(0.5 * s, 0.3 * s); c.lineTo(0.5 * s, 0.82 * s); c.moveTo(0.36 * s, 0.42 * s); c.lineTo(0.64 * s, 0.42 * s); c.moveTo(0.22 * s, 0.6 * s); c.quadraticCurveTo(0.26 * s, 0.84 * s, 0.5 * s, 0.82 * s); c.quadraticCurveTo(0.74 * s, 0.84 * s, 0.78 * s, 0.6 * s); },
  gem(c, s) { c.moveTo(0.3 * s, 0.26 * s); c.lineTo(0.7 * s, 0.26 * s); c.lineTo(0.86 * s, 0.44 * s); c.lineTo(0.5 * s, 0.84 * s); c.lineTo(0.14 * s, 0.44 * s); c.closePath(); c.moveTo(0.14 * s, 0.44 * s); c.lineTo(0.86 * s, 0.44 * s); for (const x of [0.3, 0.7]) { c.moveTo(x * s, 0.26 * s); c.lineTo((0.5 + (x - 0.5) * 0.5) * s, 0.44 * s); c.lineTo(0.5 * s, 0.84 * s); } },
  clock(c, s) { c.moveTo(0.82 * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, 0.32 * s, 0, Math.PI * 2); c.moveTo(0.5 * s, 0.28 * s); c.lineTo(0.5 * s, 0.5 * s); c.lineTo(0.66 * s, 0.58 * s); },
  signal(c, s) { c.moveTo(0.54 * s, 0.76 * s); c.arc(0.5 * s, 0.76 * s, 0.04 * s, 0, Math.PI * 2); for (const r of [0.17, 0.31, 0.45]) { c.moveTo((0.5 - r * Math.SQRT1_2) * s, (0.76 - r * Math.SQRT1_2) * s); c.arc(0.5 * s, 0.76 * s, r * s, -Math.PI * 0.75, -Math.PI * 0.25); } },
};

function street(ctx, spec, w, h) {
  const color = spec.color;
  const inset = Math.min(w, h) * 0.12;
  if (spec.style === "backlit") {
    // A lit box: a panel in its colour held where the gain leaves it a
    // colour, not white (panel()), near-black letters, a thin dark frame.
    ctx.fillStyle = "#0a0808";
    ctx.fillRect(0, 0, w, h);
    const fr = Math.min(w, h) * 0.07;
    const g = ctx.createLinearGradient(0, fr, 0, h - fr);
    g.addColorStop(0, panel(color, 1.1));
    g.addColorStop(1, panel(color, 0.8));
    ctx.fillStyle = g;
    ctx.fillRect(fr, fr, w - fr * 2, h - fr * 2);
    const ink = dim(color, 0.012);
    layout(ctx, spec, w, h, inset + fr * 0.5, (text, x, y, px, weight) => {
      ctx.font = FONT(weight, px);
      ctx.fillStyle = ink;
      ctx.fillText(text, x, y);
    }, 800);
    return;
  }
  board(ctx, w, h);
  if (spec.style === "led") {
    // Bulbs: a grid of dark ones, the words lit across it, and the grid's
    // own lines cut back into the light. (The words are drawn whole: a
    // sign this size has a dozen rows of bulbs, too few to spell with, and
    // letters set in them lost their first strokes.)
    const pitch = Math.max(3, Math.round(Math.min(w, h) / 14));
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = pitch / 2; y < h; y += pitch) {
      for (let x = pitch / 2; x < w; x += pitch) {
        ctx.beginPath();
        ctx.arc(x, y, pitch * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowColor = color;
    ctx.shadowBlur = pitch * 0.9;
    layout(ctx, spec, w, h, inset, (text, x, y, px) => {
      ctx.font = FONT(700, px);
      ctx.fillStyle = lighten(color, 0.35);
      ctx.fillText(text, x, y);
    }, 700);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let x = 0; x < w; x += pitch) ctx.fillRect(Math.round(x), 0, 1, h);
    for (let y = 0; y < h; y += pitch) ctx.fillRect(0, Math.round(y), w, 1);
    return;
  }
  if (spec.style === "icon") {
    const s = Math.min(w, h);
    const tw = Math.max(2, s * 0.045);
    // The box's own shape in tube: a square with round corners, or a
    // disc, a lozenge, a hexagon, a square with its corners cut (the
    // pictogram drawn smaller, to sit inside it).
    const cx = w / 2;
    const cy = h / 2;
    const [sides, turn, fit] = { disc: [48, 0, 0.8], lozenge: [4, 0, 0.6], hex: [6, 0, 0.72], cut: [8, Math.PI / 8, 0.86] }[spec.frame] ?? [0, 0, 1];
    strokeTube(ctx, color, tw, () => {
      if (!sides) return roundRect(ctx, s * 0.06, s * 0.06, w - s * 0.12, h - s * 0.12, s * 0.12);
      const r = (s * 0.45) / (sides === 8 ? Math.cos(Math.PI / 8) : 1);
      for (let i = 0; i <= sides; i++) {
        const a = turn + (i * Math.PI * 2) / sides - Math.PI / 2;
        ctx[i ? "lineTo" : "moveTo"](cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
    });
    ctx.save();
    ctx.translate(cx - (s * fit) / 2, cy - (s * fit) / 2);
    ctx.scale(fit, fit);
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
    // A word break is half a letter's height with a point of tube in it:
    // ROBERT·DEFALCO·REALTY, not ROBERTDEFALCOREALTY.
    const chars = [...spec.lines[0].trim().replace(/\s+/g, " ")];
    const size = (c) => (c === " " ? 0.55 : 1);
    const units = chars.reduce((u, c) => u + size(c), 0);
    const reserve = spec.icon ? w * 1.1 : 0;
    const step = Math.min((h - reserve - w * 0.4) / units, w * 0.95);
    const px = Math.floor(step * (spec.latin ? 0.78 : 0.86));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let y = (h - reserve - step * units) / 2;
    for (const c of chars) {
      const mid = y + (step * size(c)) / 2;
      if (c === " ") {
        ctx.fillStyle = spec.color;
        ctx.shadowColor = spec.color;
        ctx.shadowBlur = step * 0.2;
        ctx.beginPath();
        ctx.arc(w / 2, mid, Math.max(1.5, step * 0.075), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        tube(ctx, c, w / 2, mid, Math.min(px, w * 0.8), spec.color);
      }
      y += step * size(c);
    }
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
    g.addColorStop(0, panel(spec.color, 1.1));
    g.addColorStop(1, panel(spec.color, 0.8));
    ctx.fillStyle = g;
    ctx.fillRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = dim(spec.color, 0.012);
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
export function createSigns(meshes, shared, { maxAnisotropy = 4, reduced = false, atlas = 4096, density = 1, overrides = null, allStreet = false } = {}) {
  // 4096 wide on a desktop; a phone gets 2048 at half the pixels a metre.
  // Only as tall as the packed signs need (a power of two): the square
  // atlas was more than half empty, and a 4096 square with its mipmaps is
  // some 85 MB of video memory.
  const ATLAS = atlas;

  // One cell per distinct sign, sized from the face's metres. With
  // `allStreet`, a cell for every design of the street's standard signs as
  // well, whether or not a face here uses it: the districts that stream in
  // later (addFaces) bring faces that need them.
  const cells = new Map();
  const faces = [];
  const cellFor = (spec, w, h) => {
    if (cells.has(spec.key)) return;
    const ppm = (spec.ppm ?? PX_PER_M) * density;
    let pw = Math.round(w * ppm);
    let ph = Math.round(h * ppm);
    const scale = Math.min(1, (ATLAS / 4) / Math.max(pw, ph), Math.max(1, (32 * density + 32) / Math.min(pw, ph)));
    pw = Math.max(24, Math.round(pw * scale));
    ph = Math.max(24, Math.round(ph * scale));
    cells.set(spec.key, { spec, pw, ph });
  };
  if (allStreet) {
    for (const [size, list] of Object.entries(STREET_DESIGNS)) {
      const [w, h] = SIGN_SIZES[size];
      list.forEach((_, i) => cellFor(signSpec(`st_${size}_${i}`), w, h));
    }
  }
  for (const mesh of meshes) {
    const id = mesh.name.replace(/^sign_/, "");
    // A caller may reword a sign (the braindance puts Ali's work on a few of
    // the avenue's); the face, its colour and its light stay the kit's.
    const base = id.replace(/_b$/, "").replace(/_far$/, "");
    const spec = overrides?.[base] ? { ...signSpec(id), ...overrides[base], key: `${base}_bd` } : signSpec(id);
    if (!spec) continue;
    const w = mesh.userData.w || 1;
    const h = mesh.userData.h || 1;
    faces.push({ mesh, spec });
    cellFor(spec, w, h);
  }

  // Shelf packing, tallest first: laid out, then drawn on a canvas as tall
  // as the layout.
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
  }
  const HEIGHT = Math.min(ATLAS, 2 ** Math.ceil(Math.log2(Math.max(256, y + shelf))));
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ATLAS, HEIGHT);
  for (const c of order) {
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
  // Each face's frame is kept too (its world corner at uv 0,0, its edges to
  // 1,0 and 0,1, the way it faces, and its cell), for the floors that trace
  // a sign's reflection (src/world/wet.js).
  let indexBase = 0;
  const build = (faces) => {
    const geos = [];
    const sources = [];
    const frames = [];
    faces.forEach(({ mesh, spec }, k) => {
      const index = indexBase + k;
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
        U[i * 2 + 1] = (cell.y + t * cell.ph) / HEIGHT;
        S[i * 2] = index;
        S[i * 2 + 1] = spec.flicker && !reduced ? 1 : 0;
      }
      const sides = new Map();
      for (let i = 0; i < n; i++) {
        const key = [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]].map((c) => Math.round(c * 4)).join();
        if (!sides.has(key)) sides.set(key, { normal: new THREE.Vector3(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]), at: [] });
        sides.get(key).at.push([uv.getX(i), uv.getY(i), new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])]);
      }
      for (const { normal, at } of sides.values()) {
        const corner = (u, t) => at.find(([a, b]) => Math.abs(a - u) < 1e-3 && Math.abs(b - t) < 1e-3)?.[2];
        const o = corner(0, 0);
        const a = corner(1, 0);
        const b = corner(0, 1);
        if (!o || !a || !b) continue;
        frames.push({
          name: mesh.name,
          corner: o,
          u: a.clone().sub(o),
          v: b.clone().sub(o),
          normal,
          atlas: new THREE.Vector4(cell.x / ATLAS, cell.y / HEIGHT, cell.pw / ATLAS, cell.ph / HEIGHT),
          color: new THREE.Color(spec.color),
          sign: [index, spec.flicker && !reduced ? 1 : 0],
        });
      }
      g.setAttribute("position", new THREE.BufferAttribute(P, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(U, 2));
      g.setAttribute("aSign", new THREE.BufferAttribute(S, 2));
      if (src.index) g.setIndex(src.index.clone());
      geos.push(g);
      sources.push({ mesh, color: new THREE.Color(spec.color), intensity: spec.draw === "board" ? 0.9 : 1.6 });
    });
    indexBase += faces.length;
    const geometry = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    return { geometry, sources, frames };
  };
  const { geometry, sources, frames } = build(faces);

  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uAtlas: { value: texture }, uIntensity: { value: GAIN } },
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
        // White tubes bloom far harder than coloured ones at the same gain:
        // the near-white parts of a sign are eased, the saturated left.
        float sat = max(tex.r, max(tex.g, tex.b)) - min(tex.r, min(tex.g, tex.b));
        float white = mix(0.62, 1.0, smoothstep(0.05, 0.4, sat / max(max(tex.r, max(tex.g, tex.b)), 1e-3)));
        vec3 col = tex * uIntensity * white * breathe * (1.0 - 0.82 * cut);
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

  const extra = [];
  return {
    mesh,
    texture,
    sources,
    frames,
    /** More faces on the same atlas and material (a streamed district's):
     *  their own mesh, and their light for the bake. Faces whose design has
     *  no cell (a word-sign the core did not carry) are left out. */
    addFaces(more) {
      const list = [];
      for (const m of more) {
        const spec = signSpec(m.name.replace(/^sign_/, ""));
        if (spec && cells.has(spec.key) && cells.get(spec.key).x !== undefined) list.push({ mesh: m, spec });
      }
      if (!list.length) return null;
      const built = build(list);
      const add = new THREE.Mesh(built.geometry, material);
      add.name = "signs_more";
      add.frustumCulled = false;
      extra.push(built.geometry);
      return { mesh: add, sources: built.sources };
    },
    dispose() {
      geometry.dispose();
      for (const g of extra) g.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
