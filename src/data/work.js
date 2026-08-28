// src/data/work.js — one address space for everything that has a detail page.
//
// Projects and roles are stored separately because they are different shapes:
// a project has a repository and a set of screenshots, a role has a period, a
// company and a metrics grid. But a reader does not care about that
// distinction, and neither does a URL — /work/philips-zero-touch and
// /work/eternal-exchange are the same kind of thing to whoever was sent one.
//
// So this module does exactly two jobs: give every entry a stable slug, and
// resolve a slug back to its record and kind. It owns no content. Editing copy
// still means editing projects.js or experience.js.
import { featuredProjects } from "./projects";
import { experiences } from "./experience";

/** Roles worth a page of their own. */
// Education has no narrative beyond what the accordion already shows, and the
// two early IT roles are four bullets each — a dedicated page for either would
// be a heading, a paragraph and a lot of whitespace. They stay in the
// accordion, which is the right size for them.
const ROLE_SLUGS = new Set([
  "aws-cloudformation",
  "philips-zero-touch",
  "top-choice-realty",
]);

export const workRoles = experiences.filter(
  (e) => e.slug && ROLE_SLUGS.has(e.slug),
);

/** slug -> { kind: "project" | "role", entry } */
const index = new Map();
for (const p of featuredProjects) index.set(p.slug, { kind: "project", entry: p });
for (const r of workRoles) index.set(r.slug, { kind: "role", entry: r });

export function findWork(slug) {
  return index.get(slug) ?? null;
}

export function hasWorkPage(slug) {
  return index.has(slug);
}

/** Every slug with a page, for prefetch hints and for the sitemap. */
export const workSlugs = [...index.keys()];

/**
 * Previous/next within the same kind, so the footer of a case study offers
 * another case study rather than dumping you into an unrelated project.
 */
export function neighbours(slug) {
  const hit = index.get(slug);
  if (!hit) return { prev: null, next: null };
  const list = hit.kind === "project" ? featuredProjects : workRoles;
  const i = list.findIndex((x) => x.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i < list.length - 1 ? list[i + 1] : null,
  };
}

/** The one-line subtitle a card or a page header shows under the title. */
export function subtitleOf(kind, entry) {
  return kind === "project"
    ? entry.tagline
    : `${entry.company} · ${entry.period}`;
}
