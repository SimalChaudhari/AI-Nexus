import { useCallback, useEffect, useMemo, useState } from 'react';

import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';

import { buildSubmissionModuleSummaries } from './course-assignment-submissions-utils';

// ----------------------------------------------------------------------

export function useCourseAssignmentSubmissions(courseId) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [moduleChoices, setModuleChoices] = useState([]);
  const [filterUserId, setFilterUserId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRows = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
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
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load assignment submissions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, filterUserId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setSelectedModuleId(null);
  }, [courseId]);

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
    handleConfirmDelete,
  };
}
