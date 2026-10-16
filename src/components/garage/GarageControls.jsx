// src/components/garage/GarageControls.jsx: the controls over the 3D
// workshop.
//
// The workshop itself is the city's one canvas behind the page; this is the
// thin layer of DOM over it, inside the section's sticky stage. It keeps out
// of the middle of the frame, where the cars are: a small label at the upper
// left, the six stations and the car and part controls along the bottom, and
// the chosen part's card (at most 22rem) down the left side. On a phone the
// label is a line at the top and everything else is one strip at the bottom,
// the card collapsed to its name until "Details" opens it.
//
// Only the controls are panes of glass (Panel glass), so only they are
// frosted. Nothing here moves on its own: the stations, hoods and stance
// change because the integration says they did, through props, and every
// action goes back out through a callback. The layer never reads the world;
// the one thing the world touches is the markers, which it is handed through
// `registerPin` and places itself (Markers.jsx). The props are the ones in
// agents/B5/CONTRACT.md section 2.3, plus a few optional ones: the shop
// wall's board, the layer's rectangles (onLayout) and a retained request.
//
// One polite, atomic status line: the integration's `status` string (what
// was selected, where a hood came to rest) and the layer's own few words
// (a focused marker going out of view), whichever came last.
//
// Keyboard order is the plan's: stations, car, one marker stop, Parts, hood
// and stance, the card's own actions, then photographs and credits, then the
// rest of the page. Escape closes the Parts list first, then the card, and
// puts focus back on whatever opened it. A control that disappears while it
// has focus (a station change takes the stance buttons away) hands focus to
// its nearest equivalent instead of dropping it on the page.
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Images, X } from "lucide-react";
import { useMediaQuery } from "../../hooks";
import Panel from "../ui/Panel";
import Tabs from "./Tabs";
import PartCard from "./PartCard";
import PartList from "./PartList";
import Markers from "./Markers";
import Credits from "./Credits";
import { ShopCard } from "./Shop";
import { CARS, STATIONS, findCar, findMod, findStation, resolveRequest } from "./cars";
import { CONTROL, restoreFocus } from "./focus";
import { useAnnouncer, useControllable, useGarageRequest } from "./state";
import "./garage.css";

const pad = (n) => String(n).padStart(2, "0");

// The parts of the layer whose rectangles the camera framing and the marker
// projection need to stay clear of. Reported in stage pixels through onLayout.
const MEASURED = ["label", "nav", "car", "actions", "side", "util"];

// A hood reads open from halfway; it has come to rest at either end. The
// integration may hand in booleans or the timeline's 0..1.
const amount = (v) => (v === true ? 1 : v === false || v == null ? 0 : Number(v));
// Any manual override at all (the integration's shape, or a plain boolean).
const overridden = (o) =>
  o === true || (o != null && typeof o === "object" && Object.values(o).some((v) => v != null && v !== false));

