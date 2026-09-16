// src/components/Cursor.jsx: the reticle.
//
// A small targeting bracket that trails the pointer and snaps wide on
// anything interactive. The native cursor stays: hiding it site-wide breaks
// text selection and the I-beam, and a reticle that replaces the arrow is a
// reticle you have to fight. This one accompanies it.
//
// It only exists for a fine pointer. On touch there is no pointer to follow,
// and under prefers-reduced-motion the trailing lag is dropped so it sits on
// the pointer rather than chasing it. It is a single fixed element updated
// with a transform from one requestAnimationFrame loop, and it paints
// nothing until the pointer has moved once.
import React, { useEffect, useRef } from "react";

const INTERACTIVE = "a[href], button, [role='button'], input, label, summary";

export default function Cursor() {
  const ref = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = ref.current;
    if (!el) return;

    let tx = -100;
    let ty = -100;
    let x = tx;
    let y = ty;
    let hot = false;
    let shown = false;
    let raf = 0;

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      const over = e.target?.closest?.(INTERACTIVE);
      hot = Boolean(over);
      if (!shown) {
        shown = true;
        x = tx;
        y = ty;
        el.style.opacity = "1";
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      shown = false;
      el.style.opacity = "0";
    };

    const tick = () => {
      raf = 0;
      const k = reduced ? 1 : 0.22;
      x += (tx - x) * k;
      y += (ty - y) * k;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${hot ? 1.7 : 1}) rotate(${hot ? 45 : 0}deg)`;
      el.classList.toggle("is-hot", hot);
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="reticle" aria-hidden="true">
      <span className="reticle-tick tl" />
      <span className="reticle-tick tr" />
      <span className="reticle-tick bl" />
      <span className="reticle-tick br" />
      <span className="reticle-dot" />
    </div>
  );
}
