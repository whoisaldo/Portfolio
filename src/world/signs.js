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
import { joinSteps } from "./merge.js";
import { WORLD_SIGNS, CANYON_WORDS, STREET_SIGNS, towers } from "../data/world.js";
import { MORE_STREET_SIGNS } from "./sign-words.js";
import { clearSigns, postSign, tradeOf } from "./trades.js";

// The street signs' metres (w x h), SIGN_SIZES in src/data/world.js and the
// builder's ST_SIZES. Copied, not imported: data/world.js is in the entry
// chunk, and reading an export it does not otherwise use would keep it
// there and change the entry's bytes.
const SIGN_SIZES = { bs: [0.8, 2.0], bm: [1.0, 3.2], bl: [1.2, 5.0], ps: [1.8, 0.8], pm: [2.8, 1.2], bx: [1.2, 1.2] };
// Every design of each size: the entry's list, then this chunk's.
const STREET_DESIGNS = Object.fromEntries(Object.entries(STREET_SIGNS).map(([k, list]) => [k, [...list, ...(MORE_STREET_SIGNS[k] ?? [])]]));
// How many designs a size had when the builder's turn alone picked one: the
// avenue's own signs (the hero's street) still take that turn among these.
const OLD_COUNT = { bs: 20, bm: 22, bl: 16, ps: 16, pm: 16, bx: 28 };
// What a design is to somebody reading the street: its icon, or its first
// word (HOSTEL on a small panel and HOSTEL over 宿 on a big one are one
// name; so are OPEN 24H and OPEN LATE, VR ROOMS and VR ARCADE).
const nameOf = (d) => {
  if (d.icon) return `icon:${d.icon}`;
  const word = d.lines[0].toUpperCase().replace(/[^A-Z0-9 ]/g, " ").trim().split(/\s+/)[0];
  return word ? word.replace(/(?<=.{4})S$/, "") : d.lines[0];
};
const STREET_NAMES = Object.fromEntries(Object.entries(STREET_DESIGNS).map(([k, list]) => [k, list.map(nameOf)]));
// A design's hue as the street reads it from a block off: 0 red, 1 amber
// and yellow, 2 green, 3 cyan, 4 blue and violet, 5 pink; -1 a white one,
// which goes with any.
const hueOf = (d) => {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(d.color).getHSL(hsl);
  const h = hsl.h * 360;
  return [hsl.s < 0.3 ? -1 : h < 26 || h >= 345 ? 0 : h < 70 ? 1 : h < 160 ? 2 : h < 200 ? 3 : h < 290 ? 4 : 5, h];
};
const STREET_HUES = Object.fromEntries(Object.entries(STREET_DESIGNS).map(([k, list]) => [k, list.map(hueOf)]));
// Each family's own angle, in degrees, and a colour turned about the grey
// axis by a share of a full turn (as the signs' shader turns a face's).
const HUE_AT = [4, 42, 140, 186, 262, 322];
const turned = (color, turn) => {
  const a = turn * Math.PI * 2;
  const co = Math.cos(a);
  const si = Math.sin(a) / Math.sqrt(3);
  const m = ((color.r + color.g + color.b) / 3) * (1 - co);
  const out = new THREE.Color(Math.max(0, color.r * co + (color.b - color.g) * si + m), Math.max(0, color.g * co + (color.r - color.b) * si + m), Math.max(0, color.b * co + (color.g - color.r) * si + m));
  // (Held near its own brightness: a yellow turned to pink would be a
  // third as bright, and a street of them a darker street.)
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return out.multiplyScalar(Math.min(1.7, Math.max(0.75, lum(color) / Math.max(lum(out), 1e-3))));
};
// The two hues a block's standard signs keep to (with white), so that a
// street's far end is two or three colours and not every hue at once: pink
// with cyan, amber with cyan, red with amber, pink with violet, cyan with
// violet, amber with pink, green with pink, red with cyan. A block is 160 m
// a side. The avenue is named. Its first 128 m north of the hero's lens,
// and the arm behind it, keep every hue (null): those signs are few and
// large in the page's first frame, which fades in from a painted plate in
// all of them, and held to two hues that frame lost a twentieth of its
// light. All of it north of that, its canyon, is amber with cyan, the
// show's own pair, so the far end of the street is two colours and white.
// Corpo Plaza, junction F and Corpo Row's west end are green with amber, the
// show's corpo pair (their blocks dealt pink with cyan and pink with violet).
const BLOCK_HUES = [[5, 3], [1, 3], [0, 1], [5, 4], [3, 4], [1, 5], [2, 5], [0, 3]];
const blockHues = (x, z) => {
  if (Math.abs(x) < 40) return z > -128 ? null : [1, 3];
  if (x > 46 && x < 172 && z < -10 && z > -460) return [2, 1];
  const n = Math.abs(Math.sin(Math.floor(x / 160) * 127.1 + Math.floor(z / 160) * 311.7) * 43758.5453);
  return BLOCK_HUES[Math.floor((n - Math.floor(n)) * BLOCK_HUES.length)];
};
import { COMMON } from "./glsl.js";

// A generator run to its end, and what it returned.
const drain = (steps) => {
  let r;
  while (!(r = steps.next()).done);
  return r.value;
};

const PX_PER_M = 46;
const PAD = 6;
export const FONT = (weight, px) =>
  `${weight} ${px}px "Chakra Petch", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", "Meiryo", sans-serif`;

/** The words for a sign id, or null for a face with nothing to say. */
export function signSpec(id, pick = null) {
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
    // (pick: the design the dealer in createSigns chose for where the
    // sign hangs; without one, the builder's turn.)
    const i = pick ?? Number(street[2]) % (OLD_COUNT[street[1]] ?? list.length);
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

/** A lit box's face: acrylic over tubes. The panel's colour (panel()),
 * a little brighter over each tube and darker between them, now and then a
 * bay gone dim, the frame's shadow round its edge and a keyline inside it:
 * a flat fill of one colour reads as a card, not a box with light in it. */
function lightbox(ctx, x, y, w, h, color, seed) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, panel(color, 1.1));
  g.addColorStop(1, panel(color, 0.8));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const wide = w >= h;
  const n = Math.max(2, Math.round(((wide ? w / h : h / w)) * 1.5));
  for (let i = 0; i < n; i++) {
    const a = i / n;
    const b = (i + 1) / n;
    const band = wide ? ctx.createLinearGradient(x + a * w, 0, x + b * w, 0) : ctx.createLinearGradient(0, y + a * h, 0, y + b * h);
    const dead = (seed * 7 + i * 13) % 11 === 0;
    band.addColorStop(0, "rgba(0,0,0,0.2)");
    band.addColorStop(0.5, dead ? "rgba(0,0,0,0.36)" : "rgba(255,255,255,0.07)");
    band.addColorStop(1, "rgba(0,0,0,0.2)");
    ctx.fillStyle = band;
    if (wide) ctx.fillRect(x + a * w, y, w / n + 1, h);
    else ctx.fillRect(x, y + a * h, w, h / n + 1);
  }
  const e = Math.min(w, h) * 0.12;
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[x, 0, x + e, 0, x, y, e, h], [x + w, 0, x + w - e, 0, x + w - e, y, e, h], [0, y, 0, y + e, x, y, w, e], [0, y + h, 0, y + h - e, x, y + h - e, w, e]]) {
    const shade = ctx.createLinearGradient(x0, y0, x1, y1);
    shade.addColorStop(0, "rgba(0,0,0,0.42)");
    shade.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shade;
    ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.02);
  ctx.strokeRect(x + e * 0.5, y + e * 0.5, w - e, h - e);
}

