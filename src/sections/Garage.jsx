// src/sections/Garage.jsx: the car, opened up.
//
// This was Teardown: eleven photographs in four groups with a caption each,
// and the three of the S4 said "540 whp, tuned it myself" and nothing about
// how. The car is the most built thing on the site that is not software, so
// it gets the deck treatment: one bay, five views of the car, and a marker
// on every part that has been changed. Click a marker, or a line in the
// sheet under the bay, and the part is named, priced where Ali priced it,
// and shown close up in a crop of the same photograph.
//
// Every part comes from src/data/garage.js, which is transcribed from his
// own list and says nothing his list does not. The one number about output,
// 540 whp, is the car's and his; there is no per-part horsepower anywhere in
// the section because none was ever measured.
//
// The markers are positioned in percentages of the photograph, not of the
// frame. CoverBox does the cover-fit arithmetic so a pin on the grille stays
// on the grille whether the frame is 4:3 on a monitor or 4:5 on a phone.
// Three of the shots are tall phone portraits; without that, a 4:3 crop would
// have put half the pins on the wrong part of the car.
//
// Keyboard: the view tabs are a tablist (arrow keys switch views); the
// markers are a roving-tabindex group (arrow keys walk them, Enter or Space
// selects); the sheet is plain buttons. The detail card is a polite live
// region so a screen reader hears the part it just selected. Under
// prefers-reduced-motion the markers hold still instead of pulsing.
//
// Two bays, one card. The bezel switches between the photographs and the
// model (GarageModel.jsx: Ali's S4 in three dimensions, orbitable, hood on
// a hinge). Both pin the same sixteen parts and both select into the same
// detail card, whose close crop is always the real photograph. The three
// view tabs mean the same thing in either: where you are looking at the
// car. This branch opens on the model (DEFAULT_BAY in garage.js).
//
// What used to be the rest of Teardown (the 328xi, the bench, the two
// competitions) sits under the bay as "Also in the shop", captions intact.
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { car, views, groups, mods, modsIn, pins, findMod, priceLabel, alsoOnTheList, DEFAULT_BAY } from "../data/garage";
import { teardown } from "../data/life";
import { GARAGE_EVENT } from "../lib/garage";
import { useMediaQuery } from "../hooks";
import CoverBox from "../components/ui/CoverBox";
import GarageModel from "../components/GarageModel";
import Picture from "../components/Picture";
import Panel from "../components/ui/Panel";
import Glitch from "../components/ui/Glitch";

const pad = (n) => String(n).padStart(2, "0");
const groupOf = (m) => groups.find((g) => g.id === m.group);
const indexOf = (m) => mods.findIndex((x) => x.id === m.id);
// A pin label after a comma: first letter down, the rest as written, so the
// MMI and the RS4 keep their capitals.
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// The sheet under the bay, in three columns that come out roughly level:
// seven power parts on the left, the running gear in the middle, the
// bodywork and the cabin on the right.
const SHEET = [["power"], ["brakes", "suspension", "wheels"], ["cosmetic", "cabin"]];

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

// How far the detail crop zooms into the photograph: the crop shows about
// this fraction of the picture's width, centred on the pin.
const CROP_FRACTION = 0.3;

/** background-position that centres `p` (0 to 100) when the image is `k`
 *  times the box on that axis. Percent positioning aligns the p% point of
 *  the image with the p% point of the box, so it has to be solved for. */
function centred(p, k) {
  if (k <= 1) return 50;
  return Math.min(100, Math.max(0, ((k * p) / 100 - 0.5) / (k - 1) * 100));
}

