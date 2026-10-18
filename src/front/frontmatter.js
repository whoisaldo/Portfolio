// src/front/frontmatter.js: the header on a blog post.
//
// A post is a Markdown file in src/blog/ that opens with a few lines between
// two `---` markers:
//
//   ---
//   title: The title, as it shows in the list and on the page
//   date: 2026-10-17
//   summary: One sentence for the list and for the link preview on X.
//   ---
//
// One `key: value` per line and nothing nested, which is all a post needs.
// No imports, because scripts/static-pages.mjs reads the same files in Node
// at build time to give each post its own title and preview.
export function parsePost(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: source };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon > 0) meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return { meta, body: source.slice(match[0].length) };
}
