// src/front/private/PrivateBlog.jsx: /privateblog, the drafts Ali shows a
// few people before he publishes them.
//
// Signed out, every address here is a login form. Signed in, /privateblog
// lists the drafts the way /blog lists posts, and /privateblog/<slug> shows
// one exactly as the published post will look, through the same component
// (PostPage in ../BlogPost.jsx), with a marker that it is a draft and no
// "Share this post". Ali, signed into the dashboard, is signed in here as
// himself.
//
// The repository is public, so none of a draft is in it or in this chunk:
// its text, media and comments come from the stats service (stats.aliyounes.dev)
// after sign-in, and an address that is not a draft the reader can see is a
// not-found page, whatever the reason.
//
// Ali also has "Edit" on a draft, which loads the editor (./editor/, a chunk
// of its own that readers never fetch) in place of the text. Readers see his
// edits as he makes them: the comments' poll says when the draft changed, and
// the text is fetched again, unless the reader is selecting in it or typing
// a comment, when a notice offers it instead.
//
// His History, Publish and New draft buttons are in ./owner.jsx, a chunk
// loaded only for him, and what they open is lazy too.
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LockKeyhole, PencilLine } from "lucide-react";
import { profile } from "../../data/profile";
import { COLUMN, useTitle } from "../lib";
import { FrontFooter, FrontHeader, PostList } from "../parts";
import { PostPage } from "../BlogPost";
import { API, ApiError, mediaUrl, request } from "./api";
import DraftComments from "./DraftComments";
import { clearUnsaved, keepAnchors, newerThan, readAnchors, readUnsaved } from "./unsaved";
import "./private.css";

const TITLE = `Private · ${profile.name}`;

const owner = () => import("./owner");
const OwnerTools = lazy(() => owner().then((m) => ({ default: m.OwnerTools })));
const EditorTools = lazy(() => owner().then((m) => ({ default: m.EditorTools })));
const NewDraftButton = lazy(() => owner().then((m) => ({ default: m.NewDraftButton })));

