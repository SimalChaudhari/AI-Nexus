import { z as zod } from 'zod';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Alert from '@mui/material/Alert';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { Upload } from 'src/components/upload';
import { createCourse, updateCourse } from 'src/store/slices/courseSlice';
import { speakerService } from 'src/services/speaker.service';
import { languageService } from 'src/services/language.service';
import { categoryService } from 'src/services/category.service';
import { programService } from 'src/services/program.service';
import { courseService } from 'src/services/course.service';
import {
  AI_EXPERIENCE_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  AI_USE_AREA_OPTIONS,
  FINANCE_ROLE_OPTIONS,
} from 'src/constants/learning-profile-options';

import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

import { CourseModulesCard } from './course-modules-card';
import { CourseQuestionBankPanel } from './course-question-bank-panel';
import { COURSE_LEVEL_OPTIONS } from './constants';

// ----------------------------------------------------------------------

const parseMarketData = (marketData) => {
  if (!marketData || typeof marketData !== 'string') return {};
  try {
    const parsed = JSON.parse(marketData);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeCourseLevelForForm = (level) => {
  const normalized = String(level || '').trim().toLowerCase();
  if (normalized === 'intermediate') return 'Intermediate';
  if (normalized === 'advanced' || normalized === 'advance') return 'Advanced';
  return 'Beginner';
};

const getCourseLanguageIds = (course) => {
  if (Array.isArray(course?.languages) && course.languages.length > 0) {
    return course.languages.map((l) => l?.id).filter(Boolean);
  }
  return Array.isArray(course?.languageIds) ? course.languageIds : [];
};

const getCourseSpeakerIds = (course) => {
  if (Array.isArray(course?.speakers) && course.speakers.length > 0) {
    return course.speakers.map((s) => s?.id).filter(Boolean);
  }
  return Array.isArray(course?.speakerIds) ? course.speakerIds : [];
};

export const NewCourseSchema = zod.object({
  title: zod
    .string()
    .trim()
    .min(1, { message: 'Title is required!' })
    .max(200, { message: 'Title must be 200 characters or less' }),
  description: zod
    .string()
    .optional()
    .refine((val) => !val || val.length <= 50000, { message: 'Description is too long' }),
  image: zod.string().optional(),
  freeOrPaid: zod.boolean().optional(),
  amount: zod.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, zod.number().optional()),
  level: zod.string(),
  roles: zod.array(zod.string()).optional(),
  aiLevel: zod.array(zod.string()).optional(),
  goals: zod.array(zod.string()).optional(),
  useAreas: zod.array(zod.string()).optional(),
  languageIds: zod.array(zod.string()).optional(),
  speakerIds: zod.array(zod.string()).optional(),
  categoryId: zod.string().optional(),
  programId: zod.string().optional(),
  cpeHours: zod.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    zod.number().min(0).optional()
  ),
  lessonCount: zod.preprocess(
    (val) =>
      val === '' || val === undefined || val === null
        ? undefined
        : typeof val === 'number'
          ? val
          : Number(val),
    zod.union([zod.number().min(0), zod.string()]).optional()
  ),
  isBundle: zod.boolean().optional(),
  bundleCourseIds: zod.array(zod.string()).optional(),
});

// ----------------------------------------------------------------------