export default function Garage() {
  const [viewId, setViewId] = useState(views[0].id);
  const [mode, setMode] = useState(DEFAULT_BAY);
  const [selected, setSelected] = useState(null);
  const [pinFocus, setPinFocus] = useState(0);
  const idBase = useId().replace(/:/g, "");
  const pinRefs = useRef([]);
  const tabRefs = useRef([]);
  const wide = useMediaQuery("(min-width: 768px)");

  const view = views.find((v) => v.id === viewId) ?? views[0];
  const viewIndex = views.indexOf(view);
  const viewPins = useMemo(() => pins.filter((p) => p.view === view.id), [view.id]);
  const mod = selected ? findMod(selected) : null;
  const model = mode === "model";

  // The model's markers: every part once, in sheet order.
  const modelMarkers = useMemo(
    () => mods.map((m, i) => ({ id: m.id, index: i, name: m.name, where: m.pins[0].label, anchor: m.anchor })),
    [],
  );

  // Selecting a part from the sheet, or from the console, may need a
  // different view: the tips are only in the rear shot.
  const select = useCallback((id) => {
    const m = findMod(id);
    if (!m) return;
    setSelected(id);
    setViewId((cur) => (m.pins.some((p) => p.view === cur) ? cur : m.pins[0].view));
  }, []);

  useEffect(() => {
    const onOpen = (e) => {
      if (e.detail?.mod) select(e.detail.mod);
    };
    window.addEventListener(GARAGE_EVENT, onOpen);
    return () => window.removeEventListener(GARAGE_EVENT, onOpen);
  }, [select]);

  // The roving tabindex follows the selection into a new view.
  useEffect(() => {
    const i = viewPins.findIndex((p) => p.mod.id === selected);
    setPinFocus(i >= 0 ? i : 0);
  }, [viewPins, selected]);

  const onPinKey = (e) => {
    const n = viewPins.length;
    if (!n) return;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (pinFocus + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (pinFocus - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    setPinFocus(next);
    pinRefs.current[next]?.focus();
  };

  const onTabKey = (e) => {
    const n = views.length;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (viewIndex + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (viewIndex - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    setViewId(views[next].id);
    tabRefs.current[next]?.focus();
  };

  const step = (dir) => {
    const i = mod ? indexOf(mod) : dir > 0 ? -1 : 0;
    const next = (i + dir + mods.length) % mods.length;
    select(mods[next].id);
  };

  // The crop: the selected part's pin in the current view if it has one,
  // else its first pin, on whichever photograph that is.
  const cropPin = mod ? mod.pins.find((p) => p.view === view.id) ?? mod.pins[0] : null;
  const cropView = cropPin ? views.find((v) => v.id === cropPin.view) : null;
  const crop = useMemo(() => {
    if (!cropPin || !cropView) return null;
    const { width, height, src } = cropView.image;
    const kx = 1 / CROP_FRACTION;
    const ky = kx * (height / width);
    return {
      backgroundImage: `url("${src}")`,
      backgroundSize: `${kx * 100}% auto`,
      backgroundPosition: `${centred(cropPin.x, kx).toFixed(2)}% ${centred(cropPin.y, ky).toFixed(2)}%`,
    };
  }, [cropPin, cropView]);

  return (
    <section id={car.id} className="relative bg-ink border-t border-ink-line grain">
      <div className="gutter pt-24 md:pt-32 pb-24 md:pb-32">
        {/* ---- header ---------------------------------------------------- */}
        <motion.div {...reveal} transition={{ duration: 0.7 }} className="rail-clear">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div>
              <p className="mono-label text-volt mb-4">05 // Garage</p>
              <Glitch as="h2" className="font-display uppercase text-display-1 text-primary block">
                Garage
              </Glitch>
            </div>
            <div className="max-w-[42ch]">
              <p className="prose-dark">{car.lede}</p>
              {/* The spec line. Machine type, because that is what it is: a
                  year, an engine code and a number. Sentence case, though,
                  and no longer tracked out to the width of a licence plate. */}
              <p className="mono-ui mono-cased text-dim mt-4">
                {car.year} {car.name} · {car.engine} · <span className="text-volt">{car.output}</span>
              </p>
            </div>
          </div>
          <div className="edge-rule mt-10" aria-hidden="true" />
        </motion.div>

        {/* ---- the bay --------------------------------------------------- */}
        <motion.div {...reveal} transition={{ duration: 0.6, delay: 0.05 }} className="mt-12 tick-frame relative rail-clear">
          <Panel edge="bg-ink-line" fill="bg-ink" innerClassName="flex flex-col">
            {/* Bezel: the name of the machine, and the views. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 md:px-5 py-3 border-b border-ink-line">
              <div className="flex items-center gap-4 min-w-0">
                <span className="hazard h-1.5 w-10 opacity-40 shrink-0" aria-hidden="true" />
                <span className="mono-label text-volt">Bay 01</span>
                <span className="mono-micro text-dim hidden sm:inline tabular-nums">{pad(mods.length)} parts</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div role="group" aria-label="Bay" className="flex border border-ink-line">
                  {[["model", "3D model"], ["photos", "Photographs"]].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={mode === id}
                      onClick={() => setMode(id)}
                      className={`px-2.5 py-1.5 mono-micro transition-colors focus-visible:shadow-none focus-visible:bg-volt focus-visible:text-ink
                                  ${mode === id ? "bg-volt text-ink font-bold" : "text-muted hover:text-primary"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              <div role="tablist" aria-label="Views of the car" onKeyDown={onTabKey} className="flex flex-wrap gap-1 -mx-1">
                {views.map((v, i) => {
                  const on = v.id === view.id;
                  return (
                    <button
                      key={v.id}
                      ref={(el) => { tabRefs.current[i] = el; }}
                      type="button"
                      role="tab"
                      id={`${idBase}-tab-${v.id}`}
                      aria-selected={on}
                      aria-controls={`${idBase}-view`}
                      tabIndex={on ? 0 : -1}
                      onClick={() => setViewId(v.id)}
                      className={`relative px-3 py-2 mono-label whitespace-nowrap transition-colors focus-visible:outline-none
                                  ${on ? "text-primary" : "text-dim hover:text-primary"}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 right-0 bottom-0 h-0.5 bg-volt transition-opacity ${on ? "opacity-100" : "opacity-0"}`}
                      />
                      {v.label}
                    </button>
                  );
                })}
              </div>
              </div>
            </div>

            <div className="grid md:grid-cols-[minmax(0,3fr)_minmax(19rem,2fr)]">
              {/* The photograph, with the markers on it. */}
              <div
                role="tabpanel"
                id={`${idBase}-view`}
                aria-labelledby={`${idBase}-tab-${view.id}`}
                tabIndex={-1}
                className="relative min-w-0 border-b md:border-b-0 md:border-r border-ink-line focus-visible:outline-none"
              >
                {model ? (
                  <GarageModel
                    markers={modelMarkers}
                    selected={selected}
                    onSelect={select}
                    view={view.id}
                    onFallback={() => setMode("photos")}
                  />
                ) : (
                <CoverBox
                  key={view.id}
                  width={view.image.width}
                  height={view.image.height}
                  focus={view.focus}
                  className="garage-frame aspect-[4/5] md:aspect-[4/3] bg-ink-deep"
                >
                  <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${view.image.lqip}")` }} />
                  <Picture
                    sources={view.image}
                    alt={view.alt}
                    sizes={wide ? "60vw" : "100vw"}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full"
                  />
                  <div className="deck-scanlines absolute inset-0 pointer-events-none" aria-hidden="true" />
                  <div role="group" aria-label={`Parts pinned on the ${view.label.toLowerCase()} view`} onKeyDown={onPinKey}>
                    {viewPins.map((p, i) => {
                      const on = selected === p.mod.id;
                      return (
                        <button
                          key={`${p.mod.id}-${p.view}`}
                          ref={(el) => { pinRefs.current[i] = el; }}
                          type="button"
                          className={`garage-pin ${on ? "is-on" : ""} ${p.y > 80 ? "is-low" : ""}`}
                          style={{ left: `${p.x}%`, top: `${p.y}%` }}
                          tabIndex={i === pinFocus ? 0 : -1}
                          aria-pressed={on}
                          aria-label={`${p.mod.name}: ${p.label}`}
                          onClick={() => select(p.mod.id)}
                          onFocus={() => setPinFocus(i)}
                        >
                          <span aria-hidden="true">{pad(p.index + 1)}</span>
                          <span className="garage-pin-label" aria-hidden="true">{p.mod.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </CoverBox>
                )}
                {!model && <div className="absolute top-0 left-0 m-3 flex items-center gap-2 pointer-events-none">
                  <span className="mono-micro text-dim bg-ink/80 px-2 py-1 tabular-nums">
                    {pad(viewIndex + 1)} / {pad(views.length)}
                  </span>
                  {view.date && <span className="mono-micro text-dim bg-ink/80 px-2 py-1">{view.date}</span>}
                </div>}
              </div>

              {/* The detail card. */}
              <div className="p-5 md:p-6 flex flex-col min-w-0" aria-live="polite">
                {mod ? (
                  <>
                    <p className="mono-label text-volt flex items-center gap-3">
                      <span>{groupOf(mod)?.label}</span>
                      <span className="text-dim tabular-nums">{pad(indexOf(mod) + 1)} / {pad(mods.length)}</span>
                    </p>
                    <h3 className="mt-3 font-display uppercase text-display-3 text-primary">{mod.name}</h3>

                    <dl className="mt-4 grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-2 items-start">
                      {mod.brand && (
                        <>
                          <dt className="mono-micro text-dim">Brand</dt>
                          <dd className="text-[0.9375rem] text-muted">{mod.brand}</dd>
                        </>
                      )}
                      {priceLabel(mod) && (
                        <>
                          <dt className="mono-micro text-dim">Paid</dt>
                          <dd className="text-[0.9375rem] text-muted tabular-nums">{priceLabel(mod)}</dd>
                        </>
                      )}
                      <dt className="mono-micro text-dim">Pinned</dt>
                      <dd className="text-[0.9375rem] text-muted">
                        {mod.pins.map((p, i) => {
                          const v = views.find((x) => x.id === p.view);
                          return (
                            <span key={p.view} className="inline">
                              {i > 0 && <span className="text-dim"> · </span>}
                              <button
                                type="button"
                                onClick={() => setViewId(p.view)}
                                className={`ink-underline text-left transition-colors hover:text-volt ${p.view === view.id ? "text-primary" : ""}`}
                              >
                                {v?.label}, {lower(p.label)}
                              </button>
                            </span>
                          );
                        })}
                      </dd>
                    </dl>

                    <p className="mt-4 prose-dark text-[0.9375rem] leading-[1.6]">{mod.note}</p>

                    {/* The close-up: the same photograph, zoomed to the pin.
                        Never a different picture, because there is not one. */}
                    {crop && (
                      <div className="mt-5 tick-frame relative w-full max-w-[16rem]">
                        <Panel corner="br" edge="bg-ink-line" innerClassName="relative aspect-square overflow-hidden">
                          <div
                            role="img"
                            aria-label={`Close crop of the ${cropView.label.toLowerCase()} photograph: ${lower(cropPin.label)}.`}
                            className="absolute inset-0 bg-no-repeat"
                            style={crop}
                          />
                          <span className="absolute left-0 bottom-0 m-2 mono-micro text-dim bg-ink/80 px-2 py-1 max-w-[calc(100%-1rem)] truncate">
                            {cropPin.label}
                          </span>
                        </Panel>
                        <span className="tick tr" aria-hidden="true" />
                        <span className="tick bl" aria-hidden="true" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mono-label text-volt">The car</p>
                    <h3 className="mt-3 font-display uppercase text-display-3 text-primary">{car.year} {car.name}</h3>
                    <dl className="mt-4 grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-2 items-baseline">
                      <dt className="mono-micro text-dim">Engine</dt>
                      <dd className="text-[0.9375rem] text-muted">{car.engine}</dd>
                      <dt className="mono-micro text-dim">Output</dt>
                      <dd className="text-[0.9375rem] text-volt">{car.output}</dd>
                      <dt className="mono-micro text-dim">Parts</dt>
                      <dd className="text-[0.9375rem] text-muted">{mods.length} on the list, {pins.length} markers</dd>
                    </dl>
                    <p className="mt-4 prose-dark text-[0.9375rem] leading-[1.6]">{car.outputNote}</p>
                    <p className="mt-3 prose-dark text-[0.9375rem] leading-[1.6] text-dim">
                      Pick a marker on the {model ? "model" : "photograph"}, or a line in the sheet below.
                    </p>
                  </>
                )}

                <div className="mt-auto pt-6 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    className="inline-flex items-center gap-2 mono-label text-muted hover:text-volt focus-visible:text-volt transition-colors py-1"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Previous part
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="inline-flex items-center gap-2 mono-label text-muted hover:text-volt focus-visible:text-volt transition-colors py-1"
                  >
                    Next part
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* The sheet: every part, grouped, and a button each. */}
            <div className="border-t border-ink-line px-4 md:px-6 py-6 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {SHEET.map((column, ci) => (
                <div key={ci} className="space-y-7">
                  {column.map((gid) => {
                    const g = groups.find((x) => x.id === gid);
                    const list = modsIn(gid);
                    if (!g || !list.length) return null;
                    return (
                      <div key={gid}>
                        <h4 className="flex items-baseline justify-between gap-4 pb-2 border-b border-ink-line">
                          <span className="mono-label text-primary">{g.label}</span>
                          <span className="mono-micro text-faint tabular-nums">{pad(list.length)}</span>
                        </h4>
                        <ul className="mt-1">
                          {list.map((m) => {
                            const on = selected === m.id;
                            const price = priceLabel(m, { short: true });
                            return (
                              <li key={m.id}>
                                <button
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => select(m.id)}
                                  className={`garage-row group w-full flex items-baseline gap-3 py-2 text-left transition-colors
                                              ${on ? "text-volt" : "text-muted hover:text-primary"}`}
                                >
                                  <span className="mono-micro text-dim tabular-nums shrink-0 w-6">{pad(indexOf(m) + 1)}</span>
                                  <span className="text-[0.9375rem] leading-snug grow min-w-0">{m.name}</span>
                                  {price && <span className="mono-micro text-dim tabular-nums shrink-0">{price}</span>}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Status bar. Only true things. The left half is machine state and
                is set like it; the right half is an instruction somebody has to
                read, so it is not in uppercase mono at all. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 md:px-5 py-2.5 border-t border-ink-line">
              <span className="mono-label text-dim">
                <span className="text-muted">{model ? "3D model" : view.label}</span> · {model ? mods.length : viewPins.length} markers
                {mod && <span> · <span className="text-muted">{mod.name}</span></span>}
              </span>
              <span className="hidden md:inline text-[0.8125rem] text-dim">
                {model ? "Drag to turn. Arrow keys walk the markers." : "Arrow keys walk the markers. Tab reaches the sheet."}
              </span>
            </div>
          </Panel>
          <span className="tick tl" aria-hidden="true" />
          <span className="tick tr" aria-hidden="true" />
          <span className="tick bl" aria-hidden="true" />
          <span className="tick br" aria-hidden="true" />
        </motion.div>

        {/* A sentence, so it is set as one. This was uppercase mono at 0.18em,
            which is the single least readable thing the section did. */}
        <p className="mt-5 prose-dark text-[0.9375rem] text-dim rail-clear">{alsoOnTheList}</p>

        {/* ---- the rest of the shop ---------------------------------------- */}
        <Shop />
      </div>
    </section>
  );
}

/** The 328xi, the bench and the competitions: the photographs that were the
 *  rest of Teardown, in the same grid they had, one step down in size. */
function Shop() {
  return (
    <div className="mt-20 md:mt-24 rail-clear">
      <motion.header {...reveal} transition={{ duration: 0.6 }} className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-5 border-b border-ink-line">
        <h3 className="font-display uppercase text-display-2 text-primary">{teardown.title}</h3>
        <p className="prose-dark text-[0.9375rem]">{teardown.lede}</p>
      </motion.header>

      <div className="mt-10 space-y-14">
        {teardown.groups.map((group) => {
          const photos = teardown.photos.filter((p) => p.group === group.id);
          if (!photos.length) return null;
          return (
            <section key={group.id} aria-label={group.label}>
              <header className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-4 border-b border-ink-line">
                <h4 className="font-display uppercase text-display-3 text-primary">{group.label}</h4>
                <p className="text-[0.9375rem] text-dim">{group.note}</p>

              </header>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((p, i) => (
                  <motion.li key={p.slug} {...reveal} transition={{ duration: 0.5, delay: Math.min(i, 2) * 0.05 }} className="group">
                    <Panel
                      corner="br"
                      edge="bg-ink-line group-hover:bg-volt transition-colors duration-300"
                      innerClassName="relative aspect-[4/3] overflow-hidden"
                    >
                      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${p.image.lqip}")` }} />
                      <Picture
                        sources={p.image}
                        alt={p.alt}
                        loading="lazy"
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                        className={`relative w-full h-full object-cover saturate-[0.9] transition-[filter,transform] duration-500 ease-out
                                    group-hover:saturate-100 group-hover:scale-[1.02] ${p.focus ?? "object-center"}`}
                      />
                      {p.date && (
                        <span className="absolute top-0 right-0 m-3 mono-micro text-dim bg-ink/80 px-2 py-1 chamfer chamfer-sm">{p.date}</span>
                      )}
                    </Panel>
                    <figcaption className="mt-4">
                      <h5 className="font-display uppercase font-semibold text-primary text-[1.0625rem] tracking-tight">{p.title}</h5>
                      {p.body && <p className="mt-2 prose-dark text-[0.9375rem] leading-[1.6]">{p.body}</p>}
                      {p.link && (
                        <a
                          href={p.link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 mono-micro text-dim transition-colors hover:text-volt"
                        >
                          <span className="ink-underline">{p.link.label}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </figcaption>
                  </motion.li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
