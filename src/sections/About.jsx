// src/sections/About.jsx: who is writing all this.
//
// The site did not have one. Everything about Ali was distributed across a
// hero ledger, a résumé PDF and an easter-egg terminal, which meant the only
// way to get a paragraph about the person was to know that a backtick opens a
// shell. That is a good joke and a bad information architecture.
//
// Every sentence below is a synthesis of something the site already asserts
// elsewhere: the AWS and Philips roles from experience.js, the studio and the
// project count from projects.js, the degree from profile.js. Nothing here is
// a new claim, which is the standing rule in docs/PROJECT_CONTEXT.md, and it
// is worth keeping in mind when editing: an About section is the easiest place
// on a portfolio to start describing a person rather than reporting on one.
//
// The right column is a dossier card. It is the one place the Cyberpunk 2077
// character-sheet idea is taken literally, and it earns that because every
// field in it holds a real value, including the two that are counted from the
// data at render time rather than typed.
import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { profile, links } from "../data/profile";
import { featuredProjects } from "../data/projects";
import Panel from "../components/ui/Panel";
import Glitch from "../components/ui/Glitch";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

const liveCount = featuredProjects.filter((p) => p.status === "live").length;

export default function About() {
  return (
    <section id="about" className="relative bg-ink border-t border-ink-line">
      <div className="gutter pt-24 md:pt-32 pb-20 md:pb-24">
        <motion.header {...reveal} transition={{ duration: 0.6 }} className="rail-clear">
          <p className="mono-label text-volt mb-4">03 // About</p>
          <Glitch
            as="h2"
            className="font-display uppercase text-display-1 text-primary block"
          >
            About
          </Glitch>
          <div className="edge-rule mt-10" />
        </motion.header>

        {/* Capped rather than run to the gutter. The prose column is held at
            a 64ch measure, so on a 1400px canvas a right-aligned card leaves
            ~300px of dead air between the two. The block has to be narrow
            enough that the measure and the card actually meet. The cap also
            clears the section index on its own, so this one does not need
            `.rail-clear`. */}
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-14 max-w-[68rem]">
          {/* ---- the prose ------------------------------------------------ */}
          <motion.div
            {...reveal}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="lg:col-span-7 min-w-0"
          >
            <p className="prose-dark prose-lede max-w-[54ch]">
              I write systems software, iOS apps, and the web front-ends that
              sit on top of them. Most of what is on this site exists because
              something I wanted did not, or cost more than it was worth.
            </p>

            <div className="mt-8 space-y-5 max-w-[64ch]">
              <p className="prose-dark">
                Right now I am an SDE intern on AWS CloudFormation in Seattle,
                working on the Registry, the control plane behind the resource
                types CloudFormation can provision. Before that I spent six
                months as a co-op at Philips in Cambridge, shipping a zero-touch
                deployment platform for roughly a thousand medical-device-grade
                machines under FDA-regulated Secure Boot. Both of those have a
                full write-up on this site rather than a bullet point.
              </p>
              <p className="prose-dark">
                I also co-founded Eternal Reverse, a two-person studio in Boston
                that ships its own products instead of doing client work. Six so
                far, four of them live. The work runs from a Rust and SwiftUI
                display streamer to a Fabric mod with 39,000 lines of Java in
                it, which is less scattered than it sounds. It is mostly the
                same interest in what happens underneath an interface.
              </p>
              <p className="prose-dark">
                Everything claimed on this site is checkable. Where a repository
                is public, the numbers came out of the source rather than the
                README; where a claim could not be verified, it was removed
                instead of softened. There is a list of what was cut and why in
                the repo.
              </p>
            </div>
          </motion.div>

          {/* ---- the dossier card ----------------------------------------- */}
          <motion.div
            {...reveal}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="lg:col-span-5"
          >
            <Panel innerClassName="p-6 md:p-8">
              <div className="pb-5 border-b border-ink-line">
                <h3 className="mono-label text-volt">Operator</h3>
              </div>

              <dl className="mt-6 space-y-5">
                <Row label="Name" value={profile.name} />
                <Row label="Base" value={profile.base} />
                <Row
                  label="Now"
                  value={`${profile.now.org} · ${profile.now.location}`}
                  accent
                />
                <Row
                  label="School"
                  value={`${profile.school} · ${profile.degree} · ${profile.gradYear}`}
                />
                <Row
                  label="Shipped"
                  // Counted, not typed. A number on a page that a human keeps
                  // in sync is a number that eventually stops being true.
                  value={`${featuredProjects.length} projects · ${liveCount} live`}
                />
              </dl>

              <div className="mt-8 pt-6 border-t border-ink-line flex flex-wrap gap-x-6 gap-y-3">
                <a
                  href={links.studio}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 mono-ui text-muted transition-colors hover:text-volt"
                >
                  <span className="ink-underline">Eternal Reverse</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-faint transition-all group-hover:text-volt group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
                <a
                  href={links.github}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 mono-ui text-muted transition-colors hover:text-volt"
                >
                  <span className="ink-underline">GitHub</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-faint transition-all group-hover:text-volt group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>
            </Panel>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** One field of the dossier. Label in the margin, value on the right. */
function Row({ label, value, accent = false }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 items-baseline">
      <dt className="mono-micro text-dim">{label}</dt>
      <dd className={`text-[0.9375rem] leading-snug ${accent ? "text-volt" : "text-muted"}`}>
        {value}
      </dd>
    </div>
  );
}
