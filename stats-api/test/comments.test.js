// Comments: the pieces on their own, then the handlers against a real Postgres.
//
//   TEST_DATABASE_URL=postgres://localhost/ay_stats_test npm test
//
// The database half is skipped without TEST_DATABASE_URL, and it empties the
// comment table first, so never point it at production. Pushes never leave
// the process: NTFY_TOPIC is a made-up name and fetch to ntfy.sh is caught
// here and recorded instead.
import { test, before } from "node:test";
import assert from "node:assert/strict";

process.env.STATS_KEY = "test-password";
process.env.PUBLIC_URL = "https://stats.test";
process.env.NTFY_TOPIC = "not-a-real-topic";
delete process.env.DISCORD_WEBHOOK_URL;

const pushes = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith("https://ntfy.sh/")) {
    pushes.push({ url: String(url), headers: init.headers, body: init.body });
    return new Response(null, { status: 200 });
  }
  return realFetch(url, init);
};

const { isPost, commentToken, tokenOk, ipHash, readComment, cleanLine, cleanText } = await import("../lib/comments.js");

const DB = process.env.TEST_DATABASE_URL;
const skip = !DB && "TEST_DATABASE_URL not set";
const ORIGIN = "https://aliyounes.dev";
const POST = "building-night-city";

// ---------------------------------------------------------------------------
// Without a database
// ---------------------------------------------------------------------------

test("any slug-shaped name is a post, and nothing else is", () => {
  for (const s of ["building-night-city", "zero-touch-secure-boot", "a", "post-2", "x".repeat(80)]) assert.ok(isPost(s), s);
  for (const s of ["", "-a", "a-", "a--b", "Building", "a_b", "a b", "../etc", "a/b", "x".repeat(81), 7, null]) {
    assert.ok(!isPost(s), String(s));
  }
});

test("a token is for one comment and one action", () => {
  const id = "3f1c9b2e-8a4d-4c7e-9f00-1a2b3c4d5e6f";
  const t = commentToken(id, "approve");
  assert.ok(tokenOk(id, "approve", t));
  assert.ok(!tokenOk(id, "delete", t), "an approve token cannot delete");
  assert.ok(!tokenOk("3f1c9b2e-8a4d-4c7e-9f00-1a2b3c4d5e60", "approve", t), "nor approve another comment");
  assert.ok(!tokenOk(id, "approve", t.slice(0, -1) + (t.endsWith("A") ? "B" : "A")));
  assert.ok(!tokenOk(id, "approve", ""));
  assert.ok(!tokenOk(id, "publish", commentToken(id, "publish")), "only the two actions exist");
});

test("the address is hashed with a key, never kept", () => {
  const h = ipHash("203.0.113.9");
  assert.equal(h, ipHash("203.0.113.9"));
  assert.notEqual(h, ipHash("203.0.113.10"));
  assert.ok(!h.includes("203"));
});

test("names are one line, comments keep their paragraphs", () => {
  assert.equal(cleanLine("  Jane\n\tDoe‮ "), "Jane Doe");
  assert.equal(cleanText("one\r\n\r\n\r\n\r\ntwo  \nthree\u0007"), "one\n\ntwo\nthree");
});

test("a comment is checked before it is stored", () => {
  const ok = { post: POST, name: "Jane", body: "Nice." };
  assert.equal(readComment(ok).ok, true);
  assert.equal(readComment({ ...ok, post: "Not a post" }).field, "post");
  assert.equal(readComment({ ...ok, name: " \n " }).field, "name");
  assert.equal(readComment({ ...ok, name: "x".repeat(61) }).field, "name");
  assert.equal(readComment({ ...ok, body: "" }).field, "body");
  assert.equal(readComment({ ...ok, body: "x".repeat(2001) }).field, "body");
  assert.equal(readComment({ ...ok, quote: "x".repeat(501) }).field, "quote");
  assert.equal(readComment({ ...ok, quote: "   " }).field, "quote");
  const q = readComment({ ...ok, quote: "seven weeks", prefix: "p".repeat(100), suffix: "s".repeat(100) }).value.quote;
  assert.deepEqual([q.exact, q.prefix.length, q.suffix.length], ["seven weeks", 64, 64]);
  assert.equal(readComment({ ...ok, quote: "" }).value.quote, null);
});

// ---------------------------------------------------------------------------
// Against Postgres
// ---------------------------------------------------------------------------

