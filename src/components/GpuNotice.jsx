// src/components/GpuNotice.jsx: the one warning this site shows.
//
// Only in the cinematic shell (App.jsx mounts it there and nowhere else;
// /recruiters has nothing on it that needs a GPU), only when src/lib/gpu.js
// says the browser is drawing on the CPU, and only until it is dismissed
// for this tab. It says three things and stops: what is off, what has been
// turned down because of it, and where the switch lives in Chrome, the one
// browser this has been seen in. It links to the plain version, because a
// reader whose browser cannot draw the city is the reader that page exists
// for.
//
// Two forms. The door carries the short one inside its panel (GpuNoticeShort
// below), so the reader about to click "Enter with sound" knows before the
// twenty-five seconds start. The toast with the Chrome path waits until the
// site is on screen: index.css hides it while the door or the intro is up,
// because a floating panel over the door covered the door's own way out on a
// laptop-height viewport. Bottom centre, where nothing else lives: the sound
// control is bottom left, the skip button bottom right, the section index on
// the right edge.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import Panel from "./ui/Panel";

const SEEN_KEY = "aly.gpu-notice.v1";

function seen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** The door's version: the fact and the consequence, in three lines. */
export function GpuNoticeShort() {
  return (
    <div className="border-l-2 border-volt pl-4" data-gpu-notice="door">
      <p className="mono-label text-volt">Graphics acceleration is off</p>
      <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-muted">
        Your browser is drawing this page without the graphics card. The
        city is turned down for this visit and the intro will still run
        slower than it should; where the switch lives comes after the door.
      </p>
    </div>
  );
}

export default function GpuNotice({ show }) {
  const [open, setOpen] = useState(() => show && !seen());
  if (!open) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode. It closes for this render either way.
    }
    setOpen(false);
  };

  return (
    <div
      className="gpu-notice fixed inset-x-4 bottom-4 z-[125] sm:inset-x-auto sm:left-1/2 sm:bottom-6 sm:w-[36rem] sm:-translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <Panel edge="bg-volt" fill="bg-ink" innerClassName="relative p-5 pr-12">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 p-1.5 text-dim transition-colors hover:text-volt focus-visible:text-volt"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <p className="mono-label text-volt">Graphics acceleration is off</p>

        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-muted">
          Your browser is drawing this page without the graphics card, so the
          city has been turned down for this visit: no haze, no wet road, no
          grain, no traffic. It will still feel slower than it should.
        </p>
        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-muted">
          In Chrome: Settings, System,{" "}
          <span className="text-primary">Use graphics acceleration when available</span>,
          then relaunch. Other browsers keep the same switch in their system
          settings.
        </p>

        <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 mono-ui">
          <Link to="/recruiters" className="text-volt transition-colors hover:text-fuchsia">
            The plain version
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-dim transition-colors hover:text-primary focus-visible:text-primary"
          >
            Got it
          </button>
        </p>
      </Panel>
    </div>
  );
}
