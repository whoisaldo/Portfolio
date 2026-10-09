// The handlers end to end, against a real Postgres.
//
//   TEST_DATABASE_URL=postgres://localhost/ay_stats_test npm test
//
// Skipped without TEST_DATABASE_URL. The database is emptied first, so point
// it at a scratch database, never the production one.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";

const DB = process.env.TEST_DATABASE_URL;
const skip = !DB && "TEST_DATABASE_URL not set";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const ORIGIN = "https://aliyounes.dev";

let sql, collect, query, admin, auth, go, dueAlerts;
let hook, hookPosts = [];

before(async () => {
  if (skip) return;
  process.env.DATABASE_URL = DB;
  process.env.STATS_KEY = "test-password";
  // Alerts go to a local server standing in for Discord.
  hook = http.createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => { hookPosts.push(JSON.parse(b)); res.end(); });
  });
  await new Promise((r) => hook.listen(0, "127.0.0.1", r));
  process.env.DISCORD_WEBHOOK_URL = `http://127.0.0.1:${hook.address().port}/hook`;

  ({ sql } = await import("../lib/db.js"));
  ({ default: collect, dueAlerts } = await import("../api/collect.js"));
  ({ default: query } = await import("../api/query.js"));
  ({ default: admin } = await import("../api/admin.js"));
  ({ default: auth } = await import("../api/auth.js"));
  ({ default: go } = await import("../api/go.js"));
  await sql`TRUNCATE visitor, session, event, link, hit RESTART IDENTITY CASCADE`;
});

after(() => hook?.close());

/** Calls a handler with a Vercel-shaped request and a recording response. */
async function call(handler, { method = "POST", headers = {}, body, query: q = {} } = {}) {
  const res = {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    end(b) { if (b !== undefined) this.body = b; return this; },
  };
  await handler({ method, headers: { "user-agent": CHROME, "x-real-ip": "127.0.0.1", ...headers }, body, query: q }, res);
  return res;
}

const beacon = (body, headers = {}) =>
  call(collect, { headers: { origin: ORIGIN, ...headers }, body: JSON.stringify(body) });

const until = async (fn, ms = 3000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
};

let cookie = "";

test("a visit is recorded with place, landing and a browser-timed event", { skip }, async () => {
  const sid = crypto.randomUUID();
  const ts = Date.now() - 5000;
  const res = await beacon(
    {
      sid, vid: "v-recruiter", path: "/recruiters", ref: "https://app.greenhouse.io/x",
      vw: 1440, vh: 900, sw: 1512, sh: 982, tz: "America/Los_Angeles", lang: "en-US",
      scroll: 10, ms: 1200, events: [{ t: "pageview", n: "Ali", p: "/recruiters", ts }],
    },
    { "x-vercel-ip-city": "Seattle", "x-vercel-ip-country-region": "WA", "x-vercel-ip-country": "US" },
  );
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["access-control-allow-origin"], ORIGIN);

  const [s] = await sql`SELECT * FROM session WHERE id = ${sid}`;
  assert.equal(s.city, "Seattle");
  assert.equal(s.shell, "plain");
  assert.equal(s.referrer_host, "app.greenhouse.io");
  assert.equal(s.client_tz, "America/Los_Angeles");
  assert.equal(s.ip, "127.0.0.1");
  assert.equal(s.is_bot, false);
  const [e] = await sql`SELECT * FROM event WHERE session_id = ${sid}`;
  assert.equal(new Date(e.at).getTime(), ts, "event keeps the browser's timestamp");

  // A second batch moves engagement forward and never back.
  await beacon({ sid, vid: "v-recruiter", path: "/recruiters", scroll: 60, ms: 30000, events: [{ t: "resume", n: "/resume.pdf" }] });
  await beacon({ sid, vid: "v-recruiter", path: "/recruiters", scroll: 20, ms: 9000, events: [] });
  const [s2] = await sql`SELECT * FROM session WHERE id = ${sid}`;
  assert.equal(s2.max_scroll_pct, 60);
  assert.equal(s2.total_ms, 30000);
  assert.equal(s2.resume_hits, 1);
  assert.equal(s2.event_count, 2);
});