export function CourseNewEditForm({ currentCourse, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const { creating, updating } = useSelector((state) => state.courses);
  const isEdit = Boolean(currentCourse);

  const [previewImage, setPreviewImage] = useState(currentCourse?.image || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageDeleted, setImageDeleted] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  const [speakersLoading, setSpeakersLoading] = useState(false);
  const speakersFetchDoneRef = useRef(false);
  const [languages, setLanguages] = useState([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const languagesFetchDoneRef = useRef(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const categoriesFetchDoneRef = useRef(false);
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const programsFetchDoneRef = useRef(false);
  /** Pending modules/sections when creating a course (before save); sent with create payload */
  const [pendingModules, setPendingModules] = useState([]);
  const [coursesCatalog, setCoursesCatalog] = useState([]);
  const [coursesCatalogLoading, setCoursesCatalogLoading] = useState(false);
  const coursesCatalogFetchRef = useRef(false);
  const dynamicOptionsFetchRef = useRef({
    level: false,
    role: false,
    aiLevel: false,
    goal: false,
    useArea: false,
  });
  const [dynamicOptions, setDynamicOptions] = useState({
    levels: COURSE_LEVEL_OPTIONS,
    roles: FINANCE_ROLE_OPTIONS,
    aiLevels: AI_EXPERIENCE_OPTIONS,
    goals: LEARNING_GOAL_OPTIONS,
    useAreas: AI_USE_AREA_OPTIONS,
  });

  const market = useMemo(
    () => parseMarketData(currentCourse?.marketData),
    [currentCourse?.marketData]
  );

  const defaultValues = useMemo(
    () => ({
      title: currentCourse?.title || '',
      description: currentCourse?.description || '',
      image: currentCourse?.image || '',
      freeOrPaid: currentCourse?.freeOrPaid ?? false,
      amount: currentCourse?.amount && currentCourse.amount > 0 ? currentCourse.amount : undefined,
      level: normalizeCourseLevelForForm(currentCourse?.level),
      categoryId: currentCourse?.categoryId || currentCourse?.category?.id || '',
      programId: currentCourse?.programId || currentCourse?.program?.id || '',
      roles: Array.isArray(currentCourse?.roles) ? currentCourse.roles : [],
      aiLevel: Array.isArray(currentCourse?.aiLevel) ? currentCourse.aiLevel : [],
      goals: Array.isArray(currentCourse?.goals) ? currentCourse.goals : [],
      useAreas: Array.isArray(currentCourse?.useAreas) ? currentCourse.useAreas : [],
      languageIds: getCourseLanguageIds(currentCourse),
      speakerIds: getCourseSpeakerIds(currentCourse),
      cpeHours: market.cpeHours ?? market.cpe ?? undefined,
      lessonCount: market.lessonCount ?? market.lessons ?? undefined,
      isBundle: currentCourse?.isBundle ?? false,
      bundleCourseIds: Array.isArray(currentCourse?.bundleCourseIds) ? currentCourse.bundleCourseIds : [],
    }),
    [currentCourse, market]
  );

  const ensureSpeakersLoaded = useCallback(() => {
    if (speakersFetchDoneRef.current) return;
    speakersFetchDoneRef.current = true;
    setSpeakersLoading(true);
    speakerService
      .getAll()
      .then((list) => {
        setSpeakers(list || []);
      })
      .catch(() => {
        speakersFetchDoneRef.current = false;
      })
      .finally(() => {
        setSpeakersLoading(false);
      });
  }, []);

  const ensureLanguagesLoaded = useCallback(() => {
    if (languagesFetchDoneRef.current) return;
    languagesFetchDoneRef.current = true;
    setLanguagesLoading(true);
    languageService
      .getAll()
      .then((list) => {
        setLanguages(list || []);
      })
      .catch(() => {
        languagesFetchDoneRef.current = false;
      })
      .finally(() => {
        setLanguagesLoading(false);
      });
  }, []);

  const ensureCategoriesLoaded = useCallback(() => {
    if (categoriesFetchDoneRef.current) return;
    categoriesFetchDoneRef.current = true;
    setCategoriesLoading(true);
    categoryService
      .getAllCategories({ page: 1, limit: 500 })
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setCategories(list || []);
      })
      .catch(() => {
        categoriesFetchDoneRef.current = false;
      })
      .finally(() => {
        setCategoriesLoading(false);
      });
  }, []);

  const ensureProgramsLoaded = useCallback(() => {
    if (programsFetchDoneRef.current) return;
    programsFetchDoneRef.current = true;
    setProgramsLoading(true);
    programService
      .getAllPrograms({ page: 1, limit: 500 })
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setPrograms(list || []);
      })
      .catch(() => {
        programsFetchDoneRef.current = false;
      })
      .finally(() => {
        setProgramsLoading(false);
      });
  }, []);

  const reloadPrograms = useCallback(async () => {
    setProgramsLoading(true);
    try {
      const res = await programService.getAllPrograms({ page: 1, limit: 500 });
      const list = Array.isArray(res) ? res : res?.data || [];
      setPrograms(list || []);
      programsFetchDoneRef.current = true;
      return list || [];
    } catch (error) {
      programsFetchDoneRef.current = false;
      throw error;
    } finally {
      setProgramsLoading(false);
    }
  }, []);

  // Edit mode: load speakers if already assigned so chip labels show names without opening the dropdown
  useEffect(() => {
    const ids = getCourseSpeakerIds(currentCourse);
    if (Array.isArray(ids) && ids.length > 0) {
      ensureSpeakersLoaded();
    }
  }, [currentCourse?.id, currentCourse?.speakers, currentCourse?.speakerIds, ensureSpeakersLoaded]);

  // Edit mode: load languages if already assigned so chip labels show titles without opening the dropdown
  useEffect(() => {
    const ids = getCourseLanguageIds(currentCourse);
    if (Array.isArray(ids) && ids.length > 0) {
      ensureLanguagesLoaded();
    }
  }, [currentCourse?.id, currentCourse?.languages, currentCourse?.languageIds, ensureLanguagesLoaded]);

  useEffect(() => {
    if (currentCourse?.categoryId) {
      ensureCategoriesLoaded();
    }
  }, [currentCourse?.categoryId, ensureCategoriesLoaded]);

  useEffect(() => {
    if (currentCourse?.programId || currentCourse?.program?.id) {
      ensureProgramsLoaded();
    }
  }, [currentCourse?.program?.id, currentCourse?.programId, ensureProgramsLoaded]);

  const ensureCoursesCatalogLoaded = useCallback(() => {
    if (coursesCatalogFetchRef.current) return;
    coursesCatalogFetchRef.current = true;
    setCoursesCatalogLoading(true);
    courseService
      .getAllCourses({ page: 1, limit: 500 })
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setCoursesCatalog(list);
      })
      .catch(() => {
        coursesCatalogFetchRef.current = false;
      })
      .finally(() => {
        setCoursesCatalogLoading(false);
      });
  }, []);

  const ensureOptionTypeLoaded = useCallback(async (type) => {
    dynamicOptionsFetchRef.current[type] = true;
    try {
      const rows = await courseService.getCourseOptions(type);
      const labels = (Array.isArray(rows) ? rows : [])
        .map((row) => String(row?.label || '').trim())
        .filter(Boolean);
      if (labels.length === 0) return rows || [];

      setDynamicOptions((prev) => {
        if (type === 'level') return { ...prev, levels: labels };
        if (type === 'role') return { ...prev, roles: labels };
        if (type === 'aiLevel') return { ...prev, aiLevels: labels };
        if (type === 'goal') return { ...prev, goals: labels };
        if (type === 'useArea') return { ...prev, useAreas: labels };
        return prev;
      });
      return rows || [];
    } catch {
      dynamicOptionsFetchRef.current[type] = false;
      return [];
    }
  }, []);

  // Initialize preview image from currentCourse
  useEffect(() => {
    if (currentCourse?.image) {
      setPreviewImage(currentCourse.image);
    }
  }, [currentCourse]);

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(NewCourseSchema),
    defaultValues,
  });

  const { reset, setValue, watch, handleSubmit } = methods;

  // Use Redux loading state instead of form's isSubmitting
  const isSubmitting = currentCourse ? updating : creating;
  const [optionDialog, setOptionDialog] = useState({
    open: false,
    type: 'role',
    field: 'roles',
    title: 'Add option',
    value: '',
  });
  const [addingOption, setAddingOption] = useState(false);
  const [optionRows, setOptionRows] = useState([]);
  const [optionRowsLoading, setOptionRowsLoading] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState('');
  const [editingOptionValue, setEditingOptionValue] = useState('');
  const [optionSearch, setOptionSearch] = useState('');
  const [programDrawerOpen, setProgramDrawerOpen] = useState(false);
  const [programRows, setProgramRows] = useState([]);
  const [programRowsLoading, setProgramRowsLoading] = useState(false);
  const [programName, setProgramName] = useState('');
  const [addingProgram, setAddingProgram] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState('');
  const [editingProgramValue, setEditingProgramValue] = useState('');
  const [programSearch, setProgramSearch] = useState('');

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(paths.admin.course.list);
  };

  const openOptionDialog = useCallback(
    async (type, field, title) => {
      setOptionRowsLoading(true);
      const rows = await ensureOptionTypeLoaded(type);
      setOptionRows(Array.isArray(rows) ? rows : []);
      setOptionRowsLoading(false);
      setOptionDialog({ open: true, type, field, title, value: '' });
    },
    [ensureOptionTypeLoaded]
  );

  const closeOptionDialog = useCallback(() => {
    setOptionDialog((prev) => ({ ...prev, open: false, value: '' }));
    setAddingOption(false);
    setEditingOptionId('');
    setEditingOptionValue('');
    setOptionSearch('');
  }, []);

  const handleCreateOptionFromDialog = useCallback(async () => {
    const label = String(optionDialog.value || '').trim();
    if (!label) {
      toast.error('Please enter a value');
      return;
    }

    try {
      setAddingOption(true);
      await courseService.createCourseOption(optionDialog.type, label);
      const latestRows = await courseService.getCourseOptions(optionDialog.type);
      setOptionRows(Array.isArray(latestRows) ? latestRows : []);

      setDynamicOptions((prev) => {
        const addUnique = (list) => [...new Set([...(list || []), label])];
        if (optionDialog.type === 'level') return { ...prev, levels: addUnique(prev.levels) };
        if (optionDialog.type === 'role') return { ...prev, roles: addUnique(prev.roles) };
        if (optionDialog.type === 'aiLevel') return { ...prev, aiLevels: addUnique(prev.aiLevels) };
        if (optionDialog.type === 'goal') return { ...prev, goals: addUnique(prev.goals) };
        if (optionDialog.type === 'useArea') return { ...prev, useAreas: addUnique(prev.useAreas) };
        return prev;
      });

      if (optionDialog.field === 'level') {
        setValue('level', label, { shouldValidate: true });
      } else {
        const current = watch(optionDialog.field) || [];
        const next = Array.isArray(current) ? [...new Set([...current, label])] : [label];
        setValue(optionDialog.field, next, { shouldValidate: true });
      }

      toast.success('Option created');
      closeOptionDialog();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create option');
      setAddingOption(false);
    }
  }, [closeOptionDialog, optionDialog.field, optionDialog.type, optionDialog.value, setValue, watch]);

  const handleStartEditOption = useCallback((row) => {
    setEditingOptionId(row?.id || '');
    setEditingOptionValue(String(row?.label || ''));
  }, []);

  const handleCancelEditOption = useCallback(() => {
    setEditingOptionId('');
    setEditingOptionValue('');
  }, []);

  const handleSaveEditOption = useCallback(async () => {
    const nextLabel = String(editingOptionValue || '').trim();
    if (!editingOptionId || !nextLabel) return;
    try {
      await courseService.updateCourseOption(editingOptionId, nextLabel);
      const latestRows = await courseService.getCourseOptions(optionDialog.type);
      setOptionRows(Array.isArray(latestRows) ? latestRows : []);
      setDynamicOptions((prev) => {
        const labels = (Array.isArray(latestRows) ? latestRows : [])
          .map((row) => String(row?.label || '').trim())
          .filter(Boolean);
        if (optionDialog.type === 'level') return { ...prev, levels: labels };
        if (optionDialog.type === 'role') return { ...prev, roles: labels };
        if (optionDialog.type === 'aiLevel') return { ...prev, aiLevels: labels };
        if (optionDialog.type === 'goal') return { ...prev, goals: labels };
        if (optionDialog.type === 'useArea') return { ...prev, useAreas: labels };
        return prev;
      });
      toast.success('Option updated');
      handleCancelEditOption();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update option');
    }
  }, [editingOptionId, editingOptionValue, handleCancelEditOption, optionDialog.type]);

  const handleDeleteOption = useCallback(
    async (row) => {
      try {
        await courseService.deleteCourseOption(row.id);
        const latestRows = await courseService.getCourseOptions(optionDialog.type);
        setOptionRows(Array.isArray(latestRows) ? latestRows : []);
        const labels = (Array.isArray(latestRows) ? latestRows : [])
          .map((item) => String(item?.label || '').trim())
          .filter(Boolean);
        setDynamicOptions((prev) => {
          if (optionDialog.type === 'level') return { ...prev, levels: labels };
          if (optionDialog.type === 'role') return { ...prev, roles: labels };
          if (optionDialog.type === 'aiLevel') return { ...prev, aiLevels: labels };
          if (optionDialog.type === 'goal') return { ...prev, goals: labels };
          if (optionDialog.type === 'useArea') return { ...prev, useAreas: labels };
          return prev;
        });

        if (optionDialog.field === 'level') {
          const current = String(watch('level') || '').trim();
          if (current && current.toLowerCase() === String(row.label || '').toLowerCase()) {
            setValue('level', '', { shouldValidate: true });
          }
        } else {
          const currentList = Array.isArray(watch(optionDialog.field)) ? watch(optionDialog.field) : [];
          const nextList = currentList.filter(
            (item) => String(item || '').toLowerCase() !== String(row.label || '').toLowerCase()
          );
          setValue(optionDialog.field, nextList, { shouldValidate: true });
        }

        toast.success('Option removed');
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to remove option');
      }
    },
    [optionDialog.field, optionDialog.type, setValue, watch]
  );

  const filteredOptionRows = useMemo(() => {
    const query = String(optionSearch || '').trim().toLowerCase();
    if (!query) return optionRows;
    return (optionRows || []).filter((row) =>
      String(row?.label || '')
        .toLowerCase()
        .includes(query)
    );
  }, [optionRows, optionSearch]);

  const openProgramDrawer = useCallback(async () => {
    setProgramDrawerOpen(true);
    setProgramRowsLoading(true);
    try {
      const list = await reloadPrograms();
      setProgramRows(Array.isArray(list) ? list : []);
    } catch {
      setProgramRows([]);
    } finally {
      setProgramRowsLoading(false);
    }
  }, [reloadPrograms]);

  const closeProgramDrawer = useCallback(() => {
    setProgramDrawerOpen(false);
    setProgramName('');
    setAddingProgram(false);
    setEditingProgramId('');
    setEditingProgramValue('');
    setProgramSearch('');
  }, []);

  const handleCreateProgramFromDrawer = useCallback(async () => {
    const title = String(programName || '').trim();
    if (!title) {
      toast.error('Please enter a program name');
      return;
    }
    try {
      setAddingProgram(true);
      const created = await programService.createProgram({ title, description: '', status: 'active' });
      const list = await reloadPrograms();
      setProgramRows(Array.isArray(list) ? list : []);
      if (created?.id) {
        setValue('programId', created.id, { shouldValidate: true });
      }
      toast.success('Program created');
      closeProgramDrawer();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create program');
      setAddingProgram(false);
    }
  }, [closeProgramDrawer, programName, reloadPrograms, setValue]);

  const handleStartEditProgram = useCallback((row) => {
    setEditingProgramId(row?.id || '');
    setEditingProgramValue(String(row?.title || ''));
  }, []);

  const handleCancelEditProgram = useCallback(() => {
    setEditingProgramId('');
    setEditingProgramValue('');
  }, []);

  const handleSaveEditProgram = useCallback(async () => {
    const nextTitle = String(editingProgramValue || '').trim();
    if (!editingProgramId || !nextTitle) return;
    try {
      await programService.updateProgram(editingProgramId, { title: nextTitle });
      const list = await reloadPrograms();
      setProgramRows(Array.isArray(list) ? list : []);
      toast.success('Program updated');
      handleCancelEditProgram();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update program');
    }
  }, [editingProgramId, editingProgramValue, handleCancelEditProgram, reloadPrograms]);

  const handleDeleteProgram = useCallback(
    async (row) => {
      try {
        await programService.deleteProgram(row.id);
        const list = await reloadPrograms();
        setProgramRows(Array.isArray(list) ? list : []);
        const currentProgramId = String(watch('programId') || '');
        if (currentProgramId && currentProgramId === String(row.id)) {
          setValue('programId', '', { shouldValidate: true });
        }
        toast.success('Program removed');
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to remove program');
      }
    },
    [reloadPrograms, setValue, watch]
  );

  const filteredProgramRows = useMemo(() => {
    const query = String(programSearch || '').trim().toLowerCase();
    if (!query) return programRows;
    return (programRows || []).filter((row) =>
      String(row?.title || '')
        .toLowerCase()
        .includes(query)
    );
  }, [programRows, programSearch]);

  const freeOrPaid = watch('freeOrPaid');
  const isBundle = watch('isBundle');

  // Clear amount when switching to free
  useEffect(() => {
    if (freeOrPaid === false) {
      setValue('amount', undefined, { shouldValidate: true });
    }
  }, [freeOrPaid, setValue]);

  useEffect(() => {
    if (!isBundle) {
      setValue('bundleCourseIds', [], { shouldValidate: true });
    }
  }, [isBundle, setValue]);

  useEffect(() => {
    if (isBundle) {
      ensureCoursesCatalogLoaded();
    }
  }, [isBundle, ensureCoursesCatalogLoaded]);

  // Reset form and preview when currentCourse changes
  useEffect(() => {
    if (currentCourse?.id) {
      const img = currentCourse.image || '';
      const marketReset = parseMarketData(currentCourse.marketData);
      reset({
        title: currentCourse.title || '',
        description: currentCourse.description || '',
        image: img,
        freeOrPaid: currentCourse.freeOrPaid ?? false,
        amount: currentCourse.amount && currentCourse.amount > 0 ? currentCourse.amount : undefined,
        level: normalizeCourseLevelForForm(currentCourse.level),
        categoryId: currentCourse.categoryId || currentCourse.category?.id || '',
        programId: currentCourse.programId || currentCourse.program?.id || '',
        roles: Array.isArray(currentCourse.roles) ? currentCourse.roles : [],
        aiLevel: Array.isArray(currentCourse.aiLevel) ? currentCourse.aiLevel : [],
        goals: Array.isArray(currentCourse.goals) ? currentCourse.goals : [],
        useAreas: Array.isArray(currentCourse.useAreas) ? currentCourse.useAreas : [],
        languageIds: getCourseLanguageIds(currentCourse),
        speakerIds: getCourseSpeakerIds(currentCourse),
        cpeHours: marketReset.cpeHours ?? marketReset.cpe ?? undefined,
        lessonCount: marketReset.lessonCount ?? marketReset.lessons ?? undefined,
        isBundle: currentCourse.isBundle ?? false,
        bundleCourseIds: Array.isArray(currentCourse.bundleCourseIds) ? currentCourse.bundleCourseIds : [],
      });
      setPreviewImage(img || null);
      setSelectedFile(null);
      setImageDeleted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCourse?.id, reset]);

  // Handle image drop - store file for upload (not base64)
  const handleDropImage = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Create preview for display (base64 for preview only)
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result; // For preview only
      setPreviewImage(base64String);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file); // For preview only

    // Store the actual file for upload
    setSelectedFile(file);
    setImageDeleted(false); // Reset delete flag when new file is selected
  }, []);

  // Handle image delete
  const handleDeleteImage = useCallback(async () => {
    setPreviewImage(null);
    setSelectedFile(null);

    if (currentCourse?.id) {
      // Existing course: delete immediately via API so path + file dono hat jaye
      try {
        await courseService.deleteCourseImage(currentCourse.id);
        setImageDeleted(false);
        // Clear the image field in the form model
        setValue('image', '', { shouldValidate: false });
        toast.success('Cover image removed');
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to delete cover image');
      }
    } else {
      // New course (not yet saved): just mark deleted so submit logic can handle it
      setImageDeleted(true);
      setValue('image', '', { shouldValidate: false });
    }
  }, [currentCourse?.id, setValue]);

  const handleEditorMediaUpload = async (file) => {
    try {
      return await courseService.uploadCourseEditorMedia(file);
    } catch (error) {
      toast.error(error?.message || 'Media upload failed');
      return '';
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const normalizeList = (list) =>
        [...new Set((Array.isArray(list) ? list : []).map((x) => String(x || '').trim()).filter(Boolean))];
      const ensureOptionsExist = async (type, values) => {
        const existing =
          type === 'level'
            ? dynamicOptions.levels
            : type === 'role'
              ? dynamicOptions.roles
              : type === 'aiLevel'
                ? dynamicOptions.aiLevels
                : type === 'goal'
                  ? dynamicOptions.goals
                  : dynamicOptions.useAreas;
        const existingSet = new Set((existing || []).map((x) => String(x || '').trim().toLowerCase()));
        const missing = normalizeList(values).filter((value) => !existingSet.has(value.toLowerCase()));
        if (missing.length === 0) return;
        await Promise.all(
          missing.map((label) =>
            courseService.createCourseOption(type, label).catch(() => null)
          )
        );
      };

      const marketDataObj = {};
      if (data.cpeHours != null && data.cpeHours !== '')
        marketDataObj.cpeHours = Number(data.cpeHours);
      if (data.lessonCount != null && data.lessonCount !== '')
        marketDataObj.lessonCount = Number(data.lessonCount);
      const marketDataStr =
        Object.keys(marketDataObj).length > 0 ? JSON.stringify(marketDataObj) : undefined;

      const courseData = {
        title: data.title.trim(),
        description: isEffectivelyEmptyHtml(data.description || '')
          ? undefined
          : data.description,
        freeOrPaid: data.freeOrPaid ?? false,
        amount: data.freeOrPaid && data.amount != null ? parseFloat(data.amount.toString()) : 0,
        level: data.level || 'Beginner',
        categoryId: data.categoryId || undefined,
        ...(!data.isBundle
          ? { programId: currentCourse ? data.programId || '' : data.programId || undefined }
          : {}),
        roles: Array.isArray(data.roles) ? data.roles : undefined,
        aiLevel: Array.isArray(data.aiLevel) ? data.aiLevel : undefined,
        goals: Array.isArray(data.goals) ? data.goals : undefined,
        useAreas: Array.isArray(data.useAreas) ? data.useAreas : undefined,
        languageIds: Array.isArray(data.languageIds) ? data.languageIds : undefined,
        speakerIds: Array.isArray(data.speakerIds) ? data.speakerIds : undefined,
        marketData: marketDataStr,
        isBundle: data.isBundle ?? false,
        bundleCourseIds: data.isBundle && Array.isArray(data.bundleCourseIds) ? data.bundleCourseIds : [],
      };

      await Promise.all([
        ensureOptionsExist('level', [courseData.level]),
        ensureOptionsExist('role', courseData.roles || []),
        ensureOptionsExist('aiLevel', courseData.aiLevel || []),
        ensureOptionsExist('goal', courseData.goals || []),
        ensureOptionsExist('useArea', courseData.useAreas || []),
      ]);

      if (!currentCourse && Array.isArray(pendingModules) && pendingModules.length > 0 && !data.isBundle) {
        courseData.modules = pendingModules.map((mod) => ({
          title: mod.title || '',
          description: mod.description || undefined,
          sortOrder: mod.sortOrder,
          sections: (mod.sections || []).map((sec) => ({
            title: sec.title || '',
            videoUrl: sec.videoUrl || undefined,
            description: sec.description || undefined,
            content: sec.content || undefined,
            watchtime: sec.watchtime || undefined,
            durationTime: sec.durationTime || undefined,
            images: Array.isArray(sec.images) ? sec.images : undefined,
            sortOrder: sec.sortOrder,
          })),
        }));
      }

      const imageFile = imageDeleted ? null : selectedFile || undefined;

      if (currentCourse) {
        await dispatch(
          updateCourse({
            id: currentCourse.id,
            courseData,
            imageFile,
          })
        ).unwrap();
        toast.success('Course updated successfully!');
        router.push(paths.admin.course.list);
      } else {
        const created = await dispatch(
          createCourse({
            courseData,
            imageFile,
          })
        ).unwrap();
        toast.success('Course created successfully!');
        router.push(paths.admin.course.list);
      }
    } catch (error) {
      const errorMessage = error || 'Failed to save course';
      toast.error(errorMessage);
      console.error('Error saving course:', error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12}>
          <Stack spacing={3}>
            {/* Course basics */}
            <Card sx={cardSx}>
              <CardHeader
                title={isEdit ? 'Edit course' : 'Create course'}
                subheader="Title, group, pricing, cover image, and rich-text description for the catalog."
                sx={{ px: 3, pt: 3, pb: 0, alignItems: 'flex-start' }}
                action={
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: 'primary.main',
                    }}
                  >
                    <SvgColor
                      src={`${CONFIG.site.basePath}/assets/icons/navbar/ic-course.svg`}
                      sx={{ width: 28, height: 28, color: 'primary.main' }}
                    />
                  </Box>
                }
              />
              <Divider sx={{ mx: 3, my: 2 }} />
              <Grid container spacing={2} sx={{ px: 3, pb: 3 }}>
                <Grid xs={12} md={6}>
                  <Field.Text name="title" label="Title" required />
                </Grid>
                <Grid xs={12} md={6}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flexGrow: 1 }}>
                      <Field.Autocomplete
                        name="level"
                        label="Level"
                        freeSolo
                        options={dynamicOptions.levels}
                        getOptionLabel={(option) => option || ''}
                        isOptionEqualToValue={(option, value) => option === value}
                        placeholder="Select level..."
                        onOpen={() => ensureOptionTypeLoaded('level')}
                      />
                    </Box>
                    <IconButton
                      color="primary"
                      sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.32)}` }}
                      onClick={() => openOptionDialog('level', 'level', 'Add level')}
                    >
                      <Iconify icon="solar:add-circle-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Grid>
                <Grid xs={12} md={watch('isBundle') ? 12 : 6}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flexGrow: 1 }}>
                      <Field.Autocomplete
                        name="categoryId"
                        label="Category"
                        loading={categoriesLoading}
                        options={(categories || []).map((c) => c.id)}
                        getOptionLabel={(option) =>
                          categories.find((c) => c.id === option)?.title || option || ''
                        }
                        isOptionEqualToValue={(option, value) => option === value}
                        placeholder="Select category..."
                        onOpen={() => ensureCategoriesLoaded()}
                      />
                    </Box>
                    <IconButton
                      color="primary"
                      sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.32)}` }}
                      onClick={() => router.push(paths.admin.category.new)}
                    >
                      <Iconify icon="solar:add-circle-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Grid>
                {!watch('isBundle') && (
                  <Grid xs={12} md={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ flexGrow: 1 }}>
                        <Field.Autocomplete
                          name="programId"
                          label="Program"
                          loading={programsLoading}
                          options={(programs || []).map((p) => p.id)}
                          getOptionLabel={(option) =>
                            programs.find((p) => p.id === option)?.title || option || ''
                          }
                          isOptionEqualToValue={(option, value) => option === value}
                          placeholder="Select program..."
                          onOpen={() => ensureProgramsLoaded()}
                        />
                      </Box>
                      <IconButton
                        color="primary"
                        sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.32)}` }}
                        onClick={openProgramDrawer}
                      >
                        <Iconify icon="solar:add-circle-bold" width={18} />
                      </IconButton>
                    </Stack>
                  </Grid>
                )}
                <Grid xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flexGrow: 1 }}>
                      <Field.Autocomplete
                        name="roles"
                        label="Roles"
                        multiple
                        freeSolo
                        disableCloseOnSelect
                        options={dynamicOptions.roles}
                        getOptionLabel={(option) => option || ''}
                        isOptionEqualToValue={(option, value) => option === value}
                        filterSelectedOptions
                        placeholder="Select target roles..."
                        onOpen={() => ensureOptionTypeLoaded('role')}
                      />
                    </Box>
                    <IconButton
                      color="primary"
                      sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.32)}` }}
                      onClick={() => openOptionDialog('role', 'roles', 'Add role')}
                    >
                      <Iconify icon="solar:add-circle-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Grid>
                <Grid xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flexGrow: 1 }}>
                      <Field.Autocomplete
                        name="aiLevel"
                        label="AI Level"
                        multiple
                        freeSolo
                        disableCloseOnSelect
                        options={dynamicOptions.aiLevels}
                        getOptionLabel={(option) => option || ''}
                        isOptionEqualToValue={(option, value) => option === value}
                        filterSelectedOptions
                        placeholder="Select matching AI levels..."
                        onOpen={() => ensureOptionTypeLoaded('aiLevel')}
                      />
                    </Box>
                    <IconButton
                      color="primary"
                      sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.32)}` }}
                      onClick={() => openOptionDialog('aiLevel', 'aiLevel', 'Add AI level')}
                    >
                      <Iconify icon="solar:add-circle-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Grid>
                <Grid xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flexGrow: 1 }}>
                      <Field.Autocomplete
                        name="goals"
                        label="Goals"
                        multiple
                        freeSolo
                        disableCloseOnSelect
                        options={dynamicOptions.goals}
                        getOptionLabel={(option) => option || ''}
                        isOptionEqualToValue={(option, value) => option === value}
                        filterSelectedOptions
                        placeholder="Select course goals..."
                        onOpen={() => ensureOptionTypeLoaded('goal')}
                      />
                    </Box>
                    <IconButton
                      color="primary"
                      sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.32)}` }}
                      onClick={() => openOptionDialog('goal', 'goals', 'Add goal')}
                    >
                      <Iconify icon="solar:add-circle-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Grid>
                <Grid xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flexGrow: 1 }}>
                      <Field.Autocomplete
                        name="useAreas"
                        label="Use Areas"
                        multiple
                        freeSolo
                        disableCloseOnSelect
                        options={dynamicOptions.useAreas}
                        getOptionLabel={(option) => option || ''}
                        isOptionEqualToValue={(option, value) => option === value}
                        filterSelectedOptions
                        placeholder="Select course use areas..."
                        onOpen={() => ensureOptionTypeLoaded('useArea')}
                      />
                    </Box>
                    <IconButton
                      color="primary"
                      sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.32)}` }}
                      onClick={() => openOptionDialog('useArea', 'useAreas', 'Add use area')}
                    >
                      <Iconify icon="solar:add-circle-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Grid>

                
                <Grid xs={12} md={4}>
                  <Field.Switch name="freeOrPaid" label="Paid course" />
                </Grid>
                {freeOrPaid && (
                  <Grid xs={12} md={4}>
                    <Field.Text
                      name="amount"
                      label="Price (SGD)"
                      type="number"
                      inputProps={{ step: '0.01', min: 0 }}
                      placeholder="e.g. 99.00"
                    />
                  </Grid>
                )}

                <Grid xs={12}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.28)}`,
                      background: `linear-gradient(
                        120deg,
                        ${alpha(theme.palette.secondary.main, 0.09)} 0%,
                        ${alpha(theme.palette.primary.main, 0.05)} 55%,
                        ${alpha(theme.palette.grey[500], 0.04)} 100%
                      )`,
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }} sx={{ mb: isBundle ? 2 : 0 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.5,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.secondary.main, 0.16),
                          color: 'secondary.dark',
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.28)}`,
                        }}
                      >
                        <Iconify icon="solar:layers-bold" width={26} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                          Course bundle
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, mb: 1 }}>
                          Turn this product into a bundle: learners who purchase or enroll here get access to every
                          selected course below—no second checkout for those programs.
                        </Typography>
                        <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.25, color: 'text.secondary', typography: 'caption' }}>
                          <li>Modules for this row are hidden; content lives on the included courses.</li>
                          <li>Inner courses can stay “paid” in the catalog; bundle ownership unlocks them.</li>
                        </Stack>
                      </Box>
                    </Stack>
                    <Divider sx={{ borderStyle: 'dashed', my: 2 }} />
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid xs={12} sm={6} md={4}>
                        <Field.Switch name="isBundle" label="Enable bundle" />
                      </Grid>
                      {isBundle && (
                        <Grid xs={12}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 1.5,
                              bgcolor: 'background.paper',
                              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                              boxShadow: theme.customShadows?.z4 ?? theme.shadows[4],
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                              Programs in this bundle
                            </Typography>
                            <Field.Autocomplete
                              name="bundleCourseIds"
                              label="Select courses"
                              multiple
                              disableCloseOnSelect
                              loading={coursesCatalogLoading}
                              options={coursesCatalog
                                .filter((c) => c.id && c.id !== currentCourse?.id)
                                .map((c) => c.id)}
                              getOptionLabel={(option) =>
                                coursesCatalog.find((c) => c.id === option)?.title || option
                              }
                              isOptionEqualToValue={(option, value) => option === value}
                              filterSelectedOptions
                              placeholder="Search and add courses…"
                              onOpen={() => ensureCoursesCatalogLoaded()}
                            />
                            <Alert severity="info" variant="outlined" sx={{ mt: 2, py: 0.75 }} icon={<Iconify icon="solar:info-circle-bold" width={20} />}>
                              Order follows your selection. Save the course to apply changes on the learning site.
                            </Alert>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Grid>

                <Grid xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }} icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                    Use the toolbar for <strong>bold</strong>, lists, and links. This appears on the public course page
                    (plain-text parts are used for short previews).
                  </Alert>
                  <Alert
                    severity="success"
                    variant="outlined"
                    sx={{ mb: 2 }}
                    icon={<Iconify icon="solar:list-check-bold" width={22} />}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Suggested format (bullet points)
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                      <li>What this course covers</li>
                      <li>Who this course is for</li>
                      <li>3-5 key learning outcomes</li>
                      <li>Prerequisites (if any)</li>
                    </Box>
                  </Alert>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Description
                  </Typography>
                  <Field.Editor
                    name="description"
                    placeholder="• What this course covers&#10;• Who this course is for&#10;• Key outcomes&#10;• Prerequisites"
                    fullItem={false}
                    onUploadImage={handleEditorMediaUpload}
                  />
                </Grid>

                <Grid xs={12}>
                  <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>
                    Cover image
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                    Recommended 16:9. JPG, PNG, GIF, or WEBP — max 5 MB.
                  </Typography>
                  <Upload
                    coverPreview
                    value={selectedFile || previewImage}
                    onDrop={handleDropImage}
                    onDelete={handleDeleteImage}
                    maxSize={5 * 1024 * 1024}
                    accept={{
                      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                    }}
                  />
                </Grid>
              </Grid>
            </Card>

            {!isBundle && (
              <CourseModulesCard
                courseId={currentCourse?.id ?? null}
                pendingModules={pendingModules}
                onPendingModulesChange={setPendingModules}
              />
            )}

            {/* Learning & instructors */}
            <Card sx={cardSx}>
              <CardHeader
                title="Learning & instructors"
                subheader="Speakers, languages, and optional CPE / lesson metadata."
                sx={{ px: 3, pt: 3, pb: 0 }}
              />
              <Divider sx={{ mx: 3, my: 2 }} />
              <Grid container spacing={2} sx={{ px: 3, pb: 3 }}>
                <Grid xs={12} md={3}>
                  <Field.Autocomplete
                    name="speakerIds"
                    label="Speakers"
                    multiple
                    disableCloseOnSelect
                    loading={speakersLoading}
                    options={(speakers || []).map((s) => s.id)}
                    getOptionLabel={(option) =>
                      speakers.find((s) => s.id === option)?.name || option
                    }
                    isOptionEqualToValue={(option, value) => option === value}
                    filterSelectedOptions
                    placeholder="Search speakers..."
                    onOpen={() => ensureSpeakersLoaded()}
                  />
                </Grid>

                <Grid xs={12} md={3}>
                  <Field.Autocomplete
                    name="languageIds"
                    label="Languages"
                    multiple
                    disableCloseOnSelect
                    loading={languagesLoading}
                    options={(languages || []).map((l) => l.id)}
                    getOptionLabel={(option) =>
                      languages.find((l) => l.id === option)?.title || option
                    }
                    isOptionEqualToValue={(option, value) => option === value}
                    filterSelectedOptions
                    placeholder="Search and select languages..."
                    onOpen={() => ensureLanguagesLoaded()}
                  />
                </Grid>

                <Grid xs={12} md={3}>
                  <Field.Text
                    name="cpeHours"
                    label="CPE hours"
                    type="number"
                    inputProps={{ step: '0.5', min: 0 }}
                    placeholder="e.g. 2"
                  />
                </Grid>

                <Grid xs={12} md={3}>
                  <Field.Text
                    name="lessonCount"
                    label="Lesson count"
                    type="number"
                    inputProps={{ step: 1, min: 0 }}
                    placeholder="e.g. 10"
                  />
                </Grid>
              </Grid>
            </Card>

            {isEdit && currentCourse?.id && (
              <CourseQuestionBankPanel courseId={currentCourse.id} />
            )}

            <Card
              sx={{
                ...cardSx,
                p: 2,
                position: 'sticky',
                bottom: 16,
                zIndex: (t) => t.zIndex.appBar - 1,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Button
                  size="large"
                  color="inherit"
                  variant="outlined"
                  startIcon={<Iconify icon="eva:arrow-back-fill" />}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>

                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={isSubmitting}
                  size="large"
                  startIcon={<Iconify icon={isEdit ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
                >
                  {isEdit ? 'Update course' : 'Create course'}
                </LoadingButton>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
      <Drawer anchor="right" open={optionDialog.open} onClose={closeOptionDialog}>
        <Box sx={{ width: { xs: 320, sm: 380 }, p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">{optionDialog.title}</Typography>
            <IconButton onClick={closeOptionDialog} size="small">
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Add a new value to this list. It will be available for all courses.
          </Typography>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            label="Name"
            placeholder="Enter value..."
            value={optionDialog.value}
            onChange={(e) =>
              setOptionDialog((prev) => ({
                ...prev,
                value: e.target.value,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateOptionFromDialog();
              }
            }}
          />
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Existing values
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search values..."
            value={optionSearch}
            onChange={(e) => setOptionSearch(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Box
            sx={{
              maxHeight: 260,
              overflowY: 'auto',
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              borderRadius: 1.5,
              p: 1,
              bgcolor: 'background.neutral',
            }}
          >
            {optionRowsLoading ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', px: 1, py: 0.5 }}>
                Loading...
              </Typography>
            ) : filteredOptionRows.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', px: 1, py: 0.5 }}>
                No values found
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {filteredOptionRows.map((row, idx) => {
                  const isEditing = editingOptionId === row.id;
                  return (
                    <Stack
                      key={row.id}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderRadius: 1,
                        bgcolor: isEditing ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ minWidth: 28, color: 'text.secondary', fontWeight: 700 }}
                      >
                        {idx + 1}.
                      </Typography>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          value={editingOptionValue}
                          onChange={(e) => setEditingOptionValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditOption();
                            }
                          }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {row.label}
                        </Typography>
                      )}
                      {isEditing ? (
                        <>
                          <IconButton size="small" color="primary" onClick={handleSaveEditOption}>
                            <Iconify icon="solar:check-circle-bold" width={18} />
                          </IconButton>
                          <IconButton size="small" onClick={handleCancelEditOption}>
                            <Iconify icon="solar:close-circle-bold" width={18} />
                          </IconButton>
                        </>
                      ) : (
                        <Stack direction="row" spacing={0.25}>
                          <IconButton size="small" onClick={() => handleStartEditOption(row)}>
                            <Iconify icon="solar:pen-bold" width={17} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteOption(row)}>
                            <Iconify icon="solar:trash-bin-trash-bold" width={17} />
                          </IconButton>
                        </Stack>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Box>
          <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ mt: 2.5 }}>
            <Button onClick={closeOptionDialog} disabled={addingOption}>
              Cancel
            </Button>
            <LoadingButton loading={addingOption} variant="contained" onClick={handleCreateOptionFromDialog}>
              Add
            </LoadingButton>
          </Stack>
        </Box>
      </Drawer>
      <Drawer anchor="right" open={programDrawerOpen} onClose={closeProgramDrawer}>
        <Box sx={{ width: { xs: 320, sm: 380 }, p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Manage programs</Typography>
            <IconButton onClick={closeProgramDrawer} size="small">
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Add, edit, or remove programs. Link courses to a program from this form.
          </Typography>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            label="Program name"
            placeholder="e.g. AI Fluency Track"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateProgramFromDrawer();
              }
            }}
          />
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Existing programs
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search programs..."
            value={programSearch}
            onChange={(e) => setProgramSearch(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Box
            sx={{
              maxHeight: 260,
              overflowY: 'auto',
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              borderRadius: 1.5,
              p: 1,
              bgcolor: 'background.neutral',
            }}
          >
            {programRowsLoading ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', px: 1, py: 0.5 }}>
                Loading...
              </Typography>
            ) : filteredProgramRows.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', px: 1, py: 0.5 }}>
                No programs found
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {filteredProgramRows.map((row, idx) => {
                  const isEditing = editingProgramId === row.id;
                  return (
                    <Stack
                      key={row.id}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderRadius: 1,
                        bgcolor: isEditing ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ minWidth: 28, color: 'text.secondary', fontWeight: 700 }}
                      >
                        {idx + 1}.
                      </Typography>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          value={editingProgramValue}
                          onChange={(e) => setEditingProgramValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditProgram();
                            }
                          }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {row.title}
                        </Typography>
                      )}
                      {isEditing ? (
                        <>
                          <IconButton size="small" color="primary" onClick={handleSaveEditProgram}>
                            <Iconify icon="solar:check-circle-bold" width={18} />
                          </IconButton>
                          <IconButton size="small" onClick={handleCancelEditProgram}>
                            <Iconify icon="solar:close-circle-bold" width={18} />
                          </IconButton>
                        </>
                      ) : (
                        <Stack direction="row" spacing={0.25}>
                          <IconButton size="small" onClick={() => handleStartEditProgram(row)}>
                            <Iconify icon="solar:pen-bold" width={17} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteProgram(row)}>
                            <Iconify icon="solar:trash-bin-trash-bold" width={17} />
                          </IconButton>
                        </Stack>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Box>
          <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ mt: 2.5 }}>
            <Button onClick={closeProgramDrawer} disabled={addingProgram}>
              Cancel
            </Button>
            <LoadingButton loading={addingProgram} variant="contained" onClick={handleCreateProgramFromDrawer}>
              Add
            </LoadingButton>
          </Stack>
        </Box>
      </Drawer>
    </Form>
  );
}
