// src/components/cinema/director.js: the film's running order, and the clock
// that plays it.
//
// The film is the home page flown by itself. Nothing in the city is driven
// differently for it: the director scrolls the page (unseen, under the
// letterbox) through Lenis, and the scroll drives the camera, the car, the
// board, the towers and the chapter cards exactly as a reader's wheel does.
// What it adds is time: a hold on every shot long enough to look at it, a
// flight to the next on an ease rather than a wheel, and a few things it
// does while a shot holds (the board running through the Work deck's
// entries, corpo row's towers lit one after another so the camera travels
// the row), each with a caption from the data files.
//
//   scene   one shot: how long it holds, whether the page scrolls through
//           it while it holds (Stack's pan), its beats, and the flight out
//   beat    a moment in a hold: something set on the stage, and a caption
//
// The clock runs while playing and stops while paused; a flight under way
// when it pauses stops where it is and finishes from there. Skipping to a
// scene jumps the page straight to it (the city glitches on a long jump,
// as it does for any deep link). The reader's own wheel does nothing while
// the film has the page (holdScroll), and gets the page back with it.
//
// The garage, when its visit is ready, is a thirty-second pass through it:
// the page pans through the section's visit at an even pace, so the camera
// makes the same route the reader's scroll makes (src/world/garage.js),
// with a caption at each station. If the reader was looking at the
// text fallback, the film waits for a complete room and restores the
// saved content and manual state when it ends (src/routes/Home.jsx).
// Without the visit the garage holds as it always has.
import { stage, getWorld, setActiveProject, setActiveRole } from "../../world/stage";
import { setView } from "../../world/modes";
import { holdRange } from "../../world/scroll-stage";
import { glideToY, holdScroll, jumpToY } from "../../lib/scroll";
import { featuredProjects } from "../../data/projects";
import { experiences } from "../../data/experience";
import { profile, skills, emails } from "../../data/profile";
import { car } from "../../data/garage";
import { teardown } from "../../data/life";
import { sections } from "../../data/site";
import { GARAGE_STATIONS, GARAGE_TIMELINE } from "../../data/world";
import { filmCanVisit, setGarageView } from "../../lib/garage3d";

import { car as S6 } from "../../data/garage-s6";

// The visit's pass: how long the page takes over it, and where each
// station's caption comes up, at the start of the stretch that arrives at
// it (the S6's at its rear, where its visit begins).
const VISIT_HOLD = 30;
const VISIT_FLIGHT = 5;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const linear = (t) => t;

/** "02 // Experience": the label a section's own heading wears. */
export function labelOf(id) {
  const i = sections.findIndex((s) => s.id === id);
  return i < 0 ? "" : `${String(i).padStart(2, "0")} // ${sections[i].label}`;
}

const primaryEmail = emails.find((e) => e.primary)?.value ?? emails[0]?.value ?? "";

/** Where the stretch arriving at a pose begins, 0..1 (GARAGE_TIMELINE). */
function arrivesAt(pose) {
  let start = 0;
  for (const s of GARAGE_TIMELINE) {
    if (s.hold === pose || s.into === pose) return start;
    start = s.to;
  }
  return 0;
}

/** Each station's caption, in the data's own words. */
function visitCaption(st, label) {
  const s4 = `${car.year} ${car.name}`;
  const s6 = S6 ? `${S6.year} ${S6.name}` : null;
  switch (st.id) {
    case "arrival":
      return { label, title: st.label, line: s6 ? `${s4} · ${s6}` : s4 };
    case "s4":
      return { label, title: s4, line: `${car.engine} · ${car.output}` };
    case "s4-bay":
      return { label, title: st.label, line: car.engine };
    case "s6":
      return { label, title: s6 ?? st.label, line: S6?.engine ?? null };
    case "s6-bay":
      return { label, title: st.label, line: S6?.engine ?? null };
    case "shop":
      return { label, title: teardown.title, line: teardown.lede };
    default:
      return { label, title: st.label, line: null };
  }
}

