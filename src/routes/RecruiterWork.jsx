// src/routes/RecruiterWork.jsx: one piece of work, plainly.
//
// /recruiters/work/:slug. The same record WorkPage.jsx renders under the
// cinematic shell (a project from projects.js or a role from experience.js,
// resolved by src/data/work.js), set as a document: title, links, the
// numbers, the writing, the screens. The Philips case study, which is the
// strongest content on the site, reads here at full length in a serif-free
// column with nothing moving around it.
import React, { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { findWork, neighbours, subtitleOf, RENAMED_SLUGS } from "../data/work";
import { profile } from "../data/profile";
import ProjectImage from "../components/projects/ProjectImage";
import { PlainBar, PlainFooter, Chip } from "./recruiters-shared";
import { usePlainDocument } from "./recruiters-lib";
import { track } from "../lib/beacon";

function Paragraphs({ text, className = "" }) {
  return (
    <div className={`space-y-4 max-w-[68ch] text-[1rem] leading-[1.65] ${className}`}>
      {String(text).split("\n\n").filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="grid gap-x-8 gap-y-3 md:grid-cols-[11rem_minmax(0,1fr)]">
      <h2 className="text-[0.875rem] font-semibold uppercase tracking-wide rp-muted md:pt-1">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function RecruiterWork() {
  const { slug } = useParams();
  const hit = findWork(slug);
  const title = hit ? `${hit.entry.title} · ${profile.name}` : profile.name;
  usePlainDocument(title);

  useEffect(() => {
    if (hit) track("pageview", `${hit.entry.title} (plain)`);
  }, [hit, slug]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!hit && RENAMED_SLUGS[slug]) return <Navigate to={`/recruiters/work/${RENAMED_SLUGS[slug]}`} replace />;
  if (!hit) return <Navigate to="/recruiters#projects" replace />;

  const { kind, entry } = hit;
  const { prev, next } = neighbours(slug);
  const cs = entry.caseStudy;
  const back = kind === "project" ? "/recruiters#projects" : "/recruiters#experience";

  return (
    <div className="rp min-h-screen">
      <PlainBar />

      <main className="rp-wrap pt-10 md:pt-14 space-y-12">
        <header>
          <Link to={back} className="rp-link text-[0.9375rem]">
            ← {kind === "project" ? "All projects" : "All experience"}
          </Link>
          <h1 className="mt-5 text-[2rem] md:text-[2.5rem] font-semibold tracking-tight leading-[1.05] rp-ink">{entry.title}</h1>
          <p className="mt-2 text-[1rem] rp-muted">{subtitleOf(kind, entry)}</p>
          {(entry.live || entry.github) && (
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.9375rem]">
              {entry.live && <a className="rp-link font-medium" href={entry.live} target="_blank" rel="noreferrer">Live site</a>}
              {entry.github && <a className="rp-link" href={entry.github} target="_blank" rel="noreferrer">Source</a>}
            </p>
          )}
        </header>

        {entry.metrics && (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 border-y rp-rule py-5">
            {entry.metrics.map((m) => (
              <div key={m.label}>
                <dt className="text-[0.8125rem] rp-muted">{m.label}</dt>
                <dd className="mt-0.5 text-[1.5rem] font-semibold tracking-tight rp-ink leading-none">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <Block title={kind === "project" ? "Why it exists" : "The role"}>
          {entry.why && <p className="text-[1.125rem] leading-[1.55] max-w-[62ch] rp-ink">{entry.why}</p>}
          <p className={`text-[1rem] leading-[1.65] max-w-[68ch] ${entry.why ? "mt-4" : ""}`}>{entry.description}</p>
        </Block>

        {entry.longDescription && (
          <Block title="In detail"><Paragraphs text={entry.longDescription} /></Block>
        )}

        {cs && (
          <>
            {cs.tagline && <Block title="In short"><p className="text-[1.125rem] leading-[1.55] max-w-[62ch] rp-ink">{cs.tagline}</p></Block>}
            {cs.problem && <Block title="The problem"><Paragraphs text={cs.problem} /></Block>}
            {cs.attempts && (
              <Block title="How it went">
                <ol className="space-y-6">
                  {cs.attempts.map((a, i) => (
                    <li key={a.title} className="border-l-2 rp-rule-strong pl-5">
                      <p className="text-[0.8125rem] font-semibold uppercase tracking-wide rp-muted">{a.label ?? `Attempt ${i + 1}`}</p>
                      <h3 className="mt-1 text-[1.125rem] font-semibold tracking-tight rp-ink">{a.title}</h3>
                      <p className="mt-2 text-[1rem] leading-[1.65] max-w-[68ch]">{a.body}</p>
                    </li>
                  ))}
                </ol>
              </Block>
            )}
            {cs.deepDives && (
              <Block title="Deep dives">
                <div className="grid gap-6 md:grid-cols-2">
                  {cs.deepDives.map((d) => (
                    <div key={d.title}>
                      <h3 className="text-[1.0625rem] font-semibold tracking-tight rp-ink">{d.title}</h3>
                      <p className="mt-2 text-[0.9375rem] leading-[1.6]">{d.body}</p>
                    </div>
                  ))}
                </div>
              </Block>
            )}
            {cs.pullQuote && (
              <blockquote className="max-w-[48ch] mx-auto text-center text-[1.375rem] font-semibold tracking-tight leading-[1.25] rp-ink">
                {cs.pullQuote}
              </blockquote>
            )}
            {cs.outcome && (
              <Block title="Outcome">
                <ul className="space-y-2 text-[1rem] leading-[1.6] max-w-[68ch] rp-bullets">
                  {cs.outcome.map((o) => <li key={o}>{o}</li>)}
                </ul>
              </Block>
            )}
            {cs.contributor && <Block title="Also"><Paragraphs text={cs.contributor} /></Block>}
          </>
        )}

        {entry.highlights && (
          <Block title="Highlights">
            <ol className="space-y-4 max-w-[68ch]">
              {entry.highlights.map((h) => (
                <li key={h.title}>
                  <h3 className="text-[1.0625rem] font-semibold tracking-tight rp-ink">{h.title}</h3>
                  <p className="mt-1 text-[0.9375rem] leading-[1.6]">{h.description}</p>
                </li>
              ))}
            </ol>
          </Block>
        )}

        {entry.features && (
          <Block title="What it does">
            <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 text-[0.9375rem] leading-[1.55] rp-bullets">
              {entry.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </Block>
        )}

        {entry.coursework && (
          <Block title="Coursework">
            <ul className="flex flex-wrap gap-1.5">{entry.coursework.map((c) => <Chip key={c}>{c}</Chip>)}</ul>
          </Block>
        )}

        {entry.images?.length > 0 && (
          <Block title="Screens">
            <div className="space-y-6">
              {entry.images.map((img, i) => (
                <figure key={i}>
                  <div className="border rp-rule bg-white overflow-hidden">
                    <ProjectImage
                      image={img}
                      alt={`${entry.title}, ${entry.imageLabels?.[i] ?? `screen ${i + 1}`}`}
                      loading={i === 0 ? "eager" : "lazy"}
                      sizes="(min-width: 1024px) 52rem, 92vw"
                      className="block w-full h-auto"
                    />
                  </div>
                  {entry.imageLabels?.[i] && <figcaption className="mt-2 text-[0.8125rem] rp-muted">{entry.imageLabels[i]}</figcaption>}
                </figure>
              ))}
            </div>
          </Block>
        )}

        {(entry.tech || entry.skills) && (
          <Block title="Stack">
            <ul className="flex flex-wrap gap-1.5">{(entry.tech ?? entry.skills).map((t) => <Chip key={t}>{t}</Chip>)}</ul>
          </Block>
        )}

        <nav aria-label="More" className="flex flex-wrap items-center justify-between gap-6 border-t rp-rule pt-8 text-[0.9375rem]">
          {prev ? <Link to={`/recruiters/work/${prev.slug}`} className="rp-link">← {prev.title}</Link> : <span />}
          {next ? <Link to={`/recruiters/work/${next.slug}`} className="rp-link ml-auto">{next.title} →</Link> : <Link to="/recruiters#contact" className="rp-link ml-auto">Get in touch →</Link>}
        </nav>
      </main>

      <PlainFooter />
    </div>
  );
}
