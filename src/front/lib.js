// src/front/lib.js: what the homepage and the blog share that is not a
// component (src/front/parts.jsx has those).
import { useEffect, useLayoutEffect } from "react";
import { links } from "../data/profile";
import { removeStaticCopy } from "../lib/static-copy";

export const handle = "@" + links.x.split("/").pop();

// The one measure every page uses. 42rem keeps a line of the article body
// near 70 characters, and the homepage reads better at the same width than
// spread across a wide screen.
export const COLUMN = "mx-auto w-full max-w-2xl px-5 sm:px-6";

export function useTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

// The blog's pages are served with a copy of themselves ahead of #root,
// drawn by these same components at build time (scripts/static-pages.mjs),
// so they read without JavaScript. The copy goes in the commit that puts the
// page itself in, before the browser paints either, so a reader never sees
// both, or neither.
export function useStaticCopyGone() {
  useLayoutEffect(removeStaticCopy, []);
}
