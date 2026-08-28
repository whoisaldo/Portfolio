// stats-api/dev-server.mjs — run the collector locally.
//
//   DATABASE_URL=postgres://localhost/ay_stats \
//   STATS_KEY=dev IP_SALT=dev node dev-server.mjs
//
// Vercel's own `vercel dev` also works and is closer to production, but it
// needs the project linked to an account first. This has no such requirement,
// which makes it the thing you can run five seconds after cloning.
//
// It reimplements only the small part of Vercel's Node runtime the two
// handlers actually touch: `req.query`, a parsed `req.body`, and the
// `res.status().json()` chain. Everything else is plain node:http.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3311;

const handlers = {
  "/api/collect": (await import("./api/collect.js")).default,
  "/api/query": (await import("./api/query.js")).default,
};

/** The subset of Vercel's response helpers the handlers use. */
function decorate(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  decorate(res);

  const handler = handlers[url.pathname];
  if (handler) {
    req.query = Object.fromEntries(url.searchParams);
    req.body = await readBody(req);
    // Vercel populates this from its proxy. Locally the socket address is the
    // honest answer, and it is what makes the enrichment path exercisable.
    req.headers["x-real-ip"] ||= req.socket.remoteAddress?.replace(/^::ffff:/, "");
    try {
      await handler(req, res);
    } catch (err) {
      console.error(url.pathname, err);
      if (!res.writableEnded) res.status(500).json({ error: String(err?.message || err) });
    }
    return;
  }

  // Static: the dashboard.
  const file = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  try {
    const body = await fs.readFile(path.join(ROOT, "public", file));
    const ext = path.extname(file);
    res.setHeader(
      "content-type",
      { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" }[ext] ||
        "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.status(404).end("not found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`  stats-api  http://0.0.0.0:${PORT}`);
  console.log(`  dashboard  http://localhost:${PORT}/?k=${process.env.STATS_KEY || "<STATS_KEY>"}`);
  console.log(`  database   ${process.env.DATABASE_URL || "(unset — nothing will work)"}`);
});
