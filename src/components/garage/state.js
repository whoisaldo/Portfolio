// src/components/garage/state.js: the two small pieces of state plumbing the
// garage's controls share.
//
// useControllable: the station and the selection belong to whoever runs the
// garage (the integration owns them, because the camera, the markers and the
// pending-request queue all read them). When a caller passes a value the
// controls are controlled by it; when it does not, they keep their own, so
// the photographs still work with nothing behind them at all.
//
// useAnnouncer: one polite, atomic status line for the whole garage. It says
// what was chosen and where a hood or the stance came to rest, never what the
// camera is doing on a given frame. Saying the same thing twice in a row is
// made audible by clearing first, since an unchanged text node is not read.
import { useCallback, useEffect, useRef, useState } from "react";

export function useControllable(value, onChange, initial) {
  const [own, setOwn] = useState(initial);
  const controlled = value !== undefined;
  const current = controlled ? value : own;
  const ref = useRef(onChange);
  ref.current = onChange;
  const set = useCallback(
    (next, info) => {
      if (!controlled) setOwn(next);
      ref.current?.(next, info);
    },
    [controlled],
  );
  return [current, set];
}

export function useAnnouncer() {
  const [text, setText] = useState("");
  const last = useRef("");
  const timer = useRef(0);
  const say = useCallback((next) => {
    if (!next) return;
    clearTimeout(timer.current);
    if (next === last.current) {
      setText("");
      timer.current = setTimeout(() => setText(next), 60);
    } else {
      setText(next);
    }
    last.current = next;
  }, []);
  return [text, say];
}

/** Where arrow keys, Home and End move a roving focus among `n` items from
 *  `i`, or null for any other key. Both axes walk, as the S4's markers did. */
export function nextIndex(key, i, n) {
  if (!n) return null;
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n;
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n;
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  return null;
}

/** A retained request ({ id, carId?, modId?, mod?, focus? }), applied once per
 *  increasing id and then acknowledged, also when it names nothing real so
 *  the queue can let it go. Returns the one-shot focus target (a deliberate
 *  activation wants the card's heading focused once it exists) and, for a
 *  request naming only a car, that car. */
export function useGarageRequest(request, onRequestApplied, select, resolve) {
  const applied = useRef(0);
  const [focusTarget, setFocusTarget] = useState(null);
  const [carHint, setCarHint] = useState(null);
  useEffect(() => {
    if (!request || request.id == null || request.id <= applied.current) return;
    applied.current = request.id;
    const sel = resolve(request);
    if (sel?.modId) {
      select(sel, { source: "request", requestId: request.id });
      if (request.focus) setFocusTarget(sel);
    } else if (sel?.carId && request.carId) {
      setCarHint({ carId: sel.carId, id: request.id });
    }
    onRequestApplied?.(request.id);
  }, [request, onRequestApplied, select, resolve]);
  const onFocused = useCallback(() => setFocusTarget(null), []);
  return { focusTarget, onFocused, carHint };
}
