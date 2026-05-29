import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { appSettingsService } from 'src/services/app-settings.service';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import {
  buildCurriculumHeadline,
  CURRICULUM_COURSES_MAX,
  mapModulesForDisplay,
  normalizeCurriculumContent,
} from 'src/sections/home/curriculum-defaults';
import { CurriculumModulesList } from 'src/sections/home/curriculum-modules-list';
import { CurriculumAddCoursesDrawer } from './curriculum-add-courses-drawer';

// ----------------------------------------------------------------------

function buildLocalPreviewModules() {
  return [];
}

function estimateModuleCount(courseIds, courseCache) {
  return courseIds.reduce((sum, id) => {
    const count = Number(courseCache[id]?.modulesCount);
    return sum + (Number.isFinite(count) && count > 0 ? count : 1);
  }, 0);
}

export function CurriculumSettingsCard({
  curriculumContent,
  setCurriculumContent,
  curriculumContentSubmitting,
  onSave,
  maxCourses = CURRICULUM_COURSES_MAX,
}) {
  const [courseCache, setCourseCache] = useState({});
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [previewModules, setPreviewModules] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFromServer, setPreviewFromServer] = useState(false);
  const initialServerPreviewDone = useRef(false);
  const curriculumPreviewFetchRef = useRef(0);

  const content = normalizeCurriculumContent(curriculumContent);
  const selectedCourseIds = Array.isArray(content.courseIds) ? content.courseIds : [];
  const canAddMore = selectedCourseIds.length < maxCourses;

  const selectedCourseChips = useMemo(
    () =>
      selectedCourseIds.map((id) => ({
        id,
        title: courseCache[id]?.title || 'Course',
      })),
    [selectedCourseIds, courseCache]
  );

  const previewCourses = useMemo(
    () =>
      selectedCourseIds.map((id) => {
        const cached = courseCache[id];
        const count = Number(cached?.modulesCount);
        return {
          id,
          title: cached?.title || 'Course',
          modulesCount: Number.isFinite(count) ? Math.max(0, count) : 0,
        };
      }),
    [selectedCourseIds, courseCache]
  );

  const estimatedModuleCount = useMemo(
    () => estimateModuleCount(selectedCourseIds, courseCache),
    [selectedCourseIds, courseCache]
  );

  const previewHeadline = useMemo(
    () => buildCurriculumHeadline(estimatedModuleCount),
    [estimatedModuleCount]
  );

  const applyLocalPreview = useCallback(() => {
    setPreviewFromServer(false);
    setPreviewModules(buildLocalPreviewModules());
  }, []);

  const applyPreviewFromCurriculumData = useCallback(
    (data) => {
      if (!data) {
        applyLocalPreview();
        return;
      }

      setPreviewModules(mapModulesForDisplay(data?.modules));
      setPreviewFromServer(true);

      if (Array.isArray(data?.courses) && data.courses.length) {
        setCourseCache((prev) => {
          const next = { ...prev };
          data.courses.forEach((course) => {
            if (course?.id) {
              const modulesCount = Number(course?.modulesCount);
              next[course.id] = {
                ...prev[course.id],
                id: course.id,
                title: course.title || '',
                modulesCount: Number.isFinite(modulesCount)
                  ? Math.max(0, modulesCount)
                  : prev[course.id]?.modulesCount ?? 0,
                isBundle: false,
              };
            }
          });
          return next;
        });
      }
    },
    [applyLocalPreview]
  );

  const loadServerPreview = useCallback(async () => {
    if (!selectedCourseIds.length) {
      setPreviewModules([]);
      setPreviewFromServer(false);
      return;
    }

    const fetchId = curriculumPreviewFetchRef.current + 1;
    curriculumPreviewFetchRef.current = fetchId;

    try {
      setPreviewLoading(true);
      const data = await appSettingsService.getCurriculumContent();
      if (fetchId !== curriculumPreviewFetchRef.current) return;
      applyPreviewFromCurriculumData(data);
    } catch {
      if (fetchId === curriculumPreviewFetchRef.current) {
        applyLocalPreview();
      }
    } finally {
      if (fetchId === curriculumPreviewFetchRef.current) {
        setPreviewLoading(false);
      }
    }
  }, [selectedCourseIds.length, applyPreviewFromCurriculumData, applyLocalPreview]);

  useEffect(() => {
    applyLocalPreview();
  }, [applyLocalPreview]);

  useEffect(() => {
    if (initialServerPreviewDone.current) return;
    if (!selectedCourseIds.length) return;

    initialServerPreviewDone.current = true;
    loadServerPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when saved courses exist on first load
  }, [selectedCourseIds.length]);

  const handleConfirmCourses = (courses) => {
    const incoming = (courses || []).filter((c) => c?.id);
    if (!incoming.length) return;

    const existing = new Set(selectedCourseIds);
    const toAdd = incoming.filter((c) => !existing.has(c.id));
    if (!toAdd.length) {
      toast.error('Selected courses are already on the curriculum');
      return;
    }

    const room = maxCourses - selectedCourseIds.length;
    const accepted = toAdd.slice(0, room);
    if (accepted.length < toAdd.length) {
      toast.warning(`Only ${accepted.length} course(s) added (maximum ${maxCourses})`);
    }

    setCourseCache((prev) => {
      const next = { ...prev };
      accepted.forEach((course) => {
        next[course.id] = course;
      });
      return next;
    });

    setCurriculumContent((prev) =>
      normalizeCurriculumContent({
        ...normalizeCurriculumContent(prev),
        courseIds: [...selectedCourseIds, ...accepted.map((c) => c.id)],
      })
    );

    toast.success(
      accepted.length === 1
        ? '1 course added — click Save curriculum to publish'
        : `${accepted.length} courses added — click Save curriculum to publish`
    );
  };

  const handleRemoveCourse = (courseId) => {
    setCurriculumContent((prev) =>
      normalizeCurriculumContent({
        ...normalizeCurriculumContent(prev),
        courseIds: selectedCourseIds.filter((id) => id !== courseId),
      })
    );
  };

  const handleSaveCurriculum = async () => {
    try {
      setPreviewLoading(true);
      const curriculum = await onSave(content);
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
              Add courses in the side panel (no save until you click Save curriculum). Search in the
              drawer uses the course list API only while it is open.
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
                  Courses
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {selectedCourseIds.length} / {maxCourses} courses · ~{estimatedModuleCount}{' '}
                  module(s) estimated
                </Typography>
              </Stack>
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={() => setAddDrawerOpen(true)}
                disabled={curriculumContentSubmitting || !canAddMore}
              >
                Add courses
              </Button>
            </Stack>

            {selectedCourseChips.length === 0 ? (
              <Typography variant="body2" sx={{ py: 1, color: 'text.secondary' }}>
                No courses yet. Click Add courses to select one or more from the list.
              </Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {selectedCourseChips.map((course) => (
                  <Chip
                    key={course.id}
                    label={course.title}
                    onDelete={() => handleRemoveCourse(course.id)}
                    deleteIcon={<Iconify icon="mingcute:close-line" />}
                    disabled={curriculumContentSubmitting}
                    sx={{ maxWidth: '100%' }}
                  />
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

            {!previewFromServer && selectedCourseIds.length > 0 ? (
              <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
                Draft preview — expand a course to load its modules. Save curriculum to publish on
                the home page.
              </Typography>
            ) : null}

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
              {previewHeadline || 'Add courses to build the curriculum'}
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
                courses={previewCourses}
                courseIds={selectedCourseIds}
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

      <CurriculumAddCoursesDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        excludeIds={selectedCourseIds}
        maxCourses={maxCourses}
        currentCount={selectedCourseIds.length}
        submitting={curriculumContentSubmitting}
        onConfirm={handleConfirmCourses}
      />
    </>
  );
}
