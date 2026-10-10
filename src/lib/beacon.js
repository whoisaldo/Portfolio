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
//   Every page they open, which sections were on screen and for how long, how
//   far down they reached, which buttons, outbound links, résumé and email
//   links they pressed, the door and console (command names only), the
//   referrer, a tracked-link code if the URL carried one, and the viewport,
//   screen, timezone and language. The server adds the IP, the place Vercel
//   resolves it to, and the network it belongs to.
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

function attempt(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

/**
 * Reads the two parameters the beacon owns and takes them out of the address
 * bar, so a link passed on does not carry them to the next reader:
 *
 *   ?s=<code>   a tracked link. Kept for the tab, so a later batch still says
 *               which link this visit came from after the router has moved on.
 *   ?ay=me      marks this browser as Ali's own. ?ay=notme undoes it.
 *
 * history.state is passed back unchanged; React Router keeps its own key in it.
 */
function claimParams() {
  const url = new URL(location.href);
  const code = url.searchParams.get("s");
  const ay = url.searchParams.get("ay");
  if (code) attempt(() => sessionStorage.setItem("ay.src", code.slice(0, 48)));
  if (ay === "me") attempt(() => localStorage.setItem("ay.me", "1"));
  if (ay === "notme") attempt(() => localStorage.removeItem("ay.me"));
  if (code || ay) {
    url.searchParams.delete("s");
    url.searchParams.delete("ay");
    attempt(() => history.replaceState(history.state, "", url.pathname + url.search + url.hash));
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
// The landing address, captured before claimParams() tidies it, because the
// server reads the first batch's `path` as where the visit began.
let landing = "";
// True from the moment the tab is hidden until it is seen again. Hiding a tab
// fires visibilitychange and, on close, pagehide too; one departure should be
// reported once.
let away = false;
// Sections currently on screen: id -> { el, t0 }. Module scope so a route
// change can close out the ones that just left the page.
const onScreen = new Map();

/** Time on screen so far, including the stretch currently in progress. */
function elapsed() {
  return Math.round(visibleMs + (visibleSince ? performance.now() - visibleSince : 0));
}

function payload() {
  const events = queue;
  queue = [];
  const qs = new URLSearchParams(location.search);
  return JSON.stringify({
    sid,
    vid,
    path: landing || location.pathname + location.search,
    ref: document.referrer || null,
    utm_source: qs.get("utm_source"),
    utm_medium: qs.get("utm_medium"),
    utm_campaign: qs.get("utm_campaign"),
    s: attempt(() => sessionStorage.getItem("ay.src")),
    me: attempt(() => localStorage.getItem("ay.me")) === "1" ? 1 : 0,
    wd: navigator.webdriver ? 1 : 0,
    tz: attempt(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    lang: navigator.language || null,
    vw: window.innerWidth,
    vh: window.innerHeight,
    sw: window.screen?.width,
    sh: window.screen?.height,
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
 *
 * text/plain on both paths: it is a CORS-safelisted type, so the browser sends
 * the POST without an OPTIONS preflight first. application/json would double
 * the requests, and some browsers refuse it to sendBeacon outright.
 */
function send(final = false, heartbeat = false) {
  if (disabled || (!queue.length && !final && !heartbeat)) return;
  const body = payload();
  try {
    if (final && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }));
      return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      body,
      headers: { "content-type": "text/plain" },
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
  queue.push({ t, n: name ?? null, p: location.pathname, ts: Date.now(), ...extra });
  if (queue.length >= 40) send(false);
  else schedule();
}

/** Ends the dwell of a section that has left the screen, or the page. */
function closeSection(id) {
  const s = onScreen.get(id);
  if (!s) return;
  onScreen.delete(id);
  const ms = Math.round(performance.now() - s.t0);
  // Under a second is a scroll passing through, not a read.
  if (ms >= 1000) track("section", id, { d: ms });
}

/**
 * One page view. App calls this on every route change: the site is a single
 * page, so the browser's own load event only ever sees the first one.
 */
export function pageview() {
  if (disabled) return;
  // React StrictMode runs effects twice in development. Without this the same
  // view is counted twice, which quietly doubles the one number everything
  // else is a ratio of. Only a repeat of the same path is dropped, so going
  // back to a page already seen still counts.
  const key = `${sid}:${location.pathname}`;
  if (lastPageview === key) return;
  lastPageview = key;
  for (const [id, s] of onScreen) if (!s.el.isConnected) closeSection(id);
  track("pageview", document.title);
}

export function initBeacon() {
  if (!ENDPOINT || optedOut()) return () => {};
  // A prerender or a background tab that is never looked at is not a visit.
  if (document.visibilityState === "prerender") return () => {};

  landing ||= location.pathname + location.search;
  claimParams();
  disabled = false;
  visibleSince = document.visibilityState === "visible" ? performance.now() : 0;
  sid = stored(sessionStorage, "ay.sid", uuid);
  vid = stored(localStorage, "ay.vid", uuid);

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
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = e.target.id;
        if (!id) continue;
        if (e.isIntersecting) {
          if (!onScreen.has(id)) onScreen.set(id, { el: e.target, t0: performance.now() });
          // Deepest is by position on the page, so it needs no list of
          // section names to fall out of date.
          const rank = Array.prototype.indexOf.call(document.querySelectorAll("section[id]"), e.target);
          if (rank > deepestRank) {
            deepestRank = rank;
            deepest = id;
          }
        } else {
          closeSection(id);
        }
      }
    },
    // 25% visible: a section is "being read" when a quarter of it is on screen,
    // which for the taller sections is most of a viewport.
    { threshold: 0.25 },
  );
  // Sections arrive late: the door and the intro come first, the recruiter
  // page is its own chunk, and every route change replaces the lot. So the
  // page is watched for new ones rather than scanned once at startup, when
  // most of them do not exist yet.
  const watched = new WeakSet();
  const scan = () => {
    document.querySelectorAll("section[id]").forEach((el) => {
      if (watched.has(el)) return;
      watched.add(el);
      io.observe(el);
    });
  };
  scan();
  let scanTimer = 0;
  const mo = new MutationObserver(() => {
    if (scanTimer) return;
    scanTimer = window.setTimeout(() => {
      scanTimer = 0;
      scan();
    }, 400);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  cleanups.push(() => {
    io.disconnect();
    mo.disconnect();
    clearTimeout(scanTimer);
  });

  // ---- clicks -------------------------------------------------------------
  // Decorative marks (the door's ▸, arrows, icons) are text too; a label
  // starts at its first letter or digit.
  const label = (el) =>
    (el.getAttribute("aria-label") || el.textContent || "")
      .replace(/\s+/g, " ").replace(/^[^\p{L}\p{N}]+/u, "").trim().slice(0, 60);
  const onClick = (ev) => {
    const target = ev.target?.closest?.("[data-track], a[href], button, [role='button']");
    if (!target) return;
    if (target.dataset.track) {
      track("click", target.dataset.track);
      return;
    }
    const href = target.getAttribute("href");
    if (href == null) {
      track("click", label(target) || "button");
      return;
    }
    // The PDF, at /resume.pdf or /resume. Not "#resume", which is the
    // recruiter page's own Résumé section and opens nothing.
    if (/(^|\/)resume(\.pdf)?([?#]|$)/i.test(href) && !href.startsWith("#")) {
      track("resume", href);
      // The résumé is the conversion, and clicking it usually navigates away
      // before the 12s batch timer fires. Send immediately.
      send(false);
      return;
    }
    if (/^mailto:/i.test(href)) {
      track("contact", "email");
      send(false);
      return;
    }
    if (/^https?:/i.test(href) && !href.includes(location.host)) {
      track("outbound", href.slice(0, 200));
    }
  };
  document.addEventListener("click", onClick, { capture: true, passive: true });
  cleanups.push(() => document.removeEventListener("click", onClick, { capture: true }));

  // ---- still here ---------------------------------------------------------
  // A reader can sit on one section for minutes without producing an event.
  // A small batch every 45s while the tab is visible keeps the visit's length
  // honest and lets the dashboard say who is on the site right now.
  const beat = window.setInterval(() => {
    if (document.visibilityState === "visible") send(false, true);
  }, 45_000);
  cleanups.push(() => clearInterval(beat));

  // ---- end of visit -------------------------------------------------------
  // `visibilitychange -> hidden` is the only unload signal that is reliable on
  // mobile Safari; `beforeunload` and `unload` are not fired there when the
  // tab is backgrounded or the app is switched away from.
  const onHide = (e) => {
    if (document.visibilityState !== "hidden" && e.type !== "pagehide") {
      // Back on screen: restart the clock without losing what was banked.
      if (!visibleSince) visibleSince = performance.now();
      away = false;
      return;
    }
    if (away) return;
    away = true;
    // Going away: bank the stretch that just ended before reporting it.
    if (visibleSince) {
      visibleMs += performance.now() - visibleSince;
      visibleSince = 0;
    }
    for (const id of [...onScreen.keys()]) closeSection(id);
    queue.push({ t: "end", n: deepest, p: location.pathname, ts: Date.now() });
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
