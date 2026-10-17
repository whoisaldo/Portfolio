// The garage stays readable without WebGL or a live context. Both builds
// remain in ordinary document flow, with their complete parts lists and
// the same selected-part text. Photographs are preserved separately.
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { ArrowDownRight } from "lucide-react";
import { scrollToSection } from "../../lib/scroll";
import Panel from "../ui/Panel";
import PartCard from "./PartCard";
import PartList from "./PartList";
import Credits from "./Credits";
import { ShopText } from "./Shop";
import { CARS, findCar, findMod, resolveRequest } from "./cars";
import { ANCHOR, CONTROL, focusInView } from "./focus";
import { useAnnouncer, useControllable, useGarageRequest } from "./state";
import "./garage.css";

export default function GarageText({
  selection: selectionProp,
  availability,
  reason,
  showPrices,
  credits,
  onSelect,
  onCar,
  onStation,
  onRetry,
  contactHref = "#contact",
  request = null,
  onRequestApplied,
}) {
  const [selection, setSelection] = useControllable(selectionProp, onSelect, null);
  const [said, announce] = useAnnouncer();
  const mod = selection ? findMod(selection.carId, selection.modId) : null;
  const root = useRef(null);
  const titles = useRef({});
  const opener = useRef(null);
  const pending = useRef(null);
  const returning = useRef(null);
  const { focusTarget, onFocused } = useGarageRequest(request, onRequestApplied, setSelection, resolveRequest);

  useEffect(() => {
    if (mod) announce(`${findCar(mod.carId).label}: ${mod.name}.`);
  }, [mod, announce]);

  // Only deliberate activations move focus. Scroll updates and incidental
  // selections can change the text while the reader keeps their position.
  useLayoutEffect(() => {
    if (!mod || pending.current !== `${mod.carId}:${mod.id}`) return;
    pending.current = null;
    focusInView(titles.current[mod.carId]);
  });
  useLayoutEffect(() => {
    const back = returning.current;
    if (!back || mod) return;
    returning.current = null;
    const row = root.current?.querySelector(`[${ANCHOR}="${back.key}"]`);
    focusInView(back.el?.isConnected ? back.el : row);
  });
  useEffect(() => {
    if (!mod || focusTarget?.carId !== mod.carId || focusTarget?.modId !== mod.id) return;
    focusInView(titles.current[mod.carId]);
    onFocused();
  }, [focusTarget, mod, onFocused]);

  const choose = (part, el) => {
    opener.current = { el, key: `part:${part.carId}:${part.id}` };
    pending.current = `${part.carId}:${part.id}`;
    setSelection({ carId: part.carId, modId: part.id }, { source: "list" });
    onCar?.(part.carId);
    onStation?.(part.station);
  };
  const close = () => {
    returning.current = opener.current ?? { key: `part:${mod.carId}:${mod.id}` };
    pending.current = null;
    opener.current = null;
    setSelection(null, { source: "card" });
    announce("Part details closed.");
  };
  const step = (dir) => {
    const car = findCar(mod.carId);
    const next = car.mods[(mod.index + dir + car.mods.length) % car.mods.length];
    setSelection({ carId: next.carId, modId: next.id }, { source: "card" });
    onStation?.(next.station);
  };

  const state = typeof availability === "string" ? availability : availability?.state;
  const progress = typeof availability === "object" ? availability?.progress : null;
  const messages = {
    loading: `Loading the 3D workshop${progress == null ? "" : ` ${Math.round(progress * 100)}%`}. Both builds are listed below.`,
    failed: `The 3D workshop could not load.${reason ? ` ${reason}` : ""} Both builds are listed below.`,
    lost: "The 3D view stopped. Both builds and their parts are here.",
    restoring: "Restoring the 3D workshop. Both builds remain here meanwhile.",
    unsupported: "Both builds and their parts are listed below.",
    off: "Both builds and their parts are listed below.",
  };

  return (
    <div ref={root} className="gw-text" data-garage-layout="text" onKeyDown={(e) => {
      if (e.key !== "Escape" || !mod) return;
      e.stopPropagation();
      close();
    }}>
      {messages[state] && <div className="gw-availability flex flex-wrap items-center gap-4">
        <p className="prose-dark text-[0.9375rem]">{messages[state]}</p>
        {state === "failed" && onRetry && <button type="button" className="gw-action" onClick={onRetry} {...{ [CONTROL]: "retry-3d" }}>Try again</button>}
      </div>}

      <div className="mt-8 grid gap-8 lg:grid-cols-2 items-start">
        {CARS.map((car) => (
          <Panel key={car.id} as="section" glass innerClassName="p-5 md:p-6" aria-labelledby={`garage-text-${car.id}`}>
            <p className="mono-label text-volt">{car.bay}</p>
            <h3 id={`garage-text-${car.id}`} {...{ [ANCHOR]: `car:${car.id}`, [CONTROL]: `car:${car.id}` }} tabIndex={-1} className="mt-2 font-display uppercase text-display-3 text-primary">
              {car.title}
            </h3>
            <p className="mt-4 prose-dark">{car.car.lede}</p>
            <p className="mt-4 mono-ui mono-cased text-dim">{car.car.engine} · {car.output ?? car.car.drivetrain}</p>
            {mod?.carId === car.id && <div className="mt-6 border-t border-ink-line pt-5">
              <PartCard mod={mod} headingLevel={4} showPrices={showPrices} onClose={close} onStep={step} titleRef={(el) => { titles.current[car.id] = el; }} />
            </div>}
            <div className="mt-6 border-t border-ink-line pt-5">
              <PartList car={car} selected={selection} onPick={choose} showPrices={showPrices} columns={false} />
            </div>
            {car.footnote && <p className="mt-5 prose-dark text-[0.875rem] text-dim">{car.footnote}</p>}
          </Panel>
        ))}
      </div>

      <ShopText />
      <div className="mt-12 pt-6 border-t border-ink-line flex flex-wrap items-center justify-between gap-5">
        <Credits credits={credits} />
        <a href={contactHref} className="gw-next ml-auto" {...{ [CONTROL]: "contact" }} onClick={(e) => {
          if (!contactHref.startsWith("#")) return;
          e.preventDefault();
          scrollToSection(contactHref.slice(1));
        }}>
          <span className="mono-micro text-dim">Next</span>
          <span className="font-display uppercase text-primary">Contact</span>
          <ArrowDownRight className="w-4 h-4 text-volt" aria-hidden="true" />
        </a>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{said}</p>
    </div>
  );
}
