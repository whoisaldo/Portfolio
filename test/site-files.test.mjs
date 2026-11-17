// test/site-files.test.mjs: what scripts/static-pages.mjs writes besides the
// heads: the blog's text in its pages, the sitemap, robots.txt and the feed.
// The made-up posts here are made up; the published ones are read from
// src/blog/ the way the build reads them. Nothing leaves the process.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { runnerImport } from "vite";
import { Window } from "happy-dom";
import { RELOAD_PLACE, absoluteUrls, atomFeed, fontFiles, robots, sitemap, withStaticCopy } from "../scripts/site-files.mjs";
import { parsePost } from "../src/front/frontmatter.js";

const SITE = "https://example.test";
const TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <title>x</title>
    <link rel="stylesheet" crossorigin href="/assets/index-a.css">
  </head>
  <body class="bg-ink text-bone paper-grain">
    <div id="root"></div>
    <script type="module" src="/assets/index-a.js"></script>
  </body>
</html>
`;

const POSTS = [
  {
    slug: "older",
    title: "Tides & <harbours>",
    date: "2026-03-01",
    summary: 'The ferry, "early".',
    body: "The ferry left at dawn.\n\n## Gulls\n\nSee [the map](/work/harbour) and `knots`.\n\n<div data-embed=\"tide-chart\"></div>\n",
  },
  { slug: "newer", title: "Lighthouses", date: "2026-05-09", summary: "A ledger of ships.", body: "Every ship that passed." },
];

const xml = (source) => {
  const doc = new new Window().DOMParser().parseFromString(source, "application/xml");
  assert.equal(doc.querySelector("parsererror"), null, "parses as XML");
  return doc;
};

test("a page's copy goes ahead of #root, styled and with the front site's body", () => {
  const html = withStaticCopy(TEMPLATE, "<main><h1>Lighthouses</h1></main>", { css: ["/assets/Front-b.css"], fonts: ["/assets/face-c.woff2"] });
  assert.match(html, /<div id="static-copy" style="position:absolute;top:0;left:0;right:0"><main><h1>Lighthouses<\/h1><\/main><\/div>\s*<script>[^<]+<\/script>\s*<div id="root"><\/div>/);
  assert.match(html, /<link rel="preload" as="font" type="font\/woff2" crossorigin href="\/assets\/face-c.woff2">\s*<link rel="stylesheet" crossorigin href="\/assets\/Front-b.css">\s*<\/head>/);
  assert.equal(html.match(/index-a\.css/g).length, 1);
  assert.match(html, /<body class="front bg-ink text-bone paper-grain">/);
  assert.doesNotMatch(html, /<noscript>/, "no embed, nothing for one");
  // Markup with $ in it goes in as it is.
  assert.match(withStaticCopy(TEMPLATE, "<p>$& costs $1</p>"), /<p>\$& costs \$1<\/p>/);
  assert.throws(() => withStaticCopy("<html></html>", "<p></p>"), /index\.html/);
});

test("on a reload the copy is put where the reader was, from the place Front.jsx keeps", () => {
  // The same store, by name: the page's script and Front.jsx must agree on it.
  const front = readFileSync(fileURLToPath(new URL("../src/front/Front.jsx", import.meta.url)), "utf8");
  assert.match(front, /const SAVED = "front:places";/);
  assert.ok(RELOAD_PLACE.includes('"front:places"'));

  const run = ({ type, key, saved }) => {
    const scrolled = [];
    vm.runInNewContext(RELOAD_PLACE, {
      performance: { getEntriesByType: () => [{ type }] },
      history: { state: key ? { key } : null },
      sessionStorage: { getItem: () => saved },
      window: { scrollTo: (x, y) => scrolled.push([x, y]) },
      JSON,
    });
    return scrolled;
  };
  const saved = JSON.stringify([["default", 40], ["k7", 1800], ["k9", 300]]);
  assert.deepEqual(run({ type: "reload", key: "k7", saved }), [[0, 1800]]);
  // The tab's first entry has no key of its own.
  assert.deepEqual(run({ type: "reload", key: null, saved }), [[0, 40]]);
  // Not a reload, a place never kept, nothing stored, or a store that cannot be read.
  assert.deepEqual(run({ type: "navigate", key: "k7", saved }), []);
  assert.deepEqual(run({ type: "reload", key: "other", saved }), []);
  assert.deepEqual(run({ type: "reload", key: "k7", saved: null }), []);
  assert.deepEqual(run({ type: "reload", key: "k7", saved: "{not json" }), []);
});

test("a srcset that is one data: address is left as it is in the feed", () => {
  const data = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(absoluteUrls(`<img srcset="${data}">`, `${SITE}/blog/older/`), `<img srcset="${data}">`);
  assert.equal(
    absoluteUrls('<img srcset="small.png 1x, /big.png 2x">', `${SITE}/blog/older/`),
    `<img srcset="${SITE}/blog/older/small.png 1x, ${SITE}/big.png 2x">`,
  );
});

test("a face's file is found by its family and weight", () => {
  const css =
    "@font-face{font-family:Barlow;font-style:normal;font-display:swap;font-weight:400;src:url(/assets/barlow-400-a.woff2) format(\"woff2\"),url(/assets/barlow-400-a.woff) format(\"woff\")}" +
    "@font-face{font-family:Barlow;font-weight:500;src:url(/assets/barlow-500-b.woff2) format(\"woff2\")}" +
    "@font-face{font-family:'Chakra Petch';font-weight:600;src:url(/assets/chakra-600-c.woff2)}";
  assert.deepEqual(fontFiles(css, [["Chakra Petch", 600], ["Barlow", 400], ["Barlow", 500]]), [
    "/assets/chakra-600-c.woff2",
    "/assets/barlow-400-a.woff2",
    "/assets/barlow-500-b.woff2",
  ]);
  assert.throws(() => fontFiles(css, [["Barlow", 600]]), /Barlow 600/);
});

test("an embed keeps its empty box for the page about to run, and a line without JavaScript", () => {
  const html = withStaticCopy(TEMPLATE, '<div class="post-body"><p>a</p><div data-embed="tide-chart"></div><p>b</p></div>');
  assert.match(html, /<div data-embed="tide-chart"><\/div><noscript><p><em>An interactive demo goes here\. It needs JavaScript\.<\/em><\/p><\/noscript><p>b<\/p>/);
  assert.match(html, /<noscript><style>\.post-body \[data-embed\] \{ display: none; \}<\/style><\/noscript>\s*<\/head>/);
});

test("the sitemap lists each page at its address, with a date only where there is one", () => {
  const out = sitemap([{ url: `${SITE}/` }, { url: `${SITE}/blog/a&b/`, lastmod: "2026-05-09" }]);
  const doc = xml(out);
  const urls = [...doc.getElementsByTagName("url")];
  assert.deepEqual(urls.map((u) => u.getElementsByTagName("loc")[0].textContent), [`${SITE}/`, `${SITE}/blog/a&b/`]);
  assert.deepEqual(urls.map((u) => u.getElementsByTagName("lastmod")[0]?.textContent ?? null), [null, "2026-05-09"]);
  assert.match(out, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
});

test("robots.txt keeps crawlers out of the private blog and points at the sitemap", () => {
  assert.equal(robots(SITE), `User-agent: *\nDisallow: /privateblog\n\nSitemap: ${SITE}/sitemap.xml\n`);
});

test("the feed is Atom with every post in full, newest first, at absolute addresses", () => {
  const out = atomFeed({ site: SITE, name: "A. Writer", title: "Writing", subtitle: "Notes & more", posts: POSTS });
  const doc = xml(out);
  const feed = doc.documentElement;
  assert.equal(feed.namespaceURI ?? feed.getAttribute("xmlns"), "http://www.w3.org/2005/Atom");
  assert.equal(feed.querySelector("link[rel=self]").getAttribute("href"), `${SITE}/feed.xml`);
  assert.equal(feed.getElementsByTagName("updated")[0].textContent, "2026-05-09T12:00:00Z", "the newest post's date");
  assert.equal(feed.getElementsByTagName("subtitle")[0].textContent, "Notes & more");

  const entries = [...doc.getElementsByTagName("entry")];
  const field = (e, name) => e.getElementsByTagName(name)[0].textContent;
  assert.deepEqual(entries.map((e) => field(e, "title")), ["Lighthouses", "Tides & <harbours>"]);
  const older = entries[1];
  assert.equal(field(older, "id"), `${SITE}/blog/older/`, "the id is the post's own address");
  assert.equal(older.getElementsByTagName("link")[0].getAttribute("href"), `${SITE}/blog/older/`);
  assert.equal(field(older, "published"), "2026-03-01T12:00:00Z");
  assert.equal(field(older, "updated"), "2026-03-01T12:00:00Z");
  assert.equal(field(older, "summary"), 'The ferry, "early".');
  assert.equal(older.getElementsByTagName("content")[0].getAttribute("type"), "html");

  const html = field(older, "content");
  assert.match(html, /<h2>Gulls<\/h2>/);
  assert.match(html, /<a href="https:\/\/example.test\/work\/harbour">the map<\/a>/, "a site address made absolute");
  assert.match(html, /<code>knots<\/code>/);
  assert.doesNotMatch(html, /data-embed/);
  assert.match(html, /<a href="https:\/\/example.test\/blog\/older\/">An interactive demo is here in the post\.<\/a>/);
  assert.doesNotMatch(out, /privateblog/);
});

test("every address in a feed entry is read against the post's own, as a browser on it would", () => {
  const body = [
    "Back to [the part](#part), the [diagram](./diagram.svg) and [up one](../older-still/).",
    "",
    "![A figure](images/figure.png)",
    "",
    "From [elsewhere](//example.test/file), the [map](/work/harbour?at=dock&tide=low), " +
      "[a letter](mailto:hello@sideband.studio) and [another site](https://other.test/x?a=1&b=2).",
    "",
    "<img src='single.png' srcset=\"small.png 1x, /big.png 2x, https://cdn.test/huge.png 3x\" alt='Gulls'> " +
      "<a href=bare.html title=\"not href=gone.html\">bare</a> <video poster=\"poster.jpg\" src=\"clip.mp4\"></video>",
    "",
    "In code, `<a href=\"/x\">` stays as it is written.",
    "",
  ].join("\n");
  const out = atomFeed({ site: SITE, name: "A. Writer", title: "Writing", subtitle: "Notes", posts: [{ ...POSTS[0], body }] });
  const content = xml(out).getElementsByTagName("content")[0].textContent;
  const doc = new new Window().DOMParser().parseFromString(content, "text/html");
  const at = (selector, attr) => doc.querySelector(selector).getAttribute(attr);
  const post = `${SITE}/blog/older/`;

  assert.equal(at('a[href$="#part"]', "href"), `${post}#part`, "a fragment");
  assert.equal(at('a[href$="diagram.svg"]', "href"), `${post}diagram.svg`, "./ relative");
  assert.equal(at('a[href$="older-still/"]', "href"), `${SITE}/blog/older-still/`, "../ relative");
  assert.equal(at('img[alt="A figure"]', "src"), `${post}images/figure.png`, "a bare relative image");
  assert.equal(at('a[href$="/file"]', "href"), "https://example.test/file", "protocol-relative");
  assert.equal(at('a[href*="harbour"]', "href"), `${SITE}/work/harbour?at=dock&tide=low`, "root-relative, its query intact");
  assert.equal(at('a[href^="mailto:"]', "href"), "mailto:hello@sideband.studio", "mailto: as it is");
  assert.equal(at('a[href*="other.test"]', "href"), "https://other.test/x?a=1&b=2", "absolute as it is");

  assert.equal(at('img[alt="Gulls"]', "src"), `${post}single.png`, "single-quoted");
  assert.equal(at('img[alt="Gulls"]', "srcset"), `${post}small.png 1x, ${SITE}/big.png 2x, https://cdn.test/huge.png 3x`, "each of a srcset");
  assert.equal(at('a[title]', "href"), `${post}bare.html`, "unquoted");
  assert.equal(at('a[title]', "title"), "not href=gone.html", "another attribute's text is not an address");
  assert.equal(at("video", "poster"), `${post}poster.jpg`);
  assert.equal(at("video", "src"), `${post}clip.mp4`);
  assert.equal(doc.querySelector("p:last-child code").textContent, '<a href="/x">', "code is text");
  // Nothing relative is left in any tag.
  for (const el of doc.querySelectorAll("[href], [src], [poster]")) {
    for (const name of ["href", "src", "poster"]) {
      const v = el.getAttribute(name);
      if (v !== null) assert.match(v, /^(https:|mailto:)/, `${el.tagName} ${name}="${v}"`);
    }
  }
});

