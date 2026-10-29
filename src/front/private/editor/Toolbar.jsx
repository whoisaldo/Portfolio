// src/front/private/editor/Toolbar.jsx: what the editor looks like around the
// text: its toolbar, and the title, date and summary typed in place.
//
// The toolbar is one row, the width of the article's column, as Docs keeps
// its own: Undo and Redo, the text style, Bold, Italic, Code and Link, the
// highlight and its colours, the lists, and at the right the save status,
// History, Publish and Done. The column is narrower than all of that even on
// a wide screen, so the row folds as the room runs out, measured rather than
// guessed at a breakpoint: first the save status becomes an icon (its words
// in the tooltip), then Code and the lists go into a "More" menu, then
// History does, then Link (Cmd+K still opens it). Publish and Done never fold. Past that, on a phone, the
// formatting scrolls sideways under a fade, and the end stays put.
//
// Every button keeps the editor's focus and selection where they are; menus
// close on Escape or a click elsewhere and hand the focus back.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bold, Check, CloudOff, Code, Ellipsis, Highlighter, Italic, Link2, List, ListOrdered, LoaderCircle, Redo2, TriangleAlert, Undo2, Upload,
} from "lucide-react";
import { COLORS } from "./schema";
import "./toolbar.css";

// As the post's own date line has it (../posts.js), written out here so this
// chunk asks nothing of the public pages' chunks.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDate = (iso) => dateFormat.format(new Date(`${iso}T12:00:00`));
const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const keys = (k) => (mac ? k.replace("Mod+", "⌘").replace("Shift+", "⇧") : k.replace("Mod+", "Ctrl+"));

// How far the row has folded: 1 the status is an icon, 2 Code and the lists
// are in More, 3 History is too, 4 and Link.
const HISTORY = 3;
const MOST = 4;

