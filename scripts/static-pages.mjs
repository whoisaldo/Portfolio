// scripts/static-pages.mjs: a real page for every address that gets shared.
//
// GitHub Pages has no server-side routing, so a client-side route falls back
// to 404.html. It renders, but with an HTTP 404 and the homepage's title and
// preview, which means a blog post pasted into X unfurls as the homepage, or
// not at all. This writes dist/<route>/index.html for the playground, the
// blog, each post and each work page: a copy of the built index.html with its
// own title, description, canonical address and Open Graph tags. The preview
// image stays the site's own (index.html). The app itself is unchanged; the
// copy only differs in what a crawler reads before it runs.
//
// The blog's pages carry their text as well, drawn at build time by the same
// components the site runs (prerender-blog.jsx), so a reader, a crawler or a
// link tool without JavaScript gets the post. The other pages do not.
//
// From the same pages and posts it writes /sitemap.xml, /robots.txt and
// /feed.xml (site-files.mjs), so a new post is in all of them by being a file.
//
// Run after `vite build`:  node scripts/static-pages.mjs dist
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";
import { parsePost } from "../src/front/frontmatter.js";
import { atomFeed, fontFiles, robots, sitemap, withStaticCopy } from "./site-files.mjs";

const dist = process.argv[2] ?? "dist";
const SITE = "https://aliyounes.dev";
const NAME = "Ali Younes";
const template = readFileSync(join(dist, "index.html"), "utf8");

// Which stylesheets a chunk brings, from the manifest the build writes
// (vite.config.js). Its own and those of the chunks it imports, which is
// what Vite links when it loads it. The manifest is for this script only, so
// it does not ship.
const manifestFile = join(dist, ".vite", "manifest.json");
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
} catch {
  throw new Error(`static-pages: no ${manifestFile}; run vite build first`);
}
rmSync(join(dist, ".vite"), { recursive: true });
// A lazy chunk whose module something also imports directly (the private
// blog imports BlogPost's PostPage) is listed by its chunk's name, not its
// source, so it is found by either.
function chunkKey(source, name) {
  if (manifest[source]) return source;
  const named = Object.keys(manifest).filter((k) => manifest[k].isDynamicEntry && manifest[k].name === name);
  if (named.length !== 1) throw new Error(`static-pages: no one chunk for ${source} in the build's manifest`);
  return named[0];
}
// The entry's own stylesheet is in index.html already.
function cssOf(key, seen = new Set()) {
  if (seen.has(key) || manifest[key].isEntry) return [];
  seen.add(key);
  const chunk = manifest[key];
  return [...(chunk.imports ?? []).flatMap((k) => cssOf(k, seen)), ...(chunk.css ?? []).map((f) => `/${f}`)];
}
const frontCss = cssOf(chunkKey("src/front/Front.jsx", "Front"));
const postCss = [...new Set([...frontCss, ...cssOf(chunkKey("src/front/BlogPost.jsx", "BlogPost"))])];

// The faces that set most of the top of a blog page: Chakra Petch 600 for
// the name and the titles, and Barlow 400 for the text. Without them the
// text is drawn first in a system face and wraps again when they come, on
// any connection; each preload more delays the first paint on a slow one,
// as it shares the line with the stylesheets. Barlow 500 and 600, the links
// and the Follow button, are short runs that keep their lines, and load as
// they did before the blog had a copy, as does the code's mono further down.
const entryCss = manifest["index.html"]?.css?.[0];
if (!entryCss) throw new Error("static-pages: the build's manifest names no stylesheet for index.html");
const fonts = fontFiles(readFileSync(join(dist, entryCss), "utf8"), [
  ["Chakra Petch", 600],
  ["Barlow", 400],
]);

// Every page with a file of its own and an address to be found at, for the
// sitemap. The homepage is index.html itself, at its own canonical.
const homepage = template.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1];
if (!homepage) throw new Error(`static-pages: no canonical link in ${dist}/index.html`);
const listed = [{ url: homepage }];

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

