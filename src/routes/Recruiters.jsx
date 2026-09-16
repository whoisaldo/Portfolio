// src/routes/Recruiters.jsx: the plain version.
//
// /recruiters. One column, light, conventional: who, experience, projects,
// skills, education, the résumé, contact. Every fact on it is imported from
// the same files the cinematic site reads (profile.js, experience.js,
// projects.js), so editing a role or a project once changes both. Nothing on
// this page animates, plays, or asks for a click first; the intro, the door,
// the reticle and the effects are not mounted here at all (see App.jsx).
//
// The link back to the full site is in the bar's footer and at the end of
// the page, worded as what it is.
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { profile, emails, links, skills } from "../data/profile";
import { experiences } from "../data/experience";
import { featuredProjects, otherProjects } from "../data/projects";
import { hasWorkPage } from "../data/work";
import { PlainBar, PlainFooter, PlainSection, Chip } from "./recruiters-shared";
import { usePlainDocument, pdf } from "./recruiters-lib";

const work = experiences.filter((e) => e.type === "work");
const education = experiences.filter((e) => e.type === "education");
const primary = emails.find((e) => e.primary) ?? emails[0];

const EMAIL_LABELS = { school: "University", personal: "Personal", studio: "Studio" };

export default function Recruiters() {
  usePlainDocument(`${profile.name} · Software engineer · Résumé and portfolio`);

  // A detail page links back to /recruiters#experience or #projects. That
  // arrives as a client-side navigation, so the browser's own hash scroll
  // never runs; do it here, twice, because the page's height settles as
  // the fonts land. Same reason Home.jsx does it for the cinematic.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const go = () => document.getElementById(hash)?.scrollIntoView({ block: "start" });
    go();
    const t = setTimeout(go, 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rp min-h-screen">
      <PlainBar home />

      <main className="rp-wrap">
        {/* ---- who ------------------------------------------------------ */}
        <section className="pt-12 md:pt-16">
          <p className="text-[0.875rem] rp-muted">Software engineer · {profile.base}</p>
          <h1 className="mt-2 text-[2.25rem] md:text-[2.75rem] font-semibold tracking-tight leading-[1.05] rp-ink">
            {profile.name}
          </h1>
          <p className="mt-5 text-[1.125rem] leading-[1.6] max-w-[62ch]">
            Systems, iOS and web. {profile.degree} at {profile.school}, class of {profile.gradYear.replace("’", "'")}.
            Currently {profile.current.map((r, i) => (
              <span key={r.org}>
                {i > 0 && (i === profile.current.length - 1 ? " and " : ", ")}
                {r.role} at {r.org}
              </span>
            ))}. Last summer, {profile.prev.role} at {profile.prev.org} in Seattle.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem]">
            <li><a className="rp-link" href={`mailto:${primary.value}`}>{primary.value}</a></li>
            <li><a className="rp-link" href={links.github} target="_blank" rel="noreferrer">github.com/whoisaldo</a></li>
            <li><a className="rp-link" href={links.linkedin} target="_blank" rel="noreferrer">linkedin.com/in/alialdoyounes</a></li>
          </ul>
          <p className="mt-8 text-[0.9375rem] rp-muted">
            Prefer the full site? <Link to="/" className="rp-link font-medium">Open the cinematic experience</Link>. Same content, with an intro and a soundtrack.
          </p>
        </section>

        {/* ---- experience ----------------------------------------------- */}
        <PlainSection id="experience" title="Experience" aside="Most recent first">
          <ol className="space-y-10">
            {work.map((e) => (
              <li key={e.slug} className="grid gap-x-8 gap-y-2 md:grid-cols-[11rem_minmax(0,1fr)]">
                <div className="text-[0.875rem] rp-muted md:pt-1">
                  <p>{e.period}</p>
                  <p>{e.location}</p>
                </div>
                <div className="min-w-0">
                  <h3 className="text-[1.125rem] font-semibold tracking-tight rp-ink">
                    {e.title} <span className="font-normal rp-muted">· {e.company}</span>
                  </h3>
                  {e.subtitle && <p className="mt-0.5 text-[0.875rem] rp-muted">{e.subtitle}</p>}
                  <p className="mt-3 text-[0.9375rem] leading-[1.6] max-w-[68ch]">{e.description}</p>
                  {e.highlights && (
                    <ul className="mt-3 space-y-1.5 text-[0.9375rem] leading-[1.55] max-w-[68ch] rp-bullets">
                      {e.highlights.map((h) => (
                        <li key={h.title}>
                          <span className="font-medium rp-ink">{h.title}.</span> {h.description}
                        </li>
                      ))}
                    </ul>
                  )}
                  {e.metrics && (
                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.875rem] rp-muted">
                      {e.metrics.map((m) => (
                        <li key={m.label}><span className="font-semibold rp-ink">{m.value}</span> {m.label.toLowerCase()}</li>
                      ))}
                    </ul>
                  )}
                  {e.skills && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {e.skills.map((s) => <Chip key={s}>{s}</Chip>)}
                    </ul>
                  )}
                  {hasWorkPage(e.slug) && (
                    <p className="mt-3 text-[0.9375rem]">
                      <Link to={`/recruiters/work/${e.slug}`} className="rp-link font-medium">
                        {e.caseStudy ? "Read the case study" : "Full details"}
                      </Link>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </PlainSection>

        {/* ---- projects -------------------------------------------------- */}
        <PlainSection id="projects" title="Projects" aside={`${featuredProjects.length} shipped, every number checkable against the source`}>
          <ol className="grid gap-x-10 gap-y-9 md:grid-cols-2">
            {featuredProjects.map((p) => (
              <li key={p.slug} className="min-w-0">
                <h3 className="text-[1.0625rem] font-semibold tracking-tight rp-ink">
                  {p.title}
                  <span className="ml-2 font-normal text-[0.8125rem] rp-muted">
                    {p.status === "live" ? "live" : p.status}
                  </span>
                </h3>
                <p className="mt-1.5 text-[0.9375rem] leading-[1.55]">{p.description}</p>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.tech.slice(0, 6).map((t) => <Chip key={t}>{t}</Chip>)}
                </ul>
                <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]">
                  <Link to={`/recruiters/work/${p.slug}`} className="rp-link font-medium">Details</Link>
                  {p.live && <a className="rp-link" href={p.live} target="_blank" rel="noreferrer">Live site</a>}
                  {p.github ? (
                    <a className="rp-link" href={p.github} target="_blank" rel="noreferrer">Source</a>
                  ) : (
                    <span className="rp-muted">Source private</span>
                  )}
                </p>
              </li>
            ))}
          </ol>

          <h3 className="mt-12 text-[0.875rem] font-semibold uppercase tracking-wide rp-muted">Also</h3>
          <ul className="mt-3 grid gap-x-10 gap-y-2 sm:grid-cols-2 text-[0.9375rem]">
            {otherProjects.map((p) => (
              <li key={p.title}>
                <a className="rp-link font-medium" href={p.github} target="_blank" rel="noreferrer">{p.title}</a>
                <span className="rp-muted"> · {p.description}</span>
              </li>
            ))}
          </ul>
        </PlainSection>

        {/* ---- skills ---------------------------------------------------- */}
        <PlainSection id="skills" title="Skills" aside="Grouped, not ranked">
          <dl className="grid gap-x-8 gap-y-4 md:grid-cols-[11rem_minmax(0,1fr)]">
            {skills.map((g) => (
              <React.Fragment key={g.group}>
                <dt className="text-[0.9375rem] font-medium rp-ink md:pt-0.5">{g.group}</dt>
                <dd className="text-[0.9375rem] leading-[1.6]">{g.items.join(", ")}</dd>
              </React.Fragment>
            ))}
          </dl>
        </PlainSection>

        {/* ---- education ------------------------------------------------- */}
        <PlainSection id="education" title="Education">
          {education.map((e) => (
            <div key={e.slug} className="grid gap-x-8 gap-y-2 md:grid-cols-[11rem_minmax(0,1fr)]">
              <div className="text-[0.875rem] rp-muted md:pt-1">
                <p>{e.period}</p>
                <p>{e.location}</p>
              </div>
              <div>
                <h3 className="text-[1.125rem] font-semibold tracking-tight rp-ink">
                  {e.company} <span className="font-normal rp-muted">· B.S. {e.title}</span>
                </h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.6] max-w-[68ch]">{e.description}</p>
                {e.coursework && (
                  <p className="mt-3 text-[0.9375rem] rp-muted">Coursework: {e.coursework.join(", ")}.</p>
                )}
              </div>
            </div>
          ))}
        </PlainSection>

        {/* ---- résumé ---------------------------------------------------- */}
        <PlainSection id="resume" title="Résumé" aside="Rebuilt from source on every change">
          <p className="text-[0.9375rem] leading-[1.6] max-w-[68ch]">
            One page, PDF. <a href={pdf} download="Ali_Younes_Resume.pdf" className="rp-link font-medium">Download it</a> or{" "}
            <a href={pdf} target="_blank" rel="noreferrer" className="rp-link">open it in a tab</a>.
          </p>
          <div className="mt-5 hidden md:block border rp-rule bg-white">
            <iframe
              src={`${pdf}#toolbar=0&navpanes=0`}
              title="Résumé, one page"
              loading="lazy"
              className="block w-full h-[46rem]"
            />
          </div>
        </PlainSection>

        {/* ---- contact --------------------------------------------------- */}
        <PlainSection id="contact" title="Contact" aside={`Based in ${profile.base}`}>
          <dl className="grid gap-x-8 gap-y-3 md:grid-cols-[11rem_minmax(0,1fr)] text-[0.9375rem]">
            {emails.map((e) => (
              <React.Fragment key={e.key}>
                <dt className="font-medium rp-ink">{EMAIL_LABELS[e.key] ?? e.key}{e.primary ? " (best)" : ""}</dt>
                <dd><a className="rp-link break-all" href={`mailto:${e.value}`}>{e.value}</a></dd>
              </React.Fragment>
            ))}
            <dt className="font-medium rp-ink">GitHub</dt>
            <dd><a className="rp-link" href={links.github} target="_blank" rel="noreferrer">github.com/whoisaldo</a></dd>
            <dt className="font-medium rp-ink">LinkedIn</dt>
            <dd><a className="rp-link" href={links.linkedin} target="_blank" rel="noreferrer">linkedin.com/in/alialdoyounes</a></dd>
            <dt className="font-medium rp-ink">Studio</dt>
            <dd><a className="rp-link" href={links.studio} target="_blank" rel="noreferrer">sideband.studio</a></dd>
          </dl>
        </PlainSection>
      </main>

      <PlainFooter />
    </div>
  );
}
