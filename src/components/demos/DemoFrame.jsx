// src/components/demos/DemoFrame.jsx: the frame every deck demo sits in.
//
// Each project in the deck can switch its screen from the key art to a small
// working model of the thing itself: a connection diagram, a calculator, a
// sample log. The rule that matters more than any of the interaction is that
// none of it is the real product. Nothing in a demo talks to a server, reads
// an account, or reports a measurement, so every one of them wears the same
// flag in the same place: SIMULATED, in the top bar, before anything else.
// A number that appears inside a demo is either typed by the reader or
// computed from what they typed.
import React from "react";

export default function DemoFrame({ title, note, toolbar, children }) {
  return (
    <div className="demo flex flex-col min-h-full bg-ink-deep text-primary">
      {/* `toolbar` is the deck's Art / Try it toggle. It lives in this row
          rather than floating over the frame, so on a phone it wraps under
          the title instead of covering it. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 border-b border-ink-line">
        <span className="chamfer chamfer-sm mono-micro px-2 py-1 bg-fuchsia text-ink font-bold">Simulated</span>
        <span className="mono-label text-primary">{title}</span>
        {toolbar && <span className="ml-auto flex">{toolbar}</span>}
        {note && <span className="mono-micro text-dim basis-full">{note}</span>}
      </div>
      <div className="p-4 md:p-5 grow">{children}</div>
    </div>
  );
}

/** A labelled control, stacked. */
export function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mono-micro text-dim block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full bg-ink border border-ink-line text-primary font-mono text-[0.9375rem] px-3 py-2 " +
  "focus-visible:border-volt focus-visible:shadow-none tabular-nums";

export const selectClass = inputClass + " appearance-none";

export const buttonClass =
  "chamfer chamfer-sm bg-volt text-ink mono-ui font-bold px-4 py-2.5 hover:bg-volt-deep transition-colors";

export const ghostButtonClass =
  "border border-ink-line text-muted mono-ui px-4 py-2.5 hover:border-volt hover:text-primary transition-colors";
