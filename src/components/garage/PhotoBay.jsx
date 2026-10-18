// src/components/garage/PhotoBay.jsx: one of a car's photographs, with a
// marker on every part pinned in it.
//
// The S4's photo bay from the old section, made to take either car. Markers
// are placed in percentages of the photograph, not of the frame: CoverBox
// does the cover-fit arithmetic, so a pin on the grille stays on the grille
// whether the frame is 4:3 on a monitor or 4:5 on a phone, and `focus` keeps
// the car in frame when a tall portrait or a wide night shot is cropped.
//
// The markers are a roving-tabindex group (arrow keys and Home/End walk them,
// Enter or Space selects). A photograph that fails to load is replaced by
// its description and a line saying so; its markers go with it, because a
// marker on nothing points at nothing, and every part stays in the list.
import React, { useEffect, useRef, useState } from "react";
import CoverBox from "../ui/CoverBox";
import Picture from "../Picture";
import { CONTROL } from "./focus";
import { nextIndex } from "./state";

const pad = (n) => String(n).padStart(2, "0");

export default function PhotoBay({ car, view, selected, onSelect, wide, panelId, labelledBy }) {
  const pins = car.mods.flatMap((m) => m.pins.filter((p) => p.view === view.id).map((p) => ({ ...p, mod: m })));
  const pinRefs = useRef([]);
  const frame = useRef(null);
  const [focusAt, setFocusAt] = useState(0);
  const [failed, setFailed] = useState(() => new Set());
  const broken = !view.image || failed.has(view.image.src);

  // The roving tabindex follows the selection into a new view.
  const selIndex = pins.findIndex((p) => selected?.carId === car.id && p.mod.id === selected?.modId);
  useEffect(() => {
    setFocusAt(selIndex >= 0 ? selIndex : 0);
  }, [selIndex, view.id, car.id]);

  // error does not bubble, so listen in the capture phase on the frame.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onError = (e) => {
      if (e.target?.tagName !== "IMG") return;
      const src = view.image?.src;
      if (src) setFailed((s) => new Set(s).add(src));
    };
    el.addEventListener("error", onError, true);
    return () => el.removeEventListener("error", onError, true);
  }, [view.image]);

  const onKeyDown = (e) => {
    const next = nextIndex(e.key, focusAt, pins.length);
    if (next === null) return;
    e.preventDefault();
    setFocusAt(next);
    pinRefs.current[next]?.focus();
  };

  const index = car.views.indexOf(view);

  return (
    <div
      ref={frame}
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
      className="relative min-w-0 border-b md:border-b-0 md:border-r border-ink-line"
    >
      {broken ? (
        <div className="aspect-[4/5] md:aspect-[4/3] bg-ink-deep grid place-items-center p-8">
          <div className="max-w-[40ch] text-center">
            <p className="mono-label text-dim">This photograph did not load</p>
            <p className="mt-3 prose-dark text-[0.9375rem] text-muted">{view.alt}</p>
            <p className="mt-3 text-[0.875rem] text-dim">Every part is still in the list below.</p>
          </div>
        </div>
      ) : (
        <CoverBox
          key={`${car.id}-${view.id}`}
          width={view.image.width}
          height={view.image.height}
          focus={view.focus}
          className="gw-frame aspect-[4/5] md:aspect-[4/3] bg-ink-deep"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${view.image.lqip}")` }} />
          <Picture
            sources={view.image}
            alt={view.alt}
            sizes={wide ? "60vw" : "100vw"}
            loading="lazy"
            className="absolute inset-0 w-full h-full"
          />
          <div className="deck-scanlines absolute inset-0 pointer-events-none" aria-hidden="true" />
          {pins.length > 0 && (
            <div role="group" aria-label={`Parts pinned on the ${car.label} ${view.label.toLowerCase()} photograph`} onKeyDown={onKeyDown}>
              {pins.map((p, i) => {
                const on = selected?.carId === car.id && selected?.modId === p.mod.id;
                return (
                  <button
                    key={`${p.mod.id}-${p.view}`}
                    ref={(el) => { pinRefs.current[i] = el; }}
                    type="button"
                    className={`gw-pin ${on ? "is-on" : ""} ${p.y > 80 ? "is-low" : ""}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    tabIndex={i === focusAt ? 0 : -1}
                    aria-pressed={on}
                    aria-label={`${p.mod.name}: ${p.label}`}
                    {...{ [CONTROL]: `mod:${car.id}:${p.mod.id}` }}
                    onClick={(e) => onSelect(p.mod, e.currentTarget)}
                    onFocus={() => setFocusAt(i)}
                  >
                    <span aria-hidden="true">{pad(p.mod.index + 1)}</span>
                    <span className="gw-pin-label" aria-hidden="true">{p.mod.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </CoverBox>
      )}
      <div className="absolute top-0 left-0 m-3 flex items-center gap-2 pointer-events-none">
        <span className="mono-micro text-dim bg-ink/80 px-2 py-1 tabular-nums">
          {pad(index + 1)} / {pad(car.views.length)}
        </span>
        {view.date && <span className="mono-micro text-dim bg-ink/80 px-2 py-1">{view.date}</span>}
      </div>
    </div>
  );
}
