// src/components/cinema/Cinema.jsx: the site as a film.
//
// C, the clapper in the header, or `watch` in the console. The page is put
// away (src/world/modes.js), bars come down to a 2.39 frame, and the
// director (./director.js) flies the home page by itself: every shot held
// long enough to look at, the flights between them on an ease, the Work
// deck's entries run across the plaza's board and corpo row's towers lit
// one after another, a caption for each from the data files, and at the
// end, over the moon, the credits, which are the site's own contents
// rolled. Nothing here is a word the page does not already say.
//
// The frame around the picture is a viewfinder, and it reports only what
// is true, which is the rule Chrome.jsx holds the page's chrome to: the
// scene (the section, by its own number), the film's running time, and the
// lens, worked out from the city camera's real field of view as a full-frame
// focal length, so it opens up on a fast flight because the camera does.
//
// Space plays and pauses, the arrows skip, P takes a postcard of the frame
// (ViewModes.jsx), Esc (or the cross) gives the page back. The controls show while the pointer moves and get out of the way
// while the film plays. With sound on, the music plays under it; with sound
// off it is a silent film, because that was the reader's choice.
//
// Its own chunk, with its own stylesheet (./cinema.css): nobody who never
// presses play downloads any of it.
import React, { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Pause, RotateCcw, X } from "lucide-react";
import { createDirector } from "./director";
import { getWorld } from "../../world/stage";
import { setView, takePhoto } from "../../world/modes";
import { profile, emails, links } from "../../data/profile";
import { featuredProjects } from "../../data/projects";
import { experiences } from "../../data/experience";
import { skills } from "../../data/profile";
import { car } from "../../data/garage";
import { soundEnabled, unlockAudio } from "../../lib/audio";
import { isPlaying, startAmbient } from "../../lib/ambient";
import { CRUISE_GAIN, DROP } from "../../lib/cues";
import "./cinema.css";

import { car as S6 } from "../../data/garage-s6";
import { garageCredits as CREDITS } from "../../data/garage-credits";

const FPS = 24;
const pad = (n, w = 2) => String(Math.floor(n)).padStart(w, "0");
const timecode = (t) => `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}:${pad((t % 1) * FPS)}`;
/** A vertical field of view as a full-frame lens (24 mm tall). */
const lensMm = (fov) => 12 / Math.tan((fov * Math.PI) / 360);
const primaryEmail = emails.find((e) => e.primary)?.value ?? emails[0]?.value ?? "";