function writePage(route, { title, description, type = "website", noindex = false, lastmod, body, head }) {
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
  if (noindex) {
    html = html.replace(/<meta\s+name="robots"[^>]*>\s*/g, "");
    html = swap(html, /<\/head>/, `  <meta name="robots" content="noindex,nofollow" />\n  </head>`, "</head>");
  }
  if (body) html = withStaticCopy(html, body, head);
  mkdirSync(join(dist, route), { recursive: true });
  writeFileSync(join(dist, route, "index.html"), html);
  if (!noindex) listed.push({ url, lastmod });
  console.log(`static-pages: ${route}/${body ? " (with its text)" : ""}`);
}

// The posts, newest first, as the blog lists them.
const postsDir = new URL("../src/blog/", import.meta.url);
const posts = readdirSync(postsDir)
  .filter((f) => f.endsWith(".md"))
  .map((file) => {
    const { meta: post, body } = parsePost(readFileSync(new URL(file, postsDir), "utf8"));
    if (!post.title || !post.summary) throw new Error(`static-pages: ${file} needs a title and a summary`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date ?? "")) throw new Error(`static-pages: ${file} needs a date, as 2026-10-17`);
    return { slug: file.replace(/\.md$/, ""), title: post.title, date: post.date, summary: post.summary, body };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

// The blog's components, through Vite, as the work pages' data is below.
const { module: prerender } = await runnerImport(fileURLToPath(new URL("./prerender-blog.jsx", import.meta.url)), {
  configFile: false,
  logLevel: "silent",
});

// The playground keeps the portfolio's own description; only the name and
// the address are its own.
writePage("/playground", { title: `${NAME} · Playground` });

const BLOG = "Long write-ups of things I built, mostly the parts that went wrong first.";
writePage("/blog", {
  title: `Writing · ${NAME}`,
  description: BLOG,
  lastmod: posts[0]?.date,
  body: prerender.renderIndex(),
  head: { css: frontCss, fonts },
});

// The private blog: drafts shown to a few people before they are published.
// Its page says nothing about them, and asks not to be indexed. Every word of
// a draft is fetched after sign-in, so there is none to put here.
writePage("/privateblog", {
  title: `Private · ${NAME}`,
  description: "Drafts, shared privately before they are published.",
  noindex: true,
});

// /recruiters was the plain version of the site, and it is the address on the
// résumé. The homepage replaced it, so it forwards there, query string and
// all: a tracked link (stats.aliyounes.dev) carries its ?s= code. Without JavaScript
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

for (const post of posts) {
  writePage(`/blog/${post.slug}`, {
    title: `${post.title} · ${NAME}`,
    description: post.summary,
    type: "article",
    lastmod: post.date,
    body: prerender.renderPost(post.slug),
    head: { css: postCss, fonts },
  });
}

// The work pages are named from the same data the app reads. work.js imports
// images and leaves off file extensions, which Node cannot load on its own,
// so it goes through Vite, the way the build reads it.
const { module: work } = await runnerImport(fileURLToPath(new URL("../src/data/work.js", import.meta.url)), {
  configFile: false,
  logLevel: "silent",
});
// A project's description is a sentence or two; a role's can be a
// paragraph, so its preview is the first sentence. At least 40 characters
// of one, so "B.S." is not where it stops.
const firstSentence = (s) => s.match(/^.{40,}?[.!?](?=\s|$)/)?.[0] ?? s;
for (const slug of work.workSlugs) {
  const { kind, entry } = work.findWork(slug);
  writePage(`/work/${slug}`, {
    title: `${work.nameOf(kind, entry)} · ${NAME}`,
    description: kind === "project" ? entry.description : firstSentence(entry.description),
  });
}

// /privateblog asks not to be indexed (above), so it is in neither of these,
// and its drafts, fetched after sign-in, are in nothing this writes.
writeFileSync(join(dist, "sitemap.xml"), sitemap(listed));
writeFileSync(join(dist, "robots.txt"), robots(SITE));
writeFileSync(
  join(dist, "feed.xml"),
  atomFeed({ site: SITE, name: NAME, title: `Writing · ${NAME}`, subtitle: BLOG, posts }),
);
console.log(`static-pages: /sitemap.xml (${listed.length} pages), /robots.txt, /feed.xml (${posts.length} posts)`);
