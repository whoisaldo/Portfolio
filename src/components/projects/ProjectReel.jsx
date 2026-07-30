// src/components/projects/ProjectReel.jsx — the desktop projects reel.
//
// Vertical scroll drives a horizontal filmstrip. The track does not move
// linearly with scroll: each project holds still for ~58% of its scroll budget
// and wipes to the next in the other ~42% (see lib/reelMath.js). That produces
// a detent -- a channel change -- with none of scroll-snap's costs: no scroll
// trapping, no fight with the modal, no cross-browser inconsistency with
// position: sticky, and find-in-page still works.
//
// THE DESYNC RULE: every visual thing in here reads from `smooth` through
// useTransform. There is exactly one setState in the component, and it rounds
// that same value. It is arithmetically impossible for the indicator and the
// track to disagree, because they are the same number.
import React, { useRef, useState, useCallback } from "react";
import {
  motion,
  useTransform,
  useSpring,
  useVelocity,
  useMotionValueEvent,
} from "framer-motion";
import ProjectFrame from "./ProjectFrame";
import { imageSrc } from "../../lib/image";
import {
  easedIndex,
  progressForIndex,
  wrapperVh,
  trackXPx,
} from "../../lib/reelMath";
import {
  useImageWarmup,
  useViewportWidth,
  useElementScrollProgress,
} from "../../hooks";

export default function ProjectReel({ projects, onOpen }) {
  const wrapperRef = useRef(null);
  const [active, setActive] = useState(0);
  const n = projects.length;

  const scrollYProgress = useElementScrollProgress(wrapperRef);

  const eased = useTransform(scrollYProgress, (p) => easedIndex(p, n));

  // The spring rides the EASED index, not raw progress. During a hold nothing
  // is moving, so it adds no perceptible latency; at the end of a wipe it
  // gives ~3% overshoot for ~120ms, which is the detent you feel.
  const smooth = useSpring(eased, {
    stiffness: 220,
    damping: 32,
    mass: 0.6,
    restDelta: 0.0005,
  });

  // Re-measured on resize; see trackXPx for why this is px and not vw.
  const vw = useViewportWidth();
  const x = useTransform(smooth, (v) => trackXPx(v, vw));

  // Burst intensity from scroll velocity: a hard flick tears, an easy scroll
  // wipes gently. Same input, proportional response.
  const velocity = useVelocity(smooth);
  const burst = useTransform(velocity, [-4, -0.35, 0.35, 4], [1, 0, 0, 1], {
    clamp: true,
  });

  useMotionValueEvent(smooth, "change", (v) => {
    const i = Math.max(0, Math.min(n - 1, Math.round(v)));
    setActive((prev) => (prev === i ? prev : i));
  });

  // Decode every plate up front. Eight <img> elements is nothing; culling to
  // active +/- 1 is what produced blank frames in the previous build.
  const plateSrcs = React.useMemo(
    () => projects.map((p) => imageSrc(p.images?.[0])).filter(Boolean),
    [projects]
  );
  const warmed = useImageWarmup(plateSrcs);

  const goTo = useCallback(
    (i) => {
      const el = wrapperRef.current;
      if (!el) return;
      const span = el.offsetHeight - window.innerHeight;
      // getBoundingClientRect, not offsetTop: #projects is `position: relative`,
      // so offsetTop is measured from the section rather than the document and
      // is ~1000px short. Same class of bug as the desync this reel replaced.
      const docTop = el.getBoundingClientRect().top + window.scrollY;
      const top = docTop + span * progressForIndex(i, n);
      // Instant: a smooth scroll across this section strobes every frame on
      // the way. The spring still animates the track, so the transition reads
      // as a deliberate channel change rather than a jump cut.
      window.scrollTo({ top, behavior: "instant" });
    },
    [n]
  );

  const onKeyDown = useCallback(
    (e) => {
      const map = {
        ArrowRight: Math.min(n - 1, active + 1),
        ArrowLeft: Math.max(0, active - 1),
        Home: 0,
        End: n - 1,
      };
      if (e.key in map) {
        e.preventDefault();
        goTo(map[e.key]);
      }
    },
    [active, goTo, n]
  );

  return (
    <div
      ref={wrapperRef}
      style={{ height: `${wrapperVh(n)}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div className="reel-track absolute inset-y-0 left-0" style={{ x }}>
          {projects.map((p, i) => (
            <ProjectFrame
              key={p.slug}
              project={p}
              index={i}
              total={n}
              active={i === active}
              progress={smooth}
              burst={burst}
              onOpen={() => onOpen(i)}
            />
          ))}
        </motion.div>

        {/* Channel strip — the ONE counter on screen. The previous build showed
            the same [ 04 / 08 ] in four places at once. */}
        <nav
          aria-label="Projects"
          onKeyDown={onKeyDown}
          className="absolute bottom-8 left-0 right-0 gutter flex items-end justify-between gap-8"
        >
          <ol className="flex items-center gap-1.5">
            {projects.map((p, i) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === active ? "true" : undefined}
                  aria-label={`${i + 1}. ${p.title}`}
                  className="group relative block h-8 w-8 focus-visible:outline-none"
                >
                  <span
                    className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 transition-all duration-300 ease-out"
                    style={{
                      backgroundColor:
                        i === active ? p.accent : "rgb(109 95 168 / 0.45)",
                      height: i === active ? 2 : 1,
                    }}
                  />
                  <span className="sr-only">{p.title}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-6">
            {/* Honest telemetry: this is a real number about a real thing,
                unlike the coordinates and uplink status it replaces. */}
            {warmed < plateSrcs.length && (
              <span className="mono-label text-faint tabular-nums">
                warming {warmed}/{plateSrcs.length}
              </span>
            )}
            <span className="mono-label text-dim tabular-nums">
              {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
          </div>
        </nav>
      </div>
    </div>
  );
}
