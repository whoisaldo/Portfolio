// src/braindance/hud/Markers.jsx: the scanner's marks on the city.
//
// One mark per clue on the layer being looked through and in view, where
// the scanner (src/braindance/scanner.js) says it is on the screen this
// frame. React renders the set of marks, which changes a few times a
// chapter; their positions move in an animation frame of their own, by
// transform, so nothing here re-renders sixty times a second. Each mark is
// a button: a click (or Enter) scans it at once, which is the keyboard's
// way to do what a held click does on the city. Secrets get no mark: the
// layer lights them, and that is all the help they get.
import React, { useEffect, useRef, useState } from "react";
import { bd, useBd } from "../store";
import { CLUES } from "../../data/braindance";

const byId = new Map(CLUES.map((c) => [c.id, c]));

export default function Markers({ engineRef }) {
  const state = useBd();
  const [ids, setIds] = useState([]);
  const refs = useRef(new Map());
  const ring = useRef(null);

  useEffect(() => {
    let raf = 0;
    let key = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const labels = bd.labels.filter((l) => !l.secret);
      const next = labels.map((l) => l.id).sort().join(" ");
      if (next !== key) {
        key = next;
        setIds(next ? next.split(" ") : []);
      }
      for (const l of labels) {
        const el = refs.current.get(l.id);
        if (el) el.style.transform = `translate(${l.x}vw, ${l.y}vh)`;
      }
      if (ring.current) ring.current.style.setProperty("--p", bd.scan.toFixed(3));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (state.mode === "photo") return null;
  return (
    <div className="bd-marks" aria-label="Clues in view">
      {ids.map((id) => {
        const c = byId.get(id);
        if (!c) return null;
        const found = state.found.includes(id);
        const hover = state.hover === id;
        return (
          <div key={id} className="bd-mark-pos" ref={(el) => (el ? refs.current.set(id, el) : refs.current.delete(id))}>
            <button
              type="button"
              data-bd-ui=""
              className={`bd-mark bd-mark-${c.layer} ${found ? "is-found" : ""} ${hover ? "is-hover" : ""}`}
              aria-label={found ? `Open clue: ${c.title}` : "Scan this clue"}
              onClick={() => engineRef.current?.scanner.scan(id)}
            >
              <span className="bd-mark-diamond" aria-hidden="true" ref={hover ? ring : undefined} />
              {(hover || found) && (
                <span className="bd-mark-label">
                  <span className="bd-mark-kicker">{found ? c.kicker : "Unknown"}</span>
                  <span className="bd-mark-title">{found ? c.title : "Hold to scan"}</span>
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
