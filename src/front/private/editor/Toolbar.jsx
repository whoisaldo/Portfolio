// src/front/private/editor/Toolbar.jsx: what the editor looks like around the
// text: its toolbar, and the title, date and summary typed in place.
//
// The toolbar is one row, the width of the article's column, as Docs keeps
// its own: Undo and Redo, the text style, Bold, Italic, Code and Link, the
// highlight and its colours, the lists, and at the right the save status,
// History, Publish and Done. The column is narrower than all of that even on
// a wide screen, so the row folds as the room runs out, measured rather than
// guessed at a breakpoint: first the save status becomes an icon (a button
// that shows its words), then Code and the lists go into a "More" menu, then
// History does, then Link (Cmd+K still opens it), the highlight, the text
// style, Italic, Bold, Redo and Undo, until on the narrowest phone the row is
// More, the status, Publish and Done. More stays in sight from the first
// fold, and whatever is not in the row is in it. Publish and Done never fold.
//
// Every button keeps the editor's focus and selection where they are; menus
// close on Escape or a click elsewhere and hand the focus back.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bold, Check, CloudOff, Code, Ellipsis, Heading2, Heading3, Highlighter, Italic, Link2, List, ListOrdered, LoaderCircle, Pilcrow, Redo2, TriangleAlert, Undo2, Upload,
} from "lucide-react";
import { COLORS } from "./schema";
import { readSelection } from "./anchors";
import "./toolbar.css";

// As the post's own date line has it (../posts.js), written out here so this
// chunk asks nothing of the public pages' chunks.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDate = (iso) => dateFormat.format(new Date(`${iso}T12:00:00`));
const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const keys = (k) => (mac ? k.replace("Mod+", "⌘").replace("Shift+", "⇧") : k.replace("Mod+", "Ctrl+"));

// How far the row has folded: 1 the status is an icon, 2 Code and the lists
// are in More, 3 History is too, then one at a time Link, the highlight, the
// text style, Italic, Bold, Redo and Undo.
const LISTS = 2;
const HISTORY = 3;
const LINK = 4;
const HIGHLIGHT = 5;
const STYLE = 6;
const ITALIC = 7;
const BOLD = 8;
const REDO = 9;
const UNDO = 10;
const MOST = UNDO;

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

/**
 * The one status line: the save state, as words or, folded, as an icon. The
 * icon is a button that shows the words under it when tapped or focused,
 * and they are read out as they change either way.
 */
