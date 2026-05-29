import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ----------------------------------------------------------------------

export function useScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || window.scrollY === 0) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
