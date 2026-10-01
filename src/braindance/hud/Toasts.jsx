// src/braindance/hud/Toasts.jsx: a clue scanned, an achievement earned.
import React from "react";
import { useBd } from "../store";

const HEAD = { clue: "Clue scanned", achievement: "Achievement unlocked", hint: "Hint" };

export default function Toasts() {
  const state = useBd();
  return (
    <div className="bd-toasts" role="status" aria-live="polite">
      {state.toasts.map((t) => (
        <div key={t.id} className={`bd-toast bd-toast-${t.kind}`}>
          <p className="bd-toast-head">{HEAD[t.kind] ?? t.kind}</p>
          <p className="bd-toast-title">{t.title}</p>
          {t.line && <p className="bd-toast-line">{t.line}</p>}
        </div>
      ))}
    </div>
  );
}
