// src/lib/garage.js: the way into the garage from anywhere.
//
// The console's `garage` command and the deck's links both need to open the
// garage on a particular part without holding a reference to the section.
// One event carries the request; the section listens for it.
import { scrollToSection } from "./scroll";

export const GARAGE_EVENT = "aly:garage";

/** Scroll to the garage and, if given, select a part by its id. */
export function openGarage(modId = null) {
  scrollToSection("garage");
  window.dispatchEvent(new CustomEvent(GARAGE_EVENT, { detail: { mod: modId } }));
}
