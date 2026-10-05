// src/braindance/hud/Overlays.jsx: the title, the first-time hint, the
// editor's hint, and the end of the recording.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bd, set, useBd } from "../store";
import { ACHIEVEMENTS, CLUES, END, TUTORIAL } from "../../data/braindance";
import { fmt } from "../format";
import { DURATION } from "../recording";

/** Over the reconstruction: the recording's name, until the city is in. */
export function TitleCard() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = bd.time;
      setT((old) => (now > 11 && old > 11 ? old : Math.abs(old - now) > 0.1 ? now : old));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const on = t < 9.5;
  if (!on) return null;
  const sync = Math.min(100, Math.round(Math.pow(Math.min(1, t / 9), 0.6) * 100));
  const fade = t > 7.5 ? 1 - (t - 7.5) / 2 : 1;
  return (
    <div className="bd-title-card" style={{ opacity: Math.max(0, fade) }} aria-hidden="true">
      <p className="bd-kicker">Braindance</p>
      <p className="bd-title-big">ALI_YOUNES.bd</p>
      <p className="bd-title-meta">
        Night City · {fmt(DURATION)} · sync {String(sync).padStart(3, "0")}%
      </p>
    </div>
  );
}

/** Once, the first time: how to find things. */
export function Tutorial() {
  const state = useBd();
  const [step, setStep] = useState(() => {
    try {
      return localStorage.getItem("aly.braindance.tutorial") ? -1 : 0;
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    if (step < 0) return undefined;
    const timer = window.setTimeout(() => {
      if (step + 1 >= TUTORIAL.length) {
        setStep(-1);
        try {
          localStorage.setItem("aly.braindance.tutorial", "1");
        } catch {
          // Shown again next time.
        }
      } else setStep(step + 1);
    }, step === 0 ? 11000 : 6500);
    return () => window.clearTimeout(timer);
  }, [step]);
  if (step < 0 || state.mode === "photo") return null;
  const tip = TUTORIAL[step];
  if (!tip || (step === 0 && bd.time < 2)) return null;
  return (
    <div className="bd-tutorial" role="status" key={step}>
      {tip.keys.map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
      <span>{tip.line}</span>
    </div>
  );
}

export function EditHint() {
  const state = useBd();
  if (state.mode !== "edit") return null;
  return (
    <div className="bd-edit-hint" role="status">
      <span className="bd-kicker">Editor</span>
      <span>Drag to orbit · scroll to move in · hold click on a clue to scan · F or Space to play</span>
    </div>
  );
}

export function EndScreen({ engineRef }) {
  const state = useBd();
  if (!state.ended || state.mode === "photo") return null;
  const open = CLUES.filter((c) => !c.secret);
  const secrets = CLUES.filter((c) => c.secret);
  const found = open.filter((c) => state.found.includes(c.id)).length;
  const foundSecrets = secrets.filter((c) => state.found.includes(c.id)).length;
  return (
    <div className="bd-end" data-bd-ui="" role="dialog" aria-label={END.title}>
      <p className="bd-kicker">{END.kicker}</p>
      <h2 className="bd-title">{END.title}</h2>
      <dl className="bd-end-stats">
        <div>
          <dt>Clues</dt>
          <dd>
            {found}
            <span>/ {open.length}</span>
          </dd>
        </div>
        <div>
          <dt>Secrets</dt>
          <dd>
            {foundSecrets}
            <span>/ {secrets.length}</span>
          </dd>
        </div>
        <div>
          <dt>Achievements</dt>
          <dd>
            {state.unlocked.length}
            <span>/ {ACHIEVEMENTS.length}</span>
          </dd>
        </div>
      </dl>
      <p className="bd-copy">{found === open.length ? END.all : END.some}</p>
      <div className="bd-end-actions">
        <button type="button" className="bd-btn bd-btn-primary" onClick={() => { set({ ended: false }); engineRef.current?.seek(0); engineRef.current?.play(); }}>
          {END.replay}
        </button>
        <button type="button" className="bd-btn" onClick={() => set({ journal: true, ended: false })}>
          {END.journal}
        </button>
        <a className="bd-btn" href="mailto:aldo@sideband.studio">
          {END.email}
        </a>
      </div>
      <div className="bd-boot-links">
        <Link to="/" className="bd-link">{END.cinematic}</Link>
        <Link to="/recruiters" className="bd-link">{END.recruiters}</Link>
      </div>
    </div>
  );
}
