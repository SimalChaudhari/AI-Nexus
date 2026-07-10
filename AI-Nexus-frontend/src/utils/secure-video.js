/**
 * Soft DRM / UX guards for HTML5 <video>.
 * Blocks the browser context menu (Save video as / Copy video address)
 * and disables the download control where the browser supports it.
 * Note: determined users can still capture via DevTools / screen record.
 */
export function preventVideoContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function preventVideoDrag(event) {
  event.preventDefault();
}

/** Props to spread onto MUI `Box component="video"` / native <video>. */
export const SECURE_VIDEO_ELEMENT_PROPS = {
  controlsList: 'nodownload noremoteplayback',
  disablePictureInPicture: true,
  onContextMenu: preventVideoContextMenu,
  onDragStart: preventVideoDrag,
};
