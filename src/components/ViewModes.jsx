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
import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Camera, Eye, X } from "lucide-react";
import { stage, useStage } from "../world/stage";
import { canPutAway, nudgeLook, pageIfGone, PHOTO_EVENT, setView, takePhoto, toggleView } from "../world/modes";
import { shutterClick } from "../lib/ui-sfx";

const Cinema = lazy(() => import("./cinema/Cinema"));

const typing = (t) => Boolean(t?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']"));

export default function ViewModes() {
  const { view, status } = useStage();
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
