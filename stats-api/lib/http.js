// stats-api/lib/http.js — the small things every handler needs.

/** Trim to a column-safe length. Nothing here is worth an oversized row. */
export const cap = (v, n) => (typeof v === "string" && v ? v.slice(0, n) : null);
export const int = (v, max = 2_147_483_647) =>
  Number.isFinite(v) ? Math.max(0, Math.min(Math.trunc(v), max)) : null;

/**
 * The beacon sends text/plain so the browser skips the CORS preflight, which
 * means Vercel hands the body over as a string. Older builds of the site sent
 * application/json, which arrives parsed. Accept both.
 */
export function jsonBody(req) {
  const b = req.body;
  if (b && typeof b === "object" && !Buffer.isBuffer(b)) return b;
  try {
    return JSON.parse(Buffer.isBuffer(b) ? b.toString("utf8") : String(b || ""));
  } catch {
    return null;
  }
}

// The site is on GitHub Pages at aliyounes.dev while this runs on Vercel, so
// every beacon is cross-origin and needs an explicit allow-list. Localhost is
// included so `npm run dev` produces real rows against a scratch database;
// EXTRA_ORIGINS (comma-separated) adds a preview address without a redeploy
// of the list.
const BASE_ORIGINS = [
  "https://aliyounes.dev",
  "https://www.aliyounes.dev",
  "http://localhost:5199",
  "http://localhost:5173",
];

export function allowedOrigin(origin) {
  if (!origin) return false;
  const extra = (process.env.EXTRA_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return BASE_ORIGINS.includes(origin) || extra.includes(origin);
}

/** A code from ?s=, lowercased, or null if it is not one. */
export function linkCode(v) {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,47}$/.test(s) ? s : null;
}
