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
// repository that did not pass that check.
//
//   GH_TOKEN=... node scripts/github-snapshot.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const AUTHOR = "whoisaldo";
// Owners whose repositories are his own or his studio's, so not "other
// people's projects".
export const OWN_USER = "whoisaldo";
export const OWN_ORG = "sidebandstudio";
export const OWN_OWNERS = [OWN_USER, OWN_ORG];
export const MONITOR_REPO = "sidebandstudio/EternalMonitor";

const OUT = fileURLToPath(new URL("../src/data/github.json", import.meta.url));
const API = "https://api.github.com";

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
 * requests newest first.
 */
export function summarize(items, repos) {
  const groups = new Map();
  for (const item of items) {
    if (!item?.pull_request?.merged_at || !item.repository_url) continue;
    const name = repoFromUrl(item.repository_url);
    if (OWN_OWNERS.includes(ownerOf(name))) continue;
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
    throw new Error("incomplete Eternal Monitor numbers");
  }
  for (const g of snapshot.contributions) {
    if (!g.repo || !g.url || !n(g.stars) || g.merged !== g.pulls.length) throw new Error("incomplete contribution group");
    for (const p of g.pulls) if (!n(p.number) || !p.title || !p.url || !p.merged) throw new Error("incomplete pull request");
  }
  return snapshot;
}

async function get(path, token, label) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "portfolio-github-snapshot",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  // `label` never carries a contributed repository's name; see the top.
  if (!res.ok) throw Object.assign(new Error(`${label}: HTTP ${res.status}`), { status: res.status });
  return res.json();
}

async function fetchSnapshot(token) {
  const q = encodeURIComponent(`author:${AUTHOR} type:pr is:merged is:public -user:${OWN_USER} -org:${OWN_ORG}`);
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const res = await get(`/search/issues?q=${q}&per_page=100&page=${page}`, token, "pull request search");
    if (res.incomplete_results) throw new Error("pull request search: incomplete results");
    items.push(...res.items);
    if (res.items.length < 100 || items.length >= res.total_count) break;
  }

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

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  try {
    const snapshot = await fetchSnapshot(token);
    writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
    const prs = snapshot.contributions.reduce((s, g) => s + g.merged, 0);
    const m = snapshot.eternalMonitor;
    console.log(
      `github-snapshot: ${prs} merged pull requests in ${snapshot.contributions.length} repositories; ` +
        `Eternal Monitor ${m.stars} stars, ${m.releases} releases, ${m.downloads} downloads`,
    );
  } catch (err) {
    console.warn(`github-snapshot: warning: ${err.message}; kept the last snapshot in src/data/github.json`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
