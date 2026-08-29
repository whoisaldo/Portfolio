// src/hooks/index.js - small shared hooks. No dependencies.
import { useState, useEffect, useRef } from "react";

/** Subscribe to a media query. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

export const usePrefersReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Trap focus inside `ref`, restore it on unmount, and lock body scroll.
 *
 * The scroll lock is the reason this owns body.overflow. Do not add a second
 * lock in a caller: both would save the previous value to restore, and
 * whichever ran second would capture "hidden" and never give scrolling back.
 */
export function useFocusTrap(ref, active, onEscape) {
  const restoreTo = useRef(null);

  // The callback is read through a ref so a caller passing an inline arrow
  // (`onClose={() => setOpen(null)}`) does not change the effect's identity.
  // When it did, the effect re-ran on every render. Each cleanup restored
  // focus and each re-run re-captured `document.activeElement`, which by then
  // was the panel's own close button, so closing landed focus on <body>
  // instead of the thing that opened it.
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; });

  useEffect(() => {
    if (!active) return;
    restoreTo.current = document.activeElement;

    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const node = ref.current;
    node?.querySelector(FOCUSABLE)?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreTo.current?.focus?.();
    };
  }, [active, ref]);
}



/**
 * Resolve `text` out of character noise, left to right.
 *
 * Generalised out of BootSequence.jsx, which had this loop inlined for the one
 * string it animates. Section headings want the same effect on entry, so it
 * lives here now and the boot sequence uses it too.
 *
 * Returns the string to display. It starts scrambled and ends exactly equal to
 * `text`, so a caller can render it directly, but callers should render the
 * real string alongside it for assistive technology; see ui/Glitch.jsx.
 *
 * Under `prefers-reduced-motion` this never animates: it returns `text` from
 * the first render, which is why the initial state is computed from `reduced`
 * rather than being corrected in an effect afterwards.
 */
const DECODE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/\\<>[]{}*+=_";

const scrambleOf = (text) => {
  let out = "";
  for (const ch of text) {
    out += ch === " " ? " " : DECODE_GLYPHS[(Math.random() * DECODE_GLYPHS.length) | 0];
  }
  return out;
};

export function useDecode(text, { active = true, duration = 650 } = {}) {
  const reduced = usePrefersReducedMotion();
  const [out, setOut] = useState(() => (reduced ? text : scrambleOf(text)));
  const settled = useRef(false);

  useEffect(() => {
    if (reduced) {
      setOut(text);
      return;
    }
    // `settled` keeps a heading from re-scrambling if the observer that drives
    // `active` flickers, which it does at a viewport boundary during a fast
    // scroll. Decoding twice reads as a bug, not as an effect.
    if (!active || settled.current) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // The 1.15 overshoot locks the final character slightly before t reaches
      // 1, so the string holds still for a beat instead of resolving on the
      // very last frame.
      const locked = Math.floor(t * text.length * 1.15);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        s +=
          text[i] === " "
            ? " "
            : i < locked
            ? text[i]
            : DECODE_GLYPHS[(Math.random() * DECODE_GLYPHS.length) | 0];
      }
      setOut(s);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        settled.current = true;
        setOut(text);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, active, duration, reduced]);

  return out;
}
