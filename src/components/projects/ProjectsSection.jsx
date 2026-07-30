// src/components/projects/ProjectsSection.jsx — shell for the projects section.
//
// Owns the modal state and picks exactly one of the reel or the stack. It
// mounts one, not both: the old build kept the pinned tree and the stacked
// tree in the DOM simultaneously and hid one with `lg:hidden`.
import React, { useState, lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import ProjectReel from "./ProjectReel";
import ProjectStack from "./ProjectStack";
import OtherProjects from "./OtherProjects";
import { featuredProjects, otherProjects } from "../../data/projects";
import { useCanPin } from "../../hooks";

const ProjectModal = lazy(() => import("./ProjectModal"));

export default function ProjectsSection() {
  const canPin = useCanPin();
  const [openIndex, setOpenIndex] = useState(null);
  const open = openIndex === null ? null : featuredProjects[openIndex];

  return (
    <section id="projects" className="relative bg-ink">
      {/* Section opener. Each section on the page uses a different device --
          this one is a wide rule with the count sitting on it. */}
      <header className="gutter pt-28 md:pt-36 pb-14">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 className="serif-display italic text-primary text-5xl md:text-7xl xl:text-8xl leading-[0.85]">
            Work
          </h2>
          <p className="font-serif text-muted text-base md:text-lg max-w-[42ch] leading-[1.6]">
            Eight things I built and shipped. Every number on these cards is
            checkable against the source.
          </p>
        </div>
        <div className="hud-rule mt-10" />
      </header>

      {canPin ? (
        <>
          <a
            href="#experience"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:left-6 focus:top-6 focus:px-4 focus:py-2 focus:bg-signal focus:text-ink mono-label"
          >
            Skip the project reel
          </a>
          <ProjectReel projects={featuredProjects} onOpen={setOpenIndex} />
        </>
      ) : (
        <ProjectStack projects={featuredProjects} onOpen={setOpenIndex} />
      )}

      <OtherProjects projects={otherProjects} startIndex={featuredProjects.length} />

      <AnimatePresence>
        {open && (
          <Suspense fallback={null}>
            <ProjectModal project={open} onClose={() => setOpenIndex(null)} />
          </Suspense>
        )}
      </AnimatePresence>
    </section>
  );
}
