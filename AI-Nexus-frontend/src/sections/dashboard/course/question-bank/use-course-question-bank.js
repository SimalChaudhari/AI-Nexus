import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { courseService } from 'src/services/course.service';
import { userService } from 'src/services/user.service';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { toast } from 'src/components/snackbar';

import {
  UNLINKED_MODULE_KEY,
  buildModuleSummaries,
  QUIZ_QUESTION_TYPES,
  ASSESSMENT_QUESTION_TYPES,
  QUESTION_BANK_CATEGORY_PARAM,
  parseQuestionBankCategoryParam,
} from './course-question-bank-utils';

// ----------------------------------------------------------------------

export function useCourseQuestionBank(courseId) {
  const [searchParams, setSearchParams] = useSearchParams();
  const prevCourseIdRef = useRef(courseId);

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [moduleChoices, setModuleChoices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedCategory, setSelectedCategoryState] = useState(() =>
    parseQuestionBankCategoryParam(searchParams.get(QUESTION_BANK_CATEGORY_PARAM))
  );
  const [formCategoryContext, setFormCategoryContext] = useState(null);

  const [formType, setFormType] = useState('mcq');
  const [formPrompt, setFormPrompt] = useState('');
  const [formModuleId, setFormModuleId] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formOptions, setFormOptions] = useState(['', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState(0);
  const [formTfCorrect, setFormTfCorrect] = useState('true');
  const [formShortCorrect, setFormShortCorrect] = useState('');
  const [formAssignedUsers, setFormAssignedUsers] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [referenceMaterials, setReferenceMaterials] = useState([]);

  const loadAll = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [mods, qs] = await Promise.all([
        courseService.getCourseModulesWithSections(courseId),
        courseService.getCourseQuestionBank(courseId),
      ]);
      const modOpts = (mods || []).map((m) => ({
        id: m.id,
        label: m.title || 'Untitled module',
      }));
      setModuleChoices(modOpts);
      setQuestions(Array.isArray(qs) ? qs : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load question bank');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const setSelectedCategory = useCallback(
    (category) => {
      const nextCategory = parseQuestionBankCategoryParam(category);
      setSelectedCategoryState(nextCategory);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextCategory) {
            next.set(QUESTION_BANK_CATEGORY_PARAM, nextCategory);
          } else {
            next.delete(QUESTION_BANK_CATEGORY_PARAM);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    const fromUrl = parseQuestionBankCategoryParam(
      searchParams.get(QUESTION_BANK_CATEGORY_PARAM)
    );
    setSelectedCategoryState((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  useEffect(() => {
    if (prevCourseIdRef.current === courseId) return;
    prevCourseIdRef.current = courseId;
    setSelectedCategoryState(null);
    setFormCategoryContext(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(QUESTION_BANK_CATEGORY_PARAM);
        return next;
      },
      { replace: true }
    );
  }, [courseId, setSearchParams]);

  useEffect(() => {
    if (!dialogOpen || formType !== 'assignment') return;
    let active = true;
    setUsersLoading(true);
    userService
      .getAllUsers({ limit: 200 })
      .then((result) => {
        if (!active) return;
        const list = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        setUserOptions(list);
      })
      .catch(() => {
        if (active) setUserOptions([]);
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dialogOpen, formType]);

  useEffect(() => {
    if (!editing || editing.questionType !== 'assignment') return;
    const ids = Array.isArray(editing.assignedUserIds) ? editing.assignedUserIds : [];
    if (!ids.length) {
      setFormAssignedUsers([]);
      return;
    }
    setFormAssignedUsers(
      ids.map((id) => userOptions.find((u) => u.id === id) || { id, name: id, email: '' })
    );
  }, [editing, userOptions]);

  const moduleSummaries = useMemo(
    () => buildModuleSummaries(questions, moduleChoices),
    [questions, moduleChoices]
  );

  const formTypeOptions = useMemo(() => {
    if (formCategoryContext === 'assessment') return ASSESSMENT_QUESTION_TYPES;
    if (formCategoryContext === 'quiz') return QUIZ_QUESTION_TYPES;
    return QUIZ_QUESTION_TYPES;
  }, [formCategoryContext]);

  const formTypeLocked = formCategoryContext === 'assessment';

  const resetForm = useCallback((presetModuleId = '') => {
    setEditing(null);
    setFormType('mcq');
    setFormPrompt('');
    setFormModuleId(
      presetModuleId && presetModuleId !== UNLINKED_MODULE_KEY ? presetModuleId : ''
    );
    setFormExplanation('');
    setFormOptions(['', '']);
    setFormCorrectIndex(0);
    setFormTfCorrect('true');
    setFormShortCorrect('');
    setFormAssignedUsers([]);
    setReferenceMaterials([]);
  }, []);

  const openCreate = useCallback(
    (categoryKey, presetModuleId = '') => {
      const category = categoryKey === 'assessment' ? 'assessment' : 'quiz';
      const presetType = category === 'assessment' ? 'assignment' : 'mcq';
      resetForm(presetModuleId);
      setFormType(presetType);
      setFormCategoryContext(category);
      setSelectedCategory(category);
      if (presetType === 'mcq') {
        setFormOptions(['', '']);
      }
      setDialogOpen(true);
    },
    [resetForm, setSelectedCategory]
  );

  const resolveAssignedUsersFromRow = useCallback(
    (row) => {
      const ids = Array.isArray(row.assignedUserIds) ? row.assignedUserIds : [];
      if (!ids.length) return [];
      return ids
        .map((id) => userOptions.find((u) => u.id === id) || { id, name: id, email: '' })
        .filter(Boolean);
    },
    [userOptions]
  );

  const openEdit = useCallback(
    (row) => {
      setEditing(row);
      const t = row.questionType || 'mcq';
      const category = t === 'assignment' ? 'assessment' : 'quiz';
      setFormCategoryContext(category);
      setSelectedCategory(category);
      setFormType(t);
      setFormPrompt(row.prompt || '');
      setFormModuleId(row.moduleId || '');
      setFormExplanation(row.explanation || '');
      if (t === 'mcq') {
        const opts = Array.isArray(row.options) && row.options.length ? [...row.options] : ['', ''];
        setFormOptions(opts);
        setFormCorrectIndex(
          row.correctIndex != null ? Math.min(Number(row.correctIndex), opts.length - 1) : 0
        );
      } else if (t === 'true_false') {
        setFormTfCorrect(row.correctAnswer === 'false' ? 'false' : 'true');
      } else if (t === 'assignment') {
        setFormAssignedUsers(resolveAssignedUsersFromRow(row));
        setReferenceMaterials(
          row.referenceFileUrl ? [resolveAssetUrl(row.referenceFileUrl)] : []
        );
      } else {
        setFormShortCorrect(row.correctAnswer || '');
      }
      setDialogOpen(true);
    },
    [resolveAssignedUsersFromRow, setSelectedCategory]
  );

  const buildPayload = useCallback(() => {
    const base = {
      prompt: formPrompt.trim() || (formType === 'assignment' ? 'Assessment' : ''),
      explanation: formExplanation.trim() || undefined,
    };
    if (formModuleId) {
      base.moduleId = formModuleId;
    } else if (editing) {
      base.moduleId = null;
    }
    if (formType === 'mcq') {
      const opts = formOptions.map((o) => String(o).trim()).filter(Boolean);
      if (opts.length < 2) {
        toast.error('Add at least two non-empty options');
        return null;
      }
      if (formCorrectIndex < 0 || formCorrectIndex >= opts.length) {
        toast.error('Pick a valid correct option');
        return null;
      }
      return {
        ...base,
        questionType: 'mcq',
        options: opts,
        correctIndex: formCorrectIndex,
      };
    }
    if (formType === 'true_false') {
      return {
        ...base,
        questionType: 'true_false',
        correctAnswer: formTfCorrect,
      };
    }
    if (formType === 'assignment') {
      const assignedUserIds = formAssignedUsers.map((u) => u.id).filter(Boolean);
      return {
        ...base,
        questionType: 'assignment',
        assignedUserIds: assignedUserIds.length ? assignedUserIds : null,
      };
    }
    if (!formShortCorrect.trim()) {
      toast.error('Enter the expected answer for short text');
      return null;
    }
    return {
      ...base,
      questionType: 'short_text',
      correctAnswer: formShortCorrect.trim(),
    };
  }, [
    editing,
    formAssignedUsers,
    formCorrectIndex,
    formExplanation,
    formModuleId,
    formOptions,
    formPrompt,
    formShortCorrect,
    formTfCorrect,
    formType,
  ]);

  const handleSave = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;
    if (formType !== 'assignment' && !payload.prompt) {
      toast.error('Question text is required');
      return;
    }
    setSaving(true);
    try {
      const newReferenceFile = referenceMaterials.find((item) => item instanceof File);
      const hasExistingReference = referenceMaterials.some((item) => typeof item === 'string');

      if (editing?.id) {
        await courseService.updateCourseQuestion(editing.id, payload);
        if (newReferenceFile) {
          try {
            await courseService.uploadAssignmentReferenceFile(courseId, editing.id, newReferenceFile);
            toast.success('Reference file uploaded');
          } catch (err) {
            toast.error('Reference file upload failed');
          }
        } else if (!hasExistingReference && editing.referenceFileUrl) {
          await courseService.updateCourseQuestion(editing.id, {
            referenceFileUrl: null,
            referenceFileName: null,
          });
        }
        toast.success('Question updated');
      } else {
        const created = await courseService.createCourseQuestion(courseId, payload);
        if (newReferenceFile && created?.id) {
          try {
            await courseService.uploadAssignmentReferenceFile(courseId, created.id, newReferenceFile);
            toast.success('Reference file uploaded');
          } catch (err) {
            toast.error('Reference file upload failed');
          }
        }
        toast.success('Question added');
      }
      setDialogOpen(false);
      setFormCategoryContext(null);
      await loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [buildPayload, courseId, editing, formType, loadAll, referenceMaterials]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) return;
    try {
      await courseService.deleteCourseQuestion(deleteTarget.id);
      toast.success('Question removed');
      setDeleteTarget(null);
      await loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  }, [deleteTarget, loadAll]);

  const addOption = useCallback(
    () => setFormOptions((prev) => [...prev, '']),
    []
  );

  const setOptionAt = useCallback((i, v) => {
    setFormOptions((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }, []);

  const removeOption = useCallback(
    (i) => setFormOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, j) => j !== i))),
    []
  );

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setFormCategoryContext(null);
  }, []);

  const handleFormTypeChange = useCallback((e) => {
    const v = e.target.value;
    setFormType(v);
    if (v === 'mcq') {
      setFormOptions((prev) =>
        !prev.length || prev.every((x) => !String(x).trim()) ? ['', ''] : prev
      );
    }
  }, []);

  return {
    loading,
    moduleChoices,
    moduleSummaries,
    selectedCategory,
    setSelectedCategory,
    dialogOpen,
    saving,
    editing,
    deleteTarget,
    setDeleteTarget,
    formType,
    formTypeOptions,
    formTypeLocked,
    formPrompt,
    formModuleId,
    formExplanation,
    formOptions,
    formCorrectIndex,
    formTfCorrect,
    formShortCorrect,
    formAssignedUsers,
    userOptions,
    usersLoading,
    referenceMaterials,
    openCreate,
    openEdit,
    handleSave,
    handleConfirmDelete,
    closeDialog,
    addOption,
    setOptionAt,
    removeOption,
    setFormPrompt,
    setFormModuleId,
    setFormExplanation,
    setFormCorrectIndex,
    setFormTfCorrect,
    setFormShortCorrect,
    setFormAssignedUsers,
    setReferenceMaterials,
    handleFormTypeChange,
  };
}
