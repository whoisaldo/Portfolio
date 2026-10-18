// src/components/garage/focus.js: naming the garage's controls, so focus can
// survive the controls being replaced.
//
// The garage swaps whole layouts under the reader: photographs to the 3D
// workshop and back, a lost GPU context, a lazy mount. Each time the element
// that had focus is gone. Every persistent control therefore carries a
// `data-garage-control` key that means the same thing in either layout
// ("car:s6", "mod:s6:virtual-link", "station:s6-bay", "parts"), and the layout
// owner saves the key before a switch and hands it back after. `restoreFocus`
// finds the control with that key, or the nearest equivalent the new layout
// has: a station becomes its car's tab in the photographs, a car tab becomes
// that car's station where the car tabs are not shown (a phone), a part
// becomes its row in the list, and anything else (a hood or stance button the
// station took away, a closed card's buttons) falls back to Parts, the S4's
// tab or the first station.
export const CONTROL = "data-garage-control";
// B5 saves this key and the element's viewport offset in its layout transaction.
// Keep it separate from CONTROL, which also names layout-specific actions.
export const ANCHOR = "data-garage-anchor";

/** Deliberate photo actions may move to a card or back to its row. Reveal
 *  only an offscreen target, without a smooth flight or an extra Tab stop. */
export function focusInView(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const r = el.getBoundingClientRect();
  const css = getComputedStyle(el);
  const top = parseFloat(css.scrollMarginTop) || 0;
  const bottom = parseFloat(css.scrollMarginBottom) || 0;
  if (r.top < top || r.bottom > window.innerHeight - bottom) el.scrollIntoView({ block: "nearest", behavior: "instant" });
}

/** Focus `el` where it stands and say whether focus actually landed. A
 *  connected, laid-out element can still refuse it: a marker the world has
 *  made `visibility: hidden`, or one inside a hidden ancestor. Never scrolls. */
export function tryFocus(el) {
  if (!el?.isConnected || el.hidden || el.getClientRects().length === 0) return false;
  el.focus({ preventScroll: true });
  return document.activeElement === el;
}

/** The key of the garage control holding focus inside `root`, or null. */
export function focusedControl(root) {
  const el = typeof document === "undefined" ? null : document.activeElement;
  if (!root || !el || !root.contains(el)) return null;
  return el.closest(`[${CONTROL}]`)?.getAttribute(CONTROL) ?? null;
}

function candidates(key) {
  const [kind, a, b] = key.split(":");
  const out = [key];
  if (kind === "station" && a) {
    const car = a.startsWith("s4") ? "s4" : a.startsWith("s6") ? "s6" : null;
    if (car) out.push(`car:${car}`);
  }
  if (kind === "car" && a) out.push(`station:${a}`);
  if (kind === "mod" && a) out.push(`row:${a}:${b}`, `car:${a}`, `station:${a}`);
  if (kind === "row" && a) out.push(`mod:${a}:${b}`, `car:${a}`);
  out.push("parts", "car:s4", "station:arrival");
  return out;
}

/** Focus the control `key` names, or its nearest equivalent. Returns the
 *  element focused, or null if nothing in `root` matched. Never scrolls: the
 *  layout owner restores the scroll offset itself. */
export function restoreFocus(root, key) {
  if (!root || !key) return null;
  for (const k of candidates(key)) {
    const el = root.querySelector(`[${CONTROL}="${CSS.escape(k)}"]`);
    if (tryFocus(el)) return el;
  }
  return null;
}