test("absoluteUrls leaves what has no address, and an address it cannot read, as they are", () => {
  const base = `${SITE}/blog/older/`;
  assert.equal(absoluteUrls("<p>a < b and c > d</p>", base), "<p>a < b and c > d</p>");
  assert.equal(absoluteUrls('<div data-src="x.png" class="y"></div>', base), '<div data-src="x.png" class="y"></div>');
  assert.equal(absoluteUrls('<a href="https://other.test/A%20b">x</a>', base), '<a href="https://other.test/A%20b">x</a>');
  assert.equal(absoluteUrls('<a href="//[broken">x</a>', base), '<a href="//[broken">x</a>', "no host to read");
  assert.equal(absoluteUrls('<a HREF="ftp://files.example.test/x">x</a>', base), '<a HREF="ftp://files.example.test/x">x</a>');
});

// The published posts, as the build draws them: the page's text, without
// the comments or any draft.
test("each published post's page carries its whole text, as the site renders it", async () => {
  const { module: prerender } = await runnerImport(fileURLToPath(new URL("../scripts/prerender-blog.jsx", import.meta.url)), {
    configFile: false,
    logLevel: "silent",
  });
  const { marked } = await import("marked");
  const dir = new URL("../src/blog/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  assert.ok(files.length > 0);
  const index = prerender.renderIndex();
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const { meta, body } = parsePost(readFileSync(new URL(file, dir), "utf8"));
    const page = prerender.renderPost(slug);
    const window = new Window();
    window.document.body.innerHTML = page;
    const doc = window.document;
    assert.equal(doc.querySelector("main article h1").textContent, meta.title);
    assert.equal(doc.querySelector("main article time").getAttribute("datetime"), meta.date);
    // Both through the same parser, so &#39; and ' compare equal.
    const expected = doc.createElement("div");
    expected.innerHTML = marked.parse(body);
    assert.equal(doc.querySelector(".post-body").innerHTML, expected.innerHTML, `${slug}: the text marked makes`);
    assert.ok(doc.querySelectorAll(".post-body h2").length > 0, `${slug}: its headings`);
    assert.equal(doc.querySelector("main").nextElementSibling.tagName, "FOOTER");

    window.document.body.innerHTML = index;
    const link = doc.querySelector(`a[href="/blog/${slug}"]`);
    assert.ok(link, `${slug}: listed`);
    assert.equal(link.querySelector("h3").textContent, meta.title);
    assert.match(link.textContent, new RegExp(meta.summary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(index, /privateblog/);
});
