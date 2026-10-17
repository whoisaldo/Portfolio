// src/components/garage/GaragePhotos.jsx: the garage as photographs, at its
// natural height. The preserved layout is behind GARAGE_PHOTOS_ENABLED;
// with that switch off this export renders GarageText.
//
// This is what the garage is whenever the 3D workshop is not: while it loads,
// when the device has no WebGL or the city is off, when a GPU context is lost,
// and when the reader simply prefers photographs. It is an ordinary column of
// content that scrolls past at the speed of the page, never a stationary
// six-screen spacer, and it ends in a direct link to Contact.
//
// Two cars, one bay. The car tabs switch the bay between the S4 and the S6;
// each car keeps its own photographs (the S4 its five, the S6 the front, rear
// and engine bay it has), its markers, its grouped list and the same detail
// card. Choosing a part in the other car's list switches the bay to that car,
// and to a photograph that shows the part if the current one does not.
//
// The availability line at the top says what the 3D workshop is doing, in
// plain words, and offers the one action that applies: enter it once it is
// ready, retry it if it failed, resume it after a lost context. It never
// switches by itself; whoever owns the layout decides that.
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowDownRight } from "lucide-react";
import { scrollToSection } from "../../lib/scroll";
import { useMediaQuery } from "../../hooks";
import Panel from "../ui/Panel";
import Tabs from "./Tabs";
import PartCard from "./PartCard";
import PartList from "./PartList";
import PhotoBay from "./PhotoBay";
import Shop from "./Shop";
import Credits from "./Credits";
import GarageText from "./GarageText";
import { GARAGE_PHOTOS_ENABLED } from "./features";
import { CARS, findCar, findMod, photoForStation, resolveRequest, stationForPhoto } from "./cars";
import { ANCHOR, CONTROL, focusInView } from "./focus";
import { useAnnouncer, useControllable, useGarageRequest } from "./state";
import "./garage.css";

const pad = (n) => String(n).padStart(2, "0");

/** The line about the 3D workshop, and its one action. `availability` is
 *  the integration's state ("off", "unsupported", "idle", "loading",
 *  "ready", "failed", "lost", "restoring"), as a string or as
 *  { state, progress }. Nothing is said while the workshop is off for
 *  reasons the reader chose, unsupported, or not yet asked for. */
