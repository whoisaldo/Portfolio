// src/front/private/editor/Publish.jsx: putting a draft on the public blog.
//
// A chunk of its own, loaded the first time Ali presses Publish
// (../owner.jsx), which has saved what was typed by then. The stats service
// does the publishing (POST /api/publish): it writes the draft's Markdown,
// highlights taken out, and its media into the site's repository as one
// commit, and the site's own workflow deploys it. The draft, its media and
// its comments are not touched.
//
// First a dry run, which writes nothing, says which files would be added or
// updated. Confirming publishes the draft as the server has it, and only if
// that is still the version the dry run was for. The dialog is modal, so
// nothing can be typed into the draft in between.
import React, { useEffect, useRef, useState } from "react";
import { request } from "../api";
import Modal from "./Modal";
import { CHANGE, formatSize, publishError } from "./publishing";

// A first publish sends the media too, which can be tens of megabytes.
const TIMEOUT = 300_000;

/**
 * @param {{draft: object, update: boolean, standing: object, onPublished: (draft: object) => void, onClose: () => void}} props
 *   `update` when the draft has been published before; `standing`, the
 *   public post's state as the button has it (../published.js).
 */
export default function Publish({ draft, update, standing, onPublished, onClose }) {
  const slug = draft.slug;
  const live = `https://aliyounes.dev/blog/${slug}/`;
  const [st, setSt] = useState({ phase: "checking" });
  // The button to press, once there is something to press it for.
  const confirm = useRef(null);
  useEffect(() => {
    if (st.phase === "ready") confirm.current?.focus();
  }, [st.phase]);

  useEffect(() => {
    let on = true;
    request("/api/publish", { method: "POST", body: { slug, dryRun: true }, timeout: 60_000 })
      .then(({ data }) => on && setSt({ phase: "ready", plan: data }))
      .catch((err) => on && setSt({ phase: "error", message: publishError(err, slug) }));
    return () => {
      on = false;
    };
  }, [slug]);

  const publish = async () => {
    const plan = st.plan;
    setSt({ phase: "publishing", plan });
    try {
      // Exactly the version the dry run was for: not one saved since.
      const { data: now } = await request(`/api/drafts?slug=${encodeURIComponent(slug)}`);
      if (now.draft.updated_at !== draft.updated_at) {
        setSt({ phase: "error", message: "The draft was saved again since this was checked. Close this and press Publish again to publish what it says now." });
        return;
      }
      const { data } = await request("/api/publish", { method: "POST", body: { slug, dryRun: false }, timeout: TIMEOUT });
      setSt({ phase: "done", result: data });
      const after = await request(`/api/drafts?slug=${encodeURIComponent(slug)}`).catch(() => null);
      onPublished(after?.data.draft ?? { ...now.draft, published: { sha: data.commit.sha, url: data.commit.url, at: new Date().toISOString(), current: true } });
    } catch (err) {
      // No answer to the publish itself: it may have gone through.
      const message =
        err.status === 0 && plan
          ? "No answer came back, so it may or may not have published. Check the site's Actions page, or press Publish again: it sends only what the site doesn't have yet."
          : publishError(err, slug);
      setSt({ phase: "error", message });
    }
  };

  const files = st.plan?.files || [];
  const nothing = files.length > 0 && files.every((f) => f.change === "same");
  const first = !update;
  const verb = first ? "Publish" : "Update public post";

  return (
    <Modal label={first ? "Publish this draft" : "Update the public post"} className="owner-ask publish" onClose={() => st.phase !== "publishing" && onClose()}>
      <h2 className="owner-ask-title">{st.phase === "done" ? "Published" : first ? "Publish this draft" : "Update the public post"}</h2>

      {st.phase === "done" ? (
        <>
          <p>
            One commit is on the site's repository. The site takes a couple of minutes to rebuild, and the post is at its address once it has.
          </p>
          <ul className="publish-links">
            <li>
              <a href={live} target="_blank" rel="noreferrer">
                {live} <span aria-hidden="true">↗</span>
              </a>
            </li>
            <li>
              <a href={st.result.commit.url} target="_blank" rel="noreferrer">
                Commit {st.result.commit.sha.slice(0, 7)} <span aria-hidden="true">↗</span>
              </a>
            </li>
            <li>
              <a href={st.result.actions_url} target="_blank" rel="noreferrer">
                The rebuild, on GitHub Actions <span aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>
          <div className="owner-ask-buttons">
            <button type="button" className="private-primary chamfer chamfer-sm" onClick={onClose} autoFocus>
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={`publish-standing is-${standing.state}`}>
            <span className="owner-dot" aria-hidden="true" />
            {standing.live ? (
              <>
                <a href={standing.live} target="_blank" rel="noreferrer">
                  Published
                </a>
                {standing.label.slice("Published".length)}
              </>
            ) : (
              standing.label
            )}
          </p>
          <p className="publish-address">
            <span>Public address</span>
            <b>{live}</b>
          </p>
          {st.phase === "checking" && <p className="history-hint">Checking what will change…</p>}
          {files.length > 0 && (
            <>
              <p className="publish-repo">
                One commit to {st.plan.repo || "the site"}
                {st.plan.branch ? `, ${st.plan.branch}` : ""}:
              </p>
              <ul className="publish-files">
                {files.map((f) => (
                  <li key={f.path} className={`is-${f.change}`}>
                    <span className="publish-path">{f.path}</span>
                    <span className="publish-change">{CHANGE[f.change] || f.change}</span>
                    <span className="publish-size tabular-nums">{formatSize(f.size)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <ul className="publish-notes">
            <li>Highlights are removed from the public copy.</li>
            <li>Comments stay private. They stay with this draft, and the public post doesn't show them.</li>
          </ul>
          {nothing && <p className="private-notice">The public post already matches this draft. There is nothing to publish.</p>}
          {st.phase === "error" && (
            <p className="private-notice publish-error" role="alert">
              {st.message}
            </p>
          )}
          <div className="owner-ask-buttons">
            {!nothing && st.phase !== "error" && (
              <button ref={confirm} type="button" className="private-primary chamfer chamfer-sm" disabled={st.phase !== "ready"} onClick={publish}>
                {st.phase === "publishing" ? "Publishing…" : verb}
              </button>
            )}
            <button type="button" className="draft-text-button" onClick={onClose} disabled={st.phase === "publishing"}>
              {st.phase === "error" || nothing ? "Close" : "Cancel"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
