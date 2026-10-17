// src/components/ViewModes.jsx: the keys and the controls for Look and Cinema.
//
// The two ways to put the page away (src/world/modes.js) are reached from the
// header (Navbar.jsx), from the console, and from the keyboard, here: H for
// Look, C for Cinema, Esc to come back from either, and in Look the left and
// right arrows turn the camera a step. Typing in a field never triggers them.
//
// While Look is on, a strip at the foot of the screen says how it works and
// how to leave, on the same smoked glass as the page's panes, and fades to a
// whisper after a few seconds so the city has the screen. Cinema brings its
// own controls (src/components/cinema/), in its own chunk: nobody who never
// presses play downloads the film.
//
// P, from any of the three, is photo mode: the shutter, a flash (none with
// reduced motion), and a postcard of the city as it is that moment saved as
// a PNG (./photo/postcard.js, also its own chunk), with a note that it was.
//
// In Look the city answers back (LookTouch): each shot's own subject can be
// pointed at and clicked. The S4 at the hero's curb and in the garage, and
// the S6 parked beside it, blink their lamps as a key fob makes them; the plaza's big board runs on to the next
// entry of the Work deck; a tower on corpo row lights for its role and the
// row's dolly goes to it. Pointing at one tags it with what it is, from the
// data files. Enter does the same for the shot's subject. What Look changed
// on the board and the row is put back when the page comes back.
import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, Eye, X } from "lucide-react";
import { getWorld, setActiveProject, setActiveRole, stage, useStage } from "../world/stage";
import { featuredProjects } from "../data/projects";
import { experiences } from "../data/experience";
import { chapterLabel } from "../world/scroll-stage";
import { canPutAway, nudgeLook, pageIfGone, PHOTO_EVENT, setView, takePhoto, toggleView } from "../world/modes";
import { getGarageView } from "../lib/garage3d";
import { shutterClick } from "../lib/ui-sfx";

const Cinema = lazy(() => import("./cinema/Cinema"));

