// src/front/private/api.js: talking to stats.aliyounes.dev from the private blog.
//
// Every request carries the reader's cookie (credentials: "include").
// stats.aliyounes.dev and aliyounes.dev are the same site, so the browser
// sends it, and the stats service answers this origin by name.
// The address is VITE_COMMENTS_API, the one the public comments use; unset,
// as in a fork, the private blog says it is not set up here.

export const API = (import.meta.env.VITE_COMMENTS_API || "").replace(/\/+$/, "");

/** A failed request: `status` is the HTTP status, 0 when nothing came back. */
export class ApiError extends Error {
  constructor(message, status, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

/**
 * @param {string} path  "/api/drafts" and the like
 * @param {{method?: string, body?: object, timeout?: number}} [opts]
 * @returns {Promise<{status: number, data: any}>}
 */
export async function request(path, { method = "GET", body, timeout = 15_000 } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      credentials: "include",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  if (res.status === 204) return { status: 204, data: null };
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || "Something went wrong. Try again in a minute.", res.status, data?.field);
  return { status: res.status, data };
}

/** Where a draft's media is served from, signed in. */
export const mediaUrl = (slug, file) => `${API}/media/${encodeURIComponent(slug)}/${encodeURIComponent(file)}`;
