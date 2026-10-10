import { test } from "node:test";
import assert from "node:assert/strict";
import { score, localTime } from "../lib/score.js";

// Tuesday 2026-10-06, 14:00 in Boston.
const WEEKDAY_AFTERNOON = "2026-10-06T18:00:00Z";
// Saturday 2026-10-10, 22:00 in Boston.
const SATURDAY_NIGHT = "2026-10-11T02:00:00Z";

test("local time is read in the visitor's timezone", () => {
  assert.deepEqual(localTime(WEEKDAY_AFTERNOON, "America/New_York"), { hour: 14, day: 2 });
  assert.deepEqual(localTime(WEEKDAY_AFTERNOON, "America/Los_Angeles"), { hour: 11, day: 2 });
  assert.equal(localTime(WEEKDAY_AFTERNOON, "Not/AZone"), null);
});

test("a recruiter link on a weekday from an ATS reads as a recruiter", () => {
  const s = score({
    started_at: WEEKDAY_AFTERNOON, client_tz: "America/New_York",
    src: "jane-amzn-x1z", link_code: "jane-amzn-x1z", link_kind: "recruiter", link_label: "Jane, Amazon",
    referrer_host: "app.greenhouse.io", is_mobile: false, resume_hits: 1,
  });
  assert.equal(s.verdict, "recruiter");
  assert.ok(s.reasons.some((r) => r.text.includes("Jane, Amazon")));
  assert.ok(s.reasons.some((r) => r.text.includes("greenhouse")));
});

test("typing /recruiters from the résumé counts toward recruiter", () => {
  const s = score({ started_at: WEEKDAY_AFTERNOON, landing_path: "/recruiters", is_mobile: false, org_kind: "corporate", org: "Fidelity" });
  assert.equal(s.verdict, "recruiter");
});

test("Instagram on a phone on a Saturday night reads as a friend", () => {
  const s = score({
    started_at: SATURDAY_NIGHT, client_tz: "America/New_York",
    referrer_host: "instagram.com", is_mobile: true, org_kind: "consumer", region: "MA", country: "US",
    used_console: true,
  });
  assert.equal(s.verdict, "friend");
});

test("Amazon's network counts only once the visit is not a bot", () => {
  const base = { started_at: WEEKDAY_AFTERNOON, org: "Amazon.com, Inc.", as_domain: "amazon.com", org_kind: "hosting" };
  assert.ok(score({ ...base, is_bot: false }).reasons.some((r) => r.text.includes("Amazon")));
  assert.ok(!score({ ...base, is_bot: true }).reasons.some((r) => r.text.includes("Amazon")));
});

test("a returning visitor carries the link they first came through", () => {
  const s = score({ started_at: WEEKDAY_AFTERNOON, src: null, link_code: "jane-amzn-x1z", link_kind: "recruiter", link_label: "Jane" });
  assert.ok(s.reasons[0].text.startsWith("first came through"));
});

test("a label beats the signals, and 'me' beats everything", () => {
  const signals = { started_at: WEEKDAY_AFTERNOON, referrer_host: "app.greenhouse.io" };
  assert.equal(score({ ...signals, visitor_kind: "friend", visitor_label: "Naman" }).verdict, "friend");
  assert.equal(score({ ...signals, visitor_kind: "other" }).verdict, "recruiter");
  assert.equal(score({ ...signals, is_me: true }).verdict, "me");
});

test("nothing much to go on is unknown", () => {
  assert.equal(score({ started_at: WEEKDAY_AFTERNOON }).verdict, "unknown");
});
