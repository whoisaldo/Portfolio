// stats-api/lib/score.js — recruiter, friend, or can't tell.
//
// Nothing in a request says "recruiter". What there is, is a handful of weak
// signals that lean one way or the other: where they came from, which network,
// what time it was for them, what they did. Each one adds a point or two to a
// side, and the verdict is whichever side leads by two. The reasons are kept
// and shown, because a guess you can audit is useful and one you can't is not.
//
// A label set by hand in the dashboard beats all of it.
import { isBigTech } from "./enrich.js";

// Applicant tracking systems and job boards. A referrer from one of these is
// someone who clicked the link on an application.
const ATS =
  /greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|workday\.com|icims\.com|smartrecruiters\.com|jobvite\.com|bamboohr\.com|recruitee\.com|workable\.com|teamtailor\.com|breezy\.hr|jazzhr\.com|taleo\.net|successfactors|oraclecloud\.com|wellfound\.com|indeed\.com|joinhandshake\.com|symplicity\.com|gem\.com|hiringthing|dover\.com|rippling\.com/i;

// Where links between friends get pasted.
const SOCIAL =
  /instagram\.com|discord(app)?\.com|snapchat\.com|tiktok\.com|whatsapp\.com|messenger\.com|facebook\.com|reddit\.com|^t\.co$|^x\.com$|twitter\.com|telegram|groupme\.com/i;

/** Hour (0–23) and weekday (0 = Sunday) in the visitor's own timezone. */
export function localTime(iso, tz) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz || "America/New_York",
        hour: "numeric",
        hourCycle: "h23",
        weekday: "short",
      })
        .formatToParts(new Date(iso))
        .map((p) => [p.type, p.value]),
    );
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
    return { hour: Number(parts.hour), day };
  } catch {
    return null;
  }
}

/**
 * @param {object} s  a session row joined with its visitor, its link and a
 *                    few event flags; see the `sessions` query in query.js
 * @returns {{verdict: string, recruiter: number, friend: number, reasons: {side: string, text: string}[]}}
 */
export function score(s) {
  const reasons = [];
  let recruiter = 0;
  let friend = 0;
  const r = (n, text) => { recruiter += n; reasons.push({ side: "recruiter", text }); };
  const f = (n, text) => { friend += n; reasons.push({ side: "friend", text }); };

  if (s.is_me || s.visitor_kind === "me") {
    return { verdict: "me", recruiter: 0, friend: 0, reasons: [{ side: "me", text: "marked as you" }] };
  }

  // ---- how they arrived ---------------------------------------------------
  // `link_code` is this visit's ?s= or, failing that, the one the visitor
  // first arrived with.
  const code = s.link_code || s.src;
  const how = s.src ? "opened" : "first came through";
  if (s.link_kind === "recruiter") r(6, `${how} recruiter link "${s.link_label || code}"`);
  else if (s.link_kind === "friend") f(6, `${how} friend link "${s.link_label || code}"`);
  else if (code) reasons.push({ side: "info", text: `link code "${code}"` });

  const host = s.referrer_host || "";
  if (ATS.test(host)) r(4, `came from ${host}`);
  else if (/linkedin\.com|lnkd\.in/i.test(host)) r(2, "came from LinkedIn");
  else if (SOCIAL.test(host)) f(3, `came from ${host}`);

  const landedPlain = (s.landing_path || "").startsWith("/recruiters");
  if (landedPlain && !host) r(3, "typed or clicked /recruiters, the address on the résumé");
  else if (landedPlain) r(1, "landed on the recruiter view");
  else if (s.saw_plain) r(1, "switched to the recruiter view");

  // ---- network ------------------------------------------------------------
  const domain = s.as_domain || "";
  if (s.org_kind === "corporate") r(2, `on ${s.org}'s network`);
  else if (s.org_kind === "hosting" && !s.is_bot && isBigTech(domain, s.org)) {
    r(2, `on ${s.org} (office network or VPN)`);
  } else if (s.org_kind === "education") {
    if (/northeastern/i.test(`${s.org} ${domain}`)) f(2, "on Northeastern's network");
    else f(1, `on ${s.org}'s network`);
  } else if (s.org_kind === "consumer" && s.region === "MA" && s.country === "US") {
    f(1, "home internet in Massachusetts");
  }

  // ---- when, in their time ------------------------------------------------
  const t = localTime(s.started_at, s.client_tz || s.ip_timezone);
  if (t) {
    const weekday = t.day >= 1 && t.day <= 5;
    if (weekday && t.hour >= 9 && t.hour < 18) r(1, "weekday working hours, their time");
    else if (!weekday || t.hour >= 20 || t.hour < 7) f(1, weekday ? "late evening, their time" : "weekend");
  }

  // ---- what they did ------------------------------------------------------
  if (s.resume_hits > 0) r(2, "opened the résumé");
  if (s.used_console) f(2, "played with the console");
  if (s.door_sound) f(1, "went through the door with sound on");
  if (s.is_mobile) f(1, "on a phone");
  else if (s.is_mobile === false) r(1, "on a computer");
  if (s.visitor_sessions >= 3) f(1, `visited ${s.visitor_sessions} times`);

  // ---- a label beats everything --------------------------------------------
  if (s.visitor_kind && s.visitor_kind !== "other") {
    return {
      verdict: s.visitor_kind,
      recruiter,
      friend,
      reasons: [{ side: s.visitor_kind, text: `labelled "${s.visitor_label || s.visitor_kind}" by you` }, ...reasons],
    };
  }

  const verdict = recruiter - friend >= 2 ? "recruiter" : friend - recruiter >= 2 ? "friend" : "unknown";
  return { verdict, recruiter, friend, reasons };
}
