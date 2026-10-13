// src/world/adverts.js: which advert each billboard shows.
//
// The billboards' shader (materials.js billboard()) picks one of the city's
// twenty-four adverts for a face. Left to where the face stands in 4 m slots,
// a row of small posters a metre apart on one wall were one slot, the same
// poster three or four times side by side, and the big boards came out the
// same on towers across a street. So the faces of a billboard mesh are dealt
// here, once, the first time it is drawn: the largest first, each the advert
// its place suggests unless the same one (or the one it turns into on the
// next round, when neighbours change a moment apart) already hangs within
// reach of it, reach growing with its size. The answer rides in the face's
// own vertex colour (alpha: 8 x (advert + 1), of the sixteen wide or the
// eight tall), so nothing is looked up per pixel. A mesh this never reaches
// keeps alpha 1 and the shader deals it by its place, as before.
// (Round 8: the deal is the city's, not a mesh's: a board is kept from
// the adverts of every board dealt before it in any mesh, so a crossing's
// panels and a wall's posters in two meshes do not show one advert twice
// in a look; and the pools are wider: twelve more adverts drawn here
// (posterTexture), eight wide and four tall, for the invented brands.)
import * as THREE from "three";
import { FONT, ICONS } from "./signs.js";

// How far each round moves a face along its pool (the shader's own steps:
// coprime with both pools, so a face goes through all of its pool).
const STEP = { 24: 5, 12: 5 };
// Every board dealt, by 40 m cell.
const CELL = 40;
let dealtCells = new Map();
/** Forget the boards dealt (a new city). */
export function clearAdverts() {
  dealtCells = new Map();
}
const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

