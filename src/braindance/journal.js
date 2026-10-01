// src/braindance/journal.js: what has been found, kept between visits.
//
// The clues scanned and the achievements earned live in localStorage, so a
// second visit picks up where the first left off and the journal shows it.
// Nothing else is stored, and nothing leaves the browser.
import { ACHIEVEMENTS, CLUES } from "../data/braindance";
import { bd, emit, set, toast } from "./store";

const KEY = "aly.braindance.v1";

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { found: Array.isArray(raw.found) ? raw.found : [], unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : [] };
  } catch {
    return { found: [], unlocked: [] };
  }
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ found: bd.found, unlocked: bd.unlocked }));
  } catch {
    // Private mode: the journal lasts the visit.
  }
}

export function loadJournal() {
  const { found, unlocked } = read();
  const known = new Set(CLUES.map((c) => c.id));
  set({ found: found.filter((id) => known.has(id)), unlocked });
}

export function forgetJournal() {
  set({ found: [], unlocked: [] });
  write();
}

export function unlock(id) {
  if (bd.unlocked.includes(id)) return false;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return false;
  set({ unlocked: [...bd.unlocked, id] });
  write();
  toast("achievement", a.title, a.line, 5200);
  emit("achievement", id);
  return true;
}

const GROUPS = {
  gigs: ["sideband", "exerly-fitness", "eternal-exchange", "moops-bookstore", "eternal-monitor", "eternal-rich-presence", "face-analytics", "signature-cuts"],
  corpo: ["philips-zero-touch", "pinnatec-auto", "pawtograder", "aws-cloudformation", "top-choice-realty", "robert-defalco-realty", "northeastern"],
  gearhead: ["face", "wheels", "rear", "bmw", "exhaust", "intake", "tune", "brakes"],
};

/** A clue was scanned: remember it, and see what that completes. */
export function markFound(id) {
  if (bd.found.includes(id)) return false;
  const found = [...bd.found, id];
  set({ found });
  write();
  for (const [ach, ids] of Object.entries(GROUPS)) {
    if (ids.every((x) => found.includes(x))) unlock(ach);
  }
  if (id === "couple") unlock("edgerunner");
  if (id === "koi") unlock("koi");
  if (id === "tag") unlock("tag");
  if (id === "morse") unlock("morse");
  if (CLUES.filter((c) => !c.secret).every((c) => found.includes(c.id))) unlock("fullsync");
  return true;
}