/** A toolbar button that leaves the editor's focus and selection where they are. */
export function Tool({ label, keys: shortcut, active, disabled, onPress, className = "", children, ...rest }) {
  return (
    <button
      type="button"
      className={`editor-tool${active ? " is-on" : ""} ${className}`}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={shortcut ? `${label} (${keys(shortcut)})` : label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      {...rest}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="editor-sep" aria-hidden="true" />;

// Lucide's chevron-down, drawn here: the public pages' chunks have their own
// copy of it, and borrowing that would change what they export.
const Chevron = () => (
  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** Open, and closed again by Escape or by a click anywhere outside `inside`. */
function usePopover() {
  const [open, setOpen] = useState(null);
  const inside = useRef([]);
  useEffect(() => {
    if (!open) return;
    const away = (e) => !inside.current.some((el) => el?.contains(e.target)) && setOpen(null);
    const esc = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      // Back to the button when the menu had the focus; a click left it in the text.
      if (inside.current[1]?.contains(document.activeElement)) inside.current[0]?.focus();
      setOpen(null);
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", esc, true);
    };
  }, [open]);
  return [open, setOpen, inside];
}

const STATUS_ICON = { saved: Check, pending: LoaderCircle, saving: LoaderCircle, offline: CloudOff, conflict: TriangleAlert, error: TriangleAlert };

/** The one status line: the save state, as words or, folded, as an icon with them in its tooltip. */
function Status({ label, state, uploading, folded }) {
  const Icon = uploading ? Upload : STATUS_ICON[state] || Check;
  return (
    <span className={`editor-status is-${state}${folded ? " is-folded" : ""}`} title={label}>
      {folded && <Icon className={`size-4${state === "saving" || state === "pending" ? " editor-spin" : ""}`} aria-hidden="true" />}
      <span className={folded ? "editor-sr" : "editor-status-text"} role="status" aria-live="polite">
        {label}
      </span>
    </span>
  );
}

/**
 * @param {{editor: object, label: string, state: string, uploading: boolean, leaving: boolean,
 *   onDone: () => void, onLink: () => void, actions?: React.ReactNode, menu?: React.ReactNode}} props
 *   `actions` go between the status and Done (History, Publish); `menu`
 *   is what of them goes in More once History has folded.
 */
export function Toolbar({ editor, label, state, uploading, leaving, onDone, onLink, actions, menu }) {
  const run = () => editor.chain().focus();
  const level = [2, 3].find((l) => editor.isActive("heading", { level: l }));
  // A picture or a raw block selected has no text style to set. (A
  // paragraph can't be set to a paragraph, so it asks for a heading too.)
  const styled = Boolean(level) || editor.can().setParagraph() || editor.can().setHeading({ level: 2 });
  const last = editor.storage.highlight.last;

  const wrap = useRef(null);
  const bar = useRef(null);
  const tools = useRef(null);
  const [colors, setColors, colorsIn] = usePopover();
  const [more, setMore, moreIn] = usePopover();

  // ---- folding to the room there is --------------------------------------------
  const [fold, setFold] = useState(0);
  const [width, setWidth] = useState(0);
  // The row's width each fold needed, so it unfolds only once there is room.
  const need = useRef([]);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(bar.current);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const w = bar.current.clientWidth;
    const over = tools.current.scrollWidth - tools.current.clientWidth;
    if (over > 0 && fold < MOST) {
      need.current[fold] = w + over;
      setFold(fold + 1);
    } else if (fold > 0 && w >= (need.current[fold - 1] ?? Infinity)) setFold(fold - 1);
    // Measured again whenever the room or what fills it changes (the
    // status's words, Publish's label), not only on a resize.
  }, [fold, width, label, uploading, actions]);
  const scrolls = fold === MOST && tools.current && tools.current.scrollWidth > tools.current.clientWidth;
  // A fade at each edge there is more to scroll to.
  const [ends, setEnds] = useState("");
  const edge = useCallback(() => {
    const t = tools.current;
    if (!t) return;
    const less = t.scrollLeft > 2;
    const more = t.scrollLeft + t.clientWidth < t.scrollWidth - 2;
    setEnds(less && more ? " has-less has-more" : less ? " has-less" : more ? " has-more" : "");
  }, []);
  useLayoutEffect(edge, [edge, fold, scrolls]);

  /** Where a popover opens: under its button, inside the column. */
  const under = (button, width) => {
    const box = wrap.current.getBoundingClientRect();
    const r = button.getBoundingClientRect();
    return { left: Math.max(0, Math.min(r.left - box.left, box.width - width)), top: r.bottom - box.top + 4 };
  };

  const moreItems = [
    fold >= 2 && { key: "code", label: "Code", keys: "Mod+E", Icon: Code, on: editor.isActive("code"), press: () => run().toggleCode().run() },
    fold >= 2 && { key: "ul", label: "Bulleted list", keys: "Mod+Shift+8", Icon: List, on: editor.isActive("bulletList"), press: () => run().toggleBulletList().run() },
    fold >= 2 && { key: "ol", label: "Numbered list", keys: "Mod+Shift+7", Icon: ListOrdered, on: editor.isActive("orderedList"), press: () => run().toggleOrderedList().run() },
    fold >= MOST && { key: "link", label: "Link", keys: "Mod+K", Icon: Link2, on: editor.isActive("link"), press: onLink },
  ].filter(Boolean);

  return (
    <div className="editor-bar-row" ref={wrap}>
      <div className="editor-bar" role="toolbar" aria-label="Formatting" data-fold={fold} ref={bar}>
        <div className={`editor-tools${scrolls ? ` is-scrolling${ends}` : ""}`} ref={tools} onScroll={edge}>
          <Tool label="Undo" keys="Mod+Z" disabled={!editor.can().undo()} onPress={() => run().undo().run()}>
            <Undo2 className="size-4" aria-hidden="true" />
          </Tool>
          <Tool label="Redo" keys={mac ? "Mod+Shift+Z" : "Mod+Y"} disabled={!editor.can().redo()} onPress={() => run().redo().run()}>
            <Redo2 className="size-4" aria-hidden="true" />
          </Tool>
          <Sep />
          <span className="editor-style" title="Text style">
            <select
              className="editor-block"
              aria-label="Text style"
              value={level ? `h${level}` : "p"}
              disabled={!styled}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "p") run().setParagraph().run();
                else run().setHeading({ level: Number(v.slice(1)) }).run();
              }}
            >
              <option value="p">Normal text</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
            <Chevron />
          </span>
          <Sep />
          <Tool label="Bold" keys="Mod+B" active={editor.isActive("bold")} onPress={() => run().toggleBold().run()}>
            <Bold className="size-4" aria-hidden="true" />
          </Tool>
          <Tool label="Italic" keys="Mod+I" active={editor.isActive("italic")} onPress={() => run().toggleItalic().run()}>
            <Italic className="size-4" aria-hidden="true" />
          </Tool>
          {fold < 2 && (
            <Tool label="Code" keys="Mod+E" active={editor.isActive("code")} onPress={() => run().toggleCode().run()}>
              <Code className="size-4" aria-hidden="true" />
            </Tool>
          )}
          {fold < MOST && (
            <Tool label="Link" keys="Mod+K" active={editor.isActive("link")} onPress={onLink}>
              <Link2 className="size-4" aria-hidden="true" />
            </Tool>
          )}
          <Sep />
          <span className="editor-picker">
            <Tool label={`Highlight ${last}`} keys="Mod+Shift+H" active={editor.isActive("highlight")} onPress={() => run().setHighlight(last).run()}>
              <Highlighter className="size-4" aria-hidden="true" />
              <span className="editor-swatch" data-color={last} aria-hidden="true" />
            </Tool>
            <Tool
              label="Highlight colours"
              className="editor-more"
              aria-haspopup="menu"
              aria-expanded={Boolean(colors)}
              ref={(el) => (colorsIn.current[0] = el)}
              onPress={(e) => {
                const at = under(e.currentTarget, 236);
                setColors((v) => (v ? null : at));
              }}
            >
              <Chevron />
            </Tool>
          </span>
          {fold < 2 && (
            <>
              <Sep />
              <Tool label="Bulleted list" keys="Mod+Shift+8" active={editor.isActive("bulletList")} onPress={() => run().toggleBulletList().run()}>
                <List className="size-4" aria-hidden="true" />
              </Tool>
              <Tool label="Numbered list" keys="Mod+Shift+7" active={editor.isActive("orderedList")} onPress={() => run().toggleOrderedList().run()}>
                <ListOrdered className="size-4" aria-hidden="true" />
              </Tool>
            </>
          )}
          {fold >= 2 && (
            <Tool
              label="More"
              className="editor-overflow"
              aria-haspopup="menu"
              aria-expanded={Boolean(more)}
              ref={(el) => (moreIn.current[0] = el)}
              onPress={(e) => {
                const at = under(e.currentTarget, 220);
                setMore((v) => (v ? null : at));
              }}
            >
              <Ellipsis className="size-4" aria-hidden="true" />
            </Tool>
          )}
        </div>
        <div className="editor-end">
          <Status label={label} state={state} uploading={uploading} folded={fold >= 1} />
          {actions}
          <button type="button" className="private-primary chamfer chamfer-sm editor-done" disabled={leaving} onClick={onDone}>
            {leaving ? "Saving…" : "Done"}
          </button>
        </div>
      </div>
      {colors && (
        <span className="editor-colors" role="menu" aria-label="Highlight colour" style={colors} ref={(el) => (colorsIn.current[1] = el)}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="menuitem"
              className="editor-color"
              data-color={c}
              aria-label={c}
              title={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                run().setHighlight(c).run();
                setColors(null);
              }}
            />
          ))}
          <button
            type="button"
            role="menuitem"
            className="editor-color is-none"
            aria-label="Remove highlight"
            title="Remove highlight"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              run().unsetHighlight().run();
              setColors(null);
            }}
          >
            ⌀
          </button>
        </span>
      )}
      {more && (
        <Menu at={more} ref={(el) => (moreIn.current[1] = el)} onClose={() => setMore(null)}>
          {moreItems.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitemcheckbox"
              aria-checked={it.on}
              className={`editor-menu-item${it.on ? " is-on" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                it.press();
                setMore(null);
              }}
            >
              <it.Icon className="size-4" aria-hidden="true" />
              <span>{it.label}</span>
              <kbd>{keys(it.keys)}</kbd>
            </button>
          ))}
          {fold >= HISTORY && menu}
        </Menu>
      )}
    </div>
  );
}

/** The More menu: its first item focused when it opens, and the arrow keys move between them. */
const Menu = React.forwardRef(function Menu({ at, onClose, children }, ref) {
  const box = useRef(null);
  useEffect(() => {
    // Focus moves in only when the keyboard opened it; a click leaves it in the text.
    if (document.activeElement?.closest(".editor-bar")) box.current?.querySelector("button")?.focus();
  }, []);
  const move = (e) => {
    const items = [...box.current.querySelectorAll("button:not(:disabled)")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") onClose();
  };
  return (
    <div
      className="editor-menu"
      role="menu"
      aria-label="More"
      style={at}
      onKeyDown={move}
      ref={(el) => {
        box.current = el;
        if (typeof ref === "function") ref(el);
      }}
    >
      {children}
    </div>
  );
});

// ---- the title, date and summary ------------------------------------------------------

/** A textarea as tall as what is in it, at whatever width it is. */
function useGrow(value) {
  const ref = useRef(null);
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(fit, [value, fit]);
  useEffect(() => {
    const ro = new ResizeObserver(fit);
    ro.observe(ref.current.parentElement);
    return () => ro.disconnect();
  }, [fit]);
  return ref;
}

/**
 * The title as the page shows it, and under it the post's own line, its date
 * and reading time, then its summary: each typed in place, and marked as a
 * field only under the pointer or with the focus.
 */
export function Details({ meta, minutes, field, onField, onBlur, onEnter }) {
  const title = useGrow(meta.title);
  const summary = useGrow(meta.summary);
  return (
    <>
      <textarea
        ref={title}
        rows={1}
        className={`editor-title editor-inplace mt-8 font-display text-3xl font-semibold leading-tight text-bone text-balance sm:text-4xl${field === "title" ? " is-wrong" : ""}`}
        value={meta.title}
        maxLength={200}
        aria-label="Title"
        placeholder="Title"
        // One line: a pasted line break becomes a space.
        onChange={(e) => onField("title", e.target.value.replace(/\s*\n\s*/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
        onBlur={onBlur}
      />
      <p className="editor-meta mt-4 text-sm tabular-nums text-dim">
        <DateField value={meta.date} wrong={field === "date"} onChange={(v) => onField("date", v)} onBlur={onBlur} />
        <span aria-hidden="true"> · </span>
        <span>{minutes} min read</span>
      </p>
      <label className={`editor-summary${field === "summary" ? " is-wrong" : ""}`}>
        <span className="editor-summary-label">Summary</span>
        <textarea
          ref={summary}
          rows={1}
          className="editor-inplace"
          value={meta.summary}
          maxLength={500}
          placeholder="A sentence for the list of posts, and for sharing"
          onChange={(e) => onField("summary", e.target.value.replace(/\s*\n\s*/g, " "))}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          onBlur={onBlur}
        />
      </label>
    </>
  );
}

/** The date as the post writes it; pressed, the browser's own date field, until it loses focus. */
function DateField({ value, wrong, onChange, onBlur }) {
  const [editing, setEditing] = useState(false);
  const input = useRef(null);
  const button = useRef(null);
  useEffect(() => {
    if (!editing) return;
    input.current.focus();
    try {
      input.current.showPicker?.();
    } catch {
      // Not from a click (a key, or a browser without it): the field is there to type in.
    }
  }, [editing]);
  const done = (refocus) => {
    setEditing(false);
    onBlur();
    if (refocus) requestAnimationFrame(() => button.current?.focus());
  };
  const shown = /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : "No date";
  if (editing)
    return (
      <input
        ref={input}
        type="date"
        className="editor-date-input"
        aria-label="Date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onBlur={() => done(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            done(true);
          }
        }}
      />
    );
  return (
    <button ref={button} type="button" className={`editor-date editor-inplace${wrong ? " is-wrong" : ""}`} aria-label={`Date: ${shown}. Change it`} title="Change the date" onClick={() => setEditing(true)}>
      <time dateTime={value}>{shown}</time>
    </button>
  );
}
