// src/components/garage/GarageUI.jsx: the garage's controls, in whichever
// layout the garage is in.
//
// The integration (the Garage section and the world behind it) decides the
// layout and owns the state the camera depends on; this component renders
// the controls for it and reports what the reader does. It never polls the
// world. Everything arrives as props:
//
//   mode          "cinematic" (the 3D workshop, controls over the stage) or
//                 "photos" (the natural-height photographs, also used while
//                 the workshop loads and whenever it cannot run)
//   availability  { state, progress?, message? }: "loading", "ready",
//                 "failed", "lost", "restored", "unsupported" or "off"
//   station       one of STATIONS' ids (cars.js), from the visit's progress
//   selection     { carId, modId } or null
//   hood          { s4, s6 }: true where that car's hood is at rest open
//   stance        "normal" or "lowered", the S6 at rest
//   manual        { hood, stance }: true while a button overrides the tour
//   pins          { subscribe(listener) } for the projected markers
//   request       { id, carId?, modId?, mod?, focus? }: the latest retained
//                 request; applied once per id, then onRequestApplied(id)
//   shopGroup     the shop-wall board in view ("bmw", "bench", "competing")
//   credits       asset credits, for Credits.jsx
//   reduced       prefers-reduced-motion as the integration resolved it
//
// and goes back out through onStation, onSelect, onHood, onStance,
// onResumeTour, onShopGroup, onUsePhotos, onEnter3D, onRetry, onResume3D,
// onLayout (the cinematic controls' rectangles) and onRequestApplied.
// `selection` and `station` may be left out, in which case the component
// keeps its own, so the photographs work with nothing behind them.
//
// One polite, atomic status line serves both layouts and survives the switch
// between them: it says what was selected and where a hood or the stance came
// to rest, and nothing per frame. Scrolling never moves focus; only a
// request that asks for it (`focus: true`, a deliberate activation such as
// the console's `garage` command) does, once the control it lands on exists.
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useMediaQuery } from "../../hooks";
import GaragePhotos from "./GaragePhotos";
import GarageCinematic from "./GarageCinematic";
import { findCar, findMod, resolveRequest } from "./cars";
import { useAnnouncer, useControllable } from "./state";
import "./garage.css";

export default function GarageUI({
  mode = "photos",
  availability,
  station: stationProp,
  onStation,
  selection: selectionProp,
  onSelect,
  hood,
  onHood,
  stance = "normal",
  onStance,
  manual,
  onResumeTour,
  pins = null,
  request = null,
  onRequestApplied,
  shopGroup,
  onShopGroup,
  credits,
  reduced = false,
  onUsePhotos,
  onEnter3D,
  onRetry,
  onResume3D,
  onLayout,
  contactHref,
}) {
  const idBase = useId().replace(/:/g, "");
  const phone = !useMediaQuery("(min-width: 768px)");
  const [station, setStation] = useControllable(stationProp, onStation, "arrival");
  const [selection, setSelection] = useControllable(selectionProp, onSelect, null);
  const [status, say] = useAnnouncer();
  const applied = useRef(0);
  // One-shot: the part a deliberate request wants focus on, cleared by the
  // layout once it has focused the card's heading.
  const [focusTarget, setFocusTarget] = useState(null);
  // A request naming only a car brings that car up in the photographs.
  const [carHint, setCarHint] = useState(null);

  const select = useCallback(
    (next, info) => {
      setSelection(next, info);
      const m = next ? findMod(next.carId, next.modId) : null;
      if (m) say(`${findCar(m.carId).label}: ${m.name}.`);
    },
    [setSelection, say],
  );

  // A retained request, applied once. The integration keeps it until this
  // acknowledges it, so a request made before the garage mounted still lands.
  useEffect(() => {
    if (!request || request.id == null || request.id <= applied.current) return;
    const sel = resolveRequest(request);
    applied.current = request.id;
    if (sel?.modId) {
      select(sel, { source: "request", requestId: request.id });
      if (request.focus) setFocusTarget(sel);
    } else if (sel?.carId && request.carId) {
      setCarHint({ carId: sel.carId, id: request.id });
    }
    onRequestApplied?.(request.id);
  }, [request, select, onRequestApplied]);

  const onFocused = useCallback(() => setFocusTarget(null), []);
  const shared = { selection, onSelect: select, idBase, credits, focusTarget, onFocused };

  return (
    <div className="gw-root" data-reduced={reduced ? "" : undefined}>
      {mode === "cinematic" ? (
        <GarageCinematic
          {...shared}
          station={station}
          onStation={(id, info) => setStation(id, info)}
          hood={hood}
          onHood={(carId, open) => onHood?.(carId, open)}
          stance={stance}
          onStance={(s) => onStance?.(s)}
          manual={manual}
          onResumeTour={onResumeTour}
          pins={pins}
          shopGroup={shopGroup}
          onShopGroup={onShopGroup}
          onUsePhotos={onUsePhotos}
          onLayout={onLayout}
          announce={say}
          phone={phone}
        />
      ) : (
        <GaragePhotos
          {...shared}
          availability={availability}
          onEnter3D={onEnter3D}
          onRetry={onRetry}
          onResume3D={onResume3D}
          reduced={reduced}
          contactHref={contactHref}
          carHint={carHint}
        />
      )}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </p>
    </div>
  );
}
