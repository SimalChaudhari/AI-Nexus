'use client';

/**
 * Navigation progress UI removed (user request).
 * Keep notifyNavigationStart as a no-op so existing call sites stay safe.
 */
export function notifyNavigationStart() {}

export function NavigationProgress() {
  return null;
}
