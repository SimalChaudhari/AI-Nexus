'use client';

import { Suspense } from 'react';

import { NavigationProgress } from './navigation-progress';

export { notifyNavigationStart, CenteredLoader } from './navigation-progress';

/** Suspense boundary for the in-app navigation overlay. */
export function NavigationProgressHost() {
  return (
    <Suspense fallback={null}>
      <NavigationProgress />
    </Suspense>
  );
}
