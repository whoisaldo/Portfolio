// src/front/private/typed.js: what someone has typed on a draft and not
// sent, kept in this browser, so a reload, a phone throwing the tab away, a
// trip to the list and back or a session that ran out loses none of it.
//
// It is kept per person and per draft: under the reader's username, or one
// value for Ali, so no one is ever shown another's words, nor a draft's on
// another. One localStorage entry each, `draft-unsent:<who>:<slug>`, holds
// that person's slots on that draft, each one box's words:
//
//   "new:comment:<passage>", "new:suggest:<passage>"  a new thread on a passage:
//       {kind, quote: {exact, prefix, suffix}, body} or {kind, quote, words, note}
//   "general"            a comment on the whole draft: {body}
//   "reply:<thread id>"  a reply: {body}
//   "edit:<comment id>"  an edit of one's own comment: {body}
//
// A slot also holds `at`, when it was last typed in, and, once it has been
// sent, `id` and `idFor`: the id the service is told the message has, and
// the words it was sent with (sendTyped, below). A slot older than 30 days
// is dropped. Sent or cancelled, a slot goes.
//
// Absent and empty differ: a suggestion emptied to a deletion, or an edit
// emptied, is kept as "" and comes back as "".
//
// The words are first in memory, then written a moment after (and at once
// when the page is hidden or left). If the browser will not keep them
// (full, private, blocked), they are only in memory, as before: nothing
// here throws.

const PREFIX = "draft-unsent:";
const MONTH = 30 * 24 * 60 * 60 * 1000;
const WAIT = 400;

/** Whose words these are: the reader's username, or "owner" for Ali; null for no one. */
export function who(viewer) {
  if (!viewer) return null;
  if (viewer.owner) return "owner";
  return viewer.username ? `reader.${viewer.username}` : null;
}

export const typedKey = (person, slug) => `${PREFIX}${encodeURIComponent(person)}:${encodeURIComponent(slug)}`;

/** The slot of a new thread on `quote`, a comment or a suggestion: the passage, its context and all. */
export const passageSlot = (kind, quote) => `new:${kind}:${JSON.stringify([quote.exact, quote.prefix ?? "", quote.suffix ?? ""])}`;
export const isPassageSlot = (slot) => slot.startsWith("new:");

/** Whether a slot holds anything a person typed: words to keep a box open for. */
export function hasWords(slot, entry) {
  if (!entry) return false;
  if (entry.kind === "suggest") return entry.words !== entry.quote?.exact || Boolean(entry.note);
  if (slot.startsWith("edit:")) return typeof entry.body === "string";
  return Boolean(entry.body?.trim());
}

function readAll(key, now) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    const slots = v && typeof v.slots === "object" && v.slots ? v.slots : {};
    return Object.fromEntries(Object.entries(slots).filter(([, e]) => e && typeof e === "object" && now - e.at < MONTH));
  } catch {
    return {};
  }
}

function writeAll(key, slots) {
  try {
    if (Object.keys(slots).length) localStorage.setItem(key, JSON.stringify({ slots }));
    else localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Every person's slots older than 30 days, on any draft, dropped. */
export function sweepTyped(now = Date.now()) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) writeAll(k, readAll(k, now));
  } catch {
    // Storage that cannot be listed keeps what it has.
  }
}

/**
 * One person's unsent words on one draft: in memory, and kept in the browser
 * as they change. `person` null keeps them in memory only.
 */
export function typedStore(person, slug, { now = Date.now, wait = WAIT } = {}) {
  const key = person && typedKey(person, slug);
  const slots = new Map(key ? Object.entries(readAll(key, now())) : []);
  // The slots changed here since they were last written. Only those are
  // written: another tab's, on the same draft, are left as it has them.
  const dirty = new Set();
  let timer = 0;

  function flush() {
    clearTimeout(timer);
    timer = 0;
    if (!key || !dirty.size) return;
    const all = readAll(key, now());
    for (const slot of dirty) {
      if (slots.has(slot)) all[slot] = slots.get(slot);
      else delete all[slot];
    }
    if (writeAll(key, all)) dirty.clear();
  }
  function changed(slot) {
    dirty.add(slot);
    clearTimeout(timer);
    timer = setTimeout(flush, wait);
  }

  return {
    has: (slot) => slots.has(slot),
    get: (slot) => slots.get(slot),
    /** The slot's fields replaced by `fields`, keeping its id. */
    set(slot, fields) {
      const old = slots.get(slot);
      slots.set(slot, { ...fields, ...(old?.id ? { id: old.id, idFor: old.idFor } : {}), at: now() });
      changed(slot);
    },
    drop(slot) {
      if (!slots.has(slot)) return;
      slots.delete(slot);
      changed(slot);
    },
    /** [slot, entry] for every slot, the one typed in last first. */
    latest: () => [...slots].sort((a, b) => b[1].at - a[1].at),
    flush,
    /**
     * The id to send `fields` with from `slot`: the one it was sent with
     * before when the words are the very same, else a new one, kept with
     * the words at once, so a reload sends it again.
     */
    idFor(slot, fields, make = newId) {
      const e = slots.get(slot) || { at: now() };
      const words = sentAs(fields);
      if (e.id && e.idFor === words) return e.id;
      const id = make();
      slots.set(slot, { ...e, id, idFor: words });
      dirty.add(slot);
      flush();
      return id;
    },
    /** The slot's id let go: the next send makes another. */
    forgetId(slot) {
      const e = slots.get(slot);
      if (!e?.id) return;
      const { id: _id, idFor: _for, ...rest } = e;
      slots.set(slot, rest);
      changed(slot);
    },
  };
}

/** What the service compares when the same id comes again. */
const sentAs = (f) => JSON.stringify([f.thread ?? null, f.body ?? "", f.quote ?? null, f.prefix ?? null, f.suffix ?? null, f.suggestion ?? null]);

/** A version 4 UUID; crypto.randomUUID is only there on HTTPS and localhost. */
export function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Sends the words in `slot` as a new comment through `create`, with their id.
 * The service refusing that id (409, field "id": it holds something else)
 * lets the id go, so the next press makes a fresh one; its words are thrown
 * on, to show.
 */
export async function sendTyped(store, slot, fields, create) {
  const id = store.idFor(slot, fields);
  try {
    return await create({ ...fields, id });
  } catch (err) {
    if (err?.status === 409 && err.field === "id") store.forgetId(slot);
    throw err;
  }
}

/**
 * Where a new thread opens when a person picks a passage (`target`, a
 * passage slot): there, unless a composer already holds words for another
 * passage, or the other kind on this one. Those stay where they were typed
 * and that one opens instead, `blocked`, to be sent or cancelled first:
 * words typed for one passage never go with another. `open` is the slot of
 * the composer open now, if any; else the newest kept one with words counts.
 */
export function startPassage(store, target, open = null) {
  const holding = (slot) => slot && slot !== target && isPassageSlot(slot) && hasWords(slot, store.get(slot));
  if (holding(open)) return { slot: open, blocked: true };
  const kept = store.latest().find(([slot]) => holding(slot));
  return kept ? { slot: kept[0], blocked: true } : { slot: target, blocked: false };
}

/**
 * The box to open again when the page opens: the one typed in last that
 * still has words and somewhere to be (`there(slot)`). Null for none.
 */
export function toReopen(store, there) {
  return store.latest().find(([slot, e]) => hasWords(slot, e) && there(slot))?.[0] ?? null;
}
