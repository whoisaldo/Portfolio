// src/front/parts.jsx: the pieces the homepage and the blog share.
import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { profile, links } from "../data/profile";
import { PLAYGROUND } from "../data/site";
import { formatDate } from "./posts";
import { COLUMN, handle } from "./lib";
import { BrandIcon } from "./icons";

// One face for everything that is not a heading: Barlow, the body face, in
// sentence case. No spaced-out uppercase mono anywhere in this shell: it
// read as generated, and Ali asked for it gone. Code in a post is the one
// place mono stays.
const navLink = "text-sm font-medium text-dim transition-colors duration-150 hover:text-volt";

export function FrontHeader() {
  return (
    <header className={`${COLUMN} flex items-center justify-between gap-6 pt-7`}>
      <Link to="/" className="font-display font-semibold text-bone transition-colors duration-150 hover:text-volt">
        {profile.name}
      </Link>
      <nav aria-label="Main" className="flex items-center gap-5 sm:gap-7">
        <NavLink to="/blog" className={({ isActive }) => `${navLink} ${isActive ? "text-bone" : ""}`}>
          Writing
        </NavLink>
        <a href={links.x} target="_blank" rel="noreferrer" aria-label="X" className={navLink}>
          <BrandIcon name="x" className="size-3.5" />
        </a>
        <Link to={PLAYGROUND} state={{ door: true }} className="inline-flex items-center gap-1 text-sm font-medium text-volt transition-colors duration-150 hover:text-bone">
          Playground
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}

export function FrontFooter() {
  return (
    <footer className={`${COLUMN} pb-10`}>
      <div className="flex flex-col-reverse gap-4 border-t border-ink-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-dim">
          {profile.name} · {new Date().getFullYear()}
        </p>
        <nav aria-label="Footer" className="flex items-center gap-5">
          <a href={links.x} target="_blank" rel="noreferrer" aria-label="X" className={navLink}>
            <BrandIcon name="x" />
          </a>
          <a href={links.github} target="_blank" rel="noreferrer" aria-label="GitHub" className={navLink}>
            <BrandIcon name="github" />
          </a>
          <a href={links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className={navLink}>
            <BrandIcon name="linkedin" />
          </a>
          <a href={links.email} aria-label="Email" className={navLink}>
            <Mail className="size-4" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </footer>
  );
}

/** A section's name, a hairline out to the column's edge, and an optional
 *  link at the end of it. */
export function SectionLabel({ id, children, action }) {
  return (
    <div className="flex items-center gap-4">
      <h2 id={id} className="font-display text-lg font-semibold text-bone">
        {children}
      </h2>
      <span className="h-px flex-1 bg-ink-line" aria-hidden="true" />
      {action}
    </div>
  );
}

/** The way to X. Filled, because it is the one thing on the page to press. */
export function FollowOnX({ label = "Follow" }) {
  return (
    <a
      href={links.x}
      target="_blank"
      rel="noreferrer"
      className="chamfer chamfer-sm inline-flex items-center gap-2.5 bg-volt px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-bone"
    >
      <BrandIcon name="x" className="size-3.5" />
      <span>
        {label} <span className="font-medium text-ink/70">{handle}</span>
      </span>
    </a>
  );
}

/** Each post a panel of its own. As a plain list the writing read like one
 *  more section of rows between Experience and the projects, and it was the
 *  part of the page that was easiest to miss. */
export function PostList({ posts }) {
  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            to={`/blog/${post.slug}`}
            className="chamfer group block bg-ink-raised p-5 transition-colors duration-150 hover:bg-ink-line/60 sm:p-6"
          >
            <h3 className="font-display text-xl font-semibold leading-snug text-bone text-balance transition-colors duration-150 group-hover:text-volt">
              {post.title}
            </h3>
            <p className="mt-1.5 text-sm tabular-nums text-dim">
              <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.minutes} min read
            </p>
            <p className="mt-3 text-pretty text-muted">{post.summary}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-volt">
              Read
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
