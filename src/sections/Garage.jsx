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
import { getGarageView, setGarageView } from "../lib/garage3d";
import { getWorld, useStage } from "../world/stage";
import { garageCredits as credits } from "../data/garage-credits";
import { GARAGE_STATIONS } from "../data/world";

const ArchivedPhotos = lazy(() => import("../components/garage/GaragePhotos"));
const cars = Object.fromEntries(CARS.map((car) => [car.id, car]));
const stationOf = ({ carId, modId }) => findMod(carId, modId)?.station ?? carId;

export default function Garage({ cinematic = false, availability = "idle", reason, reduced, fallback, restoreAnchor, still, onRetry }) {
  const root = useRef(null);
  const { context } = useStage();
  const [selection, setSelection] = useState(() => getGarageView().selection ?? null);
  const [activeCar, setActiveCar] = useState("s4");
  const [worldState, setWorldState] = useState({});
  const [station, setStation] = useState("arrival");
  const [partsOpen, setPartsOpen] = useState(false);
  const [previousLayout, setPreviousLayout] = useState(cinematic);
  const [applied, setApplied] = useState(null);
  const savedOverrides = useRef(null);
  const currentSelection = useRef(selection);
  currentSelection.current = selection;
  if (cinematic !== previousLayout) {
    setPreviousLayout(cinematic);
    if (cinematic && restoreAnchor?.startsWith("part:")) setPartsOpen(true);
  }
  const adapter = () => getWorld()?.garage;
  const select = useCallback((next) => {
    if (next && !cars[next.carId]?.mods.some((mod) => mod.id === next.modId)) return false;
    setSelection(next);
    setGarageView({ selection: next });
    if (savedOverrides.current) savedOverrides.current.selection = next;
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
    savedOverrides.current = null;
    if (id.startsWith("s4") || id.startsWith("s6")) setActiveCar(id.slice(0, 2));
    setGarageView({ textStation: id });
    adapter()?.goStation(id);
  }, []);
  useLayoutEffect(() => {
    if (!cinematic) return;
    const g = adapter();
    if (savedOverrides.current) g?.restoreState?.({ ...savedOverrides.current, selection: currentSelection.current });
    else g?.select?.(currentSelection.current);
  }, [cinematic, context]);
  useEffect(() => {
    if (!cinematic) return undefined;
    const g = adapter();
    setWorldState(g?.state ?? {});
    savedOverrides.current = g?.saveState?.() ?? savedOverrides.current;
    return g?.subscribe?.((state) => {
      savedOverrides.current = g.saveState?.() ?? savedOverrides.current;
      if (state.type === "pin-hidden") return;
      setWorldState(state);
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
      if (!request.modId && !request.station) setActiveCar(request.carId);
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
    const visible = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const anchored = (value) => [...root.current.querySelectorAll("[data-garage-anchor]")].find((el) => el.dataset.garageAnchor === value && visible(el));
    const card = applied.modId && selection?.carId === applied.carId && selection?.modId === applied.modId ? root.current.querySelector(".gw-card-title") : null;
    const target = anchored(key) ?? (!applied.modId && !applied.station ? anchored(`station:${applied.carId}`) : visible(card) ? card : null);
    if (!target) return;
    if (applied.focus) target.focus({ preventScroll: true });
    ackGarageRequest(applied.id);
  }, [applied, cinematic, partsOpen, selection]);
  const common = {
    selection, activeCar, availability, reason, reduced, fallback, still, showPrices: SHOW_PRICES, credits,
    onSelect: select, onCar: setActiveCar, onRetry, contactHref: "#contact", request: applied,
    onStation: cinematic ? goStation : (id) => setGarageView({ textStation: id }),
  };
  return <div ref={root} data-garage-ready={cinematic ? "true" : "false"}>
    {cinematic ? <GarageControls {...common} station={station} stations={GARAGE_STATIONS} hood={worldState.hood} stance={worldState.lowering ? "lowered" : "normal"} override={worldState.override} status={worldState.status ?? ""} onLayout={(layout) => adapter()?.setPinLayout?.(layout)} registerPin={(key, el) => adapter()?.registerPin?.(key, el)} partsOpen={partsOpen} onPartsOpen={setPartsOpen} onHood={(id, open) => adapter()?.setHood?.(id, open)} onStance={(value) => adapter()?.setStance?.(value)} onResumeTour={() => adapter()?.resumeTour?.()} />
      : GARAGE_PHOTOS_ENABLED && ArchivedPhotos ? <Suspense fallback={<GarageText {...common} />}><ArchivedPhotos {...common} /></Suspense> : <GarageText {...common} />}
  </div>;
}
