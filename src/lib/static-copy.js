// src/lib/static-copy.js: the blog's pages are served with a copy of
// themselves ahead of #root, drawn at build time (scripts/static-pages.mjs),
// so they read without JavaScript. It goes when something of React's takes
// its place: the page itself (src/front/lib.js, useStaticCopyGone), or the
// error page if the page could not be drawn (src/components/ErrorBoundary.jsx).
// Called from a layout effect, so it goes in the same commit, before the
// browser paints, and a reader never sees both, or neither.
export function removeStaticCopy() {
  document.getElementById("static-copy")?.remove();
}