export default function PrivateBlog() {
  const [viewer, setViewer] = useState(undefined);

  // Nothing here belongs in a search index, whichever way the reader came in
  // (the static page says so too: scripts/static-pages.mjs).
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.append(meta);
    return () => meta.remove();
  }, []);

  const check = useCallback(async () => {
    try {
      setViewer((await request("/api/reader")).data.viewer);
    } catch {
      setViewer(null);
    }
  }, []);
  useEffect(() => {
    if (API) check();
  }, [check]);

  const signOut = useCallback(async () => {
    await request("/api/reader?a=logout", { method: "POST", body: {} }).catch(() => {});
    setViewer(null);
  }, []);

  let page;
  if (!API) page = <Notice title="Not set up here">This build has no stats service address, so there are no drafts to show.</Notice>;
  else if (viewer === undefined) page = <Shell />;
  else if (!viewer) page = <Login onIn={setViewer} />;
  else {
    const session = { viewer, signOut, lost: check };
    page = (
      <Routes>
        <Route index element={<Index session={session} />} />
        <Route path=":slug" element={<Draft session={session} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }
  return page;
}

/** The header and footer every page here has, around what it shows. */
function Shell({ children }) {
  return (
    <>
      <FrontHeader />
      <main className={`${COLUMN} pb-24 pt-16 sm:pt-24`}>{children}</main>
      <FrontFooter />
    </>
  );
}

function Notice({ title, children }) {
  useTitle(TITLE);
  return (
    <Shell>
      <h1 className="font-display text-3xl font-semibold text-bone">{title}</h1>
      <p className="prose-dark mt-4">{children}</p>
    </Shell>
  );
}

function NotFound() {
  useTitle(TITLE);
  return (
    <Shell>
      <h1 className="font-display text-3xl font-semibold text-bone">No draft at this address</h1>
      <p className="prose-dark mt-4">It may have been published, renamed or taken down.</p>
      <Link to="/privateblog" className="private-back mt-6">
        <ArrowLeft className="size-3.5" aria-hidden="true" /> All drafts
      </Link>
    </Shell>
  );
}

/** Who is signed in, and the way out. */
function SignedIn({ session }) {
  const { viewer, signOut } = session;
  return (
    <p className="private-who">
      <LockKeyhole className="size-3.5" aria-hidden="true" />
      <span>
        Signed in as <b>{viewer.name}</b>
      </span>
      <span aria-hidden="true">·</span>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </p>
  );
}

function Login({ onIn }) {
  useTitle(TITLE);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const username = f.elements.username.value.trim();
    const password = f.elements.password.value;
    if (!username || !password) {
      setError("Enter your username and password.");
      f.elements[username ? "password" : "username"].focus();
      return;
    }
    setSending(true);
    setError("");
    try {
      const { data } = await request("/api/reader?a=login", { method: "POST", body: { username, password } });
      onIn(data.viewer);
    } catch (err) {
      setError(err.message);
      f.elements.password.select();
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-4xl font-semibold leading-none text-bone">Private drafts</h1>
      <p className="prose-dark mt-5 text-pretty">
        A private preview of my writing.
      </p>
      <form className="private-login" onSubmit={submit} noValidate aria-label="Sign in">
        <div className="private-field">
          <label htmlFor="private-username">Username</label>
          <input id="private-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={32} />
        </div>
        <div className="private-field">
          <label htmlFor="private-password">Password</label>
          <input id="private-password" name="password" type="password" autoComplete="current-password" maxLength={200} />
        </div>
        {error && (
          <p role="alert" className="private-error">
            {error}
          </p>
        )}
        <button type="submit" disabled={sending} className="private-primary chamfer chamfer-sm">
          {sending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Shell>
  );
}

function Index({ session }) {
  useTitle(TITLE);
  const [state, setState] = useState({ status: "loading", drafts: [] });
  const { lost } = session;

  const load = useCallback(async () => {
    try {
      const { data } = await request("/api/drafts");
      setState({ status: "ready", drafts: data.drafts });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return lost();
      setState({ status: "error", drafts: [] });
    }
  }, [lost]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell>
      <h1 className="font-display text-4xl font-semibold leading-none text-bone">Private drafts</h1>
      <p className="prose-dark mt-5 text-pretty">
        Writing before it is published. Select any passage to comment on it; everyone reading a draft sees its comments.
      </p>
      <SignedIn session={session} />
      {session.viewer.owner && (
        <Suspense fallback={null}>
          <NewDraftButton />
        </Suspense>
      )}
      <div className="mt-12">
        {state.status === "loading" && <p className="text-sm text-dim">Loading drafts…</p>}
        {state.status === "error" && (
          <p className="text-sm text-muted">
            The drafts couldn't load.{" "}
            <button type="button" className="private-link" onClick={load}>
              Try again
            </button>
          </p>
        )}
        {state.status === "ready" && state.drafts.length === 0 && <p className="text-sm text-dim">No drafts right now.</p>}
        {state.status === "ready" && state.drafts.length > 0 && <PostList posts={state.drafts} base="/privateblog" />}
      </div>
    </Shell>
  );
}

/**
 * A draft's Markdown names its media where the published post will have them,
 * /blog/<slug>/<file>. Here they are served by the stats service, to a signed-in
 * reader only. Rewritten in an inert <template>, so the browser never asks
 * for the public address first.
 */
function mediaRewriter(slug) {
  const prefix = `/blog/${slug}/`;
  return (html) => {
    const t = document.createElement("template");
    t.innerHTML = html;
    for (const el of t.content.querySelectorAll("[src], [poster], [href]")) {
      for (const attr of ["src", "poster", "href"]) {
        const v = el.getAttribute(attr);
        if (v?.startsWith(prefix)) el.setAttribute(attr, mediaUrl(slug, v.slice(prefix.length)));
      }
    }
    return t.innerHTML;
  };
}

const REFUSED = "This draft has formatting the editor can't keep exactly, so it stays as it is. Edit its Markdown from the dashboard instead.";
const kept = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Sends the comment passages' places an editing session left unsent for the
 * text this page has (./unsaved.js), if any. True when none are left for it.
 * Places for other text wait: a save sent as the editor's page closed may
 * still be on its way. They go with the save they belong to as their base,
 * or, when the editor never heard back from it, this page's draft, the text
 * they were found in; the server refuses them (409) once the draft has been
 * saved since, and they are dropped: whoever saved it sends places for that.
 */
async function sendLeftAnchors(draft) {
  const due = readAnchors(draft.slug).find((e) => e.body === draft.body);
  if (!due) return true;
  const body = { draft: draft.slug, anchors: due.changes, base: due.base ?? draft.updated_at };
  try {
    await request("/api/draft-comments?a=anchors", { method: "PUT", body });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 409)) throw err;
  }
  keepAnchors(draft.slug, due.body, null);
  return true;
}

const RETRY = [2000, 4000, 8000, 16_000, 30_000];

