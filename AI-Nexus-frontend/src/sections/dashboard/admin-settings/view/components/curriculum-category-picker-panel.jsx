import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { Iconify } from 'src/components/iconify';
import {
  CURRICULUM_COURSES_MAX,
  CURRICULUM_CATEGORIES_MAX,
} from 'src/sections/home/curriculum-defaults';
import { useCurriculumCategorySearch } from './use-curriculum-category-search';
import { useCategoryCourseList } from './use-category-course-list';

// ----------------------------------------------------------------------

function formatCourseWithModuleCount(title, modulesCount) {
  const name = String(title || '').trim() || 'Course';
  const count = Number.isFinite(modulesCount) ? Math.max(0, Math.floor(modulesCount)) : 0;
  return `${name} (${count} module${count === 1 ? '' : 's'})`;
}

export function CurriculumCategoryPickerPanel({
  selectedCategoryIds = [],
  selectedCourseIds = [],
  categoryCourseIdsMap = {},
  initialCategory = null,
  disabled = false,
  enabled = true,
  maxCategories = CURRICULUM_CATEGORIES_MAX,
  onApply,
  onClose,
}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [pickerCategory, setPickerCategory] = useState(null);
  const [draftCourseIds, setDraftCourseIds] = useState([]);
  const [draftCourseMeta, setDraftCourseMeta] = useState({});

  const canAddMore = selectedCategoryIds.length < maxCategories;
  const isEditingExisting = activeCategory?.id && selectedCategoryIds.includes(activeCategory.id);

  const {
    options,
    inputValue,
    loading: categoriesLoading,
    loadingMore: categoriesLoadingMore,
    hasNextPage: categoriesHasNextPage,
    open: listOpen,
    setOpen: setListOpen,
    handleInputChange,
    handleListboxScroll,
    clearInput,
  } = useCurriculumCategorySearch({
    excludeIds: isEditingExisting ? [] : selectedCategoryIds,
    enabled,
  });

  const {
    courses,
    search: courseSearch,
    setSearchTerm: setCourseSearch,
    loading: coursesLoading,
    loadingMore: coursesLoadingMore,
    hasNextPage: coursesHasNextPage,
    handleListScroll: handleCourseListScroll,
  } = useCategoryCourseList({
    categoryId: activeCategory?.id || '',
    enabled: enabled && Boolean(activeCategory?.id),
  });

  const filteredOptions = useMemo(() => {
    if (!isEditingExisting) return options;
    return options.filter(
      (opt) => opt.id === activeCategory?.id || !selectedCategoryIds.includes(opt.id)
    );
  }, [options, isEditingExisting, activeCategory?.id, selectedCategoryIds]);

  useEffect(() => {
    if (!initialCategory?.id) {
      setActiveCategory(null);
      setPickerCategory(null);
      setDraftCourseIds([]);
      setDraftCourseMeta({});
      clearInput();
      return;
    }

    setActiveCategory({
      id: initialCategory.id,
      title: initialCategory.title || 'Category',
    });
    setPickerCategory(null);
    clearInput();
    setListOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when drawer opens for edit
  }, [initialCategory?.id]);

  useEffect(() => {
    if (!activeCategory?.id) {
      setDraftCourseIds([]);
      setDraftCourseMeta({});
      return;
    }

    const savedIds = categoryCourseIdsMap[activeCategory.id];
    if (Array.isArray(savedIds)) {
      setDraftCourseIds(savedIds);
      return;
    }

    if (isEditingExisting) {
      setDraftCourseIds([]);
    }
  }, [activeCategory?.id, categoryCourseIdsMap, isEditingExisting]);

  useEffect(() => {
    if (!activeCategory?.id || !courses.length) return;

    setDraftCourseMeta((prev) => {
      const next = { ...prev };
      courses.forEach((course) => {
        if (course?.id) next[course.id] = course;
      });
      return next;
    });
  }, [activeCategory?.id, courses]);

  const handlePickCategory = (_, category) => {
    if (!category?.id) return;
    setPickerCategory(null);
    clearInput();
    setListOpen(false);
    setActiveCategory({ id: category.id, title: category.title || 'Category' });
    setDraftCourseIds([]);
    setDraftCourseMeta({});
  };

  const handleChangeCategory = () => {
    setActiveCategory(null);
    setPickerCategory(null);
    setDraftCourseIds([]);
    setDraftCourseMeta({});
    clearInput();
  };

  const draftSet = useMemo(() => new Set(draftCourseIds), [draftCourseIds]);

  const prevCourseIdsForCategory = useMemo(
    () => categoryCourseIdsMap[activeCategory?.id] || [],
    [categoryCourseIdsMap, activeCategory?.id]
  );

  const otherCourseIds = useMemo(() => {
    const prevSet = new Set(prevCourseIdsForCategory);
    return selectedCourseIds.filter((id) => !prevSet.has(id));
  }, [selectedCourseIds, prevCourseIdsForCategory]);

  const slotsLeft = Math.max(0, CURRICULUM_COURSES_MAX - otherCourseIds.length);

  const handleToggleCourse = (course, checked) => {
    const courseId = course.id;
    setDraftCourseMeta((prev) => {
      const next = { ...prev };
      if (checked) next[courseId] = course;
      else delete next[courseId];
      return next;
    });
    setDraftCourseIds((prev) => {
      if (checked) {
        if (prev.includes(courseId)) return prev;
        return [...prev, courseId].slice(0, slotsLeft);
      }
      return prev.filter((id) => id !== courseId);
    });
  };

  const handleSelectAll = () => {
    const ids = courses.map((c) => c.id).filter(Boolean);
    const merged = [...draftCourseIds];
    const seen = new Set(merged);
    const meta = { ...draftCourseMeta };
    courses.forEach((course) => {
      if (!seen.has(course.id) && merged.length < slotsLeft) {
        seen.add(course.id);
        merged.push(course.id);
        meta[course.id] = course;
      }
    });
    setDraftCourseMeta(meta);
    setDraftCourseIds(merged);
  };

  const handleClearCourses = () => {
    setDraftCourseIds([]);
    setDraftCourseMeta({});
  };

  const handleApply = () => {
    if (!activeCategory?.id || !draftCourseIds.length) return;

    const appliedCourses = draftCourseIds.map((id) => {
      const meta = draftCourseMeta[id];
      return meta
        ? { id, title: meta.title, modulesCount: meta.modulesCount, categoryId: activeCategory.id }
        : { id, title: 'Course', modulesCount: 0, categoryId: activeCategory.id };
    });

    onApply?.({
      category: activeCategory,
      courseIds: draftCourseIds,
      appliedCourses,
      isNew: !selectedCategoryIds.includes(activeCategory.id),
    });
  };

  const showCategoryPicker = canAddMore && !activeCategory && !initialCategory?.id;
  const canApply = Boolean(activeCategory?.id && draftCourseIds.length);

  return (
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {initialCategory?.id
          ? 'Update which courses appear under this category on the home page.'
          : 'Select a category, then choose courses from the list below.'}
      </Typography>

      {showCategoryPicker ? (
        <Autocomplete
          fullWidth
          open={listOpen}
          onOpen={() => setListOpen(true)}
          onClose={() => setListOpen(false)}
          disabled={disabled}
          value={pickerCategory}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onChange={handlePickCategory}
          options={filteredOptions}
          loading={categoriesLoading}
          filterOptions={(items) => items}
          getOptionLabel={(option) => option?.title || ''}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          noOptionsText={
            categoriesLoading
              ? 'Loading categories...'
              : inputValue.trim()
                ? 'No categories found'
                : 'Search and select a category'
          }
          ListboxProps={{
            onScroll: handleListboxScroll,
            sx: { maxHeight: 240 },
          }}
          slotProps={{
            popper: { sx: { zIndex: (theme) => theme.zIndex.modal + 2 } },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Category"
              placeholder="Search category..."
              helperText={[
                `${selectedCategoryIds.length} / ${maxCategories} added`,
                categoriesLoadingMore ? 'Loading more…' : null,
                !categoriesLoading && categoriesHasNextPage ? 'Scroll for more' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
        />
      ) : null}

      {activeCategory ? (
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {activeCategory.title}
            </Typography>
            {!initialCategory?.id ? (
              <Button size="small" color="inherit" onClick={handleChangeCategory} disabled={disabled}>
                Change category
              </Button>
            ) : null}
          </Stack>

          <TextField
            fullWidth
            size="small"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            placeholder="Search courses..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={20} sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={disabled || coursesLoading || !courses.length}
              onClick={handleSelectAll}
            >
              Select all on page
            </Button>
            <Button
              size="small"
              color="inherit"
              variant="outlined"
              disabled={disabled || draftCourseIds.length === 0}
              onClick={handleClearCourses}
            >
              Clear
            </Button>
          </Stack>

          {coursesLoading ? (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading courses...
              </Typography>
            </Stack>
          ) : null}

          {!coursesLoading && courses.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No courses in this category.
            </Typography>
          ) : null}

          {!coursesLoading && courses.length > 0 ? (
            <Stack
              spacing={0.5}
              onScroll={handleCourseListScroll}
              sx={{
                flex: 1,
                minHeight: 120,
                maxHeight: 'calc(100vh - 320px)',
                overflow: 'auto',
                px: 0.5,
              }}
            >
              {courses.map((course) => {
                const checked = draftSet.has(course.id);
                const label = formatCourseWithModuleCount(course.title, course.modulesCount);

                return (
                  <Box
                    key={course.id}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onClick={() => {
                      if (disabled) return;
                      handleToggleCourse(course, !checked);
                    }}
                    onKeyDown={(event) => {
                      if (disabled) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleToggleCourse(course, !checked);
                      }
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      py: 0.75,
                      px: 0.5,
                      borderRadius: 1,
                      cursor: disabled ? 'default' : 'pointer',
                      opacity: disabled ? 0.6 : 1,
                      '&:hover': disabled
                        ? {}
                        : {
                            bgcolor: 'action.hover',
                          },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={checked}
                      disabled={disabled}
                      tabIndex={-1}
                      disableRipple
                      sx={{
                        p: 0.25,
                        mt: 0.1,
                        flexShrink: 0,
                      }}
                      onChange={(event) => {
                        event.stopPropagation();
                        handleToggleCourse(course, event.target.checked);
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        pt: 0.35,
                        lineHeight: 1.5,
                        userSelect: 'none',
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                );
              })}

              {coursesLoadingMore ? (
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ py: 1.5 }}>
                  <CircularProgress size={18} />
                  <Typography variant="caption" color="text.secondary">
                    Loading more…
                  </Typography>
                </Stack>
              ) : null}

              {!coursesLoadingMore && coursesHasNextPage ? (
                <Typography variant="caption" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                  Scroll for more courses
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="flex-end"
        sx={{
          pt: 2,
          mt: 'auto',
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={disabled}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          disabled={disabled || !canApply}
          onClick={handleApply}
        >
          {isEditingExisting ? 'Update courses' : 'Add to curriculum'}
        </LoadingButton>
      </Stack>
    </Stack>
  );
}
