// src/braindance/hud/Call.jsx: the holocall's notice.
//
// As a game draws an incoming call: top centre, the caller and a ring,
// then "connected" once the hologram is up over the garage roof. Driven by
// the recording's clock, so a scrub back past it takes it away again.
import React, { useEffect, useState } from "react";
import { bd } from "../store";
import { HOLO_AT, HOLO_RING } from "../recording";
import { CALL } from "../../data/braindance";

export default function Call() {
  const [phase, setPhase] = useState(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = bd.time;
      const next = t >= HOLO_RING && t < HOLO_AT ? "ringing" : t >= HOLO_AT && t < HOLO_AT + 4 ? "connected" : null;
      setPhase((old) => (old === next ? old : next));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!phase) return null;
  return (
    <div className={`bd-call is-${phase}`} role="status">
      <span className="bd-call-icon" aria-hidden="true" />
      <span className="bd-call-text">
        <span className="bd-call-head">{phase === "ringing" ? CALL.ringing : CALL.connected}</span>
        <span className="bd-call-name">{CALL.name}</span>
      </span>
    </div>
  );
}
