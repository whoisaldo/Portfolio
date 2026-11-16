// test/github-snapshot.test.mjs: what scripts/github-snapshot.mjs keeps and
// drops. No network. Every repository, owner and title here is made up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublic, monitorStats, summarize, validate } from "../scripts/github-snapshot.mjs";

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
