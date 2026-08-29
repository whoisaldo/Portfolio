// src/components/Picture.jsx
//
// Renders one encoded image entry from src/data/images.js as a <picture>.
//
// `sources` is the generated entry:
//
//   { src, width, height, avif: { 1024: url, 1600: url }, webp: { ... },
//     thumb, lqip, lqipKey }
//
// AVIF is offered first and WebP second, which is the order the formats
// actually want: every browser that decodes AVIF also decodes WebP, so listing
// WebP first would make the AVIF unreachable. The encoder compensates for the
// one place that ordering could hurt (small UI text) by holding screenshot
// AVIF at a conservative quality rather than chasing bytes. See
// scripts/optimize-images.mjs.
//
// A bare URL string is also accepted so an unmigrated entry renders instead of
// crashing.
import React from "react";

/** { 1024: url, 1600: url } -> "url 1024w, url2 1600w" */
function srcSetOf(variants) {
  if (!variants) return undefined;
  const entries = Object.entries(variants);
  if (!entries.length) return undefined;
  return entries
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([w, url]) => `${url} ${w}w`)
    .join(", ");
}

export default function Picture({
  sources,
  width,
  height,
  alt = "",
  sizes,
  className,
  fetchPriority,
  loading,
  decoding = "async",
}) {
  if (!sources) return null;

  const entry = typeof sources === "string" ? { src: sources } : sources;
  if (!entry.src) return null;

  const avif = srcSetOf(entry.avif);
  const webp = srcSetOf(entry.webp);

  const img = (
    <img
      src={entry.src}
      alt={alt}
      // Intrinsic dimensions are mandatory, not decorative: without them the
      // image occupies zero height until it decodes and everything below it
      // jumps. Explicit props win over the generated ones so a caller with a
      // fixed box (the modal's 96x64 thumbnail rail) can say so.
      width={width ?? entry.width}
      height={height ?? entry.height}
      // Without `sizes` the browser assumes the image fills the viewport and
      // over-fetches the largest candidate on every layout.
      sizes={sizes}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
    />
  );

  if (!avif && !webp) return img;

  return (
    <picture>
      {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
      {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}
      {img}
    </picture>
  );
}
