// src/components/projects/ProjectImage.jsx
//
// Adapter over an image entry in src/data/projects.js. The entry is either a
// bare imported URL (the historic shape) or an object of encoded variants
// emitted by scripts/optimize-images.mjs:
//
//   { src, width, height, lqip, avif: {1024, 1600}, webp: {1024, 1600} }
//
// Accepting both means the data layer and the view layer can be changed
// independently, and a half-migrated asset renders rather than crashing.
import React from "react";
import { imageSrc, srcSetFor } from "../../lib/image";


export default function ProjectImage({
  image,
  alt,
  sizes,
  className,
  fetchPriority,
  loading,
  decoding = "async",
}) {
  const src = imageSrc(image);
  if (!src) return null;

  const variants = typeof image === "object" ? image : null;
  const avif = srcSetFor(variants?.avif);
  const webp = srcSetFor(variants?.webp);

  const img = (
    <img
      src={src}
      alt={alt}
      // Explicit intrinsic size prevents layout shift. The reel's aspect box
      // handles it there, but the modal and the mobile stack both need it.
      width={variants?.width}
      height={variants?.height}
      sizes={sizes}
      className={className}
      decoding={decoding}
      loading={loading}
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
