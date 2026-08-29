// src/sections/Footer.jsx: extracted from App.jsx.
//
// Two things did not survive that move and have not come back:
//   - `v05.10.26`. The page carried a version string in three inconsistent
//     forms and nothing on the site is versioned, so it was decoration
//     pretending to be metadata.
//   - `▮ system_idle` and its pinging dot. It reported no state.
//
// Both are exactly the sort of thing a cyberpunk theme wants to reinstate.
// Neither did. What is left is what a footer is for: whose site this is, and
// where else to find him.
import React from "react";
import { motion } from "framer-motion";
import { profile, links } from "../data/profile";
import eternalReverseMark from "../assets/EternalReverse/EternalReverseMiniLogo.png";

const footerLinks = [
  { label: "GitHub", href: links.github, external: true },
  { label: "LinkedIn", href: links.linkedin, external: true },
  { label: "Email", href: links.email, external: false },
];

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="border-t border-ink-line bg-ink"
    >
      {/* One of the two hazard strips on the site. The other closes the Work
          section. Two is the budget. A page striped in yellow everywhere is
          the failure mode this design is built to avoid. */}
      <div className="hazard h-1.5 opacity-25" aria-hidden="true" />

      <div className="gutter py-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <a
            href={links.studio}
            target="_blank"
            rel="noreferrer"
            aria-label="Eternal Reverse"
            className="shrink-0 opacity-55 transition-opacity duration-200 hover:opacity-100"
          >
            <img
              src={eternalReverseMark}
              alt="Eternal Reverse"
              width={50}
              height={32}
              loading="lazy"
              decoding="async"
              className="h-8 w-auto"
            />
          </a>
          <p className="mono-label text-dim">
            {profile.name} · {new Date().getFullYear()}
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noreferrer" }
                : null)}
              className="mono-label text-dim transition-colors duration-200 hover:text-volt"
            >
              <span className="ink-underline">{link.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </motion.footer>
  );
}
