// src/routes/recruiters-shared.jsx: the pieces the two plain pages share.
//
// The plain version of the site (/recruiters and /recruiters/work/:slug) is
// a light, single-column, conventional portfolio: a top bar, headings, lists,
// links. It shares the DATA with the cinematic site and shares no component
// with it, because every component over there carries chamfers, decode
// effects, blips or reactive variables, and this page's whole promise is
// that it carries none of that. The few things both plain pages need live
// here: the bar, the footer, the section frame, a chip. The hook and the
// constants they use are in recruiters-lib.js.
//
// Light on purpose. The cinematic is black by design; a recruiter opening
// this in a browser tab next to a job description expects a document, and a
// document is dark text on a pale ground. The palette is three greys and the
// site's yellow used once, as a rule under the bar, so the two versions are
// recognisably the same person's.
import React from "react";
import { Link } from "react-router-dom";
import { profile, links } from "../data/profile";
import { NAV, pdf } from "./recruiters-lib";

export function PlainBar({ home = false }) {
  return (
    <header className="rp-bar">
      <div className="rp-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
        <Link to="/recruiters" className="font-semibold text-[1.0625rem] tracking-tight rp-ink">
          {profile.name}
        </Link>
        <nav aria-label="Sections" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
          {home &&
            NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="rp-link">
                {n.label}
              </a>
            ))}
          <a href={pdf} download="Ali_Younes_Resume.pdf" className="rp-button">
            Download résumé
          </a>
        </nav>
      </div>
    </header>
  );
}

export function PlainFooter() {
  return (
    <footer className="rp-wrap border-t rp-rule mt-20 py-10 text-[0.9375rem] rp-muted">
      <p>
        This is the plain version of <a className="rp-link" href="https://aliyounes.dev/">aliyounes.dev</a>. It reads the same data as the full site, so the two never disagree.
      </p>
      <p className="mt-3">
        <Link to="/" className="rp-link font-medium">Open the full cinematic experience</Link>
        <span aria-hidden="true"> · </span>
        <a className="rp-link" href={links.github} target="_blank" rel="noreferrer">GitHub</a>
        <span aria-hidden="true"> · </span>
        <a className="rp-link" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
      </p>
      <p className="mt-6 text-[0.8125rem]">{profile.name} · {new Date().getFullYear()}</p>
    </footer>
  );
}

/** A section with a small heading and a rule. */
export function PlainSection({ id, title, children, aside }) {
  return (
    <section id={id} className="rp-section">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b rp-rule pb-3">
        <h2 className="text-[1.375rem] font-semibold tracking-tight rp-ink">{title}</h2>
        {aside && <p className="text-[0.875rem] rp-muted">{aside}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Chip({ children }) {
  return <li className="rp-chip">{children}</li>;
}