const typing = (t) => Boolean(t?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']"));

export default function ViewModes() {
  const { view, status, section } = useStage();
  const pendingMode = useRef(null);
  useLayoutEffect(() => {
    if (section !== "garage") pendingMode.current?.cancel();
    if (section !== "garage" || view === "page" || getGarageView().availability === "ready") return;
    pendingMode.current?.cancel();
    let cancelled = false;
    const events = ["keydown", "pointerdown", "wheel", "touchstart"];
    const cleanup = () => events.forEach((name) => window.removeEventListener(name, cancel));
    const cancel = () => { cancelled = true; cleanup(); };
    const token = { cancel };
    pendingMode.current = token;
    events.forEach((name) => window.addEventListener(name, cancel, { once: true, passive: true }));
    setView("page");
    const preparation = getWorld()?.garage?.prepare();
    if (!preparation) { cancel(); return; }
    preparation.then((complete) => {
      if (!complete) { cleanup(); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!cancelled && pendingMode.current === token && stage.section === "garage" && stage.view === "page" && stage.garageVisit) setView(view);
        cleanup();
      }));
    }).catch(cleanup);
  }, [view, section]);
  useEffect(() => () => pendingMode.current?.cancel(), []);
  // The film stays mounted a moment after it ends, so its bars can lift as
  // the page fades back in rather than vanish under it.
  const [film, setFilm] = useState(false);
  useEffect(() => {
    if (view === "cinema") {
      setFilm(true);
      return undefined;
    }
    const t = window.setTimeout(() => setFilm(false), 520);
    return () => window.clearTimeout(t);
  }, [view]);

  // The city went away under a mode (a lost context, the door back up).
  useEffect(() => {
    pageIfGone();
  }, [status]);

  // Photo mode. One postcard at a time; the note keeps the last one's URL
  // until it goes, so the download is never cut short.
  const [postcard, setPostcard] = useState(null);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    let busy = false;
    const onPhoto = async () => {
      if (busy) return;
      busy = true;
      shutterClick();
      setFlash((n) => n + 1);
      try {
        const mod = await import("./photo/postcard");
        const card = await mod.takePostcard();
        if (card) {
          const url = mod.savePostcard(card);
          setPostcard((was) => {
            if (was) URL.revokeObjectURL(was.url);
            return { url, name: card.name };
          });
        }
      } finally {
        busy = false;
      }
    };
    window.addEventListener(PHOTO_EVENT, onPhoto);
    return () => window.removeEventListener(PHOTO_EVENT, onPhoto);
  }, []);
  const dropPostcard = useCallback(() => {
    setPostcard((was) => {
      if (was) URL.revokeObjectURL(was.url);
      return null;
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "escape" && stage.view !== "page") {
        e.preventDefault();
        setView("page");
      } else if (k === "h" && (stage.view === "look" || canPutAway())) {
        e.preventDefault();
        toggleView("look");
      } else if (k === "c" && (stage.view === "cinema" || canPutAway())) {
        e.preventDefault();
        toggleView("cinema");
      } else if (k === "p" && (stage.view !== "page" || canPutAway())) {
        e.preventDefault();
        takePhoto();
      } else if (stage.view === "look" && (k === "arrowleft" || k === "arrowright")) {
        e.preventDefault();
        nudgeLook(k === "arrowleft" ? -0.2 : 0.2);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {view === "look" && <LookHint />}
      {view === "look" && <LookTouch />}
      {film && (
        <Suspense fallback={null}>
          <Cinema leaving={view !== "cinema"} />
        </Suspense>
      )}
      {flash > 0 && <div key={flash} data-mode-ui="" className="photo-flash" aria-hidden="true" />}
      {postcard && <PostcardNote key={postcard.url} postcard={postcard} onDone={dropPostcard} />}
    </>
  );
}

/** The note that a postcard was saved: the picture, its name, and a way to
 *  open it. Gone after a few seconds, or on its cross. */
function PostcardNote({ postcard, onDone }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 6000);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <div data-mode-ui="" role="status" className="photo-note fixed right-4 top-20 z-[90] sm:right-6">
      <div className="chamfer chamfer-sm flex items-center gap-3 bg-ink/85 p-2 pr-2.5">
        <img src={postcard.url} alt="" className="chamfer-sm block w-24 sm:w-32 h-auto" />
        <div className="min-w-0">
          <p className="mono-label text-volt">Postcard saved</p>
          <p className="mono-label text-muted max-w-[24ch] truncate" title={postcard.name}>{postcard.name}</p>
          <a href={postcard.url} target="_blank" rel="noreferrer" className="mono-label text-primary underline underline-offset-4 hover:text-volt">
            Open
          </a>
        </div>
        <button type="button" onClick={onDone} aria-label="Dismiss" className="self-start p-1 text-muted hover:text-primary">
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Which of the city's touchable things the shot in front of the camera is
 *  about: none mid-flight, none where there is nothing to touch. */
function subjects() {
  const r = stage.route;
  if (r.kind === "project") return ["board", "car"];
  if (r.kind === "role") return ["tower", "car"];
  const i = Math.round(stage.position);
  if (Math.abs(stage.position - i) > 0.3) return [];
  return { hero: ["car"], projects: ["board"], experience: ["tower"], garage: ["car"] }[stage.shots[i]?.id] ?? [];
}

/** "02 // Experience", for a section's id. */
const sectionOf = (id) => {
  const c = chapterLabel(id);
  return c ? `${c.num} // ${c.name}` : "";
};

// The garage's data, for a car's tag: fetched as Look starts, because it
// rides in the garage's lazy chunk and not in the page's entry. A tag is
// the car that was picked, the S4 or, parked beside it in the garage, the
// S6 (whose facts are in src/data/garage-s6.js once that file is: a glob,
// so its absence is no error).
let CARS = null;
const S6_FACTS = Object.values(import.meta.glob("../data/garage-s6.js"))[0] ?? null;
const loadCar = () =>
  CARS
    ? Promise.resolve(CARS)
    : Promise.all([import("../data/garage").then((m) => m.car), S6_FACTS ? S6_FACTS().then((m) => m.car) : null])
        .then(([s4, s6]) => (CARS = { s4, s6 }))
        .catch(() => null);

/** What a tag says about a thing, in the data's own words. The board shows
 *  the Work deck's entries and corpo row has a tower per role, in order. */
function describe(target) {
  if (target.kind === "car") {
    const c = CARS?.[target.slug ?? "s4"];
    return { label: sectionOf("garage"), title: c ? `${c.year} ${c.name}` : "", line: c?.engine ?? null, hint: "Click: the lamps" };
  }
  if (target.kind === "board") {
    const p = featuredProjects[stage.activeProject] ?? featuredProjects[0];
    return { label: sectionOf("projects"), title: p?.title ?? "", line: null, hint: "Click: the next one" };
  }
  const e = experiences.find((x) => x.slug === target.slug);
  const lit = stage.activeRoles.length === 1 && stage.activeRoles[0] === target.slug;
  return { label: sectionOf("experience"), title: e?.company ?? "", line: e ? `${e.title} · ${e.period}` : null, hint: lit ? "Click: let it go" : "Click: light it" };
}

/** Look's pointing and clicking, its tag, and putting things back after. */
function LookTouch() {
  const tagRef = useRef(null);
  const [tag, setTag] = useState(null);
  useEffect(() => {
    loadCar();
    const root = document.documentElement;
    const saved = { project: stage.activeProject, roles: stage.activeRoles.slice() };
    let touched = false;
    let target = null;
    let down = null;
    let raf = 0;
    let at = null;
    const ours = (e) => Boolean(e.target?.closest?.("[data-mode-ui], a, button, input, textarea, select"));
    const pick = (x, y) => {
      const kinds = subjects();
      if (!kinds.length) return null;
      return getWorld()?.pick?.((x / window.innerWidth) * 2 - 1, 1 - (y / window.innerHeight) * 2, kinds) ?? null;
    };
    const show = (next) => {
      const same = next && target && next.kind === target.kind && next.slug === target.slug;
      target = next;
      if (next) root.dataset.lookTarget = next.kind;
      else delete root.dataset.lookTarget;
      if (!same) setTag(next ? { ...next, ...describe(next) } : null);
    };
    const act = (t) => {
      touched = t.kind !== "car" || touched;
      if (t.kind === "car") getWorld()?.flashCar?.(t.slug ?? "s4");
      else if (t.kind === "board") setActiveProject((stage.activeProject + 1) % featuredProjects.length);
      else if (stage.activeRoles.length === 1 && stage.activeRoles[0] === t.slug) setActiveRole(null);
      else setActiveRole(t.slug);
      // The tag says what it shows now.
      setTag({ ...t, ...describe(t) });
    };
    const place = () => {
      raf = 0;
      if (!at) return;
      show(pick(at.x, at.y));
      if (tagRef.current) tagRef.current.style.transform = `translate(${Math.round(at.x + 18)}px, ${Math.round(at.y + 18)}px)`;
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse" || e.buttons || ours(e)) {
        if (target && e.buttons) show(null);
        return;
      }
      at = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(place);
    };
    const onDown = (e) => {
      if (e.button !== 0 || ours(e)) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e) => {
      const d = down;
      down = null;
      if (!d || ours(e)) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 450) return;
      const t = pick(e.clientX, e.clientY);
      if (t) act(t);
    };
    const onKey = (e) => {
      if (e.key !== "Enter" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || ours(e)) return;
      const kinds = subjects();
      if (!kinds.length) return;
      e.preventDefault();
      if (kinds[0] === "tower") {
        // The next role along the row, from the one lit.
        const i = experiences.findIndex((x) => x.slug === stage.activeRoles[0]);
        setActiveRole(experiences[(i + 1) % experiences.length].slug);
        touched = true;
      } else act({ kind: kinds[0], slug: null });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      if (raf) cancelAnimationFrame(raf);
      delete root.dataset.lookTarget;
      if (touched) {
        setActiveProject(saved.project);
        setActiveRole(saved.roles);
      }
    };
  }, []);
  return (
    <div ref={tagRef} data-mode-ui="" aria-live="polite" className="look-tag fixed left-0 top-0 z-[75] pointer-events-none">
      {tag && (
        <div key={`${tag.kind}:${tag.slug ?? ""}:${tag.title}`} className="look-tag-card chamfer chamfer-sm bg-ink/85 px-3.5 py-2.5">
          {tag.label && <p className="mono-label text-volt">{tag.label}</p>}
          <p className="font-display font-bold text-primary text-base leading-tight mt-1">{tag.title}</p>
          {tag.line && <p className="mono-label text-muted mt-1">{tag.line}</p>}
          <p className="mono-label text-primary/60 mt-2">{tag.hint}</p>
        </div>
      )}
    </div>
  );
}