export default function GarageControls({
  station: stationProp,
  activeCar,
  selection: selectionProp,
  hood,
  stance = "normal",
  override,
  stations,
  showPrices,
  registerPin,
  credits,
  onStation,
  onSelect,
  onHood,
  onStance,
  onResumeTour,
  onMode,
  status,
  shopGroup,
  onShopGroup,
  onLayout,
  request = null,
  onRequestApplied,
}) {
  const idBase = useId().replace(/:/g, "");
  const phone = !useMediaQuery("(min-width: 768px)");
  const [station, setStation] = useControllable(stationProp, onStation, "arrival");
  const [selection, setSelection] = useControllable(selectionProp, onSelect, null);
  const [said, announce] = useAnnouncer();
  useEffect(() => {
    if (status) announce(status);
  }, [status, announce]);
  // Without an integration saying it, the layer names the selection itself.
  const standalone = status === undefined;
  useEffect(() => {
    if (!standalone || !selection) return;
    const m = findMod(selection.carId, selection.modId);
    if (m) announce(`${findCar(m.carId).label}: ${m.name}.`);
  }, [standalone, selection, announce]);
  const { focusTarget, onFocused } = useGarageRequest(request, onRequestApplied, setSelection, resolveRequest);
  const root = useRef(null);
  const partsButton = useRef(null);
  const titleRef = useRef(null);
  const activator = useRef(null);
  const lastKey = useRef(null);
  const parts = useRef({});
  const [listOpen, setListOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const pendingHood = useRef(null);
  const pendingStance = useRef(null);

  // The stations in the integration's order when it gives one, with this
  // module's labels for the ids it knows.
  const list = stations?.length ? stations.map((s) => findStation(s.id) ?? { ...s, short: s.label, carId: null }) : STATIONS;
  const here = list.find((s) => s.id === station) ?? list[0];
  const stationIndex = list.indexOf(here);
  const car = findCar(activeCar !== undefined ? activeCar : here.carId);
  const mod = selection ? findMod(selection.carId, selection.modId) : null;
  const listCars = car ? [car] : CARS;
  const atShop = here.id === "shop";
  const showStance = car?.id === "s6" && (here.id === "s6" || mod?.id === "virtual-link");

  // ---- focus that survives the controls changing ---------------------------
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const onFocusIn = (e) => {
      lastKey.current = e.target.closest?.(`[${CONTROL}]`)?.getAttribute(CONTROL) ?? lastKey.current;
    };
    // Focus leaving for somewhere else on purpose (Tab past the end, a click
    // on the page) forgets the key, so nothing pulls focus back later. Focus
    // lost because its control was removed keeps it: the target is gone.
    const onFocusOut = (e) => {
      if (e.relatedTarget && el.contains(e.relatedTarget)) return;
      const t = e.target;
      requestAnimationFrame(() => {
        if (t.isConnected) lastKey.current = null;
      });
    };
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    return () => {
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useLayoutEffect(() => {
    const key = lastKey.current;
    if (!key || !root.current) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    restoreFocus(root.current, key);
  });

  // ---- what the layer occupies ---------------------------------------------
  const reported = useRef("");
  const measure = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const base = el.getBoundingClientRect();
    const rects = {};
    for (const k of MEASURED) {
      const n = parts.current[k];
      if (!n || !n.getClientRects().length) {
        rects[k] = null;
        continue;
      }
      const r = n.getBoundingClientRect();
      rects[k] = { x: r.left - base.left, y: r.top - base.top, width: r.width, height: r.height };
    }
    const layout = { width: base.width, height: base.height, ...rects };
    const sig = JSON.stringify(layout);
    if (sig === reported.current) return;
    reported.current = sig;
    onLayout?.(layout);
  }, [onLayout]);

  useLayoutEffect(() => {
    measure();
  });
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    for (const n of Object.values(parts.current)) if (n) ro.observe(n);
    if (root.current) ro.observe(root.current);
    return () => ro.disconnect();
  }, [measure]);
  const part = (k) => (el) => { parts.current[k] = el; };

  // ---- hood and stance, announced where they come to rest ------------------
  useEffect(() => {
    const p = pendingHood.current;
    const v = amount(hood?.[p?.carId]);
    if (p && (p.open ? v >= 0.999 : v <= 0.001)) {
      announce(`${findCar(p.carId).label} hood ${p.open ? "open" : "closed"}.`);
      pendingHood.current = null;
    }
  }, [hood, announce]);
  useEffect(() => {
    const p = pendingStance.current;
    if (p && stance === p) {
      announce(p === "lowered" ? "S6 lowered." : "S6 at normal height.");
      pendingStance.current = null;
    }
  }, [stance, announce]);

  // ---- choosing ------------------------------------------------------------
  const choose = (m, el, { focusCard = false } = {}) => {
    activator.current = el ?? null;
    setSelection({ carId: m.carId, modId: m.id }, { source: focusCard ? "list" : "marker" });
    setCardOpen(false);
    if (focusCard) {
      setListOpen(false);
      requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
    }
  };

  const closeCard = () => {
    const back = activator.current;
    setSelection(null, { source: "card" });
    activator.current = null;
    requestAnimationFrame(() => {
      if (back?.isConnected && !back.hidden) back.focus({ preventScroll: true });
      else partsButton.current?.focus({ preventScroll: true });
    });
  };

  const step = (dir) => {
    const c = findCar(mod.carId);
    const next = c.mods[(mod.index + dir + c.mods.length) % c.mods.length];
    setSelection({ carId: next.carId, modId: next.id }, { source: "card" });
  };

  // A deliberate request may ask for focus once its card exists.
  useEffect(() => {
    if (!focusTarget || !mod || focusTarget.carId !== mod.carId || focusTarget.modId !== mod.id) return;
    titleRef.current?.focus({ preventScroll: true });
    onFocused?.();
  }, [focusTarget, mod, onFocused]);

  const onKeyDown = (e) => {
    if (e.key !== "Escape") return;
    if (listOpen) {
      e.stopPropagation();
      setListOpen(false);
      partsButton.current?.focus({ preventScroll: true });
    } else if (mod) {
      e.stopPropagation();
      closeCard();
    }
  };

  const onMarkerFocusLost = useCallback(() => {
    partsButton.current?.focus({ preventScroll: true });
    announce("That marker is out of view. Focus is on Parts.");
  }, [announce]);

  const stationTabs = list.map((s) => ({ ...s, key: `station:${s.id}` }));
  const carTabs = CARS.map((c) => ({ id: c.id, label: c.label, key: `car:${c.id}` }));
  const hoodOpen = car ? amount(hood?.[car.id]) >= 0.5 : false;
  const listId = `${idBase}-parts`;
  const cardDetails = `${idBase}-card-details`;

  return (
    <div ref={root} className="gw-stage" data-garage-layout="cinematic" onKeyDown={onKeyDown}>
      {/* The label: where you are, read once. */}
      <div ref={part("label")} className="gw-label">
        <p className="mono-label text-volt">05 // Garage</p>
        <p className="gw-label-line mono-micro">
          <span className="text-primary tabular-nums">{pad(stationIndex + 1)} / {pad(list.length)}</span>
          <span className="text-muted">{here.label}</span>
          {car && <span className="text-dim hidden md:inline">{car.title}</span>}
        </p>
      </div>

      {/* The six stations. */}
      <div ref={part("nav")} className="gw-area-nav">
        <Panel glass size="sm" innerClassName="gw-bar">
          <Tabs
            items={stationTabs}
            value={here.id}
            onChange={(id) => setStation(id, { source: "nav" })}
            label="Stations in the garage"
            activate="manual"
            className="gw-stations"
            tabClassName="gw-tab gw-station"
            render={(t, on, i) => (
              <>
                <span className="gw-station-n tabular-nums" aria-hidden="true">{pad(i + 1)}</span>
                <span className="gw-station-long">{t.label}</span>
                <span className="gw-station-short">{t.short}</span>
              </>
            )}
          />
        </Panel>
      </div>

      {/* The cars. */}
      <div ref={part("car")} className="gw-area-car">
        <Panel glass size="sm" innerClassName="gw-bar">
          <Tabs
            items={carTabs}
            value={car?.id ?? null}
            onChange={(id) => setStation(id, { source: "car" })}
            label="Cars"
            activate="manual"
            className="flex"
            tabClassName="gw-tab gw-car"
          />
        </Panel>
      </div>

      <Markers
        car={atShop || here.id === "arrival" ? null : car}
        selected={selection}
        registerPin={registerPin}
        onSelect={(m, el) => choose(m, el)}
        onFocusLost={onMarkerFocusLost}
      />

      {/* Parts, the hood, the stance. */}
      <div ref={part("actions")} className="gw-area-actions">
        <Panel glass size="sm" innerClassName="gw-bar gap-1">
          <button
            ref={partsButton}
            type="button"
            className="gw-tab"
            aria-expanded={listOpen}
            aria-controls={listId}
            onClick={() => setListOpen((v) => !v)}
            {...{ [CONTROL]: "parts" }}
          >
            Parts
            <span className="gw-long text-dim tabular-nums">{pad(listCars.reduce((n, c) => n + c.mods.length, 0))}</span>
          </button>
          {car && (
            // An action, named for what it will do; the underline says the
            // hood is up. On a phone it reads "Hood", inside the same name.
            <button
              type="button"
              className={`gw-tab ${hoodOpen ? "is-on" : ""}`}
              aria-label={hoodOpen ? "Close hood" : "Open hood"}
              onClick={() => {
                pendingHood.current = { carId: car.id, open: !hoodOpen };
                onHood?.(car.id, !hoodOpen);
              }}
              {...{ [CONTROL]: "hood" }}
            >
              <span className="gw-long">{hoodOpen ? "Close hood" : "Open hood"}</span>
              <span className="gw-short">Hood</span>
            </button>
          )}
          {showStance && (
            <div role="group" aria-label="S6 ride height" className="flex">
              {[["normal", "Normal"], ["lowered", "Lowered"]].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="gw-tab"
                  aria-pressed={stance === id}
                  onClick={() => {
                    if (stance === id) return;
                    pendingStance.current = id;
                    onStance?.(id);
                  }}
                  {...{ [CONTROL]: `stance:${id}` }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {overridden(override) && onResumeTour && (
            <button type="button" className="gw-tab text-volt" aria-label="Resume tour" onClick={onResumeTour} {...{ [CONTROL]: "resume-tour" }}>
              <span className="gw-long">Resume tour</span>
              <span className="gw-short">Resume</span>
            </button>
          )}
        </Panel>
      </div>

      {/* The card, the list, or the shop wall's captions. */}
      <div ref={part("side")} className="gw-area-side">
        {listOpen ? (
          <Panel glass innerClassName="gw-panel" id={listId}>
            <div className="flex items-center justify-between gap-3">
              <p className="mono-label text-volt">{car ? `${car.label} parts` : "Parts, both cars"}</p>
              <button
                type="button"
                className="gw-icon -mr-2"
                aria-label="Close the parts list"
                onClick={() => {
                  setListOpen(false);
                  partsButton.current?.focus({ preventScroll: true });
                }}
                {...{ [CONTROL]: "parts-close" }}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="gw-panel-scroll mt-3 space-y-6">
              {listCars.map((c) => (
                <div key={c.id}>
                  {listCars.length > 1 && <p className="mono-micro text-dim mb-2">{c.title}</p>}
                  <PartList car={c} selected={selection} onPick={(m, el) => choose(m, el, { focusCard: true })} columns={false} showPrices={showPrices} />
                </div>
              ))}
              {/* On a phone the credits live here, out of the picture. */}
              <Credits credits={credits} className="gw-credits-in-list" />
            </div>
          </Panel>
        ) : mod ? (
          <Panel glass innerClassName="gw-panel">
            <PartCard
              mod={mod}
              viewId={null}
              onStep={step}
              onClose={closeCard}
              titleRef={titleRef}
              compact={phone}
              open={cardOpen}
              onToggleOpen={() => setCardOpen((v) => !v)}
              detailsId={cardDetails}
              stance={mod.id === "virtual-link"}
              showPrices={showPrices}
            />
          </Panel>
        ) : atShop ? (
          <Panel glass innerClassName="gw-panel">
            <ShopCard group={shopGroup} onGroup={(g) => onShopGroup?.(g)} idBase={idBase} compact={phone} />
          </Panel>
        ) : null}
      </div>

      {/* Photographs instead, and the credits. */}
      <div ref={part("util")} className="gw-area-util">
        {onMode && (
          <Panel glass size="sm" innerClassName="gw-bar">
            <button type="button" className="gw-tab" onClick={() => onMode("photos")} {...{ [CONTROL]: "use-photos" }}>
              <Images className="w-4 h-4" aria-hidden="true" />
              <span className="gw-long">Photographs</span>
              <span className="gw-short">Photos</span>
            </button>
          </Panel>
        )}
        <Credits credits={credits} className="gw-credits-overlay gw-credits-in-util" />
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {said}
      </p>
    </div>
  );
}
