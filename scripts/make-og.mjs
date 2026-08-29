// scripts/make-og.mjs: generate public/og.png (and the apple-touch-icon).
//
//   node scripts/make-og.mjs
//
// The site had no og:image, so every shared link unfurled as a bare URL.
//
// Text is rendered by sharp's SVG renderer using system fonts rather than the
// site's webfonts: Didot is the closest local match to Fraunces (both are
// high-contrast didone-ish serifs, and both are used here in italic), and
// Menlo stands in for JetBrains Mono. If you want exact Fraunces, install it
// locally and change FONT_DISPLAY below; the layout does not need to change.
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FONT_DISPLAY = "Didot, 'Bodoni 72', Georgia, serif";
const FONT_MONO = "Menlo, monospace";

const INK = "#0e0d14";
const BONE = "#efece5";
const VIOLET = "#7b45f7";
const EMBER = "#ff9538";
const HUD = "#6d5fa8";

const W = 1200;
const H = 630;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const corner = (x, y, sx, sy) =>
  `<path d="M ${x} ${y + sy * 26} L ${x} ${y} L ${x + sx * 26} ${y}"
         fill="none" stroke="${VIOLET}" stroke-width="3" opacity="0.75"/>`;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bloom" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"   stop-color="${VIOLET}" stop-opacity="0.50"/>
      <stop offset="35%"  stop-color="${VIOLET}" stop-opacity="0.14"/>
      <stop offset="70%"  stop-color="${VIOLET}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0 L0 0 0 64" fill="none" stroke="${HUD}" stroke-width="1" opacity="0.07"/>
    </pattern>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="${HUD}" stop-opacity="0.5"/>
      <stop offset="80%" stop-color="${HUD}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${HUD}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${INK}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <circle cx="1010" cy="120" r="380" fill="url(#bloom)"/>

  ${corner(34, 34, 1, 1)}
  ${corner(W - 34, 34, -1, 1)}
  ${corner(34, H - 34, 1, -1)}
  ${corner(W - 34, H - 34, -1, -1)}

  <text x="72" y="268" font-family="${FONT_DISPLAY}" font-style="italic"
        font-size="164" letter-spacing="-5">
    <tspan fill="${BONE}">Ali</tspan><tspan fill="${VIOLET}" dx="24">Younes</tspan>
  </text>

  <text x="76" y="352" font-family="${FONT_DISPLAY}" font-style="italic"
        font-size="34" fill="${BONE}" opacity="0.72">
    ${esc("Systems, iOS and web. Boston.")}
  </text>

  <rect x="72" y="416" width="${W - 72 - 72}" height="1" fill="url(#rule)"/>

  <circle cx="79" cy="462" r="5" fill="${EMBER}"/>
  <text x="98" y="468" font-family="${FONT_MONO}" font-size="18"
        letter-spacing="3.4" fill="${EMBER}">SDE INTERN · AWS CLOUDFORMATION</text>
  <text x="640" y="468" font-family="${FONT_MONO}" font-size="18"
        letter-spacing="3.4" fill="${BONE}" opacity="0.46">8 SHIPPED PROJECTS</text>
  <text x="952" y="468" font-family="${FONT_MONO}" font-size="18"
        letter-spacing="3.4" fill="${BONE}" opacity="0.46">ALIYOUNES.DEV</text>
</svg>`;

const og = join(root, "public", "og.png");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(og);
console.log(`og.png        ${W}x${H}`);

// apple-touch-icon: the favicon mark at 180x180, on the ink ground.
const icon = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#08070d"/>
  <rect x="18" y="18" width="476" height="476" fill="none" stroke="${VIOLET}" stroke-width="20"/>
  <path d="M256 116L128 396h62l24-56h84l24 56h62L256 116zm-24 168l24-58 24 58h-48z" fill="${BONE}"/>
  <rect x="214" y="340" width="84" height="20" fill="${VIOLET}"/>
</svg>`;
await sharp(Buffer.from(icon)).png().toFile(join(root, "public", "apple-touch-icon.png"));
console.log("apple-touch-icon.png  180x180");

writeFileSync(join(root, "public", ".og-source.svg"), svg.trim());
console.log("public/.og-source.svg written for reference");
