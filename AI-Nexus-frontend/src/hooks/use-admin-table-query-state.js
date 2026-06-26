import { useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useSetState } from 'src/hooks/use-set-state';
import { useTable } from 'src/components/table';
import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

/** Keep a stable reference for value-equal objects/arrays so they don't retrigger effects. */
function useStableValue(value) {
  const ref = useRef(value);
  if (JSON.stringify(ref.current) !== JSON.stringify(value)) {
    ref.current = value;
  }
  return ref.current;
}

/**
 * Shared hook for admin list screens:
 * - initialize table/filter state from URL query params
 * - keep URL query params in sync as table/filter changes
 * - expose normalized backend query payload
 */
export function useAdminTableQueryState({
  defaultPage = ADMIN_TABLE_DEFAULTS.page,
  defaultRowsPerPage = ADMIN_TABLE_DEFAULTS.rowsPerPage,
  filterDefaults = EMPTY_OBJECT,
  queryMap = EMPTY_OBJECT,
  /** Query keys that are always written to the URL when non-empty (even if equal to default). */
  persistFilterKeys = EMPTY_ARRAY,
  /** Passed through to `useTable` (e.g. `defaultOrderBy`, `defaultOrder`, `defaultDense`). */
  useTableProps = EMPTY_OBJECT,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Inline default `{}` / `[]` props change identity every render; stabilize them so the
  // URL-sync effect below isn't retriggered on each render.
  const stableFilterDefaults = useStableValue(filterDefaults);
  const stableQueryMap = useStableValue(queryMap);
  const stablePersistFilterKeys = useStableValue(persistFilterKeys);

  const initialPage = Math.max((Number(searchParams.get('page')) || defaultPage) - 1, 0);
  const initialRowsPerPage = Math.max(Number(searchParams.get('rowsPerPage')) || defaultRowsPerPage, 1);

  const initialFilters = useMemo(() => {
    const next = { ...stableFilterDefaults };
    Object.entries(stableFilterDefaults).forEach(([key, defaultValue]) => {
      const value = searchParams.get(key);
      next[key] = value ?? defaultValue;
    });
    return next;
  }, [stableFilterDefaults, searchParams]);

  const table = useTable({
    defaultCurrentPage: initialPage,
    defaultRowsPerPage: initialRowsPerPage,
    ...useTableProps,
  });
  const filters = useSetState(initialFilters);

  const query = useMemo(() => {
    const base = {
      page: table.page + 1,
      limit: table.rowsPerPage,
    };

    Object.entries(stableQueryMap).forEach(([filterKey, mapValue]) => {
      const rawValue = filters.state[filterKey];
      const transformed = typeof mapValue === 'function' ? mapValue(rawValue) : rawValue;
      if (transformed !== undefined && transformed !== null && transformed !== '') {
        base[filterKey] = transformed;
      }
    });

    return base;
  }, [filters.state, stableQueryMap, table.page, table.rowsPerPage]);

  useEffect(() => {
    const current = new URLSearchParams(searchParams);
    const next = new URLSearchParams(searchParams);
    next.set('page', String(table.page + 1));
    next.set('rowsPerPage', String(table.rowsPerPage));

    Object.entries(stableFilterDefaults).forEach(([key, defaultValue]) => {
      const value = filters.state[key];
      if (stablePersistFilterKeys.includes(key)) {
        if (value !== undefined && value !== null && String(value) !== '') {
          next.set(key, String(value));
        } else {
          next.delete(key);
        }
        return;
      }
      if (value !== undefined && value !== null && String(value) !== '' && value !== defaultValue) {
        next.set(key, String(value));
      } else {
        next.delete(key);
      }
    });

    // Only navigate when the query string actually changes. Calling setSearchParams
    // unconditionally re-navigates (new location key) on every render and causes an
    // infinite re-render loop in react-router v6.
    if (next.toString() === current.toString()) return;

    setSearchParams(next, { replace: true });
  }, [
    stableFilterDefaults,
    filters.state,
    stablePersistFilterKeys,
    searchParams,
    setSearchParams,
    table.page,
    table.rowsPerPage,
  ]);

  return { table, filters, query };
}