/** Look's strip: what the controls are, and the way back. */
function LookHint() {
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setQuiet(true), 4200);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div
      data-mode-ui=""
      role="region"
      aria-label="Look mode"
      className={`look-hint fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 transition-opacity duration-700 ${quiet ? "opacity-40 hover:opacity-100 focus-within:opacity-100" : "opacity-100"}`}
    >
      <div className="chamfer chamfer-sm flex items-center gap-2 sm:gap-4 bg-ink/80 pl-4 pr-1.5 py-1.5 border-0">
        <Eye className="w-4 h-4 text-volt shrink-0" aria-hidden="true" />
        <p className="mono-label text-muted whitespace-nowrap">
          <span className="text-primary">Look</span>
          <span className="hidden sm:inline"> · scroll to fly · drag to look around</span>
          <span className="hidden md:inline"> · H or esc to return</span>
        </p>
        <button
          type="button"
          onClick={() => takePhoto()}
          title="Take a postcard (P)"
          className="chamfer chamfer-sm inline-flex items-center gap-2 bg-ink-raised px-3 py-1.5 mono-label text-primary transition-colors hover:text-volt"
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          Photo
        </button>
        <button
          type="button"
          onClick={() => setView("page")}
          className="chamfer chamfer-sm inline-flex items-center gap-2 bg-volt px-3 py-1.5 mono-label font-bold text-ink transition-colors hover:bg-volt-deep"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          Page
        </button>
      </div>
    </div>
  );
}
