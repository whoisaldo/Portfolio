// src/components/projects/ProjectsSection.jsx: the work section.
//
// Was a shell that picked between a scroll-pinned reel and a stacked fallback,
// and owned the modal both of them opened. Then a grid. Now a deck: one
// machine with a rail of every project down its side and a screen showing
// one at a time, which can be expanded to the viewport. See WorkDeck.jsx for
// why the rail keeps what the grid was good at.
import React from "react";
import WorkDeck from "./WorkDeck";
import OtherProjects from "./OtherProjects";
import Glitch from "../ui/Glitch";
import { featuredProjects, otherProjects } from "../../data/projects";

export default function ProjectsSection() {
  const live = featuredProjects.filter((p) => p.status === "live").length;

  return (
    <section id="projects" className="relative bg-ink">
      <header className="gutter rail-clear pt-28 md:pt-36 pb-14">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div>
            <p className="mono-label text-volt mb-4">01 // Work</p>
            <Glitch
              as="h2"
              className="font-display uppercase text-display-1 text-primary block"
            >
              Work
            </Glitch>
          </div>

          <div className="max-w-[42ch]">
            <p className="prose-dark">
              Eight things I built because what existed did not do what I
              wanted, or cost too much. Every number on these pages came out of
              the source, not the README.
            </p>

            {/* Derived from the data, not typed. If a project's status changes
                this line changes with it, which is the only way a count on a
                page stays true. */}
            <p className="mono-label text-dim mt-4">
              {String(featuredProjects.length).padStart(2, "0")} projects ·{" "}
              <span className="text-volt">{live} live</span> ·{" "}
              <span className="text-fuchsia">
                {featuredProjects.length - live} in development
              </span>
            </p>
          </div>
        </div>
        <div className="edge-rule mt-10" />
      </header>

      <WorkDeck projects={featuredProjects} />

      <OtherProjects projects={otherProjects} startIndex={featuredProjects.length} />
    </section>
  );
}
