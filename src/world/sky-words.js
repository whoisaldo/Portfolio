// src/world/sky-words.js: the words on the far city's signs.
//
// The far city's vertical signs and its lettered boards were strokes drawn
// from a hash: an alphabet nobody reads, the same on every tower. These are
// words, the kinds the kit's own street signs carry (src/world/sign-words.js:
// kana, kanji and plain words for what a shop is or sells, nobody's name),
// painted once onto a small canvas, one character to a 64 px cell, a word to
// a column, and read by the shaders as a mask (ADVERT in sky-columns.js:
// wordDown, wordAcross). The columns are in order of length (four of two
// characters, four of three, four of four, two of five, two of six), which
// is how a shader finds a word that fits its sign without being told any
// lengths. Like the kit's signs, the Japanese is set in whatever CJK face
// the system has.
import * as THREE from "three";

// The landmark towers' names (invented: nobody's), one to a row of the
// second canvas, its emblem in the row's first cell and a letter to each
// cell after it; skyline.js hangs them on the five towers.
export const LOGOS = ["SEIRYU", "KAIRO", "VEXA", "TENKAI", "HALDEN"];
const LOGO_FONT = '800 54px "Chakra Petch", "Helvetica Neue", Arial, sans-serif';

const WORDS = ["寿司", "薬局", "銭湯", "焼肉", "居酒屋", "喫茶店", "サウナ", "BAR", "深夜営業", "回転寿司", "電子部品", "カラオケ", "ネオン横丁", "HOTEL", "ARCADE", "ラーメン横丁"];
const FONT = '900 50px "Chakra Petch", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", "Meiryo", sans-serif';

/** The emblem of name `i`, drawn into a 64 px cell at (x, y). */
function emblem(ctx, i, x, y) {
  const c = [x + 32, y + 32];
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  if (i === 0) {
    // A ring and a chevron through it.
    ctx.arc(c[0], c[1], 22, 0, Math.PI * 2);
    ctx.moveTo(c[0] - 14, c[1] - 6);
    ctx.lineTo(c[0], c[1] + 10);
    ctx.lineTo(c[0] + 14, c[1] - 6);
  } else if (i === 1) {
    // A triangle, a bar under its point.
    ctx.moveTo(c[0], c[1] - 22);
    ctx.lineTo(c[0] + 22, c[1] + 16);
    ctx.lineTo(c[0] - 22, c[1] + 16);
    ctx.closePath();
    ctx.moveTo(c[0] - 8, c[1] + 4);
    ctx.lineTo(c[0] + 8, c[1] + 4);
  } else if (i === 2) {
    // A diamond and its centre.
    ctx.moveTo(c[0], c[1] - 24);
    ctx.lineTo(c[0] + 24, c[1]);
    ctx.lineTo(c[0], c[1] + 24);
    ctx.lineTo(c[0] - 24, c[1]);
    ctx.closePath();
    ctx.rect(c[0] - 5, c[1] - 5, 10, 10);
  } else if (i === 3) {
    // A hexagon round a dot.
    for (let k = 0; k <= 6; k++) ctx[k ? "lineTo" : "moveTo"](c[0] + 23 * Math.cos((k * Math.PI) / 3 + Math.PI / 6), c[1] + 23 * Math.sin((k * Math.PI) / 3 + Math.PI / 6));
    ctx.moveTo(c[0] + 6, c[1]);
    ctx.arc(c[0], c[1], 6, 0, Math.PI * 2);
  } else {
    // Two bars crossed by a third, in a square.
    ctx.rect(c[0] - 21, c[1] - 21, 42, 42);
    ctx.moveTo(c[0] - 9, c[1] - 21);
    ctx.lineTo(c[0] - 9, c[1] + 21);
    ctx.moveTo(c[0] + 9, c[1] - 21);
    ctx.lineTo(c[0] + 9, c[1] + 21);
    ctx.moveTo(c[0] - 21, c[1]);
    ctx.lineTo(c[0] + 21, c[1]);
  }
  ctx.stroke();
}

/** The masks and their uniforms (uWords, uHasWords; uLogos, uHasLogos);
 *  none without a document. */
export function createSkyWords() {
  if (typeof document === "undefined") return { uniforms: { uWords: { value: null }, uHasWords: { value: 0 }, uLogos: { value: null }, uHasLogos: { value: 0 } }, dispose() {} };
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  // The names: 512 px square, a row of 64 px cells to each.
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = 512;
  logoCanvas.height = 512;
  const lctx = logoCanvas.getContext("2d");
  const logos = new THREE.CanvasTexture(logoCanvas);
  logos.flipY = false;
  logos.colorSpace = THREE.NoColorSpace;
  logos.generateMipmaps = true;
  logos.minFilter = THREE.LinearMipmapLinearFilter;
  const paint = () => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    WORDS.forEach((word, w) => [...word].forEach((ch, i) => ctx.fillText(ch, w * 64 + 32, i * 64 + 34)));
    texture.needsUpdate = true;
    lctx.fillStyle = "#000";
    lctx.fillRect(0, 0, 512, 512);
    lctx.fillStyle = "#fff";
    lctx.font = LOGO_FONT;
    lctx.textAlign = "center";
    lctx.textBaseline = "middle";
    LOGOS.forEach((name, row) => {
      emblem(lctx, row, 0, row * 64);
      [...name].forEach((ch, i) => lctx.fillText(ch, (i + 1) * 64 + 32, row * 64 + 35));
    });
    logos.needsUpdate = true;
  };
  paint();
  // (The page's own face for the plain words may land after the city does.)
  document.fonts?.ready.then(paint).catch(() => {});
  return {
    uniforms: { uWords: { value: texture }, uHasWords: { value: 1 }, uLogos: { value: logos }, uHasLogos: { value: 1 } },
    dispose: () => {
      texture.dispose();
      logos.dispose();
    },
  };
}
