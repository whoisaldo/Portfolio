// src/components/projects/ProjectFrame.jsx — one project in the reel.
//
// Layer order, and why each exists:
//
//   0  ambient backplate  The LQIP blown up past the frame edges. A 20px image
//                         stretched to full width IS the blur, so there is no
//                         GPU filter cost, and the "empty" area around a 3:2
//                         plate in a 16:9 viewport fills with a glow taken from
//                         the plate itself. It also means a frame whose full
//                         image has not decoded yet reads as intentional
//                         rather than as a black rectangle.
//   1  the plate          object-contain, uncropped. The old card used
//                         aspect-[16/10] + object-cover on a 3:2 source, which
//                         silently cut ~6% off the bottom of every plate --
//                         the laptop's lower edge and its reflection.
//   2  parallax           the plate drifts against its frame, counter to the
//                         track. Small: +/-3%, not the +/-30% that reads as slop.
//   3  type               title, tagline, description, stack, actions.
//
// The channel-change burst is driven by `burst` (0..1), derived from scroll
// velocity by the parent, so flicking hard tears harder than easing through.
import React from "react";
import { motion, useTransform } from "framer-motion";
import { ExternalLink, Github, ArrowUpRight } from "lucide-react";
import ScrambleText from "./ScrambleText";
import ProjectImage from "./ProjectImage";
import { hexToRgbTriplet } from "../../lib/image";
import { CARD_VW, GAP_VW } from "../../lib/reelMath";

// Fixed pseudo-random tear bands. Constant so the burst looks like the same
// piece of broken hardware every time rather than random noise.
const SLICES = [
  { top: 18, h: 9, dx: -14 },
  { top: 42, h: 6, dx: 11 },
  { top: 63, h: 11, dx: -8 },
  { top: 81, h: 5, dx: 16 },
];

