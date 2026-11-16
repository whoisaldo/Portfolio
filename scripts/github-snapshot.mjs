// scripts/github-snapshot.mjs: refresh src/data/github.json from the GitHub API.
//
// Two things on the site are counts that change on their own: the pull
// requests Ali has had merged into other people's projects, and Eternal
// Monitor's stars, forks, releases and downloads. This asks GitHub for both
// and writes them to one JSON file that the site imports. The file is
// committed, so a local build, a fork or a build during a GitHub outage uses
// the last snapshot.
//
// It never fails a build. On any error it leaves the file as it is, prints a
// warning and exits 0. deploy.yml runs it before `npm run build`, on every
// push and once a day.
//
// Only public repositories go in. The search asks for `is:public`, and every
// repository it names is looked up again and dropped unless the API says it
// is public. The file, this script's output and its warnings never name a
// repository that did not pass that check: a warning prints only a message
// written in this file, never an error's own text, which can quote an answer
// that has not been checked.
//
//   GH_TOKEN=... node scripts/github-snapshot.mjs
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const AUTHOR = "whoisaldo";
// Owners whose repositories are his own or his studio's, so not "other
// people's projects".
export const OWN_USER = "whoisaldo";
export const OWN_ORG = "sidebandstudio";
export const OWN_OWNERS = [OWN_USER, OWN_ORG];
export const MONITOR_REPO = "sidebandstudio/EternalMonitor";
// Merged pull requests that are not contributions of code. This one adds his
// own site to a list of portfolios.
export const SKIP_REPOS = ["emmabostian/developer-portfolios"];

const OUT = fileURLToPath(new URL("../src/data/github.json", import.meta.url));
const API = "https://api.github.com";

/** An error whose message was written in this file, so it is safe to print. */
export class SnapshotError extends Error {}

const day = (iso) => (typeof iso === "string" ? iso.slice(0, 10) : null);
const ownerOf = (fullName) => fullName.split("/")[0].toLowerCase();
const repoFromUrl = (url) => url.replace(/^https:\/\/api\.github\.com\/repos\//, "");

/** True only for a repository the API reports as public. Anything missing or
 *  unclear counts as not public. */
export function isPublic(repo) {
  return Boolean(repo) && repo.private === false && (repo.visibility === undefined || repo.visibility === "public");
}

/**
 * The contributions block, from search results and repository lookups.
 * `items` are /search/issues results; `repos` maps "owner/name" to the
 * /repos/{owner}/{name} response, or null when the lookup failed. Grouped by
 * repository, most merged first, then most stars; each group's pull
 * requests newest first. Repositories named in `skip` are left out.
 */
export function summarize(items, repos, skip = SKIP_REPOS) {
  const skipped = new Set(skip.map((s) => s.toLowerCase()));
  const groups = new Map();
  for (const item of items) {
    if (!item?.pull_request?.merged_at || !item.repository_url) continue;
    const name = repoFromUrl(item.repository_url);
    if (OWN_OWNERS.includes(ownerOf(name))) continue;
    if (skipped.has(name.toLowerCase())) continue;
    if (item.user && item.user.login?.toLowerCase() !== AUTHOR) continue;
    const repo = repos[name];
    if (!isPublic(repo)) continue;
    if (!groups.has(name)) {
      groups.set(name, {
        repo: repo.full_name,
        url: repo.html_url,
        stars: repo.stargazers_count,
        pulls: [],
      });
    }
    groups.get(name).pulls.push({
      number: item.number,
      title: item.title,
      url: item.html_url,
      merged: day(item.pull_request.merged_at),
    });
  }
  return [...groups.values()]
    .map((g) => ({
      ...g,
      merged: g.pulls.length,
      pulls: g.pulls.sort((a, b) => (a.merged < b.merged ? 1 : a.merged > b.merged ? -1 : b.number - a.number)),
    }))
    .sort((a, b) => b.merged - a.merged || b.stars - a.stars || a.repo.localeCompare(b.repo))
    .map(({ repo, url, stars, merged, pulls }) => ({ repo, url, stars, merged, pulls }));
}

/** Eternal Monitor's numbers, from its repository, every release and the
 *  latest release. */
export function monitorStats(repo, releases, latest) {
  const published = releases.filter((r) => !r.draft);
  return {
    repo: repo.full_name,
    url: repo.html_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    releases: published.length,
    downloads: published.reduce((sum, r) => sum + (r.assets ?? []).reduce((s, a) => s + (a.download_count ?? 0), 0), 0),
    latest: { tag: latest.tag_name, date: day(latest.published_at), url: latest.html_url },
  };
}

/** Refuses a snapshot with anything missing, so a half-answered run cannot
 *  replace a good file. */
export function validate(snapshot) {
  const n = (v) => Number.isInteger(v) && v >= 0;
  const m = snapshot.eternalMonitor;
  if (!m || ![m.stars, m.forks, m.releases, m.downloads].every(n) || !m.latest?.tag || !m.latest?.date) {
    throw new SnapshotError("incomplete Eternal Monitor numbers");
  }
  for (const g of snapshot.contributions) {
    if (!g.repo || !g.url || !n(g.stars) || g.merged !== g.pulls.length) throw new SnapshotError("incomplete contribution group");
    for (const p of g.pulls) if (!n(p.number) || !p.title || !p.url || !p.merged) throw new SnapshotError("incomplete pull request");
  }
  return snapshot;
}

/**
 * Every result of a search, or an error. `page(n)` answers page n of
 * /search/issues at 100 a page. A page that comes back empty before the
 * reported total is reached, or a total past the 1,000 results the API pages
 * through, is not a full answer and must not replace a good file.
 */
export async function searchAll(page) {
  const items = [];
  for (let n = 1; n <= 10; n++) {
    const res = await page(n);
    if (!res || res.incomplete_results || !Array.isArray(res.items) || !Number.isInteger(res.total_count)) {
      throw new SnapshotError("pull request search: incomplete results");
    }
    if (res.total_count > 1000) throw new SnapshotError("pull request search: more results than the API returns");
    items.push(...res.items);
    if (items.length >= res.total_count) return items;
    if (res.items.length === 0) break;
  }
  throw new SnapshotError("pull request search: fewer results than it reported");
}

/** Refuses a snapshot that lists no contributions when the file it would
 *  replace lists some. Merged pull requests do not all disappear at once; a
 *  search that answered nothing does. */
export function refuseEmptied(snapshot, previous) {
  if (snapshot.contributions.length === 0 && previous?.contributions?.length > 0) {
    throw new SnapshotError("pull request search: came back empty");
  }
  return snapshot;
}

/** Writes the file whole or not at all: to a neighbour first, then renamed
 *  over the old one, so a write that fails partway leaves the old file. */
export function writeSnapshot(file, snapshot) {
  const tmp = `${file}.tmp`;
  try {
    writeFileSync(tmp, `${JSON.stringify(snapshot, null, 2)}\n`);
    renameSync(tmp, file);
  } catch {
    try {
      rmSync(tmp, { force: true });
    } catch {
      // Nothing of ours to clear away.
    }
    throw new SnapshotError("could not write the snapshot");
  }
}

function readPrevious(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// `label` never carries a contributed repository's name, and neither a
// network error's text nor a parser's is passed on; see the top.
async function get(path, token, label) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "portfolio-github-snapshot",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new SnapshotError(`${label}: no answer`);
  }
  if (!res.ok) throw Object.assign(new SnapshotError(`${label}: HTTP ${res.status}`), { status: res.status });
  try {
    return await res.json();
  } catch {
    throw new SnapshotError(`${label}: unreadable answer`);
  }
}

