// src/front/private/editor/NewDraft.jsx: starting a draft from the list of
// drafts.
//
// A chunk of its own, loaded when Ali presses New draft (../owner.jsx). The
// form asks what a draft cannot be saved without: a title, an address, a
// summary and a date. The address follows the title (./address.js) until
// Ali types one of his own. The draft is made empty, at an address no draft
// has (the stats service refuses one that is taken, rather than writing
// over it), and opens in the editor with the caret in its text.
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, request } from "../api";
import { addressFrom, isAddress, today, typedAddress } from "./address";
import "./dialogs.css";

export default function NewDraft({ onClose }) {
  const navigate = useNavigate();
  const [f, setF] = useState(() => ({ title: "", slug: "", summary: "", date: today() }));
  const [own, setOwn] = useState(false);
  const [error, setError] = useState(null); // {field, message}
  const [sending, setSending] = useState(false);
  const title = useRef(null);
  useEffect(() => title.current?.focus(), []);

  const set = (name, value) => {
    setError(null);
    setF((v) => ({ ...v, [name]: value, ...(name === "title" && !own ? { slug: addressFrom(value) } : {}) }));
  };

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = { ...f, title: f.title.trim(), summary: f.summary.trim(), slug: f.slug.replace(/-+$/, "") };
    const wrong = !d.title
      ? { field: "title", message: "Add a title." }
      : !isAddress(d.slug)
        ? { field: "slug", message: "An address is lowercase letters, digits and single hyphens." }
        : !d.summary
          ? { field: "summary", message: "Add a summary. It shows under the title in the list, and when the post is shared." }
          : !/^\d{4}-\d{2}-\d{2}$/.test(d.date)
            ? { field: "date", message: "Pick a date." }
            : null;
    if (wrong) {
      setError(wrong);
      form.elements[wrong.field]?.focus();
      return;
    }
    setSending(true);
    try {
      await request("/api/drafts", { method: "PUT", body: { slug: d.slug, title: d.title, date: d.date, summary: d.summary, body: "", base: null, kind: "autosave" } });
      navigate(`/privateblog/${d.slug}`, { state: { edit: "new" } });
    } catch (err) {
      const field = err instanceof ApiError && err.status === 409 ? "slug" : err.field || null;
      setError({ field, message: err.message });
      if (field) form.elements[field]?.focus();
      setSending(false);
    }
  }

  const wrong = (name) => (error?.field === name ? " is-wrong" : "");
  return (
    <form className="newdraft" onSubmit={submit} noValidate aria-label="New draft" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className={`private-field${wrong("title")}`}>
        <label htmlFor="newdraft-title">Title</label>
        <input ref={title} id="newdraft-title" name="title" type="text" maxLength={200} value={f.title} onChange={(e) => set("title", e.target.value.replace(/\s*\n\s*/g, " "))} />
      </div>
      <div className={`private-field${wrong("slug")}`}>
        <label htmlFor="newdraft-slug">Address</label>
        <div className="newdraft-slug">
          <span aria-hidden="true">/privateblog/</span>
          <input
            id="newdraft-slug"
            name="slug"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            maxLength={80}
            value={f.slug}
            aria-describedby="newdraft-slug-hint"
            onChange={(e) => {
              const v = typedAddress(e.target.value);
              // Emptied, it follows the title again.
              setOwn(v !== "");
              setError(null);
              setF((x) => ({ ...x, slug: v || addressFrom(x.title) }));
            }}
            onBlur={() => setF((x) => ({ ...x, slug: x.slug.replace(/-+$/, "") }))}
          />
        </div>
        <p id="newdraft-slug-hint" className="newdraft-hint">
          Lowercase letters, digits and hyphens. Published, it is aliyounes.dev/blog/{f.slug || "…"}/
        </p>
      </div>
      <div className={`private-field${wrong("summary")}`}>
        <label htmlFor="newdraft-summary">Summary</label>
        <input id="newdraft-summary" name="summary" type="text" maxLength={500} value={f.summary} onChange={(e) => set("summary", e.target.value.replace(/\s*\n\s*/g, " "))} />
      </div>
      <div className={`private-field newdraft-date${wrong("date")}`}>
        <label htmlFor="newdraft-date">Date</label>
        <input id="newdraft-date" name="date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="private-error">
          {error.message}
        </p>
      )}
      <div className="owner-ask-buttons">
        <button type="submit" className="private-primary chamfer chamfer-sm" disabled={sending}>
          {sending ? "Creating…" : "Create and edit"}
        </button>
        <button type="button" className="draft-text-button" onClick={onClose} disabled={sending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
