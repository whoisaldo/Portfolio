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
// updated. Both it and the publish name the save they are for (`base`, the
// draft's updated_at), and the server refuses either once the draft has been
// saved since (409, with the time it was), so what is published is the
// version the dialog showed. Refused, the dry run is made again for the
// draft as it is now and the dialog says it changed. The dialog is modal, so
// nothing can be typed into the draft in between.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, request } from "../api";
import Modal from "./Modal";
import { CHANGE, formatSize, publishError } from "./publishing";

// A first publish sends the media too, which can be tens of megabytes.
const TIMEOUT = 300_000;

/** The server's answer when the draft was saved since `base`: not published, and when it was. */
const moved = (err) => err instanceof ApiError && err.status === 409 && typeof err.data?.draft_updated_at === "string";

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

  const on = useRef(true);
  useEffect(() => {
    on.current = true;
    return () => {
      on.current = false;
    };
  }, []);

  /** The dry run for the draft as it was saved at `base`; `changed` once it was saved again since the dialog opened. */
  const check = useCallback(
    async (base, changed = false) => {
      setSt({ phase: "checking", changed });
      try {
        const { data } = await request("/api/publish", { method: "POST", body: { slug, base, dryRun: true }, timeout: 60_000 });
        if (on.current) setSt({ phase: "ready", plan: data, base, changed });
      } catch (err) {
        if (!on.current) return;
        if (moved(err)) return check(err.data.draft_updated_at, true);
        setSt({ phase: "error", message: publishError(err, slug) });
      }
    },
    [slug],
  );
  useEffect(() => {
    check(draft.updated_at);
  }, [check, draft.updated_at]);

  const publish = async () => {
    const { plan, base } = st;
    setSt({ phase: "publishing", plan, base });
    try {
      const { data } = await request("/api/publish", { method: "POST", body: { slug, base, dryRun: false }, timeout: TIMEOUT });
      setSt({ phase: "done", result: data });
      const after = await request(`/api/drafts?slug=${encodeURIComponent(slug)}`).catch(() => null);
      // Without the draft, what is known: this version is the public one.
      const at = data.draft_updated_at ?? base;
      onPublished(
        after?.data.draft ?? {
          ...draft,
          updated_at: at,
          published: { sha: data.commit.sha, url: data.commit.url, at: new Date().toISOString(), current: at === draft.updated_at },
        },
      );
    } catch (err) {
      if (moved(err)) return check(err.data.draft_updated_at, true);
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
          {st.changed && (
            <p className="private-notice" role="status">
              The draft was saved again since you pressed Publish. This is what it says now.
            </p>
          )}
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
