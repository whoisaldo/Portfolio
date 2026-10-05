// src/braindance/hud/Timeline.jsx: the braindance editor's timeline.
//
// The bottom of the screen, as a braindance editor has it: the transport,
// the time, and a track per layer with the recording's chapters along it
// and every clue on the track of the layer it is found on. The playhead
// moves in its own animation frame off the store's per-frame `time`, never
// through React. Click or drag anywhere on the tracks to scrub.
import React, { useEffect, useRef } from "react";
import { bd, useBd } from "../store";
import { CHAPTERS as MARKS, DURATION } from "../recording";
import { CHAPTERS, LAYER_NAMES } from "../../data/braindance";
import { LAYERS } from "../layers";
import { fmt } from "../format";


function Icon({ kind }) {
  // Drawn, not a font: three glyphs, at the stroke of the rest of the HUD.
  const common = { width: 14, height: 14, viewBox: "0 0 14 14", "aria-hidden": true };
  if (kind === "play") return <svg {...common}><path d="M3 1.5v11l9-5.5z" fill="currentColor" /></svg>;
  if (kind === "pause") return <svg {...common}><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor" /></svg>;
  if (kind === "rew") return <svg {...common}><path d="M7 2v10L1 7zM13 2v10L7 7z" fill="currentColor" /></svg>;
  if (kind === "ff") return <svg {...common}><path d="M1 2v10l6-5zM7 2v10l6-5z" fill="currentColor" /></svg>;
  return null;
}

export default function Timeline({ engineRef, clues = [] }) {
  const state = useBd();
  const headRef = useRef(null);
  const timeRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const f = bd.time / DURATION;
      if (headRef.current) headRef.current.style.transform = `translateX(${(f * 100).toFixed(3)}cqw)`;
      if (timeRef.current) timeRef.current.textContent = fmt(bd.time);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scrub = useRef(null);
  const timeAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * DURATION;
  };
  const onDown = (event) => {
    const e = engineRef.current;
    if (!e || event.button !== 0) return;
    scrub.current = { wasPlaying: bd.playing };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (bd.playing) e.pause();
    e.seek(timeAt(event.clientX));
  };
  const onMove = (event) => {
    if (!scrub.current) return;
    engineRef.current?.seek(timeAt(event.clientX));
  };
  const onUp = () => {
    if (!scrub.current) return;
    if (scrub.current.wasPlaying) engineRef.current?.play();
    scrub.current = null;
  };
  const onKey = (event) => {
    const e = engineRef.current;
    if (!e) return;
    if (event.key === "Home") e.seek(0);
    else if (event.key === "End") e.seek(DURATION - 1);
    else return;
    event.preventDefault();
  };

  const e = engineRef.current;
  const speed = state.playing && (state.rate !== 1 || state.direction !== 1) ? `${state.direction < 0 ? "-" : ""}${state.rate}x` : null;

  return (
    <div className="bd-timeline" data-bd-ui="">
      <div className="bd-transport">
        <button type="button" className="bd-tbtn" aria-label="Rewind" onClick={() => e?.setSpeed(state.direction < 0 && state.rate < 4 ? state.rate * 2 : 2, -1)}>
          <Icon kind="rew" />
        </button>
        <button type="button" className="bd-tbtn bd-tbtn-main" aria-label={state.playing ? "Pause" : "Play"} onClick={() => (state.playing && speed ? e?.setSpeed(1, 1) : e?.toggle())}>
          <Icon kind={state.playing && !speed ? "pause" : "play"} />
        </button>
        <button type="button" className="bd-tbtn" aria-label="Fast forward" onClick={() => e?.setSpeed(state.direction > 0 && state.playing && state.rate < 4 ? state.rate * 2 : 2, 1)}>
          <Icon kind="ff" />
        </button>
        <span className="bd-time">
          <span ref={timeRef}>00:00</span>
          <span className="bd-dim"> / {fmt(DURATION)}</span>
        </span>
        {speed && <span className="bd-speed">{speed}</span>}
        <span className="bd-chapter-name">
          <span className="bd-dim">{String(state.chapter).padStart(2, "0")} //</span> {CHAPTERS[state.chapter]?.title}
        </span>
      </div>

      <div className="bd-tracks">
        <div className="bd-names">
          <span className="bd-names-top" aria-hidden="true" />
          {LAYERS.map((layer) => (
            <button
              key={layer}
              type="button"
              className={`bd-track-name bd-name-${layer} ${state.layer === layer ? "is-on" : ""}`}
              aria-pressed={state.layer === layer}
              onClick={() => e?.setLayer(layer)}
            >
              <span className="bd-dot" aria-hidden="true" />
              {LAYER_NAMES[layer]}
            </button>
          ))}
        </div>
        <div
          className="bd-lanes"
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Recording position"
          aria-valuemin={0}
          aria-valuemax={Math.round(DURATION)}
          aria-valuenow={Math.round(bd.time)}
          aria-valuetext={fmt(bd.time)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <div className="bd-chapters" aria-hidden="true">
            {MARKS.map((c, i) => {
              const end = MARKS[i + 1]?.t ?? DURATION;
              return (
                <span key={c.id} className={`bd-chapter ${i === state.chapter ? "is-on" : ""}`} style={{ left: `${(c.t / DURATION) * 100}%`, width: `${((end - c.t) / DURATION) * 100}%` }}>
                  <span className="bd-chapter-label">{CHAPTERS[i]?.title}</span>
                </span>
              );
            })}
          </div>
          {LAYERS.map((layer) => (
            <div key={layer} className={`bd-lane bd-lane-${layer} ${state.layer === layer ? "is-on" : ""}`} aria-hidden="true">
              {clues
                .filter((c) => c.layer === layer)
                .map((c) => (
                  <span
                    key={c.id}
                    className={`bd-clue-mark ${state.found.includes(c.id) ? "is-found" : ""}`}
                    style={{ left: `${(c.at[0] / DURATION) * 100}%`, width: `${((c.at[1] - c.at[0]) / DURATION) * 100}%` }}
                  />
                ))}
            </div>
          ))}
          <div className="bd-head" ref={headRef} aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
