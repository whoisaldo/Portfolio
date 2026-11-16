// test/site-files.test.mjs: what scripts/static-pages.mjs writes besides the
// heads: the blog's text in its pages, the sitemap and robots.txt.
// The made-up posts here are made up; the published ones are read from
// src/blog/ the way the build reads them. Nothing leaves the process.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";
import { Window } from "happy-dom";
import { fontFiles, robots, sitemap, withStaticCopy } from "../scripts/site-files.mjs";
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
  assert.match(html, /<div id="static-copy"><main><h1>Lighthouses<\/h1><\/main><\/div>\s*<div id="root"><\/div>/);
  assert.match(html, /<link rel="preload" as="font" type="font\/woff2" crossorigin href="\/assets\/face-c.woff2">\s*<link rel="stylesheet" crossorigin href="\/assets\/Front-b.css">\s*<\/head>/);
  assert.equal(html.match(/index-a\.css/g).length, 1);
  assert.match(html, /<body class="front bg-ink text-bone paper-grain">/);
  assert.doesNotMatch(html, /<noscript>/, "no embed, nothing for one");
  // Markup with $ in it goes in as it is.
  assert.match(withStaticCopy(TEMPLATE, "<p>$& costs $1</p>"), /<p>\$& costs \$1<\/p>/);
  assert.throws(() => withStaticCopy("<html></html>", "<p></p>"), /index\.html/);
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
