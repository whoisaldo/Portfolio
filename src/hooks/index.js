// src/hooks/index.js — small shared hooks. No dependencies.
import { useState, useEffect, useRef, useCallback } from "react";
import { useMotionValue } from "framer-motion";

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

/**
 * True when the pinned reel is appropriate: a real pointer, enough width, and
 * no reduced-motion preference. Everything else gets the plain stacked list.
 */
export const useCanPin = () =>
  useMediaQuery(
    "(min-width: 1024px) and (hover: hover) and (prefers-reduced-motion: no-preference)"
  );

/**
 * Decode a list of images ahead of time, sequentially.
 *
 * The reel must never show a blank frame. Mounting all eight <img> elements is
 * necessary but not sufficient — a 1.5 MB plate still takes time to decode, and
 * decode happens on first paint. `img.decode()` resolves once the bitmap is
 * ready, so painting afterwards is free.
 *
 * Sequential on purpose: eight parallel requests saturate the connection and
 * make the FIRST frame — the one the user actually sees — arrive later.
 */
export function useImageWarmup(srcs, enabled = true) {
  const [warmed, setWarmed] = useState(0);
  useEffect(() => {
    if (!enabled || !srcs?.length) return;
    let cancelled = false;
    // Absolute count, reset per run. Incrementing across runs let the number
    // accumulate past the list length over repeated effect invocations
    // (StrictMode's double-mount, HMR), producing "warming 41/8".
    let done = 0;
    setWarmed(0);
    const run = async () => {
      for (const src of srcs) {
        if (cancelled) return;
        try {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
          await img.decode();
        } catch {
          // A failed decode must not stall the queue; the <img> in the DOM
          // still gets its own chance, and the LQIP backplate covers the gap.
        }
        if (!cancelled) setWarmed(++done);
      }
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    const handle = idle(run);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
    };
  }, [srcs, enabled]);
  return warmed;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Trap focus inside `ref`, restore it on unmount, and lock body scroll.
 *
 * The scroll lock matters more than usual here: without it a wheel event over
 * the modal scrolls the reel underneath, and the project behind the modal
 * silently stops matching the project inside it.
 */
export function useFocusTrap(ref, active, onEscape) {
  const restoreTo = useRef(null);

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
        onEscape?.();
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
  }, [active, ref, onEscape]);
}

/** Stable callback ref for values that change every render. */
export function useEvent(fn) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  return useCallback((...args) => ref.current?.(...args), []);
}

/** Viewport width, updated on resize. The reel's track transform needs px. */
export function useViewportWidth() {
  const [w, setW] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth
  );
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on, { passive: true });
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

/**
 * Scroll progress (0..1) across a tall pinned wrapper, as a motion value.
 *
 * Replaces framer-motion's `useScroll({ target, offset })`, which silently
 * reported a constant 0 for this element and never recovered — not on resize,
 * not on remeasure. Rather than keep guessing at its measurement heuristics,
 * the reel owns the single number everything else derives from. That is also
 * the property that makes the indicator/track desync impossible, so it is
 * worth having in plain sight.
 */
export function useElementScrollProgress(ref) {
  const progress = useMotionValue(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let top = 0;
    let span = 1;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      top = rect.top + window.scrollY;
      // How far the page scrolls while the sticky child is pinned.
      span = Math.max(1, el.offsetHeight - window.innerHeight);
    };

    const update = () => {
      progress.set(Math.min(1, Math.max(0, (window.scrollY - top) / span)));
    };

    const onResize = () => { measure(); update(); };

    measure();
    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    // Layout settles after fonts and images land; re-measure when it does.
    const ro = new ResizeObserver(onResize);
    ro.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [ref, progress]);

  return progress;
}