/** What each shot does while it holds. Unknown shots hold six seconds. */
function sceneFor(id) {
  const label = labelOf(id);
  switch (id) {
    case "hero":
      return { id, label, hold: 7, flight: 4.6, opening: true, beats: [] };
    case "projects": {
      const shown = featuredProjects.slice(0, 3);
      const each = 2.7;
      return {
        id,
        label,
        hold: shown.length * each + 0.6,
        flight: 4.6,
        beats: shown.map((p, i) => ({
          at: i * each,
          act: () => setActiveProject(featuredProjects.indexOf(p)),
          caption: { label, title: p.title, line: p.tagline },
        })),
      };
    }
    case "experience": {
      const each = 1.7;
      return {
        id,
        label,
        hold: experiences.length * each + 1.4,
        flight: 4.6,
        beats: experiences.map((e, i) => ({
          at: 0.4 + i * each,
          act: () => setActiveRole(e.slug),
          caption: { label, title: e.company, line: `${e.title} · ${e.period}` },
        })),
        // The row's dolly follows the lit tower; put it back for the reader.
        end: () => setActiveRole(null),
      };
    }
    case "about":
      return { id, label, hold: 6.5, flight: 4.2, beats: [{ at: 0.4, caption: { label, title: profile.name, line: profile.base } }] };
    case "stack": {
      const groups = skills.slice(0, 4);
      const each = 1.8;
      return {
        id,
        label,
        hold: groups.length * each + 0.4,
        flight: 6,
        pan: true,
        beats: groups.map((g, i) => ({
          at: i * each,
          caption: { label, title: g.group, line: g.items.slice(0, 4).join(" · ") },
        })),
      };
    }
    case "garage":
      return {
        id,
        label,
        hold: VISIT_HOLD,
        flight: VISIT_FLIGHT,
        pan: true,
        beats: GARAGE_STATIONS.map((st) => ({
          at: Math.max(0.4, arrivesAt(st.id === "s6" ? "s6_rear" : st.pose) * VISIT_HOLD),
          caption: visitCaption(st, label),
        })),
      };
    case "contact":
      return { id, label, hold: 5, flight: 0, credits: true, beats: [{ at: 0.4, caption: { label, title: primaryEmail, line: profile.base } }] };
    default:
      return { id, label, hold: 6, flight: 4.6, beats: [] };
  }
}

/**
 * The director. `onChange` hears about anything the controls or captions
 * need to redraw for (the scene, the caption, playing or not, the end);
 * the clock itself is read off `time` by the HUD's own frame loop.
 */