/** Deal a billboard mesh's faces their adverts, into its colour's alpha. Returns how many faces. */
export function dealAdverts(geometry, object) {
  const steps = dealAdvertSteps(geometry, object);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

/**
 * (load) dealAdverts a few thousand vertices or a few faces a step: the
 * same faces dealt the same adverts, for a geometry the city deals out of
 * sight a little a frame (city.js, the billboard material's `deal`). Its
 * value at the end is what dealAdverts returns.
 */
export function* dealAdvertSteps(geometry, object) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const col = geometry.attributes.color;
  if (!pos || !nor || !col || col.itemSize < 4) return 0;
  object.updateWorldMatrix(true, false);
  const n = pos.count;
  const P = new Float32Array(n * 3);
  const N = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  const nm = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
  for (let i = 0; i < n; i++) {
    if (i % 4096 === 4095) yield;
    v.fromBufferAttribute(pos, i).applyMatrix4(object.matrixWorld);
    P.set([v.x, v.y, v.z], i * 3);
    v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
    N.set([v.x, v.y, v.z], i * 3);
  }
  // A face is the vertices its triangles join (and any on the same spot
  // facing the same way).
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const join = (a, b) => {
    parent[find(a)] = find(b);
  };
  const spots = new Map();
  for (let i = 0; i < n; i++) {
    if (i % 4096 === 4095) yield;
    const key = `${Math.round(P[i * 3] * 100)},${Math.round(P[i * 3 + 1] * 100)},${Math.round(P[i * 3 + 2] * 100)},${Math.round(N[i * 3] * 2)},${Math.round(N[i * 3 + 1] * 2)},${Math.round(N[i * 3 + 2] * 2)}`;
    if (spots.has(key)) join(i, spots.get(key));
    else spots.set(key, i);
  }
  const index = geometry.index;
  const tris = index ? index.count / 3 : n / 3;
  for (let k = 0; k < tris; k++) {
    if (k % 8192 === 8191) yield;
    const a = index ? index.getX(k * 3) : k * 3;
    join(a, index ? index.getX(k * 3 + 1) : k * 3 + 1);
    join(a, index ? index.getX(k * 3 + 2) : k * 3 + 2);
  }
  const faces = new Map();
  yield;
  for (let i = 0; i < n; i++) {
    if (i % 8192 === 8191) yield;
    const root = find(i);
    if (!faces.has(root)) faces.set(root, []);
    faces.get(root).push(i);
  }
  const boards = [];
  let faceN = 0;
  for (const verts of faces.values()) {
    if (++faceN % 256 === 0) yield;
    let cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0;
    for (const i of verts) {
      cx += P[i * 3]; cy += P[i * 3 + 1]; cz += P[i * 3 + 2];
      nx += N[i * 3]; ny += N[i * 3 + 1]; nz += N[i * 3 + 2];
    }
    const k = verts.length;
    cx /= k; cy /= k; cz /= k;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    // Its width along the wall and its height (a board lying flat keeps
    // the shader's own deal).
    if (Math.abs(ny) > 0.95) continue;
    const hl = Math.hypot(nx, nz) || 1;
    const rx = -nz / hl;
    const rz = nx / hl;
    let a0 = Infinity, a1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const i of verts) {
      const along = P[i * 3] * rx + P[i * 3 + 2] * rz;
      a0 = Math.min(a0, along); a1 = Math.max(a1, along);
      y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]);
    }
    const w = a1 - a0;
    const h = y1 - y0;
    if (w < 0.05 || h < 0.05) continue;
    const pool = w / h < 0.85 ? 12 : 24;
    const plane = cx * nx + cz * nz;
    // Where its place alone would start it (as the shader's old deal does,
    // but by its middle and in a metre or so, not 4 m slots).
    const start = ((Math.round((a0 + a1) / 2.2) * 7 + Math.round((y0 + y1) / 2.6) * 3 + Math.round(plane / 2) * 5) % pool + pool) % pool;
    boards.push({ verts, x: cx, y: cy, z: cz, area: w * h, pool, start, reach: Math.min(160, 24 + 14 * Math.sqrt(w * h)) });
  }
  // The largest first: a tower's board takes its pick before the posters.
  boards.sort((a, b) => b.area - a.area || a.x - b.x || a.z - b.z);
  yield;
  let done = 0;
  for (const b of boards) {
    if (++done % 8 === 7) yield;
    const step = STEP[b.pool];
    // The boards dealt within reach, in this mesh or any before it.
    const near0 = [];
    const span = Math.ceil(b.reach / CELL);
    const gx = Math.floor(b.x / CELL);
    const gz = Math.floor(b.z / CELL);
    for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) for (const o of dealtCells.get(`${gx + i},${gz + j}`) ?? []) if (o.pool === b.pool) near0.push(o);
    let best = b.start;
    let bestNear = -1;
    for (let t = 0; t < b.pool; t++) {
      const art = (b.start + t * 7) % b.pool;
      let near = Infinity;
      for (const o of near0) {
        const d = Math.hypot(o.x - b.x, (o.y - b.y) * 0.7, o.z - b.z);
        const same = o.art === art;
        const next = (o.art - art - step + 2 * b.pool) % b.pool === 0 || (art - o.art - step + 2 * b.pool) % b.pool === 0;
        if (same) near = Math.min(near, d);
        else if (next) near = Math.min(near, d * 2);
      }
      if (near >= Math.max(b.reach, 1)) {
        best = art;
        break;
      }
      if (near > bestNear) {
        bestNear = near;
        best = art;
      }
    }
    b.art = best;
    const key = cellKey(b.x, b.z);
    if (!dealtCells.has(key)) dealtCells.set(key, []);
    dealtCells.get(key).push({ x: b.x, y: b.y, z: b.z, pool: b.pool, art: best });
    for (const i of b.verts) col.setW(i, (8 * (best + 1)) / 255);
  }
  col.needsUpdate = true;
  return boards.length;
}

