import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/snackbar';
import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import {
  buildCurriculumHeadline,
  buildDraftPreviewCategories,
  CURRICULUM_CATEGORIES_MAX,
  mapModulesForDisplay,
  normalizeCurriculumContent,
} from 'src/sections/home/curriculum-defaults';
import { CurriculumModulesList } from 'src/sections/home/curriculum-modules-list';
import { appSettingsService } from 'src/services/app-settings.service';
import { CurriculumCategoryDrawer } from './curriculum-category-drawer';

// ----------------------------------------------------------------------

function getCourseIdsForCategory(categoryId, categoryCache, resolvedCategories, selectedCourseIds) {
  const selectedSet = new Set(selectedCourseIds);
  const fromCache = (categoryCache[categoryId]?.appliedCourseIds || []).filter((id) =>
    selectedSet.has(id)
  );
  if (fromCache.length) return fromCache;

  const resolved = (resolvedCategories || []).find((cat) => cat.id === categoryId);
  return (resolved?.courseIds || []).filter((id) => selectedSet.has(id));
}

function buildCategoryCourseIdsMap({
  selectedCategoryIds,
  selectedCourseIds,
  categoryCache,
  resolvedCategories,
}) {
  const map = {};
  selectedCategoryIds.forEach((categoryId) => {
    const ids = getCourseIdsForCategory(
      categoryId,
      categoryCache,
      resolvedCategories,
      selectedCourseIds
    );
    if (ids.length) map[categoryId] = ids;
  });
  return map;
}

