// scripts/static-pages.mjs: a real page for every address that gets shared.
//
// GitHub Pages has no server-side routing, so a client-side route falls back
// to 404.html. It renders, but with an HTTP 404 and the homepage's title and
// preview, which means a blog post pasted into X unfurls as the homepage, or
// not at all. This writes dist/<route>/index.html for the playground, the
// blog and each post: a copy of the built index.html with its own title,
// description, canonical address and Open Graph tags. The app itself is
// unchanged; the copy only differs in what a crawler reads before it runs.
//
// Run after `vite build`:  node scripts/static-pages.mjs dist
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parsePost } from "../src/front/frontmatter.js";

const dist = process.argv[2] ?? "dist";
const SITE = "https://aliyounes.dev";
const NAME = "Ali Younes";
const template = readFileSync(join(dist, "index.html"), "utf8");

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Every tag this rewrites must be there to rewrite. If index.html changes
// shape, the deploy stops here rather than shipping pages that still carry
// the homepage's preview.
function swap(html, pattern, replacement, what) {
  if (!pattern.test(html)) throw new Error(`static-pages: no ${what} in ${dist}/index.html`);
  return html.replace(pattern, replacement);
}

const meta = (attr, key) => new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);

function writePage(route, { title, description, type = "website" }) {
  // GitHub Pages redirects /route to /route/, so that is the address.
  const url = `${SITE}${route}/`;
  const t = escape(title);
  let html = template;
  html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`, "<title>");
  html = swap(html, /(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${url}$2`, "canonical link");
  html = swap(html, meta("property", "og:url"), `$1${url}$2`, "og:url");
  html = swap(html, meta("property", "og:type"), `$1${type}$2`, "og:type");
  html = swap(html, meta("property", "og:title"), `$1${t}$2`, "og:title");
  html = swap(html, meta("name", "twitter:title"), `$1${t}$2`, "twitter:title");
  if (description) {
    const d = escape(description);
    html = swap(html, meta("name", "description"), `$1${d}$2`, "description");
    html = swap(html, meta("property", "og:description"), `$1${d}$2`, "og:description");
    html = swap(html, meta("name", "twitter:description"), `$1${d}$2`, "twitter:description");
  }
  mkdirSync(join(dist, route), { recursive: true });
  writeFileSync(join(dist, route, "index.html"), html);
  console.log(`static-pages: ${route}/`);
}

// The playground keeps the portfolio's own description; only the name and
// the address are its own.
writePage("/playground", { title: `${NAME} · Playground` });

writePage("/blog", {
  title: `Writing · ${NAME}`,
  description: "Long write-ups of things I built, mostly the parts that went wrong first.",
});

// /recruiters was the plain version of the site, and it is the address on the
// résumé. The homepage replaced it, so it forwards there, query string and
// all: a tracked link (stats-api) carries its ?s= code. Without JavaScript
// the refresh still gets the reader home, minus the code. Deeper addresses
// under it fall through to 404.html, where Root.jsx does the same.
mkdirSync(join(dist, "recruiters"), { recursive: true });
writeFileSync(
  join(dist, "recruiters", "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${NAME}</title>
    <link rel="canonical" href="${SITE}/" />
    <meta name="robots" content="noindex" />
    <script>location.replace("/" + location.search + location.hash);</script>
    <noscript><meta http-equiv="refresh" content="0; url=/" /></noscript>
  </head>
  <body><a href="/">aliyounes.dev</a></body>
</html>
`,
);
console.log("static-pages: /recruiters/ -> /");

const posts = new URL("../src/blog/", import.meta.url);
for (const file of readdirSync(posts).filter((f) => f.endsWith(".md"))) {
  const { meta: post } = parsePost(readFileSync(new URL(file, posts), "utf8"));
  if (!post.title || !post.summary) throw new Error(`static-pages: ${file} needs a title and a summary`);
  writePage(`/blog/${file.replace(/\.md$/, "")}`, {
    title: `${post.title} · ${NAME}`,
    description: post.summary,
    type: "article",
  });
}
