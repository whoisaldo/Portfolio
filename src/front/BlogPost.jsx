// src/front/BlogPost.jsx: /blog/:slug.
//
// Its own chunk, so the Markdown renderer loads with the first article a
// reader opens and not with the homepage. The posts are files in this repo,
// written by Ali, so their HTML goes in as it comes out of marked.
//
// Markdown cannot run code, so a post that needs something live carries a
// placeholder, <div data-embed="name"></div>, and the component registered
// under that name in ./embeds is portalled into it once the HTML is in. The
// components are lazy, so a post without one never fetches them.
//
// Under every post are its comments (./Comments.jsx), a lazy chunk of their
// own like the embeds. They are given the post's body too, to highlight the
// passages quote comments are about.
//
// The page itself is PostPage, which the private blog shares.
import React, { lazy, Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { marked } from "marked";
import { profile, links } from "../data/profile";
import { findPost, formatDate } from "./posts";
import { COLUMN, useTitle } from "./lib";
import { FollowOnX, FrontFooter, FrontHeader } from "./parts";
import { embeds } from "./embeds";

const Comments = lazy(() => import("./Comments"));

const backLink = "inline-flex items-center gap-1.5 text-sm font-medium text-dim transition-colors duration-150 hover:text-volt";

export default function BlogPost() {
  const { slug } = useParams();
  const post = findPost(slug);
  useTitle(post ? `${post.title} · ${profile.name}` : `Writing · ${profile.name}`);

  if (!post) {
    return (
      <>
        <FrontHeader />
        <main className={`${COLUMN} pb-24 pt-16 sm:pt-24`}>
          <h1 className="font-display text-3xl font-semibold text-bone">No post at this address</h1>
          <p className="prose-dark mt-4">It may have been renamed. Everything that is published is listed here:</p>
          <Link to="/blog" className={`${backLink} mt-6`}>
            <ArrowLeft className="size-3.5" aria-hidden="true" /> All writing
          </Link>
        </main>
        <FrontFooter />
      </>
    );
  }

  // The address the static page for this post is served from, trailing slash
  // and all (scripts/static-pages.mjs), so a shared link needs no redirect.
  const url = `${links.site}blog/${post.slug}/`;
  const share = `https://x.com/intent/post?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`;

  return (
    <PostPage
      post={post}
      back={{ to: "/blog", label: "Writing" }}
      share={share}
      below={(body) => (
        <Suspense fallback={null}>
          <Comments key={post.slug} slug={post.slug} body={body} />
        </Suspense>
      )}
    />
  );
}

/**
 * A post as its page shows it. The private blog (./private/) renders a draft
 * through this too, so a draft reads exactly as it will once published.
 *
 *   back    {to, label} for the link above the title
 *   share   the "Share this post" address; none, no link
 *   marker  shown above the title
 *   rewrite (html) => html, applied to the rendered Markdown once
 *   inside  (body) => what else goes in the <article>, after the text
 *   below   (body) => what goes under the <article>
 *   editing {head, title, body}, only while the private blog's editor is
 *           open: what goes under the marker, what takes the place of the
 *           title and date, and what takes the place of the text
 *
 * `body` is a ref to the element holding the post's text.
 */
export function PostPage({ post, back, share, marker, rewrite, inside, below, editing }) {
  // One object for the life of the post: React re-sets innerHTML whenever
  // this prop is a new object, which would throw away the embeds' slots.
  const html = useMemo(() => {
    const out = marked.parse(post.body);
    return { __html: rewrite ? rewrite(out) : out };
  }, [post, rewrite]);
  const body = useRef(null);
  const [slots, setSlots] = useState([]);
  // Before paint, so an embed never flashes in after the text around it.
  // Again when the text comes back after editing.
  const reading = !editing;
  useLayoutEffect(() => {
    setSlots(body.current ? [...body.current.querySelectorAll("[data-embed]")] : []);
  }, [html, reading]);

  return (
    <>
      <FrontHeader />
      <main className={`${COLUMN} pb-24 pt-14 sm:pt-20`}>
        <article className={inside ? "relative" : undefined}>
          <Link to={back.to} className={backLink}>
            <ArrowLeft className="size-3.5" aria-hidden="true" /> {back.label}
          </Link>
          {marker}
          {editing?.head}
          {editing ? (
            editing.title
          ) : (
            <>
              <h1 className="mt-8 font-display text-3xl font-semibold leading-tight text-bone text-balance sm:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-sm tabular-nums text-dim">
                <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.minutes} min read
              </p>
            </>
          )}
          {editing ? editing.body : <div ref={body} className="post-body mt-10" dangerouslySetInnerHTML={html} />}
          {reading && slots.map((slot, i) => {
            const Embed = embeds[slot.dataset.embed];
            return Embed
              ? createPortal(
                  <Suspense fallback={null}>
                    <Embed />
                  </Suspense>,
                  slot,
                  `${slot.dataset.embed}-${i}`,
                )
              : null;
          })}
          {inside?.(body)}
        </article>

        {below?.(body)}

        <aside className="mt-16 border-t border-ink-line pt-8">
          <p className="text-pretty text-muted">
            Thanks for reading. I post shorter notes, and every new write-up, on X.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
            <FollowOnX />
            {share && (
              <a
                href={share}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-muted transition-colors duration-150 hover:text-volt"
              >
                <span className="ink-underline">Share this post</span>
              </a>
            )}
          </div>
        </aside>
      </main>
      <FrontFooter />
    </>
  );
}