export function createDirector({ onChange = () => {} } = {}) {
  const ids = stage.shots.map((s) => s.id);
  // The workshop chapter always uses the visit. Its readiness gate keeps
  // the readable text available if the room cannot yet be drawn.
  const scenes = ids.map(sceneFor);
  // Each scene's start on the film's clock: its hold, then its flight out.
  let at = 0;
  for (const s of scenes) {
    s.start = at;
    at += s.hold + s.flight;
  }
  const total = at;

  const saved = { project: stage.activeProject, roles: stage.activeRoles.slice(), garage: getWorld()?.garage?.saveState?.() };
  const state = { time: 0, playing: false, scene: -1, segment: null, caption: null, ended: false };
  let raf = 0;
  let last = 0;
  let disposed = false;
  // The beats already fired in the current scene.
  let fired = new Set();

  const metrics = () => {
    const vh = window.innerHeight;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    return { vh, max };
  };
  const rangeOf = (i) => {
    const { vh, max } = metrics();
    return holdRange(stage.shots, i, vh, max);
  };

  // Only when something the screen shows has changed: never once a frame.
  let sig = "";
  const emit = (force = false) => {
    const next = `${state.scene}|${state.caption ? state.caption.title : ""}|${state.playing}|${state.ended}`;
    if (!force && next === sig) return;
    sig = next;
    onChange({ ...state, total, scenes });
  };

  // Start a segment's scroll, or finish one from where it stopped: a hold
  // that pans glides through its range, a flight glides to the next hold.
  const run = (i, kind, remaining) => {
    const s = scenes[i];
    if (!s) return;
    if (kind === "hold") {
      if (s.pan) {
        const [, end] = rangeOf(i);
        glideToY(end, { duration: Math.max(0.05, remaining), easing: linear });
      }
    } else if (i + 1 < scenes.length) {
      const [start] = rangeOf(i + 1);
      glideToY(start, { duration: Math.max(0.05, remaining), easing: easeInOut });
    }
  };

  // Which scene and segment the clock is in, and what has to happen now.
  const settle = (fresh = false) => {
    let i = scenes.length - 1;
    while (i > 0 && state.time < scenes[i].start) i--;
    const s = scenes[i];
    const local = state.time - s.start;
    const kind = local < s.hold ? "hold" : "flight";
    // An unfinished workshop keeps its text available. Do not pan through
    // an empty room while the film hides its loading or Retry controls.
    if ((s.id === "garage" || (kind === "flight" && scenes[i + 1]?.id === "garage")) && !filmCanVisit()) {
      state.playing = false;
      jumpToY(rangeOf(s.id === "garage" ? i : i + 1)[0]);
      setView("page");
      emit();
      return;
    }
    if (i !== state.scene) {
      scenes[state.scene]?.end?.();
      state.scene = i;
      fired = new Set();
      state.caption = null;
      state.segment = null;
    }
    // Beats due by now, in order.
    s.beats.forEach((b, n) => {
      if (local >= b.at && !fired.has(n)) {
        fired.add(n);
        b.act?.();
        if (b.caption) state.caption = b.caption;
      }
    });
    if (kind === "flight" && state.caption) state.caption = null;
    const key = `${i}:${kind}`;
    if (key !== state.segment || fresh) {
      state.segment = key;
      if (state.playing) run(i, kind, kind === "hold" ? s.hold - local : s.flight - (local - s.hold));
    }
    emit();
  };

  const tick = (now) => {
    raf = 0;
    if (disposed || !state.playing) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    state.time = Math.min(total, state.time + dt);
    if (state.time >= total) {
      state.playing = false;
      state.ended = true;
      emit();
      return;
    }
    settle();
    raf = requestAnimationFrame(tick);
  };

  const stopScroll = () => jumpToY(window.scrollY);

  const director = {
    scenes,
    total,
    get time() {
      return state.time;
    },
    get playing() {
      return state.playing;
    },
    play() {
      if (disposed || state.playing) return;
      if (state.ended) director.restart();
      state.playing = true;
      last = 0;
      settle(true);
      raf = requestAnimationFrame(tick);
    },
    pause() {
      if (!state.playing) return;
      state.playing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      stopScroll();
      emit();
    },
    toggle() {
      if (state.playing) director.pause();
      else director.play();
    },
    /** Jump to scene `i`'s first frame and carry on (or stay paused). */
    goto(i) {
      const n = Math.max(0, Math.min(scenes.length - 1, i));
      state.time = scenes[n].start;
      state.ended = false;
      const [start] = rangeOf(n);
      jumpToY(start);
      state.segment = null;
      settle(true);
    },
    next() {
      director.goto(state.scene + 1);
    },
    prev() {
      // Back to the start of this scene, or the one before if already there.
      const s = scenes[state.scene];
      director.goto(s && state.time - s.start > 1.5 ? state.scene : state.scene - 1);
    },
    restart() {
      state.ended = false;
      director.goto(0);
    },
    /** The film has the page: from the top, the reader's wheel held. */
    begin() {
      setGarageView({ film: true });
      getWorld()?.garage?.prepare().catch(() => {});
      holdScroll("cinema", true);
      director.goto(0);
      director.play();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      state.playing = false;
      if (raf) cancelAnimationFrame(raf);
      stopScroll();
      scenes[state.scene]?.end?.();
      setActiveProject(saved.project);
      setActiveRole(saved.roles);
      getWorld()?.garage?.restoreState?.(saved.garage);
      holdScroll("cinema", false);
      setGarageView({ film: false });
    },
  };
  return director;
}
