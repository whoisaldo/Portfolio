import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyOrg, hardBotReason, previewPlatform, isRelay, isBigTech, geoFromHeaders, parseUa,
} from "../lib/enrich.js";

test("networks are classified by name and domain", () => {
  assert.equal(classifyOrg("Amazon.com, Inc.", "amazon.com"), "hosting");
  assert.equal(classifyOrg("Google LLC", "google.com"), "hosting");
  assert.equal(classifyOrg("Google Fiber Inc.", "googlefiber.net"), "consumer");
  assert.equal(classifyOrg("Comcast Cable Communications, LLC", "comcast.net"), "consumer");
  assert.equal(classifyOrg("Northeastern University", "northeastern.edu"), "education");
  assert.equal(classifyOrg("Goldman Sachs & Co. LLC", "gs.com"), "corporate");
  assert.equal(classifyOrg("Lawson Software"), "corporate", "'aws' inside a word is not AWS");
  assert.equal(classifyOrg(null, null), "unknown");
});

test("big tech is recognised by domain, or by name when there is no domain", () => {
  assert.ok(isBigTech("amazon.com"));
  assert.ok(isBigTech(null, "Amazon.com, Inc."));
  assert.ok(!isBigTech("digitalocean.com"));
  assert.ok(!isBigTech(null, "Hetzner Online GmbH"));
});

test("Private Relay is Safari on a relay network, not a datacentre", () => {
  assert.ok(isRelay("Cloudflare, Inc.", "Safari"));
  assert.ok(isRelay("Akamai Technologies, Inc.", "Safari"));
  assert.ok(!isRelay("Cloudflare, Inc.", "Chrome"));
  assert.ok(!isRelay("Comcast Cable", "Safari"));
  assert.ok(isRelay("iCloud Private Relay", "Chrome"), "named outright by ip-api");
});

test("hard bot verdicts never consider the network", () => {
  const chrome = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
  assert.equal(hardBotReason({ userAgent: chrome, viewportW: 1440 }), null);
  assert.equal(hardBotReason({ userAgent: null }), "no-ua");
  assert.equal(hardBotReason({ userAgent: "Googlebot/2.1" }), "ua");
  assert.equal(hardBotReason({ userAgent: chrome, webdriver: true }), "webdriver");
  assert.equal(hardBotReason({ userAgent: chrome, viewportW: 120 }), "viewport");
});

test("preview fetchers are named, iMessage before Facebook", () => {
  assert.equal(previewPlatform("Mozilla/5.0 (Macintosh) AppleWebKit (KHTML, like Gecko) facebookexternalhit/1.1 Facebot Twitterbot/1.0"), "iMessage");
  assert.equal(previewPlatform("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"), "Facebook/Messenger");
  assert.equal(previewPlatform("Slack-ImgProxy (+https://api.slack.com/robots)"), "Slack");
  assert.equal(previewPlatform("Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"), "Discord");
  assert.equal(previewPlatform("LinkedInBot/1.0 (compatible; Mozilla/5.0)"), "LinkedIn");
  assert.equal(previewPlatform("Mozilla/5.0 (iPhone) Safari/604.1"), null);
});

test("Vercel geo headers are decoded", () => {
  const g = geoFromHeaders({
    "x-vercel-ip-city": "S%C3%A3o%20Paulo",
    "x-vercel-ip-country": "BR",
    "x-vercel-ip-country-region": "SP",
    "x-vercel-ip-latitude": "-23.5",
    "x-vercel-ip-longitude": "-46.6",
    "x-vercel-ip-timezone": "America/Sao_Paulo",
  });
  assert.equal(g.city, "São Paulo");
  assert.equal(g.latitude, -23.5);
  assert.equal(g.ip_timezone, "America/Sao_Paulo");
  assert.equal(geoFromHeaders({}).city, null);
});

test("user agents reduce to browser and OS", () => {
  assert.deepEqual(
    parseUa("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"),
    { browser: "Safari", os: "iOS", isMobile: true },
  );
});
