// src/lib/image.js — helpers shared by the image components.
// Kept out of the .jsx files so React Fast Refresh keeps working (a module
// that exports both a component and plain functions loses it).

/** The URL to use as a plain <img> src, whether `image` is a string or an
 *  object of encoded variants from scripts/optimize-images.mjs. */
export function imageSrc(image) {
  if (!image) return undefined;
  return typeof image === "string" ? image : image.src;
}

/** "#7C5CFF" -> "124 92 255", for use in `rgb(var(--accent) / <alpha>)`. */
export function hexToRgbTriplet(hex, fallback = "123 69 247") {
  if (typeof hex !== "string") return fallback;
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return fallback;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Build a srcSet string from a { width: url } map. */
export const srcSetFor = (variants) =>
  variants
    ? Object.entries(variants).map(([w, url]) => `${url} ${w}w`).join(", ")
    : undefined;
