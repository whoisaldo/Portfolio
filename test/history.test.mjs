// test/history.test.mjs: the version history's names and comparing, a new
// draft's address, and the Publish button's state and messages. Made-up
// text throughout.
import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { blockDiff, byDay, kindLabel, textBlocks, wordDiff } from "../src/front/private/editor/versions.js";
import { addressFrom, isAddress, today, typedAddress } from "../src/front/private/editor/address.js";
import { publicText, publishState, stripHighlights } from "../src/front/private/published.js";
import { formatSize, publishError } from "../src/front/private/editor/publishing.js";

const blocks = (md) => textBlocks(marked.parse(md));
const summary = (diff) => diff.map((b) => `${b.change}:${b.type}:${b.change === "changed" ? b.parts.map((p) => (p.change === "same" ? p.text : p.change === "added" ? `+[${p.text}]` : `-[${p.text}]`)).join("") : b.text || b.label}`);

test("each kind of revision has a plain name", () => {
  assert.equal(kindLabel("autosave"), "Edits");
  assert.equal(kindLabel("manual"), "Saved version");
  assert.equal(kindLabel("restore"), "Restored");
  assert.equal(kindLabel("upload"), "Uploaded");
  assert.equal(kindLabel("original"), "Before editing");
  assert.equal(kindLabel("something-new"), "Saved");
});

test("revisions are grouped by local day, newest first", () => {
  const now = new Date(2026, 9, 29, 15, 0);
  const at = (d, h) => new Date(2026, 9, d, h, 30).toISOString();
  const groups = byDay(
    [
      { id: 5, at: at(29, 14) },
      { id: 4, at: at(29, 9) },
      { id: 3, at: at(28, 22) },
      { id: 2, at: at(27, 8) },
      { id: 1, at: new Date(2025, 11, 31, 12).toISOString() },
    ],
    now,
  );
  assert.deepEqual(
    groups.map((g) => [g.label, g.items.map((r) => r.id)]),
    [
      ["Today", [5, 4]],
      ["Yesterday", [3]],
      ["Tuesday, October 27", [2]],
      ["December 31, 2025", [1]],
    ],
  );
  assert.deepEqual(byDay([], now), []);
});

test("rendered text splits into headings, paragraphs, list items, captions and media", () => {
  const html =
    marked.parse("## A heading\n\nOne *small* paragraph\nwrapped.\n\n- first item\n- second item\n    1. inside\n\n![a cat](/blog/x/cat.jpg)\n\n") +
    '<figure><video src="/blog/x/reel.mp4"></video><figcaption>A caption</figcaption></figure>\n<div data-embed="toy"></div>';
  assert.deepEqual(textBlocks(html), [
    { type: "h2", text: "A heading" },
    { type: "p", text: "One small paragraph wrapped." },
    { type: "li", list: "ul", text: "first item" },
    { type: "li", list: "ul", text: "second item" },
    { type: "li", list: "ol", text: "inside" },
    { type: "media", text: "", label: "Picture", key: "/blog/x/cat.jpg" },
    { type: "media", text: "", label: "Video", key: "/blog/x/reel.mp4" },
    { type: "caption", text: "A caption" },
    { type: "media", text: "", label: "Live embed", key: "toy" },
  ]);
});

test("a line break inside a paragraph is a space between its words", () => {
  assert.deepEqual(textBlocks("<p>one<br>two</p>"), [{ type: "p", text: "one two" }]);
});

test("an unchanged text compares as all the same", () => {
  const md = "## Title\n\nSome words here.\n\n- a list item\n";
  assert.ok(blockDiff(blocks(md), blocks(md)).every((b) => b.change === "same"));
});

test("an edited paragraph is one block with its changed words", () => {
  const diff = blockDiff(blocks("The quick brown fox jumps.\n\nAnother line."), blocks("The slow brown fox jumps.\n\nAnother line."));
  assert.deepEqual(summary(diff), ["changed:p:The -[quick]+[slow] brown fox jumps.", "same:p:Another line."]);
});

