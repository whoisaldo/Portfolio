// src/components/garage/Markers.jsx: the part markers over the 3D workshop.
//
// One button per part of the car being looked at, placed on the part as the
// world projects it. The world owns the projection (anchors on the car's own
// moving nodes, occlusion by the room and the cars, a closed hood hiding the
// engine); this layer owns the buttons. It is handed a `pins` source with a
// `subscribe(listener)` method; the listener is called once per rendered
// frame with
//
//   { items: [{ carId, modId, x, y, visible }] }
//
// where x and y are CSS pixels in the stage (the sticky box the canvas
// fills). Nothing here sets React state per frame: each frame writes the
// buttons' transforms, `hidden` and tabindex straight onto the DOM.
//
// On top of what the world says is visible, a marker is hidden when it falls
// under one of the garage's own controls (`blockers`, measured by the
// controls themselves), and on a phone at most four show, never closer than
// a fingertip to each other: the selected one first, then the focused one,
// then in list order. Every part is still in the Parts list.
//
// Keyboard: the shown markers are one roving-tabindex stop; arrow keys and
// Home/End walk them, Enter or Space selects. If the focused marker is hidden
// (the car turned, the hood closed), focus moves to a persistent control
// through `onFocusLost` rather than vanishing with it. Markers never pulse.
import React, { useEffect, useRef } from "react";
import { CONTROL } from "./focus";
import { nextIndex } from "./state";

const pad = (n) => String(n).padStart(2, "0");
const PHONE_MAX = 4;
const PHONE_GAP = 44;
// A marker is centred on its point; keep it this far inside the stage.
const EDGE = 16;

const inside = (r, x, y) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;

export default function Markers({ car, selected, pins, phone, blockers, onSelect, onFocusLost }) {
  const buttons = useRef(new Map());
  const seen = useRef(new WeakSet());
  const stop = useRef(null);
  const sel = useRef(selected);
  sel.current = selected;
  const lost = useRef(onFocusLost);
  lost.current = onFocusLost;
  const isPhone = useRef(phone);
  isPhone.current = phone;
  const layer = useRef(null);
  const size = useRef({ w: Infinity, h: Infinity });

  // The stage's size, kept by an observer so a frame never has to ask for
  // layout in the middle of writing transforms.
  useEffect(() => {
    const el = layer.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      size.current = { w: el.clientWidth, h: el.clientHeight };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [car]);

  useEffect(() => {
    if (!pins?.subscribe || !car) return undefined;
    const apply = (frame) => {
      const root = buttons.current;
      const items = (frame?.items ?? []).filter((it) => it.carId === car.id && root.has(it.modId));
      const { w, h } = size.current;
      const blocked = blockers?.current ?? [];
      const candidates = items.filter(
        (it) => it.visible && it.x >= EDGE && it.y >= EDGE && it.x <= w - EDGE && it.y <= h - EDGE && !blocked.some((r) => inside(r, it.x, it.y)),
      );

      const active = document.activeElement;
      const focusedId = active?.dataset?.markerId ?? null;
      let shown = candidates;
      if (isPhone.current) {
        const rank = (it) => (it.modId === sel.current?.modId && car.id === sel.current?.carId ? 0 : it.modId === focusedId ? 1 : 2);
        const order = [...candidates].sort((a, b) => rank(a) - rank(b));
        shown = [];
        for (const it of order) {
          if (shown.length >= PHONE_MAX) break;
          if (shown.some((s) => Math.hypot(s.x - it.x, s.y - it.y) < PHONE_GAP)) continue;
          shown.push(it);
        }
      }
      const show = new Map(shown.map((it) => [it.modId, it]));

      let focusHidden = false;
      for (const [id, el] of root) {
        const it = show.get(id);
        if (it) {
          el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0)`;
          el.hidden = false;
          el.classList.toggle("is-low", it.y > h * 0.8);
        } else {
          if (el === active) focusHidden = true;
          el.hidden = true;
        }
      }

      // Keep the one Tab stop on a marker that can be seen: the current one,
      // else the selected one, else the first shown.
      const order = [...root.keys()].filter((id) => show.has(id));
      if (!order.includes(stop.current)) {
        const s = sel.current?.carId === car.id && show.has(sel.current.modId) ? sel.current.modId : order[0] ?? null;
        stop.current = s;
      }
      for (const [id, el] of root) el.tabIndex = id === stop.current ? 0 : -1;

      if (focusHidden) lost.current?.();
    };
    return pins.subscribe(apply);
  }, [pins, car, blockers]);

  if (!car) return null;

  const onKeyDown = (e) => {
    const shown = [...buttons.current.values()].filter((el) => !el.hidden);
    const from = shown.indexOf(document.activeElement);
    const next = nextIndex(e.key, from >= 0 ? from : 0, shown.length);
    if (next === null) return;
    e.preventDefault();
    stop.current = shown[next].dataset.markerId;
    for (const el of buttons.current.values()) el.tabIndex = el === shown[next] ? 0 : -1;
    shown[next].focus({ preventScroll: true });
  };

  return (
    <div ref={layer} className="gw-markers" role="group" aria-label={`Parts on the ${car.label}`} onKeyDown={onKeyDown}>
      {car.mods.map((m) => {
        const on = selected?.carId === car.id && selected?.modId === m.id;
        return (
          <button
            key={m.id}
            ref={(el) => {
              if (!el) {
                buttons.current.delete(m.id);
                return;
              }
              // A marker starts hidden until a frame places it. React hands
              // the same element back on every render, so only a new one is
              // reset, or each render would hide (and unfocus) them all.
              if (!seen.current.has(el)) {
                seen.current.add(el);
                el.hidden = true;
                el.tabIndex = -1;
              }
              buttons.current.set(m.id, el);
            }}
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
