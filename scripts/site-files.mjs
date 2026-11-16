// scripts/site-files.mjs: what scripts/static-pages.mjs writes besides the
// pages' heads, as plain functions of the pages and posts it already has, so
// test/site-files.test.mjs can check them without a build.
//
//   withStaticCopy  a blog page's text in its HTML, for a reader without
//                   JavaScript (scripts/prerender-blog.jsx draws it)

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
