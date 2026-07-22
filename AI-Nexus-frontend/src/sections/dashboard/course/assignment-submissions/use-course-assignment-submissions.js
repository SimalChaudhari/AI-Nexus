import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const PENDING_POLL_MS = 10_000;

function isPendingEvaluation(row) {
  const status = String(row?.evaluationStatus || '').toLowerCase();
  return status === 'pending' || status === 'processing';
}

export function useCourseAssignmentSubmissions(courseId, query = {}) {
  const {
    filterUserId = '',
    search = '',
    status = 'all',
    page = 0,
    rowsPerPage = 10,
  } = query;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, passed: 0, failed: 0 });
  const [userOptions, setUserOptions] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [regradingId, setRegradingId] = useState(null);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const loadRows = useCallback(
    async ({ silent = false } = {}) => {
      if (!courseId) return;
      if (!silent) setLoading(true);
      try {
        const result = await courseService.getAssignmentSubmissions(courseId, {
          userId: filterUserId || undefined,
          search: search.trim() || undefined,
          status: status && status !== 'all' ? status : undefined,
          page: page + 1,
          limit: rowsPerPage,
        });

        const list = Array.isArray(result) ? result : result?.data || [];
        const pagination = Array.isArray(result) ? null : result?.pagination;
        const nextStats = Array.isArray(result) ? null : result?.stats;
        const users = Array.isArray(result) ? [] : result?.users || [];

        setRows(list);
        setTotalItems(
          pagination?.totalItems != null ? Number(pagination.totalItems) : list.length
        );
        if (nextStats) {
          setStats({
            total: Number(nextStats.total) || 0,
            pending: Number(nextStats.pending) || 0,
            passed: Number(nextStats.passed) || 0,
            failed: Number(nextStats.failed) || 0,
          });
        } else {
          setStats({
            total: list.length,
            pending: list.filter(
              (row) => row.manualPassed == null && row.evaluationStatus !== 'draft'
            ).length,
            passed: list.filter((row) => row.manualPassed === true).length,
            failed: list.filter((row) => row.manualPassed === false).length,
          });
        }
        if (users.length) {
          setUserOptions(users);
        }
      } catch (e) {
        if (!silent) {
          toast.error(
            e?.response?.data?.message || e?.message || 'Failed to load assignment submissions'
          );
          setRows([]);
          setTotalItems(0);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [courseId, filterUserId, search, status, page, rowsPerPage]
  );

  useEffect(() => {
    loadRows({ silent: false });
  }, [loadRows]);

  const hasPendingEvaluations = useMemo(
    () => rows.some((row) => isPendingEvaluation(row)),
    [rows]
  );

  useEffect(() => {
    if (!courseId || !hasPendingEvaluations) return undefined;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (!rowsRef.current.some((row) => isPendingEvaluation(row))) return;
      loadRows({ silent: true });
    }, PENDING_POLL_MS);

    return () => clearInterval(timer);
  }, [courseId, hasPendingEvaluations, loadRows]);

  const handleConfirmDelete = useCallback(async () => {
    const row = deleteTarget;
    if (!courseId || !row?.questionId) return;
    setDeletingId(row.id);
    try {
      await courseService.deleteAssignmentSubmission(courseId, row.questionId, {
        userId: row.userId,
      });
      toast.success('Assessment file deleted');
      setDeleteTarget(null);
      await loadRows({ silent: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }, [courseId, deleteTarget, loadRows]);

  const handleManualVerify = useCallback(
    async ({ passed, feedback }) => {
      if (!courseId || !verifyTarget?.id) return;
      setVerifyingId(verifyTarget.id);
      try {
        await courseService.manualVerifyAssignmentSubmission(courseId, verifyTarget.id, {
          passed,
          feedback,
        });
        toast.success(passed ? 'Marked as pass' : 'Marked as fail');
        setVerifyTarget(null);
        await loadRows({ silent: true });
      } catch (e) {
        toast.error(e?.response?.data?.message || e?.message || 'Manual verification failed');
      } finally {
        setVerifyingId(null);
      }
    },
    [courseId, verifyTarget, loadRows]
  );

  const handleRegrade = useCallback(
    async (row) => {
      if (!courseId || !row?.id) return;
      setRegradingId(row.id);
      try {
        await courseService.regradeAssignmentSubmission(courseId, row.id);
        toast.success('AI regrading started');
        await loadRows({ silent: true });
      } catch (e) {
        toast.error(e?.response?.data?.message || e?.message || 'Regrade failed');
      } finally {
        setRegradingId(null);
      }
    },
    [courseId, loadRows]
  );

  return {
    loading,
    rows,
    totalItems,
    stats,
    userOptions,
    deletingId,
    deleteTarget,
    setDeleteTarget,
    verifyTarget,
    setVerifyTarget,
    verifyingId,
    regradingId,
    handleConfirmDelete,
    handleManualVerify,
    handleRegrade,
    loadRows,
  };
}