function Availability({ availability, reason, canEnter3d, onEnter3d, onRetry, resume }) {
  const state = typeof availability === "string" ? availability : availability?.state;
  const progress = typeof availability === "object" ? availability?.progress : null;
  const pct = progress != null ? ` ${Math.round(progress * 100)}%` : "";
  let text = null;
  let action = null;
  if (state === "loading") text = `Loading the 3D workshop${pct}. The photographs are here meanwhile.`;
  else if (state === "ready" && canEnter3d && onEnter3d) {
    text = resume ? "The 3D view is back." : "The 3D workshop is ready.";
    action = { label: resume ? "Resume 3D" : "Enter the 3D workshop", key: resume ? "resume-3d" : "enter-3d", onClick: onEnter3d };
  } else if (state === "failed") {
    text = reason ? `The 3D workshop did not load: ${reason}` : "The 3D workshop did not load.";
    if (onRetry) action = { label: "Try again", key: "retry-3d", onClick: onRetry };
  } else if (state === "lost") text = "The 3D view stopped. These are the same cars in photographs.";
  else if (state === "restoring") text = "The 3D view is coming back. The photographs stay until it has.";
  else if (state === "off" && canEnter3d && onEnter3d) {
    text = "The 3D workshop is off.";
    action = { label: "Turn on 3D", key: "enter-3d", onClick: onEnter3d };
  }
  if (!text) return null;
  return (
    <div className="gw-availability flex flex-wrap items-center gap-x-5 gap-y-3">
      <span className="hazard h-1.5 w-8 opacity-40 shrink-0" aria-hidden="true" />
      <p className="text-[0.9375rem] text-muted">{text}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="gw-action" {...{ [CONTROL]: action.key, [ANCHOR]: "mode" }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

export default function GaragePhotos(props) {
  return GARAGE_PHOTOS_ENABLED ? <PhotoLayout {...props} /> : <GarageText {...props} />;
}

function PhotoLayout({
  activeCar,
  selection: selectionProp,
  availability,
  reason,
  reduced = false,
  showPrices,
  credits,
  onSelect,
  onCar,
  onEnter3d,
  onRetry,
  canEnter3d = false,
  resume = false,
  fallback = null,
  still = false,
  onStation,
  contactHref = "#contact",
  request = null,
  onRequestApplied,
}) {
  const idBase = useId().replace(/:/g, "");
  const [selection, setSelection] = useControllable(selectionProp, onSelect, null);
  const [said, announce] = useAnnouncer();
  const select = useCallback(
    (next, info) => {
      setSelection(next, info);
      const m = next ? findMod(next.carId, next.modId) : null;
      if (m) announce(`${findCar(m.carId).label}: ${m.name}.`);
    },
    [setSelection, announce],
  );
  const { focusTarget, onFocused, carHint } = useGarageRequest(request, onRequestApplied, select, resolveRequest);
  const wide = useMediaQuery("(min-width: 768px)");
  const [ownCar, setOwnCar] = useState(photoForStation(fallback)?.carId ?? activeCar ?? selection?.carId ?? "s4");
  const carId = activeCar ?? ownCar;
  const setCarId = useCallback(
    (id) => {
      setOwnCar(id);
      if (id !== activeCar) onCar?.(id);
    },
    [activeCar, onCar],
  );
  const [viewIds, setViewIds] = useState(() => {
    const photo = photoForStation(fallback);
    return Object.fromEntries(CARS.map((c) => [c.id, c.id === photo?.carId ? photo.viewId : c.views[0].id]));
  });
  const root = useRef(null);
  const shopRef = useRef(null);
  const titleRef = useRef(null);
  const activator = useRef(null);
  const pendingFocus = useRef(null);
  const returnFocus = useRef(null);
  const car = findCar(carId);
  const view = car.views.find((v) => v.id === viewIds[carId]) ?? car.views[0];
  const mod = selection?.carId === carId ? findMod(carId, selection.modId) : null;

  // A selection made anywhere (the workshop before a lost context, the
  // console, a pending request) brings its car and a photograph of it.
  // Only a new selection does this, so switching the car tab afterwards is
  // not undone; the setter is read through a ref for the same reason.
  const setCar = useRef(setCarId);
  setCar.current = setCarId;
  useLayoutEffect(() => {
    if (!selection?.carId) return;
    setCar.current(selection.carId);
    const m = findMod(selection.carId, selection.modId);
    if (!m?.pins.length) return;
    setViewIds((v) => (m.pins.some((p) => p.view === v[m.carId]) ? v : { ...v, [m.carId]: m.pins[0].view }));
  }, [selection?.carId, selection?.modId]);

  // Apply a new handoff before the parent's layout transaction measures the
  // replacement. It is an input, not a station callback to echo back to B5.
  useLayoutEffect(() => {
    const photo = photoForStation(fallback);
    if (!photo) return;
    setCar.current(photo.carId);
    setViewIds((v) => ({ ...v, [photo.carId]: photo.viewId }));
  }, [fallback]);

  useEffect(() => {
    if (carHint?.carId) setCar.current(carHint.carId);
  }, [carHint]);

  // A deliberate request (a console command, a link) may ask for focus; it
  // goes to the card's heading once the card exists.
  useEffect(() => {
    if (!focusTarget || !mod || focusTarget.carId !== mod.carId || focusTarget.modId !== mod.id) return;
    focusInView(titleRef.current);
    onFocused?.();
  }, [focusTarget, mod, onFocused]);

  const setView = (id) => {
    setViewIds((v) => ({ ...v, [carId]: id }));
    onStation?.(stationForPhoto(carId, id));
  };
  const pick = (m, el, source = "marker") => {
    if (el) activator.current = el;
    if (source === "list") pendingFocus.current = `${m.carId}:${m.id}`;
    select({ carId: m.carId, modId: m.id }, { source });
    const nextView = m.pins.some((p) => p.view === viewIds[m.carId]) ? viewIds[m.carId] : m.pins[0]?.view ?? viewIds[m.carId];
    onStation?.(stationForPhoto(m.carId, nextView));
  };
  useLayoutEffect(() => {
    if (!mod || pendingFocus.current !== `${mod.carId}:${mod.id}`) return;
    pendingFocus.current = null;
    focusInView(titleRef.current);
  });
  useLayoutEffect(() => {
    const back = returnFocus.current;
    if (!back || mod) return;
    returnFocus.current = null;
    const row = root.current?.querySelector(`[${ANCHOR}="part:${back.part}"]`);
    focusInView(back.el?.isConnected && back.el.getClientRects().length ? back.el : row);
  });
  const closeCard = () => {
    const back = activator.current;
    // A card's Next action can replace the photograph and remove its opener.
    // The original part still has a row even if its marker no longer exists.
    const opener = back?.getAttribute(CONTROL)?.replace(/^(mod|row):/, "") ?? `${mod.carId}:${mod.id}`;
    returnFocus.current = { el: back, part: opener };
    pendingFocus.current = null;
    select(null, { source: "card" });
    activator.current = null;
  };
  const step = (dir) => {
    const i = mod ? mod.index : dir > 0 ? -1 : 0;
    const next = car.mods[(i + dir + car.mods.length) % car.mods.length];
    pick(next, null, "card");
  };
  const markers = car.mods.reduce((n, m) => n + m.pins.length, 0);
  const viewMarkers = car.mods.filter((m) => m.pins.some((p) => p.view === view.id)).length;

  // The shop reports when it reaches the upper half of the viewport. Scrolling
  // back above it restores the station shown by the current photograph.
  const reportStation = useRef(onStation);
  reportStation.current = onStation;
  const currentPhoto = useRef(null);
  currentPhoto.current = stationForPhoto(carId, view.id);
  useEffect(() => {
    if (!shopRef.current || !window.IntersectionObserver) return undefined;
    let atShop = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !atShop) {
        atShop = true;
        reportStation.current?.("shop");
      } else if (atShop && entry.boundingClientRect.top > window.innerHeight / 2) {
        atShop = false;
        reportStation.current?.(currentPhoto.current);
      }
    }, { rootMargin: "0px 0px -50% 0px" });
    io.observe(shopRef.current);
    return () => io.disconnect();
  }, []);

  const carTabs = CARS.map((c) => ({ id: c.id, label: c.label, key: `car:${c.id}`, anchor: `car:${c.id}`, title: c.title }));
  const viewTabs = car.views.map((v) => ({ id: v.id, label: v.label, key: `view:${carId}:${v.id}` }));
  const bayId = `${idBase}-bay`;
  const viewPanel = `${idBase}-view`;

  return (
    <div ref={root} className="gw-photos" data-garage-layout="photos" onKeyDown={(e) => {
      if (e.key !== "Escape" || !mod) return;
      e.stopPropagation();
      closeCard();
    }}>
      <Availability availability={availability} reason={reason} canEnter3d={canEnter3d} onEnter3d={onEnter3d} onRetry={onRetry} resume={resume} />

      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <Tabs
          items={carTabs}
          value={carId}
          onChange={(id) => {
            setCarId(id);
            onStation?.(stationForPhoto(id, viewIds[id]));
          }}
          label="Cars in the garage"
          idBase={`${idBase}-car`}
          controls={bayId}
          className="gw-cars flex gap-2"
          tabClassName="gw-car-tab"
          render={(t) => (
            <>
              <span className="mono-micro text-dim">{t.id === "s4" ? "Bay 01" : "Bay 02"}</span>
              <span className="block font-display uppercase text-display-3 leading-none mt-1">{t.label}</span>
            </>
          )}
        />
        <Panel glass className="max-w-[46ch]" innerClassName="px-5 py-4">
          <p className="prose-dark">{car.car.lede}</p>
          <p className="mono-ui mono-cased text-dim mt-4">
            {car.title} · {car.spec[0]} · <span className={car.output ? "text-volt" : ""}>{car.spec[1]}</span>
          </p>
        </Panel>
      </div>

      <div className="mt-10 tick-frame relative">
        <Panel
          glass
          fill="bg-ink"
          innerClassName="flex flex-col"
          role="tabpanel"
          id={bayId}
          aria-labelledby={`${idBase}-car-tab-${carId}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 md:px-5 py-3 border-b border-ink-line">
            <div className="flex items-center gap-4 min-w-0">
              <span className="hazard h-1.5 w-10 opacity-40 shrink-0" aria-hidden="true" />
              <span className="mono-label text-volt">{car.bay}</span>
              <span className="mono-micro text-dim tabular-nums">{car.title}</span>
              <span className="mono-micro text-dim hidden sm:inline tabular-nums">{pad(car.mods.length)} parts</span>
            </div>
            <Tabs
              items={viewTabs}
              value={view.id}
              onChange={setView}
              label={`Photographs of the ${car.label}`}
              idBase={`${idBase}-${carId}-view`}
              controls={viewPanel}
              className="flex flex-wrap gap-1 -mx-1"
              tabClassName="gw-tab"
            />
          </div>

          <div className="grid md:grid-cols-[minmax(0,3fr)_minmax(19rem,2fr)]">
            <PhotoBay
              car={car}
              view={view}
              selected={selection}
              onSelect={pick}
              wide={wide}
              panelId={viewPanel}
              labelledBy={`${idBase}-${carId}-view-tab-${view.id}`}
            />
            <div className="p-5 md:p-6 flex flex-col min-w-0">
              {mod ? (
                <PartCard
                  mod={mod}
                  showPrices={showPrices}
                  viewId={view.id}
                  onStep={step}
                  onClose={closeCard}
                  onPin={setView}
                  titleRef={titleRef}
                  className="flex flex-col grow"
                />
              ) : (
                <div className="gw-card flex flex-col grow">
                  <p className="mono-label text-volt">The car</p>
                  <h3 className="gw-card-title mt-2 font-display uppercase text-display-3 text-primary">{car.title}</h3>
                  <dl className="mt-4 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 items-baseline">
                    <dt className="mono-micro text-dim">Engine</dt>
                    <dd className="text-[0.9375rem] text-muted">{car.car.engine}</dd>
                    {car.output ? (
                      <>
                        <dt className="mono-micro text-dim">Output</dt>
                        <dd className="text-[0.9375rem] text-volt">{car.output}</dd>
                      </>
                    ) : (
                      <>
                        <dt className="mono-micro text-dim">Drivetrain</dt>
                        <dd className="text-[0.9375rem] text-muted">{car.car.drivetrain}</dd>
                      </>
                    )}
                    <dt className="mono-micro text-dim">Parts</dt>
                    <dd className="text-[0.9375rem] text-muted">
                      {car.mods.length} on the list, {markers} {markers === 1 ? "marker" : "markers"}
                    </dd>
                  </dl>
                  <p className="mt-4 prose-dark text-[0.9375rem] leading-[1.6]">{car.car.outputNote}</p>
                  <p className="mt-3 prose-dark text-[0.9375rem] leading-[1.6] text-dim">
                    Pick a marker on the photograph, or a line in the list below.
                  </p>
                  <div className="mt-auto pt-6 flex justify-end">
                    <button type="button" onClick={() => step(1)} className="gw-step" {...{ [CONTROL]: "card-next" }}>
                      First part
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-ink-line px-4 md:px-6 py-6">
            <PartList car={car} selected={selection} onPick={(m, el) => pick(m, el, "list")} showPrices={showPrices} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 md:px-5 py-2.5 border-t border-ink-line">
            <span className="mono-label text-dim">
              <span className="text-muted">{car.label}</span> · <span className="text-muted">{view.label}</span> · {viewMarkers}{" "}
              {viewMarkers === 1 ? "marker" : "markers"}
              {mod && <span> · <span className="text-muted">{mod.name}</span></span>}
            </span>
            <span className="hidden md:inline text-[0.8125rem] text-dim">Arrow keys walk the markers. Tab reaches the list.</span>
          </div>
        </Panel>
        <span className="tick tl" aria-hidden="true" />
        <span className="tick tr" aria-hidden="true" />
        <span className="tick bl" aria-hidden="true" />
        <span className="tick br" aria-hidden="true" />
      </div>

      {car.footnote && <p className="mt-5 prose-dark text-[0.9375rem] text-dim">{car.footnote}</p>}

      <div ref={shopRef}><Shop reduced={reduced} still={still} /></div>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 pt-6 border-t border-ink-line">
        <Credits credits={credits} />
        <a
          href={contactHref}
          onClick={(e) => {
            if (!contactHref.startsWith("#")) return;
            e.preventDefault();
            scrollToSection(contactHref.slice(1));
          }}
          className="gw-next ml-auto"
          {...{ [CONTROL]: "contact" }}
        >
          <span className="mono-micro text-dim">Next</span>
          <span className="font-display uppercase text-primary">Contact</span>
          <ArrowDownRight className="w-4 h-4 text-volt" aria-hidden="true" />
        </a>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {said}
      </p>
    </div>
  );
}