function Status({ label, state, uploading, folded }) {
  const Icon = uploading ? Upload : STATUS_ICON[state] || Check;
  const [tip, setTip, tipIn] = usePopover();
  const spoken = (
    <span className={folded ? "editor-sr" : "editor-status-text"} role="status" aria-live="polite">
      {label}
    </span>
  );
  if (!folded)
    return (
      <span className={`editor-status is-${state}`} title={label}>
        {spoken}
      </span>
    );
  return (
    <span className={`editor-status is-${state} is-folded`} title={label}>
      <button
        type="button"
        className="editor-status-button"
        aria-label={`Save status: ${label}`}
        aria-expanded={Boolean(tip)}
        ref={(el) => (tipIn.current[0] = el)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setTip((v) => (v ? null : true))}
        onFocus={() => setTip(true)}
        onBlur={() => setTip(null)}
      >
        <Icon className={`size-4${state === "saving" || state === "pending" ? " editor-spin" : ""}`} aria-hidden="true" />
      </button>
      {spoken}
      {tip && (
        <span className={`editor-status-tip is-${state}`} aria-hidden="true" ref={(el) => (tipIn.current[1] = el)}>
          {label}
        </span>
      )}
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
  // On the selection the page shows (./anchors.js).
  const run = () => {
    readSelection(editor.view);
    return editor.chain().focus();
  };
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
  const [width, setWidth] = useState("");
  // For each fold, as last measured: how wide the formatting is (`content`),
  // and how much more the rest of the row (More, the status, History,
  // Publish, Done) takes at the fold before it (`grow`). A fold is undone
  // once the formatting it would bring back fits beside the rest of the row
  // as that is now, so a control is in More only while it does not fit.
  const content = useRef([]);
  const grow = useRef([]);
  const measured = useRef(null);
  useLayoutEffect(() => {
    // The row's room, and the formatting's share of it, which shrinks when
    // the end grows (Publish's chunk arriving, its label changing).
    const size = () => setWidth(`${bar.current?.clientWidth}/${tools.current?.clientWidth}`);
    const ro = new ResizeObserver(size);
    ro.observe(bar.current);
    ro.observe(tools.current);
    // The fonts arriving widen the text style and the words.
    document.fonts?.ready.then(() => setWidth((v) => `${v}+`));
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    // To the fraction of a pixel: half a pixel cut off is cut off.
    const row = bar.current.getBoundingClientRect().width;
    const box = tools.current.getBoundingClientRect();
    const end = tools.current.lastElementChild?.getBoundingClientRect().right ?? box.left;
    const rest = row - box.width;
    content.current[fold] = end - box.left;
    const prev = measured.current;
    if (prev && Math.abs(prev.fold - fold) === 1) grow.current[Math.max(prev.fold, fold)] = prev.fold < fold ? prev.rest - rest : rest - prev.rest;
    measured.current = { fold, rest };
    const back = content.current[fold - 1];
    if (end - box.right > 0.01 && fold < MOST) setFold(fold + 1);
    else if (fold > 0 && back != null && back + rest + (grow.current[fold] ?? 0) <= row) setFold(fold - 1);
    // Measured again whenever the room or what fills it changes (the
    // status's words, Publish's label), not only on a resize.
  }, [fold, width, label, uploading, actions]);

  /** Where a popover opens: under its button, inside the column. */
  const under = (button, width) => {
    const box = wrap.current.getBoundingClientRect();
    const r = button.getBoundingClientRect();
    return { left: Math.max(0, Math.min(r.left - box.left, box.width - width)), top: r.bottom - box.top + 4 };
  };

  const shown = (at) => fold < at;
  const style = (v) => (v === "p" ? run().setParagraph().run() : run().setHeading({ level: Number(v.slice(1)) }).run());

  // The row, in groups with a line between each two that are there.
  const groups = [
    [
      shown(UNDO) && (
        <Tool key="undo" label="Undo" keys="Mod+Z" disabled={!editor.can().undo()} onPress={() => run().undo().run()}>
          <Undo2 className="size-4" aria-hidden="true" />
        </Tool>
      ),
      shown(REDO) && (
        <Tool key="redo" label="Redo" keys={mac ? "Mod+Shift+Z" : "Mod+Y"} disabled={!editor.can().redo()} onPress={() => run().redo().run()}>
          <Redo2 className="size-4" aria-hidden="true" />
        </Tool>
      ),
    ],
    [
      shown(STYLE) && (
        <span key="style" className="editor-style" title="Text style">
          <select className="editor-block" aria-label="Text style" value={level ? `h${level}` : "p"} disabled={!styled} onChange={(e) => style(e.target.value)}>
            <option value="p">Normal text</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <Chevron />
        </span>
      ),
    ],
    [
      shown(BOLD) && (
        <Tool key="bold" label="Bold" keys="Mod+B" active={editor.isActive("bold")} onPress={() => run().toggleBold().run()}>
          <Bold className="size-4" aria-hidden="true" />
        </Tool>
      ),
      shown(ITALIC) && (
        <Tool key="italic" label="Italic" keys="Mod+I" active={editor.isActive("italic")} onPress={() => run().toggleItalic().run()}>
          <Italic className="size-4" aria-hidden="true" />
        </Tool>
      ),
      shown(LISTS) && (
        <Tool key="code" label="Code" keys="Mod+E" active={editor.isActive("code")} onPress={() => run().toggleCode().run()}>
          <Code className="size-4" aria-hidden="true" />
        </Tool>
      ),
      shown(LINK) && (
        <Tool key="link" label="Link" keys="Mod+K" active={editor.isActive("link")} onPress={onLink}>
          <Link2 className="size-4" aria-hidden="true" />
        </Tool>
      ),
    ],
    [
      shown(HIGHLIGHT) && (
        <span key="highlight" className="editor-picker">
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
      ),
    ],
    [
      shown(LISTS) && (
        <Tool key="ul" label="Bulleted list" keys="Mod+Shift+8" active={editor.isActive("bulletList")} onPress={() => run().toggleBulletList().run()}>
          <List className="size-4" aria-hidden="true" />
        </Tool>
      ),
      shown(LISTS) && (
        <Tool key="ol" label="Numbered list" keys="Mod+Shift+7" active={editor.isActive("orderedList")} onPress={() => run().toggleOrderedList().run()}>
          <ListOrdered className="size-4" aria-hidden="true" />
        </Tool>
      ),
    ],
  ]
    .map((g) => g.filter(Boolean))
    .filter((g) => g.length)
    .flatMap((g, i) => (i ? [<Sep key={`sep-${i}`} />, ...g] : g));

  // More: whatever has left the row, in the row's order, in groups.
  const item = (key, label, Icon, press, { on, shortcut, disabled, role = "menuitemcheckbox" } = {}) => ({ key, label, Icon, press, on, shortcut, disabled, role });
  const moreGroups = [
    [
      !shown(UNDO) && item("undo", "Undo", Undo2, () => run().undo().run(), { shortcut: "Mod+Z", disabled: !editor.can().undo(), role: "menuitem" }),
      !shown(REDO) && item("redo", "Redo", Redo2, () => run().redo().run(), { shortcut: mac ? "Mod+Shift+Z" : "Mod+Y", disabled: !editor.can().redo(), role: "menuitem" }),
    ],
    !shown(STYLE)
      ? [
          item("p", "Normal text", Pilcrow, () => style("p"), { on: styled && !level, disabled: !styled, role: "menuitemradio" }),
          item("h2", "Heading 2", Heading2, () => style("h2"), { on: level === 2, disabled: !styled, role: "menuitemradio" }),
          item("h3", "Heading 3", Heading3, () => style("h3"), { on: level === 3, disabled: !styled, role: "menuitemradio" }),
        ]
      : [],
    [
      !shown(BOLD) && item("bold", "Bold", Bold, () => run().toggleBold().run(), { on: editor.isActive("bold"), shortcut: "Mod+B" }),
      !shown(ITALIC) && item("italic", "Italic", Italic, () => run().toggleItalic().run(), { on: editor.isActive("italic"), shortcut: "Mod+I" }),
      !shown(LISTS) && item("code", "Code", Code, () => run().toggleCode().run(), { on: editor.isActive("code"), shortcut: "Mod+E" }),
      !shown(LINK) && item("link", "Link", Link2, onLink, { on: editor.isActive("link"), shortcut: "Mod+K" }),
    ],
    [!shown(HIGHLIGHT) && item("highlight", `Highlight ${last}`, Highlighter, () => run().setHighlight(last).run(), { on: editor.isActive("highlight"), shortcut: "Mod+Shift+H" })],
    [
      !shown(LISTS) && item("ul", "Bulleted list", List, () => run().toggleBulletList().run(), { on: editor.isActive("bulletList"), shortcut: "Mod+Shift+8" }),
      !shown(LISTS) && item("ol", "Numbered list", ListOrdered, () => run().toggleOrderedList().run(), { on: editor.isActive("orderedList"), shortcut: "Mod+Shift+7" }),
    ],
  ]
    .map((g) => g.filter(Boolean))
    .filter((g) => g.length);

  const swatches = (onPick) => (
    <>
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="menuitem"
          className="editor-color"
          data-color={c}
          aria-label={`Highlight ${c}`}
          title={c}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            run().setHighlight(c).run();
            onPick();
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
          onPick();
        }}
      >
        ⌀
      </button>
    </>
  );

  return (
    <div className="editor-bar-row" ref={wrap}>
      <div className="editor-bar" role="toolbar" aria-label="Formatting" data-fold={fold} data-history={fold >= HISTORY ? "menu" : "row"} ref={bar}>
        <div className="editor-tools" ref={tools}>
          {groups}
        </div>
        {fold >= LISTS && (
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
          {swatches(() => setColors(null))}
        </span>
      )}
      {more && (
        <Menu at={more} ref={(el) => (moreIn.current[1] = el)} onClose={() => setMore(null)}>
          {moreGroups.map((g, i) => (
            <React.Fragment key={g[0].key}>
              {i > 0 && <span role="separator" className="editor-menu-sep" />}
              {g.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  role={it.role}
                  aria-checked={it.role === "menuitem" ? undefined : Boolean(it.on)}
                  disabled={it.disabled}
                  className={`editor-menu-item${it.on ? " is-on" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    it.press();
                    setMore(null);
                  }}
                >
                  <it.Icon className="size-4" aria-hidden="true" />
                  <span>{it.label}</span>
                  {it.shortcut && <kbd>{keys(it.shortcut)}</kbd>}
                </button>
              ))}
              {g[0].key === "highlight" && (
                <span className="editor-menu-colors" role="group" aria-label="Highlight colour">
                  {swatches(() => setMore(null))}
                </span>
              )}
            </React.Fragment>
          ))}
          {fold >= HISTORY && menu && (
            <>
              {moreGroups.length > 0 && <span role="separator" className="editor-menu-sep" />}
              {menu}
            </>
          )}
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
