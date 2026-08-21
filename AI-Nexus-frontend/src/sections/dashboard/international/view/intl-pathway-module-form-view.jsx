import { z as zod } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { intlPathwayService } from 'src/services/intl-pathway.service';

// ----------------------------------------------------------------------

const Schema = zod.object({
  code: zod.string().min(1, 'Code is required'),
  title: zod.string().min(1, 'Title is required'),
  pillar: zod.string().min(1, 'Pillar is required'),
  minutes: zod.coerce.number().min(0),
  videoUrl: zod.string().optional().or(zod.literal('')),
  courseId: zod.string().optional().or(zod.literal('')),
  moduleId: zod.string().optional().or(zod.literal('')),
  sectionId: zod.string().optional().or(zod.literal('')),
  bulletsText: zod.string().optional(),
  sortOrder: zod.coerce.number().optional(),
  deleted: zod.boolean().optional(),
});

export function IntlPathwayModuleFormView({ currentModule }) {
  const router = useRouter();
  const isEdit = Boolean(currentModule?.id);
  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);

  const defaultValues = useMemo(
    () => ({
      code: currentModule?.code || '',
      title: currentModule?.title || '',
      pillar: currentModule?.pillar || '01',
      minutes: currentModule?.minutes ?? 0,
      videoUrl: currentModule?.videoUrl || '',
      courseId: currentModule?.courseId || '',
      moduleId: currentModule?.moduleId || '',
      sectionId: currentModule?.sectionId || '',
      bulletsText: Array.isArray(currentModule?.bullets)
        ? currentModule.bullets.join('\n')
        : '',
      sortOrder: currentModule?.sortOrder ?? 0,
      deleted: currentModule?.deleted ?? false,
    }),
    [currentModule]
  );

  const methods = useForm({
    resolver: zodResolver(Schema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    let active = true;
    setLoadingTree(true);
    intlPathwayService
      .getCourseTree()
      .then((rows) => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setTree(list);

        const currentTitle = String(currentModule?.title || '').trim().toLowerCase();
        const currentVideo = String(currentModule?.videoUrl || '').trim();

        for (const course of list) {
          for (const mod of course.modules || []) {
            for (const section of mod.sections || []) {
              const matchVideo = currentVideo && section.videoUrl === currentVideo;
              const matchTitle =
                currentTitle &&
                String(section.title || '')
                  .trim()
                  .toLowerCase() === currentTitle;
              if (matchVideo || matchTitle) {
                setValue('courseId', course.courseId);
                setValue('moduleId', mod.moduleId);
                setValue('sectionId', section.sectionId);
                if (!currentVideo && section.videoUrl) {
                  setValue('videoUrl', section.videoUrl);
                }
                return;
              }
            }
          }
        }
      })
      .catch(() => {
        if (active) setTree([]);
      })
      .finally(() => {
        if (active) setLoadingTree(false);
      });
    return () => {
      active = false;
    };
  }, [currentModule, setValue]);

  const deleted = watch('deleted');
  const courseId = watch('courseId');
  const moduleId = watch('moduleId');
  const sectionId = watch('sectionId');
  const videoUrl = watch('videoUrl');
  const title = watch('title');

  const selectedCourse = useMemo(
    () => tree.find((c) => c.courseId === courseId) || null,
    [tree, courseId]
  );

  const moduleOptions = useMemo(
    () => selectedCourse?.modules || [],
    [selectedCourse]
  );

  const selectedModule = useMemo(
    () => moduleOptions.find((m) => m.moduleId === moduleId) || null,
    [moduleOptions, moduleId]
  );

  const sectionOptions = useMemo(
    () => selectedModule?.sections || [],
    [selectedModule]
  );

  const selectedSection = useMemo(
    () => sectionOptions.find((s) => s.sectionId === sectionId) || null,
    [sectionOptions, sectionId]
  );

  const applySection = (course, mod, section, existingCode) => {
    if (!section) return;
    setValue('title', section.title, { shouldValidate: true, shouldDirty: true });
    setValue('videoUrl', section.videoUrl || '', { shouldValidate: true, shouldDirty: true });
    if (course?.pillar) setValue('pillar', course.pillar, { shouldDirty: true });
    if (section.minutes != null && Number(section.minutes) > 0) {
      setValue('minutes', Number(section.minutes), { shouldDirty: true });
    }
    // Suggest pathway code from pillar + section order within course tree
    if (!isEdit || !String(existingCode || '').trim()) {
      const pillar = course?.pillar || '01';
      let idx = 0;
      for (const c of tree) {
        if (c.pillar !== pillar) continue;
        for (const m of c.modules || []) {
          for (const s of m.sections || []) {
            if (s.sectionId === section.sectionId) {
              setValue('code', `${pillar}-${String(idx).padStart(2, '0')}`, {
                shouldDirty: true,
                shouldValidate: true,
              });
              return;
            }
            idx += 1;
          }
        }
      }
    }
  };

  const handleCourseChange = (nextCourseId) => {
    setValue('courseId', nextCourseId, { shouldDirty: true });
    setValue('moduleId', '');
    setValue('sectionId', '');
    setValue('videoUrl', '');
  };

  const handleModuleChange = (nextModuleId) => {
    setValue('moduleId', nextModuleId, { shouldDirty: true });
    setValue('sectionId', '');
    setValue('videoUrl', '');
  };

  const handleSectionChange = (nextSectionId) => {
    setValue('sectionId', nextSectionId, { shouldDirty: true });
    const course = tree.find((c) => c.courseId === courseId);
    const mod = (course?.modules || []).find((m) => m.moduleId === moduleId);
    const section = (mod?.sections || []).find((s) => s.sectionId === nextSectionId);
    applySection(course, mod, section, methods.getValues('code'));
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        code: data.code.trim(),
        title: data.title.trim(),
        pillar: data.pillar.trim(),
        minutes: Number(data.minutes) || 0,
        videoUrl: String(data.videoUrl || selectedSection?.videoUrl || '').trim() || null,
        courseId: String(data.courseId || '').trim() || null,
        moduleId: String(data.moduleId || '').trim() || null,
        sectionId: String(data.sectionId || '').trim() || null,
        bullets: String(data.bulletsText || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        sortOrder: Number(data.sortOrder) || 0,
      };
      if (isEdit) payload.deleted = !!data.deleted;

      if (isEdit) {
        await intlPathwayService.updateModule(currentModule.id, payload);
        toast.success('Module updated');
      } else {
        await intlPathwayService.createModule(payload);
        toast.success('Module created');
      }
      router.push(paths.admin.international.modules.list);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to save module');
    }
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={isEdit ? 'Edit pathway module' : 'Add pathway module'}
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'International' },
          { name: 'Modules', href: paths.admin.international.modules.list },
          { name: isEdit ? 'Edit' : 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Alert severity="info">
                  Pick Course → Module → Section from your existing LMS. Title, minutes, pillar, and
                  video come from that section automatically.
                </Alert>

                <Field.Select
                  name="courseId"
                  label={loadingTree ? 'Loading courses…' : 'Course (pillar)'}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  disabled={loadingTree || !tree.length}
                >
                  <MenuItem value="">
                    <em>{tree.length ? 'Select course' : 'No pillar courses found'}</em>
                  </MenuItem>
                  {tree.map((course) => (
                    <MenuItem key={course.courseId} value={course.courseId}>
                      {`P${course.pillarIndex} · ${course.courseTitle}`}
                    </MenuItem>
                  ))}
                </Field.Select>

                <Field.Select
                  name="moduleId"
                  label="Module"
                  onChange={(e) => handleModuleChange(e.target.value)}
                  disabled={!courseId || !moduleOptions.length}
                >
                  <MenuItem value="">
                    <em>{courseId ? 'Select module' : 'Select a course first'}</em>
                  </MenuItem>
                  {moduleOptions.map((mod) => (
                    <MenuItem key={mod.moduleId} value={mod.moduleId}>
                      {mod.moduleTitle}
                    </MenuItem>
                  ))}
                </Field.Select>

                <Field.Select
                  name="sectionId"
                  label="Section"
                  onChange={(e) => handleSectionChange(e.target.value)}
                  disabled={!moduleId || !sectionOptions.length}
                  helperText="Choosing a section fills title, video, minutes, and suggests a code."
                >
                  <MenuItem value="">
                    <em>{moduleId ? 'Select section' : 'Select a module first'}</em>
                  </MenuItem>
                  {sectionOptions.map((section) => (
                    <MenuItem key={section.sectionId} value={section.sectionId}>
                      {section.title}
                      {section.hasVideo ? '' : ' (no video)'}
                    </MenuItem>
                  ))}
                </Field.Select>

                <Field.Text
                  name="code"
                  label="Pathway code (e.g. 01-00)"
                  helperText="Used by the 10-hour planner and role scores. Auto-suggested from section order."
                />

                <Field.Text
                  name="title"
                  label="Pathway title"
                  helperText="Auto-filled from the selected section (editable)."
                />

                <Field.Select name="pillar" label="Pillar">
                  <MenuItem value="01">Pillar 1</MenuItem>
                  <MenuItem value="02">Pillar 2</MenuItem>
                  <MenuItem value="03">Pillar 3</MenuItem>
                </Field.Select>

                <Field.Text name="minutes" label="Minutes" type="number" />

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: 'background.neutral',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Video link (auto from section)
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-all',
                      color: videoUrl ? 'success.main' : 'text.secondary',
                    }}
                  >
                    {videoUrl || 'Select a section to load its video URL'}
                  </Typography>
                  <Box sx={{ display: 'none' }}>
                    <Field.Text name="videoUrl" />
                  </Box>
                </Box>

                <Field.Text
                  name="bulletsText"
                  label="Topics (one per line)"
                  multiline
                  rows={6}
                />
                <Field.Text name="sortOrder" label="Sort order" type="number" />
                {isEdit && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!deleted}
                        onChange={(e) => setValue('deleted', e.target.checked)}
                      />
                    }
                    label="Deleted (soft delete)"
                  />
                )}
              </Stack>
            </Card>
          </Grid>

          <Grid xs={12} md={4}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 100 } }}>
              <Stack spacing={2}>
                <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting}>
                  {isEdit ? 'Save changes' : 'Create module'}
                </LoadingButton>
                <Button
                  color="inherit"
                  variant="outlined"
                  size="large"
                  onClick={() => router.push(paths.admin.international.modules.list)}
                >
                  Cancel
                </Button>
                {title && (
                  <Typography variant="caption" color="text.secondary">
                    Selected: {title}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Form>
    </DashboardContent>
  );
}
