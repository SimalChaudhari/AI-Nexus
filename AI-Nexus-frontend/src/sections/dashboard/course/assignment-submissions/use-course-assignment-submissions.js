import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';

import { buildSubmissionModuleSummaries } from './course-assignment-submissions-utils';

// ----------------------------------------------------------------------

const PENDING_POLL_MS = 10_000;

function isPendingEvaluation(row) {
  const status = String(row?.evaluationStatus || '').toLowerCase();
  return status === 'pending' || status === 'processing';
}

export function useCourseAssignmentSubmissions(courseId) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [moduleChoices, setModuleChoices] = useState([]);
  const [filterUserId, setFilterUserId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState(null);
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
        const [mods, data] = await Promise.all([
          courseService.getCourseModulesWithSections(courseId),
          courseService.getAssignmentSubmissions(courseId, {
            userId: filterUserId || undefined,
          }),
        ]);
        const modOpts = (mods || []).map((m) => ({
          id: m.id,
          label: m.title || 'Untitled module',
        }));
        setModuleChoices(modOpts);
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!silent) {
          toast.error(
            e?.response?.data?.message || e?.message || 'Failed to load assignment submissions'
          );
        }
        if (!silent) setRows([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [courseId, filterUserId]
  );

  useEffect(() => {
    loadRows({ silent: false });
  }, [loadRows]);

  useEffect(() => {
    setSelectedModuleId(null);
  }, [courseId]);

  const hasPendingEvaluations = useMemo(
    () => rows.some((row) => isPendingEvaluation(row)),
    [rows]
  );

  // Poll only while AI grading is in progress. Do not depend on `rows` identity or the
  // interval will reset on every response and feel like continuous API spam.
  useEffect(() => {
    if (!courseId || !hasPendingEvaluations) return undefined;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (!rowsRef.current.some((row) => isPendingEvaluation(row))) return;
      loadRows({ silent: true });
    }, PENDING_POLL_MS);

    return () => clearInterval(timer);
  }, [courseId, hasPendingEvaluations, loadRows]);

  const moduleSummaries = useMemo(
    () => buildSubmissionModuleSummaries(rows, moduleChoices),
    [rows, moduleChoices]
  );

  const activeModule = useMemo(
    () => moduleSummaries.find((mod) => mod.id === selectedModuleId) || null,
    [moduleSummaries, selectedModuleId]
  );

  const userOptions = useMemo(
    () =>
      [...new Map(rows.map((r) => [r.userId, { id: r.userId, label: r.userName }])).values()],
    [rows]
  );

  const handleConfirmDelete = useCallback(async () => {
    const row = deleteTarget;
    if (!courseId || !row?.questionId) return;
    setDeletingId(row.id);
    try {
      await courseService.deleteAssignmentSubmission(courseId, row.questionId, {
        userId: row.userId,
      });
      toast.success('Assessment file deleted');
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }, [courseId, deleteTarget]);

  const handleManualVerify = useCallback(
    async ({ passed, feedback }) => {
      if (!courseId || !verifyTarget?.id) return;
      setVerifyingId(verifyTarget.id);
      try {
        const updated = await courseService.manualVerifyAssignmentSubmission(
          courseId,
          verifyTarget.id,
          { passed, feedback }
        );
        setRows((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast.success(passed ? 'Marked as pass' : 'Marked as fail');
        setVerifyTarget(null);
      } catch (e) {
        toast.error(e?.response?.data?.message || e?.message || 'Manual verification failed');
      } finally {
        setVerifyingId(null);
      }
    },
    [courseId, verifyTarget]
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
    filterUserId,
    setFilterUserId,
    userOptions,
    moduleSummaries,
    activeModule,
    selectedModuleId,
    setSelectedModuleId,
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
