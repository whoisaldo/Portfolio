// src/sections/Footer.jsx — extracted from App.jsx.
//
// Two things did not survive the move:
//   - `v05.10.26`. The page carried a version string in three inconsistent
//     forms and nothing on the site is versioned, so it was decoration
//     pretending to be metadata.
//   - `▮ system_idle` and its pinging dot. It reported no state; the one
//     animated status dot on the page belongs to something that is actually
//     current.
//
// What is left is what a footer is for: whose site this is, and where else to
// find him. The Eternal Reverse mark stays, and now links to the studio.
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
      className="border-t border-hud/25 bg-ink"
    >
      <div className="gutter py-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <a
            href={links.studio}
            target="_blank"
            rel="noreferrer"
            aria-label="Eternal Reverse"
            className="shrink-0 opacity-60 transition-opacity duration-200 hover:opacity-100"
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
              className="mono-label text-dim transition-colors duration-200 hover:text-primary"
            >
              <span className="ink-underline">{link.label}</span>
            </a>
          ))}
        </nav>
      </div>

      {/* Analytics disclosure.
          The site records which sections were read and resolves the visiting
          network to an organisation, which is enough to be worth saying out
          loud. Stated plainly and in one sentence rather than behind a
          "privacy policy" link nobody opens, and with the opt-out that
          actually works named — src/lib/beacon.js honours GPC and DNT before
          it sends anything. */}
      <div className="gutter pb-10 -mt-2">
        <p className="telemetry max-w-[70ch] leading-relaxed">
          this site counts page views, which sections get read, and the
          organisation your network belongs to. no cookies, no names, no
          cross-site tracking. your ip is hashed, not stored. if your browser
          sends global privacy control or "do not track", none of it is
          recorded.
        </p>
      </div>
    </motion.footer>
  );
}
