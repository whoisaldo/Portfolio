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



