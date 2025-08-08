// src/components/Resume.jsx
import React from "react";
import MotionSection from "./MotionSection";

export default function Resume() {
  const pdf = import.meta.env.BASE_URL + "resume.pdf";

  return (
    <MotionSection id="resume" className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-bold">Resume</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Quick preview + one-click download.
      </p>

      {/* Mobile: link only */}
      <div className="mt-6 md:hidden rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 p-5">
        <a href={pdf} download className="rounded-full bg-indigo-600 px-5 py-2 text-white">
          Download Resume
        </a>
      </div>

      {/* Desktop: single iframe viewer */}
      <div className="mt-6 hidden md:block overflow-hidden rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60">
        <iframe
          src={`${pdf}#view=FitH`}
          className="w-full h-[900px]"
          title="Ali Younes Resume"
        />
      </div>

      {/* Fallback links */}
      <div className="mt-4 text-sm">
        If the viewer doesn’t load,{" "}
        <a className="underline" href={pdf} target="_blank" rel="noreferrer">open in a new tab</a>{" "}
        or <a className="underline" href={pdf} download>download</a>.
      </div>
    </MotionSection>
  );
}
