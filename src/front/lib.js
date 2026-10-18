// src/front/lib.js: what the homepage and the blog share that is not a
// component (src/front/parts.jsx has those).
import { useEffect } from "react";
import { links } from "../data/profile";

export const handle = "@" + links.x.split("/").pop();

// The one measure every page uses. 42rem keeps a line of the article body
// near 70 characters, and the homepage reads better at the same width than
// spread across a wide screen.
export const COLUMN = "mx-auto w-full max-w-2xl px-5 sm:px-6";

export function useTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
