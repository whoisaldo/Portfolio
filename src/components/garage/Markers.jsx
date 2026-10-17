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
// marker holding the Tab stop is hidden the stop moves to one that is shown.
// When the marker holding focus is hidden, focus waits on the group itself
// (still inside the markers, so Home and End keep roving) until the shown
// pins have kept still for a moment: a station flight or a selection's own
// camera move hides and shows pins as the camera passes, and none of that is
// the reader's marker going away. Then focus goes back to that marker, else
// to the next one shown. The world writes nothing for a hidden pin, so a
// stretch of the flight with every pin hidden looks like rest; only after
// NONE_MS with nothing shown or written does focus go to a persistent
// control through `onFocusLost`. Markers never pulse.
import React, { useCallback, useEffect, useRef } from "react";
import { CONTROL } from "./focus";
import { nextIndex } from "./state";

const pad = (n) => String(n).padStart(2, "0");

/** Shown: placed by the world (a transform written) and not hidden by it. */
const shown = (el) => !!el && el.style.transform !== "" && el.style.visibility !== "hidden";

// How long the shown pins must keep still before the camera counts as at
// rest (the world writes a moving pin every frame), and how long focus waits
// with no pin shown and none written. The S6 to S4 flight, about 4.3 s on
// a wide screen, shows no S4 pin for about 1.2 s of it (B4's pins-r3).
const REST_MS = 250;
const NONE_MS = 3000;

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
  // Where each pin was last written, the marker focus is waiting for, and
  // the timer that ends the wait once the pins keep still.
  const placed = useRef(new Map());
  const held = useRef(null);
  const rest = useRef(0);
  const movedAt = useRef(0);

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

  // Move the Tab stop and focus to one marker.
  const rove = useCallback((el) => {
    clearTimeout(rest.current);
    rest.current = 0;
    held.current = null;
    stop.current = el.dataset.markerId;
    for (const b of buttons.current.values()) b.tabIndex = b === el ? 0 : -1;
    el.focus({ preventScroll: true });
  }, []);

  // The marker `id` if it is shown, else the next shown after it.
  const nearest = useCallback((id) => {
    const ids = [...buttons.current.keys()];
    const from = Math.max(0, ids.indexOf(id));
    for (let k = 0; k < ids.length; k++) {
      const el = buttons.current.get(ids[(from + k) % ids.length]);
      if (shown(el)) return el;
    }
    return null;
  }, []);

  // The pins have kept still. If focus is still waiting on the group, it
  // goes back to its marker or the nearest one shown; with none shown it
  // waits out NONE_MS from the last write, then leaves the group.
  const atRest = useCallback(() => {
    rest.current = 0;
    if (document.activeElement !== layer.current) {
      held.current = null;
      return;
    }
    const el = nearest(held.current);
    const wait = NONE_MS - (performance.now() - movedAt.current);
    if (el) rove(el);
    else if (wait > 0) rest.current = setTimeout(atRest, wait);
    else {
      held.current = null;
      lost.current?.();
    }
  }, [nearest, rove]);

  // Keep the one Tab stop on a shown marker: the current one, else the
  // selected one, else the first shown.
  const settle = useCallback(() => {
    const all = [...buttons.current.entries()];
    let moved = false;
    for (const [id, el] of all) {
      const at = `${el.style.transform}|${el.style.visibility}`;
      if (placed.current.get(id) === at) continue;
      placed.current.set(id, at);
      moved = true;
    }
    // Hand focus on before touching a tabIndex: changing the tabindex of a
    // focused marker the world has just hidden makes Chrome drop its focus
    // to the page on the spot, and then there is nothing left to hand on.
    const active = document.activeElement;
    const hidden = all.find(([, el]) => el === active && !shown(el));
    if (hidden) {
      held.current = hidden[0];
      layer.current?.focus({ preventScroll: true });
    }
    if (held.current && (moved || hidden)) movedAt.current = performance.now();
    if (held.current && (moved || hidden || !rest.current)) {
      clearTimeout(rest.current);
      rest.current = setTimeout(atRest, REST_MS);
    }
    const visible = all.filter(([, el]) => shown(el)).map(([id]) => id);
    if (!visible.includes(stop.current)) {
      const s = sel.current;
      stop.current = s?.carId === car?.id && visible.includes(s.modId) ? s.modId : visible[0] ?? null;
    }
    for (const [id, el] of all) {
      const t = id === stop.current ? 0 : -1;
      if (el.tabIndex !== t) el.tabIndex = t;
    }
  }, [car, atRest]);

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
    return () => {
      mo.disconnect();
      clearTimeout(rest.current);
      rest.current = 0;
    };
  }, [settle]);

  if (!car) return null;

  // Roving keys never reach the page, even with no marker shown: Home on
  // a button would otherwise scroll the document to its top. From the group
  // (waiting out a camera move) an arrow goes to the nearest shown marker.
  const onKeyDown = (e) => {
    if (nextIndex(e.key, 0, 1) === null) return;
    e.preventDefault();
    const list = [...buttons.current.values()].filter(shown);
    if (!list.length) return;
    const from = list.indexOf(document.activeElement);
    const next =
      from >= 0 || e.key === "Home" || e.key === "End"
        ? nextIndex(e.key, Math.max(from, 0), list.length)
        : list.indexOf(nearest(held.current ?? stop.current));
    rove(list[next]);
  };

  return (
    <div ref={layer} className="gw-markers" role="group" aria-label={`Parts on the ${car.label}`} tabIndex={-1} onKeyDown={onKeyDown}>
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
