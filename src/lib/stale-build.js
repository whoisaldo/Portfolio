// src/lib/stale-build.js: a page left open across a deploy.
//
// Each build names its files by what is in them, and a deploy replaces them.
// A page opened before it still asks for the old names the first time it goes
// to a part of the site it has not loaded yet, and those are gone. Loading
// the page again gets the new ones. That is done once: if the part fails
// again soon after, the error shows as any other does, rather than the page
// loading again for ever.

const MARK = "reloaded-for-new-build";
export const AGAIN_AFTER = 5 * 60 * 1000;

/** Whether `err` is a part of the site whose file could not be loaded, in each engine's words. */
export function isMissingPart(err) {
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(String(err?.message ?? err ?? ""));
}

/**
 * Whether to load the page again now for a part that could not load, marking
 * in `storage` (sessionStorage) that it was done. Not when it was done within
 * AGAIN_AFTER, nor offline (it would not help), nor with nowhere to keep the
 * mark (it could loop).
 */
export function reloadOnce(storage, now = Date.now(), online = true) {
  if (!online) return false;
  try {
    const last = Number(storage.getItem(MARK));
    if (last && last <= now && now - last < AGAIN_AFTER) return false;
    storage.setItem(MARK, String(now));
    return true;
  } catch {
    return false;
  }
}

/** Loads the page again at the address it is at, if reloadOnce says so. */
export function reloadForNewBuild() {
  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Blocked: no mark, so no reload.
  }
  if (reloadOnce(storage, Date.now(), navigator.onLine !== false)) window.location.reload();
}
