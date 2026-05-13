import { useMemo } from 'react';

import { removeLastSlash } from 'src/routes/utils';
import { useActiveLink } from 'src/routes/hooks/use-active-link';

// ----------------------------------------------------------------------

/**
 * Resolves whether a nav row is active, including optional prefix matches
 * and paths that should not count as active (e.g. "Create" when using a
 * section root path with deepMatch for "List").
 */
export function useNavListActive(data, pathname) {
  const normalizedPath = removeLastSlash(pathname);

  const activeFromLink = useActiveLink(data.path, !!data.children || !!data.deepMatch);

  const activeFromPrefixes = useMemo(() => {
    if (!Array.isArray(data.activePathPrefixes) || !data.activePathPrefixes.length) {
      return false;
    }
    return data.activePathPrefixes.some((p) =>
      normalizedPath.includes(removeLastSlash(p))
    );
  }, [data.activePathPrefixes, normalizedPath]);

  return useMemo(() => {
    let result = activeFromLink || activeFromPrefixes;
    if (
      result &&
      Array.isArray(data.activeExcludePaths) &&
      data.activeExcludePaths.length > 0
    ) {
      const excluded = data.activeExcludePaths.some((p) => {
        const ep = removeLastSlash(p);
        return normalizedPath === ep || normalizedPath.startsWith(`${ep}/`);
      });
      if (excluded) {
        result = false;
      }
    }
    return result;
  }, [activeFromLink, activeFromPrefixes, data.activeExcludePaths, normalizedPath]);
}
