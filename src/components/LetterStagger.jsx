// src/components/LetterStagger.jsx — character-by-character reveal
import React from "react";

export default function LetterStagger({
  text,
  delay = 0,
  italic = false,
  className = "",
}) {
  return (
    <span className={`letter-mask reveal whitespace-pre ${className}`}>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          className={italic ? "italic" : ""}
          style={{ animationDelay: `${delay + i * 0.035}s` }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
