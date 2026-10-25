// src/front/Front.jsx: the homepage, the blog and the work pages, the first
// thing at aliyounes.dev.
//
// A shell of its own, so none of the cinematic comes with it. No door, no
// intro, no audio, no city, no cursor. It also replaced /recruiters, the
// plain version of the site, which forwards here now (Root.jsx).
// Root.jsx routes here before App.jsx is ever downloaded, so this page costs
// what it shows and nothing more.
import React, { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { initBeacon, pageview } from "../lib/beacon";
import FrontHome from "./FrontHome";
import BlogIndex from "./BlogIndex";
import "./front.css";

const BlogPost = lazy(() => import("./BlogPost"));
const WorkPage = lazy(() => import("./WorkPage"));

export default function Front() {
  const { pathname } = useLocation();
  const navigation = useNavigationType();

  // The playground counts its visits; so does this.
  useEffect(() => initBeacon(), []);
  useEffect(() => pageview(), [pathname]);

  // Turns off the playground's scanlines while this shell is up; see front.css.
  useLayoutEffect(() => {
    document.body.classList.add("front");
    return () => document.body.classList.remove("front");
  }, []);

  // A new page starts at its top. Back and forward keep the browser's place.
  useLayoutEffect(() => {
    if (navigation !== "POP") window.scrollTo(0, 0);
  }, [pathname, navigation]);

  return (
    <div className="min-h-dvh bg-ink font-sans text-bone">
      <Routes>
        <Route path="/" element={<FrontHome />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route
          path="/blog/:slug"
          element={
            <Suspense fallback={null}>
              <BlogPost />
            </Suspense>
          }
        />
        <Route
          path="/work/:slug"
          element={
            <Suspense fallback={null}>
              <WorkPage />
            </Suspense>
          }
        />
        {/* Root.jsx sends everything under /blog/ and /work/ here, so a
            deeper path gets the not-found page its section already has,
            with no slug to find, rather than an empty page. */}
        <Route
          path="/blog/*"
          element={
            <Suspense fallback={null}>
              <BlogPost />
            </Suspense>
          }
        />
        <Route
          path="/work/*"
          element={
            <Suspense fallback={null}>
              <WorkPage />
            </Suspense>
          }
        />
      </Routes>
    </div>
  );
}
