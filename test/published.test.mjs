// test/published.test.mjs: the private blog's highlight unwrapping
// (src/front/private/published.js), against the stats service's own tests
// for it, copied from its test/editor.test.js at 0e8ad3a, so the two cannot
// drift. `publishedSource` is the service's name for the public copy,
// which is publicText here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { publicText, stripHighlights } from "../src/front/private/published.js";

const HIGHLIGHTS = ["yellow", "green", "blue", "pink", "purple"];
const publishedSource = publicText;

test("highlights are unwrapped, and nothing else is touched", () => {
  assert.equal(
    stripHighlights('A <span data-hl="yellow">**bold** and [a link](/x)</span> then <span data-hl="pink">`code`</span>.'),
    "A **bold** and [a link](/x) then `code`.",
    "Markdown inside stays, several on a line",
  );
  assert.equal(
    stripHighlights('<span data-hl="blue">around <span class="kbd">Ctrl</span> and <em>more</em></span> <span class="kbd">kept</span>'),
    'around <span class="kbd">Ctrl</span> and <em>more</em> <span class="kbd">kept</span>',
    "a span inside keeps its own closing tag",
  );
  assert.equal(
    stripHighlights('<span data-hl="green">a <span>b <SPAN class="x">c</SPAN></span> d</span>e'),
    "a <span>b <SPAN class=\"x\">c</SPAN></span> de",
    "spans nested deeper, in any case, are counted too",
  );
  for (const keep of [
    '<span data-hl="red">not one of the colours</span>',
    '<span class="hl">no data-hl</span>',
    '<span data-hl="yellow" class="x">more attributes than the editor writes</span>',
    "<span data-hl='green'>single quotes: not what the editor writes</span>",
    '<SPAN data-hl="Yellow">nor is this</SPAN>',
    '<span  data-hl="yellow">nor two spaces</span>',
    "<div data-hl=\"yellow\">not a span</div>",
    '&lt;span data-hl="yellow"&gt;an escaped example&lt;/span&gt;',
    "plain text, <b>bold</b>, a < b > c",
  ]) assert.equal(stripHighlights(keep), keep);
  assert.equal(stripHighlights('one <span data-hl="purple">never closed'), "one never closed");
  assert.equal(stripHighlights('</span> stray <span data-hl="yellow"></span>end'), "</span> stray end");
  assert.equal(stripHighlights('line one <span data-hl="yellow">across\n\nparagraphs</span>'), "line one across\n\nparagraphs");
  assert.equal(
    stripHighlights('<span data-hl="pink">a <span class="x">b</span>'),
    'a <span class="x">b</span>',
    "a highlight whose closing tag is another span's is unbalanced, and loses its opening tag alone",
  );
});

