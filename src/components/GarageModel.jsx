import React, { useEffect, useId, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut, Box } from "lucide-react";
import Picture from "./Picture";
import { s4Poster } from "../data/s4";

export default function GarageModel() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("poster");
  const [view, setView] = useState("front");
  const [hoodOpen, setHoodOpen] = useState(false);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const startRef = useRef(null);
  const helpId = useId();

  useEffect(() => {
    if (!attempt) return;
    const controller = new AbortController();
    let scene;
    const fail = () => {
      if (!controller.signal.aborted) {
        scene?.dispose();
        sceneRef.current = null;
        setStatus("error");
      }
    };
    import("../lib/garage-scene.js")
      .then((module) => module.createGarageScene(canvasRef.current, { signal: controller.signal, onFailure: fail }))
      .then((created) => {
        scene = created;
        if (controller.signal.aborted) { scene.dispose(); return; }
        sceneRef.current = scene;
        setStatus("ready");
        canvasRef.current?.focus({ preventScroll: true });
      })
      .catch(fail);
    return () => {
      controller.abort();
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [attempt]);

  const start = () => { setStatus("loading"); setView("front"); setHoodOpen(false); setAttempt((n) => n + 1); };
  const close = () => {
    setAttempt(0);
    setStatus("poster");
    requestAnimationFrame(() => startRef.current?.focus({ preventScroll: true }));
  };
  const chooseView = (next) => { setView(next); sceneRef.current?.setView(next); };
  const toggleHood = () => {
    const open = !hoodOpen;
    setHoodOpen(open);
    setView(open ? "engine" : "front");
    sceneRef.current?.setHoodOpen(open);
  };
  const ready = status === "ready";

  return (
    <div className="s4-viewer garage-frame aspect-[4/5] md:aspect-[4/3]">
      <div className="s4-viewer-floor" aria-hidden="true" />
      {!ready && (
        <Picture sources={s4Poster} alt="3D model of my grey 2013 Audi S4, with R8 wheels, the RS4 front bumper and carbon trim." loading="lazy" sizes="(min-width: 768px) 60vw, 100vw" className="s4-viewer-poster" />
      )}
      {attempt > 0 && (
        <canvas
          ref={canvasRef}
          className={`s4-viewer-canvas ${ready ? "is-ready" : ""}`}
          tabIndex={ready ? 0 : -1}
          role="img"
          aria-label="Interactive Audi S4 model"
          aria-describedby={helpId}
          aria-hidden={!ready}
        />
      )}
      <div className="s4-viewer-heading">
        <span className="mono-micro text-muted">ALDO&apos;S S4</span>
        <span className="mono-micro text-dim">B8.5 / 2013</span>
      </div>
      {ready ? (
        <>
          <div className="s4-viewer-presets" role="group" aria-label="Model camera views">
            {[["front", "Front"], ["rear", "Rear"], ["side", "Side"], ["wheels", "Wheels"]].map(([id, label]) => (
              <button key={id} type="button" className="s4-control" aria-pressed={view === id} onClick={() => chooseView(id)}>{label}</button>
            ))}
            <button type="button" className="s4-control" aria-pressed={hoodOpen} onClick={toggleHood}>{hoodOpen ? "Close hood" : "Open hood"}</button>
          </div>
          <div className="s4-viewer-tools" role="group" aria-label="Model controls">
            <button className="s4-control" type="button" aria-label="Zoom in" onClick={() => sceneRef.current?.zoom(0.85)}><ZoomIn size={17} aria-hidden="true" /></button>
            <button className="s4-control" type="button" aria-label="Zoom out" onClick={() => sceneRef.current?.zoom(1.18)}><ZoomOut size={17} aria-hidden="true" /></button>
            <button className="s4-control" type="button" aria-label="Reset model view" onClick={() => chooseView("front")}><RotateCcw size={17} aria-hidden="true" /></button>
          </div>
          <div className="s4-viewer-footer">
            <p id={helpId} className="mono-micro text-muted">Drag to orbit. Arrow keys rotate, + / − zoom.</p>
            <button type="button" className="s4-control shrink-0" onClick={close}>Close 3D</button>
          </div>
        </>
      ) : (
        <div className="s4-viewer-start">
          <p role="status" className="mono-micro text-muted text-center">
            {status === "loading" ? "Loading the S4…" : status === "error" ? "3D couldn't load. The photos are still available." : "The daily, from every angle."}
          </p>
          <button ref={startRef} type="button" className="s4-explore" onClick={start} disabled={status === "loading"}>
            <Box size={17} aria-hidden="true" />
            {status === "loading" ? "Loading…" : status === "error" ? "Try 3D again" : "Explore in 3D"}
          </button>
          <span id={helpId} className="sr-only">Drag to orbit. Use arrow keys to rotate, plus and minus to zoom, and Home to reset.</span>
        </div>
      )}
    </div>
  );
}
