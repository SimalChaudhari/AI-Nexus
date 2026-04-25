import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useSetState } from 'src/hooks/use-set-state';
import { useTable } from 'src/components/table';
import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

/**
 * Shared hook for admin list screens:
 * - initialize table/filter state from URL query params
 * - keep URL query params in sync as table/filter changes
 * - expose normalized backend query payload
 */
export function useAdminTableQueryState({
  defaultPage = ADMIN_TABLE_DEFAULTS.page,
  defaultRowsPerPage = ADMIN_TABLE_DEFAULTS.rowsPerPage,
  filterDefaults = {},
  queryMap = {},
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPage = Math.max((Number(searchParams.get('page')) || defaultPage) - 1, 0);
  const initialRowsPerPage = Math.max(Number(searchParams.get('rowsPerPage')) || defaultRowsPerPage, 1);

  const initialFilters = useMemo(() => {
    const next = { ...filterDefaults };
    Object.entries(filterDefaults).forEach(([key, defaultValue]) => {
      const value = searchParams.get(key);
      next[key] = value ?? defaultValue;
    });
    return next;
  }, [filterDefaults, searchParams]);

  const table = useTable({ defaultCurrentPage: initialPage, defaultRowsPerPage: initialRowsPerPage });
  const filters = useSetState(initialFilters);

  const query = useMemo(() => {
    const base = {
      page: table.page + 1,
      limit: table.rowsPerPage,
    };

    Object.entries(queryMap).forEach(([filterKey, mapValue]) => {
      const rawValue = filters.state[filterKey];
      const transformed = typeof mapValue === 'function' ? mapValue(rawValue) : rawValue;
      if (transformed !== undefined && transformed !== null && transformed !== '') {
        base[filterKey] = transformed;
      }
    });

    return base;
  }, [filters.state, queryMap, table.page, table.rowsPerPage]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(table.page + 1));
        next.set('rowsPerPage', String(table.rowsPerPage));

        Object.entries(filterDefaults).forEach(([key, defaultValue]) => {
          const value = filters.state[key];
          if (value !== undefined && value !== null && String(value) !== '' && value !== defaultValue) {
            next.set(key, String(value));
          } else {
            next.delete(key);
          }
        });

        if (next.toString() === prev.toString()) return prev;
        return next;
      },
      { replace: true }
    );
  }, [filterDefaults, filters.state, setSearchParams, table.page, table.rowsPerPage]);

  return { table, filters, query };
}