async function fetchSnapshot(token) {
  const q = encodeURIComponent(`author:${AUTHOR} type:pr is:merged is:public -user:${OWN_USER} -org:${OWN_ORG}`);
  const items = await searchAll((page) => get(`/search/issues?q=${q}&per_page=100&page=${page}`, token, "pull request search"));

  const repos = {};
  for (const name of new Set(items.map((i) => repoFromUrl(i.repository_url)))) {
    if (OWN_OWNERS.includes(ownerOf(name))) continue;
    try {
      repos[name] = await get(`/repos/${name}`, token, "repository lookup");
    } catch (err) {
      // Not found means not visible to this token, so not public to anyone
      // either: leave it out. Anything else is a real failure.
      if (err.status === 404) repos[name] = null;
      else throw err;
    }
  }

  const monitor = await get(`/repos/${MONITOR_REPO}`, token, "Eternal Monitor repository");
  const releases = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await get(`/repos/${MONITOR_REPO}/releases?per_page=100&page=${page}`, token, "Eternal Monitor releases");
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  const latest = await get(`/repos/${MONITOR_REPO}/releases/latest`, token, "Eternal Monitor latest release");

  return validate({
    updated: new Date().toISOString().slice(0, 10),
    author: AUTHOR,
    contributions: summarize(items, repos),
    eternalMonitor: monitorStats(monitor, releases, latest),
  });
}

export async function main(file = OUT) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  try {
    const snapshot = refuseEmptied(await fetchSnapshot(token), readPrevious(file));
    writeSnapshot(file, snapshot);
    const prs = snapshot.contributions.reduce((s, g) => s + g.merged, 0);
    const m = snapshot.eternalMonitor;
    console.log(
      `github-snapshot: ${prs} merged pull requests in ${snapshot.contributions.length} repositories; ` +
        `Eternal Monitor ${m.stars} stars, ${m.releases} releases, ${m.downloads} downloads`,
    );
  } catch (err) {
    const why = err instanceof SnapshotError ? err.message : "unexpected error";
    console.warn(`github-snapshot: warning: ${why}; kept the last snapshot in src/data/github.json`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
