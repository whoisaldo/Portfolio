// stats-api/lib/enrich.js — turning a request into the few facts worth keeping.
//
// Three jobs: hash the IP, look up the network it belongs to, and decide
// whether the whole thing is a robot.
//
// The reverse lookup is the point of the exercise. A raw hit log says
// "somebody read the Philips case study for four minutes". The same hit with
// its network resolved says "somebody at Amazon did", which is the difference
// between a number and a signal. It is also the ordinary, decades-old use of
// an access log — no cookies are set, nothing is correlated across sites, and
// no attempt is made to identify a person.

import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// IP
// ---------------------------------------------------------------------------

/**
 * The client address, per Vercel's proxy. `x-forwarded-for` is a chain; the
 * left-most entry is the client and everything after it is infrastructure.
 * x-real-ip is preferred where present because Vercel sets it directly.
 */
export function clientIp(req) {
  const real = req.headers["x-real-ip"];
  if (real) return String(real).trim();
  const fwd = req.headers["x-forwarded-for"];
  if (!fwd) return null;
  return String(fwd).split(",")[0].trim() || null;
}

/**
 * sha256(ip + salt), truncated. Recognises a returning visitor; does not
 * recover the address. Truncation to 16 hex chars leaves 64 bits — far beyond
 * collision range for this volume, and short enough to be useless as a lookup
 * key against a rainbow table of the v4 space without the salt.
 */
export function hashIp(ip, salt) {
  if (!ip || !salt) return null;
  return crypto.createHash("sha256").update(ip + salt).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Network → organisation
// ---------------------------------------------------------------------------

// Datacentre and cloud networks. A browser session genuinely originating
// inside AWS or Hetzner is a crawler, a scanner, a preview renderer or someone
// behind a commercial VPN — in every case not a reader, and in the first three
// cases not a person. Matched against the ipinfo `org` string, which is
// formatted "AS16509 Amazon.com, Inc.".
const HOSTING = [
  /amazon\.com|amazon technologies|aws/i,
  /google (llc|cloud)|google-cloud/i,
  /microsoft|azure/i,
  /digitalocean/i,
  /hetzner/i,
  /ovh/i,
  /linode|akamai connected cloud/i,
  /vultr/i,
  /cloudflare/i,
  /oracle cloud/i,
  /alibaba|aliyun/i,
  /tencent/i,
  /scaleway/i,
  /contabo/i,
  /leaseweb/i,
  /fastly/i,
  /datacamp|cdn77/i,
  /m247|nordvpn|mullvad|private internet access|surfshark/i,
];

// Consumer ISPs. Not uninteresting — this is most real traffic — but the org
// name carries no signal about who the reader is, so the dashboard groups them
// rather than listing them.
const CONSUMER = [
  /comcast|xfinity/i,
  /verizon|fios/i,
  /at&t|att services|sbc internet/i,
  /spectrum|charter|time warner/i,
  /t-mobile|sprint/i,
  /cox communications/i,
  /centurylink|lumen|qwest/i,
  /frontier communications/i,
  /optimum|cablevision|altice/i,
  /rcn|astound/i,
  /virgin media|sky (uk|broadband)|bt group|talktalk/i,
  /rogers|bell canada|telus|shaw/i,
  /vodafone|orange|telefonica|deutsche telekom|free sas|proximus/i,
  /jio|airtel|bsnl/i,
  /starlink|hughesnet|viasat/i,
];

const EDUCATION = [/\buniversity\b|\bcollege\b|\bschool\b|\.edu\b|\bacadem/i];

/** Strip the leading "AS12345 " that ipinfo prefixes onto every org string. */
function cleanOrg(org) {
  if (!org) return null;
  return org.replace(/^AS\d+\s+/i, "").trim() || null;
}

function asnOf(org) {
  if (!org) return null;
  const m = /^(AS\d+)/i.exec(org);
  return m ? m[1].toUpperCase() : null;
}

/** corporate | education | consumer | hosting | unknown */
export function classifyOrg(org) {
  if (!org) return "unknown";
  if (HOSTING.some((r) => r.test(org))) return "hosting";
  if (EDUCATION.some((r) => r.test(org))) return "education";
  if (CONSUMER.some((r) => r.test(org))) return "consumer";
  return "corporate";
}

/**
 * ipinfo.io reverse lookup. Free tier is 50k/month, which this site will not
 * approach.
 *
 * Failure is not an error: a lookup that times out or 429s yields a session
 * with a null org rather than a dropped request. Losing the enrichment on one
 * row is a much smaller problem than losing the row.
 */
export async function lookupIp(ip, token) {
  if (!ip || !token) return {};
  // Private ranges never resolve; skip the round trip.
  if (/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fe80:)/i.test(ip)) return {};

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(
      `https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`,
      { signal: ctl.signal, headers: { accept: "application/json" } },
    );
    clearTimeout(timer);
    if (!res.ok) return {};

    const d = await res.json();
    const rawOrg = d.org || d.asn?.name || null;
    return {
      org: cleanOrg(rawOrg),
      asn: asnOf(rawOrg) || d.asn?.asn || null,
      country: d.country || null,
      region: d.region || null,
      city: d.city || null,
      org_kind: classifyOrg(rawOrg),
    };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Robots
// ---------------------------------------------------------------------------

const UA_BOT =
  /bot|crawl|spider|slurp|headless|phantomjs|puppeteer|playwright|selenium|curl|wget|python-requests|axios|go-http|java\/|okhttp|scrapy|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|fetcher|validator|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|embedly|quora link|bitlybot|applebot|petalbot|yandex|baidu|sogou|semrush|ahrefs|mj12|dotbot|dataprovider|censys|shodan|expanse|paloalto/i;

/**
 * Returns null for a human, or a short string naming the reason it is not.
 * Ordered cheapest-first; the network check runs last because it is the one
 * that needed a lookup.
 */
export function botReason({ userAgent, orgKind, viewportW, hasJs }) {
  if (!userAgent) return "no-ua";
  if (UA_BOT.test(userAgent)) return "ua";
  // A beacon only fires from executed JavaScript, so this is belt-and-braces;
  // it catches a replayed or hand-rolled POST.
  if (hasJs === false) return "no-js";
  // Real phones start around 320. Anything narrower is a synthetic viewport.
  if (typeof viewportW === "number" && viewportW > 0 && viewportW < 240) return "viewport";
  if (orgKind === "hosting") return "datacenter";
  return null;
}

// ---------------------------------------------------------------------------
// User agent → the two fields anyone actually reads
// ---------------------------------------------------------------------------
//
// Deliberately not a UA-parsing dependency. Those libraries carry a thousand
// regexes to distinguish browsers that no longer exist; this needs "which of
// the five, roughly" and nothing more. Order matters throughout — every
// Chromium browser also says "Chrome", and Edge also says "Safari".

export function parseUa(ua = "") {
  let browser = "Other";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/arc\//i.test(ua)) browser = "Arc";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/chrome\/|crios\//i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua)) browser = "Safari";

  let os = "Other";
  if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  const isMobile = /mobile|iphone|ipod|android.*mobile/i.test(ua);
  return { browser, os, isMobile };
}

/** "https://www.linkedin.com/in/x?y" -> "linkedin.com" */
export function refHost(referrer) {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}