test("a highlight is taken out wherever it is, code included", () => {
  const hl = (c, t) => `<span data-hl="${c}">${t}</span>`;
  const ex = hl("yellow", "example");
  const out = (md, want, why) => {
    const got = stripHighlights(md);
    assert.equal(got, want, why);
    assert.doesNotMatch(got, /data-hl/, why);
  };

  out("```\n" + ex + "\n```\n", "```\nexample\n```\n", "a fenced block");
  out("```html\n" + ex + "\n```", "```html\nexample\n```", "with an info string, at the very end");
  out("~~~\n" + ex + "\n~~~\n", "~~~\nexample\n~~~\n", "tildes");
  out("````md\n```\n" + ex + "\n```\n" + ex + "\n````\n", "````md\n```\nexample\n```\nexample\n````\n", "a longer fence holds a shorter one");
  out("Before.\n\n```\n" + ex + "\nnever closed\n", "Before.\n\n```\nexample\nnever closed\n", "a fence never closed");
  out("1. Step one:\n\n   ```\n   " + ex + "\n   ```\n", "1. Step one:\n\n   ```\n   example\n   ```\n", "a fence in a list item");
  out("> ```\n> " + ex + "\n> ```\n", "> ```\n> example\n> ```\n", "a fence in a quote");
  out("    " + ex + "\n", "    example\n", "an indented block");
  out("Text.\n\n    " + ex + "\n\n    " + ex + "\n", "Text.\n\n    example\n\n    example\n", "an indented block, blank lines inside");
  out("`" + ex + "`", "`example`", "inline code");
  out("``" + ex + "``", "``example``", "two backticks");
  out("A `" + ex + "\nacross a line` b", "A `example\nacross a line` b", "inline code across a line");
  out("Use " + hl("pink", "see `x` here") + " please.", "Use see `x` here please.", "a highlight around inline code");
  out("\\`" + hl("yellow", "x") + "\\`", "\\`x\\`", "escaped backticks");

  // The layouts that once let a line scanner and CommonMark disagree on
  // where code is (review b1-r2's strip-probe).
  const H = (t) => hl("yellow", t);
  const probe = {
    "a fence whose text has a closing fence indented four spaces": [
      ["Intro.", "", "```md", "- item", "    ```", "    code", "    ```", "```", "", `Later prose ${H("private note")}.`, ""],
      ["Intro.", "", "```md", "- item", "    ```", "    code", "    ```", "```", "", "Later prose private note.", ""],
    ],
    "then another code block": [
      ["```md", "- item", "    ```", "    x", "    ```", "```", "", `Prose ${H("note A")}.`, "", "```html", H("example"), "```", "", `After ${H("note B")}.`, ""],
      ["```md", "- item", "    ```", "    x", "    ```", "```", "", "Prose note A.", "", "```html", "example", "```", "", "After note B.", ""],
    ],
    "a quoted fence inside a fence": [
      ["```markdown", "> ```", `> ${H("example")}`, "> ```", "```", "", `Prose ${H("note")}.`, ""],
      ["```markdown", "> ```", "> example", "> ```", "```", "", "Prose note.", ""],
    ],
    "a highlight in a code span": [[`Use \`npm ${H("run build")}\` here.`], ["Use `npm run build` here."]],
    "a highlight in a fenced block": [["```js", `const x = ${H("1")};`, "```", ""], ["```js", "const x = 1;", "```", ""]],
    "a fence in a quote, never closed": [
      ["> ```", "> code", "", `Prose ${H("note")}.`, ""],
      ["> ```", "> code", "", "Prose note.", ""],
    ],
    "indented code eight spaces into a list item": [["- item", "", `        ${H("example")}`, ""], ["- item", "", "        example", ""]],
  };
  for (const [why, [md, want]] of Object.entries(probe)) out(md.join("\n"), want.join("\n"), why);

  const doc = [
    `# ${hl("yellow", "Title")}`, "", `Some ${hl("pink", "text")} and \`${ex}\`.`, "",
    "```html", ex, "```", "", `After ${hl("blue", "the code")}.`, "",
  ].join("\r\n");
  out(doc, ["# Title", "", "Some text and `example`.", "", "```html", "example", "```", "", "After the code.", ""].join("\r\n"),
    "a whole post, with CRLF lines");
});

test("fuzz: any Markdown, any highlights: none is left, and nothing else changes", () => {
  // A small seeded generator (mulberry32), so a failure can be run again.
  let seed = 0x5eed;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  const fence = () => {
    const ch = pick(["`", "~"]).repeat(3 + Math.floor(rand() * 3));
    const indent = " ".repeat(Math.floor(rand() * 9));
    return pick(["", "> ", ">> ", "- ", "1. "]) + indent + ch + pick(["", "js", "md", " html", "`x`"]);
  };
  const fragments = [
    () => "\n", () => "\n\n", () => "\r\n", () => " ", () => "plain words", () => "Ünïcödé — ✓",
    fence, fence, fence,
    () => "> ", () => "> quoted line", () => "- item", () => "1. step", () => "    indented code", () => "        deeper code",
    () => "\t", () => "`", () => "``", () => "`inline`", () => "``a ` b``", () => "\\`", () => "\\",
    () => "<b>bold</b>", () => "<em>", () => "a < b > c", () => "<spa", () => "span>", () => "</spa", () => "data-", () => "<spanner>",
    () => "&lt;span&gt;", () => "<!-- c -->", () => "# Heading", () => "***", () => "[link](/x)", () => "**strong**",
  ];
  const others = ['<span class="kbd">', "<span>", "<SPAN title='x'>", '<span style="color:red">', "<span\n>"];
  // Returns [markdown, what it should become].
  const gen = (depth) => {
    let md = "";
    let want = "";
    const n = 1 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const r = rand();
      if (depth < 4 && r < 0.2) {
        const [m, w] = gen(depth + 1);
        md += `<span data-hl="${pick(HIGHLIGHTS)}">${m}</span>`;
        want += w;
      } else if (depth < 4 && r < 0.3) {
        const [m, w] = gen(depth + 1);
        const tag = pick(others);
        const close = pick(["</span>", "</SPAN>", "</span >"]);
        md += tag + m + close;
        want += tag + w + close;
      } else {
        const f = pick(fragments)();
        md += f;
        want += f;
      }
    }
    return [md, want];
  };
  for (let i = 0; i < 3000; i++) {
    let [md, want] = gen(0);
    if (rand() < 0.1) {
      // A highlight never closed, as Ali's last keystroke might leave one.
      const tail = pick(fragments)();
      md += `<span data-hl="${pick(HIGHLIGHTS)}">${tail}`;
      want += tail;
    }
    const got = stripHighlights(md);
    assert.equal(got, want, `case ${i}: ${JSON.stringify(md)}`);
    assert.doesNotMatch(got, /data-hl/, `case ${i}`);
  }
});

