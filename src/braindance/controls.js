// src/braindance/controls.js: the keyboard and the pointer.
//
// A braindance editor's controls, in a browser's terms. Keys go to the
// document while the braindance is up (a form field or a button keeps its
// own keys). The pointer on the city looks around while it plays and
// orbits while the editor holds a moment; a click held on a clue scans it
// (src/braindance/scanner.js owns that, and says so by claiming the press).
import { useEffect } from "react";
import { bd, set } from "./store";
import { DURATION } from "./recording";
import { LAYERS } from "./layers";
import { unlock } from "./journal";

const SPEEDS = [1, 2, 4];
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export function useControls(engineRef, on) {
  useEffect(() => {
    if (!on) return undefined;
    const engine = () => engineRef.current;

    const step = (seconds) => engine()?.seek(Math.min(DURATION, Math.max(0, bd.time + seconds)));
    const shuttle = (d) => {
      const e = engine();
      if (!e) return;
      // Press again for faster; the other way starts at 2x (rewind) or 2x.
      const same = bd.playing && bd.direction === d && bd.rate > 1;
      const i = same ? Math.min(SPEEDS.length - 1, SPEEDS.indexOf(bd.rate) + 1) : 1;
      e.setSpeed(SPEEDS[i], d);
    };

    let konami = 0;
    const onKey = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      // Up, up, down, down, left, right, left, right, B, A: overdrive.
      const k = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      konami = k === KONAMI[konami] ? konami + 1 : k === KONAMI[0] ? 1 : 0;
      if (konami === KONAMI.length) {
        konami = 0;
        set({ overdrive: !bd.overdrive });
        unlock("overdrive");
        event.preventDefault();
        return;
      }
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const e = engine();
      if (!e) return;
      const key = event.key;
      const handled = () => event.preventDefault();
      if (bd.mode === "photo") {
        if (key === "Enter") {
          handled();
          e.capture();
          return;
        }
        if (key !== "Escape" && key !== "p" && key !== "P") return;
      }
      switch (key) {
        case " ":
          if (tag === "BUTTON") return;
          handled();
          if (bd.playing && (bd.rate !== 1 || bd.direction !== 1)) e.setSpeed(1, 1);
          else e.toggle();
          break;
        case "ArrowLeft":
          handled();
          step(event.shiftKey ? -15 : -5);
          break;
        case "ArrowRight":
          handled();
          step(event.shiftKey ? 15 : 5);
          break;
        case "q":
        case "Q":
          handled();
          shuttle(-1);
          break;
        case "e":
        case "E":
          handled();
          shuttle(1);
          break;
        case "1":
        case "2":
        case "3":
          handled();
          e.setLayer(LAYERS[Number(key) - 1]);
          break;
        case "f":
        case "F":
          handled();
          e.setMode(bd.mode === "edit" ? "play" : "edit");
          break;
        case "j":
        case "J":
          handled();
          set({ journal: !bd.journal, help: false });
          break;
        case "p":
        case "P":
          handled();
          set({ mode: bd.mode === "photo" ? "play" : "photo" });
          if (bd.mode === "photo" && bd.playing) e.pause();
          break;
        case "r":
        case "R":
          handled();
          e.setRadio(!bd.radio);
          break;
        case "m":
        case "M":
          handled();
          e.setMuted(!bd.muted);
          break;
        case "h":
        case "H":
          handled();
          set({ hud: !bd.hud });
          break;
        case "?":
          handled();
          set({ help: !bd.help, journal: false });
          break;
        case "Escape":
          if (bd.open) set({ open: null });
          else if (bd.help || bd.journal) set({ help: false, journal: false });
          else if (bd.mode !== "play") set({ mode: "play" });
          else return;
          handled();
          break;
        default:
          break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [engineRef, on]);
}

/**
 * The pointer on the city: a ray for the scanner, a drag to look (or to
 * orbit in the editor), a click held on a clue to scan it, the wheel to
 * zoom the editor's orbit. Returns the handlers for the canvas's overlay.
 */
export function pointerHandlers(engineRef) {
  let down = null;
  const toNdc = (event) => [(event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1];
  return {
    onPointerDown(event) {
      if (event.button !== 0) return;
      const e = engineRef.current;
      // A press on a clue scans it; anywhere else it grabs the view.
      down = { x: event.clientX, y: event.clientY, scanning: Boolean(bd.hover) };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      e?.press(true);
      if (!down.scanning) e?.hold(true);
    },
    onPointerMove(event) {
      const e = engineRef.current;
      const [x, y] = toNdc(event);
      if (!down || !down.scanning) e?.pointer(x, y, true);
      if (!down || down.scanning) return;
      const dx = event.clientX - down.x;
      const dy = event.clientY - down.y;
      down.x = event.clientX;
      down.y = event.clientY;
      e?.drag(dx, dy);
    },
    onPointerUp(event) {
      down = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      engineRef.current?.press(false);
      engineRef.current?.hold(false);
    },
    onPointerLeave() {
      if (!down) engineRef.current?.pointer(0, 0, false);
    },
    onWheel(event) {
      if (bd.mode === "edit" || bd.mode === "photo") engineRef.current?.zoom(event.deltaY);
    },
  };
}
