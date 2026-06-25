// ----------------------------------------------------------------------

export function formatCourseDurationLabel(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (safe <= 0) return '';
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function getCourseDurationLabel(course) {
  const label = String(course?.totalDuration || '').trim();
  if (label) return label;
  const seconds = Number(course?.totalDurationSeconds ?? 0);
  if (seconds > 0) return formatCourseDurationLabel(seconds);
  return '—';
}
