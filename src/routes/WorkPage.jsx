// src/routes/WorkPage.jsx — /work/:slug, one piece of work at full length.
//
// The home page has to hold eight projects and five roles at once, so every
// one of them is compressed: a project gets a card in a pinned reel, a role
// gets an accordion row. This is the other half of that trade. Here there is
// exactly one subject and the page can be as long as the material deserves.
//
// It renders two shapes from one component. A project has a repository, a
// stack and a set of screenshots; a role has a period, a metrics grid and
// sometimes a case study. What they share is the frame — the same header, the
// same rules, the same measure — because to a reader who was handed a link
// they are the same kind of page. The branches below are only where the data
// genuinely differs.
//
// The measure is capped at 68ch throughout. This page is prose in a way the
// rest of the site is not, and prose set to the full width of a 1500px viewport
// is unreadable no matter how good the typeface is.
import React, { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Github, ExternalLink } from "lucide-react";
import { findWork, neighbours, subtitleOf } from "../data/work";
import { workPhotos } from "../data/life";
import { hexToRgbTriplet } from "../lib/image";
import ProjectImage from "../components/projects/ProjectImage";
import Picture from "../components/Picture";
import { track } from "../lib/beacon";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

/** A labelled band. Label sits out in the margin; content keeps the measure. */
function Band({ label, children, className = "" }) {
  return (
    <section className={`grid gap-x-10 gap-y-4 lg:grid-cols-12 ${className}`}>
      <h2 className="mono-label text-hud-soft lg:col-span-2 lg:pt-1">{label}</h2>
      <div className="min-w-0 lg:col-span-10">{children}</div>
    </section>
  );
}

/** longDescription is authored as "\n\n"-separated paragraphs. */
function Prose({ text }) {
  return (
    <div className="space-y-5 max-w-[68ch]">
      {String(text)
        .split("\n\n")
        .filter(Boolean)
        .map((para, i) => (
          <p key={i} className="prose-dark">
            {para}
          </p>
        ))}
    </div>
  );
}

