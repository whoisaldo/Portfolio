// src/world/modes.js: Look and Cinema, the two ways to put the page away.
//
// The page sits on panes of glass over the city (Panel `glass`) and steps
// back for the camera mid-flight. These go the rest of the way:
//
//   look    the page fades out, the scrim lifts, and the city is the whole
//           screen. Scrolling still flies the camera from shot to shot (the
//           page is still there, unseen, and still drives the stage, the
//           towers and the board), and a drag turns the camera to look
//           around the shot it is holding, easing back to it a moment after
//           the reader lets go. H, the eye in the header, or `look` in the
//           console; H or Esc again to come back.
//   cinema  the site as a film: src/components/cinema/ takes the scroll and
//           flies the whole page by itself, with its own controls. C, the
//           clapper in the header, or `watch` in the console.
//
// Both need the live city: with it off (reduced motion, no GPU, `fx world
// off`) there is nothing to look at, and neither is offered. Neither starts
// under the door or the intro.
//
// `view` is discrete: on the stage (rerendering whoever reads it with
// useStage) and on <html data-view> for the CSS that puts the page away
// (index.css). `stage.ui` and `stage.look` are per frame, eased here and read
// by the world's own loop: the frost behind the panes follows `ui`, and the
// camera turns by `look`.
import { stage, setStage, refreshPaused } from "./stage";

// The page's fade, seconds: the same as the transition in index.css.
const FADE = 0.6;
// How far a drag can turn the camera (radians), and how far a pixel turns it.
const YAW_MAX = 0.62;
const PITCH_MAX = 0.3;
const PER_PX = 0.0042;
// After a drag: how long the camera holds where the reader left it before
// it eases back to the shot, and how long the easing takes.
const HOLD_MS = 1600;
const BACK = 1.2;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);

/** Whether the page can be put away right now. */
export function canPutAway() {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return (
    stage.status === "ready" &&
    root.dataset.world === "on" &&
    !root.hasAttribute("data-gated") &&
    root.dataset.intro !== "true" &&
    !stage.covers.has("console")
  );
}

/** The event that asks for a postcard (ViewModes.jsx takes it). */
export const PHOTO_EVENT = "aly:photo";

/** Photo mode: a postcard of the city as it is now, from any view of it. */
export function takePhoto() {
  if (stage.view === "page" && !canPutAway()) return false;
  window.dispatchEvent(new CustomEvent(PHOTO_EVENT));
  return true;
}

// ---- the fade -----------------------------------------------------------------
let fade = null;
let fadeRaf = 0;
function fadeUi(to) {
  fade = { from: stage.ui, to, t: 0, last: 0 };
  if (fadeRaf) return;
  const step = (now) => {
    const f = fade;
    const dt = f.last ? Math.min(0.1, (now - f.last) / 1000) : 0;
    f.last = now;
    f.t = Math.min(1, f.t + dt / FADE);
    stage.ui = f.from + (f.to - f.from) * ease(f.t);
    if (f.t < 1) fadeRaf = requestAnimationFrame(step);
    else fadeRaf = 0;
  };
  fadeRaf = requestAnimationFrame(step);
}

// ---- the look -------------------------------------------------------------------
const drag = { on: false, x: 0, y: 0, yaw: 0, pitch: 0 };
let backTimer = 0;
let backRaf = 0;

function cancelBack() {
  window.clearTimeout(backTimer);
  backTimer = 0;
  if (backRaf) cancelAnimationFrame(backRaf);
  backRaf = 0;
}

/** Back to the shot, after a moment, over BACK seconds. */
function easeBack(delay = HOLD_MS) {
  cancelBack();
  backTimer = window.setTimeout(() => {
    const from = { ...stage.look };
    let t = 0;
    let last = 0;
    const step = (now) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      t = Math.min(1, t + dt / BACK);
      const k = 1 - ease(t);
      stage.look.yaw = from.yaw * k;
      stage.look.pitch = from.pitch * k;
      backRaf = t < 1 ? requestAnimationFrame(step) : 0;
    };
    backRaf = requestAnimationFrame(step);
  }, delay);
}

/** Turn the camera by a step (the arrow keys), and come back to the shot. */
export function nudgeLook(dyaw, dpitch = 0) {
  if (stage.view !== "look") return;
  cancelBack();
  stage.look.yaw = clamp(stage.look.yaw + dyaw, -YAW_MAX, YAW_MAX);
  stage.look.pitch = clamp(stage.look.pitch + dpitch, -PITCH_MAX, PITCH_MAX);
  easeBack(HOLD_MS * 1.5);
}

// A drag pulls the city the way the pointer goes, the way a photograph is
// dragged: right turns the camera left, down tilts it up. Mouse only. A
// finger on a phone is scrolling, and scrolling flies.
const onDown = (e) => {
  if (stage.view !== "look" || e.pointerType !== "mouse" || e.button !== 0) return;
  if (e.target.closest?.("[data-mode-ui], [data-mode-keep]")) return;
  cancelBack();
  drag.on = true;
  drag.x = e.clientX;
  drag.y = e.clientY;
  drag.yaw = stage.look.yaw;
  drag.pitch = stage.look.pitch;
  document.documentElement.dataset.looking = "";
};
const onMove = (e) => {
  if (!drag.on) return;
  stage.look.yaw = clamp(drag.yaw - (e.clientX - drag.x) * PER_PX, -YAW_MAX, YAW_MAX);
  stage.look.pitch = clamp(drag.pitch + (e.clientY - drag.y) * PER_PX, -PITCH_MAX, PITCH_MAX);
};
const onUp = () => {
  if (!drag.on) return;
  drag.on = false;
  delete document.documentElement.dataset.looking;
  easeBack();
};

// ---- the view -----------------------------------------------------------------
let listening = false;

/** "page", "look" or "cinema". */
export function setView(next) {
  if (next === stage.view) return;
  if (next !== "page" && !canPutAway()) return;
  const root = document.documentElement;
  root.dataset.view = next;
  setStage({ view: next });
  refreshPaused();
  fadeUi(next === "page" ? 1 : 0);
  if (next !== "look") {
    onUp();
    cancelBack();
    stage.look.yaw = 0;
    stage.look.pitch = 0;
  }
  if (next === "look" && !listening) {
    listening = true;
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  } else if (next !== "look" && listening) {
    listening = false;
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  }
}

export function toggleView(which) {
  setView(stage.view === which ? "page" : which);
}

/** Back to the page if the city goes away under a mode (a lost context, the
 *  door put back up, the world switched off). */
export function pageIfGone() {
  if (stage.view !== "page" && stage.status !== "ready") setView("page");
}
