// Recruiter detail pages retain the complete source descriptions and case studies.
import React, { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, Github } from "lucide-react";
import { findWork, neighbours, subtitleOf, RENAMED_SLUGS } from "../data/work";
import { profile } from "../data/profile";
import ProjectImage from "../components/projects/ProjectImage";
import { PlainBar, PlainFooter, Chip } from "./recruiters-shared";
import {
  usePlainDocument,
  projectLabels,
  roleHeadings,
  statusLabel,
} from "./recruiters-lib";
import { track } from "../lib/beacon";

function Paragraphs({ text, className = "" }) {
  return (
    <div
      className={`space-y-4 max-w-[68ch] text-[1rem] leading-[1.65] ${className}`}
    >
      {String(text)
        .split("\n\n")
        .filter(Boolean)
        .map((para, i) => (
          <p key={i}>{para}</p>
        ))}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="rp-detail-block">
      <h2>{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function RecruiterWork() {
  const { slug } = useParams();
  const hit = findWork(slug);
  const title = hit ? `${hit.entry.title} · ${profile.name}` : profile.name;
  const theme = usePlainDocument(title);

  useEffect(() => {
    if (hit) track("pageview", `${hit.entry.title} (plain)`);
  }, [hit, slug]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!hit && RENAMED_SLUGS[slug])
    return <Navigate to={`/recruiters/work/${RENAMED_SLUGS[slug]}`} replace />;
  if (!hit) return <Navigate to="/recruiters#projects" replace />;

  const { kind, entry } = hit;
  const { prev, next } = neighbours(slug);
  // A role's `title` is the job title, which says nothing as a link.
  const labelOf = (x) => (kind === "project" ? x.title : x.company);
  const cs = entry.caseStudy;
  const back =
    kind === "project" ? "/recruiters#projects" : "/recruiters#experience";
  const gallery = (entry.images ?? [])
    .map((image, index) => ({ image, index }))
    .filter(({ index }) => kind !== "project" || index > 1);

  return (
    <div className="rp min-h-screen" data-rp-theme={theme}>
      <PlainBar />

      <main
        id="main-content"
        className="rp-wrap rp-detail space-y-12"
        tabIndex={-1}
      >
        <header className="rp-detail-header">
          <Link to={back} className="rp-text-link">
            <ArrowLeft size={16} aria-hidden="true" />
            {kind === "project" ? "All projects" : "All experience"}
          </Link>
          <div className="rp-detail-heading">
            {entry.logo && (
              <div className={`rp-company-logo rp-company-logo-${entry.slug}`}>
                <img src={entry.logo} alt="" width="64" height="64" />
              </div>
            )}
            <div>
              <p className="rp-eyebrow">
                {kind === "project"
                  ? (projectLabels[entry.slug] ?? "Independent project")
                  : `${entry.company} / ${cs ? "Engineering case study" : "Experience"}`}
                {entry.status && ` · ${statusLabel(entry.status)}`}
              </p>
              <h1>
                {kind === "project"
                  ? entry.title
                  : (roleHeadings[entry.slug] ?? entry.company)}
              </h1>
              <p className="rp-detail-subtitle">
                {kind === "project"
                  ? subtitleOf(kind, entry)
                  : `${entry.title} · ${entry.period}`}
              </p>
              {(entry.live || entry.github) && (
                <div className="rp-detail-actions">
                  {entry.live && (
                    <a
                      className="rp-text-link"
                      href={entry.live}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit live site
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  )}
                  {entry.github && (
                    <a
                      className="rp-text-link"
                      href={entry.github}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Github size={16} aria-hidden="true" />
                      View source
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {entry.metrics && (
          <dl className="rp-detail-metrics">
            {entry.metrics.map((m) => (
              <div key={m.label}>
                <dt className="text-[0.8125rem] rp-muted">{m.label}</dt>
                <dd className="mt-0.5 text-[1.5rem] font-semibold tracking-tight rp-ink leading-none">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {kind === "project" && entry.images?.length > 0 && (
          <figure className="rp-detail-screen">
            <ProjectImage
              image={entry.images[1] ?? entry.images[0]}
              alt={`${entry.title}, ${entry.imageLabels?.[1] ?? "product preview"}`}
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1200px) 1120px, 94vw"
              className="block w-full h-auto"
            />
          </figure>
        )}

        <Block title={kind === "project" ? "Why I built it" : "The role"}>
          {entry.why && (
            <p className="text-[1.125rem] leading-[1.55] max-w-[62ch] rp-ink">
              {entry.why}
            </p>
          )}
          <p
            className={`text-[1rem] leading-[1.65] max-w-[68ch] ${entry.why ? "mt-4" : ""}`}
          >
            {entry.description}
          </p>
        </Block>

        {entry.longDescription && (
          <Block title="In detail">
            <Paragraphs text={entry.longDescription} />
          </Block>
        )}

        {cs && (
          <>
            {cs.tagline && (
              <Block title="The brief">
                <p className="text-[1.125rem] leading-[1.55] max-w-[62ch] rp-ink">
                  {cs.tagline}
                </p>
              </Block>
            )}
            {cs.problem && (
              <Block title="The problem">
                <Paragraphs text={cs.problem} />
              </Block>
            )}
            {cs.attempts && (
              <Block title="How it went">
                <ol className="space-y-6">
                  {cs.attempts.map((a, i) => (
                    <li
                      key={a.title}
                      className="border-l-2 rp-rule-strong pl-5"
                    >
                      <p className="text-[0.8125rem] font-semibold uppercase tracking-wide rp-muted">
                        {a.label ?? `Attempt ${i + 1}`}
                      </p>
                      <h3 className="mt-1 text-[1.125rem] font-semibold tracking-tight rp-ink">
                        {a.title}
                      </h3>
                      <p className="mt-2 text-[1rem] leading-[1.65] max-w-[68ch]">
                        {a.body}
                      </p>
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
                      <h3 className="text-[1.0625rem] font-semibold tracking-tight rp-ink">
                        {d.title}
                      </h3>
                      <p className="mt-2 text-[0.9375rem] leading-[1.6]">
                        {d.body}
                      </p>
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
                  {cs.outcome.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </Block>
            )}
            {cs.contributor && (
              <Block title="Also">
                <Paragraphs text={cs.contributor} />
              </Block>
            )}
          </>
        )}

        {entry.highlights && (
          <Block title="Highlights">
            <ol className="space-y-4 max-w-[68ch]">
              {entry.highlights.map((h) => (
                <li key={h.title}>
                  <h3 className="text-[1.0625rem] font-semibold tracking-tight rp-ink">
                    {h.title}
                  </h3>
                  <p className="mt-1 text-[0.9375rem] leading-[1.6]">
                    {h.description}
                  </p>
                </li>
              ))}
            </ol>
          </Block>
        )}

        {entry.features && (
          <Block title="What it does">
            <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 text-[0.9375rem] leading-[1.55] rp-bullets">
              {entry.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Block>
        )}

        {entry.coursework && (
          <Block title="Coursework">
            <ul className="flex flex-wrap gap-1.5">
              {entry.coursework.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </ul>
          </Block>
        )}

        {gallery.length > 0 && (
          <Block title="Project gallery">
            <div className="space-y-6">
              {gallery.map(({ image: img, index: i }) => (
                <figure key={i}>
                  <div className="rp-detail-screen">
                    <ProjectImage
                      image={img}
                      alt={`${entry.title}, ${entry.imageLabels?.[i] ?? `screen ${i + 1}`}`}
                      loading="lazy"
                      sizes="(min-width: 1024px) 52rem, 92vw"
                      className="block w-full h-auto"
                    />
                  </div>
                  {entry.imageLabels?.[i] && (
                    <figcaption className="mt-2 text-[0.8125rem] rp-muted">
                      {entry.imageLabels[i]}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </Block>
        )}

        {(entry.tech || entry.skills) && (
          <Block title="Stack">
            <ul className="flex flex-wrap gap-1.5">
              {(entry.tech ?? entry.skills).map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </ul>
          </Block>
        )}

        <nav aria-label="More work" className="rp-detail-pagination">
          {prev ? (
            <Link to={`/recruiters/work/${prev.slug}`}>
              <ArrowLeft size={17} aria-hidden="true" />
              {labelOf(prev)}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/recruiters/work/${next.slug}`}>
              {labelOf(next)}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/recruiters#contact">
              Get in touch
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          )}
        </nav>
      </main>

      <PlainFooter />
    </div>
  );
}