let sql, comments, moderate;

before(async () => {
  if (skip) return;
  process.env.DATABASE_URL = DB;
  ({ sql } = await import("../lib/db.js"));
  ({ default: comments } = await import("../api/comments.js"));
  ({ default: moderate } = await import("../api/moderate.js"));
  await sql`TRUNCATE comment`;
});

/** Calls a handler with a Vercel-shaped request and a recording response. */
async function call(handler, { method = "POST", headers = {}, body, query = {} } = {}) {
  const res = {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    end(b) { if (b !== undefined) this.body = b; return this; },
  };
  await handler({ method, headers: { "x-real-ip": "198.51.100.1", ...headers }, body, query }, res);
  return res;
}

const send = (body, { ip = "198.51.100.1", origin = ORIGIN } = {}) =>
  call(comments, { headers: { origin, "x-real-ip": ip }, body: JSON.stringify(body) });
const read = (post = POST) => call(comments, { method: "GET", headers: { origin: ORIGIN }, query: { post } });

const until = async (fn, ms = 3000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 25));
  }
};

/** The query string of one of the push's buttons, as an object. */
function linkFrom(push, label) {
  const action = push.headers.Actions.split("; ").find((a) => a.startsWith(`view, ${label}, `));
  return Object.fromEntries(new URL(action.split(", ")[2]).searchParams);
}

let plain, quoted;

test("a comment is stored as pending and Ali gets a push with both links", { skip }, async () => {
  const res = await send({ post: POST, name: "Jane", body: "Loved the\n\ntrains.", website: "" });
  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.body, { status: "pending" }, "nothing else comes back");
  assert.equal(res.headers["access-control-allow-origin"], ORIGIN);

  const [row] = await sql`SELECT * FROM comment WHERE name = 'Jane'`;
  assert.equal(row.status, "pending");
  assert.equal(row.body, "Loved the\n\ntrains.");
  assert.equal(row.ip_hash, ipHash("198.51.100.1"));
  assert.ok(!JSON.stringify(row).includes("198.51.100.1"), "no raw address anywhere in the row");
  plain = row.id;

  const push = await until(() => pushes.find((p) => p.body.includes("Loved the")));
  assert.ok(push, "push sent");
  assert.equal(push.url, "https://ntfy.sh/not-a-real-topic");
  assert.match(push.headers.Title, /building-night-city/);
  assert.match(push.body, /From: Jane/);
  const approve = linkFrom(push, "Approve");
  const del = linkFrom(push, "Delete");
  assert.deepEqual([approve.id, approve.a], [plain, "approve"]);
  assert.ok(tokenOk(plain, "approve", approve.t));
  assert.ok(tokenOk(plain, "delete", del.t));
  assert.match(push.headers.Actions, /^view, Approve, https:\/\/stats\.test\/api\/moderate\?/);
});

test("a quote comment keeps its passage and context", { skip }, async () => {
  const res = await send({
    post: POST, name: "Sam", body: "Same.", quote: "took about seven weeks",
    prefix: "the version you can get out and walk around in, ", suffix: ".\n\nBefore this",
  }, { ip: "198.51.100.2" });
  assert.equal(res.statusCode, 202);
  const [row] = await sql`SELECT * FROM comment WHERE name = 'Sam'`;
  assert.equal(row.quote, "took about seven weeks");
  assert.equal(row.quote_suffix, ".\n\nBefore this");
  quoted = row.id;
  assert.ok(await until(() => pushes.find((p) => p.body.includes('On: "took about seven weeks"'))));
});

test("bad comments are refused with the field to fix", { skip }, async () => {
  const before = (await sql`SELECT count(*)::int AS n FROM comment`)[0].n;
  const ip = { ip: "198.51.100.3" };
  assert.deepEqual((await send({ post: POST, name: "", body: "x" }, ip)).body.field, "name");
  assert.deepEqual((await send({ post: POST, name: "A", body: "x".repeat(2001) }, ip)).body.field, "body");
  assert.deepEqual((await send({ post: "../etc", name: "A", body: "x" }, ip)).body.field, "post");
  assert.equal((await send({ post: POST, name: "A", body: "x", quote: "q".repeat(501) }, ip)).statusCode, 400);
  assert.equal((await call(comments, { headers: { origin: ORIGIN }, body: "not json" })).statusCode, 400);
  assert.equal((await send({ post: POST, name: "A", body: "x" }, { origin: "https://evil.example" })).statusCode, 403);
  const noOrigin = await call(comments, { body: JSON.stringify({ post: POST, name: "A", body: "x" }) });
  assert.equal(noOrigin.statusCode, 403);
  assert.equal((await sql`SELECT count(*)::int AS n FROM comment`)[0].n, before);
});

