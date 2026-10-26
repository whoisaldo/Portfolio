// src/world/glass.js: where the page's panes of glass are, for the frost.
//
// src/components/ui/Panel.jsx marks a pane of smoked glass with
// `data-glass` (its value says which corners are cut: "both" or "br";
// `data-glass-sm` for the small cut). Once a frame the world reads the panes
// near the viewport here and hands post.js's GlassEffect a rectangle, a cut
// and an opacity for each one on screen, up to MAX_PANES.
//
// The rectangle is read off the element every frame (getBoundingClientRect)
// rather than worked out from the scroll position: a pane rising into view
// under Framer's reveal is moving on its own, and the frost has to move with
// it or it shows as a dark slab beside the card. Only the few panes an
// IntersectionObserver says are near the viewport are read.
//
// The opacity is the pane's own as the page draws it: Framer's inline
// opacity on it and on the wrappers between it and its section, times the
// section's yield (src/world/scroll-stage.js: the page stepping back
// mid-flight, which the CSS applies with the same number) and times
// `stage.ui`, how much of the page is up at all (src/world/modes.js puts it
// away for Look and Cinema). A pane the reader cannot see is not frosted.
import { stage } from "./stage.js";
import { yieldAt } from "./scroll-stage.js";
import { MAX_PANES } from "./post.js";

const CUT = 14;
const CUT_SM = 9;

/** Framer writes opacity inline: the pane's and its wrappers', up to its section. */
function inlineOpacity(el) {
  let o = 1;
  for (let n = el, i = 0; n && i < 8; n = n.parentElement, i++) {
    const v = n.style.opacity;
    if (v !== "") o *= parseFloat(v);
    if (n.dataset.shot !== undefined) break;
  }
  return o;
}

export function createGlass(effect) {
  const panes = effect.uniforms.get("uPanes").value;
  const info = effect.uniforms.get("uPaneInfo").value;
  const view = effect.uniforms.get("uView").value;
  const near = new Set();
  const meta = new WeakMap();
  let els = [];
  let layout = -1;
  let ticks = 0;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) near.add(e.target);
        else near.delete(e.target);
      }
    },
    { rootMargin: "25% 0px" },
  );

  // The set of panes changes with the page (a route, the garage switching
  // bays, a pane mounting late): looked up again whenever the page is
  // re-measured, and every half second in case nothing re-measured it.
  const refresh = () => {
    const next = [...document.querySelectorAll("[data-glass]")];
    const keep = new Set(next);
    for (const el of els) {
      if (!keep.has(el)) {
        io.unobserve(el);
        near.delete(el);
      }
    }
    const had = new Set(els);
    for (const el of next) if (!had.has(el)) io.observe(el);
    els = next;
  };

  const metaOf = (el) => {
    let m = meta.get(el);
    if (!m) {
      m = {
        cut: el.dataset.glassSm !== undefined ? CUT_SM : CUT,
        corners: el.dataset.glass === "br" ? 1 : el.dataset.glass === "none" ? 2 : 0,
        shot: el.closest("[data-shot]")?.dataset.shot ?? null,
      };
      meta.set(el, m);
    }
    return m;
  };

  return {
    /** Fill the effect's arrays for this frame. `width` and `height` are the
     *  canvas's CSS size, which is the viewport's. */
    update(width, height) {
      if (stage.layout !== layout || ++ticks % 30 === 0) {
        layout = stage.layout;
        refresh();
      }
      view.set(width, height);
      let n = 0;
      const ui = stage.ui;
      if (ui > 0.005) {
        for (const el of near) {
          if (n >= MAX_PANES) break;
          const r = el.getBoundingClientRect();
          if (r.bottom <= 0 || r.top >= height || r.width < 2 || r.height < 2) continue;
          const m = metaOf(el);
          let k = ui * inlineOpacity(el);
          if (m.shot) {
            const i = stage.shots.findIndex((s) => s.id === m.shot);
            if (i >= 0) k *= yieldAt(stage.position, i);
          }
          if (k < 0.01) continue;
          panes[n].set(r.left, r.top, r.right, r.bottom);
          info[n].set(m.cut, m.corners, Math.min(1, k), 0);
          n++;
        }
      }
      effect.count = n;
      return n;
    },
    dispose() {
      io.disconnect();
      near.clear();
      effect.count = 0;
    },
  };
}
