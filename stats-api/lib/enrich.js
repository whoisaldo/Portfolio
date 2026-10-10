// stats-api/lib/enrich.js — turning a request into the few facts worth keeping.
//
// Four jobs: find the IP, read where it is, look up the network it belongs
// to, and decide whether the whole thing is a robot.
//
// The network lookup is the point of the exercise. A raw hit log says
// "somebody read the Philips case study for four minutes". The same hit with
// its network resolved says "somebody at Amazon did", which is the difference
// between a number and a signal. It is also the ordinary, decades-old use of
// an access log — no cookies are set, nothing is correlated across sites, and
// the lookup names a network, never a person.

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
 * Stand-in visitor id for a browser that will not keep one (storage blocked,
 * some private windows). Same IP and same user agent within the salt's life
 * is the same visitor, which is right far more often than it is wrong.
 */
export function fallbackVisitorId(ip, ua) {
  if (!ip) return null;
  return "ipua:" + crypto.createHash("sha256").update(`${ip}|${ua || ""}`).digest("hex").slice(0, 20);
}

// ---------------------------------------------------------------------------
// Place
// ---------------------------------------------------------------------------

/**
 * Vercel's edge geolocates every request for free and passes the answer in
 * headers. City arrives percent-encoded ("S%C3%A3o%20Paulo"). Locally none of
 * these exist and every field is null.
 */
export function geoFromHeaders(headers) {
  const h = (name) => {
    const v = headers[name];
    return v ? String(v) : null;
  };
  const num = (name) => {
    const n = Number(h(name));
    return h(name) && Number.isFinite(n) ? n : null;
  };
  let city = h("x-vercel-ip-city");
  try {
    city = city && decodeURIComponent(city);
  } catch {
    /* keep the raw value */
  }
  return {
    country: h("x-vercel-ip-country")?.slice(0, 2) ?? null,
    region: h("x-vercel-ip-country-region")?.slice(0, 8) ?? null,
    city: city?.slice(0, 120) ?? null,
    postal: h("x-vercel-ip-postal-code")?.slice(0, 16) ?? null,
    latitude: num("x-vercel-ip-latitude"),
    longitude: num("x-vercel-ip-longitude"),
    ip_timezone: h("x-vercel-ip-timezone")?.slice(0, 64) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Network → organisation
// ---------------------------------------------------------------------------

// Datacentre and cloud networks. A browser session from inside one is a
// crawler, a scanner, a preview renderer, someone on a commercial VPN — or an
// employee, because Amazon, Google and Microsoft route their offices through
// the same AS as their clouds. So this list does not make a session a bot on
// its own; collect.js only calls it one if it then fails to behave like a
// reader. Matched against the AS name and its domain.
const HOSTING = [
  /amazon|\baws\b/i,
  /google/i,
  /microsoft|azure/i,
  /digitalocean/i,
  /hetzner/i,
  /\bovh/i,
  /linode|akamai/i,
  /vultr/i,
  /cloudflare/i,
  /oracle/i,
  /alibaba|aliyun/i,
  /tencent/i,
  /scaleway/i,
  /contabo/i,
  /leaseweb/i,
  /fastly/i,
  /datacamp|cdn77/i,
  /m247|nordvpn|mullvad|private internet access|surfshark|expressvpn|proton ag/i,
];

// iCloud Private Relay hands Safari's traffic to one of these three. A Safari
// visit from one is almost certainly an iPhone or Mac with Private Relay on,
// which is a real person whose network is hidden — not a datacentre.
const RELAY = /cloudflare|akamai|fastly/i;

// The companies whose offices share an AS with their cloud. A visit from one
// of these that reads like a person is shown under the company's name.
const BIG_TECH = /^(amazon|google|microsoft|apple|meta|facebook|oracle)\.com$/i;

// Consumer ISPs. Not uninteresting — this is most real traffic — but the org
// name carries no signal about who the reader is, so the dashboard groups them
// rather than listing them.
const CONSUMER = [
  /comcast|xfinity/i,
  /verizon|fios|cellco/i,
  /at&t|att services|sbc internet|\batt\.com/i,
  /spectrum|charter|time warner/i,
  /t-mobile|sprint/i,
  /cox communications/i,
  /centurylink|lumen|qwest/i,
  /frontier communications/i,
  /optimum|cablevision|altice/i,
  /\brcn\b|astound/i,
  /virgin media|sky (uk|broadband)|bt group|british telecom|talktalk/i,
  /rogers|bell canada|telus|shaw/i,
  /vodafone|orange|telefonica|deutsche telekom|free sas|proximus/i,
  /jio|airtel|bsnl/i,
  /starlink|hughesnet|viasat/i,
  /google fiber/i,
];

const EDUCATION = [/\buniversity\b|\bcollege\b|\bschool\b|\.edu\b|\bacadem|\binstitute of technology\b/i];

/** Strip the leading "AS12345 " that some providers prefix onto org strings. */
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
export function classifyOrg(org, domain = "") {
  if (!org && !domain) return "unknown";
  const s = `${org || ""} ${domain || ""}`;
  if (EDUCATION.some((r) => r.test(s))) return "education";
  // Consumer before hosting: Google Fiber is a home ISP, not Google's cloud.
  if (CONSUMER.some((r) => r.test(s))) return "consumer";
  if (HOSTING.some((r) => r.test(s))) return "hosting";
  return "corporate";
}

/**
 * Private Relay is decided per session: it needs the network and the browser.
 * ip-api names the relay outright; ipinfo only names the CDN carrying it.
 */
export function isRelay(org, browser) {
  if (!org) return false;
  return /icloud private relay/i.test(org) || (RELAY.test(org) && browser === "Safari");
}

/** By AS domain (ipinfo) or, failing that, by name (ip-api has no domain). */
export function isBigTech(domain, org) {
  if (domain) return BIG_TECH.test(domain);
  return /^(amazon|google|microsoft|apple|meta|facebook|oracle)\b/i.test(org || "");
}

const PRIVATE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fe80:|fc|fd)/i;

async function getJson(url, ms = 2500) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } });
    return res.ok ? await res.json() : null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Network lookup. ipinfo's Lite API when a token is set: free, no rate limit,
 * and it returns the AS's domain ("amazon.com"), which classifies far better
 * than the name alone. Without a token, ip-api.com's free endpoint, which also
 * flags proxies and mobile carriers but is rate-limited per source address —
 * and Vercel's functions share theirs — so it is the fallback, not the plan.
 *
 * Failure is not an error: a lookup that times out or 429s yields a session
 * with a null org rather than a dropped request. Losing the enrichment on one
 * row is a much smaller problem than losing the row.
 */
