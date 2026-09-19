// src/components/GarageModel.jsx: the car you can turn.
//
// The garage's other bay. Where the photograph view pins parts on a picture,
// this pins them on the model: a three.js scene (src/lib/garage-scene.js)
// with Ali's S4 inside a Blender-built Night City workshop, a hood that
// opens over the engine bay, and a numbered marker floating at every part,
// projected from its position on the car each frame. Dragging turns the
// car, the buttons and the keys zoom it, the three tabs in the bezel move
// the camera to the front, over the open hood, and to the rear, and a click
// on a marker selects the part exactly as a click on a photograph's pin
// does. The detail card is the same card.
//
// three.js and the room load as this approaches the viewport, so a
// reader who keeps the photographs pays nothing for the model. If WebGL is
// missing or the download fails, the bay says so and offers the photographs.
//
// Markers are DOM buttons, not sprites: they get the same keyboard walk as
// the photograph's pins, screen readers get their names, and the ring, the
// label and the selected state are the same CSS. The scene writes their
// positions straight to the DOM every frame; React never rerenders for a
// camera move.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { loadGarage3d } from "../lib/garage3d";
import { usePrefersReducedMotion } from "../hooks";

const pad = (n) => String(n).padStart(2, "0");
const BUTTON = "pointer-events-auto chamfer chamfer-sm mono-micro bg-ink/90 border border-ink-line text-muted hover:text-primary hover:border-volt transition-colors";

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
  const [expanded, setExpanded] = useState(false);
  const [showParts, setShowParts] = useState(true);
  const focusRef = useRef(0);
  focusRef.current = focus;
  const markersRef = useRef(markers);
  markersRef.current = markers;

  // Build the scene once. Positions land on the pin elements through refs.
  useEffect(() => {
    let alive = true;
    let ro = null;
    let io = null;
    let near = null;
    let visible = false;
    const visibility = () => {
      const scene = sceneRef.current;
      if (visible && !document.hidden) scene?.start();
      else scene?.stop();
    };
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const onFrame = (out) => {
      let firstVisible = -1;
      for (let i = 0; i < out.length; i++) {
        const o = out[i];
        if (o.visible && firstVisible < 0) firstVisible = i;
        const el = pinRefs.current.get(o.id);
        if (!el) continue;
        el.style.left = `${o.x.toFixed(1)}px`;
        el.style.top = `${o.y.toFixed(1)}px`;
        el.classList.toggle("is-dim", !o.front);
        el.classList.toggle("is-off", !o.visible);
      }
      // The tab stop must be a marker that is there: under a closed hood
      // the bay markers are hidden, and a hidden button cannot take focus.
      const cur = out[focusRef.current];
      if (cur && !cur.visible && firstVisible >= 0) setFocus(firstVisible);
    };

    const load = () => loadGarage3d()
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
        io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visibility(); }, { threshold: 0.05 });
        io.observe(wrap);
        document.addEventListener("visibilitychange", visibility);
        setState("ready");
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("[garage] 3D unavailable", err);
        if (alive) setState("failed");
      });

    // Room decoding and reflection capture wait until the garage is near
    // the viewport, keeping that work out of the opening cinematic.
    near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      load();
    }, { rootMargin: "500px 0px" });
    near.observe(wrap);

    return () => {
      alive = false;
      ro?.disconnect();
      io?.disconnect();
      near?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // The scene is built once for the markers it was given; the view and
    // the selection are pushed to it below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const changed = () => setExpanded(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  // The bezel's tabs move the camera and the hood.
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

  const zoom = (factor) => sceneRef.current?.zoomBy(factor);
  const explore = () => {
    sceneRef.current?.setPreset("room");
    setHoodOpen(false);
    setShowParts(false);
  };
  const expand = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else {
      setShowParts(false);
      wrapRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  // Roving tabindex over the markers; arrows walk them in sheet order,
  // skipping the ones the hood is hiding.
  useEffect(() => {
    const i = markers.findIndex((m) => m.id === selected);
    if (i >= 0) setFocus(i);
  }, [selected, markers]);

  const onPinKey = (e) => {
    const n = markers.length;
    if (!n) return;
    const hidden = (i) => pinRefs.current.get(markers[i].id)?.classList.contains("is-off");
    const walk = (from, dir) => {
      let i = from;
      for (let k = 0; k < n; k++) {
        i = (i + dir + n) % n;
        if (!hidden(i)) return i;
      }
      return null;
    };
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = walk(focus, 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = walk(focus, -1);
    else if (e.key === "Home") next = walk(-1, 1);
    else if (e.key === "End") next = walk(n, -1);
    if (next === null) return;
    e.preventDefault();
    setFocus(next);
    pinRefs.current.get(markers[next].id)?.focus();
  };

  // The canvas itself: arrow keys orbit and plus and minus zoom, for a
  // reader without a pointer.
  const onCanvasKey = (e) => {
    const s = sceneRef.current;
    if (!s || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = 0.22;
    if (e.key === "ArrowLeft") s.orbitBy(step, 0);
    else if (e.key === "ArrowRight") s.orbitBy(-step, 0);
    else if (e.key === "ArrowUp") s.orbitBy(0, -step * 0.6);
    else if (e.key === "ArrowDown") s.orbitBy(0, step * 0.6);
    else if (e.key === "+" || e.key === "=") s.zoomBy(0.85);
    else if (e.key === "-" || e.key === "_") s.zoomBy(1.18);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={wrapRef} className="garage-model relative aspect-[4/5] md:aspect-[4/3] bg-ink-deep overflow-clip" onKeyDown={(e) => {
      if (e.key === "Escape" && document.fullscreenElement === wrapRef.current) document.exitFullscreen();
    }}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Ali's Audi S4 in a Night City garage. Drag or use arrow keys to orbit the room; plus and minus zoom."
        onKeyDown={onCanvasKey}
        className="absolute inset-0 w-full h-full block outline-none touch-none"
      />

      {state === "loading" && (
        <p className="absolute inset-0 grid place-items-center mono-label text-dim" aria-live="polite">opening the garage…</p>
      )}
      {state === "failed" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div>
            <p className="mono-label text-dim">The model did not load: it needs WebGL and a connection.</p>
            <button type="button" onClick={onFallback} className="mt-4 chamfer chamfer-sm bg-volt text-ink mono-ui font-bold px-4 py-2.5">
              Show the photographs
            </button>
          </div>
        </div>
      )}

      {/* The markers. */}
      {state === "ready" && (
        <div className="absolute top-3 right-3 flex gap-2">
          <button type="button" onClick={() => setShowParts((on) => !on)} aria-pressed={showParts} className={`${BUTTON} px-2.5 py-2`}>{showParts ? "Hide parts" : "Show parts"}</button>
          <button type="button" onClick={explore} className={`${BUTTON} px-2.5 py-2`}>Explore garage</button>
          {document.fullscreenEnabled && (
            <button type="button" onClick={expand} aria-label={expanded ? "Exit full screen" : "Expand garage"} className={`${BUTTON} p-2`}>
              {expanded ? <Minimize2 className="w-4 h-4" aria-hidden="true" /> : <Maximize2 className="w-4 h-4" aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
      {state === "ready" && showParts && (
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

      {/* The controls: the hood, the zoom, the reset, and how to drive it. */}
      {state === "ready" && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-3 gap-y-2 p-3 bg-gradient-to-t from-ink/85 to-transparent pointer-events-none">
          {hasHood && (
            <button type="button" onClick={toggleHood} aria-pressed={hoodOpen} className={`${BUTTON} px-2.5 py-1.5`}>
              {hoodOpen ? "Close the hood" : "Open the hood"}
            </button>
          )}
          <button type="button" onClick={reset} className={`${BUTTON} px-2.5 py-1.5`}>
            Reset view
          </button>
          <span className="inline-flex gap-1">
            <button type="button" onClick={() => zoom(0.85)} aria-label="Zoom in" className={`${BUTTON} p-1.5`}>
              <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => zoom(1.18)} aria-label="Zoom out" className={`${BUTTON} p-1.5`}>
              <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </span>
          <span className="ml-auto mono-micro text-dim hidden sm:inline">drag to turn · pinch or + and - to zoom</span>
        </div>
      )}
    </div>
  );
}
