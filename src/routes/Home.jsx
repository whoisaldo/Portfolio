// src/routes/Home.jsx: the single scrolling page.
//
// Everything that used to be App.jsx's body lives here, unchanged. App.jsx is
// now the router and the shell; this is one of two things the shell can show.
//
// The hash-restoration effect is here rather than in App because it is about
// THIS page's sections. On /work/:slug there are no sections to restore to,
// and running it there would be a no-op at best and a scroll fight at worst.
import React, { useEffect } from "react";
import Chrome from "../components/Chrome";
import Hero from "../components/Hero";
import ProjectsSection from "../components/projects/ProjectsSection";
import ExperienceIndex from "../components/ExperienceIndex";
import About from "../sections/About";
import Stack from "../sections/Stack";
import Teardown from "../sections/Teardown";
import Contact from "../sections/Contact";
import { scrollToSection } from "../lib/scroll";

export default function Home() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.slice(1);
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    // Deep links need to be re-applied after mount: at parse time the target
    // section does not exist yet (React has not rendered), so the browser's own
    // hash scroll has nothing to find and silently gives up at the top. Doing
    // it again on `load` corrects for the layout shift as fonts and key art
    // land. Without that, /#contact lands short by a screen or more.
    //
    // This now also carries the return trip from a case study: /work/x links
    // back to /#projects, which arrives as a client-side navigation with no
    // browser hash handling of its own at all.
    // Tried several times rather than once, because "the section is at its
    // final position" is not a moment this page can identify. Key art and two
    // variable fonts land after first paint and move everything below them, so
    // a single early call lands short by a screen or more.
    //
    // Deliberately not requestAnimationFrame alone: rAF is throttled to a
    // crawl in a background tab, so a link opened with cmd-click would never
    // scroll at all: it would just sit at the top when the reader switched to
    // it. A timeout still fires there.
    const go = () => scrollToSection(hash);
    const raf = requestAnimationFrame(go);
    const timers = [0, 120, 400].map((d) => setTimeout(go, d));
    window.addEventListener("load", go, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("load", go);
    };
  }, []);

  return (
    <>
      <Chrome />
      <main>
        <Hero />
        <ProjectsSection />
        <ExperienceIndex />
        <About />
        <Stack />
        <Teardown />
        <Contact />
      </main>
    </>
  );
}