export default function Cinema({ leaving = false }) {
  const director = useRef(null);
  const tc = useRef(null);
  const lens = useRef(null);
  const fill = useRef(null);
  const [ui, setUi] = useState({ scene: -1, caption: null, playing: false, ended: false, total: 1, scenes: [] });
  const [controls, setControls] = useState(true);
  const [creditsDone, setCreditsDone] = useState(false);

  // The director, from the top, with the music if the reader wants it.
  useEffect(() => {
    if (leaving) return undefined;
    const d = createDirector({ onChange: setUi });
    director.current = d;
    if (soundEnabled()) {
      unlockAudio().then((ok) => {
        if (ok && !isPlaying()) startAmbient({ offset: DROP, gain: CRUISE_GAIN });
      });
    }
    d.begin();
    return () => {
      d.dispose();
      director.current = null;
    };
  }, [leaving]);

  // On the way out (the page is coming back while the bars lift), the film
  // lets go of the page at once rather than when it unmounts.
  useEffect(() => {
    if (leaving) director.current?.dispose();
  }, [leaving]);

  // The viewfinder's readouts, once a frame, straight into the DOM.
  useEffect(() => {
    let raf = 0;
    const camera = getWorld()?.parts.camera ?? null;
    let lastLens = "";
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const d = director.current;
      if (!d) return;
      if (tc.current) tc.current.textContent = timecode(d.time);
      if (fill.current) fill.current.style.transform = `scaleX(${Math.min(1, d.time / d.total).toFixed(4)})`;
      if (camera && lens.current) {
        const mm = `${Math.round(lensMm(camera.fov))} MM`;
        if (mm !== lastLens) {
          lastLens = mm;
          lens.current.textContent = mm;
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // The controls: up while the pointer moves, away while the film plays.
  useEffect(() => {
    let timer = 0;
    const wake = () => {
      setControls(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (director.current?.playing) setControls(false);
      }, 2600);
    };
    wake();
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, []);

  // Space and the arrows. Esc belongs to ViewModes, which gives the page back.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const d = director.current;
      if (!d) return;
      if (e.key === " ") {
        e.preventDefault();
        d.toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        d.next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        d.prev();
      }
      setControls(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const restart = () => {
    setCreditsDone(false);
    director.current?.restart();
    director.current?.play();
  };

  const scene = ui.scenes[ui.scene];
  const [num, name] = (scene?.label ?? "").split(" // ");
  const credits = ui.ended && !creditsDone;
  const end = ui.ended && creditsDone;

  return (
    <div data-mode-ui="" className={`cinema ${leaving ? "is-leaving" : ""}`} role="region" aria-label="The site as a film">
      <div className="cinema-bar cinema-bar-top" aria-hidden="true" />
      <div className="cinema-bar cinema-bar-bottom" aria-hidden="true" />

      {/* The picture's frame: corner marks and the four readouts. */}
      <div className="cinema-frame" aria-hidden="true">
        <span className="cinema-corner tl" />
        <span className="cinema-corner tr" />
        <span className="cinema-corner bl" />
        <span className="cinema-corner br" />
        <span className="cinema-read tl">
          <span className={`cinema-rec ${ui.playing ? "is-on" : ""}`} />
          {ui.playing ? "" : credits ? "Credits · " : end ? "End · " : "Paused · "}
          {num ? `SC ${num} · ${(name ?? "").toUpperCase()}` : ""}
        </span>
        <span className="cinema-read tr tabular-nums" ref={tc}>00:00:00:00</span>
        <span className="cinema-read bl tabular-nums" ref={lens} />
        <span className="cinema-read br tabular-nums">
          {ui.scenes.length ? `${pad(ui.scene + 1)} / ${pad(ui.scenes.length)}` : ""}
        </span>
      </div>

      {/* The opening title, over the hero's street. */}
      {ui.scene === 0 && !ui.ended && (
        <div key={`open-${ui.playing}`} className="cinema-opening">
          <p className="cinema-opening-name">
            {profile.first} <span>{profile.last}</span>
          </p>
          <p className="cinema-opening-line">{profile.line}</p>
        </div>
      )}

      {/* The caption: what the shot is showing, in the data's own words. */}
      {ui.caption && !ui.ended && (
        <div key={ui.caption.title} className="cinema-caption">
          <p className="cinema-caption-label">{ui.caption.label}</p>
          <p className="cinema-caption-title">{ui.caption.title}</p>
          {ui.caption.line && <p className="cinema-caption-line">{ui.caption.line}</p>}
        </div>
      )}

      {/* The credits: the site's own contents, rolled over the moon. */}
      {credits && <Credits onDone={() => setCreditsDone(true)} />}

      {end && (
        <div className="cinema-end">
          <p className="cinema-caption-label">06 // Contact</p>
          <a className="cinema-end-mail" href={`mailto:${primaryEmail}`}>{primaryEmail}</a>
          <p className="cinema-end-links">
            <a href={links.github} target="_blank" rel="noreferrer">GitHub</a>
            <span aria-hidden="true"> · </span>
            <a href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          </p>
          <div className="cinema-end-actions">
            <button type="button" onClick={restart} className="cinema-btn">
              <RotateCcw aria-hidden="true" /> Watch again
            </button>
            <button type="button" onClick={() => setView("page")} className="cinema-btn is-primary">
              <X aria-hidden="true" /> Back to the page
            </button>
          </div>
        </div>
      )}

      {/* The controls, in the bottom bar. */}
      <div className={`cinema-controls ${controls || !ui.playing ? "is-up" : ""}`}>
        <button type="button" className="cinema-icon" onClick={() => director.current?.prev()} aria-label="Previous shot">
          <ChevronLeft aria-hidden="true" />
        </button>
        <button type="button" className="cinema-icon" onClick={() => (ui.ended ? restart() : director.current?.toggle())} aria-label={ui.playing ? "Pause" : "Play"}>
          {ui.playing ? <Pause aria-hidden="true" /> : <PlayGlyph />}
        </button>
        <button type="button" className="cinema-icon" onClick={() => director.current?.next()} aria-label="Next shot">
          <ChevronRight aria-hidden="true" />
        </button>
        <div className="cinema-track" aria-hidden="true">
          <div className="cinema-track-fill" ref={fill} />
          {ui.scenes.map((s, i) => (
            <span key={s.id} className="cinema-track-tick" style={{ left: `${(s.start / ui.total) * 100}%` }} title={s.label} data-i={i} />
          ))}
        </div>
        <button type="button" className="cinema-icon" onClick={() => takePhoto()} aria-label="Take a postcard (P)">
          <Camera aria-hidden="true" />
        </button>
        <button type="button" className="cinema-icon" onClick={() => setView("page")} aria-label="Back to the page">
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Play, drawn here in the icons' own stroke. Lucide's is /recruiters' too,
 *  and sharing it would split it into a chunk of its own for that page to
 *  fetch, which nothing here is worth. */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4.5v15l13-7.5z" />
    </svg>
  );
}

/** The roll: everything the page says, in the order it says it. */
function Credits({ onDone }) {
  return (
    <div className="cinema-credits" aria-label="Credits">
      <div className="cinema-credits-roll" onAnimationEnd={onDone}>
        <p className="cinema-credits-name">
          {profile.first} <span>{profile.last}</span>
        </p>
        <p className="cinema-credits-line">{profile.line}</p>

        <h3>Work</h3>
        {featuredProjects.map((p) => (
          <p key={p.slug}>{p.title}</p>
        ))}

        <h3>Experience</h3>
        {experiences.map((e) => (
          <p key={e.slug}>
            {e.company}
            <span>{e.title}</span>
          </p>
        ))}

        <h3>Stack</h3>
        {skills.map((g) => (
          <p key={g.group}>
            {g.group}
            <span>{g.items.join(" · ")}</span>
          </p>
        ))}

        <h3>{S6 ? "The cars" : "The car"}</h3>
        <p>
          {car.year} {car.name}
          <span>{car.engine}</span>
        </p>
        {S6 && (
          <p>
            {S6.year} {S6.name}
            <span>{S6.engine}</span>
          </p>
        )}

        {CREDITS.length > 0 && (
          <>
            <h3>Models</h3>
            {CREDITS.map((c) => (
              <p key={c.id}>
                {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.title}</a> : c.title}
                <span>
                  {c.authorUrl ? <a href={c.authorUrl} target="_blank" rel="noreferrer">{c.author}</a> : c.author} · {c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a> : c.license}
                  {c.changes ? ` · ${c.changes}` : ""}
                </span>
              </p>
            ))}
          </>
        )}

        <h3>Contact</h3>
        <p>{primaryEmail}</p>
        <p className="cinema-credits-base">{profile.base}</p>
      </div>
    </div>
  );
}