export async function lookupIp(ip, token) {
  if (!ip || PRIVATE.test(ip)) return {};
  try {
    if (token) {
      const d = await getJson(
        `https://api.ipinfo.io/lite/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`,
      );
      if (!d) return {};
      const org = cleanOrg(d.as_name) || null;
      return {
        org,
        asn: d.asn || null,
        as_domain: d.as_domain || null,
        org_kind: classifyOrg(org, d.as_domain),
        country: d.country_code || null,
      };
    }
    const d = await getJson(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,isp,org,as,mobile,proxy,hosting`,
    );
    if (!d || d.status !== "success") return {};
    const org = cleanOrg(d.org || d.isp || d.as);
    let kind = classifyOrg(org);
    if (d.hosting && kind !== "education") kind = "hosting";
    return {
      org,
      asn: asnOf(d.as),
      org_kind: kind,
      is_proxy: Boolean(d.proxy),
      is_mobile_net: Boolean(d.mobile),
      country: d.countryCode || null,
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
 * The verdicts that cannot change during a visit. Returns null for "nothing
 * conclusive", or a short string naming why it is not a person. The network
 * is deliberately absent; see `liveBotReason` in collect.js.
 */
export function hardBotReason({ userAgent, viewportW, webdriver }) {
  if (!userAgent) return "no-ua";
  if (UA_BOT.test(userAgent)) return "ua";
  // Set by every automation framework, including the ones that fake the UA.
  if (webdriver === true) return "webdriver";
  // Real phones start around 320. Anything narrower is a synthetic viewport.
  if (typeof viewportW === "number" && viewportW > 0 && viewportW < 240) return "viewport";
  return null;
}

// ---------------------------------------------------------------------------
// Preview fetchers → the app the link was pasted into
// ---------------------------------------------------------------------------
//
// Chat apps fetch og:image when a link is pasted, from their own servers (or,
// for iMessage, from the sender's phone). The user agent says which app.
// Order matters: iMessage's agent also claims to be facebookexternalhit and
// Twitterbot.

const PLATFORMS = [
  [/facebookexternalhit\/1\.1 facebot twitterbot\/1\.0/i, "iMessage"],
  [/slack/i, "Slack"],
  [/discordbot/i, "Discord"],
  [/linkedinbot/i, "LinkedIn"],
  [/whatsapp/i, "WhatsApp"],
  [/telegrambot/i, "Telegram"],
  [/skypeuripreview|teams/i, "Teams"],
  [/twitterbot/i, "X"],
  [/facebookexternalhit|facebot/i, "Facebook/Messenger"],
  [/googleimageproxy/i, "Gmail"],
  [/redditbot/i, "Reddit"],
  [/snapchat/i, "Snapchat"],
  [/googlebot|google-inspectiontool/i, "Google"],
  [/bingbot|bingpreview/i, "Bing"],
  [/applebot/i, "Apple"],
];

export function previewPlatform(ua = "") {
  for (const [re, name] of PLATFORMS) if (re.test(ua)) return name;
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
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/firefox\/|fxios/i.test(ua)) browser = "Firefox";
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
