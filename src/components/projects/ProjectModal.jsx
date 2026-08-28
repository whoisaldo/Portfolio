// src/components/projects/ProjectModal.jsx
//
// The previous modal had four accessibility gaps and one live bug:
//   - no Escape handler, no focus trap, no focus restore, no scroll lock
//   - `if (!isOpen || !project) return null` sat INSIDE the component that
//     owned the <AnimatePresence>, so the exit animation could never run --
//     the modal always vanished instantly.
//
// Both are fixed by structure: the parent owns <AnimatePresence> and mounts
// this only when there is something to show, and useFocusTrap handles focus,
// Escape and the body scroll lock together. The scroll lock is load-bearing --
// without it a wheel event over the modal scrolls the reel underneath, and the
// project behind the modal stops matching the one inside it.
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ExternalLink, Github, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { hasWorkPage } from "../../data/work";
import ProjectImage from "./ProjectImage";
import { hexToRgbTriplet } from "../../lib/image";
import { useFocusTrap } from "../../hooks";

export default function ProjectModal({ project, onClose }) {
  const panelRef = useRef(null);
  const [shot, setShot] = useState(0);
  const images = project.images ?? [];
  const labels = project.imageLabels ?? [];

  useFocusTrap(panelRef, true, onClose);

  const step = useCallback(
    (d) => setShot((s) => (s + d + images.length) % images.length),
    [images.length]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ "--accent": hexToRgbTriplet(project.accent) }}
    >
      <div
        className="absolute inset-0 bg-ink-deep/92"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99 }}
        transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-ink border border-hud/25"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 md:px-8 py-4 bg-ink/95 backdrop-blur-sm border-b border-hud/20">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="h-2 w-2 shrink-0"
              style={{ backgroundColor: "rgb(var(--accent))" }}
              aria-hidden="true"
            />
            <h2
              id="project-modal-title"
              className="serif-display italic text-primary text-2xl md:text-3xl truncate"
            >
              {project.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-2 border border-hud/30 text-dim hover:text-primary hover:border-hud-soft transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* ---- gallery ---------------------------------------------------- */}
        <div className="relative bg-ink-deep">
          <div className="relative h-72 md:h-[480px] flex items-center justify-center">
            <ProjectImage
              image={images[shot]}
              alt={labels[shot] ? `${project.title} — ${labels[shot]}` : project.title}
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-ink/80 border border-hud/30 text-muted hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-ink/80 border border-hud/30 text-muted hover:text-primary transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {labels[shot] && (
            <p className="absolute bottom-3 left-4 mono-label text-dim">{labels[shot]}</p>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-6 md:px-8 py-3 border-y border-hud/15">
            {images.map((im, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setShot(i)}
                aria-label={labels[i] || `Image ${i + 1}`}
                aria-current={i === shot ? "true" : undefined}
                className="shrink-0 w-24 h-16 overflow-hidden border transition-colors"
                style={{
                  borderColor: i === shot ? "rgb(var(--accent))" : "rgb(109 95 168 / 0.25)",
                }}
              >
                <ProjectImage
                  image={im}
                  alt=""
                  sizes="96px"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* ---- detail ----------------------------------------------------- */}
        <div className="px-6 md:px-8 py-8 grid md:grid-cols-[1fr_280px] gap-10">
          <div>
            <p className="mono-ui text-signal-soft mb-6">{project.tagline}</p>
            <p className="prose-dark whitespace-pre-wrap mb-9">
              {project.longDescription}
            </p>

            <h3 className="mono-label text-dim mb-4">Features</h3>
            <ul className="grid md:grid-cols-2 gap-2.5">
              {project.features.map((f) => (
                <li key={f} className="flex items-start gap-3 prose-dark">
                  <Check
                    className="w-3.5 h-3.5 mt-1 shrink-0"
                    style={{ color: "rgb(var(--accent))" }}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-8">
            <div>
              <h3 className="mono-label text-dim mb-4">Stack</h3>
              <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                {project.tech.map((t) => (
                  <li key={t} className="mono-ui text-dim">{t}</li>
                ))}
              </ul>
            </div>

            {project.stats && (
              <div>
                <h3 className="mono-label text-dim mb-4">At a glance</h3>
                <dl className="space-y-2.5">
                  {Object.entries(project.stats).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-hud/15 pb-2">
                      <dt className="mono-ui text-dim">{k}</dt>
                      <dd className="mono-ui text-primary text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {/* The modal is the quick look; the case study is the long read.
                  Listed first because it is the only one of these three that
                  keeps the reader on the site, and it is the link worth
                  sending to somebody. */}
              {hasWorkPage(project.slug) && (
                <Link
                  to={`/work/${project.slug}`}
                  className="scan-beam-host inline-flex items-center justify-between gap-2 px-5 py-3.5
                             mono-ui font-bold bg-signal text-ink hover:bg-signal-soft transition-colors"
                >
                  Full case study
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-between gap-2 px-5 py-3.5 mono-ui border transition-colors"
                  style={{ borderColor: "rgb(var(--accent) / 0.5)", color: "rgb(var(--accent))" }}
                >
                  Visit live
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {project.github ? (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-between gap-2 px-5 py-3.5 mono-ui border border-hud/35 text-muted hover:text-primary hover:border-hud-soft transition-colors"
                >
                  Source
                  <Github className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="inline-flex items-center justify-between gap-2 px-5 py-3.5 mono-ui border border-hud/15 text-faint">
                  Source private
                </span>
              )}
            </div>
          </aside>
        </div>
      </motion.div>
    </motion.div>
  );
}
