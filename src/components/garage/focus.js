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
    if (el && !el.hidden && el.getClientRects().length > 0) {
      el.focus({ preventScroll: true });
      return el;
    }
  }
  return null;
}
