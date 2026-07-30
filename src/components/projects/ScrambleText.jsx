// src/components/projects/ScrambleText.jsx
//
// Resolves text out of monospace noise when it becomes active. Reads as
// decryption rather than as a fade, which is the one piece of sci-fi grammar
// on this site that is actually doing work: it marks "this is the frame you
// are now looking at" instead of decorating something that was already there.
//
// Deliberately cheap: one interval, one setState of a string, no per-character
// DOM. Honours reduced motion by rendering the final text immediately.
import React, { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]{}#$%&*+=";
const TICK_MS = 28;
const SETTLE_TICKS = 3; // ticks each character scrambles before locking

export default function ScrambleText({ text, active, className = "", as: Tag = "span" }) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(text);
  const frame = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    if (reduced || !active) {
      setDisplay(text);
      return;
    }
    frame.current = 0;
    clearInterval(timer.current);

    timer.current = setInterval(() => {
      const f = ++frame.current;
      let done = true;
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === " ") { out += " "; continue; }
        // Characters lock left-to-right, each after SETTLE_TICKS of noise.
        if (f >= i + SETTLE_TICKS) {
          out += ch;
        } else {
          done = false;
          out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      }
      setDisplay(out);
      if (done) clearInterval(timer.current);
    }, TICK_MS);

    return () => clearInterval(timer.current);
  }, [text, active, reduced]);

  return (
    <Tag className={className} aria-label={text}>
      <span aria-hidden="true">{display}</span>
    </Tag>
  );
}
