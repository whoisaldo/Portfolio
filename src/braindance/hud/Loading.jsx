// src/braindance/hud/Loading.jsx: jacking in.
//
// The braindance's loading screen. Every line is a real download or a real
// step (src/world/progress.js marks each as it lands; the big files report
// their bytes as they arrive), so the ring moves with the bytes and never
// with a timer. A reader who came through the door usually has most of it
// already: the door starts the same downloads while it waits for a click.
import React from "react";
import { Link } from "react-router-dom";
import { LOAD_STEPS, useBytes, useLoaded } from "../../world/progress";
import { useBd } from "../store";
import { BOOT, LOAD_LABELS } from "../../data/braindance";

// What each weighs, in kB (the door's own table), so the ring is honest
// about where the time goes; a download's reported total takes over.
const KB = { code: 440, city: 3400, car: 2040, voxel: 80, holo: 150, ads: 230, koi: 80, moon: 70, build: 1300 };

export default function Loading() {
  const loaded = useLoaded();
  const bytes = useBytes();
  const state = useBd();
  const failed = state.status === "failed";
  const steps = [...LOAD_STEPS, "build"].map((key) => {
    const done = key === "build" ? state.progress >= 1 : loaded.includes(key);
    const b = bytes[key];
    const part = done ? 1 : b ? Math.min(0.98, b[0] / b[1]) : 0;
    return { key, done, part, kb: b ? b[1] / 1024 : KB[key] };
  });
  const total = steps.reduce((a, s) => a + s.kb, 0);
  const share = steps.reduce((a, s) => a + s.kb * s.part, 0) / total;
  const next = steps.find((s) => !s.done);
  const R = 54;
  const C = 2 * Math.PI * R;
  return (
    <div className="bd-loading" role="status" aria-live="polite">
      <p className="bd-kicker">{BOOT.kicker}</p>
      <svg className="bd-sync" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={R} className="bd-sync-track" />
        <circle cx="70" cy="70" r={R} className="bd-sync-bar" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - share) }} />
        <circle cx="70" cy="70" r={R - 9} className="bd-sync-inner" />
      </svg>
      <p className="bd-sync-n">{failed ? "--" : String(Math.round(share * 100)).padStart(2, "0")}%</p>
      <p className="bd-title bd-loading-title">{failed ? BOOT.failed : BOOT.loading}</p>
      <p className="bd-small">{failed ? BOOT.failedLine : next ? LOAD_LABELS[next.key] : LOAD_LABELS.done}</p>
      <ul className="bd-load-steps" aria-hidden="true">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? "is-done" : s === next ? "is-next" : ""} />
        ))}
      </ul>
      <div className="bd-boot-links">
        <Link to="/" className="bd-link">{BOOT.toCinematic}</Link>
        <Link to="/recruiters" className="bd-link">{BOOT.toRecruiters}</Link>
      </div>
    </div>
  );
}
