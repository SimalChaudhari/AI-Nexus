import { useMemo, useState, useEffect, useCallback } from 'react';

// ----------------------------------------------------------------------

export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  const debounceHandler = useCallback(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  useEffect(() => {
    const cleanup = debounceHandler();
    return cleanup;
  }, [debounceHandler]);

  const memoizedValue = useMemo(() => debouncedValue, [debouncedValue]);

  return memoizedValue;
}