/** Whether new text can go in under the reader without moving what they are doing. */
function undisturbed() {
  const sel = window.getSelection();
  const selecting = sel && !sel.isCollapsed && sel.anchorNode?.parentElement?.closest(".post-body");
  const typing = document.activeElement?.closest?.(".draft-box");
  return !selecting && !typing;
}

function Draft({ session }) {
  const { slug } = useParams();
  const [state, setState] = useState({ status: "loading", draft: null });
  const { lost, viewer } = session;
  useTitle(state.draft ? `${state.draft.title} · Private` : TITLE);

  // Editing: the editor's component, once loaded, and where it starts from.
  const [editing, setEditing] = useState(null); // {Editor, restore}
  const [opening, setOpening] = useState(false);
  const [refused, setRefused] = useState("");
  const [bridge, setBridge] = useState(null);
  const [head, setHead] = useState(null);
  const [titleSlot, setTitleSlot] = useState(null);
  const [unsaved, setUnsaved] = useState(null);
  const [newer, setNewer] = useState(false);

  const current = useRef(null);
  current.current = { draft: state.draft, editing };

  useEffect(() => {
    let live = true;
    setState({ status: "loading", draft: null });
    request(`/api/drafts?slug=${encodeURIComponent(slug)}`)
      .then(({ data }) => live && setState({ status: "ready", draft: data.draft }))
      .catch(async (err) => {
        if (!live) return;
        // A 404 is "no such draft" or "signed out", and only the session
        // can tell which.
        if (err instanceof ApiError && err.status === 404) {
          const { data } = await request("/api/reader").catch(() => ({ data: {} }));
          if (!data.viewer) return lost();
          return setState({ status: "missing", draft: null });
        }
        setState({ status: "error", draft: null });
      });
    return () => {
      live = false;
    };
  }, [slug, lost]);

  // An edit this browser never got saved, offered back if it is newer than
  // the server's copy, and let go if it is not.
  const draft = state.draft;
  useEffect(() => {
    if (!viewer.owner || !draft || editing) return;
    const k = readUnsaved(draft.slug);
    if (newerThan(k, draft)) setUnsaved(k);
    else {
      if (k) clearUnsaved(draft.slug);
      setUnsaved(null);
    }
  }, [viewer.owner, draft, editing]);

  // Ali's: places left unsent by an editing session, sent as soon as the
  // server has the text they are in, and tried again until they are in. The
  // comments' next poll shows the passages where they now are.
  useEffect(() => {
    if (!viewer.owner || !draft || editing) return;
    let timer = 0;
    let tries = 0;
    let live = true;
    const send = () =>
      sendLeftAnchors(draft).catch((err) => {
        if (!live) return;
        if (err instanceof ApiError && err.status === 404) return lost();
        console.warn("comments: the passages' new places were not saved", err);
        timer = setTimeout(send, RETRY[Math.min(tries++, RETRY.length - 1)]);
      });
    send();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [viewer.owner, draft, editing, lost]);

  /** The latest draft in place of the one shown. Answers it, or null when it couldn't be had. */
  const refetch = useCallback(async () => {
    try {
      const { data } = await request(`/api/drafts?slug=${encodeURIComponent(slug)}`);
      if (current.current.editing) return null;
      setState((st) => (st.draft && data.draft.updated_at !== st.draft.updated_at ? { status: "ready", draft: data.draft } : st));
      setNewer(false);
      return data.draft;
    } catch {
      return null;
    }
  }, [slug]);

  // Each poll of the comments, answered or not, passes on the newest time
  // the draft was saved that any poll has said. Until the draft shown is as
  // new, each poll (each few seconds) asks for it, later and later while
  // that fails, and a reader who was selecting gets it as soon as they
  // stop. Both times are the server's, written alike, so they sort as text.
  const asking = useRef(false);
  const backoff = useRef({ tries: 0, until: 0 });
  const onDraftChange = useCallback(
    async (updatedAt) => {
      const { draft: d, editing: e } = current.current;
      if (e || !d || asking.current) return;
      if (updatedAt <= d.updated_at) return setNewer(false);
      if (!undisturbed()) return setNewer(true);
      if (Date.now() < backoff.current.until) return;
      asking.current = true;
      const got = await refetch();
      asking.current = false;
      const { tries } = backoff.current;
      backoff.current = got && updatedAt <= got.updated_at ? { tries: 0, until: 0 } : { tries: tries + 1, until: Date.now() + RETRY[Math.min(tries, RETRY.length - 1)] };
    },
    [refetch],
  );

  // `then(session)` runs once the editor is up: a version to restore, from
  // the read view's history.
  const edit = useCallback(
    async (restore = null, then = null) => {
      setOpening(true);
      setRefused("");
      try {
        const [{ default: Editor }, { check }] = await Promise.all([import("./editor/DraftEditor"), import("./editor/check")]);
        if (!check(current.current.draft.body) || (restore && !check(restore.body))) {
          setRefused(REFUSED);
          return;
        }
        // The editor finds each passage by what the server has, so places
        // from the last session go first.
        if (!(await sendLeftAnchors(current.current.draft).catch(() => false))) {
          setRefused("The comments' places from your last edit aren't saved yet. Check your connection and try again.");
          return;
        }
        setUnsaved(null);
        setNewer(false);
        setEditing({ Editor, restore, then });
      } catch (err) {
        console.warn("editor: could not load", err);
        setRefused("The editor couldn't load. Check your connection and try again.");
      } finally {
        setOpening(false);
      }
    },
    [],
  );

  const finish = useCallback((latest) => {
    setEditing(null);
    setBridge(null);
    setState({ status: "ready", draft: latest });
  }, []);

  const rewrite = useMemo(() => mediaRewriter(slug), [slug]);

  // A draft just made from the list opens in the editor, the caret in its text.
  const location = useLocation();
  const navigate = useNavigate();
  const fresh = location.state?.edit === "new";
  useEffect(() => {
    if (!fresh || !draft || !viewer.owner) return;
    navigate(location.pathname, { replace: true, state: null });
    edit(null, (session) => session.editor.commands.focus("start"));
  }, [fresh, draft, viewer.owner, navigate, location.pathname, edit]);

  if (state.status === "missing") return <NotFound />;
  if (state.status === "error") return <Notice title="The draft couldn't load">Reload the page to try again.</Notice>;
  if (state.status === "loading") return <Shell />;

  const Editor = editing?.Editor;
  return (
    <PostPage
      post={draft}
      back={{ to: "/privateblog", label: "Private drafts" }}
      rewrite={rewrite}
      marker={
        <>
          <div className="private-marker-row">
            <span className="private-marker">
              <LockKeyhole className="size-3.5" aria-hidden="true" /> Private draft
            </span>
            <SignedIn session={session} />
            {viewer.owner && !editing && (
              <button type="button" className="private-edit" onClick={() => edit()} disabled={opening}>
                <PencilLine className="size-3.5" aria-hidden="true" /> {opening ? "Opening…" : "Edit"}
              </button>
            )}
            {viewer.owner && !editing && (
              <Suspense fallback={null}>
                <OwnerTools
                  draft={draft}
                  rewrite={rewrite}
                  onRestore={(version) => edit(null, (session) => session.restoreVersion(version))}
                  onDraft={(d) => setState({ status: "ready", draft: d })}
                />
              </Suspense>
            )}
          </div>
          {refused && (
            <p role="alert" className="private-notice">
              {refused}
            </p>
          )}
          {unsaved && !editing && (
            <p className="private-notice">
              Changes from {kept.format(new Date(unsaved.at))} weren't saved, and are still in this browser.{" "}
              <button type="button" className="private-link" onClick={() => edit(unsaved)}>
                Restore them
              </button>{" "}
              <button
                type="button"
                className="private-link"
                onClick={() => {
                  if (!window.confirm("Discard the unsaved changes in this browser?")) return;
                  clearUnsaved(draft.slug);
                  setUnsaved(null);
                }}
              >
                Discard
              </button>
            </p>
          )}
          {newer && !editing && (
            <p className="private-notice" role="status">
              {viewer.owner ? "This draft was updated" : "Ali updated this draft"} ·{" "}
              <button type="button" className="private-link" onClick={refetch}>
                Show
              </button>
            </p>
          )}
        </>
      }
      editing={
        editing && {
          head: <div ref={setHead} className="editor-head" />,
          title: <div ref={setTitleSlot} />,
          body: (
            <Editor
              draft={draft}
              rewrite={rewrite}
              hosts={{ head, title: titleSlot }}
              restore={editing.restore}
              onBridge={setBridge}
              onDone={finish}
              onLost={lost}
              slot={(session, place) => (
                <Suspense fallback={null}>
                  <EditorTools session={session} place={place} then={editing.then} rewrite={rewrite} />
                </Suspense>
              )}
            />
          ),
        }
      }
      inside={(body) => (
        <DraftComments slug={draft.slug} body={body} viewer={viewer} onLost={lost} bodyKey={draft.updated_at} bridge={editing ? bridge : null} onDraftChange={onDraftChange} />
      )}
    />
  );
}