const EXACT = new RegExp(`<span data-hl="(${HIGHLIGHTS.join("|")})">`);

test("a stray <, <span or > anywhere lets no highlight through", () => {
  const out = (md, want, why) => {
    const got = stripHighlights(md);
    assert.equal(got, want, why);
    assert.doesNotMatch(got, EXACT, why);
  };
  // Review b1-r3's two inputs.
  out("Use `<span` as the search prefix.\n\nThen <span data-hl=\"yellow\">private highlight</span>.",
    "Use `<span` as the search prefix.\n\nThen private highlight.", "after `<span` in inline code");
  out("```js\nconst prefix = \"<span\";\n```\n\n<span data-hl=\"pink\">marked prose</span>",
    "```js\nconst prefix = \"<span\";\n```\n\nmarked prose", "after \"<span\" in a fenced block");
  out("Use <span as a word, then <span data-hl=\"blue\">this</span>.", "Use <span as a word, then this.", "after a bare <span and a space");
  out("<span\t<span data-hl=\"green\">x</span>", "<span\tx", "<span and a tab, right before one");
  out("a < b <span data-hl=\"blue\">x</span> c > d", "a < b x c > d", "a < before and a > after");
  out("x > y <span data-hl=\"purple\">z</span>", "x > y z", "a > before");
  out("<span data-hl=\"green\">x</span> and <span", "x and <span", "a <span never closed after one");
  out("<spanx><span data-hl=\"yellow\">x</span></spanx>", "<spanx>x</spanx>", "<spanx> is not a span");
  out("<span title=\"a > b\">o</span> <span data-hl=\"blue\">ok</span>", "<span title=\"a > b\">o</span> ok", "a > in a quoted attribute");
  out("<span title=\"<b>\"><span data-hl=\"pink\">x</span>", "<span title=\"<b>\">x", "a < in a quoted attribute");
  out("<span class=\"x\"><span data-hl=\"pink\">a</span>", "<span class=\"x\">a", "a span never closed before one");
  out("<span data-hl=\"yel<span data-hl=\"pink\">low\">x</span>y</span>z", "xyz", "one that taking another out makes is taken out too");
  out("<span data-hl=\"yellow\"<span data-hl=\"yellow\">x</span>", "<span data-hl=\"yellow\"x", "half a tag before one stays as it is");
});

test("a span whose quoted attribute holds < or > is still a span, and no quote hides a highlight", () => {
  const out = (md, want, why) => {
    const got = stripHighlights(md);
    assert.equal(got, want, why);
    assert.doesNotMatch(got, EXACT, why);
  };
  // Review b1-final's input.
  out('<span data-hl="yellow"><span title="a < b">inside</span> after</span>',
    '<span title="a < b">inside</span> after', "a < in a quoted attribute of a span inside one");
  out('<span data-hl="pink"><span title="a > b">in</span> out</span>', '<span title="a > b">in</span> out',
    "a > in a quoted attribute of a span inside one");
  out("<span data-hl=\"blue\"><span title='x < y > z'>in</span> out</span>", "<span title='x < y > z'>in</span> out",
    "single quotes");
  out("<span data-hl=\"green\"><span title='say \"<\"' data-x=\"it's >\">in</span> out</span>",
    "<span title='say \"<\"' data-x=\"it's >\">in</span> out", "each kind of quote holding the other");
  out('<span title="oops><span data-hl="yellow">x</span> done', '<span title="oops>x done',
    "a quote never closed before one");
  out("<span title='oops><span data-hl=\"purple\">x</span> done", "<span title='oops>x done",
    "a single quote never closed before one");
  out('<span title="a <span data-hl="yellow">">x</span>', '<span title="a ">x', "one inside a closed quote");
  out("<span title='<span data-hl=\"pink\">'>x</span>", "<span title=''>x", "one inside a closed single quote");
  out('<span title="<SPAN>">x</span> <span data-hl="blue">y</span>', '<span title="<SPAN>">x</span> y',
    "a quote holding <span, in any case, does not make a tag; the <SPAN> in it is one");
});