export function CurriculumSettingsCard({
  curriculumContent,
  setCurriculumContent,
  curriculumContentSubmitting,
  onSave,
  maxCategories = CURRICULUM_CATEGORIES_MAX,
}) {
  const [categoryCache, setCategoryCache] = useState({});
  const [resolvedCurriculum, setResolvedCurriculum] = useState(null);
  const [curriculumHydrating, setCurriculumHydrating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState(null);
  const [previewModules, setPreviewModules] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const content = normalizeCurriculumContent(curriculumContent);
  const selectedCategoryIds = Array.isArray(content.categoryIds) ? content.categoryIds : [];
  const selectedCourseIds = Array.isArray(content.courseIds) ? content.courseIds : [];
  const canAddMore = selectedCategoryIds.length < maxCategories;
  const storedCategoryKey = selectedCategoryIds.join('|');

  const resolvedCategories = resolvedCurriculum?.categories || [];

  const categoryCourseIdsMap = useMemo(
    () =>
      buildCategoryCourseIdsMap({
        selectedCategoryIds,
        selectedCourseIds,
        categoryCache,
        resolvedCategories,
      }),
    [selectedCategoryIds, selectedCourseIds, categoryCache, resolvedCategories]
  );

  const selectedCategoryRows = useMemo(
    () =>
      selectedCategoryIds.map((id) => ({
        id,
        title: categoryCache[id]?.title || resolvedCategories.find((cat) => cat.id === id)?.title || 'Category',
        selectedCount: getCourseIdsForCategory(
          id,
          categoryCache,
          resolvedCategories,
          selectedCourseIds
        ).length,
      })),
    [selectedCategoryIds, categoryCache, resolvedCategories, selectedCourseIds]
  );

  const draftPreviewCategories = useMemo(
    () =>
      buildDraftPreviewCategories({
        categoryIds: selectedCategoryIds,
        categoryCache,
        selectedCourseIds,
      }),
    [selectedCategoryIds, categoryCache, selectedCourseIds]
  );

  const displayCourses = draftPreviewCategories.flatMap((cat) => cat.courses || []);
  const displayCourseIds = draftPreviewCategories.flatMap((cat) => cat.courseIds || []);

  const previewHeadline = useMemo(() => {
    const moduleCount =
      previewModules.length ||
      displayCourses.reduce((sum, course) => sum + (Number(course.modulesCount) || 0), 0);
    return buildCurriculumHeadline(moduleCount);
  }, [previewModules.length, displayCourses]);

  const applyPreviewFromCurriculumData = useCallback((data) => {
    if (!data) {
      setPreviewModules([]);
      return;
    }

    setPreviewModules(mapModulesForDisplay(data?.modules));

    if (Array.isArray(data?.categories)) {
      setCategoryCache((prev) => {
        const next = { ...prev };

        data.categories.forEach((category) => {
          if (!category?.id) return;

          const courseIds = Array.isArray(category.courseIds) ? category.courseIds : [];
          const courses = Array.isArray(category.courses) ? category.courses : [];

          next[category.id] = {
            id: category.id,
            title: category.title || prev[category.id]?.title || '',
            appliedCourseIds: courseIds,
            appliedCourses: courses.map((course) => ({
              id: course.id,
              title: course.title || '',
              modulesCount: Number(course.modulesCount) || 0,
              categoryId: category.id,
            })),
          };
        });

        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!storedCategoryKey) {
      setResolvedCurriculum(null);
      setCategoryCache({});
      setPreviewModules([]);
      return undefined;
    }

    let active = true;
    setCurriculumHydrating(true);

    (async () => {
      try {
        const data = await appSettingsService.getCurriculumContent();
        if (!active) return;
        setResolvedCurriculum(data);
        applyPreviewFromCurriculumData(data);
      } catch {
        if (active) setResolvedCurriculum(null);
      } finally {
        if (active) setCurriculumHydrating(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [storedCategoryKey, applyPreviewFromCurriculumData]);

  const openAddDrawer = () => {
    setDrawerCategory(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (row) => {
    setDrawerCategory({ id: row.id, title: row.title });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerCategory(null);
  };

  const handleApplyCategoryCourses = useCallback(
    ({ category, courseIds, appliedCourses, isNew }) => {
      if (!category?.id || !courseIds?.length) return;

      const prevForCategory = categoryCache[category.id]?.appliedCourseIds || [];
      const prevSet = new Set(prevForCategory);
      const withoutThisCategory = selectedCourseIds.filter((id) => !prevSet.has(id));

      setCategoryCache((prev) => ({
        ...prev,
        [category.id]: {
          ...category,
          appliedCourseIds: courseIds,
          appliedCourses: appliedCourses || [],
        },
      }));

      setCurriculumContent((prev) => {
        const normalized = normalizeCurriculumContent(prev);
        return normalizeCurriculumContent({
          ...normalized,
          categoryIds: isNew ? [...normalized.categoryIds, category.id] : normalized.categoryIds,
          courseIds: [...withoutThisCategory, ...courseIds],
        });
      });

      toast.success(
        isNew
          ? 'Category and courses added — click Save curriculum to store in database'
          : 'Courses updated — click Save curriculum to store in database'
      );
    },
    [categoryCache, selectedCourseIds, setCurriculumContent]
  );

  const handleRemoveCategory = useCallback(
    (categoryId) => {
      const prevForCategory =
        categoryCache[categoryId]?.appliedCourseIds ||
        getCourseIdsForCategory(categoryId, categoryCache, resolvedCategories, selectedCourseIds);
      const removeSet = new Set(prevForCategory);

      setCategoryCache((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });

      setCurriculumContent((prev) =>
        normalizeCurriculumContent({
          ...normalizeCurriculumContent(prev),
          categoryIds: selectedCategoryIds.filter((id) => id !== categoryId),
          courseIds: selectedCourseIds.filter((id) => !removeSet.has(id)),
        })
      );
    },
    [categoryCache, resolvedCategories, selectedCategoryIds, selectedCourseIds, setCurriculumContent]
  );

  const handleSaveCurriculum = async () => {
    const toSave = normalizeCurriculumContent(curriculumContent);

    if (toSave.categoryIds.length && !toSave.courseIds.length) {
      toast.error('Add at least one course for your categories');
      return;
    }

    try {
      setPreviewLoading(true);
      const curriculum = await onSave(toSave);
      setResolvedCurriculum(curriculum);
      applyPreviewFromCurriculumData(curriculum);
    } catch {
      // Parent shows error toast
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <>
      <Card sx={{ p: 3, overflow: 'hidden' }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5, ...HERO_TYPOGRAPHY.adminCardTitle }}>
              Curriculum
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              Use the side panel to add a category and pick courses. Changes are stored in the
              database only after you click Save curriculum.
            </Typography>
          </Box>

          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Section label"
              value={content.smallTitle}
              onChange={(event) =>
                setCurriculumContent((prev) =>
                  normalizeCurriculumContent({ ...prev, smallTitle: event.target.value })
                )
              }
              placeholder="Optional"
            />

            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Description</Typography>
              <Editor
                value={content.subtext || ''}
                onChange={(value) =>
                  setCurriculumContent((prev) =>
                    normalizeCurriculumContent({ ...prev, subtext: value })
                  )
                }
                placeholder="Write curriculum description..."
                editable
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 140,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  },
                }}
              />
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
            >
              <Stack spacing={0.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Categories
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {selectedCategoryIds.length} / {maxCategories} categories ·{' '}
                  {curriculumHydrating ? 'Loading saved courses…' : `${selectedCourseIds.length} course(s) selected`}
                </Typography>
              </Stack>
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={openAddDrawer}
                disabled={curriculumContentSubmitting || !canAddMore}
              >
                Add category
              </Button>
            </Stack>

            {selectedCategoryRows.length === 0 ? (
              <Typography variant="body2" sx={{ py: 1, color: 'text.secondary' }}>
                No categories yet. Click Add category to open the side panel.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {selectedCategoryRows.map((row) => (
                  <Box
                    key={row.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.neutral',
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        <Chip label={row.title} size="small" sx={{ maxWidth: '100%' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {curriculumHydrating ? '…' : row.selectedCount} course
                          {row.selectedCount === 1 ? '' : 's'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={curriculumContentSubmitting || curriculumHydrating}
                          onClick={() => openEditDrawer(row)}
                        >
                          Edit courses
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={curriculumContentSubmitting}
                          onClick={() => handleRemoveCategory(row.id)}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>

          <Box
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.neutral',
            }}
          >
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
              Home page preview
            </Typography>

            <Typography
              sx={{
                ...HERO_TYPOGRAPHY.caption,
                mb: 1,
                color: 'primary.main',
                textTransform: 'uppercase',
              }}
            >
              {content.smallTitle}
            </Typography>

            <Typography sx={{ ...HERO_TYPOGRAPHY.h3, mb: 1.5, fontWeight: 800 }}>
              {previewHeadline || 'Add a category and courses to build the curriculum'}
            </Typography>

            {content.subtext ? (
              <RichTextContent
                html={content.subtext}
                sx={{
                  ...HERO_TYPOGRAPHY.body,
                  color: 'text.secondary',
                  mb: 3,
                  lineHeight: 1.65,
                  '& p': { m: 0, mb: 1 },
                  '& p:last-child': { mb: 0 },
                }}
              />
            ) : null}

            {previewLoading ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Loading preview...
              </Typography>
            ) : (
              <CurriculumModulesList
                modules={previewModules}
                courses={displayCourses}
                courseIds={displayCourseIds}
                categories={draftPreviewCategories}
                categoryIds={selectedCategoryIds}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
            <LoadingButton
              variant="contained"
              loading={curriculumContentSubmitting || previewLoading}
              onClick={handleSaveCurriculum}
              sx={{ width: 'auto' }}
            >
              Save curriculum
            </LoadingButton>
          </Box>
        </Stack>
      </Card>

      <CurriculumCategoryDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        initialCategory={drawerCategory}
        selectedCategoryIds={selectedCategoryIds}
        selectedCourseIds={selectedCourseIds}
        categoryCourseIdsMap={categoryCourseIdsMap}
        disabled={curriculumContentSubmitting}
        maxCategories={maxCategories}
        onApply={handleApplyCategoryCourses}
      />
    </>
  );
}
