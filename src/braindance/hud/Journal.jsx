// src/braindance/hud/Journal.jsx: everything there is to find, and what has been.
//
// J opens it. Chapter by chapter, every clue: the ones found by name (a
// click reopens the card), the ones not yet as the layer they hide on and
// a button that takes the recording to the moment they appear. Secrets are
// counted, never listed. Then the achievements.
import React from "react";
import { set, useBd } from "../store";
import { ACHIEVEMENTS, CHAPTERS, CLUES, LAYER_NAMES } from "../../data/braindance";
import { CHAPTERS as MARKS, DURATION } from "../recording";
import { fmt } from "../format";

export default function Journal({ engineRef, windows = [] }) {
  const state = useBd();
  if (!state.journal) return null;
  const at = new Map(windows.map((w) => [w.id, w.at]));
  const chapterOf = (t) => {
    let i = 0;
    while (i + 1 < MARKS.length && t >= MARKS[i + 1].t) i++;
    return i;
  };
  const open = CLUES.filter((c) => !c.secret);
  const secrets = CLUES.filter((c) => c.secret);
  const found = open.filter((c) => state.found.includes(c.id)).length;
  const foundSecrets = secrets.filter((c) => state.found.includes(c.id)).length;
  const groups = CHAPTERS.map((ch, i) => ({ ch, clues: open.filter((c) => at.has(c.id) && chapterOf(at.get(c.id)[0] + 0.01) === i) })).filter((g) => g.clues.length);

  return (
    <div className="bd-panel bd-journal" data-bd-ui="" role="dialog" aria-label="Journal">
      <header className="bd-journal-head">
        <p className="bd-kicker">Journal</p>
        <p className="bd-journal-count">
          {found} / {open.length} clues <span className="bd-dim">· {foundSecrets} / {secrets.length} secrets · {state.unlocked.length} / {ACHIEVEMENTS.length} achievements</span>
        </p>
        <button type="button" className="bd-card-close" aria-label="Close" onClick={() => set({ journal: false })}>
          ×
        </button>
      </header>
      <div className="bd-journal-body">
        <div>
          {groups.map(({ ch, clues }) => (
            <section key={ch.id} className="bd-journal-chapter">
              <h3>{ch.title}</h3>
              <ul>
                {clues.map((c) => {
                  const done = state.found.includes(c.id);
                  const t = at.get(c.id)?.[0] ?? 0;
                  return (
                    <li key={c.id} className={done ? "is-found" : ""}>
                      <span className={`bd-dot bd-dot-${c.layer}`} aria-hidden="true" />
                      {done ? (
                        <button type="button" onClick={() => set({ open: c.id, journal: false })}>
                          {c.title}
                        </button>
                      ) : (
                        <span className="bd-dim">Unknown, {LAYER_NAMES[c.layer].toLowerCase()} layer</span>
                      )}
                      <button
                        type="button"
                        className="bd-journal-jump"
                        onClick={() => {
                          const e = engineRef.current;
                          if (!e) return;
                          e.seek(Math.min(DURATION, t + 0.4));
                          e.setLayer(c.layer);
                          set({ journal: false });
                        }}
                      >
                        {fmt(t)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <section className="bd-journal-ach">
          <h3>Achievements</h3>
          <ul>
            {ACHIEVEMENTS.map((a) => {
              const done = state.unlocked.includes(a.id);
              return (
                <li key={a.id} className={done ? "is-found" : ""}>
                  <span className="bd-ach-title">{done ? a.title : "Locked"}</span>
                  <span className="bd-dim">{done || a.id !== "overdrive" ? a.line : "A code, entered anywhere."}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
