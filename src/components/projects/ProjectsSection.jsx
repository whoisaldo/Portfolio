// src/components/projects/ProjectsSection.jsx — the work section.
//
// Was a shell that picked between a scroll-pinned reel and a stacked fallback,
// and owned the modal both of them opened. All three are gone. One grid, one
// destination per card, no modal, no branch on input device.
import React from "react";
import ProjectIndex from "./ProjectIndex";
import OtherProjects from "./OtherProjects";
import { featuredProjects, otherProjects } from "../../data/projects";

export default function ProjectsSection() {
  return (
    <section id="projects" className="relative bg-ink">
      <header className="gutter pt-28 md:pt-36 pb-14">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 className="serif-display italic text-primary text-5xl md:text-7xl xl:text-8xl leading-[0.85]">
            Work
          </h2>
          <p className="font-serif text-muted text-base md:text-lg max-w-[42ch] leading-[1.6]">
            Eight things I built and shipped. Every number on these pages is
            checkable against the source.
          </p>
        </div>
        <div className="hud-rule mt-10" />
      </header>

      <ProjectIndex projects={featuredProjects} />

      <OtherProjects projects={otherProjects} startIndex={featuredProjects.length} />
    </section>
  );
}
