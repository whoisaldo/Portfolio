// src/Root.jsx: which site a path belongs to, decided before either one loads.
//
// "/", "/blog" and "/work" are the homepage, the writing and a page for each
// project and role (src/front/), and "/privateblog" is the drafts Ali shows a
// few people first. Every other path is the playground, and App.jsx splits
// that between the cinematic and the braindance. Both halves are lazy, so the
// homepage never downloads the city's code, and a reader sent straight to
// /playground never downloads the blog's.
//
// Two kinds of old address are kept working. aliyounes.dev/#garage and the
// like pointed at a section of the cinematic, and a hash that names one of
// its sections is forwarded to the playground with the hash intact.
// /recruiters, the plain version the homepage replaced, is on the résumé, so
// it and everything under it forward to the homepage. So does /work with no
// project named, which has no page of its own. The query string goes along,
// because a tracked link (stats.aliyounes.dev, ?s=) carries its code there.
import React, { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { PLAYGROUND, sections } from "./data/site";

const App = lazy(() => import("./App.jsx"));
const Front = lazy(() => import("./front/Front.jsx"));

// "teardown" is the garage's old name; Home.jsx still honours it.
const OLD_HASHES = new Set([...sections.map((s) => s.id), "teardown"]);

function isFront(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    path === "/" || path === "/blog" || path.startsWith("/blog/") ||
    path === "/privateblog" || path.startsWith("/privateblog/") ||
    path.startsWith("/work/")
  );
}

const isRecruiters = (pathname) => pathname === "/recruiters" || pathname.startsWith("/recruiters/");
const isWorkIndex = (pathname) => pathname.replace(/\/+$/, "") === "/work";

export default function Root() {
  const { pathname, search, hash } = useLocation();
  const front = isFront(pathname);

  if (isRecruiters(pathname) || isWorkIndex(pathname)) {
    return <Navigate to={`/${search}`} replace />;
  }
  if (front && pathname === "/" && OLD_HASHES.has(hash.slice(1))) {
    return <Navigate to={PLAYGROUND + hash} replace />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>{front ? <Front /> : <App />}</Suspense>
    </ErrorBoundary>
  );
}
