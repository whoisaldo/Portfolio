// src/braindance/controls.js: the keyboard and the pointer.
//
// A braindance editor's controls, in a browser's terms. Keys go to the
// document while the braindance is up (a form field or a button keeps its
// own keys). The pointer on the city looks around while it plays and
// orbits while the editor holds a moment; a click held on a clue scans it
// (src/braindance/scanner.js owns that, and says so by claiming the press).
//
// G puts the recording down for free roam (src/braindance/roam) and takes
// it up again. While roaming, the keys that move the recording move the
// player instead: W A S D and the arrows, Space, Shift, F and R are roam's
// (it is told of each by its code, down and up), and the rest (the layers,
// the journal, photo mode, mute, the interface) stay as they are.
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
      if (key === "g" || key === "G") {
        handled();
        if (!event.repeat && bd.mode !== "photo") {
          // A button left in focus would take Space and Enter for itself.
          document.activeElement?.blur?.();
          e.setRoam();
        }
        return;
      }
      if (e.roam?.on) {
        if (bd.mode !== "photo" && e.roam.key(event.code, true, event.repeat)) {
          handled();
          return;
        }
        // The transport is the recording's, and the recording is down.
        if (key === " " || key === "q" || key === "Q" || key === "e" || key === "E" || key === "f" || key === "F" || key === "r" || key === "R" || key === "ArrowLeft" || key === "ArrowRight") {
          handled();
          return;
        }
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
    // Roam's keys are held, so it hears them let go as well, and all of
    // them at once when the window loses the keyboard.
    const onKeyUp = (event) => {
      const roam = engine()?.roam;
      if (roam?.on && roam.key(event.code, false)) event.preventDefault();
    };
    const onBlur = () => engine()?.roam?.release();
    // On foot a click on the city holds the mouse (pointer lock); the
    // browser lets it go on Esc, and the store is told either way.
    const onLock = () => set({ locked: Boolean(document.pointerLockElement) });
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("pointerlockchange", onLock);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerlockchange", onLock);
      window.removeEventListener("blur", onBlur);
      if (document.pointerLockElement) document.exitPointerLock?.();
    };
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
      // On foot, a click that is not a scan holds the mouse for looking
      // (Esc lets it go). Held, a click only scans.
      if (bd.roam === "walk" && bd.mode !== "photo" && !document.pointerLockElement && !down.scanning) {
        try {
          const asked = event.currentTarget.requestPointerLock?.();
          asked?.catch?.(() => {});
        } catch {
          // No lock here: a drag looks instead.
        }
      }
      if (!document.pointerLockElement) event.currentTarget.setPointerCapture?.(event.pointerId);
      e?.press(true);
      if (!down.scanning) e?.hold(true);
    },
    onPointerMove(event) {
      const e = engineRef.current;
      if (document.pointerLockElement) {
        e?.look(event.movementX, event.movementY);
        return;
      }
      const [x, y] = toNdc(event);
      // In free roam a press on a clue that then moves is a look, not a
      // scan: up close a tower is a clue from edge to edge of the view, and
      // there would be nowhere left to grab it by.
      if (down?.scanning && bd.roam !== "off" && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) {
        down.scanning = false;
        e?.press(false);
        e?.hold(true);
      }
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
      if (!document.pointerLockElement) event.currentTarget.releasePointerCapture?.(event.pointerId);
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