function seedOf(spec) {
  let n = 0;
  for (const line of spec.lines ?? []) for (let i = 0; i < line.length; i++) n = (n * 31 + line.charCodeAt(i)) % 9973;
  return n;
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

export const ICONS = {
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
  leaf(c, s) { c.moveTo(0.2 * s, 0.8 * s); c.quadraticCurveTo(0.2 * s, 0.3 * s, 0.8 * s, 0.2 * s); c.quadraticCurveTo(0.7 * s, 0.75 * s, 0.2 * s, 0.8 * s); c.lineTo(0.62 * s, 0.38 * s); },
  drop(c, s) { c.moveTo(0.5 * s, 0.14 * s); c.bezierCurveTo(0.8 * s, 0.5 * s, 0.76 * s, 0.84 * s, 0.5 * s, 0.84 * s); c.bezierCurveTo(0.24 * s, 0.84 * s, 0.2 * s, 0.5 * s, 0.5 * s, 0.14 * s); },
  bell(c, s) { c.moveTo(0.22 * s, 0.7 * s); c.lineTo(0.78 * s, 0.7 * s); c.quadraticCurveTo(0.68 * s, 0.6 * s, 0.68 * s, 0.44 * s); c.arc(0.5 * s, 0.44 * s, 0.18 * s, 0, Math.PI, true); c.quadraticCurveTo(0.32 * s, 0.6 * s, 0.22 * s, 0.7 * s); c.moveTo(0.56 * s, 0.78 * s); c.arc(0.5 * s, 0.78 * s, 0.06 * s, 0, Math.PI); c.moveTo(0.5 * s, 0.26 * s); c.lineTo(0.5 * s, 0.18 * s); },
  wrench(c, s) { c.arc(0.68 * s, 0.32 * s, 0.16 * s, -Math.PI * 0.25 + 0.6, -Math.PI * 0.25 - 0.6 + Math.PI * 2); c.moveTo(0.57 * s, 0.43 * s); c.lineTo(0.22 * s, 0.78 * s); },
  ticket(c, s) { roundRect(c, 0.16 * s, 0.32 * s, 0.68 * s, 0.36 * s, 0.05 * s); c.moveTo(0.62 * s, 0.34 * s); c.lineTo(0.62 * s, 0.66 * s); c.moveTo(0.42 * s, 0.5 * s); c.arc(0.36 * s, 0.5 * s, 0.06 * s, 0, Math.PI * 2); },
  house(c, s) { c.moveTo(0.18 * s, 0.5 * s); c.lineTo(0.5 * s, 0.2 * s); c.lineTo(0.82 * s, 0.5 * s); c.moveTo(0.26 * s, 0.46 * s); c.lineTo(0.26 * s, 0.8 * s); c.lineTo(0.74 * s, 0.8 * s); c.lineTo(0.74 * s, 0.46 * s); c.moveTo(0.44 * s, 0.8 * s); c.lineTo(0.44 * s, 0.6 * s); c.lineTo(0.56 * s, 0.6 * s); c.lineTo(0.56 * s, 0.8 * s); },
  bottle(c, s) { c.moveTo(0.44 * s, 0.14 * s); c.lineTo(0.56 * s, 0.14 * s); c.lineTo(0.56 * s, 0.32 * s); c.quadraticCurveTo(0.68 * s, 0.4 * s, 0.68 * s, 0.52 * s); c.lineTo(0.68 * s, 0.84 * s); c.lineTo(0.32 * s, 0.84 * s); c.lineTo(0.32 * s, 0.52 * s); c.quadraticCurveTo(0.32 * s, 0.4 * s, 0.44 * s, 0.32 * s); c.closePath(); c.moveTo(0.32 * s, 0.56 * s); c.lineTo(0.68 * s, 0.56 * s); c.moveTo(0.32 * s, 0.72 * s); c.lineTo(0.68 * s, 0.72 * s); },
  paw(c, s) { c.ellipse(0.5 * s, 0.64 * s, 0.17 * s, 0.13 * s, 0, 0, Math.PI * 2); for (const [x, y] of [[0.28, 0.44], [0.42, 0.32], [0.58, 0.32], [0.72, 0.44]]) { c.moveTo((x + 0.06) * s, y * s); c.arc(x * s, y * s, 0.06 * s, 0, Math.PI * 2); } },
  plug(c, s) { c.moveTo(0.38 * s, 0.14 * s); c.lineTo(0.38 * s, 0.32 * s); c.moveTo(0.62 * s, 0.14 * s); c.lineTo(0.62 * s, 0.32 * s); c.moveTo(0.28 * s, 0.32 * s); c.lineTo(0.72 * s, 0.32 * s); c.lineTo(0.72 * s, 0.48 * s); c.quadraticCurveTo(0.72 * s, 0.66 * s, 0.5 * s, 0.66 * s); c.quadraticCurveTo(0.28 * s, 0.66 * s, 0.28 * s, 0.48 * s); c.closePath(); c.moveTo(0.5 * s, 0.66 * s); c.lineTo(0.5 * s, 0.88 * s); },
  book(c, s) { c.moveTo(0.5 * s, 0.28 * s); c.quadraticCurveTo(0.34 * s, 0.2 * s, 0.16 * s, 0.26 * s); c.lineTo(0.16 * s, 0.74 * s); c.quadraticCurveTo(0.34 * s, 0.68 * s, 0.5 * s, 0.76 * s); c.quadraticCurveTo(0.66 * s, 0.68 * s, 0.84 * s, 0.74 * s); c.lineTo(0.84 * s, 0.26 * s); c.quadraticCurveTo(0.66 * s, 0.2 * s, 0.5 * s, 0.28 * s); c.lineTo(0.5 * s, 0.76 * s); },
  signal(c, s) { c.moveTo(0.54 * s, 0.76 * s); c.arc(0.5 * s, 0.76 * s, 0.04 * s, 0, Math.PI * 2); for (const r of [0.17, 0.31, 0.45]) { c.moveTo((0.5 - r * Math.SQRT1_2) * s, (0.76 - r * Math.SQRT1_2) * s); c.arc(0.5 * s, 0.76 * s, r * s, -Math.PI * 0.75, -Math.PI * 0.25); } },
  // (Round 8: more pictograms, so a column of square signs is not the same
  // half dozen down every street.)
  skull(c, s) { c.moveTo(0.316 * s, 0.644 * s); c.arc(0.5 * s, 0.46 * s, 0.26 * s, Math.PI * 0.75, Math.PI * 2.25); c.lineTo(0.62 * s, 0.78 * s); c.lineTo(0.38 * s, 0.78 * s); c.closePath(); for (const x of [0.4, 0.6]) { c.moveTo((x + 0.06) * s, 0.46 * s); c.arc(x * s, 0.46 * s, 0.06 * s, 0, Math.PI * 2); } for (const x of [0.46, 0.54]) { c.moveTo(x * s, 0.7 * s); c.lineTo(x * s, 0.78 * s); } },
  bike(c, s) { for (const x of [0.28, 0.72]) { c.moveTo((x + 0.15) * s, 0.62 * s); c.arc(x * s, 0.62 * s, 0.15 * s, 0, Math.PI * 2); } c.moveTo(0.28 * s, 0.62 * s); c.lineTo(0.44 * s, 0.42 * s); c.lineTo(0.6 * s, 0.62 * s); c.closePath(); c.moveTo(0.44 * s, 0.42 * s); c.lineTo(0.66 * s, 0.42 * s); c.moveTo(0.72 * s, 0.62 * s); c.lineTo(0.64 * s, 0.34 * s); c.lineTo(0.74 * s, 0.3 * s); c.moveTo(0.36 * s, 0.34 * s); c.lineTo(0.5 * s, 0.34 * s); },
  phone(c, s) { roundRect(c, 0.32 * s, 0.14 * s, 0.36 * s, 0.72 * s, 0.05 * s); c.moveTo(0.44 * s, 0.22 * s); c.lineTo(0.56 * s, 0.22 * s); c.moveTo(0.53 * s, 0.76 * s); c.arc(0.5 * s, 0.76 * s, 0.03 * s, 0, Math.PI * 2); },
  camera(c, s) { roundRect(c, 0.16 * s, 0.32 * s, 0.68 * s, 0.46 * s, 0.06 * s); c.moveTo(0.36 * s, 0.32 * s); c.lineTo(0.42 * s, 0.22 * s); c.lineTo(0.58 * s, 0.22 * s); c.lineTo(0.64 * s, 0.32 * s); c.moveTo(0.64 * s, 0.55 * s); c.arc(0.5 * s, 0.55 * s, 0.14 * s, 0, Math.PI * 2); },
  headphones(c, s) { c.moveTo(0.22 * s, 0.56 * s); c.arc(0.5 * s, 0.56 * s, 0.28 * s, Math.PI, Math.PI * 2); roundRect(c, 0.14 * s, 0.52 * s, 0.13 * s, 0.26 * s, 0.04 * s); roundRect(c, 0.73 * s, 0.52 * s, 0.13 * s, 0.26 * s, 0.04 * s); },
  controller(c, s) { roundRect(c, 0.14 * s, 0.36 * s, 0.72 * s, 0.32 * s, 0.14 * s); c.moveTo(0.26 * s, 0.52 * s); c.lineTo(0.38 * s, 0.52 * s); c.moveTo(0.32 * s, 0.46 * s); c.lineTo(0.32 * s, 0.58 * s); for (const [x, y] of [[0.66, 0.47], [0.74, 0.55]]) { c.moveTo((x + 0.03) * s, y * s); c.arc(x * s, y * s, 0.03 * s, 0, Math.PI * 2); } },
  shirt(c, s) { c.moveTo(0.36 * s, 0.2 * s); c.lineTo(0.18 * s, 0.32 * s); c.lineTo(0.26 * s, 0.46 * s); c.lineTo(0.34 * s, 0.42 * s); c.lineTo(0.34 * s, 0.82 * s); c.lineTo(0.66 * s, 0.82 * s); c.lineTo(0.66 * s, 0.42 * s); c.lineTo(0.74 * s, 0.46 * s); c.lineTo(0.82 * s, 0.32 * s); c.lineTo(0.64 * s, 0.2 * s); c.quadraticCurveTo(0.5 * s, 0.32 * s, 0.36 * s, 0.2 * s); },
  scissors(c, s) { for (const x of [0.3, 0.7]) { c.moveTo((x + 0.08) * s, 0.72 * s); c.arc(x * s, 0.72 * s, 0.08 * s, 0, Math.PI * 2); } c.moveTo(0.35 * s, 0.65 * s); c.lineTo(0.68 * s, 0.16 * s); c.moveTo(0.65 * s, 0.65 * s); c.lineTo(0.32 * s, 0.16 * s); },
  syringe(c, s) { c.moveTo(0.3 * s, 0.7 * s); c.lineTo(0.62 * s, 0.38 * s); c.lineTo(0.7 * s, 0.46 * s); c.lineTo(0.38 * s, 0.78 * s); c.closePath(); c.moveTo(0.66 * s, 0.42 * s); c.lineTo(0.8 * s, 0.28 * s); c.moveTo(0.74 * s, 0.22 * s); c.lineTo(0.86 * s, 0.34 * s); c.moveTo(0.34 * s, 0.74 * s); c.lineTo(0.18 * s, 0.9 * s); for (const t of [0.46, 0.54]) { c.moveTo(t * s, (1.0 - t) * s); c.lineTo((t + 0.06) * s, (1.06 - t) * s); } },
  beer(c, s) { c.moveTo(0.26 * s, 0.3 * s); c.lineTo(0.3 * s, 0.82 * s); c.lineTo(0.6 * s, 0.82 * s); c.lineTo(0.64 * s, 0.3 * s); c.closePath(); c.moveTo(0.63 * s, 0.42 * s); c.quadraticCurveTo(0.86 * s, 0.44 * s, 0.62 * s, 0.68 * s); c.moveTo(0.24 * s, 0.3 * s); c.quadraticCurveTo(0.3 * s, 0.16 * s, 0.4 * s, 0.24 * s); c.quadraticCurveTo(0.5 * s, 0.14 * s, 0.58 * s, 0.24 * s); c.quadraticCurveTo(0.68 * s, 0.18 * s, 0.66 * s, 0.3 * s); },
  pizza(c, s) { c.moveTo(0.2 * s, 0.24 * s); c.quadraticCurveTo(0.5 * s, 0.12 * s, 0.8 * s, 0.24 * s); c.lineTo(0.5 * s, 0.86 * s); c.closePath(); for (const [x, y] of [[0.4, 0.34], [0.58, 0.38], [0.49, 0.56]]) { c.moveTo((x + 0.045) * s, y * s); c.arc(x * s, y * s, 0.045 * s, 0, Math.PI * 2); } },
  battery(c, s) { roundRect(c, 0.18 * s, 0.32 * s, 0.58 * s, 0.36 * s, 0.04 * s); c.moveTo(0.76 * s, 0.43 * s); c.lineTo(0.83 * s, 0.43 * s); c.lineTo(0.83 * s, 0.57 * s); c.lineTo(0.76 * s, 0.57 * s); for (const x of [0.3, 0.41, 0.52]) { c.moveTo(x * s, 0.41 * s); c.lineTo(x * s, 0.59 * s); } },
  crown(c, s) { c.moveTo(0.2 * s, 0.72 * s); c.lineTo(0.16 * s, 0.3 * s); c.lineTo(0.36 * s, 0.5 * s); c.lineTo(0.5 * s, 0.24 * s); c.lineTo(0.64 * s, 0.5 * s); c.lineTo(0.84 * s, 0.3 * s); c.lineTo(0.8 * s, 0.72 * s); c.closePath(); c.moveTo(0.2 * s, 0.81 * s); c.lineTo(0.8 * s, 0.81 * s); },
  lips(c, s) { c.moveTo(0.14 * s, 0.5 * s); c.quadraticCurveTo(0.3 * s, 0.3 * s, 0.5 * s, 0.4 * s); c.quadraticCurveTo(0.7 * s, 0.3 * s, 0.86 * s, 0.5 * s); c.quadraticCurveTo(0.5 * s, 0.86 * s, 0.14 * s, 0.5 * s); c.moveTo(0.14 * s, 0.5 * s); c.quadraticCurveTo(0.5 * s, 0.58 * s, 0.86 * s, 0.5 * s); },
  smile(c, s) { c.moveTo(0.82 * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, 0.32 * s, 0, Math.PI * 2); for (const x of [0.4, 0.6]) { c.moveTo(x * s, 0.38 * s); c.lineTo(x * s, 0.46 * s); } c.moveTo(0.34 * s, 0.58 * s); c.quadraticCurveTo(0.5 * s, 0.74 * s, 0.66 * s, 0.58 * s); },
  planet(c, s) { c.moveTo(0.72 * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, 0.22 * s, 0, Math.PI * 2); c.moveTo((0.5 + 0.38 * Math.cos(-0.4)) * s, (0.5 + 0.38 * Math.sin(-0.4)) * s); c.ellipse(0.5 * s, 0.5 * s, 0.38 * s, 0.1 * s, -0.4, 0, Math.PI * 2); },
  spiral(c, s) { c.moveTo(0.5 * s, 0.5 * s); for (let i = 1; i <= 64; i++) { const a = i * 0.34; const r = (0.34 * i) / 64; c.lineTo((0.5 + r * Math.cos(a)) * s, (0.5 + r * Math.sin(a)) * s); } },
  torii(c, s) { for (const x of [0.32, 0.68]) { c.moveTo(x * s, 0.28 * s); c.lineTo(x * s, 0.84 * s); } c.moveTo(0.14 * s, 0.2 * s); c.quadraticCurveTo(0.5 * s, 0.3 * s, 0.86 * s, 0.2 * s); c.moveTo(0.22 * s, 0.38 * s); c.lineTo(0.78 * s, 0.38 * s); },
  lantern(c, s) { c.moveTo(0.74 * s, 0.52 * s); c.ellipse(0.5 * s, 0.52 * s, 0.24 * s, 0.28 * s, 0, 0, Math.PI * 2); for (const y of [0.38, 0.66]) { c.moveTo(0.29 * s, y * s); c.lineTo(0.71 * s, y * s); } for (const y of [0.24, 0.8]) { c.moveTo(0.4 * s, y * s); c.lineTo(0.6 * s, y * s); } c.moveTo(0.5 * s, 0.8 * s); c.lineTo(0.5 * s, 0.9 * s); },
  fuji(c, s) { c.moveTo(0.12 * s, 0.78 * s); c.lineTo(0.4 * s, 0.3 * s); c.lineTo(0.6 * s, 0.3 * s); c.lineTo(0.88 * s, 0.78 * s); c.closePath(); c.moveTo(0.4 * s, 0.3 * s); c.lineTo(0.34 * s, 0.42 * s); c.lineTo(0.42 * s, 0.4 * s); c.lineTo(0.5 * s, 0.46 * s); c.lineTo(0.58 * s, 0.4 * s); c.lineTo(0.66 * s, 0.42 * s); c.lineTo(0.6 * s, 0.3 * s); c.moveTo(0.82 * s, 0.2 * s); c.arc(0.76 * s, 0.2 * s, 0.06 * s, 0, Math.PI * 2); },
  tooth(c, s) { c.moveTo(0.3 * s, 0.24 * s); c.quadraticCurveTo(0.4 * s, 0.16 * s, 0.5 * s, 0.24 * s); c.quadraticCurveTo(0.6 * s, 0.16 * s, 0.7 * s, 0.24 * s); c.quadraticCurveTo(0.8 * s, 0.4 * s, 0.66 * s, 0.56 * s); c.lineTo(0.62 * s, 0.82 * s); c.lineTo(0.54 * s, 0.82 * s); c.lineTo(0.5 * s, 0.62 * s); c.lineTo(0.46 * s, 0.82 * s); c.lineTo(0.38 * s, 0.82 * s); c.lineTo(0.34 * s, 0.56 * s); c.quadraticCurveTo(0.2 * s, 0.4 * s, 0.3 * s, 0.24 * s); },
  glasses(c, s) { for (const x of [0.31, 0.69]) { c.moveTo((x + 0.13) * s, 0.52 * s); c.arc(x * s, 0.52 * s, 0.13 * s, 0, Math.PI * 2); } c.moveTo(0.44 * s, 0.5 * s); c.quadraticCurveTo(0.5 * s, 0.44 * s, 0.56 * s, 0.5 * s); c.moveTo(0.18 * s, 0.5 * s); c.lineTo(0.12 * s, 0.42 * s); c.moveTo(0.82 * s, 0.5 * s); c.lineTo(0.88 * s, 0.42 * s); },
  padlock(c, s) { roundRect(c, 0.26 * s, 0.46 * s, 0.48 * s, 0.38 * s, 0.05 * s); c.moveTo(0.36 * s, 0.46 * s); c.lineTo(0.36 * s, 0.34 * s); c.arc(0.5 * s, 0.34 * s, 0.14 * s, Math.PI, Math.PI * 2); c.lineTo(0.64 * s, 0.46 * s); c.moveTo(0.53 * s, 0.6 * s); c.arc(0.5 * s, 0.6 * s, 0.03 * s, 0, Math.PI * 2); c.moveTo(0.5 * s, 0.63 * s); c.lineTo(0.5 * s, 0.72 * s); },
  target(c, s) { for (const r of [0.32, 0.18, 0.04]) { c.moveTo((0.5 + r) * s, 0.5 * s); c.arc(0.5 * s, 0.5 * s, r * s, 0, Math.PI * 2); } for (const [a, b, d, e] of [[0.5, 0.1, 0.5, 0.24], [0.5, 0.76, 0.5, 0.9], [0.1, 0.5, 0.24, 0.5], [0.76, 0.5, 0.9, 0.5]]) { c.moveTo(a * s, b * s); c.lineTo(d * s, e * s); } },
  rabbit(c, s) { c.moveTo(0.7 * s, 0.62 * s); c.arc(0.5 * s, 0.62 * s, 0.2 * s, 0, Math.PI * 2); c.moveTo(0.42 * s, 0.44 * s); c.quadraticCurveTo(0.3 * s, 0.1 * s, 0.44 * s, 0.14 * s); c.quadraticCurveTo(0.5 * s, 0.28 * s, 0.47 * s, 0.43 * s); c.moveTo(0.58 * s, 0.44 * s); c.quadraticCurveTo(0.7 * s, 0.1 * s, 0.56 * s, 0.14 * s); c.quadraticCurveTo(0.5 * s, 0.28 * s, 0.53 * s, 0.43 * s); for (const x of [0.42, 0.58]) { c.moveTo((x + 0.02) * s, 0.6 * s); c.arc(x * s, 0.6 * s, 0.02 * s, 0, Math.PI * 2); } },
  bag(c, s) { c.moveTo(0.22 * s, 0.36 * s); c.lineTo(0.78 * s, 0.36 * s); c.lineTo(0.82 * s, 0.84 * s); c.lineTo(0.18 * s, 0.84 * s); c.closePath(); c.moveTo(0.38 * s, 0.36 * s); c.quadraticCurveTo(0.38 * s, 0.16 * s, 0.5 * s, 0.16 * s); c.quadraticCurveTo(0.62 * s, 0.16 * s, 0.62 * s, 0.36 * s); },
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
    // (The frame: a lip that catches the street along its top and left.)
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(0, 0, w, fr * 0.3);
    ctx.fillRect(0, 0, fr * 0.3, h);
    lightbox(ctx, fr, fr, w - fr * 2, h - fr * 2, color, seedOf(spec));
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
  if (spec.style === "name") {
    // A named shop's sign on a square face is no tile: a wide box across
    // it, a blade down it, a disc, or two boxes one over the other, and
    // the rest of the face is the dark backing it hangs on. A lit box with
    // dark letters, or (lit: "tube") the name in glass inside an outline
    // of the shape.
    const boxes = { wide: [[0.03, 0.29, 0.94, 0.42]], blade: [[0.29, 0.03, 0.42, 0.94]], round: [[0.06, 0.06, 0.88, 0.88]], pair: [[0.05, 0.08, 0.9, 0.36], [0.16, 0.54, 0.68, 0.34]] }[spec.shape] ?? [[0.03, 0.29, 0.94, 0.42]];
    boxes.forEach(([bx, by, bw, bh], i) => {
      const ww = bw * w;
      const hh = bh * h;
      const hue = i ? spec.second ?? color : color;
      const one = { ...spec, lines: [spec.lines[i] ?? spec.lines[0]] };
      const m = Math.min(ww, hh);
      const outline = () => (spec.shape === "round" ? ctx.arc(ww / 2, hh / 2, ww / 2 - m * 0.04, 0, Math.PI * 2) : roundRect(ctx, m * 0.06, m * 0.06, ww - m * 0.12, hh - m * 0.12, m * 0.16));
      ctx.save();
      ctx.translate(bx * w, by * h);
      if (spec.lit === "tube") {
        strokeTube(ctx, hue, Math.max(2, m * 0.06), outline);
        layout(ctx, one, ww, hh, m * 0.2, (text, x, y, px, weight) => tube(ctx, text, x, y, px, hue, weight), 700);
      } else {
        ctx.beginPath();
        outline();
        ctx.clip();
        lightbox(ctx, 0, 0, ww, hh, hue, seedOf(one) + i);
        const ink = dim(hue, 0.012);
        layout(ctx, one, ww, hh, m * 0.16, (text, x, y, px, weight) => {
          ctx.font = FONT(weight, px);
          ctx.fillStyle = ink;
          ctx.fillText(text, x, y);
        }, 800);
      }
      ctx.restore();
    });
    return;
  }
  if (spec.style === "brand") {
    // An invented brand's board, as the show hangs them over its streets:
    // its mark in a disc at one end, its name beside it in big letters,
    // what it sells under that. A lit box with the name and the mark in
    // dark ink (lit: "box"), or a dark board with a lit disc, the name in
    // white tube and the line under it in the brand's colour.
    const box = spec.lit === "box";
    if (box) lightbox(ctx, w * 0.02, h * 0.05, w * 0.96, h * 0.9, color, seedOf(spec));
    const m = h * 0.76;
    const mx = h * 0.12;
    const my = (h - m) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx + m / 2, my + m / 2, m * 0.48, 0, Math.PI * 2);
    ctx.closePath();
    if (box) {
      ctx.fillStyle = "#0a0808";
      ctx.fill();
    } else {
      ctx.clip();
      lightbox(ctx, mx, my, m, m, color, seedOf(spec) + 3);
    }
    ctx.restore();
    ctx.save();
    ctx.translate(mx + m * 0.14, my + m * 0.14);
    ctx.scale(0.72, 0.72);
    if (box) strokeTube(ctx, color, Math.max(2, m * 0.06), () => ICONS[spec.mark]?.(ctx, m));
    else {
      ctx.strokeStyle = dim(color, 0.012);
      ctx.lineWidth = Math.max(2, m * 0.075);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ICONS[spec.mark]?.(ctx, m);
      ctx.stroke();
    }
    ctx.restore();
    const tx = mx + m + h * 0.12;
    const tw = w - tx - h * 0.1;
    const [name, sub] = spec.lines;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = tx + tw / 2;
    const ny = sub ? h * 0.4 : h * 0.5;
    const px = fitFont(ctx, name, tw, h * (sub ? 0.44 : 0.6), 800);
    const ink = dim(color, 0.012);
    if (box) {
      ctx.font = FONT(800, px);
      ctx.fillStyle = ink;
      ctx.fillText(name, cx, ny);
    } else tube(ctx, name, cx, ny, px, spec.second ?? "#eceae4", 800);
    if (sub) {
      const sp = fitFont(ctx, sub, tw * 0.86, h * 0.19, 700);
      if (box) {
        ctx.font = FONT(700, sp);
        ctx.fillText(sub, cx, h * 0.75);
      } else tube(ctx, sub, cx, h * 0.75, sp, color, 700);
    }
    return;
  }
  if (spec.style === "chunky") {
    // The show's painted sign: fat letters in one colour inside a thick
    // outline in another, lit, leaning on some. The outline runs the
    // letters together into one shape, as it does on the street.
    const fill = panel(spec.fill ?? color, 1.6);
    const edge = spec.edge ?? color;
    layout(ctx, spec, w, h, inset * 1.15, (text, x, y, px, weight) => {
      const size = Math.floor(px * 0.8);
      ctx.save();
      ctx.translate(x, y);
      if (spec.slant) ctx.transform(1, 0, -spec.slant, 1, 0, 0);
      ctx.font = FONT(weight, size);
      ctx.lineJoin = "round";
      ctx.shadowColor = edge;
      ctx.shadowBlur = size * 0.5;
      ctx.strokeStyle = edge;
      ctx.lineWidth = size * 0.36;
      ctx.strokeText(text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = fill;
      ctx.lineWidth = size * 0.09;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = fill;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }, 700);
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
    lightbox(ctx, w * 0.04, h * 0.04, w * 0.92, h * 0.92, spec.color, seedOf(spec));
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
  // Only as tall as the packed signs need, to the next 64 px (so its first
  // six mip levels halve evenly, as a power of two's do): the signs pack to
  // a little over 2048 px, which a power of two rounded up to a 4096 square,
  // some 85 MB of video memory with its mipmaps.
  const ATLAS = atlas;
  // (The shops' rooms are dealt by the signs over them: src/world/trades.js.)
  clearSigns();

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
      list.forEach((_, i) => cellFor(signSpec(`st_${size}_${i}`, i), w, h));
    }
  }
  // Which design a standard street sign shows. The builder names them in
  // turn (st_ps_0, st_ps_1...), a size at a time, and by that turn alone a
  // street showed HOSTEL twice in one look and the same five icons down
  // every lane. So the design is dealt here by where the face hangs: the
  // builder's turn if nothing of that name (nameOf) hangs within REACH, else
  // the next design on that does not, else the one whose namesake is
  // furthest off; and of those, one in the two hues its block keeps to
  // (blockHues). The avenue and its canyon are dealt as every street is
  // (until round 5 they kept the builder's turn for the page's first frame,
  // which left one purple crescent in a ring in nine of a reviewer's views).
  // (A small panel and a middle one are the same shape, 2.25 and 2.33 to
  // one: each may take the other's designs, so a street of them is dealt
  // from 58 and not 32 or 26. A namesake across the street, facing it,
  // counts as nearer: both are in every look down the street. And a sign
  // that must share its name with one close by is shown in the block's
  // other hue.)
  const REACH = 55;
  const POOL = { ps: ["ps", "pm"], pm: ["pm", "ps"] };
  const turns = new Map();
  const hung = new Map();
  // (Round 8: a column of square signs, one over another on one face of a
  // wall, is dealt as a column. Each takes the designs in its own order (a
  // start and a stride of its own through them) and none twice, and has
  // its own colours: one of its block's two hues, with the other or a hue
  // of its own on every second or third sign. Dealt one at a time from
  // the same few dozen designs, every column of a street came out the same
  // bolt, wifi, dice, key, heart and cup in the same colours.)
  const columns = new Map();
  const STRIDES = [7, 11, 13, 17, 19, 23, 29, 31];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const columnOf = (c) => {
    const gx = Math.round(c.x * 2);
    const gz = Math.round(c.z * 2);
    const key = `${gx},${gz},${Math.round(c.nx * 2)},${Math.round(c.nz * 2)}`;
    if (!columns.has(key)) {
      const h = (a) => {
        const r = Math.abs(Math.sin(a + gx * 12.9898 + gz * 78.233) * 43758.5453);
        return r - Math.floor(r);
      };
      columns.set(key, { used: new Set(), k: 0, h: [h(1.3), h(7.1), h(3.7), h(5.9), h(9.2), h(2.4)] });
    }
    return columns.get(key);
  };
  // (Round 8: designs added this round (`since: 8`) are not dealt on the
  // avenue's first 128 m, the page's first frame, which keeps its signs.)
  const dealt = [];
  const dealStreet = (size, n, mesh) => {
    mesh.updateWorldMatrix(true, false);
    const pos = mesh.geometry.attributes.position;
    const c = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) c.add(v.fromBufferAttribute(pos, i));
    c.multiplyScalar(1 / pos.count).applyMatrix4(mesh.matrixWorld);
    const nor = mesh.geometry.attributes.normal;
    const nw = nor ? new THREE.Vector3().fromBufferAttribute(nor, 0).transformDirection(mesh.matrixWorld) : new THREE.Vector3();
    c.nx = nw.x;
    c.nz = nw.z;
    const pair = blockHues(c.x, c.z);
    // Where the walk through the designs starts is the face's own (its
    // turn and its place: the builder's turn alone runs 0 to 27, the
    // pictograms). A square face is a named shop's sign or a pictogram
    // turn about up its column and along its wall, so a stack of them is
    // boards, blades and discs between the tiles.
    const held = !pair;
    // (A brand's board is a big one's: not on a small panel over a shop.)
    const pool = (POOL[size] ?? [size]).flatMap((z) => STREET_DESIGNS[z].map((_, i) => [z, i])).filter(([z, i]) => (!held || !STREET_DESIGNS[z][i].since) && (size !== "ps" || STREET_DESIGNS[z][i].style !== "brand"));
    const r = Math.abs(Math.sin(n * 12.9898 + Math.round(c.x) * 78.233 + Math.round(c.z) * 37.719) * 43758.5453);
    const start0 = Math.floor((r - Math.floor(r)) * (held ? STREET_DESIGNS[size].filter((d) => !d.since).length : STREET_NAMES[size].length));
    let named = (Math.round(c.y / 1.3) + Math.round(c.x / 3) + Math.round(c.z / 3)) % 2 === 0;
    const col = size === "bx" && !held ? columnOf(c) : null;
    let start = start0;
    let stride = 1;
    if (col) {
      stride = STRIDES[Math.floor(col.h[1] * STRIDES.length)];
      while (gcd(stride, pool.length) !== 1) stride += 2;
      start = (Math.floor(col.h[0] * pool.length) + col.k * stride) % pool.length;
      named = (col.k + Math.floor(col.h[2] * 3)) % (col.h[3] < 0.5 ? 2 : 3) === 0;
    }
    // (A big board, the canyon's over its street, is one of the invented
    // brands if one is free; a shop's own board is a brand only when
    // nothing else is.)
    const big = size === "pm" && (mesh.userData.w ?? 0) > 3.6;
    const nearOf = (name) => {
      let near = Infinity;
      let at = null;
      for (const h of hung.get(name) ?? []) {
        const d = Math.hypot(h.x - c.x, h.z - c.z) * (h.nx * c.nx + h.nz * c.nz < -0.5 ? 0.7 : 1);
        if (d < near) {
          near = d;
          at = h;
        }
      }
      return [near, at];
    };
    // The first design on from there (of the face's kind) with no namesake
    // within REACH; failing that whichever of either kind has its namesake
    // furthest off.
    const tiers = [{ d: -1, k: start }, { d: -1, k: start }];
    for (let j = 0; j < pool.length; j++) {
      const k = (start + j * stride) % pool.length;
      const [z, i] = pool[k];
      if (col?.used.has(STREET_NAMES[z][i])) continue;
      const [near] = nearOf(STREET_NAMES[z][i]);
      const tier = (size === "bx" && !STREET_DESIGNS[z][i].icon !== named) || big !== (STREET_DESIGNS[z][i].style === "brand") ? 1 : 0;
      if (near > tiers[tier].d) tiers[tier] = { d: near, k };
      if (tier === 0 && near >= REACH) break;
    }
    const best = tiers.find((t) => t.d >= REACH) ?? tiers.reduce((a, t) => (t.d > a.d ? t : a));
    const [pz, pick] = pool[best.k];
    const name = STREET_NAMES[pz][pick];
    // And it is shown in one of its block's two hues: its own if that is
    // one of them (or it is white), else turned to the nearer of the two.
    // Choosing only among the designs of those hues left a third of each
    // size to deal, and the avenue hangs up to 72 of one size inside 40 m.
    const [family, angle] = STREET_HUES[pz][pick];
    let turn = 0;
    let shown = family;
    if (pair && family >= 0 && !pair.includes(family)) {
      const da = ((HUE_AT[pair[0]] - angle + 540) % 360) - 180;
      const db = ((HUE_AT[pair[1]] - angle + 540) % 360) - 180;
      turn = (Math.abs(da) < Math.abs(db) ? da : db) / 360;
      shown = Math.abs(da) < Math.abs(db) ? pair[0] : pair[1];
    }
    // (A column's sign is in the column's colours: its main hue, and on
    // every second or third sign its other, which is the block's other
    // hue or, on one column in three, a hue of the column's own.)
    let alt = -1;
    if (col && family >= 0) {
      const main = pair[col.h[2] < 0.5 ? 0 : 1];
      alt = col.h[4] > 0.66 ? [5, 0, 2, 4][Math.floor(col.h[5] * 4)] : pair[col.h[2] < 0.5 ? 1 : 0];
      if (alt === main) alt = pair[col.h[2] < 0.5 ? 1 : 0];
      const every = col.h[3] < 0.5 ? 2 : 3;
      const hue = col.k % every === Math.floor(col.h[5] * every) ? alt : main;
      if (hue === alt) alt = main;
      turn = (((HUE_AT[hue] - angle + 540) % 360) - 180) / 360;
      shown = hue;
    }
    const [near, twin] = nearOf(name);
    if (near < 40 && twin && family >= 0 && twin.shown === shown) {
      const other = alt >= 0 ? alt : pair ? (pair[0] === shown ? pair[1] : pair[0]) : (shown + 2) % 6;
      turn = (((HUE_AT[other] - angle + 540) % 360) - 180) / 360;
      shown = other;
    }
    c.shown = shown;
    if (!hung.has(name)) hung.set(name, []);
    hung.get(name).push(c);
    if (col) {
      col.used.add(name);
      col.k++;
    }
    dealt.push({ size, name, x: c.x, y: c.y, z: c.z, nx: c.nx, nz: c.nz, w: mesh.userData.w ?? 0, turn, shown });
    return [pz, pick, turn];
  };
  const specOf = (mesh) => {
    const id = mesh.name.replace(/^sign_/, "");
    const base = id.replace(/_b$/, "").replace(/_far$/, "");
    const street = base.match(/^st_([a-z]{2})_(\d+)$/);
    if (!street || !STREET_NAMES[street[1]]) return signSpec(id);
    if (!turns.has(base)) turns.set(base, dealStreet(street[1], Number(street[2]), mesh));
    const [pz, pick, turn] = turns.get(base);
    return { ...signSpec(`st_${pz}_${street[2]}`, pick), turn };
  };
  for (const mesh of meshes) {
    const id = mesh.name.replace(/^sign_/, "");
    // A caller may reword a sign (the braindance puts Ali's work on a few of
    // the avenue's); the face, its colour and its light stay the kit's.
    const base = id.replace(/_b$/, "").replace(/_far$/, "");
    const spec = overrides?.[base] ? { ...specOf(mesh), ...overrides[base], key: `${base}_bd` } : specOf(mesh);
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
  const HEIGHT = Math.min(ATLAS, Math.ceil(Math.max(256, y + shelf) / 64) * 64);
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
  // (load: a few faces a step, for a district's faces built once the city
  // is live; build runs it straight through.)
  function* buildSteps(faces) {
    const geos = [];
    const sources = [];
    const frames = [];
    for (let k = 0; k < faces.length; k++) {
      if (k % 8 === 7) yield;
      const { mesh, spec } = faces[k];
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
      const H = new Float32Array(n).fill(spec.turn ?? 0);
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
      // What it says its shop is, where it hangs, for the room under it.
      const mid = [0, 0, 0];
      for (let i = 0; i < n * 3; i++) mid[i % 3] += P[i] / n;
      postSign(mid[0], mid[1], mid[2], spec.draw === "street" || spec.draw === "board" || spec.draw === "wordmark" || spec.draw === "ripperdoc" ? tradeOf(spec) : -1);
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
          key: spec.key,
          corner: o,
          u: a.clone().sub(o),
          v: b.clone().sub(o),
          normal,
          atlas: new THREE.Vector4(cell.x / ATLAS, cell.y / HEIGHT, cell.pw / ATLAS, cell.ph / HEIGHT),
          color: turned(new THREE.Color(spec.color), spec.turn ?? 0),
          turn: spec.turn ?? 0,
          sign: [index, spec.flicker && !reduced ? 1 : 0],
        });
      }
      g.setAttribute("position", new THREE.BufferAttribute(P, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(U, 2));
      g.setAttribute("aSign", new THREE.BufferAttribute(S, 2));
      g.setAttribute("aHue", new THREE.BufferAttribute(H, 1));
      if (src.index) g.setIndex(src.index.clone());
      geos.push(g);
      sources.push({ mesh, color: turned(new THREE.Color(spec.color), spec.turn ?? 0), intensity: spec.draw === "board" ? 0.9 : 1.6 });
    }
    indexBase += faces.length;
    yield;
    const geometry = geos[0]?.index ? yield* joinSteps(geos) : mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    return { geometry, sources, frames };
  }
  const build = (faces) => drain(buildSteps(faces));
  const { geometry, sources, frames } = build(faces);

  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uAtlas: { value: texture }, uIntensity: { value: GAIN } },
    vertexShader: /* glsl */ `
      attribute vec2 aSign;
      attribute float aHue;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec2 vSign;
      varying float vHue;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vUv = uv;
        vSign = aSign;
        vHue = aHue;
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
      varying float vHue;
      void main() {
        vec3 tex = texture2D(uAtlas, vUv).rgb;
        // A standard sign is shown in one of its block's two hues (the
        // dealer in createSigns): its design's colours turned about the
        // grey axis by the face's share of a full turn.
        if (vHue != 0.0) {
          float a = vHue * 6.2832;
          vec3 k = vec3(0.57735);
          vec3 was = tex;
          tex = max(tex * cos(a) + cross(k, tex) * sin(a) + k * dot(k, tex) * (1.0 - cos(a)), 0.0);
          // (Held near its own brightness: a yellow turned to pink would be
          // a third as bright.)
          tex *= clamp(dot(was, vec3(0.2126, 0.7152, 0.0722)) / max(dot(tex, vec3(0.2126, 0.7152, 0.0722)), 1e-3), 0.75, 1.7);
        }
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
  // The streamed districts' faces, all in one mesh: a pack's are added to
  // what came before (in the order they came, as their own meshes were
  // drawn), so nine packs are one draw in each pass and not nine.
  let streamed = null;
  return {
    mesh,
    texture,
    sources,
    frames,
    // (What dealStreet dealt, every standard face of every pack: for checks.)
    dealt,
    /** More faces on the same atlas and material (a streamed district's):
     *  the one mesh every district's faces are in, and their light for the
     *  bake. Faces whose design has no cell (a word-sign the core did not
     *  carry) are left out. */
    addFaces(more, { hold = false } = {}) {
      const list = [];
      for (const m of more) {
        const spec = specOf(m);
        if (spec && cells.has(spec.key) && cells.get(spec.key).x !== undefined) list.push({ mesh: m, spec });
      }
      if (!list.length) return null;
      const built = build(list);
      // (load: with `hold`, the faces are put in the mesh by the returned
      // `commit()`, which returns the mesh: a district built a piece at a
      // time appears in one frame.)
      const commit = () => {
        const joined = streamed && mergeGeometries([streamed.geometry, built.geometry], false);
        if (joined) {
          extra.splice(extra.indexOf(streamed.geometry), 1, joined);
          streamed.geometry.dispose();
          built.geometry.dispose();
          streamed.geometry = joined;
          return streamed;
        }
        const add = new THREE.Mesh(built.geometry, material);
        add.name = "signs_more";
        add.frustumCulled = false;
        extra.push(built.geometry);
        streamed = add;
        return add;
      };
      if (hold) return { sources: built.sources, commit };
      return { mesh: commit(), sources: built.sources };
    },
    /** (load) addFaces with `hold`, a piece at a time, for a district built
     *  once the city is live: yields between pieces, and returns null or
     *  { sources, mesh, geometry, commit }: its light for the bake, the
     *  mesh every district's faces are drawn in and the geometry it will
     *  draw (joined out of sight, so the GPU can have it before it is
     *  seen), and the commit that puts it in. */
    *addFacesSteps(more) {
      const list = [];
      for (const [k, m] of more.entries()) {
        // (Dealing a face its design looks over its neighbours: a few at a step.)
        if (k % 4 === 3) yield;
        const spec = specOf(m);
        if (spec && cells.has(spec.key) && cells.get(spec.key).x !== undefined) list.push({ mesh: m, spec });
      }
      if (!list.length) return null;
      const built = yield* buildSteps(list);
      if (!streamed) {
        const add = new THREE.Mesh(built.geometry, material);
        add.name = "signs_more";
        add.frustumCulled = false;
        return {
          sources: built.sources,
          mesh: add,
          geometry: built.geometry,
          commit() {
            extra.push(built.geometry);
            streamed = add;
            return add;
          },
        };
      }
      const joined = built.geometry.index ? yield* joinSteps([streamed.geometry, built.geometry]) : mergeGeometries([streamed.geometry, built.geometry], false);
      built.geometry.dispose();
      return {
        sources: built.sources,
        mesh: streamed,
        geometry: joined,
        commit() {
          extra.splice(extra.indexOf(streamed.geometry), 1, joined);
          streamed.geometry.dispose();
          streamed.geometry = joined;
          return streamed;
        },
      };
    },
    dispose() {
      geometry.dispose();
      for (const g of extra) g.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
