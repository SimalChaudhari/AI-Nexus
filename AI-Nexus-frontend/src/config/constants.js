/**
 * Config constants.
 */

/** Seconds the user must stay on a lesson (learn route) before it is counted as "viewed" and progress is saved. */
export const VIEWED_SECTION_DELAY_SECONDS = Number(import.meta.env.VITE_VIEWED_SECTION_DELAY_SECONDS ?? 5);
export const IMAGE_VIEW_COMPLETE_DELAY_MS = Number(import.meta.env.VITE_IMAGE_VIEW_COMPLETE_DELAY_MS ?? 2000);
export const TEXT_VIEW_COMPLETE_DELAY_MS = Number(
  import.meta.env.VITE_TEXT_VIEW_COMPLETE_DELAY_MS ?? (VIEWED_SECTION_DELAY_SECONDS * 1000),
);
