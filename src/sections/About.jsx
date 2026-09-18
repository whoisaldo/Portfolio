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
import { operator } from "../data/life";
// The same normalised marks the Experience cards use: trimmed to the logo and
// keyed to transparency by `npm run logos`, so one CSS height gives three
// logos of equal optical weight with no plate behind them.
import awsLogo from "../assets/PreviousExperience/awslogosvg.norm.png";
import philipsLogo from "../assets/PreviousExperience/PhilipsLogo.norm.png";
import pinnatecLogo from "../assets/PreviousExperience/PinnatecAuto.norm.png";
import Panel from "../components/ui/Panel";
import Picture from "../components/Picture";
import Glitch from "../components/ui/Glitch";

// Three of the six organisations in experience.js, the ones Ali named. Not
// derived from that file on purpose: this is a short list he picked, not a
// filter over the work history, and writing it as a filter would mean the row
// silently grows the next time a job is added.
const AFFILIATIONS = [
  { name: "Amazon Web Services", logo: awsLogo },
  { name: "Philips Healthcare", logo: philipsLogo },
  { name: "Pinnatec Auto", logo: pinnatecLogo },
];

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

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
              something I wanted did not do what I asked, or cost too much.
            </p>

            <div className="mt-8 space-y-5 max-w-[64ch]">
              <p className="prose-dark">
                It started at 12. I scripted other people&apos;s Roblox games,
                got paid in Robux, and cashed it out through DevEx for gaming
                PC parts my family could not have bought me. The pattern has
                not changed since. In 2020 I wrote a Python bot to watch for
                GPU restocks so I could get one at MSRP, because I was 15 and
                wanted a better machine.
              </p>
              <p className="prose-dark">
                I over-engineer, and I keep the result intuitive. Whoever is
                using it should never have to know what is underneath. The $40
                iPad app I refused to buy became a Rust host with a hardware
                encoder chain and my own UDP protocol, and the person using it
                just sees a second screen.
              </p>
              <p className="prose-dark">
                Three jobs at once at the moment. Philips part-time, back on
                the team I co-opped with. Lead full stack engineer at Pinnatec
                Auto. One of three students who own the grading server on
                Pawtograder, Northeastern&apos;s open-source autograder, which
                runs in production against real submissions. This past summer I
                was an SDE intern on AWS CloudFormation in Seattle. Before
                that, six months at Philips in Cambridge, where I shipped
                zero-touch imaging for about a thousand medical-device-grade
                Windows machines with FDA-regulated Secure Boot left on the
                whole time. Many engineers had wanted that automated. Nobody
                had shipped it. Both of those open into a full write-up here.
              </p>
              <p className="prose-dark">
                I co-founded Sideband, a four-person studio in Boston that
                ships its own products and takes no client work. Six so far,
                four live. I started it because I want somewhere younger
                engineers can get mentoring for free as I get better at this.
              </p>
              <p className="prose-dark">
                Most of my work has been automating something tedious. For
                years that meant deterministic code. Frontier models handle the
                parts that never fit a fixed script, and that is the part I
                find amazing. I spend my free time on whatever people are using
                right now, looking for the piece of my routine it can take.
              </p>
              <p className="prose-dark">
                Everything on this site is checkable. Where the repository is
                public the numbers came out of the source, not the README.
                Where a claim could not be verified it was cut rather than
                softened.
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
              {/* The card says it is a character sheet, so it gets the one
                  thing a character sheet actually opens with. The frame is the
                  site's own chrome and nothing new: a chamfered 1px edge in
                  volt, the deck's scanlines over the image, and two corner
                  registration ticks.

                  The ticks sit on the two corners the chamfer does NOT cut.
                  A tick drawn over a 45° cut reads as a rendering fault; on a
                  square corner it reads as a mark. Same rule as the hero
                  portrait, and the reason both live outside their Panel:
                  clip-path removes anything an element paints past the cut. */}
              <div className="flex items-center gap-5 pb-5 border-b border-ink-line">
                <div className="tick-frame relative shrink-0">
                  <Panel
                    size="sm"
                    edge="bg-volt"
                    fill="bg-ink-raised"
                    innerClassName="relative w-20 h-20 md:w-24 md:h-24 overflow-hidden"
                  >
                    {/* The 20px LQIP, scaled up, so the frame is never an
                        empty box on a cold load. */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url("${operator.image.lqip}")` }}
                    />
                    <Picture
                      sources={operator.image}
                      alt={operator.alt}
                      sizes="96px"
                      loading="lazy"
                      className="relative w-full h-full object-cover saturate-[0.85] contrast-[1.06]"
                    />
                    <div className="deck-scanlines absolute inset-0 pointer-events-none" aria-hidden="true" />
                  </Panel>
                  <span className="tick tr" aria-hidden="true" />
                  <span className="tick bl" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <h3 className="mono-label text-volt">Operator</h3>
                  {/* The name moved up here out of the list below it. An ID
                      card that carries a face and then names the person four
                      rows further down is two cards. */}
                  <p className="mt-2 font-display uppercase font-semibold text-primary text-xl md:text-2xl leading-none tracking-tight">
                    {profile.name}
                  </p>
                </div>
              </div>

              {/* Vitals first, then the working life. The project count that
                  used to close this list has gone: it said the same thing the
                  Work section says eight times over, with pictures. */}
              <dl className="mt-6 space-y-5">
                <Row label="Age" value={profile.age} />
                <Row label="Languages" value={profile.languages.join(" · ")} />
                <Row
                  label="Occupation"
                  // The handle in volt and the job in the margin voice. Night
                  // City on the left, the résumé on the right, and neither one
                  // pretending to be the other.
                  value={
                    <>
                      <span className="text-volt">{profile.occupation.handle}</span>
                      <span className="text-dim"> · {profile.occupation.real}</span>
                    </>
                  }
                />
                <Row label="Base" value={profile.base} />
                <Row
                  label="Now"
                  value={profile.current.map((r) => r.org).join(" · ")}
                  accent
                />
                <Row
                  label="School"
                  value={`${profile.school} · ${profile.degree} · ${profile.gradYear}`}
                />
                <Row
                  label="Affiliations"
                  value={
                    <ul className="affil-list flex flex-wrap items-center gap-x-4 gap-y-2">
                      {AFFILIATIONS.map((a, i) => (
                        <li key={a.name} className="leading-none">
                          <img
                            src={a.logo}
                            alt={a.name}
                            width="60"
                            height="18"
                            loading="lazy"
                            className="affil-mark h-5 w-auto max-w-[6rem] object-contain opacity-90"
                            // Staggered here rather than with :nth-child, so
                            // the delay follows the entry and not its position
                            // in the DOM.
                            style={{ animationDelay: `${i * 2.3}s` }}
                          />
                        </li>
                      ))}
                    </ul>
                  }
                />
              </dl>

              {/* The line off a Night City job board, which is what this card
                  has been dressed as since it was written. It sits under the
                  vitals and above the two real links, because that is where a
                  merc's card puts the pitch: after what you are, before how to
                  reach you.

                  Hazard tick rather than the pinging dot in the hero. That dot
                  belongs to the one row on the site reporting something live,
                  and a second one would spend it. */}
              <p className="mt-8 flex items-center gap-3">
                <span className="hazard h-1.5 w-6 shrink-0 opacity-50" aria-hidden="true" />
                <span className="mono-ui text-volt">Will do hard job for Eddies</span>
              </p>

              <div className="mt-6 pt-6 border-t border-ink-line flex flex-wrap gap-x-6 gap-y-3">
                <a
                  href={links.studio}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 mono-ui text-muted transition-colors hover:text-volt"
                >
                  <span className="ink-underline">Sideband</span>
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

/** One field of the dossier. Label in the margin, value on the right.
 *
 *  The labels were `mono-micro text-dim`: 11px at 56% opacity, which is the
 *  preset this design reserves for index numbers and corner marks, on a word
 *  the reader has to read before the value beside it means anything. Up to
 *  `mono-label` at `text-muted`: a step larger, half again the contrast.
 *  Everything in the card moved together, because one louder label next to
 *  six quiet ones is not a hierarchy, it is a mistake. */
function Row({ label, value, accent = false }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 items-baseline">
      <dt className="mono-label text-muted">{label}</dt>
      <dd className={`text-[0.9375rem] leading-snug ${accent ? "text-volt" : "text-muted"}`}>
        {value}
      </dd>
    </div>
  );
}