test("the live site's current beacon format still works", { skip }, async () => {
  const sid = crypto.randomUUID();
  // Parsed JSON body, no timestamps, no new fields: what aliyounes.dev sends today.
  await call(collect, {
    headers: { origin: ORIGIN },
    body: { sid, vid: "v-old", path: "/", ref: null, vw: 1280, vh: 800, scroll: 0, ms: 0, deepest: null, events: [{ t: "pageview", n: "x", p: "/" }] },
  });
  const [s] = await sql`SELECT shell, visitor_id FROM session WHERE id = ${sid}`;
  assert.deepEqual(s, { shell: "cinematic", visitor_id: "v-old" });
});

test("a returning visitor is counted, and a blocked-storage visitor still gets an id", { skip }, async () => {
  await beacon({ sid: crypto.randomUUID(), vid: "v-recruiter", path: "/", events: [] });
  const [v] = await sql`SELECT sessions FROM visitor WHERE id = 'v-recruiter'`;
  assert.equal(v.sessions, 2);

  const sid = crypto.randomUUID();
  await beacon({ sid, path: "/", events: [] });
  const [s] = await sql`SELECT visitor_id FROM session WHERE id = ${sid}`;
  assert.match(s.visitor_id, /^ipua:/);
});

test("robots are flagged; a datacentre visit that reads like a person is not", { skip }, async () => {
  const bot = crypto.randomUUID();
  await beacon({ sid: bot, vid: "v-bot", path: "/", events: [] }, { "user-agent": "Googlebot/2.1" });
  const [b] = await sql`SELECT is_bot, bot_reason FROM session WHERE id = ${bot}`;
  assert.deepEqual(b, { is_bot: true, bot_reason: "ua" });

  // An Amazon office: same AS as AWS, so it starts out suspected.
  const sid = crypto.randomUUID();
  await sql`INSERT INTO visitor (id) VALUES ('v-amzn')`;
  await sql`
    INSERT INTO session (id, visitor_id, org, as_domain, org_kind, bot_reason, user_agent)
    VALUES (${sid}, 'v-amzn', 'Amazon.com, Inc.', 'amazon.com', 'hosting', 'datacenter', ${CHROME})
  `;
  await beacon({ sid, vid: "v-amzn", path: "/", scroll: 0, ms: 1500, events: [] });
  assert.equal((await sql`SELECT is_bot FROM session WHERE id = ${sid}`)[0].is_bot, true, "1.5s and no scroll is not enough");
  await beacon({ sid, vid: "v-amzn", path: "/", scroll: 35, ms: 8000, events: [{ t: "section", n: "projects", d: 4000 }] });
  assert.equal((await sql`SELECT is_bot FROM session WHERE id = ${sid}`)[0].is_bot, false);

  // ...and having become a person, it earns the "named company" alert, once.
  const posts = await until(() => hookPosts.find((p) => p.content.includes("Amazon")));
  assert.ok(posts, "alert sent");
  const before = hookPosts.length;
  await beacon({ sid, vid: "v-amzn", path: "/", scroll: 50, ms: 12000, events: [] });
  assert.equal(hookPosts.length, before, "not sent twice");
});

test("an unknown origin writes nothing", { skip }, async () => {
  const sid = crypto.randomUUID();
  const res = await beacon({ sid, vid: "v-x", path: "/", events: [] }, { origin: "https://evil.example" });
  assert.equal(res.statusCode, 204);
  assert.equal((await sql`SELECT count(*)::int AS n FROM session WHERE id = ${sid}`)[0].n, 0);
});

test("?ay=me marks the browser, and its visits stay marked", { skip }, async () => {
  await beacon({ sid: crypto.randomUUID(), vid: "v-ali", path: "/", me: 1, events: [] });
  const sid = crypto.randomUUID();
  await beacon({ sid, vid: "v-ali", path: "/", events: [] });
  assert.equal((await sql`SELECT is_me FROM session WHERE id = ${sid}`)[0].is_me, true);
  assert.equal((await sql`SELECT kind FROM visitor WHERE id = 'v-ali'`)[0].kind, "me");
});

test("alerts skip robots and Ali, and fire for a tracked link", { skip }, () => {
  const base = { alerts: [], is_me: false, is_bot: false, resume_hits: 0, org_kind: "consumer" };
  assert.deepEqual(dueAlerts({ ...base, is_bot: true, src: "x" }), []);
  assert.deepEqual(dueAlerts({ ...base, visitor_kind: "me", src: "x" }), []);
  assert.deepEqual(dueAlerts({ ...base, src: "x", link_label: "Jane" }).map(([k]) => k), ["link"]);
  assert.deepEqual(dueAlerts({ ...base, src: "x", alerts: ["link"] }), []);
});

