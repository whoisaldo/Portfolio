// src/components/Resume.jsx
import React from "react";
import MotionSection from "./MotionSection";

export default function Resume() {
  // works in dev AND on GitHub Pages (/Portfolio/)
  const pdf = import.meta.env.BASE_URL + "resume.pdf";

  return (
    <MotionSection id="resume" className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-bold">Resume</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Quick preview + one-click download.
      </p>

      {/* Mobile: link only (iOS often can’t inline PDFs) */}
      <div className="mt-6 md:hidden rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 p-5">
        <a href={pdf} download className="rounded-full bg-indigo-600 px-5 py-2 text-white">
          Download Resume
        </a>
      </div>

      {/* Desktop: try <embed>, then <iframe> */}
      <div className="mt-6 hidden md:block overflow-hidden rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60">
        {/* Many browsers render PDFs better with <embed> than <object> */}
        <embed src={`${pdf}#view=FitH`} className="w-full h-[900px]" />

        {/* Fallback if <embed> doesn’t render */}
        <iframe src={`${pdf}#view=FitH`} className="w-full h-[900px]" title="Resume PDF"></iframe>

        {/* Final fallback links (only show if neither viewer loads) */}
        <div className="p-6 text-sm">
          Couldn’t embed the PDF in this browser.
          <a className="ml-2 underline" href={pdf} target="_blank" rel="noreferrer">Open in new tab</a>
          or
          <a className="ml-2 underline" href={pdf} download>Download</a>.
        </div>
      </div>
    </MotionSection>
  );
}
