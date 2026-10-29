// src/front/private/api.js: talking to stats.aliyounes.dev from the private blog.
//
// Every request carries the reader's cookie (credentials: "include").
// stats.aliyounes.dev and aliyounes.dev are the same site, so the browser
// sends it, and the stats service answers this origin by name.
// The address is VITE_COMMENTS_API, the one the public comments use; unset,
// as in a fork, the private blog says it is not set up here.

export const API = (import.meta.env.VITE_COMMENTS_API || "").replace(/\/+$/, "");

/**
 * A failed request: `status` is the HTTP status, 0 when nothing came back;
 * `data` is what came back with it (a 409 on a save carries the draft).
 */
export class ApiError extends Error {
  constructor(message, status, field, data) {
    super(message);
    this.status = status;
    this.field = field;
    this.data = data;
  }
}

/**
 * @param {string} path  "/api/drafts" and the like
 * @param {{method?: string, body?: object, bytes?: Blob, timeout?: number, keepalive?: boolean}} [opts]
 *   `bytes` is sent as application/octet-stream in place of a JSON body;
 *   `keepalive` lets a save outlive the page (it must be under 64 KB).
 * @returns {Promise<{status: number, data: any}>}
 */
export async function request(path, { method = "GET", body, bytes, timeout = 15_000, keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      credentials: "include",
      headers: bytes ? { "content-type": "application/octet-stream" } : body ? { "content-type": "application/json" } : undefined,
      body: bytes ?? (body ? JSON.stringify(body) : undefined),
      signal: AbortSignal.timeout(timeout),
      keepalive,
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  if (res.status === 204) return { status: 204, data: null };
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || "Something went wrong. Try again in a minute.", res.status, data?.field, data);
  return { status: res.status, data };
}

/** Where a draft's media is served from, signed in. */
export const mediaUrl = (slug, file) => `${API}/media/${encodeURIComponent(slug)}/${encodeURIComponent(file)}`;

const PART = 1024 * 1024;

/**
 * Uploads a file into a draft's media, as `name`, in 1 MiB parts, the
 * stats service's limit for one request. It is served once the last is in.
 */
export async function uploadMedia(slug, name, file) {
  const parts = Math.max(1, Math.ceil(file.size / PART));
  for (let part = 0; part < parts; part++) {
    const q = new URLSearchParams({ slug, media: name, part: String(part), parts: String(parts), size: String(file.size) });
    await request(`/api/drafts?${q}`, { method: "PUT", bytes: file.slice(part * PART, (part + 1) * PART), timeout: 120_000 });
  }
}
