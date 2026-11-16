// scripts/prerender-blog.jsx: the blog's pages as their components draw them,
// for scripts/static-pages.mjs to put in the HTML it serves.
//
// The same BlogIndex and BlogPost the site runs, from the same posts, through
// the same marked, so a reader without JavaScript gets the text the page
// shows and a reader with it sees no difference when React takes over
// (lib.js, useStaticCopyGone). Loaded through Vite, as static-pages.mjs loads
// work.js, because the components are JSX and posts.js globs src/blog/.
//
// Comments are not here: they are a lazy chunk, and a lazy chunk renders as
// its Suspense fallback, which is nothing. Neither are embeds, which BlogPost
// portals in after the text; their empty placeholders are, holding the box.
import React from "react";
import { renderToString } from "react-dom/server";
import { Route, Routes, StaticRouter } from "react-router-dom";
import BlogIndex from "../src/front/BlogIndex";
import BlogPost from "../src/front/BlogPost";

// renderToString rather than renderToStaticMarkup for the <!-- --> it puts
// between two pieces of text, "5" and " min read": the browser parses them
// into the separate text nodes React makes, and draws them the same. One run
// of text in their place is anti-aliased a pixel differently.
//
// It also leaves a marker for each Suspense boundary that could not render
// here, with React's reason why, and its stack, in a <template>. The one
// expected is the comments', which renders nothing until its chunk loads on
// the page too, so it goes. Any other is a part of the page missing from the
// copy, and the build stops rather than ship it.
const EMPTY_BOUNDARY = /<!--\$!-->(?:<template\b[^>]*><\/template>)?<!--\/\$-->/g;
function clean(html) {
  const out = html.replace(EMPTY_BOUNDARY, "");
  if (/<!--\/?\$|<template\b/.test(out)) throw new Error("prerender-blog: a part of the page did not render at build time");
  return out;
}

// Front.jsx's own wrapper, which every page of the front site is drawn in.
const page = (location) =>
  clean(renderToString(
    <StaticRouter location={location}>
      <div className="min-h-dvh bg-ink font-sans text-bone">
        <Routes>
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </div>
    </StaticRouter>,
  ));

export const renderIndex = () => page("/blog/");
export const renderPost = (slug) => page(`/blog/${slug}/`);
