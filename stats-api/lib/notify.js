// stats-api/lib/notify.js — telling Ali, as it happens.
//
// Two optional channels, both set by env var and both one POST:
//
//   NTFY_TOPIC           push to a phone through ntfy.sh. No account: install
//                        the ntfy app and subscribe to the topic. The topic
//                        name is the only secret, so make it long and random.
//   DISCORD_WEBHOOK_URL  a message in a Discord channel.
//
// Neither set, nothing is sent. A failed send is logged and forgotten: an
// alert is a convenience, and the visit is already in the database.

const PUBLIC_URL = () => (process.env.PUBLIC_URL || "https://stats.aliyounes.dev").replace(/\/+$/, "");

async function post(url, init) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);
  try {
    const res = await fetch(url, { ...init, method: "POST", signal: ctl.signal });
    if (!res.ok) console.error("notify:", url.split("/")[2], res.status);
  } catch (err) {
    console.error("notify:", err?.message || err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} title  one line, shown as the notification's heading
 * @param {string} body   the detail
 * @param {string} [path] dashboard route to open on tap, e.g. "#/s/<id>"
 */
export async function notify(title, body, path = "") {
  const link = PUBLIC_URL() + "/" + path;
  const jobs = [];
  if (process.env.NTFY_TOPIC) {
    jobs.push(post(`https://ntfy.sh/${encodeURIComponent(process.env.NTFY_TOPIC)}`, {
      body,
      headers: {
        // ntfy reads these headers as Latin-1. Anything outside it (é, ·, —)
        // is replaced rather than sent as mojibake.
        Title: title.replace(/[^\x20-\x7e]/g, "-"),
        Click: link,
        Tags: "eyes",
      },
    }));
  }
  if (process.env.DISCORD_WEBHOOK_URL) {
    jobs.push(post(process.env.DISCORD_WEBHOOK_URL, {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: `**${title}**\n${body}\n<${link}>`.slice(0, 1900) }),
    }));
  }
  await Promise.all(jobs);
}

/** "Amazon.com, Inc. · Seattle, WA, US" — the one line that says who. */
export function whoLine(s) {
  const net =
    s.org_kind === "relay" ? "iCloud Private Relay"
    : s.org_kind === "consumer" ? `${s.org || "home ISP"} (home network)`
    : s.org || "unknown network";
  const place = [s.city, s.region, s.country].filter(Boolean).join(", ");
  return place ? `${net} · ${place}` : net;
}
