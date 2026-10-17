// src/components/garage/Credits.jsx: who made what the garage is built from.
//
// The S6 model is reshaped from a CC BY 4.0 model, and that licence needs its
// author, title, source and licence named wherever the work is shown, with a
// note that it was changed. The data is not written here: it is handed in
// (src/data/garage-credits.js, wired by the integration), so the same record
// feeds this list and the film's credit roll. A disclosure keeps it one line
// tall until it is wanted. With no credits handed in it renders nothing.
//
// Each entry: { title, author, href, authorHref?, license, licenseHref, note? }.
import React from "react";
import { ArrowUpRight } from "lucide-react";

export default function Credits({ credits, className = "" }) {
  if (!credits?.length) return null;
  return (
    <details className={`gw-credits ${className}`}>
      <summary className="gw-text-button">Credits</summary>
      <ul className="mt-2 space-y-2">
        {credits.map((c) => (
          <li key={`${c.title}-${c.author}`} className="text-[0.8125rem] leading-[1.5] text-dim">
            <a href={c.href} target="_blank" rel="noreferrer" className="ink-underline text-muted hover:text-volt">
              {c.title}
            </a>{" "}
            by{" "}
            {c.authorHref ? (
              <a href={c.authorHref} target="_blank" rel="noreferrer" className="ink-underline text-muted hover:text-volt">
                {c.author}
              </a>
            ) : (
              c.author
            )}
            ,{" "}
            <a href={c.licenseHref} target="_blank" rel="noreferrer" className="ink-underline hover:text-volt inline-flex items-center gap-1">
              {c.license}
              <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
            </a>
            {c.note && <span>. {c.note}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
