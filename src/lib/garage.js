// src/lib/garage.js: the way into the garage from anywhere.
//
// The console's `garage` command and the deck's links both need to open the
// garage on a particular part without holding a reference to the section.
// The section is a lazy chunk now (src/routes/Home.jsx), so a request can
// arrive before there is anything to hear it, or while the section is on
// its way back from a case study. So a request is kept, not just announced:
// the latest one waits here, numbered, until the section has applied it and
// says so. Whoever mounts subscribes first and then reads the latest, so a
// request made in between is never lost; a newer request replaces an older
// one still waiting.
//
// The old event still goes out with every request, so anything that
// listened for `{ mod }` keeps working.
import { scrollToSection } from "./scroll";
import { prepareGarageSection } from "./garage3d";

export const GARAGE_EVENT = "aly:garage";

let serial = 0;
let latest = null;
const subs = new Set();

/**
 * Ask for the garage: a car, a part on it, or a station. `focus` is for a
 * deliberate activation (a click, Enter), when focus should follow to the
 * part's control once it exists; a scroll or a link does not move it.
 * Returns the request's id.
 */
export function requestGarage({ carId = "s4", modId = null, station = null, focus = false } = {}) {
  prepareGarageSection();
  serial += 1;
  latest = { id: serial, carId, modId, station, focus };
  subs.forEach((fn) => fn(latest));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GARAGE_EVENT, { detail: { mod: carId === "s4" ? modId : null, carId, modId, id: serial } }));
  }
  return serial;
}

/** Scroll to the garage and, if given, select one of the S4's parts by its id. */
export function openGarage(modId = null) {
  scrollToSection("garage");
  return requestGarage({ carId: "s4", modId });
}

/** The request still waiting to be applied, or null. */
export function latestGarageRequest() {
  return latest;
}

/** Hear every request from now on. Subscribe, then read latestGarageRequest(). */
export function subscribeGarageRequests(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** The section applied request `id`: it stops waiting, unless a newer one
 *  has replaced it in the meantime. */
export function ackGarageRequest(id) {
  if (latest && latest.id === id) latest = null;
}

// Numbered events are emitted by this store. Unnumbered events are older
// callers, including requests made before the lazy section has mounted.
if (typeof window !== "undefined") {
  window.addEventListener(GARAGE_EVENT, ({ detail }) => {
    if (!detail || detail.id != null) return;
    requestGarage({
      carId: detail.carId ?? "s4",
      modId: detail.modId ?? detail.mod ?? null,
      station: detail.station ?? null,
      focus: detail.focus === true,
    });
  });
}
