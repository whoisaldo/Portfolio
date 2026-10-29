// src/front/private/editor/publishing.js: what the Publish dialog
// (./Publish.jsx) says about the files and about a refusal.

/** 15374 -> "15.0 KB", as Finder counts. */
export function formatSize(bytes) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export const CHANGE = { add: "New", update: "Updated", same: "Unchanged" };

/**
 * A failed publish or dry run as Ali should read it, from the ApiError
 * (../api.js). Nothing reaches the site's repository in any of these.
 */
export function publishError(err, slug) {
  switch (err?.status) {
    case 503:
      // Before the stats service's migration it says so; otherwise there is no token.
      return /migration/i.test(err.message) ? `${err.message} Nothing was published.` : "Publishing isn't set up yet. Add GITHUB_PUBLISH_TOKEN to the stats service.";
    case 409:
      return `Another post on the site already has the address /blog/${slug}/. Nothing was published.`;
    case 502:
      return `GitHub didn't take it (${String(err.message).replace(/^GitHub:\s*/, "")}). Nothing was published; try again in a minute.`;
    case 404:
      return "This draft is no longer there, or you were signed out. Reload the page.";
    case 0:
      return "Couldn't reach the server. Check your connection and try again.";
    default:
      return err?.message || "Something went wrong. Try again in a minute.";
  }
}
