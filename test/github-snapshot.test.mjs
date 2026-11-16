// test/github-snapshot.test.mjs: what scripts/github-snapshot.mjs keeps and
// drops. No network. Every repository, owner and title here is made up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SnapshotError, isPublic, main, monitorStats, refuseEmptied, searchAll, summarize, validate, writeSnapshot,
} from "../scripts/github-snapshot.mjs";

const pr = (repo, number, merged, title = `Change ${number}`) => ({
  repository_url: `https://api.github.com/repos/${repo}`,
  html_url: `https://github.com/${repo}/pull/${number}`,
  number,
  title,
  user: { login: "whoisaldo" },
  pull_request: { merged_at: merged },
});

const repo = (full_name, stars, extra = {}) => ({
  full_name,
  html_url: `https://github.com/${full_name}`,
  stargazers_count: stars,
  private: false,
  visibility: "public",
  ...extra,
});

test("a repository the API reports as private is dropped, whatever the search said", () => {
  const items = [
    pr("example-org/open-widget", 1, "2026-01-02T00:00:00Z"),
    pr("example-org/closed-widget", 2, "2026-01-03T00:00:00Z", "Secret title"),
    pr("example-org/internal-widget", 3, "2026-01-04T00:00:00Z"),
  ];
  const repos = {
    "example-org/open-widget": repo("example-org/open-widget", 10),
    "example-org/closed-widget": repo("example-org/closed-widget", 0, { private: true, visibility: "private" }),
    "example-org/internal-widget": repo("example-org/internal-widget", 0, { visibility: "internal" }),
  };
  const out = summarize(items, repos);
  assert.deepEqual(out.map((g) => g.repo), ["example-org/open-widget"]);
  const text = JSON.stringify(out);
  assert.ok(!text.includes("closed-widget"));
  assert.ok(!text.includes("Secret title"));
  assert.ok(!text.includes("internal-widget"));
});

test("a repository that could not be looked up, or is missing, is dropped", () => {
  const items = [pr("example-org/gone", 1, "2026-01-02T00:00:00Z"), pr("example-org/unasked", 2, "2026-01-02T00:00:00Z")];
  assert.deepEqual(summarize(items, { "example-org/gone": null }), []);
});

test("isPublic needs an explicit private: false", () => {
  assert.equal(isPublic(undefined), false);
  assert.equal(isPublic({}), false);
  assert.equal(isPublic({ private: "false" }), false);
  assert.equal(isPublic({ private: false }), true);
  assert.equal(isPublic({ private: false, visibility: "private" }), false);
});

test("his own repositories and the studio's are left out, in any case", () => {
  const items = [
    pr("whoisaldo/side-thing", 1, "2026-01-02T00:00:00Z"),
    pr("WhoIsAldo/other-thing", 2, "2026-01-02T00:00:00Z"),
    pr("sidebandstudio/product", 3, "2026-01-02T00:00:00Z"),
    pr("example-org/open-widget", 4, "2026-01-02T00:00:00Z"),
  ];
  const repos = {
    "whoisaldo/side-thing": repo("whoisaldo/side-thing", 1),
    "WhoIsAldo/other-thing": repo("WhoIsAldo/other-thing", 1),
    "sidebandstudio/product": repo("sidebandstudio/product", 1),
    "example-org/open-widget": repo("example-org/open-widget", 1),
  };
  assert.deepEqual(summarize(items, repos).map((g) => g.repo), ["example-org/open-widget"]);
});

test("unmerged pull requests and other authors' are left out", () => {
  const open = { ...pr("example-org/open-widget", 1, null), pull_request: { merged_at: null } };
  const theirs = { ...pr("example-org/open-widget", 2, "2026-01-02T00:00:00Z"), user: { login: "someone-else" } };
  assert.deepEqual(summarize([open, theirs], { "example-org/open-widget": repo("example-org/open-widget", 1) }), []);
});

test("groups by repository: most merged first, then stars; newest pull request first", () => {
  const items = [
    pr("example-org/small", 1, "2026-03-01T10:00:00Z"),
    pr("example-org/big", 5, "2026-01-01T10:00:00Z"),
    pr("example-org/busy", 7, "2026-02-01T10:00:00Z"),
    pr("example-org/busy", 9, "2026-04-01T10:00:00Z"),
  ];
  const repos = {
    "example-org/small": repo("example-org/small", 5),
    "example-org/big": repo("example-org/big", 900),
    "example-org/busy": repo("example-org/busy", 50),
  };
  const out = summarize(items, repos);
  assert.deepEqual(out.map((g) => [g.repo, g.merged]), [["example-org/busy", 2], ["example-org/big", 1], ["example-org/small", 1]]);
  assert.deepEqual(out[0].pulls, [
    { number: 9, title: "Change 9", url: "https://github.com/example-org/busy/pull/9", merged: "2026-04-01" },
    { number: 7, title: "Change 7", url: "https://github.com/example-org/busy/pull/7", merged: "2026-02-01" },
  ]);
  assert.equal(out[0].stars, 50);
  assert.doesNotThrow(() => validate({ contributions: out, eternalMonitor: monitorStats(repo("a/b", 1, { forks_count: 0 }), [], { tag_name: "v1", published_at: "2026-01-01T00:00:00Z" }) }));
});