test("the dashboard needs the password", { skip }, async () => {
  assert.equal((await call(query, { method: "GET" })).statusCode, 404);
  assert.equal((await call(auth, { body: JSON.stringify({ password: "nope" }) })).statusCode, 401);

  const ok = await call(auth, { body: JSON.stringify({ password: "test-password" }) });
  assert.equal(ok.statusCode, 200);
  const set = ok.headers["set-cookie"];
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Strict/);
  cookie = set.split(";")[0];

  const forged = cookie.replace(/\.[^.]+$/, ".AAAA");
  assert.equal((await call(query, { method: "GET", headers: { cookie: forged } })).statusCode, 404);
});

test("the dashboard reads visitors, scores and visits", { skip }, async () => {
  const res = await call(query, { method: "GET", headers: { cookie }, query: { days: "30" } });
  assert.equal(res.statusCode, 200);
  const d = res.body;
  assert.equal(d.daily.length, 30);
  assert.ok(d.totals.sessions >= 4);
  assert.ok(!d.recent.some((s) => s.me), "Ali's visits are excluded by default");
  assert.ok(!d.recent.some((s) => s.is_bot), "bots are excluded by default");
  assert.ok(d.bots.n >= 1);
  const rec = d.visitors.find((v) => v.id === "v-recruiter");
  assert.equal(rec.verdict, "recruiter");
  assert.equal(rec.total_sessions, 2);
  assert.ok(d.orgs.some((o) => o.label === "Amazon.com, Inc."), "Amazon shown by name, not as a cloud");

  const one = await call(query, { method: "GET", headers: { cookie }, query: { view: "visitor", id: "v-recruiter" } });
  assert.equal(one.body.sessions.length, 2);
  assert.ok(one.body.events.some((e) => e.type === "resume"));
  // The other browsers at 127.0.0.1 show up as possible matches.
  assert.ok(one.body.siblings.length >= 1);
});

test("labels, links and short links", { skip }, async () => {
  const labelled = await call(admin, {
    headers: { cookie }, body: JSON.stringify({ action: "label", id: "v-recruiter", label: "Jane", kind: "recruiter" }),
  });
  assert.equal(labelled.body.label, "Jane");

  const made = await call(admin, {
    headers: { cookie }, body: JSON.stringify({ action: "link.create", label: "Jane Doe, Amazon", kind: "recruiter", target: "recruiters" }),
  });
  assert.equal(made.statusCode, 200);
  const code = made.body.code;
  assert.match(code, /^jane-doe-amazon-[a-z0-9]{3}$/);
  const accented = await call(admin, { headers: { cookie }, body: JSON.stringify({ action: "link.create", label: "Résumé on LinkedIn", kind: "channel", target: "resume" }) });
  assert.match(accented.body.code, /^resume-on-linkedin-[a-z0-9]{3}$/);

  const hop = await call(go, { method: "GET", query: { c: code } });
  assert.equal(hop.statusCode, 302);
  assert.equal(hop.headers.location, `https://aliyounes.dev/recruiters?s=${code}`);
  assert.ok(await until(async () => (await sql`SELECT 1 FROM hit WHERE code = ${code} AND kind = 'go'`).length), "click recorded");

  // A Slack unfurl of the short link is a preview, not a click.
  await call(go, { method: "GET", query: { c: code }, headers: { "user-agent": "Slackbot-LinkExpanding 1.0" } });
  assert.ok(await until(async () => (await sql`SELECT 1 FROM hit WHERE code = ${code} AND platform = 'Slack'`).length));

  // The visit that follows carries the code and is credited to the link.
  const sid = crypto.randomUUID();
  await beacon({ sid, vid: "v-jane2", path: "/recruiters?s=" + code, s: code, events: [{ t: "pageview" }] });
  const d = (await call(query, { method: "GET", headers: { cookie } })).body;
  const link = d.links.find((l) => l.code === code);
  assert.equal(link.visits, 1);
  assert.equal(link.clicks, 1);
  assert.equal(d.recent.find((s) => s.id === sid).verdict, "recruiter");

  assert.equal((await call(go, { method: "GET", query: { c: "../../etc" } })).headers.location, "https://aliyounes.dev/");
});

test("forgetting a visitor removes their visits", { skip }, async () => {
  await call(admin, { headers: { cookie }, body: JSON.stringify({ action: "forget", id: "v-old" }) });
  assert.equal((await sql`SELECT count(*)::int AS n FROM session WHERE visitor_id = 'v-old'`)[0].n, 0);
});
