/**
 * Public forum display handle, e.g. "Yi" + "Chu" → "@Yi***Chu**".
 * Prefer backend `user.maskedDisplayName` when present.
 */
export function maskForumDisplayName(firstname, lastname, username) {
  const first = String(firstname || '').trim();
  const last = String(lastname || '').trim();

  if (first || last) {
    return `@${first.slice(0, 2)}***${last.slice(0, 3)}**`;
  }

  const user = String(username || '').trim();
  if (user.length >= 4) {
    return `@${user.slice(0, 2)}***${user.slice(-2)}**`;
  }
  if (user.length > 0) {
    return `@${user}***`;
  }

  return '@Anonymous**';
}

/** Prefer API maskedDisplayName; otherwise derive from name fields. */
export function getForumMaskedDisplayName(user) {
  if (!user) return '@Anonymous**';
  if (user.maskedDisplayName) return user.maskedDisplayName;
  return maskForumDisplayName(user.firstname, user.lastname, user.username);
}

/** Admin-friendly full name (not for public forum). */
export function getForumFullName(user) {
  if (!user) return 'Anonymous';
  const full = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
  if (full) return full;
  return user.username || user.email || 'Anonymous';
}
