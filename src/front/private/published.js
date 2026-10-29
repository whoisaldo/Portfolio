// src/front/private/published.js: whether the public post is the draft as it
// is now, for the state beside Ali's Publish button (./owner.jsx).
//
// The stats service says so with the draft (`published.current`), for the
// text it had when it was fetched. The editor saves without fetching the
// draft again, so from then on the comparison is made here: the post is up
// to date while the text, its highlights taken out as publishing takes them
// out, is the text it was up to date for. A highlight added or removed does
// not change the public post, so it does not count.

const TAG = /<span\b[^>]*>|<\/span\s*>/gi;
const OPEN = /^<span\s+data-hl\s*=\s*(["'])(yellow|green|blue|pink|purple)\1\s*>$/i;

/**
 * The text with every highlight unwrapped, as the stats service does it
 * when publishing (its lib/publish.js): spans are matched by depth, so only
 * a highlight's own tags go.
 */
export function stripHighlights(source) {
  const text = String(source);
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
  if (!drop.length) return text;
  drop.sort((a, b) => a.at - b.at);
  let out = "";
  let at = 0;
  for (const t of drop) {
    out += text.slice(at, t.at);
    at = t.end;
  }
  return out + text.slice(at);
}

/** What the public copy of a draft would say, to compare two drafts by. */
export const publicText = (d) => JSON.stringify([d.title.trim(), d.date, d.summary.trim(), stripHighlights(d.body)]);

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
