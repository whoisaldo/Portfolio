// src/components/hud/HUDCursor.jsx — custom crosshair-bracket cursor for desktop
// Active only when hovering elements marked with `data-hud-target="card"` or "link".
import React, { useEffect, useRef, useState } from "react";

export default function HUDCursor() {
  const cursorRef = useRef(null);
  const [isFine, setIsFine] = useState(false);
  const [mode, setMode] = useState("hidden"); // "hidden" | "card" | "link"
  const [rect, setRect] = useState(null);
  const lerp = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Detect pointer fineness once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: fine)");
    setIsFine(mq.matches);
    const onChange = () => setIsFine(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Event wiring + RAF — only when fine
  useEffect(() => {
    if (!isFine) return;

    const onMove = (e) => {
      lerp.current.tx = e.clientX;
      lerp.current.ty = e.clientY;
    };
    const onOver = (e) => {
      const target = e.target?.closest?.("[data-hud-target]");
      if (target) {
        const t = target.getAttribute("data-hud-target");
        if (t === "card") {
          setMode("card");
          setRect(target.getBoundingClientRect());
        } else if (t === "link") {
          setMode("link");
          setRect(null);
        }
      }
    };
    const onOut = (e) => {
      const next = e.relatedTarget?.closest?.("[data-hud-target]");
      if (!next) {
        setMode("hidden");
        setRect(null);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);

    let raf = 0;
    const loop = () => {
      lerp.current.x += (lerp.current.tx - lerp.current.x) * 0.22;
      lerp.current.y += (lerp.current.ty - lerp.current.y) * 0.22;
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate3d(${lerp.current.x}px, ${lerp.current.y}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
    };
  }, [isFine]);

  if (!isFine) return null;

  return (
    <>
      {/* Pointer arrow — for link mode */}
      <div
        ref={cursorRef}
        aria-hidden
        className={`fixed top-0 left-0 z-[90] pointer-events-none transition-opacity duration-150
                    ${mode === "link" ? "opacity-100" : "opacity-0"}`}
        style={{ willChange: "transform" }}
      >
        <span className="block text-hud text-sm font-mono -translate-x-1 -translate-y-1">▸</span>
      </div>

      {/* Card bracket frame — sized to the hovered target */}
      {mode === "card" && rect && (
        <div
          aria-hidden
          className="fixed z-[89] pointer-events-none transition-all duration-200 ease-out"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        >
          <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-hud/90" />
          <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-hud/90" />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-hud/90" />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-hud/90" />
        </div>
      )}
    </>
  );
}