test("release numbers add every asset of every published release", () => {
  const releases = [
    { draft: false, assets: [{ download_count: 3 }, { download_count: 4 }] },
    { draft: false, assets: [] },
    { draft: true, assets: [{ download_count: 100 }] },
  ];
  const m = monitorStats(repo("example-org/display", 12, { forks_count: 2 }), releases, {
    tag_name: "v2.0.0",
    published_at: "2026-05-06T07:08:09Z",
    html_url: "https://github.com/example-org/display/releases/tag/v2.0.0",
  });
  assert.equal(m.stars, 12);
  assert.equal(m.forks, 2);
  assert.equal(m.releases, 2);
  assert.equal(m.downloads, 7);
  assert.deepEqual(m.latest, { tag: "v2.0.0", date: "2026-05-06", url: "https://github.com/example-org/display/releases/tag/v2.0.0" });
});

test("a snapshot with missing numbers is refused, so the last good file stays", () => {
  assert.throws(() => validate({ contributions: [], eternalMonitor: { stars: 1, forks: 1, releases: 1, latest: { tag: "v1", date: "2026-01-01" } } }));
  assert.throws(() => validate({ contributions: [{ repo: "a/b", url: "u", stars: 1, merged: 2, pulls: [] }], eternalMonitor: { stars: 1, forks: 1, releases: 1, downloads: 1, latest: { tag: "v1", date: "2026-01-01" } } }));
});

test("a repository on the skip list is left out, in any case", () => {
  const items = [pr("example-org/link-list", 1, "2026-01-02T00:00:00Z"), pr("example-org/open-widget", 2, "2026-01-02T00:00:00Z")];
  const repos = {
    "example-org/link-list": repo("example-org/link-list", 9000),
    "example-org/open-widget": repo("example-org/open-widget", 1),
  };
  assert.deepEqual(summarize(items, repos, ["Example-Org/Link-List"]).map((g) => g.repo), ["example-org/open-widget"]);
});

test("a search is taken only when every reported result arrived", async () => {
  const full = (n) => Array.from({ length: n }, (_, i) => ({ number: i }));
  const pages = (list) => async (n) => list[n - 1];

  const two = await searchAll(pages([{ total_count: 130, items: full(100) }, { total_count: 130, items: full(30) }]));
  assert.equal(two.length, 130);
  assert.deepEqual(await searchAll(pages([{ total_count: 0, items: [] }])), []);

  // Thirteen reported and none sent.
  await assert.rejects(searchAll(pages([{ total_count: 13, items: [] }])), SnapshotError);
  // More than the API pages through.
  await assert.rejects(searchAll(pages([{ total_count: 1001, items: full(100) }])), SnapshotError);
  await assert.rejects(searchAll(pages([{ total_count: 5, items: full(5), incomplete_results: true }])), SnapshotError);
  await assert.rejects(searchAll(pages([{ message: "not a search answer" }])), SnapshotError);
});

test("a snapshot with no contributions does not replace one that has some", () => {
  const empty = { contributions: [] };
  assert.throws(() => refuseEmptied(empty, { contributions: [{ repo: "example-org/open-widget" }] }), SnapshotError);
  assert.equal(refuseEmptied(empty, null), empty);
  assert.equal(refuseEmptied(empty, { contributions: [] }), empty);
});

test("the file is written whole, and a write that fails leaves the old one", () => {
  const dir = mkdtempSync(join(tmpdir(), "github-snapshot-"));
  const file = join(dir, "github.json");
  try {
    writeSnapshot(file, { a: 1 });
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), { a: 1 });
    assert.deepEqual(readdirSync(dir), ["github.json"]);

    // The neighbour it writes first cannot be written: a folder has its name.
    mkdirSync(`${file}.tmp`);
    assert.throws(() => writeSnapshot(file, { a: 2 }), SnapshotError);
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), { a: 1 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a warning never repeats an error's own text, which can quote an unchecked answer", async () => {
  const dir = mkdtempSync(join(tmpdir(), "github-snapshot-"));
  const file = join(dir, "github.json");
  const kept = '{"kept":true}\n';
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  const warned = [];
  console.warn = (line) => warned.push(String(line));
  try {
    // An answer cut off mid-way: the parser's own message quotes it.
    writeFileSync(file, kept);
    globalThis.fetch = async () => new Response('{"items":[{"repository_url":"https://api.github.com/repos/example-org/closed-widget"', { status: 200 });
    await main(file);
    // A request that fails with a message naming a repository.
    globalThis.fetch = async () => {
      throw new Error("could not reach example-org/closed-widget");
    };
    await main(file);
  } finally {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
  }
  try {
    assert.equal(warned.length, 2);
    assert.match(warned[0], /pull request search: unreadable answer/);
    assert.match(warned[1], /pull request search: no answer/);
    assert.ok(warned.every((line) => !line.includes("closed-widget")));
    assert.equal(readFileSync(file, "utf8"), kept);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
