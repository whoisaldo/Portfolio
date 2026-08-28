// src/App.jsx — composition root.
import React, { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import Navbar from "./components/Navbar";
import Chrome from "./components/Chrome";
import Hero from "./components/Hero";
import ProjectsSection from "./components/projects/ProjectsSection";
import Experience from "./components/Experience";
import Terminal from "./components/Terminal";
import Teardown from "./sections/Teardown";
import Contact from "./sections/Contact";
import Footer from "./sections/Footer";
import BootSequence from "./components/BootSequence";
import ErrorBoundary from "./components/ErrorBoundary";
import { scrollToSection } from "./lib/scroll";

export default function App() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";

    const hash = window.location.hash.slice(1);
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    // Deep links need to be re-applied after mount: at parse time the target
    // section does not exist yet (React has not rendered), so the browser's own
    // hash scroll has nothing to find and silently gives up at the top. Doing
    // it again on `load` corrects for the layout shift as fonts and key art
    // land — without that, /#contact lands short by a screen or more.
    const go = () => scrollToSection(hash);
    const raf = requestAnimationFrame(go);
    window.addEventListener("load", go, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", go);
    };
  }, []);

  return (
    <ErrorBoundary>
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-ink text-bone font-mono">
      <BootSequence />

      <Navbar />
      <Chrome />

      <main>
        <Hero />
        <ProjectsSection />
        <Experience />
        <Terminal />
        <Teardown />

        <Contact />
      </main>

      <Footer />
    </div>
    </MotionConfig>
    </ErrorBoundary>
  );
}
