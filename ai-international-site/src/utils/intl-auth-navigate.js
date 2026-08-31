/**
 * Reliable client navigation to auth routes.
 * Soft Next.js transitions can occasionally stall; fall back to a full assign.
 */
export function navigateToAuthPath(router, href) {
  const target = String(href || '').trim();
  if (!target) return;

  if (typeof window === 'undefined') {
    router?.push?.(target);
    return;
  }

  try {
    router?.push?.(target);
  } catch {
    window.location.assign(target);
    return;
  }

  window.setTimeout(() => {
    try {
      const next = new URL(target, window.location.origin);
      const here = `${window.location.pathname}${window.location.search}`;
      const want = `${next.pathname}${next.search}`;
      if (here !== want) {
        window.location.assign(next.href);
      }
    } catch {
      window.location.assign(target);
    }
  }, 700);
}