// The twelve adverts drawn here, for the invented brands of the big boards
// (sign-words.js): eight wide, four tall, in a 2048 by 1024 atlas laid out
// as the city's own (scripts/pack-ads.mjs): 512 by 341 slots, four to a
// row, the wide ones in the first two rows and the tall ones on their
// sides, head to the right, in the third. Half the pixels a side on a
// phone. Each is a show's kind of advert: a colour field, a motif, the
// brand's mark big, its name, what it sells on a band, a column of kana,
// a sticker.
const POSTERS = [
  { name: "KAIROMI", sub: "COLA", kana: "新発売", mark: "planet", bg: ["#ff2e88", "#3a0a5c"], ink: "#fff6fb", accent: "#fcee0a", motif: "disc", side: 1 },
  { name: "ZENKOBU", sub: "LAGER", kana: "生ビール", mark: "beer", bg: ["#ffb254", "#5a1a06"], ink: "#1a0c04", accent: "#fff2c0", motif: "burst", side: 0 },
  { name: "NOXIRA", sub: "IMPLANTS", kana: "義体", mark: "syringe", bg: ["#04121c", "#0b4a5e"], ink: "#27dcf2", accent: "#ff2e88", motif: "rings", side: 1 },
  { name: "HIBARO", sub: "NOODLE CO.", kana: "ラーメン", mark: "lantern", bg: ["#ff3a2a", "#4a0408"], ink: "#fff1e0", accent: "#ffd24a", motif: "stripes", side: 0 },
  { name: "SYNKOTA", sub: "NET", kana: "通信", mark: "signal", bg: ["#031a0e", "#0c4a2a"], ink: "#39ff9a", accent: "#eceae4", motif: "grid", side: 1 },
  { name: "MAKURO", sub: "ARCADES", kana: "ゲーム", mark: "controller", bg: ["#a24bff", "#1a0638"], ink: "#fcee0a", accent: "#ff3fd2", motif: "burst", side: 0 },
  { name: "YOROZEN", sub: "BANK", kana: "銀行", mark: "crown", bg: ["#0a1430", "#2a3a6a"], ink: "#ffb254", accent: "#eceae4", motif: "rings", side: 1 },
  { name: "OMNIKAN", sub: "MOTORS", kana: "自動車", mark: "target", bg: ["#2f7bff", "#06102e"], ink: "#eceae4", accent: "#ffd24a", motif: "stripes", side: 0 },
  { name: "TESSARIN", sub: "OPTICS", kana: "眼鏡", mark: "glasses", bg: ["#2ee6c8", "#03201c"], ink: "#03140f", accent: "#eceae4", motif: "disc", side: 0 },
  { name: "VORUKA", sub: "VODKA", kana: "酒", mark: "bottle", bg: ["#101014", "#3a0610"], ink: "#eceae4", accent: "#ff3a2a", motif: "grid", side: 0 },
  { name: "KIRAZEN", sub: "COSMETICS", kana: "化粧品", mark: "lips", bg: ["#ff3fd2", "#2a0430"], ink: "#fff0fa", accent: "#27dcf2", motif: "rings", side: 0 },
  { name: "DRAXEN", sub: "CELLS", kana: "電池", mark: "battery", bg: ["#fcee0a", "#3a2a00"], ink: "#120e00", accent: "#ff2e88", motif: "burst", side: 0 },
];

function fit(ctx, text, maxW, maxH, weight) {
  let px = Math.floor(maxH);
  ctx.font = FONT(weight, px);
  const w = ctx.measureText(text).width;
  if (w > maxW) px = Math.floor((px * maxW) / w);
  return Math.max(6, px);
}

