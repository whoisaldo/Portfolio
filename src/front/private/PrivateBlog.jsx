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
// its text, media and comments come from stats-api (stats-api/api/drafts.js)
// after sign-in, and an address that is not a draft the reader can see is a
// not-found page, whatever the reason.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useParams } from "react-router-dom";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { profile } from "../../data/profile";
import { COLUMN, useTitle } from "../lib";
import { FrontFooter, FrontHeader, PostList } from "../parts";
import { PostPage } from "../BlogPost";
import { API, ApiError, mediaUrl, request } from "./api";
import DraftComments from "./DraftComments";
import "./private.css";

const TITLE = `Private · ${profile.name}`;

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
  if (!API) page = <Notice title="Not set up here">This build has no stats-api address, so there are no drafts to show.</Notice>;
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
 * /blog/<slug>/<file>. Here they are served by stats-api, to a signed-in
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

function Draft({ session }) {
  const { slug } = useParams();
  const [state, setState] = useState({ status: "loading", draft: null });
  const { lost } = session;
  useTitle(state.draft ? `${state.draft.title} · Private` : TITLE);

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

  const rewrite = useMemo(() => mediaRewriter(slug), [slug]);

  if (state.status === "missing") return <NotFound />;
  if (state.status === "error") return <Notice title="The draft couldn't load">Reload the page to try again.</Notice>;
  if (state.status === "loading") return <Shell />;

  const draft = state.draft;
  return (
    <PostPage
      post={draft}
      back={{ to: "/privateblog", label: "Private drafts" }}
      rewrite={rewrite}
      marker={
        <div className="private-marker-row">
          <span className="private-marker">
            <LockKeyhole className="size-3.5" aria-hidden="true" /> Private draft
          </span>
          <SignedIn session={session} />
        </div>
      }
      inside={(body) => <DraftComments slug={draft.slug} body={body} viewer={session.viewer} onLost={lost} />}
    />
  );
}