test("fuzz: stray <, <span and >, unclosed tags and > in quotes: no highlight is left, and nothing else changes", () => {
  // The rule a character at a time, written apart from lib/publish.js: a tag
  // is `<span` and a space or `>`, then up to a `>` any characters but `<`,
  // `>` and quotes, or quoted strings ("…" or '…') with no `<span` in them,
  // or `</span` and spaces and `>`, in any case; a highlight is the exact
  // opening tag, and loses it and the `</span>` that closes it, counting
  // every span; again until none is left.
  const byHand = (md) => {
    for (;;) {
      const tags = [];
      for (let i = 0; i < md.length; i++) {
        if (md[i] !== "<") continue;
        const rest = md.slice(i);
        let len = 0;
        if (rest.slice(0, 5).toLowerCase() === "<span" && /[\s>]/.test(rest[5] ?? "")) {
          for (let j = 5; j < rest.length; j++) {
            if (rest[j] === ">") len = j + 1;
            if (rest[j] === ">" || rest[j] === "<") break;
            if (rest[j] !== '"' && rest[j] !== "'") continue;
            const k = rest.indexOf(rest[j], j + 1);
            if (k < 0 || rest.slice(j + 1, k).toLowerCase().includes("<span")) break;
            j = k;
          }
        } else if (rest.slice(0, 6).toLowerCase() === "</span") {
          let j = 6;
          while (/\s/.test(rest[j] ?? "")) j++;
          if (rest[j] === ">") len = j + 1;
        }
        if (!len) continue;
        tags.push({ at: i, end: i + len, closes: rest[1] === "/", hl: HIGHLIGHTS.some((c) => rest.startsWith(`<span data-hl="${c}">`)) });
        i += len - 1;
      }
      const stack = [];
      const gone = new Set();
      for (const t of tags) {
        if (!t.closes) stack.push(t);
        else if (stack.length) {
          const o = stack.pop();
          if (o.hl) gone.add(o).add(t);
        }
      }
      for (const o of stack) if (o.hl) gone.add(o);
      if (!gone.size) return md;
      let out = "";
      let at = 0;
      for (const t of tags) {
        if (!gone.has(t)) continue;
        out += md.slice(at, t.at);
        at = t.end;
      }
      md = out + md.slice(at);
    }
  };

  let seed = 0xb1f3;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  const fragments = [
    "<", ">", "<<", ">>", "<span", "<span ", "<span\t", "<span\n", "<SPAN ", "`<span`", "\"<span\"", "```\n<span\n```\n",
    "<spanx>", "<span-x>", "</spanx>", "</span", "</span>", "</SPAN >", "<span>", '<span class="x">', "<span\n>",
    '<span title="a > b">', '<span title="<b>">', "<span data-hl=\"", '<span data-hl="yel', 'low">', '">', '" >',
    "data-hl=\"pink\">", "pink", "plain words", " ", "\n", "\n\n", "a < b > c", "`", "<b>", "</b>", "<!-- <span -->",
    '<span title="a < b">', "<span title='a < b'>", "<span title='x > y'>", '<span title="it\'s">', "<span title='say \"hi\"'>",
    '<span title="', "<span title='", '<span a="<span">', "<span a='<SPAN'>", '<span title="<b>', "<span title='>",
    '"', "'", '""', "''", '"<"', "'>'", '"<span"', "'<span'", ' title="', "='",
  ];
  const tag = () => pick([...HIGHLIGHTS.map((c) => `<span data-hl="${c}">`), "<span>", '<span class="kbd">']);
  const gen = (depth) => {
    let md = "";
    for (let n = 1 + Math.floor(rand() * 7); n > 0; n--) {
      const r = rand();
      if (depth < 4 && r < 0.25) md += tag() + gen(depth + 1) + (rand() < 0.85 ? pick(["</span>", "</SPAN>", "</span >"]) : "");
      else md += pick(fragments);
    }
    return md;
  };
  let kept = 0;
  for (let i = 0; i < 5000; i++) {
    const md = gen(0);
    const got = stripHighlights(md);
    assert.equal(got, byHand(md), `case ${i}: ${JSON.stringify(md)}`);
    assert.doesNotMatch(got, EXACT, `case ${i}: ${JSON.stringify(md)}`);
    if (EXACT.test(md)) kept++;
  }
  assert.ok(kept > 2000, `most cases had a highlight to take out (${kept})`);
});

test("a file's git id is git's, and a publish's hash ignores highlights", () => {
  const d = { title: "T", date: "2026-01-01", summary: "S", body: "Some <span data-hl=\"yellow\">text</span>." };
  assert.equal(publishedSource(d), "---\ntitle: T\ndate: 2026-01-01\nsummary: S\n---\n\nSome text.");
  assert.equal(
    publishedSource({ ...d, title: '<span data-hl="pink">T</span>', summary: 'A <span data-hl="blue">short</span> one' }),
    "---\ntitle: T\ndate: 2026-01-01\nsummary: A short one\n---\n\nSome text.",
    "the title and summary lose theirs too",
  );
  assert.equal(
    publishedSource({ ...d, title: '<span data-hl="pink">T', summary: "S</span>" }),
    "---\ntitle: T\ndate: 2026-01-01\nsummary: S</span>\n---\n\nSome text.",
    "each field on its own: one never closed in the title does not take the summary's </span>",
  );
});