function drawPoster(ctx, w, h, d, seed) {
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, d.bg[0]);
  g.addColorStop(1, d.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tall = h > w;
  const s = tall ? w * 0.74 : h * 0.72;
  const mx = tall ? (w - s) / 2 : d.side ? w - s - w * 0.05 : w * 0.05;
  const my = tall ? h * 0.07 : (h - s) / 2;
  const cx = mx + s / 2;
  const cy = my + s / 2;
  // The motif behind the mark.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = d.accent;
  ctx.strokeStyle = d.accent;
  if (d.motif === "disc") {
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.62, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.motif === "burst") {
    for (let i = 0; i < 16; i += 2) {
      const a0 = (i * Math.PI) / 8 + seed;
      const a1 = ((i + 1) * Math.PI) / 8 + seed;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * w * 2, cy + Math.sin(a0) * w * 2);
      ctx.lineTo(cx + Math.cos(a1) * w * 2, cy + Math.sin(a1) * w * 2);
      ctx.closePath();
      ctx.fill();
    }
  } else if (d.motif === "rings") {
    ctx.lineWidth = s * 0.04;
    for (let r = s * 0.3; r < w * 1.2; r += s * 0.16) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (d.motif === "stripes") {
    for (let x = -h; x < w + h; x += h * 0.16) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h * 0.06, h);
      ctx.lineTo(x + h * 0.06 + h * 0.5, 0);
      ctx.lineTo(x + h * 0.5, 0);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += s * 0.12) ctx.fillRect(x, 0, Math.max(1, s * 0.01), h);
    for (let y = 0; y < h; y += s * 0.12) ctx.fillRect(0, y, w, Math.max(1, s * 0.01));
  }
  ctx.restore();
  // Halftone dots down one corner.
  ctx.fillStyle = d.accent;
  for (let y = h * 0.6; y < h; y += h * 0.035) {
    for (let x = tall ? 0 : d.side ? 0 : w * 0.55; x < (tall ? w : d.side ? w * 0.45 : w); x += h * 0.035) {
      const r = h * 0.012 * ((y - h * 0.6) / (h * 0.4));
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // The mark, big, in the brand's ink, with a glow.
  ctx.save();
  ctx.translate(mx, my);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = d.ink;
  ctx.shadowBlur = s * 0.06;
  ctx.strokeStyle = d.ink;
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ICONS[d.mark]?.(ctx, s);
  ctx.stroke();
  ctx.restore();
  // The name, leaning, with an outline in the accent; what it sells on a band.
  const tx = tall ? w * 0.06 : d.side ? w * 0.05 : mx + s + w * 0.03;
  const tw = tall ? w * 0.88 : w - s - w * 0.13;
  const ny = tall ? h * 0.7 : h * 0.4;
  const px = fit(ctx, d.name, tw, (tall ? w : h) * 0.24, 900);
  ctx.save();
  ctx.translate(tx + tw / 2, ny);
  ctx.transform(1, 0, -0.16, 1, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = FONT(900, px);
  ctx.lineJoin = "round";
  ctx.strokeStyle = d.accent;
  ctx.lineWidth = px * 0.14;
  ctx.strokeText(d.name, 0, 0);
  ctx.fillStyle = d.ink;
  ctx.fillText(d.name, 0, 0);
  ctx.restore();
  const by = ny + px * 0.75;
  const bh = px * 0.62;
  ctx.fillStyle = d.accent;
  ctx.fillRect(tx + tw * 0.12, by, tw * 0.76, bh);
  ctx.fillStyle = d.bg[1];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = FONT(800, fit(ctx, d.sub, tw * 0.7, bh * 0.82, 800));
  ctx.fillText(d.sub, tx + tw / 2, by + bh / 2);
  // A column of kana down the far edge, and a sticker.
  const kx = tall ? w * 0.9 : d.side ? w * 0.6 - s * 0.05 : w * 0.95;
  const step = Math.min(h * 0.16, (h * 0.8) / d.kana.length);
  ctx.fillStyle = d.ink;
  ctx.globalAlpha = 0.85;
  ctx.font = FONT(800, Math.floor(step * 0.8));
  [...d.kana].forEach((c, i) => ctx.fillText(c, kx, (tall ? h * 0.06 : h * 0.12) + step * (i + 0.5)));
  ctx.globalAlpha = 1;
  const sx = tall ? w * 0.16 : d.side ? w * 0.62 : w * 0.82;
  const sy = tall ? h * 0.6 : h * 0.8;
  ctx.fillStyle = d.ink;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i * Math.PI) / 12;
    const r = h * (i % 2 ? 0.07 : 0.085) * (tall ? 0.7 : 1);
    ctx[i ? "lineTo" : "moveTo"](sx + Math.cos(a) * r, sy + Math.sin(a) * r);
  }
  ctx.fill();
  ctx.fillStyle = d.bg[1];
  ctx.font = FONT(900, Math.floor(h * (tall ? 0.04 : 0.05)));
  ctx.fillText("NEW", sx, sy);
}

/** The twelve drawn adverts' atlas (see POSTERS). */
export function posterTexture(small = false) {
  const canvas = document.createElement("canvas");
  const k = small ? 0.5 : 1;
  canvas.width = 2048 * k;
  canvas.height = 1024 * k;
  const texture = new THREE.CanvasTexture(canvas);
  const paint = () => {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const W = 512 * k;
    const H = 341 * k;
    POSTERS.forEach((d, i) => {
      ctx.save();
      if (i < 8) {
        ctx.translate((i % 4) * W, Math.floor(i / 4) * H);
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.clip();
        drawPoster(ctx, W, H, d, i * 0.37);
      } else {
        // On its side, head to the right: its up along the slot's x.
        const x0 = ((i - 8) % 4) * W;
        const y0 = 2 * H;
        ctx.beginPath();
        ctx.rect(x0, y0, W, H);
        ctx.clip();
        ctx.setTransform(0, 1, -1, 0, x0 + W, y0);
        drawPoster(ctx, H, W, d, i * 0.37);
      }
      ctx.restore();
    });
    texture.needsUpdate = true;
  };
  paint();
  document.fonts?.ready.then(paint);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = small ? 2 : 4;
  return texture;
}
