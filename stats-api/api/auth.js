// stats-api/api/auth.js — signing in and out of the dashboard.
//
//   GET    /api/auth   { authed: bool }
//   POST   /api/auth   { password }  -> sets the session cookie
//   DELETE /api/auth                 -> clears it
import { authed, clearSession, privateHeaders, secretEq, setSession } from "../lib/auth.js";
import { jsonBody } from "../lib/http.js";

export default async function handler(req, res) {
  privateHeaders(res);

  if (req.method === "GET") return res.status(200).json({ authed: authed(req) });

  if (req.method === "DELETE") {
    clearSession(req, res);
    return res.status(200).json({ authed: false });
  }

  if (req.method === "POST") {
    const key = process.env.STATS_KEY;
    const password = String(jsonBody(req)?.password ?? "");
    if (!key || !secretEq(password, key)) {
      // A fixed pause makes guessing slower without telling the guesser more.
      await new Promise((r) => setTimeout(r, 600));
      return res.status(401).json({ error: "Wrong password." });
    }
    setSession(req, res);
    return res.status(200).json({ authed: true });
  }

  return res.status(405).end();
}
