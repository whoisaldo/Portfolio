// src/braindance/Braindance.jsx: the third way in.
//
// The cinematic is a page over a city; /recruiters is the page without the
// city. This is the city without the page: a braindance, a recorded night
// in Night City that can be played, paused, scrubbed, rewound and walked
// around in, with the portfolio hidden in it as clues to scan.
//
// Its own shell, as /recruiters has its own (see App.jsx): no navbar, no
// door, no scroll stage, no page. It mounts the city through the same lazy
// chunk the cinematic uses, so a reader who came from the cinematic has it
// cached already. Desktop only, by Ali's call: a phone is told so and
// offered the other two.
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { hasGpuAcceleration } from "../lib/gpu";
import { unlockAudio } from "../lib/audio";
import { stopAmbient } from "../lib/ambient";
import { prefetchWorld } from "../world/load";
import { bd, resetBd, set, useBd } from "./store";
import Hud from "./hud/Hud";
import { useControls } from "./controls";
import { BOOT } from "../data/braindance";
import "./braindance.css";

function isDesktop() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches && window.innerWidth >= 900 && hasGpuAcceleration();
}

function NotHere() {
  return (
    <div className="bd-root bd-notice">
      <div className="bd-notice-card">
        <p className="bd-kicker">{BOOT.kicker}</p>
        <h1 className="bd-title">{BOOT.notHereTitle}</h1>
        <p className="bd-copy">{BOOT.notHereLine}</p>
        <div className="bd-notice-links">
          <Link to="/" className="bd-btn">{BOOT.toCinematic}</Link>
          <Link to="/recruiters" className="bd-btn bd-btn-quiet">{BOOT.toRecruiters}</Link>
        </div>
      </div>
    </div>
  );
}

export default function Braindance() {
  const location = useLocation();
  const [desktop] = useState(isDesktop);
  // The door's menu sends readers here with its own click, which is the
  // gesture audio needs; anyone arriving by the address gets one button.
  const fromDoor = location.state?.jack === true;
  const [jacked, setJacked] = useState(false);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const state = useBd();

  useEffect(() => {
    resetBd();
    stopAmbient({ fade: 0.4 });
    document.documentElement.dataset.world = "on";
    document.title = "Braindance · Ali Younes";
    prefetchWorld();
    return () => {
      delete document.documentElement.dataset.world;
    };
  }, []);

  useEffect(() => {
    if (fromDoor && desktop) jackIn();
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function jackIn() {
    if (jacked) return;
    unlockAudio();
    setJacked(true);
  }

  // Build the braindance once jacked in; tear it down on the way out.
  useEffect(() => {
    if (!jacked || !canvasRef.current) return undefined;
    let alive = true;
    let engine = null;
    set({ status: "loading", progress: 0.1 });
    import("./engine.js")
      .then(({ createBraindance }) =>
        createBraindance(canvasRef.current, {
          onProgress: (p) => alive && set({ progress: p }),
          onFirstFrame: () => alive && set({ status: "ready" }),
        }),
      )
      .then((e) => {
        if (!alive) {
          e.dispose();
          return;
        }
        engine = e;
        engineRef.current = e;
        if (import.meta.env.DEV) window.__bd = e;
        e.start();
        e.play();
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("[braindance] failed", err);
        if (alive) set({ status: "failed" });
      });
    return () => {
      alive = false;
      engineRef.current = null;
      engine?.dispose();
    };
  }, [jacked]);

  useControls(engineRef, jacked && state.status === "ready");

  if (!desktop) return <NotHere />;

  return (
    <div className={`bd-root ${state.status === "ready" ? "is-ready" : ""}`}>
      <canvas ref={canvasRef} className="bd-canvas" aria-label={BOOT.canvasLabel} />
      {!jacked && (
        <div className="bd-boot">
          <div className="bd-boot-card">
            <p className="bd-kicker">{BOOT.kicker}</p>
            <h1 className="bd-title">{BOOT.title}</h1>
            <p className="bd-copy">{BOOT.line}</p>
            <button type="button" className="bd-btn bd-btn-primary" autoFocus onClick={jackIn}>
              {BOOT.jackIn}
            </button>
            <p className="bd-small">{BOOT.sound}</p>
            <div className="bd-boot-links">
              <Link to="/" className="bd-link">{BOOT.toCinematic}</Link>
              <Link to="/recruiters" className="bd-link">{BOOT.toRecruiters}</Link>
            </div>
          </div>
        </div>
      )}
      {jacked && state.status !== "ready" && (
        <div className="bd-loading" role="status">
          <p className="bd-kicker">{state.status === "failed" ? BOOT.failed : BOOT.loading}</p>
          <div className="bd-loading-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${bd.progress})` }} />
          </div>
          {state.status === "failed" && (
            <div className="bd-boot-links">
              <Link to="/" className="bd-link">{BOOT.toCinematic}</Link>
              <Link to="/recruiters" className="bd-link">{BOOT.toRecruiters}</Link>
            </div>
          )}
        </div>
      )}
      {jacked && state.status === "ready" && <Hud engineRef={engineRef} />}
    </div>
  );
}
