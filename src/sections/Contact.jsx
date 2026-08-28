// src/sections/Contact.jsx — the contact section, with the résumé folded in.
//
// This was two sections in App.jsx: a `#resume` block whose entire content was
// one PDF behind a section heading, a Roman numeral and a kicker, followed by a
// `#contact` block with the same header formula again. Two headings for two
// links is a table of contents for a table of contents, so the résumé is now
// simply one of the ways to get at him.
//
// Section device: no display heading at all. The heading is a small mono label
// sitting out in the left margin, and the largest type on the screen is the
// primary email address itself — the content is the headline. Projects opens
// with a big word plus a sentence, experience opens with mono meta beside a
// sentence; this one opens with the thing you came for.
//
// The three addresses are separated by size and weight rather than by a badge
// or a pinging dot: the one you should use is set six times larger than the two
// you probably should not.
import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Download } from "lucide-react";
import { emails, links, profile } from "../data/profile";
import Panel from "../components/ui/Panel";
import Glitch from "../components/ui/Glitch";

const pdf = (import.meta.env.BASE_URL || "/") + "resume.pdf";

const primary = emails.find((e) => e.primary) ?? emails[0];
const secondary = emails.filter((e) => e !== primary);

const SECONDARY_LABELS = {
  personal: "Personal",
  studio: "Studio",
  school: "University",
};

const elsewhere = [
  { label: "GitHub", href: links.github },
  { label: "LinkedIn", href: links.linkedin },
  { label: "Eternal Reverse", href: links.studio },
];

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

export default function Contact() {
  return (
    <section id="contact" className="relative bg-ink border-t border-ink-line">
      <div className="gutter pt-24 md:pt-32 pb-24 md:pb-32">
        {/* ---- the address, at headline size ------------------------------ */}
        <motion.div
          {...reveal}
          transition={{ duration: 0.7 }}
          className="grid gap-x-10 gap-y-6 lg:grid-cols-12 rail-clear"
        >
          <div className="lg:col-span-2 lg:pt-3">
            <p className="mono-label text-volt mb-3">06</p>
            <Glitch as="h2" className="mono-label text-primary block">
              Contact
            </Glitch>
          </div>

          <div className="min-w-0 lg:col-span-10">
            <a
              href={`mailto:${primary.value}`}
              className="group inline-block max-w-full"
            >
              <span className="font-display uppercase font-semibold text-primary text-xl sm:text-3xl lg:text-4xl xl:text-5xl leading-[1.05] tracking-tight break-words transition-colors duration-200 group-hover:text-volt">
                <span className="ink-underline">{primary.value}</span>
              </span>
            </a>

            <p className="prose-dark mt-7 max-w-[54ch]">
              Best place to reach me. Based in {profile.base}; in{" "}
              {profile.now.location} through the {profile.now.org} internship.
            </p>
          </div>
        </motion.div>

        {/* ---- everything else, in three unequal columns ------------------- */}
        <motion.div
          {...reveal}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="grid gap-x-10 gap-y-12 border-t border-ink-line mt-16 md:mt-20 pt-12 lg:grid-cols-12 rail-clear"
        >
          {/* 5 / 4 / 3 at every breakpoint — equal thirds would put the
              section back in the middle of the page it is trying to get out of. */}
          <div className="lg:col-span-5">
            <h3 className="mono-label text-volt">Other addresses</h3>
            <ul className="mt-6 space-y-5">
              {secondary.map((email) => (
                <li key={email.key}>
                  <p className="mono-label text-faint mb-1.5">
                    {SECONDARY_LABELS[email.key] ?? email.key}
                  </p>
                  <a
                    href={`mailto:${email.value}`}
                    className="mono-ui normal-case text-muted break-all transition-colors duration-200 hover:text-volt"
                  >
                    <span className="ink-underline">{email.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h3 className="mono-label text-volt">Résumé</h3>
            <p className="prose-dark mt-6 max-w-[38ch]">
              Kept current with the AWS role.
            </p>
            <Panel
              as="a"
              size="sm"
              href={pdf}
              download="Ali_Younes_Resume.pdf"
              edge="bg-volt hover:bg-volt-deep transition-colors duration-200"
              fill="bg-volt"
              className="scan-beam-host mt-7 inline-block"
              innerClassName="inline-flex items-center gap-3 px-6 py-3 mono-ui font-bold text-ink"
            >
              <Download className="w-3.5 h-3.5" />
              Download résumé
            </Panel>
          </div>

          <div className="lg:col-span-3">
            <h3 className="mono-label text-volt">Elsewhere</h3>
            <ul className="mt-6 space-y-4">
              {elsewhere.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2.5 mono-ui text-muted transition-colors duration-200 hover:text-volt"
                  >
                    <span className="ink-underline">{link.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-faint transition-all duration-200 group-hover:text-volt group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
