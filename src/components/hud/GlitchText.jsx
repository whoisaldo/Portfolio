// src/components/hud/GlitchText.jsx — letter-stagger with RGB chromatic burst per char.
// The chromatic burst comes from `.glitch-text` CSS in index.css which stacks
// a `glitch-burst` keyframe on top of the existing `letter-rise`.
import React from "react";

export default function GlitchText({
  text,
  delay = 0,
  italic = false,
  className = "",
}) {
  return (
    <span className={`glitch-text ${className}`}>
      <span className="letter-mask reveal whitespace-pre">
        {Array.from(text).map((ch, i) => (
          <span
            key={i}
            className={italic ? "italic" : ""}
            style={{ animationDelay: `${delay + i * 0.035}s` }}
          >
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
    </span>
  );
}
