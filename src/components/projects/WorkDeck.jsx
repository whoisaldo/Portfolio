// src/components/projects/WorkDeck.jsx: the work, on a machine.
//
// This replaced a two-column grid of eight cards. The grid's argument was
// that a reader scans; it answered "how many are there" and "which one is
// worth opening" at a glance and cost nothing to compare them. That argument
// still holds, and the rail on the left of this deck keeps it: all eight
// titles, numbered, with a status square each, visible at once without a
// click. What changed is the other half of the screen. One project at a
// time gets the room a card never could: its key art at full width, its own
// sentence, its stack, and the way in to the case study. Arrow keys walk the
// rail, a click switches the screen, and Expand takes the whole thing to the
// viewport, where the screens behind the key art (the real product, captured
// live) become a gallery.
//
// It is dressed as a deck because that is what the site is: a bezel, a
// rail, a screen that switches on with a line, a status bar that reports
// only what is true (which entry, how many, what state). Nothing on it is a
// readout of something that is not happening.
//
// Colour is load-bearing here as it was on the grid: `--accent` is volt on a
// live project and fuchsia on one still in development (see the note above
// `const LIVE` in src/data/projects.js), on the rail's squares and the
// screen's flag.
//
// Five of the eight screens can switch from the key art to a working model
// of the project (src/components/demos): a connection diagram, a calculator,
// a sample log. "Try it" in the screen's top bar switches; "Art" switches
// back. Every model is flagged SIMULATED in its own header because none of
// them talks to the real product, and the status bar says so too.
import React, { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ExternalLink, Github, Maximize2, X } from "lucide-react";
import ProjectImage from "./ProjectImage";
import Panel from "../ui/Panel";
import { DEMOS } from "../demos";
import { useFocusTrap, useMediaQuery } from "../../hooks";
import { hexToRgbTriplet } from "../../lib/image";

const pad = (n) => String(n).padStart(2, "0");
const statusOf = (p) => (p.status === "live" ? "Live" : p.status);

