// src/braindance/hud/Roam.jsx: free roam's corner of the interface.
//
// Two pieces. The way in sits on the timeline's transport row: one button,
// with G beside it, that says what it is doing while the streets are being
// mapped. Once roaming, the timeline gives its place to a bar in the same
// ink: the car's speed (the simulation's own figure, in km/h, and nothing
// else: no power, no stat that is not measured), the keys that do something
// here, the layers, and the way back.
import React, { useEffect, useRef } from "react";
import { bd, useBd } from "../store";
import { LAYERS } from "../layers";
import { LAYER_NAMES } from "../../data/braindance";
import { ROAM } from "../roam/words";

/** The way in, on the timeline. */
export function RoamButton({ engineRef }) {
  const state = useBd();
  const loading = state.roamLoading !== null;
  return (
    <button
      type="button"
      className={`bd-roam-in ${loading ? "is-loading" : ""}`}
      title={ROAM.enterTitle}
      aria-busy={loading}
      onClick={(event) => {
        // Left in focus it would take the brake's Space for a click.
        event.currentTarget.blur();
        engineRef.current?.setRoam();
      }}
    >
      <kbd>G</kbd>
      <span>{loading ? `${ROAM.loading} ${Math.round(state.roamLoading * 100)}%` : ROAM.enter}</span>
    </button>
  );
}

function Keys({ keys, what }) {
  return (
    <span className="bd-roam-key">
      {keys.map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
      <span>{what}</span>
    </span>
  );
}

/** The bar that stands where the timeline stood. */
export default function Roam({ engineRef }) {
  const state = useBd();
  const speedRef = useRef(null);
  const gearRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    let shown = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // Metres a second along the car's nose, as the simulation has it.
      const kmh = Math.round(Math.abs(bd.car.speed) * 3.6);
      if (kmh !== shown && speedRef.current) {
        shown = kmh;
        speedRef.current.textContent = String(kmh).padStart(3, "0");
      }
      if (gearRef.current) gearRef.current.style.opacity = bd.car.speed < -0.3 ? "1" : "0";
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const e = engineRef.current;
  const driving = state.roam === "drive";
  return (
    <div className="bd-timeline bd-roam" data-bd-ui="">
      <div className="bd-roam-read" aria-label={driving ? "Speed" : undefined}>
        {driving ? (
          <>
            <span className="bd-roam-speed" ref={speedRef}>000</span>
            <span className="bd-roam-unit">
              {ROAM.unit}
              <span className="bd-roam-gear" ref={gearRef} aria-hidden="true">{ROAM.reverse}</span>
            </span>
          </>
        ) : (
          <span className="bd-roam-foot">{ROAM.walk}</span>
        )}
      </div>
      <div className="bd-roam-keys">
        <Keys keys={["W", "A", "S", "D"]} what={driving ? "Drive" : "Walk"} />
        {driving ? <Keys keys={["Space"]} what="Brake" /> : <Keys keys={["Shift"]} what="Run" />}
        {state.prompt && <Keys keys={["F"]} what={state.prompt === "in" ? ROAM.getIn : ROAM.getOut} />}
        <Keys keys={["R"]} what={ROAM.reset} />
        {!driving && <span className="bd-roam-key bd-dim">{state.locked ? ROAM.unlock : ROAM.look}</span>}
      </div>
      <div className="bd-roam-side">
        <div className="bd-roam-layers" role="group" aria-label="Layer">
          {LAYERS.map((layer) => (
            <button
              key={layer}
              type="button"
              className={`bd-track-name bd-name-${layer} ${state.layer === layer ? "is-on" : ""}`}
              aria-pressed={state.layer === layer}
              onClick={(event) => {
                event.currentTarget.blur();
                e?.setLayer(layer);
              }}
            >
              <span className="bd-dot" aria-hidden="true" />
              {LAYER_NAMES[layer]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="bd-roam-in bd-roam-out"
          onClick={(event) => {
            event.currentTarget.blur();
            e?.setRoam(false);
          }}
        >
          <kbd>G</kbd>
          <span>{ROAM.leave}</span>
        </button>
      </div>
    </div>
  );
}
