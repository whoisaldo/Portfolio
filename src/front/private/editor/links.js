// src/front/private/editor/links.js: which addresses a link in a draft may
// have.
//
// A draft's links are rendered by `marked` in the private read view and in
// the published post, so an address that runs script there (javascript:,
// data:, vbscript:) would run it for whoever clicks. Every way the editor
// makes a link asks this one check: the link box, a pasted or dropped link,
// a pasted address over a selection, and addresses linked as they are typed
// or pasted (./schema.js). Only web addresses, email, paths on this site and
// places on the page get through.
//
// It reads an address the way a browser would: entities decoded (as an
// href attribute is), tabs and line breaks anywhere dropped, and spaces and
// control characters at either end trimmed. No React, so the tests run it.

// Entities that could spell out what matters at the start of an address.
// Anything else stays as written, and the address then fails the check if it
// matters.
const NAMED = { amp: "&", colon: ":", sol: "/", bsol: "\\", num: "#", tab: "\t", newline: "\n", period: ".", quest: "?", lpar: "(", rpar: ")", nbsp: "\u00a0", lt: "<", gt: ">", quot: '"', apos: "'" };

/** One round of the entity decoding a browser does on an attribute. */
const decodeOnce = (s) =>
  s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));?/gi, (all, dec, hex, name) => {
    if (dec || hex) {
      const code = dec ? Number(dec) : parseInt(hex, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "\ufffd";
    }
    return NAMED[name.toLowerCase()] ?? all;
  });

/** As a browser reads an address: tabs and line breaks gone, the ends trimmed. */
// Control characters are what these look for.
// eslint-disable-next-line no-control-regex
const clean = (s) => s.replace(/[\t\n\r]/g, "").replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "");

const SAFE = /^(?:https?:\/\/|mailto:|\/(?![/\\])|#)/i;

/**
 * The address to store for what was typed or pasted, or null when it is not
 * one a draft's link may have: http, https, mailto, a path on this site
 * (/…, not //…) or a place on the page (#…).
 */
export function safeHref(raw) {
  if (typeof raw !== "string") return null;
  const url = clean(raw);
  // Decoded as often as it could be on its way to a page, and checked each time.
  let seen = url;
  for (let i = 0; i < 4; i++) {
    const next = clean(decodeOnce(seen));
    if (next === seen) break;
    seen = next;
  }
  // eslint-disable-next-line no-control-regex
  if (!url || !SAFE.test(url) || !SAFE.test(seen) || /[\u0000-\u001f\u007f]/.test(seen)) return null;
  return url;
}

/**
 * The address TipTap's link gives a bare address it finds in text
 * ("example.com", "someone@example.com"), checked.
 */
export function safeAutoLink(value) {
  const href = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : value.includes("@") ? `mailto:${value}` : `https://${value}`;
  return safeHref(href) !== null;
}

/** Said in the link box when an address is refused. */
export const REFUSED = "Use a web address (https://…), an email (mailto:…), a path on this site (/…) or a place on the page (#…).";
