// src/routes/recruiters-lib.js: the non-component half of the plain pages.
//
// Kept out of recruiters-shared.jsx so that file only exports components,
// which is what React Fast Refresh needs to keep working on it (the same
// reason src/lib/image.js exists beside the image components).
import { useEffect } from "react";

export const pdf = (import.meta.env.BASE_URL || "/") + "resume.pdf";

export const NAV = [
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "resume", label: "Résumé" },
  { id: "contact", label: "Contact" },
];

/** Title, body class and colour scheme for the plain pages, restored on exit. */
export function usePlainDocument(title) {
  useEffect(() => {
    const prevTitle = document.title;
    const root = document.documentElement;
    const prevScheme = root.style.colorScheme;
    document.title = title;
    document.body.classList.add("recruiters");
    root.style.colorScheme = "light";
    return () => {
      document.title = prevTitle;
      document.body.classList.remove("recruiters");
      root.style.colorScheme = prevScheme;
    };
  }, [title]);
}
