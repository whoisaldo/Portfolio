// src/braindance/hud/ScanCard.jsx: what a scan turns up.
//
// The card for the clue just scanned (or reopened from the journal), on
// the right of the screen, with a leader line back to where the clue is
// in the city while it is in view, as a game's scanner draws one. Links
// open in a new tab so the recording keeps its place. Escape or the close
// button puts it away; so does scanning something else.
import React, { useEffect, useRef } from "react";
import { bd, set, useBd } from "../store";
import { CLUES, LAYER_NAMES } from "../../data/braindance";

const byId = new Map(CLUES.map((c) => [c.id, c]));

export default function ScanCard() {
  const state = useBd();
  const c = state.open ? byId.get(state.open) : null;
  const lineRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!c) return undefined;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const line = lineRef.current;
      const card = cardRef.current;
      if (!line || !card) return;
      const l = bd.labels.find((x) => x.id === c.id);
      if (!l) {
        line.style.opacity = "0";
        return;
      }
      const r = card.getBoundingClientRect();
      const x0 = (l.x / 100) * window.innerWidth;
      const y0 = (l.y / 100) * window.innerHeight;
      const x1 = r.left;
      const y1 = r.top + 28;
      line.setAttribute("d", `M${x0},${y0} L${x0 + (x1 - x0) * 0.5},${y1} L${x1},${y1}`);
      line.style.opacity = "1";
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [c]);

  if (!c || state.mode === "photo" || state.ended) return null;
  return (
    <>
      <svg className="bd-leader" aria-hidden="true">
        <path ref={lineRef} className={`bd-leader-${c.layer}`} />
      </svg>
      <section ref={cardRef} className={`bd-card bd-card-${c.layer}`} data-bd-ui="" aria-label={c.title} key={c.id}>
        <header className="bd-card-head">
          <p className="bd-card-kicker">
            <span className="bd-dot" aria-hidden="true" /> {c.kicker}
            <span className="bd-card-layer">{LAYER_NAMES[c.layer]}</span>
          </p>
          <button type="button" className="bd-card-close" aria-label="Close" onClick={() => set({ open: null })}>
            ×
          </button>
        </header>
        <h2 className="bd-card-title">{c.title}</h2>
        <p className="bd-card-body">{c.body}</p>
        {c.facts && (
          <dl className="bd-card-facts">
            {c.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {c.links && (
          <p className="bd-card-links">
            {c.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                {l.label} ↗
              </a>
            ))}
          </p>
        )}
      </section>
    </>
  );
}
