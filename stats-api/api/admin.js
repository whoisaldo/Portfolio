// stats-api/api/admin.js — the dashboard's writes.
//
//   POST /api/admin  { action: "label",  id, label, kind, note }
//                    { action: "link.create", label, kind, target, code? }
//                    { action: "link.delete", code }
//                    { action: "forget", id }
//
// Behind the same session cookie as the reads. The cookie is SameSite=Strict,
// so another site cannot submit these on Ali's behalf.
import crypto from "node:crypto";
import { sql } from "../lib/db.js";
import { authed, privateHeaders } from "../lib/auth.js";
import { cap, jsonBody, linkCode } from "../lib/http.js";

const KINDS = new Set(["recruiter", "friend", "me", "other"]);
const LINK_KINDS = new Set(["recruiter", "friend", "channel"]);
const TARGETS = new Set(["site", "recruiters", "resume"]);

/** "Jane Doe, Amazon" -> "jane-doe-amazon-k3f": readable, and not guessable. */
function makeCode(label) {
  const slug = String(label).toLowerCase().normalize("NFKD")
    // NFKD splits "é" into "e" and an accent; drop the accent, keep the e.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  const tail = crypto.randomBytes(3).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x").slice(0, 3);
  return linkCode(`${slug || "link"}-${tail}`);
}

export default async function handler(req, res) {
  privateHeaders(res);
  if (!authed(req)) return res.status(404).json({ error: "not found" });
  if (req.method !== "POST") return res.status(405).end();

  const b = jsonBody(req) || {};
  try {
    switch (b.action) {
      case "label": {
        const kind = KINDS.has(b.kind) ? b.kind : null;
        const [v] = await sql`
          UPDATE visitor SET label = ${cap(b.label, 120)}, kind = ${kind}, note = ${cap(b.note, 1000)}
          WHERE id = ${String(b.id || "")} RETURNING *
        `;
        // A visitor marked as Ali takes their past visits with them, so the
        // numbers stop counting him retroactively, not just from now on.
        if (v) await sql`UPDATE session SET is_me = (${kind === "me"}) WHERE visitor_id = ${v.id}`;
        return v ? res.status(200).json(v) : res.status(404).json({ error: "no such visitor" });
      }

      case "link.create": {
        const label = cap(b.label?.trim(), 160);
        if (!label) return res.status(400).json({ error: "A link needs a label." });
        const kind = LINK_KINDS.has(b.kind) ? b.kind : "recruiter";
        const target = TARGETS.has(b.target) ? b.target : "site";
        const code = linkCode(b.code) || makeCode(label);
        if (!code) return res.status(400).json({ error: "Codes are letters, digits, - and _." });
        const [l] = await sql`
          INSERT INTO link (code, label, kind, target, note)
          VALUES (${code}, ${label}, ${kind}, ${target}, ${cap(b.note, 1000)})
          ON CONFLICT (code) DO NOTHING RETURNING *
        `;
        return l ? res.status(200).json(l) : res.status(409).json({ error: `The code "${code}" is taken.` });
      }

      case "link.delete": {
        await sql`DELETE FROM link WHERE code = ${String(b.code || "")}`;
        return res.status(200).json({ ok: true });
      }

      // Erases a visitor and, by cascade, every visit and event they made.
      // For clearing out test traffic; the dashboard asks before sending it.
      case "forget": {
        await sql`DELETE FROM visitor WHERE id = ${String(b.id || "")}`;
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({ error: "unknown action" });
    }
  } catch (err) {
    console.error("admin:", err?.message || err);
    return res.status(500).json({ error: "write failed" });
  }
}
