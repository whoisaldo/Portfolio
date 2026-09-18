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
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { profile, links } from "../data/profile";
import { useReturnToDoor } from "../lib/intro";
import sidebandMark from "../assets/Sideband/SidebandMark.png";

const footerLinks = [
  { label: "GitHub", href: links.github, external: true },
  { label: "LinkedIn", href: links.linkedin, external: true },
  { label: "Email", href: links.email, external: false },
];

export default function Footer() {
  const returnToDoor = useReturnToDoor();

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
          the failure mode this design is built to avoid. Both brighten with
          the kick while the track plays; see src/lib/reactive.js. */}
      <div className="hazard hazard-live h-1.5" data-reactive="" aria-hidden="true" />

      <div className="gutter py-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <a
            href={links.studio}
            target="_blank"
            rel="noreferrer"
            aria-label="Sideband"
            className="shrink-0 opacity-55 transition-opacity duration-200 hover:opacity-100"
          >
            <img
              src={sidebandMark}
              alt="Sideband"
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
          {/* The plain version. The header carries this link from lg up and
              the door carries it on arrival; the footer carries it for
              everyone else. */}
          <Link
            to="/recruiters"
            className="mono-label text-dim transition-colors duration-200 hover:text-volt"
          >
            <span className="ink-underline">Recruiters press this</span>
          </Link>
          {/* The way back to the front: the door, with both ways in offered
              again, and the full intro behind whichever one is chosen. */}
          <button
            type="button"
            onClick={() => returnToDoor()}
            className="mono-label text-dim transition-colors duration-200 hover:text-volt"
          >
            <span className="ink-underline">Back to the entrance</span>
          </button>
        </nav>
      </div>
    </motion.footer>
  );
}
