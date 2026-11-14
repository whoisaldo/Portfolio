// test/budget.test.mjs: a draft's comments are held to what one answer from
// the stats service carries (src/front/private/budget.js), counted as JSON
// writes them. The editor never sends an anchors request the service could
// not take, and one it could take always fits a request. Every text is made up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ANCHORS_MOST, COMMENT_BYTES, anchorsTooLarge, bytesText, commentBytes, jsonBytes, overBudget } from "../src/front/private/budget.js";

const VERCEL_MOST = 4_500_000;
const thread = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const request = (anchors) => ({ draft: "a-made-up-draft", anchors, base: "2026-11-13T22:00:00.123456Z" });

test("a comment is counted as the service counts it: its texts as JSON writes them, and 1 KB", () => {
  assert.equal(jsonBytes("字"), 5);
  assert.equal(jsonBytes('a "b" \\ \n\t'), 17);
  const c = { body: "On it.", quote: { exact: "字字", prefix: "", suffix: "\n" }, anchor: { exact: "é", prefix: "", suffix: "" } };
  assert.equal(commentBytes(c), COMMENT_BYTES.each + 8 + 8 + 2 + 4 + 4 + 2 + 2);
  // A passage deleted is kept as an anchor of three empty texts.
  assert.equal(commentBytes({ ...c, anchor: { gone: true } }), COMMENT_BYTES.each + 8 + 8 + 2 + 4 + 6);
  assert.equal(commentBytes({ body: "x", quote: null }), COMMENT_BYTES.each + 3);
  assert.deepEqual([bytesText(1), bytesText(240_001), bytesText(1_000_000), bytesText(3_000_000), bytesText(3_200_001)], ["1 KB", "241 KB", "1 MB", "3 MB", "3.3 MB"]);
  assert.equal(overBudget(240_000, "Do this."), "That's 240 KB more than this draft's comments have room for: they hold 3 MB in all, so they always load at once. Do this.");
});

test("a suggestion is counted as its passage is, and an empty text as JSON writes it, as the service counts them", () => {
  const quote = { exact: "a cat", prefix: "", suffix: "." };
  const each = COMMENT_BYTES.each + 2 + 7 + 2 + 3;
  assert.equal(commentBytes({ body: "", quote, suggestion: "a dog" }), each + 7);
  assert.equal(commentBytes({ body: "", quote, suggestion: "字" }), each + 5);
  // A deletion's words, "", are '""'.
  assert.equal(commentBytes({ body: "", quote, suggestion: "" }), each + 2);
  // An ordinary comment has none.
  assert.equal(commentBytes({ body: "", quote, suggestion: null }), each);
  assert.equal(commentBytes({ body: "", quote }), each);
});

test("500 anchors of 5,000 wide characters are not sent: past the budget, and past what a request carries", () => {
  const anchors = Array.from({ length: 500 }, (_, i) => ({ thread: thread(i), exact: "字".repeat(5000), prefix: "字".repeat(64), suffix: "字".repeat(64) }));
  const body = request(anchors);
  assert.ok(jsonBytes(body) > 7_500_000 && jsonBytes(body) > VERCEL_MOST, `${jsonBytes(body)} bytes`);
  assert.equal(anchorsTooLarge(body), "That's 4.8 MB more than this draft's comments have room for: they hold 3 MB in all, so they always load at once. These passages' new places weren't saved: each comment keeps the place it had. Shorten the longest passages, or delete comments you're done with.");
});

test("an anchors request the service could take always fits one request, and is sent", () => {
  // Each anchor the service takes is counted in the budget with its comment's
  // 1 KB, which is more than the 79 bytes of its thread and keys here: so a
  // request it could take is never more than the budget and its envelope.
  for (const [what, text] of [["ASCII", (n) => "a".repeat(n)], ["wide", (n) => "字".repeat(Math.floor(n / 3))], ["escaped", (n) => '"\\'.repeat(Math.floor(n / 4))]]) {
    for (const count of [1, 100, 500]) {
      const per = Math.floor(COMMENT_BYTES.draft / count) - COMMENT_BYTES.each;
      const anchors = Array.from({ length: count }, (_, i) => ({ thread: thread(i), exact: text(Math.min(per - 6, 15_000)).slice(0, 5000), prefix: "", suffix: "" }));
      const counted = anchors.reduce((n, a) => n + commentBytes({ body: "", quote: null, anchor: a }) - 2, 0);
      const body = request(anchors);
      assert.ok(counted <= COMMENT_BYTES.draft, `${what} × ${count}: ${counted} counted`);
      assert.ok(jsonBytes(body) <= counted + 200, `${what} × ${count}: ${jsonBytes(body)} sent`);
      assert.ok(jsonBytes(body) < ANCHORS_MOST && ANCHORS_MOST < VERCEL_MOST);
      assert.equal(anchorsTooLarge(body), "", `${what} × ${count} is sent`);
    }
  }
});

test("comments as long as a comment can be, 5,000 characters, are counted whole, and as many as the budget holds still fit one request", async () => {
  const { toBatch } = await import("../src/front/private/review.js");
  for (const [what, c, bytes] of [["ASCII", "a", 1], ["wide", "字", 3], ["escaped", '"', 2]]) {
    const body = c.repeat(5000);
    assert.equal(commentBytes({ body, quote: null }), COMMENT_BYTES.each + 2 + 5000 * bytes, what);
    // Each with a passage as long as one can be, as many as the budget holds.
    const one = { id: thread(0), body, quote: { exact: c.repeat(5000), prefix: c.repeat(32), suffix: c.repeat(32) } };
    const fit = Math.floor(COMMENT_BYTES.draft / commentBytes(one));
    const list = Array.from({ length: fit }, (_, i) => ({ ...one, id: thread(i) }));
    assert.ok(list.reduce((n, x) => n + commentBytes(x), 0) <= COMMENT_BYTES.draft, what);
    assert.ok(jsonBytes({ draft: "a-made-up-draft", comments: toBatch(list) }) < VERCEL_MOST, `${what}: one request`);
  }
});