test("the honeypot looks like it worked and stores nothing", { skip }, async () => {
  const pushed = pushes.length;
  const res = await send({ post: POST, name: "Bot", body: "Buy now", website: "https://spam.example" }, { ip: "198.51.100.4" });
  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.body, { status: "pending" });
  assert.equal((await sql`SELECT count(*)::int AS n FROM comment WHERE name = 'Bot'`)[0].n, 0);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(pushes.length, pushed, "no push");
});

test("one address gets three comments in ten minutes", { skip }, async () => {
  const ip = { ip: "198.51.100.5" };
  for (let i = 0; i < 3; i++) assert.equal((await send({ post: POST, name: "Rae", body: `n${i}` }, ip)).statusCode, 202);
  const fourth = await send({ post: POST, name: "Rae", body: "n3" }, ip);
  assert.equal(fourth.statusCode, 429);
  assert.match(fourth.body.error, /few minutes/);
  assert.equal((await send({ post: POST, name: "Lee", body: "other address" }, { ip: "198.51.100.6" })).statusCode, 202);
  await sql`DELETE FROM comment WHERE name IN ('Rae', 'Lee')`;
});

test("a burst at once is held to the same limits", { skip }, async () => {
  // All at the same moment, so every request would read the count before any
  // other was stored if the count and the insert were apart.
  const burst = (n, ip) => Promise.all(Array.from({ length: n }, (_, i) =>
    send({ post: POST, name: "Burst", body: `b${i}` }, { ip: typeof ip === "function" ? ip(i) : ip })));
  const pushed = () => pushes.filter((p) => p.body.includes("From: Burst")).length;

  const one = await burst(12, "198.51.100.8");
  assert.deepEqual(one.map((r) => r.statusCode).sort(), [...Array(3).fill(202), ...Array(9).fill(429)]);
  assert.equal((await sql`SELECT count(*)::int AS n FROM comment WHERE name = 'Burst'`)[0].n, 3);
  await until(() => pushed() === 3);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(pushed(), 3, "a push for each comment stored, and none for the refused");
  await sql`DELETE FROM comment WHERE name = 'Burst'`;

  // Everyone together: one place left under the hour's forty.
  const [{ n: now }] = await sql`SELECT count(*)::int AS n FROM comment`;
  await sql`
    INSERT INTO comment (post, name, body, ip_hash)
    SELECT ${POST}, 'Seed', 'x', 'seed-' || g FROM generate_series(1, ${39 - now}) g
  `;
  const all = await burst(12, (i) => `198.51.100.${100 + i}`);
  assert.deepEqual(all.map((r) => r.statusCode).sort(), [202, ...Array(11).fill(429)]);
  assert.match(all.find((r) => r.statusCode === 429).body.error, /busy/);
  assert.equal((await sql`SELECT count(*)::int AS n FROM comment`)[0].n, 40);
  await sql`DELETE FROM comment WHERE name IN ('Burst', 'Seed')`;
});

test("without a signing key or a push channel, no comment is taken", { skip }, async () => {
  const env = { STATS_KEY: process.env.STATS_KEY, NTFY_TOPIC: process.env.NTFY_TOPIC };
  const before = (await sql`SELECT count(*)::int AS n FROM comment`)[0].n;
  const pushed = pushes.length;
  try {
    delete process.env.STATS_KEY;
    const noKey = await send({ post: POST, name: "Shut", body: "x" }, { ip: "198.51.100.9" });
    assert.equal(noKey.statusCode, 503);
    assert.match(noKey.body.error, /closed/);
    process.env.STATS_KEY = env.STATS_KEY;

    delete process.env.NTFY_TOPIC;
    const noPush = await send({ post: POST, name: "Shut", body: "x" }, { ip: "198.51.100.9" });
    assert.equal(noPush.statusCode, 503);
    process.env.DISCORD_WEBHOOK_URL = "https://discord.test/hook";
    assert.equal(
      (await send({ post: POST, name: "Shut", body: "x", website: "bot" }, { ip: "198.51.100.9" })).statusCode,
      202,
      "Discord alone is a channel",
    );
  } finally {
    Object.assign(process.env, env);
    delete process.env.DISCORD_WEBHOOK_URL;
  }
  assert.equal((await sql`SELECT count(*)::int AS n FROM comment`)[0].n, before, "nothing stored");
  assert.equal(pushes.length, pushed, "nothing sent");
  assert.equal((await read()).statusCode, 200, "reading still works");
});

