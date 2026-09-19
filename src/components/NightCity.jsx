import React from "react";

// The same camera and image stay behind both the drift and the portfolio.
// Portrait has its own camera-matched plate, keeping the entrance in frame.
export default function NightCity({ className = "" }) {
  const base = `${import.meta.env.BASE_URL}scenes/night-city/`;
  return (
    <picture className={className} aria-hidden="true" data-night-city="">
      <source media="(orientation: portrait)" srcSet={`${base}neon-portrait.webp`} width="853" height="1844" />
      <img
        src={`${base}neon-wide.webp`}
        width="1586"
        height="992"
        alt=""
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}
