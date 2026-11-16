// scripts/site-files.mjs: what scripts/static-pages.mjs writes besides the
// pages' heads, as plain functions of the pages and posts it already has, so
// test/site-files.test.mjs can check them without a build.
//
//   withStaticCopy  a blog page's text in its HTML, for a reader without
//                   JavaScript (scripts/prerender-blog.jsx draws it)
//   sitemap         /sitemap.xml, every page with a file and a canonical
//   robots          /robots.txt
//   atomFeed        /feed.xml, every post in full
import { marked } from "marked";

export const escapeXml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A post's embed (src/front/embeds/) is a placeholder BlogPost fills once the
// page runs. Without JavaScript it stays empty, so it gets a line instead.
const EMBED = /<div\s+data-embed="[^"]*"[^>]*>\s*<\/div>/g;
export const hasEmbed = (html) => new RegExp(EMBED.source).test(html);

/**
 * A blog page's own markup, put ahead of #root where the browser draws it
 * before any script runs. It is the page as React draws it, so the page
 * looks the same when React's copy replaces it (src/front/lib.js,
 * useStaticCopyGone).
 *
 * `css` are the stylesheets the front site's chunks bring, linked in the head
 * here so the copy is styled from the first paint. Vite finds them already
 * there when the chunk loads, and adds none twice.
 *
 * `fonts` are the files of the faces the top of the page is set in. The
 * browser would ask for them only once it has laid the text out, and show
 * it in a system face until they came, then reflow it. Asked for at once,
 * they come with the stylesheets, and the first paint is in them.
 *
 * An embed's placeholder stays as it is, holding its box for the reader whose
 * page is about to run; the line after it only shows without JavaScript, and
 * so does the rule that lets the empty box go.
 */
export function withStaticCopy(html, markup, { css = [], fonts = [] } = {}) {
  const embed = hasEmbed(markup);
  const copy = markup.replace(
    EMBED,
    (slot) => `${slot}<noscript><p><em>An interactive demo goes here. It needs JavaScript.</em></p></noscript>`,
  );
  const head =
    fonts.map((href) => `    <link rel="preload" as="font" type="font/woff2" crossorigin href="${escapeXml(href)}">\n`).join("") +
    css.map((href) => `    <link rel="stylesheet" crossorigin href="${escapeXml(href)}">\n`).join("") +
    (embed ? `    <noscript><style>.post-body [data-embed] { display: none; }</style></noscript>\n` : "");
  if (!/<\/head>/.test(html) || !/<body class="/.test(html) || !/<div id="root"><\/div>/.test(html)) {
    throw new Error("static-pages: index.html has no </head>, <body class> or empty #root to put a page in");
  }
  return html
    .replace(/<\/head>/, () => `${head}  </head>`)
    // Front.jsx sets this as it mounts: the playground's scanlines off.
    .replace(/<body class="/, '<body class="front ')
    .replace(/<div id="root"><\/div>/, () => `<div id="static-copy">${copy}</div>\n    <div id="root"></div>`);
}

/**
 * The woff2 file of each [family, weight] in a stylesheet's @font-face rules,
 * or an error naming the one it does not have.
 */
export function fontFiles(css, faces) {
  const rules = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  return faces.map(([family, weight]) => {
    const rule = rules.find(
      (r) => new RegExp(`font-family:\\s*["']?${family}["']?\\s*;`).test(r) && new RegExp(`font-weight:\\s*${weight}\\s*[;}]`).test(r),
    );
    const url = rule?.match(/url\(["']?([^"')]+\.woff2)["']?\)/)?.[1];
    if (!url) throw new Error(`static-pages: no ${family} ${weight} woff2 in the stylesheet`);
    return url;
  });
}

/** pages: [{url, lastmod?}], each url absolute and the page's canonical. */
export function sitemap(pages) {
  const urls = pages.map(
    ({ url, lastmod }) =>
      `  <url>\n    <loc>${escapeXml(url)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}  </url>\n`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("")}</urlset>\n`;
}

export function robots(site) {
  return `User-agent: *\nDisallow: /privateblog\n\nSitemap: ${site}/sitemap.xml\n`;
}

// A post has a date and no time. Noon UTC, so no reader's timezone shows the
// day before, as src/front/posts.js does for the page.
const timestamp = (date) => `${date}T12:00:00Z`;

/**
 * An Atom 1.0 feed of every post, newest first, each in full.
 *
 *   site   "https://aliyounes.dev"
 *   posts  [{slug, title, date, summary, body}], body the Markdown
 *
 * An entry's id is the post's own address, which is its canonical too, so
 * it stays the same for as long as the post does. Its text is the one the
 * page renders (marked, with its defaults, as in BlogPost.jsx), with
 * addresses made absolute because a reader shows it away from the site, and
 * an embed turned into a link to the post, where it runs.
 */
export function atomFeed({ site, name, title, subtitle, posts }) {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const entries = sorted.map((post) => {
    const url = `${site}/blog/${post.slug}/`;
    const html = marked
      .parse(post.body)
      .replace(EMBED, () => `<p><em><a href="${url}">An interactive demo is here in the post.</a></em></p>`)
      .replace(/(\s(?:href|src|poster)=")\/(?!\/)/g, `$1${site}/`);
    return `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(url)}"/>
    <id>${escapeXml(url)}</id>
    <published>${timestamp(post.date)}</published>
    <updated>${timestamp(post.date)}</updated>
    <summary>${escapeXml(post.summary)}</summary>
    <content type="html">${escapeXml(html)}</content>
  </entry>
`;
  });
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(subtitle)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${site}/feed.xml"/>
  <link rel="alternate" type="text/html" href="${site}/blog/"/>
  <id>${site}/blog/</id>
  <updated>${sorted.length ? timestamp(sorted[0].date) : "1970-01-01T00:00:00Z"}</updated>
  <author>
    <name>${escapeXml(name)}</name>
    <uri>${site}/</uri>
  </author>
${entries.join("")}</feed>
`;
}