test("pending comments are not shown", { skip }, async () => {
  const res = await read();
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { comments: [] });
  assert.match(res.headers["cache-control"], /max-age=30/);
  assert.equal((await read("../etc")).statusCode, 404);
  assert.deepEqual((await read("a-post-not-written-yet")).body, { comments: [] });
});

test("a moderation link with a wrong token does nothing", { skip }, async () => {
  const bad = await call(moderate, { method: "POST", query: { id: plain, a: "approve", t: commentToken(plain, "delete") } });
  assert.equal(bad.statusCode, 404);
  const other = await call(moderate, { method: "POST", query: { id: quoted, a: "approve", t: commentToken(plain, "approve") } });
  assert.equal(other.statusCode, 404);
  assert.equal((await sql`SELECT status FROM comment WHERE id = ${plain}`)[0].status, "pending");
});

test("opening an approve link only asks; the POST from its page approves", { skip }, async () => {
  const q = { id: plain, a: "approve", t: commentToken(plain, "approve") };
  const page = await call(moderate, { method: "GET", query: q });
  assert.equal(page.statusCode, 200);
  assert.match(page.headers["content-type"], /text\/html/);
  assert.match(page.headers["content-security-policy"], /default-src 'none'/);
  assert.equal(page.headers["referrer-policy"], "no-referrer");
  assert.match(page.body, /<form method="post">/);
  assert.match(page.body, /Loved the/);
  assert.equal((await sql`SELECT status FROM comment WHERE id = ${plain}`)[0].status, "pending", "a GET changes nothing");

  const done = await call(moderate, { method: "POST", query: q });
  assert.equal(done.statusCode, 200);
  assert.match(done.body, /Approved/);
  const [row] = await sql`SELECT status, approved_at FROM comment WHERE id = ${plain}`;
  assert.equal(row.status, "approved");
  assert.ok(row.approved_at);

  const again = await call(moderate, { method: "GET", query: q });
  assert.match(again.body, /Already approved/);
  await call(moderate, { method: "POST", query: { id: quoted, a: "approve", t: commentToken(quoted, "approve") } });
});

test("the moderation page escapes what the reader wrote", { skip }, async () => {
  await send({ post: POST, name: "<b>x</b>", body: "<script>alert(1)</script>" }, { ip: "198.51.100.7" });
  const [row] = await sql`SELECT id FROM comment WHERE name = '<b>x</b>'`;
  const page = await call(moderate, { method: "GET", query: { id: row.id, a: "delete", t: commentToken(row.id, "delete") } });
  assert.ok(!page.body.includes("<script>alert"));
  assert.match(page.body, /&lt;script&gt;/);
  await sql`DELETE FROM comment WHERE id = ${row.id}`;
});

test("approved comments are listed oldest first, without the address hash", { skip }, async () => {
  const { comments: list } = (await read()).body;
  assert.deepEqual(list.map((c) => c.name), ["Jane", "Sam"]);
  assert.deepEqual(Object.keys(list[0]).sort(), ["body", "created_at", "id", "name", "quote"]);
  assert.equal(list[0].quote, null);
  assert.deepEqual(list[1].quote, {
    exact: "took about seven weeks",
    prefix: "the version you can get out and walk around in, ",
    suffix: ".\n\nBefore this",
  });
  assert.deepEqual((await read("zero-touch-secure-boot")).body.comments, [], "only this post's");
});

test("the Delete link still works after approval, and then the link is dead", { skip }, async () => {
  const q = { id: plain, a: "delete", t: commentToken(plain, "delete") };
  const page = await call(moderate, { method: "GET", query: q });
  assert.match(page.body, /Delete this comment\?/);
  assert.equal((await read()).body.comments.length, 2, "a GET deletes nothing");

  const done = await call(moderate, { method: "POST", query: q });
  assert.match(done.body, /Deleted/);
  assert.deepEqual((await read()).body.comments.map((c) => c.name), ["Sam"]);
  assert.equal((await call(moderate, { method: "GET", query: q })).statusCode, 410);
});