test("Markdown punctuation that renders the same is no change", () => {
  // Emphasis moved and the paragraph rewrapped: the rendered words are the same.
  const diff = blockDiff(blocks("Some **bold** words\nwrapped here."), blocks("Some bold _words_ wrapped here."));
  assert.deepEqual(summary(diff), ["same:p:Some bold words wrapped here."]);
});

test("a new paragraph between two is added whole, the others stay", () => {
  const diff = blockDiff(blocks("First paragraph.\n\nThird paragraph."), blocks("First paragraph.\n\nA brand new one in between.\n\nThird paragraph."));
  assert.deepEqual(summary(diff), ["same:p:First paragraph.", "added:p:A brand new one in between.", "same:p:Third paragraph."]);
});

test("a paragraph deleted is removed whole, where it was", () => {
  const diff = blockDiff(blocks("Keep this.\n\nDrop this one.\n\nKeep that."), blocks("Keep this.\n\nKeep that."));
  assert.deepEqual(summary(diff), ["same:p:Keep this.", "removed:p:Drop this one.", "same:p:Keep that."]);
});

test("a replaced paragraph unlike the old is removed and added, not compared word by word", () => {
  const diff = blockDiff(blocks("Alpha beta gamma delta."), blocks("Completely different sentence now."));
  assert.deepEqual(summary(diff), ["removed:p:Alpha beta gamma delta.", "added:p:Completely different sentence now."]);
});

test("an edited paragraph is found past a new one inserted before it", () => {
  const diff = blockDiff(blocks("Intro.\n\nThe river runs past the old mill at dawn.\n\nEnd."), blocks("Intro.\n\nA new paragraph.\n\nThe river runs past the old mill at dusk.\n\nEnd."));
  assert.deepEqual(summary(diff), [
    "same:p:Intro.",
    "added:p:A new paragraph.",
    "changed:p:The river runs past the old mill at -[dawn]+[dusk].",
    "same:p:End.",
  ]);
});

test("a paragraph made a heading is its words compared, as the heading", () => {
  const diff = blockDiff(blocks("Section one\n\nBody."), blocks("## Section one\n\nBody."));
  assert.deepEqual(summary(diff), ["changed:h2:Section one", "same:p:Body."]);
});

test("list items are compared one by one", () => {
  const diff = blockDiff(blocks("- apples\n- pears\n- plums\n"), blocks("- apples\n- ripe pears\n- plums\n- figs\n"));
  assert.deepEqual(summary(diff), ["same:li:apples", "changed:li:+[ripe ]pears", "same:li:plums", "added:li:figs"]);
});

test("a picture added is a media block added", () => {
  const diff = blockDiff(blocks("Text."), blocks("Text.\n\n![](/blog/x/new.png)"));
  assert.deepEqual(summary(diff), ["same:p:Text.", "added:media:Picture"]);
});

test("wordDiff marks words added and removed", () => {
  assert.deepEqual(wordDiff("a b c", "a x c"), [
    { text: "a ", change: "same" },
    { text: "b", change: "removed" },
    { text: "x", change: "added" },
    { text: " c", change: "same" },
  ]);
});

test("a new draft's address comes from its title", () => {
  assert.equal(addressFrom("Hello, World!"), "hello-world");
  assert.equal(addressFrom("  Ali's  Harbour Notes -- part 2  "), "alis-harbour-notes-part-2");
  assert.equal(addressFrom("Café crème brûlée"), "cafe-creme-brulee");
  assert.equal(addressFrom("Über straße, Ærø"), "uber-strasse-aero");
  assert.equal(addressFrom("!!!"), "");
  assert.equal(addressFrom("日本語"), "");
  const long = addressFrom("word ".repeat(40));
  assert.ok(long.length <= 80 && isAddress(long) && long.endsWith("word"), long);
  assert.equal(addressFrom("x".repeat(100)).length, 80);
});

