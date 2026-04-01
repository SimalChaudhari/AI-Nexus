import { OverlayCircularProgress } from 'src/components/loading/overlay-circular-progress';

// Wrapper used by learning courses page.
// We keep this file so existing imports remain stable.
export function CoursesLoaderOverlay({ top = false, size = 32, zIndex = 2 }) {
  return <OverlayCircularProgress top={top} size={size} zIndex={zIndex} />;
}
