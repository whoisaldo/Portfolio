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

const WORDS = ["寿司", "薬局", "銭湯", "焼肉", "居酒屋", "喫茶店", "サウナ", "BAR", "深夜営業", "回転寿司", "電子部品", "カラオケ", "ネオン横丁", "HOTEL", "ARCADE", "ラーメン横丁"];
const FONT = '900 50px "Chakra Petch", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", "Meiryo", sans-serif';

/** The mask and its uniforms (uWords, uHasWords); none without a document. */
export function createSkyWords() {
  if (typeof document === "undefined") return { uniforms: { uWords: { value: null }, uHasWords: { value: 0 } }, dispose() {} };
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  const paint = () => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    WORDS.forEach((word, w) => [...word].forEach((ch, i) => ctx.fillText(ch, w * 64 + 32, i * 64 + 34)));
    texture.needsUpdate = true;
  };
  paint();
  // (The page's own face for the plain words may land after the city does.)
  document.fonts?.ready.then(paint).catch(() => {});
  return { uniforms: { uWords: { value: texture }, uHasWords: { value: 1 } }, dispose: () => texture.dispose() };
}