/** The rail: every entry, numbered, with its status. A real tablist. */
function Rail({ projects, index, onSelect, expanded, idBase }) {
  const refs = useRef([]);
  // A strip across the top on phones, a column down the side from md up.
  const vertical = useMediaQuery("(min-width: 768px)");

  const onKey = (e) => {
    const n = projects.length;
    let next = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (index + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (index - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    onSelect(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Projects"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      onKeyDown={onKey}
      className={`flex overflow-x-auto md:flex-col md:overflow-visible border-b md:border-b-0 md:border-r border-ink-line
                  ${expanded ? "md:overflow-y-auto md:min-h-0" : ""}`}
    >
      {projects.map((p, i) => {
        const selected = i === index;
        return (
          <button
            key={p.slug}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${i}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(i)}
            style={{ "--accent": hexToRgbTriplet(p.accent) }}
            className={`group relative flex shrink-0 items-center gap-3 px-4 py-3 md:px-5 md:py-3.5 text-left
                        transition-colors duration-150 focus-visible:outline-none
                        ${selected ? "bg-ink-raised text-primary" : "text-muted hover:bg-ink-raised/60 hover:text-primary"}`}
          >
            {/* The selected entry's marker: a volt bar down its left edge on
                the vertical rail, along its bottom on the horizontal one. */}
            <span
              aria-hidden="true"
              className={`absolute bg-volt transition-opacity duration-150
                          left-0 right-0 bottom-0 h-0.5 md:top-0 md:bottom-0 md:right-auto md:h-auto md:w-0.5
                          ${selected ? "opacity-100" : "opacity-0 group-focus-visible:opacity-60"}`}
            />
            <span className="mono-micro text-muted tabular-nums shrink-0">{pad(i + 1)}</span>
            <span className="font-display uppercase text-[0.9375rem] font-semibold tracking-[-0.01em] whitespace-nowrap md:whitespace-normal md:grow md:min-w-0">
              {p.title}
            </span>
            <span className="deck-led" style={{ backgroundColor: "rgb(var(--accent))" }} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/** "Art" or "Try it", for the screens that have a model. */
function ModeToggle({ demo, setDemo }) {
  return (
    <div role="group" aria-label="Screen" className="ml-auto flex border border-ink-line bg-ink/90 backdrop-blur-sm">
      {[[false, "Art"], [true, "Try it"]].map(([on, label]) => (
        <button
          key={label}
          type="button"
          aria-pressed={demo === on}
          onClick={() => setDemo(on)}
          className={`px-2.5 py-1.5 mono-micro transition-colors focus-visible:shadow-none focus-visible:bg-volt focus-visible:text-ink
                      ${demo === on ? "bg-volt text-ink font-bold" : "text-muted hover:text-primary"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The screen: one project, with the gallery when expanded. */
function Screen({ p, index, total, expanded, shot, setShot, demo, setDemo, idBase }) {
  const images = p.images || [];
  const image = images[expanded ? shot : 0] || images[0];
  const gallery = expanded && images.length > 1;
  const Demo = DEMOS[p.slug];
  const showDemo = Boolean(demo && Demo);

  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel`}
      aria-labelledby={`${idBase}-tab-${index}`}
      tabIndex={-1}
      className="min-w-0 focus-visible:outline-none"
      style={{ "--accent": hexToRgbTriplet(p.accent) }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={p.slug}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className={
            expanded
              ? "lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(19rem,2fr)] lg:gap-10 lg:items-start"
              : "xl:grid xl:grid-cols-[minmax(0,3fr)_minmax(17rem,2fr)] xl:gap-8 xl:items-start"
          }
        >
          <div className="min-w-0">
            <Panel
              corner="br"
              edge="bg-ink-line"
              fill="bg-ink-deep"
              innerClassName={`relative overflow-hidden ${showDemo ? "" : "deck-screen-on"}`}
            >
              {showDemo ? (
                // The model. On a monitor it keeps the art's frame and
                // scrolls inside it, so the deck never changes height when
                // the screen switches; on a phone it takes the height it
                // needs, because a 3:2 box at 340px wide is 227px tall.
                <div className={`deck-demo relative md:overflow-y-auto ${expanded ? "md:aspect-[16/10]" : "md:aspect-[3/2]"}`}>
                  <Suspense fallback={<p className="p-6 mono-label text-dim">loading the model…</p>}>
                    <Demo toolbar={<ModeToggle demo={showDemo} setDemo={setDemo} />} />
                  </Suspense>
                </div>
              ) : (
                <>
                  {image?.lqip && (
                    <div aria-hidden="true" className="ambient-plate" style={{ backgroundImage: `url("${image.lqip}")` }} />
                  )}
                  <div className={`relative ${expanded ? "aspect-[16/10]" : "aspect-[3/2]"}`}>
                    <ProjectImage
                      key={image?.src || "none"}
                      image={image}
                      alt={shot > 0 && expanded ? `${p.title}, screen ${shot + 1}` : `${p.title} key art`}
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes={expanded ? "(min-width: 1024px) 58vw, 94vw" : "(min-width: 768px) 60vw, 92vw"}
                      className={`absolute inset-0 w-full h-full ${expanded && shot > 0 ? "object-contain" : "object-cover"}`}
                    />
                  </div>
                  <div className="deck-scanlines absolute inset-0 pointer-events-none" aria-hidden="true" />
                  <div aria-hidden="true" className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink/85 to-transparent" />
                </>
              )}
              {/* Over the art: the index, the status flag and, where there is
                  a model, the toggle. In model mode the toggle sits in the
                  model's own header instead (DemoFrame.jsx). */}
              {!showDemo && (
                <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-4">
                  <span className="mono-micro text-dim tabular-nums">{pad(index + 1)} / {pad(total)}</span>
                  <span
                    className="chamfer chamfer-sm mono-micro px-2 py-1 text-ink font-bold"
                    style={{ backgroundColor: "rgb(var(--accent))" }}
                  >
                    {statusOf(p)}
                  </span>
                  {Demo && <ModeToggle demo={false} setDemo={setDemo} />}
                </div>
              )}
            </Panel>

            {gallery && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Screens">
                {images.map((im, i) => (
                  <button
                    key={im.src || i}
                    type="button"
                    onClick={() => { setDemo(false); setShot(i); }}
                    aria-label={i === 0 ? "Key art" : `Screen ${i}`}
                    aria-pressed={i === shot && !showDemo}
                    className={`shrink-0 border transition-colors ${i === shot ? "border-volt" : "border-ink-line hover:border-dim"}`}
                  >
                    <ProjectImage image={im} alt="" sizes="112px" loading="lazy" className="block w-28 h-[4.5rem] object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`pt-5 min-w-0 ${expanded ? "lg:pt-0" : "xl:pt-0"}`}>
            <p className="mono-label text-muted">{p.tagline}</p>
            {/* Not text-display-2: at 44px "ETERNALEXCHANGE" is 409px wide and
                the inline column is 379px. Sized to the column instead, and
                allowed to break inside a word as the last resort, since a
                chamfered frame clips anything that runs past it. */}
            <h3
              className="mt-2 font-display font-semibold uppercase leading-[1] tracking-[-0.015em] text-primary [overflow-wrap:anywhere]"
              style={{ fontSize: expanded ? "clamp(1.75rem, 3vw, 2.5rem)" : "clamp(1.6rem, 2.3vw, 2.25rem)" }}
            >
              {p.title}
            </h3>
            <p className="mt-4 prose-dark max-w-[52ch]">{p.why}</p>
            {expanded && <p className="mt-4 prose-dark max-w-[52ch] text-[0.9375rem]">{p.description}</p>}

            {/* A step up from the site's micro chips: on a phone the stack is
                information, and 10px at 46% is not readable at arm's length. */}
            <ul className="mt-5 flex flex-wrap gap-x-3.5 gap-y-2" aria-label="Stack">
              {(expanded ? p.tech : p.tech.slice(0, 6)).map((t) => (
                <li key={t} className="mono-label text-muted">{t}</li>
              ))}
              {!expanded && p.tech.length > 6 && <li className="mono-label text-dim">+{p.tech.length - 6}</li>}
            </ul>

            {expanded && p.features?.length > 0 && (
              <ul className="mt-6 space-y-2 max-w-[52ch]" aria-label="Highlights">
                {p.features.slice(0, 5).map((f) => (
                  <li key={f} className="prose-dark text-[0.9375rem] flex gap-3">
                    <span className="text-volt shrink-0" aria-hidden="true">//</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Panel
                as={Link}
                to={`/work/${p.slug}`}
                size="sm"
                edge="bg-volt hover:bg-volt-deep transition-colors duration-200"
                fill="bg-volt"
                className="scan-beam-host group"
                innerClassName="inline-flex items-center gap-2.5 px-5 py-3 mono-ui font-bold text-ink"
              >
                Open case study
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Panel>
              {p.live && (
                <a
                  href={p.live}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 mono-ui text-muted hover:text-volt transition-colors"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  Live
                </a>
              )}
              {p.github && (
                <a
                  href={p.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 mono-ui text-muted hover:text-volt transition-colors"
                >
                  <Github className="w-4 h-4" aria-hidden="true" />
                  Source
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The machine: bezel, rail, screen, status bar. Inline or filling the viewport. */
function Deck({ projects, index, onSelect, expanded, onExpand, onClose, shot, setShot, demo, setDemo, idBase }) {
  const p = projects[index];
  const modelled = Boolean(demo && DEMOS[p.slug]);
  const tall = expanded ? "h-full" : "";
  return (
    <div className={`tick-frame relative ${tall}`}>
      <Panel edge="bg-ink-line" fill="bg-ink" className={tall} innerClassName={`flex flex-col ${tall}`}>
        {/* The bezel. */}
        <div className="flex items-center justify-between gap-4 px-4 md:px-5 py-3 border-b border-ink-line">
          <div className="flex items-center gap-4 min-w-0">
            <span className="hazard h-1.5 w-10 opacity-40 shrink-0" aria-hidden="true" />
            <span className="mono-label text-volt">Work deck</span>
            <span className="mono-micro text-dim hidden sm:inline tabular-nums">{pad(projects.length)} entries</span>
          </div>
          {expanded ? (
            <button
              type="button"
              onClick={onClose}
              className="mono-label text-muted hover:text-volt focus-visible:text-volt transition-colors inline-flex items-center gap-2 py-1"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Close
              <span className="text-faint" aria-hidden="true">esc</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onExpand}
              className="mono-label text-muted hover:text-volt focus-visible:text-volt transition-colors inline-flex items-center gap-2 py-1"
            >
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
              Expand
            </button>
          )}
        </div>

        {/* Rail and screen. */}
        {/* The rail is 15rem because "ETERNALEXCHANGE" is one word: at
            13.5rem it had to break in the middle. */}
        <div className={`grid md:grid-cols-[15rem_minmax(0,1fr)] ${expanded ? "min-h-0 grow" : ""}`}>
          <Rail projects={projects} index={index} onSelect={onSelect} expanded={expanded} idBase={idBase} />
          <div className={`p-4 md:p-6 ${expanded ? "min-h-0 overflow-y-auto" : ""}`}>
            <Screen p={p} index={index} total={projects.length} expanded={expanded} shot={shot} setShot={setShot} demo={demo} setDemo={setDemo} idBase={idBase} />
          </div>
        </div>

        {/* The status bar. Only true things. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 md:px-5 py-2.5 border-t border-ink-line mono-label text-dim">
          <span className="tabular-nums">
            <span className="text-muted">{pad(index + 1)} / {pad(projects.length)}</span> · {statusOf(p)}
            {modelled && <span> · <span className="text-fuchsia">simulated model on screen</span></span>}
          </span>
          <span className="hidden md:inline">
            arrow keys switch entries{expanded ? " · esc closes" : ""}
          </span>
        </div>
      </Panel>

      {/* Outside the Panel on purpose: clip-path would eat them at the
          corners they mark. */}
      <span className="tick tl" aria-hidden="true" />
      <span className="tick tr" aria-hidden="true" />
      <span className="tick bl" aria-hidden="true" />
      <span className="tick br" aria-hidden="true" />
    </div>
  );
}

export default function WorkDeck({ projects }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [shot, setShot] = useState(0);
  // Whether the screen shows the project's model rather than its art. Reset
  // on every switch of entry: a reader who opens EternalExchange's calculator
  // and then arrows to Moops should see Moops, not a blank "Try it".
  const [demo, setDemo] = useState(false);
  const idBase = useId().replace(/:/g, "");
  const fullRef = useRef(null);

  const select = useCallback((i) => {
    setIndex(i);
    setShot(0);
    setDemo(false);
  }, []);
  const close = useCallback(() => setExpanded(false), []);

  // Escape closes; the trap owns focus and the scroll lock while it is up.
  useFocusTrap(fullRef, expanded, close);

  // The expanded deck is a copy of the inline one, so the inline one is
  // hidden from assistive tech while both exist.
  useEffect(() => {
    if (!expanded) setShot(0);
  }, [expanded]);

  return (
    <div className="gutter rail-clear">
      <div aria-hidden={expanded || undefined} className={expanded ? "invisible" : ""}>
        <Deck
          projects={projects}
          index={index}
          onSelect={select}
          expanded={false}
          onExpand={() => setExpanded(true)}
          shot={0}
          setShot={setShot}
          demo={demo}
          setDemo={setDemo}
          idBase={`${idBase}-inline`}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            ref={fullRef}
            className="fixed inset-0 z-[100] bg-ink-deep/92 backdrop-blur-sm p-3 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Projects, expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="h-full"
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 0.9, 0.25, 1] }}
            >
              <Deck
                projects={projects}
                index={index}
                onSelect={select}
                expanded
                onClose={close}
                shot={shot}
                setShot={setShot}
                demo={demo}
                setDemo={setDemo}
                idBase={`${idBase}-full`}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
