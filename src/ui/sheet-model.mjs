// Pure model of the mobile bottom sheet (R7.9). No DOM.
export const MOBILE_MAX_PX = 768;
export const COLLAPSED_PX = 56;
const TAP_PX = 6;
const DRAG_PX = 40;

export const isMobile = (widthPx) => widthPx <= MOBILE_MAX_PX;

/** State after a gesture on the handle; `dy` is the vertical movement in px (negative = up). */
export function afterGesture(state, dy) {
  if (Math.abs(dy) < TAP_PX) return state === 'collapsed' ? 'expanded' : 'collapsed';
  if (dy <= -DRAG_PX) return 'expanded';
  if (dy >= DRAG_PX) return 'collapsed';
  return state;
}

/** Sheet height in px for a state, optionally following a live drag `dy` (negative = up), clamped to the limits. */
export function sheetHeight(state, viewportH, disclaimerH, dy = 0) {
  const full = Math.round((viewportH - disclaimerH) * 0.7);
  const base = state === 'expanded' ? full : COLLAPSED_PX;
  return Math.min(full, Math.max(COLLAPSED_PX, base - dy));
}
