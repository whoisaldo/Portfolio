// src/front/WorkPage.jsx: /work/:slug, one project or one role on a page of
// its own.
//
// The homepage gives each of them a line or two. This is where a reader who
// wants more goes, and it used to be the playground's: a link from here or
// from a post landed on the door and a city loading, not on something to
// read. Now it is set like a post, in the same column and type, and carries
// everything the playground's page did.
//
// Its own chunk, like BlogPost, because experience.js is mostly case-study
// prose and the homepage would otherwise download all of it. It owns no
// words: projects.js and experience.js do, and src/data/work.js gives every
// entry its address. A section with nothing to show is left out, so a short
// entry makes a short page.
import React, { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { profile } from "../data/profile";
import { findWork, nameOf, neighbours, RENAMED_SLUGS } from "../data/work";
import { workPhotos } from "../data/life";
import Picture from "../components/Picture";
import ProjectImage from "../components/projects/ProjectImage";
import { COLUMN, useTitle } from "./lib";
import { BrandIcon } from "./icons";
import { FrontFooter, FrontHeader, SectionLabel } from "./parts";
import Lightbox from "./Lightbox";

const backLink = "inline-flex items-center gap-1.5 text-sm font-medium text-dim transition-colors duration-150 hover:text-volt";
const textLink = "inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-volt";

/** longDescription and a few case-study fields are "\n\n"-separated
 *  paragraphs. */
function Paragraphs({ text }) {
  return String(text)
    .split("\n\n")
    .filter(Boolean)
    .map((para, i) => (
      <p key={i} className="prose-dark text-pretty">
        {para}
      </p>
    ));
}

/** A section of the page: a label with its hairline, then the content. */
function Part({ label, children }) {
  return (
    <section className="mt-14">
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Chips({ items }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((t) => (
        <li key={t} className="chamfer chamfer-sm bg-ink-raised px-3 py-1.5 text-sm text-muted">
          {t}
        </li>
      ))}
    </ul>
  );
}

function Bullets({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="relative pl-5 prose-dark text-pretty">
          <span className="absolute left-0 top-[0.8em] size-1 rounded-full bg-volt" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Metrics({ items }) {
  return (
    <dl className={`grid grid-cols-2 gap-x-6 border-y border-ink-line ${items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
      {items.map((m) => (
        <div key={m.label} className="flex flex-col-reverse justify-end py-5">
          <dt className="mt-2 text-pretty text-sm leading-snug text-dim">{m.label}</dt>
          <dd className="font-display text-2xl font-semibold leading-none text-bone sm:text-3xl">{m.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Pressed, a picture opens full size in the homepage's viewer. */
function Zoom({ onOpen, children }) {
  return (
    <button type="button" onClick={onOpen} className="chamfer block w-full cursor-zoom-in overflow-hidden bg-ink-raised">
      {children}
    </button>
  );
}

function RoleHead({ entry }) {
  return (
    <>
      <div className="mt-8 flex items-center gap-4">
        <div className="chamfer chamfer-sm flex size-12 shrink-0 items-center justify-center bg-ink-raised p-2">
          <img src={entry.logo} alt="" className="size-full object-contain" />
        </div>
        <p className="font-medium text-muted">
          {entry.company}
          {entry.badge && <span className="ml-2 text-sm font-semibold text-volt">{entry.badge}</span>}
        </p>
      </div>
      <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-bone text-balance sm:text-4xl">
        {entry.title}
      </h1>
      <p className="mt-4 text-sm tabular-nums text-dim">
        {entry.period}
        {entry.location && ` · ${entry.location}`}
      </p>
      {entry.subtitle && <p className="mt-1.5 text-pretty text-sm text-dim">{entry.subtitle}</p>}
    </>
  );
}

function ProjectHead({ entry }) {
  return (
    <>
      <h1 className="mt-8 font-display text-3xl font-semibold leading-tight text-bone text-balance sm:text-4xl">
        {entry.title}
      </h1>
      <p className="mt-4 text-pretty text-sm text-dim">{entry.tagline}</p>
      {(entry.live || entry.github) && (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
          {entry.live && (
            <a
              href={entry.live}
              target="_blank"
              rel="noreferrer"
              className="chamfer chamfer-sm inline-flex items-center gap-2 bg-volt px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-bone"
            >
              Visit the site <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          )}
          {entry.github && (
            <a href={entry.github} target="_blank" rel="noreferrer" className={textLink}>
              <BrandIcon name="github" /> Source
            </a>
          )}
        </div>
      )}
    </>
  );
}

/** Philips's case study, in the order it is written, at full length. */
function CaseStudy({ cs }) {
  return (
    <>
      {cs.tagline && <p className="prose-lede mt-10 text-pretty">{cs.tagline}</p>}
      {cs.problem && (
        <Part label="The problem">
          <Paragraphs text={cs.problem} />
        </Part>
      )}
      {cs.attempts && (
        <Part label="How it went">
          <ol className="space-y-4">
            {cs.attempts.map((a, i) => (
              <li key={a.title} className="chamfer bg-ink-raised p-5 sm:p-6">
                <p className="text-sm font-semibold text-volt">{a.label ?? `Attempt ${i + 1}`}</p>
                <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug text-bone text-balance">{a.title}</h3>
                <p className="prose-dark mt-3 text-pretty">{a.body}</p>
              </li>
            ))}
          </ol>
        </Part>
      )}
      {cs.deepDives && (
        <Part label="Deep dives">
          {cs.deepDives.map((d) => (
            <div key={d.title}>
              <h3 className="font-display text-xl font-semibold leading-snug text-bone text-balance">{d.title}</h3>
              <p className="prose-dark mt-2 text-pretty">{d.body}</p>
            </div>
          ))}
        </Part>
      )}
      {cs.pullQuote && (
        <blockquote className="mt-14 border-l-2 border-volt pl-5 font-display text-2xl font-semibold leading-snug text-bone text-balance">
          {cs.pullQuote}
        </blockquote>
      )}
      {cs.outcome && (
        <Part label="Outcome">
          <Bullets items={cs.outcome} />
        </Part>
      )}
      {cs.contributor && (
        <Part label="Also">
          <Paragraphs text={cs.contributor} />
        </Part>
      )}
    </>
  );
}

function NotFound() {
  return (
    <>
      <FrontHeader />
      <main className={`${COLUMN} pb-24 pt-16 sm:pt-24`}>
        <h1 className="font-display text-3xl font-semibold text-bone">Nothing at this address</h1>
        <p className="prose-dark mt-4">It may have been renamed. Every project and role is on the homepage:</p>
        <Link to="/" className={`${backLink} mt-6`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Home
        </Link>
      </main>
      <FrontFooter />
    </>
  );
}

export default function WorkPage() {
  const { slug } = useParams();
  const hit = findWork(slug);
  const [shown, setShown] = useState(null);
  useTitle(hit ? `${nameOf(hit.kind, hit.entry)} · ${profile.name}` : `Not found · ${profile.name}`);

  // A renamed entry forwards to its new address; see RENAMED_SLUGS.
  if (!hit && RENAMED_SLUGS[slug]) return <Navigate to={`/work/${RENAMED_SLUGS[slug]}`} replace />;
  if (!hit) return <NotFound />;

  const { kind, entry } = hit;
  const role = kind === "role";
  const { prev, next } = neighbours(slug);
  const [keyArt, ...screens] = role ? [] : entry.images ?? [];
  const screenLabel = (i) => entry.imageLabels?.[i + 1];
  const photos = role ? workPhotos[entry.company] ?? [] : [];

  // Everything that can open full size, in page order, for the viewer to
  // step through: the key art and screens of a project, a role's photos.
  const gallery = role
    ? photos.map((p) => ({ src: p.image.src, alt: p.alt }))
    : (entry.images ?? []).map((image, i) => ({
        src: image.src,
        alt: `${entry.title}, ${entry.imageLabels?.[i] ?? `screen ${i + 1}`}`,
      }));

  return (
    <>
      <FrontHeader />
      <main className={`${COLUMN} pb-24 pt-14 sm:pt-20`}>
        <article>
          <Link to="/" className={backLink}>
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Home
          </Link>

          {role ? <RoleHead entry={entry} /> : <ProjectHead entry={entry} />}

          {keyArt && (
            <div className="mt-10">
              <Zoom onOpen={() => setShown(0)}>
                <ProjectImage
                  image={keyArt}
                  alt={gallery[0].alt}
                  loading="eager"
                  sizes="(min-width: 640px) 624px, 92vw"
                  className="block h-auto w-full"
                />
              </Zoom>
            </div>
          )}

          {entry.metrics && (
            <div className="mt-10">
              <Metrics items={entry.metrics} />
            </div>
          )}

          {entry.why && <p className="prose-lede mt-10 text-pretty">{entry.why}</p>}
          <p className={`prose-dark text-pretty ${entry.why ? "mt-5" : "mt-10"}`}>{entry.description}</p>

          {entry.longDescription && (
            <Part label="In detail">
              <Paragraphs text={entry.longDescription} />
            </Part>
          )}

          {entry.caseStudy && <CaseStudy cs={entry.caseStudy} />}

          {entry.highlights && (
            <Part label="Highlights">
              {entry.highlights.map((h) => (
                <div key={h.title}>
                  <h3 className="font-display text-xl font-semibold leading-snug text-bone text-balance">{h.title}</h3>
                  <p className="prose-dark mt-2 text-pretty">{h.description}</p>
                </div>
              ))}
            </Part>
          )}

          {entry.features && (
            <Part label="What it does">
              <Bullets items={entry.features} />
            </Part>
          )}

          {entry.coursework && (
            <Part label="Coursework">
              <Chips items={entry.coursework} />
            </Part>
          )}

          {/* Stacked at the column's width rather than a carousel: the page
              has the room to simply show them. */}
          {screens.length > 0 && (
            <Part label="Screens">
              <div className="space-y-8">
                {screens.map((image, i) => (
                  <figure key={image.src}>
                    <Zoom onOpen={() => setShown(i + 1)}>
                      <ProjectImage
                        image={image}
                        alt={gallery[i + 1].alt}
                        loading="lazy"
                        sizes="(min-width: 640px) 624px, 92vw"
                        className="block h-auto w-full"
                      />
                    </Zoom>
                    {screenLabel(i) && <figcaption className="mt-2.5 text-sm text-dim">{screenLabel(i)}</figcaption>}
                  </figure>
                ))}
              </div>
            </Part>
          )}

          {photos.length > 0 && (
            <Part label="Photos">
              <ul className="grid gap-6 sm:grid-cols-2">
                {photos.map((p, i) => (
                  <li key={p.caption}>
                    <Zoom onOpen={() => setShown(i)}>
                      <Picture
                        sources={p.image}
                        alt={p.alt}
                        loading="lazy"
                        sizes="(min-width: 640px) 300px, 92vw"
                        className="block h-auto w-full"
                      />
                    </Zoom>
                    <p className="mt-2.5 text-sm text-dim">{p.caption}</p>
                    {p.note && <p className="mt-1 text-pretty text-sm text-muted">{p.note}</p>}
                  </li>
                ))}
              </ul>
            </Part>
          )}

          {(entry.tech || entry.skills) && (
            <Part label="Stack">
              <Chips items={entry.tech ?? entry.skills} />
            </Part>
          )}
        </article>

        {/* Within the same kind, so a role leads to another role and a
            project to another project. */}
        <nav aria-label="More work" className="mt-16 grid grid-cols-2 gap-6 border-t border-ink-line pt-8">
          {prev ? (
            <Link to={`/work/${prev.slug}`} className="group min-w-0">
              <span className="flex items-center gap-1.5 text-sm text-dim">
                <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous
              </span>
              <span className="mt-1 block font-display font-semibold leading-snug text-bone text-balance transition-colors duration-150 group-hover:text-volt">
                {prev.company ?? prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/work/${next.slug}`} className="group min-w-0 text-right">
              <span className="flex items-center justify-end gap-1.5 text-sm text-dim">
                Next <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
              <span className="mt-1 block font-display font-semibold leading-snug text-bone text-balance transition-colors duration-150 group-hover:text-volt">
                {next.company ?? next.title}
              </span>
            </Link>
          ) : (
            <Link to="/" className="group min-w-0 text-right">
              <span className="flex items-center justify-end gap-1.5 text-sm text-dim">
                Back <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
              <span className="mt-1 block font-display font-semibold leading-snug text-bone transition-colors duration-150 group-hover:text-volt">
                Home
              </span>
            </Link>
          )}
        </nav>
      </main>
      <FrontFooter />
      <Lightbox photos={gallery} index={shown} onChange={setShown} onClose={() => setShown(null)} />
    </>
  );
}
