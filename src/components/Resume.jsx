// src/components/Resume.jsx
import React from "react";
import MotionSection from "./MotionSection";

export default function Resume() {
  return (
    <MotionSection id="resume" className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-bold">Resume</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Quick preview + one-click download.
      </p>

      <div
        className="mt-6 md:hidden rounded-2xl border border-black/5 dark:border-white/10
                    bg-white/80 dark:bg-neutral-900/60 p-5"
      >
        <p className="text-sm">View the PDF on your device:</p>
        <a
          href="/resume.pdf"
          download
          className="mt-3 inline-block rounded-full bg-indigo-600 px-5 py-2 text-white shadow-glow"
        >
          Download Resume
        </a>
      </div>

      <div
        className="mt-6 hidden md:block overflow-hidden rounded-2xl border border-black/5 dark:border-white/10
                    bg-white/80 dark:bg-neutral-900/60"
      >
        <object
          data="/resume.pdf#view=FitH"
          type="application/pdf"
          className="w-full h-[900px]"
        >
          <div className="p-6 text-sm">
            Couldn’t embed the PDF in this browser.
            <a className="ml-2 underline" href="/resume.pdf" target="_blank" rel="noreferrer">
              Open in new tab
            </a>
            or
            <a className="ml-2 underline" href="/resume.pdf" download>
              Download
            </a>.
          </div>
        </object>
      </div>
    </MotionSection>
  );
}
