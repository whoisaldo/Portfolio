// src/braindance/hud/Radio.jsx: the car's radio, which is the recording's sound.
import React, { useEffect, useRef } from "react";
import { bd, useBd } from "../store";

const BARS = 14;

export default function Radio({ engineRef }) {
  const state = useBd();
  const ref = useRef(null);
  useEffect(() => {
    const audio = engineRef.current?.audio;
    if (!audio) return undefined;
    const bins = new Uint8Array(256);
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = ref.current;
      if (!el || !bd.hud) return;
      audio.spectrum(bins);
      for (let i = 0; i < BARS; i++) {
        const v = audio.playing ? bins[2 + Math.floor(Math.pow(i / BARS, 1.6) * 90)] / 255 : 0.04;
        el.children[i].style.transform = `scaleY(${Math.max(0.06, v).toFixed(3)})`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engineRef]);
  return (
    <div className="bd-radio" data-bd-ui="">
      <div className="bd-radio-bars" ref={ref} aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="bd-radio-text">
        <p className="bd-radio-kicker">{state.muted ? "Radio · muted (M)" : "Radio"}</p>
        <p className="bd-radio-title">I Really Want to Stay at Your House</p>
        <p className="bd-dim">Rosa Walton &amp; Hallie Coggins</p>
      </div>
    </div>
  );
}
