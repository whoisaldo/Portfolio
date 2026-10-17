// src/sections/Garage.jsx: controls over the shared city's workshop.
//
// The shell owns layout and availability; this lazy child keeps selection
// through loading, context loss and restoration. B3 owns the controls and
// text fallback. Both cars and their complete part lists stay available
// through every availability state. Photo presentation
// is archived behind B3's single feature flag and never starts a renderer.
import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SHOW_PRICES } from "../data/garage";
import { CARS, findMod } from "../components/garage/cars";
import GarageText from "../components/garage/GarageText";
import GarageControls from "../components/garage/GarageControls";
import { GARAGE_PHOTOS_ENABLED } from "../components/garage/features";
import { ackGarageRequest, latestGarageRequest, subscribeGarageRequests } from "../lib/garage";
import { setGarageView } from "../lib/garage3d";
import { getWorld, useStage } from "../world/stage";
import { GARAGE_STATIONS } from "../data/world";

const ArchivedPhotos = lazy(() => import("../components/garage/GaragePhotos"));
const credits = Object.values(import.meta.glob("../data/garage-credits.js", { eager: true }))[0]?.garageCredits ?? [];
const cars = Object.fromEntries(CARS.map((car) => [car.id, car]));
const stationOf = ({ carId, modId }) => findMod(carId, modId)?.station ?? carId;

export default function Garage({ cinematic = false, availability = "idle", reason, reduced, fallback, restoreAnchor, still, onRetry }) {
  const root = useRef(null);
  const { context } = useStage();
  const [selection, setSelection] = useState(null);
  const [activeCar, setActiveCar] = useState("s4");
  const [station, setStation] = useState("arrival");
  const [partsOpen, setPartsOpen] = useState(false);
  const [previousLayout, setPreviousLayout] = useState(cinematic);
  const [applied, setApplied] = useState(null);
  if (cinematic !== previousLayout) {
    setPreviousLayout(cinematic);
    if (cinematic && restoreAnchor?.startsWith("part:")) setPartsOpen(true);
  }
  const adapter = () => getWorld()?.garage;
  const select = useCallback((next) => {
    if (next && !cars[next.carId]?.mods.some((mod) => mod.id === next.modId)) return false;
    setSelection(next);
    if (next) {
      setActiveCar(next.carId);
      setGarageView({ textStation: stationOf(next) });
      if (cinematic) adapter()?.select?.(next);
    } else adapter()?.select?.(null);
    return true;
  }, [cinematic]);
  const goStation = useCallback((id) => {
    if (!GARAGE_STATIONS.some((item) => item.id === id)) return;
    setStation(id);
    setSelection(null);
    if (id.startsWith("s4") || id.startsWith("s6")) setActiveCar(id.slice(0, 2));
    setGarageView({ textStation: id });
    adapter()?.goStation(id);
  }, []);
  useEffect(() => {
    if (!cinematic) return undefined;
    return adapter()?.subscribe?.((state) => {
      if (state.station) setStation(state.station);
      if (state.selection !== undefined) setSelection(state.selection);
    });
  }, [cinematic, context]);
  useEffect(() => {
    const apply = (request) => {
      if (!request || !cars[request.carId]) return;
      if (request.station) {
        if (!cinematic || !GARAGE_STATIONS.some((item) => item.id === request.station)) return;
        goStation(request.station);
      }
      if (request.modId && !select(request)) return;
      if (!request.modId) setActiveCar(request.carId);
      if (request.focus && cinematic) setPartsOpen(true);
      setApplied(request);
    };
    const off = subscribeGarageRequests(apply);
    apply(latestGarageRequest());
    return off;
  }, [cinematic, context, select, goStation]);
  useLayoutEffect(() => {
    if (!applied) return;
    const key = applied.modId ? `part:${applied.carId}:${applied.modId}` : applied.station ? `station:${applied.station}` : `car:${applied.carId}`;
    const target = [...root.current.querySelectorAll("[data-garage-anchor]")].find((el) => el.dataset.garageAnchor === key && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
    if (!target) return;
    if (applied.focus) target.focus({ preventScroll: true });
    ackGarageRequest(applied.id);
  }, [applied, cinematic, partsOpen]);
  const common = {
    selection, activeCar, availability, reason, reduced, fallback, still, showPrices: SHOW_PRICES, credits,
    onSelect: select, onCar: setActiveCar, onRetry, contactHref: "#contact", request: applied,
    onStation: cinematic ? goStation : (id) => setGarageView({ textStation: id }),
  };
  return <div ref={root} data-garage-ready={cinematic ? "true" : "false"}>
    {cinematic ? <GarageControls {...common} station={station} stations={GARAGE_STATIONS} hood={adapter()?.state?.hood} stance={adapter()?.state?.lowering ? "lowered" : "normal"} override={adapter()?.state?.override} registerPin={(key, el) => adapter()?.registerPin?.(key, el)} partsOpen={partsOpen} onPartsOpen={setPartsOpen} onHood={(id, open) => adapter()?.setHood?.(id, open)} onStance={(value) => adapter()?.setStance?.(value)} onResumeTour={() => adapter()?.resumeTour?.()} />
      : GARAGE_PHOTOS_ENABLED && ArchivedPhotos ? <Suspense fallback={<GarageText {...common} />}><ArchivedPhotos {...common} /></Suspense> : <GarageText {...common} />}
  </div>;
}
