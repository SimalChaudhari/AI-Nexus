import { useScroll, useMotionValueEvent } from 'framer-motion';
import { useRef, useMemo, useState, useCallback, useLayoutEffect } from 'react';

import { usePathname } from 'src/routes/hooks';

// ----------------------------------------------------------------------

export function useScrollOffSetTop(top = 0) {
  const pathname = usePathname();
  const elementRef = useRef(null);

  const { scrollY } = useScroll();

  const [offsetTop, setOffsetTop] = useState(false);

  const handleScrollChange = useCallback(
    (val) => {
      const scrollHeight = Math.round(val);

      if (elementRef?.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const elementTop = Math.round(rect.top);

        setOffsetTop(elementTop < top);
      } else {
        setOffsetTop(scrollHeight > top);
      }
    },
    [top]
  );

  useMotionValueEvent(
    scrollY,
    'change',
    useMemo(() => handleScrollChange, [handleScrollChange])
  );

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    handleScrollChange(window.scrollY);
  }, [pathname, handleScrollChange]);

  const memoizedValue = useMemo(() => ({ elementRef, offsetTop }), [offsetTop]);

  return memoizedValue;
}

/*
 * 1: Applies to top <header/>
 * const { offsetTop } = useScrollOffSetTop(80);
 *
 * Or
 *
 * 2: Applies to element
 * const { offsetTop, elementRef } = useScrollOffSetTop(80);
 * <div ref={elementRef} />
 *
 */
