import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

/**
 * Reusable helper for paginated admin tables.
 * After delete, refresh current page and if it becomes empty, move one page back.
 */
export function useAdminTableDeleteRecovery({ table, fetchAction, query }) {
  const dispatch = useDispatch();

  const refreshAfterDelete = useCallback(async () => {
    const result = await dispatch(fetchAction(query)).unwrap();
    const rows = Array.isArray(result) ? result : result?.data;

    if (table.page > 0 && (!rows || rows.length === 0)) {
      table.setPage(table.page - 1);
    }
  }, [dispatch, fetchAction, query, table]);

  return { refreshAfterDelete };
}

