// src/front/private/published.js: whether the public post is the draft as it
// is now, for the state beside Ali's Publish button (./owner.jsx).
//
// The stats service says so with the draft (`published.current`), for the
// text it had when it was fetched. The editor saves without fetching the
// draft again, so from then on the comparison is made here: the post is up
// to date while the text, its highlights taken out as publishing takes them
// out, is the text it was up to date for. A highlight added or removed does
// not change the public post, so it does not count.

// The stats service's rule (its lib/publish.js), kept here exactly and tested
// against its own cases (test/published.test.mjs). A tag is `<span` and a
// space or `>`, up to the first `>`, with no `<` in it; or `</span>`. A
// highlight is its opening tag exactly as the editor writes it.
const COLORS = ["yellow", "green", "blue", "pink", "purple"];
const TAG = /<span(?=[\s>])[^<>]*>|<\/span\s*>/gi;
const OPEN = new RegExp(`^<span data-hl="(${COLORS.join("|")})">$`);
const ANY_OPEN = new RegExp(`<span data-hl="(${COLORS.join("|")})">`);

/**
 * The text with every highlight unwrapped, as the stats service does it
 * when publishing, and every other byte as it was. Spans of any kind are
 * counted from a highlight's opening tag, so only a highlight's own tags
 * go; one never closed loses its opening tag alone. Taking one out can join
 * the text either side into another, so it goes again until none is left.
 */
export function stripHighlights(source) {
  let text = String(source);
  while (ANY_OPEN.test(text)) text = unwrap(text);
  return text;
}

function unwrap(text) {
  const open = [];
  const drop = [];
  for (const m of text.matchAll(TAG)) {
    const tag = { at: m.index, end: m.index + m[0].length };
    if (m[0][1] !== "/") {
      open.push({ ...tag, hl: OPEN.test(m[0]) });
      continue;
    }
    const from = open.pop();
    if (from?.hl) drop.push(from, tag);
  }
  drop.push(...open.filter((t) => t.hl));
  drop.sort((a, b) => a.at - b.at);
  let out = "";
  let at = 0;
  for (const t of drop) {
    out += text.slice(at, t.at);
    at = t.end;
  }
  return out + text.slice(at);
}

/**
 * The public copy of a draft, src/blog/<slug>.md as publishing writes it:
 * the title and summary as the server saves them (trimmed), then the title,
 * summary and body each with its highlights taken out.
 */
export const publicText = (d) =>
  `---\ntitle: ${stripHighlights(d.title.trim())}\ndate: ${d.date}\nsummary: ${stripHighlights(d.summary.trim())}\n---\n\n${stripHighlights(d.body).replace(/^\n+/, "")}`;

/**
 * The state beside the button, for `published` (the draft's record of its
 * last publish, or null) and `basis`, the publicText that record was up to
 * date for, if it was:
 *   {state: "none" | "current" | "changed", label, action, live?}
 */
export function publishState(published, draft, basis) {
  if (!published) return { state: "none", label: "Not published", action: "Publish" };
  const live = `https://aliyounes.dev/blog/${draft.slug}/`;
  if (basis != null && basis === publicText(draft)) return { state: "current", label: "Published · up to date", action: "Publish", live };
  return { state: "changed", label: "Published · changed since", action: "Update public post", live };
}
