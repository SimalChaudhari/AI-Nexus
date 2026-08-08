'use client';

import { Suspense } from 'react';

import { NavigationProgress } from './navigation-progress';

export { notifyNavigationStart } from './navigation-progress';

/** Suspense boundary kept for compatibility; progress UI is currently disabled. */
export function NavigationProgressHost() {
  return (
    <Suspense fallback={null}>
      <NavigationProgress />
    </Suspense>
  );
}
