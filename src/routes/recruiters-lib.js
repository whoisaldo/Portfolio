// src/routes/recruiters-lib.js: the non-component half of the plain pages.
//
// Kept out of recruiters-shared.jsx so that file only exports components,
// which is what React Fast Refresh needs to keep working on it (the same
// reason src/lib/image.js exists beside the image components).
import { useLayoutEffect } from "react";
import { useRecruiterTheme } from "./recruiters-theme";

export const pdf = (import.meta.env.BASE_URL || "/") + "resume.pdf";
export const recruiterAvatar =
  (import.meta.env.BASE_URL || "/") + "recruiter/avatar.webp";
const recruiterFavicon =
  (import.meta.env.BASE_URL || "/") + "recruiter/favicon.png";
const recruiterTouchIcon =
  (import.meta.env.BASE_URL || "/") + "recruiter/apple-touch-icon.png";

export const NAV = [
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "resume", label: "Résumé" },
  { id: "contact", label: "Contact" },
];

export const roleHeadings = {
  "philips-zero-touch": "Zero-touch deployment",
  "pinnatec-auto": "Virtual Link",
  pawtograder: "Northeastern's autograder",
  "aws-cloudformation": "Sharing CloudFormation resources",
};

export const projectLabels = {
  "eternal-monitor": "Systems / Rust + Swift",
  "exerly-fitness": "Web + native iOS",
  sideband: "Independent software studio",
  "eternal-rich-presence": "Desktop integration",
  "eternal-exchange": "Game development",
  "moops-bookstore": "Full-stack web",
  "face-analytics": "Computer vision",
  "signature-cuts": "Booking & payments",
};

export const statusLabel = (status) =>
  ({ live: "Live", "in-dev": "In development", "pre-release": "Pre-release" })[
    status
  ] ?? status;

function setHeadAttributes(selector, attributes) {
  const element = document.querySelector(selector);
  if (!element) return () => {};
  const previous = Object.fromEntries(
    Object.keys(attributes).map((key) => [key, element.getAttribute(key)]),
  );
  for (const [key, value] of Object.entries(attributes))
    element.setAttribute(key, value);
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === null) element.removeAttribute(key);
      else element.setAttribute(key, value);
    }
  };
}

/** Recruiter document metadata is restored on exit. Theme CSS lives on .rp only. */
export function usePlainDocument(title) {
  const theme = useRecruiterTheme();

  useLayoutEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    document.body.classList.add("recruiters");
    const restoreIcon = setHeadAttributes('link[rel="icon"]', {
      href: recruiterFavicon,
      type: "image/png",
      sizes: "64x64",
    });
    const restoreTouchIcon = setHeadAttributes('link[rel="apple-touch-icon"]', {
      href: recruiterTouchIcon,
    });
    return () => {
      document.title = prevTitle;
      document.body.classList.remove("recruiters");
      restoreIcon();
      restoreTouchIcon();
    };
  }, [title]);

  useLayoutEffect(
    () =>
      setHeadAttributes('meta[name="theme-color"]', {
        content: theme === "dark" ? "#0b0f0d" : "#f8f7f3",
      }),
    [theme],
  );

  return theme;
}
