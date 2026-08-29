// src/lib/beacon.js: the client half of the analytics.
//
// Sends batches of events to stats.aliyounes.dev. Everything here is written
// under one rule: the page must behave identically whether this file works,
// fails, is blocked by an extension, or is never loaded at all. Nothing it
// does is on the critical path, nothing it does can throw into React, and it
// holds no state the rest of the app can see.
//
// WHAT IS COLLECTED
//
//   A session id (sessionStorage, dies with the tab) and a visitor id
//   (localStorage, so a second visit is recognisable as a second visit).
//   Both are random; neither is derived from anything about the person.
//
//   Which sections were on screen and for how long, how far down the page they
//   reached, which outbound links and résumé links were clicked, the referrer,
//   and the viewport size. The server adds the network's organisation from the
//   request IP and then discards the address.
//
// WHAT IS NOT COLLECTED
//
//   No cookies. No cursor tracking, no keystrokes, no clipboard, no form
//   contents, no session replay, no cross-site identifiers, no fingerprinting.
//   The site has no forms and no login, so there is nothing of that kind to
//   take even accidentally.

const ENDPOINT = import.meta.env.VITE_STATS_ENDPOINT || "";

// Global Privacy Control is a real legal signal in several US states; Do Not
// Track is not, but honouring it costs almost nothing and is the honest
// default for a site that reports the visitor's employer.
function optedOut() {
  try {
    if (navigator.globalPrivacyControl === true) return true;
    const dnt = navigator.doNotTrack ?? window.doNotTrack;
    return dnt === "1" || dnt === "yes";
  } catch {
    return false;
  }
}

const uuid = () =>
  crypto.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

function stored(store, key, make) {
  try {
    const hit = store.getItem(key);
    if (hit) return hit;
    const made = make();
    store.setItem(key, made);
    return made;
  } catch {
    // Private mode, or storage disabled. A per-load id still produces valid
    // per-session numbers; only the returning-visitor count degrades.
    return make();
  }
}

let queue = [];
// Engagement is measured in VISIBLE time, not wall-clock. A link opened into a
// background tab and read twenty minutes later would otherwise report twenty
// minutes of reading that never happened, and "median visit" is the number the
// dashboard leans on hardest. `visibleMs` banks the time already spent on
// screen; `visibleSince` is when the current visible stretch began, or 0 while
// the tab is hidden.
let visibleMs = 0;
let visibleSince = 0;
let maxScroll = 0;
let deepest = null;
let deepestRank = -1;
let flushTimer = 0;
let disabled = true;
let sid = "";
let vid = "";
let lastPageview = "";

/** Time on screen so far, including the stretch currently in progress. */
function elapsed() {
  return Math.round(visibleMs + (visibleSince ? performance.now() - visibleSince : 0));
}

/** Section order, so "deepest reached" is a rank rather than a guess. */
const ORDER = ["hero", "projects", "experience", "teardown", "contact"];

function payload() {
  const events = queue;
  queue = [];
  return JSON.stringify({
    sid,
    vid,
    path: location.pathname + location.search,
    ref: document.referrer || null,
    utm_source: new URLSearchParams(location.search).get("utm_source"),
    utm_medium: new URLSearchParams(location.search).get("utm_medium"),
    utm_campaign: new URLSearchParams(location.search).get("utm_campaign"),
    vw: window.innerWidth,
    vh: window.innerHeight,
    scroll: maxScroll,
    ms: elapsed(),
    deepest,
    events,
  });
}

/**
 * `keepalive` rather than a plain fetch so a flush started during pagehide
 * survives the navigation. sendBeacon is preferred where available because it
 * is the only transport the browser guarantees to complete on unload.
 */
function send(final = false) {
  if (disabled || (!queue.length && !final)) return;
  const body = payload();
  try {
    if (final && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
      mode: "cors",
      credentials: "omit",
    }).catch(() => {});
  } catch {
    /* never surfaces */
  }
}

function schedule() {
  if (disabled || flushTimer) return;
  // Batched on a 12s idle rather than sent per event: a scroll through the
  // page produces a dozen section transitions, and twelve requests to record
  // one visit is rude to both ends of the connection.
  flushTimer = window.setTimeout(() => {
    flushTimer = 0;
    send(false);
  }, 12_000);
}

export function track(t, name, extra = {}) {
  if (disabled) return;
  queue.push({ t, n: name ?? null, p: location.pathname, ...extra });
  if (queue.length >= 40) send(false);
  else schedule();
}

