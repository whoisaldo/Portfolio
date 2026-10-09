// stats-api/lib/auth.js — the dashboard's login.
//
// One password (STATS_KEY), exchanged once for a signed cookie. The cookie is
// "<expiry>.<hmac>", HttpOnly so the dashboard's own script cannot read it,
// and keyed on the password itself, so changing STATS_KEY signs every device
// out. There is one user and no account table, so there is nothing else to
// store.
import crypto from "node:crypto";

const COOKIE = "ay_session";
const MAX_AGE_S = 30 * 86_400;

/** Length-safe, timing-safe string compare. */
export function secretEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  // Hashing first makes both sides fixed-width.
  const ah = crypto.createHash("sha256").update(a).digest();
  const bh = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
}

function sign(exp, key) {
  return crypto.createHmac("sha256", key).update(`ay:${exp}`).digest("base64url");
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** True when the request carries a valid, unexpired session cookie. */
export function authed(req) {
  const key = process.env.STATS_KEY;
  if (!key) return false;
  const v = readCookie(req, COOKIE);
  if (!v) return false;
  const [exp, mac] = v.split(".");
  if (!exp || !mac || Number(exp) < Date.now() / 1000) return false;
  return secretEq(mac, sign(exp, key));
}

/**
 * `Secure` whenever the request came in over https, which on Vercel is always.
 * The local dev server is plain http, where a Secure cookie would be dropped.
 */
function flags(req) {
  const https = req.headers["x-forwarded-proto"] === "https";
  return `Path=/; HttpOnly; SameSite=Strict${https ? "; Secure" : ""}`;
}

export function setSession(req, res) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const value = `${exp}.${sign(String(exp), process.env.STATS_KEY)}`;
  res.setHeader("Set-Cookie", `${COOKIE}=${value}; Max-Age=${MAX_AGE_S}; ${flags(req)}`);
}

export function clearSession(req, res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; ${flags(req)}`);
}

/**
 * Headers every private endpoint sends. 404 rather than 401 on failure, so an
 * unauthenticated caller learns nothing about whether the path exists.
 */
export function privateHeaders(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
}
