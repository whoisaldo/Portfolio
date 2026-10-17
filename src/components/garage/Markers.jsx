// src/components/garage/Markers.jsx: the part markers over the 3D workshop.
//
// One button per part of the car being looked at. The world places them: each
// button is handed to `registerPin(key, element)` (key `${carId}:${modId}`),
// and once per rendered frame the world writes its `style.transform` (a
// translate in stage pixels from the stage's top-left), `style.visibility`
// ("hidden" behind geometry, under a closed hood, off the image or past the
// phone's four) and `dataset.occluded`/`dataset.side`. React never sets those,
// so nothing here re-renders per frame. Until the world has placed a marker
// it is not shown (garage.css), so none flashes in the corner.
//
// What this layer does own is the keyboard. The shown markers are one
// roving-tabindex stop; arrow keys and Home/End walk the shown ones, Enter or
// Space selects. A mutation observer watches the world's writes: when the
// marker holding the Tab stop is hidden the stop moves to one that is shown,
// and when the marker holding focus is hidden, focus goes to a persistent
// control through `onFocusLost` rather than vanishing with it. Markers never
// pulse.
import React, { useCallback, useEffect, useRef } from "react";
import { CONTROL } from "./focus";
import { nextIndex } from "./state";

const pad = (n) => String(n).padStart(2, "0");

/** Shown: placed by the world (a transform written) and not hidden by it. */
const shown = (el) => !!el && el.style.transform !== "" && el.style.visibility !== "hidden";

export default function Markers({ car, selected, registerPin, onSelect, onFocusLost }) {
  const layer = useRef(null);
  const buttons = useRef(new Map());
  const refs = useRef(new Map());
  const stop = useRef(null);
  const sel = useRef(selected);
  sel.current = selected;
  const lost = useRef(onFocusLost);
  lost.current = onFocusLost;
  const register = useRef(registerPin);
  register.current = registerPin;

  // One stable ref callback per part, so a re-render neither unregisters nor
  // re-registers a button the world is already moving.
  const refFor = useCallback((carId, modId) => {
    const key = `${carId}:${modId}`;
    let fn = refs.current.get(key);
    if (!fn) {
      fn = (el) => {
        if (el) buttons.current.set(modId, el);
        else buttons.current.delete(modId);
        register.current?.(key, el ?? null);
      };
      refs.current.set(key, fn);
    }
    return fn;
  }, []);

  // Keep the one Tab stop on a shown marker: the current one, else the
  // selected one, else the first shown.
  const settle = useCallback(() => {
    const all = [...buttons.current.entries()];
    const visible = all.filter(([, el]) => shown(el)).map(([id]) => id);
    if (!visible.includes(stop.current)) {
      const s = sel.current;
      stop.current = s?.carId === car?.id && visible.includes(s.modId) ? s.modId : visible[0] ?? null;
    }
    for (const [id, el] of all) {
      const t = id === stop.current ? 0 : -1;
      if (el.tabIndex !== t) el.tabIndex = t;
    }
    const active = document.activeElement;
    if (active && all.some(([, el]) => el === active) && !shown(active)) lost.current?.();
  }, [car]);

  useEffect(() => {
    const el = layer.current;
    if (!el) return undefined;
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        settle();
      });
    });
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ["style"] });
    settle();
    return () => mo.disconnect();
  }, [settle]);

  if (!car) return null;

  const onKeyDown = (e) => {
    const list = [...buttons.current.values()].filter(shown);
    const from = list.indexOf(document.activeElement);
    const next = nextIndex(e.key, from >= 0 ? from : 0, list.length);
    if (next === null) return;
    e.preventDefault();
    stop.current = list[next].dataset.markerId;
    for (const b of buttons.current.values()) b.tabIndex = b === list[next] ? 0 : -1;
    list[next].focus({ preventScroll: true });
  };

  return (
    <div ref={layer} className="gw-markers" role="group" aria-label={`Parts on the ${car.label}`} onKeyDown={onKeyDown}>
      {car.mods.map((m) => {
        const on = selected?.carId === car.id && selected?.modId === m.id;
        return (
          <button
            key={`${car.id}:${m.id}`}
            ref={refFor(car.id, m.id)}
            type="button"
            data-marker-id={m.id}
            className={`gw-pin gw-pin-3d ${on ? "is-on" : ""}`}
            aria-pressed={on}
            aria-label={m.name}
            {...{ [CONTROL]: `mod:${car.id}:${m.id}` }}
            onClick={(e) => onSelect(m, e.currentTarget)}
            onFocus={() => { stop.current = m.id; }}
          >
            <span aria-hidden="true">{pad(m.index + 1)}</span>
            <span className="gw-pin-label" aria-hidden="true">{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