export default function ProjectFrame({
  project,
  index,
  total,
  active,
  progress, // motion value: the reel's continuous index
  burst, // motion value: 0..1 channel-change intensity
  onOpen,
}) {
  // Distance from focus. Computed here rather than in the parent so it stays
  // one hook per frame instead of a hook inside the parent's .map().
  const offset = useTransform(progress, (v) => v - index);
  // Neighbours recede rather than disappear: you can always see what is coming
  // and what you passed, which is the whole point of a filmstrip.
  const dim = useTransform(offset, [-1.4, 0, 1.4], [0.32, 1, 0.32], { clamp: true });
  const plateX = useTransform(offset, [-1, 0, 1], ["3%", "0%", "-3%"], { clamp: true });
  const plateScale = useTransform(offset, [-1, 0, 1], [1.05, 1, 1.05], { clamp: true });
  const tear = useTransform(burst, [0, 1], [0, 1]);

  // Precomputed: useTransform cannot be called inside the .map() below without
  // breaking the Rules of Hooks (the call count would vary with SLICES.length).
  const slice0 = useTransform(burst, [0, 1], [0, SLICES[0].dx]);
  const slice1 = useTransform(burst, [0, 1], [0, SLICES[1].dx]);
  const slice2 = useTransform(burst, [0, 1], [0, SLICES[2].dx]);
  const slice3 = useTransform(burst, [0, 1], [0, SLICES[3].dx]);
  const sliceX = [slice0, slice1, slice2, slice3];

  const lqip = project.images?.[0]?.lqip;

  return (
    <motion.article
      className="relative shrink-0 h-screen flex items-center"
      style={{
        width: `${CARD_VW}vw`,
        marginRight: `${GAP_VW}vw`,
        opacity: dim,
        "--accent": hexToRgbTriplet(project.accent),
      }}
      // Inactive frames must not be reachable by Tab. The previous build used
      // pointerEvents:'none', which stops the mouse but leaves every link in
      // the tab order -- so Tab silently scrolled you sideways into content
      // you could not see.
      inert={!active}
      aria-hidden={!active}
    >
      <div className="relative w-full max-w-[1560px] mx-auto grid grid-cols-12 gap-x-10 gap-y-8 items-center">
        {/* ---- plate ------------------------------------------------------ */}
        <div className="col-span-12 lg:col-span-7 relative">
          <div className="relative aspect-[3/2] bracket-frame">
            {lqip && (
              <div
                className="ambient-plate"
                style={{ backgroundImage: `url("${lqip}")` }}
                aria-hidden="true"
              />
            )}

            <motion.div
              className="absolute inset-0"
              style={{ x: plateX, scale: plateScale }}
            >
              <ProjectImage
                image={project.images?.[0]}
                alt={`${project.title} — key art`}
                sizes="(min-width: 1024px) 44vw, 90vw"
                className="w-full h-full object-contain"
                fetchPriority={index === 0 ? "high" : "low"}
              />
            </motion.div>

            {/* Slice tear — compositor-only transforms, no filters. */}
            <motion.div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ opacity: tear }}
              aria-hidden="true"
            >
              {SLICES.map((s, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  style={{
                    clipPath: `inset(${s.top}% 0 ${100 - s.top - s.h}% 0)`,
                    x: sliceX[i],
                    backgroundImage: lqip ? `url("${lqip}")` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    mixBlendMode: "screen",
                    opacity: 0.5,
                  }}
                />
              ))}
            </motion.div>

            <span className="bracket-corner tl" />
            <span className="bracket-corner tr" />
            <span className="bracket-corner bl" />
            <span className="bracket-corner br" />
          </div>

          {/* Oversized index, bleeding off the plate's lower-left corner. */}
          <span
            className="pointer-events-none absolute -bottom-10 -left-6 serif-display italic leading-none select-none"
            style={{
              fontSize: "clamp(5rem, 9vw, 9rem)",
              color: "rgb(var(--accent) / 0.16)",
            }}
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* ---- copy ------------------------------------------------------- */}
        <div className="col-span-12 lg:col-span-5">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="h-2 w-2 shrink-0"
              style={{ backgroundColor: "rgb(var(--accent))" }}
              aria-hidden="true"
            />
            <span className="mono-ui text-dim">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            {project.status === "live" && (
              <span className="mono-ui text-ember">live</span>
            )}
            {project.status === "in-dev" && (
              <span className="mono-ui text-dim">in development</span>
            )}
            {project.status === "pre-release" && (
              <span className="mono-ui text-dim">pre-release</span>
            )}
          </div>

          <ScrambleText
            as="h3"
            text={project.title}
            active={active}
            className="serif-display italic text-primary text-5xl xl:text-6xl leading-[0.95] mb-5 chromatic-aberration"
          />

          <p className="mono-ui text-signal-soft mb-7">{project.tagline}</p>

          {/* Why it exists, then what it is. In Ali's own words — see the note
              on `why` in src/data/projects.js. A reader who only takes one
              sentence off this card should get the reason, not the stack. */}
          <p className="prose-dark prose-lede mb-4 max-w-[46ch]">{project.why}</p>
          <p className="prose-dark text-[0.9375rem] leading-[1.65] text-dim mb-8 max-w-[46ch]">
            {project.description}
          </p>

          <ul className="flex flex-wrap gap-x-4 gap-y-2 mb-9" aria-label="Stack">
            {project.tech.slice(0, 6).map((t) => (
              <li key={t} className="mono-ui text-dim">{t}</li>
            ))}
            {project.tech.length > 6 && (
              <li className="mono-ui text-dim">+{project.tech.length - 6}</li>
            )}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpen}
              className="scan-beam-host group inline-flex items-center gap-2.5 px-6 py-3.5 mono-ui font-bold
                         text-ink transition-colors duration-200"
              style={{ backgroundColor: "rgb(var(--accent))" }}
            >
              Open
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 mono-ui border border-hud/40 text-muted
                           hover:border-hud-soft hover:text-primary transition-colors duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                Live
              </a>
            )}

            {project.github ? (
              <a
                href={project.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 mono-ui border border-hud/25 text-dim
                           hover:border-hud hover:text-muted transition-colors duration-200"
              >
                <Github className="w-4 h-4" />
                Source
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 px-6 py-3.5 mono-ui border border-hud/15 text-faint">
                Source private
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
