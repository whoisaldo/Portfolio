// src/front/private/select.js: where the buttons by a selection in a draft
// go ("Comment", and "Suggest edit" for a reader; ./DraftComments.jsx).

// How near the screen's edges they come.
const EDGE = 8;

/**
 * How far across the page the buttons go: centred under the selection's end
 * (`x`), but EDGE inside the edges of a screen `viewport` wide and scrolled
 * `scrollX` across. `width` is theirs as drawn, measured; wider than the
 * screen leaves, they start at its left edge.
 */
export function selectLeft(x, width, viewport, scrollX = 0) {
  const min = scrollX + EDGE;
  const max = scrollX + viewport - width - EDGE;
  return Math.max(min, Math.min(x - width / 2, max));
}