export function initBeacon() {
  if (!ENDPOINT || optedOut()) return () => {};
  // A prerender or a background tab that is never looked at is not a visit.
  if (document.visibilityState === "prerender") return () => {};

  disabled = false;
  visibleSince = document.visibilityState === "visible" ? performance.now() : 0;
  sid = stored(sessionStorage, "ay.sid", uuid);
  vid = stored(localStorage, "ay.vid", uuid);

  // React StrictMode mounts, unmounts and remounts in development, and a future
  // route change would remount too. Without this guard the same load is counted
  // as two page views, which quietly doubles the one number everything else is
  // a ratio of.
  const viewKey = `${sid}:${location.pathname}`;
  if (lastPageview !== viewKey) {
    lastPageview = viewKey;
    track("pageview", document.title);
  }

  const cleanups = [];

  // ---- scroll depth -------------------------------------------------------
  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
      if (pct > maxScroll) maxScroll = Math.min(pct, 100);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanups.push(() => {
    window.removeEventListener("scroll", onScroll);
    if (raf) cancelAnimationFrame(raf);
  });

  // ---- section dwell ------------------------------------------------------
  // Time is accumulated while a section is intersecting and emitted when it
  // stops. Measuring on entry only would record "seen"; the useful question is
  // "read", which is a duration.
  const enteredAt = new Map();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = e.target.id;
        if (!id) continue;
        if (e.isIntersecting) {
          if (!enteredAt.has(id)) enteredAt.set(id, performance.now());
          const rank = ORDER.indexOf(id);
          if (rank > deepestRank) {
            deepestRank = rank;
            deepest = id;
          }
        } else if (enteredAt.has(id)) {
          const ms = Math.round(performance.now() - enteredAt.get(id));
          enteredAt.delete(id);
          // Under a second is a scroll passing through, not a read.
          if (ms >= 1000) track("section", id, { d: ms });
        }
      }
    },
    // 25% visible: a section is "being read" when a quarter of it is on screen,
    // which for the taller sections is most of a viewport.
    { threshold: 0.25 },
  );
  document.querySelectorAll("section[id]").forEach((el) => io.observe(el));
  cleanups.push(() => io.disconnect());

  // ---- clicks -------------------------------------------------------------
  const onClick = (ev) => {
    const a = ev.target?.closest?.("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (/resume/i.test(href)) {
      track("resume", href);
      // The résumé is the conversion, and clicking it usually navigates away
      // before the 12s batch timer fires. Send immediately.
      send(false);
      return;
    }
    if (/^https?:/i.test(href) && !href.includes(location.host)) {
      track("outbound", href.slice(0, 200));
    }
  };
  document.addEventListener("click", onClick, { capture: true, passive: true });
  cleanups.push(() => document.removeEventListener("click", onClick, { capture: true }));

  // ---- end of visit -------------------------------------------------------
  // `visibilitychange -> hidden` is the only unload signal that is reliable on
  // mobile Safari; `beforeunload` and `unload` are not fired there when the
  // tab is backgrounded or the app is switched away from.
  const onHide = () => {
    if (document.visibilityState !== "hidden") {
      // Back on screen: restart the clock without losing what was banked.
      if (!visibleSince) visibleSince = performance.now();
      return;
    }
    // Going away: bank the stretch that just ended before reporting it.
    if (visibleSince) {
      visibleMs += performance.now() - visibleSince;
      visibleSince = 0;
    }
    for (const [id, t0] of enteredAt) {
      const ms = Math.round(performance.now() - t0);
      if (ms >= 1000) queue.push({ t: "section", n: id, p: location.pathname, d: ms });
    }
    enteredAt.clear();
    queue.push({ t: "end", n: deepest, p: location.pathname });
    send(true);
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  cleanups.push(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
  });

  return () => {
    // Flush before tearing down, or everything queued since the last send is
    // dropped. In development this is most of the visit: React StrictMode
    // mounts, unmounts and remounts, so without this the first mount's events
    // are discarded rather than sent.
    if (queue.length) send(false);
    if (flushTimer) {
      clearTimeout(flushTimer);
      // Resetting to 0 is load-bearing, not tidiness. `schedule()` bails when
      // `flushTimer` is truthy; leaving a cleared-but-non-zero timer id here
      // means the next mount can never arm a new timer, and the queue then
      // sits unsent until it hits 40 events or the tab is hidden.
      flushTimer = 0;
    }
    cleanups.forEach((fn) => fn());
    disabled = true;
  };
}