export default function WorkPage() {
  const { slug } = useParams();
  const hit = findWork(slug);

  // Every visit to a case study is its own page view, which is the whole
  // reason these have URLs: the dashboard can then say which case study a
  // recruiter actually read, not just that somebody scrolled the home page.
  useEffect(() => {
    if (hit) track("pageview", hit.entry.title);
  }, [hit, slug]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // An unknown slug is a wrong URL, not a crash. Send them to the work index
  // rather than rendering an apology.
  if (!hit) return <Navigate to="/#projects" replace />;

  const { kind, entry } = hit;
  const { prev, next } = neighbours(slug);
  const cs = entry.caseStudy;
  const photos = kind === "role" ? workPhotos[entry.company] : null;

  return (
    <div
      className="min-h-screen"
      style={{ "--accent": hexToRgbTriplet(entry.accent || "#7b45f7") }}
    >
      {/* ---- header ------------------------------------------------------- */}
      <header className="gutter pt-32 md:pt-40 pb-12 md:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 crt-grid opacity-30 pointer-events-none" aria-hidden="true" />
        <div
          className="absolute -top-32 right-[-12%] w-[38rem] h-[38rem] signal-bloom blur-3xl opacity-25 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative">
          <Link
            to={kind === "project" ? "/#projects" : "/#experience"}
            className="inline-flex items-center gap-2 mono-label text-dim hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {kind === "project" ? "All work" : "All experience"}
          </Link>

          <h1
            className="mt-8 serif-display text-primary leading-[0.92]"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
          >
            {entry.title}
          </h1>

          <p className="mt-5 mono-ui" style={{ color: "rgb(var(--accent))" }}>
            {subtitleOf(kind, entry)}
          </p>

          {/* Links live in the header rather than at the bottom: someone who
              opened this to look at the repository should not have to read a
              case study first to find it. */}
          {(entry.live || entry.github) && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {entry.live && (
                <a
                  href={entry.live}
                  target="_blank"
                  rel="noreferrer"
                  className="scan-beam-host inline-flex items-center gap-2.5 px-6 py-3 bg-signal text-ink
                             mono-ui font-bold hover:bg-signal-soft transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit
                </a>
              )}
              {entry.github && (
                <a
                  href={entry.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3 mono-ui border border-hud/40
                             text-muted hover:border-hud-soft hover:text-primary transition-colors"
                >
                  <Github className="w-4 h-4" />
                  Source
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="hud-rule" aria-hidden="true" />

      <main className="gutter py-14 md:py-20 space-y-16 md:space-y-24">
        {/* ---- the numbers ------------------------------------------------ */}
        {entry.metrics && (
          <motion.dl
            {...reveal}
            transition={{ duration: 0.6 }}
            className={`border-y border-hud/20 divide-y divide-hud/15 md:divide-y-0 md:divide-x md:divide-hud/15
                        grid grid-cols-1 sm:grid-cols-2 ${
                          entry.metrics.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"
                        }`}
          >
            {entry.metrics.map((m) => (
              <div key={m.label} className="px-0 md:px-8 first:md:pl-0 py-7 md:py-8">
                <dt className="sr-only">{m.label}</dt>
                <dd>
                  <span
                    className="serif-display block text-3xl md:text-4xl leading-none"
                    style={{ color: "rgb(var(--accent))" }}
                  >
                    {m.value}
                  </span>
                  <span className="mono-label text-dim block mt-3">{m.label}</span>
                </dd>
              </div>
            ))}
          </motion.dl>
        )}

        {/* ---- the lede --------------------------------------------------- */}
        <motion.div {...reveal} transition={{ duration: 0.6 }}>
          <Band label={kind === "project" ? "What it is" : "The role"}>
            <p className="prose-dark prose-lede max-w-[62ch]">{entry.description}</p>
          </Band>
        </motion.div>

        {/* ---- long form -------------------------------------------------- */}
        {entry.longDescription && (
          <motion.div {...reveal} transition={{ duration: 0.6 }}>
            <Band label="In detail">
              <Prose text={entry.longDescription} />
            </Band>
          </motion.div>
        )}

        {/* ---- the case study --------------------------------------------
            Only Philips carries one. It is the strongest thing on the site
            because it documents an approach that failed and why, so it is
            rendered at full length here and never summarised. */}
        {cs && (
          <motion.div {...reveal} transition={{ duration: 0.6 }} className="space-y-14">
            {cs.tagline && (
              <Band label="In short">
                <p className="prose-dark prose-lede max-w-[62ch]">{cs.tagline}</p>
              </Band>
            )}

            {cs.problem && (
              <Band label="The problem">
                <Prose text={cs.problem} />
              </Band>
            )}

            {cs.attempts && (
              <Band label="How it went">
                <ol className="space-y-5">
                  {cs.attempts.map((a, i) => (
                    <li
                      key={a.title}
                      className="border border-hud/20 bg-ink-raised/50 p-7 md:p-9"
                    >
                      <div className="flex items-center gap-4 mb-5">
                        <span className="mono-label" style={{ color: "rgb(var(--accent))" }}>
                          {a.label ?? `Attempt ${i + 1}`}
                        </span>
                        <span className="h-px flex-1 bg-hud/20" aria-hidden="true" />
                      </div>
                      <h3 className="heading-text text-primary text-lg md:text-xl mb-3.5 leading-snug">
                        {a.title}
                      </h3>
                      <p className="prose-dark max-w-[68ch]">{a.body}</p>
                    </li>
                  ))}
                </ol>
              </Band>
            )}

            {cs.deepDives && (
              <Band label="Deep dives">
                <div className="grid gap-5 lg:grid-cols-2">
                  {cs.deepDives.map((d) => (
                    <div
                      key={d.title}
                      className="border border-hud/20 bg-ink-raised/50 p-7 md:p-8"
                    >
                      <h3 className="heading-text text-primary text-lg mb-3 leading-snug">
                        {d.title}
                      </h3>
                      <p className="prose-dark text-[0.9375rem] leading-[1.7]">{d.body}</p>
                    </div>
                  ))}
                </div>
              </Band>
            )}

            {cs.pullQuote && (
              <figure className="max-w-[46ch] mx-auto py-4 text-center">
                <blockquote
                  className="serif-display italic text-primary leading-[1.15]"
                  style={{ fontSize: "clamp(1.5rem, 3.4vw, 2.5rem)" }}
                >
                  {cs.pullQuote}
                </blockquote>
              </figure>
            )}

            {cs.outcome && (
              <Band label="Outcome">
                <ul className="space-y-3 max-w-[68ch]">
                  {cs.outcome.map((o) => (
                    <li key={o} className="flex gap-4 prose-dark">
                      <span
                        className="mt-[0.7em] h-px w-5 shrink-0"
                        style={{ backgroundColor: "rgb(var(--accent))" }}
                        aria-hidden="true"
                      />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </Band>
            )}

            {cs.contributor && (
              <Band label="Also">
                <Prose text={cs.contributor} />
              </Band>
            )}
          </motion.div>
        )}

        {/* ---- highlights ------------------------------------------------- */}
        {entry.highlights && (
          <motion.div {...reveal} transition={{ duration: 0.6 }}>
            <Band label="Highlights">
              <ol className="grid gap-5 md:grid-cols-2">
                {entry.highlights.map((h, i) => (
                  <li
                    key={h.title}
                    className="border border-hud/20 bg-ink-raised/50 p-7 md:p-8"
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <span className="mono-label" style={{ color: "rgb(var(--accent))" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="h-px flex-1 bg-hud/20" aria-hidden="true" />
                    </div>
                    <h3 className="heading-text text-primary text-lg mb-3 leading-snug">
                      {h.title}
                    </h3>
                    <p className="prose-dark text-[0.9375rem] leading-[1.7]">
                      {h.description}
                    </p>
                  </li>
                ))}
              </ol>
            </Band>
          </motion.div>
        )}

        {/* ---- features --------------------------------------------------- */}
        {entry.features && (
          <motion.div {...reveal} transition={{ duration: 0.6 }}>
            <Band label="What it does">
              <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
                {entry.features.map((f) => (
                  <li key={f} className="flex gap-4 prose-dark text-[0.9375rem]">
                    <span
                      className="mt-[0.7em] h-px w-4 shrink-0"
                      style={{ backgroundColor: "rgb(var(--accent))" }}
                      aria-hidden="true"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Band>
          </motion.div>
        )}

        {/* ---- screenshots ------------------------------------------------
            Full width and stacked, not a carousel. A carousel on a detail page
            hides most of the evidence behind an interaction; this page has the
            room to simply show it. */}
        {entry.images?.length > 0 && (
          <motion.div {...reveal} transition={{ duration: 0.6 }}>
            <Band label="Screens">
              <div className="space-y-8">
                {entry.images.map((img, i) => (
                  <figure key={i}>
                    <div className="relative overflow-hidden border border-hud/20 bg-ink-raised">
                      {img?.lqip && (
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url("${img.lqip}")` }}
                        />
                      )}
                      <ProjectImage
                        image={img}
                        alt={`${entry.title} — ${entry.imageLabels?.[i] ?? `screen ${i + 1}`}`}
                        loading={i === 0 ? "eager" : "lazy"}
                        sizes="(min-width: 1024px) 78vw, 92vw"
                        className="relative w-full h-auto"
                      />
                    </div>
                    {entry.imageLabels?.[i] && (
                      <figcaption className="mt-3 mono-label text-dim">
                        {String(i + 1).padStart(2, "0")} · {entry.imageLabels[i]}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </Band>
          </motion.div>
        )}

        {/* ---- photographs ------------------------------------------------ */}
        {photos && (
          <motion.div {...reveal} transition={{ duration: 0.6 }}>
            <Band label="Photographs">
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((p) => (
                  <li key={p.caption}>
                    <div className="relative overflow-hidden border border-hud/20 bg-ink-raised">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url("${p.image.lqip}")` }}
                      />
                      <Picture
                        sources={p.image}
                        alt={p.alt}
                        loading="lazy"
                        sizes="(min-width: 1024px) 26vw, (min-width: 640px) 45vw, 90vw"
                        className="relative w-full h-auto"
                      />
                    </div>
                    <p className="mt-3 mono-label text-dim">{p.caption}</p>
                    {p.note && (
                      <p className="mt-2 prose-dark text-[0.9375rem] leading-[1.6]">{p.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Band>
          </motion.div>
        )}

        {/* ---- stack ------------------------------------------------------ */}
        {(entry.tech || entry.skills) && (
          <motion.div {...reveal} transition={{ duration: 0.6 }}>
            <Band label="Stack">
              <ul className="flex flex-wrap gap-x-3 gap-y-2">
                {(entry.tech ?? entry.skills).map((t) => (
                  <li key={t} className="mono-label text-dim border border-hud/20 px-3 py-1.5">
                    {t}
                  </li>
                ))}
              </ul>
            </Band>
          </motion.div>
        )}
      </main>

      {/* ---- next ---------------------------------------------------------- */}
      <nav
        aria-label="More work"
        className="gutter py-12 border-t border-hud/20 flex flex-wrap items-center justify-between gap-6"
      >
        {prev ? (
          <Link
            to={`/work/${prev.slug}`}
            className="group inline-flex items-center gap-3 min-w-0"
          >
            <ArrowLeft className="w-4 h-4 text-dim shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span className="min-w-0">
              <span className="mono-label text-hud block">Previous</span>
              <span className="heading-text text-muted group-hover:text-primary transition-colors truncate block">
                {prev.title}
              </span>
            </span>
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            to={`/work/${next.slug}`}
            className="group inline-flex items-center gap-3 min-w-0 text-right ml-auto"
          >
            <span className="min-w-0">
              <span className="mono-label text-hud block">Next</span>
              <span className="heading-text text-muted group-hover:text-primary transition-colors truncate block">
                {next.title}
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-dim shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <Link
            to="/#contact"
            className="group inline-flex items-center gap-2 mono-ui text-muted hover:text-primary transition-colors ml-auto"
          >
            Get in touch
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </nav>
    </div>
  );
}
