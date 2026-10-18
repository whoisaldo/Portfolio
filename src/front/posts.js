// src/front/posts.js: every post in src/blog/, newest first.
//
// Adding a post is adding a file. The filename is the address:
// src/blog/zero-touch-secure-boot.md is /blog/zero-touch-secure-boot.
import { parsePost } from "./frontmatter";

const files = import.meta.glob("../blog/*.md", { query: "?raw", import: "default", eager: true });

export const posts = Object.entries(files)
  .map(([path, source]) => {
    const { meta, body } = parsePost(source);
    return {
      slug: path.split("/").pop().replace(/\.md$/, ""),
      title: meta.title,
      date: meta.date,
      summary: meta.summary,
      body,
      // 230 words a minute, the usual figure for reading on a screen.
      minutes: Math.max(1, Math.round(body.split(/\s+/).length / 230)),
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

export const findPost = (slug) => posts.find((p) => p.slug === slug) ?? null;

// Noon, so no timezone can move the date to the day before.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
export const formatDate = (iso) => dateFormat.format(new Date(`${iso}T12:00:00`));
