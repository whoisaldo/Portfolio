// src/components/demos/RichPresenceDemo.jsx: what Discord shows.
//
// Type a song and an artist and the card on the right renders the presence
// Eternal Rich Presence would publish for it: "Listening to Apple Music",
// title, artist, an elapsed clock. The card is a drawing of Discord's, not
// Discord, and the clock counts from when the reader typed. The Listen Along
// button explains the part of the project worth explaining: the raw
// named-pipe subscription that pypresence cannot do.
import React, { useEffect, useState } from "react";
import DemoFrame, { Field, inputClass, ghostButtonClass } from "./DemoFrame";
import { usePrefersReducedMotion } from "../../hooks";

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function RichPresenceDemo({ toolbar }) {
  const reduced = usePrefersReducedMotion();
  const [title, setTitle] = useState("I Really Want to Stay at Your House");
  const [artist, setArtist] = useState("Rosa Walton & Hallie Coggins");
  const [source, setSource] = useState("Apple Music");
  const [t, setT] = useState(0);
  const [join, setJoin] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => { setT(0); }, [title, artist]);

  return (
    <DemoFrame toolbar={toolbar} title="Eternal Rich Presence · what Discord shows" note="a drawing of the card, not Discord">
      <div className="demo-split demo-split-even">
        <div className="grid gap-3">
          <Field label="Now playing">
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 64))} className={inputClass} />
          </Field>
          <Field label="Artist">
            <input value={artist} onChange={(e) => setArtist(e.target.value.slice(0, 64))} className={inputClass} />
          </Field>
          <div role="radiogroup" aria-label="Source" className="flex gap-1.5">
            {["Apple Music", "Spotify"].map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                onClick={() => setSource(s)}
                className={`chamfer chamfer-sm mono-micro px-2.5 py-1.5 ${source === s ? "bg-volt text-ink font-bold" : "bg-ink text-muted hover:text-primary"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mono-micro text-dim leading-relaxed mt-1">
            On Windows the tray app reads this from the iTunes COM interface or the System Media Transport Controls and pushes it over pypresence.
          </p>
        </div>

        {/* The card, drawn. */}
        <div>
          <div className="border border-ink-line bg-ink p-4" aria-live="polite">
            <p className="mono-micro text-dim">Listening to {source}</p>
            <div className="mt-3 flex gap-3">
              <div className="w-14 h-14 shrink-0 bg-ink-raised border border-ink-line grid place-items-center">
                <span className="w-6 h-6 bg-fuchsia" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[0.9375rem] text-primary truncate">{title || "Untitled"}</p>
                <p className="text-[0.875rem] text-muted truncate">by {artist || "Unknown artist"}</p>
                <p className="mt-1 mono-micro text-dim tabular-nums">{mmss(t)} elapsed</p>
              </div>
            </div>
            <button type="button" onClick={() => setJoin((v) => !v)} aria-expanded={join} className={`${ghostButtonClass} mt-4 w-full`}>
              Listen Along
            </button>
          </div>
          {join && (
            <p className="mt-3 prose-dark text-[0.9375rem] leading-[1.6]">
              pypresence is send-only, so Listen Along could not exist on it. The app opens Discord's IPC named pipes directly over ctypes, frames the protocol by hand, subscribes to ACTIVITY_JOIN, and registers eternalrp:// so a friend's click launches into it.
            </p>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