test("an address typed is kept lowercase with single hyphens", () => {
  assert.equal(typedAddress("My Post"), "my-post");
  assert.equal(typedAddress("my--post"), "my-post");
  assert.equal(typedAddress("-lead"), "lead");
  assert.equal(typedAddress("trailing-"), "trailing-");
  assert.equal(typedAddress("a_b.c"), "a-b-c");
});

test("isAddress takes the stats service's slugs only", () => {
  for (const ok of ["a", "post-1", "a-b-c", "x".repeat(80)]) assert.ok(isAddress(ok), ok);
  for (const bad of ["", "-a", "a-", "a--b", "A", "a b", "a_b", "x".repeat(81), null]) assert.ok(!isAddress(bad), String(bad));
});

test("today is the local date", () => {
  assert.equal(today(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(today(new Date(2026, 11, 31, 0, 1)), "2026-12-31");
});

test("highlights are unwrapped as publishing unwraps them, and nothing else", () => {
  assert.equal(stripHighlights('a <span data-hl="yellow">b</span> c'), "a b c");
  assert.equal(stripHighlights('<span data-hl="pink"><span class="x">in</span></span>'), '<span class="x">in</span>');
  assert.equal(stripHighlights('<span class="keep">k</span>'), '<span class="keep">k</span>');
  assert.equal(stripHighlights('<span data-hl="blue">never closed'), "never closed");
  assert.equal(stripHighlights('<span data-hl="red">not a colour</span>'), '<span data-hl="red">not a colour</span>');
});

test("the publish state says whether the public post is the draft as it is", () => {
  const d = { slug: "made-up", title: "T", date: "2026-10-29", summary: "S", body: "Words." };
  const basis = publicText(d);
  const p = { sha: "abc", url: "u", at: "2026-10-29T12:00:00Z", current: true };
  assert.deepEqual(publishState(null, d, null), { state: "none", label: "Not published", action: "Publish" });
  assert.equal(publishState(p, d, basis).state, "current");
  assert.equal(publishState(p, d, basis).label, "Published · up to date");
  assert.equal(publishState(p, d, basis).live, "https://aliyounes.dev/blog/made-up/");
  // A highlight is not in the public copy.
  assert.equal(publishState(p, { ...d, body: '<span data-hl="green">Words.</span>' }, basis).state, "current");
  const edited = publishState(p, { ...d, body: "Other words." }, basis);
  assert.deepEqual([edited.state, edited.label, edited.action], ["changed", "Published · changed since", "Update public post"]);
  assert.equal(publishState(p, { ...d, title: "T2" }, basis).state, "changed");
  // Known only as not current: changed, whatever the text.
  assert.equal(publishState({ ...p, current: false }, d, null).state, "changed");
});

test("publish errors read plainly", () => {
  const err = (status, message = "") => Object.assign(new Error(message), { status });
  assert.equal(publishError(err(503, "Publishing isn't set up yet."), "p"), "Publishing isn't set up yet. Add GITHUB_PUBLISH_TOKEN to the stats service.");
  assert.match(publishError(err(503, "Publishing isn't set up yet: the database needs its migration."), "p"), /migration/);
  assert.match(publishError(err(409, "Another post"), "made-up"), /\/blog\/made-up\/.*Nothing was published/);
  assert.equal(publishError(err(409, "A publish is already running."), "p"), "A publish is already running. Nothing was published.");
  assert.match(publishError(err(502, "GitHub: Bad credentials"), "p"), /^GitHub didn't take it \(Bad credentials\)/);
  assert.match(publishError(err(0, "x"), "p"), /Couldn't reach/);
  assert.equal(publishError(err(500, "Something broke."), "p"), "Something broke.");
});

test("sizes read as Finder shows them", () => {
  assert.equal(formatSize(512), "512 B");
  assert.equal(formatSize(15_374), "15.4 KB");
  assert.equal(formatSize(31_250_000), "31.3 MB");
});
