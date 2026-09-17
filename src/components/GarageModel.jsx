// src/components/GarageModel.jsx: the car you can turn.
//
// The garage's other bay. Where the photograph view pins parts on a picture,
// this pins them on the model: a three.js scene (src/lib/garage-scene.js)
// with the S4 on a lit floor, a bonnet that opens over the engine bay, and
// a numbered marker floating at every part, projected from its position on
// the car each frame. Dragging turns the car, the wheel zooms it, the three
// tabs in the bezel move the camera to the front, over the open bonnet, and
// to the rear, and a click on a marker selects the part exactly as a click
// on a photograph's pin does. The detail card is the same card.
//
// three.js never loads until this mounts (garage3d.js), so a reader who
// keeps the photographs pays nothing for the model. If WebGL is missing or
// the chunk fails, the bay says so and offers the photographs.
//
// Markers are DOM buttons, not sprites: they get the same keyboard walk as
// the photograph's pins, screen readers get their names, and the ring, the
// label and the selected state are the same CSS. The scene writes their
// positions straight to the DOM every frame; React never rerenders for a
// camera move.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { loadGarage3d } from "../lib/garage3d";
import { usePrefersReducedMotion } from "../hooks";

const pad = (n) => String(n).padStart(2, "0");

export default function GarageModel({ markers, selected, onSelect, view, onFallback }) {
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const pinRefs = useRef(new Map());
  const [state, setState] = useState("loading");
  const [hoodOpen, setHoodOpen] = useState(false);
  const [hasHood, setHasHood] = useState(false);
  const [focus, setFocus] = useState(0);
  const markersRef = useRef(markers);
  markersRef.current = markers;

  // Build the scene once. Positions land on the pin elements through refs.
  useEffect(() => {
    let alive = true;
    let ro = null;
    let io = null;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const onFrame = (out) => {
      for (const o of out) {
        const el = pinRefs.current.get(o.id);
        if (!el) continue;
        el.style.left = `${o.x.toFixed(1)}px`;
        el.style.top = `${o.y.toFixed(1)}px`;
        el.classList.toggle("is-dim", !o.front);
        el.classList.toggle("is-off", !o.visible);
      }
    };

    loadGarage3d()
      .then((mod) => {
        if (!alive) return;
        const scene = mod.createGarageScene(canvas, { markers: markersRef.current, onFrame, reduced });
        sceneRef.current = scene;
        setHasHood(scene.hasHood);
        scene.resize(wrap.clientWidth, wrap.clientHeight);
        scene.setPreset(view);
        setHoodOpen(scene.isHoodOpen());
        ro = new ResizeObserver(() => scene.resize(wrap.clientWidth, wrap.clientHeight));
        ro.observe(wrap);
        // Render only while on screen.
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene.start() : scene.stop()), { threshold: 0.05 });
        io.observe(wrap);
        setState("ready");
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("[garage] 3D unavailable", err);
        if (alive) setState("failed");
      });

    return () => {
      alive = false;
      ro?.disconnect();
      io?.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // The scene is built once for the markers it was given; the view and
    // the selection are pushed to it below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The bezel's tabs move the camera and the bonnet.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || state !== "ready") return;
    s.setPreset(view);
    setHoodOpen(s.isHoodOpen());
  }, [view, state]);

  const toggleHood = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.setHood(!s.isHoodOpen());
    setHoodOpen(s.isHoodOpen());
  }, []);

  const reset = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.setPreset(view);
    setHoodOpen(s.isHoodOpen());
  }, [view]);

  // Roving tabindex over the markers; arrows walk them in sheet order.
  useEffect(() => {
    const i = markers.findIndex((m) => m.id === selected);
    if (i >= 0) setFocus(i);
  }, [selected, markers]);

  const onPinKey = (e) => {
    const n = markers.length;
    if (!n) return;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (focus + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (focus - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    setFocus(next);
    pinRefs.current.get(markers[next].id)?.focus();
  };

  // The canvas itself: arrow keys orbit, for a reader without a pointer.
  const onCanvasKey = (e) => {
    const s = sceneRef.current;
    if (!s) return;
    const step = 0.22;
    if (e.key === "ArrowLeft") s.orbitBy(step, 0);
    else if (e.key === "ArrowRight") s.orbitBy(-step, 0);
    else if (e.key === "ArrowUp") s.orbitBy(0, -step * 0.6);
    else if (e.key === "ArrowDown") s.orbitBy(0, step * 0.6);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={wrapRef} className="garage-model relative aspect-[4/5] md:aspect-[4/3] bg-ink-deep overflow-clip">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="A 3D model of the car. Drag to turn it; arrow keys turn it too."
        onKeyDown={onCanvasKey}
        className="absolute inset-0 w-full h-full block outline-none touch-none"
      />

      {state === "loading" && (
        <p className="absolute inset-0 grid place-items-center mono-label text-dim" aria-live="polite">building the model…</p>
      )}
      {state === "failed" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div>
            <p className="mono-label text-dim">The model needs WebGL, and this browser has not given it.</p>
            <button type="button" onClick={onFallback} className="mt-4 chamfer chamfer-sm bg-volt text-ink mono-ui font-bold px-4 py-2.5">
              Show the photographs
            </button>
          </div>
        </div>
      )}

      {/* The markers. */}
      {state === "ready" && (
        <div role="group" aria-label="Parts pinned on the model" onKeyDown={onPinKey} className="absolute inset-0 pointer-events-none">
          {markers.map((m, i) => {
            const on = selected === m.id;
            return (
              <button
                key={m.id}
                ref={(el) => { if (el) pinRefs.current.set(m.id, el); else pinRefs.current.delete(m.id); }}
                type="button"
                className={`garage-pin pointer-events-auto ${on ? "is-on" : ""}`}
                style={{ left: "-100px", top: "-100px" }}
                tabIndex={i === focus ? 0 : -1}
                aria-pressed={on}
                aria-label={`${m.name}: ${m.where}`}
                onClick={() => onSelect(m.id)}
                onFocus={() => setFocus(i)}
              >
                <span aria-hidden="true">{pad(m.index + 1)}</span>
                <span className="garage-pin-label" aria-hidden="true">{m.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* The controls: the bonnet, the reset, and how to drive it. */}
      {state === "ready" && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-4 gap-y-2 p-3 bg-gradient-to-t from-ink/85 to-transparent pointer-events-none">
          {hasHood && (
            <button
              type="button"
              onClick={toggleHood}
              aria-pressed={hoodOpen}
              className="pointer-events-auto chamfer chamfer-sm mono-micro px-2.5 py-1.5 bg-ink/90 border border-ink-line text-muted hover:text-primary hover:border-volt transition-colors"
            >
              {hoodOpen ? "Close the bonnet" : "Open the bonnet"}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="pointer-events-auto chamfer chamfer-sm mono-micro px-2.5 py-1.5 bg-ink/90 border border-ink-line text-muted hover:text-primary hover:border-volt transition-colors"
          >
            Reset view
          </button>
          <span className="ml-auto mono-micro text-dim hidden sm:inline">drag to turn · scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
